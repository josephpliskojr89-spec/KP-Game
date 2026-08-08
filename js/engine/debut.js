/* Debut planning and resolution. The company plans; the public decides.
   Reception = performance + material + concept fit + promotion + luck.
   The breakout member is chosen by the public, not the org chart. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // Schedule the debut: lock song, concept, prep allocation, promo, week.
  KP.planDebut = function (state, plan) {
    const D = KP.C.DEBUT;
    const g = state.group;
    if (!g) return { ok: false, reason: 'No group to debut.' };
    if (g.debuted) return { ok: false, reason: 'They have already debuted.' };
    const demo = (state.demos || []).find(s => s.id === plan.songId);
    if (!demo) return { ok: false, reason: 'Choose a title track.' };
    if (plan.week < state.week + D.prepWeeksMin) {
      return { ok: false, reason: 'Production needs at least ' + D.prepWeeksMin + ' weeks of runway.' };
    }
    if (plan.week > state.objective.deadlineWeek) {
      return { ok: false, reason: 'That date is past the executive deadline. Do not test her.' };
    }
    const alloc = plan.alloc || { vocals: 25, dance: 25, rap: 25, media: 25 };
    const total = alloc.vocals + alloc.dance + alloc.rap + alloc.media;
    if (Math.round(total) !== 100) return { ok: false, reason: 'Rehearsal allocation must total 100%.' };
    const promoCost = D.promoCost[plan.promo || 'standard'] + KP.C.ECON.productionCost;
    if (state.budget < promoCost) return { ok: false, reason: 'Budget cannot cover production and this promotion level.' };
    state.budget -= promoCost;

    g.prep = {
      songId: demo.id,
      conceptId: plan.conceptId || demo.conceptId,
      promo: plan.promo || 'standard',
      alloc,
      scheduledWeek: plan.week,
      progress: 0,
    };
    return { ok: true };
  };

  // Weekly debut-prep: focused rehearsal replaces individual training focus.
  KP.prepWeek = function (state, rng) {
    const g = state.group;
    if (!g || !g.prep || g.debuted) return [];
    const notes = [];
    const members = g.members.map(id => state.people[id]);
    const a = g.prep.alloc;
    members.forEach(m => {
      // rehearsal trains toward allocation, at a discount vs targeted training
      [['vocals', a.vocals], ['dance', a.dance], ['rap', a.rap]].forEach(([d, share]) => {
        const t = m.talents[d];
        const trueCeil = m.flags['ceil_' + d] != null ? m.flags['ceil_' + d] : t.ceilHi;
        const g0 = 0.55 * (share / 100) * t.growth * (0.7 + m.personality.workEthic / 200);
        t.cur = Math.min(trueCeil, t.cur + g0);
      });
      m.mediaExp += a.media / 100 * 2.5;
      m.liveExp += 1.2;                     // stage rehearsals are live reps
      m.fatigue = KP.clamp(m.fatigue + 9, 0, 100);
    });
    g.prep.progress++;
    const weeksLeft = g.prep.scheduledWeek - state.week;
    if (weeksLeft === 2) notes.push({ kind: 'debut', text: 'Two weeks out. Teasers are cut, the showcase stage is booked, and everyone is sleeping badly.' });
    return notes;
  };

  // Resolve the debut. Self-healing predicate: fires when due OR overdue.
  KP.debutDue = function (state) {
    const g = state.group;
    return !!(g && g.prep && !g.debuted && state.week >= g.prep.scheduledWeek);
  };

  KP.resolveDebut = function (state, rng) {
    const D = KP.C.DEBUT;
    const g = state.group;
    const demo = state.demos.find(s => s.id === g.prep.songId);
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
    const performance = KP.clamp(
      skillVsDemand * 52 + liveRel * 0.28 + prepBonus - Math.max(0, fatigueAvg - 60) * 0.3, 5, 100);

    // --- group concept fit + chemistry
    const fits = members.map(m => KP.conceptFit(m, concept));
    const groupFit = fits.reduce((s, v) => s + v, 0) / fits.length;
    const chem = KP.groupChemistry(state, members);

    // --- public reception: material + performance + fit + promo + luck
    const luck = rng.normal(0, D.luckSd);
    const reception = KP.clamp(Math.round(
      demo.hook * 0.3 + demo.trendFit * 0.13 + performance * 0.3 +
      groupFit * 0.14 + (chem - 50) * 0.12 + D.promoBoost[g.prep.promo] + luck), 1, 100);
    const band = D.receptionBands.find(b => reception >= b.min);

    // --- breakout: the public picks whom to watch (center gets exposure, not destiny)
    const pulls = members.map(m => {
      let pull = KP.derived(m).centerPull * 0.7 + KP.conceptFit(m, concept) * 0.3;
      if (m.id === g.roles.center) pull += D.centerBreakoutBonus;
      pull += rng.normal(0, D.breakoutNoiseSd);
      return { m, pull };
    }).sort((a, b) => b.pull - a.pull);
    const breakout = pulls[0].m;
    const centerOvershadowed = breakout.id !== g.roles.center &&
      pulls.find(x => x.m.id === g.roles.center).pull < pulls[0].pull - 8;

    // --- consequences
    members.forEach(m => {
      m.status = 'idol';
      m.liveExp += 10; m.mediaExp += 6;
      m.history.push({ week: state.week, text: 'Debuted with ' + g.name + ' — “' + demo.title + '”.' });
    });
    breakout.personality.confidence = KP.clamp(breakout.personality.confidence + 8, 0, 100);
    breakout.history.push({ week: state.week, text: 'Named the breakout of the debut by nearly every recap.' });

    const trustDelta = KP.C.EXEC.debutTrustDelta[band.key];
    state.trust = KP.clamp(state.trust + trustDelta, KP.C.EXEC.trustFloor, KP.C.EXEC.trustCap);
    state.objective.status = reception >= 50 ? 'met' : 'metPoorly';

    // company reputation drifts toward what actually happened
    const rep = state.company.reputation;
    if (reception >= 64) rep.girlGroup = KP.clamp((rep.girlGroup || 40) + 12, 0, 100);
    if (avg('vocals') >= 62) rep.vocal = KP.clamp((rep.vocal || 60) + 4, 0, 100);
    if (breakout && reception >= 64) rep.starMaker = KP.clamp((rep.starMaker || 35) + 8, 0, 100);

    // revenue: a hit pays
    const revenue = Math.round(Math.max(0, reception - 30) * 1.6);
    state.budget += revenue;

    g.debuted = true;
    g.debutWeek = state.week;
    g.results = {
      week: state.week,
      songTitle: demo.title,
      conceptId: concept.id,
      performance: Math.round(performance),
      reception, receptionBand: band.key, receptionLabel: band.label,
      breakoutId: breakout.id,
      centerOvershadowed,
      chem, groupFit: Math.round(groupFit),
      trustDelta, revenue,
      execLine: execDebutLine(band.key, centerOvershadowed, state),
      publicNotes: publicNotes(state, band.key, breakout, centerOvershadowed, demo, rng),
    };
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

  function publicNotes(state, bandKey, breakout, overshadowed, demo, rng) {
    const notes = [];
    const bn = breakout.name.display;
    if (bandKey === 'sensation') notes.push('One performance clip is everywhere. Marketing would like to know what we’re doing next while everyone is still paying attention.');
    if (bandKey === 'strong') notes.push('“' + demo.title + '” is holding on the charts past week one — the good sign.');
    if (bandKey === 'solid') notes.push('Reviews are kind; numbers are cautious. The second single will decide the story.');
    if (bandKey === 'quiet') notes.push('The showcase was clean; the internet shrugged. Staff believe the material, not the members, is the question.');
    if (bandKey === 'miss') notes.push('The debut came and went. What survives from it is up to us now.');
    notes.push(bn + ' dominated teaser engagement and post-stage searches.');
    if (overshadowed) notes.push('Fans are openly asking why ' + bn + ' is not the center. That conversation is not going away on its own.');
    return notes;
  }
})(typeof window !== 'undefined' ? window : globalThis);
