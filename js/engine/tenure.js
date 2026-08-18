/* Time takes its share (v0.9.32, §39 slot 12 — audit A4 + B4 +
   succession + the founder's board). Every anti-saturation clock in
   one release: SENESCENCE (age bites training and recovery, and pays
   the stage back in floor), TRUST DRIFT (devotion above the bar
   decays into expectation), EXECUTIVE SUCCESSION (chairs have eras;
   the record transfers, the devotion does not — prove it again), and
   THE FOUNDER'S BOARD (the founded label answers to seats with
   names). The whole module is hash-timed and consumes NO rng: worlds
   fork byte-identical through every clock. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.timeLedger = state.timeLedger ||
      { senesced: 0, driftWeeks: 0, successions: 0, receipts: 0, cleanSlates: 0,
        boardSeated: 0, boardMemos: 0, boardConfidence: 0 };
    return state.timeLedger;
  }

  // ---- senescence: the body keeps a different ledger --------------------
  // Words never meters; care always. The mechanics are three quiet
  // multipliers — growth (development.js), recovery (sim.js), and the
  // stage-IQ floor (person.js derived) — and one warm note at the line.
  KP.ageGrowthMult = function (p) {
    const S = KP.C.TIME.SENESCE;
    if ((p.age || 0) < S.at) return 1;
    return Math.max(S.growthFloor, 1 - (p.age - S.at) * S.growthPerYear);
  };
  KP.ageRecoveryMult = function (p) {
    const S = KP.C.TIME.SENESCE;
    if ((p.age || 0) < S.at) return 1;
    return Math.max(S.recoveryFloor, 1 - (p.age - S.at) * S.recoveryPerYear);
  };
  KP.stageIQ = function (p) {
    const S = KP.C.TIME.SENESCE;
    return Math.min(S.stageIQCap, Math.max(0, (p.age || 0) - S.at) * S.stageIQPerYear);
  };

  // ---- the weekly: every clock, one pass (order 859) --------------------
  KP.registerWeekly('timeShare', 859, function (state, rng, inbox, roster) {
    const T = KP.C.TIME;
    const led = ledger(state);

    // senescence crossings: one note, written with care, at the line
    roster.forEach(p => {
      if (p.status !== 'idol' || (p.age || 0) < T.SENESCE.at || p.flags.senesceNoted) return;
      p.flags.senesceNoted = true;
      led.senesced++;
      p.history.push({ week: state.week,
        text: 'The trainer rebuilt the routine this year — more recovery days, smarter reps, the schedule of a professional in it for the long haul. What the years took in bounce they paid back in floor.' });
      inbox.push({ kind: 'development', personId: p.id,
        text: KP.fillPro(KP.displayName(p) + ' is ' + p.age + ' now, and the training staff quietly rebuilt {pos} week: recovery days on the calendar, reps that count instead of reps that impress. The tradeoff is the industry’s oldest and {she} took it like the professional {she} is — the explosive gains are behind {her}, and so are the shaky nights. {She} has not missed on a tired stage in years. The veterans never do.', p) });
    });

    // trust drift: above the bar, excellence becomes the expectation
    if (state.week % T.DRIFT.everyWeeks === 0 && (state.trust || 0) > T.DRIFT.above) {
      state.trust -= 1;
      led.driftWeeks++;
      if (!state.driftNoted) {
        state.driftNoted = true;
        inbox.push({ kind: 'executive', priority: 'high',
          text: state.executive.name + KP.fillPro(', at the end of an otherwise glowing review: “Do not mistake this building’s mood for a resting state. At this level, last year’s miracle is this year’s baseline.” {She} is not wrong, and {she} is not going to stop being not wrong.', KP.execP(state)) });
      }
    }

    // ---- executive succession: chairs have eras (non-founded houses —
    // a founder cannot be succeeded out of their own chair; their
    // pressure layer is the board, below)
    if (!state.founded) {
      state.executive.since = state.executive.since || 1;
      const gen = state.execGen || 0;
      const era = Math.round(T.EXEC.eraWeeks[0] +
        KP.hash01([state.seed, 'execEra', gen].join('|')) * (T.EXEC.eraWeeks[1] - T.EXEC.eraWeeks[0]));
      if (state.week >= T.EXEC.minWeek && state.week - state.executive.since >= era &&
          !(state.scenes || []).some(sc => sc.kind === 'newChair')) {
        const old = state.executive;
        const warm = (state.trust || 0) >= 60;
        const candidates = KP.DATA.executives.filter(e => e.name !== old.name);
        const next = candidates[Math.floor(
          KP.hash01([state.seed, 'nextExec', gen].join('|')) * candidates.length)];
        state.execGen = gen + 1;
        state.executive = { name: next.name, gender: next.gender || 'f',
          personality: next.personality, intro: next.intro, since: state.week };
        // the ledger reset: the record transfers, the devotion does not
        const startT = KP.C.EXEC.startTrust;
        state.trust = KP.clamp(Math.round(startT + ((state.trust || 0) - startT) * T.EXEC.carry), 0, 100);
        delete state.petProjectDone;   // a new chair brings its own someday
        delete state.driftNoted;       // and its own bar
        led.successions++;
        inbox.push({ kind: 'executive', urgent: true, ind: 'execFarewell',
          text: old.name + KP.fillPro(' announced it in the all-hands voice: after ' +
            Math.round((state.week - (old.since || 1)) / KP.C.WEEKS_PER_YEAR) +
            ' years in the chair, {she} is stepping away. ', { gender: old.gender || 'f' }) +
            (warm ? 'The last thing packed was a framed chart printout — one of ours. “Whatever the next chair thinks of you,” ' + old.name.split(' ')[0] + ' said at the door, “make them learn it the way I did.”'
                  : 'The goodbye was professional, which both of you understood to be a complete sentence. Some eras end even; this one ends filed.') });
        inbox.push({ kind: 'executive', urgent: true, ind: 'newChair', priority: 'critical',
          text: next.name + ' takes the chair Monday. ' + next.intro + ' The new executive has read the file — every number, every promise, every year. What has not transferred is the part that took years to build: the benefit of the doubt. The first meeting is on the Desk, and it sets the tone for the era.' });
        KP.openScene(state, { kind: 'newChair', prevName: old.name,
          expiresWeek: state.week + 3 });
      }
    }

    // ---- the founder's board: seats with names ------------------------
    if (state.founded) {
      if (!state.board) {
        const FAM = ['Cho', 'Han', 'Ryu', 'Min', 'Gu', 'Jin', 'Pyo', 'Chae'];
        const GIV = ['Sung-min', 'Ae-ra', 'Kwang-ho', 'Yeon-woo', 'Sang-hee', 'Do-yun', 'Mi-sook', 'Jae-beom'];
        const nm = k => FAM[Math.floor(KP.hash01([state.seed, 'board', k, 'f'].join('|')) * FAM.length)] +
          ' ' + GIV[Math.floor(KP.hash01([state.seed, 'board', k, 'g'].join('|')) * GIV.length)];
        state.board = { since: state.week, seats: [
          { name: nm('inv'), role: 'lead investor' },
          { name: nm('vet'), role: 'industry veteran' },
          { name: nm('ally'), role: 'first believer' },
        ] };
        ledger(state).boardSeated++;
        inbox.push({ kind: 'company', priority: 'high',
          text: 'The board seats itself this week — the war chest came with names attached: ' +
            state.board.seats.map(s => s.name + ' (' + s.role + ')').join(', ') +
            '. Three people, three reasons to be in the room: the money, the credibility, and the one who believed first. They meet once a year, and they read everything in between.' });
      }
      const chest = (state.founded.warChest || 0) || 1;
      if (!state.board.burnNoted && state.budget < chest * T.BOARD.burnAt) {
        state.board.burnNoted = true;
        led.boardMemos++;
        inbox.push({ kind: 'company', urgent: true, ind: 'boardMemo',
          text: state.board.seats[0].name + ' — the lead investor — sent the memo founders describe to each other in bars: two paragraphs, no adjectives, a chart of the war chest with a line where the runway ends. The last sentence is the whole message: “I funded a company, not a countdown. Show me which one this is.”' });
      }
      if (!state.board.proudNoted && state.budget > chest * T.BOARD.proudAt) {
        state.board.proudNoted = true;
        led.boardConfidence++;
        state.trust = KP.clamp((state.trust || 0) + T.BOARD.proudTrust, 0, 100);
        inbox.push({ kind: 'company', priority: 'high', ind: 'boardProud',
          text: 'The board’s year-end letter runs one paragraph longer than usual, and the extra paragraph is the one founders frame: the company has more than doubled the money it started with. ' + state.board.seats[2].name + ' — the first believer — added a handwritten line at the bottom: “Told them so.”' });
      }
    }
  });

  // ---- the first meeting: the new chair sets the tone -------------------
  KP.registerScene('newChair', {
    title: (state) => state.executive.name + ' · the first meeting',
    body: (state, sc) => state.executive.name + KP.fillPro(' opens the file — YOUR file — and closes it again without reading, which is the test. “' + (sc.prevName || 'My predecessor') + ' rated you highly. I inherited the rating, not the reasons. You can walk me through the record, or we can start from a clean page and let this year speak. Choose — I read a lot into how people choose.”', KP.execP(state)),
    options: () => [
      { id: 'receipts', label: 'Walk the record — bring the receipts' },
      { id: 'slate', label: 'The clean page — let this year speak' },
    ],
    resolve: (state, sc, optionId) => {
      const led = ledger(state);
      if (optionId === 'receipts') {
        led.receipts++;
        state.trust = KP.clamp((state.trust || 0) + 3, 0, 100);
        return { toast: KP.fillPro('You walked the whole ledger — the debuts, the promises kept, the years the numbers earned. {She} interrupted twice with sharp questions and once with a note to {herself}, which is how this one shows respect. The record moved {her} where charm never would have. Trust +3, and the new era opens with the file OPEN.', KP.execP(state)) };
      }
      led.cleanSlates++;
      state.trust = KP.clamp((state.trust || 0) + 1, 0, 100);
      return { toast: KP.fillPro('“The clean page.” {She} nodded slowly, filed something away, and moved to the calendar. Confidence reads either as strength or as a gamble, and {she} has not decided which — that is the point of a clean page. This year will be read closely.', KP.execP(state)) };
    },
    expire: (state) => {
      state.trust = KP.clamp((state.trust || 0) - 2, 0, 100);
      return { kind: 'executive',
        text: KP.fillPro('The first meeting with the new chair never happened — the window closed with your calendar full. {She} noticed, because noticing is the whole job. The era opens with the benefit of the doubt already spent.', KP.execP(state)) };
    },
  });

  // ---- the timeline reacts ---------------------------------------------
  KP.onFeedEvent('execFarewell', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'the CEO stepping down after all those years. say what you want about suits, the eras of this industry get written in boardrooms as much as on stages' },
    { persona: 'press', text: 'An executive era ends. The interesting question is never the farewell — it is which promises the next chair considers inherited.' },
  ]));
  KP.onFeedEvent('newChair', (state, n, rng) => rng.pick([
    { persona: 'stan', text: 'new CEO just walked into my faves’ company. immediately researching everything this person has ever greenlit. the fandom does due diligence now, we’ve been burned before' },
    { persona: 'casual', text: 'new executive, new era, same question every fandom asks: does the new boss love the artists or the spreadsheet. the first year always answers' },
  ]));
  KP.onFeedEvent('boardMemo', (state, n, rng) => rng.pick([
    { persona: 'press', text: 'Word in the trades: the founder’s investors are reading the runway chart closely. Independence is a beautiful word with a burn rate.' },
  ]));
  KP.onFeedEvent('boardProud', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'the founded label DOUBLED its war chest. every executive who passed on that founder is rereading an old email right now and saying nothing' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
