import { describe, it, expect } from 'vitest';
import { migrate } from '../../src/store/migration.js';

const params = {
  worldName: 'Crimson Skies',
  now: 1714_000_000_000,
  idGenerator: () => 'fixed-id',
};

describe('migrate', () => {
  it('creates a default ledger on first install', () => {
    const result = migrate({}, params);
    expect(result.schemaVersion).toBe(1);
    expect(result.transactions).toEqual([]);
    expect(result.ledgers).toHaveLength(1);
    expect(result.ledgers[0]).toEqual({
      id: 'fixed-id',
      name: 'Crimson Skies',
      persona: '',
      visibility: 'gm',
      createdAt: params.now,
    });
  });

  it('is idempotent when schemaVersion is already current', () => {
    const existing = {
      schemaVersion: 1,
      ledgers: [
        { id: 'L1', name: 'Existing', persona: 'p', visibility: 'gm' as const, createdAt: 1 },
      ],
      transactions: [],
    };
    const result = migrate(existing, params);
    expect(result).toEqual(existing);
  });

  it('does not stomp existing ledgers on first install', () => {
    // Edge case: schemaVersion is missing but a ledger somehow exists.
    // We honor the existing data and only add what's missing.
    const result = migrate(
      {
        ledgers: [
          { id: 'L1', name: 'Carry-over', persona: '', visibility: 'gm', createdAt: 0 },
        ],
        transactions: [],
      },
      params
    );
    expect(result.ledgers).toHaveLength(1);
    expect(result.ledgers[0].id).toBe('L1');
    expect(result.schemaVersion).toBe(1);
  });
});
