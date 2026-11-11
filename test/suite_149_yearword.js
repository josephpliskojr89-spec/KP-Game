/* Suite 149 — the staff's year (v0.11.46, §139; the owner's ruling, §136:
   22, 26 and 33). The yearly word of v0.11.42 (§134) was a letter each week
   a chair turned a year. It is one letter now, in the first week of the new
   year: the house's year said once, then a line a chair, in the building's
   order. A word is two parts. The first is what the room did, the year's
   credit (§133) in the chair's voice (§79). The second is what is most
   telling of the chair's own year. Every line says only what the file
   holds; no chair says a sentence two years running; no two chairs of one
   letter say the same sentence; and the chair's card keeps its word. No
   draw is made.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   sentence fails by name; nothing here can crash or hang under a broken
   engine. The lines pinned here are this suite's own copy. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const desk0 = require('../tools/desk_count');
const staffYear = require('../tools/staff_year');
const KP = loadEngine();
const t = makeT('suite_149_yearword');
const Y = KP.C.WEEKS_PER_YEAR;

// ---- the kit ------------------------------------------------------------------
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const js = x => JSON.stringify(x);
const obj = x => (x && typeof x === 'object' ? x : { threw: String(x), text: String(x), first: String(x), second: String(x) });
const act = s => KP.groups(s)[0] || { name: 'no act', id: 'none', releases: [], members: [] };
const SEATS = (KP.C.HIRES || {}).SEATS || [];
const seatOf = seatId => SEATS.filter(x => x.id === seatId)[0] || {};
const LABEL = {}; SEATS.forEach(x => { LABEL[x.id] = x.label; });
// the chair's own start in the turn of the wordings is its hash. This suite picks ids whose start is nought, so
// the turn is the year's alone: in year 6 every cell is on its first wording, in year 7 on its second
const start = (s, id) => Math.floor(KP.hash01([s.seed, 'hires', id, 'yw'].join('|')) * 6);
const idFor = (s, seatId) => { for (let i = 0; i < 400; i++) { const id = 'sf' + i + '_' + seatId; if (start(s, id) === 0) return id; } return 'sf_none_' + seatId; };
// a building with no chairs sat, in the first week after a given year: each fixture seats its own
const desk = (seed, year) => { const s = KP.newGame(seed, null, {}); s.week = year * Y + 1; s.objective.status = 'met'; say(() => KP.staffSeats(s)); Object.keys(s.seats || {}).forEach(k => { delete s.seats[k]; }); return s; };
const turn = (s, year) => { s.week = year * Y + 1; return { O: (year - 1) * Y, C: year * Y }; };
const sit = (s, seatId, since, more) => { s.seats[seatId] = Object.assign({ id: idFor(s, seatId), name: 'Chair of ' + seatId, seatId, tier: 'working', knownForTag: null, since, style: 'scrappy', warmth: 60, candor: 60,
    resume: ['x'], truth: { base: 0.5, gem: false, bestSeat: 'vocal' } }, more || {}); return s.seats[seatId]; };
const rec = (week, closed, more) => Object.assign({ week, songTitle: 'T' + week, receptionBand: 'solid', trophies: 0, chartPeak: 9, chartWeeks: 3, conceptId: 'cute' },
  closed ? { closed: { week: week + 5, verdict: closed, trophies: closed === 'crowned' ? 1 : 0, lastStage: 'clean', room: 'fresh' } } : {}, more || {});
const records = (s, list, promoUntil) => { const g = act(s); g.debuted = true; g.releases = list; g.promoUntil = promoUntil || 0; delete g.retiredWeek; return g; };
const signed = (s, weeks) => { s.roster.forEach(id => { delete s.people[id].signedWeek; s.people[id].status = 'trainee'; }); weeks.forEach((w, i) => { if (s.roster[i]) s.people[s.roster[i]].signedWeek = w; }); };
const word = (s, seatId, taken, quiet) => obj(say(() => KP.seatYearWord(s, s.seats[seatId], taken, quiet)));
const raw = s => { const r = say(() => KP.staffYearLetter(s)); return r === null ? null : obj(r); };
// the letter, or one that says there is none: a check that reads its text fails by name and never crashes
const letter = s => raw(s) || { text: 'no letter was written', seats: [], kind: 'none' };
const lineOf = (s, seatId) => (letter(s).text.split('\n').filter(l => l.includes(', ' + LABEL[seatId] + ', '))[0] || 'no line for ' + seatId);
const phase = name => KP.weeklyPipeline([]).filter(p => p.name === name)[0] || { fn: () => { throw new Error('no phase ' + name); } };
const refuse = new Proxy({}, { get: (o, k) => () => { throw new Error('a draw was made: ' + String(k)); } });
const rail = s => { const box = []; const ran = say(() => { phase('seatYears').fn(s, refuse, box, [], KP.groups(s)); return 'ok'; }); return { ran, box, text: (box[0] || { text: 'no letter was written' }).text }; };
const sentences = text => String(text || '').split(/(?<=[.?!]) /).filter(Boolean);
// what a chair's card holds of the room's year: its word, less what it said of itself
const kept = st => { const w = (st || {}).word || { text: 'no word kept', second: '' }; return w.second && w.text !== w.second ? w.text.slice(0, w.text.length - w.second.length - 1) : w.text; };
const span = (line, whole) => line.replace('¤', whole === false ? 'in my weeks here' : 'last year');
const ROOMS = ['vocal', 'dance', 'perf', 'anr', 'marketing'];
// every part this suite reads, by the cell and the wording it stands for: a sentence belongs to one wording
const SEEN = {};
const note = (cell, k, len, part) => { if (!part) return; sentences(part).forEach(x => { (SEEN[x] = SEEN[x] || {})[cell + '#' + (k % len)] = true; }); };

// ---- A. the week the staff write ---------------------------------------------------------
{
  ['staffYearDue', 'seatYearWord', 'staffYearLetter'].forEach(k => t.ok(typeof KP[k] === 'function', 'the engine carries KP.' + k));
  t.ok(typeof KP.seatYearsDue === 'undefined' && typeof KP.seatYearLetter === 'undefined', 'and the week-a-chair-turns-a-year letters of v0.11.42 are gone');
  const s = desk('yw-due', 1);
  sit(s, 'vocal', 1); sit(s, 'scout', 1);
  const weeks = [1, 2, 47, 48, 49, 50, 96, 97, 98, 145, 289];
  t.eq(weeks.filter(w => { s.week = w; return say(() => KP.staffYearDue(s)) === true; }).join(), '49,97,145,289', 'the staff write in the first week of a year, and never in a career’s first week');
  t.eq(weeks.filter(w => { s.week = w; return rail(s).box.length === 1; }).join(), '49,97,145,289', 'and the rail writes one letter those weeks and none in the others');
  s.week = 97;
  const one = rail(s);
  t.eq([one.ran, (one.box[0] || {}).kind, (one.box[0] || {}).ind, (one.box[0] || {}).priority, (one.box[0] || {}).year, js((one.box[0] || {}).seats)].join('/'), 'ok/company/seatYear/critical/2/["vocal","scout"]',
    'it is one letter the week’s budget cannot cut, it says which year it is of and whose words are in it, and no draw is made');
  t.ok(desk0.ONE_SHOTS.includes('seatYear'), 'and it is on the list of letters said once');
  t.ok(!('words' in (one.box[0] || {})), 'the letter carries no second copy of the words');
  const none = desk('yw-none', 2);
  t.eq(js(raw(none)) + ' · ' + rail(none).box.length, 'null · 0', 'a building with nobody sat has nothing to say');
  delete none.seats;
  t.eq(js(raw(none)) + ' · ' + rail(none).box.length, 'null · 0', 'and one with no chairs on file likewise');
}

// ---- B. the letter, whole ---------------------------------------------------------------------
{
  const s = desk('yw-letter', 6);   // week 289: the year behind it is weeks 241 to 288
  records(s, [rec(240, 'cold'), rec(250, 'crowned'), rec(260, 'warm'), rec(285)], 300);
  sit(s, 'vocal', 1, { name: 'Yoon Hye-rim', candor: 30, warmth: 70, style: 'drillmaster' });
  sit(s, 'dance', 1, { name: 'Coach Bang', candor: 80, warmth: 20, style: 'nurturer' });
  sit(s, 'scout', 250, { name: 'Scout Im', candor: 80, warmth: 80 });
  sit(s, 'anr', 282, { name: 'Ok Kwang-soo' });
  sit(s, 'producer', 100, { name: 'Gong Seon-mi', candor: 60, warmth: 60, style: 'classicist', works: [{ week: 90 }, { week: 240 }, { week: 250 }, { week: 285 }] });
  sit(s, 'producer2', 200, { name: 'Ma Jae-hoon', candor: 30, warmth: 30, style: 'bigMachine', works: [{ week: 230 }] });
  signed(s, [250, 260, 288, 289, 100]);
  const want = ['Year 6, as the staff tell it. The house put out 3 eras: one closed with a trophy, one warm; one still running.',
    'Yoon Hye-rim, head vocal coach, six years in: “The vocal room did its part. After six years I know this building’s moods better than my own.”',
    'Coach Bang, head dance coach, six years in: “A record closed with a trophy last year on counts drilled in my room. A trophy has many parents, and I will not pretend to be the only one. After six years the chair fits. That is all I will say about it.”',
    'Scout Im, head scout, 39 weeks in: “Two of the roster signed in my weeks here. Whether they were the right ones is a question for the year of the debut. I am new here, and the building let me in faster than I expected.”',
    'Ok Kwang-soo, A&R lead, seven weeks in: too new to the chair for a word on the year.',
    'Gong Seon-mi, house producer, three years in: “Two of this house’s records last year were my productions. They are on the shelf with my name on them, for better or worse. Fundamentals first, every week. People groan, and then they thank me, usually in that order.”',
    'Ma Jae-hoon, second house producer, a year in: “My studio put nothing on the shelf last year. Ready when asked. I report by the quarter. This one is on time.”'];
  const got = letter(s).text.split('\n');
  want.forEach((line, i) => t.eq(got[i], line, i ? 'line ' + i + ' of the letter: the chair’s name, its title, its time in the chair, and its word' : 'the letter opens on the year and what the house put out in it'));
  t.eq(got.length, want.length, 'a line a chair sat, in the building’s order, and no more');
  t.eq(js(letter(s).seats), js(['vocal', 'dance', 'scout', 'producer', 'producer2']), 'it lists the chairs that have a word in it');
  // the tools read it as it is written
  const L = staffYear.read(letter(s).text);
  t.eq([L.year, L.house, L.lines.length, L.lines.filter(l => l.bad).length].join('/'), '6/3/6/0', 'the tools read its year, the eras it gives the house, and every line');
  const quoted = line => (line.includes('“') ? line.slice(line.indexOf('“') + 1, -1) : '-');
  t.eq(L.lines.map(l => [l.name, l.label, l.arrived ? 'new' : l.weeks != null ? l.weeks + 'w' : l.years + 'y', l.word == null ? '-' : l.word].join(':')).join(' | '),
    ['Yoon Hye-rim:head vocal coach:6y:' + quoted(want[1]), 'Coach Bang:head dance coach:6y:' + quoted(want[2]), 'Scout Im:head scout:39w:' + quoted(want[3]), 'Ok Kwang-soo:A&R lead:7w:-',
      'Gong Seon-mi:house producer:3y:' + quoted(want[5]), 'Ma Jae-hoon:second house producer:1y:' + quoted(want[6])].join(' | '),
    'each line by its name, its title, its weeks or years, and its word');
  t.ok(staffYear.read('Year 6, as the staff tell it. The house put out 3 eras.\nSomebody said something').lines[0].bad === true && staffYear.read('The staff on Year 6.').year === null, 'a line it cannot read is marked, and a heading it cannot read gives no year');
  // two of one name are told apart by the chair on each line (§138)
  s.seats.dance.name = 'Yoon Hye-rim';
  t.ok(lineOf(s, 'vocal').startsWith('Yoon Hye-rim, head vocal coach, ') && lineOf(s, 'dance').startsWith('Yoon Hye-rim, head dance coach, '), 'two chairs of one name are told apart by the title on each line');
}

// ---- C. the house’s year ------------------------------------------------------------------------
{
  const s = desk('yw-house', 6);
  sit(s, 'scout', 1);
  const head = () => letter(s).text.split('\n')[0];
  records(s, []);
  t.eq(head(), 'Year 6, as the staff tell it. The house put out nothing, so no room has a record to speak of.', 'a year the house put out nothing');
  records(s, [rec(260, 'warm')]);
  t.eq(head(), 'Year 6, as the staff tell it. The house put out one era, which closed warm.', 'one era, and how it closed');
  records(s, [rec(250, 'cold'), rec(260, 'cold')]);
  t.eq(head(), 'Year 6, as the staff tell it. The house put out 2 eras, all closed cold.', 'two that closed alike');
  // the year is the one the books closed the week before: the weeks after 240, up to 288
  records(s, [rec(240, 'warm'), rec(241, 'warm'), rec(288, 'warm'), rec(289, 'warm')]);
  t.eq(head(), 'Year 6, as the staff tell it. The house put out 2 eras, all closed warm.', 'a record that landed the last week of the year before is not this year’s, and one that landed this week is next year’s');
  t.eq(say(() => KP.yearAccount(s, 6).records), 2, 'and the year’s own books count the same records');
  // at a house the desk came to during the year, the weeks since it came
  s.chapterSince = 262;
  records(s, [rec(250, 'warm'), rec(261, 'warm'), rec(262, 'warm'), rec(270, 'cold')]);
  t.eq(head() + ' · ' + say(() => KP.yearAccount(s, 6).records), 'Year 6, as the staff tell it. The house put out 2 eras: one closed warm, one cold. · 2', 'at a house the desk came to in the year, what it put out since, as its books count it');
}

// ---- D. the time in the chair, and a chair too new to speak --------------------------------------
{
  t.eq((KP.C.HIRES || {}).wordAfter, 12, 'a chair has a word on the year after twelve weeks in it');
  const s = desk('yw-tenure', 14);   // week 673
  sit(s, 'scout', 1);
  const tag = n => { sit(s, 'vocal', s.week - n); const m = /^Chair of vocal, head vocal coach, ([^:]+): (“|too new to the chair for a word on the year\.$)/.exec(lineOf(s, 'vocal')); return m ? m[1] + (m[2] === '“' ? ' +' : ' -') : lineOf(s, 'vocal'); };
  t.eq([0, 1, 2, 11, 12, 13, 47, 48, 95, 96, 624].map(tag).join(' | '),
    'just arrived - | just arrived - | two weeks in - | eleven weeks in - | twelve weeks in + | 13 weeks in + | 47 weeks in + | a year in + | a year in + | two years in + | 13 years in +',
    'the time in the chair as a person says it, and a word from the twelfth week on');
  sit(s, 'vocal', s.week - 11);
  t.ok(!('word' in s.seats.vocal) && rail(s).box.length === 1 && !('word' in s.seats.vocal), 'a chair too new to speak keeps no word');
  delete s.seats.scout;
  t.eq(js(raw(s)) + ' · ' + rail(s).box.length, 'null · 0', 'and a building where nobody has sat twelve weeks writes no letter');
}

// ---- E. each room’s own words ------------------------------------------------------------------------
const ROOM = {
  vocal: ['Every voice on a record ¤ came through my room. How much of what you heard was the room, I could not tell you.', 'The vocal room did its part.'],
  dance: ['The counts under every record ¤ were drilled in my room. Whether the drilling is what you saw, I would not swear to.', 'The dance room did its part.'],
  perf: ['I ran the rehearsals behind every record ¤. A stage can go wrong after a good rehearsal, and right after a bad one.', 'The rehearsals ran to schedule.'],
  anr: ['Every demo that became a record ¤ crossed my desk first. I can tell you what I liked. I cannot tell you what I was right about.', 'The demo sheet was in order.'],
  marketing: ['Every push behind a record ¤ was planned on my desk. What a push bought and what a record earned alone, nobody can pull apart.', 'The campaigns ran as planned.'],
};
const QUIET = {
  vocal: ['No record went out ¤ with a voice from my room on it, so there is nothing of mine to point at.', 'Nothing went out ¤. The vocal room is ready.'],
  dance: ['There was no record ¤, so nobody has seen what my room’s counts look like under one.', 'Nothing to report from the dance room ¤.'],
  perf: ['No record went out ¤ for my room to stage. I cannot tell you what the room would have done.', 'No record to stage ¤. The rehearsal room is ready.'],
  anr: ['No demo became a record ¤. I have a drawer of them and no proof.', 'A quiet stretch for the demo sheet ¤.'],
  marketing: ['A campaign needs a record, and there was none ¤. My desk has plans and nothing to show for them.', 'No release ¤, so no campaign.'],
};
const CROWNED = {
  vocal: 'A record with my room’s voices on it closed with a trophy ¤. I would like to say the room did that. I can say the room was there.',
  dance: 'A record closed with a trophy ¤ on counts drilled in my room. A trophy has many parents, and I will not pretend to be the only one.',
  perf: 'I rehearsed a record that closed with a trophy ¤. The rehearsal did not win it, and it did not lose it either.',
  anr: 'A demo that crossed my desk became a record with a trophy ¤. I would like to say I knew. I can say I did not stop it.',
  marketing: 'The campaign behind a trophy ¤ was planned on my desk. A trophy makes every campaign look clever afterwards.',
};
const COLD = {
  vocal: ' ¤ closed cold, with my room’s voices on it. I have gone over the room’s part and cannot find the answer there. That is not the same as it not being there.',
  dance: ' ¤ closed cold, on counts drilled in my room. I have watched the stages back, and I still cannot tell you what the room should have done differently.',
  perf: ' I rehearsed ¤ closed cold. A rehearsal cannot save a record, and I do not know that mine tried hard enough.',
  anr: ' that began on my desk ¤ closed cold. That is my sheet, and I am the one who should say so.',
  marketing: ' my desk pushed ¤ closed cold. A campaign cannot make a record land, and I cannot prove mine did not help it miss.',
};
{
  const s = desk('yw-rooms', 6);
  ROOMS.forEach(k => sit(s, k, 1, { candor: 50 }));
  const voices = (k, fn) => { s.seats[k].candor = 50; const a = fn(); s.seats[k].candor = 49; const b = fn(); s.seats[k].candor = 50; return a + ' | ' + b; };
  const first = k => word(s, k).first;
  // a year with a record out
  records(s, [rec(260, 'warm'), rec(270, 'quiet')]);
  ROOMS.forEach(k => t.eq(voices(k, () => first(k)), span(ROOM[k][0]) + ' | ' + ROOM[k][1], 'the ' + k + ' chair in a year with records out: candid, it says what it cannot know; careful, it sands it'));
  // a trophy, and a year gone cold: a candid chair says so, a careful one says what it says of any year
  records(s, [rec(260, 'crowned'), rec(270, 'cold')]);
  ROOMS.forEach(k => t.eq(voices(k, () => first(k)), span(CROWNED[k]) + ' | ' + ROOM[k][1], 'the ' + k + ' chair in a year a record closed with a trophy'));
  records(s, [rec(260, 'cold'), rec(270, 'cold')]);
  ROOMS.forEach(k => t.eq(voices(k, () => first(k)), 'Every record' + span(COLD[k]) + ' | ' + ROOM[k][1], 'the ' + k + ' chair in a year every record closed cold'));
  records(s, [rec(260, 'cold')]);
  t.eq(ROOMS.map(k => first(k).split(' ').slice(0, 3).join(' ')).join(' | '), ROOMS.map(() => 'The one record').join(' | '), 'one record that closed cold is “the one record”');
  records(s, [rec(260, 'cold'), rec(270, 'warm')]);
  t.eq(first('vocal'), span(ROOM.vocal[0]), 'a cold record beside a warm one is a year with records out');
  records(s, [rec(260, 'cold'), rec(285)], 300);
  t.eq(first('vocal'), span(ROOM.vocal[0]), 'and so is a cold record beside one still running');
  // a chair that came after the year’s records speaks of its own weeks, and says nothing went out in them
  records(s, [rec(250, 'warm')]);
  ROOMS.forEach(k => { s.seats[k].since = 250; });
  ROOMS.forEach(k => t.eq(voices(k, () => first(k)), span(QUIET[k][0], false) + ' | ' + span(QUIET[k][1], false), 'the ' + k + ' chair, come after the year’s one record: nothing went out in its weeks here'));
  // the wordings take turns by the year, three to a room with records out and three for a trophy
  const through = (k, list, cell, len, more) => { s.seats[k].since = 1; const out = {}; [6, 7, 8, 9, 10, 11].forEach(y => { const w = turn(s, y); records(s, list(w)); Object.assign(s.seats[k], more || {});
    const p = first(k); out[p] = true; note(cell + ':' + k, y, len, p); }); turn(s, 6); return Object.keys(out).length; };
  const counts = [];
  ROOMS.forEach(k => { [50, 49].forEach(c => { counts.push(through(k, w => [rec(w.O + 9, 'warm')], 'room' + c, 3, { candor: c })); counts.push(through(k, w => [], 'quiet' + c, 2, { candor: c })); });
    counts.push(through(k, w => [rec(w.O + 9, 'crowned')], 'crowned', 3, { candor: 50 })); counts.push(through(k, w => [rec(w.O + 9, 'cold'), rec(w.O + 19, 'cold')], 'cold', 2, { candor: 50 })); });
  t.eq(counts.join(''), ROOMS.map(() => '323232').join(''), 'each room has three wordings for a year with records out, in either voice, three for a trophy, and two for a quiet year or a cold one');
}

// ---- F. the scout, by who of the roster signed ----------------------------------------------------------
{
  const s = desk('yw-scout', 6);
  sit(s, 'scout', 1, { candor: 80 });
  const first = () => word(s, 'scout').first;
  const both = () => { s.seats.scout.candor = 80; const a = first(); s.seats.scout.candor = 10; const b = first(); s.seats.scout.candor = 80; return a + ' | ' + b; };
  signed(s, [240, 241, 260, 288, 289, 100]);
  t.eq(both(), 'Three of the roster signed last year. Whether they were the right ones is a question for the year of the debut. | Three signed last year. The pipeline is where it should be.',
    'the scout: those of the roster who signed in the year, and not the week before it or the week after');
  signed(s, [260]);
  t.eq(both(), 'One of the roster signed last year. Whether that was the right one is a question for the year of the debut. | One signed last year. The pipeline is where it should be.', 'one who signed is “the right one”');
  turn(s, 7);
  signed(s, [300]);
  t.eq(both(), 'One of the roster joined last year, while the board was mine. A signing is a guess that takes years to mark. | One signing last year. The board is in order.', 'the year after, the other wording, and one signing is not “signings”');
  turn(s, 6);
  const many = Math.min(13, s.roster.length);
  signed(s, Array.from({ length: many }, () => 270));
  t.ok(first().startsWith((many >= 13 ? '13' : ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'][many]) + ' of the roster signed last year.'), 'a count past twelve is given in figures');
  signed(s, [240, 289]);
  t.eq(both(), 'Nobody on the roster signed last year, so I have nothing to point at. | No signing to report last year. The desk stays open.', 'a year nobody of the roster signed');
  s.seats.scout.since = 250;
  signed(s, [245, 251]);
  t.eq(first(), 'One of the roster signed in my weeks here. Whether that was the right one is a question for the year of the debut.', 'a scout who came during the year counts from the week they came, and speaks of their weeks here');
  // whole years running with nothing: the chair counts them
  s.seats.scout.since = 1;
  signed(s, []);
  const said = [6, 7, 8, 9, 10].map(y => { turn(s, y); signed(s, y === 9 ? [400] : []); rail(s); return (s.seats.scout.word || {}).dry + ':' + kept(s.seats.scout); });
  t.eq(said.join(' | '), ['1:Nobody on the roster signed last year, so I have nothing to point at.',
    '2:Two years now without a signing that stayed, and a scout is paid for the ones who stay.',
    '3:That is three years running with nobody on the roster signed on my watch, and I know how that reads.',
    '0:One of the roster joined last year, while the board was mine. A signing is a guess that takes years to mark.',
    '1:Nobody on the roster signed last year, so I have nothing to point at.'].join(' | '),
  'a second whole year with nobody signed is counted aloud, and a third; a signing ends the count, and the next empty year starts it again');
  s.seats.scout.candor = 10; delete s.seats.scout.word; signed(s, []);
  const sanded = [6, 7, 8].map(y => { turn(s, y); rail(s); return kept(s.seats.scout); });
  t.eq(sanded.join(' | '), 'No signing to report last year. The desk stays open. | No signing to report, two years running. | Three years without a signing to report.', 'a careful scout counts them too, in fewer words');
  // a year sat in part is not a whole year of nothing, and a year the chair said nothing in breaks the count
  turn(s, 6); delete s.seats.scout.word; s.seats.scout.since = 250;
  rail(s);
  t.eq((s.seats.scout.word || {}).dry, 0, 'a year sat in part is not counted as a whole year with nothing');
  turn(s, 7); rail(s);
  t.eq((s.seats.scout.word || {}).dry + ' · ' + kept(s.seats.scout), '1 · The roster added nobody last year. The board is current.', 'the first whole year with nothing is said plainly');
  turn(s, 9); rail(s);
  t.eq((s.seats.scout.word || {}).dry, 1, 'and a count is of years running: a word from two years back does not carry it');
  // every wording of the scout's, for the count of sentences below
  [['scout:candid', 80], ['scout:careful', 10]].forEach(c => { s.seats.scout.candor = c[1]; s.seats.scout.since = 1; delete s.seats.scout.word;
    [6, 7, 8, 9, 10, 11].forEach(y => { turn(s, y); signed(s, [(y - 1) * Y + 5, (y - 1) * Y + 6]); note(c[0] + ':some', y, 2, word(s, 'scout').first); });
    [6, 7, 8, 9, 10, 11].forEach(y => { turn(s, y); signed(s, []); delete s.seats.scout.word; note(c[0] + ':none', y, 2, word(s, 'scout').first);
      s.seats.scout.word = { week: s.week - Y, text: 'x', second: '', dry: 1 }; note(c[0] + ':dry', y, 2, word(s, 'scout').first); }); });
}

// ---- G. the studio chairs, each craft in its own words ---------------------------------------------------
{
  const s = desk('yw-studio', 6);
  const works = weeks => weeks.map(w => ({ week: w, title: 'W' + w }));
  sit(s, 'producer', 100, { candor: 70, works: works([90, 100, 240, 241, 288, 289]) });
  sit(s, 'writer', 100, { candor: 70, works: works([241, 288]) });
  const first = k => word(s, k).first;
  const both = k => { s.seats[k].candor = 70; const a = first(k); s.seats[k].candor = 30; const b = first(k); s.seats[k].candor = 70; return a + ' | ' + b; };
  t.eq(both('producer'), 'Two of this house’s records last year were my productions. They are on the shelf with my name on them, for better or worse. | Two productions for the house last year. More when the calendar asks.',
    'a house producer: the records made here in the year, and not the week before it or the week after');
  t.eq(both('writer'), 'I wrote two of this house’s records last year. A song stops being yours the day it is sung, and I could not tell you what they are now. | Two of the records last year carry my writing.', 'a house writer says it as a writer');
  s.seats.producer.works = works([260]); s.seats.writer.works = works([260]);
  t.eq(both('producer'), 'One of this house’s records last year was my production. It is on the shelf with my name on it, for better or worse. | One production for the house last year. More when the calendar asks.', 'one record is “it”');
  t.eq(both('writer'), 'I wrote one of this house’s records last year. A song stops being yours the day it is sung, and I could not tell you what it is now. | One of the records last year carries my writing.', 'for the writer too');
  s.seats.producer.works = works([240]); s.seats.writer.works = works([289]);
  t.eq(both('producer'), 'No record of mine went out last year. I would rather say it than have you look for one. | No production under my name last year. The lane is ready.', 'a producer with nothing out in the year');
  t.eq(both('writer'), 'Nothing I wrote was recorded last year. The pages exist. That is all I can say for them. | No writing credit last year. The desk is clear.', 'and a writer');
  // a record made before the chair was taken, or the week it was, is not this house’s (§132)
  s.seats.producer.since = 260; s.seats.producer.works = works([250, 260, 261]);
  t.eq(first('producer'), 'One of this house’s records in my weeks here was my production. It is on the shelf with my name on it, for better or worse.', 'a chair that came during the year counts what it made here since');
  // the second chair of a craft is a wording apart from the first, every year
  sit(s, 'producer2', 100, { candor: 70 }); sit(s, 'writer2', 100, { candor: 70 }); s.seats.producer.since = 100;
  const apart = [], own = [];
  ['producer', 'writer'].forEach(k => { let was = {};
    [6, 7, 8, 9, 10, 11].forEach(y => { const w = turn(s, y); [k, k + '2'].forEach(x => { s.seats[x].works = y % 3 ? works([w.O + 4]) : []; delete s.seats[x].word; });
      const a = first(k), b = first(k + '2'); apart.push(a !== b && !sentences(a).some(x => sentences(b).includes(x)));
      own.push(a !== was.a && b !== was.b); was = { a, b };
      note('shelf:' + k + ':candid' + (y % 3 ? ':some' : ':none'), y, 2, a); note('shelf:' + k + ':candid' + (y % 3 ? ':some' : ':none'), y + 1, 2, b); }); });
  t.eq(apart.join(), Array(12).fill(true).join(), 'two chairs of one craft, alike in voice and in what they made, never say the same sentence in one letter');
  t.eq(own.join(), Array(12).fill(true).join(), 'and neither says what it said the year before');
  turn(s, 6);
  // careful, both crafts, both turns; and the years running with nothing
  ['producer', 'writer'].forEach(k => { s.seats[k].candor = 30; [6, 7].forEach(y => { const w = turn(s, y); s.seats[k].works = works([w.O + 4]); note('shelf:' + k + ':careful:some', y, 2, first(k)); s.seats[k].works = []; note('shelf:' + k + ':careful:none', y, 2, first(k)); }); });
  const dry = (k, c) => { s.seats[k].candor = c; s.seats[k].works = []; delete s.seats[k].word; return [6, 7, 8].map(y => { turn(s, y); rail(s); const w = s.seats[k].word || {};
    note('shelf:' + k + (c >= 50 ? ':candid' : ':careful') + (w.dry > 1 ? ':dry' : ':none'), y, 2, kept(s.seats[k]));
    return w.dry + ':' + sentences(w.text)[0]; }).join(' | '); };
  delete s.seats.producer2; delete s.seats.writer2;
  t.eq(dry('producer', 70), '1:No record of mine went out last year. | 2:Two years now without a production of mine going out, and I have kept count in case nobody else has. | 3:That is three years running with nothing of mine on the shelf, and I would rather you heard the count from me.',
    'a producer counts the whole years running with nothing out');
  t.eq(dry('producer', 30), '1:No production under my name last year. | 2:No production under my name, two years running. | 3:Three years without a production under my name.', 'in fewer words when careful');
  t.eq(dry('writer', 70), '1:Nothing I wrote was recorded last year. | 2:Two years now without a song of mine going out, and I notice it more each year. | 3:That is three years running with nothing I wrote recorded, and the pages have piled up with the count.', 'a writer counts them as a writer');
  t.eq(dry('writer', 30), '1:No writing credit last year. | 2:No writing credit, two years running. | 3:Three years without a writing credit.', 'and in fewer words');
}

// ---- H. what a word claims, as the tools read it ---------------------------------------------------------
{
  const s = desk('yw-claims', 6);
  const C = w => { const c = staffYear.claims(w); return (c.trophy ? 'T' : '-') + (c.cold ? 'C' : '-') + (c.nothing ? 'N' : '-') + (c.count == null ? '_' : c.count) + (c.running == null ? '_' : c.running); };
  ROOMS.forEach(k => sit(s, k, 1));
  const each = (list, more) => { records(s, list); return ROOMS.map(k => [50, 49].map(c => { Object.assign(s.seats[k], { candor: c }, more || {}); return [6, 7, 8].map(y => { turn(s, y); records(s, list.map(r => rec(r.week + (y - 6) * Y, (r.closed || {}).verdict))); return C(word(s, k).first); }).join(''); }).join('/')).join(' '); };
  t.eq(each([rec(260, 'warm')]), ROOMS.map(() => '---__---__---__/---__---__---__').join(' '), 'a room’s word on a year with records out claims no trophy, no cold and no nothing, in any wording');
  t.eq(each([rec(260, 'crowned')]), ROOMS.map(() => 'T--__T--__T--__/---__---__---__').join(' '), 'a candid room’s word on a trophy year reads as one, in each of its wordings');
  t.eq(each([rec(260, 'cold'), rec(261, 'cold')]), ROOMS.map(() => '-C-__-C-__-C-__/---__---__---__').join(' '), 'a candid room’s word on a cold year reads as one');
  ROOMS.forEach(k => { s.seats[k].since = 1; });
  const quiet = ROOMS.map(k => [50, 49].map(c => { s.seats[k].candor = c; return [6, 7].map(y => { turn(s, y); records(s, [rec((y - 1) * Y + 2, 'warm')]); s.seats[k].since = (y - 1) * Y + 5; return C(word(s, k).first); }).join(''); }).join('/')).join(' ');
  t.eq(quiet, ROOMS.map(() => '--N0_--N0_/--N0_--N0_').join(' '), 'a room’s word on its weeks with no record reads as nothing, in either voice and either wording');
  // the scout and the studio: the count the word opens on, nothing, and the years running
  sit(s, 'scout', 1); sit(s, 'producer', 1); sit(s, 'writer', 1);
  const counted = n => [6, 7].map(y => { const w = turn(s, y); signed(s, Array.from({ length: n }, (x, i) => w.O + 3 + i)); ['producer', 'writer'].forEach(k => { s.seats[k].works = Array.from({ length: n }, (x, i) => ({ week: w.O + 3 + i })); delete s.seats[k].word; }); delete s.seats.scout.word;
    return ['scout', 'producer', 'writer'].map(k => [70, 30].map(c => { s.seats[k].candor = c; return C(word(s, k).first); }).join('')).join(' '); }).join(' · ');
  t.eq(counted(3), '---3_---3_ ---3_---3_ ---3_---3_ · ---3_---3_ ---3_---3_ ---3_---3_', 'a scout’s word and a studio chair’s open on a count the tools can read, in either voice and either wording');
  t.eq(counted(1), '---1_---1_ ---1_---1_ ---1_---1_ · ---1_---1_ ---1_---1_ ---1_---1_', 'one as well as three');
  t.eq(counted(0), '--N0_--N0_ --N0_--N0_ --N0_--N0_ · --N0_--N0_ --N0_--N0_ --N0_--N0_', 'and nothing reads as nothing');
  const running = [6, 7].map(y => { turn(s, y); signed(s, []); return ['scout', 'producer', 'writer'].map(k => [70, 30].map(c => { Object.assign(s.seats[k], { candor: c, works: [], word: { week: s.week - Y, text: 'x', second: '', dry: 2 } }); return C(word(s, k).first); }).join('')).join(' '); }).join(' · ');
  t.eq(running, '--N03--N03 --N03--N03 --N03--N03 · --N03--N03 --N03--N03 --N03--N03', 'a word that counts the years running with nothing reads as nothing, and the tools read the count');
}

// ---- I. the second part: what is most telling of the chair’s own year -----------------------------------
const STYLE = {
  drillmaster: ['I start at eight and I expect company. I would do it again tomorrow, gladly.', 'I start on time and I finish what is on the list. That has not changed.'],
  nurturer: ['I know how everyone on this floor takes their coffee, and I can tell when one of them has not slept.', 'I keep an eye on who is tired. I do not make a show of it.'],
  bigMachine: ['Give me a floor of departments and I am happy. I have been happy here, whatever the floor plan.', 'I work best with a structure around me. I have built what structure the house allows.'],
  scrappy: ['I have done this job with less, and I liked doing it with these people.', 'I have done this job with less. I have not asked for more.'],
  classicist: ['Fundamentals first, every week. People groan, and then they thank me, usually in that order.', 'The fundamentals do not change with the charts. Neither did my weeks.'],
  trendChaser: ['I brought this week’s numbers to every meeting, and somebody always laughed. I enjoy that.', 'I read the numbers every week. Last year’s do not interest me.'],
};
{
  const s = desk('yw-second', 6);
  records(s, [rec(250, 'warm')]);
  const st = sit(s, 'vocal', 250, { candor: 50, warmth: 50, keptWeek: 283, postedWeek: 284, meshNoted: 285 });
  const second = () => word(s, 'vocal').second;
  const by = (key, a, b) => { st[key] = a; const x = second(); st[key] = b; const y = second(); st[key] = a; return x + ' | ' + y; };
  t.eq(by('candor', 50, 49), 'Somebody rang for me last year and you answered it. I have not forgotten which of us picked up the bill. | The matter of the outside offer is closed, with thanks.',
    'a chair the desk kept after a call says so before anything else: candid at fifty, careful under it');
  delete st.keptWeek;
  t.eq(by('candor', 50, 49), 'I saw the posting for my chair last year. I am still in it, and I have drawn my own conclusions. | I understand the chair was advertised last year. I have carried on.', 'then a chair the desk advertised while it was sat');
  delete st.postedWeek;
  t.eq(by('candor', 50, 49), 'I know what the corridor says about my method and this house. The corridor may be right. | There has been talk about fit. I would rather let the work answer it.', 'then the corridor’s read of its method');
  delete st.meshNoted;
  t.eq(by('warmth', 50, 49), 'I am new here, and the building let me in faster than I expected. | I am still new here. I am still finding where things are kept.', 'then a chair in its first year at a house already running: warm at fifty, reserved under it');
  // which of them the year holds: the weeks after 240, up to 288
  const held = (key, w) => { ['keptWeek', 'postedWeek', 'meshNoted'].forEach(k => { delete st[k]; }); st[key] = w; const x = second(); delete st[key]; return /rang for me|matched an offer|outside offer|glad to stay/.test(x) ? 'kept' : /posting|advertised/.test(x) ? 'posted' : /corridor|met in the middle|talk about/.test(x) ? 'corridor' : 'no'; };
  st.since = 1;
  t.eq([240, 241, 288, 289].map(w => held('keptWeek', w)).join(), 'no,kept,kept,no', 'a call answered the year before is not this year’s, and one answered this week is next year’s');
  t.eq([240, 241, 288, 289].map(w => held('postedWeek', w)).join() + ' · ' + [240, 241, 288, 289].map(w => held('meshNoted', w)).join(), 'no,posted,posted,no · no,corridor,corridor,no', 'the same for a posting and for the corridor’s read');
  t.eq(held('meshNoted', 1), 'no', 'an old file’s mark that the corridor’s read was once said is not a week of this year');
  turn(s, 1); records(s, []);
  t.eq(held('meshNoted', 1), 'corridor', 'though in a career’s first year it is');
  // a first year is for a chair that came to a house already running, not one the building opened with
  turn(s, 6); records(s, [rec(250, 'warm')]);
  const isNew = (since, came) => { st.since = since; if (came) s.chapterSince = came; else delete s.chapterSince; const x = /new here/.test(second()); delete s.chapterSince; return x; };
  t.eq([isNew(241), isNew(289 - 12), isNew(240), isNew(250, 250), isNew(251, 250)].join(), 'true,true,false,false,true', 'new is a chair sat a year or less that came after the building opened to this desk');
  turn(s, 1); records(s, []);
  t.eq(isNew(1), false, 'the chairs a career’s first house opened with are not new to it');
  // then a long tenure and how they work, which take the years in turn
  turn(s, 6); records(s, [rec(250, 'warm')]);
  st.since = s.week - 4 * Y;
  t.eq(by('warmth', 50, 49), 'After four years I know this building’s moods better than my own. | After four years the chair fits. That is all I will say about it.', 'four years sat, to the week: the chair says how long');
  st.since = s.week - 4 * Y + 1;
  t.eq(by('warmth', 50, 49), STYLE.scrappy[0] + ' | ' + STYLE.scrappy[1], 'a week short of four years, it says how it works');
  st.since = 1;
  const kinds = [6, 7, 8, 9, 10, 11].map(y => { turn(s, y); records(s, [rec((y - 1) * Y + 9, 'warm')]); delete st.word; const x = second(); note('long:' + (st.warmth >= 50), Math.floor(y / 2), 2, / in this chair|^After /.test(x) ? x : ''); return / in this chair|^After /.test(x) ? 'long:' + x.split(/(?<=years) /)[0] : 'style'; });
  t.eq(kinds.join(' | '), 'long:After six years | style | long:Eight years | style | long:After ten years | style', 'a long tenure is said every other year, in two wordings by turn, and the years are counted');
  // how they work: six styles, warm and reserved, three wordings each
  turn(s, 6); records(s, [rec(250, 'warm')]); st.since = 200;
  Object.keys(STYLE).forEach(k => { st.style = k; t.eq(by('warmth', 50, 49), STYLE[k][0] + ' | ' + STYLE[k][1], 'how a ' + k + ' works, warm and reserved'); });
  st.style = 'somethingElse';
  t.eq(second(), STYLE.scrappy[0], 'a style the engine does not know is read as scrappy');
  const three = [];
  Object.keys(STYLE).forEach(k => [50, 49].forEach(w => { const out = {}; [6, 7, 8, 9, 10, 11].forEach(y => { turn(s, y); st.since = s.week - 100; st.style = k; st.warmth = w; const x = second(); out[x] = true; note('style:' + k + ':' + w, y, 3, x); }); three.push(Object.keys(out).length); }));
  t.eq(three.join(''), '333333333333', 'each style has three wordings in each manner, taking the years in turn');
  // the other cells, both wordings, for the count of sentences below
  turn(s, 6); st.style = 'scrappy';
  [['keptWeek', 'kept'], ['postedWeek', 'posted'], ['meshNoted', 'corridor']].forEach(c => [50, 49].forEach(v => [6, 7].forEach(y => { const w = turn(s, y); ['keptWeek', 'postedWeek', 'meshNoted'].forEach(k => { delete st[k]; }); st.since = 1; st.candor = v; st[c[0]] = w.O + 3;
    note(c[1] + ':' + v, y, 2, second()); delete st[c[0]]; })));
  [50, 49].forEach(v => [6, 7].forEach(y => { turn(s, y); st.since = s.week - 20; st.warmth = v; note('first:' + v, y, 2, second()); }));
}

// ---- J. no sentence twice ----------------------------------------------------------------------------------
{
  // no sentence stands in two wordings, of everything read above
  const shared = Object.keys(SEEN).filter(x => Object.keys(SEEN[x]).length > 1);
  t.eq(shared.length + ' of ' + (Object.keys(SEEN).length > 250), '0 of true', 'no sentence stands in two wordings: ' + shared.slice(0, 3).map(x => x + ' ' + js(Object.keys(SEEN[x]))).join(' · '));
  t.eq(Object.keys(SEEN).filter(x => /¤|this year|undefined|NaN|\[object/.test(x)).length, 0, 'and none says “this year”, or leaves a gap unfilled');
  // fourteen years of one building through the rail: no chair says a sentence it said the year before, and no
  // letter says a sentence twice
  const s = desk('yw-years', 1);
  const who = [['vocal', 80, 80, 'classicist'], ['dance', 20, 20, 'drillmaster'], ['perf', 80, 20, 'nurturer'], ['scout', 20, 80, 'scrappy'], ['anr', 80, 80, 'classicist'], ['marketing', 20, 20, 'scrappy'],
    ['producer', 80, 80, 'classicist'], ['writer', 80, 80, 'classicist'], ['producer2', 80, 80, 'classicist'], ['writer2', 20, 20, 'trendChaser']];
  who.forEach(c => sit(s, c[0], 1, { candor: c[1], warmth: c[2], style: c[3], name: 'N ' + c[0] }));
  let again = 0, twice = 0, unread = 0, letters = 0, lone = 0;
  const was = {};
  for (let y = 1; y <= 14; y++) {
    const w = turn(s, y);
    records(s, y % 5 === 0 ? [] : y % 5 === 1 ? [rec(w.O + 5, 'crowned'), rec(w.O + 20, 'warm')] : y % 5 === 2 ? [rec(w.O + 5, 'cold')] : [rec(w.O + 5, 'warm'), rec(w.O + 30, 'quiet')]);
    signed(s, y % 3 ? [w.O + 2, w.O + 3] : []);
    ['producer', 'writer', 'producer2', 'writer2'].forEach((k, i) => { s.seats[k].works = (s.seats[k].works || []).concat((y + i) % 4 ? [] : [{ week: w.O + 7 }]); });
    if (y === 4) s.seats.anr.keptWeek = w.O + 9;
    if (y === 7) s.seats.perf.postedWeek = w.O + 9;
    if (y === 9) s.seats.dance.meshNoted = w.O + 9;
    const r = rail(s);
    letters += r.box.length;
    const L = staffYear.read(r.text), heard = {};
    unread += L.lines.filter(l => l.bad).length + (L.lines.length === 10 ? 0 : 1);
    L.lines.forEach((l, i) => { const k = (who[i] || ['nobody'])[0], mine = sentences(l.word);
      if (mine.some(x => (was[k] || []).includes(x))) again++;
      if (mine.some(x => heard[x])) twice++;
      mine.forEach(x => { heard[x] = true; });
      if (((s.seats[k] || {}).word || {}).second === '') lone++;
      was[k] = mine; });
  }
  t.eq([letters, unread, again, twice].join('/'), '14/0/0/0', 'fourteen years of ten chairs: a letter a year, every line read; no chair says a sentence it said the year before; no letter says a sentence twice');
  t.ok(lone > 0, 'fixture: five chairs alike in manner and method run out of things to say of themselves, and one says its first part alone (' + lone + ')');
  // what another chair of the letter has said is not said again; with every one taken, the first part alone
  const q = desk('yw-taken', 6);
  records(q, [rec(250, 'warm')]);
  sit(q, 'vocal', 200, { warmth: 60, candor: 60 });
  const all = [6, 7, 8].map(y => { turn(q, y); records(q, [rec((y - 1) * Y + 5, 'warm')]); q.seats.vocal.since = q.week - 60; return word(q, 'vocal').second; });
  turn(q, 6); records(q, [rec(250, 'warm')]); q.seats.vocal.since = 200;
  const taken = {};
  sentences(all[0]).forEach(x => { taken[x] = true; });
  t.eq(word(q, 'vocal', taken).second, all[1], 'a second part another chair has said gives way to the next wording');
  sentences(all[1]).slice(0, 1).forEach(x => { taken[x] = true; });
  t.eq(word(q, 'vocal', taken).second, all[2], 'one sentence of it taken is enough');
  sentences(all[2]).forEach(x => { taken[x] = true; });
  const bare = word(q, 'vocal', taken);
  t.eq(bare.second + ' · ' + (bare.text === bare.first), ' · true', 'and with every wording taken the chair says its first part and stops');
  q.seats.vocal.word = { week: q.week - Y, text: 'x ' + all[0], second: all[0], dry: 0 };
  t.eq(word(q, 'vocal').second, all[1], 'what the chair said of itself last year is not said again this year');
}

// ---- K. a year the house put out nothing ------------------------------------------------------------------
{
  const s = desk('yw-quiet', 6);
  records(s, []);
  sit(s, 'vocal', 1, { candor: 80, warmth: 80, name: 'V' }); sit(s, 'anr', 200, { candor: 20, warmth: 20, style: 'classicist', name: 'A' }); sit(s, 'scout', 1, { candor: 80, warmth: 20, name: 'S' });
  signed(s, [250]);
  t.eq(letter(s).text, ['Year 6, as the staff tell it. The house put out nothing, so no room has a record to speak of.',
    'V, head vocal coach, six years in: “After six years I know this building’s moods better than my own.”',
    'S, head scout, six years in: “One of the roster signed last year. Whether that was the right one is a question for the year of the debut. After six years the chair fits. That is all I will say about it.”',
    'A, A&R lead, a year in: “The fundamentals do not change with the charts. Neither did my weeks.”'].join('\n'),
  'the first line has said it, and a room does not say it again: its chair says what it has to say of itself. The scout’s year is its own');
  const w = word(s, 'vocal', {}, true);
  t.eq([w.first, w.text === w.second].join(' · '), ' · true', 'such a word is its second part and no more');
  const taken = {};
  [6, 7, 8, 9].forEach(y => { turn(s, y); delete s.seats.vocal.word; s.seats.vocal.since = s.week - 100; sentences(word(s, 'vocal', {}, true).text).forEach(x => { taken[x] = true; }); });
  turn(s, 6); s.seats.vocal.since = s.week - 100;
  t.eq(word(s, 'vocal', taken, true).text, span(QUIET.vocal[0]), 'a room’s chair with nothing left to say of itself says that no record went out');
}

// ---- L. the card keeps the word (§136: 33) --------------------------------------------------------------------
{
  const s = desk('yw-card', 6);
  records(s, [rec(250, 'warm')]);
  sit(s, 'vocal', 1, { candor: 30 }); sit(s, 'anr', 285); sit(s, 'scout', 1);
  signed(s, []);
  const r = rail(s);
  // the first line of a letter, or one that says there is none: read under a broken engine, it fails by name
  const top = text => staffYear.read(text).lines[0] || { word: 'no line was written' };
  t.eq(js(s.seats.vocal.word), js({ week: 289, text: top(r.text).word, second: sentences(top(r.text).word).slice(1).join(' '), dry: 0 }), 'the chair keeps its word: the week it was said, the words, and what it said of itself');
  t.eq(js(s.seats.scout.word && s.seats.scout.word.dry) + ' · ' + ('word' in s.seats.anr), '1 · false', 'the scout’s keeps its count of years with nothing; a chair too new keeps none');
  turn(s, 7); records(s, [rec(300, 'warm')]);
  const r2 = rail(s);
  t.eq([(s.seats.vocal.word || {}).week, (s.seats.vocal.word || {}).text === top(r2.text).word, (s.seats.anr.word || {}).week].join('/'), '337/true/337', 'the next year’s letter replaces it, and gives the newer chair its first');
  s.week = 338;
  rail(s);
  t.eq((s.seats.vocal.word || {}).week, 337, 'and a week the staff do not write leaves the card as it was');
  // the file takes it through a save, and an older file without one opens clean
  const round = say(() => KP.deserialize(KP.serialize(s)));
  t.eq(js(((round || {}).seats || {}).vocal && round.seats.vocal.word), js(s.seats.vocal.word), 'the word is saved with the file');
  const old = JSON.parse(KP.serialize(s));
  const seatsOf = o => (o.state || o).seats;
  Object.keys(seatsOf(old)).forEach(k => { delete seatsOf(old)[k].word; delete seatsOf(old)[k].keptWeek; delete seatsOf(old)[k].postedWeek; }); seatsOf(old).vocal.meshNoted = 1;
  const back = say(() => KP.deserialize(JSON.stringify(old)));
  const opened = !!back && typeof back === 'object' && !!(back.seats || {}).vocal;
  if (opened) { turn(back, 8); records(back, [rec(340, 'warm')]); }
  t.eq(opened && rail(back).box.length + ' · ' + /corridor|talk about/.test((back.seats.vocal.word || {}).text), '1 · false', 'a file from before, with no words kept and the corridor’s read marked the old way, writes its letter');
}

// ---- M. the three marks, where they are made -------------------------------------------------------------------
{
  const s = desk('yw-marks', 1); s.week = 60; s.budget = 9999;
  sit(s, 'vocal', 9, { name: 'Gil Ki-tae', style: 'bigMachine' }); sit(s, 'writer', 9, { name: 'Sa Bo-ra' });
  say(() => { KP.openScene(s, { kind: 'seatPoach', seatId: 'vocal', rivalName: 'Aurum', expiresWeek: 62 }); const o = (s.scenes || []).filter(x => x.kind === 'seatPoach')[0]; return KP.resolveScene(s, o.id, 'raise'); });
  t.eq(s.seats.vocal.keptWeek + ' · ' + ('keptWeek' in s.seats.writer), '60 · false', 'a chair the desk keeps after a call is marked with the week, and no other chair is');
  say(() => { KP.openScene(s, { kind: 'seatPoach', seatId: 'writer', rivalName: 'Novaline', expiresWeek: 62 }); const o = (s.scenes || []).filter(x => x.kind === 'seatPoach' && x.seatId === 'writer')[0]; return KP.resolveScene(s, o.id, 'walk'); });
  t.ok(!s.seats.writer, 'fixture: a chair the desk lets go is gone');
  s.week = 61;
  const posted = say(() => KP.openSearch(s, 'vocal'));
  t.eq((posted || {}).ok + ' · ' + s.seats.vocal.postedWeek, 'true · 61', 'a chair advertised while it is sat is marked with the week');
  const m = desk('yw-corridor', 1); m.week = 60;
  sit(m, 'vocal', 9, { name: 'Gil Ki-tae', style: 'bigMachine' });
  const only = new Proxy({}, { get: (o, k) => (k === 'chance' ? p => p === 0.15 : k === 'int' ? a => a : k === 'pick' ? l => l[0] : () => 0.99) });
  const box = [];
  const ran = say(() => { phase('hires').fn(m, only, box, [], KP.groups(m)); return 'ok'; });
  t.eq(ran + ' · ' + box.filter(n => n.ind === 'meshFriction').length + ' · ' + m.seats.vocal.meshNoted, 'ok · 1 · 60', 'and the corridor’s read is marked with the week it was said');
}

// ---- N. real weeks ---------------------------------------------------------------------------------------------
{
  const s = KP.newGame('yw-real', null, {});
  const letters = [];
  let bad = 0, off = 0, doors = 0;
  // a bounded walk with nothing answered: the house folds, the desk takes the blank page, and the weeks go on. A
  // week that does not move ends it, so a broken engine cannot hang this
  const r = say(() => { for (let i = 0; i < 110 && s.week < 2 * Y + 2; i++) {
    if (KP.chapterPending(s)) { doors++; if (!KP.nextChapter(s, 'blank', { companyName: 'Next House' }).ok) return 'the blank page refused'; }
    const was = s.week;
    KP.advanceWeek(s);
    if (s.week === was) return 'the week did not move at ' + was;
    const wrote = (KP.lastTickNotes || []).filter(n => n.ind === 'seatYear');
    const landed = s.inbox.filter(m => m.week === s.week && m.ind === 'seatYear');
    if (wrote.length !== landed.length || (wrote.length && s.week % Y !== 1)) off++;
    wrote.forEach(n => { const L = staffYear.read(n.text), sat = SEATS.filter(x => s.seats[x.id]);
      letters.push(s.week + ':' + L.lines.length + ':' + L.lines.filter(l => l.word != null).length + ':' + (/ in my weeks here/.test(n.text) ? 'part' : 'whole') + ':' + /new here|first year/i.test(n.text));
      if (L.lines.length !== sat.length || L.lines.some((l, j) => l.bad || l.name !== s.seats[sat[j].id].name || l.label !== sat[j].label)) bad++;
      sat.forEach((x, j) => { const l = L.lines[j] || {}; if (l.word != null && (s.seats[x.id].word || {}).text !== l.word) bad++; }); });
  } return 'ok'; });
  t.eq([r, doors, letters.join(' '), bad, off].join(' · '), 'ok · 1 · 49:4:4:whole:false 97:4:4:part:false · 0 · 0',
    'real weeks, nothing answered: the four who were here from the first write in week 49; the house folds, and the four the next building opened with write in week 97, of their weeks there, and none of them as new to it. Each letter lands, each line is a chair sat, each card keeps its word');
  t.eq(js(say(() => KP.validateState(s).filter(x => /seat|chair|word/i.test(x)))), '[]', 'and the file is whole');
}

t.finish();
