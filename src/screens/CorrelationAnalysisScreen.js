import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useNotifications } from '../App';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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
      <h2 className="text-2xl font-bold mb-8 text-center">Correlation Analysis</h2>
      {/* Key Correlations Card */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">Key Correlations <InformationCircleIcon className="w-5 h-5 text-gray-400" title="Pearson and Spearman correlation coefficients" /></h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 dark:bg-blue-900 rounded-xl p-4">
            <div className="font-semibold mb-1">AQI vs Temperature</div>
            <div>Pearson: <span className="font-mono">{correlations.AQI_Temperature.pearson.toFixed(3)}</span></div>
            <div>Spearman: <span className="font-mono">{correlations.AQI_Temperature.spearman.toFixed(3)}</span></div>
          </div>
          <div className="bg-green-50 dark:bg-green-900 rounded-xl p-4">
            <div className="font-semibold mb-1">PM2.5 vs Humidity</div>
            <div>Pearson: <span className="font-mono">{correlations['PM2.5_Humidity'].pearson.toFixed(3)}</span></div>
            <div>Spearman: <span className="font-mono">{correlations['PM2.5_Humidity'].spearman.toFixed(3)}</span></div>
          </div>
        </div>
        <div className="mt-8">
          <div className="font-semibold mb-2 flex items-center gap-2">Wind Speed vs Pollutants <InformationCircleIcon className="w-5 h-5 text-gray-400" title="Correlation of wind speed with each pollutant" /></div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="px-2 py-1">Pollutant</th>
                  <th className="px-2 py-1">Pearson</th>
                  <th className="px-2 py-1">Spearman</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(correlations.WindSpeed_Pollutants).map(([pol, vals]) => (
                  <tr key={pol} className="even:bg-gray-50 dark:even:bg-gray-900">
                    <td className="px-2 py-1 font-semibold">{pol}</td>
                    <td className="px-2 py-1">{vals.pearson.toFixed(3)}</td>
                    <td className="px-2 py-1">{vals.spearman.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Correlation Heatmap Card */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">Correlation Heatmap <InformationCircleIcon className="w-5 h-5 text-gray-400" title="Correlation matrix of all numeric variables (Pearson)" /></h3>
        <div className="overflow-x-auto">
          <Bar data={barData} options={{
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: { x: { min: -1, max: 1 } }
          }} />
        </div>
        <div className="text-xs text-gray-500 mt-2">Note: Values range from -1 (strong negative) to 1 (strong positive correlation).</div>
      </div>
    </div>
  );
} 