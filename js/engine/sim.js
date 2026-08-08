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

    // 1. development (or release prep, which replaces training for members);
    //    idols live on the promotion/recovery cycle, not the training room
    const g = state.group;
    const prepping = g && g.prep;
    const prepIds = prepping ? g.members : [];
    roster.forEach(p => {
      if (prepIds.includes(p.id)) return;
      if (p.status === 'idol') { idolWeek(state, p); return; }
      KP.developWeek(state, p, rng).forEach(n => inbox.push(n));
    });
    if (prepping) KP.prepWeek(state, rng).forEach(n => inbox.push(n));

    // popularity cools once the promotion cycle and its afterglow end
    if (g && g.debuted && !g.prep &&
        state.week > (g.promoUntil || 0) + KP.C.COMEBACK.decayGraceWeeks) {
      g.popularity = Math.max(0, (g.popularity || 0) - KP.C.COMEBACK.popDecayPerWeek);
    }

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

    // 6. release resolution — due or overdue, never an exact-date match
    if (KP.debutDue(state)) {
      const res = KP.resolveDebut(state, rng);
      inbox.push({ kind: 'debut', urgent: true,
        text: state.group.name + (res.isDebut ? ' debuted with “' : ' came back with “') +
          res.songTitle + '”. ' + res.receptionLabel + '. Full report in the Studio.' });
    }

    // 7. deadline check — self-healing: fires when overdue, once
    if (state.objective.status === 'open' && state.week > state.objective.deadlineWeek) {
      state.objective.status = 'missed';
      const isComeback = state.objective.type === 'comeback';
      const penalty = isComeback ? KP.C.COMEBACK.missedDeadlinePenalty : KP.C.EXEC.missedDeadlinePenalty;
      state.trust = KP.clamp(state.trust + penalty, 0, 100);
      inbox.push({ kind: 'executive', urgent: true,
        text: isComeback
          ? state.executive.name + ': “The comeback window closed with nothing in it. Momentum does not wait for us, and neither does the board.”'
          : state.executive.name + ': “The deadline has passed without a debut. I defended this division at the board today. I will not do it twice.”' });
    }

    // 7b. the ladder: a finished objective summons the next directive
    if (KP.objectiveSuccessionDue(state)) {
      inbox.push(KP.issueNextObjective(state, rng));
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

  // Idol weeks: promotion runs hot, then the schedule finally breathes.
  function idolWeek(state, p) {
    const CB = KP.C.COMEBACK;
    const g = state.group;
    const promoting = g && g.debuted && state.week <= (g.promoUntil || 0);
    if (promoting) {
      p.fatigue = KP.clamp(p.fatigue + CB.promoFatigue, 0, 100);
      p.mediaExp += 2;
      p.liveExp += 1.5;
    } else {
      p.fatigue = KP.clamp(p.fatigue - CB.idolRecovery, 0, 100);
      p.morale = KP.clamp(p.morale + 1, 0, 100);
    }
  }

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

  // ---- Releasing a trainee (player action only — Law: never auto-cut) --
  KP.releaseTrainee = function (state, personId) {
    const p = state.people[personId];
    if (!p || !state.roster.includes(personId)) return { ok: false, reason: 'Not on the roster.' };
    if (p.status === 'idol') return { ok: false, reason: 'She has debuted. Terminating an active artist is above your pay grade.' };
    if (state.group && state.group.members.includes(personId)) {
      return { ok: false, reason: 'She is in the debut lineup. The lineup would have to change first.' };
    }
    state.roster = state.roster.filter(id => id !== personId);
    p.status = 'released';
    p.training.focus = [];
    p.history.push({ week: state.week, text: 'Released from ' + state.company.short + '.' });
    // the building notices: close friends take it hard
    const shaken = [];
    const rels = state.relationships || {};
    state.roster.forEach(otherId => {
      const other = state.people[otherId];
      const rel = rels[KP.pairKey(p, other)];
      if (rel && rel.state === 'close') {
        other.morale = KP.clamp(other.morale - 8, 0, 100);
        shaken.push(other.name.given);
      }
    });
    return { ok: true, shaken };
  };

  // Upcoming calendar strip entries for the Desk.
  KP.upcoming = function (state) {
    const items = [];
    const nextShowcase = state.week + (KP.C.TRAIN.showcaseEveryWeeks - (state.week % KP.C.TRAIN.showcaseEveryWeeks));
    items.push({ week: nextShowcase, label: 'Monthly showcase' });
    if (state.group && state.group.prep) {
      items.push({ week: state.group.prep.scheduledWeek,
        label: state.group.name + (state.group.debuted ? ' comeback' : ' debut'), hot: true });
    }
    if (state.objective.status === 'open') {
      items.push({ week: state.objective.deadlineWeek, label: 'Executive deadline', hot: true });
    }
    return items.filter(i => i.week >= state.week).sort((a, b) => a.week - b.week).slice(0, 4);
  };
})(typeof window !== 'undefined' ? window : globalThis);
