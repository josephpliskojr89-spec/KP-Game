/* Suite 005 — saves are sacred.
   Serialize/deserialize round-trips exactly, the sim continues identically
   from a restored save, migration stamps forward-only, and the id counter
   never collides after a load. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_005_save');

// round-trip exactness
{
  const state = KP.newGame('save-rt', null, { legacy: false });
  for (let w = 0; w < 10; w++) KP.advanceWeek(state);
  const json = KP.serialize(state);
  const back = KP.deserialize(json);
  t.eq(KP.serialize(back), json, 'serialize → deserialize → serialize is identity');
}

// a restored save simulates identically to the original
{
  const a = KP.newGame('save-fork', null, { legacy: false });
  for (let w = 0; w < 6; w++) KP.advanceWeek(a);
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 10; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'restored save continues the same story');
}

// forward-only version stamping
{
  const state = KP.newGame('save-stamp', null, { legacy: false });
  state.version = '0.0.1';
  KP.migrate(state);
  t.eq(state.version, KP.C.VERSION, 'old save stamped forward to current');
  state.version = '99.0.0';
  KP.migrate(state);
  t.eq(state.version, '99.0.0', 'newer save is never un-stamped');
}

// id counter stays ahead after load — new people never collide
{
  const state = KP.newGame('save-ids', null, { legacy: false });
  const back = KP.deserialize(KP.serialize(state));
  const rng = KP.rngFor(back);
  const p = KP.generatePerson(rng, { status: 'prospect' });
  t.ok(!back.people[p.id], 'freshly generated id does not collide with loaded people');
}

// versionLt sanity
t.ok(KP.versionLt('0.1.0', '0.2.0') && KP.versionLt('0.9.9', '1.0.0') && !KP.versionLt('1.0.0', '0.9.9'),
  'version comparison is sane');

t.finish();
