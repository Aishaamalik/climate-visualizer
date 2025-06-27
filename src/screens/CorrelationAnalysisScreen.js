import React, { useEffect, useState } from 'react';
import { Bar, Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement } from 'chart.js';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useNotifications } from '../App';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement);

// Helper to sample and jitter points
function sampleAndJitter(xArr, yArr, maxPoints = 500, jitter = 0.5) {
  let idxs = Array.from({ length: xArr.length }, (_, i) => i);
  if (xArr.length > maxPoints) {
    idxs = idxs.sort(() => 0.5 - Math.random()).slice(0, maxPoints);
  }
  return idxs.map(i => ({
    x: xArr[i] + (Math.random() - 0.5) * jitter,
    y: yArr[i] + (Math.random() - 0.5) * jitter
  }));
}

export default function CorrelationAnalysisScreen() {
  const [correlations, setCorrelations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addNotification } = useNotifications();

  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/correlation-analysis')
      .then(res => res.json())
      .then(data => {
        setCorrelations(data);
        setLoading(false);
        addNotification({
          title: 'Correlation Analysis',
          message: 'Correlation analysis data loaded successfully.',
          time: new Date().toLocaleString()
        });
      })
      .catch(() => {
        setError('Failed to fetch correlation analysis.');
        setLoading(false);
        addNotification({
          title: 'Correlation Analysis',
          message: 'Failed to load correlation analysis data.',
          time: new Date().toLocaleString()
        });
      });
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-400 animate-pulse">Loading correlation analysis...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!correlations) return <div className="p-8 text-center text-gray-400">No correlation data available.</div>;

  // Prepare heatmap data for chartjs
  const heatmapLabels = Object.keys(correlations.correlation_heatmap);
  const heatmapData = heatmapLabels.map(row => heatmapLabels.map(col => correlations.correlation_heatmap[row][col]));

  // For heatmap, use a bar chart for simplicity (or replace with a heatmap lib if available)
  // Show only upper triangle for clarity
  const barData = {
    labels: heatmapLabels,
    datasets: heatmapLabels.map((row, i) => ({
      label: row,
      data: heatmapData[i],
      backgroundColor: `rgba(25, 118, 210, 0.2)`
    }))
  };

  return (
    <div className="max-w-5xl mx-auto p-2 md:p-6">
      <h2 className="text-2xl font-bold mb-8 text-center text-gray-900 dark:text-white">Correlation Analysis</h2>
      {/* Key Correlations Card */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">Key Correlations <InformationCircleIcon className="w-5 h-5 text-gray-400" title="Pearson and Spearman correlation coefficients" /></h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 dark:bg-blue-900 rounded-xl p-4">
            <div className="font-semibold mb-1 text-gray-900 dark:text-white">AQI vs Temperature</div>
            <div className="text-gray-800 dark:text-white">Pearson: <span className="font-mono">{correlations.AQI_Temperature.pearson.toFixed(3)}</span></div>
            <div className="text-gray-800 dark:text-white">Spearman: <span className="font-mono">{correlations.AQI_Temperature.spearman.toFixed(3)}</span></div>
          </div>
          <div className="bg-green-50 dark:bg-green-900 rounded-xl p-4">
            <div className="font-semibold mb-1 text-gray-900 dark:text-white">PM2.5 vs Humidity</div>
            <div className="text-gray-800 dark:text-white">Pearson: <span className="font-mono">{correlations['PM2.5_Humidity'].pearson.toFixed(3)}</span></div>
            <div className="text-gray-800 dark:text-white">Spearman: <span className="font-mono">{correlations['PM2.5_Humidity'].spearman.toFixed(3)}</span></div>
          </div>
        </div>
        <div className="mt-8">
          <div className="font-semibold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">Wind Speed vs Pollutants <InformationCircleIcon className="w-5 h-5 text-gray-400" title="Correlation of wind speed with each pollutant" /></div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="px-2 py-1 text-gray-900 dark:text-white">Pollutant</th>
                  <th className="px-2 py-1 text-gray-900 dark:text-white">Pearson</th>
                  <th className="px-2 py-1 text-gray-900 dark:text-white">Spearman</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(correlations.WindSpeed_Pollutants).map(([pol, vals]) => (
                  <tr key={pol} className="even:bg-gray-50 dark:even:bg-gray-900">
                    <td className="px-2 py-1 font-semibold text-gray-900 dark:text-white">{pol}</td>
                    <td className="px-2 py-1 text-gray-800 dark:text-white">{vals.pearson.toFixed(3)}</td>
                    <td className="px-2 py-1 text-gray-800 dark:text-white">{vals.spearman.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Correlation Heatmap Card */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">Correlation Heatmap <InformationCircleIcon className="w-5 h-5 text-gray-400" title="Correlation matrix of all numeric variables (Pearson)" /></h3>
        <div className="overflow-x-auto">
          <Bar data={barData} options={{
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: { x: { min: -1, max: 1 } }
          }} />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-200 mt-2">Note: Values range from -1 (strong negative) to 1 (strong positive correlation).</div>
      </div>
      {/* Scatterplots Section */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">Interactive Scatterplots <InformationCircleIcon className="w-5 h-5 text-gray-400" title="Scatterplots with regression lines for each key pair" /></h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* AQI vs Temperature */}
          <div>
            <div className="font-semibold mb-2 text-gray-900 dark:text-white">AQI vs Temperature</div>
            <Scatter
              data={{
                datasets: [
                  {
                    label: 'Data',
                    data: sampleAndJitter(correlations.AQI_Temperature.scatter.x, correlations.AQI_Temperature.scatter.y),
                    backgroundColor: 'rgba(25, 118, 210, 0.3)',
                    pointRadius: 2,
                    pointHoverRadius: 4,
                  },
                  correlations.AQI_Temperature.scatter.slope !== null && {
                    label: 'Regression',
                    type: 'line',
                    data: [
                      { x: Math.min(...correlations.AQI_Temperature.scatter.x), y: correlations.AQI_Temperature.scatter.slope * Math.min(...correlations.AQI_Temperature.scatter.x) + correlations.AQI_Temperature.scatter.intercept },
                      { x: Math.max(...correlations.AQI_Temperature.scatter.x), y: correlations.AQI_Temperature.scatter.slope * Math.max(...correlations.AQI_Temperature.scatter.x) + correlations.AQI_Temperature.scatter.intercept },
                    ],
                    borderColor: 'rgba(255, 99, 132, 0.8)',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0,
                  },
                ].filter(Boolean),
              }}
              options={{
                plugins: { legend: { display: false }, tooltip: { mode: 'nearest', intersect: false } },
                scales: { x: { title: { display: true, text: 'Temperature (°C)' }, grid: { color: 'rgba(200,200,200,0.2)' } }, y: { title: { display: true, text: 'AQI' }, grid: { color: 'rgba(200,200,200,0.2)' } } },
                elements: { point: { radius: 2, backgroundColor: 'rgba(25, 118, 210, 0.3)' } },
                maintainAspectRatio: false,
              }}
              height={220}
            />
            <div className="text-xs text-gray-500 dark:text-gray-200 mt-1">R²: {correlations.AQI_Temperature.scatter.r2?.toFixed(3) ?? 'N/A'}</div>
          </div>
          {/* PM2.5 vs Humidity */}
          <div>
            <div className="font-semibold mb-2 text-gray-900 dark:text-white">PM2.5 vs Humidity</div>
            <Scatter
              data={{
                datasets: [
                  {
                    label: 'Data',
                    data: sampleAndJitter(correlations['PM2.5_Humidity'].scatter.x, correlations['PM2.5_Humidity'].scatter.y),
                    backgroundColor: 'rgba(67, 160, 71, 0.3)',
                    pointRadius: 2,
                    pointHoverRadius: 4,
                  },
                  correlations['PM2.5_Humidity'].scatter.slope !== null && {
                    label: 'Regression',
                    type: 'line',
                    data: [
                      { x: Math.min(...correlations['PM2.5_Humidity'].scatter.x), y: correlations['PM2.5_Humidity'].scatter.slope * Math.min(...correlations['PM2.5_Humidity'].scatter.x) + correlations['PM2.5_Humidity'].scatter.intercept },
                      { x: Math.max(...correlations['PM2.5_Humidity'].scatter.x), y: correlations['PM2.5_Humidity'].scatter.slope * Math.max(...correlations['PM2.5_Humidity'].scatter.x) + correlations['PM2.5_Humidity'].scatter.intercept },
                    ],
                    borderColor: 'rgba(255, 193, 7, 0.8)',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0,
                  },
                ].filter(Boolean),
              }}
              options={{
                plugins: { legend: { display: false }, tooltip: { mode: 'nearest', intersect: false } },
                scales: { x: { title: { display: true, text: 'Humidity (%)' }, grid: { color: 'rgba(200,200,200,0.2)' } }, y: { title: { display: true, text: 'PM2.5 (µg/m³)' }, grid: { color: 'rgba(200,200,200,0.2)' } } },
                elements: { point: { radius: 2, backgroundColor: 'rgba(67, 160, 71, 0.3)' } },
                maintainAspectRatio: false,
              }}
              height={220}
            />
            <div className="text-xs text-gray-500 dark:text-gray-200 mt-1">R²: {correlations['PM2.5_Humidity'].scatter.r2?.toFixed(3) ?? 'N/A'}</div>
          </div>
        </div>
        {/* Wind Speed vs Pollutants Scatterplots */}
        <div className="mt-8">
          <div className="font-semibold mb-2 text-gray-900 dark:text-white">Wind Speed vs Pollutants</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(correlations.WindSpeed_Pollutants).map(([pol, vals]) => (
              <div key={pol}>
                <div className="text-sm font-semibold mb-1 text-gray-900 dark:text-white">{pol}</div>
                <Scatter
                  data={{
                    datasets: [
                      {
                        label: 'Data',
                        data: sampleAndJitter(vals.scatter.x, vals.scatter.y),
                        backgroundColor: 'rgba(30, 136, 229, 0.3)',
                        pointRadius: 2,
                        pointHoverRadius: 4,
                      },
                      vals.scatter.slope !== null && {
                        label: 'Regression',
                        type: 'line',
                        data: [
                          { x: Math.min(...vals.scatter.x), y: vals.scatter.slope * Math.min(...vals.scatter.x) + vals.scatter.intercept },
                          { x: Math.max(...vals.scatter.x), y: vals.scatter.slope * Math.max(...vals.scatter.x) + vals.scatter.intercept },
                        ],
                        borderColor: 'rgba(233, 30, 99, 0.8)',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0,
                      },
                    ].filter(Boolean),
                  }}
                  options={{
                    plugins: { legend: { display: false }, tooltip: { mode: 'nearest', intersect: false } },
                    scales: { x: { title: { display: true, text: 'Wind Speed (m/s)' }, grid: { color: 'rgba(200,200,200,0.2)' } }, y: { title: { display: true, text: pol }, grid: { color: 'rgba(200,200,200,0.2)' } } },
                    elements: { point: { radius: 2, backgroundColor: 'rgba(30, 136, 229, 0.3)' } },
                    maintainAspectRatio: false,
                  }}
                  height={180}
                />
                <div className="text-xs text-gray-500 dark:text-gray-200 mt-1">R²: {vals.scatter.r2?.toFixed(3) ?? 'N/A'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Time-lag Correlations Section */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">Time-lag Correlations <InformationCircleIcon className="w-5 h-5 text-gray-400" title="Correlation of AQI with lagged weather variables (1-5 days)" /></h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="px-2 py-1 text-gray-900 dark:text-white">Variable</th>
                {Object.keys(correlations.time_lag_correlations['Temperature (°C)']).map(lag => (
                  <th key={lag} className="px-2 py-1 text-gray-900 dark:text-white">Lag {lag}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(correlations.time_lag_correlations).map(([varName, lags]) => (
                <tr key={varName} className="even:bg-gray-50 dark:even:bg-gray-900">
                  <td className="px-2 py-1 font-semibold text-gray-900 dark:text-white">{varName}</td>
                  {Object.values(lags).map((corr, i) => (
                    <td key={i} className="px-2 py-1 text-gray-800 dark:text-white">{corr !== null ? corr.toFixed(3) : 'N/A'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-200 mt-2">Shows how weather from previous days affects AQI today.</div>
      </div>
      {/* Partial Correlation Table */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">Partial Correlations <InformationCircleIcon className="w-5 h-5 text-gray-400" title="Correlation of AQI with each weather variable, controlling for the others" /></h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="px-2 py-1 text-gray-900 dark:text-white">Variable</th>
                <th className="px-2 py-1 text-gray-900 dark:text-white">Partial Correlation</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(correlations.partial_correlations).map(([varName, val]) => (
                <tr key={varName} className="even:bg-gray-50 dark:even:bg-gray-900">
                  <td className="px-2 py-1 font-semibold text-gray-900 dark:text-white">{varName}</td>
                  <td className="px-2 py-1 text-gray-800 dark:text-white">{val !== null ? val.toFixed(3) : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-200 mt-2">Controls for other weather variables.</div>
      </div>
    </div>
  );
} 