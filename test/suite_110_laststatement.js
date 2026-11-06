/* Suite 110 — the last statement (v0.11.0, §86). The red weeks: a week
   behind on the building is red, the arrears are paid first, the ladder
   is legible (the memo, the staff meeting, the creditors, the FINAL
   NOTICE with the date), the page at twelve. The dissolution closes the
   company ON THE RECORD: people through the exits that exist, the shelf
   to the distributor and still charting, the estate settled with the
   funds' ledger kept. The doors: what the career earned, in the same
   world; the honest moves while the count runs; the week waits at the
   epilogue; forks hold through a death and a rebirth. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_110_laststatement');
const R = KP.C.RED;

function fresh(seed) { return KP.newGame(seed, null, { door: 'fresh' }); }
function legacy(seed) { return KP.newGame(seed, null, { legacy: true }); }
function runUntil(state, pred, cap) {
  let guard = 0;
  while (!pred(state) && guard++ < (cap || 80)) KP.advanceWeek(state);
  return pred(state);
}
function notesInd(ind) { return (KP.lastTickNotes || []).some(n => n.ind === ind); }

// ---- the counter: red is behind, paid first, cooled by one ------------------
{
  const s = fresh('ls-counter');
  s.budget = 0;
  t.ok(runUntil(s, x => x.red && x.red.weeks === 1, 12), 'the first month the account cannot cover reads red');
  t.ok(s.red.arrears > 0 && notesInd('redMemo'), 'the shortfall is arrears, and the accountant’s memo says so');
  const memoWeek = s.week;
  KP.advanceWeek(s); KP.advanceWeek(s);
  t.eq(s.red.weeks, 3, 'every week behind counts');
  // the paydown: what comes in pays the building first
  s.budget = 100;
  const owed = s.red.arrears;
  KP.advanceWeek(s);   // week memo+3: not a month boundary
  t.ok(s.red.arrears === 0 && s.red.paid >= owed, 'money that arrives pays the arrears first (paid ' + s.red.paid + ' of ' + owed + ')');
  t.eq(s.red.weeks, 2, 'a clean week cools the count by ONE — decay, not reset');
  t.ok(s.budget < 100 && s.budget > 0, 'and the rest stays on the account');
  // back to zero: the file breathes and the ladder re-arms
  s.budget = 400;
  t.ok(runUntil(s, x => x.red.weeks === 0, 6), 'two more clean weeks and the count is clean');
  t.ok(notesInd('redCleared') && s.red.rung === 0, 'the building breathes, on the record; the letters re-arm');
  t.ok(s.red.episodes === 1 && s.red.peak === 3 && s.red.total === 3, 'the history keeps the episode, the peak and the total');
  t.ok(memoWeek >= 5, 'fixture: the first boundary');
}

// ---- the ladder: memo, meeting, creditors, final notice, the page ---------------
{
  const s = fresh('ls-ladder');
  s.budget = 0;
  const seen = {};
  const morale0 = {};
  s.roster.forEach(id => { morale0[id] = s.people[id].morale; });
  for (let w = 0; w < 20 && !KP.chapterPending(s); w++) {
    KP.advanceWeek(s);
    (KP.lastTickNotes || []).forEach(n => { if (n.ind && /^red|^lastStatement/.test(n.ind)) seen[n.ind] = seen[n.ind] || s.red.weeks; });
    if (s.red.weeks === R.meetingAt && !seen.meetingUnpaid) {
      seen.meetingUnpaid = s.roster.every(id => (s.people[id].directed || []).some(d => d.kind === 'unpaid'));
    }
    if (s.red.weeks === R.finalNoticeAt && !seen.finalDated) {
      const final = (KP.lastTickNotes || []).find(n => n.ind === 'redFinal');
      seen.finalDated = !!(final && KP.notePriority(final) >= 3 && final.text.includes(KP.weekLabel(s.week + (R.weeksToDissolve - R.finalNoticeAt)).text));
      seen.finalOnCalendar = KP.upcoming(s).some(u => /last statement/.test(u.label));
      seen.finalRead = KP.redRead(s).finalWeek === s.week + (R.weeksToDissolve - R.finalNoticeAt);
    }
    if (s.red.weeks === R.weeksToDissolve && !seen.page) {
      seen.page = (s.scenes || []).some(sc => sc.kind === 'lastStatement');
      seen.pageWord = KP.redRead(s).word;
      seen.pageWeek = s.week;
    }
  }
  t.eq(seen.redMemo, R.memoAt, 'the accountant’s memo at the first red week');
  t.eq(seen.redMeeting, R.meetingAt, 'the staff meeting nobody called at four');
  t.ok(seen.meetingUnpaid, 'every file on the roster takes the month the company could not pay');
  t.eq(seen.redCreditors, R.creditorsAt, 'the creditors’ letters at eight');
  t.ok(s.roster.every(id => (s.people[id].directed || []).filter(d => d.kind === 'unpaid').length >= 2), 'and the ledger entry again');
  t.ok(s.roster.every(id => s.people[id].morale < morale0[id]), 'the fog eats a drowning company first — morale drained weekly from the meeting on');
  t.eq(seen.redFinal, R.finalNoticeAt, 'the FINAL NOTICE at ten');
  t.ok(seen.finalDated && seen.finalRead, 'critical, with the date on it — the read and the letter agree');
  t.ok(seen.finalOnCalendar, 'the date is on the calendar strip');
  t.ok(seen.page && seen.pageWord === 'the final notice', 'the page at twelve: the last statement waits on the Desk');
  const sc = s.scenes.find(x => x.kind === 'lastStatement');
  const def = KP.sceneDef('lastStatement');
  t.ok(def.options(s, sc).length === 1 && def.options(s, sc)[0].id === 'read', 'one option: read it (options[0] is the bot’s default)');
  // the silence reads it, never mid-tick: the sentence lands at the week’s end
  runUntil(s, x => KP.chapterPending(x), 4);
  t.ok(KP.chapterPending(s) && s.week === seen.pageWeek + R.sceneFuseWeeks + 1, 'unread, the page reads itself a week later (' + s.week + ' from ' + seen.pageWeek + ')');
  t.ok(s.inbox.some(n => n.ind === 'lastStatementSilence') && s.inbox.some(n => n.ind === 'dissolution'), 'the silence and the obituary are both on the record');
  t.eq(s.dissolved.statement.how, 'silence', 'and the statement remembers nobody was in the room');
  const w0 = s.week;
  const kept = KP.advanceWeek(s);
  t.ok(s.week === w0 && kept.length === 0, 'the week does not move until a door is chosen');
}

// ---- the dissolution: the company closes ON THE RECORD -----------------------
{
  const s = legacy('ls-dissolve');
  for (let w = 0; w < 6; w++) KP.advanceWeek(s);
  const g = s.groups[0];
  const co = s.company.short;
  // the exits that exist: a student, a soldier, a project member, the rest to the market
  const kid = s.people[s.roster.find(id => s.people[id].status === 'trainee')];
  kid.schoolId = s.schools[0].id; kid.age = 17;
  const soldier = s.people[s.roster.filter(id => s.people[id].status === 'trainee')[1]];
  soldier.flags.military = { since: s.week - 10, until: s.week + 30 };
  const onShow = s.people[s.roster.filter(id => s.people[id].status === 'trainee')[2]];
  const house = s.rivals[0];
  onShow.flags.onProject = { house: house.short };
  const idol = s.people[g.members[0]];
  s.awardHistory = (s.awardHistory || []).concat([{ year: 1, category: 'bonsang', isPlayer: true, name: g.name }]);
  s.financing = { reputation: 2, burned: true, board: { until: s.week + 50, fund: 'Seongsu Capital' }, debt: 30 };
  KP.openClaim(s, { type: 'comebackPromise', subject: { kind: 'exec' }, groupId: g.id, byWeek: s.week + 30 });
  s.seats = KP.staffSeats(s);
  const seatNames = Object.values(s.seats).map(x => x.name);
  const peopleBefore = Object.keys(s.people).length;
  const r = KP.dissolveLabel(s, 'read');
  t.ok(r.ok && KP.chapterPending(s), 'the label dissolves on the record');
  const st = s.dissolved.statement;
  t.ok(st.name && st.short === co && st.debuts === 1 && st.releases === 3 && st.bestScene === 1 && st.bonsangs === 1, 'the statement is the ledger: debuts, records, the peak, the hardware (' + JSON.stringify([st.debuts, st.releases, st.bestScene, st.bonsangs]) + ')');
  t.ok(s.roster.length === 0 && s.groups.length === 0, 'the roster and the lineups are gone');
  t.eq(Object.keys(s.people).length >= peopleBefore - 30, true, 'the files are forever (only the private leads vanish)');
  t.ok(kid.status === 'student' && kid.schoolId === s.schools[0].id && (kid.chapters || []).some(ch => ch.kind === 'enrolled') && kid.releasedFrom === co, 'the student returned to her school, with the chapter');
  t.ok(soldier.status === 'released' && soldier.serviceDone && !soldier.flags.military && soldier.reentryAt === s.week + 30, 'the soldier finishes the service with no letterhead — the board sees him at discharge');
  t.ok(onShow.status === 'rival' && onShow.company === house.short, 'the project member goes with the show');
  t.ok(idol.status === 'released' && !idol.contract && idol.flags.wasOurs && (idol.chapters || []).some(ch => ch.kind === 'released' && ch.how === 'folded'), 'the idol is on the open market with real history — the contract void, the chapter written');
  t.ok(KP.chapterLine(s, { kind: 'released', co, how: 'folded' }) === 'Lost ' + co + ' when it folded', 'the chapter reads in words');
  t.eq(st.went.academy, 1, 'one to the academies'); t.eq(st.went.project, 1, 'one with the show'); t.eq(st.went.service, 1, 'one after the service');
  t.ok(st.went.market === s.roster.length + Object.values(s.people).filter(p => p.status === 'released' && p.releasedFrom === co && p.releasedWeek === s.week).length - 0 && st.went.market >= 6, 'the rest to the market (' + st.went.market + ')');
  const dead = s.estate.folded[0];
  t.ok(dead.short === co && dead.acts.length === 1 && dead.acts[0].name === g.name && dead.acts[0].releases.length === 3, 'the shelf keeps the act and its songs');
  t.ok(s.claims.every(c => c.resolved === 'void') && s.scenes.length === 0, 'the promises settle void; the desk is clear');
  t.ok(!s.seats && st.seats.length === seatNames.length && st.seats.every(x => seatNames.includes(x.name) && x.where), 'the chairs took the calls — each to a named house');
  t.ok(s.financing.burned === true && s.financing.reputation === 2 && !s.financing.board && !s.financing.debt, 'the estate settled: the funds keep their ledger, the running paper dies');
  t.ok(s.budget === 0 && !s.distributor && s.red.weeks === 0 && s.red.arrears === 0, 'no money, no distributor, the count reset');
  t.ok(s.scar && s.scar.co === co && s.scar.count === 1, 'the founder scar');
  t.ok(s.inbox[0].ind === 'dissolution' && KP.notePriority(s.inbox[0]) >= 3 && /dissolved on the record/.test(s.inbox[0].text), 'the obituary reads first, critical');
  t.ok(s.chart.entries.every(e => !e.isPlayer) && s.memory.every(n => n.subjectType !== 'company'), 'the chart and the memory forget whose it was');
  t.ok(KP.validateState(s).length === 0, 'the dissolved state validates');
  // the roundtrip holds the pending state
  const back = KP.deserialize(KP.serialize(s));
  t.ok(KP.chapterPending(back) && back.dissolved.statement.short === co, 'a dissolved save reloads at the epilogue');
}

// ---- the doors: what the career earned ----------------------------------------
{
  const s = legacy('ls-doors');
  for (let w = 0; w < 6; w++) KP.advanceWeek(s);
  s.financing = { reputation: 1 };
  KP.dissolveLabel(s, 'read');
  let doors = KP.chapterDoors(s);
  t.eq(doors.map(d => d.id).join(), 'salaried,investor,protege,blank', 'four doors, in one order');
  t.ok(doors[0].open, 'a charted act opens the salaried chapter');
  t.ok(doors[1].open, 'a kept covenant opens the investor’s call');
  t.ok(!doors[2].open && /remembers you warmly|got big enough/.test(doors[2].reason), 'nobody you built is big enough yet — the reason in words');
  t.ok(doors[3].open, 'the blank page is always a door');
  s.financing.burned = true;
  doors = KP.chapterDoors(s);
  t.ok(!doors[1].open && /clawback/.test(doors[1].reason), 'a burned name does not get the second call');
  // the protégé: a warm ledger, big on the other side of the wall
  const riv = s.rivals.find(r => (r.acts || []).some(a => !a.retired));
  const act = riv.acts.find(a => !a.retired);
  const pro = s.people[act.members[0]];
  pro.flags.wasOurs = 1; pro.directed = [{ week: 1, kind: 'promiseKept', w: 3 }, { week: 2, kind: 'promiseKept', w: 3 }];
  act.popularity = R.DOORS.protege.popAt + 5;
  doors = KP.chapterDoors(s);
  t.ok(doors[2].open && doors[2].personId === pro.id && doors[2].host === riv.short, 'a specific person with a specific bond history brings you in');
  pro.directed.push({ week: 3, kind: 'promiseBroken', w: -3 });
  pro.directed.push({ week: 4, kind: 'promiseBroken', w: -3 });
  t.ok(!KP.chapterDoors(s)[2].open, 'broken promises close her door — the grudge counts double');
  pro.directed.length = 2;
  // a closed door refuses; a taken name refuses
  t.ok(!KP.nextChapter(s, 'investor').ok, 'a locked door does not open');
  t.ok(/already on a building/.test(KP.nextChapter(s, 'blank', { companyName: riv.name }).reason), 'a name on a building is taken');
  t.ok(/obituary/.test(KP.nextChapter(s, 'blank', { companyName: s.dissolved.name }).reason), 'and so is the one on the obituary');
}

// ---- the protégé's door, the investor's call, the salaried chapter, the page ----
function deadLegacy(seed, prep) {
  const s = legacy(seed);
  for (let w = 0; w < 6; w++) KP.advanceWeek(s);
  if (prep) prep(s);
  KP.dissolveLabel(s, 'read');
  return s;
}
{
  const s = deadLegacy('ls-protege', x => {
    const riv = x.rivals.find(r => (r.acts || []).some(a => !a.retired));
    const act = riv.acts.find(a => !a.retired);
    const pro = x.people[act.members[0]];
    pro.flags.wasOurs = 1; pro.directed = [{ week: 1, kind: 'promiseKept', w: 3 }, { week: 2, kind: 'promiseKept', w: 3 }];
    act.popularity = 60;
  });
  const d = KP.chapterDoors(s)[2];
  const host = s.rivals.find(r => r.short === d.host);
  const floorBefore = KP.rivalFloor(s, host).length;
  const r = KP.nextChapter(s, 'protege', { companyName: 'Reunion Room' });
  t.ok(r.ok && s.company.name === 'Reunion Room' && s.host && s.host.company === host.short && s.host.personId === d.personId, 'the imprint opens under the host’s roof');
  t.eq(s.roster.length, Math.min(R.DOORS.protege.loaned, floorBefore), 'two of their bench walk in with you');
  t.ok(s.roster.every(id => s.people[id].status === 'trainee' && (s.people[id].chapters || []).some(ch => ch.kind === 'signed' && ch.how === 'hosted')), 'as trainees, through the host’s door, on the record');
  t.eq(KP.rivalFloor(s, host).length, floorBefore - s.roster.length, 'and off the host’s floor');
  t.ok((s.people[d.personId].directed || []).some(x => x.kind === 'promiseKept' && x.week === s.week), 'her door is answered on her ledger');
  t.ok(s.budget === R.DOORS.protege.chest && s.founded && s.founded.door === 'protege' && !KP.chapterPending(s), 'the chest, the founding, the week free to move');
  const w0 = s.week; KP.advanceWeek(s);
  t.ok(s.week === w0 + 1 && KP.validateState(s).length === 0, 'and it moves');
}
{
  const s = deadLegacy('ls-investor', x => { x.financing = { reputation: 1 }; });
  const led0 = KP.financeLedger(s).taken;
  const r = KP.nextChapter(s, 'investor', { companyName: 'Second Wind' });
  const f = s.financing;
  t.ok(r.ok && s.budget === R.DOORS.investor.chest && (f.board || f.revShare), 'the money arrives with a hand attached from week one');
  t.ok(KP.financeLedger(s).taken === led0 + 1 && (f.board ? f.board.until === s.week + KP.C.FINANCE.boardWeeks : f.revShare.until === s.week + KP.C.FINANCE.revShareWeeks), 'ledgered, on the fund’s own horizon');
  t.ok(f.reputation === 1 && s.founded && s.founded.from === s.dissolved.short, 'the kept covenants follow you; the founding remembers the obituary');
  t.ok(/already walked through this door/.test(KP.foundingEligible(s).reasons[0] || ''), 'the founding door is closed — this IS your own label');
  t.ok(s.inbox.some(n => n.ind === 'financeTaken') && s.inbox[0].ind === 'chapterDoor' && KP.notePriority(s.inbox[0]) >= 3, 'the wire and the door are on the record');
}
{
  const s = deadLegacy('ls-salaried', x => { x.awardHistory = [{ year: 1, category: 'bonsang', isPlayer: true }]; });
  const exec0 = s.executive.name;
  const honors0 = KP.careerHonors(s).bonsangs;
  const r = KP.nextChapter(s, 'salaried');
  t.ok(r.ok && s.company.name && s.company.short !== s.dissolved.short, 'another label hires you: a generated name on the building');
  t.ok(s.roster.length === R.DOORS.salaried.trainees + 4 && s.groups.length === 1 && s.groups[0].debuted && s.groups[0].legacy && s.groups[0].members.length === 4, 'their people: the trainees and an aging act');
  t.ok(s.groups[0].releases.length === 2 && s.groups[0].releases.every(rel => rel.craft != null) && s.groups[0].rooms, 'with records that carry the two verdicts, and a dorm');
  t.ok(s.budget === R.DOORS.salaried.budget && s.trust === R.DOORS.salaried.trust && s.signingsAllowed === R.DOORS.salaried.signings && !s.founded, 'their money, a stranger’s trust, a short leash — nobody’s founder');
  t.ok(s.executive.name !== exec0 && s.executive.since === s.week, 'their exec');
  t.eq(KP.careerHonors(s).bonsangs, honors0, 'the career’s honors survive the company');
  t.ok(!KP.foundingEligible(s).reasons.some(x => /already walked/.test(x)), 'and the founding door can open again from here');
  t.ok((s.career || []).length === 1 && s.career[0].door === 'salaried' && s.career[0].from === s.dissolved.short, 'what follows you: the career keeps the chapter');
  const seatNames = Object.values(KP.staffSeats(s)).map(x => x.name);
  t.ok(seatNames.length >= 4 && seatNames.every(n => /^(Coach|Director|Scout) /.test(n)), 'a new building’s chairs (' + seatNames.join(', ') + ')');
  for (let w = 0; w < 12; w++) KP.advanceWeek(s);
  t.ok(KP.validateState(s).length === 0 && s.groups[0].manager, 'the salaried label runs — the act even has a road manager');
}
{
  const s = deadLegacy('ls-blank');
  const prospectsBefore = s.prospects.length;
  const r = KP.nextChapter(s, 'blank', { companyName: 'Paper Again' });
  t.ok(r.ok && s.company.short === 'Paper' && s.budget === R.DOORS.blank.chest && s.roster.length === 0, 'the blank page, again: the name, a smaller seed, empty rooms');
  t.eq(s.prospects.length, prospectsBefore + R.DOORS.blank.board, 'a few leads who know the new name');
  t.ok(s.dissolved.door === 'blank' && s.scar.count === 1 && (s.career || []).length === 1, 'the record keeps the door and the scar');
  for (let w = 0; w < 10; w++) KP.advanceWeek(s);
  t.ok(s.board && s.board.seats.length === 3, 'the founder’s board seats itself again');
}

// ---- the shelf keeps charting; the re-entry clock boards the released ---------
{
  const s = deadLegacy('ls-shelf');
  const dead = s.estate.folded[0];
  const co = dead.short;
  KP.nextChapter(s, 'blank', { companyName: 'After House' });
  const old = KP.C.RED.SHELF.runChance; KP.C.RED.SHELF.runChance = 1;
  KP.advanceWeek(s);
  KP.C.RED.SHELF.runChance = old;
  const entry = s.chart.entries.find(e => e.shelf);
  t.ok(entry && entry.company === co && !entry.isPlayer && dead.runs === 1, 'a dead label’s song charts against you — the shelf’s reverse run');
  t.ok(notesInd('shelfRun'), 'and the note says whose it was');
  t.ok(dead.acts[0].releases.some(rel => rel.revivedWeek === s.week), 'the song is spent on the shelf, like any revival');
  // the released reach the board with their files, in time
  let boarded = false;
  for (let w = 0; w < KP.C.FLOOR.reentryMax + 2 && !boarded; w++) {
    KP.advanceWeek(s);
    boarded = s.prospects.some(id => s.people[id].releasedFrom === co && s.people[id].channel === 'released');
  }
  t.ok(boarded, 'the released board the open market with real history');
}

// ---- the honest moves: sell the shelf, pitch on credit -------------------------
{
  const s = legacy('ls-moves');
  for (let w = 0; w < 4; w++) KP.advanceWeek(s);
  const q = KP.shelfPrice(s);
  t.ok(q.ok && q.tracks === 3 && q.price > 0, 'the shelf has a price (' + q.price + ' for ' + q.tracks + ' records)');
  s.budget = 0; s.red = { weeks: 2, arrears: 30, rung: 1, peak: 2, total: 2, paid: 0, episodes: 1 };
  const pitch = KP.pitchFinancing(s);
  t.ok(pitch.ok && s.red.arrears === 30 + KP.C.FINANCE.pitchCost && s.budget === 0, 'the deck prints on credit while the count runs — the cost joins the arrears');
  const r = KP.sellShelf(s);
  t.ok(r.ok && r.price === q.price && s.budget === q.price, 'sold: the money is on the account today');
  t.ok(s.groups[0].releases.every(rel => rel.sold) && !KP.shelfPrice(s).ok, 'the records are the distributor’s now — there is nothing left to sell');
  KP.advanceWeek(s);
  t.ok(s.red.arrears === 0 && s.red.weeks === 1, 'the sale paid the building first');
  // no shelf on an empty page
  const b = fresh('ls-noshelf');
  t.ok(!KP.shelfPrice(b).ok && !KP.sellShelf(b).ok, 'nothing recorded, nothing to sell');
}

// ---- the chairs take the calls: the poach roll from the creditors' letters -----
{
  const s = legacy('ls-poach');
  for (let w = 0; w < 4; w++) KP.advanceWeek(s);
  KP.staffSeats(s);
  s.scenes = []; s.seatPoachQuiet = 0;
  s.budget = 0; s.red = { weeks: R.creditorsAt, arrears: 5000, rung: 3, peak: R.creditorsAt, total: R.creditorsAt, paid: 0, episodes: 1 };   // deep enough that the legacy act's trickle cannot clear it
  const old = KP.C.HIRES.poachChance; KP.C.HIRES.poachChance = 1 / R.poachMult;
  let sc = null, guard = 0;
  while (!sc && guard++ < 6) { s.scenes = s.scenes.filter(x => x.kind !== 'seatPoach'); s.seatPoachQuiet = 0; KP.advanceWeek(s); sc = (s.scenes || []).find(x => x.kind === 'seatPoach' && x.seatId); }
  KP.C.HIRES.poachChance = old;
  t.ok(sc && KP.staffSeats(s)[sc.seatId] && KP.staffSeats(s)[sc.seatId].tier === 'working', 'a working-tier chair gets the call once the creditors write — the tier gate drops and the roll triples');
}

// ---- an old save: the counter heals lazily, nothing migrates -------------------
{
  const s = legacy('ls-old');
  for (let w = 0; w < 5; w++) KP.advanceWeek(s);
  const json = JSON.parse(KP.serialize(s));
  json.version = '0.10.43';
  delete json.red;
  const m = KP.deserialize(JSON.stringify(json));
  t.ok(!m.red || m.red.weeks === 0, 'a pre-0.11.0 save opens clean');
  for (let w = 0; w < 6; w++) KP.advanceWeek(m);
  t.ok(m.red && m.red.weeks === 0 && m.red.arrears === 0 && KP.validateState(m).length === 0, 'and runs — a solvent house never reads red');
}

// ---- determinism: a fork through a death and a rebirth -----------------------
{
  const a = fresh('ls-fork');
  a.budget = 0;
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 20; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.ok(KP.chapterPending(a) && KP.chapterPending(b), 'both forks die on the same week');
  KP.nextChapter(a, 'blank', { companyName: 'Fork House' });
  KP.nextChapter(b, 'blank', { companyName: 'Fork House' });
  for (let w = 0; w < 40; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'and the second chapter forks clean');
}

t.finish();
