import { useState } from 'react';
import { setAccessToken } from '../api.js';

// Only shown after a request comes back 401, i.e. only on deployments where
// APP_ACCESS_TOKEN is set server-side (local mock dev never hits this).
export default function AccessTokenGate({ onSaved }) {
  const [value, setValue] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setAccessToken(value.trim());
    onSaved();
  }

  return (
    <div className="token-gate">
      <form onSubmit={handleSubmit}>
        <label>
          This server requires an access token
          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste your APP_ACCESS_TOKEN"
            autoFocus
          />
        </label>
        <button type="submit">Save & retry</button>
      </form>
    </div>
  );
}
