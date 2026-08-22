/* Suite 089 — the world circuit (v0.10.9, §80 finding 13). The
   overseas promo wing: region-keyed convention invites with travel
   bills and tongue-gated stages, the English-version lane, and the
   far markets warming one weekend at a time. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_089_circuit');

function world(seed) {
  const s = KP.newGame(seed, null, { legacy: true });
  s.budget = 900;
  return s;
}
function pinInvite(s) {
  const IC = KP.C.CIRCUIT.inviteChance;
  KP.C.CIRCUIT.inviteChance = 1;
  let sc = null, guard = 0;
  while (!sc && guard++ < 10) { KP.advanceWeek(s); sc = (s.scenes || []).find(x => x.kind === 'circuitInvite'); }
  KP.C.CIRCUIT.inviteChance = IC;
  return sc;
}

// ---- the invite: region-keyed, warmth-gated ----------------------------
{
  const s = world('ci-cold');
  const g = s.groups[0];
  KP.C.REGIONS.forEach(r => { KP.regionsOf(g)[r.id] = 0; });
  const IC = KP.C.CIRCUIT.inviteChance;
  KP.C.CIRCUIT.inviteChance = 1;
  for (let i = 0; i < 6; i++) KP.advanceWeek(s);
  KP.C.CIRCUIT.inviteChance = IC;
  t.ok(!(s.scenes || []).some(x => x.kind === 'circuitInvite'),
    'a map nobody has warmed sends no invites');
}
{
  const s = world('ci-invite');
  const g = s.groups[0];
  KP.regionsOf(g).na = 30;
  const sc = pinInvite(s);
  t.ok(sc && sc.con && sc.regionId, 'the convention has a NAME and a region (' + (sc && sc.con) + ')');
  t.eq(s.circuitLedger.invites, 1, 'ledgered');
  const w0 = KP.regionsOf(g)[sc.regionId];
  KP.resolveScene(s, sc.id, 'accept');
  const gain = KP.regionsOf(g)[sc.regionId] - w0;
  t.ok(gain > 0, 'the weekend warms the market (+' + gain.toFixed(1) + ')');
  // the tongue prices the gain: full weight with a speaker, half without
  const C = KP.C.CIRCUIT;
  const expected = s.circuitLedger.tongueFlops ? Math.round(C.warmthGain * C.tongueDamp) : C.warmthGain;
  t.eq(Math.round(gain), expected, 'and the tongue prices it — ' +
    (s.circuitLedger.tongueFlops ? 'half, with the awkward clip attached' : 'full, with a voice in the room'));
  t.ok(s.inbox.some(n => n.ind === 'circuitStage' || n.ind === 'circuitFlop'), 'the stage is on the record');
  t.eq(s.circuitLedger.played, 1, 'ledgered');
}
{
  const s = world('ci-pass');
  KP.regionsOf(s.groups[0]).eu = 30;
  const sc = pinInvite(s);
  KP.resolveScene(s, sc.id, 'decline');
  t.eq(s.circuitLedger.declined, 1, 'passing is a real answer, counted');
}

// ---- the English version -----------------------------------------------
{
  const s = world('ci-en');
  const g = s.groups[0];
  g.prep = null; g.promoUntil = 0; g.tour = null;
  const last = g.releases[g.releases.length - 1];
  last.reception = 40;
  t.ok(!KP.cutEnglishVersion(s, g.id).ok, 'the version lane re-cuts a HIT — a modest record does not travel');
  last.reception = 70;
  const na0 = KP.regionsOf(g).na || 0, eu0 = KP.regionsOf(g).eu || 0;
  const r = KP.cutEnglishVersion(s, g.id);
  t.ok(r.ok, 'the hit re-cuts');
  t.eq(r.revenue, Math.round(70 * KP.C.CIRCUIT.EN.rev), 'the playlists pay by the reception');
  t.ok((KP.regionsOf(g).na || 0) > na0 && (KP.regionsOf(g).eu || 0) > eu0,
    'and two far corners warm at once');
  t.ok(!KP.cutEnglishVersion(s, g.id).ok, 'the last version is still working — cooldown holds');
  t.eq(s.circuitLedger.enCuts, 1, 'ledgered');
}

// ---- determinism --------------------------------------------------------
{
  const a = KP.newGame('ci-fork', null, { legacy: true });
  KP.regionsOf(a.groups[0]).na = 30;
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the world circuit forks clean');
}

t.finish();
