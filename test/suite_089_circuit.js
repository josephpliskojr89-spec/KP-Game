/* Suite 089 — the far markets (v0.10.9's world circuit; on the festival
   calendar since v0.10.43, §89 D9). The overseas conventions are
   region-keyed FESTS rows: the organizer calls when the region has heard
   of them, the weekend bills travel against a fee, the tongue prices the
   warmth, the interview clip is the story — through the ONE invitation
   scene and the one festival ledger. The English-version lane stays. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_089_circuit');

function world(seed) {
  const s = KP.newGame(seed, null, { legacy: true });
  s.budget = 900;
  return s;
}
function woyOf(state) { return ((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1; }
function rideTo(state, woy, each) {
  let guard = 0;
  while (woyOf(state) !== woy && guard++ < 60) { KP.advanceWeek(state); if (each) each(); }
}
const abroad = KP.C.FESTS.LIST.filter(f => f.region);

// ---- the rows: one per far market; the pile stopped selling festivals ------
{
  t.ok(abroad.length >= 5 && new Set(abroad.map(f => f.region)).size === abroad.length, 'one convention row per far market');
  t.ok(abroad.every(f => f.warmthMin && f.warmth && f.travel && f.pay && f.woy), 'each row carries its date, its bill, its fee and its warmth');
  const K = KP.C.BOOK.KINDS;
  t.ok(!K.uniFestival && !K.openerSlot && !K.localRadio && !K.radioTour && !K.fanSignSmall,
    'the pile no longer sells festivals, radio or fan-signs — the named festivals and the pushes do');
  t.ok(!KP.sceneDef('circuitInvite'), 'the circuit invite is gone — one invitation scene');
  t.ok(KP.C.CIRCUIT.inviteChance === undefined && KP.C.CIRCUIT.EN, 'only the version lane keeps its constants');
}

// ---- a cold map sends no call ------------------------------------------------
{
  const s = world('ci-cold');
  const g = s.groups[0];
  const f = abroad.find(x => x.region === 'na');
  const freeze = () => { KP.C.REGIONS.forEach(r => { KP.regionsOf(g)[r.id] = 0; }); g.popularity = 60; };
  freeze();
  rideTo(s, f.woy - KP.C.FESTS.inviteLead - 1, freeze);
  KP.advanceWeek(s);
  t.ok(!(s.scenes || []).some(x => x.kind === 'festivalInvite' && x.festivalId === f.id),
    'a map nobody has warmed sends no convention invites');
}

// ---- the warm region calls; the stage warms it by the tongue -----------------
{
  const s = world('ci-invite');
  const g = s.groups[0];
  const f = abroad.find(x => x.region === 'na');
  KP.recordEvidence(s, 'festivalIcons', 'group', g.id);   // icons always get the call — the 75% roll is not the claim
  const warm = () => { KP.regionsOf(g).na = 30; g.popularity = Math.max(g.popularity || 0, 60); g.prep = null; g.promoUntil = 0; g.tour = null; s.scenes = (s.scenes || []).filter(x => x.kind !== 'festivalInvite'); };
  warm();
  rideTo(s, f.woy - KP.C.FESTS.inviteLead - 1, warm);
  warm();
  KP.advanceWeek(s);
  const sc = (s.scenes || []).find(x => x.kind === 'festivalInvite' && x.festivalId === f.id);
  t.ok(sc, 'the convention calls through the one invitation scene');
  t.ok(sc && !sc.headline, 'a convention has no headline slot');
  t.ok(sc && /convention slot/.test(KP.sceneDef('festivalInvite').body(s, sc)), 'and the body says what kind of weekend it is');
  t.ok(sc && /interviews/.test(KP.sceneDef('festivalInvite').body(s, sc)), 'with the tongue read out loud beside the schedule');
  t.ok(s.inbox.concat(KP.lastTickNotes || []).some(n => n.ind === 'festivalInvite' && /convention slot/.test(n.text)), 'the letter names the far market');
  const budget0 = s.budget;
  KP.resolveScene(s, sc.id, 'accept');
  t.eq(s.budget, budget0 - f.travel, 'travel bills up front');
  t.ok((g.festivalBookings || []).some(b => b.festivalId === f.id), 'booked on the festival calendar');
  rideTo(s, f.woy - 1, warm);
  warm();
  const w0 = KP.regionsOf(g).na;
  KP.advanceWeek(s);
  const gain = KP.regionsOf(g).na - w0;
  t.ok(gain > 0, 'the weekend warms the market (+' + gain.toFixed(1) + ')');
  const flopped = (s.festivalLedger.tongueFlops || 0) >= 1;
  const expected = Math.round(f.warmth * (flopped ? KP.C.TONGUE.FACTOR.circuit : 1));
  t.ok(Math.round(gain) <= expected && Math.round(gain) >= Math.round(expected * 0.7) - 1,
    'the tongue prices it — ' + (flopped ? 'half, with the awkward clip attached' : 'full, with a voice in the room') + ' (+' + Math.round(gain) + ' of ' + expected + ')');
  t.eq(s.festivalLedger.abroadPlayed, 1, 'ledgered on the one festival ledger');
  t.ok(!g.festivalsPlayed, 'but a convention is not a festival-icon stage');
  const note = s.inbox.concat(KP.lastTickNotes || []).find(n => n.ind === 'festival' && n.abroad === 'na');
  t.ok(note && (flopped ? /interpreter/.test(note.text) : /own language/.test(note.text)), 'the stage is on the record, tongue and all');
  t.ok(KP.feedReactionFor('festival') && !KP.feedReactionFor('circuitStage'), 'and the timeline answers the one ind');
}

// ---- regrets are counted -----------------------------------------------------
{
  const s = world('ci-pass');
  const g = s.groups[0];
  const f = abroad.find(x => x.region === 'eu');
  KP.recordEvidence(s, 'festivalIcons', 'group', g.id);
  // another festival's open invitation blocks a second call (one at a time) — clear the home ones on the ride
  const warm = () => { KP.regionsOf(g).eu = 30; g.popularity = Math.max(g.popularity || 0, 60); g.prep = null; g.promoUntil = 0; g.tour = null; s.scenes = (s.scenes || []).filter(x => x.kind !== 'festivalInvite'); };
  warm();
  rideTo(s, f.woy - KP.C.FESTS.inviteLead - 1, warm);
  warm();
  KP.advanceWeek(s);
  const sc = (s.scenes || []).find(x => x.kind === 'festivalInvite' && x.festivalId === f.id);
  t.ok(sc, 'fixture: the invitation');
  const d0 = s.festivalLedger.declined || 0;
  KP.resolveScene(s, sc.id, 'decline');
  t.eq(s.festivalLedger.declined, d0 + 1, 'passing is a real answer, counted');
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
  t.eq(KP.serialize(a), KP.serialize(b), 'the far markets fork clean');
}

t.finish();
