import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
);

// Add a simple spinner
const Spinner = () => (
  <div className="flex justify-center items-center py-8">
    <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
    </svg>
  </div>
);

const useDarkMode = () => {
  const [isDark, setIsDark] = useState(() =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  // Also check for Tailwind's dark class
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);
  return isDark;
};

const ForecastingScreen = () => {
  const isDark = useDarkMode();
  const [cities, setCities] = useState([]);
  const [pollutants, setPollutants] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedPollutant, setSelectedPollutant] = useState('AQI');
  const [forecast, setForecast] = useState([]);
  const [historical, setHistorical] = useState([]);
  const [forecasted, setForecasted] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [anomalyThreshold, setAnomalyThreshold] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scenarioPollutant, setScenarioPollutant] = useState('NO2 (ppb)');
  const [scenarioReduction, setScenarioReduction] = useState(0);
  const [showScenario, setShowScenario] = useState(false);
  const [pollutantSeries, setPollutantSeries] = useState(null);

  useEffect(() => {
    axios.get('/api/cities').then(res => setCities(res.data));
    axios.get('/api/pollutants').then(res => setPollutants(['AQI', ...res.data]));
  }, []);

  const fetchForecast = async () => {
    setLoading(true);
    setError('');
    setForecast([]);
    setHistorical([]);
    setForecasted([]);
    setAnomalies([]);
    setAnomalyThreshold(null);
    setPollutantSeries(null);
    try {
      let res;
      if (showScenario && scenarioReduction > 0) {
        res = await axios.post('/api/forecast', {
          city: selectedCity,
          pollutant: selectedPollutant,
          periods: 30,
          emission_reduction: { [scenarioPollutant]: scenarioReduction / 100 }
        });
      } else {
        res = await axios.get('/api/forecast', {
          params: {
            city: selectedCity,
            pollutant: selectedPollutant,
            periods: 30
          }
        });
      }
      const data = res.data;
      setHistorical(data.historical || []);
      setForecasted(data.forecast || []);
      setAnomalies(data.anomalies || []);
      setAnomalyThreshold(data.anomaly_threshold || null);
      setPollutantSeries(data.pollutant_series || null);
      setForecast([...(data.historical || []), ...(data.forecast || [])]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch forecast');
    }
    setLoading(false);
  };

  // Chart data: overlay historical (solid), forecast (dashed), anomalies (red)
  // Ensure unique, sorted labels and aligned data
  const histDates = historical.map(f => f.Date).filter(Boolean);
  const forecastDates = forecasted.map(f => f.Date).filter(Boolean);
  // Remove duplicates and sort
  const allDates = Array.from(new Set([...histDates, ...forecastDates])).sort();
  // Map date to value for each dataset
  const histMap = Object.fromEntries(historical.map(f => [f.Date, f.Forecast]));
  const forecastMap = Object.fromEntries(forecasted.map(f => [f.Date, f.Forecast]));
  const anomalyDates = anomalies.map(a => a.Date);
  // Build aligned data arrays
  const histData = allDates.map(date => histMap[date] ?? null);
  const forecastData = allDates.map(date => forecastMap[date] ?? null);
  const anomalyPoints = allDates.map(date => anomalyDates.includes(date));
  // Debug logs
  if (process.env.NODE_ENV !== 'production') {
    console.log('Chart allDates:', allDates);
    console.log('Chart histData:', histData);
    console.log('Chart forecastData:', forecastData);
    console.log('Chart anomalyPoints:', anomalyPoints);
  }
  const chartData = {
    labels: allDates,
    datasets: [
      {
        label: 'Historical',
        data: histData,
        borderColor: 'rgba(59,130,246,1)',
        backgroundColor: 'rgba(59,130,246,0.10)',
        pointBackgroundColor: 'rgba(59,130,246,1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(59,130,246,1)',
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: false,
        borderWidth: 3,
        spanGaps: true,
        borderDash: [],
      },
      {
        label: 'Forecast',
        data: forecastData,
        borderColor: 'rgba(16,185,129,1)',
        backgroundColor: 'rgba(16,185,129,0.10)',
        pointBackgroundColor: anomalyPoints.map(isAnomaly => isAnomaly ? 'rgba(239,68,68,1)' : 'rgba(16,185,129,1)'),
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(16,185,129,1)',
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: false,
        borderWidth: 3,
        spanGaps: true,
        borderDash: [8, 6],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: isDark ? '#fff' : '#1e293b',
          font: { size: 14, weight: 'bold' },
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: isDark ? 'rgba(30,41,59,0.95)' : '#fff',
        titleColor: isDark ? '#fff' : '#1e293b',
        bodyColor: isDark ? '#fff' : '#1e293b',
        borderColor: isDark ? 'rgba(59,130,246,0.5)' : 'rgba(37,99,235,0.5)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y !== null ? context.parsed.y.toFixed(2) : ''}`;
          },
        },
      },
      title: { display: false },
    },
    scales: {
      x: {
        type: 'category',
        title: { display: true, text: 'Date', color: isDark ? '#fff' : '#1e293b' },
        ticks: { color: isDark ? '#fff' : '#1e293b' },
        grid: { color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
      },
      y: {
        title: { display: true, text: 'AQI', color: isDark ? '#fff' : '#1e293b' },
        ticks: { color: isDark ? '#fff' : '#1e293b' },
        grid: { color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
      },
    },
  };

  // UI/UX: sticky selection panel
  return (
    <div className="max-w-5xl mx-auto p-2 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-2">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Forecasting & Scenario Analysis</h2>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-200 text-sm">
            <InformationCircleIcon className="w-5 h-5" />
            Predict future AQI or pollutant levels for a selected city. Use scenario analysis to simulate emission reductions.
          </div>
        </div>
      </div>
      {/* Selection Panel */}
      <div className="sticky top-2 z-10 mb-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1 min-w-[160px]">
          <label className="block mb-1 font-semibold text-gray-900 dark:text-white">City</label>
          <select className="w-full rounded-lg border-gray-300 dark:bg-gray-900 dark:text-white" value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
            <option value="">Select a city</option>
            {cities.map(city => <option key={city} value={city}>{city}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block mb-1 font-semibold text-gray-900 dark:text-white">Pollutant</label>
          <select className="w-full rounded-lg border-gray-300 dark:bg-gray-900 dark:text-white" value={selectedPollutant} onChange={e => setSelectedPollutant(e.target.value)}>
            {pollutants.map(pol => <option key={pol} value={pol}>{pol}</option>)}
          </select>
        </div>
        <div className="flex-1 flex items-end gap-2 min-w-[120px]">
          <button className={`px-4 py-2 rounded-lg font-semibold shadow transition-colors ${showScenario ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-white'}`} onClick={() => setShowScenario(v => !v)}>
            {showScenario ? 'Scenario: ON' : 'Scenario: OFF'}
          </button>
        </div>
        <div className="flex-1 flex items-end">
          <button
            className="w-full md:w-auto px-6 py-2 rounded-lg bg-green-600 text-white font-bold shadow hover:bg-green-700 transition-colors"
            onClick={fetchForecast}
            disabled={!selectedCity || !selectedPollutant || loading}
          >
            {loading ? <Spinner /> : 'Run Forecast'}
          </button>
        </div>
      </div>
      {/* Scenario Controls */}
      {showScenario && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block mb-1 font-semibold text-gray-900 dark:text-white">Pollutant to Reduce</label>
            <select className="w-full rounded-lg border-gray-300 dark:bg-gray-900 dark:text-white" value={scenarioPollutant} onChange={e => setScenarioPollutant(e.target.value)}>
              {pollutants.filter(p => p !== 'AQI').map(pol => <option key={pol} value={pol}>{pol}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block mb-1 font-semibold text-gray-900 dark:text-white">Reduction (%)</label>
            <input type="range" min={0} max={100} step={1} className="w-full" value={scenarioReduction} onChange={e => setScenarioReduction(Number(e.target.value))} />
            <div className="text-xs text-gray-600 dark:text-gray-200 mt-1">{scenarioReduction}% reduction</div>
          </div>
        </div>
      )}
      {/* Error State */}
      {error && <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-xl mb-6 text-center font-semibold">{error}</div>}
      {/* Anomaly Alert */}
      {anomalies.length > 0 && (
        <div className="flex items-center gap-2 p-4 mb-6 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-xl">
          <ExclamationTriangleIcon className="w-6 h-6" />
          <span>Warning: {anomalies.length} forecasted day(s) exceed the anomaly threshold (AQI &gt; {anomalyThreshold && anomalyThreshold.toFixed(1)}).</span>
        </div>
      )}
      {/* Chart Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8" style={{ minHeight: 400 }}>
        {loading ? <Spinner /> : (
          allDates.length > 0 && (histData.some(v => v !== null) || forecastData.some(v => v !== null)) ?
            <Line data={chartData} options={chartOptions} height={400} /> :
            <div className="text-center text-gray-400 dark:text-gray-300 py-16 text-lg">No data available for the selected city and pollutant.</div>
        )}
      </div>
      {/* Scenario Table */}
      {showScenario && pollutantSeries && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">Modified Pollutant Series <InformationCircleIcon className="w-5 h-5 text-gray-400" title="Pollutant values after scenario reduction" /></h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="px-2 py-1 text-gray-900 dark:text-white">Date</th>
                  {Object.keys(pollutantSeries[0] || {}).filter(k => k !== 'ds').map(pol => (
                    <th key={pol} className="px-2 py-1 text-gray-900 dark:text-white">{pol}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pollutantSeries.map((row, i) => (
                  <tr key={i} className="even:bg-gray-50 dark:even:bg-gray-900">
                    <td className="px-2 py-1 text-gray-800 dark:text-white">{row.ds?.slice(0, 10)}</td>
                    {Object.keys(row).filter(k => k !== 'ds').map(pol => (
                      <td key={pol} className="px-2 py-1 text-gray-800 dark:text-white">{row[pol]?.toFixed(2)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForecastingScreen; 