<script lang="ts">
  import { ledgers } from '../../store/ledger-store.js';
  import { transactions, appendTransaction } from '../../store/transaction-store.js';
  import { computeBalance } from '../../domain/ledger.js';
  import { fromCopper, toCopper, splitEvenly } from '../../domain/currency.js';
  import { formatCopper, postDistributionCard } from '../../chat/distribution-card.js';
  import {
    listPlayerCharacters,
    getPartyActor,
    addCopperToActor,
  } from '../../foundry/actors.js';
  import type { Transaction } from '../../domain/transaction.js';

  interface Props {
    onClose?: () => void;
  }
  let { onClose }: Props = $props();

  let pp = $state(0);
  let gp = $state(0);
  let sp = $state(0);
  let cp = $state(0);
  let flavor = $state('');
  let busy = $state(false);
  let error = $state<string | null>(null);

  let pcs = $state(listPlayerCharacters());
  let party = $state(getPartyActor());

  // Selection: default all PCs in.
  let selected = $state(new Set<string>(pcs.map((p) => p.id)));
  // Shares (copper) keyed by actorId. Recomputed when total or selection changes.
  let shares = $state<Record<string, number>>({});

  let totalCopper = $derived.by(() => {
    try {
      return toCopper({ pp, gp, sp, cp });
    } catch {
      return 0;
    }
  });

  let primaryLedger = $derived($ledgers[0] ?? null);
  let ledgerBalance = $derived(
    primaryLedger ? computeBalance(primaryLedger.id, $transactions) : 0
  );
  let selectedIds = $derived(pcs.filter((p) => selected.has(p.id)).map((p) => p.id));
  let allocated = $derived(
    selectedIds.reduce((sum, id) => sum + (shares[id] ?? 0), 0)
  );
  let remainder = $derived(totalCopper - allocated);
  let canConfirm = $derived(
    !busy &&
      primaryLedger !== null &&
      totalCopper > 0 &&
      selectedIds.length > 0 &&
      allocated >= 0 &&
      allocated <= totalCopper &&
      totalCopper <= ledgerBalance
  );

  // Auto-split whenever total or selection changes (resets manual overrides).
  $effect(() => {
    const ids = selectedIds;
    if (ids.length === 0) {
      shares = {};
      return;
    }
    const split = splitEvenly(totalCopper, ids.length);
    const next: Record<string, number> = {};
    ids.forEach((id, i) => {
      next[id] = split.shares[i] ?? 0;
    });
    shares = next;
  });

  function toggle(id: string): void {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selected = next;
  }

  function setShare(id: string, value: number): void {
    shares = { ...shares, [id]: Math.max(0, Math.floor(value || 0)) };
  }

  async function confirm(): Promise<void> {
    if (!primaryLedger || busy || !canConfirm) return;
    error = null;
    busy = true;

    try {
      const ledgerId = primaryLedger.id;
      const now = Date.now();

      for (const pcId of selectedIds) {
        const share = shares[pcId] ?? 0;
        if (share <= 0) continue;
        const pc = pcs.find((p) => p.id === pcId);
        if (!pc) continue;

        await addCopperToActor(pcId, share, 'distribute', ledgerId);
        const tx: Transaction = {
          id: foundry.utils.randomID(),
          timestamp: now,
          flow: 'distribute',
          fromActorId: null,
          fromLedgerId: ledgerId,
          toActorId: pcId,
          toLedgerId: null,
          copper: share,
          note: flavor || undefined,
        };
        await appendTransaction(tx);
        await postDistributionCard({
          ledger: primaryLedger,
          recipientName: pc.name,
          copper: share,
          flavor: flavor || undefined,
        });
      }

      if (remainder > 0 && party) {
        await addCopperToActor(party.id, remainder, 'distribute', ledgerId);
        const tx: Transaction = {
          id: foundry.utils.randomID(),
          timestamp: now,
          flow: 'distribute',
          fromActorId: null,
          fromLedgerId: ledgerId,
          toActorId: party.id,
          toLedgerId: null,
          copper: remainder,
          note: flavor ? `${flavor} (remainder)` : 'remainder',
        };
        await appendTransaction(tx);
      }

      onClose?.();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
    }
  }
</script>

<section class="pwm-distribute">
  {#if !primaryLedger}
    <p>No ledger configured.</p>
  {:else}
    <header>
      <h2>Distribute from <em>{primaryLedger.name}</em></h2>
      <p class="pwm-balance-line">
        Available: <strong>{formatCopper(ledgerBalance)}</strong>
      </p>
    </header>

    <fieldset class="pwm-amount" disabled={busy}>
      <legend>Amount</legend>
      <label>pp <input type="number" min="0" step="1" bind:value={pp} /></label>
      <label>gp <input type="number" min="0" step="1" bind:value={gp} /></label>
      <label>sp <input type="number" min="0" step="1" bind:value={sp} /></label>
      <label>cp <input type="number" min="0" step="1" bind:value={cp} /></label>
    </fieldset>

    <fieldset class="pwm-flavor" disabled={busy}>
      <legend>Flavor</legend>
      <input
        type="text"
        placeholder="e.g. Pathfinder Society stipend"
        bind:value={flavor}
      />
    </fieldset>

    <fieldset class="pwm-recipients" disabled={busy}>
      <legend>Recipients</legend>
      {#if pcs.length === 0}
        <p>No player-owned characters found.</p>
      {:else}
        <ul>
          {#each pcs as pc (pc.id)}
            <li>
              <label>
                <input
                  type="checkbox"
                  checked={selected.has(pc.id)}
                  onchange={() => toggle(pc.id)}
                />
                <span class="pwm-pc-name">{pc.name}</span>
              </label>
              {#if selected.has(pc.id)}
                <span class="pwm-share">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={shares[pc.id] ?? 0}
                    oninput={(e) =>
                      setShare(pc.id, (e.currentTarget as HTMLInputElement).valueAsNumber)}
                    aria-label="copper share"
                  />
                  cp <small>({formatCopper(shares[pc.id] ?? 0)})</small>
                </span>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </fieldset>

    <div class="pwm-summary">
      <div>Allocated: <strong>{formatCopper(allocated)}</strong></div>
      <div>
        Remainder to party
        {#if party}<em>({party.name})</em>{:else}<em>(no party actor)</em>{/if}:
        <strong>{formatCopper(Math.max(0, remainder))}</strong>
      </div>
      {#if remainder < 0}
        <p class="pwm-error">Allocated exceeds the entered amount.</p>
      {/if}
      {#if totalCopper > ledgerBalance}
        <p class="pwm-error">Ledger doesn't have that much.</p>
      {/if}
    </div>

    <div class="pwm-actions">
      <button type="button" disabled={!canConfirm} onclick={() => void confirm()}>
        Confirm
      </button>
    </div>

    {#if error}
      <p class="pwm-error" role="alert">{error}</p>
    {/if}
  {/if}
</section>
