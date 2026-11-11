/* Suite 146 — the handover (v0.11.39, §131: the people upstairs and down the
   hall, part eight). When the chair changes hands the next executive is
   handed a record and not only a number. The record is read off what the
   file already holds under the chair who leaves: the greenlights they gave,
   the promises made upstairs while they sat, and where their last review
   put the desk. The letter says it, and the first meeting names the rating
   truly, where it used to say "rated you highly" whatever the rating was.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   sentence fails by name; nothing here can crash or hang under a broken
   engine. */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_146_handover');
const T = KP.C.TIME;

// ---- the kit ------------------------------------------------------------------
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const js = x => JSON.stringify(x);
const act = s => KP.groups(s)[0] || { name: 'no act', id: 'none' };
// a salaried desk in a given week, its founding directive settled, trust where a fixture puts it
const desk = (seed, week, trust) => { const s = KP.newGame(seed, null, {}); s.week = week; s.objective.status = 'met'; s.trust = trust == null ? 65 : trust; s.executive.since = 1; return s; };
// a greenlight as the engine gives it, in a given week, then set to what came of it
const light = (s, week, status, exec) => { const now = s.week; s.week = week; const m = say(() => KP.openMandate(s, { kind: 'group', source: 'your pitch' })); s.week = now;
  if (m && typeof m === 'object') { m.status = status; if (exec) m.exec = exec; } return m; };
// a promise upstairs as it sits on the file
let nextId = 0;
const promise = (s, week, resolved, o) => { const c = Object.assign({ id: 'cx' + (++nextId), type: 'growthPromise', subject: { kind: 'exec' }, week, byWeek: week + 40, resolved: resolved || null }, o || {}); s.claims = (s.claims || []).concat([c]); return c; };
const filed = (s, week, exec, band) => { s.reviews = (s.reviews || []).concat([{ year: 1, week, exec, trust: 50, band, till: 100, sheets: 0, said: 'x' }]); return s; };
// the record, or one that says what went wrong
const rec = (s, name) => { const r = say(() => KP.chairRecord(s, name)); return r && typeof r === 'object' ? r : { threw: String(r) }; };
const counts = r => [r.given, r.kept, r.dark, r.promises, r.promisesKept, r.promisesBroken, r.rated].join('/');   // the rating last: the last review's word, or where the desk stands
const said = r => String(say(() => KP.chairRecordSaid(r)));
// the real rail, in a week past any era: the chair changes hands
const phase = name => KP.weeklyPipeline([]).filter(p => p.name === name)[0] || { fn: () => { throw new Error('no phase ' + name); } };
const succeed = s => { const inbox = []; const r = say(() => phase('timeShare').fn(s, KP.rngFor(s), inbox, s.roster.map(id => s.people[id]), KP.groups(s))); return typeof r === 'string' ? [{ ind: 'threw', text: r }] : inbox; };
const meeting = s => (s.scenes || []).find(x => x.kind === 'newChair') || { rated: 'no first meeting on the Desk' };
const body = (s, sc) => String(say(() => KP.sceneDef('newChair').body(s, sc)));

// ---- A. the record a chair leaves ---------------------------------------------------
{
  ['chairRecord', 'chairRecordSaid'].forEach(k => t.ok(typeof KP[k] === 'function', 'the engine carries KP.' + k));
  const s = desk('ho-none', 300, 65);
  const who = s.executive.name;
  t.eq(counts(rec(s, who)) + ' · ' + js(rec(s, who).review), '0/0/0/0/0/0/solid · null', 'a chair with nothing on the file leaves no review, and the rating is where the desk stands today');
  // the greenlights they gave
  const g = desk('ho-lights', 300);
  const me = g.executive.name;
  g.founded = { week: 100, from: 'HCG', warChest: 300 };
  light(g, 90, 'lapsed'); light(g, 120, 'met'); light(g, 140, 'met'); light(g, 160, 'lapsed'); light(g, 180, 'open'); light(g, 200, 'void'); light(g, 220, 'lapsed', 'CEO Somebody Else');
  t.eq(counts(rec(g, me)).split('/').slice(0, 3).join('/'), '4/2/1', 'the greenlights that chair gave under this desk: four given, two kept, one left dark; not the old house’s, not one set aside, not another chair’s');
  t.eq(counts(rec(g, 'CEO Somebody Else')).split('/').slice(0, 3).join('/'), '1/0/1', 'and another chair’s are that chair’s');
  // the promises made upstairs while they sat
  const p = desk('ho-promises', 300);
  const chair = p.executive.name;
  p.founded = { week: 100, from: 'HCG', warChest: 300 };
  promise(p, 90, 'met'); promise(p, 100, 'met');                                  // the old house's, and one in the very week the desk began
  promise(p, 110, 'met'); promise(p, 120, 'metPoorly'); promise(p, 130, 'missed'); promise(p, 135, 'missed'); promise(p, 140, 'void'); promise(p, 150, null);
  promise(p, 160, 'missed', { execName: 'CEO Somebody Else' }); promise(p, 170, 'met', { subject: { kind: 'idol', id: 'p1' } });
  t.eq(counts(rec(p, chair)).split('/').slice(3, 6).join('/'), '6/2/2', 'the promises upstairs under this desk: six made, two kept (one of them barely), two broken; one set aside and one open are neither');
  t.eq(counts(rec(p, 'CEO Somebody Else')).split('/').slice(3, 6).join('/'), '1/0/1', 'a promise that names its chair is that chair’s');
  // by the written record, once the chair has changed
  const q = desk('ho-proven', 300);
  const now = q.executive.name;
  q.annals = [{ week: 200, kind: 'chair', name: now, after: 'CEO Before', years: 4 }];
  promise(q, 150, 'met'); promise(q, 200, 'met'); promise(q, 250, 'missed');
  t.eq(counts(rec(q, 'CEO Before')).split('/').slice(3, 6).join('/') + ' · ' + counts(rec(q, now)).split('/').slice(3, 6).join('/'), '1/1/0 · 1/0/1',
    'a promise that names nobody is the chair’s who sat that week by the written record, and one made in the week of a change is nobody’s');
  // where their last review put the desk
  const r = desk('ho-rated', 300, 65);
  const sitting = r.executive.name;
  r.founded = { week: 100, from: 'HCG', warChest: 300 };
  t.eq(rec(filed(r, 94, sitting, 'gone'), sitting).rated, 'solid', 'a review that chair gave before this desk began is not this desk’s: the desk is read where it stands');
  t.eq(rec(filed(r, 100, sitting, 'gone'), sitting).rated + ' · ' + js(rec(r, sitting).review), 'solid · null', 'nor is one given in the very week the desk began');
  t.eq(rec(filed(filed(r, 142, sitting, 'thin'), 190, sitting, 'watched'), sitting).rated + ' · ' + rec(r, sitting).review, 'watched · watched', 'of the reviews that chair gave under this desk, the newest: it is the review on the record, and the rating');
  t.eq(rec(filed(r, 238, 'CEO Somebody Else', 'gone'), sitting).rated, 'watched', 'and never another chair’s');
  const before = KP.serialize(g);
  rec(g, me);
  t.eq(KP.serialize(g) === before, true, 'reading the record writes nothing');
}

// ---- B. the record, said --------------------------------------------------------------
{
  const R = (given, kept, dark, promises, promisesKept, promisesBroken, review) => ({ given, kept, dark, promises, promisesKept, promisesBroken, review, rated: review || 'solid' });
  t.eq(said(R(3, 0, 3, 3, 1, 1, 'gone')), '3 greenlights, none kept and 3 left dark; 3 promises upstairs, one kept and one broken; and a last review that read “gone”', 'what was greenlit and what came of it, what was promised and what came of it, and the last review’s word');
  t.eq(said(R(1, 1, 0, 1, 0, 0, 'trusted')), 'one greenlight, one kept and none left dark; one promise upstairs, none kept and none broken; and a last review that read “trusted”', 'one is one, and none is none');
  t.eq(said(R(0, 0, 0, 0, 0, 0, null)), 'no greenlights; no promises upstairs; and no review of theirs on the file', 'a chair who gave nothing, was promised nothing and reviewed nothing leaves that said plainly, and no word is put in their mouth');
  t.eq(said(R(12, 7, 2, 10, 6, 4, 'solid')), '12 greenlights, 7 kept and 2 left dark; 10 promises upstairs, 6 kept and 4 broken; and a last review that read “solid”', 'and larger counts are given in figures');
}

// ---- C. the chair changes hands ------------------------------------------------------------
{
  const s = desk('ho-real', 400, 30);
  const old = s.executive.name;
  light(s, 200, 'met'); light(s, 260, 'lapsed');
  promise(s, 210, 'met'); promise(s, 270, 'missed');
  filed(s, 382, old, 'thin');
  const inbox = succeed(s);
  const next = s.executive.name;
  const letter = inbox.find(n => n.ind === 'newChair') || { text: 'no letter: ' + inbox.map(n => n.ind + ' ' + String(n.text).slice(0, 60)).join(' | ') };
  t.ok(next !== old && !!inbox.find(n => n.ind === 'execFarewell'), 'the fixture: the real rail changes the chair, and the one who leaves says goodbye (' + old + ' to ' + next + ')');
  t.ok(letter.text.includes(' The new executive has read the file ' + old + ' left: 2 greenlights, one kept and one left dark; 2 promises upstairs, one kept and one broken; and a last review that read “thin”. What has not transferred'),
    'the letter says what the one who left leaves on the file (' + letter.text.slice(letter.text.indexOf('The new executive'), letter.text.indexOf('The new executive') + 170) + ')');
  t.eq(letter.priority + ' ' + letter.urgent, 'critical true', 'and it lands as it always did');
  const sc = meeting(s);
  t.eq(sc.rated + ' · ' + sc.prevName, 'thin · ' + old, 'the first meeting carries the last review’s word');
  t.ok(body(s, sc).includes('“' + old + ' kept you on, and not by much. I inherited the rating, not the reasons.') && !body(s, sc).includes('rated you highly'),
    'and the next chair names that rating truly (' + body(s, sc).slice(body(s, sc).indexOf('“'), body(s, sc).indexOf('“') + 110) + ')');
  t.eq(s.trust, Math.round(KP.C.EXEC.startTrust + (30 - KP.C.EXEC.startTrust) * T.EXEC.carry), 'the number carries as it always did');
  // the one who left can still be read, and the one who sits has nothing yet
  t.eq(counts(rec(s, old)), '2/1/1/2/1/1/thin', 'after the change the old chair’s record still reads the same');
  t.eq(counts(rec(s, next)), '0/0/0/0/0/0/' + KP.trustBand(s.trust), 'and the new chair’s is empty, the desk read where it stands');

  // each of the Desk's five words has its own phrase; a scene from before this version keeps the old one
  const PHRASE = { trusted: 'rated you as highly as this house rates anyone', solid: 'rated you well', watched: 'was still reading your work twice', thin: 'kept you on, and not by much', gone: 'had stopped answering for you' };
  Object.keys(PHRASE).forEach(band => t.ok(body(s, { kind: 'newChair', prevName: 'CEO Before', rated: band }).includes('“CEO Before ' + PHRASE[band] + '. I inherited the rating, not the reasons.'), 'a desk that stood at ' + band + ' is told so: “' + PHRASE[band] + '”'));
  t.ok(body(s, { kind: 'newChair', prevName: 'CEO Before' }).includes('“CEO Before rated you highly. I inherited the rating, not the reasons.'), 'a first meeting opened before this version carries no rating, and keeps the words it had');
  t.ok(body(s, { kind: 'newChair', rated: 'gone' }).includes('“My predecessor had stopped answering for you.'), 'and one that names nobody says my predecessor');

  // a chair who gave no review: the desk is read where it stands the day they leave
  const w = desk('ho-warm', 400, 85);
  const was = w.executive.name;
  const wl = succeed(w).find(n => n.ind === 'newChair') || { text: 'no letter' };
  t.ok(wl.text.includes('has read the file ' + was + ' left: no greenlights; no promises upstairs; and no review of theirs on the file.') && meeting(w).rated === 'trusted' && body(w, meeting(w)).includes(was + ' rated you as highly as this house rates anyone.'),
    'a chair who gave no review leaves none, and the rating is where the desk stood that day, before the number was carried (' + wl.text.slice(wl.text.indexOf('has read'), wl.text.indexOf('has read') + 120) + ', ' + meeting(w).rated + ')');
}

// ---- D. old files ---------------------------------------------------------------------------------
{
  // a first meeting opened before this version, still on the Desk
  const old = (seed, set) => {
    const s = desk(seed, 400, 30);
    const was = s.executive.name;
    set(s, was);
    succeed(s);
    (s.scenes || []).forEach(sc => { if (sc.kind === 'newChair') delete sc.rated; });
    s.scenes.push({ id: 'sc-other', kind: 'boardSeason', prevName: was, popSum: 0, year: 9, expiresWeek: 999 });   // a scene of another kind, though it names the same chair
    s.version = '0.11.38';
    const r = say(() => KP.deserialize(KP.serialize(s)));
    return { was, s: r && typeof r === 'object' ? r : { scenes: [{ kind: 'newChair', rated: String(r) }], executive: { name: String(r) } } };
  };
  const a = old('ho-old', (s, was) => { filed(filed(s, 334, was, 'watched'), 382, was, 'gone'); });
  t.eq(meeting(a.s).rated, 'gone', 'an old file with the first meeting still open: it is given the word of the last review the one who left gave');
  t.ok(body(a.s, meeting(a.s)).includes(a.was + ' had stopped answering for you.'), 'and what it says on the Desk is true now (' + body(a.s, meeting(a.s)).slice(0, 60) + ')');
  t.eq(js((a.s.scenes || []).filter(sc => sc.kind !== 'newChair').map(sc => sc.rated)), '[null]', 'no other scene on the Desk is touched, whoever it names');
  const b = old('ho-old-none', () => {});
  t.eq(js(meeting(b.s).rated) + ' · ' + body(b.s, meeting(b.s)).includes(b.was + ' rated you highly.'), 'undefined · true', 'a chair who left no review leaves the meeting as it was opened');
  // a file of this version is left as it is
  const now = desk('ho-now', 400, 30);
  const who = now.executive.name;
  filed(now, 382, who, 'gone');
  succeed(now);
  delete meeting(now).rated;
  const back = say(() => KP.deserialize(KP.serialize(now)));
  t.eq(back && typeof back === 'object' ? js(meeting(back).rated) : String(back), undefined, 'a save of this version is not gone over again');
}

// ---- E. the tools -------------------------------------------------------------------------------
{
  const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const l = read('tools/audit_longhaul.js');
  t.ok(["' | handovers: '", "console.log('the handovers (v0.11.39): '", 'the chair changed and the letter does not say what ', 'the handover names ', 'the handover says ', 'the handover gives ', 'the first meeting carries “'].every(x => l.includes(x)),
    'the long haul counts the handovers of every career and holds each letter and first meeting to its own books of the chair who left');
}

t.finish();
