/**
 * @typedef {Object} Listing
 * @property {string} id - Stable identifier for dedupe (e.g. the marketplace item id).
 * @property {string} title
 * @property {number|null} price - Numeric price if parseable, else null.
 * @property {string} priceText - Raw price string as shown ("$150", "Free", etc).
 * @property {string} url - Link to the listing.
 * @property {string|null} thumbnail - Image URL, if available.
 * @property {string|null} locationText - Location label as shown on the listing.
 *
 * @typedef {Object} SearchParams
 * @property {number} lat
 * @property {number} lon
 * @property {number} radiusMiles
 * @property {string} query
 * @property {number} [minPrice]
 * @property {number} [maxPrice]
 *
 * Base class documenting the provider contract. A provider turns one
 * "search near this point" request into a list of Listings.
 */
export class MarketplaceProvider {
  /**
   * @param {SearchParams} params
   * @returns {Promise<Listing[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async search(params) {
    throw new Error('search() not implemented');
  }

  async close() {
    // Optional cleanup hook (e.g. closing a browser). No-op by default.
  }
}
