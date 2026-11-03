// What the yard is and is not, said the same way on every screen: a practice
// tool built on the community sims, made before WoW Forever's launch.
export const FEEDBACK_URL = 'https://github.com/Argorlant/forever-practice-yard/issues';
/** Voluntary support: the tool stays free and complete either way. */
export const SUPPORT_URL = 'https://ko-fi.com/argorlant';
export const SUPPORT_HTML = `Free and fan-made. If it helped your rotation, you can <a href="${SUPPORT_URL}" target="_blank" rel="noopener">buy me a coffee on Ko-fi</a> ☕`;

/** Where the idea came from: the feral practice by Elspeth, and Neteyes's hunter practice. */
export const INSPIRATION_HTML = `Inspired by the practice tools at <a href="https://www.miao.tips/practice" target="_blank" rel="noopener">miao.tips/practice</a>:
  the feral practice by Elspeth (elspethbado), where the idea for this site came from, and the hunter practice by Neteyes.`;

const feedback = `<a href="${FEEDBACK_URL}" target="_blank" rel="noopener">tell us on GitHub</a>`;

/** The full notice, for the first screen and Settings. */
export const DISCLAIMER_HTML = `
  <b>Speculative, built on the sims.</b> This site was made before WoW Forever's launch on 4 November 2026. The talents,
  builds, rotations and numbers here follow the community sims (<a href="https://www.wowsims.com/forever/" target="_blank" rel="noopener">WoWSims Forever</a>,
  our main source, and, for what we have not reviewed against it yet, foreversim and gunba's retired wow-forever-sim) and our own reading of
  the beta, so they may not match the live game, and classes can still change as players reach level 60.
  Use it as a practice tool: learn a rotation's rhythm and get a feel for how a class might play at max level.
  <b>That's why it shows no DPS:</b> the damage in the floating combat text is only a rough guide.
  Spotted something wrong? Feedback is very welcome: ${feedback}.`;

/** The short version, for each class's welcome screen. */
export const DISCLAIMER_SHORT_HTML = `
  A practice tool, not a simulator: it follows the WoW Forever sims, made before launch, so builds and numbers may not match
  the live game. Practise the rhythm: there's no DPS meter, and the damage you see is only a rough guide. Found a mistake? ${feedback}.`;
