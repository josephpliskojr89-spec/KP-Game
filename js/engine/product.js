/* The product (v0.10.0, §80 findings 1+8+3) — where the money
   actually comes from. A K-pop album is a product LINE: versions,
   pre-order benefits, a pressing decision made against a pre-order
   read — and first-week sales (the chodong number) are the public
   scoreboard of fandom size, a second axis independent of reception.
   Fan-sign rounds are sales machinery, not gifts: entry rides album
   purchases, the cut line is a public number, and heavy rounds roll
   the album-dumping story (aimed at the company, per the content
   law). The landing splits into two publics: the fandom buys the
   object, the general public streams the song — and a group's
   profile between the axes becomes its identity. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // ---- who buys: the fanbase read --------------------------------------
  // A count, not a meter: an ESTIMATE of core buyers, derived fresh
  // (kernel law) from popularity, the members' reach, the fandom's
  // organization, and — once one exists — the last chodong, which is
  // the only number that ever stops being an estimate.
  KP.fanbaseRead = function (state, g) {
    const F = KP.C.PRODUCT.FANBASE;
    const pop = g.popularity || 0;
    const social = (g.members || []).reduce((s, id) => {
      const p = state.people[id];
      return s + (p ? KP.socialOf(state, p) : 0);
    }, 0);
    const intensity = g.fandom ? (g.fandom.intensity || 0) : 0;
    // the social term is SUBLINEAR (root, not share): follower counts
    // inflate without bound across a career, buyers do not — the first
    // calibration's linear term compounded flagship chodongs x7 over
    // four eras and ran the soak's budget invariant off the road
    return Math.round(
      Math.pow(Math.max(0, pop), F.popPow) * F.popMult +
      Math.sqrt(Math.max(0, social)) * F.socialRoot * (0.5 + intensity / 100) +
      (g.lastChodong || 0) * F.lastMult);
  };

  // the pre-order window: what the desk can SEE before pressing —
  // fed by the era's buildup and campaign momentum (§76/§77)
  KP.preorderRead = function (state, g) {
    const F = KP.C.PRODUCT.FANBASE;
    const buildup = (g.prep && g.prep.buildup) || 0;
    const mom = (g.prep && g.prep.campaign && g.prep.campaign.momentum) || 0;
    const demand = KP.fanbaseRead(state, g) *
      (1 + buildup / 150 + mom / 250);
    return Math.round(demand * F.preorderShare);
  };

  // ---- the pressing sheet ----------------------------------------------
  KP.suggestPressing = function (state, g) {
    const pop = g.popularity || 0;
    const intensity = g.fandom ? (g.fandom.intensity || 0) : 0;
    return {
      versions: pop < 45 ? 1 : pop < 65 ? 2 : 3,
      pob: intensity >= 60 ? 'lavish' : intensity >= 30 ? 'standard' : 'none',
      preset: 'suggested',
      signRounds: g.fandom && intensity >= 30 ? 1 : 0,
    };
  };
  KP.normalizePressing = function (state, g, sheet) {
    const P = KP.C.PRODUCT;
    const base = KP.suggestPressing(state, g);
    const versions = KP.clamp(Math.round((sheet && sheet.versions) || base.versions), 1, 4);
    const pob = (sheet && P.pobCost[sheet.pob] != null) ? sheet.pob : base.pob;
    const preset = (sheet && P.runPresets[sheet.preset]) ? sheet.preset : 'suggested';
    const signRounds = KP.clamp(Math.round((sheet && sheet.signRounds) != null
      ? sheet.signRounds : base.signRounds), 0, P.signRoundsMax);
    // the run is FIXED at lock against the read of that day — that is
    // the whole gamble. The read includes what the sheet itself will do
    // to demand (collectors buy the line), so the preset is TRUE
    // headroom, not headroom minus the sheet's own lift.
    const read = (KP.preorderRead(state, g) / KP.C.PRODUCT.FANBASE.preorderShare) *
      P.versionDemand[versions - 1] * P.pobDemand[pob];
    const run = Math.max(200, Math.round(read * P.runPresets[preset]));
    return { versions, pob, preset, signRounds, run, lockRead: Math.round(read) };
  };
  KP.pressingBill = function (state, g, sheet) {
    const P = KP.C.PRODUCT;
    return Math.round(
      P.versionCost * (sheet.versions - 1) +
      P.pobCost[sheet.pob] +
      (sheet.run / 1000) * P.unitCostPerK +
      sheet.signRounds * P.signRoundCost);
  };

  // ---- release week: the chodong settles -------------------------------
  // Called from resolveDebut with the final reception. Returns
  // { physRev, chodong, ...facts, notes } — notes flow into the
  // resolution's narrative pipeline.
  KP.settleProduct = function (state, g, reception, rng, opts) {
    const P = KP.C.PRODUCT;
    const notes = [];
    const sheet = (g.prep && g.prep.pressing) || KP.normalizePressing(state, g, null);
    const intensity = g.fandom ? (g.fandom.intensity || 0) : 0;
    const signMult = 1 + sheet.signRounds * P.signRoundBoost * (0.5 + intensity / 100);
    // a debut's demand is anchored between what the pre-orders showed
    // and what the hype became — a comeback's fanbase is already known
    const settleBase = KP.fanbaseRead(state, g);
    const lockBase = sheet.lockRead != null
      ? sheet.lockRead / (P.versionDemand[sheet.versions - 1] * P.pobDemand[sheet.pob])
      : settleBase;
    const base = g.debuted ? settleBase : (settleBase + lockBase) / 2;
    let demand = base *
      P.versionDemand[sheet.versions - 1] *
      P.pobDemand[sheet.pob] *
      signMult *
      (1 + (reception - 50) / 200) *
      (1 + (rng.next() * 2 - 1) * P.chodongNoise) *
      (opts && opts.repack ? P.repackDemand : 1);
    demand = Math.max(0, Math.round(demand));
    const soldOut = demand > sheet.run;
    const chodong = Math.min(demand, sheet.run);
    const reorder = soldOut ? Math.round((demand - sheet.run) * P.reorderShare) : 0;
    const units = chodong + reorder;
    const overpress = !soldOut && sheet.run > demand * P.overpressAt;
    // the distributor (v0.10.1) takes the cut and supplies the reach —
    // the starter deal is one more brick in the obscurity wall
    const physRev = Math.round((units / 1000) * P.marginPerK *
      P.pobMargin[sheet.pob] * ((opts && opts.overseasMult) || 1) *
      (KP.distCut ? KP.distCut(state) : 1));
    const last = g.lastChodong || 0;
    g.lastChodong = units;
    if (sheet.signRounds > 0) {
      (g.members || []).forEach(id => {
        const m = state.people[id];
        if (m && !KP.onBreak(m)) m.fatigue = KP.clamp(m.fatigue + P.signFatigue, 0, 100);
      });
    }

    // the number, out loud — the fandom's scoreboard beside the public's
    const vs = last > 0
      ? (units >= last * 1.15 ? ' Up from ' + KP.fmtCount(last) + ' — the fandom GREW between eras, and this is the number that proves it.'
        : units <= last * 0.8 ? ' Down from ' + KP.fmtCount(last) + '. Reception is opinion; this number is wallets, and the wallets cooled.'
        : ' Holding against ' + KP.fmtCount(last) + ' last era — a fandom that shows up twice is a fandom.')
      : ' A first chodong is a birth certificate: this is how many people PAY.';
    const pack = sheet.versions + ' version' + (sheet.versions === 1 ? '' : 's') +
      (sheet.pob !== 'none' ? ', ' + sheet.pob + ' pre-order gifts' : '');
    notes.push({ kind: 'debut', ind: 'chodong', priority: 'high', groupId: g.id,
      text: KP.lineFor(state, 'chodong|' + g.id, [
        'First-week sales for ' + g.name + ': ' + KP.fmtCount(units) + ' albums (' + pack + ').' + vs,
        'The chodong is in for ' + g.name + ': ' + KP.fmtCount(units) + ' albums in week one (' + pack + ').' + vs,
        g.name + ' moved ' + KP.fmtCount(units) + ' albums in the first week — ' + pack + '.' + vs,
      ]) });
    if (soldOut) {
      notes.push({ kind: 'debut', ind: 'soldOutStory', priority: 'high', groupId: g.id,
        text: KP.lineFor(state, 'soldOut|' + g.id, [
          'SOLD OUT: the ' + KP.fmtCount(sheet.run) + ' pressing of the ' + g.name +
            ' record was gone inside the week — demand ran to ' + KP.fmtCount(demand) +
            '. The reorder ships late and catches only the diehards; the rest is the ' +
            'sweetest lost money in the business. Press braver next time. Or exactly this brave, forever, for the headlines.',
          'SOLD OUT. ' + KP.fmtCount(sheet.run) + ' copies of the ' + g.name + ' record, gone inside the week against demand of ' + KP.fmtCount(demand) +
            '. The reorder lands late and catches the diehards; the difference is the sweetest money this business ever loses.',
          'The ' + g.name + ' pressing — ' + KP.fmtCount(sheet.run) + ' — SOLD OUT before the second weekend; demand ran to ' + KP.fmtCount(demand) +
            '. The warehouse is proud, the fans are furious, the reorder is late. Press braver, or exactly this brave for the headline.',
        ]) });
    }
    // the restock door (v0.11.5, §96 wiring): the late reorder catches a
    // share of the overflow; what it leaves was a question nobody asked.
    // The distributor asks it on the Desk — opened here, answered as an
    // action; the default and the expiry are scarce, today's behaviour
    const unmet = soldOut ? demand - sheet.run - reorder : 0;
    if (unmet >= P.restockMinUnits) {
      KP.openScene(state, { kind: 'restockCall', groupId: g.id, releaseWeek: state.week,
        remaining: unmet, run: sheet.run, demand, pob: sheet.pob,
        overseasMult: (opts && opts.overseasMult) || 1,
        expiresWeek: state.week + P.restockFuseWeeks });
    }
    // the warehouse memo, returned (v0.11.5, §96 wiring — trimmed in §89 A
    // while the pressing card kept promising it): normal priority, the run
    // against the demand in words, the counts public, never a ratio
    if (overpress) {
      const times = demand <= 0 ? 'pressed for a fandom that did not come'
        : sheet.run >= demand * P.overpressTripleAt ? 'three times what the fandom bought'
        : sheet.run >= demand * P.overpressDoubleAt ? 'twice what the fandom bought'
        : 'nearly twice what the fandom bought';   // the memo's floor is overpressAt (1.6x)
      notes.push({ kind: 'company', ind: 'warehouseMemo', priority: 'normal', groupId: g.id,
        text: KP.lineFor(state, 'warehouse|' + g.id, [
          'The warehouse wrote the memo: boxes of the ' + g.name + ' record are stacked in the hallway outside the practice rooms — ' + KP.fmtCount(sheet.run) + ' pressed, ' + KP.fmtCount(demand) + ' bought, ' + times + '. The memo is one line long and signed by nobody.',
          'The second pressing nobody ordered: the ' + g.name + ' run came to ' + times + ' — ' + KP.fmtCount(sheet.run) + ' pressed against ' + KP.fmtCount(demand) + ' sold — and the warehouse would like to know where the rest is going to live.',
          'The warehouse’s invoice came with a note stapled to it: the ' + g.name + ' pressing ran to ' + times + ', ' + KP.fmtCount(sheet.run) + ' for ' + KP.fmtCount(demand) + ' sold, and storage bills monthly. The forecast was optimism. The shelving is real.',
        ]) });
    }
    // the cut line was 87% trimmed (§89 A): the rounds show on the sheet
    if (sheet.signRounds > 0) {
      if (sheet.signRounds >= P.dumpRiskAt && rng.chance(P.dumpChance)) {
        const d = KP.igniteDiscourse && KP.igniteDiscourse(state, rng, 'albumDump', 'group', g.id, g.id);
        if (d) notes.push(d);
        notes.push({ kind: 'public', ind: 'dumpStory', priority: 'high', groupId: g.id,
          text: 'A photo of two hundred unwrapped ' + g.name + ' albums stacked by a donation bin is doing angry numbers. The company scheduled ' + sheet.signRounds +
            ' sign rounds against one wallet-week and the internet did the math. The albums sold either way — that is precisely the accusation.' });
      }
    }
    return { physRev, chodong: units, run: sheet.run, versions: sheet.versions,
      pob: sheet.pob, signRounds: sheet.signRounds, demand, soldOut, overpress, notes };
  };

  // the two publics: the identity between the axes, on the record
  KP.recordProfile = function (state, g, physRev, digitalRev, units, reception) {
    const P = KP.C.PRODUCT;
    const ratio = physRev / Math.max(1, digitalRev);
    if (ratio >= P.titanSkew && units >= 15000) {
      return KP.recordEvidence(state, 'sellsLikeTitan', 'group', g.id);
    }
    if (ratio <= P.rumorSkew && reception >= 60) {
      return KP.recordEvidence(state, 'digitalDarling', 'group', g.id);
    }
    return null;
  };

  // ---- the product ledger (v0.11.5, §96 wiring) --------------------------
  // created by the restock resolve (an action), never by a render
  KP.productLedger = function (state) {
    state.productLedger = state.productLedger || { restocks: 0 };
    return state.productLedger;
  };

  // ---- the restock door (v0.11.5, §96 wiring) ----------------------------
  // A sell-out's late reorder catches a share of the overflow; the rest
  // used to be the sweetest lost money in the business, unasked. The
  // distributor asks now: a second run at the sheet's own unit cost,
  // landing late, catching restockShare of what is left — or the shelves
  // stay empty and the sold-out story keeps doing the marketing. The
  // default (options[0]) and the expiry are scarce: exactly the old
  // behaviour, so the bot's soak does not move.
  function restockUnits(sc) {
    return Math.round((sc.remaining || 0) * KP.C.PRODUCT.restockShare);
  }
  function restockBill(units) {
    return Math.round((units / 1000) * KP.C.PRODUCT.unitCostPerK);
  }
  KP.registerScene('restockCall', {
    title: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      return (g ? g.name : 'The record') + ' · the restock call';
    },
    body: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      const rel = g ? (g.releases || []).find(r => r.week === sc.releaseWeek) : null;
      const units = restockUnits(sc);
      const bill = restockBill(units);
      return 'The ' + (rel ? '“' + rel.songTitle + '” ' : '') + 'pressing is gone — ' + KP.fmtCount(sc.run || 0) +
        ' copies against demand of ' + KP.fmtCount(sc.demand || 0) + ', and the late reorder caught the diehards. About ' +
        KP.fmtCount(sc.remaining || 0) + ' wallets are still open. The distributor can press again: a second run of ' +
        KP.fmtCount(units) + ', landing late, ' + (bill > 0 ? 'at the sheet’s own unit cost (' + bill + ')' : 'at a unit cost the books will barely notice') +
        '. Or the shelves stay empty and the sold-out story keeps doing the marketing.';
    },
    options: (state, sc) => {
      const bill = restockBill(restockUnits(sc));
      return [
        { id: 'scarce', label: 'Let it stay scarce' },
        { id: 'press', label: 'Press a second run' + (bill > 0 ? ' · ' + bill : '') },
      ];
    },
    resolve: (state, sc, optionId) => {
      const g = KP.groupById(state, sc.groupId);
      if (!g) return { toast: 'The record is out of print, one way or another.' };
      if (optionId !== 'press') {
        return { toast: 'The shelves stay empty. The sold-out story runs — the sweetest lost money in the business.' };
      }
      const P = KP.C.PRODUCT;
      const wanted = restockUnits(sc);
      const bill = restockBill(wanted);
      // debits clamp to what exists: the plant presses what the account covers
      const paid = Math.min(bill, Math.max(0, state.budget));
      if (wanted <= 0 || (bill > 0 && paid <= 0)) {
        return { ok: false, reason: 'The account cannot cover a second run. The shelves wait.' };
      }
      const units = bill > 0 ? Math.round(wanted * paid / bill) : wanted;
      state.budget -= paid;
      if (KP.ledgerFlow) KP.ledgerFlow(state, 'production', -paid);
      // the money rides the chodong's own path: the unit margin, the gifts'
      // margin, the overseas read, the distributor's cut — then the physical
      // stream and the group's share
      const revenue = Math.round((units / 1000) * P.marginPerK * (P.pobMargin[sc.pob] || 1) *
        (sc.overseasMult || 1) * (KP.distCut ? KP.distCut(state) : 1));
      state.budget += revenue;
      if (KP.ledgerFlow) KP.ledgerFlow(state, 'albums', revenue);
      if (KP.settleShare) KP.settleShare(state, g, revenue);
      KP.productLedger(state).restocks++;
      const rel = (g.releases || []).find(r => r.week === sc.releaseWeek);
      if (rel) rel.restock = { week: state.week, units, revenue };
      // the money is public; a run too small to round into the books says so
      const money = revenue > 0 || paid > 0
        ? paid + ' to the plant, ' + revenue + ' back through the till'
        : 'a bill and a return too small for the books to notice';
      return { toast: 'Pressed again: ' + KP.fmtCount(units) + ' more copies, landing late.',
        note: { kind: 'company', ind: 'restockPressed', priority: 'high', groupId: g.id,
          text: KP.lineFor(state, 'restock|' + g.id, [
            'The second run of the ' + g.name + ' record is pressed — ' + KP.fmtCount(units) + ' copies, landing late; ' + money + '. The fans who missed the first week got their copies; the ones who got the first week are explaining why theirs are rarer.',
            'RESTOCKED: ' + KP.fmtCount(units) + ' more copies of the ' + g.name + ' record, late and wanted — ' + money + '. The sold-out headline ends here, which the fandom minds less than you would think. They wanted the album.',
            'The distributor shipped the second ' + g.name + ' run: ' + KP.fmtCount(units) + ' copies, ' + money + '. The shelves are full again and the “restock WHEN” accounts have gone quiet in the specific way of people holding a parcel.',
          ]) } };
    },
    expire: () => null,   // silence is scarce — the old behaviour, unmarked
  });

  // ---- the timeline reads the numbers ----------------------------------
  KP.onFeedEvent('chodong', (state, n, rng) => rng.pick([
    { persona: 'stan', text: 'chodong day. spreadsheet open, calculator out, comparison charts loading. we do not gatekeep the number, we FRAME it' },
    { persona: 'press', text: 'First-week sales published. Reception tells you what critics heard; the chodong tells you who showed up with a card. They are frequently not the same story.' },
    { persona: 'casual', text: 'fandoms treating first-week album numbers like election night will never not be fascinating. it is a spreadsheet. they are crying over a spreadsheet' },
    { persona: 'fan', text: 'every single copy of that chodong is somebody who chose us. anyway I bought four versions. for the culture. and the photocards' },
  ]));
  KP.onFeedEvent('soldOutStory', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'SOLD OUT. restock WHEN. my version-3 preorder is in limbo and I have never felt so alive and so robbed at the same time' },
    { persona: 'casual', text: 'small label underpresses, sells out in four days, and the story does more marketing than the marketing did. the accidental-scarcity playbook, unlocked by accident' },
    { persona: 'press', text: 'An out-of-stock notice during the only sales week that counts is the most expensive good news in the industry. Somebody in that office is being congratulated and yelled at simultaneously.' },
  ]));
  KP.onFeedEvent('warehouseMemo', (state, n, rng) => rng.chance(0.4) ? rng.pick([
    { persona: 'casual', text: 'the gap between a label’s pressing order and its actual fandom size is the most honest number in this industry and it lives in a warehouse' },
    { persona: 'critic', text: 'Overpressing is optimism with a storage bill. The record was fine. The forecast was fan fiction.' },
  ]) : null);
  // the second run (v0.11.5, §96 wiring): the restock accounts get their parcel
  KP.onFeedEvent('restockPressed', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'RESTOCK. it is HERE. the “restock WHEN” era is over and I have never been so happy to delete a pinned post' },
    { persona: 'casual', text: 'label sells out, prints more, sells those too. the rarest business model in this industry: having the thing people want to buy' },
    { persona: 'press', text: 'A second pressing after a sell-out week is the quiet admission every label eventually makes: the forecast was fear, and the fandom was bigger than the forecast.' },
  ]));
  KP.onFeedEvent('cutLine', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'the cut line is out and I am NOT saying how many copies I bought. I am saying I have a favorite delivery driver now and he has a favorite idol' },
    { persona: 'casual', text: 'fan-sign cut lines are the stock ticker of parasocial devotion and honestly more transparent than most actual markets' },
    { persona: 'stan', text: 'posted the cut line and three rival fandoms replied with theirs. this is the real chart. everyone knows this is the real chart' },
  ]));
  KP.onFeedEvent('dumpStory', (state, n, rng) => rng.pick([
    { persona: 'press', text: 'The album-dumping photos resurface every cycle, and every cycle the same question goes unanswered: the sales strategy that produced the stack was designed in an office, not a fan café.' },
    { persona: 'casual', text: 'the donation-bin album photo again. the fans get blamed, the company that scheduled four sign rounds against one paycheck does not. make it make sense' },
    { persona: 'fan', text: 'we are not okay about the dumping photo. we are also refreshing the restock page. the discourse contains multitudes' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
