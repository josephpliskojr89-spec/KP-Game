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
    const groups = KP.groups(state);

    // 1. development (or release prep, which replaces training for members);
    //    idols live on the promotion/recovery cycle, not the training room
    const prepIds = [];
    groups.forEach(g => { if (g.prep) g.members.forEach(id => prepIds.push(id)); });
    roster.forEach(p => {
      if (prepIds.includes(p.id)) return;
      if (p.status === 'idol') {
        const n = idolWeek(state, p, rng);
        if (n) inbox.push(n);
        return;
      }
      KP.developWeek(state, p, rng).forEach(n => inbox.push(n));
    });
    groups.forEach(g => {
      if (g.prep) KP.prepWeek(state, rng, g).forEach(n => inbox.push(n));
    });

    // popularity cools once the promotion cycle and its afterglow end;
    // a fan-care rollout stretches the afterglow — per group
    groups.forEach(g => {
      if (!g.debuted || g.prep) return;
      const focus = KP.C.COMEBACK.FOCUS[g.promoFocus] || KP.C.COMEBACK.FOCUS.musicShows;
      if (state.week > (g.promoUntil || 0) + KP.C.COMEBACK.decayGraceWeeks + focus.graceBonus) {
        g.popularity = Math.max(0, (g.popularity || 0) - KP.C.COMEBACK.popDecayPerWeek);
      }
    });

    // 2. showcase cadence (live reps for everyone, sharper reads)
    if (state.week % KP.C.TRAIN.showcaseEveryWeeks === 0 && roster.length) {
      KP.showcaseWeek(state, roster, rng).forEach(n => inbox.push(n));
    }

    // 2b. the project: the building talks about it
    if (state.project) {
      if (!state.project.announced) {
        state.project.announced = true;
        const seeking = state.project.seeking.map(d => KP.C.TALENT_LABELS[d].toLowerCase()).join(' and ');
        inbox.push({ kind: 'company', text: 'Word is out about the new group project. ' +
          state.project.locked.length + ' spot' + (state.project.locked.length === 1 ? ' is' : 's are') + ' already locked' +
          (seeking ? ', and the practice rooms have heard we need ' + seeking : '') +
          '. Every free trainee in the building is suddenly working late.' });
      } else if (rng.chance(KP.C.PROJECT.standoutNoteChance)) {
        const hopefuls = KP.freeTrainees(state).filter(id => !state.project.locked.includes(id))
          .map(id => state.people[id]);
        if (hopefuls.length) {
          const star = hopefuls.slice().sort((a, b) =>
            (b.personality.workEthic + b.personality.competitiveness) -
            (a.personality.workEthic + a.personality.competitiveness))[0];
          inbox.push({ kind: 'development', text: 'Since the project was announced, ' +
            KP.displayName(star) + ' has barely left the practice rooms. The spot is not hers yet — she is training like it is.' });
        }
      }
    }

    // 3. relationships
    KP.relationsWeek(state, roster, rng).forEach(n => inbox.push(n));

    // 4. rival scouting + board churn
    KP.rivalScoutingWeek(state, rng).forEach(n => inbox.push(n));

    // 5. table events
    KP.eventsWeek(state, rng).forEach(n => inbox.push(n));

    // 6. release resolution — due or overdue, never an exact-date match
    let dueGroup;
    while ((dueGroup = KP.debutDue(state))) {
      const res = KP.resolveDebut(state, rng, dueGroup);
      inbox.push({ kind: 'debut', urgent: true, groupId: dueGroup.id,
        text: dueGroup.name + (res.isDebut ? ' debuted with “' : ' came back with “') +
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

    // 8. month boundary: stipend + costs, the CEO's read of the books,
    //    and a headline
    if ((state.week - 1) % KP.C.WEEKS_PER_MONTH === 0) {
      const upkeep = Math.round(state.roster.length * KP.C.ECON.weeklyTrainingCostPerTrainee * KP.C.WEEKS_PER_MONTH);
      state.budget = Math.max(0, state.budget + KP.C.ECON.monthlyStipend - upkeep);

      // fiscal pressure (v0.2.3): once the signing cap lifts, the CEO
      // reads the books on a rolling quarter — one big album month is
      // business, a quarter of red ink gets noticed, a red half-year
      // costs trust
      state.fiscal = state.fiscal || { monthStartBudget: state.budget, pressure: 0, monthSignings: 0 };
      const net = state.budget - state.fiscal.monthStartBudget;
      state.fiscal.recentNets = (state.fiscal.recentNets || []).concat([net]).slice(-3);
      if (!KP.signingsCapped(state)) {
        const P = KP.C.ECON.PRESSURE;
        const quarterNet = state.fiscal.recentNets.reduce((a, b) => a + b, 0);
        if (quarterNet < -P.quarterBurnWarn) {
          state.fiscal.pressure = Math.min(3, (state.fiscal.pressure || 0) + 1);
          const spree = state.fiscal.monthSignings >= 3;
          const lvl = state.fiscal.pressure;
          if (lvl >= 3) state.trust = KP.clamp(state.trust + P.trustHitL3, 0, 100);
          else if (lvl === 2) state.trust = KP.clamp(state.trust + P.trustHitL2, 0, 100);
          inbox.push({ kind: 'executive', urgent: lvl >= 2, text: pressureLetter(state, lvl, quarterNet, spree) });
        } else if (quarterNet >= 0 && state.fiscal.pressure > 0) {
          state.fiscal.pressure--;
          if (state.fiscal.pressure === 0) {
            inbox.push({ kind: 'executive', text: state.executive.name + '’s office, briefly: “The books look like a business again. Carry on.”' });
          }
        }
      }
      state.fiscal.monthStartBudget = state.budget;
      state.fiscal.monthSignings = 0;

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

  function pressureLetter(state, lvl, net, spree) {
    const who = state.executive.name;
    if (lvl >= 3) {
      return who + ': “Three months of burning money. The board sees these numbers too, and unlike me, they do not know your plans. Show revenue, or show restraint.”';
    }
    if (lvl === 2) {
      return who + ': “The division is ' + Math.abs(Math.round(net)) + ' in the red over the quarter' +
        (spree ? ' — and the trainee floor is filling up fast' : '') +
        '. I lifted the signing cap because I trusted your judgment. Keep earning that.”';
    }
    return who + '’s office flagged the quarterly books: spend ran ' + Math.abs(Math.round(net)) +
      ' over income' + (spree ? ', much of it on new signings' : '') +
      '. Nothing said yet — but it was noticed.';
  }

  // The attribute a debuted idol works on herself: the one with the most
  // runway to her (resolved) ceiling. Exposed for the UI.
  KP.idolFocus = function (state, p) {
    let best = null;
    KP.C.TALENTS.forEach(d => {
      const t = p.talents[d];
      const ceil = p.flags['ceil_' + d] != null ? p.flags['ceil_' + d] : (t.ceilLo + t.ceilHi) / 2;
      const room = ceil - t.cur;
      if (!best || room > best.room) best = { domain: d, room };
    });
    return (best && best.room > 0.5) ? best : null;
  };

  // Idol weeks: promotion runs hot — where the heat goes is the rollout
  // focus the player chose — then the schedule breathes, and the pro
  // quietly drills what everyone knows she needs (v0.2.4).
  function idolWeek(state, p, rng) {
    const CB = KP.C.COMEBACK;
    const g = KP.groupOf(state, p.id);
    const promoting = g && g.debuted && state.week <= (g.promoUntil || 0);
    if (promoting) {
      const f = CB.FOCUS[g.promoFocus] || CB.FOCUS.musicShows;
      p.fatigue = KP.clamp(p.fatigue + f.fatigue, 0, 100);
      p.mediaExp += f.mediaExp;
      p.liveExp += f.liveExp;
      if (f.morale) p.morale = KP.clamp(p.morale + f.morale, 0, 100);
      if (f.pop) g.popularity = KP.clamp((g.popularity || 0) + f.pop, 0, 100);
      return null;
    }
    p.fatigue = KP.clamp(p.fatigue - CB.idolRecovery, 0, 100);
    p.morale = KP.clamp(p.morale + 1, 0, 100);
    return idolAutoTrain(state, p, rng);
  }

  function idolAutoTrain(state, p, rng) {
    const A = KP.C.COMEBACK.IDOL_AUTO;
    if (p.fatigue > A.restThreshold) return null;   // too tired: rest wins
    // resolve true ceilings lazily, same rule as the training room
    KP.C.TALENTS.forEach(d => {
      if (p.flags['ceil_' + d] == null) {
        const t = p.talents[d];
        p.flags['ceil_' + d] = Math.round(t.ceilLo + rng.next() * (t.ceilHi - t.ceilLo));
      }
    });
    const focus = KP.idolFocus(state, p);
    if (!focus) return null;
    const t = p.talents[focus.domain];
    const ceil = p.flags['ceil_' + focus.domain];
    let g = KP.C.TRAIN.baseGain * t.growth * A.mult * (0.6 + p.personality.workEthic / 200);
    if (ceil - t.cur < 6) g *= KP.C.TRAIN.ceilingCrawl;
    g *= 0.6 + rng.next() * 0.8;
    t.cur = Math.min(ceil, t.cur + g);
    p.fatigue = KP.clamp(p.fatigue + A.fatigueCost, 0, 100);
    if (rng.chance(0.015)) {
      return { kind: 'development', text: KP.displayName(p) + ' has been booking extra ' +
        KP.C.TALENT_LABELS[focus.domain].toLowerCase() + '-room time on her own between schedules. Nobody asked her to. That is rather the point.' };
    }
    return null;
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
    if (KP.groupOf(state, personId)) {
      return { ok: false, reason: 'She is in a lineup. The lineup would have to change first.' };
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
        shaken.push(KP.publicGiven(other));
      }
    });
    return { ok: true, shaken };
  };

  // Upcoming calendar strip entries for the Desk.
  KP.upcoming = function (state) {
    const items = [];
    const nextShowcase = state.week + (KP.C.TRAIN.showcaseEveryWeeks - (state.week % KP.C.TRAIN.showcaseEveryWeeks));
    items.push({ week: nextShowcase, label: 'Monthly showcase' });
    KP.groups(state).forEach(g => {
      if (g.prep) items.push({ week: g.prep.scheduledWeek,
        label: g.name + (g.debuted ? ' comeback' : ' debut'), hot: true });
    });
    if (state.objective.status === 'open') {
      items.push({ week: state.objective.deadlineWeek, label: 'Executive deadline', hot: true });
    }
    return items.filter(i => i.week >= state.week).sort((a, b) => a.week - b.week).slice(0, 4);
  };
})(typeof window !== 'undefined' ? window : globalThis);
