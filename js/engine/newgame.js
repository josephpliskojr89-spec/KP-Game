/* New-career setup: the opening scenario.
   A mid-sized agency known for vocalists, six years without a girl-group hit.
   A new executive gives the player 18 months (72 weeks) to debut a 4–6
   member girl group. Six inherited trainees; budget for three signings. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  KP.newGame = function (seed, playerName) {
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
      executive: { name: exec.name, personality: exec.personality, intro: exec.intro },
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

    // --- external prospect board
    const count = rng.int(KP.C.GEN.prospectCount[0], KP.C.GEN.prospectCount[1]);
    let mostCharismatic = null;
    for (let i = 0; i < count; i++) {
      const p = KP.generatePerson(rng, { status: 'prospect', usedNames });
      state.people[p.id] = p;
      state.prospects.push(p.id);
      if (!mostCharismatic || p.talents.charisma.cur > mostCharismatic.talents.charisma.cur) mostCharismatic = p;
    }
    // scenario beat: two rivals already circle the most charismatic prospect
    if (mostCharismatic) {
      state.rivals.forEach(r => { r.interest[mostCharismatic.id] = 2; });
    }

    // --- opening inbox
    const open = [
      { kind: 'executive', urgent: true, text: state.executive.name + ' — ' + exec.intro + ' The directive is on your desk: a 4–6 member girl group, debuted within 18 months. Budget covers three external signings.' },
      { kind: 'scouting', text: 'Scout Im left the prospect board on your desk with a sticky note: “The good ones never wait. Neither do Novaline and Aurum.”' },
      { kind: 'company', text: 'Welcome to ' + state.company.name + '. ' + KP.DATA.playerCompany.reputationLine },
    ];
    open.forEach(n => { n.week = 1; n.read = false; n.id = 'm' + (state.nextMsgId++); });
    state.inbox = open;

    state.nextPersonId = KP.peekNextId();
    state.rngState = rng.state();
    return state;
  };
})(typeof window !== 'undefined' ? window : globalThis);
