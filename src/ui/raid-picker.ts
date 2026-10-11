// Checkboxes for the raid buffs and dummy debuffs, used on the welcome screen
// and in Settings.
import { RAID_EFFECTS } from '../engine/raid';
import { iconHtml } from './icon';

/** `onChange` gets the chosen ids, in the list's order. */
export function raidPicker(chosen: string[], onChange: (ids: string[]) => void): HTMLElement {
  const box = document.createElement('div');
  box.className = 'raid-picker';
  const set = new Set(chosen);
  for (const side of ['buff', 'debuff'] as const) {
    const title = document.createElement('h4');
    title.textContent = side === 'buff' ? 'Buffs on you' : 'Debuffs on the dummy';
    const grid = document.createElement('div');
    grid.className = 'raid-grid';
    for (const e of RAID_EFFECTS.filter((x) => x.side === side)) {
      const label = document.createElement('label');
      label.className = 'raid-option';
      label.innerHTML = `<span class="mini-icon">${iconHtml(e.icon)}</span><span class="raid-name">${e.name}<small>${e.from}</small></span>`;
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = set.has(e.id);
      input.addEventListener('change', () => {
        if (input.checked) set.add(e.id); else set.delete(e.id);
        onChange(RAID_EFFECTS.filter((x) => set.has(x.id)).map((x) => x.id));
      });
      label.prepend(input);
      grid.append(label);
    }
    box.append(title, grid);
  }
  return box;
}
