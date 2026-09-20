import { MockProvider } from './providers/MockProvider.js';
import { FacebookProvider } from './providers/FacebookProvider.js';
import { config } from '../config.js';

let providerInstance = null;

export function getProvider() {
  if (providerInstance) return providerInstance;
  providerInstance = config.marketplaceProvider === 'facebook' ? new FacebookProvider() : new MockProvider();
  return providerInstance;
}

/**
 * Runs a marketplace search around every waypoint along the route, then
 * merges the results: a listing showing up near more than one waypoint
 * (overlapping search radii) is kept only once, tagged with the waypoint
 * closest to the start of the trip.
 *
 * @param {{point: [number, number], mileMarker: number}[]} waypoints
 * @param {{query: string, radiusMiles: number, minPrice?: number, maxPrice?: number}} searchParams
 */
export async function searchAlongRoute(waypoints, searchParams) {
  const provider = getProvider();
  const byId = new Map();

  for (const waypoint of waypoints) {
    const [lat, lon] = waypoint.point;
    let listings = [];
    try {
      listings = await provider.search({
        lat,
        lon,
        radiusMiles: searchParams.radiusMiles,
        query: searchParams.query,
        minPrice: searchParams.minPrice,
        maxPrice: searchParams.maxPrice,
      });
    } catch (err) {
      // One waypoint failing (e.g. a transient network hiccup) shouldn't sink the whole trip search.
      console.error(`Search near mile ${waypoint.mileMarker} failed:`, err.message);
      continue;
    }

    for (const listing of listings) {
      if (!byId.has(listing.id)) {
        byId.set(listing.id, { ...listing, mileMarker: waypoint.mileMarker, waypoint: waypoint.point });
      }
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.mileMarker - b.mileMarker);
}
