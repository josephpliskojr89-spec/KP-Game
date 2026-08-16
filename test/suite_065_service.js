/* Suite 065 — the service (v0.9.23, map slot 8, §55.7).
   Every male idol carries an enlistment window with a hard deadline;
   the plan is the industry's classic (stagger vs together); the
   contract clock pauses; the wait is loyal; and the discharge return
   stage is the event the anticipation system builds toward. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_065_service');

// a debuted boy group with controllable ages
function boyGroup(seed, ages) {
  const state = KP.newGame(seed, null, { legacy: false });
  state.budget = 600;
  const rng = KP.rngFor(state);
  const ids = [];
  for (let i = 0; i < ages.length; i++) {
    const b = KP.generatePerson(rng, { status: 'trainee', gender: 'm' });
    b.signedWeek = 1;
    state.people[b.id] = b; state.roster.push(b.id); ids.push(b.id);
  }
  state.rngState = rng.state();
  state.nextPersonId = KP.peekNextId();
  KP.openMandate(state, { kind: 'group', gender: 'm', source: 'fixture greenlight' });
  KP.proposeGroup(state, 'GARRISON', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups.find(x => x.name === 'GARRISON');
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  // set the ages AFTER debut so the fixture controls the clock exactly
  ids.forEach((id, i) => { state.people[id].age = ages[i]; });
  return { state, g, ids };
}
function rideOut(state, weeks, fn) {
  for (let w = 0; w < weeks; w++) { if (fn) fn(); KP.advanceWeek(state); }
}
function scene(state, kind) {
  return (state.scenes || []).find(sc => sc.kind === kind);
}

// ---- the plan folder, then the papers, then the bus -------------------
{
  const M = KP.C.MIL;
  const { state, g, ids } = boyGroup('svc-stagger', [M.noticeAge, 22, 22, 21]);
  const elder = state.people[ids[0]];
  // wait out the post-debut promo window so ages hold and scenes flow
  rideOut(state, 1, () => { elder.age = Math.max(elder.age, M.noticeAge); });
  let guard = 0;
  while (!scene(state, 'servicePlan') && guard++ < 20) {
    elder.age = Math.max(elder.age, M.noticeAge);
    KP.advanceWeek(state);
  }
  const plan = scene(state, 'servicePlan');
  t.ok(plan, 'the folder with the flag on it reaches the desk');
  t.ok(state.serviceLedger && state.serviceLedger.plans >= 1, 'and it is ledgered');
  t.ok(/two answers/.test(KP.sceneDef('servicePlan').body(state, plan)), 'the body knows the industry');
  KP.resolveScene(state, plan.id, 'stagger');
  t.eq(g.servicePlan, 'stagger', 'the line holds, one at a time');
  // the papers follow for the man whose window is open
  guard = 0;
  while (!scene(state, 'enlistPapers') && guard++ < 8) KP.advanceWeek(state);
  const papers = scene(state, 'enlistPapers');
  t.ok(papers && papers.personId === elder.id, 'the papers name the eldest');
  t.ok(state.serviceLedger.notices >= 1, 'notice ledgered');
  // send him now: the flag, the clock, the room
  const mateMorale0 = state.people[ids[1]].morale;
  KP.resolveScene(state, papers.id, 'now');
  t.ok(elder.flags.military && elder.flags.military.until === state.week + M.serviceWeeks,
    'the window is a real date');
  t.ok(KP.onBreak(elder), 'every desk that books people sees him gone');
  t.ok(state.people[ids[1]].morale <= mateMorale0, 'the send-off hits the room');
  t.ok(state.inbox.some(n => n.ind === 'enlisted'), 'the wait has a calendar now');
  t.ok((elder.history || []).some(h => /Enlisted for mandatory service/.test(h.text)), 'on the record');
  // the contract clock pauses: one week in, one week back
  const gap0 = state.week - elder.contract.start;
  rideOut(state, 6);
  t.eq(state.week - elder.contract.start, gap0, 'the paper waits while he serves');
  // and the group works short-handed — nobody books the man who is away
  t.ok(!KP.moodOf(elder) || KP.moodOf(elder) === 'serving', 'the file says where he is');
}

// ---- the discharge and the return stage -------------------------------
{
  const M = KP.C.MIL;
  const { state, g, ids } = boyGroup('svc-return', [24, 24, 23, 23]);
  const man = state.people[ids[0]];
  g.servicePlan = 'stagger';
  man.flags.military = { since: state.week, until: state.week + 3 };
  const prof0 = man.personality.professionalism;
  rideOut(state, 4);
  t.ok(!man.flags.military && man.serviceDone, 'discharged on schedule, stamped durable');
  t.ok(man.personality.professionalism > prof0, 'the spine of steel came home with him');
  t.ok((man.history || []).some(h => /Discharged after/.test(h.text)), 'the gate photo is history');
  t.ok(state.serviceLedger.discharged >= 1 && state.serviceLedger.returns >= 1,
    'the ledger counts the return');
  t.ok(g.returnStage, 'the window is open — the next date is a RETURN');
  // the lock inside the window converts the wait into countdown
  let guard = 0;
  while ((g.prep || state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) && guard++ < 30) {
    KP.advanceWeek(state);
  }
  state.budget = Math.max(state.budget, 400);
  if (!g.demos) { const rng = KP.rngFor(state); g.demos = KP.generateDemos(state, rng, g); state.rngState = rng.state(); }
  const r = KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(r.ok !== false, 'fixture: the return comeback locks');
  t.ok(!g.returnStage, 'the moment is spent at lock');
  t.ok(g.prep && g.prep.buildup >= KP.C.MIL.returnBuildup, 'the wait converts to countdown');
  t.ok(state.inbox.some(n => /THE RETURN/.test(n.text)), 'and the announcement reads like a homecoming');
}

// ---- the wall: postponement runs out ----------------------------------
{
  const M = KP.C.MIL;
  const { state, g, ids } = boyGroup('svc-wall', [M.deadlineAge - 1, 22, 22, 21]);
  const man = state.people[ids[0]];
  g.servicePlan = 'stagger';
  man.flags.enlistPapers = state.week;   // the papers were held
  man.age = M.deadlineAge;
  KP.advanceWeek(state);
  t.ok(man.flags.military, 'the wall enlists him — no meeting required');
  t.ok(state.serviceLedger.walls >= 1, 'and the ledger knows it was the law, not the desk');
}

// ---- together: one wait, one loyal hiatus, one return -----------------
{
  const M = KP.C.MIL;
  const { state, g, ids } = boyGroup('svc-together', [M.noticeAge, 25, 24, 24]);
  let guard = 0;
  while (!scene(state, 'servicePlan') && guard++ < 20) {
    state.people[ids[0]].age = Math.max(state.people[ids[0]].age, M.noticeAge);
    KP.advanceWeek(state);
  }
  const plan = scene(state, 'servicePlan');
  t.ok(plan, 'fixture: the folder arrives');
  KP.resolveScene(state, plan.id, 'together');
  t.ok(g.pendingService, 'the joint date waits for the era to close');
  guard = 0;
  while (g.pendingService && guard++ < 30) KP.advanceWeek(state);
  const serving = ids.map(id => state.people[id]).filter(m => m.flags.military);
  t.eq(serving.length, 4, 'everybody of age went at once');
  t.ok(g.hiatus && g.hiatus.service, 'the group chapter closes officially');
  t.ok(state.inbox.some(n => /enlists TOGETHER/.test(n.text)), 'one statement');
  // the wait is loyal: the service hiatus never sets the cooling stamp
  rideOut(state, KP.C.HIATUS.graceWeeks + 10);
  t.ok(!g.hiatusCooledEver, 'nothing cools while the reason is the law');
  // no renewal tables reach men who are away
  t.ok(!(state.scenes || []).some(sc => sc.kind === 'renewal' &&
    ids.includes(sc.personId)), 'the renewal folder waits too');
  // ride to the discharges: the chapter ends on schedule
  rideOut(state, M.serviceWeeks);
  t.ok(ids.every(id => state.people[id].serviceDone), 'all four home');
  t.ok(g.hiatus && !g.hiatus.service && g.hiatus.graceFrom, 'the ordinary clock restarts at the gate');
  t.ok(g.returnStage, 'and the return window is open');
}

// ---- the desk has no verbs on a serving man ---------------------------
{
  const { state, g, ids } = boyGroup('svc-verbs', [24, 24, 23, 23]);
  const man = state.people[ids[0]];
  man.flags.military = { since: state.week, until: state.week + 60 };
  t.ok(!KP.terminateContract(state, man.id).ok, 'no buyouts on a soldier');
  t.ok(!KP.declareMemberBreak(state, man.id).ok, 'the state already scheduled the break');
  t.ok(!KP.removeFromLineup(state, g.id, man.id).ok, 'no lineup surgery mid-service');
}

// ---- the files catch up: the migration --------------------------------
{
  const { state, ids } = boyGroup('svc-migrate', [29, 24, 23, 23]);
  state.version = '0.9.22';
  delete state.people[ids[0]].serviceDone;
  KP.migrate(state);
  t.eq(state.people[ids[0]].serviceDone, 'prior', 'past the wall = recorded as served');
  t.ok(!state.people[ids[1]].serviceDone, 'the window men get the real feature instead');
  t.ok(state.inbox.some(n => /records reconciliation/.test(n.text)), 'legal owns the note');
}

// ---- determinism: the whole chapter forks clean -----------------------
{
  const M = KP.C.MIL;
  const { state: a, ids } = boyGroup('svc-fork', [M.noticeAge - 1, 24, 24, 23]);
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 90; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'papers, walls, buses, and gates fork clean');
}

t.finish();
