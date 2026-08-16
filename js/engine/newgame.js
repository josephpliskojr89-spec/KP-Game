/* New-career setup: the opening scenario.
   A mid-sized agency known for vocalists, six years without a girl-group hit.
   A new executive gives the player 18 months (72 weeks) to debut a 4–6
   member girl group. Six inherited trainees; budget for three signings. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // opts.legacy === false skips the last-group seed (v0.9.10) — the
  // mechanism suites run lean; the real game, the harness, and
  // suite_052 always open with the last group in the building
  KP.newGame = function (seed, playerName, opts) {
    const rng = new KP.Rng(seed == null ? String(Math.floor(Date.now() % 1e9)) : seed);
    KP.resetIds(1);

    const exec = rng.pick(KP.DATA.executives);
    const state = {
      version: KP.C.VERSION,
      seed: rng.seed,
      week: 1,
      nextMsgId: 1,
      player: { name: playerName || 'You', title: 'A&R Manager' },
      company: {
        name: KP.DATA.playerCompany.name,
        short: KP.DATA.playerCompany.short,
        reputation: { vocal: 72, girlGroup: 28, starMaker: 35, performance: 45 },
      },
      executive: { name: exec.name, gender: exec.gender || 'f', personality: exec.personality, intro: exec.intro },
      trust: KP.C.EXEC.startTrust,
      budget: KP.C.ECON.startBudget,
      signingsAllowed: 3,        // the tutorial rail — lifts at first debut
      signingsUsed: 0,
      fiscal: { monthStartBudget: KP.C.ECON.startBudget, pressure: 0, monthSignings: 0 },
      objective: {
        type: 'debutGirlGroup',
        text: 'Assemble and debut a 4–6 member girl group within 18 months.',
        minMembers: KP.C.GROUP.minMembers,
        maxMembers: KP.C.GROUP.maxMembers,
        deadlineWeek: 72,
        status: 'open',
      },
      people: {},
      roster: [],
      prospects: [],
      rivals: KP.DATA.rivalCompanies.slice(0, KP.C.RIVALS.count).map(r => ({
        name: r.name, short: r.short, philosophy: r.philosophy, blurb: r.blurb,
        interest: {}, rosterCount: rng.int(8, 16), recentMoves: [],
      })),
      relationships: {},
      groups: [],
      nextGroupId: 1,
      inbox: [],
      eventCooldowns: {},
      rngState: null,
    };

    // --- inherited trainees: the scenario's two teaching characters + four
    const usedNames = new Set();
    for (let i = 0; i < KP.C.GEN.inheritedCount; i++) {
      const p = KP.generatePerson(rng, { status: 'trainee', inherited: true, source: 'Inherited trainee', usedNames });
      // inherited kids carry inherited paper (v0.9.19): a year already
      // served on the standard three-year term
      p.traineeContract = { start: 1 - KP.C.WEEKS_PER_YEAR, years: KP.C.TRAINEE_CONTRACT.years, term: 1 };
      if (i === 0) {
        // exceptional vocalist, poor dance aptitude
        p.talents.vocals.cur = rng.int(72, 82);
        p.talents.vocals.ceilLo = p.talents.vocals.cur + 4;
        p.talents.vocals.ceilHi = Math.min(100, p.talents.vocals.cur + rng.int(10, 16));
        p.talents.dance.cur = rng.int(22, 32);
        p.talents.dance.ceilHi = Math.min(p.talents.dance.cur + 18, 55);
        p.talents.dance.ceilLo = Math.min(p.talents.dance.cur + 6, p.talents.dance.ceilHi - 4);
        if (!p.archetypes.includes('naturalVocalist')) p.archetypes.push('naturalVocalist');
      }
      if (i === 1) {
        // technically average; everyone watches her anyway
        KP.C.TALENTS.forEach(d => {
          const tal = p.talents[d];
          tal.cur = rng.int(40, 52);
          tal.ceilLo = Math.max(tal.ceilLo, tal.cur + 4);
          tal.ceilHi = Math.min(100, Math.max(tal.ceilHi, tal.ceilLo + 6));
        });
        p.talents.charisma.cur = rng.int(48, 56);
        p.talents.charisma.ceilLo = 78;
        p.talents.charisma.ceilHi = rng.int(88, 96);
        p.talents.charisma.growth = 1.8;
        if (!p.archetypes.includes('centerCandidate')) p.archetypes.push('centerCandidate');
        p.observations = 1; // the fog is part of her story
      }
      state.people[p.id] = p;
      state.roster.push(p.id);
      p.history.push({ week: 0, text: 'Already in the building when you took the job.' });
    }

    if (!opts || opts.legacy !== false) legacySeed();
    function legacySeed() {
    // --- the last group (v0.9.10): the intro was always true, now the
    // game is. "The last group still sells, but it is aging out of its
    // peak" — four vocalists deep in their contract years, a fading but
    // real fanbase, a discography with a visible decline, and renewal
    // folders that will reach the Desk within the first months. The
    // roster keeps trainees FIRST — the legacy members ride behind them.
    {
      const LG = { debutWeek: -252, pop: 56 };   // 5.25 years on the clock
      const memberIds = [];
      for (let i = 0; i < 4; i++) {
        const p = KP.generatePerson(rng, { status: 'idol', usedNames, gender: 'f',
          age: rng.int(23, 26) });
        // the vocal powerhouse, embodied: polished, road-worn, formed
        p.talents.vocals.cur = rng.int(66, 80);
        p.talents.dance.cur = rng.int(52, 64);
        p.talents.charisma.cur = rng.int(56, 70);
        p.talents.visuals.cur = rng.int(52, 68);
        KP.C.TALENTS.forEach(d => {
          const tal = p.talents[d];
          tal.ceilLo = Math.max(tal.ceilLo, tal.cur + 1);
          tal.ceilHi = Math.max(tal.ceilHi, tal.ceilLo + 3);
        });
        p.liveExp = 90; p.mediaExp = 45;
        p.morale = rng.int(52, 64); p.fatigue = rng.int(25, 40);
        p.observations = 4;   // six years in the building — no fog left
        p.history.push({ week: LG.debutWeek, text: 'Debuted. The stage lights were everything the practice-room mirror promised.' });
        p.history.push({ week: 0, text: 'Year six of the contract when the new A&R manager arrived. Watched the introductions from the good chair in the practice room.' });
        state.people[p.id] = p;
        state.roster.push(p.id);
        memberIds.push(p.id);
      }
      const members = memberIds.map(id => state.people[id]);
      const roles = KP.roleHints(state, members);
      state.nextGroupId = state.nextGroupId || 1;
      const g = {
        id: 'g' + (state.nextGroupId++),
        type: 'group', gender: 'f',
        name: KP.suggestGroupNames(state, rng)[0],
        members: memberIds.slice(),
        roles: Object.assign({}, roles),
        formedWeek: LG.debutWeek - 60,
        centerHistory: [{ week: LG.debutWeek - 60, id: roles.center }],
        debuted: true, debutWeek: LG.debutWeek,
        prep: null, results: null, demos: null,
        popularity: LG.pop,
        lastReleaseWeek: -60,
        // keep the calendar coherent: their last promo ended a year ago,
        // so the studio is open to them on your first morning
        promoUntil: -60 + KP.C.COMEBACK.promoWeeks,
        concept: 'elegant', conceptRun: 2,
        // two per stage — real hardware for a six-year act, but well
        // short of darlingAt (7): the dynasty narrative still takes five
        // wins earned on the player's watch, not inherited
        trophies: { countdown: 2, popWave: 2 },
        releases: [],
      };
      // the discography tells the story: a real peak, then the slide
      [[LG.debutWeek, 74, 1, 6, 'single', true],
       [-160, 67, 2, 12, 'mini', false],
       [-60, 58, 5, 22, 'mini', false]].forEach(([wk, rec, peak, natPeak, fmt, isDebut]) => {
        g.releases.push({ week: wk, songTitle: KP.genSongTitle(rng, {}),
          conceptId: 'elegant', reception: rec, receptionBand: rec >= 64 ? 'strong' : 'solid',
          chartPeak: peak, chartWeeks: 8, nationalPeak: natPeak, nationalWeeks: 8,
          isDebut, format: fmt, tracks: fmt === 'single' ? 1 : 5, tracklist: [] });
      });
      g.fandom = { name: KP.fandomNameOptions(state, g)[0], color: 'pearl ivory',
        since: -200, intensity: 42 };
      state.groups.push(g);
      g.legacy = true;   // start-content marker (UI + census may read it)
      g.gen = KP.C.RISEFALL.GEN.start - 1;   // the last group is LAST-gen (v0.9.24)
      KP.assignRooms(state, g);
      state.firstShowWinWeek = -180;   // their trophies predate you
    }
    }

    // --- the regional schools (v0.9.16): the map exists before you do
    KP.generateSchools(state, rng);

    // --- external prospect board
    const count = rng.int(KP.C.GEN.prospectCount[0], KP.C.GEN.prospectCount[1]);
    let mostCharismatic = null;
    for (let i = 0; i < count; i++) {
      // the opening board leans female (the mandate is a girl group) but
      // is not exclusively so — the second act starts on day one (v0.8.4)
      const gender = rng.chance(KP.C.GEN.maleBoardShare) ? 'm' : 'f';
      const p = KP.generatePerson(rng, { status: 'prospect', usedNames, gender });
      // academy kids carry their academy's name on the file
      if (p.source === 'Vocal academy' || p.source === 'Dance academy') {
        const lane = p.source === 'Vocal academy' ? 'vocals' : 'dance';
        const homes = state.schools.filter(s => s.lane === lane || s.lane === 'allround');
        if (homes.length) p.schoolId = rng.pick(homes).id;
      }
      state.people[p.id] = p;
      state.prospects.push(p.id);
      if (!mostCharismatic || p.talents.charisma.cur > mostCharismatic.talents.charisma.cur) mostCharismatic = p;
    }
    // scenario beat: two rivals already circle the most charismatic prospect
    if (mostCharismatic) {
      state.rivals.forEach(r => { r.interest[mostCharismatic.id] = 2; });
    }

    // --- the living world (v0.4.0): rivals arrive with prestige, running
    //     acts and a debut calendar; the chart and the feed open mid-story
    KP.seedIndustry(state, rng);

    // --- opening inbox
    const open = [
      { kind: 'executive', urgent: true, text: state.executive.name + ' — ' + exec.intro + ' The directive is on your desk: a 4–6 member girl group, debuted within 18 months. Budget covers three external signings.' },
      { kind: 'scouting', text: 'Scout Im left the prospect board on your desk with a sticky note: “The good ones never wait. Neither do Novaline and Aurum.”' },
      { kind: 'company', text: 'Welcome to ' + state.company.name + '. ' + KP.DATA.playerCompany.reputationLine },
    ];
    open.forEach(n => { n.week = 1; n.read = false; n.id = 'm' + (state.nextMsgId++); });
    state.inbox = open;

    // every face gets its public number at the door (v0.6.3)
    KP.mintSocialAll(state);

    state.nextPersonId = KP.peekNextId();
    state.rngState = rng.state();
    return state;
  };
})(typeof window !== 'undefined' ? window : globalThis);
