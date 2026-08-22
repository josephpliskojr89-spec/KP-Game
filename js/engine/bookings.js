/* The grind, part two (v0.9.37, §76 D+E) — the booking pile and the
   campaign. Owner: "a whole pile of bookings from the lowest rung of
   fame up, all generated as needed... they're getting a performance
   at an elementary school. a small theater they have to pass out
   flyers by hand for to fill. weddings. small sporting events." And:
   "promotion of a debut or comeback itself becomes a game within the
   game... how you promote matters. how much you commit to your group
   matters."

   The pile is a GENERATOR, not a list: venue x town x season, minted
   weekly, tiered inversely to fame, always more than a group can
   take. Playing a gig pays a little money, a little exposure, real
   fatigue — and rolls the phone-camera lottery, the one channel the
   obscurity wall cannot close. The campaign runs from lock to
   release: one push per group-week, momentum with diminishing
   returns, decay when idle. Momentum is the earned-media truth the
   wall converts at full rate. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.bookingLedger = state.bookingLedger ||
      { played: 0, fees: 0, flyered: 0, virals: 0, pushes: 0, byRung: {} };
    return state.bookingLedger;
  }
  KP.bookingLedger = ledger;
  function board(state) { return state.bookings = state.bookings || []; }
  KP.openBookings = function (state) {
    return board(state).filter(o => !o.taken && o.expiresWeek >= state.week);
  };
  KP.takenBookings = function (state) {
    return board(state).filter(o => o.taken && o.week >= state.week);
  };

  // ---- the grammar: kind x town x season -------------------------------
  function venueLabel(state, kindId, town, woy) {
    const spring = woy >= 9 && woy <= 22, autumn = woy >= 35 && woy <= 47;
    switch (kindId) {
      case 'schoolShow': return town + ' ' + (spring ? 'Elementary spring assembly' : autumn ? 'Elementary autumn assembly' : 'Elementary school assembly');
      case 'wedding': return 'a hotel-ballroom wedding in ' + town;
      case 'mallOpening': return 'the ' + town + ' mall grand ' + (KP.hash01([state.seed, 're', town, woy].join('|')) < 0.5 ? 'opening' : 're-opening');
      case 'sportsDay': return 'a ' + town + ' league halftime stage';
      case 'townFair': return 'the ' + town + (autumn ? ' harvest fair' : spring ? ' blossom fair' : ' town fair');
      case 'theaterNight': return 'a 300-seat theater night in ' + town;
      case 'uniFestival': return town + ' University festival stage';
      case 'localRadio': return town + ' FM drive-time guesting';
      case 'clubNight': return 'a ' + town + ' club-circuit night';
      case 'busking': return 'a busking permit — ' + town + ' riverside';
      case 'fanSignSmall': return 'a bookstore fan-sign in ' + town;
      case 'cableSpot': return 'a late-slot cable variety spot';
      case 'showcase': return 'a Seoul showcase hall';
      case 'brandStage': return 'a brand launch stage in Seoul';
      case 'radioTour': return 'a national radio tour week';
      case 'openerSlot': return 'a festival opener slot in ' + town;
      default: return town + ' stage';
    }
  }
  function eligibleKinds(state, rungs, woy) {
    const B = KP.C.BOOK;
    return Object.keys(B.KINDS).filter(k => {
      const K = B.KINDS[k];
      if (rungs.indexOf(K.rung) < 0) return false;
      if (K.seasonWoy && !K.seasonWoy.some(w => woy >= w[0] && woy <= w[1])) return false;
      return true;
    });
  }
  // groups the pile deals for: debuted and standing, or locked for a
  // debut (the pre-debut circuit is real — the wedding stage trains
  // the wedding-stage nerves)
  function bookable(state) {
    return KP.groups(state).filter(g => !g.retiredWeek && !g.hiatus && !g.tour &&
      g.members.length && (g.debuted || g.prep));
  }

  function mintOffers(state, rng, inbox) {
    const B = KP.C.BOOK;
    const fame = KP.fameRead(state);
    const bandRow = B.dealBands.find(b => fame < b.under);
    if (!bandRow) return;                       // the pile dries up above the ladder
    const gs = bookable(state);
    if (!gs.length) return;
    const open = KP.openBookings(state);
    if (open.length >= B.boardCap) return;
    const woy = ((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1;
    const kinds = eligibleKinds(state, bandRow.rungs, woy);
    if (!kinds.length) return;
    const deals = bandRow.deals[0] +
      Math.floor(rng.next() * (bandRow.deals[1] - bandRow.deals[0] + 1));
    state.nextBookingId = state.nextBookingId || 1;
    for (let i = 0; i < deals && KP.openBookings(state).length < B.boardCap; i++) {
      const kindId = kinds[Math.floor(rng.next() * kinds.length)];
      const K = B.KINDS[kindId];
      const town = B.TOWNS[Math.floor(rng.next() * B.TOWNS.length)];
      const lead = B.leadWeeks[0] +
        Math.floor(rng.next() * (B.leadWeeks[1] - B.leadWeeks[0] + 1));
      const fee = K.fee[0] + Math.round(rng.next() * (K.fee[1] - K.fee[0]));
      board(state).push({
        id: 'bk' + (state.nextBookingId++), kindId, rung: K.rung,
        label: venueLabel(state, kindId, town, (woy + lead) % 48), town,
        week: state.week + lead, expiresWeek: state.week + B.expireWeeks,
        fee, taken: null, flyered: false,
      });
    }
  }

  // ---- taking the stage ------------------------------------------------
  KP.takeBooking = function (state, offerId, groupId, opts) {
    const B = KP.C.BOOK;
    const o = board(state).find(x => x.id === offerId);
    if (!o) return { ok: false, reason: 'That offer is gone.' };
    if (o.taken) return { ok: false, reason: 'Already on the calendar.' };
    if (o.expiresWeek < state.week) return { ok: false, reason: 'They stopped waiting for an answer.' };
    const g = KP.groups(state).find(x => x.id === groupId);
    if (!g || g.retiredWeek) return { ok: false, reason: 'No group to send.' };
    if (g.tour) return { ok: false, reason: 'They are on the road that week.' };
    if (g.hiatus) return { ok: false, reason: 'The room is dark. The gig can wait; the rest cannot.' };
    if (!g.debuted && !g.prep) return { ok: false, reason: 'Book a lineup, not an idea.' };
    if (board(state).some(x => x.taken === g.id && x.week === o.week)) {
      return { ok: false, reason: 'They are already booked that week. One van, one stage.' };
    }
    if (o.fee < 0 && state.budget + o.fee < 0) {
      return { ok: false, reason: 'The venue wants its rental up front, and the account says no.' };
    }
    const flyer = !!(opts && opts.flyer);
    if (flyer) {
      const K = B.KINDS[o.kindId];
      if (!K.flyerable) return { ok: false, reason: 'Flyers won’t fill this one — it fills itself or it doesn’t.' };
      if (o.week <= state.week) return { ok: false, reason: 'No time left to paper the neighborhood.' };
      o.flyered = true;
      g.members.map(id => state.people[id]).filter(Boolean).forEach(m => {
        if (!KP.onBreak(m)) m.fatigue = KP.clamp(m.fatigue + B.flyerFatigue, 0, 100);
      });
      ledger(state).flyered++;
    }
    o.taken = g.id;
    if (o.fee < 0) state.budget += o.fee;   // the rental bills at signing
    KP.note(state, { kind: 'debut', ind: 'gigBooked', priority: 'flavor', groupId: g.id,
      text: g.name + ' is booked: ' + o.label + ', week ' + o.week + '.' +
        (flyer ? ' The members are hand-distributing flyers between practice blocks. Every seat in that room will be earned twice.' : '') +
        (o.fee < 0 ? ' The label pays for the room — the exposure IS the fee.' : ' Fee: ' + o.fee + '.') });
    return { ok: true, offer: o };
  };

  function stageRead(state, g) {
    const ms = g.members.map(id => state.people[id]).filter(Boolean)
      .filter(m => !m.flags.personalHiatus && !m.flags.military && !KP.onBreak(m));
    if (!ms.length) return 0;
    return ms.reduce((s, m) => s + 0.5 * KP.derived(m).liveReliability +
      0.5 * Math.max(m.talents.vocals.cur, m.talents.dance.cur), 0) / ms.length;
  }

  function playGig(state, rng, inbox, o) {
    const B = KP.C.BOOK;
    const F = KP.C.FAME;
    const K = B.KINDS[o.kindId];
    const g = KP.groups(state).find(x => x.id === o.taken);
    const led = ledger(state);
    if (!g || g.retiredWeek || !g.members.length) return;
    const members = g.members.map(id => state.people[id]).filter(Boolean);
    const stage = stageRead(state, g);
    const q = KP.clamp((stage - 30) / 50, 0.25, 1.3) * (o.flyered ? B.flyerBoost : 1);
    if (o.fee > 0) state.budget += o.fee;
    const fans = Math.round((K.fans[0] + rng.next() * (K.fans[1] - K.fans[0])) * q);
    members.forEach(m => {
      if (KP.onBreak(m)) return;
      m.fatigue = KP.clamp(m.fatigue + K.fatigue, 0, 100);
      m.liveExp += K.liveExp || 0;
      m.mediaExp += K.mediaExp || 0;
      if (K.morale) m.morale = KP.clamp(m.morale + K.morale, 0, 100);
      KP.socialSpike(state, m, fans, 'gig-' + o.kindId);
    });
    if (K.pop && g.debuted) g.popularity = KP.clamp((g.popularity || 0) + K.pop * q, 0, 100);
    if (K.fandom && g.fandom) KP.fandomGain(g, K.fandom);
    led.played++;
    led.fees += o.fee;
    led.byRung[o.rung] = (led.byRung[o.rung] || 0) + 1;
    // the campaign takes the stage home with it
    if (g.prep && g.prep.campaign) {
      addMomentum(state, g, KP.C.FAME.MOM.gigByRung[o.rung] || 4);
      g.prep.buildup = (g.prep.buildup || 0) + 1;
    }
    // most gigs are a line in the feed at best; the notable ones write
    // the file
    if (rng.chance(0.45)) {
      inbox.push({ kind: 'debut', ind: 'gigPlayed', priority: 'flavor', groupId: g.id,
        text: g.name + ' played ' + o.label + '. ' + gigLine(rng, o, q) });
    }
    if (led.played === 1) {
      g.history = g.history || [];
      g.history.push({ week: state.week, text: 'First booking ever played: ' + o.label + '.' });
    }
    // the phone-camera lottery — fame does NOT factor. The camera
    // doesn't know who you are; that is the entire point (§76).
    const camChance = B.camBase * (K.viralMult || 1) * (0.5 + stage / 80) *
      (o.flyered ? 1.3 : 1);
    if (rng.chance(camChance)) {
      const face = members.slice().sort((a, b) =>
        KP.derived(b).centerPull - KP.derived(a).centerPull)[0];
      if (face) {
        led.virals++;
        KP.socialSpike(state, face, KP.C.SOCIAL.viralSpike * B.camSpikeMult, 'gigcam');
        face.hype = KP.clamp((face.hype || 0) + B.camHype, 0, 100);
        if (g.prep) {
          g.prep.viralLift = (g.prep.viralLift || 0) + F.camCapLift;
          if (g.prep.campaign) addMomentum(state, g, 8);
        }
        const narNote = KP.recordViral(state, face,
          { kind: 'gigcam', label: 'the phone-shot ' + o.label + ' clip' });
        if (narNote) inbox.push(narNote);
        inbox.push({ kind: 'public', ind: 'gigViral', priority: 'high',
          personId: face.id, groupId: g.id,
          text: 'Somebody filmed ' + KP.displayName(face) + ' at ' + o.label +
            ' on a phone, posted it with a shaky caption, and woke up famous-adjacent: the clip is doing numbers no booking fee could buy. ' +
            g.name + '’s next stage will have people who came ON PURPOSE.' });
        g.history = g.history || [];
        g.history.push({ week: state.week,
          text: 'The ' + o.label + ' phone-cam clip went viral — the small-stage lottery paid.' });
        if (KP.igniteDiscourse) {
          const d = KP.igniteDiscourse(state, rng, 'fancam', 'idol', face.id, g.id);
          if (d) inbox.push(d);
        }
      }
    }
  }
  function gigLine(rng, o, q) {
    if (q >= 1.0) return rng.pick([
      'The room was small and completely theirs by the second song.',
      'Somebody’s grandmother demanded an encore. She got one.',
      'The venue asked for a photo for the wall. That wall is a start.',
      'Full room, real applause — the kind you cannot buy at this size.']);
    if (q >= 0.6) return rng.pick([
      'A polite crowd, two curious phones out by the end. Work.',
      'Half the seats, all of the choreography. The van ride home was quiet but not sad.',
      'The stage was three centimeters high. The performance was not.']);
    return rng.pick([
      'Eleven people, one of whom was the janitor. Every era starts somewhere.',
      'The sound system fought back and nearly won. The members are laughing about it. Mostly.',
      'More staff than audience. The fee cleared, the pride will recover.']);
  }

  // ---- the campaign (E): one push per group-week, momentum with
  // diminishing returns, decay when idle -------------------------------
  function addMomentum(state, g, base) {
    const M = KP.C.FAME.MOM;
    const c = g.prep && g.prep.campaign;
    if (!c) return 0;
    const eff = Math.max(0.35, 1 - c.momentum / M.diminishAt);
    const gain = Math.round(base * eff * 10) / 10;
    c.momentum = Math.min(120, c.momentum + gain);
    return gain;
  }
  KP.momentumWord = function (m) {
    const W = KP.C.FAME.MOM.WORDS;
    let word = W[0][1];
    W.forEach(row => { if (m >= row[0]) word = row[1]; });
    return word;
  };
  KP.campaignPush = function (state, groupId, kindId) {
    const P = KP.C.FAME.PUSHES[kindId];
    if (!P) return { ok: false, reason: 'Nobody on staff knows how to run “' + kindId + '”.' };
    const g = KP.groups(state).find(x => x.id === groupId);
    if (!g || !g.prep) return { ok: false, reason: 'There is no locked release to campaign for.' };
    const c = g.prep.campaign = g.prep.campaign || { momentum: 0, worked: 0 };
    if (c.lastPush === state.week) {
      return { ok: false, reason: 'One push a week. The members are people, not a media plan.' };
    }
    if (P.once && c[kindId + 'Done']) {
      return { ok: false, reason: 'The showcase already happened. A second one is a residency, and nobody is ready for that word.' };
    }
    if (state.budget < P.cost) return { ok: false, reason: 'The account says no.' };
    if (P.needsFame && KP.fameRead(state) < P.needsFame) {
      return { ok: false, reason: 'The radio circuit does not return this label’s calls yet. Get a little more known first.' };
    }
    state.budget -= P.cost;
    const rng = KP.rngFor(state);
    const gain = addMomentum(state, g, P.mom);
    c.worked++; c.lastPush = state.week;
    if (P.once) c[kindId + 'Done'] = true;
    const members = g.members.map(id => state.people[id]).filter(Boolean);
    members.forEach(m => {
      if (KP.onBreak(m)) return;
      m.fatigue = KP.clamp(m.fatigue + P.fatigue, 0, 100);
      if (P.liveExp) m.liveExp += P.liveExp;
      if (P.social) KP.socialSpike(state, m, P.social * (0.7 + rng.next() * 0.6), 'push-' + kindId);
    });
    if (P.fandom && g.fandom) KP.fandomGain(g, P.fandom);
    g.prep.buildup = (g.prep.buildup || 0) + 2;
    ledger(state).pushes++;
    KP.note(state, { kind: 'debut', ind: 'campaignPush', priority: 'flavor', groupId: g.id,
      text: P.label + ' for ' + g.name + ': the era’s word of mouth is now “' +
        KP.momentumWord(c.momentum) + '.”' });
    state.rngState = rng.state();
    return { ok: true, momentum: c.momentum, gain };
  };

  // ---- the week --------------------------------------------------------
  KP.registerWeekly('bookings', 593, function (state, rng, inbox) {
    const led = ledger(state);
    const F = KP.C.FAME;
    // 1) the taken stages play — including a same-week take, whose
    // tick already ran when the player answered the phone (plays on
    // the next one, reported a beat late). Each stage plays ONCE.
    board(state).filter(o => o.taken && !o.played && o.week <= state.week)
      .forEach(o => { o.played = true; playGig(state, rng, inbox, o); });
    // 2) the board sheds what nobody answered and what already played
    state.bookings = board(state).filter(o =>
      (o.taken && !o.played) || (!o.taken && o.expiresWeek >= state.week));
    // 3) campaigns cool when nobody works them
    KP.groups(state).forEach(g => {
      const c = g.prep && g.prep.campaign;
      if (c && c.lastPush !== state.week && c.momentum > 0) {
        c.momentum = Math.max(0, c.momentum - F.MOM.decay);
      }
    });
    // 4) the music shows start returning calls — once, and it's news,
    // but ONLY for a label that was ever actually locked out. A house
    // born famous stamps the date silently: no triumph over a door
    // that was never closed.
    const fl = KP.fameLedger(state);
    if (!fl.showsOpenWeek && KP.showsOpen(state)) {
      if (!fl.everClosed) {
        fl.showsOpenWeek = state.week;
      } else if (KP.groups(state).some(g => (g.debuted || g.prep) && !g.retiredWeek)) {
        fl.showsOpenWeek = state.week;
        inbox.push({ kind: 'industry', ind: 'showsOpen', priority: 'high',
          text: 'The Countdown’s booking desk called US this time. ' + state.company.name +
            ' is big enough for the broadcast circuit now — music-show stages are open. ' +
            'Remember the wedding halls. They were load-bearing.' });
      }
    }
    // 5) the pile deals
    mintOffers(state, rng, inbox);
  });

  // ---- the timeline reacts ---------------------------------------------
  KP.onFeedEvent('gigPlayed', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'the fancafe found the small-stage schedule and treats every gym and fair like a world tour date. attendance: 40. energy: sold-out dome' },
    { persona: 'casual', text: 'saw an actual idol group perform at a local event today?? between a trot singer and a raffle?? they were good. this industry is enormous and mostly invisible' },
    { persona: 'stan', text: 'small-venue era is the best era. front row costs nothing, the members can SEE you, and in three years this footage will be a documentary cold open' },
  ]));
  KP.onFeedEvent('gigViral', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'a shaky phone clip from some regional stage has 40 quote posts on my feed asking WHO IS SHE. the algorithm has spoken and it chose a wedding singer' },
    { persona: 'fan', text: 'the clip everyone is sharing was filmed VERTICALLY at a MALL and it still goes harder than most stage cams. talent does not care about production values' },
    { persona: 'stan', text: 'phone-cam clip blowing up and the fandom-of-12 is holding the door like bouncers. we knew first. the receipts are timestamped' },
    { persona: 'press', text: 'This week’s viral stage was shot on a phone at a venue that seats 300. The broadcast circuit keeps forgetting it does not own the cameras anymore.' },
  ]));
  KP.onFeedEvent('gigBooked', (state, n, rng) => rng.chance(0.4) ? rng.pick([
    { persona: 'fan', text: 'new small-stage date posted. printing the bus schedule. this is what devotion looks like before the arenas: logistics' },
    { persona: 'casual', text: 'a label hand-flyering a theater show in the year of our streaming age is either desperation or romance and honestly it might be both' },
  ]) : null);
  KP.onFeedEvent('campaignPush', (state, n, rng) => rng.chance(0.35) ? rng.pick([
    { persona: 'fan', text: 'the street team was OUT today. flyers, stickers, a sign-up sheet on a clipboard. analog fandom recruitment. it works because it is embarrassing to refuse' },
    { persona: 'casual', text: 'got handed a debut flyer at the station by someone who clearly practiced the pitch. respect the hustle, kept the flyer' },
  ]) : null);
})(typeof window !== 'undefined' ? window : globalThis);
