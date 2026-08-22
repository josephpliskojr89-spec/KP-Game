/* Suite 048 — the constituency + genre-bending (v0.9.6).
   The organized fandom acts on YOUR decisions: trucks over benched
   members, moved centers, empty credit slots — concede, hold, or
   half-measure, and the grudge counter has teeth. The company answers
   with café notices, fan meetings, and the lightstick launch. And the
   owner's gamble: the genre-bending brief opens the mash — flop,
   worked, acclaimed-but-ignored, or changed the industry. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_048_constituency');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'PICKET', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  return { state, g };
}
function organize(g) { g.fandom = { name: 'PICKETLINE', color: 'signal orange', intensity: 70 }; }
function openCal(state, g) {
  state.week = Math.max(state.week, (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks + 1, (g.tourRestUntil || 0) + 1);
}

// ---- the mash: validated hard, resolved loud ----
{
  const { state, g } = debuted('fu-gate');
  openCal(state, g);
  g.demos = KP.generateDemos(state, KP.rngFor(state), g);
  // a demo that ROLLED the fusion concept is itself a brief — neutralize
  // the stream luck so this block tests the gate, not the dice
  g.demos.forEach(d => { if (d.conceptId === 'fusion') d.conceptId = 'bright'; });
  const plain = KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 }, mash: ['trot', 'EDM'] });
  t.ok(!plain.ok && /genre-bending brief/.test(plain.reason), 'no brief, no mash — set the direction first');
  KP.setGroupConcept(state, g.id, 'fusion');
  g.demos = KP.generateDemos(state, KP.rngFor(state), g);   // producers re-pitch to the brief
  const dupe = KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 }, mash: ['trot', 'trot'] });
  t.ok(!dupe.ok, 'trot × trot is just trot');
  const fake = KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 }, mash: ['trot', 'yodelcore'] });
  t.ok(!fake.ok, 'the producers have not heard of yodelcore');
  const real = KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 }, mash: ['metalcore', 'trot'] });
  t.ok(real.ok && g.prep.mash.join() === 'metalcore,trot', 'K-metalcore lives');
  t.eq(KP.mashLabel(['metalcore', 'trot']), 'K-metalcore × trot', 'and reads like the owner asked');
  // 0.9.6.1: the standards are on the menu — a standard genre with a
  // strange one is half the point
  ['pop', 'hip-hop', 'dance', 'rock', 'ballad'].forEach(std =>
    t.ok(KP.C.FUSION.GENRES.includes(std), std + ' is a genre the producers have heard of'));
  t.eq(KP.mashLabel(['pop', 'metalcore']), 'K-pop × metalcore', 'K-pop × metalcore, literally');
  let guard = 0;
  while (g.prep && guard++ < 10) KP.advanceWeek(state);
  t.ok(g.results.fusionOutcome, 'the mash rolls a verdict (' + g.results.fusionOutcome + ')');
  const verdictNote = state.inbox.find(n => n.ind === 'fusionVerdict');
  t.ok(verdictNote, 'and the verdict is narrated');
  t.ok(['high', 'critical'].includes(verdictNote.priority),
    'the verdict on a player-placed gamble is never trimmable (0.9.8.3)');
  t.ok(g.releases[g.releases.length - 1].mash, 'the discography remembers the collision');
}

// ---- the whole outcome table, mechanism-pinned ----
{
  const FU = KP.C.FUSION;
  const saved = { s: FU.shiftBase, sp: FU.shiftPerCreativity, a: FU.acclaimBase,
    ap: FU.acclaimPerCreativity, f: FU.flopBase };
  function runWith(pin, seed) {
    FU.shiftBase = pin === 'shift' ? 1 : 0; FU.shiftPerCreativity = 0;
    FU.acclaimBase = pin === 'acclaim' ? 1 : 0; FU.acclaimPerCreativity = 0;
    FU.flopBase = pin === 'flop' ? 1 : 0;
    const { state, g } = debuted(seed);
    openCal(state, g);
    KP.setGroupConcept(state, g.id, 'fusion');
    g.demos = KP.generateDemos(state, KP.rngFor(state), g);   // re-pitch to the brief
    KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
      week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 }, mash: ['industrial', 'city pop'] });
    let guard = 0;
    while (g.prep && guard++ < 10) KP.advanceWeek(state);
    return { state, g };
  }
  const shift = runWith('shift', 'fu-shift');
  t.eq(shift.g.results.fusionOutcome, 'shift', 'pinned: the industry shifts');
  t.ok(shift.g.results.reception >= KP.C.FUSION.shiftReceptionMin, 'a shift lands like a landmark');
  t.ok(KP.getNarrative(shift.state, 'genreShift', 'group', shift.g.id), 'and enters the world’s memory');
  t.ok(shift.state.inbox.some(n => /INDUSTRY SHIFT/.test(n.text)), 'the trades use the big letters');
  const acc = runWith('acclaim', 'fu-acc');
  t.eq(acc.g.results.fusionOutcome, 'acclaim', 'pinned: the critics’ shrine');
  t.ok(acc.g.results.reception <= KP.C.FUSION.acclaimReceptionCap, 'acclaimed AND unpopular — the charts shrug');
  t.ok(acc.g.releases[acc.g.releases.length - 1].acclaim, 'the discography keeps the asterisk');
  const flop = runWith('flop', 'fu-flop');
  t.eq(flop.g.results.fusionOutcome, 'flop', 'pinned: the mash eats itself');
  t.ok(flop.g.results.reception <= KP.C.FUSION.flopReceptionCap, 'the floor is real');
  FU.shiftBase = saved.s; FU.shiftPerCreativity = saved.sp;
  FU.acclaimBase = saved.a; FU.acclaimPerCreativity = saved.ap; FU.flopBase = saved.f;
}

// ---- the truck: grievance + organization + the three doors ----
{
  const { state, g } = debuted('ct-truck');
  organize(g);
  const p = state.people[g.members[0]];
  p.flags.burnout = 3;   // worked onto the medical bench
  // pin the coin: the mechanism is the truck, not the odds (the bench
  // clears in 3 weeks, so an unpinned coin can simply miss the window)
  const oldTruck = KP.C.CONSTITUENCY.truckChance;
  KP.C.CONSTITUENCY.truckChance = 1;
  let sc = null, guard = 0;
  while (!sc && guard++ < 15) { KP.advanceWeek(state); sc = (state.scenes || []).find(x => x.kind === 'fanTruck'); }
  KP.C.CONSTITUENCY.truckChance = oldTruck;
  t.ok(sc && sc.grievance === 'overwork', 'the truck parks over the benched member');
  t.ok(state.inbox.some(n => n.ind === 'fanTruck' && /spreadsheet/.test(n.text)), 'and the fandom made a spreadsheet');
  const cash = state.budget;
  const r = KP.resolveScene(state, sc.id, 'concede');
  t.ok(r.ok && cash - state.budget === KP.C.CONSTITUENCY.concedeCost, 'conceding costs the fix');
  t.eq(g.fandomGrudge || 0, 0, 'a concession clears the ledger');
}
{
  const { state, g } = debuted('ct-hold2');
  organize(g);
  state.people[g.members[0]].flags.burnout = 3;
  const oldTruck2 = KP.C.CONSTITUENCY.truckChance;
  KP.C.CONSTITUENCY.truckChance = 1;   // pinned — mechanism, not odds
  let sc = null, guard = 0;
  while (!sc && guard++ < 15) { KP.advanceWeek(state); sc = (state.scenes || []).find(x => x.kind === 'fanTruck'); }
  t.ok(sc, 'fixture: the truck');
  const int0 = g.fandom.intensity;
  KP.resolveScene(state, sc.id, 'hold');
  t.eq(g.fandomGrudge, 1, 'holding the line goes in the permanent file');
  t.ok(g.fandom.intensity < int0, 'and the barricade cools by what trust costs');
  // grudge makes the NEXT truck more likely — the body reads it too
  state.grievances.push({ week: state.week, kind: 'centerChange', groupId: g.id });
  state.truckQuietUntil = 0;
  let sc2 = null; guard = 0;
  while (!sc2 && guard++ < 10) { KP.advanceWeek(state); sc2 = (state.scenes || []).find(x => x.kind === 'fanTruck'); }
  KP.C.CONSTITUENCY.truckChance = oldTruck2;
  t.ok(sc2, 'the next truck was already funded');
  t.ok(/loyalty discount/.test(KP.sceneDef('fanTruck').body(state, sc2)), 'the body reads the grudge');
}

// ---- the credit-slot watch ----
{
  const { state, g } = debuted('ct-credits');
  organize(g);
  openCal(state, g);
  state.budget = 900;   // the song market (v0.10.5): a priced demo must still lock
  g.demos = KP.generateDemos(state, KP.rngFor(state), g);
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest', format: 'mini',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (g.prep && guard++ < 12) KP.advanceWeek(state);
  t.ok((state.grievances || []).some(gr => gr.kind === 'creditsMissing'),
    'a big record with empty credit slots is a counted grievance');
}

// ---- the company's voice: notice, meeting, lightstick ----
{
  const { state, g } = debuted('ct-voice');
  organize(g);
  g.popularity = 60;
  openCal(state, g);
  const r1 = KP.cafeNotice(state, g.id);
  t.ok(r1.ok && state.inbox.some(n => n.ind === 'cafeNotice'), 'the café notice posts');
  t.ok(!KP.cafeNotice(state, g.id).ok, 'one notice at a time');
  const cash = state.budget;
  const r2 = KP.fanMeeting(state, g.id);
  t.ok(r2.ok && cash - state.budget === KP.C.CONSTITUENCY.fanMeetingCost, 'the fan meeting is a real event with a real bill');
  t.ok(state.inbox.some(n => /cake shaped like the road manager/.test(n.text)), 'the cake incident is canon');
  t.ok(!KP.fanMeeting(state, g.id).ok, 'and it needs to breathe before the next one');
  const b0 = state.budget;
  const r3 = KP.launchLightstick(state, g.id);
  t.ok(r3.ok, 'the lightstick launches');
  t.eq(state.budget - b0, KP.C.CONSTITUENCY.lightstickRevenue - KP.C.CONSTITUENCY.lightstickCost,
    'and sells out, because that is what lightsticks do');
  t.ok(!KP.launchLightstick(state, g.id).ok, 'version 2 is a conversation for another era');
  const { state: s2, g: g2 } = debuted('ct-voice2');
  t.ok(!KP.launchLightstick(s2, g2.id).ok, 'a lightstick without a fandom is a lamp');
}

// ---- determinism ----
{
  const { state: a, g: ga } = debuted('ct-fork2');
  organize(ga);
  KP.setGroupConcept(a, ga.id, 'fusion');
  a.people[ga.members[0]].flags.burnout = 3;
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) {
    KP.advanceWeek(a); KP.advanceWeek(b);
    [a, b].forEach(s2 => {
      const scn = (s2.scenes || []).find(x => x.kind === 'fanTruck');
      if (scn) KP.resolveScene(s2, scn.id, 'half');
    });
  }
  t.eq(KP.serialize(a), KP.serialize(b), 'trucks, statements, and mashes fork clean');
}

t.finish();
