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

    // active deals pay and cost
    KP.activeDeals(state).forEach(d => {
      d.weeksLeft--;
      state.budget += d.weekly;
      const p = state.people[d.personId];
      if (p && d.weeksLeft % 4 === 0) {
        p.fatigue = KP.clamp(p.fatigue + D.shootFatigue, 0, 100);   // the shoots are real
        KP.socialSpike(state, p, 900, 'brand-' + d.id);
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

  KP.respondDeal = function (state, offerId, accept) {
    const D = KP.C.DEALS;
    const o = offers(state).find(x => x.id === offerId);
    if (!o) return { ok: false, reason: 'That offer is no longer on the desk.' };
    if (o.expiresWeek < state.week) return { ok: false, reason: 'The offer expired. Brands do not wait.' };
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
