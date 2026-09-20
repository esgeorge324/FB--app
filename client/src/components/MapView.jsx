import { MapContainer, TileLayer, Polyline, CircleMarker, Circle, Popup } from 'react-leaflet';

export default function MapView({ routePoints, waypoints, radiusMiles }) {
  if (!routePoints?.length) {
    return <div className="map-placeholder">Search a route to see it here.</div>;
  }

  const center = routePoints[Math.floor(routePoints.length / 2)];
  const radiusMeters = (radiusMiles || 10) * 1609.34;

  return (
    <MapContainer center={center} zoom={7} style={{ height: '420px', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={routePoints} pathOptions={{ color: '#1877f2', weight: 4 }} />
      {waypoints?.map((wp, i) => (
        <Circle key={`radius-${i}`} center={wp.point} radius={radiusMeters} pathOptions={{ color: '#e0245e', weight: 1, fillOpacity: 0.06 }} />
      ))}
      {waypoints?.map((wp, i) => (
        <CircleMarker
          key={i}
          center={wp.point}
          radius={6}
          pathOptions={{ color: '#e0245e', fillColor: '#e0245e', fillOpacity: 0.8 }}
        >
          <Popup>
            Mile {wp.mileMarker} - searching within {radiusMiles} mi
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
