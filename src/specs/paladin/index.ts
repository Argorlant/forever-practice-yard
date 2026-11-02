// Paladin for WoW Forever: Retribution (seal twisting with Unsealed Wrath),
// Protection (the dummy attacks you; Holy Shield and blocks) and a
// Shockadin (Holy Shock hybrid, our proposal). Shared rules in ./core.ts,
// numbers in ./data.ts, builds in ./talents.ts.
import type { Combat } from '../../engine/combat';
import type { Spec } from '../../engine/types';
import { BOSS_RULES, CONTROLS } from '../common';
import {
  ABILITIES, D, SOURCES, T, chances, currentSeal, executePhase, onCooldown, prepare, regen, sealLeft, storedSeal, undeadDummy,
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
/**
 * gs's Basic Ret list (27 Oct) with the yard's Unsealed Wrath twist for the Oct 30 trees: Seal of Command for three
 * swings (three stored copies), Seal of Righteousness for the swing that releases them, then Seal of Command again,
 * whose first swing releases the stored Righteousness. Provisional until the sims publish a twist for it.
 */
function retSuggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const tl = T(c);
  const { p, ready, afford, mana, potion } = ctx(c);
  const seal = currentSeal(c);
  const primary = tl.sealOfCommand ? 'sealOfCommand' : 'sealOfRighteousness';
  if (!seal) return primary;
  if (!p.autoAttacking && c.inRange(t)) return 'attack';
  const twist = !!tl.unsealedWrath && !!tl.sealOfCommand;
  const kept = storedSeal(c);
  if (executePhase(c) && ready('hammerOfWrath')) return 'hammerOfWrath';
  if (ready('judgement') && c.inRange(t, D.judgement.range)) return 'judgement';
  if (ready('holyStrike') && afford('holyStrike')) return 'holyStrike';
  if (sealLeft(c) <= 1) return seal;
  if (twist && mana >= 0.15) {
    if (seal === 'sealOfCommand' && kept?.seal === 'sealOfCommand' && kept.stacks >= D.unsealedWrath.stacks) return 'sealOfRighteousness';
    if (seal === 'sealOfRighteousness' && kept?.seal === 'sealOfRighteousness') return 'sealOfCommand';
  }
  if (undeadDummy(c) && ready('exorcism') && mana >= 0.3) return 'exorcism';
  if (potion) return 'manaPotion';
  if (ready('consecration') && mana >= 0.1) return 'consecration';
  if (seal !== primary && !(twist && kept?.seal === 'sealOfCommand')) return primary;
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
  if (tl.unsealedWrath && tl.sealOfCommand) {
    const swings = k.whiteLanded ?? 0;
    const stored = k.storedSeals ?? 0;
    rows.push({ label: 'Stored seals released (Unsealed Wrath)', value: swings ? `${stored} in ${swings} swings` : '-', good: swings === 0 || stored / swings >= 0.7 });
  }
  if (tl.sealOfCommand) rows.push({ label: 'Seal of Command procs per chance', value: k.commandRolls ? pctOf((k.sealOfCommandProcs ?? 0) / k.commandRolls) : '-' });
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
  welcome: 'Welcome to Retribution practice. Keep a seal up, Judgement and Holy Strike on cooldown, and with Unsealed Wrath (the Oct 30 trees) swing three times with Seal of Command, once with Seal of Righteousness to release the stored copies, then back. Mana runs out, as it does in Forever.',
  help: `${CONTROLS}
    ${HELP_COMMON}
    Retribution swings a slow two-hander: Seal of Command procs 7 times per minute (about 44% per swing at 3.8 sec) and Seal of Righteousness adds Holy damage to every swing. Twist of Light is gone since the live hotfix of Oct 30; Unsealed Wrath (the new 31-point talent) makes each landed swing store a copy of your seal for 15 sec, up to 3, and the first swing with a different seal gives every stored copy its normal chance. The yellow glow follows our provisional loop: Judgement, Holy Strike, Seal of Command for three swings, Seal of Righteousness for one, Consecration with spare mana.
    Vengeance (after any crit) raises your damage; Vindication now only lowers the dummy's attack power. Conviction gives 2% crit per point to attacks and spells, and Champion of the Light 5/5 makes Hammer of Wrath instant. The review in the rotation panel counts the stored seals your swings released.
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
  if (tl.swiftJudgement && ready('swiftJudgement') && c.inRange(t, D.judgement.range)) return 'swiftJudgement';
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
  tank: true,
  tankDamage: 3000,
  stats: PROT_STATS,
  defaultOptions: { build: 'prot', mana: 4000, spirit: 100, mp5: 0, lockMana: false, undeadDummy: false },
  options: MANA_OPTIONS,
  sheet: { spellCrit: 'Spell crit (gear + Intellect)', spellPower: 'Spell power (Holy)' },
  lowMana: (c) => c.cost(c.ability('holyShield')!),
  welcome: 'Welcome to Protection practice. The dummy hits back: keep Righteous Fury, a seal and Holy Shield up, Judgement on cooldown, Consecration with spare mana and Holy Strike. Blocks give you Holy Shield damage, Reckoning charges and mana.',
  help: `${CONTROLS}
    ${HELP_COMMON}
    The dummy attacks you and rolls miss, dodge, parry, block, crit and crushing blows against your sheet. Holy Shield adds 30% block for 10 sec or 4 blocks and deals Holy damage on each block; Redoubt raises your block after hits taken; Shield Specialization gives back 4% of your mana on a block; Reckoning: a block (at most once per 1.5 sec) or a crit taken stores a charge, up to 4, and your next swing fires them all as extra attacks without resetting your swing timer.
    Righteous Fury makes your Holy damage cause 90% more threat (Holy Shield and Holy Strike more still). Since the Oct 30 trees Swift Judgement is a second Judgement with its own 1 min cooldown, and Shieldsworn (the new 31-point talent) takes 4 sec off Holy Strike and makes it trigger Holy Shield's damage and Shield Specialization's mana. Your health is locked by default; unlock it to practice Templar's Bulwark and Lay on Hands.
    This is a practice tool: hit, crit, block and proc chances follow WoW Forever; damage and threat are an approximation.`,
  look: { clothColor: 0x2f4f8a, leatherColor: 0x9aa0a8, hood: false, plate: true },
  suggest: protSuggest,
  review: protReview,
});

// -------------------------------------------------------------- Shockadin
/**
 * gunba's Shockadin (since 27 Oct): Seal of Righteousness kept up, Consecration with mana to spare, then Judgement,
 * Hammer of Wrath, Holy Strike and Holy Shock; the yard spends Divine Favor on a Holy Shock.
 */
function shockSuggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const tl = T(c);
  const { p, ready, afford, mana, potion } = ctx(c);
  const seal = currentSeal(c);
  if (!seal) return 'sealOfRighteousness';
  if (!p.autoAttacking && c.inRange(t)) return 'attack';
  if (sealLeft(c) <= 1) return seal;
  if (ready('consecration') && mana >= 0.2) return 'consecration';
  if (ready('judgement') && c.inRange(t, D.judgement.range)) return 'judgement';
  if (executePhase(c) && ready('hammerOfWrath')) return 'hammerOfWrath';
  if (ready('holyStrike') && afford('holyStrike')) return 'holyStrike';
  const shock = ready('holyShock') && afford('holyShock') && c.inRange(t, D.holyShock.range);
  if (shock && tl.divineFavor && ready('divineFavor')) return 'divineFavor';
  if (shock) return 'holyShock';
  if (potion) return 'manaPotion';
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
  manaRows(c, rows);
  return rows;
}

export const paladinShock: Spec = specFor('shock', {
  id: 'paladin-shock',
  specName: 'Shockadin',
  stats: SHOCK_STATS,
  defaultOptions: { build: 'shockadin', mana: 4235, spirit: 100, mp5: 0, lockMana: false, undeadDummy: false },
  options: MANA_OPTIONS,
  sheet: { spellCrit: 'Spell crit (gear + Intellect)', spellPower: 'Spell power (Holy)' },
  lowMana: (c) => c.cost(c.ability('holyShock')!),
  welcome: 'Welcome to Shockadin practice: a melee paladin with Holy Shock on a 10 sec cooldown. gunba\'s Shockadin (23/0/28, re-spent for the Oct 30 trees): keep Seal of Righteousness up, Judgement, Consecration with mana to spare, then Holy Strike and Holy Shock on cooldown.',
  help: `${CONTROLS}
    ${HELP_COMMON}
    Holy Shock is a 21-point Holy talent with a 10 sec cooldown in WoW Forever (30 in Classic). Divine Precision gives it 8% hit, and Divine Favor makes the next one crit. Since the live hotfix of Oct 30 Holy Power only raises healing crits and Light's Vigil only works on allies, so our Light's Vigil builds are gone. It costs a lot of mana: practice it as a burst on top of your melee.
    gunba's Shockadin keeps Seal of Righteousness up, judges, lays Consecration with mana to spare (Consecrated Ground: your Holy spells +10% on its targets), then Holy Strike and Holy Shock. We re-spent it for the Oct 30 trees (Champion of the Light 3/5 is 36% of your Intellect) and spends Divine Favor on a Holy Shock.
    This is a practice tool: hit, crit and proc chances follow WoW Forever; damage numbers are an approximation.`,
  look: { clothColor: 0xe8e0c8, leatherColor: 0xb8902e, hood: false, plate: true },
  suggest: shockSuggest,
  review: shockReview,
});
