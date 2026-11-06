/* The English version (v0.10.9, §80 finding 13) — the hit re-cut for
   the west: cheap, warming NA and EU at once, the version lane beside
   the JP-version. The overseas conventions this module used to run
   moved onto the festival calendar as region-keyed FESTS rows
   (v0.10.43, §89 D9): one invitation scene, one ledger, the tongue
   applied on resolve. Only the lane stays here. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.circuitLedger = state.circuitLedger || { enCuts: 0 };
    return state.circuitLedger;
  }
  KP.circuitLedger = ledger;

  // ---- the English version -----------------------------------------------
  KP.cutEnglishVersion = function (state, groupId) {
    const E = KP.C.CIRCUIT.EN;
    const g = KP.groups(state).find(x => x.id === groupId);
    if (!g || !g.debuted || g.retiredWeek) return { ok: false, reason: 'The lane is for a debuted act.' };
    if (g.prep || g.tour || g.hiatus || g.jpAway) return { ok: false, reason: 'The calendar is spoken for.' };
    if (state.week <= (g.promoUntil || 0)) return { ok: false, reason: 'Mid-promotion — the version drops between eras.' };
    const last = (g.releases || [])[g.releases ? g.releases.length - 1 : 0];
    if (!last || (last.reception || 0) < E.minRec) {
      return { ok: false, reason: 'The version lane re-cuts a HIT. The last record does not travel at this weight.' };
    }
    if (state.week - (g.lastEnWeek || -999) < E.cooldown) {
      return { ok: false, reason: 'The last version is still working the playlists.' };
    }
    if (state.budget < E.cost) return { ok: false, reason: 'The re-cut bills up front — ' + E.cost + '.' };
    state.budget -= E.cost;
    if (KP.ledgerFlow) KP.ledgerFlow(state, 'production', -E.cost);
    g.lastEnWeek = state.week;
    const voice = KP.voiceAbroad ? KP.voiceAbroad(state, g, 'na') : null;
    const regions = KP.regionsOf(g);
    const gain = voice ? E.warmth : Math.round(E.warmth * KP.tongueFactor(state, g, 'na', 'circuit'));
    regions.na = KP.clamp((regions.na || 0) + gain, 0, 100);
    regions.eu = KP.clamp((regions.eu || 0) + gain, 0, 100);
    const revenue = Math.round((last.reception || 0) * E.rev);
    state.budget += revenue;
    if (KP.ledgerFlow) KP.ledgerFlow(state, 'streams', revenue);
    if (KP.settleShare) KP.settleShare(state, g, revenue);
    ledger(state).enCuts++;
    KP.note(state, { kind: 'public', ind: 'enVersion', priority: 'high', groupId: g.id,
      text: '“' + last.songTitle + '” (English Ver.) is out — the hit re-cut for the west, ' +
        (voice ? 'with ' + KP.displayName(voice) + '’s pronunciation earning genuine surprise in the reaction videos'
               : 'the pronunciation debate already three threads deep, which is also promotion') +
        '. ' + revenue + ' off the playlists, and two far corners of the map warmed at once. Cheap, effective, and every A&R team pretends to be above it right up until the quarter needs it.' });
    return { ok: true, revenue };
  };

  // ---- the timeline reacts -----------------------------------------------
  KP.onFeedEvent('enVersion', (state, n, rng) => rng.chance(0.5) ? rng.pick([
    { persona: 'casual', text: 'the english version pipeline: mock it, skip it, watch it chart in two markets you have no other road into, release one next quarter. the cycle of acceptance' },
    { persona: 'stan', text: 'the english ver is out and yes we are streaming both versions. they count separately. we checked. we always check' },
  ]) : null);
})(typeof window !== 'undefined' ? window : globalThis);
