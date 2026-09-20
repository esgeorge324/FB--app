import { haversineMiles } from './distance.js';

// Walks the route polyline and samples points at roughly even mile intervals,
// always including the start and end. Caps the number of waypoints so a long
// trip doesn't turn into hundreds of marketplace searches.
export function sampleWaypoints(routePoints, { intervalMiles, maxWaypoints }) {
  if (routePoints.length === 0) return [];
  if (routePoints.length === 1) {
    return [{ point: routePoints[0], mileMarker: 0 }];
  }

  // Cumulative distance (miles) at each point along the route.
  const cumulative = [0];
  for (let i = 1; i < routePoints.length; i++) {
    cumulative.push(cumulative[i - 1] + haversineMiles(routePoints[i - 1], routePoints[i]));
  }
  const totalMiles = cumulative[cumulative.length - 1];

  // If the interval would produce more than maxWaypoints, widen it so we stay under the cap.
  const minIntervalForCap = totalMiles / Math.max(maxWaypoints - 1, 1);
  const effectiveInterval = Math.max(intervalMiles, minIntervalForCap, 0.1);

  const waypoints = [];
  let nextTarget = 0;
  let cursor = 0;

  for (let target = nextTarget; target <= totalMiles + 1e-6; target += effectiveInterval) {
    while (cursor < cumulative.length - 1 && cumulative[cursor + 1] < target) {
      cursor++;
    }
    const segStart = cumulative[cursor];
    const segEnd = cumulative[Math.min(cursor + 1, cumulative.length - 1)];
    const segLen = segEnd - segStart || 1;
    const t = Math.min(Math.max((target - segStart) / segLen, 0), 1);

    const [lat1, lon1] = routePoints[cursor];
    const [lat2, lon2] = routePoints[Math.min(cursor + 1, routePoints.length - 1)];
    const lat = lat1 + (lat2 - lat1) * t;
    const lon = lon1 + (lon2 - lon1) * t;

    waypoints.push({ point: [lat, lon], mileMarker: Math.round(target * 10) / 10 });
  }

  // Always make sure the final point of the route is represented.
  const last = waypoints[waypoints.length - 1];
  if (!last || totalMiles - last.mileMarker > 0.5) {
    waypoints.push({ point: routePoints[routePoints.length - 1], mileMarker: Math.round(totalMiles * 10) / 10 });
  }

  return waypoints.slice(0, maxWaypoints);
}
