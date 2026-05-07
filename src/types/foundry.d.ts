// Minimal Foundry v14 type shims. Only what we use is declared here.
// See docs/adr/0001-types.md for the rationale and the upgrade path.

interface SettingRegistration {
  name?: string;
  hint?: string;
  scope: 'world' | 'client';
  config: boolean;
  type: unknown;
  default: unknown;
}

interface FoundryGame {
  user: { isGM: boolean };
  world: { id: string; title: string };
  settings: {
    register(moduleId: string, key: string, options: SettingRegistration): void;
    get(moduleId: string, key: string): unknown;
    set(moduleId: string, key: string, value: unknown): Promise<unknown>;
  };
  i18n: {
    localize(key: string): string;
    format(key: string, data: Record<string, unknown>): string;
  };
}

declare const Hooks: {
  once(event: string, fn: (...args: unknown[]) => void): void;
  on(event: string, fn: (...args: unknown[]) => void): void;
  off(event: string, fn: (...args: unknown[]) => void): void;
  callAll(event: string, ...args: unknown[]): void;
};

declare const game: FoundryGame;
declare const ui: unknown;
declare const canvas: unknown;
declare const CONFIG: unknown;
declare const ChatMessage: unknown;

declare const foundry: {
  utils: {
    randomID(length?: number): string;
  };
};
