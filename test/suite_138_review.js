/* Suite 138 — the annual review (v0.11.28, §120: the people upstairs, part two).
   Board season was the company answering for itself. The executive's own
   word on the desk was a chip, and at "gone" nothing happened. When the
   directors have gone she says it: one fact about the year in her kind's
   terms, where the desk stands with her, and what that opens or closes.
   A letter that always lands, and a line on the file. Nothing draws and
   nothing moves a number.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   letter fails by name. */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const desk = require('../tools/desk_count');
const KP = loadEngine();
const t = makeT('suite_138_review');
const YEAR = KP.C.WEEKS_PER_YEAR;

// ---- the kit ------------------------------------------------------------------
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const chair = k => KP.DATA.executives.find(e => e.personality === k) || {};
const room = s => KP.freeTrainees(s).map(id => s.people[id]);
const act = s => KP.groups(s)[0];
const led = s => s.upstairsLedger || { bands: {} };
const bands = s => ['trusted', 'solid', 'watched', 'thin', 'gone'].map(k => (led(s).bands || {})[k]).join('|');
const lands = n => { const crowd = []; for (let i = 0; i < 9; i++) crowd.push({ kind: 'company', priority: 'high', text: 'crowd ' + i }); return !!(n && n.text) && KP.trimWeekNotes(crowd.concat([n]), KP.C.EVENTS.maxInboxPerWeek).includes(n); };
const BAND_SAID = {
  trusted: 'I stopped checking your work some time ago. I read it now because I like to.',
  solid: 'I have no notes that would not be nitpicking, so I will keep them.',
  watched: 'I still read everything of yours twice. That is not a complaint. It is where we are.',
  thin: 'The directors asked me whether you are the right person for this desk. I said yes. I did not say it quickly.',
  gone: 'The directors asked me whether you are the right person for this desk. I did not answer them. You should know that.',
};
const PITCH = 'Bring me a pitch when you have one. The board will hear it.';
const NO_PITCH = 'Do not bring me a pitch this year. The board would not hear it.';
const INVESTORS = 'And if investors ever call me about you, I will tell them the truth. You would like it.';
// a world at the first board week under one kind of executive, trust in the middle of "solid"
function world(seed, kind, trust) {
  const s = KP.newGame(seed, null, {});
  const e = chair(kind);
  s.executive = { name: e.name, gender: e.gender, personality: e.personality, intro: e.intro, since: 1 };
  s.week = 46;
  s.trust = trust == null ? 65 : trust;
  return s;
}
// what she would say, and the fact alone (the sentence before where the desk stands)
const said = s => { const r = say(() => KP.annualReview(s)); return r && typeof r === 'object' ? r : { said: String(r), band: null }; };
const fact = s => { const x = said(s); const cut = x.said.indexOf(' ' + (BAND_SAID[x.band] || '\u0000')); return cut < 0 ? x.said : x.said.slice(0, cut); };
// the name in a fact, between two markers: empty when the fact is not the one expected
const between = (text, a, b) => ((String(text).split(a)[1] || '').split(b)[0]);
const record = (g, week, o) => { const r = Object.assign({ week, songTitle: 'Record ' + week, conceptId: 'bright', reception: 50, receptionBand: 'solid' }, o || {}); g.releases.push(r); return r; };
const lane = (s, w) => KP.trendLane(s, Math.floor((w - 1) / YEAR));
const offLane = id => KP.C.CONCEPTS.map(c => c.id).find(x => x !== 'fusion' && KP.laneDistance(id, x) === 2);
// board season on the Desk, and its answer; the stage door's week for an empty chair
const season = s => KP.openScene(s, { kind: 'boardSeason', popSum: 0, year: Math.ceil(s.week / YEAR), expiresWeek: s.week + 2 });
// (an engine that throws inside the answer is an answer that failed, by name)
const answer = (s, opt) => { const sc = (s.scenes || []).find(x => x.kind === 'boardSeason'); if (!sc) return { ok: false, reason: 'no board season on the Desk' };
  const r = say(() => KP.resolveScene(s, sc.id, opt)); return typeof r === 'string' ? { ok: false, reason: r } : r; };
const letter = s => (s.inbox || []).find(n => n.ind === 'annualReview') || {};
const last = s => (s.reviews || [])[(s.reviews || []).length - 1] || {};
function settle(s) {
  const inbox = [];
  const r = say(() => { KP.weeklyPipeline([]).filter(p => p.name === 'stageDoor').forEach(p => p.fn(s, KP.rngFor(s), inbox, s.roster.map(id => s.people[id]), KP.groups(s))); });
  if (typeof r === 'string') inbox.push({ text: r });
  return inbox;
}

// ---- A. the shape -------------------------------------------------------------
{
  ['trustBand', 'annualReview', 'fileReview', 'reviewOpens'].forEach(k => t.ok(typeof KP[k] === 'function', 'the engine carries KP.' + k));
  t.eq(JSON.stringify(KP.C.EXEC.bands), '[[80,"trusted"],[60,"solid"],[40,"watched"],[20,"thin"],[0,"gone"]]', 'five words for where the desk stands, at the lines the Desk always drew');
  t.eq([100, 80, 79, 60, 59, 40, 39, 20, 19, 0].map(x => say(() => KP.trustBand(x))).join(), 'trusted,trusted,solid,solid,watched,watched,thin,thin,gone,gone', 'each at its line');
  t.eq(KP.C.MEETING.reviewsKept, 12, 'the file keeps twelve reviews');
  t.ok(desk.ONE_SHOTS.includes('annualReview'), 'the review is on the list of letters said once');
  const s = KP.newGame('rev-shape', null, {});
  t.eq([led(s).reviews, bands(s), JSON.stringify(s.reviews || [])].join(' '), '0 0|0|0|0|0 []', 'a new career opens with no review on the file and the count at zero');
}

// ---- B. the year, in the terms her kind keeps ----------------------------------
{
  // the profit hunter: the till
  const s = world('rev-till', 'profitHunter');
  s.budget = 132.4;
  t.eq(fact(s), 'The till holds 132. Next year I will have a number to hold it against.', 'a profit hunter’s first review states the till, in whole units');
  s.reviews = [{ year: 0, week: 2, till: 100, sheets: 0 }];   // a filed review always carries its week (v0.11.38, §130)
  t.eq(fact(s), 'The till holds 132. At the last review it held 100. That is the direction I am paid to like.', 'after that he holds it against the last review');
  s.reviews = [{ week: 2, till: 100, sheets: 0 }, { week: 3, till: 200, sheets: 0 }];
  t.eq(fact(s), 'The till holds 132. At the last review it held 200. I am paid to notice the direction.', 'the last one, not an older one, and he notices a fall');
  s.reviews = [{ week: 3, till: 132, sheets: 0 }];
  t.eq(fact(s), 'The till holds 132. At the last review it held 132. A year, and the number did not move.', 'and a year that went nowhere');
}
{
  // the traditionalist: the best voice in the building
  const s = world('rev-voice', 'traditionalist');
  const idol = s.people[act(s).members[0]], tr = room(s)[0];
  s.roster.forEach(id => { s.people[id].talents.vocals.cur = 40; });
  idol.talents.vocals.cur = 95;
  t.eq(fact(s), 'The best voice in this building belongs to ' + KP.displayName(idol) + '. The public can hear it, which is the point.', 'a traditionalist names the best voice in the building; an idol’s is heard');
  tr.talents.vocals.cur = 99;
  t.eq(fact(s), 'The best voice in this building belongs to ' + KP.displayName(tr) + '. The public has not heard it yet.', 'a trainee’s is not, yet');
  idol.talents.vocals.cur = 99;
  t.eq(between(fact(s), ' belongs to ', '. '), KP.displayName([idol, tr].sort((a, b) => (a.id < b.id ? -1 : 1))[0]), 'of two voices alike she names the same one every time');
  tr.status = 'released'; idol.status = 'released';
  const next = s.roster.map(id => s.people[id]).filter(p => p.status === 'idol' || p.status === 'trainee').sort((a, b) => (a.id < b.id ? -1 : 1))[0];
  t.eq(between(fact(s), ' belongs to ', '. '), KP.displayName(next), 'someone who has left the building has no voice in it');
  s.roster.forEach(id => { s.people[id].status = 'released'; });
  t.eq(fact(s), 'There is no voice in this building to speak of, and I am the one who has to say so to the directors.', 'and an empty building has none');
}
{
  // the micromanager: the sheets
  const s = world('rev-sheets', 'micromanager');
  const [a, b] = room(s);
  s.roster.forEach((id, i) => { if (i % 2) s.people[id].evalHistory = []; else delete s.people[id].evalHistory; });
  s.evalLedger = { sheets: 13, climbs: 0, slides: 0, talks: 0 };
  a.evalHistory = [{ week: -10, rank: 1, of: 6 }, { week: 10, rank: 1, of: 6 }, { week: 14, rank: 2, of: 6 }];
  b.evalHistory = [{ week: 18, rank: 1, of: 6 }, { week: 22, rank: 1, of: 6 }];
  t.eq(fact(s), 'I read 13 evaluation sheets this year. ' + KP.displayName(b) + ' was first on more of them than anyone still in this building.', 'a micromanager counts the year’s sheets and names who was first most often');
  s.week = 46 + YEAR; s.reviews = [{ week: 46, till: 0, sheets: 12 }];
  a.evalHistory = [{ week: 40, rank: 1, of: 6 }, { week: 44, rank: 1, of: 6 }, { week: 46, rank: 1, of: 6 }, { week: 50, rank: 1, of: 6 }];
  b.evalHistory = [{ week: 60, rank: 1, of: 6 }, { week: 64, rank: 1, of: 6 }];
  t.eq(fact(s), 'I read one evaluation sheet this year. ' + KP.displayName(b) + ' was first on more of them than anyone still in this building.', 'the count is since the last review, and a first of more than a year ago is not this year’s');
  a.evalHistory = []; b.evalHistory = [{ week: 60, rank: 2, of: 6 }];
  t.eq(fact(s), 'I read one evaluation sheet this year. Nobody who was first on one is still in this building.', 'with nobody left who was first, she says so');
  s.reviews = [{ week: 46, till: 0, sheets: 13 }];
  t.eq(fact(s), 'No evaluation sheet reached my desk this year. I noticed.', 'and a year with no sheet is noticed');
  const tie = world('rev-sheets-tie', 'micromanager');
  const [c, d] = room(tie);
  tie.roster.forEach(id => { tie.people[id].evalHistory = []; });
  tie.evalLedger = { sheets: 2, climbs: 0, slides: 0, talks: 0 };
  c.evalHistory = [{ week: 10, rank: 1, of: 6 }]; d.evalHistory = [{ week: 14, rank: 1, of: 6 }];
  t.eq(between(fact(tie), ' this year. ', ' was first'), KP.displayName([c, d].sort((x, y) => (x.id < y.id ? -1 : 1))[0]), 'of two level she names the same one every time');
}
{
  // the trend chaser: the year's records against the year's sound
  const s = world('rev-sound', 'trendChaser');
  const g = act(s), home = lane(s, 30), off = offLane(home);
  const near = KP.C.CONCEPTS.map(c => c.id).find(x => x !== 'fusion' && KP.laneDistance(home, x) === 1);
  record(g, 0, { conceptId: home, songTitle: 'Inherited' });
  t.eq(fact(s), 'We released nothing this year. The market did not wait for us.', 'a trend chaser with no record this year says so; the records we inherited are not ours');
  record(g, 30, { conceptId: home });
  t.eq(fact(s), 'We released one record this year. It was in the sound of its year.', 'one record, in the sound');
  g.releases[g.releases.length - 1].conceptId = near;
  t.eq(fact(s), 'We released one record this year. It was not in the sound of its year.', 'next door to the sound is not in it');
  g.releases[g.releases.length - 1].conceptId = off;
  t.eq(fact(s), 'We released one record this year. It was not in the sound of its year.', 'one record, outside it');
  record(g, 34, { conceptId: off }); record(g, 38, { conceptId: off });
  t.eq(fact(s), 'We released 3 records this year. None of them were in the sound of the year they landed in.', 'three, none in it');
  g.releases[g.releases.length - 1].conceptId = home;
  t.eq(fact(s), 'We released 3 records this year. One of them was in the sound of the year it landed in.', 'three, one in it');
  g.releases[g.releases.length - 2].conceptId = home;
  t.eq(fact(s), 'We released 3 records this year. 2 of them were in the sound of the year they landed in.', 'three, two in it');
  g.releases[g.releases.length - 3].conceptId = home;
  t.eq(fact(s), 'We released 3 records this year. All of them were in the sound of the year they landed in.', 'three, all in it');
  // a year on: last year's records are not this year's, and each is judged by its own year
  s.week = 46 + YEAR;
  s.trendOverrides = [{ year: 1, lane: off, week: 49 }];   // the second year's sound is another one
  t.eq(fact(s), 'We released nothing this year. The market did not wait for us.', 'a record of more than a year ago is not this year’s');
  record(g, 47, { conceptId: home });   // the last weeks of the first year, and in that year's sound
  record(g, 60, { conceptId: off });    // the second year, in the second year's sound
  record(g, 70, { conceptId: home });   // the second year, in last year's sound
  t.eq(fact(s), 'We released 3 records this year. 2 of them were in the sound of the year they landed in.', 'and each is held to the sound of the year it landed in');
  // a second act's record counts
  const two = world('rev-sound-two', 'trendChaser');
  two.groups.push(Object.assign(JSON.parse(JSON.stringify(act(two))), { id: 'g-second', name: 'SECOND', members: ['nobody'], releases: [] }));
  record(two.groups[1], 20, { conceptId: lane(two, 20) });
  t.eq(fact(two), 'We released one record this year. It was in the sound of its year.', 'whichever of our acts released it');
}
{
  // the visionary: the record people will remember
  const s = world('rev-remember', 'visionary');
  const g = act(s);
  t.eq(fact(s), 'We released nothing this year. Nobody remembers a year like that.', 'a visionary with no record this year says so');
  record(g, 20, { songTitle: 'Plain', reception: 55, receptionBand: 'solid' });
  t.eq(fact(s), 'The best we made this year was “Plain”. I do not think anyone will remember it.', 'a respectable record is not one people remember');
  record(g, 30, { songTitle: 'Loud', reception: 70, receptionBand: 'strong' });
  record(g, 40, { songTitle: 'Later', reception: 70, receptionBand: 'strong' });
  t.eq(fact(s), 'People will remember “Loud”. That is one more record than most houses get in a year.', 'a strong one is, and of two that landed alike she names the first');
  record(g, 44, { songTitle: 'Louder', reception: 90, receptionBand: 'sensation' });
  t.eq(fact(s), 'People will remember “Louder”. That is one more record than most houses get in a year.', 'the one that landed hardest is the one');
  const quiet = world('rev-remember-quiet', 'visionary');
  record(act(quiet), 20, { songTitle: 'Hush', reception: 40, receptionBand: 'quiet' });
  t.eq(fact(quiet), 'The best we made this year was “Hush”. I do not think anyone will remember it.', 'a quiet landing is not remembered');
}
{
  // the patient executive: still here
  const s = world('rev-patient', 'patient');
  t.eq(fact(s), 'Year 1, and we are still here: one act under this roof, ' + room(s).length + ' trainees in the room.', 'a patient executive counts who is still under the roof');
  s.week = 46 + YEAR;
  room(s).slice(1).forEach(p => { p.status = 'released'; });
  act(s).retiredWeek = 60;
  t.eq(fact(s), 'Year 2, and we are still here: no acts under this roof, one trainee in the room.', 'in the year it is, with one and none said as words');
  room(s).forEach(p => { p.status = 'released'; });
  s.groups.push(Object.assign(JSON.parse(JSON.stringify(act(s))), { id: 'g-two', name: 'TWO', retiredWeek: null, members: ['nobody'] }));
  s.groups.push(Object.assign(JSON.parse(JSON.stringify(act(s))), { id: 'g-three', name: 'THREE', retiredWeek: null, members: ['nobody'] }));
  t.eq(fact(s), 'Year 2, and we are still here: 2 acts under this roof, no trainees in the room.', 'and more than one as a number');
}

// ---- C. where the desk stands, and what that opens --------------------------------
{
  // the year is the board season's when one is named, and the week's own when none is
  const y = world('rev-year', 'patient');
  y.week = 49;
  t.eq([say(() => KP.annualReview(y, 1).year), say(() => KP.annualReview(y, 1).said.slice(0, 7)), say(() => KP.annualReview(y).year), say(() => KP.annualReview(y).said.slice(0, 7))].join('|'), '1|Year 1,|2|Year 2,',
    'a review names the year it is for');
  [[85, 'trusted', INVESTORS], [65, 'solid', PITCH], [45, 'watched', PITCH], [25, 'thin', NO_PITCH], [5, 'gone', NO_PITCH]].forEach(([trust, band, opens]) => {
    const s = world('rev-band-' + band, 'patient', trust);
    const r = said(s);
    t.eq([r.band, r.said].join(' :: '), band + ' :: ' + [fact(s), BAND_SAID[band], opens].join(' '), 'at ' + trust + ' the desk is ' + band + ': the year, where it stands, and what that opens, in that order');
  });
  const edge = (trust, founded) => { const s = world('rev-edge', 'patient', trust); if (founded) s.founded = { week: 10, from: 'HCG' }; return say(() => KP.reviewOpens(s)); };
  t.eq([edge(44), edge(45), edge(69), edge(70)].join(' | '), [NO_PITCH, PITCH, PITCH, INVESTORS].join(' | '), 'a pitch is heard from 45, the gate the board already keeps; investors are told from 70, the founding’s');
  t.eq(edge(90, true), PITCH, 'under a founder’s own board nobody is calling about a founding');
  // reading it changes nothing, and draws nothing
  Object.keys({ visionary: 1, profitHunter: 1, traditionalist: 1, patient: 1, trendChaser: 1, micromanager: 1 }).forEach(k => {
    const s = world('rev-pure-' + k, k);
    const snap = JSON.stringify(s);
    const r = said(s);
    t.ok(r.band === 'solid' && r.said.length > 60 && JSON.stringify(s) === snap, 'what a ' + k + ' would say can be read without changing the file (' + r.said.slice(0, 40) + ')');
  });
}

// ---- D. board season's last word -----------------------------------------------------
{
  // each answer is followed by her review, read after what the answer did
  const TOAST = { build: '“We are building careers, not quarters.”', growth: 'Growth, on the record, with a number attached.', artists: 'You pointed at the artists' };
  [['build', 79, 'trusted'], ['growth', 79, 'solid'], ['artists', 80, 'solid']].forEach(([opt, trust, band]) => {
    const s = world('rev-file-' + opt, 'patient', trust);
    s.evalLedger = { sheets: 7, climbs: 0, slides: 0, talks: 0 };
    season(s);
    const before = KP.rngFor(s).state();
    const r = answer(s, opt);
    const n = letter(s), rec = last(s);
    t.ok(r.ok === true && (r.toast || '').startsWith(TOAST[opt]), opt + ': the board’s answer reads as it always did');
    t.eq([rec.band, rec.trust, rec.year, rec.week, rec.exec, rec.till, rec.sheets].join('|'), [band, opt === 'build' ? 80 : opt === 'artists' ? 79 : 79, 1, 46, 'CEO Baek Ji-soo', Math.round(s.budget), 7].join('|'),
      opt + ': her review is on the file, read after what the answer did to trust');
    t.eq(n.text, 'CEO Baek Ji-soo, when the directors had gone: “' + rec.said + '”', opt + ': the letter is hers, and says what the file keeps');
    t.ok(n.kind === 'executive' && n.priority === 'critical' && n.band === band && lands(n), opt + ': and it always lands');
    t.eq([led(s).reviews, (led(s).bands || {})[band], (s.reviews || []).length, JSON.stringify(KP.rngFor(s).state()) === JSON.stringify(before)].join('|'), '1|1|1|true', opt + ': counted once, under its band, and nothing drawn');
    t.eq(rec.said, [fact(s), BAND_SAID[band], KP.reviewOpens(s)].join(' '), opt + ': the three sentences, in order');
  });
}
{
  // answered late, after the year has turned: it is still the review of the year the board sat in
  const s = world('rev-late', 'patient', 65);
  season(s);
  s.week = 49;
  answer(s, 'growth');
  t.eq([last(s).year, last(s).week, (last(s).said || '').slice(0, 7)].join('|'), '1|49|Year 1,', 'a board answered after the year has turned is still reviewed for the year it sat in');
}
{
  // an empty chair at the board: the review comes all the same, after what that cost
  const s = world('rev-empty', 'profitHunter', 60);
  s.budget = 132;
  season(s);
  s.week = 49;
  const wire = settle(s);
  const n = wire.find(x => x.ind === 'annualReview') || {};
  const rec = last(s);
  t.eq([s.trust, rec.band, rec.trust, led(s).reviews, (led(s).bands || {}).watched].join('|'), '59|watched|59|1|1', 'an empty chair costs one, and the review is read after it');
  t.eq([rec.year, rec.week, Math.ceil(s.week / YEAR)].join('|'), '1|49|2', 'it is the review of the year the board sat in, though the year has turned by the time it is given');
  t.eq(n.text, 'Board season ended with the company’s chair empty at its own review. CEO Kang Min-ho covered for you, which cost him something, which means it cost you something. CEO Kang Min-ho, when the directors had gone: “' + rec.said + '”',
    'the letter says what the empty chair cost, and then what he said');
  t.ok(n.kind === 'executive' && n.priority === 'critical' && lands(n) && wire.filter(x => x.kind === 'executive').length === 1, 'one letter, and it always lands');
}
{
  // the years add up on the file
  const s = world('rev-years', 'profitHunter', 65);
  s.budget = 100; season(s); answer(s, 'growth');
  s.week = 46 + YEAR; s.budget = 150; season(s); answer(s, 'growth');
  t.eq((s.reviews || []).map(r => r.year + ':' + r.till).join(), '1:100,2:150', 'each year’s review is kept with the till it saw');
  t.ok((last(s).said || '').startsWith('The till holds 150. At the last review it held 100. That is the direction I am paid to like.'), 'and the second is held against the first');
  // a new chair's review sits beside the old one's, each under its name
  const next = chair('patient');
  s.executive = { name: next.name, gender: next.gender, personality: next.personality, intro: next.intro, since: 100 };
  s.week = 46 + 2 * YEAR; season(s); answer(s, 'growth');
  t.eq((s.reviews || []).map(r => r.exec).join(), 'CEO Kang Min-ho,CEO Kang Min-ho,CEO Baek Ji-soo', 'a new chair’s review sits beside the old one’s, each under its name');
  // twelve are kept
  for (let y = 4; y <= 16; y++) { s.week = 46 + (y - 1) * YEAR; season(s); answer(s, 'growth'); }
  t.eq([(s.reviews || []).length, ((s.reviews || [])[0] || {}).year, last(s).year, led(s).reviews].join('|'), '12|5|16|16', 'the file keeps the latest twelve, and the count keeps them all');
}

// ---- E. the Desk -------------------------------------------------------------------------
{
  const D = dom.load();
  const { App, el } = D;
  const esc = D.UI.esc;
  const render = (s, sub) => { App.state = s; App.mode = 'game'; App.tab = 'desk'; App.view = null; App.deskSub = sub || 'today'; App.render(); return el('screen').innerHTML; };
  [[85, 'trusted'], [65, 'solid'], [45, 'watched'], [25, 'thin'], [5, 'gone']].forEach(([trust, band]) => {
    t.ok(render(world('rev-chip-' + band, 'patient', trust)).includes('<span class="chip">trust: ' + band + '</span>'), 'at ' + trust + ' the Desk’s chip says ' + band + ', the word her review uses');
  });
  const s = world('rev-desk', 'profitHunter', 25);
  s.budget = 100;
  t.ok(!render(s, 'record').includes('The annual review'), 'with no review on the file the Desk lists none');
  season(s);
  let html = render(s);
  const sc = (s.scenes || []).find(x => x.kind === 'boardSeason') || {};
  t.ok(html.includes('data-scene="' + sc.id + '" data-opt="build"'), 'fixture: board season is on the Desk');
  say(() => D.click({ action: 'scene-opt', scene: sc.id, opt: 'growth' }));
  t.eq([(s.reviews || []).length, last(s).band, letter(s).priority].join('|'), '1|thin|critical', 'the real button files her review with the answer');
  s.week = 46 + YEAR; s.trust = 85; s.budget = 300; season(s); answer(s, 'growth');
  html = render(s, 'record');
  const iNew = html.indexOf('<b>CEO Kang Min-ho</b> <span class="chip gold">trusted</span>'), iOld = html.indexOf('<b>CEO Kang Min-ho</b> <span class="chip hot">thin</span>');
  t.ok(html.includes('<div class="kicker">The annual review</div>') && iNew > -1 && iOld > iNew, 'the record lists the reviews, the newest first, each with where the desk stood');
  t.ok(html.includes('“' + esc(last(s).said || 'nothing') + '”') && html.includes('“' + esc(((s.reviews || [])[0] || {}).said || 'nothing') + '”'), 'and what he said each time');
  t.ok(html.indexOf('The annual review') < html.indexOf('<div class="kicker">Conversations</div>'), 'above the conversations');
  const after = chair('patient');
  s.executive = { name: after.name, gender: after.gender, personality: after.personality, intro: after.intro, since: s.week };
  html = render(s, 'record');
  t.ok(html.includes('<b>CEO Kang Min-ho</b> <span class="chip gold">trusted</span>') && !html.includes('<b>CEO Baek Ji-soo</b> <span class="chip'), 'under the next chair each review still carries the name of the one who gave it');
  const CH = { trusted: 'chip gold', solid: 'chip cool', watched: 'chip', thin: 'chip hot', gone: 'chip hot' };
  Object.keys(CH).forEach(b => {
    const w = world('rev-desk-' + b, 'patient', { trusted: 85, solid: 65, watched: 45, thin: 25, gone: 5 }[b]);
    season(w); answer(w, 'growth');
    t.ok(render(w, 'record').includes('<b>CEO Baek Ji-soo</b> <span class="' + CH[b] + '">' + b + '</span>'), 'a review at ' + b + ' is marked as ' + b);
  });
}

// ---- F. the file, and the tools ------------------------------------------------------------
{
  const s = world('rev-save', 'profitHunter', 65);
  season(s); answer(s, 'growth');
  const again = KP.deserialize(KP.serialize(s));
  t.eq(JSON.stringify(again.reviews), JSON.stringify(s.reviews), 'a review is on the file, and comes back with it');
  const old = JSON.parse(KP.serialize(s));
  old.version = '0.11.27';
  delete old.reviews; delete old.upstairsLedger.reviews; delete old.upstairsLedger.bands;
  const back = KP.deserialize(JSON.stringify(old));
  t.eq([JSON.stringify(back.reviews), led(back).reviews, bands(back), back.version].join(' '), '[] 0 0|0|0|0|0 ' + KP.C.VERSION, 'an old file opens with no review on it, the count at zero, at this version');
  back.week = 46 + YEAR; season(back); answer(back, 'growth');
  t.ok((last(back).said || '').startsWith('The till holds ') && (last(back).said || '').includes('Next year I will have a number to hold it against.'), 'and its first review is a first review');
  const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const h = read('tools/harness.js'), l = read('tools/audit_longhaul.js');
  t.ok(h.includes("console.log('the annual review: given ") && ['reviewHeard:', 'reviewGone:'].every(k => h.includes(k)), 'the census prints the review’s line and holds bands on it');
  t.ok(h.includes('the reviews do not add up by band') && h.includes('a review is filed under a band its trust is not in') && h.includes('the reviews on the file are out of order'), 'with its guards');
  t.ok(l.includes("', reviews ' + up.reviews") && l.includes('a review is filed under a band its trust is not in'), 'the long haul carries it on each scenario’s line, with its flags');
  const ui = read('js/ui/views_desk.js');
  t.ok(!ui.includes('trustWord') && ui.includes("'<span class=\"chip\">trust: ' + KP.trustBand(state.trust) + '</span>'"), 'the Desk has no word of its own for trust any more');
}

// ---- G. real weeks ---------------------------------------------------------------------------
{
  const s = KP.newGame('rev-weeks', null, {});
  s.budget = 1e6;
  const seen = [], bad = [];
  for (let i = 0; i < 110; i++) {
    const a = say(() => { (s.scenes || []).slice().forEach(sc => { const d = KP.sceneDef(sc.kind); if (d) KP.resolveScene(s, sc.id, d.options(s, sc)[0].id); }); });
    if (typeof a === 'string') { bad.push('week ' + s.week + ' ' + a); break; }
    const before = (s.reviews || []).length;
    const r = say(() => KP.advanceWeek(s));
    if (typeof r === 'string') { bad.push('week ' + s.week + ' ' + r); break; }
    if (KP.validateState(s).length) bad.push('week ' + s.week + ' ' + KP.validateState(s)[0]);
    if ((s.reviews || []).length > before) seen.push(s.week);
  }
  const revs = s.reviews || [];
  t.ok(bad.length === 0, 'a hundred and ten real weeks hold together (' + (bad[0] || 'clean') + ')');
  t.eq(revs.map(r => r.year + ':' + (((r.week - 1) % YEAR) + 1)).join(), '1:46,2:46', 'board season sits at week 46 of each year, and each one ends with her review');
  t.ok(revs.every(r => r.band === KP.trustBand(r.trust) && r.exec === s.executive.name) && led(s).reviews === 2, 'each filed under the band its trust is in, under her name');
}

t.finish();
