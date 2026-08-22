/* The Japan cycle (v0.10.8, §80 finding 4) — the second discography
   on its own calendar. Past a warmth threshold the partner label
   calls: a licensing deal that opens the JP lane — the JP-version
   single (the hit re-cut, cheap and quick) or the JP-original (a
   real record, written for the market, twice the weeks). The lane
   claims REAL in-country weeks: no Korean release, no tour, no
   fancon while the group is in Tokyo. Results post to the Nichion
   weekly against the rival titans who run the same cycle, revenue
   flows through the books with the partner's cut off the top, and
   the JP fanbase climbs the ladder every touring act measures
   itself against: the hall, the arena, THE DOME. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.jpLedger = state.jpLedger ||
      { offers: 0, signed: 0, releases: 0, originals: 0, topTens: 0,
        numberOnes: 0, rungs: 0, domes: 0 };
    return state.jpLedger;
  }
  KP.jpLedger = ledger;

  const PARTNERS = ['Aozora Records', 'Hoshiboshi', 'Kagayaki Tokyo', 'Umineko Label'];

  // the titans' pulse: hash-driven weekly scores, no state
  function titanScore(state, i) {
    const J = KP.C.JAPAN;
    const pulse = KP.hash01([state.seed, 'titan', i, Math.floor(state.week / 8)].join('|'));
    return J.titanBase[i] * (0.75 + pulse * 0.5);
  }

  // ---- the partner call --------------------------------------------------
  KP.registerScene('partnerDeal', {
    title: (state, sc) => sc.partner + ' · the licensing table',
    body: (state, sc) => {
      return sc.partner + ' flew in for this meeting: a licensing partnership for the Japanese market. ' +
        'They handle distribution, broadcast bookings, the in-country machine — and take ' +
        Math.round(KP.C.JAPAN.partnerCut * 100) + '% of everything Japan, forever. In exchange, the second ' +
        'discography opens: JP releases on their calendar, the Nichion chart, the hall-arena-dome ladder every ' +
        'touring act measures itself against. Nobody runs Japan alone. The question is whether you run it with them.';
    },
    options: () => [
      { id: 'sign', label: 'Sign the partnership' },
      { id: 'decline', label: 'Not yet' },
    ],
    resolve: (state, sc, optionId) => {
      if (optionId !== 'sign') {
        state.jpDeclinedWeek = state.week;
        return { toast: 'Declined, politely. The market stays across the water; the phone number keeps.' };
      }
      state.jpPartner = { name: sc.partner, since: state.week };
      ledger(state).signed++;
      KP.note(state, { kind: 'company', ind: 'jpSigned', priority: 'high',
        text: 'Signed: the ' + sc.partner + ' partnership. The press release runs in two languages, the second discography officially exists, and somewhere in the building somebody pins a map of dome venues to a corkboard. The ladder starts at the bottom like every ladder.' });
      return { toast: 'The second discography opens. Japan runs on its own calendar now.' };
    },
    expire: (state, sc) => { state.jpDeclinedWeek = state.week; return null; },
  });

  // ---- the lane: the verb ------------------------------------------------
  KP.planJapanRelease = function (state, groupId, laneId) {
    const J = KP.C.JAPAN;
    const lane = J.LANES[laneId];
    if (!lane) return { ok: false, reason: 'The lane is JP-version or JP-original. Pick one.' };
    if (!state.jpPartner) return { ok: false, reason: 'Nobody runs Japan alone. The partnership comes first.' };
    const g = KP.groups(state).find(x => x.id === groupId);
    if (!g || !g.debuted || g.retiredWeek) return { ok: false, reason: 'The lane is for a debuted act.' };
    if (g.prep || g.tour || g.hiatus || g.jpAway) return { ok: false, reason: 'The calendar is spoken for.' };
    if (state.week <= (g.promoUntil || 0)) return { ok: false, reason: 'Mid-promotion. Japan claims whole weeks, not spare ones.' };
    if ((KP.regionsOf(g).jp || 0) < J.minWarmth) {
      return { ok: false, reason: 'The room over there is still quiet. A release into silence is a shipment, not a debut.' };
    }
    if (state.week - (g.lastJpWeek || -999) < J.cooldown) {
      return { ok: false, reason: 'The partner paces the market. The last JP record is still working.' };
    }
    if (state.budget < lane.cost) return { ok: false, reason: 'The lane bills up front — ' + lane.cost + '.' };
    state.budget -= lane.cost;
    if (KP.ledgerFlow) { KP.ledgerFlow(state, 'japan', -lane.cost); KP.accrueDebt(state, g, lane.cost); }
    g.jpAway = { lane: laneId, until: state.week + lane.weeks };
    g.lastJpWeek = state.week;
    KP.note(state, { kind: 'company', ind: 'jpLaneOpen', priority: 'high', groupId: g.id,
      text: g.name + ' flies out: ' + lane.word + ', ' + lane.weeks + ' weeks in-country on ' +
        state.jpPartner.name + '’s calendar. The Korean schedule goes quiet — that is not a gap, that is the cost. Groups that run Japan vanish from Seoul for a quarter, and the ones that do it right come back bigger in both places.' });
    return { ok: true };
  };

  // ---- the week ----------------------------------------------------------
  KP.registerWeekly('japan', 762, function (state, rng, inbox) {
    const J = KP.C.JAPAN;
    const led = ledger(state);
    // the partner calls when the warmth is real
    if (!state.jpPartner &&
        state.week - (state.jpDeclinedWeek || -999) > 24 &&
        !(state.scenes || []).some(sc => sc.kind === 'partnerDeal')) {
      const warm = KP.groups(state).some(g => g.debuted && (KP.regionsOf(g).jp || 0) >= J.partnerAt);
      if (warm && rng.chance(0.25)) {
        led.offers++;
        const partner = PARTNERS[Math.floor(KP.hash01([state.seed, 'jppartner'].join('|')) * PARTNERS.length)];
        KP.openScene(state, { kind: 'partnerDeal', partner, expiresWeek: state.week + 3 });
        inbox.push({ kind: 'industry', ind: 'jpOffer', priority: 'high',
          text: partner + ' has been watching the Japanese numbers and wants the meeting — a licensing partnership, the real kind, with the second discography behind it. The table is on the Desk. The market across the water does not knock twice quickly.' });
      }
    }
    // the away weeks resolve
    KP.groups(state).forEach(g => {
      if (!g.jpAway) return;
      // the weeks in-country: fatigue, warmth building on the ground
      if (state.week < g.jpAway.until) {
        g.members.map(id => state.people[id]).filter(Boolean).forEach(m => {
          if (!KP.onBreak(m)) m.fatigue = KP.clamp(m.fatigue + 3, 0, 100);
        });
        return;
      }
      // release week: the record posts to the Nichion weekly
      const laneId = g.jpAway.lane;
      const lane = J.LANES[laneId];
      delete g.jpAway;
      led.releases++;
      if (laneId === 'original') led.originals++;
      const regions = KP.regionsOf(g);
      const lastRec = (g.releases || []).length ? g.releases[g.releases.length - 1].reception : 45;
      const voice = KP.voiceAbroad ? KP.voiceAbroad(state, g, 'jp') : null;
      let score = (regions.jp * 0.55 + lastRec * 0.45) * lane.mult *
        (0.9 + rng.next() * 0.25);
      if (!voice) score *= J.noVoiceDamp;
      const board = J.titans.map((name, i) => ({ name, score: titanScore(state, i) }));
      board.push({ name: g.name, score, mine: true });
      board.sort((a, b) => b.score - a.score);
      const rank = board.findIndex(r => r.mine) + 1;
      if (rank <= 10) led.topTens++;
      if (rank === 1) led.numberOnes++;
      const revenue = Math.round(score * J.revPerScore * (1 - J.partnerCut));
      state.budget += revenue;
      if (KP.ledgerFlow) KP.ledgerFlow(state, 'japan', revenue);
      if (KP.settleShare) KP.settleShare(state, g, revenue);
      regions.jp = KP.clamp(regions.jp + J.warmthGain[laneId], 0, 100);
      g.jpFans = (g.jpFans || 0) + Math.round(score * J.fansPerScore);
      inbox.push({ kind: 'public', ind: 'jpRelease', priority: 'high', groupId: g.id,
        text: g.name + '’s ' + (laneId === 'original' ? 'JP-original' : 'JP-version') + ' posts at #' + rank +
          ' on the Nichion weekly' + (rank === 1 ? ' — NUMBER ONE, over ' + board[1].name + ', and the partner office sent flowers'
            : rank === 2 ? ', one rung under ' + board[0].name : ', in a chart the titans own by default') +
          '. ' + revenue + ' through the books after ' + state.jpPartner.name + '’s cut' +
          (voice ? ', with ' + KP.displayName(voice) + ' carrying every interview — the market remembers who speaks to it.'
                 : ' — and every interview ran through an interpreter, which the variety clips did not forgive.') });
      // the ladder: the fanbase buys the next rung
      const rung = J.LADDER.filter(r => g.jpFans >= r.at).pop();
      const rungIdx = rung ? J.LADDER.indexOf(rung) : -1;
      if (rungIdx > (g.jpRung != null ? g.jpRung : -1)) {
        g.jpRung = rungIdx;
        led.rungs++;
        const rrev = Math.round(rung.rev * (1 - J.partnerCut));
        state.budget += rrev;
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'japan', rrev);
        if (KP.settleShare) KP.settleShare(state, g, rrev);
        if (rung.id === 'dome') {
          led.domes++;
          const nar = KP.recordEvidence(state, 'domeNight', 'group', g.id);
          if (nar) inbox.push(nar);
          inbox.push({ kind: 'public', ind: 'jpDome', priority: 'critical', groupId: g.id,
            text: g.name + ' PLAYED THE DOME. Fifty thousand lightsticks, a stage the size of a district, and the encore in careful Japanese that the crowd finished for them. There are two kinds of touring acts in this industry, and as of tonight this label manages the other kind. ' + rrev + ' through the books, and a photograph for every office wall the company will ever have.' });
        } else {
          inbox.push({ kind: 'public', ind: 'jpRung', priority: 'high', groupId: g.id,
            text: g.name + ' books ' + rung.word + ' in Japan — the ladder every touring act measures itself against, one rung bought with ' + KP.fmtCount(g.jpFans) + ' fans who learned the fanchants phonetically. ' + rrev + ' through the books. The next rung is visible from this one. That is the trap and the point.' });
        }
      }
    });
  });

  // ---- the timeline reacts -----------------------------------------------
  KP.onFeedEvent('jpRelease', (state, n, rng) => rng.chance(0.5) ? rng.pick([
    { persona: 'fan', text: 'the JP release is out and the fandom is learning a second language out of spite and love. the phonetic fanchant guide has 40k views' },
    { persona: 'casual', text: 'the japan cycle remains the industry’s best-kept open secret: vanish from seoul for a quarter, come back with a second country’s receipts' },
  ]) : null);
  KP.onFeedEvent('jpDome', (state, n, rng) => rng.pick([
    { persona: 'press', text: 'A dome night changes a company’s category. Charts are argued about; fifty thousand tickets are counted. Tonight somebody’s category changed.' },
    { persona: 'stan', text: 'THE DOME. THE ACTUAL DOME. the fancams are 4K and the crying in them is bilingual. nothing will ever be the same and we have the lightstick ocean footage to prove it' },
    { persona: 'fan', text: 'from a practice room to the dome. somebody check on the first fansite master, she has earned the night off' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
