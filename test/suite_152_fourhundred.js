/* Suite 152 — four hundred names, and doubles told apart (v0.11.45, §138;
   the owner's ruling, §136: 5 and 34). A candidate's name is drawn from four
   hundred where it was drawn from a hundred: twenty family names and twenty
   given, the hundred of before in their places. And a file from before
   v0.11.43 can hold two chairs under one name. Nobody is renamed. Where the
   building speaks a name that two of its chairs answer to, it says whose:
   the chair, in brackets after the name.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   sentence fails by name; nothing here can crash or hang under a broken
   engine. This suite keeps its own copy of the four hundred, its own read of
   a candidate's draw and its own list of the chairs' labels: it never asks
   the engine what a name should be. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_152_fourhundred');

// ---- the kit ------------------------------------------------------------------
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const js = x => JSON.stringify(x);
const FAM = ['Baek', 'Cha', 'Im', 'Joo', 'Gil', 'Weon', 'Pyo', 'Sa', 'Byun', 'Ma', 'Seok', 'Ok', 'Bang', 'Eom', 'Mo', 'Kwak', 'Yeom', 'Gong', 'Ra', 'Bong'];
const GIV = ['Ki-tae', 'Seon-mi', 'Do-hwan', 'Yeo-reum', 'Sang-cheol', 'In-na', 'Moo-young', 'Ha-eun', 'Chul-soo', 'Bo-ra',
  'Jae-hoon', 'Ji-sun', 'Sung-ho', 'Eun-sook', 'Kwang-soo', 'Hye-won', 'Dong-wook', 'Yoon-hee', 'Jin-ho', 'Soo-ah'];
const POOL = [], OLD = [];
FAM.forEach((f, i) => GIV.forEach((g, j) => { POOL.push(f + ' ' + g); if (i < 10 && j < 10) OLD.push(f + ' ' + g); }));
const LABEL = { vocal: 'head vocal coach', dance: 'head dance coach', perf: 'performance director', scout: 'head scout', anr: 'A&R lead', marketing: 'marketing lead',
  producer: 'house producer', writer: 'house writer', producer2: 'second house producer', writer2: 'second house writer' };
const hh = (s, sid, key) => KP.hash01([s.seed, 'hires', sid, key].join('|'));
const own = (s, sid) => FAM[Math.floor(hh(s, sid, 'f') * 20)] + ' ' + GIV[Math.floor(hh(s, sid, 'g') * 20)];
// a building with no chairs sat and a ledger with nothing on it
const desk = (seed, week) => { const s = KP.newGame(seed, null, {}); s.week = week; s.objective.status = 'met'; say(() => KP.staffSeats(s)); Object.keys(s.seats || {}).forEach(k => { delete s.seats[k]; });
  say(() => KP.hiresLedger(s)); s.staffLedger2 = s.staffLedger2 || {}; s.staffLedger2.passed = []; s.staffLedger2.met = []; return s; };
const sit = (s, seatId, name, more) => { s.seats[seatId] = Object.assign({ id: 'sf9_' + seatId, name, seatId, tier: 'working', knownForTag: null, since: 9, style: 'scrappy', warmth: 60, candor: 60,
    resume: ['x'], truth: { base: 0.5, gem: false, bestSeat: 'vocal' } }, more || {}); };
const told = (s, seatId) => String(say(() => KP.seatNameTold(s, seatId)));
const holder = (s, seatId, fb) => String(say(() => KP.seatHolderName(s, seatId, fb)));
const names = s => Object.keys(s.seats || {}).sort().map(k => k + ':' + s.seats[k].name).join(' | ');
const phase = n => KP.weeklyPipeline([]).filter(p => p.name === n)[0] || { fn: () => { throw new Error('no phase ' + n); } };

// ---- A. four hundred names ---------------------------------------------------------------------------
{
  t.ok(POOL.length === 400 && new Set(POOL).size === 400 && OLD.length === 100, 'twenty family names and twenty given: four hundred names, none twice');
  t.ok(!FAM.some(f => GIV.includes(f)) && new Set(FAM).size === 20 && new Set(GIV).size === 20, 'no family name is a given name, and neither list says a name twice');
  // the engine draws as this suite does, and reaches every name
  const s = desk('fh-draws', 40);
  const heard = new Set();
  let off = null;
  for (let i = 0; i < 9000 && !off; i++) { const sid = 'sf40_' + i, n = String(say(() => KP.candidateName(s, sid))); if (n !== own(s, sid)) off = sid + ': ' + n + ', not ' + own(s, sid); heard.add(n); }
  t.eq(String(off), 'null', 'in a building that has met nobody, nine thousand candidates each come in under the draw this suite makes for them');
  t.eq(heard.size + ' · ' + POOL.filter(n => !heard.has(n)).length, '400 · 0', 'and between them they are every name of the four hundred');
  const beyond = Array.from(heard).filter(n => !OLD.includes(n)).length;
  t.eq(beyond, 300, 'three hundred of the names are from beyond the hundred of before');
  // the hundred of before are in their places
  t.eq(js([POOL[0], POOL[9], POOL[20], OLD[0], OLD[9], OLD[10], OLD[99]]), js(['Baek Ki-tae', 'Baek Bo-ra', 'Cha Ki-tae', 'Baek Ki-tae', 'Baek Bo-ra', 'Cha Ki-tae', 'Ma Bo-ra']),
    'the hundred of before are the first ten of each, in their places');
  // a road manager is named from another list: never one of the four hundred
  const mgr = new Set();
  for (let i = 0; i < 3000; i++) mgr.add(String(say(() => KP.staffName('fh|mgr|' + i))));
  t.ok(mgr.size >= 40 && !Array.from(mgr).some(n => POOL.includes(n)), 'a road manager’s name is never one of the four hundred (' + mgr.size + ' of theirs heard)');
}

// ---- B. an older file keeps the names it has ---------------------------------------------------------
{
  const s = desk('fh-old', 90);
  sit(s, 'vocal', 'Gil Ki-tae'); sit(s, 'anr', 'Sa Bo-ra'); sit(s, 'scout', 'Scout Im');
  s.staffLedger2.met = ['Gil Ki-tae', 'Sa Bo-ra', 'Pyo Ha-eun', 'Ma In-na'];
  s.staffLedger2.passed = [{ name: 'Ma In-na', seatId: 'anr', week: 80 }];
  const raw = JSON.parse(KP.serialize(s));
  raw.version = '0.11.44';
  const o = say(() => KP.deserialize(js(raw))) || {};
  t.eq(names(o), names(s), 'a file saved under the hundred opens with every chair under the name it had');
  t.eq(js((o.staffLedger2 || {}).met) + js(((o.staffLedger2 || {}).passed || []).map(e => e.name)), js(s.staffLedger2.met) + js(['Ma In-na']), 'and the desk’s memory of who it met and passed on is as it was');
  t.ok(s.staffLedger2.met.every(n => POOL.includes(n)), 'every name such a file remembers is still a name of the pool');
  t.eq(js(say(() => KP.validateState(o))), '[]', 'and the file has no complaint');
}

// ---- C. doubles told apart ----------------------------------------------------------------------------
{
  ['seatNameShared', 'seatNameTold', 'seatHolderName', 'scoutName'].forEach(k => t.ok(typeof KP[k] === 'function', 'the engine carries KP.' + k));
  // a building where every chair has a name of its own: said as it always was
  const s = desk('fh-plain', 60);
  sit(s, 'vocal', 'Gil Ki-tae'); sit(s, 'writer', 'Im Ki-tae'); sit(s, 'scout', 'Scout Im'); sit(s, 'anr', 'Gil Seon-mi');
  t.eq(['vocal', 'writer', 'scout', 'anr'].map(k => told(s, k)).join(' | '), 'Gil Ki-tae | Im Ki-tae | Scout Im | Gil Seon-mi', 'a name only one chair answers to is said as it always was, though a family name or a given name is shared');
  t.eq(['vocal', 'writer', 'scout', 'anr'].map(k => String(say(() => KP.seatNameShared(s, k)))).join(' '), 'false false false false', 'and none of them is shared');
  t.eq(holder(s, 'vocal') + ' · ' + String(say(() => KP.scoutName(s))), 'Gil Ki-tae · Scout Im', 'the building speaks them plainly');
  // an empty chair speaks as the desk, as it did
  t.eq(told(s, 'dance') + ' · ' + holder(s, 'dance') + ' · ' + holder(s, 'dance', 'the dance room') + ' · ' + String(say(() => KP.seatNameShared(s, 'dance'))),
    'null · the head dance coach desk · the dance room · false', 'an empty chair has no name to tell: it speaks as the desk, as it did');
  // two chairs under one name
  const d = desk('fh-two', 60);
  sit(d, 'vocal', 'Gil Ki-tae'); sit(d, 'writer', 'Gil Ki-tae'); sit(d, 'anr', 'Sa Bo-ra');
  t.eq(told(d, 'vocal') + ' | ' + told(d, 'writer') + ' | ' + told(d, 'anr'), 'Gil Ki-tae (' + LABEL.vocal + ') | Gil Ki-tae (' + LABEL.writer + ') | Sa Bo-ra',
    'two chairs under one name: each is said with its chair, and the third chair plainly');
  t.eq(['vocal', 'writer', 'anr'].map(k => String(say(() => KP.seatNameShared(d, k)))).join(' '), 'true true false', 'the two are shared and the third is not');
  t.eq(holder(d, 'vocal', 'the vocal coach'), 'Gil Ki-tae (' + LABEL.vocal + ')', 'the building speaks the name with its chair');
  // three, and the scout among them
  sit(d, 'scout', 'Gil Ki-tae');
  t.eq(['vocal', 'writer', 'scout'].map(k => told(d, k)).join(' | '), ['vocal', 'writer', 'scout'].map(k => 'Gil Ki-tae (' + LABEL[k] + ')').join(' | '), 'three chairs under one name are each said with their own');
  t.eq(String(say(() => KP.scoutName(d))), 'Gil Ki-tae (' + LABEL.scout + ')', 'the scout’s stories are signed by the scout');
  const ev = say(() => KP.seatEvaluator(d, { id: 'ev_vocal', name: 'whoever' })) || {};
  t.eq(String(ev.name), 'Gil Ki-tae (' + LABEL.vocal + ')', 'and an evaluator’s byline says which of them read the room');
  // every chair's label, by this suite's own list
  const all = desk('fh-all', 60);
  Object.keys(LABEL).forEach(k => sit(all, k, 'Ma In-na'));
  t.eq(Object.keys(LABEL).map(k => told(all, k)).join(' | '), Object.keys(LABEL).map(k => 'Ma In-na (' + LABEL[k] + ')').join(' | '), 'each of the ten chairs is told by its own label');
  // nobody is renamed
  t.eq(names(d), 'anr:Sa Bo-ra | scout:Gil Ki-tae | vocal:Gil Ki-tae | writer:Gil Ki-tae', 'nobody is renamed: the file holds the names it held');
  const back = say(() => KP.deserialize(KP.serialize(d))) || {};
  t.eq(names(back), names(d), 'and saves them as they are');
  // one of the two leaves, and the other is said plainly again
  delete d.seats.writer; delete d.seats.scout;
  t.eq(told(d, 'vocal'), 'Gil Ki-tae', 'when one of two has gone the other is said plainly again');
}

// ---- D. the letters and the scene that speak a name with no chair beside it ----------------------------
{
  const d = desk('fh-letters', 60);
  sit(d, 'vocal', 'Gil Ki-tae'); sit(d, 'writer', 'Gil Ki-tae');
  d.budget = 500;
  const def = KP.sceneDef('seatPoach') || {};
  const sc = { id: 'x1', kind: 'seatPoach', seatId: 'vocal', rivalName: 'Aurum', expiresWeek: 62 };
  t.eq(String(say(() => def.title(d, sc))), 'Gil Ki-tae (' + LABEL.vocal + ') · the offer from outside', 'the offer’s title says which Gil Ki-tae was called');
  t.ok(String(say(() => def.body(d, sc))).startsWith('Gil Ki-tae (' + LABEL.vocal + ') got the call'), 'and so does its first sentence');
  // matched
  const stay = say(() => { KP.openScene(d, { kind: 'seatPoach', seatId: 'vocal', rivalName: 'Aurum', expiresWeek: 62 }); const o = (d.scenes || []).filter(x => x.kind === 'seatPoach')[0]; return KP.resolveScene(d, o.id, 'raise'); }) || {};
  t.ok(js(stay).includes('Gil Ki-tae (' + LABEL.vocal + ') stays.'), 'matched, the one who stays is named with the chair (' + js(stay).slice(0, 90) + ')');
  // wished well: the letter is written while the chair is still theirs
  const before = (d.inbox || []).length;
  say(() => { KP.openScene(d, { kind: 'seatPoach', seatId: 'writer', rivalName: 'Novaline', expiresWeek: 62 }); const o = (d.scenes || []).filter(x => x.kind === 'seatPoach')[0]; return KP.resolveScene(d, o.id, 'walk'); });
  const walked = (d.inbox || []).filter(n => n.ind === 'seatWalked')[0] || { text: 'no letter' };
  t.ok((d.inbox || []).length === before + 1 && walked.text.startsWith('Gil Ki-tae (' + LABEL.writer + ') goes to Novaline'), 'wished well, the letter says which of them went (' + walked.text.slice(0, 70) + ')');
  t.ok(!d.seats.writer && told(d, 'vocal') === 'Gil Ki-tae', 'and the one who stayed is the only Gil Ki-tae now');
  // a building with no doubles: the same letters are as they were
  const p = desk('fh-letters-plain', 60);
  sit(p, 'vocal', 'Gil Ki-tae'); sit(p, 'writer', 'Sa Bo-ra');
  t.eq(String(say(() => def.title(p, sc))), 'Gil Ki-tae · the offer from outside', 'with no double the title is as it was');
  say(() => { KP.openScene(p, { kind: 'seatPoach', seatId: 'vocal', rivalName: 'Aurum', expiresWeek: 62 }); const o = (p.scenes || []).filter(x => x.kind === 'seatPoach')[0]; return KP.resolveScene(p, o.id, 'walk'); });
  t.ok(((p.inbox || []).filter(n => n.ind === 'seatWalked')[0] || { text: '' }).text.startsWith('Gil Ki-tae goes to Aurum'), 'and so is the letter');
  // the corridor's read, through the rail: a stream that grants the corridor's chance and nothing else
  const m = desk('fh-corridor', 60);
  sit(m, 'vocal', 'Gil Ki-tae', { style: 'bigMachine', since: 9 }); sit(m, 'writer', 'Gil Ki-tae', { style: 'scrappy', since: 9 });
  const only = new Proxy({}, { get: (o, k) => (k === 'chance' ? p => p === 0.15 : k === 'int' ? a => a : k === 'pick' ? l => l[0] : () => 0.99) });
  const box = [];
  const ran = say(() => { phase('hires').fn(m, only, box, [], KP.groups(m)); return 'ok'; });
  const read = box.filter(n => n.ind === 'meshFriction').map(n => n.text.split(':')[0]);
  t.eq(ran + ' · ' + js(read), 'ok · ' + js(['Corridor read on Gil Ki-tae (' + LABEL.vocal + ')']), 'the corridor’s read of a method that does not fit names the chair it is about');
}

t.finish();
