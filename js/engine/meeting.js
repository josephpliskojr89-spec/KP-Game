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
      state.nextMeetingWeek = state.week + M.everyWeeks;
      const q = buildQuestion(state);
      if (q) {
        KP.openScene(state, { kind: 'execQuestion', q,
          expiresWeek: state.week + M.ignoreAfterWeeks - 1 });
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
    if ((wantReady || !debutedGroups.length) && free.length >= 2) {
      const opts = free.slice()
        .sort((a, b) => (b.talents.vocals.cur + b.talents.dance.cur + b.talents.charisma.cur) -
          (a.talents.vocals.cur + a.talents.dance.cur + a.talents.charisma.cur))
        .slice(0, 3);
      return { type: 'readyTrainee', week: state.week,
        text: 'Which trainee is closest to ready?',
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
    if (debutedGroups.length) {
      const g = debutedGroups.sort((a, b) => (a.lastReleaseWeek || 0) - (b.lastReleaseWeek || 0))[0];
      return { type: 'comebackPromise', week: state.week, groupId: g.id,
        text: 'When does ' + g.name + ' come back?',
        options: [
          { id: 'q1', label: 'This quarter' },
          { id: 'q2', label: 'Next quarter' },
          { id: 'none', label: 'No promises' },
        ] };
    }
    return null;
  }

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
          KP.recordDirected(state, p.id, 'heldBack', -1);
          return { toast: KP.fillPro('“The group comes first.” The executive nodded and moved the agenda along. Somewhere in the building, {she} heard the meeting summary before it was typed.', p) };
        }
        return {};
      }
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
      state.trust = KP.clamp(state.trust + M.missTrust, 0, 100);
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
      state.trust = KP.clamp(state.trust + M.missTrust, 0, 100);
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
      state.trust = KP.clamp(state.trust + M.missTrust, 0, 100);
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
