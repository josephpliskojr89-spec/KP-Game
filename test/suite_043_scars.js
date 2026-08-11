/* Suite 043 — standing & scars (v0.8.3).
   Wounds get shadows: a boiled storm marks her for weeks (mood word,
   bubble tone) and ends in a recovery scene. Standing stops being
   invisible: it reads in the file and gates apology sincerity, the
   leader's pull, and how she opens your door. And debut anniversaries
   finally exist, because they always should have. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_043_scars');

function debuted(seed) {
  const state = KP.newGame(seed);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'SCARS', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  state.nextMeetingWeek = 900;
  state.doorQuietUntil = 900;
  (state.scenes || []).length = 0;
  return { state, g };
}
function boilOn(state, g, p) {
  state.discourses = state.discourses || [];
  state.discourses.push({ id: 'dS' + state.week, kind: 'gaffe', subjectType: 'idol',
    subjectId: p.id, groupId: g.id, week: state.week, heat: 95, negative: true,
    status: 'live', responded: false });
  KP.advanceWeek(state);
}

// ---- the scar: a boiled storm leaves a shadow ----
{
  const { state, g } = debuted('scar-shadow');
  const p = state.people[g.members[0]];
  boilOn(state, g, p);
  t.eq(p.flags.scar, KP.C.SCAR.weeks, 'the boil marks her for ' + KP.C.SCAR.weeks + ' weeks');
  t.eq(KP.moodOf(p), 'carrying it', 'and the mood word says so');
  // the bubble goes quiet
  let post = null;
  for (let w = 0; w < 15 && !post; w++) {
    post = KP.bubblePosts(state).find(x => /photo of the sky/.test(x.text));
    state.week++;
  }
  state.week -= 15;
  t.ok(post, 'her bubble is two messages and a photo of the sky');
  t.ok(/take your time/.test(post.text), 'and the fans reply the only right thing');
}

// ---- the recovery: the shadow lifts, the tone is your call ----
{
  const { state, g } = debuted('scar-recover');
  const p = state.people[g.members[0]];
  boilOn(state, g, p);
  let sc = null;
  for (let w = 0; w < KP.C.SCAR.weeks + 2 && !sc; w++) {
    KP.advanceWeek(state);
    sc = (state.scenes || []).find(x => x.kind === 'scarRecovery');
  }
  t.ok(sc && sc.personId === p.id, 'the shadow lifts into a scene');
  t.ok(state.inbox.some(n => /laughed at practice today like nobody was filming/.test(n.text)),
    'announced by the first real laugh');
  const moraleAt = p.morale;
  const r = KP.resolveScene(state, sc.id, 'loud');
  t.ok(r.ok && /we never went anywhere/.test(r.toast), 'the loud welcome says the quiet part loudly');
  t.eq(p.morale, KP.clamp(moraleAt + KP.C.SCAR.recoveryMorale, 0, 100), 'and it lands');
  t.ok((p.directed || []).some(d => d.kind === 'welcomedBack'), 'the ledger remembers who threw the welcome');
  t.ok(KP.feedReactionFor('scarBack'), 'the loud return echoes through the registry');
}

// ---- the quiet path and the ignored path ----
{
  const { state, g } = debuted('scar-quiet');
  const p = state.people[g.members[1]];
  boilOn(state, g, p);
  let sc = null;
  for (let w = 0; w < KP.C.SCAR.weeks + 2 && !sc; w++) {
    KP.advanceWeek(state);
    sc = (state.scenes || []).find(x => x.kind === 'scarRecovery');
  }
  t.ok(sc, 'fixture: the scene');
  const r = KP.resolveScene(state, sc.id, 'quiet');
  t.ok(r.ok && /her own pace/.test(r.toast), 'quiet is a real answer too');

  const { state: s2, g: g2 } = debuted('scar-ignored');
  const p2 = s2.people[g2.members[0]];
  boilOn(s2, g2, p2);
  let sc2 = null;
  for (let w = 0; w < KP.C.SCAR.weeks + 2 && !sc2; w++) {
    KP.advanceWeek(s2);
    sc2 = (s2.scenes || []).find(x => x.kind === 'scarRecovery');
  }
  t.ok(sc2, 'fixture: the second scene');
  for (let w = 0; w < 3; w++) KP.advanceWeek(s2);
  t.ok(!(s2.scenes || []).some(x => x.kind === 'scarRecovery'), 'unanswered, it expires');
  t.ok(s2.inbox.some(n => /time doing what time does/.test(n.text)), 'and time does what time does — with a little guilt on the record');
}

// ---- sincerity: standing decides whether the apology READS ----
{
  const D = KP.C.DISCOURSE, S = KP.C.SCAR;
  const oldGate = S.sincerityGate;
  S.sincerityGate = 0.5;   // mechanism test: make the gate the whole story
  const run = (directedW) => {
    let successes = 0;
    for (let i = 0; i < 10; i++) {
      const { state, g } = debuted('scar-sinc-' + directedW + '-' + i);
      const p = state.people[g.members[0]];
      p.directed = [{ week: state.week, kind: 'test', w: directedW }];
      state.discourses = [{ id: 'dQ', kind: 'gaffe', subjectType: 'idol', subjectId: p.id,
        groupId: g.id, week: state.week, heat: 40, negative: true, status: 'live', responded: false }];
      const r = KP.respondDiscourse(state, 'dQ', 'statement');
      if (r.ok && r.outcome === 'success') successes++;
    }
    return successes;
  };
  const trusted = run(10), estranged = run(-10);
  S.sincerityGate = oldGate;
  t.ok(trusted >= 8, 'a girl who trusts the office sells the statement (' + trusted + '/10)');
  t.ok(estranged <= 3, 'one counting the days cannot (' + estranged + '/10)');
  t.ok(trusted - estranged >= 5, 'the gap IS the standing (' + trusted + ' vs ' + estranged + ')');
}

// ---- the leader's pull: standing eases the room through promo ----
{
  const mk = (leaderDirected) => {
    const { state, g } = debuted('scar-lead');
    const leader = state.people[g.roles.leader];
    leader.personality.leadership = 70;
    leader.directed = leaderDirected;
    g.rollout = [['radio', 'livestream'], ['radio'], ['radio'], ['rest']];
    g.lastReleaseWeek = state.week;
    g.promoUntil = state.week + 4;
    g.members.forEach(id => { state.people[id].fatigue = 50; });
    KP.rolloutWeek(state, g, KP.rngFor(state));
    const other = g.members.find(id => id !== leader.id);
    return state.people[other].fatigue;
  };
  const carried = mk([{ week: 0, kind: 'test', w: 10 }]);
  const alone = mk([]);
  t.ok(carried < alone, 'a trusted leader absorbs grind for the room (' + carried + ' vs ' + alone + ')');
  t.eq(alone - carried, KP.C.SCAR.leaderEase * 2, 'exactly the eased amount, per booking');
}

// ---- the doorway: standing colors how she walks in ----
{
  const { state, g } = debuted('scar-door');
  const p = state.people[g.members[0]];
  const def = KP.sceneDef('idolAsk');
  p.directed = [{ week: state.week, kind: 'test', w: 10 }];
  t.ok(/came to you first/.test(def.body(state, { kind: 'idolAsk', personId: p.id })),
    'trust walks in the door with her');
  p.directed = [{ week: state.week, kind: 'test', w: -10 }];
  t.ok(/almost took this to her manager/.test(def.body(state, { kind: 'idolAsk', personId: p.id })),
    'and so does its absence');
}

// ---- the anniversary: the calendar finally knows the date ----
{
  const { state, g } = debuted('scar-anniv');
  g.debutWeek = state.week - (KP.C.WEEKS_PER_YEAR * 2 - 1);   // 2-year mark next week
  const m0 = state.people[g.members[0]];
  const moraleAt = m0.morale;
  KP.advanceWeek(state);
  const note = state.inbox.find(n => n.ind === 'anniversary');
  t.ok(note && note.years === 2, 'the 2-year week arrives on schedule');
  t.ok(/café banner changed at midnight/.test(note.text), 'the café banner changed at midnight');
  t.ok(m0.morale >= moraleAt, 'the anniversary does everyone good');
  const reg = KP.feedReactionFor('anniversary');
  const post = reg(state, note, KP.rngFor(state));
  t.ok(post && /anniversary|YEARS OF|years ago today/.test(post.text), 'and the timeline shows up for it');
}

// ---- migration + determinism ----
{
  const { state } = debuted('scar-mig');
  state.version = '0.8.2';
  const m = KP.deserialize(KP.serialize(state));
  t.ok(m.inbox.some(n => /Three additions to the files/.test(n.text)), 'the staff floor explains the changes');

  const { state: a, g } = debuted('scar-fork');
  const p = a.people[g.members[0]];
  a.discourses = [{ id: 'dF', kind: 'gaffe', subjectType: 'idol', subjectId: p.id,
    groupId: g.id, week: a.week, heat: 95, negative: true, status: 'live', responded: false }];
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 25; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'scars fork clean, shadows and all');
}

t.finish();
