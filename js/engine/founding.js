/* The founding (v0.9.9) — Phase C opens.
   Owner: "I'm not the CEO, I work below them... an option, after your
   reputation is high enough, to leave and start your own label.
   completely fresh start, going up against what you built."

   The door: exec trust + a real body of work unlock it; the war chest
   is your career, liquidated — daesangs, bonsangs, national #1s,
   trophies, years served. Walking through it turns the company you
   built into a RIVAL, your groups into its acts, your idols into its
   idols (files forever), and hands you an empty roster, a new
   investor, and eighteen months to prove it was you all along. The
   world clock keeps running. The flagships will hunt you. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function careerHonors(state) {
    const F = KP.C.FOUNDING;
    const mine = (state.awardHistory || []).filter(a => a.isPlayer);
    const daesangs = mine.filter(a => a.category === 'daesang').length;
    const bonsangs = mine.length - daesangs;
    const natOnes = KP.groups(state).reduce((s, g) =>
      s + (g.releases || []).filter(r => r.nationalPeak === 1).length, 0);
    const trophies = KP.groups(state).reduce((s, g) =>
      s + Object.values(g.trophies || {}).reduce((x, n) => x + n, 0), 0);
    const years = Math.floor((state.week - 1) / KP.C.WEEKS_PER_YEAR);
    return { daesangs, bonsangs, natOnes, trophies, years,
      warChest: Math.min(F.seedCap, Math.round(F.seedBase +
        daesangs * F.seedPerDaesang + bonsangs * F.seedPerBonsang +
        natOnes * F.seedPerNatOne + trophies * F.seedPerTrophy +
        years * F.seedPerYear)) };
  }

  KP.foundingEligible = function (state) {
    const F = KP.C.FOUNDING;
    const h = careerHonors(state);
    const reasons = [];
    if (state.founded) reasons.push('You already walked through this door once.');
    if (state.trust < F.trustAt) reasons.push(KP.fillPro('The exec’s trust is the collateral — investors call {her} first. (needs ' + F.trustAt + ')', KP.execP(state)));
    if (h.years < F.minYears) reasons.push('Nobody funds a label off ' + (h.years < 1 ? 'a rookie year' : 'two seasons') + '. Serve ' + F.minYears + ' full years first.');
    if (!h.daesangs && !h.bonsangs && !h.natOnes) reasons.push('The pitch deck needs a trophy on it — an award or a national #1 with your name behind it.');
    if (!KP.groups(state).some(g => g.debuted)) reasons.push('You have not debuted anyone. What exactly would you be leaving?');
    return { ok: !reasons.length, reasons, honors: h, warChest: h.warChest };
  };

  KP.foundLabel = function (state, name) {
    const F = KP.C.FOUNDING;
    const gate = KP.foundingEligible(state);
    if (!gate.ok) return { ok: false, reason: gate.reasons[0] };
    name = String(name || '').trim().slice(0, 14);
    if (name.length < 2) return { ok: false, reason: 'A label needs a name you would put on a building.' };
    const taken = (state.rivals || []).some(r =>
      r.name.toLowerCase() === name.toLowerCase() || r.short.toLowerCase() === name.toLowerCase()) ||
      state.company.name.toLowerCase() === name.toLowerCase() ||
      state.company.short.toLowerCase() === name.toLowerCase();
    if (taken) return { ok: false, reason: 'That name is already on a building in this industry.' };

    const push = n => state.inbox.push(Object.assign({ week: state.week, read: false,
      id: 'm' + (state.nextMsgId++) }, n));
    const h = gate.honors;
    const oldCo = state.company;
    const oldGroups = KP.groups(state).slice();
    const oldGroupIds = oldGroups.map(g => g.id);

    // ---- the company you built becomes the company you face ------------
    const legacy = {
      name: oldCo.name, short: oldCo.short,
      philosophy: 'patient',
      blurb: 'The house the architect built — before the architect walked out the front door.',
      prestige: KP.clamp(45 + h.daesangs * 10 + h.bonsangs * 3, 45, 90),
      rosterCount: state.roster.filter(id =>
        (state.people[id] || {}).status === 'trainee').length,
      nextDebutWeek: state.week + 40,
      interest: {}, recentMoves: [], founderGrudge: true,
      acts: [],
    };
    oldGroups.forEach(g => {
      if (!g.debuted || !g.members.length) return;
      const ms = g.members.map(id => state.people[id]).filter(Boolean);
      const avg = ms.reduce((s, p) =>
        s + 0.45 * Math.max(p.talents.vocals.cur, p.talents.dance.cur, p.talents.rap.cur) +
        0.3 * p.talents.charisma.cur + 0.25 * p.talents.visuals.cur, 0) / Math.max(1, ms.length);
      legacy.acts.push({
        id: 'legacy-' + g.id, gender: g.gender || 'f', name: g.name,
        concept: g.concept || ((g.releases || []).length ? g.releases[g.releases.length - 1].conceptId : 'bright'),
        quality: Math.round(KP.clamp(
          KP.C.INDUSTRY.memberQualityWeight * avg +
          KP.C.INDUSTRY.prestigeQualityWeight * legacy.prestige + 14, 20, 92)),
        members: g.members.slice(),
        popularity: Math.round(g.popularity || 0),
        debutWeek: g.debutWeek || 1,
        lastReleaseWeek: g.lastReleaseWeek || state.week,
        cycleWeeks: 20,
        releases: (g.releases || []).map(r => ({
          week: r.week, title: r.songTitle, reception: r.reception, isDebut: !!r.isDebut })),
        showWins: Object.values(g.trophies || {}).reduce((s, n) => s + n, 0),
      });
    });
    state.rivals = state.rivals || [];
    state.rivals.push(legacy);

    // ---- the people stay people — on the other side of the wall --------
    const everybody = new Set(state.roster.slice());
    oldGroups.forEach(g => g.members.forEach(id => everybody.add(id)));
    everybody.forEach(id => {
      const p = state.people[id];
      if (!p) return;
      const warm = KP.standingScore(state, p) >= 3;
      p.history.push({ week: state.week, text: warm
        ? 'The person who built this company walked out to start ' + name + '. ' + (p.gender === 'm' ? 'He' : 'She') + ' heard it from the staff, sat with it a while, and kept the door pass as a bookmark.'
        : 'The A&R architect left ' + oldCo.short + ' to found ' + name + '. The building carried on. Buildings do.' });
      p.status = 'rival';
      p.company = legacy.short;   // the legacy house can cast them later (audit A3)
      delete p.contract;
    });
    state.roster = [];
    state.groups = [];

    // ---- the world keeps its book straight ------------------------------
    // group-keyed narratives cross the wall only if they can still be
    // TOLD from the other side (0.9.13 audit L3): monster rookies has a
    // rival-act telling; the rest (dormancy countdowns, show dynasties,
    // concept identities) belonged to the era and end with it
    state.memory = (state.memory || []).filter(n => {
      if (n.subjectType !== 'group' || !oldGroupIds.includes(n.subjectId)) return true;
      if (n.key === 'monsterRookies') {
        n.key = 'rivalMonsterRookies';
        n.subjectType = 'rivalAct';
        n.subjectId = 'legacy-' + n.subjectId;
        return true;
      }
      return false;
    });
    state.memory = (state.memory || []).filter(n => n.subjectType !== 'company');
    (state.chart && state.chart.entries || []).forEach(e => { if (e.isPlayer) e.isPlayer = false; });
    (state.national && state.national.entries || []).forEach(e => { if (e.isPlayer) e.isPlayer = false; });
    state.scenes = [];
    (state.claims || []).forEach(c => {
      if (!c.resolved) { c.resolved = 'void'; c.resolvedWeek = state.week; }
    });
    state.deals = [];
    // the deal/gig surfaces post-date v0.9.9 and were missed (audit H2/M2):
    // offers naming the rival's idols come off the new label's desk, and
    // active second jobs end with the era
    state.dealOffers = [];
    state.gigOffers = [];
    state.gigs = [];
    state.project = null;
    // fan-account adoptions of people who crossed the wall release their
    // handles back to the pool (audit L2)
    Object.keys(state.feedCast || {}).forEach(h => {
      const c = state.feedCast[h];
      const bp = c && c.biasId && state.people[c.biasId];
      if (bp && bp.status !== 'idol') delete state.feedCast[h];
    });
    state.grievances = [];
    state.ghostDemos = [];
    state.discourses = (state.discourses || []).filter(d =>
      !(d.subjectType === 'group' && oldGroupIds.includes(d.subjectId)));
    // the old board's never-signed leads vanish entirely — no file, no
    // ghost aging in the save (audit A3)
    (state.prospects || []).forEach(id => { delete state.people[id]; });
    state.prospects = [];
    state.awardSeason = null;

    // ---- the fresh start -------------------------------------------------
    state.founded = { week: state.week, from: oldCo.short, warChest: h.warChest };
    // the letterhead: a chip-sized short and a story that is YOURS —
    // the old house keeps its own origin line (0.9.9.1)
    state.company = { name, short: name.split(' ')[0].slice(0, 9),
      blurb: 'Founded by the architect of ' + oldCo.short + '’s era. No catalog, no debuts, one reputation — and the whole industry watching on purpose.',
      reputation: { vocal: 40, girlGroup: 30, starMaker: 35, performance: 40 } };
    const execIdx = Math.floor(KP.hash01([state.seed, 'founder-exec', state.week].join('|')) *
      KP.DATA.executives.length);
    const exec = KP.DATA.executives[execIdx];
    state.executive = { name: exec.name, gender: exec.gender || 'f', personality: exec.personality, intro: exec.intro, since: state.week };
    state.trust = F.newTrust;
    state.budget = h.warChest;
    state.fiscal = { monthStartBudget: h.warChest, pressure: 0, monthSignings: 0 };
    state.signingsAllowed = 6;
    state.signingsUsed = 0;
    state.objective = {
      type: 'debutGirlGroup',
      text: 'Debut ' + name + '’s first group within 18 months. The industry is watching. So is ' + oldCo.short + '.',
      minMembers: KP.C.GROUP.minMembers, maxMembers: KP.C.GROUP.maxMembers,
      deadlineWeek: state.week + F.deadlineWeeks,
      status: 'open',
    };
    state.staffRoster = null;
    state.managerGen = (state.managerGen || 0) + 1;
    state.nextMeetingWeek = state.week + 8;
    state.doorQuietUntil = 0;
    state.renewalQuietUntil = 0;
    state.truckQuietUntil = 0;
    delete state.petProjectDone;
    delete state.hypeDirective;

    // ---- a fresh board: the scene knows your name now -------------------
    {
      const rng = KP.rngFor(state);
      const usedNames = new Set();
      Object.values(state.people).forEach(p => {
        usedNames.add(p.name.display.toLowerCase());
        usedNames.add(p.name.given.toLowerCase());
      });
      // person ids come from state, never from module memory — saves
      // depend on it (0.9.13 audit H1: founding was the one door that
      // skipped the re-sync, risking id collisions on loaded saves)
      KP.resetIds(state.nextPersonId || KP.peekNextId());
      const count = rng.int(KP.C.GEN.prospectCount[0], KP.C.GEN.prospectCount[1]);
      for (let i = 0; i < count; i++) {
        const gender = rng.chance(0.4) ? 'm' : 'f';
        const p = KP.generatePerson(rng, { status: 'prospect', usedNames, gender });
        state.people[p.id] = p;
        state.prospects.push(p.id);
        KP.socialOf(state, p);   // minted at the door, not on first look (audit H2)
      }
      state.nextPersonId = KP.peekNextId();
      state.rngState = rng.state();
    }

    // ---- the announcement ------------------------------------------------
    push({ kind: 'company', priority: 'critical', ind: 'founding',
      text: 'You signed the papers. ' + name + ' exists — a desk, a lease, a war chest of ' + h.warChest + ' raised on your name alone, and an industry that just stopped pretending not to watch. ' + oldCo.short + '’s statement wished you well in four words. The groups you built belong to the building you left, and the building intends to keep them. Eighteen months to prove it was you all along.' });
    push({ kind: 'industry', priority: 'high',
      text: 'The trades called it before lunch: the architect of ' + oldCo.short + '’s era is out, and the new shingle reads ' + name + '. Half the industry sent flowers. The other half sent lawyers to re-read their producer contracts. ' + oldCo.short + ' promoted from within and scheduled a comeback with unusual speed.' });
    push({ kind: 'public', priority: 'high',
      text: 'The fandoms are having a full identity crisis in real time: do they follow the company, the groups, or the person who chose every title track they ever cried to? The quote-posts have citations. Somebody made a timeline video already. It has chapters.' });
    return { ok: true, warChest: h.warChest };
  };

  KP.onFeedEvent('founding', (state, n, rng) => {
    return rng.pick([
      { persona: 'press', text: 'Industry restructuring of the year: the A&R behind the era goes independent. Every label’s org chart just got a stress test.' },
      { persona: 'fan', text: 'the person who PICKED THE TITLE TRACKS left to start their own label. loyalty crisis. streaming both catalogs out of respect and confusion' },
      { persona: 'casual', text: 'love when an executive departure has more drama than the comebacks. the new label’s first debut is now the most anticipated release of the year' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
