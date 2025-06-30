import React, { useState, useEffect, useContext, createContext } from 'react';
import { Sun, Moon, UserCircle, Search, Bell, LogOut, HelpCircle, MessageSquare, BarChart2, MapPin, PieChart, Calendar, Activity, TrendingUp, Menu } from 'lucide-react';
import { RefreshCw, Filter } from 'lucide-react';
import './index.css';
import ChartSection from './components/ChartSection';
import MapSection from './components/MapSection';
import CityTrendsScreen from './screens/CityTrendsScreen';
import PollutantCompositionScreen from './screens/PollutantCompositionScreen';
import TemporalPatternsScreen from './screens/TemporalPatternsScreen';
import CorrelationAnalysisScreen from './screens/CorrelationAnalysisScreen';
import ForecastingScreen from './screens/ForecastingScreen';
import ComparativeAnalysisScreen from './screens/ComparativeAnalysisScreen';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';

const API_BASE = 'http://127.0.0.1:5000/api';

// Notification Context
const NotificationContext = createContext();

export function useNotifications() {
  return useContext(NotificationContext);
}

function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const addNotification = (notification) => {
    setNotifications((prev) => [
      { id: Date.now() + Math.random(), read: false, ...notification },
      ...prev
    ]);
  };
  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };
  const markAllAsRead = () => {
    setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
  };
  const unreadCount = notifications.filter(n => !n.read).length;
  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, markAllAsRead, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

function NotificationDropdown({ open, onClose }) {
  const { notifications, removeNotification, markAllAsRead } = useNotifications();
  React.useEffect(() => {
    if (open) markAllAsRead();
  }, [open]);
  if (!open) return null;
  return (
    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg z-50 border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 font-semibold">Notifications</div>
      <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
        {notifications.length === 0 && <li className="p-4 text-gray-400">No notifications</li>}
        {notifications.map(n => (
          <li key={n.id} className={`p-4 flex justify-between items-start gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition ${!n.read ? 'bg-blue-50 dark:bg-blue-900/40' : ''}`}>
            <div>
              <div className="font-medium">{n.title || 'Notification'}</div>
              <div className="text-sm text-gray-500 dark:text-gray-300">{n.message}</div>
              {n.time && <div className="text-xs text-gray-400 mt-1">{n.time}</div>}
            </div>
            <button onClick={() => removeNotification(n.id)} className="text-xs text-gray-400 hover:text-red-500">✕</button>
          </li>
        ))}
      </ul>
      <button className="w-full py-2 text-center text-blue-600 hover:underline text-sm" onClick={onClose}>Close</button>
    </div>
  );
}

function SidebarNav() {
  const location = useLocation();
  const navItems = [
    { to: '/', label: 'Dashboard', icon: <BarChart2 size={20} /> },
    { to: '/city-trends', label: 'City-Wise AQI Trends', icon: <MapPin size={20} /> },
    { to: '/pollutant-composition', label: 'Pollutant Composition Analysis', icon: <PieChart size={20} /> },
    { to: '/temporal-patterns', label: 'Temporal Patterns Analysis', icon: <Calendar size={20} /> },
    { to: '/correlation-analysis', label: 'Correlation Analysis', icon: <Activity size={20} /> },
    { to: '/forecasting', label: 'Forecasting Module', icon: <TrendingUp size={20} /> },
    { to: '/comparative-analysis', label: 'Comparative Analysis', icon: <BarChart2 size={20} /> },
  ];
  return (
    <nav className="flex flex-col gap-2">
      {navItems.map(item => (
        <Link
          key={item.to}
          to={item.to}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-900/60 transition font-medium ${location.pathname === item.to ? 'bg-blue-900/80' : ''}`}
        >
          {item.icon} {item.label}
        </Link>
      ))}
    </nav>
  );
}

function GlobalSearchModal({ open, onClose, cities, countries, pollutants, setSelectedCity, setSelectedCountry, setSelectedPollutant }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const navigate = useNavigate();

  // Add static searchable items
  const staticSearchables = [
    { type: 'Screen', value: 'Dashboard', screen: '/', screenLabel: 'Dashboard' },
    { type: 'Screen', value: 'City Trends', screen: '/city-trends', screenLabel: 'City Trends' },
    { type: 'Screen', value: 'Pollutant Composition', screen: '/pollutant-composition', screenLabel: 'Pollutant Composition' },
    { type: 'Screen', value: 'Temporal Patterns', screen: '/temporal-patterns', screenLabel: 'Temporal Patterns' },
    { type: 'Screen', value: 'Correlation Analysis', screen: '/correlation-analysis', screenLabel: 'Correlation Analysis' },
    { type: 'Help', value: 'Help Centre', screen: '/', screenLabel: 'Dashboard' },
    { type: 'Contact', value: 'Contact us', screen: '/', screenLabel: 'Dashboard' },
    { type: 'Filter', value: 'Country', screen: '/', screenLabel: 'Dashboard' },
    { type: 'Filter', value: 'City', screen: '/', screenLabel: 'Dashboard' },
    { type: 'Filter', value: 'Pollutant', screen: '/', screenLabel: 'Dashboard' },
    { type: 'Filter', value: 'Start Date', screen: '/', screenLabel: 'Dashboard' },
    { type: 'Filter', value: 'End Date', screen: '/', screenLabel: 'Dashboard' },
    { type: 'Section', value: 'Air Quality Trends', screen: '/', screenLabel: 'Dashboard' },
    { type: 'Section', value: 'Geographical Map', screen: '/', screenLabel: 'Dashboard' },
    // Add more as needed
  ];

  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const cityMatches = cities.filter(c => c.toLowerCase().includes(q)).map(c => ({ type: 'City', value: c, screen: '/city-trends', screenLabel: 'City Trends' }));
    const countryMatches = countries.filter(c => c.toLowerCase().includes(q)).map(c => ({ type: 'Country', value: c, screen: '/', screenLabel: 'Dashboard' }));
    const pollutantMatches = pollutants.filter(p => p.toLowerCase().includes(q)).map(p => ({ type: 'Pollutant', value: p, screen: '/pollutant-composition', screenLabel: 'Pollutant Composition' }));
    const staticMatches = staticSearchables.filter(item => item.value.toLowerCase().includes(q));
    setSearchResults([...staticMatches, ...cityMatches, ...countryMatches, ...pollutantMatches]);
  }, [searchQuery, cities, countries, pollutants]);

  function handleSearchResultClick(result) {
    if (result.type === 'City') {
      setSelectedCity(result.value);
      navigate(result.screen);
    } else if (result.type === 'Country') {
      setSelectedCountry(result.value);
      navigate(result.screen);
    } else if (result.type === 'Pollutant') {
      setSelectedPollutant(result.value);
      navigate(result.screen);
    } else if (result.type === 'Screen' || result.type === 'Section' || result.type === 'Help' || result.type === 'Contact' || result.type === 'Filter') {
      navigate(result.screen);
    }
    onClose();
    setSearchQuery('');
    setSearchResults([]);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-md relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xl"
          onClick={onClose}
          aria-label="Close search"
        >
          &times;
        </button>
        <input
          autoFocus
          type="text"
          className="w-full p-3 rounded-lg border dark:bg-gray-800 dark:border-gray-700 text-lg mb-4 text-gray-900 dark:text-white"
          placeholder="Search for city, country, or pollutant..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
        />
        <ul className="max-h-60 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
          {searchResults.length === 0 && searchQuery && (
            <li className="p-3 text-gray-400">No results found</li>
          )}
          {searchResults.map((r, i) => (
            <li
              key={r.type + r.value + i}
              className="p-3 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition flex justify-between items-center"
              onClick={() => handleSearchResultClick(r)}
            >
              <span>{r.value}</span>
              <span className="text-xs text-gray-400 ml-2">{r.type} &middot; {r.screenLabel}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function HeaderActions({ darkMode, setDarkMode, setSearchOpen, notifOpen, setNotifOpen }) {
  const { unreadCount } = useNotifications();
  return (
    <>
      <button
        className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
        onClick={() => setDarkMode((d) => !d)}
        title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-gray-500" />}
      </button>
      <button
        className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
        onClick={() => setSearchOpen(true)}
        title="Global Search"
      >
        <Search size={20} className="text-gray-500" />
      </button>
      <button
        className="relative bg-gray-100 dark:bg-gray-800 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
        onClick={() => setNotifOpen((o) => !o)}
        title="Notifications"
      >
        <Bell size={20} className="text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">
            {unreadCount}
          </span>
        )}
      </button>
    </>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage or system preference
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
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
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

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
    <NotificationProvider>
      <Router>
        <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
          {/* Sidebar (desktop) */}
          <aside className="hidden md:flex w-64 bg-[#181F3A] text-white flex-col justify-between py-6 px-4 rounded-r-3xl shadow-2xl">
            <div>
              {/* Logo */}
              <div className="flex items-center gap-3 mb-10 px-2">
                <div className="bg-orange-400 rounded-full w-12 h-12 flex items-center justify-center text-2xl font-bold">B</div>
                <span className="text-2xl font-bold tracking-wide">BreathBetter</span>
              </div>
              {/* Nav */}
              <SidebarNav />
            </div>
          </aside>
          {/* Sidebar (mobile drawer) */}
          {mobileSidebarOpen && (
            <div className="fixed inset-0 z-50 flex">
              <div className="w-64 bg-[#181F3A] text-white flex flex-col justify-between py-6 px-4 shadow-2xl h-full">
                <div>
                  <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="bg-orange-400 rounded-full w-12 h-12 flex items-center justify-center text-2xl font-bold">B</div>
                    <span className="text-2xl font-bold tracking-wide">BreathBetter</span>
                  </div>
                  <SidebarNav />
                </div>
              </div>
              <div className="flex-1 bg-black/40" onClick={() => setMobileSidebarOpen(false)}></div>
            </div>
          )}
          {/* Main Content */}
          <div className="flex-1 flex flex-col p-2 sm:p-4 md:p-10">
            {/* Header */}
            <header className="flex items-center justify-between mb-8 relative">
              <div className="flex items-center gap-2">
                {/* Hamburger for mobile */}
                <button className="md:hidden p-2 rounded-full bg-gray-100 dark:bg-gray-800 mr-2" onClick={() => setMobileSidebarOpen(true)}>
                  <Menu size={24} className="text-gray-700 dark:text-white" />
                </button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Welcome Back</h2>
              </div>
              <div className="flex items-center gap-4">
                <HeaderActions
                  darkMode={darkMode}
                  setDarkMode={setDarkMode}
                  setSearchOpen={setSearchOpen}
                  notifOpen={notifOpen}
                  setNotifOpen={setNotifOpen}
                />
                {notifOpen && (
                  <div className="absolute right-0 top-12 z-50">
                    <NotificationDropdown open={notifOpen} onClose={() => setNotifOpen(false)} />
                  </div>
                )}
              </div>
            </header>
            <GlobalSearchModal
              open={searchOpen}
              onClose={() => setSearchOpen(false)}
              cities={cities}
              countries={countries}
              pollutants={pollutants}
              setSelectedCity={setSelectedCity}
              setSelectedCountry={setSelectedCountry}
              setSelectedPollutant={setSelectedPollutant}
            />
            {/* Main dashboard area */}
            <main className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-2 sm:p-4 md:p-8 flex-1">
              <Routes>
                <Route path="/" element={
                  <main className="max-w-7xl mx-auto p-2 md:p-4 dark:text-white">
                    {/* Dashboard Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                      {/* Average AQI */}
                      <div className="flex flex-col items-start bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-t-4 border-blue-500 dark:text-white">
                        <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full mb-4"><TrendingUp size={28} className="text-blue-600 dark:text-blue-300" /></div>
                        <div className="text-3xl font-bold mb-1 dark:text-white">{data && data.length ? (data.reduce((a, b) => a + (b.AQI || 0), 0) / data.length).toFixed(1) : '--'}</div>
                        <div className="text-sm text-gray-500 dark:text-white">Avg AQI</div>
                        <div className="text-xs text-gray-400 dark:text-white mt-2">Current Filter</div>
                      </div>
                      {/* Number of Cities */}
                      <div className="flex flex-col items-start bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-t-4 border-green-500 dark:text-white">
                        <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full mb-4"><MapPin size={28} className="text-green-600 dark:text-green-300" /></div>
                        <div className="text-3xl font-bold mb-1 dark:text-white">{data && data.length ? Array.from(new Set(data.map(d => d.City))).length : '--'}</div>
                        <div className="text-sm text-gray-500 dark:text-white">Cities</div>
                        <div className="text-xs text-gray-400 dark:text-white mt-2">In View</div>
                      </div>
                      {/* Most Recent Date */}
                      <div className="flex flex-col items-start bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-t-4 border-purple-500 dark:text-white">
                        <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full mb-4"><Filter size={28} className="text-purple-600 dark:text-purple-300" /></div>
                        <div className="text-3xl font-bold mb-1 dark:text-white">{data && data.length ? (data[data.length - 1]?.Date || '--') : '--'}</div>
                        <div className="text-sm text-gray-500 dark:text-white">Latest Date</div>
                        <div className="text-xs text-gray-400 dark:text-white mt-2">Data</div>
                      </div>
                      {/* Dominant Pollutant */}
                      <div className="flex flex-col items-start bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-t-4 border-orange-500 dark:text-white">
                        <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-full mb-4"><Filter size={28} className="text-orange-600 dark:text-orange-300" /></div>
                        <div className="text-3xl font-bold mb-1 dark:text-white">{data && data.length && selectedPollutant ? selectedPollutant : (pollutants[0] || '--')}</div>
                        <div className="text-sm text-gray-500 dark:text-white">Dominant Pollutant</div>
                        <div className="text-xs text-gray-400 dark:text-white mt-2">Current</div>
                      </div>
                    </div>
                    {/* Filters Bar */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-10 flex flex-col md:flex-row gap-6 items-center dark:text-white">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 w-full">
                        <select
                          className="p-3 rounded-lg border dark:bg-gray-900 dark:border-gray-700 w-full dark:text-white"
                          value={selectedCountry}
                          onChange={e => setSelectedCountry(e.target.value)}
                        >
                          <option value="">Country</option>
                          {countries.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select
                          className="p-3 rounded-lg border dark:bg-gray-900 dark:border-gray-700 w-full dark:text-white"
                          value={selectedCity}
                          onChange={e => setSelectedCity(e.target.value)}
                          disabled={!selectedCountry}
                        >
                          <option value="">City</option>
                          {cities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select
                          className="p-3 rounded-lg border dark:bg-gray-900 dark:border-gray-700 w-full dark:text-white"
                          value={selectedPollutant}
                          onChange={e => setSelectedPollutant(e.target.value)}
                        >
                          <option value="">Pollutant</option>
                          {pollutants.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <input
                          type="date"
                          className="p-3 rounded-lg border dark:bg-gray-900 dark:border-gray-700 w-full dark:text-white"
                          value={startDate}
                          onChange={e => setStartDate(e.target.value)}
                        />
                        <input
                          type="date"
                          className="p-3 rounded-lg border dark:bg-gray-900 dark:border-gray-700 w-full dark:text-white"
                          value={endDate}
                          onChange={e => setEndDate(e.target.value)}
                        />
                      </div>
                      <button
                        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition mt-4 md:mt-0 shadow dark:text-white"
                        onClick={() => {
                          setSelectedCountry('');
                          setSelectedCity('');
                          setSelectedPollutant('');
                          setStartDate('');
                          setEndDate('');
                        }}
                        title="Reset Filters"
                      >
                        <RefreshCw size={18} /> Reset
                      </button>
                    </div>
                    {/* Section: AQI Trends */}
                    <div className="mb-10 dark:text-white">
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold dark:text-white">Air Quality Trends</h2>
                        <span className="text-gray-400 text-sm dark:text-white">Visualize AQI and pollutant trends for the selected region and time period.</span>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50/60 to-white dark:from-gray-900/60 dark:to-gray-800/80 rounded-2xl p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 dark:text-white">
                          <ChartSection data={data} pollutant={selectedPollutant} city={selectedCity} />
                        </div>
                      </div>
                    </div>
                    {/* Section: Map */}
                    <div className="mb-10 dark:text-white">
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold dark:text-white">Geographical Map</h2>
                        <span className="text-gray-400 text-sm dark:text-white">See the locations of cities in the dataset. Click a marker for city details.</span>
                      </div>
                      <div className="bg-gradient-to-br from-green-50/60 to-white dark:from-gray-900/60 dark:to-gray-800/80 rounded-2xl p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 dark:text-white">
                          <MapSection data={data} />
                        </div>
                      </div>
                    </div>
                  </main>
                } />
                <Route path="/city-trends" element={<CityTrendsScreen />} />
                <Route path="/pollutant-composition" element={<PollutantCompositionScreen />} />
                <Route path="/temporal-patterns" element={<TemporalPatternsScreen />} />
                <Route path="/correlation-analysis" element={<CorrelationAnalysisScreen />} />
                <Route path="/forecasting" element={<ForecastingScreen />} />
                <Route path="/comparative-analysis" element={<ComparativeAnalysisScreen />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </NotificationProvider>
  );
}

export default App;
