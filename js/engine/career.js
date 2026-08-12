/* The career ladder of objectives. When one resolves, the executive sets
   the next — the world always asks something of the player. v0.2.0 ships
   the comeback ladder; later phases add markets, second groups, politics. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // Self-healing predicate: an objective is finished and no successor has
  // been issued. Called every advance; issues at most one per week.
  KP.objectiveSuccessionDue = function (state) {
    return !!(KP.groups(state).some(g => g.debuted) &&
      state.objective && state.objective.status !== 'open' &&
      !state.objective.succeeded);
  };

  KP.issueNextObjective = function (state, rng) {
    const CB = KP.C.COMEBACK;
    // the next directive targets the group that has waited longest since a
    // release — the executive keeps every act working
    const g = KP.groups(state).filter(x => x.debuted)
      .sort((a, b) => (a.lastReleaseWeek || 0) - (b.lastReleaseWeek || 0))[0];
    const prev = state.objective;
    prev.succeeded = true;
    state.objectiveHistory = state.objectiveHistory || [];
    state.objectiveHistory.push({
      type: prev.type, text: prev.text, status: prev.status, week: state.week,
    });
    // the record keeps its last chapter, not the whole shelf (0.9.13
    // audit: ~8 directives/year, unbounded — the UI reads recent only)
    if (state.objectiveHistory.length > 60) {
      state.objectiveHistory = state.objectiveHistory.slice(-50);
    }

    const lastReception = g.results ? g.results.reception : 50;
    const confident = state.trust >= 60;
    // the bar moves with the story: success raises it, a stumble lowers it
    const target = KP.clamp(Math.round(
      lastReception + (confident ? 3 : -4) + (prev.status === 'missed' ? -6 : 0)), 40, 82);
    const deadline = state.week + CB.objectiveWeeks;

    // the board reinvests in what works
    const grant = Math.round(25 + Math.max(0, lastReception - 45) * 0.6);
    state.budget += grant;
    // the first post-debut directive announces the opening-up: the
    // signing allowance is retired, the books become the leash
    const capJustLifted = prev.type === 'debutGirlGroup';

    state.objective = {
      type: 'comeback',
      groupId: g.id,
      text: g.name + ' comeback by ' + KP.weekLabel(deadline).text + ' — the executive wants it received at least as well as the last release.',
      targetReception: target,
      deadlineWeek: deadline,
      status: 'open',
    };

    const line = execObjectiveLine(state, prev, rng, g);
    return {
      kind: 'executive', urgent: true,
      text: state.executive.name + ': ' + line +
        ' The division books show a ' + grant + ' reinvestment.' +
        (capJustLifted
          ? ' “And the signing allowance is retired — the division is yours to staff. Sign who you need. I read the books every month, and so does the board.”'
          : ''),
    };
  };

  function execObjectiveLine(state, prev, rng, g) {
    const band = g.results ? g.results.receptionBand : 'solid';
    if (prev.status === 'missed') {
      return '“The deadline came and went, and I wore that in front of the board. You get one more window. ' + g.name + ' comes back, and it lands. Am I clear?”';
    }
    switch (band) {
      case 'sensation':
        return rng.pick([
          '“Everyone upstairs suddenly remembers approving this project. Ride it — the next comeback goes while the clip is still everywhere.”',
          '“A sensation buys you exactly one thing: the board’s patience for the follow-up. Spend it well.”']);
      case 'strong':
        return '“The debut worked. Debuts are luck until the comeback proves otherwise. Prove otherwise.”';
      case 'solid':
        return '“A respectable start is a foundation, not a result. The comeback decides which one we tell the board it was.”';
      default:
        return '“The debut did not land the way either of us wanted. The comeback is the correction. Make it one.”';
    }
  }

  // Popularity in words — the player reads temperature, not a meter.
  KP.popularityWord = function (pop) {
    if (pop >= 75) return 'burning';
    if (pop >= 58) return 'hot';
    if (pop >= 42) return 'warm';
    if (pop >= 25) return 'cooling';
    return 'fading';
  };
})(typeof window !== 'undefined' ? window : globalThis);
