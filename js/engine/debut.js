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
    if (g.retiredWeek || !g.members.length) {
      return { ok: false, reason: 'That chapter is closed — there is nobody left to record it.' };
    }
    if (g.prep) return { ok: false, reason: 'A release is already locked.' };
    if (g.tour) return { ok: false, reason: 'They are on tour. The studio can wait for the road to end.' };
    if (state.week <= (g.tourRestUntil || 0)) {
      return { ok: false, reason: 'Post-tour rest is contractual. The calendar reopens ' + KP.weekLabel((g.tourRestUntil || 0) + 1).text + '.' };
    }
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
      return { ok: false, reason: KP.fillPro('That date is past the executive deadline. Do not test {her}.', KP.execP(state)) };
    }
    const alloc = plan.alloc || { vocals: 25, dance: 25, rap: 25, media: 25 };
    const total = alloc.vocals + alloc.dance + alloc.rap + alloc.media;
    if (Math.round(total) !== 100) return { ok: false, reason: 'Rehearsal allocation must total 100%.' };

    // the rollout plan (v0.6.3): 4 promo weeks, 2 slots each, every slot
    // a real choice with a real bill
    const R = KP.C.ROLLOUT;
    const rollout = plan.rollout || R.DEFAULT.map(w => w.slice());
    if (!Array.isArray(rollout) || rollout.length !== R.weeks) {
      return { ok: false, reason: 'The rollout covers ' + R.weeks + ' promotion weeks. Plan all of them.' };
    }
    let rolloutCost = 0;
    for (const wk of rollout) {
      if (!Array.isArray(wk) || wk.length > R.slotsPerWeek) {
        return { ok: false, reason: 'Two bookings a week is the ceiling. They are humans, not content.' };
      }
      for (const a of wk) {
        if (!R.ACTIVITIES[a]) return { ok: false, reason: 'Nobody on staff knows how to book “' + a + '”.' };
        rolloutCost += R.ACTIVITIES[a].cost;
      }
    }

    // genre-bending (v0.9.6): a fusion brief opens the second option —
    // pick the two genres to collide. Validated hard: the gamble is the
    // player's, the spelling is the promoter's.
    let mash = null;
    if (plan.mash) {
      const FU = KP.C.FUSION;
      const briefed = (plan.conceptId || demo.conceptId) === 'fusion' || g.concept === 'fusion';
      if (!briefed) return { ok: false, reason: 'Genre mashes come from the genre-bending brief. Set the direction first.' };
      if (!Array.isArray(plan.mash) || plan.mash.length !== 2 ||
          plan.mash[0] === plan.mash[1] ||
          !plan.mash.every(x => FU.GENRES.includes(x))) {
        return { ok: false, reason: 'A mash is two DIFFERENT genres the producers have actually heard of.' };
      }
      mash = plan.mash.slice();
    }

    const cost = D.promoCost[plan.promo || 'standard'] + format.cost + rolloutCost;
    if (state.budget < cost) return { ok: false, reason: 'Budget cannot cover the record, the marketing AND this rollout. Trim something.' };
    state.budget -= cost;

    g.prep = {
      songId: demo.id,
      conceptId: plan.conceptId || demo.conceptId,
      promo: plan.promo || 'standard',
      format: format.id,
      rollout,
      alloc,
      scheduledWeek: plan.week,
      progress: 0,
      mash,
    };
    // the tracklist (v0.7.5): the record gets its full run of songs at
    // lock — an action-time draw. Open slots stay assignable until the
    // release week (KP.assignTrack).
    {
      const trng = KP.rngFor(state);
      g.prep.tracks = KP.buildTracklist(state, trng, g, demo, format);
      state.rngState = trng.state();
    }
    // the return (v0.9.12): locking a record ends a declared hiatus —
    // the announcement IS the event, the release settles the bet
    if (g.hiatus && KP.hiatusReturnLock) KP.hiatusReturnLock(state, g);
    // locking onto an announced rival week is a CHOICE — the challenge
    // half of "challenge or dodge" (v0.6.4). The desk assumes intent.
    const foes = KP.announcedAt(state, plan.week)
      .filter(x => (x.act.popularity || 0) >= KP.C.WAR.battleMinPop);
    let warning = null;
    if (foes.length) {
      g.prep.clash = { actId: foes[0].act.id, company: foes[0].rival.short,
        actName: foes[0].act.name, week: plan.week, resolved: 'hold', chosen: true };
      warning = foes[0].act.name + ' has that week announced. The desk assumes we are doing this on purpose — head-to-head it is.';
    }
    // locking over a worn roster is allowed — and the staff say so (v0.4.2)
    const members = g.members.map(id => state.people[id]);
    const fatigueAvg = members.reduce((s, m) => s + m.fatigue, 0) / members.length;
    if (fatigueAvg >= KP.C.COMEBACK.OVERWORK.lockWarnAt) {
      warning = (warning ? warning + ' And ' : 'The staff flag the schedule: ') +
        'the members are still worn from the last cycle. This one will cost them more than it should.';
    }
    // a member with a second job (v0.9.11) means two calendars now claim
    // the same weeks — the staff say so at the lock, not after
    const moonlighter = KP.activeGigs ? members.find(m => KP.gigOf(state, m.id) &&
      KP.gigOf(state, m.id).kind !== 'ost') : null;
    if (moonlighter) {
      const gig = KP.gigOf(state, moonlighter.id);
      warning = (warning ? warning + ' And ' : 'The staff flag the schedule: ') +
        KP.fillPro(KP.displayName(moonlighter) + ' still tapes ' + gig.show +
          ' every week — this cycle will stretch {her}, and productions notice stretched.', moonlighter);
    }
    return warning ? { ok: true, warning } : { ok: true };
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
      // the crunch (v0.6.9): full load only in the final weeks — before
      // that it is recording and fittings, not twelve-hour practice
      const weeksOut = g.prep.scheduledWeek - state.week;
      const load = weeksOut <= KP.C.DEBUT.crunchWeeks
        ? KP.C.DEBUT.prepFatigue
        : KP.C.DEBUT.prepFatigue * KP.C.DEBUT.prepFatigueEase;
      m.fatigue = KP.clamp(m.fatigue + load, 0, 100);
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
    // the internet notices a missing member (v0.6.2)
    if (rng.chance(KP.C.DISCOURSE.benchedChance)) {
      const mg = KP.groupOf(state, m.id);
      KP.igniteDiscourse(state, rng, 'benched', 'idol', m.id, mg && mg.id);
    }
    return { kind: 'health', urgent: true,
      text: KP.displayName(m) + ' was pulled from ' + where + ' by medical staff this week. The official word is “scheduled rest.” The honest word is exhaustion, and everyone in the building knows whose calendar caused it.' };
  };

  // Weekly promotion under the rollout plan (v0.6.3): each promo week
  // runs its booked activities — costs paid at lock, fatigue paid now,
  // and the stages occasionally make the stories the feed lives for.
  KP.rolloutWeek = function (state, g, rng) {
    const R = KP.C.ROLLOUT, CB = KP.C.COMEBACK;
    const notes = [];
    const idx = KP.clamp(state.week - (g.lastReleaseWeek || 0) - 1, 0, R.weeks - 1);
    const plan = (g.rollout && g.rollout[idx]) || ['popWave'];
    const members = g.members.map(id => state.people[id]).filter(p => p && p.status === 'idol');
    const soloMult = g.type === 'solo' ? KP.C.SOLO.promoFatigueMult : 1;

    if (!plan.length) {
      // an empty week is a breather by design
      members.forEach(m => {
        if (!(m.flags.burnout > 0)) m.fatigue = KP.clamp(m.fatigue - R.emptyWeekRecovery, 0, 100);
      });
    } else if (plan.length === 1) {
      // a deliberately light week half-breathes (v0.6.9) — pacing the
      // rollout is a real tool, not just an empty slot
      members.forEach(m => {
        if (!(m.flags.burnout > 0)) m.fatigue = KP.clamp(m.fatigue - R.emptyWeekRecovery * 0.5, 0, 100);
      });
    }
    // a trusted leader absorbs promo grind for the room (v0.8.3):
    // standing gates what morale can't buy — followership under load
    const leader = state.people[g.roles && g.roles.leader];
    const leaderEases = leader && (leader.personality.leadership || 0) >= 55 &&
      KP.standingScore(state, leader) >= KP.C.SCAR.leaderEaseStanding;
    plan.forEach(actId => {
      const A = R.ACTIVITIES[actId];
      if (!A) return;
      members.forEach(m => {
        if (m.flags.burnout > 0) return;   // benched: she rests, whatever the calendar says
        const softened = (m.fatigue >= CB.promoSoftCap && A.fatigue > 0) ? CB.promoSoftMult : 1;
        const eased = (leaderEases && m.id !== leader.id && A.fatigue > 0) ? KP.C.SCAR.leaderEase : 0;
        m.fatigue = KP.clamp(m.fatigue + A.fatigue * soloMult * softened - eased, 0, 100);
        m.liveExp += A.liveExp;
        m.mediaExp += A.mediaExp;
        if (A.morale) m.morale = KP.clamp(m.morale + A.morale, 0, 100);
        if (A.pop) g.popularity = KP.clamp((g.popularity || 0) + A.pop, 0, 100);
        if (A.followers) KP.socialSpike(state, m, A.followers, 'promo-' + actId);
        // fan-facing care builds devotion (v0.7.0) — once per activity, not per member
        if (m === members[0]) {
          if (actId === 'fanSign') KP.fandomGain(g, KP.C.FANDOM.gainFanSign);
          if (actId === 'livestream') KP.fandomGain(g, KP.C.FANDOM.gainLivestream);
        }
        // variety weeks feed the variety dream (v0.7.1) — different
        // schedules mean different things to different members
        if (actId === 'variety' && KP.ambitionOf(state, m) === 'variety') {
          m.morale = KP.clamp(m.morale + KP.C.LIFE.ambitionTouchBonus, 0, 100);
          m.varietyWeeks = (m.varietyWeeks || 0) + 1;
          if (m.varietyWeeks >= KP.C.LIFE.varietyAmbitionAt) {
            const amb = KP.ambitionTouch(state, m, 'variety');
            if (amb) notes.push(amb);
          }
        }
        if (A.fatigue > 0 && m.fatigue >= CB.OVERWORK.threshold && rng.chance(CB.OVERWORK.chance)) {
          notes.push(KP.overworkIncident(state, m, 'promotion', rng));
        }
      });
    });

    // the stages that make stories — encores moved to the show desk
    // (v0.6.5): they belong to WINS now, not to bookings
    if (plan.includes('challenge') && rng.chance(R.challengeViralChance)) {
      const face = members.slice().sort((a, b) => KP.derived(b).centerPull - KP.derived(a).centerPull)[0];
      if (face) {
        KP.socialSpike(state, face, KP.C.SOCIAL.viralSpike * 0.7, 'challenge');
        notes.push({ kind: 'public', ind: 'challengeViral', personId: face.id, groupId: g.id,
          text: 'The ' + g.name + ' dance challenge broke containment — ' + KP.displayName(face) + '’s version is the template everyone copies now. Cheapest promotion the company ever bought.' });
        const narNote = KP.recordViral(state, face);
        if (narNote) notes.push(narNote);
      }
    }
    if (plan.includes('fanSign') && rng.chance(0.25) && members.length) {
      const m = members[Math.floor(rng.next() * members.length)];
      notes.push({ kind: 'public', ind: 'fanSignWarm', personId: m.id, groupId: g.id,
        text: 'A fan-sign clip of ' + KP.displayName(m) + ' comforting a crying fan is doing gentle numbers tonight. Core fandom is built like this — one person at a time.' });
    }
    return notes;
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
    // a new-material tour seeded the next era (v0.6.8) — spent here
    const tourLift = g.tourHype || 0;
    delete g.tourHype;
    // the calendar has a shape (v0.9.5): January sleeps, summer favors
    // the bright — one read supplies the number and the words
    const season = KP.seasonRead ? KP.seasonRead(state, concept.id) : { mod: 0, line: null };
    // the declared return (v0.9.12): anticipation converts to numbers
    const hiaRead = KP.hiatusReadsRelease ? KP.hiatusReadsRelease(state, g, isDebut) : { mod: 0, note: null };
    let reception = KP.clamp(Math.round(
      demo.hook * 0.3 + demo.trendFit * 0.13 + performance * 0.3 +
      groupFit * 0.14 + (chem - 50) * 0.12 + D.promoBoost[g.prep.promo] +
      popLift + hypeLift + soloEdge + spark + luck - crowd + memRead.mod + tourLift + season.mod + hiaRead.mod), 1, 100);
    // the mash (v0.9.6): a genre-bending release rolls the whole table —
    // flop / worked / acclaimed-but-unpopular / changed-the-industry.
    // Creative rooms tilt the odds; nobody escapes the variance.
    const mash = g.prep.mash || null;
    let fusionOutcome = null;
    if (mash) {
      const FU = KP.C.FUSION;
      const cre = members.reduce((s, m) => s + m.personality.creativity, 0) / members.length / 100;
      const pShift = FU.shiftBase + FU.shiftPerCreativity * cre;
      const pAcclaim = FU.acclaimBase + FU.acclaimPerCreativity * cre;
      const pFlop = Math.max(0.08, FU.flopBase - FU.flopLessPerCreativity * cre);
      const roll = rng.next();
      if (roll < pShift) {
        fusionOutcome = 'shift';
        reception = Math.max(reception, FU.shiftReceptionMin + Math.round(rng.next() * 8));
      } else if (roll < pShift + pAcclaim) {
        fusionOutcome = 'acclaim';
        reception = Math.min(reception, FU.acclaimReceptionCap);
      } else if (roll < pShift + pAcclaim + pFlop) {
        fusionOutcome = 'flop';
        reception = Math.min(reception, FU.flopReceptionCap);
      } else {
        fusionOutcome = 'worked';
        reception = KP.clamp(reception + FU.workedLift, 1, 100);
      }
    }
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
    // the numbers everyone can see move with the moment (v0.6.1)
    const SO = KP.C.SOCIAL;
    members.forEach(m => { if (isDebut) KP.socialSpike(state, m, SO.debutSpike, 'debut'); });
    KP.socialSpike(state, breakout, SO.breakoutSpike + reception * SO.breakoutPerReception, 'breakout');
    if (spark > 0) KP.socialSpike(state, breakout, SO.viralSpike, 'spark');
    if (reception >= 75) push(KP.recordEvidence(state, 'monsterRookies', 'group', g.id));
    if (season.line) push({ kind: 'company', groupId: g.id, text: season.line });
    if (!isDebut && prevReception != null && reception <= prevReception - KP.C.MEMORY.underperformGap) {
      push(KP.recordEvidence(state, 'underperformed', 'group', g.id));
    }
    // creative direction (v0.6.7): consistency becomes identity, and an
    // identity makes pivots news — cutting the old story down to size
    const DIR = KP.C.DIRECTION;
    const prevConcept = (g.releases && g.releases.length)
      ? g.releases[g.releases.length - 1].conceptId : null;
    if (prevConcept && concept.id !== prevConcept) {
      const identity = KP.getNarrative(state, 'conceptIdentity', 'group', g.id);
      if (identity) {
        identity.strength = Math.round(identity.strength * DIR.pivotStrengthMult);
        const oldLabel = (KP.conceptById(prevConcept) || { label: 'the old sound' }).label;
        // priority ruling (v0.9.1): a group with an established identity
        // changing lanes is era-defining news — never trimmed (the
        // milestone precedent; surfaced by an aging-shifted stream)
        push({ kind: 'public', ind: 'conceptPivot', priority: 'high', groupId: g.id,
          landed: reception >= DIR.reinventionAt,
          text: reception >= DIR.reinventionAt
            ? 'The pivot LANDED. ' + g.name + ' walked away from the sound everyone knew them for, and the reinvention ate — the recaps are already calling it an era.'
            : g.name + ' changed lanes — ' + concept.label.toLowerCase() + ' after all that ' +
              oldLabel.toLowerCase() + '. The fandom is split between “growth” and “give it back,” and both sides are loud.' });
      }
    }
    if (g.concept && concept.id === g.concept) {
      g.conceptRun = (g.conceptRun || 0) + 1;
      if (g.conceptRun >= DIR.identityAt) {
        push(KP.recordEvidence(state, 'conceptIdentity', 'group', g.id, { concept: g.concept }));
      }
    } else {
      g.conceptRun = 0;   // off the brief (or no brief): the streak resets
    }
    // the internet reacts to the stage itself (v0.6.2)
    const DD = KP.C.DISCOURSE;
    if (performance < 45 && rng.chance(DD.encoreChance)) {
      const shaky = members.slice().sort((a, b) => KP.derived(a).liveReliability - KP.derived(b).liveReliability)[0];
      push(KP.igniteDiscourse(state, rng, 'encore', 'idol', shaky.id, g.id));
    }
    if (reception < 50 && rng.chance(DD.stylingChance)) {
      push(KP.igniteDiscourse(state, rng, 'styling', 'group', g.id, g.id));
    }
    if (spark > 0 && rng.chance(DD.fancamChance)) {
      push(KP.igniteDiscourse(state, rng, 'fancam', 'idol', breakout.id, g.id));
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

    // revenue: a hit pays, an established fanbase buys albums, a bigger
    // record multiplies both — and the overseas orders move first when
    // the map is warm (v0.6.6)
    const format = D.FORMATS.find(f => f.id === (g.prep.format || 'single')) || D.FORMATS[0];
    const overseasMult = 1 + KP.overseasAvg(g) * KP.C.REGIONAL.revenuePerOverseas;
    // a devoted fandom buys everything twice (v0.7.0)
    const fandomMult = 1 + KP.fandomIntensity(g) * KP.C.FANDOM.revenueFactor;
    const revenue = Math.round((Math.max(0, reception - 30) * 1.6 + (isDebut ? 0 : (g.popularity || 0) * 0.4)) *
      format.revenueMult * overseasMult * fandomMult);
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

    if (isDebut) {
      g.debutWeek = state.week;
      KP.assignRooms(state, g);   // the dorm gets its room chart (v0.7.1)
      if (isSolo) push(KP.ambitionTouch(state, members[0], 'solo'));
    }
    g.debuted = true;
    g.lastReleaseWeek = state.week;
    g.promoUntil = state.week + KP.C.COMEBACK.promoWeeks;
    // the rollout rides into promotion (v0.6.3); fan-sign weeks buy the
    // fanbase extra patience after the cycle ends
    g.rollout = g.prep.rollout || KP.C.ROLLOUT.DEFAULT.map(w => w.slice());
    g.promoGrace = g.rollout.reduce((s, wk) =>
      s + wk.filter(a => a === 'fanSign').length * KP.C.ROLLOUT.ACTIVITIES.fanSign.gracePerWeek, 0);
    // the tracklist becomes consequences (v0.7.5): solos touch
    // ambitions, units read chemistry, one b-side may outgrow the record
    const tl = KP.tracklistResolve(state, g, rng, reception);
    tl.notes.forEach(push);

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
      tracklist: tl.tracks, sleeperTitle: tl.sleeperTitle || null,
      centerOvershadowed,
      chem, groupFit: Math.round(groupFit),
      trustDelta, revenue,
      chartPeak: peak, chartWeeks: weeksOn,
      nationalPeak: natPeak, nationalWeeks: weeksOn,
      crowd: Math.round(crowd),
      benched: benched.map(m => m.id),
      execLine: execDebutLine(band.key, centerOvershadowed, state),
      publicNotes: publicNotes(state, band.key, breakout, centerOvershadowed, demo, rng, spark > 0, isDebut, crowd, benched, fatigueAvg, natPeak)
        .concat(memRead.notes)
        .concat(hiaRead.note ? [hiaRead.note] : []),
      mash, fusionOutcome,
    };
    g.results.narrativeNotes = narrativeNotes;   // sim forwards these to the inbox
    g.releases = g.releases || [];
    g.releases.push({
      week: state.week, songTitle: demo.title, conceptId: concept.id,
      reception, receptionBand: band.key, chartPeak: peak, chartWeeks: weeksOn,
      nationalPeak: natPeak, nationalWeeks: weeksOn,
      isDebut, format: format.id, tracks: format.tracks,
      // the release archives its OWN copy (0.9.13 audit L4: results and
      // releases shared one live array — identical today, a fork hazard
      // the first time anything edits a released tracklist)
      tracklist: (tl.tracks || []).map(t => Object.assign({}, t)),
      sleeperTitle: tl.sleeperTitle || null,
      mash, fusionOutcome, acclaim: fusionOutcome === 'acclaim',
      producerId: demo.producerId || null, producer: demo.producer,
    });
    // the mash verdict (v0.9.6): every fusion outcome is narrated with
    // its consequences attached — the gamble was the player's, the
    // verdict is the world's
    if (mash) {
      const FU = KP.C.FUSION;
      const label = KP.mashLabel(mash);
      if (fusionOutcome === 'shift') {
        g.popularity = KP.clamp((g.popularity || 0) + FU.shiftPop, 0, 100);
        KP.fandomGain(g, FU.shiftFandomGain);
        push(KP.recordEvidence(state, 'genreShift', 'group', g.id, { mash: label }));
        push({ kind: 'public', urgent: true, priority: 'critical', ind: 'fusionVerdict', outcome: 'shift', groupId: g.id, mashLabel: label,
          text: 'INDUSTRY SHIFT. “' + demo.title + '” made ' + label + ' a genre that exists now, and everyone knows it. Three A&R departments called about “that sound” before noon. The trades used the word “pioneering” without irony. Whatever happens next, this record is in the textbook.' });
      } else if (fusionOutcome === 'acclaim') {
        KP.fandomGain(g, FU.acclaimFandomGain);
        state.trust = KP.clamp(state.trust + FU.acclaimTrust, 0, 100);
        members.forEach(m => { m.morale = KP.clamp(m.morale + 2, 0, 100); });
        push({ kind: 'public', priority: 'high', ind: 'fusionVerdict', outcome: 'acclaim', groupId: g.id, mashLabel: label,
          text: '“' + demo.title + '” (' + label + ') is the best-reviewed record this company has ever put out and almost nobody bought it. The critics wrote paragraphs. The public wrote “interesting!” and streamed something else. The fandom has never been more devoted; the accountants have never been more confused. Both are correct.' });
      } else if (fusionOutcome === 'flop') {
        members.forEach(m => { m.morale = KP.clamp(m.morale - FU.flopMorale, 0, 100); });
        push({ kind: 'public', priority: 'high', ind: 'fusionVerdict', outcome: 'flop', groupId: g.id, mashLabel: label,
          text: 'The ' + label + ' experiment on “' + demo.title + '” ate itself. The two genres met, fought, and both lost; the comment sections are being creative about it. The members are taking it professionally, which is to say badly, quietly. The gamble was real — so was the floor.' });
      } else {
        // priority high (0.9.8.3): the verdict on a gamble the PLAYER
        // placed is never trimmable — a sensation week buried this one
        push({ kind: 'public', ind: 'fusionVerdict', outcome: 'worked', priority: 'high', groupId: g.id, mashLabel: label,
          text: '“' + demo.title + '” made ' + label + ' work — genuinely work. Not a revolution, not a casualty: a good record with a strange engine, and the public took the ride. The producers are already asking what to collide next.' });
      }
    }
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
    // the release war (v0.6.4): a same-week landing is a head-to-head
    // battle the world keeps score on — and a hit this big may get its
    // concept stolen by the trend chasers
    const war = KP.releaseWar(state, g, score, reception, concept.id, rng);
    war.notes.forEach(push);
    if (war.battle) g.results.battle = war.battle;
    // the release exports (v0.6.6): concept resonance decides where
    KP.regionsOnRelease(state, g, reception, concept.id).forEach(push);
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
