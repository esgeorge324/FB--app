import { config } from '../config.js';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

// Simple in-process throttle: Nominatim's usage policy caps public requests at ~1/sec.
let lastRequestAt = 0;
async function throttle() {
  const elapsed = Date.now() - lastRequestAt;
  const minGapMs = 1100;
  if (elapsed < minGapMs) {
    await new Promise((resolve) => setTimeout(resolve, minGapMs - elapsed));
  }
  lastRequestAt = Date.now();
}

// Resolves a free-text place name/address to { lat, lon, label }.
export async function geocode(query) {
  await throttle();

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');

  const res = await fetch(url, {
    headers: { 'User-Agent': config.nominatimUserAgent },
  });

  if (!res.ok) {
    throw new Error(`Geocoding request failed (${res.status}) for "${query}"`);
  }

  const results = await res.json();
  if (!results.length) {
    throw new Error(`Could not find a location matching "${query}"`);
  }

  const best = results[0];
  return {
    lat: Number(best.lat),
    lon: Number(best.lon),
    label: best.display_name,
  };
}
