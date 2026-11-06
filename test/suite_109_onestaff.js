/* Suite 109 — the one market, part 2 (v0.10.43, §89 D8 + D9). One staff:
   the road manager lives on the group, the legacy coach IS the vocal
   seat, the referral and the street story and the evaluators' bylines
   speak the chairs' names, one poach scene covers seats and managers
   alike. The stage surfaces: the pile's festival/radio/fan-sign kinds
   are gone, its inds carry the pile's own name, and the migration folds
   an old save into all of it (the conventions' ledger and invites, the
   roster, the old poach scene, the orphaned bookings). */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_109_onestaff');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'ONESTAFF', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  state.budget = 500;
  return { state, g };
}

// ---- one staff: the manager on the group, the coach in the chair ---------------
{
  const { state, g } = debuted('os-staff');
  let guard = 0;
  while (!g.manager && guard++ < 3) KP.advanceWeek(state);
  t.ok(g.manager && g.manager.name && g.manager.since >= g.debutWeek, 'the road manager lives on the group');
  t.eq(KP.managerOf(state, g), g.manager, 'managerOf reads the group');
  t.ok(state.staffRoster === undefined && KP.staffOf === undefined, 'the staff roster and its door are gone');
  const S = KP.staffSeats(state);
  t.ok(S.vocal && S.vocal.name === KP.staffName(state.seed + '|coach'), 'the vocal seat is seeded from the legacy coach’s hash — the same name the old roster carried');
  t.eq(KP.seatHolderName(state, 'vocal'), S.vocal.name, 'and the seat speaks that name');
  t.eq(KP.scoutName(state), S.scout.name, 'the scout’s name is the chair’s');
  delete S.scout;
  t.eq(KP.scoutName(state), 'the scouting desk', 'an empty chair speaks as the desk');
  t.eq(KP.seatHolderName(state, 'perf'), S.perf.name, 'every chair the same way');
  // the evaluators' bylines follow the chairs
  const evl = KP.evaluate(state, state.people[g.members[0]]);
  const names = evl.domains.map(d => d.evaluator.name);
  t.ok(names.includes(S.vocal.name) && names.includes(S.perf.name) && names.includes('the scouting desk'), 'the reports are signed by whoever holds the chair (' + names.join(', ') + ')');
  t.ok(evl.domains.every(d => d.evaluator.id), 'with the evaluator’s own eyes kept — the read does not move');
  S.scout = { id: 'sfS', name: 'Scout Yoon', seatId: 'scout', tier: 'working', style: 'scrappy', warmth: 60, candor: 60, since: 1, resume: [] };
  const p = state.people[state.roster[0]];
  const story = KP.streetStoryOf(state, p);
  t.ok(!/Scout Im/.test(story) && (/Scout Yoon/.test(story) || !/Scout/.test(story)), 'the street story names the chair’s scout');
  p.history.push({ week: state.week, text: story });
  t.ok(KP.hasStreetStory(state, p), 'and the story is still recognized as a story whoever signed it');
}

// ---- one poach scene: the manager's counter-offer rides seatPoach --------------
{
  const { state, g } = debuted('os-poach');
  let guard = 0;
  while (!g.manager && guard++ < 3) KP.advanceWeek(state);
  g.popularity = 60;
  g.manager.since = state.week - 30;
  const MG = KP.C.HIRES.MANAGER;
  const old = MG.poachChance; MG.poachChance = 1;
  let sc = null; guard = 0;
  while (!sc && guard++ < 8) { KP.advanceWeek(state); sc = (state.scenes || []).find(x => x.kind === 'seatPoach' && x.groupId === g.id); }
  MG.poachChance = old;
  t.ok(sc && !sc.seatId, 'the road manager’s offer opens the one poach scene, keyed by the group');
  const def = KP.sceneDef('seatPoach');
  t.ok(/counter-offer/.test(def.title(state, sc)) && /van seating/.test(def.body(state, sc)), 'with the manager’s own words');
  t.ok(def.options(state, sc).map(o => o.id).join() === 'raise,walk', 'and the one vocabulary: match it, or wish them well');
  t.ok(state.inbox.concat(KP.lastTickNotes || []).some(n => /got an offer from/.test(n.text || '')), 'the members noticed the phone calls');
  const name = g.manager.name, cash = state.budget, r0 = state.staffLedger2.raises;
  KP.resolveScene(state, sc.id, 'raise');
  t.ok(g.manager && g.manager.name === name && g.manager.countered === state.week && cash - state.budget === KP.C.HIRES.raiseCost, 'the raise keeps her at the one price');
  t.eq(state.staffLedger2.raises, r0 + 1, 'ledgered on the hires ledger');
  // the goodbye, unanswered
  state.seatPoachQuiet = 0;
  state.scenes = (state.scenes || []).filter(x => x.kind !== 'seatPoach');
  KP.openScene(state, { kind: 'seatPoach', groupId: g.id, rivalName: 'Aozora Records', expiresWeek: state.week });
  const m0 = state.people[g.members[0]].morale, gen0 = g.managerGen || 0;
  KP.advanceWeek(state);
  t.ok(!g.manager || g.manager.name !== name, 'an unanswered window lets her sign elsewhere');
  t.ok((g.managerGen || 0) === gen0 + 1 && state.people[g.members[0]].morale <= m0, 'the members felt it, and the next manager is a new name');
}

// ---- the pile: the stage surfaces that left, the inds that stayed --------------
{
  const K = KP.C.BOOK.KINDS;
  t.ok(!K.uniFestival && !K.openerSlot && !K.localRadio && !K.radioTour && !K.fanSignSmall, 'festival, radio and fan-sign kinds left the pile');
  t.ok(K.theaterNight && K.clubNight && K.showcase && K.cableSpot, 'the stages that are only the pile’s stayed');
  t.ok(KP.feedReactionFor('bookingPlayed') && KP.feedReactionFor('bookingViral') &&
    !KP.feedReactionFor('gigPlayed') && !KP.feedReactionFor('gigViral') && !KP.feedReactionFor('gigBooked') && !KP.feedReactionFor('campaignPush'),
    'the pile’s inds carry the pile’s name; the dead reactions are gone');
  t.ok(KP.C.FESTS.maxAbroadPerYear >= 1 && KP.C.FESTS.LIST.filter(f => f.region).length >= 5, 'the far markets are festival rows');
}

// ---- the migration: an old save folds into one staff and one calendar ----------
{
  const s = KP.newGame('os-migrate', null, { legacy: true });
  const g = s.groups[0];
  const json = JSON.parse(KP.serialize(s));
  json.version = '0.10.42';
  json.staffRoster = { managers: {}, coach: { name: 'Coach Old', role: 'head vocal coach', since: 1 } };
  json.staffRoster.managers[g.id] = { name: 'Nam Dae-ho', since: 5, countered: 20 };
  json.poachQuietUntil = json.week + 9;
  json.seatPoachQuiet = json.week + 3;
  json.scenes = (json.scenes || []).concat([
    { id: 'scP', kind: 'staffPoach', groupId: g.id, rivalName: 'Aozora Records', expiresWeek: json.week + 2 },
    { id: 'scC', kind: 'circuitInvite', groupId: g.id, regionId: 'na', con: 'K-Wave Con Dallas', expiresWeek: json.week + 2 },
  ]);
  json.circuitLedger = { invites: 3, played: 2, declined: 1, tongueFlops: 1, enCuts: 1 };
  json.festivalLedger = { invites: 1, booked: 1, declined: 0, played: 1, headlines: 0, missed: 0 };
  json.bookings = [
    { id: 'bkA', kindId: 'uniFestival', rung: 1, label: 'X University festival stage', town: 'X', week: json.week + 3, expiresWeek: json.week + 2, fee: 4, taken: null },
    { id: 'bkB', kindId: 'radioTour', rung: 2, label: 'a national radio tour week', town: 'Seoul', week: json.week + 2, expiresWeek: json.week + 1, fee: 3, taken: g.id },
    { id: 'bkC', kindId: 'wedding', rung: 0, label: 'a hotel-ballroom wedding in Suwon', town: 'Suwon', week: json.week + 2, expiresWeek: json.week + 2, fee: 2, taken: null },
  ];
  const m = KP.deserialize(JSON.stringify(json));
  const mg = m.groups[0];
  t.ok(!m.staffRoster && mg.manager && mg.manager.name === 'Nam Dae-ho' && mg.manager.since === 5 && mg.manager.countered === 20, 'the road manager moved onto the group with her history');
  t.ok(m.poachQuietUntil === undefined && m.seatPoachQuiet === json.week + 9, 'the two poach clocks are one, the later one');
  t.ok(m.scenes.some(x => x.id === 'scP' && x.kind === 'seatPoach' && x.groupId === mg.id), 'the open counter-offer is the one poach scene now');
  t.ok(!m.scenes.some(x => x.kind === 'circuitInvite'), 'the open convention invite expired — the rows have dates now');
  t.ok(m.festivalLedger.invites === 4 && m.festivalLedger.declined === 1 && m.festivalLedger.abroadPlayed === 2 && m.festivalLedger.tongueFlops === 1, 'the conventions’ ledger folded into the festival ledger');
  t.ok(m.circuitLedger && m.circuitLedger.enCuts === 1 && m.circuitLedger.played === undefined, 'only the version lane keeps its count');
  t.ok(!m.bookings.some(b => b.id === 'bkA'), 'an open offer of a kind that left is off the pile');
  const kept = m.bookings.find(b => b.id === 'bkB');
  t.ok(kept && kept.kindId === 'cableSpot' && kept.rung === KP.C.BOOK.KINDS.cableSpot.rung, 'a taken booking of a kind that left plays as the nearest stage that stayed');
  t.ok(m.bookings.some(b => b.id === 'bkC'), 'and the wedding stage is untouched');
  for (let w = 0; w < 6; w++) KP.advanceWeek(m);
  t.ok(mg.manager, 'the migrated world runs — the manager is still in the van');
}

// ---- determinism --------------------------------------------------------------
{
  const { state: a } = debuted('os-fork');
  a.groups[0].popularity = 60;
  KP.regionsOf(a.groups[0]).na = 30;
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 40; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'one staff and one calendar fork clean');
}

t.finish();
