import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { TrendingUp, MapPin, RefreshCw, Filter } from 'lucide-react';
import './index.css';
import ChartSection from './components/ChartSection';
import MapSection from './components/MapSection';
import CityTrendsScreen from './screens/CityTrendsScreen';
import PollutantCompositionScreen from './screens/PollutantCompositionScreen';
import TemporalPatternsScreen from './screens/TemporalPatternsScreen';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

const API_BASE = 'http://127.0.0.1:5000/api';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [pollutants, setPollutants] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedPollutant, setSelectedPollutant] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch countries and pollutants on mount
  useEffect(() => {
    fetch(`${API_BASE}/countries`).then(res => res.json()).then(setCountries);
    fetch(`${API_BASE}/pollutants`).then(res => res.json()).then(setPollutants);
  }, []);

  // Fetch cities when country changes
  useEffect(() => {
    if (selectedCountry) {
      fetch(`${API_BASE}/cities?country=${encodeURIComponent(selectedCountry)}`)
        .then(res => res.json())
        .then(setCities);
    } else {
      setCities([]);
    }
    setSelectedCity('');
  }, [selectedCountry]);

  // Fetch data when filters change
  useEffect(() => {
    setLoading(true);
    const params = [];
    if (selectedCountry) params.push(`country=${encodeURIComponent(selectedCountry)}`);
    if (selectedCity) params.push(`city=${encodeURIComponent(selectedCity)}`);
    if (selectedPollutant) params.push(`pollutant=${encodeURIComponent(selectedPollutant)}`);
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    const url = `${API_BASE}/data${params.length ? '?' + params.join('&') : ''}`;
    fetch(url)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
        // For now, log the data
        console.log('Fetched data:', d);
      })
      .catch(() => setLoading(false));
  }, [selectedCountry, selectedCity, selectedPollutant, startDate, endDate]);

  return (
    <Router>
      <div className={darkMode ? 'dark bg-gray-900 min-h-screen text-white' : 'bg-gray-100 min-h-screen text-gray-900'}>
        <header className="flex items-center justify-between px-6 py-4 shadow-md bg-white dark:bg-gray-800">
          <h1 className="text-2xl font-poppins font-bold">Climate Visualizer</h1>
          <nav className="flex gap-4">
            <Link to="/" className="hover:underline">Dashboard</Link>
            <Link to="/city-trends" className="hover:underline">City Trends</Link>
            <Link to="/pollutant-composition" className="hover:underline">Pollutant Composition</Link>
            <Link to="/temporal-patterns" className="hover:underline">Temporal Patterns</Link>
          </nav>
          <button
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>
        <Routes>
          <Route path="/" element={
            <main className="max-w-7xl mx-auto p-4">
              {/* Dashboard Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {/* Average AQI */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow flex flex-col items-center p-4">
                  <span className="text-xs text-gray-500 mb-1 flex items-center gap-1"><TrendingUp size={16} />Avg AQI</span>
                  <span className="font-bold text-2xl">
                    {data && data.length ? (data.reduce((a, b) => a + (b.AQI || 0), 0) / data.length).toFixed(1) : '--'}
                  </span>
                  <span className="text-xs text-gray-400">Current Filter</span>
                </div>
                {/* Number of Cities */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow flex flex-col items-center p-4">
                  <span className="text-xs text-gray-500 mb-1 flex items-center gap-1"><MapPin size={16} />Cities</span>
                  <span className="font-bold text-2xl">
                    {data && data.length ? Array.from(new Set(data.map(d => d.City))).length : '--'}
                  </span>
                  <span className="text-xs text-gray-400">In View</span>
                </div>
                {/* Most Recent Date */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow flex flex-col items-center p-4">
                  <span className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Filter size={16} />Latest Date</span>
                  <span className="font-bold text-2xl">
                    {data && data.length ? (data[data.length - 1]?.Date || '--') : '--'}
                  </span>
                  <span className="text-xs text-gray-400">Data</span>
                </div>
                {/* Dominant Pollutant */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow flex flex-col items-center p-4">
                  <span className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Filter size={16} />Dominant Pollutant</span>
                  <span className="font-bold text-2xl">
                    {data && data.length && selectedPollutant ? selectedPollutant : (pollutants[0] || '--')}
                  </span>
                  <span className="text-xs text-gray-400">Current</span>
                </div>
              </div>
              {/* Filters Bar */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow flex flex-col md:flex-row gap-4 mb-8 p-4 items-center">
                <div className="flex-1 flex flex-col md:flex-row gap-4 w-full">
                  <select
                    className="p-2 rounded border dark:bg-gray-900 dark:border-gray-700"
                    value={selectedCountry}
                    onChange={e => setSelectedCountry(e.target.value)}
                  >
                    <option value="">Country</option>
                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select
                    className="p-2 rounded border dark:bg-gray-900 dark:border-gray-700"
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    disabled={!selectedCountry}
                  >
                    <option value="">City</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select
                    className="p-2 rounded border dark:bg-gray-900 dark:border-gray-700"
                    value={selectedPollutant}
                    onChange={e => setSelectedPollutant(e.target.value)}
                  >
                    <option value="">Pollutant</option>
                    {pollutants.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input
                    type="date"
                    className="p-2 rounded border dark:bg-gray-900 dark:border-gray-700"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                  <input
                    type="date"
                    className="p-2 rounded border dark:bg-gray-900 dark:border-gray-700"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition mt-4 md:mt-0"
                  onClick={() => {
                    setSelectedCountry('');
                    setSelectedCity('');
                    setSelectedPollutant('');
                    setStartDate('');
                    setEndDate('');
                  }}
                  title="Reset Filters"
                >
                  <RefreshCw size={16} /> Reset
                </button>
              </div>
              {/* Section: AQI Trends */}
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-2">Air Quality Trends</h2>
                <p className="text-gray-500 mb-4">Visualize AQI and pollutant trends for the selected region and time period. Lower AQI means better air quality.</p>
                <div className="bg-gradient-to-br from-blue-50/60 to-white dark:from-gray-900/60 dark:to-gray-800/80 rounded-2xl p-2">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-2">
                    <ChartSection data={data} pollutant={selectedPollutant} city={selectedCity} />
                  </div>
                </div>
              </div>
              {/* Section: Map */}
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-2">Geographical Map</h2>
                <p className="text-gray-500 mb-4">See the locations of cities in the dataset. Click a marker for city details.</p>
                <div className="bg-gradient-to-br from-green-50/60 to-white dark:from-gray-900/60 dark:to-gray-800/80 rounded-2xl p-2">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-2">
                    <MapSection data={data} />
                  </div>
                </div>
              </div>
            </main>
          } />
          <Route path="/city-trends" element={<CityTrendsScreen />} />
          <Route path="/pollutant-composition" element={<PollutantCompositionScreen />} />
          <Route path="/temporal-patterns" element={<TemporalPatternsScreen />} />
        </Routes>
        <footer className="text-center py-4 text-gray-500 dark:text-gray-400">
          Climate Visualizer &copy; 2025
        </footer>
      </div>
    </Router>
  );
}

export default App;
