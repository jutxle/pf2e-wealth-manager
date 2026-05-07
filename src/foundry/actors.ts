// Foundry actor enumeration helpers. Confined to PF2E (Remaster) shapes.
// Tracked actors = PCs (player-owned characters) + the party actor.

import { fromCopper, toCopper } from '../domain/currency.js';

export interface ActorRef {
  id: string;
  name: string;
  type: 'character' | 'party';
}

export function listPlayerCharacters(): ActorRef[] {
  return game.actors
    .filter((a) => a.type === 'character' && a.hasPlayerOwner)
    .map((a) => ({ id: a.id, name: a.name, type: 'character' as const }));
}

export function getPartyActor(): ActorRef | null {
  const party = game.actors.find((a) => a.type === 'party');
  return party ? { id: party.id, name: party.name, type: 'party' } : null;
}

export function getActorCopper(actorId: string): number {
  const actor = game.actors.get(actorId);
  if (!actor) return 0;
  const c = actor.system.coins ?? {};
  return toCopper({
    pp: c.pp ?? 0,
    gp: c.gp ?? 0,
    sp: c.sp ?? 0,
    cp: c.cp ?? 0,
  });
}

export function readTrackedActorTotals(): Map<string, number> {
  const totals = new Map<string, number>();
  for (const pc of listPlayerCharacters()) totals.set(pc.id, getActorCopper(pc.id));
  const party = getPartyActor();
  if (party) totals.set(party.id, getActorCopper(party.id));
  return totals;
}

// Coin update through actor.update with a namespaced reserve token in options.
// The Task 9 hook reads options.pwm.reserveToken to identify legitimate flows.
export async function addCopperToActor(
  actorId: string,
  copper: number,
  reserveToken: string,
  ledgerId: string
): Promise<void> {
  if (copper <= 0) return;
  const actor = game.actors.get(actorId);
  if (!actor) throw new Error(`actor not found: ${actorId}`);
  const current = getActorCopper(actorId);
  const next = fromCopper(current + copper);
  await actor.update(
    {
      'system.coins.pp': next.pp,
      'system.coins.gp': next.gp,
      'system.coins.sp': next.sp,
      'system.coins.cp': next.cp,
    },
    { pwm: { reserveToken, ledgerId } }
  );
}
