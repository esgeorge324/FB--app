async function post(path, body) {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export function fetchRoute({ origin, destination }) {
  return post('/route', { origin, destination });
}

export function searchAlongRoute({ origin, destination, query, radiusMiles, minPrice, maxPrice }) {
  return post('/search', { origin, destination, query, radiusMiles, minPrice, maxPrice });
}

export async function fetchLoginStatus() {
  const res = await fetch('/api/login-status');
  return res.json();
}
