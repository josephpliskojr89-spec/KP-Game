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

    // 1b. promotion runs on the rollout plan (v0.6.3): booked activities,
    //     paid-for stages, and the occasional story they create
    groups.forEach(g => {
      if (g.debuted && state.week <= (g.promoUntil || 0) && state.week > (g.lastReleaseWeek || 0)) {
        KP.rolloutWeek(state, g, rng).forEach(n => inbox.push(n));
      }
    });

    // 1c. the road (v0.6.8): touring groups grind through their legs
    groups.forEach(g => {
      if (g.tour) KP.tourWeek(state, g, rng).forEach(n => inbox.push(n));
    });

    // popularity cools once the promotion cycle and its afterglow end;
    // fan-sign weeks in the rollout stretch the afterglow — per group.
    // A tour counts as activity: the room stays warm on the road.
    groups.forEach(g => {
      if (!g.debuted || g.prep || g.tour) return;
      if (state.week > (g.promoUntil || 0) + KP.C.COMEBACK.decayGraceWeeks + (g.promoGrace || 0)) {
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

    // 2c. pre-debut hype: the internet finds people on its own schedule
    hypeWeek(state, rng).forEach(n => inbox.push(n));

    // 3. relationships
    KP.relationsWeek(state, roster, rng).forEach(n => inbox.push(n));

    // 4. rival scouting + board churn
    KP.rivalScoutingWeek(state, rng).forEach(n => inbox.push(n));

    // 5. table events
    KP.eventsWeek(state, rng).forEach(n => inbox.push(n));

    // 5b-pre. the release war (v0.6.4): comebacks go public, locked dates
    //     leak, and rivals with a motive park releases on them
    KP.calendarWeek(state, rng).forEach(n => inbox.push(n));

    // 5b. the rest of the industry works too (v0.4.0): chart cools, rival
    //     acts debut and come back — BEFORE our releases resolve, so a
    //     crowded week is a crowded week
    KP.industryWeek(state, rng).forEach(n => inbox.push(n));

    // 5b2. the music shows air (v0.6.5): winners computed among everyone
    //      promoting this week — trophies, encores, ending fairies
    KP.showsWeek(state, rng).forEach(n => inbox.push(n));

    // 6. release resolution — due or overdue, never an exact-date match
    let dueGroup;
    while ((dueGroup = KP.debutDue(state))) {
      const res = KP.resolveDebut(state, rng, dueGroup);
      inbox.push({ kind: 'debut', urgent: true, groupId: dueGroup.id,
        text: dueGroup.name + (res.isDebut ? ' debuted with “' : ' came back with “') +
          res.songTitle + '”. ' + res.receptionLabel + '. Full report in the Studio.' });
      // narratives born at the release (v0.6.0) reach the desk too
      (res.narrativeNotes || []).forEach(n => inbox.push(n));
      delete res.narrativeNotes;
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

    // 7c. the hype directive resolves — met when she debuted, missed when
    // the window closed on your desk (self-healing, fires once)
    const hd = state.hypeDirective;
    if (hd && hd.status === 'open') {
      const person = state.people[hd.personId];
      if (person && person.status === 'idol') {
        hd.status = 'met';
        state.trust = KP.clamp(state.trust + KP.C.HYPE.directiveMetTrust, 0, 100);
        inbox.push({ kind: 'executive', text: state.executive.name + ': “' + KP.displayName(person) +
          ' debuted while the internet still cared. That is how this business is supposed to work. Noted.”' });
      } else if (state.week > hd.deadlineWeek) {
        hd.status = 'missed';
        state.trust = KP.clamp(state.trust + KP.C.HYPE.directiveMissTrust, 0, 100);
        if (person) {
          person.hype = Math.min(person.hype || 0, KP.C.HYPE.collapseTo);
          person.morale = KP.clamp(person.morale - 10, 0, 100);
        }
        inbox.push({ kind: 'executive', urgent: true, text: state.executive.name + ': “The internet moved on from ' +
          (person ? KP.displayName(person) : 'her') + ' while we held meetings. I gave you a direct instruction. Remember that I remember.”' });
      }
      if (hd.status !== 'open') {
        state.objectiveHistory = state.objectiveHistory || [];
        state.objectiveHistory.push({ type: 'hypeDebut', status: hd.status, week: state.week, personId: hd.personId });
        state.hypeDirective = null;
      }
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
        // the trades write about what the world actually believes (v0.6.0)
        const live = KP.liveNarratives(state);
        if (live.length && rng.chance(0.5)) {
          const n = live[rng.int(0, live.length - 1)];
          inbox.push({ kind: 'industry', text: 'Trade feature this month: “' +
            KP.narrativeText(state, n) + '” The coverage writes itself now.' });
        } else {
          inbox.push({ kind: 'industry', text: KP.genHeadline(rng) });
        }
      }

      // companies rise, fall, merge and split on the month boundary (v0.4.0)
      KP.industryLifecycle(state, rng).forEach(n => inbox.push(n));
    }

    // 8c. memory: opinions decay, slow patterns become narratives (v0.6.0)
    KP.memoryWeek(state).forEach(n => inbox.push(n));

    // 8d. the numbers everyone can see move (v0.6.1) — hash-driven, no dice
    KP.socialWeek(state).forEach(n => inbox.push(n));

    // 8d2. the map breathes (v0.6.6): borderless promo spreads, idle
    //      regions cool slowly — rng-free
    KP.regionsWeek(state);

    // 8e. the discourse burns (v0.6.2): storms ignite, grow, fade, boil
    KP.discourseWeek(state, rng).forEach(n => inbox.push(n));

    // 9. stamp this week's chart positions (all releases are in) — the
    //    national board hands out milestone letters — then let the fans
    //    react to everything that just happened
    KP.chartStamp(state).forEach(n => inbox.push(n));
    KP.feedWeek(state, rng, inbox);

    // trim + stamp inbox
    const kept = inbox.slice(0, KP.C.EVENTS.maxInboxPerWeek + inbox.filter(n => n.urgent).length);
    kept.forEach(n => { n.week = state.week; n.read = false; n.id = 'm' + (state.nextMsgId++); });
    state.inbox = kept.concat(state.inbox).slice(0, 60);

    saveRng(state, rng);
    return kept;
  };

  // Pre-debut hype: emergent events find magnetic trainees; everything
  // decays; past the threshold the CEO forces your hand (hard directive —
  // owner's choice: "I want the hard version").
  KP.hypeWord = function (h) {
    if (h >= KP.C.HYPE.directiveThreshold) return 'the internet has decided';
    if (h >= 35) return 'buzzing';
    if (h >= 15) return 'noticed';
    return 'quiet';
  };

  function hypeWeek(state, rng) {
    const H = KP.C.HYPE;
    const notes = [];
    let eventFired = false;
    state.roster.forEach(id => {
      const p = state.people[id];
      if (p.status !== 'trainee') return;
      p.hype = Math.max(0, (p.hype || 0) - H.decayPerWeek);
      if (!eventFired) {
        const pull = KP.derived(p).centerPull;
        if (rng.chance(H.eventBase * KP.clamp(pull, 20, 90) / 60)) {
          eventFired = true;
          p.hype = KP.clamp(p.hype + H.gainMin + rng.next() * (H.gainMax - H.gainMin), 0, 100);
          const narNote = KP.recordViral(state, p);   // memory counts (v0.6.0)
          if (narNote) notes.push(narNote);
          KP.socialSpike(state, p, KP.C.SOCIAL.viralSpike, 'viral');   // the numbers move (v0.6.1)
          if (rng.chance(KP.C.DISCOURSE.fancamChance)) {               // a wave you can ride (v0.6.2)
            const dn = KP.igniteDiscourse(state, rng, 'fancam', 'idol', p.id, null);
            if (dn) notes.push(dn);
          }
          notes.push({ kind: 'public', text: rng.pick([
            'A dance cover ' + KP.displayName(p) + ' filmed months ago is suddenly trending. The comments all ask the same question: when does she debut?',
            'Street-cast photos of ' + KP.displayName(p) + ' resurfaced overnight and the reposts have not stopped.',
            'A showcase clip of ' + KP.displayName(p) + ' escaped containment. Her name is in search trends next to artists who have albums.',
          ]) });
        }
      }
    });
    // the hard directive: past the threshold, the CEO stops asking
    if (!state.hypeDirective) {
      const hot = state.roster.map(id => state.people[id])
        .filter(p => p.status === 'trainee' && (p.hype || 0) >= H.directiveThreshold)
        .sort((a, b) => (b.hype || 0) - (a.hype || 0))[0];
      if (hot) {
        state.hypeDirective = {
          personId: hot.id, issuedWeek: state.week,
          deadlineWeek: state.week + H.directiveWeeks, status: 'open',
        };
        notes.push({ kind: 'executive', urgent: true, text: state.executive.name + ': “The internet has decided about ' +
          KP.displayName(hot) + ' and I agree with it. Debut her by ' + KP.weekLabel(state.week + H.directiveWeeks).text +
          ' — in a group, alone, I do not care which. Do not make me watch her fade on our payroll.”' });
      }
    }
    return notes;
  }

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

  // Idol weeks (v0.4.2): promotion runs hot — where the heat goes is the
  // rollout focus the player chose — then the calendar CLOSES for
  // contractual rest that actually restores, and only then does the pro
  // quietly drill what everyone knows she needs (v0.2.4). A member the
  // medical staff benched does none of it; she sleeps.
  function idolWeek(state, p, rng) {
    const CB = KP.C.COMEBACK;
    const g = KP.groupOf(state, p.id);
    if (p.flags.burnout > 0) {
      p.flags.burnout--;
      p.fatigue = KP.clamp(p.fatigue - CB.OVERWORK.benchRecovery, 0, 100);
      p.morale = KP.clamp(p.morale + 1, 0, 100);
      return null;
    }
    const promoting = g && g.debuted && state.week <= (g.promoUntil || 0);
    if (promoting) return null;   // the rollout desk runs promo weeks (v0.6.3)
    if (g && g.tour) return null; // the road runs tour weeks (v0.6.8)
    const resting = g && g.debuted &&
      (state.week <= (g.promoUntil || 0) + CB.restWeeks ||
       state.week <= (g.tourRestUntil || 0));
    if (resting) {
      // the contractual rest window: no schedules, real recovery
      p.fatigue = KP.clamp(p.fatigue - CB.restRecovery, 0, 100);
      p.morale = KP.clamp(p.morale + 2, 0, 100);
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

  // Upcoming calendar strip entries for the Desk — including the war
  // calendar: announced rival comebacks share the strip (v0.6.4).
  KP.upcoming = function (state) {
    const items = [];
    const nextShowcase = state.week + (KP.C.TRAIN.showcaseEveryWeeks - (state.week % KP.C.TRAIN.showcaseEveryWeeks));
    items.push({ week: nextShowcase, label: 'Monthly showcase' });
    KP.groups(state).forEach(g => {
      if (g.prep) items.push({ week: g.prep.scheduledWeek,
        label: g.name + (g.debuted ? ' comeback' : ' debut'), hot: true,
        clash: !!(g.prep.clash && g.prep.clash.resolved !== 'slip') });
    });
    KP.releaseCalendar(state).forEach(e => {
      if (!e.isPlayer) items.push({ week: e.week, label: e.label + ' — ' + e.company });
    });
    if (state.objective.status === 'open') {
      items.push({ week: state.objective.deadlineWeek, label: 'Executive deadline', hot: true });
    }
    return items.filter(i => i.week >= state.week).sort((a, b) => a.week - b.week).slice(0, 5);
  };
})(typeof window !== 'undefined' ? window : globalThis);
