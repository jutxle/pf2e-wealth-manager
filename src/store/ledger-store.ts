import { writable, type Writable } from 'svelte/store';
import type { Ledger } from '../domain/ledger.js';
import { SETTING_LEDGERS } from '../constants.js';
import { writeSetting } from './persistence.js';

export const ledgers: Writable<Ledger[]> = writable<Ledger[]>([]);

export function hydrateLedgers(initial: Ledger[]): void {
  ledgers.set(initial);
}

export async function upsertLedger(next: Ledger): Promise<void> {
  let updated: Ledger[] = [];
  ledgers.update((current) => {
    const idx = current.findIndex((l) => l.id === next.id);
    updated =
      idx >= 0
        ? [...current.slice(0, idx), next, ...current.slice(idx + 1)]
        : [...current, next];
    return updated;
  });
  await writeSetting(SETTING_LEDGERS, updated);
}

export async function removeLedger(id: string): Promise<void> {
  let updated: Ledger[] = [];
  ledgers.update((current) => {
    updated = current.filter((l) => l.id !== id);
    return updated;
  });
  await writeSetting(SETTING_LEDGERS, updated);
}
