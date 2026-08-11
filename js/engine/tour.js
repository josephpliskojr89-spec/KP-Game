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
    const opts = [{ id: 'kr', label: 'Home (KR)', demand: legDemand(state, g, 'kr') }];
    KP.C.REGIONS.forEach(r => {
      opts.push({ id: r.id, label: r.label, demand: legDemand(state, g, r.id) });
    });
    return opts;
  };
  KP.tourEligible = function (state, g) {
    const T = KP.C.TOUR;
    if (!g || !g.debuted) return { ok: false, reason: 'Nobody tours a group that has not debuted.' };
    if (g.prep) return { ok: false, reason: 'A release is in production. One calendar at a time.' };
    if (g.tour) return { ok: false, reason: 'They are already on the road.' };
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
    const cost = Math.round(scale.costPerLeg * legs.length * pacing.costMult);
    if (state.budget < cost) return { ok: false, reason: 'The production budget is ' + cost + ' and the account cannot cover it.' };
    state.budget -= cost;
    g.tour = {
      scale: plan.scale, pacing: plan.pacing || 'punishing', setlist: plan.setlist || 'hits',
      legs: legs.slice(), legIdx: 0, weekInLeg: 0, startWeek: state.week, cost,
      soldOut: 0, soft: 0,
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
    revenue = Math.round(revenue);
    state.budget += revenue;

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
        const narNote = KP.recordViral(state, local);
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
    if (tour.legIdx >= tour.legs.length) {
      const nextHype = setlist.nextReleaseHype || 0;
      if (nextHype) g.tourHype = nextHype;
      g.lastTourWeek = state.week;
      g.tourRestUntil = state.week + T.restWeeks;
      g.toursDone = (g.toursDone || 0) + 1;
      const line = tour.soldOut >= 2 ? 'The books are healthy, the map is warmer, and the members slept the whole flight home.'
        : tour.soft >= 2 ? 'The books survived. The routing did not flatter us — book smaller or build hotter next time.'
        : 'The books are fine and the stages were real. The road gives back what the map put in.';
      notes.push({ kind: 'company', ind: 'tourEnd', groupId: g.id, urgent: true,
        text: g.name + '’s tour wraps: ' + tour.legs.length + ' legs, ' + tour.soldOut + ' sold out, ' +
          tour.soft + ' soft. ' + line + ' Contractual rest through ' + KP.weekLabel(g.tourRestUntil).text + '.' });
      g.tour = null;
    }
    return notes;
  };
})(typeof window !== 'undefined' ? window : globalThis);
