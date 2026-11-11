/* Suite 151 — the letters that must land (v0.11.44, §137; the owner's
   ruling, §136: decisions 3 and 23 to 25). The week still lands five
   letters below critical. Three things changed. A letter that opens a
   decision (`opens`: the scene it stands beside) and an urgent health
   notice land whatever the week holds, and take their places in the five.
   What is left of the five goes by priority, then to the kind this career
   has been shown the smallest share of, what its Desk has landed of the
   kind against what its weeks have written of it, counted through the week
   as it fills, then by arrival. Both counts are kept on the file. And what
   the five cannot hold is not thrown away: it is kept below the fold, where
   the Desk can open it.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   sentence fails by name; nothing here can crash or hang under a broken
   engine. */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEngine, makeT } = require('./load_engine');
const desk0 = require('../tools/desk_count');
const KP = loadEngine();
const t = makeT('suite_151_mustland');
const BUDGET = KP.C.EVENTS.maxInboxPerWeek;

// ---- the kit ------------------------------------------------------------------
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const js = x => JSON.stringify(x);
let seq = 0;
// a letter of a kind, at a priority (null: none given), with a name of its own to be told by
const L = (ind, priority, more) => Object.assign({ kind: 'company', text: 'letter ' + (++seq), tag: ind + (seq) }, ind ? { ind } : {}, priority ? { priority } : {}, more || {});
const trim = (notes, seen, budget, wrote) => { const r = say(() => KP.trimWeekNotes(notes, budget == null ? BUDGET : budget, seen, wrote)); return Array.isArray(r) ? r : [{ ind: String(r), tag: String(r), text: String(r) }]; };
const kinds = list => list.map(n => n.ind || ('kind:' + n.kind)).join(' ');
const crowd = n => Array.from({ length: n }, () => L('crowd', 'high'));
// nine high letters, each of a kind of its own and none of them seen before: the loudest week for a tenth to arrive in,
// since nothing it can be is less seen than they are
const loud = () => Array.from({ length: 9 }, (_, i) => L('loud' + i, 'high'));
const lands = (n, seen) => trim(loud().concat([n]), seen).includes(n);
const phase = n => KP.weeklyPipeline([]).filter(p => p.name === n)[0] || { fn: () => { throw new Error('no phase ' + n); } };
const ENGINE = fs.readdirSync(path.join(__dirname, '..', 'js', 'engine')).filter(f => f.endsWith('.js'))
  .map(f => fs.readFileSync(path.join(__dirname, '..', 'js', 'engine', f), 'utf8')).join('\n');

// ---- A. the law as it was, where nothing was ruled ----------------------------------------
{
  t.eq(BUDGET, 5, 'the week lands five letters below critical');
  const six = crowd(6);
  t.eq(js(trim(six).map(n => n.tag)), js(six.slice(0, 5).map(n => n.tag)), 'six letters of one kind at one priority: the first five land, as they arrived');
  const crit = L('once', 'critical');
  const k = trim(crowd(9).concat([crit]));
  t.ok(k.length === 6 && k[0] === crit, 'a critical letter lands outside the five, and leads');
  const mixed = [L('a', 'flavor'), L('b', 'normal'), L('c', 'normal'), L('d', 'normal')].concat(crowd(5));
  const shownAll = { a: 1, b: 1, c: 1, d: 1, crowd: 1 };
  t.eq(kinds(trim(mixed, shownAll, null, shownAll)), 'crowd crowd crowd crowd crowd', 'among kinds the Desk has shown, priority comes first: five high letters that arrive last land ahead of four that arrived before them');
  const n1 = L('n', 'normal'), h1 = L('h', 'high'), f1 = L('f', 'flavor'), h2 = L('g', 'high');
  t.eq(js(trim([n1, h1, f1, h2]).map(x => x.tag)), js([h1, h2, n1, f1].map(x => x.tag)), 'the five are read by priority, and by arrival within one');
  const feed = [L('x', 'critical', { spotlight: true }), L('y', 'critical', { feedOnly: true })];
  t.eq(trim(feed).length, 0, 'a spotlight and a feed-only note never land, whatever they are marked');
  t.ok(String(say(() => KP.trimWeekNotes([{ kind: 'company' }], BUDGET))).startsWith('threw: kernel: malformed note'), 'a note with no text is still refused at the door');
}

// ---- B. the letters the week cannot cut --------------------------------------------------------
{
  ['noteKind', 'noteCounted', 'noteHeld'].forEach(f => t.ok(typeof KP[f] === 'function', 'the engine carries KP.' + f));
  // a letter that opens a decision, at any priority
  ['high', 'normal', 'flavor', null].forEach(p => {
    const n = L('interviewSet', p, { opens: 'theInterview' });
    t.ok(lands(n), 'a letter that opens a decision lands after nine high letters of nine unseen kinds, marked ' + (p || 'nothing'));
  });
  t.ok(!lands(L('interviewSet', 'high')), 'the same letter with no decision beside it is cut in the same week');
  // an urgent health notice
  t.ok(lands(L(null, null, { kind: 'health', urgent: true })), 'an urgent health notice lands after nine high letters');
  t.ok(lands(L('chronicOpened', 'high', { kind: 'health' })), 'and so does one marked high');
  t.ok(!lands(L(null, null, { kind: 'health' })) && !lands(L('chronicFlare', 'flavor', { kind: 'health' })), 'a health note that is not urgent takes its chances');
  t.ok(!lands(L(null, null, { kind: 'development', urgent: true })), 'an urgent letter of another desk is not held: it is high, and competes');
  t.eq([{ opens: 'x', text: 'a' }, { kind: 'health', urgent: true, text: 'b' }, { kind: 'health', priority: 'high', text: 'c' }, { kind: 'health', text: 'd' }, { kind: 'company', priority: 'high', text: 'e' },
    { kind: 'health', priority: 'flavor', text: 'f' }].map(n => (say(() => KP.noteHeld(n)) === true ? 'held' : 'free')).join(' '), 'held held held free free free', 'what is held, said one by one');
  // they take their places in the five
  const one = L('promoOffer', 'high', { opens: 'promoOffer' });
  const k1 = trim(crowd(9).concat([one]));
  t.eq(k1.length + ' · ' + kinds(k1), '5 · promoOffer crowd crowd crowd crowd', 'a held letter takes one of the five, and is read first');
  const crit = L('once', 'critical'), h = L(null, null, { kind: 'health', urgent: true });
  const k2 = trim([L('a', 'high'), h, L('b', 'high'), one, crit, L('c', 'high'), L('d', 'high'), L('e', 'high')]);
  t.eq(kinds(k2), 'once kind:health promoOffer a b c', 'the critical outside the five, then the held as they arrived, then what is left of the five');
  // more held than the five: all of them, and nothing else below critical
  const seven = Array.from({ length: 7 }, (_, i) => L('ask' + i, 'normal', { opens: 'scene' + i }));
  const k3 = trim(crowd(4).concat(seven, [crit]));
  t.eq(k3.length + ' · ' + k3.filter(n => n.opens).length + ' · ' + k3.filter(n => n.ind === 'crowd').length, '8 · 7 · 0', 'seven decisions in one week all land, with the critical, and nothing else does');
  t.eq(trim(seven, null, 0).length, 7, 'and a week given no room at all still lands them');
}

// ---- C. the smallest share first ---------------------------------------------------------------
{
  const a = Array.from({ length: 5 }, () => L('a', 'high')), b = L('b', 'high');
  t.eq(js(trim(a.concat([b])).map(n => n.tag)), js([a[0], a[1], a[2], a[3], b].map(n => n.tag)), 'five of one kind and one of another, nothing shown before: the other lands, and the fifth of the five is the one cut');
  t.eq(kinds(trim(a.concat([b]), { b: 50 }, null, { b: 50 })), 'a a a a a', 'a kind this career has been shown every time it was written waits behind one it has never been shown');
  // a kind the Desk has mostly cut goes ahead of one it has mostly shown
  const fiveB = Array.from({ length: 5 }, () => L('b', 'high')), lateA = L('a', 'high');
  const k = trim(fiveB.concat([lateA]), { a: 1, b: 9 }, null, { a: 10, b: 10 });
  t.ok(k.includes(lateA) && !k.includes(fiveB[4]), 'a kind shown once in ten goes ahead of one shown nine in ten, though it arrives last');
  // it is the share, not the count: seen thirty times of a hundred is less shown than twice of two
  const x1 = L('x', 'high'), y1 = L('y', 'high');
  t.eq(kinds(trim([y1, x1], { x: 30, y: 2 }, 1, { x: 100, y: 2 })), 'x', 'a kind shown thirty times of a hundred goes ahead of one shown both times it was written');
  t.eq(kinds(trim([y1, x1], { x: 30, y: 2 }, 1, { x: 31, y: 20 })), 'y', 'and behind one shown twice in twenty');
  // the last place is kept for a kind this Desk has never shown: the ruling's first clause, one place of the five
  const c1 = L('c', 'flavor');
  const kc = trim(a.concat([c1]), { a: 100 }, null, { a: 100 });
  t.eq(kinds(kc), 'a a a a c', 'the last place is kept for a kind never shown: a flavor letter of a kind the Desk has never shown takes it from the fifth high letter of a kind always shown');
  t.eq(js(kc.map(n => n.tag)), js([a[0], a[1], a[2], a[3], c1].map(n => n.tag)), 'and it is read after them, since the five are read by priority');
  const c2 = L('c', 'flavor'), c3 = L('c', 'flavor');
  const kcc = trim(a.concat([c2, c3]), { a: 100 }, null, { a: 100 });
  t.ok(kinds(kcc) === 'a a a a c' && kcc.includes(c2) && !kcc.includes(c3), 'once: the second letter of that kind in the same week is no longer new, and waits behind the high ones');
  t.eq(kinds(trim(a.concat([L('c', 'flavor')]), { a: 100, c: 1 }, null, { a: 100, c: 1 })), 'a a a a a', 'and the week after it has been shown, so priority comes first again');
  t.eq(kinds(trim(a.concat([L('c', 'flavor')]), { a: 100 }, null, { a: 100, c: 5 })), 'a a a a c', 'a kind written five times and never shown is still new to the Desk');
  // one place and no more
  const nine = ['p', 'q', 'r', 's', 't', 'u'].map((k, i) => L(k, i < 3 ? 'flavor' : 'high'));
  t.eq(js(trim(nine.concat(a), { a: 3 }, null, { a: 3 }).map(n => n.tag)), js([nine[3], nine[4], nine[5], a[0], nine[0]].map(n => n.tag)),
    'one place and no more: three high kinds never shown and a high kind already shown take four by priority, and the fifth goes to the first of the lesser kinds never shown');
  const word = L('d', 'high'), lesser = ['v', 'w', 'x', 'y', 'z', 'zz'].map((k, i) => L(k, i < 3 ? 'normal' : 'flavor'));
  t.eq(js(trim(lesser.concat([word]), { d: 9 }, null, { d: 9 }).map(n => n.tag)), js([word, lesser[0], lesser[1], lesser[2], lesser[3]].map(n => n.tag)),
    'a high letter of a kind already shown is not cut for six lesser kinds never shown: four places go by priority, though it arrived last');
  const sNew = L('s', 'high'), pNew = L('p', 'flavor');
  t.eq(kinds(trim([sNew, pNew].concat(a), { a: 100 }, null, { a: 100 })), 's a a a p', 'the place is the last: a kind never shown that priority lands anyway does not use it up');
  const four = ['h1', 'h2', 'h3', 'h4'].map(k => L(k, 'normal', { opens: 'scene' })), aOne = L('a', 'high'), cNew = L('c', 'flavor');
  const k4 = trim(four.concat([aOne, cNew]), { a: 100 }, null, { a: 100 });
  t.ok(k4.length === 5 && k4.includes(cNew) && !k4.includes(aOne), 'four decisions in a week leave one place, and it is the kept one');
  t.eq(kinds(trim(a.concat([L('a', 'high')]), { a: 100 }, null, { a: 100 })), 'a a a a a', 'with no kind never shown in the week, the last place goes by the law like the rest');
  const critC = L('c', 'critical'), lateC = L('c', 'flavor');
  t.ok(!trim(a.concat([critC, lateC]), { a: 100 }, null, { a: 100 }).includes(lateC), 'a kind a critical letter shows this week is not new to the five');
  // counted through the week as it fills
  const x = [1, 2, 3].map(() => L('x', 'high')), y = [1, 2, 3].map(() => L('y', 'high')), z = [1, 2, 3].map(() => L('z', 'high'));
  t.eq(js(trim(x.concat(y, z)).map(n => n.tag)), js([x[0], x[1], y[0], y[1], z[0]].map(n => n.tag)), 'three kinds of three: each is shown once before any is shown twice, and arrival breaks the ties');
  t.eq(kinds(trim(x.concat(y, z), { x: 6, y: 3 }, null, { x: 6, y: 6 })), 'y y y z z', 'what the career had been shown before the week is where the count starts: a kind always shown waits behind one shown half the time and one never written');
  // a letter with no kind of its own is counted under its desk
  const p = [1, 2, 3, 4, 5].map(() => L(null, 'high', { kind: 'public' })), q = L(null, 'high', { kind: 'talent' });
  t.ok(trim(p.concat([q])).includes(q) && !trim(p.concat([q]), { 'kind:talent': 9 }, null, { 'kind:talent': 9 }).includes(q), 'a letter with no kind of its own is counted under its desk');
  // what is held or critical this week has been shown this week
  const heldA = L('a', 'high', { opens: 'scene' }), a2 = L('a', 'high'), b2 = L('b', 'high');
  t.eq(js(trim([heldA, a2, b2], null, 2).map(n => n.tag)), js([heldA.tag, b2.tag]), 'a held letter counts as shown: the next of its kind waits behind a kind not yet shown this week');
  const seen = { a: 1 }, wrote = { a: 4 };
  trim(a.concat([b]), seen, null, wrote);
  t.eq(js(seen) + js(wrote), js({ a: 1 }) + js({ a: 4 }), 'and the trim reads the counts without writing them');
  t.eq(kinds(trim(a.concat([b]), undefined, null, undefined)), 'a a a a b', 'with no counts given, nothing has been shown');
}

// ---- D. the Desk’s memory, and what is below the fold ----------------------------------------------------
{
  const s = KP.newGame('ml-memory', null, {});
  const sorted = o => js(Object.keys(o).sort().map(k => [k, o[k]]));
  const add = (base, more) => { const o = Object.assign({}, base); Object.keys(more).forEach(k => { o[k] = (o[k] || 0) + more[k]; }); return o; };
  // the first screen's letters are on the Desk, so the counts begin with them
  const opening = {};
  s.inbox.forEach(n => { opening[KP.noteKind(n)] = (opening[KP.noteKind(n)] || 0) + 1; });
  t.ok(s.inbox.length >= 1 && sorted(s.deskSeen || {}) === sorted(opening) && sorted(s.deskWrote || {}) === sorted(opening) && js(s.fold || []) === '[]',
    'a new career’s counts begin with the letters its first screen shows (' + s.inbox.length + ' of ' + Object.keys(opening).length + ' kinds), and nothing is below the fold');
  // a house founded outside the capital opens with one letter more, and it is a letter like the rest
  const away = KP.newGame('ml-away', null, { homeCity: 'busan' });
  const ids = away.inbox.map(n => n.id);
  t.ok(away.inbox.some(n => n.ind === 'regionalFounding') && ids.every(id => /^m\d+$/.test(String(id))) && new Set(ids).size === ids.length && away.inbox.every(n => n.read === false) &&
    away.nextMsgId === ids.length + 1 && (away.deskSeen || {}).regionalFounding === 1,
    'a regional founding’s first letter has an id and a read mark of its own, and is counted (' + ids.join(' ') + ')');
  say(() => KP.note(s, { kind: 'company', ind: 'byHand', text: 'a letter an action wrote' }));
  say(() => KP.note(s, { kind: 'public', text: 'one with no kind of its own' }));
  say(() => KP.note(s, { kind: 'company', ind: 'byHand', text: 'and another' }));
  const byHand = add(opening, { byHand: 2, 'kind:public': 1 });
  t.eq(sorted(s.deskSeen) + sorted(s.deskWrote), sorted(byHand) + sorted(byHand), 'a letter an action writes is counted as written and as shown, by kind');
  // real weeks: every letter is counted once as written, and once more if it landed; what did not land is below the fold
  const wroteWas = Object.assign({}, s.deskWrote), seenWas = Object.assign({}, s.deskSeen);
  const landed = {}, cut = {}, weeks = [];
  const note = KP.note;
  KP.note = function (state, n) { if (state === s) landed[KP.noteKind(n)] = (landed[KP.noteKind(n)] || 0) + 1; return note.apply(this, arguments); };
  const r = say(() => { for (let i = 0; i < 30; i++) { const w = s.week; const kept = KP.advanceWeek(s); if (s.week === w) return 'the week did not move at ' + w;
    const lost = (KP.lastTickNotes || []).filter(n => !kept.includes(n) && !n.spotlight && !n.feedOnly);
    kept.forEach(n => { const k = KP.noteKind(n); landed[k] = (landed[k] || 0) + 1; });
    lost.forEach(n => { cut[KP.noteKind(n)] = (cut[KP.noteKind(n)] || 0) + 1; });
    weeks.push({ week: s.week, lost: lost.map(n => n.text) }); } return 'ok'; });
  KP.note = note;
  t.ok(r === 'ok' && Object.keys(landed).length >= 8 && Object.keys(cut).length >= 1, 'thirty real weeks land letters of many kinds and cut some (' + r + ', ' + Object.keys(landed).length + ' kinds landed, ' + Object.keys(cut).length + ' cut)');
  t.eq(sorted(s.deskSeen), sorted(add(seenWas, landed)), 'the file’s count of what was shown is the letters that landed, by kind');
  t.eq(sorted(s.deskWrote), sorted(add(wroteWas, add(landed, cut))), 'and its count of what was written is those and the ones that did not');
  // below the fold: the letters the last weeks cut, newest first, each with its week, and no others
  const E = KP.C.EVENTS;
  const want = [];
  weeks.slice().reverse().filter(w => w.week > s.week - E.foldWeeks).forEach(w => w.lost.forEach(text => want.push(w.week + '|' + text)));
  const fold = (s.fold || []).map(n => n.week + '|' + n.text);
  t.ok(want.length >= 1 && E.foldWeeks === 2, 'the last two of those weeks cut letters (' + want.length + '), and the fold holds this week and the last');
  t.eq(js(fold), js(want), 'below the fold are the letters those weeks wrote and did not land, newest week first, each with the week it was written');
  t.ok((s.fold || []).every(n => n.read === true && /^f\d+_\d+$/.test(n.id) && js(Object.keys(n).sort()) === js(['id', 'kind', 'read', 'text', 'week']) && !s.inbox.some(m => m.id === n.id)),
    'each is kept lean, its desk, its words and its week, already read, and none of them is in the inbox');
  t.eq(js(say(() => KP.validateState(s))), '[]', 'and the file has no complaint');
  const back = say(() => KP.deserialize(KP.serialize(s)));
  t.eq(js(((back || {}).fold || []).map(n => n.week + '|' + n.text)), js(fold), 'the fold is saved with the file');
  // the loudest week loses nothing: the fold has no cap by count. (It first had one, twenty, and the long haul
  // found a week that wrote thirty-five letters.) The week after, every one is still there; the week after that, gone
  const big = KP.newGame('ml-big', null, {});
  let flood = 40;
  KP.registerWeekly('mlFlood', 6, function (state, rng, inbox) { if (state !== big) return; for (let i = 0; i < flood; i++) inbox.push({ kind: 'company', ind: 'flood' + i, priority: 'flavor', text: 'flood ' + i }); });
  const keptBig = say(() => KP.advanceWeek(big)) || [];
  const wireBig = (KP.lastTickNotes || []).filter(n => !n.spotlight && !n.feedOnly);
  const lostBig = wireBig.filter(n => !keptBig.includes(n)).map(n => n.text);
  const loud = big.week;
  t.ok(wireBig.length >= 40 && lostBig.length >= 35 && js((big.fold || []).map(n => n.text)) === js(lostBig),
    'a week that writes forty letters keeps every one that did not land (' + wireBig.length + ' written, ' + (big.fold || []).length + ' below the fold)');
  flood = 0;
  say(() => KP.advanceWeek(big));
  t.ok(big.week === loud + 1 && js((big.fold || []).filter(n => n.week === loud).map(n => n.text)) === js(lostBig) && (big.fold || []).every(n => n.week === loud || n.week === big.week) &&
    (big.fold || []).findIndex(n => n.week === loud) === (big.fold || []).filter(n => n.week === big.week).length, 'the week after, every one of them is still below the fold, under the new week’s');
  say(() => KP.advanceWeek(big));
  t.ok(big.week === loud + 2 && !(big.fold || []).some(n => n.week === loud), 'and the week after that, they are gone');
  // the week reads the file's counts
  const f = KP.newGame('ml-reads', null, {});
  let got = 'the trim was not called';
  const realTrim = KP.trimWeekNotes;
  KP.trimWeekNotes = function (notes, budget, seen, wrote) { got = (seen === f.deskSeen ? 'seen' : 'not seen') + ' and ' + (wrote === f.deskWrote ? 'wrote' : 'not wrote'); return realTrim.apply(this, arguments); };
  f.deskSeen = { something: 3 }; f.deskWrote = { something: 7 };
  say(() => KP.advanceWeek(f));
  KP.trimWeekNotes = realTrim;
  t.eq(got, 'seen and wrote', 'the week’s trim is given the file’s own two counts');
}

// ---- E. the sources: a decision does not open unannounced -----------------------------------------------
{
  // every kind on the tools' list is a scene the engine knows, and a letter in the engine names it
  const unknown = desk0.ANNOUNCED.filter(k => !KP.sceneDef(k));
  t.eq(js(unknown), '[]', 'every decision on the list is a scene the engine has');
  const unmarked = desk0.ANNOUNCED.filter(k => !ENGINE.includes("opens: '" + k + "'"));
  t.eq(js(unmarked), '[]', 'and each has a letter in the engine that names it');
  const count = k => ENGINE.split("opens: '" + k + "'").length - 1;
  t.eq([count('seatPoach'), count('theChoice'), count('theInterview'), count('promoOffer')].join(), '2,2,1,1', 'both calls from outside are said, the chair’s and the road manager’s, and both doors of a scandal’s choice');
  t.ok(desk0.ANNOUNCED.length >= 30 && new Set(desk0.ANNOUNCED).size === desk0.ANNOUNCED.length, 'the list names each once (' + desk0.ANNOUNCED.length + ')');
  t.eq(count('outsideOffer'), 2, 'an outside offer, which opens no scene and waits in the pile with a date on it, is held too: both of its letters name it');
  // 23: the candidate in the building, through the rail, in a loud week
  const scripted = (salt, yes) => new Proxy({}, { get: (o, k) => (k === 'chance' ? p => !!yes && yes(p) : k === 'int' ? (a, b) => (b === 9999 ? salt : a) : k === 'pick' ? l => l[0] : () => 0.99) });
  const s = KP.newGame('ml-rail', null, {});
  s.week = 60; s.objective.status = 'met';
  say(() => KP.staffSeats(s));
  s.staffSearch = { seatId: 'anr', week: 59 };
  const box = [];
  const ran = say(() => { phase('hires').fn(s, scripted(4242), box, [], KP.groups(s)); return 'ok'; });
  const set = box.filter(n => n.ind === 'interviewSet')[0] || { text: 'no letter', opens: null };
  t.eq(ran + ' · ' + set.opens, 'ok · theInterview', 'the letter that says a candidate is in the building names the meeting it opens');
  t.ok(lands(set), 'and it lands after nine high letters');
  // 24: a call for a chair, which was never said, and the road manager's, which was
  const c = KP.newGame('ml-call', null, {});
  c.week = 80; c.objective.status = 'met';
  say(() => KP.staffSeats(c));
  c.seats.vocal.tier = 'known'; c.seats.vocal.since = 1;
  const HR = KP.C.HIRES;
  const cbox = [];
  const cran = say(() => { phase('hires').fn(c, scripted(1, p => p === HR.poachChance), cbox, [], KP.groups(c)); return 'ok'; });
  const called = cbox.filter(n => n.opens === 'seatPoach')[0] || { text: 'no letter', ind: null };
  const call = (c.scenes || []).filter(x => x.kind === 'seatPoach')[0] || { seatId: 'no call' };
  t.eq(cran + ' · ' + call.seatId + ' · ' + called.ind, 'ok · vocal · seatCalled', 'a call for a chair opens with a letter beside it, where it opened with none');
  t.ok(String(called.text).startsWith(c.seats.vocal.name + ' got a call from ') && String(called.text).includes(' about a head vocal coach chair across the street. The call is on the Desk, and in two weeks it answers itself.'),
    'it says who was called, by whom, for which chair, and how long the call waits (' + String(called.text).slice(0, 80) + ')');
  t.ok(lands(called), 'and it lands after nine high letters');
  const m = KP.newGame('ml-manager', null, { legacy: true });
  m.week = 80; m.objective.status = 'met';
  say(() => KP.staffSeats(m));
  const g = KP.groups(m).filter(x => x.debuted)[0] || { id: 'none' };
  g.popularity = 60; g.manager = g.manager || { name: 'Kang Tae-sik', since: 1 }; g.manager.since = 1;
  const mbox = [];
  const mran = say(() => { phase('hires').fn(m, scripted(1, p => p === HR.MANAGER.poachChance), mbox, [], KP.groups(m)); return 'ok'; });
  const offer = mbox.filter(n => n.opens === 'seatPoach')[0] || { text: 'no letter' };
  const mcall = (m.scenes || []).filter(x => x.kind === 'seatPoach')[0] || { groupId: 'no call' };
  t.eq(mran + ' · ' + (mcall.groupId === g.id), 'ok · true', 'the road manager’s offer opens as it did');
  t.ok(String(offer.text).startsWith(g.manager.name + ' got an offer from ') && lands(offer), 'and its letter, which a loud week could cut, now lands (' + String(offer.text).slice(0, 60) + ')');
  // 25: a rival taking the date opens the hold-or-slip decision and is critical; the story of a house that keeps doing it is not held
  t.ok(/notes\.push\(\{ kind: 'industry', urgent: true, priority: 'critical', ind: 'ambush'/.test(ENGINE), 'the letter that a rival has taken the date opens a decision, and stays critical');
  t.ok(!KP.noteHeld({ kind: 'public', ind: 'narrative', narKey: 'dateSniper', priority: 'high', text: 'x' }), 'the story the trades tell about such a house opens nothing, and takes its chances');
}

// ---- F. an old file -------------------------------------------------------------------------------------
{
  const s = KP.newGame('ml-old', null, {});
  s.inbox = [{ id: 'm1', week: 1, kind: 'company', ind: 'landed', text: 'a' }, { id: 'm2', week: 1, kind: 'company', ind: 'landed', text: 'b' }, { id: 'm3', week: 1, kind: 'public', text: 'c' },
    { id: 'm4', week: 1, kind: 'health', ind: 'chronicFlare', text: 'd' }];
  s.deskSeen = { something: 9 }; s.deskWrote = { something: 12 }; s.fold = [{ id: 'f1_0', week: 1, kind: 'company', read: true, text: 'x' }];
  const raw = JSON.parse(KP.serialize(s));
  delete raw.deskSeen; delete raw.deskWrote; delete raw.fold; raw.version = '0.11.43';
  const o = say(() => KP.deserialize(js(raw)));
  const start = { landed: 2, 'kind:public': 1, chronicFlare: 1 };
  t.eq(js((o || {}).deskSeen) + js((o || {}).deskWrote) + js((o || {}).fold), js(start) + js(start) + '[]', 'a file from before this release starts both counts with the letters its Desk holds, and has nothing below the fold');
  t.eq(js(say(() => KP.validateState(o))), '[]', 'and has no complaint');
  o.deskSeen = { landed: 40, other: 2 }; o.deskWrote = { landed: 55, other: 9 };
  const again = say(() => KP.deserialize(KP.serialize(o)));
  t.eq(js((again || {}).deskSeen) + js((again || {}).deskWrote), js({ landed: 40, other: 2 }) + js({ landed: 55, other: 9 }), 'a file saved by this release keeps the counts it has');
}

// ---- G. the tools’ own note of the decisions a week opens ----------------------------------------------------
{
  const K2 = loadEngine();
  // a kernel that can be told to cut the letters it should hold: set under the tool's own wrapper, as a broken engine would be
  let cutting = false;
  const innerTrim = K2.trimWeekNotes;
  K2.trimWeekNotes = function (notes) { const kept = innerTrim.apply(this, arguments); return cutting ? kept.filter(n => !n.opens && n.kind !== 'health') : kept; };
  const T = desk0.watch(K2);
  const s = K2.newGame('ml-tool', null, {});
  // a rail that opens a decision on the list, with its letter, in a week loud enough to cut it
  let mode = 'said';
  K2.registerWeekly('mlLoud', 5, function (state, rng, inbox) {
    if (state !== s) return;
    for (let i = 0; i < 9; i++) inbox.push({ kind: 'company', ind: 'mlCrowd', priority: 'high', text: 'crowd ' + i });
    if (mode === 'said') inbox.push({ kind: 'health', urgent: true, text: 'someone hit a wall' });
    if (mode === 'quiet') return;
    K2.openScene(state, { kind: 'theInterview', cand: { id: 'sfx_' + state.week, name: 'Ma In-na', seatId: 'anr', tier: 'working', resume: ['x'], warmth: 50, candor: 50, style: 'scrappy' }, expiresWeek: state.week + 1 });
    if (mode === 'said') inbox.push({ kind: 'company', opens: 'theInterview', ind: 'interviewSet', priority: 'high', text: 'Ma In-na is in the building' });
    if (mode === 'unmarked') inbox.push({ kind: 'company', ind: 'interviewSet', priority: 'high', text: 'Ma In-na is in the building' });
  });
  const week = () => say(() => { s.scenes = (s.scenes || []).filter(x => x.kind !== 'theInterview'); const m = desk0.mark(T); K2.advanceWeek(s);
    return { o: desk0.openedSince(T, m).theInterview || { opened: 0, said: 0, landed: 0 }, bad: desk0.unannounced(T, m), cut: desk0.heldCut(T, m) }; });
  const a = week();
  t.eq(js(a.o) + ' · ' + js(a.bad) + ' · ' + js(a.cut), js({ opened: 1, said: 1, landed: 1 }) + ' · [] · []', 'a decision that opens in a loud week with its letter: opened, said and landed, and nothing to report');
  mode = 'none';
  const b = week();
  t.eq(js(b.o) + ' · ' + js(b.bad), js({ opened: 1, said: 0, landed: 0 }) + ' · ' + js(['theInterview opened 1, said 0, landed 0']), 'one that opens with no letter is reported by name');
  mode = 'unmarked';
  const c = week();
  t.eq(js(c.bad), js(['theInterview opened 1, said 0, landed 0']), 'and so is one whose letter does not name it');
  mode = 'said'; cutting = true;
  const e = week();
  cutting = false;
  t.eq(js(e.o) + ' · ' + js(e.bad), js({ opened: 1, said: 1, landed: 0 }) + ' · ' + js(['theInterview opened 1, said 1, landed 0']), 'one whose letter was written and cut, under a kernel that does not hold it, is reported by name');
  t.eq(js(e.cut), js(['letters that open a decision written 1, landed 0', 'urgent health notices written 1, landed 0']), 'and so is each letter the week must hold that it cut: the decision’s, and an urgent health notice');
  t.ok(T.kinds.mlCrowd && T.kinds.mlCrowd.written >= 27 && T.kinds.mlCrowd.high === T.kinds.mlCrowd.written, 'the tool notes which letters the week wrote at high (' + js(T.kinds.mlCrowd) + ')');
  // a kind that starves, on a count made by hand
  const hand = { kinds: { a: { written: 100, landed: 24, high: 100 }, b: { written: 100, landed: 25, high: 100 }, c: { written: 99, landed: 0, high: 99 }, d: { written: 200, landed: 10, high: 99 }, e: { written: 400, landed: 20, high: 200 } } };
  t.eq(js(desk0.starved(hand)), js(['e landed 20 of 400', 'a landed 24 of 100']), 'a kind that is mostly high, written a hundred times or more and landed under one time in four is named, the worst first; one at a quarter, a rare one and one mostly below high are not');
  // a kind that is buried, whatever its priority
  const hand2 = { kinds: { a: { written: 100, landed: 9 }, b: { written: 100, landed: 10, high: 100 }, c: { written: 99, landed: 0 }, d: { written: 300, landed: 3, high: 300 } } };
  t.eq(js(desk0.buried(hand2)), js(['d landed 3 of 300', 'a landed 9 of 100']), 'a kind written a hundred times or more and landed under one time in ten is named, the worst first, whatever its priority; one at one in ten and a rare one are not');
  mode = 'quiet';
  const d = week();
  t.eq(js(d.o) + ' · ' + js(d.bad), js({ opened: 0, said: 0, landed: 0 }) + ' · []', 'a week that opens nothing reports nothing');
  // a scene an action opens between weeks is no part of the week's count
  const before = js(T.opened.theInterview);
  const opened = say(() => { K2.openScene(s, { kind: 'theInterview', cand: { id: 'sfx_action', name: 'Pyo Ha-eun', seatId: 'anr', tier: 'working', resume: ['x'], warmth: 50, candor: 50, style: 'scrappy' }, expiresWeek: s.week + 1 }); return 'ok'; });
  t.ok(opened === 'ok' && (s.scenes || []).some(x => x.cand && x.cand.id === 'sfx_action'), 'a scene an action opens between weeks still opens under the tool (' + opened + ')');
  t.eq(js(T.opened.theInterview), before, 'and is not counted against a week');
  const line = desk0.lines(T).filter(l => l.startsWith('held to the Desk: '))[0] || 'no line';
  t.ok(/^held to the Desk: \d+ letters that open a decision, \d+ landed · \d+ urgent health notices, \d+ landed · the week opened \d+ decisions, \d+ with a letter beside them · of the \d+ kinds that never open unannounced, \d+ opened, \d+ said and landed · the most letters landed in one week \d+$/.test(line),
    'the tools print one line of it (' + line.slice(0, 90) + ')');
}

t.finish();
