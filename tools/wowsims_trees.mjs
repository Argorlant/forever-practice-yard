// Patches src/ui/talent-layout.json with the talent trees WoWSims Forever has since the
// hotfixes of November 2026. Its tree files give the order, places, ranks and prerequisites;
// they hold no text, so the words and each rank's values are below, the values from its spell
// table's rank curves (sim/core/spelldata/spells_auto_gen.go). A talent keeps the key the specs
// know it by. Run after tools/wowhead_trees.mjs, and move COMMIT to take a newer version.
//
// Usage: node tools/wowsims_trees.mjs
import fs from 'node:fs';

const COMMIT = '7c3453f5ad4576193235e2db05e1eec5bf0b1316';
const TREES = `https://raw.githubusercontent.com/wowsims/forever/${COMMIT}/ui/sim/talents/trees`;
const FILE = 'src/ui/talent-layout.json';

const REWORKED = {
  warrior: {
    // Its name for a talent, and ours where the code keeps an older one.
    keys: { twohandedWeaponSpecialization: 'twoHandedWeaponSpecialization' },
    fresh: {
      recklessSwings: {
        // Icons the site does not host come from the image server, as in the spellbook.
        icon: 'cdn:ability_warrior_bloodfrenzy',
        text: 'Spend {0}% of your base Health: your next {1} melee attacks generate {2} additional Rage. Lasts {3} sec.',
        ranks: [[25, 4, 5, 8]],
      },
      improvedWhirlwind: {
        icon: 'ability_whirlwind',
        text: 'Reduces the cooldown of your Whirlwind ability by {0} sec and increases the damage it deals to the closest enemy by {1}%.',
        ranks: [[1, 15], [2, 30]],
      },
    },
    ranks: {
      improvedTacticalMastery: [[5], [10], [15]],
      spearingStrike: [[75, 75]],
      twoHandedWeaponSpecialization: [[2], [4], [6]],
      bloodthrill: [[10, 1, 6], [20, 1, 6]],
      improvedSlam: [[0.25, 2.5], [0.5, 5]],
      flurry: [[10], [20], [30]],
    },
  },
  shaman: {
    keys: { trialByFire: 'improvedFireNova' },
    fresh: {
      callOfThunder: {
        icon: 'spell_nature_callstorm',
        text: 'Increases the critical strike chance of your Lightning Bolt and Chain Lightning spells by {0}%.',
        ranks: [[5]],
      },
      lightningMastery: {
        icon: 'cdn:spell_nature_unrelentingstorm',
        text: 'Gain mastery over Lightning, reducing the cast time of Lightning Bolt by 0.5 sec, and removing the cooldown from Chain Lightning. Lasts 15 sec.',
        ranks: [],
      },
    },
    ranks: {
      lightningOverload: [[10], [20], [30]],
      mentalDexterity: [[50], [100], [150]],
      flurry: [[6], [12], [18], [24], [30]],
    },
    text: {
      stormstrike: 'Instantly strike for 150% of normal weapon damage and increase Nature damage you deal to the target by {0}% for {1} sec.',
    },
  },
};
/** Values per rank in a tree that kept its shape. */
const NEW_RANKS = {
  hunter: { lightningReflexes: [[3], [6], [9], [12], [15]], barrage: [[5], [10], [15]] },
};
/** Words in a tree that kept its shape. */
const NEW_TEXT = {
  paladin: {
    twoHandedWeaponSpecialization: 'Increases the Physical and Holy damage you deal by {0}%, and reduces all threat you generate by {1}% while a two-handed melee weapon is equipped.',
    vengeance: 'Increases your Physical and Holy damage dealt by {0}% for 30 sec after landing a non-periodic critical strike.  Stacks up to 5 times.',
    holyShield: 'Increases chance to block by 30% for 10 sec, and deals 221 Holy damage for each attack blocked while active.  Damage caused by Holy Shield causes 20% additional threat. Each block expends a charge. 4 charges.',
  },
};

const layout = JSON.parse(fs.readFileSync(FILE, 'utf8'));
for (const [cls, rework] of Object.entries(REWORKED)) {
  const res = await fetch(`${TREES}/${cls}.json`);
  if (!res.ok) throw new Error(`${cls}: ${res.status}`);
  const trees = await res.json();
  for (const [i, tree] of trees.entries()) {
    const old = new Map(layout[cls][i].talents.map((t) => [t.key, t]));
    layout[cls][i].talents = tree.talents.map((t) => {
      const key = rework.keys[t.fieldName] ?? t.fieldName;
      const had = old.get(key);
      const fresh = rework.fresh[key];
      if (!had && !fresh) throw new Error(`${cls}.${key}: new in the tree, with no text here`);
      return {
        key,
        name: t.fancyName,
        row: t.location.rowIdx,
        col: t.location.colIdx,
        max: t.maxPoints,
        icon: fresh?.icon ?? had.icon,
        req: t.prereqLocation ? [t.prereqLocation.rowIdx, t.prereqLocation.colIdx] : null,
        text: fresh?.text ?? rework.text?.[key] ?? had.text,
        ranks: fresh?.ranks ?? rework.ranks[key] ?? had.ranks,
      };
    });
  }
}
for (const [cls, ranks] of Object.entries(NEW_RANKS)) {
  for (const [key, values] of Object.entries(ranks)) {
    const talent = layout[cls].flatMap((tree) => tree.talents).find((t) => t.key === key);
    if (!talent) throw new Error(`${cls}.${key}: not in the tree`);
    talent.ranks = values;
  }
}
for (const [cls, texts] of Object.entries(NEW_TEXT)) {
  for (const [key, text] of Object.entries(texts)) {
    const talent = layout[cls].flatMap((tree) => tree.talents).find((t) => t.key === key);
    if (!talent) throw new Error(`${cls}.${key}: not in the tree`);
    talent.text = text;
  }
}
fs.writeFileSync(FILE, JSON.stringify(layout));
console.log(`${FILE}: ${Object.keys(REWORKED).join(', ')} from WoWSims Forever at ${COMMIT.slice(0, 7)}`);
