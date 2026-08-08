/* The career ladder of objectives. When one resolves, the executive sets
   the next — the world always asks something of the player. v0.2.0 ships
   the comeback ladder; later phases add markets, second groups, politics. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // Self-healing predicate: an objective is finished and no successor has
  // been issued. Called every advance; issues at most one per week.
  KP.objectiveSuccessionDue = function (state) {
    return !!(state.group && state.group.debuted &&
      state.objective && state.objective.status !== 'open' &&
      !state.objective.succeeded);
  };

  KP.issueNextObjective = function (state, rng) {
    const CB = KP.C.COMEBACK;
    const g = state.group;
    const prev = state.objective;
    prev.succeeded = true;
    state.objectiveHistory = state.objectiveHistory || [];
    state.objectiveHistory.push({
      type: prev.type, text: prev.text, status: prev.status, week: state.week,
    });

    const lastReception = g.results ? g.results.reception : 50;
    const confident = state.trust >= 60;
    // the bar moves with the story: success raises it, a stumble lowers it
    const target = KP.clamp(Math.round(
      lastReception + (confident ? 3 : -4) + (prev.status === 'missed' ? -6 : 0)), 40, 82);
    const deadline = state.week + CB.objectiveWeeks;

    // the board reinvests in what works
    const grant = Math.round(25 + Math.max(0, lastReception - 45) * 0.6);
    state.budget += grant;
    let extraSigning = false;
    if (rng.chance(0.5) && state.signingsAllowed - state.signingsUsed < 2) {
      state.signingsAllowed += 1;
      extraSigning = true;
    }

    state.objective = {
      type: 'comeback',
      text: g.name + ' comeback by ' + KP.weekLabel(deadline).text + ' — the executive wants it received at least as well as the last release.',
      targetReception: target,
      deadlineWeek: deadline,
      status: 'open',
    };

    const line = execObjectiveLine(state, prev, rng);
    return {
      kind: 'executive', urgent: true,
      text: state.executive.name + ': ' + line +
        ' The division books show a ' + grant + ' reinvestment' +
        (extraSigning ? ' and approval for one more external signing.' : '.'),
    };
  };

  function execObjectiveLine(state, prev, rng) {
    const g = state.group;
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
