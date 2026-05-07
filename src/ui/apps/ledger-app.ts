import { mount, unmount } from 'svelte';
import LedgerPanel from '../components/LedgerPanel.svelte';
import { MODULE_ID } from '../../constants.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class LedgerApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static override DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-ledger`,
    classes: [MODULE_ID, 'pwm-app'],
    tag: 'div',
    window: {
      title: 'Wealth Manager — Ledger',
      icon: 'fas fa-scroll',
      resizable: true,
    },
    position: { width: 760, height: 600 as const },
  };

  static override PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/ledger.hbs` },
  };

  #svelte: unknown;

  protected _onRender(_context: unknown, _options: unknown): void {
    const root =
      (this.element as HTMLElement).querySelector('.pwm-svelte-root') ??
      (this.element as HTMLElement);
    this.#svelte = mount(LedgerPanel, { target: root as HTMLElement });
  }

  protected _preClose(_options: unknown): void {
    if (this.#svelte) {
      unmount(this.#svelte as Parameters<typeof unmount>[0]);
      this.#svelte = undefined;
    }
  }
}
