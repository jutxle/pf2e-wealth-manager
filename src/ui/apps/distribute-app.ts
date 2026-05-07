import { mount, unmount } from 'svelte';
import DistributePanel from '../components/DistributePanel.svelte';
import { MODULE_ID } from '../../constants.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class DistributeApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static override DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-distribute`,
    classes: [MODULE_ID, 'pwm-app'],
    tag: 'div',
    window: {
      title: 'Wealth Manager — Distribute',
      icon: 'fas fa-hand-holding-usd',
      resizable: true,
    },
    position: { width: 480, height: 'auto' as const },
  };

  static override PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/distribute.hbs` },
  };

  #svelte: unknown;

  protected _onRender(_context: unknown, _options: unknown): void {
    const root =
      (this.element as HTMLElement).querySelector('.pwm-svelte-root') ??
      (this.element as HTMLElement);
    this.#svelte = mount(DistributePanel, {
      target: root as HTMLElement,
      props: {
        onClose: () => {
          void this.close();
        },
      },
    });
  }

  protected _preClose(_options: unknown): void {
    if (this.#svelte) {
      unmount(this.#svelte as Parameters<typeof unmount>[0]);
      this.#svelte = undefined;
    }
  }
}
