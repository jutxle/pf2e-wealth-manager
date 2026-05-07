import { MODULE_ID } from './constants.js';
import { registerSettings } from './settings.js';
import { onReady } from './hooks/ready.js';
import { registerSceneControls } from './ui/scene-controls.js';
import { ReserveApp } from './ui/apps/reserve-app.js';
import { DistributeApp } from './ui/apps/distribute-app.js';
import { LedgerApp } from './ui/apps/ledger-app.js';
import { AuditApp } from './ui/apps/audit-app.js';

Hooks.once('init', () => {
  console.log(`[${MODULE_ID}] init`);
  registerSettings();
  registerSceneControls();
});

Hooks.once('ready', () => {
  void onReady();
  // Console/macro fallback for opening panels.
  const mod = game.modules.get(MODULE_ID);
  if (mod) {
    mod.api = {
      openReserve: () => new ReserveApp().render(true),
      openDistribute: () => new DistributeApp().render(true),
      openLedger: () => new LedgerApp().render(true),
      openAudit: () => new AuditApp().render(true),
    };
  }
});
