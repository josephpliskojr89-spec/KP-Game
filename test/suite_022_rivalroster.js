/* Suite 022 — rivals with faces (v0.4.3).
   Every active rival act is made of real people; the trainees a rival
   signs off the board actually debut in its groups; act quality follows
   the members; rivals sign more aggressively; mergers move the people
   with the company; the migration backfills faces; determinism holds. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_022_rivalroster');

// ---- the scene opens with faces ----
{
  const state = KP.newGame('rr-seed', null, { legacy: false });
  const I = KP.C.INDUSTRY;
  const seen = new Set();
  state.rivals.forEach(r => (r.acts || []).forEach(a => {
    t.ok(a.id && /^ra\d+$/.test(a.id), a.name + ' has an act id');
    t.ok(!seen.has(a.id), 'act ids are unique'); seen.add(a.id);
    t.ok(a.members.length >= I.actSize[0] && a.members.length <= I.actSize[1],
      a.name + ' lineup sized ' + a.members.length);
    a.members.forEach(id => {
      const p = state.people[id];
      t.ok(p && p.status === 'rival' && p.company === r.short,
        a.name + ' member ' + id + ' is a real signed person');
      t.ok(p.age >= 16, 'rival idols are debut-aged (' + p.age + ')');
    });
    t.ok(KP.rivalActById(state, a.id).act === a, 'rivalActById finds it');
  }));
}

// ---- a signed board prospect debuts in the group her rival forms ----
{
  const state = KP.newGame('rr-steal', null, { legacy: false });
  const rival = state.rivals[0];
  // hand the rival two board prospects, cranked so they top the casting order
  const stolen = state.prospects.slice(0, 2).map(id => state.people[id]);
  stolen.forEach(p => {
    p.status = 'rival'; p.company = rival.short;
    p.gender = 'f';   // one group, one gender (v0.8.4): the fixture steals from one hall
    p.talents.vocals.cur = 90;
    state.prospects = state.prospects.filter(id => id !== p.id);
    rival.rosterCount = (rival.rosterCount || 0) + 1;
  });
  rival.nextDebutWeek = state.week + 1;
  rival.rosterCount = Math.max(rival.rosterCount, 10);
  const actsBefore = rival.acts.length;
  KP.advanceWeek(state);
  t.eq(rival.acts.length, actsBefore + 1, 'the debut happened');
  const act = rival.acts[rival.acts.length - 1];
  stolen.forEach(p => t.ok(act.members.includes(p.id),
    KP.displayName(p) + ' is actually in the lineup'));
  t.ok(act.members.length >= KP.C.INDUSTRY.actSize[0], 'the lineup was topped up with in-house trainees');
  act.members.forEach(id => t.ok(state.people[id], 'every member exists'));
  t.ok(state.inbox.some(m => m.ind === 'rivalDebut' && /once on our board/.test(m.text)),
    'the wire names the one we lost');
}

// ---- act quality follows who is in the room ----
{
  const mk = (talent) => {
    const state = KP.newGame('rr-quality', null, { legacy: false });
    const rival = state.rivals[0];
    // six same-gender signees ≥ the max lineup size: the act forms from
    // exactly these people, no mid-talent floor fillers diluting the read
    state.prospects.slice(0, 6).map(id => state.people[id]).forEach(p => {
      p.status = 'rival'; p.company = rival.short; p.gender = 'f';
      KP.C.TALENTS.forEach(d => { p.talents[d].cur = talent; });
      state.prospects = state.prospects.filter(id => id !== p.id);
      rival.rosterCount = (rival.rosterCount || 0) + 1;
    });
    rival.nextDebutWeek = state.week + 1;
    rival.rosterCount = Math.max(rival.rosterCount, 10);
    KP.advanceWeek(state);
    return rival.acts[rival.acts.length - 1];
  };
  const elite = mk(85), weak = mk(25);
  t.ok(elite.quality > weak.quality + 10,
    'signing talent builds better groups (' + elite.quality + ' vs ' + weak.quality + ')');
}

// ---- aggression: the board actually bleeds now ----
{
  let lost = 0, runs = 6;
  for (let s = 0; s < runs; s++) {
    const state = KP.newGame('rr-aggro-' + s, null, { legacy: false });
    for (let w = 0; w < 50; w++) KP.advanceWeek(state);
    lost += Object.values(state.people)
      .filter(p => p.status === 'rival' && !p.flags.rivalNative).length;
  }
  t.ok(lost / runs >= 2, 'rivals sign real board talent at pace (' + (lost / runs).toFixed(1) + '/run over 50wk)');
}

// ---- mergers move the people with the company ----
{
  const state = KP.newGame('rr-merge', null, { legacy: false });
  const rng = KP.rngFor(state);
  // stage two weak rivals with acts full of real members
  const weakA = state.rivals[0], weakB = state.rivals[1];
  weakA.prestige = 12; weakB.prestige = 14;
  state.rivals[2].prestige = 80;
  state.rivals.push({ name: 'Filler Entertainment', short: 'Filler', philosophy: 'patient',
    blurb: 'test', prestige: 70, rosterCount: 8, nextDebutWeek: 9999, interest: {}, acts: [], recentMoves: [] });
  const memberIds = [weakA, weakB].flatMap(r => (r.acts || []).flatMap(a => a.members || []));
  let merged = null;
  for (let i = 0; i < 400 && !merged; i++) {
    KP.industryLifecycle(state, rng);
    merged = state.rivals.find(r => (r.blurb || '').includes('merger of ' + weakA.short) ||
      (r.blurb || '').includes('merger of ' + weakB.short));
  }
  t.ok(merged, 'the two weak companies eventually merged');
  memberIds.forEach(id => {
    const p = state.people[id];
    t.ok(p && p.company === merged.short, 'member ' + id + ' now works for ' + merged.short);
  });
}

// ---- migration: acts from a 0.4.2 save gain faces ----
{
  const old = KP.newGame('rr-mig', null, { legacy: false });
  // fake the old shape: strip members and ids
  old.rivals.forEach(r => (r.acts || []).forEach(a => {
    (a.members || []).forEach(id => { delete old.people[id]; });
    delete a.members; delete a.id;
  }));
  delete old.nextActId;
  old.version = '0.4.2';
  const json = KP.serialize(old);
  const migrated = KP.deserialize(json);
  migrated.rivals.forEach(r => (r.acts || []).forEach(a => {
    t.ok(a.id, 'migrated act has an id');
    t.ok(a.members && a.members.length >= KP.C.INDUSTRY.actSize[0], 'migrated act has faces');
    a.members.forEach(id => t.ok(migrated.people[id], 'migrated member exists'));
  }));
  t.ok(migrated.inbox.some(m => /artist files/.test(m.text)), 'the desk announces its files');
  const m2 = KP.deserialize(json);
  for (let w = 0; w < 8; w++) { KP.advanceWeek(migrated); KP.advanceWeek(m2); }
  t.eq(KP.serialize(migrated), KP.serialize(m2), 'migration is deterministic');
}

// ---- the trainee floor gets a door (0.9.18.1) --------------------------
// the room is sized to a plan; the evaluation cuts back to it; a bloated
// room gets purged; a lingering named signee below the bar goes too
{
  const state = KP.newGame('rr-floor', null, { legacy: false });
  const I = KP.C.INDUSTRY;
  const R = I.ROOM;
  const rival = state.rivals[0];
  const target = I.debutTraineeCost + R.bench + Math.floor((rival.prestige || 40) / R.benchPerPrestige);
  // a saturated room (the year-8 save the owner reported); no debut in
  // the window, or the casting call saves the floor kid from the axe
  rival.rosterCount = 30;
  rival.nextDebutWeek = state.week + 500;
  // a named signee who never made a lineup, below the bar, long-tenured
  const floorKid = Object.values(state.people).find(p => p.status === 'prospect');
  floorKid.status = 'rival';
  floorKid.company = rival.short;
  state.prospects = state.prospects.filter(id => id !== floorKid.id);
  ['vocals', 'dance', 'rap', 'charisma'].forEach(d => { floorKid.talents[d].cur = 30; });
  floorKid.history.push({ week: Math.max(1, state.week - R.namedTenure - 4),
    text: 'Signed to ' + rival.short + ' — off our board.' });
  // the plan MOVES with prestige (era physics move receptions, v0.9.24)
  // and intake refills between evaluations, so a converged room
  // OSCILLATES in the plan's neighborhood — the claim is convergence
  // from saturation (30), not a frozen equality. Seen: count 11 against
  // a target that read 11 at eval time and 9 at assert time.
  const liveTarget = () => I.debutTraineeCost + R.bench +
    Math.floor((rival.prestige || 40) / R.benchPerPrestige);
  let guard = 0;
  while (rival.rosterCount > liveTarget() && guard++ < R.cullEvery * 6 + 4) KP.advanceWeek(state);
  t.ok(rival.rosterCount <= liveTarget() + R.cullMax,
    'the evaluations cut a saturated room back to the plan’s neighborhood (' +
    rival.rosterCount + ' vs plan ' + liveTarget() + ')');
  t.ok((state.rivalLedger || {}).culls >= 1, 'the cuts are ledgered');
  t.ok((rival.recentMoves || []).some(m => /^Cut \d+ trainee/.test(m)),
    'and worn on the company card');
  // the network (v0.9.35): the named cut stops vanishing — she returns
  // to the open board as a washout, file and history intact
  // the open board is OPEN — a returned washout can be signed by a
  // faster rival on any stream; either way she was cut and came back
  t.ok(floorKid.status === 'prospect' || floorKid.status === 'rival',
    'the named signee below the bar was not exempt (' + floorKid.status + ')');
  if (floorKid.status === 'prospect') {
    t.eq(floorKid.channel, 'washout', 'and her file is back on the open board');
  } else {
    t.ok(true, '(a rival took her off the open board — the market working)');
  }
  t.ok(floorKid.history.some(h => /seasonal evaluation/.test(h.text)),
    'her file says what happened');
  t.ok((state.rivalLedger || {}).namedCuts >= 1, 'named cuts are ledgered');
}

// a room AT the plan barely signs and is never cut
{
  const state = KP.newGame('rr-sated', null, { legacy: false });
  const I = KP.C.INDUSTRY;
  const R = I.ROOM;
  const rival = state.rivals[0];
  const target = I.debutTraineeCost + R.bench + Math.floor((rival.prestige || 40) / R.benchPerPrestige);
  rival.rosterCount = target;
  rival.nextDebutWeek = state.week + 500;   // no debut consumption in the window
  for (let w = 0; w < 26; w++) KP.advanceWeek(state);
  t.ok(rival.rosterCount <= target + 3,
    'a sated room trickles instead of hoarding (' + rival.rosterCount + ')');
}

// the portfolio paces the pipeline: more active acts, later next debut
{
  const a = KP.newGame('rr-pace', null, { legacy: false });
  const I = KP.C.INDUSTRY;
  const rival = a.rivals[0];
  rival.rosterCount = 30;
  rival.nextDebutWeek = a.week;   // debut now
  const before = (rival.acts || []).filter(x => !x.retired).length;
  const b = KP.deserialize(KP.serialize(a));
  b.rivals[0].acts.forEach(x => { x.retired = true; });   // same company, empty portfolio
  KP.advanceWeek(a); KP.advanceWeek(b);
  const rvA = a.rivals[0], rvB = b.rivals[0];
  t.ok(rvA.acts.filter(x => !x.retired).length === before + 1, 'the crowded company debuted');
  t.ok(rvB.acts.filter(x => !x.retired).length === 1, 'the empty company debuted too');
  t.ok(rvA.nextDebutWeek - rvB.nextDebutWeek === before * I.ROOM.actPace,
    'and the crowded portfolio pushed its NEXT debut ' + (rvA.nextDebutWeek - rvB.nextDebutWeek) + ' weeks later');
}

// a full portfolio defers its debut; the seven-year wall ends a run
{
  const state = KP.newGame('rr-comfort', null, { legacy: false });
  const I = KP.C.INDUSTRY;
  const R = I.ROOM;
  const rival = state.rivals[0];
  const comfort = R.comfortBase + Math.floor((rival.prestige || 40) / R.comfortPerPrestige);
  while (rival.acts.filter(a => !a.retired).length < comfort) {
    rival.acts.push({ id: 'raC' + rival.acts.length, gender: 'f', name: 'Filler ' + rival.acts.length,
      concept: 'bright', quality: 60, members: [], popularity: 50,
      debutWeek: state.week, lastReleaseWeek: state.week, cycleWeeks: 20, releases: [], retired: false });
  }
  rival.rosterCount = 20;
  rival.nextDebutWeek = state.week;
  const acts0 = rival.acts.length;
  KP.advanceWeek(state);
  t.eq(rival.acts.length, acts0, 'a company at comfort does not debut');
  t.ok(rival.nextDebutWeek > state.week - 1, 'it re-asks later instead');
  // now age one act past the wall and watch the run conclude
  const veteran = rival.acts.find(a => !a.retired);
  veteran.debutWeek = state.week - R.sevenYearWeeks - 10;
  veteran.lastReleaseWeek = state.week + 100;   // idle weeks, so the wall roll runs
  const W = R.wallChance;
  R.wallChance = 1;
  KP.advanceWeek(state);
  R.wallChance = W;
  t.ok(veteran.retired, 'the seven-year wall concluded the run');
  t.ok(state.inbox.some(m => m.ind === 'disband' && /seven-year run/.test(m.text)),
    'and the wire wrote it as a finished chapter, not a fall');
}

// ---- determinism across the whole feature ----
{
  const a = KP.newGame('rr-fork', null, { legacy: false });
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'rival rosters fork clean');
}

t.finish();
