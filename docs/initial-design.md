# pf2e-wealth-management

A FoundryVTT module for PF2E that gives the GM control over a closed, traceable currency economy.

---

## The core idea

By default, PF2E currency fields are open — any player can type any number. This module replaces that with a **conservation-of-value model**: every coin has a known origin, all flows between actors are logged, and the GM is the sole source of new money.

```
Reserve  +  Party actor  +  Σ PC wallets  +  Σ NPC wallets  =  constant
```

Players retain full spending agency. They can loot, shop, trade, and convert currency freely. The module mediates and records these flows — it doesn't get in the way of them.

---

## What the GM gets

- **Reserve panel** — a personal unissued pool to mint, hold, and distribute currency from
- **Distribution panel** — enter an amount, select recipients, review an auto-split, adjust per-player shares, confirm; remainder routes to the party actor automatically
- **Reclaim** — pull currency back from a PC or the party actor into the reserve
- **Transaction ledger** — every currency event logged with timestamp, actor, amount, and flow type; archivable when it gets long

## What players get

- A chat notification when they receive currency from the GM
- A lock icon on their currency field communicating it's GM-managed
- Everything else works as normal — spending, looting, selling, trading, converting

---

## How the lock works

The module intercepts every actor update via `preUpdateActor`. If currency is increasing without a trusted-source flag, the update is cancelled, classified, and re-issued with the flag set. From the player's perspective the update still goes through — the interception is invisible for legitimate flows. Only raw sheet edits by non-GMs are outright rejected.

| Flow | Outcome |
|---|---|
| GM distributes | Trusted — reserve decreases |
| PC loots NPC | Trusted — both sides logged |
| PC sells to merchant | Trusted — detected via item-removal + currency-increase in same update |
| PC ↔ PC trade | Trusted — both sides updated atomically via socket |
| Currency conversion (cp→gp) | Trusted — net-zero detected automatically |
| Raw sheet edit | Blocked and logged |
| Unknown external module push | Blocked — GM notified for manual approval |

---

## Key design decisions

**Merchants are a sink.** Merchant NPC wallets accumulate from purchases but are not tracked against the reserve. Strict conservation there adds complexity without meaningful insight.

**Party actor is used as-is.** PF2E's built-in party sheet currency serves as the shared wallet. No custom storage.

**Spending is always free.** Only increases are intercepted. Players can spend, donate, and convert without any friction.

---

## Known limitations

- **Item-based wealth is untracked.** A "Sack of 500gp" item bypasses currency fields entirely. Out of scope for v1.
- **No true atomicity.** Two-actor flows (trades, looting) have no transaction primitive in Foundry. Partial failure is caught and flagged but not automatically rolled back.
- **Mid-campaign onboarding requires a manual seed.** Installing on an existing world with non-zero PC wealth requires a one-time audit to initialise the reserve correctly.

---

## Delivery scope

**v1.0**
Reserve panel · Distribution panel · Trusted-flag interception · Ledger with archive · Chat notifications · Lock icon · Conservation audit command

**v1.1**
GM approval queue for external module pushes · Player transaction history · PC↔PC trade UI · Mid-campaign onboarding wizard
