/* Suite 150 — one name, one chair (v0.11.43, §135: a repair found by §134's
   check). A candidate's name is drawn from the pool, a hundred then and four
   hundred since v0.11.45 (§138), and passes over every name the desk has
   met: the chairs sat, the names it passed on that the market still
   remembers, and everyone who has taken a meeting. A candidate whose own
   draw is free is who they always were. One whose draw is taken is given a
   free name by the same hash. When the whole pool has come through the door
   the memory starts over. An old file starts with the people it has, and
   nobody is renamed. No draw is made.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   sentence fails by name; nothing here can crash or hang under a broken
   engine. This suite keeps its own copy of the four hundred and its own read
   of a candidate's draw: it never asks the engine what a name should be. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_150_names');

// ---- the kit ------------------------------------------------------------------
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const js = x => JSON.stringify(x);
const FAM = ['Baek', 'Cha', 'Im', 'Joo', 'Gil', 'Weon', 'Pyo', 'Sa', 'Byun', 'Ma', 'Seok', 'Ok', 'Bang', 'Eom', 'Mo', 'Kwak', 'Yeom', 'Gong', 'Ra', 'Bong'];
const GIV = ['Ki-tae', 'Seon-mi', 'Do-hwan', 'Yeo-reum', 'Sang-cheol', 'In-na', 'Moo-young', 'Ha-eun', 'Chul-soo', 'Bo-ra',
  'Jae-hoon', 'Ji-sun', 'Sung-ho', 'Eun-sook', 'Kwang-soo', 'Hye-won', 'Dong-wook', 'Yoon-hee', 'Jin-ho', 'Soo-ah'];
const POOL = [];
FAM.forEach(f => GIV.forEach(g => POOL.push(f + ' ' + g)));
// the hundred of before v0.11.45: the first ten of each, in their places
const OLD = [];
FAM.slice(0, 10).forEach(f => GIV.slice(0, 10).forEach(g => OLD.push(f + ' ' + g)));
const hh = (s, sid, key) => KP.hash01([s.seed, 'hires', sid, key].join('|'));
// a candidate's own draw, and the pick among a list of free names, by this suite's own arithmetic
const own = (s, sid) => FAM[Math.floor(hh(s, sid, 'f') * 20)] + ' ' + GIV[Math.floor(hh(s, sid, 'g') * 20)];
const pick = (s, sid, list) => list[Math.floor(hh(s, sid, 'free') * list.length)];
// a salt whose own draw, minted in this week, is the name asked for (about one in four hundred is)
const saltFor = (s, week, name) => { for (let i = 0; i < 10000; i++) if (own(s, 'sf' + week + '_' + i) === name) return i; return -1; };
// a building with no chairs sat and a ledger with nothing on it
const desk = (seed, week) => { const s = KP.newGame(seed, null, {}); s.week = week; s.objective.status = 'met'; say(() => KP.staffSeats(s)); Object.keys(s.seats || {}).forEach(k => { delete s.seats[k]; });
  say(() => KP.hiresLedger(s)); s.staffLedger2 = s.staffLedger2 || {}; s.staffLedger2.passed = []; s.staffLedger2.met = []; return s; };
const sit = (s, seatId, name) => { s.seats[seatId] = { id: 'sf9_' + seatId.length + '77', name, seatId, tier: 'working', knownForTag: null, since: 9, style: 'scrappy', warmth: 60, candor: 60,
    resume: ['x'], truth: { base: 0.5, gem: false, bestSeat: 'vocal' } }; };
const pass = (s, name) => { s.staffLedger2.passed.push({ name, seatId: 'anr', week: s.week - 3 }); };
const name = (s, sid) => String(say(() => KP.candidateName(s, sid)));
const phase = n => KP.weeklyPipeline([]).filter(p => p.name === n)[0] || { fn: () => { throw new Error('no phase ' + n); } };
// a stream that rolls nothing: every chance fails, and the one salt asked for is the one given
const scripted = salt => new Proxy({}, { get: (o, k) => (k === 'chance' ? () => false : k === 'int' ? (a, b) => (b === 9999 ? salt : a) : k === 'pick' ? l => l[0] : () => 0.99) });
const meeting = s => (s.scenes || []).filter(x => x.kind === 'theInterview')[0] || { id: 'none', cand: { id: 'no interview opened', name: 'no interview opened' } };
// a posted search answered by the rail, under one salt: the candidate who took the meeting
const post = (s, seatId, salt) => { s.scenes = (s.scenes || []).filter(x => x.kind !== 'theInterview'); s.staffSearch = { seatId, week: s.week - 1 }; const box = [];
  const ran = say(() => { phase('hires').fn(s, scripted(salt), box, [], KP.groups(s)); return 'ok'; }); return { ran, box, cand: meeting(s).cand }; };

// ---- A. who they always were -------------------------------------------------------
{
  ['seatNamesHere', 'candidateName'].forEach(k => t.ok(typeof KP[k] === 'function', 'the engine carries KP.' + k));
  const s = desk('nm-own', 60);
  const sids = ['sf10_1', 'sf10_2', 'sf55_4821', 'sf300_77', 'sf60_9999'];
  t.eq(sids.map(x => name(s, x)).join(' | '), sids.map(x => own(s, x)).join(' | '), 'in a building that has met nobody, a candidate comes in under their own draw');
  t.ok(sids.every(x => POOL.includes(own(s, x))) && POOL.length === 400 && new Set(POOL).size === 400, 'and the draw is one of four hundred');
  // other people's names do not move them
  const others = POOL.filter(n => !sids.some(x => own(s, x) === n));
  sit(s, 'vocal', others[0]); sit(s, 'scout', 'Scout Im'); pass(s, others[1]); s.staffLedger2.met = others.slice(2, 40);
  t.eq(sids.map(x => name(s, x)).join(' | '), sids.map(x => own(s, x)).join(' | '), 'nor do the names of others, sat, passed on or met, change who a candidate is');
  t.eq(js(Object.keys(say(() => KP.seatNamesHere(s))).sort()), js([others[0], 'Scout Im', others[1]].sort()), 'the names the building answers to today: the chairs sat and the names passed on, not everyone ever met');
}

// ---- B. a name the building answers to ------------------------------------------------------
{
  const sid = 'sf60_4242';
  const s = desk('nm-sat', 60);
  const first = own(s, sid);
  sit(s, 'marketing', first);
  const got = name(s, sid);
  t.ok(got !== first && POOL.includes(got), 'a candidate whose draw is the marketing lead’s name comes in under another of the four hundred (' + first + ', ' + got + ')');
  t.eq(got, pick(s, sid, POOL.filter(n => n !== first)), 'the one the same hash picks among the free names, in the pool’s own order');
  t.eq(name(s, sid), got, 'and the same one every time it is asked');
  delete s.seats.marketing;
  t.eq(name(s, sid), first, 'with the chair empty the name is free again');
  // passed on, and still remembered
  pass(s, first);
  const got2 = name(s, sid);
  t.ok(got2 !== first && got2 === pick(s, sid, POOL.filter(n => n !== first)), 'a name the desk passed on, which the market still remembers, is passed over the same way');
  s.staffLedger2.passed = [];
  t.eq(name(s, sid), first, 'and is free once the market has forgotten it and the desk never met it');
  // met
  s.staffLedger2.met = [first];
  t.ok(name(s, sid) !== first && name(s, sid) === pick(s, sid, POOL.filter(n => n !== first)), 'a name that has taken a meeting here is passed over, sat or not');
  s.staffLedger2.met = [POOL.filter(n => n !== first)[0]];
  t.eq(name(s, sid), first, 'another name in the memory does not');
}

// ---- C. all three at once, and the last free name -------------------------------------------------
{
  const sid = 'sf61_17';
  const s = desk('nm-three', 61);
  const first = own(s, sid);
  const rest = POOL.filter(n => n !== first);
  const [X, Y, Z] = [rest[11], rest[42], rest[77]];
  s.staffLedger2.met = POOL.filter(n => n !== X && n !== Y && n !== Z);   // the candidate's own draw is among those met
  sit(s, 'dance', X); pass(s, Y);
  t.eq(name(s, sid), Z, 'with one name sat, one passed on and three hundred and ninety-seven met, the candidate gets the one name left');
  const zSalt = saltFor(s, 61, Z);
  t.ok(zSalt >= 0 && name(s, 'sf61_' + zSalt) === Z, 'and a candidate whose own draw is that name keeps it');
  // two free: the hash picks between them, by this suite's own arithmetic
  s.staffLedger2.met = s.staffLedger2.met.filter(n => n !== rest[5]);
  t.eq(name(s, sid), pick(s, sid, POOL.filter(n => n === rest[5] || n === Z)), 'with two left the hash picks between them');
}

// ---- D. the last of the four hundred, and the memory’s turn ---------------------------------------------
{
  const sid = 'sf62_808';
  const s = desk('nm-turn', 62);
  const first = own(s, sid);
  const rest = POOL.filter(n => n !== first);
  s.staffLedger2.met = POOL.slice();
  t.eq(name(s, sid), first, 'when all four hundred have come through the door a name comes round again: the candidate’s own, if the building does not answer to it today');
  sit(s, 'anr', first); pass(s, rest[3]);
  const got = name(s, sid);
  t.eq(got, pick(s, sid, POOL.filter(n => n !== first && n !== rest[3])), 'and if it does, one the hash picks among those it does not answer to');
  t.ok(got !== first && got !== rest[3], 'never the name sat, never the name passed on');
  // a file no career makes: every name of the four hundred remembered as passed on
  const absurd = desk('nm-absurd', 62);
  POOL.forEach(n => pass(absurd, n));
  t.eq(name(absurd, sid), own(absurd, sid), 'with every name of the four hundred passed on, which no career does, the candidate keeps their own draw and nothing breaks');
  const bare = desk('nm-bare', 62);
  delete bare.staffLedger2; delete bare.seats;
  t.eq(name(bare, sid), own(bare, sid), 'a file with no ledger and no chairs reads the same');
}

// ---- E. the rail ------------------------------------------------------------------------------
{
  const s = desk('nm-rail', 60);
  const first = own(s, 'sf60_4242');
  sit(s, 'marketing', first);
  const a = post(s, 'anr', 4242);
  t.eq(a.ran + ' · ' + a.cand.id, 'ok · sf60_4242', 'a posted search brings a candidate to the meeting, minted this week under the salt drawn');
  t.ok(a.cand.name !== first && a.cand.name === pick(s, 'sf60_4242', POOL.filter(n => n !== first)), 'they do not come in under the marketing lead’s name (' + first + ', ' + a.cand.name + ')');
  t.ok(a.box.some(n => n.ind === 'interviewSet' && String(n.text).startsWith(a.cand.name + ' is in the building about the A&R lead chair')), 'the letter and the meeting name the same person');
  t.eq(js(s.staffLedger2.met), js([a.cand.name]), 'and the desk remembers the name');
  // the desk passes, and the next candidate's own draw is that very name
  say(() => KP.resolveScene(s, meeting(s).id, 'pass'));
  t.ok(s.staffLedger2.passed.some(e => e.name === a.cand.name), 'a pass is remembered by the market, as it was');
  s.week = 61;
  const salt = saltFor(s, 61, a.cand.name);
  const b = post(s, 'anr', salt);
  t.ok(salt >= 0 && b.cand.id === 'sf61_' + salt && b.cand.name !== a.cand.name && b.cand.name !== first, 'the next week’s candidate, whose own draw is the name just passed on, comes in under another (' + b.cand.name + ')');
  t.eq(js(s.staffLedger2.met), js([a.cand.name, b.cand.name]), 'and is remembered in turn');
  // hired, and gone: the name stays met
  say(() => { s.budget = 9999; KP.resolveScene(s, meeting(s).id, 'hire'); });
  t.eq((s.seats.anr || {}).name, b.cand.name, 'hired, they sit under the name they came in with');
  say(() => KP.releaseSeat(s, 'anr'));
  s.staffLedger2.passed = [];
  s.week = 62;
  const salt2 = saltFor(s, 62, b.cand.name);
  const c = post(s, 'anr', salt2);
  t.ok(salt2 >= 0 && c.cand.id === 'sf62_' + salt2 && ![first, a.cand.name, b.cand.name].includes(c.cand.name) && POOL.includes(c.cand.name),
    'let go and forgotten by the market, their name does not come back under somebody new (' + c.cand.name + ')');
  // the memory's turn, through the rail
  const last = POOL.filter(n => ![first, a.cand.name, b.cand.name, c.cand.name].includes(n))[0];
  s.staffLedger2.met = POOL.filter(n => n !== last);
  s.week = 63;
  const d = post(s, 'anr', saltFor(s, 63, a.cand.name));
  t.eq(d.cand.name + ' · ' + s.staffLedger2.met.length, last + ' · 400', 'the four-hundredth candidate takes the last name free, and the memory holds all four hundred');
  s.week = 64;
  const e = post(s, 'anr', saltFor(s, 64, a.cand.name));
  t.eq(e.cand.name + ' · ' + js(s.staffLedger2.met), a.cand.name + ' · ' + js([a.cand.name]), 'the four-hundred-and-first comes round under their own draw, and the memory starts over with them');
  s.week = 65;
  const f = post(s, 'anr', saltFor(s, 65, first));
  t.ok(f.cand.name !== first && f.cand.name !== a.cand.name && POOL.includes(f.cand.name) && s.staffLedger2.met.length === 2, 'a memory that has started over still passes over the name sat and the name just met (' + f.cand.name + ')');
}

// ---- F. an old file ---------------------------------------------------------------------------
{
  const s = desk('nm-old', 80);
  sit(s, 'vocal', 'Gil Ki-tae'); sit(s, 'writer', 'Gil Ki-tae'); sit(s, 'scout', 'Scout Im');
  s.seats.writer.id = 'sf40_writer2'; s.seats.writer.works = [];
  pass(s, 'Ma In-na'); pass(s, 'Gil Ki-tae');
  delete s.staffLedger2.met;
  const raw = JSON.parse(KP.serialize(s));
  raw.version = '0.11.42';
  const o = say(() => KP.deserialize(js(raw)));
  const led = (o && o.staffLedger2) || {};
  t.eq(js(led.met), js(['Gil Ki-tae', 'Scout Im', 'Ma In-na']), 'a file from before this release starts its memory with the people it has: the chairs sat and the names passed on, each once');
  t.eq(((o.seats || {}).vocal || {}).name + ' / ' + ((o.seats || {}).writer || {}).name, 'Gil Ki-tae / Gil Ki-tae', 'nobody is renamed: two people a file already holds under one name keep it');
  t.eq(js(say(() => KP.validateState(o))), '[]', 'and the file has no complaint');
  const salt = saltFor(o, 80, 'Gil Ki-tae');
  o.week = 80;
  const next = post(o, 'anr', salt);
  t.ok(salt >= 0 && next.cand.name !== 'Gil Ki-tae' && POOL.includes(next.cand.name), 'but a third Gil Ki-tae does not come in (' + next.cand.name + ')');
  // a file saved by this release keeps the memory it has
  o.staffLedger2.met = ['Sa Bo-ra', 'Pyo Ha-eun'];
  const again = say(() => KP.deserialize(KP.serialize(o)));
  t.eq(js(((again || {}).staffLedger2 || {}).met), js(['Sa Bo-ra', 'Pyo Ha-eun']), 'a file saved by this release keeps the memory it has');
  // a file from before there was a staff ledger
  const bare = JSON.parse(KP.serialize(desk('nm-bare-old', 30)));
  delete bare.staffLedger2; bare.version = '0.11.42';
  const b = say(() => KP.deserialize(js(bare)));
  t.eq(js(say(() => KP.hiresLedger(b).met)), '[]', 'a file with no staff ledger at all gets an empty memory the first time the ledger is read');
}

// ---- G. the real weeks --------------------------------------------------------------------------------
{
  // a new game, a posting every week on a chair in turn, and every candidate passed on: a hundred and four meetings.
  // (The memory's turn is held through the rail above. Four hundred real meetings would be eight years of weeks.)
  // Bounded, and a week that does not move ends it, so a broken engine cannot hang this
  const s = KP.newGame('nm-real', null, {});
  const SEATS = ['vocal', 'dance', 'perf', 'scout', 'anr', 'marketing', 'producer', 'writer'];
  const seen = [], twins = [];
  const r = say(() => { for (let i = 0; i < 140 && seen.length < 104; i++) { const was = s.week;
    const sc = meeting(s);
    if (sc.id !== 'none') KP.resolveScene(s, sc.id, 'pass');
    s.budget = 5000;
    KP.openSearch(s, SEATS[s.week % SEATS.length]);
    KP.advanceWeek(s);
    if (s.week === was) return 'the week did not move at ' + was;
    const m = meeting(s);
    if (m.id !== 'none' && !seen.some(x => x.id === m.cand.id)) seen.push({ id: m.cand.id, name: m.cand.name, week: s.week, here: Object.keys(KP.seatNamesHere(s)) });
    const sat = Object.keys(s.seats || {}).map(k => s.seats[k].name);
    if (new Set(sat).size !== sat.length) twins.push(s.week);
  } return 'ok'; });
  const names = seen.map(x => x.name);
  t.ok(r === 'ok' && seen.length === 104, 'a hundred and four candidates took a meeting in the real weeks of one career (' + r + ', ' + seen.length + ')');
  t.eq(new Set(names).size, 104, 'each came in under a name of their own: a hundred and four names');
  t.ok(names.every(n => POOL.includes(n)), 'every one a name of the four hundred');
  const beyond = names.filter(n => !OLD.includes(n)).length;
  t.ok(beyond >= 52 && beyond <= 100, 'and most of them from beyond the hundred of before, as three names in four are (' + beyond + ' of 104)');
  t.eq(js(seen.filter((x, i) => i > 0 && seen.slice(Math.max(0, i - 6), i).some(y => y.name === x.name)).map(x => x.week)), '[]', 'and nobody comes in under one of the six names before them');
  t.eq(js(twins), '[]', 'no week has two chairs sat under one name');
  t.eq(js(say(() => KP.validateState(s))), '[]', 'and the file has no complaint at the end');
}

t.finish();
