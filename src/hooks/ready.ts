import {
  MODULE_ID,
  SETTING_LEDGERS,
  SETTING_TRANSACTIONS,
  SETTING_SCHEMA_VERSION,
} from '../constants.js';
import { hydrateLedgers } from '../store/ledger-store.js';
import { hydrateTransactions } from '../store/transaction-store.js';
import { migrate, type PersistedState } from '../store/migration.js';
import type { Ledger } from '../domain/ledger.js';
import type { Transaction } from '../domain/transaction.js';

export async function onReady(): Promise<void> {
  if (!game.user.isGM) {
    // Players hydrate from the GM-written setting; no migration on their side.
    hydrateFromSettings();
    return;
  }

  const current: Partial<PersistedState> = {
    ledgers: game.settings.get(MODULE_ID, SETTING_LEDGERS) as Ledger[],
    transactions: game.settings.get(MODULE_ID, SETTING_TRANSACTIONS) as Transaction[],
    schemaVersion: game.settings.get(MODULE_ID, SETTING_SCHEMA_VERSION) as number,
  };

  const next = migrate(current, {
    worldName: game.world.title,
    now: Date.now(),
    idGenerator: () => foundry.utils.randomID(),
  });

  if (
    next.schemaVersion !== current.schemaVersion ||
    next.ledgers !== current.ledgers
  ) {
    await game.settings.set(MODULE_ID, SETTING_LEDGERS, next.ledgers);
    await game.settings.set(MODULE_ID, SETTING_TRANSACTIONS, next.transactions);
    await game.settings.set(MODULE_ID, SETTING_SCHEMA_VERSION, next.schemaVersion);
  }

  hydrateLedgers(next.ledgers);
  hydrateTransactions(next.transactions);
}

function hydrateFromSettings(): void {
  hydrateLedgers(game.settings.get(MODULE_ID, SETTING_LEDGERS) as Ledger[]);
  hydrateTransactions(game.settings.get(MODULE_ID, SETTING_TRANSACTIONS) as Transaction[]);
}
