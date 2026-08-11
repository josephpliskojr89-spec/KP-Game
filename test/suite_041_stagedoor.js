/* Suite 041 — the stage door (v0.8.0).
   The interaction foundation: scenes (held decisions rendered through
   ONE rail), claims (promises with subjects, checked by registered
   predicate), and the directed-acts door (the substrate under "she
   remembers what YOU did"). The Monday meeting is the migrated proof
   — its behavior parity lives in suite_036; this suite tests the
   rails themselves. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_041_stagedoor');

function debuted(seed) {
  const state = KP.newGame(seed);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'DOOR', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  return { state, g };
}

// ---- registry contracts: loud failures at load, not quiet bugs --------
{
  t.ok(KP.sceneKinds().includes('execQuestion'), 'the meeting registered as the first customer');
  let threw = false;
  try { KP.registerScene('execQuestion', { title: () => '', body: () => '', options: () => [], resolve: () => ({}) }); }
  catch (e) { threw = /duplicate/.test(e.message); }
  t.ok(threw, 'duplicate scene kinds throw at registration');
  threw = false;
  try { KP.registerScene('halfBaked', { title: () => '' }); }
  catch (e) { threw = /registerScene/.test(e.message); }
  t.ok(threw, 'a scene without its full contract throws');
  threw = false;
  try { KP.registerClaim('readyTrainee', () => null); }
  catch (e) { threw = /duplicate/.test(e.message); }
  t.ok(threw, 'duplicate claim types throw');
  const s = KP.newGame('sd-contract');
  threw = false;
  try { KP.openScene(s, { kind: 'neverRegistered' }); }
  catch (e) { threw = /unregistered/.test(e.message); }
  t.ok(threw, 'opening an unregistered scene throws at the door');
  threw = false;
  try { KP.openClaim(s, { type: 'readyTrainee' }); }
  catch (e) { threw = /subject/.test(e.message); }
  t.ok(threw, 'a claim without a subject throws — someone must hold the receipt');
}

// ---- the scene lifecycle: open, refuse gently, resolve once -----------
{
  // a test kind, registered the way features will register
  let resolvedWith = null;
  KP.registerScene('testAsk', {
    title: () => 'Someone at the door',
    body: (s, sc) => sc.text,
    options: () => [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }],
    resolve: (s, sc, optionId) => { resolvedWith = optionId; return { toast: 'answered', note: { kind: 'company', text: 'The door closes softly.' } }; },
    expire: () => ({ kind: 'company', text: 'She stopped waiting.' }),
  });
  const s = KP.newGame('sd-life');
  const sc = KP.openScene(s, { kind: 'testAsk', text: 'A minute?' });
  t.ok(sc.id && sc.week === s.week, 'the scene gets an id and a week');
  t.eq(KP.sceneById(s, sc.id), sc, 'and can be found');
  t.ok(!KP.resolveScene(s, 'sc999', 'yes').ok, 'a vanished scene refuses gently');
  t.ok(!KP.resolveScene(s, sc.id, 'maybe').ok, 'an off-menu option refuses gently');
  const r = KP.resolveScene(s, sc.id, 'yes');
  t.ok(r.ok && r.toast === 'answered' && resolvedWith === 'yes', 'resolution runs the handler');
  t.eq((s.scenes || []).length, 0, 'and clears the queue');
  t.ok(s.inbox.some(n => /door closes softly/.test(n.text)), 'notes flow through the one stamping path');
}

// ---- expiry: silence is content -----------------------------------------
{
  const s = KP.newGame('sd-expire');
  KP.openScene(s, { kind: 'testAsk', text: 'Still there?', expiresWeek: s.week + 1 });
  KP.advanceWeek(s);
  t.eq(s.scenes.length, 1, 'not expired while the window is open');
  KP.advanceWeek(s);
  t.eq(s.scenes.length, 0, 'expired once the window closes');
  t.ok(s.inbox.some(n => /stopped waiting/.test(n.text)), 'and the silence is narrated');
}

// ---- claims: predicates fire once, the ledger stays bounded -----------
{
  KP.registerClaim('testPromise', (s, c) => {
    if (s.week >= c.byWeek) return { resolved: 'met', notes: [{ kind: 'company', text: 'Promise ' + c.id + ' kept.' }] };
    return null;
  });
  const s = KP.newGame('sd-claims');
  const c = KP.openClaim(s, { type: 'testPromise', subject: { kind: 'idol', id: 'p1' }, byWeek: s.week + 2 });
  t.ok(c.id && c.resolved === null, 'the claim opens unresolved');
  KP.advanceWeek(s);
  t.eq(s.claims[0].resolved, null, 'not checked into existence early');
  KP.advanceWeek(s);
  t.eq(s.claims[0].resolved, 'met', 'the predicate fires when true');
  t.eq(s.claims[0].resolvedWeek, s.week, 'and stamps when');
  const inboxHits = s.inbox.filter(n => /Promise .* kept/.test(n.text)).length;
  KP.advanceWeek(s);
  t.eq(s.inbox.filter(n => /Promise .* kept/.test(n.text)).length, inboxHits, 'and fires exactly once');
  // the bounded tail
  for (let i = 0; i < KP.C.SCENES.maxResolvedClaims + 5; i++) {
    KP.openClaim(s, { type: 'testPromise', subject: { kind: 'idol', id: 'p1' }, byWeek: s.week });
  }
  KP.advanceWeek(s);
  t.ok(s.claims.filter(c2 => c2.resolved).length <= KP.C.SCENES.maxResolvedClaims,
    'settled claims keep a bounded tail (' + s.claims.length + ' total)');
}

// ---- the meeting rides the rails: subject on the record ----------------
{
  const { state } = debuted('sd-meeting');
  let guard = 0;
  while (!KP.execScene(state) && guard++ < 15) KP.advanceWeek(state);
  t.ok(KP.execScene(state), 'the executive asks through the door');
  KP.answerMeeting(state, 0);
  const claim = (state.claims || [])[0];
  t.ok(!claim || claim.subject.kind === 'exec', 'her receipts say who holds them');
}

// ---- directed acts: one door, a bounded ledger, standing in words -----
{
  const { state, g } = debuted('sd-directed');
  const p = state.people[g.members[0]];
  KP.recordDirected(state, p.id, 'testKindness', 3);
  t.eq(p.directed.length, 1, 'the act is on her ledger');
  t.ok(KP.standingScore(state, p) > 2.9, 'fresh acts count in full');
  t.eq(KP.standingOf(state, p), 'she trusts the office', 'and standing speaks in words');
  // decay: kindnesses fade
  p.directed[0].week = state.week - KP.C.SCENES.directedHalfLifeWeeks;
  t.ok(Math.abs(KP.standingScore(state, p) - 1.5) < 0.01, 'a year-old act counts half');
  // the cap
  for (let i = 0; i < KP.C.SCENES.directedCap + 10; i++) KP.recordDirected(state, p.id, 'noise', 0);
  t.eq(p.directed.length, KP.C.SCENES.directedCap, 'the ledger is bounded');
  // wounds
  const q = state.people[g.members[1]];
  KP.recordDirected(state, q.id, 'testWound', -9);
  t.eq(KP.standingOf(state, q), 'counting the days', 'deep wounds read as what they are');
}

// ---- the writers: real systems feed the ledger -------------------------
{
  const { state, g } = debuted('sd-writers');
  // mediation success writes both ledgers
  const a = state.people[g.members[0]], b = state.people[g.members[1]];
  state.relationships[KP.pairKey(a, b)] = { score: -30, state: 'tense' };
  a.personality.professionalism = 90; b.personality.professionalism = 90;
  a.personality.warmth = 90; b.personality.warmth = 90;
  a.personality.dominance = 30; b.personality.dominance = 30;
  let cleared = false;
  for (let i = 0; i < 8 && !cleared; i++) {
    state.relationships[KP.pairKey(a, b)].score = -30;
    state.mediations = {};
    const r = KP.mediatePair(state, a.id, b.id);
    cleared = r.ok && r.outcome === 'cleared';
  }
  t.ok(cleared, 'fixture: a sit-down eventually clears');
  t.ok((a.directed || []).some(x => x.kind === 'mediated') && (b.directed || []).some(x => x.kind === 'mediated'),
    'both of them remember that the office made room');
  // releasing a close friend wounds the one left behind
  const s2 = KP.newGame('sd-friend');
  const x = s2.people[s2.roster[0]], y = s2.people[s2.roster[1]];
  s2.relationships = s2.relationships || {};
  s2.relationships[KP.pairKey(x, y)] = { score: 80, state: 'close' };
  KP.releaseTrainee(s2, x.id);
  t.ok((y.directed || []).some(d => d.kind === 'friendReleased' && d.w < 0),
    'she remembers WHO released her best friend');
}

// ---- migration: the old ledger crosses over ----------------------------
{
  const { state } = debuted('sd-mig');
  state.version = '0.7.6';
  state.execNotes = [{ type: 'comebackPromise', week: 2, groupId: state.groups[0].id, byWeek: 90, resolved: null }];
  state.execQuestion = { type: 'comebackPromise', week: state.week, groupId: state.groups[0].id,
    text: 'When?', options: [{ id: 'q1', label: 'This quarter' }, { id: 'none', label: 'No promises' }] };
  delete state.scenes; delete state.claims;
  const m = KP.deserialize(KP.serialize(state));
  t.ok(m.execNotes === undefined && m.execQuestion === undefined, 'the private ledgers are gone');
  t.eq(m.claims.length, 1, 'the promise crossed over');
  t.eq(m.claims[0].subject.kind, 'exec', 'with its receipt-holder named');
  t.eq(m.scenes.length, 1, 'the pending question re-opened as a scene');
  t.ok(m.inbox.some(n => /stage door/.test(n.text)), 'and the desk explains the new door');
}

// ---- determinism: pending scenes, open claims, the door forks clean ----
{
  const mk = () => {
    const { state } = debuted('sd-fork');
    KP.openClaim(state, { type: 'testPromise', subject: { kind: 'idol', id: 'p1' }, byWeek: state.week + 40 });
    return state;
  };
  const a = mk();
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 25; w++) {
    KP.advanceWeek(a); KP.advanceWeek(b);
    if (KP.execScene(a)) KP.answerMeeting(a, 0);
    if (KP.execScene(b)) KP.answerMeeting(b, 0);
  }
  t.eq(KP.serialize(a), KP.serialize(b), 'the stage door forks clean');
}

t.finish();
