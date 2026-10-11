// Per-browser preferences (keybinds, stats, options). Every access is guarded:
// storage can be missing in private windows or previews.
export function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

/** Readable label for a KeyboardEvent.code, with modifiers. */
export function keyLabel(binding: string): string {
  if (!binding) return '';
  return binding.split('+').map((part) => {
    if (part.startsWith('Key')) return part.slice(3);
    if (part.startsWith('Digit')) return part.slice(5);
    if (part.startsWith('Numpad')) return 'N' + part.slice(6);
    const named: Record<string, string> = {
      Shift: 'S', Control: 'C', Alt: 'A', Space: 'Spc', Backquote: '`', Minus: '-', Equal: '=',
      BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.',
      Slash: '/', Backslash: '\\', CapsLock: 'Caps', Tab: 'Tab', Escape: 'Esc',
      ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', MouseMiddle: 'M3',
    };
    return named[part] ?? part.replace(/^F(\d+)$/, 'F$1');
  }).join(part2sep(binding));
}

const part2sep = (b: string) => (b.includes('+') ? '-' : '');

/** The binding string for a keydown: modifiers first, then the code. */
export function bindingFor(e: KeyboardEvent): string | null {
  if (['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'].includes(e.code)) {
    return null;
  }
  const mods = [e.shiftKey && 'Shift', e.ctrlKey && 'Control', e.altKey && 'Alt'].filter(Boolean);
  return [...mods, e.code].join('+');
}
