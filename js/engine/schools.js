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

  // ---- creation (newgame calls this; the weekly phase migrates) ---------
  KP.generateSchools = function (state, rng) {
    const S = KP.C.SCHOOLS;
    const cities = KP.C.TOUR.KR_CITIES;
    const used = new Set();
    // every lane exists somewhere; the rest of the map rolls its own mix
    const lanes = ['vocals', 'dance', 'allround'];
    while (lanes.length < cities.length) lanes.push(rng.pick(['vocals', 'dance', 'allround']));
    // deterministic shuffle so Seoul is not always the vocal town
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      const t = lanes[i]; lanes[i] = lanes[j]; lanes[j] = t;
    }
    state.schools = cities.map((c, i) => {
      const lane = lanes[i];
      const pool = NAME_POOLS[lane].filter(n => !used.has(n));
      const name = pool.length ? rng.pick(pool) : NAME_POOLS[lane][0] + ' ' + c.label;
      used.add(name);
      return {
        id: 'sch' + (i + 1), name, cityId: c.id, city: c.label, lane,
        rep: rng.int(S.startRep[0], S.startRep[1]),
        alumni: [], hot: false, hotWeek: null,
        visitedWeek: null, partnerUntil: 0,
      };
    });
    return state.schools;
  };

  KP.schoolById = function (state, id) {
    return (state.schools || []).find(s => s.id === id) || null;
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
    const gender = rng.chance(KP.C.GEN.maleLeadShare) ? 'm' : 'f';
    const p = KP.generatePerson(rng, { status: 'prospect', usedNames, gender,
      source: LANE_SOURCE[school.lane] });
    state.nextPersonId = KP.peekNextId();
    p.schoolId = school.id;
    if (school.rep > S.baseRep) {
      const bonus = Math.round((school.rep - S.baseRep) / (100 - S.baseRep) * S.repTalentBonus);
      const laneKeys = school.lane === 'allround' ? ['vocals', 'dance'] : [school.lane];
      laneKeys.forEach(k => {
        const t = p.talents[k];
        const lift = school.lane === 'allround' ? Math.round(bonus / 2) : bonus;
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

    // ---- casting is open: the schools submit ---------------------------
    const S2 = KP.C.SCOUT;
    const castingOpen = !!state.project || (state.rivals || []).some(r =>
      r.nextDebutWeek != null && state.week >= r.nextDebutWeek - S2.rivalHungerWindow);
    if (castingOpen && rng.chance(S.classChance)) {
      const weighted = state.schools.map(s => ({ s, w: 1 + Math.pow(s.rep / 40, 2) }));
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
    if (state.budget < S.tripCost) return { ok: false, reason: 'No budget for the train ticket, let alone the trip.' };
    if (s.visitedWeek && state.week - s.visitedWeek < S.tripCooldownWeeks) {
      return { ok: false, reason: 'The staff were just there. A second visit this soon reads as desperation.' };
    }
    const rng = KP.rngFor(state);
    state.budget -= S.tripCost;
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
      text: 'Scout Im took the ' + s.city + ' train: a day at ' + s.name + ' watching the ' + LANE_LABELS[s.lane] + ' classes from the back row. ' +
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
    if (state.budget < S.partnerCost) return { ok: false, reason: 'A retainer is real money, and we do not have it.' };
    state.budget -= S.partnerCost;
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
