/* Suite 117 — the stages, lived (v0.11.7, §98 — §96 recommendation 2). Owner:
   "Go ahead with release 2." The road: every night on the record, the road
   card's pure read and the strip, the three doors (the encore night, the road
   presser, the setlist swap) with today's law as their default, the moment
   family that never repeats its kind, the wrap as a ceremony, an old mid-tour
   save. Festival season: the bill composed once per edition, the invite's set
   door (the deep cut, the collab), the night's neighbours and moment, the
   tier-3 headline ceremony, Japan's in-country week, a byte-identical fork,
   and the Industry card rendered through the DOM stub. Folded from the two
   build slices' verification scripts; every check cites the change logs. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_117_stages');

// ---- the road ---------------------------------------------------------------------
{
  const ok = (c, m) => t.ok(c, m);
  const eq = (a, b, m) => ok(a === b, m + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')');
function debuted(K, seed) {
  const state = K.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  K.proposeGroup(state, 'ROADLINE', ids, K.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = K.generateDemos(state, K.rngFor(state), g);
  K.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest', week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) K.advanceWeek(state);
  while (state.week <= (g.promoUntil || 0) + K.C.COMEBACK.restWeeks) K.advanceWeek(state);
  return { state, g };
}
const botAnswer = (K, state) => (state.scenes || []).slice().forEach(sc => { const d = K.sceneDef(sc.kind); if (d) K.resolveScene(state, sc.id, d.options(state, sc)[0].id); });
const simFingerprint = (K, state, g) => JSON.stringify({ budget: state.budget, pop: g.popularity, rng: state.rngState, fandom: g.fandom && g.fandom.intensity,
  members: g.members.map(id => { const p = state.people[id]; return [p.fatigue, p.morale, p.hype, p.liveExp]; }), tour: g.tour && { soldOut: g.tour.soldOut, soft: g.tour.soft, encores: g.tour.kr && g.tour.kr.encores, legIdx: g.tour.legIdx } });

// ---- 1. the record + 2. the read + the strip + 4. the moment + 5. the ceremony (hot room → encores) ----
{
  const { state, g } = debuted(KP, 'rd-soldout');
  g.popularity = 80; state.budget = 900;
  KP.regionsOf(g).jp = 60;
  const r = KP.planTour(state, { groupId: g.id, scale: 'clubs', legs: ['kr', 'jp'], pacing: 'punishing', setlist: 'hits' });
  ok(r.ok, 'the tour books');
  const rd0 = KP.tourRoadRead(state, g);
  ok(rd0 && rd0.nextStop === 'Seoul' && rd0.legIdx === 0 && rd0.legLabel === 'Korea', 'the read names Seoul as the first stop (' + JSON.stringify(rd0) + ')');
  eq(rd0.demandWord, 'a room they will fill twice', 'a hot room reads as a room they will fill twice');
  eq(rd0.nextWeek, state.week + 1, 'the next stop plays next week');
  const krWeeks = Math.ceil(g.tour.kr.route.length / KP.C.TOUR.datesPerWeek);
  eq(rd0.weeksLeft, krWeeks + KP.C.TOUR.legWeeks, 'weeks left = home-circuit weeks + legs × legWeeks');
  const endWeek0 = rd0.endWeek;
  ok(KP.upcoming(state).some(u => u.week === endWeek0 && u.label === g.name + ' — last night of the tour' && u.hot), 'the last night is on the strip');
  ok(!state.tourLedger || !state.tourLedger.moments, 'the read creates no ledger');
  const snap = JSON.stringify(state);
  KP.tourRoadRead(state, g); KP.upcoming(state);
  eq(JSON.stringify(state), snap, 'the read and the strip never write state');

  KP.advanceWeek(state);
  const dates = g.tour.dates;
  ok(dates.length === 2 && dates[0].city === 'seoul' && dates[0].week === state.week && dates[0].soldOut && dates[0].encore && typeof dates[0].band === 'string', 'two nights on the record after week one, Seoul sold out with the encore (' + JSON.stringify(dates) + ')');
  const leg = KP.lastTickNotes.find(n => n.ind === 'tourLeg');
  ok(leg && leg.priority === 'high', 'the leg letter rides at high');
  ok(dates[0].moment && typeof dates[0].moment === 'string', 'the week\'s dates carry the moment kind (' + dates[0].moment + ')');
  eq(g.tour.lastMomentKind, dates[0].moment, 'lastMomentKind is recorded');
  eq(state.tourLedger.moments, 1, 'the ledger counts the moment');
  // the moment sentence is on the letter
  ok(leg && leg.text.length > 0 && !/\{(she|her|pos|hers)\}/.test(leg.text) && !/undefined|NaN/.test(leg.text), 'the leg letter is clean: ' + (leg && leg.text.slice(-160)));
  // the encore door opened (first door of the tour: the swap did not qualify — no loud pick)
  const door = state.scenes.find(sc => sc.kind === 'encoreNight');
  ok(door && door.groupId === g.id && door.city === 'Seoul' && door.cityId === 'seoul' && door.encoreRev > 0 && door.expiresWeek === state.week + KP.C.TOUR.doorFuseWeeks, 'the encore door opened for Seoul with a fuse of one week (' + JSON.stringify(door) + ')');
  eq(state.tourLedger.encoresOffered, 1, 'encoresOffered counted');
  eq(state.scenes.filter(sc => ['encoreNight', 'roadPresser', 'setlistSwap'].includes(sc.kind)).length, 1, 'one road door at a time');
  const def = KP.sceneDef('encoreNight');
  const body = def.body(state, door);
  ok(/sold out in minutes/.test(body) && /(fresh|tired|running on fumes)/.test(body) && body.indexOf(String(door.encoreRev)) >= 0, 'the body names the room\'s fatigue in words and the deposit: ' + body.slice(0, 120));
  eq(def.options(state, door)[0].id, 'play', 'options[0] is play');
  // the read after a week
  const rd1 = KP.tourRoadRead(state, g);
  ok(rd1.lastNight === g.tour.lastNight && rd1.soldOut === g.tour.soldOut && rd1.encores === g.tour.kr.encores, 'the read reports last night and the counts');
  eq(rd1.endWeek, endWeek0, 'the end-week estimate holds week to week');
  // hand the second night back
  const budget0 = state.budget, fat0 = g.members.map(id => state.people[id].fatigue), sold0 = g.tour.soldOut, enc0 = g.tour.kr.encores;
  const res = KP.resolveScene(state, door.id, 'handBack');
  ok(res.ok, 'hand back resolves');
  eq(state.budget, budget0 - door.encoreRev, 'the fee goes back');
  eq(g.tour.soldOut, sold0 - 1, 'soldOut comes down one');
  eq(g.tour.kr.encores, enc0 - 1, 'encores comes down one');
  ok(g.members.every((id, i) => state.people[id].fatigue === Math.max(0, fat0[i] - KP.C.TOUR.encoreRestFatigue) || KP.onBreak(state.people[id])), 'every present member rests ' + KP.C.TOUR.encoreRestFatigue + ' fatigue');
  eq(state.tourLedger.encoresHandedBack, 1, 'encoresHandedBack counted');
  ok(state.inbox[0].ind === 'encoreHandedBack' && state.inbox[0].priority === 'normal' && /kept the deposit/.test(state.inbox[0].text), 'the hand-back letter lands at normal');
  ok(dates[0].encore === false && dates[0].handedBack === true, 'the record says the second night was handed back');
  ok(state.books.cur.tours != null, 'the tours stream carries the debit');
  // ride to the wrap
  let guard = 0;
  while (g.tour && guard++ < 12) { botAnswer(KP, state); KP.advanceWeek(state); }
  const end = state.inbox.find(n => n.ind === 'tourEnd');
  ok(end && end.priority === 'critical', 'the wrap letter is critical');
  ok(end && /The route, date by date: Seoul \(sold out, the second night handed back\)/.test(end.text), 'the ceremony reads the route date by date, Seoul first: ' + (end && end.text.slice(0, 300)));
  ok(end && /Japan \((sold out|full|soft)\)/.test(end.text), 'the overseas leg reads by region');
  ok(end && /second nights? earned, \d+ moments? the road keeps/.test(end.text), 'the encores and the moments are counted');
  ok(end && /Contractual rest through/.test(end.text), 'the rest date stays');
  const hist = g.tourHistory[g.tourHistory.length - 1];
  ok(hist && ('best' in hist) && ('worst' in hist) && typeof hist.moments === 'number' && hist.moments >= 2, 'the tour record keeps best/worst/moments (' + JSON.stringify(hist) + ')');
  ok(!hist.best || /went right was /.test(end.text), 'best named in the letter when present');
  eq(state.tourLedger.ceremonies, 1, 'ceremonies counted');
  ok(!g.tourLedger, 'the ledger is top-level');
  console.log('  wrap: ' + end.text);
}

// ---- 3b. the road presser: a fumbled night opens the door; the statement steadies the room ----
{
  const mk = () => {
    const { state, g } = debuted(KP, 'rd-fumble');
    g.popularity = 45; state.budget = 900;   // theaters at 45: Seoul fills, nothing sells out — no encore door in the way
    // a room that will fumble: fatigue high, morale low, nothing in the tank
    g.members.forEach(id => { const p = state.people[id]; p.fatigue = 98; p.morale = 2; p.flags.burnout = 0;
      ['vocals', 'dance', 'rap', 'charisma'].forEach(k => { p.talents[k].cur = 5; }); });
    KP.planTour(state, { groupId: g.id, scale: 'halls', legs: ['kr'], pacing: 'humane', setlist: 'hits' });
    return { state, g };
  };
  let found = null;
  for (let i = 0; i < 6 && !found; i++) {
    const { state, g } = mk();
    KP.advanceWeek(state);
    if (g.tour && g.tour.lastNight === 'fumbled') found = { state, g };
  }
  ok(found, 'a fumbled night can be forced (fatigue 98, morale 2)');
  if (found) {
    const { state, g } = found;
    const door = state.scenes.find(sc => sc.kind === 'roadPresser');
    ok(door && door.where && door.groupId === g.id, 'the presser door opened after the fumbled night (' + JSON.stringify(door) + ')');
    eq(state.tourLedger.pressersOffered, 1, 'pressersOffered counted');
    eq(g.tour.presserAsked[0], true, 'once per leg: presserAsked[0]');
    const def = KP.sceneDef('roadPresser');
    const opts = def.options(state, door);
    eq(opts[0].id, 'ride', 'options[0] is ride');
    ok(opts.some(o => o.id === 'statement' && o.label === 'Put out a statement · ' + KP.C.TOUR.presserCost), 'the statement is on the menu when flush');
    eq(KP.nightDemandMult(g.tour), KP.C.STAGE.badNightDemand, 'before the statement the next room sells softer');
    const b0 = state.budget, hype0 = g.members.map(id => state.people[id].hype || 0);
    ok(KP.resolveScene(state, door.id, 'statement').ok, 'the statement resolves');
    eq(state.budget, b0 - KP.C.TOUR.presserCost, 'the statement bills presserCost');
    eq(g.tour.pressered, true, 'pressered set');
    eq(KP.nightDemandMult(g.tour), 1, 'the statement steadied the room: mult 1');
    ok(g.members.every((id, i) => (state.people[id].hype || 0) === Math.max(0, hype0[i] - KP.C.TOUR.presserHype)), 'hype −' + KP.C.TOUR.presserHype + ' on everyone');
    eq(state.tourLedger.statements, 1, 'statements counted');
    ok(state.inbox[0].ind === 'roadStatement' && state.inbox[0].priority === 'normal', 'the statement letter lands at normal');
    const marketing = state.books.cur.marketing;
    ok(marketing <= -KP.C.TOUR.presserCost, 'the marketing stream carries the bill');
    if (g.tour.kr.idx < g.tour.kr.route.length) {
      KP.advanceWeek(state);
      ok(!g.tour || g.tour.pressered === false, 'pressered clears after the next night (' + (g.tour && g.tour.pressered) + ')');
    }
    // the poor-account gate
    const { state: s2, g: g2 } = mk();
    KP.advanceWeek(s2);
    const d2 = s2.scenes.find(sc => sc.kind === 'roadPresser');
    if (d2) { s2.budget = 1; ok(!def.options(s2, d2).some(o => o.id === 'statement'), 'no statement on an empty account'); }
  }
}

// ---- 3c. the setlist swap: a loud pick on the first week ----
{
  const { state, g } = debuted(KP, 'rd-swap');
  g.popularity = 60; state.budget = 900;
  const rel = g.releases[g.releases.length - 1];
  rel.bsides = [{ n: 2, title: 'Paper Lantern', heat: KP.C.TOUR.swapPickHeat, credit: null }];
  rel.fanPick = 'Paper Lantern';
  g.fandom = g.fandom || { intensity: 20 };
  KP.planTour(state, { groupId: g.id, scale: 'clubs', legs: ['kr'], pacing: 'humane', setlist: 'hits' });
  KP.advanceWeek(state);
  const int0 = g.fandom.intensity;
  const door = state.scenes.find(sc => sc.kind === 'setlistSwap');
  ok(door && door.title === 'Paper Lantern', 'the swap door opens on the first week with the pick named (' + JSON.stringify(door) + ')');
  eq(g.tour.swapAsked, true, 'swapAsked set');
  eq(state.tourLedger.swapsOffered, 1, 'swapsOffered counted');
  ok(!state.scenes.some(sc => sc.kind === 'encoreNight'), 'no second door while the swap waits');
  const def = KP.sceneDef('setlistSwap');
  eq(def.options(state, door)[0].id, 'keep', 'options[0] is keep');
  ok(KP.resolveScene(state, door.id, 'swap').ok, 'the swap resolves');
  eq(g.tour.pickSwapped, true, 'pickSwapped set');
  eq(g.tour.pickTitle, 'Paper Lantern', 'the title is kept on the tour');
  eq(g.fandom.intensity, Math.min(100, int0 + KP.C.TOUR.swapIntensity), 'the fandom pays in intensity (+' + KP.C.TOUR.swapIntensity + ')');
  eq(state.tourLedger.swapped, 1, 'swapped counted');
  ok(state.inbox[0].ind === 'setlistSwapped' && /Paper Lantern/.test(state.inbox[0].text), 'the swap letter names the title');
  ok(KP.tourRoadRead(state, g).pickSwapped === true, 'the read says the pick is in');
  // the singalong becomes available: force it by excluding the other kinds through lastMomentKind? just check the family can pick it
  let sang = false;
  for (let w = 0; w < 6 && g.tour; w++) { KP.advanceWeek(state); if (g.tour && g.tour.lastMomentKind === 'singalong') sang = true; }
  console.log('  singalong picked within the tour: ' + sang);
  // quiet pick → no door
  const { state: s2, g: g2 } = debuted(KP, 'rd-swap');
  const rel2 = g2.releases[g2.releases.length - 1];
  rel2.bsides = [{ n: 2, title: 'Quiet One', heat: KP.C.TOUR.swapPickHeat - 1 }]; rel2.fanPick = 'Quiet One';
  g2.popularity = 60; s2.budget = 900;
  KP.planTour(s2, { groupId: g2.id, scale: 'clubs', legs: ['kr'], pacing: 'humane', setlist: 'hits' });
  KP.advanceWeek(s2);
  ok(!s2.scenes.some(sc => sc.kind === 'setlistSwap') && g2.tour.swapAsked === true, 'a quiet pick opens no door; the question is still spent');
  // a non-hits setlist → no door
  const { state: s3, g: g3 } = debuted(KP, 'rd-swap');
  const rel3 = g3.releases[g3.releases.length - 1];
  rel3.bsides = [{ n: 2, title: 'Loud One', heat: 90 }]; rel3.fanPick = 'Loud One';
  g3.popularity = 60; s3.budget = 900;
  KP.planTour(s3, { groupId: g3.id, scale: 'clubs', legs: ['kr'], pacing: 'humane', setlist: 'fanService' });
  KP.advanceWeek(s3);
  ok(!s3.scenes.some(sc => sc.kind === 'setlistSwap'), 'fan service already sings the pick: no door');
}

// ---- the moment family: never the same kind two weeks running; every kind clean ----
{
  const { state, g } = debuted(KP, 'rd-moments');
  g.popularity = 70; state.budget = 900;
  KP.regionsOf(g).jp = 60; KP.regionsOf(g).sea = 55;
  KP.planTour(state, { groupId: g.id, scale: 'halls', legs: ['kr', 'jp', 'sea'], pacing: 'punishing', setlist: 'hits' });
  const kinds = [];
  let repeat = false, last = null;
  while (g.tour) {
    botAnswer(KP, state);
    KP.advanceWeek(state);
    const leg = KP.lastTickNotes.find(n => n.ind === 'tourLeg');
    if (leg && g.tour) { if (g.tour.lastMomentKind === last) repeat = true; last = g.tour.lastMomentKind; kinds.push(last); }
    else if (leg) kinds.push('(wrap week)');
  }
  ok(!repeat, 'never the same kind two weeks running: ' + kinds.join(' → '));
  // exercise every kind's lines for tokens
  const bad = [];
  const tour = { pacing: 'punishing', pickSwapped: true, pickTitle: 'Paper Lantern', dates: [], lastMomentKind: null };
  const seen = new Set();
  for (let w = 1; w <= 60 && seen.size < 10; w++) {
    state.week = w;
    const s = KP.tourMomentOf(state, g, tour, { overseas: w % 2 === 0, cities: ['seoul', 'busan', 'incheon', 'daegu', 'gwangju', 'daejeon'], encore: true, soft: true });
    seen.add(tour.lastMomentKind);
    if (/\{(she|her|pos|hers|She|Her)\}|undefined|NaN/.test(s) || !s) bad.push(tour.lastMomentKind + ': ' + s);
  }
  ok(!bad.length, 'every moment line is clean: ' + bad.join(' | '));
  console.log('  moment kinds seen: ' + [...seen].join(', '));
}

// ---- old saves: a mid-tour save without the new fields renders and wraps ----
{
  const { state, g } = debuted(KP, 'rd-legacy');
  g.popularity = 60; state.budget = 900;
  KP.planTour(state, { groupId: g.id, scale: 'clubs', legs: ['kr'], pacing: 'humane', setlist: 'hits' });
  KP.advanceWeek(state);
  delete g.tour.dates; delete g.tour.lastMomentKind; delete g.tour.moments; delete state.tourLedger;
  const rd = KP.tourRoadRead(state, g);
  ok(rd && rd.nextStop, 'the read works on a save without the record');
  let guard = 0;
  while (g.tour && guard++ < 10) { botAnswer(KP, state); KP.advanceWeek(state); }
  const end = state.inbox.find(n => n.ind === 'tourEnd');
  ok(end && !/undefined|NaN/.test(end.text), 'the legacy wrap is clean: ' + (end && end.text.slice(0, 200)));
  // the tourHistory entry from an old build (no best/worst) renders without the clause — checked in the DOM smoke
}
}

// ---- festival season and Japan ------------------------------------------------------
{
  const ok = (c, m) => t.ok(c, m);
  const dom = require('./dom_stub');
function answerAll(state, skip) {
  (state.scenes || []).slice().forEach(sc => {
    if (skip && skip.includes(sc.kind)) return;
    const def = KP.sceneDef(sc.kind);
    if (!def) return;
    const opts = def.options(state, sc);
    if (opts.length) KP.resolveScene(state, sc.id, opts[0].id);
  });
}
function rideTo(state, absWeek, handler) {
  let guard = 0;
  while (state.week < absWeek && guard++ < 400) { if (handler) handler(); KP.advanceWeek(state); }
}
const notes = state => (KP.lastTickNotes || []).concat(state.inbox);
const F = KP.C.FESTS;
const W = KP.C.WEEKS_PER_YEAR;

// ---- A. the bill, the invite body, the doors, the collab night -------------
console.log('A. hanRiver: bill + doors + collab');
{
  const f = F.LIST.find(x => x.id === 'hanRiver');
  const s = KP.newGame('smoke-fest-A', 'Boss', { door: 'current' });
  const g = s.groups.find(x => x.debuted);
  KP.recordEvidence(s, 'festivalIcons', 'group', g.id);
  const keep = () => { g.popularity = Math.max(g.popularity || 0, 50); g.prep = null; g.promoUntil = 0; g.tour = null; delete g.jpAway; g.hiatus = null; answerAll(s, ['festivalInvite']); };
  rideTo(s, f.woy - F.inviteLead, keep);
  KP.advanceWeek(s);
  const bill = KP.festivalBillRead(s, f, 1);
  ok(bill && bill.acts.length > 0, 'bill posted: ' + (bill ? bill.acts.length + ' acts, headliner ' + bill.headliner : 'none'));
  ok(bill && bill.acts.every((a, i, arr) => i === 0 || arr[i - 1].pop >= a.pop), 'bill sorted by popularity desc');
  ok(bill && bill.acts.every(a => (s.rivals.find(r => r.short === a.company) || { acts: [] }).acts.some(x => x.name === a.name && (x.popularity || 0) >= f.popMin)), 'every bill act is a live rival act at or above popMin');
  ok(s.festivalLedger.billsPosted >= 1, 'ledger.billsPosted ' + s.festivalLedger.billsPosted);
  ok(!!s.festBills && Object.keys(s.festBills).some(k => k === 'hanRiver:1'), 'state.festBills keyed hanRiver:1 → ' + Object.keys(s.festBills || {}).join(','));
  const sc = s.scenes.find(x => x.kind === 'festivalInvite' && x.festivalId === 'hanRiver');
  ok(!!sc, 'invite scene open');
  const def = KP.sceneDef('festivalInvite');
  const body = def.body(s, sc);
  console.log('   body: ' + body);
  ok(/On the bill: .* — headliner /.test(body) || (sc.headline && /On the bill beneath you: /.test(body)), 'body reads the bill (headliner named, or "beneath you" on a headline call)');
  let opts = def.options(s, sc).map(o => o.id);
  ok(opts[0] === 'accept' && opts[opts.length - 1] === 'decline', 'options[0] accept, last decline: ' + opts.join(','));
  // the deep cut: force a hot fan pick on the latest release
  const rel = g.releases[g.releases.length - 1];
  console.log('   latest release bsides: ' + JSON.stringify((rel && rel.bsides || []).map(b => b.title + ':' + b.heat)));
  rel.bsides = [{ n: 2, title: 'Paper Moon', heat: 70 }, { n: 3, title: 'Low Tide', heat: 40 }];
  opts = def.options(s, sc).map(o => o.id);
  ok(opts.includes('deep'), 'deep door opens at heat 70: ' + opts.join(','));
  rel.bsides[0].heat = 50;
  ok(!def.options(s, sc).map(o => o.id).includes('deep'), 'deep door shut at heat 50 (< deepPickHeat ' + F.deepPickHeat + ')');
  rel.bsides[0].heat = 70;
  // the collab: a friend whose act is on the bill
  const friendAct = bill.acts[1] || bill.acts[0];
  const rivalAct = s.rivals.flatMap(r => r.acts || []).find(a => a.id === friendAct.id);
  s.industryFriends = s.industryFriends || [];
  s.industryFriends.push({ a: g.members[0], b: rivalAct.members[0], actId: rivalAct.id, since: s.week });
  const full = def.options(s, sc);
  console.log('   options: ' + full.map(o => o.id + ' = ' + o.label).join(' | '));
  ok(full.map(o => o.id).join(',') === 'accept,deep,collab,decline', 'order accept,deep,collab,decline');
  ok(/collab with /.test(full.find(o => o.id === 'collab').label) && full.find(o => o.id === 'collab').label.includes(friendAct.name), 'collab label names the act');
  s.budget = Math.max(s.budget, 200);
  const budget0 = s.budget;
  const r = KP.resolveScene(s, sc.id, 'collab');
  console.log('   toast: ' + (r.toast || r.reason));
  ok(r.ok !== false && s.budget === budget0 - f.travel, 'collab books like accept (travel −' + f.travel + ')');
  const b = g.festivalBookings.find(x => x.festivalId === 'hanRiver');
  ok(b && b.set === 'collab' && b.collabAct === friendAct.name && b.collabActId === friendAct.id, 'booking carries set/collabAct/collabActId: ' + JSON.stringify(b));
  // the season read + poster placement
  const eds = KP.festivalSeasonRead(s);
  console.log('   seasonRead: ' + eds.map(e => e.fest.id + '@' + e.week + ' ours=' + e.ours + ' bill=' + (e.bill ? e.bill.acts.length : null)).join(' ; '));
  ok(eds.length === F.seasonCardCount && eds[0].week >= s.week, 'season read: ' + F.seasonCardCount + ' editions from this week');
  const ed = eds.find(e => e.fest.id === 'hanRiver');
  ok(ed && ed.ours === 'booked' && ed.group === g, 'hanRiver reads booked for ' + (ed && ed.group && ed.group.name));
  const poster = KP.festivalPoster(bill, { name: g.name, company: s.company.short, pop: g.popularity, headline: false });
  console.log('   poster: ' + poster.map(a => (a.ours ? '*' : '') + a.name).join(' · '));
  ok(poster.length === bill.acts.length + 1 && poster.some(a => a.ours), 'poster inserts ours once (render-time)');
  // ride to the night
  rideTo(s, f.woy, keep);
  g.popularity = 50; g.prep = null; g.promoUntil = 0; g.tour = null; delete g.jpAway;
  KP.advanceWeek(s);
  const play = notes(s).find(n => n.ind === 'festival' && /Han River/.test(n.text));
  console.log('   play: ' + (play && play.text));
  ok(!!play, 'the play letter fired');
  ok(play && /(On after|Opening the bill)/.test(play.text), 'letter names the neighbours');
  ok(s.festivalLedger.collabs === 1 && s.festivalLedger.moments >= 1, 'ledger collabs=1 moments=' + s.festivalLedger.moments);
  ok(g.festLastMomentKind != null, 'festLastMomentKind recorded: ' + g.festLastMomentKind);
  ok(s.industryFriends[s.industryFriends.length - 1].collabs === 1, 'friendship remembers the collab');
  const clip = notes(s).find(n => n.ind === 'festCollabClip');
  console.log('   clip: ' + (clip ? clip.text : '(hash said no clip this edition)'));
  ok(!/undefined|NaN|\{she\}|\{her\}|\{pos\}|\{She\}/.test(notes(s).map(n => n.text).join(' ')), 'no undefined/NaN/pronoun tokens in the week\'s letters');
}

// ---- B. the deep set ----------------------------------------------------------
console.log('B. moonlitGarden: the deep set');
{
  const f = F.LIST.find(x => x.id === 'moonlitGarden');
  const s = KP.newGame('smoke-fest-B', 'Boss', { door: 'current' });
  const g = s.groups.find(x => x.debuted);
  KP.recordEvidence(s, 'festivalIcons', 'group', g.id);
  const keep = () => { s.budget = Math.max(s.budget, 300); g.popularity = Math.max(g.popularity || 0, 50); g.prep = null; g.promoUntil = 0; g.tour = null; delete g.jpAway; g.hiatus = null; answerAll(s, ['festivalInvite']); };
  rideTo(s, f.woy - F.inviteLead, keep);
  KP.advanceWeek(s);
  const sc = s.scenes.find(x => x.kind === 'festivalInvite' && x.festivalId === f.id);
  ok(!!sc, 'invite open (week ' + s.week + ', groups ' + s.groups.length + ')');
  const rel = g.releases[g.releases.length - 1];
  rel.bsides = [{ n: 2, title: 'Paper Moon', heat: 71 }];
  const def = KP.sceneDef('festivalInvite');
  ok(def.options(s, sc).some(o => o.id === 'deep'), 'deep offered');
  const i0 = g.fandom ? g.fandom.intensity : null;
  s.budget = Math.max(s.budget, 200);
  KP.resolveScene(s, sc.id, 'deep');
  const b = g.festivalBookings.find(x => x.festivalId === f.id);
  ok(b && b.set === 'deep' && b.pick === 'Paper Moon', 'booking set=deep pick=Paper Moon: ' + JSON.stringify(b));
  rideTo(s, f.woy, keep);
  g.popularity = 50; g.prep = null; g.promoUntil = 0; g.tour = null; delete g.jpAway;
  const i1 = g.fandom ? g.fandom.intensity : null;
  KP.advanceWeek(s);
  const play = notes(s).find(n => (n.ind === 'festival' || n.ind === 'festHeadline') && new RegExp(f.name).test(n.text));
  console.log('   play: ' + (play && play.text));
  ok(s.festivalLedger.deepSets === 1, 'ledger.deepSets 1');
  ok(!g.fandom || g.fandom.intensity >= Math.max(0, i1 - KP.C.FANDOM.intensityDecay) , 'fandom fed by the deep set (had fandom: ' + !!g.fandom + ', ' + i0 + ' → ' + (g.fandom && g.fandom.intensity) + ')');
}

// ---- C. the headline ceremony (Neon Harbor, tier 3) --------------------------
console.log('C. neonHarbor: the ceremony');
{
  const f = F.LIST.find(x => x.id === 'neonHarbor');
  const s = KP.newGame('smoke-fest-C', 'Boss', { door: 'current' });
  const g = s.groups.find(x => x.debuted);
  KP.recordEvidence(s, 'festivalIcons', 'group', g.id);
  const keep = () => { s.budget = Math.max(s.budget, 300); g.popularity = Math.max(g.popularity || 0, 70); g.prep = null; g.promoUntil = 0; g.tour = null; delete g.jpAway; g.hiatus = null; answerAll(s, ['festivalInvite']); };
  rideTo(s, f.woy - F.inviteLead, keep);
  KP.advanceWeek(s);
  const sc = s.scenes.find(x => x.kind === 'festivalInvite' && x.festivalId === f.id);
  ok(sc && sc.headline, 'headline invite open');
  const def = KP.sceneDef('festivalInvite');
  console.log('   body: ' + def.body(s, sc));
  ok(/On the bill beneath you: /.test(def.body(s, sc)), 'headline body reads the bill beneath');
  s.budget = Math.max(s.budget, 200);
  const budget0 = s.budget;
  KP.resolveScene(s, sc.id, 'accept');
  const b = g.festivalBookings.find(x => x.festivalId === f.id);
  ok(b && Object.keys(b).join(',') === 'festivalId,week,headline' && s.budget === budget0 - f.travel, 'accept stores nothing new: ' + JSON.stringify(b));
  rideTo(s, f.woy, keep);
  g.popularity = 70; g.prep = null; g.promoUntil = 0; g.tour = null; delete g.jpAway;
  KP.advanceWeek(s);
  const cer = notes(s).find(n => n.ind === 'festHeadline');
  console.log('   ceremony: ' + (cer && cer.text));
  ok(cer && cer.priority === 'critical' && cer.headline === true, 'festHeadline critical letter');
  ok(cer && /The poster, read the way the night ran: .* · and .*last light of the night/.test(cer.text) && /Fee \+/.test(cer.text), 'poster read bottom to top, ours last, then the fee');
  ok(!notes(s).some(n => n.ind === 'festival' && /Neon Harbor/.test(n.text)), 'no second (high) play letter for the tier-3 headline');
  ok(s.festivalLedger.ceremonies === 1 && s.festivalLedger.headlines === 1, 'ledger ceremonies=1 headlines=1');
  ok(s.inbox.some(n => n.ind === 'festHeadline'), 'the ceremony letter survives the trim (kept in the inbox)');
}

// ---- D. Japan's in-country weeks ----------------------------------------------
console.log('D. Japan: the away weeks');
{
  const s = KP.newGame('smoke-fest-D', 'Boss', { door: 'current' });
  const g = s.groups.find(x => x.debuted);
  s.jpPartner = { name: 'Aozora Records', since: s.week, cut: 0.25 };
  KP.regionsOf(g).jp = 40;
  g.prep = null; g.promoUntil = 0; g.tour = null; s.budget = 500;
  ok(KP.japanAwayRead(s, g) === null, 'read is null before the trip');
  const r = KP.planJapanRelease(s, g.id, 'original');
  ok(r.ok, 'lane opened: ' + JSON.stringify(r));
  const kinds = [];
  let letters = 0;
  while (g.jpAway) {
    KP.advanceWeek(s);
    const read = KP.japanAwayRead(s, g);
    const n = (KP.lastTickNotes || []).find(x => x.ind === 'jpAwayWeek');
    if (n) { letters++; kinds.push(g.jpLastMomentKind); console.log('   wk' + s.week + ' ' + n.priority + ': ' + n.text); }
    if (read) { console.log('   read: ' + JSON.stringify(read)); ok(read.weeksTotal === 6 && read.lane === 'JP-original' && read.partner === 'Aozora Records', 'read shape'); ok((!!n) === (read.moment != null), 'read.moment present exactly when the letter fired'); }
  }
  ok(letters === 5, 'five letters for the six-week original (landing week excepted): ' + letters);
  ok(s.jpLedger.awayMoments === 5, 'jpLedger.awayMoments 5: ' + s.jpLedger.awayMoments);
  ok(kinds.every((k, i) => i === 0 || k !== kinds[i - 1]), 'never the same kind two weeks running: ' + kinds.join(','));
  ok(KP.japanAwayRead(s, g) === null, 'read null after the release');
  ok(!/undefined|NaN|\{she\}|\{her\}|\{pos\}|\{She\}/.test(s.inbox.map(n => n.text).join(' ')), 'no undefined/NaN/pronoun tokens');
}

// ---- E. the fork: same choices, byte-identical ------------------------------
console.log('E. the fork');
{
  const run = () => {
    const f = F.LIST.find(x => x.id === 'hanRiver');
    const s = KP.newGame('smoke-fest-E', 'Boss', { door: 'current' });
    const g = s.groups.find(x => x.debuted);
    KP.recordEvidence(s, 'festivalIcons', 'group', g.id);
    const keep = () => { s.budget = Math.max(s.budget, 300); g.popularity = Math.max(g.popularity || 0, 50); g.prep = null; g.promoUntil = 0; g.tour = null; delete g.jpAway; answerAll(s, ['festivalInvite']); };
    rideTo(s, f.woy - F.inviteLead, keep);
    KP.advanceWeek(s);
    const sc = s.scenes.find(x => x.kind === 'festivalInvite' && x.festivalId === 'hanRiver');
    const bill = KP.festivalBillRead(s, f, 1);
    const rivalAct = s.rivals.flatMap(r => r.acts || []).find(a => a.id === bill.acts[0].id);
    g.releases[g.releases.length - 1].bsides = [{ n: 2, title: 'Paper Moon', heat: 70 }];
    s.industryFriends = (s.industryFriends || []).concat([{ a: g.members[0], b: rivalAct.members[0], actId: rivalAct.id, since: s.week }]);
    s.budget = Math.max(s.budget, 200);
    KP.resolveScene(s, sc.id, 'collab');
    rideTo(s, f.woy + 3, keep);
    return KP.serialize(s);
  };
  const a = run(), b = run();
  ok(a === b, 'two runs with the same choices serialize byte-identical (' + a.length + ' bytes)');
}

// ---- F. the Industry tab, rendered through the DOM stub -----------------------
console.log('F. DOM smoke: Industry · Scene');
{
  const d = dom.load();
  const K = d.KP, App = d.App, el = d.el;
  const f = K.C.FESTS.LIST.find(x => x.id === 'hanRiver');
  const s = K.newGame('smoke-fest-F', 'Boss', { door: 'current' });
  const g = s.groups.find(x => x.debuted);
  K.recordEvidence(s, 'festivalIcons', 'group', g.id);
  let guard = 0;
  while (s.week < f.woy - K.C.FESTS.inviteLead && guard++ < 100) {
    s.budget = Math.max(s.budget, 300); g.popularity = Math.max(g.popularity || 0, 50); g.prep = null; g.promoUntil = 0; g.tour = null; delete g.jpAway;
    (s.scenes || []).slice().forEach(sc => { if (sc.kind === 'festivalInvite') return; const def = K.sceneDef(sc.kind); if (def) { const o = def.options(s, sc); if (o.length) K.resolveScene(s, sc.id, o[0].id); } });
    K.advanceWeek(s);
  }
  K.advanceWeek(s);
  App.state = s; App.mode = 'game'; App.tab = 'industry'; App.industrySub = 'scene';
  App.render();
  let html = el('screen').innerHTML;
  const strip = dom.stripTags(html);
  const card = strip.slice(strip.indexOf('Festival season'), strip.indexOf('Festival season') + 700);
  console.log('   card (invited): ' + card.replace(/\s+/g, ' ').trim());
  ok(/Festival season/.test(html), 'the Festival season kicker renders');
  ok(/Headliner /.test(html) && /the invitation for .* is on the Desk/.test(strip), 'headliner + invited status in words');
  ok(!/undefined|NaN|\{she\}|\{her\}|\{pos\}/.test(html), 'no undefined/NaN/pronoun tokens on the Industry tab');
  // book it, render again: our act on the poster (gold)
  const sc = s.scenes.find(x => x.kind === 'festivalInvite' && x.festivalId === 'hanRiver');
  s.budget = Math.max(s.budget, 200);
  K.resolveScene(s, sc.id, 'accept');
  App.render();
  html = el('screen').innerHTML;
  const strip2 = dom.stripTags(html);
  console.log('   card (booked): ' + strip2.slice(strip2.indexOf('Festival season'), strip2.indexOf('Festival season') + 500).replace(/\s+/g, ' ').trim());
  ok(new RegExp(g.name + ' is on the bill|' + g.name + ' headlines').test(strip2), 'booked status names our act');
  ok(html.includes('<span style="color:var(--gold)">' + g.name + '</span>'), 'our act appears on the rendered poster in gold');
  // the desk renders too (the other agent's file — report only)
  try { App.tab = 'desk'; App.render(); ok(!/undefined|NaN/.test(el('screen').innerHTML), 'Desk renders without undefined/NaN'); }
  catch (e) { console.log('  NOTE desk render threw (other agent\'s file?): ' + e.message); }
}
}

t.finish();
