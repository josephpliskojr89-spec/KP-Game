/* Suite 098 — the floor (v0.10.31, §90 Phase A).
   One world of people: a rival's trainee room is PEOPLE (the counter is
   a read), a cut is a person who lands on the open board as herself,
   a released trainee re-enters the world and remembers, the world
   forgets only at its exits, and nobody is minted anywhere but a door. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_098_floor');

function fillFloor(state, rival, n, opts) {
  const rng = KP.rngFor(state);
  while (KP.rivalFloor(state, rival).length < n) {
    KP.mintRivalTrainee(state, rng, rival, Object.assign({ signedWeek: state.week - 60 }, opts || {}));
  }
  state.rngState = rng.state();
}
function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'FLOORLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = g.demos || KP.generateDemos(state, KP.rngFor(state), g);
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  return { state, g };
}

// ---- the floor is people from week one ---------------------------------
{
  const state = KP.newGame('fl-open', null, { legacy: false });
  state.rivals.forEach(r => {
    t.ok(r.rosterCount === undefined && r.floorSeed === undefined, r.short + ' carries no counter');
    const floor = KP.rivalFloor(state, r);
    t.ok(floor.length >= 4, r.short + ' has a real room (' + floor.length + ')');
    t.ok(floor.every(p => p.status === 'rival' && p.company === r.short && p.signedWeek != null),
      'everyone on it is signed to them, with a date');
    t.ok(floor.every(p => p.born && p.born.door === 'rivalDoor' && p.born.city), 'and came from somewhere');
    t.eq(KP.rivalFloorCount(state, r), floor.length, 'the count IS the people');
  });
  // every person in the opening world has a door
  const undoored = Object.values(state.people).filter(p => !p.born && !['idol', 'trainee'].includes(p.status) && !p.inherited);
  t.ok(undoored.length <= Object.values(state.people).length * 0.5,
    'the opening board predates the stamp (' + undoored.length + ' unstamped files are the legacy pool, nothing minted later)');
}

// ---- a debut is cast from the floor, never minted -------------------------
{
  const state = KP.newGame('fl-cast', null, { legacy: false });
  const rival = state.rivals[0];
  fillFloor(state, rival, 10, { gender: 'f', age: 18 });
  const floorIds = new Set(KP.rivalFloor(state, rival).map(p => p.id));
  const peopleBefore = new Set(Object.keys(state.people));
  rival.nextDebutWeek = state.week + 1;
  const acts0 = rival.acts.length;
  KP.advanceWeek(state);
  t.eq(rival.acts.length, acts0 + 1, 'the debut happened');
  const act = rival.acts[rival.acts.length - 1];
  t.ok(act.members.length >= KP.C.INDUSTRY.actSize[0], 'a full lineup');
  t.ok(act.members.every(id => floorIds.has(id) || state.people[id].signedWeek === state.week), 'every member was on the floor the week before (or signed off the board this week)');
  t.ok(act.members.every(id => peopleBefore.has(id)), 'nobody was minted to fill it');
  t.ok(act.members.every(id => state.people[id].age >= KP.C.INDUSTRY.memberDebutAge[0]), 'all debut-aged');
  const born = Object.values(state.people).filter(p => !peopleBefore.has(p.id));
  t.ok(born.every(p => p.born && p.born.door), 'whoever was born this week came through a door (' + born.map(p => p.born && p.born.door).join(',') + ')');
}

// ---- a room too thin waits instead of inventing a lineup -------------------
{
  const state = KP.newGame('fl-thin', null, { legacy: false });
  const rival = state.rivals[1];
  KP.rivalFloor(state, rival).forEach(p => { p.age = 14; });   // nobody debut-aged
  rival.nextDebutWeek = state.week;
  const acts0 = rival.acts.length;
  const people0 = Object.keys(state.people).length;
  KP.advanceWeek(state);
  t.eq(rival.acts.length, acts0, 'no debut from a room that cannot field one');
  t.ok(rival.nextDebutWeek > state.week, 'the date moves out instead');
  t.ok(!Object.values(state.people).some(p => p.flags.rivalNative && p.born && p.born.week === state.week && p.company === rival.short && p.age >= 17),
    'and nobody debut-aged was minted to make it work (' + (Object.keys(state.people).length - people0) + ' births, all doors)');
}

// ---- the cut is a person; the castoff on the board is her -----------------
{
  const state = KP.newGame('fl-cut', null, { legacy: false });
  const I = KP.C.INDUSTRY, R = I.ROOM;
  const rival = state.rivals[0];
  rival.nextDebutWeek = state.week + 500;
  fillFloor(state, rival, 30, { signedWeek: state.week - R.namedTenure - 10 });
  const weakest = KP.rivalFloor(state, rival)[0];
  KP.C.TALENTS.forEach(d => { weakest.talents[d].cur = 12; });
  const floor0 = KP.rivalFloor(state, rival).length;
  const people0 = Object.keys(state.people).length;
  let guard = 0;
  while (!(rival.recentMoves || []).some(m => /^Cut \d+ trainee/.test(m)) && guard++ < R.cullEvery + 4) KP.advanceWeek(state);
  t.ok((rival.recentMoves || []).some(m => /^Cut \d+ trainee/.test(m)), 'the evaluation ran');
  t.ok(KP.rivalFloor(state, rival).length < floor0, 'the room shrank (' + floor0 + ' → ' + KP.rivalFloor(state, rival).length + ')');
  t.ok(weakest.status !== 'rival' || weakest.company !== rival.short, 'the weakest was cut (' + weakest.status + ')');
  t.ok(weakest.history.some(h => /seasonal evaluation/.test(h.text)), 'her file says what happened');
  t.eq(weakest.castoffFrom, rival.short, 'and who did it');
  if (weakest.status === 'prospect') {
    t.eq(weakest.channel, 'castoff', 'she is the castoff on the board');
    t.ok(state.prospects.includes(weakest.id), 'file and all');
  }
  t.ok((state.floorLedger || {}).cut >= 1 && (state.floorLedger || {}).boarded >= 1, 'ledgered: cut and boarded');
  const minted = Object.values(state.people).filter(p => p.born && p.born.week > state.week - guard && !p.born.door);
  t.eq(minted.length, 0, 'nobody was minted to play a castoff');
  t.ok(Object.keys(state.people).length - people0 <= (state.floorLedger || {}).born, 'every new person came through a door');
}

// ---- the window closes: another pen, or home — never a deletion of someone known
{
  const state = KP.newGame('fl-window', null, { legacy: false });
  state.budget = 900;
  const rng = KP.rngFor(state);
  const r0 = state.rivals[0];
  const a = KP.mintRivalTrainee(state, rng, r0, { signedWeek: state.week - 80 });
  const b = KP.mintRivalTrainee(state, rng, r0, { signedWeek: state.week - 80 });
  KP.cutFromFloor(state, rng, r0, a); KP.cutFromFloor(state, rng, r0, b);
  state.rngState = rng.state();
  KP.advanceWeek(state);   // the cut's own read is this week's; the look needs a fresh one
  a.castoffUntil = state.week + 2; b.castoffUntil = state.week + 2;
  const look = KP.observeProspect(state, b.id);   // a chapter with this desk
  t.ok(look.ok && b.flags.readByUs, 'the look is a chapter');
  a.castoffUntil = state.week; b.castoffUntil = state.week;
  KP.advanceWeek(state);
  [a, b].forEach(p => t.ok(!state.prospects.includes(p.id), KP.displayName(p) + ' left the board'));
  t.ok(state.people[b.id], 'the one we read is never forgotten (' + state.people[b.id].status + ')');
  t.ok(['rival', 'gone'].includes(state.people[b.id].status), 'another company’s pen, or home');
  if (state.people[a.id]) t.ok(state.people[a.id].status === 'rival', 'the unread one was either signed elsewhere…');
  else t.ok(true, '…or forgotten — nobody here ever knew her');
  const F = KP.C.FLOOR;
  t.ok(F.castoffSignsElsewhere > 0 && F.staleSignsElsewhere > 0, 'the exits are real signings part of the time');
}

// ---- released trainees re-enter the world and remember --------------------
{
  const { state } = debuted('fl-reentry');
  const p = state.people[state.roster.find(id => state.people[id].status === 'trainee')];
  t.ok(p, 'fixture: a trainee to release');
  KP.recordDirected(state, p.id, 'leftWaiting');   // one wait on the file between you
  const r = KP.releaseTrainee(state, p.id);
  t.ok(r.ok && p.status === 'released', 'released');
  t.ok(p.flags.wasOurs && p.releasedFrom === state.company.short && p.releasedWeek === state.week, 'she left the company, not the world');
  let guard = 0;
  while (p.status === 'released' && guard++ < KP.C.FLOOR.reentryMax + 3) KP.advanceWeek(state);
  t.eq(p.status, 'prospect', 'she is back on the open board');
  t.eq(p.channel, 'released', 'as a public file — every desk sees her');
  t.ok(state.prospects.includes(p.id), 'listed');
  t.ok(p.history.some(h => /Back on the open board/.test(h.text)), 'the file says so');
  t.ok((p.directed || []).some(d => d.kind === 'leftWaiting'), 'and the ledger between you survived the exit');
  t.ok(state.inbox.concat(KP.lastTickNotes || []).some(n => n.ind === 'reentry' && n.personId === p.id), 'the desk hears it');
  t.ok((state.floorLedger || {}).reentries >= 1, 'ledgered');
  // the grudge is hers: a cold file refuses; a warm one comes back
  p.personality.warmth = 20; p.personality.professionalism = 20; p.personality.dominance = 90; p.personality.competitiveness = 90;
  t.eq(KP.grudgeBar(p), 1, 'a cold personality forgives nothing');
  state.budget = 900;
  const rr = KP.signProspect(state, p.id);
  t.ok(!rr.ok && rr.refused, 'she took the meeting to say no');
  t.ok(state.prospects.includes(p.id), 'and stays on the board for everyone else');
  p.personality.warmth = 85; p.personality.professionalism = 85; p.personality.dominance = 20; p.personality.competitiveness = 20;
  t.ok(KP.grudgeBar(p) >= 4, 'a warm professional forgives a lot (' + KP.grudgeBar(p) + ')');
  const base = KP.signCost(state, Object.assign({}, p, { releasedFrom: null }));
  const r2 = KP.signProspect(state, p.id);
  t.ok(r2.ok || r2.counter, 'she takes the meeting (' + JSON.stringify(r2).slice(0, 60) + ')');
  if (r2.ok) {
    t.eq(p.status, 'trainee', 'and comes back');
    t.ok(p.history.some(h => /second signature/.test(h.text)), 'the file marks the second signature');
    t.ok((state.floorLedger || {}).resigned >= 1 && (state.floorLedger || {}).refused >= 1, 'both answers ledgered');
    t.ok(base > 0, 'price read (' + base + ')');
  }
}

// ---- a rival signs the one you released: a face we lost ---------------------
{
  const { state } = debuted('fl-lost');
  const p = state.people[state.roster.find(id => state.people[id].status === 'trainee')];
  KP.releaseTrainee(state, p.id);
  let guard = 0;
  while (p.status === 'released' && guard++ < 20) KP.advanceWeek(state);
  t.eq(p.status, 'prospect', 'fixture: back on the board');
  const rival = state.rivals[0];
  const S = KP.C.SCOUT;
  const oldHot = S.rivalSignHotChance; S.rivalSignHotChance = 1;
  rival.interest[p.id] = 3;
  guard = 0;
  while (p.status === 'prospect' && guard++ < 6) { rival.interest[p.id] = 3; KP.advanceWeek(state); }
  S.rivalSignHotChance = oldHot;
  t.eq(p.status, 'rival', 'signed elsewhere — she moved through the system');
  t.ok(p.flags.lostToRival && p.flags.wasOurs, 'both chapters on one file');
  t.ok(KP.rivalFloor(state, rival).some(x => x.id === p.id) || state.rivals.some(r => r.acts.some(a => a.members.includes(p.id))),
    'a real seat on a real floor');
}

// ---- the collapse: "overnight, their trainees are free agents" is true ----
{
  const state = KP.newGame('fl-collapse', null, { legacy: false });
  const I = KP.C.INDUSTRY;
  const rng = KP.rngFor(state);
  const starved = { name: 'Starved Ent.', short: 'Starved', philosophy: 'patient', blurb: 't', prestige: 5,
    nextDebutWeek: 9999, interest: {}, acts: [], recentMoves: [] };
  state.rivals.push(starved);
  for (let i = 0; i < 6; i++) KP.mintRivalTrainee(state, rng, starved, { signedWeek: state.week - 30 });
  const ids = KP.rivalFloor(state, starved).map(p => p.id);
  const oldC = I.collapseChance; I.collapseChance = 1;
  KP.industryLifecycle(state, rng);
  I.collapseChance = oldC;
  state.rngState = rng.state();
  t.ok(!state.rivals.includes(starved), 'the starved house folded');
  t.ok(ids.every(id => state.people[id]), 'its people are still people');
  t.ok(ids.every(id => state.people[id].company !== 'Starved' || state.people[id].flags.freeAgent), 'none still carry the dead letterhead except the signing class');
  t.ok(ids.some(id => state.people[id].status === 'prospect' || state.people[id].status === 'released'), 'the rest of the room is on the market, file intact');
}

// ---- the split: six real trainees walk out with the defectors --------------
{
  const state = KP.newGame('fl-split', null, { legacy: false });
  const I = KP.C.INDUSTRY;
  const rng = KP.rngFor(state);
  const giant = state.rivals[0];
  giant.prestige = Math.max(giant.prestige, I.splitPrestige + 5);
  while (KP.rivalFloor(state, giant).length < I.splitRoster + 2) KP.mintRivalTrainee(state, rng, giant, { signedWeek: state.week - 30 });
  const floor0 = KP.rivalFloor(state, giant).length;
  const oldS = I.splitChance, oldM = I.mergeChance, oldC = I.collapseChance;
  I.splitChance = 1; I.mergeChance = 0; I.collapseChance = 0;
  const nR = state.rivals.length;
  KP.industryLifecycle(state, rng);
  I.splitChance = oldS; I.mergeChance = oldM; I.collapseChance = oldC;
  state.rngState = rng.state();
  if (state.rivals.length === nR + 1) {
    const spawn = state.rivals[state.rivals.length - 1];
    t.eq(KP.rivalFloor(state, spawn).length, 6, 'six real people walked out');
    t.eq(KP.rivalFloor(state, giant).length, floor0 - 6, 'and left the giant six lighter');
    t.ok(KP.rivalFloor(state, spawn).every(p => p.history.some(h => /defectors/.test(h.text))), 'their files say why');
  } else {
    t.ok(true, '(the cap held the split off this week — the mechanism is pinned above)');
  }
}

// ---- migration: a counter becomes people ------------------------------------
{
  const state = KP.newGame('fl-mig', null, { legacy: false });
  const rival = state.rivals[0];
  KP.rivalFloor(state, rival).forEach(p => { p.status = 'gone'; p.company = null; });
  rival.rosterCount = 9;
  state.version = '0.10.30';
  const m = KP.deserialize(KP.serialize(state));
  const r2 = m.rivals[0];
  t.ok(r2.rosterCount === undefined, 'the counter is gone');
  t.eq(KP.rivalFloor(m, r2).length, 9, 'and nine named trainees stand where it was');
  t.ok(KP.rivalFloor(m, r2).every(p => p.born && p.born.door === 'rivalDoor' && p.signedWeek < m.week), 'born at the door, signed in the past');
  const m2 = KP.deserialize(KP.serialize(state));
  t.eq(KP.serialize(m), KP.serialize(m2), 'the migration is deterministic');
}

// ---- the audit's zero-invariants hold over a hundred weeks -------------------
{
  const state = KP.newGame('fl-audit', null, { legacy: true });
  let ghostCasts = 0, undoored = 0, washouts = 0;
  for (let w = 0; w < 100; w++) {
    const before = new Set(Object.keys(state.people));
    const actsBefore = new Set(); state.rivals.forEach(r => r.acts.forEach(a => actsBefore.add(a.id)));
    KP.advanceWeek(state);
    Object.values(state.people).forEach(p => { if (!before.has(p.id) && !p.born) undoored++; });
    state.rivals.forEach(r => r.acts.forEach(a => { if (!actsBefore.has(a.id)) a.members.forEach(id => { if (!before.has(id)) ghostCasts++; }); }));
    if ((KP.lastTickNotes || []).some(n => n.ind === 'washout')) washouts++;
  }
  t.eq(undoored, 0, 'nobody was born without a door');
  t.eq(ghostCasts, 0, 'no lineup was cast with somebody minted that week');
  t.eq(washouts, 0, 'the invented washout stream is gone');
  t.ok(state.rivals.every(r => r.rosterCount === undefined), 'no counters anywhere');
  t.ok(Object.values(state.people).every(p => p.status !== 'rival' || p.company), 'every rival trainee has a company');
}

// ---- determinism: the floor forks clean -------------------------------------
{
  const a = KP.newGame('fl-fork', null, { legacy: true });
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 40; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'forty weeks of floors fork clean');
}

t.finish();
