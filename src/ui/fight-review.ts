// The review at the end of an encounter: how long it took, what hit you and
// how often, with a tip for each mistake. No damage numbers, as everywhere in
// the yard.
import type { Review } from '../encounters/onyxia';

const time = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function showFightReview(parent: HTMLElement, r: Review, again: () => void): void {
  const rows: [string, string, string | null][] = [
    ['Flame Breath', `${r.flameBreath}×`, r.flameBreath ? 'Stand at her sides: the breath reaches far in front of her.' : null],
    ['Tail Sweep', `${r.tailSweep}×`, r.tailSweep ? 'Not behind her either: the tail throws you aside.' : null],
    ['Deep Breath', `${r.deepBreath} hits`, r.deepBreath ? 'When she takes a deep breath, run out of her line across the room (the red band).' : null],
    ['Fireballs', `${r.fireball}×`, null],
    ['Lava', `${r.lava}×`, r.lava ? 'After the fear, step off the glowing cracks.' : null],
    ['Feared', `${r.fears}×`, r.fears ? 'Berserker Rage, Fear Ward or Will of the Forsaken keep you from fleeing.' : null],
    ['Loose whelps you killed', `${r.whelpsAtYouKilled} of ${r.whelpsAtYou}`,
      r.whelpsAtYou - r.whelpsAtYouKilled >= 2 || r.whelpBites > 25 ? 'The whelp tanks hold most of them; kill the ones that come at you quickly: they bite while they live.' : null],
  ];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const title = r.won ? 'Onyxia is defeated' : `Wiped in phase ${r.phase}`;
  overlay.innerHTML = `<div class="modal fight-review"><div class="modal-body">
    <h2>${title}</h2>
    <p class="note">${r.won ? 'Killed' : 'Fought'} in ${time(r.time)}.</p>
    <table class="chances">${rows.map(([k, v, tip]) => `<tr><td>${k}${tip ? `<div class="tip">${tip}</div>` : ''}</td><td>${v}</td></tr>`).join('')}</table>
    <div class="presets"><button class="hud-btn again">Try again</button><button class="hud-btn small close">Close</button></div>
  </div></div>`;
  parent.append(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('.again')!.addEventListener('click', () => { close(); again(); });
  overlay.querySelector('.close')!.addEventListener('click', close);
}
