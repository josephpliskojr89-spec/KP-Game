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
    // the help wanted (v0.10.11) — fields added post-ship, healed lazily
    if (state.staffLedger2.searches == null) {
      state.staffLedger2.searches = 0;
      state.staffLedger2.fired = 0;
    }
    // the market remembers (v0.11.5, §96 wiring) — healed lazily
    if (!state.staffLedger2.passed) state.staffLedger2.passed = [];
    return state.staffLedger2;
  }
  KP.hiresLedger = ledger;
  // a name the desk passed on stays in the market's memory for a season,
  // capped; the weekly reads it back when one of them takes a chair
  function rememberPass(state, cand) {
    const HR = KP.C.HIRES;
    const led = ledger(state);
    if (!cand || !cand.name) return;
    led.passed.push({ name: cand.name, seatId: cand.seatId, week: state.week });
    if (led.passed.length > HR.passMemoryCap) led.passed = led.passed.slice(-HR.passMemoryCap);
  }

  // the records a studio chair has made for THIS house: the ones that landed after they sat down in it (v0.11.40,
  // §132). An old file may hold a chair that came across at a founding with records made for the house it left,
  // and a record that landed the very week a chair was taken landed before it was
  KP.seatMade = function (st) { return (st.works || []).filter(w => !(w.week <= st.since)); };

  // ---- the second chair (v0.10.39, §91 B2): a second studio chair opens
  // only when the first has records to show — a building earns depth
  KP.chairOpenable = function (state, seatId) {
    const HR = KP.C.HIRES;
    const seat = HR.SEATS.find(x => x.id === seatId);
    if (!seat) return false;
    if (!seat.second) return true;
    const first = (state.seats || {})[seat.second];
    return !!(first && KP.seatMade(first).length >= HR.secondChairAfter);
  };
  KP.chairOpenReason = function (state, seatId) {
    const HR = KP.C.HIRES;
    const seat = HR.SEATS.find(x => x.id === seatId);
    if (!seat || !seat.second) return null;
    const firstDef = HR.SEATS.find(x => x.id === seat.second);
    const first = (state.seats || {})[seat.second];
    return !first
      ? 'A second chair opens when the first ' + firstDef.label + ' has records to show. The first chair is empty.'
      : 'A second chair opens when ' + first.name + ' has ' + HR.secondChairAfter + ' records for this house — ' +
        (KP.seatMade(first).length || 'none') + ' so far.';
  };

  // ---- the help wanted (v0.10.11): act on the market ---------------------
  KP.openSearch = function (state, seatId) {
    const HR = KP.C.HIRES;
    const seat = HR.SEATS.find(x => x.id === seatId);
    if (!seat) return { ok: false, reason: 'No such chair in this building.' };
    if (!KP.chairOpenable(state, seatId)) return { ok: false, reason: KP.chairOpenReason(state, seatId) };
    if (state.staffSearch) return { ok: false, reason: 'One search at a time — the industry reads a company posting two as a company on fire.' };
    if ((state.scenes || []).some(sc => sc.kind === 'theInterview')) {
      return { ok: false, reason: 'A candidate is already in the building. Finish that meeting first.' };
    }
    state.seatSearchCooldowns = state.seatSearchCooldowns || {};
    if (state.week - (state.seatSearchCooldowns[seatId] || -999) < HR.searchCooldown) {
      return { ok: false, reason: 'The posting for that chair is still warm. The market noticed the first one.' };
    }
    if (state.budget < HR.searchCost) return { ok: false, reason: 'Recruiters bill up front — ' + HR.searchCost + '.' };
    state.budget -= HR.searchCost;
    if (KP.ledgerFlow) KP.ledgerFlow(state, 'signings', -HR.searchCost);
    state.staffSearch = { seatId, week: state.week };
    state.seatSearchCooldowns[seatId] = state.week;
    ledger(state).searches++;
    KP.note(state, { kind: 'company', ind: 'searchPosted', priority: 'flavor',
      text: 'The posting goes up for the ' + seat.label + ' chair — through the recruiters, the industry boards, and the version of the industry that is three group chats. Somebody will take the meeting within the week. Who shows up is the market’s answer to what this company currently looks like from outside.' });
    return { ok: true };
  };

  KP.releaseSeat = function (state, seatId) {
    const HR = KP.C.HIRES;
    const S = seats(state);
    const st = S[seatId];
    const seat = HR.SEATS.find(x => x.id === seatId);
    if (!seat) return { ok: false, reason: 'No such chair in this building.' };
    if (!st) return { ok: false, reason: 'The chair is already open.' };
    const severance = Math.max(HR.severanceMin,
      Math.round((HR.hireCost[st.tier] || HR.hireCost.working) * HR.severanceMult));
    if (state.budget < severance) return { ok: false, reason: 'The severance is ' + severance + ' and the account cannot cover a clean goodbye. An unclean one is not on the menu.' };
    state.budget -= severance;
    if (KP.ledgerFlow) KP.ledgerFlow(state, 'signings', -severance);
    delete S[seatId];
    if (state.scenes) state.scenes = state.scenes.filter(sc =>
      !(sc.kind === 'seatPoach' && sc.seatId === seatId));
    const led = ledger(state);
    led.fired++;
    // letting a name the trades know go raises boardroom eyebrows
    if (HR.REP_TIERS.indexOf(st.tier) >= HR.fireTrustTierMin) {
      state.trust = KP.clamp(state.trust - 1, 0, 100);
    }
    KP.note(state, { kind: 'company', ind: 'seatReleased', priority: 'high',
      text: st.name + ' and the company part ways — the ' + seat.label + ' chair is open, the severance is paid, and the building spends a week discussing it in doorways. Here is the part nobody will ever resolve: if the results turn around now, it proves you right; if they don’t, it proves nothing, because everything else changed too. Firing into the fog is still firing.' });
    return { ok: true, severance };
  };

  // ---- the people ------------------------------------------------------
  const FAM = ['Baek', 'Cha', 'Im', 'Joo', 'Gil', 'Weon', 'Pyo', 'Sa', 'Byun', 'Ma'];
  const GIV = ['Ki-tae', 'Seon-mi', 'Do-hwan', 'Yeo-reum', 'Sang-cheol', 'In-na',
    'Moo-young', 'Ha-eun', 'Chul-soo', 'Bo-ra'];
  const STYLES = ['drillmaster', 'nurturer', 'bigMachine', 'scrappy', 'classicist', 'trendChaser'];
  // the building directory (v0.10.15): ONE truth for how a staff file
  // reads — the interview and the card speak the same sentences
  KP.staffFileRead = function (st) {
    return {
      warmth: st.warmth >= 50 ? 'warm, easy in the room' : 'reserved, hard to warm',
      candor: st.candor >= 50 ? 'answers straight even when it costs' : 'answers carefully, edges sanded',
      style: STYLE_WORD[st.style] || '',
    };
  };

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

  // the truth, minted once (v0.11.8, §99): the hidden aptitude used to be
  // derived from the hash every time it was read; when the hash gained its
  // avalanche the derivation would have re-rolled every chair in every save,
  // so a truth is stamped at the interview (and at the founding, and by the
  // 0.11.8 migration with the legacy hash) and read from the file after
  function truthFor(state, st, hashFn) {
    const HR = KP.C.HIRES;
    const hh = key => (hashFn || KP.hash01)([state.seed, 'hires', st.id, key].join('|'));
    const core = HR.SEATS.filter(x => !x.studio);
    return { base: hh('apt'), gem: st.tier === 'unknown' && hh('gem') < HR.gemChance,
      bestSeat: core[Math.floor(hh('best') * core.length)].id };
  }
  KP.staffTruthMint = function (state, st, legacy) { return truthFor(state, st, legacy ? KP.hash01Legacy : KP.hash01); };

  function mintCandidate(state, seatId, tier, salt) {
    const sid = 'sf' + state.week + '_' + salt;
    const HR = KP.C.HIRES;
    const name = FAM[Math.floor(h(state, sid, 'f') * FAM.length)] + ' ' +
      GIV[Math.floor(h(state, sid, 'g') * GIV.length)];
    const core = HR.SEATS.filter(x => !x.studio);
    const knownFor = h(state, sid, 'kfm') < HR.knownForMatch
      ? null   // null = the tag matches the true best seat (resolved in truth)
      : core[Math.floor(h(state, sid, 'kf') * core.length)].id;
    const years = 2 + Math.floor(h(state, sid, 'yr') * 12);
    const resume = [
      years + ' years in, most recently at ' + HOUSES[Math.floor(h(state, sid, 'h1') * HOUSES.length)],
      'was in the room for ' + ERAS[Math.floor(h(state, sid, 'e1') * ERAS.length)],
    ];
    const cand = { id: sid, name, seatId, tier, knownForTag: knownFor, resume,
      style: STYLES[Math.floor(h(state, sid, 'st') * STYLES.length)],
      warmth: Math.round(h(state, sid, 'pw') * 100),
      candor: Math.round(h(state, sid, 'pc') * 100) };
    // the studio (v0.10.35): a producer's lanes and a writer's themes are
    // public knowledge — the craft behind them is the fog
    const seatDef = HR.SEATS.find(x => x.id === seatId);
    if (seatDef && seatDef.studio) {
      cand.knownForTag = null;
      if ((seatDef.second || seatId) === 'producer') {   // the second chair (v0.10.39) is the same family
        const lanes = KP.C.CONCEPTS.filter(c => c.id !== 'fusion');
        cand.lane = lanes[Math.floor(h(state, sid, 'lane') * lanes.length)].id;
        cand.lane2 = null;
        if (h(state, sid, 'lane2') < KP.C.STUDIO.secondLaneChance) {
          const N = KP.C.TREND.NEIGHBOURS[cand.lane] || [];
          if (N.length) cand.lane2 = N[Math.floor(h(state, sid, 'lane2pick') * N.length)];
        }
      } else {
        const all = KP.C.THEMES.map(t => t.id);
        const n = 2 + Math.floor(h(state, sid, 'thn') * 2);
        cand.themes = [];
        for (let i = 0; i < n; i++) {
          const left = all.filter(t => !cand.themes.includes(t));
          cand.themes.push(left[Math.floor(h(state, sid, 'th' + i) * left.length)]);
        }
      }
      cand.works = [];
    }
    cand.truth = truthFor(state, cand);   // minted once (v0.11.8, §99)
    return cand;
  }

  // ---- the truth: computed, never stored, never printed ----------------
  KP.staffTruth = function (state, st) {
    const HR = KP.C.HIRES;
    // the stamped truth (v0.11.8, §99) — the derivation is the fallback for
    // a chair no migration has touched, never a write
    const t = st.truth || truthFor(state, st);
    const base = t.base;
    const gem = !!t.gem;
    // the best seat is drawn over the six core chairs (the studio chairs
    // joined in v0.10.35 — old truths must not move under them)
    const bestSeat = t.bestSeat;
    let apt = gem ? 0.72 + base * 0.28
      : KP.clamp(HR.tierFloor[st.tier] + base * HR.tierSpan, 0, 1);
    const def = HR.SEATS.find(x => x.id === st.seatId);
    if (!(def && def.studio) && st.seatId !== bestSeat) apt *= HR.offSeatDamp;   // a studio chair's truth is its own craft
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
    const mult = KP.clamp(HR.multLo + t.apt * (HR.multHi - HR.multLo) + meshOf(state, st), 0.85, 1.18);
    // the season, televised (v0.11.4): the chair that flew out to the set this week is not in the room
    if (state.coachAway && state.coachAway.week === state.week && state.coachAway.seat === seatId) return mult * KP.C.COMPETITION.coachAwayMult;
    return mult;
  };

  // ---- the founding hires: the incumbent trio become somebody ----------
  function seats(state) {
    if (!state.seats) {
      state.seats = {};
      // a later building's chairs are new people — the hidden truths are
      // hashed off the seat id, so the id carries the chapter (audit v0.11.3)
      const gen = state.managerGen || 0;
      const mk = (seatId, name) => {
        const sid = 'sf' + gen + '_' + seatId;
        state.seats[seatId] = { id: sid, name, seatId, tier: 'working',
          knownForTag: null, since: 1, style: STYLES[Math.floor(h(state, sid, 'st') * STYLES.length)],
          warmth: Math.round(h(state, sid, 'pw') * 100),
          candor: Math.round(h(state, sid, 'pc') * 100),
          resume: ['here since the beginning — the résumé is this company'] };
        state.seats[seatId].truth = truthFor(state, state.seats[seatId]);   // minted once (v0.11.8, §99)
      };
      mk('vocal', KP.staffName ? KP.staffName(state.seed + '|coach') : 'Coach Baek');   // the legacy coach IS the vocal seat (v0.10.43)
      mk('dance', 'Coach ' + FAM[Math.floor(h(state, 'seed-dance', 'f') * FAM.length)]);
      mk('perf', 'Director Cha');
      mk('scout', 'Scout Im');
      // A&R and marketing start EMPTY — the first hires the fog invites
    }
    return state.seats;
  }
  KP.staffSeats = seats;
  // a later building's chairs (the second chance since v0.11.0; the founding too since v0.11.40, §132): the
  // four a house opens with are new people, under names of their own, sat from the week its doors open
  const TITLE = { perf: 'Director ', scout: 'Scout ' };
  KP.seatBuilding = function (state, key, line) {
    delete state.seats;
    delete state.staffSearch;           // the posting was the last building's
    delete state.seatSearchCooldowns;   // and so was the market's memory of it
    const S = seats(state);
    const taken = {};
    Object.keys(S).forEach(seatId => {
      const st = S[seatId];
      let name = null;
      // salted until it is this building's alone: two chairs of one house do not answer to one name
      for (let salt = 0; salt < 8 && (!name || taken[name]); salt++) {
        name = (TITLE[seatId] || 'Coach ') + KP.staffName(key + '|' + seatId + (salt ? '|' + salt : '')).split(' ')[0];
      }
      taken[name] = true;
      st.name = name;
      st.since = state.week;
      st.resume = [line];
    });
    return S;
  };
  // one staff (v0.10.43, §89 D8): every name the building speaks comes
  // from a chair — the scout's stories, the referral's voucher, the
  // evaluators' bylines. An empty chair speaks as the desk.
  KP.seatHolderName = function (state, seatId, fallback) {
    const st = seats(state)[seatId];
    return st ? st.name : (fallback || 'the ' + ((KP.C.HIRES.SEATS.find(x => x.id === seatId) || {}).label || seatId) + ' desk');
  };
  KP.scoutName = function (state) { return KP.seatHolderName(state, 'scout', 'the scouting desk'); };
  const EVAL_SEAT = { ev_vocal: 'vocal', ev_perf: 'perf', ev_scout: 'scout' };
  KP.seatEvaluator = function (state, ev) {
    const seatId = ev && EVAL_SEAT[ev.id];
    if (!seatId) return ev;
    return Object.assign({}, ev, { name: seatId === 'scout' ? KP.scoutName(state) : KP.seatHolderName(state, seatId) });
  };

  // ---- the interview: personality only, zero skill signal --------------
  KP.registerScene('theInterview', {
    title: (state, sc) => sc.cand.name + ' · the interview',
    body: (state, sc) => {
      const HR = KP.C.HIRES;
      const c = sc.cand;
      const seat = HR.SEATS.find(x => x.id === c.seatId);
      // the studio (v0.10.35): the lanes and the themes are on the file — the craft is not
      const studioLine = c.lane
        ? ' Known lanes: ' + KP.producerLanes(c).map(l => (KP.conceptById(l) || { label: l }).label.toLowerCase()).join(' and ') + '.'
        : c.themes ? ' Themes they write: ' + c.themes.map(t => (KP.themeById(t) || { label: t }).label.toLowerCase()).join(', ') + '.' : '';
      return 'The ' + seat.label + ' chair needs filling and ' + c.name + ' took the meeting. ' +
        'The read across the table: ' + (c.warmth >= 50 ? 'warm, easy in the room' : 'reserved, hard to warm') +
        ', ' + (c.candor >= 50 ? 'answers straight even when it costs' : 'answers carefully, edges sanded') +
        ' — and by every account, ' + STYLE_WORD[c.style] + '. ' +
        'The résumé: ' + c.resume.join('; ') + '.' + studioLine + ' ' +
        'The industry file: ' + c.tier + (c.knownForTag ? ', known for ' +
          (HR.SEATS.find(x => x.id === c.knownForTag) || seat).label + ' work' : '') +
        '. The fee is ' + HR.hireCost[c.tier] + '. The résumé says where they were. It does not say what they did there.';
    },
    options: (state, sc) => {
      // the clean exits (v0.10.16): replacing a sitter pays their
      // severance ON TOP — hiring over somebody was quietly cheaper
      // than firing them, and a company is not allowed that arithmetic
      const HR = KP.C.HIRES;
      const prev = seats(state)[sc.cand.seatId];
      const sev = prev ? Math.max(HR.severanceMin,
        Math.round((HR.hireCost[prev.tier] || HR.hireCost.working) * HR.severanceMult)) : 0;
      return [
        { id: 'hire', label: 'Hire · ' + (HR.hireCost[sc.cand.tier] + sev) +
          (sev ? ' (incl. ' + prev.name.split(' ')[0] + '’s severance)' : '') },
        { id: 'pass', label: 'Pass' },
      ];
    },
    resolve: (state, sc, optionId) => {
      const HR = KP.C.HIRES;
      const led = ledger(state);
      if (optionId !== 'hire') {
        led.passes++;
        rememberPass(state, sc.cand);   // the market remembers (v0.11.5, §96 wiring)
        return { toast: 'Passed. The chair stays as it was; the meeting stays a meeting. The market keeps the name.' };
      }
      const prev = seats(state)[sc.cand.seatId];
      const sev = prev ? Math.max(HR.severanceMin,
        Math.round((HR.hireCost[prev.tier] || HR.hireCost.working) * HR.severanceMult)) : 0;
      const cost = HR.hireCost[sc.cand.tier] + sev;
      if (state.budget < cost) { led.passes++; rememberPass(state, sc.cand); return { toast: 'The fee' + (sev ? ' — and the severance a replacement owes —' : '') + ' outran the account. The candidate’s agent stopped returning calls.' }; }
      state.budget -= cost;
      if (KP.ledgerFlow) KP.ledgerFlow(state, 'signings', -cost);
      if (prev) {
        led.fired++;
        // letting a name go by replacement raises the same eyebrows
        if (HR.REP_TIERS.indexOf(prev.tier) >= HR.fireTrustTierMin) {
          state.trust = KP.clamp(state.trust - 1, 0, 100);
        }
      }
      seats(state)[sc.cand.seatId] = Object.assign({}, sc.cand, { since: state.week });
      led.hires++;
      KP.note(state, { kind: 'company', ind: 'seatFilled', priority: 'high',
        text: sc.cand.name + ' signs on as ' + HR.SEATS.find(x => x.id === sc.cand.seatId).label +
          (prev ? ', taking the chair from ' + prev.name + ' — severance paid, and the building notices chairs' : '') +
          '. What the hire actually is, only the months will say: the results arrive tangled with everything else, which is the whole job of judging them.' });
      return { toast: 'Hired. Now comes the only interview that counts: the next year.' };
    },
    expire: (state, sc) => { ledger(state).passes++; rememberPass(state, sc.cand); return null; },
  });

  // ---- the poach: your results made them famous -------------------------
  // the road manager's goodbye (the old staffPoach's release path)
  function managerWalks(state, g, sc) {
    const MG = KP.C.HIRES.MANAGER;
    const m = g.manager;
    delete g.manager;
    g.managerGen = (g.managerGen || 0) + 1;
    g.members.forEach(id => {
      const p = state.people[id];
      if (p) p.morale = KP.clamp(p.morale - MG.poachMorale, 0, 100);
    });
    ledger(state).walked++;
    return m;
  }
  // the house on the other end of the call (v0.11.25, §116): the scene
  // names its head, says why this house, and the answer goes on its books
  const callStamp = (state, rival) => {
    if (!rival) return {};
    const why = KP.callOpened ? KP.callOpened(state, rival) : null;
    return why ? { rivalShort: rival.short, why } : { rivalShort: rival.short };
  };
  const callHouse = (state, sc) => (KP.callHouseOf ? KP.callHouseOf(state, sc) : null);
  const callFrom = (state, sc) => { const r = callHouse(state, sc); return r && KP.signedBy ? KP.signedBy(state, r) : sc.rivalName; };
  const callWhy = (state, sc) => { const r = callHouse(state, sc); const t = r && KP.parkWhyText ? KP.parkWhyText(state, r, sc.why) : ''; return t ? ' ' + t : ''; };
  const onBooks = (state, sc, kind) => { const r = callHouse(state, sc); if (r && KP.recordHouse) KP.recordHouse(state, r.short, kind); };
  KP.registerScene('seatPoach', {
    title: (state, sc) => {
      if (sc.groupId) {   // the road manager (v0.10.43): one scene for every chair
        const g = KP.groupById(state, sc.groupId);
        const m = g && g.manager;
        return (m ? m.name : 'The road manager') + ' · the counter-offer';
      }
      const st = (state.seats || {})[sc.seatId];
      return (st ? st.name : 'The chair') + ' · the offer from outside';
    },
    body: (state, sc) => {
      if (sc.groupId) {
        const g = KP.groupById(state, sc.groupId);
        const m = g && g.manager;
        if (!g || !m) return '';
        return callFrom(state, sc) + ' wants ' + m.name + ' — the person who knows ' + g.name +
          '’s van seating, coffee orders, and bad days better than the members’ own families do. Money keeps ' +
          (m.name.split(' ')[0]) + ' (' + KP.C.HIRES.raiseCost + '); nothing else will.' + callWhy(state, sc);
      }
      const st = (state.seats || {})[sc.seatId];
      const seat = KP.C.HIRES.SEATS.find(x => x.id === sc.seatId);
      return (st ? st.name : 'Your ' + seat.label) + ' got the call — ' + callFrom(state, sc) +
        ', better title, real money. This is what happens when the results carry a name: the industry ' +
        'reads your credits and hires your people. A raise keeps the chair (' + KP.C.HIRES.raiseCost +
        '); pride keeps nothing.' + callWhy(state, sc);
    },
    // the raise is offered only when the account can pay it (audit
    // v0.11.3: an unaffordable "Match it" fell through to the walk)
    options: (state) => (state.budget >= KP.C.HIRES.raiseCost
      ? [{ id: 'raise', label: 'Match it · ' + KP.C.HIRES.raiseCost }] : [])
      .concat([{ id: 'walk', label: 'Wish them well' }]),
    resolve: (state, sc, optionId) => {
      const led = ledger(state);
      if (sc.groupId) {
        const g = KP.groupById(state, sc.groupId);
        const m = g && g.manager;
        if (!g || !m) return { toast: 'The van had already found a new driver.' };
        if (optionId === 'raise' && state.budget >= KP.C.HIRES.raiseCost) {
          state.budget -= KP.C.HIRES.raiseCost;
          if (KP.ledgerFlow) KP.ledgerFlow(state, 'signings', -KP.C.HIRES.raiseCost);
          m.countered = state.week;
          led.raises++;
          onBooks(state, sc, 'weKeptOurStaff');
          return { toast: m.name + ' stays — better pay, same vans, and one very relieved group chat. The members threw a small dorm party with a hand-drawn banner. The banner misspells “congratulations.” It is already framed.' };
        }
        managerWalks(state, g, sc);
        onBooks(state, sc, 'theyHiredOurStaff');
        return { toast: m.name + ' left on good terms, which somehow made the last van ride quieter. A new manager starts next week. The seating chart starts from zero.',
          note: { kind: 'company', groupId: g.id,
            text: g.name + ' said goodbye to ' + m.name + ' this week. The maknae cried at the send-off dinner, then everyone did, including — briefly, professionally — ' + m.name + '.' } };
      }
      const st = (state.seats || {})[sc.seatId];
      if (!st) return { toast: 'The chair had already emptied.' };
      if (optionId === 'raise' && state.budget >= KP.C.HIRES.raiseCost) {
        state.budget -= KP.C.HIRES.raiseCost;
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'signings', -KP.C.HIRES.raiseCost);
        led.raises++;
        onBooks(state, sc, 'weKeptOurStaff');
        return { toast: st.name + ' stays. The raise is real; so is the fact they took the meeting.' };
      }
      led.walked++;
      delete state.seats[sc.seatId];
      onBooks(state, sc, 'theyHiredOurStaff');
      KP.note(state, { kind: 'company', ind: 'seatWalked', priority: 'high',
        text: st.name + ' goes to ' + sc.rivalName + ' with a leaving speech that thanks everyone and a start date that says everything. The chair is open, and whether that is a loss or a mercy is exactly the thing nobody will ever know for certain.' });
      return { toast: 'The chair is open. The industry hires from the schools it respects — that is the compliment and the bill.' };
    },
    expire: (state, sc) => {
      // an unanswered offer answers itself
      if (sc.groupId) {
        const g = KP.groupById(state, sc.groupId);
        if (!g || !g.manager) return null;
        const m = managerWalks(state, g, sc);
        onBooks(state, sc, 'theyHiredOurStaff');
        return { kind: 'company', priority: 'high', groupId: g.id,
          text: 'The counter-offer window closed unanswered, and ' + m.name + ' signed elsewhere. The members found out from the group chat. The silence in the van this week has a new-staff-orientation quality to it.' };
      }
      const st = (state.seats || {})[sc.seatId];
      if (st) { ledger(state).walked++; delete state.seats[sc.seatId]; onBooks(state, sc, 'theyHiredOurStaff'); }
      return null;
    },
  });

  // ---- the week ----------------------------------------------------------
  KP.registerWeekly('hires', 791, function (state, rng, inbox) {
    const HR = KP.C.HIRES;
    const led = ledger(state);
    const S = seats(state);
    // the market remembers (v0.11.5, §96 wiring): about a season after a
    // pass, the name takes a chair across the street — one letter, the
    // house hash-picked (no draw), the entry dropped
    const passedDue = (led.passed || []).find(e => state.week >= e.week + HR.passReturnWeeks);
    if (passedDue) {
      led.passed = led.passed.filter(e => e !== passedDue);
      const houses = KP.signingHouses(state);
      const house = houses.length
        ? houses[Math.floor(KP.hash01([state.seed, 'passedChair', passedDue.name, passedDue.week].join('|')) * houses.length)]
        : null;
      const seatDef = HR.SEATS.find(x => x.id === passedDue.seatId) || { label: passedDue.seatId };
      inbox.push({ kind: 'company', ind: 'passedTookChair', priority: 'normal',
        text: passedDue.name + ' took the ' + seatDef.label + ' chair at ' + (house ? house.name : 'a house across the street') +
          ' this week — the candidate this desk passed on ' + KP.weekLabel(passedDue.week).text +
          '. The trades printed the hire in one line. The building read it twice, and nobody will ever know which chair it should have been.' });
    }
    // a candidate takes the meeting — rep gated by the fame read. A
    // posted search (v0.10.11) guarantees the meeting; otherwise the
    // market knocks on its own clock
    const searching = state.staffSearch && !(state.scenes || []).some(sc => sc.kind === 'theInterview');
    if (searching || (!(state.scenes || []).some(sc => sc.kind === 'theInterview') &&
        rng.chance(HR.candidateChance))) {
      const fame = KP.fameRead ? KP.fameRead(state) : 0.5;
      let seat = null;
      if (searching) {
        seat = HR.SEATS.find(x => x.id === state.staffSearch.seatId) || null;
        delete state.staffSearch;
      } else {
        // a second studio chair is not open until the first proves out (v0.10.39)
        const open = HR.SEATS.filter(x => !S[x.id] && KP.chairOpenable(state, x.id));
        const pool = open.length && rng.chance(0.7) ? open
          : HR.SEATS.filter(x => (!S[x.id] && KP.chairOpenable(state, x.id)) || (S[x.id] && state.week - (S[x.id].since || 0) > 30));
        if (pool.length) seat = pool[rng.int(0, pool.length - 1)];
      }
      if (seat) {
        const tiers = ['unknown', 'working'];
        if (fame >= HR.fameForKnown) tiers.push('known');
        if (fame >= HR.fameForName) tiers.push('a name');
        const cand = mintCandidate(state, seat.id, tiers[rng.int(0, tiers.length - 1)], rng.int(0, 9999));
        led.candidates++;
        KP.openScene(state, { kind: 'theInterview', cand, expiresWeek: state.week + 2 });
        inbox.push({ kind: 'company', ind: 'interviewSet', priority: 'high',
          text: cand.name + ' is in the building about the ' + seat.label + ' chair — ' +
            (searching ? 'answering the posting, ' : '') + cand.tier +
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
        // no note (§89 C): the tier shows on the building card; the poach
        // call that follows is the event
      });
    });
    // the poach call: one scene for every chair in the building — the
    // seats the industry read the credits of, and the road managers the
    // members cannot imagine the van without (v0.10.43, §89 D8)
    if (!(state.scenes || []).some(sc => sc.kind === 'seatPoach') &&
        state.week > (state.seatPoachQuiet || 0)) {
      const MG = HR.MANAGER;
      // the red weeks (v0.11.0, §86): from the creditors' letters on, the
      // chairs take the calls — any seat, three times as often
      const redHot = !!(KP.redRead && KP.redRead(state).weeks >= KP.C.RED.creditorsAt);
      const redMult = redHot ? KP.C.RED.poachMult : 1;
      const seatTarget = Object.keys(S).find(seatId => S[seatId] &&
        (redHot || KP.C.HIRES.REP_TIERS.indexOf(S[seatId].tier) >= HR.poachTierMin));
      const mgrTarget = KP.groups(state).find(g => g.debuted && !g.retiredWeek && g.manager &&
        (g.popularity || 0) >= MG.poachPopMin && state.week - g.manager.since >= MG.poachTenureMin);
      // who calls (v0.11.25, §116): a weighted draw on the one number that
      // was always drawn here (rng.int took one; this takes the same one)
      const rivalOf = () => {
        const hs = KP.signingHouses(state);
        const u = rng.next();
        return KP.callingHouse ? KP.callingHouse(state, hs, u) : hs[Math.floor(u * hs.length)];
      };
      if (seatTarget && rng.chance(HR.poachChance * redMult)) {
        state.seatPoachQuiet = state.week + HR.poachCooldown;
        led.poachCalls++;
        const rival = rivalOf();
        KP.openScene(state, Object.assign({ kind: 'seatPoach', seatId: seatTarget,
          rivalName: rival ? rival.name : 'a rival house', expiresWeek: state.week + 2 }, callStamp(state, rival)));
      } else if (mgrTarget && rng.chance(MG.poachChance * redMult)) {
        state.seatPoachQuiet = state.week + HR.poachCooldown;
        led.poachCalls++;
        const rival = rivalOf();
        const rivalName = rival ? rival.name : 'a rival house';
        KP.openScene(state, Object.assign({ kind: 'seatPoach', groupId: mgrTarget.id, rivalName, expiresWeek: state.week + 2 }, callStamp(state, rival)));
        inbox.push({ kind: 'company', priority: 'high', groupId: mgrTarget.id,
          text: mgrTarget.manager.name + ' got an offer from ' + (KP.signedBy ? KP.signedBy(state, rival) : rivalName) +
            ' — better title, better hours, someone else’s vans. The counter-offer window is on the Desk, and the members have already noticed the long phone calls.' });
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
