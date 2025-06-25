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

  useEffect(() => {
    setLoading(true);
    fetch('http://127.0.0.1:5000/api/pollutant-composition')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setCities(Object.keys(d));
        setSelectedCity(Object.keys(d)[0] || '');
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch pollutant composition data.');
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
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 text-center">Pollutant Composition Analysis</h2>
      <div className="mb-6 flex flex-col md:flex-row gap-4 justify-center">
        <select
          className="p-2 rounded border dark:bg-gray-900 dark:border-gray-700 min-w-[200px]"
          value={selectedCity}
          onChange={e => setSelectedCity(e.target.value)}
        >
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 flex flex-col items-center shadow">
            <span className="text-xs text-gray-500 mb-1">Dominant Pollutant</span>
            <span className="font-bold text-lg flex items-center gap-1">
              {dominantPollutant}
              <span className="relative group">
                <InformationCircleIcon className="w-4 h-4 text-blue-400 cursor-pointer" />
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                  {POLLUTANT_INFO[dominantPollutant]}
                </span>
              </span>
            </span>
            <span className="text-blue-700 dark:text-blue-200 font-semibold">{dominantPct.toFixed(1)}%</span>
          </div>
          <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4 flex flex-col items-center shadow">
            <span className="text-xs text-gray-500 mb-1">Total Avg Pollutants</span>
            <span className="font-bold text-lg">{totalAQI.toFixed(1)}</span>
            <span className="text-green-700 dark:text-green-200 font-semibold">AQI Units</span>
          </div>
          <div className="bg-red-50 dark:bg-red-900 rounded-lg p-4 flex flex-col items-center shadow">
            <span className="text-xs text-gray-500 mb-1">Highest Pollutant Value</span>
            <span className="font-bold text-lg flex items-center gap-1">
              {highestPollutant}
              <span className="relative group">
                <InformationCircleIcon className="w-4 h-4 text-red-400 cursor-pointer" />
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                  {POLLUTANT_INFO[highestPollutant]}
                </span>
              </span>
            </span>
            <span className="text-red-700 dark:text-red-200 font-semibold">{highestValue.toFixed(1)}</span>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold mb-2 flex items-center gap-2">Average Pollutant Values
          <span className="relative group">
            <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-pointer" />
            <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
              Average value of each pollutant in the selected city.
            </span>
          </span>
        </h3>
        <Bar data={{
          labels: pollutants,
          datasets: [{ label: 'Average', data: avgData, backgroundColor: POLLUTANT_COLORS }]
        }} options={barOptions} />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold mb-2 flex items-center gap-2">Max Pollutant Values
          <span className="relative group">
            <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-pointer" />
            <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
              Maximum recorded value of each pollutant in the selected city.
            </span>
          </span>
        </h3>
        <Bar data={{
          labels: pollutants,
          datasets: [{ label: 'Max', data: maxData, backgroundColor: POLLUTANT_COLORS }]
        }} options={barOptions} />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold mb-2 flex items-center gap-2">Percentage Contribution to AQI
          <span className="relative group">
            <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-pointer" />
            <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
              Share of each pollutant in the total AQI for the city.
            </span>
          </span>
        </h3>
        <Pie data={{
          labels: pollutants,
          datasets: [{ data: pctData, backgroundColor: POLLUTANT_COLORS }]
        }} />
      </div>
    </div>
  );
} 