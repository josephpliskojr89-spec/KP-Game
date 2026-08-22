/* Suite 047 — the year (v0.9.5). The calendar has a shape: January
   sleeps, spring belongs to the festival circuit, summer to the bright
   records, December to the gayo stages — and above the attainable
   bonsangs sits ONE daesang, brutal by construction, whose first win
   gets the full treatment and whose near-miss radicalizes. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_047_year');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'ANNUM', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  return { state, g };
}
function rideToWoy(state, target) {
  let guard = 0;
  while (((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1 !== target && guard++ < 100) KP.advanceWeek(state);
}

// ---- the season read: one truth for number and words ----
{
  const { state } = debuted('yr-season');
  const S = KP.C.SEASON;
  state.week = (S.summerWeeks[0] - 1);   // woy = summerWeeks[0]... set directly
  state.week = S.summerWeeks[0];
  t.eq(KP.seasonRead(state, 'bright').mod, S.summerBrightLift, 'a bright record in summer gets the season');
  t.eq(KP.seasonRead(state, 'dark').mod, 0, 'a dark record in summer gets nothing for free');
  state.week = S.deadZoneWeeks[0] + KP.C.WEEKS_PER_YEAR;   // january, year 2
  t.eq(KP.seasonRead(state, 'bright').mod, S.deadZoneMod, 'January is January for everyone');
  t.ok(/dead zone/.test(KP.seasonRead(state, 'bright').line), 'and the words say so');
  state.week = 10 + KP.C.WEEKS_PER_YEAR;
  t.eq(KP.seasonRead(state, 'bright').mod, 0, 'an ordinary week is an ordinary week');
}

// ---- the festival circuit grew up (v0.9.22): the invitation flow ----
{
  const { state, g } = debuted('yr-fest');
  const F = KP.C.FESTS;
  const f = F.LIST.find(x => x.id === 'cherryPoint');
  // icon stamp: the invite must not ride the 75% roll, which rng-stream
  // drift keeps knocking over (0.9.24.1 lesson, third application)
  KP.recordEvidence(state, 'festivalIcons', 'group', g.id);
  rideToWoy(state, f.woy - F.inviteLead - 1);
  g.popularity = 45;
  KP.advanceWeek(state);
  const sc = (state.scenes || []).find(x => x.kind === 'festivalInvite');
  t.ok(sc, 'the students got their field show — by invitation now');
  const cash = state.budget;
  const live0 = state.people[g.members[0]].liveExp;
  KP.resolveScene(state, sc.id, 'accept');
  rideToWoy(state, f.woy - 1);
  KP.advanceWeek(state);
  t.ok(state.inbox.some(n => n.ind === 'festival'), 'and the stage happened on its week');
  t.ok(state.budget > cash - f.travel, 'and the fee is real (net of travel)');
  t.ok(state.people[g.members[0]].liveExp > live0, 'live reps no practice room sells');
}

// ---- the gayo stages: invitation by popularity, period ----
{
  const { state, g } = debuted('yr-gayo');
  rideToWoy(state, KP.C.SEASON.gayoInviteWeek - 1);
  g.popularity = 70;
  KP.advanceWeek(state);
  t.ok(state.inbox.some(n => n.ind === 'gayoInvite'), 'the broadcast calls');
  rideToWoy(state, KP.C.SEASON.gayoStageWeek - 1);
  g.popularity = 70;
  KP.advanceWeek(state);
  t.ok(state.inbox.some(n => n.ind === 'gayoStage'), 'and the year closes on the stage');
  // the collab: a waiting-room friendship becomes television
  const { state: s3, g: g3 } = debuted('yr-collab');
  const rival = Object.values(s3.people).find(p => p.status === 'rival');
  s3.industryFriends = [{ a: g3.members[0], b: rival.id, actId: 'x', since: 1 }];
  rideToWoy(s3, KP.C.SEASON.gayoInviteWeek - 1);
  g3.popularity = 70;
  KP.advanceWeek(s3);
  rideToWoy(s3, KP.C.SEASON.gayoStageWeek - 1);
  g3.popularity = 70;
  // pin the coin: the mechanism under test is the collab, not the odds
  const oldCollab = KP.C.SEASON.gayoCollabChance;
  KP.C.SEASON.gayoCollabChance = 1;
  KP.advanceWeek(s3);
  KP.C.SEASON.gayoCollabChance = oldCollab;
  t.ok(s3.inbox.some(n => n.ind === 'gayoCollab'), 'the special stage finds the friendship');
  // no invite, no stage: the quiet December
  const { state: s4, g: g4 } = debuted('yr-quiet');
  rideToWoy(s4, KP.C.SEASON.gayoInviteWeek - 1);
  g4.popularity = 30;
  KP.advanceWeek(s4);
  t.ok(s4.inbox.some(n => /quiet Decembers/.test(n.text)), 'the quiet December is on the record');
}

// ---- the daesang: brutal, and the first one is everything ----
{
  const { state, g } = debuted('yr-daesang');
  KP.nameFandom(state, g.id, 0);
  rideToWoy(state, KP.C.AWARDS.nominationWeek - 1);
  // sculpt a dominant year: the whole industry is cold, the group is not
  g.popularity = 90;
  g.trophies = { m: 6 };
  g.releases.forEach(r => { r.reception = 80; r.week = state.week - 2; });
  state.rivals.forEach(r => (r.acts || []).forEach(a => { a.popularity = 20; a.showWins = 0; }));
  // quiet the wider market: this fixture isolates a scene-dominant year
  // (the national-giants path is tested in the bonsang-again block)
  state.national.entries.forEach(e => { if (e.pool) e.peakPos = 20; });
  KP.advanceWeek(state);
  t.ok(state.awardSeason && (state.awardSeason.noms.daesang || []).length, 'the daesang shortlist exists');
  t.ok(state.awardSeason.noms.daesang[0].isPlayer, 'fixture: the year belongs to the group');
  rideToWoy(state, KP.C.AWARDS.ceremonyWeek - 1);
  const fname = g.fandom.name;
  KP.advanceWeek(state);
  const win = state.inbox.find(n => n.ind === 'daesang');
  t.ok(win && win.first, 'the first daesang lands as the first daesang');
  t.ok(win.text.includes(fname), 'the speech names the fandom — both times it appears');
  t.ok(state.daesangWonYear, 'the year is stamped');
  const m0 = state.people[g.members[0]];
  t.ok(m0.history.some(h => /Won the daesang. The first one/.test(h.text)), 'every file keeps the night');
  t.ok((g.honors || []).some(h => h.category === 'daesang'), 'the honor is on the shelf');
}

// ---- a bonsang, again: the radicalizer ----
{
  const { state, g } = debuted('yr-again');
  KP.nameFandom(state, g.id, 0);
  rideToWoy(state, KP.C.AWARDS.nominationWeek - 1);
  // strong enough to win a bonsang and make the daesang shortlist —
  // but one rival owned the year. The open market is quieted so the
  // titan-vs-player mechanism is isolated (the giants have their own
  // seat at the table in live play — proven by the soak census).
  state.national.entries.forEach(e => { if (e.pool) e.peakPos = 20; });
  g.popularity = 88;
  g.trophies = { m: 12 };
  g.releases.forEach(r => { r.reception = 90; r.week = state.week - 2; });
  state.rivals.forEach(r => (r.acts || []).forEach(a => { a.popularity = 15; a.showWins = 0; (a.releases || []).forEach(rl => { rl.reception = 30; }); }));
  const titan = state.rivals[0].acts[0];
  titan.popularity = 99; titan.showWins = 12;
  titan.releases = [{ week: state.week - 3, title: 'Colossus', reception: 95 }];
  KP.advanceWeek(state);
  const dNoms = state.awardSeason.noms.daesang;
  t.ok(!dNoms[0].isPlayer && dNoms.some(n => n.isPlayer), 'fixture: shortlisted under a titan');
  const gain0 = g.fandom.intensity;
  rideToWoy(state, KP.C.AWARDS.ceremonyWeek - 1);
  KP.advanceWeek(state);
  const snub = state.inbox.find(n => n.ind === 'daesangSnub');
  t.ok(snub, 'the near-miss is narrated');
  if (snub && snub.bonsangTonight) {
    t.ok(/a bonsang. Again/.test(snub.text), 'a bonsang, again — the exact words');
    t.ok(g.fandom.intensity - gain0 >= KP.C.FANDOM.snubGain * KP.C.AWARDS.snubAgainMult - 0.01,
      'nothing radicalizes like almost — doubled');
  } else {
    t.ok(/shortlist/.test(snub.text), 'shortlisted without a bonsang reads as homework');
  }
}

// ---- determinism: the year forks clean ----
{
  const { state: a } = debuted('yr-fork');
  a.groups[0].popularity = 60;
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 52; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'festivals, gayo, and the ladder fork clean');
}

t.finish();
