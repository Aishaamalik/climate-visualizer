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

const ComparativeAnalysisScreen = () => {
  const [mode, setMode] = useState('city');
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`/api/${mode === 'city' ? 'cities' : 'countries'}`).then(res => {
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
      const res = await axios.post('/api/comparative-analysis', {
        mode,
        selections: selected.map(s => s.value)
      });
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch comparative analysis');
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

  return (
    <div className="flex justify-center items-center min-h-[80vh] bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="w-full max-w-5xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8">
        <h2 className="text-3xl font-bold mb-2 text-blue-900 dark:text-blue-200">Comparative Analysis</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Compare pollution levels, trends, and pollutant composition across multiple cities or countries.</p>
        <div className="flex gap-4 mb-4">
          <button className={`px-4 py-2 rounded font-semibold ${mode === 'city' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`} onClick={() => setMode('city')}>City</button>
          <button className={`px-4 py-2 rounded font-semibold ${mode === 'country' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`} onClick={() => setMode('country')}>Country</button>
        </div>
        <div className="mb-4">
          <label className="block mb-1 font-semibold">Select {mode === 'city' ? 'Cities' : 'Countries'} (2+):</label>
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
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow font-semibold mb-6" onClick={fetchComparative} disabled={selected.length < 2 || loading}>
          {loading ? 'Comparing...' : 'Compare'}
        </button>
        {error && <div className="bg-red-100 text-red-700 rounded p-3 mb-4 text-center font-semibold shadow">{error}</div>}
        {results && (
          <>
            {/* Summary of findings */}
            {best && worst && (
            <div className="mb-8 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl shadow">
              <h3 className="text-lg font-bold mb-2 text-blue-800 dark:text-blue-200">Summary</h3>
              <div className="text-gray-700 dark:text-gray-200">
                <span className="font-semibold">{best[0]}</span> has the <span className="text-green-700 font-semibold">best (lowest)</span> average AQI ({typeof best[1].average_aqi === 'number' ? best[1].average_aqi.toFixed(1) : '-' }), while <span className="font-semibold">{worst[0]}</span> has the <span className="text-red-700 font-semibold">worst (highest)</span> average AQI ({typeof worst[1].average_aqi === 'number' ? worst[1].average_aqi.toFixed(1) : '-'}).
              </div>
            </div>
            )}
            {/* Detailed comparison table */}
            <div className="overflow-x-auto mb-8">
              <table className="min-w-full text-sm text-left border rounded-xl overflow-hidden">
                <thead className="bg-blue-100 dark:bg-blue-900">
                  <tr>
                    <th className="p-2">Name</th>
                    <th className="p-2">Avg AQI</th>
                    <th className="p-2">Max AQI</th>
                    <th className="p-2">Min AQI</th>
                    <th className="p-2">Std Dev</th>
                    <th className="p-2">Dominant Pollutant</th>
                    <th className="p-2">Most Variable Pollutant</th>
                    <th className="p-2">Recent AQI</th>
                    <th className="p-2">Recent Period</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(results).map(([name, r]) => (
                    <tr key={name} className="border-b last:border-0">
                      <td className="p-2 font-semibold">{name}</td>
                      <td className="p-2">{typeof r.average_aqi === 'number' ? r.average_aqi.toFixed(1) : '-'}</td>
                      <td className="p-2">{typeof r.max_aqi === 'number' ? r.max_aqi.toFixed(1) : '-'}</td>
                      <td className="p-2">{typeof r.min_aqi === 'number' ? r.min_aqi.toFixed(1) : '-'}</td>
                      <td className="p-2">{typeof r.std_aqi === 'number' ? r.std_aqi.toFixed(1) : '-'}</td>
                      <td className="p-2">{r.dominant_pollutant || '-'}</td>
                      <td className="p-2">{r.most_variable_pollutant || '-'}</td>
                      <td className="p-2">{typeof r.recent_aqi === 'number' ? r.recent_aqi.toFixed(1) : '-'}</td>
                      <td className="p-2">{r.recent_period || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Average AQI Bar Chart */}
            <div className="mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
              <h3 className="text-lg font-bold mb-2 text-blue-800 dark:text-blue-200">Average AQI</h3>
              <Bar data={barData} options={{responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}} />
            </div>
            {/* Monthly AQI Trend Line Chart */}
            <div className="mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
              <h3 className="text-lg font-bold mb-2 text-blue-800 dark:text-blue-200">Monthly AQI Trend</h3>
              <Line data={{
                labels: lineData ? lineData.labels : [],
                datasets: lineData ? lineData.datasets.map(ds => ({...ds, data: ds.data(lineData.labels)})) : []
              }} options={{responsive:true, plugins:{legend:{position:'top'}}, scales:{y:{beginAtZero:true}}}} />
            </div>
            {/* Pollutant Composition Radar Chart */}
            <div className="mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
              <h3 className="text-lg font-bold mb-2 text-blue-800 dark:text-blue-200">Pollutant Composition</h3>
              <Radar data={radarData} options={{responsive:true, plugins:{legend:{position:'top'}}}} />
            </div>
            {/* Dominant Pollutant List */}
            <div className="mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
              <h3 className="text-lg font-bold mb-2 text-blue-800 dark:text-blue-200">Dominant Pollutant</h3>
              <ul className="list-disc pl-6">
                {Object.entries(results).map(([name, r]) => (
                  <li key={name}><span className="font-semibold">{name}:</span> {r.dominant_pollutant}</li>
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