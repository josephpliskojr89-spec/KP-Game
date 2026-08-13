/* Suite 057 — the clip + the catalog (v0.9.15). Virality gets its
   provenance: every viral moment names the stage it came from, on the
   file and in the narrative, forever. And the catalog wakes up: old
   clips resurface, sleeper B-sides reverse-chart years after their
   era — for living groups and disbanded ones alike. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_057_catalog');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'ARCHIVE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  return { state, g };
}

// ---- provenance: the viral moment knows its stage ----
{
  const { state, g } = debuted('cat-prov');
  const p = state.people[g.members[0]];
  const q0 = state.people[g.members[1]];
  // the debut weeks can mint virals of their own (stream-dependent) —
  // wipe the slate so this block tests provenance, not the dice
  [p, q0].forEach(x => { x.viralCount = 0; delete x.lastViral; });
  state.memory = (state.memory || []).filter(n =>
    !(String(n.subjectId) === String(p.id) || String(n.subjectId) === String(q0.id)));
  const note1 = KP.recordViral(state, p, { kind: 'encore', label: 'the Countdown encore' });
  t.eq(p.lastViral.label, 'the Countdown encore', 'the file stamps the source');
  t.ok(p.history.some(h => /Went viral: the Countdown encore/.test(h.text)),
    'and keeps it in the history forever');
  const note2 = KP.recordViral(state, p, { kind: 'fairy', label: 'the Pop Wave ending fairy' });
  t.ok(note2, 'the second moment forms the narrative');
  const nar = KP.getNarrative(state, 'fancamStar', 'idol', p.id);
  t.eq(nar.meta.source, 'the Pop Wave ending fairy', 'the narrative carries the provenance');
  t.ok(KP.narrativeText(state, nar).includes('the Pop Wave ending fairy'),
    'and the coverage names the stage: ' + KP.narrativeText(state, nar));
  // a sourceless call still works (compat) — it just has no story to tell
  const q = q0;
  KP.recordViral(state, q);
  t.ok(!q.lastViral, 'no source, no stamp — never undefined garbage');
}

// ---- the resurfaced clip: the demoted random roll has a name now ----
{
  const { state, g } = debuted('cat-resurface');
  const C = KP.C.CATALOG;
  g.debutWeek = state.week - C.resurfaceMinWeeks - 10;   // old enough to be "found"
  const old = C.resurfaceChance;
  C.resurfaceChance = 1;
  KP.advanceWeek(state);
  C.resurfaceChance = old;
  t.eq(state.catalogLedger.resurfaced, 1, 'the archive napped, then woke');
  const note = state.inbox.find(n => n.ind === 'clipResurfaced');
  t.ok(note, 'the resurfacing gets told');
  t.ok(/-year-old/.test(note.text), 'with its age on it');
  const p = state.people[note.personId];
  // the history, not lastViral: a same-week encore/fairy can legitimately
  // go viral AFTER the resurfaced clip and take the "most recent" slot
  t.ok(p.history.some(h => /Went viral: .*resurfaced/.test(h.text)),
    'and the file knows it was an old stage, not a new one');
  t.ok(KP.feedReactionFor('clipResurfaced') && KP.feedReactionFor('catalogRevival'),
    'both new inds answer through the registry');
}

// ---- the reverse chart run: a living group's sleeper catches fire ----
{
  const { state, g } = debuted('cat-revive');
  const C = KP.C.CATALOG;
  const r = g.releases[0];
  r.week = state.week - C.minAgeWeeks - 5;   // a year-old record
  r.reception = 62;
  r.sleeperTitle = 'Glass River';
  const pop0 = g.popularity;
  const old = C.revivalChance;
  C.revivalChance = 1;
  KP.advanceWeek(state);
  C.revivalChance = old;
  t.ok(r.revivedWeek, 'the track caught fire, once — the stamp prevents reruns');
  t.eq(state.catalogLedger.revivals, 1, 'ledgered');
  const entry = state.chart.entries.find(e => e.catalog);
  t.ok(entry, 'it is ON the chart');
  t.eq(entry.title, 'Glass River', 'the sleeper got the nod over the title track');
  t.ok(g.popularity > pop0, 'the group feels its own history');
  t.ok(KP.getNarrative(state, 'catalogRevival', 'group', g.id), 'the world writes it down');
  const note = state.inbox.find(n => n.ind === 'catalogRevival');
  t.ok(note && /CHARTING/.test(note.text), 'and says it out loud');
  t.ok(note && /royalties came in at \d+/.test(note.text),
    'the royalties arrive — an old song charting is income, not just applause');
}

// ---- the clip→song pipeline: a hot clip opens the door ----
{
  const { state, g } = debuted('cat-pipeline');
  const C = KP.C.CATALOG;
  const r = g.releases[0];
  r.week = state.week - C.minAgeWeeks - 5;
  r.reception = 60;
  state.catalogLedger = { resurfaced: 1, revivals: 0,
    lastClip: { groupId: g.id, week: state.week - 1 } };
  // pin the base chance to zero: ONLY the clip boost can fire the revival
  const oldRev = C.revivalChance, oldBoost = C.revivalClipBoost;
  C.revivalChance = 0; C.revivalClipBoost = 1;
  KP.advanceWeek(state);
  C.revivalChance = oldRev; C.revivalClipBoost = oldBoost;
  t.ok(r.revivedWeek, 'the resurfaced clip lit the fuse — the song followed the clip');
  t.ok(state.inbox.some(n => n.ind === 'catalogRevival' && /lit the fuse/.test(n.text)),
    'and the story credits the pipeline');
}

// ---- the disbanded group: the song outlives the act ----
{
  const { state, g } = debuted('cat-outlive');
  const C = KP.C.CATALOG;
  const r = g.releases[0];
  r.week = state.week - C.minAgeWeeks - 5;
  r.reception = 65;
  // close the chapter the audited way
  g.members.slice().forEach(id => KP.departIdol(state, id, 'warm'));
  t.ok(g.retiredWeek, 'fixture: the group is gone');
  const old = C.revivalChance;
  C.revivalChance = 1;
  KP.advanceWeek(state);
  C.revivalChance = old;
  t.ok(r.revivedWeek, 'the catalog does not check the roster');
  const note = state.inbox.find(n => n.ind === 'catalogRevival');
  t.ok(note && /no longer exists|disbanded/.test(note.text),
    'the story knows the group is gone — and tells it that way');
  t.ok(note && /still pay/.test(note.text),
    'and the masters still pay the label that owns them');
  t.eq(KP.validateState(state).length, 0, 'no integrity cost for reviving the dead');
}

// ---- determinism ----
{
  const { state: a } = debuted('cat-fork');
  a.groups[0].releases[0].week = a.week - KP.C.CATALOG.minAgeWeeks - 5;
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 40; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'archives, clips, and revivals fork clean');
}

t.finish();
