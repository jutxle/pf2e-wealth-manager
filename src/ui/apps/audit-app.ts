import { mount, unmount } from 'svelte';
import AuditPanel from '../components/AuditPanel.svelte';
import { MODULE_ID } from '../../constants.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class AuditApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static override DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-audit`,
    classes: [MODULE_ID, 'pwm-app'],
    tag: 'div',
    window: {
      title: 'Wealth Manager — Audit',
      icon: 'fas fa-balance-scale',
      resizable: true,
    },
    position: { width: 480, height: 'auto' as const },
  };

  static override PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/audit.hbs` },
  };

  #svelte: unknown;

  protected _onRender(_context: unknown, _options: unknown): void {
    const root =
      (this.element as HTMLElement).querySelector('.pwm-svelte-root') ??
      (this.element as HTMLElement);
    this.#svelte = mount(AuditPanel, { target: root as HTMLElement });
  }

  protected _preClose(_options: unknown): void {
    if (this.#svelte) {
      unmount(this.#svelte as Parameters<typeof unmount>[0]);
      this.#svelte = undefined;
    }
  }
}
