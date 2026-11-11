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

  // the census (v0.11.7, §98): the doors offered and taken, the moments,
  // the ceremonies — created lazily, counted by the rails
  function ledger(state) {
    return state.tourLedger = state.tourLedger ||
      { encoresOffered: 0, encoresHandedBack: 0, pressersOffered: 0, statements: 0,
        swapsOffered: 0, swapped: 0, moments: 0, ceremonies: 0 };
  }
  KP.tourLedger = ledger;
  const ROAD_DOORS = ['encoreNight', 'roadPresser', 'setlistSwap'];
  const cityLabel = id => ((KP.C.TOUR.KR_CITIES.find(c => c.id === id) || {}).label || id);
  const stopLabel = d => d.city ? cityLabel(d.city) : KP.regionLabel(d.region);
  // the room against demand, in words — never the ratio
  function roomWord(ratio, encoreOpen) {
    const T = KP.C.TOUR;
    if (ratio >= T.soldOutAt) return encoreOpen ? 'a room they will fill twice' : 'a full room';
    if (ratio >= T.softBelow) return 'a warm room';
    return 'a room with curtains ready';
  }
  // the room's fatigue, banded (the rest card's own words)
  function fatigueWord(members) {
    const present = members.filter(m => !KP.onBreak(m));
    const avg = present.length ? present.reduce((s, m) => s + m.fatigue, 0) / present.length : 0;
    const row = KP.C.TOUR.FATIGUE_WORDS.find(([at]) => avg >= at);
    return row ? row[1] : 'fresh';
  }
  // weeks the road still has, as the booking desk would estimate it: the
  // home circuit's remaining dates by the week, every other leg at legWeeks
  function weeksLeftOf(tour) {
    const T = KP.C.TOUR;
    let left = 0;
    tour.legs.forEach((id, i) => {
      if (i < tour.legIdx) return;
      if (id === 'kr' && tour.kr) {
        left += Math.max(1, Math.ceil((tour.kr.route.length - (i === tour.legIdx ? tour.kr.idx : 0)) / T.datesPerWeek));
      } else {
        left += i === tour.legIdx ? Math.max(1, T.legWeeks - (tour.weekInLeg || 0)) : T.legWeeks;
      }
    });
    return left;
  }
  KP.tourWeeksLeft = g => (g && g.tour) ? weeksLeftOf(g.tour) : 0;   // the booking desk's estimate (festivals.js reads it at the signing, v0.11.8)

  // demand a leg can draw: home legs run on the domestic fanbase,
  // overseas legs on the region's warmth
  function legDemand(state, g, regionId) {
    if (regionId === 'kr') return g.popularity || 0;
    return (KP.regionsRead(g)[regionId] || 0);
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
    {
      const era = g.members.map(id => state.people[id]).find(m => m && m.soloEra);
      if (era) return { ok: false, reason: KP.publicGiven(era) + '’s solo era has the calendar. The road waits for her drop.' };
    }
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
    // a booked festival inside the road is a signed contract (v0.11.8): the
    // Japan lane has refused this since the v0.11.3 audit; the road did not,
    // and once the invites spread across the calendar (§99) the soak had 22
    // of 40 orgs pulling out of a slot the desk had booked
    {
      const span = (krRoute.length ? krWeeksFor(krRoute) : 0) + legs.filter(id => id !== 'kr').length * T.legWeeks;
      if ((g.festivalBookings || []).some(b => b.week >= state.week && b.week <= state.week + span)) {
        return { ok: false, reason: 'A festival slot is booked inside those weeks. Play it, or decline it first.' };
      }
    }
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

    // the stages, lived (v0.11.7, §98): every night goes on the record, a
    // door may open (one at a time, never on the last week), a moment rides
    // the leg letter. The setlist swap asks once, before the first night.
    const legNow = tour.legIdx;
    tour.dates = tour.dates || [];
    if (!tour.swapAsked && legNow === 0 && tour.weekInLeg === 0 && weeksLeftOf(tour) >= 2) swapDoor(state, g, tour);
    tour.weekInLeg++;

    // ---- the home circuit (v0.9.4): city dates, honest per stop --------
    if (tour.legs[tour.legIdx] === 'kr' && tour.kr) {
      const kr = tour.kr;
      const played = [];
      let revenue = 0, weekSold = 0, weekSoft = 0;
      // the stage, judged (v0.10.37): the week's nights are one read, and
      // last week's night sells this week's rooms (a bad night runs soft)
      const firstCity = T.KR_CITIES.find(c => c.id === kr.route[kr.idx]);
      const night = KP.stageRead(state, g, { kind: 'tour', id: 'kr:' + kr.idx });
      const nightMult = KP.nightDemandMult(tour);
      if (tour.pressered) tour.pressered = false;   // the statement steadied THIS room; the next sells on its own night (v0.11.7, §98)
      let weekEncore = 0, encoreStash = null;
      const playedIds = [];
      for (let d = 0; d < T.datesPerWeek && kr.idx < kr.route.length; d++) {
        const city = T.KR_CITIES.find(c => c.id === kr.route[kr.idx]);
        const demand = (g.popularity || 0) * city.w * nightMult;
        const ratio = demand / scale.sweetSpot;
        const soldOut = ratio >= T.soldOutAt;
        const soft = ratio < T.softBelow;
        // the room holds what the room holds (v0.10.22): revenue's
        // demand term caps at the venue's capacity — a sold-out club
        // is a great NIGHT, not a great business. Undersizing stopped
        // being the money button; right-sizing is the whole job.
        const paidDemand = Math.min(demand, scale.sweetSpot * T.soldOutAt);
        let rev = scale.revBase * city.w * (0.4 + paidDemand / 80) * (setlist.revMult || 1);
        if (soldOut) rev *= T.soldOutRevMult;
        if (soft) rev *= T.softRevMult;
        revenue += rev;
        let line;
        let encore = false;
        if (soldOut) {
          tour.soldOut++; weekSold++; kr.sold = (kr.sold || 0) + 1;
          // the earned second night — the wonderful problem finally has
          // an answer at home, where the booking desk holds the keys
          if (kr.route.length + kr.encores < T.maxKrDates) {
            kr.encores++; tour.soldOut++;
            revenue += rev * T.encoreRevMult;
            // booked and paid in the tick, as always; the door (v0.11.7, §98)
            // only lets the desk hand the first one of the week back
            encore = true; weekEncore++;
            if (!encoreStash) encoreStash = { city: city.id, encoreRev: Math.round(rev * T.encoreRevMult) };
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
        playedIds.push(city.id);
        tour.dates.push({ week: state.week, city: city.id, band: night.band, soldOut, soft, encore });
        kr.idx++;
      }
      revenue = Math.round(revenue);
      KP.takeIn(state, revenue);
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
      KP.settleStage(state, rng, g, night, { where: 'the ' + (firstCity ? firstCity.label : 'home') + ' night' }).forEach(n => notes.push(n));
      tour.lastNight = night.band;
      if (night.band === 'fumbled') KP.stageLedger(state).badNights++;
      // the moment (v0.11.7, §98): one sentence the leg letter keeps, and the letter rides at high
      const moment = KP.tourMomentOf(state, g, tour, { cities: playedIds, encore: weekEncore > 0, soft: weekSoft > 0 });
      notes.push({ kind: 'debut', ind: 'tourLeg', groupId: g.id, region: 'kr',
        soldOut: weekSold > 0, soft: weekSoft > 0, urgent: false, priority: 'high',
        text: g.name + ' — home circuit: ' + played.join('. ') + '. Revenue +' + revenue + '. ' +
          KP.stageLine(state, g, night, 'the ' + (firstCity ? firstCity.label : 'home') + ' night') + (moment ? ' ' + moment : '') });
      const doorCtx = { encore: encoreStash, where: (firstCity ? firstCity.label : 'home'), fumbled: night.band === 'fumbled' };

      if (kr.idx < kr.route.length) {   // more cities next week
        roadDoors(state, g, tour, legNow, doorCtx);
        return notes;
      }

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
      endTourIfDone(state, g, tour, setlist, notes);
      if (g.tour) roadDoors(state, g, tour, legNow, doorCtx);   // the road goes on: the week's door may still open
      return notes;
    }

    if (tour.weekInLeg < T.legWeeks) return notes;

    // ---- the leg closes: the honest report ----
    const regionId = tour.legs[tour.legIdx];
    const where = regionId === 'kr' ? 'Korea' : KP.regionLabel(regionId);
    // the stage, judged (v0.10.37): the leg's nights are one read; the
    // last night of the previous leg sells this one
    const night = KP.stageRead(state, g, { kind: 'tour', id: regionId });
    const demand = legDemand(state, g, regionId) * KP.nightDemandMult(tour);
    if (tour.pressered) tour.pressered = false;   // the statement steadied THIS leg's rooms (v0.11.7, §98)
    const ratio = demand / scale.sweetSpot;
    const soldOut = ratio >= T.soldOutAt;
    const soft = ratio < T.softBelow;
    // the room holds what the room holds (v0.10.22) — same capacity
    // law as the home circuit
    const paidDemand = Math.min(demand, scale.sweetSpot * T.soldOutAt);
    let revenue = scale.revBase * (0.4 + paidDemand / 80) * (setlist.revMult || 1);
    if (soldOut) revenue *= T.soldOutRevMult;
    if (soft) revenue *= T.softRevMult;
    // the tongue (v0.9.29): a fluent member is the voice of the leg —
    // local radio, local jokes, a homecoming's economics. Nobody
    // fluent means an interpreter on payroll and a flatter room.
    if (regionId !== 'kr' && KP.voiceAbroad) {
      const voice = KP.voiceAbroad(state, g, regionId);
      const tl = state.tongueLedger || (state.tongueLedger = { auditions: 0, intlMinted: 0, intlSigned: 0, voiceLegs: 0, interpreterLegs: 0, airports: 0 });
      if (voice) {
        revenue *= KP.tongueFactor(state, g, regionId, 'tour');
        tl.voiceLegs++;
        notes.push({ kind: 'company', groupId: g.id, personId: voice.id,
          text: KP.fillPro(KP.displayName(voice) + ' ran the ' + KP.regionLabel(regionId) + ' leg’s mics — local radio in the morning, the ments at night, every joke landing in the room’s own language. The promoter called {her} “the reason the meet-and-greet went long.” The voice abroad is worth real money.', voice) });
      } else {
        revenue = Math.max(0, revenue - KP.C.TONGUE.interpreterFee);   // a thin leg pays the interpreter out of the gate, never below zero (audit v0.11.3)
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
    KP.takeIn(state, revenue);
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
    // the stage, judged (v0.10.37): the leg's nights settle once, and
    // the last night sells the next leg
    KP.settleStage(state, rng, g, night, { where: 'the ' + where + ' nights' }).forEach(n => notes.push(n));
    tour.lastNight = night.band;
    if (night.band === 'fumbled') KP.stageLedger(state).badNights++;
    // the record and the moment (v0.11.7, §98): one entry per leg, one sentence on the letter, the letter at high
    tour.dates.push({ week: state.week, region: regionId, band: night.band, soldOut, soft });
    const moment = KP.tourMomentOf(state, g, tour, { overseas: regionId !== 'kr', regionId, cities: [], encore: false, soft });
    notes.push({ kind: 'debut', ind: 'tourLeg', groupId: g.id, region: regionId,
      soldOut, soft, urgent: false, priority: 'high',
      text: (soldOut
        ? g.name + ' — ' + where + ' leg: SOLD OUT in minutes. Resale prices are a scandal, the venue asks about a second night we cannot book, and the fandom is unbearable online. Revenue +' + revenue + '. We under-booked. Wonderful problem.'
        : soft
          ? g.name + ' — ' + where + ' leg: soft. The upper sections were curtained off and everyone pretended not to notice. Revenue +' + revenue + '. The promoter was polite about it, which was worse.'
          : g.name + ' — ' + where + ' leg: sold well. Full floor, warm room. Revenue +' + revenue + '. This is what the road is supposed to feel like.') +
        ' ' + KP.stageLine(state, g, night, 'the ' + where + ' nights') + (moment ? ' ' + moment : '') });

    // next leg or home
    tour.legIdx++;
    tour.weekInLeg = 0;
    endTourIfDone(state, g, tour, setlist, notes);
    if (g.tour) roadDoors(state, g, tour, legNow, { encore: null, where, fumbled: night.band === 'fumbled' });
    return notes;
  };

  // ---- the doors during the road (v0.11.7, §98) -----------------------------
  // None of them is the bot's: the first option of each is today's law, the
  // fuse is one week, and silence answers the way the engine always did.
  // One door waits per tour at a time; none opens on the week the road ends.
  function doorOpen(state, g) {
    return (state.scenes || []).some(sc => ROAD_DOORS.includes(sc.kind) && sc.groupId === g.id);
  }
  // the setlist swap: once a tour, before the first night, when the hits are
  // the setlist and the fandom's b-side pick is loud (its heat, never its hook)
  function swapDoor(state, g, tour) {
    const T = KP.C.TOUR;
    tour.swapAsked = true;
    if (tour.setlist !== 'hits') return;
    const rel = (g.releases || []).length ? g.releases[g.releases.length - 1] : null;
    const pick = rel && rel.fanPick ? (rel.bsides || []).find(b => b.title === rel.fanPick) : null;
    if (!pick || !(pick.sleeper || (pick.heat || 0) >= T.swapPickHeat)) return;
    if (doorOpen(state, g)) return;
    ledger(state).swapsOffered++;
    KP.openScene(state, { kind: 'setlistSwap', groupId: g.id, title: pick.title, expiresWeek: state.week + T.doorFuseWeeks });
  }
  // the week's door, if any: the presser after a fumbled night first (the
  // rarer story, once per tour per leg), then the encore night — a sold-out
  // city comes round again; a fumbled one had better not
  function roadDoors(state, g, tour, legIdx, ctx) {
    const T = KP.C.TOUR;
    if (doorOpen(state, g)) return;
    if (ctx.fumbled && !(tour.presserAsked || {})[legIdx]) {
      tour.presserAsked = tour.presserAsked || {};
      tour.presserAsked[legIdx] = true;
      ledger(state).pressersOffered++;
      KP.openScene(state, { kind: 'roadPresser', groupId: g.id, where: ctx.where, expiresWeek: state.week + T.doorFuseWeeks });
      return;
    }
    if (ctx.encore) {
      ledger(state).encoresOffered++;
      KP.openScene(state, { kind: 'encoreNight', groupId: g.id, cityId: ctx.encore.city, city: cityLabel(ctx.encore.city),
        encoreRev: ctx.encore.encoreRev, expiresWeek: state.week + T.doorFuseWeeks });
    }
  }
  const tourOf = (state, sc) => { const g = KP.groupById(state, sc.groupId); return g && g.tour ? { g, tour: g.tour } : null; };

  KP.registerScene('encoreNight', {
    title: (state, sc) => { const g = KP.groupById(state, sc.groupId); return (g ? g.name : 'The road') + ' · the second night'; },
    body: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      const members = g ? g.members.map(id => state.people[id]).filter(Boolean) : [];
      return 'The ' + sc.city + ' room sold out in minutes and the promoter booked the second night on the spot — both gone, the deposit (' + sc.encoreRev + ') already in the account. ' +
        'The room is ' + fatigueWord(members) + '. Play it, and the books keep the night. Hand it back, and the promoter keeps the deposit while the room sleeps a night it was not going to get.';
    },
    options: () => [
      { id: 'play', label: 'Play the second night' },
      { id: 'handBack', label: 'Hand the second night back' },
    ],
    resolve: (state, sc, optionId) => {
      const T = KP.C.TOUR;
      const r = tourOf(state, sc);
      if (optionId !== 'handBack') return { toast: 'The second night plays. The room is tired and loud and nobody would trade it.' };
      if (!r) return { toast: 'The road has moved on; the second night was played.' };
      const { g, tour } = r;
      const give = Math.max(0, Math.min(sc.encoreRev || 0, state.budget));
      state.budget -= give;
      if (KP.ledgerFlow) KP.ledgerFlow(state, 'tours', -give);
      tour.soldOut = Math.max(0, (tour.soldOut || 0) - 1);
      if (tour.kr) tour.kr.encores = Math.max(0, (tour.kr.encores || 0) - 1);
      const date = (tour.dates || []).find(d => d.week === sc.week && d.city === sc.cityId && d.encore);
      if (date) { date.encore = false; date.handedBack = true; }
      g.members.map(id => state.people[id]).filter(m => m && !KP.onBreak(m)).forEach(m => {
        m.fatigue = KP.clamp(m.fatigue - T.encoreRestFatigue, 0, 100);
      });
      ledger(state).encoresHandedBack++;
      return { toast: 'The second night goes back to the promoter. The room sleeps.',
        note: { kind: 'company', ind: 'encoreHandedBack', priority: 'normal', groupId: g.id,
          text: g.name + ' handed the ' + sc.city + ' second night back — the promoter kept the deposit (' + give + ' returned), the venue went dark, and the room slept. The fans who had tickets were refunded and furious in the specific way of people who will be back.' } };
    },
    expire: () => null,   // silence plays the night, as the road always did
  });

  KP.registerScene('roadPresser', {
    title: (state, sc) => { const g = KP.groupById(state, sc.groupId); return (g ? g.name : 'The road') + ' · the road presser'; },
    body: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      const rd = g ? KP.tourRoadRead(state, g) : null;
      return (g ? g.name : 'The act') + ' fumbled the ' + sc.where + ' night and the clip is doing the rounds — the sync going, the ad-libs going, the wide shot not cutting away. ' +
        'The next room' + (rd && rd.nextStop ? ' (' + rd.nextStop + ')' : '') + ' sells on it. Ride it out and the next room runs a shade softer, the way bad nights always have; ' +
        'put out a statement (' + KP.C.TOUR.presserCost + ') and the room steadies, at the price of a little money and a little of everyone’s shine.';
    },
    options: (state) => [
      { id: 'ride', label: 'Ride it out' },
      ...(state.budget >= KP.C.TOUR.presserCost ? [{ id: 'statement', label: 'Put out a statement · ' + KP.C.TOUR.presserCost }] : []),
    ],
    resolve: (state, sc, optionId) => {
      const T = KP.C.TOUR;
      const r = tourOf(state, sc);
      if (optionId !== 'statement') return { toast: 'No statement. The next room sells on the clip, and the clip fades the way clips do.' };
      if (!r) return { toast: 'The road has moved on; the clip faded on its own.' };
      if (state.budget < T.presserCost) return { ok: false, reason: 'A statement bills ' + T.presserCost + '. The account says no.' };
      const { g, tour } = r;
      state.budget -= T.presserCost;
      if (KP.ledgerFlow) KP.ledgerFlow(state, 'marketing', -T.presserCost);
      tour.pressered = true;
      g.members.map(id => state.people[id]).filter(Boolean).forEach(m => {
        if (m.hype != null) m.hype = KP.clamp((m.hype || 0) - T.presserHype, 0, 100);
      });
      ledger(state).statements++;
      return { toast: 'The statement ran: a tired room, a hard schedule, a promise about the next night. The next room steadies.',
        note: { kind: 'company', ind: 'roadStatement', priority: 'normal', groupId: g.id,
          text: g.name + '’s desk put out a statement on the ' + sc.where + ' night — the schedule, the room, the promise. The comments did what comments do; the next room sold the way it was going to before the clip. Everybody in the lineup looks a shade less shiny for having needed it.' } };
    },
    expire: () => null,   // silence rides it out: STAGE.badNightDemand, today's law
  });

  KP.registerScene('setlistSwap', {
    title: (state, sc) => { const g = KP.groupById(state, sc.groupId); return (g ? g.name : 'The road') + ' · the setlist'; },
    body: (state, sc) => 'The fandom is loud about “' + sc.title + '” — the b-side they picked off the last record, and the one the hits setlist does not have. ' +
      'Keep the hits and the room gets what it paid for. Sing the pick and the fandom pays in intensity; the singalong writes its own clip.',
    options: () => [
      { id: 'keep', label: 'Keep the hits' },
      { id: 'swap', label: 'Sing the pick' },
    ],
    resolve: (state, sc, optionId) => {
      const T = KP.C.TOUR;
      const r = tourOf(state, sc);
      if (optionId !== 'swap') return { toast: 'The hits stay. The fandom will survive; the fandom always says it will not.' };
      if (!r) return { toast: 'The road has moved on; the setlist stayed the hits.' };
      const { g, tour } = r;
      tour.pickSwapped = true;
      tour.pickTitle = sc.title;
      KP.fandomGain(g, T.swapIntensity);
      ledger(state).swapped++;
      return { toast: '“' + sc.title + '” goes into the setlist. The fandom found out within the hour.',
        note: { kind: 'public', ind: 'setlistSwapped', priority: 'normal', groupId: g.id,
          text: g.name + ' put “' + sc.title + '” into the tour setlist — the fandom’s pick, the b-side the truthers have been loud about since the record dropped. The fan cafés treated it as a personal letter. The intensity in the room went up a notch and stayed there.' } };
    },
    expire: () => null,   // silence keeps the hits
  });

  // ---- the moment family (v0.11.7, §98) ---------------------------------------
  // One sentence a week on the leg letter, picked by hash among what the
  // week offers, never the same kind two weeks running. Pure but for the
  // bookkeeping (lastMomentKind, the record's `moment`, the ledger).
  KP.tourMomentOf = function (state, g, tour, ctx) {
    const T = KP.C.TOUR;
    ctx = ctx || {};
    const members = g.members.map(id => state.people[id]).filter(Boolean);
    const present = members.filter(m => !KP.onBreak(m));
    // the week sits mid-key: hashStr drifts slowly when only the trailing
    // digits change, and a week-last key picks the same corner of the pool
    // for weeks running (measured at the build: .946 .950 .954 …)
    const h = tag => KP.hash01([state.seed, tag, state.week, g.id].join('|'));
    const say = (kind, lines) => KP.lineFor(state, 'tourMoment|' + kind + '|' + g.id, lines);
    const N = p => KP.displayName(p);
    const kinds = [];
    const who = present.length ? present[Math.floor(h('tourMomentWho') * present.length)] : null;
    if (who) kinds.push({ kind: 'sangHerLines', text: () => KP.fillPro(say('sangHerLines', [
      'The room sang ' + N(who) + '’s lines for {her} and {she} stopped singing to listen.',
      N(who) + ' held the mic out on {pos} verse and the crowd took it; the clip was everywhere by the encore.',
      'On ' + N(who) + '’s lines the room was louder than the PA, and {she} let it be.',
    ]), who) });
    const leader = g.roles && g.roles.leader ? present.find(m => m.id === g.roles.leader) : null;
    if (leader) kinds.push({ kind: 'mentLong', text: () => KP.fillPro(say('mentLong', [
      N(leader) + '’s ment went long — a story about the van, a thank-you that turned into three, and nobody in the room checked the time.',
      N(leader) + ' talked between songs until the stage manager gave up signalling; the room would have stayed all night.',
    ]), leader) });
    if (ctx.overseas) kinds.push({ kind: 'twoLanguages', text: () => say('twoLanguages', [
      'A sign in the front row was written in two languages, and both halves were spelled right.',
      'The fan project was a banner in two languages; the members read both aloud and got the second one wrong, lovingly.',
      'Somebody at the barrier had written the fanchant out phonetically for the row behind; by the second chorus the row had it.',
    ]) });
    if (!ctx.overseas && h('tourRain') < T.rainChance) kinds.push({ kind: 'rainSet', text: () => say('rainSet', [
      'It rained on the outdoor set and nobody left; the ponchos came out and the choreography did not slow down.',
      'The rain set — wet stage, wet crowd, the stage manager pacing — is the night every fan there will tell for years.',
    ]) });
    kinds.push({ kind: 'firstTimer', text: () => say('firstTimer', [
      'A sign at the barrier read MY FIRST CONCERT; the members pointed at it, and the whole room cheered for a stranger.',
      'Somebody in the pit was at their first show ever and the people around them made sure the members knew; the last ment was for them.',
      'The first-timer’s sign made it onto the screens and the kid holding it forgot how to stand up.',
    ]) });
    const homeCity = (ctx.cities || []).find(cid => present.some(m => m.born && m.born.city === cid));
    const local = homeCity ? present.find(m => m.born && m.born.city === homeCity) : null;
    if (local) kinds.push({ kind: 'hometownStop', text: () => KP.fillPro(say('hometownStop', [
      cityLabel(homeCity) + ' was ' + N(local) + '’s hometown stop — the childhood dance teacher was in row three and the camera found them both.',
      N(local) + ' played {pos} hometown: the ment slipped into the local accent, and the room knew exactly what that meant.',
      'The ' + cityLabel(homeCity) + ' night was ' + N(local) + '’s homecoming — the family was in the stands, {she} did not look up once, and everybody saw {her} not looking.',
    ]), local) });
    if (ctx.encore) kinds.push({ kind: 'encoreChant', text: () => say('encoreChant', [
      'The encore chant started before the lights were down and did not stop until they came back up.',
      'Nobody left after the last song; the chant for the second night outlasted the house lights.',
    ]) });
    if (ctx.soft) kinds.push({ kind: 'curtainedUpper', text: () => say('curtainedUpper', [
      'The upper tier was curtained off; the floor pretended not to notice and sang loud enough to fill it anyway.',
      'The curtained upper tier made the room smaller and warmer — the promoter’s word for it was “intimate”.',
    ]) });
    if (tour.pacing === 'punishing') kinds.push({ kind: 'vanAsleep', text: () => say('vanAsleep', [
      'The van photo after the show: everybody asleep sitting up, one awake to take it.',
      'The whole lineup was asleep before the van left the venue car park; the road manager drove with the radio off.',
    ]) });
    if (tour.pickSwapped && tour.pickTitle) kinds.push({ kind: 'singalong', text: () => say('singalong', [
      'They sang “' + tour.pickTitle + '” — the fandom’s pick — and the room took the second verse without being asked.',
      '“' + tour.pickTitle + '” was in the setlist and the singalong on the b-side was louder than the one on the title track.',
    ]) });
    const pool = kinds.filter(k => k.kind !== tour.lastMomentKind);
    const pick = pool[Math.floor(h('tourMoment') * pool.length)] || kinds[0];
    if (!pick) return '';
    tour.lastMomentKind = pick.kind;
    tour.moments = (tour.moments || 0) + 1;
    (tour.dates || []).forEach(d => { if (d.week === state.week) d.moment = pick.kind; });
    ledger(state).moments++;
    return pick.text();
  };

  // ---- the road, read (v0.11.7, §98): pure — the Today card, the hero, the strip
  KP.tourRoadRead = function (state, g) {
    const T = KP.C.TOUR;
    const tour = g && g.tour;
    if (!tour) return null;
    const scale = T.SCALES[tour.scale] || { label: tour.scale, sweetSpot: 1 };
    const legId = tour.legs[tour.legIdx];
    const kr = legId === 'kr' && tour.kr ? tour.kr : null;
    const legLabel = legId == null ? null : legId === 'kr' ? 'Korea' : KP.regionLabel(legId);
    let nextStop = null, demandWord = null;
    const mult = KP.nightDemandMult(tour);
    if (kr) {
      const city = T.KR_CITIES.find(c => c.id === kr.route[kr.idx]);
      if (city) {
        nextStop = city.label;
        demandWord = roomWord((g.popularity || 0) * city.w * mult / scale.sweetSpot, kr.route.length + kr.encores < T.maxKrDates);
      }
    } else if (legId) {
      nextStop = legLabel;
      demandWord = roomWord(legDemand(state, g, legId) * mult / scale.sweetSpot, false);
    }
    const weeksLeft = weeksLeftOf(tour);
    return { scale: scale.label, legIdx: tour.legIdx, legs: tour.legs.slice(), legLabel, nextStop,
      nextWeek: state.week + 1, demandWord, lastNight: tour.lastNight || null,
      soldOut: tour.soldOut || 0, soft: tour.soft || 0, encores: tour.kr ? (tour.kr.encores || 0) : 0,
      weeksLeft, endWeek: state.week + weeksLeft, pickSwapped: !!tour.pickSwapped };
  };

  // the road record, read (v0.11.5, §96 wiring): pure — the count (toursDone
  // outranks a record that began on this build), the last tour, the last
  // three newest first. Counts are public; the page prints them as counts.
  KP.tourRecordRead = function (g) {
    const hist = (g && g.tourHistory) || [];
    return { count: Math.max((g && g.toursDone) || 0, hist.length),
      last: hist.length ? hist[hist.length - 1] : null,
      recent: hist.slice(-3).reverse() };
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
    // the ceremony (v0.11.7, §98): the route read date by date, the night
    // that went right and the one that went wrong named, the counts
    const dates = tour.dates || [];
    const readOut = dates.map(d => stopLabel(d) + ' (' + (d.soldOut
      ? 'sold out' + (d.encore ? ', the second night too' : d.handedBack ? ', the second night handed back' : '')
      : d.soft ? 'soft' : 'full') + ')').join(' · ');
    const bestD = dates.find(d => d.band === 'carried') || dates.find(d => d.soldOut && d.band !== 'fumbled') || null;
    const worstD = dates.find(d => d !== bestD && d.band === 'fumbled') || dates.find(d => d !== bestD && d.soft && d.band !== 'carried') || null;
    const best = bestD ? stopLabel(bestD) : null, worst = worstD ? stopLabel(worstD) : null;
    const verdict = best && worst ? ' The night that went right was ' + best + '; the one that went wrong was ' + worst + '.'
      : best ? ' The night that went right was ' + best + '; nothing went wrong enough to name.'
      : worst ? ' The night that went wrong was ' + worst + '; nothing went right enough to name.' : '';
    const encores = tour.kr ? (tour.kr.encores || 0) : 0;
    const moments = tour.moments || 0;
    // the tour record (v0.11.5, §96 wiring): what the wrap already counts,
    // kept on the group so the page can read the road back — capped
    g.tourHistory = (g.tourHistory || []).concat([{ week: state.week, scale: tour.scale,
      legs: tour.legs.slice(), stops, soldOut: tour.soldOut, soft: tour.soft, best, worst, moments }]).slice(-T.historyCap);
    const line = tour.soldOut >= 2 ? 'The books are healthy, the map is warmer, and the members slept the whole flight home.'
      : tour.soft >= 2 ? 'The books survived. The routing did not flatter us — book smaller or build hotter next time.'
      : 'The books are fine and the stages were real. The road gives back what the map put in.';
    ledger(state).ceremonies++;
    notes.push({ kind: 'company', ind: 'tourEnd', groupId: g.id, urgent: true, priority: 'critical', best, worst,
      text: g.name + '’s tour wraps: ' + stops + ' stops, ' + tour.soldOut + ' sold out, ' +
        tour.soft + ' soft. ' + line + (readOut ? ' The route, date by date: ' + readOut + '.' : '') + verdict +
        ' ' + encores + ' second night' + (encores === 1 ? '' : 's') + ' earned, ' + moments + ' moment' + (moments === 1 ? '' : 's') + ' the road keeps.' +
        ' Contractual rest through ' + KP.weekLabel(g.tourRestUntil).text + '.' });
    g.tour = null;
    return notes;
  }
})(typeof window !== 'undefined' ? window : globalThis);
