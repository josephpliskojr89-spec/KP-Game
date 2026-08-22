/* The recurring money (v0.10.3, §80 findings 6+10) — fandom commerce
   and the catalog annuity. The steady commerce is what pays salaries
   in non-comeback quarters: paid membership (annual, priced — money
   against love), Season's Greetings every Q4, the merch line at every
   tour, and the fancon — cheap to produce, membership-warm, a bridge
   between eras. Squeeze too hard and the "we are not ATMs" story
   writes itself. And the back catalog pays weekly forever: an annuity
   that stabilizes bad quarters — with publishing royalties that
   follow the PERSON, not the contract. A member who wrote a hit gets
   paid whether or not she re-signs, and the renewal table knows it. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.commerceLedger = state.commerceLedger ||
      { clubs: 0, renewals: 0, greetings: 0, fancons: 0, tourMerch: 0,
        catalogPaid: 0, royaltyChecks: 0, atmStorms: 0 };
    return state.commerceLedger;
  }
  KP.commerceLedger = ledger;

  function merchPush(state, g) {
    g.merchPushes = (g.merchPushes || []).filter(w => state.week - w <= KP.C.MERCH.atmWindow);
    g.merchPushes.push(state.week);
    return g.merchPushes.length;
  }
  function atmRisk(state, rng, inbox, g) {
    const M = KP.C.MERCH;
    if (merchPush(state, g) >= M.atmPushes && rng.chance(M.atmChance) &&
        !(state.discourses || []).some(d => d.kind === 'atmStory')) {
      ledger(state).atmStorms++;
      const d = KP.igniteDiscourse && KP.igniteDiscourse(state, rng, 'atmStory', 'group', null, g.id);
      if (d) inbox.push(d);
      inbox.push({ kind: 'public', ind: 'atmStory', priority: 'high', groupId: g.id,
        text: 'The fandom did the math out loud: membership, the drop, the fancon, the versions — all inside one season. The thread is titled "we are not ATMs," it is extremely organized, and it is aimed at the COMPANY’s calendar, not the group. The calendar was, in fairness, aimed at wallets.' });
    }
  }

  // ---- the fancon: the between-eras verb -------------------------------
  KP.holdFancon = function (state, groupId) {
    const M = KP.C.MERCH;
    const g = KP.groups(state).find(x => x.id === groupId);
    if (!g || !g.debuted || g.retiredWeek) return { ok: false, reason: 'A fancon needs a debuted act and a room that wants it.' };
    if (g.prep || g.tour || g.hiatus) return { ok: false, reason: 'The calendar is spoken for.' };
    if (state.week <= (g.promoUntil || 0)) return { ok: false, reason: 'Mid-promotion. The fancon is for the quiet between.' };
    if (!g.fandom || (g.fandom.intensity || 0) < M.fanconMinIntensity) {
      return { ok: false, reason: 'A fancon for an unorganized fandom is a theater rental with extra sadness. Build the room first.' };
    }
    if (state.week - (g.lastFanconWeek || -999) < M.fanconCooldown) {
      return { ok: false, reason: 'The last fancon is still a fresh memory — that is what makes it worth money.' };
    }
    if (state.budget < M.fanconCost) return { ok: false, reason: 'The venue bills up front.' };
    state.budget -= M.fanconCost;
    const fanbase = KP.fanbaseRead ? KP.fanbaseRead(state, g) : 2000;
    const revenue = Math.round((fanbase / 1000) * M.fanconPerK);
    state.budget += revenue;
    if (KP.ledgerFlow) { KP.ledgerFlow(state, 'commerce', revenue - M.fanconCost); }
    if (KP.settleShare) KP.settleShare(state, g, revenue);
    g.fandom.intensity = KP.clamp(g.fandom.intensity + M.fanconIntensity, 0, 100);
    g.lastFanconWeek = state.week;
    g.members.map(id => state.people[id]).filter(Boolean).forEach(m => {
      if (KP.onBreak(m)) return;
      m.fatigue = KP.clamp(m.fatigue + M.fanconFatigue, 0, 100);
      m.morale = KP.clamp(m.morale + 2, 0, 100);
    });
    ledger(state).fancons++;
    KP.note(state, { kind: 'public', ind: 'fanconHeld', priority: 'high', groupId: g.id,
      text: g.name + ' held a fancon — no charts, no scores, three hours of the room and the people who built it. ' +
        KP.fmtCount(Math.round(fanbase * 0.4)) + ' seats, ' + revenue + ' through the till, and the kind of footage the fandom keeps forever. Between eras, THIS is the work.' });
    const rng = KP.rngFor(state);
    const inbox2 = [];
    atmRisk(state, rng, inbox2, g);
    state.rngState = rng.state();
    inbox2.forEach(n => KP.note(state, n));
    return { ok: true, revenue };
  };

  // ---- the enrollment scene --------------------------------------------
  KP.registerScene('fanclubOpen', {
    title: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      return (g ? g.name : 'The fandom') + ' · fanclub enrollment';
    },
    body: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      return 'The fan cafés have been asking for it by name: official paid membership for ' +
        (g ? g.name : 'the group') + ' — early access, member pre-sales, the card with the number on it. ' +
        'Annual money, recurring, real. The only decision is the price, and the price is a sentence ' +
        'about what this label thinks the fandom is.';
    },
    options: () => [
      { id: 'standard', label: 'Market rate' },
      { id: 'gentle', label: 'Price it warm' },
      { id: 'steep', label: 'Price it steep' },
    ],
    resolve: (state, sc, optionId) => {
      const g = KP.groupById(state, sc.groupId);
      if (!g || !g.fandom) return { toast: 'The moment passed.' };
      const M = KP.C.MERCH;
      const tier = M.TIERS[optionId] ? optionId : 'standard';
      g.fanclub = { tier, since: state.week };
      g.fandom.intensity = KP.clamp(g.fandom.intensity + M.TIERS[tier].intensity, 0, 100);
      const fanbase = KP.fanbaseRead ? KP.fanbaseRead(state, g) : 2000;
      const members = Math.round(fanbase * M.memberShare);
      const revenue = Math.round((members / 1000) * M.perK * M.TIERS[tier].rate);
      state.budget += revenue;
      if (KP.ledgerFlow) KP.ledgerFlow(state, 'commerce', revenue);
      if (KP.settleShare) KP.settleShare(state, g, revenue);
      // enrollment is a monetization push — it counts toward the season's
      // squeeze even though the storm rolls at the NEXT push
      merchPush(state, g);
      ledger(state).clubs++;
      KP.note(state, { kind: 'public', ind: 'clubOpened', priority: 'high', groupId: g.id,
        text: 'The ' + g.name + ' official fanclub opened enrollment: ' + KP.fmtCount(members) +
          ' members in the first wave, ' + revenue + ' in annual dues' +
          (tier === 'steep' ? ' — and a pricing thread the company will pretend not to have read.'
            : tier === 'gentle' ? ' — priced warm, and the fandom NOTICED. Loyalty compounds at this rate.'
            : '.') });
      return { toast: 'Enrollment open. Recurring money — the kind that pays salaries in quiet quarters.' };
    },
    expire: () => null,
  });

  // ---- the greetings scene ---------------------------------------------
  KP.registerScene('seasonsGreetings', {
    title: (state, sc) => 'Season’s Greetings · the Q4 package',
    body: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      return 'The Q4 institution: the Season’s Greetings package for ' + (g ? g.name : 'the group') +
        ' — calendar, photobook, the yearly object every organized fandom budgets for. Standard run, ' +
        'or the lavish edition with the price to match. The window is now; December does not reschedule.';
    },
    options: () => [
      { id: 'standard', label: 'Ship the standard' },
      { id: 'lavish', label: 'The lavish edition' },
      { id: 'skip', label: 'Skip the year' },
    ],
    resolve: (state, sc, optionId) => {
      const g = KP.groupById(state, sc.groupId);
      if (!g || !g.fandom) return { toast: 'The window closed.' };
      const M = KP.C.MERCH;
      if (optionId === 'skip') {
        g.fandom.intensity = KP.clamp(g.fandom.intensity - 2, 0, 100);
        return { toast: 'No package this year. The fandom noticed the silence where the calendar goes.' };
      }
      const lavish = optionId === 'lavish';
      if (lavish) {
        state.budget -= M.greetingsLavishCost;
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'commerce', -M.greetingsLavishCost);
      }
      const fanbase = KP.fanbaseRead ? KP.fanbaseRead(state, g) : 2000;
      const revenue = Math.round((fanbase / 1000) * M.greetingsPerK * (lavish ? M.greetingsLavishMult : 1));
      state.budget += revenue;
      if (KP.ledgerFlow) KP.ledgerFlow(state, 'commerce', revenue);
      if (KP.settleShare) KP.settleShare(state, g, revenue);
      ledger(state).greetings++;
      const rng = KP.rngFor(state);
      const inbox2 = [];
      atmRisk(state, rng, inbox2, g);
      state.rngState = rng.state();
      inbox2.forEach(n => KP.note(state, n));
      KP.note(state, { kind: 'public', ind: 'greetingsShipped', priority: 'flavor', groupId: g.id,
        text: 'The ' + g.name + ' Season’s Greetings shipped' + (lavish ? ' — lavish edition, unboxing videos incoming' : '') +
          ': ' + revenue + ' through the till and a calendar on ' + KP.fmtCount(Math.round(fanbase * 0.3)) + ' desks all year. The quietest good business in the industry.' });
      return { toast: lavish ? 'The lavish edition ships. December is handled.' : 'Shipped. The fandom’s year now has the group in it, monthly.' };
    },
    expire: () => null,
  });

  // ---- the week: enrollment windows, renewals, the annuity -------------
  KP.registerWeekly('commerce', 756, function (state, rng, inbox) {
    const M = KP.C.MERCH;
    const C = KP.C.CATALOG_PAY;
    const led = ledger(state);
    const woy = ((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1;
    KP.groups(state).forEach(g => {
      if (!g.debuted || g.retiredWeek || !g.fandom) return;
      // the club opens once the fandom is organized enough to ask
      if (!g.fanclub && (g.fandom.intensity || 0) >= M.clubAt &&
          !(state.scenes || []).some(sc => sc.kind === 'fanclubOpen')) {
        KP.openScene(state, { kind: 'fanclubOpen', groupId: g.id, expiresWeek: state.week + 3 });
        inbox.push({ kind: 'company', ind: 'clubAsk', priority: 'high', groupId: g.id,
          text: 'The fan cafés put it formally this time: the ' + g.name + ' fandom wants OFFICIAL membership — dues, card, pre-sales. Recurring money is on the table, and the price you set is a sentence they will all read. The table is on the Desk.' });
      }
      // annual renewal: the dues come in on the anniversary
      if (g.fanclub && state.week > g.fanclub.since &&
          (state.week - g.fanclub.since) % KP.C.WEEKS_PER_YEAR === 0) {
        const fanbase = KP.fanbaseRead ? KP.fanbaseRead(state, g) : 2000;
        const members = Math.round(fanbase * M.memberShare);
        const revenue = Math.round((members / 1000) * M.perK * M.TIERS[g.fanclub.tier].rate);
        state.budget += revenue;
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'commerce', revenue);
        if (KP.settleShare) KP.settleShare(state, g, revenue);
        led.renewals++;
        inbox.push({ kind: 'company', ind: 'clubRenewal', priority: 'flavor', groupId: g.id,
          text: 'Fanclub renewal season for ' + g.name + ': ' + KP.fmtCount(members) + ' members re-upped — ' + revenue + ' in dues. The most boring line in the books, and the one the CFO loves most.' });
      }
      // Season's Greetings window, every Q4
      if (woy === M.greetingsWoy && (g.fandom.intensity || 0) >= 25 &&
          g.lastGreetingsYear !== Math.ceil(state.week / KP.C.WEEKS_PER_YEAR) &&
          !(state.scenes || []).some(sc => sc.kind === 'seasonsGreetings')) {
        g.lastGreetingsYear = Math.ceil(state.week / KP.C.WEEKS_PER_YEAR);
        KP.openScene(state, { kind: 'seasonsGreetings', groupId: g.id, expiresWeek: state.week + 2 });
      }
    });
    // the tour merch line: every tour start ships the table
    KP.groups(state).forEach(g => {
      if (g.tour && !g.tour.merchShipped && g.fandom) {
        g.tour.merchShipped = true;
        const fanbase = KP.fanbaseRead ? KP.fanbaseRead(state, g) : 2000;
        const revenue = Math.round((fanbase / 1000) * M.tourMerchPerK);
        state.budget += revenue;
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'commerce', revenue);
        led.tourMerch++;
        inbox.push({ kind: 'company', ind: 'tourMerch', priority: 'flavor', groupId: g.id,
          text: 'The tour merch table opened with the tour: the slogan towels, the new lightstick strap, the city-name tees. ' + revenue + ' before the first encore. Venues sell tickets; tables print money.' });
        // the table is a push like any other — a tour landing on top of
        // the greetings and the fancon is exactly the stacked season the
        // ATM thread audits
        atmRisk(state, rng, inbox, g);
      }
    });
    // ---- the catalog annuity: the shelf pays weekly, forever ----------
    let catalogRev = 0;
    const writers = {};
    KP.groups(state).forEach(g => {
      (g.releases || []).forEach(r => {
        const age = state.week - r.week;
        if (age <= 0) return;
        const decay = Math.max(C.floorDecay, 1 / (1 + age / C.halfLifeWeeks));
        catalogRev += Math.max(0, (r.reception || 0) - 45) * C.perReception * decay;
        (r.tracklist || []).forEach(tk => {
          if (tk.writtenBy) writers[tk.writtenBy] = (writers[tk.writtenBy] || 0) + 1;
        });
      });
    });
    catalogRev = Math.round(catalogRev);
    if (catalogRev > 0) {
      state.budget += catalogRev;
      if (KP.ledgerFlow) KP.ledgerFlow(state, 'catalog', catalogRev);
      led.catalogPaid += catalogRev;
    }
    // publishing follows the PERSON: the writer's checks arrive on their
    // own cadence, from outside the label's books entirely
    if (state.week % C.royaltyEvery === 0) {
      Object.keys(writers).forEach(pid => {
        const p = state.people[pid];
        if (!p) return;
        p.royalties = (p.royalties || 0) + writers[pid];
        led.royaltyChecks++;
        if (p.royalties >= C.leverageAt && !p.flags.royaltyLeverage) {
          p.flags.royaltyLeverage = 1;
          const nar = KP.recordEvidence(state, 'ownMoney', 'idol', p.id);
          if (nar) inbox.push(nar);
          inbox.push({ kind: 'company', ind: 'ownMoney', priority: 'high', personId: p.id,
            text: KP.fillPro('The accounting note worth reading twice: ' + KP.displayName(p) +
              '’s publishing royalties are now a real income — the songs {she} wrote pay {her} directly, label or no label. At the renewal table, remember: {she} does not need the re-sign the way the others do.', p) });
        }
        // the departed writer's checks keep arriving — a quiet letter
        if ((p.status === 'released' || p.status === 'departed') &&
            state.week % (C.royaltyEvery * 6) === 0) {
          inbox.push({ kind: 'company', ind: 'departedRoyalty', priority: 'flavor', personId: p.id,
            text: 'The quarterly publishing statement includes, as it always will, the songs ' + KP.displayName(p) + ' wrote here. The checks follow the person. The credits stay in the booklet. Some doors never fully close.' });
        }
      });
    }
  });

  // ---- the timeline reacts ---------------------------------------------
  KP.onFeedEvent('clubOpened', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'MEMBERSHIP IS OPEN. card ordered. number memorized. this is a lifestyle now with an annual fee and I have never been happier to be invoiced' },
    { persona: 'casual', text: 'paid fanclubs are the subscription economy’s final form: recurring revenue from love. the business model everyone mocks and every industry copies' },
    { persona: 'press', text: 'Another fanclub opens enrollment — the quietest reliable money in the business. Charts are weather; dues are climate.' },
  ]));
  KP.onFeedEvent('fanconHeld', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'the fancon had no charts, no rankings, no cameras that mattered, and it was the best day of the year. three hours of the room being THE ROOM' },
    { persona: 'casual', text: 'fancons are the industry’s best-kept secret: cheap to stage, impossible to review badly, and everyone leaves richer — the company literally, the fans emotionally' },
    { persona: 'stan', text: 'fancon footage is circulating and if you want to understand why people join fandoms, watch minute 47. that is it. that is the whole religion' },
  ]));
  KP.onFeedEvent('greetingsShipped', (state, n, rng) => rng.chance(0.4) ? rng.pick([
    { persona: 'fan', text: 'season’s greetings unboxing day. the calendar is going on the wall, the photobook is going in the shrine, the receipt is going unmentioned' },
    { persona: 'casual', text: 'the annual idol calendar-industrial complex ships again. december remains the only month this industry runs on schedule' },
  ]) : null);
  KP.onFeedEvent('atmStory', (state, n, rng) => rng.pick([
    { persona: 'press', text: 'The "we are not ATMs" thread returns, as it does whenever a commerce calendar outruns a comeback calendar. The fans are not wrong, and the quarter’s books explain why it happened anyway.' },
    { persona: 'fan', text: 'love the group, love the label, CANNOT love four invoices in one season. the thread is organized because we are organized. that was the whole point of us' },
    { persona: 'casual', text: 'fandom revolts over merch cadence, buys the merch anyway, revolt noted in the quarterly as "strong engagement." the circle of commerce' },
  ]));
  KP.onFeedEvent('ownMoney', (state, n, rng) => rng.pick([
    { persona: 'press', text: 'The most underrated career milestone: publishing royalties that arrive regardless of the contract. Writers negotiate differently. Everyone at that table knows it.' },
    { persona: 'fan', text: 'she WROTE the songs and the songs PAY HER. forever. whatever happens with the label. this is the security the industry never advertises' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
