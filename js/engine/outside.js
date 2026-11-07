/* The outside work (v0.10.42, §89 D6) — brand deals (v0.7.0) and the
   second job (v0.9.11) were the same machine twice: offers that wait on
   the desk, jobs that run for weeks, a lump and a weekly, an expiry, a
   calendar that fights the group's. One list now, one law, one books
   line — with the kinds keeping their teeth: the brand's invoice and its
   solo request (v0.9.14), the production's strain ladder and its recast.
   Kinds: brand | panel | mc | ost. The brand wants the face the market
   already wants; the productions want the SECONDARY strengths — the
   funny one, the poised one, the voice. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  const SHOW = ['panel', 'mc', 'ost'];
  function offers(state) { return state.outsideOffers = state.outsideOffers || []; }
  function jobs(state) { return state.outside = state.outside || []; }
  KP.outsideOffersList = offers;   // for KP.ensureLedgers (audit v0.11.3)
  function nextId(state) {
    state.nextOutsideId = state.nextOutsideId || 1;
    return 'out' + (state.nextOutsideId++);
  }
  function matches(x, which) {
    if (!which) return true;
    if (which === 'show') return SHOW.includes(x.kind);
    return x.kind === which;
  }
  function sponsor(state) {
    return state.sponsorLedger = state.sponsorLedger ||
      { kept: 0, missed: 0, clawbacks: 0, soloAsked: 0, soloAllowed: 0, soloDeclined: 0 };
  }
  KP.sponsorLedgerOf = sponsor;

  // ---- the one list, read by family -----------------------------------
  KP.outsideJobs = function (state, which) {
    return jobs(state).filter(j => j.weeksLeft > 0 && matches(j, which));
  };
  KP.openOutsideOffers = function (state, which) {
    return offers(state).filter(o => o.expiresWeek >= state.week && matches(o, which));
  };
  KP.outsideOf = function (state, personId, which) {
    return KP.outsideJobs(state, which).find(j => j.personId === personId) || null;
  };
  KP.outsideLabel = function (job) {
    return job.kind === 'brand' ? 'the face of ' + job.label
      : job.kind === 'panel' ? 'fixed panelist on ' + job.label
      : job.kind === 'mc' ? 'MC of ' + job.label
      : 'the ' + job.label + ' OST';
  };
  KP.outsideKindLabel = function (kind) {
    return kind === 'brand' ? 'Brand offer' : kind === 'ost' ? 'OST offer' : kind === 'mc' ? 'MC offer' : 'Variety offer';
  };
  // the old doors, kept as views over the one list
  KP.activeDeals = state => KP.outsideJobs(state, 'brand');
  KP.activeGigs = state => KP.outsideJobs(state, 'show');
  KP.openDealOffers = state => KP.openOutsideOffers(state, 'brand');
  KP.openGigOffers = state => KP.openOutsideOffers(state, 'show');
  KP.gigOf = (state, personId) => KP.outsideOf(state, personId, 'show');
  KP.gigLabel = KP.outsideLabel;

  // departures, scandals, the service: a person's outside work ends with
  // them — the running jobs stop, the open calls come off the desk
  KP.outsideDrop = function (state, personId, which) {
    const dropped = [];
    jobs(state).forEach(j => {
      if (j.personId !== personId || j.weeksLeft <= 0 || !matches(j, which)) return;
      j.weeksLeft = 0;
      if (j.kind !== 'brand') j.recast = true;   // ended early: no wrap payoffs
      dropped.push(j);
    });
    state.outside = jobs(state).filter(j => j.weeksLeft > 0);
    state.outsideOffers = offers(state).filter(o => !(o.personId === personId && matches(o, which)));
    return dropped;
  };

  // ---- who the market wants ---------------------------------------------
  // the brands: visuals, reach, and the it-girl narrative
  function brandAppeal(state, p) {
    return p.talents.visuals.cur * 0.5 + Math.min(60, (p.social || 0) / 2500) +
      (KP.getNarrative(state, 'itGirl', 'idol', p.id) ? 25 : 0) +
      (KP.getNarrative(state, 'fancamStar', 'idol', p.id) ? 12 : 0);
  }
  // is her group asking for the same week? prep, promo, or the road
  function groupBusy(state, p) {
    const g = KP.groupOf(state, p.id);
    if (!g) return false;
    return !!(g.prep || g.tour ||
      (g.debuted && state.week <= (g.promoUntil || 0) && state.week > (g.lastReleaseWeek || 0)));
  }
  // the productions: the derived stats, not the résumé
  function showCandidates(state) {
    const G = KP.C.GIGS;
    const out = [];
    state.roster.map(id => state.people[id]).forEach(p => {
      if (!p || p.status !== 'idol') return;
      if (KP.onBreak(p)) return;   // resting people don't take panel seats (v0.9.20)
      if ((p.social || 0) < G.minSocial) return;
      if (KP.outsideOf(state, p.id, 'show')) return;
      if (offers(state).some(o => o.personId === p.id && SHOW.includes(o.kind))) return;
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

  // ---- the brand's week: the trickle, the invoice, the request ----------
  function brandWeek(state, rng, inbox, d, p) {
    const D = KP.C.DEALS;
    d.weeksLeft--;
    d.weeksRun = (d.weeksRun || 0) + 1;
    // a declined solo request cools the wire
    const dpay = d.cooled ? Math.max(0, d.weekly - D.cooledWeeklyCut) : d.weekly;
    state.budget += dpay;
    if (KP.ledgerFlow) KP.ledgerFlow(state, 'outside', dpay);
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
      const led = sponsor(state);
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
          inbox.push({ kind: 'company', urgent: true, ind: 'dealCancelled', personId: p.id,
            text: d.label + ' terminated ' + KP.displayName(p) + '’s contract for cause — two sponsored appearances missed — and clawed back ' + penalty + '. The termination letter used the phrase “professional courtesy” in a way that contained neither.' });
        } else {
          d.nextObligationWeek = state.week + D.missRescheduleWeeks;
          inbox.push({ kind: 'company', priority: 'high', personId: p.id,
            text: KP.fillPro('The ' + d.label + ' appearance did not happen — ' + KP.displayName(p) +
              ' was ' + (p.flags.military ? 'in service' : p.flags.burnout > 0 ? 'on medical rest' : p.flags.personalHiatus ? 'on a personal break' : 'on the road') + ' and the brand’s event ran without {her}. They rebooked it, politely, for a date that was not a question. (' + d.missStreak + ' missed.)', p) });
        }
      } else {
        d.obligationsKept = (d.obligationsKept || 0) + 1;
        d.missStreak = 0;
        led.kept++;
        p.fatigue = KP.clamp(p.fatigue + (busy ? D.squeezeFatigue : D.obligationFatigue), 0, 100);
        KP.socialSpike(state, p, 700, 'oblig-' + d.id);
        d.nextObligationWeek = state.week + D.obligationEveryWeeks;
        inbox.push({ kind: 'company', priority: 'flavor', personId: p.id,
          text: KP.fillPro(KP.displayName(p) + ' worked the ' + d.label + ' event this week' +
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
      sponsor(state).soloAsked++;
      KP.openScene(state, { kind: 'sponsorSolo', personId: p.id, jobId: d.id,
        brand: d.label, expiresWeek: state.week + 3 });
      inbox.push({ kind: 'company', urgent: true, personId: p.id,
        text: KP.fillPro(d.label + ' called with the request that is never just a request: they want ' +
          KP.displayName(p) + ' ALONE for a sponsored solo stage — {her} name, their logo, no group. The answer is on the Desk, and everyone in the building already knows the question was asked.', p) });
    }
    if (p && d.weeksLeft === 0) {
      inbox.push({ kind: 'company', text: 'The ' + d.label + ' contract with ' + KP.displayName(p) +
        ' wrapped cleanly. The brand is “very satisfied,” which in their language means the renewal call comes eventually.' });
    }
    // the scandal clause: a boiled storm on the ambassador voids it
    if (p && d.weeksLeft > 0 && (state.discourses || []).some(x =>
        x.status === 'boiled' && x.subjectType === 'idol' &&
        String(x.subjectId) === String(d.personId) && x.week >= d.signedWeek)) {
      d.weeksLeft = 0;
      const penalty = Math.round(d.lump * D.scandalPenaltyMult);
      state.budget = Math.max(0, state.budget - penalty);
      inbox.push({ kind: 'company', urgent: true, ind: 'dealCancelled', personId: p.id,
        text: d.label + ' invoked the conduct clause and cancelled ' + KP.displayName(p) +
          '’s contract — with a ' + penalty + ' clawback. Brands love a face until the weather turns. Legal says we knew that.' });
    }
  }

  // ---- the production's week: the taping, the clash, the wrap ----------
  function showWeek(state, rng, inbox, job, p) {
    const G = KP.C.GIGS;
    if (!p || p.status !== 'idol') { job.weeksLeft = 0; return; }   // departures end everything
    job.weeksLeft--;
    job.weeksRun = (job.weeksRun || 0) + 1;
    if (job.weekly) { state.budget += job.weekly; if (KP.ledgerFlow) KP.ledgerFlow(state, 'outside', job.weekly); }
    p.fatigue = KP.clamp(p.fatigue + G.gigFatigue, 0, 100);
    if (job.weeksRun % G.mediaExpEvery === 0) p.mediaExp = KP.clamp(p.mediaExp + 1, 0, 100);
    if (job.kind !== 'ost' && job.weeksRun % 2 === 0) {
      KP.socialSpike(state, p, G.followerDrip, 'gig-' + job.id);
    }
    // a panel week feeds the variety dream the way four promo bookings
    // never could — it is HER seat
    if (job.kind === 'panel' && KP.ambitionOf(state, p) === 'variety') {
      p.morale = KP.clamp(p.morale + 1, 0, 100);
    }
    // ---- the clash: the group wants the same week ----
    // A busy group week always costs her body. Whether it costs the
    // SHOW is the gamble: most weeks the van makes the taping — but a
    // missed taping is a missed taping, and productions count.
    if (job.kind !== 'ost' && groupBusy(state, p)) {
      p.fatigue = KP.clamp(p.fatigue + G.clashFatigue, 0, 100);
      if (!job.stretchNoted) {
        job.stretchNoted = true;
        inbox.push({ kind: 'company', personId: p.id,
          text: KP.fillPro(KP.displayName(p) + ' taped ' + job.label + ' between schedules this week — van, stage, van, studio. The road manager’s log has a note in the margin that just says “watch this.”', p) });
      }
      if (rng.chance(G.clashMissChance)) {
        job.strain = (job.strain || 0) + 1;
        if (job.strain < G.strainRecastAt) {
          inbox.push({ kind: 'company', personId: p.id,
            text: KP.fillPro('The van did not make it: ' + KP.displayName(p) + ' missed this week’s ' + job.label +
              ' taping — the group schedule won. The production “understands completely,” which is what productions say while they count (' +
              job.strain + ' missed now).', p) });
        }
      }
      if (job.strain >= G.strainRecastAt) {
        job.weeksLeft = 0;
        job.recast = true;
        p.morale = KP.clamp(p.morale - G.recastMorale, 0, 100);
        p.history.push({ week: state.week, text: 'Quietly written out of ' + job.label + ' — the group calendar kept winning.' });
        inbox.push({ kind: 'public', ind: 'gigRecast', priority: 'high', personId: p.id,
          text: KP.fillPro(job.label + ' announced a “lineup refresh” — ' + KP.displayName(p) +
            '’s seat is gone. The production was polite about it. The internet did the math about {pos} schedule immediately, and for once the internet is right.', p) });
        return;
      }
    }
    // ---- the run ends ----
    if (job.weeksLeft === 0 && !job.recast) {
      if (job.kind === 'ost') {
        // the drop: her voice, somebody else's drama — reception rides
        // the voice, the show's reach, and the week's luck
        const rec = KP.clamp(Math.round(p.talents.vocals.cur * 0.7 +
          ((KP.groupOf(state, p.id) || {}).popularity || 0) * 0.15 + rng.int(-8, 12)), 20, 96);
        job.reception = rec;
        state.budget += job.lump || 0;
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'outside', job.lump || 0);
        p.flags.ostDrops = (p.flags.ostDrops || 0) + 1;
        p.history.push({ week: state.week, text: 'Sang the ' + job.label + ' OST. Reception: ' + KP.receptionWord(rec).toLowerCase() + '.' });   // a word, never the number (v0.11.5, §96 wiring)
        const hit = rec >= G.ostHitAt;
        if (hit) KP.socialSpike(state, p, G.followerDrip * 3, 'ost-' + job.id);
        inbox.push({ kind: 'public', ind: 'ostDrop', priority: 'high', personId: p.id, hit,
          text: KP.fillPro('The ' + job.label + ' OST is out — ' + KP.displayName(p) + ', solo vocal, over the episode-eight montage. ' +
            (hit ? 'It is EVERYWHERE. Cafés, cabs, the company elevator. People who have never heard of the group know this song.'
                 : 'The drama’s fans have adopted it; the charts noticed politely. {Her} voice got somewhere the group has not been.'), p) });
        if (p.flags.ostDrops >= G.ostVoiceAt) {
          const nar = KP.recordEvidence(state, 'ostVoice', 'idol', p.id);
          if (nar) inbox.push(nar);
        }
      } else {
        if (job.kind === 'panel') p.flags.panelArcs = (p.flags.panelArcs || 0) + 1;
        if (job.kind === 'mc') p.flags.mcRuns = (p.flags.mcRuns || 0) + 1;
        p.history.push({ week: state.week, text: 'Wrapped a full run as ' + KP.outsideLabel(job) + '.' });
        const g = KP.groupOf(state, p.id);
        if (g) g.popularity = KP.clamp((g.popularity || 0) + G.completePop, 0, 100);
        inbox.push({ kind: 'public', ind: 'gigWrapped', priority: 'high', personId: p.id, gigKind: job.kind,
          text: KP.fillPro(KP.displayName(p) + ' wrapped ' + job.weeksRun + ' weeks as ' + KP.outsideLabel(job) +
            '. The farewell episode gave {her} a proper sendoff' +
            (g ? ', and the group’s numbers felt it — the second job invoices in attention' : '') + '.', p) });
        const amb = KP.ambitionTouch(state, p, 'variety');
        if (amb) inbox.push(amb);
        if (job.kind === 'panel' && p.flags.panelArcs >= G.varietyMonsterAt) {
          const nar = KP.recordEvidence(state, 'varietyMonster', 'idol', p.id);
          if (nar) inbox.push(nar);
        }
        if (job.kind === 'mc') {
          const nar = KP.recordEvidence(state, 'nationalMC', 'idol', p.id);
          if (nar) inbox.push(nar);
        }
      }
    }
  }

  // ---- the week: the jobs run, the calls come in -------------------------
  // one phase (the deals' old slot): the brand's trickle and the taping
  // week share a clock, and the desk's capacity is one number
  KP.registerWeekly('outside', 520, function (state, rng, inbox) {
    const O = KP.C.OUTSIDE, D = KP.C.DEALS, G = KP.C.GIGS;
    // offers expire quietly
    state.outsideOffers = offers(state).filter(o => o.expiresWeek >= state.week);
    KP.outsideJobs(state).forEach(job => {
      const p = state.people[job.personId];
      if (job.kind === 'brand') brandWeek(state, rng, inbox, job, p);
      else showWeek(state, rng, inbox, job, p);
    });
    state.outside = jobs(state).filter(j => j.weeksLeft > 0);

    const room = () => KP.outsideJobs(state).length + KP.openOutsideOffers(state).length < O.maxActive;
    // a brand finds the most wanted face
    if (room() && rng.chance(D.offerBaseChance +
        (state.roster.some(id => KP.getNarrative(state, 'itGirl', 'idol', id)) ? D.itGirlBonus : 0))) {
      const idols = state.roster.map(id => state.people[id])
        .filter(p => p.status === 'idol' && (p.social || 0) >= D.minSocial)
        .filter(p => !KP.outsideOf(state, p.id, 'brand') &&
          !offers(state).some(o => o.kind === 'brand' && o.personId === p.id));
      if (idols.length) {
        const face = idols.sort((a, b) => brandAppeal(state, b) - brandAppeal(state, a))[0];
        const brand = rng.pick(D.BRANDS) + ' ' + '(' + rng.pick(D.CATEGORIES) + ')';
        const offer = {
          id: nextId(state), kind: 'brand', personId: face.id, label: brand,
          lump: rng.int(D.lump[0], D.lump[1]), weekly: rng.int(D.weekly[0], D.weekly[1]),
          weeks: rng.int(D.weeks[0], D.weeks[1]), expiresWeek: state.week + O.expiresWeeks,
        };
        offers(state).push(offer);
        inbox.push({ kind: 'company', urgent: true, ind: 'outsideOffer', outsideKind: 'brand', personId: face.id,
          text: brand + ' wants ' + KP.displayName(face) + ' as an ambassador: ' + offer.lump +
            ' up front, ' + offer.weekly + ' a week for ' + offer.weeks +
            ' weeks. The offer is on the Desk and expires ' + KP.weekLabel(offer.expiresWeek).text +
            '. The visual role finally sends an invoice.' });
      }
    }
    // a production calls for a secondary strength
    if (room()) {
      const cand = showCandidates(state);
      const natural = state.roster.some(id => {
        const p = state.people[id];
        return p && p.status === 'idol' && (p.archetypes || []).includes('varietyNatural');
      });
      // an idle idol is a bookable idol (v0.9.12): a group on declared
      // hiatus makes its members the easiest calls in the industry
      const parked = cand.some(c => KP.onHiatus && KP.onHiatus(KP.groupOf(state, c.p.id)));
      // identity arcs (v0.9.18): a variety group's phones ring more; an
      // OST factory's ring for dramas — the narrative changes the door
      const arcBoosted = cand.some(c => {
        const g3 = KP.groupOf(state, c.p.id);
        return g3 && (KP.getNarrative(state, 'varietyGroup', 'group', g3.id) ||
          (c.kind === 'ost' && KP.getNarrative(state, 'ostFactory', 'group', g3.id)));
      });
      if (cand.length && rng.chance(G.offerBaseChance * (arcBoosted ? KP.C.ARCS.varietyOfferBoost : 1) +
          (natural ? G.naturalBonus : 0) +
          (parked ? G.hiatusOfferBonus : 0))) {
        const pick = cand[0];
        const offer = { id: nextId(state), kind: pick.kind, personId: pick.p.id,
          expiresWeek: state.week + O.expiresWeeks };
        if (pick.kind === 'ost') {
          offer.label = rng.pick(G.DRAMAS);
          offer.weeks = G.ostWeeks;
          offer.lump = rng.int(G.ostLump[0], G.ostLump[1]);
        } else {
          offer.label = rng.pick(G.SHOWS);
          const W = pick.kind === 'panel' ? G.panelWeeks : G.mcWeeks;
          const pay = pick.kind === 'panel' ? G.panelWeekly : G.mcWeekly;
          offer.weeks = rng.int(W[0], W[1]);
          offer.weekly = rng.int(pay[0], pay[1]);
        }
        offers(state).push(offer);
        const p = pick.p;
        const pitch = pick.kind === 'panel'
          ? offer.label + ' wants ' + KP.displayName(p) + ' as a FIXED PANELIST — ' + offer.weeks +
            ' weeks, ' + offer.weekly + ' a week. The casting director used the word “naturally funny” twice.'
          : pick.kind === 'mc'
          ? offer.label + ' wants ' + KP.displayName(p) + ' holding the MC mic — ' + offer.weeks +
            ' weeks, ' + offer.weekly + ' a week. Live television, every week, {pos} face opening the broadcast.'
          : 'The ' + offer.label + ' production wants ' + KP.displayName(p) + ' on the OST — three weeks of recording, ' +
            offer.lump + ' on delivery. The music director asked for “that voice” by name.';
        inbox.push({ kind: 'company', urgent: true, ind: 'outsideOffer', outsideKind: pick.kind, personId: p.id,
          text: KP.fillPro(pitch + ' The offer is on the Desk and expires ' +
            KP.weekLabel(offer.expiresWeek).text + '. A second job is a second schedule.', p) });
      }
    }
  });

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
      const d = jobs(state).find(x => x.id === (sc.jobId || sc.dealId));
      const led = sponsor(state);
      if (optionId === 'allow') {
        led.soloAllowed++;
        const fee = d ? Math.round(d.lump * D.soloBonusMult) : 0;
        state.budget += fee;
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'outside', fee);
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
        KP.recordDirected(state, p.id, 'heldBack');
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

  // ---- the desk answers ----------------------------------------------------
  KP.respondOutside = function (state, offerId, accept) {
    const D = KP.C.DEALS;
    const o = offers(state).find(x => x.id === offerId);
    if (!o) return { ok: false, reason: o === undefined && offerId ? 'That offer is no longer on the desk.' : 'That offer is no longer on the desk.' };
    if (o.expiresWeek < state.week) return { ok: false, reason: o.kind === 'brand' ? 'The offer expired. Brands do not wait.' : 'The offer expired. Broadcast waits for nobody.' };
    state.outsideOffers = offers(state).filter(x => x.id !== offerId);
    const p = state.people[o.personId];
    if (!accept) {
      return { ok: true, note: o.kind === 'brand'
        ? KP.fillPro('The ' + o.label + ' offer was declined politely. ' + (p ? KP.displayName(p) : '{She}') + ' keeps {pos} schedule; the brand keeps calling other agencies.', p)
        : KP.fillPro('Declined with thanks. ' + (p ? KP.displayName(p) : '{She}') + ' keeps {pos} weeks; the production keeps a shortlist we are no longer on.', p) };
    }
    // a face that left the building cannot be signed for it (0.9.13 audit H1)
    if (!p || p.status !== 'idol') {
      return { ok: false, reason: o.kind === 'brand' ? 'That artist is no longer on the roster. The brand has been informed.' : 'That artist is not available to sign.' };
    }
    if (o.kind === 'brand') {
      state.budget += o.lump;
      if (KP.ledgerFlow) KP.ledgerFlow(state, 'outside', o.lump);
      jobs(state).push({ id: o.id, kind: 'brand', personId: o.personId, label: o.label,
        lump: o.lump, weekly: o.weekly, weeks: o.weeks, weeksLeft: o.weeks, signedWeek: state.week, weeksRun: 0 });
      p.mediaExp += 4;
      p.history.push({ week: state.week, text: 'Signed as the face of ' + o.label + '.' });
      p.dealCount = (p.dealCount || 0) + 1;
      if (p.dealCount >= D.brandDarlingAt) {
        const nar = KP.recordEvidence(state, 'brandDarling', 'idol', p.id);
        if (nar) KP.note(state, nar);
      }
      const note = KP.note(state, { kind: 'company', ind: 'outsideSigned', outsideKind: 'brand', personId: o.personId,
        text: 'Signed: ' + KP.displayName(p) + ' is the new face of ' + o.label + '. ' +
          o.lump + ' hits the account today, ' + o.weekly + ' a week follows. The campaign shots are already better than our album covers, which stings.' });
      return { ok: true, note: note.text };
    }
    const job = { id: o.id, kind: o.kind, personId: o.personId, label: o.label,
      weeks: o.weeks, weeksLeft: o.weeks, weekly: o.weekly || 0, lump: o.lump || 0,
      signedWeek: state.week, strain: 0, weeksRun: 0 };
    jobs(state).push(job);
    p.history.push({ week: state.week, text: 'Signed on as ' + KP.outsideLabel(job) + '.' });
    const note = KP.note(state, { kind: 'public', ind: 'outsideSigned', outsideKind: o.kind, personId: p.id,
      text: KP.fillPro('Confirmed: ' + KP.displayName(p) + ' is ' + KP.outsideLabel(job) +
        ' starting this week. {Her} name on somebody else’s poster — the second job begins.', p) });
    return { ok: true, note: note.text };
  };

  // the management lever: pull her out of a production before it does
  KP.quitOutside = function (state, id) {
    const job = KP.outsideJobs(state).find(x => x.id === id);
    if (!job) return { ok: false, reason: 'No such booking.' };
    if (job.kind === 'brand') return { ok: false, reason: 'A brand contract has a termination clause, and it is theirs to invoke, not yours. Let it run.' };
    const p = state.people[job.personId];
    job.weeksLeft = 0;
    job.recast = true;   // ended early, either way — no wrap payoffs
    if (p) {
      p.morale = KP.clamp(p.morale - KP.C.GIGS.quitMorale, 0, 100);
      p.history.push({ week: state.week, text: 'Pulled out of ' + job.label + ' — the company chose the group calendar.' });
    }
    const note = KP.note(state, { kind: 'company', personId: job.personId,
      text: KP.fillPro((p ? KP.displayName(p) : 'She') + ' steps down from ' + job.label +
        ' “to focus on group activities.” The production issued the gracious statement. {She} read it in the van and said nothing, which said plenty.', p) });
    return { ok: true, note: note.text };
  };

  // ---- the timeline reacts through the registry ---------------------------
  KP.onFeedEvent('outsideSigned', (state, n, rng) => {
    const p = state.people[n.personId];
    const name = p ? KP.publicGiven(p) : 'her';
    if (n.outsideKind === 'brand') return rng.chance(0.5) ? rng.pick([
      { persona: 'fan', text: name + ' is the new face of a campaign and the billboard is already better than the album cover. the visual role invoices now' },
      { persona: 'casual', text: 'saw an idol on a cosmetics ad in the subway and knew exactly which one it was. that is the whole job of a brand' },
    ]) : null;
    return rng.pick([
      { persona: 'fan', text: name + ' GOT THE ' + (n.outsideKind === 'ost' ? 'OST' : n.outsideKind === 'mc' ? 'MC SEAT' : 'PANEL SEAT') + '. individual schedules are the fandom’s vegetables and dessert at once' },
      { persona: 'casual', text: 'oh the idol from that group is ' + (n.outsideKind === 'mc' ? 'hosting now' : n.outsideKind === 'ost' ? 'singing the drama OST' : 'on the panel show now') + '. this is how the general public meets people, for the record' },
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
  KP.onFeedEvent('sponsorSolo', (state, n, rng) => {
    const p = state.people[n.personId];
    const name = p ? KP.publicGiven(p) : 'her';
    return rng.pick([
      { persona: 'fan', text: name + ' SOLO SPONSOR STAGE. the arrangement, the styling, the way the brand knew exactly who to ask. supporting the group means supporting this too. it does. it definitely does' },
      { persona: 'casual', text: 'saw a solo idol stage at a brand event today and the crowd knew every word. apparently there is a whole group? wild how that works' },
      { persona: 'stan', text: 'the ' + name + ' solo stage clips are everywhere and the fandom is doing group-photo damage control in the replies. love when a company hands us discourse homework' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
