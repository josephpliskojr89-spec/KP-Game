/* Suite 149 — the yearly word (v0.11.42, §134: the people upstairs and down
   the hall, part ten; the second of the staff given years). In the week a
   chair was taken, each year, the chair says one true thing about its room.
   The fact is the year's credit (§133), read from a year back; the voice is
   the chair's own (§79): a candid one says what it cannot know, a careful
   one sands it. Chairs that turn a year in one week share one letter, and
   the year of the house is said once. The letter is said once and cannot be
   cut. No draw is made.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   sentence fails by name; nothing here can crash or hang under a broken
   engine. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const desk0 = require('../tools/desk_count');
const KP = loadEngine();
const t = makeT('suite_149_yearword');
const Y = KP.C.WEEKS_PER_YEAR;

// ---- the kit ------------------------------------------------------------------
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const js = x => JSON.stringify(x);
const obj = x => (x && typeof x === 'object' ? x : { threw: String(x), text: String(x) });
const act = s => KP.groups(s)[0] || { name: 'no act', id: 'none', releases: [], members: [] };
// a building with no chairs sat, in a given week: each fixture seats its own
const desk = (seed, week) => { const s = KP.newGame(seed, null, {}); s.week = week; s.objective.status = 'met'; say(() => KP.staffSeats(s)); Object.keys(s.seats || {}).forEach(k => { delete s.seats[k]; }); return s; };
const sit = (s, seatId, since, more) => { s.seats[seatId] = Object.assign({ id: 'sf' + since + '_' + seatId.length + '41', name: 'Chair of ' + seatId, seatId, tier: 'working', knownForTag: null, since, style: 'scrappy', warmth: 60, candor: 60,
    resume: ['x'], truth: { base: 0.5, gem: false, bestSeat: 'vocal' } }, more || {}); return s.seats[seatId]; };
const rec = (week, closed, more) => Object.assign({ week, songTitle: 'T' + week, receptionBand: 'solid', trophies: 0, chartPeak: 9, chartWeeks: 3, conceptId: 'cute' },
  closed ? { closed: { week: week + 5, verdict: closed, trophies: closed === 'crowned' ? 1 : 0, lastStage: 'clean', room: 'fresh' } } : {}, more || {});
const records = (s, list, promoUntil) => { const g = act(s); g.debuted = true; g.releases = list; g.promoUntil = promoUntil || 0; delete g.retiredWeek; return g; };
const signed = (s, weeks) => { s.roster.forEach(id => { delete s.people[id].signedWeek; s.people[id].status = 'trainee'; }); weeks.forEach((w, i) => { s.people[s.roster[i]].signedWeek = w; }); };
const due = s => { const r = say(() => KP.seatYearsDue(s)); return Array.isArray(r) ? r.map(st => st.seatId).join() : String(r); };
const word = (s, seatId) => String(say(() => KP.seatYearWord(s, s.seats[seatId])));
const raw = s => { const r = say(() => KP.seatYearLetter(s)); return r === null ? null : obj(r); };
// the letter, or one that says there is none: a check that reads its text fails by name and never crashes
const letter = s => raw(s) || { text: 'no letter was written', seats: [], kind: 'none' };
const phase = name => KP.weeklyPipeline([]).filter(p => p.name === name)[0] || { fn: () => { throw new Error('no phase ' + name); } };

// ---- A. the week a chair turns a year ------------------------------------------------
{
  ['seatYearsDue', 'seatYearWord', 'seatYearLetter'].forEach(k => t.ok(typeof KP[k] === 'function', 'the engine carries KP.' + k));
  const s = desk('yw-due', 100);
  sit(s, 'anr', 100);
  t.eq([100, 147, 148, 149, 196, 244].map(w => { s.week = w; return due(s) || '-'; }).join(' '), '- - anr - anr anr', 'a chair turns a year forty-eight weeks after it was taken, and every forty-eight after: not the week it was taken, not a week either side');
  s.week = 148;
  sit(s, 'scout', 52); sit(s, 'vocal', 100); sit(s, 'writer', 4); sit(s, 'dance', 99); sit(s, 'marketing', 101);
  t.eq(due(s), 'vocal,scout,anr,writer', 'the chairs that turn a year in one week come in the building’s own order, whatever year each is turning');
  const none = desk('yw-none', 148);
  t.eq(due(none) + ' · ' + js(raw(none)), ' · null', 'a building with nobody turning a year has nothing to say');
  delete none.seats;
  t.eq(due(none) + ' · ' + js(raw(none)), ' · null', 'and one with no chairs on file likewise');
}

// ---- B. each room’s own words ------------------------------------------------------------
{
  const s = desk('yw-rooms', 148);
  records(s, [rec(110, 'warm')]);
  const ROOM = {
    vocal: ['Every voice on a record this year came through my room. How much of what you heard was the room, I could not tell you.', 'The vocal room did its part.'],
    dance: ['Every count on a stage this year was drilled in my room. Whether the drilling is what you saw, I would not swear to.', 'The dance room did its part.'],
    perf: ['I ran the rehearsal before every stage this year. A stage can go wrong after a good rehearsal, and right after a bad one.', 'The rehearsals ran to schedule.'],
    anr: ['Every demo that became a record this year crossed my desk first. I can tell you what I liked. I cannot tell you what I was right about.', 'The demo sheet was in order.'],
    marketing: ['Every push behind a record this year was planned on my desk. What a push bought and what a record earned alone, nobody can pull apart.', 'The campaigns ran as planned.'],
  };
  const QUIET = {
    vocal: ['No record went out this year with a voice from my room on it, so there is nothing of mine to point at.', 'A quiet year. The vocal room is ready.'],
    dance: ['No record went out this year with my room’s counts under it, so there is nothing of mine to point at.', 'A quiet year. The dance room is ready.'],
    perf: ['No record went out this year for my room to stage. I cannot tell you what the room would have done.', 'No record to stage this year. The rehearsal room is ready.'],
    anr: ['No demo became a record this year. I have a drawer of them and no proof.', 'A quiet year for the demo sheet.'],
    marketing: ['No record went out this year for my desk to push, so there is nothing of mine to point at.', 'No record to push this year. The desk is ready.'],
  };
  Object.keys(ROOM).forEach(k => {
    sit(s, k, 100, { candor: 50 });
    t.eq(word(s, k), ROOM[k][0], 'the ' + k + ' chair, candid, in a year the house put something out');
    s.seats[k].candor = 49;
    t.eq(word(s, k), ROOM[k][1], 'the ' + k + ' chair, careful, in the same year');
  });
  records(s, [rec(100, 'warm')]);   // landed the week the year began: not this year's
  Object.keys(QUIET).forEach(k => {
    s.seats[k].candor = 50;
    t.eq(word(s, k), QUIET[k][0], 'the ' + k + ' chair, candid, in a year nothing went out');
    s.seats[k].candor = 49;
    t.eq(word(s, k), QUIET[k][1], 'the ' + k + ' chair, careful, in a quiet year');
  });
  // the scout, by who signed in the year
  sit(s, 'scout', 52, { candor: 80 });
  signed(s, [100, 101, 130, 148, 60]);
  t.eq(word(s, 'scout'), 'Three of the roster signed on my watch this year. Whether they were the right ones is a question for the year of the debut.', 'the scout, candid: those who signed in the year behind, not the one who signed the week it began, nor one from before');
  s.seats.scout.candor = 10;
  t.eq(word(s, 'scout'), 'Three signed this year. The pipeline is where it should be.', 'the scout, careful');
  signed(s, [130]);
  s.seats.scout.candor = 80;
  t.eq(word(s, 'scout'), 'One of the roster signed on my watch this year. Whether that was the right one is a question for the year of the debut.', 'one who signed is “the right one”');
  signed(s, [100]);
  t.eq(word(s, 'scout') + ' | ' + (s.seats.scout.candor = 10, word(s, 'scout')), 'Nobody signed this year, so I have nothing to point at. | No signings this year. The desk stays open.', 'a year nobody signed, in each voice');
  signed(s, Array.from({ length: Math.min(13, s.roster.length) }, () => 120));
  t.ok(word(s, 'scout').startsWith((s.roster.length >= 13 ? '13' : ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'][s.roster.length]) + ' signed this year.'), 'a count is said as a person says it, and written as a number past twelve (' + word(s, 'scout').slice(0, 30) + ')');
  // the studio, by the records made in the year
  sit(s, 'producer', 4, { candor: 70, works: [{ week: 90, title: 'A' }, { week: 100, title: 'B' }, { week: 101, title: 'C' }, { week: 140, title: 'D' }] });
  t.eq(word(s, 'producer'), 'Two of this house’s records this year were mine. They are on the shelf with my name on them, for better or worse.', 'a house producer, candid: the records made in the year behind');
  s.seats.producer.candor = 30;
  t.eq(word(s, 'producer'), 'Two records for the house this year. More when the calendar asks.', 'careful');
  s.seats.producer.works = [{ week: 140, title: 'D' }];
  t.eq(word(s, 'producer') + ' | ' + (s.seats.producer.candor = 70, word(s, 'producer')), 'One record for the house this year. More when the calendar asks. | One of this house’s records this year was mine. It is on the shelf with my name on it, for better or worse.', 'one record, in each voice');
  s.seats.producer.works = [{ week: 100, title: 'B' }];
  t.eq(word(s, 'producer') + ' | ' + (s.seats.producer.candor = 30, word(s, 'producer')), 'No record of mine went out this year. I would rather say it than have you look for one. | No release under my name this year. The lane is ready.', 'a year with none, in each voice');
}

// ---- C. the letter ---------------------------------------------------------------------------
{
  const s = desk('yw-letter', 148);
  sit(s, 'marketing', 100, { name: 'Joo Bo-ra', candor: 86 });
  records(s, [rec(100, 'crowned'), rec(101, 'cold'), rec(120, 'cold'), rec(140, 'cold')], 0);
  const one = letter(s);
  t.eq(one.text, 'Joo Bo-ra has sat a year in the marketing lead chair. In the year behind them the house put out 3 eras, all closed cold. ' +
    '“Every push behind a record this year was planned on my desk. What a push bought and what a record earned alone, nobody can pull apart.”', 'one chair: who, how long, the house’s year, and their own words');
  t.eq([one.kind, one.ind, one.priority, js(one.seats)].join('/'), 'company/seatYear/critical/["marketing"]', 'it is said once, the week’s budget cannot cut it, and it says whose year it is');
  t.ok(desk0.ONE_SHOTS.includes('seatYear'), 'and it is on the list of letters said once');
  // the house's year, each way it can stand
  const fact = list => { records(s, list, 150); const x = letter(s).text; return x.slice(x.indexOf(' In the year') + 1, x.indexOf(' “')); };
  t.eq(fact([rec(100, 'warm')]), 'In the year behind them the house put out nothing.', 'a year nothing went out');
  t.eq(fact([rec(120, 'warm')]), 'In the year behind them the house put out one era, which closed warm.', 'one era');
  t.eq(fact([rec(148, null)]), 'In the year behind them the house put out one era, still running.', 'one that landed this very week is this year’s, and still running');
  t.eq(fact([rec(110, 'crowned'), rec(120, 'crowned'), rec(125, 'warm'), rec(130, 'quiet'), rec(147, null)]), 'In the year behind them the house put out 5 eras: 2 closed with a trophy, one warm, one quietly; one still running.', 'many, by how each closed');
  // years, as a person says them
  s.week = 148 + 12 * Y;
  t.eq([1, 2, 3, 12].map(n => { s.seats.marketing.since = s.week - n * Y; const x = letter(s).text; return x.slice(x.indexOf('has sat ') + 8, x.indexOf(' in the ')); }).join(' | '), 'a year | two years | three years | twelve years', 'the years are said in words');
  s.week = 148 + 13 * Y; s.seats.marketing.since = 148;
  t.ok(letter(s).text.startsWith('Joo Bo-ra has sat 13 years in the marketing lead chair.'), 'and written as a number past twelve');
  // several chairs in one week: the house's year once, then each in the building's order
  const f = desk('yw-four', 145);
  sit(f, 'vocal', 1, { name: 'Kang Byung-chul', candor: 60 }); sit(f, 'dance', 1, { name: 'Coach Cha', candor: 20 }); sit(f, 'perf', 1, { name: 'Director Cha', candor: 58 });
  sit(f, 'scout', 49, { name: 'Scout Im', candor: 97 }); sit(f, 'writer', 97, { name: 'Sa Seon-mi', candor: 40 }); sit(f, 'anr', 3, { name: 'Sa Bo-ra' });
  records(f, [rec(50, 'cold'), rec(97, 'cold'), rec(100, 'crowned'), rec(120, 'quiet')]);   // two from before the year, which the three who were here then sat through
  signed(f, [50, 120]);
  t.eq(letter(f).text, 'Five chairs turn a year this week. In the year behind the rooms the house put out 2 eras: one closed with a trophy, one quietly. ' +
    'Kang Byung-chul, three years the head vocal coach: “Every voice on a record this year came through my room. How much of what you heard was the room, I could not tell you.” ' +
    'Coach Cha, three years the head dance coach: “The dance room did its part.” ' +
    'Director Cha, three years the performance director: “I ran the rehearsal before every stage this year. A stage can go wrong after a good rehearsal, and right after a bad one.” ' +
    'Scout Im, two years the head scout: “One of the roster signed on my watch this year. Whether that was the right one is a question for the year of the debut.” ' +
    'Sa Seon-mi, a year the house writer: “No release under my name this year. The lane is ready.”', 'five chairs in one week: one letter, the house’s year said once, each chair in the building’s order with its own years and its own words');
  t.eq(js(letter(f).seats), js(['vocal', 'dance', 'perf', 'scout', 'writer']), 'and it says whose years they are');
  // no chair that works an era: no year of the house to give
  delete f.seats.vocal; delete f.seats.dance; delete f.seats.perf;
  t.eq(letter(f).text, 'Two chairs turn a year this week. Scout Im, two years the head scout: “One of the roster signed on my watch this year. Whether that was the right one is a question for the year of the debut.” ' +
    'Sa Seon-mi, a year the house writer: “No release under my name this year. The lane is ready.”', 'a scout and a writer alone: no year of the house is given, each says their own');
  delete f.seats.scout;
  t.eq(letter(f).text, 'Sa Seon-mi has sat a year in the house writer chair. “No release under my name this year. The lane is ready.”', 'a writer alone');
}

// ---- D. the real week ----------------------------------------------------------------------------
{
  const s = KP.newGame('yw-real', null, {});
  let wrote = [], landed = [];
  // a bounded walk, and nothing answered: a week that does not move ends it, so a broken engine cannot hang this
  const r = say(() => { for (let i = 0; i < Y + 4 && s.week < Y + 1; i++) { const was = s.week;
    const kept = KP.advanceWeek(s); if (s.week === was) return 'the week did not move at ' + was;
    (KP.lastTickNotes || []).forEach(n => { if (n.ind === 'seatYear') wrote.push({ week: s.week, n }); }); kept.forEach(n => { if (n.ind === 'seatYear') landed.push(s.week); }); } return 'ok'; });
  const first = wrote.filter(x => x.week === Y + 1);
  t.ok(r === 'ok' && first.length === 1 && landed.includes(Y + 1) && ['vocal', 'dance', 'perf', 'scout'].every(k => (first[0].n.seats || []).includes(k)),
    'forty-eight real weeks from a new game: in week ' + (Y + 1) + ' the four who were here from the first turn a year, in one letter, and it lands (' + r + ', ' + wrote.map(x => x.week).join() + ')');
  t.ok(first.length === 1 && /^(Four|Five|Six) chairs turn a year this week\. In the year behind the rooms the house put out /.test(first[0].n.text), 'it opens on how many, and the house’s year (' + String(first[0] && first[0].n.text).slice(0, 90) + ')');
  t.ok((s.inbox || []).some(m => m.ind === 'seatYear' && m.week === Y + 1), 'and it is on the Desk');
  // nothing is drawn: the rail runs on a stream that refuses every draw
  const q = desk('yw-nodraw', 148);
  sit(q, 'vocal', 100); sit(q, 'scout', 52);
  const refuse = new Proxy({}, { get: (o, k) => () => { throw new Error('a draw was made: ' + String(k)); } });
  const box = [];
  const ran = say(() => { phase('seatYears').fn(q, refuse, box, [], KP.groups(q)); return 'ok'; });
  t.eq(ran + ' · ' + box.length + ' · ' + (box[0] || {}).ind, 'ok · 1 · seatYear', 'the rail writes its letter without a draw');
  q.week = 149;
  const box2 = [];
  say(() => phase('seatYears').fn(q, refuse, box2, [], KP.groups(q)));
  t.eq(box2.length, 0, 'and writes nothing the week after');
}

t.finish();
