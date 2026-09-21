import { Router } from 'express';
import { mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { geocode } from '../geo/geocode.js';
import { fetchRoute } from '../geo/route.js';
import { sampleWaypoints } from '../geo/waypoints.js';
import { searchAlongRoute, getProvider, resetProvider } from '../marketplace/search.js';
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

// Lets you push the Facebook session captured locally (via `npm run fb:login`,
// which needs a real display) onto a headless, remotely-hosted server that
// has none. Deliberately requires APP_ACCESS_TOKEN to already be configured -
// this endpoint writes live session cookies to disk, so it must never be
// reachable without a secret even if you forget to set one everywhere else.
api.post('/fb-session', async (req, res) => {
  if (!config.accessToken) {
    return res.status(403).json({
      error: 'Set APP_ACCESS_TOKEN on the server before uploading a session remotely.',
    });
  }

  const storageState = req.body;
  if (!storageState || !Array.isArray(storageState.cookies) || !Array.isArray(storageState.origins)) {
    return res.status(400).json({ error: 'Body must be a Playwright storageState JSON object (cookies + origins).' });
  }

  try {
    mkdirSync(dirname(config.fb.storageStatePath), { recursive: true });
    writeFileSync(config.fb.storageStatePath, JSON.stringify(storageState));
    chmodSync(config.fb.storageStatePath, 0o600);
  } catch (err) {
    return res.status(500).json({ error: `Failed to save session: ${err.message}` });
  }

  try {
    await resetProvider();
  } catch (err) {
    console.error('Failed to close previous provider after session upload:', err.message);
  }
  res.json({ ok: true });
});
