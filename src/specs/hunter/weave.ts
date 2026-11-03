// Melee weaving, really ranged weaving: use the ranged cooldowns at range, step
// through the dead zone into melee, press what you can (Raptor Strike, Immolation
// Trap, Mongoose Bite, Strider Kick), and step back out before the next windup.
// Any hunter build can do it; the optional helper plans the trips. The engine runs both
// autos (Combat.weaving) and applies the chosen Auto Shot reset rule; this
// file gives the cues, the glow in melee, the range rings and the review.
// Timing and value: research/hunter_forever.md → Melee weaving.
import type { Combat } from '../../engine/combat';
import { MELEE_RANGE, RANGED_MIN, YARD } from '../../engine/combat';
import type { Hit, SettingField } from '../../engine/types';

/** Running speed, 7 yards per second. */
const RUN = 7 * YARD;

interface WeaveState { lastShot: number; lastMelee: number; leaving: boolean; advised: boolean }
const states = new WeakMap<Combat, WeaveState>();
const state = (c: Combat): WeaveState => {
  let s = states.get(c);
  if (!s) states.set(c, (s = { lastShot: -Infinity, lastMelee: -Infinity, leaving: false, advised: false }));
  return s;
};

/** The weaving helper is on: the rotation and the cues plan trips into melee. */
export const weaveAdvised = (c: Combat): boolean => state(c).advised;

export const WEAVE_OPTIONS: SettingField[] = [
  { key: 'meleeWeaving', name: 'Weaving helper (advanced): the rotation and the cues plan your trips into melee. You can step in on any build without it', kind: 'toggle' },
  {
    key: 'autoShotReset', name: 'Melee weaving: what a melee swing does to Auto Shot', kind: 'choice',
    choices: [
      { value: 'classic', label: 'Classic: separate melee and ranged timers (default, until checked in the live game)' },
      { value: 'beta', label: 'Forever beta: it restarts the Auto Shot timer (reported as bug #14)' },
      { value: 'wrath', label: 'Wrath: each one restarts the other' },
    ],
  },
];

/** Lets any hunter step in and out (both autos run and the distance picks which one fires), and keeps track of shots and swings. */
export function setupWeaving(c: Combat, melee: boolean): void {
  states.set(c, { lastShot: -Infinity, lastMelee: -Infinity, leaving: false, advised: !melee && !!c.options.meleeWeaving });
  c.weaving = true;
  const rule = String(c.options.autoShotReset ?? 'classic');
  c.autoShotReset = rule === 'beta' || rule === 'wrath' ? rule : 'classic';
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

/** Raptor Strike is ready within this many seconds, and not already waiting for the swing. */
const raptorReady = (c: Combat, within = 0) => c.cooldownLeft('raptorStrike').left <= within
  && c.cost(c.ability('raptorStrike')!) <= c.player.resource && c.queuedSwing !== 'raptorStrike';

/** The melee attack on the global cooldown ready within this many seconds, in WoWSims Forever's weave order. */
function gcdAttack(c: Combat, within = 0): string | null {
  for (const id of ['striderKick', 'mongooseBite', 'immolationTrap', 'wingClip']) {
    const a = c.ability(id);
    if (!a || a.requirements?.(c, c.target)) continue;
    if (id === 'immolationTrap' && c.target && c.aura(c.target, 'immolationTrap')) continue;
    // Wing Clip only with no Strider Kick about to come up.
    if (id === 'wingClip' && (c.ability('striderKick')?.learned?.(c) ?? false) && c.cooldownLeft('striderKick').left <= 1.5) continue;
    if (c.cooldownLeft(id).left <= within && (a.usable?.(c) ?? true) && c.cost(a) <= c.player.resource) return id;
  }
  return null;
}

/** The cue above the action bar: ranged cooldowns first, then step in, press what you can, and step out in time for the shot. */
export function weaveCue(c: Combat, atRange: (c: Combat) => string | null): { text: string; tone: 'go' | 'hit' | 'back' } | null {
  const u = c.target;
  if (!c.weaving || !c.autoShooting || !u || u.health <= 0) return null;
  const s = state(c);
  const run = RUN * c.moveSpeed();
  const d = c.distance(u);
  const meleeEdge = MELEE_RANGE + u.radius * 0.5;
  const rangedEdge = RANGED_MIN + u.radius;
  const travelIn = Math.max(0, d - meleeEdge + 0.1) / run;
  const travelOut = Math.max(0, rangedEdge + 0.1 - Math.min(d, meleeEdge)) / run;
  const toShot = c.windup ? 0 : c.timeToWindup();
  const late = toShot <= travelOut + 0.15;
  const stepOut = { text: 'Step out', tone: 'back' as const };
  const stepIn = { text: 'Step in', tone: 'go' as const };

  if (c.inRange(u)) {
    if (!late) {
      const id = meleeAttack(c);
      if (id) return { text: c.ability(id)!.name, tone: 'hit' };
      // Raptor Strike waits for the swing; a swing about to land is worth waiting for too.
      if (c.queuedSwing === 'raptorStrike' || (s.lastMelee <= s.lastShot && c.swingLeft('main').left <= 0.3)) return { text: 'Swing…', tone: 'hit' };
    }
    s.leaving = true;
    return stepOut;
  }
  // Through the dead zone without turning back halfway.
  if (!c.inRangedRange(u)) {
    // Without the helper the trip in is your own idea: only the way back out gets a cue.
    if (!s.advised) return s.leaving ? stepOut : null;
    if (late || (!raptorReady(c, travelIn) && !gcdAttack(c, travelIn))) s.leaving = true;
    return s.leaving ? stepOut : stepIn;
  }
  s.leaving = false;
  if (!s.advised) return null;

  // At range: the ranged cooldowns first, then a trip if there is something to press and it fits before the next windup.
  if (c.windup || c.casting || c.channeling || atRange(c)) return null;
  if (!raptorReady(c, travelIn) && !gcdAttack(c, travelIn)) return null;
  return toShot >= travelIn + travelOut + 0.15 ? stepIn : null;
}

/** What to press in melee: Raptor Strike first (off the global cooldown, or the swing goes out white), then the attacks on the global cooldown. */
function meleeAttack(c: Combat): string | null {
  return raptorReady(c) ? 'raptorStrike' : gcdAttack(c);
}

/** In melee the glow shows the melee attack to press; in the dead zone nothing; at range the usual list. */
export function weaveSuggest(c: Combat, atRange: (c: Combat) => string | null): string | null {
  const u = c.target;
  if (!c.weaving || !u || u.health <= 0) return atRange(c);
  if (c.inRange(u)) return meleeAttack(c);
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
  const k = c.counters;
  if (!state(c).advised && !k.weaveRaptor && !k.weaveWhite) return;
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
