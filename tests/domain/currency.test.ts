import { describe, it, expect } from 'vitest';
import {
  toCopper,
  fromCopper,
  addCopper,
  subtractCopper,
  splitEvenly,
} from '../../src/domain/currency.js';

describe('toCopper', () => {
  it('treats an empty parts object as zero', () => {
    expect(toCopper({})).toBe(0);
  });

  it('sums copper, silver, gold, and platinum', () => {
    // PF2E Remaster: 1 pp = 10 gp, 1 gp = 10 sp, 1 sp = 10 cp.
    expect(toCopper({ cp: 1 })).toBe(1);
    expect(toCopper({ sp: 1 })).toBe(10);
    expect(toCopper({ gp: 1 })).toBe(100);
    expect(toCopper({ pp: 1 })).toBe(1000);
    expect(toCopper({ pp: 2, gp: 3, sp: 4, cp: 5 })).toBe(2345);
  });

  it('rejects negative components', () => {
    expect(() => toCopper({ gp: -1 })).toThrow();
  });

  it('rejects non-integer components', () => {
    expect(() => toCopper({ gp: 1.5 })).toThrow();
  });
});

describe('fromCopper', () => {
  it('produces the canonical (no overflow) decomposition', () => {
    expect(fromCopper(0)).toEqual({ pp: 0, gp: 0, sp: 0, cp: 0 });
    expect(fromCopper(1)).toEqual({ pp: 0, gp: 0, sp: 0, cp: 1 });
    expect(fromCopper(10)).toEqual({ pp: 0, gp: 0, sp: 1, cp: 0 });
    expect(fromCopper(100)).toEqual({ pp: 0, gp: 1, sp: 0, cp: 0 });
    expect(fromCopper(1000)).toEqual({ pp: 1, gp: 0, sp: 0, cp: 0 });
    expect(fromCopper(2345)).toEqual({ pp: 2, gp: 3, sp: 4, cp: 5 });
  });

  it('rejects negative input', () => {
    expect(() => fromCopper(-1)).toThrow();
  });

  it('rejects non-integer input', () => {
    expect(() => fromCopper(1.5)).toThrow();
  });
});

describe('toCopper / fromCopper round-trip', () => {
  it.each([0, 1, 9, 10, 99, 100, 999, 1000, 12345, 1_000_000])(
    'survives %i copper round-trip',
    (cp) => {
      expect(toCopper(fromCopper(cp))).toBe(cp);
    }
  );
});

describe('addCopper', () => {
  it('sums two non-negative integers', () => {
    expect(addCopper(0, 0)).toBe(0);
    expect(addCopper(100, 250)).toBe(350);
  });

  it('rejects negative inputs', () => {
    expect(() => addCopper(-1, 0)).toThrow();
    expect(() => addCopper(0, -1)).toThrow();
  });

  it('rejects non-integer inputs', () => {
    expect(() => addCopper(1.5, 0)).toThrow();
  });
});

describe('subtractCopper', () => {
  it('subtracts when the result is non-negative', () => {
    expect(subtractCopper(100, 0)).toBe(100);
    expect(subtractCopper(100, 100)).toBe(0);
    expect(subtractCopper(250, 100)).toBe(150);
  });

  it('throws when the result would be negative', () => {
    expect(() => subtractCopper(100, 101)).toThrow();
  });

  it('rejects negative inputs', () => {
    expect(() => subtractCopper(-1, 0)).toThrow();
    expect(() => subtractCopper(0, -1)).toThrow();
  });
});

describe('splitEvenly', () => {
  it('splits exactly when the total divides cleanly', () => {
    expect(splitEvenly(100, 4)).toEqual({
      shares: [25, 25, 25, 25],
      remainder: 0,
    });
  });

  it('puts the remainder aside instead of distributing it', () => {
    // 101 / 4 = 25 each, 1 left over for the party actor.
    expect(splitEvenly(101, 4)).toEqual({
      shares: [25, 25, 25, 25],
      remainder: 1,
    });
  });

  it('handles a single recipient', () => {
    expect(splitEvenly(47, 1)).toEqual({ shares: [47], remainder: 0 });
  });

  it('handles zero total', () => {
    expect(splitEvenly(0, 4)).toEqual({
      shares: [0, 0, 0, 0],
      remainder: 0,
    });
  });

  it('throws when n is zero', () => {
    expect(() => splitEvenly(100, 0)).toThrow();
  });

  it('throws when n is negative', () => {
    expect(() => splitEvenly(100, -1)).toThrow();
  });

  it('throws when total is negative', () => {
    expect(() => splitEvenly(-1, 4)).toThrow();
  });

  it('throws when total or n is non-integer', () => {
    expect(() => splitEvenly(1.5, 4)).toThrow();
    expect(() => splitEvenly(100, 4.5)).toThrow();
  });

  it('handles large values without precision loss', () => {
    const big = 10_000_000;
    const result = splitEvenly(big, 7);
    expect(result.shares.reduce((a, b) => a + b, 0) + result.remainder).toBe(big);
  });
});
