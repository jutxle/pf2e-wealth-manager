import { describe, it, expect } from 'vitest';
import {
  computeBalance,
  listTransactions,
} from '../../src/domain/ledger.js';
import type { Transaction } from '../../src/domain/transaction.js';

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

describe('computeBalance', () => {
  it('returns 0 for an empty transaction list', () => {
    expect(computeBalance('L1', [])).toBe(0);
  });

  it('credits the ledger on mint', () => {
    const txs = [tx({ flow: 'mint', toLedgerId: 'L1', copper: 500 })];
    expect(computeBalance('L1', txs)).toBe(500);
  });

  it('debits the ledger on distribute', () => {
    const txs = [
      tx({ flow: 'mint', toLedgerId: 'L1', copper: 500 }),
      tx({ flow: 'distribute', fromLedgerId: 'L1', toActorId: 'A1', copper: 100 }),
    ];
    expect(computeBalance('L1', txs)).toBe(400);
  });

  it('credits the ledger on reclaim', () => {
    const txs = [
      tx({ flow: 'reclaim', fromActorId: 'A1', toLedgerId: 'L1', copper: 50 }),
    ];
    expect(computeBalance('L1', txs)).toBe(50);
  });

  it('credits the ledger on pay-ledger', () => {
    const txs = [
      tx({ flow: 'pay-ledger', fromActorId: 'A1', toLedgerId: 'L1', copper: 75 }),
    ];
    expect(computeBalance('L1', txs)).toBe(75);
  });

  it('debits the ledger on seed (out to NPC)', () => {
    const txs = [
      tx({ flow: 'mint', toLedgerId: 'L1', copper: 1000 }),
      tx({ flow: 'seed', fromLedgerId: 'L1', toActorId: 'NPC1', copper: 200 }),
    ];
    expect(computeBalance('L1', txs)).toBe(800);
  });

  it('handles transfers symmetrically across two ledgers', () => {
    const txs = [
      tx({ flow: 'mint', toLedgerId: 'L1', copper: 1000 }),
      tx({ flow: 'transfer', fromLedgerId: 'L1', toLedgerId: 'L2', copper: 300 }),
    ];
    expect(computeBalance('L1', txs)).toBe(700);
    expect(computeBalance('L2', txs)).toBe(300);
  });

  it('ignores transactions for other ledgers', () => {
    const txs = [
      tx({ flow: 'mint', toLedgerId: 'L1', copper: 500 }),
      tx({ flow: 'mint', toLedgerId: 'L2', copper: 999 }),
    ];
    expect(computeBalance('L1', txs)).toBe(500);
  });

  it('ignores transactions that do not touch any ledger', () => {
    const txs = [
      tx({ flow: 'loot', fromActorId: 'NPC1', toActorId: 'PC1', copper: 100 }),
      tx({ flow: 'sell', toActorId: 'PC1', copper: 50 }),
      tx({ flow: 'spend', fromActorId: 'PC1', copper: 25 }),
      tx({ flow: 'convert', toActorId: 'PC1', fromActorId: 'PC1', copper: 0 }),
    ];
    expect(computeBalance('L1', txs)).toBe(0);
  });

  it('does not mutate the input array', () => {
    const txs = [tx({ flow: 'mint', toLedgerId: 'L1', copper: 100 })];
    const snapshot = JSON.stringify(txs);
    computeBalance('L1', txs);
    expect(JSON.stringify(txs)).toBe(snapshot);
  });
});

describe('listTransactions', () => {
  const sample: Transaction[] = [
    tx({ id: 't1', flow: 'mint', toLedgerId: 'L1', copper: 1000 }),
    tx({ id: 't2', flow: 'distribute', fromLedgerId: 'L1', toActorId: 'PC1', copper: 100 }),
    tx({ id: 't3', flow: 'distribute', fromLedgerId: 'L1', toActorId: 'PC2', copper: 100 }),
    tx({ id: 't4', flow: 'loot', fromActorId: 'NPC1', toActorId: 'PC1', copper: 50 }),
    tx({ id: 't5', flow: 'transfer', fromLedgerId: 'L1', toLedgerId: 'L2', copper: 200 }),
    tx({ id: 't6', flow: 'sell', toActorId: 'PC2', copper: 30 }),
  ];

  it('returns all transactions when no filter is given', () => {
    expect(listTransactions({}, sample)).toEqual(sample);
  });

  it('filters by ledger (matches from or to)', () => {
    const result = listTransactions({ ledgerId: 'L1' }, sample);
    expect(result.map((t) => t.id)).toEqual(['t1', 't2', 't3', 't5']);
  });

  it('filters by ledger matching only the destination', () => {
    const result = listTransactions({ ledgerId: 'L2' }, sample);
    expect(result.map((t) => t.id)).toEqual(['t5']);
  });

  it('filters by actor (matches from or to)', () => {
    const result = listTransactions({ actorId: 'PC1' }, sample);
    expect(result.map((t) => t.id)).toEqual(['t2', 't4']);
  });

  it('filters by a single flow type', () => {
    const result = listTransactions({ flow: 'distribute' }, sample);
    expect(result.map((t) => t.id)).toEqual(['t2', 't3']);
  });

  it('filters by an array of flow types', () => {
    const result = listTransactions({ flow: ['loot', 'sell'] }, sample);
    expect(result.map((t) => t.id)).toEqual(['t4', 't6']);
  });

  it('combines filters with AND semantics', () => {
    const result = listTransactions(
      { ledgerId: 'L1', flow: 'distribute', actorId: 'PC2' },
      sample
    );
    expect(result.map((t) => t.id)).toEqual(['t3']);
  });

  it('returns an empty array when nothing matches', () => {
    expect(listTransactions({ ledgerId: 'nonexistent' }, sample)).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const snapshot = JSON.stringify(sample);
    listTransactions({ ledgerId: 'L1' }, sample);
    expect(JSON.stringify(sample)).toBe(snapshot);
  });
});
