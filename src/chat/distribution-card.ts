import { fromCopper } from '../domain/currency.js';
import type { Ledger } from '../domain/ledger.js';

export interface DistributionCardArgs {
  ledger: Ledger;
  recipientName: string;
  copper: number;
  flavor?: string;
}

export function formatCopper(copper: number): string {
  const parts = fromCopper(copper);
  const segments: string[] = [];
  if (parts.pp > 0) segments.push(`${parts.pp}pp`);
  if (parts.gp > 0) segments.push(`${parts.gp}gp`);
  if (parts.sp > 0) segments.push(`${parts.sp}sp`);
  if (parts.cp > 0) segments.push(`${parts.cp}cp`);
  return segments.length > 0 ? segments.join(' ') : '0cp';
}

export function buildDistributionCardHTML(args: DistributionCardArgs): string {
  const persona = args.ledger.persona
    ? ` <em>(${escapeHTML(args.ledger.persona)})</em>`
    : '';
  const flavor = args.flavor
    ? ` — <em>${escapeHTML(args.flavor)}</em>`
    : '';
  return `
    <section class="pwm-distribution-card">
      <p>
        💰 <strong>${escapeHTML(args.ledger.name)}</strong>${persona}
        disburses <strong>${formatCopper(args.copper)}</strong>
        to <strong>${escapeHTML(args.recipientName)}</strong>${flavor}
      </p>
    </section>
  `.trim();
}

export async function postDistributionCard(args: DistributionCardArgs): Promise<void> {
  await ChatMessage.create({
    content: buildDistributionCardHTML(args),
    speaker: { alias: args.ledger.name },
  });
}

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
