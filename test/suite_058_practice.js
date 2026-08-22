/* Suite 058 — the practice room years + the regional schools (v0.9.16).
   The pipeline gets addresses: persistent academies whose reputations
   move with their graduates, submitting classes whenever casting opens.
   And trainee life gets weather: evaluation days, project speculation,
   the resignation letter, and the aging-out clock with all three
   endings. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_058_practice');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'ROOMS', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  return { state, g };
}

// ---- the map exists on day one ----
{
  const state = KP.newGame('pr-map', null, { legacy: false });
  t.eq((state.schools || []).length, KP.C.TOUR.KR_CITIES.length, 'one school per home-circuit city');
  const lanes = new Set(state.schools.map(s => s.lane));
  t.ok(lanes.has('vocals') && lanes.has('dance'), 'the vocal and dance lanes both exist somewhere');
  t.eq(new Set(state.schools.map(s => s.name)).size, state.schools.length, 'every school has its own name');
  state.schools.forEach(s => t.ok(s.rep >= 0 && s.rep <= 100, s.name + ' rep in range'));
}

// ---- the school lead: stamped, laned, and shaped by reputation ----
{
  const state = KP.newGame('pr-lead', null, { legacy: false });
  const rng = KP.rngFor(state);
  const school = state.schools.find(s => s.lane === 'vocals') || state.schools[0];
  school.rep = 90;   // a hot school drills its class
  const p = KP.spawnSchoolLead(state, rng, school, {});
  state.rngState = rng.state();
  t.eq(p.schoolId, school.id, 'the file carries the school');
  t.ok(state.prospects.includes(p.id), 'and lands on the board');
  KP.C.TALENTS.forEach(k => {
    const tal = p.talents[k];
    t.ok(tal.cur < tal.ceilLo, k + ': the rep bonus never breaks the cone');
  });
}

// ---- the scouting trip ----
{
  const state = KP.newGame('pr-trip', null, { legacy: false });
  const school = state.schools[0];
  const before = state.budget;
  const boardFromSchool = state.prospects.map(id => state.people[id]).filter(p => p.schoolId === school.id);
  const obsBefore = boardFromSchool.map(p => p.observations || 0);
  const r = KP.scoutingTrip(state, school.id);
  t.ok(r.ok, 'the train ran');
  t.eq(state.budget, before - KP.C.SCHOOLS.tripCost, 'the trip costs what it costs');
  boardFromSchool.forEach((p, i) => t.ok((p.observations || 0) >= Math.min(obsBefore[i] + 1, KP.C.SCOUT.maxObservations),
    'the visit sharpened the read on ' + p.name.display));
  t.ok(state.prospects.map(id => state.people[id]).some(p => p.schoolId === school.id && !boardFromSchool.includes(p)),
    'and one new name came home in the notebook');
  const r2 = KP.scoutingTrip(state, school.id);
  t.ok(!r2.ok, 'a second visit the same month reads as desperation');
  // one trip per week (0.9.16.1): a DIFFERENT school also refuses —
  // Scout Im is one person on one train
  const other = state.schools.find(s => s.id !== school.id);
  const r3 = KP.scoutingTrip(state, other.id);
  t.ok(!r3.ok && /already on a train/.test(r3.reason), 'one trip per week — the scout is not a teleporter');
  KP.advanceWeek(state);
  t.ok(KP.scoutingTrip(state, other.id).ok, 'next week the train runs again');
}

// ---- the partnership: first look means first ----
{
  const state = KP.newGame('pr-partner', null, { legacy: false });
  const school = state.schools[0];
  const r = KP.schoolPartnership(state, school.id);
  t.ok(r.ok && school.partnerUntil > state.week, 'the retainer buys the window');
  t.ok(!KP.schoolPartnership(state, school.id).ok, 'one agreement at a time per school');
  const rng = KP.rngFor(state);
  const lead = KP.spawnSchoolLead(state, rng, school, { firstLook: true });
  state.rngState = rng.state();
  t.ok(lead.flags.firstLookUntil > state.week, 'the lead arrives protected');
  t.ok((lead.observations || 0) >= KP.C.SCHOOLS.partnerObs, 'and pre-read');
  // rivals cannot open interest on a protected file — the picker skips it
  for (let w = 0; w < 3; w++) KP.advanceWeek(state);
  const heat = KP.rivalHeat(state, lead.id).max;
  t.eq(heat, 0, 'no rival circled the protected lead while the window held');
}

// ---- the alumni ledger and the moving reputation ----
{
  const state = KP.newGame('pr-alum', null, { legacy: false });
  const school = state.schools[0];
  const pid = state.prospects.find(id => state.people[id]);
  const p = state.people[pid];
  p.schoolId = school.id;
  KP.signProspect(state, pid);
  t.ok(school.alumni.some(a => a.personId === pid), 'the signing photo goes up in the lobby');
  // an alum reaching a debut stage moves the number
  const repBefore = school.rep;
  p.status = 'idol';
  KP.advanceWeek(state);
  t.ok(school.rep > repBefore, 'the school feels the debut (' + repBefore + ' → ' + school.rep + ')');
  // the it-girl crossing makes it HOT, and the trades say so
  school.rep = KP.C.SCHOOLS.hotAt - 2;
  KP.recordEvidence(state, 'itGirl', 'idol', pid);
  KP.advanceWeek(state);
  t.ok(school.hot, 'the it-girl came out of this hallway — the school is hot');
  t.ok(state.inbox.some(n => n.ind === 'schoolHot'), 'and the trades made it official');
  t.ok(KP.feedReactionFor('schoolHot'), 'the timeline answers through the registry');
}

// ---- migration: old worlds get the map on the next tick ----
{
  const state = KP.newGame('pr-old', null, { legacy: false });
  delete state.schools;
  const revived = KP.deserialize(KP.serialize(state));
  KP.advanceWeek(revived);
  t.eq((revived.schools || []).length, KP.C.TOUR.KR_CITIES.length, 'an old save grows the schools in one tick');
}

// ---- evaluation day: the board goes up and the room reads it ----
{
  const state = KP.newGame('pr-eval', null, { legacy: false });
  let guard = 0;
  while (((state.week - 1) % KP.C.PRACTICE.evalEveryWeeks) !== 0 || (state.practiceLedger || {}).evals === undefined) {
    KP.advanceWeek(state);
    if (guard++ > 8) break;
  }
  while ((state.practiceLedger || { evals: 0 }).evals < 1 && guard++ < 8) KP.advanceWeek(state);
  t.ok(state.practiceLedger.evals >= 1, 'the board went up');
  const trainees = state.roster.map(id => state.people[id]).filter(p => p.status === 'trainee');
  const ranks = trainees.map(p => p.evalRank).filter(Boolean).sort((a, b) => a - b);
  t.eq(ranks.length, trainees.length, 'every trainee has a line on the board');
  t.eq(ranks[0], 1, 'somebody is first');
  t.ok(state.lastEvalTopId, 'and the room knows who');
}

// ---- the speculation: a project opens and the room does the math ----
{
  const state = KP.newGame('pr-spec', null, { legacy: false });
  KP.advanceWeek(state); KP.advanceWeek(state); KP.advanceWeek(state); KP.advanceWeek(state);
  const ids = state.roster.slice(0, 2);
  KP.openProject(state, ids, ['vocals', 'dance']);
  KP.advanceWeek(state);
  t.ok(state.project.speculated, 'the practice room found out');
  t.eq(state.practiceLedger.speculations, 1, 'ledgered');
  t.ok(state.inbox.some(n => n.ind === 'projectTalk'), 'and it got told');
}

// ---- the passed-over ace: everyone saw the board, everyone saw the list ----
{
  const state = KP.newGame('pr-ace', null, { legacy: false });
  const ace = state.people[state.roster[5]];
  state.lastEvalTopId = ace.id;
  ace.evalRank = 1;
  const morale0 = ace.morale;
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'LIST', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  t.ok(ace.morale < morale0, 'first on the board, not on the list — it lands');
  t.ok(ace.history.some(h => /without/.test(h.text) && /name/.test(h.text)), 'and the file remembers the silence');
}

// ---- the resignation letter: all three answers ----
{
  const { state } = debuted('pr-quit');
  const p = state.people[state.roster.find(id => state.people[id].status === 'trainee')];
  t.ok(p, 'fixture: one trainee stayed behind');
  p.morale = 20;
  p.signedWeek = state.week - 100;
  const P = KP.C.PRACTICE;
  const oldChance = P.quitBaseChance;
  P.quitBaseChance = 1;
  KP.advanceWeek(state);
  P.quitBaseChance = oldChance;
  const sc = (state.scenes || []).find(x => x.kind === 'traineeQuit');
  t.ok(sc, 'the letter reached the desk');
  t.eq(state.practiceLedger.quitsAsked, 1, 'ledgered');
  // fork A: accept — she leaves on her own terms
  const a = KP.deserialize(KP.serialize(state));
  KP.resolveScene(a, a.scenes.find(x => x.kind === 'traineeQuit').id, 'accept');
  const pa = a.people[p.id];
  t.eq(pa.status, 'released', 'accepted: she is gone');
  t.ok(pa.history.some(h => /own terms/.test(h.text)), 'with the room’s respect on the file');
  t.eq(a.practiceLedger.gone, 1, 'the ledger counts the empty chair');
  // fork B: promise — a claim with an expiry date
  const b = KP.deserialize(KP.serialize(state));
  KP.resolveScene(b, b.scenes.find(x => x.kind === 'traineeQuit').id, 'promise');
  const claim = (b.claims || []).find(c => c.type === 'debutByPromise' && !c.resolved);
  t.ok(claim, 'the promise is on the record');
  t.ok(b.people[p.id].status === 'trainee', 'and she stayed to see it kept');
  claim.byWeek = b.week - 1;   // the window closes with no lineup
  KP.advanceWeek(b);
  t.eq(b.people[p.id].status, 'released', 'the expired promise is a resignation nobody had to write twice');
  // fork C: the week off buys a quiet season
  const c = KP.deserialize(KP.serialize(state));
  KP.resolveScene(c, c.scenes.find(x => x.kind === 'traineeQuit').id, 'plead');
  t.ok(c.people[p.id].flags.pleadQuietUntil > c.week, 'a week is not an answer. it is a week');
}

// ---- the aging-out clock: the doorway, the question, the endings ----
{
  const state = KP.newGame('pr-age', null, { legacy: false });
  const watcher = state.people[state.roster[5]];
  watcher.signedWeek = -100;   // years on the clock before the debut lands
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'DOORWAY', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) {
    // the talk is a ONE-SHOT blocked by any scene already on her —
    // keep her slot clear so the mechanism under test can fire
    state.scenes = (state.scenes || []).filter(x => x.personId !== watcher.id);
    KP.advanceWeek(state);
  }
  t.ok(watcher.flags.agingOut, 'the clock started when the debut walked past her');
  t.ok(watcher.history.some(h => /doorway/.test(h.text)), 'the doorway is on the file');
  t.eq(state.practiceLedger.agingFaced, 1, 'ledgered');
  let sc = (state.scenes || []).find(x => x.kind === 'agingOutTalk');
  let scGuard = 0;   // the talk arrives on its own clock — stream shifts move the week
  while (!sc && scGuard++ < 8) {
    KP.advanceWeek(state);
    sc = (state.scenes || []).find(x => x.kind === 'agingOutTalk');
  }
  t.ok(sc && sc.personId === watcher.id, 'the question reached the desk');
  // ending: the kind cut
  const cut = KP.deserialize(KP.serialize(state));
  KP.resolveScene(cut, cut.scenes.find(x => x.kind === 'agingOutTalk').id, 'release');
  t.eq(cut.people[watcher.id].status, 'released', 'the kind cut opens the door outward');
  // ending: the last-chance debut — the story everyone wants
  const last = KP.deserialize(KP.serialize(state));
  KP.resolveScene(last, last.scenes.find(x => x.kind === 'agingOutTalk').id, 'promise');
  const w2 = last.people[watcher.id];
  KP.openMandate(last, { kind: 'solo', source: 'fixture greenlight' });
  KP.proposeGroup(last, 'FINALLY', [w2.id], {});
  const g2 = last.groups.find(x => x.name === 'FINALLY');
  KP.planDebut(last, { groupId: g2.id, songId: g2.demos[0].id, promo: 'modest',
    week: last.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  guard = 0;
  while (!g2.debuted && guard++ < 10) KP.advanceWeek(last);
  t.ok(w2.history.some(h => /Debuted\. After/.test(h.text)), 'the first bow lasted a beat longer');
  t.ok(KP.getNarrative(last, 'lastChanceDebut', 'idol', w2.id), 'the world writes the long road down');
  t.eq(last.practiceLedger.lastChance, 1, 'ledgered');
  t.ok((last.claims || []).some(cl => cl.type === 'debutByPromise' && cl.resolved === 'met'),
    'and the promise resolved KEPT');
  t.eq(KP.validateState(last).length, 0, 'no integrity cost across all of it');
}

// ---- determinism ----
{
  const { state: a } = debuted('pr-fork');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 40; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'schools, boards, and letters fork clean');
}

t.finish();
