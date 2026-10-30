/* Suite 100 — the file (v0.10.33, §90 Phase C).
   Every person carries structured chapters — where she has been, as
   kinds and references, never prose — stamped at every door and
   transition and read back by one renderer. The collapse's signing
   class lands on the one open board through the castoff's door, priced
   by the career; a retired rival act lets its people go on instead of
   sitting in the save forever; old saves derive their chapters once. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_100_file');

const WPY = KP.C.WEEKS_PER_YEAR;
function ride(state, weeks) { for (let w = 0; w < weeks; w++) KP.advanceWeek(state); }
function kinds(p) { return (p.chapters || []).map(ch => ch.kind); }
function last(p) { return (p.chapters || [])[(p.chapters || []).length - 1] || {}; }
function clean(s) { return typeof s === 'string' && s.length > 0 && !/undefined|null|\[object|NaN/.test(s); }
function starvedWorld(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  state.budget = 2000;
  state.signingsAllowed = 9;
  const I = KP.C.INDUSTRY;
  const rng = KP.rngFor(state);
  const starved = { name: 'Starved Ent.', short: 'Starved', philosophy: 'patient', blurb: 't', prestige: 5,
    nextDebutWeek: 9999, interest: {}, acts: [], recentMoves: [] };
  state.rivals.push(starved);
  for (let i = 0; i < 6; i++) KP.mintRivalTrainee(state, rng, starved, { signedWeek: state.week - 30 });
  // an act with a public: the careers the class is made of
  const members = [];
  for (let i = 0; i < 4; i++) {
    const p = KP.mintRivalTrainee(state, rng, starved, { signedWeek: state.week - 200, age: 24 });
    p.talents.vocals.cur = 80 + i; members.push(p.id);
  }
  // a concluded act — a house with a live act cannot starve, and the old
  // save's ghosts (members of a retired act, status rival) are the point
  const act = { id: 'starved-act', name: 'LASTLIGHT', members, popularity: 30, debutWeek: state.week - 120, releases: [], gender: 'f',
    retired: true, retiredWeek: state.week - 40 };
  starved.acts.push(act);
  state.rngState = rng.state();
  const ids = Object.values(state.people).filter(p => p.company === 'Starved').map(p => p.id);
  const oldC = I.collapseChance; I.collapseChance = 1;
  const rng2 = KP.rngFor(state);
  const notes = KP.industryLifecycle(state, rng2) || [];
  I.collapseChance = oldC;
  state.rngState = rng2.state();
  return { state, starved, act, ids, notes };
}

// ---- every opening person has a door, and the strip opens with it ---------
[true, false].forEach(legacy => {
  const state = KP.newGame('fi-open-' + legacy, null, { legacy });
  const people = state.roster.concat(state.prospects).map(id => state.people[id]);
  t.ok(people.length > 5, 'a building full of people (legacy ' + legacy + ')');
  t.ok(people.every(p => p.born && p.born.door && p.born.city), 'everyone came through a door');
  t.ok(state.roster.every(id => state.people[id].born.door === 'inherited'), 'the roster was inherited with the building');
  t.ok(state.prospects.every(id => state.people[id].born.door === 'opening'), 'the board was there on day one');
  people.forEach(p => {
    const chs = KP.chaptersOf(state, p);
    t.ok(chs.length >= 1 && chs[0].kind === 'born', KP.displayName(p) + '’s strip opens with where she is from');
    const line = KP.chapterLine(state, chs[0]);
    t.ok(clean(line) && /^From /.test(line), 'and it reads (' + line + ')');
    t.ok(clean(KP.fromLine(state, p)), 'the card’s from-line reads');
  });
});

// ---- every chapter kind reads, no holes ------------------------------------
{
  const state = KP.newGame('fi-lines', null, { legacy: false });
  const school = (state.schools || [])[0];
  const doors = ['rivalDoor', 'academy', 'application', 'referral', 'street', 'audition', 'social', 'auditionAbroad', 'abroad', 'founding', 'inherited', 'opening', 'legacy', 'castoff'];
  doors.forEach(door => {
    const ch = { kind: 'born', door, city: 'busan', week: 1, firstCompany: 'RIV', schoolId: door === 'academy' && school ? school.id : undefined };
    const line = KP.chapterLine(state, ch);
    t.ok(clean(line) && /^From Busan/.test(line), 'born via ' + door + ' reads (' + line + ')');
  });
  t.ok(/walked into RIV’s door/.test(KP.chapterLine(state, { kind: 'born', door: 'rivalDoor', city: 'seoul', firstCompany: 'RIV' })), 'a rival door names the house');
  if (school) t.ok(KP.chapterLine(state, { kind: 'born', door: 'academy', city: school.cityId, schoolId: school.id }).includes(school.name), 'an academy door names the school');
  t.ok(/arrived from abroad/.test(KP.chapterLine(state, { kind: 'born', door: 'abroad', city: 'jp' })), 'abroad reads a region');
  const samples = [
    { kind: 'enrolled', school: 'Haneul Academy' },
    { kind: 'signed', co: 'HCG' }, { kind: 'signed', co: 'RIV', how: 'board' }, { kind: 'signed', co: 'RIV', how: 'window' },
    { kind: 'signed', co: 'RIV', how: 'late' }, { kind: 'signed', co: 'RIV', how: 'market' }, { kind: 'signed', co: 'HCG', how: 'back' },
    { kind: 'cut', co: 'RIV' },
    { kind: 'released', co: 'HCG', how: 'released' }, { kind: 'released', co: 'HCG', how: 'quit' }, { kind: 'released', co: 'HCG', how: 'scandal' },
    { kind: 'released', co: 'HCG', how: 'promise' }, { kind: 'released', co: 'HCG', how: 'silence' }, { kind: 'released', co: 'HCG', how: 'farewell' },
    { kind: 'reentry' }, { kind: 'debut', group: 'LINE' },
    { kind: 'seasonSent', show: 'Debut Mission' }, { kind: 'seasonOut', show: 'Debut Mission', weekNo: 4 }, { kind: 'seasonFinalist', show: 'Debut Mission' },
    { kind: 'seasonLineup', show: 'Debut Mission', act: 'ONE&ALL', permanent: true }, { kind: 'seasonLineup', show: 'Debut Mission', act: 'ONE&ALL', permanent: false },
    { kind: 'projectEnd', act: 'ONE&ALL', co: 'HCG' }, { kind: 'projectEnd', act: 'ONE&ALL', co: null },
    { kind: 'kept', show: 'Debut Mission', co: 'DM' },
    { kind: 'departed', co: 'HCG', group: 'LINE', mode: 'warm' }, { kind: 'departed', co: 'HCG', group: null, mode: 'cold' },
    { kind: 'graduated', group: 'LINE' }, { kind: 'enlisted' }, { kind: 'discharged' },
    { kind: 'home', why: 'Went home' }, { kind: 'home' }, { kind: 'stayed', co: 'OLD' }, { kind: 'market', co: 'Starved' },
  ];
  samples.forEach(ch => {
    const line = KP.chapterLine(state, Object.assign({ week: 5 }, ch));
    t.ok(clean(line), ch.kind + (ch.how ? '/' + ch.how : '') + ' reads (' + line + ')');
  });
  t.eq(KP.chapterWhen(-40), 'before you', 'a stamp older than the job says so');
  t.ok(/Y1/.test(KP.chapterWhen(3)), 'a week in the job reads as a week');
}

// ---- the player's doors stamp: signed, released, back on the board ---------
{
  const state = KP.newGame('fi-ours', null, { legacy: false });
  state.budget = 2000; state.signingsAllowed = 9;
  let her = null;
  for (const id of state.prospects.slice()) {
    const r = KP.signProspect(state, id, { answer: 'accept' });
    if (r.ok) { her = state.people[id]; break; }
  }
  t.ok(her, 'somebody signed');
  t.eq(last(her).kind, 'signed', 'the signing is a chapter');
  t.eq(last(her).co, state.company.short, 'in this building’s name');
  t.ok(!('how' in last(her)), 'a plain signing carries no manner');
  const n0 = her.chapters.length;
  KP.releaseTrainee(state, her.id);
  t.eq(her.status, 'released', 'released');
  t.eq(last(her).kind, 'released', 'the release is a chapter');
  t.eq(last(her).how, 'released', 'and says it was your call');
  t.eq(last(her).co, state.company.short, 'from here');
  t.eq(her.chapters.length, n0 + 1, 'one chapter per door');
  let guard = 0;
  while (!kinds(her).includes('reentry') && guard++ < 40 && state.people[her.id]) KP.advanceWeek(state);
  t.ok(kinds(her).includes('reentry'), 'the way back is a chapter');
  const idx = kinds(her).indexOf('reentry');
  t.ok(idx > 0 && kinds(her)[idx - 1] === 'released', 'in order');
  t.ok(/Back on the open board/.test(KP.chapterLine(state, her.chapters[idx])), 'and reads');
  t.ok(/Released from|open board/.test(KP.fromLine(state, her)), 'the card leads with the last thing that happened (' + KP.fromLine(state, her) + ')');
}

// ---- the rival's doors stamp: born, cut, signed by manner ------------------
{
  const state = KP.newGame('fi-rival', null, { legacy: false });
  const rng = KP.rngFor(state);
  const r0 = state.rivals[0], r1 = state.rivals[1];
  const p = KP.mintRivalTrainee(state, rng, r0, { signedWeek: state.week - 80 });
  t.eq(p.born.door, 'rivalDoor', 'born through the rival door');
  t.ok(KP.chapterLine(state, KP.chaptersOf(state, p)[0]).includes(r0.short), 'the first house is in the first line');
  KP.cutFromFloor(state, rng, r0, p);
  state.rngState = rng.state();
  t.eq(last(p).kind, 'cut', 'the cut is a chapter');
  t.eq(last(p).co, r0.short, 'at the house that cut her');
  if (p.status !== 'prospect') { p.status = 'prospect'; state.prospects.push(p.id); }
  KP.rivalSignFromBoard(state, r1, p, 'window');
  t.eq(last(p).kind, 'signed', 'the signing is a chapter');
  t.eq(last(p).how, 'window', 'with its manner');
  t.ok(p.history.some(h => /after the open window closed/.test(h.text)), 'and the prose follows the key');
  KP.rivalSignFromBoard(state, r0, p, 'not-a-key');
  t.eq(last(p).how, 'board', 'an unknown manner reads as off the board');
  t.ok(p.history.some(h => /off our board/.test(h.text)), 'in prose too');
  t.ok(KP.chaptersOf(state, p).every(ch => clean(KP.chapterLine(state, ch))), 'the whole strip reads');
}

// ---- the collapse's class lands on the ONE board, priced by the career ----
{
  const { state, starved, act, ids, notes } = starvedWorld('fi-collapse');
  const RF = KP.C.RISEFALL;
  t.ok(!state.rivals.includes(starved), 'the starved house folded');
  t.ok(notes.some(n => n.ind === 'signingClass'), 'the wire names the class');
  t.eq(state.freeAgents, undefined, 'there is no second list');
  const cls = ids.map(id => state.people[id]).filter(p => p && p.channel === 'freeAgent');
  t.ok(cls.length >= 1 && cls.length <= RF.freeAgentMax, 'the class is on the board (' + cls.length + ')');
  cls.forEach(p => {
    t.eq(p.status, 'prospect', KP.displayName(p) + ' is a prospect');
    t.ok(state.prospects.includes(p.id), 'on the open board');
    t.eq(p.castoffUntil, state.week + RF.freeAgentWindow, 'with the career’s window');
    t.eq(p.castoffFrom, 'Starved', 'and the first house on the file');
    t.ok(p.company == null, 'no letterhead');
    t.ok(/a career/.test(p.source), 'the board says what she is');
    t.eq(last(p).kind, 'market', 'the collapse is a chapter');
    t.ok(KP.signCost(state, p) >= RF.faCostBase, 'priced like a career (' + KP.signCost(state, p) + ')');
    t.eq(KP.freeAgentCost(state, p), KP.signCost(state, p), 'one price');
  });
  t.ok(cls.some(p => act.members.includes(p.id)), 'the act’s members made the class');
  t.ok(act.retired && act.retiredWeek === state.week - 40, 'the act stays concluded, on its own date');
  t.ok(ids.every(id => !state.people[id] || state.people[id].company !== 'Starved'), 'nobody carries the dead letterhead');
  act.members.forEach(id => {
    const p = state.people[id];
    t.ok(!p || p.status === 'prospect' || p.status === 'gone' || p.status === 'released', 'a member went on: ' + (p ? p.status : 'forgotten'));
  });
  t.ok(ids.some(id => state.people[id] && state.people[id].channel === 'castoff' || state.people[id] && state.people[id].status === 'released'),
    'the rest of the room took the castoff’s door');

  // the heir's money reprices every market file while the tap is open
  const her = cls[0];
  const cost0 = KP.signCost(state, her);
  const plain = state.prospects.map(id => state.people[id]).find(p => !KP.isMarketFile(p));
  const plain0 = plain ? KP.signCost(state, plain) : null;
  state.rivals[0].bankroll = { until: state.week + 10 };
  t.eq(KP.signCost(state, her), Math.round(cost0 * KP.C.SAGA.HEIR.faInflate), 'the heir inflates the market lane');
  if (plain) t.eq(KP.signCost(state, plain), plain0, 'and leaves the ordinary board alone');
  delete state.rivals[0].bankroll;
  t.eq(KP.signCost(state, her), cost0, 'the tap closes, the price drifts back');

  // the player verb: a career walks in the door through signProspect
  const budget0 = state.budget;
  let signed = null, paid = 0;
  for (const p of cls) {
    const c = KP.signCost(state, p);
    const r = KP.signProspect(state, p.id, { answer: 'accept' });
    if (r.ok) { signed = p; paid = c; break; }
  }
  t.ok(signed, 'one of them signed');
  t.ok(budget0 - state.budget >= paid, 'a career has a price (' + (budget0 - state.budget) + ')');
  t.eq(signed.status, 'trainee', 'in OUR building now');
  t.ok(state.roster.includes(signed.id) && !state.prospects.includes(signed.id), 'off the board, on the roster');
  t.eq(signed.flags.veteran, 'Starved', 'the file remembers the first house');
  t.ok(signed.traineeContract, 'papered on arrival');
  t.eq(signed.castoffUntil, undefined, 'the window is spent');
  t.eq(last(signed).kind, 'signed', 'the signing is a chapter');
  t.eq(last(signed).how, 'market', 'off the market');
  t.eq((state.riseFallLedger || {}).faSigned, 1, 'ledgered');
  t.ok(state.inbox.some(n => n.ind === 'faSigned' && n.personId === signed.id), 'the public has a verdict');

  // the window closes on the board's clock — another pen, or home
  const rest = cls.filter(p => p !== signed && state.people[p.id] && p.status === 'prospect');
  rest.forEach(p => { p.castoffUntil = state.week; });
  KP.advanceWeek(state);
  rest.forEach(p => {
    t.ok(!state.prospects.includes(p.id), KP.displayName(p) + ' left the board');
    const q = state.people[p.id];
    t.ok(!q || q.status !== 'prospect', 'another company’s pen, or home (' + (q ? q.status : 'forgotten') + ')');
    if (q && q.status === 'rival') t.ok(q.company && q.company !== 'Starved' && last(q).kind === 'signed', 'a real signing, on the file');
  });
}

// ---- the retired act lets its people go on ----------------------------------
{
  const state = KP.newGame('fi-retire', null, { legacy: false });
  const rng = KP.rngFor(state);
  const r0 = state.rivals[0];
  const a = KP.mintRivalTrainee(state, rng, r0, { signedWeek: state.week - 300, age: 25 });
  const b = KP.mintRivalTrainee(state, rng, r0, { signedWeek: state.week - 300, age: 25 });
  const c = KP.mintRivalTrainee(state, rng, r0, { signedWeek: state.week - 300, age: 25 });
  state.rngState = rng.state();
  a.flags.readByUs = 1;   // this desk once read her file
  const ours = state.people[state.roster[0]];
  ours.flags.onProject = { until: state.week + 10, house: r0.short };
  const act = { id: 'r0-act', name: 'FIVESTAR', members: [a.id, b.id, c.id, ours.id], popularity: 20, debutWeek: state.week - 250, releases: [] };
  r0.acts.push(act);
  const led0 = Object.assign({}, state.floorLedger || {});
  const people0 = Object.keys(state.people).length;
  KP.retireAct(state, r0, act, 'FIVESTAR concluded');
  t.ok(act.retired && act.retiredWeek === state.week, 'the act is retired, dated');
  t.eq(a.status, 'gone', 'the one with a chapter here goes home, on the record');
  t.ok(a.company == null, 'no letterhead');
  t.eq(last(a).kind, 'home', 'home is a chapter');
  t.ok(/FIVESTAR concluded/.test(last(a).why), 'with the reason');
  t.ok(!state.people[b.id] && !state.people[c.id], 'the ones nobody here ever knew are forgotten');
  t.eq(ours.status, 'trainee', 'ours is untouched');
  t.ok(state.roster.includes(ours.id), 'and still on the roster');
  t.eq(Object.keys(state.people).length, people0 - 2, 'the save sheds exactly the forgotten');
  t.eq((state.floorLedger.home || 0) - (led0.home || 0), 1, 'ledgered: home');
  t.eq((state.floorLedger.forgotten || 0) - (led0.forgotten || 0), 2, 'ledgered: forgotten');
  t.ok(act.members.length === 4, 'the act’s record keeps its names');
}

// ---- the save sink: a world that retires acts does not keep their ghosts ----
{
  const state = KP.newGame('fi-sink', null, { legacy: false });
  ride(state, WPY * 3);
  const ghosts = Object.values(state.people).filter(p => p.status === 'rival' &&
    (state.rivals || []).some(r => r.short === p.company && (r.acts || []).some(a => a.retired && (a.members || []).includes(p.id)) &&
      !(r.acts || []).some(a => !a.retired && (a.members || []).includes(p.id))));
  t.eq(ghosts.length, 0, 'no rival sits in a retired act with the old letterhead (' + ghosts.length + ')');
  const houses = (state.rivals || []).filter(r => r.projectHouse).map(r => r.short);
  const housed = Object.values(state.people).filter(p => p.status === 'rival' && houses.includes(p.company) &&
    !(state.rivals || []).some(r => r.short === p.company && (r.acts || []).some(a => !a.retired && (a.members || []).includes(p.id))));
  t.eq(housed.length, 0, 'the broadcaster’s label holds nobody outside a live lineup (' + housed.length + ')');
  t.ok(KP.signingHouses(state).every(r => !r.projectHouse), 'and never signs off the market');
}

// ---- the season writes chapters: sent, out, finalist, lineup, the end ------
{
  const S = KP.C.COMPETITION;
  const state = KP.newGame('fi-season', null, { legacy: true });
  state.budget = 2000;
  const oldShare = S.boyShowShare, oldPerm = S.permanentChance;
  S.boyShowShare = 0; S.permanentChance = 0;
  KP.freeTrainees(state).map(id => state.people[id]).forEach(p => { p.gender = 'f'; p.age = 18; });
  let guard = 0;
  while (((state.week) % WPY) + 1 !== S.castWoy && guard++ < WPY + 2) KP.advanceWeek(state);
  KP.advanceWeek(state);
  const s = state.season;
  t.ok(s && s.status === 'casting', 'a season is casting');
  const sc = (state.scenes || []).find(x => x.kind === 'seasonInvite');
  const r = KP.resolveScene(state, sc.id, 'two');
  t.ok(r.ok, 'two of ours went');
  s.ours.forEach(id => t.eq(last(state.people[id]).kind, 'seasonSent', KP.displayName(state.people[id]) + ' has the season on the file'));
  guard = 0;
  while (s.status !== 'done' && guard++ < 30) KP.advanceWeek(state);
  t.eq(s.status, 'done', 'the finale aired');
  const results = { seasonOut: 0, seasonFinalist: 0, seasonLineup: 0 };
  s.contestants.forEach(c => {
    const p = state.people[c.personId];
    if (!p) return;
    const k = last(p).kind;
    if (k in results) results[k]++;
    else if (k === 'kept' || k === 'home' || k === 'signed' || k === 'cut' || k === 'released') results[last(p).kind] = (results[last(p).kind] || 0) + 1;
  });
  t.ok(results.seasonOut >= 1 && results.seasonFinalist >= 1 && results.seasonLineup >= 1,
    'every result is a chapter (' + JSON.stringify(results) + ')');
  const house = state.rivals.find(x => x.projectHouse);
  const act = house && house.acts[house.acts.length - 1];
  t.ok(act && !act.retired, 'the lineup is an act');
  act.members.forEach(id => {
    const p = state.people[id];
    const ch = (p.chapters || []).find(x => x.kind === 'seasonLineup');
    t.ok(ch && ch.act === act.name && ch.permanent === false, KP.displayName(p) + '’s lineup chapter names the act and the term');
  });
  s.contestants.forEach(c => {
    const p = state.people[c.personId];
    if (p) t.ok(KP.chaptersOf(state, p).every(ch => clean(KP.chapterLine(state, ch))), KP.displayName(p) + '’s strip reads');
  });
  // the term's end: the project concludes, and the chapter says where she went
  guard = 0;
  while (!act.retired && guard++ < S.termWeeks + 4) KP.advanceWeek(state);
  t.ok(act.retired, 'the project term ran out');
  act.members.forEach(id => {
    const p = state.people[id];
    if (!p) { t.ok(true, 'a member with no home went on'); return; }
    const ch = (p.chapters || []).find(x => x.kind === 'projectEnd');
    t.ok(ch && ch.act === act.name, KP.displayName(p) + '’s file closes the project (' + (p.status) + ')');
    t.ok(p.company !== house.short, 'and she is not the broadcaster’s anymore');
  });
  S.boyShowShare = oldShare; S.permanentChance = oldPerm;
}

// ---- the migration derives the file once, and boards the old lane ---------
{
  const state = KP.newGame('fi-mig', null, { legacy: false });
  const p = state.people[state.roster[0]];
  const q = state.people[state.roster[1]];
  const qChapters = (q.chapters || []).length;
  delete p.chapters; delete p.born;
  p.history = [
    { week: 1, text: 'Signed to ' + state.company.short + ' (Vocal academy).' },
    { week: 20, text: 'Debuted with NIGHTLINE — “First Light”.' },
    { week: 30, text: 'Sent to the Debut Mission season by ' + state.company.short + '. The cameras start Monday.' },
    { week: 34, text: 'Eliminated from Debut Mission in week 4, on national television. The public learned the name on the way out.' },
    { week: 90, text: 'Enlisted for mandatory service. The fandom started the countdown.' },
    { week: 170, text: 'Discharged after 80 weeks. The countdown ended.' },
    { week: 171, text: 'A rainy Tuesday. Nothing in particular happened.' },
  ];
  const r0 = state.rivals[0];
  const rng = KP.rngFor(state);
  const fa = KP.mintRivalTrainee(state, rng, r0, { signedWeek: state.week - 100, age: 24 });
  state.rngState = rng.state();
  state.freeAgents = [{ personId: fa.id, until: state.week + 5, from: 'Folded' }];
  fa.flags.freeAgent = 'Folded';
  state.version = '0.10.32';
  KP.migrate(state);
  t.eq(kinds(p).join(','), 'signed,debut,seasonSent,seasonOut,enlisted,discharged', 'the chapters come out of the history, in order');
  t.eq(p.chapters[0].co, state.company.short, 'the signing names the house');
  t.eq(p.chapters[1].group, 'NIGHTLINE', 'the debut names the group');
  t.eq(p.chapters[3].weekNo, 4, 'the elimination keeps the week');
  t.ok(p.born && p.born.door === 'legacy', 'a file without a door is marked legacy');
  t.eq((q.chapters || []).length, qChapters, 'a file that already has chapters is left alone');
  t.eq(state.freeAgents, undefined, 'the old lane is gone');
  t.eq(fa.status, 'prospect', 'its name is on the board');
  t.eq(fa.channel, 'freeAgent', 'as a career');
  t.eq(fa.castoffUntil, state.week + 5, 'with the window it had left');
  t.eq(fa.castoffFrom, 'Folded', 'and the first house');
  t.ok(state.prospects.includes(fa.id), 'listed');
  t.ok(!fa.flags.freeAgent, 'the old flag is spent');
  // a fresh save is left exactly alone
  const fresh = KP.newGame('fi-mig-2', null, { legacy: true });
  ride(fresh, 6);
  const json = KP.serialize(fresh);
  t.eq(KP.serialize(KP.deserialize(json)), json, 'a current save round-trips byte for byte');
}

// ---- the market world forks clean --------------------------------------------
{
  const a = starvedWorld('fi-fork').state;
  const json = KP.serialize(a);
  const b = KP.deserialize(json);
  ride(a, 14); ride(b, 14);
  t.eq(KP.serialize(a), KP.serialize(b), 'the one market forks clean, class and all');
  t.ok(KP.serialize(a).length < 700000, 'and the save stays a save (' + KP.serialize(a).length + ')');
}

t.finish();
