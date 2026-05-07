import { writable, type Writable } from 'svelte/store';
import type { Transaction } from '../domain/transaction.js';
import { SETTING_TRANSACTIONS } from '../constants.js';
import { writeSetting } from './persistence.js';

// Append-only. The store never deletes or amends rows; corrections go in
// as new rows referencing the original.
export const transactions: Writable<Transaction[]> = writable<Transaction[]>([]);

export function hydrateTransactions(initial: Transaction[]): void {
  transactions.set(initial);
}

export async function appendTransaction(tx: Transaction): Promise<void> {
  let updated: Transaction[] = [];
  transactions.update((current) => {
    updated = [...current, tx];
    return updated;
  });
  await writeSetting(SETTING_TRANSACTIONS, updated);
}
