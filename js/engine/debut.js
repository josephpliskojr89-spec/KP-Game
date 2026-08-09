/* Debut planning and resolution. The company plans; the public decides.
   Reception = performance + material + concept fit + promotion + luck.
   The breakout member is chosen by the public, not the org chart. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // Which group a plan targets: explicit id, else the only sensible one.
  function targetGroup(state, plan) {
    const groups = KP.groups(state);
    if (plan && plan.groupId) return KP.groupById(state, plan.groupId);
    if (groups.length === 1) return groups[0];
    return KP.devGroup(state) || null;
  }

  // Schedule a release: lock song, concept, prep allocation, promo, week.
  // Works for the debut and for every comeback after it.
  KP.planDebut = function (state, plan) {
    const D = KP.C.DEBUT;
    const g = targetGroup(state, plan);
    if (!g) return { ok: false, reason: 'No group to debut. With several groups, say which one.' };
    if (g.prep) return { ok: false, reason: 'A release is already locked.' };
    // v0.4.2 — the calendar closes after a release: promotion, then
    // contractual rest. No new lock until it reopens.
    if (g.debuted) {
      const opens = (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks;
      if (state.week <= opens) {
        return { ok: false, reason: state.week <= (g.promoUntil || 0)
          ? 'They are mid-promotion. Rest follows the last stage — the calendar reopens ' + KP.weekLabel(opens + 1).text + '.'
          : 'The members are on scheduled rest. The calendar reopens ' + KP.weekLabel(opens + 1).text + '. Let them sleep.' };
      }
    }
    const demo = (g.demos || state.demos || []).find(s => s.id === plan.songId);
    if (!demo) return { ok: false, reason: 'Choose a title track.' };
    const format = D.FORMATS.find(f => f.id === (plan.format || 'single')) || D.FORMATS[0];
    const minPrep = Math.max(D.prepWeeksMin, format.minPrep);
    if (plan.week < state.week + minPrep) {
      return { ok: false, reason: 'A ' + format.label.toLowerCase() + ' needs at least ' + minPrep + ' weeks of runway.' };
    }
    if (state.objective.type === 'debutGirlGroup' && state.objective.status === 'open' &&
        plan.week > state.objective.deadlineWeek) {
      return { ok: false, reason: 'That date is past the executive deadline. Do not test her.' };
    }
    const alloc = plan.alloc || { vocals: 25, dance: 25, rap: 25, media: 25 };
    const total = alloc.vocals + alloc.dance + alloc.rap + alloc.media;
    if (Math.round(total) !== 100) return { ok: false, reason: 'Rehearsal allocation must total 100%.' };
    const cost = D.promoCost[plan.promo || 'standard'] + format.cost;
    if (state.budget < cost) return { ok: false, reason: 'Budget cannot cover a ' + format.label.toLowerCase() + ' at this promotion level.' };
    state.budget -= cost;

    g.prep = {
      songId: demo.id,
      conceptId: plan.conceptId || demo.conceptId,
      promo: plan.promo || 'standard',
      format: format.id,
      focus: KP.C.COMEBACK.FOCUS[plan.focus] ? plan.focus : 'musicShows',
      alloc,
      scheduledWeek: plan.week,
      progress: 0,
    };
    // locking over a worn roster is allowed — and the staff say so (v0.4.2)
    const members = g.members.map(id => state.people[id]);
    const fatigueAvg = members.reduce((s, m) => s + m.fatigue, 0) / members.length;
    if (fatigueAvg >= KP.C.COMEBACK.OVERWORK.lockWarnAt) {
      return { ok: true, warning: 'The staff flag the schedule: the members are still worn from the last cycle. This one will cost them more than it should.' };
    }
    return { ok: true };
  };

  // Weekly release-prep for one group: rehearsal replaces training.
  // Benched members (overwork, v0.4.2) sit rehearsal out and recover.
  KP.prepWeek = function (state, rng, g) {
    if (!g || !g.prep) return [];
    const notes = [];
    const OW = KP.C.COMEBACK.OVERWORK;
    const members = g.members.map(id => state.people[id]);
    const a = g.prep.alloc;
    members.forEach(m => {
      if (m.flags.burnout > 0) {
        m.flags.burnout--;
        m.fatigue = KP.clamp(m.fatigue - OW.benchRecovery, 0, 100);
        return;
      }
      // rehearsal trains toward allocation, at a discount vs targeted training
      [['vocals', a.vocals], ['dance', a.dance], ['rap', a.rap]].forEach(([d, share]) => {
        const t = m.talents[d];
        const trueCeil = m.flags['ceil_' + d] != null ? m.flags['ceil_' + d] : t.ceilHi;
        const g0 = 0.55 * (share / 100) * t.growth * (0.7 + m.personality.workEthic / 200);
        t.cur = Math.min(trueCeil, t.cur + g0);
      });
      m.mediaExp += a.media / 100 * 2.5;
      m.liveExp += 1.2;                     // stage rehearsals are live reps
      m.fatigue = KP.clamp(m.fatigue + KP.C.DEBUT.prepFatigue, 0, 100);
      // pushing a gassed member through rehearsal is a gamble (v0.4.2)
      if (m.fatigue >= OW.threshold && rng.chance(OW.chance)) {
        notes.push(KP.overworkIncident(state, m, 'rehearsal', rng));
      }
    });
    g.prep.progress++;
    const weeksLeft = g.prep.scheduledWeek - state.week;
    if (weeksLeft === 2) notes.push({ kind: 'debut', text: g.name + ': two weeks out. Teasers are cut, the stage is booked, and everyone is sleeping badly.' });
    return notes;
  };

  // The incident: medical staff pull her from the schedule. Shared by
  // rehearsal (here) and promotion (sim.js).
  KP.overworkIncident = function (state, m, where, rng) {
    const OW = KP.C.COMEBACK.OVERWORK;
    m.flags.burnout = rng.int(OW.weeksMin, OW.weeksMax);
    m.morale = KP.clamp(m.morale - OW.moraleHit, 0, 100);
    m.history.push({ week: state.week, text: 'Pulled from the schedule by medical staff — exhaustion.' });
    return { kind: 'health', urgent: true,
      text: KP.displayName(m) + ' was pulled from ' + where + ' by medical staff this week. The official word is “scheduled rest.” The honest word is exhaustion, and everyone in the building knows whose calendar caused it.' };
  };

  // The next group whose locked release is due OR overdue, if any.
  // (prep is cleared on resolution, so it can never double-fire.)
  KP.debutDue = function (state) {
    return KP.groups(state).find(g => g.prep && state.week >= g.prep.scheduledWeek) || null;
  };

  KP.resolveDebut = function (state, rng, group) {
    const D = KP.C.DEBUT;
    const g = group || KP.debutDue(state) || KP.groups(state)[0];
    const demo = (g.demos || state.demos || []).find(s => s.id === g.prep.songId);
    const concept = KP.conceptById(g.prep.conceptId);
    const members = g.members.map(id => state.people[id]);

    // --- performance quality: skills vs the song's demands, prep, fatigue
    const avg = d => members.reduce((s, m) => s + m.talents[d].cur, 0) / members.length;
    const skillVsDemand =
      0.4 * Math.min(1.15, avg('vocals') / Math.max(30, demo.vocalDemand)) +
      0.4 * Math.min(1.15, avg('dance') / Math.max(30, demo.choreoPotential)) +
      0.2 * Math.min(1.15, Math.max.apply(null, members.map(m => m.talents.rap.cur)) / Math.max(25, demo.rapDemand));
    const liveRel = members.reduce((s, m) => s + KP.derived(m).liveReliability, 0) / members.length;
    const fatigueAvg = members.reduce((s, m) => s + m.fatigue, 0) / members.length;
    const prepBonus = Math.min(10, (g.prep.progress || 0) * 1.1);
    // members benched by medical staff (v0.4.2) cost the stage directly
    const benched = members.filter(m => m.flags.burnout > 0);
    const performance = KP.clamp(
      skillVsDemand * 52 + liveRel * 0.28 + prepBonus - Math.max(0, fatigueAvg - 60) * 0.3
      - benched.length * KP.C.COMEBACK.OVERWORK.perfPenalty, 5, 100);

    // --- group concept fit + chemistry
    const fits = members.map(m => KP.conceptFit(m, concept));
    const groupFit = fits.reduce((s, v) => s + v, 0) / fits.length;
    const chem = KP.groupChemistry(state, members);

    // --- breakout: the public picks whom to watch (center gets exposure,
    //     not destiny — and it watches whom it already knows)
    const isSolo = members.length === 1;
    const pulls = members.map(m => {
      let pull = KP.derived(m).centerPull * 0.7 + KP.conceptFit(m, concept) * 0.3;
      if (m.id === g.roles.center) pull += D.centerBreakoutBonus;
      pull += (m.hype || 0) * KP.C.HYPE.breakoutPullFactor;
      pull += rng.normal(0, D.breakoutNoiseSd);
      return { m, pull };
    }).sort((a, b) => b.pull - a.pull);
    const breakout = pulls[0].m;

    // --- public reception: material + performance + fit + promo + luck,
    //     for comebacks the fanbase already earned, for debuts any hype
    //     the members walk in with — and, rarely, the defining clip
    const isDebut = !g.debuted;
    const luck = rng.normal(0, D.luckSd * (isSolo ? KP.C.SOLO.luckMult : 1));
    const popLift = isDebut ? 0 : ((g.popularity || 0) - 50) * KP.C.COMEBACK.popFactor;
    const hypeSum = members.reduce((s, m) => s + (m.hype || 0), 0);
    const hypeLift = isSolo
      ? Math.min(KP.C.HYPE.soloReceptionMax, hypeSum * KP.C.HYPE.soloReceptionFactor)
      : Math.min(KP.C.HYPE.cashReceptionMax, hypeSum * KP.C.HYPE.cashReceptionFactor);
    const soloEdge = isSolo ? (members[0].talents.charisma.cur - 50) * KP.C.SOLO.charismaFactor : 0;
    let spark = 0;
    if (demo.hook >= D.spark.hookMin && pulls[0].pull >= D.spark.pullMin && rng.chance(D.spark.chance)) {
      spark = D.spark.boostMin + rng.next() * (D.spark.boostMax - D.spark.boostMin);
    }
    // a crowded release week splits the public's attention (v0.4.0)
    const crowd = KP.crowdPenalty(state);
    // memory reads the release before the public does (v0.6.0):
    // long-awaited returns land warmer, pedigree cuts both ways
    const memRead = KP.memoryReadsRelease(state, g, isDebut, avg('vocals'));
    const prevReception = (g.releases && g.releases.length)
      ? g.releases[g.releases.length - 1].reception : null;
    const reception = KP.clamp(Math.round(
      demo.hook * 0.3 + demo.trendFit * 0.13 + performance * 0.3 +
      groupFit * 0.14 + (chem - 50) * 0.12 + D.promoBoost[g.prep.promo] +
      popLift + hypeLift + soloEdge + spark + luck - crowd + memRead.mod), 1, 100);
    const band = D.receptionBands.find(b => reception >= b.min);
    const centerOvershadowed = !isSolo && breakout.id !== g.roles.center &&
      pulls.find(x => x.m.id === g.roles.center).pull < pulls[0].pull - 8;

    // --- consequences
    members.forEach(m => {
      m.status = 'idol';
      m.liveExp += 10; m.mediaExp += 6;
      m.history.push({ week: state.week, text: (isDebut ? 'Debuted with ' : 'Comeback with ') + g.name + ' — “' + demo.title + '”.' });
    });
    breakout.personality.confidence = KP.clamp(breakout.personality.confidence + 8, 0, 100);
    breakout.history.push({ week: state.week, text: 'Named the breakout of the ' + (isDebut ? 'debut' : 'comeback') + ' by nearly every recap.' });

    // memory takes notes (v0.6.0): breakouts and virals accumulate into
    // reputations; sensations and stumbles become stories
    const narrativeNotes = [];
    const push = n => { if (n) narrativeNotes.push(n); };
    push(KP.recordBreakout(state, breakout));
    if (spark > 0) push(KP.recordViral(state, breakout));
    if (reception >= 75) push(KP.recordEvidence(state, 'monsterRookies', 'group', g.id));
    if (!isDebut && prevReception != null && reception <= prevReception - KP.C.MEMORY.underperformGap) {
      push(KP.recordEvidence(state, 'underperformed', 'group', g.id));
    }

    // trust + objective resolution, by what the executive actually asked
    // for — an objective only resolves if it concerns THIS group
    const objForThis = !state.objective.groupId || state.objective.groupId === g.id;
    let trustDelta;
    if (isDebut) {
      trustDelta = KP.C.EXEC.debutTrustDelta[band.key];
      if (state.objective.type === 'debutGirlGroup' && state.objective.status === 'open') {
        state.objective.status = reception >= 50 ? 'met' : 'metPoorly';
      }
    } else {
      trustDelta = KP.C.COMEBACK.comebackTrustDelta[band.key];
      if (state.objective.type === 'comeback' && state.objective.status === 'open' && objForThis) {
        state.objective.status = reception >= state.objective.targetReception ? 'met' : 'metPoorly';
        if (state.objective.status === 'metPoorly') trustDelta -= 3;
      }
    }
    state.trust = KP.clamp(state.trust + trustDelta, KP.C.EXEC.trustFloor, KP.C.EXEC.trustCap);

    // company reputation drifts toward what actually happened
    const rep = state.company.reputation;
    if (reception >= 64) rep.girlGroup = KP.clamp((rep.girlGroup || 40) + (isDebut ? 12 : 6), 0, 100);
    if (avg('vocals') >= 62) rep.vocal = KP.clamp((rep.vocal || 60) + 4, 0, 100);
    if (breakout && reception >= 64) rep.starMaker = KP.clamp((rep.starMaker || 35) + (isDebut ? 8 : 4), 0, 100);

    // revenue: a hit pays, an established fanbase buys albums, and a
    // bigger record multiplies both
    const format = D.FORMATS.find(f => f.id === (g.prep.format || 'single')) || D.FORMATS[0];
    const revenue = Math.round((Math.max(0, reception - 30) * 1.6 + (isDebut ? 0 : (g.popularity || 0) * 0.4)) * format.revenueMult);
    state.budget += revenue;

    // popularity: the debut founds the fanbase (hype converts into it);
    // comebacks compound or cool it
    g.popularity = isDebut
      ? KP.clamp(Math.round(15 + reception * 0.75 + hypeSum * KP.C.HYPE.cashPopFactor), 0, 100)
      : KP.clamp(Math.round(g.popularity * 0.55 + reception * 0.55), 0, 100);
    // hype is spent — it became the act
    members.forEach(m => { m.hype = 0; });

    // ONE truth per chart (v0.4.4 / v0.5.0): peaks are actual ranks —
    // opening rank here, then tracked live by chartStamp for as long as
    // the entry charts. The scene is the lane; the national board is the
    // whole industry, titans included, and it is harder by construction.
    const score = reception + (g.popularity || 0) * 0.2;
    const peak = 1 + KP.chartPositions(state).filter(e => e.score > score).length;
    const natPeak = 1 + KP.nationalPositions(state).filter(e => e.score > score).length;
    const weeksOn = 1;

    if (isDebut) { g.debutWeek = state.week; }
    g.debuted = true;
    g.lastReleaseWeek = state.week;
    g.promoUntil = state.week + KP.C.COMEBACK.promoWeeks;
    g.promoFocus = g.prep.focus || 'musicShows';
    const label = isDebut ? band.label : KP.C.COMEBACK.bandLabels[band.key];
    g.results = {
      week: state.week,
      isDebut,
      songTitle: demo.title,
      conceptId: concept.id,
      format: format.id,
      performance: Math.round(performance),
      reception, receptionBand: band.key, receptionLabel: label,
      breakoutId: breakout.id,
      centerOvershadowed,
      chem, groupFit: Math.round(groupFit),
      trustDelta, revenue,
      chartPeak: peak, chartWeeks: weeksOn,
      nationalPeak: natPeak, nationalWeeks: weeksOn,
      crowd: Math.round(crowd),
      benched: benched.map(m => m.id),
      execLine: execDebutLine(band.key, centerOvershadowed, state),
      publicNotes: publicNotes(state, band.key, breakout, centerOvershadowed, demo, rng, spark > 0, isDebut, crowd, benched, fatigueAvg, natPeak)
        .concat(memRead.notes),
    };
    g.results.narrativeNotes = narrativeNotes;   // sim forwards these to the inbox
    g.releases = g.releases || [];
    g.releases.push({
      week: state.week, songTitle: demo.title, conceptId: concept.id,
      reception, receptionBand: band.key, chartPeak: peak, chartWeeks: weeksOn,
      nationalPeak: natPeak, nationalWeeks: weeksOn,
      isDebut, format: format.id, tracks: format.tracks,
    });
    // the release enters BOTH boards: the scene, and the national chart
    // the whole industry fights over
    KP.chartEnter(state, {
      title: demo.title, act: g.name, company: state.company.short,
      isPlayer: true, groupId: g.id,
      score, entered: state.week,
    });
    KP.nationalEnter(state, {
      title: demo.title, act: g.name, company: state.company.short,
      isPlayer: true, groupId: g.id,
      score, entered: state.week,
    });
    g.prep = null;
    g.demos = null;       // the producers bring fresh demos for the next cycle
    if (state.demos) state.demos = null;   // pre-multigroup compatibility
    return g.results;
  };

  function execDebutLine(bandKey, overshadowed, state) {
    switch (bandKey) {
      case 'sensation': return '“I asked for a group people remember. Apparently they will. Enjoy tonight — targets go up tomorrow.”';
      case 'strong': return '“A strong start. The board is smiling, which means they are already asking about the next one.”';
      case 'solid': return '“Respectable. Not what I dreamed about, but nothing I have to explain to anyone. Build on it.”';
      case 'quiet': return '“I have seen quieter debuts recover. I have also seen careers end this way. Show me a plan.”';
      default: return '“We will speak on Monday. Bring answers, not reasons.”';
    }
  }

  function publicNotes(state, bandKey, breakout, overshadowed, demo, rng, sparked, isDebut, crowd, benched, fatigueAvg, natPeak) {
    const notes = [];
    const bn = KP.displayName(breakout);
    if (natPeak != null && natPeak <= 10) notes.push('“' + demo.title + '” opened inside the national top ten — the big board, the one with the titans on it. Frame this week.');
    if (sparked) notes.push('A fancam of ' + bn + ' is circulating far beyond the usual audience. The clip is doing the promotion’s job for free.');
    if ((crowd || 0) >= 5) notes.push('The release landed in a crowded week — half the industry picked the same Monday. Louder rooms have drowned better songs.');
    (benched || []).forEach(m => notes.push(KP.displayName(m) + ' sat out part of the schedule on medical advice. The formations papered over the gap; the fans counted heads anyway.'));
    if ((fatigueAvg || 0) >= 75 && !(benched || []).length) notes.push('The stages looked tired by the second week — clean, professional, and running on will. The cameras noticed.');
    if (bandKey === 'sensation') notes.push('One performance clip is everywhere. Marketing would like to know what we’re doing next while everyone is still paying attention.');
    if (bandKey === 'strong') notes.push('“' + demo.title + '” is holding on the charts past week one — the good sign.');
    if (bandKey === 'solid') notes.push(isDebut ? 'Reviews are kind; numbers are cautious. The second single will decide the story.' : 'Reviews are kind; numbers are steady. The fanbase showed up — growth is the open question.');
    if (bandKey === 'quiet') notes.push(isDebut ? 'The showcase was clean; the internet shrugged. Staff believe the material, not the members, is the question.' : 'The comeback stage was clean; the wider internet moved on quickly. The core fans stayed.');
    if (bandKey === 'miss') notes.push(isDebut ? 'The debut came and went. What survives from it is up to us now.' : 'The comeback came and went. Momentum took the hit; the group did not — yet.');
    notes.push(bn + ' dominated teaser engagement and post-stage searches.');
    if (overshadowed) notes.push('Fans are openly asking why ' + bn + ' is not the center. That conversation is not going away on its own.');
    return notes;
  }
})(typeof window !== 'undefined' ? window : globalThis);
