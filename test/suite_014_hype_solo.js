/* Suite 014 — pre-debut hype & solo acts (v0.2.6).
   Hype is a decaying window; past the threshold the CEO forces your hand
   (hard directive — met by any debut, missed with real cost); debuts cash
   hype into reception and fanbase; solo acts ride the release machinery
   with their own risk profile. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_014_hype_solo');

// hype decays when nothing feeds it
{
  const state = KP.newGame('hs-decay');
  const p = state.people[state.roster[0]];
  p.hype = 50;
  // dampen the person so events are unlikely, then watch the window close
  KP.C.TALENTS.forEach(d => { p.talents[d].cur = 20; });
  p.personality.confidence = 10; p.liveExp = 0;
  const before = p.hype;
  for (let w = 0; w < 12; w++) KP.advanceWeek(state);
  t.ok(p.hype < before, 'hype decays over time (' + before + ' → ' + p.hype.toFixed(1) + ')');
}

// hype events find magnetic trainees across seeds
{
  let orgsWithHype = 0;
  for (let s = 0; s < 12; s++) {
    const state = KP.newGame('hs-events' + s);
    for (let w = 0; w < 40; w++) KP.advanceWeek(state);
    const maxHype = Math.max.apply(null, state.roster.map(id => state.people[id].hype || 0));
    if (maxHype >= 15) orgsWithHype++;
  }
  t.ok(orgsWithHype >= 6, 'the internet finds someone in most orgs (' + orgsWithHype + '/12)');
}

// the hard directive: fires at threshold, met by a group debut including her
{
  const state = KP.newGame('hs-directive');
  const star = state.people[state.roster[1]];
  star.hype = 80;
  KP.advanceWeek(state);
  t.ok(state.hypeDirective && state.hypeDirective.personId === star.id, 'the CEO forces your hand at the threshold');
  t.ok(state.inbox.some(m => /Debut her|Do not make me watch/.test(m.text)), 'the directive arrives as a letter');
  const trustBefore = state.trust;
  const ids = state.roster.slice(0, 5);
  t.ok(ids.includes(star.id), 'sanity: she is in the lineup');
  KP.proposeGroup(state, 'HYPELINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  KP.advanceWeek(state);
  t.ok(!state.hypeDirective, 'directive resolved and archived');
  t.ok(state.objectiveHistory.some(o => o.type === 'hypeDebut' && o.status === 'met'), 'met, on the record');
  t.ok(state.trust > trustBefore - 5, 'meeting the directive does not cost trust');
  t.eq(star.hype, 0, 'her hype was cashed into the debut');
}

// missing the directive: trust hit, hype collapses, it does not come back
{
  const state = KP.newGame('hs-miss');
  const star = state.people[state.roster[1]];
  star.hype = 80;
  KP.advanceWeek(state);
  state.hypeDirective.deadlineWeek = state.week + 1;
  const trustBefore = state.trust;
  for (let w = 0; w < 3; w++) KP.advanceWeek(state);
  t.ok(!state.hypeDirective, 'missed directive resolved and archived');
  t.ok(state.objectiveHistory.some(o => o.type === 'hypeDebut' && o.status === 'missed'), 'the miss is on the record');
  t.ok(state.trust < trustBefore, 'missing the window costs trust');
  t.ok(star.hype <= KP.C.HYPE.collapseTo, 'her hype collapsed');
  t.ok(state.inbox.some(m => /Remember that I remember/.test(m.text)), 'the CEO says so, coldly');
}

// hype cashes into launch: across seeds, hyped debuts open bigger on average
{
  let withSum = 0, withoutSum = 0, popWith = 0, popWithout = 0;
  const N = 15;
  for (let s = 0; s < N; s++) {
    const run = (hyped) => {
      const state = KP.newGame('hs-cash' + s);
      const ids = state.roster.slice(0, 5);
      if (hyped) state.people[ids[0]].hype = 70;
      KP.proposeGroup(state, 'CASHLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
      const g = state.groups[0];
      g.demos = KP.generateDemos(state, KP.rngFor(state));
      KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
        week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
      let guard = 0;
      while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
      return g;
    };
    const a = run(true), b = run(false);
    withSum += a.results.reception; withoutSum += b.results.reception;
    popWith += a.popularity; popWithout += b.popularity;
  }
  t.ok(withSum / N > withoutSum / N + 2, 'hyped debuts open bigger on average (+' + ((withSum - withoutSum) / N).toFixed(1) + ')');
  t.ok(popWith / N > popWithout / N + 5, 'hype founds a bigger fanbase (+' + ((popWith - popWithout) / N).toFixed(1) + ')');
}

// solo acts: rails and resolution
{
  const state = KP.newGame('hs-solo');
  const star = state.people[state.roster[1]];
  const r = KP.proposeGroup(state, 'SOLOSTAR', [star.id], {});
  t.ok(r.ok, 'a one-member act proposes as a solo');
  t.eq(r.group.type, 'solo', 'typed as a solo');
  t.eq(r.group.roles.center, star.id, 'she is her own center');
  t.ok(r.review.some(line => /solo/i.test(line)), 'the executive reacts to the solo as a solo');
  t.ok(!KP.proposeGroup(state, 'X', [state.roster[2], state.roster[3]], {}).ok, 'two members is not a lineup and not a solo');
  const g = r.group;
  const chem = KP.groupChemistry(state, [star]);
  t.ok(chem >= 0 && chem <= 100, 'solo chemistry bounded');
  t.ok(KP.chemistryNotes(state, [star]).some(n => /nowhere to hide/.test(n)), 'the room report knows what a solo is');
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 40, dance: 30, rap: 5, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  t.ok(g.debuted && g.results, 'the solo debut resolved');
  t.eq(g.results.breakoutId, star.id, 'the breakout is, of course, her');
  t.ok(!g.results.centerOvershadowed, 'a solo cannot be overshadowed');
  t.ok(g.results.reception >= 1 && g.results.reception <= 100, 'reception bounded');
  t.eq(star.status, 'idol', 'she debuted');
}

// solo promotion runs hotter than group promotion
{
  const state = KP.newGame('hs-solofatigue');
  const star = state.people[state.roster[1]];
  KP.proposeGroup(state, 'HOTSOLO', [star.id], {});
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  const f0 = star.fatigue;
  KP.advanceWeek(state);   // one promotion week
  const soloDelta = star.fatigue - f0;
  t.ok(soloDelta >= KP.C.COMEBACK.FOCUS.musicShows.fatigue * KP.C.SOLO.promoFatigueMult - 1,
    'one body carries the whole rollout (+' + soloDelta.toFixed(1) + ' fatigue/week)');
}

// determinism with hype, a directive, and a solo in flight
{
  const mk = () => {
    const s = KP.newGame('hs-fork');
    s.people[s.roster[1]].hype = 70;
    return s;
  };
  const a = mk();
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 14; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'restored save continues identically');
}

t.finish();
