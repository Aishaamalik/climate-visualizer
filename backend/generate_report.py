from fpdf import FPDF

report_text = '''\
Climate Visualizer Project Report
===============================

Project Overview
----------------
Climate Visualizer is a full-stack web application for exploring, analyzing, and visualizing global air quality data.
It consists of:
- A backend (Python, Flask) that serves air quality data and advanced analysis via a REST API.
- A frontend (React) that provides interactive dashboards, charts, and maps for users to explore air quality trends, pollutant composition, temporal patterns, correlations, comparative analysis, and forecasting.

Backend (Flask API)
------------------
Location: backend/

Key Features:
- Data Source: Uses a CSV file (global_air_quality_dataset.csv) containing air quality and weather data for various cities and countries.
- Data Cleaning: Loads and cleans the data (removes missing values, sorts by country/city/date).
- API Endpoints:
  - /api/countries - List all countries in the dataset.
  - /api/cities - List cities, optionally filtered by country.
  - /api/pollutants - List all pollutants tracked (e.g., PM2.5, PM10, NO2, SO2, CO, O3).
  - /api/data - Get air quality data, filterable by country, city, pollutant, and date range.
  - /api/city-aqi-trends - Get monthly/yearly AQI trends, pollution spikes, and trend direction for each city.
  - /api/pollutant-composition - For each city, get average, max, and percentage contribution of each pollutant to AQI.
  - /api/pollutant-composition-timelapse - Monthly pollutant composition for each city, including health risks and sources.
  - /api/temporal-patterns - Analyze AQI by month, weekday/weekend, daily/weekly trends, pollutant levels, holiday/event effects, extreme events, and year-over-year/month-over-month changes.
  - /api/correlation-analysis - Statistical correlations between AQI, pollutants, and weather variables (temperature, humidity, wind speed), including time-lag and partial correlations.
  - /api/comparative-analysis - Compare AQI, trends, and pollutant composition across multiple cities or countries, with clustering and benchmarking.
  - /api/forecast - Forecast AQI or pollutant levels for a city, with scenario analysis (simulate emission reductions), anomaly detection, and confidence intervals.
- Analysis Functions:
  - Summary statistics for each country/city.
  - AQI trends and pollution spikes detection.
  - Correlation analysis (Pearson/Spearman) between pollutants and weather.
  - Comparative analysis with clustering and benchmarking.
  - Forecasting with scenario simulation and anomaly detection.
  - Pollutant composition timelapse with health risk and source info.

Frontend (React App)
--------------------
Location: frontend/

Key Features:
- Modern UI: Built with React, styled with Tailwind CSS, and uses charting libraries (Chart.js, react-chartjs-2) and mapping (react-leaflet).
- Navigation: Sidebar with links to Dashboard, City Trends, Pollutant Composition, Temporal Patterns, Correlation Analysis, Comparative Analysis, and Forecasting.
- Global Search: Modal for searching cities, countries, pollutants, and navigating to different analysis screens.

Main Screens/Components:
- Dashboard: Summary cards (average AQI, number of cities, latest date, dominant pollutant), filters, trend charts, and map.
- City Trends: Select a city to view monthly/yearly AQI trends, pollution spikes, and trend direction.
- Pollutant Composition: Select a city to view average, max, and percentage contribution of each pollutant.
- Pollutant Composition Timelapse: Visualize monthly changes in pollutant composition, health risks, and sources.
- Temporal Patterns: Analyze AQI by month, weekday/weekend, daily/weekly trends, holiday/event effects, extreme events, and year-over-year/month-over-month changes.
- Correlation Analysis: View statistical correlations between AQI, pollutants, and weather variables, including time-lag and partial correlations.
- Comparative Analysis: Compare multiple cities/countries, view clusters, benchmarks, and detailed tables/charts.
- Forecasting & Scenario Analysis: Forecast AQI/pollutant levels, detect anomalies, and simulate emission reduction scenarios. Includes summary cards, interactive charts, and a collapsible forecast table.
- Map Section: Interactive map with city markers colored by AQI and cluster.

Data Flow:
- The frontend fetches data from the backend API based on user selections (filters, city, pollutant, etc.).
- Data is visualized using charts and maps, with real-time updates as filters change.
- Scenario analysis, clustering, benchmarking, and anomaly detection are supported in relevant screens.

Technologies Used
-----------------
- Backend: Python, Flask, Pandas, NumPy, SciPy, Flask-CORS
- Frontend: React, Tailwind CSS, Chart.js, react-chartjs-2, react-leaflet, react-router-dom, lucide-react (icons)
- Data: CSV file with air quality and weather data

How It Works (User Flow)
------------------------
1. User opens the app (frontend).
2. Dashboard loads with summary statistics and a map.
3. User applies filters (country, city, pollutant, date range) to explore specific data.
4. User navigates to different analysis screens:
   - City Trends: See AQI trends and spikes for a city.
   - Pollutant Composition: See which pollutants dominate in a city.
   - Pollutant Composition Timelapse: See monthly changes in pollutant composition, health risks, and sources.
   - Temporal Patterns: See how AQI changes over time, by day type, and during holidays/events or extreme events.
   - Correlation Analysis: See how pollutants and weather variables are related, including time-lag and partial correlations.
   - Comparative Analysis: Compare multiple cities/countries, view clusters, benchmarks, and detailed tables/charts.
   - Forecasting & Scenario Analysis: Forecast AQI/pollutant levels, detect anomalies, and simulate emission reduction scenarios.
5. All data and charts are fetched from the backend API, which processes and analyzes the CSV data on demand.

Summary Table
-------------
Layer     | Technology         | Main Purpose/Features
--------- | ------------------ | -------------------------------------------------------------
Backend   | Flask, Pandas      | Serve air quality data, perform advanced analysis, expose REST API (comparative, forecasting, timelapse, clustering, scenario analysis)
Frontend  | React, Tailwind    | Interactive dashboards, charts, maps, filters, navigation, scenario analysis, clustering, benchmarking, anomaly detection
Data      | CSV                | Global air quality and weather data (city, country, date, AQI, pollutants, weather)

Conclusion
----------
Climate Visualizer is a data-driven web app for exploring and analyzing global air quality.
It provides interactive visualizations and advanced statistical insights, including comparative analysis, forecasting, scenario simulation, and pollutant health/source info, making it useful for researchers, policymakers, and the public interested in air pollution trends and their relationships with weather.
'''

class PDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 14)
        self.cell(0, 10, 'Climate Visualizer Project Report', ln=True, align='C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

pdf = PDF()
pdf.add_page()
pdf.set_auto_page_break(auto=True, margin=15)
pdf.set_font('Arial', '', 11)

for line in report_text.split('\n'):
    # Remove non-ASCII characters
    safe_line = line.encode('ascii', 'ignore').decode('ascii')
    if safe_line.strip() == '':
        pdf.ln(3)
    elif safe_line.strip().endswith('---') or safe_line.strip().endswith('==='):
        pdf.ln(2)
    else:
        pdf.multi_cell(0, 8, safe_line)

pdf.output('Climate_Visualizer_Project_Report.pdf')
print('PDF report generated: Climate_Visualizer_Project_Report.pdf') 