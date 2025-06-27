from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
from datetime import datetime
from scipy.stats import linregress, pearsonr, spearmanr
from prophet import Prophet

app = Flask(__name__)
CORS(app)

DATA_PATH = os.path.join(os.path.dirname(__file__), 'global_air_quality_dataset.csv')

POLLUTANTS = ['PM2.5 (µg/m³)', 'PM10 (µg/m³)', 'NO2 (ppb)', 'SO2 (ppb)', 'CO (ppm)', 'O3 (ppb)']

# Utility to load and clean data

def load_and_clean_data():
    df = pd.read_csv(DATA_PATH)
    df_clean = df.dropna()
    df_clean = df_clean.sort_values(['Country', 'City', 'Date'])
    return df_clean

@app.route('/')
def home():
    return "Climate Visualizer API is running. See /api/countries, /api/cities, /api/pollutants, /api/data."

@app.route('/api/countries')
def get_countries():
    df = load_and_clean_data()
    countries = sorted(df['Country'].unique().tolist())
    return jsonify(countries)

@app.route('/api/cities')
def get_cities():
    df = load_and_clean_data()
    country = request.args.get('country')
    if country:
        cities = sorted(df[df['Country'] == country]['City'].unique().tolist())
    else:
        cities = sorted(df['City'].unique().tolist())
    return jsonify(cities)

@app.route('/api/pollutants')
def get_pollutants():
    return jsonify(POLLUTANTS)

@app.route('/api/data')
def get_data():
    df = load_and_clean_data()
    country = request.args.get('country')
    city = request.args.get('city')
    pollutant = request.args.get('pollutant')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    if country:
        df = df[df['Country'] == country]
    if city:
        df = df[df['City'] == city]
    if start_date:
        df = df[df['Date'] >= start_date]
    if end_date:
        df = df[df['Date'] <= end_date]
    # Always include AQI, optionally filter for a pollutant
    result = []
    for _, row in df.iterrows():
        entry = {
            'Date': row['Date'],
            'City': row['City'],
            'Country': row['Country'],
            'AQI': row['AQI']
        }
        if pollutant and pollutant in row:
            entry[pollutant] = row[pollutant]
        else:
            for pol in POLLUTANTS:
                entry[pol] = row[pol]
        result.append(entry)
    return jsonify(result)

@app.route('/api/forecast')
def forecast():
    df = load_and_clean_data()
    city = request.args.get('city')
    pollutant = request.args.get('pollutant', 'AQI')
    periods = int(request.args.get('periods', 30))  # days to forecast
    if not city:
        return jsonify({'error': 'City parameter is required.'}), 400
    if pollutant not in df.columns:
        return jsonify({'error': f'Pollutant {pollutant} not found.'}), 400
    city_df = df[df['City'] == city][['Date', pollutant]].copy()
    city_df['Date'] = pd.to_datetime(city_df['Date'])
    city_df = city_df.sort_values('Date')
    city_df = city_df.rename(columns={'Date': 'ds', pollutant: 'y'})
    # Remove missing or non-numeric values
    city_df = city_df.dropna()
    city_df = city_df[city_df['y'].apply(lambda x: isinstance(x, (int, float, np.integer, np.floating)))]
    if len(city_df) < 20:
        return jsonify({'error': 'Not enough data for forecasting.'}), 400
    model = Prophet()
    model.fit(city_df)
    future = model.make_future_dataframe(periods=periods)
    forecast = model.predict(future)
    # Mark which rows are historical and which are forecast
    last_date = city_df['ds'].max()
    forecast['type'] = forecast['ds'].apply(lambda d: 'historical' if d <= last_date else 'forecast')
    # Prepare output: all rows, with type flag
    result = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper', 'type']].rename(columns={'ds': 'Date', 'yhat': 'Forecast', 'yhat_lower': 'Lower', 'yhat_upper': 'Upper'})
    # Convert dates to ISO string for frontend
    result['Date'] = result['Date'].dt.strftime('%Y-%m-%d')
    return jsonify(result.to_dict(orient='records'))

def estimate_health_impact(aqi):
    # WHO/US EPA AQI breakpoints (simplified)
    if aqi is None:
        return {'aqi': None, 'category': 'Unknown', 'description': 'No data available.'}
    if aqi <= 50:
        return {'aqi': aqi, 'category': 'Good', 'description': 'Air quality is considered satisfactory, and air pollution poses little or no risk.'}
    elif aqi <= 100:
        return {'aqi': aqi, 'category': 'Moderate', 'description': 'Air quality is acceptable; some pollutants may be a moderate health concern for a very small number of people.'}
    elif aqi <= 150:
        return {'aqi': aqi, 'category': 'Unhealthy for Sensitive Groups', 'description': 'Members of sensitive groups may experience health effects. The general public is not likely to be affected.'}
    elif aqi <= 200:
        return {'aqi': aqi, 'category': 'Unhealthy', 'description': 'Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.'}
    elif aqi <= 300:
        return {'aqi': aqi, 'category': 'Very Unhealthy', 'description': 'Health alert: everyone may experience more serious health effects.'}
    else:
        return {'aqi': aqi, 'category': 'Hazardous', 'description': 'Health warnings of emergency conditions. The entire population is more likely to be affected.'}

@app.route('/api/city-aqi-trends')
def city_aqi_trends():
    df = load_and_clean_data()
    df['Date'] = pd.to_datetime(df['Date'])
    df['Year'] = df['Date'].dt.year
    df['Month'] = df['Date'].dt.month
    results = {}
    for city, group in df.groupby('City'):
        # Monthly and yearly average AQI
        monthly = group.groupby(['Year', 'Month'])['AQI'].mean().reset_index()
        yearly = group.groupby('Year')['AQI'].mean().reset_index()
        # Pollution spikes: months with AQI > 90th percentile
        spike_threshold = group['AQI'].quantile(0.9)
        spikes = monthly[monthly['AQI'] > spike_threshold][['Year', 'Month', 'AQI']].to_dict(orient='records')
        # Trend: linear regression on yearly average AQI
        if len(yearly) > 1:
            slope, _, _, _, _ = linregress(yearly['Year'], yearly['AQI'])
            if slope < -0.5:
                trend = 'improving'
            elif slope > 0.5:
                trend = 'deteriorating'
            else:
                trend = 'stable'
        else:
            trend = 'stable'
        # Health impact for latest AQI
        if not monthly.empty:
            latest = monthly.iloc[-1]
            latest_aqi = latest['AQI']
        else:
            latest_aqi = None
        health_impact = estimate_health_impact(latest_aqi)
        # Seasonal highlights: average AQI for each month across years
        month_means = monthly.groupby('Month')['AQI'].mean()
        if len(month_means) >= 2:
            top_months = month_means.sort_values(ascending=False).head(2)
            bottom_months = month_means.sort_values().head(2)
            seasonal_highlights = []
            for m, v in top_months.items():
                seasonal_highlights.append({'month': int(m), 'avg_aqi': float(v), 'type': 'spike'})
            for m, v in bottom_months.items():
                seasonal_highlights.append({'month': int(m), 'avg_aqi': float(v), 'type': 'drop'})
        else:
            seasonal_highlights = []
        results[city] = {
            'monthly_avg_aqi': monthly.to_dict(orient='records'),
            'yearly_avg_aqi': yearly.to_dict(orient='records'),
            'spikes': spikes,
            'trend': trend,
            'health_impact': health_impact,
            'seasonal_highlights': seasonal_highlights
        }
    return jsonify(results)

@app.route('/api/pollutant-composition')
def pollutant_composition():
    df = load_and_clean_data()
    results = {}
    for city, group in df.groupby('City'):
        city_result = {}
        total_aqi = group['AQI'].sum()
        for pol in POLLUTANTS:
            avg = group[pol].mean()
            maxv = group[pol].max()
            # Contribution: sum of pollutant divided by sum of all pollutants (or AQI)
            pol_sum = group[pol].sum()
            pct_contrib = (pol_sum / total_aqi * 100) if total_aqi else 0
            city_result[pol] = {
                'average': avg,
                'max': maxv,
                'percentage_contribution': pct_contrib
            }
        results[city] = city_result
    return jsonify(results)

@app.route('/api/temporal-patterns')
def temporal_patterns():
    df = load_and_clean_data()
    df['Date'] = pd.to_datetime(df['Date'])
    df['Year'] = df['Date'].dt.year
    df['Month'] = df['Date'].dt.month
    df['DayOfWeek'] = df['Date'].dt.dayofweek  # 0=Monday, 6=Sunday
    df['IsWeekend'] = df['DayOfWeek'] >= 5
    results = {}
    for city, group in df.groupby('City'):
        # Monthly average AQI
        monthly = group.groupby(['Year', 'Month'])['AQI'].mean().reset_index()
        # Weekday vs weekend
        weekday_avg = group[~group['IsWeekend']]['AQI'].mean()
        weekend_avg = group[group['IsWeekend']]['AQI'].mean()
        # Daily trend (average AQI per day)
        daily = group.groupby('Date')['AQI'].mean().reset_index()
        # Weekly trend (average AQI per week)
        group['Week'] = group['Date'].dt.isocalendar().week
        weekly = group.groupby(['Year', 'Week'])['AQI'].mean().reset_index()
        # Daily/weekly pollutant levels
        pollutant_daily = group.groupby('Date')[POLLUTANTS].mean().reset_index()
        pollutant_weekly = group.groupby(['Year', 'Week'])[POLLUTANTS].mean().reset_index()
        results[city] = {
            'monthly_avg_aqi': monthly.to_dict(orient='records'),
            'weekday_avg_aqi': weekday_avg,
            'weekend_avg_aqi': weekend_avg,
            'daily_avg_aqi': daily.to_dict(orient='records'),
            'weekly_avg_aqi': weekly.to_dict(orient='records'),
            'pollutant_daily': pollutant_daily.to_dict(orient='records'),
            'pollutant_weekly': pollutant_weekly.to_dict(orient='records')
        }
    return jsonify(results)

@app.route('/api/correlation-analysis')
def correlation_analysis():
    df = load_and_clean_data()
    # Select relevant columns
    numeric_cols = [
        'AQI', 'PM2.5 (µg/m³)', 'PM10 (µg/m³)', 'NO2 (ppb)', 'SO2 (ppb)', 'CO (ppm)', 'O3 (ppb)',
        'Temperature (°C)', 'Humidity (%)', 'Wind Speed (m/s)'
    ]
    df_numeric = df[numeric_cols]
    # 1. Pairwise correlations
    results = {}
    # AQI vs Temperature
    results['AQI_Temperature'] = {
        'pearson': pearsonr(df['AQI'], df['Temperature (°C)'])[0],
        'spearman': spearmanr(df['AQI'], df['Temperature (°C)'])[0]
    }
    # PM2.5 vs Humidity
    results['PM2.5_Humidity'] = {
        'pearson': pearsonr(df['PM2.5 (µg/m³)'], df['Humidity (%)'])[0],
        'spearman': spearmanr(df['PM2.5 (µg/m³)'], df['Humidity (%)'])[0]
    }
    # Wind Speed vs each pollutant
    wind_corrs = {}
    for pol in ['PM2.5 (µg/m³)', 'PM10 (µg/m³)', 'NO2 (ppb)', 'SO2 (ppb)', 'CO (ppm)', 'O3 (ppb)']:
        wind_corrs[pol] = {
            'pearson': pearsonr(df[pol], df['Wind Speed (m/s)'])[0],
            'spearman': spearmanr(df[pol], df['Wind Speed (m/s)'])[0]
        }
    results['WindSpeed_Pollutants'] = wind_corrs
    # 2. Heatmap of all numeric correlations
    corr_matrix = df_numeric.corr(method='pearson')
    results['correlation_heatmap'] = corr_matrix.round(3).to_dict()
    return jsonify(results)

@app.route('/api/comparative-analysis', methods=['POST'])
def comparative_analysis():
    df = load_and_clean_data()
    data = request.get_json()
    mode = data.get('mode', 'city')  # 'city' or 'country'
    selections = data.get('selections', [])
    if not selections or mode not in ['city', 'country']:
        return jsonify({'error': 'Invalid request'}), 400
    results = {}
    for sel in selections:
        if mode == 'city':
            group = df[df['City'] == sel]
        else:
            group = df[df['Country'] == sel]
        if group.empty:
            continue
        avg_aqi = float(group['AQI'].mean()) if not group['AQI'].mean() != group['AQI'].mean() else None
        max_aqi = float(group['AQI'].max()) if not group['AQI'].max() != group['AQI'].max() else None
        min_aqi = float(group['AQI'].min()) if not group['AQI'].min() != group['AQI'].min() else None
        std_aqi = float(group['AQI'].std()) if not group['AQI'].std() != group['AQI'].std() else None
        # Dominant pollutant: highest average among pollutants
        pol_means = {pol: float(group[pol].mean()) if not group[pol].mean() != group[pol].mean() else None for pol in POLLUTANTS}
        dominant_pol = max(pol_means, key=lambda k: pol_means[k] if pol_means[k] is not None else float('-inf'))
        # Most variable pollutant
        pol_stds = {pol: float(group[pol].std()) if not group[pol].std() != group[pol].std() else None for pol in POLLUTANTS}
        most_variable_pol = max(pol_stds, key=lambda k: pol_stds[k] if pol_stds[k] is not None else float('-inf'))
        # Pollutant composition for radar chart
        pol_composition = pol_means
        # Monthly and yearly trend
        group = group.copy()
        group['Date'] = pd.to_datetime(group['Date'])
        group['Year'] = group['Date'].dt.year.astype(int)
        group['Month'] = group['Date'].dt.month.astype(int)
        monthly = group.groupby(['Year', 'Month'])['AQI'].mean().reset_index()
        monthly['Year'] = monthly['Year'].astype(int)
        monthly['Month'] = monthly['Month'].astype(int)
        monthly['AQI'] = monthly['AQI'].astype(float)
        yearly = group.groupby(['Year'])['AQI'].mean().reset_index()
        yearly['Year'] = yearly['Year'].astype(int)
        yearly['AQI'] = yearly['AQI'].astype(float)
        # Recent AQI (last available month)
        if not monthly.empty:
            last_month = monthly.iloc[-1]
            recent_aqi = float(last_month['AQI'])
            recent_period = f"{int(last_month['Year'])}-{int(last_month['Month']):02d}"
        else:
            recent_aqi = None
            recent_period = None
        results[sel] = {
            'average_aqi': avg_aqi,
            'max_aqi': max_aqi,
            'min_aqi': min_aqi,
            'std_aqi': std_aqi,
            'dominant_pollutant': dominant_pol,
            'most_variable_pollutant': most_variable_pol,
            'pollutant_composition': pol_composition,
            'monthly_trend': monthly.to_dict(orient='records'),
            'yearly_trend': yearly.to_dict(orient='records'),
            'recent_aqi': recent_aqi,
            'recent_period': recent_period
        }
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True) 