import express from 'express';
import cors from 'cors';
import { api } from './routes/api.js';
import { config } from './config.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', api);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, provider: config.marketplaceProvider });
});

app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port} (marketplace provider: ${config.marketplaceProvider})`);
});
