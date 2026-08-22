/* The network (v0.9.35, §75) — recruitment reshaped. "The board
   should be empty at game start. all of the prospects already exist,
   but you have to choose who you uncover." The board is what your
   NETWORK can see; the network is read live from numbers that already
   exist (ranking score, reputation, age, partnerships, debuted idols)
   — never stored, one truth. Private channels (applications,
   referrals, street casting, your calls) are yours alone: rival
   scouts never see your mail. The public landscape (school leads,
   washouts, season finalists, viral kids) is visible to every desk
   in the city, and arrives contested. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.networkLedger = state.networkLedger ||
      { apps: 0, believers: 0, refs: 0, washouts: 0, viral: 0, seasons: 0,
        finalists: 0, streets: 0, gems: 0, calls: 0, callMinted: 0 };
    return state.networkLedger;
  }
  // channels rival scouts cannot see — your mail is your mail
  KP.CHANNEL_PRIVATE = { application: 1, referral: 1, street: 1, audition: 1 };

  // ---- the network read: what share of the landscape this desk sees ----
  KP.networkRead = function (state) {
    const me = KP.powerRankingNow(state).find(r => r.isPlayer);
    const rep = Math.max.apply(null, Object.values(state.company.reputation || { a: 25 }));
    const partners = (state.schools || []).filter(s => (s.partnerUntil || 0) > state.week).length;
    const idols = state.roster.filter(id =>
      (state.people[id] || {}).status === 'idol').length;
    // calibrated at the doors (v0.9.35 first measurement): blank ~0.12,
    // fresh ~0.14, the inheritance ~0.44, the major ~0.65 — and every
    // term is a lever the player already plays
    return KP.clamp(
      (me ? me.score : 0) / 320 + rep / 400 + Math.min(1, state.week / 480) * 0.10 +
      partners * 0.06 + Math.min(0.10, idols * 0.015), 0.05, 1);
  };
  KP.networkWord = function (net) {
    return net >= 0.7 ? 'the whole landscape answers this desk'
      : net >= 0.45 ? 'a wide, working network'
      : net >= 0.22 ? 'a modest network — the desk sees a corner of the landscape'
      : 'almost no network — applicants, shoe leather, and whatever the public can see';
  };

  // ---- minting helpers --------------------------------------------------
  function mint(state, rng, opts) {
    KP.resetIds(state.nextPersonId || KP.peekNextId());
    const usedNames = new Set(Object.values(state.people).map(x => x.name.given.toLowerCase()));
    const wantBoys = (KP.openMandates ? KP.openMandates(state) : []).some(m =>
      m.kind !== 'solo' && (m.gender === 'm' || (!m.gender &&
        !KP.groups(state).some(g => g.debuted && !g.retiredWeek && g.gender === 'm'))));
    const gender = opts.gender || (rng.chance(wantBoys ? KP.C.GEN.maleCastingShare
      : KP.C.GEN.maleLeadShare) ? 'm' : 'f');
    const p = KP.generatePerson(rng, { status: 'prospect', usedNames, gender,
      source: opts.source, age: opts.age });
    p.channel = opts.channel;
    if (opts.observations != null) {
      // a pre-observed arrival (referral, washout) comes WITH its dated
      // report — somebody already did the look, and the tape exists
      p.observations = opts.observations;
      KP.takeReads(state, p);
    }
    state.people[p.id] = p;
    state.prospects.push(p.id);
    KP.socialOf(state, p);
    state.nextPersonId = KP.peekNextId();
    return p;
  }
  function full(state) {
    return (state.prospects || []).length >= KP.C.NETWORK.boardCap;
  }

  // ---- the weekly: the channels deliver (order 618) ---------------------
  KP.registerWeekly('network', 618, function (state, rng, inbox) {
    const N = KP.C.NETWORK;
    const led = ledger(state);
    const net = KP.networkRead(state);

    // applications: the pile scales with the name — and spikes on a hit
    if (!full(state)) {
      const hot = KP.groups(state).some(g => (g.releases || []).some(r =>
        state.week - r.week <= N.APP.hitWindow && (r.reception || 0) >= 70));
      // the staff (v0.10.6): the head scout's reach moves who finds this
      // building at all
      const chance = KP.clamp((N.APP.base + net * N.APP.perNetwork) * (hot ? N.APP.hitSpike : 1) *
        (KP.seatMult ? KP.seatMult(state, 'scout') : 1), 0, 0.9);
      if (rng.chance(chance)) {
        const p = mint(state, rng, { channel: 'application', source: 'Applicant' });
        led.apps++;
        const believer = (state.founded || state.door === 'fresh') && rng.chance(N.APP.believerChance);
        if (believer) led.believers++;
        inbox.push({ kind: 'scouting', priority: 'flavor', personId: p.id,
          text: believer
            ? KP.fillPro('An application with a handwritten cover page: ' + KP.displayName(p) + ', ' + p.age + ', who wrote three paragraphs about THIS company — the story, the group, the reason {she} did not send this envelope to the big three first. Believers audition differently. The file is on the board, and nobody else has seen it.', p)
            : 'An application landed on the desk: ' + KP.displayName(p) + ', ' + p.age + ', tape and photos enclosed. The pile is where careers start when nobody is looking. The file is on the board — yours alone, until a signature makes it news.' });
      }
    }

    // referrals: the building knows people — half-read on arrival
    if (!full(state)) {
      const chance = N.REF.base + state.roster.length * N.REF.perRoster;
      if (rng.chance(chance)) {
        const p = mint(state, rng, { channel: 'referral', source: 'Referral',
          observations: N.REF.observations });
        led.refs++;
        const coach = (KP.staffOf(state).coach || {}).name || 'the vocal coach';
        const idols = state.roster.map(id => state.people[id]).filter(x => x && x.status === 'idol');
        const voucher = idols.length && rng.chance(0.5) ? KP.displayName(rng.pick(idols)) : coach;
        inbox.push({ kind: 'scouting', priority: 'flavor', personId: p.id,
          text: KP.fillPro(voucher + ' brought a name to the desk: ' + KP.displayName(p) + ', ' + p.age + ' — “watched {her} for a year, you should see this.” A referral arrives half-read: somebody you trust already did the first look. The file is on the board, and it is not on anyone else’s.', p) });
      }
    }

    // washouts: the big programs cut people every season — the public sees
    if (!full(state) && rng.chance(N.WASH.mintChance)) {
      const p = mint(state, rng, { channel: 'washout', source: 'Program washout',
        age: rng.int(N.WASH.ageMin, N.WASH.ageMax), observations: 2 });
      ['vocals', 'dance'].forEach(d => {
        p.talents[d].cur = Math.min(p.talents[d].ceilLo - 1,
          p.talents[d].cur + N.WASH.polishBump);
      });
      led.washouts++;
      p.history.push({ week: state.week, text: 'Cut from a major program after years of training. The polish is real. So is the file that says somebody else passed first.' });
      inbox.push({ kind: 'scouting', priority: 'flavor', personId: p.id,
        text: KP.fillPro(KP.displayName(p) + ', ' + p.age + ', is on the open board — a washout from one of the big programs. Years of training, real polish, and a file every desk in the city can read: somebody passed on {her} once. The overlooked are how small companies get made.', p) });
    }

    // social media: the viral kid every desk sees the same morning
    if (!full(state) && rng.chance(N.SOCIAL.chance)) {
      const p = mint(state, rng, { channel: 'social', source: 'Social media' });
      p.hype = rng.int(N.SOCIAL.hype[0], N.SOCIAL.hype[1]);
      led.viral++;
      const r0 = state.rivals[Math.floor(KP.hash01([state.seed, p.id, 'sniff'].join('|')) * state.rivals.length)];
      if (r0) r0.interest[p.id] = 1;
      inbox.push({ kind: 'scouting', priority: 'flavor', personId: p.id,
        text: KP.fillPro('A clip went around last night: ' + KP.displayName(p) + ', ' + p.age + ', dancing in a practice-room mirror somewhere, and the internet did what it does. Every scout in the city has the same tab open this morning. Public means CONTESTED — the file is on the board, and the clock started before you saw it.', p) });
    }

    // the season: an annual competition show airs, and the ones who
    // did not make the final lineup land on the public board LOUD
    const woy = ((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1;
    const yr = Math.ceil(state.week / KP.C.WEEKS_PER_YEAR);
    if (woy === N.SHOW.finaleWoy && (state.seasonYear || 0) < yr) {
      state.seasonYear = yr;
      led.seasons++;
      const show = N.SHOW.NAMES[Math.floor(KP.hash01([state.seed, 'season', yr].join('|')) * N.SHOW.NAMES.length)];
      const n = rng.int(N.SHOW.minted[0], N.SHOW.minted[1]);
      const names = [];
      for (let i = 0; i < n; i++) {   // the finale airs whether your board has room or not
        const p = mint(state, rng, { channel: 'showKid', source: show + ' finalist' });
        p.hype = rng.int(N.SHOW.hype[0], N.SHOW.hype[1]);
        KP.socialSpike(state, p, rng.int(N.SHOW.followers[0], N.SHOW.followers[1]), 'season');
        (state.rivals || []).slice(0, 2).forEach(r => { r.interest[p.id] = 2; });
        p.history.push({ week: state.week, text: 'Made the ' + show + ' finale and missed the debut lineup by one televised vote. The fandom that voted has not logged off.' });
        led.finalists++;
        names.push(KP.displayName(p));
      }
      if (names.length) {
        inbox.push({ kind: 'scouting', ind: 'seasonFinale', priority: 'high',
          text: 'The ' + show + ' finale aired last night, and this morning the industry’s favorite market opened: the finalists who did NOT make the lineup. ' + names.join(', ') + ' — televised training, fandoms with receipts, and every company in the scene running the same math. Public, contested, and worth it.' });
      }
    }
  });

  // ---- street casting: shoe leather, not reputation ---------------------
  KP.streetCast = function (state) {
    const S = KP.C.NETWORK.STREET;
    if (state.week - (state.streetCastWeek || -999) < S.cooldownWeeks) {
      return { ok: false, reason: 'The scouts walked the districts recently. Give the city ' + (S.cooldownWeeks - (state.week - state.streetCastWeek)) + ' more week(s) to change.' };
    }
    if (state.budget < S.cost) return { ok: false, reason: 'Even shoe leather costs ' + S.cost + '. The budget says stay in.' };
    if (full(state)) return { ok: false, reason: 'The board is full. Sign somebody or let the reports age out first.' };
    state.budget -= S.cost;
    state.streetCastWeek = state.week;
    const rng = KP.rngFor(state);
    const led = ledger(state);
    led.streets++;
    const n = rng.int(S.minted[0], S.minted[1]);
    const names = [];
    for (let i = 0; i < n; i++) {
      const p = mintPublicless(state, rng);
      if (rng.chance(S.gemChance)) {
        KP.C.TALENTS.forEach(d => {
          p.talents[d].ceilLo = Math.min(100, p.talents[d].ceilLo + S.gemBump);
          p.talents[d].ceilHi = Math.min(100, p.talents[d].ceilHi + S.gemBump);
        });
        led.gems++;
      }
      names.push(KP.displayName(p));
    }
    state.rngState = rng.state();
    const note = KP.note(state, { kind: 'scouting',
      text: 'Street casting run: the scouts worked the districts with a stack of cards and an eye for the way somebody moves through a crowd. ' + names.join(', ') + ' took a card. Wide variance, honest fog — and every so often the districts hand you the one everybody else walked past.' });
    return { ok: true, minted: n, note: note.text };

    function mintPublicless(state2, rng2) {
      return mint(state2, rng2, { channel: 'street', source: 'Street casting' });
    }
  };

  // ---- the open call: turnout scales with the name ----------------------
  KP.holdOpenCall = function (state) {
    const C = KP.C.NETWORK.CALL;
    if (state.week - (state.openCallWeek || -999) < C.cooldownWeeks) {
      return { ok: false, reason: 'The last open call is still a recent memory. The next one lands after week ' + (state.openCallWeek + C.cooldownWeeks) + '.' };
    }
    if (state.budget < C.cost) return { ok: false, reason: 'An open call runs ' + C.cost + ' — the room, the judges, the tape. The budget says not yet.' };
    if (full(state)) return { ok: false, reason: 'The board is full. An open call with nowhere to put the tape is a party.' };
    state.budget -= C.cost;
    state.openCallWeek = state.week;
    const rng = KP.rngFor(state);
    const net = KP.networkRead(state);
    const n = C.baseMinted + Math.floor(net * C.perNetwork);
    const led = ledger(state);
    led.calls++;
    const names = [];
    for (let i = 0; i < n; i++) {
      const p = mint(state, rng, { channel: 'audition', source: 'Open call' });
      led.callMinted++;
      names.push(KP.displayName(p));
    }
    state.rngState = rng.state();
    const big = net >= 0.45;
    const note = KP.note(state, { kind: 'scouting', ind: 'openCall', priority: 'high',
      text: big
        ? 'The open call was an EVENT — the line bent around the block, the sign-in sheets ran out, and the judges worked until the building closed. ' + n + ' callbacks made the board: ' + names.join(', ') + '. This is what a name is for.'
        : 'The open call ran in a rented room with folding chairs and a hand-lettered sign. ' + n + ' sign-ups made the tape: ' + names.join(', ') + '. Small turnout, honest room — and every major started with one exactly like it.' });
    return { ok: true, minted: n, note: note.text };
  };

  // ---- the timeline reacts ---------------------------------------------
  KP.onFeedEvent('seasonFinale', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'the finale robbed my kid AGAIN. she trained on national television for four months and missed the lineup by ONE vote. some company better sign her by friday or the internet riots' },
    { persona: 'casual', text: 'survival show finales are just a draft combine with crying. the ones who don’t make it are all signed within a month anyway. the show is the audition' },
  ]));
  KP.onFeedEvent('openCall', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'open call day: the line outside had umbrellas, thermoses, and three parents doing vocal warmups on their kids. futures form in lines like that' },
    { persona: 'fan', text: 'somebody in that open call line today is going to be somebody’s bias in three years. that is just statistics. good luck everyone' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
