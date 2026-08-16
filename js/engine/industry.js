/* The living world (v0.4.0). Rival companies debut named acts, run
   comeback cycles, rise and fall; every release — theirs and the
   player's — enters the weekly scene chart; and the fan feed narrates
   all of it in the fans' own voice.

   Content laws for the feed (from the founding brief): snark aims at
   songs, styling and company decisions — NEVER at bodies or appearance;
   no harassment; crushes stay wholesome. The fans are funny, not cruel. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // ---- shared name pools ------------------------------------------------
  function usedActNames(state) {
    // the family key rides along (0.9.20.1): one HALO per world
    const used = new Set();
    const add = n => { used.add(n.toLowerCase()); KP.nameStems(n).forEach(st => used.add(st)); };
    KP.groups(state).forEach(g => add(g.name));
    (state.rivals || []).forEach(r => (r.acts || []).forEach(a => add(a.name)));
    return used;
  }
  function usedTitles(state) {
    const used = {};
    KP.groups(state).forEach(g => (g.releases || []).forEach(r => { used[r.songTitle] = true; }));
    (state.rivals || []).forEach(r => (r.acts || []).forEach(a =>
      (a.releases || []).forEach(rel => { used[rel.title] = true; })));
    return used;
  }
  function usedCompanyShorts(state) {
    const used = new Set([String(state.company.short).toLowerCase()]);
    (state.rivals || []).forEach(r => used.add(String(r.short).toLowerCase()));
    return used;
  }

  // ---- the weekly scene chart -------------------------------------------
  KP.chartEnter = function (state, entry) {
    state.chart = state.chart || { entries: [] };
    entry.weeksOn = 0;
    entry.pos = null; entry.lastPos = null; entry.peakPos = null;
    state.chart.entries.push(entry);
    if (state.chart.entries.length > KP.C.CHART.maxEntries) {
      state.chart.entries.sort((a, b) => b.score - a.score);
      state.chart.entries.length = KP.C.CHART.maxEntries;
    }
  };
  KP.chartPositions = function (state) {
    return ((state.chart && state.chart.entries) || []).slice().sort((a, b) => b.score - a.score);
  };
  function chartTick(state) {
    const CH = KP.C.CHART;
    if (!state.chart) { state.chart = { entries: [] }; return; }
    state.chart.entries.forEach(e => { e.score *= CH.decay; e.weeksOn++; });
    state.chart.entries = state.chart.entries.filter(e => e.score >= CH.dropBelow);
  }
  // Stamp positions after ALL of the week's releases (rival and player)
  // have entered — the movement arrows the Chart tab shows come from here.
  // v0.4.4: the discography records what the chart ACTUALLY did — player
  // releases sync their peak and weeks from the living entry until it
  // drops off, at which point the record freezes. One truth per chart:
  // chartPeak is the scene, nationalPeak is the national board (v0.5.0),
  // and the national board hands out milestone letters on the way up.
  KP.chartStamp = function (state) {
    const notes = [];
    const stampList = list => list.forEach((e, i) => {
      e.lastPos = e.pos;
      e.pos = i + 1;
      if (e.peakPos == null || e.pos < e.peakPos) e.peakPos = e.pos;
    });
    stampList(KP.chartPositions(state));
    stampList(KP.nationalPositions(state));

    ((state.chart && state.chart.entries) || []).forEach(e => {
      if (!e.isPlayer || !e.groupId || e.peakPos == null) return;
      const g = KP.groupById(state, e.groupId);
      if (!g) return;
      const rel = (g.releases || []).find(r => r.week === e.entered);
      if (rel) { rel.chartPeak = e.peakPos; rel.chartWeeks = e.weeksOn + 1; }
      if (g.results && g.results.week === e.entered) {
        g.results.chartPeak = e.peakPos;
        g.results.chartWeeks = e.weeksOn + 1;
      }
    });

    ((state.national && state.national.entries) || []).forEach(e => {
      if (!e.isPlayer || !e.groupId || e.peakPos == null) return;
      const g = KP.groupById(state, e.groupId);
      if (!g) return;
      const rel = (g.releases || []).find(r => r.week === e.entered);
      if (rel) { rel.nationalPeak = e.peakPos; rel.nationalWeeks = e.weeksOn + 1; }
      if (g.results && g.results.week === e.entered) {
        g.results.nationalPeak = e.peakPos;
        g.results.nationalWeeks = e.weeksOn + 1;
      }
      // milestones: record every tier crossed, speak only the deepest new one
      const N = KP.C.NATIONAL;
      e.milestones = e.milestones || [];
      let best = null;
      N.milestones.forEach(tier => {
        if (e.pos <= tier && !e.milestones.includes(tier)) {
          e.milestones.push(tier);
          if (best == null || tier < best) best = tier;
        }
      });
      if (best != null) {
        const n = milestoneNote(state, g, e, best);
        if (n) notes.push(n);
      }
    });
    return notes;
  };

  function milestoneNote(state, g, e, tier) {
    const N = KP.C.NATIONAL;
    if (tier === 1) {
      if (!g.nationalNumberOne) {
        g.nationalNumberOne = true;
        state.trust = KP.clamp(state.trust + N.firstTopTenTrust, 0, 100);
        const rep = state.company.reputation;
        rep.girlGroup = KP.clamp((rep.girlGroup || 40) + 8, 0, 100);
        rep.starMaker = KP.clamp((rep.starMaker || 35) + 6, 0, 100);
      }
      return { kind: 'executive', urgent: true, ind: 'natMilestone', tier, actName: g.name, songTitle: e.title,
        text: state.executive.name + ': “Number one. On the NATIONAL chart — the whole industry, the titans included. ' +
          'I have rehearsed saying this calmly and I cannot. ' + g.name + ' is the biggest song in the country this week. Frame everything.”' };
    }
    if (tier === 3) {
      return { kind: 'public', ind: 'natMilestone', tier, actName: g.name, songTitle: e.title,
        text: '“' + e.title + '” climbed into the national top 3 — above half the industry’s untouchables. Legacy fandoms have noticed ' + g.name + ' now, which is both an honor and a declaration of war.' };
    }
    if (tier === 10) {
      if (!g.nationalTopTen) {
        g.nationalTopTen = true;
        state.trust = KP.clamp(state.trust + N.firstTopTenTrust, 0, 100);
        const rep = state.company.reputation;
        rep.girlGroup = KP.clamp((rep.girlGroup || 40) + 6, 0, 100);
        rep.starMaker = KP.clamp((rep.starMaker || 35) + 4, 0, 100);
        return { kind: 'executive', urgent: true, ind: 'natMilestone', tier, actName: g.name, songTitle: e.title,
          text: state.executive.name + ': “The national top ten. Not our little scene chart — the board my directors read at breakfast. Six years I have waited to forward a chart screenshot upstairs. ' + g.name + ' just ended the wait. Now stay up there.”' };
      }
      return { kind: 'public', ind: 'natMilestone', tier, actName: g.name, songTitle: e.title,
        text: g.name + ' is back in the national top ten with “' + e.title + '”. The second visit is the one that makes the industry stop calling it luck.' };
    }
    return { kind: 'public', ind: 'natMilestone', tier, actName: g.name, songTitle: e.title,
      text: '“' + e.title + '” entered the national top 20. ' + g.name + '’s name is on the big board now, sitting between artists with arena tours. The interns printed it out.' };
  }

  // ---- the national chart (v0.5.0): the wider world, low resolution -----
  // A generated mainstream pool — titans, established names, risers —
  // releases on its own cadence into a bigger, harder field. Player and
  // scene-rival releases enter it with the scores they already carry.
  const TYPE_LABELS = { boyGroup: 'boy group', girlGroup: 'girl group', soloist: 'soloist', band: 'band' };
  function pickArtistType(rng) {
    const roll = rng.next();
    return roll < 0.32 ? 'boyGroup' : roll < 0.64 ? 'girlGroup' : roll < 0.86 ? 'soloist' : 'band';
  }
  function makePoolArtist(state, rng, tier, used) {
    const N = KP.C.NATIONAL;
    const type = pickArtistType(rng);
    return {
      name: KP.genArtistName(rng, type, used),
      type, typeLabel: TYPE_LABELS[type], tier,
      fame: rng.int(N.fame[tier][0], N.fame[tier][1]),
      lastRelease: 0,
      nextRelease: state.week + rng.int(1, N.cadence[1]),
    };
  }
  KP.nationalPositions = function (state) {
    return ((state.national && state.national.entries) || []).slice().sort((a, b) => b.score - a.score);
  };
  KP.nationalEnter = function (state, entry) {
    state.national = state.national || { artists: [], entries: [] };
    entry.weeksOn = entry.weeksOn || 0;
    entry.pos = null; entry.lastPos = null; entry.peakPos = null;
    state.national.entries.push(entry);
    if (state.national.entries.length > KP.C.NATIONAL.maxEntries) {
      state.national.entries.sort((a, b) => b.score - a.score);
      state.national.entries.length = KP.C.NATIONAL.maxEntries;
    }
    return entry;
  };
  function nationalTitles(state) {
    const used = usedTitles(state);
    ((state.national && state.national.entries) || []).forEach(e => { used[e.title] = true; });
    return used;
  }
  function nationalWeek(state, rng) {
    const N = KP.C.NATIONAL;
    state.national = state.national || { artists: [], entries: [] };
    state.national.entries.forEach(e => { e.score *= (e.decayRate || N.decay); e.weeksOn++; });
    state.national.entries = state.national.entries.filter(e => e.score >= N.dropBelow);
    state.national.artists.forEach(ar => {
      if (state.week < ar.nextRelease) return;
      let mult = N.scoreMult[0] + rng.next() * (N.scoreMult[1] - N.scoreMult[0]);
      const titan = ar.tier === 'titan';
      if (titan && rng.chance(N.megaChance)) mult *= N.megaMult;   // a cultural moment
      KP.nationalEnter(state, {
        title: KP.genSongTitle(rng, nationalTitles(state)),
        act: ar.name, company: ar.typeLabel, isPlayer: false, pool: true,
        decayRate: titan ? N.titanDecay : undefined,
        score: ar.fame * mult, entered: state.week,
      });
      ar.fame = KP.clamp(ar.fame + rng.int(-N.fameDriftMax, N.fameDriftMax), N.fameFloor, N.fameCap);
      ar.lastRelease = state.week;
      ar.nextRelease = state.week + rng.int(N.cadence[0], N.cadence[1]) +
        (ar.tier === 'titan' ? N.titanCadenceBonus : 0);
    });
  }
  KP.seedNational = function (state, rng) {
    if (state.national && state.national.artists && state.national.artists.length) return;
    const N = KP.C.NATIONAL;
    state.national = { artists: [], entries: [] };
    const used = usedActNames(state);
    Object.keys(N.pool).forEach(tier => {
      for (let i = 0; i < N.pool[tier]; i++) {
        state.national.artists.push(makePoolArtist(state, rng, tier, used));
      }
    });
    // the big chart opens mid-conversation: recent releases, still cooling
    state.national.artists.forEach(ar => {
      if (!rng.chance(0.6)) return;
      const weeksAgo = rng.int(1, 14);
      let mult = N.scoreMult[0] + rng.next() * (N.scoreMult[1] - N.scoreMult[0]);
      const titan = ar.tier === 'titan';
      if (titan && rng.chance(N.megaChance)) mult *= N.megaMult;
      const rate = titan ? N.titanDecay : N.decay;
      const score = ar.fame * mult * Math.pow(rate, weeksAgo);
      if (score < N.dropBelow) return;
      const e = KP.nationalEnter(state, {
        title: KP.genSongTitle(rng, nationalTitles(state)),
        act: ar.name, company: ar.typeLabel, isPlayer: false, pool: true,
        decayRate: titan ? N.titanDecay : undefined,
        score, entered: Math.max(-200, state.week - weeksAgo),
      });
      e.weeksOn = weeksAgo;
      ar.lastRelease = Math.max(-200, state.week - weeksAgo);
    });
  };

  // ---- crowding: releasing into a busy week costs reception -------------
  KP.crowdPenalty = function (state) {
    const I = KP.C.INDUSTRY;
    return Math.min(I.crowdPenaltyMax, (state.rivalReleasesThisWeek || 0) * I.crowdPenaltyPer);
  };

  // ---- rival acts: debuts, comebacks, aging -----------------------------
  // Rival lineups are real people (v0.4.3): the trainees a rival signed
  // off the board debut in the groups it forms, topped up with generated
  // in-house trainees. Act quality follows who is actually in the room.
  function newActId(state) {
    state.nextActId = state.nextActId || 1;
    return 'ra' + (state.nextActId++);
  }
  function peakTalent(p) {
    return Math.max(p.talents.vocals.cur, p.talents.dance.cur, p.talents.rap.cur, p.talents.charisma.cur);
  }
  function castMembers(state, rival, rng, ageRange, gender) {
    const I = KP.C.INDUSTRY;
    gender = gender || 'f';
    const size = rng.int(I.actSize[0], I.actSize[1]);
    const inActs = new Set();
    (state.rivals || []).forEach(r => (r.acts || []).forEach(a =>
      (a.members || []).forEach(id => inActs.add(id))));
    // the people they signed — best first; they were signed to be used.
    // One group, one gender applies to everyone's market (v0.8.4)
    const signees = Object.values(state.people)
      .filter(p => p.status === 'rival' && p.company === rival.short && !inActs.has(p.id) &&
        (p.gender || 'f') === gender)
      .sort((a, b) => peakTalent(b) - peakTalent(a));
    const members = signees.slice(0, size).map(p => p.id);
    // fill the lineup from the in-house trainee floor
    const usedNames = new Set(Object.values(state.people).map(x => x.name.given.toLowerCase()));
    KP.resetIds(state.nextPersonId || KP.peekNextId());
    while (members.length < size) {
      const p = KP.generatePerson(rng, { status: 'rival', source: 'In-house trainee',
        usedNames, gender, age: rng.int(ageRange[0], ageRange[1]) });
      p.company = rival.short;
      p.flags.rivalNative = true;
      state.people[p.id] = p;
      KP.socialOf(state, p);   // minted at the door, not on first look
      // other companies give stage names too (v0.7.0) — about half the
      // lineup debuts under one, picked deterministically
      if (KP.hash01([state.seed, p.id, 'rivalstage'].join('|')) < 0.5) {
        const sugg = KP.suggestStageNames(state, p);
        if (sugg.length) p.name.stage = sugg[Math.floor(
          KP.hash01([state.seed, p.id, 'stagepick'].join('|')) * sugg.length)];
      }
      members.push(p.id);
    }
    state.nextPersonId = KP.peekNextId();
    rival.rosterCount = Math.max(0, (rival.rosterCount || 0) - size);
    return members;
  }
  function actQualityFromMembers(state, memberIds, prestige, rng) {
    const I = KP.C.INDUSTRY;
    const ms = memberIds.map(id => state.people[id]).filter(Boolean);
    const avg = ms.reduce((s, p) =>
      s + 0.45 * Math.max(p.talents.vocals.cur, p.talents.dance.cur, p.talents.rap.cur) +
      0.3 * p.talents.charisma.cur + 0.25 * p.talents.visuals.cur, 0) / Math.max(1, ms.length);
    return Math.round(KP.clamp(
      I.memberQualityWeight * avg + I.prestigeQualityWeight * prestige + 14 +
      rng.normal(0, I.actQualityNoise * 0.7), 20, 92));
  }
  KP.rivalActById = function (state, id) {
    for (const r of (state.rivals || [])) {
      for (const a of (r.acts || [])) if (a.id === id) return { act: a, rival: r };
    }
    return null;
  };

  // the scene ceiling (v0.9.8): the height the market is playing at —
  // the player's hottest debuted act sets the bar the flagships chase
  KP.sceneCeiling = function (state) {
    return KP.groups(state).filter(g => g.debuted)
      .reduce((m, g) => Math.max(m, g.popularity || 0), 0);
  };
  function flagshipOf(rival) {
    return (rival.acts || []).filter(a => !a.retired)
      .sort((x, y) => (y.popularity || 0) - (x.popularity || 0))[0] || null;
  }

  function rivalRelease(state, rival, act, rng, isDebut) {
    const I = KP.C.INDUSTRY;
    const title = KP.genSongTitle(rng, usedTitles(state));
    const statureBefore = act.popularity;   // battle-worthiness is who they WERE (v0.6.4)
    let reception = Math.round(KP.clamp(
      act.quality * 0.85 + act.popularity * 0.15 + rng.normal(0, I.releaseNoiseSd) - 6, 1, 100));
    // the flagship punches up (v0.9.8): behind the scene leader, the
    // release comes hungrier — the machine spends when it is chasing.
    // A portfolio at comfort is a focused machine (0.9.18.1): fewer
    // groups means EVERY act gets that backing, not just the flagship
    const ceiling = KP.sceneCeiling(state);
    const RM = I.ROOM;
    const focused = rival.acts.filter(a => !a.retired).length <=
      RM.comfortBase + Math.floor((rival.prestige || 40) / RM.comfortPerPrestige);
    if (!isDebut && ceiling > 0 && (focused || act === flagshipOf(rival)) && statureBefore < ceiling) {
      const F = I.FLAGSHIP;
      reception = Math.round(KP.clamp(
        reception + Math.min(F.punchCap, (ceiling - statureBefore) * F.punchFactor), 1, 100));
    }
    // the era physics (v0.9.24): an imperial house's releases come
    // backed; a fading one's come thin — the ranking is not just copy
    if (KP.rivalEra) {
      const era = KP.rivalEra(state, rival);
      if (era === 'imperial') reception = Math.min(100, reception + KP.C.RISEFALL.imperialPunch);
      else if (era === 'fading') reception = Math.max(1, reception - KP.C.RISEFALL.fadingDrag);
    }
    // the service reads the stage (v0.9.24): a rotation is short-handed;
    // the first release after a full pause is a RETURN, and returns punch
    if (act.serviceRotation) reception = Math.max(1, reception - KP.C.RISEFALL.SERVICE.staggerDrag);
    if (act.returnPrimed) {
      delete act.returnPrimed;
      reception = Math.min(100, reception + KP.C.RISEFALL.SERVICE.returnBump);
    }
    act.popularity = isDebut
      ? KP.clamp(Math.round(10 + reception * 0.7), 0, 100)
      : KP.clamp(Math.round(act.popularity * 0.55 + reception * 0.5), 0, 100);
    act.lastReleaseWeek = state.week;
    // fewer groups, faster cycles (0.9.18.1): the calendar stays crowded
    // because each act works harder, not because there are more of them
    act.cycleWeeks = Math.max(8, Math.round(
      rng.int(I.cycleWeeks[0], I.cycleWeeks[1]) * (focused ? RM.focusCycleFactor : 1)));
    act.announcedWeek = null;   // the announced date was kept — or moved (v0.6.4)
    act.releases = act.releases || [];
    act.releases.push({ week: state.week, title, reception, isDebut: !!isDebut });
    // their members' numbers move too (v0.6.1)
    (act.members || []).forEach(id => {
      const p = state.people[id];
      if (p) KP.socialSpike(state, p, reception * KP.C.SOCIAL.rivalReleasePerReception, 'rivalRelease');
    });
    // and the world keeps score on THEM as well (v0.6.1)
    const M = KP.C.MEMORY;
    const narNotes = [];
    const keep = n => { if (n) narNotes.push(n); };
    if (isDebut && reception >= 75) keep(KP.recordEvidence(state, 'rivalMonsterRookies', 'rivalAct', act.id));
    if (reception >= 64) { act.hitStreak = (act.hitStreak || 0) + 1; act.flopStreak = 0; }
    else if (reception < 40) { act.flopStreak = (act.flopStreak || 0) + 1; act.hitStreak = 0; }
    else { act.hitStreak = 0; act.flopStreak = 0; }
    if (act.hitStreak >= M.streakAt) keep(KP.recordEvidence(state, 'hitStreak', 'rivalAct', act.id));
    if (act.flopStreak >= M.flopAt) keep(KP.recordEvidence(state, 'flopEra', 'rivalAct', act.id));
    const prestigeBefore = rival.prestige;
    rival.prestige = KP.clamp(rival.prestige + (reception - 55) * 0.06, 5, 95);
    if (prestigeBefore < M.risingAt && rival.prestige >= M.risingAt) {
      keep(KP.recordEvidence(state, 'risingPower', 'rivalCompany', rival.short));
    }
    const score = reception + act.popularity * 0.2;
    KP.chartEnter(state, {
      title, act: act.name, company: rival.short, isPlayer: false,
      score, entered: state.week,
    });
    // the scene fights for the middle of the national board too (v0.5.0)
    KP.nationalEnter(state, {
      title, act: act.name, company: rival.short, isPlayer: false,
      score, entered: state.week,
    });
    state.rivalReleasesThisWeek = (state.rivalReleasesThisWeek || 0) + 1;
    // the week's landings, for the head-to-head ledger (v0.6.4)
    state.weekReleases = state.weekReleases || [];
    state.weekReleases.push({ actId: act.id, actName: act.name, company: rival.short,
      title, score, reception, actPop: Math.max(statureBefore, act.popularity) });
    return { title, reception, narNotes };
  }

  function pushMove(rival, text) {
    rival.recentMoves = (rival.recentMoves || []).concat([text]).slice(-4);
  }

  KP.industryWeek = function (state, rng) {
    const I = KP.C.INDUSTRY;
    const notes = [];
    state.chart = state.chart || { entries: [] };
    chartTick(state);
    nationalWeek(state, rng);   // the wider world keeps its own schedule (v0.5.0)
    state.rivalReleasesThisWeek = 0;
    state.weekReleases = [];    // this week's landings, fresh (v0.6.4)

    (state.rivals || []).forEach(rival => {
      rival.acts = rival.acts || [];
      // the room is sized to a plan (0.9.18.1): the next debut's cost
      // plus a bench the company's ambition can carry. Below the plan
      // they scout at full appetite; a full room only signs the
      // can't-miss kid.
      const R = I.ROOM;
      const roomTarget = I.debutTraineeCost + R.bench + Math.floor((rival.prestige || 40) / R.benchPerPrestige);
      const appetite = (rival.rosterCount || 0) < roomTarget ? 1 : R.satedIntake;
      if (rng.chance(I.scoutIntake * appetite)) rival.rosterCount = Math.min(30, (rival.rosterCount || 0) + 1);

      // the evaluation (0.9.18.1): twice a year the floor is graded and
      // the room is cut back to the plan — deeper when the room has
      // bloated badly. The named signee who never made a lineup is not
      // exempt; nobody in this industry is.
      if ((state.week + (KP.hashStr(rival.short) % R.cullEvery)) % R.cullEvery === 0) {
        const overage = (rival.rosterCount || 0) - roomTarget;
        if (overage > 0) {
          const cut = overage >= R.purgeAt
            ? Math.ceil(overage * R.purgeFactor)
            : Math.min(R.cullMax, overage);
          rival.rosterCount = Math.max(0, (rival.rosterCount || 0) - cut);
          state.rivalLedger = state.rivalLedger || { culls: 0, namedCuts: 0 };
          state.rivalLedger.culls++;
          pushMove(rival, 'Cut ' + cut + ' trainee' + (cut === 1 ? '' : 's'));
          if (cut >= R.cullNoteAt) {
            notes.push({ kind: 'industry', text: rival.short + '’s seasonal evaluation cut ' +
              cut + ' from the trainee floor. The company calls it aligning the room with the roadmap. The room calls it Tuesday.' });
          }
          // a named signee below the bar goes with the counters — the
          // people we lost to their scouts are not safe on their floor
          const inActs = new Set();
          (state.rivals || []).forEach(r0 => (r0.acts || []).forEach(a0 =>
            (a0.members || []).forEach(id0 => inActs.add(id0))));
          const floor = Object.values(state.people)
            .filter(p0 => p0.status === 'rival' && p0.company === rival.short && !inActs.has(p0.id))
            .filter(p0 => {
              const signed = (p0.history || []).find(h => /Signed to /.test(h.text));
              const peak = Math.max(p0.talents.vocals.cur, p0.talents.dance.cur,
                p0.talents.rap.cur, p0.talents.charisma.cur);
              return signed && state.week - signed.week >= R.namedTenure && peak < R.namedBar;
            })
            .sort((a0, b0) => peakTalent(a0) - peakTalent(b0));
          floor.slice(0, R.namedMax).forEach(pc => {
            pc.status = 'released';
            pc.company = null;
            pc.history.push({ week: state.week,
              text: 'Cut at ' + rival.short + '’s seasonal evaluation. Years of practice rooms, one meeting.' });
            state.rivalLedger.namedCuts++;
            notes.push({ kind: 'scouting', personId: pc.id,
              text: KP.fillPro(rival.short + ' cut ' + KP.displayName(pc) + ' at their seasonal evaluation — the same trainee their scouts took off our board. {She} deserved a company with a plan for {her}.', pc) });
          });
        }
      }

      // a full portfolio waits its turn (0.9.18.1): a company running at
      // its comfort keeps the trainees training and re-asks in a month
      const comfort = R.comfortBase + Math.floor((rival.prestige || 40) / R.comfortPerPrestige);
      if (state.week >= (rival.nextDebutWeek || Infinity) &&
          rival.acts.filter(a => !a.retired).length >= comfort) {
        rival.nextDebutWeek = state.week + R.comfortRecheck;
      }
      // a scheduled debut, if the trainee room can field one
      if (state.week >= (rival.nextDebutWeek || Infinity) && (rival.rosterCount || 0) >= I.debutTraineeCost) {
        // the copycat reveal (v0.6.4): a trend chaser that clocked one of
        // our hits debuts its next group wearing OUR concept
        const stolen = rival.copyConcept ? KP.conceptById(rival.copyConcept.conceptId) : null;
        const concept = stolen || rng.pick(KP.C.CONCEPTS);
        // the act forms around the people they signed to use (v0.4.3):
        // gender follows the best available signee; a clean floor rolls
        const inActs0 = new Set();
        (state.rivals || []).forEach(r0 => (r0.acts || []).forEach(a0 =>
          (a0.members || []).forEach(id0 => inActs0.add(id0))));
        const bestSignee = Object.values(state.people)
          .filter(p0 => p0.status === 'rival' && p0.company === rival.short && !inActs0.has(p0.id))
          .sort((a0, b0) => peakTalent(b0) - peakTalent(a0))[0];
        const actGender = bestSignee ? (bestSignee.gender || 'f')
          : (rng.chance(I.boyActShare) ? 'm' : 'f');
        const members = castMembers(state, rival, rng, I.memberDebutAge, actGender);
        const act = {
          id: newActId(state), gender: actGender,
          gen: (state.gen && state.gen.n) || KP.C.RISEFALL.GEN.start,   // stamped at birth (v0.9.24)
          name: KP.genGroupName(rng, usedActNames(state)), concept: concept.id,
          quality: actQualityFromMembers(state, members, rival.prestige, rng),
          members, popularity: 0,
          debutWeek: state.week, lastReleaseWeek: state.week,
          cycleWeeks: rng.int(I.cycleWeeks[0], I.cycleWeeks[1]),
          releases: [], retired: false,
        };
        rival.acts.push(act);
        rival.nextDebutWeek = state.week + rng.int(I.debutInterval[0], I.debutInterval[1]) +
          Math.round(Math.max(0, 70 - rival.prestige) / 4) +
          // the portfolio paces the pipeline (0.9.18.1): every group a
          // company already runs is a machine that needs feeding first
          rival.acts.filter(a => !a.retired).length * I.ROOM.actPace;
        const rel = rivalRelease(state, rival, act, rng, true);
        (rel.narNotes || []).forEach(n => notes.push(n));
        pushMove(rival, 'Debuted ' + act.name);
        // a face we lost hurts more than a name we never knew
        const lost = members.map(id => state.people[id]).find(p => p && !p.flags.rivalNative);
        notes.push({ kind: 'industry', ind: 'rivalDebut', actName: act.name, company: rival.short,
          text: rival.short + ' debuted ' + act.name + ' today — ' + concept.label.toLowerCase() +
            ' concept, leading with “' + rel.title + '”' +
            (lost ? ', with ' + KP.displayName(lost) + ' — once on our board — in the lineup' : '') + '. ' +
            (rel.reception >= 64 ? 'The showcase is getting real traction. They will be in our lane by Friday.'
              : rel.reception >= 48 ? 'A competent launch. Watch the follow-up.'
              : 'The launch landed quietly. Even so, the calendar just got more crowded.') });
        if (stolen) {
          const from = rival.copyConcept.from;
          rival.copyConcept = null;
          const nar = KP.recordEvidence(state, 'trendCopier', 'rivalCompany', rival.short);
          if (nar) notes.push(nar);
          notes.push({ kind: 'industry', ind: 'conceptCopy', actName: act.name,
            company: rival.short, fromGroup: from,
            text: 'Look closely at that ' + act.name + ' debut: ' + concept.label.toLowerCase() +
              ' concept, ' + from + '’s exact lane, months after ours worked. ' + rival.short +
              ' will call it a coincidence. The stylists know what they saw.' });
        }
        return;
      }

      // comeback cycles and aging for existing acts
      rival.acts.forEach(act => {
        if (act.retired) return;
        // the service pause (v0.9.24): a whole act at the base releases
        // nothing — the calendar waits with the fandom (cooling handled
        // by the riseFall weekly, which owns the service state)
        if (act.servicePause) return;
        if (state.week >= act.lastReleaseWeek + act.cycleWeeks) {
          const rel = rivalRelease(state, rival, act, rng, false);
          (rel.narNotes || []).forEach(n => notes.push(n));
          pushMove(rival, act.name + ' comeback');
          if (rel.reception >= I.comebackNoteMin) {
            notes.push({ kind: 'industry', ind: 'rivalHit', actName: act.name, company: rival.short, actGender: act.gender || 'f',
              songTitle: rel.title,
              text: act.name + '’s “' + rel.title + '” is everywhere this week. ' + rival.short +
                ' will be insufferable about it, and the music shows just got harder to win.' });
          }
        } else {
          act.popularity = Math.max(0, act.popularity - I.actPopDecay);
          const age = state.week - act.debutWeek;
          // an overextended company prunes its coldest act sooner
          // (0.9.18.1): six groups is a portfolio, not a family
          const activeNow = rival.acts.filter(a => !a.retired);
          const crowded = activeNow.length > I.ROOM.overextendAt &&
            act === activeNow.reduce((m, a) => a.popularity < m.popularity ? a : m);
          if (act.popularity < I.disbandFloorPop * (crowded ? 1.6 : 1) &&
              age > I.disbandMinAgeWeeks && rng.chance(I.disbandChance * (crowded ? 2 : 1))) {
            act.retired = true;
            rival.prestige = KP.clamp(rival.prestige - 4, 5, 95);
            if (rival.prestige < KP.C.MEMORY.fadingBelow) {
              const nar = KP.recordEvidence(state, 'fadingHouse', 'rivalCompany', rival.short);
              if (nar) notes.push(nar);
            }
            pushMove(rival, act.name + ' disbanded');
            notes.push({ kind: 'industry', ind: 'disband', actName: act.name, company: rival.short,
              text: rival.short + ' announced the “conclusion of team activities” for ' + act.name +
                '. The fans saw it coming, which never once made it hurt less.' });
          } else if (age > I.ROOM.sevenYearWeeks && rng.chance(I.ROOM.wallChance)) {
            // the seven-year wall (0.9.18.1): rival contracts expire on
            // the same clock the player's do. A finished run, not a fall.
            act.retired = true;
            rival.prestige = KP.clamp(rival.prestige - 2, 5, 95);
            pushMove(rival, act.name + ' concluded (7 years)');
            notes.push({ kind: 'industry', ind: 'disband', actName: act.name, company: rival.short,
              text: act.name + '’s seven-year run ends where the contracts do: ' + rival.short +
                ' and the members could not land on the same next chapter. Seven years, ' +
                (act.releases || []).length + ' releases, and a fandom that will now archive everything twice.' });
          }
        }
      });

      // the flagship pursues (v0.9.8): the company's machine gets behind
      // its best act and closes on the scene ceiling — the market does
      // not politely stay a weight class below a dominant era
      {
        const F = I.FLAGSHIP;
        const ceiling = KP.sceneCeiling(state);
        const flag = ceiling > 0 ? flagshipOf(rival) : null;
        if (flag) {
          const gap = ceiling - flag.popularity;
          if (gap > 0) {
            flag.popularity = KP.clamp(flag.popularity + gap * F.catchUp, 0, 100);
            if (!flag.huntNoted && ceiling - flag.popularity <= F.huntNoteAt) {
              flag.huntNoted = 1;
              notes.push({ kind: 'industry', ind: 'flagshipHunt', priority: 'high',
                actName: flag.name, company: rival.short,
                text: rival.short + ' has made it policy: ' + flag.name + ' goes wherever the top of the scene goes. Bigger budgets, better slots, a release cadence that mirrors ours a little too precisely. The trades are calling it a chase. The trades are right.' });
            }
          }
        }
      }
    });
    return notes;
  };

  // ---- monthly lifecycle: emerge, fall, merge, split ---------------------
  function makeCompany(state, rng, opts) {
    const named = KP.genCompanyName(rng, usedCompanyShorts(state));
    return {
      name: named.name, short: named.short,
      philosophy: (opts && opts.philosophy) || rng.pick(['trendChaser', 'performance', 'patient', 'hungry']),
      blurb: (opts && opts.blurb) || rng.pick([
        'New money, new office, borrowed playbook. Hungry, though.',
        'Founded by producers who got tired of making other people rich.',
        'Nobody has heard of them. They intend to fix that loudly.',
        'Small roster, big claims. The first debut will tell us everything.',
      ]),
      prestige: (opts && opts.prestige != null) ? opts.prestige : rng.int(22, 40),
      rosterCount: (opts && opts.rosterCount != null) ? opts.rosterCount : rng.int(4, 8),
      nextDebutWeek: state.week + rng.int(16, 34),
      interest: {}, acts: [], recentMoves: [],
    };
  }

  KP.industryLifecycle = function (state, rng) {
    const I = KP.C.INDUSTRY;
    const notes = [];
    const rivals = state.rivals || [];
    const bump = () => { state.lifecycleEvents = (state.lifecycleEvents || 0) + 1; };

    // fall: a starved company folds (never below the floor — the scene survives)
    if (rivals.length > I.minRivals && rng.chance(I.collapseChance)) {
      // the founder's old house never quietly exits the story (v0.9.9)
      const starved = rivals.find(r => !r.founderGrudge &&
        r.prestige < I.collapsePrestige && !(r.acts || []).some(a => !a.retired));
      if (starved) {
        (starved.acts || []).forEach(a => { a.retired = true; });
        state.rivals = rivals.filter(r => r !== starved);
        bump();
        notes.push({ kind: 'industry', urgent: false, ind: 'collapse', company: starved.short,
          text: starved.name + ' has ceased operations. Overnight, their trainees are free agents and their office lease is a cautionary tale. This industry does not do gentle exits.' });
        // the fallout (v0.9.24): the roster is a signing class, not a footnote
        if (KP.mintFreeAgents) KP.mintFreeAgents(state, starved, notes);
      }
    }

    // merge: two struggling companies pool what is left
    if ((state.rivals || []).length >= 4 && rng.chance(I.mergeChance) &&
        state.rivals.filter(r => !r.founderGrudge).length >= 2) {
      const sorted = state.rivals.slice().filter(r => !r.founderGrudge)
        .sort((a, b) => a.prestige - b.prestige);
      const b = sorted[0], a = sorted[1];
      const named = KP.genCompanyName(rng, usedCompanyShorts(state));
      const merged = {
        name: named.name, short: named.short, philosophy: a.philosophy,
        blurb: 'Born from the merger of ' + a.short + ' and ' + b.short + '. Two half-rosters, one payroll, everything to prove.',
        prestige: KP.clamp(Math.max(a.prestige, b.prestige) + 4, 5, 95),
        rosterCount: (a.rosterCount || 0) + (b.rosterCount || 0),
        nextDebutWeek: Math.min(a.nextDebutWeek || Infinity, b.nextDebutWeek || Infinity),
        interest: Object.assign({}, b.interest, a.interest),
        acts: (a.acts || []).concat(b.acts || []),
        recentMoves: ['Formed from ' + a.short + ' + ' + b.short],
      };
      state.rivals = state.rivals.filter(r => r !== a && r !== b).concat([merged]);
      // the people go where the company goes (v0.4.3)
      Object.values(state.people).forEach(p => {
        if (p.status === 'rival' && (p.company === a.short || p.company === b.short)) {
          p.company = merged.short;
        }
      });
      bump();
      notes.push({ kind: 'industry', ind: 'merge', company: merged.short,
        text: a.name + ' and ' + b.name + ' are merging into ' + merged.name +
          '. The press release says “synergy.” The trade wires say “survival.” Their combined roster says both.' });
    }

    // split: a giant sheds a faction that becomes a new competitor
    if ((state.rivals || []).length < I.maxRivals && rng.chance(I.splitChance)) {
      const giant = state.rivals.find(r => r.prestige >= I.splitPrestige && (r.rosterCount || 0) >= I.splitRoster);
      if (giant) {
        giant.rosterCount -= 6;
        giant.prestige = KP.clamp(giant.prestige - 6, 5, 95);
        const spawn = makeCompany(state, rng, {
          prestige: KP.clamp(giant.prestige - 14, 20, 60), rosterCount: 6,
          philosophy: giant.philosophy,
          blurb: 'Founded by defectors from ' + giant.short + '. They know exactly where the bodies are buried, because they trained half of them.',
        });
        state.rivals.push(spawn);
        pushMove(giant, 'Lost a faction to ' + spawn.short);
        bump();
        notes.push({ kind: 'industry', ind: 'split', company: spawn.short,
          text: 'A creative director and half the A&R floor walked out of ' + giant.name + ' to found ' +
            spawn.name + '. Six trainees went with them. The lawyers are the only winners this month.' });
      }
    }

    // the national pool churns too: faded stars bow out, rookies rise (v0.5.0)
    const N = KP.C.NATIONAL;
    if (state.national && state.national.artists && rng.chance(N.retireChance)) {
      const idx = state.national.artists.findIndex(ar => ar.fame < N.retireBelow);
      if (idx >= 0) {
        const gone = state.national.artists[idx];
        const used = usedActNames(state);
        state.national.artists.forEach(ar => used.add(ar.name.toLowerCase()));
        state.national.artists[idx] = makePoolArtist(state, rng, 'riser', used);
        bump();
        notes.push({ kind: 'industry', ind: 'natRetire', company: gone.name,
          text: gone.name + ' announced an indefinite hiatus after a quiet few years. The national chart will feel older without them — and younger because of ' + state.national.artists[idx].name + ', who is exactly the kind of act that takes a legend’s parking spot.' });
      }
    }

    // emerge: fresh money enters the scene
    if ((state.rivals || []).length < I.maxRivals && rng.chance(I.emergeChance)) {
      const fresh = makeCompany(state, rng);
      state.rivals.push(fresh);
      bump();
      notes.push({ kind: 'industry', ind: 'emerge', company: fresh.short,
        text: 'New label on the wire: ' + fresh.name + ' announced itself today with an office photo and a promise to “redefine the idol model.” Every label says that. Occasionally one means it.' });
    }
    return notes;
  };

  // ---- world seeding: newgame and the 0.4.0 migration share this --------
  KP.seedIndustry = function (state, rng) {
    const I = KP.C.INDUSTRY;
    state.chart = state.chart || { entries: [] };
    state.feed = state.feed || [];
    state.lifecycleEvents = state.lifecycleEvents || 0;
    const basePrestige = { Novaline: 56, Aurum: 60, Whitecliff: 64 };
    (state.rivals || []).forEach(r => {
      if (r.prestige == null) r.prestige = basePrestige[r.short] || rng.int(38, 62);
      r.acts = r.acts || [];
      r.recentMoves = r.recentMoves || [];
      if (!r.acts.length) {
        // the scene was mid-conversation when you arrived: each rival
        // already runs 1–2 acts with history
        const n = rng.int(1, 2);
        for (let i = 0; i < n; i++) {
          const concept = rng.pick(KP.C.CONCEPTS);
          const lastRel = state.week - rng.int(2, 12);
          const actGender2 = rng.chance(I.boyActShare) ? 'm' : 'f';
          const members = castMembers(state, r, rng, [17, 24], actGender2);
          const act = {
            id: newActId(state), gender: actGender2,
            gen: (state.gen && state.gen.n) || KP.C.RISEFALL.GEN.start,
            name: KP.genGroupName(rng, usedActNames(state)), concept: concept.id,
            quality: actQualityFromMembers(state, members, r.prestige, rng),
            members,
            popularity: rng.int(25, 55),
            debutWeek: state.week - rng.int(30, 140),
            lastReleaseWeek: lastRel,
            cycleWeeks: rng.int(I.cycleWeeks[0], I.cycleWeeks[1]),
            releases: [], retired: false,
          };
          const title = KP.genSongTitle(rng, usedTitles(state));
          const reception = Math.round(KP.clamp(act.quality * 0.85 + act.popularity * 0.15 +
            rng.normal(0, I.releaseNoiseSd) - 6, 1, 100));
          act.releases.push({ week: lastRel, title, reception, isDebut: false });
          r.acts.push(act);
          // their last single is still cooling on the chart
          const weeksAgo = state.week - lastRel;
          const score = (reception + act.popularity * 0.2) * Math.pow(KP.C.CHART.decay, weeksAgo);
          if (score >= KP.C.CHART.dropBelow) {
            KP.chartEnter(state, { title, act: act.name, company: r.short, isPlayer: false,
              score, entered: lastRel });
            state.chart.entries[state.chart.entries.length - 1].weeksOn = weeksAgo;
          }
        }
      }
      if (r.nextDebutWeek == null) r.nextDebutWeek = state.week + rng.int(14, 44);
    });
    // v0.4.3: every active act has faces — backfill ids and members onto
    // acts from older saves (their stored quality is their history; keep it)
    (state.rivals || []).forEach(r => (r.acts || []).forEach(a => {
      if (!a.id) a.id = newActId(state);
      if (!a.retired && (!a.members || !a.members.length)) {
        a.members = castMembers(state, r, rng, [17, 24]);
      }
    }));
    // the wider world exists whether or not anyone local looks up (v0.5.0)
    KP.seedNational(state, rng);
    // rival identities are common knowledge on day one (v0.6.1, silent seed)
    (state.rivals || []).forEach(r => {
      const key = { trendChaser: 'trendCopier', performance: 'performanceFactory',
        patient: 'patientHouse' }[r.philosophy];
      if (key && !KP.getNarrative(state, key, 'rivalCompany', r.short)) {
        KP.recordEvidence(state, key, 'rivalCompany', r.short);
      }
    });
    KP.chartStamp(state);
    // the feed opens mid-argument, the way it always is
    if (!state.feed.length) {
      const acts = [];
      (state.rivals || []).forEach(r => (r.acts || []).forEach(a => acts.push({ a, r })));
      const used = new Set();
      const openers = [];
      if (acts[0]) openers.push(fanPost(state, rng, used,
        acts[0].a.name + ' has been carrying this comeback season and I will not be taking questions.'));
      if (acts[1]) openers.push(fanPost(state, rng, used,
        'unpopular opinion: ' + acts[1].a.name + '’s title tracks all sound like the same demo with new synths. ' + acts[1].r.short + ' plays it SO safe.'));
      openers.push(fanPost(state, rng, used,
        'heard ' + state.company.short + ' is finally putting together a new girl group. six years of nothing… I want to believe.'));
      openers.forEach(p => state.feed.unshift(p));
    }
  };

  // ---- the fan feed ------------------------------------------------------
  // Posts carry personas now (v0.6.2): fans, company stans, casuals,
  // antis and press accounts. Antis obey the content law like everyone
  // else — they attack songs, styling and companies, never bodies.
  function pickPersona(rng) {
    const roll = rng.next();
    return roll < 0.45 ? 'fan' : roll < 0.65 ? 'stan' : roll < 0.85 ? 'casual'
      : roll < 0.95 ? 'anti' : 'press';
  }
  function fanPost(state, rng, usedHandles, entry) {
    const text = typeof entry === 'string' ? entry : entry.text;
    const persona = (typeof entry === 'object' && entry.persona) || pickPersona(rng);
    const viral = rng.chance(KP.C.FEED.viralChance);
    // the regulars (v0.7.1): a share of the feed is voiced by the
    // recurring cast everyone recognizes — the fandom has PEOPLE in it
    let handle = null;
    if (rng.chance(KP.C.LIFE.regularShare)) {
      const reg = KP.regularFor(state, persona, state.week);
      if (reg && !usedHandles.has(reg)) { handle = reg; usedHandles.add(reg); }
    }
    return {
      week: state.week,
      handle: handle || KP.genFanHandle(rng, usedHandles),
      persona,
      text,
      likes: viral ? rng.int(400, 6000) : rng.int(2, 60),
    };
  }

  // live storms post themselves (v0.6.2) — sentiment-colored, persona-true
  function discoursePost(state, d, rng) {
    const pSub = d.subjectType === 'idol' ? (state.people[d.subjectId] || null) : null;
    const who = d.subjectType === 'idol'
      ? (pSub ? KP.displayName(pSub) : 'her')
      : ((KP.groupById(state, d.subjectId) || { name: 'them' }).name);
    const co = state.company.short;
    const m = {
      exhausted: [
        { persona: 'fan', text: 'the way ' + who + ' is visibly running on empty in every clip this week. ' + co + ', explain the schedule' },
        { persona: 'press', text: 'Fan accounts are posting side-by-side clips of ' + who + ' from three months ago vs now. The quote-posts are not kind to ' + co },
      ],
      dating: [
        { persona: 'fan', text: 'the ' + who + ' café photos are literally two coworkers getting coffee. y’all need jobs and hobbies' },
        { persona: 'anti', text: '“sources say”… the source is a blurry photo of the back of someone’s head. incredible journalism as always' },
      ],
      styling: [
        { persona: 'anti', text: 'who is dressing ' + who + ' and what did the members do to them personally. the SONG is fine, the outfits are a crime scene' },
        { persona: 'fan', text: 'petition for ' + co + ' to free ' + who + ' from whatever mood board did this. the fans will fund the new stylist' },
      ],
      encore: [
        { persona: 'casual', text: 'the ' + who + ' encore clip… look, live singing is hard, but that was rough. be nice in the replies though' },
        { persona: 'anti', text: 'encore discourse day two: half concern, half “this is why we can’t have nice things.” the clip does not improve on rewatch' },
      ],
      benched: [
        { persona: 'fan', text: KP.fillPro(who + ' pulled from schedules… hope {she} is actually resting and not just hidden. companies lie about this constantly', pSub) },
        { persona: 'stan', text: 'get well soon ' + who + '. and ' + co + '— maybe fewer 5am send-offs going forward? just a thought. from all of us' },
      ],
      fancam: [
        { persona: 'stan', text: 'the ' + who + ' fancam has TWO MILLION views and I contributed forty of them personally. no regrets' },
        { persona: 'casual', text: 'the algorithm decided everyone watches ' + who + ' today and honestly? the algorithm was right' },
      ],
    };
    return rng.pick(m[d.kind] || m.fancam);
  }

  // Candidate builders — each returns a text or null. Event posts outrank
  // ambient chatter; the weekly cap keeps the feed a digest.
  function releasePosts(state, g, rng) {
    const r = g.results;
    const demoTitle = r.songTitle;
    const breakout = state.people[r.breakoutId];
    const bn = breakout ? KP.displayName(breakout) : null;
    const posts = [];
    if (['sensation', 'strong'].includes(r.receptionBand)) {
      posts.push(rng.pick([
        'not ' + g.name + ' ending my entire week with “' + demoTitle + '”. song of the year and it’s not even close',
        'the “' + demoTitle + '” choreo?? ' + g.name + ' said we’re doing everything live this era. respect.',
        g.name + ' really heard “crowded comeback season” and dropped “' + demoTitle + '” anyway. fearless behavior',
      ]));
    } else if (r.receptionBand === 'solid') {
      posts.push(rng.pick([
        '“' + demoTitle + '” is growing on me honestly. ' + g.name + ' always delivers album quality even when the single plays it safe',
        'quiet week for ' + g.name + ' numbers-wise but “' + demoTitle + '” is a grower. check back in a month',
      ]));
    } else {
      posts.push(rng.pick([
        'I’m sorry but whoever picked “' + demoTitle + '” as ' + g.name + '’s title track needs to sit in on the next A&R meeting. the b-sides were RIGHT THERE',
        'the styling for ' + g.name + '’s “' + demoTitle + '” stages is a crime against a perfectly good song. fire the mood board, not the members',
        g.name + ' deserve better promotion than whatever ' + state.company.short + ' is doing right now. one teaser?? in this economy??',
      ]));
    }
    if (bn) {
      posts.push(rng.pick([
        KP.fillPro('new bias alert: ' + bn + '. the way {she} owns the second chorus of “' + demoTitle + '”… I’ve watched the fancam nine times', breakout),
        KP.fillPro(bn + ' smiled at the camera for 0.8 seconds during the “' + demoTitle + '” encore and I’ve been thinking about it all day. hope {she}’s getting enough rest', breakout),
        'day one of ' + bn + ' being my favorite and it is already going great',
      ]));
    }
    if (r.centerOvershadowed && bn) {
      const center = state.people[g.roles.center];
      posts.push(KP.fillPro('the company keeps centering ' + (center ? KP.displayName(center) : 'her') +
        ' but the public voted with the fancam views. eyes on ' + bn + ', ' + state.company.short + '. we see {her} even if you don’t.', breakout));
    }
    if ((r.crowd || 0) >= 5) {
      posts.push(g.name + ' really dropped the same week as half the industry. my streaming schedule is a two-front war');
    }
    return posts;
  }

  function rivalEventPosts(state, weekNotes, rng) {
    const posts = [];
    weekNotes.forEach(n => {
      // the registry first (v0.7.2): Living Industry systems register
      // feed reactions via KP.onFeedEvent — they never edit this chain.
      // The chain below is FROZEN legacy; new inds go through the kernel.
      const reg = n.ind && KP.feedReactionFor(n.ind);
      if (reg) {
        const out = reg(state, n, rng);
        if (out) posts.push(out);
        return;
      }
      if (n.ind === 'rivalDebut') {
        posts.push(rng.pick([
          n.company + ' debuted ' + n.actName + ' today. verdict: actually?? kind of good?? watch this space',
          'watched ' + n.actName + '’s debut stage three times. ' + n.company + ' finally hired a good creative director',
          'another debut, another lightstick I have to pretend I’m not going to buy. welcome, ' + n.actName,
        ]));
      } else if (n.ind === 'rivalHit') {
        posts.push(rng.pick([
          n.actName + '’s new one is everywhere and I’m not even mad. a win for ' + (n.actGender === 'm' ? 'boy groups is a win for boy groups' : 'girl groups is a win for girl groups') + ',',
          'you can dislike ' + n.company + ' as a company and still admit ' + n.actName + ' ate. both things are true',
        ]));
      } else if (n.ind === 'disband') {
        posts.push('the ' + n.actName + ' disbandment announcement… I wasn’t even a fan and I’m sad. hug your faves’ albums tonight');
      } else if (n.ind === 'collapse') {
        posts.push(n.company + ' ceasing operations is the end of an era. justice for every trainee back at square one — hope the good ones land somewhere fast');
      } else if (n.ind === 'merge') {
        posts.push('so they’re just… one company now. stanning in this industry is a group project with mergers');
      } else if (n.ind === 'split') {
        posts.push('half of an A&R floor walking out to start ' + n.company + '?? the tea is SCALDING. the trainees deserve hazard pay');
      } else if (n.ind === 'emerge') {
        posts.push('new label ' + n.company + ' just announced. every debut showcase gets my attention exactly once. impress me');
      } else if (n.ind === 'natMilestone') {
        const m = { 20: n.actName + ' in the NATIONAL top 20. we’re a real fandom now, act accordingly',
          10: 'NATIONAL TOP TEN. I have personally been carrying ' + n.actName + '’s streams and I WILL be taking credit',
          3: n.actName + ' top 3 on the national chart, above half the industry’s untouchables. screaming, crying, printing the screenshot',
          1: n.actName + ' IS NUMBER ONE IN THE COUNTRY. in this house forever. lightstick to the moon' };
        posts.push(m[n.tier] || m[20]);
      } else if (n.ind === 'natRetire') {
        posts.push('the ' + n.company + ' hiatus announcement has me revisiting my entire adolescence. pour one out for the national chart’s old guard');
      } else if (n.ind === 'encoreMoment') {
        const p = state.people[n.personId];
        posts.push({ persona: 'stan', text: (p ? KP.displayName(p) : 'she') +
          ' really said “no backing track” and ENDED the encore. I have watched the clip eleven times. eleven' });
      } else if (n.ind === 'challengeViral') {
        const p = state.people[n.personId];
        posts.push({ persona: 'casual', text: 'I don’t even follow this group and the ' +
          (p ? KP.displayName(p) : '') + ' challenge version is all over my page. fine. FINE. following' });
      } else if (n.ind === 'fanSignWarm') {
        const p = state.people[n.personId];
        posts.push({ persona: 'fan', text: KP.fillPro('the fan-sign clip of ' + (p ? KP.displayName(p) : 'her') +
          ' with the crying fan… this is why we stay. protect {her} at all costs', p || null) });
      } else if (n.ind === 'showWin') {
        const gName = (KP.groupById(state, n.groupId) || { name: 'they' }).name;
        posts.push(rng.pick([
          { persona: 'stan', text: gName + ' WON ' + KP.showLabel(n.showId) + '. the encore. the tears. the trophy. I have watched the announcement clip forty times and I am not done' },
          { persona: 'fan', text: 'a ' + KP.showLabel(n.showId) + ' trophy for ' + gName + '. every voting guide, every streaming pass — it all mattered. WE did this' },
          { persona: 'casual', text: 'watched a group win ' + KP.showLabel(n.showId) + ' today and cry like the trophy was a person. ok fine. I get it now' },
        ]));
      } else if (n.ind === 'rivalShowWin') {
        posts.push(n.beatGroupId
          ? { persona: 'anti', text: n.actName + ' taking ' + KP.showLabel(n.showId) + ' with the other group RIGHT THERE on stage… the camera work was surgical. brutal industry' }
          : { persona: 'casual', text: n.actName + ' won ' + KP.showLabel(n.showId) + ' again. at this point hand them the timeslot' });
      } else if (n.ind === 'endingFairy') {
        const p = state.people[n.personId];
        posts.push({ persona: 'casual', text: 'no because WHO is the ending fairy from this week… ' +
          (p ? KP.displayName(p) : 'her') + ' looked at the camera for three seconds and gained a fandom. I was there. I am the fandom' });
      } else if (n.ind === 'fandomNamed') {
        const g = KP.groupById(state, n.groupId);
        posts.push({ persona: 'fan', text: 'we have a NAME. we have a COLOR. ' +
          (g && g.fandom ? g.fandom.name + ' in ' + g.fandom.color : 'it') +
          ' forever. crying at a lightstick mockup at my big age. membership card WHEN' });
      } else if (n.ind === 'dealSigned') {
        const p = state.people[n.personId];
        posts.push(rng.pick([
          { persona: 'stan', text: (p ? KP.displayName(p) : 'she') + ' brand ambassador announcement. the campaign shots are ILLEGAL. buying products I cannot pronounce' },
          { persona: 'casual', text: KP.fillPro('saw ' + (p ? KP.displayName(p) : 'an idol') + ' on a billboard today and pointed like {she} knows me. advertising works, I am the proof', p || null) },
        ]));
      } else if (n.ind === 'dealCancelled') {
        posts.push({ persona: 'press', text: 'Brand watch: a conduct-clause cancellation this week. Agencies keep learning that ambassadorships are weather-dependent. The weather is the internet.' });
      } else if (n.ind === 'awardWin') {
        const g = KP.groupById(state, n.groupId);
        posts.push(rng.pick([
          { persona: 'stan', text: (g ? g.name : 'THEY') + ' WON. the speech. the tears. the group hug that crushed the trophy ribbon. year MADE. see everyone at the encore stage' },
          { persona: 'fan', text: 'daesang season and OUR name got called. every voting guide, every streaming night — it counted. proud is too small a word' },
        ]));
      } else if (n.ind === 'awardSnub') {
        const g = KP.groupById(state, n.groupId);
        posts.push({ persona: 'stan', text: 'the ' + (g ? g.name : '') + ' snub is a CRIME and I have the receipts thread to prove it. rigged ceremony. anyway streaming doubled, spite is fuel' });
      } else if (n.ind === 'tourMoment') {
        const p = state.people[n.personId];
        posts.push({ persona: 'fan', text: KP.fillPro('the ' + KP.regionLabel(n.region) + ' crowd singing ' +
          (p ? KP.displayName(p) : 'her') + '’s lines back at {her} and {pos} face CRUMPLING… I have watched it thirty times. touring matters. bring them everywhere', p || null) });
      } else if (n.ind === 'tourLeg') {
        const gName = (KP.groupById(state, n.groupId) || { name: 'they' }).name;
        posts.push(n.soldOut
          ? { persona: 'stan', text: gName + ' sold out ' + (n.region === 'kr' ? 'the hometown show' : KP.regionLabel(n.region)) + ' in MINUTES. resale is a crime scene. we did this. book a stadium, cowards' }
          : n.soft
            ? { persona: 'anti', text: 'the curtained-off sections at the ' + gName + ' show… someone in that company cannot read a map. the fans deserve better routing' }
            : { persona: 'casual', text: 'went to the ' + gName + ' show on a whim. no notes. whole room on one heartbeat. concerts are just better than everything else' })
;
      } else if (n.ind === 'tourEnd') {
        const gName = (KP.groupById(state, n.groupId) || { name: 'they' }).name;
        posts.push({ persona: 'fan', text: gName + ' tour wrap vlog: crying in six airports, one (1) perfect encore, and my bank account in witness protection. worth it. do it again' });
      } else if (n.ind === 'conceptPivot') {
        const gName = (KP.groupById(state, n.groupId) || { name: 'they' }).name;
        posts.push(n.landed
          ? { persona: 'casual', text: 'ok the ' + gName + ' concept change had NO right going this hard. growth arc confirmed, I was wrong and I love being wrong' }
          : rng.pick([
            { persona: 'anti', text: gName + ' abandoning the sound that built them… the hubris. streaming the old title track out of spite' },
            { persona: 'stan', text: 'to everyone dooming about the ' + gName + ' concept change: they can do BOTH. expand your minds. (I am also scared)' },
          ]));
      } else if (n.ind === 'regionLoud') {
        const gName = (KP.groupById(state, n.groupId) || { name: 'they' }).name;
        posts.push(rng.pick([
          { persona: 'fan', text: 'the ' + KP.regionLabel(n.region) + ' fandom just organized a subway ad for ' + gName + ' and the photos are gorgeous. international fandom infrastructure is REAL' },
          { persona: 'casual', text: 'apparently ' + gName + ' is blowing up in ' + KP.regionLabel(n.region) + '?? found out from a fan-sub account with better editing than actual broadcasters' },
          { persona: 'stan', text: KP.regionLabel(n.region) + ' besties waking up at 4am for the lives… the international fandom carries so much and asks for one (1) tour. justice incoming, I can feel it' },
        ]));
      } else if (n.ind === 'comebackAnnounce') {
        posts.push(rng.pick([
          { persona: 'stan', text: n.actName + ' comeback announced. presave, hydrate, clear your schedule, warn your coworkers' },
          { persona: 'casual', text: n.actName + ' announcing a comeback date like a court summons. fine, I’ll be there' },
        ]));
      } else if (n.ind === 'playerAnnounce') {
        posts.push(n.actName
          ? { persona: 'stan', text: 'they put the comeback on the SAME DAY as ' + n.actName + '?? ok. okay. so we’re doing this. everyone stretch' }
          : rng.pick([
            { persona: 'fan', text: 'DATE. ANNOUNCED. cancelling everything, the group comes first and my landlord can wait' },
            { persona: 'casual', text: 'another comeback date on the calendar. the fourth quarter of this industry is a demolition derby' },
          ]));
      } else if (n.ind === 'ambush') {
        posts.push(rng.pick([
          { persona: 'anti', text: n.company + ' moving ' + n.actName + ' onto someone else’s announced date. petty? deeply. am I seated? front row' },
          { persona: 'press', text: 'Industry note: ' + n.company + ' has scheduled ' + n.actName + ' opposite a previously announced release. Executives reached for comment cited “internal calendars.”' },
          { persona: 'fan', text: n.company + ' saw a smaller company announce a date and said “that one. I want that one.” evil behavior. anyway stream day it is' },
        ]));
      } else if (n.ind === 'dateSlip') {
        posts.push(rng.pick([
          { persona: 'anti', text: 'moving your comeback out of ' + n.actName + '’s way is crazy work. the fear is showing' },
          { persona: 'fan', text: 'the date moved and honestly? good. let the numbers breathe. this is called strategy, look it up' },
        ]));
      } else if (n.ind === 'dateHold') {
        posts.push({ persona: 'stan', text: 'they said the date STANDS. head to head. inject the confidence directly into my veins' });
      } else if (n.ind === 'battleWin') {
        posts.push(rng.pick([
          { persona: 'stan', text: 'same day release and WE took the week. ' + n.actName + ' picked the wrong date. screenshot everything' },
          { persona: 'casual', text: 'the same-day chart battle was genuinely the most fun this industry has been all year. the winner knows who they are' },
        ]));
      } else if (n.ind === 'battleLoss') {
        posts.push(rng.pick([
          { persona: 'anti', text: n.actName + ' ate them alive on their own release day. that’s gotta sting. (it stings)' },
          { persona: 'fan', text: 'we lost the week, not the war. charting is a marathon and I am built for endurance. streaming with intent' },
        ]));
      } else if (n.ind === 'conceptCopy') {
        posts.push(rng.pick([
          { persona: 'stan', text: n.company + ' debuting a group in ' + n.fromGroup + '’s EXACT concept months later. not one original thought in that entire building' },
          { persona: 'casual', text: 'the new ' + n.actName + ' concept is giving… someone else’s moodboard. you know it, I know it, their stylists know it' },
        ]));
      } else if (n.ind === 'narrative') {
        // a narrative just FORMED — the fans arrive with receipts (v0.6.0)
        const idolName = () => { const p = state.people[n.narSubjectId]; return p ? KP.displayName(p) : 'her'; };
        const groupName = () => (KP.groupById(state, n.narSubjectId) || { name: 'them' }).name;
        const actName = () => { const hit = KP.rivalActById(state, n.narSubjectId); return hit ? hit.act.name : 'them'; };
        const coName = () => String(n.narSubjectId);
        const m = {
          poachers: coName() + ' really operates on “your board is my board”. lock your doors, agencies',
          risingPower: 'the ' + coName() + ' ascension arc is real. remember when they were mid? character development',
          fadingHouse: 'watching ' + coName() + ' fade in real time is genuinely sad. somebody sign the good ones out of there',
          rivalMonsterRookies: actName() + ' getting the monster rookies title from the actual PRESS. the bar just moved for everybody',
          hitStreak: actName() + ' three in a row. no notes. the streak is the personality now',
          flopEra: 'the ' + actName() + ' flop era discourse is so mean and so funny. they’ll be back. probably',
          trendCopier: coName() + ' saw one viral concept and preordered the whole aesthetic. never change. (change)',
          performanceFactory: coName() + ' groups really do all dance like the rent depends on it. respect the machine',
          patientHouse: coName() + ' debuts once an era and it always slaps. the patience is psychological warfare',
          vocalHouse: 'day one of me saying ' + state.company.short + ' has the best vocal line in the industry and being objectively correct',
          performanceHouse: state.company.short + ' choreo debuts are just built different. this is now canon',
          starMaker: 'not ' + state.company.short + ' quietly becoming THE star factory. the trainee showcase watchers knew first',
          hitFactory: state.company.short + ' girl groups do not miss. write it down, frame it',
          monsterRookies: groupName() + ' monster rookies confirmed. I was here before it was obvious — screenshot this post',
          underperformed: 'still think ' + groupName() + '’s last one deserved better numbers. the public was wrong and I’m patient',
          dormant: groupName() + ' has not released in MONTHS. blink twice if you’re being held hostage in the practice room',
          fancamStar: 'another ' + idolName() + ' viral moment. at this point it’s not luck, it’s a genre. the fancam one strikes again',
          itGirl: idolName() + ' is entering {pos} it-{girl} era and the brands are going to figure it out any day now',
          dateSniper: coName() + ' has officially made a HOBBY of dropping releases on other people’s dates. the audacity is almost impressive. almost',
          rivalry: 'the ' + actName() + ' rivalry is canon now. every shared release week is a pay-per-view event and I have never been happier',
          showDarling: groupName() + ' winning the same show AGAIN. the stagehands know their coffee orders at this point. dynasty behavior',
          varietyMonster: idolName() + ' on variety is appointment television now. the group is great but the PANEL CLIPS are how I got here, honestly',
          nationalMC: idolName() + ' opening the broadcast every week like it’s nothing. mic control is a talent and the general public has noticed',
          ostVoice: 'heard the OST in a café, in a cab, and in my own head at 2am. ' + idolName() + '’s voice has achieved public-infrastructure status',
          catalogRevival: groupName() + ' has an OLD song charting again and honestly? the catalog era is the best era. dig, children, dig. the vault provides',
          lastChanceDebut: idolName() + ' debuting after YEARS of training is the arc I am most emotionally invested in this quarter. the evaluation-board survivor. cinema',
          biggerThan: idolName() + ' outgrowing the frame of every group photo and the trades finally said it out loud. the discourse is INSUFFERABLE and I am participating hourly',
          archRivals: 'the rivalry chart-week threads have SPREADSHEETS now. two fandoms doing forensic accounting at each other while the rest of us eat popcorn in the quote posts',
          festivalIcons: groupName() + ' and a festival field is simply a canon pairing now. golden hour, wind machine courtesy of actual wind, twenty thousand backup singers',
          varietyGroup: groupName() + ' booking more panels than stages this quarter and honestly? the range. the music funds the comedy empire and I respect the business model',
          ostFactory: 'a drama got announced and the comment section is already casting ' + groupName() + ' for the OST. that is what a reputation IS',
          regionStronghold: groupName() + ' really has a whole second home market now. the fan-sub accounts post before the company does. globalization won',
          conceptIdentity: groupName() + ' hearing one synth note and knowing EXACTLY what era it is… consistency is a superpower and they have it',
        };
        posts.push(KP.fillPro(m[n.narKey] || (state.company.short + ' discourse hours. we live here now'),
          state.people[n.narSubjectId] || null));
      }
    });
    return posts;
  }

  // The ambient pool (rebuilt v0.6.3, owner: "I'm still often only
  // seeing 1 or 2 new posts each week — really flesh that out"): every
  // category CONTRIBUTES every week; the fill loop below draws as many
  // as the week needs. The feed never goes quiet again.
  function ambientPosts(state, rng) {
    const posts = [];
    // always-on timeline chatter (v0.7.3): the scene talks even on the
    // quietest week — these two guarantee the raised floor holds
    posts.push(rng.pick([
      { persona: 'casual', text: 'weekly reminder that following this industry is a part-time job with no pay and I keep showing up early' },
      { persona: 'fan', text: 'cleaning my camera roll and it is 90% stage screenshots. no regrets. some archives curate themselves' },
      { persona: 'casual', text: 'the group chat is arguing about title tracks again. day ' + (state.week % 100) + '. nobody has been right yet' },
    ]));
    posts.push(rng.pick([
      { persona: 'stan', text: 'streaming schedule posted. hydration schedule posted. we are ORGANIZED this comeback season' },
      { persona: 'press', text: 'Weekly desk note: the fourth-generation calendar has no quiet weeks anymore. The scene simply does not stop.' },
      { persona: 'fan', text: 'thinking about the trainee era clips again. they were BABIES. growth makes me emotional on a schedule' },
    ]));
    // a hyped trainee the internet has found
    const hyped = state.roster.map(id => state.people[id])
      .filter(p => p.status === 'trainee' && (p.hype || 0) >= KP.C.FEED.hypePostMin)
      .sort((a, b) => (b.hype || 0) - (a.hype || 0))[0];
    if (hyped && rng.chance(0.6)) {
      posts.push(rng.pick([
        'who IS the trainee in ' + state.company.short + '’s latest practice clip. I need a name, a debut date, and a fancam, in that order',
        KP.fillPro(KP.displayName(hyped) + ' from ' + state.company.short + '’s trainee showcase is all over my timeline. debut {her}. today.', hyped),
        'I saw one 12-second clip of ' + KP.displayName(hyped) + ' and now I check ' + state.company.short + '’s account daily. this is fine.',
      ]));
    }
    // chart battle: player and rival both near the top
    const top = KP.chartPositions(state).slice(0, 5);
    const mine = top.find(e => e.isPlayer);
    const theirs = top.find(e => !e.isPlayer);
    if (mine && theirs && rng.chance(0.5)) {
      posts.push('“' + mine.title + '” vs “' + theirs.title + '” for the top spot this week. do not text me, I’m streaming');
    }
    // bias chatter about a debuted act
    const acts = KP.groups(state).filter(g => g.debuted);
    if (acts.length && rng.chance(0.7)) {
      const g = rng.pick(acts);
      const member = state.people[rng.pick(g.members)];
      const lastRelease = (g.releases || [])[Math.max(0, (g.releases || []).length - 1)];
      if (member) {
        posts.push(rng.pick([
          'daily reminder that ' + KP.displayName(member) + ' is the most underrated member of ' + g.name + '. the vocals are right there',
          KP.displayName(member) + '’s fancams from the ' + (lastRelease ? '“' + lastRelease.songTitle + '” era' : 'last era') + ' still live in my head rent free',
          g.name + ' could release a recording of a washing machine and I would stream it. loyalty.',
          'my bias in ' + g.name + ' changes weekly and this week it is ' + KP.displayName(member) + '. no further questions',
        ]));
      }
    }
    // the standing conversation: living narratives resurface (v0.6.0) —
    // the fourth viral fancam reinforces a reputation, it never surprises
    const live = KP.liveNarratives(state);
    if (live.length) {
      const n = rng.pick(live);
      const idolName = () => { const p = state.people[n.subjectId]; return p ? KP.displayName(p) : 'her'; };
      const groupName = () => (KP.groupById(state, n.subjectId) || { name: 'them' }).name;
      const m = {
        vocalHouse: '“who does vocal lines like ' + state.company.short + '” nobody. that’s the post',
        performanceHouse: 'putting on old ' + state.company.short + ' stage cams to feel something. the sync is medicinal',
        starMaker: state.company.short + ' really keeps finding The One every cycle. scouting team raise NOW',
        hitFactory: 'thinking about how ' + state.company.short + ' just… doesn’t miss with girl groups. unmatched',
        monsterRookies: 'remember when ' + groupName() + ' debuted and immediately ate. monster rookie behavior only',
        underperformed: 'the ' + groupName() + ' underperformance discourse is BACK on my timeline. let them cook',
        dormant: 'day ' + Math.max(1, (state.week - ((n.meta && n.meta.since) || state.week)) * 7) + ' of no ' + groupName() + ' comeback. I am but a shell',
        fancamStar: 'the ' + idolName() + ' fancam industrial complex remains undefeated',
        itGirl: idolName() + ' walked through ONE airport and my whole feed is fashion analysis. it-girl gravity is real',
      };
      if (m[n.key]) posts.push(m[n.key]);
    }

    // rival act opinions — the fans have them, loudly
    const rivalActs = [];
    (state.rivals || []).forEach(r => (r.acts || []).forEach(a => { if (!a.retired) rivalActs.push({ a, r }); }));
    if (rivalActs.length) {
      const pick = rng.pick(rivalActs);
      posts.push(rng.pick([
        'I know ' + pick.a.name + ' has their fans but every title track sounds like the same demo with new synths. ' + pick.r.short + ' plays it so safe',
        pick.a.name + '’s b-sides are consistently better than their singles and it drives me insane. ' + pick.r.short + ', hire whoever sequences the albums',
        'thinking about ' + pick.a.name + '’s first showcase again. they’ve come so far and I’m weirdly proud',
      ]));
    }

    // national-pool stanning: the wider world has fandoms too (v0.6.3)
    const natTop = KP.nationalPositions(state).slice(0, 8);
    if (natTop.length) {
      const e = rng.pick(natTop);
      posts.push(rng.pick([
        '“' + e.title + '” has lived at the top of the national chart so long it pays rent. ' + e.act + ' supremacy',
        'me pretending to be surprised ' + e.act + ' is charting again. the b-side is my roman empire',
        'national chart check: ' + e.act + ' still there. some things you can rely on in this economy',
      ]));
    }

    // trainee-watch culture: the building itself is content (v0.6.3)
    if (state.roster.length) {
      posts.push(rng.pick([
        state.company.short + ' practice-room lights on past 1am again. the pre-debut grind is undefeated content',
        'the ' + state.company.short + ' trainee showcase clips are circulating in the niche corners again. we see everything',
        'monthly reminder that trainee-watching is a legitimate hobby and ' + state.company.short + ' is appointment viewing',
      ]));
    }

    // discography throwbacks: the catalog is a conversation (v0.6.3)
    const withReleases = KP.groups(state).filter(g => (g.releases || []).length);
    if (withReleases.length) {
      const g = rng.pick(withReleases);
      const rel = rng.pick(g.releases);
      posts.push(rng.pick([
        '“' + rel.songTitle + '” by ' + g.name + ' deserved more. this is a justice account now',
        'the way “' + rel.songTitle + '” still goes THAT hard. ' + g.name + ' catalog appreciation hours',
        'first listen of “' + rel.songTitle + '” today. where was everyone hiding ' + g.name,
      ]));
    }

    // company-account snark and fandom smalltalk: the timeline breathes
    posts.push(rng.pick([
      state.company.short + '’s admin posts once a week like it costs them money. the fans run the promo around here',
      'chart refresh day tomorrow. hydrate, charge your phones, mind your streaks',
      'the group chat is arguing about line distribution again. some things are eternal',
      'no schedule today so I’m rewatching old stages and feeling things. healthy fandom behavior',
      'the ' + state.company.short + ' lightstick concept thread is 400 replies deep and the company has announced NOTHING. we simply built it ourselves',
    ]));
    return posts;
  }

  // The weekly feed pass. weekNotes = the notes advanceWeek generated this
  // week (the feed reacts to what actually got reported). Posts are stored
  // once and never re-rolled — Law 2 applies to the feed too.
  KP.feedWeek = function (state, rng, weekNotes) {
    const F = KP.C.FEED;
    state.feed = state.feed || [];
    const candidates = [];

    // 1. player releases resolved this week — always leads
    KP.groups(state).forEach(g => {
      if (g.results && g.results.week === state.week) {
        candidates.push.apply(candidates, releasePosts(state, g, rng));
      }
    });
    // 1b. live storms speak for themselves (v0.6.2)
    KP.liveDiscourses(state).forEach(d => {
      if (rng.chance(KP.C.DISCOURSE.postChance)) {
        candidates.push(discoursePost(state, d, rng));
      }
    });
    // the countdown (v0.9.19): announced eras lead the week's timeline
    if (KP.teaserPosts) candidates.push.apply(candidates, KP.teaserPosts(state));
    // 2. industry events this week
    candidates.push.apply(candidates, rivalEventPosts(state, weekNotes || [], rng));
    // the bubble (v0.7.1): her side of the screen, screenshotted
    candidates.push.apply(candidates, KP.bubblePosts(state));
    // the timeline (v0.7.3): selca days, biased regulars, idol moments
    candidates.push.apply(candidates, KP.lifePosts(state));
    // 3. ambient chatter fills EVERY week to a real feed (v0.6.3):
    //    events lead, but the timeline always has at least weeklyMin
    const ambient = ambientPosts(state, rng);
    const target = Math.min(F.weeklyMax, Math.max(F.weeklyMin, candidates.length + 2));
    while (candidates.length < target && ambient.length) {
      const idx = Math.floor(rng.next() * ambient.length);
      candidates.push(ambient.splice(idx, 1)[0]);
    }

    const chosen = candidates.slice(0, F.weeklyMax);
    const usedHandles = new Set();
    // newest first, but keep this week's posts in build order
    const thisWeek = [];
    for (let i = chosen.length - 1; i >= 0; i--) {
      const p = fanPost(state, rng, usedHandles, chosen[i]);
      thisWeek.push(p);
      state.feed.unshift(p);
    }
    // quote chains (v0.9.7, §32): the timeline talks to itself — some
    // weeks a post gets picked up and quoted, and the reply rides above
    // the original with its handle attached
    if (thisWeek.length >= 2 && thisWeek.length < F.weeklyMax &&
        rng.chance(KP.C.FEED.quoteChance)) {
      const src = thisWeek[rng.int(0, thisWeek.length - 1)];
      const QUOTES = {
        fan: ['this post is doing numbers for a REASON. anyway quote-posting so my whole timeline sees it',
          'the replies under this are a community event. bring snacks'],
        stan: ['quoting to say: correct. louder for the general public in the back',
          'this post walked so my seventeen-tweet thread could run'],
        casual: ['saw this quoted five times before I saw the original. that is how you know it is true',
          'the quote-posts on this are funnier than the post and the post is already funny'],
        press: ['Screenshotted and circulating well beyond fandom spaces now.',
          'This is the post the recap accounts will cite tomorrow.'],
        anti: ['not the quote-posts acting like this is news. we been said this'],
      };
      const qp = pickPersona(rng);
      const pool = QUOTES[qp] || QUOTES.casual;
      state.feed.unshift({
        week: state.week,
        handle: KP.genFanHandle(rng, usedHandles),
        persona: qp,
        quotes: src.handle,
        text: pool[rng.int(0, pool.length - 1)],
        likes: Math.max(2, Math.round((src.likes || 10) * (0.4 + rng.next()))),
      });
    }
    if (state.feed.length > F.maxPosts) state.feed.length = F.maxPosts;
    return chosen.length;
  };
})(typeof window !== 'undefined' ? window : globalThis);
