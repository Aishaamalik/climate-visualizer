import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function getAQIColor(aqi) {
  if (aqi == null) return 'bg-gray-300 text-gray-700';
  if (aqi <= 50) return 'bg-green-100 text-green-800';
  if (aqi <= 100) return 'bg-yellow-100 text-yellow-800';
  if (aqi <= 150) return 'bg-orange-100 text-orange-800';
  if (aqi <= 200) return 'bg-red-100 text-red-800';
  return 'bg-purple-100 text-purple-800';
}

function getTrendIcon(trend) {
  if (trend === 'up') return <ArrowTrendingUpIcon className="w-5 h-5 inline-block mr-1 text-red-600" title="AQI rising" />;
  if (trend === 'down') return <ArrowTrendingDownIcon className="w-5 h-5 inline-block mr-1 text-green-600" title="AQI improving" />;
  return <MinusIcon className="w-5 h-5 inline-block mr-1 text-gray-500" title="Stable" />;
}

export default function ChartSection({ data, pollutant, city }) {
  if (!data || data.length === 0) {
    return <div className="text-gray-400 dark:text-gray-500">No data to display.</div>;
  }

  // Only show the last 30 data points for clarity
  const trimmedData = data.slice(-30);
  const labels = trimmedData.map(d => d.Date);
  const aqiData = trimmedData.map(d => d.AQI);
  const pollutantData = pollutant ? trimmedData.map(d => d[pollutant]) : [];

  // Summary info
  const latest = trimmedData[trimmedData.length - 1];
  const prev = trimmedData[trimmedData.length - 2];
  const trend = latest && prev ? (latest.AQI > prev.AQI ? 'up' : latest.AQI < prev.AQI ? 'down' : 'stable') : 'stable';

  const chartData = {
    labels,
    datasets: [
      {
        label: 'AQI',
        data: aqiData,
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.08)',
        yAxisID: 'y',
        tension: 0.4, // smooth the line
        pointRadius: 3,
        fill: true,
      },
      ...(pollutant ? [{
        label: pollutant,
        data: pollutantData,
        borderColor: '#e57373',
        backgroundColor: 'rgba(229, 115, 115, 0.08)',
        yAxisID: 'y1',
        tension: 0.4,
        pointRadius: 3,
        fill: false,
      }] : [])
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 18, font: { size: 13 } } },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y != null) label += context.parsed.y;
            if (context.dataset.label === 'AQI') label += ' (AQI)';
            if (pollutant && context.dataset.label === pollutant) label += ` (${pollutant})`;
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: { display: true, text: 'AQI' },
        grid: { color: 'rgba(0,0,0,0.04)' }
      },
      y1: {
        type: 'linear',
        display: pollutant ? true : false,
        position: 'right',
        grid: { drawOnChartArea: false },
        title: { display: true, text: pollutant }
      }
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold mb-1">{city ? `${city} ` : ''}AQI Trends</h3>
          <p className="text-gray-500 text-sm">Showing last {trimmedData.length} days. AQI is a measure of air quality (lower is better).</p>
        </div>
        {latest && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm ${getAQIColor(latest.AQI)}`}>
            {getTrendIcon(trend)}
            <span className="font-bold text-lg">{latest.AQI != null ? latest.AQI.toFixed(1) : 'N/A'}</span>
            <span className="text-xs font-medium ml-1">Latest AQI</span>
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
} 