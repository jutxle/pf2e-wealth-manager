import type { FlowType, Transaction } from './transaction.js';

export type LedgerVisibility = 'gm' | 'players';

export interface Ledger {
  id: string;
  name: string;
  persona: string;
  visibility: LedgerVisibility;
  createdAt: number;
}

export interface TransactionFilter {
  ledgerId?: string;
  actorId?: string;
  flow?: FlowType | ReadonlyArray<FlowType>;
}

export function computeBalance(
  ledgerId: string,
  transactions: ReadonlyArray<Transaction>
): number {
  let balance = 0;
  for (const t of transactions) {
    if (t.toLedgerId === ledgerId) balance += t.copper;
    if (t.fromLedgerId === ledgerId) balance -= t.copper;
  }
  return balance;
}

export function listTransactions(
  filter: TransactionFilter,
  transactions: ReadonlyArray<Transaction>
): Transaction[] {
  const flows = normalizeFlow(filter.flow);
  return transactions.filter((t) => {
    if (filter.ledgerId !== undefined) {
      if (t.fromLedgerId !== filter.ledgerId && t.toLedgerId !== filter.ledgerId) {
        return false;
      }
    }
    if (filter.actorId !== undefined) {
      if (t.fromActorId !== filter.actorId && t.toActorId !== filter.actorId) {
        return false;
      }
    }
    if (flows !== undefined && !flows.includes(t.flow)) {
      return false;
    }
    return true;
  });
}

function normalizeFlow(
  flow: TransactionFilter['flow']
): ReadonlyArray<FlowType> | undefined {
  if (flow === undefined) return undefined;
  if (Array.isArray(flow)) return flow;
  return [flow as FlowType];
}
