# Task List: pf2e-wealth-manager v1.0

Reference: [plan.md](plan.md) for phases, dependencies, checkpoints, and risks.
Source of truth: [../SPEC.md](../SPEC.md).

Each task is sized so it can be implemented and verified in a single focused session. `S` = 1–2 files, `M` = 3–5 files. No task is sized `L` or larger; if one starts to feel that way during implementation, stop and break it down.

---

## Phase 1: Foundation (pure domain, no Foundry)

### Task 1: Project scaffolding

**Description:** Stand up a buildable TypeScript + Vite + Svelte + Vitest project that produces a Foundry-loadable `dist/` directory. No domain logic yet — just the skeleton.

**Acceptance criteria:**
- [ ] `package.json` defines all commands from SPEC.md (`dev`, `build`, `test`, `test:watch`, `lint`, `typecheck`, `package`).
- [ ] `tsconfig.json` is strict; no implicit any.
- [ ] `vite.config.ts` builds to `dist/`, copies `templates/`, `lang/`, `styles/`, and `module.json` via `vite-plugin-static-copy`.
- [ ] `module.json` declares the module ID `pf2e-wealth-manager`, targets Foundry v14, declares the PF2E system relationship.
- [ ] `src/module.ts` registers an `init` hook that logs `[pf2e-wealth-manager] loaded`.
- [ ] `npm run build` produces `dist/module.js` + `dist/module.json` + copied static assets.
- [ ] Type shim decision made: chosen types library installed, OR `src/types/foundry.d.ts` started as a local shim — and the choice recorded in `docs/adr/0001-types.md`.
- [ ] `.gitignore` covers `node_modules/`, `dist/`, `coverage/`.

**Verification:**
- [ ] `npm install && npm run build` succeeds.
- [ ] `npm run typecheck` passes.
- [ ] Symlink/copy `dist/` into a Foundry data dir; module appears in the world's module list and the init log fires.

**Dependencies:** None
**Files likely touched:** `package.json`, `tsconfig.json`, `vite.config.ts`, `module.json`, `src/module.ts`, `.gitignore`, `docs/adr/0001-types.md`
**Size:** M

---

### Task 2: Currency arithmetic

**Description:** Pure-function copper-based currency math. No Foundry. Foundation for every other domain function.

**Acceptance criteria:**
- [ ] `src/domain/currency.ts` exports: `toCopper(parts: CurrencyParts): number`, `fromCopper(cp: number): CurrencyParts`, `addCopper`, `subtractCopper` (throws on negative result), `splitEvenly(total: number, n: number): { shares: number[]; remainder: number }`.
- [ ] `CurrencyParts` type is `{ pp?: number; gp?: number; sp?: number; cp?: number }`, all integers.
- [ ] All values are integer copper internally; no floats.
- [ ] `tests/domain/currency.test.ts` covers: round-trip `toCopper`/`fromCopper`, negative-result rejection, even-split with no remainder, even-split with remainder, splitting by 0 throws, large values (millions of cp).

**Verification:**
- [ ] `npm run test -- currency` passes.
- [ ] Coverage on `src/domain/currency.ts` is 100%.

**Dependencies:** Task 1
**Files likely touched:** `src/domain/currency.ts`, `tests/domain/currency.test.ts`
**Size:** S

---

### Task 3: Transaction + Ledger types and operations

**Description:** Core data types (Transaction, FlowType, Ledger) and pure operations (mint, computeBalance, listForLedger).

**Acceptance criteria:**
- [ ] `src/domain/transaction.ts` defines: `FlowType = 'mint' | 'distribute' | 'reclaim' | 'transfer' | 'pay-ledger' | 'loot' | 'sell' | 'spend' | 'convert' | 'seed' | 'external'` and the `Transaction` record shape (id, timestamp, flow, fromActorId/fromLedgerId, toActorId/toLedgerId, copper, note).
- [ ] `src/domain/ledger.ts` defines: `Ledger` record (id, name, persona, visibility, createdAt) and pure ops `computeBalance(ledgerId, transactions): number`, `listTransactions(filter, transactions): Transaction[]`.
- [ ] Tests in `tests/domain/ledger.test.ts` covering balance computation across all relevant flow types.
- [ ] Operations never mutate inputs; everything returns new arrays/values.

**Verification:**
- [ ] `npm run test -- ledger` passes.
- [ ] Coverage on `src/domain/ledger.ts` and `transaction.ts` ≥ 95%.

**Dependencies:** Task 2
**Files likely touched:** `src/domain/transaction.ts`, `src/domain/ledger.ts`, `tests/domain/ledger.test.ts`
**Size:** S

---

### Task 4: Classifier — shape detection

**Description:** Pure function that takes an update context (currency delta, item delta, NPC-side delta, socket flag, reserve token) and returns either a recognized shape or `raw-edit`.

**Acceptance criteria:**
- [ ] `src/domain/classifier.ts` exports `classify(ctx: UpdateContext): ClassifierResult` where `ClassifierResult` is one of: `{ shape: 'mint' | 'distribute' | 'loot' | 'sell' | 'trade' | 'convert', reason: string }` or `{ shape: 'raw-edit' }`.
- [ ] `UpdateContext` is a plain data type — no Foundry references.
- [ ] Five allowed shapes detected: reserve-token, item-delta-on-same-actor, npc-currency-delta-same-tick, socket-trade-flag, net-zero-conversion.
- [ ] Anything else returns `raw-edit`.
- [ ] `tests/domain/classifier.test.ts` has at least one positive case for each shape and a battery of raw-edit rejections.

**Verification:**
- [ ] `npm run test -- classifier` passes.
- [ ] Coverage on `src/domain/classifier.ts` is 100%.

**Dependencies:** Task 2
**Files likely touched:** `src/domain/classifier.ts`, `tests/domain/classifier.test.ts`
**Size:** S

---

### Task 5: Conservation audit

**Description:** Replay the transaction log to derive expected per-actor and per-ledger totals; compare against observed totals; report the first divergence.

**Acceptance criteria:**
- [ ] `src/domain/conservation.ts` exports `audit({ ledgers, trackedActorTotals, transactions }): AuditResult`.
- [ ] `AuditResult` is `{ ok: true } | { ok: false, firstDivergence: { actorOrLedgerId, observedCopper, expectedCopper, delta } }`.
- [ ] Replay handles all flow types correctly (including external loot/sell crossing the domain boundary).
- [ ] `tests/domain/conservation.test.ts` covers: empty world (ok), valid history (ok), single divergence (correct id and delta returned), multiple divergences (returns the first by transaction order).

**Verification:**
- [ ] `npm run test -- conservation` passes.
- [ ] Coverage on `src/domain/conservation.ts` ≥ 95%.

**Dependencies:** Tasks 2, 3
**Files likely touched:** `src/domain/conservation.ts`, `tests/domain/conservation.test.ts`
**Size:** S

---

### ✅ Checkpoint A — Foundation
- [ ] `npm run typecheck && npm run test` passes.
- [ ] Coverage on `src/domain/` ≥ 90% lines.
- [ ] `npm run build` produces a loadable (no-op) module.
- [ ] **Human review** before Phase 2.

---

## Phase 2: First end-to-end slice (mint + distribute)

### Task 6: Persistence layer

**Description:** Register Foundry world settings for the persisted shape; expose ledgers and transactions as Svelte stores; auto-create a default ledger on first ready.

**Acceptance criteria:**
- [ ] `src/settings.ts` registers world settings: `ledgers` (array of `Ledger`), `transactions` (array of `Transaction`), `schemaVersion` (number).
- [ ] `src/store/ledger-store.ts` exposes a writable Svelte store synced to the `ledgers` setting; writes go through Foundry's setting API.
- [ ] `src/store/transaction-store.ts` exposes an append-only writable store synced to the `transactions` setting; never deletes or mutates.
- [ ] `src/hooks/ready.ts` checks `schemaVersion`; if absent, runs initial migration: create one default ledger named after the world and bumps `schemaVersion` to `1`.
- [ ] All persistence paths are GM-only (use `world` scope; no client-scope settings for shared data).

**Verification:**
- [ ] Manual: load module in a fresh world; the `ledgers` setting contains exactly one entry.
- [ ] Manual: reload world; no second default ledger created.
- [ ] `npm run typecheck` passes.

**Dependencies:** Tasks 1, 3
**Files likely touched:** `src/settings.ts`, `src/store/ledger-store.ts`, `src/store/transaction-store.ts`, `src/hooks/ready.ts`, `src/module.ts`
**Size:** M

---

### Task 7: Reserve panel — view + mint

**Description:** First end-to-end UI slice. ApplicationV2 shell hosting a Svelte component that shows the default ledger's balance and offers a mint form.

**Acceptance criteria:**
- [ ] `src/ui/apps/reserve-app.ts` defines a GM-only `ApplicationV2` (using `HandlebarsApplicationMixin`) that mounts `ReservePanel.svelte` into its content area.
- [ ] `src/ui/components/ReservePanel.svelte` shows the default ledger's name, persona, balance (formatted as gp/sp/cp), and a form with `pp/gp/sp/cp` inputs + a Mint button.
- [ ] Minting writes a `mint` transaction and updates the ledger balance reactively.
- [ ] A scene-control button (or game settings menu item) opens the panel; non-GMs don't see it.
- [ ] `docs/adr/0002-svelte-in-appv2.md` records the chosen mounting pattern.

**Verification:**
- [ ] Manual: GM opens Reserve, mints 100gp, sees balance update to `100gp 0sp 0cp`.
- [ ] Manual: transactions setting now has 1 entry of type `mint`.
- [ ] Manual: a non-GM logged in cannot see the Reserve button.
- [ ] No console errors.

**Dependencies:** Task 6
**Files likely touched:** `src/ui/apps/reserve-app.ts`, `src/ui/components/ReservePanel.svelte`, `templates/reserve.hbs`, `src/module.ts` (control registration), `docs/adr/0002-svelte-in-appv2.md`
**Size:** M

---

### Task 8: Distribute panel + chat cards

**Description:** GM enters an amount, selects PC recipients, sees auto-split, can override per-recipient shares, confirms. Each recipient gets a flavored chat card. Remainder routes to the party actor.

**Acceptance criteria:**
- [ ] `DistributePanel.svelte` provides: amount input (pp/gp/sp/cp), recipient picker (PC actors with player owners), auto-split preview using `splitEvenly`, per-recipient override sliders/inputs, confirm.
- [ ] On confirm: PC currency increments via actor.update with a `flag` marking the update as a reserve-issued mint (the "reserve token"); ledger balance decrements; transaction rows recorded for the source ledger and each recipient.
- [ ] Remainder copper routes to the party actor.
- [ ] `src/chat/distribution-card.ts` emits one chat card per recipient with the ledger's persona and a customizable flavor line (passed in from the panel).
- [ ] If no PC recipients selected and an amount entered, confirm is disabled.

**Verification:**
- [ ] Manual: distribute 47gp 5sp to 4 PCs → auto-split shows `11gp 8sp` × 3 + `11gp 8sp 7cp` (or correct rounding) + `0gp 0sp 1cp` remainder to party actor.
- [ ] Manual: chat cards appear with the ledger's persona text.
- [ ] Manual: ledger balance dropped by 47gp 5sp.
- [ ] Manual: transaction store shows source row + 4 recipient rows + 1 party-actor remainder row.

**Dependencies:** Task 7
**Files likely touched:** `src/ui/apps/distribute-app.ts`, `src/ui/components/DistributePanel.svelte`, `src/chat/distribution-card.ts`, `templates/distribute.hbs`, `src/lang/en.json`
**Size:** M

---

### ✅ Checkpoint B — First slice
- [ ] Mint works in real Foundry.
- [ ] Distribute works end-to-end with chat cards.
- [ ] No console errors during the flow.
- [ ] **Human review** — architecture validated before adding the lock.

---

## Phase 3: The lock

### Task 9: preUpdateActor hook

**Description:** Intercept currency updates on tracked actors. If the update has a recognized shape, allow it and log a transaction. If it's a raw edit by a non-GM, reject and whisper the GM.

**Sub-step (spike, ~30 min, before implementation):** Confirm `preUpdateActor` provides the data needed to detect each shape (item-delta on same actor, NPC currency in same tick, conversion net-zero). If trade correlation is unreliable, add a minimal socket layer scoped to PC↔PC trades only.

**Acceptance criteria:**
- [ ] `src/hooks/pre-update-actor.ts` registers a `preUpdateActor` listener.
- [ ] Builds an `UpdateContext` from the diff and passes it to `domain/classifier.classify()`.
- [ ] If the user is the GM: always allow; log the transaction with the classifier's shape.
- [ ] If non-GM and shape is recognized: allow; log.
- [ ] If non-GM and shape is `raw-edit`: return `false` to cancel the update; ChatMessage whisper to all GMs identifying the actor and attempted delta.
- [ ] Currency *decreases* are never blocked (separate early-out before classifier).
- [ ] Errors from the classifier are caught and surface as a Foundry notification — never crash Foundry.
- [ ] Spike result documented in `docs/adr/0003-shape-detection.md`.

**Verification:**
- [ ] Manual playbook: raw edit blocked + whisper.
- [ ] Manual playbook: loot allowed + logged.
- [ ] Manual playbook: sell allowed + logged.
- [ ] Manual playbook: convert allowed + logged.
- [ ] Manual playbook: GM raw edit allowed.
- [ ] Manual playbook: 10 minutes of mixed-flow play, zero false positives.

**Dependencies:** Tasks 4, 6
**Files likely touched:** `src/hooks/pre-update-actor.ts`, `src/module.ts`, `docs/adr/0003-shape-detection.md`, possibly `src/socket.ts` (only if spike requires)
**Size:** M

---

### ✅ Checkpoint C — Lock works

(Acceptance criteria above.)

---

## Phase 4: Read-only insight

### Task 10: Ledger panel

**Description:** Read-only transaction log view with filters by ledger, actor, and flow type.

**Acceptance criteria:**
- [ ] `LedgerPanel.svelte` shows transactions in reverse chronological order with columns: timestamp, flow, source, dest, amount, note.
- [ ] Filter controls: ledger picker, actor picker, flow type checkboxes.
- [ ] Pagination or virtual scrolling for large logs (≥1000 rows).
- [ ] Read-only — no edit affordances on rows.

**Verification:**
- [ ] Manual: panel opens, filters work, large log renders without lag.

**Dependencies:** Task 6
**Files likely touched:** `src/ui/apps/ledger-app.ts`, `src/ui/components/LedgerPanel.svelte`, `templates/ledger.hbs`
**Size:** M

---

### Task 11: Conservation audit panel

**Description:** Button-driven audit of the live world; reports first divergence.

**Acceptance criteria:**
- [ ] `AuditPanel.svelte` has one button: "Verify conservation."
- [ ] On click: gathers tracked actor totals (party + PCs) and current ledger balances, calls `domain/conservation.audit()`, displays result.
- [ ] If `ok`: shows green "Conservation holds. N transactions across M ledgers."
- [ ] If divergent: shows the failing entity, expected vs observed, delta, and a link to the relevant ledger panel filter.

**Verification:**
- [ ] Manual: fresh world after playbook → audit `ok`.
- [ ] Manual: force-corrupt the transactions setting in dev tools → audit reports the correct divergence.

**Dependencies:** Tasks 5, 6, 10
**Files likely touched:** `src/ui/apps/audit-app.ts`, `src/ui/components/AuditPanel.svelte`, `templates/audit.hbs`
**Size:** S

---

### ✅ Checkpoint D — Insight complete

(Acceptance criteria above.)

---

## Phase 5: Multi-ledger expansion

### Task 12: Multi-ledger CRUD

**Description:** UI to create, rename, set persona/visibility, and delete (when balance is zero) ledgers. Reserve panel becomes a list-of-ledgers view.

**Acceptance criteria:**
- [ ] Reserve panel renders all ledgers with balance, persona, visibility.
- [ ] "New ledger" button opens a small dialog with name + persona + visibility (`gm` | `players`).
- [ ] Each ledger row has Rename, Edit Persona, Set Visibility, Delete actions.
- [ ] Delete is disabled when balance ≠ 0 (with tooltip explaining why).
- [ ] Mint form on each ledger row works.

**Verification:**
- [ ] Manual: create a second ledger; both visible.
- [ ] Manual: try to delete a non-empty ledger → blocked with explanation.
- [ ] Manual: rename a ledger → distribution chat cards now use the new persona.

**Dependencies:** Task 7
**Files likely touched:** `src/ui/components/ReservePanel.svelte`, `src/store/ledger-store.ts`, `src/lang/en.json`
**Size:** M

---

### Task 13: Distribute "From" + Reclaim panel

**Description:** Distribute gets a source-ledger picker. New Reclaim panel pulls coin from a PC or the party actor into a chosen ledger.

**Acceptance criteria:**
- [ ] DistributePanel: `From` ledger picker at the top; defaults to last-used (per-user client setting).
- [ ] New `ReclaimPanel.svelte`: pick source actor (party or any PC), enter amount, pick destination ledger, confirm. Logs as `reclaim`.
- [ ] Reclaim cannot exceed the source actor's current balance (validation client-side).
- [ ] Reclaim writes the actor update with the reserve-token flag so the lock allows the *increase* on the ledger and the *decrease* on the actor.

**Verification:**
- [ ] Manual: distribute from each of two ledgers; chat cards use the right persona.
- [ ] Manual: reclaim 25gp from a PC into ledger B; both sides update; transaction logged.

**Dependencies:** Task 12
**Files likely touched:** `src/ui/components/DistributePanel.svelte`, `src/ui/apps/reclaim-app.ts`, `src/ui/components/ReclaimPanel.svelte`, `templates/reclaim.hbs`
**Size:** M

---

### Task 14: Transfer between ledgers

**Description:** Move coin between two ledgers as one logical transaction.

**Acceptance criteria:**
- [ ] Transfer action accessible from the Reserve panel.
- [ ] Single transaction record with `flow: 'transfer'`, `fromLedgerId`, `toLedgerId`, `copper`.
- [ ] Both balances update atomically (single setting write batches both).
- [ ] Cannot transfer to the same ledger.
- [ ] Cannot transfer more than the source has.

**Verification:**
- [ ] Manual: transfer 100gp from ledger A to ledger B; both update; one transaction row.
- [ ] Manual: audit still passes.

**Dependencies:** Task 12
**Files likely touched:** `src/ui/components/ReservePanel.svelte`, `src/store/ledger-store.ts`
**Size:** S

---

### Task 15: Pay-to-ledger from PC

**Description:** A PC can pay coin to a tracked ledger. Trigger from the PC sheet (button or context menu).

**Acceptance criteria:**
- [ ] On PC sheet, a "Pay Ledger" button is visible to the PC's owner and the GM.
- [ ] Click opens a small dialog: pick ledger, enter amount, confirm.
- [ ] On confirm: PC currency decrements, target ledger balance increments, transaction logged with `flow: 'pay-ledger'`.
- [ ] PC cannot overpay (validated client-side).
- [ ] The increase on the ledger is allowed by the lock because the update carries a `pay-ledger` token recognized by the classifier.

**Verification:**
- [ ] Manual: PC pays 500gp to a ledger; both update; transaction logged.
- [ ] Manual: audit still passes.

**Dependencies:** Tasks 9, 12
**Files likely touched:** `src/ui/sheet-buttons.ts`, `src/ui/apps/pay-ledger-app.ts`, `src/ui/components/PayLedgerPanel.svelte`
**Size:** S

---

### ✅ Checkpoint E — Multi-ledger complete

(Acceptance criteria above; all 13 SPEC.md success criteria pass.)

---

## Phase 6: Polish + ship

### Task 16: NPC seed-from-reserve

**Description:** Optional button on NPC sheets to seed currency from a chosen ledger.

**Acceptance criteria:**
- [ ] Setting: "Show NPC seed button" (default off).
- [ ] When on: NPC sheets get a "Seed from Reserve" button (GM-only).
- [ ] Click opens dialog: pick source ledger, enter amount, confirm.
- [ ] On confirm: NPC currency increases, ledger decreases, transaction logged with `flow: 'seed'`.
- [ ] NPC is still external — its balance is not part of conservation, but the seed is logged so the trail is complete when the party loots them.

**Verification:**
- [ ] Manual with setting off: no button appears.
- [ ] Manual with setting on: seed flow works; loot the NPC; full chain visible in ledger panel (seed → loot).

**Dependencies:** Task 12
**Files likely touched:** `src/ui/sheet-buttons.ts`, `src/ui/apps/seed-app.ts`, `src/ui/components/SeedPanel.svelte`, `src/settings.ts`
**Size:** S

---

### Task 17: Transaction archive

**Description:** Archive old transactions out of the live setting and into JournalEntry pages, keeping the live view fast.

**Acceptance criteria:**
- [ ] Ledger panel has an "Archive older than..." action: pick a date, confirm.
- [ ] Archived rows are written to a new page on a hidden "PF2E Wealth Manager: Archive" JournalEntry (created on demand).
- [ ] Archived rows are removed from the live `transactions` setting.
- [ ] Audit ignores archived rows but optionally includes them via a checkbox.
- [ ] Archive operation is reversible (re-import button on archived pages).

**Verification:**
- [ ] Manual: with 200+ transactions, archive 100; ledger panel shows 100 live rows; JournalEntry page contains 100 archived rows; audit passes.
- [ ] Manual: re-import the archive page; live count returns to 200; audit still passes.

**Dependencies:** Tasks 5, 10
**Files likely touched:** `src/ui/components/LedgerPanel.svelte`, `src/store/archive-store.ts`, `src/lang/en.json`
**Size:** M

---

### Task 18: Playbook verification + README + bug-fix pass

**Description:** Walk through all eight playbook scenes from SPEC.md in a real Foundry world. Fix any bugs found. Write a user-facing README with screenshots.

**Acceptance criteria:**
- [ ] All eight playbook scenes pass without console errors.
- [ ] `README.md` rewritten with: install, what-it-does, screenshots of each panel, link to SPEC.md.
- [ ] `npm run package` produces a valid module zip.
- [ ] Open Questions in SPEC.md are resolved or have linked v1.1 issues.
- [ ] No `TODO` or `FIXME` comments left in `src/`.

**Verification:**
- [ ] Install the packaged zip into a fresh Foundry world; module loads, default ledger present, all panels open, mint+distribute+lock+audit all work.
- [ ] `npm run typecheck && npm run test && npm run build` all green.

**Dependencies:** All previous tasks
**Files likely touched:** `README.md`, possibly bug fixes across `src/`, `SPEC.md` (Open Questions resolution)
**Size:** Variable (mostly verification + docs)

---

### ✅ Checkpoint F — v1.0 ready

(Acceptance criteria above.)
