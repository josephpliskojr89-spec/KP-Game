/* Suite 053 — the second job (v0.9.11). Productions call for the idols
   whose secondary strengths the market wants: a panel seat for the funny
   one, an MC mic for the poised one, an OST for the voice. The gig pays
   the person — and collides with the group calendar. Missed tapings get
   counted; enough of them and the production quietly recasts. Wrapped
   runs pay in attention, ambition, and eventually a narrative. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_053_gigs');

// the mechanism suites run lean; a debuted group with famous members is
// the fixture — fame sculpted directly, offers pinned when needed
function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'DAYJOB', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos ? g.demos[0].id : (g.demos = KP.generateDemos(state, KP.rngFor(state), g))[0].id,
    promo: 'modest', week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  return { state, g };
}
function famous(state, p) {
  p.social = Math.max(p.social || 0, KP.C.GIGS.minSocial + 5000);
}

// ---- the call comes for the right person, for the right reason ----
{
  const { state, g } = debuted('gig-offer');
  const G = KP.C.GIGS;
  const funny = state.people[g.members[0]];
  // sculpt the funny one past the panel bar, everyone else below every bar
  g.members.map(id => state.people[id]).forEach(p => {
    p.talents.charisma.cur = 30; p.talents.vocals.cur = 40;
    p.personality.warmth = 30; p.personality.confidence = 30; p.mediaExp = 0;
    p.social = 0;
  });
  funny.talents.charisma.cur = 85; funny.personality.warmth = 80;
  funny.personality.confidence = 75; funny.mediaExp = 60;
  famous(state, funny);
  t.ok(KP.derived(funny).varietySkill >= G.panelSkillMin, 'fixture: she reads funny on paper');
  const old = G.offerBaseChance;
  G.offerBaseChance = 1;   // pinned: the mechanism is the casting, not the coin
  KP.advanceWeek(state);
  G.offerBaseChance = old;
  const offers = KP.openGigOffers(state);
  t.eq(offers.length, 1, 'one call came in');
  t.eq(offers[0].personId, funny.id, 'for the funny one, by name');
  t.eq(offers[0].kind, 'panel', 'and it is a panel seat — the market read the derived stat');
  t.ok(G.SHOWS.includes(offers[0].show), 'the show has a name');
  t.ok(state.inbox.some(n => n.ind === 'gigOffer'), 'the offer reaches the desk');
  // decline: the desk clears, nothing sticks to her file
  const r = KP.respondGig(state, offers[0].id, false);
  t.ok(r.ok && KP.openGigOffers(state).length === 0, 'declining clears the desk');
}

// ---- the voice gets the OST; the drop pays and can be a hit ----
{
  const { state, g } = debuted('gig-ost');
  const G = KP.C.GIGS;
  const voice = state.people[g.members[1]];
  g.members.map(id => state.people[id]).forEach(p => {
    p.talents.charisma.cur = 30; p.talents.vocals.cur = 40;
    p.personality.warmth = 30; p.personality.confidence = 30; p.mediaExp = 0; p.social = 0;
  });
  voice.talents.vocals.cur = 88;
  famous(state, voice);
  const old = G.offerBaseChance;
  G.offerBaseChance = 1;
  KP.advanceWeek(state);
  G.offerBaseChance = old;
  const o = KP.openGigOffers(state)[0];
  t.ok(o && o.kind === 'ost' && o.personId === voice.id, 'the music director asked for the voice by name');
  const budget0 = state.budget;
  KP.respondGig(state, o.id, true);
  let guard = 0;
  while (KP.activeGigs(state).length && guard++ < 6) KP.advanceWeek(state);
  t.ok(state.budget > budget0, 'the OST paid on delivery');
  t.eq(voice.flags.ostDrops, 1, 'the drop is on her file');
  const note = state.inbox.find(n => n.ind === 'ostDrop');
  t.ok(note, 'the drop gets told');
  t.ok(voice.history.some(h => /Sang the .* OST/.test(h.text)), 'and the file keeps the receipt');
  // second drop mints the narrative
  voice.flags.ostDrops = KP.C.GIGS.ostVoiceAt - 1;
  state.gigs.push({ id: 'gigx', kind: 'ost', personId: voice.id, show: 'Signal Garden',
    weeksLeft: 1, weekly: 0, lump: 5, signedWeek: state.week, strain: 0, weeksRun: 0 });
  KP.advanceWeek(state);
  t.ok(KP.getNarrative(state, 'ostVoice', 'idol', voice.id), 'two dramas deep, she is the OST voice');
}

// ---- the run: pay, reps, drip — and the wrap pays the group too ----
{
  const { state, g } = debuted('gig-run');
  const p = state.people[g.members[0]];
  famous(state, p);
  state.week = Math.max(state.week, (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks + 1);   // idle group: no clash
  state.gigs = [{ id: 'gig1', kind: 'panel', personId: p.id, show: 'Off-Duty',
    weeksLeft: 6, weekly: 3, lump: 0, signedWeek: state.week, strain: 0, weeksRun: 0 }];
  const media0 = p.mediaExp, social0 = p.social || 0, pop0 = g.popularity;
  let guard = 0;
  while (KP.activeGigs(state).length && guard++ < 10) KP.advanceWeek(state);
  t.ok(p.mediaExp > media0, 'taping weeks build media reps (' + media0 + ' → ' + p.mediaExp + ')');
  t.ok((p.social || 0) > social0, 'the clips drip followers');
  t.eq(p.flags.panelArcs, 1, 'the wrapped arc is counted');
  t.ok(g.popularity >= pop0 + KP.C.GIGS.completePop, 'the group felt the individual shine');
  t.ok(state.inbox.some(n => n.ind === 'gigWrapped'), 'the sendoff gets told');
  t.ok(KP.feedReactionFor('gigSigned') && KP.feedReactionFor('gigWrapped') &&
       KP.feedReactionFor('gigRecast') && KP.feedReactionFor('ostDrop'),
    'every second-job ind answers through the registry');
}

// ---- the clash: busy weeks stretch her; missed tapings get counted ----
{
  const { state, g } = debuted('gig-clash');
  const G = KP.C.GIGS;
  const p = state.people[g.members[0]];
  state.week = Math.max(state.week, (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks + 1);
  state.gigs = [{ id: 'gig1', kind: 'panel', personId: p.id, show: 'Panic Quiz Club',
    weeksLeft: 12, weekly: 3, lump: 0, signedWeek: state.week, strain: 0, weeksRun: 0 }];
  g.demos = KP.generateDemos(state, KP.rngFor(state), g);
  const r = KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(r.ok && /tapes Panic Quiz Club/.test(r.warning || ''), 'the staff flag the second job at the lock');
  // pin the van: every busy week misses — the mechanism is the counting
  const oldMiss = G.clashMissChance;
  G.clashMissChance = 1;
  let guard = 0;
  while (KP.activeGigs(state).length && guard++ < 8) KP.advanceWeek(state);
  G.clashMissChance = oldMiss;
  const gig = state.gigs ? state.gigs.find(x => x.id === 'gig1') : null;
  t.ok(!KP.activeGigs(state).length, 'three missed tapings and the seat is gone');
  t.ok(state.inbox.some(n => n.ind === 'gigRecast'), 'the “lineup refresh” gets announced');
  t.ok(p.history.some(h => /Quietly written out/.test(h.text)), 'the file remembers how it ended');
  t.ok(state.inbox.some(n => /van did not make it/.test(n.text || '')), 'each miss was narrated before the axe');
}

// ---- the lever: pulling her out is controlled, and costs less ----
{
  const { state, g } = debuted('gig-quit');
  const p = state.people[g.members[0]];
  state.gigs = [{ id: 'gig1', kind: 'mc', personId: p.id, show: 'Weekly Antenna',
    weeksLeft: 15, weekly: 5, lump: 0, signedWeek: state.week, strain: 2, weeksRun: 4 }];
  const morale0 = p.morale;
  const r = KP.quitGig(state, 'gig1');
  t.ok(r.ok, 'the company can end it first');
  t.eq(KP.activeGigs(state).length, 0, 'the booking is over');
  t.eq(p.morale, Math.max(0, morale0 - KP.C.GIGS.quitMorale), 'being pulled out stings — less than being cut, but it stings');
  t.ok(p.history.some(h => /Pulled out of Weekly Antenna/.test(h.text)), 'the file says who chose');
  t.ok(!p.flags.mcRuns, 'no wrap credit for an unfinished run');
}

// ---- the narrative ladder: arcs become the variety monster ----
{
  const { state, g } = debuted('gig-monster');
  const p = state.people[g.members[0]];
  famous(state, p);
  state.week = Math.max(state.week, (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks + 1);
  p.flags.panelArcs = KP.C.GIGS.varietyMonsterAt - 1;
  state.gigs = [{ id: 'gig1', kind: 'panel', personId: p.id, show: 'Homework Hotel',
    weeksLeft: 1, weekly: 3, lump: 0, signedWeek: state.week, strain: 0, weeksRun: 9 }];
  KP.advanceWeek(state);
  const nar = KP.getNarrative(state, 'varietyMonster', 'idol', p.id);
  t.ok(nar, 'the second full arc makes her the variety monster');
  t.ok(/variety monster/.test(KP.narrativeText(state, nar)), 'and the coverage line says so');
  t.ok(KP.narrativeText(state, nar).includes(KP.displayName(p)), 'by name');
  // an MC run is a story on the first completion — the public trusts few faces
  const q = state.people[g.members[1]];
  state.gigs.push({ id: 'gig2', kind: 'mc', personId: q.id, show: 'Weekly Antenna',
    weeksLeft: 1, weekly: 5, lump: 0, signedWeek: state.week, strain: 0, weeksRun: 15 });
  KP.advanceWeek(state);
  t.ok(KP.getNarrative(state, 'nationalMC', 'idol', q.id), 'a full MC run is canon at once');
}

// ---- the ambition: her own seat feeds the variety dream ----
{
  const { state, g } = debuted('gig-dream');
  // find (or force) a variety dreamer in the room
  const p = state.people[g.members[0]];
  if (!(p.archetypes || []).includes('varietyNatural')) p.archetypes.push('varietyNatural');
  t.eq(KP.ambitionOf(state, p), 'variety', 'fixture: she wants this');
  delete p.flags.ambitionMet;
  state.week = Math.max(state.week, (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks + 1);
  state.gigs = [{ id: 'gig1', kind: 'panel', personId: p.id, show: 'The Long Lunch',
    weeksLeft: 1, weekly: 3, lump: 0, signedWeek: state.week, strain: 0, weeksRun: 11 }];
  KP.advanceWeek(state);
  t.ok(p.flags.ambitionMet, 'wrapping her own panel run is the thing she always wanted');
  t.ok(p.history.some(h => /always wanted/.test(h.text)), 'and her file keeps the day it landed');
}

// ---- the market has limits ----
{
  const { state, g } = debuted('gig-cap');
  const G = KP.C.GIGS;
  g.members.map(id => state.people[id]).forEach(p => {
    p.talents.charisma.cur = 85; p.personality.warmth = 80;
    p.personality.confidence = 75; p.mediaExp = 60; famous(state, p);
  });
  const old = G.offerBaseChance;
  G.offerBaseChance = 1;
  for (let w = 0; w < 4; w++) KP.advanceWeek(state);
  G.offerBaseChance = old;
  t.ok(KP.openGigOffers(state).length + KP.activeGigs(state).length <= G.maxActive,
    'open engagements cap at ' + G.maxActive + ' — the schedule is finite');
}

// ---- determinism ----
{
  const { state: a } = debuted('gig-fork');
  a.people[a.groups[0].members[0]].social = 60000;   // make offers plausible
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 40; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'calls, tapings, misses, and recasts fork clean');
}

t.finish();
