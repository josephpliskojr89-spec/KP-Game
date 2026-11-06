/* Suite 102 — the studio (v0.10.35, §91 Phase 2).
   The song is made by named people. Producers own lanes (public) and a
   craft and a catch they never print; the fit law caps a composition by
   lane distance; writers own themes the same way, the pen owns hers
   from who she is, and a theme can fight the room. The commission is
   the player's verb; the house chairs write for free; the pitch stays. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_102_studio');

const ST = () => KP.C.STUDIO;
function ride(state, weeks) { for (let w = 0; w < weeks; w++) KP.advanceWeek(state); }
function notesOf(state) { return state.inbox.concat(KP.lastTickNotes || []); }
function room(seed, opts) {
  opts = opts || {};
  const state = KP.newGame(seed, null, { legacy: !!opts.legacy });
  state.budget = 3000;
  const ids = state.roster.slice(0, 5);
  ids.forEach(id => { const p = state.people[id]; if (opts.age) p.age = opts.age; if (opts.talent) KP.C.TALENTS.forEach(d => { p.talents[d].cur = opts.talent; p.talents[d].ceilLo = Math.max(p.talents[d].ceilLo, opts.talent + 2); p.talents[d].ceilHi = Math.max(p.talents[d].ceilHi, opts.talent + 5); }); });
  KP.proposeGroup(state, 'STUDIOLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[state.groups.length - 1];
  g.demos = g.demos || KP.generateDemos(state, KP.rngFor(state), g);
  return { state, g };
}
function land(state, g, demo, plan) {
  const r = KP.planDebut(state, Object.assign({ groupId: g.id, songId: demo.id, promo: 'standard',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 }, format: 'single' }, plan || {}));
  if (!r.ok) throw new Error('lock failed: ' + r.reason);
  let guard = 0;
  while (g.prep && guard++ < 12) KP.advanceWeek(state);
  return g.results;
}
function seatProducer(state, lane, tier, lane2) {
  state.seats = KP.staffSeats(state);
  state.seats.producer = { id: 'sf9_producer', name: 'Ma In-na', seatId: 'producer', tier: tier || 'known', knownForTag: null,
    resume: ['twelve years of other people’s records'], style: 'classicist', warmth: 60, candor: 60, since: state.week,
    lane, lane2: lane2 || null, works: [] };
  return KP.houseProducer(state);
}

// ---- the themes table holds together ------------------------------------------
{
  const T = KP.C.THEMES;
  t.ok(T.length === 10, 'ten themes');
  t.ok(T.every(th => th.lanes.length && th.lanes.every(l => KP.conceptById(l))), 'every theme sits in real lanes');
  t.ok(T.every(th => th.ages[0] < th.ages[1] && typeof th.breadth === 'number'), 'with an age band and a breadth');
  KP.C.CONCEPTS.filter(c => c.id !== 'fusion').forEach(c => t.ok(KP.themesForLane(c.id).length >= 1, c.id + ' has a natural theme'));
  t.eq(KP.themeById('nope'), null, 'an unknown theme is null');
}

// ---- the fit law: home, next door, far — a cap, whatever the skill ---------------
{
  const F = ST().fit;
  t.eq(KP.laneFitMult(['hiphop'], 'hiphop'), F.home, 'home turf');
  t.eq(KP.laneFitMult(['hiphop'], 'dark'), F.neighbour, 'next door');
  t.eq(KP.laneFitMult(['hiphop'], 'dreamy'), F.far, 'the owner’s hip-hop producer on the ethereal song');
  t.eq(KP.laneFitMult(['hiphop', 'retro'], 'dreamy'), F.neighbour, 'a second lane brings dreamy next door');
  t.eq(KP.laneFitMult([], 'bright'), F.far, 'no lanes, no fit');
  t.ok(/isn’t them/.test(KP.laneFitWord(['hiphop'], 'dreamy')), 'and the words say so');
  // the composition is the craft through the fit: a 90 far from his lane lands under a 60 at home
  const state = KP.newGame('st-fit', null, { legacy: false });
  const g = { id: 'gx', name: 'X', members: [], concept: null, releases: [] };
  const far = { id: 'pr-far', name: 'Far', lane: 'hiphop', lane2: null, craft: 90, catch: 60, works: [] };
  const home = { id: 'pr-home', name: 'Home', lane: 'dreamy', lane2: null, craft: 70, catch: 60, works: [] };
  state.producerPool = [far, home];
  let sumFar = 0, sumHome = 0;
  for (let i = 0; i < 40; i++) {
    const rng = new KP.Rng('fit-' + i);
    sumFar += KP.commissionedDemo(state, rng, g, { lane: 'dreamy', theme: 'longing', producerId: 'pr-far', writerId: null }).hook;
    sumHome += KP.commissionedDemo(state, rng, g, { lane: 'dreamy', theme: 'longing', producerId: 'pr-home', writerId: null }).hook;
  }
  t.ok(sumFar / 40 < sumHome / 40, 'a 90 out of his lane writes a weaker record than a 70 at home (' + (sumFar / 40).toFixed(1) + ' vs ' + (sumHome / 40).toFixed(1) + ')');
  t.ok(sumFar / 40 <= 66 && sumFar / 40 >= 50, 'regardless of how skilled — the cap is real, near 60 (' + (sumFar / 40).toFixed(1) + ')');
}

// ---- producers are people: public lanes, hidden craft and catch --------------------
{
  const state = KP.newGame('st-people', null, { legacy: true });
  const pool = KP.producersOf(state);
  t.ok(pool.every(pr => pr.craft >= ST().craftSpread[0] && pr.craft <= ST().craftSpread[1]), 'every producer has a craft');
  t.ok(pool.every(pr => pr.catch >= ST().catchSpread[0] && pr.catch <= ST().catchSpread[1]), 'and a commercial sense');
  t.ok(pool.every(pr => pr.lane2 === null || KP.laneDistance(pr.lane, pr.lane2) === 1), 'a second lane is always next door');
  t.ok(pool.some(pr => pr.lane2) || pool.length < 6, 'some producers are versatile');
  const again = KP.deserialize(KP.serialize(state));
  t.eq(JSON.stringify(KP.producersOf(again)), JSON.stringify(pool), 'the numbers survive the save and never re-roll');
  // the writers' room
  const writers = KP.writersOf(state);
  t.eq(writers.length, ST().writerCount, 'six writers');
  t.ok(writers.every(w => w.name && w.themes.length >= 2 && w.themes.every(th => KP.themeById(th)) && w.craft > 0), 'each with a name, themes and a craft');
  t.ok(new Set(writers.map(w => w.themes.join('/'))).size >= 4, 'with different themes between them');
  t.eq(KP.writerById(state, writers[0].id), writers[0], 'resolved by id');
  // the pen owns hers from who she is
  const p = state.people[state.roster[0]];
  p.personality.warmth = 80; p.personality.confidence = 70; p.personality.competitiveness = 60; p.age = 18;
  const pen = KP.penThemes(p);
  t.ok(pen.includes('devotion') && pen.length <= 3, 'warmth writes devotion (' + pen.join('/') + ')');
  const pw = KP.penWriter(state, p);
  t.ok(pw.pen && pw.id === p.id && pw.craft >= 20, 'the pen is a writer with her own craft');
  t.eq(KP.writerById(state, p.id).pen, true, 'resolved by her id too');
}

// ---- the pitch sheet carries the studio --------------------------------------------
{
  const state = KP.newGame('st-sheet', null, { legacy: true });
  KP.advanceWeek(state);
  const g = KP.groups(state).find(x => x.demos && x.demos.length);
  const pros = g.demos.filter(d => !d.writtenBy);
  t.ok(pros.length >= 4, 'the producers pitched');
  pros.forEach(d => {
    t.ok(d.writerId && d.writer && KP.themeById(d.theme), '“' + d.title + '” names its lyric and theme');
    t.ok(d.fitMult === ST().fit.home || d.fitMult === ST().fit.neighbour || d.fitMult === ST().fit.far, 'and the fit it was written at');
    const pr = KP.producerById(state, d.producerId);
    t.eq(d.fitMult, KP.laneFitMult(KP.producerLanes(pr), d.conceptId), 'which is the producer’s lanes against the lane');
    t.ok(d.catch >= 10 && d.catch <= 95, 'the catch reads the producer');
  });
  const lines = KP.demoOpinion(state, pros[0], g.members.map(id => state.people[id]));
  t.ok(lines.every(l => typeof l === 'string' && !/undefined/.test(l)), 'the opinion reads');
}

// ---- the commission: brief a record, wait, it lands beside the pitch --------------
{
  const { state, g } = room('st-comm', { legacy: false, age: 19 });
  const pr = KP.producersOf(state).find(p => KP.producerHeat(p) === 'unproven') || KP.producersOf(state)[0];
  const lane = pr.lane;
  const theme = KP.themesForLane(lane)[0] || KP.C.THEMES[0];
  const w = KP.writersOf(state).find(x => x.themes.includes(theme.id)) || KP.writersOf(state)[0];
  const bad = KP.commissionRead(state, g.id, { lane: 'nope', theme: theme.id, producerId: pr.id, writerId: w.id });
  t.ok(!bad.ok && /lane/.test(bad.reason), 'a brief needs a lane');
  const read = KP.commissionRead(state, g.id, { lane, theme: theme.id, producerId: pr.id, writerId: w.id });
  t.ok(read.ok && read.fee === KP.producerFee(pr) + KP.writerFee(w), 'the fee is the producer’s and the writer’s (' + read.fee + ')');
  t.eq(read.fitWord, 'home turf', 'the producer is on home turf');
  const budget0 = state.budget;
  const r = KP.commissionRecord(state, g.id, { lane, theme: theme.id, producerId: pr.id, writerId: w.id });
  t.ok(r.ok && r.weeks >= ST().COMMISSION.writeWeeks[0] && r.weeks <= ST().COMMISSION.writeWeeks[1], 'commissioned, with a clock (' + r.weeks + ')');
  t.eq(state.budget, budget0 - read.fee, 'billed');
  t.ok(g.commission && g.commission.due === state.week + r.weeks, 'the writing room is working');
  const twice = KP.commissionRecord(state, g.id, { lane, theme: theme.id, producerId: pr.id, writerId: w.id });
  t.ok(!twice.ok && /already/.test(twice.reason), 'one room at a time');
  const demos0 = g.demos.length;
  let guard = 0;
  while (g.commission && guard++ < 6) KP.advanceWeek(state);
  t.ok(!g.commission, 'the room delivered');
  const d = g.demos.find(x => x.commissioned);
  t.ok(d, 'the record is on the desk');
  t.eq(g.demos.length, demos0 + 1, 'beside the pitch');
  t.ok(d.price === 0 && d.theme === theme.id && d.writerId === w.id && d.producerId === pr.id && d.conceptId === lane, 'paid for, the brief on it');
  t.eq(d.fitMult, ST().fit.home, 'written at home turf');
  t.ok(notesOf(state).some(n => n.ind === 'commissionDone'), 'the desk hears it');
  t.eq((state.studioLedger || {}).landed, 1, 'ledgered');
  // the brief changes, the commissioned record stays on the desk
  KP.setGroupConcept(state, g.id, lane === 'bright' ? 'dark' : 'bright');
  t.ok(g.demos && g.demos.length === 1 && g.demos[0].commissioned, 'a direction change re-tools the pitch, not the record you paid for');
  // the ghost harvest never shops it
  KP.setGroupConcept(state, g.id, lane);
  ride(state, 1);
  if (!g.demos || !g.demos.some(x => x.commissioned)) { g.demos = g.demos || []; g.demos.push(d); }
  const other = g.demos.find(x => !x.commissioned) || d;
  const res = land(state, g, other);
  t.ok(!(state.ghostDemos || []).some(gh => gh.title === d.title), 'the commissioned record is never a ghost');
  t.ok(res && res.ledger.craft.some(rw => rw.src === 'the lyric'), 'the release carries the lyric');
}

// ---- the lyric: the writer's craft through her themes; the room can fight it -------
{
  const { state, g } = room('st-lyric', { legacy: true, talent: 70, age: 16 });
  const w = KP.writersOf(state)[0];
  const d = g.demos[0];
  d.writerId = w.id; d.writer = w.name; d.theme = 'grief'; d.conceptId = 'dreamy'; d.price = 0;
  const res = land(state, g, d);
  const rows = res.ledger.craft;
  t.ok(rows.some(r => r.src === 'the lyric' && r.mod > 0), 'the lyric is a craft row');
  t.ok(rows.some(r => r.src === 'the theme fights the room' && r.mod < 0), 'grief on sixteen-year-olds costs the record');
  t.ok(notesOf(state).some(n => n.ind === 'criticsVerdict' && /named the same problem/.test(n.text)), 'and every outlet named it');
  t.eq((state.studioLedger || {}).roomMiss, 1, 'ledgered');
  const rel = g.releases[g.releases.length - 1];
  t.ok(rel.writerId === w.id && rel.theme === 'grief', 'the discography keeps the lyric’s name and theme');
  t.ok(w.works.length === 1 && w.works[0].craft === res.craft, 'the writer’s name is made by the record');
  t.ok(res.ledger.appeal.some(r => r.src === 'the theme'), 'a theme has a breadth');
}

// ---- access: who takes the call ----------------------------------------------------
{
  const state = KP.newGame('st-access', null, { legacy: false });
  const g = { id: 'gx', name: 'X', members: [] };
  const pr = KP.producersOf(state)[0];
  pr.works = [{ week: 1, title: 'a', craft: 80, reception: 70, groupId: 'other' }, { week: 2, title: 'b', craft: 78, reception: 70, groupId: 'other' }];
  t.eq(KP.producerHeat(pr), 'in demand', 'a producer in demand');
  const acc = KP.producerAccess(state, g, pr);
  t.ok(!acc.ok && /calendar is full/.test(acc.reason), 'does not take a nobody’s call');
  pr.works.push({ week: 3, title: 'c', craft: 80, reception: 70, groupId: 'gx' }, { week: 4, title: 'd', craft: 80, reception: 70, groupId: 'gx' });
  t.ok(KP.producerAccess(state, g, pr).ok, 'unless there are records together');
  pr.works = [];
  t.ok(KP.producerAccess(state, g, pr).ok, 'an unproven name takes any call');
  t.eq(KP.producerFee(pr), ST().COMMISSION.fees.unproven, 'and charges like one');
  const r = KP.commissionRecord(state, state.groups[0] ? state.groups[0].id : 'none', { lane: 'bright', theme: 'summer', producerId: 'nope', writerId: 'wr0' });
  t.ok(!r.ok, 'an unknown producer is refused');
}

// ---- the house chairs: free, exclusive, their lane is their lane --------------------
{
  const { state, g } = room('st-house', { legacy: true, age: 20 });
  const hp = seatProducer(state, 'dark', 'known', 'performance');
  t.ok(hp && hp.house && hp.id === 'seat:producer' && hp.craft >= 10 && hp.craft <= 95, 'the house producer is a producer');
  t.eq(KP.producerFee(hp), 0, 'no fee');
  t.ok(KP.producerAccess(state, g, hp).ok, 'always takes the call');
  t.eq(KP.laneFitMult(KP.producerLanes(hp), 'dark'), ST().fit.home, 'home on dark');
  t.eq(KP.laneFitMult(KP.producerLanes(hp), 'dreamy'), ST().fit.far, 'and far from dreamy — the house chair sends you to the market anyway');
  state.seats.writer = { id: 'sf9_writer', name: 'Seo Ji-woo', seatId: 'writer', tier: 'working', knownForTag: null, resume: ['a drawer of lyrics'],
    style: 'nurturer', warmth: 70, candor: 50, since: state.week, themes: ['defiance', 'nightDrive'], works: [] };
  const hw = KP.houseWriter(state);
  t.ok(hw && hw.house && KP.writerFee(hw) === 0, 'the house writer writes free');
  const r = KP.commissionRecord(state, g.id, { lane: 'dark', theme: 'defiance', producerId: 'seat:producer', writerId: 'seat:writer' });
  t.ok(r.ok && r.fee === 0, 'a house record costs nothing but the weeks');
  let guard = 0; while (g.commission && guard++ < 6) KP.advanceWeek(state);
  const d = (g.demos || []).find(x => x.commissioned);
  t.ok(d && d.bonded, 'the house is bonded from day one');
  const res = land(state, g, d);
  t.eq((state.studioLedger || {}).houseRecords, 1, 'a house record, ledgered');
  t.ok(hw.works.length === 1 || KP.houseWriter(state).works.length === 1, 'the chair keeps its receipts');
  // the chairs are in the building, and a candidate for one carries lanes
  t.ok(KP.C.HIRES.SEATS.some(s => s.id === 'producer' && s.studio) && KP.C.HIRES.SEATS.some(s => s.id === 'writer' && s.studio), 'two studio chairs');
  const s2 = KP.newGame('st-cand', null, { legacy: true });
  s2.budget = 500;
  const o = KP.openSearch(s2, 'producer');
  t.ok(o.ok, 'help wanted for a house producer');
  KP.advanceWeek(s2);
  const sc = (s2.scenes || []).find(x => x.kind === 'theInterview');
  t.ok(sc && sc.cand.seatId === 'producer' && sc.cand.lane && KP.conceptById(sc.cand.lane), 'the candidate’s lanes are on the file (' + (sc ? sc.cand.lane : '-') + ')');
  t.ok(/Known lanes/.test(KP.sceneDef('theInterview').body(s2, sc)), 'and the interview says them');
  const hire = KP.resolveScene(s2, sc.id, 'hire');
  t.ok(hire.ok && KP.houseProducer(s2) && KP.houseProducer(s2).lane === sc.cand.lane, 'hired: the chair is a producer with that lane');
  // old truths did not move under the new chairs
  const core = KP.C.HIRES.SEATS.filter(s => !s.studio);
  t.eq(core.length, 6, 'the six core chairs draw the best seat');
}

// ---- the migration: old desks get writers, themes and fit ---------------------------
{
  const state = KP.newGame('st-mig', null, { legacy: true });
  const g = KP.groups(state).find(x => x.debuted);
  const pr = KP.producersOf(state)[0];
  g.demos = [{ id: 'song1', title: 'Old', hook: 58, producerId: pr.id, producer: pr.name, conceptId: pr.lane, vocalDemand: 50, rapDemand: 30, choreoPotential: 50, catch: 50 }];
  delete state.writerPool;
  state.producerPool.forEach(p => { delete p.craft; delete p.catch; delete p.lane2; });
  state.version = '0.10.34';
  KP.migrate(state);
  const d = g.demos[0];
  t.ok(d.writerId && d.writer && KP.themeById(d.theme), 'the old demo has a lyric and a theme (' + d.theme + ')');
  t.eq(d.fitMult, ST().fit.home, 'written at the producer’s own lane');
  t.ok(KP.producersOf(state).every(p => p.craft != null && p.catch != null && p.lane2 !== undefined), 'the pool’s hidden numbers backfilled');
  t.eq(KP.writersOf(state).length, ST().writerCount, 'the writers’ room minted');
  const fresh = KP.newGame('st-mig-2', null, { legacy: true });
  ride(fresh, 6);
  const json = KP.serialize(fresh);
  t.eq(KP.serialize(KP.deserialize(json)), json, 'a current save round-trips byte for byte');
}

// ---- the studio forks clean ----------------------------------------------------------
{
  const { state, g } = room('st-fork', { legacy: true, age: 20 });
  const pr = KP.producersOf(state).find(p => KP.producerAccess(state, g, p).ok);
  KP.commissionRecord(state, g.id, { lane: pr.lane, theme: KP.themesForLane(pr.lane)[0].id, producerId: pr.id, writerId: KP.writersOf(state)[0].id });
  const json = KP.serialize(state);
  const a = KP.deserialize(json), b = KP.deserialize(json);
  ride(a, 16); ride(b, 16);
  t.eq(KP.serialize(a), KP.serialize(b), 'a commission in flight forks clean');
}

t.finish();
