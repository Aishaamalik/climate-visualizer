import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { Bar, Radar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import MapSection from '../components/MapSection';
import { useNotifications } from '../App';

const BASE_URL = 'https://<your-backend-name>.onrender.com/api'; // TODO: Replace <your-backend-name> with your actual Render backend name

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend
);

const CLUSTER_COLORS = [
  '#1976d2', '#e57373', '#43a047', '#ffb300', '#8e24aa', '#00838f'
];

const ComparativeAnalysisScreen = () => {
  const [mode, setMode] = useState('city');
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [benchmark, setBenchmark] = useState(null);
  const [k, setK] = useState(3);
  const { addNotification } = useNotifications();

  useEffect(() => {
    axios.get(`${BASE_URL}/${mode === 'city' ? 'cities' : 'countries'}`).then(res => {
      // Defensive: always map to { value, label }
      const opts = Array.isArray(res.data)
        ? res.data.map(opt => (typeof opt === 'object' && opt.value && opt.label ? opt : { value: opt, label: opt }))
        : [];
      setOptions(opts);
    });
    setSelected([]);
    setResults(null);
  }, [mode]);

  const fetchComparative = async () => {
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const res = await axios.post(`${BASE_URL}/comparative-analysis`, {
        mode,
        selections: selected.map(s => s.value),
        benchmark: benchmark,
        k: k
      });
      setResults(res.data);
      addNotification({
        title: 'Comparative Analysis',
        message: 'Comparative analysis data loaded successfully.',
        time: new Date().toLocaleString()
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch comparative analysis');
      addNotification({
        title: 'Comparative Analysis',
        message: 'Failed to load comparative analysis data.',
        time: new Date().toLocaleString()
      });
    }
    setLoading(false);
  };

  // Prepare chart data
  const barData = results ? {
    labels: Object.keys(results),
    datasets: [
      {
        label: 'Average AQI',
        data: Object.values(results).map(r => r.average_aqi),
        backgroundColor: 'rgba(37,99,235,0.7)',
      }
    ]
  } : null;

  const radarData = results ? {
    labels: results && Object.values(results)[0] ? Object.values(results)[0].pollutant_composition && Object.keys(Object.values(results)[0].pollutant_composition) : [],
    datasets: Object.entries(results).map(([name, r], i) => ({
      label: name,
      data: Object.values(r.pollutant_composition),
      backgroundColor: `rgba(${37 + i*40},99,235,0.2)`,
      borderColor: `rgba(${37 + i*40},99,235,1)`,
      pointBackgroundColor: `rgba(${37 + i*40},99,235,1)`
    }))
  } : null;

  // Prepare line chart data for monthly and yearly trends
  const lineData = results ? {
    labels: (() => {
      // Use all unique year-months from all selections
      const allMonths = new Set();
      Object.values(results).forEach(r => r.monthly_trend.forEach(m => allMonths.add(`${m.Year}-${String(m.Month).padStart(2, '0')}`)));
      return Array.from(allMonths).sort();
    })(),
    datasets: Object.entries(results).map(([name, r], i) => ({
      label: name,
      data: lineDataLabels => lineDataLabels.map(label => {
        const found = r.monthly_trend.find(m => `${m.Year}-${String(m.Month).padStart(2, '0')}` === label);
        return found ? found.AQI : null;
      }),
      borderColor: `rgba(${37 + i*40},99,235,1)`,
      backgroundColor: `rgba(${37 + i*40},99,235,0.1)`,
      tension: 0.3,
      pointRadius: 2,
      fill: false,
    }))
  } : null;

  // Find best/worst air quality (skip if no valid data)
  const validResults = results ? Object.entries(results).filter(([_, r]) => typeof r.average_aqi === 'number' && !isNaN(r.average_aqi)) : [];
  const best = validResults.length ? validResults.reduce((a, b) => (a[1].average_aqi < b[1].average_aqi ? a : b)) : null;
  const worst = validResults.length ? validResults.reduce((a, b) => (a[1].average_aqi > b[1].average_aqi ? a : b)) : null;

  // Prepare cityMarkers for map
  const cityMarkers = results && mode === 'city' ? Object.entries(results).map(([name, r]) => ({
    name,
    lat: r.coordinates?.lat,
    lon: r.coordinates?.lon,
    aqi: r.average_aqi,
    cluster: r.cluster
  })).filter(m => m.lat && m.lon) : [];

  return (
    <div className="flex justify-center items-center min-h-[80vh] bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="w-full max-w-5xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8">
        <h2 className="text-3xl font-bold mb-2 text-blue-900 dark:text-white">Comparative Analysis</h2>
        <p className="text-gray-600 dark:text-white mb-6">Compare pollution levels, trends, and pollutant composition across multiple cities or countries.</p>
        <div className="flex gap-4 mb-4">
          <button className={`px-4 py-2 rounded font-semibold ${mode === 'city' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white'}`} onClick={() => setMode('city')}>City</button>
          <button className={`px-4 py-2 rounded font-semibold ${mode === 'country' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white'}`} onClick={() => setMode('country')}>Country</button>
        </div>
        <div className="mb-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1">
            <label className="block mb-1 font-semibold text-gray-700 dark:text-white">Select {mode === 'city' ? 'Cities' : 'Countries'} (2+):</label>
            <Select
              isMulti
              options={options}
              value={selected}
              onChange={setSelected}
              classNamePrefix="react-select"
              placeholder={`Select ${mode === 'city' ? 'cities' : 'countries'}...`}
              styles={{
                control: (base) => ({ ...base, minHeight: 48, borderRadius: 8 }),
                menu: (base) => ({ ...base, zIndex: 9999 }),
              }}
            />
          </div>
          {mode === 'city' && (
            <div className="flex flex-col gap-2">
              <label className="block font-semibold text-gray-700 dark:text-white">Benchmark City:</label>
              <select
                className="p-2 rounded border dark:bg-gray-900 dark:border-gray-700 text-gray-700 dark:text-white"
                value={benchmark || ''}
                onChange={e => setBenchmark(e.target.value || null)}
              >
                <option value="">None</option>
                {selected.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <label className="block font-semibold mt-2 text-gray-700 dark:text-white">Clusters (k):</label>
              <input
                type="number"
                min={2}
                max={6}
                value={k}
                onChange={e => setK(Number(e.target.value))}
                className="p-2 rounded border dark:bg-gray-900 dark:border-gray-700 w-20 text-gray-700 dark:text-white"
              />
            </div>
          )}
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow font-semibold mb-6" onClick={fetchComparative} disabled={selected.length < 2 || loading}>
          {loading ? 'Comparing...' : 'Compare'}
        </button>
        {error && <div className="bg-red-100 text-red-700 rounded p-3 mb-4 text-center font-semibold shadow dark:text-white">{error}</div>}
        {/* Map View */}
        {mode === 'city' && cityMarkers.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-2 text-blue-800 dark:text-white">Map View</h3>
            <MapSection data={cityMarkers.map(m => ({
              City: m.name,
              AQI: m.aqi,
              coordinates: [m.lat, m.lon],
              cluster: m.cluster
            }))} />
            {/* Cluster Legend */}
            {Object.values(results).some(r => r.cluster !== undefined) && (
              <div className="flex gap-4 mt-2">
                <span className="font-semibold text-gray-700 dark:text-white">Cluster Legend:</span>
                {Array.from(new Set(cityMarkers.map(m => m.cluster))).sort().map(c => (
                  <span key={c} className="flex items-center gap-1 text-gray-700 dark:text-white"><span style={{background: CLUSTER_COLORS[c % CLUSTER_COLORS.length], width: 16, height: 16, borderRadius: '50%', display: 'inline-block'}}></span>Cluster {c+1}</span>
                ))}
              </div>
            )}
          </div>
        )}
        {results && (
          <>
            {/* Summary of findings */}
            {best && worst && (
            <div className="mb-8 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl shadow">
              <h3 className="text-lg font-bold mb-2 text-blue-800 dark:text-white">Summary</h3>
              <div className="text-gray-700 dark:text-white">
                <span className="font-semibold">{best[0]}</span> has the <span className="text-green-700 dark:text-green-200 font-semibold">best (lowest)</span> average AQI ({typeof best[1].average_aqi === 'number' ? best[1].average_aqi.toFixed(1) : '-' }), while <span className="font-semibold">{worst[0]}</span> has the <span className="text-red-700 dark:text-red-200 font-semibold">worst (highest)</span> average AQI ({typeof worst[1].average_aqi === 'number' ? worst[1].average_aqi.toFixed(1) : '-'}).
              </div>
            </div>
            )}
            {/* Detailed comparison table */}
            <div className="overflow-x-auto mb-8">
              <table className="min-w-full text-sm text-left border rounded-xl overflow-hidden">
                <thead className="bg-blue-100 dark:bg-blue-900">
                  <tr>
                    <th className="p-2 text-gray-700 dark:text-white">Name</th>
                    <th className="p-2 text-gray-700 dark:text-white">Avg AQI</th>
                    <th className="p-2 text-gray-700 dark:text-white">Max AQI</th>
                    <th className="p-2 text-gray-700 dark:text-white">Min AQI</th>
                    <th className="p-2 text-gray-700 dark:text-white">Std Dev</th>
                    <th className="p-2 text-gray-700 dark:text-white">Dominant Pollutant</th>
                    <th className="p-2 text-gray-700 dark:text-white">Most Variable Pollutant</th>
                    <th className="p-2 text-gray-700 dark:text-white">Recent AQI</th>
                    <th className="p-2 text-gray-700 dark:text-white">Recent Period</th>
                    {mode === 'city' && Object.values(results).some(r => r.cluster !== undefined) && <th className="p-2 text-gray-700 dark:text-white">Cluster</th>}
                    {mode === 'city' && benchmark && <th className="p-2 text-gray-700 dark:text-white">AQI Δ vs {benchmark}</th>}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(results).map(([name, r]) => (
                    <tr key={name} className="border-b last:border-0">
                      <td className="p-2 font-semibold text-gray-700 dark:text-white">{name}</td>
                      <td className="p-2 text-gray-700 dark:text-white">{typeof r.average_aqi === 'number' ? r.average_aqi.toFixed(1) : '-'}</td>
                      <td className="p-2 text-gray-700 dark:text-white">{typeof r.max_aqi === 'number' ? r.max_aqi.toFixed(1) : '-'}</td>
                      <td className="p-2 text-gray-700 dark:text-white">{typeof r.min_aqi === 'number' ? r.min_aqi.toFixed(1) : '-'}</td>
                      <td className="p-2 text-gray-700 dark:text-white">{typeof r.std_aqi === 'number' ? r.std_aqi.toFixed(1) : '-'}</td>
                      <td className="p-2 text-gray-700 dark:text-white">{r.dominant_pollutant || '-'}</td>
                      <td className="p-2 text-gray-700 dark:text-white">{r.most_variable_pollutant || '-'}</td>
                      <td className="p-2 text-gray-700 dark:text-white">{typeof r.recent_aqi === 'number' ? r.recent_aqi.toFixed(1) : '-'}</td>
                      <td className="p-2 text-gray-700 dark:text-white">{r.recent_period || '-'}</td>
                      {mode === 'city' && r.cluster !== undefined && <td className="p-2 text-gray-700 dark:text-white"><span style={{background: CLUSTER_COLORS[r.cluster % CLUSTER_COLORS.length], color: '#fff', padding: '2px 8px', borderRadius: 8}}>{r.cluster + 1}</span></td>}
                      {mode === 'city' && benchmark && r.benchmark_comparison && <td className="p-2 text-gray-700 dark:text-white">{typeof r.benchmark_comparison.aqi_diff === 'number' ? r.benchmark_comparison.aqi_diff.toFixed(1) : '-'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Average AQI Bar Chart */}
            <div className="mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
              <h3 className="text-lg font-bold mb-2 text-blue-800 dark:text-white">Average AQI</h3>
              <Bar data={barData} options={{responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}} />
            </div>
            {/* Monthly AQI Trend Line Chart */}
            <div className="mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
              <h3 className="text-lg font-bold mb-2 text-blue-800 dark:text-white">Monthly AQI Trend</h3>
              <Line data={{
                labels: lineData ? lineData.labels : [],
                datasets: lineData ? lineData.datasets.map(ds => ({...ds, data: ds.data(lineData.labels)})) : []
              }} options={{responsive:true, plugins:{legend:{position:'top'}}, scales:{y:{beginAtZero:true}}}} />
            </div>
            {/* Pollutant Composition Radar Chart */}
            <div className="mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
              <h3 className="text-lg font-bold mb-2 text-blue-800 dark:text-white">Pollutant Composition</h3>
              <Radar data={radarData} options={{responsive:true, plugins:{legend:{position:'top'}}}} />
            </div>
            {/* Dominant Pollutant List */}
            <div className="mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
              <h3 className="text-lg font-bold mb-2 text-blue-800 dark:text-white">Dominant Pollutant</h3>
              <ul className="list-disc pl-6">
                {Object.entries(results).map(([name, r]) => (
                  <li key={name} className="text-gray-700 dark:text-white"><span className="font-semibold">{name}:</span> {r.dominant_pollutant}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ComparativeAnalysisScreen; 