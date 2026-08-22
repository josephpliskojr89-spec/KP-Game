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
    // the regional founding (v0.10.10): everything is cheaper away
    // from Seoul, signing bonuses included
    if (KP.homeCostMult) cost = Math.round(cost * KP.homeCostMult(state));
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

  // ---- the table (v0.9.38, §76 A) --------------------------------------
  // "feels a little too easy to just click the sign button as a brand
  // new label competing against established brands." A file worth
  // arguing over counters when the label's name cannot close on its
  // own. What she asks for is who she is — hash-stable per file, no
  // rng. Holdouts are exempt (their premium IS the table); the
  // application pile came to YOU, believers sign standard.
  function tableLedger(state) {
    state.tableLedger = state.tableLedger ||
      { counters: 0, bonusesPaid: 0, clausesTaken: 0, clausesKept: 0,
        clausesBroken: 0, walkedFree: 0, trained: 0 };
    return state.tableLedger;
  }
  KP.tableLedger = tableLedger;
  KP.counterOf = function (state, p) {
    const T = KP.C.TABLE;
    if (!T || p.status !== 'prospect') return null;
    if (p.channel === 'application') return null;
    if (KP.holdoutOf && KP.holdoutOf(state, p)) return null;
    if (KP.fameRead && KP.fameRead(state) >= T.fameBar) return null;
    const avg = KP.C.TALENTS.reduce((s2, d) =>
      s2 + KP.perceived(state, p, d, null), 0) / KP.C.TALENTS.length;
    if (avg < T.talentBar) return null;
    const h = KP.hash01([state.seed, 'table', p.id].join('|'));
    const kind = p.channel === 'washout' ? 'debutBy'
      : (p.personality.workEthic >= 65 && h < 0.6) ? 'training'
      : h < 0.45 ? 'debutBy' : 'bonus';
    const fame = KP.fameRead ? KP.fameRead(state) : 0;
    const price = kind === 'bonus'
      ? Math.max(T.bonusMin, Math.round(KP.signCost(state, p) * T.bonusMult * (1 - fame)))
      : kind === 'training' ? T.trainFee : 0;
    const text = kind === 'debutBy'
      ? (p.channel === 'washout'
        ? KP.fillPro(KP.displayName(p) + ' has heard every version of “soon” a bigger program can print. {She} will sign — with a debut date in writing: ' + T.debutByWeeks + ' weeks, or {she} walks free. “The last company kept me four years. Never again on a handshake.”', p)
        : KP.fillPro(KP.displayName(p) + ' likes the pitch and does not trust the calendar. The ask: a debut-by clause — ' + T.debutByWeeks + ' weeks to a stage, in writing, or the contract opens and {she} walks free. Small label, big promise. Sign it or lose {her}.', p))
      : kind === 'training'
      ? KP.fillPro(KP.displayName(p) + ' did the homework on this label. The ask is not money — it is the room: a training guarantee, paid up front (' + T.trainFee + '), coaches on the calendar in writing. “If I am betting on a small company, the small company bets on me.”', p)
      : KP.fillPro(KP.displayName(p) + ' knows exactly what the bigger letterheads pay, and this is not one. The ask is a signing bonus — ' + price + ' on top — because an unknown label is a risk {she} is pricing, the same way you price {hers}.', p);
    return { kind, price, text };
  };

  KP.signProspect = function (state, personId, opts) {
    const p = state.people[personId];
    if (!p || p.status !== 'prospect') return { ok: false, reason: 'No longer available.' };
    let cost = KP.signCost(state, p);
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
    // the table (v0.9.38, §76 A): the counter — surfaced once, then
    // answered. Refusing the terms is refusing the signature; the file
    // stays on the board, and the board has other suitors.
    const counter = KP.counterOf(state, p);
    if (counter && !(opts && opts.answer === 'accept')) {
      const led = tableLedger(state);
      if (!p.flags.counterSeen) { p.flags.counterSeen = 1; led.counters++; }
      return { ok: false, counter, reason: counter.text };
    }
    if (counter) {
      const led = tableLedger(state);
      if (counter.kind === 'bonus') {
        cost += counter.price;
        if (state.budget < cost) return { ok: false, reason: 'The bonus on top of the fee is past what the account can carry.' };
        led.bonusesPaid++;
      } else if (counter.kind === 'training') {
        cost += counter.price;
        if (state.budget < cost) return { ok: false, reason: 'The facility guarantee bills up front, and the account says no.' };
        led.trained++;
      } else if (counter.kind === 'debutBy') {
        led.clausesTaken++;
      }
    }
    state.budget -= cost;
    if (KP.ledgerFlow) KP.ledgerFlow(state, 'signings', -cost);
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
    } else if (counter) {
      delete p.flags.counterSeen;
      if (counter.kind === 'debutBy') {
        p.clause = { kind: 'debutBy', byWeek: state.week + KP.C.TABLE.debutByWeeks, extended: false };
        p.history.push({ week: state.week, text: KP.fillPro(
          'Signed to ' + state.company.short + ' — with a debut-by clause in writing. ' +
          'Week ' + p.clause.byWeek + ' or {she} walks free. {She} kept a copy.', p) });
      } else if (counter.kind === 'training') {
        p.flags.trainClause = 1;
        p.morale = KP.clamp(p.morale + 3, 0, 100);
        p.history.push({ week: state.week, text:
          'Signed to ' + state.company.short + ' with a training guarantee — the label paid for the room before the first practice.' });
      } else {
        p.history.push({ week: state.week, text: KP.fillPro(
          'Signed to ' + state.company.short + ' with a bonus on top — {she} priced the unknown label like a professional, and the label paid it like one.', p) });
      }
    } else {
      p.history.push({ week: state.week, text: 'Signed to ' + state.company.short + ' (' + p.source + ').' });
    }
    return { ok: true, cost, holdPath, counter: counter || null };
  };

  // ---- the clause has a clock (v0.9.38) --------------------------------
  function clauseWalk(state, p, cold) {
    const led = tableLedger(state);
    led.clausesBroken++;
    led.walkedFree++;
    p.history.push({ week: state.week, text: cold
      ? 'The debut-by date passed and the company never even called a meeting. Invoked the clause and walked, free and right.'
      : 'The clause did what clauses are for: the debut never came, and the paper opened the door. Walked free.' });
    KP.recordDirected(state, p.id, 'brokenPromise', -2);
    delete p.clause;
    KP.releaseTrainee(state, p.id);
    return { kind: 'talent', ind: 'clauseWalk', priority: 'high', personId: p.id,
      text: KP.displayName(p) + ' invoked the debut-by clause this label signed and walked out free — no fee, no fight, the paper did the talking. The practice room is quieter and every trainee left in it just re-read her own contract.' };
  }
  KP.registerWeekly('table', 616, function (state, rng, inbox) {
    const T = KP.C.TABLE;
    state.roster.slice().map(id => state.people[id]).forEach(p => {
      if (!p || !p.clause || p.clause.kind !== 'debutBy') return;
      if (p.status === 'idol') {
        // the promise, kept — in writing and on a stage
        tableLedger(state).clausesKept++;
        p.morale = KP.clamp(p.morale + T.keptMorale, 0, 100);
        p.history.push({ week: state.week, text: 'The debut-by clause closed the only way that matters: with a debut. The paper goes in a frame.' });
        delete p.clause;
        return;
      }
      if (KP.groupOf(state, p.id)) return;   // a formed lineup: the clock holds its breath
      if (state.week === p.clause.byWeek - T.warnAt) {
        inbox.push({ kind: 'talent', ind: 'clauseClock', priority: 'high', personId: p.id,
          text: KP.fillPro('The paperwork desk flags it in red: ' + KP.displayName(p) + '’s debut-by clause comes due week ' + p.clause.byWeek + ' — ' + T.warnAt + ' weeks out. No lineup, no stage, and {she} has a copy of the contract too.', p) });
      }
      if (state.week > p.clause.byWeek &&
          !(state.scenes || []).some(sc => sc.kind === 'clauseCall' && sc.personId === p.id)) {
        if (p.clause.extended) {
          inbox.push(clauseWalk(state, p, false));
        } else {
          KP.openScene(state, { kind: 'clauseCall', personId: p.id, expiresWeek: state.week + 2 });
          inbox.push({ kind: 'talent', ind: 'clauseDue', priority: 'high', personId: p.id,
            text: KP.fillPro(KP.displayName(p) + ' put the contract on the desk, open to the clause, and sat down. The debut-by date has passed. {She} is not angry. {She} is holding paper. The table is on the Desk.', p) });
        }
      }
    });
  });
  KP.registerScene('clauseCall', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'The trainee') + ' · the clause';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      return KP.fillPro('The debut-by clause ' + (p ? KP.displayName(p) : 'she') +
        ' signed has come due, and the stage it promised does not exist. {She} can walk free today — the paper says so, and you signed the paper. Or you ask {her} to wait, once, for six more months that had better end under lights.', p);
    },
    options: (state, sc) => [
      { id: 'release', label: 'Honor the paper — let her go' },
      { id: 'plead', label: 'Ask for six more months' },
    ],
    resolve: (state, sc, optionId) => {
      const p = state.people[sc.personId];
      if (!p) return { toast: 'The moment passed.' };
      const T = KP.C.TABLE;
      if (optionId === 'plead') {
        p.clause.extended = true;
        p.clause.byWeek = state.week + T.extendWeeks;
        p.morale = KP.clamp(p.morale - T.pleadMorale, 0, 100);
        KP.recordDirected(state, p.id, 'heldToPaper', -1);
        p.history.push({ week: state.week, text: KP.fillPro('Asked to wait past {pos} own clause. {She} said yes with a face that was writing the new deadline down. Six months. Not seven.', p) });
        return { toast: 'She agreed — once. Week ' + p.clause.byWeek + ' is not a soft date anymore. It is the last one.' };
      }
      const note = clauseWalk(state, p, false);
      KP.note(state, { kind: note.kind, ind: note.ind, priority: note.priority,
        personId: note.personId, text: note.text });
      return { toast: 'You honored the paper. It cost a trainee and bought a reputation: this label’s contracts mean what they say.' };
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p || !p.clause) return null;
      return clauseWalk(state, p, true);
    },
  });

  // ---- the timeline reads the paper ------------------------------------
  KP.onFeedEvent('clauseWalk', (state, n, rng) => rng.pick([
    { persona: 'press', text: 'A trainee walked free on a debut-by clause this week. Write it down, rookies: the small labels will promise you a date. Make them sign it.' },
    { persona: 'fan', text: 'the debut-by clause walkout story is making the rounds and honestly? good for her. four years of "soon" ends when you bring your own paper' },
    { persona: 'casual', text: 'imagine promising a debut in writing and then just… not. the contract did more for that kid than the company ever did' },
  ]));
  KP.onFeedEvent('clauseDue', (state, n, rng) => rng.chance(0.4) ? rng.pick([
    { persona: 'casual', text: 'trainee-forum thread of the week: a small-label kid whose debut clause just came due, asking what happens next. the replies are split between lawyers and poets' },
    { persona: 'fan', text: 'somewhere tonight a label boss is re-reading a clause they signed in a hungrier month. the paper always comes due. that is what paper is FOR' },
  ]) : null);

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
