<script lang="ts">
  import { ledgers } from '../../store/ledger-store.js';
  import { transactions } from '../../store/transaction-store.js';
  import { audit, type AuditResult } from '../../domain/conservation.js';
  import { formatCopper } from '../../chat/distribution-card.js';
  import { readTrackedActorTotals } from '../../foundry/actors.js';

  let result = $state<AuditResult | null>(null);
  let trackedCount = $state(0);

  function run(): void {
    const totals = readTrackedActorTotals();
    trackedCount = totals.size;
    result = audit({
      ledgers: $ledgers,
      trackedActorTotals: totals,
      transactions: $transactions,
    });
  }

  function nameFor(id: string): string {
    const ledger = $ledgers.find((l) => l.id === id);
    if (ledger) return `📒 ${ledger.name}`;
    const totals = readTrackedActorTotals();
    if (totals.has(id)) {
      const actor = game.actors.get(id);
      return actor ? `👤 ${actor.name}` : `👤 ${id.slice(0, 6)}`;
    }
    return id;
  }

  function signed(n: number): string {
    return n > 0 ? `+${formatCopper(n)}` : `−${formatCopper(-n)}`;
  }
</script>

<section class="pwm-audit">
  <header>
    <h2>Conservation Audit</h2>
    <p class="pwm-meta">
      Verifies that every change to a tracked actor's coins has a matching
      ledger row. Tracked actors are PCs and the party actor; NPCs and
      merchants are external.
    </p>
  </header>

  <div class="pwm-actions">
    <button type="button" onclick={run}>Verify conservation</button>
  </div>

  {#if result}
    <div class="pwm-result">
      {#if result.ok}
        <p class="pwm-ok">
          ✅ Conservation holds.
          {$transactions.length} transaction{$transactions.length === 1 ? '' : 's'}
          across {$ledgers.length} ledger{$ledgers.length === 1 ? '' : 's'}
          and {trackedCount} tracked actor{trackedCount === 1 ? '' : 's'}.
        </p>
      {:else}
        <p class="pwm-fail">
          ⚠️ Divergence detected on <strong>{nameFor(result.firstDivergence.actorOrLedgerId)}</strong>.
        </p>
        <table class="pwm-divergence">
          <tbody>
            <tr>
              <th>Observed</th>
              <td>{formatCopper(result.firstDivergence.observedCopper)}</td>
            </tr>
            <tr>
              <th>Expected</th>
              <td>{formatCopper(result.firstDivergence.expectedCopper)}</td>
            </tr>
            <tr>
              <th>Δ</th>
              <td>{signed(result.firstDivergence.delta)}</td>
            </tr>
          </tbody>
        </table>
        <p class="pwm-meta">
          Open the <em>Ledger</em> panel and filter by this actor to investigate.
        </p>
      {/if}
    </div>
  {/if}
</section>
