/* The runway (v0.10.19, §85) — financing, the Rescene path. Owner:
   "a small label like this would absolutely be searching for
   financing." The real-world inspiration raised venture money riding
   the government content mother-fund — small labels pitch like
   startups, and the fund prices what it can SEE: fame, the chart
   line, the fandom, the archive, the personal channels. Never your
   private reads (§84's law in a suit: the investor has the
   information disadvantage about your trainees and prices it in).
   Money always costs one of three things at signature: the board
   seat, the revenue share, or the covenant — a real claim, checked
   by the same machinery the exec's promises use. Tight money is the
   design working; this is a bridge, not a rescue. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  const FUNDS = ['Hana Bridge Partners', 'Seongsu Capital', 'Mokran Ventures',
    'Paldo Content Fund', 'BlueGate Partners', 'Yeouido Growth'];

  function ledger(state) {
    state.financeLedger = state.financeLedger ||
      { pitches: 0, passes: 0, sheets: 0, walked: 0, taken: 0,
        boardSeats: 0, revShares: 0, covenants: 0,
        covenantKept: 0, covenantMissed: 0, investorPaid: 0 };
    return state.financeLedger;
  }
  KP.financeLedger = ledger;
  function fin(state) {
    state.financing = state.financing || { reputation: 0 };
    return state.financing;
  }

  // ---- the window: policy money has seasons (§85 C) ---------------------
  KP.fundWindowOpen = function (state) {
    const year = Math.max(1, Math.ceil(state.week / KP.C.WEEKS_PER_YEAR));
    return KP.hash01([state.seed, 'motherfund', year].join('|')) < KP.C.FINANCE.windowShare;
  };

  // ---- the read: observables only (§85 A+D) -----------------------------
  KP.financeRead = function (state) {
    const F = KP.C.FINANCE;
    const fame = KP.fameRead ? KP.fameRead(state) : 0;
    let bestPeak = 101;
    KP.groups(state).forEach(g => (g.releases || []).forEach(r => {
      if (r.week > 0 && r.nationalPeak && r.nationalPeak < bestPeak) bestPeak = r.nationalPeak;
    }));
    const chart = bestPeak > 100 ? 0 : (101 - bestPeak) / 100;
    const fandom = Math.max(0, ...KP.groups(state)
      .map(g => g.fandom ? (KP.fandomIntensity(g) || 0) / 100 : 0));
    const cnl = state.contentLedger || {};
    const catalog = Math.min(1, (cnl.views || 0) / F.catalogViewsFull);
    const channels = (state.roster || []).map(id => state.people[id])
      .filter(p => p && p.broadcast);
    const channelRead = Math.min(1, channels.length / F.channelFull);
    const score = F.wFame * fame + F.wChart * chart + F.wFandom * fandom +
      F.wCatalog * catalog + F.wChannels * channelRead;
    return { score, fame, chart, fandom, catalog, channels: channels.length,
      words: [
        fame >= 0.3 ? 'a name the room already knew' : fame >= 0.1 ? 'a name the room had heard once' : 'a name the room had to look up',
        chart > 0 ? 'a real chart line' : 'no chart history',
        fandom >= 0.4 ? 'an organized fandom' : fandom > 0 ? 'the start of a fandom' : 'no fandom yet',
        catalog >= 0.5 ? 'a content archive with numbers' : catalog > 0 ? 'a young archive' : 'no archive',
        channels.length ? channels.length + ' personal channel' + (channels.length === 1 ? '' : 's') + ' compounding weekly' : 'no personal channels',
      ] };
  };

  // one truth for "somebody already has a hand on the label"
  KP.financingBusy = function (state) {
    const f = state.financing || {};
    if (f.pending) return 'The deck is out. Funds answer in their own time — one pitch in the air at a time.';
    if ((state.scenes || []).some(sc => sc.kind === 'termSheet')) return 'A term sheet is on the Desk. Answer it before printing another deck.';
    if (f.board && state.week < f.board.until) return 'The board seat is occupied until the horizon — nobody finances a label mid-oversight.';
    if (f.revShare && state.week < f.revShare.until) return 'The revenue share is still running. One hand on the label at a time.';
    if ((state.claims || []).some(c => !c.resolved && c.type === 'financeCovenant')) return 'A covenant is on the clock. Keep it or miss it before asking for more.';
    return null;
  };

  // ---- the pitch (§85 A) ------------------------------------------------
  KP.pitchFinancing = function (state) {
    const F = KP.C.FINANCE;
    const f = fin(state);
    const busy = KP.financingBusy(state);
    if (busy) return { ok: false, reason: busy };
    if (f.coolUntil && state.week < f.coolUntil) {
      return { ok: false, reason: 'The last covenant just resolved. Funds want to watch a full cycle before writing the next check — ' + (f.coolUntil - state.week) + ' week(s).' };
    }
    if (f.debt > 0) {
      return { ok: false, reason: 'The clawback is still draining — ' + f.debt + ' owed. Nobody finances a label that owes the last fund money.' };
    }
    if (state.week - (f.lastPitchWeek || -999) < F.pitchCooldown) {
      return { ok: false, reason: 'The funds remember last quarter’s deck. Give the story ' + (F.pitchCooldown - (state.week - f.lastPitchWeek)) + ' more week(s) to change.' };
    }
    if (state.budget < F.pitchCost) return { ok: false, reason: 'The data room costs ' + F.pitchCost + ' to print, and the label cannot currently afford paper.' };
    state.budget -= F.pitchCost;
    if (KP.ledgerFlow) KP.ledgerFlow(state, 'financing', -F.pitchCost);
    f.pending = { week: state.week };
    ledger(state).pitches++;
    const note = { kind: 'company', ind: 'fundPitch',
      text: 'The deck went out: the label’s observables, bound and printed — what the industry can see, which is all a fund will ever price. Meetings happen this week. The trades noticed the printing order, because the trades notice everything.' };
    KP.note(state, note);
    return { ok: true, note };
  };

  function offersFor(state, rng) {
    const F = KP.C.FINANCE;
    const f = fin(state);
    const read = KP.financeRead(state);
    const open = KP.fundWindowOpen(state);
    let base = (F.offerBase + read.score * F.offerScale) *
      (open ? 1 : F.closedMult) * (f.burned ? F.burnedMult : 1) *
      (1 + F.repBonus * Math.min(F.repBonusCap, f.reputation || 0)) * (0.85 + rng.next() * 0.3);
    base = Math.round(base);
    const fund = FUNDS[Math.floor(KP.hash01([state.seed, 'fund', state.week].join('|')) * FUNDS.length)];
    return { fund, open, read,
      rev: Math.round(base),
      board: Math.round(base * F.boardMult),
      covenant: Math.round(base * F.covenantMult) };
  }

  // ---- the covenant: a real claim (§85 B) -------------------------------
  KP.registerClaim('financeCovenant', (state, c) => {
    const F = KP.C.FINANCE;
    const kept = c.target === 'chart'
      ? KP.groups(state).some(g => (g.releases || []).some(r =>
          r.week >= c.week && r.nationalPeak && r.nationalPeak <= F.covenantPeak))
      : KP.groups(state).some(g => g.debuted && (g.debutWeek || 0) >= c.week);
    if (kept) {
      state.trust = KP.clamp(state.trust + F.covenantKeptTrust, 0, 100);
      fin(state).reputation = (fin(state).reputation || 0) + 1;
      fin(state).coolUntil = state.week + F.raiseGapWeeks;   // v0.10.23: a full cycle between rounds
      // every won arrives with a hand attached (§85): a kept covenant
      // converts to the fund's upside — a light share, one year
      fin(state).revShare = { pct: F.covenantKeptSharePct,
        until: state.week + F.covenantKeptShareWeeks, fund: c.fundName };
      ledger(state).covenantKept++;
      return { resolved: 'kept', notes: [{ kind: 'company', ind: 'covenantKept', priority: 'high',
        text: c.fundName + ' read the number before you could send it. The covenant is KEPT — the milestone landed inside the window, the fund’s memo calls this label “executing,” and the conversion clause wakes up: ' + Math.round(F.covenantKeptSharePct * 100) + '% of gross for a year, the fund’s upside on the bet it made. The next term sheet in this town gets written in a friendlier font.' }] };
    }
    if (state.week > c.byWeek) {
      state.trust = KP.clamp(state.trust + F.covenantMissTrust, 0, 100);
      fin(state).burned = true;
      // v0.10.23 (the hostile audit): the wire was never coming back on
      // a miss — now it is an ADVANCE. The clawback drains quarterly.
      fin(state).debt = (fin(state).debt || 0) + (c.amount || 0);
      fin(state).coolUntil = state.week + F.raiseGapWeeks;
      ledger(state).covenantMissed++;
      return { resolved: 'missed', notes: [{ kind: 'company', ind: 'covenantMissed', priority: 'critical',
        text: 'The covenant window closed with no milestone. ' + c.fundName + ' did not shout — funds never shout. They invoked the clawback: the ' + (c.amount || 0) + ' comes back out of the quarters, the spreadsheet updated, and every fund in this town can read it. Future money just got smaller, more expensive, and owed first.' }] };
    }
    return null;
  });

  // ---- the term sheet: the scene (§85 B) --------------------------------
  KP.registerScene('termSheet', {
    title: (state, sc) => sc.offers.fund + ' · the term sheet',
    body: (state, sc) => {
      const o = sc.offers;
      return o.fund + ' took the meeting and read the room out loud: ' +
        o.read.words.join(', ') + '. ' +
        (o.open ? 'The mother-fund allocation is open this year, which is why the coffee was good. '
          : 'The mother-fund window is closed this year — this is bridge money, priced like it. ') +
        'Three structures on the table. Every one of them is money now for a hand on the label later. The fourth option is the door, which is always free.';
    },
    options: (state, sc) => [
      { id: 'walk', label: 'Walk away' },
      { id: 'covenant', label: 'The covenant · +' + sc.offers.covenant },
      { id: 'revshare', label: 'The revenue share · +' + sc.offers.rev },
      { id: 'board', label: 'The board seat · +' + sc.offers.board },
    ],
    resolve: (state, sc, optionId) => {
      const F = KP.C.FINANCE;
      const f = fin(state);
      const o = sc.offers;
      const led = ledger(state);
      f.lastPitchWeek = state.week;
      if (optionId === 'walk') {
        led.walked++;
        return { toast: 'You walked. The fund shook hands warmly, which means nothing, and kept the deck, which means something.' };
      }
      led.taken++;
      if (optionId === 'board') {
        state.budget += o.board;
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'financing', o.board);
        f.board = { until: state.week + F.boardWeeks, fund: o.fund };
        led.boardSeats++;
        KP.note(state, { kind: 'company', ind: 'financeTaken', priority: 'high',
          text: o.fund + ' wired ' + o.board + ' and took the board seat. A partner attends the Monday meetings now — the questions come twice as often, and a missed promise costs twice the face. The money is real. So is the chair.' });
        return { toast: '+' + o.board + '. The board seat is filled. The Monday meetings just got a second reader.' };
      }
      if (optionId === 'revshare') {
        state.budget += o.rev;
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'financing', o.rev);
        f.revShare = { pct: F.revSharePct, until: state.week + F.revShareWeeks, fund: o.fund };
        led.revShares++;
        KP.note(state, { kind: 'company', ind: 'financeTaken', priority: 'high',
          text: o.fund + ' wired ' + o.rev + ' against ' + Math.round(F.revSharePct * 100) + '% of gross for two years. Every quarterly statement now has their line on it. The accountant has already named the line “the toll.”' });
        return { toast: '+' + o.rev + '. The settlement has a new line for two years.' };
      }
      // the covenant — biggest money, hardest clock
      state.budget += o.covenant;
      if (KP.ledgerFlow) KP.ledgerFlow(state, 'financing', o.covenant);
      led.covenants++;
      const target = KP.groups(state).some(g => g.debuted) ? 'chart' : 'debut';
      KP.openClaim(state, { type: 'financeCovenant', subject: { kind: 'fund' },
        fundName: o.fund, target, amount: o.covenant,
        label: target === 'chart'
          ? 'the covenant: a national top-' + F.covenantPeak + ' release, in writing'
          : 'the covenant: a debut on a real stage, in writing',
        byWeek: state.week + F.covenantWeeks });
      KP.note(state, { kind: 'company', ind: 'financeTaken', priority: 'high',
        text: o.fund + ' wired ' + o.covenant + ' — the biggest number on the table, against the hardest clock: ' +
          (target === 'chart' ? 'a national top-' + F.covenantPeak + ' release' : 'a debut') +
          ' inside ' + F.covenantWeeks + ' weeks, in writing. Keep it and every future round gets cheaper. Miss it and every future round gets worse. The fund does not do middles.' });
      return { toast: '+' + o.covenant + '. The milestone is on the record, and the record gets checked.' };
    },
    expire: (state, sc) => {
      fin(state).lastPitchWeek = state.week;
      return { kind: 'company', text: sc.offers.fund + '’s term sheet lapsed unsigned. Funds read silence fluently; the offer is gone, and the next one starts from the new silence.' };
    },
  });

  // one truth for the board seat's teeth — meeting.js reads this
  KP.boardSeatActive = function (state) {
    const f = state.financing || {};
    return !!(f.board && state.week < f.board.until);
  };

  // ---- the weekly (order 757: the toll lands BEFORE the books close) ----
  KP.registerWeekly('finance', 757, function (state, rng, inbox) {
    const F = KP.C.FINANCE;
    const f = fin(state);
    const led = ledger(state);

    // the window announces itself yearly — policy money is weather
    const woy = ((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1;
    if (woy === 1 && state.week > 1) {
      const open = KP.fundWindowOpen(state);
      inbox.push({ kind: 'industry', ind: 'fundWindow', priority: 'normal',
        text: open
          ? 'The content mother-fund posted this year’s allocation: OPEN. The venture funds that ride it are taking meetings again, and every small label in this industry just updated its deck.'
          : 'The content mother-fund skipped this year’s allocation. The venture money that rides it went quiet; what remains is bridge money, and bridge money knows what it is worth.' });
    }

    // the answer comes back (§85 A): terms, or a pass — a pass is an answer
    if (f.pending && state.week >= f.pending.week + F.answerWeeks) {
      delete f.pending;
      const read = KP.financeRead(state);
      const open = KP.fundWindowOpen(state);
      const pass = read.score < F.passBar || (!open && rng.chance(F.passClosedChance));
      if (pass) {
        f.lastPitchWeek = state.week;
        led.passes++;
        inbox.push({ kind: 'company', ind: 'fundPass', priority: 'high',
          text: 'The funds passed. Politely, thoroughly, in writing: ' + read.words.join(', ') +
            ' — and none of it added up to a check' + (open ? '' : ', not in a closed-window year') +
            '. The trades heard, because the trades always hear. The observables are the pitch; go change the observables.' });
      } else {
        const offers = offersFor(state, rng);
        led.sheets++;
        KP.openScene(state, { kind: 'termSheet', offers,
          expiresWeek: state.week + F.sheetFuseWeeks });
        inbox.push({ kind: 'company', ind: 'fundSheet', priority: 'critical',
          text: offers.fund + ' called back with a term sheet. Three structures, one fuse — ' + F.sheetFuseWeeks + ' weeks before the offer walks. The table is on the Desk, and the door is always one of the options.' });
      }
    }

    // the clawback (v0.10.23): a missed covenant is a debt the quarters
    // repay — clamped like every debit to what actually exists
    if (f.debt > 0 && woy % KP.C.BOOKS.quarterWeeks === 0 && state.week > 4) {
      const pay = Math.min(f.debt, Math.max(0, state.budget));
      if (pay > 0) {
        state.budget -= pay;
        f.debt -= pay;
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'financing', -pay);
        if (f.debt <= 0) {
          delete f.debt;
          inbox.push({ kind: 'company', ind: 'financeDone',
            text: 'The clawback cleared its last quarter. The fund is whole, the label is lighter, and the lesson is itemized on the statement.' });
        }
      }
    }

    // the toll (§85 B): the revenue share reads the closing quarter's gross
    if (f.revShare && state.week < f.revShare.until &&
        woy % KP.C.BOOKS.quarterWeeks === 0 && state.week > 4 && state.books) {
      const gross = Object.values(state.books.cur || {})
        .reduce((s2, v) => s2 + Math.max(0, v), 0);
      // the toll never overdraws the account (the 0.10.11 clamp law:
      // a debit takes what exists, not what the formula says)
      const cut = Math.min(Math.round(gross * f.revShare.pct), Math.max(0, state.budget));
      if (cut > 0) {
        state.budget -= cut;
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'financing', -cut);
        led.investorPaid += cut;
      }
    }

    // horizons pass — the label's own name goes back on the door
    if (f.board && state.week >= f.board.until) {
      inbox.push({ kind: 'company', ind: 'financeDone',
        text: f.board.fund + '’s board seat reached its horizon. The chair went back to being a chair, the Monday meetings went back to one reader, and the minutes note — dryly — that the label survived the oversight it once needed.' });
      delete f.board;
    }
    if (f.revShare && state.week >= f.revShare.until) {
      inbox.push({ kind: 'company', ind: 'financeDone',
        text: 'The last quarter under ' + f.revShare.fund + '’s revenue share settled out. The toll line comes off the statement; whatever the label earns next belongs to the label. The accountant printed this page twice.' });
      delete f.revShare;
    }
  });

  // ---- the timeline reacts ---------------------------------------------
  KP.onFeedEvent('fundSheet', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'a venture fund term-sheeting a small idol label is the most modern sentence in this industry. the spreadsheet people found the fandom people. good luck to all involved' },
    { persona: 'fan', text: 'our tiny label is out here PITCHING INVESTORS. protect the vision, take the money, keep the members fed. in that order' },
    { persona: 'stan', text: 'small label financing news and I have opinions about term structures now. this fandom will teach you corporate finance whether you wanted it or not' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
