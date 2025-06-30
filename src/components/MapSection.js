import React, { useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Example city coordinates (should be replaced with real geocoding in production)
const cityCoords = {
  'New York': [40.7128, -74.0060],
  'Los Angeles': [34.0522, -118.2437],
  'London': [51.5074, -0.1278],
  'Beijing': [39.9042, 116.4074],
  'Delhi': [28.6139, 77.2090],
  'Paris': [48.8566, 2.3522],
  'Tokyo': [35.6895, 139.6917],
  'Sydney': [-33.8688, 151.2093],
  'São Paulo': [-23.5505, -46.6333],
  'Cairo': [30.0444, 31.2357]
};

const AQI_COLORS = [
  { max: 50, color: '#43a047', label: 'Good' },
  { max: 100, color: '#fbc02d', label: 'Moderate' },
  { max: 150, color: '#fb8c00', label: 'Unhealthy for Sensitive' },
  { max: 200, color: '#e53935', label: 'Unhealthy' },
  { max: 300, color: '#8e24aa', label: 'Very Unhealthy' },
  { max: 500, color: '#6d4c41', label: 'Hazardous' }
];

function getAQIColor(aqi) {
  if (aqi == null) return '#bdbdbd';
  for (const range of AQI_COLORS) {
    if (aqi <= range.max) return range.color;
  }
  return '#6d4c41';
}

function ResetViewButton({ mapRef }) {
  const map = useMap();
  return (
    <button
      className="absolute top-4 right-4 z-[1000] px-3 py-1 rounded bg-blue-600 text-white shadow hover:bg-blue-700 transition"
      onClick={() => map.setView([20, 0], 2)}
      style={{ position: 'absolute' }}
      title="Reset Map View"
    >
      Reset View
    </button>
  );
}

export default function MapSection({ data }) {
  const mapRef = useRef();
  if (!data || data.length === 0) {
    return <div className="text-gray-400 dark:text-gray-500">No data to display.</div>;
  }

  // Get unique cities from data
  const cities = Array.from(new Set(data.map(d => d.City)));

  // Get latest data for each city
  const latestByCity = {};
  for (const d of data) {
    if (!latestByCity[d.City] || new Date(d.Date) > new Date(latestByCity[d.City].Date)) {
      latestByCity[d.City] = d;
    }
  }

  // Custom icon for AQI color
  function createIcon(aqi) {
    return L.divIcon({
      className: '',
      html: `<div style="background:${getAQIColor(aqi)};width:20px;height:20px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.15);"></div>`
    });
  }

  return (
    <div className="relative">
      <MapContainer ref={mapRef} center={[20, 0]} zoom={2} style={{ height: '300px', width: '100%' }} scrollWheelZoom={false} className="w-full h-64 md:h-80">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {cities.map(city => {
          const d = latestByCity[city];
          if (!cityCoords[city]) return null;
          return (
            <Marker key={city} position={cityCoords[city]} icon={createIcon(d?.AQI)}>
              <Popup>
                <div className="font-semibold mb-1">{city}</div>
                <div className="mb-1">
                  <span className="font-medium">AQI: </span>
                  <span style={{ color: getAQIColor(d?.AQI), fontWeight: 600 }}>{d?.AQI ?? 'N/A'}</span>
                </div>
                {d && (
                  <div className="text-xs">
                    <div><span className="font-medium">Date:</span> {d.Date}</div>
                    <div className="font-medium mt-1">Pollutants:</div>
                    <ul className="list-disc ml-4">
                      {Object.keys(d).filter(k => !['City', 'Date', 'AQI'].includes(k)).map(k => (
                        <li key={k}>{k}: <span className="font-mono">{d[k]}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
              </Popup>
            </Marker>
          );
        })}
        <ResetViewButton mapRef={mapRef} />
      </MapContainer>
      {/* AQI Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white dark:bg-gray-800 rounded shadow p-2 text-xs flex flex-col gap-1">
        <div className="font-semibold mb-1">AQI Legend</div>
        {AQI_COLORS.map(range => (
          <div key={range.max} className="flex items-center gap-2">
            <span style={{ background: range.color, width: 16, height: 16, borderRadius: '50%', display: 'inline-block', border: '1px solid #ccc' }}></span>
            <span>{range.label} ({range.max === 500 ? '301+' : `0-${range.max}`})</span>
          </div>
        ))}
      </div>
    </div>
  );
} 