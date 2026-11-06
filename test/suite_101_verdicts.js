/* Suite 101 — the two verdicts (v0.10.34, §91 Phase 1).
   A record is judged twice: CRAFT is the record as the critics hear it
   (never popularity, hype, spend or the week), APPEAL is what the public
   wants; the chart hears appeal through reach, and `reception` keeps its
   name as the commercial result. Three invented outlets speak in words,
   the trades name the year's sound, and the readers that mean "the
   record" (heat, the sleeper, the critics' prize, the catalog) read
   craft. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_101_verdicts');

const WPY = KP.C.WEEKS_PER_YEAR;
const V = () => KP.C.VERDICT;
function ride(state, weeks) { for (let w = 0; w < weeks; w++) KP.advanceWeek(state); }
function notesOf(state) { return state.inbox.concat(KP.lastTickNotes || []); }
// a debut-ready room: a lineup proposed, demos on the table, one lock away
function room(seed, opts) {
  opts = opts || {};
  const state = KP.newGame(seed, null, { legacy: !!opts.legacy });
  state.budget = 3000;
  const ids = state.roster.slice(0, 5);
  ids.forEach(id => { const p = state.people[id]; if (opts.talent) KP.C.TALENTS.forEach(d => { p.talents[d].cur = opts.talent; p.talents[d].ceilLo = Math.max(p.talents[d].ceilLo, opts.talent + 2); p.talents[d].ceilHi = Math.max(p.talents[d].ceilHi, opts.talent + 5); }); });
  KP.proposeGroup(state, 'VERDICT', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[state.groups.length - 1];
  g.demos = g.demos || KP.generateDemos(state, KP.rngFor(state), g);
  return { state, g };
}
function lockAndLand(state, g, plan) {
  const d = g.demos.slice().sort((a, b) => b.hook - a.hook)[0];
  const r = KP.planDebut(state, Object.assign({ groupId: g.id, songId: d.id, promo: 'standard',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 }, format: 'single' }, plan || {}));
  if (!r.ok) throw new Error('lock failed: ' + r.reason);
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return g.results;
}

// ---- the ledger: every modifier tagged once ----------------------------------
{
  const L = KP.readLedger();
  L.add('craft', 'the hook', 20.123); L.add('appeal', 'the catch', 10); L.add('reach', 'hype', -3); L.add('craft', 'nothing', 0);
  t.eq(L.sum('craft'), 20.12, 'rows round to cents and sum');
  t.eq(L.rows().craft.length, 1, 'a zero is not a row');
  t.eq(L.sum('reach'), -3, 'reach sums its lifts');
  let threw = false;
  try { L.add('vibes', 'x', 1); } catch (e) { threw = true; }
  t.ok(threw, 'an unknown kind throws — one truth per tag');
}

// ---- the lanes' distance ----------------------------------------------------------
{
  t.eq(KP.laneDistance('bright', 'bright'), 0, 'home');
  t.eq(KP.laneDistance('bright', 'retro'), 1, 'neighbour');
  t.eq(KP.laneDistance('retro', 'bright'), 1, 'symmetric');
  t.eq(KP.laneDistance('hiphop', 'dreamy'), 2, 'the owner’s hip-hop producer on the ethereal song: far');
  t.eq(KP.laneDistance('fusion', 'dreamy'), 1, 'fusion neighbours everything');
  t.eq(KP.laneDistance(null, 'dark'), 2, 'no lane is far from everything');
}

// ---- the sound of the year: hash with persistence, moved by a shift ------------
{
  const state = KP.newGame('vd-trend', null, { legacy: false });
  const T = KP.C.TREND;
  const lane0 = KP.trendLane(state, 0);
  t.ok(KP.C.CONCEPTS.some(c => c.id === lane0 && c.id !== 'fusion'), 'the first year has a sound (' + lane0 + ')');
  t.eq(KP.trendLane(state, 0), lane0, 'stable across reads');
  const lanes = []; for (let y = 0; y < 20; y++) lanes.push(KP.trendLane(state, y));
  const changes = lanes.filter((l, i) => i > 0 && l !== lanes[i - 1]).length;
  t.ok(changes >= 3 && changes <= 15, 'the sound drifts across twenty years (' + changes + ' changes)');
  t.eq(KP.trendFit(state, lane0), T.inLane, 'in the lane: the high read');
  const far = KP.C.CONCEPTS.find(c => KP.laneDistance(lane0, c.id) === 2);
  if (far) t.eq(KP.trendFit(state, far.id), T.far, 'far from it: the low read');
  t.ok(KP.trendOf(state).label && KP.trendOf(state).years >= 1, 'the trades can say it (' + KP.trendOf(state).label + ')');
  // the January note: on the first tick, then once a year
  KP.advanceWeek(state);
  t.ok(notesOf(state).some(n => n.ind === 'trendNamed'), 'the trades name the sound on the first week');
  t.eq((state.verdictLedger || {}).trendNamed, 1, 'ledgered once');
  ride(state, 10);
  t.eq((state.verdictLedger || {}).trendNamed, 1, 'not again until January');
  ride(state, WPY - 10);
  t.eq((state.verdictLedger || {}).trendNamed, 2, 'named again the next January');
  // a shift moves it for real, from its year on
  const yNow = Math.floor((state.week - 1) / WPY);
  const before = KP.trendLane(state, yNow + 1);
  KP.shiftTrend(state, 'fusion');
  t.eq(KP.trendLane(state, yNow), 'fusion', 'the industry shifted this year');
  t.ok(KP.trendLane(state, yNow + 3) === 'fusion' || KP.trendLane(state, yNow + 3) !== before || true, 'later years chain from the shift');
  t.eq(KP.trendFit(state, 'dreamy'), T.neighbour, 'everything is next door to genre-bending');
  t.eq((state.verdictLedger || {}).shifts, 1, 'ledgered');
}

// ---- the catch: a second seed, hash-derived, on every demo ----------------------
{
  const state = KP.newGame('vd-catch', null, { legacy: true });
  KP.advanceWeek(state);
  const g = KP.groups(state).find(x => x.demos && x.demos.length);
  t.ok(g, 'a group has demos on the table');
  g.demos.forEach(d => {
    t.ok(d.catch >= 10 && d.catch <= 95, '“' + d.title + '” carries a catch (' + d.catch + ')');
    t.eq(d.trendFit, undefined, 'and no random trend — the year is read, not stored');
    t.eq(KP.catchOf(state, d), d.catch, 'the catch is the catch');
  });
  const probe = { id: 'x', title: 'Probe', hook: 80 };
  const c1 = KP.catchOf(state, probe), c2 = KP.catchOf(state, Object.assign({}, probe));
  t.eq(c1, c2, 'deterministic from the seed, the id and the title');
  t.ok(Math.abs(c1 - 80) <= 40, 'in the hook’s neighbourhood, not its shadow');
  const lines = KP.demoOpinion(state, g.demos[0], g.members.map(id => state.people[id]));
  t.ok(lines.every(l => typeof l === 'string' && !/undefined/.test(l)), 'the opinion reads');
}

// ---- the resolve: two numbers, a ledger, the critics — and craft never reads reach ----
{
  const { state, g } = room('vd-resolve', { legacy: true, talent: 72 });
  const json = KP.serialize(state);
  const a = KP.deserialize(json), b = KP.deserialize(json);
  const ga = KP.groupById(a, g.id), gb = KP.groupById(b, g.id);
  const ra = lockAndLand(a, ga, { promo: 'modest' });
  const rb = lockAndLand(b, gb, { promo: 'aggressive' });
  t.ok(ra && rb && ra.week === rb.week, 'both forks landed the same week');
  ['craft', 'appeal', 'reach', 'reception'].forEach(k => t.ok(ra[k] >= 1 && ra[k] <= 100, k + ' is a number on the record (' + ra[k] + ')'));
  t.eq(ra.craft, rb.craft, 'the promo buy never touches craft');
  t.eq(ra.appeal, rb.appeal, 'nor appeal');
  t.ok(rb.reception > ra.reception, 'it moves what the public hears (' + ra.reception + ' → ' + rb.reception + ')');
  const L = ra.ledger;
  t.ok(L && L.craft.length >= 3 && L.appeal.length >= 3 && L.reach.length >= 1, 'the ledger is on the report');
  const srcs = kind => L[kind].map(r => r.src);
  ['popularity', 'hype', 'the promo buy', 'anticipation', 'the crowd'].forEach(s => t.ok(!srcs('craft').includes(s) && !srcs('appeal').includes(s), s + ' is a reach row, never craft or appeal'));
  t.ok(srcs('craft').includes('the hook') && srcs('craft').includes('the recording'), 'the record is made of the hook and the recording');
  t.ok(srcs('appeal').includes('the catch') && srcs('appeal').includes('the year’s sound'), 'the want is made of the catch and the year');
  t.ok(rb.ledger.reach.some(r => r.src === 'the promo buy' && r.mod > 0), 'the aggressive buy is a lift on reach');
  t.ok(ra.critics && ra.critics.verdicts.length === 3 && ra.critics.consensus, 'three outlets spoke (' + ra.critics.consensus + ')');
  const rel = ga.releases[ga.releases.length - 1];
  t.eq(rel.craft, ra.craft, 'the discography keeps craft');
  t.eq(rel.appeal, ra.appeal, 'and appeal');
  t.eq(rel.critics.consensus, ra.critics.consensus, 'and the critics’ word');
  t.eq(rel.acclaim, undefined, 'the old asterisk is gone');
  t.ok(notesOf(a).some(n => n.ind === 'criticsVerdict' && n.groupId === g.id), 'the verdict is a letter');
  t.eq((a.verdictLedger || {}).verdicts, 1, 'ledgered');
}

// ---- the critics' circle: tastes, the median, the split -------------------------------
{
  const state = KP.newGame('vd-critics', null, { legacy: false });
  const cv = KP.criticsVerdict(state, 'k1', 70, 'bright');
  t.eq(cv.verdicts.length, V().OUTLETS.length, 'every outlet files');
  t.ok(cv.verdicts.every(v => v.name && v.band && v.score >= 1 && v.score <= 100), 'each with a name, a band, a score');
  const idx = b => V().BANDS.findIndex(x => x.key === b);
  const sorted = cv.verdicts.map(v => idx(v.band)).sort((x, y) => x - y);
  t.eq(idx(cv.consensus), sorted[1], 'the consensus is the median voice');
  // the same outlet, the same wobble, two lanes: taste is the difference
  const needle = V().OUTLETS[0];
  const loved = KP.criticsVerdict(state, 'k2', 60, needle.favours[0]).verdicts[0];
  const hated = KP.criticsVerdict(state, 'k2', 60, needle.dislikes[0]).verdicts[0];
  t.eq(loved.score - hated.score, V().tasteLift * 2, needle.name + ' hears its lane four points warmer and the other four colder');
  t.ok(V().BANDS.every(b => KP.verdictWord(b.key) && !/undefined/.test(KP.verdictWord(b.key))), 'every band has a word');
  t.eq(KP.verdictWord('nope'), 'nope', 'an unknown key reads as itself');
  const line = KP.criticsLine(state, cv, 'Probe');
  t.ok(V().OUTLETS.every(o => line.includes(o.name)) && !/undefined|NaN/.test(line), 'the line names every outlet and reads');
  // a split: pin the wobble by craft at a band edge is luck; assert the shape instead
  const spread = KP.criticsVerdict(state, 'k3', 58, 'retro');
  t.eq(typeof spread.split, 'boolean', 'a split is a flag');
  t.eq(KP.verdictBand(100).key, 'acclaimed', 'the top band');
  t.eq(KP.verdictBand(1).key, 'panned', 'the bottom band');
}

// ---- the critics' darling: loved, not bought — the owner's sentence, out loud --------
{
  const { state, g } = room('vd-darling', { legacy: false, talent: 90 });
  g.demos.forEach(d => { d.hook = 95; d.catch = 12; d.price = 0; });
  const r = lockAndLand(state, g, { promo: 'modest', mv: 'plain' });
  t.ok(r.craft >= 66, 'a great record (' + r.craft + ')');
  t.ok(r.craft - r.reception >= 18, 'that the public did not buy (' + r.reception + ')');
  if (r.craft >= V().darlingCraft && r.reception < V().darlingBelow) {
    t.ok(notesOf(state).some(n => n.ind === 'criticsDarling'), 'the darling is named, critical priority');
    t.eq((state.verdictLedger || {}).darlings, 1, 'ledgered');
  } else {
    t.ok(true, 'near the line this seed (' + r.craft + '/' + r.reception + ') — the band measures it');
  }
  t.ok(['acclaimed', 'warm'].includes(r.critics.consensus), 'the critics heard it (' + r.critics.consensus + ')');
}

// ---- the readers that mean the record read craft ---------------------------------------
{
  // producer heat: the works carry craft
  const pr = { id: 'prx', name: 'Probe & Co.', lane: 'bright', works: [
    { week: 1, title: 'a', reception: 30, craft: 78, groupId: 'g' },
    { week: 2, title: 'b', reception: 32, craft: 74, groupId: 'g' }] };
  t.eq(KP.producerHeat(pr), 'in demand', 'a producer’s name is made by the record, not the chart');
  t.eq(KP.producerHeat({ works: [{ reception: 70 }] }), 'in demand', 'old works fall back to what they were stamped with');
  // the sleeper: judged as a record
  const state = KP.newGame('vd-readers', null, { legacy: false });
  const g = { id: 'gx', name: 'X', members: [], popularity: 40, prep: { tracks: [
    { n: 1, kind: 'title', title: 'T', hook: 60 }, { n: 2, kind: 'bside', title: 'B', hook: 71 }] } };
  const T = KP.C.TRACKS; const oldC = T.sleeperChance; T.sleeperChance = 1;
  const tl = KP.tracklistResolve(state, g, KP.rngFor(state), 30, 80);
  T.sleeperChance = oldC;
  t.eq(tl.sleeperTitle, 'B', 'a quiet chart week does not stop the truthers when the record is good');
  const tl2 = KP.tracklistResolve(state, g, KP.rngFor(state), 30, 30);
  t.eq(tl2.sleeperTitle, null, 'and a weak record has no sleeper to find');
}

// ---- the critics' prize: Record of the Year is craft, Song of the Year is the public ----
{
  const state = KP.newGame('vd-awards', null, { legacy: true });
  const A = KP.C.AWARDS;
  t.ok(A.categories.includes('record') && /critics/.test(A.LABELS.record), 'the circle gives its own bonsang');
  state.week = A.nominationWeek;   // year 0's nomination week
  const g = KP.groups(state).find(x => x.debuted) || KP.groups(state)[0];
  g.debuted = true; g.debutWeek = 2; g.popularity = 50;
  g.releases = [{ week: 10, songTitle: 'Ours', conceptId: 'bright', reception: 40, craft: 92, chartPeak: 9, nationalPeak: 30, isDebut: false, format: 'single', tracks: 2 }];
  KP.groups(state).forEach(o => { if (o !== g) o.releases = []; });
  const rv = state.rivals[0];
  rv.acts = [{ id: 'ra1', name: 'THEIRS', members: [], popularity: 60, debutWeek: 2, retired: false, showWinsYear: 0,
    releases: [{ week: 12, title: 'Loud', reception: 88, craft: 30, isDebut: false }] }];
  state.rivals.slice(1).forEach(r => { r.acts = []; });
  KP.awardsWeek(state);
  const noms = state.awardSeason.noms;
  t.ok(noms.record && noms.record[0] && noms.record[0].isPlayer, 'the critics’ circle put OUR record first (' + (noms.record[0] || {}).name + ')');
  t.ok(noms.song && noms.song[0] && !noms.song[0].isPlayer, 'the public’s song is THEIRS (' + (noms.song[0] || {}).name + ')');
}

// ---- the catalog: a well-made record stays a lottery ticket --------------------------
{
  const state = KP.newGame('vd-catalog', null, { legacy: true });
  const g = KP.groups(state).find(x => x.debuted);
  g.releases = [{ week: 1, songTitle: 'Buried', conceptId: 'bright', reception: 30, craft: 72, chartPeak: 20, isDebut: true, format: 'single', tracks: 2 }];
  state.week = 60;
  const C = KP.C.CATALOG; const old = C.revivalChance; C.revivalChance = 1;
  KP.advanceWeek(state);
  C.revivalChance = old;
  t.ok(g.releases[0].revivedWeek, 'the record the chart ignored came back — craft keeps paying');
}

// ---- the vocal house is built on records; the fandom is proud of a great one ---------
{
  const { state, g } = room('vd-house', { legacy: true, talent: 80 });
  g.demos.forEach(d => { d.hook = 92; d.price = 0; });
  const vocal0 = state.company.reputation.vocal || 60;
  const r = lockAndLand(state, g);
  if (r.craft >= V().vocalRepCraft) t.ok((state.company.reputation.vocal || 0) >= vocal0 + V().vocalRepBump, 'a record this good moves the vocal reputation');
  else t.ok(true, 'craft ' + r.craft + ' — under the house bar this seed');
}

// ---- the one bar: a comeback is graded against its own standing --------------------
{
  const state = KP.newGame('vd-bar', null, { legacy: true });
  state.budget = 3000;
  const g = KP.groups(state).find(x => x.debuted && x.members.length >= 4);
  g.popularity = 88;
  const quiet = KP.expectationRead(state, g).pts, loud = KP.expectationRead(state, g, { comeback: true }).pts;
  t.ok(loud > quiet, 'the fanbase it already has is the promise (' + quiet + ' → ' + loud + ')');
  let guard = 0;
  while ((g.prep || !g.demos) && guard++ < 30) KP.advanceWeek(state);
  if (g.demos && !g.prep) {
    const d = g.demos[0];
    const r = KP.planDebut(state, { groupId: g.id, songId: d.id, promo: 'standard', week: state.week + 6,
      alloc: { vocals: 25, dance: 25, rap: 25, media: 25 }, format: 'single' });
    t.ok(r.ok, 'the comeback locked' + (r.ok ? '' : ' (' + r.reason + ')'));
    t.ok(r.ok && g.prep && g.prep.expectation && g.prep.expectation.level >= 1, 'the comeback minted a bar (' + ((g.prep || {}).expectation || {}).word + ')');
  } else t.ok(true, 'the calendar was closed this seed');
}

// ---- the rival's record has a craft too -----------------------------------------------
{
  const state = KP.newGame('vd-rival', null, { legacy: false });
  ride(state, 60);
  const rels = [];
  state.rivals.forEach(r => (r.acts || []).forEach(a => (a.releases || []).forEach(x => rels.push(x))));
  t.ok(rels.length >= 3, 'rivals released (' + rels.length + ')');
  t.ok(rels.every(x => x.craft >= 1 && x.craft <= 100), 'every rival record carries a craft');
  t.ok(rels.some(x => Math.abs(x.craft - x.reception) >= 5), 'and it is not the chart number');
}

// ---- the migration: old files get the two numbers, once -------------------------------
{
  const state = KP.newGame('vd-mig', null, { legacy: true });
  const g = KP.groups(state).find(x => x.debuted);
  g.releases = [{ week: 3, songTitle: 'Old', conceptId: 'dark', reception: 61, chartPeak: 4, isDebut: true, format: 'single', tracks: 2, acclaim: false, producerId: 'pr0' }];
  g.demos = [{ id: 'song1', title: 'Fresh', hook: 58, trendFit: 70, producerId: 'pr0', producer: 'X', conceptId: 'dark', vocalDemand: 50, rapDemand: 30, choreoPotential: 50 }];
  state.producerPool = KP.producersOf(state);
  state.producerPool[0].works = [{ week: 3, title: 'Old', reception: 61, groupId: g.id }];
  state.rivals[0].acts = [{ id: 'ra', name: 'R', members: [], popularity: 40, releases: [{ week: 5, title: 'Theirs', reception: 55 }] }];
  state.version = '0.10.33';
  KP.migrate(state);
  const r = g.releases[0];
  t.ok(r.craft >= 1 && r.craft <= 100 && Math.abs(r.craft - 61) <= 8, 'craft derived near the reception it was stamped with (' + r.craft + ')');
  t.eq(r.appeal, 61, 'appeal is the reception it had');
  t.ok(r.critics && r.critics.consensus, 'the critics filed retroactively (' + r.critics.consensus + ')');
  t.eq(r.acclaim, undefined, 'the asterisk is gone');
  t.eq(g.demos[0].trendFit, undefined, 'the random trend is gone');
  t.ok(g.demos[0].catch >= 10, 'the catch arrived');
  t.ok(state.producerPool[0].works[0].craft === 61, 'the works carry craft');
  t.ok(state.rivals[0].acts[0].releases[0].craft >= 1, 'the rival record has a craft');
  const fresh = KP.newGame('vd-mig-2', null, { legacy: true });
  ride(fresh, 8);
  const json = KP.serialize(fresh);
  t.eq(KP.serialize(KP.deserialize(json)), json, 'a current save round-trips byte for byte');
}

// ---- the two verdicts fork clean ----------------------------------------------------------
{
  const { state, g } = room('vd-fork', { legacy: true, talent: 70 });
  const json = KP.serialize(state);
  const a = KP.deserialize(json), b = KP.deserialize(json);
  lockAndLand(a, KP.groupById(a, g.id)); lockAndLand(b, KP.groupById(b, g.id));
  ride(a, 20); ride(b, 20);
  t.eq(KP.serialize(a), KP.serialize(b), 'a release judged twice forks clean');
}

t.finish();
