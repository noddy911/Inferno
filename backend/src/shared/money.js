/**
 * Integer minor-unit money arithmetic (design §5.1).
 *
 * All monetary values inside engines are integer paise to avoid float drift. Rates and
 * quantities enter as ordinary numbers; each line amount is rounded ONCE (round-half-up)
 * when it is computed, and sums are exact integer additions. `toMajor()` converts back
 * to rupees (2 dp) only at the boundary — the domain engines never format.
 */

/** Round a rupee value up to the nearest paisa (2 dp, round-half-up). */
export function toMinor(rupees) {
  return Math.round(rupees * 100);
}

/** Convert integer paise back to a rupee float (2 dp by construction). */
export function toMajor(paise) {
  return paise / 100;
}

/** `paise × percent / 100`, rounded once. */
export function pctOf(paise, percent) {
  return Math.round((paise * percent) / 100);
}

/** `paise × factor`, rounded once (used for the `1 + margin%` markup). */
export function mulOf(paise, factor) {
  return Math.round(paise * factor);
}

/** Exact sum of integer paise values. */
export function sumOf(values) {
  return values.reduce((acc, v) => acc + v, 0);
}
