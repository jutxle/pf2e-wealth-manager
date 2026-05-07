import { ReserveApp } from './apps/reserve-app.js';
import { DistributeApp } from './apps/distribute-app.js';
import { LedgerApp } from './apps/ledger-app.js';
import { AuditApp } from './apps/audit-app.js';
import { MODULE_ID } from '../constants.js';

interface SceneControl {
  name?: string;
  tools?: SceneTool[];
}

interface SceneTool {
  name: string;
  title: string;
  icon: string;
  button?: boolean;
  visible?: boolean;
  onClick?: () => void;
}

export function registerSceneControls(): void {
  Hooks.on('getSceneControlButtons', (raw: unknown) => {
    if (!game.user.isGM) return;
    if (!Array.isArray(raw)) return;
    const controls = raw as SceneControl[];

    const tokens = controls.find(
      (c) => c.name === 'tokens' || c.name === 'token'
    );
    if (!tokens || !Array.isArray(tokens.tools)) return;

    pushTool(tokens.tools, {
      name: `${MODULE_ID}-reserve`,
      title: 'Wealth Manager — Reserve',
      icon: 'fas fa-coins',
      button: true,
      visible: true,
      onClick: () => void new ReserveApp().render(true),
    });

    pushTool(tokens.tools, {
      name: `${MODULE_ID}-distribute`,
      title: 'Wealth Manager — Distribute',
      icon: 'fas fa-hand-holding-usd',
      button: true,
      visible: true,
      onClick: () => void new DistributeApp().render(true),
    });

    pushTool(tokens.tools, {
      name: `${MODULE_ID}-ledger`,
      title: 'Wealth Manager — Ledger',
      icon: 'fas fa-scroll',
      button: true,
      visible: true,
      onClick: () => void new LedgerApp().render(true),
    });

    pushTool(tokens.tools, {
      name: `${MODULE_ID}-audit`,
      title: 'Wealth Manager — Audit',
      icon: 'fas fa-balance-scale',
      button: true,
      visible: true,
      onClick: () => void new AuditApp().render(true),
    });
  });
}

function pushTool(tools: SceneTool[], tool: SceneTool): void {
  if (tools.some((t) => t.name === tool.name)) return;
  tools.push(tool);
}
