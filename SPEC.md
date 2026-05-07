# Spec: pf2e-wealth-manager

A FoundryVTT module for the PF2E (Remaster) system that gives the GM a curated, traceable, multi-faction currency economy — without making spending feel like paperwork.

---

## Objective

### What we're building

A GM-facing module that:

1. **Mints all new currency** through one or more named **ledgers** (factions). The GM is the sole source of new money.
2. **Observes** every currency change on tracked actors (party actor + PCs) and records it in an append-only log with a best-guess flow type.
3. **Blocks one specific cheat surface**: a player editing their own currency field directly with no triggering action ("raw edit"). Everything else — sells, trades, loots, conversions, GM distributions — is allowed through and logged.
4. **Provides theatre.** Distributions emit flavored chat cards attributed to the source ledger ("47sp recovered from the tomb — *the Crimson Ledger*"). Players see a curated economy, not a permission system.

### Conservation model

The conservation domain is `Σ ledgers + party actor + Σ PCs`. NPCs, merchants, monsters, and bestiary creatures are **external**. Coin enters the domain by minting; leaves by party-side spending; or transits the boundary via loot/sell/payment events that are individually logged.

The end-of-session **audit** verifies: every change to an in-domain actor's currency has a corresponding ledger row.

### Who this is for

A single-table GM running PF2E Remaster in Foundry v14. Public release is not a v1 goal, but the code should not preclude it.

### Why now

Three stacked motivations of roughly equal weight:
- **Incident prevention** — block the obvious cheat surface (raw sheet edits).
- **Narrative control** — a curated economy is a worldbuilding feature, not a guard rail.
- **Self-audit** — answer "where did this 200gp come from?" three sessions later.

### Background

This spec consolidates a design refinement of the original concept document at `docs/initial-design.md` (the user's `pf2e-wealth-management.md`). Key design pivots from the original:

- **Drop the heuristic classifier.** No more "is this update a sell? a trade? a conversion?" Just "is this increase backed by a recognizable shape, or is it a raw edit?"
- **Shrink the conservation domain.** NPCs are external (matches the merchant decision); GMs raw-edit NPC currency freely.
- **Multi-ledger from day one.** Plural data model even when only one ledger exists.
- **Theatre as a first-class feature.** Per-ledger persona drives chat card flavor; not a v1.1 nice-to-have.

---

## Tech Stack

- **Language:** TypeScript (strict mode)
- **Build:** Vite, with `vite-plugin-static-copy` for manifest/lang/templates
- **UI:** Foundry `ApplicationV2` (HandlebarsApplicationMixin) shells hosting Svelte components for panel internals. `ApplicationV1` is removed in v14 — no fallback path.
- **State:** Svelte stores backed by Foundry world settings + actor flags
- **Testing:** Vitest for pure logic; manual in-Foundry verification for UI flows
- **Foundry target:** v14. No v13 backcompat.
- **System target:** PF2E Remaster only.
- **Types:** `fvtt-types` (or `@league-of-foundry-developers/foundry-vtt-types`) + community PF2E system typings if available; otherwise narrow shims under `src/types/`.

### Dependencies (target list, finalized in setup)

- `svelte`, `@sveltejs/vite-plugin-svelte`
- `vite`, `vite-plugin-static-copy`
- `vitest`, `@vitest/ui`
- `typescript`, `@tsconfig/svelte`
- `fvtt-types` (dev)

No runtime dependency on any other Foundry module.

---

## Commands

```
Install:    npm install
Dev build:  npm run dev          # Vite watch mode, outputs to dist/
Build:      npm run build        # production bundle
Test:       npm run test         # vitest, single run
Test watch: npm run test:watch
Lint:       npm run lint
Typecheck:  npm run typecheck    # tsc --noEmit
Package:    npm run package      # build + zip dist/ for release
```

`npm run dev` should write to a Foundry-discoverable location (symlink from `Data/modules/pf2e-wealth-manager/` to `dist/` is the convention).

---

## Project Structure

```
pf2e-wealth-manager/
├── SPEC.md                       # this file
├── README.md                     # user-facing module readme
├── package.json
├── tsconfig.json
├── vite.config.ts
├── module.json                   # Foundry manifest (built into dist/)
├── docs/
│   ├── initial-design.md         # original design doc (preserved)
│   └── adr/                      # architecture decision records
├── src/
│   ├── module.ts                 # entry point, registers hooks + settings
│   ├── settings.ts               # world settings registration
│   ├── hooks/
│   │   ├── pre-update-actor.ts   # the interception point
│   │   └── ready.ts              # init/migration on world load
│   ├── domain/                   # pure logic, fully unit-testable
│   │   ├── ledger.ts             # ledger model + balance ops
│   │   ├── transaction.ts        # transaction record types
│   │   ├── classifier.ts         # shape detection (allow/block decision)
│   │   ├── conservation.ts       # audit invariant
│   │   └── currency.ts           # cp/sp/gp/pp arithmetic
│   ├── store/
│   │   ├── ledger-store.ts       # Svelte store over world data
│   │   └── transaction-store.ts
│   ├── ui/
│   │   ├── apps/                 # ApplicationV2 shells
│   │   │   ├── reserve-app.ts
│   │   │   ├── distribute-app.ts
│   │   │   ├── ledger-app.ts
│   │   │   └── audit-app.ts
│   │   └── components/           # Svelte components mounted in shells
│   │       ├── ReservePanel.svelte
│   │       ├── DistributePanel.svelte
│   │       ├── LedgerPanel.svelte
│   │       └── AuditPanel.svelte
│   ├── chat/
│   │   └── distribution-card.ts  # flavored chat card emission
│   ├── lang/
│   │   └── en.json               # i18n strings
│   └── types/                    # local type shims when upstream types lack
├── templates/                    # Handlebars templates for ApplicationV2 shells
├── styles/
│   └── module.css
├── tests/
│   └── domain/                   # vitest suites mirror src/domain/
└── dist/                         # build output, gitignored
```

**Key rule:** `src/domain/` must be pure TypeScript with no Foundry globals. It is the heart of the module and the only thing covered by automated tests. Everything Foundry-specific lives outside this directory.

---

## Code Style

### Conventions

- **Naming:** `kebab-case` for files, `PascalCase` for types, `camelCase` for functions and variables, `SCREAMING_SNAKE_CASE` for module-level constants.
- **Imports:** Explicit, no barrel files (`index.ts` re-exports) — they hurt tree-shaking and make navigation slower.
- **Errors:** Throw `Error` with descriptive messages; module-level errors get prefixed `[pf2e-wealth-manager] `. UI never crashes — domain errors are caught at the hook boundary and surface as Foundry notifications.
- **Currency:** Always work in **copper** internally (`number`, integer). Convert at UI edges only. PF2E's `1 gp = 10 sp = 100 cp`, `1 pp = 10 gp`. Never store currency as floats.
- **No defensive code at internal boundaries.** `src/domain/` trusts its inputs because callers are typed. Validation lives at the hook/UI seam.
- **Comments:** Default to none. Add one only when the *why* is non-obvious (a Foundry API quirk, a workaround, a subtle invariant).

### Example: a domain function

```typescript
// src/domain/conservation.ts
import type { Ledger, Transaction } from "./types";

/**
 * Verifies every change to an in-domain actor's currency has a matching
 * ledger row. Returns the first divergence found, or null if conserved.
 */
export function audit(args: {
  ledgers: ReadonlyArray<Ledger>;
  trackedActorTotals: ReadonlyMap<string, number>; // actorId -> copper
  transactions: ReadonlyArray<Transaction>;
}): AuditResult {
  const reconstructed = replayTransactions(args.transactions);

  for (const [actorId, observed] of args.trackedActorTotals) {
    const expected = reconstructed.actorTotals.get(actorId) ?? 0;
    if (observed !== expected) {
      return {
        ok: false,
        firstDivergence: {
          actorId,
          observedCopper: observed,
          expectedCopper: expected,
          delta: observed - expected,
        },
      };
    }
  }
  return { ok: true };
}
```

This is the tone: small, named, typed inputs; pure; testable; no Foundry globals. The hook layer feeds it data and surfaces results.

---

## Testing Strategy

### What we test automatically (Vitest)

Everything in `src/domain/`:

- Currency arithmetic across cp/sp/gp/pp boundaries (negative results, conversion edge cases).
- Ledger operations: mint, distribute, reclaim, transfer-between-ledgers, pay-to-ledger.
- Classifier shape detection: each allowed shape (item-delta, NPC-delta, socket-trade, reserve-mint, net-zero conversion) and the explicit raw-edit rejection.
- Conservation audit: produces `ok: true` for valid histories; identifies the first divergence in synthetic broken histories.
- Auto-split math: even split, remainder routing to party actor, manual override preservation.

Target: **>90% line coverage in `src/domain/`**, no coverage requirement elsewhere.

### What we verify manually

- Every scene in the playbook (see `docs/playbook.md`, written alongside v1):
  1. GM mints into a ledger and distributes; PCs receive coin and chat cards fire.
  2. PC loots NPC; ledger row appears.
  3. PC sells item to merchant; allowed silently.
  4. PC raw-edits currency; blocked, GM whisper fires.
  5. PC↔PC trade via Foundry's drag-drop; both sides logged.
  6. Currency conversion (sp→gp); allowed, logged.
  7. End-of-session audit passes.
  8. Multi-ledger: create a second ledger, distribute from each, transfer between them.

### Test layout

```
tests/domain/
  currency.test.ts
  ledger.test.ts
  classifier.test.ts
  conservation.test.ts
```

One file per domain module, mirrors `src/domain/`.

---

## Boundaries

### Always do

- Run `npm run typecheck && npm run test` before marking any task complete.
- Keep `src/domain/` free of Foundry globals (`game`, `canvas`, `ui`, `Hooks`).
- Treat all currency in copper internally.
- Log every in-domain currency change to the transaction store, even if no card fires.
- Update `SPEC.md` when a design decision changes; commit the spec change in the same PR as the implementation.

### Ask first

- Adding any runtime dependency.
- Changing the conservation domain (what's "internal" vs "external").
- Touching `module.json` compatibility ranges.
- Adding a new persisted data shape (world setting, actor flag, transaction field) — these need a migration story.
- Adding a v1.1 feature mid-v1.

### Never do

- Block GM actions. The GM is trusted; the lock is for non-GM players only.
- Block currency *decreases* on any actor. Spending is always free.
- Mutate actor data outside the `preUpdateActor` flow except via the explicit Reserve/Distribute/Reclaim APIs.
- Store secrets, API keys, or anything resembling them. (None should be needed.)
- Silently swallow `preUpdateActor` errors — they must surface as Foundry notifications.
- Delete or amend transaction log rows. The log is append-only; corrections are new rows referencing the original.

---

## Success Criteria

v1.0 is shippable when all of these are true:

1. **Multi-ledger CRUD.** GM can create, rename, delete (when balance is zero), and set the persona of any number of ledgers. Default ledger is auto-created on first install with the world's name.
2. **Mint.** GM can mint copper into any ledger. Mint is logged.
3. **Distribute.** GM enters an amount, picks a source ledger, selects PC recipients, sees an auto-split preview, can override per-recipient shares, confirms. Remainder routes to the party actor. Each recipient gets a flavored chat card.
4. **Reclaim.** GM can pull currency from a PC or the party actor back into a chosen ledger.
5. **Transfer.** GM can move currency between two ledgers in a single action. Logged as a single transaction with two sides.
6. **Pay-to-ledger.** A PC can pay a tracked ledger (e.g., tithe to the Society). Coin moves PC → ledger; logged.
7. **Raw-edit lock.** A non-GM raw edit on a PC's currency field is rejected. The GM receives a whisper. The PC sees the field revert.
8. **Shape allowance.** All five legitimate shapes pass through unblocked and are logged: item-delta, NPC-currency-delta in same tick, socket-mediated trade, reserve-issued mint, net-zero conversion.
9. **Ledger panel.** GM can view the full transaction log, filtered by ledger, by actor, or by flow type. Long logs can be archived (moved to a separate journal entry, removed from the live view).
10. **Conservation audit.** A single command/button checks the invariant and reports the first divergence with actor and delta. Passes on a freshly-installed module after the playbook scenes.
11. **Theatre.** Each ledger has a `name` and `persona` (a short flavor string). Distribution chat cards render the persona. Default cards are short and readable.
12. **Domain test coverage.** `npm run test` passes with >90% line coverage on `src/domain/`.
13. **Type safety.** `npm run typecheck` passes with strict mode, no `any` outside `src/types/` shims.

### v1.1 (out of scope for v1)

- Player-visible ledger balances (per-ledger `visibility` field already exists in v1, just no player UI).
- Faction external spend UI.
- Mid-campaign onboarding wizard.
- GM approval queue for unrecognized update shapes (currently: blocked silently, GM-whispered, no queue).
- PC↔PC trade UI (Foundry's built-in drag-drop is sufficient for v1).

---

## Open Questions

1. **NPC seed flow.** Should the "Seed from Reserve" button on NPC sheets ship in v1, or is direct GM raw-edit on NPCs sufficient? Direct edits are simpler; seeding gives full traceability for big hauls. *Working assumption:* ship the button in v1, default off via setting.

2. **Trade detection mechanism.** PC↔PC trades via drag-drop fire two `preUpdateActor` events on different actors. Are these reliably correlatable in Foundry v14 (same tick? shared transaction id?), or do we need a custom socket layer? *Working assumption:* tick-correlation is sufficient at one table; revisit if false-blocks occur.

3. **Bestiary actor pre-loaded currency.** PF2E creatures sometimes carry currency in compendium data. Dragging them onto a scene fires `actor.create`, not `actor.update`, so they enter the world without a ledger row — which is correct (they're external). Confirm no edge case exists where this trips the audit.

4. **`fvtt-types` vs `@league-of-foundry-developers/foundry-vtt-types`.** Both exist; community is mid-migration. Pick whichever has better v14 coverage at setup time. If neither is v14-ready, fall back to local shims under `src/types/`.

5. **Archive storage shape.** "Archived" transactions need to live somewhere queryable but out of the live view. JournalEntry pages? A separate world setting blob? *Working assumption:* JournalEntry pages, one per archived batch.

---

## Approval

This spec is the contract. Implementation should not begin until the human has reviewed and approved it. Updates to scope or design must be reflected here, in the same PR as the code that implements them.
