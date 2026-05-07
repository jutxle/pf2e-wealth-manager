import { describe, it, expect } from 'vitest';
import {
  formatCopper,
  buildDistributionCardHTML,
} from '../../src/chat/distribution-card.js';
import type { Ledger } from '../../src/domain/ledger.js';

const ledger = (overrides: Partial<Ledger> = {}): Ledger => ({
  id: 'L1',
  name: 'Crimson Ledger',
  persona: '',
  visibility: 'gm',
  createdAt: 0,
  ...overrides,
});

describe('formatCopper', () => {
  it('formats zero as 0cp', () => {
    expect(formatCopper(0)).toBe('0cp');
  });

  it('omits zero denominations', () => {
    expect(formatCopper(2345)).toBe('2pp 3gp 4sp 5cp');
    expect(formatCopper(100)).toBe('1gp');
    expect(formatCopper(1010)).toBe('1pp 1sp');
  });
});

describe('buildDistributionCardHTML', () => {
  it('renders the basics', () => {
    const html = buildDistributionCardHTML({
      ledger: ledger(),
      recipientName: 'Kira',
      copper: 100,
    });
    expect(html).toContain('Crimson Ledger');
    expect(html).toContain('1gp');
    expect(html).toContain('Kira');
  });

  it('includes the persona when set', () => {
    const html = buildDistributionCardHTML({
      ledger: ledger({ persona: 'Magnimar accounting house' }),
      recipientName: 'Kira',
      copper: 100,
    });
    expect(html).toContain('Magnimar accounting house');
  });

  it('includes flavor text when set', () => {
    const html = buildDistributionCardHTML({
      ledger: ledger(),
      recipientName: 'Kira',
      copper: 100,
      flavor: 'Pathfinder Society stipend',
    });
    expect(html).toContain('Pathfinder Society stipend');
  });

  it('escapes HTML in user-supplied fields', () => {
    const html = buildDistributionCardHTML({
      ledger: ledger({ name: '<script>alert(1)</script>', persona: '"&\'' }),
      recipientName: 'Kira & Co',
      copper: 100,
      flavor: '<b>raw</b>',
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>raw</b>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Kira &amp; Co');
  });
});
