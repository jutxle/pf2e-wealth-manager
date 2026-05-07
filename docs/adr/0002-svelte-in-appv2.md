# ADR 0002: Mounting Svelte 5 components inside ApplicationV2

**Status:** Accepted
**Date:** 2026-05-07
**Context:** SPEC.md `Tech Stack`, Task 7

## Decision

Foundry's `ApplicationV2` (with `HandlebarsApplicationMixin`) renders a thin Handlebars template that contains a single mount target element. Inside `_onRender`, the module mounts a Svelte 5 component into that target via `mount()` from `svelte`. On `_preClose`, the component is `unmount()`-ed.

```
ApplicationV2 (lifecycle, window chrome)
   └── HandlebarsApplicationMixin (renders templates/<panel>.hbs)
         └── <div class="pwm-svelte-root"></div>
               └── Svelte 5 component (panel internals, state, behavior)
```

Reactive state is read from the existing Svelte stores (`ledger-store.ts`, `transaction-store.ts`) via the `$store` auto-subscription; component-local state uses Svelte 5 runes (`$state`, `$derived`).

## Rationale

- **AppV2 owns the window chrome and lifecycle.** Foundry's window manager, drag/resize, sidebar tabs, and close behavior all rely on AppV2. We don't fight that.
- **Svelte owns the panel internals.** Reactivity, two-way binding, and conditional rendering are vastly cleaner in Svelte than in raw Handlebars + jQuery, and the panel logic is the part that grows.
- **The handoff is one DOM node.** The `.hbs` file is essentially `<div class="pwm-svelte-root"></div>`. The hbs is for the AppV2 contract (PARTS expects a template); the work happens in Svelte.
- **Stores are app-singletons.** Both the ledger and transaction stores are module-level Svelte writables hydrated once on the `ready` hook. Every panel reads the same state.

## Contract for new panels

To add a new panel (Distribute, Ledger, Audit, ...):

1. Create `templates/<panel>.hbs` containing a single `<div class="pwm-svelte-root"></div>`.
2. Create `src/ui/components/<Panel>.svelte` for the actual UI; subscribe to the relevant Svelte stores.
3. Create `src/ui/apps/<panel>-app.ts` that:
   - extends `HandlebarsApplicationMixin(ApplicationV2)`
   - sets `DEFAULT_OPTIONS` (id, classes, window title)
   - sets `PARTS = { main: { template: 'modules/pf2e-wealth-manager/templates/<panel>.hbs' } }`
   - holds a `#svelte` instance field
   - mounts the component in `_onRender` and unmounts in `_preClose`
4. Open the panel from a scene-controls button, settings menu item, or the module API.

The pattern is mechanical enough to template if it grows past three panels.

## Consequences

- **Pro:** Clean separation. Foundry concerns stay in AppV2 wrappers; UI logic stays in `.svelte` files.
- **Pro:** Adding a panel is a small, repeatable operation.
- **Pro:** Component code is testable in isolation later (with `@testing-library/svelte`) — though for v1 we verify visually.
- **Con:** Two files per panel (the AppV2 wrapper + the Svelte component) instead of one.
- **Con:** AppV2's render cycle (re-render on data change) is bypassed — Svelte handles all reactivity once mounted. If we ever need AppV2's render path, the wrapper has to manually re-mount.
- **Con:** Type-checking inside `.svelte` files isn't covered by `tsc --noEmit`. Build-time checks via `vite-plugin-svelte` catch syntax errors. We may add `svelte-check` as a pre-commit step in v1.1.

## Alternatives Considered

- **Plain ApplicationV2 (no Handlebars), implementing `_renderHTML` + `_replaceHTML` ourselves.** Cleaner — no `.hbs` middleman — but diverges from the SPEC's stated tech stack and gives up access to Foundry's PARTS lifecycle. Worth revisiting if HBS becomes friction.
- **Pure Handlebars + jQuery.** What every Foundry module did before AppV2. Verbose and error-prone for the kinds of forms and reactive state we need (the Distribute auto-split is the worst case).
- **HTM / Lit / direct DOM.** Less ecosystem fit; Svelte is already familiar to the author.
