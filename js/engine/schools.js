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
    return {
      id: 'sch' + (state.nextSchoolId++), name, cityId, city: c.label, lane,
      rep: rep + artsRep,
      alumni: [], hot: false, hotWeek: null,
      visitedWeek: null, partnerUntil: 0,
    };
  }
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
      state.schoolLedger.opened++;
      inbox.push({ kind: 'industry', ind: 'schoolOpened',
        priority: cid === home ? 'high' : 'normal',
        text: born.name + ' opened in ' + born.city + ' — new mirrors, a rented floor, and a director with strong opinions about the ' +
          LANE_LABELS[lane] + ' fundamentals. Every school on the map started exactly this unproven.' +
          (cid === home && home !== 'seoul' ? ' It is a ten-minute walk from this office, and everyone involved knows exactly whose alumni wall they are hoping to build.' : '') });
    }

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
      school.classesSent = (school.classesSent || 0) + 1;
      const n = rng.int(S.classSize[0], S.classSize[1]);
      const names = [];
      for (let i = 0; i < n; i++) {
        const p = KP.spawnSchoolLead(state, rng, school,
          { firstLook: school.partnerUntil > state.week });
        names.push(KP.displayName(p) + ', ' + p.age);
      }
      inbox.push({ kind: 'scouting', ind: 'schoolClass',
        text: 'Casting is open somewhere in this industry and ' + school.name + ' (' + school.city + ') can smell it: their current class auditioned this week — ' +
          names.join('; ') + '. The school’s stamp is on the files' +
          (school.partnerUntil > state.week ? ', and our first-look agreement means we read them before anyone else circles' : ', and every company in town got the same tape') + '.' });
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
    const lead = KP.spawnSchoolLead(state, rng, s, { observed: true, firstLook: s.partnerUntil > state.week });
    state.rngState = rng.state();
    const note = { kind: 'scouting', ind: 'schoolTrip',
      text: (local
        ? 'Scout Im walked to ' + s.name + ' — the home-town academy, ten minutes up the road, no train ticket. A day watching the ' + LANE_LABELS[s.lane] + ' classes from the back row. '
        : 'Scout Im took the ' + s.city + ' train: a day at ' + s.name + ' watching the ' + LANE_LABELS[s.lane] + ' classes from the back row. ') +
        (sharpened ? 'Sharper reads on ' + sharpened + ' file' + (sharpened === 1 ? '' : 's') + ' already on our board, and one' : 'One') +
        ' new name worth the notebook: ' + KP.displayName(lead) + ', ' + lead.age + '. The room smelled like floor polish and ambition.' };
    KP.note(state, note);
    return { ok: true, note };
  };

  KP.schoolPartnership = function (state, schoolId) {
    const S = KP.C.SCHOOLS;
    const s = KP.schoolById(state, schoolId);
    if (!s) return { ok: false, reason: 'No such school on the map.' };
    if (s.partnerUntil > state.week) return { ok: false, reason: 'The agreement with ' + s.name + ' is already running.' };
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
