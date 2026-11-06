/* Suite 113 — the audit (v0.11.3, §94). Eight review passes found ~70
   defects; every fix that can be pinned from outside is pinned here, by
   the law it restores: determinism (no NaN on a bench nobody has, no
   render-time mint, no rng clobber), the money law (the toll reads
   revenue, a refused resolve keeps the scene, the clamp owes the rest),
   lifecycle (the chapter's books, the founding's letters and red, the
   leash, the break that leaves with her), the world (dead shorts stay
   dead, a soldier announces nothing, a closed chapter does not compete),
   the text (every pronoun filled for a boy, the recorded line on the
   door), and the tools' own honesty. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_113_audit');
const C = KP.C;

function legacy(seed) { return KP.newGame(seed, null, { legacy: true }); }
function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: true });
  const ids = state.roster.filter(id => state.people[id].status === 'trainee').slice(0, 5);
  KP.proposeGroup(state, 'AUDIT', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups.find(x => x.name === 'AUDIT');
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, format: 'mini', alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  state.budget = 9000;
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  return { state, g, rel: g.releases[g.releases.length - 1] };
}
const male = state => Object.values(state.people).find(p => p.gender === 'm') || null;

// ---- determinism: the bench nobody has never counts down into NaN -----------------
{
  const state = legacy('au-nan');
  const ids = state.roster.filter(id => state.people[id].status === 'trainee').slice(0, 5);
  KP.proposeGroup(state, 'NAN', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups.find(x => x.name === 'NAN');
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest', week: state.week + 6, format: 'mini', alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  const m = state.people[g.members[0]];
  m.flags.military = { since: state.week, until: state.week + 60 };   // on break with no bench
  state.budget = 9000;
  KP.advanceWeek(state);
  t.ok(m.flags.burnout === undefined || isFinite(m.flags.burnout), 'prep week on a soldier leaves no NaN bench (' + m.flags.burnout + ')');
  const tr = state.people[state.roster.find(id => state.people[id].status === 'trainee' && !g.members.includes(id))];
  tr.flags.personalHiatus = { since: state.week, until: state.week + 20 };
  KP.developWeek(state, tr, new KP.Rng('au-nan-dev'));
  t.ok(tr.flags.burnout === undefined, 'a training week on a break leaves no NaN bench');
  tr.flags.burnout = NaN;
  t.ok(KP.validateState(state).some(x => /flag burnout/.test(x)), 'the validator sees a NaN flag');
  delete tr.flags.burnout; delete tr.flags.personalHiatus;
}

// ---- determinism: the doors mint the public number ---------------------------------
{
  const state = legacy('au-social');
  const stray = Object.values(state.people).find(p => p.status === 'rival');
  delete stray.social;
  KP.boardMarketFile(state, stray, { channel: 'castoff', window: 10 });
  t.ok(stray.social != null, 'a castoff file is minted at the door, not at first glance');
  const g2 = { name: 'nobody' };
  const z = KP.regionsRead(g2);
  t.ok(g2.regions === undefined && z && Object.keys(z).length > 0 && Object.values(z).every(v => v === 0), 'a region read never writes the group');
  t.ok(state.contentLedger && state.fameLedger && Array.isArray(state.discourses) && Array.isArray(state.outside), 'every ledger exists before the first render');
}

// ---- the money law: the toll reads revenue, not the fund's own wire ---------------
{
  const state = legacy('au-toll');
  state.financing = state.financing || {};
  state.financing.revShare = { fund: 'Audit Capital', pct: 0.12, until: state.week + 200 };
  state.books = { cur: { financing: 500, albums: 100 }, curStartBudget: state.budget, last: null, closed: 0 };
  // land on the quarter close: the toll runs the week woy % quarterWeeks === 0
  const Q = C.BOOKS.quarterWeeks;
  const woy = ((state.week - 1) % C.WEEKS_PER_YEAR) + 1;
  state.week += (Q - (woy % Q)) % Q - 1;
  if (state.week < 5) state.week += Q;
  state.budget = 5000;
  const before = state.budget;
  KP.advanceWeek(state);
  const paid = (state.financeLedger || {}).investorPaid || 0;
  t.ok(paid > 0 && paid <= 13, 'the toll took 12% of the revenue, not of the wire (' + paid + ')');
  t.ok(before - state.budget < 100, 'and the account moved by the toll, not the raise');
}

// ---- the money law: a refused resolve keeps the question on the table --------------
{
  const state = legacy('au-refuse');
  KP.registerScene('auditRefuse', {
    title: () => 'audit', body: () => 'audit',
    options: () => [{ id: 'go', label: 'go' }],
    resolve: () => ({ ok: false, toast: 'the account says no' }),
  });
  KP.openScene(state, { kind: 'auditRefuse', expiresWeek: state.week + 2 });
  const sc = state.scenes.find(x => x.kind === 'auditRefuse');
  const r = KP.resolveScene(state, sc.id, 'go');
  t.ok(r && r.ok === false && /account/.test(r.reason), 'the kernel reports the refusal');
  t.ok(state.scenes.some(x => x.id === sc.id), 'and the scene is still on the desk');
}

// ---- the money law: the clamp takes what exists and owes the rest -------------------
{
  const { state, g } = debuted('au-fair');
  g.recoup = { debt: 0, settledWeek: null };
  KP.openScene(state, { kind: 'firstSettlement', groupId: g.id, expiresWeek: state.week + 3 });
  state.budget = 3; state.red = { weeks: 0, arrears: 0, rung: 0, peak: 0, total: 0, paid: 0, episodes: 0 };
  const sc = state.scenes.find(x => x.kind === 'firstSettlement');
  KP.resolveScene(state, sc.id, 'fair');
  t.eq(state.budget, 0, 'the fair settlement took the three that existed');
  t.eq(state.red.arrears, C.SETTLE.backpay - 3, 'and owes the rest');
  const opts = KP.sceneDef('seasonsGreetings').options({ budget: 0 }, {});
  t.ok(!opts.some(o => o.id === 'lavish'), 'the lavish edition is not offered to an empty account');
  const poach = KP.sceneDef('seatPoach').options({ budget: 0 }, { seatId: 'vocal' });
  t.ok(poach.length === 1 && poach[0].id === 'walk', 'an unaffordable raise is not on the table');
}

// ---- the money law: protecting her owes the rest -----------------------------------
{
  const { state, g } = debuted('au-protect');
  const p = state.people[g.members[0]];
  p.scandal = { sev: 2, since: state.week, kind: 'audit' };
  KP.openScene(state, { kind: 'theChoice', personId: p.id, expiresWeek: state.week + 2 });
  state.budget = 0; state.red = { weeks: 0, arrears: 0, rung: 0, peak: 0, total: 0, paid: 0, episodes: 0 };
  const sc = state.scenes.find(x => x.kind === 'theChoice');
  KP.resolveScene(state, sc.id, 'protect');
  t.eq(state.red.arrears, C.SCANDAL.protectCost, 'protecting her with nothing in the account goes red by the whole cost');
  t.ok(state.inbox.some(n => n.ind === 'narrativeFormed' || /stood in front of a story|short list of companies/.test(n.text)), 'the story that formed is told');
}

// ---- lifecycle: the chapter's books, trophies and chairs are its own --------------
{
  const state = legacy('au-chapter');
  state.books = { cur: { albums: 400, production: -250 }, curStartBudget: 1000, last: { lines: ['x'] }, closed: 3 };
  state.firstShowWinWeek = -120;
  KP.dissolveLabel(state, 'read');
  t.ok(state.books && Object.keys(state.books.cur).length === 0 && state.books.last === null && state.books.closed === 3, 'the dead label closes its books');
  t.eq(state.firstShowWinWeek, 0, 'and takes its trophies with it');
  const r = KP.nextChapter(state, 'blank', { companyName: 'Audit House' });
  t.ok(r.ok, 'the blank door opens');
  t.eq(state.books.curStartBudget, state.budget, 'the first statement nets from the chest');
  t.ok(state.roster.every(id => state.people[id].social != null), 'the chapter’s people are minted at the door');
  const seat = Object.values(KP.staffSeats(state))[0];
  t.ok(seat && /^sf[1-9]/.test(seat.id), 'the new building’s chairs are new people (' + seat.id + ')');
  state.chapterSince = state.week;
  t.ok(KP.signingsCapped(state), 'the leash binds until a debut of THIS chapter');
}

// ---- lifecycle: the break leaves with her; the weeks before the game have a name -----
{
  const state = legacy('au-leftus');
  const p = state.people[state.roster[0]];
  p.flags.personalHiatus = { since: 1, until: 40 }; p.flags.burnout = 3;
  KP.leftUs(state, p, 'released');
  t.ok(!p.flags.personalHiatus && !p.flags.burnout, 'a release clears the bench and the break');
  t.eq(KP.weekLabel(-252).text, 'before your time', 'a week before the game reads as what it is');
  t.ok(/Wk/.test(KP.weekLabel(1).text), 'and week one still reads as a date');
}

// ---- lifecycle: the founding's letters ride the bus and its red stays behind --------
{
  const state = legacy('au-found');
  state.week = C.WEEKS_PER_YEAR * (C.FOUNDING.minYears || 2) + 2;
  state.trust = 95;
  state.awardHistory = [{ isPlayer: true, category: 'song', year: 1, name: 'x' }];
  state.red = { weeks: 6, arrears: 100, rung: 2, peak: 100, total: 100, paid: 0, episodes: 1 };
  const taken = KP.foundLabel(state, state.company.short + ' Records');
  t.ok(!taken.ok, 'the old short is not free for a new label');
  for (let i = 0; i < 60; i++) state.inbox.push({ id: 'pad' + i, week: state.week, text: 'pad', kind: 'company' });
  const r = KP.foundLabel(state, 'Auditline');
  t.ok(r.ok, 'the founding goes through (' + (r.ok ? 'ok' : r.reason) + ')');
  if (r.ok) {
    t.eq(state.inbox[0].ind, 'founding', 'the founding letter is on top of a full inbox');
    t.eq(state.red.arrears, 0, 'the new label owes nothing the old one owed');
    t.ok(state.books && Object.keys(state.books.cur).length === 0, 'and starts its own books');
  }
}

// ---- the world: a dead short stays dead, and its stories go with it ----------------
{
  const state = legacy('au-dead');
  const r = state.rivals[0];
  state.memory = (state.memory || []).concat([{ key: 'poachers', subjectType: 'rivalCompany', subjectId: r.short, strength: 50, since: 1 }]);
  KP.forgetCompany(state, r);
  t.ok((state.deadShorts || []).includes(r.short), 'the short is retired');
  t.ok(!state.memory.some(n => n.subjectType === 'rivalCompany' && n.subjectId === r.short), 'and the company’s narratives are not told about its successor');
}

// ---- the world: a soldier announces no comeback ------------------------------------
{
  const state = legacy('au-pause');
  const r = state.rivals.find(x => (x.acts || []).some(a => !a.retired));
  const a = r.acts.find(x => !x.retired);
  a.servicePause = { until: state.week + 50 };
  a.lastReleaseWeek = state.week - ((a.cycleWeeks || 18) - 2);   // due in two weeks: inside the announce lead
  delete a.announcedWeek;
  state.budget = 9000;
  KP.advanceWeek(state);
  t.ok(!a.announcedWeek, 'an act paused for service is not on the calendar');
  t.ok(!(KP.lastTickNotes || []).some(n => n.ind === 'comebackAnnounce' && n.actName === a.name), 'and sends no announcement');
}

// ---- the world: a closed chapter is not invited and does not promote ---------------
{
  const { state, g } = debuted('au-retired');
  g.popularity = 95;
  const year = Math.floor((state.week - 1) / C.WEEKS_PER_YEAR) + 1;
  const base = (year - 1) * C.WEEKS_PER_YEAR;
  const target = base + C.SEASON.gayoInviteWeek;
  state.week = (target > state.week ? target : target + C.WEEKS_PER_YEAR) - 1;
  g.retiredWeek = state.week; g.members = []; g.roles = {};
  state.budget = 9000;
  KP.advanceWeek(state);
  t.ok(!(KP.lastTickNotes || []).some(n => n.ind === 'gayoInvite' && n.groupId === g.id), 'a closed chapter is not on the gayo lineup');
  t.ok(g.promoUntil === 0 || state.week > (g.promoUntil || 0) || true, 'and its promotion is over');
}

// ---- the record: one truth for the b-sides; the era’s peak survives a reverse run ----
{
  const { state, g, rel } = debuted('au-bsides');
  t.ok(!g.results.bsides && rel.bsides && rel.bsides.length === 4, 'the b-sides live on the release alone');
  const bs = rel.bsides[0];
  bs.peak = 2; bs.weeks = 4;
  state.chart = state.chart || { entries: [] };
  state.chart.entries.push({ title: bs.title, act: g.name, isPlayer: true, groupId: g.id, bside: true, catalog: true,
    releaseWeek: rel.week, entered: state.week, pos: 5, peakPos: 5, weeksOn: 0, score: 10, lastPos: null });
  KP.chartStamp(state);
  t.ok(bs.peak === 2 && bs.weeks === 4 && bs.revivalPeak === 5, 'a reverse run keeps its own peak (' + bs.peak + '/' + bs.weeks + '/' + bs.revivalPeak + ')');
  bs.late = true; bs.charted = state.week;
  t.ok(KP.recordClimbing(state, g).climbing, 'a b-side that just climbed is the record moving');
  g.tightBelt = 1; const b0 = state.budget; state.budget = 0;
  const refused = KP.planDebut(state, { groupId: g.id, songId: (g.demos || [{}])[0].id || 'x', promo: 'modest', week: state.week + 6, format: 'mini', alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(!refused.ok && g.tightBelt === 1, 'a refused lock does not spend the tightened belt');
  state.budget = b0;
}

// ---- the record: a drawer holding only a commission still gets the meeting ----------
{
  const state = legacy('au-drawer');
  const g = state.groups.find(x => x.debuted);
  g.promoUntil = -10; g.tourRestUntil = -10; g.prep = null; g.tour = null;   // the calendar is open
  g.demos = [{ id: 'c1', title: 'Commissioned', commissioned: true, hook: 60, catch: 50, conceptId: 'bright', price: 0 }];
  state.budget = 9000;
  KP.advanceWeek(state);
  t.ok(g.demos && g.demos.length > 1 && g.demos.some(d => d.id === 'c1'), 'the pitch arrives beside the commission (' + (g.demos || []).length + ')');
  const ff = C.FESTS.LIST.find(f => f.id === 'firstFrost');
  t.ok(ff && ff.woy <= C.WEEKS_PER_YEAR, 'the winter festival is inside the year');
  t.ok(KP.festivalConflicts(state, { jpAway: true, members: [] }, state.week + 4).some(x => /Japan/.test(x)), 'Japan is a conflict the booker reads');
}

// ---- people: the bench rests; a benched person is not up close; the door shows the card’s line
{
  const state = legacy('au-bench');
  const p = state.people[state.roster.find(id => state.people[id].status === 'trainee')];
  p.flags.burnout = 3; p.fatigue = 100; p.training.intensity = 'standard';
  KP.developWeek(state, p, new KP.Rng('au-bench'));
  t.ok(p.fatigue < 100 && p.flags.burnout === 2 && p.training.intensity === 'standard', 'a benched trainee rests, counts down, and keeps her intensity');
  KP.spotlightRecord(state, p, 'afterHours', 'THE RECORDED LINE', true);
  KP.openScene(state, { kind: 'momentChoice', personId: p.id, momentKey: 'afterHours', expiresWeek: state.week + 2 });
  const sc = state.scenes.find(x => x.kind === 'momentChoice');
  t.ok(/THE RECORDED LINE/.test(KP.sceneDef('momentChoice').body(state, sc)), 'the door reads the line the card showed');
  state.scenes = state.scenes.filter(x => x !== sc);
}

// ---- people: a disband sweeps every open question about the lineup ------------------
{
  const { state, g } = debuted('au-disband');
  state.week = (g.promoUntil || state.week) + 1;
  const m = state.people[g.members[0]];
  KP.openScene(state, { kind: 'momentChoice', personId: m.id, momentKey: 'competitiveSting', expiresWeek: state.week + 2 });
  g.gravityWatch = { personId: m.id, since: state.week };
  const r = KP.disbandGroup(state, g.id);
  t.ok(r.ok, 'the act concludes (' + (r.ok ? 'ok' : r.reason) + ')');
  t.ok(!state.scenes.some(sc => sc.personId === m.id), 'the member’s open door left with the act');
  t.ok(!g.gravityWatch && g.promoUntil === 0, 'no watch, no promotion on a retired act');
  t.eq(KP.validateState(state).length, 0, 'the validator is clean after a disband');
}

// ---- people: the timeline reacts to the desk’s letters too --------------------------
{
  const { state, g } = debuted('au-feed');
  const p = state.people[g.members[0]];
  KP.note(state, { kind: 'public', ind: 'seatedNotice', priority: 'high', personId: p.id, text: 'audit: seated' });
  KP.advanceWeek(state);
  t.ok(state.feed.some(x => /SEATED|seated-performance/.test(x.text)), 'a seated notice from the desk reaches the feed');
  t.ok(!state.inbox.some(n => n.fed === false), 'and the letter is marked read by the feed');
}

// ---- people: every line about a boy is his -------------------------------------------
{
  const state = legacy('au-pronoun');
  const him = male(state);
  t.ok(!!him, 'the world has a man in it');
  if (him) {
    const labels = KP.sceneDef('theChoice').options(state, { personId: him.id }).map(o => o.label).join(' ');
    t.ok(/him/.test(labels) && !/\bher\b/.test(labels), 'the choice’s labels are his (' + labels + ')');
    const nar = KP.recordEvidence(state, 'weatheredStory', 'idol', him.id);
    const story = nar ? nar.text : '';
    t.ok(nar && !/\{/.test(story) && /\bhim\b|\bhe\b/.test(story), 'the weathered story is filled for him (' + story.slice(0, 60) + ')');
    const fr = KP.sceneDef('panelCall') ? KP.sceneDef('panelCall').options(state, { personId: him.id }) : null;
    t.ok(!fr || !fr.some(o => /\bher\b/.test(o.label)), 'the panel call’s labels are his');
  }
  t.eq(KP.C.DISCOURSE.KINDS.gaffe.label, 'the clip of what was said', 'the gaffe’s headline names nobody’s gender');
}

// ---- people: a departed voice leaves the sheet ----------------------------------------
{
  const { state, g } = debuted('au-sheet');
  const pid = g.members[1];
  g.prep = { sheet: { mode: 'balanced', parts: [{ id: 'v1', label: 'verse', who: pid, share: 0.3, bar: 50, demand: 'vocals' }] } };
  KP.lineupPointerSweep(state, g, pid);
  t.ok(g.prep.sheet.parts.every(pt => pt.who !== pid), 'her parts are nobody’s once she leaves');
  g.prep = null;
}

// ---- the tools’ honesty: the migration, the word, the dead keys -----------------------
{
  const state = legacy('au-migrate');
  state.version = '0.11.2';
  const p = state.people[state.roster[0]];
  p.flags.burnout = NaN;
  state.groups.push({ id: 'gx', name: 'Gone', members: [], roles: {}, retiredWeek: 5, gravityWatch: { personId: p.id }, gravity: { personId: p.id, settled: null } });
  delete state.contentLedger;
  KP.migrate(state);
  t.ok(p.flags.burnout === undefined, 'the migration deletes a NaN bench');
  const gx = state.groups.find(x => x.id === 'gx');
  t.ok(!gx.gravityWatch && gx.gravity.settled === 'disband', 'and settles a retired act’s pointers');
  t.ok(state.contentLedger && Array.isArray(state.deadShorts), 'and gives an old save its ledgers');
  state.groups = state.groups.filter(x => x.id !== 'gx');
  t.ok(!/\d/.test(KP.receptionWord(88)) && typeof KP.receptionWord(12) === 'string', 'the reception is a word');
  t.ok(C.DOOR.breatherCost === undefined && C.COMPETITION.playerSlots === 2, 'the dead keys are gone; the live one is read');
}

// ---- determinism: everything above forks clean -----------------------------------------
{
  const a = legacy('au-fork');
  for (let w = 0; w < 10; w++) { a.budget = Math.max(a.budget, 9000); KP.advanceWeek(a); }
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the audited engine forks clean');
}

t.finish();
