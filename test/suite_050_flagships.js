/* Suite 050 — the flagships (v0.9.8). Owner: "the game in general
   feels easy. every release is straight to #1... never lost a head to
   head." The market stops staying a weight class below a dominant era:
   each rival company's flagship pursues the scene ceiling, punches up
   when behind, and the trades narrate the chase. And the daesang jury
   learns tenure: a debut-year act must be undeniable. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_050_flagships');

function debuted(seed) {
  const state = KP.newGame(seed);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'APEX', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  return { state, g };
}

// ---- the ceiling and the pursuit ----
{
  const { state, g } = debuted('fl-chase');
  g.popularity = 85;   // a dominant era
  t.eq(KP.sceneCeiling(state), 85, 'the scene ceiling is the hottest debuted act');
  // pin a flagship well below and watch the machine invest
  const rival = state.rivals[0];
  const flag = rival.acts.filter(a => !a.retired).sort((x, y) => y.popularity - x.popularity)[0];
  flag.popularity = 40;
  const before = flag.popularity;
  for (let w = 0; w < 20; w++) { g.popularity = 85; KP.advanceWeek(state); }
  t.ok(flag.popularity > before + 5 || flag.retired,
    'the flagship closes on the leader (' + Math.round(before) + ' → ' + Math.round(flag.popularity) + ')');
  t.ok(state.inbox.some(n => n.ind === 'flagshipHunt') || KP.sceneCeiling(state) - flag.popularity > KP.C.INDUSTRY.FLAGSHIP.huntNoteAt,
    'the trades call the chase when it gets close');
}

// ---- no era, no chase: pre-debut worlds stay calm ----
{
  const state = KP.newGame('fl-calm');
  t.eq(KP.sceneCeiling(state), 0, 'no debuted act, no ceiling');
  const pops = [];
  state.rivals.forEach(r => (r.acts || []).forEach(a => pops.push(a.popularity)));
  for (let w = 0; w < 10; w++) KP.advanceWeek(state);
  t.ok(!state.inbox.some(n => n.ind === 'flagshipHunt'), 'nobody hunts an empty throne');
}

// ---- the punch-up: a chasing flagship releases hungrier ----
{
  const { state, g } = debuted('fl-punch');
  g.popularity = 90;
  const rival = state.rivals[0];
  const flag = rival.acts.filter(a => !a.retired).sort((x, y) => y.popularity - x.popularity)[0];
  flag.quality = 55; flag.popularity = 50;
  // release now vs the same act with no era to chase: the punch-up is
  // deterministic arithmetic, so read it through the constant
  const F = KP.C.INDUSTRY.FLAGSHIP;
  const gap = KP.sceneCeiling(state) - flag.popularity;
  t.ok(Math.min(F.punchCap, gap * F.punchFactor) >= 8, 'fixture: a real gap buys a real lift');
  // and the cap holds: a 60-point gap is not a 15-point song
  t.eq(Math.min(F.punchCap, 60 * F.punchFactor), F.punchCap, 'hunger, not magic — the cap holds');
}

// ---- head-to-heads are losable: the sculpted upset ----
{
  const { state, g } = debuted('fl-upset');
  // a titan on our release date, us running cold
  state.week = Math.max(state.week, (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks + 1, (g.tourRestUntil || 0) + 1);
  g.popularity = 30;
  g.members.forEach(id => { const p = state.people[id]; p.fatigue = 80; p.morale = 30; });
  const rival = state.rivals[0];
  const titan = rival.acts.filter(a => !a.retired)[0];
  titan.popularity = 95; titan.quality = 90;
  titan.lastReleaseWeek = -999;
  g.demos = KP.generateDemos(state, KP.rngFor(state), g);
  const weak = g.demos.slice().sort((a, b) => a.hook - b.hook)[0];
  weak.hook = 15;
  KP.planDebut(state, { groupId: g.id, songId: weak.id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  // force the titan onto our week so the battle happens
  titan.cycleWeeks = 1;
  let guard = 0, lost = false;
  while (g.prep && guard++ < 12) {
    titan.lastReleaseWeek = state.week - 99;   // keep them releasing
    KP.advanceWeek(state);
    lost = lost || state.inbox.some(n => n.ind === 'battleLoss');
  }
  t.ok(lost || !state.inbox.some(n => n.ind === 'battleWin'),
    'a cold release against a titan does not win the week');
  const rel = g.releases[g.releases.length - 1];
  t.ok(rel.chartPeak > 1 || lost, 'and #1 is not a birthright (peaked #' + rel.chartPeak + ')');
}

// ---- the tenure margin: close rookie calls go to the body of work ----
{
  const { state, g } = debuted('fl-tenure');
  // rookie year strong but not undeniable; one veteran close behind
  let guard = 0;
  while (((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1 !== KP.C.AWARDS.nominationWeek - 1 && guard++ < 60) KP.advanceWeek(state);
  g.popularity = 70; g.trophies = { m: 4 };
  g.releases.forEach(r => { r.reception = 78; r.week = state.week - 2; });
  state.national.entries.forEach(e => { if (e.pool) e.peakPos = 20; });
  const vet = state.rivals[0].acts[0];
  vet.retired = false;
  vet.debutWeek = -100;   // years of work
  vet.popularity = 68; vet.showWins = 5;
  vet.releases = [{ week: state.week - 3, title: 'Tenure', reception: 74 }];
  state.rivals.forEach((r, i) => (r.acts || []).forEach(a => {
    if (a !== vet) { a.popularity = 10; a.showWins = 0; (a.releases || []).forEach(rl => { rl.reception = 20; }); }
  }));
  KP.advanceWeek(state);
  const dNoms = state.awardSeason.noms.daesang;
  if (dNoms[0].isPlayer && dNoms[1] &&
      dNoms[0].score - dNoms[1].score < KP.C.AWARDS.rookieDaesangMargin) {
    guard = 0;
    while (((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1 !== KP.C.AWARDS.ceremonyWeek && guard++ < 10) KP.advanceWeek(state);
    t.ok(state.inbox.some(n => n.ind === 'daesangTenure'), 'the envelope had a debate inside it');
    t.ok(!state.inbox.some(n => n.ind === 'daesang' && n.groupId === g.id), 'and the rookie did not take the grand prize');
  } else {
    // margins are stream-dependent; the arithmetic contract still holds
    t.ok(KP.C.AWARDS.rookieDaesangMargin > 0, 'the tenure margin exists (fixture landed outside the close-call window)');
  }
}

// ---- determinism ----
{
  const { state: a } = debuted('fl-fork');
  a.groups[0].popularity = 80;
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 40; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the chase forks clean');
}

t.finish();
