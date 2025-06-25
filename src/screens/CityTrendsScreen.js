import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const TREND_COLORS = {
  improving: 'bg-green-100 text-green-800',
  deteriorating: 'bg-red-100 text-red-800',
  stable: 'bg-yellow-100 text-yellow-800',
  'insufficient data': 'bg-gray-200 text-gray-600'
};
const TREND_ICONS = {
  improving: <ArrowTrendingDownIcon className="w-5 h-5 inline-block mr-1 text-green-600" />, // Down means improving AQI
  deteriorating: <ArrowTrendingUpIcon className="w-5 h-5 inline-block mr-1 text-red-600" />, // Up means worse AQI
  stable: <MinusIcon className="w-5 h-5 inline-block mr-1 text-yellow-600" />, // Flat
  'insufficient data': <InformationCircleIcon className="w-5 h-5 inline-block mr-1 text-gray-500" />
};

export default function CityTrendsScreen() {
  const [cityTrends, setCityTrends] = useState({});
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('http://127.0.0.1:5000/api/city-aqi-trends')
      .then(res => res.json())
      .then(data => {
        setCityTrends(data);
        setCities(Object.keys(data));
        setSelectedCity(Object.keys(data)[0] || '');
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch city AQI trends.');
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="p-8 text-center text-gray-400 animate-pulse">
      <div className="h-6 w-1/3 bg-gray-300 rounded mx-auto mb-4"></div>
      <div className="h-40 w-full bg-gray-200 rounded mb-4"></div>
      <div className="h-40 w-full bg-gray-200 rounded mb-4"></div>
      <div className="h-40 w-full bg-gray-200 rounded"></div>
    </div>
  );
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!selectedCity) return <div className="p-8 text-center text-gray-400">No city data available.</div>;

  const cityData = cityTrends[selectedCity];
  const monthly = cityData.monthly_avg_aqi;
  const yearly = cityData.yearly_avg_aqi;
  const spikes = cityData.spikes;
  const trend = cityData.trend;

  // Prepare chart data
  const monthlyLabels = monthly.map(m => `${m.Year}-${String(m.Month).padStart(2, '0')}`);
  const monthlyAQI = monthly.map(m => m.AQI);
  const yearlyLabels = yearly.map(y => y.Year);
  const yearlyAQI = yearly.map(y => y.AQI);

  const chartData = {
    labels: monthlyLabels,
    datasets: [
      {
        label: 'Monthly Avg AQI',
        data: monthlyAQI,
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.2)',
        yAxisID: 'y',
      },
      {
        label: 'Yearly Avg AQI',
        data: monthlyLabels.map(label => {
          const year = parseInt(label.split('-')[0]);
          const y = yearly.find(yy => yy.Year === year);
          return y ? y.AQI : null;
        }),
        borderColor: '#e57373',
        backgroundColor: 'rgba(229, 115, 115, 0.2)',
        yAxisID: 'y',
        borderDash: [5, 5],
        pointRadius: 0
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: `${selectedCity} AQI Trends` }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: { display: true, text: 'AQI' }
      }
    }
  };

  // Summary cards
  const currentAQI = monthly.length ? monthly[monthly.length - 1].AQI : null;
  const bestMonth = monthly.reduce((best, m) => (!best || m.AQI < best.AQI ? m : best), null);
  const worstMonth = monthly.reduce((worst, m) => (!worst || m.AQI > worst.AQI ? m : worst), null);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 text-center">City-Wise AQI Trends</h2>
      <div className="mb-6 flex flex-col md:flex-row gap-4 justify-center items-center">
        <select
          className="p-2 rounded border dark:bg-gray-900 dark:border-gray-700 min-w-[200px]"
          value={selectedCity}
          onChange={e => setSelectedCity(e.target.value)}
        >
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 flex flex-col items-center shadow">
            <span className="text-xs text-gray-500 mb-1">Current AQI</span>
            <span className="font-bold text-lg">{currentAQI ? currentAQI.toFixed(1) : 'N/A'}</span>
            <span className="text-blue-700 dark:text-blue-200 font-semibold">Latest Month</span>
          </div>
          <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4 flex flex-col items-center shadow">
            <span className="text-xs text-gray-500 mb-1">Best Month</span>
            <span className="font-bold text-lg">{bestMonth ? `${bestMonth.Year}-${String(bestMonth.Month).padStart(2, '0')}` : 'N/A'}</span>
            <span className="text-green-700 dark:text-green-200 font-semibold">AQI: {bestMonth ? bestMonth.AQI.toFixed(1) : 'N/A'}</span>
          </div>
          <div className="bg-red-50 dark:bg-red-900 rounded-lg p-4 flex flex-col items-center shadow">
            <span className="text-xs text-gray-500 mb-1">Worst Month</span>
            <span className="font-bold text-lg">{worstMonth ? `${worstMonth.Year}-${String(worstMonth.Month).padStart(2, '0')}` : 'N/A'}</span>
            <span className="text-red-700 dark:text-red-200 font-semibold">AQI: {worstMonth ? worstMonth.AQI.toFixed(1) : 'N/A'}</span>
          </div>
        </div>
        <div className={`rounded-lg px-4 py-2 flex items-center gap-2 font-semibold shadow ${TREND_COLORS[trend] || 'bg-gray-200 text-gray-600'}`}>
          {TREND_ICONS[trend]}
          <span className="capitalize">{trend}</span>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <Line data={chartData} options={options} />
      </div>
      <div className="mb-4">
        <h3 className="font-semibold mb-2 flex items-center gap-2">Pollution Spikes (Months with AQI &gt; 90th percentile)
          <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-pointer" title="These are months where AQI was unusually high (above 90th percentile)." />
        </h3>
        {spikes.length === 0 ? (
          <div className="text-gray-400">No spikes detected.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr>
                  <th className="px-2 py-1">Year</th>
                  <th className="px-2 py-1">Month</th>
                  <th className="px-2 py-1">AQI</th>
                </tr>
              </thead>
              <tbody>
                {spikes.map((s, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1">{s.Year}</td>
                    <td className="px-2 py-1">{String(s.Month).padStart(2, '0')}</td>
                    <td className={`px-2 py-1 font-semibold ${s.AQI > 150 ? 'text-red-600' : s.AQI > 100 ? 'text-yellow-600' : 'text-green-700'}`}>{s.AQI.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 