/**
 * Generic in-memory TTL cache (pure — no framework imports).
 *
 * Backs the read-through Settings cache (design §11: "Settings + materials cached
 * in-memory, 5-min TTL") and is reusable for any hot config/read path. Entries expire
 * lazily: a `get` on an expired key evicts it and returns `undefined`. The clock is
 * injectable so unit tests can drive expiry deterministically.
 */

export class TTLCache {
  /**
   * @param {{ ttlMs?: number, clock?: () => number }} [options]
   */
  constructor({ ttlMs = 5 * 60 * 1000, clock = Date.now } = {}) {
    this.ttlMs = ttlMs;
    this.clock = clock;
    /** @type {Map<string, { value: *, expiresAt: number }>} */
    this.store = new Map();
  }

  /**
   * @param {string} key
   * @returns {* | undefined} cached value, or undefined when missing/expired.
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (this.clock() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /** @param {string} key @param {*} value @returns {*} the stored value */
  set(key, value) {
    this.store.set(key, { value, expiresAt: this.clock() + this.ttlMs });
    return value;
  }

  /** @param {string} key */
  has(key) {
    return this.get(key) !== undefined;
  }

  /** @param {string} key @returns {boolean} true when an entry was removed */
  delete(key) {
    return this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  get size() {
    return this.store.size;
  }
}

export default TTLCache;
