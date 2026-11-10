/* Suite 136 — the truce (v0.11.26, §117: the other side of the wall, part five).
   The first door a head opens. A house that holds a grudge, whose head is
   not a duelist, calls once and offers a truce: hash-timed, never drawn.
   Taken, what the house held is struck from its books, and for a year it
   does not park on our dates and we do not sign anyone it has cut.
   Signing one breaks it. Declined, the head does not call again for two
   years.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   letter fails by name. */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const desk = require('../tools/desk_count');
const KP = loadEngine();
const t = makeT('suite_136_truce');
const W = KP.C.WALL, T = W.TRUCE;

// ---- the kit ------------------------------------------------------------------
const houses = s => KP.signingHouses(s);
const when = w => KP.weekLabel(w).text;
const led = s => s.wallLedger || {};
const counts = s => [led(s).truceCalls, led(s).truces, led(s).truceDeclined, led(s).trucesBroken, led(s).trucesRun].join('|');
const books = r => ((r && r.directed) || []).map(a => a.kind + '@' + a.week).join();
const kinds = r => ((r && r.directed) || []).map(a => a.kind).join();
function forced(obj, key, value, fn) { const was = obj[key]; obj[key] = value; try { return fn(); } finally { obj[key] = was; } }
// every head's weekly chance forced to one value (a duelist's stays what the table says)
const chance = (v, fn) => forced(T.chance, 'steward', v, () => forced(T.chance, 'broker', v, () => forced(T.chance, 'showman', v, fn)));
const lands = n => { const crowd = []; for (let i = 0; i < 9; i++) crowd.push({ kind: 'company', priority: 'high', text: 'crowd ' + i }); return !!(n && n.text) && KP.trimWeekNotes(crowd.concat([n]), KP.C.EVENTS.maxInboxPerWeek).includes(n); };
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
// a world where nothing is between the houses, every head a steward
function world(seed) {
  const s = KP.newGame(seed, null, { legacy: true });
  houses(s).forEach(r => { r.head.temper = 'steward'; r.directed = []; delete r.truce; delete r.truceAsked; });
  return s;
}
// a grudge: a leveraged offer and a lost week, this week (-5)
const grudge = (s, r, w) => { r.directed = [{ week: w != null ? w : s.week, kind: 'weLeveragedTheirOffer' }, { week: w != null ? w : s.week, kind: 'weTookTheWeek' }]; return r; };
// one quiet week: no call unless the fixture forces one
const week = (s, v) => chance(v || 0, () => KP.advanceWeek(s));
const scene = s => (s.scenes || []).find(x => x.kind === 'theTruce') || null;
const def = KP.sceneDef('theTruce');
const note = (s, ind) => (KP.lastTickNotes || []).concat(s.inbox || []).find(n => n.ind === ind) || {};

// ---- A. the shape -------------------------------------------------------------
{
  ['truceWith', 'truceDue', 'takeTruce', 'declineTruce', 'breakTruce', 'truceTerms', 'truceAtRisk'].forEach(k => t.ok(typeof KP[k] === 'function', 'the engine carries KP.' + k));
  t.ok(!!def, 'and the scene');
  t.eq([T.below, T.weeks, T.cooldown, T.answerWeeks].join('|'), '-3|48|96|3', 'a grudge is a regard under -3; a truce runs a year; a head calls once in two; the call waits three weeks');
  t.eq(KP.HEAD_TEMPERS.map(k => k + ' ' + T.chance[k]).join(', '), 'duelist 0, broker 0.05, steward 0.08, showman 0.03', 'a steward calls soonest, and a duelist never');
  t.eq([W.KINDS.weBrokeTheTruce.w, W.KINDS.theyOfferedATruce.w, W.KINDS.theyMadePeace.w].join('|'), '-4|0|1', 'a broken truce weighs four, a declined one nothing, a handshake one');
  t.eq(Object.keys(KP.TRUCE_LINES).sort().join(), 'broker,showman,steward', 'three heads have a line for the call; a duelist has none');
  t.ok(Object.values(KP.TRUCE_LINES).every(l => /^“.{30,}”$/.test(l)) && new Set(Object.values(KP.TRUCE_LINES)).size === 3, 'each a sentence in quotes, no two alike');
  t.eq(KP.truceTerms(), 'they stay off our dates, and we do not sign anyone they have cut', 'the terms are one sentence');
  t.ok(['truceCall', 'truceRan'].every(k => desk.ONE_SHOTS.includes(k)), 'the call and the end of the year are on the list of letters said once');
  const s = world('truce-shape');
  t.eq(counts(s), '0|0|0|0|0', 'the ledger counts truces from zero');
  t.ok(houses(s).every(r => !KP.truceWith(s, r)), 'and a new career opens with none');
}

// ---- B. when a head would call (pure) ----------------------------------------------
{
  const s = world('truce-due');
  const [r0, r1, r2] = houses(s);
  s.week = 200;
  const due = r => chance(1, () => KP.truceDue(s, r));
  t.eq(due(r0), false, 'with nothing on the books nobody calls');
  r0.directed = [{ week: s.week, kind: 'weLeveragedTheirOffer' }];                      // -3 exactly
  t.eq(due(r0), false, 'a house that is cool toward us (-3) does not call');
  r0.directed.push({ week: s.week, kind: 'weDeclinedTheirOffer' });                    // -4
  t.eq(due(r0), true, 'a house holding a grudge (-4) does');
  t.eq(chance(0, () => KP.truceDue(s, r0)), false, 'when the week’s hash says so');
  r0.head.temper = 'duelist';
  t.eq(due(r0), false, 'a duelist never calls');
  r0.head.temper = 'broker';
  t.eq(due(r0), true, 'a broker does');
  r0.head.temper = 'showman';
  t.eq(due(r0), true, 'and a showman');
  r0.founderGrudge = true;
  t.eq(due(r0), false, 'the old house never calls');
  delete r0.founderGrudge;
  r0.truce = { since: s.week - 10, until: s.week + 38 };
  t.eq(due(r0), false, 'a house in a truce with us does not call about one');
  r0.truce.until = s.week - 1;
  t.eq([KP.truceWith(s, r0), due(r0)].join('|'), 'false|true', 'a truce past its year is not in force');
  delete r0.truce;
  r0.truceAsked = s.week - (T.cooldown - 1);
  t.eq(due(r0), false, 'a head who called does not call again inside two years');
  r0.truceAsked = s.week - T.cooldown;
  t.eq(due(r0), true, 'and can at two');
  t.eq(say(() => chance(1, () => KP.truceDue(s, null))), false, 'no house, no call');
  t.eq(say(() => chance(1, () => KP.truceDue(s, { short: 'Show', projectHouse: true, directed: [{ week: 1, kind: 'weLeveragedTheirOffer' }, { week: 1, kind: 'weTookTheWeek' }] }))), false, 'the show has no head to call');
  // the hash is the house's and the week's: about eight weeks in a hundred for a steward
  delete r0.truceAsked;
  r0.head.temper = 'steward';
  let n = 0;
  for (let w = 300; w < 2300; w++) { s.week = w; r0.directed = [{ week: w, kind: 'weLeveragedTheirOffer' }, { week: w, kind: 'weTookTheWeek' }]; if (KP.truceDue(s, r0)) n++; }
  t.ok(n > 120 && n < 200, 'at the table’s chance a steward’s house is due about 8 weeks in 100 (' + n + ' of 2000)');
  r0.head.temper = 'showman';
  let m = 0;
  for (let w = 300; w < 2300; w++) { s.week = w; r0.directed = [{ week: w, kind: 'weLeveragedTheirOffer' }, { week: w, kind: 'weTookTheWeek' }]; if (KP.truceDue(s, r0)) m++; }
  t.ok(m > 30 && m < 90 && m < n, 'a showman’s about 3 (' + m + ')');
  // pure
  s.week = 200; grudge(s, r1);
  const before = KP.serialize(s);
  chance(1, () => KP.truceDue(s, r1));
  t.eq(KP.serialize(s), before, 'asking changes nothing and draws nothing');
  void r2;
}

// ---- C. the call, through the weekly -------------------------------------------------
{
  const s = world('truce-call');
  for (let i = 0; i < 3; i++) week(s);
  const [r0, r1] = houses(s);
  grudge(s, r0);
  // the same week with and without the call: the main stream is where it would have been
  const quiet = KP.deserialize(KP.serialize(s));
  week(quiet, 0);
  week(s, 1);
  t.eq(JSON.stringify(s.rngState), JSON.stringify(quiet.rngState), 'the call is hash-timed: the main stream is where it would have been');
  const sc = scene(s) || {};
  t.eq([sc.company, sc.expiresWeek].join('|'), r0.short + '|' + (s.week + T.answerWeeks), 'the call is on the Desk, from the house that holds the grudge, for three weeks');
  t.ok(!scene(quiet), 'and in the quiet world nobody called');
  t.eq([r0.truceAsked, counts(s)].join('|'), s.week + '|1|0|0|0|0', 'the head is marked as having called, and it is counted');
  const letter = note(s, 'truceCall');
  t.ok((letter.text || '').startsWith(r0.head.name + ' of ' + r0.name + ' called the desk directly') && letter.text.includes(KP.TRUCE_LINES.steward) && letter.text.includes('The offer is a truce for a year: ' + KP.truceTerms() + '. It is on the Desk.'), 'the letter is the head’s, in the temper’s own line, with the terms');
  t.ok(letter.priority === 'critical' && lands(letter), 'it opens a decision: it is critical, and a loud week does not cut it');
  // one call at a time
  grudge(s, r1);
  week(s, 1);
  t.eq((s.scenes || []).filter(x => x.kind === 'theTruce').length, 1, 'a second head does not call while the first is waiting');
  t.eq(def.options(s, sc).map(o => o.id).join(), 'decline,take', 'two answers, and the polite no comes first');
  KP.resolveScene(s, sc.id, 'decline');
  week(s, 1);
  t.eq((scene(s) || {}).company, r1.short, 'answered, the second head calls the next week');
  // each temper's line
  ['broker', 'showman'].forEach(k => {
    const x = world('truce-line-' + k);
    week(x);
    const r = houses(x)[0];
    r.head.temper = k; grudge(x, r);
    week(x, 1);
    t.ok((note(x, 'truceCall').text || '').includes(KP.TRUCE_LINES[k]), 'a ' + k + ' calls with a ' + k + '’s line');
  });
}

// ---- D. the answers ---------------------------------------------------------------------
{
  // the scene's words
  const s = world('truce-body');
  week(s);
  const r = houses(s)[0];
  r.directed = [{ week: s.week - 9, kind: 'theyTookTheWeek' }, { week: s.week - 6, kind: 'weLeveragedTheirOffer' }, { week: s.week - 4, kind: 'theyAmbushed' }, { week: s.week - 2, kind: 'weTookTheWeek' }, { week: s.week - 1, kind: 'weTookTheWeek' }];
  week(s, 1);
  const sc = scene(s) || {};
  const lost = r.directed[4].week;
  t.eq(say(() => def.title(s, sc)), r.short + ' · the truce', 'the scene is titled by the house');
  t.eq(say(() => def.body(s, sc)), r.head.name + ' of ' + r.name + ' is offering a truce for a year: ' + KP.truceTerms() + '. What they hold: ' + r.short + ' lost a head-to-head week to us (' + when(lost) + '), and 2 more.' +
    ' Shake on it and that is struck from the books. Break it, by signing one of theirs, and it goes back on heavier than before.', 'it names the head, the terms, the newest thing they hold and how many more, and what breaking it costs');
  // take it: what they held is struck, the rest stays, and the handshake goes on the books
  const cash = s.budget, trust = s.trust;
  const out = KP.resolveScene(s, sc.id, 'take');
  const until = r.truce ? when(r.truce.until) : 'NO TRUCE';   // a missing truce fails below by name
  t.eq(kinds(r), 'theyTookTheWeek,theyAmbushed,theyMadePeace', 'shaken on: the three things they held are struck; what they did, and the handshake, stay');
  t.eq(JSON.stringify(r.truce), JSON.stringify({ since: s.week, until: s.week + T.weeks }), 'the truce runs a year from this week');
  t.eq([KP.houseRead(s, r).word, KP.houseRead(s, r).grudge].join('|'), 'cordial with us|0', 'the head is cordial again, and holds nothing');
  t.eq([counts(s), s.budget === cash, s.trust === trust].join('|'), '1|1|0|0|0|true|true', 'counted; it costs no money and no trust: its price is its terms');
  const taken = (s.inbox || []).find(n => n.ind === 'truceTaken') || {};
  t.ok(taken.priority === 'critical' && (taken.text || '').includes('A truce with ' + r.short + ', shaken on by ' + r.head.name + ' and this desk. Until ' + until + ' ' + KP.truceTerms() + '.'), 'the letter says who, until when, and the terms');
  t.ok(JSON.stringify(out || {}).includes('Shaken on: a truce until ' + until + '.'), 'and the answer is acknowledged in a line short enough for a toast');
  t.ok(!scene(s), 'the call is off the Desk');
  void 0;
}
{
  // decline: nothing is struck, the head is declined in words, and does not call again for two years
  const s = world('truce-decline');
  week(s);
  const r = houses(s)[0];
  grudge(s, r);
  week(s, 1);
  const sc = scene(s) || {};
  const standing = KP.houseRead(s, r).standing;
  KP.resolveScene(s, sc.id, 'decline');
  t.eq(kinds(r), 'weLeveragedTheirOffer,weTookTheWeek,theyOfferedATruce', 'declined: nothing is struck, and the offer is on the books');
  t.ok(Math.abs(KP.houseRead(s, r).standing - standing) < 1e-9 && !r.truce, 'their regard is what it was, and there is no truce');
  t.eq(counts(s), '1|0|1|0|0', 'counted as declined');
  t.ok(KP.houseLedgerWords(s, r).includes('offered us a truce and was politely declined (' + when(s.week) + ')'), 'the card says so');
  t.eq(r.truceAsked, s.week, 'the head is marked as having called the week it called');
  const asked = typeof r.truceAsked === 'number' ? r.truceAsked : s.week;   // a missing mark fails above, and must not send the week to NaN
  let again = 0;
  for (let i = 0; i < 8; i++) { r.directed = r.directed.filter(a => a.kind !== 'theyOfferedATruce'); grudge(s, r); week(s, 1); if (scene(s)) again++; }
  t.eq(again, 0, 'the head does not call again the next weeks, grudge or no grudge');
  s.week = asked + T.cooldown - 1; grudge(s, r);
  week(s, 1);
  t.eq((scene(s) || {}).company, r.short, 'two years on, it can');
}
{
  // unanswered: the silence is a polite no
  const s = world('truce-silence');
  week(s);
  const r = houses(s)[0];
  grudge(s, r);
  week(s, 1);
  t.ok(!!scene(s), 'fixture: the call is waiting');
  let n = 0;
  while (scene(s) && n++ < 6) week(s);
  t.eq(n, T.answerWeeks + 1, 'the call waits three weeks and is gone the fourth');
  t.eq([kinds(r), counts(s)].join('|'), 'weLeveragedTheirOffer,weTookTheWeek,theyOfferedATruce|1|0|1|0|0', 'unanswered, it is written down as declined');
  t.ok((note(s, 'truceUnanswered').text || '').startsWith('The call from ' + r.head.name + ' went unreturned.'), 'and a letter says the silence was taken for a no');
}
{
  // a house that stops standing while its call waits
  const s = world('truce-gone');
  week(s);
  const r = houses(s)[0];
  grudge(s, r);
  week(s, 1);
  const sc = scene(s) || {};
  s.rivals = s.rivals.filter(x => x !== r);
  t.eq(say(() => def.body(s, sc)), r.short + ' is no longer a house, and the call with it.', 'a house that is gone says so');
  const out = say(() => KP.resolveScene(s, sc.id, 'take'));
  t.ok(typeof out !== 'string' && counts(s) === '1|0|0|0|0', 'and its call can be answered without anything being shaken on (' + (typeof out === 'string' ? out : 'ok') + ')');
  // the walkout is never struck
  const x = world('truce-walkout');
  const old = houses(x)[0];
  old.directed = [{ week: 1, kind: 'weWalkedOut' }, { week: 1, kind: 'weTookTheWeek' }];
  KP.takeTruce(x, old);
  t.eq(kinds(old), 'weWalkedOut,theyMadePeace', 'a handshake strikes what a house held, the walkout excepted');
}

// ---- E. a truce in force ------------------------------------------------------------------
// a locked date worth parking on, every act out of reach (suite_134's fixture)
function field(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'TRUCELINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  g.members.forEach(id => { state.people[id].hype = 40; });
  const date = state.week + 6;
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest', week: date, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  state.rivals.forEach((r, i) => {
    (r.acts || []).forEach(a => { a.lastReleaseWeek = date + 40 - a.cycleWeeks; delete a.announcedWeek; });
    if (r.head) r.head.temper = 'broker';
    r.directed = []; r.prestige = 70 - i * 10;
    delete r.lastAmbushWeek; delete r.ambushCount; delete r.truce; delete r.truceAsked;
  });
  return { state, g, date };
}
const reach = (r, date, off) => { const a = r.acts[0]; a.lastReleaseWeek = date + (off || 2) - a.cycleWeeks; return a; };
const park = (state, g) => { forced(KP.C.WAR, 'ambushChance', 1, () => chance(0, () => KP.advanceWeek(state))); return ((g.prep || {}).clash || {}).company || 'NOBODY'; };
{
  // they stay off our dates
  const alone = field('truce-park-alone');
  const a0 = houses(alone.state)[0];
  reach(a0, alone.date, 2);
  KP.takeTruce(alone.state, a0);
  t.eq(park(alone.state, alone.g), 'NOBODY', 'a house in a truce with us, alone in reach of our date, does not park on it');
  const two = field('truce-park-two');
  const [b0, b1] = houses(two.state);
  reach(b0, two.date, 2); reach(b1, two.date, -2);
  KP.takeTruce(two.state, b0);
  t.eq(park(two.state, two.g), b1.short, 'with another house in reach, the other parks');
  // past its year it can again
  const past = field('truce-park-past');
  const c0 = houses(past.state)[0];
  reach(c0, past.date, 2);
  KP.takeTruce(past.state, c0);
  c0.truce.until = past.state.week;                         // its last week is this one
  t.eq(park(past.state, past.g), c0.short, 'the week after its year it parks like anyone');
}
{
  // the year runs out: said once
  const s = world('truce-ran');
  week(s);
  const r = houses(s)[0];
  KP.takeTruce(s, r);
  const until = r.truce.until;
  s.week = until - 1;
  week(s);
  t.ok(KP.truceWith(s, r) && s.week === until, 'in its last week the truce is in force');
  week(s);
  t.ok(!r.truce && !KP.truceWith(s, r), 'the week after, it is off the file');
  const ran = note(s, 'truceRan');
  t.ok((ran.text || '').startsWith('The truce with ' + r.short + ' ran its year.') && ran.priority === 'critical' && lands(ran), 'a letter says so, once, and a loud week does not cut it');
  t.eq(counts(s), '0|1|0|0|1', 'counted as run');
  week(s);
  t.eq(led(s).trucesRun, 1, 'and it is not said twice');
}
{
  // we do not sign anyone they have cut: signing one breaks it
  const s = world('truce-break');
  week(s);
  const [r0, r1] = houses(s);
  s.budget = 9000;
  s.prospects = s.prospects.slice(0, 2);
  const rng = KP.rngFor(s);
  const [mine, other] = [KP.rivalFloor(s, r0)[0], KP.rivalFloor(s, r1)[0]];
  t.ok(mine && other && KP.cutFromFloor(s, rng, r0, mine) === 'board' && KP.cutFromFloor(s, rng, r1, other) === 'board', 'fixture: a castoff of each house on the board');
  r0.directed = [{ week: s.week, kind: 'weLeveragedTheirOffer' }];
  KP.takeTruce(s, r0);
  const sign = p => forced(KP.C.NETWORK.CASTOFF, 'doneChance', 0, () => KP.signProspect(s, p.id, { answer: 'accept' }));
  // a castoff of another house: nothing happens to the truce
  const one = sign(other);
  t.ok(one && one.ok !== false && KP.truceWith(s, r0) && counts(s) === '0|1|0|0|0', 'signing another house’s castoff leaves the truce standing');
  // theirs: it is over
  const two = sign(mine);
  t.ok(two && two.ok !== false && mine.status === 'trainee', 'fixture: we signed the one they cut');
  t.ok(!r0.truce && !KP.truceWith(s, r0), 'the truce is over');
  t.eq(kinds(r0), 'theyMadePeace,weSignedTheirCastoff,weBrokeTheTruce', 'the signing and the broken truce are both on the books');
  t.eq([KP.houseRead(s, r0).word, counts(s)].join('|'), 'holding a grudge|0|1|0|1|0', 'the head holds a grudge again, heavier than what was struck; counted as broken');
  const letter = (s.inbox || []).find(n => n.ind === 'truceBroken') || {};
  t.ok(letter.priority === 'critical' && (letter.text || '').startsWith(r0.head.name + ' read ' + KP.displayName(mine) + '’s signing photo as an answer. The truce with ' + r0.short + ' is over'), 'a letter says who read the signing as an answer');
  // with no truce, a castoff signing breaks nothing
  t.eq(KP.breakTruce(s, r0.short, mine), null, 'there is nothing left to break');
  t.eq(led(s).trucesBroken, 1, 'and nothing more is counted');
  t.eq(say(() => KP.breakTruce(s, 'NoSuchHouse', mine)), null, 'a house that does not stand has no truce to break');
}

// ---- F. the card, the board, the Desk ---------------------------------------------------------
{
  const s = world('truce-ui');
  week(s);
  const [r0, r1] = houses(s);
  s.budget = 9000;
  s.prospects = s.prospects.slice(0, 2);
  const rng = KP.rngFor(s);
  const [mine, other] = [KP.rivalFloor(s, r0)[0], KP.rivalFloor(s, r1)[0]];
  KP.cutFromFloor(s, rng, r0, mine); KP.cutFromFloor(s, rng, r1, other);
  KP.takeTruce(s, r0);
  grudge(s, r1);
  week(s, 1);
  const sc = scene(s) || {};
  t.eq(sc.company, r1.short, 'fixture: the second house’s head has called');
  const D = dom.load();
  const { App, el } = D;
  const render = (tab, sub) => { App.state = s; App.mode = 'game'; App.tab = tab; App.view = null; if (sub) { App.industrySub = sub; App.talentSub = sub; } App.render(); return el('screen').innerHTML; };
  let html = render('industry', 'scene');
  t.ok(html.includes('<div class="rv-truce"') && html.includes('>Truce until ' + when(r0.truce.until) + ': ' + KP.truceTerms() + '.</div>'), 'the card of a house in a truce says until when, and the terms');
  t.eq((html.match(/class="rv-truce"/g) || []).length, 1, 'and only that card');
  App.talentSub = 'board';
  html = render('talent', 'board');
  t.ok(html.includes('<span class="chip hot">signing breaks the truce with ' + r0.short + '</span>'), 'on the board, the one that house cut is marked: signing breaks the truce');
  t.eq((html.match(/signing breaks the truce with/g) || []).length, 1, 'and nobody else is');
  html = render('desk');
  t.ok(html.includes(r1.head.name + ' of ' + r1.name + ' is offering a truce for a year') && html.indexOf('data-opt="decline"') > -1 && html.indexOf('data-opt="decline"') < html.indexOf('data-opt="take"'), 'the Desk carries the call with its two answers, the polite no first');
  // who is at risk (pure)
  t.eq([(KP.truceAtRisk(s, mine) || {}).short, KP.truceAtRisk(s, other), KP.truceAtRisk(s, null)].join('|'), r0.short + '||', 'the one a house in a truce cut puts it at risk; nobody else does');
  const ours = Object.assign({}, mine, { castoffFrom: s.company.short });
  t.eq(KP.truceAtRisk(s, ours), null, 'someone we cut ourselves breaks nobody’s truce');
  // the signing sheet says it before the pen does, and the pen does it
  render('talent', 'board');
  D.click({ action: 'sign', id: other.id });
  t.ok(!el('modal-root').innerHTML.includes('sign-truce'), 'the signing sheet for another house’s castoff says nothing of a truce');
  D.click({ action: 'close-modal' });
  D.click({ action: 'sign', id: mine.id });
  const sheet = el('modal-root').innerHTML;
  t.ok(sheet.includes('<div class="sign-truce"') && sheet.includes('breaks the truce with ' + r0.short + '. It goes back on their books heavier than what the truce struck.'), 'the signing sheet for the one that house cut says what signing does');
  forced(KP.C.NETWORK.CASTOFF, 'doneChance', 0, () => {
    forced(D.KP.C.NETWORK.CASTOFF, 'doneChance', 0, () => {
      D.click({ action: 'sign-confirm', id: mine.id });
      if (/data-action="sign-terms"/.test(el('modal-root').innerHTML)) D.click({ action: 'sign-terms', id: mine.id });
    });
  });
  t.ok(mine.status === 'trainee' && !r0.truce && kinds(r0).endsWith('weSignedTheirCastoff,weBrokeTheTruce'), 'signed through the sheet, the truce is over and both acts are on the books (' + mine.status + ')');
  // a truce past its year, still on the file until the week turns, is not shown
  r1.truce = { since: s.week - 60, until: s.week - 1 };
  t.ok(!render('industry', 'scene').includes('class="rv-truce"'), 'a truce past its year is not on the card');
}

// ---- G. old saves and the tools ----------------------------------------------------------------
{
  const s = world('truce-old');
  const old = JSON.parse(KP.serialize(s));
  old.version = '0.11.25';
  ['truceCalls', 'truces', 'truceDeclined', 'trucesBroken', 'trucesRun'].forEach(k => { delete old.wallLedger[k]; });
  const back = KP.deserialize(JSON.stringify(old));
  t.eq([counts(back), back.version].join('|'), '0|0|0|0|0|' + KP.C.VERSION, 'an old file opens with the truces counted from zero, at this version');
  // a truce survives a reload
  const live = world('truce-reload');
  KP.takeTruce(live, houses(live)[0]);
  const again = KP.deserialize(KP.serialize(live));
  t.eq(JSON.stringify(houses(again)[0].truce), JSON.stringify(houses(live)[0].truce), 'a truce is on the file, and comes back with it');
  const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const h = read('tools/harness.js'), l = read('tools/audit_longhaul.js');
  t.ok(h.includes("console.log('the truce: ") && h.includes('truceCalled:') && h.includes("sc.kind === 'theTruce'"), 'the census prints the truce’s line, holds bands on it, and its bot answers the call');
  t.ok(l.includes(', truce calls ') && l.includes('parked on a date inside its truce'), 'the long haul carries it on each scenario’s line, with its flags');
}

t.finish();
