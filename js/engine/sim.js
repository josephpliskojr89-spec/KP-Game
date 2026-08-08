/* Weekly orchestration: the single advance-week entry point the UI calls,
   and the same one the harness calls. One code path, no reimplementation. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // ---- Calendar helpers -------------------------------------------------
  KP.weekLabel = function (week) {
    const C = KP.C;
    const y = Math.floor((week - 1) / C.WEEKS_PER_YEAR) + 1;
    const m = Math.floor(((week - 1) % C.WEEKS_PER_YEAR) / C.WEEKS_PER_MONTH);
    const w = ((week - 1) % C.WEEKS_PER_MONTH) + 1;
    return { year: y, month: C.MONTH_NAMES[m], weekOfMonth: w,
      text: C.MONTH_NAMES[m] + ' · Wk ' + w + ' · Y' + y };
  };
  KP.monthsUntil = function (fromWeek, toWeek) {
    return Math.max(0, Math.floor((toWeek - fromWeek) / KP.C.WEEKS_PER_MONTH));
  };

  KP.rngFor = function (state) { return KP.Rng.fromState(state.rngState); };
  function saveRng(state, rng) { state.rngState = rng.state(); }

  // ---- The advance ------------------------------------------------------
  KP.advanceWeek = function (state) {
    const rng = KP.rngFor(state);
    const inbox = [];
    state.week++;

    const roster = state.roster.map(id => state.people[id]);

    // 1. development (or debut prep, which replaces training for group members)
    const prepping = state.group && state.group.prep && !state.group.debuted;
    const prepIds = prepping ? state.group.members : [];
    roster.forEach(p => {
      if (prepIds.includes(p.id)) return;
      KP.developWeek(state, p, rng).forEach(n => inbox.push(n));
    });
    if (prepping) KP.prepWeek(state, rng).forEach(n => inbox.push(n));

    // 2. showcase cadence (live reps for everyone, sharper reads)
    if (state.week % KP.C.TRAIN.showcaseEveryWeeks === 0 && roster.length) {
      KP.showcaseWeek(state, roster, rng).forEach(n => inbox.push(n));
    }

    // 3. relationships
    KP.relationsWeek(state, roster, rng).forEach(n => inbox.push(n));

    // 4. rival scouting + board churn
    KP.rivalScoutingWeek(state, rng).forEach(n => inbox.push(n));

    // 5. table events
    KP.eventsWeek(state, rng).forEach(n => inbox.push(n));

    // 6. debut resolution — due or overdue, never an exact-date match
    if (KP.debutDue(state)) {
      const res = KP.resolveDebut(state, rng);
      inbox.push({ kind: 'debut', urgent: true,
        text: state.group.name + ' debuted with “' + res.songTitle + '”. ' + res.receptionLabel + '. Full report in the Studio.' });
    }

    // 7. deadline check — self-healing: fires when overdue, once
    if (state.objective.status === 'open' && state.week > state.objective.deadlineWeek) {
      state.objective.status = 'missed';
      state.trust = KP.clamp(state.trust + KP.C.EXEC.missedDeadlinePenalty, 0, 100);
      inbox.push({ kind: 'executive', urgent: true,
        text: state.executive.name + ': “The deadline has passed without a debut. I defended this division at the board today. I will not do it twice.”' });
    }

    // 8. month boundary: stipend + costs + a headline
    if ((state.week - 1) % KP.C.WEEKS_PER_MONTH === 0) {
      const upkeep = Math.round(state.roster.length * KP.C.ECON.weeklyTrainingCostPerTrainee * KP.C.WEEKS_PER_MONTH);
      state.budget = Math.max(0, state.budget + KP.C.ECON.monthlyStipend - upkeep);
      if (rng.chance(0.6)) {
        inbox.push({ kind: 'industry', text: rng.pick(KP.DATA.headlines) });
      }
    }

    // trim + stamp inbox
    const kept = inbox.slice(0, KP.C.EVENTS.maxInboxPerWeek + inbox.filter(n => n.urgent).length);
    kept.forEach(n => { n.week = state.week; n.read = false; n.id = 'm' + (state.nextMsgId++); });
    state.inbox = kept.concat(state.inbox).slice(0, 60);

    saveRng(state, rng);
    return kept;
  };

  // ---- Training assignment (UI-facing) ---------------------------------
  KP.setTraining = function (state, personId, focus, intensity) {
    const p = state.people[personId];
    if (!p) return { ok: false };
    if (p.flags.burnout > 0 && intensity !== 'rest' && intensity !== 'light') {
      return { ok: false, reason: 'Medical staff have capped her load for now.' };
    }
    p.training.focus = (focus || []).slice(0, 2);
    p.training.intensity = KP.C.TRAIN.intensities.includes(intensity) ? intensity : 'standard';
    return { ok: true };
  };

  // Upcoming calendar strip entries for the Desk.
  KP.upcoming = function (state) {
    const items = [];
    const nextShowcase = state.week + (KP.C.TRAIN.showcaseEveryWeeks - (state.week % KP.C.TRAIN.showcaseEveryWeeks));
    items.push({ week: nextShowcase, label: 'Monthly showcase' });
    if (state.group && state.group.prep && !state.group.debuted) {
      items.push({ week: state.group.prep.scheduledWeek, label: state.group.name + ' debut', hot: true });
    }
    if (state.objective.status === 'open') {
      items.push({ week: state.objective.deadlineWeek, label: 'Executive deadline', hot: true });
    }
    return items.filter(i => i.week >= state.week).sort((a, b) => a.week - b.week).slice(0, 4);
  };
})(typeof window !== 'undefined' ? window : globalThis);
