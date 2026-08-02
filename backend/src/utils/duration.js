const FACTORS = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };

/**
 * Parse a duration string like "15m", "7d", "1h" into milliseconds.
 * @param {string|number} value
 * @returns {number} milliseconds
 */
export function parseDuration(value) {
  const match = /^(\d+)\s*(ms|s|m|h|d|w)?$/.exec(String(value));
  if (!match) throw new Error(`Invalid duration: ${value}`);
  const number = Number(match[1]);
  const unit = match[2] || 'ms';
  return number * FACTORS[unit];
}

export default parseDuration;
