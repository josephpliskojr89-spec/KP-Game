/* Suite 134 — the weight (v0.11.24, §115: the other side of the wall, part three).
   What the books weigh, one roll at a time. The first: which house parks
   a comeback on our date. The house with the most against us today goes
   first, its head's temper leans on that, and with nothing between the
   houses the most prestigious does it, as it always did. Whether a date
   is parked on at all is not changed. The letter and the Studio say why.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   letter fails by name. */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const KP = loadEngine();
const t = makeT('suite_134_weight');
const W = KP.C.WALL;

// ---- the kit ------------------------------------------------------------------
const houses = s => KP.signingHouses(s);
const when = w => KP.weekLabel(w).text;
const led = s => s.wallLedger || {};
const counts = s => [led(s).parks, led(s).parksBooks, led(s).parksTemper, led(s).parksMoved].join('|');
function forced(obj, key, value, fn) { const was = obj[key]; obj[key] = value; try { return fn(); } finally { obj[key] = was; } }
const lands = n => { const crowd = []; for (let i = 0; i < 9; i++) crowd.push({ kind: 'company', priority: 'high', text: 'crowd ' + i }); return !!(n && n.text) && KP.trimWeekNotes(crowd.concat([n]), KP.C.EVENTS.maxInboxPerWeek).includes(n); };
// a locked date worth parking on; every act of every house out of reach,
// every head a broker, nothing on anybody's books (suite_030's fixture)
function field(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'WEIGHLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  g.members.forEach(id => { state.people[id].hype = 40; });
  const week = state.week + 6;
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest', week, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  state.rivals.forEach((r, i) => {
    (r.acts || []).forEach(a => { a.lastReleaseWeek = week + 40 - a.cycleWeeks; delete a.announcedWeek; });
    if (r.head) r.head.temper = 'broker';
    r.directed = [];
    r.prestige = 70 - i * 10;                                // the first house is the grandest
    delete r.lastAmbushWeek; delete r.ambushCount;
  });
  return { state, g, week };
}
// put a house's first act in shifting distance of the date
const reach = (r, week, off) => { const a = r.acts[0]; a.lastReleaseWeek = week + (off || 2) - a.cycleWeeks; return a; };
// one week with the roll forced; what parked, and what the letter said
function park(state, g) {
  forced(KP.C.WAR, 'ambushChance', 1, () => KP.advanceWeek(state));
  const clash = (g.prep || {}).clash || {};
  const note = (KP.lastTickNotes || []).find(n => n.ind === 'ambush') || {};
  return { company: clash.company || 'NOBODY', why: clash.why, text: note.text || '', note };
}
const PLAIN = 'Scheduling coincidences do not exist in this industry. The desk options are in the Studio';
// a sentence, or the name of what broke
const say = (s, r, why) => { try { return KP.parkWhyText(s, r, why); } catch (e) { return 'threw: ' + e.message; } };

// ---- A. the shape -------------------------------------------------------------
{
  ['houseMotive', 'parkWhy', 'parkWhyText'].forEach(k => t.ok(typeof KP[k] === 'function', 'the engine carries KP.' + k));
  t.eq(KP.HEAD_TEMPERS.map(k => k + ' ' + W.AMBUSH_LEAN[k]).join(', '), 'duelist 2, broker 0, steward -2, showman 1', 'each temper leans as §115 says');
  t.eq(Object.keys(W.AMBUSH_LEAN).sort().join(), KP.HEAD_TEMPERS.slice().sort().join(), 'and the table knows the four tempers and nothing else');
  const { state } = field('weigh-shape');
  t.ok(houses(state).length >= 3 && houses(state).every(r => (r.acts || []).length >= 1), 'fixture: three houses, each with an act (' + houses(state).length + ')');
  t.eq(counts(state), '0|0|0|0', 'the ledger counts parked dates from zero');
}

// ---- B. the motive (pure) -------------------------------------------------------
{
  const { state } = field('weigh-motive');
  const r = houses(state)[0];
  state.week = 300;
  const mo = () => KP.houseMotive(state, r);
  const book = list => { r.directed = list.map(x => ({ week: state.week - (x[1] || 0), kind: x[0] })); return mo(); };
  t.eq(JSON.stringify(book([])), JSON.stringify({ spite: 0, lean: 0, score: 0, because: null }), 'a broker with empty books has no motive');
  const leans = KP.HEAD_TEMPERS.map(k => { r.head.temper = k; return mo().score; });
  r.head.temper = 'broker';
  t.eq(leans.join(), '2,0,-2,1', 'with empty books the temper is the whole of it');
  let m = book([['weTookTheWeek']]);
  t.eq([m.spite, m.score, JSON.stringify(m.because)].join('|'), '2|2|' + JSON.stringify({ kind: 'weTookTheWeek', week: 300 }), 'a week we took counts point for point, and is what it is about');
  m = book([['weTookTheWeek', W.halfLifeWeeks]]);
  t.ok(Math.abs(m.spite - 1) < 1e-9, 'half of it a half-life later: the motive is what they hold today');
  m = book([['theyTookTheWeek'], ['theyTookTheWeek'], ['theySignedOurAlumna']]);
  t.eq([m.spite, m.score, String(m.because)].join('|'), '0|0|null', 'a house that is warm toward us has no spite, and is not held back either');
  m = book([['weDeclinedTheirOffer'], ['theyTookTheWeek'], ['theyTookTheWeek']]);
  t.eq([m.spite, String(m.because)].join('|'), '0|null', 'what is outweighed on the books is not a motive');
  // what it is about: the heaviest today, the newest of equals
  m = book([['weLeveragedTheirOffer', 104], ['weTookTheWeek', 0]]);
  t.eq(m.because.kind, 'weTookTheWeek', 'an old leverage (1.5 today) is outweighed by this week’s lost week (2)');
  m = book([['weLeveragedTheirOffer', 52], ['weTookTheWeek', 0]]);
  t.eq(m.because.kind, 'weLeveragedTheirOffer', 'a leverage a year old (2.1 today) is not');
  m = book([['weSignedTheirCastoff', 0], ['weDeclinedTheirOffer', 0]]);
  t.eq(m.because.kind, 'weDeclinedTheirOffer', 'of equals, the newest');
  r.head.temper = 'steward';
  m = book([['weLeveragedTheirOffer'], ['weTookTheWeek']]);
  t.eq([m.spite, m.lean, m.score].join('|'), '5|-2|3', 'spite and temper are summed: a steward holding a grudge still has a motive');
  r.head.temper = 'broker';
  // pure
  const before = KP.serialize(state);
  KP.houseMotive(state, r); KP.parkWhy(state, r); KP.parkWhyText(state, r, KP.parkWhy(state, r));
  t.eq(KP.serialize(state), before, 'reading the motive changes nothing and draws nothing');
  // the broadcaster's show has no head and keeps no books
  const show = { name: 'The Show', short: 'Show', projectHouse: true, prestige: 99, acts: [] };
  t.eq(JSON.stringify(KP.houseMotive(state, show)), JSON.stringify({ spite: 0, lean: 0, score: 0, because: null }), 'the show has neither spite nor temper');
}

// ---- C. why, in words -------------------------------------------------------------
{
  const { state } = field('weigh-why');
  const r = houses(state)[0];
  const head = r.head.name;
  state.week = 60;
  t.eq(KP.parkWhy(state, r), null, 'a broker with nothing on the books parks for the calendar alone');
  t.eq(KP.parkWhyText(state, r, null), '', 'and no reason is given');
  r.directed = [{ week: 50, kind: 'weTookTheWeek' }];
  let why = KP.parkWhy(state, r);
  t.eq(JSON.stringify(why), JSON.stringify({ by: 'books', kind: 'weTookTheWeek', week: 50 }), 'with something against us, the reason is the act and its week');
  t.eq(KP.parkWhyText(state, r, why), head + ' has not forgotten: ' + r.short + ' lost a head-to-head week to us (' + when(50) + ').', 'said with the head’s name, the house, the act, the week');
  r.directed = [];
  r.head.temper = 'duelist';
  why = KP.parkWhy(state, r);
  t.eq(JSON.stringify(why), JSON.stringify({ by: 'temper' }), 'a duelist with nothing on the books parks on temper');
  t.eq(KP.parkWhyText(state, r, why), head + ' is a duelist, who takes a shared release week as a personal remark.', 'said with the temper’s own sentence');
  r.head.temper = 'showman';
  t.eq(KP.parkWhyText(state, r, KP.parkWhy(state, r)), head + ' is a showman, who ' + KP.headTemperProse(r.head) + '.', 'a showman too, in the head’s own pronoun');
  r.head.temper = 'steward';
  t.eq(KP.parkWhy(state, r), null, 'a steward’s temper is no reason to park');
  r.directed = [{ week: 55, kind: 'weSignedTheirCastoff' }];
  t.eq((KP.parkWhy(state, r) || {}).by, 'books', 'but a steward with something against us has one');
  r.head.temper = 'duelist';
  t.eq((KP.parkWhy(state, r) || {}).by, 'books', 'and the books come before the temper');
  // what cannot be said is not said
  t.eq(say(state, r, { by: 'books', kind: 'retiredKind', week: 50 }), '', 'an act the table no longer knows gives no sentence');
  t.eq(say(state, { short: 'Show', projectHouse: true }, { by: 'temper' }), '', 'nor does a house with no head');
  t.eq(say(state, null, { by: 'temper' }), '', 'nor a house that no longer stands');
  t.eq(say(state, r, { by: 'weather' }), '', 'nor a reason nobody knows');
}

// ---- D. who parks, through the weekly --------------------------------------------------
{
  // nothing between the houses: the most prestigious, as before
  const { state, g, week } = field('weigh-plain');
  const [a, b] = houses(state);
  reach(a, week, 2); reach(b, week, -2);
  const p = park(state, g);
  t.eq(p.company, a.short, 'with nothing between the houses the most prestigious parks, as it always did');
  t.ok(p.text.includes(PLAIN) && p.why === undefined, 'and the letter gives no reason');
  t.eq(counts(state), '1|0|0|0', 'counted: one date parked on, by the calendar alone');
  t.ok(p.note.priority === 'critical' && lands(p.note), 'the letter opens a decision: it is critical, and a loud week does not cut it');
  // the grandest is the grandest wherever it stands in the list
  const second = field('weigh-plain-second');
  const [c, d] = houses(second.state);
  d.prestige = 90;
  reach(c, second.week, 2); reach(d, second.week, -2);
  t.eq(park(second.state, second.g).company, d.short, 'the grandest house parks whichever it is on the list');
  t.eq(counts(second.state), '1|0|0|0', 'and that is not counted as moved');
}
{
  // the books: a lesser house with something against us goes first
  const { state, g, week } = field('weigh-books');
  const [a, b] = houses(state);
  reach(a, week, 2); reach(b, week, -2);
  b.directed = [{ week: state.week, kind: 'weTookTheWeek' }];
  const said = b.head.name + ' has not forgotten: ' + b.short + ' lost a head-to-head week to us (' + when(state.week) + ').';
  const p = park(state, g);
  t.eq(p.company, b.short, 'a lesser house with a lost week on its books parks before a grander house with none');
  t.eq(JSON.stringify(p.why), JSON.stringify({ by: 'books', kind: 'weTookTheWeek', week: b.directed[0].week }), 'the clash keeps the reason');
  t.ok(p.text.includes('Scheduling coincidences do not exist in this industry. ' + said + ' The desk options are in the Studio'), 'and the letter says it (' + p.text.slice(-200, -80) + ')');
  t.eq(counts(state), '1|1|0|1', 'counted: by the books, and not the grandest house in reach');
  t.eq(b.directed.map(x => x.kind).join(), 'weTookTheWeek,theyAmbushed', 'the parking itself goes on the books after the reason is read');
}
{
  // the temper: a duelist with nothing goes before a grander broker
  const { state, g, week } = field('weigh-temper');
  const [a, b] = houses(state);
  reach(a, week, 2); reach(b, week, -2);
  b.head.temper = 'duelist';
  const p = park(state, g);
  t.eq(p.company, b.short, 'a duelist parks before a grander broker');
  t.eq(JSON.stringify(p.why), JSON.stringify({ by: 'temper' }), 'on temper');
  t.ok(p.text.includes(b.head.name + ' is a duelist, who takes a shared release week as a personal remark. The desk options'), 'and the letter says so');
  t.eq(counts(state), '1|0|1|1', 'counted: by temper');
}
{
  // a steward is passed over, and parks when nobody else can
  const { state, g, week } = field('weigh-steward');
  const [a, b] = houses(state);
  reach(a, week, 2); reach(b, week, -2);
  a.head.temper = 'steward';
  const p = park(state, g);
  t.eq(p.company, b.short, 'a grander steward is passed over for a broker');
  t.ok(p.text.includes(PLAIN) && p.why === undefined, 'who parks for the calendar: no reason given');
  t.eq(counts(state), '1|0|0|1', 'counted as moved, by neither the books nor temper');
  const alone = field('weigh-steward-alone');
  const s0 = houses(alone.state)[0];
  s0.head.temper = 'steward';
  reach(s0, alone.week, 2);
  const p2 = park(alone.state, alone.g);
  t.eq(p2.company, s0.short, 'a steward alone in reach still parks: whether a date is parked on is not changed');
  t.eq(counts(alone.state), '1|0|0|0', 'and nothing was moved');
}
{
  // spite and temper are weighed against each other
  const one = field('weigh-sum-1');
  let [a, b] = houses(one.state);
  reach(a, one.week, 2); reach(b, one.week, -2);
  a.head.temper = 'duelist';                                               // 2
  b.directed = [{ week: one.state.week, kind: 'weLeveragedTheirOffer' }];   // 3
  t.eq(park(one.state, one.g).company, b.short, 'a leveraged offer (3) outweighs a duelist’s temper (2)');
  const two = field('weigh-sum-2');
  [a, b] = houses(two.state);
  reach(a, two.week, 2); reach(b, two.week, -2);
  a.head.temper = 'duelist';                                               // 2
  b.directed = [{ week: two.state.week, kind: 'weDeclinedTheirOffer' }];    // 1
  t.eq(park(two.state, two.g).company, a.short, 'a declined offer (1) does not');
  const three = field('weigh-sum-3');
  [a, b] = houses(three.state);
  reach(a, three.week, 2); reach(b, three.week, -2);
  a.head.temper = 'steward';                                                                                            // -2
  a.directed = [{ week: three.state.week, kind: 'weLeveragedTheirOffer' }, { week: three.state.week, kind: 'weTookTheWeek' }];   // +5
  b.head.temper = 'duelist';                                                                                            // 2
  const p3 = park(three.state, three.g);
  t.eq([p3.company, (p3.why || {}).by, (p3.why || {}).kind].join('|'), a.short + '|books|weLeveragedTheirOffer', 'a steward holding a grudge (3) goes before a duelist (2), and the letter names the heaviest act');
  t.eq(counts(three.state), '1|1|0|0', 'the grandest house in reach, by the books: counted as the books, not as moved');
}
{
  // a house inside its cooldown is not in reach, whatever it holds
  const { state, g, week } = field('weigh-cooldown');
  const [a, b] = houses(state);
  reach(a, week, 2); reach(b, week, -2);
  b.directed = [{ week: state.week, kind: 'weLeveragedTheirOffer' }];
  b.lastAmbushWeek = state.week;
  t.eq(park(state, g).company, a.short, 'a house that parked last week does not park again, grudge or no grudge');
}
{
  // the broadcaster's show has no head to take offence
  const { state, g, week } = field('weigh-show');
  const [a] = houses(state);
  const show = { name: 'The Show', short: 'Show', projectHouse: true, prestige: 99, interest: {}, recentMoves: [],
    acts: [Object.assign(JSON.parse(JSON.stringify(a.acts[0])), { id: 'show-act', name: 'SHOWACT' })] };
  state.rivals.unshift(show);                                               // first in line, and the grandest
  reach(show, week, -2);
  a.head.temper = 'steward';
  reach(a, week, 2);
  const p = park(state, g);
  t.eq(p.company, a.short, 'with a house in reach, even a steward’s, the show does not park');
  const alone = field('weigh-show-alone');
  const show2 = { name: 'The Show', short: 'Show', projectHouse: true, prestige: 99, interest: {}, recentMoves: [],
    acts: [Object.assign(JSON.parse(JSON.stringify(houses(alone.state)[0].acts[0])), { id: 'show-act', name: 'SHOWACT' })] };
  alone.state.rivals.push(show2);
  reach(show2, alone.week, -2);
  const p2 = park(alone.state, alone.g);
  t.eq(p2.company, 'Show', 'alone in reach, the show parks');
  t.ok(p2.text.includes(PLAIN) && p2.why === undefined, 'with no reason given');
  t.eq(counts(alone.state), '0|0|0|0', 'and the ledger counts houses, not the show');
}
{
  // the weighing draws nothing: two forks, one with books that change who parks
  const { state, week } = field('weigh-draws');
  const [a, b] = houses(state);
  reach(a, week, 2); reach(b, week, -2);
  const plain = KP.deserialize(KP.serialize(state));
  const heavy = KP.deserialize(KP.serialize(state));
  houses(heavy)[1].directed = [{ week: heavy.week, kind: 'weLeveragedTheirOffer' }];
  const run = s => forced(KP.C.WAR, 'ambushChance', 1, () => { const rng = KP.rngFor(s); const notes = KP.calendarWeek(s, rng); return { rng: JSON.stringify(rng.state()), who: (notes.find(n => n.ind === 'ambush') || {}).company }; });
  const r1 = run(plain), r2 = run(heavy);
  t.eq([r1.who, r2.who].join('|'), a.short + '|' + b.short, 'fixture: the books changed who parked');
  t.eq(r1.rng, r2.rng, 'and the main stream is where it would have been');
}

// ---- E. the Studio says what the letter said --------------------------------------------
{
  const { state, g, week } = field('weigh-studio');
  const [a, b] = houses(state);
  reach(a, week, 2); reach(b, week, -2);
  b.directed = [{ week: state.week, kind: 'weTookTheWeek' }];
  const p = park(state, g);
  const said = KP.parkWhyText(state, b, p.why);
  const { App, el } = dom.load();
  const studio = () => { App.state = state; App.mode = 'game'; App.tab = 'studio'; App.view = null; App.studioGroupId = g.id; App.render(); return el('screen').innerHTML; };
  let html = studio();
  t.ok(said.length > 20 && html.includes('<span class="w-why">' + said.replace(/’/g, '’') + '</span>'), 'the clash card in the Studio gives the reason the letter gave');
  t.ok(html.includes('data-action="clash-hold"') && html.includes('data-action="clash-slip"'), 'beside its two answers');
  // a clash from an older version carries no reason, and reads as it did
  delete g.prep.clash.why;
  html = studio();
  t.ok(html.includes('Scheduling coincidences do not exist in this industry.</div>') && !html.includes('w-why'), 'a clash with no reason on it reads as it always did');
  // a house that folded since: nothing to say, nothing breaks
  g.prep.clash.why = { by: 'temper' };
  g.prep.clash.company = 'FoldedHouse';
  let threw = '';
  try { html = studio(); } catch (e) { threw = e.message; }
  t.ok(!threw && !html.includes('w-why'), 'a clash with a house that no longer stands renders without one (' + threw + ')');
}

// ---- F. old saves and the tools ------------------------------------------------------------
{
  const { state } = field('weigh-old');
  const old = JSON.parse(KP.serialize(state));
  old.version = '0.11.23';
  ['parks', 'parksBooks', 'parksTemper', 'parksMoved'].forEach(k => { delete old.wallLedger[k]; });
  const back = KP.deserialize(JSON.stringify(old));
  t.eq(counts(back), '0|0|0|0', 'an old file opens with the new counts at zero');
  t.eq(back.version, KP.C.VERSION, 'at this version');
  const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const h = read('tools/harness.js'), l = read('tools/audit_longhaul.js');
  t.ok(h.includes("console.log('the weight: ") && h.includes('parkMoved:'), 'the census prints the weight’s line and holds a band on it');
  t.ok(l.includes(', parked ') && l.includes('parksMoved'), 'the long haul carries it on each scenario’s line');
}

t.finish();
