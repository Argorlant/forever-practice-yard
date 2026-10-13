// What the fight looks like: the engine's events turned into spell and weapon
// effects (src/scene/vfx.ts). The engine resolves a spell the moment it is cast,
// so a missile picks up the hit from the same frame and shows its crit or
// resist when it lands; hits without a missile show at once.
import * as THREE from 'three';
import type { Combat } from './engine/combat';
import type { Hit, School, Unit, VfxStyle } from './engine/types';
import { STYLES, styleOfColor, type Missile, type StrikeKind, type Vfx } from './scene/vfx';

const YD = 0.9144;

/** Where effects attach in the scene. */
export interface FxAnchors {
  /** The point blows and spells land on, or null for a unit that is not drawn. */
  chest(u: Unit): THREE.Vector3 | null;
  /** The player's feet. */
  feet(): THREE.Vector3;
  /** A hand, for casting glows (a point in front of the chest when there are no hands: animal forms). */
  hand(side: 'l' | 'r'): THREE.Vector3;
  totemHead(slot: string, x: number, z: number): THREE.Vector3;
  /** The pet's position, if one is out. */
  pet(): THREE.Vector3 | null;
}

const SCHOOL_STYLE: Record<School, VfxStyle> = {
  physical: 'physical', fire: 'fire', frost: 'frost', shadow: 'shadow', arcane: 'arcane', holy: 'holy', nature: 'nature',
};

/** Hits that look different from their school. */
const SOURCE_STYLE: Record<string, VfxStyle> = {
  lightningBolt: 'lightning', chainLightning: 'lightning', lightningOverload: 'lightning', lightningShield: 'lightning',
  earthShock: 'earth', serpentSting: 'poison', deadlyPoison: 'poison', instantPoison: 'poison', woundPoison: 'poison', venom: 'poison',
};

/** Weapon blows: the trail's colour and shape. Anything else physical is a white arc. */
const STRIKES: Record<string, { color: number; kind?: StrikeKind }> = {
  // Warrior
  heroicStrike: { color: 0xffa040 }, cleave: { color: 0xffa040, kind: 'wide' }, mortalStrike: { color: 0xff3a2a },
  bloodthirst: { color: 0xff2a20 }, execute: { color: 0xff4a20, kind: 'smash' }, overpower: { color: 0xffd040 },
  revenge: { color: 0xffb040 }, shieldSlam: { color: 0x9ad0ff, kind: 'smash' }, slam: { color: 0xffffff, kind: 'smash' },
  spearingStrike: { color: 0xffffff, kind: 'thrust' }, shieldBash: { color: 0x9ad0ff, kind: 'smash' },
  // Paladin
  holyStrike: { color: 0xffe070 },
  // Shaman
  stormstrike: { color: 0x9ad8ff },
  // Rogue
  backstab: { color: 0xffffff, kind: 'thrust' }, ambush: { color: 0xffffff, kind: 'thrust' }, mutilate: { color: 0x8ae040, kind: 'thrust' },
  hemorrhage: { color: 0xe02020 }, ghostlyStrike: { color: 0xb8c8ff }, eviscerate: { color: 0xffd060 }, cutthroat: { color: 0xffffff, kind: 'thrust' },
  // Hunter
  raptorStrike: { color: 0xffa040 }, mongooseBite: { color: 0xffd040, kind: 'thrust' },
  // Druid
  shred: { color: 0xffffff, kind: 'claw' }, claw: { color: 0xffffff, kind: 'claw' }, rake: { color: 0xff6040, kind: 'claw' },
  ferociousBite: { color: 0xffd060, kind: 'claw' }, ravage: { color: 0xffffff, kind: 'claw' }, maul: { color: 0xffffff, kind: 'claw' },
  swipe: { color: 0xffffff, kind: 'wide' }, lacerate: { color: 0xff6040, kind: 'claw' }, primalBite: { color: 0xffd060, kind: 'claw' },
  // Pets
  petMelee: { color: 0xffffff, kind: 'claw' }, petBite: { color: 0xffffff, kind: 'claw' }, petClaw: { color: 0xffffff, kind: 'claw' },
};

/** Blows whose trail is drawn around the player instead (Whirlwind): only sparks on the target. */
const SPARKS_ONLY = new Set(['whirlwind']);

/** Spells cast with no missile: what the hands gather. */
const CAST_STYLE: Record<string, VfxStyle> = {
  hammerOfWrath: 'holy', lightsVigil: 'holy', exorcism: 'holy', penance: 'holy', holyNova: 'holy',
  mindFlay: 'shadow', drainLife: 'shadow', devouringPlague: 'shadow', shadowWordPain: 'shadow', corruption: 'shadow',
  immolate: 'fire', searingPain: 'fire', soulFire: 'fire', incinerate: 'fire', scorch: 'fire', fireBlast: 'fire',
  evocation: 'arcane', arcaneMissiles: 'arcane', insectSwarm: 'nature',
  curseOfTheElements: 'shadow', baneOfAgony: 'shadow', baneOfDoom: 'shadow', siphonLife: 'shadow', amplifyCurse: 'shadow',
  huntersMark: 'fire', faerieFire: 'arcane',
};
/** Casts that are not spells (Slam): no glow. */
const NO_GLOW = new Set(['slam']);

/** Channels drawn as a stream between the caster and the target; `in` flows toward the caster. */
const STREAMS: Record<string, { colors: number[]; in?: boolean }> = {
  drainLife: { colors: [0xc02040, 0x60e060, 0xff4060], in: true },
  mindFlay: { colors: [0x9a40f0, 0xc080ff, 0x6a20b0] },
  penance: { colors: [0xffe680, 0xffffff] },
};

/** Buffs as they take hold: the colours of the motes. Anything else self-cast is gold. */
const BUFFS: Record<string, number[]> = {
  sealOfCommand: [0xffe680, 0xffd040], sealOfRighteousness: [0xffe680, 0xffffff], sealOfFury: [0xffa030, 0xffd060],
  righteousFury: [0xffd040, 0xff9a30], divineFavor: [0xffe680, 0xffffff], holyShield: [0xffe680, 0xffffff],
  layOnHands: [0xffe680, 0xffffff], templarsBulwark: [0xffe680, 0x9ad0ff], swiftJudgement: [0xffe680],
  shieldBlock: [0x9ad0ff, 0xffffff], shieldWall: [0x9ad0ff, 0xffffff], lastStand: [0x80ff80, 0xffffff],
  bloodrage: [0xff3020, 0xc01010], berserkerRage: [0xff6020, 0xffa040], recklessness: [0xff3020, 0xffa040],
  deathWish: [0xc01010, 0xff3020], sweepingStrikes: [0xffffff, 0xd0d0ff],
  sliceAndDice: [0xffe060, 0xffffff], evasion: [0xd0d0ff, 0xffffff], adrenalineRush: [0xffe060, 0xffa030],
  bladeFlurry: [0xffffff, 0xd0d0ff], coldBlood: [0x8ac0ff, 0xffffff], sprint: [0xffffff, 0xd0f0ff], preparation: [0xd0d0ff],
  shadowform: [0x9a40f0, 0x4a1080], innerFocus: [0xffffff, 0xffe680], powerInfusion: [0xffe680, 0xffffff],
  lightningShield: [0x9ad8ff, 0xffffff], windfuryWeapon: [0x9ad8ff, 0xffffff], flametongueWeapon: [0xff7a18, 0xffd060],
  rockbiterWeapon: [0xd0a050, 0xffe0a0], rageOfTheFarseer: [0x9ad8ff, 0xffffff],
  presenceOfMind: [0xc890ff, 0xffffff], arcanePower: [0xff8cff, 0xffffff], combustion: [0xff7a18, 0xffd060],
  mageArmor: [0xc890ff, 0x8fd0ff], manaRuby: [0xff4060, 0xc890ff],
  lifeTap: [0xc02040, 0x4a8aff], amplifyCurse: [0x9a40f0, 0x6a20b0], soulLink: [0x9a40f0, 0xff60c0],
  aspectOfTheHawk: [0xffa040, 0xffe060], aspectOfTheBeast: [0x8ad050, 0xffe060], trueshotAura: [0xffe080, 0xffffff],
  rapidFire: [0xffd040, 0xffffff], bestialWrath: [0xff4040, 0xffa040],
  moonkinForm: [0x9fd8ff, 0xe9a8ff], innervate: [0x6aa0ff, 0xffffff], berserk: [0xff8030, 0xffd060],
  frenziedRegeneration: [0x8ae040, 0xffffff], druidEnrage: [0xff3020, 0xffa040], dash: [0xffffff, 0xd0f0ff],
  manaPotion: [0x4a8aff, 0x9ad0ff], ragePotion: [0xff3020, 0xffa040], thistleTea: [0x8ae040, 0xffe060],
};
const SMOKE = new Set(['vanish', 'stealth', 'prowl']);
/** Presses with an effect of their own around the player (no buff motes). */
const AREA = new Set(['thunderClap', 'whirlwind', 'demoralizingShout', 'demoralizingRoar', 'battleShout', 'holyNova', 'consecration']);

/** Auras that shimmer around the player while they last. */
const GLOWS: Record<string, number[]> = {
  evasion: [0xd0d0ff], adrenalineRush: [0xffe060], bladeFlurry: [0xffffff], recklessness: [0xff3020, 0xffa040],
  deathWish: [0xc01010, 0xff3020], berserkerRage: [0xff6020], shieldWall: [0x9ad0ff], lastStand: [0x80ff80],
  arcanePower: [0xff8cff, 0xffffff], combustion: [0xff7a18, 0xffd060], presenceOfMind: [0xc890ff],
  rapidFire: [0xffd040], berserk: [0xff8030], innervate: [0x6aa0ff], divineFavor: [0xffe680], powerInfusion: [0xffe680],
  shadowform: [0x6a20b0, 0x2a0a40, 0x9a40f0],
};
const SEAL_SPARKS: Record<string, number[]> = {
  sealOfCommand: [0xffe680, 0xffd040], sealOfRighteousness: [0xfff0b0, 0xffffff], sealOfFury: [0xffa030, 0xffd060],
};

/** Ability presses that draw nothing of their own. */
const SKIP = new Set(['attack', 'autoShot']);

export function wireVfx(combat: Combat, vfx: Vfx, at: FxAnchors): { update(dt: number, t: number): void } {
  const hits: Hit[] = [];
  const launches: { m: Missile; target: Unit; carries: (h: Hit) => boolean }[] = [];
  /** Enemy-targeted presses this frame: a debuff puff if nothing hit. */
  const presses: { id: string; target: Unit }[] = [];
  /** The school each source last hit with: the glow of a cast that has no missile. */
  const learned = new Map<string, School>();

  const chestPoint = (u: Unit) => at.chest(u);
  const playerChest = () => at.feet().add(new THREE.Vector3(0, 1.25, 0));

  const ranged = (source: string) => source === 'autoShot' || !!combat.ability(source)?.ranged;

  /** Spells (Arcane Missiles, Searing Totem, Chain Lightning's jumps): any hit that is not a weapon's. */
  const spellHit = (h: Hit) => h.school !== 'physical';

  function launch(style: VfxStyle, target: Unit, carries: (h: Hit) => boolean, opts: { from?: THREE.Vector3; speed?: number; size?: number; fromSky?: boolean }): void {
    const chest = chestPoint(target);
    if (!chest) return;
    const to = () => chestPoint(target) ?? chest;
    const from = opts.from ?? (opts.fromSky ? chest.clone().add(new THREE.Vector3(0, 7, 0)) : at.hand('r'));
    const yards = from.distanceTo(chest) / YD;
    const duration = opts.fromSky ? 0.22 : yards / (opts.speed ?? 30);
    const m = vfx.missile({ style, from, to, duration, size: opts.size, fromSky: opts.fromSky });
    launches.push({ m, target, carries });
  }

  function styleOfHit(h: Hit): VfxStyle {
    if (h.periodic && h.school === 'physical') return 'bleed';
    return SOURCE_STYLE[h.source] ?? SCHOOL_STYLE[h.school];
  }

  /** A hit that no missile carried. */
  function show(h: Hit): void {
    const p = chestPoint(h.target);
    if (!p) return;
    if (h.outcome === 'miss' || h.outcome === 'dodge' || h.outcome === 'parry') return;
    const style = styleOfHit(h);
    const crit = h.outcome === 'crit';
    if (h.periodic) { vfx.tick(p, style); return; }
    if (h.outcome === 'resist') { vfx.fizzle(p, style); return; }
    if (h.school === 'physical' && !ranged(h.source)) {
      if (h.white || SPARKS_ONLY.has(h.source)) { vfx.impact(p, 'physical', { small: h.white, crit }); return; }
      const s = STRIKES[h.source] ?? { color: 0xffffff };
      const pet = h.source.startsWith('pet') ? at.pet() : null;
      vfx.strike(p, pet ?? at.feet(), s.color, s.kind ?? 'arc', crit);
      if (h.source === 'stormstrike') vfx.impact(p, 'lightning', { small: true, crit });
      return;
    }
    // Seal procs and the like ride on the swing: smaller than a spell.
    const small = h.source.startsWith('seal') || h.source === 'vindication';
    vfx.impact(p, style, { crit, small });
  }

  combat.on('damage', (h) => {
    hits.push(h);
    if (!h.periodic) learned.set(h.source, h.school);
  });

  combat.on('ability', ({ id }) => {
    const a = combat.ability(id);
    if (!a || a.petCommand || SKIP.has(id)) return;
    const feet = at.feet();
    const target = combat.target;
    if (a.projectile && target) {
      const style = a.projectile.style ?? styleOfColor(a.projectile.color);
      launch(style, target, (h) => h.source === id, { fromSky: a.projectile.fromSky, speed: a.projectile.speed });
      if (!a.projectile.fromSky) vfx.release(at.hand('r'), style);
    } else if (a.castTime && !NO_GLOW.has(id) && !a.ranged) {
      vfx.release(at.hand('r'), castStyle(id) ?? 'arcane');
    }
    switch (id) {
      case 'thunderClap': vfx.thunderClap(feet, 5 * YD); break;
      case 'whirlwind': vfx.spin(feet.clone().setY(feet.y + 1)); break;
      case 'demoralizingShout': case 'demoralizingRoar': vfx.shout(feet, 0xff6a3a); break;
      case 'battleShout': vfx.shout(feet, 0xffc040); break;
      case 'holyNova': vfx.nova(feet, 10 * YD, 'holy'); break;
      case 'consecration': {
        const aura = target && combat.aura(target, 'consecration');
        vfx.ground(feet, 8 * YD, 'holy', aura ? aura.end - combat.t : 8);
        break;
      }
    }
    if (SMOKE.has(id)) vfx.smokeBomb(feet);
    else if (AREA.has(id)) return;
    else if (a.target === 'self') vfx.buff(feet, BUFFS[id] ?? [0xffe680, 0xffffff]);
    else if (a.target === 'enemy' && target && !a.projectile) presses.push({ id, target });
  });

  // A bow or crossbow looses an arrow; a gun fires a tracer with a muzzle flash.
  combat.on('shot', (u) => {
    const hand = at.hand('r');
    const gun = combat.stats.ranged?.type === 'gun';
    if (gun) vfx.flash(hand, 0xffd080, 0.6, 0.1);
    launch(gun ? 'physical' : 'arrow', u, (h) => ranged(h.source), { from: hand, speed: gun ? 70 : 45, size: gun ? 0.045 : 0.06 });
  });

  combat.on('bolt', ({ target, color, speed, style, from }) => {
    const origin = from ? (from.totem ? at.totemHead(from.totem, from.x, from.z) : new THREE.Vector3(from.x, 1, from.z)) : undefined;
    launch(style ?? styleOfColor(color), target, spellHit, { from: origin, speed: speed ?? 30, size: 0.1 });
  });

  combat.on('petAttack', ({ kind }) => {
    const pet = at.pet();
    const t = combat.target;
    if (!pet || !t) return;
    if (kind === 'firebolt') launch('fire', t, spellHit, { from: pet.clone().setY(0.7), speed: 20, size: 0.08 });
    else if (kind === 'lash') {
      const p = chestPoint(t);
      if (p) vfx.strike(p, pet, 0xff60c0, 'arc');
    }
  });

  combat.on('nova', ({ x, z, radius, totem }) => {
    const p = totem ? at.totemHead(totem, x, z) : new THREE.Vector3(x, 0, z);
    vfx.nova(new THREE.Vector3(p.x, 0, p.z), radius * YD, 'fire');
  });

  combat.on('incoming', (i) => {
    if (i.outcome === 'block' && combat.aura(combat.player, 'holyShield')) vfx.shield(playerChest(), 0xffe680, true);
  });

  combat.on('reset', () => vfx.clear());

  /** What a cast gathers in the hands, or null for no glow. */
  function castStyle(id: string): VfxStyle | null {
    const a = combat.ability(id);
    if (!a || a.ranged || NO_GLOW.has(id)) return null;
    if (a.projectile) return a.projectile.style ?? styleOfColor(a.projectile.color);
    const style = CAST_STYLE[id] ?? (learned.has(id) ? SCHOOL_STYLE[learned.get(id)!] : 'arcane');
    return style === 'physical' ? null : style;
  }

  /** A debuff without damage: its spell's look, or a weapon's (Sunder Armor). */
  function pressStyle(id: string): VfxStyle {
    if (CAST_STYLE[id]) return CAST_STYLE[id];
    if (learned.has(id)) return SCHOOL_STYLE[learned.get(id)!];
    return combat.ability(id)?.noAutoAttack ? 'arcane' : 'physical';
  }

  return {
    update(dt: number, t: number) {
      // Missiles take their hits; the rest show now.
      const struck = new Set(hits.map((h) => h.target));
      for (const l of launches) {
        const i = hits.findIndex((h) => h.target === l.target && !h.periodic && l.carries(h));
        if (i >= 0) { l.m.outcome = hits[i].outcome; hits.splice(i, 1); }
      }
      for (const h of hits) show(h);
      for (const p of presses) {
        const c = chestPoint(p.target);
        // A debuff with no damage (Sunder Armor, a curse, Hunter's Mark): a puff on the target.
        if (c && !struck.has(p.target)) vfx.tick(c.add(new THREE.Vector3(0, 0.4, 0)), pressStyle(p.id));
      }
      hits.length = 0;
      launches.length = 0;
      presses.length = 0;

      const p = combat.player;
      // Casting: light gathers in both hands; some channels stream to or from the target.
      const id = combat.casting?.id ?? combat.channeling?.id;
      const style = id ? castStyle(id) : null;
      if (id && style) {
        const l = at.hand('l'), r = at.hand('r');
        vfx.castGlow(l, style, dt);
        vfx.castGlow(r, style, dt);
        const stream = STREAMS[id];
        const tc = combat.target && chestPoint(combat.target);
        if (stream && tc && combat.channeling) {
          const hands = l.clone().add(r).multiplyScalar(0.5);
          if (stream.in) vfx.stream(tc, hands, stream.colors, dt);
          else vfx.stream(hands, tc, stream.colors, dt);
        }
      }

      // Auras worn by the player.
      const chest = playerChest();
      const ls = combat.aura(p, 'lightningShield');
      if (ls) vfx.orbs(chest, Math.min(3, ls.stacks ?? 3), t, STYLES.lightning.colors);
      vfx.shield(combat.aura(p, 'holyShield') ? chest : null, 0xffe680);
      for (const [aura, colors] of Object.entries(GLOWS)) {
        if (combat.aura(p, aura)) vfx.aura(aura, chest, colors, dt, aura === 'shadowform' ? 22 : 9, aura === 'shadowform' ? 0.2 : 0.12);
      }
      for (const [seal, colors] of Object.entries(SEAL_SPARKS)) {
        if (combat.aura(p, seal)) vfx.aura(seal, at.hand('r'), colors, dt, 6, 0.08, 0.12);
      }
    },
  };
}
