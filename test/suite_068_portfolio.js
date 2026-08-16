/* Suite 068 — the portfolio (v0.9.26, §69). Established houses debut
   on doctrine (the wave, the wall, the whitespace); pitches outside it
   get a no with a reason; units are the pressure valve; the exec hands
   the generational greenlight down when the wave turns. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_068_portfolio');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  state.budget = 800;
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'KEYSTONE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return { state, g };
}
// a second debuted group makes the house established, with both halls full
function establish(state, g) {
  const g2 = { id: 'gX', type: 'group', gender: g.gender === 'f' ? 'm' : 'f', gen: 3,
    name: 'SECONDHALL', members: [], roles: {}, debuted: true, debutWeek: state.week - 20,
    prep: null, results: null, demos: null, releases: [], popularity: 50,
    lastReleaseWeek: state.week - 5, promoUntil: 0 };
  // real members so lineup math holds
  const rng = KP.rngFor(state);
  for (let i = 0; i < 4; i++) {
    const p = KP.generatePerson(rng, { status: 'idol', gender: g2.gender });
    p.contract = { start: state.week - 20, years: 7, term: 1 };
    state.people[p.id] = p; state.roster.push(p.id); g2.members.push(p.id);
  }
  state.rngState = rng.state();
  state.nextPersonId = KP.peekNextId();
  state.groups.push(g2);
  return g2;
}

// ---- the doctrine: full house, closed window, a no with a reason ------
{
  const { state, g } = debuted('pf-doctrine');
  t.ok(!KP.isEstablished(state) || (g.popularity || 0) >= KP.C.PORTFOLIO.establishedPop,
    'one modest group is still a hungry startup');
  const g2 = establish(state, g);
  t.ok(KP.isEstablished(state), 'two halls fielded = established');
  // age the wave out of its window; keep flagships young
  state.gen = { n: 3, since: state.week - KP.C.PORTFOLIO.genWindowWeeks - 10, landmarks: [], torch: false };
  g.debutWeek = state.week - 30; g2.debutWeek = state.week - 20;
  const doc = KP.doctrineRead(state, null);
  t.ok(!doc.open, 'the doctrine says the portfolio is full');
  state.trust = 60;
  state.mandateCooldownUntil = 0;
  const r = KP.pitchMandate(state, { kind: 'group', gender: null });
  t.ok(!r.ok && /doctrine/.test(r.reason), 'the pitch gets a no WITH the reason');
  t.ok((state.mandateLedger || {}).doctrineDenied >= 1, 'ledgered');
  t.ok(state.mandateCooldownUntil > state.week + 20, 'and the calendar closes for a while');
  // whitespace reopens the door
  state.groups = state.groups.filter(x => x !== g2);
  t.ok(KP.doctrineRead(state, g2.gender).open, 'an empty hall is a doctrine reason');
  state.groups.push(g2);
  // a flagship at the wall reopens it too
  g.debutWeek = state.week - (KP.C.CONTRACT.years * KP.C.WEEKS_PER_YEAR - 10);
  t.eq(KP.doctrineRead(state, null).why, 'flagshipEnding', 'so is an era visibly closing');
}

// ---- the generational grant: the wave turns, the exec hands it down ---
{
  const { state, g } = debuted('pf-grant');
  establish(state, g);
  KP.advanceWeek(state);                       // genGrantN initializes mid-wave
  t.ok(state.genGrantN != null, 'the grant clock is armed');
  // the turn: consume any open fixture mandates first — and the grant
  // gates on a live bench (no directives into empty rooms), so seed one
  state.mandates = [];
  const rng2 = KP.rngFor(state);
  for (let i = 0; i < 2; i++) {
    const p = KP.generatePerson(rng2, { status: 'trainee', gender: 'f' });
    p.signedWeek = state.week;
    p.traineeContract = { start: state.week, years: 3, term: 1 };
    state.people[p.id] = p; state.roster.push(p.id);
  }
  state.rngState = rng2.state();
  state.nextPersonId = KP.peekNextId();
  state.gen = { n: (state.gen ? state.gen.n : 3) + 1, since: state.week, landmarks: [], torch: false };
  KP.advanceWeek(state);
  t.ok(KP.openMandates(state).some(m => m.kind === 'group' && m.source === 'the generational directive'),
    'the greenlight comes DOWN when the generation turns');
  t.ok(state.inbox.some(n => /The generation turned/.test(n.text)), 'in the exec’s own voice');
}

// ---- the unit era: the pressure valve ---------------------------------
{
  const { state, g } = debuted('pf-unit');
  let guard = 0;
  while (state.week <= (g.promoUntil || 0) && guard++ < 12) KP.advanceWeek(state);
  const picks = g.members.slice(0, 2);
  const budget0 = state.budget;
  const r = KP.planUnitEra(state, g.id, picks, 'DUO KEY');
  t.ok(r.ok, 'the unit era runs');
  t.ok(state.budget !== budget0, 'money moved both ways');
  t.eq((g.units || []).length, 1, 'the identity persists');
  t.ok(g.units[0].eras.length === 1 && g.units[0].name === 'DUO KEY', 'named, on the record');
  t.ok((state.portfolioLedger || {}).units === 1, 'ledgered');
  t.ok(state.inbox.some(n => n.ind === 'unitEra'), 'and the wire carries it');
  t.ok(!KP.planUnitEra(state, g.id, picks, null).ok, 'one unit era at a time');
  // same faces later = the same unit, era two
  g.lastUnitWeek = state.week - KP.C.PORTFOLIO.UNIT.cooldown - 1;
  const r2 = KP.planUnitEra(state, g.id, picks.slice().reverse(), null);
  t.ok(r2.ok && r2.unitName === 'DUO KEY', 'same members, same name, forever');
  t.eq(g.units.length, 1, 'no duplicate identities');
  t.eq(g.units[0].eras.length, 2, 'era two on the books');
}

// ---- determinism ------------------------------------------------------
{
  const { state } = debuted('pf-fork');
  const b = KP.deserialize(KP.serialize(state));
  for (let w = 0; w < 60; w++) { KP.advanceWeek(state); KP.advanceWeek(b); }
  t.eq(KP.serialize(state), KP.serialize(b), 'doctrine, grants, and units fork clean');
}

t.finish();
