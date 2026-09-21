import express from 'express';
import cors from 'cors';
import { api } from './routes/api.js';
import { config } from './config.js';
import { requireAccessToken } from './middleware/auth.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' })); // fb-session uploads (cookies + storage) can be a few hundred KB

// Health check stays open (useful for container/uptime probes); everything else is gated.
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, provider: config.marketplaceProvider, authRequired: Boolean(config.accessToken) });
});

app.use('/api', requireAccessToken, api);

if (config.marketplaceProvider === 'facebook' && !config.accessToken && process.env.NODE_ENV === 'production') {
  console.warn(
    'WARNING: running with MARKETPLACE_PROVIDER=facebook and NODE_ENV=production but no APP_ACCESS_TOKEN set. ' +
      'Anyone who can reach this server can use your Facebook session. Set APP_ACCESS_TOKEN.'
  );
}

app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port} (marketplace provider: ${config.marketplaceProvider})`);
});
