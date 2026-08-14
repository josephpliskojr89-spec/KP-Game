/* Suite 044 — the building, boy groups, and the company's own names
   (v0.8.4). The staff get names rivals can steal, the exec gets taste
   and a board, both halls of the audition building open, and naming
   rights come home. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_044_building');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'BLDG', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  state.nextMeetingWeek = 900;
  state.doorQuietUntil = 900;
  (state.scenes || []).length = 0;
  return { state, g };
}

// ---- the pronoun kit: the girls cost nothing, the boys read right ----
{
  const f = { gender: 'f' }, m = { gender: 'm' };
  t.eq(KP.fillPro('{She} said {she} keeps {pos} notes to {herself}; ask {her}.', f),
    'She said she keeps her notes to herself; ask her.', 'female output is byte-faithful');
  t.eq(KP.fillPro('{She} said {she} keeps {pos} notes to {herself}; ask {her}.', m),
    'He said he keeps his notes to himself; ask him.', 'male output is grammatical');
  t.eq(KP.fillPro('a plain string', null), 'a plain string', 'no placeholders, no work');
}

// ---- both halls: boys reach the board, with their own names ----
{
  let boys = 0, girls = 0;
  for (let s = 0; s < 6; s++) {
    const state = KP.newGame('bldg-mix-' + s, null, { legacy: false });
    state.prospects.forEach(id => {
      if (state.people[id].gender === 'm') boys++; else girls++;
    });
  }
  t.ok(boys > 0, 'boys appear on the opening board (' + boys + ' across 6 worlds)');
  t.ok(girls > boys, 'the mandate still leans the board female (' + girls + ' vs ' + boys + ')');
  const state = KP.newGame('bldg-names', null, { legacy: false });
  const boy = state.prospects.map(id => state.people[id]).find(p => p.gender === 'm');
  if (boy) t.ok(!/[aeiou]{3}/.test(boy.name.given) && boy.name.given.includes('-'),
    'male given names use the male syllable pools (' + (boy && boy.name.given) + ')');
}

// ---- one group, one gender ----
{
  const state = KP.newGame('bldg-mixed', null, { legacy: false });
  const girl = state.roster.map(id => state.people[id])[0];
  const boyP = KP.generatePerson(KP.rngFor(state), { status: 'trainee', gender: 'm' });
  state.people[boyP.id] = boyP; state.roster.push(boyP.id);
  boyP.signedWeek = 1;
  const ids = [girl.id, boyP.id].concat(state.roster.slice(1, 4).filter(id => id !== boyP.id)).slice(0, 4);
  const r = KP.proposeGroup(state, 'MIXED', ids, { leader: ids[0], center: ids[0] });
  t.ok(!r.ok && /One group, one gender/.test(r.reason), 'mixed lineups are a different business plan');
}

// ---- a boy group runs the whole machine ----
{
  const state = KP.newGame('bldg-boys', null, { legacy: false });
  const rng = KP.rngFor(state);
  const boys = [];
  for (let i = 0; i < 4; i++) {
    const b = KP.generatePerson(rng, { status: 'trainee', gender: 'm' });
    b.signedWeek = 1;
    state.people[b.id] = b; state.roster.push(b.id); boys.push(b.id);
  }
  state.rngState = rng.state();
  state.nextPersonId = KP.peekNextId();   // generated people must claim their ids
  KP.openMandate(state, { kind: 'group', gender: 'm', source: 'fixture greenlight' });
  const r = KP.proposeGroup(state, 'ATLAS', boys, KP.roleHints(state, boys.map(i => state.people[i])));
  t.ok(r.ok, 'a boy-group lineup proposes clean');
  const g = state.groups.find(x => x.name === 'ATLAS');
  t.eq(g.gender, 'm', 'and the group knows what it is');
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  t.ok(g.debuted, 'the boys debut on the same machine');
  t.ok(g.results && g.results.reception > 0, 'and the market answers');
}

// ---- naming rights: the group ----
{
  const state = KP.newGame('bldg-name', null, { legacy: false });
  const ids = state.roster.slice(0, 4);
  const hints = KP.roleHints(state, ids.map(i => state.people[i]));
  t.ok(!KP.proposeGroup(state, '   ', ids, hints).ok, 'a name needs letters');
  const r = KP.proposeGroup(state, 'MY OWN NAME', ids, hints);
  t.ok(r.ok && state.groups[0].name === 'MY OWN NAME', 'a typed name is the name');
}

// ---- naming rights: the record ----
{
  const { state, g } = debuted('bldg-title');
  let guard = 0;
  while (!g.demos && guard++ < 20) KP.advanceWeek(state);
  const demo = g.demos[0];
  const r = KP.renameDemo(state, g.id, demo.id, 'OUR TITLE');
  t.ok(r.ok && demo.title === 'OUR TITLE' && demo.renamed, 'the company names the record');
  t.ok(!KP.renameDemo(state, g.id, demo.id, g.releases[0].songTitle).ok,
    'the archive keeps receipts — no duplicate titles');
  t.ok(!KP.renameDemo(state, g.id, 'nope', 'X').ok, 'a missing demo refuses gently');
}

// ---- the building: a named manager arrives with the debut ----
{
  const { state, g } = debuted('bldg-staff');
  const m = KP.managerOf(state, g);
  t.ok(m && m.name && m.since >= g.debutWeek, 'the road manager takes over after the debut');
  t.ok(state.inbox.some(n => /road manager/.test(n.text)), 'and the desk introduces them');
  const coach = KP.staffOf(state).coach;
  t.ok(coach && coach.name, 'the head vocal coach has always had a name (' + coach.name + ')');
}

// ---- the poach: counter or goodbye ----
{
  const { state, g } = debuted('bldg-poach');
  g.popularity = 60;
  KP.staffOf(state).managers[g.id].since = state.week - 30;
  const B = KP.C.BUILDING;
  const oldChance = B.poachChance; B.poachChance = 1;   // mechanism test
  let sc = null, guard = 0;
  while (!sc && guard++ < 10) {
    KP.advanceWeek(state);
    sc = (state.scenes || []).find(x => x.kind === 'staffPoach');
  }
  B.poachChance = oldChance;
  t.ok(sc, 'a good manager on a hot group draws an offer');
  const before = state.budget;
  const name = KP.managerOf(state, g).name;
  const r = KP.resolveScene(state, sc.id, 'counter');
  t.ok(r.ok && /banner misspells/.test(r.toast), 'the counter keeps her, at a price');
  t.eq(before - state.budget, KP.C.BUILDING.counterCost, 'the price is real');
  t.eq(KP.managerOf(state, g).name, name, 'and she stays');

  // the goodbye path
  const { state: s2, g: g2 } = debuted('bldg-poach2');
  g2.popularity = 60;
  KP.staffOf(s2).managers[g2.id].since = s2.week - 30;
  B.poachChance = 1;
  let sc2 = null; guard = 0;
  while (!sc2 && guard++ < 10) {
    KP.advanceWeek(s2);
    sc2 = (s2.scenes || []).find(x => x.kind === 'staffPoach');
  }
  B.poachChance = oldChance;
  const oldName = KP.managerOf(s2, g2).name;
  KP.resolveScene(s2, sc2.id, 'release');
  t.ok(!KP.managerOf(s2, g2), 'wishing them well means they go');
  KP.advanceWeek(s2);
  const newMgr = KP.managerOf(s2, g2);
  t.ok(newMgr && newMgr.name !== oldName, 'a NEW manager starts the next week (' + (newMgr && newMgr.name) + ')');
}

// ---- exec taste: the same win lands two ways ----
{
  const { state, g } = debuted('bldg-taste');
  const taste = KP.execTaste(state);
  t.ok(KP.conceptById(taste), 'the exec has a favorite sound (' + taste + ')');
  g.results = { week: state.week + 1, reception: 70, conceptId: taste };
  KP.advanceWeek(state);
  t.ok(state.inbox.some(n => /does not hide the smile/.test(n.text)), 'her kind of record earns the smile');
}

// ---- board season: the year answers, growth promises bite ----
{
  const { state, g } = debuted('bldg-board');
  state.week = KP.C.WEEKS_PER_YEAR + KP.C.BUILDING.boardWeek - 1;
  KP.advanceWeek(state);
  const sc = (state.scenes || []).find(x => x.kind === 'boardSeason');
  t.ok(sc, 'board season arrives on the calendar');
  KP.resolveScene(state, sc.id, 'growth');
  const claim = (state.claims || []).find(c => c.type === 'growthPromise');
  t.ok(claim && claim.baseline >= 0, 'growth goes on the record with a number');
  g.popularity = (claim.baseline || 0) + 40;
  claim.byWeek = state.week;
  // read the week's OWN notes: the capped inbox can evict this line in
  // a busy week (eval days, school classes — the world got louder)
  const wkNotes = KP.advanceWeek(state);
  t.eq(claim.resolved, 'met', 'growth delivered resolves warm');
  t.ok(wkNotes.some(n => /trajectory/.test(n.text)), 'the directors say "trajectory" approvingly');
}

// ---- the pet project: hers, personally ----
{
  const { state, g } = debuted('bldg-pet');
  state.week = Math.max(state.week, KP.C.BUILDING.petAfterWeek);
  const B = KP.C.BUILDING;
  const oldChance = B.petChance; B.petChance = 1;
  let sc = null, guard = 0;
  while (!sc && guard++ < 6) {
    KP.advanceWeek(state);
    sc = (state.scenes || []).find(x => x.kind === 'petProject');
  }
  B.petChance = oldChance;
  t.ok(sc, 'the pet project lands once the company is real');
  KP.resolveScene(state, sc.id, 'accept');
  const claim = (state.claims || []).find(c => c.type === 'petProject');
  t.ok(claim, 'accepting mints the claim');
  // deliver: a solo debut inside the window
  const soloist = state.people[KP.freeTrainees(state)[0]];
  KP.proposeGroup(state, KP.displayName(soloist), [soloist.id], {});
  const sg = state.groups.find(x => x.type === 'solo');
  sg.debuted = true; sg.debutWeek = state.week;   // the predicate reads the record
  const trustAt = state.trust;
  KP.advanceWeek(state);
  t.eq(claim.resolved, 'met', 'the solo stage settles it');
  t.ok(state.trust > trustAt, 'and the favor is banked');
}

// ---- the second-lineup question ----
{
  const { state } = debuted('bldg-second');
  // a full trainee room is the question's other half
  const rng2 = KP.rngFor(state);
  for (let i = 0; i < 4; i++) {
    const tr = KP.generatePerson(rng2, { status: 'trainee', gender: 'f' });
    tr.signedWeek = state.week;
    state.people[tr.id] = tr; state.roster.push(tr.id);
  }
  state.rngState = rng2.state();
  state.nextPersonId = KP.peekNextId();
  state.nextMeetingWeek = state.week + 1;
  let sc = null, guard = 0;
  while (!sc && guard++ < 30) {
    KP.advanceWeek(state);
    sc = KP.execScene(state);
    if (sc && sc.q.type !== 'secondGroup') { KP.answerMeeting(state, 0); sc = null; }
  }
  t.ok(sc && sc.q.type === 'secondGroup', 'a full room and one group raises the question');
  KP.resolveScene(state, sc.id, 'year');
  t.ok((state.claims || []).some(c => c.type === 'secondGroup'), 'inside the year, on the record');
}

// ---- migration + determinism ----
{
  const { state } = debuted('bldg-mig');
  Object.values(state.people).forEach(p => { delete p.gender; });
  state.version = '0.8.3.2';
  const m2 = KP.deserialize(KP.serialize(state));
  t.ok(Object.values(m2.people).every(p => p.gender === 'f'), 'everyone existing predates the boys');
  t.ok(m2.inbox.some(n => /both halls/.test(n.text)), 'the memo announces the open building');

  const { state: a } = debuted('bldg-fork');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) {
    KP.advanceWeek(a); KP.advanceWeek(b);
    [a, b].forEach(s2 => {
      const scn = (s2.scenes || [])[0];
      if (scn) KP.resolveScene(s2, scn.id, KP.sceneDef(scn.kind).options(s2, scn)[0].id);
    });
  }
  t.eq(KP.serialize(a), KP.serialize(b), 'the building forks clean');
}

t.finish();
