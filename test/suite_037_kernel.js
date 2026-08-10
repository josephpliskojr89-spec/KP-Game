/* Suite 037 — the kernel (v0.7.2).
   The architectural foundation's contracts: render purity (rng never
   draws outside tick/actions), the one-lifecycle note bus with
   priorities, the feed-reaction registry, weekly-pipeline extension
   without editing the driver, and the state validator. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_037_kernel');

function formed(seed) {
  const state = KP.newGame(seed);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'KERNLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  return { state, g: state.groups[0] };
}

// ---- render purity: demos exist without any UI touching the engine ----
{
  const { state, g } = formed('kn-purity');
  t.ok(g.demos && g.demos.length === KP.C.SONG.demoCount,
    'the pitch meeting happens at formation — render never has to draw');
  // after a release clears them, the weekly tick restocks the desk
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  t.ok(!g.demos, 'fixture: the release consumed the demos');
  while (state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) KP.advanceWeek(state);
  KP.advanceWeek(state);
  t.ok(g.demos && g.demos.length, 'the tick restocks the desk when the calendar reopens');
  // a direction change clears them; the next tick re-tools
  KP.setGroupConcept(state, g.id, 'dark');
  t.ok(!g.demos, 'a new brief clears the desk');
  KP.advanceWeek(state);
  t.ok(g.demos && g.demos.some(d => d.toBrief), 'and the re-tooled pitches follow it');
}

// ---- the note bus: one lifecycle, validated, priority-aware ----
{
  const { state } = formed('kn-notes');
  const before = state.inbox.length;
  const n = KP.note(state, { kind: 'company', text: 'A stamped note.' });
  t.ok(n.id && n.week === state.week && state.inbox[0] === n, 'KP.note stamps and delivers');
  t.eq(state.inbox.length, before + 1, 'exactly once');
  let threw = false;
  try { KP.note(state, { kind: 'company' }); } catch (e) { threw = true; }
  t.ok(threw, 'a textless note throws instead of crashing the feed later');
  // trim: highs always survive, flavor goes first
  const notes = [
    { kind: 'a', text: '1', priority: 'flavor' },
    { kind: 'b', text: '2' },
    { kind: 'c', text: '3', priority: 'high' },
    { kind: 'd', text: '4' },
    { kind: 'e', text: '5', urgent: true },
  ];
  const kept = KP.trimWeekNotes(notes, 2);
  t.ok(kept.some(x => x.text === '3') && kept.some(x => x.text === '5'), 'high and urgent always survive');
  t.ok(kept.filter(x => !['3', '5'].includes(x.text)).length === 2, 'the budget covers the trimmables');
  t.ok(!kept.some(x => x.text === '1'), 'flavor goes first when the week is loud');
}

// ---- the feed-reaction registry: extension without editing the chain ----
{
  KP.onFeedEvent('kernelTestEvent', (state, n) => ({ persona: 'press', text: 'registry post about ' + n.subject }));
  let threw = false;
  try { KP.onFeedEvent('kernelTestEvent', () => null); } catch (e) { threw = true; }
  t.ok(threw, 'duplicate registration throws at load, not silently overrides');
  const { state } = formed('kn-feed');
  const rng = KP.rngFor(state);
  KP.feedWeek(state, rng, [{ kind: 'x', ind: 'kernelTestEvent', subject: 'the kernel', text: 'seed note' }]);
  t.ok(state.feed.some(p => /registry post about the kernel/.test(p.text)),
    'a registered reaction reaches the feed without touching the frozen chain');
}

// ---- pipeline extension: a system inserts a phase without editing sim ----
{
  let ran = 0, sawWeek = 0;
  KP.registerWeekly('kernelTestPhase', 105, (state) => { ran++; sawWeek = state.week; });
  const { state } = formed('kn-phase');
  KP.advanceWeek(state);
  t.ok(ran >= 1, 'a registered phase runs in the weekly pipeline');
  t.eq(sawWeek, state.week, 'with the advanced week in hand');
}

// ---- the validator: sound worlds pass, corrupted ones are named ----
{
  const { state, g } = formed('kn-validate');
  t.eq(KP.validateState(state).length, 0, 'a fresh world is structurally sound');
  const p = state.people[g.members[0]];
  p.morale = NaN;
  state.roster.push('pGHOST');
  const v = KP.validateState(state);
  t.ok(v.some(x => /vital NaN/.test(x)), 'NaN vitals are named');
  t.ok(v.some(x => /ghost/.test(x)), 'ghost references are named');
}

// ---- determinism: the pipelined world forks clean ----
{
  const { state, g } = formed('kn-fork');
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  const b = KP.deserialize(KP.serialize(state));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(state); KP.advanceWeek(b); }
  t.eq(KP.serialize(state), KP.serialize(b), 'the pipeline preserves the determinism law');
}

t.finish();
