/* Brand deals & ambassadorships (v0.7.0) — §22: "Group and individual;
   visuals become an economy; individual recognition feeds back into
   the group. Justice for the visual role."
   Offers arrive for the faces the market already wants — high visuals,
   big followings, it-girl narratives. Accepting pays a lump and a
   weekly trickle, builds the face, and ties the brand's fate to hers:
   a boiled storm on an ambassador cancels the deal with a clawback. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function offers(state) { return state.dealOffers = state.dealOffers || []; }
  function deals(state) { return state.deals = state.deals || []; }
  function dealId(state) {
    state.nextDealId = state.nextDealId || 1;
    return 'deal' + (state.nextDealId++);
  }
  KP.activeDeals = function (state) { return deals(state).filter(d => d.weeksLeft > 0); };
  KP.openDealOffers = function (state) {
    return offers(state).filter(o => o.expiresWeek >= state.week);
  };

  // who the market wants: visuals, reach, and the it-girl narrative
  function appeal(state, p) {
    return p.talents.visuals.cur * 0.5 + Math.min(60, (p.social || 0) / 2500) +
      (KP.getNarrative(state, 'itGirl', 'idol', p.id) ? 25 : 0) +
      (KP.getNarrative(state, 'fancamStar', 'idol', p.id) ? 12 : 0);
  }

  KP.dealsWeek = function (state, rng) {
    const D = KP.C.DEALS;
    const notes = [];
    // expire quietly
    state.dealOffers = offers(state).filter(o => o.expiresWeek >= state.week);

    // active deals pay and cost — a declined solo request cools the wire
    KP.activeDeals(state).forEach(d => {
      d.weeksLeft--;
      state.budget += d.cooled ? Math.max(0, d.weekly - D.cooledWeeklyCut) : d.weekly;
      const p = state.people[d.personId];
      if (p && d.weeksLeft % 4 === 0) {
        p.fatigue = KP.clamp(p.fatigue + D.shootFatigue, 0, 100);   // the shoots are real
        KP.socialSpike(state, p, 900, 'brand-' + d.id);
      }
      // ---- the invoice (v0.9.14): the sponsored appearance ------------
      // Sponsorship is a job. Every N weeks the brand books her — the
      // flagship store event, the campaign stage — and the calendar has
      // to answer. Tour or a benched face = a miss the brand counts.
      if (!d.nextObligationWeek) d.nextObligationWeek = d.signedWeek + D.obligationEveryWeeks;
      if (p && d.weeksLeft > 0 && state.week >= d.nextObligationWeek) {
        const led = state.sponsorLedger = state.sponsorLedger ||
          { kept: 0, missed: 0, clawbacks: 0, soloAsked: 0, soloAllowed: 0, soloDeclined: 0 };
        const g = KP.groupOf(state, p.id);
        const away = (g && g.tour) || KP.onBreak(p);
        const busy = g && (g.prep || (g.debuted && state.week <= (g.promoUntil || 0)));
        if (away) {
          d.missStreak = (d.missStreak || 0) + 1;
          d.obligationsMissed = (d.obligationsMissed || 0) + 1;
          led.missed++;
          if (d.missStreak >= D.missCancelAt) {
            d.weeksLeft = 0;
            const penalty = Math.round(d.lump * D.missClawbackMult);
            state.budget = Math.max(0, state.budget - penalty);
            led.clawbacks++;
            notes.push({ kind: 'company', urgent: true, ind: 'dealCancelled', personId: p.id,
              text: d.brand + ' terminated ' + KP.displayName(p) + '’s contract for cause — two sponsored appearances missed — and clawed back ' + penalty + '. The termination letter used the phrase “professional courtesy” in a way that contained neither.' });
          } else {
            d.nextObligationWeek = state.week + D.missRescheduleWeeks;
            notes.push({ kind: 'company', priority: 'high', personId: p.id,
              text: KP.fillPro('The ' + d.brand + ' appearance did not happen — ' + KP.displayName(p) +
                ' was ' + (p.flags.burnout > 0 ? 'on medical rest' : p.flags.personalHiatus ? 'on a personal break' : 'on the road') + ' and the brand’s event ran without {her}. They rebooked it, politely, for a date that was not a question. (' + d.missStreak + ' missed.)', p) });
          }
        } else {
          d.obligationsKept = (d.obligationsKept || 0) + 1;
          d.missStreak = 0;
          led.kept++;
          p.fatigue = KP.clamp(p.fatigue + (busy ? D.squeezeFatigue : D.obligationFatigue), 0, 100);
          KP.socialSpike(state, p, 700, 'oblig-' + d.id);
          d.nextObligationWeek = state.week + D.obligationEveryWeeks;
          notes.push({ kind: 'company', priority: 'flavor', personId: p.id,
            text: KP.fillPro(KP.displayName(p) + ' worked the ' + d.brand + ' event this week' +
              (busy ? ' — squeezed between schedules, van to store to stage, and {she} did not let it show on camera.'
                    : '. Two hours, four hundred photos, one very satisfied brand manager.'), p) });
        }
      }
      // ---- the solo request (v0.9.14): the ask everyone dreads --------
      // the gravity (v0.9.18): a live clamor makes the brand's solo call
      // far likelier — sponsors read the same trades everyone else does
      const clamorLive = p && KP.groups(state).some(g2 => g2.gravity &&
        !g2.gravity.settled && g2.gravity.personId === p.id);
      if (p && d.weeksLeft > 0 && !d.soloAsked &&
          state.week - d.signedWeek >= D.soloAskAfterWeeks &&
          !(state.scenes || []).some(sc => sc.kind === 'sponsorSolo') &&
          rng.chance(D.soloAskChance * (clamorLive ? KP.C.GRAVITY.sponsorMult : 1))) {
        d.soloAsked = true;
        const led = state.sponsorLedger = state.sponsorLedger ||
          { kept: 0, missed: 0, clawbacks: 0, soloAsked: 0, soloAllowed: 0, soloDeclined: 0 };
        led.soloAsked++;
        KP.openScene(state, { kind: 'sponsorSolo', personId: p.id, dealId: d.id,
          brand: d.brand, expiresWeek: state.week + 3 });
        notes.push({ kind: 'company', urgent: true, personId: p.id,
          text: KP.fillPro(d.brand + ' called with the request that is never just a request: they want ' +
            KP.displayName(p) + ' ALONE for a sponsored solo stage — {her} name, their logo, no group. The answer is on the Desk, and everyone in the building already knows the question was asked.', p) });
      }
      if (p && d.weeksLeft === 0) {
        notes.push({ kind: 'company', text: 'The ' + d.brand + ' contract with ' + KP.displayName(p) +
          ' wrapped cleanly. The brand is “very satisfied,” which in their language means the renewal call comes eventually.' });
      }
      // the scandal clause: a boiled storm on the ambassador voids it
      if (p && d.weeksLeft > 0 && (state.discourses || []).some(x =>
          x.status === 'boiled' && x.subjectType === 'idol' &&
          String(x.subjectId) === String(d.personId) && x.week >= d.signedWeek)) {
        d.weeksLeft = 0;
        const penalty = Math.round(d.lump * D.scandalPenaltyMult);
        state.budget = Math.max(0, state.budget - penalty);
        notes.push({ kind: 'company', urgent: true, ind: 'dealCancelled', personId: p.id,
          text: d.brand + ' invoked the conduct clause and cancelled ' + KP.displayName(p) +
            '’s contract — with a ' + penalty + ' clawback. Brands love a face until the weather turns. Legal says we knew that.' });
      }
    });
    state.deals = deals(state).filter(d => d.weeksLeft > 0);

    // a new offer finds the most wanted face
    if (KP.activeDeals(state).length < D.maxActive && rng.chance(D.offerBaseChance +
        (state.roster.some(id => KP.getNarrative(state, 'itGirl', 'idol', id)) ? D.itGirlBonus : 0))) {
      const idols = state.roster.map(id => state.people[id])
        .filter(p => p.status === 'idol' && (p.social || 0) >= D.minSocial)
        .filter(p => !KP.activeDeals(state).some(d => d.personId === p.id));
      if (idols.length) {
        const face = idols.sort((a, b) => appeal(state, b) - appeal(state, a))[0];
        const brand = rng.pick(D.BRANDS) + ' ' + '(' + rng.pick(D.CATEGORIES) + ')';
        const offer = {
          id: dealId(state), brand, personId: face.id,
          lump: rng.int(D.lump[0], D.lump[1]), weekly: rng.int(D.weekly[0], D.weekly[1]),
          weeks: rng.int(D.weeks[0], D.weeks[1]), expiresWeek: state.week + D.expiresWeeks,
        };
        offers(state).push(offer);
        notes.push({ kind: 'company', urgent: true, ind: 'dealOffer', personId: face.id,
          text: brand + ' wants ' + KP.displayName(face) + ' as an ambassador: ' + offer.lump +
            ' up front, ' + offer.weekly + ' a week for ' + offer.weeks +
            ' weeks. The offer is on the Desk and expires ' + KP.weekLabel(offer.expiresWeek).text +
            '. The visual role finally sends an invoice.' });
      }
    }
    return notes;
  };

  // ---- the solo request scene (v0.9.14) --------------------------------
  // The brand wants the face ALONE. Allow: money, individual shine, and
  // envy seeds in the room. Decline: the brand cools, and she knows the
  // company said no — the renewal table will read that ledger line.
  KP.registerScene('sponsorSolo', {
    title: (state, sc) => sc.brand + ' · the solo request',
    body: (state, sc) => {
      const p = state.people[sc.personId];
      return KP.fillPro(sc.brand + ' wants ' + (p ? KP.displayName(p) : 'the face') +
        ' for a sponsored SOLO stage — no group, just {her} and the logo. The fee is real. So is what the other members will think, and what {she} will think if the answer is no.', p);
    },
    options: () => [
      { id: 'allow', label: 'Let the stage happen' },
      { id: 'decline', label: 'Decline — the group comes first' },
    ],
    resolve: (state, sc, optionId) => {
      const D = KP.C.DEALS;
      const p = state.people[sc.personId];
      const d = (state.deals || []).find(x => x.id === sc.dealId);
      const led = state.sponsorLedger = state.sponsorLedger ||
        { kept: 0, missed: 0, clawbacks: 0, soloAsked: 0, soloAllowed: 0, soloDeclined: 0 };
      if (optionId === 'allow') {
        led.soloAllowed++;
        const fee = d ? Math.round(d.lump * D.soloBonusMult) : 0;
        state.budget += fee;
        if (p) {
          KP.socialSpike(state, p, D.soloSpike, 'sponsorsolo');
          p.hype = (p.hype || 0) + 6;
          p.morale = KP.clamp(p.morale + 4, 0, 100);
          p.mediaExp = KP.clamp(p.mediaExp + 2, 0, 100);
          p.flags.soloShines = (p.flags.soloShines || 0) + 1;
          p.history.push({ week: state.week, text: 'Performed a sponsored solo stage for ' + sc.brand + '. Alone, and it worked.' });
          const g = KP.groupOf(state, p.id);
          if (g) {
            g.members.forEach(id => {
              const m = state.people[id];
              if (m && m.id !== p.id && m.personality.competitiveness >= 65) {
                m.morale = KP.clamp(m.morale - 2, 0, 100);
              }
            });
          }
          KP.note(state, { kind: 'public', ind: 'sponsorSolo', priority: 'high', personId: p.id,
            text: KP.fillPro(KP.displayName(p) + ' took the ' + sc.brand + ' stage ALONE this week — solo arrangement, solo spotlight, ' + fee + ' on the invoice. The clips travelled without the group’s name attached, which everyone noticed, including the group.', p) });
        }
        return { toast: 'The stage happens. The fee lands. The room takes notes.' };
      }
      led.soloDeclined++;
      if (d) d.cooled = true;
      if (p) {
        p.morale = KP.clamp(p.morale - 3, 0, 100);
        KP.recordDirected(state, p.id, 'heldBack', -2);
        p.history.push({ week: state.week, text: KP.fillPro('The company declined ' + sc.brand + '’s solo-stage request on {pos} behalf. Nobody asked {her}.', p) });
      }
      return { toast: KP.fillPro('Declined. ' + sc.brand + '’s enthusiasm drops a measurable degree — and ' +
        (p ? KP.displayName(p) : 'she') + ' heard about the request from the brand manager, not from you. {She} keeps that.', p) };
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      return { kind: 'company', personId: sc.personId,
        text: sc.brand + ' withdrew the solo-stage request after a week of silence. Brands read silence fluently. ' +
          (p ? KP.displayName(p) : 'She') + ' never officially knew — officially.' };
    },
  });
  KP.onFeedEvent('sponsorSolo', (state, n, rng) => {
    const p = state.people[n.personId];
    const name = p ? KP.publicGiven(p) : 'her';
    return rng.pick([
      { persona: 'fan', text: name + ' SOLO SPONSOR STAGE. the arrangement, the styling, the way the brand knew exactly who to ask. supporting the group means supporting this too. it does. it definitely does' },
      { persona: 'casual', text: 'saw a solo idol stage at a brand event today and the crowd knew every word. apparently there is a whole group? wild how that works' },
      { persona: 'stan', text: 'the ' + name + ' solo stage clips are everywhere and the fandom is doing group-photo damage control in the replies. love when a company hands us discourse homework' },
    ]);
  });

  KP.respondDeal = function (state, offerId, accept) {
    const D = KP.C.DEALS;
    const o = offers(state).find(x => x.id === offerId);
    if (!o) return { ok: false, reason: 'That offer is no longer on the desk.' };
    if (o.expiresWeek < state.week) return { ok: false, reason: 'The offer expired. Brands do not wait.' };
    // a face that left the building cannot be signed for it (0.9.13 audit H1)
    if (accept) {
      const who = state.people[o.personId];
      if (!who || who.status !== 'idol') {
        state.dealOffers = offers(state).filter(x => x.id !== offerId);
        return { ok: false, reason: 'That artist is no longer on the roster. The brand has been informed.' };
      }
    }
    state.dealOffers = offers(state).filter(x => x.id !== offerId);
    const p = state.people[o.personId];
    if (!accept) {
      return { ok: true, note: KP.fillPro('The ' + o.brand + ' offer was declined politely. ' +
        (p ? KP.displayName(p) : '{She}') + ' keeps {pos} schedule; the brand keeps calling other agencies.', p) };
    }
    state.budget += o.lump;
    deals(state).push({ id: o.id, brand: o.brand, personId: o.personId,
      lump: o.lump, weekly: o.weekly, weeksLeft: o.weeks, signedWeek: state.week });
    if (p) {
      p.mediaExp += 4;
      p.history.push({ week: state.week, text: 'Signed as the face of ' + o.brand + '.' });
      p.dealCount = (p.dealCount || 0) + 1;
      if (p.dealCount >= D.brandDarlingAt) {
        const nar = KP.recordEvidence(state, 'brandDarling', 'idol', p.id);
        if (nar) KP.note(state, nar);
      }
    }
    const note = KP.note(state, { kind: 'company', ind: 'dealSigned', personId: o.personId,
      text: 'Signed: ' + (p ? KP.displayName(p) : 'she') + ' is the new face of ' + o.brand + '. ' +
        o.lump + ' hits the account today, ' + o.weekly + ' a week follows. The campaign shots are already better than our album covers, which stings.' });
    return { ok: true, note: note.text };
  };
})(typeof window !== 'undefined' ? window : globalThis);
