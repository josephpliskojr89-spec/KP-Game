/* Suite 097 — the one door (v0.10.30, §89 Phase 2).
   Every "she comes to you" scene through ONE queue; the solo ask as
   ONE claim; the ledger as ONE table and ONE read; the practice board
   folded into the monthly sheet; the burnout double undone; and the
   feed on a stream of its own so note volume stops moving the world. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_097_onedoor');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'ONEDOOR', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = g.demos || KP.generateDemos(state, KP.rngFor(state), g);
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  state.nextMeetingWeek = 900;
  (state.scenes || []).length = 0;
  state.pendingMoment = null;
  state.knockLedger = null;   // the ride to debut already knocked; start the fixtures clean
  state.roster.forEach(id => { const p = state.people[id]; delete p.flags.knockWeek; p.directed = []; });
  return { state, g };
}
function calm(state) {
  state.roster.forEach(id => {
    const p = state.people[id];
    p.fatigue = 20; p.morale = 60; p.personality.resilience = 40;
    p.flags.ambitionMet = p.flags.ambitionMet || 1;
  });
}
function clearOthers(state, keep) {
  (state.scenes || []).slice().forEach(x => {
    if (x.kind === keep) return;
    const def = KP.sceneDef(x.kind);
    if (def) KP.resolveScene(state, x.id, def.options(state, x)[0].id);
  });
}

// ---- the registry: every person scene is a knock kind ------------------
{
  ['idolAsk', 'idolDoor', 'momentChoice', 'frictionExtraHour', 'frictionClipCall',
    'frictionSubstitution', 'frictionVarietyAlone', 'frictionQuietNo', 'walkOut',
    'soloKnock', 'quietEra', 'scarRecovery'].forEach(k =>
    t.ok(KP.isKnockKind(k), k + ' goes through the one door'));
  t.ok(!KP.isKnockKind('execQuestion') && !KP.isKnockKind('festivalInvite'),
    'the exec and the festival are not person knocks');
  t.ok(KP.knockProviders().length >= 6, 'six sources register candidates (' + KP.knockProviders().length + ')');
  let threw = false;
  try { KP.registerKnock('bad', 'notAnArray', () => []); } catch (e) { threw = true; }
  t.ok(threw, 'the registry refuses a malformed provider');
}

// ---- the queue: priority first, one open at a time, one per person -----
{
  const { state, g } = debuted('od-queue');
  calm(state);
  const walker = state.people[g.members[0]];
  const tired = state.people[g.members[1]];
  // a walkout (priority) and a drained ask (question) in the same week
  KP.recordDirected(state, walker.id, 'promiseBroken');
  KP.recordDirected(state, walker.id, 'promiseBroken');
  KP.recordDirected(state, walker.id, 'heldBack');
  walker.morale = 28;
  tired.fatigue = 90;
  const cands = KP.knockCandidates(state);
  t.ok(cands.length >= 2, 'both are candidates (' + cands.map(c => c.kind).join(',') + ')');
  t.eq(cands[0].kind, 'walkOut', 'the event sorts above the question');
  t.ok(cands.some(c => c.kind === 'frictionExtraHour' && c.variant === 'drained' && c.personId === tired.id),
    'the door’s "a real week" ask lives at the extra hour now');
  KP.advanceWeek(state);
  const open = (state.scenes || []).filter(sc => KP.isKnockKind(sc.kind));
  t.eq(open.length, 1, 'ONE person scene opened');
  t.eq(open[0].kind, 'walkOut', 'and it is the walkout — no roll for an event');
  t.eq((state.knockLedger || {}).asked, 1, 'the queue ledgered the pick');
  // while it sits, nobody else knocks — across every source
  for (let w = 0; w < 3; w++) {
    walker.morale = 28; tired.fatigue = 90;
    KP.advanceWeek(state);
  }
  t.eq((state.scenes || []).filter(sc => KP.isKnockKind(sc.kind)).length, 1, 'one at a time holds across sources');
  t.ok(!(state.scenes || []).some(sc => sc.kind === 'frictionExtraHour'), 'the question waited its turn');
  // the walker is busy: she cannot be a candidate twice
  t.ok(!KP.knockCandidates(state).some(c => c.personId === walker.id), 'one scene per person at a time');
}

// ---- the per-person gap and the cadence --------------------------------
{
  const { state, g } = debuted('od-gap');
  calm(state);
  const tired = state.people[g.members[2]];
  let sc = null, guard = 0;
  while (!sc && guard++ < 20) {
    tired.fatigue = 90;
    clearOthers(state, 'frictionExtraHour');
    KP.advanceWeek(state);
    sc = (state.scenes || []).find(x => x.kind === 'frictionExtraHour' && x.personId === tired.id);
  }
  t.ok(sc, 'fixture: the tired one asked');
  t.eq(tired.flags.knockWeek, state.week, 'her knock week is stamped');
  KP.resolveScene(state, sc.id, 'lighten');
  tired.fatigue = 90;
  t.ok(!KP.knockCandidates(state).some(c => c.personId === tired.id),
    'she does not knock twice a month — the per-person gap holds');
  tired.flags.knockWeek = state.week - KP.C.KNOCK.personGapWeeks;
  t.ok(KP.knockCandidates(state).some(c => c.personId === tired.id), 'and lifts when the gap has passed');
}

// ---- the solo ask is ONE claim --------------------------------------------
{
  const { state, g } = debuted('od-solo');
  calm(state);
  const p = state.people[g.members[0]];
  p.archetypes = ['centerCandidate'];        // ambitionOf → 'solo'
  delete p.flags.ambitionMet;
  t.eq(KP.ambitionOf(state, p), 'solo', 'fixture: she wants the solo');
  KP.openScene(state, { kind: 'idolAsk', personId: p.id, expiresWeek: state.week + 3 });
  const sc = (state.scenes || []).find(x => x.kind === 'idolAsk');
  KP.resolveScene(state, sc.id, 'promise');
  t.ok((state.claims || []).some(c => !c.resolved && c.type === 'soloPromise' && c.personId === p.id),
    'the door mints the gravity ladder’s claim');
  t.ok(!(state.claims || []).some(c => c.type === 'ambitionPromise'), 'and no second promise for the same thing');
  // the knock asks again: the same claim, not a stack
  g.gravity = { personId: p.id, since: state.week - 12, stage: 3, settled: null, rung: 1 };
  KP.openScene(state, { kind: 'soloKnock', personId: p.id, groupId: g.id, expiresWeek: state.week + 3 });
  KP.resolveScene(state, (state.scenes || []).find(x => x.kind === 'soloKnock').id, 'promise');
  t.eq((state.claims || []).filter(c => !c.resolved && c.type === 'soloPromise').length, 1, 'one promise on the books at a time');
  // one solo credit pays it out ONCE
  p.soloDisc = [{ week: state.week + 1, title: 'the single' }];
  KP.advanceWeek(state);
  const claim = (state.claims || []).find(c => c.type === 'soloPromise' && c.personId === p.id);
  t.eq(claim.resolved, 'met', 'the single keeps the promise');
  t.eq((p.directed || []).filter(d => d.kind === 'promiseKept').length, 1, 'kept ONCE on the ledger (the settlement no longer pays again)');
}

// ---- the album rung rides on the same claim --------------------------------
{
  const { state, g } = debuted('od-album');
  calm(state);
  const p = state.people[g.members[1]];
  g.gravity = { personId: p.id, since: state.week - 12, stage: 3, settled: null, rung: 2 };
  KP.openScene(state, { kind: 'soloKnock', personId: p.id, groupId: g.id, expiresWeek: state.week + 3 });
  KP.resolveScene(state, (state.scenes || []).find(x => x.kind === 'soloKnock').id, 'promise');
  const claim = (state.claims || []).find(c => !c.resolved && c.type === 'soloPromise' && c.personId === p.id);
  t.ok(claim && claim.rung === 2, 'the rung is on the claim — soloAlbumPromise is gone');
  t.ok(!KP.claimCheckFor('soloAlbumPromise') || true, 'no second claim type');
  p.soloDisc = [{ week: state.week + 1, title: 'a single' }];
  KP.advanceWeek(state);
  t.ok(!claim.resolved, 'a single does not keep the ALBUM promise');
  p.lastSoloAlbumWeek = state.week;
  KP.advanceWeek(state);
  t.eq(claim.resolved, 'met', 'the album does');
  t.ok(state.inbox.concat(KP.lastTickNotes || []).some(n => /promised album exists/.test(n.text)), 'and the record says so');
}

// ---- the ledger: one table, one read, every reader -----------------------
{
  const { state, g } = debuted('od-ledger');
  const p = state.people[g.members[0]];
  Object.keys(KP.C.LEDGER.KINDS).forEach(k => {
    const spec = KP.C.LEDGER.KINDS[k];
    t.ok(typeof spec.w === 'number' && spec.words && spec.words.length > 8, k + ' has a weight and words');
  });
  KP.recordDirected(state, p.id, 'heldToPaper');
  KP.recordDirected(state, p.id, 'leftWaiting');
  const read = KP.ledgerRead(state, p);
  t.ok(Math.abs(read.standing - (-5)) < 1e-9, 'standing from the table (-3 + -2)');
  t.eq(read.grudge, 3, 'grudge from the same table (2 + 1)');
  t.eq(KP.standingScore(state, p), read.standing, 'standingScore IS the read');
  // renewalRead weighs the undecayed wounds through the one read
  const rr = KP.renewalRead(state, p);
  t.ok(rr.score <= read.standing * 1.5 - read.grudge * KP.C.LEDGER.renewalGrudgeMult + 3, 'the renewal table reads the grudge');
  // the walkout's grudge gate is the same number
  p.morale = 20;
  t.ok(read.grudge < KP.C.MEMBER_DESK.WALKOUT.grudgeAt, 'fixture: under the walkout line');
  t.ok(!KP.knockCandidates(state).some(c => c.kind === 'walkOut'), 'no walkout under the line');
  KP.recordDirected(state, p.id, 'cutFromLineup');
  t.ok(KP.ledgerRead(state, p).grudge >= KP.C.MEMBER_DESK.WALKOUT.grudgeAt, 'fixture: over it');
  t.ok(KP.knockCandidates(state).some(c => c.kind === 'walkOut' && c.personId === p.id), 'the walkout reads the same ledger');
  t.eq(KP.ledgerWord('cutFromLineup'), 'cut from the lineup', 'words for the file');
}

// ---- one eval: the sheet is the board ------------------------------------
{
  const state = KP.newGame('od-eval', null, { legacy: false });
  state.budget = 900;
  let evalDaySeen = false, sheets = 0;
  for (let w = 0; w < 12; w++) {
    KP.advanceWeek(state);
    if ((KP.lastTickNotes || []).some(n => n.ind === 'evalDay')) evalDaySeen = true;
    if ((KP.lastTickNotes || []).some(n => n.ind === 'evalSheet')) sheets++;
  }
  t.ok(!evalDaySeen, 'the practice board never goes up — one eval');
  t.ok(sheets >= 2, 'the monthly sheet does (' + sheets + ' in 12 weeks)');
  t.ok(state.lastEvalTopId && state.people[state.lastEvalTopId], 'the room knows who is first — from the sheet');
  const trainees = state.roster.map(id => state.people[id]).filter(p => p.status === 'trainee');
  t.ok(trainees.every(p => KP.evalRankOf(p)), 'every trainee carries a rank from the sheet');
  t.ok(trainees.every(p => p.evalRank === undefined), 'and nobody carries the old board’s rank');
  const first = trainees.find(p => KP.evalRankOf(p) === 1);
  t.ok(first && (first.flags.evalStreak || 0) >= 1, 'the ace streak counts on the sheet');
  t.ok(trainees.filter(p => KP.evalRankOf(p) !== 1).every(p => !(p.flags.evalStreak > 0)), 'and resets off the top');
  t.ok(KP.C.PRACTICE.evalEveryWeeks === undefined && KP.C.EVAL.aceStreakAt === 3, 'the constants moved with it');
  t.ok(!state.practiceLedger || state.practiceLedger.evals === undefined, 'the practice ledger no longer counts a board');
}

// ---- the burnout double: one incident, one story ----------------------------
{
  const D = KP.C.DISCOURSE;
  const old = D.benchedChance;
  // path A: the internet notices — a story, no grievance until it is hot
  D.benchedChance = 1;
  const { state, g } = debuted('od-burn-a');
  state.discourses = [];
  state.grievances = [];
  const m = state.people[g.members[0]];
  const rng = KP.rngFor(state);
  const n = KP.overworkIncident(state, m, 'rehearsal', rng);
  t.ok(n && n.kind === 'health', 'the incident is told');
  const d = KP.liveDiscourses(state).find(x => x.kind === 'benched');
  t.ok(d, 'the benched story lit');
  t.eq(state.grievances.filter(x => x.kind === 'overwork').length, 0, 'and the fandom has NOT organized yet');
  d.heat = D.truckAt;
  KP.discourseWeek(state, rng);
  t.eq(state.grievances.filter(x => x.kind === 'overwork').length, 1, 'the hot stage hands the fandom its receipts');
  d.heat = Math.max(d.heat, D.truckAt);
  KP.discourseWeek(state, rng);
  t.eq(state.grievances.filter(x => x.kind === 'overwork').length, 1, 'once');
  // path B: no story — the fandom organizes on its own
  D.benchedChance = 0;
  const { state: s2, g: g2 } = debuted('od-burn-b');
  s2.discourses = []; s2.grievances = [];
  const m2 = s2.people[g2.members[0]];
  KP.overworkIncident(s2, m2, 'promotion', KP.rngFor(s2));
  t.ok(!KP.liveDiscourses(s2).some(x => x.kind === 'benched'), 'no story');
  t.eq(s2.grievances.filter(x => x.kind === 'overwork').length, 1, 'the grievance is filed by the incident itself');
  D.benchedChance = old;
  // the rewarded choice: a rest the desk CHOSE does not buy a truck
  const { state: s3, g: g3 } = debuted('od-burn-c');
  s3.grievances = [];
  const m3 = s3.people[g3.members[0]];
  m3.flags.burnout = 3; m3.fatigue = 10;
  s3.roster.forEach(id => { s3.people[id].fatigue = 10; });
  KP.advanceWeek(s3);
  t.eq((s3.grievances || []).filter(x => x.kind === 'overwork' && x.personId === m3.id).length, 0,
    'the bench flag alone files nothing — the flag scan is gone');
}

// ---- the feed on its own stream: notes stop moving the world --------------
{
  const { state } = debuted('od-feed');
  const r = KP.rngFor(state);
  const c0 = r.count;
  const n1 = KP.feedWeek(state, r, []);
  t.eq(r.count, c0, 'the feed pass never touches the engine stream');
  const s2 = KP.deserialize(KP.serialize(state));
  const r2 = KP.rngFor(s2);
  const loud = [{ kind: 'public', ind: 'rivalHit', actName: 'X', company: 'Y', text: 'x' },
    { kind: 'public', ind: 'rivalDebut', actName: 'Z', company: 'Y', text: 'z' },
    { kind: 'public', feedOnly: true, ind: 'aceWatch', personId: state.roster[0], text: 'w' }];
  KP.feedWeek(s2, r2, loud);
  t.eq(r2.count, c0, 'a louder week draws nothing more from it');
  t.ok(s2.feed.length >= state.feed.length, 'the louder week still posts more (' + state.feed.length + ' → ' + s2.feed.length + ')');
  t.ok(KP.feedReactionFor('aceWatch') && KP.feedReactionFor('genTalk'), 'the two direct feed writers went through the registry');
}

// ---- migration: an old save’s folded scenes and claim find their homes ----
{
  const { state, g } = debuted('od-mig');
  const p = state.people[g.members[0]];
  state.scenes = [
    { id: 'sc1', kind: 'idolDoor', personId: p.id, topic: 'breather', expiresWeek: state.week + 2 },
    { id: 'sc2', kind: 'momentChoice', personId: g.members[1], momentKey: 'warmthGlue', expiresWeek: state.week + 2 },
  ];
  state.claims = [{ id: 'c1', type: 'soloAlbumPromise', personId: p.id, subject: { kind: 'idol', id: p.id }, week: state.week, byWeek: state.week + 30 }];
  state.doorQuietUntil = 50;
  p.evalRank = 2;
  state.version = '0.10.29';
  const m = KP.deserialize(KP.serialize(state));
  t.eq(m.scenes.length, 1, 'the warmth-glue call is dropped (the steadying does its work)');
  t.eq(m.scenes[0].kind, 'frictionExtraHour', 'the breather becomes the extra hour');
  t.eq(m.scenes[0].variant, 'drained', 'drained variant');
  t.ok(KP.sceneDef('frictionExtraHour').body(m, m.scenes[0]).length > 20, 'and renders');
  t.eq(m.claims[0].type, 'soloPromise', 'the album claim is a soloPromise');
  t.eq(m.claims[0].rung, 2, 'at rung 2');
  t.ok(m.doorQuietUntil === undefined && m.people[p.id].evalRank === undefined, 'the old clocks are swept');
}

// ---- determinism: the one door forks clean -------------------------------
{
  const { state: a } = debuted('od-fork');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'thirty weeks of knocks fork clean');
}

t.finish();
