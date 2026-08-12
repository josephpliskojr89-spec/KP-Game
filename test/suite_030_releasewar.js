/* Suite 030 — the release war (v0.6.4).
   The calendar is public and hostile: rival comebacks announce ahead,
   locked dates leak, motivated rivals park releases on them, same-week
   landings become scored battles, and the world keeps the receipts —
   feuds, rivalries, date-sniper reputations, stolen concepts. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_030_releasewar');

function ready(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'WARLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  return { state, g };
}
function lock(state, g, week) {
  return KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
}
function firstAct(state) { return state.rivals[0].acts[0]; }

// ---- announcements: dates go public inside the window ----
{
  const { state } = ready('war-announce');
  const act = firstAct(state);
  act.popularity = 50;                       // big enough for a desk letter
  act.lastReleaseWeek = state.week - act.cycleWeeks + 3;   // due in 3 weeks
  KP.advanceWeek(state);
  t.eq(act.announcedWeek, act.lastReleaseWeek + act.cycleWeeks, 'the comeback date is public');
  t.ok(state.inbox.some(m => /announced .*comeback for/.test(m.text)), 'the desk letter names the date');
  t.ok(KP.releaseCalendar(state).some(e => e.actId === act.id), 'the war calendar lists it');
  t.ok(KP.upcoming(state).some(u => /comeback — /.test(u.label)), 'the Desk strip carries it');
  // a small act announces quietly — calendar yes, letter no
  const act2 = state.rivals[1].acts[0];
  act2.popularity = 5;
  act2.lastReleaseWeek = state.week - act2.cycleWeeks + 3;
  const before = state.inbox.length;
  KP.advanceWeek(state);
  t.ok(act2.announcedWeek != null, 'small acts still hit the calendar');
  t.ok(!state.inbox.slice(0, state.inbox.length - before).some(m =>
    m.text.includes(act2.name)), 'but nobody writes the desk about them');
}

// ---- the player's locked date leaks ----
{
  const { state, g } = ready('war-leak');
  t.ok(lock(state, g, state.week + 6).ok, 'fixture: locked');
  KP.advanceWeek(state);
  t.ok(g.prep.announced, 'the date is out');
  t.ok(state.inbox.some(m => /trade calendars now list/.test(m.text)), 'and the desk knows it is out');
}

// ---- the ambush: a motivated rival parks a release on our date ----
{
  let seen = null;
  for (let s = 0; s < 25 && !seen; s++) {
    const { state, g } = ready('war-ambush-' + s);
    g.members.forEach(id => { state.people[id].hype = 40; });   // worth sniping
    lock(state, g, state.week + 6);
    const act = firstAct(state);
    act.lastReleaseWeek = state.week + 8 - act.cycleWeeks;      // due 2 past our date
    for (let w = 0; w < 3 && !g.prep.clash; w++) KP.advanceWeek(state);
    if (g.prep && g.prep.clash) seen = { state, g, act };
  }
  t.ok(seen, 'the ambush fires across seeds');
  if (seen) {
    const { state, g } = seen;
    // whichever act the most prestigious motivated house had in range
    const sniper = KP.rivalActById(state, g.prep.clash.actId);
    t.ok(sniper && !sniper.act.retired, 'the clash names a real sniper act');
    t.eq(sniper.act.announcedWeek, g.prep.scheduledWeek, 'their date is now OUR date');
    t.ok(state.inbox.some(m => /Scheduling coincidences do not exist/.test(m.text)),
      'the letter says what everyone is thinking');
    // hold: the date stands, and the members square up
    const r = KP.respondClash(state, g.id, 'hold');
    t.ok(r.ok && g.prep.clash.resolved === 'hold', 'holding resolves the clash');
    t.ok(!KP.respondClash(state, g.id, 'slip').ok, 'the company only decides once');
  }
}

// ---- the dodge: slip costs money, moves the date, reads as fear ----
{
  let seen = null;
  for (let s = 0; s < 25 && !seen; s++) {
    const { state, g } = ready('war-slip-' + s);
    g.members.forEach(id => { state.people[id].hype = 40; });
    lock(state, g, state.week + 6);
    const act = firstAct(state);
    act.lastReleaseWeek = state.week + 8 - act.cycleWeeks;
    for (let w = 0; w < 3 && !g.prep.clash; w++) KP.advanceWeek(state);
    if (g.prep && g.prep.clash) seen = { state, g };
  }
  t.ok(seen, 'fixture: an ambush to dodge');
  if (seen) {
    const { state, g } = seen;
    const W = KP.C.WAR;
    const wk = g.prep.scheduledWeek, cash = state.budget;
    const m0 = state.people[g.members[0]], moraleBefore = m0.morale;
    t.ok(KP.respondClash(state, g.id, 'slip').ok, 'the slip goes through');
    t.eq(g.prep.scheduledWeek, wk + W.slipWeeks, 'the date moves');
    t.eq(cash - state.budget, W.slipCost, 'rebooking is billed');
    t.ok(m0.morale < moraleBefore, 'the members know what it looks like');
  }
}

// ---- the battle: same week, one winner, a feud ledger ----
{
  const { state, g } = ready('war-win');
  g.members.forEach(id => {
    const p = state.people[id];
    p.talents.vocals.cur = 80; p.talents.dance.cur = 80; p.talents.charisma.cur = 75;
  });
  const week = state.week + 6;
  lock(state, g, week);
  const act = firstAct(state);
  act.quality = 15; act.popularity = 30;             // big enough to count, weak enough to lose
  act.lastReleaseWeek = week - act.cycleWeeks;       // lands on our week
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  t.ok(g.results.battle, 'a same-week landing is a battle even without an ambush');
  t.ok(g.results.battle.won, 'the stronger release takes the week');
  t.eq(g.feuds[act.id].wins, 1, 'the feud ledger opens with the win');
  t.ok(state.inbox.some(m => /the numbers are in/.test(m.text)), 'the week has a headline');

  const { state: s2, g: g2 } = ready('war-loss');
  const week2 = s2.week + 6;
  lock(s2, g2, week2);
  const act2 = firstAct(s2);
  act2.quality = 95; act2.popularity = 85;
  act2.lastReleaseWeek = week2 - act2.cycleWeeks;
  guard = 0;
  while (!g2.debuted && guard++ < 10) KP.advanceWeek(s2);
  t.ok(g2.results.battle && !g2.results.battle.won, 'and the weaker one loses it');
  t.eq(g2.feuds[act2.id].losses, 1, 'the loss is on the ledger too');
  t.ok(s2.inbox.some(m => /took the week/.test(m.text)), 'their gloat makes the desk');
}

// ---- rivalry: two meetings and the internet declares it canon ----
{
  const { state, g } = ready('war-rivalry');
  g.members.forEach(id => { state.people[id].talents.vocals.cur = 80; state.people[id].talents.dance.cur = 80; });
  const act = firstAct(state);
  g.feuds = {}; g.feuds[act.id] = { wins: 0, losses: 1 };   // history: they took round one
  const week = state.week + 6;
  lock(state, g, week);
  act.quality = 15; act.popularity = 30;
  act.lastReleaseWeek = week - act.cycleWeeks;
  // hermetic: nobody ELSE lands that week — the rivalry must meet ITS act
  state.rivals.forEach(r => {
    r.nextDebutWeek = week + 60;
    (r.acts || []).forEach(a => {
      if (a.id !== act.id) { a.lastReleaseWeek = state.week - 1; a.cycleWeeks = 26; }
    });
  });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  const nar = KP.getNarrative(state, 'rivalry', 'rivalAct', act.id);
  t.ok(nar, 'meeting two makes it a rivalry');
  const text = KP.narrativeText(state, nar);
  t.ok(text.includes(g.name) && text.includes('1–1'), 'the story carries the live score (' + text + ')');
}

// ---- picking the fight on purpose: locking onto an announced week ----
{
  const { state, g } = ready('war-chosen');
  const act = firstAct(state);
  const week = state.week + 6;
  act.popularity = 40;
  act.cycleWeeks = week - act.lastReleaseWeek;   // due on that exact week
  act.announcedWeek = week;
  const r = lock(state, g, week);
  t.ok(r.ok && r.warning && r.warning.includes(act.name), 'the desk flags the chosen collision');
  t.ok(g.prep.clash && g.prep.clash.chosen && g.prep.clash.resolved === 'hold',
    'choosing the week IS the hold');
}

// ---- the copycat: a big hit gets its concept stolen ----
{
  let seen = null;
  for (let s = 0; s < 30 && !seen; s++) {
    const { state, g } = ready('war-copy-' + s);
    g.members.forEach(id => {
      const p = state.people[id];
      p.talents.vocals.cur = 88; p.talents.dance.cur = 88; p.talents.charisma.cur = 85;
      p.hype = 30;
    });
    lock(state, g, state.week + 6);
    let guard = 0;
    while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
    if (g.results.reception < KP.C.WAR.copyReceptionMin) continue;
    const thief = state.rivals.find(r => r.copyConcept);
    if (thief) seen = { state, g, thief };
  }
  t.ok(seen, 'a big enough hit gets clocked by the trend chasers');
  if (seen) {
    const { state, g, thief } = seen;
    t.eq(thief.philosophy, 'trendChaser', 'and only by the company that would');
    t.eq(thief.copyConcept.conceptId, g.results.conceptId, 'they took the exact concept');
    // force their next debut and watch them wear it
    thief.nextDebutWeek = state.week + 1;
    thief.rosterCount = 6;
    let guard = 0, reveal = null;
    // the rival's casting-to-debut runway varies with the stream — give
    // the reveal the weeks it actually needs, not six of them
    while (guard++ < 16 && !reveal) {
      KP.advanceWeek(state);
      reveal = state.inbox.find(m => /The stylists know what they saw/.test(m.text));
    }
    t.ok(reveal, 'the reveal: their new group debuts in our clothes');
    t.ok(!thief.copyConcept, 'the stolen concept is spent');
    const newest = thief.acts[thief.acts.length - 1];
    t.eq(newest.concept, g.results.conceptId, 'the lineup literally wears it');
  }
}

// ---- migration: the ledgers open, the desk announces the war ----
{
  const { state, g } = ready('war-mig');
  lock(state, g, state.week + 6);
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  delete g.feuds;
  delete state.weekReleases;
  state.version = '0.6.3';
  const m = KP.deserialize(KP.serialize(state));
  t.ok(m.groups[0].feuds && typeof m.groups[0].feuds === 'object', 'the feud ledger opens');
  t.ok(m.inbox.some(x => /a public date is an invitation/.test(x.text)), 'the desk explains the new world');
}

// ---- determinism: the war forks clean, clash pending and all ----
{
  const mk = () => {
    const { state, g } = ready('war-fork');
    g.members.forEach(id => { state.people[id].hype = 40; });
    lock(state, g, state.week + 6);
    const act = firstAct(state);
    act.lastReleaseWeek = state.week + 8 - act.cycleWeeks;
    return state;
  };
  const a = mk();
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 20; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the war forks clean');
}

t.finish();
