// Shared by every class: the attack table against a level 63 boss and the
// talent string decoder used by the sims' builds.
import type { AttackRules } from '../engine/types';

/** Attack table against a level 63 boss. Measured on the beta (magey) unless noted. */
export const BOSS_RULES: AttackRules = {
  specialMiss: 8,           // confirmed: measured 7.63 %; hit suppression is gone in Forever
  spellMiss: 17,            // classic: spells and poisons vs +3
  dualWieldMiss: 27,        // classic: 8 % + 19 % dual-wield penalty
  dodge: 6.5,               // confirmed: measured 6.47 %
  parryFromFront: 14,       // confirmed: measured 14.31 %, only from the front
  glanceChance: 40,         // confirmed: measured 40.15 %
  glanceMin: 0.55,          // classic / provisional: the beta shows ~75 % on average (reported as a bug)
  glanceMax: 0.75,
  critSuppression: 4.8,     // confirmed: 3 % skill + 1.8 % aura vs +3
  critMultiplier: 2,        // classic
  spellCritMultiplier: 1.5, // classic
  offHandMultiplier: 0.5,   // classic
};

/**
 * Talent strings list the points per talent in tree order, trees separated
 * by '-' (the sims' format). `trees` holds the talent keys in that order.
 */
export function decodeTalents<K extends string>(trees: readonly (readonly K[])[], talentString: string): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const tree of trees) for (const k of tree) out[k] = 0;
  talentString.split('-').forEach((part, t) => {
    [...part].forEach((digit, i) => {
      const key = trees[t]?.[i];
      if (key) out[key] = Number(digit);
    });
  });
  return out;
}

/** The controls paragraph every help page starts with. */
export const CONTROLS = `You start behind the dummy. W and S move along your facing, A and D turn, Q and E strafe; all six can be rebound or unbound below (a key does one thing, so binding A and D to strafe stops them turning). Space jumps.
    Hold the left mouse button to orbit the camera; hold the right button to steer; hold both to run forward. Scroll to zoom.
    Click a dummy to target it, right-click to target and start attacking, Tab cycles targets, Esc clears it.
    On a phone, use the joystick to move and drag the screen to steer.
    Action bars: up to four rows of 8 (Settings or the Spellbook); rows 3 and 4 start with the abilities that have no other button, row 3 on Shift+1-8. Spellbook: drag an ability onto a button; drag a button off the bar to clear it. Keys: hover a button and press a key to bind it. Helper turns the next-ability glow off or on. As in WoW, a press in the last 0.4 sec of a cast or the global cooldown is queued and goes off the moment it ends. Heroic Strike, Cleave, Maul and Raptor Strike keep a gold frame from the press until the swing lands, then flash.`;

/** "18/33/0" from a talent string. */
export function talentSplit(talentString: string): string {
  return talentString.split('-').map((p) => [...p].reduce((a, d) => a + Number(d), 0)).concat([0, 0, 0]).slice(0, 3).join('/');
}

/** Talents with points, by tree, for the Settings summary (★ marks what is new in Forever). */
export function talentSummary<K extends string>(
  treeNames: string[], trees: readonly (readonly K[])[], names: Record<K, string>, isNew: Set<K>, t: Record<K, number>,
): { tree: string; points: number; talents: string[] }[] {
  return treeNames.map((tree, i) => ({
    tree,
    points: trees[i].reduce((a, k) => a + t[k], 0),
    talents: trees[i].filter((k) => t[k] > 0).map((k) => `${names[k]} ${t[k]}${isNew.has(k) ? ' ★' : ''}`),
  }));
}
