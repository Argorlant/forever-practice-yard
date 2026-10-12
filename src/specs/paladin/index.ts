// Paladin for WoW Forever: Retribution (seal twisting with Twist of Light),
// Protection (the dummy attacks you; Holy Shield and blocks) and a
// Shockadin (Holy Shock hybrid, our proposal). Shared rules in ./core.ts,
// numbers in ./data.ts, builds in ./talents.ts.
import type { Combat } from '../../engine/combat';
import type { Spec } from '../../engine/types';
import { BOSS_RULES, CONTROLS } from '../common';
import {
  ABILITIES, D, ECHO, SOURCES, T, chances, currentSeal, executePhase, onCooldown, prepare, regen, sealLeft, undeadDummy,
} from './core';
import { PROT_STATS, RET_STATS, SHOCK_STATS } from './data';
import { buildLabel, buildsFor, summary, talentsFor, type PaladinSpec } from './talents';

type Row = { label: string; value: string; good?: boolean };
const pctOf = (n: number) => `${Math.round(n * 100)}%`;

// --------------------------------------------------------------- helpers
function ctx(c: Combat) {
  const p = c.player;
  const ready = (id: string) => c.cooldownLeft(id).left === 0 && (c.ability(id)?.usable?.(c) ?? true);
  const afford = (id: string) => c.cost(c.ability(id)!) <= p.resource;
  const mana = c.manaLocked ? 1 : p.resource / p.maxResource;
  const potion = !c.manaLocked && p.inCombat && p.resource <= p.maxResource - D.manaPotion.max && mana < 0.4 && ready('manaPotion');
  return { p, ready, afford, mana, potion };
}

function manaRows(c: Combat, rows: Row[]): void {
  const k = c.counters;
  const time = k.combatTime ?? 0;
  if (c.manaLocked) return;
  if (c.raid.has('judgementOfWisdom')) rows.push({ label: 'Mana from Judgement of Wisdom', value: `+${Math.round(k.manaOnHit ?? 0)}` });
  rows.push({ label: 'Time without mana for your main spell', value: `${Math.round(k.lowMana ?? 0)} s (${pctOf((k.lowMana ?? 0) / Math.max(1, time))})`, good: (k.lowMana ?? 0) / Math.max(1, time) < 0.1 });
}

const HELP_COMMON = `Mana is your resource. Spirit regeneration stops for 5 sec after you spend mana (Reverence keeps some), so a paladin lives on Judgement of Wisdom, Blessing of Wisdom and Mana Spring Totem (on by default under Raid buffs and debuffs), Sanctified Judgement and Major Mana Potions; you can lock your mana in Settings.
    Seals last 30 sec and work on your white swings. Judgement is off the global cooldown and, in WoW Forever, does not use up the seal. Seal procs, damage Judgements and Holy Strike roll on the melee table and crit for double; Holy Shock and Exorcism use the spell table.
    Exorcism only works on Undead or Demons (Settings → Options), Hammer of Wrath only below 20% health (start the dummy at 15% to practice it).`;

function specFor(spec: PaladinSpec, base: Omit<Spec, 'abilities' | 'rules' | 'prepare' | 'chances' | 'regen' | 'builds' | 'bar' | 'sources' | 'className' | 'resource'>): Spec {
  return {
    className: 'Paladin',
    resource: 'mana',
    abilities: ABILITIES,
    rules: BOSS_RULES,
    builds: buildsFor(spec).map((b) => ({ id: b.id, label: buildLabel(b), name: b.name, source: b.source, talentString: b.talentString, stats: b.stats, bar: b.bar, tank: b.tank, trees: summary(talentsFor(b.id, spec)) })),
    bar: buildsFor(spec)[0].bar,
    sources: SOURCES,
    prepare,
    chances,
    regen,
    defaultRaid: ['judgementOfWisdom', 'blessingOfWisdom', 'manaSpring'],
    ...base,
  };
}

const MANA_OPTIONS = [
  { key: 'undeadDummy', name: 'The dummy is Undead or a Demon (Exorcism works)', kind: 'toggle' as const },
  { key: 'lockMana', name: 'Lock your mana (spells cost nothing)', kind: 'toggle' as const },
  { key: 'mana', name: 'Mana pool', kind: 'number' as const, step: 100 },
  { key: 'spirit', name: 'Spirit (regeneration outside the five-second rule)', kind: 'number' as const, step: 1 },
  { key: 'mp5', name: 'Mana per 5 sec from gear', kind: 'number' as const, step: 1 },
];

// ----------------------------------------------------------- Retribution
/** gs's ranked Ret list ("Basic Ret") with the practice yard's opener. */
function retSuggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const tl = T(c);
  const { p, ready, afford, mana, potion } = ctx(c);
  const seal = currentSeal(c);
  const primary = tl.sealOfCommand ? 'sealOfCommand' : 'sealOfRighteousness';
  if (!seal) return primary;
  if (!p.autoAttacking && c.inRange(t)) return 'attack';
  if (ready('holyStrike') && afford('holyStrike')) return 'holyStrike';
  if (ready('judgement') && c.inRange(t, D.judgement.range)) return 'judgement';
  if (sealLeft(c) <= 1) return seal;
  // Twist of Light: one swap per swing. With no Echo banked, switch to the other seal; the next
  // landed swing then carries the new seal and the Echo of the old one.
  const banked = !!c.aura(p, ECHO.sealOfCommand) || !!c.aura(p, ECHO.sealOfRighteousness);
  if (tl.twistOfLight && tl.sealOfCommand && mana >= 0.15 && !banked && (seal === 'sealOfCommand' || seal === 'sealOfRighteousness')) {
    return seal === 'sealOfCommand' ? 'sealOfRighteousness' : 'sealOfCommand';
  }
  if (executePhase(c) && ready('hammerOfWrath')) return 'hammerOfWrath';
  if (undeadDummy(c) && ready('exorcism') && mana >= 0.3) return 'exorcism';
  if (potion) return 'manaPotion';
  if (ready('consecration') && mana >= (c.raid.has('judgementOfWisdom') ? 0.2 : 0.5)) return 'consecration';
  return null;
}

function retReview(c: Combat): Row[] {
  const k = c.counters;
  const time = k.combatTime ?? 0;
  if (time < 1) return [];
  const tl = T(c);
  const judgementUse = Math.min(1, ((k.judgements ?? 0) * (D.judgement.cooldown - tl.improvedJudgement)) / time);
  const rows: Row[] = [
    { label: 'Holy Strike on cooldown', value: pctOf(onCooldown(c, 'holyStrike', D.holyStrike.cooldown)), good: onCooldown(c, 'holyStrike', D.holyStrike.cooldown) >= 0.85 },
    { label: 'Judgement on cooldown', value: pctOf(judgementUse), good: judgementUse >= 0.85 },
  ];
  if (tl.twistOfLight && tl.sealOfCommand) {
    const swings = k.whiteLanded ?? 0;
    rows.push({ label: 'Swings with both seals (Twist of Light)', value: swings ? `${k.twistedSwings ?? 0} of ${swings}` : '-', good: swings === 0 || (k.twistedSwings ?? 0) / swings >= 0.6 });
  }
  if (tl.sealOfCommand) rows.push({ label: 'Seal of Command procs per landed swing', value: k.whiteLanded ? pctOf((k.sealOfCommandProcs ?? 0) / k.whiteLanded) : '-' });
  if (tl.vengeance) rows.push({ label: 'Vengeance uptime', value: pctOf((k['uptime:vengeance'] ?? 0) / time) });
  manaRows(c, rows);
  return rows;
}

export const paladinRet: Spec = specFor('ret', {
  id: 'paladin-ret',
  specName: 'Retribution',
  stats: RET_STATS,
  defaultOptions: { build: 'ret', mana: 4235, spirit: 100, mp5: 0, lockMana: false, undeadDummy: false },
  options: MANA_OPTIONS,
  sheet: { spellCrit: 'Spell crit (gear + Intellect)', spellPower: 'Spell power (Holy)' },
  lowMana: (c) => c.cost(c.ability('sealOfRighteousness')!),
  welcome: 'Welcome to the Retribution practice yard. Keep a seal up, Judgement and Holy Strike on cooldown, and with Twist of Light swap Seal of Command and Seal of Righteousness so every swing carries both. Mana runs out, as it does in Forever.',
  help: `${CONTROLS}
    ${HELP_COMMON}
    Retribution swings a slow two-hander: Seal of Command procs 7 times per minute (about 44% per swing at 3.8 sec) and Seal of Righteousness adds Holy damage to every swing. With Twist of Light, replacing a seal leaves an Echo of it that your next landed swing also applies; the yellow glow follows the WoW Forever sims' loop: Holy Strike, Judgement, then swap to the other seal once per swing (when no Echo is banked), Consecration with spare mana.
    Vengeance (after any crit) and Vindication (every landed hit) raise your damage. The review under the meter counts swings that carried both seals.
    This is a practice tool: hit, crit and proc chances follow WoW Forever; damage numbers are an approximation.`,
  look: { clothColor: 0xb8902e, leatherColor: 0x9aa0a8, hood: false, plate: true },
  suggest: retSuggest,
  review: retReview,
});

// ------------------------------------------------------------ Protection
/** gs's "Forever Protection" list, plus Lay on Hands under 10 % health. */
function protSuggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const tl = T(c);
  const { p, ready, mana } = ctx(c);
  const seal = currentSeal(c);
  if (!c.aura(p, 'righteousFury')) return 'righteousFury';
  if (!seal) return 'sealOfRighteousness';
  if (!p.autoAttacking && c.inRange(t)) return 'attack';
  const health = p.health / p.maxHealth;
  if (!c.playerHealthLocked && health < 0.1 && ready('layOnHands')) return 'layOnHands';
  if (ready('judgement') && c.inRange(t, D.judgement.range)) return 'judgement';
  if (tl.swiftJudgement && ready('swiftJudgement') && c.cooldownLeft('judgement').left >= 6) return 'swiftJudgement';
  if (!c.playerHealthLocked && health < 0.3 && tl.templarsBulwark && ready('templarsBulwark')) return 'templarsBulwark';
  const hs = c.aura(p, 'holyShield');
  if (tl.holyShield && c.enemyAttacks.on && (!hs || hs.end - c.t <= 2) && ready('holyShield')) return 'holyShield';
  if (sealLeft(c) <= 2) return seal;
  if (ready('consecration') && mana >= 0.3) return 'consecration';
  if (executePhase(c) && ready('hammerOfWrath')) return 'hammerOfWrath';
  if (ready('holyStrike')) return 'holyStrike';
  if (tl.holyShield && ready('holyShield')) return 'holyShield';
  return null;
}

function protReview(c: Combat): Row[] {
  const k = c.counters;
  const time = k.combatTime ?? 0;
  if (time < 1) return [];
  const tl = T(c);
  const uptime = (key: string) => (k[key] ?? 0) / time;
  const judgementUse = Math.min(1, ((k.judgements ?? 0) * (D.judgement.cooldown - tl.improvedJudgement)) / time);
  const rows: Row[] = [
    { label: 'Judgement on cooldown', value: pctOf(judgementUse), good: judgementUse >= 0.85 },
    { label: 'Consecration uptime', value: pctOf(uptime('uptime:target:consecration')), good: uptime('uptime:target:consecration') >= 0.6 },
    { label: 'Righteous Fury uptime', value: pctOf(uptime('uptime:righteousFury')), good: uptime('uptime:righteousFury') >= 0.99 },
  ];
  if (c.enemyAttacks.on) {
    if (tl.holyShield) rows.splice(0, 0, { label: 'Holy Shield uptime', value: pctOf(uptime('uptime:holyShield')), good: uptime('uptime:holyShield') >= 0.8 });
    const swings = k.incomingSwings ?? 0;
    rows.push({ label: 'Blocked hits', value: swings ? `${k.blocks ?? 0} of ${swings} (${pctOf((k.blocks ?? 0) / swings)})` : '-' });
    if (tl.reckoning) rows.push({ label: 'Reckoning extra swings', value: String(k.reckoning ?? 0) });
    if (tl.shieldSpecialization && !c.manaLocked) rows.push({ label: 'Mana from Shield Specialization', value: `+${Math.round(k.shieldSpecMana ?? 0)}` });
  }
  manaRows(c, rows);
  return rows;
}

export const paladinProt: Spec = specFor('prot', {
  id: 'paladin-prot',
  specName: 'Protection',
  showThreat: true,
  tank: true,
  tankDamage: 3000,
  stats: PROT_STATS,
  defaultOptions: { build: 'prot', mana: 4000, spirit: 100, mp5: 0, lockMana: false, undeadDummy: false },
  options: MANA_OPTIONS,
  sheet: { spellCrit: 'Spell crit (gear + Intellect)', spellPower: 'Spell power (Holy)' },
  lowMana: (c) => c.cost(c.ability('holyShield')!),
  welcome: 'Welcome to the Protection practice yard. The dummy hits back: keep Righteous Fury, a seal and Holy Shield up, Judgement on cooldown, Consecration with spare mana and Holy Strike. Blocks give you Holy Shield damage, Reckoning swings and mana.',
  help: `${CONTROLS}
    ${HELP_COMMON}
    The dummy attacks you and rolls miss, dodge, parry, block, crit and crushing blows against your sheet. Holy Shield adds 30% block for 10 sec or 4 blocks and deals Holy damage on each block; Redoubt raises your block after hits taken; Shield Specialization gives back 6% of your mana on a block; Reckoning gives an extra swing after a block or a crit taken.
    Righteous Fury makes your Holy damage cause 60% more threat (Holy Shield and Holy Strike more still). The meter shows threat per second. Your health is locked by default; unlock it to practice Templar's Bulwark and Lay on Hands.
    This is a practice tool: hit, crit, block and proc chances follow WoW Forever; damage and threat are an approximation.`,
  look: { clothColor: 0x2f4f8a, leatherColor: 0x9aa0a8, hood: false, plate: true },
  suggest: protSuggest,
  review: protReview,
});

// -------------------------------------------------------------- Shockadin
/** Our Shockadin list (research/paladin_forever.md → Shockadin): a melee paladin with a 10 s nuke. */
function shockSuggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const tl = T(c);
  const { p, ready, afford, mana, potion } = ctx(c);
  const seal = currentSeal(c);
  const primary = tl.sealOfCommand ? 'sealOfCommand' : 'sealOfRighteousness';
  if (!seal) return primary;
  if (!p.autoAttacking && c.inRange(t)) return 'attack';
  if (ready('judgement') && c.inRange(t, D.judgement.range)) return 'judgement';
  // Light's Vigil just before Holy Shock comes back: the marked Shock leaves Holy Shock ready for a second one.
  const marked = !!c.aura(t, 'lightsVigil');
  const shockSoon = c.cooldownLeft('holyShock').left <= D.lightsVigil.cast + D.gcd;
  if (tl.lightsVigil && !marked && shockSoon && ready('lightsVigil') && afford('lightsVigil') && mana >= 0.5) return 'lightsVigil';
  if (tl.divineFavor && ready('divineFavor') && ready('holyShock')) return 'divineFavor';
  if (ready('holyShock') && afford('holyShock') && c.inRange(t, D.holyShock.range)) return 'holyShock';
  if (ready('holyStrike') && afford('holyStrike')) return 'holyStrike';
  if (sealLeft(c) <= 2) return seal;
  if (executePhase(c) && ready('hammerOfWrath')) return 'hammerOfWrath';
  if (undeadDummy(c) && ready('exorcism') && mana >= 0.3) return 'exorcism';
  if (potion) return 'manaPotion';
  if (ready('consecration') && mana >= 0.6) return 'consecration';
  return null;
}

function shockReview(c: Combat): Row[] {
  const k = c.counters;
  const time = k.combatTime ?? 0;
  if (time < 1) return [];
  const tl = T(c);
  const judgementUse = Math.min(1, ((k.judgements ?? 0) * (D.judgement.cooldown - tl.improvedJudgement)) / time);
  const rows: Row[] = [
    { label: 'Holy Shock on cooldown', value: pctOf(onCooldown(c, 'holyShock', D.holyShock.cooldown)), good: onCooldown(c, 'holyShock', D.holyShock.cooldown) >= 0.8 },
    { label: 'Holy Strike on cooldown', value: pctOf(onCooldown(c, 'holyStrike', D.holyStrike.cooldown)), good: onCooldown(c, 'holyStrike', D.holyStrike.cooldown) >= 0.8 },
    { label: 'Judgement on cooldown', value: pctOf(judgementUse), good: judgementUse >= 0.85 },
  ];
  if (tl.divineFavor) rows.push({ label: 'Holy Shocks with Divine Favor', value: String(k.divineFavorShocks ?? 0) });
  if (tl.lightsVigil) rows.push({ label: "Light's Vigils spent by Holy Shock", value: `${k.vigilShocks ?? 0} of ${k.vigils ?? 0}`, good: (k.vigilShocks ?? 0) >= (k.vigils ?? 0) - 1 });
  manaRows(c, rows);
  return rows;
}

export const paladinShock: Spec = specFor('shock', {
  id: 'paladin-shock',
  specName: 'Shockadin',
  stats: SHOCK_STATS,
  defaultOptions: { build: 'shock', mana: 4235, spirit: 100, mp5: 0, lockMana: false, undeadDummy: false },
  options: MANA_OPTIONS,
  sheet: { spellCrit: 'Spell crit (gear + Intellect)', spellPower: 'Spell power (Holy)' },
  lowMana: (c) => c.cost(c.ability('holyShock')!),
  welcome: 'Welcome to the Shockadin practice yard: a melee paladin with Holy Shock on a 10 sec cooldown. No WoW Forever sim models this build yet, so its talents and priority list are our proposal. Keep Seal of Command up, Judgement, Holy Shock and Holy Strike on cooldown, and save Divine Favor for a sure Holy Shock crit. Light\'s Vigil marks the dummy so your next Holy Shock hits twice and comes back at once.',
  help: `${CONTROLS}
    ${HELP_COMMON}
    Holy Shock is a 21-point Holy talent with a 10 sec cooldown in WoW Forever (30 in Classic). Divine Precision gives it 18% hit, Holy Power 15% crit, and Divine Favor makes the next one crit. It costs a lot of mana: practice it as a burst on top of your melee.
    Light's Vigil (the 31-point Holy talent) is a 1.5 sec cast that marks the target: your next Holy Shock on it triggers no cooldown, deals extra Holy damage and refunds 75% of the Vigil's mana. Cast it while Holy Shock is ready, then Shock twice. Its damage is provisional: the sims disagree on whether it adds to Holy Shock or replaces it.
    The build is our proposal (31/0/20); no sim has one yet. Expect changes, in particular to Infusion of Light (bug #260) and Light's Vigil.
    This is a practice tool: hit, crit and proc chances follow WoW Forever; damage numbers are an approximation.`,
  look: { clothColor: 0xe8e0c8, leatherColor: 0xb8902e, hood: false, plate: true },
  suggest: shockSuggest,
  review: shockReview,
});
