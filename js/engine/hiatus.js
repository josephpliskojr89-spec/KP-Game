/* The disappearance (v0.9.12) — §39 Phase C: hiatus as strategy.
   Not-releasing was always possible; ANNOUNCING it is a move. A declared
   hiatus is real rest — fatigue drains faster, morale climbs, the second
   job gets room to breathe — and a promise: the return will be an event.
   But past the grace window the public starts forgetting, and forgetting
   compounds weekly. The player chooses restoration against relevance,
   and the return release settles the bet. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  KP.onHiatus = function (g) { return !!(g && g.hiatus); };
  KP.hiatusWeeks = function (state, g) {
    return g && g.hiatus ? state.week - g.hiatus.since : 0;
  };

  // ---- the announcement: a management action with a press release ----
  KP.declareHiatus = function (state, groupId) {
    const g = KP.groupById(state, groupId);
    if (!g || !g.debuted) return { ok: false, reason: 'Only a debuted group can disappear. Everyone else is just unknown.' };
    if (g.hiatus) return { ok: false, reason: 'They are already gone. Announcing it twice is a comeback in reverse.' };
    if (g.prep) return { ok: false, reason: 'A release is in production. Finish the record or scrap it — not both.' };
    if (g.tour) return { ok: false, reason: 'They are on the road. A hiatus announced from a tour bus is a scandal, not a strategy.' };
    if (state.week <= (g.promoUntil || 0)) return { ok: false, reason: 'Promotions are running. Let the era end before you end the calendar.' };
    g.hiatus = { since: state.week };
    g.members.forEach(id => {
      const p = state.people[id];
      if (p) p.history.push({ week: state.week, text: g.name + ' announced an official hiatus. The vans stopped coming. The apartment got quiet in a way that took getting used to.' });
    });
    const note = KP.note(state, { kind: 'public', ind: 'hiatusDeclared', priority: 'high', groupId: g.id,
      text: g.name + ' announced an official hiatus — the statement thanks the fans, promises a return, and gives no date, in the traditional order. The fan cafés moved through the stages of grief in about four hours and settled on “rest well, we will be here.” The countdown accounts started the same afternoon.' });
    return { ok: true, note: note.text };
  };

  // ---- the weekly: restoration on one hand, cooling on the other ----
  KP.registerWeekly('hiatus', 789, function (state, rng, inbox, roster, groups) {
    const H = KP.C.HIATUS;
    groups.forEach(g => {
      if (!g.hiatus) return;
      const weeks = state.week - g.hiatus.since;
      // the rest is real: fatigue drains, people come back to themselves
      g.members.forEach(id => {
        const p = state.people[id];
        if (!p) return;
        p.fatigue = KP.clamp(p.fatigue - H.restBonus, 0, 100);
        p.morale = KP.clamp(p.morale + H.moraleGain, 0, 100);
      });
      // past the grace window, the public starts forgetting
      if (weeks > H.graceWeeks) {
        g.hiatusCooledEver = true;   // durable: the census reads stamps, not notes
        g.popularity = KP.clamp((g.popularity || 0) - H.coolPerWeek, 0, 100);
        if (g.fandom) g.fandom.intensity = KP.clamp((g.fandom.intensity || 0) - H.fandomCoolPerWeek, 0, 100);
        if (!g.hiatus.coolNoted) {
          g.hiatus.coolNoted = true;
          inbox.push({ kind: 'company', groupId: g.id,
            text: 'The weekly numbers for ' + g.name + ' have started their slow walk down — the announcement bought ' + H.graceWeeks +
              ' weeks of patience and the patience is spent. Rest is still working. So is forgetting. Both compound.' });
        }
      }
    });
  });

  // ---- the return: locking a comeback announces it -------------------
  // Called from planDebut the moment a hiatus group locks a record.
  KP.hiatusReturnLock = function (state, g) {
    if (!g.hiatus) return null;
    const weeks = state.week - g.hiatus.since;
    g.returnFrom = { weeks };
    g.hiatus = null;
    return KP.note(state, { kind: 'public', ind: 'returnAnnounced', priority: 'high', groupId: g.id,
      text: g.name + ' IS COMING BACK. The announcement post broke the fan cafés within the hour — ' + weeks +
        ' weeks of quiet, ended by a date and a teaser photo of four silhouettes. The countdown accounts have never been so employed.' });
  };

  // ---- the read: anticipation lands on the return release ------------
  // Same contract as seasonRead — one door supplies the number and the
  // words, resolveDebut adds them where every other mod lives.
  KP.hiatusReadsRelease = function (state, g, isDebut) {
    const H = KP.C.HIATUS;
    const out = { mod: 0, note: null };
    if (isDebut || !g.returnFrom) return out;
    const weeks = g.returnFrom.weeks || 0;
    delete g.returnFrom;
    // only the weeks past grace count — the ones that paid the toll.
    // A stay inside the window was a schedule gap wearing a press release.
    const earned = Math.max(0, weeks - H.graceWeeks);
    if (!earned) return out;
    g.hiatusReturns = (g.hiatusReturns || 0) + 1;     // durable: the return happened
    out.mod = Math.min(H.anticipationCap, Math.round(earned * H.anticipationPerWeek));
    out.note = 'The return did what declared returns do: ' + weeks +
      ' weeks of absence converted into first-day numbers. The fans did not drift — they WAITED, and the receipts show the difference.';
    return out;
  };

  // ---- the timeline reacts through the registry ----------------------
  KP.onFeedEvent('hiatusDeclared', (state, n, rng) => {
    const g = KP.groupById(state, n.groupId);
    if (!g) return null;
    return rng.pick([
      { persona: 'fan', text: g.name + ' hiatus announcement. I am fine. this is fine. rest well kings/queens/monarchs of my heart. the streaming playlist is ALREADY made for the wait' },
      { persona: 'stan', text: 'the ' + g.name + ' statement says “for health and future activities” and I have chosen to believe every word with my whole chest. see you on the other side' },
      { persona: 'casual', text: 'a whole group just announced a break and honestly? good. the schedules these companies run are not human. rest is content too' },
    ]);
  });
  KP.onFeedEvent('returnAnnounced', (state, n, rng) => {
    const g = KP.groupById(state, n.groupId);
    if (!g) return null;
    return rng.pick([
      { persona: 'fan', text: g.name + ' COMEBACK CONFIRMED. THE SILHOUETTE TEASER. I have been normal about this for zero minutes and counting' },
      { persona: 'stan', text: 'the ' + g.name + ' countdown account posted “D-minus” and the reply section turned into a group hug with typos. we SURVIVED the quiet' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
