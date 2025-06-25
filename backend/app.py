from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
from datetime import datetime
from scipy.stats import linregress

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

# Optional: forecasting endpoint placeholder
@app.route('/api/forecast')
def forecast():
    return jsonify({'message': 'Forecasting endpoint coming soon.'})

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
            trend = 'insufficient data'
        results[city] = {
            'monthly_avg_aqi': monthly.to_dict(orient='records'),
            'yearly_avg_aqi': yearly.to_dict(orient='records'),
            'spikes': spikes,
            'trend': trend
        }
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True) 