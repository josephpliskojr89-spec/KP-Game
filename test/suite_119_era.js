/* Suite 119 — the era, closed (v0.11.9, §100; §96 recommendation 3).
   Owner: "Approved to tackle as much of the remaining queue as you see
   fit." The queue's third entry: "The era, closed (every comeback's
   second half)" — a ceremony the week promotion ends (the last stage,
   the tally in words, the room's state, the window if the drawer is
   stocked), the reissue as a scene with its MV tier and rounds shown
   instead of inherited, the landing reading the first act against the
   second, and the pressing's pre-order week as a read.

   Pinned here:
   · the close ARRIVES the week after the last promotion week, once,
     as one high letter in four voices (crowned, warm, quiet, cold)
   · it CLAIMS something: the room's morale moves on a crowned or a
     cold close, and the reissue door opens when the drawer is stocked
   · it LEAVES a mark: `rel.closed` on the record, the discography line
   · the reissue is a scene: the chair's pick is the bot's default, the
     fans' pick warms the fandom, resting gives the room its weeks back,
     silence lapses, a new lock supersedes; the desk's own sheet picks
     the video and the rounds, and one bill is quoted everywhere
   · the pre-order week reads the settle's own sum against the run
   · the second wind belongs to its promotion (the stamp never cleared
     since v0.10.38: one extension shut the door for a career)
   · the closed broadcast door is told by the lock that happens, not
     eaten by a lock the till refused
   · one era, two acts: the reissue carries its own bill, so its net
     joins the first act's on the red ledger and the era is counted once
   · the timeline hears it: the close and the reissue's announcement
     echo through the feed registry, picked by hash, with no draw
   · an old file keeps its past: the ledger arrives stamped with the
     week it learned to keep an era's record, an era it joined
     mid-promotion is never closed from half a record, and a reissue
     the old build locked lands on the terms it was signed on
   Two laws from §99 hold throughout: the week's wire is read before
   the trim, and a fixture forces every gate and relies on no roll. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const KP = loadEngine();
const t = makeT('suite_119_era');

const E = KP.C.ERA, RP = KP.C.REPACKAGE, P = KP.C.PRODUCT, MV = KP.C.MV;
const PLAN = [['popWave', 'challenge'], ['countdown', 'variety'], ['primeStage', 'fanSign'], ['livestream']];
const ALLOC = { vocals: 25, dance: 25, rap: 25, media: 25 };
const noisy = x => /undefined|NaN|\{she\}|\{her\}|\{pos\}|\[object/.test(x);
const VERDICTS = ['crowned', 'warm', 'quiet', 'cold'];

// every open door answered with the bot's default (options[0]), except
// the one a test wants left on the desk
function answerAll(eng, s, skip) {
  (s.scenes || []).slice().forEach(sc => {
    if (skip && sc.kind === skip) return;
    const def = eng.sceneDef(sc.kind);
    if (def) eng.resolveScene(s, sc.id, def.options(s, sc)[0].id);
  });
}
// one week, and the week's wire as the rails wrote it (pre-trim)
function tick(eng, s) {
  eng.advanceWeek(s);
  return (eng.lastTickNotes || []).slice();
}
// a five-member group with its demos in, the till full and a record
// PLANNED six weeks out: nothing is locked yet. The engine is a
// parameter: the DOM stub loads its own, and a state belongs to the
// engine that built it.
function draftedRecord(eng, seed, opts) {
  opts = opts || {};
  const s = eng.newGame(seed, null, { legacy: false, door: opts.door || 'current' });
  s.budget = 900;
  const ids = s.roster.slice(0, 5);
  eng.proposeGroup(s, 'ERALINE', ids, eng.roleHints(s, ids.map(i => s.people[i])));
  const g = s.groups[0];
  g.demos = eng.generateDemos(s, eng.rngFor(s), g);
  const proto = JSON.stringify(g.demos[1]);
  const plan = { groupId: g.id, songId: g.demos[0].id, conceptId: g.demos[0].conceptId, promo: 'modest',
    format: opts.format || 'mini', week: s.week + 6, alloc: Object.assign({}, ALLOC), rollout: PLAN.map(w => w.slice()) };
  return { s, g, proto, plan };
}
// ...and the same record, locked
function lockedRecord(eng, seed, opts) {
  const { s, g, proto, plan } = draftedRecord(eng, seed, opts);
  const r = eng.planDebut(s, plan);
  if (!r.ok) throw new Error('fixture: the lock refused: ' + r.reason);
  return { s, g, proto };
}
// the drawer, built by hand: the chair's pick has the hook, the fans'
// pick has the stage (or, with `sound`, the era's own sound and a weak
// stage) — no roll decides which demo is which
function stockDrawer(g, proto, rel, opts) {
  const other = rel.conceptId === 'dark' ? 'bright' : 'dark';
  const mk = (id, title, hook, choreo, conceptId) =>
    Object.assign(JSON.parse(proto), { id, title, hook, choreoPotential: choreo, conceptId, price: 0 });
  g.eraLeftovers = [
    mk('eraChair', 'Chair Song', 90, 10, other),
    mk('eraStage', 'Stage Song', 10, 90, other),
    mk('eraSound', 'Sound Song', 30, 30, opts && opts.sound ? rel.conceptId : other),
  ];
}
// the record lands, promotes, and stands in its LAST promotion week with
// the hand-built drawer; `pre` is every pre-order note on the way and
// `early` counts closes that fired while promotion was still running
function lastWeek(eng, seed, opts) {
  const { s, g, proto } = lockedRecord(eng, seed, opts);
  const pre = [];
  let early = 0, guard = 0, preWeek = null, preCount = null, preRun = null;
  while (g.prep && guard++ < 14) {
    // the read is taken at order 591, before the week's follower growth
    // lands: the count on the letter is the read going INTO the week
    const goingIn = eng.preorderCount(s, g);
    const wire = tick(eng, s);
    wire.filter(n => n.ind === 'preorderWeek').forEach(n => {
      pre.push(n); preWeek = s.week;
      preCount = goingIn; preRun = g.prep.pressing.run;
    });
    early += wire.filter(n => n.ind === 'eraClosed').length;
    answerAll(eng, s);
  }
  const rel = g.releases[g.releases.length - 1];
  const landed = s.week;
  while (s.week < g.promoUntil) {
    early += tick(eng, s).filter(n => n.ind === 'eraClosed').length;
    answerAll(eng, s);
  }
  stockDrawer(g, proto, rel, opts);
  return { s, g, rel, proto, pre, early, landed, preWeek, preCount, preRun };
}

const base = lastWeek(KP, 'era-119');
// a fresh copy of the last promotion week for each scenario
function fork(src) {
  const s = KP.deserialize(KP.serialize((src || base).s));
  const g = s.groups[0];
  return { s, g, rel: g.releases[g.releases.length - 1] };
}
const members = (s, g) => g.members.map(id => s.people[id]);
const closeOf = wire => wire.filter(n => n.ind === 'eraClosed');

// ---- the fixture is what the tests think it is ----
{
  const { s, g, rel } = base;
  t.eq(s.week, g.promoUntil, 'the fixture stands in the last promotion week');
  t.eq(g.releases.length, 1, 'one record has landed');
  t.eq(rel.format, 'mini', 'the record is a mini (an era with an album under it)');
  t.ok(!rel.closed, 'a record still promoting is not closed');
  t.eq(base.early, 0, 'no close fires while promotion is running');
  t.eq(g.eraLeftovers.length, 3, 'the drawer holds the three hand-built demos');
  t.ok(!g.prep && !g.tour && !g.jpAway, 'nothing else has the calendar');
}

// ---- the close arrives the week promotion ends, once ----
{
  const { s, g, rel } = fork();
  const wire = tick(KP, s);
  const closes = closeOf(wire);
  t.eq(s.week, g.promoUntil + 1, 'the tick is the first week past promotion');
  t.eq(closes.length, 1, 'the week after the last promotion week the era closes: one letter');
  const n = closes[0];
  t.eq(n.priority, 'high', 'the close is a high letter (it rides the inbox law, not past it)');
  t.eq(n.kind, 'company', 'the close is the company’s own letter');
  t.eq(n.groupId, g.id, 'the close names its group');
  t.ok(VERDICTS.includes(n.verdict), 'the close carries its verdict for the echo (got ' + n.verdict + ')');
  t.ok(n.text.includes('“' + rel.songTitle + '”'), 'the close names the record');
  t.ok(n.text.includes('The tally: '), 'the close carries the tally');
  t.ok(!noisy(n.text), 'the close has no unfilled token');
  t.ok(rel.closed && rel.closed.week === s.week && rel.closed.verdict === n.verdict &&
    typeof rel.closed.trophies === 'number' && typeof rel.closed.room === 'string' && 'lastStage' in rel.closed,
    'the record keeps the close: week, trophies, last stage, verdict, room');
  t.eq(s.eraLedger.closed, 1, 'the ledger counts the close');
  answerAll(KP, s, 'theReissue');
  const again = closeOf(tick(KP, s));
  t.eq(again.length, 0, 'an era closes once');
  t.eq(s.eraLedger.closed, 1, 'and is counted once');
}

// ---- four verdicts, and what each one costs or pays the room ----
{
  const cases = [
    { want: 'crowned', trophies: 2, band: 'miss', d: E.closeMoraleUp },
    { want: 'crowned', trophies: 1, band: 'solid', d: E.closeMoraleUp },
    { want: 'warm', trophies: 0, band: 'sensation', d: 0 },
    { want: 'warm', trophies: 0, band: 'strong', d: 0 },
    { want: 'quiet', trophies: 0, band: 'solid', d: 0 },
    { want: 'quiet', trophies: 0, band: 'quiet', d: 0 },
    { want: 'cold', trophies: 0, band: 'miss', d: -E.closeMoraleDown },
  ];
  cases.forEach(c => {
    const { s, g, rel } = fork();
    g.eraLeftovers = [];
    rel.trophies = c.trophies; rel.receptionBand = c.band;
    const ms = members(s, g);
    ms.forEach(m => { m.morale = 50; });
    ms[4].flags = ms[4].flags || {};
    ms[4].flags.personalHiatus = true;            // away: the close is not hers
    const n = KP.closeEra(s, g, rel);
    const tag = c.trophies + ' trophies, landed ' + c.band;
    t.eq(n.verdict, c.want, tag + ' closes ' + c.want);
    t.eq(KP.eraVerdict(rel), c.want, tag + ': the verdict is one function');
    t.eq(rel.closed.verdict, c.want, tag + ': the record keeps the verdict');
    t.eq(rel.closed.trophies, c.trophies, tag + ': the record keeps the trophies');
    t.ok(ms.slice(0, 4).every(m => m.morale === 50 + c.d), tag + ': the room’s morale moves by ' + c.d);
    t.eq(ms[4].morale, 50, tag + ': a member on a break is not in the room');
  });
  t.ok(E.closeMoraleUp > 0 && E.closeMoraleDown > 0, 'a crowned close lifts the room and a cold one costs it');
  // the clamp: a room at the ceiling stays at the ceiling
  const { s, g, rel } = fork();
  g.eraLeftovers = [];
  rel.trophies = 3;
  members(s, g).forEach(m => { m.morale = 99; });
  KP.closeEra(s, g, rel);
  t.ok(members(s, g).every(m => m.morale === 100), 'morale clamps at the ceiling');
}

// ---- each verdict is a family of three, and never the same line twice running ----
{
  const openOf = n => n.text.split(' The last stage, on ')[0];
  const force = { crowned: [1, 'solid'], warm: [0, 'strong'], quiet: [0, 'solid'], cold: [0, 'miss'] };
  VERDICTS.forEach(v => {
    const { s, g, rel } = fork();
    g.eraLeftovers = [];
    rel.trophies = force[v][0]; rel.receptionBand = force[v][1];
    rel.lastStage = { week: s.week, showId: 'primeStage', band: 'clean', carried: null };
    const seen = {};
    let repeats = 0, prev = null;
    for (let w = 0; w < 60; w++) {
      s.week = 200 + w;
      const o = openOf(KP.closeEra(s, g, rel));
      seen[o] = true;
      if (o === prev) repeats++;
      prev = o;
      t.ok(o.includes(rel.songTitle), v + ': every opening names the record') ;
      if (!o.includes(rel.songTitle)) break;
    }
    t.eq(Object.keys(seen).length, 3, v + ': the opening is a family of three');
    t.eq(repeats, 0, v + ': the same opening never runs twice in a row');
  });
}

// ---- the last stage, in words ----
{
  const mk = () => { const f = fork(); f.g.eraLeftovers = []; return f; };
  {
    const { s, g, rel } = mk();
    delete rel.lastStage;
    const n = KP.closeEra(s, g, rel);
    t.ok(n.text.includes('No broadcaster had the group in its last week: the era ended off the schedule.'),
      'no stage in the last week is said, not skipped');
    t.eq(rel.closed.lastStage, null, 'and the record keeps a null stage');
  }
  const carrier = base.s.people[base.g.members[0]];
  const cases = [
    [{ band: 'carried', showId: 'primeStage', carried: carrier.id },
      'The last stage, on ' + KP.showLabel('primeStage') + ', was carried: ' + KP.displayName(carrier) + ' took it and did not hand it back.'],
    [{ band: 'carried', showId: 'primeStage', carried: null }, 'The last stage, on ' + KP.showLabel('primeStage') + ', was carried.'],
    [{ band: 'clean', showId: 'countdown', carried: null }, 'The last stage, on ' + KP.showLabel('countdown') + ', was clean.'],
    [{ band: 'shaky', showId: 'popWave', carried: null },
      'The last stage, on ' + KP.showLabel('popWave') + ', wobbled, the way last stages do when the month catches up with the room.'],
    [{ band: 'fumbled', showId: 'popWave', carried: null },
      'The last stage, on ' + KP.showLabel('popWave') + ', was fumbled, and that is the clip the era ends on.'],
    [{ band: 'empty', showId: 'popWave', carried: null }, 'The last slot, on ' + KP.showLabel('popWave') + ', went unfilled.'],
  ];
  cases.forEach(c => {
    const { s, g, rel } = mk();
    rel.lastStage = Object.assign({ week: s.week }, c[0]);
    const n = KP.closeEra(s, g, rel);
    t.ok(n.text.includes(c[1]), 'a ' + c[0].band + ' last stage reads: ' + c[1].slice(0, 60));
    t.eq(rel.closed.lastStage, c[0].band, 'the record keeps the ' + c[0].band + ' stage');
    t.ok(!noisy(n.text), 'the ' + c[0].band + ' close has no unfilled token');
  });
  t.ok(KP.showLabel('primeStage') && KP.showLabel('primeStage') !== 'primeStage', 'the show is named, not keyed');
}

// ---- the tally, in words ----
{
  const mk = () => { const f = fork(); f.g.eraLeftovers = []; return f; };
  const tally = n => 'The tally: ' + n.text.split('The tally: ')[1].split('.')[0] + '.';
  {
    const { s, g, rel } = mk();
    rel.trophies = 0; rel.chartPeak = null; rel.nationalPeak = null; rel.chodong = 0; rel.critics = null;
    t.eq(tally(KP.closeEra(s, g, rel)), 'The tally: no trophy; no week on the chart.', 'a record with nothing to count says so');
  }
  {
    const { s, g, rel } = mk();
    rel.trophies = 1; rel.chartPeak = 3; rel.nationalPeak = 41; rel.chodong = 12345; rel.reception = 97;
    rel.pressing = { soldOut: true, overpress: false, preorder: { word: 'ahead' } };
    rel.critics = { consensus: 'acclaimed' };
    const n = KP.closeEra(s, g, rel);
    t.eq(tally(n), 'The tally: one trophy; a best chart week at #3 (#41 on the national board); a first week of ' +
      KP.fmtCount(12345) + ' copies, the pressing sold through (the pre-order week called it); critics who settled on “' +
      KP.verdictWord('acclaimed') + '”.', 'the full tally reads in one sentence');
    t.ok(!n.text.includes('97'), 'the reception is a hidden read: it is never printed as a digit');
  }
  // a split verdict was promised arguments that outlast the promotion: the close keeps the promise
  {
    const { s, g, rel } = mk();
    rel.trophies = 0; rel.chartPeak = 2; rel.nationalPeak = null; rel.chodong = 0;
    rel.critics = { consensus: 'mixed', split: true };
    t.eq(tally(KP.closeEra(s, g, rel)), 'The tally: no trophy; a best chart week at #2; critics still arguing, the middle voice at “' +
      KP.verdictWord('mixed') + '”.', 'critics who split are not said to have settled');
    rel.critics = { consensus: 'mixed', split: false };
    t.eq(tally(KP.closeEra(s, g, rel)), 'The tally: no trophy; a best chart week at #2; critics who settled on “' +
      KP.verdictWord('mixed') + '”.', 'and critics who agreed are');
    t.ok(/A split verdict; the arguments will outlast the promotion\./.test(KP.criticsLine(s,
      { consensus: 'mixed', split: true, verdicts: KP.criticsVerdict(s, 'k', 50, null).verdicts }, 'A Title')),
      'the promise is the review’s own line: the two letters agree');
  }
  {
    const { s, g, rel } = mk();
    rel.trophies = 4; rel.chartPeak = 7; rel.nationalPeak = null; rel.chodong = 0; rel.critics = null;
    t.eq(tally(KP.closeEra(s, g, rel)), 'The tally: 4 trophies; a best chart week at #7.', 'several trophies count, and no national week is not invented');
  }
  // a career best needs a career to be the best of
  {
    const { s, g, rel } = mk();
    rel.chodong = 5000; rel.pressing = { soldOut: false, overpress: false, preorder: null };
    t.ok(!KP.closeEra(s, g, rel).text.includes('a career best'), 'a first record is not a career best');
    g.releases.unshift({ songTitle: 'An Older One', week: 1, chodong: 4999 });
    t.ok(KP.closeEra(s, g, rel).text.includes('copies, a career best'), 'a first week above every earlier one is a career best');
    g.releases[0].chodong = 5000;
    t.ok(!KP.closeEra(s, g, rel).text.includes('a career best'), 'a tie is not a best');
  }
  // the pre-order week, answered: every word against every outcome
  const CALLED = '(the pre-order week called it)', WRONG = '(the pre-order week read it wrong)',
    OUTRAN = '(the record outran its pre-orders)', SHORT = '(the record fell short of its pre-orders)';
  const grid = [
    ['ahead', 'soldOut', CALLED], ['ahead', 'even', SHORT], ['ahead', 'overpress', WRONG],
    ['tracking', 'soldOut', OUTRAN], ['tracking', 'even', CALLED], ['tracking', 'overpress', SHORT],
    ['soft', 'soldOut', WRONG], ['soft', 'even', OUTRAN], ['soft', 'overpress', CALLED],
  ];
  grid.forEach(c => {
    const { s, g, rel } = mk();
    rel.chodong = 800;
    rel.pressing = { soldOut: c[1] === 'soldOut', overpress: c[1] === 'overpress', preorder: { word: c[0] } };
    const text = KP.closeEra(s, g, rel).text;
    t.ok(text.includes(c[2]), 'pre-orders read ' + c[0] + ', the pressing came out ' + c[1] + ': ' + c[2]);
    t.eq([CALLED, WRONG, OUTRAN, SHORT].filter(x => text.includes(x)).length, 1, c[0] + '/' + c[1] + ': exactly one answer');
    t.ok(text.includes(c[1] === 'soldOut' ? 'the pressing sold through' : c[1] === 'overpress' ? 'boxes left in the warehouse' : ' copies'),
      c[0] + '/' + c[1] + ': the pressing’s outcome is in the tally');
  });
  {
    const { s, g, rel } = mk();
    rel.chodong = 800; rel.pressing = { soldOut: true, overpress: false, preorder: null };
    const text = KP.closeEra(s, g, rel).text;
    t.ok(![CALLED, WRONG, OUTRAN, SHORT].some(x => text.includes(x)), 'a record with no pre-order read (an old save) answers nothing');
    rel.pressing = undefined;
    t.ok(KP.closeEra(s, g, rel).text.includes('a first week of ' + KP.fmtCount(800) + ' copies'), 'a record with no pressing sheet still closes');
  }
}

// ---- the room, in a word ----
{
  const mk = () => { const f = fork(); f.g.eraLeftovers = []; return f; };
  const SENT = { fresh: 'The room comes out of it fresh.', tired: 'The room comes out of it tired, in the ordinary way.',
    spent: 'The room comes out of it spent, and the calendar should know that.' };
  [[E.roomSpentAt, 'spent'], [E.roomSpentAt - 1, 'tired'], [E.roomTiredAt, 'tired'], [E.roomTiredAt - 1, 'fresh'], [0, 'fresh'], [100, 'spent']].forEach(c => {
    const { s, g, rel } = mk();
    members(s, g).forEach(m => { m.fatigue = c[0]; });
    t.eq(KP.eraRoomWord(s, g), c[1], 'a room at fatigue ' + c[0] + ' is ' + c[1]);
    const n = KP.closeEra(s, g, rel);
    t.ok(n.text.includes(SENT[c[1]]), 'the close says the room is ' + c[1]);
    t.eq(Object.keys(SENT).filter(k => n.text.includes(SENT[k])).length, 1, 'fatigue ' + c[0] + ': one room sentence');
    t.eq(rel.closed.room, c[1], 'the record keeps the room: ' + c[1]);
  });
  {
    const { s, g, rel } = mk();
    const ms = members(s, g);
    ms.forEach(m => { m.fatigue = 10; });
    ms[0].fatigue = 100; ms[0].flags = ms[0].flags || {}; ms[0].flags.personalHiatus = true;
    t.eq(KP.eraRoomWord(s, g), 'fresh', 'the room is the members in it: a member away does not tire it');
    ms.forEach(m => { m.flags = m.flags || {}; m.flags.personalHiatus = true; });
    t.eq(KP.eraRoomWord(s, g), 'empty', 'a room with everyone away is empty');
    const n = KP.closeEra(s, g, rel);
    t.ok(!n.text.includes('The room comes out of it'), 'an empty room gets no sentence');
    t.eq(rel.closed.room, 'empty', 'and the record says empty');
  }
}

// ---- the second wind belongs to its promotion ----
{
  // the extension moves the close, and the close says so
  const { s, g, rel } = fork();
  const until = g.promoUntil;
  rel.sleeperTitle = rel.sleeperTitle || 'The Quiet One';     // the record is climbing: forced, not rolled
  members(s, g).forEach(m => { m.fatigue = 20; });
  s.budget = 900;
  const r = KP.extendEra(s, g.id);
  t.ok(r.ok, 'the last promotion week takes the extension (' + (r.reason || 'ok') + ')');
  t.eq(g.promoUntil, until + KP.C.PROMO.EXT.weeks, 'the extension adds its weeks');
  t.ok(KP.eraExtended(g), 'the era reads as extended');
  t.eq(KP.extensionRead(s, g).reason, 'The era already took its second wind.', 'one second wind per promotion');
  let closes = [], guard = 0;
  while (s.week <= until + 1 && guard++ < 6) { closes = closes.concat(closeOf(tick(KP, s))); answerAll(KP, s, 'theReissue'); }
  t.eq(closes.length, 0, 'the old close week passes: the era is still promoting');
  while (s.week <= g.promoUntil && guard++ < 12) { closes = closes.concat(closeOf(tick(KP, s))); answerAll(KP, s, 'theReissue'); }
  t.eq(closes.length, 1, 'the close fires the week after the EXTENDED promotion ends');
  t.eq(s.week, g.promoUntil + 1, 'which is the first week past the new end');
  t.ok(closes[0] && closes[0].text.includes('It ran past its plan on a second wind: the record was still climbing when the last week came.'),
    'the close says the era ran past its plan');
  t.eq(rel.closed.extended, true, 'and the record keeps that');
}
{
  // a stamp from an EARLIER era is not this era's (the bug since v0.10.38:
  // the stamp was never cleared, so one extension shut the door for good)
  const { s, g, rel } = fork();
  g.eraExtendedWeek = g.lastReleaseWeek - 3;
  rel.sleeperTitle = rel.sleeperTitle || 'The Quiet One';
  members(s, g).forEach(m => { m.fatigue = 20; });
  s.budget = 900;
  t.ok(!KP.eraExtended(g), 'a stamp older than the last landing is another era’s');
  const read = KP.extensionRead(s, g);
  t.ok(read.ok, 'so the door is open again for this promotion (' + (read.reason || 'ok') + ')');
  g.eraLeftovers = [];
  const n = KP.closeEra(s, g, rel);
  t.ok(!n.text.includes('second wind'), 'and the close does not claim a second wind this era never took');
  t.ok(!('extended' in rel.closed), 'nor does the record');
  g.eraExtendedWeek = g.lastReleaseWeek;
  t.ok(!KP.eraExtended(g), 'a stamp from the landing week itself is not an extension (promotion had not begun)');
  g.eraExtendedWeek = g.lastReleaseWeek + 1;
  t.ok(KP.eraExtended(g), 'a stamp after the landing is this era’s');
  t.ok(!KP.eraExtended(null) && !KP.eraExtended({}), 'a missing group or stamp reads false, not a throw');
}

// ---- the reissue is a door ----
// one more week, the door left on the desk: the state every door test forks
const closedState = (() => {
  const f = fork();
  const wire = tick(KP, f.s);
  answerAll(KP, f.s, 'theReissue');
  return { s: f.s, wire };
})();
const doorOf = s => (s.scenes || []).find(sc => sc.kind === 'theReissue') || null;
const atDoor = () => { const f = fork(closedState); return Object.assign(f, { sc: doorOf(f.s), def: KP.sceneDef('theReissue'), L: KP.eraLedger(f.s) }); };
{
  const { s, g, rel, sc, def, L } = atDoor();
  const note = closeOf(closedState.wire)[0];
  t.ok(!!sc, 'a stocked drawer opens the reissue door at the close');
  t.eq((s.scenes || []).filter(x => x.kind === 'theReissue').length, 1, 'one door, not one per demo');
  t.eq(sc.groupId, g.id, 'the door is the group’s');
  t.eq(sc.anrId, 'eraChair', 'the chair wants the strongest hook left in the drawer');
  t.eq(sc.fansId, 'eraStage', 'the fans want the one that will look best on a stage');
  t.eq(sc.fansWhy, 'stage', 'and the scene knows why (no demo left in this era’s sound)');
  t.eq(sc.expiresWeek, g.promoUntil + RP.windowWeeks, 'the door stays open for the reissue window');
  t.eq(L.reissueOffered, 1, 'the ledger counts the door');
  t.ok(note.text.includes('The drawer still holds 3 demos the meeting passed on, and the era is warm enough to reissue until ' +
    KP.weekLabel(g.promoUntil + RP.windowWeeks).text + ': the call is on the desk.'), 'the close names the drawer, the deadline and the desk');
  t.eq(def.title(s, sc), 'ERALINE · the reissue', 'the door is titled by the group');
  const body = def.body(s, sc);
  t.ok(body.startsWith('The “' + rel.songTitle + '” era is closed and still warm.'), 'the body opens on the era');
  t.ok(body.includes(' wants “Chair Song”: the strongest hook left in the drawer.'), 'the chair’s pick is named with its reason');
  t.ok(body.includes('The fan desk reads the cafés differently: they want the one that will look best on a stage, and that is “Stage Song”.'),
    'the fans’ pick is named with its reason');
  const build = KP.reissueBuild(s, g);
  t.eq(JSON.stringify(build), JSON.stringify({ mv: 'standard', signRounds: KP.suggestPressing(s, g).signRounds }),
    'the desk’s build is a standard video and the pressing desk’s rounds');
  t.ok(body.includes('The desk would shoot a ' + MV.TIERS[build.mv].label + ' and hold ' + KP.roundsWord(build.signRounds) + '.'),
    'the body shows the video and the rounds instead of inheriting them');
  t.ok(body.endsWith('Or let the era rest: the room gets its weeks back, and the drawer closes for good.'), 'and the third way is on the page');
  t.ok(!noisy(body) && !noisy(def.title(s, sc)), 'the scene reads clean');
  const opts = def.options(s, sc);
  const bill = KP.reissueBill(s, g, build);
  const tail = ' · ' + MV.TIERS[build.mv].label + ' · ' + KP.roundsWord(build.signRounds) + ' · ' + bill;
  t.eq(opts.map(o => o.id).join(','), 'anr,fans,rest', 'three doors: the chair’s pick, the fans’ pick, rest');
  t.eq(opts[0].id, 'anr', 'the chair’s pick is the bot’s default');
  t.eq(opts[0].label, 'Reissue with the chair’s pick, “Chair Song”' + tail, 'the chair’s door quotes the video, the rounds and the bill');
  t.eq(opts[1].label, 'Reissue with the fans’ pick, “Stage Song”' + tail, 'the fans’ door quotes the same build and the same bill');
  t.eq(opts[2].label, 'Let the era rest', 'resting costs nothing and says so by saying nothing');
  t.ok(bill > 0 && Number.isInteger(bill), 'the bill is a whole number of money (' + bill + ')');
  t.ok(KP.reissueOpenFor(s, g, rel), 'the door reads open on the state it opened in');
}
{
  // the fans' reason: more of this era's sound, when the drawer has it
  const f = fork();
  f.g.eraLeftovers.find(d => d.id === 'eraSound').conceptId = f.rel.conceptId;
  tick(KP, f.s);
  const sc = doorOf(f.s), def = KP.sceneDef('theReissue');
  t.eq(sc.fansId, 'eraSound', 'a demo in this era’s sound is the fans’ pick over a better stage');
  t.eq(sc.fansWhy, 'sound', 'and the scene knows why');
  t.ok(def.body(f.s, sc).includes('The fan desk reads the cafés differently: they want more of this era’s sound, and that is “Sound Song”.'),
    'the body gives the fans’ reason in words');
}
{
  // the chair and the fans agree: one door, not two that do the same thing
  const f = fork();
  f.g.eraLeftovers.find(d => d.id === 'eraChair').choreoPotential = 99;
  tick(KP, f.s);
  const sc = doorOf(f.s), def = KP.sceneDef('theReissue');
  t.eq(sc.anrId + '|' + sc.fansId, 'eraChair|eraChair', 'one demo can be both picks');
  t.ok(def.body(f.s, sc).includes('The fan desk reads the cafés the same way, for once.'), 'the body says they agree');
  const opts = def.options(f.s, sc);
  t.eq(opts.map(o => o.id).join(','), 'anr,rest', 'agreement is one door and the rest');
  t.ok(opts[0].label.startsWith('Reissue with “Chair Song” (the chair and the fans agree) · '), 'and the door says so');
  const r = KP.resolveScene(f.s, sc.id, 'fans');
  t.eq(r.ok, false, 'the fans’ door is not on the table when it is the chair’s door');
  t.eq(r.reason, 'That is not one of the options on the table.', 'and the desk says so');
  t.ok(!!doorOf(f.s), 'the refused answer leaves the door open');
}
{
  // ties break by id, so the same drawer always opens the same door
  const f = fork();
  f.g.eraLeftovers.forEach(d => { d.hook = 50; d.choreoPotential = 50; });
  tick(KP, f.s);
  const sc = doorOf(f.s);
  t.eq(sc.anrId + '|' + sc.fansId, 'eraChair|eraChair', 'equal demos resolve to the lowest id, not to the drawer’s order');
}
{
  // a drawer of one
  const f = fork();
  f.g.eraLeftovers = f.g.eraLeftovers.slice(0, 1);
  const wire = tick(KP, f.s);
  t.ok(closeOf(wire)[0].text.includes('The drawer still holds a demo the meeting passed on'), 'one demo is “a demo”, not “1 demos”');
  t.eq(KP.sceneDef('theReissue').options(f.s, doorOf(f.s)).length, 2, 'and one demo is one door and the rest');
}

// ---- the chair's pick: the bot's default locks the reissue as quoted ----
{
  const { s, g, rel, sc, def, L } = atDoor();
  const build = KP.reissueBuild(s, g);
  const bill = KP.reissueBill(s, g, build);
  const sheet = KP.reissuePressing(s, g, build.signRounds);
  const label = def.options(s, sc)[0].label;
  const budget = s.budget, debt = g.recoup.debt, spend = g.eraSpend || 0, inbox = s.inbox.length;
  const r = KP.resolveScene(s, sc.id, def.options(s, sc)[0].id);
  t.ok(r.ok, 'the default answer resolves');
  t.eq(r.toast, 'ERALINE’s era extends: “' + rel.songTitle + '” repackages with “Chair Song” as the new title track.',
    'the toast is the letter’s first clause');
  t.eq(s.budget, budget - bill, 'the till pays exactly the bill the door quoted');
  t.eq(g.recoup.debt, debt + bill, 'the bill accrues to the group’s ledger');
  t.eq(g.eraSpend, spend + bill, 'and to the era’s spend');
  t.eq(L.anr, 1, 'the ledger counts the chair’s pick');
  t.eq(L.fans + L.desk + L.rested + L.lapsed + L.superseded, 0, 'and nothing else');
  t.ok(!doorOf(s), 'the door closes behind the answer');
  t.eq(g.prep.songId, 'eraChair', 'the chair’s demo is the new title track');
  t.eq(g.prep.scheduledWeek, s.week + RP.minPrep, 'on the short cycle');
  t.eq(g.prep.mv, build.mv, 'with the video the door showed');
  t.eq(JSON.stringify(g.prep.pressing), JSON.stringify(sheet), 'and the pressing the bill was priced on');
  t.eq(g.prep.pressing.signRounds, build.signRounds, 'the rounds on the sheet are the rounds on the door');
  t.eq(JSON.stringify(g.prep.repackage), JSON.stringify({ of: rel.songTitle, reception: rel.reception, band: rel.receptionBand, chartPeak: rel.chartPeak }),
    'the lock carries the first act: its title, reception, band and peak');
  t.eq(g.demos.length, 1, 'the meeting table holds the one demo');
  t.eq(g.eraLeftovers, null, 'and the drawer is spent');
  t.eq(s.inbox.length, inbox + 1, 'one letter');
  const ann = s.inbox.find(n => n.ind === 'eraAnnounced' && n.reissue);
  t.ok(!!ann && ann.priority === 'high' && ann.groupId === g.id, 'the reissue is announced through the era’s own family, high');
  t.ok(ann.text.includes('“' + rel.songTitle + '” repackages with “Chair Song” as the new title track'), 'naming both titles');
  t.ok(ann.text.includes('with a ' + MV.TIERS[build.mv].label + ' and ' + KP.roundsWord(build.signRounds) + ' on the sheet'), 'the video and the rounds');
  t.ok(ann.text.includes('It lands ' + KP.weekLabel(g.prep.scheduledWeek).text + '.'), 'and the date');
  t.ok(!noisy(ann.text), 'the announcement reads clean');
  const log = s.convoLog[0];
  t.eq(log.kind + '|' + log.answer + '|' + log.reply, 'theReissue|' + label + '|' + r.toast, 'the conversation file keeps the door, the answer and the reply');
  t.eq(KP.fandomIntensity(g), 0, 'a group with no fandom gains none, and nothing throws');
  t.eq(KP.validateState(s).length, 0, 'the validator is clean after the lock');
  const again = KP.planRepackage(s, { groupId: g.id, songId: 'eraStage' });
  t.eq(again.reason, 'A release is already locked.', 'the era extends once at a time');
}

// ---- the fans' pick warms the fandom; the chair's alone does not ----
const withFandom = pick => {
  const f = fork();
  f.g.fandom = { name: 'Lines', color: 'slate blue', since: f.s.week, intensity: 40 };
  tick(KP, f.s);
  answerAll(KP, f.s, 'theReissue');
  const sc = doorOf(f.s), def = KP.sceneDef('theReissue'), L = KP.eraLedger(f.s);
  const build = KP.reissueBuild(f.s, f.g);
  const bill = KP.reissueBill(f.s, f.g, build);
  const opts = def.options(f.s, sc);
  const before = { fandom: KP.fandomIntensity(f.g), budget: f.s.budget };
  const r = KP.resolveScene(f.s, sc.id, pick);
  return Object.assign(f, { sc, L, build, bill, opts, before, r });
};
{
  const x = withFandom('fans');
  t.eq(x.build.signRounds, 1, 'a named fandom with some heat puts one fan-sign round on the desk’s build');
  t.ok(x.opts[1].label.endsWith(' · standard MV · one fan-sign round · ' + x.bill), 'and the door quotes it');
  t.ok(x.r.ok, 'the fans’ pick resolves');
  t.eq(x.g.prep.songId, 'eraStage', 'the fans’ demo is the new title track');
  t.eq(x.g.prep.pressing.signRounds, 1, 'with the round the door promised');
  t.eq(x.s.budget, x.before.budget - x.bill, 'for the bill the door quoted');
  t.eq(KP.fandomIntensity(x.g), x.before.fandom + E.fansPickFandom, 'being asked warms the fandom');
  t.eq(x.L.fans + '|' + x.L.anr, '1|0', 'the ledger counts the fans’ pick, not the chair’s');
  t.ok(x.r.toast.includes('“Stage Song”'), 'the toast names the fans’ title');
}
{
  const x = withFandom('anr');
  t.ok(x.r.ok, 'the chair’s pick resolves with a fandom in the room');
  t.eq(KP.fandomIntensity(x.g), x.before.fandom, 'the chair overruling the cafés warms nobody');
  t.eq(x.L.anr + '|' + x.L.fans, '1|0', 'and the ledger says whose pick it was');
}
{
  // agreement: the chair's door is also the fans', so it warms them
  const f = fork();
  f.g.fandom = { name: 'Lines', color: 'slate blue', since: f.s.week, intensity: 40 };
  f.g.eraLeftovers.find(d => d.id === 'eraChair').choreoPotential = 99;
  tick(KP, f.s);
  const sc = doorOf(f.s), before = KP.fandomIntensity(f.g);
  const r = KP.resolveScene(f.s, sc.id, 'anr');
  t.ok(r.ok, 'the agreed door resolves');
  t.eq(KP.fandomIntensity(f.g), before + E.fansPickFandom, 'when the chair picks what the fans wanted, the fans notice');
  t.eq(KP.eraLedger(f.s).anr, 1, 'and it is still the chair’s pick in the ledger');
}

// ---- the till can refuse, and a refused answer changes nothing ----
{
  const { s, g, sc, L } = atDoor();
  s.budget = 0;
  const debt = g.recoup.debt, inbox = s.inbox.length, log = s.convoLog.length;
  const r = KP.resolveScene(s, sc.id, 'anr');
  t.eq(r.ok, false, 'an empty till refuses the reissue');
  t.eq(r.reason, 'Even the cheaper reprint needs money we do not have.', 'in the till’s own words');
  t.ok(!!doorOf(s), 'the door stays open');
  t.eq(g.prep, null, 'nothing locked');
  t.eq(s.budget + '|' + g.recoup.debt, '0|' + debt, 'nothing billed');
  t.eq(L.anr + L.fans + L.desk, 0, 'nothing counted');
  t.eq(s.inbox.length + '|' + s.convoLog.length, inbox + '|' + log, 'nothing written');
  t.eq(g.eraLeftovers.length, 3, 'and the drawer is still stocked');
  const rest = KP.resolveScene(s, sc.id, 'rest');
  t.ok(rest.ok, 'resting is always affordable');
}

// ---- resting gives the room its weeks back and closes the drawer ----
{
  const { s, g, rel, sc, L } = atDoor();
  const ms = members(s, g);
  ms.forEach((m, i) => { m.fatigue = 50 + i; });
  ms[4].flags.personalHiatus = true;                    // away: the rest is the room's, not hers
  ms[3].fatigue = 3;                                    // the floor
  const budget = s.budget, inbox = s.inbox.length;
  const r = KP.resolveScene(s, sc.id, 'rest');
  t.ok(r.ok, 'the rest resolves');
  t.eq(r.toast, 'The era rests. The drawer closes.', 'in six words');
  t.eq(ms.slice(0, 3).map(m => m.fatigue).join(','), [50, 51, 52].map(x => x - E.restRelief).join(','), 'the room in the building gets the relief');
  t.eq(ms[3].fatigue, 0, 'relief clamps at rested');
  t.eq(ms[4].fatigue, 54, 'a member on a break is not in the room to rest');
  t.eq(rel.reissueRested, true, 'the record keeps the decision');
  t.eq(g.eraLeftovers, null, 'the drawer closes for good');
  t.eq(s.budget, budget, 'resting costs no money');
  t.eq(L.rested, 1, 'the ledger counts the rest');
  t.eq(L.anr + L.fans + L.desk + L.lapsed + L.superseded, 0, 'and nothing else');
  t.ok(!doorOf(s), 'the door closes');
  t.eq(s.inbox.length, inbox + 1, 'one letter');
  const note = s.inbox.find(n => n.ind === 'eraRested');
  t.ok(!!note && note.priority === 'normal' && note.groupId === g.id, 'the rest is a normal letter on the group');
  t.ok(note.text.startsWith('ERALINE’s “' + rel.songTitle + '” era rests where it closed: no reissue.'), 'naming the group and the era');
  t.ok(!noisy(note.text), 'and reading clean');
  t.eq(KP.reissueOpenFor(s, g, rel), false, 'the door reads shut');
  g.eraLeftovers = [{ id: 'late', title: 'Late Song', hook: 50, choreoPotential: 50, conceptId: 'dark' }];
  t.eq(KP.planRepackage(s, { groupId: g.id, songId: 'late' }).reason, 'The desk let this era rest. The drawer is closed.',
    'a restocked drawer does not reopen a rested era');
  t.eq(KP.reissueOpenFor(s, g, rel), false, 'nor does the door');
  t.eq(KP.validateState(s).length, 0, 'the validator is clean after the rest');
}

// ---- silence lapses ----
{
  const { s, g, sc, L } = atDoor();
  const last = g.promoUntil + RP.windowWeeks;
  t.eq(sc.expiresWeek, last, 'the door’s deadline is the window’s last week');
  let guard = 0;
  while (s.week < last && guard++ < 12) { tick(KP, s); answerAll(KP, s, 'theReissue'); }
  t.eq(s.week, last, 'the fixture walks to the last week of the window');
  t.ok(!!doorOf(s), 'the door is still open in the last week');
  t.eq(L.lapsed, 0, 'nothing has lapsed yet');
  {
    // the last week still takes the answer
    const late = KP.deserialize(KP.serialize(s));
    const r = KP.resolveScene(late, doorOf(late).id, 'anr');
    t.ok(r.ok, 'the last week of the window still reissues (' + (r.reason || 'ok') + ')');
    t.eq(KP.eraLedger(late).anr, 1, 'and it counts as the chair’s pick, not a lapse');
  }
  const log = s.convoLog.length;
  tick(KP, s);
  t.eq(s.week, last + 1, 'one week past the window');
  t.ok(!doorOf(s), 'the door is gone');
  t.eq(L.lapsed, 1, 'the ledger counts the lapse');
  t.eq(L.anr + L.fans + L.desk + L.rested + L.superseded, 0, 'and nothing else');
  const entry = s.convoLog.find(c => c.kind === 'theReissue');
  t.ok(s.convoLog.length > log && !!entry, 'the conversation file keeps the unanswered door');
  t.eq(entry.answer, '(went unanswered)', 'as unanswered');
  t.eq(KP.planRepackage(s, { groupId: g.id, songId: 'eraChair' }).reason,
    'The era has cooled. A repackage rides heat that is still there — this one is gone.', 'and the Studio’s verb agrees: the heat is gone');
  t.eq(g.prep, null, 'silence locks nothing');
  for (let i = 0; i < 3; i++) { tick(KP, s); answerAll(KP, s); }
  t.eq(L.lapsed, 1, 'a lapse is counted once');
  t.eq(L.closed, 1, 'and the era does not close a second time');
}

// ---- a new lock supersedes ----
{
  const { s, g, sc, L } = atDoor();
  const opens = g.promoUntil + KP.C.COMEBACK.restWeeks;
  let guard = 0;
  while (s.week <= opens && guard++ < 12) { tick(KP, s); answerAll(KP, s, 'theReissue'); }
  t.eq(s.week, opens + 1, 'the calendar reopens inside the reissue window');
  t.ok(s.week <= sc.expiresWeek && !!doorOf(s), 'with the door still on the desk');
  g.demos = KP.generateDemos(s, KP.rngFor(s), g);
  const plan = () => ({ groupId: g.id, songId: g.demos[0].id, conceptId: g.demos[0].conceptId, promo: 'modest', format: 'single',
    week: s.week + 6, alloc: Object.assign({}, ALLOC), rollout: PLAN.map(w => w.slice()) });
  const money = s.budget;
  s.budget = 0;
  const refused = KP.planDebut(s, plan());
  t.eq(refused.ok, false, 'a lock the till refuses');
  t.ok(!!doorOf(s) && L.superseded === 0 && g.eraLeftovers.length === 3, 'leaves the door, the count and the drawer alone');
  s.budget = money + 600;
  const r = KP.planDebut(s, plan());
  t.ok(r.ok, 'a comeback locks over the open door (' + (r.reason || 'ok') + ')');
  t.ok(!doorOf(s), 'the door closes unanswered');
  t.eq(L.superseded, 1, 'the ledger counts it as superseded');
  t.eq(L.lapsed + L.rested + L.anr + L.fans + L.desk, 0, 'not as a lapse, a rest or a pick');
  t.eq(g.eraLeftovers, null, 'a new era starts a new drawer');
  t.eq(s.convoLog.filter(c => c.kind === 'theReissue').length, 0, 'a superseded door was never a conversation');
  for (let i = 0; i < 4; i++) { tick(KP, s); answerAll(KP, s); }
  t.eq(L.lapsed, 0, 'and a door that is gone cannot lapse later');
  t.eq(KP.validateState(s).length, 0, 'the validator is clean after the supersession');
}

// ---- when the door stays shut ----
{
  const shut = (why, mut) => {
    const { s, g, rel } = fork();
    mut(s, g, rel);
    const L = KP.eraLedger(s);
    t.eq(KP.reissueOpenFor(s, g, rel), false, 'no door: ' + why);
    const n = KP.closeEra(s, g, rel);
    t.ok(!n.text.includes('The drawer still holds'), 'the close does not promise a door: ' + why);
    t.ok(!doorOf(s) && L.reissueOffered === 0, 'none opens, none is counted: ' + why);
    t.eq(L.closed, 1, 'the era still closes: ' + why);
    t.ok(!!rel.closed, 'and the record is still marked: ' + why);
  };
  shut('a single has no album under it', (s, g, rel) => { rel.format = 'single'; });
  shut('a record with no format reads as a single', (s, g, rel) => { delete rel.format; });
  shut('a reissue does not reissue', (s, g, rel) => { rel.repackageOf = 'An Earlier Record'; });
  shut('the era was already left to rest', (s, g, rel) => { rel.reissueRested = true; });
  shut('the drawer is empty', (s, g) => { g.eraLeftovers = []; });
  shut('the drawer is missing', (s, g) => { g.eraLeftovers = null; });
  shut('a release is already locked', (s, g) => { g.prep = { songId: 'x', scheduledWeek: s.week + 9 }; });
  shut('the group is in Japan', (s, g) => { g.jpAway = { until: s.week + 4 }; });
  shut('the group is on tour', (s, g) => { g.tour = { legs: [] }; });
  shut('a solo era has the studio', (s, g) => { s.people[g.members[0]].soloEra = { week: s.week }; });
  t.eq(KP.reissueOpenFor(base.s, base.g, null), false, 'no record, no door, no throw');
}
{
  // the Studio's verb keeps the same clock in its own words
  const early = fork();
  t.eq(KP.planRepackage(early.s, { groupId: early.g.id, songId: 'eraChair' }).reason,
    'They are mid-promotion. The repackage lands when the first wind is spent, not before.', 'the last promotion week is too early');
  const { s, g } = atDoor();
  t.eq(KP.planRepackage(s, { groupId: g.id, songId: 'nope' }).reason,
    'The repackage title comes from the era’s own drawer — the demos the meeting passed on.', 'a title from outside the drawer is refused');
  t.eq(KP.planRepackage(s, { groupId: g.id, songId: 'eraChair', mv: 'imax' }).reason,
    'The video comes in three budgets: plain, standard, or cinema.', 'a video tier nobody shoots is refused');
  t.ok(!!doorOf(s) && g.prep === null && KP.eraLedger(s).desk === 0, 'and a refused verb leaves the door and the ledger alone');
}

// ---- the desk's own sheet: the video and the rounds are picked, and one bill is quoted everywhere ----
{
  const D = dom.load();
  const K = D.KP, App = D.App, el = D.el;
  const made = lastWeek(K, 'era-119');
  const s = made.s, g = made.g, rel = made.rel;
  tick(K, s);
  answerAll(K, s, 'theReissue');
  const sc = (s.scenes || []).find(x => x.kind === 'theReissue');
  t.ok(!!sc, 'the stub’s own engine opens the same door');
  const guard = h => !/undefined|NaN|\{she\}|\{her\}|\{pos\}/.test(h);
  const studio = () => { App.state = s; App.mode = 'game'; App.tab = 'studio'; App.studioGroupId = g.id; App.render(); return el('screen').innerHTML; };
  const desk = () => { App.state = s; App.mode = 'game'; App.tab = 'desk'; App.render(); return el('screen').innerHTML; };
  App.resetDrafts();

  // the Desk: the door as a card, the desk's build and its bill on the buttons
  const build0 = K.reissueBuild(s, g);
  const bill0 = K.reissueBill(s, g, build0);
  let html = desk();
  t.ok(guard(html), 'the Desk renders clean with the door on it');
  const cards = dom.actionsIn(html).filter(a => a.action === 'scene-opt' && a.dataset.scene === sc.id);
  t.eq(cards.map(a => a.dataset.opt).join(','), 'anr,fans,rest', 'the Desk card offers the three doors');
  const text = dom.stripTags(html);
  t.ok(text.includes('Reissue with the chair’s pick, “Chair Song” · ' + K.C.MV.TIERS[build0.mv].label + ' · ' + K.roundsWord(build0.signRounds) + ' · ' + bill0),
    'the Desk card quotes the desk’s build and its bill');
  t.ok(text.includes('ERALINE · the reissue'), 'under the door’s title');

  // the Studio: the same call, with the sheet that changes it
  html = studio();
  t.ok(guard(html), 'the Studio renders clean in the rest window');
  let strip = dom.stripTags(html);
  t.ok(strip.includes('The era can extend'), 'the Studio shows the reissue sheet');
  t.ok(strip.includes('The window closes ' + K.weekLabel(g.promoUntil + K.C.REPACKAGE.windowWeeks).text + '.'), 'with the same deadline the close named');
  t.ok(strip.includes('The same call is waiting on the Desk with the desk’s build; this sheet is where you change it.'), 'and points at the Desk’s door');
  let acts = dom.actionsIn(html);
  const mvBtns = acts.filter(a => a.action === 'reissue-mv');
  t.eq(mvBtns.map(a => a.dataset.mv).join(','), Object.keys(K.C.MV.TIERS).join(','), 'a button per video tier');
  t.eq(acts.filter(a => a.action === 'reissue-signs').map(a => a.dataset.r).join(','), '0,1,2,3', 'a button per fan-sign round count');
  t.eq(acts.filter(a => a.action === 'studio-repackage').map(a => a.dataset.song).join(','), 'eraChair,eraStage,eraSound', 'a button per demo in the drawer');
  t.ok(acts.filter(a => a.action === 'studio-repackage').every(a => !a.disabled && a.dataset.id === g.id), 'all affordable, all the group’s');
  t.ok(strip.includes('the chair’s pick') && strip.includes('the fans’ pick'), 'the drawer marks whose pick is whose');
  const built = (b, bill) => 'The reissue as built: a ' + K.C.MV.TIERS[b.mv].label + ', ' + K.roundsWord(b.signRounds) + ', a pressing of ' +
    K.fmtCount(K.reissuePressing(s, g, b.signRounds).run) + '. The bill is ' + bill + ', video, pressing and rounds included.';
  t.ok(strip.includes(built(build0, bill0)), 'the sheet opens on the desk’s build, at the bill the Desk card quotes');
  t.eq(JSON.stringify(D.UI.reissueBuildFor(s, g)), JSON.stringify(build0), 'the sheet’s build is the engine’s until the boss changes it');

  // the boss changes the video, then the rounds
  D.click({ action: 'reissue-mv', id: g.id, mv: 'cinema' });
  D.click({ action: 'reissue-signs', id: g.id, r: '2' });
  const build1 = { mv: 'cinema', signRounds: 2 };
  const bill1 = K.reissueBill(s, g, build1);
  t.eq(JSON.stringify(D.UI.reissueBuildFor(s, g)), JSON.stringify(build1), 'the sheet holds the boss’s video and rounds');
  t.ok(bill1 > bill0, 'a cinema video and two rounds cost more (' + bill0 + ' → ' + bill1 + ')');
  t.eq(bill1 - K.reissueBill(s, g, { mv: 'cinema', signRounds: 0 }), 2 * K.C.PRODUCT.signRoundCost, 'each round is priced on the bill');
  html = el('screen').innerHTML;
  strip = dom.stripTags(html);
  t.ok(guard(html), 'the changed sheet renders clean');
  t.ok(strip.includes(built(build1, bill1)), 'the sheet re-reads itself: the build line and the bill move together');
  t.ok(!strip.includes(built(build0, bill0)), 'and the old quote is gone');
  // the Desk's door still quotes the desk's build: its buttons do what they say
  const deskText = dom.stripTags(desk());
  t.ok(deskText.includes(' · ' + K.C.MV.TIERS[build0.mv].label + ' · ' + K.roundsWord(build0.signRounds) + ' · ' + bill0),
    'the Desk’s door keeps quoting the build its buttons will lock');

  // a bill the till cannot pay disables the Studio's buttons, not the page
  const money = s.budget;
  s.budget = bill1 - 1;
  acts = dom.actionsIn(studio());
  t.ok(acts.filter(a => a.action === 'studio-repackage').every(a => a.disabled), 'short by one, every Repackage button is disabled');
  s.budget = money;

  // the lock from the Studio is the boss's build, at the quoted bill, counted as the desk's
  studio();
  const debt = g.recoup.debt;
  D.click({ action: 'studio-repackage', id: g.id, song: 'eraStage' });
  t.eq(s.budget, money - bill1, 'the Studio’s lock pays exactly the bill the sheet quoted');
  t.eq(g.recoup.debt, debt + bill1, 'and bills the group for it');
  t.eq(g.prep.songId + '|' + g.prep.mv + '|' + g.prep.pressing.signRounds, 'eraStage|cinema|2', 'the title, the video and the rounds are the boss’s');
  const L = K.eraLedger(s);
  t.eq(L.desk + '|' + L.anr + '|' + L.fans, '1|0|0', 'the ledger counts a Studio reissue as the desk’s own');
  t.eq(L.superseded + L.lapsed + L.rested, 0, 'the Desk’s door closes without being counted as anything else');
  t.ok(!(s.scenes || []).some(x => x.kind === 'theReissue'), 'the Desk’s door is gone with the lock');
  t.eq(App.reissueDraft, null, 'and the sheet’s draft is spent');
  const ann = s.inbox.find(n => n.ind === 'eraAnnounced' && n.reissue);
  t.ok(!!ann && ann.text.includes('with a cinema budget and 2 fan-sign rounds on the sheet'), 'the announcement names the boss’s build');
  html = studio();
  t.ok(guard(html), 'the Studio renders clean with the reissue locked');
  t.ok(!dom.actionsIn(html).some(a => a.action === 'studio-repackage'), 'and the reissue sheet is gone');
  t.eq(K.validateState(s).length, 0, 'the validator is clean after the Studio’s lock');
  void rel;
}

// ---- the pre-order week, as a read ----
{
  const WORDS = {
    ahead: 'the read is ahead of the run. An ordinary week sells this pressing through, and the plant gets a phone call.',
    tracking: 'the read is tracking the run. The pressing is sized to the fandom that exists, and the record decides the rest.',
    soft: 'the read is soft against the run. Unless the record lands well, the warehouse is about to learn how many boxes that is.',
  };
  const preNotes = wire => wire.filter(n => n.ind === 'preorderWeek');

  // the base fixture's own week
  t.eq(base.pre.length, 1, 'a pressing gets one pre-order read on its way to the shelf');
  const n0 = base.pre[0];
  t.eq(base.preWeek, base.landed - 1, 'the week before the record lands');
  t.eq(n0.priority + '|' + n0.kind + '|' + n0.groupId, 'normal|company|' + base.g.id, 'a normal letter from the company, naming its group');
  t.ok(Object.keys(WORDS).includes(n0.word), 'carrying one of the three words (got ' + n0.word + ')');
  t.ok(n0.text.startsWith('Pre-orders for ERALINE’s “' + base.rel.songTitle + '” close the week at ' + KP.fmtCount(base.preCount) +
    ' against a pressing of ' + KP.fmtCount(base.preRun) + '.'), 'the letter gives both counts in public numbers: ' + n0.text.slice(0, 96));
  t.ok(n0.text.endsWith('Pre-orders run a little over half of a first week, and by that arithmetic ' + WORDS[n0.word]),
    'and reads them out in the word’s own sentence');
  t.ok(!noisy(n0.text) && !/\d\.\d|%|×/.test(n0.text), 'no unfilled token, no ratio, no percentage');
  t.eq(JSON.stringify(base.rel.pressing.preorder), JSON.stringify({ word: n0.word }), 'the record keeps the word the read gave');
  t.eq(base.rel.pressing.run, base.preRun, 'against the run it was read against');
  t.eq(base.s.eraLedger.preorderReads, 1, 'the ledger counts the read');

  // no sheet, no read
  {
    const { s, g } = fork();
    t.ok(!g.prep, 'a group between records has no sheet');
    t.eq(KP.preorderExpect(s, g), null, 'so the read is null');
    t.eq(KP.preorderCount(s, g), null, 'the count is null');
    t.eq(KP.preorderWord(s, g), null, 'and the word is null');
  }

  // the three words, forced through the run. The read does not look at the
  // run, so the run alone decides the word: no roll picks the case.
  const made = lockedRecord(KP, 'era-119-pre');
  let guard = 0;
  while (made.g.prep.scheduledWeek - made.s.week > 2 && guard++ < 10) { tick(KP, made.s); answerAll(KP, made.s); }
  t.eq(made.g.prep.scheduledWeek - made.s.week, 2, 'the fixture stands two weeks from the shelf');
  t.ok(!made.g.prep.preorder && KP.eraLedger(made.s).preorderReads === 0, 'no read has been taken, and none counted');
  const x = KP.preorderExpect(made.s, made.g);
  t.eq(x, KP.demandRead(made.s, made.g, made.g.prep.pressing), 'the read is the settle’s own sum, with no factor of its own');
  t.ok(x > 50, 'and there is a fandom to read (' + x + ')');
  const mid = { next: () => 0.5, chance: () => false };   // a middling record, no luck either way
  [['ahead', Math.floor(x * 0.5)], ['tracking', Math.round(x * 1.3)], ['soft', Math.ceil(x * 3)]].forEach(c => {
    const want = c[0], run = c[1];
    const { s, g } = fork(made);
    g.prep.pressing.run = run;
    t.eq(KP.preorderExpect(s, g), x, want + ': the run does not move the read');
    t.eq(KP.preorderWord(s, g), want, want + ': a run of ' + run + ' against a read of ' + x);
    // one truth: the word is the settle's verdict on an ordinary week
    const dry = fork({ s });
    const out = KP.settleProduct(dry.s, dry.g, 50, mid);
    t.eq(out.demand, Math.round(x), want + ': an ordinary week’s demand is the read');
    t.eq(out.soldOut, want === 'ahead', want + ': the settle sells the run out exactly when the word is ahead');
    t.eq(out.overpress, want === 'soft', want + ': and writes the warehouse memo exactly when the word is soft');

    const wire = preNotes(tick(KP, s));
    t.eq(wire.length, 1, want + ': one week out, the read is taken');
    t.eq(wire[0].word, want, want + ': the letter carries the word');
    t.ok(wire[0].text.includes(' against a pressing of ' + KP.fmtCount(run) + '. ') && wire[0].text.endsWith(WORDS[want]),
      want + ': the letter names the run and speaks the word’s sentence');
    t.eq(JSON.stringify(g.prep.preorder), JSON.stringify({ week: s.week, word: want }), want + ': the sheet is stamped with the week and the word');
    const L = s.eraLedger;
    t.eq(L.preorderReads + '|' + L.preorderAhead + '|' + L.preorderSoft,
      '1|' + (want === 'ahead' ? 1 : 0) + '|' + (want === 'soft' ? 1 : 0), want + ': the ledger counts the read and its word');
    answerAll(KP, s);

    // the date slips a week: the stamp holds, the read is not taken twice
    const slip = fork({ s });
    slip.g.prep.scheduledWeek += 1;
    t.eq(slip.g.prep.scheduledWeek - slip.s.week, 2, want + ': (a slipped date stands two weeks out again)');
    t.eq(preNotes(tick(KP, slip.s)).length, 0, want + ': a slipped date does not earn a second read');
    t.eq(slip.s.eraLedger.preorderReads, 1, want + ': and the ledger still counts one');

    // the landing copies the word to the record
    let more = 0, g2 = 0;
    while (g.prep && g2++ < 6) { more += preNotes(tick(KP, s)).length; answerAll(KP, s); }
    t.ok(!g.prep && g.releases.length === 1, want + ': the record lands');
    t.eq(more, 0, want + ': with no second read on the way');
    const rel = g.releases[0];
    t.eq(JSON.stringify(rel.pressing.preorder), JSON.stringify({ word: want }), want + ': the record keeps the word');
    t.eq(rel.pressing.run, run, want + ': and the run it was read against');
    t.eq(s.eraLedger.preorderReads, 1, want + ': one read per pressing');
    t.eq(KP.validateState(s).length, 0, want + ': the validator is clean after the landing');
  });

  // the word's edges are the settle's edges
  {
    const { s, g } = fork(made);
    const edge = P.overpressAt;
    g.prep.pressing.run = Math.ceil(x) - 1;
    t.eq(KP.preorderWord(s, g), x > Math.ceil(x) - 1 ? 'ahead' : 'tracking', 'one copy under the read is ahead');
    g.prep.pressing.run = Math.ceil(x);
    t.eq(KP.preorderWord(s, g), 'tracking', 'a run that covers the read is tracking');
    g.prep.pressing.run = Math.floor(x * edge);
    t.eq(KP.preorderWord(s, g), 'tracking', 'up to the warehouse memo’s own line (' + edge + ' of the read)');
    g.prep.pressing.run = Math.floor(x * edge) + 1;
    t.eq(KP.preorderWord(s, g), 'soft', 'and soft one copy past it');
  }
}

// ---- the second act: the reissue lands, is read against the first, and closes both ----
// the chair's pick is locked and its pre-order week is read: the state stands
// one week from the shelf, and every case below forks it
const act2 = (() => {
  const f = atDoor();
  const r = KP.resolveScene(f.s, f.sc.id, 'anr');
  if (!r.ok) throw new Error('fixture: the reissue refused: ' + r.reason);
  const pre = [];
  let guard = 0, goingIn = null;
  while (f.g.prep && f.g.prep.scheduledWeek - f.s.week > 1 && guard++ < 6) {
    const count = KP.preorderCount(f.s, f.g);
    tick(KP, f.s).filter(n => n.ind === 'preorderWeek').forEach(n => { pre.push(n); goingIn = count; });
    answerAll(KP, f.s);
  }
  return { s: f.s, pre, goingIn };
})();
// one more week: the landing, with whatever the case changed on the way in
const landing = mut => {
  const f = fork(act2);
  if (mut) mut(f.s, f.g);
  const wire = tick(KP, f.s);
  const notes = wire.filter(n => n.ind === 'eraExtended');
  return Object.assign(f, { first: f.g.releases[0], re: f.g.releases[f.g.releases.length - 1], wire, notes, text: notes.length ? notes[0].text : '' });
};
{
  const HEAD = title => 'The “' + title + '” era EXTENDS: ERALINE repackaged with “Chair Song” as the new title track, and the rollout machine barely had to restart. ';
  const REAL = 'The second wind is real — the era gets more weeks, the fandom gets more photocards, and the charts get the same name twice.';
  const WHEEZE = 'The second wind wheezed a little — reprints ride the era’s heat, and this era had less left than the desk hoped.';
  const SAME_PEAK = 'It opens at #1, exactly where the first act peaked. ';
  const mid = { next: () => 0.5, chance: () => false };   // a middling record, no luck either way

  // one week from the shelf: the read, at the reissue's share
  {
    const { s, g } = fork(act2);
    t.eq(g.prep.scheduledWeek - s.week, 1, 'the fixture stands one week from the reissue’s shelf');
    t.eq(g.prep.songId, 'eraChair', 'with the chair’s pick on the sheet');
    const x = KP.preorderExpect(s, g), whole = KP.demandRead(s, g, g.prep.pressing);
    t.ok(P.repackDemand > 0 && P.repackDemand < 1, 'a reissue sells to a share of the fandom (' + P.repackDemand + ')');
    t.eq(x, whole * P.repackDemand, 'the reissue’s read is the settle’s sum at the reissue’s share');
    const dry = fork({ s });
    t.eq(KP.settleProduct(dry.s, dry.g, 50, mid, { repack: true }).demand, Math.round(x), 'one truth: an ordinary reissue week’s demand is the read');
    const full = fork({ s });
    t.eq(KP.settleProduct(full.s, full.g, 50, mid).demand, Math.round(whole), 'and the share is the settle’s reissue flag, nothing else');
    t.eq(KP.preorderCount(s, g), Math.round(x * P.FANBASE.preorderShare), 'the count is the read at the pre-order share');

    t.eq(act2.pre.length, 1, 'the reissue’s pressing gets a pre-order read of its own');
    const n = act2.pre[0];
    t.ok(n.text.startsWith('Pre-orders for ERALINE’s “Chair Song” close the week at ' + KP.fmtCount(act2.goingIn) +
      ' against a pressing of ' + KP.fmtCount(g.prep.pressing.run) + '.'), 'the letter names the new title and both counts: ' + n.text.slice(0, 96));
    t.ok(!noisy(n.text), 'and reads clean');
    t.eq(JSON.stringify(g.prep.preorder), JSON.stringify({ week: s.week, word: n.word }), 'the sheet is stamped with the week and the word');
    t.eq(s.eraLedger.preorderReads, 2, 'the ledger counts one read per pressing: the first act’s and the reissue’s');
  }

  // the landing
  const control = landing();
  {
    const { s, g, first, re, notes, text, wire } = control;
    t.ok(!g.prep && g.releases.length === 2, 'the reissue lands as the group’s second record');
    t.eq(re.songTitle, 'Chair Song', 'under the chair’s title');
    t.eq(re.repackageOf, first.songTitle, 'it names the record it extends');
    t.eq(first.reissuedAs, 'Chair Song', 'and the first act names its reissue');
    t.eq(g.promoUntil, s.week + RP.promoWeeks, 'a reissue promotes on the short cycle');
    t.eq((g.eraLeftovers || []).length, 0, 'the drawer is spent: a reissue leaves no leftovers');
    t.eq(JSON.stringify(re.pressing.preorder), JSON.stringify({ word: act2.pre[0].word }), 'the record keeps the word its pre-order week gave');
    t.eq(notes.length, 1, 'one landing note for the era’s second act');
    t.eq(notes[0].kind + '|' + notes[0].priority + '|' + notes[0].groupId, 'public|high|' + g.id, 'public, high, and the group’s');
    t.ok(!notes[0].extension, 'it is not the promotion’s second wind under the same name');
    t.ok(!KP.eraExtended(g), 'and a reissue landing does not stamp a second wind');
    t.ok(!noisy(text), 'the note reads clean');
    t.eq(closeOf(wire).length, 0, 'the landing week closes nothing');
    t.eq(JSON.stringify(first.closed), JSON.stringify(fork(act2).g.releases[0].closed), 'and the first act’s close is not rewritten');
    t.eq(KP.validateState(s).length, 0, 'the validator is clean after the reissue lands');

    // what the fixture must be for the cases below to mean what they say
    // (a moved hash fails here first: pick another seed)
    t.eq(first.receptionBand + '|' + re.receptionBand, 'quiet|solid', 'fixture: the first act landed quiet and the reissue solid, a word with room on both sides');
    t.eq(first.chartPeak + '|' + re.chartPeak, '1|1', 'fixture: both acts open at the top of the scene');
    t.ok(first.reception < RP.carryFrom && re.reception < 60 && re.reception + Math.round(50 * RP.carryFactor) >= 60,
      'fixture: no carry in the control, and a full carry crosses the second wind’s line (' + first.reception + ', ' + re.reception + ')');
    t.eq(text, HEAD(first.songTitle) + 'The first act landed quiet; the second lands solid, which is the rarer direction for a reprint to travel. ' + SAME_PEAK + WHEEZE,
      'the note reads the second act against the first: the words, the chart, the wind');
  }

  // the first act's word, in all five: below, level, above
  const AGAINST = {
    miss: 'The first act landed a miss; the second lands solid, which is the rarer direction for a reprint to travel. ',
    quiet: 'The first act landed quiet; the second lands solid, which is the rarer direction for a reprint to travel. ',
    solid: 'The first act landed solid, and the second matches it, which is all a reprint is ever asked to do. ',
    strong: 'The first act landed strong; the second lands solid. ',
    sensation: 'The first act landed a sensation; the second lands solid. ',
  };
  Object.keys(AGAINST).forEach(band => {
    const f = landing((s, g) => { g.prep.repackage.band = band; });
    t.eq(f.re.receptionBand + '|' + f.re.reception, 'solid|' + control.re.reception, band + ': the first act’s word does not move how the second lands');
    t.eq(f.text, HEAD(f.first.songTitle) + AGAINST[band] + SAME_PEAK + WHEEZE, band + ': the second act is read against a first act that landed ' + band);
  });
  {
    // a lock from before the words were carried (a save mid-reissue): no comparison, no chart line
    const old = landing((s, g) => { g.prep.repackage = { of: g.prep.repackage.of, reception: g.prep.repackage.reception }; });
    t.eq(old.text, HEAD(old.first.songTitle) + WHEEZE, 'a lock with no word and no peak lands with neither sentence');
    t.eq(old.re.reception + '|' + old.re.repackageOf, control.re.reception + '|' + old.first.songTitle, 'and lands the same record');
    t.eq(KP.validateState(old.s).length, 0, 'clean');
    const odd = landing((s, g) => { g.prep.repackage.band = 'legendary'; });
    t.eq(odd.text, HEAD(odd.first.songTitle) + SAME_PEAK + WHEEZE, 'a word the table does not know is left out, not printed');
  }

  // the chart line, in its three directions
  {
    const above = landing((s, g) => { g.prep.repackage.chartPeak = 5; });
    t.eq(above.re.chartPeak, 1, 'above: the reissue opens where it opens');
    t.ok(above.text.includes('travel. It opens at #1, above the #5 the first act reached. The second wind'), 'above: a better opening than the first act’s peak says so');

    // under: nothing forced but the room. Two heavier records sit on the scene the week it lands.
    const under = landing(s => {
      ['Rival One', 'Rival Two'].forEach(title =>
        KP.chartEnter(s, { title, act: 'RIVALS', company: 'Elsewhere', isPlayer: false, score: 400, entered: s.week }));
    });
    t.eq(under.re.chartPeak, 3, 'under: a crowded scene opens the reissue at #3');
    t.eq(under.re.reception, control.re.reception, 'under: the crowd moves the rank, not the record');
    t.ok(under.text.includes('travel. It opens at #3, under the first act’s #1. The second wind'), 'under: and the note says which act charted higher');
    t.eq(KP.validateState(under.s).length, 0, 'under: clean');

    [null, 0].forEach(v => {
      const none = landing((s, g) => { g.prep.repackage.chartPeak = v; });
      t.ok(!none.text.includes('It opens at') && none.text.includes('travel. The second wind'), 'a first act with no chart week (' + v + ') earns no chart line');
    });
  }

  // the carry: a first act that landed well lends the reissue a little of it
  {
    const lift = r => Math.round((r - 50) * RP.carryFactor);
    const full = landing((s, g) => { g.prep.repackage.reception = 100; });
    t.eq(full.re.reception, control.re.reception + lift(100), 'a first act at 100 carries ' + lift(100) + ' into the reissue');
    t.ok(full.text.endsWith(REAL) && !full.text.includes('wheezed'), 'and at 60 or over the second wind is real');
    t.ok(control.text.endsWith(WHEEZE) && !control.text.includes('is real'), 'under 60 it wheezes');
    const line = landing((s, g) => { g.prep.repackage.reception = RP.carryFrom; });
    t.eq(line.re.reception, control.re.reception + lift(RP.carryFrom), 'the carry starts at the line (' + RP.carryFrom + ' carries ' + lift(RP.carryFrom) + ')');
    t.ok(lift(RP.carryFrom) > 0, 'and the line itself carries something');
    const shy = landing((s, g) => { g.prep.repackage.reception = RP.carryFrom - 1; });
    t.eq(shy.re.reception, control.re.reception, 'one point under it carries nothing');
  }

  // the reissue's own close: the letter closes both acts, and no door opens behind it
  {
    const f = landing();
    answerAll(KP, f.s);
    let early = 0, guard = 0;
    while (f.s.week < f.g.promoUntil && guard++ < 8) { early += closeOf(tick(KP, f.s)).length; answerAll(KP, f.s); }
    t.eq(early, 0, 'the reissue’s promotion closes nothing early');
    t.ok(!KP.eraExtended(f.g), 'fixture: the reissue earns no second wind of its own');
    const pre = KP.deserialize(KP.serialize(f.s));   // the week before the close, kept for the stocked-drawer case
    const firstClosed = JSON.stringify(f.first.closed);
    const notes = closeOf(tick(KP, f.s));
    t.eq(f.s.week, f.g.promoUntil + 1, 'the week its promotion ends');
    t.eq(notes.length, 1, 'the reissue’s era closes, once');
    const text = notes[0].text;
    t.ok(VERDICTS.includes(notes[0].verdict) && f.re.closed.verdict === notes[0].verdict, 'with a verdict of its own (' + notes[0].verdict + ')');
    t.eq(f.re.closed.week, f.s.week, 'the reissue’s file is marked');
    t.ok(text.endsWith('That closes both acts: “' + f.first.songTitle + '” landed quiet, and its reissue solid.'), 'the letter closes both acts in their own words: ' + text.slice(-80));
    t.ok(text.includes('The “Chair Song” era'), 'under the reissue’s title');
    t.ok(!text.includes('The drawer still holds') && !doorOf(f.s), 'no drawer line and no door: an era extends once');
    t.ok(!text.includes('second wind') && !f.re.closed.extended, 'and no second wind it did not have');
    t.ok(!noisy(text), 'the letter reads clean');
    const L = f.s.eraLedger;
    t.eq(L.closed + '|' + L.reissueOffered + '|' + L.anr, '2|1|1', 'the ledger: two closes, one door, one answer');
    t.eq(JSON.stringify(f.first.closed), firstClosed, 'the first act’s close stands as it was written');
    t.eq(KP.reissueOpenFor(f.s, f.g, f.re), false, 'the door reads shut on a reissue');
    t.eq(KP.validateState(f.s).length, 0, 'the validator is clean after the second close');
    answerAll(KP, f.s);
    t.eq(closeOf(tick(KP, f.s)).length, 0, 'and the week after closes nothing again');

    // a stocked drawer changes none of it: the gate is the reissue, not the empty drawer
    const g2 = pre.groups[0], re2 = g2.releases[g2.releases.length - 1];
    stockDrawer(g2, base.proto, re2);
    const again = closeOf(tick(KP, pre));
    t.eq(again.length, 1, 'stocked: the reissue still closes');
    t.ok(!again[0].text.includes('The drawer still holds') && !doorOf(pre), 'stocked: with no drawer line and no door');
    t.eq(pre.eraLedger.reissueOffered, 1, 'stocked: the ledger counts no second offer');
    t.eq(KP.reissueOpenFor(pre, g2, re2), false, 'stocked: the door reads shut');
    const r = KP.planRepackage(pre, { groupId: g2.id, songId: 'eraStage' });
    t.eq(r.ok + '|' + r.reason, 'false|A repackage does not repackage. Even this industry has limits.', 'stocked: and the verb refuses in the industry’s own words');
    t.ok(!g2.prep && g2.eraLeftovers.length === 3, 'stocked: the refusal locks nothing and spends nothing');
  }

  // the letter's last line needs both acts on file
  {
    const f = landing();
    answerAll(KP, f.s);
    let guard = 0;
    while (f.s.week < f.g.promoUntil && guard++ < 8) { tick(KP, f.s); answerAll(KP, f.s); }
    const lost = KP.deserialize(KP.serialize(f.s));
    lost.groups[0].releases[0].songTitle = 'Renamed Since';
    const a = closeOf(tick(KP, lost))[0];
    t.ok(!!a && !a.text.includes('That closes both acts') && !noisy(a.text), 'a first act the file cannot find is left out of the letter, cleanly');
    const blank = KP.deserialize(KP.serialize(f.s));
    delete blank.groups[0].releases[0].receptionBand;
    const b = closeOf(tick(KP, blank))[0];
    t.ok(!!b && !b.text.includes('That closes both acts') && !noisy(b.text), 'and so is a first act with no word on file');
  }
}

// ---- one era, two acts: the red ledger ----
// the reissue carries its own bill now, so its net joins the first act's and
// the era is counted once. It used to stand as a second era with no bill on
// it: a reissue of any size wiped the red count, and one that lost money
// would have counted the same era twice.
{
  const B = KP.C.BOOKS;
  const before = fork(act2).g;
  const control = landing();
  // the record keeps no revenue line: the second act's own net is read off the control
  const net2 = control.g.lastEraNet - before.lastEraNet;
  const ink = f => f.wire.filter(n => n.ind === 'redInk');
  const meeting = f => (f.s.scenes || []).filter(sc => sc.kind === 'redInk' && sc.groupId === f.g.id);
  const reads = f => [f.g.lastEraNet, f.g.redEras, f.g.redTalkDone, f.g.eraSpend].join('|');
  // the first act's net and the count going in are set by hand; `extra` is spend the era ran up on top
  const act = (firstNet, o) => landing((s, g) => {
    g.lastEraNet = firstNet; g.redEras = o.red; g.redTalkDone = o.talked;
    g.eraSpend += o.extra || 0;
  });

  t.ok(before.lastEraNet < 0 && before.redEras === 1, 'fixture: the first act lost money, and the ledger counted it once (' + before.lastEraNet + ')');
  t.ok(before.eraSpend > 0, 'fixture: the reissue’s bill stands on the era’s spend (' + before.eraSpend + ')');
  t.ok(Number.isInteger(net2) && net2 > 0, 'fixture: the second act earns a little more than it cost (' + net2 + ')');
  t.ok(before.lastEraNet + net2 < 0, 'fixture: and not enough to bring this era level');
  t.ok(B.redErasAt >= 2, 'fixture: the hard conversation waits for more than one red era');

  // as the fixture runs it: red before, red after, one era
  t.eq(control.g.redEras, 1, 'a reissue that leaves the era in the red does not count it again, and does not clear it');
  t.eq(control.g.redTalkDone, before.redTalkDone, 'and leaves the talk where it stood');
  t.eq(control.g.eraSpend, 0, 'the landing settles the era’s spend');
  t.eq(ink(control).length + meeting(control).length, 0, 'no meeting is called');

  // the line is zero, and zero is black
  const level = act(-net2, { red: 2, talked: true });
  t.eq(reads(level), '0|0|false|0', 'a reissue that brings a red era exactly level clears the count and reopens the talk');
  const shy = act(-net2 - 1, { red: 2, talked: true });
  t.eq(reads(shy), '-1|2|true|0', 'one short of level the era stays red: counted once, the talk still had');

  // a thin era can be tipped under
  const held = act(0, { red: 0, talked: false, extra: net2 });
  t.eq(reads(held), '0|0|false|0', 'a level era the reissue leaves level stays black');
  const tipped = act(0, { red: 0, talked: false, extra: net2 + 1 });
  t.eq(reads(tipped), '-1|1|false|0', 'a level era the reissue tips under is counted, once');

  // never the same era twice: a red era whose reissue loses money on its own
  const twice = act(-5, { red: B.redErasAt - 1, talked: false, extra: net2 + 1 });
  t.eq(reads(twice), '-6|' + (B.redErasAt - 1) + '|false|0', 'a reissue that loses money on its own does not count a red era a second time');
  t.eq(ink(twice).length + meeting(twice).length, 0, 'and the hard conversation is not called over one era counted twice');

  // the tip that makes the count: the meeting is on the desk the same week
  const third = act(0, { red: B.redErasAt - 1, talked: false, extra: net2 + 1 });
  t.eq(reads(third), '-1|' + B.redErasAt + '|false|0', 'a tip that is the last red era the books allow is counted');
  t.eq(ink(third).length + '|' + meeting(third).length, '1|1', 'and the hard conversation is on the desk that week');
  const n = ink(third)[0] || { text: '' };   // a missing letter fails by name, not by crash
  t.ok(n.kind === 'company' && n.priority === 'high' && n.groupId === third.g.id &&
    n.text.startsWith('ERALINE has now lost money three eras running') && !noisy(n.text), 'a high company letter, for the group, in the books’ own words');
  t.eq(KP.validateState(third.s).length, 0, 'the file is valid');

  // a file with no first-act net on it reads the first act as level
  const bare = landing((s, g) => { delete g.lastEraNet; });
  t.eq(reads(bare), [net2, before.redEras, before.redTalkDone, 0].join('|'), 'a first act with no net on file is read as level: the reissue’s own net stands, and the count does not move');
}

// ---- the discography: the era's last line, on the record ----
// both acts closed on the engine; the page is the stub's own engine reading the save
const bothClosed = (() => {
  const f = landing();
  let guard = 0;
  while (!f.re.closed && guard++ < 8) { answerAll(KP, f.s); tick(KP, f.s); }
  if (!f.re.closed) throw new Error('fixture: the reissue never closed');
  return f;
})();
{
  const D = dom.load();
  const K = D.KP;
  const KICKER = '<div class="kicker">Discography</div>';
  // a row is the record's line without its booklet credits; its tail is what follows the chart weeks
  const page = mut => {
    const s = K.deserialize(KP.serialize(bothClosed.s));
    const g = s.groups[0];
    if (mut) mut(g.releases[0], g.releases[1]);
    const html = D.UI.renderGroupPage(s, g);
    const disco = html.slice(html.indexOf(KICKER));
    const row = title => {
      const at = disco.indexOf('<b>“' + title + '”</b>');
      return at < 0 ? '' : dom.stripTags(disco.slice(at, disco.indexOf('</span></div></div>', at)).split('<br>')[0]);
    };
    const tail = r => { const m = / · (?:\d+ weeks charting|missed the charts)(.*)$/.exec(r); return m ? m[1] : null; };
    const first = row(g.releases[0].songTitle), re = row(g.releases[1].songTitle);
    return { s, g, html, disco, first, re, firstTail: tail(first), reTail: tail(re) };
  };

  const p = page();
  t.eq(bothClosed.first.closed.verdict + '|' + bothClosed.first.closed.trophies + '|' + bothClosed.re.closed.verdict + '|' + !!bothClosed.re.closed.extended,
    'crowned|2|quiet|false', 'fixture: the first act closed crowned with two trophies, the reissue quietly, neither on a second wind');
  t.eq(K.validateState(p.s).length, 0, 'the save reads clean in the page’s own engine');
  t.ok(p.html.includes(KICKER), 'the group page carries the discography');
  t.ok(p.disco.indexOf('<b>“Chair Song”</b>') < p.disco.indexOf('<b>“' + bothClosed.first.songTitle + '”</b>'), 'newest record first');
  t.ok(!noisy(p.first) && !noisy(p.re), 'both rows read clean');
  t.ok(p.first.includes(' debut · peaked #1 · ') && !p.first.includes('extends'), 'the first act’s row is the debut’s');
  t.eq(p.firstTail, ' · closed with 2 trophies · reissued as “Chair Song”', 'it ends on how the era closed and what followed it');
  t.ok(p.re.includes(' extends “' + bothClosed.first.songTitle + '” · peaked #1 · '), 'the reissue’s row names the era it extends');
  t.eq(p.reTail, ' · closed quietly', 'and ends on its own close, with nothing after it');
  t.ok(!/\d/.test((p.firstTail + p.reTail).replace('2 trophies', '')), 'the last line prints one number, the trophies on the shelf: no hidden read is a digit');

  // the close's own mark, in every word it can hold
  [
    [{ verdict: 'crowned', trophies: 1 }, ' · closed with a trophy'],
    [{ verdict: 'crowned', trophies: 2 }, ' · closed with 2 trophies'],
    [{ verdict: 'crowned', trophies: 5 }, ' · closed with 5 trophies'],
    [{ verdict: 'warm', trophies: 0 }, ' · closed warm'],
    [{ verdict: 'quiet', trophies: 0 }, ' · closed quietly'],
    [{ verdict: 'cold', trophies: 0 }, ' · closed cold'],
    [{ verdict: 'warm', trophies: 0, extended: true }, ' · closed warm after a second wind'],
    [{ verdict: 'crowned', trophies: 3, extended: true }, ' · closed with 3 trophies after a second wind'],
    [{ verdict: 'legendary', trophies: 0 }, ' · closed quietly'],
  ].forEach(c => {
    const q = page((first, re) => { re.closed = Object.assign({ week: re.closed.week }, c[0]); });
    t.eq(q.reTail, c[1], 'a close marked ' + JSON.stringify(c[0]) + ' reads “' + c[1].slice(3) + '”');
  });
  VERDICTS.forEach(v => {
    const q = page((first, re) => { re.closed = { week: re.closed.week, trophies: v === 'crowned' ? 1 : 0, verdict: v }; });
    t.ok(/^ · closed (with a trophy|warm|quietly|cold)$/.test(q.reTail), 'every verdict the engine can give has a word on the row (' + v + ')');
  });

  // what followed the era
  {
    const rested = page(first => { delete first.reissuedAs; first.reissueRested = true; });
    t.eq(rested.firstTail, ' · closed with 2 trophies · left to rest', 'an era the desk rested says so');
    const plain = page(first => { delete first.reissuedAs; });
    t.eq(plain.firstTail, ' · closed with 2 trophies', 'an era with nothing after it ends on its close');
    const both = page(first => { first.reissueRested = true; });
    t.eq(both.firstTail, ' · closed with 2 trophies · reissued as “Chair Song”', 'a reissue on file outranks the rest mark');
    const odd = page((first, re) => { first.reissuedAs = 'A <b>Bold</b> "Title"'; });
    t.ok(odd.html.includes('reissued as “A &lt;b&gt;Bold&lt;/b&gt; &quot;Title&quot;”'), 'a title is escaped on the row, like every other title on the page');
  }

  // a record from before the close existed: the row is what it always was
  {
    const old = page((first, re) => { delete first.closed; delete re.closed; delete first.reissuedAs; });
    t.eq(old.firstTail + '|' + old.reTail, '|', 'a record with no close on file prints no close');
    t.ok(!old.disco.includes('closed') && !noisy(old.first) && !noisy(old.re), 'and the page reads clean without one');
    t.ok(old.re.includes(' extends “' + bothClosed.first.songTitle + '” · peaked #1 · '), 'the reissue still names its era');
    // an era the old build never closed, reissued on this one
    const mid = page(first => { delete first.closed; });
    t.eq(mid.firstTail, ' · reissued as “Chair Song”', 'an era with no close on file but a reissue after it says only what followed');
    t.eq(mid.reTail, ' · closed quietly', 'and the reissue’s own close is untouched by it');
  }
}

// ---- old saves: a file from before the close existed ----
// what 0.11.8 wrote: no era ledger, no close line, no trophy tally or last
// stage on a record, no pre-order word on a pressing, no reissue door. The
// version is set by hand: the build's own number moves at the ship, and the
// file must read as old on either side of it.
const oldFile = (src, mut) => {
  const o = JSON.parse(KP.serialize(src));
  o.version = '0.11.8';
  delete o.eraLedger;
  o.scenes = (o.scenes || []).filter(sc => sc.kind !== 'theReissue');
  o.convoLog = (o.convoLog || []).filter(c => c.kind !== 'theReissue');
  o.inbox = (o.inbox || []).filter(n => n.ind !== 'eraClosed' && n.ind !== 'preorderWeek' && !(n.ind === 'eraAnnounced' && n.reissue));
  o.groups.forEach(g => {
    delete g.lastCloseLine;
    if (g.prep) delete g.prep.preorder;
    (g.releases || []).forEach(r => {
      delete r.trophies; delete r.lastStage; delete r.closed; delete r.reissuedAs; delete r.reissueRested;
      if (r.pressing) { delete r.pressing.preorder; delete r.pressing.preset; }
    });
  });
  if (mut) mut(o);
  return JSON.stringify(o);
};
const loadOld = (src, mut) => {
  const s = KP.deserialize(oldFile(src, mut));
  const g = s.groups[0];
  return { s, g, rel: g.releases[g.releases.length - 1] };
};
const COUNTERS = ['closed', 'reissueOffered', 'anr', 'fans', 'desk', 'rested', 'lapsed', 'superseded', 'preorderReads', 'preorderAhead', 'preorderSoft'];
const counts = s => COUNTERS.map(k => s.eraLedger[k]).join(',');
const ZEROS = COUNTERS.map(() => 0).join(',');

// the load: the ledger arrives, with the week the file learned to keep an era's record
{
  const { s, g, rel } = loadOld(base.s);
  const L = s.eraLedger;
  t.eq(s.version, KP.C.VERSION, 'an old file is stamped to this build on load');
  t.ok(!!L && counts(s) === ZEROS, 'the era ledger arrives with every counter at zero');
  t.eq(Object.keys(L).sort().join(','), COUNTERS.concat('since').sort().join(','), 'the eleven counters and one more key, the week');
  t.eq(L.since, s.week, 'the week is the one the file was loaded in');
  t.ok(rel.week < L.since && L.since === g.promoUntil, 'fixture: the file joined in the era’s last promotion week, weeks after the record landed');
  t.ok(rel.trophies === undefined && rel.lastStage === undefined && !rel.closed && g.lastCloseLine === undefined,
    'fixture: the record carries nothing this build began to keep');
  t.ok(!rel.pressing.preorder && !doorOf(s), 'fixture: no pre-order word on the pressing, no door on the desk');
  t.eq(KP.validateState(s).length, 0, 'the upgraded file is valid');

  // only a file that met the old build carries the week
  const fresh = KP.newGame('era-119-fresh', null, { legacy: false });
  t.eq(counts(fresh), ZEROS, 'a new game has the ledger from week one');
  t.ok(!('since' in fresh.eraLedger), 'and no such week: it kept the record from the start');
  t.ok(!('since' in base.s.eraLedger), 'nor does the fixture, weeks into its game');
  t.ok(!('since' in fork().s.eraLedger), 'nor a save of this build, loaded again');

  // and it is written once
  tick(KP, s); answerAll(KP, s);
  const again = KP.deserialize(KP.serialize(s));
  t.ok(again.week > L.since, 'fixture: the file is saved and loaded a week later');
  t.eq(again.eraLedger.since, L.since, 'the second load keeps the first week, not the later one');
  KP.migrate(again);
  t.eq(again.eraLedger.since, L.since, 'and the chain run over it again does not move it');
}

// an era the file joined mid-promotion is not closed from half a record
{
  const truth = fork();
  const whole = closeOf(tick(KP, truth.s))[0];
  t.ok(!!whole && whole.text.includes('2 trophies') && truth.rel.closed.verdict === 'crowned',
    'fixture: on a file that kept the record, this week closes crowned with two trophies');

  const { s, g, rel } = loadOld(base.s);
  const wire = tick(KP, s);
  t.eq(s.week, g.promoUntil + 1, 'fixture: the old file stands in the week the close would fire');
  t.eq(closeOf(wire).length, 0, 'no close is written: “no trophy” over a shelf that holds two is worse than silence');
  t.ok(!rel.closed && g.lastCloseLine === undefined, 'nothing is marked on the record or the group');
  t.ok(!doorOf(s), 'no reissue door opens on a close that never happened');
  t.eq(counts(s), ZEROS, 'and the ledger counts nothing');
  t.eq(KP.validateState(s).length, 0, 'the file is valid after the week');

  // the window is the desk's own: the Studio's reissue never needed a close
  answerAll(KP, s);
  const r = KP.planRepackage(s, { groupId: g.id, songId: 'eraChair' });
  t.ok(r.ok, 'the era can still be reissued from the desk inside its window');
  t.eq(s.eraLedger.desk + '|' + s.eraLedger.anr + '|' + s.eraLedger.fans, '1|0|0', 'and the ledger counts the desk’s own lock');
  t.ok(!!g.prep.pressing && g.prep.repackage.band === rel.receptionBand, 'the lock is this build’s: a pressing sheet, the first act’s word carried');
  const closes = [];
  let guard = 0;
  while (g.prep && guard++ < 6) { closeOf(tick(KP, s)).forEach(n => closes.push(n)); answerAll(KP, s); }
  const first = g.releases[0], re = g.releases[g.releases.length - 1];
  t.ok(g.releases.length === 2 && re.week > s.eraLedger.since, 'fixture: the reissue landed after the file joined');
  t.eq(first.reissuedAs, 'Chair Song', 'the first act is marked with what followed it');
  guard = 0;
  while (!re.closed && guard++ < 8) { closeOf(tick(KP, s)).forEach(n => closes.push(n)); answerAll(KP, s); }
  t.eq(closes.length, 1, 'the reissue closes once, the first close this file has seen');
  t.eq(re.closed.week, g.promoUntil + 1, 'on its own week');
  t.ok(closes[0].text.includes('That closes both acts: “' + first.songTitle + '” landed '), 'and reads both acts: the first act’s landing word was always on file');
  t.ok(!noisy(closes[0].text), 'in clean words');
  t.ok(!first.closed, 'the first act stays unclosed: its week is behind the file');
  t.eq(s.eraLedger.closed, 1, 'one close on the ledger');
  t.eq(KP.validateState(s).length, 0, 'and the file is valid at the end of both acts');
}

// the gate, forced by hand on a file of this build: no roll picks the side
{
  const landedWith = fork();
  landedWith.s.eraLedger.since = landedWith.rel.week;
  const cw = closeOf(tick(KP, landedWith.s));
  t.eq(cw.length, 1, 'a record that landed the very week the file joined closes: every promotion week was kept');
  t.eq(landedWith.rel.closed.verdict + '|' + landedWith.rel.closed.trophies + '|' + landedWith.rel.closed.lastStage, 'crowned|2|shaky', 'whole, with its trophies and its last stage');
  t.ok(!!doorOf(landedWith.s), 'and its door opens');

  const before = fork();
  before.s.eraLedger.since = before.rel.week + 1;
  t.eq(closeOf(tick(KP, before.s)).length, 0, 'one that landed the week before is passed over');
  t.ok(!before.rel.closed && !doorOf(before.s) && before.s.eraLedger.closed === 0, 'with no mark, no door and no count');
  t.eq(members(landedWith.s, landedWith.g).map((p, i) => p.morale - members(before.s, before.g)[i].morale).join(','),
    landedWith.g.members.map(() => E.closeMoraleUp).join(','), 'the room’s morale is the close’s to move, and a close passed over moves none of it');

  const undated = fork();
  undated.s.eraLedger.since = 1;
  delete undated.rel.week;
  t.eq(closeOf(tick(KP, undated.s)).length, 0, 'a record with no landing week on a stamped file is passed over, not guessed at');
  t.eq(KP.validateState(undated.s).length, 0, 'and the week runs clean around it');

  const never = fork();
  t.ok(!('since' in never.s.eraLedger) && closeOf(tick(KP, never.s)).length === 1, 'a file with no such week closes as it always did');
}

// the file saved the week the record landed: every promotion week is still ahead of it
{
  const L0 = lockedRecord(KP, 'era-119');
  let guard = 0;
  while (L0.g.prep && guard++ < 14) { tick(KP, L0.s); answerAll(KP, L0.s); }
  t.eq(L0.s.week + '|' + L0.g.releases.length, base.landed + '|1', 'fixture: the same record, saved the week it landed');
  const { s, g, rel } = loadOld(L0.s);
  t.eq(s.eraLedger.since, rel.week, 'the file joined the week the record landed');
  t.ok(!rel.pressing.preorder && rel.trophies === undefined, 'fixture: no pre-order word on the pressing, no tally on the record yet');
  while (s.week < g.promoUntil) { tick(KP, s); answerAll(KP, s); }
  stockDrawer(g, L0.proto, rel);
  const c = closeOf(tick(KP, s));
  const truth = fork();
  const whole = closeOf(tick(KP, truth.s))[0];
  t.eq(c.length, 1, 'it closes');
  t.eq(JSON.stringify(rel.closed), JSON.stringify(truth.rel.closed), 'with the mark of the file that was never old: the trophies and the last stage were all kept');
  t.ok(/ \(the record outran its pre-orders\)/.test(whole.text), 'fixture: the true close carries the pre-order week’s word');
  t.eq(c[0].text, whole.text.replace(' (the record outran its pre-orders)', ''), 'and the same letter, less the pre-order week nobody read');
  t.ok(!!doorOf(s), 'the door opens on it');
  t.eq(s.eraLedger.closed + '|' + s.eraLedger.reissueOffered, '1|1', 'and the ledger counts the close and the offer');
}

// the file saved the week after promotion ended: the close's week is behind it
{
  const past = fork();
  tick(KP, past.s);
  t.ok(!!past.rel.closed, 'fixture: this build closed the era that week');
  const { s, g, rel } = loadOld(past.s);
  t.ok(s.week === g.promoUntil + 1 && !rel.closed && !doorOf(s), 'fixture: the old file stands one week past promotion with no close and no door');
  let n = 0;
  for (let i = 0; i < 10; i++) { n += closeOf(tick(KP, s)).length; answerAll(KP, s); }
  t.eq(n, 0, 'an era already past its last week is never closed after the fact');
  t.ok(!rel.closed && counts(s) === ZEROS, 'ten weeks on: no mark, nothing counted');
  // the exact week alone already kept it shut: the stamp is for the era in flight
  const bare = loadOld(past.s);
  delete bare.s.eraLedger.since;
  n = 0;
  for (let i = 0; i < 10; i++) { n += closeOf(tick(KP, bare.s)).length; answerAll(KP, bare.s); }
  t.eq(n, 0, 'the exact-week rule holds that without the stamp');
}

// the reissue the old build had already locked: its lock carried the first
// act's title and number and nothing else (no pressing sheet, no word, no peak)
{
  const f = atDoor();
  const r = KP.resolveScene(f.s, f.sc.id, 'anr');
  if (!r.ok) throw new Error('fixture: the reissue refused: ' + r.reason);
  const of = f.rel.songTitle, reception = f.rel.reception, sched = f.g.prep.scheduledWeek;
  t.ok(!!f.g.prep.pressing && 'band' in f.g.prep.repackage && 'chartPeak' in f.g.prep.repackage,
    'fixture: this build’s lock carries a pressing sheet and the first act’s word and peak');
  const { s, g } = loadOld(f.s, o => {
    const p = o.groups[0].prep;
    delete p.pressing;
    p.repackage = { of: p.repackage.of, reception: p.repackage.reception };
  });
  t.eq(JSON.stringify(g.prep.repackage), JSON.stringify({ of, reception }), 'fixture: the old lock, as 0.11.8 wrote it');
  t.ok(!g.prep.pressing && !g.prep.preorder && g.prep.scheduledWeek === sched, 'fixture: no sheet, no pre-order stamp, the same date');
  t.ok(s.eraLedger.since === s.week && g.releases[0].week < s.week, 'the file joined after the first act landed');
  t.eq(KP.validateState(s).length, 0, 'an old lock in flight loads valid');
  t.ok(KP.preorderExpect(s, g) === null && KP.preorderCount(s, g) === null && KP.preorderWord(s, g) === null,
    'a lock with no pressing sheet has no pre-order read: null, never a guess');

  const wire = [];
  let guard = 0;
  while (g.prep && guard++ < 6) { tick(KP, s).forEach(n => wire.push(n)); answerAll(KP, s); }
  const first = g.releases[0], re = g.releases[g.releases.length - 1];
  t.ok(g.releases.length === 2 && re.week === sched && re.repackageOf === of, 'it lands on this build, on its date, as the era’s second record');
  t.eq(wire.filter(n => n.ind === 'preorderWeek').length, 0, 'no pre-order week is read off a sheet that never existed');
  t.ok(s.eraLedger.preorderReads === 0 && !re.pressing.preorder, 'none is counted, and the record carries no pre-order word');
  const notes = wire.filter(n => n.ind === 'eraExtended');
  t.eq(notes.length, 1, 'one landing note');
  t.ok(notes[0].text.startsWith('The “' + of + '” era EXTENDS: ERALINE repackaged with “' + re.songTitle + '” as the new title track'),
    'in the reissue’s own words: ' + notes[0].text.slice(0, 80));
  t.ok(!notes[0].text.includes('The first act landed') && !notes[0].text.includes('It opens at'),
    'with no comparison it was never given a word for, and no chart line it was never given a peak for');
  t.ok(!noisy(notes[0].text), 'and it reads clean');
  t.eq(first.reissuedAs, re.songTitle, 'the first act is marked with what followed it');
  t.ok(!first.closed, 'and stays unclosed: its last week is behind the file');
  t.eq(counts(s), ZEROS, 'the ledger counts nothing through the landing');
  t.eq(KP.validateState(s).length, 0, 'the file is valid after the landing');

  const closes = [];
  guard = 0;
  while (!re.closed && guard++ < 8) { closeOf(tick(KP, s)).forEach(n => closes.push(n)); answerAll(KP, s); }
  t.eq(closes.length, 1, 'the reissue closes once');
  t.eq(re.closed.week, g.promoUntil + 1, 'the week its own promotion ends');
  t.ok(closes[0].text.includes('That closes both acts: “' + of + '” landed '), 'and it closes both acts: the first act’s landing word was on file all along');
  t.ok(!/pre-order/.test(closes[0].text), 'the tally has no pre-order bracket for a week nobody read');
  t.ok(!noisy(closes[0].text), 'in clean words');
  t.eq(s.eraLedger.closed + '|' + s.eraLedger.preorderReads, '1|0', 'one close on the ledger, no read');
  t.eq(KP.validateState(s).length, 0, 'and the file is valid at the end');
}

// ---------------------------------------------------------------------------
// the timeline hears it: the close and the reissue's announcement each echo
// through the feed registry, picked by hash, with no draw on the feed's stream
{
  const F = KP.C.FEED;
  const closeEcho = KP.feedReactionFor('eraClosed'), annEcho = KP.feedReactionFor('eraAnnounced');
  t.ok(typeof closeEcho === 'function' && typeof annEcho === 'function', 'the close and the announcement are both in the feed registry');
  // any draw at all is a failure: the handler is handed a stream that throws
  const trap = new Proxy({}, { get(_, k) { throw new Error('the echo drew: rng.' + String(k)); } });
  const VOICES = ['fan', 'casual'];

  // the real week: the letter on the wire is the letter the feed pass reads
  const f = fork();
  const wire = tick(KP, f.s);
  const { s, g } = f;
  const note = closeOf(wire)[0];
  t.ok(note.groupId === g.id && note.verdict === f.rel.closed.verdict, 'the close letter carries what the echo reads: the group and the verdict');
  const said = closeEcho(s, note, trap);
  t.ok(!!said && VOICES.includes(said.persona) && said.text.includes(g.name) && !noisy(said.text), 'the echo is a post in a voice, about the group: ' + said.text.slice(0, 60));
  t.eq(closeEcho(s, note, trap).text, said.text, 'asked twice in one week, it says the same thing');
  const carried = (feed, post) => feed.filter(p => p.week === s.week && p.text === post.text && p.persona === post.persona).length;
  // the feed keeps a week's first posts: releases, storms and teasers lead,
  // then one post at most for each letter on the wire, in the wire's order
  const leads = n => !KP.groups(s).some(x => x.results && x.results.week === s.week) &&
    n + KP.liveDiscourses(s).length + KP.teaserPosts(s).length < F.weeklyMax;
  t.ok(leads(wire.indexOf(note)), 'fixture: fewer posts can lead the closing week than the week holds');
  t.eq(carried(s.feed, said), 1, 'the closing week’s timeline carries it, once');
  s.feed = [];
  KP.feedWeek(s, null, [note]);
  t.eq(carried(s.feed, said), 1, 'and handed the close alone, the feed pass posts it');

  // every verdict has two lines in two voices, picked by the week
  const week0 = s.week;
  const sweep = (salt, n, call) => {
    const by = {};
    for (let w = 1; w <= 40; w++) {
      s.week = w;
      const i = Math.floor(KP.hash01([s.seed, salt, g.id, w].join('|')) * n);
      (by[i] = by[i] || []).push(call());
    }
    s.week = week0;
    return by;
  };
  const one = posts => new Set(posts.map(p => p.persona + '|' + p.text)).size === 1;
  const all = new Set();
  VERDICTS.forEach(v => {
    const by = sweep('eraClosedEcho', 2, () => closeEcho(s, { ind: 'eraClosed', groupId: g.id, verdict: v }, trap));
    t.eq(Object.keys(by).sort().join(','), '0,1', 'fixture: both ' + v + ' lines come up across forty weeks');
    const posts = by[0].concat(by[1]);
    t.ok(posts.every(p => p && VOICES.includes(p.persona) && p.text.includes(g.name) && !noisy(p.text)),
      v + ': every post is in a voice, names the group and reads clean');
    t.ok(one(by[0]) && one(by[1]), v + ': the hash picks the line, the same pick the same line');
    t.ok(by[0][0].text !== by[1][0].text && by[0][0].persona !== by[1][0].persona, v + ': two lines, two voices');
    posts.forEach(p => all.add(p.text));
  });
  t.eq(all.size, 8, 'eight lines in all, none shared between verdicts');
  t.ok(closeEcho(s, { ind: 'eraClosed', groupId: 'nobody', verdict: 'warm' }, trap) === null, 'a close for a group that is not there says nothing');
  t.ok(closeEcho(s, { ind: 'eraClosed', groupId: g.id, verdict: 'lukewarm' }, trap) === null &&
    closeEcho(s, { ind: 'eraClosed', groupId: g.id }, trap) === null, 'and so does a verdict the timeline has no words for');

  // the reissue's announcement: three lines of its own, the same way
  const by = sweep('reissueEcho', 3, () => annEcho(s, { ind: 'eraAnnounced', groupId: g.id, reissue: true }, trap));
  t.eq(Object.keys(by).sort().join(','), '0,1,2', 'fixture: all three reissue lines come up across forty weeks');
  const re = by[0].concat(by[1], by[2]);
  t.ok(re.every(p => p && VOICES.includes(p.persona) && p.text.includes(g.name) && !noisy(p.text)), 'every reissue post is in a voice, names the group and reads clean');
  t.ok(one(by[0]) && one(by[1]) && one(by[2]), 'the hash picks the line');
  t.eq(new Set(re.map(p => p.text)).size, 3, 'three different lines');
  t.ok(re.every(p => /repackage|reissue|same album/i.test(p.text)), 'each about the reissue, none borrowed from a first announcement');
  t.ok(annEcho(s, { ind: 'eraAnnounced', groupId: 'nobody', reissue: true }, trap) === null, 'a reissue for a group that is not there says nothing');
  // an ordinary announcement is untouched: one pick off the feed's own stream
  let draws = 0;
  const plain = annEcho(s, { ind: 'eraAnnounced', groupId: g.id }, { pick(a) { draws++; return a[0]; } });
  t.ok(draws === 1 && /DATE ANNOUNCED/.test(plain.text) && !re.some(p => p.text === plain.text), 'an ordinary announcement still takes its one draw, and its own words');

  // end to end: the lock's letter is a desk letter, read by the next feed pass
  const d = atDoor();
  const r = KP.resolveScene(d.s, d.sc.id, 'anr');
  if (!r.ok) throw new Error('fixture: the reissue refused: ' + r.reason);
  const ann = d.s.inbox.find(n => n.ind === 'eraAnnounced' && n.reissue);
  t.ok(!!ann && ann.fed === false, 'the reissue’s announcement is marked for the timeline');
  d.s.feed = [];
  KP.feedWeek(d.s, null, [ann]);
  const heard = annEcho(d.s, ann, trap);
  t.ok(KP.liveDiscourses(d.s).length + KP.teaserPosts(d.s).length < F.weeklyMax, 'fixture: fewer posts can lead the lock’s week than the week holds');
  t.eq(d.s.feed.filter(p => p.week === d.s.week && p.text === heard.text && p.persona === heard.persona).length, 1,
    'handed the announcement, the feed pass posts the reissue’s line: ' + heard.text.slice(0, 50));
  // the desk's letters queue behind the whole wire, so a loud week can crowd
  // one out: what is promised is that the week's own pass picks it up
  tick(KP, d.s);
  t.ok(!('fed' in ann) && d.s.inbox.includes(ann), 'the week’s own pass reads the letter off the desk and clears the mark');
}

// ---------------------------------------------------------------------------
// the closed broadcast door: a label nobody has heard of runs radio in its
// show slots, and the era is told so, once. The lock works on its own copy of
// the plan. It used to swap the slots in the caller's plan before the till
// could refuse: the retry found no show left to swap, told nothing, and the
// day the shows opened was no news to a label never told they were closed.
{
  const R = KP.C.ROLLOUT;
  const isShow = a => !!(R.ACTIVITIES[a] && R.ACTIVITIES[a].show);
  const shows = ro => ro.reduce((n, wk) => n + wk.filter(isShow).length, 0);
  const onRadio = ro => ro.map(wk => wk.map(a => isShow(a) ? 'radio' : a));
  const told = s => s.inbox.filter(n => n.ind === 'showsClosed');
  const famous = s => Object.keys(s.company.reputation).forEach(k => { s.company.reputation[k] = 80; });
  const TILL = 'Budget cannot cover the record, the marketing AND this rollout. Trim something.';

  const { s, g, plan } = draftedRecord(KP, 'era-119', { door: 'fresh' });
  const till = s.budget;
  t.ok(!KP.showsOpen(s), 'fixture: nobody has heard of this label, and the shows are closed to it');
  t.eq(shows(plan.rollout), 3, 'fixture: the plan asks for three music-show stages');
  t.ok(!isShow('radio') && !!R.ACTIVITIES.radio, 'fixture: radio is a booking, and not a show');
  t.ok(!KP.fameLedger(s).everClosed && told(s).length === 0, 'fixture: nothing has been told yet');
  const asked = JSON.stringify(plan);

  // the till refuses: nothing moves, and nothing is told
  s.budget = 0;
  const before = JSON.stringify(s);
  const no = KP.planDebut(s, plan);
  t.ok(!no.ok, 'an empty till refuses the lock');
  t.eq(no.reason, TILL, 'in the till’s own words');
  t.eq(JSON.stringify(s), before, 'a refused lock changes nothing in the file');
  t.eq(JSON.stringify(plan), asked, 'and nothing in the plan it was handed: the stages are still asked for');
  t.ok(!KP.fameLedger(s).everClosed && told(s).length === 0 && !g.prep, 'a lock that did not happen does not tell the closed door');

  // the same plan, with the money: this is the lock that tells it
  s.budget = till;
  const yes = KP.planDebut(s, plan);
  if (!yes.ok) throw new Error('fixture: the funded lock refused: ' + yes.reason);
  t.eq(told(s).length, 1, 'the lock that happens tells the closed door, once');
  const n = told(s)[0] || { text: '' };   // a missing letter fails by name, not by crash
  t.ok(n.kind === 'industry' && n.priority === 'high' && n.groupId === g.id && n.week === s.week, 'a high letter, for the group, the week of the lock');
  t.ok(n.text.startsWith('The Countdown, Prime Stage, Pop Wave: none returned the calls. No music-show stages this era') &&
    n.text.endsWith('The rollout runs radio instead, and the era will be won on the ground or not at all.') && !noisy(n.text),
    'it names the three shows, and what the era runs instead');
  t.ok(n.fed === false && typeof KP.feedReactionFor('showsClosed') === 'function', 'a desk letter, marked for the timeline, with an echo waiting');
  t.ok(KP.fameLedger(s).everClosed === true, 'and the ledger remembers the door was closed');
  t.eq(JSON.stringify(g.prep.rollout), JSON.stringify(onRadio(PLAN)), 'the era runs radio in every show slot, and no other slot moved');
  t.eq(JSON.stringify(plan), asked, 'the plan handed in still holds what it asked for');
  plan.rollout[3][0] = 'fanSign';
  t.eq(g.prep.rollout[3][0], PLAN[3][0], 'the lock keeps its own copy: an edit to the plan afterwards does not reach the era');
  plan.rollout[3][0] = PLAN[3][0];
  t.eq(KP.validateState(s).length, 0, 'the file is valid');

  // a later lock behind the same door swaps again and says nothing new
  {
    const c = KP.deserialize(KP.serialize(s));
    const cg = c.groups[0];
    cg.prep = null;   // forced: the first lock set aside, the till refilled
    c.budget = till;
    const again = KP.planDebut(c, plan);
    if (!again.ok) throw new Error('fixture: the second lock refused: ' + again.reason);
    t.ok(!KP.showsOpen(c), 'fixture: the door is still closed for the second lock');
    t.eq(JSON.stringify(cg.prep.rollout), JSON.stringify(onRadio(PLAN)), 'a second lock behind the closed door runs radio as well');
    t.eq(told(c).length, 1, 'and the letter is not written twice');
    t.eq(KP.validateState(c).length, 0, 'the file is valid');
  }

  // because it was told, the day the desk calls back is news, once
  famous(s);
  t.ok(KP.showsOpen(s), 'fixture: the name carries now');
  const opened = tick(KP, s).filter(x => x.ind === 'showsOpen');
  t.eq(opened.length, 1, 'the week the shows open, the label that was told they were closed is told they are open');
  const call = opened[0] || { text: '' };
  t.ok(call.priority === 'high' && call.text.startsWith('The Countdown’s booking desk called US this time.') && !noisy(call.text),
    'a high letter, in the booking desk’s words');
  t.eq(KP.fameLedger(s).showsOpenWeek, s.week, 'and the week is dated');
  t.eq(tick(KP, s).filter(x => x.ind === 'showsOpen').length, 0, 'once');
  t.eq(KP.validateState(s).length, 0, 'the file is valid');

  // a slot count the lock refuses is refused before the swap can leak, too
  {
    const q = draftedRecord(KP, 'era-119', { door: 'fresh' });
    q.plan.rollout[0] = ['popWave', 'challenge', 'variety'];
    const heldOut = JSON.stringify(q.plan), was = JSON.stringify(q.s);
    const r = KP.planDebut(q.s, q.plan);
    t.eq(r.ok + '|' + r.reason, 'false|Two bookings a week is the ceiling. They are humans, not content.', 'three bookings in a week are refused');
    t.ok(JSON.stringify(q.plan) === heldOut && JSON.stringify(q.s) === was, 'and that refusal edits neither the plan nor the file');
  }

  // a plan with no stage in it never knocked: no letter, and the opening is dated in silence
  {
    const q = draftedRecord(KP, 'era-119', { door: 'fresh' });
    q.plan.rollout = onRadio(PLAN);
    const r = KP.planDebut(q.s, q.plan);
    if (!r.ok) throw new Error('fixture: the radio plan refused: ' + r.reason);
    t.ok(told(q.s).length === 0 && !KP.fameLedger(q.s).everClosed, 'a plan that asked for no stage is not told about a door it never knocked on');
    famous(q.s);
    const wire = tick(KP, q.s);
    t.ok(wire.filter(x => x.ind === 'showsOpen').length === 0 && KP.fameLedger(q.s).showsOpenWeek === q.s.week,
      'and its opening is dated without a letter: the news belongs to the label that was turned away');
  }

  // the door open: the stages are booked as asked, on a copy all the same, and nothing is told
  {
    const o = draftedRecord(KP, 'era-119');
    t.ok(KP.showsOpen(o.s), 'fixture: the label on the current door is known to the shows');
    const r = KP.planDebut(o.s, o.plan);
    if (!r.ok) throw new Error('fixture: the open-door lock refused: ' + r.reason);
    t.eq(JSON.stringify(o.g.prep.rollout), JSON.stringify(PLAN), 'an open door books the three stages as planned');
    t.ok(o.g.prep.rollout !== o.plan.rollout && o.g.prep.rollout.every((wk, i) => wk !== o.plan.rollout[i]), 'on the lock’s own copy, week by week');
    t.ok(told(o.s).length === 0 && !KP.fameLedger(o.s).everClosed, 'and no closed door is told');
  }
}

t.finish();
