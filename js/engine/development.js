/* Weekly development resolution. Gains are non-linear and individual:
   growth rate, work ethic, coachability, fatigue and ceiling proximity all
   matter. Training rooms cannot teach everything — showcases grant live
   experience, which feeds derived qualities training cannot buy. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function gainFor(person, domain, rng, focusCount, driveMult) {
    const T = KP.C.TRAIN;
    const t = person.talents[domain];
    const per = person.personality;
    const intensity = person.training.intensity || 'standard';
    let g = T.baseGain * t.growth * T.gainMult[intensity] * (driveMult || 1);
    if (focusCount > 1) g *= T.secondFocusMult;
    g *= 0.6 + (per.workEthic / 100) * 0.55;
    g *= 0.7 + (per.coachability / 100) * 0.5;
    // time takes its share (v0.9.32): past the line, the explosive
    // gains are behind her — the growth curve senesces, never to zero
    if (KP.ageGrowthMult) g *= KP.ageGrowthMult(person);
    // the table (v0.9.38): a training guarantee bought at signing is
    // delivered by the coaches, not just the contract
    if (person.flags && person.flags.trainClause && person.status === 'trainee') {
      g *= KP.C.TABLE.trainGrowth;
    }
    // fatigue drag
    if (person.fatigue > T.fatigueSoftCap) {
      g *= Math.max(0.2, 1 - (person.fatigue - T.fatigueSoftCap) / 40);
    }
    // ceiling crawl: the last steps are the hardest
    const trueCeil = person.flags['ceil_' + domain] != null
      ? person.flags['ceil_' + domain] : (t.ceilLo + t.ceilHi) / 2;
    const room = trueCeil - t.cur;
    if (room <= 0) return 0;
    if (room < 6) g *= T.ceilingCrawl;
    // individual weekly noise
    g *= 0.6 + rng.next() * 0.8;
    return Math.min(g, room);
  }

  // Resolve one week of training for one person. Returns report strings.
  KP.developWeek = function (state, person, rng) {
    const T = KP.C.TRAIN;
    const notes = [];
    const intensity = person.training.intensity || 'standard';

    // resolve each true ceiling once, lazily, so the cone collapses to a real
    // (still hidden) destiny the first time development touches the domain
    KP.C.TALENTS.forEach(d => {
      if (person.flags['ceil_' + d] == null) {
        const t = person.talents[d];
        person.flags['ceil_' + d] = Math.round(t.ceilLo + rng.next() * (t.ceilHi - t.ceilLo));
      }
    });

    // the project (v0.2.5): an open spot makes the free trainees push —
    // they train harder, and if the project declared what it needs, they
    // fill their own spare focus with it
    const PR = KP.C.PROJECT;
    const isHopeful = state.project && person.status === 'trainee' &&
      !state.project.locked.includes(person.id) && !KP.groupOf(state, person.id);
    const isLocked = state.project && state.project.locked.includes(person.id);
    let focus = (person.training.focus || []).slice(0, 2);
    if (isHopeful && state.project.seeking.length) {
      state.project.seeking.forEach(d => {
        if (focus.length < 2 && !focus.includes(d)) focus.push(d);
      });
    }
    const driveMult = isHopeful ? PR.driveMult : 1;

    // gains on focused domains
    focus.forEach(domain => {
      const g = gainFor(person, domain, rng, focus.length, driveMult);
      if (g > 0) person.talents[domain].cur = Math.min(100, person.talents[domain].cur + g);
    });

    // fatigue & morale
    person.fatigue = KP.clamp(person.fatigue + T.fatigueLoad[intensity], 0, 100);
    if (isHopeful && intensity !== 'rest') person.fatigue = KP.clamp(person.fatigue + PR.driveFatigue, 0, 100);
    if (isLocked) person.morale = KP.clamp(person.morale + PR.lockedMoraleDrip, 0, 100);
    if (intensity === 'rest') person.morale = KP.clamp(person.morale + T.moraleRestBonus, 0, 100);
    if (intensity === 'heavy') person.morale = KP.clamp(person.morale - 1.5, 0, 100);

    // breakthrough / plateau — development redirects, stalls, reopens
    if (focus.length && rng.chance(T.breakthroughChance * (0.5 + person.personality.resilience / 150))) {
      const d = rng.pick(focus);
      const cap = person.flags['ceil_' + d] != null ? person.flags['ceil_' + d] : 100;
      person.talents[d].cur = Math.min(cap, person.talents[d].cur + 2.5);
      person.personality.confidence = KP.clamp(person.personality.confidence + T.confidenceFromBreakthrough, 0, 100);
      notes.push({ kind: 'breakthrough', text: KP.displayName(person) + ' had a breakthrough week in ' + KP.C.TALENT_LABELS[d].toLowerCase() + '. Something clicked — you could see it from the hallway.' });
    } else if (focus.length && rng.chance(T.plateauChance)) {
      const d = rng.pick(focus);
      notes.push({ kind: 'plateau', text: KP.fillPro(KP.displayName(person) + ' has plateaued in ' + KP.C.TALENT_LABELS[d].toLowerCase() + '. The coaches suggest changing {pos} focus for a few weeks.', person) });
    }

    // overtraining consequences
    if (person.fatigue > T.fatigueHardCap && rng.chance(T.burnoutChance)) {
      person.flags.burnout = (person.flags.burnout || 0) + 4; // weeks of forced light load
      person.morale = KP.clamp(person.morale - 12, 0, 100);
      notes.push({ kind: 'health', urgent: true, text: KP.displayName(person) + ' hit a wall. Medical staff have ordered reduced load for a month. This was preventable.' });
    } else if (person.fatigue > T.fatigueSoftCap && intensity === 'heavy' && rng.chance(T.injuryChance)) {
      person.flags.burnout = (person.flags.burnout || 0) + 2;
      notes.push({ kind: 'health', urgent: true, text: KP.displayName(person) + ' picked up a minor injury in practice. Two weeks of careful scheduling ahead.' });
    }
    if (KP.onBreak(person)) {
      person.flags.burnout--;
      person.training.intensity = 'light';
    }

    return notes;
  };

  // Internal showcase: live reps that the practice room can't provide.
  KP.showcaseWeek = function (state, roster, rng) {
    const notes = [];
    roster.forEach(p => {
      p.liveExp += KP.C.TRAIN.liveExpGainShowcase * (0.7 + rng.next() * 0.6);
      p.observations = Math.min(KP.C.SCOUT.maxObservations, (p.observations || 0) + 1);
    });
    // occasionally a showcase reveals someone
    const sorted = roster.slice().sort((a, b) =>
      (b.talents.charisma.cur + b.personality.confidence) - (a.talents.charisma.cur + a.personality.confidence));
    if (sorted.length && rng.chance(0.5)) {
      const star = sorted[0];
      star.personality.confidence = KP.clamp(star.personality.confidence + 3, 0, 100);
      notes.push({ kind: 'showcase', text: 'Monthly showcase: staff notes are in. ' + KP.displayName(star) + ' drew the most attention on stage this time.' });
    } else {
      notes.push({ kind: 'showcase', text: 'Monthly showcase held. Evaluators updated their reads on the trainee pool.' });
    }
    return notes;
  };
})(typeof window !== 'undefined' ? window : globalThis);
