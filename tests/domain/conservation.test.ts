import { describe, it, expect } from 'vitest';
import { audit } from '../../src/domain/conservation.js';
import type { Transaction } from '../../src/domain/transaction.js';
import type { Ledger } from '../../src/domain/ledger.js';

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: 'tx-' + Math.random().toString(36).slice(2, 9),
  timestamp: 0,
  flow: 'mint',
  fromActorId: null,
  fromLedgerId: null,
  toActorId: null,
  toLedgerId: null,
  copper: 0,
  note: undefined,
  ...overrides,
});

const ledger = (id: string): Ledger => ({
  id,
  name: id,
  persona: '',
  visibility: 'gm',
  createdAt: 0,
});

describe('audit — empty cases', () => {
  it('passes with no ledgers, no actors, no transactions', () => {
    expect(
      audit({
        ledgers: [],
        trackedActorTotals: new Map(),
        transactions: [],
      })
    ).toEqual({ ok: true });
  });

  it('passes when actors observed at 0 with no transactions', () => {
    expect(
      audit({
        ledgers: [ledger('L1')],
        trackedActorTotals: new Map([['PC1', 0]]),
        transactions: [],
      })
    ).toEqual({ ok: true });
  });

  it('flags an actor with non-zero observed but no transactions', () => {
    const result = audit({
      ledgers: [],
      trackedActorTotals: new Map([['PC1', 500]]),
      transactions: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.firstDivergence).toEqual({
        actorOrLedgerId: 'PC1',
        observedCopper: 500,
        expectedCopper: 0,
        delta: 500,
      });
    }
  });
});

describe('audit — happy paths across flow types', () => {
  it('passes after a distribute', () => {
    const txs = [
      tx({ timestamp: 1, flow: 'mint', toLedgerId: 'L1', copper: 1000 }),
      tx({ timestamp: 2, flow: 'distribute', fromLedgerId: 'L1', toActorId: 'PC1', copper: 100 }),
    ];
    expect(
      audit({
        ledgers: [ledger('L1')],
        trackedActorTotals: new Map([['PC1', 100]]),
        transactions: txs,
      })
    ).toEqual({ ok: true });
  });

  it('passes after a loot from an external NPC', () => {
    const txs = [tx({ timestamp: 1, flow: 'loot', fromActorId: 'NPC1', toActorId: 'PC1', copper: 73 })];
    expect(
      audit({
        ledgers: [],
        trackedActorTotals: new Map([['PC1', 73]]),
        transactions: txs,
      })
    ).toEqual({ ok: true });
  });

  it('passes after a sell (currency in, item out)', () => {
    const txs = [tx({ timestamp: 1, flow: 'sell', toActorId: 'PC1', copper: 17 })];
    expect(
      audit({
        ledgers: [],
        trackedActorTotals: new Map([['PC1', 17]]),
        transactions: txs,
      })
    ).toEqual({ ok: true });
  });

  it('passes after a spend (currency out)', () => {
    const txs = [
      tx({ timestamp: 1, flow: 'distribute', fromLedgerId: 'L1', toActorId: 'PC1', copper: 100 }),
      tx({ timestamp: 2, flow: 'spend', fromActorId: 'PC1', copper: 25 }),
    ];
    expect(
      audit({
        ledgers: [ledger('L1')],
        trackedActorTotals: new Map([['PC1', 75]]),
        transactions: txs,
      })
    ).toEqual({ ok: true });
  });

  it('passes after a convert (net-zero, no balance change)', () => {
    const txs = [
      tx({ timestamp: 1, flow: 'distribute', fromLedgerId: 'L1', toActorId: 'PC1', copper: 100 }),
      tx({ timestamp: 2, flow: 'convert', fromActorId: 'PC1', toActorId: 'PC1', copper: 0 }),
    ];
    expect(
      audit({
        ledgers: [ledger('L1')],
        trackedActorTotals: new Map([['PC1', 100]]),
        transactions: txs,
      })
    ).toEqual({ ok: true });
  });

  it('passes after a pay-ledger from PC to ledger', () => {
    const txs = [
      tx({ timestamp: 1, flow: 'distribute', fromLedgerId: 'L1', toActorId: 'PC1', copper: 1000 }),
      tx({ timestamp: 2, flow: 'pay-ledger', fromActorId: 'PC1', toLedgerId: 'L1', copper: 200 }),
    ];
    expect(
      audit({
        ledgers: [ledger('L1')],
        trackedActorTotals: new Map([['PC1', 800]]),
        transactions: txs,
      })
    ).toEqual({ ok: true });
  });

  it('ignores external actors (NPCs not in trackedActorTotals)', () => {
    const txs = [
      tx({ timestamp: 1, flow: 'seed', fromLedgerId: 'L1', toActorId: 'NPC1', copper: 500 }),
      tx({ timestamp: 2, flow: 'loot', fromActorId: 'NPC1', toActorId: 'PC1', copper: 500 }),
    ];
    // NPC1 not in tracked totals — its expected balance is irrelevant.
    expect(
      audit({
        ledgers: [ledger('L1')],
        trackedActorTotals: new Map([['PC1', 500]]),
        transactions: txs,
      })
    ).toEqual({ ok: true });
  });
});

describe('audit — divergence detection', () => {
  it('reports the actor and the signed delta', () => {
    const txs = [
      tx({ timestamp: 1, flow: 'distribute', fromLedgerId: 'L1', toActorId: 'PC1', copper: 100 }),
    ];
    // PC1 was supposed to have 100 but the sheet shows 150 (50 too much)
    const result = audit({
      ledgers: [ledger('L1')],
      trackedActorTotals: new Map([['PC1', 150]]),
      transactions: txs,
    });
    expect(result).toEqual({
      ok: false,
      firstDivergence: {
        actorOrLedgerId: 'PC1',
        observedCopper: 150,
        expectedCopper: 100,
        delta: 50,
      },
    });
  });

  it('reports negative delta when observed is short', () => {
    const txs = [tx({ timestamp: 1, flow: 'distribute', fromLedgerId: 'L1', toActorId: 'PC1', copper: 100 })];
    const result = audit({
      ledgers: [ledger('L1')],
      trackedActorTotals: new Map([['PC1', 80]]),
      transactions: txs,
    });
    expect(result).toEqual({
      ok: false,
      firstDivergence: {
        actorOrLedgerId: 'PC1',
        observedCopper: 80,
        expectedCopper: 100,
        delta: -20,
      },
    });
  });

  it('returns the divergence whose actor was touched first', () => {
    const txs = [
      tx({ timestamp: 1, flow: 'distribute', fromLedgerId: 'L1', toActorId: 'PC1', copper: 100 }),
      tx({ timestamp: 2, flow: 'distribute', fromLedgerId: 'L1', toActorId: 'PC2', copper: 100 }),
    ];
    // Both diverge; PC1 came first
    const result = audit({
      ledgers: [ledger('L1')],
      trackedActorTotals: new Map([
        ['PC1', 999],
        ['PC2', 888],
      ]),
      transactions: txs,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.firstDivergence.actorOrLedgerId).toBe('PC1');
    }
  });

  it('still finds an untouched actor with non-zero observed', () => {
    // PC2 never appears in transactions but has 200 on the sheet.
    const txs = [tx({ timestamp: 1, flow: 'distribute', fromLedgerId: 'L1', toActorId: 'PC1', copper: 100 })];
    const result = audit({
      ledgers: [ledger('L1')],
      trackedActorTotals: new Map([
        ['PC1', 100],
        ['PC2', 200],
      ]),
      transactions: txs,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.firstDivergence.actorOrLedgerId).toBe('PC2');
    }
  });

  it('sorts transactions by timestamp before replay', () => {
    // Out-of-order input — should still replay correctly.
    const txs = [
      tx({ timestamp: 2, flow: 'distribute', fromLedgerId: 'L1', toActorId: 'PC1', copper: 100 }),
      tx({ timestamp: 1, flow: 'mint', toLedgerId: 'L1', copper: 1000 }),
    ];
    expect(
      audit({
        ledgers: [ledger('L1')],
        trackedActorTotals: new Map([['PC1', 100]]),
        transactions: txs,
      })
    ).toEqual({ ok: true });
  });
});
