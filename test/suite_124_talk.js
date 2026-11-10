/* Suite 124 — the talk and the slot (v0.11.14, §105; §96 recommendation 5,
   the trainee years, part two). Owner: "Break remaining work into smaller
   pieces".

   The survey asked for "one door a month through the one queue (the
   after-eval talk as a scene; the showcase slot as a pick)". Two sheets
   at the bottom was ten minutes with the coaches and a letter: nothing
   for the desk to decide.

   Pinned here:
   · the talk is called on the day and held when the desk says how. On
     the day nothing is said yet, and nothing lands
   · the question comes through the one queue: one person scene at a
     time, and a talk the door never gets to is held by the coaches
   · three answers. Left with the coaches: what the talk always was.
     Said straight: it lands harder and it is remembered. No talk, a
     month one on one: it costs money, and the next sheet answers for it
   · silence leaves it with the coaches
   · the closing slot is one pick a month. By custom it goes to last
     month's first and nothing comes of it; given to somebody else, she
     is read higher on the day and knows it, and so does the one who had it
   · the screens: the question on the Desk, the slot on the Training tab
   Two laws from §99 hold throughout: the week's wire is read before the
   trim, and a fixture forces every gate and relies on no roll. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_124_talk');

const E = KP.C.EVAL;
const firstOf = list => (list && list[0]) || { text: '', priority: null, by: null };
const noisy = x => /undefined|NaN|\{she\}|\{her\}|\{pos\}|\{herself\}|\{hers\}|\{She\}|\{Pos\}|\{N\}|\[object/.test(x);
const sheetOf = wire => firstOf(wire.filter(n => n.ind === 'evalSheet'));
const count = (p, kind) => (p.directed || []).filter(d => d.kind === kind).length;

// ---- the fixture: suite 123's pinned room ----
// four trainees with gaps wider than any fog and frozen ceilings: the
// sheet's order holds, so the last one is last because the room says so.
const base = (() => {
  const s = KP.newGame('talk-124', null, { legacy: false, door: 'fresh' });
  s.budget = 900; KP.advanceWeek(s);
  s.roster = s.roster.filter(id => s.people[id].status === 'trainee').slice(0, 4);
  s.roster.forEach((id, i) => {
    const p = s.people[id];
    KP.C.TALENTS.forEach(d => { p.talents[d].cur = [95, 65, 35, 5][i]; p.flags['ceil_' + d] = p.talents[d].cur; });
    p.flags.firstEvalTopWeek = 1; p.evalBottomStreak = -100; p.evalHistory = [];
    p.signedWeek = s.week - 50; p.age = 17; p.missionWeeks = 0; p.morale = 60;
    p.training.focus = []; p.training.intensity = 'standard';
    delete p.flags.talkDue; delete p.flags.coached; delete p.flags.toldStraight;
  });
  s.lastEvalTopId = null; s.lastEvalMomentKind = null; s.evalSlot = null;
  s.scenes = [];
  return { s, ids: s.roster.slice() };
})();
function fork(src) {
  const s = KP.deserialize(KP.serialize((src || base).s));
  return { s, ids: base.ids.slice(), tr: base.ids.map(id => s.people[id]) };
}
const PH = KP.evalPhase(base.s);
const isEval = w => ((w % E.every) + E.every) % E.every === PH;
// a week. The room is kept off the bench; no talk falls due unless a test
// arms one; every scene that is not the talk's leaves the desk first.
function tick(f, keep) {
  f.tr.forEach(p => { p.flags.burnout = 0; p.fatigue = 0; if (p.evalBottomStreak < E.bottomTalkAfter - 1) p.evalBottomStreak = -100; });
  f.s.scenes = (f.s.scenes || []).filter(sc => sc.kind === 'afterEvalTalk' || (keep && keep.includes(sc.kind)));
  f.s.budget = Math.max(f.s.budget, 900);
  KP.advanceWeek(f.s);
  return (KP.lastTickNotes || []).slice();
}
function toEval(f) { let wire = []; do { wire = tick(f); } while (!isEval(f.s.week)); return wire; }
function toEve(f) { while (!isEval(f.s.week + 1)) tick(f); }
const talkScene = (f, id) => (f.s.scenes || []).find(sc => sc.kind === 'afterEvalTalk' && (id == null || sc.personId === id)) || null;
// the room on the eve of a showcase at which the last on the sheet falls due the talk
const armed = (() => {
  const f = fork(); toEval(f); toEve(f);
  f.tr[3].evalBottomStreak = E.bottomTalkAfter - 1;   // forced: one sheet at the bottom already
  return f;
})();
// …and the week it is called, with the question on the desk
const called = (() => { const f = fork(armed); f.m0 = f.tr[3].morale; f.wire = tick(f); return f; })();
const LOW = base.ids[3];

// ---- the fixture is what the tests think it is ----
{
  const f = fork(); const wire = toEval(f);
  t.eq(f.tr.map(p => KP.evalRankOf(p)).join(','), '1,2,3,4', 'fixture: the room’s order holds on the sheet');
  t.eq(wire.filter(n => n.ind === 'evalTalk').length + '|' + (f.s.scenes || []).length, '0|0', 'fixture: an ordinary month calls no talk and asks nothing');
  t.ok(E.straightMorale > E.bottomMorale && E.coachCost > 0 && E.talkExpire >= 1, 'fixture: said straight lands harder than the coaches’ version, and the month one on one costs money');
  t.ok(KP.isKnockKind('afterEvalTalk'), 'fixture: the talk’s question is a person scene: one at a time');
  t.eq(KP.validateState(f.s).length, 0, 'fixture: the file is valid');
}

// ---- the talk is called on the day, and nothing is said yet ----
{
  const f = fork(called); const p = f.tr[3];
  const due = firstOf(called.wire.filter(n => n.ind === 'evalTalk'));
  t.eq(JSON.stringify(p.flags.talkDue), JSON.stringify({ week: f.s.week, rank: 4, of: 4 }), 'two sheets at the bottom: the talk is called, with the week and her place');
  t.eq(f.s.evalLedger.talks, 1, 'the ledger counts the call');
  t.eq(due.priority + '|' + due.personId, 'high|' + p.id, 'a high letter says it is due');
  t.ok(/after-eval talk/.test(due.text) && due.text.includes(KP.displayName(p)) && !noisy(due.text), 'naming her, in whole words');
  t.ok(sheetOf(called.wire).priority === 'critical' && sheetOf(called.wire).text.includes('the after-eval talk, due with ' + KP.displayName(p)), 'the month’s sheet posts critical and says the talk is due, not held');
  t.ok(!p.history.some(h => /after-eval talk/.test(h.text)), 'nothing is on her file yet');
  // on the day itself nothing lands: the same week without the talk leaves her morale where this one does
  const calm = fork(armed); calm.tr[3].evalBottomStreak = -100;
  tick(calm);
  t.eq(p.morale, calm.tr[3].morale, 'and nothing has landed: her morale is what the same week without a talk leaves');
  t.eq(KP.validateState(f.s).length, 0, 'the file is valid');
}

// ---- through the one queue ----
{
  const f = fork(called); const p = f.tr[3];
  const sc = talkScene(f, p.id);
  t.ok(!!sc, 'the question is on the desk the week the talk is called');
  t.eq((sc || {}).expiresWeek, f.s.week + E.talkExpire, 'and waits there for the answer window');
  t.eq(f.s.evalLedger.talkAsked, 1, 'the ledger counts the question');
  // the provider, read before the door picks
  const eve = fork(armed); eve.tr[3].flags.talkDue = { week: eve.s.week, rank: 4, of: 4 };   // forced: due, not yet asked
  const c = KP.knockCandidates(eve.s).filter(x => x.kind === 'afterEvalTalk');
  t.eq(c.length + '|' + (c[0] || {}).personId + '|' + (c[0] || {}).priority + '|' + (c[0] || {}).expiresIn, '1|' + LOW + '|1|' + E.talkExpire, 'the provider offers one candidate: an event, not a roll');
  // it stands down
  eve.tr[3].flags.personalHiatus = { since: eve.s.week };
  t.eq(KP.knockCandidates(eve.s).filter(x => x.kind === 'afterEvalTalk').length, 0, 'a trainee on a break is not asked about');
  delete eve.tr[3].flags.personalHiatus; delete eve.tr[3].flags.talkDue;
  t.eq(KP.knockCandidates(eve.s).filter(x => x.kind === 'afterEvalTalk').length, 0, 'nor one with no talk due');
  // one person scene at a time: somebody else's question holds the door
  const busy = fork(armed);
  const hold = () => { if (!talkScene(busy, busy.ids[0])) KP.openScene(busy.s, { kind: 'afterEvalTalk', personId: busy.ids[0], expiresWeek: busy.s.week + 9 }); };   // forced: the door is taken
  hold();
  const w1 = tick(busy);
  t.ok(!!busy.tr[3].flags.talkDue && !talkScene(busy, LOW), 'with another question on the desk, hers waits its turn');
  t.eq(w1.filter(n => n.ind === 'evalTalkHeld').length, 0, 'and nothing is held meanwhile');
  // …and a talk the door never gets to is held by the coaches
  let held = null, weeks = 0;
  const m0 = busy.tr[3].morale;
  while (!held && weeks++ < 8) { hold(); const w = tick(busy); held = w.find(n => n.ind === 'evalTalkHeld' && n.personId === LOW) || null; }
  t.ok(!!held && busy.s.week - called.s.week === E.talkWaitWeeks, 'after ' + E.talkWaitWeeks + ' weeks unasked, the coaches hold it (' + (busy.s.week - called.s.week) + ')');
  t.eq((held || {}).priority + '|' + (held || {}).by, 'normal|coaches', 'a normal letter says so');
  t.ok(!busy.tr[3].flags.talkDue && busy.tr[3].history.some(h => /after-eval talk/.test(h.text)), 'it is on her file, and no longer due');
  t.eq(busy.s.evalLedger.talkUnasked + '|' + (busy.s.evalLedger.talkAsked || 0), '1|0', 'the ledger counts a talk the desk was never asked about');
  // a trainee who has stopped being one is owed no talk
  const gone = fork(called); gone.tr[3].status = 'idol';   // forced: she debuted
  gone.s.scenes = [];
  tick(gone);
  t.ok(gone.tr[3].flags.talkDue === undefined, 'a talk due with somebody who is no longer a trainee is dropped');
}

// ---- the question: its words and its three answers ----
{
  const f = fork(called); const p = f.tr[3];
  const sc = talkScene(f, p.id) || { id: 'none', kind: 'afterEvalTalk', personId: p.id };
  const def = KP.sceneDef('afterEvalTalk');
  t.eq(def.title(f.s, sc), KP.displayName(p) + ' · the after-eval talk', 'the title names her');
  const body = def.body(f.s, sc);
  t.ok(body.startsWith(KP.displayName(p) + ' has been at the bottom of the sheet two months running: rank 4 of 4.') && body.includes(KP.evalMission(f.s).name) && !noisy(body), 'the body says where she stands, and names the room the month one on one would be spent in');
  t.eq(def.options(f.s, sc).map(o => o.id).join(','), 'coaches,yourself,room', 'three answers, the coaches’ first');
  t.eq(def.options(f.s, sc)[2].label, 'No talk: a month one on one · ' + E.coachCost, 'the third carries its bill');
  f.s.budget = E.coachCost - 1;
  t.eq(def.options(f.s, sc).map(o => o.id).join(','), 'coaches,yourself', 'a till that cannot cover the hours offers two');
}

// ---- left with the coaches: what the talk always was ----
{
  const f = fork(called); const p = f.tr[3];
  const was = { morale: p.morale, budget: f.s.budget, acts: (p.directed || []).length, inbox: f.s.inbox.length };
  const r = KP.resolveScene(f.s, (talkScene(f, p.id) || { id: 'none' }).id, 'coaches');
  const n = firstOf(f.s.inbox.filter(x => x.ind === 'evalTalkHeld'));
  t.ok(r.ok && !talkScene(f, p.id), 'the answer is taken and the question leaves the desk');
  t.eq(p.morale, was.morale - E.bottomMorale, 'it costs her the talk’s morale');
  t.ok(p.history[p.history.length - 1].text.startsWith('The after-eval talk — the one held with the door open just enough') && p.history[p.history.length - 1].text.includes('Rank 4 of 4 again.'), 'and goes on her file, with her place');
  t.eq(n.priority + '|' + n.by + '|' + n.personId, 'normal|coaches|' + p.id, 'a normal letter says the coaches held it');
  t.ok(/after-eval talk/.test(n.text) && n.text.includes(KP.displayName(p)) && !noisy(n.text), 'in one of the three ways it was always told');
  t.eq((p.directed || []).length + '|' + f.s.budget, was.acts + '|' + was.budget, 'nothing is written on her ledger, and no money moves');
  t.ok(p.flags.talkDue === undefined && !p.flags.coached && !p.flags.toldStraight, 'the talk is no longer due, and nothing else is pending');
  t.eq(f.s.evalLedger.talkCoaches, 1, 'the ledger counts the answer');
  t.eq(KP.validateState(f.s).length, 0, 'the file is valid');
}

// ---- said straight: it lands harder, and it is remembered ----
{
  const f = fork(called); const p = f.tr[3];
  const was = { morale: p.morale, budget: f.s.budget, straight: count(p, 'toldStraight') };
  const r = KP.resolveScene(f.s, (talkScene(f, p.id) || { id: 'none' }).id, 'yourself');
  t.ok(r.ok && !!r.toast && !noisy(r.toast), 'the answer is taken');
  t.eq(p.morale, was.morale - E.straightMorale, 'it lands harder than the coaches’ version');
  t.eq(count(p, 'toldStraight'), was.straight + 1, 'and is on her ledger: told straight');
  t.ok(KP.C.LEDGER.KINDS.toldStraight.w > 0, 'which weighs for the one who said it');
  t.eq(JSON.stringify(p.flags.toldStraight), JSON.stringify({ week: f.s.week, rank: 4 }), 'her file remembers when, and where she stood');
  t.ok(/^Was told where she stands by the person who signed her: rank 4 of 4, two sheets running, and no adjectives\.$/.test(p.history[p.history.length - 1].text), 'in so many words');
  t.eq(f.s.budget + '|' + f.s.inbox.filter(x => x.ind === 'evalTalkHeld').length, was.budget + '|0', 'no money moves, and the coaches hold nothing');
  t.eq(f.s.evalLedger.talkStraight, 1, 'the ledger counts the answer');
  // while she is still at the bottom, nothing more
  const still = fork(f); const ps = still.tr[3];
  const ms = ps.morale;
  const twin = fork(f); delete twin.tr[3].flags.toldStraight;
  toEval(still); toEval(twin);
  t.ok(!!ps.flags.toldStraight && ps.morale === twin.tr[3].morale, 'a month later, still last: the truth has paid nothing yet');
  // the month she comes off the bottom (forced: the room's order turned over)
  const turn = x => { const top = x.tr[0], low = x.tr[3]; KP.C.TALENTS.forEach(d => { top.talents[d].cur = 5; top.flags['ceil_' + d] = 5; low.talents[d].cur = 95; low.flags['ceil_' + d] = 95; }); };
  const up = fork(f), upTwin = fork(f);
  delete upTwin.tr[3].flags.toldStraight;
  turn(up); turn(upTwin);
  toEval(up); toEval(upTwin);
  t.eq(KP.evalRankOf(up.tr[3]), 1, 'fixture: with the room turned over she tops the next sheet');
  t.eq(up.tr[3].morale - upTwin.tr[3].morale, E.straightClimbMorale, 'the month she comes off the bottom, she knows who told her: morale, over the same climb untold');
  t.ok(up.tr[3].flags.toldStraight === undefined && up.tr[3].history.some(h => /She had been told straight where she stood, and by whom\./.test(h.text)), 'it is on her file, and it is paid once');
  t.eq(up.s.evalLedger.straightClimbs, 1, 'the ledger counts it');
  t.ok(ms != null, 'fixture');
}

// ---- no talk: a month one on one ----
{
  const f = fork(called); const p = f.tr[3];
  const was = { morale: p.morale, budget: f.s.budget, acts: (p.directed || []).length };
  const r = KP.resolveScene(f.s, (talkScene(f, p.id) || { id: 'none' }).id, 'room');
  t.ok(r.ok && !!r.toast && !noisy(r.toast), 'the answer is taken');
  t.eq(f.s.budget, was.budget - E.coachCost, 'the head coach’s hours are billed');
  t.eq(p.morale, was.morale + E.coachMorale, 'she is given something, not told something');
  t.eq(JSON.stringify(p.flags.coached), JSON.stringify({ since: f.s.week }), 'her file carries the month');
  t.ok(p.history[p.history.length - 1].text.startsWith('No after-eval talk. The head coach took her one on one for the month instead'), 'in so many words');
  t.ok(p.flags.talkDue === undefined && !p.history.some(h => /The after-eval talk —/.test(h.text)), 'and there is no talk');
  t.eq(f.s.evalLedger.talkRoom + '|' + (p.directed || []).length, '1|' + was.acts, 'the ledger counts the answer; nothing is on hers');
  // the next sheet answers for it. In this room the real number does not lift her off the bottom
  const miss = fork(f), plain = fork(f);
  delete plain.tr[3].flags.coached;
  toEval(miss); toEval(plain);
  t.eq(KP.evalRankOf(miss.tr[3]) + '|' + KP.evalRankOf(plain.tr[3]), '4|4', 'fixture: with gaps this wide the hours do not move her');
  t.eq(miss.tr[3].morale - plain.tr[3].morale, -E.coachMissMorale, 'a month of the hours and the sheet did not move: it costs her, over the same month without them');
  t.ok(miss.tr[3].flags.coached === undefined && miss.tr[3].history.some(h => /A month of the head coach’s hours, one on one, and the sheet did not move: rank 4 of 4\./.test(h.text)), 'it is on her file, and the month is spent');
  t.eq(miss.s.evalLedger.coachMisses, 1, 'the ledger counts the miss');
  // the hours are an edge on the day: never a loss
  const worth = (bonus) => { const x = fork(f); const k = KP.C.EVAL.coachBonus; KP.C.EVAL.coachBonus = bonus; try { toEval(x); } finally { KP.C.EVAL.coachBonus = k; } return x; };
  const big = worth(200);
  t.eq(KP.evalRankOf(big.tr[3]), 1, 'forced to a number wider than the room: the one who had the hours tops the sheet');
  t.eq(big.tr[3].morale - plain.tr[3].morale >= E.coachClimbMorale, true, 'and coming off the bottom after them lifts her');
  t.ok(big.tr[3].history.some(h => /Came off the bottom of the sheet after a month one on one with the head coach: rank 1 of 4\./.test(h.text)) && big.s.evalLedger.coachClimbs === 1, 'on her file and on the ledger');
  t.eq(KP.validateState(miss.s).length + KP.validateState(big.s).length, 0, 'both files are valid');
}

// ---- silence leaves it with the coaches ----
{
  const f = fork(called); const p = f.tr[3];
  const m0 = p.morale;
  let held = null, weeks = 0;
  const twin = fork(called); KP.resolveScene(twin.s, (talkScene(twin, LOW) || { id: 'none' }).id, 'coaches');
  while (!held && weeks++ < 6) { const w = tick(f); tick(twin); held = w.find(n => n.ind === 'evalTalkHeld') || null; }
  t.ok(!!held && f.s.week === called.s.week + E.talkExpire + 1, 'unanswered, the question lapses after its window (' + weeks + ' weeks)');
  t.eq(held.priority + '|' + held.by + '|' + held.personId, 'normal|coaches|' + p.id, 'and the coaches hold the talk');
  t.ok(!talkScene(f, p.id) && p.flags.talkDue === undefined && p.history.some(h => /The after-eval talk —/.test(h.text)), 'it is on her file, and off the desk');
  t.eq(f.s.evalLedger.talkUnanswered + '|' + (f.s.evalLedger.talkCoaches || 0), '1|0', 'the ledger counts a question nobody answered');
  t.eq((p.directed || []).length, (called.tr[3].directed || []).length, 'the question was the head coach’s: her ledger holds nothing against the desk for it');
  t.ok(m0 > 0, 'fixture');
  // a question whose trainee has gone
  const gone = fork(called); const sc = talkScene(gone, LOW) || { id: 'none', kind: 'afterEvalTalk', personId: LOW };
  gone.tr[3].status = 'released';   // forced
  const snap = KP.serialize(gone.s);
  const def = KP.sceneDef('afterEvalTalk');
  t.eq(def.expire(gone.s, sc), null, 'a question about somebody who has left lapses into nothing');
  t.eq(def.resolve(gone.s, sc, 'yourself').toast + '|' + (KP.serialize(gone.s) === snap), 'The month has moved on.|true', 'and an answer to it changes nothing');
}

// ---- the closing slot: one pick a month ----
{
  // before any sheet there is no custom; too few trainees and there is no slot
  const fresh = fork();
  t.eq(JSON.stringify(KP.showcaseSlotRead(fresh.s)), JSON.stringify({ week: KP.nextEvalWeek(fresh.s, fresh.s.week + 1), aceId: null, pickId: null, holderId: null, byCoaches: true }), 'before any sheet: the coaches decide, and nobody has it by custom');
  const few = fork(); few.s.roster = few.s.roster.slice(0, E.minTrainees - 1);
  t.eq(KP.showcaseSlotRead(few.s), null, 'a room too small for a showcase has no slot');
  t.ok(!KP.setShowcaseSlot(few.s, few.ids[0]).ok, 'and none can be given');

  const f = fork(); toEval(f);
  const before = KP.serialize(f.s);
  const read = KP.showcaseSlotRead(f.s);
  t.eq(KP.serialize(f.s), before, 'reading the slot writes nothing');
  t.eq(JSON.stringify(read), JSON.stringify({ week: f.s.week + E.every, aceId: f.ids[0], pickId: null, holderId: f.ids[0], byCoaches: true }), 'after a sheet: by custom it is last month’s first');
  // giving it
  t.ok(KP.setShowcaseSlot(f.s, f.ids[2]).ok, 'the desk can give it to somebody else');
  t.eq(JSON.stringify(f.s.evalSlot), JSON.stringify({ personId: f.ids[2], week: f.s.week + E.every }), 'the pick is for the next showcase');
  t.eq(KP.showcaseSlotRead(f.s).holderId + '|' + KP.showcaseSlotRead(f.s).byCoaches, f.ids[2] + '|false', 'and the read says who has it');
  // back to the custom
  t.ok(KP.setShowcaseSlot(f.s, f.ids[0]).byCoaches && f.s.evalSlot === null, 'giving it to the one who has it by custom is the custom');
  KP.setShowcaseSlot(f.s, f.ids[2]);
  t.ok(KP.setShowcaseSlot(f.s, null).byCoaches && f.s.evalSlot === null, 'and it can be handed back to the coaches');
  // refusals change nothing
  KP.setShowcaseSlot(f.s, f.ids[2]);
  const snap = KP.serialize(f.s);
  f.tr[1].flags.personalHiatus = { since: f.s.week };
  const snap2 = KP.serialize(f.s);
  t.ok(!KP.setShowcaseSlot(f.s, f.ids[1]).ok && KP.serialize(f.s) === snap2, 'a trainee off the floor cannot be given it');
  delete f.tr[1].flags.personalHiatus;
  t.ok(!KP.setShowcaseSlot(f.s, 'nobody').ok && KP.serialize(f.s) === snap, 'nor somebody who is not a trainee here');

  // on the day
  const mk = (pick, bonus, mut) => {
    const x = fork(); toEval(x); toEve(x);
    if (pick != null) KP.setShowcaseSlot(x.s, x.ids[pick]);
    if (mut) mut(x);
    const k = KP.C.EVAL.slotBonus;
    if (bonus != null) KP.C.EVAL.slotBonus = bonus;
    let wire;
    try { wire = tick(x); } finally { KP.C.EVAL.slotBonus = k; }
    return { x, wire, sh: sheetOf(wire) };
  };
  const custom = mk(null), given = mk(2);
  t.ok(!custom.sh.text.includes('closing slot'), 'by custom the sheet says nothing of the slot');
  t.eq(custom.x.tr.map(p => KP.evalRankOf(p)).join(','), given.x.tr.map(p => KP.evalRankOf(p)).join(','), 'fixture: in this room the real number moves nobody');
  t.eq(given.x.tr[2].morale - custom.x.tr[2].morale, E.slotMorale, 'the one given it knows she was given it: morale, over the same day by custom');
  t.eq(given.x.tr[0].morale - custom.x.tr[0].morale, -E.slotSnubMorale, 'and the one who had it by custom knows that too');
  t.eq(given.x.tr[1].morale - custom.x.tr[1].morale, 0, 'nobody else is touched');
  t.ok(given.sh.text.includes(' The closing slot went to ' + KP.displayName(given.x.tr[2]) + ', not to ' + KP.displayName(given.x.tr[0]) + ', who had it by custom.'), 'the sheet says who had it, and who did not');
  t.ok(given.x.tr[2].history.some(h => /Was given the showcase’s closing slot/.test(h.text)), 'it is on her file');
  t.eq(given.x.s.evalLedger.slots + '|' + given.x.s.evalLedger.slotSnubs + '|' + (custom.x.s.evalLedger.slots || 0), '1|1|0', 'the ledger counts the pick and the one passed over');
  t.eq(given.x.s.evalSlot, null, 'the pick is for one showcase');
  t.eq(KP.showcaseSlotRead(given.x.s).byCoaches, true, 'next month it is back with the custom');
  // the number is an edge on the day
  const big = mk(3, 200);
  t.eq(KP.evalRankOf(big.x.tr[3]), 1, 'forced to a number wider than the room: the last one up is read first');
  t.ok(KP.evalRankOf(given.x.tr[2]) <= KP.evalRankOf(custom.x.tr[2]), 'with the real number she is never placed lower for it');
  // no custom holder on the floor
  const noAce = mk(2, null, x => { x.s.lastEvalTopId = null; });
  t.ok(noAce.sh.text.includes(' The closing slot went to ' + KP.displayName(noAce.x.tr[2]) + '.') && !noAce.sh.text.includes('by custom') && (noAce.x.s.evalLedger.slotSnubs || 0) === 0, 'with nobody holding it by custom, nobody is passed over');
  // a pick who is off the floor on the day
  const off = mk(2, null, x => { x.tr[2].flags.personalHiatus = { since: x.s.week }; });
  t.ok(!off.sh.text.includes('closing slot') && (off.x.s.evalLedger.slots || 0) === 0 && off.x.s.evalSlot === null, 'a pick who is off the floor on the day has no slot, and the pick lapses');
  // a pick made for another showcase
  const stale = mk(null, null, x => { x.s.evalSlot = { personId: x.ids[2], week: x.s.week + 99 }; });
  t.ok(!stale.sh.text.includes('closing slot') && (stale.x.s.evalLedger.slots || 0) === 0, 'a pick for some other showcase is not this one’s');
  t.eq([custom, given, big, noAce, off].map(c => KP.validateState(c.x.s).length).join(','), '0,0,0,0,0', 'every one of these files is valid');
}

// ---- an old file ----
{
  const o = JSON.parse(KP.serialize(base.s));
  o.version = '0.11.13';
  delete o.evalSlot;
  o.evalLedger = { sheets: 2, climbs: 0, slides: 0, talks: 1, missions: 2 };
  const s = KP.deserialize(JSON.stringify(o));
  t.eq(s.version + '|' + KP.validateState(s).length, KP.C.VERSION + '|0', 'an old file loads on this build, valid as it stands');
  t.ok(KP.showcaseSlotRead(s) !== null && KP.showcaseSlotRead(s).byCoaches, 'its closing slot is with the coaches');
  const f = { s, ids: base.ids.slice(), tr: base.ids.map(id => s.people[id]) };
  toEval(f); toEve(f);
  f.tr[3].evalBottomStreak = E.bottomTalkAfter - 1;
  tick(f);
  t.ok(!!talkScene(f, LOW) && s.evalLedger.talks === 2 && s.evalLedger.talkAsked === 1, 'its next talk is a question, and the older ledger counts on beside the new one');
}

// ---- the screens: the question on the Desk, the slot on the Training tab ----
{
  const dom = require('./dom_stub');
  const Dm = dom.load();
  const K = Dm.KP, App = Dm.App, el = Dm.el;
  const load = x => { const s = K.deserialize(KP.serialize(x.s)); return { s, tr: base.ids.map(id => s.people[id]) }; };
  const page = (s, tab, sub) => { App.state = s; App.mode = 'game'; App.tab = tab; App.view = null; if (tab === 'desk') App.deskSub = sub || 'today'; if (tab === 'talent') App.talentSub = sub || 'training'; App.render(); return el('screen').innerHTML; };
  const text = h => dom.stripTags(h).replace(/\s+/g, ' ');
  const clean = h => !/undefined|NaN|\{she\}|\{her\}|\{pos\}|\{Pos\}/.test(h);

  // the question, through the one card
  const X = load(called);
  let h = page(X.s, 'desk');
  const sc = X.s.scenes.find(q => q.kind === 'afterEvalTalk') || { id: 'none', kind: 'afterEvalTalk', personId: X.tr[3].id };   // a question that is not there fails the checks below by name
  t.ok(clean(h) && text(h).includes(K.displayName(X.tr[3]) + ' · the after-eval talk'), 'the Desk carries the question, by name');
  t.eq(dom.actionsIn(h).filter(a => a.action === 'scene-opt' && a.dataset.scene === sc.id).map(a => a.dataset.opt).join(','), 'coaches,yourself,room', 'with its three answers');
  t.ok(Dm.UI.answersStack(K.sceneDef('afterEvalTalk').options(X.s, sc)), 'stacked one a row: they are too long to share one');
  Dm.click({ action: 'scene-opt', scene: sc.id, opt: 'yourself' });
  t.ok(!X.s.scenes.some(q => q.kind === 'afterEvalTalk') && !!X.tr[3].flags.toldStraight, 'an answer on the card is the answer');

  // the slot, on the room's card
  const g = fork(); toEval(g);
  const Y = load(g);
  h = page(Y.s, 'talent');
  const chips = () => dom.actionsIn(el('screen').innerHTML).filter(a => a.action === 'set-slot');
  t.ok(clean(h) && text(h).includes('The closing slot') && text(h).includes('By custom · ' + K.publicGiven(Y.tr[0])), 'the Training tab carries the closing slot, and who has it by custom');
  t.eq(chips().map(c => c.dataset.id).join(','), ',' + Y.tr.slice(1).map(p => p.id).join(','), 'one chip for the custom, and one for each of the others on the floor');
  t.ok(/class="chip on" data-action="set-slot" data-id=""/.test(h), 'the custom is the one lit');
  Dm.click({ action: 'set-slot', id: Y.tr[2].id });
  t.eq(JSON.stringify(Y.s.evalSlot), JSON.stringify({ personId: Y.tr[2].id, week: Y.s.week + E.every }), 'a tap gives it');
  h = el('screen').innerHTML;
  t.ok(new RegExp('class="chip on" data-action="set-slot" data-id="' + Y.tr[2].id + '"').test(h) && !/class="chip on" data-action="set-slot" data-id=""/.test(h), 'and her chip is the one lit now');
  Dm.click({ action: 'set-slot', id: '' });
  t.eq(Y.s.evalSlot, null, 'the custom’s chip hands it back');
  // too few for a showcase: no slot row
  const few = fork(); few.s.roster = few.s.roster.slice(0, E.minTrainees - 1);
  t.ok(!text(page(load(few).s, 'talent')).includes('The closing slot'), 'a room too small for a showcase shows no slot');
}

t.finish();
