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
    const used = new Set();
    KP.groups(state).forEach(g => used.add(g.name.toLowerCase()));
    (state.rivals || []).forEach(r => (r.acts || []).forEach(a => used.add(a.name.toLowerCase())));
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
  function castMembers(state, rival, rng, ageRange) {
    const I = KP.C.INDUSTRY;
    const size = rng.int(I.actSize[0], I.actSize[1]);
    const inActs = new Set();
    (state.rivals || []).forEach(r => (r.acts || []).forEach(a =>
      (a.members || []).forEach(id => inActs.add(id))));
    // the people they signed — best first; they were signed to be used
    const signees = Object.values(state.people)
      .filter(p => p.status === 'rival' && p.company === rival.short && !inActs.has(p.id))
      .sort((a, b) => peakTalent(b) - peakTalent(a));
    const members = signees.slice(0, size).map(p => p.id);
    // fill the lineup from the in-house trainee floor
    const usedNames = new Set(Object.values(state.people).map(x => x.name.given.toLowerCase()));
    KP.resetIds(state.nextPersonId || KP.peekNextId());
    while (members.length < size) {
      const p = KP.generatePerson(rng, { status: 'rival', source: 'In-house trainee',
        usedNames, age: rng.int(ageRange[0], ageRange[1]) });
      p.company = rival.short;
      p.flags.rivalNative = true;
      state.people[p.id] = p;
      KP.socialOf(state, p);   // minted at the door, not on first look
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

  function rivalRelease(state, rival, act, rng, isDebut) {
    const I = KP.C.INDUSTRY;
    const title = KP.genSongTitle(rng, usedTitles(state));
    const statureBefore = act.popularity;   // battle-worthiness is who they WERE (v0.6.4)
    const reception = Math.round(KP.clamp(
      act.quality * 0.85 + act.popularity * 0.15 + rng.normal(0, I.releaseNoiseSd) - 6, 1, 100));
    act.popularity = isDebut
      ? KP.clamp(Math.round(10 + reception * 0.7), 0, 100)
      : KP.clamp(Math.round(act.popularity * 0.55 + reception * 0.5), 0, 100);
    act.lastReleaseWeek = state.week;
    act.cycleWeeks = rng.int(I.cycleWeeks[0], I.cycleWeeks[1]);
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
      if (rng.chance(I.scoutIntake)) rival.rosterCount = Math.min(30, (rival.rosterCount || 0) + 1);

      // a scheduled debut, if the trainee room can field one
      if (state.week >= (rival.nextDebutWeek || Infinity) && (rival.rosterCount || 0) >= I.debutTraineeCost) {
        // the copycat reveal (v0.6.4): a trend chaser that clocked one of
        // our hits debuts its next group wearing OUR concept
        const stolen = rival.copyConcept ? KP.conceptById(rival.copyConcept.conceptId) : null;
        const concept = stolen || rng.pick(KP.C.CONCEPTS);
        const members = castMembers(state, rival, rng, I.memberDebutAge);
        const act = {
          id: newActId(state),
          name: KP.genGroupName(rng, usedActNames(state)), concept: concept.id,
          quality: actQualityFromMembers(state, members, rival.prestige, rng),
          members, popularity: 0,
          debutWeek: state.week, lastReleaseWeek: state.week,
          cycleWeeks: rng.int(I.cycleWeeks[0], I.cycleWeeks[1]),
          releases: [], retired: false,
        };
        rival.acts.push(act);
        rival.nextDebutWeek = state.week + rng.int(I.debutInterval[0], I.debutInterval[1]) +
          Math.round(Math.max(0, 70 - rival.prestige) / 4);
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
        if (state.week >= act.lastReleaseWeek + act.cycleWeeks) {
          const rel = rivalRelease(state, rival, act, rng, false);
          (rel.narNotes || []).forEach(n => notes.push(n));
          pushMove(rival, act.name + ' comeback');
          if (rel.reception >= I.comebackNoteMin) {
            notes.push({ kind: 'industry', ind: 'rivalHit', actName: act.name, company: rival.short,
              songTitle: rel.title,
              text: act.name + '’s “' + rel.title + '” is everywhere this week. ' + rival.short +
                ' will be insufferable about it, and the music shows just got harder to win.' });
          }
        } else {
          act.popularity = Math.max(0, act.popularity - I.actPopDecay);
          const age = state.week - act.debutWeek;
          if (act.popularity < I.disbandFloorPop && age > I.disbandMinAgeWeeks && rng.chance(I.disbandChance)) {
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
          }
        }
      });
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
      const starved = rivals.find(r => r.prestige < I.collapsePrestige && !(r.acts || []).some(a => !a.retired));
      if (starved) {
        (starved.acts || []).forEach(a => { a.retired = true; });
        state.rivals = rivals.filter(r => r !== starved);
        bump();
        notes.push({ kind: 'industry', urgent: false, ind: 'collapse', company: starved.short,
          text: starved.name + ' has ceased operations. Overnight, their trainees are free agents and their office lease is a cautionary tale. This industry does not do gentle exits.' });
      }
    }

    // merge: two struggling companies pool what is left
    if ((state.rivals || []).length >= 4 && rng.chance(I.mergeChance)) {
      const sorted = state.rivals.slice().sort((a, b) => a.prestige - b.prestige);
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
          const members = castMembers(state, r, rng, [17, 24]);
          const act = {
            id: newActId(state),
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
    return {
      week: state.week,
      handle: KP.genFanHandle(rng, usedHandles),
      persona,
      text,
      likes: viral ? rng.int(400, 6000) : rng.int(2, 60),
    };
  }

  // live storms post themselves (v0.6.2) — sentiment-colored, persona-true
  function discoursePost(state, d, rng) {
    const who = d.subjectType === 'idol'
      ? (state.people[d.subjectId] ? KP.displayName(state.people[d.subjectId]) : 'her')
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
        { persona: 'fan', text: who + ' pulled from schedules… hope she is actually resting and not just hidden. companies lie about this constantly' },
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
        'new bias alert: ' + bn + '. the way she owns the second chorus of “' + demoTitle + '”… I’ve watched the fancam nine times',
        bn + ' smiled at the camera for 0.8 seconds during the “' + demoTitle + '” encore and I’ve been thinking about it all day. hope she’s getting enough rest',
        'day one of ' + bn + ' being my favorite and it is already going great',
      ]));
    }
    if (r.centerOvershadowed && bn) {
      const center = state.people[g.roles.center];
      posts.push('the company keeps centering ' + (center ? KP.displayName(center) : 'her') +
        ' but the public voted with the fancam views. eyes on ' + bn + ', ' + state.company.short + '. we see her even if you don’t.');
    }
    if ((r.crowd || 0) >= 5) {
      posts.push(g.name + ' really dropped the same week as half the industry. my streaming schedule is a two-front war');
    }
    return posts;
  }

  function rivalEventPosts(state, weekNotes, rng) {
    const posts = [];
    weekNotes.forEach(n => {
      if (n.ind === 'rivalDebut') {
        posts.push(rng.pick([
          n.company + ' debuted ' + n.actName + ' today. verdict: actually?? kind of good?? watch this space',
          'watched ' + n.actName + '’s debut stage three times. ' + n.company + ' finally hired a good creative director',
          'another debut, another lightstick I have to pretend I’m not going to buy. welcome, ' + n.actName,
        ]));
      } else if (n.ind === 'rivalHit') {
        posts.push(rng.pick([
          n.actName + '’s new one is everywhere and I’m not even mad. a win for girl groups is a win for girl groups',
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
        posts.push({ persona: 'fan', text: 'the fan-sign clip of ' + (p ? KP.displayName(p) : 'her') +
          ' with the crying fan… this is why we stay. protect her at all costs' });
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
          itGirl: idolName() + ' is entering her it-girl era and the brands are going to figure it out any day now',
          dateSniper: coName() + ' has officially made a HOBBY of dropping releases on other people’s dates. the audacity is almost impressive. almost',
          rivalry: 'the ' + actName() + ' rivalry is canon now. every shared release week is a pay-per-view event and I have never been happier',
          showDarling: groupName() + ' winning the same show AGAIN. the stagehands know their coffee orders at this point. dynasty behavior',
          regionStronghold: groupName() + ' really has a whole second home market now. the fan-sub accounts post before the company does. globalization won',
          conceptIdentity: groupName() + ' hearing one synth note and knowing EXACTLY what era it is… consistency is a superpower and they have it',
        };
        posts.push(m[n.narKey] || (state.company.short + ' discourse hours. we live here now'));
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
    // a hyped trainee the internet has found
    const hyped = state.roster.map(id => state.people[id])
      .filter(p => p.status === 'trainee' && (p.hype || 0) >= KP.C.FEED.hypePostMin)
      .sort((a, b) => (b.hype || 0) - (a.hype || 0))[0];
    if (hyped && rng.chance(0.6)) {
      posts.push(rng.pick([
        'who IS the trainee in ' + state.company.short + '’s latest practice clip. I need a name, a debut date, and a fancam, in that order',
        KP.displayName(hyped) + ' from ' + state.company.short + '’s trainee showcase is all over my timeline. debut her. today.',
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
    // 2. industry events this week
    candidates.push.apply(candidates, rivalEventPosts(state, weekNotes || [], rng));
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
    for (let i = chosen.length - 1; i >= 0; i--) {
      state.feed.unshift(fanPost(state, rng, usedHandles, chosen[i]));
    }
    if (state.feed.length > F.maxPosts) state.feed.length = F.maxPosts;
    return chosen.length;
  };
})(typeof window !== 'undefined' ? window : globalThis);
