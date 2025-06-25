import React, { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { FaInfoCircle, FaRedo, FaDownload } from 'react-icons/fa';
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
  PointElement
} from 'chart.js';

ChartJS.register(
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
  PointElement
);

const POLLUTANTS = [
  'PM2.5 (µg/m³)',
  'PM10 (µg/m³)',
  'NO2 (ppb)',
  'SO2 (ppb)',
  'CO (ppm)',
  'O3 (ppb)'
];

export default function TemporalPatternsScreen() {
  const [data, setData] = useState({});
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedPollutant, setSelectedPollutant] = useState(POLLUTANTS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pollutantView, setPollutantView] = useState('daily');
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('http://127.0.0.1:5000/api/temporal-patterns')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setCities(Object.keys(d));
        setSelectedCity(Object.keys(d)[0] || '');
        setLoading(false);
        setTimeout(() => setFadeIn(true), 100); // trigger fade-in
      })
      .catch(() => {
        setError('Failed to fetch temporal patterns data.');
        setLoading(false);
      });
  }, []);

  // Skeleton loader
  const Skeleton = ({ height = 24, width = '100%', className = '' }) => (
    <div className={`animate-pulse bg-gray-300 dark:bg-gray-700 rounded ${className}`} style={{ height, width }} />
  );

  // Chart download helper
  const downloadChart = (chartId, filename) => {
    const chart = document.getElementById(chartId);
    if (!chart) return;
    const url = chart.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  if (loading) return (
    <div className="p-8 text-center text-gray-400">
      <div className="max-w-4xl mx-auto p-4">
        <Skeleton height={32} className="mb-6 mx-auto w-1/2" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <Skeleton height={24} className="mb-2 w-1/3" />
            <Skeleton height={180} className="w-full" />
          </div>
        ))}
      </div>
    </div>
  );
  if (error) return (
    <div className="p-8 text-center text-red-500">
      {error}
      <button
        className="ml-4 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-2"
        onClick={() => window.location.reload()}
      >
        <FaRedo /> Retry
      </button>
    </div>
  );
  if (!selectedCity) return <div className="p-8 text-center text-gray-400">No city data available.</div>;

  const cityData = data[selectedCity];
  // Monthly AQI
  const monthlyLabels = cityData.monthly_avg_aqi.map(m => `${m.Year}-${String(m.Month).padStart(2, '0')}`);
  const monthlyAQI = cityData.monthly_avg_aqi.map(m => m.AQI);
  // Weekday vs Weekend
  const weekdayWeekendData = {
    labels: ['Weekday', 'Weekend'],
    datasets: [{
      label: 'Avg AQI',
      data: [cityData.weekday_avg_aqi, cityData.weekend_avg_aqi],
      backgroundColor: ['#1976d2', '#e57373']
    }]
  };
  // Daily AQI
  const dailyLabels = cityData.daily_avg_aqi.map(d => d.Date);
  const dailyAQI = cityData.daily_avg_aqi.map(d => d.AQI);
  // Weekly AQI
  const weeklyLabels = cityData.weekly_avg_aqi.map(w => `${w.Year}-W${w.Week}`);
  const weeklyAQI = cityData.weekly_avg_aqi.map(w => w.AQI);
  // Pollutant trend
  const pollutantData = pollutantView === 'daily' ? cityData.pollutant_daily : cityData.pollutant_weekly;
  const pollutantLabels = pollutantView === 'daily'
    ? pollutantData.map(d => d.Date)
    : pollutantData.map(w => `${w.Year}-W${w.Week}`);
  const pollutantValues = pollutantData.map(d => d[selectedPollutant]);

  // Debug logs
  console.log('pollutantView:', pollutantView);
  console.log('cityData.pollutant_daily:', cityData.pollutant_daily);
  console.log('cityData.pollutant_weekly:', cityData.pollutant_weekly);
  console.log('pollutantData:', pollutantData);
  console.log('pollutantLabels:', pollutantLabels);
  console.log('pollutantValues:', pollutantValues);

  return (
    <div className={`max-w-4xl mx-auto p-4 transition-opacity duration-700 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}> 
      <h2 className="text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2">
        Temporal Patterns Analysis
        <span className="text-gray-400" title="Explore how air quality changes over time, by city and pollutant."><FaInfoCircle /></span>
      </h2>
      <div className="mb-6 flex flex-col md:flex-row gap-4 justify-center items-center">
        <div className="flex flex-col items-start">
          <label className="mb-1 font-medium flex items-center gap-1">City <FaInfoCircle title="Select a city to view its air quality trends." /></label>
          <select
            className={`p-2 rounded border dark:bg-gray-900 dark:border-gray-700 min-w-[200px] ${selectedCity ? 'ring-2 ring-blue-400' : ''}`}
            value={selectedCity}
            onChange={e => setSelectedCity(e.target.value)}
          >
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-col items-start">
          <label className="mb-1 font-medium flex items-center gap-1">Pollutant <FaInfoCircle title="Choose a pollutant to analyze its trend." /></label>
          <select
            className={`p-2 rounded border dark:bg-gray-900 dark:border-gray-700 min-w-[200px] ${selectedPollutant ? 'ring-2 ring-purple-400' : ''}`}
            value={selectedPollutant}
            onChange={e => setSelectedPollutant(e.target.value)}
          >
            {POLLUTANTS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="flex flex-col items-start">
          <label className="mb-1 font-medium flex items-center gap-1">View <FaInfoCircle title="Switch between daily and weekly pollutant trends." /></label>
          <div className="flex gap-2">
            <button
              className={`px-3 py-1 rounded ${pollutantView === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'} transition-colors`}
              onClick={() => setPollutantView('daily')}
            >Daily</button>
            <button
              className={`px-3 py-1 rounded ${pollutantView === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'} transition-colors`}
              onClick={() => setPollutantView('weekly')}
            >Weekly</button>
          </div>
        </div>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 fade-in">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Monthly Average AQI</h3>
            <span className="text-gray-400 text-sm flex items-center gap-1"><FaInfoCircle title="Shows the average AQI for each month." />Monthly trend</span>
            <button className="ml-2 text-blue-600 hover:text-blue-800" title="Download chart as image" onClick={() => downloadChart('monthly-aqi-chart', 'monthly_aqi.png')}><FaDownload /></button>
          </div>
          <Line id="monthly-aqi-chart" data={{
            labels: monthlyLabels,
            datasets: [{ label: 'Monthly Avg AQI', data: monthlyAQI, borderColor: '#1976d2', backgroundColor: 'rgba(25, 118, 210, 0.2)' }]
          }} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          <p className="mt-2 text-gray-500 text-sm">Track how air quality changes month by month.</p>
        </section>
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 fade-in">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Weekday vs Weekend AQI</h3>
            <span className="text-gray-400 text-sm flex items-center gap-1"><FaInfoCircle title="Compares average AQI on weekdays vs weekends." />Comparison</span>
            <button className="ml-2 text-blue-600 hover:text-blue-800" title="Download chart as image" onClick={() => downloadChart('weekday-weekend-chart', 'weekday_weekend_aqi.png')}><FaDownload /></button>
          </div>
          <Bar id="weekday-weekend-chart" data={weekdayWeekendData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
          <p className="mt-2 text-gray-500 text-sm">See if weekends have better or worse air quality than weekdays.</p>
        </section>
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 fade-in">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Daily AQI Trend</h3>
            <span className="text-gray-400 text-sm flex items-center gap-1"><FaInfoCircle title="Shows the AQI for each day." />Fine-grained</span>
            <button className="ml-2 text-blue-600 hover:text-blue-800" title="Download chart as image" onClick={() => downloadChart('daily-aqi-chart', 'daily_aqi.png')}><FaDownload /></button>
          </div>
          <Line id="daily-aqi-chart" data={{
            labels: dailyLabels,
            datasets: [{ label: 'Daily AQI', data: dailyAQI, borderColor: '#43a047', backgroundColor: 'rgba(67, 160, 71, 0.2)' }]
          }} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          <p className="mt-2 text-gray-500 text-sm">Observe daily fluctuations in air quality.</p>
        </section>
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 fade-in">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Weekly AQI Trend</h3>
            <span className="text-gray-400 text-sm flex items-center gap-1"><FaInfoCircle title="Shows the AQI for each week." />Smoothed</span>
            <button className="ml-2 text-blue-600 hover:text-blue-800" title="Download chart as image" onClick={() => downloadChart('weekly-aqi-chart', 'weekly_aqi.png')}><FaDownload /></button>
          </div>
          <Line id="weekly-aqi-chart" data={{
            labels: weeklyLabels,
            datasets: [{ label: 'Weekly AQI', data: weeklyAQI, borderColor: '#ffb300', backgroundColor: 'rgba(255, 179, 0, 0.2)' }]
          }} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          <p className="mt-2 text-gray-500 text-sm">Weekly averages help spot longer-term trends.</p>
        </section>
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 fade-in">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">{selectedPollutant} {pollutantView === 'daily' ? 'Daily' : 'Weekly'} Trend</h3>
            <span className="text-gray-400 text-sm flex items-center gap-1"><FaInfoCircle title="Shows the trend for the selected pollutant." />Pollutant</span>
            <button className="ml-2 text-blue-600 hover:text-blue-800" title="Download chart as image" onClick={() => downloadChart('pollutant-trend-chart', 'pollutant_trend.png')}><FaDownload /></button>
          </div>
          <Line id="pollutant-trend-chart"
            key={pollutantView + selectedPollutant}
            data={{
              labels: pollutantLabels,
              datasets: [{ label: `${selectedPollutant} (${pollutantView})`, data: pollutantValues, borderColor: '#8e24aa', backgroundColor: 'rgba(142, 36, 170, 0.2)' }]
            }} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          <p className="mt-2 text-gray-500 text-sm">Analyze how this pollutant changes over time.</p>
        </section>
      </div>
    </div>
  );
} 