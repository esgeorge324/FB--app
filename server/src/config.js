import 'dotenv/config';

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  port: num(process.env.PORT, 3001),

  // Which marketplace data source to use: "mock" (safe, synthetic data, default)
  // or "facebook" (real Playwright automation against your own logged-in session).
  marketplaceProvider: process.env.MARKETPLACE_PROVIDER || 'mock',

  // Route/waypoint tuning
  waypointIntervalMiles: num(process.env.WAYPOINT_INTERVAL_MILES, 25),
  maxWaypoints: num(process.env.MAX_WAYPOINTS, 15),

  // Facebook provider tuning (only relevant when marketplaceProvider === "facebook")
  fb: {
    storageStatePath: process.env.FB_STORAGE_STATE_PATH || new URL('../.data/fb-storage-state.json', import.meta.url).pathname,
    headless: process.env.FB_HEADLESS !== 'false',
    minDelayMs: num(process.env.FB_MIN_DELAY_MS, 4000),
    maxDelayMs: num(process.env.FB_MAX_DELAY_MS, 8000),
    navTimeoutMs: num(process.env.FB_NAV_TIMEOUT_MS, 30000),
  },

  nominatimUserAgent: process.env.NOMINATIM_USER_AGENT || 'fb-marketplace-route-search/1.0 (personal project)',
};
