export type Faction = 'alliance' | 'horde';

/** The races available in the published character selection. Sex does not
 * affect faction; an unrecognized/missing race uses the Alliance fallback. */
export function factionForRace(race: string | null | undefined): Faction {
  return /^(orc|troll|tauren|undead|windshaper)(?:-|$)/i.test(race ?? '') ? 'horde' : 'alliance';
}

export const trainingAreaKeys = (race: string | null | undefined): string[] => [`yard:${factionForRace(race)}`, 'yard'];
