import { useEffect, useState } from 'react';
import RouteForm from './components/RouteForm.jsx';
import MapView from './components/MapView.jsx';
import ResultsList from './components/ResultsList.jsx';
import { searchAlongRoute, fetchLoginStatus } from './api.js';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [providerStatus, setProviderStatus] = useState(null);
  const [radiusMiles, setRadiusMiles] = useState(10);

  useEffect(() => {
    fetchLoginStatus().then(setProviderStatus).catch(() => {});
  }, []);

  async function handleSubmit(form) {
    setLoading(true);
    setError(null);
    setResult(null);
    setRadiusMiles(Number(form.radiusMiles) || 10);
    try {
      const data = await searchAlongRoute({
        origin: form.origin,
        destination: form.destination,
        query: form.query,
        radiusMiles: form.radiusMiles,
        minPrice: form.minPrice || undefined,
        maxPrice: form.maxPrice || undefined,
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Route Marketplace Search</h1>
        <p className="subtitle">Find Marketplace listings along the way, not just near home.</p>
        {providerStatus?.provider === 'mock' && (
          <p className="banner">
            Running with synthetic demo data (MARKETPLACE_PROVIDER=mock). See the README to connect your own Facebook
            session for real results.
          </p>
        )}
        {providerStatus?.provider === 'facebook' && providerStatus.loggedIn === false && (
          <p className="banner banner-warn">
            Your saved Facebook session isn't logged in ({providerStatus.reason}). Run <code>npm run fb:login</code> again.
          </p>
        )}
      </header>

      <RouteForm onSubmit={handleSubmit} loading={loading} />

      {error && <p className="error">{error}</p>}

      <MapView routePoints={result?.routePoints} waypoints={result?.waypoints} radiusMiles={radiusMiles} />

      <ResultsList listings={result?.listings} distanceMiles={result?.distanceMiles} />
    </div>
  );
}
