/* Suite 133 — the ledger (v0.11.23, §114: the other side of the wall, part two).
   What lies between this house and each house across the street goes on
   the books where the game already decides it: a head-to-head week, a
   date they parked on, a lead they took, a castoff we signed, someone
   who left us and signed there, an offer and what we did with it, the
   pact we passed on, the walkout that made the old house a rival. One
   table weighs the acts. The card says how the head regards us and what
   is on the books. Nothing rolls on it in this part.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   act fails by name. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const KP = loadEngine();
const t = makeT('suite_133_books');
const W = KP.C.WALL;
const KINDS = ['weTookTheWeek', 'weSignedTheirCastoff', 'weLeveragedTheirOffer', 'weDeclinedTheirOffer', 'weWalkedOut',
  'theyTookTheWeek', 'theyAmbushed', 'theyTookOurLead', 'theySignedOurAlumna', 'theySignedOneWhoLeft', 'tookThePactWePassed'];

// ---- the kit ------------------------------------------------------------------
const world = seed => KP.newGame(seed, null, { legacy: true });
const houses = s => KP.signingHouses(s);
const books = r => (r && r.directed) || [];
const kindsOf = r => books(r).map(a => a.kind);
const count = (r, kind) => books(r).filter(a => a.kind === kind).length;
const read = (s, r) => KP.houseRead(s, r) || {};
const when = w => KP.weekLabel(w).text;
const led = s => s.wallLedger || {};
// a constant forced for the length of one fixture
function forced(obj, key, value, fn) { const was = obj[key]; obj[key] = value; try { return fn(); } finally { obj[key] = was; } }
// a group ready to lock a record (suite_030's fixture)
function ready(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'BOOKLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  return { state, g };
}
const lock = (state, g, week) => KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest', week, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });

// ---- A. the shape -------------------------------------------------------------
{
  ['recordHouse', 'houseRead', 'houseLedgerWords'].forEach(k => t.ok(typeof KP[k] === 'function', 'the engine carries KP.' + k));
  t.eq(Object.keys(W.KINDS).sort().join(','), KINDS.slice().sort().join(','), 'eleven acts are on the table');
  t.ok(KINDS.every(k => typeof W.KINDS[k].w === 'number' && W.KINDS[k].words.length > 10 && !/[.{}]/.test(W.KINDS[k].words)), 'each has a weight and words that can sit in a list');
  t.eq(new Set(KINDS.map(k => W.KINDS[k].words)).size, KINDS.length, 'and no two say the same thing');
  t.eq(KINDS.map(k => k + ' ' + W.KINDS[k].w).join(', '), 'weTookTheWeek -2, weSignedTheirCastoff -1, weLeveragedTheirOffer -3, weDeclinedTheirOffer -1, weWalkedOut -6, ' +
    'theyTookTheWeek 1, theyAmbushed 0, theyTookOurLead 0, theySignedOurAlumna 1, theySignedOneWhoLeft 0, tookThePactWePassed 1', 'the table weighs each act as §114 says');
  t.ok(KINDS.filter(k => /^we[A-Z]/.test(k)).every(k => W.KINDS[k].w < 0), 'what we did to them cools their regard');
  t.ok(KINDS.filter(k => /^they[A-Z]|^took/.test(k)).every(k => W.KINDS[k].w >= 0), 'what they did to us does not');
  t.eq([W.halfLifeWeeks, W.cap, W.perKind].join('|'), '104|24|5', 'a house forgets in two years, and keeps twenty-four acts, five of a kind');
  t.ok(W.halfLifeWeeks > KP.C.LEDGER.halfLifeWeeks, 'which is slower than a person does');
  t.ok(W.WORDS.length === 5 && W.WORDS.every((row, i) => i === 0 || row[0] < W.WORDS[i - 1][0]) && new Set(W.WORDS.map(r => r[1])).size === 5, 'five words for their regard, from warm down');
  const s = world('books-shape');
  t.ok(houses(s).every(r => books(r).length === 0), 'a new career opens with nothing on anybody’s books');
  t.eq(JSON.stringify(KP.houseRead(s, houses(s)[0])), JSON.stringify({ standing: 0, grudge: 0, word: null, count: 0, acts: [] }), 'an empty book reads as nothing, with no word');
  t.eq(KP.houseLedgerWords(s, houses(s)[0]), '', 'and says nothing');
  t.eq([led(s).acts, JSON.stringify(led(s).kinds)].join('|'), '0|{}', 'the ledger counts acts from zero');
  t.eq(JSON.stringify(KP.houseRead(s, null)), JSON.stringify({ standing: 0, grudge: 0, word: null, count: 0, acts: [] }), 'no house reads as nothing too');
}

// ---- B. the record ------------------------------------------------------------
{
  const s = world('books-record');
  const [r0, r1] = houses(s);
  let threw = '';
  try { KP.recordHouse(s, r0.short, 'noSuchAct'); } catch (e) { threw = e.message; }
  t.eq(threw, 'wall: unknown house act "noSuchAct"', 'an act the table does not know throws, by name');
  t.eq(KP.recordHouse(s, 'NoSuchHouse', 'theyAmbushed'), null, 'a house that does not stand records nothing');
  t.eq(led(s).acts, 0, 'and nothing is counted');
  const rs = JSON.stringify(s.rngState);
  const act = KP.recordHouse(s, r0.short, 'weTookTheWeek');
  t.eq(JSON.stringify(act), JSON.stringify({ week: s.week, kind: 'weTookTheWeek' }), 'an act is a week and a kind');
  t.eq(kindsOf(r0).join(), 'weTookTheWeek', 'on that house’s books');
  t.eq(books(r1).length, 0, 'and on nobody else’s');
  t.eq([led(s).acts, JSON.stringify(led(s).kinds)].join('|'), '1|{"weTookTheWeek":1}', 'counted, by kind');
  t.eq(JSON.stringify(s.rngState), rs, 'recording draws nothing');
  t.eq(KP.recordHouse(s, r0.short, 'theyAmbushed', 3).week, 3, 'an act can carry a week of its own (an old file’s)');
  // the read is pure
  const before = KP.serialize(s);
  KP.houseRead(s, r0); KP.houseLedgerWords(s, r0);
  t.eq(KP.serialize(s), before, 'reading the books changes nothing');
  // the project house keeps no books
  const show = { name: 'The Show', short: 'Show', projectHouse: true, interest: {}, acts: [], recentMoves: [] };
  s.rivals.push(show);
  t.eq(KP.recordHouse(s, 'Show', 'theyAmbushed'), null, 'the broadcaster’s project house keeps no books');
}

// ---- C. the read: a regard that decays, a grudge that does not ------------------
{
  const s = world('books-read');
  const r = houses(s)[0];
  s.week = 300;
  const at = (kinds, age) => { r.directed = kinds.map(k => ({ week: s.week - (age || 0), kind: k })); return read(s, r); };
  t.eq(at(['weTookTheWeek']).standing, W.KINDS.weTookTheWeek.w, 'this week’s act weighs what the table says');
  t.ok(Math.abs(at(['weTookTheWeek'], W.halfLifeWeeks).standing - W.KINDS.weTookTheWeek.w / 2) < 1e-9, 'half of it one half-life later');
  t.ok(Math.abs(at(['weTookTheWeek'], W.halfLifeWeeks * 2).standing - W.KINDS.weTookTheWeek.w / 4) < 1e-9, 'a quarter after two');
  t.eq(at(['weTookTheWeek', 'weLeveragedTheirOffer'], W.halfLifeWeeks * 2).grudge, 5, 'what they hold against us does not decay');
  t.eq(at(['theyTookTheWeek', 'theyAmbushed', 'theySignedOurAlumna']).grudge, 0, 'and what they did to us is no grudge of theirs');
  // the five words, at their lines
  const word = kinds => at(kinds).word;
  const up = n => Array(n).fill('theyTookTheWeek');            // +1 each
  const down = n => Array(n).fill('weDeclinedTheirOffer');     // -1 each
  t.eq([word(up(3)), word(up(4)), word(up(2)), word(up(1))].join('|'), 'warm toward us|warm toward us|cordial with us|cordial with us', 'three and up is warm, one and two cordial');
  t.eq([word(['theyAmbushed']), word(down(1)), word(down(2)), word(down(3)), word(down(4))].join('|'), 'even with us|even with us|cool toward us|cool toward us|holding a grudge', 'nothing and one against is even, two and three cool, four a grudge');
  t.eq(word(down(4).concat(up(4))), 'even with us', 'the two sides of the books are summed');
  // an old grudge fades to even in the word, and stays in the grudge
  const old = at(down(4), W.halfLifeWeeks * 3);
  t.eq([old.word, old.grudge].join('|'), 'even with us|4', 'six years on the regard is even again, and the four are still counted against us');
  // newest first, with the table's words
  r.directed = [{ week: 290, kind: 'theyAmbushed' }, { week: 295, kind: 'weTookTheWeek' }, { week: 299, kind: 'theySignedOurAlumna' }];
  const rd = read(s, r);
  t.eq(rd.acts.map(a => a.kind + '@' + a.week).join(), 'theySignedOurAlumna@299,weTookTheWeek@295,theyAmbushed@290', 'the acts are read newest first');
  t.ok(rd.acts.every(a => a.words === W.KINDS[a.kind].words && a.w === W.KINDS[a.kind].w) && rd.count === 3, 'each with its words and its weight');
  // an act a later table no longer knows is not read, and breaks nothing
  r.directed.push({ week: 299, kind: 'retiredKind' });
  let passed;
  try { passed = read(s, r).count; } catch (e) { passed = 'threw: ' + e.message; }
  t.eq(passed, 3, 'an act the table no longer knows is passed over');
}

// ---- D. the caps ----------------------------------------------------------------
{
  const s = world('books-caps');
  const r = houses(s)[0];
  for (let i = 0; i < W.perKind + 2; i++) { s.week = 10 + i; KP.recordHouse(s, r.short, 'theyAmbushed'); }
  t.eq(count(r, 'theyAmbushed'), W.perKind, 'of one kind only so many are kept');
  t.eq(books(r).map(a => a.week).join(), [12, 13, 14, 15, 16].join(), 'the oldest of the kind go first');
  KP.recordHouse(s, r.short, 'weTookTheWeek');
  t.eq([count(r, 'theyAmbushed'), count(r, 'weTookTheWeek')].join('|'), W.perKind + '|1', 'another kind does not push them out');
  // fill every kind: the whole book has a cap too
  KINDS.forEach(k => { for (let i = 0; i < W.perKind; i++) KP.recordHouse(s, r.short, k); });
  t.eq(books(r).length, W.cap, 'and the whole book is capped (' + W.cap + ')');
  t.ok(KINDS.every(k => count(r, k) <= W.perKind), 'with no kind over its own');
  t.eq(kindsOf(r)[W.cap - 1], KINDS[KINDS.length - 1], 'the newest act is the last on the books');
  t.eq(led(s).acts, W.perKind + 2 + 1 + KINDS.length * W.perKind, 'the ledger counts every act recorded, kept or not');
  // the walkout is never the act that goes from a full book
  t.eq(KINDS.filter(k => W.KINDS[k].keep).join(), 'weWalkedOut', 'the table keeps one act for good: the walkout');
  const s2 = world('books-keep');
  const r2 = houses(s2)[0];
  KP.recordHouse(s2, r2.short, 'weWalkedOut', 1);
  KP.recordHouse(s2, r2.short, 'theyAmbushed', 2);
  let wk = 3;
  KINDS.filter(k => k !== 'weWalkedOut' && k !== 'theyAmbushed').forEach(k => { for (let i = 0; i < W.perKind; i++) KP.recordHouse(s2, r2.short, k, wk++); });
  t.eq([books(r2).length, books(r2)[0].kind + '@' + books(r2)[0].week].join('|'), W.cap + '|weWalkedOut@1', 'a full book still opens with the walkout');
  t.eq([count(r2, 'theyAmbushed'), books(r2)[1].week > 2].join('|'), '0|true', 'and the oldest act after it is the one that went');
}

// ---- E. the card’s sentence -------------------------------------------------------
{
  const s = world('books-words');
  const r = houses(s)[0];
  const head = KP.rivalHead(s, r).name;
  s.week = 60;
  r.directed = [{ week: 50, kind: 'theyAmbushed' }];
  t.eq(KP.houseLedgerWords(s, r), head + ' is even with us. On the books: parked a comeback on our date (' + when(50) + ').', 'one act: how the head regards us, the act, its week');
  r.directed.push({ week: 55, kind: 'weTookTheWeek' }, { week: 58, kind: 'weLeveragedTheirOffer' });
  t.eq(KP.houseLedgerWords(s, r), head + ' is holding a grudge. On the books: had its offer letter put on our board’s table (' + when(58) + '); lost a head-to-head week to us (' + when(55) + '); parked a comeback on our date (' + when(50) + ').',
    'three acts, newest first');
  r.directed.push({ week: 59, kind: 'theyTookTheWeek' }, { week: 60, kind: 'theySignedOurAlumna' });
  const five = KP.houseLedgerWords(s, r);
  t.ok(five.startsWith(head + ' is cool toward us. On the books: signed an artist who was once ours (' + when(60) + '); took a head-to-head week from us (' + when(59) + '); had its offer letter put on our board’s table (' + when(58) + '); and 2 more.'),
    'past three the rest are counted (' + five.slice(-14) + ')');
  // a house with no head on the file yet is named by its house
  const noHead = { short: 'Show', projectHouse: true, directed: [{ week: 50, kind: 'theyAmbushed' }] };
  t.ok(KP.houseLedgerWords(s, noHead).startsWith('Show is even with us. '), 'a house with no head is named by its name');
}

// ---- F. the acts, each where the game decides it -----------------------------------
{
  // a head-to-head week we take, and one they take
  const { state, g } = ready('books-win');
  g.members.forEach(id => { const p = state.people[id]; p.talents.vocals.cur = 80; p.talents.dance.cur = 80; p.talents.charisma.cur = 75; });
  const week = state.week + 6;
  lock(state, g, week);
  const act = state.rivals[0].acts[0];
  act.quality = 15; act.popularity = 30;
  act.lastReleaseWeek = week - act.cycleWeeks;
  state.rivals.forEach(r => (r.acts || []).forEach(a => { if (a !== act) { a.quality = Math.min(a.quality, 15); a.popularity = Math.min(a.popularity || 0, 30); } }));
  let guard = 0;
  forced(KP.C.WAR, 'ambushChance', 0, () => { while (!g.debuted && guard++ < 10) KP.advanceWeek(state); });
  const battle = (g.results || {}).battle || {};
  t.ok(battle.won === true, 'fixture: we took a head-to-head week');
  const foe = state.rivals.find(r => (r.acts || []).some(a => a.id === battle.actId)) || {};
  t.eq(books(foe).filter(a => a.kind === 'weTookTheWeek').map(a => a.week).join(), String(state.week), 'the house whose act lost has it on the books, that week');
  t.eq(state.rivals.filter(r => r !== foe).reduce((n, r) => n + count(r, 'weTookTheWeek') + count(r, 'theyTookTheWeek'), 0), 0, 'and no other house has a week on its books');

  const b = ready('books-loss');
  const week2 = b.state.week + 6;
  lock(b.state, b.g, week2);
  const act2 = b.state.rivals[0].acts[0];
  act2.quality = 95; act2.popularity = 85;
  act2.lastReleaseWeek = week2 - act2.cycleWeeks;
  guard = 0;
  forced(KP.C.WAR, 'ambushChance', 0, () => { while (!b.g.debuted && guard++ < 10) KP.advanceWeek(b.state); });
  const battle2 = (b.g.results || {}).battle || {};
  t.ok(battle2.won === false, 'fixture: they took one');
  const foe2 = b.state.rivals.find(r => (r.acts || []).some(a => a.id === battle2.actId)) || {};
  t.eq([count(foe2, 'theyTookTheWeek'), count(foe2, 'weTookTheWeek')].join('|'), '1|0', 'the house whose act won has that on the books instead');
}
{
  // a date they park on
  const { state, g } = ready('books-ambush');
  g.members.forEach(id => { state.people[id].hype = 40; });
  lock(state, g, state.week + 6);
  const act = state.rivals[0].acts[0];
  act.lastReleaseWeek = state.week + 8 - act.cycleWeeks;      // due two weeks past our date
  forced(KP.C.WAR, 'ambushChance', 1, () => { for (let w = 0; w < 3 && !(g.prep && g.prep.clash); w++) KP.advanceWeek(state); });
  const clash = (g.prep || {}).clash || {};
  t.ok(!!clash.company, 'fixture: a house parked a comeback on our date');
  const sniper = state.rivals.find(r => r.short === clash.company) || {};
  t.eq(books(sniper).filter(a => a.kind === 'theyAmbushed').map(a => a.week).join(), String(sniper.lastAmbushWeek), 'it is on that house’s books, the week it did it');
  t.eq(state.rivals.filter(r => r !== sniper).reduce((n, r) => n + count(r, 'theyAmbushed'), 0), 0, 'and on no other’s');
}
{
  // a lead this desk had read, and one it never opened
  const s = world('books-lead');
  const r = houses(s)[0];
  const board = s.prospects.map(id => s.people[id]).filter(p => p.status === 'prospect' && !KP.holdoutOf(s, p));
  t.ok(board.length >= 2, 'fixture: two leads on the board (' + board.length + ')');
  const [readLead, unread] = board;
  s.rivals.forEach(x => { x.interest = {}; });
  readLead.flags.readByUs = 1;
  delete unread.flags.readByUs;
  r.interest[readLead.id] = 3; r.interest[unread.id] = 3;
  forced(KP.C.SCOUT, 'rivalSignHotChance', 1, () => KP.advanceWeek(s));
  t.ok(readLead.status === 'rival' && unread.status === 'rival' && readLead.company === r.short, 'fixture: the house signed both off our board');
  t.eq(books(r).filter(a => a.kind === 'theyTookOurLead').map(a => a.week).join(), String(s.week), 'the lead this desk had read is on the books, once');
  t.eq(led(s).kinds.theyTookOurLead, 1, 'the one it never opened is not: it was never ours to lose');
}
{
  // the same, when a house's own intake takes the file off the open board
  const s = world('books-intake');
  const r = houses(s)[0];
  s.budget = 9000;
  const rng = KP.rngFor(s);
  const [a, b] = KP.rivalFloor(s, r);
  t.ok(a && b && KP.cutFromFloor(s, rng, r, a) === 'board' && KP.cutFromFloor(s, rng, r, b) === 'board', 'fixture: two castoffs on the open board');
  // a quiet week (no house takes a file), then this desk reads one of the two
  forced(KP.C.FLOOR, 'intakeFromBoardChance', 0, () => KP.advanceWeek(s));
  t.ok(a.status === 'prospect' && b.status === 'prospect', 'fixture: both are still on the board a week later');
  const look = KP.observeProspect(s, a.id);
  t.ok(look && look.ok !== false && a.flags.readByUs === 1 && !b.flags.readByUs, 'fixture: this desk read one file and not the other');
  s.rivals.forEach(x => { x.interest = {}; });
  forced(KP.C.INDUSTRY, 'scoutIntake', 1000, () => forced(KP.C.FLOOR, 'intakeFromBoardChance', 1, () => KP.advanceWeek(s)));
  t.ok(a.status === 'rival' && b.status === 'rival', 'fixture: two houses signed them off the open board');
  const lastSigned = p => (p.chapters || []).slice().reverse().find(ch => ch.kind === 'signed') || {};
  t.eq([lastSigned(a).how, lastSigned(b).how].join(), 'board,board', 'fixture: off the board, by their files');
  const took = houses(s).find(x => x.short === a.company) || {};
  t.eq(books(took).filter(x => x.kind === 'theyTookOurLead').map(x => x.week).join(), String(s.week), 'the house whose intake took the file this desk had read has it on the books');
  t.eq(led(s).kinds.theyTookOurLead, 1, 'and the file it never opened is on nobody’s');
}
{
  // the roads to another house's floor (floor.js): only "off our board"
  // takes a lead from us; someone who left this building counts by any road
  const ROADS = ['board', 'window', 'late', 'market'];
  const s = world('books-roads');
  const r = houses(s)[0];
  const board = s.prospects.map(id => s.people[id]).filter(p => p.status === 'prospect');
  t.ok(board.length >= ROADS.length, 'fixture: four leads on the board (' + board.length + ')');
  ROADS.forEach((how, i) => { if (board[i]) { board[i].flags.readByUs = 1; KP.rivalSignFromBoard(s, r, board[i], how); } });
  t.eq(books(r).map(x => x.kind).join(), 'theyTookOurLead', 'a read lead signed after its window closed, late, or from the market was not taken from us');
  t.eq((board[0].chapters || []).slice(-1)[0].how, 'board', 'and the one that was is the one signed off our board');
  const s2 = world('books-roads-left');
  const r2 = houses(s2)[0];
  const board2 = s2.prospects.map(id => s2.people[id]).filter(p => p.status === 'prospect');
  ROADS.forEach((how, i) => { if (board2[i]) { board2[i].releasedFrom = s2.company.short; board2[i].flags.readByUs = 1; KP.rivalSignFromBoard(s2, r2, board2[i], how); } });
  t.eq([count(r2, 'theySignedOneWhoLeft'), count(r2, 'theyTookOurLead')].join('|'), ROADS.length + '|0', 'someone who had left this building counts by every road, and is not also a lead');
  const s3 = world('books-roads-other');
  const r3 = houses(s3)[0];
  const p3 = s3.prospects.map(id => s3.people[id]).filter(p => p.status === 'prospect')[0];
  p3.releasedFrom = 'SomeOtherHouse';
  KP.rivalSignFromBoard(s3, r3, p3, 'market');
  t.eq(books(r3).length, 0, 'someone another house let go is not on the books between us');
}
{
  // a trainee we let go, back on the open board, signed across the street
  const s = KP.newGame('books-left', null, { legacy: false });
  const p = s.people[s.roster[0]];
  const let_go = KP.releaseTrainee(s, p.id);
  t.ok(let_go && let_go.ok && p.releasedFrom === s.company.short && p.status === 'released', 'fixture: we let a trainee go');
  p.flags.readByUs = 1;                                     // this desk knows her file, too
  s.rivals.forEach(x => { x.interest = {}; });
  let guard = 0;
  forced(KP.C.FLOOR, 'reentryMin', 0, () => forced(KP.C.FLOOR, 'reentryMax', 0, () =>
    forced(KP.C.INDUSTRY, 'scoutIntake', 1000, () => forced(KP.C.FLOOR, 'intakeFromBoardChance', 1, () => {
      while (p.status !== 'rival' && guard++ < 4) KP.advanceWeek(s);
    }))));
  t.ok(p.status === 'rival' && (p.chapters || []).some(ch => ch.kind === 'reentry'), 'fixture: she came back to the open board and a house signed her');
  const took = houses(s).find(x => x.short === p.company) || {};
  t.eq(books(took).filter(x => x.kind === 'theySignedOneWhoLeft').map(x => x.week).join(), String(p.signedWeek), 'the house that signed someone who had left us has it on the books, that week');
  t.eq([led(s).kinds.theySignedOneWhoLeft, led(s).kinds.theyTookOurLead || 0].join('|'), '1|0', 'once, and not as a lead as well');
}
{
  // the founding: the old house opens its books with the walkout
  const { state, g } = ready('books-founding');
  lock(state, g, state.week + 6);
  let guard = 0;
  forced(KP.C.WAR, 'ambushChance', 0, () => { while (!g.debuted && guard++ < 10) KP.advanceWeek(state); });
  state.week = 48 * 3;
  state.trust = 80;
  state.awardHistory = [{ year: 2, category: 'daesang', name: g.name, company: state.company.short, isPlayer: true }];
  g.trophies = { m: 8 };
  g.releases[0].nationalPeak = 1;
  g.popularity = 75;
  const other = houses(state)[0];
  other.directed = [];
  KP.recordHouse(state, other.short, 'weTookTheWeek', 100);
  const oldShort = state.company.short;
  const acts0 = led(state).acts;
  const founded = KP.foundLabel(state, 'HOMEWARD');
  t.ok(founded && founded.ok && state.company.short !== oldShort, 'fixture: the papers sign');
  const oldHouse = houses(state).find(r => r.short === oldShort) || {};
  t.ok(oldHouse.founderGrudge === true, 'fixture: the house we built is a house across the street');
  t.eq(books(oldHouse).map(a => a.kind + '@' + a.week).join(), 'weWalkedOut@' + state.week, 'the old house opens its books with the walkout, that week');
  t.eq(led(state).acts, acts0 + 1, 'counted once');
  t.eq(books(other).map(a => a.kind + '@' + a.week).join(), 'weTookTheWeek@100', 'what the other houses hold stays: they kept books on the architect');
  t.eq(KP.houseLedgerWords(state, oldHouse), KP.rivalHead(state, oldHouse).name + ' is holding a grudge. On the books: watched its architect walk out the front door (' + when(state.week) + ').', 'and its card says so');
  // a grudge for two years, cool for five
  const at = n => { const w0 = state.week; state.week = w0 + n; const word = read(state, oldHouse).word; state.week = w0; return word; };
  t.eq([at(103), at(104), at(268), at(269)].join('|'), 'holding a grudge|cool toward us|cool toward us|even with us', 'the walkout is a grudge for two years and cool for five');
  t.eq(read(state, oldHouse).grudge, 6, 'and it is the heaviest thing a house can hold against us');
  t.ok(KINDS.every(k => k === 'weWalkedOut' || W.KINDS[k].w > W.KINDS.weWalkedOut.w), 'nothing on the table weighs as much');
  // one week they take from us does not make it warm
  KP.recordHouse(state, oldShort, 'theyTookTheWeek');
  t.eq(read(state, oldHouse).word, 'holding a grudge', 'a week taken from us the same month does not thaw it');
}
{
  // a trainee they cut, signed here; and one whose house is gone
  const s = world('books-castoff');
  const r = houses(s)[0];
  s.budget = 9000;
  const floor = KP.rivalFloor(s, r);
  t.ok(floor.length >= 2, 'fixture: the house has a trainee floor');
  s.prospects = s.prospects.slice(0, 2);                    // room on the board
  const [cut, orphan] = floor;
  const rng = KP.rngFor(s);
  t.eq(KP.cutFromFloor(s, rng, r, cut), 'board', 'fixture: a trainee they cut lands on our board');
  t.eq(cut.castoffFrom, r.short, 'fixture: her file says whose castoff she is');
  // a castoff signs on her own terms (§76 A): the fixture takes them
  const signed = forced(KP.C.NETWORK.CASTOFF, 'doneChance', 0, () => KP.signProspect(s, cut.id, { answer: 'accept' }));
  t.ok(signed && signed.ok !== false && cut.status === 'trainee', 'fixture: we signed her');
  t.eq(books(r).filter(a => a.kind === 'weSignedTheirCastoff').map(a => a.week).join(), String(s.week), 'the house that cut her has it on the books');
  // the other one's house folds under her first
  t.eq(KP.cutFromFloor(s, rng, r, orphan), 'board', 'fixture: a second castoff on the board');
  orphan.castoffFrom = 'FoldedHouse';
  const acts0 = led(s).acts;
  const signed2 = forced(KP.C.NETWORK.CASTOFF, 'doneChance', 0, () => KP.signProspect(s, orphan.id, { answer: 'accept' }));
  t.ok(signed2 && signed2.ok !== false && led(s).acts === acts0, 'a castoff of a house that no longer stands is signed and nothing is recorded');
}
{
  // the pact we passed on goes across the street
  const s = world('books-pact');
  KP.openScene(s, { kind: 'globalJV', company: 'Meridian', coName: 'Meridian Global', expiresWeek: s.week + 4 });
  const sc = (s.scenes || []).find(x => x.kind === 'globalJV') || {};
  const top = houses(s).filter(r => !r.founderGrudge).sort((a, b) => (b.prestige || 0) - (a.prestige || 0))[0];
  KP.resolveScene(s, sc.id, 'decline');
  t.eq(houses(s).map(r => r.short + ':' + count(r, 'tookThePactWePassed')).join(), houses(s).map(r => r.short + ':' + (r === top ? 1 : 0)).join(), 'the house that took the co-build we declined has it on the books, and only that house');
  // signed, nobody across the street took anything
  const s2 = world('books-pact');
  KP.openScene(s2, { kind: 'globalJV', company: 'Meridian', coName: 'Meridian Global', expiresWeek: s2.week + 4 });
  KP.resolveScene(s2, ((s2.scenes || []).find(x => x.kind === 'globalJV') || {}).id, 'sign');
  t.eq(houses(s2).reduce((n, r) => n + books(r).length, 0), 0, 'a pact we sign puts nothing on anybody’s books');
}

// ---- G. old saves -------------------------------------------------------------------
{
  const s = world('books-old');
  for (let i = 0; i < 3; i++) KP.advanceWeek(s);
  const [r0, r1, r2] = houses(s);
  const old = JSON.parse(KP.serialize(s));
  old.version = '0.11.22';
  delete old.wallLedger.acts; delete old.wallLedger.kinds;
  const o = short => old.rivals.find(r => r.short === short);
  old.rivals.forEach(r => { delete r.directed; });
  old.week = 60;                                           // the file is a year in
  o(r0.short).offerLeveraged = 20; o(r0.short).offerDeclined = 40; o(r0.short).ambushCount = 2; o(r0.short).lastAmbushWeek = 30;
  o(r1.short).offerDeclined = 30;
  o(r1.short).offerLeveraged = true;                       // not a week: not on the books
  const alum = Object.values(old.people)[0];
  alum.flags = alum.flags || {};
  alum.flags.across = { company: r1.short, week: 20 };
  // the house we walked out of, in the shape the founding gives it
  old.rivals.push({ name: 'Oldhouse Entertainment', short: 'Oldhouse', philosophy: 'patient', blurb: 'The house the architect built.',
    prestige: 60, nextDebutWeek: 90, interest: {}, recentMoves: [], founderGrudge: true, acts: [] });
  old.founded = { week: 10, from: 'Oldhouse', warChest: 500 };
  // who is on r0's floor today, and by which road each came
  const floorIds = KP.rivalFloor(s, r0).map(p => p.id);
  t.ok(floorIds.length >= 8, 'fixture: eight people on that house’s floor (' + floorIds.length + ')');
  const onFloor = i => { const p = old.people[floorIds[i]] || {}; p.flags = p.flags || {}; delete p.flags.readByUs; delete p.releasedFrom; return p; };
  const signedCh = (week, how, co) => [{ week, kind: 'signed', co: co || r0.short, how }];
  // she was ours first; the other was signed late by another house, cut, and read by us on the board
  const left = onFloor(0); left.releasedFrom = old.company.short; left.flags.readByUs = 1;
  left.chapters = [{ week: 5, kind: 'signed', co: old.company.short }, { week: 15, kind: 'released', co: old.company.short, how: 'released' }].concat(signedCh(25, 'market'));
  const lead = onFloor(1); lead.flags.readByUs = 1;
  lead.chapters = signedCh(12, 'late', r1.short).concat([{ week: 30, kind: 'cut', co: r1.short }], signedCh(35, 'board'));
  const lateLead = onFloor(2); lateLead.flags.readByUs = 1; lateLead.chapters = signedCh(36, 'late');           // not taken from us
  const unread = onFloor(3); unread.chapters = signedCh(37, 'board');                                             // never ours to lose
  const elsewhere = onFloor(4); elsewhere.flags.readByUs = 1; elsewhere.chapters = signedCh(38, 'board', r1.short);   // her file says another house
  const gone = onFloor(5); gone.flags.readByUs = 1; gone.chapters = signedCh(39, 'board'); gone.status = 'prospect'; gone.company = null;   // no longer there
  const solo = onFloor(6); solo.releasedFrom = old.company.short; solo.chapters = signedCh(41, 'solo');           // not a road onto a floor
  const noFile = onFloor(7); noFile.flags.readByUs = 1; delete noFile.chapters;                                   // no file of a signing
  const back = KP.deserialize(JSON.stringify(old));
  const h = short => houses(back).find(r => r.short === short) || {};
  t.eq(books(h(r0.short)).map(a => a.kind + '@' + a.week).join(), 'weLeveragedTheirOffer@20,theySignedOneWhoLeft@25,theyAmbushed@30,theyTookOurLead@35,weDeclinedTheirOffer@40', 'an old file’s offers and its last ambush go on the books, each with its own week, oldest first');
  t.eq(books(h(r1.short)).map(a => a.kind + '@' + a.week).join(), 'theySignedOurAlumna@20,weDeclinedTheirOffer@30', 'so do a declined offer and an artist of ours they signed');
  t.eq(books(h(r2.short)).length, 0, 'a house the file records nothing about has empty books');
  t.eq(books(h('Oldhouse')).map(a => a.kind + '@' + a.week).join(), 'weWalkedOut@10', 'the house we walked out of has the walkout, the week the file says');
  t.eq(led(back).acts, 8, 'and the ledger counts what was seeded');
  // the walkout needs the file to say which house and when
  const noDate = JSON.parse(JSON.stringify(old)); noDate.founded = { from: 'Oldhouse' };
  const wrongHouse = JSON.parse(JSON.stringify(old)); wrongHouse.founded = { week: 10, from: r2.short };
  const noGrudge = JSON.parse(JSON.stringify(old)); noGrudge.rivals.find(r => r.short === 'Oldhouse').founderGrudge = false;
  t.eq([noDate, wrongHouse, noGrudge].map(f => houses(KP.deserialize(JSON.stringify(f))).reduce((n, r) => n + count(r, 'weWalkedOut'), 0)).join(), '0,0,0', 'a file that does not say when, names another house, or holds no grudge seeds no walkout');
  // opened again, nothing is seeded twice
  const again = KP.deserialize(KP.serialize(back));
  t.eq(houses(again).map(r => books(r).length).join(), houses(back).map(r => books(r).length).join(), 'a file already at this version is not seeded again');
  // a file whose house already keeps books is left as it is
  const old2 = JSON.parse(KP.serialize(back));
  old2.version = '0.11.22';
  old2.rivals.find(r => r.short === r0.short).directed = [{ week: 5, kind: 'theyTookTheWeek' }];
  const back2 = KP.deserialize(JSON.stringify(old2));
  t.eq(books(houses(back2).find(r => r.short === r0.short)).map(a => a.kind).join(), 'theyTookTheWeek', 'a house that already keeps books is not seeded over');
}

// ---- H. the card ---------------------------------------------------------------------
{
  const s = world('books-card');
  const [r0, r1] = houses(s);
  s.week = 30;
  KP.recordHouse(s, r0.short, 'weTookTheWeek', 22);
  KP.recordHouse(s, r0.short, 'theyAmbushed', 27);
  r1.offerLeveraged = 25; r1.offerDeclined = 26;            // the old flags alone say nothing now
  // a floor of one (the old house's, the week after the founding, is one)
  KP.rivalFloor(s, r1).slice(1).forEach(p => KP.goHome(s, p, 'fixture'));
  t.eq(KP.rivalFloor(s, r1).length, 1, 'fixture: one trainee left on a house’s floor');
  const { App, el } = dom.load();
  App.state = s; App.mode = 'game'; App.tab = 'industry'; App.industrySub = 'scene'; App.view = null; App.render();
  const html = el('screen').innerHTML;
  t.ok(html.includes('<div class="rv-ledger"') && html.includes('>' + KP.houseLedgerWords(s, r0).replace(/’/g, '’') + '</div>'), 'a house with something on the books says so on its card');
  t.eq((html.match(/class="rv-ledger"/g) || []).length, 1, 'a house with nothing on them has no such line');
  t.ok(!/Remembers the letter you put on the board|Sent an offer once/.test(html), 'the two sentences the offer used to leave are gone: they are acts now');
  t.ok(html.includes('<span class="chip">1 trainee · ') && !html.includes('1 trainees'), 'a floor of one is one trainee');
}

t.finish();
