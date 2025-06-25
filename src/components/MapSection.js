import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

export default function MapSection({ data }) {
  if (!data || data.length === 0) {
    return <div className="text-gray-400 dark:text-gray-500">No data to display.</div>;
  }

  // Get unique cities from data
  const cities = Array.from(new Set(data.map(d => d.City)));

  return (
    <MapContainer center={[20, 0]} zoom={2} style={{ height: '300px', width: '100%' }} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {cities.map(city =>
        cityCoords[city] ? (
          <Marker key={city} position={cityCoords[city]}>
            <Popup>
              {city}
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
  );
} 