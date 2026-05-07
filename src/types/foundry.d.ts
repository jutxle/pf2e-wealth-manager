// Minimal Foundry v14 type shims. Only what we use is declared here.
// See docs/adr/0001-types.md for the rationale and the upgrade path.

declare const Hooks: {
  once(event: string, fn: (...args: unknown[]) => void): void;
  on(event: string, fn: (...args: unknown[]) => void): void;
  off(event: string, fn: (...args: unknown[]) => void): void;
  callAll(event: string, ...args: unknown[]): void;
};

declare const game: unknown;
declare const ui: unknown;
declare const canvas: unknown;
declare const CONFIG: unknown;
declare const ChatMessage: unknown;
