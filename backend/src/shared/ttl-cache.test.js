import { describe, it, expect } from 'vitest';
import { TTLCache } from './ttl-cache.js';

describe('TTLCache', () => {
  it('stores and returns values, and reports presence', () => {
    const cache = new TTLCache({ ttlMs: 1000, clock: () => 0 });
    expect(cache.get('a')).toBeUndefined();
    expect(cache.has('a')).toBe(false);

    cache.set('a', { x: 1 });
    expect(cache.get('a')).toEqual({ x: 1 });
    expect(cache.has('a')).toBe(true);
    expect(cache.size).toBe(1);
  });

  it('evicts expired entries on read (lazy expiry)', () => {
    let now = 0;
    const cache = new TTLCache({ ttlMs: 1000, clock: () => now });

    cache.set('a', 'v');
    expect(cache.get('a')).toBe('v');

    now = 999; // still valid (not yet >= expiresAt)
    expect(cache.get('a')).toBe('v');

    now = 1000; // expired exactly
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
    expect(cache.has('a')).toBe(false);
  });

  it('keeps independent entries on their own expiry times', () => {
    let now = 0;
    const cache = new TTLCache({ ttlMs: 1000, clock: () => now });

    cache.set('a', 1);
    now = 500;
    cache.set('b', 2);

    now = 1100;
    expect(cache.get('a')).toBeUndefined(); // a expired
    expect(cache.get('b')).toBe(2); // b still fresh
  });

  it('delete removes an entry and reports whether it existed', () => {
    const cache = new TTLCache({ ttlMs: 1000, clock: () => 0 });
    cache.set('a', 1);

    expect(cache.delete('missing')).toBe(false);
    expect(cache.delete('a')).toBe(true);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('clear removes every entry', () => {
    const cache = new TTLCache({ ttlMs: 1000, clock: () => 0 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });

  it('honors a custom TTL', () => {
    let now = 0;
    const cache = new TTLCache({ ttlMs: 5, clock: () => now });
    cache.set('a', 'v');
    now = 4;
    expect(cache.get('a')).toBe('v');
    now = 5;
    expect(cache.get('a')).toBeUndefined();
  });

  it('defaults to a 5-minute TTL with the real clock', () => {
    const cache = new TTLCache();
    cache.set('a', 'v');
    expect(cache.get('a')).toBe('v');
  });
});
