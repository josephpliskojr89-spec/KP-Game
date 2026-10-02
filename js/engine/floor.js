/* The floor (v0.10.31, §90 Phase A) — one world of people.
   Owner: "Every trainee exists within the world and comes from
   somewhere… Trainees exist and remember. Released trainees move
   throughout the system. No just random generations popping that say
   they're a washout." The law: every person who matters is ONE person,
   born once at a door of the world, carried by one file for life.
   Rival floors are people (rosterCount is a READ now); a cut is a
   person; a released trainee re-enters the open board and remembers;
   the world forgets only at its exits — never a person with a chapter
   with the player. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    return state.floorLedger = state.floorLedger ||
      { born: 0, cut: 0, boarded: 0, marketed: 0, signedFromBoard: 0, reentries: 0,
        home: 0, forgotten: 0, resigned: 0, refused: 0, elsewhere: 0 };
  }
  KP.floorLedger = ledger;

  // ---- births: every door stamps where she came from ---------------------
  KP.stampBorn = function (state, p, door, extra) {
    if (p.born) return p.born;
    let city = extra && extra.city;
    if (!city && p.schoolId && KP.schoolById) {
      const s = KP.schoolById(state, p.schoolId);
      if (s) city = s.cityId;
    }
    if (!city) {
      // a hometown by city gravity — hash, not rng: where she grew up
      // was never the stream's draw
      const cities = (KP.C.TOUR && KP.C.TOUR.KR_CITIES) || [{ id: 'seoul', w: 1 }];
      const total = cities.reduce((s, c) => s + (c.w || 0.5), 0);
      let r = KP.hash01([state.seed, p.id, 'born'].join('|')) * total;
      city = cities[0].id;
      for (const c of cities) { r -= (c.w || 0.5); if (r <= 0) { city = c.id; break; } }
    }
    p.born = Object.assign({ door, city, week: state.week }, extra || {});
    delete p.born.city; p.born.city = city;
    ledger(state).born++;
    return p.born;
  };

  // ---- the floor read: rosterCount is a count of people ------------------
  function inActs(state) {
    const set = new Set();
    (state.rivals || []).forEach(r => (r.acts || []).forEach(a =>
      (a.members || []).forEach(id => set.add(id))));
    return set;
  }
  KP.rivalFloor = function (state, rival) {
    const acts = inActs(state);
    return Object.values(state.people).filter(p =>
      p.status === 'rival' && p.company === rival.short && !acts.has(p.id));
  };
  KP.rivalFloorCount = function (state, rival) { return KP.rivalFloor(state, rival).length; };
  KP.peakOf = function (p) {
    return Math.max(p.talents.vocals.cur, p.talents.dance.cur, p.talents.rap.cur, p.talents.charisma.cur);
  };

  // ---- the rival's door: an applicant to THEM -----------------------------
  KP.mintRivalTrainee = function (state, rng, rival, opts) {
    opts = opts || {};
    KP.resetIds(state.nextPersonId || KP.peekNextId());
    const usedNames = new Set(Object.values(state.people).map(x => x.name.given.toLowerCase()));
    const gender = opts.gender || (rng.chance(KP.C.GEN.maleLeadShare) ? 'm' : 'f');
    const signedWeek = opts.signedWeek != null ? opts.signedWeek : state.week;
    // she signed young; the years on the floor are on her birth certificate
    const age = opts.age != null ? opts.age
      : rng.int(KP.C.FLOOR.signAge[0], KP.C.FLOOR.signAge[1]) + Math.floor(Math.max(0, state.week - signedWeek) / KP.C.WEEKS_PER_YEAR);
    const p = KP.generatePerson(rng, { status: 'rival', usedNames, gender,
      source: rival.short + ' trainee', age });
    p.company = rival.short;
    p.flags.rivalNative = true;
    p.signedWeek = signedWeek;
    state.people[p.id] = p;
    KP.socialOf(state, p);
    state.nextPersonId = KP.peekNextId();
    KP.stampBorn(state, p, 'rivalDoor', { firstCompany: rival.short, week: p.signedWeek });
    p.history.push({ week: p.signedWeek, text: 'Signed to ' + rival.short + ' as a trainee — walked in through their front door.' });
    return p;
  };

  // ---- a rival signs off the public board (the world before the door) ----
  KP.rivalSignFromBoard = function (state, rival, p, how) {
    p.status = 'rival';
    p.company = rival.short;
    p.signedWeek = state.week;
    // "a face we lost" is a chapter only if this desk could have had her:
    // our mail, or a file we read. A public lead nobody here looked at
    // is the world's business (measured: 145 'gone' files per 620-week
    // save were kept for a chapter that was never ours)
    if (p.flags.readByUs || KP.CHANNEL_PRIVATE[p.channel] || p.flags.wasOurs) p.flags.lostToRival = 1;
    delete p.castoffUntil; delete p.reentryAt;
    if (KP.schoolRecordAlum) KP.schoolRecordAlum(state, p, rival.short);
    state.prospects = (state.prospects || []).filter(id => id !== p.id);
    (state.rivals || []).forEach(r => { if (r.interest) delete r.interest[p.id]; });
    p.history.push({ week: state.week, text: 'Signed to ' + rival.short + (how ? ' — ' + how : ' — off our board') + '.' });
    ledger(state).signedFromBoard++;
    return p;
  };

  // ---- the cut: a real person leaves a real floor ------------------------
  // She lands on the open board as a castoff (file intact) when there is
  // room — else the market holds her and the re-entry clock brings her
  // when a seat opens. Returns 'board' | 'market'.
  KP.cutFromFloor = function (state, rng, rival, p, opts) {
    opts = opts || {};
    const CF = KP.C.NETWORK.CASTOFF;
    const led = ledger(state);
    led.cut++;
    (state.rivals || []).forEach(r => { if (r.interest) delete r.interest[p.id]; });
    p.company = null;
    p.castoffFrom = rival.short;
    p.releasedBy = rival.short;
    p.releasedWeek = state.week;
    if ((rival.prestige || 40) >= CF.majorPrestige) p.castoffMajor = 1; else delete p.castoffMajor;
    p.history.push({ week: state.week, text: opts.historyText ||
      ('Cut at ' + rival.short + '’s seasonal evaluation. Years of practice rooms, one meeting.') });
    if (opts.hype) p.hype = Math.max(p.hype || 0, opts.hype);
    const full = (state.prospects || []).length >= KP.C.NETWORK.boardCap;
    if (full) {
      p.status = 'released';
      led.marketed++;
      return 'market';
    }
    KP.boardCastoff(state, rng, p);
    return 'board';
  };
  // the castoff on the board IS the person who was cut
  KP.boardCastoff = function (state, rng, p) {
    const CF = KP.C.NETWORK.CASTOFF;
    p.status = 'prospect';
    p.channel = 'castoff';
    p.source = (p.castoffFrom || 'a rival') + ' castoff';
    p.castoffUntil = state.week + CF.window;
    delete p.reentryAt;
    p.observations = Math.max(p.observations || 0, CF.obs);   // somebody trained them; the file is real
    KP.takeReads(state, p);
    if (p.castoffMajor && !p.hype) p.hype = rng ? rng.int(CF.majorHype[0], CF.majorHype[1])
      : CF.majorHype[0] + Math.floor(KP.hash01([state.seed, p.id, 'chype'].join('|')) * (CF.majorHype[1] - CF.majorHype[0]));
    state.prospects.push(p.id);
    ledger(state).boarded++;
    return p;
  };

  // ---- the player's exits: she leaves the company, not the world ---------
  KP.leftUs = function (state, p) {
    p.flags.wasOurs = 1;
    p.releasedFrom = state.company.short;
    p.releasedWeek = state.week;
    delete p.reentryAt;
    // the season (v0.10.32): leaving this building mid-term hands the
    // project house her contract — the seat was held for her here, and
    // the act she is in does not stop for your paperwork
    if (p.flags.onProject) {
      const house = p.flags.onProject.house;
      delete p.flags.onProject;
      p.status = 'rival';
      p.company = house;
      p.signedWeek = state.week;
      p.flags.seasonHome = { company: null, keptFrom: state.company.short };
      p.history.push({ week: state.week, text: 'Left ' + state.company.short + ' mid-run; the project house picked up the contract without missing a stage.' });
    }
  };

  // ---- memory: a chapter with the player is never forgotten -------------
  KP.hasChapter = function (state, p) {
    return !!(p.flags && (p.flags.wasOurs || p.flags.readByUs || p.flags.lostToRival)) ||
      ((p.directed || []).length > 0) || p.status === 'idol' || p.status === 'trainee' ||
      (state.roster || []).includes(p.id) ||
      (state.groups || []).some(g => (g.members || []).includes(p.id));
  };
  // the world's exit: home, or forgotten if nobody here ever knew her
  KP.goHome = function (state, p, text) {
    const led = ledger(state);
    (state.rivals || []).forEach(r => { if (r.interest) delete r.interest[p.id]; });
    state.prospects = (state.prospects || []).filter(id => id !== p.id);
    if (!KP.hasChapter(state, p)) {
      delete state.people[p.id];
      led.forgotten++;
      return false;
    }
    p.status = 'gone';
    p.company = null;
    p.history.push({ week: state.week, text: text || 'Went home. The industry was a chapter, not the book.' });
    led.home++;
    return true;
  };

  // ---- the grudge bar: hers, from who she is (§90 D ruling 3) ------------
  KP.grudgeBar = function (p) {
    const F = KP.C.FLOOR;
    const P = p.personality || {};
    const bar = F.grudgeBarBase + (P.warmth + P.professionalism) / 50 - (P.dominance + P.competitiveness) / 60;
    return Math.max(1, Math.round(bar));
  };
  // would she take OUR meeting again? null = yes; a string = her no
  KP.resignRefusal = function (state, p) {
    if (p.releasedFrom !== state.company.short) return null;
    const read = KP.ledgerRead(state, p);
    if (read.grudge >= KP.grudgeBar(p)) {
      return KP.fillPro(KP.displayName(p) + ' took the meeting to say no. {She} was polite about it, which was the point: ' +
        'the file between you is {hers} too, and {she} has read it more times than you have.', p);
    }
    return null;
  };

  // ---- the re-entry clock (order 619: after the network's arrivals) ------
  // A released person — yours, or a rival's cut the board had no room for
  // — resurfaces on the open board after a stretch away, file intact.
  // Past the market's age she goes home instead. Hash-timed; no rng.
  KP.registerWeekly('reentry', 619, function (state, rng, inbox) {
    const F = KP.C.FLOOR;
    const S = KP.C.SCOUT;
    const led = ledger(state);
    Object.values(state.people).forEach(p => {
      if (p.status !== 'released') return;
      if ((state.roster || []).includes(p.id)) return;   // still ours on paper — not the market's
      if (p.reentryAt == null) {
        p.reentryAt = (p.releasedWeek != null ? p.releasedWeek : state.week) +
          F.reentryMin + Math.floor(KP.hash01([state.seed, p.id, 'reentry'].join('|')) * (F.reentryMax - F.reentryMin + 1));
      }
      if (state.week < p.reentryAt) return;
      if (p.age >= S.prospectAgeOut) {
        KP.goHome(state, p, 'Past the market’s age with no letterhead. Went home — the industry was a chapter.');
        return;
      }
      if ((state.prospects || []).length >= KP.C.NETWORK.boardCap) {
        // no seat on the board: the market waits a while, then moves —
        // another company's pen (a real signing) or a bus ticket home.
        // The save does not hold a waiting room forever (measured: 43
        // released files per org at 140 weeks before this clock)
        if (state.week - p.reentryAt < F.marketWaitWeeks) return;
        const rivals = (state.rivals || []);
        if (rivals.length && KP.hash01([state.seed, p.id, 'marketExit'].join('|')) < F.castoffSignsElsewhere) {
          const r = rivals[Math.floor(KP.hash01([state.seed, p.id, 'marketWhere'].join('|')) * rivals.length)];
          KP.rivalSignFromBoard(state, r, p, 'from the open market, no board needed');
          led.elsewhere++;
        } else {
          KP.goHome(state, p, 'Waited on the market for a seat that never opened. Went home.');
        }
        return;
      }
      const ours = p.releasedFrom === state.company.short;
      const away = state.week - (p.releasedWeek != null ? p.releasedWeek : state.week);
      p.status = 'prospect';
      p.channel = 'released';   // public: every desk sees a released trainee
      p.source = (p.releasedBy || p.releasedFrom || 'a company') + ' — released';
      delete p.reentryAt;
      state.prospects.push(p.id);
      led.reentries++;
      p.history.push({ week: state.week, text: 'Back on the open board after ' + away + ' weeks away.' });
      if (ours) {
        inbox.push({ kind: 'scouting', ind: 'reentry', priority: 'normal', personId: p.id,
          text: KP.fillPro(KP.displayName(p) + ', who left this building ' + away + ' weeks ago, is on the open board again. ' +
            'The file remembers you — every line of it — and so does {she}.', p) });
      }
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
