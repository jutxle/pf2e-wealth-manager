import {
  MODULE_ID,
  SETTING_LEDGERS,
  SETTING_TRANSACTIONS,
  SETTING_SCHEMA_VERSION,
} from './constants.js';

export function registerSettings(): void {
  game.settings.register(MODULE_ID, SETTING_SCHEMA_VERSION, {
    scope: 'world',
    config: false,
    type: Number,
    default: 0,
  });

  game.settings.register(MODULE_ID, SETTING_LEDGERS, {
    scope: 'world',
    config: false,
    type: Array,
    default: [],
  });

  game.settings.register(MODULE_ID, SETTING_TRANSACTIONS, {
    scope: 'world',
    config: false,
    type: Array,
    default: [],
  });
}
