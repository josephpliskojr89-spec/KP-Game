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
  const state = KP.newGame('rr-seed');
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
  const state = KP.newGame('rr-steal');
  const rival = state.rivals[0];
  // hand the rival two board prospects, cranked so they top the casting order
  const stolen = state.prospects.slice(0, 2).map(id => state.people[id]);
  stolen.forEach(p => {
    p.status = 'rival'; p.company = rival.short;
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
    const state = KP.newGame('rr-quality');
    const rival = state.rivals[0];
    state.prospects.slice(0, 3).map(id => state.people[id]).forEach(p => {
      p.status = 'rival'; p.company = rival.short;
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
    const state = KP.newGame('rr-aggro-' + s);
    for (let w = 0; w < 50; w++) KP.advanceWeek(state);
    lost += Object.values(state.people)
      .filter(p => p.status === 'rival' && !p.flags.rivalNative).length;
  }
  t.ok(lost / runs >= 2, 'rivals sign real board talent at pace (' + (lost / runs).toFixed(1) + '/run over 50wk)');
}

// ---- mergers move the people with the company ----
{
  const state = KP.newGame('rr-merge');
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
  const old = KP.newGame('rr-mig');
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

// ---- determinism across the whole feature ----
{
  const a = KP.newGame('rr-fork');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'rival rosters fork clean');
}

t.finish();
