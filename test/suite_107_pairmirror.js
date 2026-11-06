/* Suite 107 — the pair and the mirror (v0.10.40, §88 D + E). Two-person
   content, playable: the mentorship (the warm veteran brings the
   struggling rookie along — faster growth, a warming pair, both files),
   the writing pair (two pens; the next song either writes carries both
   names and the bond lands), the seating chart (a feud kept apart cools
   faster, draws the distance watch less, makes the sit-down likelier),
   the in-group rivalry framed (the edge while morale holds; the room
   sours when it slips). The mirror: the directed ledger aggregated and
   said out loud, gating the quiet no and the knock's timing. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_107_pairmirror');

function legacy(seed) {
  const s = KP.newGame(seed, null, { legacy: true });
  s.budget = 500;
  const g = s.groups[0];
  const ms = g.members.map(id => s.people[id]);
  KP.relationsWeek(s, ms, KP.rngFor(s));   // the pair scores exist
  return { s, g, ms };
}
function setRel(s, a, b, score, extra) {
  s.relationships = s.relationships || {};
  s.relationships[KP.pairKey(a, b)] = Object.assign({ score, state: KP.relState(score).key }, extra || {});
  return s.relationships[KP.pairKey(a, b)];
}

// ---- the mentorship ------------------------------------------------------------
{
  const { s, g, ms } = legacy('pm-mentor');
  const rookie = ms[ms.length - 1], vet = ms[0];
  ms.forEach(m => { m.morale = 70; m.personality.warmth = 40; m.liveExp = 20; m.age = 22; });
  t.ok(!KP.mentorshipRead(s, g.id).ok, 'a content room needs no mentor');
  rookie.morale = 40; rookie.liveExp = 2; rookie.age = 18;
  t.ok(/No warm veteran/.test(KP.mentorshipRead(s, g.id).reason), 'a struggling rookie with no warm veteran ahead: nobody to pair');
  vet.personality.warmth = 75; vet.liveExp = 40; vet.age = 24;
  const mr = KP.mentorshipRead(s, g.id);
  t.ok(mr.ok && mr.mentor.id === vet.id && mr.mentee.id === rookie.id, 'the warm veteran ahead of the low rookie is the pair the desk proposes');
  t.ok(!KP.assignMentor(s, g.id, rookie.id, vet.id).ok, 'a rookie cannot mentor the veteran');
  const budget0 = s.budget;
  const r = KP.assignMentor(s, g.id, vet.id, rookie.id);
  t.ok(r.ok && g.mentorship && g.mentorship.mentor === vet.id && rookie.flags.mentoredBy === vet.id && s.budget < budget0, 'paired, billed, flagged');
  t.ok((rookie.directed || []).some(d => d.kind === 'mentored') && (vet.directed || []).some(d => d.kind === 'trustedToMentor'), 'both ledgers remember');
  t.ok(!KP.assignMentor(s, g.id, vet.id, ms[1].id).ok, 'one mentorship a room');
  const rel0 = s.relationships[KP.pairKey(vet, rookie)].score;
  KP.advanceWeek(s);
  t.ok(s.relationships[KP.pairKey(vet, rookie)].score > rel0, 'the pair warms');
  let guard = 0;
  while (g.mentorship && guard++ < 14) KP.advanceWeek(s);
  t.ok(!g.mentorship && !rookie.flags.mentoredBy && rookie.flags.mentoredUntil, 'it ends on its clock and the rookie is handed back');
  t.ok(s.pairLedger.mentorships === 1 && s.pairLedger.mentorEnded === 1, 'ledgered');
  t.ok(rookie.history.some(h => /mentorship ran its course|bring .* along/.test(h.text)), 'the file remembers');
  rookie.morale = 30;
  t.ok(/recent/.test(KP.mentorshipRead(s, g.id).reason || '') || !KP.mentorshipRead(s, g.id).ok, 'the cooldown holds');
}

// ---- the writing pair --------------------------------------------------------
{
  const { s, g, ms } = legacy('pm-write');
  ms.forEach(m => { m.personality.creativity = 30; m.archetypes = (m.archetypes || []).filter(a => a !== 'producerMinded'); });
  t.ok(/Nobody .* writes/.test(KP.writingPairRead(s, g.id).reason), 'no pens, no pair');
  ms[0].personality.creativity = 85; ms[1].personality.creativity = 85;
  const wr = KP.writingPairRead(s, g.id);
  t.ok(wr.ok && [wr.a.id, wr.b.id].sort().join() === [ms[0].id, ms[1].id].sort().join(), 'two pens make a pair');
  t.ok(KP.pairWriters(s, g.id, ms[0].id, ms[1].id).ok && g.writingPair, 'paired');
  t.eq(KP.coWriterFor(s, g, ms[0].id), ms[1].id, 'the pen’s partner is the other pen');
  t.eq(KP.coWriterFor(s, g, ms[2].id), null, 'and nobody else’s');
  // the member demo carries both names; the record lands the bond
  const PM = KP.C.PITCH.memberDemoChance;
  KP.C.PITCH.memberDemoChance = 1;
  let demo = null, guard = 0;
  while (!demo && guard++ < 6) {
    g.demos = KP.generateDemos(s, KP.rngFor(s), g);
    demo = (g.demos || []).find(d => d.writtenBy && d.coWriter);
  }
  KP.C.PITCH.memberDemoChance = PM;
  t.ok(demo && [demo.writtenBy, demo.coWriter].sort().join() === [ms[0].id, ms[1].id].sort().join(), 'a member-written demo carries both names');
  g.promoUntil = -20; g.tourRestUntil = 0;   // the legacy act's calendar: well past its rest
  const rel0 = s.relationships[KP.pairKey(ms[0], ms[1])].score;
  const r = KP.planDebut(s, { groupId: g.id, songId: demo.id, promo: 'modest', week: s.week + 4, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(r.ok, 'fixture: the co-written record is locked (' + (r.reason || 'ok') + ')');
  guard = 0;
  while (g.prep && guard++ < 10) {
    KP.advanceWeek(s);
    (s.scenes || []).slice().forEach(sc => { const def = KP.sceneDef(sc.kind); if (def) KP.resolveScene(s, sc.id, def.options(s, sc)[0].id); });
  }
  KP.advanceWeek(s);   // the credits ledger reads the release on the next tick
  t.ok(s.pairLedger.coWritten === 1, 'the co-written track landed');
  t.ok(s.relationships[KP.pairKey(ms[0], ms[1])].score > rel0, 'and the bond is real');
  t.ok((ms[1].flags.writerCredits || 0) >= 1 && ms[1].history.some(h => /Co-wrote/.test(h.text)), 'the second name is in the booklet');
  t.ok(KP.unpairWriters(s, g.id).ok && !g.writingPair, 'dissolved');
}

// ---- the seating chart --------------------------------------------------------
{
  const { s, g, ms } = legacy('pm-seat');
  const a = ms[0], b = ms[1];
  setRel(s, a, b, 10);
  t.ok(/nothing between them/.test(KP.seatApart(s, g.id, a.id, b.id).reason), 'no feud, no chart');
  setRel(s, a, b, -40);
  const budget0 = s.budget;
  const r = KP.seatApart(s, g.id, a.id, b.id);
  t.ok(r.ok && KP.keptApart(g, a.id, b.id) && KP.keptApart(g, b.id, a.id) && KP.seatingLeft(s, g) === KP.C.PAIR.seatWeeks && s.budget < budget0, 'kept apart, for a while, billed');
  t.ok((a.directed || []).some(d => d.kind === 'keptApart'), 'she noticed the seating chart');
  t.ok(!KP.seatApart(s, g.id, ms[2].id, ms[3].id).ok, 'one chart a room');
  // the feud cools faster apart: fork two worlds, one seated
  const apart = KP.deserialize(KP.serialize(s));
  const together = KP.deserialize(KP.serialize(s));
  delete together.groups[0].seating;
  for (let w = 0; w < 4; w++) { KP.advanceWeek(apart); KP.advanceWeek(together); }
  const key = KP.pairKey(a, b);
  t.ok(apart.relationships[key].score > together.relationships[key].score, 'a feud kept apart cools faster (' + apart.relationships[key].score.toFixed(1) + ' > ' + together.relationships[key].score.toFixed(1) + ')');
  let guard = 0;
  while (g.seating && guard++ < 12) KP.advanceWeek(s);
  t.ok(!g.seating, 'the chart runs its weeks');
  t.eq(s.pairLedger.seatings, 1, 'ledgered');
}

// ---- the rivalry framed -------------------------------------------------------
{
  const { s, g, ms } = legacy('pm-rival');
  const a = ms[0], b = ms[1];
  setRel(s, a, b, -30);
  t.ok(/not named a rivalry/.test(KP.rivalryStance(s, g.id, a.id, b.id, 'sharpen').reason), 'friction is not a rivalry');
  const rel = setRel(s, a, b, -30, { rivalry: { since: s.week } });
  t.eq(KP.rivalryPairs(s, g).length, 1, 'the named rivalry is on the desk');
  a.morale = 70; b.morale = 70;
  const r = KP.rivalryStance(s, g.id, a.id, b.id, 'sharpen');
  t.ok(r.ok && rel.rivalry.sharpened, 'framed as competition');
  KP.advanceWeek(s);
  t.ok(a.flags.edged && b.flags.edged && s.pairLedger.edged >= 1 && !rel.rivalry.soured, 'while morale holds, both have the edge');
  const chemHold = KP.groupChemistry(s, ms);
  b.morale = 30;
  KP.advanceWeek(s);
  t.ok(!a.flags.edged && rel.rivalry.soured && s.pairLedger.soured === 1, 'when it slips, the room sours');
  t.ok(KP.groupChemistry(s, ms) < chemHold, 'and the sour rivalry drags the room harder (' + KP.groupChemistry(s, ms) + ' < ' + chemHold + ')');
  t.ok(s.inbox.concat(KP.lastTickNotes || []).some(n => n.ind === 'rivalrySoured'), 'said out loud');
  t.ok(KP.rivalryStance(s, g.id, a.id, b.id, 'defuse').ok && !rel.rivalry.sharpened && !rel.rivalry.soured, 'the framing comes down');
}

// ---- the mirror ----------------------------------------------------------------
{
  const s = KP.newGame('pm-mirror', null, { legacy: true });
  const ms = s.roster.map(id => s.people[id]);
  ms.forEach(m => { m.directed = []; });
  t.ok(/no read of you yet/.test(KP.mirrorLine(s)) && !KP.mirrorRead(s).spoken, 'no entries, no read');
  KP.recordDirected(s, ms[0].id, 'promiseKept');
  KP.recordDirected(s, ms[1].id, 'promiseKept');
  KP.recordDirected(s, ms[2].id, 'promiseKept');
  const r1 = KP.mirrorRead(s);
  t.ok(r1.traits.promises === 1 && /keeps promises/.test(KP.mirrorLine(s)) && r1.spoken, 'three kept promises: the building says so');
  KP.recordDirected(s, ms[0].id, 'breatherDeclined');
  KP.recordDirected(s, ms[1].id, 'pushedThrough');
  KP.recordDirected(s, ms[2].id, 'pressed');
  const r2 = KP.mirrorRead(s);
  t.ok(r2.traits.hearing === -1 && /schedules through what people say/.test(KP.mirrorLine(s)), 'schedules through it: said out loud');
  t.ok(!/\d/.test(KP.mirrorLine(s)), 'in words, never a number');
  t.eq(KP.knockGap(s), KP.C.KNOCK.personGapWeeks + KP.C.MIRROR.knockLate, 'a boss who schedules through it is knocked on later');
  ms.forEach(m => { m.directed = []; });
  KP.recordDirected(s, ms[0].id, 'heardHer'); KP.recordDirected(s, ms[1].id, 'listened'); KP.recordDirected(s, ms[2].id, 'breatherGranted');
  t.eq(KP.knockGap(s), KP.C.KNOCK.personGapWeeks - KP.C.MIRROR.knockEarly, 'a boss who listens is knocked on sooner');
  t.ok(KP.mirrorDoorsAnswered(s) >= 3, 'doors answered are counted');
  // the quiet no: the softspoken one only brings it to a boss who has answered doors
  const FR = KP.C.FRICTION;
  const mk = (answered) => {
    const w = KP.newGame('pm-quiet-' + (answered ? 'a' : 'b'), null, { legacy: true });
    const g = w.groups[0];
    w.roster.forEach(id => { const p = w.people[id]; p.directed = []; p.morale = 70; p.fatigue = 20; p.personality.resilience = 40; });
    const quiet = w.people[g.members[0]];
    quiet.morale = FR.quietMorale - 10; quiet.fatigue = FR.quietFatigue + 5; quiet.personality.dominance = FR.quietDominance - 10; quiet.personality.resilience = 40;
    if (answered) KP.recordDirected(w, w.people[g.members[1]].id, 'heardHer');
    const cands = KP.knockCandidates(w);
    return cands.some(c => c.kind === 'frictionQuietNo' && c.personId === quiet.id);
  };
  t.ok(!mk(false), 'to a boss who has never answered a door, the softspoken one keeps the quiet no to herself');
  t.ok(mk(true), 'to one who has, she brings it');
}

// ---- determinism --------------------------------------------------------------
{
  const a = KP.newGame('pm-fork', null, { legacy: true });
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 40; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the pairs and the mirror fork clean');
}

t.finish();
