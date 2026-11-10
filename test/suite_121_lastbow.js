/* Suite 121 — the last bow (v0.11.11, §102; §96 recommendation 4, a group
   ends). Owner: "Break remaining work into smaller pieces": the group's
   half of the long goodbye ships on its own, and a departed artist's next
   chapter is the release after it.

   The survey's finding: "How a group ends is a status flip with a good
   sentence on it." The disband was one button and one statement.

   Pinned here:
   · the ending is a choice of three doors, read before it is taken: the
     quiet statement, one last concert, a farewell record. A door that is
     shut says why, and the verb refuses on the same words
   · the quiet statement keeps the price it always had
   · one last concert is the fancon machinery at a bigger room: the bill,
     the till, a softer landing for the room, a warm shelf
   · a farewell record is an arc: the announcement, the lock that tells,
     the landing that reads it, the conclusion at that era's close; a
     record announced and never made is a broken promise
   · the final statement names what each member does next, from her file
   · a member whose solo career was open keeps it as an act of its own
   · what the door leaves on the shelf: the catalog pays more for a while
   · every conclusion says how it came; an old file keeps what it can
   · the screens: the sheet, the last record on the act's page, on Today
     and in the Studio, and how it ended on the record page
   Two laws from §99 hold throughout: the week's wire is read before the
   trim, and a fixture forces every gate and relies on no roll. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_121_lastbow');

const E = KP.C.ENDING, D = KP.C.DISBAND, M = KP.C.MERCH, C = KP.C.CONTRACT, YEAR = KP.C.WEEKS_PER_YEAR;
const PLAN = [['popWave', 'challenge'], ['countdown', 'variety'], ['primeStage', 'fanSign'], ['livestream']];
// a letter that is not there fails the check that reads it, by name: it never crashes the file
const firstOf = list => (list && list[0]) || { text: '', priority: null, how: null };
const noisy = x => /undefined|NaN|\{she\}|\{her\}|\{pos\}|\{herself\}|\{hers\}|\{She\}|\{Pos\}|\[object/.test(x);
const when = w => KP.weekLabel(w).text;
const acts = p => (p.directed || []).map(d => d.kind);
const count = (p, kind) => acts(p).filter(k => k === kind).length;

function answerAll(eng, s, skip) {
  (s.scenes || []).slice().forEach(sc => {
    if (skip && skip.includes(sc.kind)) return;
    const def = eng.sceneDef(sc.kind);
    if (def) eng.resolveScene(s, sc.id, def.options(s, sc)[0].id);
  });
}
// one week, and the week's wire as the rails wrote it (pre-trim). The till
// is kept full: the inherited label folds inside a year on no income.
function tick(eng, s) {
  s.budget = Math.max(s.budget, 900);
  eng.advanceWeek(s);
  return (eng.lastTickNotes || []).slice();
}

// ---- the fixture: the opening's inherited act, everyone on a fresh seven ----
// four veterans. The first week stamps the paper; all four are then
// re-signed by hand, so no contract ends inside any test's window and the
// only ending in the room is the one a test begins.
const base = (() => {
  const s = KP.newGame('lastbow-121', null, { legacy: true });
  const g = s.groups.find(x => x.debuted);
  tick(KP, s);
  g.members.forEach(id => { s.people[id].contract.start = s.week; s.people[id].contract.term = 2; });
  s.scenes = (s.scenes || []).filter(sc => sc.kind !== 'renewal');
  return { s, gid: g.id };
})();
function fork(src) {
  const s = KP.deserialize(KP.serialize((src || base).s));
  const g = s.groups.find(x => x.id === base.gid);
  return { s, g, gid: base.gid, ids: (g.members.length ? g.members : g.finalLineup || []).slice() };
}
const people = f => f.ids.map(id => f.s.people[id]);
const names = f => people(f).map(p => KP.displayName(p));
const listOf = ns => ns.slice(0, -1).join(', ') + ' and ' + ns[ns.length - 1];
const door = (f, id) => KP.endingDoors(f.s, f.gid).doors.find(d => d.id === id) || { ok: null, reason: '', lines: [], label: '' };
const snap = f => KP.serialize(f.s);
const finals = wire => wire.filter(n => n.ind === 'playerDisband');
function lock(f, week) {
  f.g.demos = KP.generateDemos(f.s, KP.rngFor(f.s), f.g);
  const d = f.g.demos[0];
  const r = KP.planDebut(f.s, { groupId: f.gid, songId: d.id, conceptId: d.conceptId, promo: 'standard', format: 'single', week,
    alloc: { vocals: 25, dance: 25, rap: 25, media: 25 }, rollout: PLAN.map(w => w.slice()) });
  if (!r.ok) throw new Error('fixture: the lock refused: ' + r.reason);
  return r;
}
function runTo(f, week, skip) {
  const wire = [];
  while (f.s.week < week) { answerAll(KP, f.s, skip); tick(KP, f.s).forEach(n => wire.push(n)); }
  return wire;
}
const reach = (f, src) => ((f.g.results.ledger || {}).reach || []).filter(r => r.src === src);
const must = r => { if (!r.ok) throw new Error('fixture: refused: ' + r.reason); return r; };
const night = f => {
  const fanbase = KP.fanbaseRead(f.s, f.g);
  return { cost: Math.round(M.fanconCost * E.concertCostMult), till: Math.round((fanbase / 1000) * M.fanconPerK * E.concertTillMult),
    seats: Math.round(fanbase * 0.4 * E.concertCostMult) };
};

// ---- the fixture is what the tests think it is ----
{
  const f = fork();
  t.eq(f.g.members.length, 4, 'fixture: the inherited act has four members');
  t.eq(f.s.week, 2, 'fixture: the file stands in week 2');
  t.ok(f.g.popularity >= D.sellingPop && f.g.popularity < 90, 'fixture: the act still sells, with room to move');
  t.ok(f.g.fandom && f.g.fandom.intensity >= M.fanconMinIntensity && f.g.fandom.intensity < 80, 'fixture: an organized fandom with room to move');
  t.ok(!f.g.prep && !f.g.tour && !f.g.hiatus && f.s.week > (f.g.promoUntil || 0), 'fixture: nothing is on the act’s calendar');
  t.ok(people(f).every(p => p.contract.start === f.s.week && !p.contract.leaving && p.morale > 20 && p.morale < 90), 'fixture: all four hold a fresh seven, with morale that can move');
  t.ok((f.g.releases || []).length >= 2, 'fixture: the act has a discography with a first record and a last one');
  t.ok(f.s.budget >= night(f).cost && f.s.trust > 20 && f.s.trust < 90, 'fixture: the till covers a room, and the board’s trust can move');
  t.eq(Object.values(f.s.endingLedger).reduce((a, b) => a + b, 0), 0, 'fixture: the ledger exists from week one and counts nothing');
  t.eq(JSON.stringify(Object.keys(KP.newGame('lastbow-121-b', null, { legacy: false }).endingLedger)), JSON.stringify(['statements', 'concerts', 'announced', 'records', 'closed', 'lapsed', 'solos']), 'on every door into the game');
  t.ok(!f.g.ending && !f.g.afterglow && KP.endingRead(f.s).length === 0 && !KP.endingOwed(f.g), 'fixture: no ending is announced or owed');
  t.eq(KP.validateState(f.s).length, 0, 'fixture: the file is valid');
}

// ---- the three doors, read before one is taken ----
{
  const f = fork();
  const before = snap(f);
  const read = KP.endingDoors(f.s, f.gid);
  t.eq(snap(f), before, 'reading the doors writes nothing');
  t.ok(read.ok && read.reason === null, 'an act with a clear calendar can end');
  t.eq(read.doors.map(d => d.id + ':' + d.ok).join(' '), 'record:true concert:true statement:true', 'three doors, the kindest first, all open');
  t.eq(read.doors.map(d => d.title).join(' | '), 'A farewell record | One last concert | The quiet statement', 'each with a name');
  t.ok(read.doors.every(d => d.lines.length >= 2 && d.lines.every(l => !noisy(l)) && !noisy(d.label)), 'and words that are whole');
  const n = night(f);
  t.eq(door(f, 'concert').label, 'Play one last concert · ' + n.cost, 'the concert’s answer carries the room’s bill');
  t.ok(door(f, 'concert').lines[0].includes('The room costs ' + n.cost + ' and the till reads about ' + n.till + '.'), 'and its first line the bill and the till');
  t.ok(door(f, 'concert').lines[1].includes('It costs the room ' + E.concertMorale + ' morale where the statement costs ' + D.morale), 'the concert is priced against the statement, in morale');
  t.ok(door(f, 'record').lines[0].includes('Lock it by ' + when(f.s.week + E.recordWeeks)), 'the record’s first line carries the date it must be locked by');
  t.ok(door(f, 'record').lines.some(l => l.includes('No record locked by the date is the quiet statement, with a broken promise')), 'and what an unmade record costs');
  t.ok(door(f, 'statement').lines[0].includes('Every member loses ' + D.morale + ' morale and files it against you'), 'the statement says what it costs the room');
  // what the board reads is on every door of an act that still sells, and on none of one that does not
  t.ok(read.doors.every(d => d.lines.some(l => l.includes('This act still sells'))), 'an act that still sells: every door says what the board will read');
  t.ok(door(f, 'record').lines.some(l => l.includes('(trust ' + E.trustPlanned + ')')) && door(f, 'statement').lines.some(l => l.includes('(trust ' + D.trustSelling + ')')),
    'a planned ending is priced lighter than a sudden one');
  const cold = fork(); cold.g.popularity = D.sellingPop - 1;   // forced: under the line
  t.ok(KP.endingDoors(cold.s, cold.gid).doors.every(d => !d.lines.some(l => l.includes('still sells'))), 'an act under the line: no door mentions the board');
  // the shelf
  t.ok(door(f, 'record').lines.some(l => l.includes('the catalog pays ' + Math.round(E.glowRecord * 100) + '% more for three years')) &&
    door(f, 'concert').lines.some(l => l.includes('the catalog pays ' + Math.round(E.glowConcert * 100) + '% more for three years')) &&
    door(f, 'statement').lines.some(l => l.includes('Nothing is left on the shelf but the records themselves')), 'each door says what it leaves on the shelf');

  // the whole sheet shut, with one reason
  t.eq(KP.endingDoors(f.s, 'nope').reason, 'No such group.', 'no act, no doors');
  const proj = fork(); proj.g.debuted = false;   // forced: a project
  t.ok(!KP.endingDoors(proj.s, proj.gid).ok && KP.endingDoors(proj.s, proj.gid).doors.length === 0, 'a project that has not debuted has no doors: it is dissolved');
  const road = fork(); road.g.tour = { forced: true };
  t.ok(/on the road/.test(KP.endingDoors(road.s, road.gid).reason || ''), 'an act on the road cannot end from the bus');
  const promo = fork(); promo.g.promoUntil = promo.s.week + 1;
  t.ok(/Promotions are running/.test(KP.endingDoors(promo.s, promo.gid).reason || ''), 'nor in the middle of an era');
  const done = fork(); must(KP.endGroup(done.s, done.gid, 'statement'));
  t.eq(KP.endingDoors(done.s, done.gid).reason, 'That chapter is already closed.', 'a concluded act has no doors left');

  // one door shut, the others open
  const thin = fork(); thin.g.fandom.intensity = M.fanconMinIntensity - 1;   // forced: under the room’s line
  t.eq(['record', 'concert', 'statement'].map(id => door(thin, id).ok).join(','), 'true,false,true', 'a fandom that is not organized shuts the concert and nothing else');
  t.ok(/unorganized fandom/.test(door(thin, 'concert').reason), 'and the door says so');
  const poor = fork(); poor.s.budget = night(poor).cost - 1;
  t.ok(!door(poor, 'concert').ok && door(poor, 'concert').reason === 'The venue bills up front: ' + night(poor).cost + '.', 'a till that cannot cover the room shuts the concert');
  t.ok(door(poor, 'statement').ok && door(poor, 'record').ok, 'the statement is free and the record is not billed today');
  const rest = fork(); rest.g.hiatus = { since: rest.s.week };   // forced: an ordinary hiatus
  t.eq(['record', 'concert', 'statement'].map(id => door(rest, id).ok).join(','), 'false,false,true', 'an act on hiatus can only be ended by statement');
  const made = fork(); lock(made, made.s.week + 6);
  t.eq(['record', 'concert', 'statement'].map(id => door(made, id).ok).join(','), 'true,false,false', 'a record in production shuts the two doors that end it today');
  t.eq(door(made, 'record').label, 'Make the record in production the last one', 'and the third door offers to make that record the last');
  t.ok(door(made, 'record').lines[0].includes('The record landing ' + when(made.g.prep.scheduledWeek) + ' becomes the last one'), 'naming its date');
  const solo = fork(); solo.s.people[solo.ids[1]].soloEra = { format: 'single', scheduledWeek: solo.s.week + 4 };   // forced: her solo record is on the calendar
  t.eq(['record', 'concert', 'statement'].map(id => door(solo, id).ok).join(','), 'false,false,false', 'a member’s solo record on the calendar shuts all three');
  t.ok(door(solo, 'statement').reason.includes(KP.displayName(solo.s.people[solo.ids[1]]) + '’s solo record is on the calendar'), 'and names whose');
  t.ok(!KP.disbandGroup(solo.s, solo.gid).ok && /solo record is on the calendar/.test(KP.disbandGroup(solo.s, solo.gid).reason), 'the old verb refuses on the same words (it shelved her record and kept the bill)');

  // the verb refuses on the door's own reason, and a refusal changes nothing
  [[thin, 'concert'], [poor, 'concert'], [rest, 'record'], [made, 'statement'], [solo, 'record'], [road, 'statement'], [promo, 'concert']].forEach(([x, id]) => {
    const was = snap(x);
    const r = KP.endGroup(x.s, x.gid, id);
    const why = KP.endingDoors(x.s, x.gid);
    t.ok(!r.ok && r.reason === (why.ok ? door(x, id).reason : why.reason) && snap(x) === was, 'a shut door refuses with its own reason and changes nothing (' + id + ': ' + String(r.reason).slice(0, 34) + '…)');
  });
  const odd = fork(), wasOdd = snap(odd);
  t.ok(!KP.endGroup(odd.s, odd.gid, 'fireworks').ok && snap(odd) === wasOdd, 'a door that does not exist is refused');
}

// ---- the quiet statement: the price it always had ----
{
  const f = fork();
  const was = { budget: f.s.budget, trust: f.s.trust, morale: people(f).map(p => p.morale) };
  const r = KP.endGroup(f.s, f.gid, 'statement');
  const n = firstOf(f.s.inbox.filter(x => x.ind === 'playerDisband'));
  t.ok(r.ok && r.how === 'statement', 'the statement goes out');
  t.eq(n.priority + '|' + n.how + '|' + n.groupId, 'critical|statement|' + f.gid, 'as a critical letter that names its door');
  t.eq(n.text, 'The statement is out: ' + f.g.name + ' concludes team activities. It thanks the fans for every era, and for once every word of it is true. ' +
    listOf(names(f)) + ' remain with ' + f.s.company.short + ', contracts running and calendars open. The cafés asked for one last night and got a paragraph. ' +
    'The fan cafés are holding a wake and an archive drive at the same time. ' + f.s.executive.name +
    ' signed the paperwork with one eyebrow raised: ending an act that still sells reads as instability upstairs, and upstairs reads everything.', 'the letter, whole');
  t.eq(people(f).map(p => p.morale).join(','), was.morale.map(m => m - D.morale).join(','), 'every member loses the statement’s morale');
  t.ok(people(f).every(p => count(p, 'disbandedUs') === 1 && count(p, 'lastNight') + count(p, 'lastRecord') === 0), 'and files it against the company');
  t.eq(f.s.trust, was.trust + D.trustSelling, 'the board prices an act that still sells');
  t.eq(f.s.budget, was.budget, 'no money moves');
  t.eq(f.g.retiredWeek + '|' + f.g.finalLineup.length + '|' + f.g.members.length, f.s.week + '|4|0', 'the act is concluded, with its final lineup on the record');
  t.eq(JSON.stringify(f.g.ending), JSON.stringify({ how: 'statement', week: f.s.week }), 'how it ended is on the record');
  t.ok(!f.g.afterglow && KP.afterglowOf(f.s, f.g) === null, 'and nothing is left on the shelf');
  t.eq(JSON.stringify(f.s.endingLedger), JSON.stringify({ statements: 1, concerts: 0, announced: 0, records: 0, closed: 0, lapsed: 0, solos: 0 }), 'the ledger counts it');
  t.ok(people(f).every(p => p.status === 'idol' && f.s.roster.includes(p.id)), 'the members stay signed');
  t.eq(KP.validateState(f.s).length, 0, 'the file is valid');
  t.eq(KP.endedWord(f.s, f.g), 'ended with a statement', 'the record page’s word for it');
  // the old verb is the same door
  const old = fork(); KP.disbandGroup(old.s, old.gid);
  t.eq(firstOf(old.s.inbox.filter(x => x.ind === 'playerDisband')).text, n.text, 'the old verb writes the same statement');
  t.eq(old.s.endingLedger.statements, 1, 'and is counted the same');
  // an act under the line, with a fandom that never organized
  const cold = fork(); cold.g.popularity = D.sellingPop - 1; cold.g.fandom.intensity = M.fanconMinIntensity - 1;
  const t0 = cold.s.trust;
  KP.endGroup(cold.s, cold.gid, 'statement');
  const cn = firstOf(cold.s.inbox.filter(x => x.ind === 'playerDisband'));
  t.eq(cold.s.trust, t0, 'an act that no longer sells: the board prices nothing');
  t.ok(!cn.text.includes('eyebrow') && !cn.text.includes('one last night') && cn.text.endsWith('holding a wake and an archive drive at the same time.'), 'and the letter drops both sentences');
  // a project is still dissolved in one line
  const proj = fork(); proj.g.debuted = false;
  const pr = KP.disbandGroup(proj.s, proj.gid);
  t.ok(pr.ok && /project is dissolved/.test(pr.note) && !proj.g.ending && Object.values(proj.s.endingLedger).reduce((a, b) => a + b, 0) === 0, 'a project is dissolved as it always was: no door, no ledger, no record of an ending');
}

// ---- one last concert ----
{
  const f = fork();
  const n = night(f);
  const was = { budget: f.s.budget, trust: f.s.trust, morale: people(f).map(p => p.morale), fatigue: people(f).map(p => p.fatigue) };
  const first = f.g.releases[0].songTitle, last = f.g.releases[f.g.releases.length - 1].songTitle;
  const r = KP.endGroup(f.s, f.gid, 'concert');
  const note = firstOf(f.s.inbox.filter(x => x.ind === 'playerDisband'));
  t.ok(r.ok && r.how === 'concert', 'the last night is played');
  t.ok(n.till > n.cost, 'fixture: this fandom fills the room past its bill');
  t.eq(f.s.budget, was.budget + n.till - n.cost, 'the room is billed and the till is banked');
  t.eq(people(f).map(p => p.fatigue).join(','), was.fatigue.map(x => Math.min(100, x + E.concertFatigue)).join(','), 'one long night on every member');
  t.eq(people(f).map(p => p.morale).join(','), was.morale.map(m => m - E.concertMorale).join(','), 'it costs the room less than the statement does');
  t.ok(E.concertMorale < D.morale, 'by rule');
  t.ok(people(f).every(p => count(p, 'lastNight') === 1 && count(p, 'disbandedUs') === 0), 'and it is remembered as a night that was given, not a group that was taken');
  t.ok(KP.C.LEDGER.KINDS.lastNight.w > 0 && KP.C.LEDGER.KINDS.lastRecord.w > KP.C.LEDGER.KINDS.lastNight.w && KP.C.LEDGER.KINDS.disbandedUs.w < 0, 'the three ledger words weigh in the order the doors do');
  t.eq(f.s.trust, was.trust + D.trustSelling, 'the board prices it like the statement: it is still an act that sells, ended today');
  t.eq(note.priority + '|' + note.how, 'critical|concert', 'the final statement is critical and names the door');
  t.eq(note.text, f.g.name + ' played the last night: ' + KP.fmtCount(n.seats) + ' seats, ' + n.till + ' through the till, and a set that ran from “' + first + '” to “' + last +
    '”. The statement went up while the house lights were still down: ' + f.g.name + ' concludes team activities. ' + listOf(names(f)) + ' remain with ' + f.s.company.short +
    ', contracts running and calendars open. The fan cafés are holding a wake and an archive drive at the same time, and this time they have the footage. ' + f.s.executive.name +
    ' signed the paperwork with one eyebrow raised: ending an act that still sells reads as instability upstairs, and upstairs reads everything.', 'the letter, whole');
  t.eq(JSON.stringify(f.g.ending), JSON.stringify({ how: 'concert', week: f.s.week, night: n }), 'the night is on the record');
  t.eq(JSON.stringify(f.g.afterglow), JSON.stringify({ until: f.s.week + E.glowWeeks, mult: E.glowConcert }), 'and the shelf stays warm');
  t.eq(f.s.endingLedger.concerts + '|' + f.s.endingLedger.statements, '1|0', 'the ledger counts a concert, not a statement');
  t.eq(KP.endedWord(f.s, f.g), 'ended with one last concert', 'the record page’s word for it');
  t.eq(KP.validateState(f.s).length, 0, 'the file is valid');
  // a member on a break is not put on that stage
  const brk = fork(); const off = brk.s.people[brk.ids[0]]; off.flags.personalHiatus = { since: brk.s.week };
  const f0 = off.fatigue;
  must(KP.endGroup(brk.s, brk.gid, 'concert'));
  t.eq(off.fatigue, f0, 'a member on a break is not worked for the last night');
  // a one-record act
  const one = fork(); one.g.releases = one.g.releases.slice(0, 1);
  must(KP.endGroup(one.s, one.gid, 'concert'));
  t.ok(firstOf(one.s.inbox.filter(x => x.ind === 'playerDisband')).text.includes('and a set built around “' + one.g.releases[0].songTitle + '”.'), 'an act with one record plays a set built around it');
  // a small room: the night costs more than it takes. The fanbase is read
  // off popularity, the members' reach and the last first week: all forced down.
  const small = fork();
  small.g.popularity = 1; small.g.lastChodong = 0;
  people(small).forEach(p => { p.social = 0; });
  const sn = night(small);
  t.ok(sn.till < sn.cost && sn.till < n.till, 'fixture: a small fandom reads a till under the room’s bill (' + sn.till + ' against ' + sn.cost + ')');
  const b0 = small.s.budget;
  must(KP.endGroup(small.s, small.gid, 'concert'));
  t.eq(small.s.budget, b0 + sn.till - sn.cost, 'and the last night is played at a loss: the door is not free money');
}

// ---- a farewell record: the announcement ----
const announced = (() => { const f = fork(); f.was = { trust: f.s.trust, fans: f.g.fandom.intensity, morale: people(f).map(p => p.morale), budget: f.s.budget }; f.r = KP.endGroup(f.s, f.gid, 'record'); return f; })();
const BY = base.s.week + E.recordWeeks;
{
  const f = fork(announced);
  const n = firstOf(f.s.inbox.filter(x => x.ind === 'endingAnnounced'));
  t.ok(announced.r.ok && announced.r.announced === true, 'the last record is announced');
  t.eq(JSON.stringify(f.g.ending), JSON.stringify({ how: 'record', since: base.s.week, by: BY }), 'the ending is an object with two dates: the week it was said, and the week the record must be locked by');
  t.ok(!f.g.retiredWeek && f.g.members.length === 4 && KP.endingOwed(f.g), 'the act stands, and owes a record');
  t.eq(n.priority + '|' + n.groupId, 'critical|' + f.gid, 'the announcement is a critical letter');
  t.eq(n.text, f.g.name + ' will conclude team activities after one last record. The statement says so in its first line and says thank you in every line after it. ' +
    'The fan cafés read it three times, and then somebody posted a calendar. Everything from here to the last stage is being counted. ' + f.s.executive.name +
    ' read the plan twice and initialed it: an act that still sells, ended on a schedule, is at least a schedule.', 'the letter, whole');
  t.eq(f.g.fandom.intensity, Math.min(100, announced.was.fans + E.recordIntensity), 'the fandom rallies');
  t.eq(f.s.trust, announced.was.trust + E.trustPlanned, 'the board prices a planned ending, and prices it lighter');
  t.eq(people(f).map(p => p.morale).join(','), announced.was.morale.join(','), 'nobody’s morale moves on the announcement');
  t.eq(f.s.budget, announced.was.budget, 'and no money does');
  t.ok(people(f).every(p => /announced that the next record is the last one/.test(p.history[p.history.length - 1].text)), 'it is on every member’s file');
  t.eq(f.s.endingLedger.announced, 1, 'the ledger counts the announcement');
  t.eq(JSON.stringify(KP.endingRead(f.s)), JSON.stringify([{ groupId: f.gid, since: base.s.week, by: BY, weeksLeft: E.recordWeeks, stage: 'open', word: 'lock the last record in the Studio by ' + when(BY) }]),
    'the read: when it was said, the date, and what is owed');
  t.eq(KP.validateState(f.s).length, 0, 'the file is valid');
  // an act under the line: nothing for the board to price
  const cold = fork(); cold.g.popularity = D.sellingPop - 1;
  const t0 = cold.s.trust;
  must(KP.endGroup(cold.s, cold.gid, 'record'));
  t.eq(cold.s.trust, t0, 'an act that no longer sells is announced at no cost upstairs');
  t.ok(!firstOf(cold.s.inbox.filter(x => x.ind === 'endingAnnounced')).text.includes('initialed'), 'and the letter drops the sentence');
  // once announced, it is announced
  t.eq(KP.endingDoors(f.s, f.gid).reason, 'The last record is already announced. The act concludes when that era closes.', 'the sheet has no doors left');
  const was = snap(f);
  t.ok(['record', 'concert', 'statement'].every(id => !KP.endGroup(f.s, f.gid, id).ok) && snap(f) === was, 'no door can be taken twice');
  t.ok(!KP.disbandGroup(f.s, f.gid).ok && KP.disbandGroup(f.s, f.gid).reason === 'The last record is already announced. The act concludes when that era closes.' && snap(f) === was,
    'and the old verb cannot cut the promise short');
  t.eq(KP.declareHiatus(f.s, f.gid).reason, 'They owe the fandom one last record. The rest comes after it.', 'an act that owes its last record cannot go on hiatus');
  // the last record has no second act: the reissue door stays shut
  const rel = { format: 'mini', week: f.s.week };
  const live = fork(); live.g.eraLeftovers = [{ id: 'x' }];
  f.g.eraLeftovers = [{ id: 'x' }];
  t.ok(KP.reissueOpenFor(live.s, live.g, rel) === true && KP.reissueOpenFor(f.s, f.g, rel) === false, 'a stocked drawer opens the reissue door for a living act and not for one that is ending');
  // a reissue question already on the desk is answered by the announcement
  const asked = fork(); KP.openScene(asked.s, { kind: 'theReissue', groupId: asked.gid, expiresWeek: asked.s.week + 3 });
  must(KP.endGroup(asked.s, asked.gid, 'record'));
  t.ok(!(asked.s.scenes || []).some(sc => sc.kind === 'theReissue'), 'a reissue question on the desk leaves with the announcement');
  // a save and a load keep it
  const again = fork(f);
  t.eq(JSON.stringify(again.g.ending), JSON.stringify(f.g.ending), 'a save and a load keep the ending');
  // the timeline hears it
  const echo = KP.feedReactionFor('endingAnnounced')(f.s, n);
  t.ok(echo && echo.persona && echo.text.includes(f.g.name) && !noisy(echo.text), 'the timeline hears the announcement');
}

// ---- a farewell record: the lock tells, the landing reads ----
const LAND = base.s.week + 6;
const locked = (() => { const f = fork(announced); f.before = f.s.inbox.length; lock(f, LAND); return f; })();
{
  const f = fork(locked);
  const n = firstOf(f.s.inbox.filter(x => x.ind === 'lastRecordSet'));
  t.eq(n.priority + '|' + n.groupId, 'high|' + f.gid, 'the lock of the last record is its own letter');
  t.ok(n.text.startsWith('The last one has a date: ' + f.g.name + '’s final record lands ' + when(LAND) + '.'), 'naming the act and the landing');
  t.eq(f.s.inbox.filter(x => x.ind === 'lastRecordSet').length, 1, 'once');
  t.eq(KP.endingRead(f.s)[0].stage + '|' + KP.endingRead(f.s)[0].word, 'locked|the last record is locked: it lands ' + when(LAND), 'the read moves to locked');
  t.ok(!!KP.feedReactionFor('lastRecordSet')(f.s, n).text, 'the timeline hears the date');
  // an act with no ending locks an ordinary record
  const plain = fork(); lock(plain, LAND);
  t.eq(plain.s.inbox.filter(x => x.ind === 'lastRecordSet').length, 0, 'a living act’s lock says nothing of the kind');

  // the record already in production becomes the last one
  const made = fork(); lock(made, LAND);
  must(KP.endGroup(made.s, made.gid, 'record'));
  t.ok(firstOf(made.s.inbox.filter(x => x.ind === 'endingAnnounced')).text.includes('The record already on the calendar, landing ' + when(LAND) + ', is that record.'), 'a record in production is named by the announcement as the last one');
  t.eq(KP.endingRead(made.s)[0].stage, 'locked', 'and the read starts at locked');

  // the landing
  const wire = runTo(f, LAND);
  t.eq(f.g.releases[f.g.releases.length - 1].week, LAND, 'fixture: the record landed in its week');
  const rel = f.g.releases[f.g.releases.length - 1];
  t.eq(JSON.stringify(f.g.ending.record), JSON.stringify({ week: LAND }), 'the landing stamps the ending: this was the record');
  t.eq(rel.lastRecord, true, 'the release is archived as the act’s last');
  const row = reach(f, 'the last record');
  t.eq(row.length, 1, 'the report’s reach carries a row for it');
  t.ok(row.length === 1 && row[0].mod >= E.recordReach && row[0].mod <= E.recordReach + E.recordCap, 'worth the base and at most the cap on top (' + (row[0] || {}).mod + ')');
  t.ok((f.g.results.publicNotes || []).some(x => /This is the last .* record, announced as one and bought as one/.test(x)), 'and the report says what it was');
  t.eq(f.s.endingLedger.records, 1, 'the ledger counts the record');
  t.eq(KP.endingRead(f.s)[0].stage + '|' + KP.endingRead(f.s)[0].word, 'landed|the last record is out; the act concludes when promotion ends, ' + when(f.g.promoUntil + 1), 'the read: out, and the week the act concludes');
  t.ok(!f.g.retiredWeek && finals(wire).length === 0, 'the act does not conclude at the landing');
  // the same lock on an act with no ending: no row
  const twin = fork(plain); runTo(twin, LAND);
  t.eq(reach(twin, 'the last record').length + '|' + String(twin.g.releases[twin.g.releases.length - 1].lastRecord), '0|null', 'the same record from a living act carries no such row and no such mark');
  // the lift reads the fandom: forced to each end
  const lo = fork(locked); runTo(lo, LAND - 1); lo.g.fandom.intensity = 0; runTo(lo, LAND);
  const hi = fork(locked); runTo(hi, LAND - 1); hi.g.fandom.intensity = 100; runTo(hi, LAND);
  t.eq(firstOf(reach(lo, 'the last record')).mod + '|' + firstOf(reach(hi, 'the last record')).mod, E.recordReach + '|' + (E.recordReach + E.recordCap), 'a fandom with nothing organized adds nothing; a devoted one adds the cap');
  // a record that lands after the last record is not a second last record
  t.eq(JSON.stringify(KP.endingReadsRelease(f.s, f.g, false)), JSON.stringify({ mod: 0, note: null, last: false }), 'the read is spent once the last record has landed');
}

// ---- a leaving member inside the act's last record: her lift is inside it ----
{
  const mk = (ending) => {
    const f = fork(ending ? announced : base);
    const p = f.s.people[f.ids[2]];
    p.contract.start = LAND + 10 - C.years * YEAR;   // forced: her paper ends ten weeks after the landing
    KP.beginLap(f.s, p, 'warm');
    p.contract.told = 'fans'; p.contract.toldWeek = f.s.week;   // forced: the fans know, no question is left to ask
    lock(f, LAND);
    runTo(f, LAND);
    return Object.assign(f, { p });
  };
  const alone = mk(false), both = mk(true);
  t.eq(reach(alone, 'the farewell').length + '|' + reach(alone, 'the last record').length, '1|0', 'fixture: on a living act, her last era carries its own row');
  t.eq(reach(both, 'the farewell').length + '|' + reach(both, 'the last record').length, '0|1', 'on an act’s last record her row is absorbed: it is everyone’s last era');
  t.eq(JSON.stringify(both.p.contract.farewellEra), JSON.stringify({ week: LAND }), 'and it still counts as her last era (a promise made at the table is kept by it)');
  t.eq(JSON.stringify(both.g.releases[both.g.releases.length - 1].farewellFor), JSON.stringify([both.p.id]), 'archived on the release as hers too');
}

// ---- a farewell record: the act concludes at the close ----
{
  const f = fork(locked);
  runTo(f, LAND);
  const END = f.g.promoUntil + 1;
  const title = f.g.releases[f.g.releases.length - 1].songTitle;
  // every promotion week: still standing
  let early = 0;
  while (f.s.week < END - 1) { answerAll(KP, f.s); if (finals(tick(KP, f.s)).length || f.g.retiredWeek) early++; }
  t.eq(early, 0, 'the act stands through every week of the last promotion');
  // the unit price of this door, read on a twin taken the week before the close
  const unit = fork(f); unit.g.promoUntil = unit.s.week - 1;   // forced: promotion over, so the verb can be called by hand
  const um = people(unit).map(p => p.morale), ut = unit.s.trust;
  KP.disbandGroup(unit.s, unit.gid, { how: 'record' });
  t.eq(people(unit).map(p => p.morale).join(','), um.map(m => m - E.recordMorale).join(','), 'this door costs the room the least of the three');
  t.ok(E.recordMorale < E.concertMorale, 'by rule');
  t.ok(people(unit).every(p => count(p, 'lastRecord') === 1 && count(p, 'disbandedUs') === 0), 'and is remembered as an ending done right');
  t.eq(unit.s.trust, ut, 'the board is not charged again: the plan was priced when it was announced');
  // the close
  answerAll(KP, f.s);
  const wire = tick(KP, f.s);
  const fin = firstOf(finals(wire));
  t.eq(f.s.week, END, 'fixture: this is the week after the last promotion week');
  t.eq(wire.filter(n => n.ind === 'eraClosed').length + '|' + finals(wire).length, '1|1', 'the week’s wire carries the era’s close and the final statement');
  t.ok(wire.findIndex(n => n.ind === 'eraClosed') < wire.findIndex(n => n.ind === 'playerDisband'), 'the era is read back first, then the act');
  t.eq(fin.priority + '|' + fin.how, 'critical|record', 'the final statement is critical and names the door');
  t.ok(fin.text.startsWith('“' + title + '” was announced as ' + f.g.name + '’s last record, and it was. The era closed this week and the group closed with it: '), 'it opens on the record');
  t.ok(fin.text.includes(['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'][f.g.releases.length] + ' records in ') && fin.text.includes('the last one made by people who knew it was the last. ' + f.g.name + ' concludes team activities, on the date it said it would.'),
    'counts the discography, and says the date was kept');
  t.ok(fin.text.includes(listOf(names(f)) + ' remain with ' + f.s.company.short) && fin.text.endsWith('The catalog stays, and the fandom has already decided it is not finished with it.') && !fin.text.includes('eyebrow') && !noisy(fin.text),
    'names what the members do next, and carries no second bill from upstairs');
  t.eq(f.g.retiredWeek, END, 'the act is concluded that week');
  t.eq(JSON.stringify(f.g.ending), JSON.stringify({ how: 'record', since: base.s.week, by: BY, record: { week: LAND }, week: END }), 'the whole arc is on the record');
  t.eq(JSON.stringify(f.g.afterglow), JSON.stringify({ until: END + E.glowWeeks, mult: E.glowRecord }), 'the shelf stays warmest after this door');
  t.ok(E.glowRecord > E.glowConcert, 'by rule');
  t.eq(JSON.stringify(f.s.endingLedger), JSON.stringify({ statements: 0, concerts: 0, announced: 1, records: 1, closed: 1, lapsed: 0, solos: 0 }), 'the ledger: announced, made, closed');
  t.ok(people(f).every(p => count(p, 'lastRecord') === 1 && p.status === 'idol'), 'on every member’s ledger, and they stay signed');
  t.ok(!(f.s.scenes || []).some(sc => sc.kind === 'theReissue'), 'no reissue door opened at this close');
  t.ok(f.s.inbox.some(n => n.ind === 'playerDisband'), 'the statement survives the week’s trim');
  t.eq(KP.endingRead(f.s).length, 0, 'nothing is owed any more');
  t.eq(KP.endedWord(f.s, f.g), 'ended with a farewell record', 'the record page’s word for it');
  t.eq(KP.validateState(f.s).length, 0, 'the file is valid');
  runTo(f, END + 3);
  t.eq(finals(f.s.inbox).length + '|' + KP.validateState(f.s).length, '1|0', 'and stays valid and concluded once in the weeks after');

  // the act does not end under a member's solo record
  const held = fork(locked); runTo(held, LAND);
  const hEnd = held.g.promoUntil + 1;
  runTo(held, hEnd - 1);
  held.s.people[held.ids[0]].soloEra = { format: 'single', direction: 'company', since: held.s.week, scheduledWeek: held.s.week + 40 };   // forced: far enough out not to land in this test
  answerAll(KP, held.s); tick(KP, held.s);
  t.ok(!held.g.retiredWeek && held.s.week === hEnd, 'a member’s solo record on the calendar holds the conclusion off');
  t.eq(KP.endingRead(held.s)[0].word, 'the last record is out; the act concludes when the solo record on the calendar has landed', 'and the read says what it is waiting for');
  delete held.s.people[held.ids[0]].soloEra;
  answerAll(KP, held.s);
  t.eq(firstOf(finals(tick(KP, held.s))).how + '|' + held.g.retiredWeek, 'record|' + (hEnd + 1), 'the week it is clear, the act concludes');
  // the read while a tour is out (the rail waits on the same three things)
  const road = fork(locked); runTo(road, LAND); road.g.promoUntil = road.s.week - 1; road.g.tour = { forced: true };
  t.eq(KP.endingRead(road.s)[0].word, 'the last record is out; the act concludes when the tour comes home', 'an act on the road concludes when it is home');
}

// ---- a farewell record that is never made: the lapse ----
{
  const f = fork(announced);
  const wire = runTo(f, BY);
  const due = wire.filter(n => n.ind === 'lastRecordDue');
  t.eq(due.length + '|' + firstOf(due).priority + '|' + firstOf(due).week, '1|high|' + (BY - 6), 'six weeks before the date, one high letter says so');
  t.ok(firstOf(due).text.includes('Six weeks are left to lock the last ' + f.g.name + ' record: the date the announcement implied is ' + when(BY) + '.'), 'naming the act and the date');
  t.ok(!f.g.retiredWeek && finals(wire).length === 0, 'up to and including the date, the act stands');
  t.eq(KP.endingRead(f.s)[0].weeksLeft + '|' + KP.endingRead(f.s)[0].stage, '0|open', 'the read counts down to nothing');
  // the unit price of the lapse
  const unit = fork(f);
  const um = people(unit).map(p => p.morale), ut = unit.s.trust;
  unit.g.popularity = D.sellingPop - 1;   // forced: under the line, so the charge below is not the selling one
  KP.disbandGroup(unit.s, unit.gid, { how: 'lapsed' });
  t.eq(people(unit).map(p => p.morale).join(','), um.map(m => Math.max(0, m - D.morale - E.lapseMorale)).join(','), 'the lapse costs the room the statement and more');
  t.ok(people(unit).every(p => count(p, 'disbandedUs') === 1 && count(p, 'promiseBroken') === 1), 'on every ledger: the group ended under her, and a promise was broken');
  t.eq(unit.s.trust, ut + E.lapseTrust, 'the board charges it whether or not the act still sold');
  // the week after the date
  answerAll(KP, f.s);
  const fin = firstOf(finals(tick(KP, f.s)));
  t.eq(f.s.week + '|' + fin.priority + '|' + fin.how, (BY + 1) + '|critical|lapsed', 'the week after the date, the quiet statement goes out by itself');
  t.eq(fin.text, f.g.name + ' announced one last record ' + (BY + 1 - base.s.week) + ' weeks ago, and it was never made. The statement that went out today is the quiet one: ' + f.g.name +
    ' concludes team activities. Everyone who was promised a last era, inside the building and outside it, has the date written down. ' + listOf(names(f)) + ' remain with ' + f.s.company.short +
    ', contracts running and calendars open. The fan cafés are not holding a wake. They are holding a receipt. ' + f.s.executive.name +
    ' did not raise an eyebrow this time. A company that announces a record and does not make it is not unstable, upstairs said; it is unserious.', 'the letter, whole');
  t.eq(f.g.ending.how + '|' + f.g.retiredWeek + '|' + String(f.g.afterglow), 'lapsed|' + (BY + 1) + '|undefined', 'concluded, as a lapse, with nothing on the shelf');
  t.eq(f.s.endingLedger.lapsed + '|' + f.s.endingLedger.closed + '|' + f.s.endingLedger.statements, '1|0|0', 'the ledger counts a lapse and nothing else');
  t.eq(KP.endedWord(f.s, f.g), 'ended with a statement, after a last record that was never made', 'the record page’s word for it');
  t.eq(KP.validateState(f.s).length, 0, 'the file is valid');
  const echo = KP.feedReactionFor('playerDisband')(f.s, fin, KP.rngFor(f.s));
  t.ok(echo && /album|farewell record/.test(echo.text), 'the timeline knows what was promised');

  // a record locked before the date holds the lapse off, however late it lands
  const late = fork(announced); runTo(late, BY - 1); lock(late, BY + 5);
  const w2 = runTo(late, BY + 5);
  t.ok(!late.g.retiredWeek && finals(w2).length === 0 && w2.filter(n => n.ind === 'lastRecordDue').length === 0, 'a record locked inside the date is not a lapse, even when it lands after it');
  t.eq(JSON.stringify(late.g.ending.record), JSON.stringify({ week: BY + 5 }), 'it lands, and it is the last record');
  runTo(late, late.g.promoUntil + 1);
  t.eq(late.g.ending.how + '|' + late.g.retiredWeek, 'record|' + late.s.week, 'and the act concludes at its close, as promised');

  // the law has these weeks: a service hiatus slides the date
  const serve = fork(announced);
  serve.g.ending.by = serve.s.week + 1;                       // forced: the date is next week
  serve.g.hiatus = { since: serve.s.week, service: true };    // forced: the group enlisted
  runTo(serve, serve.s.week + 4);
  t.ok(!serve.g.retiredWeek, 'an act in service is not lapsed while it serves');
  t.eq(serve.g.ending.by, serve.s.week + E.recordWeeks, 'the date slides with the service: a full window from the discharge');

  // overtaken: the last contract goes while the record is owed
  const gone = fork(announced);
  gone.ids.forEach(id => KP.departIdol(gone.s, id, 'warm', null));
  t.eq(gone.g.ending.how + '|' + gone.g.retiredWeek + '|' + KP.endingRead(gone.s).length, 'contract|' + gone.s.week + '|0', 'an act emptied by its contracts closes that way, and owes nothing');
  t.eq(KP.endedWord(gone.s, gone.g), 'closed with the last contract', 'the record page’s word for it');
  const w3 = runTo(gone, gone.s.week + 2);
  t.eq(finals(w3).length + '|' + KP.validateState(gone.s).length, '0|0', 'the rail leaves a concluded act alone');
}

// ---- the roll call: what each member does next, from her file ----
{
  const f = fork();
  const [a, b, c, d] = people(f);
  const before = snap(f);
  let roll = KP.endingRollCall(f.s, f.g);
  t.eq(snap(f), before, 'reading the roll call writes nothing');
  t.eq(JSON.stringify(roll), JSON.stringify({ lines: [listOf(names(f)) + ' remain with ' + f.s.company.short + ', contracts running and calendars open.'], solos: [] }),
    'four members with nothing special on file share one sentence');
  // a fact with a date goes first, each in her own sentence, in lineup order
  a.flags.military = { since: f.s.week, until: f.s.week + 60 };                       // forced: in service
  KP.beginLap(f.s, b, 'warm'); b.contract.told = 'fans'; b.contract.toldWeek = f.s.week;   // forced: leaving, and the fans know
  c.flags.personalHiatus = { since: f.s.week };                                       // forced: on a break
  roll = KP.endingRollCall(f.s, f.g);
  t.eq(roll.lines.length, 4, 'three facts and one member left for the shared sentence');
  t.eq(roll.lines[0], KP.displayName(a) + ' is in service until ' + when(f.s.week + 60) + ', and the discharge is the next date on her calendar.', 'in service: until when');
  t.eq(roll.lines[1], KP.displayName(b) + '’s contract ends ' + when(b.contract.start + C.years * YEAR) + ', as she said it would.', 'on a lap the fans know: the date she named');
  t.eq(roll.lines[2], KP.displayName(c) + ' stays on her break, and nothing is asked of her.', 'on a break: she stays on it');
  t.eq(roll.lines[3], KP.displayName(d) + ' remains with ' + f.s.company.short + ', the contract running and the calendar open.', 'one member left: the sentence in the singular');
  // a lap kept in the house stays in the house
  const g2 = fork(); const q = g2.s.people[g2.ids[1]];
  KP.beginLap(g2.s, q, 'warm'); q.contract.told = 'house';
  t.eq(KP.endingRollCall(g2.s, g2.g).lines.length, 1, 'a lap kept in the house is not announced by the company’s statement');
  // a second job outlives the group
  const g3 = fork(); const w = g3.s.people[g3.ids[3]];
  g3.s.outside = (g3.s.outside || []).concat([{ id: 'outX', kind: 'mc', personId: w.id, label: 'Friday Countdown', weekly: 2, weeks: 8, weeksLeft: 5, signedWeek: g3.s.week, weeksRun: 3 }]);   // forced
  t.ok(KP.endingRollCall(g3.s, g3.g).lines[0] === KP.displayName(w) + ' stays on as MC of Friday Countdown.', 'a member with a second job keeps it, by name');
  must(KP.endGroup(g3.s, g3.gid, 'statement'));
  t.ok(KP.outsideOf(g3.s, w.id) !== null && KP.validateState(g3.s).length === 0, 'and the job does run on after the act (the file is valid)');
  // the statement carries the roll call as read
  must(KP.endGroup(f.s, f.gid, 'statement'));
  const text = firstOf(f.s.inbox.filter(x => x.ind === 'playerDisband')).text;
  t.ok(roll.lines.every(l => text.includes(l)) && text.indexOf(roll.lines[0]) < text.indexOf(roll.lines[3]) && !noisy(text), 'the final statement carries every line, in order');
}

// ---- a member whose solo career was open keeps it, as an act of its own ----
{
  const f = fork();
  const star = f.s.people[f.g.roles.center];
  must(KP.launchSoloCareer(f.s, star.id));
  t.ok(!!star.dualCareer, 'fixture: her solo career is open, inside the group');
  const read = KP.endingDoors(f.s, f.gid);
  t.eq(JSON.stringify(read.notes), JSON.stringify([KP.displayName(star) + '’s solo career becomes an act of its own when ' + f.g.name + ' ends. It holds the development slot until her solo debut.']),
    'the sheet says what the ending does to her career, and what that holds up');
  t.eq(KP.endingDoors(fork().s, base.gid).notes.length, 0, 'an act with no such member has no such note');
  const groupsBefore = f.s.groups.length;
  must(KP.endGroup(f.s, f.gid, 'statement'));
  const act = f.s.groups.find(x => x.type === 'solo' && x.members.includes(star.id)) || null;
  t.ok(!!act && f.s.groups.length === groupsBefore + 1, 'a solo act is opened for her');
  if (!act) t.ok(false, 'with no solo act on file, nothing about it can be read');
  else {
  t.eq(act.name + '|' + act.originGroupId + '|' + act.debuted + '|' + JSON.stringify(act.members) + '|' + JSON.stringify(act.roles), KP.displayName(star) + '|' + f.gid + '|false|' + JSON.stringify([star.id]) + '|' + JSON.stringify({ leader: star.id, center: star.id }),
    'under her own name, out of the act that ended, with her in both seats');
  t.ok(star.dualCareer === undefined, 'the in-group career is closed: the act is the career now');
  t.eq(KP.groupOf(f.s, star.id), act, 'she belongs to it');
  t.eq(f.s.endingLedger.solos, 1, 'the ledger counts it');
  const text = firstOf(f.s.inbox.filter(x => x.ind === 'playerDisband')).text;
  t.ok(text.includes(KP.displayName(star) + ' continues as a soloist under ' + f.s.company.short + ': the career that was already hers, with a door of its own now.'), 'the statement says what she does next');
  t.ok(text.includes(listOf(names(f).filter(n => n !== KP.displayName(star))) + ' remain with ' + f.s.company.short), 'and the other three share their sentence');
  t.ok(/The solo career moved out of .* calendar and into its own/.test(star.history[star.history.length - 1].text), 'it is on her file');
  t.eq(KP.devGroup(f.s), act, 'the act holds the development slot, as the sheet said it would');
  t.eq(KP.validateState(f.s).length, 0, 'the file is valid');
  // the graduation builds the same object through the same helper
  const grad = fork(); const gp = grad.s.people[grad.g.roles.center];
  must(KP.graduateToSolo(grad.s, gp.id));
  const gact = grad.s.groups.find(x => x.type === 'solo' && x.members.includes(gp.id));
  t.eq(JSON.stringify(Object.keys(gact)), JSON.stringify(Object.keys(act)), 'a graduation opens the same kind of act, field for field');
  // and she can debut out of it
  lockAct(f, act, f.s.week + 6);
  runTo(f, f.s.week + 6);
  t.ok(act.debuted === true && (act.releases || []).length === 1 && KP.validateState(f.s).length === 0, 'the act debuts through the Studio like any other');
  // a solo act ends in the first person
  runTo(f, act.promoUntil + 2);
  const sd = KP.endingDoors(f.s, act.id);
  t.ok(sd.ok && sd.doors.find(x => x.id === 'statement').lines[0].includes('The artist loses ' + D.morale + ' morale') && sd.doors.find(x => x.id === 'record').lines[0].includes('the chapter concludes when that era closes'),
    'a solo act’s doors speak of the artist and the chapter');
  const s1 = KP.deserialize(KP.serialize(f.s));
  must(KP.endGroup(s1, act.id, 'record'));
  t.ok(firstOf(s1.inbox.filter(x => x.ind === 'endingAnnounced')).text.startsWith(act.name + ' will close this chapter of the solo career after one last record.'), 'a soloist announces the last record of a chapter, not of a team');
  const s2 = KP.deserialize(KP.serialize(f.s));
  must(KP.endGroup(s2, act.id, 'statement'));
  const st = firstOf(s2.inbox.filter(x => x.ind === 'playerDisband')).text;
  t.ok(st.startsWith('The statement is out: ' + act.name + ' closes this chapter of the solo career.') && st.includes(act.name + ' remains with ' + s2.company.short + '; the contract runs, and the calendar is hers to fill.') && !noisy(st),
    'and the statement is hers alone');
  t.eq(KP.validateState(s1).length + KP.validateState(s2).length, 0, 'both files are valid');
  }
}
function lockAct(f, act, week) {
  act.demos = KP.generateDemos(f.s, KP.rngFor(f.s), act);
  const d = act.demos[0];
  must(KP.planDebut(f.s, { groupId: act.id, songId: d.id, conceptId: d.conceptId, promo: 'standard', format: 'single', week,
    alloc: { vocals: 25, dance: 25, rap: 25, media: 25 }, rollout: PLAN.map(w => w.slice()) }));
}

// ---- what the door leaves on the shelf ----
{
  // the annuity's own sum, with and without the glow
  const sum = (s, glowOn) => {
    const CP = KP.C.CATALOG_PAY;
    let v = 0;
    s.groups.forEach(g => {
      const glow = glowOn && g.afterglow && s.week <= g.afterglow.until ? 1 + g.afterglow.mult : 1;
      (g.releases || []).forEach(r => {
        const age = s.week - r.week;
        if (age <= 0) return;
        v += Math.max(0, (r.reception || 0) - 45) * CP.perReception * Math.max(CP.floorDecay, 1 / (1 + age / CP.halfLifeWeeks)) * glow;
      });
    });
    return Math.round(v);
  };
  const paid = (how, mut) => {
    const f = fork();
    f.g.releases.forEach((r, i) => { r.reception = 90; r.week = f.s.week - 10 - i; });   // forced: a young, strong shelf that pays enough to read the difference
    must(KP.endGroup(f.s, f.gid, how));
    if (mut) mut(f);
    const before = f.s.commerceLedger.catalogPaid;
    answerAll(KP, f.s); tick(KP, f.s);
    return { f, got: f.s.commerceLedger.catalogPaid - before, plain: sum(f.s, false), warm: sum(f.s, true) };
  };
  const st = paid('statement'), co = paid('concert');
  t.ok(st.plain >= 4, 'fixture: the shelf pays enough a week to read a quarter more (' + st.plain + ')');
  t.eq(st.got, st.plain, 'after a statement the shelf pays what the records earn');
  t.eq(co.got, co.warm, 'after a last concert it pays more');
  t.ok(co.warm > co.plain && Math.abs(co.warm - co.plain * (1 + E.glowConcert)) <= 1, 'by the concert’s share (' + co.plain + ' → ' + co.warm + ')');
  t.eq(JSON.stringify(KP.afterglowOf(co.f.s, co.f.g)), JSON.stringify(co.f.g.afterglow), 'the read says the shelf is warm');
  // the glow ends
  const over = paid('concert', f => { f.g.afterglow.until = f.s.week; });   // forced: its last week is this one
  t.eq(over.got, over.plain, 'the week after the glow ends, the shelf pays plain again');
  t.eq(KP.afterglowOf(over.f.s, over.f.g), null, 'and the read says so');
}

// ---- the timeline grieves by the door ----
{
  const said = how => {
    const f = fork();
    if (how === 'statement' || how === 'concert') must(KP.endGroup(f.s, f.gid, how));
    else { f.g.ending = { how: 'record', since: f.s.week - 10, by: f.s.week + 20 }; KP.disbandGroup(f.s, f.gid, { how }); }
    const n = firstOf(f.s.inbox.filter(x => x.ind === 'playerDisband'));
    const lines = [];
    for (let i = 0; i < 12; i++) { const rng = new KP.Rng('echo-' + i); const e = KP.feedReactionFor('playerDisband')(f.s, n, rng); if (e && !lines.includes(e.text)) lines.push(e.text); }
    return lines;
  };
  const fams = { statement: said('statement'), concert: said('concert'), record: said('record'), lapsed: said('lapsed') };
  t.ok(Object.keys(fams).every(k => fams[k].length === 2 && fams[k].every(x => !noisy(x))), 'each door has its own two lines');
  const all = [].concat(fams.statement, fams.concert, fams.record, fams.lapsed);
  t.eq(new Set(all).size, 8, 'and no line is shared between doors');
  t.ok(fams.concert.every(x => /concert|last-night/.test(x)) && fams.record.every(x => /record|comeback/.test(x)) && fams.lapsed.every(x => /album|farewell record/.test(x)), 'each family is about its own door');
}

// ---- old saves: a file from before an ending had a door ----
// what 0.11.10 wrote: no ending ledger, no word for how an act ended. The
// version is set by hand: the build's own number moves at the ship.
{
  const oldFile = (src, mut) => {
    const o = JSON.parse(KP.serialize(src));
    o.version = '0.11.10';
    delete o.endingLedger;
    o.groups.forEach(g => { delete g.ending; delete g.afterglow; });
    if (mut) mut(o);
    return JSON.stringify(o);
  };
  // a living act
  const live = KP.deserialize(oldFile(base.s));
  t.eq(live.version, KP.C.VERSION, 'an old file is stamped to this build on load');
  t.ok(!!live.endingLedger && Object.values(live.endingLedger).reduce((a, b) => a + b, 0) === 0, 'the ending ledger arrives, all zeros');
  t.ok(!live.groups.find(g => g.id === base.gid).ending && KP.endingRead(live).length === 0, 'a living act gains no ending');
  t.eq(KP.validateState(live).length, 0, 'the upgraded file is valid');
  t.ok(KP.endingDoors(live, base.gid).ok, 'and its act can be ended through the doors');
  // an act the old verb concluded
  const dis = fork(); KP.disbandGroup(dis.s, dis.gid);
  const s1 = KP.deserialize(oldFile(dis.s));
  const g1 = s1.groups.find(g => g.id === dis.gid);
  t.eq(JSON.stringify(g1.ending), JSON.stringify({ how: 'statement', week: dis.g.retiredWeek }), 'an act the old verb concluded is known by the line on its members’ files: ended with a statement, that week');
  t.eq(KP.endedWord(s1, g1), 'ended with a statement', 'and its record page says so');
  // an act the old build ended with its last contract: no word is invented
  const last = fork();
  last.ids.forEach(id => KP.departIdol(last.s, id, 'warm', null));
  const s2 = KP.deserialize(oldFile(last.s));
  const g2 = s2.groups.find(g => g.id === last.gid);
  t.ok(!g2.ending && KP.endedWord(s2, g2) === '', 'an act that ended some other way on an old build keeps no word for it');
  t.eq(KP.validateState(s1).length + KP.validateState(s2).length, 0, 'both upgraded files are valid');
  // the chain run again changes nothing
  const twice = KP.deserialize(KP.serialize(s1));
  KP.migrate(twice);
  t.eq(JSON.stringify(twice.groups.find(g => g.id === dis.gid).ending), JSON.stringify(g1.ending), 'the chain run over it again changes nothing');
  // a file from this build is left alone
  const now = fork(announced);
  const back = KP.deserialize(KP.serialize(now.s));
  t.eq(JSON.stringify(back.groups.find(g => g.id === now.gid).ending), JSON.stringify(now.g.ending), 'a file from this build keeps its ending as written');
}

// ---- the screens: the sheet, the act's page, Today, the Studio, the record ----
{
  const dom = require('./dom_stub');
  const Dm = dom.load();
  const K = Dm.KP, App = Dm.App, el = Dm.el;
  const load = x => { const s = K.deserialize(KP.serialize(x.s)); return { s, g: s.groups.find(y => y.id === x.gid), gid: x.gid }; };
  const page = (s, tab, sub) => { App.state = s; App.mode = 'game'; App.tab = tab; App.view = null; if (sub) App.deskSub = sub; App.render(); return el('screen').innerHTML; };
  const text = h => dom.stripTags(h).replace(/\s+/g, ' ');
  const clean = h => !/undefined|NaN|\{she\}|\{her\}|\{pos\}|\{Pos\}/.test(h);
  const actions = (h, a) => dom.actionsIn(h).filter(x => x.action === a);

  // the act's page: one quiet button at the bottom
  const A = load(fork());
  let h = Dm.UI.renderGroupPage(A.s, A.g);
  t.eq(actions(h, 'disband-group').length + '|' + text(h).includes('Conclude team activities'), '1|true', 'the act’s page keeps its one quiet button');
  t.ok(!text(h).includes('The last record'), 'and no card for an ending nobody has announced');
  // the sheet
  App.state = A.s; App.mode = 'game'; App.tab = 'groups'; App.view = null; App.render();
  Dm.click({ action: 'disband-group', id: A.gid });
  let m = el('modal-root').innerHTML;
  t.ok(clean(m) && text(m).includes('How ' + A.g.name + ' ends') && text(m).includes('Three ways to close ' + A.g.name + '. Whichever one is taken cannot be undone.'), 'the button opens a sheet, not a confirmation');
  t.eq(actions(m, 'ending-door').map(x => x.dataset.how).join(','), 'record,concert,statement', 'with three doors, each a button');
  t.ok(['A farewell record', 'One last concert', 'The quiet statement', 'Announce a farewell record', 'Put out the quiet statement', 'Not yet'].every(w => text(m).includes(w)), 'named, with their answers and a way out');
  t.ok(KP.endingDoors(fork().s, base.gid).doors.every(d => d.lines.every(l => text(m).includes(l))), 'every line the engine reads is on the sheet');
  t.eq(actions(m, 'close-modal').length >= 1, true, 'Not yet closes it');
  t.ok(!A.g.ending && !A.g.retiredWeek, 'opening the sheet changes nothing');
  // a shut door shows its reason in place of its button
  const B = load((() => { const f = fork(); f.g.fandom.intensity = M.fanconMinIntensity - 1; return f; })());
  App.state = B.s; App.render();
  Dm.click({ action: 'disband-group', id: B.gid });
  m = el('modal-root').innerHTML;
  t.eq(actions(m, 'ending-door').map(x => x.dataset.how).join(','), 'record,statement', 'a shut door has no button');
  t.ok(text(m).includes('A last concert for an unorganized fandom is a theater rental with extra sadness.'), 'and says why');
  // a whole sheet shut is a toast, not a sheet
  const P = load((() => { const f = fork(); f.g.promoUntil = f.s.week + 1; return f; })());
  App.state = P.s; App.render(); el('modal-root').innerHTML = '';
  Dm.click({ action: 'disband-group', id: P.gid });
  t.eq(el('modal-root').innerHTML, '', 'an act that cannot end this week gets no sheet');
  // a project still gets its one-line confirmation
  const J = load((() => { const f = fork(); f.g.debuted = false; return f; })());
  App.state = J.s; App.render();
  Dm.click({ action: 'disband-group', id: J.gid });
  m = el('modal-root').innerHTML;
  t.ok(text(m).includes('Dissolve the project') && actions(m, 'disband-confirm').length === 1 && actions(m, 'ending-door').length === 0, 'a project is still dissolved from its old confirmation');
  // a member with an open solo career: the sheet carries the note
  const S = load((() => { const f = fork(); must(KP.launchSoloCareer(f.s, f.g.roles.center)); return f; })());
  App.state = S.s; App.render();
  Dm.click({ action: 'disband-group', id: S.gid });
  t.ok(text(el('modal-root').innerHTML).includes('’s solo career becomes an act of its own when ' + S.g.name + ' ends.'), 'the sheet warns what happens to an open solo career');

  // taking a door from the sheet
  App.state = A.s; App.tab = 'groups'; App.view = null; App.render();
  Dm.click({ action: 'disband-group', id: A.gid });
  Dm.click({ action: 'ending-door', id: A.gid, how: 'record' });
  t.eq(JSON.stringify(A.g.ending), JSON.stringify({ how: 'record', since: A.s.week, by: A.s.week + E.recordWeeks }), 'a door on the sheet takes the door');
  t.eq(el('modal-root').innerHTML, '', 'and the sheet closes');
  h = Dm.UI.renderGroupPage(A.s, A.g);
  t.ok(clean(h) && text(h).includes('The last record — announced ' + K.weekLabel(A.s.week).text + '. Lock the last record in the Studio by ' + K.weekLabel(A.s.week + E.recordWeeks).text + '. The act concludes when that era closes, and the final statement names what each member does next.'),
    'the act’s page carries the last record: when it was said, the date, what follows');
  t.eq(actions(h, 'disband-group').length, 0, 'and the quiet button is gone: the door is taken');
  h = page(A.s, 'desk', 'today');
  t.ok(clean(h) && text(h).includes('The last record · ' + A.g.name + ' Announced ' + K.weekLabel(A.s.week).text + ' · lock the last record in the Studio by ' + K.weekLabel(A.s.week + E.recordWeeks).text),
    'Today carries it too');
  t.ok(text(h).includes(E.recordWeeks + ' weeks to lock it') && text(h).includes('the act concludes when that era closes'), 'with the weeks left and what it is for');
  t.eq(actions(h, 'open-grouppage').filter(x => x.dataset.id === A.gid).length >= 1, true, 'and the card opens the act’s page');
  t.ok(!text(page(load(fork()).s, 'desk', 'today')).includes('The last record'), 'no ending, no card');
  // the Studio says what this record is
  const studio = x => {
    x.g.demos = K.generateDemos(x.s, K.rngFor(x.s), x.g);
    App.state = x.s; App.mode = 'game'; App.tab = 'studio'; App.view = null; App.resetDrafts();
    App.studioGroupId = x.g.id; App.studioDraft.songId = x.g.demos[0].id;
    App.render();
    return el('screen').innerHTML;
  };
  h = studio(A);
  t.ok(clean(h) && text(h).includes('This is ' + A.g.name + '’s last record. Its announcement says so, it lands warmer for it, and the act concludes when its era closes.'), 'the Studio says the record on the desk is the last one');
  t.ok(!text(studio(load(fork()))).includes('last record'), 'a living act’s Studio says nothing of the kind');

  // the record page: how it ended, and the shelf
  const conc = fork(); must(KP.endGroup(conc.s, conc.gid, 'concert'));
  const Cc = load(conc);
  h = Dm.UI.renderGroupPage(Cc.s, Cc.g);
  t.ok(clean(h) && text(h).includes('ended with one last concert') && text(h).includes('the shelf stays warm until ' + K.weekLabel(conc.s.week + E.glowWeeks).text + ': the catalog pays ' + Math.round(E.glowConcert * 100) + '% more'),
    'a concluded act’s page says how it ended and what that left on the shelf');
  const stm = fork(); must(KP.endGroup(stm.s, stm.gid, 'statement'));
  const Ss = load(stm);
  h = Dm.UI.renderGroupPage(Ss.s, Ss.g);
  t.ok(text(h).includes('ended with a statement') && !text(h).includes('the shelf stays warm'), 'a statement leaves the word and no shelf');
  // the last record is marked in the discography
  const rec = fork(locked); runTo(rec, LAND); runTo(rec, rec.g.promoUntil + 1);
  const Rr = load(rec);
  h = Dm.UI.renderGroupPage(Rr.s, Rr.g);
  t.ok(clean(h) && text(h).includes('ended with a farewell record') && text(h).includes(' · the last record'), 'the record page marks which record was the last');
  t.ok(text(h).includes('The final lineup · 4') && (text(h).match(/still with the company/g) || []).length === 4, 'and the final lineup, each still with the company');
  // an act an old build ended: no word is invented on the page
  const oldg = fork(); KP.disbandGroup(oldg.s, oldg.gid);
  const Oo = load(oldg);
  delete Oo.g.ending;   // forced after the load: a load of an older file would read the word back off the members' files
  h = Dm.UI.renderGroupPage(Oo.s, Oo.g);
  t.ok(clean(h) && !['ended with a statement', 'ended with one last concert', 'ended with a farewell record', 'closed with the last contract', 'closed when the last member was released'].some(w => text(h).includes(w)),
    'an act with no record of how it ended shows no word for it');
}

t.finish();
