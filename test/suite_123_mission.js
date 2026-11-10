/* Suite 123 — the mission (v0.11.13, §104; §96 recommendation 5, the
   trainee years, part one). Owner: "Break remaining work into smaller
   pieces": the practice room ships in pieces, and this is the first.

   The survey's finding: "The trainee years: two dials, four silent weeks,
   an evaluation sheet." The two dials had no reason to move.

   Pinned here:
   · each showcase is held in one of five rooms. The coaches run a
     rotation: every room once in five months, in an order of the save's
     own, never the same room twice running, known a month ahead
   · a trainee whose focus is on the month's room has drilled it a week;
     the counter is hers, capped at the month, and the month closes it
   · on the day a drilled room is carried in: pro rata, never a loss, and
     decisive only as far as its number
   · the sheet names the room, who drilled it and climbed, the line when a
     project is open and who crossed it, and one thing from the room
   · the one thing never repeats its kind two months running, and each
     kind finds its own subject off the files or stands down
   · the next room is posted with the sheet
   · the screen: the room on the Training tab, and on the dial
   Two laws from §99 hold throughout: the week's wire is read before the
   trim, and a fixture forces every gate and relies on no roll. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_123_mission');

const E = KP.C.EVAL, YEAR = KP.C.WEEKS_PER_YEAR;
const M = KP.EVAL_MISSIONS;
const firstOf = list => (list && list[0]) || { text: '', priority: null, mission: null, moment: null };
const noisy = x => /undefined|NaN|\{she\}|\{her\}|\{pos\}|\{herself\}|\{hers\}|\{She\}|\{Pos\}|\{N\}|\{M\}|\[object/.test(x);
const when = w => KP.weekLabel(w).text;
const sheetOf = wire => firstOf(wire.filter(n => n.ind === 'evalSheet'));
const postOf = wire => firstOf(wire.filter(n => n.ind === 'evalMission'));

// ---- the fixture: a pinned room ----
// four trainees with gaps wider than any fog, frozen ceilings, a first #1
// already on file and no talk due, so a sheet's order holds and its
// priority is set by what a test moves. Kept off the bench every week.
const base = (() => {
  const s = KP.newGame('mission-123', null, { legacy: false, door: 'fresh' });
  s.budget = 900; KP.advanceWeek(s);
  s.roster = s.roster.filter(id => s.people[id].status === 'trainee').slice(0, 4);
  s.roster.forEach((id, i) => {
    const p = s.people[id];
    KP.C.TALENTS.forEach(d => { p.talents[d].cur = [95, 65, 35, 5][i]; p.flags['ceil_' + d] = p.talents[d].cur; });
    p.flags.firstEvalTopWeek = 1; p.evalBottomStreak = -100; p.evalHistory = [];
    p.signedWeek = s.week - 50; p.age = 17; p.missionWeeks = 0;
    p.training.focus = []; p.training.intensity = 'standard';
  });
  s.lastEvalTopId = null; s.lastEvalMomentKind = null;
  s.scenes = [];
  return { s, ids: s.roster.slice() };
})();
function fork(src) {
  const s = KP.deserialize(KP.serialize((src || base).s));
  return { s, ids: base.ids.slice(), tr: base.ids.map(id => s.people[id]) };
}
const PH = KP.evalPhase(base.s);
const isEval = w => ((w % E.every) + E.every) % E.every === PH;
function tick(f) {
  f.tr.forEach(p => { p.flags.burnout = 0; p.fatigue = 0; p.evalBottomStreak = Math.min(p.evalBottomStreak, -50); });
  f.s.scenes = [];
  f.s.budget = Math.max(f.s.budget, 900);
  KP.advanceWeek(f.s);
  return (KP.lastTickNotes || []).slice();
}
// run to the next showcase (at least one week), returning that week's wire
function toEval(f) { let wire = []; do { wire = tick(f); } while (!isEval(f.s.week)); return wire; }
// stop the week before the next showcase
function toEve(f) { while (!isEval(f.s.week + 1)) tick(f); }
const drill = (f, i, id, intensity) => KP.setTraining(f.s, f.ids[i], id ? [id] : [], intensity || 'standard');
const roomOf = (s) => KP.evalMission(s);

// ---- the fixture is what the tests think it is ----
{
  const f = fork();
  t.eq(f.tr.length, 4, 'fixture: a room of four');
  t.ok(f.tr.every(p => p.status === 'trainee' && !KP.onBreak(p)), 'fixture: all four are trainees, on the floor');
  t.eq(M.length + '|' + M.map(m => m.id).slice().sort().join(','), '5|' + KP.C.TALENTS.slice().sort().join(','), 'fixture: five rooms, one for each talent');
  t.ok(E.missionPrep > 0 && E.every === 4, 'fixture: the month is four weeks, and a drilled room is worth something');
  const wire = toEval(f);
  t.eq(f.tr.map(p => KP.evalRankOf(p)).join(','), '1,2,3,4', 'fixture: the room’s order holds on the sheet');
  t.ok(!!sheetOf(wire).text, 'fixture: a sheet is posted');
  t.eq(KP.validateState(f.s).length, 0, 'fixture: the file is valid');
}

// ---- the rotation: five rooms, an order of the save's own, never the same twice running ----
{
  const seeds = Array.from({ length: 24 }, (_, i) => 'rot-' + i);
  const seqOf = (seed, n) => { const s = { seed }; const ph = KP.evalPhase(s); return Array.from({ length: n }, (_, k) => KP.evalMissionAt(s, ph + k * E.every).id); };
  const seqs = seeds.map(sd => seqOf(sd, 60));
  t.ok(seqs.every(q => q.every(id => M.some(m => m.id === id))), 'every showcase is held in one of the five rooms');
  t.ok(seqs.every(q => q.every((id, i) => i === 0 || id !== q[i - 1])), 'no save holds the same room two months running (24 saves, 60 showcases each)');
  t.ok(seqs.every(q => [0, 5, 10, 15, 20].every(a => new Set(q.slice(a, a + 5)).size === 5)), 'and every five months each room has been held once');
  t.ok(new Set(seqs.map(q => q.slice(0, 5).join(','))).size >= 6, 'the order is the save’s own: 24 saves open on many different orders');
  t.eq(seqOf('rot-3', 30).join(','), seqOf('rot-3', 30).join(','), 'and one save always reads the same order');
  // the seam between two laps: a lap that would open on the room the last one closed on
  const raw = (seed, L) => M.map((m, i) => ({ i, h: KP.hash01([seed, 'mission', L, m.id].join('|')) })).sort((a, b) => a.h - b.h || a.i - b.i).map(x => M[x.i].id);
  let seam = null;
  for (let i = 0; i < 400 && !seam; i++) { const sd = 'seam-' + i; for (let L = 1; L < 6 && !seam; L++) if (raw(sd, L)[0] === raw(sd, L - 1)[4]) seam = { sd, L }; }
  t.ok(!!seam, 'fixture: a save is found whose raw order repeats a room across a seam (' + (seam ? seam.sd + ', lap ' + seam.L : 'none') + ')');
  if (seam) {
    const q = seqOf(seam.sd, (seam.L + 1) * 5);
    t.ok(q[seam.L * 5] !== q[seam.L * 5 - 1], 'the seam is mended: the new lap opens on its second room');
    t.eq(q[seam.L * 5] + ',' + q[seam.L * 5 + 1], raw(seam.sd, seam.L)[1] + ',' + raw(seam.sd, seam.L)[0], 'by swapping its first two, and nothing else');
    t.eq(new Set(q.slice(seam.L * 5, seam.L * 5 + 5)).size, 5, 'so the lap still holds every room once');
  }
  // weeks before the first showcase, and far past it
  t.ok(M.some(m => m.id === KP.evalMissionAt({ seed: 'rot-1' }, -7).id) && M.some(m => m.id === KP.evalMissionAt({ seed: 'rot-1' }, 9999).id), 'any week has a room, however early or late');
}

// ---- the next showcase, from the desk's seat ----
{
  const f = fork();
  const before = KP.serialize(f.s);
  const m = roomOf(f.s);
  t.eq(KP.serialize(f.s), before, 'reading the room writes nothing');
  t.ok(m.week > f.s.week && isEval(m.week) && m.week - f.s.week <= E.every, 'the next showcase is ahead, inside a month');
  t.eq(m.label + '|' + m.name, KP.C.TALENT_LABELS[m.id] + '|' + M.find(x => x.id === m.id).name, 'with the room’s name and the talent it is held in');
  t.eq(KP.nextEvalWeek(f.s, m.week), m.week, 'a showcase week is its own next showcase');
  t.eq(KP.nextEvalWeek(f.s, m.week + 1), m.week + E.every, 'and the one after is a month on');
  // the week of a showcase, the desk already reads the one after it
  toEval(f);
  const after = roomOf(f.s);
  t.eq(after.week, f.s.week + E.every, 'the week a showcase is held, the room on the board is next month’s');
  t.ok(after.id !== KP.evalMissionAt(f.s, f.s.week).id, 'and it is a different room from the one just held');
}

// ---- the drill: a week on the month's room is a week drilled ----
{
  const f = fork();
  toEval(f);                       // the month opens
  const m = roomOf(f.s);
  const other = M.find(x => x.id !== m.id).id;
  drill(f, 0, m.id); drill(f, 1, other); drill(f, 2, m.id, 'rest'); drill(f, 3, null);
  f.tr[3].training.focus = [other, m.id];   // forced: the room as her second focus
  tick(f);
  t.eq(f.tr.map(p => p.missionWeeks || 0).join(','), '1,0,0,1', 'a week with the room on her focus is a week drilled: first or second focus, but not elsewhere, and not at rest');
  t.eq(JSON.stringify(KP.missionPrepOf(f.s, f.tr[0])), JSON.stringify({ weeks: 1, of: E.every, share: 1 / E.every, bonus: E.missionPrep / E.every }), 'the read: weeks drilled, of the month, and what that is worth on the day');
  // off the floor: a break, a lineup in rehearsal, an artist
  const g2 = fork(); toEval(g2);
  const m2 = roomOf(g2.s);
  g2.ids.forEach((id, i) => drill(g2, i, m2.id));
  g2.tr[1].flags.personalHiatus = { since: g2.s.week };          // forced: on a break
  g2.s.groups.push({ id: 'gX', name: 'X', members: [g2.ids[2]], roles: {}, debuted: false, prep: { scheduledWeek: g2.s.week + 9 }, releases: [] });   // forced: in rehearsal
  // (the tick is not run with a forged lineup: the counter is read through one week of the rail's own rule)
  const reh = new Set(); g2.s.groups.forEach(g => { if (g.prep) g.members.forEach(id => reh.add(id)); });
  t.ok(reh.has(g2.ids[2]) && KP.onBreak(g2.tr[1]), 'fixture: one on a break, one in a rehearsing lineup');
  g2.s.groups.pop();
  tick(g2);
  t.eq((g2.tr[0].missionWeeks || 0) + ',' + (g2.tr[1].missionWeeks || 0), '1,0', 'a trainee on a break drills nothing');
  // the cap, and the month closing it
  const g3 = fork(); toEval(g3);
  const m3 = roomOf(g3.s);
  drill(g3, 3, m3.id);
  g3.tr[3].missionWeeks = E.every - 1;   // forced: a week short of the month
  tick(g3);
  t.eq(g3.tr[3].missionWeeks, E.every, 'the counter fills');
  g3.tr[3].missionWeeks = E.every;
  if (!isEval(g3.s.week)) { tick(g3); t.eq(g3.tr[3].missionWeeks, E.every, 'and stops at the month: no week past it counts'); }
  toEval(g3);
  t.eq(g3.tr.map(p => p.missionWeeks || 0).join(','), '0,0,0,0', 'the showcase closes the month: every counter starts again');
  // pro rata
  const pr = fork();
  t.eq([0, 1, 2, 3, 4, 9].map(w => { pr.tr[0].missionWeeks = w; return KP.missionPrepOf(pr.s, pr.tr[0]).bonus; }).join(','),
    [0, 1, 2, 3, 4, 4].map(w => Math.round((w / E.every) * E.missionPrep * 100) / 100).join(','), 'the day’s worth is pro rata to the weeks drilled, and capped at the month');
  // a showcase that is not held still closes the month
  const few = fork(); toEve(few);
  few.s.roster = few.s.roster.slice(0, E.minTrainees - 1); few.tr = few.tr.slice(0, E.minTrainees - 1);
  few.tr.forEach(p => { p.missionWeeks = 3; p.training.focus = []; });
  const w = tick(few);
  t.eq(w.filter(n => n.ind === 'evalSheet').length + '|' + few.tr.map(p => p.missionWeeks || 0).join(','), '0|' + few.tr.map(() => 0).join(','), 'a room too small for a showcase posts no sheet, and the month closes all the same');
}

// ---- the day: a drilled room is carried in ----
{
  // the same room, the same nerves, one difference: the last on the sheet drilled it all month
  const mk = (weeks, prep) => {
    const f = fork(); toEval(f); toEve(f);
    f.tr[3].missionWeeks = weeks;                // forced: what she carries in (the eve's own week is not hers: her focus is elsewhere)
    const was = KP.C.EVAL.missionPrep;
    if (prep != null) KP.C.EVAL.missionPrep = prep;
    let wire;
    try { wire = tick(f); } finally { KP.C.EVAL.missionPrep = was; }
    return { f, wire, rank: KP.evalRankOf(f.tr[3]) };
  };
  const none = mk(0), full = mk(E.every);
  t.eq(none.rank, 4, 'fixture: with nothing drilled she is last, as the room’s gaps say');
  t.ok(full.rank <= none.rank, 'the same day with the room drilled: she is never placed lower for it');
  t.eq(full.rank, 4, 'and with gaps this wide the real number does not jump her past anyone: a drilled room is an edge, not a ladder');
  // forced: a room worth more than the whole gap, so the rule itself is visible
  const big = mk(E.every, 200), half = mk(E.every / 2, 200), bigNone = mk(0, 200);
  t.eq(big.rank + '|' + bigNone.rank, '1|4', 'forced to a number wider than the room: the one who drilled it tops the sheet, and without the drilling she does not');
  t.ok(big.rank <= half.rank && half.rank <= bigNone.rank, 'half a month of it places her no higher than the whole month and no lower than none (' + half.rank + ')');
  t.eq(full.f.s.evalLedger.drilledFull - none.f.s.evalLedger.drilledFull, 1, 'the ledger counts a trainee who drilled the whole month');
  // the sheet says so, when she climbed for it
  t.ok(sheetOf(big.wire).text.includes(' ' + KP.displayName(big.f.tr[3]) + ' had drilled it since the day it was posted, and it showed.'), 'the sheet names the one who drilled the room and climbed');
  t.ok(big.f.s.evalLedger.drilledClimbs >= 1, 'and the ledger counts the climb');
  t.ok(!sheetOf(full.wire).text.includes('had drilled it since the day it was posted'), 'one who drilled it and did not climb is not named for it');
  t.ok(!sheetOf(full.wire).text.includes('Nobody had drilled it'), 'but the sheet does not say nobody drilled it');
  t.ok(sheetOf(none.wire).text.includes(' Nobody had drilled it; the room was read on what it already had.'), 'a month nobody drilled says so');
}

// ---- the sheet names the room; the next one is posted with it ----
{
  const f = fork(); toEval(f);
  const m = roomOf(f.s);
  const wire = toEval(f);
  const sh = sheetOf(wire), post = postOf(wire);
  t.eq(sh.mission, m.id, 'the sheet carries the room it was held in');
  t.ok(sh.text.includes(' The room this month was ' + m.name + ': ' + m.what + '.') && !noisy(sh.text), 'and names it, with what it asks');
  t.eq(JSON.stringify(f.s.lastEvalMission), JSON.stringify({ week: f.s.week, id: m.id }), 'the file keeps which room was held last');
  const next = roomOf(f.s);
  t.eq(post.priority + '|' + post.mission, 'flavor|' + next.id, 'the next room is posted the same day, quietly');
  t.eq(post.text, 'Posted under the sheet: next month’s showcase is ' + next.name + ' — ' + next.what + '. ' + when(next.week) + '. A trainee whose focus is on ' + next.label.toLowerCase() + ' from now until then walks in with it drilled.', 'the notice, whole');
  t.ok(next.id !== m.id, 'and it is not the room just held');
  t.eq(wire.filter(n => n.ind === 'evalMission').length, 1, 'one notice a month');
  // the older words are all still there
  t.ok(/Nobody moved|Nothing moved|nothing had moved/.test(sh.text) && sh.priority === 'flavor', 'a month nothing moved still says so, and still posts quietly');
}

// ---- the line: with a project open, the sheet is read at the lineup's edge ----
{
  const mk = (mut) => {
    const f = fork(); toEval(f); toEve(f);
    f.s.project = { locked: [f.ids[0]], seeking: [], openedWeek: f.s.week - 2, speculated: true };   // forced: one locked, two seats open → the line is three
    if (mut) mut(f);
    const wire = tick(f);
    return { f, sh: sheetOf(wire) };
  };
  const still = mk();
  t.ok(still.sh.text.includes(' With a project open the sheet is read at the line: the top 3 have a case.'), 'a project open: the sheet says where the line is');
  t.eq(still.sh.priority, 'flavor', 'and a month nobody crossed it is still a quiet sheet');
  const last = f => f.tr.map(p => p.evalHistory[p.evalHistory.length - 1]);
  // one crosses in, one falls out (forced on last month's sheet: the room's order itself holds)
  const both = mk(f => { last(f)[2].rank = 4; last(f)[3].rank = 3; });
  t.ok(both.sh.text.includes('the top 3 have a case, and ' + KP.displayName(both.f.tr[2]) + ' crossed into it this month as ' + KP.displayName(both.f.tr[3]) + ' fell out of it.'), 'one crossing in as another falls out: both are named');
  t.eq(both.sh.priority, 'high', 'a crossing is news: the sheet posts high');
  t.eq(both.f.s.evalLedger.lineCross - (still.f.s.evalLedger.lineCross || 0), 1, 'the ledger counts the month the line was crossed');
  // only one way (forced: a line of two, so one place of movement is a crossing with a partner the fixture hides)
  const inOnly = mk(f => { f.s.project.locked = []; f.s.project.seeking = ['vocals', 'dance']; last(f)[2].rank = 4; last(f)[3].rank = 4; });
  t.ok(inOnly.sh.text.includes(', and ' + KP.displayName(inOnly.f.tr[2]) + ' crossed into it this month.') && !inOnly.sh.text.includes('fell out of it'), 'a crossing in alone is named alone');
  const outOnly = mk(f => { last(f)[3].rank = 3; last(f)[2].rank = 3; });
  t.ok(outOnly.sh.text.includes(', and ' + KP.displayName(outOnly.f.tr[3]) + ' fell out of it this month.') && !outOnly.sh.text.includes('crossed into it'), 'a fall out alone is named alone');
  // the line never runs past the room
  const wide = mk(f => { f.s.project.locked = f.ids.slice(0, 3); f.s.project.seeking = ['vocals', 'dance', 'rap']; });
  t.ok(wide.sh.text.includes('the top 4 have a case.'), 'a lineup wider than the room: the line is the whole sheet');
  // no project, no line
  const f0 = fork(); toEval(f0);
  t.ok(!sheetOf(toEval(f0)).text.includes('read at the line'), 'with no project open the sheet has no line');
}

// ---- one thing from the room: each kind finds its own subject, or stands down ----
{
  // a room where no kind has a subject: two trainees, the same age, a year in, nothing drilled, nobody on heavy, no close pair
  const quiet = () => {
    const f = fork();
    const rows = f.tr.slice(0, 2).map((p, i) => ({ p, rank: i + 1 }));
    rows.forEach(r => { r.p.age = 17; r.p.signedWeek = f.s.week - 50; r.p.missionWeeks = 0; r.p.training.intensity = 'standard'; r.p.evalHistory = [{ week: 1, rank: r.rank, of: 2 }, { week: 5, rank: r.rank, of: 2 }]; });
    f.s.relationships = {};
    f.s.lastEvalMomentKind = null;
    return { f, rows };
  };
  const q0 = quiet();
  t.eq(KP.evalMoment(q0.f.s, q0.rows), null, 'a room with nothing to say says nothing');
  t.eq(JSON.stringify(KP.EVAL_MOMENTS), JSON.stringify(['newest', 'drilled', 'veteran', 'youngest', 'last', 'pair', 'early']), 'seven kinds');
  const only = (kind, mut) => { const q = quiet(); mut(q); const before = KP.serialize(q.f.s); const m = KP.evalMoment(q.f.s, q.rows); return { q, m: m || { kind: null, text: '', ids: [] }, pure: KP.serialize(q.f.s) === before }; };
  const cases = {
    newest: only('newest', q => { q.rows[1].p.signedWeek = q.f.s.week - 2; q.rows[1].p.evalHistory = []; }),
    drilled: only('drilled', q => { q.rows[0].p.missionWeeks = E.every; }),
    veteran: only('veteran', q => { q.rows[1].p.signedWeek = q.f.s.week - E.momentVeteranWeeks; }),
    youngest: only('youngest', q => { q.rows[1].p.age = 15; }),
    last: only('last', q => { q.rows.push({ p: q.f.tr[2], rank: 3 }); q.f.tr[2].age = 17; q.f.tr[2].signedWeek = q.f.s.week - 50; q.f.tr[2].evalHistory = [{ week: 1, rank: 3, of: 3 }, { week: 5, rank: 3, of: 3 }]; q.f.tr[2].training.intensity = 'standard'; q.f.tr[2].evalBottomStreak = 0; }),
    pair: only('pair', q => { q.f.s.relationships[KP.pairKey(q.rows[0].p, q.rows[1].p)] = { score: 40, state: 'close', coldStreak: 0 }; }),
    early: only('early', q => { q.rows[0].p.training.intensity = 'heavy'; }),
  };
  Object.keys(cases).forEach(k => {
    const c = cases[k];
    t.eq(c.m.kind, k, 'the ' + k + ' moment finds its subject');
    t.ok(c.m.text.length > 30 && !noisy(c.m.text) && c.m.ids.every(id => c.m.text.includes(KP.displayName(c.q.f.s.people[id]))), '…and names ' + (c.m.ids.length === 2 ? 'both of them' : 'her') + ' in whole words');
    t.ok(c.pure, '…and writes nothing');
  });
  t.eq(cases.pair.m.ids.length + '|' + cases.newest.m.ids.join(','), '2|' + cases.newest.q.rows[1].p.id, 'the pair names two, the others one, and the right one');
  // the subjects' own rules
  t.eq(only('last', q => { q.rows.push({ p: q.f.tr[2], rank: 3 }); q.f.tr[2].age = 17; q.f.tr[2].signedWeek = q.f.s.week - 50; q.f.tr[2].evalHistory = [{ week: 1, rank: 3, of: 3 }, { week: 5, rank: 3, of: 3 }]; q.f.tr[2].training.intensity = 'standard'; q.f.tr[2].evalBottomStreak = E.bottomTalkAfter; }).m.kind, null,
    'the month she gets the talk, the last on the sheet is not also the room’s anecdote');
  t.eq(only('youngest', q => { q.rows.forEach(r => { r.p.age = 15; }); }).m.kind, null, 'two who share the youngest age: nobody is “the youngest”');
  t.eq(only('newest', q => { q.rows[1].p.signedWeek = q.f.s.week - 2; }).m.kind, null, 'a new signing who has already had a showcase is not having her first');
  t.eq(only('drilled', q => { q.rows[0].p.missionWeeks = E.every - 1; }).m.kind, null, 'a month a week short is not “in her sleep”');
  // never the same kind two months running
  const two = quiet(); two.rows[0].p.missionWeeks = E.every; two.rows[1].p.age = 15;
  const kinds = new Set();
  for (let w = 1; w <= 40; w++) { two.f.s.week = w; kinds.add(KP.evalMoment(two.f.s, two.rows).kind); }
  t.eq([...kinds].sort().join(','), 'drilled,youngest', 'with two kinds open, the week’s hash picks between them');
  two.f.s.lastEvalMomentKind = 'drilled';
  const forced = new Set();
  for (let w = 1; w <= 40; w++) { two.f.s.week = w; forced.add(KP.evalMoment(two.f.s, two.rows).kind); }
  t.eq([...forced].join(','), 'youngest', 'the kind told last month is not told again');
  const one = quiet(); one.rows[0].p.missionWeeks = E.every; one.f.s.lastEvalMomentKind = 'drilled';
  t.eq(KP.evalMoment(one.f.s, one.rows), null, 'and if it is the only one open, the room says nothing rather than repeat itself');

  // on the wire: the sheet carries it, and the file remembers the kind
  const f = fork(); toEval(f); toEve(f);
  f.tr[1].age = 15;   // forced: a youngest
  const wire = tick(f);
  const sh = sheetOf(wire);
  t.ok(!!sh.moment && sh.text.includes(' One thing from the room: ') && !noisy(sh.text), 'the sheet carries one thing from the room');
  t.eq(f.s.lastEvalMomentKind, sh.moment, 'and the file remembers its kind for next month');
  t.ok((f.s.evalLedger.moments || 0) >= 1, 'the ledger counts it');
  const wire2 = toEval(f);
  t.ok(sheetOf(wire2).moment !== sh.moment, 'next month’s is a different kind, or none');
}

// ---- an old file: nothing to migrate ----
{
  const o = JSON.parse(KP.serialize(base.s));
  o.version = '0.11.12';
  delete o.lastEvalMomentKind; delete o.lastEvalMission;
  Object.values(o.people).forEach(p => { delete p.missionWeeks; });
  o.evalLedger = { sheets: 3, climbs: 1, slides: 1, talks: 0 };
  const s = KP.deserialize(JSON.stringify(o));
  t.eq(s.version, KP.C.VERSION, 'an old file is stamped to this build on load');
  t.eq(KP.validateState(s).length, 0, 'and is valid as it stands');
  const f = { s, ids: base.ids.slice(), tr: base.ids.map(id => s.people[id]) };
  const m = roomOf(s);
  t.ok(!!m.id && KP.missionPrepOf(s, f.tr[0]).weeks === 0, 'its next showcase has a room, and nobody has drilled anything yet');
  const wire = toEval(f);
  t.ok(sheetOf(wire).mission && s.evalLedger.missions === 1 && s.evalLedger.sheets === 4, 'its first sheet on this build names the room, and the older ledger counts on beside the new one');
  t.eq(KP.validateState(s).length, 0, 'the file is valid after it');
}

// ---- the screen: the room on the Training tab, and on the dial ----
{
  const dom = require('./dom_stub');
  const Dm = dom.load();
  const K = Dm.KP, App = Dm.App, el = Dm.el;
  const load = x => { const s = K.deserialize(KP.serialize(x.s)); return { s, tr: base.ids.map(id => s.people[id]) }; };
  const page = (s) => { App.state = s; App.mode = 'game'; App.tab = 'talent'; App.talentSub = 'training'; App.view = null; App.render(); return el('screen').innerHTML; };
  const text = h => dom.stripTags(h).replace(/\s+/g, ' ');
  const clean = h => !/undefined|NaN|\{she\}|\{her\}|\{pos\}|\{Pos\}/.test(h);

  const f = fork(); toEval(f);
  const m = roomOf(f.s);
  drill(f, 1, m.id); drill(f, 2, m.id);
  tick(f);
  if (isEval(f.s.week)) { drill(f, 1, roomOf(f.s).id); }
  const mm = roomOf(f.s);
  const X = load(f);
  let h = page(X.s);
  const T = text(h);
  t.ok(clean(h) && T.includes('This month’s room: ' + mm.name + ' ' + mm.label), 'the Training tab names the month’s room and the talent it is held in');
  t.ok(T.includes('The showcase is ' + K.weekLabel(mm.week).text + '.') && T.includes('walks in with it drilled'), 'with the date, and what drilling it does');
  const drillers = f.tr.filter(p => (p.training.focus || []).includes(mm.id));
  t.ok(drillers.length >= 1 && drillers.every(p => T.includes(K.publicGiven(p) + ' ' + KP.missionPrepOf(f.s, p).weeks + '/' + E.every)), 'and who is drilling it, with the weeks each has in (' + drillers.map(p => KP.missionPrepOf(f.s, p).weeks).join(', ') + ')');
  const chips = dom.actionsIn(h).filter(a => a.action === 'toggle-focus' && a.dataset.domain === mm.id);
  t.eq(chips.length, X.tr.length, 'every trainee has the room on her dial');
  t.ok((h.match(/ · the room<\/button>/g) || []).length === X.tr.length, 'marked as the room, once each');
  // nobody drilling
  const none = fork(); toEval(none);
  none.ids.forEach((id, i) => drill(none, i, null));
  h = page(load(none).s);
  t.ok(text(h).includes('Nobody is drilling it this week.'), 'a room nobody is drilling says so');
  // too few for a showcase: no card
  const few = fork(); few.s.roster = few.s.roster.slice(0, E.minTrainees - 1);
  h = page(load(few).s);
  t.ok(clean(h) && !text(h).includes('This month’s room') && !/ · the room<\/button>/.test(h), 'a room too small for a showcase has no room posted and nothing marked');
}

t.finish();
