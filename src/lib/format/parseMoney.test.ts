import { describe, it, expect } from 'vitest';
import { parseDollarsToCents } from './parseMoney';

describe('parseDollarsToCents', () => {
  it('convertit des entiers', () => {
    expect(parseDollarsToCents('320')).toBe(32000);
  });
  it('convertit avec virgule décimale (fr-CA)', () => {
    expect(parseDollarsToCents('19,99')).toBe(1999);
  });
  it('convertit avec point décimal', () => {
    expect(parseDollarsToCents('19.99')).toBe(1999);
  });
  it('gère les séparateurs de milliers', () => {
    expect(parseDollarsToCents('1 234,50')).toBe(123450);
  });
  it('neutralise les pièges de flottant', () => {
    // 0.1 + 0.2 en flottant = 0.30000000000000004
    expect(parseDollarsToCents('0,30')).toBe(30);
    expect(parseDollarsToCents('29,99')).toBe(2999);
  });
  it('retourne null pour entrée invalide', () => {
    expect(parseDollarsToCents('abc')).toBeNull();
    expect(parseDollarsToCents('')).toBeNull();
  });
});
