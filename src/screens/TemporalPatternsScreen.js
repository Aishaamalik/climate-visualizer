import React, { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { FaInfoCircle, FaRedo, FaDownload, FaExclamationTriangle, FaCalendarAlt } from 'react-icons/fa';
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
import { useNotifications } from '../App';

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
  const { addNotification } = useNotifications();
  const [selectedMOMYear, setSelectedMOMYear] = useState(null);

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
        addNotification({
          title: 'Temporal Patterns',
          message: 'Temporal patterns data loaded successfully.',
          time: new Date().toLocaleString()
        });
      })
      .catch(() => {
        setError('Failed to fetch temporal patterns data.');
        setLoading(false);
        addNotification({
          title: 'Temporal Patterns',
          message: 'Failed to load temporal patterns data.',
          time: new Date().toLocaleString()
        });
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
  // Compute 7-day moving average
  function movingAverage(arr, windowSize) {
    const result = [];
    for (let i = 0; i < arr.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = arr.slice(start, i + 1);
      const avg = window.reduce((a, b) => a + b, 0) / window.length;
      result.push(avg);
    }
    return result;
  }
  const dailyAQIMovingAvg = movingAverage(dailyAQI, 7);
  // Weekly AQI
  const weeklyLabels = cityData.weekly_avg_aqi.map(w => `${w.Year}-W${w.Week}`);
  const weeklyAQI = cityData.weekly_avg_aqi.map(w => w.AQI);
  // Pollutant trend
  const pollutantData = cityData.pollutant_daily;
  const pollutantLabels = pollutantData.map(d => d.Date);
  const pollutantValues = pollutantData.map(d => d[selectedPollutant]);

  // Debug logs
  console.log('pollutantView:', pollutantView);
  console.log('cityData.pollutant_daily:', cityData.pollutant_daily);
  console.log('cityData.pollutant_weekly:', cityData.pollutant_weekly);
  console.log('pollutantData:', pollutantData);
  console.log('pollutantLabels:', pollutantLabels);
  console.log('pollutantValues:', pollutantValues);

  // --- Holiday/Event Effect ---
  const holidayEffect = cityData.holiday_event_effect || {};
  const holidayBarData = {
    labels: ['Non-Holiday', 'Holiday'],
    datasets: [{
      label: 'Avg AQI',
      data: [holidayEffect.non_holiday_avg_aqi, holidayEffect.holiday_avg_aqi],
      backgroundColor: ['#1976d2', '#ffb300']
    }]
  };

  // --- Extreme Events ---
  const extremeEvents = cityData.extreme_events || [];
  // For marking on daily AQI chart
  const extremeEventDates = new Set(extremeEvents.map(e => e.date));

  // --- Month-over-Month Comparison ---
  const mom = cityData.month_over_month || {};
  const momYearOptions = Object.keys(mom).map(y => +y);
  const selectedYear = selectedMOMYear || momYearOptions[0];
  const momData = mom[selectedYear] || {};
  const momBarData = {
    labels: Array.from({length: 12}, (_, i) => i + 1),
    datasets: [{
      label: `AQI in ${selectedYear}`,
      data: Array.from({length: 12}, (_, i) => momData[i + 1] ?? null),
      backgroundColor: '#1976d2'
    }]
  };

  return (
    <div className={`max-w-5xl mx-auto p-2 md:p-6 transition-opacity duration-700 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}> 
      <h2 className="text-2xl font-bold mb-8 text-center flex items-center justify-center gap-2 dark:text-white">
        Temporal Patterns Analysis
        <span className="text-gray-400" title="Explore how air quality changes over time, by city and pollutant."><FaInfoCircle /></span>
      </h2>
      {/* Selector Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8 flex flex-col md:flex-row gap-6 items-center justify-center">
        <div className="flex flex-col items-start w-full md:w-auto">
          <label className="mb-1 font-semibold flex items-center gap-1 dark:text-white">City <FaInfoCircle title="Select a city to view its air quality trends." /></label>
          <select
            className={`p-3 rounded-lg border dark:bg-gray-900 dark:border-gray-700 min-w-[200px] ${selectedCity ? 'ring-2 ring-blue-400' : ''}`}
            value={selectedCity}
            onChange={e => setSelectedCity(e.target.value)}
          >
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-col items-start w-full md:w-auto">
          <label className="mb-1 font-semibold flex items-center gap-1 dark:text-white">Pollutant <FaInfoCircle title="Choose a pollutant to analyze its trend." /></label>
          <select
            className={`p-3 rounded-lg border dark:bg-gray-900 dark:border-gray-700 min-w-[200px] ${selectedPollutant ? 'ring-2 ring-purple-400' : ''}`}
            value={selectedPollutant}
            onChange={e => setSelectedPollutant(e.target.value)}
          >
            {POLLUTANTS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      {/* Chart Cards */}
      <div className="flex flex-col gap-8">
        {/* --- Extreme Event Highlight Section --- */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold dark:text-white">Extreme Events</h3>
            <span className="text-gray-400 text-sm flex items-center gap-1 dark:text-white"><FaInfoCircle title="Days with unusually high AQI, possibly due to forest fires, sandstorms, etc." />Extreme events</span>
          </div>
          {extremeEvents.length === 0 ? (
            <div className="text-gray-500 text-sm">No extreme AQI events detected.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs mt-2 dark:text-white">
                <thead><tr className="text-gray-500 dark:text-white"><th>Date</th><th>AQI</th><th>Note</th></tr></thead>
                <tbody>
                  {extremeEvents.map(e => (
                    <tr key={e.date} className="text-red-600 font-semibold dark:text-red-300">
                      <td>{e.date}</td>
                      <td>{e.aqi.toFixed(1)}</td>
                      <td>{e.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {/* --- Monthly Average AQI (with Extreme Event Markers) --- */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold dark:text-white">Monthly Average AQI</h3>
            <span className="text-gray-400 text-sm flex items-center gap-1 dark:text-white"><FaInfoCircle title="Shows the average AQI for each month." />Monthly trend</span>
            <button className="ml-2 text-blue-600 hover:text-blue-800" title="Download chart as image" onClick={() => downloadChart('monthly-aqi-chart', 'monthly_aqi.png')}><FaDownload /></button>
          </div>
          <Line id="monthly-aqi-chart" data={{
            labels: monthlyLabels,
            datasets: [{ label: 'Monthly Avg AQI', data: monthlyAQI, borderColor: '#1976d2', backgroundColor: 'rgba(25, 118, 210, 0.2)' }]
          }} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          <p className="mt-2 text-gray-500 text-sm dark:text-white">Track how air quality changes month by month.</p>
        </section>
        {/* --- Daily AQI Trend (with Extreme Event Markers) --- */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold dark:text-white">Daily AQI Trend</h3>
            <span className="text-gray-400 text-sm flex items-center gap-1 dark:text-white"><FaInfoCircle title="Shows the AQI for each day. Includes a 7-day moving average for clarity." />Fine-grained</span>
            <button className="ml-2 text-blue-600 hover:text-blue-800" title="Download chart as image" onClick={() => downloadChart('daily-aqi-chart', 'daily_aqi.png')}><FaDownload /></button>
          </div>
          <Line id="daily-aqi-chart" data={{
            labels: dailyLabels,
            datasets: [
              { label: 'Daily AQI', data: dailyAQI, borderColor: 'rgba(67, 160, 71, 0.3)', backgroundColor: 'rgba(67, 160, 71, 0.1)', pointRadius: 0, borderWidth: 1, fill: false },
              { label: '7-day Moving Avg', data: dailyAQIMovingAvg, borderColor: '#43a047', backgroundColor: 'rgba(67, 160, 71, 0.2)', pointRadius: 0, borderWidth: 2.5, fill: false },
              // Extreme event markers
              {
                type: 'scatter',
                label: 'Extreme Event',
                data: dailyLabels.map((d, i) => extremeEventDates.has(d) ? { x: d, y: dailyAQI[i] } : null).filter(Boolean),
                backgroundColor: '#ff1744',
                pointRadius: 6,
                showLine: false,
                borderWidth: 0,
                pointStyle: 'triangle',
                hoverBackgroundColor: '#ff1744',
                hoverBorderColor: '#ff1744',
                fill: false
              }
            ]
          }} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          <p className="mt-2 text-gray-500 text-sm dark:text-white">Observe daily fluctuations in air quality. <span className="text-green-700 font-bold dark:text-green-300">Green line</span> is the 7-day moving average. <span className="text-red-500 font-bold dark:text-red-300">Red triangles</span> mark extreme events.</p>
        </section>
        {/* --- Month-over-Month Comparison Section --- */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold dark:text-white flex items-center gap-2"><FaCalendarAlt className="text-blue-400" />Month-over-Month Comparison</h3>
            <span className="text-gray-400 text-sm flex items-center gap-1 dark:text-white"><FaInfoCircle title="Compare AQI for each month within a selected year." />MOM</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs text-gray-500 dark:text-white">Select Year:</label>
            <select className="p-1 rounded border dark:bg-gray-900 dark:border-gray-700" value={selectedYear} onChange={e => setSelectedMOMYear(+e.target.value)}>
              {momYearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <Bar data={momBarData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
          <div className="mt-2 text-gray-500 text-sm dark:text-white">See how AQI changes month by month within the selected year.</div>
        </section>
        {/* --- Weekday vs Weekend AQI --- */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold dark:text-white">Weekday vs Weekend AQI</h3>
            <span className="text-gray-400 text-sm flex items-center gap-1 dark:text-white"><FaInfoCircle title="Compares average AQI on weekdays vs weekends." />Comparison</span>
            <button className="ml-2 text-blue-600 hover:text-blue-800" title="Download chart as image" onClick={() => downloadChart('weekday-weekend-chart', 'weekday_weekend_aqi.png')}><FaDownload /></button>
          </div>
          <Bar id="weekday-weekend-chart" data={weekdayWeekendData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
          <p className="mt-2 text-gray-500 text-sm dark:text-white">See if weekends have better or worse air quality than weekdays.</p>
        </section>
        {/* --- Weekly AQI Trend --- */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold dark:text-white">Weekly AQI Trend</h3>
            <span className="text-gray-400 text-sm flex items-center gap-1 dark:text-white"><FaInfoCircle title="Shows the AQI for each week." />Smoothed</span>
            <button className="ml-2 text-blue-600 hover:text-blue-800" title="Download chart as image" onClick={() => downloadChart('weekly-aqi-chart', 'weekly_aqi.png')}><FaDownload /></button>
          </div>
          <Line id="weekly-aqi-chart" data={{
            labels: weeklyLabels,
            datasets: [{ label: 'Weekly AQI', data: weeklyAQI, borderColor: '#ffb300', backgroundColor: 'rgba(255, 179, 0, 0.2)' }]
          }} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          <p className="mt-2 text-gray-500 text-sm dark:text-white">Weekly averages help spot longer-term trends.</p>
        </section>
        {/* --- Pollutant Trend --- */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold dark:text-white">{selectedPollutant} Daily Trend</h3>
            <span className="text-gray-400 text-sm flex items-center gap-1 dark:text-white"><FaInfoCircle title="Shows the trend for the selected pollutant." />Pollutant</span>
            <button className="ml-2 text-blue-600 hover:text-blue-800" title="Download chart as image" onClick={() => downloadChart('pollutant-trend-chart', 'pollutant_trend.png')}><FaDownload /></button>
          </div>
          <Line id="pollutant-trend-chart"
            key={selectedPollutant}
            data={{
              labels: pollutantLabels,
              datasets: [{ label: `${selectedPollutant} (daily)`, data: pollutantValues, borderColor: '#8e24aa', backgroundColor: 'rgba(142, 36, 170, 0.2)' }]
            }} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          <p className="mt-2 text-gray-500 text-sm dark:text-white">Analyze how this pollutant changes over time.</p>
        </section>
      </div>
    </div>
  );
} 