/* The friction stream (v0.10.26, §88 A+B) — the week-to-week choice.
   Owner: "I still want to go even deeper with idol personalities and
   week to week choices… every answer has a consequence but the worst
   have big consequences." The design law: same event + different
   person = different correct answer — the player must KNOW their
   people to answer well. Small condition-gated decisions born from
   REAL state, paced like the office door (one live at a time, most
   weeks quiet), with a teeth tail on the badly-read branch. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    return state.frictionLedger = state.frictionLedger ||
      { asked: 0, answered: 0, hard: 0, byKind: {}, lastWeek: -999 };
  }
  KP.frictionLedger = ledger;

  function activeMembers(state, g) {
    return g.members.map(id => state.people[id])
      .filter(m => m && m.status === 'idol' && !m.flags.military && !KP.onBreak(m));
  }
  function busyPerson(state, id) {
    return (state.scenes || []).some(sc => sc.personId === id);
  }
  function teeth(state, kind) {
    const led = ledger(state);
    led.hard++;
    led.byKind[kind + 'Hard'] = (led.byKind[kind + 'Hard'] || 0) + 1;
  }

  // ---- the candidates: each family is a reader of live numbers ----------
  // Deterministic scan order (groups then members as stored); the rng
  // only picks among true candidates.
  function candidates(state) {
    const FR = KP.C.FRICTION;
    const out = [];
    KP.groups(state).forEach(g => {
      if (!g.debuted || g.retiredWeek || g.type === 'solo') return;
      const actives = activeMembers(state, g);

      // THE EXTRA HOUR — the grinder wants the room past the line; the
      // drained one wants a lighter week. Same door, opposite people.
      if (g.prep) {
        actives.forEach(m => {
          if (busyPerson(state, m.id)) return;
          if (m.personality.workEthic >= FR.grinderEthic &&
              m.fatigue >= FR.grinderFatigueLo && m.fatigue <= FR.grinderFatigueHi) {
            out.push({ kind: 'frictionExtraHour', personId: m.id, groupId: g.id, variant: 'grinder' });
          } else if (m.personality.workEthic <= FR.drainedEthic && m.fatigue >= FR.drainedFatigue) {
            out.push({ kind: 'frictionExtraHour', personId: m.id, groupId: g.id, variant: 'drained' });
          }
        });
      }

      // THE CLIP CALL — mid-promotion, the mouthy voice said something
      // borderline at the fan sign; the clip is circulating. Once per era.
      if (state.week <= (g.promoUntil || 0) && (g.clipCallEra || 0) !== (g.promoUntil || 0)) {
        const mouthy = actives.find(m => !busyPerson(state, m.id) &&
          ['blunt', 'gremlin'].includes(KP.voiceOf(state, m)) &&
          (m.social || 0) >= FR.clipMinSocial);
        if (mouthy) out.push({ kind: 'frictionClipCall', personId: mouthy.id, groupId: g.id });
      }

      // THE SUBSTITUTION — crunch week: one running on fumes, one
      // confident and fresh, and the offer is on the table
      if (g.prep && g.prep.scheduledWeek - state.week <= KP.C.DEBUT.crunchWeeks) {
        const worn = actives.find(m => m.fatigue >= FR.subWornAt && !busyPerson(state, m.id));
        const fresh = worn && actives.find(m => m.id !== worn.id &&
          m.personality.confidence >= FR.subConfidence && m.fatigue <= FR.subFreshBelow);
        if (worn && fresh) {
          out.push({ kind: 'frictionSubstitution', personId: worn.id, groupId: g.id, volunteerId: fresh.id });
        }
      }

      // VARIETY, ALONE — the show wants the funny one, and only her
      if (!g.prep && !g.tour && state.week > (g.promoUntil || 0)) {
        const funny = actives.find(m => !busyPerson(state, m.id) &&
          state.week - (m.varietyAskWeek || -999) >= FR.varietyPersonGap &&
          ((m.archetypes || []).includes('varietyNatural') || KP.ambitionOf(state, m) === 'variety'));
        if (funny) out.push({ kind: 'frictionVarietyAlone', personId: funny.id, groupId: g.id });
      }

      // THE QUIET NO — the softspoken one declines a schedule she has
      // never declined before, in a week that needs her
      if (g.prep || state.week <= (g.promoUntil || 0)) {
        const quiet = actives.find(m => !busyPerson(state, m.id) &&
          (KP.voiceOf(state, m) === 'softspoken' || m.personality.dominance < FR.quietDominance) &&
          m.morale < FR.quietMorale && m.fatigue >= FR.quietFatigue);
        if (quiet) out.push({ kind: 'frictionQuietNo', personId: quiet.id, groupId: g.id });
      }
    });
    return out;
  }

  // ---- the weekly rail: one question at a time, most weeks quiet --------
  // Order 790 — with the other person-facing knocks (door 787,
  // memberDesk 788, hiatus 789), after the week's real numbers moved.
  KP.registerWeekly('friction', 790, function (state, rng, inbox) {
    const FR = KP.C.FRICTION;
    const led = ledger(state);

    // the steadying (§88 B): the warm veteran quietly holds up whoever
    // is lowest — a real, visible assist, every week, no decision needed
    KP.groups(state).forEach(g => {
      if (!g.debuted || g.retiredWeek || g.type === 'solo') return;
      const actives = activeMembers(state, g);
      const warm = actives.find(m => m.personality.warmth >= FR.steadyWarmth);
      const low = actives.filter(m => warm && m.id !== warm.id && m.morale < FR.steadyBelow)
        .sort((a, b) => a.morale - b.morale)[0];
      if (warm && low) {
        low.morale = KP.clamp(low.morale + FR.steadyLift, 0, 100);
        // hash-gated, not rng: the note is flavor and must not shift
        // the week's stream for everyone else (the v0.10.17 lesson)
        // no note (§89 C): the lift is the point, the file shows the warmth
      }
    });

    // the question: one at a time, most weeks quiet. The rng is only
    // touched when a real candidate exists — a rail that draws on
    // empty weeks shifts every stream in the save (the v0.10.17 law)
    if ((state.scenes || []).some(sc => /^friction/.test(sc.kind))) return;
    if (state.week - led.lastWeek < FR.gapWeeks) return;
    const cands = candidates(state);
    if (!cands.length) return;
    if (!rng.chance(FR.chance)) return;
    const pick = cands[rng.int(0, cands.length - 1)];
    led.lastWeek = state.week;
    led.asked++;
    led.byKind[pick.kind] = (led.byKind[pick.kind] || 0) + 1;
    if (pick.kind === 'frictionVarietyAlone') {
      const p = state.people[pick.personId];
      if (p) p.varietyAskWeek = state.week;
    }
    if (pick.kind === 'frictionClipCall') {
      const g = KP.groupById(state, pick.groupId);
      if (g) g.clipCallEra = g.promoUntil || 0;
    }
    KP.openScene(state, Object.assign({ expiresWeek: state.week + FR.fuseWeeks }, pick));
  });

  // ---- THE EXTRA HOUR ---------------------------------------------------
  KP.registerScene('frictionExtraHour', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'A member') + ' · the practice room, after hours';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return '';
      return sc.variant === 'grinder'
        ? KP.fillPro(KP.displayName(p) + ' is at your door with {pos} bag still on: {she} wants the practice room after the schedule ends. Again. The trainer’s log already has {her} down for more hours than anyone; the medical desk’s line on {her} chart is not red yet, but it is not white either. {She} is not asking for permission so much as informing you politely.', p)
        : KP.fillPro(KP.displayName(p) + ' catches you in the hallway and asks — carefully, with a rehearsed lightness — whether {she} could sit out the extra rehearsal block this week. The trainer’s log says {she} is genuinely running low. The trainer’s face says this is also not the first corner {she} has looked for.', p);
    },
    options: (state, sc) => sc.variant === 'grinder'
      ? [{ id: 'refuse', label: 'The schedule is the schedule — go home' },
         { id: 'allow', label: 'Leave the lights on for her' }]
      : [{ id: 'hold', label: 'The block stands — everyone rehearses' },
         { id: 'lighten', label: 'Give her the lighter week' }],
    resolve: (state, sc, optionId, rng) => {
      const FR = KP.C.FRICTION;
      const p = state.people[sc.personId];
      const g = KP.groupById(state, sc.groupId);
      if (!p) return {};
      ledger(state).answered++;
      if (sc.variant === 'grinder') {
        if (optionId === 'allow') {
          ['vocals', 'dance'].forEach(d => {
            const t = p.talents[d];
            const ceil = p.flags['ceil_' + d] != null ? p.flags['ceil_' + d] : t.ceilHi;
            t.cur = Math.min(ceil, t.cur + FR.extraHourPolish);
          });
          p.fatigue = KP.clamp(p.fatigue + FR.extraHourFatigue, 0, 100);
          KP.recordDirected(state, p.id, 'trusted', 1);
          // the teeth: leaving the lights on for someone already worn
          // is how the medical desk gets involved
          if (p.fatigue >= KP.C.COMEBACK.OVERWORK.threshold &&
              rng.chance(FR.extraHourBurnChance)) {
            teeth(state, 'extraHour');
            const n = KP.overworkIncident(state, p, 'rehearsal', rng);
            return { toast: KP.fillPro('You left the lights on. The polish is real — and so is the crash: the medical staff found {her} on the practice-room floor at 2am.', p), note: n };
          }
          return { toast: KP.fillPro('You left the lights on. The polish will show on stage; the hours will show on the chart. {She} nodded once, which from {her} is a hug.', p) };
        }
        p.morale = KP.clamp(p.morale - FR.extraHourRefuseMorale, 0, 100);
        KP.recordDirected(state, p.id, 'heldBack', -1);
        return { toast: KP.fillPro('You sent {her} home. {She} went — and every step said {she} was counting the hours {she} is not getting. Rested, and quietly furious about it.', p) };
      }
      // the drained variant
      if (optionId === 'lighten') {
        p.fatigue = KP.clamp(p.fatigue - FR.lightenRest, 0, 100);
        p.morale = KP.clamp(p.morale + FR.lightenMorale, 0, 100);
        KP.recordDirected(state, p.id, 'heardHer', 1);
        if (g) activeMembers(state, g).forEach(m => {
          if (m.id !== p.id) m.fatigue = KP.clamp(m.fatigue + FR.lightenSpread, 0, 100);
        });
        return { toast: KP.fillPro('{She} got the lighter week. The rest of the room absorbed {pos} blocking hours, and knew exactly whose they were. A kindness with a bill — most are.', p) };
      }
      p.morale = KP.clamp(p.morale - FR.holdMorale, 0, 100);
      return { toast: KP.fillPro('The block stood. {She} rehearsed every minute of it, professionally, with the enthusiasm of a tax audit.', p) };
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return null;
      return { kind: 'development', personId: p.id,
        text: KP.fillPro('The practice-room question answered itself when nobody answered it: the schedule stood, ' + KP.displayName(p) + ' read the silence, and the trainer logged the week as “unremarkable,” which it was not.', p) };
    },
  });

  // ---- THE CLIP CALL ----------------------------------------------------
  KP.registerScene('frictionClipCall', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'Someone') + ' · the clip';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return '';
      return KP.fillPro('A fan-sign clip of ' + KP.displayName(p) + ' is doing numbers: asked a loaded question, {she} answered exactly like {herself} — which is the problem and the appeal in one sentence. The team can get it pulled in an hour. Or it rides. The staff are split down the middle and both halves are certain.', p);
    },
    options: () => [
      { id: 'kill', label: 'Pull the clip — clean and quiet' },
      { id: 'ride', label: 'Let it ride — that IS her' },
    ],
    resolve: (state, sc, optionId, rng) => {
      const FR = KP.C.FRICTION;
      const p = state.people[sc.personId];
      const g = KP.groupById(state, sc.groupId);
      if (!p) return {};
      ledger(state).answered++;
      if (optionId === 'kill') {
        if (g) KP.fandomGain(g, -FR.clipKillFandom);
        p.morale = KP.clamp(p.morale - FR.clipKillMorale, 0, 100);
        KP.recordDirected(state, p.id, 'muzzled', -1);
        return { toast: KP.fillPro('The clip vanished. The fandom noticed the vanishing more than the clip; {she} noticed most of all. Clean, quiet, and filed — by everyone.', p) };
      }
      // the ride: her file tells you whether she can carry it
      if (p.personality.professionalism >= FR.clipProAt || rng.chance(FR.clipLuckChance)) {
        KP.socialSpike(state, p, KP.C.SOCIAL.breakoutSpike, 'clipRide');
        if (g) KP.fandomGain(g, FR.clipRideFandom);
        p.morale = KP.clamp(p.morale + FR.clipRideMorale, 0, 100);
        KP.recordDirected(state, p.id, 'trusted', 2);
        return { toast: KP.fillPro('It rode. By evening the clip is a meme in the good direction, three fan accounts changed their headers, and {she} texted the manager one emoji. Letting {her} be {herself} was the whole strategy.', p) };
      }
      // the teeth: the wrong mouth, the wrong week
      teeth(state, 'clipCall');
      p.morale = KP.clamp(p.morale - FR.clipBurnMorale, 0, 100);
      state.trust = KP.clamp(state.trust - FR.clipBurnTrust, 0, 100);
      const d = KP.igniteDiscourse && KP.igniteDiscourse(state, rng, 'gaffe', 'idol', p.id, sc.groupId);
      return { toast: KP.fillPro('It rode, and then it turned. The quote is out of context by lunch, a thread by dinner, and {pos} name is trending next to a word you do not want. The team that wanted it pulled is very quiet, which is worse than loud.', p),
        note: d || null };
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      const g = KP.groupById(state, sc.groupId);
      if (g) KP.fandomGain(g, -KP.C.FRICTION.clipKillFandom);
      return p ? { kind: 'development', personId: p.id,
        text: KP.fillPro('Nobody decided about the clip, so the platform did: it aged off the feed on its own, taking a little of the moment with it. The team logged “no decision,” which is also a decision.', p) } : null;
    },
  });

  // ---- THE SUBSTITUTION -------------------------------------------------
  KP.registerScene('frictionSubstitution', {
    title: (state, sc) => {
      const v = state.people[sc.volunteerId];
      return (v ? KP.displayName(v) : 'A member') + ' · the offer';
    },
    body: (state, sc) => {
      const worn = state.people[sc.personId];
      const v = state.people[sc.volunteerId];
      if (!worn || !v) return '';
      return KP.fillPro(KP.displayName(v) + ' waited until the room emptied and then made the offer: {she} will take ' +
        KP.publicGiven(worn) + '’s heavier blocking this week — the lines, the center moves, the extra stage. ' +
        KP.publicGiven(worn) + ' is running on fumes and everyone can see it. Everyone can also see what being SEEN to need the help would do to ' + KP.publicGiven(worn) + '. The offer is generous. The offer is a knife with a bow on it. Possibly both.', v);
    },
    options: () => [
      { id: 'decline', label: 'The parts stay as rehearsed' },
      { id: 'accept', label: 'Take the offer — shift the load' },
    ],
    resolve: (state, sc, optionId) => {
      const FR = KP.C.FRICTION;
      const worn = state.people[sc.personId];
      const v = state.people[sc.volunteerId];
      if (!worn || !v) return {};
      ledger(state).answered++;
      if (optionId === 'accept') {
        worn.fatigue = KP.clamp(worn.fatigue - FR.subRelief, 0, 100);
        v.fatigue = KP.clamp(v.fatigue + FR.subLoad, 0, 100);
        v.liveExp += FR.subVolunteerReps;
        v.morale = KP.clamp(v.morale + FR.subVolunteerMorale, 0, 100);
        KP.recordDirected(state, v.id, 'seen', 1);
        // the inversion IS the content: pride reads the same gift twice
        if (worn.personality.competitiveness >= FR.subPrideAt) {
          teeth(state, 'substitution');
          worn.morale = KP.clamp(worn.morale - FR.subPrideMorale, 0, 100);
          KP.recordDirected(state, worn.id, 'benchedPride', -2);
          worn.history.push({ week: state.week, text: 'Watched her parts get redistributed “for her own good.” Thanked everyone involved. Memorized the date.' });
          return { toast: KP.fillPro('The load shifted. ' + KP.publicGiven(worn) + ' thanked ' + KP.publicGiven(v) + ' in front of the room, beautifully, and has not unclenched {pos} jaw since. You saved {pos} body and taxed something {she} values more.', worn) };
        }
        worn.morale = KP.clamp(worn.morale + FR.subGratefulMorale, 0, 100);
        return { toast: KP.fillPro('The load shifted, and ' + KP.publicGiven(worn) + ' let it — gratefully, openly. The room got lighter by exactly one act of grace. Not every gift is a knife.', worn) };
      }
      KP.recordDirected(state, v.id, 'heldBack', -1);
      return { toast: KP.fillPro('The parts stand as rehearsed. ' + KP.publicGiven(v) + ' nodded and dropped it; the risk stays where it was — on ' + KP.publicGiven(worn) + '’s legs, in the last week, where risks live.', v) };
    },
    expire: () => null,
  });

  // ---- VARIETY, ALONE ---------------------------------------------------
  KP.registerScene('frictionVarietyAlone', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'The funny one') + ' · the solo booking';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      const g = KP.groupById(state, sc.groupId);
      if (!p) return '';
      return KP.fillPro('A panel show called, and the production was specific in the way productions are when they have watched the fancams: they want ' + KP.displayName(p) + '. Just {her}. The booking is good, the exposure is real, and the words “just her” will be heard by everyone in ' + (g ? g.name : 'the group') + ' whether you repeat them or not.', p);
    },
    options: () => [
      { id: 'send', label: 'Send her — the show knows what it wants' },
      { id: 'pair', label: 'Counter with a pair — two or nobody' },
      { id: 'decline', label: 'Pass on the booking' },
    ],
    resolve: (state, sc, optionId, rng) => {
      const FR = KP.C.FRICTION;
      const p = state.people[sc.personId];
      const g = KP.groupById(state, sc.groupId);
      if (!p) return {};
      ledger(state).answered++;
      if (optionId === 'send') {
        p.morale = KP.clamp(p.morale + FR.varietySendMorale, 0, 100);
        p.mediaExp += FR.varietyMediaExp;
        KP.socialSpike(state, p, KP.C.SOCIAL.breakoutSpike, 'varietyAlone');
        KP.recordDirected(state, p.id, 'openedTheDoor', 1);
        const envious = g && activeMembers(state, g).find(m => m.id !== p.id &&
          m.personality.competitiveness >= FR.varietyEnvyAt && (m.social || 0) < (p.social || 0));
        if (envious) {
          envious.morale = KP.clamp(envious.morale - FR.varietyEnvyMorale, 0, 100);
          return { toast: KP.fillPro('{She} went alone and was excellent alone — clips everywhere by midnight. ' + KP.publicGiven(envious) + ' watched every one of them, twice, with a face doing arithmetic.', p) };
        }
        return { toast: KP.fillPro('{She} went alone and the show got exactly what it booked. The clips travel; {pos} name travels with them; the group’s name rides in the caption.', p) };
      }
      if (optionId === 'pair') {
        p.morale = KP.clamp(p.morale + 1, 0, 100);
        p.mediaExp += FR.varietyMediaExp / 2;
        return { toast: 'The counter landed: two seats, half the spotlight each, zero arithmetic in the dorm. The production sounded faintly disappointed, which the caption will not show.' };
      }
      const wanted = KP.ambitionOf(state, p) === 'variety';
      p.morale = KP.clamp(p.morale - (wanted ? FR.varietyDeclineWanted : 2), 0, 100);
      if (wanted) KP.recordDirected(state, p.id, 'heldBack', -1);
      return { toast: KP.fillPro('You passed. The production booked someone else’s funny one within the hour' + (wanted ? ', and {she} watched that episode alone, taking notes on a show {she} should have been on.' : '.'), p) };
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      return p ? { kind: 'development', personId: p.id,
        text: KP.fillPro('The panel show’s window closed unanswered. Productions remember silence longer than a no — a no at least returns the call.', p) } : null;
    },
  });

  // ---- THE QUIET NO -----------------------------------------------------
  KP.registerScene('frictionQuietNo', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'A member') + ' · the quiet no';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return '';
      return KP.fillPro('The manager flags it because it has never happened before: ' + KP.displayName(p) + ' asked to skip a schedule. No drama, no doctor’s note — just a quiet “I would rather not this week,” from the person who has never once said it. The calendar needs {her}. The precedent of asking says something the calendar cannot read.', p);
    },
    options: () => [
      { id: 'ask', label: 'Sit down and ask why' },
      { id: 'press', label: 'The week needs her — she goes' },
    ],
    resolve: (state, sc, optionId, rng) => {
      const FR = KP.C.FRICTION;
      const p = state.people[sc.personId];
      if (!p) return {};
      ledger(state).answered++;
      if (optionId === 'ask') {
        p.morale = KP.clamp(p.morale + FR.quietAskMorale, 0, 100);
        KP.recordDirected(state, p.id, 'heardHer', 2);
        if (p.fatigue >= FR.quietRestAt) {
          p.fatigue = KP.clamp(p.fatigue - FR.quietRest, 0, 100);
          return { toast: KP.fillPro('You asked. It took {her} four minutes to say what one day off would fix, and one day off fixed it. The manager notes, drily, that this is the cheapest problem the company solved all quarter.', p) };
        }
        return { toast: KP.fillPro('You asked. The answer was small — a bad week, a heavy phone call from home, nothing the calendar can see. {She} went to the schedule anyway, but {she} went ASKED, which turns out to be a different thing entirely.', p) };
      }
      // the press: her file says whether she can carry being unheard
      if (p.personality.professionalism >= FR.quietProAt) {
        p.fatigue = KP.clamp(p.fatigue + FR.quietPressFatigue, 0, 100);
        KP.recordDirected(state, p.id, 'pressed', -2);
        return { toast: KP.fillPro('{She} went. {She} was flawless. Nobody watching would know anything happened — which is exactly the skill {she} used, and exactly the withdrawal it came from. The account this draws on does not send statements.', p) };
      }
      // the teeth: pressing the wrong person in the wrong week
      teeth(state, 'quietNo');
      p.morale = KP.clamp(p.morale - FR.quietBurnMorale, 0, 100);
      p.fatigue = KP.clamp(p.fatigue + FR.quietPressFatigue, 0, 100);
      KP.recordDirected(state, p.id, 'pressed', -3);
      if (p.morale < FR.quietCrashBelow && rng.chance(FR.quietCrashChance)) {
        const n = KP.overworkIncident(state, p, 'promotion', rng);
        return { toast: KP.fillPro('{She} went because you said go. Three days later the medical staff sent {her} home mid-schedule, and everyone in the room remembered the quiet no at the same time. Including you.', p), note: n };
      }
      return { toast: KP.fillPro('{She} went because you said go, and something in the set of {pos} shoulders has not come back yet. The first ask in a career is a door; this one closed from the inside.', p) };
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return null;
      p.morale = KP.clamp(p.morale - 4, 0, 100);
      KP.recordDirected(state, p.id, 'leftWaiting', -1);
      return { kind: 'development', priority: 'high', personId: p.id,
        text: KP.fillPro('The quiet no sat on the desk until it answered itself: ' + KP.displayName(p) + ' worked the schedule, unasked and unanswered. The precedent {she} risked setting was “asking works.” The one that got set instead was worse.', p) };
    },
  });

  // ---- the nerve (§88 B): head-to-head weeks read competitiveness -------
  // calendar.js's releaseWar calls this for the player's side — the
  // fighters raise the battle read, capped, and the edge is on the
  // record when it decided the week.
  KP.battleNerve = function (state, g) {
    const W = KP.C.WAR;
    return Math.min(W.nerveCap, g.members.map(id => state.people[id])
      .filter(m => m && !KP.onBreak(m) && m.personality.competitiveness >= W.nerveAt).length * W.nervePer);
  };
}(typeof self !== 'undefined' ? self : globalThis));
