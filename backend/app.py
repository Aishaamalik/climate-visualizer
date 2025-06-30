from flask import Flask, jsonify, request, send_from_directory
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

# Health risks and sources for each pollutant
POLLUTANT_HEALTH_RISKS = {
    'PM2.5 (µg/m³)': ['asthma', 'lung cancer', 'heart disease'],
    'PM10 (µg/m³)': ['asthma', 'respiratory issues'],
    'NO2 (ppb)': ['asthma', 'lung irritation'],
    'SO2 (ppb)': ['asthma', 'bronchitis'],
    'CO (ppm)': ['headache', 'heart disease'],
    'O3 (ppb)': ['asthma', 'lung function decline']
}
POLLUTANT_SOURCES = {
    'PM2.5 (µg/m³)': ['traffic', 'industry', 'residential burning'],
    'PM10 (µg/m³)': ['construction', 'road dust', 'industry'],
    'NO2 (ppb)': ['traffic', 'power plants'],
    'SO2 (ppb)': ['industry', 'power plants'],
    'CO (ppm)': ['traffic', 'residential burning'],
    'O3 (ppb)': ['secondary formation', 'traffic', 'industry']
}

# Utility to load and clean data

def load_and_clean_data():
    df = pd.read_csv(DATA_PATH)
    df_clean = df.dropna()
    df_clean = df_clean.sort_values(['Country', 'City', 'Date'])
    return df_clean

def partial_correlation(x, y, control_vars):
    """
    Calculate partial correlation between x and y, controlling for control_vars.
    Uses the formula: partial_corr = (r_xy - r_xz * r_yz) / sqrt((1 - r_xz^2) * (1 - r_yz^2))
    """
    # Create a combined dataset with all variables
    data = pd.DataFrame({'x': x, 'y': y})
    for i, var in enumerate(control_vars):
        data[f'z{i}'] = var
    
    # Remove rows with any NaN values
    data = data.dropna()
    
    if len(data) < 3:  # Need at least 3 observations
        return None
    
    # Calculate correlation matrix
    corr_matrix = data.corr()
    
    # Get the correlation between x and y
    r_xy = corr_matrix.loc['x', 'y']
    
    # Calculate the correlation between x and control variables (average)
    r_xz = 0
    r_yz = 0
    z_count = 0
    
    for i in range(len(control_vars)):
        if f'z{i}' in corr_matrix.columns:
            r_xz += corr_matrix.loc['x', f'z{i}']
            r_yz += corr_matrix.loc['y', f'z{i}']
            z_count += 1
    
    if z_count == 0:
        return r_xy
    
    r_xz /= z_count
    r_yz /= z_count
    
    # Calculate partial correlation
    denominator = np.sqrt((1 - r_xz**2) * (1 - r_yz**2))
    if denominator == 0:
        return None
    
    partial_corr = (r_xy - r_xz * r_yz) / denominator
    return partial_corr

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

@app.route('/api/forecast', methods=['GET', 'POST'])
def forecast():
    df = load_and_clean_data()
    if request.method == 'POST':
        data = request.get_json()
        city = data.get('city')
        pollutant = data.get('pollutant', 'AQI')
        periods = int(data.get('periods', 30))
        emission_reduction = data.get('emission_reduction', None)
    else:
        city = request.args.get('city')
        pollutant = request.args.get('pollutant', 'AQI')
        periods = int(request.args.get('periods', 30))
        emission_reduction = None
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
    # Apply emission reduction scenario if provided
    pollutant_series = None
    if emission_reduction:
        # For each pollutant in emission_reduction, reduce its value in the city_df
        for pol, reduction in emission_reduction.items():
            if pol in df.columns:
                # Apply reduction to the pollutant column for the forecast period
                # Only for future dates, not historical
                # For simplicity, reduce the last known value by the reduction percent
                last_val = city_df['y'].iloc[-1] if pollutant == pol else df[df['City'] == city][pol].dropna().iloc[-1]
                reduced_val = last_val * (1 - reduction)
                # Create a new series for the forecast period
                pollutant_series = []
                for i in range(periods):
                    pollutant_series.append({
                        'ds': (city_df['ds'].max() + pd.Timedelta(days=i+1)).strftime('%Y-%m-%d'),
                        pol: reduced_val
                    })
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
    # Split historical and forecast for frontend
    historical = result[result['type'] == 'historical'].to_dict(orient='records')
    forecasted = result[result['type'] == 'forecast'].to_dict(orient='records')
    # Anomaly detection: flag forecasted days above a threshold (e.g., 90th percentile of historical)
    anomaly_threshold = None
    anomalies = []
    if len(historical) > 0 and len(forecasted) > 0:
        hist_vals = [h['Forecast'] for h in historical if h['Forecast'] is not None]
        if hist_vals:
            anomaly_threshold = float(np.percentile(hist_vals, 90))
            anomalies = [f for f in forecasted if f['Forecast'] > anomaly_threshold]
    return jsonify({
        'historical': historical,
        'forecast': forecasted,
        'anomalies': anomalies,
        'anomaly_threshold': anomaly_threshold,
        'pollutant_series': pollutant_series
    })

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

    # Demo: Static list of public holidays (ISO date strings)
    # In real use, this should be country/city-specific and from a proper calendar API
    PUBLIC_HOLIDAYS = set([
        '2020-01-01', '2020-12-25', '2021-01-01', '2021-12-25',
        '2022-01-01', '2022-12-25', '2023-01-01', '2023-12-25'
    ])
    # Demo: Static list of known extreme event dates (could be expanded)
    EXTREME_EVENT_DATES = set([
        '2020-09-15', '2021-06-10', '2022-03-20', '2023-07-05'
    ])

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

        # --- Holiday/Event Effect ---
        group['is_holiday'] = group['Date'].dt.strftime('%Y-%m-%d').isin(PUBLIC_HOLIDAYS)
        holiday_days = group[group['is_holiday']]
        non_holiday_days = group[~group['is_holiday']]
        holiday_avg_aqi = holiday_days['AQI'].mean() if not holiday_days.empty else None
        non_holiday_avg_aqi = non_holiday_days['AQI'].mean() if not non_holiday_days.empty else None
        if holiday_avg_aqi is not None and non_holiday_avg_aqi is not None:
            if holiday_avg_aqi < non_holiday_avg_aqi - 2:
                event_effect = 'improved'
            elif holiday_avg_aqi > non_holiday_avg_aqi + 2:
                event_effect = 'worsened'
            else:
                event_effect = 'no_change'
        else:
            event_effect = 'insufficient_data'

        # --- Extreme Event Highlight ---
        aqi_99 = group['AQI'].quantile(0.99)
        extreme_events = []
        for _, row in group[group['AQI'] > aqi_99].iterrows():
            date_str = row['Date'].strftime('%Y-%m-%d')
            note = ''
            if date_str in EXTREME_EVENT_DATES:
                note = 'Known extreme event (e.g., forest fire, sandstorm)'
            else:
                note = 'Unusual AQI spike'
            extreme_events.append({
                'date': date_str,
                'aqi': row['AQI'],
                'note': note
            })

        # --- Year-over-Year Comparison ---
        yoy = {}
        for m in range(1, 13):
            month_data = group[group['Month'] == m]
            if not month_data.empty:
                for y in sorted(month_data['Year'].unique()):
                    m_int = int(m)
                    y_int = int(y)
                    if m_int not in yoy:
                        yoy[m_int] = {}
                    yoy[m_int][y_int] = float(month_data[month_data['Year'] == y]['AQI'].mean())

        # --- Month-over-Month Comparison ---
        mom = {}
        for y in sorted(group['Year'].unique()):
            year_data = group[group['Year'] == y]
            for m in range(1, 13):
                month_data = year_data[year_data['Month'] == m]
                if not month_data.empty:
                    y_int = int(y)
                    if y_int not in mom:
                        mom[y_int] = {}
                    mom[y_int][m] = float(month_data['AQI'].mean())

        results[city] = {
            'monthly_avg_aqi': monthly.to_dict(orient='records'),
            'weekday_avg_aqi': weekday_avg,
            'weekend_avg_aqi': weekend_avg,
            'daily_avg_aqi': daily.to_dict(orient='records'),
            'weekly_avg_aqi': weekly.to_dict(orient='records'),
            'pollutant_daily': pollutant_daily.to_dict(orient='records'),
            'pollutant_weekly': pollutant_weekly.to_dict(orient='records'),
            # New features:
            'holiday_event_effect': {
                'holiday_avg_aqi': holiday_avg_aqi,
                'non_holiday_avg_aqi': non_holiday_avg_aqi,
                'holiday_days': holiday_days['Date'].dt.strftime('%Y-%m-%d').tolist(),
                'event_effect': event_effect
            },
            'extreme_events': extreme_events,
            'year_over_year': yoy,
            'month_over_month': mom
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
    df_numeric = df[numeric_cols].copy()
    results = {}
    # 1. Pairwise correlations + scatterplot data + regression
    def scatter_and_reg(x, y):
        mask = (~pd.isnull(x)) & (~pd.isnull(y))
        x, y = x[mask], y[mask]
        if len(x) < 2:
            return {'x': [], 'y': [], 'slope': None, 'intercept': None, 'r2': None}
        slope, intercept, r, _, _ = linregress(x, y)
        return {
            'x': x.tolist(),
            'y': y.tolist(),
            'slope': slope,
            'intercept': intercept,
            'r2': r**2
        }
    # AQI vs Temperature
    results['AQI_Temperature'] = {
        'pearson': pearsonr(df['AQI'], df['Temperature (°C)'])[0],
        'spearman': spearmanr(df['AQI'], df['Temperature (°C)'])[0],
        'scatter': scatter_and_reg(df['Temperature (°C)'], df['AQI'])
    }
    # PM2.5 vs Humidity
    results['PM2.5_Humidity'] = {
        'pearson': pearsonr(df['PM2.5 (µg/m³)'], df['Humidity (%)'])[0],
        'spearman': spearmanr(df['PM2.5 (µg/m³)'], df['Humidity (%)'])[0],
        'scatter': scatter_and_reg(df['Humidity (%)'], df['PM2.5 (µg/m³)'])
    }
    # Wind Speed vs each pollutant
    wind_corrs = {}
    for pol in ['PM2.5 (µg/m³)', 'PM10 (µg/m³)', 'NO2 (ppb)', 'SO2 (ppb)', 'CO (ppm)', 'O3 (ppb)']:
        wind_corrs[pol] = {
            'pearson': pearsonr(df[pol], df['Wind Speed (m/s)'])[0],
            'spearman': spearmanr(df[pol], df['Wind Speed (m/s)'])[0],
            'scatter': scatter_and_reg(df['Wind Speed (m/s)'], df[pol])
        }
    results['WindSpeed_Pollutants'] = wind_corrs
    # 2. Heatmap of all numeric correlations
    corr_matrix = df_numeric.corr(method='pearson')
    results['correlation_heatmap'] = corr_matrix.round(3).to_dict()
    # 3. Time-lag correlations (AQI vs weather, lags 1-5)
    lags = [1, 2, 3, 4, 5]
    lag_vars = ['Temperature (°C)', 'Humidity (%)', 'Wind Speed (m/s)']
    lag_corrs = {}
    df_sorted = df.sort_values('Date')
    for var in lag_vars:
        lag_corrs[var] = {}
        for lag in lags:
            shifted = df_sorted[var].shift(lag)
            mask = (~pd.isnull(df_sorted['AQI'])) & (~pd.isnull(shifted))
            if mask.sum() < 2:
                lag_corrs[var][lag] = None
            else:
                lag_corrs[var][lag] = pearsonr(df_sorted['AQI'][mask], shifted[mask])[0]
    results['time_lag_correlations'] = lag_corrs
    # 4. Partial correlations (AQI vs each weather, controlling for others)
    # Use partial_correlation function
    partial_corrs = {}
    weather_vars = ['Temperature (°C)', 'Humidity (%)', 'Wind Speed (m/s)']
    for var in weather_vars:
        others = [v for v in weather_vars if v != var]
        partial_corrs[var] = partial_correlation(
            df_numeric['AQI'],
            df_numeric[var],
            [df_numeric[other] for other in others]
        )
    results['partial_correlations'] = partial_corrs
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

@app.route('/api/pollutant-composition-timelapse')
def pollutant_composition_timelapse():
    df = load_and_clean_data()
    df['Date'] = pd.to_datetime(df['Date'])
    df['Year'] = df['Date'].dt.year
    df['Month'] = df['Date'].dt.month
    results = {}
    for city, group in df.groupby('City'):
        city_result = {}
        total_aqi = group['AQI'].sum()
        # Monthly composition
        monthly = group.groupby(['Year', 'Month'])
        month_data = {}
        for (year, month), mgroup in monthly:
            month_key = f"{year}-{month:02d}"
            pols = {}
            for pol in POLLUTANTS:
                avg = mgroup[pol].mean()
                maxv = mgroup[pol].max()
                pol_sum = mgroup[pol].sum()
                pct_contrib = (pol_sum / mgroup['AQI'].sum() * 100) if mgroup['AQI'].sum() else 0
                health_risks = POLLUTANT_HEALTH_RISKS.get(pol, [])
                sources = POLLUTANT_SOURCES.get(pol, [])
                # Dominant source: just pick the first source as a simple heuristic
                dominant_source = sources[0] if sources else None
                pols[pol] = {
                    'average': avg,
                    'max': maxv,
                    'percentage_contribution': pct_contrib,
                    'health_risks': health_risks,
                    'sources': sources,
                    'dominant_source': dominant_source
                }
            month_data[month_key] = pols
        city_result['monthly'] = month_data
        results[city] = city_result
    return jsonify(results)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists("../frontend/build/" + path):
        return send_from_directory('../frontend/build', path)
    return send_from_directory('../frontend/build', 'index.html')

if __name__ == '__main__':
    app.run(debug=True) 