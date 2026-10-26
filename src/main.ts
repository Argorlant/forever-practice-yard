// Entry point. Without ?class= the first screen picks a class and a build;
// with it, the practice yard loads (./yard.ts); ?planner= opens the talent
// planner (./ui/planner.ts). Each part is its own chunk.
import './style.css';

const app = document.getElementById('app')!;
const params = new URLSearchParams(location.search);
if (params.has('class')) {
  void import('./yard');
} else if (params.has('planner')) {
  void import('./ui/planner').then((m) => m.showPlanner(app));
} else {
  void import('./ui/picker').then((m) => m.showPicker(app));
}
