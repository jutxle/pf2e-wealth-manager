// Thin wrapper over Foundry's settings API. Centralizing this lets the
// rest of the store layer treat settings as a typed key-value store.

import { MODULE_ID } from '../constants.js';

export function readSetting<T>(key: string, fallback: T): T {
  const value = game.settings.get(MODULE_ID, key);
  return (value ?? fallback) as T;
}

export async function writeSetting<T>(key: string, value: T): Promise<void> {
  await game.settings.set(MODULE_ID, key, value);
}
