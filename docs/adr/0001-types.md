# ADR 0001: Foundry type shims for v1

**Status:** Accepted
**Date:** 2026-05-07
**Context:** SPEC.md Open Question #4, Task 1

## Decision

Start with **local type shims** under `src/types/foundry.d.ts`. Do not depend on `fvtt-types` or `@league-of-foundry-developers/foundry-vtt-types` in v1.

## Rationale

- Foundry v14 is recent. Both community type packages are mid-migration; their v14 coverage is uneven, and tracking their releases is a real maintenance cost we don't need to pay during v1.
- The Foundry surface area we touch is small: `Hooks`, `game.settings`, `Actor` updates via `preUpdateActor`, `ChatMessage`, `ApplicationV2`. We can declare these narrowly as we use them.
- The pure domain layer (`src/domain/`) — which contains the bulk of the logic — has no Foundry dependency at all. Type shims only matter at the seam.
- Local shims keep `npm install` lean and decouple us from upstream churn during v1 development.

## Consequences

- **Pro:** Zero typing dependency surface. Strict mode passes from day one. No version-pinning risk.
- **Pro:** Each shimmed type is exactly as wide as we need; no dragging in irrelevant Foundry surface.
- **Con:** We're hand-rolling type declarations, which means we don't get autocomplete for Foundry APIs we haven't shimmed yet.
- **Con:** When v1.1 rolls around, swapping in a real types package is a small migration. We'll re-evaluate then.

## Upgrade Path

When upstream v14 coverage matures (or when our shim grows past ~100 lines), evaluate `fvtt-types` first (it has the more active v14 effort). The migration is a delete-and-replace of `src/types/foundry.d.ts`; `tsc --noEmit` will surface every site that needs adjustment.

## Alternatives Considered

- **`fvtt-types`** — Promising and recommended in modern Foundry community guidance, but v14 coverage is in flux. Reasonable in 6 months; risky now.
- **`@league-of-foundry-developers/foundry-vtt-types`** — More conservative and battle-tested, but historically lags major Foundry versions. Likely behind v14.
- **No types at all (`@ts-ignore` everywhere)** — Defeats the strict-mode decision in the spec. Rejected.
