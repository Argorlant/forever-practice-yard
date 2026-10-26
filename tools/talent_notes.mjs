// Builds src/ui/talent-notes.json: what WoW Forever changed in each talent,
// for the talent planner's tooltips. Per class, the talents new in Forever
// (the research sheets' newInForever and each spec's NEW_IN_FOREVER set),
// the research sheets' note on how a talent differs from Classic, its Classic
// name when it was renamed, and the Classic talents Forever took out.
//
// Usage: node tools/talent_notes.mjs
import fs from 'node:fs';

const layout = JSON.parse(fs.readFileSync('src/ui/talent-layout.json', 'utf8'));
const camel = (s) => s.replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean)
  .map((w, i) => (i ? w[0].toUpperCase() : w[0].toLowerCase()) + w.slice(1)).join('');

/** A spec's NEW_IN_FOREVER set, read from its talents file. */
function specNew(cls) {
  const src = ['talents.gen.ts', 'talents.ts'].map((f) => `src/specs/${cls}/${f}`).filter((f) => fs.existsSync(f))
    .map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  const m = src.match(/NEW_IN_FOREVER = new Set<TalentKey>\(\[([^\]]*)\]/);
  return new Set(m ? [...m[1].matchAll(/'(\w+)'/g)].map((x) => x[1]) : []);
}

/** A research note made fit for a tooltip: no issue numbers, no "moved to row N" that the current trees contradict. */
function clean(note, row) {
  if (!note || /^Unchanged\b/i.test(note)) return null;
  const sentences = note.replace(/\s*\(#\d+\)/g, '').split(/(?<=\.)\s+/)
    .filter((s) => { const m = s.match(/^Moved to row (\d)/i); return !m || Number(m[1]) === row + 1; });
  return sentences.join(' ').trim() || null;
}

const out = {};
for (const cls of Object.keys(layout)) {
  const file = `research/${cls}_forever.json`;
  const j = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { talents: {} };
  const research = new Map();
  for (const tree of Object.values(j.talents ?? {})) {
    if (!Array.isArray(tree)) continue;
    for (const t of tree) if (t?.name) research.set(t.fieldName ?? camel(t.name), t);
  }
  const fresh = specNew(cls);
  const talents = {};
  for (const tree of layout[cls]) {
    for (const t of tree.talents) {
      const r = research.get(t.key);
      const note = {};
      if (fresh.has(t.key) || r?.newInForever) note.new = true;
      const change = clean(r?.foreverChange, t.row);
      if (change) note.change = change;
      if (r?.renamedFrom && !(change ?? '').includes(r.renamedFrom)) note.was = r.renamedFrom;
      if (Object.keys(note).length) talents[t.key] = note;
    }
  }
  const removed = j.talents?.removedInForever;
  // Older sheets can list a talent the current trees have again: those are left out.
  const names = layout[cls].flatMap((tree) => tree.talents.map((t) => t.name.toLowerCase()));
  const list = (Array.isArray(removed) ? removed : removed?.value ?? [])
    .filter((s) => typeof s === 'string' && !/\bremains?\b/.test(s) && !names.some((n) => s.toLowerCase().startsWith(n)));
  out[cls] = { talents, removed: list };
}
fs.writeFileSync('src/ui/talent-notes.json', `${JSON.stringify(out, null, 1)}\n`);
for (const [cls, v] of Object.entries(out)) {
  const n = Object.values(v.talents);
  console.log(`${cls}: ${n.filter((x) => x.new).length} new, ${n.filter((x) => x.change).length} notes, ${v.removed.length} removed`);
}
