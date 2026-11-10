/* Suite 135 — the letterhead (v0.11.25, §116: the other side of the wall, part four).
   The second roll the books weigh: which house calls one of our staff
   away. Every house is in reach, so it is a weighted draw on the one
   number that was always drawn: what a house holds against us and its
   head's temper raise its weight. The scene names the head and says why
   this house; what we answer goes on its books. The offer is signed by
   the head and carries one line in the head's own hand.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   letter fails by name. */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const KP = loadEngine();
const t = makeT('suite_135_letterhead');
const W = KP.C.WALL;

// ---- the kit ------------------------------------------------------------------
const houses = s => KP.signingHouses(s);
const when = w => KP.weekLabel(w).text;
const led = s => s.wallLedger || {};
const calls = s => [led(s).calls, led(s).callsBooks, led(s).callsTemper].join('|');
const books = r => ((r && r.directed) || []).map(a => a.kind + '@' + a.week).join();
function forced(obj, key, value, fn) { const was = obj[key]; obj[key] = value; try { return fn(); } finally { obj[key] = was; } }
// a debuted group with a road manager the industry would call about; every
// head a broker... set by each fixture; nothing on anybody's books
function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'LETTERLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest', week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  forced(KP.C.WAR, 'ambushChance', 0, () => { while (!g.debuted && guard++ < 10) KP.advanceWeek(state); });
  guard = 0;
  while (!g.manager && guard++ < 3) KP.advanceWeek(state);
  state.budget = 500;
  g.popularity = 60;
  if (g.manager) g.manager.since = state.week - 30;
  state.rivals.forEach(r => { if (r.head) r.head.temper = 'showman'; r.directed = []; });   // showman: no lean on a call
  state.seatPoachQuiet = 0;
  state.scenes = (state.scenes || []).filter(x => x.kind !== 'seatPoach');
  Object.keys(state.wallLedger).forEach(k => { if (/^calls/.test(k)) state.wallLedger[k] = 0; });
  return { state, g };
}
// the road manager's call, with the roll forced; the scene it opened
function managerCall(state, g) {
  let sc = null, guard = 0;
  forced(KP.C.HIRES.MANAGER, 'poachChance', 1, () => forced(KP.C.HIRES, 'poachChance', 0, () => {
    while (!sc && guard++ < 4) { KP.advanceWeek(state); sc = (state.scenes || []).find(x => x.kind === 'seatPoach' && x.groupId === g.id) || null; }
  }));
  return sc || {};
}
const def = KP.sceneDef('seatPoach');
const body = (s, sc) => { try { return def.body(s, sc); } catch (e) { return 'threw: ' + e.message; } };
const hand = (s, r) => { try { return KP.offerHand(s, r); } catch (e) { return 'threw: ' + e.message; } };
// a stream that always says u, and writes down what it was asked
const stub = (u, log) => ({
  next: () => { log.push('next'); return u; },
  range: (lo, hi) => { log.push('range'); return lo + u * (hi - lo); },
  int: (lo, hi) => { log.push('int'); return Math.floor(lo + u * (hi - lo + 1)); },
  chance: p => { log.push('chance:' + p); return u < p; },
  pick: arr => { log.push('pick'); return arr[Math.floor(u * arr.length)]; },
  state: () => 0,
});
// the hires week alone, on a given stream, with the manager's roll forced and the chair's off
const hiresWeek = (state, rng) => forced(KP.C.HIRES.MANAGER, 'poachChance', 1, () => forced(KP.C.HIRES, 'poachChance', 0, () => {
  const inbox = [];
  KP.weeklyPipeline([]).filter(p => p.name === 'hires').forEach(p => p.fn(state, rng, inbox, [], KP.groups(state)));
  return { inbox, sc: (state.scenes || []).find(y => y.kind === 'seatPoach') || {} };
}));

// ---- A. the shape -------------------------------------------------------------
{
  ['callingHouse', 'callHouseOf', 'callOpened', 'signedBy', 'offerHand'].forEach(k => t.ok(typeof KP[k] === 'function', 'the engine carries KP.' + k));
  t.eq(KP.HEAD_TEMPERS.map(k => k + ' ' + W.CALL_LEAN[k]).join(', '), 'duelist 1, broker 2, steward -2, showman 0', 'each temper leans on a call as §116 says');
  t.eq([W.callPerPoint, W.callFloor].join('|'), '0.5|0.25', 'half a point of weight for a point of motive, and a floor');
  t.eq([W.KINDS.theyHiredOurStaff.w, W.KINDS.weKeptOurStaff.w].join('|'), '1|-1', 'a hire warms them; being outbid cools them');
  t.eq(Object.keys(KP.OFFER_LINES).sort().join(), KP.HEAD_TEMPERS.slice().sort().join(), 'the offer has a line for each temper');
  t.ok(Object.values(KP.OFFER_LINES).every(l => /^“.{20,}”$/.test(l)) && new Set(Object.values(KP.OFFER_LINES)).size === 4, 'each a sentence in quotes, no two alike');
}

// ---- B. the weighted draw (pure) ---------------------------------------------------
{
  const s = KP.newGame('letter-draw', null, { legacy: true });
  const hs = houses(s);
  t.ok(hs.length >= 3, 'fixture: three houses (' + hs.length + ')');
  hs.forEach(r => { r.head.temper = 'showman'; r.directed = []; });
  const pick = u => (KP.callingHouse(s, hs, u) || {}).short;
  // with nothing between the houses, the draw picks who it always picked
  const us = [0, 0.1, 0.2, 0.33, 0.34, 0.5, 0.66, 0.67, 0.9, 0.999];
  t.eq(us.map(pick).join(), us.map(u => hs[Math.floor(u * hs.length)].short).join(), 'with every weight equal the draw picks the house it always picked');
  // a broker is twice as likely as a showman: weights 2, 1, 1
  hs[0].head.temper = 'broker';
  const share = () => { const n = {}; for (let i = 0; i < 1000; i++) { const k = pick((i + 0.5) / 1000); n[k] = (n[k] || 0) + 1; } return hs.map(r => n[r.short] || 0); };
  t.eq(share().slice(0, 3).join(), '500,250,250', 'a broker’s house is called from twice as often as a showman’s');
  // a steward sits on the floor: weights 0.25, 1, 1
  hs[0].head.temper = 'steward';
  t.eq(share().slice(0, 3).join(), '111,445,444', 'a steward’s house a quarter as often');
  // spite counts: two points against us are worth a broker's temper
  hs[0].head.temper = 'showman';
  hs[0].directed = [{ week: s.week, kind: 'weTookTheWeek' }];
  t.eq(share().slice(0, 3).join(), '500,250,250', 'a house with a lost week on its books is called from as often as a broker’s');
  hs[0].directed = [{ week: s.week, kind: 'weLeveragedTheirOffer' }, { week: s.week, kind: 'weTookTheWeek' }, { week: s.week, kind: 'weDeclinedTheirOffer' }];
  t.eq(share().slice(0, 3).join(), '667,166,167', 'six points against us: four times a showman’s weight');
  // warmth is not weighed
  hs[0].directed = [{ week: s.week, kind: 'theyTookTheWeek' }, { week: s.week, kind: 'theyTookTheWeek' }];
  t.eq(share().slice(0, 3).join(), '333,334,333', 'a house that is warm toward us is neither more nor less likely');
  hs[0].directed = [];
  // pure, and safe at the edges
  const before = KP.serialize(s);
  pick(0.4);
  t.eq(KP.serialize(s), before, 'the draw reads and writes nothing');
  t.eq(KP.callingHouse(s, [], 0.4), null, 'no houses, nobody calls');
  t.eq(pick(0.9999999), hs[hs.length - 1].short, 'the top of the draw is the last house');
}

// ---- C. the call, through the weekly -------------------------------------------------
{
  // the one draw: the old pick took one number from the stream, and so does this
  const { state } = debuted('letter-stream');
  const log = [];
  const out = hiresWeek(state, stub(0.01, log));
  t.ok(!!out.sc.rivalName, 'fixture: the call came');
  t.ok(log.includes('chance:1'), 'fixture: the manager’s roll was the forced one');
  t.eq(log.slice(log.lastIndexOf('chance:1') + 1).join(), 'next', 'after the roll, who calls is one number from the main stream, as it always was, and nothing more');
  // the weighing is the one in the weekly: the draw says the first house, the books say the last
  const w = debuted('letter-weighed');
  const hs = houses(w.state);
  hs.forEach(r => { r.head.temper = 'steward'; });
  const sore = hs[hs.length - 1];
  sore.head.temper = 'showman';
  sore.directed = [{ week: w.state.week, kind: 'weTookTheWeek' }];
  const plain = debuted('letter-weighed');
  const p0 = forced(W, 'callFloor', 0, () => hiresWeek(plain.state, stub(0.01, [])));
  const w0 = forced(W, 'callFloor', 0, () => hiresWeek(w.state, stub(0.01, [])));
  t.eq([p0.sc.rivalShort, w0.sc.rivalShort].join('|'), houses(plain.state)[0].short + '|' + sore.short, 'on the same draw the first house calls when nothing is between the houses, and the house with a lost week on its books when the rest are stewards');
}
{
  // a house with something against us calls: the scene names its head and says why
  const { state, g } = debuted('letter-books');
  const hs = houses(state);
  hs.forEach(r => { r.head.temper = 'steward'; });                       // on the floor, all of them
  const sore = hs[1];
  sore.head.temper = 'showman';
  sore.directed = [{ week: state.week - 3, kind: 'weLeveragedTheirOffer' }, { week: state.week - 2, kind: 'weTookTheWeek' }, { week: state.week - 1, kind: 'weTookTheWeek' }];
  // weights: 0.25, 4.5, 0.25: the sore house takes the draw unless it lands in a twentieth at either end
  const mgr = g.manager.name;
  const sc = managerCall(state, g);
  t.ok(sc.rivalShort === sore.short || sc.rivalShort === hs[0].short || sc.rivalShort === hs[2].short, 'fixture: a house called (' + sc.rivalShort + ')');
  const from = houses(state).find(r => r.short === sc.rivalShort) || { head: {} };
  t.eq(sc.rivalName, from.name, 'the scene carries the house’s name and its short');
  const said = KP.parkWhyText(state, from, sc.why);
  if (from === sore) {
    t.eq(JSON.stringify(sc.why), JSON.stringify({ by: 'books', kind: 'weLeveragedTheirOffer', week: sore.directed[0].week }), 'the scene keeps the reason: the heaviest thing on that house’s books');
    t.ok(body(state, sc).startsWith(sore.head.name + ' of ' + sore.name + ' wants ' + mgr) && body(state, sc).endsWith(' ' + said) && /has not forgotten: /.test(said), 'the scene names the head, and ends with why this house');
    t.eq(calls(state), '1|1|0', 'counted: one call, for the books');
  } else {
    t.ok(sc.why === undefined && body(state, sc).startsWith(from.head.name + ' of ' + from.name + ' wants ' + mgr), 'a steward’s house with nothing against us calls for no reason the scene can give');
    t.eq(calls(state), '1|0|0', 'counted: one call');
  }
  t.ok((KP.lastTickNotes || []).some(n => (n.text || '').includes(mgr + ' got an offer from ' + from.head.name + ' of ' + from.name)), 'the letter names the head too');
}
{
  // the reason on the scene, each kind, with the call made by hand
  const { state, g } = debuted('letter-why');
  const [r0, r1, r2] = houses(state);
  r0.head.temper = 'broker';
  let why = KP.callOpened(state, r0);
  t.eq(JSON.stringify(why), JSON.stringify({ by: 'temper' }), 'a broker with nothing on the books calls on temper');
  KP.openScene(state, { kind: 'seatPoach', groupId: g.id, rivalName: r0.name, rivalShort: r0.short, why, expiresWeek: state.week + 2 });
  let sc = state.scenes.find(x => x.kind === 'seatPoach');
  t.ok(body(state, sc).endsWith(' ' + r0.head.name + ' is a broker, who believes every problem is a trade nobody has priced yet.'), 'and the scene says so, in the temper’s own sentence');
  state.scenes = state.scenes.filter(x => x.kind !== 'seatPoach');
  r1.head.temper = 'duelist';
  t.eq(JSON.stringify(KP.callOpened(state, r1)), JSON.stringify({ by: 'temper' }), 'a duelist leans on a call too');
  r2.head.temper = 'showman';
  t.eq(KP.callOpened(state, r2), null, 'a showman does not, and a showman with nothing on the books gives no reason');
  r2.head.temper = 'steward';
  r2.directed = [{ week: state.week, kind: 'weKeptOurStaff' }];
  t.eq((KP.callOpened(state, r2) || {}).by, 'books', 'a steward with something against us has one');
  t.eq(calls(state), '4|1|2', 'counted: four calls opened, one for the books, two on temper');
  t.eq(KP.callOpened(state, null), null, 'no house, no call opened');
  t.eq(led(state).calls, 4, 'and none counted');
}
{
  // the answers go on the books: the road manager
  const { state, g } = debuted('letter-answers');
  const [r0, r1] = houses(state);
  const open = r => { state.scenes = (state.scenes || []).filter(x => x.kind !== 'seatPoach'); KP.openScene(state, { kind: 'seatPoach', groupId: g.id, rivalName: r.name, rivalShort: r.short, expiresWeek: state.week + 2 }); return state.scenes.find(x => x.kind === 'seatPoach'); };
  let sc = open(r0);
  KP.resolveScene(state, sc.id, 'raise');
  t.eq(books(r0), 'weKeptOurStaff@' + state.week, 'matched: the house that called was outbid, and it is on its books');
  t.eq(KP.houseLedgerWords(state, r0), r0.head.name + ' is even with us. On the books: called one of our staff and was outbid (' + when(state.week) + ').', 'in the card’s words');
  t.eq(books(r1), '', 'and on nobody else’s');
  sc = open(r1);
  KP.resolveScene(state, sc.id, 'walk');
  t.eq(books(r1), 'theyHiredOurStaff@' + state.week, 'wished well: the house hired one of our staff away');
  t.eq(KP.houseRead(state, r1).word, 'cordial with us', 'which warms it');
  // unanswered: the manager signs elsewhere, and that is a hire
  let guard = 0;
  while (!g.manager && guard++ < 3) KP.advanceWeek(state);
  t.ok(!!g.manager, 'fixture: a new road manager');
  r0.directed = [];
  state.scenes = (state.scenes || []).filter(x => x.kind !== 'seatPoach');
  KP.openScene(state, { kind: 'seatPoach', groupId: g.id, rivalName: r0.name, rivalShort: r0.short, expiresWeek: state.week });
  forced(KP.C.HIRES.MANAGER, 'poachChance', 0, () => forced(KP.C.HIRES, 'poachChance', 0, () => { KP.advanceWeek(state); KP.advanceWeek(state); }));
  t.ok(!(state.scenes || []).some(x => x.kind === 'seatPoach'), 'fixture: the window closed unanswered');
  t.eq((r0.directed || []).map(a => a.kind).join(), 'theyHiredOurStaff', 'unanswered, the manager signs there: a hire, on that house’s books');
}
{
  // the answers go on the books: a chair in the building
  const { state } = debuted('letter-seat');
  const [r0, r1, r2] = houses(state);
  const seat = id => { state.seats = state.seats || {}; state.seats[id] = { id: 'lh' + id, name: 'Byun Yeo-reum', tier: 'known', seatId: id, style: 'drill', warmth: 50, candor: 50, since: 1, resume: [] }; };
  const open = (r, id) => { state.scenes = (state.scenes || []).filter(x => x.kind !== 'seatPoach'); KP.openScene(state, { kind: 'seatPoach', seatId: id, rivalName: r.name, rivalShort: r.short, expiresWeek: state.week + 2 }); return state.scenes.find(x => x.kind === 'seatPoach'); };
  seat('dance');
  let sc = open(r0, 'dance');
  t.ok(body(state, sc).includes('Byun Yeo-reum got the call — ' + r0.head.name + ' of ' + r0.name + ', better title'), 'a chair’s call names the head as well');
  KP.resolveScene(state, sc.id, 'raise');
  t.eq(books(r0), 'weKeptOurStaff@' + state.week, 'a chair kept: the house was outbid');
  sc = open(r1, 'dance');
  KP.resolveScene(state, sc.id, 'walk');
  t.eq(books(r1), 'theyHiredOurStaff@' + state.week, 'a chair that goes: the house hired it away');
  t.ok(!state.seats.dance, 'fixture: the chair is open');
  seat('vocal');
  KP.openScene(state, { kind: 'seatPoach', seatId: 'vocal', rivalName: r2.name, rivalShort: r2.short, expiresWeek: state.week });
  forced(KP.C.HIRES.MANAGER, 'poachChance', 0, () => forced(KP.C.HIRES, 'poachChance', 0, () => { KP.advanceWeek(state); KP.advanceWeek(state); }));
  t.eq((r2.directed || []).map(a => a.kind).join(), 'theyHiredOurStaff', 'a chair’s call left unanswered is a hire too');
  // an answer for a chair already empty records nothing
  const acts0 = led(state).acts;
  KP.openScene(state, { kind: 'seatPoach', seatId: 'anr-nobody', rivalName: r0.name, rivalShort: r0.short, expiresWeek: state.week + 2 });
  const ghost = state.scenes.find(x => x.kind === 'seatPoach' && x.seatId === 'anr-nobody');
  KP.resolveScene(state, ghost.id, 'walk');
  t.eq(led(state).acts, acts0, 'a call about a chair that had already emptied goes on nobody’s books');
}
{
  // a scene from an older version: no short, no reason; the name finds the house
  const { state, g } = debuted('letter-old-scene');
  const [r0] = houses(state);
  KP.openScene(state, { kind: 'seatPoach', groupId: g.id, rivalName: r0.name, expiresWeek: state.week + 2 });
  const sc = state.scenes.find(x => x.kind === 'seatPoach');
  t.ok(body(state, sc).startsWith(r0.head.name + ' of ' + r0.name + ' wants ') && !/has not forgotten|, who /.test(body(state, sc)), 'an older scene reads with the head’s name and no reason');
  KP.resolveScene(state, sc.id, 'raise');
  t.eq((r0.directed || []).map(a => a.kind).join(), 'weKeptOurStaff', 'and its answer still goes on the books of the house it names');
  // a house the scene names that no longer stands
  KP.openScene(state, { kind: 'seatPoach', groupId: g.id, rivalName: 'Aozora Records', expiresWeek: state.week + 2 });
  const gone = state.scenes.find(x => x.kind === 'seatPoach');
  const acts0 = led(state).acts;
  t.ok(body(state, gone).startsWith('Aozora Records wants '), 'a house that no longer stands is named as the scene names it');
  KP.resolveScene(state, gone.id, 'raise');
  t.eq(led(state).acts, acts0, 'and its answer goes on nobody’s books');
}

// ---- D. the offer is signed ------------------------------------------------------------
{
  const s = KP.newGame('letter-offer', null, { legacy: true });
  const RF = KP.C.RISEFALL;
  const suitor = houses(s)[0];
  KP.HEAD_TEMPERS.forEach(k => {
    suitor.head.temper = k;
    t.eq(KP.offerHand(s, suitor), suitor.head.name + ' signed it, and added one line by hand: ' + KP.OFFER_LINES[k], 'a ' + k + ' signs the offer with a ' + k + '’s line');
  });
  t.eq(hand(s, { name: 'The Show', short: 'Show', projectHouse: true }), '', 'a house with no head signs nothing');
  t.eq(hand(s, null), '', 'nor does no house');
  t.eq([KP.signedBy(s, suitor), KP.signedBy(s, { name: 'The Show', short: 'Show', projectHouse: true }), KP.signedBy(s, null)].join('|'), suitor.head.name + ' of ' + suitor.name + '|The Show|a rival house', 'a signature is the head’s name before the house’s, or the house’s alone, or nobody’s');
  // through the weekly: the letter and the scene
  suitor.head.temper = 'broker';
  let guard = 0, sc = null;
  while (!sc && guard++ < 120) {
    suitor.prestige = Math.max(suitor.prestige, RF.offerPrestige + 4); s.trust = Math.max(s.trust, RF.offerTrust + 10); s.budget = Math.max(s.budget, 900);
    (s.scenes || []).slice().forEach(x => { if (x.kind !== 'theOffer') { const d = KP.sceneDef(x.kind); if (d) KP.resolveScene(s, x.id, d.options(s, x)[0].id); } });
    KP.advanceWeek(s);
    sc = (s.scenes || []).find(x => x.kind === 'theOffer') || null;
  }
  t.ok(!!sc, 'fixture: the offer came (' + guard + ' weeks)');
  const from = houses(s).find(r => r.short === (sc || {}).company) || suitor;
  const letter = (KP.lastTickNotes || []).find(n => /A courier envelope/.test(n.text || '')) || {};
  t.ok((letter.text || '').includes(from.name + '’s letterhead, ' + from.head.name + '’s signature: they want YOU.'), 'the letter carries the head’s signature');
  const text = sc ? KP.sceneDef('theOffer').body(s, sc) : '';
  t.ok(text.includes('that is how these deals work. ' + KP.offerHand(s, from) + ' The industry has exactly two respectable answers'), 'and the scene carries the line in the head’s hand');
}

// ---- E. the Desk shows it, and old saves --------------------------------------------------
{
  const { state, g } = debuted('letter-desk');
  const [r0] = houses(state);
  r0.head.temper = 'broker';
  const why = KP.callOpened(state, r0);
  KP.openScene(state, { kind: 'seatPoach', groupId: g.id, rivalName: r0.name, rivalShort: r0.short, why, expiresWeek: state.week + 2 });
  const sc = state.scenes.find(x => x.kind === 'seatPoach');
  const { App, el } = dom.load();
  App.state = state; App.mode = 'game'; App.tab = 'desk'; App.view = null; App.render();
  const html = el('screen').innerHTML;
  const said = body(state, sc);
  t.ok(html.includes(r0.head.name + ' of ' + r0.name + ' wants ') && html.includes('is a broker, who believes every problem is a trade nobody has priced yet.'), 'the Desk’s scene names the head and gives the reason (' + said.slice(-60) + ')');
  // an old file opens with the new counts at zero
  const old = JSON.parse(KP.serialize(state));
  old.version = '0.11.24';
  ['calls', 'callsBooks', 'callsTemper'].forEach(k => { delete old.wallLedger[k]; });
  const back = KP.deserialize(JSON.stringify(old));
  t.eq([calls(back), back.version].join('|'), '0|0|0|' + KP.C.VERSION, 'an old file opens with the calls counted from zero, at this version');
  const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const h = read('tools/harness.js'), l = read('tools/audit_longhaul.js');
  t.ok(h.includes("console.log('the letterhead: ") && h.includes('callReason:'), 'the census prints the letterhead’s line and holds a band on it');
  t.ok(l.includes(', calls ') && l.includes('callsBooks'), 'the long haul carries it on each scenario’s line');
}

t.finish();
