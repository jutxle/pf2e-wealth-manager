import { mount, unmount } from 'svelte';
import ReservePanel from '../components/ReservePanel.svelte';
import { MODULE_ID } from '../../constants.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// HandlebarsApplicationMixin renders the .hbs container; we mount Svelte
// into the resulting DOM in _onRender. See docs/adr/0002-svelte-in-appv2.md
// for the rationale and contract.
export class ReserveApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static override DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-reserve`,
    classes: [MODULE_ID, 'pwm-app'],
    tag: 'div',
    window: {
      title: 'Wealth Manager — Reserve',
      icon: 'fas fa-coins',
      resizable: true,
    },
    position: { width: 420, height: 'auto' as const },
  };

  static override PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/reserve.hbs` },
  };

  // Svelte component instance returned by mount(); typed loosely because
  // mount's return type depends on the component's exports object.
  #svelte: unknown;

  protected _onRender(_context: unknown, _options: unknown): void {
    const root =
      (this.element as HTMLElement).querySelector('.pwm-svelte-root') ??
      (this.element as HTMLElement);
    this.#svelte = mount(ReservePanel, { target: root as HTMLElement });
  }

  protected _preClose(_options: unknown): void {
    if (this.#svelte) {
      // unmount accepts the value returned by mount(); we pass it through.
      unmount(this.#svelte as Parameters<typeof unmount>[0]);
      this.#svelte = undefined;
    }
  }
}
