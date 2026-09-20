import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { MarketplaceProvider } from './Provider.js';
import { config } from '../../config.js';

const ITEM_HREF_RE = /\/marketplace\/item\/(\d+)/;

function randomDelay(minMs, maxMs) {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Drives a real Chromium browser signed into YOUR Facebook account (via a
 * previously saved session, see scripts/fbLogin.js) to load Marketplace
 * search results near a given point.
 *
 * Important limits, by design:
 *  - Uses your own logged-in session only. It never attempts to bypass
 *    login, solve captchas, or work around bot detection.
 *  - Requests are serialized with a randomized delay between them
 *    (config.fb.minDelayMs..maxDelayMs) to stay well within normal,
 *    human-paced browsing rather than hammering Facebook's servers.
 *  - Facebook's Marketplace markup is not a stable public API and can
 *    change at any time, which will break the selectors below. This is
 *    an inherent tradeoff of not having an official Marketplace search
 *    API to call instead.
 *  - Using automation against Facebook this way is against Facebook's
 *    Terms of Service. This is intended for personal, low-volume use
 *    against your own account; you take on that risk by enabling it.
 */
export class FacebookProvider extends MarketplaceProvider {
  #browser = null;
  #context = null;
  #lastRequestAt = 0;

  async #ensureContext() {
    if (this.#context) return this.#context;

    if (!existsSync(config.fb.storageStatePath)) {
      throw new Error(
        `No saved Facebook session found at ${config.fb.storageStatePath}. ` +
          'Run "npm run fb:login" first (from a machine with a real display) to log in once and save your session.'
      );
    }

    this.#browser = await chromium.launch({ headless: config.fb.headless });
    this.#context = await this.#browser.newContext({
      storageState: config.fb.storageStatePath,
      viewport: { width: 1280, height: 900 },
    });
    return this.#context;
  }

  async #throttle() {
    const elapsed = Date.now() - this.#lastRequestAt;
    const minGap = config.fb.minDelayMs;
    if (this.#lastRequestAt !== 0 && elapsed < minGap) {
      await randomDelay(minGap - elapsed, config.fb.maxDelayMs - elapsed);
    }
    this.#lastRequestAt = Date.now();
  }

  buildSearchUrl({ lat, lon, radiusMiles, query, minPrice, maxPrice }) {
    const url = new URL('https://www.facebook.com/marketplace/search');
    url.searchParams.set('query', query);
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('radius', String(Math.max(1, Math.round(radiusMiles))));
    url.searchParams.set('exact', 'false');
    if (minPrice) url.searchParams.set('minPrice', String(minPrice));
    if (maxPrice) url.searchParams.set('maxPrice', String(maxPrice));
    return url.toString();
  }

  async search(params) {
    const context = await this.#ensureContext();
    await this.#throttle();

    const page = await context.newPage();
    try {
      const url = this.buildSearchUrl(params);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.fb.navTimeoutMs });

      if (/\/login/.test(page.url())) {
        throw new Error(
          'Facebook redirected to the login page - your saved session has expired. Re-run "npm run fb:login".'
        );
      }

      try {
        await page.waitForSelector('a[href*="/marketplace/item/"]', { timeout: 10000 });
      } catch {
        // No results (or the page layout changed) - return an empty list rather than throwing,
        // since a genuinely empty search area is a normal outcome for route search.
        return [];
      }

      return await page.$$eval('a[href*="/marketplace/item/"]', (anchors) => {
        const seen = new Set();
        const out = [];

        for (const a of anchors) {
          const href = a.getAttribute('href') || '';
          const match = href.match(/\/marketplace\/item\/(\d+)/);
          if (!match) continue;
          const id = match[1];
          if (seen.has(id)) continue;
          seen.add(id);

          const texts = Array.from(a.querySelectorAll('span'))
            .map((el) => el.textContent?.trim())
            .filter(Boolean);

          const priceText = texts.find((t) => /^\$[\d,]+|^Free$/i.test(t)) || '';
          const remaining = texts.filter((t) => t !== priceText);
          const title = remaining[0] || '';
          const locationText = remaining.length > 1 ? remaining[remaining.length - 1] : null;
          const img = a.querySelector('img');

          out.push({
            id,
            title,
            priceText,
            price: priceText.replace(/[^0-9.]/g, '') ? Number(priceText.replace(/[^0-9.]/g, '')) : null,
            url: href.startsWith('http') ? href : `https://www.facebook.com${href}`,
            thumbnail: img?.getAttribute('src') || null,
            locationText,
          });
        }

        return out;
      });
    } finally {
      await page.close();
    }
  }

  async close() {
    await this.#context?.close();
    await this.#browser?.close();
    this.#context = null;
    this.#browser = null;
  }

  /** Loads the marketplace home page and reports whether the saved session is still logged in. */
  async checkLogin() {
    if (!existsSync(config.fb.storageStatePath)) {
      return { loggedIn: false, reason: 'no-saved-session' };
    }
    const context = await this.#ensureContext();
    const page = await context.newPage();
    try {
      await page.goto('https://www.facebook.com/marketplace/', {
        waitUntil: 'domcontentloaded',
        timeout: config.fb.navTimeoutMs,
      });
      const loggedIn = !/\/login/.test(page.url());
      return { loggedIn, reason: loggedIn ? null : 'redirected-to-login' };
    } finally {
      await page.close();
    }
  }
}
