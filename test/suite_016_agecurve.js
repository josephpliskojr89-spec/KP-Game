/* Suite 016 — the younger age curve + board rebirth (v0.3.1).
   15-16 is the norm, 14-18 the bulk, 19+ uncommon, 14 a HARD floor.
   The migration regenerates an old save's scouting board under the new
   curve — narrated, deterministic, and with the roster untouched. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_016_agecurve');

// the migration: an old save's board is reborn, its roster is not
{
  const state = KP.newGame('age-mig');
  const atCreation = {};
  Object.values(state.people).forEach(p => { atCreation[p.id] = p.age; });
  for (let w = 0; w < 8; w++) KP.advanceWeek(state);
  // fake a pre-0.3.1 save: age the prospects like the old curve did —
  // and freeze everyone back to signing age, because a genuinely old
  // save never lived the v0.9.1 personal clock (its backfill migration
  // re-ages them; the snapshot compares everything BUT age)
  const liveAges = {};
  state.roster.forEach(id => { liveAges[id] = state.people[id].age; });
  Object.values(state.people).forEach(p => {
    if (atCreation[p.id] != null) p.age = atCreation[p.id];
  });
  const strip = p => { const c = JSON.parse(JSON.stringify(p)); delete c.age; return c; };
  const rosterSnapshot = JSON.stringify(state.roster.map(id => strip(state.people[id])));
  const oldProspectIds = state.prospects.slice();
  oldProspectIds.forEach((id, i) => { state.people[id].age = 19 + (i % 5); });
  state.version = '0.3.0';
  const back = KP.deserialize(KP.serialize(state));

  t.eq(JSON.stringify(back.roster.map(id => strip(back.people[id]))), rosterSnapshot,
    'the signed roster is untouched — those people are the story');
  t.ok(state.roster.every(id => back.people[id].age === liveAges[id]),
    '— except the ages, which catch up to the live clock exactly');
  t.ok(back.prospects.length >= KP.C.GEN.prospectCount[0], 'the board is restocked');
  t.ok(back.prospects.every(id => !oldProspectIds.includes(id)), 'every old prospect is gone');
  t.ok(oldProspectIds.every(id => !back.people[id]), 'old prospect files removed');
  const ages = back.prospects.map(id => back.people[id].age);
  t.ok(ages.every(a => a >= 14 && a <= 22), 'reborn board respects the new curve');
  const mean = ages.reduce((a, b) => a + b, 0) / ages.length;
  t.ok(mean <= 17.6, 'reborn board skews young (mean ' + mean.toFixed(1) + ')');
  t.ok(back.inbox.some(m => /cleared the board/.test(m.text)), 'the rebirth is narrated by Scout Im');
  back.rivals.forEach(r => {
    Object.keys(r.interest).forEach(pid => t.ok(back.prospects.includes(pid), 'rival interest points at real prospects'));
  });
  t.ok(back.rivals.some(r => Object.keys(r.interest).length > 0), 'rivals circle the new board too');

  // deterministic: the same old save migrates identically twice
  const again = KP.deserialize(KP.serialize(state));
  t.eq(KP.serialize(back), KP.serialize(again), 'migration is deterministic');

  // and the migrated world simulates cleanly
  for (let w = 0; w < 10; w++) KP.advanceWeek(back);
  t.ok(back.prospects.length > 0, 'the migrated board lives on');
}

// the floor is absolute across many worlds and many weeks of fresh leads
{
  let minSeen = 99;
  for (let s = 0; s < 8; s++) {
    const st = KP.newGame('age-floor' + s);
    for (let w = 0; w < 30; w++) KP.advanceWeek(st);
    Object.values(st.people).forEach(p => { if (p.age < minSeen) minSeen = p.age; });
  }
  t.ok(minSeen >= 14, 'no one under 14, ever, including weekly fresh leads (min ' + minSeen + ')');
}

t.finish();
