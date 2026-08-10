/* The Monday meeting (v0.7.1) — the executive finally asks questions.
   Expert consult: "trust is a number that moves without a single scene
   where the player answers to anyone." Every ten weeks the exec asks
   one question with constrained answers; the claim goes on the record
   (state.execNotes) and is CHECKED later by predicate — deliver and
   she remembers warmly; miss and she quotes you back. Reading your own
   roster — the sim's core skill — becomes a social stake. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function notes(state) { return state.execNotes = state.execNotes || []; }

  KP.meetingWeek = function (state) {
    const M = KP.C.MEETING;
    const out = [];
    state.nextMeetingWeek = state.nextMeetingWeek || (M.everyWeeks + 1);

    // an unanswered question is an answer
    if (state.execQuestion && state.week - state.execQuestion.week >= M.ignoreAfterWeeks) {
      state.execQuestion = null;
      state.trust = KP.clamp(state.trust + M.silenceTrust, 0, 100);
      out.push({ kind: 'executive',
        text: state.executive.name + '’s office, after the skipped agenda item: “No answer is also information. Noted.”' });
    }

    // pose the next question
    if (!state.execQuestion && state.week >= state.nextMeetingWeek) {
      state.nextMeetingWeek = state.week + M.everyWeeks;
      const q = buildQuestion(state);
      if (q) {
        state.execQuestion = q;
        out.push({ kind: 'executive', urgent: true,
          text: state.executive.name + ', Monday meeting: “' + q.text + '” Your answer goes on the record. The options are on the Desk.' });
      }
    }

    // check standing claims — self-healing predicates, fire once
    notes(state).forEach(c => {
      if (c.resolved) return;
      if (c.type === 'readyTrainee') {
        const p = state.people[c.personId];
        if (p && p.status === 'idol') {
          const g = KP.groupOf(state, p.id);
          const rec = g && g.results ? g.results.reception : 0;
          c.resolved = rec >= 55 ? 'met' : 'metPoorly';
          state.trust = KP.clamp(state.trust + (rec >= 55 ? M.payoffTrust : 0), 0, 100);
          out.push({ kind: 'executive', text: state.executive.name + ': “' +
            (rec >= 55
              ? 'You told me ' + KP.displayName(p) + ' was the one, and then she was. I remember the people who read talent correctly.'
              : 'She debuted, as you said. The debut itself we will discuss another day.') + '”' });
        } else if (!p || p.status === 'released' || state.week > c.byWeek) {
          c.resolved = 'missed';
          state.trust = KP.clamp(state.trust + M.missTrust, 0, 100);
          out.push({ kind: 'executive', urgent: true, text: state.executive.name + ': “You told me in ' +
            KP.weekLabel(c.week).text + ' that ' + c.personName + ' was closest to ready. ' +
            (p && p.status === 'released' ? 'You then released her.' : 'The window has closed.') +
            ' I keep my notes, ' + 'and I reread them.”' });
        }
      } else if (c.type === 'comebackPromise') {
        const g = KP.groupById(state, c.groupId);
        if (g && (g.lastReleaseWeek || 0) > c.week) {
          c.resolved = 'met';
          state.trust = KP.clamp(state.trust + M.payoffTrust, 0, 100);
          out.push({ kind: 'executive', text: state.executive.name + ': “' + g.name +
            ' came back inside the window you promised. A calendar that means something — refreshing.”' });
        } else if (state.week > c.byWeek) {
          c.resolved = 'missed';
          state.trust = KP.clamp(state.trust + M.missTrust, 0, 100);
          out.push({ kind: 'executive', urgent: true, text: state.executive.name + ': “You promised the ' +
            (g ? g.name : '') + ' comeback by ' + KP.weekLabel(c.byWeek).text +
            '. It is ' + KP.weekLabel(state.week).text + '. I do not enjoy being a person who checks dates. And yet.”' });
        }
      }
    });
    state.execNotes = notes(state).filter(c => !c.resolved).concat(
      notes(state).filter(c => c.resolved).slice(-KP.C.MEETING.maxNotes));
    return out;
  };

  function buildQuestion(state) {
    // alternate deterministically between the two questions that exist
    const wantReady = KP.hash01([state.seed, 'meeting', state.week].join('|')) < 0.5;
    const free = KP.freeTrainees(state).map(id => state.people[id])
      .filter(p => p.status === 'trainee');
    const debutedGroups = KP.groups(state).filter(g => g.debuted && !g.prep && !g.tour);
    if ((wantReady || !debutedGroups.length) && free.length >= 2) {
      const opts = free.slice()
        .sort((a, b) => (b.talents.vocals.cur + b.talents.dance.cur + b.talents.charisma.cur) -
          (a.talents.vocals.cur + a.talents.dance.cur + a.talents.charisma.cur))
        .slice(0, 3);
      return { type: 'readyTrainee', week: state.week,
        text: 'Which trainee is closest to ready?',
        options: opts.map(p => ({ id: p.id, label: KP.displayName(p) })) };
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

  KP.answerMeeting = function (state, optionIdx) {
    const M = KP.C.MEETING;
    const q = state.execQuestion;
    if (!q) return { ok: false, reason: 'There is no question on the table.' };
    const opt = q.options[optionIdx];
    if (!opt) return { ok: false, reason: 'That was not one of the options.' };
    state.execQuestion = null;
    if (q.type === 'readyTrainee') {
      const p = state.people[opt.id];
      notes(state).push({ type: 'readyTrainee', week: q.week, personId: opt.id,
        personName: p ? KP.displayName(p) : opt.label, byWeek: state.week + M.claimWindow });
      return { ok: true, note: 'On the record: ' + opt.label + ' is closest to ready. The executive wrote it down without looking away from you.' };
    }
    if (q.type === 'comebackPromise') {
      if (opt.id === 'none') {
        return { ok: true, note: 'No promises. The executive’s pen did not move, which somehow was worse.' };
      }
      const weeks = opt.id === 'q1' ? M.quarterWeeks : M.quarterWeeks * 2;
      notes(state).push({ type: 'comebackPromise', week: q.week, groupId: q.groupId,
        byWeek: state.week + weeks });
      return { ok: true, note: 'On the record: the comeback lands by ' + KP.weekLabel(state.week + weeks).text + '. The executive underlined the date.' };
    }
    return { ok: false, reason: 'Unknown question.' };
  };
})(typeof window !== 'undefined' ? window : globalThis);
