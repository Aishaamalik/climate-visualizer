import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useNotifications } from '../App';

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
  const { addNotification } = useNotifications();

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
  const healthImpact = cityData.health_impact;
  const seasonalHighlights = cityData.seasonal_highlights || [];

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
    <div className="max-w-5xl mx-auto p-2 md:p-6">
      <h2 className="text-2xl font-bold mb-8 text-center">City-Wise AQI Trends</h2>
      {/* City Selector Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8 flex flex-col md:flex-row items-center gap-6">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <InformationCircleIcon className="w-6 h-6 text-blue-400" />
          <label htmlFor="city-select" className="font-semibold text-gray-700 dark:text-gray-200">Select City:</label>
          <select
            id="city-select"
            className="p-3 rounded-lg border dark:bg-gray-900 dark:border-gray-700 min-w-[200px]"
            value={selectedCity}
            onChange={e => setSelectedCity(e.target.value)}
          >
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className={`rounded-full px-5 py-2 flex items-center gap-2 font-semibold shadow ${TREND_COLORS[trend] || 'bg-gray-200 text-gray-600'}`}> 
          {TREND_ICONS[trend]}
          <span className="capitalize">{trend}</span>
        </div>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="flex flex-col items-start bg-blue-50 dark:bg-blue-900 rounded-2xl shadow-lg p-6 border-t-4 border-blue-500">
          <div className="bg-blue-100 dark:bg-blue-800 p-3 rounded-full mb-4"><ArrowTrendingUpIcon className="w-7 h-7 text-blue-600 dark:text-blue-300" /></div>
          <div className="text-2xl font-bold mb-1">{currentAQI ? currentAQI.toFixed(1) : 'N/A'}</div>
          <div className="text-sm text-gray-500">Current AQI</div>
          <div className="text-xs text-blue-700 dark:text-blue-200 mt-2 font-semibold">Latest Month</div>
        </div>
        <div className="flex flex-col items-start bg-green-50 dark:bg-green-900 rounded-2xl shadow-lg p-6 border-t-4 border-green-500">
          <div className="bg-green-100 dark:bg-green-800 p-3 rounded-full mb-4"><ArrowTrendingDownIcon className="w-7 h-7 text-green-600 dark:text-green-300" /></div>
          <div className="text-2xl font-bold mb-1">{bestMonth ? `${bestMonth.Year}-${String(bestMonth.Month).padStart(2, '0')}` : 'N/A'}</div>
          <div className="text-sm text-gray-500">Best Month</div>
          <div className="text-xs text-green-700 dark:text-green-200 mt-2 font-semibold">AQI: {bestMonth ? bestMonth.AQI.toFixed(1) : 'N/A'}</div>
        </div>
        <div className="flex flex-col items-start bg-red-50 dark:bg-red-900 rounded-2xl shadow-lg p-6 border-t-4 border-red-500">
          <div className="bg-red-100 dark:bg-red-800 p-3 rounded-full mb-4"><ArrowTrendingUpIcon className="w-7 h-7 text-red-600 dark:text-red-300" /></div>
          <div className="text-2xl font-bold mb-1">{worstMonth ? `${worstMonth.Year}-${String(worstMonth.Month).padStart(2, '0')}` : 'N/A'}</div>
          <div className="text-sm text-gray-500">Worst Month</div>
          <div className="text-xs text-red-700 dark:text-red-200 mt-2 font-semibold">AQI: {worstMonth ? worstMonth.AQI.toFixed(1) : 'N/A'}</div>
        </div>
        {/* Health Impact Card */}
        <div className="flex flex-col items-start bg-yellow-50 dark:bg-yellow-900 rounded-2xl shadow-lg p-6 border-t-4 border-yellow-500">
          <div className="bg-yellow-100 dark:bg-yellow-800 p-3 rounded-full mb-4"><InformationCircleIcon className="w-7 h-7 text-yellow-600 dark:text-yellow-300" /></div>
          <div className="text-lg font-bold mb-1">{healthImpact?.category || 'N/A'}</div>
          <div className="text-yellow-700 dark:text-yellow-200 font-semibold text-xl">{healthImpact?.aqi !== undefined && healthImpact?.aqi !== null ? healthImpact.aqi.toFixed(1) : 'N/A'}</div>
          <div className="text-xs text-gray-500 mt-2">{healthImpact?.description}</div>
        </div>
      </div>
      {/* Chart Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">AQI Trend Chart</h3>
          <span className="text-gray-400 text-sm">Monthly and yearly AQI trends for the selected city.</span>
        </div>
        <Line data={chartData} options={options} />
      </div>
      {/* Seasonal Trend Highlights */}
      {seasonalHighlights.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-semibold">Seasonal Trend Highlights</h3>
            <InformationCircleIcon className="w-5 h-5 text-gray-400 cursor-pointer" title="Months with consistently high (spike) or low (drop) AQI across years." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {seasonalHighlights.map((h, i) => (
              <div key={i} className={`p-4 rounded-xl shadow flex flex-col gap-1 ${h.type === 'spike' ? 'bg-red-50 dark:bg-red-900' : 'bg-green-50 dark:bg-green-900'}`}>
                <div className="font-bold text-lg">{h.type === 'spike' ? 'Spike' : 'Drop'}: Month {h.month}</div>
                <div className="text-gray-700 dark:text-gray-200">Avg AQI: <span className="font-semibold">{h.avg_aqi.toFixed(1)}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Pollution Spikes Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-semibold">Pollution Spikes</h3>
          <InformationCircleIcon className="w-5 h-5 text-gray-400 cursor-pointer" title="These are months where AQI was unusually high (above 90th percentile)." />
        </div>
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