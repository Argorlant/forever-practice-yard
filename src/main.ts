// Entry point. Without ?class= the first screen picks a class and a build;
// with it, the practice yard loads (./yard.ts). Each part is its own chunk.
import './style.css';

const app = document.getElementById('app')!;
if (new URLSearchParams(location.search).has('class')) {
  void import('./yard');
} else {
  void import('./ui/picker').then((m) => m.showPicker(app));
}
