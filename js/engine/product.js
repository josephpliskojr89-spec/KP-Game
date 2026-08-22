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
    notes.push({ kind: 'debut', ind: 'chodong', priority: 'high', groupId: g.id,
      text: 'First-week sales for ' + g.name + ': ' + KP.fmtCount(units) + ' albums (' +
        sheet.versions + ' version' + (sheet.versions === 1 ? '' : 's') +
        (sheet.pob !== 'none' ? ', ' + sheet.pob + ' pre-order gifts' : '') + ').' + vs });
    if (soldOut) {
      notes.push({ kind: 'debut', ind: 'soldOutStory', priority: 'high', groupId: g.id,
        text: 'SOLD OUT: the ' + KP.fmtCount(sheet.run) + ' pressing of the ' + g.name +
          ' record was gone inside the week — demand ran to ' + KP.fmtCount(demand) +
          '. The reorder ships late and catches only the diehards; the rest is the ' +
          'sweetest lost money in the business. Press braver next time. Or exactly this brave, forever, for the headlines.' });
    } else if (overpress) {
      notes.push({ kind: 'company', ind: 'warehouseMemo', priority: 'flavor', groupId: g.id,
        text: 'The warehouse memo nobody frames: ' + KP.fmtCount(sheet.run - demand) +
          ' unsold copies of the ' + g.name + ' record are now a storage line item. The pressing was a bet on a fandom this size — the fandom disagreed.' });
    }
    if (sheet.signRounds > 0) {
      const seats = sheet.signRounds * P.cutSeatsPerRound;
      const cut = Math.max(1, Math.round(units * 0.3 / (seats * 8)));
      notes.push({ kind: 'public', ind: 'cutLine', priority: 'flavor', groupId: g.id,
        text: 'Fan-sign cut line for the ' + g.name + ' rounds: ' + cut + ' album' +
          (cut === 1 ? '' : 's') + ' for the last winning seat. The fandom posts it with pride and horror in the same thread. Both are advertising.' });
      if (sheet.signRounds >= P.dumpRiskAt && rng.chance(P.dumpChance)) {
        const d = KP.igniteDiscourse && KP.igniteDiscourse(state, rng, 'albumDump', 'group', null, g.id);
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
