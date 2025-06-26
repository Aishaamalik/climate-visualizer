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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api/cities').then(res => setCities(res.data));
    axios.get('/api/pollutants').then(res => setPollutants(['AQI', ...res.data]));
  }, []);

  const fetchForecast = async () => {
    setLoading(true);
    setError('');
    setForecast([]);
    try {
      const res = await axios.get('/api/forecast', {
        params: {
          city: selectedCity,
          pollutant: selectedPollutant,
          periods: 30
        }
      });
      console.log('Forecast API response:', res.data);
      // Ensure Date is in ISO format for chartjs-adapter-date-fns
      const formatted = res.data.map(f => ({
        ...f,
        Date: f.Date ? new Date(f.Date).toISOString().slice(0, 10) : '',
        type: f.type || 'forecast',
      }));
      setForecast(formatted);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch forecast');
    }
    setLoading(false);
  };

  // Only show the forecasted period (next 30 days)
  const predicted = forecast.filter(f => f.type === 'forecast');
  const allDates = predicted.map(f => f.Date);
  const chartData = {
    labels: allDates,
    datasets: [
      {
        label: 'Forecast',
        data: predicted.map(f => f.Forecast),
        borderColor: 'rgba(16, 185, 129, 1)', // green-500
        backgroundColor: 'rgba(16, 185, 129, 0.10)',
        borderDash: [8, 6],
        pointBackgroundColor: 'rgba(16, 185, 129, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(16, 185, 129, 1)',
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: false,
        borderWidth: 3,
        spanGaps: true,
      },
      {
        label: 'Forecast Confidence',
        data: predicted.map(f => f.Upper),
        borderColor: 'rgba(59, 130, 246, 0.0)',
        backgroundColor: 'rgba(59, 130, 246, 0.10)',
        fill: '+1',
        pointRadius: 0,
        borderWidth: 0,
        order: 1,
      },
      {
        label: '',
        data: predicted.map(f => f.Lower),
        borderColor: 'rgba(59, 130, 246, 0.0)',
        backgroundColor: 'rgba(59, 130, 246, 0.10)',
        fill: '-1',
        pointRadius: 0,
        borderWidth: 0,
        order: 1,
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
          color: isDark ? '#e0e7ef' : '#1e293b',
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
            if (context.dataset.label === 'Forecast Confidence') return null;
            return `${context.dataset.label}: ${context.parsed.y !== null ? context.parsed.y.toFixed(2) : ''}`;
          },
        },
      },
      annotation: {
        annotations: predicted.length ? {
          line1: {
            type: 'line',
            xMin: allDates[0],
            xMax: allDates[allDates.length - 1],
            borderColor: isDark ? 'rgba(148,163,184,0.5)' : 'rgba(30,41,59,0.5)',
            borderWidth: 2,
            label: {
              content: 'Forecast End',
              enabled: true,
              position: 'end',
              color: isDark ? '#e0e7ef' : '#334155',
              font: { weight: 'bold' },
              backgroundColor: isDark ? '#1e293b' : '#fff',
            },
          },
        } : {},
      },
      title: {
        display: false,
      },
    },
    layout: {
      padding: 16,
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          tooltipFormat: 'PP',
          displayFormats: {
            day: 'MMM d',
          },
        },
        title: {
          display: true,
          text: 'Date',
          color: isDark ? '#cbd5e1' : '#64748b',
          font: { size: 13, weight: 'bold' },
        },
        grid: {
          color: isDark ? 'rgba(51,65,85,0.3)' : 'rgba(203,213,225,0.3)',
        },
        ticks: {
          color: isDark ? '#cbd5e1' : '#64748b',
          font: { size: 12 },
        },
      },
      y: {
        title: {
          display: true,
          text: selectedPollutant,
          color: isDark ? '#cbd5e1' : '#64748b',
          font: { size: 13, weight: 'bold' },
        },
        grid: {
          color: isDark ? 'rgba(51,65,85,0.3)' : 'rgba(203,213,225,0.3)',
        },
        ticks: {
          color: isDark ? '#cbd5e1' : '#64748b',
          font: { size: 12 },
          callback: function(value) {
            return value.toFixed(0);
          },
        },
      },
    },
    elements: {
      line: {
        borderJoinStyle: 'round',
      },
      point: {
        borderWidth: 2,
      },
    },
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8">
        <h2 className="text-3xl font-bold mb-2 text-blue-900 dark:text-blue-200">Forecasting Module</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Predict future AQI or pollutant levels for a selected city using advanced time series models.</p>
        <form className="flex flex-col md:flex-row gap-4 mb-6" onSubmit={e => { e.preventDefault(); fetchForecast(); }}>
          <div className="flex-1">
            <label htmlFor="city-select" className="block text-sm font-semibold mb-1">City</label>
            <select
              id="city-select"
              aria-label="Select City"
              className="border p-2 rounded w-full focus:ring-2 focus:ring-blue-400"
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              required
            >
              <option value="">Select City</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="pollutant-select" className="block text-sm font-semibold mb-1">Pollutant</label>
            <select
              id="pollutant-select"
              aria-label="Select Pollutant"
              className="border p-2 rounded w-full focus:ring-2 focus:ring-blue-400"
              value={selectedPollutant}
              onChange={e => setSelectedPollutant(e.target.value)}
            >
              {pollutants.map(pol => (
                <option key={pol} value={pol}>{pol}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 transition text-white px-6 py-2 rounded shadow font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={!selectedCity || loading}
              aria-label="Get Forecast"
            >
              {loading ? <span className="flex items-center"><Spinner /> Forecasting...</span> : 'Get Forecast'}
            </button>
          </div>
        </form>
        {error && <div className="bg-red-100 text-red-700 rounded p-3 mb-4 text-center font-semibold shadow">{error}</div>}
        {loading && <Spinner />}
        {!loading && !error && forecast.length === 0 && (
          <div className="text-gray-400 text-center py-8">
            <svg className="mx-auto mb-2" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" /></svg>
            <div>No forecast data yet. Select a city and pollutant, then click <span className="font-semibold">Get Forecast</span>.</div>
          </div>
        )}
        {forecast.length > 0 && !loading && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow mt-4">
            <h3 className="text-lg font-bold mb-2 text-blue-800 dark:text-blue-200">30-Day Forecast</h3>
            <div className="h-96">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForecastingScreen; 