/* The one door (v0.10.30, §89 D1) — every "she comes to you" scene
   through ONE queue.
   The audit found eight sources opening person scenes — the office
   door, the five frictions, the moment call, the walkout, the solo
   knock, the quiet era, the recovery — each gating only on its OWN
   kinds, so door.js's "one open idol scene at a time" law was enforced
   by nobody and one week could stack five. Now: systems REGISTER
   candidates (kernel.registerKnock); this rail makes one pick a week,
   on one cadence, with one per-person gap. Priority candidates (a
   walkout, the rehearsed ask, a slump, a recovery) skip the roll —
   they are events, not questions — but still wait their turn at the
   door. The rng is touched only when a candidate exists (the v0.10.17
   law: a rail that draws on empty weeks shifts every stream). */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    return state.knockLedger = state.knockLedger ||
      { asked: 0, byKind: {}, lastWeek: -999 };
  }
  KP.knockLedger = ledger;

  // is a person scene on the desk? (any kind a provider registered)
  KP.personSceneOpen = function (state) {
    return (state.scenes || []).some(sc => KP.isKnockKind(sc.kind));
  };

  // the candidates, gathered and filtered — pure, for tools and tests
  KP.knockCandidates = function (state) {
    const K = KP.C.KNOCK;
    const out = [];
    KP.knockProviders().forEach(pr => {
      (pr.fn(state) || []).forEach(c => {
        const p = state.people[c.personId];
        if (!p || p.status === 'released' || p.status === 'departed') return;
        // one scene per person at a time, across every source
        if ((state.scenes || []).some(sc => sc.personId === c.personId)) return;
        // questions respect the per-person gap; events do not
        if (!c.priority && state.week - (p.flags.knockWeek || -999) < K.personGapWeeks) return;
        out.push(Object.assign({ source: pr.name }, c));
      });
    });
    out.sort((a, b) => (b.priority || 0) - (a.priority || 0) || (b.weight || 0) - (a.weight || 0) ||
      KP.hash01([state.seed, a.personId, a.kind, state.week].join('|')) -
      KP.hash01([state.seed, b.personId, b.kind, state.week].join('|')));
    return out;
  };

  // ---- the weekly turn (order 857: after the spotlight 856, after the
  // shadow 855, before the meeting's own question) ----------------------
  KP.registerWeekly('theDoor', 857, function (state, rng) {
    const K = KP.C.KNOCK;
    const led = ledger(state);
    if (KP.personSceneOpen(state)) return;
    if (state.week - led.lastWeek < K.gapWeeks) return;
    const cands = KP.knockCandidates(state);
    if (!cands.length) return;
    const pick = cands[0];
    if (!pick.priority && !rng.chance(K.chance)) return;
    const p = state.people[pick.personId];
    p.flags.knockWeek = state.week;
    led.lastWeek = state.week;
    led.asked++;
    led.byKind[pick.kind] = (led.byKind[pick.kind] || 0) + 1;
    if (pick.onPick) pick.onPick(state, pick);
    const sc = { kind: pick.kind, personId: pick.personId,
      expiresWeek: state.week + (pick.expiresIn || K.expireWeeks) };
    Object.keys(pick).forEach(k => {
      if (['weight', 'priority', 'expiresIn', 'onPick', 'source'].includes(k)) return;
      if (sc[k] === undefined) sc[k] = pick[k];
    });
    KP.openScene(state, sc);
  });
})(typeof window !== 'undefined' ? window : globalThis);
