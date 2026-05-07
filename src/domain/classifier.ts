// Shape detection for incoming actor updates.
// The hook layer feeds this a plain UpdateContext and uses the result to
// decide allow/block + flow type for the transaction log.

export type Shape =
  | 'mint'
  | 'distribute'
  | 'reclaim'
  | 'transfer'
  | 'pay-ledger'
  | 'seed'
  | 'loot'
  | 'sell'
  | 'trade'
  | 'convert'
  | 'spend'
  | 'raw-edit';

export type ReserveToken =
  | 'mint'
  | 'distribute'
  | 'reclaim'
  | 'transfer'
  | 'pay-ledger'
  | 'seed';

export interface UpdateContext {
  copperDelta: number;
  itemDelta: boolean;
  counterpartyCurrencyDelta: boolean;
  socketTradeFlag: boolean;
  netZeroConversion: boolean;
  reserveToken?: ReserveToken;
}

export interface ClassifierResult {
  shape: Shape;
  reason: string;
}

export function classify(ctx: UpdateContext): ClassifierResult {
  if (ctx.reserveToken !== undefined) {
    return {
      shape: ctx.reserveToken,
      reason: `reserve token: ${ctx.reserveToken}`,
    };
  }

  if (ctx.socketTradeFlag) {
    return { shape: 'trade', reason: 'socket-mediated PC↔PC trade' };
  }

  if (ctx.netZeroConversion) {
    return { shape: 'convert', reason: 'net-zero denomination conversion' };
  }

  if (ctx.copperDelta < 0) {
    return { shape: 'spend', reason: 'currency decrease' };
  }

  if (ctx.copperDelta > 0 && ctx.itemDelta) {
    return { shape: 'sell', reason: 'item delta with currency increase' };
  }

  if (ctx.copperDelta > 0 && ctx.counterpartyCurrencyDelta) {
    return { shape: 'loot', reason: 'counterparty currency drained in same tick' };
  }

  return { shape: 'raw-edit', reason: 'unbacked currency change' };
}
