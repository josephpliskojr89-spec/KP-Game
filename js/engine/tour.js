/* The road (v0.6.8) — tours.
   §22: "Undersell/oversell both visible and narrated. Tours grow
   regional fandom and prestige, not just cash." A tour is constrained
   choices with bills: a scale you believe you can fill, legs the map
   has earned, a pacing with a human cost, a setlist with a point.
   Every leg reports honestly — sold out in minutes, solid, or soft
   with the empty-seat photos to prove it. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // demand a leg can draw: home legs run on the domestic fanbase,
  // overseas legs on the region's warmth
  function legDemand(state, g, regionId) {
    if (regionId === 'kr') return g.popularity || 0;
    return (KP.regionsOf(g)[regionId] || 0);
  }
  KP.tourLegOptions = function (state, g) {
    const T = KP.C.TOUR;
    const opts = [{ id: 'kr', label: 'Home circuit', demand: legDemand(state, g, 'kr') }];
    KP.C.REGIONS.forEach(r => {
      opts.push({ id: r.id, label: r.label, demand: legDemand(state, g, r.id) });
    });
    return opts;
  };

  // the home circuit (v0.9.4): which cities the promoter will book at
  // this scale. Seoul anchors; every other city joins when its room can
  // plausibly fill (city demand = popularity × city weight). One truth —
  // the planner preview, the booking, and the weekly grind all call this.
  KP.krRoute = function (state, g, scaleId) {
    const T = KP.C.TOUR;
    const scale = T.SCALES[scaleId];
    if (!scale) return [];
    const pop = g.popularity || 0;
    return T.KR_CITIES.filter((c, i) =>
      i === 0 || pop * c.w >= scale.sweetSpot * T.softBelow).map(c => c.id);
  };
  function krWeeksFor(route) {
    return Math.max(1, Math.ceil(route.length / KP.C.TOUR.datesPerWeek));
  }
  KP.tourEligible = function (state, g) {
    const T = KP.C.TOUR;
    if (!g || !g.debuted) return { ok: false, reason: 'Nobody tours a group that has not debuted.' };
    if (g.retiredWeek || !g.members.length) return { ok: false, reason: 'That chapter is closed. The catalog tours on its own.' };
    if (g.prep) return { ok: false, reason: 'A release is in production. One calendar at a time.' };
    if (g.tour) return { ok: false, reason: 'They are already on the road.' };
    if (g.hiatus) return { ok: false, reason: 'They are officially gone. A hiatus with tour dates is called a tour.' };
    if (g.jpAway) return { ok: false, reason: 'They are in Japan. One country at a time.' };
    if (state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) {
      return { ok: false, reason: 'The release calendar (promo + rest) has the room. The road waits.' };
    }
    if (state.week <= (g.tourRestUntil || 0)) {
      return { ok: false, reason: 'Post-tour rest is contractual. Let them unpack.' };
    }
    if (state.week - (g.lastTourWeek || -999) < T.cooldownWeeks) {
      return { ok: false, reason: 'Two tours this close together is how companies end up in documentaries. Wait.' };
    }
    if ((g.popularity || 0) < T.minPopularity) {
      return { ok: false, reason: 'The fanbase cannot fill a venue yet. Build the room first.' };
    }
    return { ok: true };
  };

  KP.planTour = function (state, plan) {
    const T = KP.C.TOUR;
    const g = KP.groupById(state, plan.groupId);
    const gate = KP.tourEligible(state, g);
    if (!gate.ok) return gate;
    const scale = T.SCALES[plan.scale];
    if (!scale) return { ok: false, reason: 'Pick a venue scale the booking desk has heard of.' };
    const pacing = T.PACING[plan.pacing || 'punishing'];
    if (!pacing) return { ok: false, reason: 'Pacing is punishing or humane. There is no third road.' };
    const setlist = T.SETLISTS[plan.setlist || 'hits'];
    if (!setlist) return { ok: false, reason: 'The setlist leans somewhere: hits, new material, or fan service.' };
    const legs = plan.legs || [];
    if (!legs.length || legs.length > T.maxLegs) {
      return { ok: false, reason: 'A tour is 1 to ' + T.maxLegs + ' legs. They are humans, not cargo.' };
    }
    const seen = new Set();
    for (const id of legs) {
      if (id !== 'kr' && !KP.C.REGIONS.some(r => r.id === id)) {
        return { ok: false, reason: 'No promoter operates in “' + id + '”.' };
      }
      if (seen.has(id)) return { ok: false, reason: 'One leg per market. Greed is not a routing strategy.' };
      seen.add(id);
      // a scale needs a market that can plausibly fill it
      if (legDemand(state, g, id) < scale.sweetSpot * T.softBelow * 0.6) {
        return { ok: false, reason: 'The ' + scale.label.toLowerCase() + ' leg in ' +
          (id === 'kr' ? 'Korea' : KP.regionLabel(id)) + ' would play to empty seats. The promoter refuses the booking.' };
      }
    }
    // the home circuit prices by the week it runs, not a flat leg fee
    const krRoute = legs.includes('kr') ? KP.krRoute(state, g, plan.scale) : [];
    const costUnits = legs.filter(id => id !== 'kr').length +
      (krRoute.length ? krWeeksFor(krRoute) : 0);
    const cost = Math.round(scale.costPerLeg * costUnits * pacing.costMult);
    if (state.budget < cost) return { ok: false, reason: 'The production budget is ' + cost + ' and the account cannot cover it.' };
    state.budget -= cost;
    if (KP.ledgerFlow) { KP.ledgerFlow(state, 'tours', -cost); KP.accrueDebt(state, g, cost); }
    g.tour = {
      scale: plan.scale, pacing: plan.pacing || 'punishing', setlist: plan.setlist || 'hits',
      legs: legs.slice(), legIdx: 0, weekInLeg: 0, startWeek: state.week, cost,
      soldOut: 0, soft: 0,
      kr: krRoute.length ? { route: krRoute, idx: 0, encores: 0 } : null,
    };
    return { ok: true, cost };
  };

  // ---- the weekly grind -------------------------------------------------
  KP.tourWeek = function (state, g, rng) {
    const T = KP.C.TOUR;
    const notes = [];
    const tour = g.tour;
    if (!tour) return notes;
    const scale = T.SCALES[tour.scale];
    const pacing = T.PACING[tour.pacing];
    const setlist = T.SETLISTS[tour.setlist];
    const members = g.members.map(id => state.people[id]).filter(Boolean);
    const leader = g.roles && g.roles.leader ? state.people[g.roles.leader] : null;
    const leaderRuns = leader && leader.personality.leadership >= T.leaderLeadershipAt;

    // the week's toll — the road pays in live reps and fatigue
    members.forEach(m => {
      if (m.flags.military) return;   // he is not on the bus (v0.9.23)
      if (m.flags.burnout > 0) { m.flags.burnout--; return; }
      let f = scale.fatiguePerWeek * pacing.fatigueMult;
      if (leaderRuns) f *= T.leaderFatigueMult;
      m.fatigue = KP.clamp(m.fatigue + f, 0, 100);
      m.liveExp += T.liveExpPerWeek;
      if (m.fatigue >= KP.C.COMEBACK.OVERWORK.threshold && rng.chance(KP.C.COMEBACK.OVERWORK.chance * 0.7)) {
        notes.push(KP.overworkIncident(state, m, 'the tour', rng));
      }
    });

    tour.weekInLeg++;

    // ---- the home circuit (v0.9.4): city dates, honest per stop --------
    if (tour.legs[tour.legIdx] === 'kr' && tour.kr) {
      const kr = tour.kr;
      const played = [];
      let revenue = 0, weekSold = 0, weekSoft = 0;
      for (let d = 0; d < T.datesPerWeek && kr.idx < kr.route.length; d++) {
        const city = T.KR_CITIES.find(c => c.id === kr.route[kr.idx]);
        const demand = (g.popularity || 0) * city.w;
        const ratio = demand / scale.sweetSpot;
        const soldOut = ratio >= T.soldOutAt;
        const soft = ratio < T.softBelow;
        let rev = scale.revBase * city.w * (0.5 + demand / 80) * (setlist.revMult || 1);
        if (soldOut) rev *= T.soldOutRevMult;
        if (soft) rev *= T.softRevMult;
        revenue += rev;
        let line;
        if (soldOut) {
          tour.soldOut++; weekSold++; kr.sold = (kr.sold || 0) + 1;
          // the earned second night — the wonderful problem finally has
          // an answer at home, where the booking desk holds the keys
          if (kr.route.length + kr.encores < T.maxKrDates) {
            kr.encores++; tour.soldOut++;
            revenue += rev * T.encoreRevMult;
            line = city.label + ' SOLD OUT — the venue asked for a second night and got it; both gone in minutes';
          } else {
            line = city.label + ' SOLD OUT in minutes';
          }
        } else if (soft) {
          tour.soft++; weekSoft++; kr.soft2 = (kr.soft2 || 0) + 1;
          line = city.label + ' ran soft — the upper sections were curtained off and the promoter was polite about it';
        } else {
          line = city.label + ' sold well — full floor, warm room';
        }
        played.push(line);
        kr.idx++;
      }
      revenue = Math.round(revenue);
      state.budget += revenue;
      if (KP.ledgerFlow) { KP.ledgerFlow(state, 'tours', revenue); KP.settleShare(state, g, revenue); }
      if (weekSold) {
        members.forEach(m => { m.morale = KP.clamp(m.morale + T.soldOutMorale, 0, 100); });
        state.company.reputation.girlGroup = KP.clamp((state.company.reputation.girlGroup || 40) + 1, 0, 100);
        KP.fandomGain(g, KP.C.FANDOM.gainSoldOut);
        members.forEach(m => {
          const amb = KP.ambitionTouch(state, m, 'stage');
          if (amb) notes.push(amb);
        });
      } else if (weekSoft) {
        members.forEach(m => { m.morale = KP.clamp(m.morale - T.softMorale, 0, 100); });
      }
      if (setlist.moralePerLeg) {
        members.forEach(m => { m.morale = KP.clamp(m.morale + setlist.moralePerLeg, 0, 100); });
        KP.fandomGain(g, KP.C.FANDOM.gainFanServiceLeg);
      }
      notes.push({ kind: 'debut', ind: 'tourLeg', groupId: g.id, region: 'kr',
        soldOut: weekSold > 0, soft: weekSoft > 0, urgent: false,
        text: g.name + ' — home circuit: ' + played.join('. ') + '. Revenue +' + revenue + '.' });

      if (kr.idx < kr.route.length) return notes;   // more cities next week

      // the circuit wraps — the country was toured, not visited
      const dates = kr.route.length + kr.encores;
      g.popularity = KP.clamp((g.popularity || 0) +
        Math.min(3, kr.sold || 0) - ((kr.soft2 || 0) >= 2 ? 1 : 0), 0, 100);
      if (!leaderRuns && rng.chance(T.weakLeaderFrictionChance)) {
        members.forEach(m => { m.morale = KP.clamp(m.morale - 1, 0, 100); });
        notes.push({ kind: 'company', groupId: g.id,
          text: 'Tour manager’s note from the home circuit: small frictions are going unmanaged — nobody in the room settles things. This is what the leader role is FOR, and the room does not have one running it.' });
      }
      notes.push({ kind: 'company', ind: 'tourCircuit', groupId: g.id,
        cities: kr.route.length, dates, encores: kr.encores,
        text: g.name + '’s home circuit wraps: ' + kr.route.length + ' cities, ' + dates + ' dates' +
          (kr.encores ? ' — ' + kr.encores + ' second night' + (kr.encores > 1 ? 's' : '') + ' earned on the road' : '') +
          '. ' + (kr.sold >= 2 ? 'The country showed up. The vans drove home loud.'
            : (kr.soft2 || 0) >= 2 ? 'Some rooms were honest about the size of the fanbase. The map does not lie at home either.'
            : 'Clean stages, warm rooms, a country properly toured.') });
      tour.legIdx++;
      tour.weekInLeg = 0;
      return endTourIfDone(state, g, tour, setlist, notes);
    }

    if (tour.weekInLeg < T.legWeeks) return notes;

    // ---- the leg closes: the honest report ----
    const regionId = tour.legs[tour.legIdx];
    const where = regionId === 'kr' ? 'Korea' : KP.regionLabel(regionId);
    const demand = legDemand(state, g, regionId);
    const ratio = demand / scale.sweetSpot;
    const soldOut = ratio >= T.soldOutAt;
    const soft = ratio < T.softBelow;
    let revenue = scale.revBase * (0.5 + demand / 80) * (setlist.revMult || 1);
    if (soldOut) revenue *= T.soldOutRevMult;
    if (soft) revenue *= T.softRevMult;
    // the tongue (v0.9.29): a fluent member is the voice of the leg —
    // local radio, local jokes, a homecoming's economics. Nobody
    // fluent means an interpreter on payroll and a flatter room.
    if (regionId !== 'kr' && KP.voiceAbroad) {
      const voice = KP.voiceAbroad(state, g, regionId);
      const tl = state.tongueLedger || (state.tongueLedger = { auditions: 0, intlMinted: 0, intlSigned: 0, voiceLegs: 0, interpreterLegs: 0, airports: 0 });
      if (voice) {
        revenue *= KP.C.TONGUE.voiceRevenueMult;
        tl.voiceLegs++;
        notes.push({ kind: 'company', groupId: g.id, personId: voice.id,
          text: KP.fillPro(KP.displayName(voice) + ' ran the ' + KP.regionLabel(regionId) + ' leg’s mics — local radio in the morning, the ments at night, every joke landing in the room’s own language. The promoter called {her} “the reason the meet-and-greet went long.” The voice abroad is worth real money.', voice) });
      } else {
        revenue -= KP.C.TONGUE.interpreterFee;
        tl.interpreterLegs++;
      }
      // the airport (v0.9.29): the tour reaches somebody's HOME
      const local = g.members.map(id => state.people[id]).filter(Boolean)
        .find(m => m.origin === regionId);
      if (local && !(tour.airportDone || {})[regionId]) {
        tour.airportDone = tour.airportDone || {};
        tour.airportDone[regionId] = true;
        tl.airports++;
        local.morale = KP.clamp(local.morale + KP.C.TONGUE.airportMorale, 0, 100);
        local.history.push({ week: state.week, text: 'The tour came home. The arrivals hall was full, the signs were in two languages, and the kid who left with one suitcase played the venue everyone here grows up pointing at.' });
        notes.push({ kind: 'public', ind: 'airportHome', priority: 'critical', personId: local.id, groupId: g.id,
          text: KP.fillPro('The ' + KP.regionLabel(regionId) + ' airport FILLED for ' + KP.displayName(local) + ' — the hometown arrival, the two-language signs, the childhood dance teacher in the crowd with a banner. {She} held it together until the van. The clip of {her} not quite holding it together is the most-shared thing the tour produces.', local) });
      }
    }
    // the sagas color the road (v0.9.31): the second capital pays a
    // premium to be toured; a JV partner takes its split abroad
    if (regionId !== 'kr') {
      if (state.secondCapital && regionId === state.secondCapital.region &&
          state.week <= state.secondCapital.until) {
        revenue *= KP.C.SAGA.CAPITAL.tourRevMult;
      }
      if (state.jv && state.week <= state.jv.until) revenue *= (1 - state.jv.share);
    }
    revenue = Math.round(revenue);
    state.budget += revenue;
    if (KP.ledgerFlow) { KP.ledgerFlow(state, 'tours', revenue); KP.settleShare(state, g, revenue); }

    if (soldOut) {
      tour.soldOut++;
      members.forEach(m => { m.morale = KP.clamp(m.morale + T.soldOutMorale, 0, 100); });
      state.company.reputation.girlGroup = KP.clamp((state.company.reputation.girlGroup || 40) + 2, 0, 100);
      KP.fandomGain(g, KP.C.FANDOM.gainSoldOut);   // a full room deepens devotion (v0.7.0)
      members.forEach(m => {
        const amb = KP.ambitionTouch(state, m, 'stage');   // somebody's dream (v0.7.1)
        if (amb) notes.push(amb);
      });
    } else if (soft) {
      tour.soft++;
      members.forEach(m => { m.morale = KP.clamp(m.morale - T.softMorale, 0, 100); });
    }
    if (setlist.moralePerLeg) {
      members.forEach(m => { m.morale = KP.clamp(m.morale + setlist.moralePerLeg, 0, 100); });
      KP.fandomGain(g, KP.C.FANDOM.gainFanServiceLeg);   // fan service is FOR them (v0.7.0)
    }
    // touring grows the region — that is the point (saturating, §28)
    if (regionId !== 'kr') {
      const regions = KP.regionsOf(g);
      const sat = Math.max(0, 1 - regions[regionId] / 95);
      regions[regionId] = KP.clamp(regions[regionId] +
        (T.regionGainPerLeg + (soldOut ? T.soldOutRegionBonus : 0)) * (setlist.regionMult || 1) * sat, 0, 100);
    } else {
      g.popularity = KP.clamp((g.popularity || 0) + (soldOut ? 2 : soft ? -1 : 1), 0, 100);
    }
    // a face the market loves gets her moment abroad
    if (regionId !== 'kr' && (soldOut || rng.chance(0.3))) {
      const local = members.find(m => KP.strongholdsOf(state, m).includes(regionId));
      if (local) {
        KP.socialSpike(state, local, KP.C.SOCIAL.viralSpike * 0.6, 'tour-' + regionId);
        notes.push({ kind: 'public', ind: 'tourMoment', personId: local.id, groupId: g.id, region: regionId,
          text: KP.fillPro('The ' + where + ' crowd sang ' + KP.publicGiven(local) + '’s lines FOR {her} and the clip of {pos} face is everywhere. This is {pos} market and tonight it said so out loud.', local) });
        const narNote = KP.recordViral(state, local, { kind: 'tour', label: 'the ' + where + ' tour-stop clip' });
        if (narNote) notes.push(narNote);
      }
    }
    // the weak-leadership tour is a documentary waiting to happen
    if (!leaderRuns && rng.chance(T.weakLeaderFrictionChance)) {
      members.forEach(m => { m.morale = KP.clamp(m.morale - 1, 0, 100); });
      notes.push({ kind: 'company', groupId: g.id,
        text: 'Tour manager’s note from ' + where + ': small frictions are going unmanaged — nobody in the room settles things. This is what the leader role is FOR, and the room does not have one running it.' });
    }
    notes.push({ kind: 'debut', ind: 'tourLeg', groupId: g.id, region: regionId,
      soldOut, soft, urgent: false,
      text: soldOut
        ? g.name + ' — ' + where + ' leg: SOLD OUT in minutes. Resale prices are a scandal, the venue asks about a second night we cannot book, and the fandom is unbearable online. Revenue +' + revenue + '. We under-booked. Wonderful problem.'
        : soft
          ? g.name + ' — ' + where + ' leg: soft. The upper sections were curtained off and everyone pretended not to notice. Revenue +' + revenue + '. The promoter was polite about it, which was worse.'
          : g.name + ' — ' + where + ' leg: sold well. Full floor, warm room, clean stages. Revenue +' + revenue + '. This is what the road is supposed to feel like.' });

    // next leg or home
    tour.legIdx++;
    tour.weekInLeg = 0;
    return endTourIfDone(state, g, tour, setlist, notes);
  };

  // the wrap: shared by the overseas legs and the home circuit
  function endTourIfDone(state, g, tour, setlist, notes) {
    const T = KP.C.TOUR;
    if (tour.legIdx < tour.legs.length) return notes;
    const nextHype = setlist.nextReleaseHype || 0;
    if (nextHype) g.tourHype = nextHype;
    g.lastTourWeek = state.week;
    g.tourRestUntil = state.week + T.restWeeks;
    g.toursDone = (g.toursDone || 0) + 1;
    const stops = tour.legs.length + (tour.kr ? tour.kr.route.length - 1 + tour.kr.encores : 0);
    const line = tour.soldOut >= 2 ? 'The books are healthy, the map is warmer, and the members slept the whole flight home.'
      : tour.soft >= 2 ? 'The books survived. The routing did not flatter us — book smaller or build hotter next time.'
      : 'The books are fine and the stages were real. The road gives back what the map put in.';
    notes.push({ kind: 'company', ind: 'tourEnd', groupId: g.id, urgent: true,
      text: g.name + '’s tour wraps: ' + stops + ' stops, ' + tour.soldOut + ' sold out, ' +
        tour.soft + ' soft. ' + line + ' Contractual rest through ' + KP.weekLabel(g.tourRestUntil).text + '.' });
    g.tour = null;
    return notes;
  }
})(typeof window !== 'undefined' ? window : globalThis);
