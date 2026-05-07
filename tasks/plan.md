# Implementation Plan: pf2e-wealth-manager

## Overview

Build a FoundryVTT v14 module for PF2E (Remaster) that mints all new currency through one or more named **ledgers**, observes every currency change in the conservation domain (reserve(s) + party + PCs), and blocks exactly one cheat surface (player raw-edits). See [SPEC.md](../SPEC.md) for the full contract.

The plan is sliced vertically once the pure-domain foundation exists. Each post-foundation phase delivers a working end-to-end feature visible in Foundry.

## Architecture Decisions

- **Pure domain layer (`src/domain/`) is built and fully tested before any Foundry-bound code.** This is the only layer with unit tests (>90% coverage). Everything else is glue, verified manually against the playbook.
- **First end-to-end slice = Mint + Reserve panel.** Not distribute, not the lock — the smallest thing that proves "TS+Vite+Svelte+ApplicationV2+Foundry settings" all wire together.
- **Multi-ledger is built in two stages.** Phase 2 ships single-ledger end-to-end (default ledger auto-created), then Phase 5 adds the CRUD/picker UI on top of an already-plural data model. Storage is plural from day one.
- **No Foundry globals in `src/domain/`.** The domain is fed plain data by the hook/UI layer and returns plain results. This is the rule that makes the whole module testable.
- **`preUpdateActor` is the single interception point.** All shape detection (raw-edit vs. legitimate flow) happens there.
- **Currency is stored as integer copper everywhere internally.** Conversion to gp/sp/cp/pp is a UI-edge concern only.

## Dependency Graph

```
Phase 1 (Foundation, pure TS)
    currency ─┐
              ├─→ ledger ──→ classifier ──→ conservation
    transaction ─┘                            │
                                              ▼
Phase 2 (Foundry seam, single-ledger slice)   │
    settings + stores ──→ Reserve panel       │
                              │               │
                              ▼               │
                          Distribute panel + chat card
                              │               │
Phase 3 (Lock)                ▼               │
    preUpdateActor hook (uses classifier)     │
                              │               │
Phase 4 (Read-only insight)   ▼               ▼
                          Ledger panel ──→ Audit panel
                              │
Phase 5 (Multi-ledger expansion)
    Ledger CRUD ──→ Distribute "From" + Reclaim ──→ Transfer ──→ Pay-to-ledger
                              │
Phase 6 (Polish + ship)
    NPC seed button ──→ Archive ──→ Playbook verification
```

## Task List

### Phase 1: Foundation (pure domain, no Foundry)

- **Task 1** — Project scaffolding (TS + Vite + Svelte + Vitest + module.json)
- **Task 2** — Currency arithmetic (`src/domain/currency.ts`)
- **Task 3** — Transaction + Ledger types and operations
- **Task 4** — Classifier (shape detection)
- **Task 5** — Conservation audit

#### Checkpoint A — Foundation
- [ ] `npm run typecheck` passes (strict)
- [ ] `npm run test` passes
- [ ] Coverage on `src/domain/` ≥ 90% lines
- [ ] `npm run build` produces a loadable `dist/` (even if it does nothing in Foundry yet)
- [ ] **Human review before proceeding** — the domain shape is the contract everything else depends on.

### Phase 2: First end-to-end slice (mint + distribute)

- **Task 6** — Persistence (settings registration, ledger + transaction stores, default-ledger auto-creation)
- **Task 7** — Reserve panel (view ledger balance + mint form)
- **Task 8** — Distribute panel + flavored chat cards

#### Checkpoint B — First slice
- [ ] In a real Foundry world, the GM can open Reserve, mint into the default ledger, and see the balance update.
- [ ] The GM can open Distribute, select PCs, see auto-split, override shares, confirm; PC currency updates and chat cards fire with the ledger persona.
- [ ] No errors in browser console during the flow.
- [ ] Transaction store contains rows for the mint and each distribution leg.
- [ ] **Human review** — this is the moment to validate the architecture before adding the lock and audit.

### Phase 3: The lock

- **Task 9** — `preUpdateActor` hook (block raw edits, allow shapes, log everything)

#### Checkpoint C — Lock works
- [ ] Player raw-editing their gp field is rejected; field reverts; GM gets a whisper.
- [ ] Player looting an NPC succeeds; transaction logged with `flow: loot`.
- [ ] Player selling to a merchant succeeds; transaction logged with `flow: sell`.
- [ ] Currency conversion (sp→gp) succeeds; transaction logged with `flow: convert`.
- [ ] GM raw-editing any actor's currency succeeds (GM is trusted).
- [ ] No false positives in 10 minutes of mixed-flow play.

### Phase 4: Read-only insight

- **Task 10** — Ledger panel (filtered transaction log view)
- **Task 11** — Conservation audit panel + command

#### Checkpoint D — Insight complete
- [ ] Ledger panel shows all transactions; filters by ledger/actor/flow work.
- [ ] Audit button reports `ok` on a freshly-installed module after the playbook scenes.
- [ ] Audit reports the correct divergence when the world is manually corrupted (force-edit a flag to break conservation).

### Phase 5: Multi-ledger expansion

- **Task 12** — Multi-ledger CRUD (create/rename/delete/persona/visibility)
- **Task 13** — Distribute "From" selector + Reclaim panel
- **Task 14** — Transfer between ledgers
- **Task 15** — Pay-to-ledger from PC

#### Checkpoint E — Multi-ledger complete
- [ ] GM can create a second ledger with its own persona; both appear in pickers.
- [ ] Distributing from each produces correctly-attributed chat cards.
- [ ] Reclaiming from a PC into a chosen ledger updates both sides; logged.
- [ ] Transferring between two ledgers logs a single two-sided transaction.
- [ ] PC paying a ledger updates both sides; logged.
- [ ] Audit still passes.
- [ ] All 13 success criteria from SPEC.md are satisfied.

### Phase 6: Polish + ship

- **Task 16** — NPC seed-from-reserve button
- **Task 17** — Transaction archive (JournalEntry-backed)
- **Task 18** — Playbook verification + bug-fix pass + README

#### Checkpoint F — v1.0 ready
- [ ] All eight playbook scenes pass.
- [ ] No console errors during a 30-minute mock session.
- [ ] README has install instructions and a screenshot of each panel.
- [ ] Module zip builds via `npm run package` and installs cleanly into a fresh Foundry world.
- [ ] Open Questions in SPEC.md are either resolved or explicitly punted to v1.1 with a tracking issue.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `fvtt-types` v14 coverage incomplete | Medium | Fall back to local shims under `src/types/`. Don't gate on upstream. Decided in Task 1. |
| ApplicationV2 + Svelte mounting pattern not standard yet | Medium | Prove the pattern in Task 7 with the simplest possible mount. Document the chosen pattern in `docs/adr/0001-svelte-in-appv2.md`. Reuse blindly afterward. |
| `preUpdateActor` doesn't give enough context to correlate trades | Medium | Spike at the start of Task 9 (30 min). If tick-correlation is unreliable, add a thin socket layer scoped to PC↔PC trades only — don't expand the classifier. |
| World-settings size limits hit by long transaction logs | Low–Medium | Archive task (17) is in scope. If Phase 5 reveals the limit is closer than expected, promote archive into Phase 4. |
| Currency arithmetic edge cases (negative balances, conversion rounding) | Low | Aggressive Vitest cases in Task 2. Domain functions throw on invariant violations; UI catches at the seam. |
| Player drag-drop trade fires hooks in an order we don't expect | Low | Logged-not-blocked is the default for ambiguous shapes; raw-edit is the only hard block. False-negatives don't break safety, only audit completeness. |
| PF2E system update mid-build changes currency data shape | Low | Pin the system version in `module.json` `relationships`. Update spec when bumping. |

## Open Questions (from SPEC.md)

These should be resolved during the phase that touches them, not before:

1. **NPC seed button in v1?** — Resolved in Task 16. Working assumption: ship it, default off.
2. **Trade detection mechanism.** — Resolved at start of Task 9 via spike.
3. **Bestiary pre-loaded currency edge case.** — Verified during Task 18 playbook.
4. **`fvtt-types` choice.** — Resolved in Task 1.
5. **Archive storage shape.** — Resolved in Task 17. Working assumption: JournalEntry pages.

## Parallelization Notes

Most of the plan is sequential because each phase verifies the previous. Within phases, some opportunities exist:

- **Phase 1:** Tasks 2, 3, 4, 5 can be parallelized once Task 1 is done — each is its own pure-domain file with its own test file.
- **Phase 5:** Tasks 14 and 15 (transfer, pay-to-ledger) can be parallelized after Task 13.
- Everything else has hard dependencies and must run in order.

## Task Detail Reference

For full acceptance criteria, verification commands, files touched, and size estimates, see [todo.md](todo.md).
