import React, { useEffect, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useNotifications } from '../App';

ChartJS.register(
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title
);

const POLLUTANT_INFO = {
  'PM2.5 (µg/m³)': 'Fine particulate matter, can penetrate deep into lungs.',
  'PM10 (µg/m³)': 'Coarse particulate matter, affects respiratory system.',
  'NO2 (ppb)': 'Nitrogen dioxide, causes respiratory issues.',
  'SO2 (ppb)': 'Sulfur dioxide, can cause asthma and bronchitis.',
  'CO (ppm)': 'Carbon monoxide, reduces oxygen delivery.',
  'O3 (ppb)': 'Ozone, can trigger chest pain and coughing.'
};

const POLLUTANT_COLORS = [
  '#1976d2', // PM2.5
  '#e57373', // PM10
  '#ffb300', // NO2
  '#43a047', // SO2
  '#8e24aa', // CO
  '#00838f'  // O3
];

export default function PollutantCompositionScreen() {
  const [data, setData] = useState({});
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addNotification } = useNotifications();

  useEffect(() => {
    setLoading(true);
    fetch('http://127.0.0.1:5000/api/pollutant-composition')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setCities(Object.keys(d));
        setSelectedCity(Object.keys(d)[0] || '');
        setLoading(false);
        addNotification({
          title: 'Pollutant Composition',
          message: 'Pollutant composition data loaded successfully.',
          time: new Date().toLocaleString()
        });
      })
      .catch(() => {
        setError('Failed to fetch pollutant composition data.');
        setLoading(false);
        addNotification({
          title: 'Pollutant Composition',
          message: 'Failed to load pollutant composition data.',
          time: new Date().toLocaleString()
        });
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

  const cityData = data[selectedCity];
  const pollutants = Object.keys(cityData);
  const avgData = pollutants.map(p => cityData[p].average);
  const maxData = pollutants.map(p => cityData[p].max);
  const pctData = pollutants.map(p => cityData[p].percentage_contribution);

  // Find dominant pollutant
  const dominantIdx = pctData.indexOf(Math.max(...pctData));
  const dominantPollutant = pollutants[dominantIdx];
  const dominantPct = pctData[dominantIdx];
  const totalAQI = avgData.reduce((a, b) => a + b, 0);
  const highestValue = Math.max(...maxData);
  const highestIdx = maxData.indexOf(highestValue);
  const highestPollutant = pollutants[highestIdx];

  const barOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } }
  };

  return (
    <div className="max-w-5xl mx-auto p-2 md:p-6">
      <h2 className="text-2xl font-bold mb-8 text-center">Pollutant Composition Analysis</h2>
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
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="flex flex-col items-start bg-blue-50 dark:bg-blue-900 rounded-2xl shadow-lg p-6 border-t-4 border-blue-500">
          <div className="bg-blue-100 dark:bg-blue-800 p-3 rounded-full mb-4"><InformationCircleIcon className="w-7 h-7 text-blue-600 dark:text-blue-300" /></div>
          <div className="text-lg font-bold mb-1 flex items-center gap-1">{dominantPollutant}
            <span className="relative group">
              <InformationCircleIcon className="w-4 h-4 text-blue-400 cursor-pointer" />
              <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                {POLLUTANT_INFO[dominantPollutant]}
              </span>
            </span>
          </div>
          <div className="text-blue-700 dark:text-blue-200 font-semibold text-xl">{dominantPct.toFixed(1)}%</div>
          <div className="text-xs text-gray-500 mt-2">Dominant Pollutant</div>
        </div>
        <div className="flex flex-col items-start bg-green-50 dark:bg-green-900 rounded-2xl shadow-lg p-6 border-t-4 border-green-500">
          <div className="bg-green-100 dark:bg-green-800 p-3 rounded-full mb-4"><InformationCircleIcon className="w-7 h-7 text-green-600 dark:text-green-300" /></div>
          <div className="text-lg font-bold mb-1">{totalAQI.toFixed(1)}</div>
          <div className="text-green-700 dark:text-green-200 font-semibold text-xl">AQI Units</div>
          <div className="text-xs text-gray-500 mt-2">Total Avg Pollutants</div>
        </div>
        <div className="flex flex-col items-start bg-red-50 dark:bg-red-900 rounded-2xl shadow-lg p-6 border-t-4 border-red-500">
          <div className="bg-red-100 dark:bg-red-800 p-3 rounded-full mb-4"><InformationCircleIcon className="w-7 h-7 text-red-600 dark:text-red-300" /></div>
          <div className="text-lg font-bold mb-1 flex items-center gap-1">{highestPollutant}
            <span className="relative group">
              <InformationCircleIcon className="w-4 h-4 text-red-400 cursor-pointer" />
              <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                {POLLUTANT_INFO[highestPollutant]}
              </span>
            </span>
          </div>
          <div className="text-red-700 dark:text-red-200 font-semibold text-xl">{highestValue.toFixed(1)}</div>
          <div className="text-xs text-gray-500 mt-2">Highest Pollutant Value</div>
        </div>
      </div>
      {/* Average Pollutant Values Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-semibold">Average Pollutant Values</h3>
          <span className="relative group">
            <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-pointer" />
            <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
              Average value of each pollutant in the selected city.
            </span>
          </span>
        </div>
        <Bar data={{
          labels: pollutants,
          datasets: [{ label: 'Average', data: avgData, backgroundColor: POLLUTANT_COLORS }]
        }} options={barOptions} />
      </div>
      {/* Max Pollutant Values Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-semibold">Max Pollutant Values</h3>
          <span className="relative group">
            <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-pointer" />
            <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
              Maximum recorded value of each pollutant in the selected city.
            </span>
          </span>
        </div>
        <Bar data={{
          labels: pollutants,
          datasets: [{ label: 'Max', data: maxData, backgroundColor: POLLUTANT_COLORS }]
        }} options={barOptions} />
      </div>
      {/* Percentage Contribution Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-semibold">Percentage Contribution to AQI</h3>
          <span className="relative group">
            <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-pointer" />
            <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
              Share of each pollutant in the total AQI for the city.
            </span>
          </span>
        </div>
        <Pie data={{
          labels: pollutants,
          datasets: [{ data: pctData, backgroundColor: POLLUTANT_COLORS }]
        }} />
      </div>
    </div>
  );
} 