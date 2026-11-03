// Builds, after `vite build`, one static page per spec (dist/<spec>/index.html)
// and dist/sitemap.xml, so search engines find the yard by class and spec:
// "WoW Forever fury warrior rotation" lands on a page that says what the
// rotation is about, lists the builds and opens the yard on it. Everything on
// the pages comes from the specs themselves (their welcome and help texts,
// builds and sources), so the pages follow every update.
//
// Usage: npm run seo (part of npm run build)
import fs from 'node:fs';
import type { Spec } from '../src/engine/types';
import { SPECS } from '../src/specs';
import { CONTROLS } from '../src/specs/common';
import { CLASSES, classKey, pointsPerTree, specTitle } from '../src/ui/talents-data';

const SITE = 'https://argorlant.github.io/forever-practice-yard/';
const OUT = 'dist';
const IMAGE = `${SITE}og-image.jpg`;
const KOFI = 'https://ko-fi.com/argorlant';
const ISSUES = 'https://github.com/Argorlant/forever-practice-yard/issues';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colorOf = (className: string) => CLASSES.find((c) => c.name === className)?.color ?? '#d8b25a';
/** The controls' paragraphs (the shared text, and the warrior's and rogue's own versions of its first lines). */
const CONTROL_STARTS = [...CONTROLS.split(/\n\s*/).map((p) => p.trim().slice(0, 24)), 'You start behind the dummy'];
/** A spec's help as paragraphs, without the controls every spec shares. */
const paragraphs = (text: string) => text.split(/\n\s*/).map((p) => p.trim())
  .filter((p) => p && !CONTROL_STARTS.some((c) => p.startsWith(c)));
/** Cut at a word boundary, for meta descriptions. */
const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, s.lastIndexOf(' ', n - 1))}…`);

function page(spec: Spec): string {
  const title = specTitle(spec);
  const cls = classKey(spec.className);
  const builds = spec.builds ?? [];
  const url = `${SITE}${spec.id}/`;
  const description = clip(`Practise the ${title} rotation for WoW Forever on a training dummy in your browser: ${builds.length} build${builds.length === 1 ? '' : 's'} from the community sims, the priority list as a glow on your action bar, and the talent trees.`, 160);
  const help = paragraphs(spec.help).map((p) => `<p>${esc(p)}</p>`).join('\n      ');
  const buildRows = builds.map((b) => {
    const pts = b.talentString ? pointsPerTree(cls, b.talentString).join('/') : '';
    const play = `../?class=${spec.id}&amp;build=${encodeURIComponent(b.id)}`;
    const plan = `../?planner=${cls}&amp;spec=${spec.id}&amp;build=${encodeURIComponent(b.id)}`;
    return `<li><span><b>${esc(b.name ?? b.label)}</b> ${pts}<small>${esc(b.source ?? '')}</small></span><span class="acts"><a href="${plan}">Talents</a><a class="play" href="${play}">Play</a></span></li>`;
  }).join('\n        ');
  const others = CLASSES.map((c) => {
    const links = SPECS.filter((s) => s.className === c.name)
      .map((s) => (s === spec ? `<b>${esc(specTitle(s))}</b>` : `<a href="../${s.id}/" style="color:${c.color}">${esc(specTitle(s))}</a>`));
    return links.length ? `<li>${links.join(' · ')}</li>` : '';
  }).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} rotation practice · WoW Forever · Forever Rotations</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Forever Rotations">
  <meta property="og:title" content="${esc(title)} rotation practice · WoW Forever">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${IMAGE}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#0b0908">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%2315110e'/%3E%3Cpath d='M18 46 46 18M22 18l24 28' stroke='%23d8b25a' stroke-width='6' stroke-linecap='round'/%3E%3C/svg%3E">
  <style>
    :root { --gold: #d8b25a; --gold-dim: #8a6d33; --ink: #f2e8d2; --muted: #b9ab90; color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; background: radial-gradient(ellipse at top, #2a1f14 0%, #0b0908 70%) fixed, #0b0908; color: var(--ink);
      font: 15px/1.55 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
    main { max-width: 860px; margin: 0 auto; padding: 24px 16px 48px; }
    a { color: var(--gold); }
    .crumb { font-size: 13px; color: var(--muted); }
    h1, h2 { font-family: Georgia, 'Palatino Linotype', serif; color: var(--gold); letter-spacing: .02em; }
    h1 { font-size: clamp(26px, 5vw, 38px); margin: 12px 0 4px; }
    h1 span { color: ${colorOf(spec.className)}; }
    h2 { font-size: 21px; margin: 32px 0 8px; padding-bottom: 6px; border-bottom: 1px solid var(--gold-dim); }
    .sub { color: var(--muted); margin: 0 0 20px; }
    .cta { display: inline-block; margin: 8px 0 4px; padding: 12px 22px; border-radius: 8px; text-decoration: none; font: 600 17px Georgia, serif;
      color: #1a1208; background: linear-gradient(#e9c77a, #b98d3c); border: 1px solid #f0d58f; }
    .cta:hover { filter: brightness(1.08); }
    .builds { list-style: none; padding: 0; margin: 0; }
    .builds li { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 12px; margin-bottom: 8px;
      background: rgba(20, 16, 12, .85); border: 1px solid rgba(138, 109, 51, .5); border-radius: 8px; }
    .builds small { display: block; color: var(--muted); font-size: 12px; }
    .acts a { margin-left: 10px; text-decoration: none; padding: 5px 12px; border: 1px solid var(--gold-dim); border-radius: 6px; font-size: 13px; }
    .acts a.play { color: #1a1208; background: var(--gold); border-color: var(--gold); }
    .others { list-style: none; padding: 0; font-size: 14px; }
    .others li { margin: 4px 0; }
    .note { color: var(--muted); font-size: 13px; border: 1px solid var(--gold-dim); border-radius: 8px; padding: 10px 14px; margin-top: 28px; }
    footer { color: var(--muted); font-size: 12px; text-align: center; margin-top: 32px; }
  </style>
</head>
<body>
  <main>
    <div class="crumb"><a href="../">Forever Rotations</a> › ${esc(spec.className)}</div>
    <h1><span>${esc(title)}</span> rotation practice</h1>
    <p class="sub">WoW Forever, level 60, against a training dummy, in your browser or on a phone. Free.</p>
    <p>${esc(spec.welcome)}</p>
    <a class="cta" href="../?class=${spec.id}">Practise it now ›</a>
    <h2>How the rotation works</h2>
      ${help}
    <h2>Builds</h2>
    <ul class="builds">
        ${buildRows}
    </ul>
    <p class="note"><b>Speculative, built on the sims.</b> The talents, builds, rotations and numbers follow the community sims (<a href="https://www.wowsims.com/forever/">WoWSims Forever</a>,
      our main source, and, for what we have not reviewed against it yet, foreversim and gunba's retired wow-forever-sim) and our reading of the beta, made before WoW Forever's launch, so they may not match the live game. A practice tool for a
      rotation's rhythm: it shows no DPS. Spotted something wrong? <a href="${ISSUES}">Tell us on GitHub</a>.</p>
    <h2>Other classes</h2>
    <ul class="others">${others}</ul>
    <footer>Free and fan-made: <a href="${KOFI}">support it on Ko-fi</a>. Not affiliated with or endorsed by Blizzard Entertainment.</footer>
  </main>
</body>
</html>
`;
}

if (!fs.existsSync(`${OUT}/index.html`)) throw new Error('Run vite build first: dist/index.html is missing');
const today = new Date().toISOString().slice(0, 10);
const urls = [SITE];
for (const spec of SPECS) {
  fs.mkdirSync(`${OUT}/${spec.id}`, { recursive: true });
  fs.writeFileSync(`${OUT}/${spec.id}/index.html`, page(spec));
  urls.push(`${SITE}${spec.id}/`);
}
fs.writeFileSync(`${OUT}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
console.log(`SEO: ${SPECS.length} spec pages and a sitemap with ${urls.length} URLs`);
