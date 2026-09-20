const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

// Fetches a driving route between two { lat, lon } points from the public OSRM
// demo server. Returns the route geometry as an array of [lat, lon] points and
// the total distance in miles.
export async function fetchRoute(origin, destination) {
  const coords = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
  const url = new URL(`${OSRM_URL}/${coords}`);
  url.searchParams.set('overview', 'full');
  url.searchParams.set('geometries', 'geojson');

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Routing request failed (${res.status})`);
  }

  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(`No route found between the given locations (${data.code || 'unknown error'})`);
  }

  const route = data.routes[0];
  // GeoJSON coordinates are [lon, lat]; flip to [lat, lon] for consistency with the rest of the app.
  const points = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);

  return {
    points,
    distanceMiles: route.distance / 1609.344,
    durationMinutes: route.duration / 60,
  };
}
