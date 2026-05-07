import type { Ledger } from '../domain/ledger.js';
import type { Transaction } from '../domain/transaction.js';
import { CURRENT_SCHEMA_VERSION } from '../constants.js';

export interface PersistedState {
  ledgers: Ledger[];
  transactions: Transaction[];
  schemaVersion: number;
}

export interface MigrationParams {
  worldName: string;
  now: number;
  idGenerator: () => string;
}

export function migrate(
  current: Partial<PersistedState>,
  params: MigrationParams
): PersistedState {
  const ledgers = current.ledgers ?? [];
  const transactions = current.transactions ?? [];

  if (current.schemaVersion === CURRENT_SCHEMA_VERSION) {
    return { ledgers, transactions, schemaVersion: CURRENT_SCHEMA_VERSION };
  }

  const seededLedgers =
    ledgers.length === 0 ? [createDefaultLedger(params)] : ledgers;

  return {
    ledgers: seededLedgers,
    transactions,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

function createDefaultLedger(params: MigrationParams): Ledger {
  return {
    id: params.idGenerator(),
    name: params.worldName,
    persona: '',
    visibility: 'gm',
    createdAt: params.now,
  };
}
