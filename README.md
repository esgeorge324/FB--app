# Route Marketplace Search

Search Facebook Marketplace along an entire road-trip route, not just around
one fixed location. You give it a start and end point; it plots the driving
route, samples waypoints every N miles along it, runs a Marketplace search
around each waypoint, and returns a deduped list of listings tagged with how
far into the trip they are.

## Why this isn't a simple "call the Facebook API" app

Facebook does not offer a public API for searching Marketplace listings.
There's no key you can request that gives you programmatic search access.
Because of that, this project is built as two separable pieces:

1. **The route-search engine** (geocoding, routing, waypoint sampling, dedupe,
   the map/results UI) - this is fully real and works today with no Facebook
   account at all, using a `MockProvider` that returns synthetic listings.
2. **The Facebook data source** - a `FacebookProvider` that drives a real,
   headless Chromium browser signed into *your own* Facebook account (via
   Playwright) to load Marketplace search result pages and parse them.

The provider is a pluggable interface (`server/src/marketplace/providers/`),
so you can start using the app immediately with mock data, and turn on real
Facebook data once you're comfortable with the tradeoffs below.

### Tradeoffs of the Facebook provider, read before enabling it

- **Against Facebook's Terms of Service.** Automating a browser against
  Facebook is against their ToS. This is built for personal, low-volume use
  against your own account - it does not attempt to bypass login, solve
  captchas, or evade bot detection. You take on that risk if you enable it.
- **Fragile by nature.** Marketplace's HTML isn't a stable contract. Facebook
  can change it at any time and break the scraping selectors in
  `FacebookProvider.js`. That file is intentionally small and isolated so
  it's easy to patch.
- **Rate-limited on purpose.** Searches across waypoints run one at a time
  with a randomized delay between them (`FB_MIN_DELAY_MS`/`FB_MAX_DELAY_MS`)
  instead of firing concurrently, to keep the request pattern closer to
  normal human browsing.
- **No location precision from listings.** Marketplace doesn't expose exact
  listing coordinates, only an approximate location name. Listings are
  therefore tagged with the waypoint (and trip mile marker) they were found
  near, not an exact point on the map.

## Project layout

```
server/   Express API: geocoding, routing (OSRM), waypoint sampling,
          marketplace provider(s), search orchestration
client/   React + Vite frontend: route form, Leaflet map, results list
```

## Setup

```bash
npm install          # installs both workspaces
cp server/.env.example server/.env
```

Run the backend and frontend in two terminals:

```bash
npm run dev:server   # http://localhost:3001
npm run dev:client   # http://localhost:5173 (proxies /api to the server)
```

By default `MARKETPLACE_PROVIDER=mock` in `server/.env`, so you can try the
whole flow (enter a start/end city, a search term, see the route on the map
and synthetic results along it) with zero setup.

## Enabling real Facebook Marketplace data

This requires a machine with a real display (your own laptop, not a headless
cloud sandbox) for the one-time login step.

```bash
cd server
npm run fb:login
```

This opens a visible Chromium window pointed at the Facebook login page. Log
in normally (the script never sees your password - it only saves the
resulting session cookies to `server/.data/fb-storage-state.json`, which is
git-ignored). Once you've logged in, press Enter in the terminal to save the
session.

Then in `server/.env`:

```
MARKETPLACE_PROVIDER=facebook
```

Restart the server. Searches will now open real Marketplace search pages
(`https://www.facebook.com/marketplace/search?query=...&latitude=...`) for
each waypoint using your saved session. If your session expires you'll see a
clear error telling you to re-run `npm run fb:login`; you can also check
`GET /api/login-status` from the running server.

## How waypoint sampling works

`server/src/geo/waypoints.js` walks the route polyline returned by OSRM and
picks a point every `WAYPOINT_INTERVAL_MILES` (default 25), capped at
`MAX_WAYPOINTS` (default 15) so a cross-country trip doesn't turn into
hundreds of searches. If the interval would exceed the cap, it's widened
automatically to fit. Both are configurable in `server/.env`.

## API

- `POST /api/route` - `{ origin, destination }` → geocoded endpoints, route
  polyline, sampled waypoints.
- `POST /api/search` - `{ origin, destination, query, radiusMiles, minPrice?,
  maxPrice? }` → the above plus deduped `listings`, each tagged with
  `mileMarker` (how far into the trip it was found).
- `GET /api/login-status` - reports whether the saved Facebook session (if
  using the `facebook` provider) is still valid.

## Extending

To add another data source (e.g. Craigslist, OfferUp) instead of or
alongside Facebook, implement the `MarketplaceProvider` interface in
`server/src/marketplace/providers/Provider.js` and wire it up in
`server/src/marketplace/search.js`.
