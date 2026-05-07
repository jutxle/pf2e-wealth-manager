import { MODULE_ID } from './constants.js';
import { registerSettings } from './settings.js';
import { onReady } from './hooks/ready.js';

Hooks.once('init', () => {
  console.log(`[${MODULE_ID}] init`);
  registerSettings();
});

Hooks.once('ready', () => {
  void onReady();
});
