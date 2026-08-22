/* Suite 040 — the tracklist (v0.7.5).
   The record is more than its title: formats carry real tracklists,
   open slots take solos and units the player assigns, release week
   turns credits into consequences (ambitions touched, chemistry read,
   sleepers found), and the artist file's staff notes stop repeating. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_040_tracklist');

function ready(seed, n) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, n || 5);
  KP.proposeGroup(state, 'TRAX', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  state.budget = 600;   // the song market (v0.10.5): priced demos still lock
  return { state, g: state.groups[0] };
}
function lock(state, g, format, week) {
  return KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    format, week: week || (state.week + 8),
    alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
}
function release(state, g) {
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return g.results;
}

// ---- the build: every format ships its full run of songs ----
{
  const { state, g } = ready('tk-build');
  t.ok(lock(state, g, 'mini').ok, 'a mini locks');
  const tracks = g.prep.tracks;
  t.eq(tracks.length, 5, 'a mini is five songs');
  t.eq(tracks[0].kind, 'title', 'track 1 is the single');
  t.eq(tracks.filter(x => x.slot).map(x => x.n).join(','), '3', 'one open slot, mid-record');
  t.eq(new Set(tracks.map(x => x.title)).size, 5, 'five different songs, five different names');
  t.ok(tracks.every(x => x.producer), 'every song has a producer');
}
{
  const { state, g } = ready('tk-full');
  t.ok(lock(state, g, 'full').ok, 'a full album locks');
  t.eq(g.prep.tracks.length, 9, 'nine songs deep');
  t.eq(g.prep.tracks.filter(x => x.slot).map(x => x.n).join(','), '3,6', 'two slots on the big record');
}
{
  const { state, g } = ready('tk-single');
  t.ok(lock(state, g, 'single').ok, 'a single locks');
  t.eq(g.prep.tracks.length, 2, 'a single and its b-side');
  t.eq(g.prep.tracks.filter(x => x.slot).length, 0, 'no credit slots — a single rides on its title');
}

// ---- the A&R pass: assignment rules hold ----
{
  const { state, g } = ready('tk-assign');
  lock(state, g, 'full');
  const [m0, m1, m2, m3] = g.members;
  t.ok(!KP.assignTrack(state, g.id, 1, { type: 'solo', memberId: m0 }).ok, 'the title track refuses a credit');
  t.ok(!KP.assignTrack(state, g.id, 2, { type: 'solo', memberId: m0 }).ok, 'a non-slot b-side refuses too');
  const solo = KP.assignTrack(state, g.id, 3, { type: 'solo', memberId: m0 });
  t.ok(solo.ok && /re-cutting the guide vocal/.test(solo.note), 'the solo lands with a staff line');
  t.ok(!KP.assignTrack(state, g.id, 6, { type: 'unit', memberIds: [m0, m1] }).ok,
    'one special credit per member per record — spread the light');
  t.ok(!KP.assignTrack(state, g.id, 6, { type: 'unit', memberIds: [m1] }).ok, 'one member is not a unit');
  t.ok(!KP.assignTrack(state, g.id, 6, { type: 'unit', memberIds: [m1, m2, m3, g.members[4]] }).ok,
    'four of five is basically the group');
  t.ok(KP.assignTrack(state, g.id, 6, { type: 'unit', memberIds: [m1, m2] }).ok, 'a duo unit sets');
  t.ok(KP.assignTrack(state, g.id, 3, { type: 'group' }).ok, 'and a credit can go back to the group');
  t.eq(g.prep.tracks.find(x => x.n === 3).credit, null, 'cleanly');
}

// ---- release week: the solo becomes a career event ----
{
  const { state, g } = ready('tk-solo');
  const p = state.people[g.members[0]];
  p.archetypes = [];
  p.talents.charisma.cur = 72;         // ambitionOf → solo
  lock(state, g, 'mini');
  KP.assignTrack(state, g.id, 3, { type: 'solo', memberId: p.id });
  const moraleBefore = p.morale;
  release(state, g);
  t.ok(state.inbox.some(n => n.ind === 'soloTrack' && n.personId === p.id), 'the desk letter names her solo');
  t.ok(p.flags.ambitionMet, 'a solo on record IS the solo she wanted — the ambition door opens');
  t.ok(p.hype > 0, 'her name carries hype into the next cycle (' + p.hype + ')');
  t.ok(p.history.some(h => /First solo on record/.test(h.text)), 'the file remembers it forever');
  t.ok(g.releases[0].tracklist.some(x => x.credit && x.credit.type === 'solo'), 'the discography keeps the credit');
  const credits = KP.trackCreditsOf(state, p.id);
  t.eq(credits.length, 1, 'trackCreditsOf finds it');
  t.eq(credits[0].type, 'solo', 'as a solo');
  // the timeline reacts through the registry
  const reg = KP.feedReactionFor('soloTrack');
  t.ok(reg, 'soloTrack renders through the kernel registry');
  const post = reg(state, { personId: p.id, trackTitle: credits[0].trackTitle }, KP.rngFor(state));
  t.ok(post && post.persona && post.text.length > 20, 'and the fans have words');
  t.ok(moraleBefore <= p.morale + 20, 'sanity: morale moved by the release machinery, not broken');
}

// ---- the unit reads real chemistry ----
{
  const { state, g } = ready('tk-unit-close');
  const a = state.people[g.members[1]], b = state.people[g.members[2]];
  state.relationships[KP.pairKey(a, b)] = { score: 80, state: 'close' };
  lock(state, g, 'mini');
  KP.assignTrack(state, g.id, 3, { type: 'unit', memberIds: [a.id, b.id] });
  release(state, g);
  const note = state.inbox.find(n => n.ind === 'unitTrack');
  t.ok(note && note.close, 'a close pair’s unit reads as chemistry');
  t.ok(/own frequency/.test(note.text), 'and the note says so');
  t.ok(a.history.some(h => /Unit track with/.test(h.text)), 'both files remember');
}
{
  const { state, g } = ready('tk-unit-tense');
  const a = state.people[g.members[1]], b = state.people[g.members[2]];
  state.relationships[KP.pairKey(a, b)] = { score: -60, state: 'conflict' };
  a.personality.professionalism = 30; b.personality.professionalism = 30;   // no quiet repair
  lock(state, g, 'mini', state.week + 6);
  KP.assignTrack(state, g.id, 3, { type: 'unit', memberIds: [a.id, b.id] });
  release(state, g);
  const note = state.inbox.find(n => n.ind === 'unitTrack');
  t.ok(note && note.strained, 'a strained pairing cannot hide from the fans');
  t.ok(/Professional on the record/.test(note.text), 'the snark lands on the scheduling, not the people');
}

// ---- the sleeper: a good record gets dug into ----
{
  const T = KP.C.TRACKS;
  const oldChance = T.sleeperChance, oldMin = T.sleeperReceptionMin;
  T.sleeperChance = 1; T.sleeperReceptionMin = 1;   // mechanism test
  const { state, g } = ready('tk-sleeper');
  lock(state, g, 'mini');
  const popBefore = 0;
  release(state, g);
  T.sleeperChance = oldChance; T.sleeperReceptionMin = oldMin;
  t.ok(g.releases[0].sleeperTitle, 'a b-side gets pulled out of the record');
  const bsides = g.releases[0].tracklist.filter(x => x.kind === 'bside');
  t.eq(g.releases[0].sleeperTitle, bsides.slice().sort((x, y) => y.hook - x.hook)[0].title,
    'and it is the best song that was not the single — like life');
  t.ok(state.inbox.some(n => n.ind === 'bsideSleeper'), 'the truthers reach the desk');
  t.ok(g.popularity > popBefore, 'the number moves a little');
}

// ---- the file stops repeating (v0.7.5 variety pass) ----
{
  t.ok(KP.C.LIFE.FACTS.length >= 30, 'the facts pool tripled (' + KP.C.LIFE.FACTS.length + ')');
  t.eq(new Set(KP.C.LIFE.FACTS).size, KP.C.LIFE.FACTS.length, 'no duplicate facts');
  Object.keys(KP.C.LIFE.AMBITIONS).forEach(k => {
    t.ok(KP.C.LIFE.AMBITIONS[k].lines.length >= 3, k + ' has ' + KP.C.LIFE.AMBITIONS[k].lines.length + ' phrasings');
  });
  const state = KP.newGame('tk-facts', null, { legacy: false });
  const p = state.people[state.roster[0]];
  const f1 = KP.factsOf(state, p);
  t.eq(KP.factsOf(state, p).join('|'), f1.join('|'), 'facts stay stable — lore, not slot pulls');
}

// ---- migration: the A&R memo lands ----
{
  const { state, g } = ready('tk-mig');
  lock(state, g, 'single');
  release(state, g);
  state.version = '0.7.4';
  const m = KP.deserialize(KP.serialize(state));
  t.ok(m.inbox.some(x => /records now ship with FULL tracklists/.test(x.text)), 'the desk explains the restructure');
  t.ok(m.groups[0].releases.length, 'old releases survive untouched');
}

// ---- determinism: credits pending and all, the record forks clean ----
{
  const mk = () => {
    const { state, g } = ready('tk-fork');
    lock(state, g, 'full');
    KP.assignTrack(state, g.id, 3, { type: 'solo', memberId: g.members[0] });
    KP.assignTrack(state, g.id, 6, { type: 'unit', memberIds: [g.members[1], g.members[2]] });
    return state;
  };
  const a = mk();
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 25; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the tracklist forks clean');
}

t.finish();
