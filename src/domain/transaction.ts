// Transaction record. Append-only; corrections are new rows referencing originals.

export type FlowType =
  | 'mint'         // GM creates currency in a ledger
  | 'distribute'   // ledger -> party-side actor (PC or party actor)
  | 'reclaim'      // party-side actor -> ledger
  | 'transfer'     // ledger -> ledger
  | 'pay-ledger'   // party-side actor -> ledger (player-initiated)
  | 'seed'         // ledger -> NPC (external; gives the NPC traceable coin)
  | 'loot'         // external -> party-side actor (item-shape: NPC currency drained)
  | 'sell'         // external -> party-side actor (item-shape: item out, coin in)
  | 'spend'        // party-side actor -> external (decreases are always allowed)
  | 'convert'      // net-zero on the same actor (sp <-> gp etc.)
  | 'external';    // generic boundary crossing not otherwise classified

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
