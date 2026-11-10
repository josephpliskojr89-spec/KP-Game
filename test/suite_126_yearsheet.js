/* Suite 126 — the year's sheet (v0.11.16, §107; §96 recommendation 5, the
   trainee years, part three). Owner: "Break remaining work into smaller
   pieces": the year-end sheet ships on its own; the posting is the next.

   The survey asked for "the year-end sheet read in reverse as the loop's
   ceremony". Twelve showcases make a year, and the twelfth sheet was the
   same letter as the other eleven.

   Pinned here:
   · the year so far is a read off what the monthly sheets already wrote:
     a place takes four showcases stood and half of the ones held; the
     order is her standing in the room she stood in, then months at the
     top, her best, how many she stood; this calendar year only; trainees
     on the roster only; it writes nothing
   · the year is read once, on the year's last showcase, and not again
   · the ceremony is one critical letter read from the bottom up: the last
     name in it is the year's first
   · what it does: the year's first, the year's climb, the first name
     read; exact, and no draw
   · the wall keeps three years of sheets
   · a year with too few places has no sheet
   · the words: three, many, the absent, the climb, a closer that turns
     with the year
   · the screen: the year so far under the board, the sheet as read, last
     year's in January, the chip on the board
   Two laws from §99 hold: the week's wire is read before the trim, and a
   fixture forces every gate and relies on no roll. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_126_yearsheet');

const E = KP.C.EVAL, YEAR = KP.C.WEEKS_PER_YEAR;
const firstOf = list => (list && list[0]) || { text: '', priority: null, year: null, personId: null, ind: 'none' };
const noisy = x => /undefined|NaN|Infinity|\{she\}|\{her\}|\{pos\}|\{herself\}|\{hers\}|\{She\}|\{Pos\}|\[object/.test(x);
const when = w => KP.weekLabel(w).text;
const yearOf = wire => wire.filter(n => n.ind === 'evalYear');

// ---- the fixture: a pinned room of six ----
// gaps wider than any fog, frozen ceilings, a first #1 already on file and
// no talk due, so a sheet's order holds. Kept off the bench every week.
const base = (() => {
  const s = KP.newGame('year-126', null, { legacy: false, door: 'fresh' });
  s.budget = 900; KP.advanceWeek(s);
  s.roster = s.roster.filter(id => s.people[id].status === 'trainee').slice(0, 6);
  s.roster.forEach((id, i) => {
    const p = s.people[id];
    KP.C.TALENTS.forEach(d => { p.talents[d].cur = [97, 80, 63, 46, 29, 12][i]; p.flags['ceil_' + d] = p.talents[d].cur; });
    p.flags.firstEvalTopWeek = 1; p.evalBottomStreak = -100; p.evalHistory = [];
    p.signedWeek = s.week - 50; p.age = 17; p.missionWeeks = 0; p.morale = 60;
    p.training.focus = []; p.training.intensity = 'standard';
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
// the showcase weeks of a calendar year, in order
const showcasesOf = year => { const out = []; for (let w = KP.nextEvalWeek(base.s, (year - 1) * YEAR + 1); w <= year * YEAR; w += E.every) out.push(w); return out; };
const Y1 = showcasesOf(1), Y2 = showcasesOf(2);
function tick(f) {
  f.tr.forEach(p => { if (!p) return; p.flags.burnout = 0; p.fatigue = 0; p.evalBottomStreak = Math.min(p.evalBottomStreak || 0, -50); });
  f.s.scenes = [];
  f.s.budget = Math.max(f.s.budget, 900);
  KP.advanceWeek(f.s);
  return (KP.lastTickNotes || []).slice();
}
// a year written on the files by hand: ranks[i] is trainee i's rank on each
// showcase (null = she did not stand it). Every sheet is of six.
function write(f, weeks, ranks, of) {
  f.tr.forEach((p, i) => {
    p.evalHistory = (p.evalHistory || []).concat(weeks.map((w, k) => ranks[i][k] == null ? null : { week: w, rank: ranks[i][k], of: of || 6 }).filter(Boolean)).slice(-E.historyCap);
  });
}
const rep = (v, n) => Array.from({ length: n }, () => v);
const names = f => f.tr.map(p => KP.displayName(p));

{
  const f = fork();
  t.eq(f.tr.length + '|' + Y1.length + '|' + Y2.length, '6|12|12', 'fixture: a room of six, and twelve showcases in each of the first two years');
  t.ok(f.tr.every(p => p.status === 'trainee' && !KP.onBreak(p)), 'fixture: all six are trainees, on the floor');
  t.ok(E.yearMinSheets === 4 && E.historyCap >= 12 && E.minTrainees === 3, 'fixture: a place takes four showcases, a file keeps a year of sheets, a sheet needs three');
  t.ok(new Set(names(f)).size === 6, 'fixture: six different names');
}

// ---- the read: the year so far, off the files ---------------------------------
{
  const f = fork(); f.s.week = Y1[11];                       // the day of the year's last showcase, sheets already on the files
  write(f, Y1, [
    rep(1, 12),                                              // A: first every month
    [6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 2, 2],                    // B: the year's climb, 6th to 2nd
    [null, null, null, null, null, null, 3, 3, 4, 4, 3, 3],  // C: stood six of twelve: exactly half
    [null, null, null, null, null, null, null, 4, 5, 5, 4, 4],   // D: stood five: short
    [5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],                    // E: the bottom of the year
    [2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 5, 5],                    // F: a slide
  ]);
  const before = KP.serialize(f.s);
  const r = KP.evalYearRead(f.s);
  t.eq(KP.serialize(f.s), before, 'the read writes nothing');
  t.eq([r.year, r.held, r.need, r.toGo, r.ok].join('|'), '1|12|6|0|true', 'year one: twelve showcases held, a place takes six of them, none to go');
  const [A, B, C, D, Ee, F] = f.tr;
  t.eq(r.rows.map(x => x.p.id).join(','), [A, F, C, B, Ee].map(p => p.id).join(','), 'the order is her standing across the year: first every month, then the steady second, the half-year in the middle of the sheet, the climber who spent the spring at the bottom, and the bottom');
  t.eq(r.rows.map(x => x.place).join(','), '1,2,3,4,5', 'places run from one');
  t.eq(r.fresh.map(p => p.id).join(','), D.id, 'five showcases of twelve is short of a place');
  const row = p => r.rows.find(x => x.p === p) || {};
  t.eq([row(A).sheets, row(A).firsts, row(A).best, row(A).mean, row(A).move].join('|'), '12|12|1|1|0', 'her row: showcases stood, months at the top, her best, her average, how far she moved');
  t.eq([row(B).sheets, row(B).firsts, row(B).best, row(B).mean, row(B).move, row(B).first.rank, row(B).last.rank].join('|'), '12|0|2|3.7|4|6|2', 'the climber’s row carries where the year began and where it ends');
  t.eq(r.top.p.id + '|' + r.climb.p.id, A.id + '|' + B.id, 'the year’s first, and the year’s climb');
  t.eq(row(F).move, -3, 'a slide is a negative move, and nobody’s climb');
  // this calendar year only
  A.evalHistory = [{ week: Y1[0] - 4 > 0 ? Y1[0] - 4 : 0, rank: 6, of: 6 }].concat(A.evalHistory).slice(-13);
  const g = fork(); g.s.week = Y2[2];
  write(g, Y1.slice(-9), [rep(1, 9), rep(2, 9), rep(3, 9), rep(4, 9), rep(5, 9), rep(6, 9)]);
  write(g, Y2.slice(0, 3), [rep(6, 3), rep(5, 3), rep(4, 3), rep(3, 3), rep(2, 3), rep(1, 3)]);
  const r2 = KP.evalYearRead(g.s);
  t.eq([r2.year, r2.held, r2.rows.length, r2.fresh.length, r2.toGo, r2.ok].join('|'), '2|3|0|6|9|false', 'in March of year two the year has three showcases, nobody has a place yet, and nine are to go: last year’s sheets do not count');
  const r1 = KP.evalYearRead(g.s, 1);
  t.eq(r1.year + '|' + r1.rows.map(x => x.p.id).join(','), '1|' + g.tr.map(p => p.id).join(','), 'last year can still be read by asking for it');
  t.eq(r1.held + '|' + r1.rows.map(x => x.sheets).join(','), '9|9,9,9,9,9,9', 'and it is last year’s sheets alone: this year’s three are not in it');
  // trainees on the roster only
  const h = fork(); h.s.week = Y1[11];
  write(h, Y1, [rep(1, 12), rep(2, 12), rep(3, 12), rep(4, 12), rep(5, 12), rep(6, 12)]);
  h.tr[0].status = 'idol';                                   // she debuted in the autumn
  h.s.roster = h.s.roster.filter(id => id !== h.tr[5].id);   // she was released
  const r3 = KP.evalYearRead(h.s);
  t.eq(r3.rows.map(x => x.p.id).join(','), [1, 2, 3, 4].map(i => h.tr[i].id).join(','), 'an artist who debuted and a trainee who left are not on it: the sheet is the room’s');
}
// the order is her standing in the room she stood in, not her average rank; then the tie-breaks
{
  const f = fork(); f.s.week = Y1[11];
  f.tr.forEach(p => { p.evalHistory = []; });
  const [A, B, C, D] = f.tr;
  f.s.roster = [A.id, B.id, C.id, D.id];
  A.evalHistory = Y1.map(w => ({ week: w, rank: 3, of: 3 }));     // last of three, every month (average 3)
  B.evalHistory = Y1.map(w => ({ week: w, rank: 4, of: 8 }));     // the middle of eight (average 4)
  C.evalHistory = Y1.map(w => ({ week: w, rank: 2, of: 3 }));
  D.evalHistory = Y1.map(w => ({ week: w, rank: 1, of: 3 }));
  const r = KP.evalYearRead(f.s);
  t.ok(r.rows.findIndex(x => x.p === B) < r.rows.findIndex(x => x.p === A), 'the middle of a room of eight stands above the bottom of a room of three, whatever the numbers were');
  // equal standing: more months at the top, then the better best, then more showcases, then the file
  const g = fork(); g.s.week = Y1[11];
  // (the files are dealt against the order the tie-breaks give, so the last
  // resort, the file's own id, cannot hand any of them the right answer)
  const [W, S, R, Q, P] = g.tr; g.s.roster = [W.id, S.id, R.id, Q.id, P.id];
  g.tr.forEach(p => { p.evalHistory = []; });
  P.evalHistory = Y1.map((w, k) => ({ week: w, rank: [1, 3][k % 2], of: 5 }));           // six firsts, six thirds
  Q.evalHistory = Y1.map(w => ({ week: w, rank: 2, of: 5 }));                              // twelve seconds of five
  R.evalHistory = Y1.map((w, k) => ({ week: w, rank: k < 4 ? 1 : k < 8 ? 2 : 3, of: 5 }));   // four firsts
  S.evalHistory = Y1.slice(0, 8).map(w => ({ week: w, rank: 2, of: 5 }));                  // eight seconds of five
  W.evalHistory = Y1.map(w => ({ week: w, rank: 3, of: 9 }));                              // twelve thirds of nine: the same standing, a worse best
  const o = KP.evalYearRead(g.s).rows;
  t.ok(o.length === 5 && new Set(o.map(x => x.pct.toFixed(6))).size === 1, 'fixture: five trainees with the same standing across the year');
  t.eq(o.map(x => x.p.id).join(','), [P, R, Q, S, W].map(p => p.id).join(','), 'equal standing is broken by months at the top, then by her best month, then by how many showcases she stood');
  t.ok([P, R, Q, S, W].map(p => p.id).join(',') !== [P, R, Q, S, W].map(p => p.id).sort().join(','), 'fixture: and that is not the order of the files');
  // the year's climb takes two places
  const c = fork(); c.s.week = Y1[11];
  write(c, Y1, [rep(1, 12), [3].concat(rep(2, 11)), [2].concat(rep(3, 11)), rep(4, 12), rep(5, 12), rep(6, 12)]);
  t.eq(KP.evalYearRead(c.s).rows[1].move + '|' + KP.evalYearRead(c.s).climb, '1|null', 'one place up across the year is not the year’s climb');
  write(c, [], []); c.tr[3].evalHistory[0].rank = 6;
  t.eq((KP.evalYearRead(c.s).climb || { p: {} }).p.id + '|' + E.yearClimbAt, c.tr[3].id + '|2', 'two places is');
  // two who climbed: the further; and of two who climbed the same, the better placed
  const d2 = fork(); d2.s.week = Y1[11];
  write(d2, Y1, [rep(1, 12), [6].concat(rep(2, 11)), [5].concat(rep(3, 11)), rep(4, 12), rep(5, 12), rep(6, 12)]);
  const rd = KP.evalYearRead(d2.s);
  t.eq(rd.rows.slice(1, 3).map(x => x.move).join(',') + '|' + rd.climb.p.id, '4,2|' + d2.tr[1].id, 'of two who climbed, the year’s climb is the one who climbed further');
  d2.tr[1].evalHistory[0].rank = 4;
  const re = KP.evalYearRead(d2.s);
  t.eq(re.rows.slice(1, 3).map(x => x.move).join(',') + '|' + re.climb.p.id, '2,2|' + d2.tr[1].id, 'and of two who climbed the same, the better placed');
}

// ---- when it is read: once, on the year's last showcase ------------------------
{
  const seeds = Array.from({ length: 16 }, (_, i) => 'due-' + i);
  let ok = 0, phases = new Set();
  seeds.forEach(seed => {
    const s = { seed, week: 0, evalYears: [] };
    phases.add(KP.evalPhase(s));
    const due = [];
    for (let w = 1; w <= 3 * YEAR; w++) { s.week = w; if (KP.evalYearDue(s)) due.push(w); }
    const last = y => { let w = KP.nextEvalWeek(s, (y - 1) * YEAR + 1), l = w; s.week = 0; while (w <= y * YEAR) { l = w; w += E.every; } return l; };
    if (due.join(',') === [1, 2, 3].map(last).join(',') && due.every(w => w > Math.floor((w - 1) / YEAR) * YEAR + YEAR - E.every)) ok++;
  });
  t.eq(ok + '|' + (phases.size >= 3), '16|true', 'in sixteen saves of every phase the year is due exactly once a year, on its last showcase, inside the year’s last month');
  // showcases to go, counted the long way, every week of two years in every phase
  let wrong = 0;
  seeds.forEach(seed => {
    const s = { seed, week: 0, roster: [], people: {} };
    for (let w = 1; w <= 2 * YEAR; w++) {
      s.week = w;
      const end = (Math.floor((w - 1) / YEAR) + 1) * YEAR;
      let n = 0; for (let x = w + 1; x <= end; x++) if (x === KP.nextEvalWeek(s, x)) n++;
      if (KP.evalYearRead(s).toGo !== n) wrong++;
    }
  });
  t.eq(wrong, 0, 'and the showcases still to go this year are counted right every week, in every phase');
  const f = fork(); f.s.week = Y1[11];
  t.eq(KP.evalYearDue(f.s), true, 'the year’s last showcase is the day');
  f.s.evalYears = [{ year: 1, week: Y1[11], rows: [] }];
  t.eq(KP.evalYearDue(f.s), false, 'and a year already read is not read again');
  f.s.evalYears = []; f.s.week = Y1[10];
  t.eq(KP.evalYearDue(f.s), false, 'the showcase before it is an ordinary month');
  f.s.week = Y1[11] - 1;
  t.eq(KP.evalYearDue(f.s), false, 'and a week with no showcase is not the day');
}

// ---- the ceremony, through the week's own rail --------------------------------
// Eleven months are on the files by hand; the twelfth is held for real.
const ELEVEN = [rep(1, 11), [6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 2], rep(3, 11).map((v, k) => k < 6 ? 2 : 3), rep(4, 11), rep(5, 11).map((v, k) => k < 2 ? 5 : 6), rep(6, 11).map((v, k) => k < 2 ? 3 : k < 6 ? 6 : 5)];
const yearEnd = (mut) => {
  const f = fork();
  write(f, Y1.slice(0, 11), ELEVEN);
  f.s.lastEvalTopId = f.tr[0].id;
  if (mut) mut(f);
  f.s.week = Y1[11] - 1;
  const morale = f.tr.map(p => p.morale);
  const wire = tick(f);
  return { f, wire, morale };
};
{
  const a = yearEnd(), b = yearEnd(f => { f.s.evalYears = [{ year: 1, week: 1, held: 0, topId: null, climbId: null, rows: [] }]; });   // the twin: the year already read
  const { f, wire } = a, tr = f.tr;
  const n = firstOf(yearOf(wire));
  t.eq(f.s.week + '|' + tr.map(p => KP.evalRankOf(p)).join(','), Y1[11] + '|1,2,3,4,5,6', 'fixture: the twelfth showcase is held, and the room’s order holds on it');
  t.eq(yearOf(wire).length + '|' + n.priority + '|' + n.year + '|' + n.personId + '|' + n.kind, '1|critical|1|' + tr[0].id + '|company', 'the year is read once, in one critical letter, with the year’s first on it');
  t.ok(wire.some(x => x.ind === 'evalSheet') && wire.some(x => x.ind === 'evalMission'), 'beside the month’s own sheet and the next room, which are posted as ever');
  const read = KP.evalYearRead(f.s);
  const N = names(f);
  t.eq(read.rows.map(x => x.p.id).join(','), [0, 2, 1, 3, 5, 4].map(i => tr[i].id).join(','), 'fixture: the year’s order, from her standing across twelve showcases (the climber is second on the last sheet and third on the year)');
  t.ok(n.text.startsWith('The year’s sheet went up beside this month’s, and the head coach read it the way it is always read: from the bottom up. From the bottom: ' + N[4] + ', ' + N[5] + ', ' + N[3] + '. '), 'it is read from the bottom up: sixth, fifth, fourth');
  t.ok(n.text.includes('Third, ' + N[1] + ': best month a 2nd, in 12 showcases. Second, ' + N[2] + ': best month a 2nd, in 12 showcases. And first on the year, ' + N[0] + ': 12 months at the top, in 12 showcases. '), 'then third, second, and the year’s first read last, each with what she did with the year');
  const pos = read.rows.map(x => n.text.indexOf(KP.displayName(x.p)));
  t.ok(pos.every((v, i) => v > 0 && (i === 0 || v < pos[i - 1])), 'every name is in it, and each is read before the one who placed above her');
  t.ok(n.text.includes('The year’s climb was ' + N[1] + '’s: 6th in January, 2nd now. '), 'the year’s climb is named, with where she began and where she is');
  t.ok(n.text.includes(' 12 showcases this year. ') && !noisy(n.text) && n.text.length < 900, 'with the year’s count, and no token leaking (' + n.text.length + ' characters)');
  // what it does, exactly: the twin's week is the same week without the reading
  const d = tr.map((p, i) => p.morale - b.f.tr[i].morale);
  t.eq(d.join(','), [E.yearTopMorale, E.yearClimbMorale, 0, 0, 0, 0].join(','), 'the year’s first gains ' + E.yearTopMorale + ' morale, the year’s climb ' + E.yearClimbMorale + ', and nobody else moves');
  t.eq(JSON.stringify(f.s.rngState), JSON.stringify(b.f.s.rngState), 'the ceremony draws nothing: both weeks leave the stream in the same place');
  t.eq(JSON.stringify(tr[0].flags.yearTop) + '|' + JSON.stringify(b.f.tr[0].flags.yearTop), '[1]|undefined', 'her file is marked first of the year');
  const last = p => (p.history[p.history.length - 1] || {}).text || '';
  t.eq(last(tr[0]), 'First on the year’s sheet for Y1: 12 months at the top, in 12 showcases. Her name was read last, which is how the room is told.', 'the year’s first has it on her file');
  t.eq(last(tr[1]), 'The year’s climb for Y1: 6th in January, 2nd on the year’s last sheet. The head coach said so in front of the room.', 'the year’s climb has it on hers');
  t.eq(last(tr[4]), 'Read first off the year’s sheet for Y1, which is read from the bottom.', 'and the first name read has that on hers');
  t.ok([2, 3, 5].every(i => !/year’s sheet|year’s climb/.test(last(tr[i]))), 'nobody else’s file is written on');
  const L = f.s.evalLedger, Lb = b.f.s.evalLedger;
  t.eq((L.years || 0) + '|' + (L.yearClimbs || 0) + '|' + (Lb.years || 0) + '|' + (Lb.yearClimbs || 0), '1|1|0|0', 'the ledger counts the year read and the climb named');
  // the wall
  const w = (f.s.evalYears || [])[0] || { rows: [] };
  t.eq([(f.s.evalYears || []).length, w.year, w.week, w.held, w.topId, w.climbId].join('|'), [1, 1, Y1[11], 12, tr[0].id, tr[1].id].join('|'), 'the wall keeps the sheet: the year, the day, the count, the first and the climb');
  t.eq(w.rows.map(x => x.place + ':' + x.name + ':' + x.firsts + ':' + x.sheets).join(','), read.rows.map(x => x.place + ':' + KP.displayName(x.p) + ':' + x.firsts + ':' + x.sheets).join(','), 'with every name in its place, as it was read');
  t.eq(KP.validateState(f.s).length, 0, 'the file is valid');
  // once
  t.eq(KP.evalYearDue(f.s), false, 'the year is read: it is not due again');
  let again = 0;
  for (let i = 0; i < 8; i++) again += yearOf(tick(f)).length;
  t.eq(again + '|' + (f.s.evalYears || []).length, '0|1', 'two months into the new year nothing more has been read');
  const round = KP.deserialize(KP.serialize(f.s));
  t.eq(JSON.stringify(round.evalYears), JSON.stringify(f.s.evalYears), 'the wall survives a save and a load');
}
// an ordinary month is not the year
{
  const f = fork(); write(f, Y1.slice(0, 10), ELEVEN.map(r => r.slice(0, 10))); f.s.week = Y1[10] - 1;
  const wire = tick(f);
  t.eq(f.s.week + '|' + wire.filter(x => x.ind === 'evalSheet').length + '|' + yearOf(wire).length + '|' + (f.s.evalYears || []).length + '|' + KP.evalYearRead(f.s).rows.length, Y1[10] + '|1|0|0|6', 'the eleventh showcase posts its sheet and reads no year, though six trainees have a place on it');
}
// the first name read is not written on twice when she is also the year's climb
{
  const { f, wire } = yearEnd(f => {
    f.tr.forEach(p => { p.evalHistory = []; });
    write(f, Y1.slice(0, 11), [rep(1, 11), rep(2, 11), rep(3, 11), rep(4, 11), rep(5, 11), rep(6, 11)]);
    f.s.roster.forEach((id, i) => { const p = f.s.people[id]; KP.C.TALENTS.forEach(dd => { p.talents[dd].cur = [97, 80, 63, 12, 29, 46][i]; p.flags['ceil_' + dd] = p.talents[dd].cur; }); });   // forced: the sixth has a month of her life, the fourth a bad one
  });
  const read = KP.evalYearRead(f.s), n = firstOf(yearOf(wire));
  const sixth = f.tr[5], lastRow = read.rows[read.rows.length - 1];
  t.eq(KP.evalRankOf(sixth) + '|' + lastRow.p.id + '|' + (read.climb || { p: {} }).p.id, '4|' + sixth.id + '|' + sixth.id, 'fixture: the bottom of the year climbed two places on the last sheet, and is still the bottom of the year');
  const tail = sixth.history.slice(-2).map(x => x.text);
  t.ok(tail.some(x => /^The year’s climb for Y1: 6th in January, 4th on the year’s last sheet/.test(x)) && !tail.some(x => /^Read first off the year’s sheet/.test(x)), 'she is named for the climb, and her file is not also told she was read first');
  t.ok(n.text.includes('From the bottom: ' + KP.displayName(sixth) + ', ') && n.text.includes('The year’s climb was ' + KP.displayName(sixth) + '’s: 6th in January, 4th now.'), 'the letter says both');
}
// the first of the year is not its own climb
{
  const { f, wire } = yearEnd(f => {
    f.tr.forEach(p => { p.evalHistory = []; });
    write(f, Y1.slice(0, 11), [[4, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1], rep(2, 11).map((v, k) => k < 2 ? 1 : 2), rep(3, 11).map((v, k) => k === 0 ? 2 : k === 1 ? 4 : 3), rep(4, 11).map((v, k) => k === 0 ? 3 : 4), rep(5, 11), rep(6, 11)]);
  });
  const read = KP.evalYearRead(f.s), n = firstOf(yearOf(wire));
  t.eq(read.top.p.id + '|' + read.top.move + '|' + read.climb, f.tr[0].id + '|3|null', 'fixture: the year’s first climbed three places herself, and nobody else climbed two');
  t.ok(!/The year’s climb/.test(n.text) && !f.tr.some(p => /The year’s climb/.test((p.history[p.history.length - 1] || {}).text || '')), 'her clause already says it: no climb is named, in the letter or on a file');
  t.eq(f.s.evalLedger.yearClimbs || 0, 0, 'and none is counted');
}

// ---- a year with too few places has no sheet -----------------------------------
{
  const thin = yearEnd(f => { f.tr.forEach((p, i) => { if (i >= 2) p.evalHistory = p.evalHistory.slice(-4); }); });   // four of six stood five showcases of twelve
  const r = KP.evalYearRead(thin.f.s);
  t.eq(r.rows.length + '|' + r.fresh.length + '|' + r.ok, '2|4|false', 'fixture: two trainees have a place and four are short of one');
  t.eq(yearOf(thin.wire).length + '|' + (thin.f.s.evalYears || []).length + '|' + (thin.f.s.evalLedger.years || 0), '0|0|0', 'two places are not a sheet: nothing is read, kept or counted');
  t.ok(thin.f.tr.every(p => !/year’s sheet|year’s climb/.test((p.history[p.history.length - 1] || {}).text || '') && !p.flags.yearTop), 'and nobody’s file is written on');
  t.ok(thin.wire.some(x => x.ind === 'evalSheet'), 'the month’s own sheet is posted all the same');
  // a room too small to hold the showcase at all
  const small = yearEnd(f => { f.s.roster = f.s.roster.slice(0, 2); f.tr = f.tr.slice(0, 2); });
  t.eq(small.wire.filter(x => x.ind === 'evalSheet' || x.ind === 'evalYear').length, 0, 'a room too small for a showcase has no sheet of either kind');
}

// ---- the wall keeps three years --------------------------------------------------
{
  const { f } = yearEnd(f => { f.s.evalYears = [-2, -1, 0].map(y => ({ year: y, week: 1, held: 12, topId: null, climbId: null, rows: [] })); });
  t.eq((f.s.evalYears || []).map(y => y.year).join(','), '-1,0,1', 'a fourth year pushes the oldest off the wall (' + E.yearKeep + ' are kept)');
}

// ---- the words ------------------------------------------------------------------
{
  const f = fork(); f.s.week = Y1[11];
  write(f, Y1, [rep(1, 12), rep(2, 12), rep(3, 12), rep(4, 12), rep(5, 12), rep(6, 12)]);
  const N = names(f);
  const three = KP.evalYearRead(Object.assign({}, f.s, { roster: f.s.roster.slice(0, 3) }));
  const txt3 = KP.evalYearText(f.s, three);
  t.ok(!/From the bottom/.test(txt3) && txt3.includes('from the bottom up. Third, ' + N[2] + ': best month a 3rd, in 12 showcases. Second, ' + N[1] + ': best month a 2nd, in 12 showcases. And first on the year, ' + N[0] + ': 12 months at the top'), 'a sheet of three is read third, second, first');
  // the absent: one, two, three names
  const withFresh = k => { const g = fork(); g.s.week = Y1[11]; write(g, Y1, [rep(1, 12), rep(2, 12), rep(3, 12)].concat([0, 1, 2].map(i => i < k ? rep(null, 9).concat([4, 4, 4]) : rep(null, 12)))); return KP.evalYearText(g.s, KP.evalYearRead(g.s)); };
  t.ok(withFresh(1).includes(' ' + N[3] + ' did not stand enough of the year’s showcases for a place on it. '), 'one who was short is named');
  t.ok(withFresh(2).includes(' ' + N[3] + ' and ' + N[4] + ' did not stand enough of the year’s showcases for a place on it. '), 'two are named with an “and”');
  t.ok(withFresh(3).includes(' ' + N[3] + ', ' + N[4] + ' and ' + N[5] + ' did not stand enough of the year’s showcases for a place on it. '), 'three with a comma and an “and”');
  t.ok(!/did not stand enough/.test(KP.evalYearText(f.s, KP.evalYearRead(f.s))), 'and nobody is, when everybody has a place');
  // the clause
  const cl = (firsts, best, sheets) => KP.evalYearClause({ firsts, best, sheets });
  t.eq([cl(1, 1, 7), cl(3, 1, 12), cl(0, 2, 6)].join(' / '), '1 month at the top, in 7 showcases / 3 months at the top, in 12 showcases / best month a 2nd, in 6 showcases', 'the clause: months at the top, or her best month');
  t.eq([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(b => cl(0, b, 4).split(' ')[3].replace(',', '')).join(' '), '1st 2nd 3rd 4th 11th 12th 13th 21st 22nd 23rd 101st 111th', 'ordinals are written as they are said');
  // the closer turns with the year
  const read = KP.evalYearRead(f.s);
  const closerOf = y => KP.evalYearText(f.s, Object.assign({}, read, { year: y })).split(' showcases this year. ')[1];
  const cs = [1, 2, 3, 4, 5, 6].map(closerOf);
  t.ok(cs.every((c, i) => i === 0 || c !== cs[i - 1]) && new Set(cs).size === 3 && cs.every(c => c.length > 40 && !noisy(c)), 'the last sentence is one of three, and never the same two years running');
  t.eq(closerOf(2), closerOf(2), 'and one year always closes the same way');
  t.eq(KP.evalYearText(f.s, read), KP.evalYearText(f.s, read), 'the whole letter is the same letter, read twice');
}

// ---- an old file: the year's sheet needs nothing a file from before does not have ----
// v0.11.15 wrote the same twelve sheets on every file. The version is set by
// hand: the build's own number moves at the ship.
{
  const src = fork(); write(src, Y1.slice(0, 11), ELEVEN); src.s.lastEvalTopId = src.tr[0].id; src.s.week = Y1[11] - 1;
  const o = JSON.parse(KP.serialize(src.s));
  o.version = '0.11.15'; delete o.evalYears;
  const f = { s: KP.deserialize(JSON.stringify(o)), ids: base.ids.slice() }; f.tr = f.ids.map(id => f.s.people[id]);
  t.eq(f.s.version + '|' + KP.evalYearRead(f.s).rows.length, KP.C.VERSION + '|6', 'an old file is stamped to this build, and its year so far reads off the sheets it already carries');
  const n = firstOf(yearOf(tick(f)));
  t.ok(n.priority === 'critical' && (f.s.evalYears || []).length === 1, 'and its year is read on the year’s last showcase, like any other');
}

// ---- the screen ------------------------------------------------------------------
{
  const dom = require('./dom_stub');
  const Dm = dom.load();
  const K = Dm.KP, App = Dm.App, el = Dm.el;
  const page = (s) => { App.state = s; App.mode = 'game'; App.tab = 'talent'; App.talentSub = 'training'; App.view = null; App.render(); return el('screen').innerHTML; };
  const text = h => dom.stripTags(h).replace(/\s+/g, ' ');
  const clean = h => !/undefined|NaN|\{she\}|\{her\}|\{pos\}|\{Pos\}/.test(h);
  const load = f => K.deserialize(KP.serialize(f.s));
  // the year so far: October, ten showcases held
  const f = fork(); write(f, Y1.slice(0, 10), ELEVEN.map(r => r.slice(0, 10))); f.s.week = Y1[9];
  const read = KP.evalYearRead(f.s);
  let h = page(load(f)), T = text(h);
  t.ok(clean(h) && T.includes('The year so far · Y1'), 'the Training tab shows the year so far, under the board');
  t.ok(T.includes(read.rows.map(x => x.place + ' ' + KP.displayName(x.p) + (x.firsts ? ' ' + x.firsts + '× first' : '')).join(' · ')), 'every trainee with a place, in order, with her months at the top');
  t.ok(T.includes('2 showcases to go. On the year’s last showcase the head coach reads this from the bottom up. A place on it takes 5 showcases stood.'), 'what is left of the year, when it is read, and what a place takes');
  // short of a place
  const s2 = fork(); write(s2, Y1.slice(0, 10), ELEVEN.map((r, i) => i === 5 ? rep(null, 8).concat([6, 6]) : r.slice(0, 10))); s2.s.week = Y1[9];
  T = text(page(load(s2)));
  t.ok(T.includes('A place on it takes 5 showcases stood; 1 trainee is short of that.'), 'and how many are short of one');
  // too early: no block
  const early = fork(); write(early, Y1.slice(0, 2), ELEVEN.map(r => r.slice(0, 2))); early.s.week = Y1[1];
  T = text(page(load(early)));
  t.ok(!/The year so far|The year’s sheet|Last year’s sheet/.test(T) && T.includes('The evaluation board'), 'in February nobody has a place and the board stands alone');
  // the sheet as it was read
  const done = yearEnd();
  h = page(load(done.f)); T = text(h);
  const w = (done.f.s.evalYears || [])[0] || { rows: [], week: 0 };
  t.ok(clean(h) && T.includes('The year’s sheet · Y1') && !T.includes('The year so far'), 'once it is read the block is the year’s sheet');
  t.ok(T.includes(w.rows.map(x => x.place + ' ' + x.name + (x.firsts ? ' ' + x.firsts + '× first' : '')).join(' · ')) && T.includes('Read from the bottom up on ' + when(w.week) + '. It stays on the wall until the new year.'), 'as it was read, with the day');
  t.ok(T.includes('first of Y1'), 'and the year’s first carries it on the board');
  // January: last year's is still on the wall
  const jan = fork(done.f); jan.s.week = Y2[0];
  jan.tr.forEach(p => { p.evalHistory.push({ week: Y2[0], rank: KP.evalRankOf(p), of: 6 }); p.evalHistory = p.evalHistory.slice(-E.historyCap); });
  T = text(page(load(jan)));
  t.ok(T.includes('Last year’s sheet · Y1') && T.includes('Still on the wall. This year’s has no places yet: it takes 4 showcases stood.'), 'in January last year’s sheet is still on the wall, until this year has places of its own');
  // the board is the latest sheet. A real career put the year's first on a
  // break for the year's last showcase, and the board showed her old "1"
  // above the new first, under last month's date (found in a screenshot).
  const gone = yearEnd(f => { f.tr[0].flags.burnout = 3; f.tr = f.tr.slice(1); });   // forced: the first is on the bench for the twelfth
  const gs = gone.f.s, ace = gs.people[base.ids[0]];
  t.eq(ace.evalHistory[ace.evalHistory.length - 1].week + '|' + gone.f.tr.map(p => KP.evalRankOf(p)).join(','), Y1[10] + '|1,2,3,4,5', 'fixture: the year’s first did not stand the twelfth showcase; five did');
  h = page(load(gone.f)); T = text(h);
  const board = (T.split('The evaluation board')[1] || '').split('The year’s sheet')[0];
  t.ok(board.startsWith(' Posted ' + when(Y1[11]) + ' · next board ' + when(Y1[11] + E.every) + '.'), 'the board is dated by the sheet that was just posted');
  const sheet = board.split('Not on this sheet')[0], under = (board.split('Not on this sheet:')[1] || '').replace(/\s+/g, ' ');
  t.eq((sheet.match(/(^|\s)1 /g) || []).length, 1, 'and has one first on it, not two');
  t.ok(gone.f.tr.every((p, i) => sheet.includes((i + 1) + ' ' + KP.displayName(p))) && !sheet.includes(KP.displayName(ace)), 'the five who stood it are on it in order, and she is not among them');
  t.ok(under.startsWith(' ' + KP.displayName(ace) + ' first of Y1 (last ranked 1 of 6, ' + when(Y1[10]) + ')'), 'she is named under it, with the year that was hers and where she last stood');
  t.ok(firstOf(yearOf(gone.wire)).text.includes('And first on the year, ' + KP.displayName(ace) + ': 11 months at the top, in 11 showcases.'), 'and the year is still hers: eleven of twelve is a year');
  // a room with no year at all
  const none = fork(); none.s.week = Y1[1]; write(none, Y1.slice(0, 2), ELEVEN.map(r => r.slice(0, 2))); none.s.evalYears = [];
  t.ok(!/year’s sheet/i.test(text(page(load(none)))), 'a room with no year behind it shows none');
}

t.finish();
