/* The staff (v0.10.6, §79) — the second fog. Six seats quietly
   multiply the systems they run: coaches move training, the
   performance director moves the stage, the scout moves who finds
   this building, A&R moves what the producers pitch, marketing moves
   what a push buys. The TRUTH — an aptitude and a style, hash-stable
   per person — never surfaces: no stat sheet, no reveal moment, no
   number in any blurb, ever. The player reads three crooked surfaces:
   personality (true, and not skill), the résumé (true facts,
   selection-biased — it says where somebody was, never what they did
   there), and reputation (the PRICE, imperfectly correlated with
   truth by construction: some names ride one misattributed credit;
   some unknowns are the genius nobody caught). Mesh — the style
   against YOUR setup — is discoverable only by working together, and
   the notes hint at friction in prose long before any number would.
   Firing a genius because the kids were weak is the tragedy; keeping
   a dud because the name reassures the board is the trap. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.staffLedger2 = state.staffLedger2 ||
      { candidates: 0, hires: 0, passes: 0, repRises: 0, poachCalls: 0,
        raises: 0, walked: 0, notes: 0, meshNotes: 0 };
    return state.staffLedger2;
  }
  KP.hiresLedger = ledger;

  // ---- the people ------------------------------------------------------
  const FAM = ['Baek', 'Cha', 'Im', 'Joo', 'Gil', 'Weon', 'Pyo', 'Sa', 'Byun', 'Ma'];
  const GIV = ['Ki-tae', 'Seon-mi', 'Do-hwan', 'Yeo-reum', 'Sang-cheol', 'In-na',
    'Moo-young', 'Ha-eun', 'Chul-soo', 'Bo-ra'];
  const STYLES = ['drillmaster', 'nurturer', 'bigMachine', 'scrappy', 'classicist', 'trendChaser'];
  const STYLE_WORD = {
    drillmaster: 'counts in eights and forgives nothing before noon',
    nurturer: 'learns every trainee’s coffee order before their range',
    bigMachine: 'talks in quarters and org charts — built for a floor of departments',
    scrappy: 'has done every job in this industry with two hands and no budget',
    classicist: 'believes the fundamentals are the trend that never left',
    trendChaser: 'quotes this week’s numbers like scripture and last year’s never happened',
  };
  const HOUSES = ['a top-three house', 'a mid-tier label', 'a one-room agency',
    'an overseas branch office', 'a broadcaster’s production arm', 'a management boutique'];
  const ERAS = ['a famous era', 'a rebuilding stretch', 'two debuts back to back',
    'one long tour cycle', 'a quiet catalog period', 'an era everyone remembers'];

  function h(state, sid, key) { return KP.hash01([state.seed, 'hires', sid, key].join('|')); }

  function mintCandidate(state, seatId, tier, salt) {
    const sid = 'sf' + state.week + '_' + salt;
    const HR = KP.C.HIRES;
    const name = FAM[Math.floor(h(state, sid, 'f') * FAM.length)] + ' ' +
      GIV[Math.floor(h(state, sid, 'g') * GIV.length)];
    const knownFor = h(state, sid, 'kfm') < HR.knownForMatch
      ? null   // null = the tag matches the true best seat (resolved in truth)
      : HR.SEATS[Math.floor(h(state, sid, 'kf') * HR.SEATS.length)].id;
    const years = 2 + Math.floor(h(state, sid, 'yr') * 12);
    const resume = [
      years + ' years in, most recently at ' + HOUSES[Math.floor(h(state, sid, 'h1') * HOUSES.length)],
      'was in the room for ' + ERAS[Math.floor(h(state, sid, 'e1') * ERAS.length)],
    ];
    return { id: sid, name, seatId, tier, knownForTag: knownFor, resume,
      style: STYLES[Math.floor(h(state, sid, 'st') * STYLES.length)],
      warmth: Math.round(h(state, sid, 'pw') * 100),
      candor: Math.round(h(state, sid, 'pc') * 100) };
  }

  // ---- the truth: computed, never stored, never printed ----------------
  KP.staffTruth = function (state, st) {
    const HR = KP.C.HIRES;
    const base = h(state, st.id, 'apt');
    const gem = st.tier === 'unknown' && h(state, st.id, 'gem') < HR.gemChance;
    const bestSeat = HR.SEATS[Math.floor(h(state, st.id, 'best') * HR.SEATS.length)].id;
    let apt = gem ? 0.72 + base * 0.28
      : KP.clamp(HR.tierFloor[st.tier] + base * HR.tierSpan, 0, 1);
    if (st.seatId !== bestSeat) apt *= HR.offSeatDamp;
    return { apt, bestSeat };
  };
  function meshOf(state, st) {
    const HR = KP.C.HIRES;
    const groups = KP.groups(state).filter(g => g.debuted);
    const big = groups.length >= 3;
    const roster = state.roster.map(id => state.people[id]).filter(Boolean);
    const disciplined = roster.length &&
      roster.reduce((s, p) => s + p.personality.professionalism, 0) / roster.length >= 55;
    const identity = KP.groups(state).some(g => (g.conceptRun || 0) >= 2);
    const fits =
      st.style === 'bigMachine' ? big :
      st.style === 'scrappy' ? !big :
      st.style === 'drillmaster' ? disciplined :
      st.style === 'nurturer' ? !disciplined :
      st.style === 'classicist' ? identity : !identity;
    return fits ? HR.meshSpan : -HR.meshSpan;
  }
  // the ONLY read the rest of the engine takes — a bare multiplier,
  // consumed silently at each seat's system
  KP.seatMult = function (state, seatId) {
    if (!seatId) return 1;
    const st = (state.seats || {})[seatId];
    if (!st) return 1;
    const HR = KP.C.HIRES;
    const t = KP.staffTruth(state, st);
    return KP.clamp(HR.multLo + t.apt * (HR.multHi - HR.multLo) + meshOf(state, st), 0.85, 1.18);
  };

  // ---- the founding hires: the incumbent trio become somebody ----------
  function seats(state) {
    if (!state.seats) {
      state.seats = {};
      const legacy = KP.staffOf(state);
      const mk = (seatId, name) => {
        const sid = 'sf0_' + seatId;
        state.seats[seatId] = { id: sid, name, seatId, tier: 'working',
          knownForTag: null, since: 1, style: STYLES[Math.floor(h(state, sid, 'st') * STYLES.length)],
          warmth: Math.round(h(state, sid, 'pw') * 100),
          candor: Math.round(h(state, sid, 'pc') * 100),
          resume: ['here since the beginning — the résumé is this company'] };
      };
      mk('vocal', (legacy.coach && legacy.coach.name) || 'Coach Baek');
      mk('dance', 'Coach ' + FAM[Math.floor(h(state, 'seed-dance', 'f') * FAM.length)]);
      mk('perf', 'Director Cha');
      mk('scout', 'Scout Im');
      // A&R and marketing start EMPTY — the first hires the fog invites
    }
    return state.seats;
  }
  KP.staffSeats = seats;

  // ---- the interview: personality only, zero skill signal --------------
  KP.registerScene('theInterview', {
    title: (state, sc) => sc.cand.name + ' · the interview',
    body: (state, sc) => {
      const HR = KP.C.HIRES;
      const c = sc.cand;
      const seat = HR.SEATS.find(x => x.id === c.seatId);
      return 'The ' + seat.label + ' chair needs filling and ' + c.name + ' took the meeting. ' +
        'The read across the table: ' + (c.warmth >= 50 ? 'warm, easy in the room' : 'reserved, hard to warm') +
        ', ' + (c.candor >= 50 ? 'answers straight even when it costs' : 'answers carefully, edges sanded') +
        ' — and by every account, ' + STYLE_WORD[c.style] + '. ' +
        'The résumé: ' + c.resume.join('; ') + '. ' +
        'The industry file: ' + c.tier + (c.knownForTag ? ', known for ' +
          (HR.SEATS.find(x => x.id === c.knownForTag) || seat).label + ' work' : '') +
        '. The fee is ' + HR.hireCost[c.tier] + '. The résumé says where they were. It does not say what they did there.';
    },
    options: (state, sc) => [
      { id: 'hire', label: 'Hire · ' + KP.C.HIRES.hireCost[sc.cand.tier] },
      { id: 'pass', label: 'Pass' },
    ],
    resolve: (state, sc, optionId) => {
      const HR = KP.C.HIRES;
      const led = ledger(state);
      if (optionId !== 'hire') {
        led.passes++;
        return { toast: 'Passed. The chair stays as it was; the meeting stays a meeting.' };
      }
      const cost = HR.hireCost[sc.cand.tier];
      if (state.budget < cost) { led.passes++; return { toast: 'The fee outran the account. The candidate’s agent stopped returning calls.' }; }
      state.budget -= cost;
      if (KP.ledgerFlow) KP.ledgerFlow(state, 'signings', -cost);
      const prev = seats(state)[sc.cand.seatId];
      seats(state)[sc.cand.seatId] = Object.assign({}, sc.cand, { since: state.week });
      led.hires++;
      KP.note(state, { kind: 'company', ind: 'seatFilled', priority: 'high',
        text: sc.cand.name + ' signs on as ' + HR.SEATS.find(x => x.id === sc.cand.seatId).label +
          (prev ? ', taking the chair from ' + prev.name + ' — the building notices chairs' : '') +
          '. What the hire actually is, only the months will say: the results arrive tangled with everything else, which is the whole job of judging them.' });
      return { toast: 'Hired. Now comes the only interview that counts: the next year.' };
    },
    expire: (state, sc) => { ledger(state).passes++; return null; },
  });

  // ---- the poach: your results made them famous -------------------------
  KP.registerScene('seatPoach', {
    title: (state, sc) => {
      const st = (state.seats || {})[sc.seatId];
      return (st ? st.name : 'The chair') + ' · the offer from outside';
    },
    body: (state, sc) => {
      const st = (state.seats || {})[sc.seatId];
      const seat = KP.C.HIRES.SEATS.find(x => x.id === sc.seatId);
      return (st ? st.name : 'Your ' + seat.label) + ' got the call — ' + sc.rivalName +
        ', better title, real money. This is what happens when the results carry a name: the industry ' +
        'reads your credits and hires your people. A raise keeps the chair (' + KP.C.HIRES.raiseCost +
        '); pride keeps nothing.';
    },
    options: () => [
      { id: 'raise', label: 'Match it · ' + KP.C.HIRES.raiseCost },
      { id: 'walk', label: 'Wish them well' },
    ],
    resolve: (state, sc, optionId) => {
      const led = ledger(state);
      const st = (state.seats || {})[sc.seatId];
      if (!st) return { toast: 'The chair had already emptied.' };
      if (optionId === 'raise' && state.budget >= KP.C.HIRES.raiseCost) {
        state.budget -= KP.C.HIRES.raiseCost;
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'signings', -KP.C.HIRES.raiseCost);
        led.raises++;
        return { toast: st.name + ' stays. The raise is real; so is the fact they took the meeting.' };
      }
      led.walked++;
      delete state.seats[sc.seatId];
      KP.note(state, { kind: 'company', ind: 'seatWalked', priority: 'high',
        text: st.name + ' goes to ' + sc.rivalName + ' with a leaving speech that thanks everyone and a start date that says everything. The chair is open, and whether that is a loss or a mercy is exactly the thing nobody will ever know for certain.' });
      return { toast: 'The chair is open. The industry hires from the schools it respects — that is the compliment and the bill.' };
    },
    expire: (state, sc) => {
      // an unanswered offer answers itself
      const st = (state.seats || {})[sc.seatId];
      if (st) { ledger(state).walked++; delete state.seats[sc.seatId]; }
      return null;
    },
  });

  // ---- the week ----------------------------------------------------------
  KP.registerWeekly('hires', 791, function (state, rng, inbox) {
    const HR = KP.C.HIRES;
    const led = ledger(state);
    const S = seats(state);
    // a candidate takes the meeting — rep gated by the fame read
    if (!(state.scenes || []).some(sc => sc.kind === 'theInterview') &&
        rng.chance(HR.candidateChance)) {
      const fame = KP.fameRead ? KP.fameRead(state) : 0.5;
      const open = HR.SEATS.filter(x => !S[x.id]);
      const pool = open.length && rng.chance(0.7) ? open
        : HR.SEATS.filter(x => !S[x.id] || state.week - (S[x.id].since || 0) > 30);
      if (pool.length) {
        const seat = pool[rng.int(0, pool.length - 1)];
        const tiers = ['unknown', 'working'];
        if (fame >= HR.fameForKnown) tiers.push('known');
        if (fame >= HR.fameForName) tiers.push('a name');
        const cand = mintCandidate(state, seat.id, tiers[rng.int(0, tiers.length - 1)], rng.int(0, 9999));
        led.candidates++;
        KP.openScene(state, { kind: 'theInterview', cand, expiresWeek: state.week + 2 });
        inbox.push({ kind: 'company', ind: 'interviewSet', priority: 'high',
          text: cand.name + ' is in the building about the ' + seat.label + ' chair — ' + cand.tier +
            ' by the industry’s file, priced accordingly. The interview will tell you who they are. It will tell you nothing about how good they are. That part costs a year.' });
      }
    }
    // staff notes: their voice, personality-true, skill-ambiguous
    Object.keys(S).forEach(seatId => {
      const st = S[seatId];
      if (!st) return;
      if (rng.chance(HR.noteChance)) {
        led.notes++;
        const seat = HR.SEATS.find(x => x.id === seatId);
        inbox.push({ kind: 'company', ind: 'staffNote', priority: 'flavor',
          text: st.name + ' (' + seat.label + '), in this week’s notes: “' +
            (st.candor >= 50
              ? rng.pick(['The room is behind where I want it. That may be the room, or it may be me — the work will say.',
                  'Two of the kids turned a corner this week. I would love to claim it. The honest note is: unclear.',
                  'What we are doing is either about to work or about to be obvious. I have been wrong in both directions.'])
              : rng.pick(['Progress on schedule. Details in the file.',
                  'The week went as weeks go. Nothing to escalate.',
                  'Some promising signs. I would rather show you than say it.'])) + '”' });
      }
      // mesh friction reaches the notes long before any number would
      const mesh = meshOf(state, st);
      if (mesh < 0 && state.week - (st.since || 0) >= HR.meshNoteAfter &&
          !st.meshNoted && rng.chance(0.15)) {
        st.meshNoted = 1;
        led.meshNotes++;
        inbox.push({ kind: 'company', ind: 'meshFriction', priority: 'high',
          text: 'Corridor read on ' + st.name + ': the method and the building keep missing each other — ' +
            STYLE_WORD[st.style] + ', and this is not that kind of house right now. Nobody doubts the work. Several people doubt the fit. Whether the difference matters is the ' + (state.week - st.since) + '-week question with no clean answer.' });
      }
    });
    // your results build their names — and the industry reads credits
    KP.groups(state).forEach(g => {
      if (!g.results || g.results.week !== state.week - 1) return;
      if ((g.results.reception || 0) < HR.repRiseAt) return;
      Object.keys(S).forEach(seatId => {
        const st = S[seatId];
        if (!st || st.tier === 'a name' || !rng.chance(HR.repRiseChance)) return;
        const tiers = HR.REP_TIERS;
        st.tier = tiers[Math.min(tiers.length - 1, tiers.indexOf(st.tier) + 1)];
        led.repRises++;
        if (tiers.indexOf(st.tier) >= HR.poachTierMin) {
          inbox.push({ kind: 'company', ind: 'staffRepRise', priority: 'flavor',
            text: 'The trades’ credits column mentions ' + st.name + ' by name this cycle. Reputations are built out of results the industry can see — accurately or not — and phones start ringing either way.' });
        }
      });
    });
    // the poach call
    if (!(state.scenes || []).some(sc => sc.kind === 'seatPoach') &&
        state.week > (state.seatPoachQuiet || 0)) {
      const target = Object.keys(S).find(seatId => S[seatId] &&
        KP.C.HIRES.REP_TIERS.indexOf(S[seatId].tier) >= HR.poachTierMin);
      if (target && rng.chance(HR.poachChance)) {
        state.seatPoachQuiet = state.week + HR.poachCooldown;
        led.poachCalls++;
        const rival = (state.rivals || [])[rng.int(0, Math.max(0, (state.rivals || []).length - 1))];
        KP.openScene(state, { kind: 'seatPoach', seatId: target,
          rivalName: rival ? rival.name : 'a rival house', expiresWeek: state.week + 2 });
      }
    }
  });

  // ---- the timeline reacts ----------------------------------------------
  KP.onFeedEvent('seatFilled', (state, n, rng) => rng.chance(0.4) ? rng.pick([
    { persona: 'fan', text: 'new staff announcement. the fandom has already found their old work, formed two opposing theories, and scheduled the argument for release week' },
    { persona: 'casual', text: 'staff hires are the industry’s deepest bets and shallowest press releases. check back in a year for the actual news' },
  ]) : null);
  KP.onFeedEvent('seatWalked', (state, n, rng) => rng.pick([
    { persona: 'press', text: 'Another staff departure up the food chain — the industry’s oldest compliment. Companies that develop people become the schools everyone hires from, tuition unpaid.' },
    { persona: 'fan', text: 'the staff leaving post has 40 quote-posts arguing whether this is fine. it is either completely fine or the beginning of the end. no in between. it was probably fine' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
