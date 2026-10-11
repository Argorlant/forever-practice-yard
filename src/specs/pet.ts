// The pet bar, as in WoW: Attack, Follow and Stay, plus the pet's mode in
// Settings. Shared by every spec with a pet (hunters, warlocks); the engine
// moves the pet and lets it hit only once its target is in reach.
import type { Combat } from '../engine/combat';
import type { Ability, SettingField } from '../engine/types';

const needsPet = (c: Combat) => (c.pet.out ? null : 'You have no pet out');
const order = { gcd: 0, petCommand: true, requirements: needsPet, usable: (c: Combat) => c.pet.out };

export const PET_COMMANDS: Ability[] = [
  {
    id: 'petAttackOrder', name: 'Attack (pet)', icon: 'petAttackOrder', target: 'enemy', needsFacing: false, ...order,
    description: () => 'Sends your pet at your target. It runs there and starts hitting once it is in reach: melee range, or casting range for the Imp.',
    use: (c, t) => c.commandPet('attack', t),
  },
  {
    id: 'petFollowOrder', name: 'Follow (pet)', icon: 'petFollowOrder', target: 'self', ...order,
    description: () => 'Calls your pet back to your side; it stops attacking. In Assist mode it joins in again on your next attack.',
    use: (c) => c.commandPet('follow'),
  },
  {
    id: 'petStayOrder', name: 'Stay (pet)', icon: 'petStayOrder', target: 'self', ...order,
    description: () => 'Your pet holds where it stands. It keeps hitting its target only while it is in reach.',
    use: (c) => c.commandPet('stay'),
  },
];

export const PET_MODE: SettingField = {
  key: 'petMode', name: 'Pet mode', kind: 'choice',
  choices: [
    { value: 'assist', label: 'Assist: attacks what you attack (like a /petattack macro)' },
    { value: 'defensive', label: 'Defensive: attacks on your order or what attacks you (Classic default)' },
    { value: 'passive', label: 'Passive: attacks only on your order' },
  ],
};

export const PET_HELP = 'Your pet runs to the dummy and only hits once it is there. Pet bar: Attack sends it at your target, Follow calls it back, Stay holds it in place. Pet mode (Settings): Assist joins in when you attack; Defensive waits for your order or for something to hit you; Passive only obeys orders.';
