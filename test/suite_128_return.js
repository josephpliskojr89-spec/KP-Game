/* Suite 128 — the return (v0.11.18, §109: the absences, part one).
   The result end of a service: the chapter an act is short is a record;
   "whole again" is a ceremony that reads it and names the window's last
   week; the window is one read the page, the letters and the lock share;
   a letter says when it is closing and a letter says when it closed. And
   a soloist's service is the act's service chapter, in a person's words.

   Laws (§99): the wire is read before the trim; a fixture forces every
   gate and rolls nothing; a missing letter fails by name. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const KP = loadEngine();
const t = makeT('suite_128_return');
const M = KP.C.MIL, H = KP.C.HIATUS;

// ---- the kit ----------------------------------------------------------------
function boys(seed, ages, name) {
  const state = KP.newGame(seed, null, { legacy: false });
  state.budget = 4000;
  const rng = KP.rngFor(state);
  const ids = [];
  for (let i = 0; i < ages.length; i++) {
    const b = KP.generatePerson(rng, { status: 'trainee', gender: 'm' });
    b.signedWeek = 1;
    state.people[b.id] = b; state.roster.push(b.id); ids.push(b.id);
  }
  state.rngState = rng.state();
  state.nextPersonId = KP.peekNextId();
  const nm = name || 'GARRISON';
  KP.openMandate(state, { kind: ages.length === 1 ? 'solo' : 'group', gender: 'm', source: 'fixture greenlight' });
  KP.proposeGroup(state, nm, ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups.find(x => x.name === nm);
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 14) KP.advanceWeek(state);
  guard = 0;
  while ((g.prep || state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) && guard++ < 40) KP.advanceWeek(state);
  // the ages are set after the debut so the fixture owns the clock
  ids.forEach((id, i) => { state.people[id].age = ages[i]; });
  return { state, g, ids, men: ids.map(id => state.people[id]) };
}
// one week, and what it wrote before the trim
function tick(state) { KP.advanceWeek(state); return (KP.lastTickNotes || []).slice(); }
function ride(state, weeks) { let all = []; for (let i = 0; i < weeks; i++) all = all.concat(tick(state)); return all; }
const firstOf = (list, ind) => (list || []).find(n => n.ind === ind) || {};
const allOf = (list, ind) => (list || []).filter(n => n.ind === ind);
const txt = n => String((n && n.text) || '');
const lands = n => { const crowd = []; for (let i = 0; i < 9; i++) crowd.push({ kind: 'company', priority: 'high', text: 'crowd ' + i }); return !!(n && n.text) && KP.trimWeekNotes(crowd.concat([n]), KP.C.EVENTS.maxInboxPerWeek).includes(n); };   // nine high letters pushed before it, and the week's budget of five (v0.11.21, §112)
// the wall takes him this tick: no door, no roll
function wall(state, man) { man.age = M.deadlineAge; return tick(state); }
// his service ends in `weeks` ticks
function shorten(state, man, weeks) { man.flags.military.until = state.week + weeks; }
function lockNow(state, g) {
  state.budget = Math.max(state.budget, 2000);
  if (!g.demos) { const rng = KP.rngFor(state); g.demos = KP.generateDemos(state, rng, g); state.rngState = rng.state(); }
  return KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
}
const led = state => state.serviceLedger || {};
// a missing window or chapter must fail a check by name, never crash the suite
const rs = g => (g && g.returnStage) || {};
const hi = g => (g && g.hiatus) || {};
function setUntil(state, g, w) { (g.returnStage = g.returnStage || { week: state.week }).until = w; }
// ride until the fade between records is running (promotions, then its own grace)
function pastFadeGrace(state, g) {
  let guard = 0;
  while (state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.decayGraceWeeks + (g.promoGrace || 0) && guard++ < 40) tick(state);
}
const FADE = KP.C.COMEBACK.popDecayPerWeek;
const GROUPISH = /whole again|every member|members|the group|They are/;

// ---- A. the shape -------------------------------------------------------------
{
  ['returnRead', 'wholeAgain', 'wholeAgainText', 'waitOut', 'soloServiceChapter', 'gateLine', 'returnSpent',
    'returnClosingText', 'returnLapsedText', 'returnLedger'].forEach(k =>
    t.ok(typeof KP[k] === 'function', 'the module carries KP.' + k));
  t.ok(M.returnClosingWeeks >= 1 && M.returnClosingWeeks < M.returnWindowWeeks, 'the closing letter comes inside the window');
  const s = KP.newGame('ret-shape', null, { legacy: false });
  tick(s);
  ['ceremonies', 'spent', 'closing', 'lapsed', 'soloChapters'].forEach(k =>
    t.eq(led(s)[k], 0, 'the service ledger carries ' + k + ' from the first week, at zero'));
  t.eq(KP.returnRead(s, { name: 'x', members: [] }), null, 'an act with no window reads as none');
  t.eq(KP.returnRead(s, null), null, 'and no act reads as none');
}

// ---- B. one man of a stagger: the chapter, the ceremony, the window ------------------
{
  const f = boys('ret-one', [24, 23, 23, 22]);
  const { state, g } = f, man = f.men[0];
  g.servicePlan = 'stagger';
  wall(state, man);
  t.ok(KP.inService(man), 'fixture: the wall took him');
  t.eq(JSON.stringify(g.wait), JSON.stringify({ since: state.week, first: man.id, out: 1 }), 'the chapter opens with the first one out');
  t.ok(!g.hiatus, 'a line that holds short is not a service chapter');
  const out = state.week;
  shorten(state, man, 3);
  const wire = ride(state, 3);
  const c = firstOf(wire, 'wholeAgain');
  t.ok(!KP.inService(man) && man.serviceDone === state.week, 'fixture: he is home');
  t.eq(c.priority, 'critical', 'the ceremony is a critical letter');
  t.eq(c.groupId, g.id, 'it carries the act');
  t.eq(c.personId, man.id, 'and the one who came home');
  t.eq(c.kind, 'company', 'it is the company’s letter');
  const away = state.week - out;
  t.ok(txt(c).startsWith('GARRISON is whole again. ' + KP.displayName(man) + ' came through the gate this week, ' +
    away + ' weeks after he went in.'), 'it says who came home and how long the act was short');
  t.ok(txt(c).includes('Lock a record by ' + KP.weekLabel(state.week + M.returnWindowWeeks).text), 'it names the window’s last week');
  t.ok(txt(c).includes('the wait the fandom saved up goes into its build-up, worth about a point of anticipation on release week.'),
    'and what a record locked inside it is worth, in the release sheet’s own points');
  t.ok(!/\b26\b/.test(txt(c)), 'the engine’s own number, which no screen shows, is not in the letter');
  t.eq(KP.returnWorth(), Math.max(1, Math.round(M.returnBuildup / KP.C.TEASER.anticipationPer)), 'the worth is the banked build-up over the sheet’s rate');
  t.eq(KP.returnWorthWords(), 'about a point of anticipation on release week', 'said as a point');
  t.ok(txt(c).includes('it is a RETURN'), 'the next date is a RETURN');
  t.ok(!/ordinary hiatus/.test(txt(c)), 'no hiatus clock is named where none is running');
  t.ok(!wire.some(n => /every member home, every clock running/.test(txt(n))), 'the old sentence is gone');
  t.eq(allOf(wire, 'wholeAgain').length, 1, 'one ceremony');
  t.eq(JSON.stringify(g.returnStage), JSON.stringify({ week: state.week, until: state.week + M.returnWindowWeeks, away }),
    'the window carries its last week and the chapter’s length');
  t.ok(!g.wait, 'the ceremony closes the chapter');
  t.eq(led(state).returns, 1, 'the ledger counts the return');
  t.eq(led(state).ceremonies, 1, 'and the ceremony');
  // a critical letter survives any week
  const crowd = [];
  for (let i = 0; i < 9; i++) crowd.push({ kind: 'company', priority: 'high', text: 'crowd ' + i });
  const kept = c.ind ? KP.trimWeekNotes(crowd.concat([c]), KP.C.EVENTS.maxInboxPerWeek) : [];
  t.ok(kept.includes(c), 'nine high letters in the same week do not push it out');
  // the timeline
  const react = KP.feedReactionFor('wholeAgain');
  const post = react ? react(state, c, { pick: xs => xs[0] }) : null;
  t.ok(post && /GARRISON is WHOLE/.test(post.text), 'the timeline says the act is whole');
  // the read
  const r = KP.returnRead(state, g) || {};
  t.eq(JSON.stringify(r), JSON.stringify({ since: state.week, until: state.week + M.returnWindowWeeks, left: M.returnWindowWeeks,
    open: true, closing: false, banks: M.returnBuildup, worth: KP.returnWorth(), away }), 'the window reads open, with its weeks left');
  const before = KP.serialize(state);
  KP.returnRead(state, g); KP.wholeAgainText(state, g, man, { since: out, first: man.id, out: 1 });
  t.eq(KP.serialize(state), before, 'the reads change nothing');
  // an old-shape stage reads the same last week
  const oldShape = { name: 'x', members: g.members, returnStage: { week: state.week } };
  t.eq((KP.returnRead(state, oldShape) || {}).until, state.week + M.returnWindowWeeks, 'a window stamped before this version reads the same last week');
  t.eq((KP.returnRead(state, oldShape) || {}).away, null, 'and no length it never recorded');
}

// ---- C. the window: closing, its last week, closed ---------------------------------
{
  const f = boys('ret-window', [24, 23, 23, 22]);
  const { state, g } = f, man = f.men[0];
  g.servicePlan = 'stagger';
  wall(state, man); shorten(state, man, 2); ride(state, 2);
  const until = (g.returnStage || {}).until;
  t.ok(until === state.week + M.returnWindowWeeks, 'fixture: the window is open');
  // quiet until the closing week
  const quiet = ride(state, M.returnWindowWeeks - M.returnClosingWeeks - 1);
  t.eq(allOf(quiet, 'returnClosing').length + allOf(quiet, 'returnLapsed').length, 0, 'the window says nothing while there is time');
  t.ok((KP.returnRead(state, g) || {}).closing === false, 'and the week before the closing week the read does not say closing');
  const wk = tick(state);
  const cl = firstOf(wk, 'returnClosing');
  t.eq(until - state.week, M.returnClosingWeeks, 'fixture: this is the closing week');
  t.eq(cl.priority, 'critical', 'the closing letter is critical: its one week is the only week it can be said in');
  t.ok(lands(cl), 'and a loud week does not cut it');
  t.eq(cl.groupId, g.id, 'it carries the act');
  t.ok(txt(cl).startsWith('Four weeks are left on GARRISON’s return window.'), 'it counts the weeks left');
  t.ok(txt(cl).includes('A record locked by ' + KP.weekLabel(until).text + ' is THE RETURN'), 'it names the last week');
  t.ok(txt(cl).includes('is THE RETURN, and the wait the fandom saved up goes into its build-up.'), 'and what it banks');
  t.ok(!/locked before the gate/.test(txt(cl)), 'no record is in production, and it does not say one is');
  t.eq(led(state).closing, 1, 'the ledger counts it');
  t.ok((KP.returnRead(state, g) || {}).closing === true, 'the read says closing');
  // a record locked before the gate is not the return, and the letter says so
  const inProd = Object.assign({}, g, { prep: { scheduledWeek: state.week + 3 } });
  t.ok(/The record in production was locked before the gate, so it is not the return\./.test(KP.returnClosingText(state, inProd, KP.returnRead(state, g))),
    'with a record in production the letter says it is not the return');
  t.ok(/^One week is left on /.test(KP.returnClosingText(state, g, Object.assign({}, KP.returnRead(state, g), { left: 1 }))), 'one week is one week');
  // said once
  const after = ride(state, M.returnClosingWeeks);
  t.eq(allOf(after, 'returnClosing').length, 0, 'the closing letter is said once');
  t.eq(allOf(after, 'returnLapsed').length, 0, 'and the window does not close before its last week is over');
  t.eq(state.week, until, 'fixture: this is the last week');
  const last = KP.returnRead(state, g) || {};
  t.ok(last.open === true && last.left === 0, 'the last week is still open');
  // twins on the last week: one locks, one lets it go
  const lockFork = KP.deserialize(KP.serialize(state));
  const lg = lockFork.groups.find(x => x.id === g.id);
  const r = lockNow(lockFork, lg);
  t.ok(r && r.ok !== false, 'fixture: a record locks in the last week');
  t.ok(lg.prep && lg.prep.buildup >= M.returnBuildup, 'a lock in the last week is the return: the countdown opens banked');
  t.eq(led(lockFork).spent, 1, 'the ledger says the window was spent');
  t.ok(!lg.returnStage, 'and the moment is spent');
  t.ok(lockFork.inbox.some(n => n.ind === 'eraAnnounced' && /^THE RETURN: /.test(txt(n))), 'the announcement reads THE RETURN');
  const lockAfter = ride(lockFork, 3);
  t.eq(allOf(lockAfter, 'returnLapsed').length, 0, 'a spent window never lapses');
  t.eq(led(lockFork).lapsed, 0, 'on the ledger either');
  // the other twin: the week after
  const gone = tick(state);
  const lp = firstOf(gone, 'returnLapsed');
  t.eq(lp.priority, 'critical', 'the window closing is a critical letter');
  t.eq(lp.groupId, g.id, 'it carries the act');
  t.ok(txt(lp).startsWith('The return window for GARRISON closed this week. It stood open ' + M.returnWindowWeeks + ' weeks after the gate'),
    'it says the window closed and how long it stood');
  t.ok(txt(lp).includes('its build-up starts from nothing'), 'and what the next record is');
  t.ok(!g.returnStage, 'the window is gone');
  t.eq(KP.returnRead(state, g), null, 'and reads as none');
  t.eq(led(state).lapsed, 1, 'the ledger counts the lapse');
  const react = KP.feedReactionFor('returnLapsed');
  t.ok(react && /GARRISON/.test((react(state, lp, { pick: xs => xs[0] }) || {}).text || ''), 'the timeline says what the fandom made of it');
  const r2 = lockNow(state, g);
  t.ok(r2 && r2.ok !== false, 'fixture: a record locks after the window');
  t.ok(g.prep && (g.prep.buildup || 0) < M.returnBuildup, 'a lock after the window is a comeback like any other');
  t.eq(led(state).spent, 0, 'and spends nothing');
  t.ok(!state.inbox.some(n => n.ind === 'eraAnnounced' && /^THE RETURN: /.test(txt(n))), 'its announcement is not THE RETURN');
  t.eq(allOf(ride(state, 3), 'returnLapsed').length, 0, 'the lapse is said once');
}

// ---- D. an act that ended holds no window ------------------------------------------
{
  const f = boys('ret-ended', [24, 23, 23, 22]);
  const { state, g } = f, man = f.men[0];
  g.servicePlan = 'stagger';
  wall(state, man); shorten(state, man, 2); ride(state, 2);
  t.ok(g.returnStage, 'fixture: the window is open');
  const twin = KP.deserialize(KP.serialize(state));
  const tg = twin.groups.find(x => x.id === g.id);
  setUntil(twin, tg, twin.week);         // its last week, in both
  setUntil(state, g, state.week);
  g.retiredWeek = state.week;            // this one ended
  const a = ride(state, 2), b = ride(twin, 2);
  t.ok(!g.returnStage, 'the ended act’s window is cleared');
  t.eq(allOf(a, 'returnLapsed').length, 0, 'with no letter about a banner for an act that is gone');
  t.eq(led(state).lapsed, 0, 'and nothing on the ledger');
  t.eq(allOf(b, 'returnLapsed').length, 1, 'the twin that is still running does get the letter');
}

// ---- the lock keeps its own guard: a window past its last week banks nothing ------
{
  const f = boys('ret-late-lock', [24, 23, 23, 22]);
  const { state, g } = f, man = f.men[0];
  g.servicePlan = 'stagger';
  wall(state, man); shorten(state, man, 2); ride(state, 2);
  t.ok(g.returnStage, 'fixture: the window is open');
  setUntil(state, g, state.week - 1);    // a window the weekly never got to clear
  const r = lockNow(state, g);
  t.ok(r && r.ok !== false, 'fixture: a record locks');
  t.ok(g.prep && (g.prep.buildup || 0) < M.returnBuildup, 'a window past its last week banks nothing at the lock');
  t.eq(led(state).spent, 0, 'and is not counted as spent');
  t.ok(!g.returnStage, 'the stale window is cleared at the lock');
}

// ---- two chapters, one after the other: the second is its own ------------------------
{
  const f = boys('ret-second', [24, 24, 23, 22]);
  const { state, g } = f, a = f.men[0], b = f.men[1];
  g.servicePlan = 'stagger';
  wall(state, a); shorten(state, a, 2);
  const c1 = firstOf(ride(state, 2), 'wholeAgain');
  t.ok(/came through the gate this week/.test(txt(c1)), 'fixture: the first chapter closed');
  ride(state, 3);
  wall(state, b);
  const out2 = state.week;
  t.eq(JSON.stringify(g.wait), JSON.stringify({ since: out2, first: b.id, out: 1 }), 'the next man out opens a new chapter');
  shorten(state, b, 2);
  const c2 = firstOf(ride(state, 2), 'wholeAgain');
  t.ok(txt(c2).startsWith('GARRISON is whole again. ' + KP.displayName(b) + ' came through the gate this week, ' + (state.week - out2) +
    ' weeks after he went in.'), 'a man who served an earlier chapter is not counted home in this one');
  t.eq(led(state).ceremonies, 2, 'two chapters, two ceremonies');
  t.eq(rs(g).away, state.week - out2, 'the second window carries the second chapter');
}

// ---- E. together -----------------------------------------------------------------
{
  const f = boys('ret-together', [26, 25, 24, 24]);
  const { state, g } = f;
  g.servicePlan = 'together'; g.pendingService = true;
  tick(state);
  t.eq(f.men.filter(m => KP.inService(m)).length, 4, 'fixture: all four went');
  t.eq(JSON.stringify(g.wait), JSON.stringify({ since: state.week, first: g.wait && g.wait.first, out: 4 }), 'one chapter for the four of them');
  t.ok(g.hiatus && g.hiatus.service, 'the group’s chapter is a service chapter');
  {
    const { App, el } = dom.load();
    App.state = state; App.mode = 'game'; App.tab = 'groups'; App.view = { type: 'grouppage', id: g.id }; App.render();
    const card = dom.stripTags(el('screen').innerHTML);
    t.ok(card.includes('The service chapter') && card.includes('the group enlisted together and the fandom is running the wait like a project.'), 'a group’s service card is still a group’s');
    t.ok(card.includes('the slow fade between records still does. Last discharge expected ' + KP.weekLabel(state.week + M.serviceWeeks).text),
      'it says what stops and what does not, and when the last of them is home');
    t.ok(!/is in service and the act waits with/.test(card), 'and it does not speak of one person');
  }
  const out = state.week;
  f.men.forEach(m => shorten(state, m, 3));
  const wire = ride(state, 3);
  const c = firstOf(wire, 'wholeAgain');
  t.ok(txt(c).startsWith('GARRISON is whole again. All four came through the gate this week, ' + (state.week - out) +
    ' weeks after they went in together.'), 'all four, the same week, and how long');
  t.ok(txt(c).includes('The chapter itself converts whenever the return record lands, the way a declared hiatus does.'),
    'the ceremony says the chapter converts on the return record');
  t.ok(txt(c).includes('But the wait is an ordinary hiatus from today: the fandom’s patience holds ' + H.graceWeeks + ' weeks'),
    'and that the ordinary clock is running');
  t.ok(g.hiatus && g.hiatus.service === false && g.hiatus.graceFrom === state.week, 'the clock restarted at the gate');
  t.eq(allOf(wire, 'wholeAgain').length, 1, 'one ceremony for the four of them');
  t.eq((g.returnStage || {}).away, state.week - out, 'the window carries the chapter’s length');
}
{
  // two go, two are too young: "both"
  const f = boys('ret-both', [26, 25, 19, 19]);
  const { state, g } = f;
  g.servicePlan = 'together'; g.pendingService = true;
  tick(state);
  t.eq(f.men.filter(m => KP.inService(m)).length, 2, 'fixture: the two of age went');
  f.men.filter(m => KP.inService(m)).forEach(m => shorten(state, m, 2));
  const c = firstOf(ride(state, 2), 'wholeAgain');
  t.ok(/^GARRISON is whole again\. Both came through the gate this week, \d+ weeks after they went in together\./.test(txt(c)), 'two is both');
}

// ---- F. a stagger with two away at once ----------------------------------------------
{
  const f = boys('ret-overlap', [24, 24, 23, 22]);
  const { state, g } = f, a = f.men[0], b = f.men[1];
  g.servicePlan = 'stagger';
  wall(state, a);
  const out = state.week;
  ride(state, 4);
  wall(state, b);
  t.eq(JSON.stringify(g.wait), JSON.stringify({ since: out, first: a.id, out: 2 }), 'the second one out joins the chapter the first one opened');
  shorten(state, a, 2); shorten(state, b, 6);
  const w1 = ride(state, 2);
  t.ok(!KP.inService(a) && KP.inService(b), 'fixture: the first is home, the second is not');
  t.eq(allOf(w1, 'wholeAgain').length, 0, 'no ceremony while the act is still short');
  t.ok(!g.returnStage && g.wait, 'no window, and the chapter is still open');
  const w2 = ride(state, 4);
  const c = firstOf(w2, 'wholeAgain');
  t.ok(txt(c).startsWith('GARRISON is whole again. ' + KP.displayName(b) + ' is the last one home, ' + (state.week - out) +
    ' weeks after ' + KP.displayName(a) + ' went in.'), 'the last one home, counted from the first one out');
  t.eq(c.personId, b.id, 'the letter carries the last one home');
  t.eq((g.returnStage || {}).away, state.week - out, 'the window carries the whole chapter');
}

// ---- G. a soloist ------------------------------------------------------------------
{
  const f = boys('ret-solo', [24], 'SOLOMAN');
  const { state, g } = f, man = f.men[0];
  t.eq(g.members.length, 1, 'fixture: a one-man act');
  wall(state, man);
  t.ok(KP.inService(man), 'fixture: the wall took him');
  t.eq(JSON.stringify(g.hiatus), JSON.stringify({ since: state.week, service: true }), 'the whole act away is a service chapter, the same week');
  t.eq(led(state).soloChapters, 1, 'on the ledger');
  const out = state.week;
  const no = KP.declareHiatus(state, g.id);
  t.ok(no.ok === false && /service chapter/.test(no.reason || ''), 'the desk cannot declare an ordinary hiatus over a man in service');
  t.ok(/the forgetting a declared hiatus brings does not run/.test(no.reason || '') && !/nothing cools/i.test(no.reason || ''),
    'and the reason says what stops, not that nothing cools');
  t.ok(g.hiatus && g.hiatus.service === true && !g.hiatus.coolNoted, 'and the chapter stands');
  // the page, in a person's words
  const { App, el } = dom.load();
  const page = () => { App.state = state; App.mode = 'game'; App.tab = 'groups'; App.view = { type: 'grouppage', id: g.id }; App.render(); return dom.stripTags(el('screen').innerHTML); };
  const p1 = page();
  t.ok(p1.includes(KP.displayName(man) + ' is in service and the act waits with him.'), 'the group page says who is away, in his words');
  t.ok(!/the group enlisted together/.test(p1), 'and not that a group enlisted together');
  t.ok(p1.includes('The forgetting a declared hiatus brings does not run while the reason is the law; the slow fade between records still does.'),
    'the card says what stops and what does not');
  t.ok(!/Nothing cools/.test(p1), 'and no longer that nothing cools');
  // the full service: nothing cools on the hiatus clock
  const served = ride(state, H.graceWeeks + 12);
  t.ok(g.hiatus && !g.hiatusCooledEver && !hi(g).coolNoted, 'nothing cools on the hiatus clock while he serves');
  t.eq(allOf(served, 'hiatusCooling').length, 0, 'and no letter says it has');
  t.eq(led(state).soloChapters, 1, 'the chapter is opened once');
  // exactly what the chapter costs: the fade between records, with no hiatus cooling on top
  pastFadeGrace(state, g);
  g.popularity = 50;
  ride(state, 10);
  t.ok(Math.abs((50 - g.popularity) - 10 * FADE) < 1e-9, 'ten weeks of the chapter cost the fade between records and nothing more (' + (50 - g.popularity).toFixed(2) + ')');
  shorten(state, man, 2);
  const w0 = state.week;
  const wire = ride(state, 2);
  const gate = state.inbox.find(n => n.ind === 'discharged' && n.week > w0) || {};
  t.ok(txt(gate).includes('met at the gate by his managers and a fan-organized coffee truck'), 'the gate letter is one person’s');
  t.ok(!/members/.test(txt(gate)), 'nobody met him who is not there');
  const c = firstOf(wire, 'wholeAgain');
  t.ok(txt(c).startsWith(KP.displayName(man) + ' is home, ' + (state.week - out) + ' weeks after he went in. The solo desk is open again.'),
    'the ceremony is one person’s');
  t.ok(!GROUPISH.test(txt(c)), 'with no group words in it');
  t.eq(c.priority, 'critical', 'critical all the same');
  t.ok(txt(c).includes('the wait is an ordinary hiatus from today'), 'and it says the ordinary clock is running');
  t.ok(g.hiatus && g.hiatus.service === false && g.hiatus.graceFrom === state.week, 'the clock restarted at the gate');
  const react = KP.feedReactionFor('wholeAgain');
  const post = react ? react(state, c, { pick: xs => xs[0] }) : null;
  t.ok(post && post.text.startsWith(KP.publicGiven(man) + ' is HOME'), 'the timeline says he is home');
  // the hiatus card counts patience from the gate
  const p2 = page();
  t.ok(p2.includes('He is home, and the gate renewed the fandom’s patience: ' + H.graceWeeks + ' weeks of it left before the numbers start to cool.'),
    'the hiatus card counts patience from the gate');
  t.ok(!/Past the grace window/.test(p2), 'and does not say the grace is spent the week he came home');
  t.ok(/The return window/.test(p2) && p2.includes('Open until ' + KP.weekLabel(state.week + M.returnWindowWeeks).text), 'the page shows the window and its last week');
  ride(state, H.graceWeeks);
  t.ok(page().includes('this is its last week before the numbers start to cool'), 'the last week of patience is named');
  ride(state, 1);
  t.ok(/Past the grace window now/.test(page()), 'and after it the card says so');
  // the return: the teaser shows one person
  const r = lockNow(state, g);
  t.ok(r && r.ok !== false, 'fixture: his return locks');
  const ann = state.inbox.find(n => n.ind === 'returnAnnounced') || {};
  t.ok(/a teaser photo of one silhouette\./.test(txt(ann)), 'the teaser shows one silhouette');
  t.eq(led(state).spent, 1, 'and the window was spent');
}
{
  // the gate letter of a group still says who met him
  const f = boys('ret-gate', [24, 23, 23, 22]);
  const { state, g } = f, man = f.men[0];
  g.servicePlan = 'stagger';
  wall(state, man); shorten(state, man, 2);
  const w0 = state.week;
  ride(state, 2);
  const gate = state.inbox.find(n => n.ind === 'discharged' && n.week > w0) || {};
  t.ok(txt(gate).includes('met at the gate by managers, members, and a fan-organized coffee truck'), 'a group’s gate letter still has the members in it');
  // and the teaser shows the act's own count
  t.ok(KP.declareHiatus(state, g.id).ok, 'fixture: a four-man act goes on hiatus');
  KP.hiatusReturnLock(state, g);
  t.ok(state.inbox.some(n => n.ind === 'returnAnnounced' && /a teaser photo of four silhouettes\./.test(txt(n))), 'four silhouettes for four');
}
{
  const f = boys('ret-five', [22, 22, 22, 21, 21]);
  const { state, g } = f;
  t.ok(KP.declareHiatus(state, g.id).ok, 'fixture: a five-man act goes on hiatus');
  KP.hiatusReturnLock(state, g);
  t.ok(state.inbox.some(n => n.ind === 'returnAnnounced' && /a teaser photo of five silhouettes\./.test(txt(n))), 'five silhouettes for five, where it said four');
}
{
  // the desk declared an ordinary hiatus first; then the wall took him
  const f = boys('ret-solo-declared', [24], 'SOLOMAN');
  const { state, g } = f, man = f.men[0];
  t.ok(KP.declareHiatus(state, g.id).ok, 'fixture: the act is on an ordinary hiatus');
  const since = hi(g).since;
  wall(state, man);
  t.eq(JSON.stringify(g.hiatus), JSON.stringify({ since, service: true }), 'the hiatus that was running becomes the service chapter, from its own first week');
  ride(state, H.graceWeeks + 8);
  t.ok(!g.hiatusCooledEver, 'and stops cooling while the reason is the law');
  t.eq(led(state).soloChapters, 1, 'counted once');
}
{
  // the wall during promotions: the chapter waits for the calendar
  const f = boys('ret-solo-promo', [24], 'SOLOMAN');
  const { state, g } = f, man = f.men[0];
  g.promoUntil = state.week + 3;
  wall(state, man);
  t.ok(KP.inService(man) && !g.hiatus, 'promotions are running: the chapter does not open over them');
  t.eq(led(state).soloChapters, 0, 'and the ledger waits');
  ride(state, 1);
  t.ok(!g.hiatus, 'still running');
  ride(state, 2);
  t.ok(g.hiatus && g.hiatus.service === true, 'the week the calendar clears, the chapter opens');
  t.eq(hi(g).since, state.week, 'from that week');
  t.eq(led(state).soloChapters, 1, 'on the ledger');
}

// ---- H. the page and the studio -----------------------------------------------------
{
  const f = boys('ret-page', [24, 23, 23, 22]);
  const { state, g } = f, man = f.men[0];
  g.servicePlan = 'stagger';
  const { App, el, UI } = dom.load();
  const raw = () => { App.state = state; App.mode = 'game'; App.tab = 'groups'; App.view = { type: 'grouppage', id: g.id }; App.render(); return el('screen').innerHTML; };
  const page = () => dom.stripTags(raw());
  // the Studio with a song picked: the view that carries the lock button
  const studio = () => {
    if (!g.demos) { const rng = KP.rngFor(state); g.demos = KP.generateDemos(state, rng, g); state.rngState = rng.state(); }
    App.state = state; App.mode = 'game'; App.tab = 'studio'; App.view = null; App.resetDrafts();
    App.studioGroupId = g.id; App.studioDraft.songId = g.demos[0].id;
    App.render();
    return dom.stripTags(el('screen').innerHTML);
  };
  t.ok(!/The return window/.test(page()), 'no window, no card');
  const s0 = studio();
  t.ok(s0.includes('Lock the comeback') && !s0.includes('Lock the return'), 'with no window the Studio locks a comeback');
  t.ok(!/The return window is open until/.test(s0), 'and says nothing about a window');
  wall(state, man); shorten(state, man, 2); ride(state, 2);
  const p = page();
  t.ok(p.includes('Open until ' + KP.weekLabel(rs(g).until).text), 'the card names the last week');
  t.ok(p.includes(M.returnWindowWeeks + ' weeks left.'), 'and the weeks left');
  t.ok(p.includes('the wait the fandom saved up goes into its build-up, worth about a point of anticipation on release week.'), 'and what it is worth');
  t.ok(p.includes('The act was short for ' + rs(g).away + ' week'), 'and how long the act was short');
  t.ok(raw().includes('return window · ' + M.returnWindowWeeks + ' wks</span>'), 'the hero carries a chip with the count');
  t.ok(p.includes('Plan the return'), 'and the card leads to the Studio');
  setUntil(state, g, state.week + 1);
  t.ok(page().includes('1 week left.'), 'one week is one week on the card');
  t.ok(raw().includes('return window · 1 wk</span>'), 'and on the chip');
  setUntil(state, g, state.week);
  t.ok(page().includes('this is its last week.'), 'the last week is named');
  // a record locked before the gate
  const fake = Object.assign({}, g, { prep: { scheduledWeek: state.week + 2 } });
  const card = dom.stripTags(UI.returnWindowCard(state, fake));
  t.ok(card.includes('The record in production was locked before the gate, so it is not the return.') && !card.includes('Plan the return'),
    'with a record in production the card says it is not the return and offers no button');
  t.eq(UI.returnWindowCard(state, { name: 'x', members: [] }), '', 'an act with no window gets no card');
  // the Studio: the lock is what spends the window, so the lock says so
  setUntil(state, g, state.week + 9);
  const s1 = studio();
  t.ok(s1.includes('Lock the return') && !s1.includes('Lock the comeback'), 'with the window open the Studio’s button locks the return');
  t.ok(s1.includes('The return window is open until ' + KP.weekLabel(rs(g).until).text + '. Locked this week, this record is THE RETURN whatever date it carries: ' +
    'the wait the fandom saved up goes into its build-up, worth about a point of anticipation on release week.'),
    'and a note says the lock is what counts, not the date, and what it is worth');
  // closed: the card, the chip and the button go back
  setUntil(state, g, state.week - 1);
  t.ok(!/The return window/.test(page()) && !/return window ·/.test(page()), 'a window past its last week shows no card and no chip');
  t.ok(studio().includes('Lock the comeback'), 'and the Studio locks a comeback again');
}

// ---- I. old saves ------------------------------------------------------------------
{
  const f = boys('ret-old', [24, 23, 23, 22]);
  const { state, g } = f, man = f.men[0];
  g.servicePlan = 'stagger';
  wall(state, man);
  ride(state, 4);
  const since = (man.flags.military || {}).since;
  t.ok(since < state.week, 'fixture: he left some weeks ago');
  // an old file: a man away, no chapter, a ledger without the new sums
  const old = JSON.parse(KP.serialize(state));
  old.version = '0.11.17';
  const og0 = old.groups.find(x => x.id === g.id);
  delete og0.wait;
  ['ceremonies', 'spent', 'closing', 'lapsed', 'soloChapters'].forEach(k => delete old.serviceLedger[k]);
  const s = KP.deserialize(JSON.stringify(old));
  const og = s.groups.find(x => x.id === g.id), om = s.people[man.id];
  t.eq(s.version, KP.C.VERSION, 'the old file is brought to this version');
  t.eq(JSON.stringify(og.wait), JSON.stringify({ since, first: man.id, out: 1 }), 'an act that is short today gets its chapter');
  ['ceremonies', 'spent', 'closing', 'lapsed', 'soloChapters'].forEach(k => t.eq(led(s)[k], 0, 'the old ledger gains ' + k + ' at zero'));
  shorten(s, om, 2);
  const c = firstOf(ride(s, 2), 'wholeAgain');
  t.ok(/came through the gate this week, \d+ weeks after he went in\./.test(txt(c)), 'and its ceremony can say how long');
}
{
  const f = boys('ret-old-window', [24, 23, 23, 22]);
  const { state, g } = f, man = f.men[0];
  g.servicePlan = 'stagger';
  wall(state, man); shorten(state, man, 2); ride(state, 2);
  const stamped = rs(g).week;
  // an old file with a window that is still open
  const open = JSON.parse(KP.serialize(state));
  open.version = '0.11.17';
  open.groups.find(x => x.id === g.id).returnStage = { week: stamped };
  const so = KP.deserialize(JSON.stringify(open));
  const go = so.groups.find(x => x.id === g.id);
  t.eq(JSON.stringify(go.returnStage), JSON.stringify({ week: stamped, until: stamped + M.returnWindowWeeks }), 'an open window on an old file gets its last week');
  // and one that closed long before this version
  ride(state, 3);
  const shut = JSON.parse(KP.serialize(state));
  shut.version = '0.11.17';
  shut.groups.find(x => x.id === g.id).returnStage = { week: state.week - M.returnWindowWeeks - 9 };
  const ss = KP.deserialize(JSON.stringify(shut));
  const gs = ss.groups.find(x => x.id === g.id);
  t.ok(!gs.returnStage, 'a window that closed before this version is cleared');
  const wire = ride(ss, 2);
  t.eq(allOf(wire, 'returnLapsed').length, 0, 'quietly: no late letter about it');
  t.eq(led(ss).lapsed, 0, 'and nothing on the ledger');
  // a current file is not migrated again
  const cur = KP.deserialize(KP.serialize(state));
  t.eq(JSON.stringify(cur.groups.find(x => x.id === g.id).returnStage), JSON.stringify(g.returnStage), 'a current file’s window is left as it is');
}
{
  // the trap on an old file: an ordinary hiatus declared over a soloist in service
  const f = boys('ret-old-trap', [24], 'SOLOMAN');
  const { state, g } = f, man = f.men[0];
  wall(state, man);
  const old = JSON.parse(KP.serialize(state));
  old.version = '0.11.17';
  const og0 = old.groups.find(x => x.id === g.id);
  og0.hiatus = { since: old.week - H.graceWeeks - 5, coolNoted: true };   // declared, and cooling
  delete og0.wait;
  const s = KP.deserialize(JSON.stringify(old));
  const og = s.groups.find(x => x.id === g.id);
  t.ok(og.hiatus && !og.hiatus.service, 'fixture: the old file’s act is cooling on an ordinary hiatus');
  tick(s);
  t.ok(og.hiatus && og.hiatus.service === true, 'the first week reads the act as a service chapter');
  t.eq(hi(og).since, old.week - H.graceWeeks - 5, 'from the week the hiatus was declared');
  pastFadeGrace(s, og);
  og.popularity = 50;
  ride(s, 6);
  t.ok(Math.abs((50 - og.popularity) - 6 * FADE) < 1e-9, 'and the forgetting stops: six weeks cost the fade between records and nothing more (' + (50 - og.popularity).toFixed(2) + ')');
}

// ---- J. determinism -----------------------------------------------------------------
{
  const f = boys('ret-fork', [24, 24, 23, 22]);
  const { state, g } = f, a = f.men[0], b2 = f.men[1];
  g.servicePlan = 'stagger';
  wall(state, a); shorten(state, a, 3);
  const b = KP.deserialize(KP.serialize(state));
  for (let w = 0; w < 3; w++) { KP.advanceWeek(state); KP.advanceWeek(b); }
  t.eq(KP.serialize(state), KP.serialize(b), 'a chapter and its ceremony fork clean');
  for (let w = 0; w < M.returnWindowWeeks + 3; w++) { KP.advanceWeek(state); KP.advanceWeek(b); }
  t.eq(KP.serialize(state), KP.serialize(b), 'and so do the closing letter and the lapse');
  t.eq(led(state).lapsed, 1, 'fixture: the fork rode through a lapse');
  // a window that is only open draws nothing
  wall(state, b2); shorten(state, b2, 2); ride(state, 2);
  t.ok(g.returnStage, 'fixture: a second window is open');
  const withWin = KP.deserialize(KP.serialize(state));
  const without = KP.deserialize(KP.serialize(state));
  delete without.groups.find(x => x.id === g.id).returnStage;
  KP.advanceWeek(withWin); KP.advanceWeek(without);
  t.eq(JSON.stringify(withWin.rngState), JSON.stringify(without.rngState), 'an open window draws nothing in a week it says nothing');
  t.eq(JSON.stringify(KP.validateState(state)), '[]', 'the state is valid at the end of it');
}

t.finish();
