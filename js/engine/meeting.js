/* The Monday meeting (v0.7.1, re-railed v0.8.0) — the executive asks
   questions with constrained answers; the claim goes on the record and
   is CHECKED later by predicate — deliver and she remembers warmly;
   miss and she quotes you back. As of v0.8.0 this is the FIRST
   CUSTOMER of the stage-door foundation: the question is a registered
   scene, the promise is a registered claim with subject {kind:'exec'},
   and the bespoke card, dispatcher case, and inline predicate loop are
   gone. The proof that the next ten conversations are assembly. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // ---- the weekly cadence: pose the question ----------------------------
  KP.meetingWeek = function (state) {
    const M = KP.C.MEETING;
    const out = [];
    state.nextMeetingWeek = state.nextMeetingWeek || (M.everyWeeks + 1);
    const pending = (state.scenes || []).some(sc => sc.kind === 'execQuestion');
    if (!pending && state.week >= state.nextMeetingWeek) {
      // the board seat (v0.10.19, §85 B): a second reader at the table —
      // the questions come twice as often while the fund holds the chair
      state.nextMeetingWeek = state.week + (KP.boardSeatActive && KP.boardSeatActive(state)
        ? Math.ceil(M.everyWeeks / 2) : M.everyWeeks);
      const q = buildQuestion(state);
      if (q) {
        KP.openScene(state, { kind: 'execQuestion', q,
          expiresWeek: state.week + M.ignoreAfterWeeks - 1 });
        if (OWN.includes(q.type)) { const led = ownLedger(state); led.asked++; led.types[q.type].asked++; state.execOwnLine = q.line; }
        out.push({ kind: 'executive', urgent: true,
          text: state.executive.name + ', Monday meeting: “' + q.text + '” Your answer goes on the record. The options are on the Desk.' });
      }
    }
    return out;
  };

  function buildQuestion(state) {
    // the gravity's exec stage (v0.9.18): once the clamor reaches the
    // boardroom, the NEXT Monday meeting asks the solo question first
    if (state.gravityExecAsk) {
      const ask = state.gravityExecAsk;
      const p = state.people[ask.personId];
      const g = KP.groupById(state, ask.groupId);
      state.gravityExecAsk = null;
      if (p && g && g.members.includes(p.id)) {
        return { type: 'soloQuestion', week: state.week, personId: p.id, groupId: g.id,
          text: 'The trades keep asking about ' + KP.displayName(p) + '. So the board asked me. So I am asking you: is a solo happening?',
          options: [
            { id: 'promise', label: 'Yes — on the record' },
            { id: 'group', label: 'The group comes first' },
          ] };
      }
    }
    // alternate deterministically between the two questions that exist
    const wantReady = KP.hash01([state.seed, 'meeting', state.week].join('|')) < 0.5;
    const free = KP.freeTrainees(state).map(id => state.people[id])
      .filter(p => p.status === 'trainee');
    const debutedGroups = KP.groups(state).filter(g => g.debuted && !g.prep && !g.tour && !g.retiredWeek && g.members.length);
    // 0.10.17.5 (owner: the question "comes up a lot and is pretty
    // redundant with the rankings"): one promise on the books at a
    // time — while a readiness claim stands, the exec does not re-ask
    const readyOpen = (state.claims || []).some(c => !c.resolved && c.type === 'readyTrainee');
    if (!readyOpen && (wantReady || !debutedGroups.length) && free.length >= 2) {
      // she READS the eval board now (it exists since the rituals) —
      // the question is no longer information, it is a date. Options
      // ordered by the board's own latest ranking; disagreeing with
      // the board is exactly what going on the record means.
      const ranked = free.slice().sort((a, b) => {
        const ra = a.evalHistory && a.evalHistory.length ? a.evalHistory[a.evalHistory.length - 1].rank : 99;
        const rb = b.evalHistory && b.evalHistory.length ? b.evalHistory[b.evalHistory.length - 1].rank : 99;
        if (ra !== rb) return ra - rb;
        return (b.talents.vocals.cur + b.talents.dance.cur + b.talents.charisma.cur) -
          (a.talents.vocals.cur + a.talents.dance.cur + a.talents.charisma.cur);
      });
      const opts = ranked.slice(0, 3);
      const top = opts[0];
      const topRanked = top.evalHistory && top.evalHistory.length &&
        top.evalHistory[top.evalHistory.length - 1].rank === 1;
      return { type: 'readyTrainee', week: state.week,
        text: topRanked
          ? 'The evaluation board keeps printing ' + KP.displayName(top) + ' at number one. I can read a ranking — what I cannot read is a date. Whose debut lands first?'
          : 'Which trainee is closest to ready?',
        options: opts.map(p => ({ id: p.id, label: KP.displayName(p) })) };
    }
    // the second lineup (v0.8.4): one debuted group + a full trainee
    // room = a question the exec was always going to ask
    const debutedCount = KP.groups(state).filter(g => g.debuted).length;
    if (debutedCount === 1 && KP.freeTrainees(state).length >= KP.C.GROUP.minMembers &&
        !state.secondGroupAsked &&
        KP.hash01([state.seed, 'meeting2', state.week].join('|')) < 0.5) {
      state.secondGroupAsked = true;
      return { type: 'secondGroup', week: state.week,
        text: 'The trainee room is full and the first group stands. When does the second lineup form?',
        options: [
          { id: 'year', label: 'Inside the year' },
          { id: 'depends', label: 'When the room is ready' },
        ] };
    }
    // the comeback question left the meeting (§89 C): career.js's
    // objective already holds the same group to the same date. The
    // claim handler stays for saves that still carry the promise.
    // her own question (v0.11.27, §119): with nothing else to ask, she
    // asks what her kind of executive asks
    return KP.execOwnQuestion(state);
  }

  // ---- her own questions (v0.11.27, §119) ---------------------------------
  // More than half the Monday meetings had nothing to ask (measured: 1,626
  // of 2,941 over 200 careers), and the executive's personality was copied
  // from file to file and never read. With nothing else on the agenda she
  // asks the question her kind of executive asks. One of these promises is
  // on the books at a time, and it is hers: it leaves with her chair. A
  // patient executive asks nothing; that is what patient means.
  const OWN = ['execQuarter', 'execVoice', 'execByName', 'execSound', 'execRemember'];
  function ownLedger(state) {
    const led = state.upstairsLedger = state.upstairsLedger || {};
    ['asked', 'promised', 'passed', 'passedTwice', 'overtaken', 'met', 'missed', 'void'].forEach(k => { if (led[k] == null) led[k] = 0; });
    if (!led.types) led.types = {};
    OWN.forEach(k => { if (!led.types[k]) led.types[k] = { asked: 0, met: 0, missed: 0 }; });
    return led;
  }
  KP.upstairsLedger = ownLedger;
  const lastEval = p => { const h = (p && p.evalHistory) || []; return h.length ? h[h.length - 1] : null; };
  const freeRoom = state => KP.freeTrainees(state).map(id => state.people[id]);
  const living = state => KP.groups(state).filter(g => g.debuted && !g.retiredWeek && g.members.length);
  const working = state => living(state).filter(g => !KP.onHiatus(g));   // an act on hiatus has no next record to ask about
  // our records after a week, the oldest first
  const recordsAfter = (state, week) => KP.groups(state)
    .reduce((all, g) => all.concat((g.releases || []).filter(r => r.week > week)), [])
    .sort((a, b) => a.week - b.week);
  const PROMISE = { id: 'promise', label: 'On the record' };
  // Each question is a family (§93): three wordings, and the question
  // itself, its last sentence, is the same in all three, so what is
  // promised never depends on which one she used.
  const OWN_BUILD = {
    // the profit hunter asks about the quarter
    profitHunter: state => {
      const till = Math.round(state.budget);
      const is = 'The till is ' + (till < 0 ? -till + ' in the red' : 'empty');
      return { type: 'execQuarter', week: state.week, baseline: Math.max(0, till),
        lines: till > 0 ? [
          'The board counts in quarters, so I do. Twelve weeks from today, is there more in the till than the ' + till + ' in it this morning?',
          'I looked at the account before I sat down. Twelve weeks from today, is there more in the till than the ' + till + ' in it this morning?',
          'Eras do not show on a balance sheet. Quarters do. Twelve weeks from today, is there more in the till than the ' + till + ' in it this morning?',
        ] : [
          'The board counts in quarters, so I do. ' + is + ' this morning. Twelve weeks from today, is it in the black?',
          'I looked at the account before I sat down. ' + is + ' this morning. Twelve weeks from today, is it in the black?',
          'Eras do not show on a balance sheet. Quarters do. ' + is + ' this morning. Twelve weeks from today, is it in the black?',
        ],
        options: [PROMISE, { id: 'pass', label: 'Not this quarter' }] };
    },
    // the traditionalist asks about the vocal room
    traditionalist: state => {
      const p = freeRoom(state).sort((a, b) => b.talents.vocals.cur - a.talents.vocals.cur || (a.id < b.id ? -1 : 1))[0];
      if (!p) return null;
      const N = KP.displayName(p);
      return { type: 'execVoice', week: state.week, personId: p.id,
        lines: [
          'We are known for vocals. ' + N + ' has the best voice in the trainee room. Half a year from now, is it a better one?',
          'I stopped at the vocal room door this morning, and it was ' + N + ' I stopped for. That is the best voice in the trainee room. Half a year from now, is it a better one?',
          'A house is known for one thing at a time, and ours is singing. ' + N + ' has the best voice in the trainee room. Half a year from now, is it a better one?',
        ],
        options: [PROMISE, { id: 'pass', label: 'A voice takes the time it takes' }] };
    },
    // the micromanager asks about a trainee by name, from the evaluation board
    micromanager: state => {
      const p = freeRoom(state).filter(x => lastEval(x) && lastEval(x).rank >= 2)
        .sort((a, b) => lastEval(b).rank - lastEval(a).rank || (a.id < b.id ? -1 : 1))[0];
      if (!p) return null;
      const e = lastEval(p);
      const at = KP.displayName(p) + ' was number ' + e.rank + ' of ' + e.of + ' on the last one. Take a full month. On the sheet after that, is ' + KP.fillPro('{she}', p) + ' higher?';
      return { type: 'execByName', week: state.week, personId: p.id, rank: e.rank, evalWeek: e.week,
        lines: [
          'I read every evaluation sheet. ' + at,
          'The evaluation sheets are on my desk, with my notes on them. ' + at,
          'I keep every evaluation sheet, in order. ' + at,
        ],
        options: [PROMISE, { id: 'pass', label: KP.fillPro('The sheet has {her} where {she} belongs', p) }] };
    },
    // the trend chaser asks about the sound of the year
    trendChaser: state => {
      if (!working(state).length) return null;
      const wants = KP.trendOf(state).label.toLowerCase() + '. When our next record lands, is it in the sound of its year?';
      return { type: 'execSound', week: state.week,
        lines: [
          'The market tells you what it wants. This year it wants ' + wants,
          'My last building did not listen to the market. This one will. This year it wants ' + wants,
          'I have the trades open on my desk. This year the market wants ' + wants,
        ],
        options: [PROMISE, { id: 'pass', label: 'We do not chase the year' }] };
    },
    // the visionary asks about the one group people remember
    visionary: state => {
      const g = working(state).filter(x => (x.releases || []).length)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0) || (a.id < b.id ? -1 : 1))[0];
      if (!g) return null;
      const bar = g.name + '’s last record, “' + g.releases[g.releases.length - 1].songTitle + '”, is where the bar is. Does the next one land harder?';
      return { type: 'execRemember', week: state.week, groupId: g.id, count: g.releases.length,
        lines: [
          'I need one group people remember. ' + bar,
          'A group is remembered when each record lands harder than the one before. ' + bar,
          'I do not need five perfect records. I need the next one to matter. ' + bar,
        ],
        options: [PROMISE, { id: 'pass', label: 'Nobody can promise a record' }] };
    },
  };
  KP.execOwnKinds = function () { return Object.keys(OWN_BUILD); };   // the kinds of executive who ask
  KP.execOwnTypes = function () { return OWN.slice(); };               // the promises they ask for
  // what she would ask this week (pure): null when her kind asks nothing,
  // when there is nothing for her to ask about, or while one of her
  // promises is still on the books. The wording is picked by hash, never
  // the one she used last time (`line` says which; the meeting keeps it)
  KP.execOwnQuestion = function (state) {
    const build = OWN_BUILD[state.executive && state.executive.personality];
    if (!build || (state.claims || []).some(c => !c.resolved && OWN.includes(c.type))) return null;
    const q = build(state);
    if (!q) return null;
    const lines = q.lines;
    delete q.lines;
    q.text = KP.lineFor(state, 'execOwn|' + q.type, lines, state.execOwnLine);
    q.line = lines.indexOf(q.text);
    return q;
  };
  // the question was overtaken before it was answered: the trainee is no
  // longer in the room, the next sheet is already printed, the next record
  // is already out. Nothing can be promised about what has happened.
  KP.execOwnOvertaken = function (state, q) {
    if (q.type === 'execVoice' || q.type === 'execByName') {
      const p = state.people[q.personId];
      if (!p || p.status !== 'trainee') return true;
      const e = lastEval(p);
      return q.type === 'execByName' && (!e || e.week > q.evalWeek);
    }
    if (q.type === 'execSound') return !living(state).length || recordsAfter(state, q.week).length > 0;
    if (q.type === 'execRemember') {
      const g = KP.groupById(state, q.groupId);
      return !living(state).includes(g) || g.releases.length !== q.count;
    }
    return false;
  };
  // the promise, in the words the Desk's list uses, and what it is held to
  const OWN_TERMS = {
    execQuarter: (state, q) => ({ byWeek: q.week + KP.C.MEETING.quarterWeeks, baseline: q.baseline,
      label: q.baseline > 0 ? 'more in the till than ' + q.baseline + ' at the quarter’s end' : 'the till in the black at the quarter’s end' }),
    execVoice: (state, q) => { const p = state.people[q.personId];
      return { byWeek: state.week + KP.C.MEETING.OWN.voiceWeeks, personId: p.id, baseline: p.talents.vocals.cur,
        label: KP.displayName(p) + '’s voice, a better one in half a year' }; },
    // the sheet she is held to is the first one a full month after the answer
    execByName: (state, q) => { const p = state.people[q.personId];
      const sheet = KP.nextEvalWeek(state, state.week + KP.C.EVAL.every);
      return { byWeek: sheet, personId: p.id, rank: q.rank,
        label: KP.displayName(p) + ', higher than number ' + q.rank + ' on the evaluation sheet' }; },
    execSound: (state, q) => ({ byWeek: state.week + KP.C.MEETING.OWN.recordWeeks,
      label: 'our next record, in the sound of its year' }),
    execRemember: (state, q) => { const g = KP.groupById(state, q.groupId);
      return { byWeek: state.week + KP.C.MEETING.OWN.recordWeeks, groupId: g.id, count: q.count,
        baseline: g.releases[q.count - 1].reception,
        label: g.name + '’s next record, landing harder than the last' }; },
  };
  const OWN_PASS = {
    execQuarter: '{She} wrote one word on the pad, and then a smaller word under it.',
    execVoice: '{She} nodded slowly. “It does. I asked what this building is doing with the time.”',
    execByName: '{She} made a small mark next to the name. The mark was not explained.',
    execSound: '{She} looked at the chart on the wall for a while. “Then we had better be right about next year.”',
    execRemember: '{She} accepted that, the way people accept a weather forecast.',
  };
  function ownResolve(state, q, optionId) {
    const M = KP.C.MEETING, led = ownLedger(state), X = KP.execP(state);
    if (KP.execOwnOvertaken(state, q)) {
      led.overtaken++;
      return { toast: KP.fillPro('The question had answered itself before you did. {She} crossed it off the agenda.', X) };
    }
    if (optionId !== 'promise') {
      // a pass is free once. The second in a row is a pattern, and she
      // counts patterns (§96 release 1: no answer is free)
      led.passed++;
      const run = state.execPass && state.execPass.name === state.executive.name ? state.execPass : { name: state.executive.name, run: 0, week: 0 };
      // anything put on her record since the last pass ends the run
      if ((state.claims || []).some(c => c.subject.kind === 'exec' && c.week >= run.week)) run.run = 0;
      run.run++; run.week = state.week;
      state.execPass = run;
      if (run.run < 2) return { toast: KP.fillPro(OWN_PASS[q.type], X) };
      led.passedTwice++;
      state.trust = KP.clamp(state.trust + M.OWN.passAgainTrust, 0, 100);
      return { toast: KP.fillPro('“That is ' + (run.run === 2 ? 'two' : run.run) + ' of my questions running with nothing on the record.” {She} wrote that down instead.', X) };
    }
    const c = Object.assign({ type: q.type, subject: { kind: 'exec' }, askedWeek: q.week, execName: state.executive.name },
      OWN_TERMS[q.type](state, q));
    KP.openClaim(state, c);
    led.promised++;
    return { toast: 'On the record: ' + c.label + '. Due ' + KP.weekLabel(c.byWeek).text + '.' };
  }
  // the verdict: trust the way every promise to her moves it, and her
  // sentence about it. A promise made to her question is hers: under a
  // new chair it is set aside unjudged.
  function ownVerdict(state, c, met, said) {
    const M = KP.C.MEETING, led = ownLedger(state);
    if (met) { led.met++; led.types[c.type].met++; state.trust = KP.clamp(state.trust + M.payoffTrust, 0, 100); }
    else { led.missed++; led.types[c.type].missed++; state.trust = KP.clamp(state.trust + M.missTrust * (KP.boardSeatActive(state) ? 2 : 1), 0, 100); }
    // said once, so it always lands (§112)
    const text = state.executive.name + ': “' + said + '”';
    return { resolved: met ? 'met' : 'missed', notes: [met
      ? { kind: 'executive', ind: 'execOwnMet', priority: 'critical', text }
      : { kind: 'executive', ind: 'execOwnMissed', priority: 'critical', text }] };
  }
  const ownVoid = state => { ownLedger(state).void++; return { resolved: 'void', notes: [] }; };
  const ownClaim = (type, check) => KP.registerClaim(type, (state, c) =>
    c.execName && c.execName !== state.executive.name ? ownVoid(state) : check(state, c));
  ownClaim('execQuarter', (state, c) => {
    if (state.week < c.byWeek) return null;
    const now = Math.round(state.budget);
    const bar = c.baseline > 0 ? 'above ' + c.baseline : 'in the black';
    return ownVerdict(state, c, now > c.baseline, now > c.baseline
      ? 'You said the quarter would close ' + bar + '. It closed at ' + now + '. I like a number that keeps its word.'
      : 'You told me in ' + KP.weekLabel(c.week).text + ' that the quarter would close ' + bar + '. It closed at ' + now + '. I read both numbers twice. They did not change.');
  });
  ownClaim('execVoice', (state, c) => {
    const p = state.people[c.personId];
    const N = p ? KP.displayName(p) : 'That trainee';
    if (p && p.status === 'idol') return ownVerdict(state, c, true, N + ' is on a stage. That is a better answer than the one I asked for.');
    if (!p || p.status !== 'trainee') return ownVerdict(state, c, false, 'I asked about the best voice in the trainee room. ' + N + ' is no longer in it. That is an answer, and not the one you gave me.');
    if (state.week < c.byWeek) return null;
    const met = p.talents.vocals.cur >= c.baseline + KP.C.MEETING.OWN.voiceGain;
    return ownVerdict(state, c, met, met
      ? 'I sat in on ' + N + '’s lesson. Half a year, and it is a better voice. This house still knows how to do the thing it is known for.'
      : 'I sat in on ' + N + '’s lesson. It is the voice I heard half a year ago. You told me it would not be.');
  });
  ownClaim('execByName', (state, c) => {
    const p = state.people[c.personId];
    const N = p ? KP.displayName(p) : 'That trainee';
    if (p && p.status === 'idol') return ownVerdict(state, c, true, N + ' left the evaluation sheet the only good way. Noted, with pleasure.');
    if (!p || p.status !== 'trainee') return ownVerdict(state, c, false, N + ' is not on the next sheet at all. I had asked whether the number would improve.');
    const e = (p.evalHistory || []).find(x => x.week === c.byWeek);
    if (e) return ownVerdict(state, c, e.rank < c.rank, N + ': number ' + c.rank + ' when I asked, number ' + e.rank + ' on this sheet. ' +
      (e.rank < c.rank ? 'I notice when a name moves.'
        : e.rank === c.rank ? 'I notice when a name does not move, too.'
        : 'That is the wrong direction, and you had a month.'));
    // the sheet was not held, or she was not on it: nothing to judge, nothing owed
    return state.week > c.byWeek ? ownVoid(state) : null;
  });
  ownClaim('execSound', (state, c) => {
    const rel = recordsAfter(state, c.askedWeek)[0];
    if (!rel) {
      return state.week > c.byWeek ? ownVerdict(state, c, false, 'I asked whether our next record would be in the sound of its year. A year on, there has been no next record.') : null;
    }
    const lane = KP.trendLane(state, Math.floor((rel.week - 1) / KP.C.WEEKS_PER_YEAR));
    const label = ((KP.conceptById(lane) || {}).label || lane).toLowerCase();
    if (KP.laneDistance(lane, rel.conceptId) !== 0) {
      return ownVerdict(state, c, false, 'The year’s sound is ' + label + '. “' + rel.songTitle + '” is not. You told me it would be.');
    }
    return ownVerdict(state, c, true, rel.fusionOutcome === 'shift'
      ? 'I asked you to follow the market. “' + rel.songTitle + '” moved it instead. I will take that.'
      : '“' + rel.songTitle + '” is ' + label + ', in the year of ' + label + '. You listened to the market, and the market noticed.');
  });
  ownClaim('execRemember', (state, c) => {
    const g = KP.groupById(state, c.groupId);
    const rel = g && g.releases.length > c.count ? g.releases[c.count] : null;
    if (rel) {
      const met = rel.reception > c.baseline;
      return ownVerdict(state, c, met, met
        ? '“' + rel.songTitle + '” landed harder than the one before it. That is how a group becomes the one people remember: one record at a time.'
        : '“' + rel.songTitle + '” did not land harder than the one before it. You told me it would.');
    }
    if (g && !g.retiredWeek && state.week <= c.byWeek) return null;
    return ownVerdict(state, c, false, 'I asked whether ' + (g ? g.name : 'that group') + '’s next record would land harder. There was no next record.');
  });

  // ---- the scene: the question on the table -----------------------------
  KP.registerScene('execQuestion', {
    title: (state) => state.executive.name + ' is waiting',
    body: (state, sc) => '“' + sc.q.text + '” Your answer goes on the record — and the record gets checked.',
    options: (state, sc) => sc.q.options,
    resolve: (state, sc, optionId) => {
      const M = KP.C.MEETING;
      const q = sc.q;
      const opt = q.options.find(o => o.id === optionId);
      if (q.type === 'readyTrainee') {
        const p = state.people[opt.id];
        // one receipt per name (0.9.26.2): re-answering the same
        // question extends the date, it does not stack duplicates
        const dupe = (state.claims || []).find(c => !c.resolved &&
          c.type === 'readyTrainee' && c.personId === opt.id);
        if (dupe) {
          dupe.byWeek = state.week + M.claimWindow;
          return { toast: 'Still on the record: ' + opt.label + ' is closest to ready. The executive moved the date, not the expectation.' };
        }
        KP.openClaim(state, { type: 'readyTrainee', subject: { kind: 'exec' },
          personId: opt.id, personName: p ? KP.displayName(p) : opt.label,
          byWeek: state.week + M.claimWindow });
        return { toast: 'On the record: ' + opt.label + ' is closest to ready. The executive wrote it down without looking away from you.' };
      }
      if (q.type === 'comebackPromise') {
        if (optionId === 'none') {
          return { toast: 'No promises. The executive’s pen did not move, which somehow was worse.' };
        }
        const weeks = optionId === 'q1' ? M.quarterWeeks : M.quarterWeeks * 2;
        KP.openClaim(state, { type: 'comebackPromise', subject: { kind: 'exec' },
          groupId: q.groupId, byWeek: state.week + weeks });
        return { toast: 'On the record: the comeback lands by ' + KP.weekLabel(state.week + weeks).text + '. The executive underlined the date.' };
      }
      if (q.type === 'secondGroup') {
        if (optionId === 'year') {
          KP.openClaim(state, { type: 'secondGroup', subject: { kind: 'exec' },
            baseline: KP.groups(state).length, byWeek: state.week + KP.C.WEEKS_PER_YEAR });
          return { toast: KP.fillPro('A second lineup inside the year, on the record. The executive looked at the trainee-room door like {she} could already hear the debut stage.', KP.execP(state)) };
        }
        return { toast: KP.fillPro('“When the room is ready.” {She} accepted it the way people accept weather forecasts — noted, not believed, checked against the sky later.', KP.execP(state)) };
      }
      // the gravity's boardroom stage (v0.9.18): the same promise the
      // knock offers, made to the exec instead — one claim type, one truth
      if (q.type === 'soloQuestion') {
        const p = state.people[q.personId];
        if (optionId === 'promise' && p) {
          const already = (state.claims || []).some(c => !c.resolved &&
            c.type === 'soloPromise' && c.personId === p.id);
          if (!already) KP.openClaim(state, { type: 'soloPromise', subject: { kind: 'idol', id: p.id },
            personId: p.id, byWeek: state.week + KP.C.GRAVITY.soloPromiseWeeks,
            label: 'A solo credit for ' + KP.displayName(p) + ', promised to the board' });
          return { toast: KP.fillPro('“On the record,” you said, and the executive wrote the date without looking down. Two people now hold that receipt — {her}, and the board.', p) };
        }
        if (p) {
          p.morale = KP.clamp(p.morale - 3, 0, 100);
          KP.recordDirected(state, p.id, 'heldBack');
          return { toast: KP.fillPro('“The group comes first.” The executive nodded and moved the agenda along. Somewhere in the building, {she} heard the meeting summary before it was typed.', p) };
        }
        return {};
      }
      if (OWN.includes(q.type)) return ownResolve(state, q, optionId);   // her own questions (v0.11.27, §119)
      return {};
    },
    // an unanswered question is an answer
    expire: (state, sc) => {
      const M = KP.C.MEETING;
      state.trust = KP.clamp(state.trust + M.silenceTrust, 0, 100);
      return { kind: 'executive',
        text: state.executive.name + '’s office, after the skipped agenda item: “No answer is also information. Noted.”' };
    },
  });

  // ---- the claims: promises checked by predicate, fire once -------------
  KP.registerClaim('readyTrainee', (state, c) => {
    const M = KP.C.MEETING;
    const p = state.people[c.personId];
    if (p && p.status === 'idol') {
      const g = KP.groupOf(state, p.id);
      const rec = g && g.results ? g.results.reception : 0;
      const met = rec >= 55;
      state.trust = KP.clamp(state.trust + (met ? M.payoffTrust : 0), 0, 100);
      return { resolved: met ? 'met' : 'metPoorly',
        notes: [{ kind: 'executive', text: state.executive.name + ': “' +
          KP.fillPro(met
            ? 'You told me ' + KP.displayName(p) + ' was the one, and then {she} was. I remember the people who read talent correctly.'
            : '{She} debuted, as you said. The debut itself we will discuss another day.', p) + '”' }] };
    }
    if (!p || p.status === 'released' || state.week > c.byWeek) {
      state.trust = KP.clamp(state.trust + M.missTrust *
        (KP.boardSeatActive && KP.boardSeatActive(state) ? 2 : 1), 0, 100);   // §85 B: a missed promise costs twice the face under the board seat
      return { resolved: 'missed',
        notes: [{ kind: 'executive', urgent: true, text: state.executive.name + ': “You told me in ' +
          KP.weekLabel(c.week).text + ' that ' + c.personName + ' was closest to ready. ' +
          (p && p.status === 'released' ? KP.fillPro('You then released {her}.', p) : 'The window has closed.') +
          ' I keep my notes, and I reread them.”' }] };
    }
    return null;
  });
  KP.registerClaim('comebackPromise', (state, c) => {
    const M = KP.C.MEETING;
    const g = KP.groupById(state, c.groupId);
    if (g && (g.lastReleaseWeek || 0) > c.week) {
      state.trust = KP.clamp(state.trust + M.payoffTrust, 0, 100);
      return { resolved: 'met',
        notes: [{ kind: 'executive', text: state.executive.name + ': “' + g.name +
          ' came back inside the window you promised. A calendar that means something — refreshing.”' }] };
    }
    if (state.week > c.byWeek) {
      state.trust = KP.clamp(state.trust + M.missTrust *
        (KP.boardSeatActive && KP.boardSeatActive(state) ? 2 : 1), 0, 100);   // §85 B: a missed promise costs twice the face under the board seat
      return { resolved: 'missed',
        notes: [{ kind: 'executive', urgent: true, text: state.executive.name + ': “You promised the ' +
          (g ? g.name : '') + ' comeback by ' + KP.weekLabel(c.byWeek).text +
          '. It is ' + KP.weekLabel(state.week).text + '. I do not enjoy being a person who checks dates. And yet.”' }] };
    }
    return null;
  });

  KP.registerClaim('secondGroup', (state, c) => {
    const M = KP.C.MEETING;
    if (KP.groups(state).length > c.baseline) {
      state.trust = KP.clamp(state.trust + M.payoffTrust, 0, 100);
      return { resolved: 'met',
        notes: [{ kind: 'executive', text: state.executive.name + ': “A second lineup, inside the window. This building is starting to look like a company.”' }] };
    }
    if (state.week > c.byWeek) {
      state.trust = KP.clamp(state.trust + M.missTrust *
        (KP.boardSeatActive && KP.boardSeatActive(state) ? 2 : 1), 0, 100);   // §85 B: a missed promise costs twice the face under the board seat
      return { resolved: 'missed',
        notes: [{ kind: 'executive', urgent: true, text: state.executive.name + ': “A year ago the trainee room was full and you said a second lineup was coming. The room is still full. Rooms do not debut, ' + 'unfortunately.”' }] };
    }
    return null;
  });

  // ---- compat shim: the old action, now one line of scene plumbing ------
  KP.execScene = function (state) {
    return (state.scenes || []).find(sc => sc.kind === 'execQuestion') || null;
  };
  KP.answerMeeting = function (state, optionIdx) {
    const sc = KP.execScene(state);
    if (!sc) return { ok: false, reason: 'There is no question on the table.' };
    const opt = sc.q.options[optionIdx];
    if (!opt) return { ok: false, reason: 'That was not one of the options.' };
    const r = KP.resolveScene(state, sc.id, opt.id);
    return r.ok ? { ok: true, note: r.toast } : r;
  };
})(typeof window !== 'undefined' ? window : globalThis);
