// Builds src/ui/talent-notes.json: what WoW Forever changed in each talent,
// for the talent planner's tooltips. Per class, the talents new in Forever
// (the research sheets' newInForever and each spec's NEW_IN_FOREVER set),
// the research sheets' note on how a talent differs from Classic, its Classic
// name when it was renamed, and the Classic talents Forever took out.
//
// Usage: node tools/talent_notes.mjs
import fs from 'node:fs';

const layout = JSON.parse(fs.readFileSync('src/ui/talent-layout.json', 'utf8'));
const camel = (s) => s.replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean)
  .map((w, i) => (i ? w[0].toUpperCase() : w[0].toLowerCase()) + w.slice(1)).join('');

/** A spec's NEW_IN_FOREVER set, read from its talents file. */
function specNew(cls) {
  const src = ['talents.gen.ts', 'talents.ts'].map((f) => `src/specs/${cls}/${f}`).filter((f) => fs.existsSync(f))
    .map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  const m = src.match(/NEW_IN_FOREVER = new Set<TalentKey>\(\[([^\]]*)\]/);
  return new Set(m ? [...m[1].matchAll(/'(\w+)'/g)].map((x) => x[1]) : []);
}

/** A research note made fit for a tooltip: no issue numbers, no "moved to row N" that the current trees contradict. */
function clean(note, row) {
  if (!note || /^Unchanged\b/i.test(note)) return null;
  const sentences = note.replace(/\s*\(#\d+\)/g, '').split(/(?<=\.)\s+/)
    .filter((s) => { const m = s.match(/^Moved to row (\d)/i); return !m || Number(m[1]) === row + 1; });
  return sentences.join(' ').trim() || null;
}

// What the hotfixes of November changed since the research sheets were written (WoWSims Forever's spell table).
const NOVEMBER = {
  warlock: {
    wrack: 'New: 86 damage per second at level 60, coefficient doubled in November.',
    shadowAndFlame: 'Conflagrate: more Shadow, Shadowburn: more Fire, 4-20%, for 20 s; 20-100% to keep Immolate or refund the Soul Shard.',
    improvedDrains: 'No longer raises Wrack; raises Drain Mana instead.',
  },
  druid: {
    rendAndTear: '3-15% more melee damage on bleeding targets.',
  },
  rogue: {
    mutilate: 'New capstone of Assassination in November: 90% weapon damage per hand.',
    venom: 'A passive since November: Shank raises poison damage 30% and their chance 20% for 6 s.',
    lethality: '2 points: 10/20%.',
    relentlessStrikes: '5 points: 4-20% per combo point for 25 Energy.',
    sealFate: '3 points: 33/66/100%.',
    flawlessExecution: '15 Energy off Eviscerate.',
    aggression: '5/10/15%, Sinister Strike and Eviscerate only.',
    dualWieldSpecialization: '2 points: 25/50% off-hand damage.',
    setup: '15/30/45%.',
    opportunity: '5 points: 4-20%.',
    camouflage: '3 points: 5/10/15% speed in Stealth, 2/4/6 s off its cooldown.',
    ghostlyStrike: 'Also lets your next Ambush or Garrote skip Stealth.',
    hemorrhage: 'Raises your Rupture and Garrote by 15%.',
    bloodSplatter: 'New: 6 s more Rupture and 9 s more Garrote.',
    composure: 'New: 5/10 more Energy off Poised.',
    flashOfSteel: 'New: 3-15 more Energy from Shank and 0.4-2 s off its cooldown.',
    quickGetaway: 'New: speed after a Sap.',
    bootKnife: 'New: 20-100% for Shank to add 2 combo points.',
    deathMark: 'New capstone of Subtlety.',
  },
  warrior: {
    flurry: '3 points: 10/20/30% for 3 swings after a crit; no prerequisite.',
    improvedTacticalMastery: "Was 'Tactical Mastery'; base 10 rage is now baseline. 3 points: 5/10/15 more rage.",
    bloodthrill: '2 points: 10/20%.',
    twoHandedWeaponSpecialization: '3 ranks, 2/4/6% (Classic 5 ranks, 1-5%).',
    improvedSlam: 'Moved from Fury, 2 points: -0.25 s cast and GCD and -2.5 s cooldown per point; Slam no longer interrupts the swing.',
    spearingStrike: '75% normalized weapon damage.',
    recklessSwings: '25% of base health: the next 4 white swings add 5 rage each. 15 s cooldown.',
    improvedWhirlwind: '2 points: 1/2 s off the cooldown and 15/30% more to the closest enemy.',
    defiance: '7/13/20% more threat in Defensive Stance with a shield (Defensive Stance itself 80% since November).',
  },
  shaman: {
    flurry: '6%/point (30% max); requires Mental Dexterity.',
    lightningOverload: 'New: 10/20/30% free copy of LB or CL, no threat.',
    mentalDexterity: 'New: AP from Intellect, 50/100/150%.',
    stormstrike: '16-point milestone; 6 s, 150% normalized weapon damage, personal +20% to the next LB/CL/ES.',
    maelstromWeapon: 'New: stacks that make Lightning Bolt faster and cheaper. Chance doubled in November.',
    callOfThunder: 'Replaced Lava Burst in November: +5% crit on LB and CL.',
    lightningMastery: 'Elemental Mastery, renamed in November: Lava Burst is gone.',
    elementalReach: 'Formerly Storm Reach: +3/6 yd LB, CL, Fire Nova; +8/15 yd Flame Shock.',
  },
  hunter: {
    lightningReflexes: '3%/point Agility.',
    barrage: '5/10/15%; now Aimed Shot too, plus Multi-Shot and Volley.',
    trueshotAura: 'Moved from row 7 to row 4; ranged AP only, 100 at rank 5.',
  },
  paladin: {
    vengeance: 'Reworked: +1/2/3% Physical and Holy damage per stack, 5 stacks, 30 s, after any non-periodic crit.',
    twoHandedWeaponSpecialization: '2/4/6% Physical and Holy damage, 7/14/20% less threat.',
  },
  mage: {
    arcaneConcentration: '2%/point Clearcasting after a landed damage spell, each Arcane Missiles missile too; 1 s ICD. Lower chance with much lower-rank spells.',
  },
};
/** Listed as removed by the research sheets, but only renamed since. */
const RENAMED = ['elemental mastery'];

const out = {};
for (const cls of Object.keys(layout)) {
  const file = `research/${cls}_forever.json`;
  const j = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { talents: {} };
  const research = new Map();
  for (const tree of Object.values(j.talents ?? {})) {
    if (!Array.isArray(tree)) continue;
    for (const t of tree) if (t?.name) research.set(t.fieldName ?? camel(t.name), t);
  }
  const fresh = specNew(cls);
  const talents = {};
  for (const tree of layout[cls]) {
    for (const t of tree.talents) {
      const r = research.get(t.key);
      const note = {};
      if (fresh.has(t.key) || r?.newInForever) note.new = true;
      const change = NOVEMBER[cls]?.[t.key] ?? clean(r?.foreverChange, t.row);
      if (change) note.change = change;
      if (r?.renamedFrom && !(change ?? '').includes(r.renamedFrom)) note.was = r.renamedFrom;
      if (Object.keys(note).length) talents[t.key] = note;
    }
  }
  const removed = j.talents?.removedInForever;
  // Older sheets can list a talent the current trees have again: those are left out.
  const names = layout[cls].flatMap((tree) => tree.talents.map((t) => t.name.toLowerCase()));
  const list = (Array.isArray(removed) ? removed : removed?.value ?? [])
    .filter((s) => typeof s === 'string' && !/\bremains?\b/.test(s) && ![...names, ...RENAMED].some((n) => s.toLowerCase().startsWith(n)));
  out[cls] = { talents, removed: list };
}
fs.writeFileSync('src/ui/talent-notes.json', `${JSON.stringify(out, null, 1)}\n`);
for (const [cls, v] of Object.entries(out)) {
  const n = Object.values(v.talents);
  console.log(`${cls}: ${n.filter((x) => x.new).length} new, ${n.filter((x) => x.change).length} notes, ${v.removed.length} removed`);
}
