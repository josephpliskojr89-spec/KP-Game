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
  KP.chartStamp = function (state) {
    KP.chartPositions(state).forEach((e, i) => {
      e.lastPos = e.pos;
      e.pos = i + 1;
      if (e.peakPos == null || e.pos < e.peakPos) e.peakPos = e.pos;
    });
  };

  // ---- crowding: releasing into a busy week costs reception -------------
  KP.crowdPenalty = function (state) {
    const I = KP.C.INDUSTRY;
    return Math.min(I.crowdPenaltyMax, (state.rivalReleasesThisWeek || 0) * I.crowdPenaltyPer);
  };

  // ---- rival acts: debuts, comebacks, aging -----------------------------
  function actQuality(prestige, rng) {
    return Math.round(KP.clamp(prestige * 0.55 + 28 + rng.normal(0, KP.C.INDUSTRY.actQualityNoise), 20, 92));
  }

  function rivalRelease(state, rival, act, rng, isDebut) {
    const I = KP.C.INDUSTRY;
    const title = KP.genSongTitle(rng, usedTitles(state));
    const reception = Math.round(KP.clamp(
      act.quality * 0.85 + act.popularity * 0.15 + rng.normal(0, I.releaseNoiseSd) - 6, 1, 100));
    act.popularity = isDebut
      ? KP.clamp(Math.round(10 + reception * 0.7), 0, 100)
      : KP.clamp(Math.round(act.popularity * 0.55 + reception * 0.5), 0, 100);
    act.lastReleaseWeek = state.week;
    act.cycleWeeks = rng.int(I.cycleWeeks[0], I.cycleWeeks[1]);
    act.releases = act.releases || [];
    act.releases.push({ week: state.week, title, reception, isDebut: !!isDebut });
    rival.prestige = KP.clamp(rival.prestige + (reception - 55) * 0.06, 5, 95);
    KP.chartEnter(state, {
      title, act: act.name, company: rival.short, isPlayer: false,
      score: reception + act.popularity * 0.2, entered: state.week,
    });
    state.rivalReleasesThisWeek = (state.rivalReleasesThisWeek || 0) + 1;
    return { title, reception };
  }

  function pushMove(rival, text) {
    rival.recentMoves = (rival.recentMoves || []).concat([text]).slice(-4);
  }

  KP.industryWeek = function (state, rng) {
    const I = KP.C.INDUSTRY;
    const notes = [];
    state.chart = state.chart || { entries: [] };
    chartTick(state);
    state.rivalReleasesThisWeek = 0;

    (state.rivals || []).forEach(rival => {
      rival.acts = rival.acts || [];
      if (rng.chance(I.scoutIntake)) rival.rosterCount = Math.min(30, (rival.rosterCount || 0) + 1);

      // a scheduled debut, if the trainee room can field one
      if (state.week >= (rival.nextDebutWeek || Infinity) && (rival.rosterCount || 0) >= I.debutTraineeCost) {
        const used = usedActNames(state);
        const concept = rng.pick(KP.C.CONCEPTS);
        const act = {
          name: KP.genGroupName(rng, used), concept: concept.id,
          quality: actQuality(rival.prestige, rng), popularity: 0,
          debutWeek: state.week, lastReleaseWeek: state.week,
          cycleWeeks: rng.int(I.cycleWeeks[0], I.cycleWeeks[1]),
          releases: [], retired: false,
        };
        rival.acts.push(act);
        rival.rosterCount -= I.debutTraineeCost;
        rival.nextDebutWeek = state.week + rng.int(I.debutInterval[0], I.debutInterval[1]) +
          Math.round(Math.max(0, 70 - rival.prestige) / 4);
        const rel = rivalRelease(state, rival, act, rng, true);
        pushMove(rival, 'Debuted ' + act.name);
        notes.push({ kind: 'industry', ind: 'rivalDebut', actName: act.name, company: rival.short,
          text: rival.short + ' debuted ' + act.name + ' today — ' + concept.label.toLowerCase() +
            ' concept, leading with “' + rel.title + '”. ' +
            (rel.reception >= 64 ? 'The showcase is getting real traction. They will be in our lane by Friday.'
              : rel.reception >= 48 ? 'A competent launch. Watch the follow-up.'
              : 'The launch landed quietly. Even so, the calendar just got more crowded.') });
        return;
      }

      // comeback cycles and aging for existing acts
      rival.acts.forEach(act => {
        if (act.retired) return;
        if (state.week >= act.lastReleaseWeek + act.cycleWeeks) {
          const rel = rivalRelease(state, rival, act, rng, false);
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
          const act = {
            name: KP.genGroupName(rng, usedActNames(state)), concept: concept.id,
            quality: actQuality(r.prestige, rng),
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
  function fanPost(state, rng, usedHandles, text) {
    const viral = rng.chance(KP.C.FEED.viralChance);
    return {
      week: state.week,
      handle: KP.genFanHandle(rng, usedHandles),
      text,
      likes: viral ? rng.int(400, 6000) : rng.int(2, 60),
    };
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
      }
    });
    return posts;
  }

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
    // rival act opinions — the fans have them, loudly
    const rivalActs = [];
    (state.rivals || []).forEach(r => (r.acts || []).forEach(a => { if (!a.retired) rivalActs.push({ a, r }); }));
    if (rivalActs.length && rng.chance(0.4)) {
      const pick = rng.pick(rivalActs);
      posts.push(rng.pick([
        'I know ' + pick.a.name + ' has their fans but every title track sounds like the same demo with new synths. ' + pick.r.short + ' plays it so safe',
        pick.a.name + '’s b-sides are consistently better than their singles and it drives me insane. ' + pick.r.short + ', hire whoever sequences the albums',
        'thinking about ' + pick.a.name + '’s first showcase again. they’ve come so far and I’m weirdly proud',
      ]));
    }
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
    // 2. industry events this week
    candidates.push.apply(candidates, rivalEventPosts(state, weekNotes || [], rng));
    // 3. ambient chatter fills quiet weeks
    const ambient = ambientPosts(state, rng);
    if (candidates.length) {
      if (ambient.length && candidates.length < F.weeklyMax) candidates.push(ambient[0]);
    } else if (ambient.length && rng.chance(F.ambientChance)) {
      candidates.push.apply(candidates, ambient.slice(0, 2));
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
