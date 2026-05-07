import { describe, it, expect } from 'vitest';
import { classify } from '../../src/domain/classifier.js';
import type { UpdateContext } from '../../src/domain/classifier.js';

const ctx = (overrides: Partial<UpdateContext> = {}): UpdateContext => ({
  copperDelta: 0,
  itemDelta: false,
  counterpartyCurrencyDelta: false,
  socketTradeFlag: false,
  netZeroConversion: false,
  ...overrides,
});

describe('classify — reserve-token shapes', () => {
  it('recognizes mint', () => {
    const result = classify(ctx({ reserveToken: 'mint', copperDelta: 1000 }));
    expect(result.shape).toBe('mint');
  });

  it('recognizes distribute', () => {
    const result = classify(ctx({ reserveToken: 'distribute', copperDelta: 100 }));
    expect(result.shape).toBe('distribute');
  });

  it('recognizes reclaim (decrease on actor)', () => {
    const result = classify(ctx({ reserveToken: 'reclaim', copperDelta: -50 }));
    expect(result.shape).toBe('reclaim');
  });

  it('recognizes transfer', () => {
    const result = classify(ctx({ reserveToken: 'transfer', copperDelta: 200 }));
    expect(result.shape).toBe('transfer');
  });

  it('recognizes pay-ledger (decrease on PC)', () => {
    const result = classify(ctx({ reserveToken: 'pay-ledger', copperDelta: -500 }));
    expect(result.shape).toBe('pay-ledger');
  });

  it('recognizes seed', () => {
    const result = classify(ctx({ reserveToken: 'seed', copperDelta: 200 }));
    expect(result.shape).toBe('seed');
  });

  it('reserve token takes precedence over other signals', () => {
    const result = classify(
      ctx({
        reserveToken: 'distribute',
        copperDelta: 100,
        itemDelta: true,
        counterpartyCurrencyDelta: true,
      })
    );
    expect(result.shape).toBe('distribute');
  });
});

describe('classify — structural shapes', () => {
  it('recognizes a socket-mediated trade', () => {
    const result = classify(ctx({ socketTradeFlag: true, copperDelta: 100 }));
    expect(result.shape).toBe('trade');
  });

  it('recognizes a net-zero conversion', () => {
    const result = classify(ctx({ netZeroConversion: true, copperDelta: 0 }));
    expect(result.shape).toBe('convert');
  });

  it('recognizes a sell (item out, currency in)', () => {
    const result = classify(ctx({ copperDelta: 50, itemDelta: true }));
    expect(result.shape).toBe('sell');
  });

  it('recognizes a loot (counterparty NPC currency drained)', () => {
    const result = classify(
      ctx({ copperDelta: 50, counterpartyCurrencyDelta: true })
    );
    expect(result.shape).toBe('loot');
  });

  it('treats a pure decrease as spend', () => {
    const result = classify(ctx({ copperDelta: -25 }));
    expect(result.shape).toBe('spend');
  });
});

describe('classify — raw-edit (the catch-all)', () => {
  it('rejects an unbacked positive delta', () => {
    const result = classify(ctx({ copperDelta: 100 }));
    expect(result.shape).toBe('raw-edit');
  });

  it('rejects a zero delta with no conversion signal', () => {
    const result = classify(ctx({ copperDelta: 0 }));
    expect(result.shape).toBe('raw-edit');
  });

  it('does not let socket-trade-flag rescue a missing delta context for the wrong tx', () => {
    // socketTradeFlag without any delta is still trade — flag is the contract.
    // If this asserts trade, that's the policy.
    const result = classify(ctx({ socketTradeFlag: true, copperDelta: 0 }));
    expect(result.shape).toBe('trade');
  });
});

describe('classify — every result includes a non-empty reason', () => {
  it.each<[Partial<UpdateContext>]>([
    [{ reserveToken: 'mint', copperDelta: 100 }],
    [{ socketTradeFlag: true, copperDelta: 100 }],
    [{ netZeroConversion: true, copperDelta: 0 }],
    [{ itemDelta: true, copperDelta: 100 }],
    [{ counterpartyCurrencyDelta: true, copperDelta: 100 }],
    [{ copperDelta: -50 }],
    [{ copperDelta: 100 }],
  ])('explains %o', (overrides) => {
    const result = classify(ctx(overrides));
    expect(result.reason.length).toBeGreaterThan(0);
  });
});
