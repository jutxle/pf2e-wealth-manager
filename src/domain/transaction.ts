// Transaction record. Append-only; corrections are new rows referencing originals.

export const ALL_FLOW_TYPES = [
  'mint',
  'distribute',
  'reclaim',
  'transfer',
  'pay-ledger',
  'seed',
  'loot',
  'sell',
  'spend',
  'convert',
  'external',
] as const;

export type FlowType = (typeof ALL_FLOW_TYPES)[number];

export interface Transaction {
  id: string;
  timestamp: number;
  flow: FlowType;
  fromActorId: string | null;
  fromLedgerId: string | null;
  toActorId: string | null;
  toLedgerId: string | null;
  copper: number;
  note?: string;
}
