import { Router } from 'express';
import { geocode } from '../geo/geocode.js';
import { fetchRoute } from '../geo/route.js';
import { sampleWaypoints } from '../geo/waypoints.js';
import { searchAlongRoute, getProvider } from '../marketplace/search.js';
import { config } from '../config.js';

export const api = Router();

// Resolves start/end text into a full route: geocoded endpoints, the route
// polyline, and the sampled waypoints that a search would run against.
api.post('/route', async (req, res) => {
  try {
    const { origin, destination } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'origin and destination are required' });
    }

    const [originGeo, destinationGeo] = await Promise.all([geocode(origin), geocode(destination)]);
    const route = await fetchRoute(originGeo, destinationGeo);
    const waypoints = sampleWaypoints(route.points, {
      intervalMiles: config.waypointIntervalMiles,
      maxWaypoints: config.maxWaypoints,
    });

    res.json({
      origin: originGeo,
      destination: destinationGeo,
      routePoints: route.points,
      distanceMiles: route.distanceMiles,
      durationMinutes: route.durationMinutes,
      waypoints,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Runs the marketplace search across the route's waypoints and returns deduped, tagged listings.
api.post('/search', async (req, res) => {
  try {
    const { origin, destination, query, radiusMiles, minPrice, maxPrice } = req.body;
    if (!origin || !destination || !query) {
      return res.status(400).json({ error: 'origin, destination, and query are required' });
    }

    const [originGeo, destinationGeo] = await Promise.all([geocode(origin), geocode(destination)]);
    const route = await fetchRoute(originGeo, destinationGeo);
    const waypoints = sampleWaypoints(route.points, {
      intervalMiles: config.waypointIntervalMiles,
      maxWaypoints: config.maxWaypoints,
    });

    const listings = await searchAlongRoute(waypoints, {
      query,
      radiusMiles: Number(radiusMiles) || 10,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });

    res.json({
      origin: originGeo,
      destination: destinationGeo,
      routePoints: route.points,
      distanceMiles: route.distanceMiles,
      waypoints,
      listings,
      provider: config.marketplaceProvider,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

api.get('/login-status', async (_req, res) => {
  if (config.marketplaceProvider !== 'facebook') {
    return res.json({ provider: 'mock', loggedIn: null });
  }
  try {
    const provider = getProvider();
    const status = await provider.checkLogin();
    res.json({ provider: 'facebook', ...status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
