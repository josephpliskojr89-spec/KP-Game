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
// a five-member group with a record locked six weeks out. The engine is
// a parameter: the DOM stub loads its own, and a state belongs to the
// engine that built it.
function lockedRecord(eng, seed, opts) {
  opts = opts || {};
  const s = eng.newGame(seed, null, { legacy: false, door: opts.door || 'current' });
  s.budget = 900;
  const ids = s.roster.slice(0, 5);
  eng.proposeGroup(s, 'ERALINE', ids, eng.roleHints(s, ids.map(i => s.people[i])));
  const g = s.groups[0];
  g.demos = eng.generateDemos(s, eng.rngFor(s), g);
  const proto = JSON.stringify(g.demos[1]);
  const r = eng.planDebut(s, { groupId: g.id, songId: g.demos[0].id, conceptId: g.demos[0].conceptId, promo: 'modest',
    format: opts.format || 'mini', week: s.week + 6, alloc: Object.assign({}, ALLOC), rollout: PLAN.map(w => w.slice()) });
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
    const wire = tick(eng, s);
    wire.filter(n => n.ind === 'preorderWeek').forEach(n => {
      pre.push(n); preWeek = s.week;
      preCount = eng.preorderCount(s, g); preRun = g.prep.pressing.run;
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

t.finish();
