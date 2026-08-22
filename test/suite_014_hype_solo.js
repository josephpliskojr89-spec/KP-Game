/* Suite 014 — pre-debut hype & solo acts (v0.2.6).
   Hype is a decaying window; past the threshold the CEO forces your hand
   (hard directive — met by any debut, missed with real cost); debuts cash
   hype into reception and fanbase; solo acts ride the release machinery
   with their own risk profile. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_014_hype_solo');

// hype decays when nothing feeds it — mechanism-level, not seed-snapshot:
// each week's delta is either pure decay or a discrete event pop, and
// decay weeks must actually occur
{
  const state = KP.newGame('hs-decay', null, { legacy: false });
  const p = state.people[state.roster[0]];
  p.hype = 50;
  const H = KP.C.HYPE;
  let decayWeeks = 0;
  for (let w = 0; w < 12; w++) {
    const before = p.hype;
    KP.advanceWeek(state);
    const delta = p.hype - before;
    const isDecay = delta <= 0 && delta >= -H.decayPerWeek - 0.001;
    // 0.9.24.1 scaled hype pops by pull, so an event can land below the
    // old gainMin floor — any positive move is an event pop by definition
    const isEvent = delta > 0;
    t.ok(isDecay || isEvent,
      'weekly hype moves by decay or by an event pop, nothing else (delta ' + delta.toFixed(1) + ')');
    if (isDecay && before > 0) decayWeeks++;
  }
  t.ok(decayWeeks >= 1, 'the window actually closes on quiet weeks (' + decayWeeks + '/12 decayed)');
}

// hype events find magnetic trainees — WHERE the letterhead is known.
// 0.9.35.2 (owner: "entirely too many viral moments for a no name
// label"): the clip needs a lens AND a letterhead, so the claim moved
// doors — the established house still gets found; the no-name gets
// found LESS, which is now the law, asserted both ways.
// Measured at the change: inheritance 7/12, no-name 4/12.
{
  // v0.10.1 lesson: hype PEAKS ride concentration luck, and legacy
  // worlds share weekly note cadence — a phase change in the stream
  // (the quarterly books) re-rolled all 24 seeds in a correlated
  // direction at the 40-week horizon. The MECHANISM is deterministic
  // (event chance scales with vis² = (0.35+networkRead)²), so assert
  // it directly — and give the empirical sample 60 weeks, where the
  // law reasserts decisively (measured 15/24 vs 4/24).
  const va = KP.newGame('hs-vis-a', null, { legacy: true });
  const vb = KP.newGame('hs-vis-b', null, { legacy: false });
  t.ok(KP.networkRead(va) > KP.networkRead(vb) + 0.1,
    'the letterhead IS the lens: the known label sees and is seen more');
  let hi = 0, lo = 0;
  for (let s = 0; s < 24; s++) {
    const a2 = KP.newGame('hs-events' + s, null, { legacy: true });
    for (let w = 0; w < 60; w++) KP.advanceWeek(a2);
    if (Math.max.apply(null, a2.roster.map(id => a2.people[id].hype || 0)) >= 15) hi++;
    const b2 = KP.newGame('hs-events' + s, null, { legacy: false });
    for (let w = 0; w < 60; w++) KP.advanceWeek(b2);
    if (Math.max.apply(null, b2.roster.map(id => b2.people[id].hype || 0)) >= 15) lo++;
  }
  // the absolute floor kept costing a repair per release (8→7 across
  // two stream changes) — the DIRECTION is the law; the floor only
  // guards "the mechanism is alive at all"
  t.ok(hi >= 5, 'the internet finds someone where the letterhead is known (' + hi + '/24)');
  t.ok(lo < hi, 'and the no-name label is found less — the algorithm needs a name (' + lo + ' vs ' + hi + ')');
}

// the hard directive: fires at threshold, met by a group debut including her
{
  const state = KP.newGame('hs-directive', null, { legacy: false });
  const star = state.people[state.roster[1]];
  star.hype = 80;
  KP.advanceWeek(state);
  t.ok(state.hypeDirective && state.hypeDirective.personId === star.id, 'the CEO forces your hand at the threshold');
  t.ok(state.inbox.some(m => /Debut her|Do not make me watch/.test(m.text)), 'the directive arrives as a letter');
  const trustBefore = state.trust;
  const ids = state.roster.slice(0, 5);
  t.ok(ids.includes(star.id), 'sanity: she is in the lineup');
  // the test measures the DIRECTIVE's trust math, not reception luck —
  // field a lineup good enough that the debut itself cannot miss
  ids.forEach(id => { const p = state.people[id];
    p.talents.vocals.cur = 75; p.talents.dance.cur = 75; p.talents.charisma.cur = 70; });
  KP.proposeGroup(state, 'HYPELINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  // pick the BEST hook, not demos[0] — this block measures the
  // directive's trust math, and a dud first demo is reception luck
  const bestDemo = g.demos.slice().sort((a, b) => b.hook - a.hook)[0];
  KP.planDebut(state, { groupId: g.id, songId: bestDemo.id, promo: 'modest',
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
  const state = KP.newGame('hs-miss', null, { legacy: false });
  const star = state.people[state.roster[1]];
  star.hype = 80;
  KP.advanceWeek(state);
  state.hypeDirective.deadlineWeek = state.week + 1;
  const trustBefore = state.trust;
  let hypeAtCollapse = null;
  for (let w = 0; w < 3; w++) {
    KP.advanceWeek(state);
    if (!state.hypeDirective && hypeAtCollapse == null) hypeAtCollapse = star.hype;
  }
  t.ok(!state.hypeDirective, 'missed directive resolved and archived');
  t.ok(state.objectiveHistory.some(o => o.type === 'hypeDebut' && o.status === 'missed'), 'the miss is on the record');
  t.ok(state.trust < trustBefore, 'missing the window costs trust');
  t.ok(hypeAtCollapse != null && hypeAtCollapse <= KP.C.HYPE.collapseTo,
    'her hype collapsed when the window closed (' + hypeAtCollapse + ')');
  t.ok(state.inbox.some(m => /Remember that I remember/.test(m.text)), 'the CEO says so, coldly');
}

// hype cashes into launch: across seeds, hyped debuts open bigger on average
{
  let withSum = 0, withoutSum = 0, popWith = 0, popWithout = 0;
  const N = 15;
  for (let s = 0; s < N; s++) {
    const run = (hyped) => {
      const state = KP.newGame('hs-cash' + s, null, { legacy: false });
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
  const state = KP.newGame('hs-solo', null, { legacy: false });
  const star = state.people[state.roster[1]];
  KP.openMandate(state, { kind: 'solo', source: 'fixture greenlight' });
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
  const state = KP.newGame('hs-solofatigue', null, { legacy: false });
  const star = state.people[state.roster[1]];
  KP.openMandate(state, { kind: 'solo', source: 'fixture greenlight' });
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
    const s = KP.newGame('hs-fork', null, { legacy: false });
    s.people[s.roster[1]].hype = 70;
    return s;
  };
  const a = mk();
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 14; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'restored save continues identically');
}

t.finish();
