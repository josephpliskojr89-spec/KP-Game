/* Suite 155 — the handover, inherited in part (v0.11.50, §143; the owner's
   ruling, §136: 10 and 29). When the chair changes hands the desk starts
   with the next one at the house's starting trust, moved by a part of how
   far it stood from that with the chair who left, and by no more than a cap
   either way: the relationship that ended matters, and the new one can still
   be built. The lowest start is the line where the board will hear a pitch.
   The letter and the first meeting say how it begins: well, warily, or the
   hard way, read from where the desk starts and from the word the last
   chair left for it.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   sentence fails by name; nothing here can crash or hang under a broken
   engine. */
'use strict';
const fs = require('fs'), path = require('path');
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_155_inherited');

// ---- the kit ------------------------------------------------------------------
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const js = x => JSON.stringify(x);
const obj = x => (x && typeof x === 'object' ? x : { threw: String(x) });
// a salaried desk in a week past any chair's era, its founding directive settled, trust where a fixture puts it
const desk = (seed, week, trust) => { const s = KP.newGame(seed, null, {}); s.week = week; s.objective.status = 'met'; s.trust = trust; s.executive.since = 1; s.scenes = []; s.claims = []; return s; };
const filed = (s, week, exec, band) => { s.reviews = (s.reviews || []).concat([{ year: 1, week, exec, trust: 50, band, till: 100, sheets: 0, said: 'x' }]); return s; };
const phase = name => KP.weeklyPipeline([]).filter(p => p.name === name)[0] || { fn: () => { throw new Error('no phase ' + name); } };
// the real rail: the chair changes hands, and what it wrote
const succeed = s => { const inbox = []; const r = say(() => phase('timeShare').fn(s, KP.rngFor(s), inbox, s.roster.map(id => s.people[id]), KP.groups(s))); return typeof r === 'string' ? [{ ind: 'threw', text: r }] : inbox; };
const meeting = s => (s.scenes || []).find(x => x.kind === 'newChair') || { rated: 'no first meeting on the Desk', begins: 'no first meeting on the Desk' };
const body = (s, sc) => String(say(() => KP.sceneDef('newChair').body(s, sc)));
const letter = inbox => (inbox.find(n => n.ind === 'newChair') || { text: 'no letter: ' + inbox.map(n => n.ind).join() }).text;
const tail = text => text.slice(text.indexOf('file ') < 0 ? 0 : text.lastIndexOf('”. ') + 3);   // what the letter says after the record
// the suite's own figures and its own arithmetic: the house's start, the part carried, and the cap
const BASE = 55, PART = 0.35, CAP = 10, PITCH = 45, SOLID = 60;
const start = trust => Math.max(0, Math.min(100, Math.round(BASE + Math.max(-CAP, Math.min(CAP, (trust - BASE) * PART)))));
const begins = (st, rated) => { const good = st >= SOLID, poor = rated === 'thin' || rated === 'gone'; return good && !poor ? 'well' : poor && !good ? 'hard' : 'warily'; };
// a handover by the real rail: a desk at `trust` with the chair who leaves, whose last review read `band` (or none)
const hand = (seed, trust, band, week) => { const s = desk(seed, week || 401, trust); const old = s.executive.name; if (band) filed(s, 382, old, band);
  const inbox = succeed(s); return { s, old, next: s.executive.name, inbox, text: letter(inbox), sc: meeting(s) }; };

// ---- A. where the desk starts with the next chair -----------------------------------------------------
{
  t.ok(typeof KP.handoverStart === 'function' && typeof KP.handoverBegins === 'function', 'the engine carries KP.handoverStart and KP.handoverBegins');
  t.eq(js([KP.C.EXEC.startTrust, KP.C.TIME.EXEC.carry, KP.C.TIME.EXEC.carryCap, KP.C.MANDATE.pitchTrustMin, KP.C.EXEC.bands[1]]), js([BASE, PART, CAP, PITCH, [SOLID, 'solid']]),
    'the figures: the house starts a desk at 55, 35 parts in 100 are carried, by no more than 10 either way; the board hears a pitch from 45, and solid is 60');
  const all = []; for (let i = 0; i <= 100; i++) all.push(i);
  const wrong = all.filter(i => say(() => KP.handoverStart(i)) !== start(i));
  t.eq(wrong.map(i => i + '>' + say(() => KP.handoverStart(i))).join(' '), '', 'at every trust from 0 to 100 the start is this suite’s own sum');
  t.eq(js([0, 26, 27, 28, 40, 55, 70, 82, 83, 84, 100].map(i => say(() => KP.handoverStart(i)))), js([45, 45, 45, 46, 50, 55, 60, 64, 65, 65, 65]),
    'a desk at 0 starts at 45 and one at 100 at 65; the cap holds everything below 27 and above 83, and the middle is carried in part');
  const got = all.map(i => say(() => KP.handoverStart(i)));
  t.eq(Math.min.apply(null, got) + ' to ' + Math.max.apply(null, got), PITCH + ' to 65', 'the lowest start is where the board will hear a pitch, and the highest is short of the house’s best');
  t.ok(got.every((v, i) => i === 0 || v >= got[i - 1]) && all.every(i => (i <= BASE ? got[i] >= i && got[i] <= BASE : got[i] <= i && got[i] >= BASE)),
    'a better standing never starts lower, and every start lies between where the desk stood and the house’s own');
  t.eq(js([say(() => KP.handoverStart(undefined)), say(() => KP.handoverStart(null))]), js([45, 45]), 'a file with no trust on it starts as a desk at nought does');
}

// ---- B. how it begins ---------------------------------------------------------------------------------
{
  const rows = [];
  ['trusted', 'solid', 'watched', 'thin', 'gone'].forEach(r => [45, 59, 60, 65].forEach(st => { if (say(() => KP.handoverBegins(st, r)) !== begins(st, r)) rows.push(r + '@' + st + ':' + say(() => KP.handoverBegins(st, r))); }));
  t.eq(rows.join(' '), '', 'for each of the Desk’s five words and each start, it begins as this suite’s own rule says');
  t.eq(js([KP.handoverBegins(65, 'trusted'), KP.handoverBegins(60, 'watched'), KP.handoverBegins(59, 'solid'), KP.handoverBegins(61, 'thin'), KP.handoverBegins(45, 'gone'), KP.handoverBegins(59, 'thin')]),
    js(['well', 'well', 'warily', 'warily', 'hard', 'hard']), 'well on a solid start with no poor word against it; warily on a middling start, or where a poor word meets a solid start; the hard way on a poor word and no solid start');
  t.eq(js([say(() => KP.handoverBegins(65, null)), say(() => KP.handoverBegins(50, undefined))]), js(['well', 'warily']), 'with no word left at all, the start alone says it');
}

// ---- C. the real rail ---------------------------------------------------------------------------------
{
  // the hard way: a desk at nought, and a last review that read gone
  let h = hand('in-hard', 0, 'gone');
  t.ok(h.next !== h.old && h.inbox.some(n => n.ind === 'execFarewell'), 'the fixture: the real rail changes the chair (' + h.old + ' to ' + h.next + ')');
  t.eq(h.s.trust + ' · ' + h.sc.begins + ' · ' + h.sc.rated, '45 · hard · gone', 'a desk at 0 starts the next chair at 45, where it started at 36, and it begins the hard way');
  t.eq(tail(h.text), 'It does not read well. ' + h.next + ' has read it once and means to judge the rest firsthand: the file follows you only part of the way up the stairs. The first meeting is on the Desk, and it sets the tone for the era.',
    'the letter says so after the record, where it spoke of the benefit of the doubt');
  t.ok(body(h.s, h.sc).includes('“' + h.old + ' had stopped answering for you. I am not ' + h.old + ', and I have decided nothing yet. You can walk me through the record, or we can start from a clean page and let this year speak.'),
    'and the next chair says it across the desk: ' + body(h.s, h.sc).slice(body(h.s, h.sc).indexOf('“'), body(h.s, h.sc).indexOf('“') + 120));
  // well: a desk at 90, and a last review that read trusted
  let w = hand('in-well', 90, 'trusted');
  t.eq(w.s.trust + ' · ' + w.sc.begins + ' · ' + w.sc.rated, '65 · well · trusted', 'a desk at 90 starts the next chair at 65, where it started at 67, and it begins well');
  t.eq(tail(w.text), 'Some of what you built with ' + w.old + ' came up the stairs with the file: you start on good terms, and they are yours to keep. The first meeting is on the Desk, and it sets the tone for the era.', 'the letter says what came up the stairs');
  t.ok(body(w.s, w.sc).includes('“' + w.old + ' rated you as highly as this house rates anyone. I inherited the rating, not the reasons, and I would like the reasons. You can walk me through the record,'), 'and the next chair asks for the reasons');
  // warily: the middle
  let c = hand('in-warily', 50, 'watched');
  t.eq(c.s.trust + ' · ' + c.sc.begins, '53 · warily', 'a desk at 50 starts at 53, as it did, and it begins warily');
  t.eq(tail(c.text), 'What has not transferred is the part that took years to build: the benefit of the doubt. The first meeting is on the Desk, and it sets the tone for the era.', 'the letter keeps the words it had');
  t.ok(body(c.s, c.sc).includes('“' + c.old + ' was still reading your work twice. I inherited the rating, not the reasons. You can walk me through the record,'), 'and so does the first meeting');
  // where the word and the start disagree
  let m = hand('in-mixed', 72, 'thin');
  t.eq(m.s.trust + ' · ' + m.sc.begins + ' · ' + m.sc.rated, '61 · warily · thin', 'a desk that has climbed to 72 since a review that read thin starts at 61 and begins warily: the word and the start disagree');
  let g = hand('in-good-word', 62, 'solid');
  t.eq(g.s.trust + ' · ' + g.sc.begins, '57 · warily', 'a good word on a middling start begins warily too');
  // a chair who left no review: the word is where the desk stood
  let n = hand('in-no-review', 30, null);
  t.eq(n.s.trust + ' · ' + n.sc.begins + ' · ' + n.sc.rated, '46 · hard · thin', 'with no review on the file, a desk at 30 starts at 46 and begins the hard way, by where it stood');
  // in a week the bar takes its point, the rail takes it before the chair goes: what is carried is what stood after
  t.eq(js([KP.C.TIME.DRIFT.everyWeeks, KP.C.TIME.DRIFT.above]), js([4, 75]), 'the fixture: above 75 the bar takes a point every fourth week');
  let b = hand('in-bar', 80, 'trusted', 400);
  t.eq(b.s.trust + ' · ' + b.sc.begins + ' · ' + start(79) + ' · ' + start(80), '63 · well · 63 · 64', 'a desk at 80 in a fourth week starts the next chair at 63: the bar takes its point first, and 79 is what is carried');
  // the goodbye names the one who leaves
  const bye = (w.inbox.find(x => x.ind === 'execFarewell') || { text: '' }).text;
  t.ok(bye.includes('“Whatever the next chair thinks of you,” ' + w.old.replace(/^CEO /, '') + ' said at the door') && !/” CEO said at the door/.test(bye), 'a warm goodbye is said by the one who leaves, by name: it had read “CEO said at the door”');
}

// ---- D. the first meeting's answers -------------------------------------------------------------------
{
  const answer = (seed, trust, band, option) => { const h = hand(seed, trust, band); const before = h.s.trust; const r = obj(say(() => KP.resolveScene(h.s, h.sc.id, option))); return { toast: String(r.toast || r.threw || ''), moved: h.s.trust - before }; };
  const hard = answer('in-ans-hard', 0, 'gone', 'receipts');
  t.ok(hard.toast.indexOf('You walked the whole ledger and left nothing out: what went dark, what broke, and what there was to set beside it.') === 0 && hard.toast.includes('Owning the record moved') && hard.toast.endsWith(' Trust +3, and the new era opens with the file OPEN.'),
    'the record walked the hard way is owned, not shown off: ' + hard.toast.slice(0, 90));
  const well = answer('in-ans-well', 90, 'trusted', 'receipts');
  t.ok(well.toast.indexOf('You walked the whole ledger — the debuts, the promises kept, the years the numbers earned.') === 0 && well.toast.includes('The record moved') && well.toast.endsWith(' Trust +3, and the new era opens with the file OPEN.'), 'a good record is walked in the words it had');
  const wary = answer('in-ans-warily', 50, 'watched', 'receipts');
  t.ok(wary.toast.indexOf('You walked the whole ledger — the debuts, the promises kept, the years the numbers earned.') === 0, 'and so is one that begins warily: only the hard way is said another way');
  t.eq([hard.moved, well.moved, wary.moved, answer('in-ans-slate', 0, 'gone', 'slate').moved].join(), '3,3,3,1', 'and the answers move trust as they did: three for the record, one for the clean page');
  const lapse = hand('in-ans-lapse', 0, 'gone'); const was = lapse.s.trust; const gone = obj(say(() => KP.sceneDef('newChair').expire(lapse.s, lapse.sc)));
  t.eq(lapse.s.trust - was + ' · ' + /never happened/.test(String(gone.text)), '-2 · true', 'a meeting never held costs two, as it did');
  const old = hand('in-ans-old', 50, 'watched'); delete old.sc.begins;
  t.ok(body(old.s, old.sc).includes(' was still reading your work twice. I inherited the rating, not the reasons. You can walk me through the record,'), 'a meeting that does not say how it begins reads as it always did');
}

// ---- E. an older file ---------------------------------------------------------------------------------
{
  const load = (s, version) => { const raw = JSON.parse(KP.serialize(s)); (raw.state || raw).version = version; return obj(say(() => KP.deserialize(JSON.stringify(raw)))); };
  const mid = (seed, trust, rated) => { const s = desk(seed, 300, trust); KP.openScene(s, { kind: 'newChair', prevName: 'CEO Someone Before', rated, expiresWeek: 303 }); return s; };
  const a = load(mid('in-old-hard', 36, 'gone'), '0.11.49'), b = load(mid('in-old-well', 64, 'solid'), '0.11.49'), c = load(mid('in-old-warily', 50, 'watched'), '0.11.49');
  t.eq([meeting(a).begins, meeting(b).begins, meeting(c).begins].join(), 'hard,well,warily', 'a first meeting still open on an older file is told how it begins, from its rating and where the desk stands');
  t.eq([a.trust, b.trust, c.trust].join() + ' · ' + a.version, '36,64,50 · ' + KP.C.VERSION, 'and the number it had carried is left as it was: an older start is not capped after the fact');
  const said = mid('in-old-said', 36, 'gone'); meeting(said).begins = 'warily';
  t.eq(meeting(load(said, '0.11.49')).begins, 'warily', 'a meeting that already says how it begins is not told again');
  t.eq(String(meeting(load(mid('in-now', 36, 'gone'), KP.C.VERSION)).begins), 'undefined', 'and a file of this version is not read at all');
  t.eq(js(load(desk('in-none', 300, 50), '0.11.49').scenes), '[]', 'and a file with no first meeting open has nothing to tell');
}

// ---- F. a real week ---------------------------------------------------------------------------------
{
  // stand either side of the rail that changes the chair, in a real week
  const ph = phase('timeShare'), fn = ph.fn; let seen = null;
  ph.fn = function (state) { const before = { trust: state.trust, name: state.executive.name }; const r = fn.apply(this, arguments); if (state.executive.name !== before.name) seen = { before, after: state.trust }; return r; };
  const real = (seed, trust) => { const s = desk(seed, 400, trust); const old = s.executive.name; filed(s, 382, old, KP.trustBand(trust)); seen = null; const r = say(() => { KP.advanceWeek(s); return 'ok'; }); return { s, r, seen, old }; };
  const lo = real('in-real-lo', 3), hi = real('in-real-hi', 96);
  ph.fn = fn;
  t.ok(lo.r === 'ok' && hi.r === 'ok' && lo.seen && hi.seen && lo.s.week === 401, 'the fixture: a real week changes the chair twice over, once from a low standing and once from a high one');
  // week 401 is no fourth week, so the bar takes nothing from a high standing before the chair goes
  t.eq(js([lo.seen && lo.seen.after, hi.seen && hi.seen.after]), js([lo.seen ? start(lo.seen.before.trust) : 'none', hi.seen ? start(hi.seen.before.trust) : 'none']),
    'in a real week the rail leaves the desk at this suite’s own sum of where it found it');
  t.eq(js([lo.seen && lo.seen.after, hi.seen && hi.seen.after, meeting(lo.s).begins, meeting(hi.s).begins]), js([45, 65, 'hard', 'well']), 'forty-five and the hard way from the bottom, sixty-five and well from the top');
  t.eq(js([say(() => KP.validateState(lo.s)), say(() => KP.validateState(hi.s))]), '[[],[]]', 'and both files are sound');
}

// ---- G. the tools --------------------------------------------------------------------------------------
{
  const haul = String(say(() => fs.readFileSync(path.join(__dirname, '..', 'tools', 'audit_longhaul.js'), 'utf8')));
  t.ok(/the handover, inherited in part \(v0\.11\.50\)/.test(haul) && /and this tool’s own sum of where the desk stood is/.test(haul) && /and by this tool’s own rule it begins/.test(haul) && /HAUL_TRUST/.test(haul),
    'the long haul holds each start to its own sum, and how each begins to its own rule');
}

t.finish();
