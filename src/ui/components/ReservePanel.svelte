<script lang="ts">
  import { ledgers } from '../../store/ledger-store.js';
  import { transactions, appendTransaction } from '../../store/transaction-store.js';
  import { computeBalance } from '../../domain/ledger.js';
  import { fromCopper, toCopper } from '../../domain/currency.js';
  import type { Transaction } from '../../domain/transaction.js';

  let pp = $state(0);
  let gp = $state(0);
  let sp = $state(0);
  let cp = $state(0);
  let busy = $state(false);
  let error = $state<string | null>(null);

  let primaryLedger = $derived($ledgers[0] ?? null);
  let balanceCopper = $derived(
    primaryLedger ? computeBalance(primaryLedger.id, $transactions) : 0
  );
  let balance = $derived(fromCopper(balanceCopper));

  async function mint(): Promise<void> {
    if (!primaryLedger || busy) return;
    error = null;
    let copper: number;
    try {
      copper = toCopper({ pp, gp, sp, cp });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      return;
    }
    if (copper <= 0) {
      error = 'Enter a positive amount.';
      return;
    }
    busy = true;
    try {
      const tx: Transaction = {
        id: foundry.utils.randomID(),
        timestamp: Date.now(),
        flow: 'mint',
        fromActorId: null,
        fromLedgerId: null,
        toActorId: null,
        toLedgerId: primaryLedger.id,
        copper,
        note: undefined,
      };
      await appendTransaction(tx);
      pp = 0;
      gp = 0;
      sp = 0;
      cp = 0;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
    }
  }
</script>

<section class="pwm-reserve">
  {#if primaryLedger}
    <header>
      <h2>{primaryLedger.name}</h2>
      {#if primaryLedger.persona}
        <p class="pwm-persona">{primaryLedger.persona}</p>
      {/if}
    </header>

    <div class="pwm-balance" aria-label="Current balance">
      <span><strong>{balance.pp}</strong>pp</span>
      <span><strong>{balance.gp}</strong>gp</span>
      <span><strong>{balance.sp}</strong>sp</span>
      <span><strong>{balance.cp}</strong>cp</span>
    </div>

    <form class="pwm-mint" onsubmit={(e) => { e.preventDefault(); void mint(); }}>
      <fieldset disabled={busy}>
        <legend>Mint</legend>
        <label>pp <input type="number" min="0" step="1" bind:value={pp} /></label>
        <label>gp <input type="number" min="0" step="1" bind:value={gp} /></label>
        <label>sp <input type="number" min="0" step="1" bind:value={sp} /></label>
        <label>cp <input type="number" min="0" step="1" bind:value={cp} /></label>
        <button type="submit">Mint</button>
      </fieldset>
      {#if error}
        <p class="pwm-error" role="alert">{error}</p>
      {/if}
    </form>
  {:else}
    <p>No ledger configured. Reload the world to seed a default ledger.</p>
  {/if}
</section>
