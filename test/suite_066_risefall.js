/* Suite 066 — the rise and fall (v0.9.24, map slot 9, §55.10 + §55.12
   + being poached + the rival service). Eras made legible, the annual
   power ranking with the overtake, collapse fallout as a signing
   class, the imperial house's job offer, named generations with the
   torch pass — and the rival world's boys at the wall. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_066_risefall');

function fresh(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  state.budget = 600;
  return state;
}
function ride(state, weeks) { for (let w = 0; w < weeks; w++) KP.advanceWeek(state); }

// ---- the eras: the trend reads out loud -------------------------------
{
  const state = fresh('rf-eras');
  const RF = KP.C.RISEFALL;
  const r = state.rivals[0];
  r.prestige = RF.imperialAt + 5;
  t.eq(KP.rivalEra(state, r), 'imperial', 'high water = imperial');
  r.prestige = RF.fadingBelow - 2;
  t.eq(KP.rivalEra(state, r), 'fading', 'low water = fading');
  r.prestige = 55;
  r.eraTrail = [{ w: state.week - 24, p: 55 - RF.risingDelta - 1 }];
  t.eq(KP.rivalEra(state, r), 'rising', 'a real climb = rising');
  r.eraTrail = [{ w: state.week - 24, p: 54 }];   // delta +1: no story
  t.eq(KP.rivalEra(state, r), 'steady', 'everything else holds steady');
}

// ---- the ranking: published, deltas, the overtake ---------------------
{
  const state = fresh('rf-rank');
  // ride to the second January so a delta exists
  ride(state, KP.C.WEEKS_PER_YEAR * 2 + 4);
  t.ok(state.powerRanking && state.powerRanking.entries.length >= 3, 'the trades publish');
  t.ok(state.riseFallLedger.rankings >= 2, 'every January, on schedule');
  t.ok(state.powerRanking.entries.some(e => e.isPlayer), 'we are IN the ranking');
  t.ok(state.inbox.some(n => n.ind === 'powerRanking'), 'and it lands on the wire');
  const ranks = state.powerRanking.entries.map(e => e.rank);
  t.eq(ranks.join(','), ranks.slice().sort((a, b) => a - b).join(','), 'ranks are ordinal');
}

// ---- the collapse mints a signing class, and the verb works -----------
{
  const state = fresh('rf-class');
  const doomed = state.rivals[0];
  // give the doomed house named people worth signing
  const rng = KP.rngFor(state);
  const named = [];
  for (let i = 0; i < 3; i++) {
    const p = KP.generatePerson(rng, { status: 'rival', gender: 'f' });
    p.company = doomed.short; p.age = 24;
    state.people[p.id] = p; named.push(p);
  }
  state.rngState = rng.state();
  state.nextPersonId = KP.peekNextId();
  const notes = [];
  KP.mintFreeAgents(state, doomed, notes);
  t.ok(state.freeAgents.length >= 3, 'the class is on the market');
  t.ok(notes.some(n => n.ind === 'signingClass'), 'and the wire says so by name');
  t.eq(state.riseFallLedger.classes, 1, 'ledgered');
  // the player verb: a career walks in the door — the class is drawn
  // from the WHOLE folded house (its act members outrank the fixtures,
  // which is the point), so sign whoever actually made the market
  const her = state.people[state.freeAgents[0].personId];
  const cost = KP.freeAgentCost(state, her);
  const budget0 = state.budget;
  const r = KP.signFreeAgent(state, her.id);
  t.ok(r.ok, 'signed');
  t.eq(state.budget, budget0 - cost, 'a career has a price');
  t.eq(her.status, 'trainee', 'in OUR building now');
  t.ok(state.roster.includes(her.id), 'on the roster');
  t.ok(her.flags.veteran === doomed.short, 'the file remembers the first house');
  t.ok(her.traineeContract, 'papered on arrival');
  t.ok(!state.freeAgents.some(f => f.personId === her.id), 'off the market');
  // an unsigned name's window closes on its own
  const other = state.people[state.freeAgents[0].personId];
  state.freeAgents.forEach(f => { f.until = state.week - 1; });
  KP.advanceWeek(state);
  t.ok(!state.freeAgents.length, 'windows close');
  t.ok(other.company && other.company !== doomed.short, 'careers do not wait politely');
}

// ---- the offer: the founding's mirror ---------------------------------
{
  const state = fresh('rf-offer');
  const RF = KP.C.RISEFALL;
  const suitor = state.rivals[0];
  suitor.prestige = RF.offerPrestige + 4;
  state.trust = RF.offerTrust + 10;
  let guard = 0;
  while (!(state.scenes || []).some(sc => sc.kind === 'theOffer') && guard++ < 40) {
    suitor.prestige = Math.max(suitor.prestige, RF.offerPrestige + 4);
    state.trust = Math.max(state.trust, RF.offerTrust + 10);
    KP.advanceWeek(state);
  }
  const sc = (state.scenes || []).find(x => x.kind === 'theOffer');
  t.ok(sc, 'the courier envelope arrives');
  t.eq(state.riseFallLedger.offers, 1, 'ledgered');
  const budget0 = state.budget, trust0 = state.trust;
  KP.resolveScene(state, sc.id, 'leverage');
  t.eq(state.budget, budget0 + RF.leverageBudget, 'the board finds the money');
  t.ok(state.trust > trust0, 'and staying is suddenly worth more');
  t.eq(state.riseFallLedger.leveraged, 1, 'the move is on the record');
}

// ---- generations: stamps, the turn, the torch -------------------------
{
  const state = fresh('rf-gen');
  const RF = KP.C.RISEFALL;
  KP.advanceWeek(state);
  t.ok(state.gen && state.gen.n === RF.GEN.start, 'the scene arrives mid-conversation');
  t.ok(state.rivals.every(r => r.acts.every(a => a.gen >= 1)), 'every act carries a number');
  // force the turn: age the wave, stack the landmarks
  state.gen.since = state.week - RF.GEN.minYears * KP.C.WEEKS_PER_YEAR - 4;
  for (let i = 0; i < RF.GEN.landmarksToTurn; i++) state.gen.landmarks.push(state.week - 2);
  KP.advanceWeek(state);
  t.eq(state.gen.n, RF.GEN.start + 1, 'the wave turns');
  t.ok(state.riseFallLedger.genTurns >= 1, 'ledgered');
  t.ok(state.inbox.some(n => n.ind === 'genTurned'), 'the trades make it official');
  // the torch: a current-gen rookie outsells the old guard. Stage the
  // rookie so its release lands through the industry weekly itself —
  // the riseFall weekly (562) reads weekReleases the same tick.
  const r = state.rivals[0];
  const guard1 = r.acts[0];
  guard1.gen = state.gen.n - 1; guard1.popularity = 75; guard1.retired = false;
  guard1.lastReleaseWeek = state.week; guard1.cycleWeeks = 500;   // the crown sits, quiet
  guard1.releases = (guard1.releases || []).concat([{ week: state.week - 4, title: 'OLD CROWN', reception: 60 }]);
  const rookie = { id: 'aTORCH', gender: 'f', gen: state.gen.n, name: 'NEWBLOOD',
    concept: guard1.concept, quality: 90, members: [], popularity: 60,
    debutWeek: state.week - 10, lastReleaseWeek: state.week - 30, cycleWeeks: 30,
    releases: [{ week: state.week - 30, title: 'FIRST', reception: 70, isDebut: true }], retired: false };
  r.acts.push(rookie);
  KP.advanceWeek(state);
  t.ok(state.gen.torch, 'the torch passes');
  t.ok(state.riseFallLedger.torchPasses >= 1, 'ledgered');
  t.ok(state.inbox.some(n => n.ind === 'torchPass'), 'and everyone knows it moved');
}

// ---- the rival service: the wall reaches their boys -------------------
{
  const state = fresh('rf-milrival');
  const M = KP.C.MIL;
  const r = state.rivals[0];
  // a warm boy act with a man at the wall → the rotation
  const rng = KP.rngFor(state);
  const men = [];
  for (let i = 0; i < 4; i++) {
    const p = KP.generatePerson(rng, { status: 'rival', gender: 'm' });
    p.company = r.short; p.age = 23;
    state.people[p.id] = p; men.push(p.id);
  }
  state.rngState = rng.state();
  state.nextPersonId = KP.peekNextId();
  const act = { id: 'aMIL', gender: 'm', gen: 3, name: 'BARRACKS', concept: 'fierce',
    quality: 60, members: men, popularity: 70, debutWeek: state.week - 100,
    lastReleaseWeek: state.week - 2, cycleWeeks: 500, releases: [], retired: false };
  r.acts.push(act);
  state.people[men[0]].age = M.deadlineAge;
  KP.advanceWeek(state);
  t.ok(act.serviceRotation, 'a warm act staggers — the rotation begins');
  t.ok(state.people[men[0]].flags.military, 'the first man is away');
  t.ok(state.riseFallLedger.rivalServices >= 1, 'ledgered');
  t.ok(state.inbox.some(n => n.ind === 'rivalEnlist'), 'the trades print the map');
  // the rotation ends: everyone served, the act whole
  act.serviceRotation.until = state.week + 1;
  KP.advanceWeek(state);
  t.ok(!act.serviceRotation, 'the rotation closes');
  t.ok(men.every(id => state.people[id].serviceDone), 'every man served');
  t.ok(state.inbox.some(n => n.ind === 'rivalReturn'), 'and the scene knows a return is coming');
  // a cool act pauses whole
  const act2 = { id: 'aMIL2', gender: 'm', gen: 3, name: 'GARRISON2', concept: 'fierce',
    quality: 55, members: [], popularity: 30, debutWeek: state.week - 100,
    lastReleaseWeek: state.week - 2, cycleWeeks: 500, releases: [], retired: false };
  const rng2 = KP.rngFor(state);
  const men2 = [];
  for (let i = 0; i < 3; i++) {
    const p = KP.generatePerson(rng2, { status: 'rival', gender: 'm' });
    p.company = r.short; p.age = 24;
    state.people[p.id] = p; men2.push(p.id);
  }
  state.rngState = rng2.state();
  state.nextPersonId = KP.peekNextId();
  act2.members = men2;
  r.acts.push(act2);
  state.people[men2[0]].age = M.deadlineAge;
  KP.advanceWeek(state);
  t.ok(act2.servicePause, 'a cool act enlists together — the whole chapter');
  t.ok(men2.every(id => state.people[id].flags.military || state.people[id].serviceDone ||
    state.people[id].age < M.minTogetherAge), 'the men are away');
  act2.servicePause.until = state.week + 1;
  KP.advanceWeek(state);
  t.ok(!act2.servicePause && act2.returnPrimed, 'the pause ends primed — the return will punch');
}

// ---- migration: old saves get the memory ------------------------------
{
  const state = fresh('rf-migrate');
  ride(state, 4);
  state.version = '0.9.23';
  delete state.gen;
  state.rivals.forEach(r => r.acts.forEach(a => { delete a.gen; }));
  KP.migrate(state);
  t.ok(state.gen && state.gen.n === KP.C.RISEFALL.GEN.start, 'the wave is declared');
  t.ok(state.rivals.every(r => r.acts.every(a => a.gen >= 1)), 'veterans stamped');
  t.ok(state.inbox.some(n => /power ranking every January/.test(n.text)), 'the trades explain themselves');
}

// ---- determinism ------------------------------------------------------
{
  const state = fresh('rf-fork');
  ride(state, 30);
  const b = KP.deserialize(KP.serialize(state));
  for (let w = 0; w < 60; w++) { KP.advanceWeek(state); KP.advanceWeek(b); }
  t.eq(KP.serialize(state), KP.serialize(b), 'rankings, eras, classes, and torches fork clean');
}

t.finish();
