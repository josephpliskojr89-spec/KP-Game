/* The second job (v0.9.11) — §39 Phase C: careers entire.
   Productions call for the idols whose SECONDARY strengths the market
   wants: a fixed panel seat for the funny one, a music-show mic for the
   poised one, a drama OST for the voice. The gig pays the person —
   money, reach, media reps, and eventually a narrative — and it
   collides with the group calendar. A promo week on top of a taping
   week stretches her thin; a production stretched too often quietly
   recasts. The scheduling tension IS the system. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function offers(state) { return state.gigOffers = state.gigOffers || []; }
  function gigs(state) { return state.gigs = state.gigs || []; }
  function gigId(state) {
    state.nextGigId = state.nextGigId || 1;
    return 'gig' + (state.nextGigId++);
  }
  KP.activeGigs = function (state) { return gigs(state).filter(x => x.weeksLeft > 0); };
  KP.openGigOffers = function (state) {
    return offers(state).filter(o => o.expiresWeek >= state.week);
  };
  KP.gigOf = function (state, personId) {
    return KP.activeGigs(state).find(x => x.personId === personId) || null;
  };
  KP.gigLabel = function (gig) {
    return gig.kind === 'panel' ? 'fixed panelist on ' + gig.show
      : gig.kind === 'mc' ? 'MC of ' + gig.show
      : 'the ' + gig.show + ' OST';
  };

  // is her group asking for the same week? prep, promo, or the road
  function groupBusy(state, p) {
    const g = KP.groupOf(state, p.id);
    if (!g) return false;
    return !!(g.prep || g.tour ||
      (g.debuted && state.week <= (g.promoUntil || 0) && state.week > (g.lastReleaseWeek || 0)));
  }

  // ---- who the productions want: the derived stats, not the résumé ----
  function candidates(state) {
    const G = KP.C.GIGS;
    const out = [];
    state.roster.map(id => state.people[id]).forEach(p => {
      if (!p || p.status !== 'idol') return;
      if ((p.social || 0) < G.minSocial) return;
      if (KP.gigOf(state, p.id)) return;
      if (offers(state).some(o => o.personId === p.id)) return;
      const grp = KP.groupOf(state, p.id);
      if (!grp || !grp.debuted) return;
      const d = KP.derived(p);
      if (d.varietySkill >= G.panelSkillMin) {
        out.push({ p, kind: 'panel', margin: d.varietySkill - G.panelSkillMin +
          ((p.archetypes || []).includes('varietyNatural') ? 8 : 0) });
      }
      if (d.stagePresence >= G.mcPoiseMin && (grp.popularity || 0) >= G.mcPopMin) {
        out.push({ p, kind: 'mc', margin: d.stagePresence - G.mcPoiseMin });
      }
      if (p.talents.vocals.cur >= G.ostVocalsMin) {
        out.push({ p, kind: 'ost', margin: p.talents.vocals.cur - G.ostVocalsMin });
      }
    });
    return out.sort((a, b) => b.margin - a.margin);
  }

  KP.registerWeekly('secondJob', 785, function (state, rng, inbox) {
    const G = KP.C.GIGS;

    // offers expire quietly
    state.gigOffers = offers(state).filter(o => o.expiresWeek >= state.week);

    // ---- active gigs: the week happens ----
    KP.activeGigs(state).forEach(gig => {
      const p = state.people[gig.personId];
      if (!p || p.status !== 'idol') { gig.weeksLeft = 0; return; }   // departures end everything
      gig.weeksLeft--;
      gig.weeksRun = (gig.weeksRun || 0) + 1;
      if (gig.weekly) state.budget += gig.weekly;
      p.fatigue = KP.clamp(p.fatigue + G.gigFatigue, 0, 100);
      if (gig.weeksRun % G.mediaExpEvery === 0) p.mediaExp = KP.clamp(p.mediaExp + 1, 0, 100);
      if (gig.kind !== 'ost' && gig.weeksRun % 2 === 0) {
        KP.socialSpike(state, p, G.followerDrip, 'gig-' + gig.id);
      }
      // a panel week feeds the variety dream the way four promo bookings
      // never could — it is HER seat
      if (gig.kind === 'panel' && KP.ambitionOf(state, p) === 'variety') {
        p.morale = KP.clamp(p.morale + 1, 0, 100);
      }

      // ---- the clash: the group wants the same week ----
      // A busy group week always costs her body. Whether it costs the
      // SHOW is the gamble: most weeks the van makes the taping — but a
      // missed taping is a missed taping, and productions count.
      if (gig.kind !== 'ost' && groupBusy(state, p)) {
        p.fatigue = KP.clamp(p.fatigue + G.clashFatigue, 0, 100);
        if (!gig.stretchNoted) {
          gig.stretchNoted = true;
          inbox.push({ kind: 'company', personId: p.id,
            text: KP.fillPro(KP.displayName(p) + ' taped ' + gig.show + ' between schedules this week — van, stage, van, studio. The road manager’s log has a note in the margin that just says “watch this.”', p) });
        }
        if (rng.chance(G.clashMissChance)) {
          gig.strain = (gig.strain || 0) + 1;
          if (gig.strain < G.strainRecastAt) {
            inbox.push({ kind: 'company', personId: p.id,
              text: KP.fillPro('The van did not make it: ' + KP.displayName(p) + ' missed this week’s ' + gig.show +
                ' taping — the group schedule won. The production “understands completely,” which is what productions say while they count (' +
                gig.strain + ' missed now).', p) });
          }
        }
        if (gig.strain >= G.strainRecastAt) {
          gig.weeksLeft = 0;
          gig.recast = true;
          p.morale = KP.clamp(p.morale - G.recastMorale, 0, 100);
          p.history.push({ week: state.week, text: 'Quietly written out of ' + gig.show + ' — the group calendar kept winning.' });
          inbox.push({ kind: 'public', ind: 'gigRecast', priority: 'high', personId: p.id,
            text: KP.fillPro(gig.show + ' announced a “lineup refresh” — ' + KP.displayName(p) +
              '’s seat is gone. The production was polite about it. The internet did the math about {pos} schedule immediately, and for once the internet is right.', p) });
          return;
        }
      }

      // ---- the run ends ----
      if (gig.weeksLeft === 0 && !gig.recast) {
        if (gig.kind === 'ost') {
          // the drop: her voice, somebody else's drama — reception rides
          // the voice, the show's reach, and the week's luck
          const rec = KP.clamp(Math.round(p.talents.vocals.cur * 0.7 +
            (KP.groupOf(state, p.id) || {}).popularity * 0.15 + rng.int(-8, 12)), 20, 96);
          gig.reception = rec;
          state.budget += gig.lump || 0;
          p.flags.ostDrops = (p.flags.ostDrops || 0) + 1;
          p.history.push({ week: state.week, text: 'Sang the ' + gig.show + ' OST. Reception ' + rec + '.' });
          const hit = rec >= G.ostHitAt;
          if (hit) KP.socialSpike(state, p, G.followerDrip * 3, 'ost-' + gig.id);
          inbox.push({ kind: 'public', ind: 'ostDrop', priority: 'high', personId: p.id, hit,
            text: KP.fillPro('The ' + gig.show + ' OST is out — ' + KP.displayName(p) + ', solo vocal, over the episode-eight montage. ' +
              (hit ? 'It is EVERYWHERE. Cafés, cabs, the company elevator. People who have never heard of the group know this song.'
                   : 'The drama’s fans have adopted it; the charts noticed politely. {Her} voice got somewhere the group has not been.'), p) });
          if (p.flags.ostDrops >= G.ostVoiceAt) {
            const nar = KP.recordEvidence(state, 'ostVoice', 'idol', p.id);
            if (nar) inbox.push(nar);
          }
        } else {
          if (gig.kind === 'panel') p.flags.panelArcs = (p.flags.panelArcs || 0) + 1;
          if (gig.kind === 'mc') p.flags.mcRuns = (p.flags.mcRuns || 0) + 1;
          p.history.push({ week: state.week, text: 'Wrapped a full run as ' + KP.gigLabel(gig) + '.' });
          const g = KP.groupOf(state, p.id);
          if (g) g.popularity = KP.clamp((g.popularity || 0) + G.completePop, 0, 100);
          inbox.push({ kind: 'public', ind: 'gigWrapped', priority: 'high', personId: p.id, gigKind: gig.kind,
            text: KP.fillPro(KP.displayName(p) + ' wrapped ' + gig.weeksRun + ' weeks as ' + KP.gigLabel(gig) +
              '. The farewell episode gave {her} a proper sendoff' +
              (g ? ', and the group’s numbers felt it — the second job invoices in attention' : '') + '.', p) });
          const amb = KP.ambitionTouch(state, p, 'variety');
          if (amb) inbox.push(amb);
          if (gig.kind === 'panel' && p.flags.panelArcs >= G.varietyMonsterAt) {
            const nar = KP.recordEvidence(state, 'varietyMonster', 'idol', p.id);
            if (nar) inbox.push(nar);
          }
          if (gig.kind === 'mc') {
            const nar = KP.recordEvidence(state, 'nationalMC', 'idol', p.id);
            if (nar) inbox.push(nar);
          }
        }
      }
    });
    state.gigs = gigs(state).filter(x => x.weeksLeft > 0);

    // ---- a new call comes in ----
    if (KP.activeGigs(state).length + KP.openGigOffers(state).length < G.maxActive) {
      const cand = candidates(state);
      const natural = state.roster.some(id => {
        const p = state.people[id];
        return p && p.status === 'idol' && (p.archetypes || []).includes('varietyNatural');
      });
      if (cand.length && rng.chance(G.offerBaseChance + (natural ? G.naturalBonus : 0))) {
        const pick = cand[0];
        const offer = { id: gigId(state), kind: pick.kind, personId: pick.p.id,
          expiresWeek: state.week + G.expiresWeeks };
        if (pick.kind === 'ost') {
          offer.show = rng.pick(G.DRAMAS);
          offer.weeks = G.ostWeeks;
          offer.lump = rng.int(G.ostLump[0], G.ostLump[1]);
        } else {
          offer.show = rng.pick(G.SHOWS);
          const W = pick.kind === 'panel' ? G.panelWeeks : G.mcWeeks;
          const pay = pick.kind === 'panel' ? G.panelWeekly : G.mcWeekly;
          offer.weeks = rng.int(W[0], W[1]);
          offer.weekly = rng.int(pay[0], pay[1]);
        }
        offers(state).push(offer);
        const p = pick.p;
        const pitch = pick.kind === 'panel'
          ? offer.show + ' wants ' + KP.displayName(p) + ' as a FIXED PANELIST — ' + offer.weeks +
            ' weeks, ' + offer.weekly + ' a week. The casting director used the word “naturally funny” twice.'
          : pick.kind === 'mc'
          ? offer.show + ' wants ' + KP.displayName(p) + ' holding the MC mic — ' + offer.weeks +
            ' weeks, ' + offer.weekly + ' a week. Live television, every week, {pos} face opening the broadcast.'
          : 'The ' + offer.show + ' production wants ' + KP.displayName(p) + ' on the OST — three weeks of recording, ' +
            offer.lump + ' on delivery. The music director asked for “that voice” by name.';
        inbox.push({ kind: 'company', urgent: true, ind: 'gigOffer', personId: p.id,
          text: KP.fillPro(pitch + ' The offer is on the Desk and expires ' +
            KP.weekLabel(offer.expiresWeek).text + '. A second job is a second schedule.', p) });
      }
    }
  });

  // ---- the desk answers ----
  KP.respondGig = function (state, offerId, accept) {
    const o = offers(state).find(x => x.id === offerId);
    if (!o) return { ok: false, reason: 'That production has moved on.' };
    if (o.expiresWeek < state.week) return { ok: false, reason: 'The offer expired. Broadcast waits for nobody.' };
    state.gigOffers = offers(state).filter(x => x.id !== offerId);
    const p = state.people[o.personId];
    if (!accept) {
      return { ok: true, note: 'Declined with thanks. ' + (p ? KP.displayName(p) : 'She') +
        ' keeps her weeks; the production keeps a shortlist we are no longer on.' };
    }
    if (!p || p.status !== 'idol') return { ok: false, reason: 'She is not available to sign.' };
    gigs(state).push({ id: o.id, kind: o.kind, personId: o.personId, show: o.show,
      weeksLeft: o.weeks, weekly: o.weekly || 0, lump: o.lump || 0,
      signedWeek: state.week, strain: 0, weeksRun: 0 });
    p.history.push({ week: state.week, text: 'Signed on as ' + KP.gigLabel(gigs(state)[gigs(state).length - 1]) + '.' });
    const note = KP.note(state, { kind: 'public', ind: 'gigSigned', personId: p.id, gigKind: o.kind,
      text: KP.fillPro('Confirmed: ' + KP.displayName(p) + ' is ' + KP.gigLabel({ kind: o.kind, show: o.show }) +
        ' starting this week. {Her} name on somebody else’s poster — the second job begins.', p) });
    return { ok: true, note: note.text };
  };

  // the management lever: pull her out before the production does
  KP.quitGig = function (state, id) {
    const gig = KP.activeGigs(state).find(x => x.id === id);
    if (!gig) return { ok: false, reason: 'No such booking.' };
    const p = state.people[gig.personId];
    gig.weeksLeft = 0;
    gig.recast = true;   // ended early, either way — no wrap payoffs
    if (p) {
      p.morale = KP.clamp(p.morale - KP.C.GIGS.quitMorale, 0, 100);
      p.history.push({ week: state.week, text: 'Pulled out of ' + gig.show + ' — the company chose the group calendar.' });
    }
    const note = KP.note(state, { kind: 'company', personId: gig.personId,
      text: KP.fillPro((p ? KP.displayName(p) : 'She') + ' steps down from ' + gig.show +
        ' “to focus on group activities.” The production issued the gracious statement. {She} read it in the van and said nothing, which said plenty.', p) });
    return { ok: true, note: note.text };
  };

  // ---- the timeline reacts through the registry ----
  KP.onFeedEvent('gigSigned', (state, n, rng) => {
    const p = state.people[n.personId];
    const name = p ? KP.publicGiven(p) : 'her';
    return rng.pick([
      { persona: 'fan', text: name + ' GOT THE ' + (n.gigKind === 'ost' ? 'OST' : n.gigKind === 'mc' ? 'MC SEAT' : 'PANEL SEAT') + '. individual schedules are the fandom’s vegetables and dessert at once' },
      { persona: 'casual', text: 'oh the idol from that group is ' + (n.gigKind === 'mc' ? 'hosting now' : n.gigKind === 'ost' ? 'singing the drama OST' : 'on the panel show now') + '. this is how the general public meets people, for the record' },
    ]);
  });
  KP.onFeedEvent('gigWrapped', (state, n, rng) => {
    const p = state.people[n.personId];
    const name = p ? KP.publicGiven(p) : 'she';
    return rng.pick([
      { persona: 'fan', text: name + '’s farewell episode had the whole panel doing the fake-crying bit and then one of them actually cried. television is beautiful' },
      { persona: 'stan', text: 'watched ' + name + '’s entire run back to back. the edit LOVED ' + (p ? KP.fillPro('{her}', p) : 'her') + ' by episode three. variety understood what we always knew' },
    ]);
  });
  KP.onFeedEvent('gigRecast', () => ({
    persona: 'casual', text: 'a “lineup refresh” announcement doing numbers today. everyone knows what a lineup refresh means. the schedule always wins',
  }));
  KP.onFeedEvent('ostDrop', (state, n, rng) => {
    const p = state.people[n.personId];
    const name = p ? KP.publicGiven(p) : 'she';
    return n.hit
      ? { persona: 'casual', text: 'I do not watch the drama and I do not know the group but the OST has been in my head for four days. ' + name + ', apparently. fine. following' }
      : rng.pick([
        { persona: 'fan', text: name + ' singing over the episode-eight montage… the drama tag and the fandom tag are holding hands tonight' },
        { persona: 'stan', text: 'the OST proves what the b-sides already knew about ' + name + '’s voice. drama fans, welcome, we have charts and lore' },
      ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
