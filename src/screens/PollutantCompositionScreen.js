import React, { useEffect, useState, useRef } from 'react';
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
import { InformationCircleIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline';
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

const HEALTH_ICONS = {
  asthma: '🫁',
  'lung cancer': '🎗️',
  'heart disease': '❤️',
  'respiratory issues': '😮‍💨',
  'lung irritation': '😤',
  bronchitis: '🤧',
  headache: '🤕',
  'lung function decline': '📉',
};
const SOURCE_ICONS = {
  traffic: '🚗',
  industry: '🏭',
  'residential burning': '🏠',
  construction: '🚧',
  'road dust': '🛣️',
  'power plants': '⚡',
  'secondary formation': '🔄',
};

export default function PollutantCompositionScreen() {
  // Old data for summary and static charts
  const [data, setData] = useState({});
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // New data for time-lapse
  const [timelapseData, setTimelapseData] = useState({});
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [playing, setPlaying] = useState(false);
  const playRef = useRef();
  const { addNotification } = useNotifications();

  // Fetch old data for summary/static charts
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

  // Fetch new data for time-lapse
  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/pollutant-composition-timelapse')
      .then(res => res.json())
      .then(d => {
        setTimelapseData(d);
        // Only set months/city if not already set by old data
        if (!selectedCity && Object.keys(d).length > 0) {
          setSelectedCity(Object.keys(d)[0]);
        }
        if (selectedCity && d[selectedCity]) {
          const monthList = Object.keys(d[selectedCity].monthly).sort();
          setMonths(monthList);
          setSelectedMonth(monthList[0] || '');
        }
      });
  }, [selectedCity]);

  // Handle play/pause animation
  useEffect(() => {
    if (playing && months.length > 1) {
      playRef.current = setInterval(() => {
        setSelectedMonth(prev => {
          const idx = months.indexOf(prev);
          return months[(idx + 1) % months.length];
        });
      }, 1200);
    } else {
      clearInterval(playRef.current);
    }
    return () => clearInterval(playRef.current);
  }, [playing, months]);

  useEffect(() => { setPlaying(false); }, [selectedCity]);

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

  // --- Old summary and static charts ---
  const cityData = data[selectedCity];
  const pollutants = cityData ? Object.keys(cityData) : [];
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

  // --- New time-lapse section ---
  const cityTimelapse = timelapseData[selectedCity]?.monthly || {};
  const monthData = cityTimelapse[selectedMonth] || {};
  const timePollutants = Object.keys(monthData);
  const timePctData = timePollutants.map(p => monthData[p].percentage_contribution);
  // New: collect health, sources, dominant source for each pollutant
  const timeHealthRisks = timePollutants.map(p => monthData[p]?.health_risks || []);
  const timeSources = timePollutants.map(p => monthData[p]?.sources || []);
  const timeDominantSource = timePollutants.map(p => monthData[p]?.dominant_source || null);
  const barData = {
    labels: ['Pollutant Composition'],
    datasets: timePollutants.map((pol, i) => ({
      label: pol,
      data: [timePctData[i]],
      backgroundColor: POLLUTANT_COLORS[i % POLLUTANT_COLORS.length],
      healthRisks: timeHealthRisks[i],
      sources: timeSources[i],
      dominantSource: timeDominantSource[i]
    }))
  };
  const barOptionsTime = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          generateLabels: chart => {
            const ds = chart.data.datasets;
            return ds.map((d, i) => ({
              text: `${d.label}  ${d.healthRisks.map(r => HEALTH_ICONS[r] || '').join(' ')}  ${d.sources.map(s => SOURCE_ICONS[s] || '').join(' ')}${d.dominantSource ? `  ⭐${SOURCE_ICONS[d.dominantSource] || d.dominantSource}` : ''}`.trim(),
              fillStyle: d.backgroundColor,
              strokeStyle: d.backgroundColor,
              index: i
            }));
          }
        }
      },
      tooltip: {
        callbacks: {
          label: ctx => {
            const d = ctx.dataset;
            let label = `${d.label}: ${ctx.parsed.y?.toFixed(1)}%`;
            if (d.healthRisks?.length) label += ` | Health: ${d.healthRisks.map(r => HEALTH_ICONS[r] || r).join(' ')}`;
            if (d.sources?.length) label += ` | Sources: ${d.sources.map(s => SOURCE_ICONS[s] || s).join(' ')}`;
            if (d.dominantSource) label += ` | Dominant Source: ${SOURCE_ICONS[d.dominantSource] || d.dominantSource}`;
            return label;
          }
        }
      },
      title: { display: false }
    },
    indexAxis: 'y',
    scales: {
      x: { stacked: true, min: 0, max: 100, title: { display: true, text: '% of AQI' } },
      y: { stacked: true }
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-2 md:p-6">
      <h2 className="text-2xl font-bold mb-8 text-center dark:text-white">Pollutant Composition Analysis</h2>
      {/* City Selector Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8 flex flex-col md:flex-row items-center gap-6">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <InformationCircleIcon className="w-6 h-6 text-blue-400" />
          <label htmlFor="city-select" className="font-semibold text-gray-700 dark:text-white">Select City:</label>
          <select
            id="city-select"
            className="p-3 rounded-lg border dark:bg-gray-900 dark:border-gray-700 min-w-[200px]"
            value={selectedCity}
            onChange={e => {
              setSelectedCity(e.target.value);
              // Update months for time-lapse
              const monthList = Object.keys(timelapseData[e.target.value]?.monthly || {}).sort();
              setMonths(monthList);
              setSelectedMonth(monthList[0] || '');
            }}
          >
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="flex flex-col items-start bg-blue-50 dark:bg-blue-900 rounded-2xl shadow-lg p-6 border-t-4 border-blue-500">
          <div className="bg-blue-100 dark:bg-blue-800 p-3 rounded-full mb-4"><InformationCircleIcon className="w-7 h-7 text-blue-600 dark:text-blue-300" /></div>
          <div className="text-lg font-bold mb-1 flex items-center gap-1 dark:text-white">{dominantPollutant}
            <span className="relative group">
              <InformationCircleIcon className="w-4 h-4 text-blue-400 cursor-pointer" />
              <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                {POLLUTANT_INFO[dominantPollutant]}
              </span>
            </span>
          </div>
          <div className="text-blue-700 dark:text-blue-200 font-semibold text-xl">{dominantPct?.toFixed(1)}%</div>
          <div className="text-xs text-gray-500 dark:text-white mt-2">Dominant Pollutant</div>
        </div>
        <div className="flex flex-col items-start bg-green-50 dark:bg-green-900 rounded-2xl shadow-lg p-6 border-t-4 border-green-500">
          <div className="bg-green-100 dark:bg-green-800 p-3 rounded-full mb-4"><InformationCircleIcon className="w-7 h-7 text-green-600 dark:text-green-300" /></div>
          <div className="text-lg font-bold mb-1 dark:text-white">{totalAQI?.toFixed(1)}</div>
          <div className="text-green-700 dark:text-green-200 font-semibold text-xl">AQI Units</div>
          <div className="text-xs text-gray-500 dark:text-white mt-2">Total Avg Pollutants</div>
        </div>
        <div className="flex flex-col items-start bg-red-50 dark:bg-red-900 rounded-2xl shadow-lg p-6 border-t-4 border-red-500">
          <div className="bg-red-100 dark:bg-red-800 p-3 rounded-full mb-4"><InformationCircleIcon className="w-7 h-7 text-red-600 dark:text-red-300" /></div>
          <div className="text-lg font-bold mb-1 flex items-center gap-1 dark:text-white">{highestPollutant}
            <span className="relative group">
              <InformationCircleIcon className="w-4 h-4 text-red-400 cursor-pointer" />
              <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                {POLLUTANT_INFO[highestPollutant]}
              </span>
            </span>
          </div>
          <div className="text-red-700 dark:text-red-200 font-semibold text-xl">{highestValue?.toFixed(1)}</div>
          <div className="text-xs text-gray-500 dark:text-white mt-2">Highest Pollutant Value</div>
        </div>
      </div>
      {/* Average Pollutant Values Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-semibold dark:text-white">Average Pollutant Values</h3>
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
          <h3 className="font-semibold dark:text-white">Max Pollutant Values</h3>
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
          <h3 className="font-semibold dark:text-white">Percentage Contribution to AQI</h3>
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
      {/* --- New Time-lapse Animation Section --- */}
      <h2 className="text-2xl font-bold mb-8 text-center dark:text-white">Pollutant Composition Time-lapse</h2>
      {/* Time-lapse Controls */}
      <div className="flex items-center gap-4 mb-6">
        <button
          className={`px-4 py-2 rounded-lg font-semibold shadow transition-colors ${playing ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-white'}`}
          onClick={() => setPlaying(p => !p)}
        >
          {playing ? <PauseIcon className="w-5 h-5 inline mr-1" /> : <PlayIcon className="w-5 h-5 inline mr-1" />}
          {playing ? 'Pause' : 'Play'}
        </button>
        <input
          type="range"
          min={0}
          max={months.length - 1}
          value={months.indexOf(selectedMonth)}
          onChange={e => setSelectedMonth(months[+e.target.value])}
          className="w-64"
        />
        <span className="font-mono text-sm text-gray-700 dark:text-white">{selectedMonth}</span>
      </div>
      {/* Stacked Bar Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
        <Bar data={barData} options={barOptionsTime} height={120} />
        {/* Icon Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm dark:text-white">
          <div className="flex items-center gap-2"><span className="font-bold dark:text-white">Health:</span>
            {Object.entries(HEALTH_ICONS).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1" title={k}>{v} <span className="text-xs text-gray-500 dark:text-white">{k}</span></span>
            ))}
          </div>
          <div className="flex items-center gap-2"><span className="font-bold dark:text-white">Sources:</span>
            {Object.entries(SOURCE_ICONS).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1" title={k}>{v} <span className="text-xs text-gray-500 dark:text-white">{k}</span></span>
            ))}
          </div>
          <div className="flex items-center gap-2"><span className="font-bold dark:text-white">⭐</span><span className="text-xs text-gray-500 dark:text-white">Dominant Source</span></div>
        </div>
      </div>
    </div>
  );
} 