/**
 * Lightweight in-memory TTL Cache
 * Provides high-performance caching for non-sensitive aggregate dashboard stats
 */
class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  /**
   * Set a key with a TTL in milliseconds
   * @param {string} key
   * @param {*} value
   * @param {number} ttlMs (default 30000ms = 30s)
   */
  set(key, value, ttlMs = 30000) {
    const expiresAt = Date.now() + ttlMs;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Get a cached value if not expired
   * @param {string} key
   * @returns {*|null}
   */
  get(key) {
    const item = this.store.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Delete a key or prefix
   * @param {string} keyOrPrefix
   */
  del(keyOrPrefix) {
    if (this.store.has(keyOrPrefix)) {
      this.store.delete(keyOrPrefix);
      return;
    }
    // Delete by prefix
    for (const key of this.store.keys()) {
      if (key.startsWith(keyOrPrefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all cached keys
   */
  clear() {
    this.store.clear();
  }
}

const dashboardCache = new MemoryCache();

module.exports = {
  dashboardCache
};
