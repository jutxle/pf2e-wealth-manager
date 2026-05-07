import type { Ledger } from './ledger.js';
import type { Transaction } from './transaction.js';

export interface AuditInput {
  ledgers: ReadonlyArray<Ledger>;
  trackedActorTotals: ReadonlyMap<string, number>;
  transactions: ReadonlyArray<Transaction>;
}

export interface Divergence {
  actorOrLedgerId: string;
  observedCopper: number;
  expectedCopper: number;
  delta: number;
}

export type AuditResult = { ok: true } | { ok: false; firstDivergence: Divergence };

export function audit(input: AuditInput): AuditResult {
  const { trackedActorTotals, transactions } = input;

  const expected = new Map<string, number>();
  for (const id of trackedActorTotals.keys()) {
    expected.set(id, 0);
  }

  // Insertion-ordered set tracking which tracked actors are touched, in order.
  const touchOrder: string[] = [];
  const touched = new Set<string>();
  const markTouched = (id: string): void => {
    if (!touched.has(id) && trackedActorTotals.has(id)) {
      touched.add(id);
      touchOrder.push(id);
    }
  };

  const sorted = [...transactions].sort((a, b) => a.timestamp - b.timestamp);

  for (const t of sorted) {
    if (t.toActorId !== null && trackedActorTotals.has(t.toActorId)) {
      expected.set(t.toActorId, (expected.get(t.toActorId) ?? 0) + t.copper);
      markTouched(t.toActorId);
    }
    if (t.fromActorId !== null && trackedActorTotals.has(t.fromActorId)) {
      expected.set(t.fromActorId, (expected.get(t.fromActorId) ?? 0) - t.copper);
      markTouched(t.fromActorId);
    }
  }

  // Walk touched actors first (by transaction order); then any remaining tracked actors.
  const ordered = [
    ...touchOrder,
    ...[...trackedActorTotals.keys()].filter((id) => !touched.has(id)),
  ];

  for (const id of ordered) {
    const observed = trackedActorTotals.get(id) ?? 0;
    const exp = expected.get(id) ?? 0;
    if (observed !== exp) {
      return {
        ok: false,
        firstDivergence: {
          actorOrLedgerId: id,
          observedCopper: observed,
          expectedCopper: exp,
          delta: observed - exp,
        },
      };
    }
  }

  return { ok: true };
}
