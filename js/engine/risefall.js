/* The rise and fall (v0.9.24, §55.10 + §55.12 + being poached, map
   slot 9) — "rival labels don't ever seem to do anything but exist
   below me." The scene gets a memory and a pulse: rival ERAS worn on
   their cards (rising / imperial / fading), the trades' annual POWER
   RANKING with the overtake written up, a COLLAPSE that mints a
   free-agent signing class with careers and opinions, the imperial
   rival's JOB OFFER (the founding's mirror, played against you),
   NAMED GENERATIONS the world declares when the wave turns — and the
   rival world's boys pay the service tax too. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.riseFallLedger = state.riseFallLedger ||
      { rankings: 0, overtakes: 0, playerNo1: 0, classes: 0, faSigned: 0,
        offers: 0, leveraged: 0, genTurns: 0, torchPasses: 0, rivalServices: 0 };
    return state.riseFallLedger;
  }
  function woy(state) { return ((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1; }
  function yearOf(state) { return Math.floor((state.week - 1) / KP.C.WEEKS_PER_YEAR) + 1; }
  function ordinal(n) {
    return n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd'
      : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
  }
  function flagshipOf(rival) {
    return (rival.acts || []).filter(a => !a.retired)
      .sort((x, y) => (y.popularity || 0) - (x.popularity || 0))[0] || null;
  }

  // ---- the eras: rising / imperial / fading, read from the trend ------
  KP.rivalEra = function (state, r) {
    const RF = KP.C.RISEFALL;
    if ((r.prestige || 0) >= RF.imperialAt) return 'imperial';
    const trail = r.eraTrail || [];
    const old = trail.length ? trail[0].p : r.prestige;
    const delta = (r.prestige || 0) - old;
    if ((r.prestige || 0) <= RF.fadingBelow || delta <= RF.fadingDelta) return 'fading';
    if (delta >= RF.risingDelta && (r.prestige || 0) >= RF.risingFloor) return 'rising';
    return 'steady';
  };
  KP.eraWord = function (era) {
    return era === 'imperial' ? 'imperial era'
      : era === 'rising' ? 'on the rise'
      : era === 'fading' ? 'fading' : 'holding steady';
  };

  // ---- the ranking: one number the whole industry argues about --------
  function rivalScore(r) {
    const flag = flagshipOf(r);
    return (r.prestige || 0) * 0.8 + (flag ? (flag.popularity || 0) : 0) * 0.45;
  }
  function playerScore(state) {
    const pops = KP.groups(state).filter(g => g.debuted && !g.retiredWeek)
      .map(g => g.popularity || 0).sort((a, b) => b - a);
    const daesangs = (state.awardHistory || [])
      .filter(w => w.isPlayer && w.category === 'daesang').length;
    return (pops[0] || 0) + (pops[1] || 0) * 0.4 + (state.trust || 0) * 0.35 + daesangs * 4;
  }
  KP.powerRankingNow = function (state) {
    const rows = (state.rivals || []).map(r => ({
      short: r.short, name: r.name, isPlayer: false, score: Math.round(rivalScore(r)) }));
    rows.push({ short: state.company.short, name: state.company.name,
      isPlayer: true, score: Math.round(playerScore(state)) });
    rows.sort((a, b) => b.score - a.score);
    rows.forEach((row, i) => { row.rank = i + 1; });
    return rows;
  };

  // ---- the collapse fallout: the signing class ------------------------
  // Called from industryLifecycle the week a starved company folds.
  KP.mintFreeAgents = function (state, folded, notes) {
    const RF = KP.C.RISEFALL;
    const peak = p => Math.max(p.talents.vocals.cur, p.talents.dance.cur,
      p.talents.charisma.cur);
    const named = Object.values(state.people)
      .filter(p => p.status === 'rival' && p.company === folded.short)
      .filter(p => p.age <= RF.freeAgentAgeMax)
      .sort((a, b) => (peak(b) + KP.socialOf(state, b) / 20000) -
                      (peak(a) + KP.socialOf(state, a) / 20000))
      .slice(0, RF.freeAgentMax);
    if (!named.length) return;
    state.freeAgents = state.freeAgents || [];
    named.forEach(p => {
      p.flags.freeAgent = folded.short;
      state.freeAgents.push({ personId: p.id, until: state.week + RF.freeAgentWindow,
        from: folded.short });
      p.history.push({ week: state.week, text: folded.short + ' folded under ' +
        (p.gender === 'm' ? 'him' : 'her') + '. Free agent, with a career in a bag and a fandom holding its breath.' });
    });
    ledger(state).classes++;
    notes.push({ kind: 'industry', ind: 'signingClass', priority: 'high',
      text: 'The ' + folded.short + ' collapse has a second act: ' +
        named.map(p => KP.displayName(p)).join(', ') +
        (named.length === 1 ? ' is' : ' are') + ' on the open market — trained careers, real fandoms, and every label in the scene doing the same math you are. The signing window will not stay open long. Free agents are on the Industry desk.' });
  };

  // ---- the player verb: sign a name with a career ---------------------
  KP.freeAgentCost = function (state, p) {
    const RF = KP.C.RISEFALL;
    const fame = Math.min(4, Math.floor(KP.socialOf(state, p) / 150000));
    let cost = RF.faCostBase + fame * RF.faCostPerFame;
    // the heir's money (v0.9.31): a bankrolled bidder in the room
    // reprices every career on the market — signing against a fortune
    if ((state.rivals || []).some(r => r.bankroll && state.week <= r.bankroll.until)) {
      cost *= KP.C.SAGA.HEIR.faInflate;
    }
    return Math.round(cost);
  };
  KP.signFreeAgent = function (state, personId) {
    const entry = (state.freeAgents || []).find(f => f.personId === personId &&
      state.week <= f.until);
    const p = state.people[personId];
    if (!entry || !p) return { ok: false, reason: 'That window has closed. The market moves fast when careers are on it.' };
    const cost = KP.freeAgentCost(state, p);
    if (state.budget < cost) return { ok: false, reason: 'Signing ' + KP.displayName(p) + ' runs ' + cost + ' — a career has a price. The budget says no.' };
    state.budget -= cost;
    state.freeAgents = state.freeAgents.filter(f => f !== entry);
    delete p.flags.freeAgent;
    p.flags.veteran = entry.from;   // the file never forgets the first house
    p.status = 'trainee';           // re-training into OUR machine, briefly
    p.company = state.company.short;
    p.signedWeek = state.week;
    p.traineeContract = { start: state.week, years: KP.C.TRAINEE_CONTRACT.years, term: 1 };
    state.roster.push(p.id);
    ledger(state).faSigned++;
    const warm = (state.trust || 0) >= 55;
    p.history.push({ week: state.week, text: 'Signed with ' + state.company.short +
      ' off the open market — a second house, eyes open. ' +
      (warm ? 'The industry says this one keeps its promises. Time to find out.'
            : 'The industry says things about this company. Time to find out which are true.') });
    const note = KP.note(state, { kind: 'public', ind: 'faSigned', priority: 'high', personId: p.id,
      text: KP.fillPro(state.company.short + ' signed ' + KP.displayName(p) + ' off the ' + entry.from +
        ' collapse — a veteran with ' + KP.fmtCount(KP.socialOf(state, p)) + ' followers and opinions {she} has earned. The fandom {she} brought is already inspecting the building. ' +
        (warm ? 'Verdict so far: acceptable. Watched, but acceptable.'
              : 'Verdict so far: reserved. The receipts will decide.'), p) });
    return { ok: true, cost, note: note.text };
  };

  // ---- the weekly: trails, ranking, offer, generations, the service ----
  KP.registerWeekly('riseFall', 562, function (state, rng, inbox, roster, groups) {
    const RF = KP.C.RISEFALL;
    const led = ledger(state);

    // prestige trail: the trend the era read needs (about a half year)
    (state.rivals || []).forEach(r => {
      r.eraTrail = r.eraTrail || [];
      if (!r.eraTrail.length || state.week - r.eraTrail[r.eraTrail.length - 1].w >= RF.trailEvery) {
        r.eraTrail.push({ w: state.week, p: r.prestige || 0 });
        if (r.eraTrail.length > 4) r.eraTrail.shift();
      }
    });

    // ---- the free-agent market: windows close on their own ------------
    if (state.freeAgents && state.freeAgents.length) {
      state.freeAgents.slice().forEach(f => {
        if (state.week <= f.until) return;
        const p = state.people[f.personId];
        state.freeAgents = state.freeAgents.filter(x => x !== f);
        if (!p) return;
        delete p.flags.freeAgent;
        const buyers = (state.rivals || []);
        if (buyers.length) {
          const buyer = buyers[Math.floor(KP.hash01([state.seed, 'fa', f.personId].join('|')) * buyers.length)];
          p.company = buyer.short;
          p.history.push({ week: state.week, text: 'Signed with ' + buyer.short + ' while other desks deliberated. Careers do not wait politely.' });
          inbox.push({ kind: 'industry', personId: p.id,
            text: KP.fillPro(buyer.short + ' signed ' + KP.displayName(p) + ' off the open market while the rest of the scene ran valuations. The window was real, and now it is shut.', p) });
        }
      });
    }

    // ---- the annual power ranking (the trades' January issue) ---------
    if (woy(state) === RF.rankWeek && state.week > 4) {
      const rows = KP.powerRankingNow(state);
      const prev = state.powerRanking;
      rows.forEach(row => {
        const old = prev && prev.entries.find(e => e.short === row.short);
        row.delta = old ? old.rank - row.rank : 0;
      });
      state.powerRanking = { year: yearOf(state), entries: rows };
      led.rankings++;
      const top = rows[0];
      const me = rows.find(r => r.isPlayer);
      const prevTop = prev && prev.entries[0];
      let line = 'The trades published the annual power ranking. #1: ' + top.name +
        (top.isPlayer ? ' — that is us, in print, above every letterhead in the scene.' : '.') +
        ' We sit at #' + me.rank + ' of ' + rows.length +
        (me.delta > 0 ? ', up ' + me.delta + '.' : me.delta < 0 ? ', down ' + Math.abs(me.delta) + '.' : ', holding.');
      // the overtake: the top seat changing hands is the year's story
      if (prevTop && prevTop.short !== top.short) {
        if (top.isPlayer) {
          led.playerNo1++;
          line += ' The overtake is ours — ' + prevTop.name + ' held the seat last year and the trades spent three paragraphs on how it slipped.';
        } else if (prevTop.isPlayer) {
          led.overtakes++;
          line += ' And the seat we held is ' + top.short + '’s now. The piece calls it "the overtake" and quotes nobody from our building, which was a choice.';
        } else {
          led.overtakes++;
          line += ' ' + top.short + ' took the top seat from ' + prevTop.short + ' — the scene has a new weather system.';
        }
      } else if (top.isPlayer && !led.playerNo1) {
        led.playerNo1++;
      }
      inbox.push({ kind: 'industry', ind: 'powerRanking', priority: 'high', text: line });
    }

    // ---- the offer: the imperial house comes for YOU ------------------
    if (!state.founded && (state.trust || 0) >= RF.offerTrust &&
        state.week - (state.offerAskedWeek || -999) >= RF.offerCooldownWeeks &&
        !(state.scenes || []).some(sc => sc.kind === 'theOffer')) {
      const suitor = (state.rivals || []).find(r =>
        (r.prestige || 0) >= RF.offerPrestige && KP.rivalEra(state, r) === 'imperial');
      if (suitor && rng.chance(0.25)) {
        state.offerAskedWeek = state.week;
        led.offers++;
        KP.openScene(state, { kind: 'theOffer', company: suitor.short,
          expiresWeek: state.week + 3 });
        inbox.push({ kind: 'company', urgent: true,
          text: 'A courier envelope, heavy paper, ' + suitor.name + '’s letterhead: they want YOU. Not your acts, not your trainees — the person running this desk. The meeting is offered quietly, the way real offers always are. It is on the Desk, and it is the founding’s mirror held up to your face.' });
      }
    }

    // ---- named generations: stamps, landmarks, the torch, the turn ----
    state.gen = state.gen ||
      { n: RF.GEN.start, since: state.week - 2 * KP.C.WEEKS_PER_YEAR,   // mid-wave on arrival
        landmarks: [], torch: false };
    const gen = state.gen;
    // landmark debuts: this week's landings that arrived LOUD
    (state.weekReleases || []).forEach(wr => {
      if (wr.reception >= RF.GEN.landmarkReception) {
        const hit = KP.rivalActById(state, wr.actId);
        if (hit && hit.act.debutWeek >= state.week - 2) gen.landmarks.push(state.week);
      }
    });
    groups.forEach(g => {
      const rel = (g.releases || [])[g.releases ? g.releases.length - 1 : 0];
      if (rel && rel.week === state.week && rel.isDebut !== false && g.debutWeek === state.week &&
          (rel.reception || 0) >= RF.GEN.landmarkReception) gen.landmarks.push(state.week);
    });
    gen.landmarks = gen.landmarks.filter(w => state.week - w <= KP.C.WEEKS_PER_YEAR);
    // the torch pass: a rookie of THIS gen outsells the old guard, once per gen
    if (!gen.torch) {
      let rookieBest = (state.weekReleases || []).reduce((m, wr) => {
        const hit = KP.rivalActById(state, wr.actId);
        if (!hit || (hit.act.gen || RF.GEN.start) < gen.n) return m;
        if (state.week - hit.act.debutWeek > RF.GEN.rookieWeeks) return m;
        return wr.reception > (m ? m.reception : 0) ? { reception: wr.reception, name: wr.actName } : m;
      }, null);
      // the player's rookies carry torches too
      groups.forEach(g => {
        if (!g.debuted || (g.gen || RF.GEN.start) < gen.n) return;
        if (state.week - (g.debutWeek || 0) > RF.GEN.rookieWeeks) return;
        const rel = (g.releases || [])[(g.releases || []).length - 1];
        if (rel && rel.week === state.week &&
            (rel.reception || 0) > (rookieBest ? rookieBest.reception : 0)) {
          rookieBest = { reception: rel.reception, name: g.name };
        }
      });
      if (rookieBest) {
        const oldGuard = [];
        (state.rivals || []).forEach(r => (r.acts || []).forEach(a => {
          if (!a.retired && (a.gen || RF.GEN.start - 1) < gen.n && (a.popularity || 0) >= RF.GEN.oldGuardPop) {
            (a.releases || []).slice(-3).forEach(rel => {
              if (state.week - rel.week <= KP.C.WEEKS_PER_YEAR) oldGuard.push({ r: rel.reception, name: a.name });
            });
          }
        }));
        // the player's own veterans are old guard too — a legacy act
        // holding the fort does not exempt the house from history
        groups.forEach(g => {
          if (!g.debuted || g.retiredWeek || (g.gen || RF.GEN.start) >= gen.n) return;
          if ((g.popularity || 0) < RF.GEN.oldGuardPop) return;
          (g.releases || []).slice(-3).forEach(rel => {
            if (state.week - rel.week <= KP.C.WEEKS_PER_YEAR) oldGuard.push({ r: rel.reception, name: g.name });
          });
        });
        const guardBest = oldGuard.sort((a, b) => b.r - a.r)[0];
        if (guardBest && rookieBest.reception > guardBest.r) {
          gen.torch = true;
          led.torchPasses++;
          inbox.push({ kind: 'public', ind: 'torchPass', priority: 'high',
            text: 'The week the torch moved: ' + rookieBest.name + ' — gen-' + gen.n + ', barely out of the practice room — outsold ' + guardBest.name + '’s best week of the year. Nobody announced anything. Nobody had to. Every A&R floor in the city adjusted its slides by Friday.' });
        }
      }
    }
    // the turn: enough landmarks, the torch — or the old guard simply
    // GONE (the seven-year wall retires whole waves; when the last
    // prior-gen act leaves the stage, history closes the book itself)
    const genYears = (state.week - gen.since) / KP.C.WEEKS_PER_YEAR;
    const oldGuardActive =
      (state.rivals || []).some(r => (r.acts || []).some(a =>
        !a.retired && (a.gen || RF.GEN.start - 1) < gen.n)) ||
      groups.some(g => g.debuted && !g.retiredWeek && (g.gen || RF.GEN.start) < gen.n);
    if (genYears >= RF.GEN.minYears &&
        (gen.landmarks.length >= RF.GEN.landmarksToTurn || gen.torch || !oldGuardActive)) {
      const from = gen.n;
      state.gen = { n: from + 1, since: state.week, landmarks: [], torch: false };
      led.genTurns++;
      KP.note(state, { kind: 'public', ind: 'genTurned', priority: 'critical',
        text: 'The trades made it official, which means the fans made it official months ago: the ' +
          ordinal(from + 1) + ' generation has arrived. The gen-' + from + ' acts did not get worse — the weather changed, the debut classes landed different, and every group in the scene now carries a number it did not ask for. History does this without asking anybody.' });
    }
    // ambient gen-vs-gen chatter (the discourse the spec ordered)
    if (gen.n > RF.GEN.start && rng.chance(RF.GEN.talkChance)) {
      const older = gen.n - 1;
      state.feed = state.feed || [];
      state.feed.unshift({ week: state.week, handle: KP.genFanHandle(rng, new Set()),
        persona: rng.chance(0.5) ? 'stan' : 'casual',
        text: rng.pick([
          'the gen-' + older + ' sound is back on my playlists and I am not sorry. some eras just knew what a CHORUS was',
          'gen-' + gen.n + ' rookies have better training and worse b-sides than gen-' + older + ' and I will be taking no questions',
          'unpopular opinion: every generation says the next one is over-produced and every generation is a little bit right',
        ]) });
    }

    // ---- the rival service: their boys carry the window too -----------
    const M = KP.C.MIL, SV = RF.SERVICE;
    (state.rivals || []).forEach(r => {
      (r.acts || []).forEach(act => {
        if (act.retired || act.gender !== 'm') return;
        // transitions first: rotations and pauses end on schedule
        if (act.serviceRotation && state.week >= act.serviceRotation.until) {
          delete act.serviceRotation;
          (act.members || []).forEach(id => {
            const p = state.people[id];
            if (p && p.gender === 'm') { delete p.flags.military; p.serviceDone = state.week; }
          });
          inbox.push({ kind: 'industry', ind: 'rivalReturn', actName: act.name, company: r.short,
            text: act.name + ' is whole again — the rotation that kept them short-handed for two years is over, every member discharged. ' + r.short + ' has been saving a comeback date, and everyone knows what kind.' });
        }
        if (act.servicePause && state.week >= act.servicePause.until) {
          delete act.servicePause;
          act.returnPrimed = true;
          (act.members || []).forEach(id => {
            const p = state.people[id];
            if (p && p.gender === 'm') { delete p.flags.military; p.serviceDone = state.week; }
          });
          inbox.push({ kind: 'industry', ind: 'rivalReturn', actName: act.name, company: r.short,
            text: act.name + '’s service chapter closed on schedule — the gate photos, the coffee trucks, the fandom that ran a two-year countdown to the minute. ' + r.short + '’s next release is a RETURN, and returns punch.' });
        }
        if (act.servicePause) {
          act.popularity = Math.max(0, (act.popularity || 0) - SV.pauseCool);
          return;
        }
        if (act.serviceRotation) return;
        // the trigger: a man at the wall, and the act must answer
        const due = (act.members || []).map(id => state.people[id]).filter(Boolean)
          .find(p => p.gender === 'm' && p.age >= M.deadlineAge &&
            !p.serviceDone && !(p.flags && p.flags.military));
        if (!due) return;
        led.rivalServices++;
        if ((act.popularity || 0) >= SV.staggerPop) {
          act.serviceRotation = { until: state.week + M.serviceWeeks + SV.rotationTail };
          due.flags.military = { since: state.week, until: state.week + M.serviceWeeks };
          inbox.push({ kind: 'industry', ind: 'rivalEnlist', actName: act.name, company: r.short,
            text: KP.displayName(due) + ' of ' + act.name + ' enlists this week, first of the rotation — ' + r.short + ' chose the stagger, so the group holds the line short-handed while the members cycle through. The trades printed the two-year map of who is away when. The fandom laminated it.' });
        } else {
          act.servicePause = { until: state.week + M.serviceWeeks };
          (act.members || []).forEach(id => {
            const p = state.people[id];
            if (p && p.gender === 'm' && !p.serviceDone && p.age >= M.minTogetherAge) {
              p.flags.military = { since: state.week, until: state.week + M.serviceWeeks };
            }
          });
          inbox.push({ kind: 'industry', ind: 'rivalEnlist', actName: act.name, company: r.short,
            text: act.name + ' enlists TOGETHER — one statement from ' + r.short + ', a row of short haircuts, a group photo at the gate. The scene loses a whole act to the law for a while, and the wait economy gains one more fandom with a countdown.' });
        }
      });
    });
  });

  // ---- the offer scene: the founding's mirror --------------------------
  KP.registerScene('theOffer', {
    title: (state, sc) => sc.company + ' · the offer',
    body: (state, sc) => {
      const r = (state.rivals || []).find(x => x.short === sc.company);
      return (r ? r.name : sc.company) + ' is at the top of the power ranking and hiring like it intends to stay there — and the role on the table is yours: run their operation, their budget, their imperial-era machine. The number is flattering. The office has a view. Everything you built here stays here, because that is how these deals work. The industry has exactly two respectable answers, and both of them are leverage if you hold them right.';
    },
    options: () => [
      { id: 'decline', label: 'Decline — this house is the project' },
      { id: 'leverage', label: 'Put the letter on the board’s table' },
    ],
    resolve: (state, sc, optionId) => {
      const RF = KP.C.RISEFALL;
      if (optionId === 'leverage') {
        ledger(state).leveraged++;
        state.budget += RF.leverageBudget;
        state.trust = KP.clamp((state.trust || 0) + RF.leverageTrust, 0, 100);
        return { toast: 'The board read the letterhead, went quiet, and found ' + RF.leverageBudget + ' of “previously committed” development budget within the hour. ' + state.executive.name + ': “I am glad we agree on your value. I will remember that we agreed under these circumstances.” Trust +' + RF.leverageTrust + ', and a line item nobody will ever explain to accounting.' };
      }
      state.trust = KP.clamp((state.trust || 0) + 2, 0, 100);
      return { toast: 'Declined, with the good stationery. ' + sc.company + '’s courier took the answer back before lunch. By evening the whole industry knew both halves of the story: that they asked, and that you stayed. Both halves are worth something.' };
    },
    expire: (state, sc) => ({ kind: 'company',
      text: 'The ' + sc.company + ' offer expired on the Desk, unanswered — which the industry reads its own way: not loyal, not gone, just… busy. The second courier never comes. They never do.' }),
  });

  // ---- the timeline reacts ---------------------------------------------
  KP.onFeedEvent('genTurned', (state, n, rng) => rng.pick([
    { persona: 'stan', text: 'new generation JUST dropped per the trades. my faves are officially “previous gen” now and I have never felt older while being this correct about music' },
    { persona: 'casual', text: 'the trades declaring a new idol generation like it is a weather report. anyway the old stuff still slaps, this is legal to say' },
    { persona: 'press', text: 'Generation talk is official now — expect every year-end list to re-sort itself around the new number.' },
  ]));
  KP.onFeedEvent('torchPass', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'a rookie group outsold THE flagship this week. I was at the fansign when the numbers posted and the air changed. you could feel the scene turn a page' },
    { persona: 'casual', text: 'watched the charts do a generational handover in real time today. the old guard is fine. the old guard is also, suddenly, the old guard' },
  ]));
  KP.onFeedEvent('signingClass', (state, n, rng) => rng.pick([
    { persona: 'stan', text: 'free agency in idol form: careers on the open market and every fandom drafting like a sports league. WHERE does she land. I have a spreadsheet' },
    { persona: 'casual', text: 'a whole company folded and its idols hit the market with their fandoms attached. brutal industry. incredible television' },
  ]));
  KP.onFeedEvent('faSigned', (state, n, rng) => {
    const p = n.personId ? state.people[n.personId] : null;
    const name = p ? KP.publicGiven(p) : 'her';
    return rng.pick([
      { persona: 'fan', text: name + ' has a new company. inspecting the building, the managers, the dorm windows, the CEO’s entire history. we protect our own. verdict pending' },
      { persona: 'casual', text: 'an idol surviving a company collapse and signing a second contract elsewhere is the most professional-athlete thing this industry does' },
    ]);
  });
  KP.onFeedEvent('rivalEnlist', (state, n, rng) => rng.pick([
    { persona: 'fan', text: (n.actName || 'they') + ' enlistment news. the fandom pivoted to a countdown project in four hours flat. rival fans and ours agreeing for once: come home safe, kings' },
    { persona: 'casual', text: 'another boy group to the service. the wait economy is genuinely a sector of this industry now' },
  ]));
  KP.onFeedEvent('rivalReturn', (state, n, rng) => rng.pick([
    { persona: 'fan', text: (n.actName || 'they') + ' ARE BACK. gate photos. coffee truck. the countdown account posted “0 DAYS” and logged off forever like a legend' },
    { persona: 'stan', text: 'the ' + (n.company || 'label') + ' boys are home and their first comeback is about to eat. returns always eat. this is a warning to every chart' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
