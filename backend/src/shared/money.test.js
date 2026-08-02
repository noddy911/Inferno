import { describe, it, expect } from 'vitest';
import { toMinor, toMajor, pctOf, mulOf, sumOf } from './money.js';

describe('money — minor-unit conversion', () => {
  it('converts rupees to integer paise without drift', () => {
    expect(toMinor(1234.56)).toBe(123456);
    expect(toMinor(0.1)).toBe(10);
    expect(toMinor(0.01)).toBe(1);
    expect(toMinor(42)).toBe(4200);
  });

  it('converts paise back to 2-dp rupees', () => {
    expect(toMajor(123456)).toBe(1234.56);
    expect(toMajor(10)).toBe(0.1);
  });
});

describe('money — percentage and factor math (round-half-up, single round)', () => {
  it('computes percentages with round-half-up', () => {
    expect(pctOf(10000, 18)).toBe(1800);
    expect(pctOf(25, 18)).toBe(5); // 4.5 → 5
    expect(pctOf(10, 50)).toBe(5);
  });

  it('multiplies by a factor (markup) rounding once', () => {
    expect(mulOf(10000, 1.25)).toBe(12500);
    expect(mulOf(3394008, 1.25)).toBe(4242510);
  });

  it('sums integer paise exactly', () => {
    expect(sumOf([1, 2, 3])).toBe(6);
    expect(sumOf([2142000, 348400, 690000])).toBe(3180400);
  });
});
