import { useState } from 'react';

export default function RouteForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    origin: '',
    destination: '',
    query: '',
    radiusMiles: 10,
    minPrice: '',
    maxPrice: '',
  });

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form className="route-form" onSubmit={handleSubmit}>
      <div className="field-row">
        <label>
          From
          <input value={form.origin} onChange={update('origin')} placeholder="Denver, CO" required />
        </label>
        <label>
          To
          <input value={form.destination} onChange={update('destination')} placeholder="Salt Lake City, UT" required />
        </label>
      </div>

      <label>
        What are you looking for?
        <input value={form.query} onChange={update('query')} placeholder="couch, kayak, dirt bike..." required />
      </label>

      <div className="field-row">
        <label>
          Search radius per stop (miles)
          <input type="number" min="1" max="50" value={form.radiusMiles} onChange={update('radiusMiles')} />
        </label>
        <label>
          Min price
          <input type="number" min="0" value={form.minPrice} onChange={update('minPrice')} placeholder="optional" />
        </label>
        <label>
          Max price
          <input type="number" min="0" value={form.maxPrice} onChange={update('maxPrice')} placeholder="optional" />
        </label>
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Searching along route...' : 'Search along route'}
      </button>
    </form>
  );
}
