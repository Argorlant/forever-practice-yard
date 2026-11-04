// Icons: the real WoW ability icons (public/icons, © Blizzard Entertainment),
// so players see the same buttons as in the game. Anything without a WoW
// icon (the dummy portrait) falls back to a game-icons.net drawing.
import { ICONS } from './icons.gen';
import WOW_ICONS from './wow-icons.json';

const wow = WOW_ICONS as Record<string, string>;
const BASE = `${import.meta.env.BASE_URL}icons/`;
/** The rest of the spellbook's icons are not in the site: the browser loads them from Wowhead's image server. */
const REMOTE = 'https://wow.zamimg.com/images/wow/icons/large/';
/** A talent's icon file, hosted or (`cdn:name`) on the image server. */
export const talentIconSrc = (name: string) => (name.startsWith('cdn:') ? `${REMOTE}${name.slice(4)}.jpg` : `${BASE}${name}.jpg`);

let uid = 0;

export function iconHtml(key: string): string {
  if (key.startsWith('local:')) return `<img class="wow-icon" src="${BASE}${key.slice(6)}.jpg" alt="" draggable="false">`;
  if (key.startsWith('cdn:')) return `<img class="wow-icon" src="${REMOTE}${key.slice(4)}.jpg" alt="" draggable="false" referrerpolicy="no-referrer" onerror="this.remove()">`;
  const name = wow[key];
  if (name) return `<img class="wow-icon" src="${BASE}${name}.jpg" alt="" draggable="false">`;
  const icon = ICONS[key] ?? ICONS.dummy;
  const id = `ig${uid++}`;
  return `<svg viewBox="0 0 512 512" aria-hidden="true">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stop-color="#7a6040"/><stop offset="1" stop-color="#2c2214"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" fill="url(#${id})"/>
    <path d="${icon.d}" fill="#f1e4c3" transform="translate(56 56) scale(0.78)"/>
  </svg>`;
}
