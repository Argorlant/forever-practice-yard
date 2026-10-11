// Warlock for WoW Forever: Affliction (DoTs, Nightfall, Bane of Doom),
// Demonology (Demonic Pact with a Succubus, Demonic Brand, Soul Fire in
// Decimation) and Destruction (Shadow and Flame with Incinerate, Conflagrate
// and Shadowburn; DS/Ruin Shadow Bolts). Life Tap turns health into mana and
// raid healing gives it back. Shared rules in ./core.ts, numbers in ./data.ts,
// builds in ./talents.ts.
import type { Combat } from '../../engine/combat';
import type { Spec } from '../../engine/types';
import { BOSS_RULES, CONTROLS } from '../common';
import { ABILITIES, D, SOURCES, T, baneOn, build, chances, execute, left, lifeTapAmount, prepare, regen } from './core';
import { AFFLICTION_STATS, DESTRUCTION_STATS, PACT_STATS } from './data';
import { buildLabel, buildsFor, summary, talentsFor, type WarlockSpec } from './talents';

type Row = { label: string; value: string; good?: boolean };
const pctOf = (n: number) => `${Math.round(n * 100)}%`;

function ctx(c: Combat) {
  const p = c.player;
  const t = c.target!;
  const ready = (id: string) => c.cooldownLeft(id).left === 0 && (c.ability(id)?.usable?.(c) ?? true);
  const afford = (id: string) => c.cost(c.ability(id)!) <= p.resource;
  const castOf = (id: string) => { const a = c.ability(id)!; return typeof a.castTime === 'function' ? a.castTime(c) : a.castTime ?? 0; };
  /** Recast a DoT when it has no more time left than its cast (instants when they drop), unless it is being cast now. */
  const due = (id: string) => c.casting?.id !== id && left(c, t, id) <= castOf(id) && ready(id) && afford(id);
  return { p, t, ready, afford, due };
}

/** gs's opening of every list: Life Tap when low (health allowing), a potion, Curse of the Elements, one Bane (Doom on cooldown). */
function common(c: Combat): string | null {
  const { p, t, ready, afford, due } = ctx(c);
  if (!c.manaLocked) {
    const mana = p.resource / p.maxResource;
    const tap = lifeTapAmount(c);
    const healthy = c.playerHealthLocked || p.health - tap >= 0.35 * p.maxHealth;
    if (p.inCombat && p.resource <= p.maxResource - D.manaPotion.max && mana < 0.5 && ready('manaPotion')) return 'manaPotion';
    if ((mana < 0.15 || !afford('shadowBolt')) && healthy && p.resource + tap <= p.maxResource + 100) return 'lifeTap';
  }
  if (!c.raid.has('curseOfElements') && !c.aura(t, 'curseOfElements') && afford('curseOfTheElements')) return 'curseOfTheElements';
  if (ready('baneOfDoom') && afford('baneOfDoom') && !c.aura(t, 'baneOfDoom')) return 'baneOfDoom';
  if (!baneOn(c, t) && due('baneOfAgony')) return 'baneOfAgony';
  return null;
}

function rotationSuggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const tl = T(c);
  const { p, ready, afford, due } = ctx(c);
  if (c.channeling) return null;
  const first = common(c);
  if (first) return first;
  switch (build(c).rotation) {
    case 'affliction':
    case 'ruin':
      if (due('corruption')) return 'corruption';
      if (tl.siphonLife && due('siphonLife')) return 'siphonLife';
      if (due('immolate')) return 'immolate';
      return 'shadowBolt';
    case 'fire':
      if (due('immolate')) return 'immolate';
      if (tl.conflagrate && ready('conflagrate') && afford('conflagrate') && c.aura(t, 'immolate')) return 'conflagrate';
      if (due('corruption')) return 'corruption';
      if (tl.shadowburn && ready('shadowburn') && afford('shadowburn')) return 'shadowburn';
      return tl.incinerate ? 'incinerate' : 'shadowBolt';
    case 'pact':
      if (tl.demonicBrand && c.pet.out && !c.aura(t, 'demonicBrand') && c.casting?.id !== 'searingPain' && afford('searingPain')) return 'searingPain';
      if (due('corruption')) return 'corruption';
      if (due('immolate')) return 'immolate';
      if (execute(c) && c.aura(p, 'decimation') && ready('soulFire') && afford('soulFire')) return 'soulFire';
      return 'shadowBolt';
  }
}

function review(c: Combat): Row[] {
  const k = c.counters;
  const time = k.combatTime ?? 0;
  if (time < 1) return [];
  const tl = T(c);
  const uptime = (id: string) => (k[`uptime:target:${id}`] ?? 0) / time;
  const rot = build(c).rotation;
  const rows: Row[] = [
    { label: 'Corruption uptime', value: pctOf(uptime('corruption')), good: uptime('corruption') >= 0.85 },
    { label: 'Immolate uptime', value: pctOf(uptime('immolate')), good: uptime('immolate') >= (rot === 'fire' ? 0.85 : 0.75) },
    { label: 'Bane uptime (Doom or Agony)', value: pctOf(Math.min(1, uptime('baneOfDoom') + uptime('baneOfAgony'))), good: uptime('baneOfDoom') + uptime('baneOfAgony') >= 0.9 },
  ];
  if (tl.siphonLife && rot === 'affliction') rows.push({ label: 'Siphon Life uptime', value: pctOf(uptime('siphonLife')), good: uptime('siphonLife') >= 0.85 });
  if (tl.improvedShadowBolt && rot !== 'fire') rows.push({ label: 'Your Improved Shadow Bolt uptime', value: pctOf(uptime('improvedShadowBolt')) });
  if (tl.nightfall) rows.push({ label: 'Shadow Trance procs / used', value: `${k.shadowTrance ?? 0} / ${k.tranceUsed ?? 0}`, good: (k.tranceUsed ?? 0) >= (k.shadowTrance ?? 0) - 1 });
  if (rot === 'fire') {
    const casts = (id: string) => (c.meter.rows.get(id)?.hits ?? 0) + (c.meter.rows.get(id)?.misses ?? 0);
    rows.push({ label: 'Conflagrates / Shadowburns', value: `${casts('conflagrate')} / ${casts('shadowburn')}` });
    rows.push({ label: 'Shadow and Flame: Shadow / Flame uptime', value: `${pctOf((k['uptime:shadowFlameShadow'] ?? 0) / time)} / ${pctOf((k['uptime:shadowFlameFire'] ?? 0) / time)}` });
  }
  if (rot === 'pact' && tl.demonicBrand) {
    const brand = c.meter.rows.get('demonicBrand');
    rows.push({ label: 'Demonic Brand hits', value: String(brand?.hits ?? 0) });
  }
  if (!c.manaLocked) {
    rows.push({ label: 'Life Taps (mana gained)', value: `${k.lifeTaps ?? 0} (+${Math.round(k.lifeTapMana ?? 0)})` });
    if (c.raid.has('judgementOfWisdom')) rows.push({ label: 'Mana from Judgement of Wisdom', value: `+${Math.round(k.manaOnHit ?? 0)}` });
    rows.push({ label: 'Time without mana for Shadow Bolt', value: `${Math.round(k.lowMana ?? 0)} s (${pctOf((k.lowMana ?? 0) / time)})`, good: (k.lowMana ?? 0) / time < 0.05 });
  }
  return rows;
}

const HELP_COMMON = `Spells have a cast bar and channels drain one; moving interrupts both. The global cooldown is 1.5 sec, shorter with casting haste (1.0 sec floor).
    Mana is your resource and Life Tap refills it from your health: (424 + Spirit) health into the same mana, instant, and it does not stop your Spirit regeneration. Raid healers give the health back (150 per second by default, in Settings); Life Tap is refused if it would kill you. Your health is unlocked by default so you see it; lock it in Settings to tap freely. Judgement of Wisdom, Blessing of Wisdom and Mana Spring Totem are on by default under Raid buffs and debuffs.
    One Curse and one Bane per target: Curse of the Elements (+10% magic damage; skip it when a raid warlock provides it under Raid buffs and debuffs) and Bane of Doom (one hit for 1742 + 4x spell power after 60 sec, on cooldown) or Bane of Agony when Doom is out. Refresh a DoT when it has no more time left than its cast.`;
const OPTIONS = [
  { key: 'lockMana', name: 'Lock your mana (spells cost nothing)', kind: 'toggle' as const },
  { key: 'mana', name: 'Mana pool', kind: 'number' as const, step: 100 },
  { key: 'spirit', name: 'Spirit (regeneration and Life Tap)', kind: 'number' as const, step: 1 },
  { key: 'mp5', name: 'Mana per 5 sec from gear', kind: 'number' as const, step: 1 },
  { key: 'raidHealing', name: 'Raid healing on you (health per second)', kind: 'number' as const, step: 10 },
];

function specFor(spec: WarlockSpec, base: Omit<Spec, 'className' | 'resource' | 'abilities' | 'rules' | 'prepare' | 'chances' | 'regen' | 'builds' | 'bar' | 'sources' | 'suggest' | 'review' | 'showHealth' | 'options' | 'sheet'>): Spec {
  return {
    className: 'Warlock',
    resource: 'mana',
    abilities: ABILITIES,
    rules: BOSS_RULES,
    builds: buildsFor(spec).map((b) => ({ id: b.id, label: buildLabel(b), stats: b.stats, bar: b.bar, options: b.options, trees: summary(talentsFor(b.id, spec)) })),
    bar: buildsFor(spec)[0].bar,
    sources: SOURCES,
    prepare,
    chances,
    regen,
    suggest: rotationSuggest,
    review,
    showHealth: true,
    options: OPTIONS,
    sheet: { attackPower: false, crit: false, spellCrit: 'Spell crit (gear + Intellect)', spellPower: 'Spell damage (every school)', mainHand: false, offHand: false },
    lowMana: (c) => c.cost(c.ability('shadowBolt')!),
    defaultRaid: ['judgementOfWisdom', 'blessingOfWisdom', 'manaSpring'],
    ...base,
  };
}

const opts = (build: string, mana: number) => ({ build, mana, spirit: D.spirit, mp5: D.mp5, raidHealing: D.raidHealing, lockMana: false });

export const warlockAffliction: Spec = specFor('affliction', {
  id: 'warlock-affliction',
  specName: 'Affliction',
  stats: AFFLICTION_STATS,
  defaultOptions: opts('affliction', 4033),
  welcome: 'Welcome to the Affliction practice yard. Curse of the Elements, Bane of Doom on cooldown, then keep Corruption, Siphon Life and Immolate ticking and fill with Shadow Bolt. Shadow Trance (Nightfall) makes the next one instant. Life Tap turns health into mana; raid healing gives it back.',
  help: `${CONTROLS}
    ${HELP_COMMON}
    Affliction in WoW Forever: Pandemic makes your DoTs and drains crit for 2.0x, Malevolence adds Shadow crit, Malediction periodic damage. Nightfall gives each Corruption and Drain Life tick a chance for Shadow Trance (instant Shadow Bolt). Improved Shadow Bolt is personal: a Shadow Bolt crit gives +20% to your Shadow damage for 12 sec. Amplify Curse only helps Bane of Agony. Wrack is on the bar; no sim casts it yet.
    This is a practice tool: hit, crit and proc chances follow WoW Forever; damage numbers are an approximation.`,
  look: { clothColor: 0x4a2a6a, leatherColor: 0x2a1a30, hood: true, robe: true },
});

export const warlockDemonology: Spec = specFor('demonology', {
  id: 'warlock-demonology',
  specName: 'Demonology',
  stats: PACT_STATS,
  defaultOptions: opts('pact', 4638),
  welcome: 'Welcome to the Demonology practice yard (Demonic Pact). Your Succubus fights with you; Searing Pain brands the target so her next attacks add Shadow damage. Keep the Brand up, Bane of Doom on cooldown, Corruption and Immolate ticking, and fill with Shadow Bolt. Below 35% health, Decimation makes Soul Fire fast.',
  help: `${CONTROLS}
    ${HELP_COMMON}
    Demonology in WoW Forever: Demonic Pact keeps the buff of your sacrificed demon (Voidwalker: mana; or Imp: +15% Shadow) with the Succubus out. Demonic Knowledge adds spell power while she is out, Soul Link +3% damage, Master Demonologist +10% Shadow with a Succubus. Demonic Brand: Searing Pain gives 6 charges; each landed demon attack spends one for extra damage. Decimation: Shadow Bolt and Searing Pain on a target below 35% make Soul Fire faster with a shorter cooldown (start the dummy at 30% health in Settings to practice it).
    The demon is not drawn in the yard; its attacks show in the meter.
    This is a practice tool: hit, crit and proc chances follow WoW Forever; damage numbers are an approximation.`,
  look: { clothColor: 0x3a5a2a, leatherColor: 0x2a2a1a, hood: true, robe: true },
});

export const warlockDestruction: Spec = specFor('destruction', {
  id: 'warlock-destruction',
  specName: 'Destruction',
  stats: DESTRUCTION_STATS,
  defaultOptions: opts('fire', 4153),
  welcome: 'Welcome to the Destruction practice yard (Shadow and Flame). Immolate, then Conflagrate and Shadowburn on cooldown: each keeps a +10% buff up for the other school, and Shadow and Flame keeps your Immolate burning. Corruption and Bane of Doom tick on the side; Incinerate is the filler. The DS/Ruin build plays Shadow Bolts instead.',
  help: `${CONTROLS}
    ${HELP_COMMON}
    Destruction in WoW Forever: Ruin makes Destruction spells crit for 2.0x, Agonizing Flames adds 10% to them, Cataclysm cuts their cost. Shadow and Flame: Conflagrate gives +10% Shadow damage for 20 sec and keeps Immolate (100% at 5/5); Shadowburn gives +10% Fire damage. Incinerate's base damage is 25% higher while your Immolate burns. Fire and Brimstone adds 25% crit to Conflagrate. DS/Ruin sacrifices the Imp (+15% Shadow) and casts Shadow Bolt.
    This is a practice tool: hit, crit and proc chances follow WoW Forever; damage numbers are an approximation.`,
  look: { clothColor: 0x8a2a1a, leatherColor: 0x3a1a10, hood: true, robe: true },
});
