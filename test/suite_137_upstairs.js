/* Suite 137 — her own questions (v0.11.27, §119: the people upstairs, part one).
   More than half the Monday meetings had nothing to ask, and the
   executive's personality was never read. With nothing else on the agenda
   she asks the question her kind of executive asks: the profit hunter about
   the quarter, the traditionalist about the best voice in the room, the
   micromanager about a trainee by name, the trend chaser about the sound of
   the year, the visionary about the one group people remember. A patient
   executive asks nothing. A promise goes on the record and is checked; a
   pass is free once.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   letter fails by name. */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const desk = require('../tools/desk_count');
const KP = loadEngine();
const t = makeT('suite_137_upstairs');
const M = KP.C.MEETING, O = M.OWN || {};

// ---- the kit ------------------------------------------------------------------
// each question is a family of three wordings, picked by hash (§93). A fixture
// forces the first, so a check can read a sentence; SAY = null is the real pick
let SAY = 0;
const realLineFor = KP.lineFor;
KP.lineFor = function (state, salt, lines, last) { return SAY != null && /^execOwn\|/.test(String(salt)) ? lines[SAY] : realLineFor.apply(this, arguments); };
const saying = (i, fn) => { const was = SAY; SAY = i; try { return fn(); } finally { SAY = was; } };
const TYPES = ['execQuarter', 'execVoice', 'execByName', 'execSound', 'execRemember'];
const KINDS = { profitHunter: 'execQuarter', traditionalist: 'execVoice', micromanager: 'execByName', trendChaser: 'execSound', visionary: 'execRemember' };
const when = w => KP.weekLabel(w).text;
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const chair = k => KP.DATA.executives.find(e => e.personality === k) || {};
const room = s => KP.freeTrainees(s).map(id => s.people[id]);
const act = s => KP.groups(s)[0];
const led = s => s.upstairsLedger || { types: {} };
const counts = s => ['asked', 'promised', 'passed', 'passedTwice', 'overtaken', 'met', 'missed', 'void'].map(k => led(s)[k]).join('|');
const byType = (s, k) => { const r = led(s).types[k] || {}; return [r.asked, r.met, r.missed].join('|'); };
const scene = s => (s.scenes || []).find(x => x.kind === 'execQuestion') || null;
const qOf = s => (scene(s) || {}).q || {};
const own = s => (s.claims || []).filter(c => TYPES.includes(c.type));
const openOwn = s => own(s).filter(c => !c.resolved);
const lands = n => { const crowd = []; for (let i = 0; i < 9; i++) crowd.push({ kind: 'company', priority: 'high', text: 'crowd ' + i }); return !!(n && n.text) && KP.trimWeekNotes(crowd.concat([n]), KP.C.EVENTS.maxInboxPerWeek).includes(n); };
// a world in week 30 under one kind of executive, with the two older
// questions shut: the second lineup already asked, a readiness promise standing
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
  // the sheet of week 28: the room in order, the one the old promise names at the top
  r.forEach((p, i) => { p.evalHistory = [{ week: 28, rank: i === r.length - 1 ? 1 : r.length - i, of: r.length }]; p.talents.vocals.cur = 40 + i; });
  r[0].talents.vocals.cur = 90;
  return s;
}
// the meeting, this week. The desk answers in the same week: the week turns
// at the start of the next advance, before anything in it happens
const ask = s => { s.nextMeetingWeek = s.week; return say(() => KP.meetingWeek(s)); };
const answer = (s, opt) => { const sc = scene(s); return sc ? KP.resolveScene(s, sc.id, opt) : { ok: false, reason: 'no question on the table' }; };
// ask, and put it on the record: the claim, or an empty object
const promised = s => { ask(s); answer(s, 'promise'); return openOwn(s)[0] || {}; };
// the stage door's week: scenes expire, promises are checked. Returns the wire
function settle(s) {
  const inbox = [];
  const r = say(() => { KP.weeklyPipeline([]).filter(p => p.name === 'stageDoor').forEach(p => p.fn(s, KP.rngFor(s), inbox, s.roster.map(id => s.people[id]), KP.groups(s))); });
  if (typeof r === 'string') inbox.push({ text: r });
  return inbox;
}
const verdict = inbox => inbox.find(n => n.ind === 'execOwnMet' || n.ind === 'execOwnMissed') || {};
// the one a promise names, or a stand-in nobody could mistake for her: a check that needs her fails by name
const NOBODY = () => ({ id: 'nobody', status: 'nobody', talents: { vocals: { cur: 0 } }, evalHistory: [] });
const named = (s, c) => { const p = s.people[c.personId] || NOBODY(); return { s, c, p, N: s.people[c.personId] ? KP.displayName(p) : 'nobody' }; };
const record = (g, week, o) => { const r = Object.assign({ week, songTitle: 'Record ' + week, conceptId: 'bright', reception: 50 }, o || {}); g.releases.push(r); return r; };
const lane = (s, w) => KP.trendLane(s, Math.floor(((w || s.week) - 1) / KP.C.WEEKS_PER_YEAR));
const laneLabel = id => KP.conceptById(id).label.toLowerCase();
const otherLane = (id, far) => KP.C.CONCEPTS.map(c => c.id).find(x => x !== 'fusion' && KP.laneDistance(id, x) === (far ? 2 : 1));

// ---- A. the shape -------------------------------------------------------------
{
  ['execOwnQuestion', 'execOwnOvertaken', 'execOwnKinds', 'execOwnTypes', 'upstairsLedger'].forEach(k => t.ok(typeof KP[k] === 'function', 'the engine carries KP.' + k));
  t.eq(say(() => KP.execOwnKinds().slice().sort().join()), 'micromanager,profitHunter,traditionalist,trendChaser,visionary', 'five kinds of executive ask a question of their own; the patient one is not among them');
  t.eq(say(() => KP.execOwnTypes().join()), TYPES.join(), 'and there are five promises they ask for');
  t.ok(TYPES.every(k => typeof KP.claimCheckFor(k) === 'function'), 'each is a registered promise');
  t.eq(KP.DATA.executives.map(e => e.personality).sort().join(), KP.C.EXEC.personalities.slice().sort().join(), 'every chair in the data has a kind the table knows, and every kind has a chair');
  t.eq([M.everyWeeks, M.quarterWeeks, O.voiceWeeks, O.voiceGain, O.recordWeeks, O.passUrgentTrust, O.nextDoorTrust, O.passAgainTrust, M.payoffTrust, M.missTrust, M.silenceTrust].join('|'), '10|12|24|3|48|-1|1||2|-2|-1',
    'the quarter is twelve weeks, a voice gets half a year and three points, a record gets a year; a pass is counted for one only while the red weeks run, and no run of them costs (v0.11.51, §144); next door to the sound is worth one; kept is worth two and broken costs two');
  t.ok(['execOwnMet', 'execOwnMissed'].every(k => desk.ONE_SHOTS.includes(k)), 'both verdicts are on the list of letters said once');
  const s = KP.newGame('up-shape', null, {});
  t.eq(counts(s), '0|0|0|0|0|0|0|0', 'a new career opens with the ledger upstairs at zero');
  t.eq(TYPES.map(k => byType(s, k)).join(' '), '0|0|0 0|0|0 0|0|0 0|0|0 0|0|0', 'by question too');
}

// ---- B. what each kind asks, through the real meeting -------------------------------------
{
  // the profit hunter: the quarter
  const s = world('up-quarter', 'profitHunter');
  s.budget = 132.4;
  const before = KP.rngFor(s).state();
  const notes = ask(s);
  const q = qOf(s);
  t.eq(q.type, 'execQuarter', 'a profit hunter with nothing else to ask asks about the quarter');
  t.eq(q.text, 'The board counts in quarters, so I do. Twelve weeks from today, is there more in the till than the 132 in it this morning?', 'in his own words, with this morning’s number');
  t.eq([q.week, q.baseline].join('|'), '30|132', 'the question keeps its week and the number');
  t.eq((q.options || []).map(o => o.id + ':' + o.label).join(' / '), 'promise:On the record / pass:Not this quarter', 'two answers, the promise first');
  t.ok(Array.isArray(notes) && notes.length === 1 && notes[0].kind === 'executive' && notes[0].urgent === true &&
    notes[0].text === 'CEO Kang Min-ho, Monday meeting: “' + q.text + '” Your answer goes on the record. The options are on the Desk.', 'the letter is the meeting’s, and quotes it');
  t.eq((scene(s) || {}).expiresWeek, 30 + M.ignoreAfterWeeks - 1, 'the question waits as long as any of hers');
  t.eq([counts(s), byType(s, 'execQuarter')].join(' '), '1|0|0|0|0|0|0|0 1|0|0', 'asked, once, and counted by question');
  t.eq(s.nextMeetingWeek, 30 + M.everyWeeks, 'the meeting keeps its cadence');
  t.eq(JSON.stringify(KP.rngFor(s).state()), JSON.stringify(before), 'and nothing was drawn');
  // an empty till, and a till in the red
  const e = world('up-quarter-empty', 'profitHunter'); e.budget = 0; ask(e);
  t.eq([qOf(e).text, qOf(e).baseline].join('|'), 'The board counts in quarters, so I do. The till is empty this morning. Twelve weeks from today, is it in the black?|0', 'with an empty till he asks whether it will be in the black');
  const r = world('up-quarter-red', 'profitHunter'); r.budget = -12.6; ask(r);
  t.eq([qOf(r).text, qOf(r).baseline].join('|'), 'The board counts in quarters, so I do. The till is 13 in the red this morning. Twelve weeks from today, is it in the black?|0', 'in the red he says by how much, and asks the same');
}
{
  // the traditionalist: the best voice in the trainee room
  const s = world('up-voice', 'traditionalist');
  const best = room(s)[0];
  act(s).members.forEach(id => { s.people[id].talents.vocals.cur = 100; });   // an idol's voice is not in the trainee room
  ask(s);
  const q = qOf(s);
  t.eq([q.type, q.personId].join('|'), 'execVoice|' + best.id, 'a traditionalist asks about the best voice in the trainee room, not the best in the building');
  t.eq(q.text, 'We are known for vocals. ' + KP.displayName(best) + ' has the best voice in the trainee room. Half a year from now, is it a better one?', 'by name');
  t.eq((q.options || []).map(o => o.id + ':' + o.label).join(' / '), 'promise:On the record / pass:A voice takes the time it takes', 'two answers');
  // two voices alike: the same one every time
  const tie = world('up-voice-tie', 'traditionalist');
  const [a, b] = room(tie);
  b.talents.vocals.cur = a.talents.vocals.cur;
  ask(tie);
  t.eq(qOf(tie).personId, [a, b].sort((x, y) => (x.id < y.id ? -1 : 1))[0].id, 'of two voices alike she names the same one every time');
  // an empty room
  const none = world('up-voice-none', 'traditionalist');
  room(none).forEach(p => { p.status = 'released'; });
  const notes = ask(none);
  t.ok(!scene(none) && Array.isArray(notes) && notes.length === 0 && counts(none) === '0|0|0|0|0|0|0|0', 'with nobody in the trainee room she asks nothing');
}
{
  // the micromanager: a trainee by name, from the evaluation sheet
  const s = world('up-name', 'micromanager');
  const [last, fifth] = room(s);
  ask(s);
  const q = qOf(s);
  t.eq([q.type, q.personId, q.rank, q.evalWeek].join('|'), 'execByName|' + last.id + '|6|28', 'a micromanager asks about the lowest name on the last sheet');
  t.eq(q.text, 'I read every evaluation sheet. ' + KP.displayName(last) + ' was number 6 of 6 on the last one. Take a full month. On the sheet after that, is she higher?', 'by name and number');
  t.eq((q.options || []).map(o => o.id + ':' + o.label).join(' / '), 'promise:On the record / pass:The sheet has her where she belongs', 'two answers');
  // a boy on the sheet
  const m = world('up-name-m', 'micromanager');
  room(m)[0].gender = 'm';
  ask(m);
  t.ok((qOf(m).text || '').endsWith('On the sheet after that, is he higher?') && ((qOf(m).options || [])[1] || {}).label === 'The sheet has him where he belongs', 'a boy is asked about as one');
  // her latest sheet, not an old one
  const hist = world('up-name-latest', 'micromanager');
  room(hist)[0].evalHistory = [{ week: 24, rank: 6, of: 6 }, { week: 28, rank: 1, of: 6 }];
  ask(hist);
  t.eq([qOf(hist).personId, qOf(hist).rank].join('|'), room(hist)[1].id + '|5', 'it is her latest sheet that counts');
  // two names level: the same one every time
  const tie = world('up-name-tie', 'micromanager');
  room(tie)[1].evalHistory = [{ week: 28, rank: 6, of: 6 }];
  ask(tie);
  t.eq(qOf(tie).personId, room(tie).slice(0, 2).sort((x, y) => (x.id < y.id ? -1 : 1))[0].id, 'of two names level on the sheet she picks the same one every time');
  // nobody below first, and nobody on a sheet
  const top = world('up-name-top', 'micromanager');
  room(top).forEach(p => { p.evalHistory = [{ week: 28, rank: 1, of: 1 }]; });
  ask(top);
  const bare = world('up-name-bare', 'micromanager');
  room(bare).forEach((p, i) => { if (i % 2) p.evalHistory = []; else delete p.evalHistory; });
  const quiet = ask(bare);
  t.ok(!scene(top) && counts(top) === '0|0|0|0|0|0|0|0', 'with nobody below first she asks nothing');
  t.ok(Array.isArray(quiet) && quiet.length === 0 && !scene(bare), 'and with no sheet printed the meeting is quiet (' + (Array.isArray(quiet) ? 'quiet' : quiet) + ')');
  void fifth;
}
{
  // the trend chaser: the sound of the year
  const s = world('up-sound', 'trendChaser');
  ask(s);
  const q = qOf(s);
  t.eq(q.type, 'execSound', 'a trend chaser asks about the sound of the year');
  t.eq(q.text, 'The market tells you what it wants. This year it wants ' + laneLabel(lane(s, 30)) + '. When our next record lands, is it in the sound of its year?', 'and names it');
  t.eq((q.options || []).map(o => o.id + ':' + o.label).join(' / '), 'promise:On the record / pass:We do not chase the year', 'two answers');
  // nothing to release a record: no act, an act not yet debuted, an act on hiatus
  const gone = world('up-sound-gone', 'trendChaser'); act(gone).retiredWeek = 20; ask(gone);
  const dev = world('up-sound-dev', 'trendChaser'); act(dev).debuted = false; ask(dev);
  const away = world('up-sound-away', 'trendChaser'); act(away).hiatus = { since: 20 }; ask(away);
  const empty = world('up-sound-empty', 'trendChaser'); act(empty).members = []; ask(empty);
  t.eq([!!scene(gone), !!scene(dev), !!scene(away), !!scene(empty)].join('|'), 'false|false|false|false', 'with no act that could release a record he asks nothing: none standing, none debuted, the only one on hiatus, or with nobody in it');
}
{
  // the visionary: the one group people remember
  const s = world('up-remember', 'visionary');
  const g = act(s);
  const second = JSON.parse(JSON.stringify(g));
  Object.assign(second, { id: 'g-second', name: 'SECOND', popularity: (g.popularity || 0) + 30, members: ['nobody'] });
  s.groups.push(second);
  ask(s);
  const q = qOf(s);
  const last = second.releases[second.releases.length - 1];
  t.eq([q.type, q.groupId, q.count].join('|'), 'execRemember|g-second|' + second.releases.length, 'a visionary asks about the act the public knows best');
  t.eq(q.text, 'I need one group people remember. SECOND’s last record, “' + last.songTitle + '”, is where the bar is. Does the next one land harder?', 'and names its last record');
  t.eq((q.options || []).map(o => o.id + ':' + o.label).join(' / '), 'promise:On the record / pass:Nobody can promise a record', 'two answers');
  // the best known has no record, or is on hiatus: the next one
  const bare = world('up-remember-bare', 'visionary');
  bare.groups.push(Object.assign(JSON.parse(JSON.stringify(act(bare))), { id: 'g-bare', name: 'BARE', popularity: 99, members: ['nobody'], releases: [] }));
  ask(bare);
  const away = world('up-remember-away', 'visionary');
  away.groups.push(Object.assign(JSON.parse(JSON.stringify(act(away))), { id: 'g-away', name: 'AWAY', popularity: 99, members: ['nobody'], hiatus: { since: 20 } }));
  ask(away);
  t.eq([qOf(bare).groupId, qOf(away).groupId].join('|'), act(bare).id + '|' + act(away).id, 'an act with no record, or on hiatus, is passed over for the next best known');
  const none = world('up-remember-none', 'visionary');
  act(none).releases = [];
  ask(none);
  t.ok(!scene(none), 'with no record out she asks nothing');
  const tie = world('up-remember-tie', 'visionary');
  tie.groups.push(Object.assign(JSON.parse(JSON.stringify(act(tie))), { id: 'g-0', name: 'LEVEL', members: ['nobody'] }));
  ask(tie);
  t.eq(qOf(tie).groupId, [act(tie).id, 'g-0'].sort()[0], 'of two acts as well known she names the same one every time');
  const shelf = world('up-remember-shelf', 'visionary');
  const noShelf = Object.assign(JSON.parse(JSON.stringify(act(shelf))), { id: 'g-new', name: 'NEW', popularity: 99, members: ['nobody'] });
  delete noShelf.releases;
  shelf.groups.push(noShelf);
  const asked = ask(shelf);
  t.ok(Array.isArray(asked) && qOf(shelf).groupId === act(shelf).id, 'an act with no shelf yet is passed over (' + (Array.isArray(asked) ? qOf(shelf).groupId : asked) + ')');
}
{
  // the patient executive asks nothing
  const s = world('up-patient', 'patient');
  const before = JSON.stringify(s);
  t.eq(say(() => KP.execOwnQuestion(s)), null, 'a patient executive has no question of her own');
  const notes = ask(s);
  t.ok(!scene(s) && Array.isArray(notes) && notes.length === 0 && counts(s) === '0|0|0|0|0|0|0|0', 'and the Monday meeting stays quiet');
  s.nextMeetingWeek = JSON.parse(before).nextMeetingWeek;
  if (s.nextMeetingWeek === undefined) delete s.nextMeetingWeek;
  t.eq(JSON.stringify(s), before, 'and nothing but the date of the next meeting moved');
  // asking what she would ask changes nothing, for any kind
  Object.keys(KINDS).forEach(k => {
    const w = world('up-pure-' + k, k);
    const snap = JSON.stringify(w);
    const q = say(() => KP.execOwnQuestion(w));
    t.ok(q && q.type === KINDS[k] && JSON.stringify(w) === snap, 'what a ' + k + ' would ask can be read without changing the file');
  });
}
{
  // the older questions come first
  const solo = world('up-first-solo', 'profitHunter');
  const g = act(solo);
  solo.gravityExecAsk = { personId: g.members[0], groupId: g.id };
  ask(solo);
  t.eq(qOf(solo).type, 'soloQuestion', 'the board’s solo question is asked before one of her own');
  const ready = world('up-first-ready', 'profitHunter');
  ready.claims = [];
  act(ready).retiredWeek = 20;
  ask(ready);
  t.eq(qOf(ready).type, 'readyTrainee', 'so is whose debut lands first');
  const second = world('up-first-second', 'profitHunter');
  second.secondGroupAsked = false;
  let w = 30;
  while (w < 400 && KP.hash01([second.seed, 'meeting2', w].join('|')) >= 0.5) w++;
  second.week = w;
  ask(second);
  t.eq(qOf(second).type, 'secondGroup', 'and when the second lineup forms');
  t.eq([counts(solo), counts(ready), counts(second)].join(' '), '0|0|0|0|0|0|0|0 0|0|0|0|0|0|0|0 0|0|0|0|0|0|0|0', 'none of those is counted as hers');
  // under the fund's board seat the meeting comes twice as often, hers included
  const seat = world('up-seat', 'profitHunter');
  seat.financing = Object.assign({}, seat.financing, { board: { fund: 'Fund', until: 400 } });
  ask(seat);
  t.eq([qOf(seat).type, seat.nextMeetingWeek].join('|'), 'execQuarter|' + (30 + Math.ceil(M.everyWeeks / 2)), 'under the board seat the meeting comes twice as often, and she still asks');
}

// ---- C. the answer ------------------------------------------------------------------------
{
  // on the record: the quarter
  const s = world('up-promise-quarter', 'profitHunter');
  s.budget = 132;
  ask(s);
  const r = answer(s, 'promise');
  const c = openOwn(s)[0] || {};
  t.ok(r.ok === true && !scene(s), 'the promise is taken and the question leaves the Desk');
  t.eq(r.toast, 'On the record: more in the till than 132 at the quarter’s end. Due ' + when(42) + '.', 'the toast says what was promised and when it is due');
  t.eq([c.type, c.subject && c.subject.kind, c.byWeek, c.baseline, c.askedWeek, c.execName, c.week, c.resolved].join('|'), 'execQuarter|exec|42|132|30|CEO Kang Min-ho|30|',
    'it is a promise to the executive, due twelve weeks after the question, held to that morning’s number');
  t.eq(c.label, 'more in the till than 132 at the quarter’s end', 'with the words the Desk lists it under');
  t.eq([counts(s), s.trust].join(' '), '1|1|0|0|0|0|0|0 55', 'counted as put on the record; a promise costs nothing until it is judged');
  const talk = (s.convoLog || [])[0] || {};
  t.eq([talk.answer, talk.reply].join('|'), 'On the record|' + r.toast, 'and the conversation is kept');
  const slow = world('up-promise-slow', 'profitHunter'); slow.budget = 132;
  ask(slow); slow.week = 32;
  const rs = answer(slow, 'promise');
  const cs = openOwn(slow)[0] || {};
  t.eq([cs.byWeek, cs.week, rs.toast].join('|'), '42|32|On the record: more in the till than 132 at the quarter’s end. Due ' + when(42) + '.', 'answered two weeks late, the quarter still closes twelve weeks after the question');
  const e = world('up-promise-black', 'profitHunter'); e.budget = -4;
  const ce = promised(e);
  t.eq([ce.label, ce.baseline].join('|'), 'the till in the black at the quarter’s end|0', 'from the red, the promise is the black');
}
{
  // on the record: the voice, the name, the sound, the record
  const v = world('up-promise-voice', 'traditionalist');
  ask(v);
  v.week = 32; room(v)[0].talents.vocals.cur = 91;   // answered two weeks late, after two weeks of lessons
  const rv = answer(v, 'promise');
  const cv = openOwn(v)[0] || {};
  t.eq([cv.type, cv.personId, cv.baseline, cv.byWeek, cv.label].join('|'), ['execVoice', room(v)[0].id, 91, 32 + O.voiceWeeks, KP.displayName(room(v)[0]) + '’s voice, a better one in half a year'].join('|'),
    'the voice is held to what it was the day of the answer, half a year from that day');
  t.eq(rv.toast, 'On the record: ' + cv.label + '. Due ' + when(32 + O.voiceWeeks) + '.', 'and the toast says so');
  const n = world('up-promise-name', 'micromanager');
  const cn = promised(n);
  const sheet = KP.nextEvalWeek(n, 30 + KP.C.EVAL.every);
  t.eq([cn.type, cn.personId, cn.rank, cn.byWeek, cn.label].join('|'), ['execByName', room(n)[0].id, 6, sheet, KP.displayName(room(n)[0]) + ', higher than number 6 on the evaluation sheet'].join('|'),
    'the name is held to the first sheet a full month after the answer');
  t.ok(sheet >= 34 && sheet < 38 && sheet % KP.C.EVAL.every === KP.evalPhase(n), 'which is a week a sheet is printed, four to seven weeks on');
  const so = world('up-promise-sound', 'trendChaser');
  const cs = promised(so);
  t.eq([cs.type, cs.byWeek, cs.askedWeek, cs.label].join('|'), 'execSound|' + (30 + O.recordWeeks) + '|30|our next record, in the sound of its year', 'the sound is held to our next record, with a year to arrive');
  const re = world('up-promise-record', 'visionary');
  const g = act(re);
  const cr = promised(re);
  t.eq([cr.type, cr.groupId, cr.count, cr.baseline, cr.byWeek, cr.label].join('|'),
    ['execRemember', g.id, g.releases.length, g.releases[g.releases.length - 1].reception, 30 + O.recordWeeks, g.name + '’s next record, landing harder than the last'].join('|'),
    'the record is held to how the last one landed');
  [v, n, so, re].forEach(w => t.ok(openOwn(w).length === 1 && openOwn(w)[0].execName === w.executive.name && openOwn(w)[0].subject.kind === 'exec', w.executive.personality + ': the promise is to this chair'));
}
{
  // a pass, in each one's voice
  const LINES = {
    profitHunter: 'He wrote one word on the pad, and then a smaller word under it.',
    traditionalist: 'She nodded slowly. “It does. I asked what this building is doing with the time.”',
    micromanager: 'She made a small mark next to the name. The mark was not explained.',
    trendChaser: 'He looked at the chart on the wall for a while. “Then we had better be right about next year.”',
    visionary: 'She accepted that, the way people accept a weather forecast.',
  };
  Object.keys(LINES).forEach(k => {
    const s = world('up-pass-' + k, k);
    ask(s);
    const r = answer(s, 'pass');
    t.ok(r.ok === true && r.toast === LINES[k] && !scene(s) && openOwn(s).length === 0 && s.trust === 55 && counts(s) === '1|0|1|0|0|0|0|0',
      'a ' + k + ' takes a first pass without a promise and without a charge (' + (r.toast || r.reason) + ')');
  });
}
{
  // a second pass in a row is a pattern
  const s = world('up-pass-twice', 'profitHunter');
  ask(s); answer(s, 'pass');
  t.eq([JSON.stringify(s.execPass), s.trust].join(' '), '{"name":"CEO Kang Min-ho","run":1,"week":30} 55', 'the first pass is remembered and free');
  s.week = 40; ask(s);
  const two = answer(s, 'pass');
  t.eq([two.toast, s.trust, counts(s)].join(' | '), '“That is two of my questions running with nothing on the record.” He said it the way people read out a forecast, and turned to the calendar. | 55 | 2|0|2|1|0|0|0|0', 'the second in a row is said and noted, and costs nothing (v0.11.51, §144)');
  s.week = 50; ask(s);
  const three = answer(s, 'pass');
  t.eq([three.toast, s.trust, counts(s)].join(' | '), '“That is 3 of my questions running with nothing on the record.” He said it the way people read out a forecast, and turned to the calendar. | 55 | 3|0|3|2|0|0|0|0', 'and so is the third');
  // a promise ends the run
  s.week = 60; const c = promised(s);
  t.ok(c.type === 'execQuarter', 'fixture: a promise is put on the record');
  c.resolved = 'met';
  s.week = 70; ask(s);
  const after = answer(s, 'pass');
  t.eq([after.toast, s.trust, (s.execPass || {}).run].join(' | '), 'He wrote one word on the pad, and then a smaller word under it. | 55 | 1', 'after a promise the next pass is a first one again');
  // so does anything else put on her record since
  const o = world('up-pass-other', 'profitHunter');
  ask(o); answer(o, 'pass');
  o.week = 40;
  KP.openClaim(o, { type: 'secondGroup', subject: { kind: 'exec' }, baseline: 9, byWeek: 999 });
  o.week = 41; ask(o);
  t.eq([answer(o, 'pass').toast, o.trust].join(' | '), 'He wrote one word on the pad, and then a smaller word under it. | 55', 'a promise of another kind made to her since ends the run too');
  // a promise made to somebody else does not
  const p = world('up-pass-idol', 'profitHunter');
  ask(p); answer(p, 'pass');
  p.week = 40;
  KP.openClaim(p, { type: 'secondGroup', subject: { kind: 'idol', id: room(p)[0].id }, baseline: 9, byWeek: 999 });
  p.week = 41; ask(p);
  t.eq([(answer(p, 'pass').toast || '').slice(0, 18), p.trust].join(' | '), '“That is two of my | 55', 'a promise made to somebody else does not');
  // a new chair starts her own count
  const n = world('up-pass-chair', 'profitHunter');
  ask(n); answer(n, 'pass');
  const next = chair('traditionalist');
  n.executive = { name: next.name, gender: next.gender, personality: next.personality, intro: next.intro, since: 35 };
  n.week = 40; ask(n);
  t.eq([answer(n, 'pass').toast, n.trust, JSON.stringify(n.execPass)].join(' | '), 'She nodded slowly. “It does. I asked what this building is doing with the time.” | 55 | {"name":"CEO Seo Hae-won","run":1,"week":40}', 'a new chair starts her own count');
  // the floor
  const z = world('up-pass-floor', 'profitHunter');
  ask(z); answer(z, 'pass'); z.trust = 0; z.week = 40; ask(z); answer(z, 'pass');
  t.eq(z.trust, 0, 'trust does not go under its floor');
}
{
  // overtaken: what was asked about has already happened, or is gone
  const SAID = { f: 'The question had answered itself before you did. She crossed it off the agenda.', m: 'The question had answered itself before you did. He crossed it off the agenda.' };
  const cases = [
    ['traditionalist', 'the voice was released', s => { s.people[qOf(s).personId].status = 'released'; }],
    ['traditionalist', 'the voice debuted', s => { s.people[qOf(s).personId].status = 'idol'; }],
    ['traditionalist', 'the voice is off the file', s => { delete s.people[qOf(s).personId]; s.roster = s.roster.filter(id => s.people[id]); }],
    ['micromanager', 'the next sheet is already printed', s => { s.people[qOf(s).personId].evalHistory.push({ week: 31, rank: 2, of: 6 }); }],
    ['micromanager', 'the name was released', s => { s.people[qOf(s).personId].status = 'released'; }],
    ['micromanager', 'the name has no sheet left', s => { s.people[qOf(s).personId].evalHistory = []; }],
    ['trendChaser', 'the next record is already out', s => { record(act(s), 31); }],
    ['trendChaser', 'no act is left standing', s => { act(s).retiredWeek = 31; }],
    ['visionary', 'the next record is already out', s => { record(act(s), 31); }],
    ['visionary', 'the act has taken its last bow', s => { act(s).retiredWeek = 31; }],
    ['visionary', 'the act is off the file', s => { s.groups = []; }],
  ];
  cases.forEach(([k, what, change], i) => {
    ['promise', 'pass'].forEach(opt => {
      const s = world('up-overtaken-' + i + opt, k);
      ask(s);
      const q = qOf(s);
      t.ok(say(() => KP.execOwnOvertaken(s, q)) === false, k + ', ' + what + ': fixture, the question stands when it is asked');
      s.week = 31;   // the desk let a week go by
      say(() => change(s));
      const snap = JSON.stringify(s);
      const over = say(() => KP.execOwnOvertaken(s, q));
      t.ok(over === true && JSON.stringify(s) === snap, k + ', ' + what + ': the question is overtaken, and reading that changes nothing');
      const r = say(() => answer(s, opt));
      t.ok(r && r.ok === true && r.toast === SAID[chair(k).gender] && openOwn(s).length === 0 && s.trust === 55 && counts(s) === '1|0|0|0|1|0|0|0' && !s.execPass,
        k + ', ' + what + ', answered ' + opt + ': nothing is promised, nothing is charged, and she crosses it off (' + (r && (r.toast || r.reason) || r) + ')');
    });
  });
  // not overtaken: a record out the week of the meeting itself, and anything about the quarter
  const same = world('up-not-overtaken', 'trendChaser');
  record(act(same), 30);
  ask(same);
  t.ok(qOf(same).type === 'execSound' && say(() => KP.execOwnOvertaken(same, qOf(same))) === false, 'a record out before the meeting sat down is not the next record');
  const qu = world('up-not-overtaken-q', 'profitHunter');
  ask(qu); qu.budget = -500;
  t.ok(qOf(qu).type === 'execQuarter' && say(() => KP.execOwnOvertaken(qu, qOf(qu))) === false, 'and the quarter is never overtaken');
  const vo = world('up-not-overtaken-v', 'traditionalist');
  ask(vo);
  const voiced = vo.people[qOf(vo).personId] || NOBODY();
  voiced.evalHistory = [];
  t.ok(qOf(vo).type === 'execVoice' && say(() => KP.execOwnOvertaken(vo, qOf(vo))) === false, 'a voice is not asked about by the sheet, and no sheet overtakes it');
  const dv = world('up-not-overtaken-d', 'trendChaser');
  ask(dv);
  dv.groups.push({ id: 'g-dev', name: 'DEV', members: ['nobody'], debuted: false });
  t.ok(qOf(dv).type === 'execSound' && say(() => KP.execOwnOvertaken(dv, qOf(dv))) === false, 'a lineup that has never released anything does not trip the read');
}
{
  // the old door still works, and silence is still an answer
  const s = world('up-shim', 'profitHunter');
  ask(s);
  t.eq([KP.answerMeeting(s, 2).ok, KP.answerMeeting(s, 0).ok, openOwn(s).length].join('|'), 'false|true|1', 'the meeting’s own door takes the first answer as the promise');
  const p = world('up-shim-pass', 'profitHunter');
  ask(p);
  t.eq([KP.answerMeeting(p, 1).ok, openOwn(p).length, counts(p)].join('|'), 'true|0|1|0|1|0|0|0|0|0', 'and the second as the pass');
  const q = world('up-silence', 'profitHunter');
  ask(q);
  q.week = (scene(q) || {}).expiresWeek + 1;
  const wire = settle(q);
  t.ok(!scene(q) && q.trust === 55 + M.silenceTrust && openOwn(q).length === 0 && counts(q) === '1|0|0|0|0|0|0|0' && !q.execPass &&
    wire.some(n => /No answer is also information/.test(n.text || '')), 'left unanswered, the question costs what her silence always cost, and nothing is promised');
}
{
  // one of her promises at a time
  const s = world('up-one', 'profitHunter');
  const c = promised(s);
  s.week = 40;
  t.eq(say(() => KP.execOwnQuestion(s)), null, 'while one of her promises stands she has no new question');
  const notes = ask(s);
  t.ok(!scene(s) && notes.length === 0 && counts(s) === '1|1|0|0|0|0|0|0', 'and the next meeting is quiet');
  c.resolved = 'met';
  s.week = 50; ask(s);
  t.eq([qOf(s).type, counts(s)].join(' '), 'execQuarter 2|1|0|0|0|0|0|0', 'once it is settled she asks again');
}

// ---- D. the verdicts, through the stage door's week ---------------------------------------
{
  // the quarter
  const s = world('up-v-quarter', 'profitHunter');
  s.budget = 132;
  const c = promised(s);
  s.week = 41; s.budget = 999;
  let wire = settle(s);
  t.ok(!c.resolved && wire.length === 0 && s.trust === 55, 'the quarter is not judged before it closes');
  s.week = 42; s.budget = 133;
  wire = settle(s);
  const n = verdict(wire);
  t.eq([c.resolved, c.resolvedWeek, s.trust, counts(s), byType(s, 'execQuarter')].join(' '), 'met 42 57 1|1|0|0|0|1|0|0 1|1|0', 'one more in the till than that morning keeps it: trust up two, counted by question');
  t.eq(n.text, 'CEO Kang Min-ho: “You said the quarter would close above 132. It closed at 133. I like a number that keeps its word.”', 'in his words, with both numbers');
  t.ok(n.ind === 'execOwnMet' && n.kind === 'executive' && n.priority === 'critical' && lands(n) && c.replyText === n.text, 'the letter always lands, and the promise keeps what he said');
  t.eq(settle(s).length, 0, 'and it is said once');
  // the same number is not more
  const e = world('up-v-quarter-even', 'profitHunter');
  e.budget = 132;
  const ce = promised(e);
  e.week = 42;
  const ne = verdict(settle(e));
  t.eq([ce.resolved, e.trust, counts(e), byType(e, 'execQuarter')].join(' '), 'missed 53 1|1|0|0|0|0|1|0 1|0|1', 'the same number is not more: broken, trust down two');
  t.eq(ne.text, 'CEO Kang Min-ho: “You told me in ' + when(30) + ' that the quarter would close above 132. It closed at 132. I read both numbers twice. They did not change.”', 'and he quotes the week it was said');
  t.ok(ne.ind === 'execOwnMissed' && ne.kind === 'executive' && ne.priority === 'critical' && lands(ne) && ce.replyText === ne.text, 'that letter always lands too');
  const f = world('up-v-quarter-fraction', 'profitHunter'); f.budget = 132;
  const cf = promised(f); f.week = 42; f.budget = 132.4;
  t.eq([(verdict(settle(f)).text || '').split('. ').slice(1, 2).join(), cf.resolved].join('|'), 'It closed at 132|missed', 'the till is read in whole units at the close, as it was at the question');
  // from the red
  const b = world('up-v-quarter-black', 'profitHunter'); b.budget = -4;
  const cb = promised(b); b.week = 42; b.budget = 5;
  t.eq([verdict(settle(b)).text, cb.resolved].join('|'), 'CEO Kang Min-ho: “You said the quarter would close in the black. It closed at 5. I like a number that keeps its word.”|met', 'from the red, the black keeps it');
  const r = world('up-v-quarter-red', 'profitHunter'); r.budget = -4;
  const cr = promised(r); r.week = 42; r.budget = 0;
  t.eq([verdict(settle(r)).text, cr.resolved].join('|'), 'CEO Kang Min-ho: “You told me in ' + when(30) + ' that the quarter would close in the black. It closed at 0. I read both numbers twice. They did not change.”|missed', 'and an empty till is not the black');
  // under the board seat a broken promise costs twice; the ends of the scale hold
  const seat = world('up-v-seat', 'profitHunter'); seat.budget = 132;
  promised(seat);
  seat.financing = Object.assign({}, seat.financing, { board: { fund: 'Fund', until: 400 } });
  seat.week = 42; settle(seat);
  t.eq(seat.trust, 55 + M.missTrust * 2, 'under the fund’s board seat a broken promise costs twice');
  const top = world('up-v-top', 'profitHunter'); top.budget = 10; promised(top); top.trust = 99; top.week = 42; top.budget = 11; settle(top);
  const bottom = world('up-v-bottom', 'profitHunter'); bottom.budget = 10; promised(bottom); bottom.trust = 1; bottom.week = 42; settle(bottom);
  t.eq([top.trust, bottom.trust].join('|'), '100|0', 'trust stays on its scale');
}
{
  // the voice
  const mk = seed => { const s = world(seed, 'traditionalist'); return named(s, promised(s)); };
  const a = mk('up-v-voice');
  a.p.talents.vocals.cur = a.c.baseline + 30; a.s.week = a.c.byWeek - 1;
  t.ok(settle(a.s).length === 0 && !a.c.resolved, 'a voice is not judged before its half year');
  a.p.talents.vocals.cur = a.c.baseline + O.voiceGain; a.s.week = a.c.byWeek;
  t.eq([verdict(settle(a.s)).text, a.c.resolved, a.s.trust, byType(a.s, 'execVoice')].join('|'),
    'CEO Seo Hae-won: “I sat in on ' + a.N + '’s lesson. Half a year, and it is a better voice. This house still knows how to do the thing it is known for.”|met|57|1|1|0', 'three points better in half a year keeps it');
  const b = mk('up-v-voice-short');
  b.p.talents.vocals.cur = b.c.baseline + O.voiceGain - 1; b.s.week = b.c.byWeek;
  t.eq([verdict(settle(b.s)).text, b.c.resolved, b.s.trust, byType(b.s, 'execVoice')].join('|'),
    'CEO Seo Hae-won: “I sat in on ' + b.N + '’s lesson. It is the voice I heard half a year ago. You told me it would not be.”|missed|53|1|0|1', 'two points is the voice she heard before');
  const d = mk('up-v-voice-debut');
  d.p.status = 'idol';
  t.eq([verdict(settle(d.s)).text, d.c.resolved, d.s.trust].join('|'), 'CEO Seo Hae-won: “' + d.N + ' is on a stage. That is a better answer than the one I asked for.”|met|57', 'a debut keeps it at once');
  const g = mk('up-v-voice-gone');
  g.p.status = 'released';
  t.eq([verdict(settle(g.s)).text, g.c.resolved, g.s.trust].join('|'), 'CEO Seo Hae-won: “I asked about the best voice in the trainee room. ' + g.N + ' is no longer in it. That is an answer, and not the one you gave me.”|missed|53', 'letting her go breaks it at once');
  const x = mk('up-v-voice-off');
  delete x.s.people[x.c.personId]; x.s.roster = x.s.roster.filter(id => x.s.people[id]);
  t.eq([verdict(settle(x.s)).text, x.c.resolved].join('|'), 'CEO Seo Hae-won: “I asked about the best voice in the trainee room. That trainee is no longer in it. That is an answer, and not the one you gave me.”|missed', 'and so does a file that is gone');
}
{
  // the name
  const mk = seed => { const s = world(seed, 'micromanager'); return named(s, promised(s)); };
  const a = mk('up-v-name');
  a.p.evalHistory.push({ week: a.c.byWeek - KP.C.EVAL.every, rank: 1, of: 6 });
  a.s.week = a.c.byWeek - 1;
  t.ok(settle(a.s).length === 0 && !a.c.resolved, 'a sheet before the one she named is not the verdict, whatever it says');
  a.p.evalHistory.push({ week: a.c.byWeek, rank: 4, of: 6 }); a.s.week = a.c.byWeek;
  t.eq([verdict(settle(a.s)).text, a.c.resolved, a.s.trust, byType(a.s, 'execByName')].join('|'),
    'CEO Im Na-ri: “' + a.N + ': number 6 when I asked, number 4 on this sheet. I notice when a name moves.”|met|57|1|1|0', 'higher on that sheet keeps it');
  const b = mk('up-v-name-same');
  b.p.evalHistory.push({ week: b.c.byWeek, rank: 6, of: 6 }); b.s.week = b.c.byWeek;
  t.eq([verdict(settle(b.s)).text, b.c.resolved, b.s.trust].join('|'), 'CEO Im Na-ri: “' + b.N + ': number 6 when I asked, number 6 on this sheet. I notice when a name does not move, too.”|missed|53', 'the same number breaks it');
  const w = mk('up-v-name-worse');
  w.c.rank = 5;
  w.p.evalHistory.push({ week: w.c.byWeek, rank: 6, of: 6 }); w.s.week = w.c.byWeek;
  t.eq([verdict(settle(w.s)).text, w.c.resolved].join('|'), 'CEO Im Na-ri: “' + w.N + ': number 5 when I asked, number 6 on this sheet. That is the wrong direction, and you had a month.”|missed', 'and a lower one has its own sentence');
  // the sheet was not held
  const v = mk('up-v-name-void');
  v.s.week = v.c.byWeek;
  t.ok(settle(v.s).length === 0 && !v.c.resolved, 'the week of the sheet, with no sheet yet, she waits');
  v.s.week = v.c.byWeek + 1;
  t.eq([settle(v.s).length, v.c.resolved, v.s.trust, counts(v.s)].join('|'), '0|void|55|1|1|0|0|0|0|0|1', 'a sheet that was never held judges nobody: set aside, no letter, no charge');
  const d = mk('up-v-name-debut');
  d.p.status = 'idol';
  t.eq([verdict(settle(d.s)).text, d.c.resolved].join('|'), 'CEO Im Na-ri: “' + d.N + ' left the evaluation sheet the only good way. Noted, with pleasure.”|met', 'a debut keeps it at once');
  const g = mk('up-v-name-gone');
  g.p.status = 'released';
  t.eq([verdict(settle(g.s)).text, g.c.resolved].join('|'), 'CEO Im Na-ri: “' + g.N + ' is not on the next sheet at all. I had asked whether the number would improve.”|missed', 'letting her go breaks it at once');
}
{
  // the sound
  const mk = seed => { const s = world(seed, 'trendChaser'); const c = promised(s); return { s, c, g: act(s) }; };
  const a = mk('up-v-sound');
  const home = lane(a.s, 40);
  record(a.g, 30, { conceptId: home });   // out before the meeting: not the next record
  t.ok(settle(a.s).length === 0 && !a.c.resolved, 'a record out before the question is not the next record');
  record(a.g, 44, { conceptId: otherLane(home, true), songTitle: 'Later' });
  record(a.g, 40, { conceptId: home, songTitle: 'Sooner' });
  a.s.week = 44;
  t.eq([verdict(settle(a.s)).text, a.c.resolved, a.s.trust, byType(a.s, 'execSound')].join('|'),
    'CEO Moon Sang-chul: ““Sooner” is ' + laneLabel(home) + ', in the year of ' + laneLabel(home) + '. You listened to the market, and the market noticed.”|met|57|1|1|0', 'the next record in the sound of its year keeps it, and it is the first one out that counts');
  const b = mk('up-v-sound-off');
  record(b.g, 40, { conceptId: otherLane(lane(b.s, 40), true), songTitle: 'Elsewhere' }); b.s.week = 40;
  t.eq([verdict(settle(b.s)).text, b.c.resolved, b.s.trust].join('|'), 'CEO Moon Sang-chul: “The year’s sound is ' + laneLabel(lane(b.s, 40)) + '. “Elsewhere” is not. You told me it would be.”|missed|53', 'a record outside it breaks it');
  const n = mk('up-v-sound-near');
  record(n.g, 40, { conceptId: otherLane(lane(n.s, 40), false), songTitle: 'Nearly' }); n.s.week = 40;
  t.eq(say(() => { settle(n.s); return n.c.resolved + '|' + n.s.trust + '|' + byType(n.s, 'execSound'); }), 'metPoorly|56|1|1|0', 'and next door to the sound keeps it in part, for one (v0.11.51, §144): it was broken');
  // the sound of the record's own year
  const y = mk('up-v-sound-year');
  const now = lane(y.s, 40), nextYear = otherLane(now, true);
  y.s.trendOverrides = [{ year: 1, lane: nextYear, week: 49 }];
  record(y.g, 50, { conceptId: now, songTitle: 'Last Year' }); y.s.week = 50;
  t.eq([verdict(settle(y.s)).text, y.c.resolved].join('|'), 'CEO Moon Sang-chul: “The year’s sound is ' + laneLabel(nextYear) + '. “Last Year” is not. You told me it would be.”|missed', 'a record that lands next year is judged by next year’s sound');
  // a record that moved the sound
  const f = mk('up-v-sound-shift');
  f.s.week = 40;
  KP.shiftTrend(f.s, 'fusion');
  record(f.g, 40, { conceptId: 'fusion', songTitle: 'New Thing', fusionOutcome: 'shift' });
  t.eq([verdict(settle(f.s)).text, f.c.resolved].join('|'), 'CEO Moon Sang-chul: “I asked you to follow the market. “New Thing” moved it instead. I will take that.”|met', 'a record that moves the year’s sound keeps it, and he says which way round it went');
  // any of our acts
  const o = mk('up-v-sound-other');
  const second = Object.assign(JSON.parse(JSON.stringify(o.g)), { id: 'g-second', name: 'SECOND', members: ['nobody'], releases: [] });
  o.s.groups.push(second);
  record(second, 40, { conceptId: lane(o.s, 40), songTitle: 'Theirs' }); o.s.week = 40;
  t.eq(say(() => { settle(o.s); return o.c.resolved; }), 'met', 'our next record is whichever of our acts releases it');
  // no record in a year
  const z = mk('up-v-sound-none');
  z.s.week = z.c.byWeek;
  t.ok(settle(z.s).length === 0 && !z.c.resolved, 'on the last week of the year he is still waiting');
  z.s.week = z.c.byWeek + 1;
  t.eq([verdict(settle(z.s)).text, z.c.resolved].join('|'), 'CEO Moon Sang-chul: “I asked whether our next record would be in the sound of its year. A year on, there has been no next record.”|missed', 'a year with no record breaks it');
}
{
  // the record
  const mk = seed => { const s = world(seed, 'visionary'); const c = promised(s); return { s, c, g: act(s) }; };
  const a = mk('up-v-record');
  const other = Object.assign(JSON.parse(JSON.stringify(a.g)), { id: 'g-second', name: 'SECOND', members: ['nobody'] });
  a.s.groups.push(other);
  record(other, 40, { reception: 99 }); a.s.week = 40;
  t.ok(settle(a.s).length === 0 && !a.c.resolved, 'another act’s record is not the one she asked about');
  record(a.g, 44, { reception: a.c.baseline + 1, songTitle: 'Harder' }); a.s.week = 44;
  t.eq([verdict(settle(a.s)).text, a.c.resolved, a.s.trust, byType(a.s, 'execRemember')].join('|'),
    'CEO Yoon Da-jung: ““Harder” landed harder than the one before it. That is how a group becomes the one people remember: one record at a time.”|met|57|1|1|0', 'the next record landing harder keeps it');
  const two = mk('up-v-record-two');
  record(two.g, 40, { reception: two.c.baseline + 1, songTitle: 'First' });
  record(two.g, 44, { reception: 1, songTitle: 'Second' }); two.s.week = 44;
  t.eq(say(() => { settle(two.s); return two.c.resolved; }), 'met', 'it is the next record that is judged, not the newest');
  const b = mk('up-v-record-even');
  record(b.g, 40, { reception: b.c.baseline, songTitle: 'Level' }); b.s.week = 40;
  t.eq([verdict(settle(b.s)).text, b.c.resolved, b.s.trust].join('|'), 'CEO Yoon Da-jung: ““Level” did not land harder than the one before it. You told me it would.”|missed|53', 'landing level breaks it');
  const r = mk('up-v-record-retired');
  r.g.retiredWeek = 35; r.s.week = 35;
  t.eq([verdict(settle(r.s)).text, r.c.resolved].join('|'), 'CEO Yoon Da-jung: “I asked whether ' + r.g.name + '’s next record would land harder. There was no next record.”|missed', 'an act that takes its last bow first breaks it');
  const z = mk('up-v-record-none');
  z.s.week = z.c.byWeek;
  t.ok(settle(z.s).length === 0 && !z.c.resolved, 'on the last week of the year she is still waiting');
  z.s.week = z.c.byWeek + 1;
  t.eq(say(() => { settle(z.s); return z.c.resolved; }), 'missed', 'a year with no record breaks it');
  const x = mk('up-v-record-off');
  x.s.groups = []; x.s.week = 35;
  t.eq(verdict(settle(x.s)).text, 'CEO Yoon Da-jung: “I asked whether that group’s next record would land harder. There was no next record.”', 'and so does a file that is gone');
}
{
  // a promise made to her question leaves with her chair
  Object.keys(KINDS).forEach(k => {
    const s = world('up-chair-' + k, k);
    const c = promised(s);
    const next = chair(k === 'patient' ? 'visionary' : 'patient');
    s.executive = { name: next.name, gender: next.gender, personality: next.personality, intro: next.intro, since: 31 };
    s.week = 200; s.budget = -999;
    const wire = settle(s);
    t.ok(c.type === KINDS[k] && c.resolved === 'void' && wire.length === 0 && s.trust === 55 && counts(s) === '1|1|0|0|0|0|0|1',
      'a promise made to a ' + k + '’s question is set aside under the next chair: no letter, no charge (' + [c.type, c.resolved, wire.length, s.trust, counts(s)].join(' ') + ')');
  });
  // and the next chair asks her own
  const s = world('up-chair-next', 'profitHunter');
  promised(s);
  const next = chair('visionary');
  s.executive = { name: next.name, gender: next.gender, personality: next.personality, intro: next.intro, since: 31 };
  s.week = 40; settle(s); ask(s);
  t.eq(qOf(s).type, 'execRemember', 'the next chair asks her own question');
}

// ---- E. the Desk ---------------------------------------------------------------------------
{
  const s = world('up-desk', 'profitHunter');
  s.budget = 132;
  ask(s);
  const q = qOf(s);
  const D = dom.load();
  const { App, el } = D;
  const esc = D.UI.esc;
  const render = sub => { App.state = s; App.mode = 'game'; App.tab = 'desk'; App.view = null; App.deskSub = sub || 'today'; App.render(); return el('screen').innerHTML; };
  let html = render();
  t.ok(html.includes(esc('CEO Kang Min-ho is waiting')) && html.includes(esc('“' + q.text + '”')), 'the Desk carries her question');
  const iP = html.indexOf('data-opt="promise">On the record</button>'), iN = html.indexOf('data-opt="pass">Not this quarter</button>');
  t.ok(iP > -1 && iN > iP, 'with its two answers, the promise first');
  D.click({ action: 'scene-opt', scene: (scene(s) || {}).id, opt: 'promise' });
  const c = openOwn(s)[0] || {};
  t.ok(c.type === 'execQuarter' && !scene(s), 'the real button puts it on the record');
  html = render('record');
  t.ok(html.includes('<b>CEO Kang Min-ho</b> holds the receipt: ' + esc('more in the till than 132 at the quarter’s end') + '<span class="m-week">due ' + esc(when(42)) + '</span>'),
    'the Desk lists it under promises on the clock, in words, with its date');
  s.week = 42; s.budget = 200;
  const said = verdict(settle(s)).text || 'no verdict';
  html = render('record');
  t.ok(html.includes('<b>CEO Kang Min-ho</b>: ' + esc('more in the till than 132 at the quarter’s end') + ' <span class="chip cool">kept</span>') && html.includes(esc(said)), 'settled, it reads kept, with what he said');
  // broken, and set aside
  const b = world('up-desk-broken', 'profitHunter'); b.budget = 132;
  promised(b); b.week = 42; settle(b);
  App.state = b;
  const hb = (() => { App.state = b; App.mode = 'game'; App.tab = 'desk'; App.view = null; App.deskSub = 'record'; App.render(); return el('screen').innerHTML; })();
  t.ok(hb.includes(' <span class="chip hot">broken</span>') && !hb.includes('set aside'), 'a broken one reads broken');
  const v = world('up-desk-void', 'profitHunter'); v.budget = 132;
  const cv = promised(v);
  const next = chair('patient');
  v.executive = { name: next.name, gender: next.gender, personality: next.personality, intro: next.intro, since: 31 };
  v.week = 42; settle(v);
  const hv = (() => { App.state = v; App.mode = 'game'; App.tab = 'desk'; App.view = null; App.deskSub = 'record'; App.render(); return el('screen').innerHTML; })();
  t.ok(cv.resolved === 'void' && hv.includes('<b>CEO Kang Min-ho</b>: ' + esc(cv.label || 'no promise') + ' <span class="chip">set aside</span>'), 'one set aside reads set aside, under the chair it was made to');
  t.ok(!hv.includes('<span class="chip hot">broken</span>'), 'and is not called broken');
}

// ---- E2. a reply is read: the toast --------------------------------------------------------
{
  const D = dom.load();
  const waits = [];
  D.sandbox.setTimeout = (fn, ms) => { waits.push(ms); return 0; };
  const shown = msg => { waits.length = 0; D.UI.toast(msg); return waits.join('|'); };
  const line = 'He looked at the chart on the wall for a while. “Then we had better be right about next year.”';
  t.eq(shown('Saved.'), '2200|2600', 'a short toast stays as long as it always did');
  t.eq(shown('x'.repeat(40)), '2200|2600', 'up to forty characters');
  t.eq([line.length, shown(line)].join('|'), '94|4360|4760', 'a reply of a sentence or two stays long enough to read');
  t.eq(shown('x'.repeat(400)), '6000|6400', 'to a ceiling of six seconds');
  t.eq([D.UI.toastMs(null), D.UI.toastMs(undefined), D.UI.toastMs(12345)].join('|'), '2200|2200|2200', 'and a toast with nothing in it is a short one');
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'app.css'), 'utf8');
  const rule = (css.match(/\n\.toast \{[^}]*\}/) || [''])[0];
  t.ok(rule.length > 0 && !/nowrap|ellipsis/.test(rule) && /max-width: 90vw/.test(rule) && /width: max-content/.test(rule), 'the toast wraps inside the screen: it is not cut at one line');
  t.ok(/pointer-events: none/.test(rule), 'and it never takes a tap meant for what is under it');
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'ui', 'components.js'), 'utf8');
  t.ok(src.includes("document.querySelectorAll('.toast').forEach(old => old.remove());"), 'one toast shows at a time');
}

// ---- F. the file ---------------------------------------------------------------------------
{
  const s = world('up-file', 'profitHunter');
  s.budget = 132;
  const c = promised(s);
  const old = JSON.parse(KP.serialize(s));
  old.version = '0.11.26';
  delete old.upstairsLedger;
  old.claims = old.claims.filter(x => x.type === 'readyTrainee');
  const back = KP.deserialize(JSON.stringify(old));
  t.eq([counts(back), TYPES.map(k => byType(back, k)).join(' '), back.version].join(' '), '0|0|0|0|0|0|0|0 0|0|0 0|0|0 0|0|0 0|0|0 0|0|0 ' + KP.C.VERSION, 'an old file opens with the ledger upstairs at zero, at this version');
  back.week = 40; ask(back);
  t.eq(qOf(back).type, 'execQuarter', 'and she asks her question there too');
  // a promise and a waiting question survive a reload, and the verdict still comes
  const again = KP.deserialize(KP.serialize(s));
  t.eq(JSON.stringify(openOwn(again)[0]), JSON.stringify(c), 'a promise is on the file, and comes back with it');
  again.week = 42; again.budget = 500;
  t.eq((verdict(settle(again)).text || '').slice(0, 45), 'CEO Kang Min-ho: “You said the quarter would ', 'and is judged after the reload');
  const waiting = world('up-file-waiting', 'visionary');
  ask(waiting);
  const w2 = KP.deserialize(KP.serialize(waiting));
  t.eq([JSON.stringify(qOf(w2)), answer(w2, 'promise').ok, openOwn(w2).length].join('|'), JSON.stringify(qOf(waiting)) + '|true|1', 'a question waiting on the Desk comes back, and can be answered');
  // a promise from before this version has no chair on it, and is judged as it always was
  const bare = world('up-file-bare', 'profitHunter'); bare.budget = 10;
  const cb = promised(bare);
  delete cb.execName;
  bare.week = 42; bare.budget = 11;
  t.eq(say(() => { settle(bare); return cb.resolved; }), 'met', 'a promise with no chair written on it is judged, not set aside');
  // the tools
  const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const h = read('tools/harness.js'), l = read('tools/audit_longhaul.js');
  t.ok(h.includes("console.log('her own questions: asked ") && ['ownAsked:', 'ownKept:', 'ownBroken:'].every(k => h.includes(k)) && h.includes("'botOwn'"), 'the census prints her questions’ line, holds bands on it, and its bot gives both answers');
  t.ok(h.includes('more answers to her own questions than questions') && h.includes('of her own promises stand at once') && h.includes('a first pass was counted as a second'), 'with its guards');
  t.ok(l.includes("' | upstairs: '") && l.includes('more verdicts on her own promises than promises') && l.includes('a promise made to another chair’s question is still on the clock'), 'the long haul carries it on each scenario’s line, with its flags');
}

// ---- F2. each question is a family of three wordings ---------------------------------------
{
  const mkw = k => { const w = world('up-family-' + k, k); if (k === 'profitHunter') w.budget = 132; return w; };
  const texts = k => [0, 1, 2].map(i => saying(i, () => { const q = say(() => KP.execOwnQuestion(mkw(k))); return q && typeof q === 'object' ? q : {}; }));
  const N = k => KP.displayName(room(mkw(k))[0]);
  const g = act(mkw('visionary'));
  const WANT = {
    profitHunter: ['The board counts in quarters, so I do. ', 'I looked at the account before I sat down. ', 'Eras do not show on a balance sheet. Quarters do. ']
      .map(x => x + 'Twelve weeks from today, is there more in the till than the 132 in it this morning?'),
    traditionalist: ['We are known for vocals. ' + N('traditionalist') + ' has the best voice in the trainee room. ',
      'I stopped at the vocal room door this morning, and it was ' + N('traditionalist') + ' I stopped for. That is the best voice in the trainee room. ',
      'A house is known for one thing at a time, and ours is singing. ' + N('traditionalist') + ' has the best voice in the trainee room. ']
      .map(x => x + 'Half a year from now, is it a better one?'),
    micromanager: ['I read every evaluation sheet. ', 'The evaluation sheets are on my desk, with my notes on them. ', 'I keep every evaluation sheet, in order. ']
      .map(x => x + N('micromanager') + ' was number 6 of 6 on the last one. Take a full month. On the sheet after that, is she higher?'),
    trendChaser: ['The market tells you what it wants. This year it wants ', 'My last building did not listen to the market. This one will. This year it wants ', 'I have the trades open on my desk. This year the market wants ']
      .map(x => x + laneLabel(lane(mkw('trendChaser'), 30)) + '. When our next record lands, is it in the sound of its year?'),
    visionary: ['I need one group people remember. ', 'A group is remembered when each record lands harder than the one before. ', 'I do not need five perfect records. I need the next one to matter. ']
      .map(x => x + g.name + '’s last record, “' + g.releases[g.releases.length - 1].songTitle + '”, is where the bar is. Does the next one land harder?'),
  };
  Object.keys(KINDS).forEach(k => {
    const got = texts(k);
    t.eq(got.map(q => q.text).join(' ~ '), WANT[k].join(' ~ '), 'a ' + k + ' has three ways of asking, and the question itself is the same in all three');
    t.eq(got.map(q => [q.line, 'lines' in q].join(':')).join(), '0:false,1:false,2:false', 'the question says which one it is, and carries only that one');
  });
  // from an empty till, and from the red
  const red = [0, 1, 2].map(i => saying(i, () => { const w = mkw('profitHunter'); w.budget = -13; return (say(() => KP.execOwnQuestion(w)) || {}).text; }));
  t.eq(red.join(' ~ '), ['The board counts in quarters, so I do. ', 'I looked at the account before I sat down. ', 'Eras do not show on a balance sheet. Quarters do. ']
    .map(x => x + 'The till is 13 in the red this morning. Twelve weeks from today, is it in the black?').join(' ~ '), 'and three from the red');
  // the wording does not change what is promised
  const terms = k => [0, 1, 2].map(i => saying(i, () => { const w = mkw(k); const c = Object.assign({}, promised(w)); delete c.id; return JSON.stringify(c); }));
  Object.keys(KINDS).forEach(k => { const tm = terms(k); t.ok(tm[0].length > 20 && tm[0] === tm[1] && tm[1] === tm[2], 'whichever way a ' + k + ' asks, the promise is the same promise'); });
  // the real pick: by the week, all three in time, and never the one she used last
  saying(null, () => {
    const w = mkw('profitHunter');
    const seen = [];
    let repeats = 0, kept = 0;
    for (let i = 0; i < 40; i++) {
      w.week = 30 + i * 10;
      const before = w.execOwnLine;
      ask(w);
      const q = qOf(w);
      if (q.line === before) repeats++;
      if (w.execOwnLine === q.line) kept++;
      seen.push(q.line);
      answer(w, 'pass');
    }
    t.eq([repeats, kept, [...new Set(seen)].sort().join('')].join('|'), '0|40|012', 'over forty meetings she never asks the way she asked last time, and uses all three (' + seen.join('') + ')');
    const a = mkw('profitHunter'), b = mkw('profitHunter');
    a.week = 77; b.week = 77;
    t.eq(say(() => KP.execOwnQuestion(a).text), say(() => KP.execOwnQuestion(b).text), 'the same week of the same career asks the same way');
    const snap = JSON.stringify(a);
    KP.execOwnQuestion(a);
    t.eq(JSON.stringify(a), snap, 'and reading what she would ask does not use the wording up');
  });
}

// ---- G. whole weeks -------------------------------------------------------------------------
{
  SAY = null;   // real weeks, real wording
  const run = (seed, kind, weeks, pick) => {
    const s = KP.newGame(seed, null, {});
    const e = chair(kind);
    s.executive = { name: e.name, gender: e.gender, personality: e.personality, intro: e.intro, since: 1 };
    s.budget = 1e6;   // nobody is running this house: the till keeps it standing
    const bad = [];
    let letters = 0;
    for (let i = 0; i < weeks; i++) {
      const sc = scene(s);
      if (sc) KP.answerMeeting(s, pick(sc, s));
      const r = say(() => KP.advanceWeek(s));
      if (typeof r === 'string') { bad.push('week ' + s.week + ' ' + r); break; }
      letters += (KP.lastTickNotes || []).filter(n => n.ind === 'execOwnMet' || n.ind === 'execOwnMissed').length;
      const up = led(s), open = openOwn(s);
      if (up.promised + up.passed + up.overtaken > up.asked) bad.push('week ' + s.week + ' more answers than questions');
      if (up.met + up.missed + up.void + open.length > up.promised) bad.push('week ' + s.week + ' more verdicts than promises');
      if (open.length > 1) bad.push('week ' + s.week + ' two of her promises at once');
      if (KP.validateState(s).length) bad.push('week ' + s.week + ' ' + KP.validateState(s)[0]);
    }
    if (s.week !== weeks + 1) bad.push('the career stopped at week ' + s.week);
    return { s, bad, letters };
  };
  Object.keys(KINDS).forEach(k => {
    const a = run('up-weeks-' + k, k, 200, () => 0);
    const up = led(a.s);
    t.ok(a.bad.length === 0, 'two hundred weeks under a ' + k + ', promising every time, hold together (' + (a.bad[0] || 'clean') + ')');
    t.ok(up.asked >= 1 && (up.types[KINDS[k]] || {}).asked === up.asked && up.promised >= 1 && up.met + up.missed >= 1 && a.letters === up.met + up.missed,
      'she asked her own question, only hers, and each verdict was a letter (' + counts(a.s) + ', letters ' + a.letters + ')');
    const b = run('up-weeks-' + k, k, 200, () => 0);
    t.eq(JSON.stringify(led(b.s)) + b.s.trust, JSON.stringify(up) + a.s.trust, 'and the same career reads the same twice');
  });
  const p = run('up-weeks-patient', 'patient', 200, () => 0);
  t.ok(p.bad.length === 0 && counts(p.s) === '0|0|0|0|0|0|0|0' && p.letters === 0, 'two hundred weeks under a patient executive: nothing of her own asked (' + counts(p.s) + ')');
  const passer = run('up-weeks-pass', 'trendChaser', 200, sc => (TYPES.includes(sc.q.type) ? 1 : 0));
  const up = led(passer.s);
  t.ok(passer.bad.length === 0 && up.passed >= 2 && up.promised === 0 && up.passedTwice >= 1 && up.passedTwice <= up.passed - 1, 'a desk that passes every time is noted from the second pass on (' + counts(passer.s) + ')');
  t.eq(up.passedUrgent, 0, 'and with no red week running none of those passes is charged');
}

t.finish();
