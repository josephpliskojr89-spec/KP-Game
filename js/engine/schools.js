/* The regional schools (v0.9.16) — the pipeline has addresses.
   §55.14: the industry decentralized to find talent outside Seoul, and
   so do we. Persistent named academies in the home circuit's cities,
   each with a specialty lane, an alumni ledger, and a REPUTATION that
   moves with its graduates' careers — the school whose alumna becomes
   an it-girl gets hot, and the trades say so. When casting opens — your
   project, or a rival hungry for a debut — the schools submit their
   classes, and every company fishes the same ponds. Player verbs: the
   scouting trip (sharper reads on the current class) and the
   partnership (a retainer for first look at their best). */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  const NAME_POOLS = {
    vocals: ['Cheongum Vocal Academy', 'Hansori Vocal Studio', 'Belcanto Music Academy'],
    dance: ['One Mirror Dance Studio', 'Pulse Performing Arts', 'Cypher Room Dance Academy'],
    allround: ['First Light Performing Arts', 'Star Route Academy', 'Stagecraft School'],
  };
  const LANE_LABELS = { vocals: 'vocal', dance: 'dance', allround: 'all-round' };
  const LANE_SOURCE = { vocals: 'Vocal academy', dance: 'Dance academy', allround: 'School performance' };

  // ---- geography (v0.10.14, §83): one map, every distance derives -------
  function cityRow(id) {
    return KP.C.TOUR.KR_CITIES.find(c => c.id === id) || null;
  }
  KP.cityDistance = function (a, b) {
    const ra = cityRow(a), rb = cityRow(b);
    if (!ra || !rb || a === b) return 0;
    return Math.sqrt(Math.pow(ra.x - rb.x, 2) + Math.pow(ra.y - rb.y, 2));
  };

  // ---- creation (newgame calls this; the weekly phase migrates) ---------
  // the school map (v0.10.14, §83 A): 6–12 per save, cities drawn by
  // their gravity — Seoul carries the most, the small towns sometimes
  // none. Every lane exists somewhere; Seoul always has a school, and a
  // regional founding always has one up the road (the atlas trade).
  // the academy's game (v0.10.17, §84): the temper — who the director
  // is when your interest becomes their information. Words only.
  const TEMPERS = ['loyalist', 'auctioneer', 'starstruck', 'guardian'];
  const TEMPER_PROSE = {
    loyalist: 'returns calls in the order of who kept showing up',
    auctioneer: 'believes every gem is, by wonderful coincidence, a fundraiser',
    starstruck: 'wants an alumna under a MAJOR letterhead and says so unprompted',
    guardian: 'asks what you did with the last one before discussing the next one',
  };
  KP.schoolTemperProse = function (school) {
    return TEMPER_PROSE[school.temper] || '';
  };

  function mkSchool(state, rng, cityId, lane, rep) {
    const c = cityRow(cityId);
    const used = new Set((state.schools || []).map(x => x.name));
    const pool = NAME_POOLS[lane].filter(n => !used.has(n));
    let name = pool.length ? rng.pick(pool)
      : NAME_POOLS[lane][rng.int(0, NAME_POOLS[lane].length - 1)] + ' ' + c.label;
    if (used.has(name)) name = 'New ' + name;
    // the atlas (v0.10.12, §82 A): the arts city's academy opens with
    // a name — a world fact, not a player bonus
    const artsRep = (KP.C.HOME.CITIES && KP.C.HOME.CITIES[cityId] &&
      KP.C.HOME.CITIES[cityId].schoolRep) || 0;
    state.nextSchoolId = state.nextSchoolId || 1;
    const id = 'sch' + (state.nextSchoolId++);
    return {
      id, name, cityId, city: c.label, lane,
      rep: rep + artsRep,
      temper: TEMPERS[Math.floor(KP.hash01([state.seed, id, 'temper'].join('|')) * TEMPERS.length)],
      alumni: [], hot: false, hotWeek: null,
      visitedWeek: null, partnerUntil: 0,
    };
  }

  // ---- the persistent class (v0.10.17, §84 A+B) ------------------------
  // Real people, training in the fog: status 'student', aged by the
  // same birthdays as everyone, revealed only by visits and showcases.
  KP.schoolClass = function (state, school) {
    return Object.values(state.people)
      .filter(p => p.status === 'student' && p.schoolId === school.id);
  };
  function classTarget(school) {
    const CL = KP.C.SCHOOLS.CLASS;
    const w = (cityRow(school.cityId) || { w: 0.6 }).w;
    return Math.round(CL.sizeBase + w * CL.sizePerGravity);
  }
  // §83 C, one truth: the city sets the pond, the name sets the drilling.
  // Depth is training, not destiny: ceilings untouched.
  function applySchoolPolish(p, school) {
    const S = KP.C.SCHOOLS;
    const cw = (cityRow(school.cityId) || { w: 0.6 }).w;
    const depth = Math.round((cw - 0.5) / 0.5 * S.depthTalentSpan);
    const repBonus = school.rep > S.baseRep
      ? Math.round((school.rep - S.baseRep) / (100 - S.baseRep) * S.repTalentBonus) : 0;
    if (repBonus + depth <= 0) return;
    const laneKeys = school.lane === 'allround' ? ['vocals', 'dance'] : [school.lane];
    laneKeys.forEach(k => {
      const t = p.talents[k];
      const lift = school.lane === 'allround'
        ? Math.round((repBonus + depth) / 2) : repBonus + depth;
      t.cur = Math.min(t.ceilLo - 1, t.cur + lift);
    });
  }
  function schoolLedgerOf(state) {
    state.schoolLedger = state.schoolLedger || { opened: 0, closed: 0 };
    return state.schoolLedger;
  }
  function enrollStudent(state, rng, school) {
    const CL = KP.C.SCHOOLS.CLASS;
    KP.resetIds(state.nextPersonId || KP.peekNextId());
    const usedNames = new Set(Object.values(state.people).map(x => x.name.given.toLowerCase()));
    const gender = rng.chance(KP.C.GEN.maleLeadShare) ? 'm' : 'f';
    const p = KP.generatePerson(rng, { status: 'prospect', usedNames, gender,
      source: LANE_SOURCE[school.lane], age: rng.int(CL.enrollAge[0], CL.enrollAge[1]) });
    state.nextPersonId = KP.peekNextId();
    p.status = 'student';
    p.schoolId = school.id;
    p.channel = 'school';
    applySchoolPolish(p, school);
    state.people[p.id] = p;
    schoolLedgerOf(state).enrolled = (schoolLedgerOf(state).enrolled || 0) + 1;
    // the powers' head start: the obviously-talented are ALREADY known —
    // hash, not rng: whether the industry saw her was never your draw
    const peakCeil = Math.max(p.talents.vocals.ceilHi, p.talents.dance.ceilHi,
      p.talents.charisma.ceilHi);
    const knownChance = KP.C.SCHOOLS.CLASS.knownBase +
      Math.max(0, peakCeil - CL.knownCeilFloor) / 100 * CL.knownCeilSlope +
      (school.rep >= KP.C.SCHOOLS.hotAt ? CL.knownRepBonus : 0);
    if (KP.hash01([state.seed, p.id, 'known'].join('|')) < knownChance) {
      p.industryKnown = 1;
      (state.rivals || []).slice().sort((a, b) => (b.prestige || 0) - (a.prestige || 0))
        .slice(0, 2).forEach(r => {
          r.interest = r.interest || {};
          r.interest[p.id] = Math.max(r.interest[p.id] || 0, CL.knownInterest);
        });
    }
    return p;
  }
  // revelation: she stops being the fog's and becomes a board fact —
  // and you learn WHO ELSE already knew
  function revealStudent(state, p, opts) {
    p.status = 'prospect';
    state.prospects.push(p.id);
    KP.socialOf(state, p);
    p.observations = Math.max(p.observations || 0, (opts && opts.observations) || 1);
    KP.takeReads(state, p);
    if ((opts || {}).firstLook) p.flags.firstLookUntil = state.week + KP.C.SCHOOLS.firstLookWeeks;
    schoolLedgerOf(state).revealed = (schoolLedgerOf(state).revealed || 0) + 1;
    return p;
  }
  // the room fills once, at the school's birth — after that the weekly
  // enrollment drip is the only door in
  function fillClass(state, rng, school) {
    let guard = 24;
    while (KP.schoolClass(state, school).length < classTarget(school) && guard-- > 0) {
      enrollStudent(state, rng, school);
    }
    school.classBuilt = 1;
  }

  // ---- the director's calls (v0.10.17, §84 C) --------------------------
  // Interest is a tell in ANY form. A strong student + a shown look =
  // a chance the biggest letterheads arrive circling THAT WEEK.
  KP.schoolInterestShown = function (state, rng, p) {
    const CL = KP.C.SCHOOLS.CLASS;
    if (!p.schoolId || p.flags.directorCalled) return null;
    const school = KP.schoolById(state, p.schoolId);
    if (!school) return null;
    const peak = Math.max(KP.perceived(state, p, 'vocals', null),
      KP.perceived(state, p, 'dance', null), KP.perceived(state, p, 'charisma', null));
    if (peak < CL.callBar) return null;
    p.flags.directorCalled = 1;   // one phone tree per student
    if (!rng.chance(CL.callChance[school.temper] || 0.4)) return null;
    const tops = (state.rivals || []).slice()
      .sort((a, b) => (b.prestige || 0) - (a.prestige || 0)).slice(0, CL.callRivals);
    tops.forEach(r => {
      r.interest = r.interest || {};
      r.interest[p.id] = Math.max(r.interest[p.id] || 0, CL.callInterest);
    });
    state.schoolLedger = state.schoolLedger || { opened: 0, closed: 0 };
    state.schoolLedger.directorCalls = (state.schoolLedger.directorCalls || 0) + 1;
    return { kind: 'scouting', ind: 'directorCalls', priority: 'high', personId: p.id,
      text: KP.fillPro('Your interest in ' + KP.displayName(p) + ' did not stay in the room. ' +
        school.name + '’s director ' + TEMPER_PROSE[school.temper] + ' — and by the end of the week ' +
        tops.map(r => r.short).join(' and ') + ' had requested {pos} tape. The academy calls it doing right by the student. Your signing window calls it something else.', p) };
  };
  function drawCity(rng, bonusCity, bonusMult) {
    const cities = KP.C.TOUR.KR_CITIES;
    const weighted = cities.map(c => ({ id: c.id,
      w: c.w * (c.id === bonusCity ? (bonusMult || 1) : 1) }));
    const total = weighted.reduce((s2, x) => s2 + x.w, 0);
    let roll = rng.next() * total;
    for (const x of weighted) { roll -= x.w; if (roll <= 0) return x.id; }
    return weighted[weighted.length - 1].id;
  }
  KP.generateSchools = function (state, rng) {
    const S = KP.C.SCHOOLS;
    const n = rng.int(S.minSchools, S.maxSchools);
    const picks = ['seoul'];
    const home = KP.homeCity ? KP.homeCity(state) : 'seoul';
    if (home !== 'seoul') picks.push(home);
    while (picks.length < n) picks.push(drawCity(rng));
    // every lane exists somewhere; the rest of the map rolls its own mix
    const lanes = ['vocals', 'dance', 'allround'];
    while (lanes.length < n) lanes.push(rng.pick(['vocals', 'dance', 'allround']));
    // deterministic shuffle so Seoul is not always the vocal town
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      const t = lanes[i]; lanes[i] = lanes[j]; lanes[j] = t;
    }
    state.nextSchoolId = 1;
    state.schoolLedger = state.schoolLedger || { opened: 0, closed: 0 };
    state.schools = [];
    picks.slice(0, n).forEach((cid, i) => {
      state.schools.push(mkSchool(state, rng, cid, lanes[i],
        rng.int(S.startRep[0], S.startRep[1])));
    });
    // §84 A: the classes exist from day one — whether or not you ever visit
    state.schools.forEach(s => fillClass(state, rng, s));
    return state.schools;
  };

  KP.schoolById = function (state, id) {
    return (state.schools || []).find(s => s.id === id) || null;
  };
  // the school map (v0.10.14, §83 D): ONE truth for what access bills —
  // the verb and the button both read it. Your own city is a walk (any
  // house, Seoul included); everywhere else is the train fare by the
  // map plus a premium for the school's name.
  KP.schoolRepPremium = function (school) {
    const S = KP.C.SCHOOLS;
    const tier = school.rep >= S.hotAt ? 4 : school.rep >= 68 ? 3
      : school.rep >= 55 ? 2 : school.rep >= 38 ? 1 : 0;
    return S.repPremium[tier];
  };
  KP.schoolTripCost = function (state, school) {
    const S = KP.C.SCHOOLS;
    if (!school) return S.tripCost;
    const home = KP.homeCity ? KP.homeCity(state) : 'seoul';
    if (school.cityId === home) return KP.C.HOME.homeTripCost;
    const fare = Math.round(KP.cityDistance(home, school.cityId) * S.fareScale);
    return S.tripBase + fare + KP.schoolRepPremium(school);
  };
  KP.schoolPartnerCost = function (state, school) {
    const S = KP.C.SCHOOLS;
    if (!school) return S.partnerCost;
    const home = KP.homeCity ? KP.homeCity(state) : 'seoul';
    const fare = school.cityId === home ? 0
      : Math.round(KP.cityDistance(home, school.cityId) * S.fareScale);
    return S.partnerBase + S.partnerRepMult * KP.schoolRepPremium(school) + fare;
  };
  // reputation is shown as a word — the number stays in the building
  KP.schoolRepWord = function (rep) {
    return rep >= KP.C.SCHOOLS.hotAt ? 'hot' : rep >= 68 ? 'name-brand'
      : rep >= 55 ? 'respected' : rep >= 38 ? 'steady' : 'quiet';
  };

  // the ledger writes at the signature — that is when she leaves the school
  KP.schoolRecordAlum = function (state, p, via) {
    const s = p.schoolId && KP.schoolById(state, p.schoolId);
    if (!s) return;
    if (s.alumni.some(a => a.personId === p.id)) return;
    s.alumni.push({ personId: p.id, name: p.name.display, via, debuted: false, itGirl: false });
    if (s.alumni.length > KP.C.SCHOOLS.maxAlumni) s.alumni = s.alumni.slice(-KP.C.SCHOOLS.maxAlumni);
  };

  // a lead from a school: the lane shapes the source, the reputation
  // shapes the polish (a hot school's class arrives better drilled)
  KP.spawnSchoolLead = function (state, rng, school, opts) {
    const S = KP.C.SCHOOLS;
    KP.resetIds(state.nextPersonId || KP.peekNextId());
    const usedNames = new Set(Object.values(state.people).map(x => x.name.given.toLowerCase()));
    // the schools read the casting notices too (0.9.26.1) — a posted
    // boys' audition fills its submission slate with boys
    const wantBoys = (KP.openMandates ? KP.openMandates(state) : []).some(m =>
      m.kind !== 'solo' && (m.gender === 'm' || (!m.gender &&
        !KP.groups(state).some(g => g.debuted && !g.retiredWeek && g.gender === 'm'))));
    const gender = rng.chance(wantBoys ? KP.C.GEN.maleCastingShare
      : KP.C.GEN.maleLeadShare) ? 'm' : 'f';
    const p = KP.generatePerson(rng, { status: 'prospect', usedNames, gender,
      source: LANE_SOURCE[school.lane] });
    state.nextPersonId = KP.peekNextId();
    p.schoolId = school.id;
    p.channel = 'school';   // the public landscape (v0.9.35): every desk sees a showcase
    // the school map (v0.10.14, §83 C): the city sets the pond — a
    // Seoul class arrives better drilled than a Daejeon class at the
    // same reputation. Depth is training, not destiny: ceilings untouched
    const cw = (cityRow(school.cityId) || { w: 0.6 }).w;
    const depth = Math.round((cw - 0.5) / 0.5 * S.depthTalentSpan);
    const repBonus = school.rep > S.baseRep
      ? Math.round((school.rep - S.baseRep) / (100 - S.baseRep) * S.repTalentBonus) : 0;
    if (repBonus + depth > 0) {
      const laneKeys = school.lane === 'allround' ? ['vocals', 'dance'] : [school.lane];
      laneKeys.forEach(k => {
        const t = p.talents[k];
        const lift = school.lane === 'allround'
          ? Math.round((repBonus + depth) / 2) : repBonus + depth;
        t.cur = Math.min(t.ceilLo - 1, t.cur + lift);
      });
    }
    if ((opts || {}).firstLook) {
      p.observations = Math.max(p.observations || 0, S.partnerObs);
      p.flags.firstLookUntil = state.week + S.firstLookWeeks;
    }
    if ((opts || {}).observed) p.observations = Math.max(p.observations || 0, 1);
    state.people[p.id] = p;
    state.prospects.push(p.id);
    KP.socialOf(state, p);   // minted at the door, like every arrival
    // a trip or a partnership IS a real look (0.9.17.1): those files
    // arrive with a DATED read — that is exactly what the money bought
    if ((p.observations || 0) > 0) KP.takeReads(state, p);
    return p;
  };

  // ---- the weekly phase --------------------------------------------------
  // Order 620: after releases (600) and the practice room (610), so this
  // week's debuts and virals move this week's reputations.
  KP.registerWeekly('schools', 620, function (state, rng, inbox) {
    const S = KP.C.SCHOOLS;
    // migration: worlds born before the schools get them on the next tick
    if (!state.schools) {
      KP.generateSchools(state, rng);
      inbox.push({ kind: 'industry', text: 'Scout Im filed a memo nobody asked for and everybody needed: a directory of the regional training schools — ' +
        state.schools.map(s => s.name + ' (' + s.city + ')').join(', ') + '. The talent was never only in Seoul.' });
    }

    // ---- reputations move with the graduates ---------------------------
    state.schools.forEach(s => {
      s.alumni.forEach(a => {
        const p = state.people[a.personId];
        if (!p) return;
        if (!a.debuted && p.status === 'idol') {
          a.debuted = true;
          s.rep = KP.clamp(s.rep + S.repDebut, 0, 100);
          inbox.push({ kind: 'industry', text: s.name + ' hung another photo in the lobby: ' + KP.displayName(p) +
            ' debuted this side of the industry, and the school made sure the local paper knew where the footwork came from.' });
        }
        if (p.lastViral && p.lastViral.week === state.week) {
          s.rep = KP.clamp(s.rep + S.repViral, 0, 100);
        }
        if (!a.itGirl && KP.getNarrative(state, 'itGirl', 'idol', p.id)) {
          a.itGirl = true;
          s.rep = KP.clamp(s.rep + S.repItGirl, 0, 100);
        }
      });
      // fame fades toward the base absent fresh news (~a dozen points a
      // year at full distance; kept to two decimals so saves stay tidy)
      s.rep = Math.round((s.rep + (S.baseRep - s.rep) * S.repDrift * 0.1) * 100) / 100;
      // the trades notice the crossing, both ways (down goes quietly)
      if (!s.hot && s.rep >= S.hotAt) {
        s.hot = true; s.hotWeek = state.week;
        inbox.push({ kind: 'public', ind: 'schoolHot', priority: 'high', schoolId: s.id,
          text: 'The trades made it official: ' + s.name + ' in ' + s.city + ' is HOT. Enough of its graduates are on real stages that the auditions line now wraps the block, and every A&R department keeps the ' + s.city + ' train schedule pinned up.' });
      } else if (s.hot && s.rep < S.hotAt - 10) {
        s.hot = false;
      }
      if (s.partnerUntil && state.week === s.partnerUntil) {
        inbox.push({ kind: 'scouting', text: 'The first-look agreement with ' + s.name + ' lapsed. Their best files go back on the open market — where everyone else has been waiting.' });
      }
    });

    // ---- the map breathes (v0.10.14, §83 B) ----------------------------
    state.schoolLedger = state.schoolLedger || { opened: 0, closed: 0 };
    if (!state.nextSchoolId) {
      state.nextSchoolId = state.schools.reduce((m, s) =>
        Math.max(m, parseInt(s.id.slice(3), 10) || 0), 0) + 1;
    }
    // the closing: half a year under the waterline, unpartnered, and the
    // weekly dice can call it — the map never thins below the floor
    state.schools.forEach(s => {
      if (s.rep < S.closeRep && !(s.partnerUntil > state.week)) {
        if (!s.lowSince) s.lowSince = state.week;
      } else delete s.lowSince;
    });
    const dying = state.schools.find(s =>
      s.lowSince && state.week - s.lowSince >= S.closeAfterWeeks);
    if (dying && state.schools.length > S.floorSchools && rng.chance(S.closeChance)) {
      state.schools = state.schools.filter(s => s !== dying);
      Object.values(state.people).forEach(p => {
        // §84 A: the students we never met scatter with the school —
        // the fog closes over them for good
        if (p.schoolId === dying.id && p.status === 'student') {
          delete state.people[p.id];
          return;
        }
        if (p.schoolId === dying.id) delete p.schoolId;
      });
      state.schoolLedger.closed++;
      const wasHome = KP.homeCity && dying.cityId === KP.homeCity(state);
      inbox.push({ kind: 'industry', ind: 'schoolClosed', priority: wasHome ? 'high' : 'normal',
        text: dying.name + ' in ' + dying.city + ' closed its doors — too many quiet years, and the lease does not care about potential. The space is becoming a math hagwon; the mirrors sold separately.' +
          (wasHome ? ' That was the academy up the road. The neighborhood kids train in front of shop windows now, and the scouts noticed the same thing you did: somebody should build a room here.' :
            ' The current class scattered to whoever answered the phone.') });
    }
    // the opening: a new door toward the cap, cities drawn by gravity —
    // and a famous local label pulls the scene home
    if (state.schools.length < S.maxSchools && rng.chance(S.openChance)) {
      const home = KP.homeCity ? KP.homeCity(state) : 'seoul';
      const famous = KP.fameRead && KP.fameRead(state) >= 0.30;
      const cid = drawCity(rng, famous && home !== 'seoul' ? home : null, S.openHomeFameBonus);
      const lane = rng.pick(['vocals', 'dance', 'allround']);
      const born = mkSchool(state, rng, cid, lane, rng.int(30, 46));
      state.schools.push(born);
      fillClass(state, rng, born);   // §84 A: a new door opens with a room behind it
      state.schoolLedger.opened++;
      inbox.push({ kind: 'industry', ind: 'schoolOpened',
        priority: cid === home ? 'high' : 'normal',
        text: born.name + ' opened in ' + born.city + ' — new mirrors, a rented floor, and a director with strong opinions about the ' +
          LANE_LABELS[lane] + ' fundamentals. Every school on the map started exactly this unproven.' +
          (cid === home && home !== 'seoul' ? ' It is a ten-minute walk from this office, and everyone involved knows exactly whose alumni wall they are hoping to build.' : '') });
    }

    // ---- the persistent class breathes (v0.10.17, §84 A+B) -------------
    // They always exist; we just don't know who they are. Old worlds get
    // their tempers and their rooms on this tick — the fog was always there.
    const CL = S.CLASS;
    state.schools.forEach(s => {
      if (!s.temper) {
        s.temper = TEMPERS[Math.floor(KP.hash01([state.seed, s.id, 'temper'].join('|')) * TEMPERS.length)];
      }
      if (!s.classBuilt) fillClass(state, rng, s);
      const cls = KP.schoolClass(state, s);
      // a seat opens, a kid moves cities, the room refills toward the size
      if (cls.length < classTarget(s) && rng.chance(CL.enrollChance)) enrollStudent(state, rng, s);
      cls.forEach(p => {
        // graduation: at the leaving age, the ones we never met walk out
        // of the game — the fog does not owe you a forwarding address
        if (p.age >= CL.leaveAge) {
          delete state.people[p.id];
          schoolLedgerOf(state).graduated = (schoolLedgerOf(state).graduated || 0) + 1;
          if (s.visitedWeek) {
            inbox.push({ kind: 'scouting', priority: 'flavor',
              text: 'A face aged out of ' + s.name + '’s class this season — one of the students Scout Im never got a read on. Somewhere in ' + s.city + ' a family is having the conversation about college. The board will never know what it missed, which is the point of visiting more often.' });
          }
          return;
        }
        // training in the dark: the lane grows toward the cone's floor
        if (rng.chance(CL.growChance)) {
          const keys = s.lane === 'allround' ? ['vocals', 'dance'] : [s.lane];
          keys.forEach(k => {
            const t = p.talents[k];
            t.cur = Math.min(t.ceilLo - 1, t.cur + 1);
          });
        }
        // the fog poach (§84 B): a student the industry already knows can
        // be signed away before you ever meet her — the clock ticks in
        // the dark, and the trades do not cover academy paperwork
        if (p.industryKnown && rng.chance(CL.fogPoachChance)) {
          const top = (state.rivals || []).slice()
            .sort((a, b) => (b.prestige || 0) - (a.prestige || 0))[0];
          if (top) {
            p.status = 'rival';
            p.company = top.short;
            KP.schoolRecordAlum(state, p, top.short);
            top.rosterCount = (top.rosterCount || 0) + 1;
            (state.rivals || []).forEach(r => { if (r.interest) delete r.interest[p.id]; });
            schoolLedgerOf(state).fogPoached = (schoolLedgerOf(state).fogPoached || 0) + 1;
            if (s.visitedWeek) {
              inbox.push({ kind: 'scouting', ind: 'fogPoach', priority: 'high',
                text: top.short + ' signed a trainee contract out of ' + s.name + ' this week — a student Scout Im never got in front of. Their scouts knew the name before we knew the face. That is what a scouting department the size of a building buys.' });
            }
          }
        }
      });
    });

    // ---- casting is open: the schools submit ---------------------------
    const S2 = KP.C.SCOUT;
    const castingOpen = !!state.project || (state.rivals || []).some(r =>
      r.nextDebutWeek != null && state.week >= r.nextDebutWeek - S2.rivalHungerWindow);
    if (castingOpen && rng.chance(S.classChance)) {
      // §83 C: bigger cities submit more — Seoul's schools can field a
      // class every casting season; a small-town academy, not always
      const weighted = state.schools.map(s => ({ s,
        w: (1 + Math.pow(s.rep / 40, 2)) *
           (S.depthClassWeight + (cityRow(s.cityId) || { w: 0.6 }).w) }));
      const total = weighted.reduce((sum, x) => sum + x.w, 0);
      let roll = rng.next() * total;
      let school = weighted[weighted.length - 1].s;
      for (const x of weighted) { roll -= x.w; if (roll <= 0) { school = x.s; break; } }
      // §84 A: a showcase reveals REAL students — the same people a trip
      // would have met. Nothing is minted; the class is the class.
      const pool = KP.schoolClass(state, school);
      const n = Math.min(pool.length, rng.int(S.classSize[0], S.classSize[1]));
      if (n > 0) {
        school.classesSent = (school.classesSent || 0) + 1;
        const names = [];
        const circling = [];
        for (let i = 0; i < n; i++) {
          const p = pool.splice(rng.int(0, pool.length - 1), 1)[0];
          revealStudent(state, p, { observations: 1,
            firstLook: school.partnerUntil > state.week });
          if (p.industryKnown) circling.push(KP.displayName(p));
          names.push(KP.displayName(p) + ', ' + p.age);
        }
        inbox.push({ kind: 'scouting', ind: 'schoolClass',
          text: 'Casting is open somewhere in this industry and ' + school.name + ' (' + school.city + ') can smell it: students from their current class auditioned this week — ' +
            names.join('; ') + '. The school’s stamp is on the files' +
            (school.partnerUntil > state.week ? ', and our first-look agreement means we read them before anyone else circles' : ', and every company in town got the same tape') + '.' +
            (circling.length ? ' One thing the tape does not show: ' + circling.join(' and ') + (circling.length > 1 ? ' were' : ' was') + ' already in bigger companies’ files before this week.' : '') });
      }
    }
  });

  // ---- the player verbs --------------------------------------------------
  KP.scoutingTrip = function (state, schoolId) {
    const S = KP.C.SCHOOLS;
    const s = KP.schoolById(state, schoolId);
    if (!s) return { ok: false, reason: 'No such school on the map.' };
    // the atlas (v0.10.12, §82 A): the home-city school is up the road —
    // owner: "scouting the local school should essentially be free"
    const tripCost = KP.schoolTripCost(state, s);
    const local = s.cityId === (KP.homeCity ? KP.homeCity(state) : 'seoul');
    if (state.budget < tripCost) return { ok: false, reason: 'No budget for the train ticket, let alone the trip.' };
    if (s.visitedWeek && state.week - s.visitedWeek < S.tripCooldownWeeks) {
      return { ok: false, reason: 'The staff were just there. A second visit this soon reads as desperation.' };
    }
    // one trip per week (0.9.16.1, owner: "my scout shouldn't be able to
    // hit every school in one week") — Scout Im is one person on one train
    if ((state.schools || []).some(s2 => s2.visitedWeek === state.week)) {
      return { ok: false, reason: 'Scout Im is already on a train this week. The regions are not going anywhere.' };
    }
    const rng = KP.rngFor(state);
    state.budget -= tripCost;
    s.visitedWeek = state.week;
    let sharpened = 0;
    (state.prospects || []).forEach(id => {
      const p = state.people[id];
      if (p && p.schoolId === s.id && (p.observations || 0) < KP.C.SCOUT.maxObservations) {
        p.observations = (p.observations || 0) + 1;
        sharpened++;
      }
    });
    // §84 A: the trip reveals who was ALWAYS in the room — the back row
    // shows you one or two of the students you had not met yet
    const CL = S.CLASS;
    const pool = KP.schoolClass(state, s);
    const reveal = Math.min(pool.length, rng.int(CL.revealPerTrip[0], CL.revealPerTrip[1]));
    const partnered = s.partnerUntil > state.week;
    const met = [];
    const calls = [];
    let knownAlready = 0;
    for (let i = 0; i < reveal; i++) {
      const p = pool.splice(rng.int(0, pool.length - 1), 1)[0];
      revealStudent(state, p, { observations: partnered ? S.partnerObs : 1,
        firstLook: partnered });
      if (p.industryKnown) knownAlready++;
      met.push(KP.displayName(p) + ', ' + p.age);
      // §84 C: a look IS interest, and interest is a tell — the director
      // watched Scout Im watch her
      const call = KP.schoolInterestShown(state, rng, p);
      if (call) calls.push(call);
    }
    const left = KP.schoolClass(state, s).length;
    state.rngState = rng.state();
    const note = { kind: 'scouting', ind: 'schoolTrip',
      text: (local
        ? 'Scout Im walked to ' + s.name + ' — the home-town academy, ten minutes up the road, no train ticket. A day watching the ' + LANE_LABELS[s.lane] + ' classes from the back row. '
        : 'Scout Im took the ' + s.city + ' train: a day at ' + s.name + ' watching the ' + LANE_LABELS[s.lane] + ' classes from the back row. ') +
        (sharpened ? 'Sharper reads on ' + sharpened + ' file' + (sharpened === 1 ? '' : 's') + ' already on our board. ' : '') +
        (met.length
          ? 'New name' + (met.length === 1 ? '' : 's') + ' worth the notebook: ' + met.join('; ') + '.' +
            (knownAlready ? ' The notebook had company — ' + knownAlready + ' of them ' + (knownAlready === 1 ? 'was' : 'were') + ' already in bigger companies’ files before we ever sat down.' : '')
          : 'No new faces this term — we know this class already.') +
        (left ? ' The class is bigger than one visit: ' + left + ' more student' + (left === 1 ? '' : 's') + ' train in that room whom we have not met.' : ' There is nobody left in that room we have not met.') +
        ' The room smelled like floor polish and ambition.' };
    KP.note(state, note);
    calls.forEach(c => KP.note(state, c));
    return { ok: true, note };
  };

  // §84 E, one truth for the gate: a nothing label's retainer is refused.
  // Real fame, or a school kid you took all the way to a debut stage.
  KP.schoolPartnerLocked = function (state) {
    const fame = KP.fameRead ? KP.fameRead(state) : 0;
    if (fame >= KP.C.SCHOOLS.partnerFameBar) return false;
    return !Object.values(state.people).some(p => p.status === 'idol' && p.schoolId);
  };
  KP.schoolPartnership = function (state, schoolId) {
    const S = KP.C.SCHOOLS;
    const s = KP.schoolById(state, schoolId);
    if (!s) return { ok: false, reason: 'No such school on the map.' };
    if (s.partnerUntil > state.week) return { ok: false, reason: 'The agreement with ' + s.name + ' is already running.' };
    if (KP.schoolPartnerLocked(state)) {
      return { ok: false, reason: s.name + '’s director took the meeting, kept the coffee short, and declined the retainer. A first look is for labels that can DO something with one — come back with a real name, or with one of these kids on a debut stage. The director ' + TEMPER_PROSE[s.temper] + '; none of that helps an unknown letterhead.' };
    }
    // the school map (v0.10.14, §83 D): the retainer prices the school's
    // name and the distance to its door
    const cost = KP.schoolPartnerCost(state, s);
    if (state.budget < cost) return { ok: false, reason: 'The retainer is ' + cost + ' — a school with this name, this far away, bills like it. We do not have it.' };
    state.budget -= cost;
    s.partnerUntil = state.week + S.partnerWeeks;
    const note = { kind: 'scouting', ind: 'schoolPartner',
      text: 'Signed: a first-look partnership with ' + s.name + ' (' + s.city + '). For the next half year their best files reach our desk pre-read, before any rival scout gets a seat at their showcases. The headmaster framed the agreement. We framed the invoice.' };
    KP.note(state, note);
    return { ok: true, note };
  };

  // ---- the timeline reacts -----------------------------------------------
  KP.onFeedEvent('schoolHot', (state, n, rng) => {
    const s = KP.schoolById(state, n.schoolId);
    const name = s ? s.name : 'that academy';
    return rng.pick([
      { persona: 'casual', text: 'apparently half the good rookies this year came out of ' + name + '. regional pipeline supremacy, the industry map keeps getting bigger' },
      { persona: 'fan', text: 'the ' + name + ' practice-room videos from before the debut are surfacing and the glow-up documentation is UNMATCHED. schools keep receipts' },
      { persona: 'stan', text: 'scouts camping outside ' + name + ' now. imagine being 15 in that hallway knowing the industry learned your school’s name' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
