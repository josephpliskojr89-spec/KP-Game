/* Suite 118 — the hash (v0.11.8, §99). Both release-2 slices found that the
   kernel's FNV-1a hash01 barely moved when a key's varying part sat at the
   END ('…|week'): a lineFor family picked the same line for weeks, the
   season's weekly noise stood still, the mother-fund's yearly window never
   turned. hash01 gained a final avalanche; the legacy value stays for the
   one migration that needs it — the staff's hidden truths, which were the
   only hash derived at read time and are now minted once and stamped. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_118_hash');

// ---- the spread: a key's parts may sit in any order -------------------------------
{
  const weeks = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109];
  const tail = weeks.map(w => KP.hash01('seed-x|landed|g3|' + w));
  const spread = Math.max.apply(null, tail) - Math.min.apply(null, tail);
  t.ok(spread > 0.5, 'ten consecutive weeks at the tail of a key spread across the unit interval (' + spread.toFixed(2) + ')');
  const legacy = weeks.map(w => KP.hash01Legacy('seed-x|landed|g3|' + w));
  const legacySpread = Math.max.apply(null, legacy) - Math.min.apply(null, legacy);
  t.ok(legacySpread < 0.1, 'the legacy hash drifted (' + legacySpread.toFixed(3) + ') — the bug this suite guards against');
  t.ok(legacy.every(v => v >= 0 && v < 1) && tail.every(v => v >= 0 && v < 1), 'both live in [0, 1)');
  t.eq(KP.hash01('a|b|c'), KP.hash01('a|b|c'), 'the hash is a function of its key');
  t.ok(typeof KP.hash01(KP.hashStr('pre|hashed|key')) === 'number', 'a pre-hashed key (the festival and Japan slices) still reads');
  // three-line families pick different lines across weeks now
  const picks = new Set();
  const state = { seed: 'seed-y', week: 1 };
  for (let w = 1; w <= 12; w++) { state.week = w; picks.add(KP.lineFor(state, 'landed|g1', ['a', 'b', 'c'])); }
  t.ok(picks.size === 3, 'a three-line family uses all three lines inside twelve weeks (' + picks.size + ')');
}

// ---- the staff truths: minted once, read from the file ----------------------------
{
  const s = KP.newGame('hash-staff', null, { legacy: true });
  const seats = Object.values(s.seats || {});
  t.ok(seats.length >= 3 && seats.every(st => st.truth && typeof st.truth.base === 'number' && typeof st.truth.bestSeat === 'string'), 'the founding chairs carry a stamped truth');
  const st = seats[0];
  const before = KP.staffTruth(s, st);
  st.truth.base = 0.999; st.truth.bestSeat = st.seatId;
  const after = KP.staffTruth(s, st);
  t.ok(after.apt > before.apt || after.bestSeat === st.seatId, 'the truth is read from the file, not re-derived');
  // the migration stamps a chair that predates the stamp with the LEGACY value
  const legacyTruth = KP.staffTruthMint(s, st, true);
  const freshTruth = KP.staffTruthMint(s, st, false);
  t.ok(JSON.stringify(legacyTruth) !== JSON.stringify(freshTruth), 'legacy and current derivations differ for the same chair');
  delete st.truth;
  s.version = '0.11.7';
  KP.migrate(s);
  t.ok(st.truth && JSON.stringify(st.truth) === JSON.stringify(legacyTruth), 'the 0.11.8 migration stamps the chair with the value it had');
  t.ok(seats.every(x => x.truth), 'and leaves every other chair stamped');
  // a candidate waiting at the interview is stamped too
  KP.openScene(s, { kind: 'theInterview', cand: { id: 'sf9_1', name: 'Cha Bo-ra', seatId: 'anr', tier: 'unknown', resume: ['x'], style: 'scrappy', warmth: 60, candor: 60 }, expiresWeek: s.week + 2 });
  const sc = s.scenes.find(x => x.kind === 'theInterview');
  s.version = '0.11.7';
  KP.migrate(s);
  t.ok(sc.cand.truth && JSON.stringify(sc.cand.truth) === JSON.stringify(KP.staffTruthMint(s, sc.cand, true)), 'the waiting candidate is stamped with the legacy value');
  t.eq(KP.validateState(s).length, 0, 'the validator is clean after the migration');
}

// ---- the week moves: the season's noise and the window turn --------------------------
{
  const s = KP.newGame('hash-season', null, { legacy: true });
  // the yearly mother-fund window reads by year — under the legacy hash it never turned
  const years = [1, 2, 3, 4, 5, 6, 7, 8];
  const open = years.map(y => KP.hash01([s.seed, 'motherfund', y].join('|')) < KP.C.FINANCE.windowShare);
  t.ok(new Set(open).size === 2, 'the window opens some years and closes others (' + open.map(b => b ? 'o' : '-').join('') + ')');
  const legacyOpen = years.map(y => KP.hash01Legacy([s.seed, 'motherfund', y].join('|')) < KP.C.FINANCE.windowShare);
  t.ok(new Set(legacyOpen).size === 1, 'under the legacy hash it stood still (' + legacyOpen.map(b => b ? 'o' : '-').join('') + ')');
}

// ---- found by the census: the signing reads the calendar (v0.11.8) ------------------
// the soak read twenty of forty orgs "pulling out" of festival slots they had
// said yes to from Japan: an open invitation was not yet a booking, so the
// lane's guard could not see it. The signing refuses a yes that cannot land.
{
  const s = KP.newGame('hash-fest', null, { legacy: false });
  s.budget = 900;
  const ids = s.roster.slice(0, 5);
  KP.proposeGroup(s, 'SLOTLINE', ids, KP.roleHints(s, ids.map(i => s.people[i])));
  const g = s.groups[0];
  g.demos = KP.generateDemos(s, KP.rngFor(s), g);
  KP.planDebut(s, { groupId: g.id, songId: g.demos[0].id, promo: 'modest', week: s.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(s);
  while (s.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) KP.advanceWeek(s);
  s.budget = 900;
  const soonest = KP.C.FESTS.LIST.map(f => ({ f, w: KP.festivalSlotWeek(s, f.id) })).filter(x => x.w >= s.week).sort((a, b) => a.w - b.w)[0]
    || { f: KP.C.FESTS.LIST[0], w: KP.festivalSlotWeek(s, KP.C.FESTS.LIST[0].id) };
  const fest = soonest.f, slot = soonest.w;
  s.scenes = (s.scenes || []).filter(sc => sc.kind !== 'festivalInvite');
  KP.openScene(s, { kind: 'festivalInvite', groupId: g.id, festivalId: fest.id, headline: false, expiresWeek: s.week + 2 });
  const sc = s.scenes.find(x => x.kind === 'festivalInvite');
  g.jpAway = { lane: 'version', until: Math.max(slot, s.week) + 1 };
  const r = KP.resolveScene(s, sc.id, 'accept');
  t.ok(r && r.ok === false && /Japan/.test(r.reason || ''), 'a yes from Japan is refused at the signing (' + String(r && r.reason || '').slice(0, 70) + ')');
  t.ok(!(g.festivalBookings || []).length && s.scenes.some(x => x.id === sc.id), 'no booking; the invitation stays open to lapse or to regret');
  delete g.jpAway;
  g.tour = { scale: 'club', pacing: 'humane', setlist: 'hits', legs: ['kr'], legIdx: 0, weekInLeg: 0, startWeek: s.week, cost: 0, soldOut: 0, soft: 0,
    kr: { route: Array.from({ length: 80 }, (_, i) => ({ city: 'c' + i })), idx: 0, encores: 0 } };
  t.ok(/road/.test(KP.festivalHardClash(s, g, slot) || ''), 'the road inside the slot is a clash too (' + KP.tourWeeksLeft(g) + ' weeks left)');
  g.tour = null;
  t.eq(KP.festivalHardClash(s, g, slot), null, 'a clear calendar is no clash');
  const r2 = KP.resolveScene(s, sc.id, 'accept');
  t.ok(r2 && r2.ok !== false && (g.festivalBookings || []).some(b => b.festivalId === fest.id), 'the same yes lands once the calendar is clear');
}

t.finish();
