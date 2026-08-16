/* Suite 064 — festival season + award night (v0.9.22, map slot 7).
   §55.4: named annuals that INVITE — schedule surgery read out loud,
   travel with a bill, a fee, a slot, headline calls for icons — and
   the year-end ceremony played out: the seating chart, the microphone
   decision, the speech (or the one that stayed folded). */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_064_festivals');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  state.budget = 600;
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'LANTERNJAW', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return { state, g };
}
function rideTo(state, absWeek, handler) {
  let guard = 0;
  while (state.week < absWeek && guard++ < 120) {
    if (handler) handler();
    KP.advanceWeek(state);
  }
}

// ---- the invitation: a scene with the schedule read out loud ----------
{
  const { state, g } = debuted('fs-invite');
  g.popularity = 50;
  const F = KP.C.FESTS;
  const f = F.LIST.find(x => x.id === 'hanRiver');
  const inviteWeek = f.woy - F.inviteLead;   // year 1 absolute = woy
  rideTo(state, inviteWeek, () => { g.popularity = Math.max(g.popularity, 50); });
  KP.advanceWeek(state);
  const sc = (state.scenes || []).find(x => x.kind === 'festivalInvite' && x.festivalId === 'hanRiver');
  t.ok(sc, 'the organizers reach out, weeks ahead');
  t.ok(state.festivalLedger.invites >= 1, 'ledgered');
  t.ok(state.inbox.some(n => /Han River Summer Wave organizers/.test(n.text)), 'by name, on the desk');
  // the schedule surgery reads out loud
  g.promoUntil = f.woy + 1;
  const body = KP.sceneDef('festivalInvite').body(state, sc);
  t.ok(/promotions are still running/.test(body), 'the conflicts are read out loud');
  g.promoUntil = 0;
  // accept: travel bills now, the slot books
  const budget0 = state.budget;
  const r = KP.resolveScene(state, sc.id, 'accept');
  t.ok(r.ok !== false, 'the slot is taken');
  t.eq(state.budget, budget0 - f.travel, 'travel bills up front');
  t.ok(g.festivalBookings.some(b => b.festivalId === 'hanRiver'), 'booked');
  // the stage plays on its week
  const played0 = g.festivalsPlayed || 0;
  rideTo(state, f.woy);
  KP.advanceWeek(state);
  t.eq(g.festivalsPlayed, played0 + 1, 'the stage happened');
  t.ok(state.festivalLedger.played >= 1, 'and the ledger knows');
  t.ok(state.inbox.some(n => n.ind === 'festival' && /Han River Summer Wave/.test(n.text)),
    'the wire carries the field');
}

// the icons get the headline call — and a booked slot can be missed
{
  const { state, g } = debuted('fs-headline');
  g.popularity = 60;
  KP.recordEvidence(state, 'festivalIcons', 'group', g.id);
  const F = KP.C.FESTS;
  const f = F.LIST.find(x => x.id === 'moonlitGarden');
  rideTo(state, f.woy - F.inviteLead, () => { g.popularity = Math.max(g.popularity, 60); });
  KP.advanceWeek(state);
  const sc = (state.scenes || []).find(x => x.kind === 'festivalInvite' && x.festivalId === 'moonlitGarden');
  t.ok(sc && sc.headline, 'the icons get the top of the poster');
  state.budget = Math.max(state.budget, 100);
  KP.resolveScene(state, sc.id, 'accept');
  // the calendar eats the booking: an official hiatus lands on the date
  g.hiatus = { since: state.week };
  rideTo(state, f.woy);
  KP.advanceWeek(state);
  t.ok(state.festivalLedger.missed >= 1, 'a booked slot missed is ledgered');
  t.ok(state.inbox.some(n => /pulled out of Gyeongju Moonlight Garden/.test(n.text)),
    'and the train tickets are right to be angry');
}

// declines and silence both close the door politely
{
  const { state, g } = debuted('fs-decline');
  g.popularity = 50;
  const F = KP.C.FESTS;
  const f = F.LIST.find(x => x.id === 'hanRiver');
  rideTo(state, f.woy - F.inviteLead, () => { g.popularity = Math.max(g.popularity, 50); });
  KP.advanceWeek(state);
  const sc = (state.scenes || []).find(x => x.kind === 'festivalInvite');
  t.ok(sc, 'fixture: the invitation');
  KP.resolveScene(state, sc.id, 'decline');
  t.ok(state.festivalLedger.declined >= 1, 'regrets are ledgered');
  t.ok(!(g.festivalBookings || []).length, 'and nothing is booked');
}

// ---- award night: the seating chart and the microphone ----------------
{
  const { state, g } = debuted('fs-night');
  const A = KP.C.AWARDS;
  // make the year undeniable so nominations include us
  g.popularity = 75;
  g.trophiesYear = 6;
  if (g.fandom) g.fandom.intensity = 70;
  rideTo(state, A.nominationWeek, () => {
    g.popularity = 75; g.trophiesYear = Math.max(g.trophiesYear || 0, 6);
  });
  KP.advanceWeek(state);
  t.ok(state.awardSeason, 'fixture: the season opens');
  const nominated = Object.values(state.awardSeason.noms).some(list =>
    (list || []).some(n => n.isPlayer));
  t.ok(nominated, 'fixture: we are on the list');
  rideTo(state, A.ceremonyWeek - 1);   // the chart arrives ON this week
  const sc = (state.scenes || []).find(x => x.kind === 'awardNight');
  t.ok(sc, 'the seating chart reaches the desk');
  const opts = KP.sceneDef('awardNight').options(state, sc);
  t.ok(opts.some(o => o.id === 'leader'), 'the leader is always an answer');
  KP.resolveScene(state, sc.id, (opts.find(o => o.id === 'breakout') || opts[0]).id);
  t.ok(state.awardNightPlan && state.awardNightPlan.speakerId, 'the microphone has a name');
  const speaker = state.people[state.awardNightPlan.speakerId];
  KP.advanceWeek(state);   // the ceremony
  t.ok(!state.awardSeason, 'fixture: the ceremony resolved');
  t.ok(!state.awardNightPlan, 'the plan is consumed with the night');
  const spoke = speaker.history.some(h => /acceptance speech on year-end/.test(h.text));
  const folded = state.inbox.some(n => /speech stayed folded/.test(n.text));
  t.ok(spoke || folded, 'the night ends with the speech — given, or folded in a pocket');
  if (spoke) {
    t.ok((speaker.directed || []).some(d => d.kind === 'gaveTheSpeech'), 'and she remembers the mic');
  }
}

// ---- determinism ------------------------------------------------------
{
  const { state: a, g } = debuted('fs-fork');
  a.people[g.members[0]].social = 30000;
  g.popularity = 55;
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 45; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'invitations, stages, and ceremonies fork clean');
}

t.finish();
