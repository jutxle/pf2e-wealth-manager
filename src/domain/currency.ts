// Currency arithmetic. All values are integer copper internally.
// PF2E Remaster: 1 pp = 10 gp, 1 gp = 10 sp, 1 sp = 10 cp.

export interface CurrencyParts {
  pp?: number;
  gp?: number;
  sp?: number;
  cp?: number;
}

export interface SplitResult {
  shares: number[];
  remainder: number;
}

const CP_PER_SP = 10;
const CP_PER_GP = 100;
const CP_PER_PP = 1000;

function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be an integer; got ${value}`);
  }
  if (value < 0) {
    throw new Error(`${name} must be non-negative; got ${value}`);
  }
}

export function toCopper(parts: CurrencyParts): number {
  const pp = parts.pp ?? 0;
  const gp = parts.gp ?? 0;
  const sp = parts.sp ?? 0;
  const cp = parts.cp ?? 0;
  assertNonNegativeInteger(pp, 'pp');
  assertNonNegativeInteger(gp, 'gp');
  assertNonNegativeInteger(sp, 'sp');
  assertNonNegativeInteger(cp, 'cp');
  return pp * CP_PER_PP + gp * CP_PER_GP + sp * CP_PER_SP + cp;
}

export function fromCopper(cp: number): Required<CurrencyParts> {
  assertNonNegativeInteger(cp, 'cp');
  const pp = Math.floor(cp / CP_PER_PP);
  let rest = cp - pp * CP_PER_PP;
  const gp = Math.floor(rest / CP_PER_GP);
  rest -= gp * CP_PER_GP;
  const sp = Math.floor(rest / CP_PER_SP);
  rest -= sp * CP_PER_SP;
  return { pp, gp, sp, cp: rest };
}

export function addCopper(a: number, b: number): number {
  assertNonNegativeInteger(a, 'a');
  assertNonNegativeInteger(b, 'b');
  return a + b;
}

export function subtractCopper(a: number, b: number): number {
  assertNonNegativeInteger(a, 'a');
  assertNonNegativeInteger(b, 'b');
  if (b > a) {
    throw new Error(`subtractCopper would produce a negative result: ${a} - ${b}`);
  }
  return a - b;
}

export function splitEvenly(total: number, n: number): SplitResult {
  assertNonNegativeInteger(total, 'total');
  if (!Number.isInteger(n)) {
    throw new Error(`n must be an integer; got ${n}`);
  }
  if (n <= 0) {
    throw new Error(`n must be positive; got ${n}`);
  }
  const share = Math.floor(total / n);
  const shares = new Array<number>(n).fill(share);
  const remainder = total - share * n;
  return { shares, remainder };
}
