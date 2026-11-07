/* Suite 115 — the wiring (v0.11.5, §96 recommendation 1). Owner: "start
   with the wiring." The depth that existed and could not be reached or
   read, made reachable and honest: the solo door at the cold renewal
   table (and the return run behind it), the reads rendered, the free
   answers given their cost, the landing letter critical and first, the
   evaluation sheet's priority ladder, the warehouse memo and the restock
   door, the repackage's letter sent and marked, the reveal slips banded. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_115_wiring');

// ---- the solo door at the cold table, and the return run behind it ---------------
{
  const state = KP.newGame('wire-grad', null, { legacy: true });
  const g = state.groups.find(x => x.debuted && x.members.length >= 2);
  t.ok(!!g, 'the legacy door opens with a debuted lineup');
  g.members.forEach(id => { const q = state.people[id]; q.social = 20000; q.contract = q.contract || { start: 1, term: 1 }; });
  const star = state.people[g.members[0]];
  const other = state.people[g.members[1]];
  t.ok(!KP.graduateOpen(state, other), 'one of the room has no solo door');
  star.social = 400000; star.soloDisc = [{ week: 1, title: 'x' }];
  t.ok(KP.starRung(state, g, star) >= KP.C.CONTRACT.graduateRungMin && KP.graduateOpen(state, star), 'a star at rung 2 has the door');
  star.morale = 20; star.flags.ambitionMet = false;
  for (let i = 0; i < 6; i++) KP.recordDirected(state, star.id, 'heldBack');
  t.eq(KP.renewalRead(state, star).band, 'gone', 'the table reads cold');
  state.budget = 500;
  KP.openScene(state, { kind: 'renewal', personId: star.id, expiresWeek: state.week + 3 });
  const sc = state.scenes.find(x => x.kind === 'renewal');
  const def = KP.sceneDef('renewal');
  const ids = def.options(state, sc).map(o => o.id);
  t.ok(ids[0] === 'farewell' && ids.includes('graduate'), 'the solo door is on the cold table, never the default (' + ids.join(',') + ')');
  t.ok(/marquee/.test(def.body(state, sc)), 'and the body names it');
  state.budget = KP.C.CONTRACT.graduateCost - 1;
  t.ok(!def.options(state, sc).some(o => o.id === 'graduate'), 'the table never offers what the account cannot cover');
  state.budget = 500;
  const b0 = state.budget, n0 = state.groups.length, m0 = g.members.length, mo = other.morale;
  const r = KP.resolveScene(state, sc.id, 'graduate');
  t.ok(r.ok !== false && b0 - state.budget === KP.C.CONTRACT.graduateCost, 'the solo paper bills the bonus');
  const solo = state.groups.find(x => x.type === 'solo' && x.originGroupId === g.id);
  t.ok(state.groups.length === n0 + 1 && solo && solo.members[0] === star.id && g.members.length === m0 - 1, 'she leaves the lineup and stays in the building as a solo act');
  t.ok(star.contract.start === state.week && star.contract.term === 2, 'on a fresh seven');
  t.ok(other.morale === mo - KP.C.CONTRACT.graduateRoomMorale, 'the room pays for losing its star');
  t.ok(state.inbox.some(n => n.ind === 'graduatedSolo'), 'and the building hears it');
  t.ok((star.directed || []).some(d => d.kind === 'openedTheDoor'), 'the door she did not have to push is on her ledger');
  t.eq(KP.validateState(state).length, 0, 'the validator is clean after the door');
  // the return run was unreachable before v0.11.5: it needs a solo act with originGroupId
  state.budget = 9000;
  let opened = false;
  for (let w = 0; w < 40 && !opened; w++) {
    KP.advanceWeek(state); state.budget = Math.max(state.budget, 9000);
    if (!g.prep && g.demos && g.demos.length) KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest' });
    opened = (state.scenes || []).some(x => x.kind === 'returnRun' && x.personId === star.id);
  }
  t.ok(opened, 'the alum’s return run opens when her old group locks an era');
}

// ---- render what exists: the reads the engine kept and never showed ---------------
{
  const dom = require('./dom_stub');
  const D = dom.load();
  const App = D.App, el = D.el, KPu = D.KP;
  App.resetDrafts();
  App.state = KPu.newGame('wire-ui', 'Wire', { door: 'current' });
  App.mode = 'game';
  const s = App.state;
  for (let w = 0; w < 12; w++) { s.budget = Math.max(s.budget, 3000); KPu.advanceWeek(s); }
  const g = KPu.groups(s).find(x => x.debuted && !x.retiredWeek && x.members.length >= 2);
  t.ok(!!g, 'the current door opens with a debuted act');
  const idol = s.people[g.members[0]];
  // a star in the room, a contract inside the forecast window, a debut snapshot
  g.members.forEach(id => { s.people[id].social = 10000; });
  idol.social = 200000;
  idol.contract = { start: s.week - KPu.C.CONTRACT.renewalAtYears * KPu.C.WEEKS_PER_YEAR - 2, years: KPu.C.CONTRACT.years, term: 1 };
  idol.debutSnap = {};
  KPu.C.TALENTS.forEach((d, i) => { idol.debutSnap[d] = Math.round(idol.talents[d].cur) - [1, -3, 7, 0, -9][i % 5]; });
  const gr = KPu.gravityRead(s, idol);
  t.ok(gr && gr.word !== KPu.gravityWord(0), 'the transcendence read is a word above the floor (' + (gr && gr.word) + ')');
  t.ok(['devoted', 'professional', 'strained', 'gone'].includes(KPu.renewalForecast(s, idol)), 'the table is forecast in its own band words');
  // a trainee with a sheet history and a paper running out
  const tr = s.roster.map(id => s.people[id]).find(p => p.status === 'trainee');
  t.ok(!!tr, 'a trainee is on the roster');
  tr.evalHistory = [{ week: s.week - 12, rank: 5, of: 6 }, { week: s.week - 8, rank: 4, of: 6 }, { week: s.week - 4, rank: 2, of: 6 }];
  if (!tr.traineeContract) tr.traineeContract = { start: s.week - 10, term: 1 };
  tr.traineeContract.start = s.week - KPu.C.TRAINEE_CONTRACT.years * KPu.C.WEEKS_PER_YEAR + 4;
  const paper = KPu.traineePaperRead(s, tr);
  t.ok(paper && paper.notice && paper.end > s.week, 'the trainee paper reads its end and its notice');
  // the road, the festival, Japan, the club, the chapters, the rivals' memory
  g.tourHistory = [{ week: s.week - 20, scale: 'clubs', legs: ['kr'], stops: 5, soldOut: 2, soft: 0 }];
  t.eq(KPu.tourRecordRead(g).count, 1, 'the tour record counts the archive');
  g.festivalBookings = (g.festivalBookings || []).concat([{ festivalId: KPu.C.FESTS.LIST[0].id, week: s.week + 3 }]);
  const festName = KPu.C.FESTS.LIST[0].name;
  t.ok(KPu.upcoming(s).some(u => u.label.indexOf(festName + ' · ' + g.name) === 0), 'the booked festival slot is on the strip');
  s.jpPartner = s.jpPartner || { name: 'Aozora Records', since: 30 };
  g.jpFans = 1200; if (g.jpRung == null) g.jpRung = 0;
  g.fanclub = g.fanclub || { tier: 'standard', since: 20 };
  s.distributor = s.distributor || { tier: 0, advanceOwed: 0, bestChodong: 0 };
  s.career = (s.career || []).concat([{ week: 40, from: 'Old', door: 'investor', to: s.company.short }]);
  s.estate = s.estate || {}; s.estate.folded = (s.estate.folded || []).concat([{ name: 'Old Label', short: 'Old', week: 40 }]);
  s.rivals[0].offerLeveraged = s.week; s.rivals[1].offerDeclined = s.week;
  const before = JSON.stringify(s);
  const pages = {};
  const view = (label) => { App.render(); pages[label] = el('screen').innerHTML; return pages[label]; };
  App.view = null; App.tab = 'desk'; App.deskSub = 'record'; view('record');
  App.tab = 'talent'; App.talentSub = 'roster'; view('roster');
  App.talentSub = 'training'; view('training');
  App.view = { type: 'dossier', id: idol.id }; App.dossierTab = 'career'; view('career');
  App.dossierTab = 'person'; view('person');
  App.dossierTab = 'profile'; view('idolhead');
  App.view = { type: 'dossier', id: tr.id }; App.dossierTab = 'profile'; view('traineehead');
  App.view = { type: 'grouppage', id: g.id }; view('grouppage');
  App.view = null; App.tab = 'industry'; App.industrySub = 'scene'; view('scene');
  t.eq(JSON.stringify(s), before, 'rendering every page wrote nothing to state');
  const BAD = /undefined|NaN|\{[Ss]he\}|\{[Hh]er\}|\{[Pp]os\}|\[object/;
  const leak = Object.entries(pages).map(([k, h]) => { const m = h.match(BAD); return m ? k + ': ' + h.slice(Math.max(0, m.index - 60), m.index + 40).replace(/\s+/g, ' ') : null; }).filter(Boolean);
  t.ok(!leak.length, 'no page leaks a token' + (leak.length ? ' (' + leak.join(' | ') + ')' : ''));
  t.ok(/In the room:/.test(pages.career) && new RegExp('In the room:</b> ' + gr.word.replace('?', '\\?')).test(pages.career), 'the dossier reads the room');
  t.ok(/the table would read: <span[^>]*>(devoted|professional|strained|gone)/.test(pages.idolhead), 'the renewal forecast is on the contract line');
  t.ok(/eval 2\/6/.test(pages.roster) && /▲2/.test(pages.roster) && /climbing/.test(pages.roster), 'the roster chip carries the sheet’s movement');
  t.ok(/climbing|parked|sliding/.test(pages.training), 'the board reads the trajectory in words');
  t.ok(/Trainee contract · term \d+ · ends /.test(pages.traineehead) && /the paper is running out/.test(pages.traineehead), 'the trainee paper is on the dossier head');
  t.ok(/paper runs out /.test(pages.roster), 'and on the roster row inside the notice window');
  t.ok(/The road: 1 tour\b/.test(pages.grouppage) && /· last: club halls, 5 stops, 2 sold out/.test(pages.grouppage), 'the tour record is on the group page');
  t.ok(new RegExp('Booked: ' + festName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ', ').test(pages.grouppage), 'the booked slot is on the group page');
  t.ok(/runs the second discography/.test(pages.grouppage) && /The ladder: /.test(pages.grouppage) && /next rung: /.test(pages.grouppage) && /The JP fanbase: a (club|hall|arena|dome)’s worth/.test(pages.grouppage), 'the Japan ladder is a page');
  t.ok(/Road manager: /.test(pages.grouppage) || !g.manager, 'the road manager is named when the group has one');
  t.ok(/first among equals|bigger than the group\?|the face/.test(pages.grouppage), 'the star wears the word on the member strip');
  t.ok(/Distribution: /.test(pages.record) && / club since /.test(pages.record) && /This quarter so far: [+-]?\d+/.test(pages.record), 'the books card reads the distributor, the club and the running quarter');
  t.ok(/in the chair since /.test(pages.scene) && /The chapters:/.test(pages.scene) && /Labels before this one: /.test(pages.scene), 'the company card reads the exec’s tenure, the chapters and the folded labels');
  t.ok(/Remembers the letter you put on the board’s table\./.test(pages.scene) && /declined with the good stationery\./.test(pages.scene), 'the rivals remember the offer');
  t.ok(/Vocals: a (step|rung|flight) (up|down)|Dance: a (step|rung|flight) (up|down)/.test(pages.person) && !/Vocals [+-]\d/.test(pages.person), 'since debut reads in words, not digits');
  D.click({ action: 'launch-solo', id: idol.id });
  const modal = el('modal-root').innerHTML;
  t.ok(/keeps/.test(modal) && !/leaves the lineup/.test(modal), 'the launch-solo modal matches the engine: she keeps her seat');
}


// ---- the free answers, given their cost (§96 agreement 4) ------------------------
// the offer, the festival regrets, the distributor, red ink, the clinic, the service
// doors, the board, the interview, the promo desks, the lightstick, the café notice,
// the fandom name, the writing pair, the met mandate, the partner letter
const C = KP.C;
function fresh(seed) { const s = KP.newGame(seed, null, { legacy: true }); KP.ensureLedgers(s); return s; }
function debutedWorld(seed) { const s = fresh(seed); const g = s.groups.find(x => x.debuted) || s.groups[0]; return { s, g }; }
function scene(s, kind) { return (s.scenes || []).find(x => x.kind === kind); }
function expireAll(s, kind) { (s.scenes || []).forEach(sc => { if (sc.kind === kind) sc.expiresWeek = s.week - 1; }); }

// ---- 1. theOffer: leverage / decline recorded; a leveraged house never sends twice ----
{
  const s = fresh('va-offer');
  const RF = C.RISEFALL;
  const suitor = s.rivals[0];
  suitor.prestige = RF.offerPrestige + 4; s.trust = RF.offerTrust + 10;
  let guard = 0;
  while (!scene(s, 'theOffer') && guard++ < 60) { suitor.prestige = Math.max(suitor.prestige, RF.offerPrestige + 4); s.trust = Math.max(s.trust, RF.offerTrust + 10); KP.advanceWeek(s); }
  const sc = scene(s, 'theOffer');
  t.ok(sc && sc.company === suitor.short, 'the offer opens from the imperial house');
  const r = KP.resolveScene(s, sc.id, 'leverage');
  t.eq(suitor.offerLeveraged, s.week, 'leverage is recorded on the rival (offerLeveraged = week)');
  t.ok(/second envelope/.test(r.toast), 'the toast says they never send twice');
  // the rail never re-opens for that short
  s.offerAskedWeek = -999; guard = 0;
  while (!scene(s, 'theOffer') && guard++ < 120) { suitor.prestige = Math.max(suitor.prestige, RF.offerPrestige + 4); s.trust = Math.max(s.trust, RF.offerTrust + 10); KP.advanceWeek(s); }
  t.ok(!scene(s, 'theOffer'), 'theOffer never opens again for a leveraged house');
  // decline
  const s2 = fresh('va-offer2');
  const su2 = s2.rivals[0]; su2.prestige = RF.offerPrestige + 4; s2.trust = RF.offerTrust + 10; guard = 0;
  while (!scene(s2, 'theOffer') && guard++ < 60) { su2.prestige = Math.max(su2.prestige, RF.offerPrestige + 4); s2.trust = Math.max(s2.trust, RF.offerTrust + 10); KP.advanceWeek(s2); }
  const sc2 = scene(s2, 'theOffer');
  if (sc2) { KP.resolveScene(s2, sc2.id, 'decline'); t.eq(su2.offerDeclined, s2.week, 'decline is recorded (offerDeclined = week)'); t.ok(!su2.offerLeveraged, 'and leverage is not'); }
  else t.ok(false, 'second offer world never opened');
}

// ---- 2. festival regrets ----
{
  const { s, g } = debutedWorld('va-fest');
  const F = C.FESTS;
  const f = F.LIST.find(x => x.id === 'hanRiver');
  g.popularity = 70;
  const yr = () => Math.floor((s.week - 1) / C.WEEKS_PER_YEAR) + 1;
  const woy = () => ((s.week - 1) % C.WEEKS_PER_YEAR) + 1;
  // jump to the invite week of this year's edition
  s.week = (yr() - 1) * C.WEEKS_PER_YEAR + f.woy - F.inviteLead - 1;
  const oldChance = F.inviteChance; F.inviteChance = 1;
  g.hiatus = null; g.tour = null; g.jpAway = null;
  KP.advanceWeek(s);
  F.inviteChance = oldChance;
  const inv = (s.scenes || []).find(x => x.kind === 'festivalInvite' && x.festivalId === f.id && x.groupId === g.id);
  t.ok(inv, 'the invite opens at inviteChance 1');
  const year0 = yr();
  const r = KP.resolveScene(s, inv.id, 'decline');
  t.eq((g.festRegrets || {})[f.id], year0, 'decline records festRegrets[f.id] = edition year');
  t.ok(/wrote the regrets down/.test(r.toast), 'the toast says they wrote it down');
  // next year's edition: the body/letter mention the regrets, and the draw uses inviteAfterRegrets
  s.week = year0 * C.WEEKS_PER_YEAR + f.woy - F.inviteLead - 1;
  F.inviteAfterRegrets = 1; F.inviteChance = 0;
  const wk = KP.advanceWeek(s);
  F.inviteAfterRegrets = 0.45; F.inviteChance = oldChance;
  const inv2 = (s.scenes || []).find(x => x.kind === 'festivalInvite' && x.festivalId === f.id && x.groupId === g.id);
  t.ok(inv2, 'the year after regrets, the invite comes through inviteAfterRegrets (chance 1 while inviteChance 0)');
  t.ok((KP.lastTickNotes || []).some(n => n.ind === 'festivalInvite' && /last year’s regrets/.test(n.text)), 'the letter mentions last year’s regrets');
  t.ok(/call after the regrets/.test(KP.sceneDef('festivalInvite').body(s, inv2)), 'the body says the organizers remember');
  // expiry records regrets too
  expireAll(s, 'festivalInvite');
  const y1 = yr();
  KP.advanceWeek(s);
  t.eq((g.festRegrets || {})[f.id], y1, 'an expired invite records regrets for that edition year');
}

// ---- 3. distributor stay ----
{
  const s = KP.newGame('va-dist'); KP.ensureLedgers(s);   // the fresh door: a regional desk with a tier above it
  KP.distributorOf(s).tier = 0;
  s.groups.length = 0;
  const ids = s.roster.slice(0, 5).filter(id => (s.people[id].gender || 'f') === 'f');
  KP.proposeGroup(s, 'DISTLINE', ids, KP.roleHints(s, ids.map(i => s.people[i])));
  const g = s.groups[0];
  g.lastChodong = C.DIST.TIERS[1].bar + 500;
  KP.advanceWeek(s);
  const sc = scene(s, 'distributorCall');
  t.ok(sc, 'the courting call opens');
  const r = KP.resolveScene(s, sc.id, 'stay');
  t.eq(s.distributor.stayedWeek, s.week, 'stay records distributor.stayedWeek');
  t.ok(/next year/.test(r.toast), 'the toast says they call again next year');
  const w0 = s.week;
  for (let i = 0; i < C.DIST.recourtWeeks - 2; i++) { s.budget = Math.max(s.budget, 2000); KP.advanceWeek(s); }
  t.ok(!scene(s, 'distributorCall') && s.week === w0 + C.DIST.recourtWeeks - 2, 'no re-courting inside recourtWeeks (week moved: ' + s.week + ')');
  for (let i = 0; i < 3; i++) { s.budget = Math.max(s.budget, 2000); KP.advanceWeek(s); }
  t.ok(s.week >= w0 + C.DIST.recourtWeeks && scene(s, 'distributorCall'), 'the call re-opens once recourtWeeks have passed (week ' + s.week + ', pending=' + !!(KP.chapterPending && KP.chapterPending(s)) + ')');
}

// ---- 4. redInk expiry ----
{
  const s = fresh('va-red');
  const g = s.groups.find(x => x.debuted);
  g.redEras = C.BOOKS.redErasAt; g.redTalkDone = false;
  KP.advanceWeek(s);
  const sc = scene(s, 'redInk');
  t.ok(sc, 'red ink on the desk');
  // exact: the expire door called directly (the week's other phases also move morale)
  const m0 = g.members.map(id => s.people[id].morale);
  const n = KP.sceneDef('redInk').expire(s, sc);
  t.ok(g.redTalkDone, 'redTalkDone kept');
  t.ok(g.members.every((id, i) => s.people[id].morale === Math.max(0, m0[i] + C.BOOKS.redInkSilenceMorale)), 'every member lost exactly redInkSilenceMorale (clamped)');
  t.ok(n && n.ind === 'redInkSilence' && n.priority === 'normal' && n.kind === 'company' && n.groupId === g.id, 'a normal company letter, ind redInkSilence');
  expireAll(s, 'redInk');
  KP.advanceWeek(s);
  t.ok((KP.lastTickNotes || []).some(x => x.ind === 'redInkSilence'), 'and it rides the week’s inbox through the stage door');
}

// ---- 5. diagnosis expiry ----
{
  const s = fresh('va-med');
  const g = s.groups.find(x => x.debuted);
  const p = s.people[g.members[0]];
  KP.openScene(s, { kind: 'theDiagnosis', personId: p.id, kindOf: 'physical', site: 'the knee', expiresWeek: s.week - 1 });
  const led0 = KP.medLedger(s).rested;
  KP.advanceWeek(s);
  t.eq(KP.medLedger(s).rested, led0 + 1, 'rested still counts the silent rest');
  t.eq(KP.medLedger(s).restedBySilence, 1, 'restedBySilence counts it too');
  t.ok(p.flags.burnout >= C.MEDICAL.restMin, 'the protective default still benches her');
  t.ok((p.directed || []).some(d => d.kind === 'leftWaiting'), 'leftWaiting on her ledger');
  t.ok(p.history.some(h => /the clinic decided; nobody from the desk called/.test(h.text)), 'the history line');
}

// ---- 6. service doors ----
{
  const s = fresh('va-mil');
  const g = s.groups.find(x => x.debuted);
  g.gender = 'm';
  g.members.forEach(id => { s.people[id].gender = 'm'; });
  const plan = KP.openScene(s, { kind: 'servicePlan', groupId: g.id, expiresWeek: s.week - 1 });
  const m0 = g.members.map(id => s.people[id].morale);
  const n1 = KP.sceneDef('servicePlan').expire(s, plan);   // exact: the door called directly
  t.eq(g.servicePlan, 'stagger', 'the plan expiry files stagger');
  t.ok(g.members.every((id, i) => s.people[id].morale === Math.max(0, m0[i] + C.MIL.planSilenceMorale)), 'each man lost exactly planSilenceMorale');
  t.ok(n1 && /the room noticed/.test(n1.text), 'the expiry text says the room noticed');
  const p = s.people[g.members[0]];
  const papers = KP.openScene(s, { kind: 'enlistPapers', personId: p.id, expiresWeek: s.week - 1 });
  const pm0 = p.morale;
  const n2 = KP.sceneDef('enlistPapers').expire(s, papers);
  t.ok(p.morale === Math.max(0, pm0 + C.MIL.papersSilenceMorale), 'the papers expiry costs exactly papersSilenceMorale');
  t.ok((p.directed || []).some(d => d.kind === 'leftWaiting'), 'and deposits leftWaiting');
  t.ok(n2 && /so did the room/.test(n2.text) && /works until the wall/.test(n2.text), 'the papers text keeps its line and says the room noticed');
  KP.advanceWeek(s);   // the stage door delivers the papers' note when the week expires it (the plan's guard `g.servicePlan` already holds — correct)
  t.ok((KP.lastTickNotes || []).some(n => /so did the room/.test(n.text)), 'the papers expiry rides the week’s inbox');
}

// ---- 7. board artists ----
{
  const s = fresh('va-board');
  s.week = C.WEEKS_PER_YEAR + C.BUILDING.boardWeek - 1;
  KP.advanceWeek(s);
  const sc = scene(s, 'boardSeason');
  t.ok(sc, 'board season');
  const idols = s.roster.map(id => s.people[id]).filter(p => p.status === 'idol');
  const m0 = idols.map(p => p.morale), tr0 = s.trust;
  const r = KP.resolveScene(s, sc.id, 'artists');
  t.ok(idols.every((p, i) => p.morale === Math.min(100, m0[i] + C.BUILDING.boardArtistsMorale)), 'every idol +boardArtistsMorale');
  t.eq(s.trust, Math.max(0, tr0 + C.BUILDING.boardArtistsTrust), 'trust moves by boardArtistsTrust');
  t.ok(/wanted a slide/.test(r.toast) && /That is the trade/.test(r.toast), 'the toast makes the trade legible');
}

// ---- 8. the interview's pass is remembered ----
{
  const s = fresh('va-pass');
  const cand = { id: 'sf1_1', name: 'Cha Bo-ra', seatId: 'anr', tier: 'working', knownForTag: null, resume: ['x'], style: 'scrappy', warmth: 60, candor: 60 };
  KP.openScene(s, { kind: 'theInterview', cand, expiresWeek: s.week + 2 });
  const sc = scene(s, 'theInterview');
  KP.resolveScene(s, sc.id, 'pass');
  const led = KP.hiresLedger(s);
  t.ok(led.passed.length === 1 && led.passed[0].name === 'Cha Bo-ra' && led.passed[0].seatId === 'anr' && led.passed[0].week === s.week, 'the pass is on the ledger {name, seatId, week}');
  const w0 = s.week;
  let letter = null;
  for (let i = 0; i < C.HIRES.passReturnWeeks + 1 && !letter; i++) { KP.advanceWeek(s); letter = (KP.lastTickNotes || []).find(n => n.ind === 'passedTookChair'); if (letter) t.eq(s.week, w0 + C.HIRES.passReturnWeeks, 'the letter lands exactly passReturnWeeks later'); }
  t.ok(letter && /Cha Bo-ra/.test(letter.text) && letter.priority === 'normal' && letter.kind === 'company', 'one normal company letter naming the candidate');
  t.ok(letter && s.rivals.some(r => letter.text.indexOf(r.name) >= 0), 'and a rival house by name');
  t.ok(!led.passed.some(e => e.name === 'Cha Bo-ra'), 'the entry is dropped (an interview the weekly opened and let expire is itself a remembered pass: ' + led.passed.length + ' left)');
  // the cap
  for (let i = 0; i < C.HIRES.passMemoryCap + 3; i++) led.passed.push({ name: 'N' + i, seatId: 'anr', week: s.week + 100 });
  KP.openScene(s, { kind: 'theInterview', cand: Object.assign({}, cand, { name: 'Last One' }), expiresWeek: s.week + 2 });
  KP.resolveScene(s, scene(s, 'theInterview').id, 'pass');
  t.eq(led.passed.length, C.HIRES.passMemoryCap, 'capped at passMemoryCap');
}

// ---- 9. promo declines per desk ----
{
  const s = fresh('va-promo');
  const g = s.groups.find(x => x.debuted);
  const P = C.PROMO.OFFERS;
  g.rollout = [['popWave', 'challenge'], ['countdown', 'variety'], ['primeStage', 'fanSign'], ['livestream']];
  g.lastReleaseWeek = s.week; g.promoUntil = s.week + 4; g.prep = null;
  const mk = () => KP.openScene(s, { kind: 'promoOffer', groupId: g.id, offerKind: 'show', activity: 'countdown', personId: null, why: 'the numbers', slotWeek: 1, replace: 'variety', expiresWeek: s.week });
  mk();
  const r1 = KP.resolveScene(s, scene(s, 'promoOffer').id, 'decline');
  t.eq(KP.deskDeclines(s, 'countdown'), 1, 'one decline on the desk');
  t.ok(/one invitation declined/.test(r1.toast), 'the toast says what the desk wrote');
  mk();
  const r2 = KP.resolveScene(s, scene(s, 'promoOffer').id, 'decline');
  t.eq(KP.deskDeclines(s, 'countdown'), 2, 'two declines');
  t.ok(/calls half as often/.test(r2.toast), 'the toast says they call half as often');
  t.ok(KP.broadcasterLines(s).some(l => /The Countdown’s booking desk remembers the invitations declined — they call half as often\./.test(l)), 'broadcasterLines reads the declines');
  // the cooled draw: same draw count, lower bar
  const rng = KP.Rng ? new KP.Rng('x') : null;
  mk();
  const r3 = KP.resolveScene(s, scene(s, 'promoOffer').id, 'take');
  t.eq(KP.deskDeclines(s, 'countdown'), 0, 'a take clears the desk’s count');
  // expiry counts as a no
  KP.openScene(s, { kind: 'promoOffer', groupId: g.id, offerKind: 'show', activity: 'popWave', personId: null, why: 'the numbers', slotWeek: 1, replace: null, expiresWeek: s.week - 1 });
  KP.advanceWeek(s);
  t.eq(KP.deskDeclines(s, 'popWave'), 1, 'an expired invitation is a no on that desk');
}

// ---- 10. the lightstick sized by the fanbase ----
{
  const { s, g } = debutedWorld('va-light');
  g.popularity = 60; g.fandom = { name: 'ORBIT', color: 'coral rose', since: 1, intensity: 30 };
  s.budget = 500;
  const fb = KP.fanbaseRead(s, g);
  const exp = Math.min(C.CONSTITUENCY.lightstickRevenue, Math.round(fb * C.CONSTITUENCY.lightstickPerFan));
  const b0 = s.budget;
  const r = KP.launchLightstick(s, g.id);
  t.eq(r.revenue, exp, 'revenue = min(lightstickRevenue, round(fanbaseRead × lightstickPerFan)) [fb=' + fb + ']');
  t.eq(s.budget - b0, exp - C.CONSTITUENCY.lightstickCost, 'the budget moves by revenue − cost');
  if (exp < C.CONSTITUENCY.lightstickCost) t.ok(s.inbox.some(n => n.ind === 'lightstick' && /boxes in the hallway/.test(n.text)), 'boxes in the hallway when revenue < cost');
  // a flagship-size fandom still clears the full number
  const { s: s2, g: g2 } = debutedWorld('va-light2');
  g2.popularity = 90; g2.fandom = { name: 'ORBIT', color: 'coral rose', since: 1, intensity: 90 }; g2.lastChodong = 40000;
  s2.budget = 500;
  const r2 = KP.launchLightstick(s2, g2.id);
  t.eq(r2.revenue, C.CONSTITUENCY.lightstickRevenue, 'a flagship-size fandom (fb=' + KP.fanbaseRead(s2, g2) + ') reaches the old revenue');
}

// ---- 11. the café notice reads ----
{
  const { s, g } = debutedWorld('va-cafe');
  g.fandom = { name: 'ORBIT', color: 'coral rose', since: 1, intensity: 30 };
  s.grievances = [{ week: s.week, kind: 'centerChange', groupId: g.id }];
  const r1 = KP.cafeNotice(s, g.id);
  t.ok(r1.ok && r1.answered && g.fandom.intensity === 31 && s.grievances[0].trucked, 'a fresh grievance: +cafeNoticeIntensity and the grievance is cleared');
  g.cafeNoticeQuiet = 0;
  const r2 = KP.cafeNotice(s, g.id);
  t.ok(r2.ok && !r2.answered && g.fandom.intensity === 30, 'nothing to say: −cafeNoticeEmptyIntensity');
  t.ok(s.inbox.some(n => n.ind === 'cafeNotice' && /nothing to say/.test(n.text)), 'and the letter says the cafés noticed the notice had nothing in it');
}

// ---- 12. naming the fandom: the favorite ----
{
  const mk = seed => { const { s, g } = debutedWorld(seed); g.fandom = null; g.popularity = 50; return { s, g }; };
  const { s, g } = mk('va-name');
  const fav = KP.fandomFavoriteIdx(s, g);
  const opts = KP.fandomNameOptions(s, g);
  t.ok(fav >= 0 && fav < opts.length, 'fandomFavoriteIdx is a valid index');
  KP.nameFandom(s, g.id, fav);
  t.eq(g.fandom.intensity, 20 + C.FANDOM.nameBackedIntensity, 'backing the favorite: +nameBackedIntensity');
  const other = (fav + 1) % opts.length;
  const w2 = mk('va-name');
  KP.nameFandom(w2.s, w2.g.id, other);
  t.eq(w2.g.fandom.intensity, 20 - C.FANDOM.nameOverruledIntensity, 'backing another: −nameOverruledIntensity');
  t.ok(w2.s.inbox.some(n => n.ind === 'fandomNamed' && n.text.indexOf('(' + opts[fav] + ')') >= 0), 'the letter names the name the cafés wanted');
  const w3 = mk('va-name');
  KP.nameFandom(w3.s, w3.g.id, -1);
  t.ok(w3.g.fandom.intensity === 20 && w3.g.fandom.name === opts[fav], 'let them decide: neutral, and the favorite wins');
}

// ---- 13. unpair / defuse ----
{
  const { s, g } = debutedWorld('va-pair');
  const a = s.people[g.members[0]], b = s.people[g.members[1]];
  g.writingPair = { a: a.id, b: b.id, since: s.week - 2 };
  const ma = a.morale, mb = b.morale;
  const r = KP.unpairWriters(s, g.id);
  t.ok(r.ok && r.soon && a.morale === Math.max(0, ma + C.PAIR.unpairSoonMorale) && b.morale === Math.max(0, mb + C.PAIR.unpairSoonMorale), 'unpairing inside unpairSoonWeeks costs both unpairSoonMorale');
  t.ok(a.history.some(h => /just getting somewhere/.test(h.text)) && b.history.some(h => /just getting somewhere/.test(h.text)), 'history on both');
  t.eq(KP.pairLedger(s).unpaired, 1, 'ledgered');
  g.writingPair = { a: a.id, b: b.id, since: s.week - C.PAIR.unpairSoonWeeks };
  const ma2 = a.morale;
  KP.unpairWriters(s, g.id);
  t.ok(a.morale === ma2, 'a pair past unpairSoonWeeks dissolves at no morale cost');
  s.relationships = s.relationships || {};
  s.relationships[KP.pairKey(a, b)] = { score: -20, rivalry: { sharpened: s.week } };
  const d = KP.rivalryStance(s, g.id, a.id, b.id, 'defuse');
  t.ok(d.ok && KP.pairLedger(s).defused === 1 && a.history.some(h => /framing with/.test(h.text)) && b.history.some(h => /framing with/.test(h.text)), 'defuse: history on both and ledgered');
}

// ---- 14. the met mandate ----
{
  const s = fresh('va-mand');
  const m = KP.openMandate(s, { kind: 'group', gender: 'f', source: 'the board' });
  const g = s.groups.find(x => x.debuted);
  // simulate the release tick's consume inside a tick: consume then advance in the same tick is not reachable from a verb;
  // emulate by consuming at week W and letting the mandates rail (735) read metWeek >= week-1
  const fake = { id: 'gx', type: 'group', members: g.members.slice(), name: g.name };
  KP.consumeMandate(s, Object.assign({}, g));
  t.ok(m.status === 'met' && m.metWeek === s.week && !m.metNoted, 'consumed silently with metWeek');
  const wk = KP.advanceWeek(s);
  const letter = (KP.lastTickNotes || []).find(n => n.ind === 'mandateMet');
  t.ok(letter && letter.priority === 'high' && letter.kind === 'executive' && letter.text.indexOf(s.executive.name + ': “') === 0 && letter.text.indexOf(g.name) >= 0 && /the board/.test(letter.text), 'mandateMet: high, executive voice, names the group and the source');
  t.ok(m.metNoted, 'noted once');
  KP.advanceWeek(s);
  t.ok(!(KP.lastTickNotes || []).some(n => n.ind === 'mandateMet'), 'never twice');
}

// ---- 15. partnerDeal not yet ----
{
  const s = fresh('va-jp');
  const J = C.JAPAN;
  const mk = () => KP.openScene(s, { kind: 'partnerDeal', partner: 'Aozora Records', cut: KP.jpOfferCut(s), expiresWeek: s.week + 3 });
  mk();
  t.eq(scene(s, 'partnerDeal').cut, J.partnerCut, 'the first letter carries partnerCut');
  const r = KP.resolveScene(s, scene(s, 'partnerDeal').id, 'decline');
  t.ok(/a little more/.test(r.toast), 'the toast says the next letter asks for more');
  t.ok(Math.abs(KP.jpOfferCut(s) - (J.partnerCut + J.notYetCutStep)) < 1e-9, 'one not-yet: +notYetCutStep');
  for (let i = 0; i < 6; i++) { mk(); KP.resolveScene(s, scene(s, 'partnerDeal').id, 'decline'); }
  t.ok(Math.abs(KP.jpOfferCut(s) - J.cutMax) < 1e-9, 'capped at cutMax');
  mk();
  t.ok(/as steep as the partner’s letters get/.test(KP.sceneDef('partnerDeal').body(s, scene(s, 'partnerDeal'))), 'the body names the cut in words');
  KP.resolveScene(s, scene(s, 'partnerDeal').id, 'sign');
  t.ok(Math.abs(s.jpPartner.cut - J.cutMax) < 1e-9 && Math.abs(KP.jpCut(s) - J.cutMax) < 1e-9, 'signing stores the cut on jpPartner; KP.jpCut reads it');
  const s2 = fresh('va-jp2');
  s2.jpPartner = { name: 'X', since: 1 };
  t.eq(KP.jpCut(s2), J.partnerCut, 'an old save’s partnership reads the constant');
}

t.finish();
