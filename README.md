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
2. **The Facebook data source** - a `FacebookProvider` that drives a real
   Chromium browser signed into *your own* Facebook account (via Playwright)
   to load Marketplace search result pages and parse them.

The provider is a pluggable interface (`server/src/marketplace/providers/`),
so you can start using the app immediately with mock data, and turn on real
Facebook data once you're comfortable with the tradeoffs below.

### Tradeoffs of the Facebook provider, read before enabling it

- **Against Facebook's Terms of Service.** Automating a browser against
  Facebook is against their ToS. This is built for personal, low-volume use
  against your own account - it does not attempt to bypass login, solve
  captchas, or evade bot detection. You take on that risk if you enable it.
  If Facebook shows a checkpoint/"suspicious activity" page, the provider
  stops and tells you rather than trying to click through it.
- **Fragile by nature.** Marketplace's HTML isn't a stable contract. Facebook
  can change it at any time and break the scraping selectors in
  `FacebookProvider.js`. That file is intentionally small and isolated so
  it's easy to patch, and it falls back to a couple of alternate signals
  (accessible label, image alt text) if the primary ones go missing.
- **Rate-limited on purpose.** Searches across waypoints run one at a time
  with a randomized delay between them (`FB_MIN_DELAY_MS`/`FB_MAX_DELAY_MS`)
  instead of firing concurrently, to keep the request pattern closer to
  normal human browsing.
- **No location precision from listings.** Marketplace doesn't expose exact
  listing coordinates, only an approximate location name. Listings are
  therefore tagged with the waypoint (and trip mile marker) they were found
  near, not an exact point on the map.

### Why there's no iPhone App Store version

This was asked for, so it's worth explaining plainly why it isn't here:

- **It's not technically possible.** iOS apps cannot launch Chromium,
  Playwright, or any other embedded browser engine to drive a multi-step
  automated login/search flow. The only web view Apple allows in an App
  Store app (WKWebView) can't do what this needs.
- **It's not something Apple allows even if it were possible.** Apps whose
  core function is automating/scraping another platform using a signed-in
  user's own credentials get rejected, and doing this against your own
  Facebook account risks that account getting flagged by Facebook too.

What you get instead, covering the same "usable from my phone, feels like an
app" goal: **the PWA install flow below** puts a real icon on your home
screen and opens full-screen, without either problem.

## Three ways to run this

| | Data | Where it runs | Best for |
|---|---|---|---|
| **1. Local dev** | mock or real FB | your laptop, `npm run dev:*` | trying it out, developing |
| **2. Self-hosted "online"** | mock or real FB | a server/VPS you control, via Docker | reaching it from your phone/anywhere |
| **3. PWA install** | (uses whichever server you point it at) | your phone's home screen | an app-like icon/launch, no App Store |

---

## Version 1: Local dev

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
and synthetic results along it) with zero setup. `APP_ACCESS_TOKEN` should be
left blank for local dev - see [Access control](#access-control) below for
when it's needed.

### Enabling real Facebook Marketplace data

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

Restart the server. Searches will now open real Marketplace search pages for
each waypoint using your saved session. If your session expires you'll see a
clear error telling you to re-run `npm run fb:login`; you can also check
`GET /api/login-status` from the running server.

---

## Version 2: Self-hosted "online" (Docker)

This runs the same app on a server you control (a VPS, a home server,
whatever), so it's reachable from your phone's browser without your laptop
needing to be on. It's still single-tenant: you're deploying it for
yourself, using your own Facebook session - not a shared service for
other people.

```bash
cp server/.env.example server/.env
# edit server/.env:
#   - set MARKETPLACE_PROVIDER=facebook if you want real data
#   - set APP_ACCESS_TOKEN (generate one with: openssl rand -hex 32)

docker compose build
docker compose up -d
```

This starts two containers:
- `server` - the API + Playwright, not published to the host directly
- `client` - nginx serving the built frontend on port `8080`, proxying
  `/api/*` to `server`

Visit `http://<your-server-ip>:8080`. Put a real reverse proxy (Caddy,
nginx, or your hosting platform's built-in one) in front of it for HTTPS if
you're exposing it to the internet - HTTPS is also required for the PWA's
service worker (offline app shell) to activate.

### Getting a Facebook session onto the server

The server has no display, so `npm run fb:login` can't run there directly.
Instead, run it **on your laptop** pointed at the deployed server:

```bash
cd server
REMOTE_SERVER_URL=https://your-server-address APP_ACCESS_TOKEN=<same token as server/.env> npm run fb:login
```

This logs you into Facebook in a browser window on your laptop as usual,
then pushes the resulting session to the server's `POST /api/fb-session`
endpoint over HTTPS, so the headless server can use it without ever needing
a screen or your password. Re-run this whenever the session expires.

### Access control

`APP_ACCESS_TOKEN` gates every `/api/*` request (except `/api/health`) behind
an `Authorization: Bearer <token>` header once it's set. It's optional for
local dev (nothing but you can reach `localhost`), but **required** once
this is reachable over a network - otherwise anyone who finds the URL can
burn your Facebook session's rate limit, see your searches, or overwrite
your session via `/api/fb-session`. The web UI will prompt you for the
token and remember it in that browser's local storage the first time it
gets a 401.

---

## Version 3: Install it like an app (PWA)

Once the app is running somewhere you can reach from your phone (Version 1
on your home Wi-Fi, or Version 2 hosted online):

- **iPhone (Safari):** open the URL → Share button → **Add to Home Screen**.
- **Android (Chrome):** open the URL → menu → **Install app** (or you'll see
  an install prompt automatically).

You get a real icon, a full-screen launch (no browser address bar), and an
offline app shell via the service worker in `client/public/sw.js` - search
results themselves always require the network, since they're live data.

---

## Project layout

```
server/   Express API: geocoding, routing (OSRM), waypoint sampling,
          marketplace provider(s), search orchestration, Dockerfile
client/   React + Vite frontend: route form, Leaflet map, results list,
          PWA manifest/icons/service worker, Dockerfile + nginx config
docker-compose.yml   wires both together for self-hosted deployment
```

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
- `POST /api/fb-session` - accepts a Playwright `storageState` JSON body and
  saves it as the server's Facebook session. Requires `APP_ACCESS_TOKEN` to
  already be set; used by `npm run fb:login` when pushing to a remote server
  (see Version 2 above), not meant to be called by the frontend.
- `GET /api/health` - always open, no token required; for uptime checks.

All routes except `/api/health` require the `Authorization: Bearer <token>`
header when `APP_ACCESS_TOKEN` is set.

## Extending

To add another data source (e.g. Craigslist, OfferUp) instead of or
alongside Facebook, implement the `MarketplaceProvider` interface in
`server/src/marketplace/providers/Provider.js` and wire it up in
`server/src/marketplace/search.js`.
