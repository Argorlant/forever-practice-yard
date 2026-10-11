// Icons: the real WoW ability icons (public/icons, © Blizzard Entertainment),
// so players see the same buttons as in the game. Anything without a WoW
// icon (the dummy portrait) falls back to a game-icons.net drawing.
import { ICONS } from './icons.gen';
import WOW_ICONS from './wow-icons.json';

const wow = WOW_ICONS as Record<string, string>;
const BASE = `${import.meta.env.BASE_URL}icons/`;

let uid = 0;

export function iconHtml(key: string): string {
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
