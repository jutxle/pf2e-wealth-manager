# Handoff: pf2e-wealth-manager

This file is the cold-start briefing for the next agent or session picking up this project. Read it once, then dive into [SPEC.md](../SPEC.md) and [tasks/plan.md](plan.md) for full context.

---

## What this is

A FoundryVTT v14 module for PF2E (Remaster) that gives the GM a curated, traceable, multi-faction currency economy. Core ideas:

- **Mint + Observe**, not lock-and-classify. The GM mints coin into named **ledgers** (factions). All currency changes on tracked actors are observed and logged. The only blocked surface is a non-GM raw edit.
- **Conservation domain = reserve(s) + party actor + PCs.** NPCs and merchants are external; coin crossing the boundary is logged but not gated.
- **Theatre matters.** Each ledger has a `name` and `persona`. Distribution chat cards are flavored. The lock is invisible plumbing.

Every other design decision flows from these three.

## Where to find what

```
SPEC.md                         # design contract — read this first
docs/initial-design.md          # the user's original concept (preserved)
docs/adr/0001-types.md          # local Foundry type shims (vs. fvtt-types)
docs/adr/0002-svelte-in-appv2.md# AppV2 + Svelte mounting pattern (mechanical)
tasks/plan.md                   # 18-task plan, dependency graph, risks
tasks/todo.md                   # full acceptance criteria per task
tasks/handoff.md                # this file
src/domain/                     # pure logic, fully unit-tested, no Foundry
src/store/                      # Svelte stores backed by Foundry settings
src/foundry/                    # the only place that touches game.actors
src/ui/apps/                    # ApplicationV2 wrappers (one per panel)
src/ui/components/              # Svelte 5 panel internals
src/chat/                       # chat card emission
src/hooks/                      # ready, plus future preUpdateActor (Task 9)
src/types/foundry.d.ts          # local type shims — extend as you use APIs
```

## What's done (commits, in order)

```
Task 1   project scaffolding (TS strict + Vite + Svelte 5 + Vitest)
Task 2   currency arithmetic (cp/sp/gp/pp, integer-only, splitEvenly)
Task 3   Transaction/Ledger types + computeBalance + listTransactions
Task 4   classifier (UpdateContext → Shape | raw-edit)
Task 5   conservation audit (replay + first-divergence)
Task 6   persistence layer (settings + Svelte stores + first-install migration)
Task 7   Reserve panel (mint + balance display)            ← Checkpoint B
Task 8   Distribute panel + flavored chat cards            ← Checkpoint B
Task 10  Ledger panel (filter, paginate, read-only)        ← Checkpoint D
Task 11  Audit panel (one-button conservation check)       ← Checkpoint D
```

State: **97 tests pass, 100% line coverage on `src/domain/`, typecheck strict, build green (104 kB).**

## What's NOT done

- **Task 9** — the lock (`preUpdateActor` hook). This is the heart of the runtime story and has a built-in 30-min spike requirement against a real Foundry world.
- **Task 12** — multi-ledger CRUD UI. Refactors Reserve into list-of-ledgers.
- **Tasks 13–17** — multi-ledger Distribute/Reclaim, Transfer, Pay-to-ledger, NPC seed, Archive.
- **Task 18** — playbook verification + README.

## Critical: things that haven't been verified in Foundry yet

The user has not loaded the module into a real Foundry world. Two checkpoints are formally pending:

- **Checkpoint B** (mint + distribute slice working end-to-end)
- **Checkpoint D** (ledger panel + audit panel rendering and operating correctly)

Until Checkpoint B passes, **assume the Foundry-facing code may have bugs**. The pure domain layer is well-tested and trustworthy. The seam — `src/foundry/actors.ts`, the AppV2 wrappers, scene controls registration — is best-effort against type shims.

Specifically watch for:

- `system.coins.{pp,gp,sp,cp}` field path. User confirmed this is numeric in PF2E v14, but the exact path could be `system.coins.gp.value` or similar. If `addCopperToActor` doesn't write correctly, that's the first place to look.
- `getSceneControlButtons` v14 shape. The hook is defensive against array vs. object structures, but the `tokens`/`token` key might be different in v14. The `game.modules.get(MODULE_ID).api.openX()` console fallbacks always work.
- `hasPlayerOwner` getter on Actor. Standard but worth confirming.
- `foundry.applications.api.HandlebarsApplicationMixin` lifecycle hooks. We use `_onRender` for mounting and `_preClose` for unmounting. Names could differ slightly in v14.

## Architectural decisions you should not relitigate

These were debated and decided. Don't re-open them without a new reason:

1. **Conservation domain is reserve + party + PCs only.** NPCs are external. The original design's `Σ NPC wallets = constant` was dropped because it can't be maintained when GMs raw-edit NPC currency.
2. **Mint+Observe, not Lock+Classify.** The classifier still exists, but its job is "is this update a recognized shape?" not "what kind of flow is this?" Raw-edit by non-GM is the only blocked surface.
3. **Multi-ledger from day one.** Data model is plural in Task 6. UI for managing multiple ledgers is Task 12. Don't try to add ledgers as a v1.1 feature — the storage migration is a one-way door.
4. **Theatre is first-class.** `ledger.persona` is a field; chat cards already render it; do not let it slip to v1.1.
5. **`src/domain/` is pure TypeScript with no Foundry globals.** This is the rule that makes the module testable. Do not violate it.
6. **Svelte 5 components mount inside ApplicationV2 via `mount()`/`unmount()`.** Pattern is in [docs/adr/0002-svelte-in-appv2.md](../docs/adr/0002-svelte-in-appv2.md). It's mechanical now — three panels follow it identically.
7. **Reserve token rides on `actor.update`'s third options arg.** Specifically `options.pwm.reserveToken` and `options.pwm.ledgerId`. The Task 9 hook will read these to identify GM-initiated flows. Player-initiated pay-ledger (Task 15) needs a different mechanism — likely a socket — because options can be forged client-side.
8. **GM is always trusted.** Never block a GM action. Never block a currency *decrease*. Only block non-GM raw edits.

## How Task 9 should go

Task 9 is the next big task and the only one with a built-in empirical step. Plan:

1. **Spike (30 min)** in a real Foundry v14 world with PF2E:
   - Confirm `preUpdateActor` fires on `actor.update({'system.coins.gp': N})`.
   - Capture the `changes` and `options` arguments to see exactly what shape they have.
   - Try a sell (drag item from PC inventory to merchant): does `preUpdateActor` fire? Does the same update batch include both the currency change and the inventory change? If not, we need `preUpdateItem` or a same-tick correlator.
   - Try a PC↔PC trade: do two `preUpdateActor` events fire in the same tick? Can they be correlated by timestamp or transaction id?
   - Try a currency conversion (sp → gp on the same actor): is it net-zero in the diff?
   - **Document findings in [docs/adr/0003-shape-detection.md](../docs/adr/) before writing code.**

2. **Implement** based on findings. The classifier's `UpdateContext` is the contract — it's already built and tested. Task 9 just produces that context from a real Foundry diff.

3. **Verify** against the playbook: raw edit blocked, loot allowed, sell allowed, convert allowed, GM raw-edit allowed.

4. The user already confirmed PF2E uses **numeric `system.coins`** (not item-based). If that turns out to be wrong, the classifier rules need rethinking in terms of item events — but the user is more authoritative than I was on this question.

## Known risks (from plan.md, with current status)

| Risk | Status |
|---|---|
| `fvtt-types` v14 incomplete | Mitigated — using local shims, no upstream dep. ADR-0001. |
| AppV2 + Svelte mounting unstable | Pattern is set in ADR-0002. Three panels use it. Verified at build, not at runtime. |
| `preUpdateActor` correlation for trades unreliable | **Open.** Resolves at Task 9 spike. |
| World-settings size limits | Not yet hit. Archive task (17) is in scope; promote earlier if needed. |
| PF2E system data shape changes | Pinned to `pf2e >= 7.0.0` in module.json. Update when bumping. |

## What I'd do next, were I you

The user is currently away from Foundry and asked what could proceed without runtime. Last turn I offered three options:

1. **Task 12 (multi-ledger CRUD)** — least risky non-runtime work. Refactors Reserve panel into a list-of-ledgers; backing data model is already plural.
2. **Quality pass** — `svelte-check` to bring `.svelte` type errors into `npm run typecheck`; tighten coverage config to scope `src/domain/` only.
3. **Wait for Foundry session.**

The user did not pick one — they ended the session here and asked for this handoff. **Start by asking which path they want.** Don't pick on their behalf.

When Foundry access returns, the highest-value play is the Task 9 spike: it unblocks Tasks 13, 15, and the entire lock story.

## How to commit

Match the existing convention:

```
Task N: brief title

One-paragraph what-and-why.

Bullets if there's structural commentary.

Verified:
- npm run typecheck passes
- npm run test passes (NN tests, MM passing)
- npm run build produces dist/

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

Pure-domain work always gets tests first (RED → GREEN). Foundry-coupled glue is verified by typecheck + build + manual playbook. Don't try to unit-test the seam.

## Quick verification checklist before declaring a task done

```
npm run typecheck    # strict — no any leaks
npm run test         # all tests pass
npm run build        # dist/ builds
```

Then commit. Then update this file's "What's done" section if the increment is meaningful.

---

Last touched: end of Task 11. 97 tests passing. Foundry runtime verification of Tasks 6–11 is the user's next move.
