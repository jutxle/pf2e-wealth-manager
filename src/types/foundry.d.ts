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

interface FoundryModule {
  api?: Record<string, unknown>;
}

interface FoundryGame {
  user: { isGM: boolean };
  world: { id: string; title: string };
  modules: { get(id: string): FoundryModule | undefined };
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

declare namespace foundry {
  namespace utils {
    function randomID(length?: number): string;
  }

  namespace applications {
    namespace api {
      // We type ApplicationV2 narrowly — only the surface the module relies on.
      class ApplicationV2 {
        static DEFAULT_OPTIONS: Record<string, unknown>;
        static PARTS: Record<string, { template: string }>;
        constructor(options?: Record<string, unknown>);
        readonly element: HTMLElement;
        render(force?: boolean | Record<string, unknown>): Promise<this>;
        close(options?: Record<string, unknown>): Promise<this>;
      }

      // Mixin signature is intentionally loose; Foundry uses an open class type.
      function HandlebarsApplicationMixin<
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        T extends new (...args: any[]) => unknown
      >(base: T): T;
    }
  }
}
