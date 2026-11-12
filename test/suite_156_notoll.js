/* Suite 156 — her questions without a toll (v0.11.51, §144; the owner's ruling, §136: 11 and 12).
   A pass on a chair's own question was free once and cost a point of trust from the second in a row. The owner:
   "Only penalize passing when the decision is genuinely urgent or when refusing to act has a clear contextual
   consequence. Do not punish reasonable restraint or declining nonessential commitments." A pass costs nothing
   now, however many in a row. One is counted: the quarter's, answered while the red weeks are running.
   And the sound of the year: "Allow records in adjacent musical styles to count toward satisfying a trend-focused
   executive, but award a weaker benefit than an exact match." A record next door to the year's sound keeps that
   promise in part, for one point where a record in it earns two.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing letter fails by name. The sums and the
   rules here are the suite's own. */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const KP = loadEngine();
const t = makeT('suite_156_notoll');
const M = KP.C.MEETING, O = M.OWN || {};

// ---- the kit ------------------------------------------------------------------
let SAY = 0;   // each question is a family of three wordings: a fixture forces the first
const realLineFor = KP.lineFor;
KP.lineFor = function (state, salt, lines) { return SAY != null && /^execOwn\|/.test(String(salt)) ? lines[SAY] : realLineFor.apply(this, arguments); };
const TYPES = ['execQuarter', 'execVoice', 'execByName', 'execSound', 'execRemember'];
const KINDS = { profitHunter: 'execQuarter', traditionalist: 'execVoice', micromanager: 'execByName', trendChaser: 'execSound', visionary: 'execRemember' };
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
// an answer always has words to read: one that threw, or came back without any, says so and fails its check by name
const obj = x => { const o = x && typeof x === 'object' ? x : { ok: false, toast: String(x) }; if (typeof o.toast !== 'string') o.toast = 'no words: ' + JSON.stringify(o); return o; };
const chair = k => KP.DATA.executives.find(e => e.personality === k) || {};
const room = s => KP.freeTrainees(s).map(id => s.people[id]);
const act = s => KP.groups(s)[0];
const led = s => s.upstairsLedger || { types: {} };
const counts = s => ['asked', 'promised', 'passed', 'passedTwice', 'passedUrgent', 'met', 'nextDoor', 'missed', 'void'].map(k => led(s)[k]).join('|');
const scene = s => (s.scenes || []).find(x => x.kind === 'execQuestion') || null;
const openOwn = s => (s.claims || []).filter(c => TYPES.includes(c.type) && !c.resolved);
// a world in week 30 under one kind of executive, with the two older questions shut
function world(seed, kind) {
  const s = KP.newGame(seed, null, {});
  const e = chair(kind);
  s.executive = { name: e.name, gender: e.gender, personality: e.personality, intro: e.intro, since: 1 };
  s.week = 30;
  s.gravityExecAsk = null;
  s.secondGroupAsked = true;
  const r = room(s);
  const hold = r[r.length - 1];
  KP.openClaim(s, { type: 'readyTrainee', subject: { kind: 'exec' }, personId: hold.id, personName: KP.displayName(hold), byWeek: 99999, week: 1 });
  r.forEach((p, i) => { p.evalHistory = [{ week: 28, rank: i === r.length - 1 ? 1 : r.length - i, of: r.length }]; p.talents.vocals.cur = 40 + i; });
  r[0].talents.vocals.cur = 90;
  return s;
}
const ask = s => { s.nextMeetingWeek = s.week; return say(() => KP.meetingWeek(s)); };
const answer = (s, opt) => { const sc = scene(s); return obj(sc ? say(() => KP.resolveScene(s, sc.id, opt)) : 'no question on the table'); };
const pass = s => { ask(s); return answer(s, 'pass'); };
const promised = s => { ask(s); answer(s, 'promise'); return openOwn(s)[0] || {}; };
function settle(s) {
  const inbox = [];
  const r = say(() => { KP.weeklyPipeline([]).filter(p => p.name === 'stageDoor').forEach(p => p.fn(s, KP.rngFor(s), inbox, s.roster.map(id => s.people[id]), KP.groups(s))); });
  if (typeof r === 'string') inbox.push({ text: r });
  return inbox;
}
const verdict = inbox => inbox.find(n => n.ind === 'execOwnMet' || n.ind === 'execOwnMissed') || { text: 'no verdict: ' + inbox.map(n => n.ind || String(n.text).slice(0, 40)).join() };
const record = (g, week, o) => { const r = Object.assign({ week, songTitle: 'Record ' + week, conceptId: 'bright', reception: 50 }, o || {}); g.releases.push(r); return r; };
const label = id => (KP.conceptById(id) || { label: id }).label.toLowerCase();
const body = (s, sc) => String(say(() => KP.sceneDef('execQuestion').body(s, sc || scene(s))));
// the red weeks, running: the house is behind on what it owes
const behind = (s, weeks) => { s.red = { weeks, arrears: weeks ? 40 : 0, rung: weeks ? 1 : 0, peak: weeks, total: weeks, paid: 0, episodes: weeks ? 1 : 0 }; return s; };
// the suite's own rule for a pass, and its own reading of how far one sound stands from another
const due = (type, redWeeks) => (type === 'execQuarter' && redWeeks > 0 ? 1 : 0);
const NEXT = { bright: ['retro', 'elegant'], elegant: ['bright', 'dreamy', 'retro'], futuristic: ['dark', 'performance', 'hiphop'], dark: ['performance', 'hiphop', 'futuristic'],
  performance: ['dark', 'hiphop', 'futuristic'], hiphop: ['dark', 'performance', 'futuristic'], retro: ['bright', 'elegant', 'dreamy'], dreamy: ['elegant', 'retro'] };
const LANES = Object.keys(NEXT);
const owed = (sound, rec) => (sound === rec ? 'met' : rec === 'fusion' || NEXT[sound].includes(rec) || (NEXT[rec] || []).includes(sound) ? 'metPoorly' : 'missed');
const WORTH = { met: 2, metPoorly: 1, missed: -2 };
// a desk that has promised the trend chaser the sound of the year, in a year whose sound a fixture names
const sounded = (seed, sound) => { const s = world(seed, 'trendChaser'); s.trendOverrides = [{ year: 0, lane: sound, week: 1 }]; const c = promised(s); return { s, c, g: act(s) }; };
const FORECAST = n => '“That is ' + n + ' of my questions running with nothing on the record.” ';

// ---- A. the figures and the shape ---------------------------------------------------------------------
{
  t.ok(typeof KP.execOwnUrgent === 'function', 'the engine carries KP.execOwnUrgent');
  t.eq(JSON.stringify([O.passUrgentTrust, O.nextDoorTrust, O.passAgainTrust, M.payoffTrust, M.missTrust, M.silenceTrust]), JSON.stringify([-1, 1, undefined, 2, -2, -1]),
    'the figures: a pass with the red weeks running costs one, next door to the sound earns one, a kept promise two, a broken one two, silence one; and no figure is left for a run of passes');
  const s = world('nt-shape', 'profitHunter');
  const l = KP.upstairsLedger(s);
  t.eq([l.passedUrgent, l.nextDoor].join('|'), '0|0', 'the ledger carries the two new counts, at nought');
  t.eq(JSON.stringify(LANES.slice().sort()), JSON.stringify(Object.keys(KP.C.TREND.NEIGHBOURS).filter(k => k !== 'fusion').sort()), 'the fixture: the suite’s own table has the house’s eight sounds');
  t.ok(LANES.every(a => JSON.stringify(NEXT[a].slice().sort()) === JSON.stringify(KP.C.TREND.NEIGHBOURS[a].slice().sort())), 'and the same neighbours for each');
}

// ---- B. a pass costs nothing --------------------------------------------------------------------------
{
  Object.keys(KINDS).forEach(k => {
    const s = world('nt-free-' + k, k), X = chair(k).gender === 'm' ? 'He' : 'She';
    const first = pass(s);
    t.ok(first.ok === true && !!first.toast && !first.toast.startsWith('“That is') && s.trust === 55 && counts(s) === '1|0|1|0|0|0|0|0|0', 'a ' + k + ' takes a first pass in words of their own, at no cost (' + first.toast + ' · ' + counts(s) + ')');
    const said = [];
    [40, 50, 60, 70].forEach(w => { s.week = w; said.push(pass(s).toast); });
    t.eq(said.join(' / '), [2, 3, 4, 5].map(n => FORECAST(n === 2 ? 'two' : n) + X + ' said it the way people read out a forecast, and turned to the calendar.').join(' / '),
      'the second, third, fourth and fifth in a row are each said as a run, in the same even words');
    t.eq(s.trust + ' · ' + counts(s), '55 · 5|0|5|4|0|0|0|0|0', 'and five passes in a row have cost a ' + k + '’s desk nothing: four are noted on the ledger as a run, and none against the desk');
  });
  // the red weeks running do not make the other four urgent
  ['traditionalist', 'micromanager', 'trendChaser', 'visionary'].forEach(k => {
    const s = behind(world('nt-red-' + k, k), 6);
    pass(s); s.week = 40; const two = pass(s);
    t.eq(s.trust + ' · ' + counts(s) + ' · ' + two.toast.slice(0, 18), '55 · 2|0|2|1|0|0|0|0|0 · “That is two of my', 'with the red weeks running, a ' + k + '’s question is still no urgent one: two passes, and nothing charged');
  });
}

// ---- C. the one pass that is counted ------------------------------------------------------------------
{
  const s = behind(world('nt-urgent', 'profitHunter'), 1);
  const one = pass(s);
  t.eq([one.toast, s.trust, counts(s)].join(' | '), '“The red weeks are running, and you will not say when they stop.” He wrote that down. Trust -1. | 54 | 1|0|1|0|1|0|0|0|0',
    'the quarter passed on in the first red week costs one, and he says why');
  s.week = 40; behind(s, 9);
  const two = pass(s);
  t.eq([two.toast.slice(0, 27), s.trust, counts(s)].join(' | '), '“The red weeks are running, | 53 | 2|0|2|0|2|0|0|0|0', 'and again the next time, while they run: each such pass is its own, and none is counted as a run');
  // the red weeks stop: a pass is restraint again
  s.week = 50; behind(s, 0);
  const three = pass(s);
  t.eq([three.toast.slice(0, 13), s.trust, counts(s)].join(' | '), '“That is 3 of | 53 | 3|0|3|1|2|0|0|0|0', 'with the red weeks over, the next pass costs nothing');
  // a promise in the red weeks costs nothing to make
  const p = behind(world('nt-urgent-promise', 'profitHunter'), 4);
  const c = promised(p);
  t.eq([c.type, p.trust, counts(p)].join(' | '), 'execQuarter | 55 | 1|1|0|0|0|0|0|0|0', 'putting the quarter on the record in the red weeks costs nothing: only saying nothing about the till does');
  // an empty till alone is not the red weeks
  const e = behind(world('nt-urgent-empty', 'profitHunter'), 0);
  e.budget = 0;
  const ep = pass(e);
  t.eq([ep.toast, e.trust, counts(e)].join(' | '), 'He wrote one word on the pad, and then a smaller word under it. | 55 | 1|0|1|0|0|0|0|0|0', 'an empty till with no red week running is not urgent: the ladder is what counts, and the player has its letters');
  // it is the morning of the answer that counts, not of the question
  const late = world('nt-urgent-late', 'profitHunter');
  ask(late); behind(late, 2);
  t.eq(answer(late, 'pass').toast.slice(0, 27) + ' | ' + late.trust, '“The red weeks are running, | 54', 'a question asked in a clean week and passed on in a red one is counted');
  const cleared = behind(world('nt-urgent-cleared', 'profitHunter'), 3);
  ask(cleared); behind(cleared, 0);
  t.eq(answer(cleared, 'pass').toast.slice(0, 22) + ' | ' + cleared.trust, 'He wrote one word on t | 55', 'and one asked in a red week and passed on once the house is clear is not');
  // the floor
  const z = behind(world('nt-urgent-floor', 'profitHunter'), 5);
  z.trust = 0; pass(z);
  t.eq(z.trust + ' · ' + led(z).passedUrgent, '0 · 1', 'trust does not go under its floor, and the pass is still counted on the ledger');
  // the rule, by the suite's own table: every kind of question, clean, in the first red week and in the twelfth
  const tab = [], want = [];
  const urgent = (x, q) => say(() => KP.execOwnUrgent(x, q));
  TYPES.forEach(ty => [0, 1, 12].forEach(w => { const x = behind(world('nt-rule', 'patient'), w); tab.push(urgent(x, { type: ty }) === true ? 1 : urgent(x, { type: ty }) === false ? 0 : '?'); want.push(due(ty, w)); }));
  t.eq(tab.join(''), want.join(''), 'KP.execOwnUrgent agrees with the suite’s own rule for each of the five questions, clean and in the red weeks');
  const bare = world('nt-rule-bare', 'profitHunter'); delete bare.red;
  const noRed = urgent(bare, { type: 'execQuarter' }), wrote = 'red' in bare;
  t.eq([noRed, wrote, urgent(behind(bare, 3), null), urgent(bare, { type: 'readyTrainee' })].join('|'), 'false|false|false|false',
    'a file with no red counter is not urgent, and asking writes none on it; no question, or one of the older questions, is never urgent');
}

// ---- D. the question says what a pass costs -----------------------------------------------------------
{
  Object.keys(KINDS).forEach(k => {
    const s = world('nt-body-' + k, k); ask(s);
    t.ok(body(s).endsWith('” Your answer goes on the record — and the record gets checked. A pass costs nothing.'), 'a ' + k + '’s question says that a pass costs nothing (' + body(s).slice(-60) + ')');
  });
  const s = behind(world('nt-body-red', 'profitHunter'), 2); ask(s);
  t.ok(body(s).endsWith('” Your answer goes on the record — and the record gets checked. The red weeks are running: a pass will be counted against you.'), 'the quarter’s, in the red weeks, says that a pass will be counted (' + body(s).slice(-70) + ')');
  behind(s, 0);
  t.ok(body(s).endsWith(' A pass costs nothing.'), 'and says the other once they are over: it is read each time the Desk is drawn');
  ['readyTrainee', 'secondGroup', 'soloQuestion'].forEach(ty => {
    const b = body(s, { kind: 'execQuestion', q: { type: ty, text: 'Which?', options: [] } });
    t.eq(b, '“Which?” Your answer goes on the record — and the record gets checked.', 'the older question “' + ty + '” says nothing of a pass, as it did');
  });
  // on the Desk
  const D = dom.load();
  const App = D.KP.App, el = D.el;
  const draw = x => { App.state = x; App.mode = 'game'; App.tab = 'desk'; App.view = null; App.deskSub = 'today'; App.render(); return el('screen').innerHTML; };
  const r = behind(world('nt-desk', 'profitHunter'), 3); ask(r);
  const html = String(say(() => draw(r)));
  t.ok(html.includes('The red weeks are running: a pass will be counted against you.') && html.includes('data-opt="pass"') && html.includes('data-opt="promise"'), 'the Desk’s card says so above the two answers');
}

// ---- E. silence costs what it did ---------------------------------------------------------------------
{
  const q = world('nt-silence', 'visionary'); ask(q);
  q.week = scene(q).expiresWeek + 1;
  const note = settle(q).find(n => /No answer is also information/.test(n.text)) || {};
  t.eq([!!note.text, q.trust, counts(q)].join('|'), 'true|54|1|0|0|0|0|0|0|0|0', 'a question left unanswered for its four weeks costs one, as it did: the meeting was stood up, which is no pass');
  const r = behind(world('nt-silence-red', 'profitHunter'), 4); ask(r);
  r.week = scene(r).expiresWeek + 1; settle(r);
  t.eq(r.trust + '|' + led(r).passedUrgent, '54|0', 'and the quarter left unanswered in the red weeks costs that one, and is not counted a second time as a pass');
}

// ---- F. the sound next door ---------------------------------------------------------------------------
{
  // in the year's sound, as it was
  const a = sounded('nt-sound-in', 'retro');
  record(a.g, 40, { conceptId: 'retro', songTitle: 'Sooner' }); a.s.week = 40;
  t.eq([verdict(settle(a.s)).text, a.c.resolved, a.s.trust, counts(a.s)].join('|'), 'CEO Moon Sang-chul: ““Sooner” is retro, in the year of retro. You listened to the market, and the market noticed.”|met|57|1|1|0|0|0|1|0|0|0',
    'a record in the sound of its year keeps the promise in full, for two, in the words it had');
  // next door
  const n = sounded('nt-sound-near', 'retro');
  record(n.g, 40, { conceptId: 'dreamy', songTitle: 'Nearly' }); n.s.week = 40;
  const wire = settle(n.s), v = verdict(wire);
  t.eq(v.text, 'CEO Moon Sang-chul: “The year’s sound is retro. “Nearly” is dreamy / ethereal, which is next door. You heard the market through a wall. I will count that, and I will count it for less.”', 'a record next door is said to be next door, and counted for less');
  t.eq([n.c.resolved, n.s.trust, counts(n.s), led(n.s).types.execSound.met + '/' + led(n.s).types.execSound.missed].join('|'), 'metPoorly|56|1|1|0|0|0|1|1|0|0|1/0', 'the promise is kept in part: one point where a record in the sound earns two, and the ledger counts it kept, next door');
  const crowd = []; for (let i = 0; i < 9; i++) crowd.push({ kind: 'company', priority: 'high', text: 'crowd ' + i });
  t.ok(v.ind === 'execOwnMet' && v.priority === 'critical' && KP.trimWeekNotes(crowd.concat([v]), KP.C.EVENTS.maxInboxPerWeek).includes(v) && n.c.replyText === v.text, 'her sentence is a kept promise’s letter, it lands in a crowded week, and the promise keeps the words');
  // further off, as it was
  const f = sounded('nt-sound-far', 'retro');
  record(f.g, 40, { conceptId: 'dark', songTitle: 'Elsewhere' }); f.s.week = 40;
  t.eq([verdict(settle(f.s)).text, f.c.resolved, f.s.trust, counts(f.s)].join('|'), 'CEO Moon Sang-chul: “The year’s sound is retro. “Elsewhere” is not. You told me it would be.”|missed|53|1|1|0|0|0|0|0|1|0', 'a record further off breaks it, for two, in the words it had');
  // every sound of the year against every kind of record, by the suite's own table
  const got = [], want = [];
  LANES.forEach(sound => LANES.concat(['fusion']).forEach(rec => {
    const x = sounded('nt-sound-grid', sound);
    record(x.g, 40, { conceptId: rec, songTitle: 'Grid' }); x.s.week = 40; settle(x.s);
    got.push(sound + '>' + rec + ':' + x.c.resolved + ':' + (x.s.trust - 55)); want.push(sound + '>' + rec + ':' + owed(sound, rec) + ':' + WORTH[owed(sound, rec)]);
  }));
  t.eq(got.join(' '), want.join(' '), 'for each of the eight sounds and each of the nine kinds of record, the verdict and the trust are the suite’s own: in it, next door, or further off');
  t.eq([want.filter(x => /:met:/.test(x)).length, want.filter(x => /:metPoorly:/.test(x)).length, want.filter(x => /:missed:/.test(x)).length].join('|'), '8|30|34', 'the fixture: eight in the sound, thirty next door, thirty-four further off');
  // a genre-bending record is next door to every sound
  const m = sounded('nt-sound-bend', 'hiphop');
  record(m.g, 40, { conceptId: 'fusion', songTitle: 'Both', fusionOutcome: 'worked' }); m.s.week = 40;
  t.eq(verdict(settle(m.s)).text + '|' + m.c.resolved, 'CEO Moon Sang-chul: “The year’s sound is hip-hop / swagger. “Both” is genre-bending, which is next door. You heard the market through a wall. I will count that, and I will count it for less.”|metPoorly',
    'a genre-bending record stands next door to whatever the year’s sound is');
  // the first record out is the one that counts
  const o = sounded('nt-sound-order', 'retro');
  record(o.g, 44, { conceptId: 'retro', songTitle: 'Later' }); record(o.g, 40, { conceptId: 'elegant', songTitle: 'Sooner' }); o.s.week = 44; settle(o.s);
  t.eq(o.c.resolved + '|' + o.s.trust, 'metPoorly|56', 'a record next door that comes out first is the one judged, though one in the sound follows it');
  // a record that moved the sound is in it
  const sh = sounded('nt-sound-shift', 'retro');
  sh.s.trendOverrides.push({ year: 1, lane: 'dark', week: 50 });   // the year after the question: its sound is the record's own
  record(sh.g, 50, { conceptId: 'dark', songTitle: 'Moved', fusionOutcome: 'shift' }); sh.s.week = 50;
  t.eq(verdict(settle(sh.s)).text + '|' + sh.c.resolved + '|' + sh.s.trust, 'CEO Moon Sang-chul: “I asked you to follow the market. “Moved” moved it instead. I will take that.”|met|57', 'a record that moved the year’s sound to itself keeps the promise in full, as it did');
  // no record inside the year
  const none = sounded('nt-sound-none', 'retro');
  none.s.week = none.c.byWeek + 1;
  t.eq(verdict(settle(none.s)).text + '|' + none.c.resolved + '|' + none.s.trust, 'CEO Moon Sang-chul: “I asked whether our next record would be in the sound of its year. A year on, there has been no next record.”|missed|53', 'a year with no record breaks it, as it did');
  // under the fund's board seat a broken promise costs twice, and next door earns what it earns
  const seat = KP.boardSeatActive;
  KP.boardSeatActive = () => true;
  const bs = sounded('nt-sound-seat', 'retro'), bf = sounded('nt-sound-seat-far', 'retro');
  record(bs.g, 40, { conceptId: 'bright', songTitle: 'Near' }); bs.s.week = 40; settle(bs.s);
  record(bf.g, 40, { conceptId: 'hiphop', songTitle: 'Far' }); bf.s.week = 40; settle(bf.s);
  KP.boardSeatActive = seat;
  t.eq([bs.c.resolved, bs.s.trust, bf.c.resolved, bf.s.trust].join('|'), 'metPoorly|56|missed|51', 'under the fund’s seat a broken promise costs four, as it did, and one kept next door still earns one');
  // under another chair it is set aside, as every promise to a chair's own question is
  const v2 = sounded('nt-sound-chair', 'retro');
  const nx = chair('visionary');
  v2.s.executive = { name: nx.name, gender: nx.gender, personality: nx.personality, intro: nx.intro, since: 35 };
  record(v2.g, 40, { conceptId: 'dreamy' }); v2.s.week = 40;
  t.eq([settle(v2.s).length, v2.c.resolved, v2.s.trust, led(v2.s).nextDoor].join('|'), '0|void|55|0', 'a promise made to the chair who left is set aside under the next, next door or not');
  // the handover's count, and the Record tab
  const rec = say(() => KP.chairRecord(n.s, 'CEO Moon Sang-chul'));
  t.eq([rec.promises, rec.promisesKept, rec.promisesBroken].join('|'), '1|1|0', 'the file a chair leaves counts a promise kept next door among the kept');
  const D = dom.load();
  const App = D.KP.App, el = D.el;
  App.state = n.s; App.mode = 'game'; App.tab = 'desk'; App.view = null; App.deskSub = 'record'; App.render();
  const html = el('screen').innerHTML;
  t.ok(html.includes('kept, barely') && html.includes('which is next door'), 'the Record tab shows it kept, barely, over her words');
}

// ---- G. an older file ---------------------------------------------------------------------------------
{
  const s = world('nt-old', 'profitHunter');
  pass(s); s.week = 40; pass(s);
  const o = JSON.parse(KP.serialize(s));
  o.version = '0.11.50';
  delete o.upstairsLedger.passedUrgent; delete o.upstairsLedger.nextDoor;
  o.upstairsLedger.passedTwice = 3; o.trust = 52;   // as an older version left it: three passes charged
  const back = KP.deserialize(JSON.stringify(o));
  const l = KP.upstairsLedger(back);
  t.eq([back.version, back.trust, l.passedTwice, l.passedUrgent, l.nextDoor, JSON.stringify(back.execPass), KP.validateState(back).length].join('|'), KP.C.VERSION + '|52|3|0|0|{"name":"CEO Kang Min-ho","run":2,"week":40}|0',
    'an older file keeps what it was charged and its count of passes in a row; the new counts start at nought, and nothing is paid back');
  back.week = 50;
  const next = pass(back);
  t.eq(next.toast.slice(0, 14) + '|' + back.trust + '|' + l.passedTwice, '“That is 3 of |52|4', 'its next pass in the run is said, and costs nothing');
}

// ---- H. real weeks ------------------------------------------------------------------------------------
{
  // a desk that passes on every question of its chair's own, for two hundred real weeks. The suite stands at each
  // answer: the trust before it and after it, and the red weeks that morning, read off the file
  const run = (seed, kind, weeks, red) => {
    SAY = null;
    const s = KP.newGame(seed, null, {});
    const e = chair(kind);
    s.executive = { name: e.name, gender: e.gender, personality: e.personality, intro: e.intro, since: 1 };
    s.budget = 1e6;
    const bad = [], seen = { passes: 0, urgent: 0, promises: 0 };
    for (let i = 0; i < weeks; i++) {
      // the red weeks, for a stretch: the house is put behind, and kept alive
      if (red && s.week >= red[0] && s.week <= red[1]) behind(s, Math.min(9, s.week - red[0] + 1)); else if (red && s.week === red[1] + 1) behind(s, 0);
      const sc = scene(s);
      if (sc && TYPES.includes(sc.q.type)) {
        const was = s.trust, weeksRed = s.red ? s.red.weeks : 0, stale = KP.execOwnOvertaken(s, sc.q);
        const r = answer(s, 'pass');
        if (!stale) {
          seen.passes++; seen.urgent += due(sc.q.type, weeksRed);
          if (was - s.trust !== Math.min(was, due(sc.q.type, weeksRed))) bad.push('week ' + s.week + ': a pass on ' + sc.q.type + ' cost ' + (was - s.trust) + ' with ' + weeksRed + ' red weeks (' + r.toast + ')');
        }
      } else if (sc) { KP.answerMeeting(s, 0); seen.promises++; }
      const r = say(() => KP.advanceWeek(s));
      if (typeof r === 'string') { bad.push('week ' + s.week + ' ' + r); break; }
      if (KP.validateState(s).length) bad.push('week ' + s.week + ' ' + KP.validateState(s)[0]);
    }
    SAY = 0;
    if (s.week !== weeks + 1) bad.push('the career stopped at week ' + s.week);
    return { s, bad, seen };
  };
  Object.keys(KINDS).forEach(k => {
    const a = run('nt-weeks-' + k, k, 200, null), up = led(a.s);
    t.ok(a.bad.length === 0 && a.seen.passes >= 3 && up.passed === a.seen.passes && up.passedUrgent === 0 && up.promised === 0,
      'two hundred real weeks under a ' + k + ', passing every time: ' + a.seen.passes + ' passes, and not one moved trust (' + (a.bad[0] || counts(a.s)) + ')');
  });
  const r = run('nt-weeks-red', 'profitHunter', 120, [38, 62]), up = led(r.s);
  t.ok(r.bad.length === 0 && r.seen.urgent >= 1 && r.seen.passes > r.seen.urgent && up.passedUrgent === r.seen.urgent && up.passed === r.seen.passes,
    'a hundred and twenty real weeks under the profit hunter with the red weeks running from week 38 to 62: ' + r.seen.passes + ' passes, ' + r.seen.urgent + ' of them in the red weeks and each charged one, the others nothing (' + (r.bad[0] || counts(r.s)) + ')');
}

// ---- I. the tools -------------------------------------------------------------------------------------
{
  const h = fs.readFileSync(path.join(__dirname, '..', 'tools', 'harness.js'), 'utf8');
  t.ok(/a pass without a toll \(v0\.11\.51\)/.test(h) && /and by this tool’s own rule it costs/.test(h) && /the ledger counts .* and this tool noted/.test(h), 'the census keeps its own note of each pass, with the till’s ladder that morning, and holds the cost and the ledger to it');
  t.ok(/the sound next door \(v0\.11\.51\)/.test(h) && /and by this tool’s own reading of the record it is owed/.test(h) && /is ' \+ \(near \? '' : 'not '\) \+ 'said to be next door/.test(h), 'and stands either side of the stage door with its own reading of each record judged, and of what is said');
}

t.finish();
