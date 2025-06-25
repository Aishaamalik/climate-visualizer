import pandas as pd
import os

def load_and_clean_data():
    DATA_PATH = os.path.join(os.path.dirname(__file__), 'global_air_quality_dataset.csv')
    df = pd.read_csv(DATA_PATH)
    df_clean = df.dropna()
    df_clean = df_clean.sort_values(['Country', 'City', 'Date'])
    return df_clean

def summary_statistics():
    df = load_and_clean_data()
    # Summary statistics for each country and city
    return df.groupby(['Country', 'City']).describe().to_dict()

def average_aqi():
    df = load_and_clean_data()
    # Average AQI per country and city
    return df.groupby(['Country', 'City'])['AQI'].mean().to_dict()

def city_aqi_extremes():
    df = load_and_clean_data()
    result = {}
    for country, group in df.groupby('Country'):
        max_city = group.loc[group['AQI'].idxmax()]['City']
        min_city = group.loc[group['AQI'].idxmin()]['City']
        result[country] = {
            'highest_aqi_city': max_city,
            'highest_aqi_value': group['AQI'].max(),
            'lowest_aqi_city': min_city,
            'lowest_aqi_value': group['AQI'].min()
        }
    return result

if __name__ == '__main__':
    print('Summary statistics:')
    print(summary_statistics())
    print('\nAverage AQI:')
    print(average_aqi())
    print('\nCity AQI Extremes:')
    print(city_aqi_extremes()) 