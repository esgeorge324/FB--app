const TOKEN_KEY = 'fb-route-search-access-token';

// The access token is entered by hand and kept in this browser's localStorage
// only - it is never baked into the compiled JS bundle. A token baked into a
// static build would ship to anyone who loads the page and be readable in
// plain text from the browser's dev tools, defeating the point of it.
export function getAccessToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setAccessToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore (private browsing / storage blocked) - the token just won't persist across reloads
  }
}

export class UnauthorizedError extends Error {}

async function request(path, options = {}) {
  const token = getAccessToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (res.status === 401) {
    throw new UnauthorizedError('This server requires an access token. Enter it below and try again.');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function post(path, body) {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function fetchRoute({ origin, destination }) {
  return post('/route', { origin, destination });
}

export function searchAlongRoute({ origin, destination, query, radiusMiles, minPrice, maxPrice }) {
  return post('/search', { origin, destination, query, radiusMiles, minPrice, maxPrice });
}

export function fetchLoginStatus() {
  return request('/login-status');
}
