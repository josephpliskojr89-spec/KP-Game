/* Suite 131 — the letters that land (v0.11.21, §112).
   The suites read the week's wire before the trim (§99), so a letter can
   pass every check and never reach the Desk. The wait's letters did: the
   week's budget cut most of them, and the census had counted letters
   written. Three things are held here.
     · the law (§89 B): only critical bypasses the week's budget, and what
       is below it competes by priority, then arrival
     · a letter said once is critical at its source, every one on the list
     · the Desk is counted: the tools count what landed, and a one-shot
       written and cut is a violation in both of them */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEngine, makeT } = require('./load_engine');
const desk = require('../tools/desk_count');
const KP = loadEngine();
const t = makeT('suite_131_desk');
const BUDGET = KP.C.EVENTS.maxInboxPerWeek;
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const note = (ind, priority, extra) => Object.assign({ kind: 'company', ind, priority, text: ind + ' ' + priority }, extra || {});
const crowd = (n, priority) => { const out = []; for (let i = 0; i < n; i++) out.push(note('crowd' + i, priority || 'high')); return out; };

// ---- A. the law ---------------------------------------------------------------------
{
  t.eq(BUDGET, 5, 'the week’s budget is five');
  const c = crowd(9);
  const kept = KP.trimWeekNotes(c, BUDGET);
  t.eq(kept.map(n => n.ind).join(','), c.slice(0, 5).map(n => n.ind).join(','), 'of nine high letters the first five to arrive are kept: priority, then arrival');
  const late = note('late', 'high');
  t.ok(!KP.trimWeekNotes(c.concat([late]), BUDGET).includes(late), 'a high letter that arrives after five others is cut, whatever it says');
  const must = note('must', 'critical');
  const k2 = KP.trimWeekNotes(c.concat([must]), BUDGET);
  t.ok(k2.includes(must) && k2.length === BUDGET + 1, 'a critical letter lands on top of the budget and takes no one’s place');
  const lows = [note('n1', 'normal'), note('f1', 'flavor')];
  const k3 = KP.trimWeekNotes(lows.concat(crowd(5)), BUDGET);
  t.ok(!k3.includes(lows[0]) && !k3.includes(lows[1]), 'five high letters leave no room for a normal or a flavor one, even one that arrived first');
  const k4 = KP.trimWeekNotes([note('f1', 'flavor'), note('n1', 'normal')].concat(crowd(4)), BUDGET);
  t.eq(k4.map(n => n.ind).join(','), 'crowd0,crowd1,crowd2,crowd3,n1', 'and the last place goes to the normal one before the flavor one');
}

// ---- B. a letter said once is critical at its source ------------------------------------
{
  const engine = fs.readdirSync(path.join(ROOT, 'js', 'engine')).filter(f => f.endsWith('.js'))
    .map(f => ({ f, lines: read(path.join('js', 'engine', f)).split('\n') }));
  t.ok(desk.ONE_SHOTS.length >= 18 && new Set(desk.ONE_SHOTS).size === desk.ONE_SHOTS.length, 'the list of one-shot letters names each once (' + desk.ONE_SHOTS.length + ')');
  desk.ONE_SHOTS.forEach(k => {
    const sites = [];
    engine.forEach(e => e.lines.forEach((l, i) => { if (l.includes("ind: '" + k + "'")) sites.push({ at: e.f + ':' + (i + 1), l }); }));
    t.ok(sites.length >= 1, 'the engine writes ' + k);
    t.ok(sites.length >= 1 && sites.every(s => /priority: 'critical'/.test(s.l)), k + ' is critical wherever it is written (' + sites.map(s => s.at).join(', ') + ')');
  });
  // the eight this release repaired, by name: each shipped below critical and was measured cut
  ['waitHundred', 'baseLetter', 'waitTurn', 'returnClosing', 'acrossSigned', 'acrossDebut', 'alumAfter', 'mandateMet'].forEach(k =>
    t.ok(desk.ONE_SHOTS.includes(k), k + ' is on the list'));
  // the turn's priority no longer depends on who is still away
  const ab = read('js/engine/absence.js');
  t.ok(!/ind: 'waitTurn', priority: KP\./.test(ab), 'the turn is critical for every man, not only the last one home');
}

// ---- C. the counter -----------------------------------------------------------------
{
  const eng = loadEngine();
  const T = desk.watch(eng);
  t.eq([T.written, T.landed, T.weeks, T.loudest].join('|'), '0|0|0|0', 'a fresh count is empty');
  // a one-shot given the wrong priority, in a loud week: the tripwire
  const wrong = note('baseLetter', 'high');
  eng.trimWeekNotes(crowd(9).concat([wrong]), BUDGET);
  t.eq(desk.cutOneShots(T).join(' ; '), 'baseLetter written 1, landed 0', 'a one-shot letter written below critical and cut is named');
  t.eq([T.written, T.landed, T.weeks].join('|'), '10|5|1', 'ten written, five landed, one week');
  // the same letter at the law's priority
  const m = desk.mark(T);
  const right = note('baseLetter', 'critical');
  eng.trimWeekNotes(crowd(9).concat([right]), BUDGET);
  t.eq(desk.cutOneShots(T, m).length, 0, 'at critical it lands, and nothing is named since the mark');
  t.eq(JSON.stringify(desk.since(T, m, 'baseLetter')), JSON.stringify({ written: 1, landed: 1 }), 'the count since a mark is that stretch’s own');
  t.eq(JSON.stringify(desk.since(T, null, 'baseLetter')), JSON.stringify({ written: 2, landed: 1 }), 'and without a mark it is the whole run’s');
  t.eq(JSON.stringify(desk.since(T, m, 'neverWritten')), JSON.stringify({ written: 0, landed: 0 }), 'a kind nobody wrote counts nothing');
  t.eq(T.loudest, 1, 'the most critical letters in one week is kept');
  // what never reaches the inbox is not counted
  const w0 = T.written;
  eng.trimWeekNotes([note('spot', 'high', { spotlight: true }), note('feed', 'high', { feedOnly: true })], BUDGET);
  t.eq(T.written, w0, 'spotlight and feed-only notes are not letters');
  // a letter with no kind of its own is counted under its voice
  eng.trimWeekNotes([{ kind: 'health', priority: 'high', text: 'a letter with no ind' }], BUDGET);
  t.eq(JSON.stringify(desk.since(T, null, 'kind:health')), JSON.stringify({ written: 1, landed: 1 }), 'a letter with no kind of its own is counted under its voice');
  // paused: a twin's weeks are not the career's
  const w1 = T.written, wk1 = T.weeks;
  T.off = true;
  const keptOff = eng.trimWeekNotes(crowd(9), BUDGET);
  T.off = false;
  t.ok(T.written === w1 && T.weeks === wk1 && keptOff.length === BUDGET, 'switched off, the trim still trims and nothing is counted');
  // the lines
  const ls = desk.lines(T, 1);
  t.eq(ls.length, 2, 'two lines');
  t.ok(/^the Desk: \d+ letters written by the week · \d+ landed · \d+% cut by the week’s budget · the most critical letters in one week \d+$/.test(ls[0]), 'the first says written, landed, the share cut, and the loudest week (' + ls[0] + ')');
  t.ok(ls[1].startsWith('rare and cut (a year of play writes it about once or less; a quarter or more never land): '), 'the second names the rare letters the budget cuts');
}
{
  // rare and cut, on a count made by hand: 104 weeks is two years of play
  const T = { weeks: 104, written: 0, landed: 0, loudest: 0, kinds: {
    oncePerYearCut:   { written: 2, landed: 0 },    // rare, always cut
    oncePerYearHalf:  { written: 2, landed: 1 },    // rare, half cut
    oncePerYearKept:  { written: 2, landed: 2 },    // rare, never cut
    rareMostlyKept:   { written: 2, landed: 2 },
    weekly:           { written: 104, landed: 10 }, // cut, but not rare
    threeAYear:       { written: 6, landed: 0 },    // cut, but not rare
  } };
  t.eq(desk.rareAndCut(T, 1).map(e => e.k).join(','), 'oncePerYearCut,oncePerYearHalf', 'rare and cut: written about once a year or less and cut a quarter of the time or more, the most cut first');
  t.eq(desk.rareAndCut(T, 3).length, 0, 'a kind written fewer times than the floor is not named');
  t.ok(desk.lines(T, 1)[1].endsWith(': oncePerYearCut 2/2 · oncePerYearHalf 1/2'), 'each is printed as cut over written');
  const none = { weeks: 52, written: 5, landed: 5, loudest: 0, kinds: { a: { written: 5, landed: 5 } } };
  t.ok(desk.lines(none, 1)[1].endsWith(': none') && desk.lines(none, 1)[0].includes(' 0% cut '), 'and a run that cut nothing says none');
  const many = { weeks: 5200, written: 0, landed: 0, loudest: 0, kinds: {} };
  for (let i = 0; i < 20; i++) many.kinds['k' + String(i).padStart(2, '0')] = { written: 30, landed: 0 };
  const listed = desk.lines(many, 1)[1].split('): ')[1].split(' · ').filter(x => /^k\d\d 30\/30$/.test(x));
  t.ok(listed.length === 14 && desk.lines(many, 1)[1].endsWith(' · and 6 more'), 'past fourteen the rest are counted, not listed (' + listed.length + ' listed)');
}

// ---- D. through real weeks -----------------------------------------------------------
{
  const eng = loadEngine();
  const T = desk.watch(eng);
  const s = eng.newGame('desk-131', null, { legacy: true });
  let over = 0, weeks = 0;
  for (let i = 0; i < 80; i++) {
    (s.scenes || []).slice().forEach(sc => { const d = eng.sceneDef(sc.kind); if (d) eng.resolveScene(s, sc.id, d.options(s, sc)[0].id); });
    s.budget = Math.max(s.budget, 900);   // the fixture keeps the lights on: a dissolved label has no weeks
    const was = s.week;
    const kept = eng.advanceWeek(s);
    if (s.week === was) continue;
    weeks++;
    const wire = (eng.lastTickNotes || []).filter(n => !n.spotlight && !n.feedOnly);
    const crit = wire.filter(n => n.priority === 'critical').length;
    if (kept.length > BUDGET + crit) over++;
    if (!wire.filter(n => n.priority === 'critical').every(n => kept.includes(n))) over++;
  }
  t.ok(weeks >= 60, 'fixture: the career ran (' + weeks + ' weeks)');
  t.eq(T.weeks, weeks, 'every week of a real career is counted once');
  t.ok(T.written > T.landed && T.landed > 0, 'a real career writes more than lands (' + T.written + ' written, ' + T.landed + ' landed)');
  t.eq(over, 0, 'no week lands more than the budget and its critical letters, and no critical letter is cut');
  t.eq(desk.cutOneShots(T).length, 0, 'no one-shot letter is cut in eighty weeks of it');
}

// ---- E. both tools count the Desk and treat a cut one-shot as a violation --------------
{
  const h = read('tools/harness.js'), l = read('tools/audit_longhaul.js');
  t.ok(/const DESK = deskCount\.watch\(KP\);/.test(h) && /const DESK = deskCount\.watch\(KP\);/.test(l), 'the census and the long haul both watch the trim');
  t.ok(/deskCount\.cutOneShots\(DESK\)\.forEach\(m => violations\.push\(/.test(h), 'in the census a one-shot written and cut is a hard violation');
  t.ok(/deskCount\.cutOneShots\(DESK, deskMark\)\.forEach\(m => flag\(/.test(l), 'in the long haul it is a flag against its scenario');
  t.ok(/deskCount\.lines\(DESK\)\.forEach\(l => console\.log\(l\)\);/.test(h) && /deskCount\.lines\(DESK, 5\)\.forEach\(l => console\.log\(l\)\);/.test(l), 'both print the Desk’s two lines');
  t.ok(/DESK\.off = true;[\s\S]{0,200}KP\.advanceWeek\(a2\); KP\.advanceWeek\(b\);[\s\S]{0,40}DESK\.off = false;/.test(l), 'the long haul’s determinism twins are not counted');
  t.ok(/' \| landed: ' \+/.test(l) && /\['hundred', 'waitHundred'\], \['wrote', 'baseLetter'\], \['turn', 'waitTurn'\]/.test(l), 'the service line says what landed beside what was written');
  // the band that had been ruled from a letter the budget was cutting
  t.ok(/wireMandateMet:\s+\{ lo: 0\.40, hi: 1\.00,/.test(h), 'the met mandate’s band is ruled from the letter landing');
}

t.finish();
