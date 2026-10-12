// Priest for WoW Forever, damage only: Shadow (Shadowform, personal Shadow
// Weaving, Mind Flay clipping, Shadow Word: Death) and the experimental Smite
// build (Holy Fire for Power in Light, Smite, Penance, Mind Blast). Shared
// rules in ./core.ts, numbers in ./data.ts, builds in ./talents.ts.
import type { Combat } from '../../engine/combat';
import type { Spec } from '../../engine/types';
import { BOSS_RULES, CONTROLS } from '../common';
import { ABILITIES, D, SOURCES, T, chances, onCooldown, prepare, regen, shadowform } from './core';
import { SHADOW_STATS, SMITE_STATS } from './data';
import { buildLabel, buildsFor, summary, talentsFor, type PriestSpec } from './talents';

type Row = { label: string; value: string; good?: boolean };
const pctOf = (n: number) => `${Math.round(n * 100)}%`;

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

const HELP_COMMON = `Spells have a cast bar and channels drain one; moving interrupts both. The global cooldown is 1.5 sec, shorter with casting haste (1.0 sec floor).
    Mana is your resource. Spirit regeneration stops for 5 sec after you spend mana (Meditation keeps some while casting); Judgement of Wisdom, Blessing of Wisdom and Mana Spring Totem are on by default under Raid buffs and debuffs, Major Mana Potions are on your bar, and you can lock your mana in Settings.`;
const OPTIONS = [
  { key: 'lockMana', name: 'Lock your mana (spells cost nothing)', kind: 'toggle' as const },
  { key: 'mana', name: 'Mana pool', kind: 'number' as const, step: 100 },
  { key: 'spirit', name: 'Spirit (regeneration outside the five-second rule)', kind: 'number' as const, step: 1 },
  { key: 'mp5', name: 'Mana per 5 sec from gear', kind: 'number' as const, step: 1 },
];

function specFor(spec: PriestSpec, base: Omit<Spec, 'className' | 'resource' | 'abilities' | 'rules' | 'prepare' | 'chances' | 'regen' | 'builds' | 'bar' | 'sources'>): Spec {
  return {
    className: 'Priest',
    resource: 'mana',
    abilities: ABILITIES,
    rules: BOSS_RULES,
    builds: buildsFor(spec).map((b) => ({ id: b.id, label: buildLabel(b), name: b.name, source: b.source, talentString: b.talentString, stats: b.stats, bar: b.bar, trees: summary(talentsFor(b.id, spec)) })),
    bar: buildsFor(spec)[0].bar,
    sources: SOURCES,
    prepare,
    chances,
    regen,
    ...base,
  };
}

// ------------------------------------------------------------------ Shadow
/** gs's ranked Shadow list (death first), with Mind Flay clipped only after its 2nd tick. */
function shadowSuggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const tl = T(c);
  const { p, ready, afford, potion } = ctx(c);
  if (tl.shadowform && !shadowform(c)) return 'shadowform';
  const healthy = c.playerHealthLocked || p.health / p.maxHealth > 0.3;
  const deathReady = ready('shadowWordDeath') && afford('shadowWordDeath') && healthy;
  const plagueDue = !c.aura(t, 'devouringPlague') && ready('devouringPlague') && afford('devouringPlague');
  const painDue = !c.aura(t, 'shadowWordPain') && afford('shadowWordPain');
  const blastReady = ready('mindBlast') && afford('mindBlast');
  // Mind Flay: let it tick twice, then clip right after a tick only for something better.
  const ch = c.channeling;
  if (ch?.id === 'mindFlay') {
    if (ch.done < 2) return null;
    if (deathReady) return 'shadowWordDeath';
    if (plagueDue) return 'devouringPlague';
    if (painDue) return 'shadowWordPain';
    if (blastReady) return 'mindBlast';
    return null;
  }
  if (deathReady) return 'shadowWordDeath';
  if (plagueDue) return 'devouringPlague';
  if (painDue) return 'shadowWordPain';
  if (tl.innerFocus && ready('innerFocus') && blastReady && p.inCombat) return 'innerFocus';
  if (blastReady) return 'mindBlast';
  if (potion) return 'manaPotion';
  if (tl.mindFlay && afford('mindFlay')) return 'mindFlay';
  return null;
}

function shadowReview(c: Combat): Row[] {
  const k = c.counters;
  const time = k.combatTime ?? 0;
  if (time < 1) return [];
  const uptime = (key: string) => (k[key] ?? 0) / time;
  const flays = c.meter.rows.get('mindFlay');
  const rows: Row[] = [
    { label: 'Shadow Word: Pain uptime', value: pctOf(uptime('uptime:target:shadowWordPain')), good: uptime('uptime:target:shadowWordPain') >= 0.9 },
    { label: 'Mind Blast on cooldown', value: pctOf(onCooldown(c, 'mindBlast', D.mindBlast.cooldown - 0.5 * T(c).improvedMindBlast)), good: onCooldown(c, 'mindBlast', D.mindBlast.cooldown - 0.5 * T(c).improvedMindBlast) >= 0.8 },
    { label: 'Shadow Word: Death on cooldown', value: pctOf(onCooldown(c, 'shadowWordDeath', D.shadowWordDeath.cooldown)), good: onCooldown(c, 'shadowWordDeath', D.shadowWordDeath.cooldown) >= 0.8 },
    { label: 'Devouring Plague uptime', value: pctOf(uptime('uptime:target:devouringPlague')) },
  ];
  if (T(c).shadowWeaving) rows.push({ label: 'Shadow Weaving uptime', value: pctOf(uptime('uptime:target:shadowWeaving')), good: uptime('uptime:target:shadowWeaving') >= 0.9 });
  if (flays) rows.push({ label: 'Mind Flays cut short', value: String(k['clipped:mindFlay'] ?? 0) });
  manaRows(c, rows);
  return rows;
}

export const priestShadow: Spec = specFor('shadow', {
  id: 'priest-shadow',
  specName: 'Shadow',
  showHealth: true,
  stats: SHADOW_STATS,
  defaultOptions: { build: 'shadow', mana: 4301, spirit: D.spirit, mp5: D.mp5, lockMana: false },
  defaultRaid: ['judgementOfWisdom', 'blessingOfWisdom', 'manaSpring'],
  options: OPTIONS,
  sheet: { attackPower: false, crit: false, spellCrit: 'Spell crit (gear + Intellect)', spellPower: 'Spell power (every school)', mainHand: false, offHand: false },
  lowMana: (c) => c.cost(c.ability('mindBlast')!),
  welcome: 'Welcome to the Shadow practice yard. In Shadowform, keep Shadow Word: Pain and Devouring Plague ticking, Shadow Word: Death and Mind Blast on cooldown, and fill with Mind Flay: let it tick twice before you clip it, right after a tick. Shadow Word: Death costs you health on a dummy.',
  help: `${CONTROLS}
    ${HELP_COMMON}
    Shadow in WoW Forever: Shadowform gives +10% Shadow damage, half-price Shadow spells and 2.0x Shadow crits. Shadow Weaving is personal: each landed Shadow spell adds +2% to your Shadow damage, up to 5 stacks for 15 sec. Mind Flay is one hit roll for the whole channel; its ticks crit. Shadow Word: Death (baseline) hurts you for 10% of your health whenever the target survives: the health bar shows it, and raid healers top you up.
    The yellow glow follows the WoW Forever sims: Death, Plague, Pain when it fell off (recast after the last tick: a recast restarts it), Inner Focus with Mind Blast, Mind Blast, Mind Flay. During Mind Flay it waits for two ticks, then lights what is worth clipping for.
    This is a practice tool: hit, crit and proc chances follow WoW Forever; damage numbers are an approximation.`,
  look: { clothColor: 0x3a2a55, leatherColor: 0x2a2030, hood: true, robe: true },
  suggest: shadowSuggest,
  review: shadowReview,
});

// ------------------------------------------------------------------- Smite
/** gs's ranked Smite list plus Mind Blast above 30 % mana (MythicSim engine's variant) and Pain when missing (fs). */
function smiteSuggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const tl = T(c);
  const { p, ready, afford, mana, potion } = ctx(c);
  // Let Penance fire all three bolts.
  if (c.channeling?.id === 'penance') return null;
  const hf = c.aura(t, 'holyFire');
  if ((!hf || hf.end - c.t < 3) && afford('holyFire') && c.casting?.id !== 'holyFire') return 'holyFire';
  if (tl.powerInfusion && p.inCombat && ready('powerInfusion')) return 'powerInfusion';
  if (tl.innerFocus && p.inCombat && ready('innerFocus')) return 'innerFocus';
  if (ready('mindBlast') && afford('mindBlast') && mana > 0.3) return 'mindBlast';
  if (!c.aura(t, 'shadowWordPain') && mana >= 0.3 && afford('shadowWordPain')) return 'shadowWordPain';
  if (c.aura(p, 'holyPurpose') && tl.holyNova && c.inRange(t, D.holyNova.range)) return 'holyNova';
  if (tl.penance && ready('penance') && mana > 0.6) return 'penance';
  if (potion) return 'manaPotion';
  return 'smite';
}

function smiteReview(c: Combat): Row[] {
  const k = c.counters;
  const time = k.combatTime ?? 0;
  if (time < 1) return [];
  const uptime = (key: string) => (k[key] ?? 0) / time;
  const tl = T(c);
  const rows: Row[] = [
    { label: tl.powerInLight ? 'Holy Fire uptime (Power in Light)' : 'Holy Fire uptime', value: pctOf(uptime('uptime:target:holyFire')), good: uptime('uptime:target:holyFire') >= 0.85 },
    { label: 'Mind Blast casts', value: String((c.meter.rows.get('mindBlast')?.hits ?? 0) + (c.meter.rows.get('mindBlast')?.misses ?? 0)) },
  ];
  if (tl.penance) rows.push({ label: 'Penance casts', value: String(Math.round(((c.meter.rows.get('penance')?.hits ?? 0) + (c.meter.rows.get('penance')?.misses ?? 0)) / D.penance.bolts)) });
  manaRows(c, rows);
  return rows;
}

export const priestSmite: Spec = specFor('smite', {
  id: 'priest-smite',
  specName: 'Smite (experimental)',
  stats: SMITE_STATS,
  defaultOptions: { build: 'smite', mana: 4650, spirit: D.spirit, mp5: D.mp5, lockMana: false },
  defaultRaid: ['judgementOfWisdom', 'blessingOfWisdom', 'manaSpring', 'judgementOfTheCrusader'],
  options: OPTIONS,
  sheet: { attackPower: false, crit: false, spellCrit: 'Spell crit (gear + Intellect)', spellPower: 'Spell power (every school)', mainHand: false, offHand: false },
  lowMana: (c) => c.cost(c.ability('smite')!),
  welcome: 'Welcome to the Smite practice yard, an experimental WoW Forever build: keep your Holy Fire burning for Power in Light, Smite as the filler, Mind Blast while you have mana, Power Infusion and Inner Focus together. Judgement of the Crusader from a raid paladin is on by default.',
  help: `${CONTROLS}
    ${HELP_COMMON}
    Smite in WoW Forever: Smite and Holy Fire were halved, then built back by Power in Light (+10% to Smite and Penance while your Holy Fire burns), Searing Light (+5% Holy, and Holy Fire ticks can give a free Holy Nova), Holy Precision (+18% Holy hit) and Holy Specialization (+5% crit). Penance fires three bolts at 0, 1 and 2 sec; the sims only use it with mana to spare. Mind Blast does about 1.8x Smite's damage per second of casting.
    Recast Holy Fire when its burn has less than 3 sec left: the 3.0 sec cast lands as the old one ends. Judgement of the Crusader adds Holy damage scaled by each spell's coefficient.
    This is a practice tool built on an experimental spec: hit, crit and proc chances follow WoW Forever; damage numbers are an approximation.`,
  look: { clothColor: 0xe8e0c8, leatherColor: 0xb8902e, hood: false, robe: true },
  suggest: smiteSuggest,
  review: smiteReview,
});
