/* The building (v0.8.4) — the company gets a staff, the executive gets
   taste, the year gets a boardroom. §32's stalled thread and §39's
   Phase A closer: the anonymous "the staff" narrator gains names that
   can be poached, the exec stops being a question machine and starts
   having opinions, and once a year the company itself sits across a
   table and answers for its trajectory. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // ---- the named staff ---------------------------------------------------
  const MGR_FAMILY = ['Kang', 'Yoon', 'Baek', 'Seo', 'Nam', 'Hwang', 'Oh', 'Shin'];
  const MGR_GIVEN = ['Tae-sik', 'Mi-ran', 'Jung-ho', 'Soo-jin', 'Byung-chul', 'Eun-jung', 'Dae-ho', 'Hye-rim'];
  function genStaffName(seedKey) {
    const f = MGR_FAMILY[Math.floor(KP.hash01(seedKey + '|fam') * MGR_FAMILY.length)];
    const g = MGR_GIVEN[Math.floor(KP.hash01(seedKey + '|giv') * MGR_GIVEN.length)];
    return f + ' ' + g;
  }
  KP.staffOf = function (state) {
    state.staffRoster = state.staffRoster || { managers: {} };
    if (!state.staffRoster.coach) {
      state.staffRoster.coach = { name: genStaffName(state.seed + '|coach'), role: 'head vocal coach', since: 1 };
    }
    return state.staffRoster;
  };
  KP.managerOf = function (state, g) {
    const st = KP.staffOf(state);
    return (g && st.managers[g.id]) || null;
  };

  // ---- exec taste (hash-truth, never stored) -----------------------------
  KP.execTaste = function (state) {
    const ids = KP.C.CONCEPTS.map(c => c.id);
    return ids[Math.floor(KP.hash01([state.seed, 'execTaste'].join('|')) * ids.length)];
  };

  // ---- the weekly building (order 788) -----------------------------------
  KP.registerWeekly('building', 788, function (state, rng, inbox, roster, groups) {
    const st = KP.staffOf(state);
    const B = KP.C.BUILDING;

    // every debuted group gets a road manager the week it needs one
    groups.forEach(g => {
      if (!g.debuted || st.managers[g.id]) return;
      st.managers[g.id] = { name: genStaffName(state.seed + '|mgr|' + g.id + '|' + (g.managerGen || 0)),
        since: state.week };
      inbox.push({ kind: 'company', priority: 'normal', groupId: g.id,
        text: st.managers[g.id].name + ' takes over as ' + g.name + '’s road manager this week. Within two days ' +
          'the van seating chart, the coffee orders, and one member’s secret convenience-store route are all committed to memory. The good ones are like that.' });
    });

    // the poach: rivals hire people too — a beloved manager is an asset
    if (!(state.scenes || []).some(sc => sc.kind === 'staffPoach') &&
        state.week > (state.poachQuietUntil || 0)) {
      const target = groups.find(g => g.debuted && st.managers[g.id] &&
        (g.popularity || 0) >= B.poachPopMin &&
        state.week - st.managers[g.id].since >= B.poachTenureMin);
      if (target && rng.chance(B.poachChance)) {
        state.poachQuietUntil = state.week + B.poachCooldown;
        const rival = state.rivals[Math.floor(KP.hash01([state.seed, 'poacher', state.week].join('|')) * state.rivals.length)];
        KP.openScene(state, { kind: 'staffPoach', groupId: target.id,
          rivalName: rival ? rival.name : 'a rival house',
          expiresWeek: state.week + 2 });
        inbox.push({ kind: 'company', priority: 'high', groupId: target.id,
          text: st.managers[target.id].name + ' got an offer from ' + (rival ? rival.name : 'a rival house') +
            ' — better title, better hours, someone else’s vans. The counter-offer window is on the Desk, and the members have already noticed the long phone calls.' });
      }
    }

    // exec taste (v0.8.4): this week's release lands differently
    // depending on whether it is HER kind of record
    groups.forEach(g => {
      if (!g.results || g.results.week !== state.week) return;
      if (g.results.reception < 64) return;
      const taste = KP.execTaste(state);
      const cLabel = (KP.conceptById(g.results.conceptId) || {}).label || '';
      if (g.results.conceptId === taste) {
        state.trust = KP.clamp(state.trust + 1, 0, 100);
        inbox.push({ kind: 'executive', priority: 'high', text: state.executive.name + ', passing the numbers back across the desk: “' +
          cLabel + '. Finally somebody in this building understands what we should sound like.” ' + KP.fillPro('{She} does not hide the smile.', KP.execP(state)) + ' Trust ticks up on taste alone.' });
      } else {
        inbox.push({ kind: 'executive', priority: 'high', text: state.executive.name + ' reviews the ' + g.name + ' numbers, nods once, and says “good result” in the tone of someone whose favorite genre this is not. A win is a win. ' + KP.fillPro('{Hers}', KP.execP(state)) + ' would have been ' +
          ((KP.conceptById(taste) || {}).label || '').toLowerCase() + '.' });
      }
    });

    // board season: once a year, the company answers for itself
    const woy = ((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1;
    if (woy === B.boardWeek && state.week > KP.C.WEEKS_PER_YEAR - 10 &&
        !(state.scenes || []).some(sc => sc.kind === 'boardSeason')) {
      const popSum = groups.reduce((s2, g) => s2 + (g.debuted ? (g.popularity || 0) : 0), 0);
      KP.openScene(state, { kind: 'boardSeason', popSum,
        year: Math.ceil(state.week / KP.C.WEEKS_PER_YEAR),
        expiresWeek: state.week + 2 });
      inbox.push({ kind: 'executive', urgent: true,
        text: 'Board season. The directors are in the building, the good coffee is out, and ' + state.executive.name +
          ' has stopped making jokes. The company’s year gets summarized in one meeting, and the summary is yours to give. On the Desk.' });
    }

    // the pet project: once a career, the exec assigns one
    if (!state.petProjectDone && state.week >= B.petAfterWeek &&
        !(state.scenes || []).some(sc => sc.kind === 'petProject') &&
        groups.some(g => g.debuted) && rng.chance(B.petChance)) {
      state.petProjectDone = true;
      KP.openScene(state, { kind: 'petProject', expiresWeek: state.week + 3 });
      inbox.push({ kind: 'executive', urgent: true,
        text: state.executive.name + KP.fillPro(' closes your office door {herself}, which never means anything small: {she} has a project. {Hers}, personally. The details — and your answer — are on the Desk.', KP.execP(state)) });
    }
  });

  // ---- the poach scene ----------------------------------------------------
  KP.registerScene('staffPoach', {
    title: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      const m = g && KP.managerOf(state, g);
      return (m ? m.name : 'The manager') + ' · the counter-offer';
    },
    body: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      const m = g && KP.managerOf(state, g);
      if (!g || !m) return '';
      return sc.rivalName + ' wants ' + m.name + ' — the person who knows ' + g.name +
        '’s van seating, coffee orders, and bad days better than the members’ own families do. Money keeps ' +
        (m.name.split(' ')[0]) + '; nothing else will.';
    },
    options: (state) => [
      { id: 'counter', label: 'Counter-offer · ' + KP.C.BUILDING.counterCost },
      { id: 'release', label: 'Wish them well' },
    ],
    resolve: (state, sc, optionId) => {
      const g = KP.groupById(state, sc.groupId);
      const st = KP.staffOf(state);
      const m = g && st.managers[g.id];
      if (!g || !m) return {};
      if (optionId === 'counter') {
        // the money gets found — even if the books complain about it
        state.budget -= KP.C.BUILDING.counterCost;
        m.countered = state.week;
        return { toast: m.name + ' stays — better pay, same vans, and one very relieved group chat. The members threw a small dorm party with a hand-drawn banner. The banner misspells “congratulations.” It is already framed.' };
      }
      delete st.managers[g.id];
      g.managerGen = (g.managerGen || 0) + 1;
      g.members.forEach(id => {
        const p = state.people[id];
        if (p) p.morale = KP.clamp(p.morale - KP.C.BUILDING.poachMorale, 0, 100);
      });
      return { toast: m.name + ' left on good terms, which somehow made the last van ride quieter. A new manager starts next week. The seating chart starts from zero.',
        note: { kind: 'company', groupId: g.id,
          text: g.name + ' said goodbye to ' + m.name + ' this week. The maknae cried at the send-off dinner, then everyone did, including — briefly, professionally — ' + m.name + '.' } };
    },
    expire: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      const st = KP.staffOf(state);
      const m = g && st.managers[g.id];
      if (!g || !m) return null;
      delete st.managers[g.id];
      g.managerGen = (g.managerGen || 0) + 1;
      g.members.forEach(id => {
        const p = state.people[id];
        if (p) p.morale = KP.clamp(p.morale - KP.C.BUILDING.poachMorale, 0, 100);
      });
      return { kind: 'company', priority: 'high', groupId: g.id,
        text: 'The counter-offer window closed unanswered, and ' + m.name + ' signed elsewhere. The members found out from the group chat. The silence in the van this week has a new-staff-orientation quality to it.' };
    },
  });

  // ---- board season --------------------------------------------------------
  KP.registerScene('boardSeason', {
    title: (state, sc) => 'The board · year ' + sc.year,
    body: (state, sc) => {
      const groups = KP.groups(state).filter(g => g.debuted);
      const releases = groups.reduce((s2, g) => s2 + (g.releases || []).filter(r =>
        r.week > state.week - KP.C.WEEKS_PER_YEAR).length, 0);
      return 'The directors have the year on one slide: ' + releases + ' release' + (releases === 1 ? '' : 's') +
        ', the fanbase where it is, the books where they are. They want one sentence on where this company is going, and they want to believe it.';
    },
    options: () => [
      { id: 'build', label: 'Own the slow build' },
      { id: 'growth', label: 'Promise growth this year' },
      { id: 'artists', label: 'Point at the artists' },
    ],
    resolve: (state, sc, optionId) => {
      if (optionId === 'growth') {
        KP.openClaim(state, { type: 'growthPromise', subject: { kind: 'exec' },
          baseline: sc.popSum, byWeek: state.week + KP.C.WEEKS_PER_YEAR });
        return { toast: 'Growth, on the record, with a number attached. The directors like numbers. Numbers can also be read back aloud in one year, which is the part to remember.' };
      }
      if (optionId === 'build') {
        state.trust = KP.clamp(state.trust + 1, 0, 100);
        return { toast: '“We are building careers, not quarters.” One director wrote it down. Another checked his watch. The executive, notably, nodded.' };
      }
      return { toast: 'You pointed at the artists — their work, their growth, their rooms full of trophies-to-be. It is not a strategy slide. It was also the only sentence in the meeting anyone believed completely.' };
    },
    expire: (state) => {
      state.trust = KP.clamp(state.trust - 1, 0, 100);
      return { kind: 'executive',
        text: 'Board season ended with the company’s chair empty at its own review. ' + state.executive.name + KP.fillPro(' covered for you, which cost {her} something, which means it cost you something.', KP.execP(state)) };
    },
  });
  KP.registerClaim('growthPromise', (state, c) => {
    if (state.week < c.byWeek) return null;
    const popSum = KP.groups(state).reduce((s2, g) => s2 + (g.debuted ? (g.popularity || 0) : 0), 0);
    const met = popSum > c.baseline;
    state.trust = KP.clamp(state.trust + (met ? 3 : -3), 0, 100);
    return { resolved: met ? 'met' : 'missed',
      notes: [{ kind: 'executive', urgent: !met,
        text: met
          ? 'Board season, one year later: the growth you promised showed up in the numbers. The directors used the word “trajectory” approvingly, which is as warm as directors get.'
          : 'Board season, one year later: the growth slide got read back aloud, next to this year’s numbers, slowly. ' + state.executive.name + ' did not look at you once, which was its own message.' }] };
  });

  // ---- the pet project ------------------------------------------------------
  KP.registerScene('petProject', {
    title: (state) => state.executive.name + ' · the pet project',
    body: (state) => state.executive.name + KP.fillPro(' wants a SOLO debut — {hers}, conceptually: one artist from the roster, built up and launched inside the year. “Groups are the company’s legacy,” {she} says, “this one is mine.” {She} has wanted this since before you were hired, and {she} is asking you, which is not quite the same as asking.', KP.execP(state)),
    options: () => [
      { id: 'accept', label: 'Take it on' },
      { id: 'push', label: 'Push back — the calendar is full' },
    ],
    resolve: (state, sc, optionId) => {
      if (optionId === 'accept') {
        KP.openClaim(state, { type: 'petProject', subject: { kind: 'exec' },
          byWeek: state.week + KP.C.WEEKS_PER_YEAR });
        return { toast: KP.fillPro('{She} left your office lighter than {she} came in. The claim is on the record: a solo debut inside the year. {Pos} pet project is now your calendar problem — and, handled right, your biggest favor ever banked.', KP.execP(state)) };
      }
      state.trust = KP.clamp(state.trust - 2, 0, 100);
      return { toast: KP.fillPro('“The calendar is full.” {She} took it well, which from {her} is a specific kind of badly. The project goes back in the drawer. {She} keeps the drawer.', KP.execP(state)) };
    },
    expire: (state) => {
      state.trust = KP.clamp(state.trust - 2, 0, 100);
      return { kind: 'executive',
        text: KP.fillPro('The pet project sat on your desk until {she} quietly took it back. Some silences are answers; this one was filed as one.', KP.execP(state)) };
    },
  });
  KP.registerClaim('petProject', (state, c) => {
    const soloDebuted = KP.groups(state).some(g => g.type === 'solo' && g.debuted &&
      g.debutWeek >= c.week);
    if (soloDebuted) {
      state.trust = KP.clamp(state.trust + 4, 0, 100);
      return { resolved: 'met',
        notes: [{ kind: 'executive',
          text: state.executive.name + KP.fillPro(' watched the solo debut stage from the wings, and for exactly one chorus stopped being an executive. “Thank you,” {she} said after, in the voice {she} signs contracts with. That favor is banked, permanently.', KP.execP(state)) }] };
    }
    if (state.week > c.byWeek) {
      state.trust = KP.clamp(state.trust - 3, 0, 100);
      return { resolved: 'missed',
        notes: [{ kind: 'executive', urgent: true,
          text: 'A year since the pet project, and no solo stage. ' + state.executive.name + ' never mentioned it again, which is how you know exactly how much it mattered.' }] };
    }
    return null;
  });
})(typeof window !== 'undefined' ? window : globalThis);
