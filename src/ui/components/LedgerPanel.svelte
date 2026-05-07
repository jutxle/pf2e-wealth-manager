<script lang="ts">
  import { ledgers } from '../../store/ledger-store.js';
  import { transactions } from '../../store/transaction-store.js';
  import { listTransactions } from '../../domain/ledger.js';
  import { ALL_FLOW_TYPES, type FlowType } from '../../domain/transaction.js';
  import { formatCopper } from '../../chat/distribution-card.js';
  import { listPlayerCharacters, getPartyActor } from '../../foundry/actors.js';
  import type { Ledger } from '../../domain/ledger.js';

  const PAGE_SIZE = 50;

  // Snapshot at mount; refresh button reads again if the GM wants.
  let trackedActors = $state(buildTrackedActorList());

  let filterLedger = $state<string>('all');
  let filterActor = $state<string>('all');
  let filterFlows = $state<Set<FlowType>>(new Set(ALL_FLOW_TYPES));
  let page = $state(0);

  let filtered = $derived(
    listTransactions(
      {
        ledgerId: filterLedger === 'all' ? undefined : filterLedger,
        actorId: filterActor === 'all' ? undefined : filterActor,
        flow:
          filterFlows.size === ALL_FLOW_TYPES.length
            ? undefined
            : [...filterFlows],
      },
      $transactions
    )
  );

  let sorted = $derived([...filtered].sort((a, b) => b.timestamp - a.timestamp));
  let totalRows = $derived(sorted.length);
  let totalPages = $derived(Math.max(1, Math.ceil(totalRows / PAGE_SIZE)));
  let pageRows = $derived(
    sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
  );

  // Reset to page 0 when filters change (sorted reference changes too often).
  $effect(() => {
    void filterLedger;
    void filterActor;
    void filterFlows;
    page = 0;
  });

  function nameForLedger(id: string | null): string {
    if (!id) return '—';
    return $ledgers.find((l) => l.id === id)?.name ?? `(missing)`;
  }

  function nameForActor(id: string | null): string {
    if (!id) return '—';
    const known = trackedActors.find((a) => a.id === id);
    if (known) return known.name;
    return `(external)`;
  }

  function toggleFlow(flow: FlowType): void {
    const next = new Set(filterFlows);
    if (next.has(flow)) next.delete(flow);
    else next.add(flow);
    filterFlows = next;
  }

  function selectAllFlows(): void {
    filterFlows = new Set(ALL_FLOW_TYPES);
  }

  function selectNoFlows(): void {
    filterFlows = new Set();
  }

  function buildTrackedActorList(): Array<{ id: string; name: string }> {
    const actors: Array<{ id: string; name: string }> = listPlayerCharacters().map(
      (a) => ({ id: a.id, name: a.name })
    );
    const party = getPartyActor();
    if (party) actors.push({ id: party.id, name: party.name });
    return actors;
  }

  function refreshActors(): void {
    trackedActors = buildTrackedActorList();
  }

  function formatTimestamp(ts: number): string {
    return new Date(ts).toLocaleString();
  }

  function side(
    actorId: string | null,
    ledgerId: string | null
  ): string {
    if (ledgerId) return `📒 ${nameForLedger(ledgerId)}`;
    if (actorId) {
      const known = trackedActors.find((a) => a.id === actorId);
      return known ? `👤 ${known.name}` : `👤 (external)`;
    }
    return '—';
  }
</script>

<section class="pwm-ledger">
  <header>
    <h2>Transaction Ledger</h2>
    <p class="pwm-meta">
      {totalRows} transaction{totalRows === 1 ? '' : 's'}
      {#if totalRows !== $transactions.length}
        (filtered from {$transactions.length})
      {/if}
    </p>
  </header>

  <fieldset class="pwm-filters">
    <legend>Filters</legend>

    <label>
      Ledger
      <select bind:value={filterLedger}>
        <option value="all">All</option>
        {#each $ledgers as l (l.id)}
          <option value={l.id}>{l.name}</option>
        {/each}
      </select>
    </label>

    <label>
      Actor
      <select bind:value={filterActor}>
        <option value="all">All</option>
        {#each trackedActors as a (a.id)}
          <option value={a.id}>{a.name}</option>
        {/each}
      </select>
      <button type="button" class="pwm-link" onclick={refreshActors} title="Re-read tracked actors">
        ↻
      </button>
    </label>

    <div class="pwm-flow-filter">
      <span>
        Flows
        <button type="button" class="pwm-link" onclick={selectAllFlows}>all</button>
        <button type="button" class="pwm-link" onclick={selectNoFlows}>none</button>
      </span>
      <div class="pwm-flow-grid">
        {#each ALL_FLOW_TYPES as f (f)}
          <label>
            <input
              type="checkbox"
              checked={filterFlows.has(f)}
              onchange={() => toggleFlow(f)}
            />
            {f}
          </label>
        {/each}
      </div>
    </div>
  </fieldset>

  {#if totalRows === 0}
    <p class="pwm-empty">No transactions match.</p>
  {:else}
    <table class="pwm-tx">
      <thead>
        <tr>
          <th>When</th>
          <th>Flow</th>
          <th>From</th>
          <th>To</th>
          <th class="pwm-num">Amount</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        {#each pageRows as t (t.id)}
          <tr>
            <td><small>{formatTimestamp(t.timestamp)}</small></td>
            <td><code>{t.flow}</code></td>
            <td>{side(t.fromActorId, t.fromLedgerId)}</td>
            <td>{side(t.toActorId, t.toLedgerId)}</td>
            <td class="pwm-num">{formatCopper(t.copper)}</td>
            <td><small>{t.note ?? ''}</small></td>
          </tr>
        {/each}
      </tbody>
    </table>

    {#if totalPages > 1}
      <div class="pwm-pager">
        <button type="button" disabled={page === 0} onclick={() => (page = page - 1)}>
          ← Prev
        </button>
        <span>Page {page + 1} of {totalPages}</span>
        <button
          type="button"
          disabled={page >= totalPages - 1}
          onclick={() => (page = page + 1)}
        >
          Next →
        </button>
      </div>
    {/if}
  {/if}
</section>
