/* Scouting board: prospects, targeted looks, signings, rival interest.
   Information is an economy — a look costs budget the same currency as a
   signing. Rivals compete for the same prospects through the same board. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  KP.prospectById = function (state, id) { return state.people[id]; };

  // Rival heat on a prospect: 0 none, 1 watching, 2 interested, 3 hot
  KP.rivalHeat = function (state, personId) {
    let max = 0;
    const names = [];
    state.rivals.forEach(r => {
      const lvl = r.interest[personId] || 0;
      if (lvl > 0) names.push({ name: r.short, level: lvl });
      max = Math.max(max, lvl);
    });
    return { max, names };
  };

  KP.signCost = function (state, person) {
    const E = KP.C.ECON;
    const heat = KP.rivalHeat(state, person.id).max;
    let cost = E.signCostBase + heat * E.signCostPerHeat;
    // the holdout premium (v0.9.33): the market says she can wait,
    // and the price says so whether or not she takes your call
    if (KP.holdoutOf(state, person)) cost = Math.round(cost * KP.C.HOLDOUT.premium);
    return cost;
  };

  // ---- the holdout (v0.9.33, §74): the recruit with agency --------------
  function holdLedger(state) {
    state.holdoutLedger = state.holdoutLedger ||
      { declined: 0, courted: 0, callbacks: 0, signedStature: 0, signedLane: 0,
        signedCourtship: 0, signedCallback: 0, lostToPowers: 0, agedWaiting: 0 };
    return state.holdoutLedger;
  }
  function peakOf(p) {
    return Math.max(p.talents.vocals.cur, p.talents.dance.cur,
      p.talents.rap.cur, p.talents.charisma.cur);
  }
  function laneOf(p) {
    const best = ['vocals', 'dance', 'rap', 'charisma']
      .sort((a, b) => p.talents[b].cur - p.talents[a].cur)[0];
    return { vocals: 'vocal', dance: 'performance', rap: 'performance',
      charisma: 'starMaker' }[best];
  }
  // the top slice of talent WITH a hot market knows what she is worth —
  // hash-stable, minus the grateful minority who sign anyway
  KP.holdoutOf = function (state, p) {
    const H = KP.C.HOLDOUT;
    if (!p || p.status !== 'prospect') return false;
    if (peakOf(p) < H.talentMin) return false;
    if (KP.rivalHeat(state, p.id).max < H.heatMin) return false;
    return KP.hash01([state.seed, p.id, 'grateful'].join('|')) >= H.gratefulShare;
  };
  // which door past the bar is open, if any
  KP.holdoutBar = function (state, p) {
    const H = KP.C.HOLDOUT;
    if ((p.holdout || {}).callback) return 'callback';
    // a power is a TOP seat, read against the size of the field — in a
    // four-company scene only the leader is a power; in a full scene,
    // the big three are
    const rows = KP.powerRankingNow(state);
    const me = rows.find(r => r.isPlayer);
    const bar = Math.min(H.rankBar, Math.max(1, rows.length - 3));
    if (me && me.rank <= bar && me.score >= H.powerScore) return 'stature';
    if ((state.company.reputation[laneOf(p)] || 0) >= H.laneRep) return 'lane';
    if ((p.holdout || {}).visits >= H.visitsToWin - 1 &&
        state.week - p.holdout.lastVisit >= H.visitGapWeeks) return 'courtship';
    return null;
  };

  // Targeted look (0.9.16.3): expensive, and relatively accurate in ONE
  // trip — the fog mostly collapses on the first look. Every read gets
  // SNAPSHOTTED at the visit (the dated report), and repeat looks stay
  // on the menu forever: the board keeps training, reports go stale,
  // and going again is a choice that can show the improvement.
  KP.observeProspect = function (state, personId) {
    const p = state.people[personId];
    const cost = KP.C.SCOUT.observeCost;
    if (!p || p.status !== 'prospect') return { ok: false, reason: 'Not on the board.' };
    if (p.reads && p.reads.week === state.week) {
      return { ok: false, reason: 'This week’s report is already on the desk. Nothing has changed since Tuesday.' };
    }
    if (state.budget < cost) return { ok: false, reason: 'No budget for another look.' };
    state.budget -= cost;
    p.observations = (p.observations || 0) + 1;
    KP.takeReads(state, p);
    return { ok: true };
  };

  // The signing allowance is the tutorial rail: it binds only until the
  // first debut. After that the agency is open — the CEO watches the
  // books instead (fiscal pressure, sim.js).
  KP.signingsCapped = function (state) {
    return !KP.groups(state).some(g => g.debuted);
  };

  KP.signProspect = function (state, personId) {
    const p = state.people[personId];
    if (!p || p.status !== 'prospect') return { ok: false, reason: 'No longer available.' };
    const cost = KP.signCost(state, p);
    if (state.budget < cost) return { ok: false, reason: 'The budget cannot cover this signing.' };
    if (KP.signingsCapped(state) && state.signingsUsed >= state.signingsAllowed) {
      return { ok: false, reason: 'The executive approved ' + state.signingsAllowed + ' external signings until the debut. That allowance is spent.' };
    }
    // the holdout (v0.9.33): she can say no — and every no names the
    // paths past her bar. No budget moves on a decline.
    let holdPath = null;
    if (KP.holdoutOf(state, p)) {
      const H = KP.C.HOLDOUT;
      holdPath = KP.holdoutBar(state, p);
      if (!holdPath) {
        const led = holdLedger(state);
        p.holdout = p.holdout || { visits: 0, lastVisit: -999 };
        const sincere = state.week - p.holdout.lastVisit >= H.visitGapWeeks;
        if (sincere) { p.holdout.visits++; p.holdout.lastVisit = state.week; led.courted++; }
        led.declined++;
        const v = p.holdout.visits;
        if (!sincere) {
          return { ok: false, holdout: true, reason: KP.fillPro(KP.displayName(p) +
            '’s academy director did not even book the room this time: “You were here two weeks ago. She noticed. Come back when the visit means something — or with a ranking.”', p) };
        }
        return { ok: false, holdout: true, reason: KP.fillPro(v === 1
          ? KP.displayName(p) + ' listened to the whole pitch, thanked you by name, and said no with {pos} whole future in {pos} voice: {she} is waiting for one of the powers, or for a company that is unmistakably about what {she} does. The academy director walked you out: “Third label this month. Come back with a ranking — or just keep coming back. She remembers who does.”'
          : KP.displayName(p) + ' met the second visit differently — {she} quoted your first pitch back to you, word for word, which is not what no sounds like. Still no, for now: the bar is the bar. But the director said it plainly at the door: “Nobody from the big three has visited twice. One more sincere trip and I think the bar moves.”', p) };
      }
    }
    state.budget -= cost;
    state.signingsUsed++;
    if (state.fiscal) state.fiscal.monthSignings = (state.fiscal.monthSignings || 0) + 1;
    p.status = 'trainee';
    p.signedWeek = state.week;
    if (p.origin && state.tongueLedger) state.tongueLedger.intlSigned++;   // v0.9.29
    // the paper clock (v0.9.19): three years, the industry standard
    p.traineeContract = { start: state.week, years: KP.C.TRAINEE_CONTRACT.years, term: 1 };
    p.training = { focus: [], intensity: 'standard' };
    state.roster.push(p.id);
    state.prospects = state.prospects.filter(id => id !== p.id);
    // rivals notice
    state.rivals.forEach(r => { delete r.interest[p.id]; });
    delete p.reads;   // signed: the coaches watch her daily now, no dated report
    // the school hangs the signing photo (v0.9.16)
    KP.schoolRecordAlum(state, p, state.company.short);
    if (holdPath) {
      const led = holdLedger(state);
      led[{ stature: 'signedStature', lane: 'signedLane',
        courtship: 'signedCourtship', callback: 'signedCallback' }[holdPath]]++;
      delete p.holdout;
      p.history.push({ week: state.week, text: KP.fillPro({
        stature: 'Held out for a power — and signed the day the letterhead became one. {She} keeps the clipping of the ranking.',
        lane: 'Held out for a company that was unmistakably about what {she} does. Signed to the label whose name means {pos} lane.',
        courtship: 'Held out for the powers — and signed with the label that kept showing up. The third visit won {her}, the way the big three never bother to.',
        callback: '{She} called back. The company {she} once said no to crossed {pos} bar, and {she} remembered who visited.',
      }[holdPath], p) });
    } else {
      p.history.push({ week: state.week, text: 'Signed to ' + state.company.short + ' (' + p.source + ').' });
    }
    return { ok: true, cost, holdPath };
  };

  // Weekly rival scouting activity. Rivals escalate interest, and sometimes
  // sign a prospect out from under the player. They act through the same
  // perceived layer — their scouts read the same fogged truth.
  KP.rivalScoutingWeek = function (state, rng) {
    const S = KP.C.SCOUT;
    const notes = [];
    state.rivals.forEach(rival => {
      // a rival with a debut to cast scouts like it (v0.4.3)
      const hungry = rival.nextDebutWeek != null &&
        state.week >= rival.nextDebutWeek - S.rivalHungerWindow;
      // escalate or open interest on prospects fitting the rival's philosophy
      // the heir's money (v0.9.31): the bankrolled label's scouts are
      // everywhere at once, and their opening offers skip the small talk
      const bankrolled = rival.bankroll && state.week <= rival.bankroll.until;
      const shiftChance = Math.min(0.9, KP.C.RIVALS.weeklyInterestShift * (hungry ? 1.4 : 1) *
        (bankrolled ? KP.C.SAGA.HEIR.interestMult : 1));
      if (rng.chance(shiftChance)) {
        const target = pickRivalTarget(state, rival, rng);
        if (target) {
          const cur = rival.interest[target.id] || 0;
          if (cur < 3) {
            rival.interest[target.id] = cur + 1;
            if (rival.interest[target.id] >= 2) {
              notes.push({ kind: 'scouting', text: rival.short + ' scouts were seen at ' + KP.displayName(target) + '’s academy. Their interest looks ' + (rival.interest[target.id] === 3 ? 'serious' : 'real') + (hungry ? ' — and word is they are casting a new group' : '') + '.' });
            }
          }
        }
      }
      // attempt signings on interested prospects
      Object.keys(rival.interest).forEach(pid => {
        const p = state.people[pid];
        if (!p || p.status !== 'prospect') { delete rival.interest[pid]; return; }
        const lvl = rival.interest[pid];
        let chance = lvl >= 3 ? S.rivalSignHotChance : lvl === 2 ? S.rivalSignBaseChance : 0;
        if (hungry) chance = Math.min(0.6, chance * S.rivalHungerMult);
        if (chance && rng.chance(chance)) {
          // the holdout refuses the small houses too (v0.9.33): only a
          // power — or the heir's bankroll — clears her bar. The roll
          // happened; the answer was no.
          const wasHoldout = KP.holdoutOf(state, p);
          if (wasHoldout && (rival.prestige || 0) < KP.C.HOLDOUT.rivalPrestigeBar &&
              !(rival.bankroll && state.week <= rival.bankroll.until)) {
            return;
          }
          if (wasHoldout) holdLedger(state).lostToPowers++;
          p.status = 'rival';
          p.company = rival.short;
          KP.schoolRecordAlum(state, p, rival.short);
          p.history.push({ week: state.week, text: 'Signed to ' + rival.short + ' — off our board.' });
          state.prospects = state.prospects.filter(id => id !== pid);
          state.rivals.forEach(r => { delete r.interest[pid]; });
          rival.rosterCount = (rival.rosterCount || 0) + 1;
          notes.push({ kind: 'scouting', urgent: true, text: KP.fillPro(rival.short + ' signed ' + KP.displayName(p) + '. {She} is off the board' + (hungry ? ' — and probably in their debut lineup' : '') +
            (wasHoldout ? '. The power {she} was holding out for came knocking — it just was not us. {She} was never going to wait forever' : '') + '.', p) });
          // the scouts keep score (v0.6.1): enough poaches become a name
          rival.poachCount = (rival.poachCount || 0) + 1;
          if (rival.poachCount >= KP.C.MEMORY.poachAt) {
            const nar = KP.recordEvidence(state, 'poachers', 'rivalCompany', rival.short);
            if (nar) notes.push(nar);
          }
        }
      });
    });
    // the board keeps training (0.9.16.3): prospects are still at their
    // academies, so trained skills drift upward slowly — lane-weighted
    // for school kids, faster for the young. An old report goes stale;
    // a repeat look is how the desk finds out.
    (state.prospects || []).forEach(id => {
      const p = state.people[id];
      if (!p) return;
      const school = p.schoolId ? KP.schoolById(state, p.schoolId) : null;
      const youth = 0.4 + Math.max(0, (KP.C.GEN.ageRange[1] - p.age) /
        (KP.C.GEN.ageRange[1] - KP.C.GEN.ageRange[0]));
      ['vocals', 'rap', 'dance'].forEach(d => {
        const t = p.talents[d];
        let g = S.boardGrowth * youth * (0.5 + rng.next());
        if (school && (school.lane === d || (school.lane === 'allround' && d !== 'rap'))) {
          g *= S.boardGrowthLane;
        }
        t.cur = Math.min(t.ceilLo - 1, t.cur + g);
      });
    });
    // the call-back (v0.9.33): a holdout who once said no watches the
    // rankings like everyone else — when the company crosses her bar
    // while she is still on the board, SHE calls, once
    (state.prospects || []).forEach(id => {
      const p = state.people[id];
      if (!p || !p.holdout || p.holdout.callback || !(p.holdout.visits >= 1)) return;
      if (!KP.holdoutOf(state, p)) return;
      const bar = KP.holdoutBar(state, p);
      if (bar !== 'stature' && bar !== 'lane') return;
      p.holdout.callback = true;
      holdLedger(state).callbacks++;
      notes.push({ kind: 'scouting', urgent: true, priority: 'critical', personId: p.id,
        text: KP.fillPro(KP.displayName(p) + ' called the office — {herself}, not the academy. “You visited when you did not have to. ' +
          (bar === 'stature' ? 'I saw the ranking.' : 'Everyone knows what your name means now.') +
          ' If the offer still stands, I am ready to hear it properly.” The recruit who held out for a power just decided you became one. The board has {pos} file.', p) });
    });

    // the board is a market, not a museum (0.9.13 audit A2): leads who
    // aged past the market without a signature move on — file and all,
    // because nobody here ever met them
    const stale = (state.prospects || []).filter(id => {
      const pr = state.people[id];
      return pr && pr.age >= S.prospectAgeOut;
    });
    if (stale.length) {
      // burned by her own bar (v0.9.33): the holdout we actually met,
      // aged past the market still waiting for the letterhead
      const burned = stale.map(id => state.people[id])
        .filter(p => p && p.holdout && p.holdout.visits >= 1);
      if (burned.length) {
        holdLedger(state).agedWaiting += burned.length;
        notes.push({ kind: 'scouting', priority: 'high', text: KP.fillPro(
          KP.displayName(burned[0]) + ' aged off the board this week — the one who held out for a power. The power never called; neither, in the end, did anyone else. {She} waited for a letterhead that never wrote. The board is honest about what waiting costs.', burned[0]) });
      }
      stale.forEach(id => {
        (state.rivals || []).forEach(r => { if (r.interest) delete r.interest[id]; });
        delete state.people[id];
      });
      state.prospects = state.prospects.filter(id => state.people[id]);
      notes.push({ kind: 'scouting', text: 'Scout Im thinned the board: ' + stale.length +
        ' long-listed lead' + (stale.length === 1 ? '' : 's') + ' aged past the market and signed elsewhere, or went back to school, or both. The board is for the ones still reachable.' });
    }
    // fresh leads arrive through the NETWORK now (v0.9.35, §75):
    // the walk-in stream moved to network.js, where channels scale
    // with the company's real reach — this weekly keeps the rival
    // side, the board's training, the call-back, and the age-out
    return notes;
  };

  function pickRivalTarget(state, rival, rng) {
    // a partnered school's leads reach our desk first (v0.9.16): rival
    // scouts don't get a seat at those showcases until the window lapses
    const pool = state.prospects.map(id => state.people[id]).filter(Boolean)
      .filter(p => (p.flags.firstLookUntil || 0) <= state.week)
      // channel privacy (v0.9.35): rival scouts never see your mail —
      // applicants, referrals, street finds, and your call tapes are
      // yours alone until a signature makes them news. Channel-less
      // files (old saves, the public landscape) stay open season.
      .filter(p => !KP.CHANNEL_PRIVATE[p.channel]);
    if (!pool.length) return null;
    // rivals read through their own (coarse) fog: perceived best by philosophy
    const scored = pool.map(p => {
      let v;
      const key = [state.seed, rival.short, p.id, 'read'].join('|');
      const fog = (KP.hash01(key) - 0.5) * 20;
      if (rival.philosophy === 'performance') v = p.talents.dance.cur + p.talents.charisma.cur * 0.5;
      else if (rival.philosophy === 'trendChaser') v = p.talents.visuals.cur + p.talents.charisma.cur;
      else v = (p.talents.vocals.cur + p.talents.dance.cur + p.talents.charisma.cur) / 3 + (KP.C.GEN.ageRange[1] - p.age) * 2;
      // raw talent turns every head, whatever the philosophy (v0.4.3)
      const peak = Math.max(p.talents.vocals.cur, p.talents.dance.cur, p.talents.rap.cur, p.talents.charisma.cur);
      return { p, v: v + peak * 0.4 + fog };
    }).sort((a, b) => b.v - a.v);
    // weighted hard toward the top, not omniscient (v0.4.3: sharper)
    const idx = Math.min(scored.length - 1, Math.floor(Math.pow(rng.next(), 3) * Math.min(6, scored.length)));
    return scored[idx].p;
  }
})(typeof window !== 'undefined' ? window : globalThis);
