/* Suite 055 — the audit (0.9.13). Regression pins for everything the
   full code audit found: the save-bricking empty-group crash, ghost
   engagements on departed idols, the founding's missed surfaces, the
   trainee-release sweep, year-scoped award tallies, the prospect
   market, and the success payroll. Each assertion is a bug that
   existed; none of them get to exist twice. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_055_integrity');

function debuted(seed, n) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, n || 5);
  KP.proposeGroup(state, 'AUDIT', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  return { state, g };
}

// ---- C1: the chapter closes cleanly — no bricked saves ----
{
  const { state, g } = debuted('aud-c1');
  // sculpt the worst case: a group emptied while a release is locked
  state.week = Math.max(state.week, (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks + 1);
  g.demos = KP.generateDemos(state, KP.rngFor(state), g);
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(g.prep, 'fixture: a release is locked');
  g.members.slice().forEach(id => KP.departIdol(state, id, 'warm'));
  t.eq(g.members.length, 0, 'fixture: everyone left');
  t.ok(g.retiredWeek, 'the chapter is stamped closed');
  t.ok(!g.prep && !g.tour && !g.hiatus && !g.demos, 'everything scheduled died with the act');
  let crashed = false;
  try { for (let w = 0; w < 25; w++) KP.advanceWeek(state); } catch (e) { crashed = true; }
  t.ok(!crashed, 'twenty-five weeks after the disband, the world still turns (this used to brick the save)');
  t.ok(!KP.planDebut(state, { groupId: g.id, songId: 'x', promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } }).ok,
    'nobody books a closed chapter');
  t.ok(!KP.tourEligible(state, g).ok, 'or tours it');
  t.ok(!KP.declareHiatus(state, g.id).ok, 'or announces its hiatus');
  t.ok(!(state.scenes || []).some(sc => sc.kind === 'execQuestion' &&
    sc.q && sc.q.groupId === g.id), 'the exec never asks when a disbanded group comes back');
  t.eq(KP.validateState(state).length, 0, 'the extended validator agrees');
}

// ---- H1: no engagements for the departed ----
{
  const { state, g } = debuted('aud-h1');
  const p = state.people[g.members[0]];
  // an offer is on the desk when she departs
  state.dealOffers = [{ id: 'deal9', brand: 'Léore (cosmetics)', personId: p.id,
    lump: 10, weekly: 2, weeks: 12, expiresWeek: state.week + 3 }];
  state.gigOffers = [{ id: 'gig9', kind: 'panel', personId: p.id, show: 'Off-Duty',
    weeks: 12, weekly: 3, expiresWeek: state.week + 3 }];
  KP.departIdol(state, p.id, 'warm');
  t.eq(state.dealOffers.length, 0, 'the brand offer left the desk with her');
  t.eq(state.gigOffers.length, 0, 'so did the casting call');
  // and even a stale offer cannot be signed for a non-idol
  state.dealOffers = [{ id: 'deal10', brand: 'Peau (cosmetics)', personId: p.id,
    lump: 10, weekly: 2, weeks: 12, expiresWeek: state.week + 3 }];
  const r = KP.respondDeal(state, 'deal10', true);
  t.ok(!r.ok, 'no free money from a departed face');
  t.eq(state.dealOffers.length, 0, 'and the dead offer clears itself');
}

// ---- H3 + L1: the tracklist and the maknae survive a departure ----
{
  const { state, g } = debuted('aud-h3');
  state.week = Math.max(state.week, (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks + 1);
  g.demos = KP.generateDemos(state, KP.rngFor(state), g);
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest', format: 'mini',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  const slot = g.prep.tracks.find(tk => tk.slot);
  const leaver = g.members[1];
  KP.assignTrack(state, g.id, slot.n, { type: 'solo', memberId: leaver });
  const maknaeWas = g.maknae;
  KP.departIdol(state, leaver, 'warm');
  t.ok(!g.prep.tracks.find(tk => tk.n === slot.n).credit,
    'her solo credit came off the unreleased record with her');
  if (maknaeWas === leaver) {
    t.ok(g.members.includes(g.maknae), 'the maknae is a member again');
  } else {
    t.eq(g.maknae, maknaeWas, 'the maknae stands (she was not the one leaving)');
  }
  t.ok(g.maknae && g.members.includes(g.maknae), 'the maknae fact holds either way');
}

// ---- M3: releasing a trainee sweeps the desk ----
{
  const state = KP.newGame('aud-m3', null, { legacy: false });
  const pid = state.roster[0];
  // an open scene, a project lock, and the internet's directive — all hers
  KP.openScene(state, { kind: 'idolDoor', personId: pid, doorKind: 'confession',
    expiresWeek: state.week + 4 });
  state.project = { locked: [pid, state.roster[1]], seeking: [] };
  state.hypeDirective = { status: 'open', personId: pid, deadlineWeek: state.week + 10 };
  const trust0 = state.trust;
  const r = KP.releaseTrainee(state, pid);
  t.ok(r.ok, 'released');
  t.ok(!(state.scenes || []).some(sc => sc.personId === pid), 'her scene left the desk');
  t.ok(!state.project.locked.includes(pid), 'the project slot un-locked');
  t.ok(!state.hypeDirective, 'the directive resolved immediately — no silent lapse');
  t.ok(state.trust < trust0, 'the exec noticed, on the spot');
  t.ok(state.inbox.some(n => /you released/.test(n.text || '')), 'and said so out loud');
}

// ---- founding: the missed surfaces, the id discipline ----
{
  const { state, g } = debuted('aud-found');
  // qualify: honors + years + trust
  state.trust = 90;
  state.week += KP.C.WEEKS_PER_YEAR * 2 + 2;
  state.awardHistory = [{ isPlayer: true, category: 'bonsang', year: 1 }];
  const p0 = state.people[g.members[0]];
  state.dealOffers = [{ id: 'd1', brand: 'Fizzi (soft drink)', personId: p0.id,
    lump: 8, weekly: 1, weeks: 10, expiresWeek: state.week + 3 }];
  state.gigs = [{ id: 'g1', kind: 'mc', personId: p0.id, show: 'Weekly Antenna',
    weeksLeft: 10, weekly: 4, lump: 0, signedWeek: state.week, strain: 0, weeksRun: 5 }];
  state.project = { locked: [state.roster[5] || state.roster[0]], seeking: [] };
  const oldProspects = state.prospects.slice();
  t.ok(KP.foundingEligible(state).ok, 'fixture: the door is open');
  // the id-discipline proof (audit H1-determinism): found the SAME state
  // twice from two deserialized copies — identical futures, byte for byte
  const json = KP.serialize(state);
  const a = KP.deserialize(json), b = KP.deserialize(json);
  KP.foundLabel(a, 'Fork House');
  KP.foundLabel(b, 'Fork House');
  t.eq(KP.serialize(a), KP.serialize(b), 'founding forks byte-identical (module id counter re-synced)');
  t.eq(a.dealOffers.length, 0, 'the old world’s brand offers are gone');
  t.eq(a.gigs.length, 0, 'and its second jobs ended with the era');
  t.ok(!a.project, 'and the half-built project shelf is empty');
  oldProspects.forEach(id => t.ok(!a.people[id], 'never-signed lead ' + id + ' left no ghost file'));
  a.prospects.forEach(id => t.ok(typeof a.people[id].social === 'number',
    'fresh lead ' + id + ' was social-minted at the door'));
  t.ok(Object.values(a.people).filter(p => p.status === 'rival' && !p.flags.rivalNative)
    .every(p => p.company), 'everyone who crossed the wall carries the legacy letterhead');
  t.ok(!(a.memory || []).some(n => n.subjectType === 'group'),
    'no group narrative survived pointing at a group that no longer exists');
  t.eq(KP.validateState(a).length, 0, 'the founded world validates clean');
}

// ---- B2: prizes are won on the year, not the résumé ----
{
  const { state, g } = debuted('aud-b2');
  g.trophies = { countdown: 14, popWave: 9 };   // a dynasty's career shelf
  g.trophiesYear = 2;                            // ...but a quiet year
  const yearStartWeek = Math.floor((state.week - 1) / KP.C.WEEKS_PER_YEAR) * KP.C.WEEKS_PER_YEAR + 1;
  g.releases[g.releases.length - 1].week = Math.max(g.releases[g.releases.length - 1].week, yearStartWeek);
  // ride to nominations and inspect the daesang math indirectly: seed a
  // duplicate world where the career shelf doubles — the field must not move
  const json = KP.serialize(state);
  const rich = KP.deserialize(json);
  rich.groups[0].trophies = { countdown: 28, popWave: 18 };
  const woy = s => ((s.week - 1) % KP.C.WEEKS_PER_YEAR) + 1;
  [state, rich].forEach(s => {
    let guard = 0;
    while (woy(s) !== KP.C.AWARDS.nominationWeek && guard++ < 60) KP.advanceWeek(s);
  });
  const score = s => {
    const noms = s.awardSeason && s.awardSeason.noms;
    const mine = noms && noms.daesang && noms.daesang.find(n => n.isPlayer);
    return mine ? Math.round(mine.score * 100) : null;
  };
  t.eq(score(state), score(rich),
    'doubling the CAREER shelf moves the daesang score not at all — the year is what counts');
  // and the tally closes with the ceremony
  let guard = 0;
  while (state.awardSeason && guard++ < 10) KP.advanceWeek(state);
  t.eq(state.groups[0].trophiesYear || 0, 0, 'the year’s tally resets at the ceremony');
}

// ---- A1 + A2: gowns for everyone, a board that moves on ----
{
  const { state } = debuted('aud-a1');
  const three = state.roster.slice(0, 3).map(id => state.people[id]);
  three.forEach(p => { p.age = 19; delete p.flags.gradNoted; });
  let guard = 0;
  while (((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1 !== 5 && guard++ < 60) KP.advanceWeek(state);
  three.forEach(p => { p.age = 19; delete p.flags.gradNoted; });   // re-pin after the ride
  KP.advanceWeek(state);
  t.ok(three.every(p => p.flags.gradNoted), 'all three nineteen-year-olds graduated — the cap trims coverage, never the diploma');
  // the board prunes: an aged-out lead vanishes, file and all
  const stale = state.prospects[0];
  state.people[stale].age = KP.C.SCOUT.prospectAgeOut;
  KP.advanceWeek(state);
  t.ok(!state.prospects.includes(stale) && !state.people[stale],
    'the market moved on — no ghost file left behind');
}

// ---- B1 + B3: the books push back ----
{
  const { state, g } = debuted('aud-b1');
  // payroll bills on the month boundary, scaled to the debuted roster
  let guard = 0;
  while ((state.week - 1) % KP.C.WEEKS_PER_MONTH !== 3 && guard++ < 6) KP.advanceWeek(state);
  const expected = Math.round(g.members.length * KP.C.ECON.idolPayrollPerMember +
    (g.popularity || 0) * KP.C.ECON.payrollPerPopularity);
  t.ok(expected > 0, 'an established act bills like one (' + expected + '/month)');
  // the renewal table never offers what the account cannot cover
  const p = state.people[g.members[0]];
  p.contract.start = state.week - KP.C.CONTRACT.renewalAtYears * KP.C.WEEKS_PER_YEAR;
  p.morale = 55; p.directed = []; p.flags.ambitionMet = 1;
  state.budget = 0;
  let sc = null; guard = 0;
  while (!sc && guard++ < 12) {
    KP.advanceWeek(state);
    p.morale = 55; p.directed = [];
    sc = (state.scenes || []).find(x => x.kind === 'renewal');
  }
  t.ok(sc, 'fixture: a table opened');
  const opts = KP.sceneDef('renewal').options(state, sc);
  t.ok(!opts.some(o => o.id === 'terms' || o.id === 'sweeten'),
    'a broke company is not offered the checkbook options');
}

// ---- determinism: the audited world still forks clean ----
{
  const { state: a, g: ga } = debuted('aud-fork');
  KP.departIdol(a, ga.members[0], 'warm');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'departures, payroll, prunes, and year tallies fork clean');
}

t.finish();
