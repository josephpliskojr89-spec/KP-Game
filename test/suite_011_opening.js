/* Suite 011 — the open agency (v0.2.3).
   The signing allowance binds only until the first debut (the tutorial
   rail), fiscal pressure replaces it (noticed → warned → board-level),
   the opening-up is announced in the fiction, and stage names rule every
   report surface. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_011_opening');

function throughDebut(seed) {
  const state = KP.newGame(seed);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'OPENA', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return state;
}

// the cap binds before the debut...
{
  const state = KP.newGame('open-cap');
  t.ok(KP.signingsCapped(state), 'signings are capped before the first debut');
  state.budget = 500;
  for (let i = 0; i < 3; i++) KP.signProspect(state, state.prospects[0]);
  const fourth = KP.signProspect(state, state.prospects[0]);
  t.ok(!fourth.ok && /allowance/.test(fourth.reason), 'the tutorial rail holds pre-debut');
}

// ...and lifts after it
{
  const state = throughDebut('open-lift');
  t.ok(!KP.signingsCapped(state), 'the cap lifts at first debut');
  state.budget = 500;
  let signed = 0;
  for (let i = 0; i < 5 && state.prospects.length; i++) {
    if (KP.signProspect(state, state.prospects[0]).ok) signed++;
  }
  t.ok(signed >= 4, 'more signings than the old allowance succeed (' + signed + ')');
  t.ok(state.inbox.some(m => /allowance is retired/.test(m.text)),
    'the executive announces the opening-up in the fiction');
}

// fiscal pressure: burn gets noticed, repeated burn costs trust, recovery cools it
{
  const state = throughDebut('open-burn');
  state.budget = 300;
  state.fiscal = { monthStartBudget: 300, pressure: 0, monthSignings: 0 };
  const trust0 = state.trust;
  // burn ~60/month across four-plus month boundaries (any spend source)
  let sawNotice = false, sawWarning = false;
  for (let w = 0; w < 20; w++) {
    state.budget = Math.max(0, state.budget - 15);
    const notes = KP.advanceWeek(state);
    notes.forEach(n => {
      if (/flagged the quarterly books/.test(n.text)) sawNotice = true;
      if (/Keep earning that|board sees these numbers/.test(n.text)) sawWarning = true;
    });
  }
  t.ok(sawNotice, 'a deficit month gets noticed');
  t.ok(sawWarning, 'sustained deficit escalates to a warning');
  t.ok(state.fiscal.pressure >= 2, 'pressure level climbed');
  t.ok(state.trust < trust0, 'sustained burn costs trust');
  // recovery: surplus months cool the pressure
  const pressureHigh = state.fiscal.pressure;
  for (let w = 0; w < 13; w++) {
    state.budget += 20;
    KP.advanceWeek(state);
  }
  t.ok(state.fiscal.pressure < pressureHigh, 'surplus months cool the pressure');
}

// no pressure while the cap is on — the tutorial phase is protected
{
  const state = KP.newGame('open-tutorial');
  state.budget = 300;
  let pressureNote = false;
  for (let w = 0; w < 9; w++) {
    state.budget = Math.max(0, state.budget - 20);
    KP.advanceWeek(state).forEach(n => {
      if (/quarterly books|board sees these numbers/.test(n.text)) pressureNote = true;
    });
  }
  t.ok(!pressureNote, 'no fiscal-pressure letters during the tutorial phase');
}

// stage names rule the reports (owner's law)
{
  const state = throughDebut('open-names');
  const g = state.groups[0];
  const a = state.people[g.members[0]];
  const b = state.people[g.members[1]];
  KP.setStageName(state, a.id, 'Vexa');
  KP.setStageName(state, b.id, 'Miro');

  t.eq(KP.publicGiven(a), 'Vexa', 'publicGiven prefers the stage name');
  t.eq(KP.publicGiven(state.people[g.members[2]]), state.people[g.members[2]].name.given,
    'publicGiven falls back to the real given name');

  // the sit-down speaks in stage names
  state.relationships[KP.pairKey(a, b)] = { score: -50, state: 'conflict' };
  const med = KP.mediatePair(state, a.id, b.id);
  t.ok(med.ok, 'sit-down ran');
  t.ok(!med.text.includes(a.name.given) && !med.text.includes(b.name.given),
    'sit-down report never uses real given names');

  // chemistry notes speak in stage names
  state.relationships[KP.pairKey(a, b)].score = 70;
  state.relationships[KP.pairKey(a, b)].state = 'close';
  const chemNotes = KP.chemistryNotes(state, [a, b, state.people[g.members[2]]]);
  const pairNote = chemNotes.find(n => /trusted partners/.test(n));
  t.ok(pairNote && pairNote.includes('Vexa') && pairNote.includes('Miro'), 'chemistry notes use stage names');

  // a long stretch of weekly reports never leaks a stage-named member's real name
  const realNames = [a.name.display, b.name.display];
  let leaks = 0;
  for (let w = 0; w < 30; w++) {
    KP.advanceWeek(state).forEach(n => {
      realNames.forEach(rn => { if (n.text.includes(rn)) leaks++; });
    });
  }
  t.eq(leaks, 0, '30 weeks of reports: zero real-name leaks for stage-named members');
}

// determinism with fiscal state
{
  const a = throughDebut('open-fork');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 12; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'restored save continues identically under fiscal tracking');
}

t.finish();
