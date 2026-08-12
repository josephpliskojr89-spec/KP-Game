/* Suite 025 — save durability (v0.5.1).
   tryImport is a guarded door: valid careers round-trip exactly, old
   versions migrate on the way in, garbage is refused with a reason and
   never a throw, saves from the future are refused, and the whole thing
   stays deterministic. Plus the size telemetry stays honest. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_025_durability');

function midCareer(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'SAFELINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  for (let w = 0; w < 20; w++) KP.advanceWeek(state);
  return state;
}

// ---- a real career round-trips exactly ----
{
  const state = midCareer('dur-roundtrip');
  const json = KP.serialize(state);
  const r = KP.tryImport(json);
  t.ok(r.ok, 'a valid export imports');
  t.eq(KP.serialize(r.state), json, 'the import IS the career, byte for byte');
  // and continues deterministically against the original
  for (let w = 0; w < 10; w++) { KP.advanceWeek(state); KP.advanceWeek(r.state); }
  t.eq(KP.serialize(state), KP.serialize(r.state), 'imported careers continue identically');
}

// ---- old exports migrate on the way in ----
{
  const old = midCareer('dur-old');
  delete old.national;
  old.groups[0].releases.forEach(r => { delete r.nationalPeak; delete r.nationalWeeks; });
  if (old.groups[0].results) { delete old.groups[0].results.nationalPeak; delete old.groups[0].results.nationalWeeks; }
  old.version = '0.4.4';
  const r = KP.tryImport(KP.serialize(old));
  t.ok(r.ok, 'an old-version export imports');
  t.eq(r.state.version, KP.C.VERSION, 'and is stamped forward');
  t.ok(r.state.national && r.state.national.artists.length > 0, 'migrations ran on the way in');
}

// ---- the door refuses garbage, with words, never a throw ----
{
  const cases = [
    ['not even json', /not a save file/],
    ['[1,2,3]', /not a career/],
    ['"just a string"', /not a career/],
    ['{}', /missing the bones/],
    ['{"version":"0.5.0"}', /missing the bones/],
    ['{"week":4,"people":{}}', /missing the bones/],
  ];
  cases.forEach(([input, expect]) => {
    const r = KP.tryImport(input);
    t.ok(!r.ok && expect.test(r.reason), 'refused with a reason: ' + input.slice(0, 24) + ' → ' + r.reason);
  });
  // a save from a NEWER build is refused, not mangled
  const future = midCareer('dur-future');
  future.version = '99.0.0';
  const r = KP.tryImport(KP.serialize(future));
  t.ok(!r.ok && /NEWER build/.test(r.reason), 'future saves are refused intact');
}

// ---- size telemetry stays honest ----
{
  const state = midCareer('dur-size');
  const kb = KP.saveSizeKB(state);
  t.ok(kb >= 20 && kb <= 400, 'a mid-career save is sane-sized (' + kb + ' KB)');
  t.eq(kb, Math.round(KP.serialize(state).length / 1024), 'the number is the real number');
}

t.finish();
