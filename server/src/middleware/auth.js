import crypto from 'node:crypto';
import { config } from '../config.js';

function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Gates every /api request behind APP_ACCESS_TOKEN when it's configured.
 * With no token configured (the local-dev default), this is a no-op -
 * anyone who can reach localhost:3001 can use the API, same as before.
 * Once you deploy this somewhere reachable over the network, set
 * APP_ACCESS_TOKEN so randos on the internet can't use your Facebook
 * session or overwrite it via /api/fb-session.
 */
export function requireAccessToken(req, res, next) {
  if (!config.accessToken) return next();

  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token || !safeEqual(token, config.accessToken)) {
    return res.status(401).json({ error: 'Missing or invalid access token' });
  }

  next();
}
