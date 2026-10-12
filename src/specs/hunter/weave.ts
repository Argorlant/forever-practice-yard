// Melee weaving for ranged hunters (an optional advanced mode): after an Auto
// Shot leaves, step through the dead zone into melee, take a swing or Raptor
// Strike, and step back out before the next windup. The engine runs both
// autos (Combat.weaving) and applies the chosen Auto Shot reset rule; this
// file gives the cues, the glow in melee, the range rings and the review.
// Timing and value: research/hunter_forever.md → Melee weaving.
import type { Combat } from '../../engine/combat';
import { MELEE_RANGE, RANGED_MIN, YARD } from '../../engine/combat';
import type { Hit, SettingField } from '../../engine/types';

/** Running speed, 7 yards per second. */
const RUN = 7 * YARD;

interface WeaveState { lastShot: number; lastMelee: number }
const states = new WeakMap<Combat, WeaveState>();
const state = (c: Combat): WeaveState => {
  let s = states.get(c);
  if (!s) states.set(c, (s = { lastShot: -Infinity, lastMelee: -Infinity }));
  return s;
};

export const WEAVE_OPTIONS: SettingField[] = [
  { key: 'meleeWeaving', name: 'Melee weaving (advanced): Auto Shot and your melee swing run together; step in between shots for a swing or Raptor Strike', kind: 'toggle' },
  {
    key: 'autoShotReset', name: 'Melee weaving: what a melee swing does to Auto Shot', kind: 'choice',
    choices: [
      { value: 'classic', label: 'Classic: the two timers are independent (default)' },
      { value: 'beta', label: 'Forever beta today: it restarts the Auto Shot timer (reported as bug #14)' },
      { value: 'wrath', label: 'Wrath: each one restarts the other' },
    ],
  },
];

/** Turns the mode on for ranged builds and keeps track of shots and swings. */
export function setupWeaving(c: Combat, melee: boolean): void {
  states.set(c, { lastShot: -Infinity, lastMelee: -Infinity });
  c.weaving = !melee && !!c.options.meleeWeaving;
  const rule = String(c.options.autoShotReset ?? 'classic');
  c.autoShotReset = rule === 'beta' || rule === 'wrath' ? rule : 'classic';
  if (!c.weaving) return;
  c.afterDamage.push((h: Hit) => {
    const s = state(c);
    if (h.source === 'autoShot') s.lastShot = c.t;
    if (h.source === 'melee_mh' || h.source === 'raptorStrike') {
      s.lastMelee = c.t;
      c.count(h.source === 'raptorStrike' ? 'weaveRaptor' : 'weaveWhite');
      c.count('weaveDamage', h.amount);
    }
  });
  // Time spent in the dead zone, where nothing fires.
  c.applyAura(c.player, {
    id: 'weaveWatch', name: 'Weaving', icon: 'raptorStrike', duration: Infinity, period: 0.1, hidden: true,
    onTick: (cc) => {
      const u = cc.target;
      if (u && cc.player.inCombat && cc.autoShooting && !cc.inRange(u) && !cc.inRangedRange(u)) cc.count('deadZone', 0.1);
    },
  });
}

const raptorReadyIn = (c: Combat) => c.cooldownLeft('raptorStrike').left;
const raptorAffordable = (c: Combat) => c.cost(c.ability('raptorStrike')!) <= c.player.resource;

/** The cue above the action bar: when to step in, swing, and step out. */
export function weaveCue(c: Combat): { text: string; tone: 'go' | 'hit' | 'back' } | null {
  const u = c.target;
  if (!c.weaving || !c.autoShooting || !u || u.health <= 0) return null;
  const s = state(c);
  const run = RUN * c.moveSpeed();
  const d = c.distance(u);
  const meleeEdge = MELEE_RANGE + u.radius * 0.5;
  const rangedEdge = RANGED_MIN + u.radius;
  const travelOut = Math.max(0, rangedEdge + 0.1 - Math.min(d, meleeEdge)) / run;
  const toShot = c.windup ? 0 : c.timeToWindup();
  const swung = s.lastMelee > s.lastShot;
  const late = toShot <= travelOut + 0.15;

  if (c.inRange(u)) {
    if (!swung && !late) {
      if (raptorReadyIn(c) === 0 && raptorAffordable(c) && c.queuedSwing !== 'raptorStrike') return { text: 'Raptor Strike', tone: 'hit' };
      return { text: 'Swing…', tone: 'hit' };
    }
    return { text: 'Step out', tone: 'back' };
  }
  if (!c.inRangedRange(u)) return swung || late ? { text: 'Step out', tone: 'back' } : { text: 'Step in', tone: 'go' };

  // At range: is there room for a weave before the next windup?
  if (c.windup || c.casting || c.channeling) return null;
  if (c.aura(c.player, 'rapidFire') || c.aura(c.player, 'quickShots')) return null;
  const travelIn = Math.max(0, d - meleeEdge + 0.1) / run;
  // The melee swing must be ready when you arrive (a 3.2 sec glaive swings rarely).
  if (c.swingLeft('main').left > travelIn + 0.3) return null;
  const window = travelIn + 0.15 + travelOut + 0.25;
  // A cast is worth more than a weave: Aimed Shot stays at range when it comes up.
  if (c.cooldownLeft('aimedShot').left < window && c.cost(c.ability('aimedShot')!) <= c.player.resource) return null;
  const go = { text: 'Step in', tone: 'go' as const };
  // Raptor Strike (~300 damage) is worth a late shot: go right after a shot leaves, under every rule.
  if (raptorReadyIn(c) <= travelIn && raptorAffordable(c)) return c.t - s.lastShot <= 0.6 ? go : null;
  // A white swing alone only under the Classic rule, and only when the whole trip fits before the next windup.
  return c.autoShotReset === 'classic' && toShot >= window ? go : null;
}

/** In melee the glow shows Raptor Strike; in the dead zone nothing; at range the usual list. */
export function weaveSuggest(c: Combat, atRange: (c: Combat) => string | null): string | null {
  const u = c.target;
  if (!c.weaving || !u || u.health <= 0) return atRange(c);
  if (c.inRange(u)) return raptorReadyIn(c) === 0 && raptorAffordable(c) && c.queuedSwing !== 'raptorStrike' ? 'raptorStrike' : null;
  if (!c.inRangedRange(u)) return null;
  return atRange(c);
}

/** Melee range and Auto Shot's minimum range, as rings on the ground around the target. */
export function weaveRings(c: Combat): { radius: number; color: number }[] {
  const u = c.target;
  if (!c.weaving || !u) return [];
  return [{ radius: MELEE_RANGE + u.radius * 0.5, color: 0xff7a4a }, { radius: RANGED_MIN + u.radius, color: 0x7aff8a }];
}

export function weaveRows(c: Combat, rows: { label: string; value: string; good?: boolean }[]): void {
  if (!c.weaving) return;
  const k = c.counters;
  const time = Math.max(1, k.combatTime ?? 0);
  const w = c.stats.ranged;
  const avgShot = (c.meter.rows.get('autoShot')?.total ?? 0) / Math.max(1, k.autoShots ?? 0);
  const delay = (k.autoShotDelay ?? 0) + (k.autoShotHeld ?? 0);
  const lost = w ? (delay / (w.speed / c.rangedHaste())) * avgShot : 0;
  rows.push({ label: 'Weaves: Raptor Strikes / white swings', value: `${k.weaveRaptor ?? 0} / ${k.weaveWhite ?? 0} (${Math.round(k.weaveDamage ?? 0)} damage)` });
  rows.push({ label: 'Auto Shot time lost (swing resets, shots held in melee)', value: `${delay.toFixed(1)} s (~${Math.round(lost)} damage)`, good: delay / time < 0.05 });
  rows.push({ label: 'Time in the dead zone', value: `${(k.deadZone ?? 0).toFixed(1)} s (${Math.round(((k.deadZone ?? 0) / time) * 100)}%)` });
  rows.push({ label: 'Weaving net (weave damage minus Auto Shot lost)', value: `${Math.round((k.weaveDamage ?? 0) - lost)}`, good: (k.weaveDamage ?? 0) > lost });
}
