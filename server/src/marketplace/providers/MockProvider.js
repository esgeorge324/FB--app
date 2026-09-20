import { MarketplaceProvider } from './Provider.js';

// Deterministic pseudo-random generator seeded from a string, so the same
// waypoint always returns the same synthetic listings during a dev session.
function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h * 1103515245 + 12345) | 0;
    return ((h >>> 0) % 10000) / 10000;
  };
}

const ADJECTIVES = ['Vintage', 'Like-new', 'Barely used', 'Refurbished', 'Custom', 'Rare'];

/**
 * Returns synthetic listings so the whole route-search pipeline (waypoint
 * sampling, dedupe, mile-marker tagging, map + list UI) can be built and
 * tested without needing a real Facebook session.
 */
export class MockProvider extends MarketplaceProvider {
  async search({ lat, lon, radiusMiles, query }) {
    const rand = seededRandom(`${lat.toFixed(2)},${lon.toFixed(2)},${query}`);
    const count = 2 + Math.floor(rand() * 4);

    return Array.from({ length: count }, (_, i) => {
      const price = Math.round((20 + rand() * 480) / 5) * 5;
      const adjective = ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)];
      const offsetMiles = rand() * radiusMiles;
      const id = `mock-${lat.toFixed(3)}-${lon.toFixed(3)}-${i}`;

      return {
        id,
        title: `${adjective} ${query}`,
        price,
        priceText: `$${price}`,
        url: `https://www.facebook.com/marketplace/item/${id}`,
        thumbnail: null,
        locationText: `~${offsetMiles.toFixed(1)} mi from waypoint (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
      };
    });
  }
}
