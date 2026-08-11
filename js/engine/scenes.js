/* The stage door (v0.8.0) — the interaction foundation.
   Audit II: the roadmap is made of scenes, and the game had no scene
   primitive. This module is the runtime for the kernel's scene and
   claim registries: the weekly phase that expires unanswered scenes
   and runs claim predicates, plus the directed-acts door — the single
   write path for "she remembers what YOU did", so standing is derived
   from one truth and never double-counted. No features live here;
   features REGISTER here. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // ---- the weekly turn of the door --------------------------------------
  // Order 786: after the month boundary, just before the meeting phase
  // (790) — so a question posed this week is never expired this week.
  KP.registerWeekly('stageDoor', 786, function (state, rng, inbox, roster, groups) {
    // unanswered scenes expire — and in this house, silence is content
    const keep = [];
    (state.scenes || []).forEach(sc => {
      if (sc.expiresWeek != null && state.week > sc.expiresWeek) {
        const def = KP.sceneDef(sc.kind);
        if (def && def.expire) {
          const n = def.expire(state, sc);
          if (n) inbox.push(n);
        }
        // the conversation record keeps the silences too
        state.convoLog = state.convoLog || [];
        state.convoLog.unshift({ week: state.week, kind: sc.kind,
          personId: sc.personId || null,
          title: def ? def.title(state, sc) : sc.kind, answer: '(went unanswered)' });
        if (state.convoLog.length > 40) state.convoLog.length = 40;
        return;
      }
      keep.push(sc);
    });
    state.scenes = keep;

    // claim predicates run through the registry — self-healing, fire once
    (state.claims || []).forEach(c => {
      if (c.resolved) return;
      const check = KP.claimCheckFor(c.type);
      const r = check(state, c);
      if (!r) return;
      c.resolved = r.resolved;
      c.resolvedWeek = state.week;
      (r.notes || []).forEach(n => inbox.push(n));
    });
    // the ledger keeps every open claim and a bounded tail of settled ones
    if (state.claims) {
      const S = KP.C.SCENES;
      state.claims = state.claims.filter(c => !c.resolved).concat(
        state.claims.filter(c => c.resolved).slice(-S.maxResolvedClaims));
    }
  });

  // ---- the directed-acts door -------------------------------------------
  // ONE write path for things the PLAYER did to a specific person —
  // the substrate under "she'd run through a wall for you". Weights
  // are small integers; the ledger is bounded; standing is derived
  // with a half-life so old kindnesses fade and old wounds heal.
  KP.recordDirected = function (state, personId, kind, weight) {
    const p = state.people[personId];
    if (!p) return null;
    const S = KP.C.SCENES;
    p.directed = p.directed || [];
    p.directed.push({ week: state.week, kind, w: weight });
    if (p.directed.length > S.directedCap) p.directed = p.directed.slice(-S.directedCap);
    return p.directed[p.directed.length - 1];
  };

  KP.standingScore = function (state, p) {
    const S = KP.C.SCENES;
    return (p.directed || []).reduce((sum, a) => {
      const age = Math.max(0, state.week - a.week);
      return sum + a.w * Math.pow(0.5, age / S.directedHalfLifeWeeks);
    }, 0);
  };

  // words, never a meter (house style) — how she carries the company
  KP.standingOf = function (state, p) {
    const s = KP.standingScore(state, p);
    if (s >= 8) return 'she would run through a wall for this company';
    if (s >= 3) return 'she trusts the office';
    if (s > -3) return 'professional, nothing more';
    if (s > -8) return 'guarded around the office';
    return 'counting the days';
  };
})(typeof window !== 'undefined' ? window : globalThis);
