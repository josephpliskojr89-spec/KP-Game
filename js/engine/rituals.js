/* The rituals (v0.10.7, §80 findings 15 + 9). Two legibility rites.
   THE MONTHLY EVAL: trainee life runs on the ranked showcase — a
   monthly evaluation whose ranks come from PERCEIVED reads (the fog
   applies; the coaches rank what they see, and a fogged gem can rank
   low for months), whose results get posted where everyone reads
   them, and whose morale swings ride TRAJECTORY, not position —
   climbing from eighth to fifth feels like flying; sliding from
   first to third feels like falling. The bottom of the sheet gets
   the talk, and the talk composes with the practice room's quit and
   aging machinery. THE POINT BREAKDOWN lives in shows.js: post-air
   components in words, the near-miss as injustice fuel, and the one
   mobilization nudge a week (KP.pointNudge, here). */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function evalLedger(state) {
    state.evalLedger = state.evalLedger || { sheets: 0, climbs: 0, slides: 0, talks: 0 };
    return state.evalLedger;
  }
  KP.evalLedger = evalLedger;
  function pointLedger(state) {
    state.pointLedger = state.pointLedger || { breakdowns: 0, nearMisses: 0, nudges: 0 };
    return state.pointLedger;
  }
  KP.pointLedger = pointLedger;

  // ---- the nudge: one player push a week --------------------------------
  KP.pointNudge = function (state, groupId, kindId) {
    const P = KP.C.POINTS;
    const kind = kindId === 'votes' ? 'votes' : 'streams';
    const g = KP.groups(state).find(x => x.id === groupId);
    if (!g || !g.debuted) return { ok: false, reason: 'A mobilization needs a group on the board.' };
    if (g.prep || state.week > (g.promoUntil || 0)) {
      return { ok: false, reason: 'Mobilizations are for promo weeks — there is no scoreboard to move right now.' };
    }
    if (g.pointNudge && state.week - g.pointNudge.week <= 1) {
      return { ok: false, reason: 'One push a week. The fandom is organized, not infinite.' };
    }
    if (state.budget < P.nudgeCost) return { ok: false, reason: 'Even a streaming party has a catering bill.' };
    state.budget -= P.nudgeCost;
    if (KP.ledgerFlow) KP.ledgerFlow(state, 'marketing', -P.nudgeCost);
    g.pointNudge = { week: state.week, kind };
    pointLedger(state).nudges++;
    // the quiet (v0.10.29, §89 Phase 1): the toast and the group-page chip
    // are the echo — no inbox line for a button the player just pressed
    return { ok: true };
  };

  // ---- the monthly eval --------------------------------------------------
  // the one eval (v0.10.30, §89 D4): her latest rank on the sheet
  KP.evalRankOf = function (p) {
    const e = p && p.evalHistory && p.evalHistory[p.evalHistory.length - 1];
    return e ? e.rank : null;
  };
  KP.registerWeekly('evals', 612, function (state, rng, inbox, roster) {
    const E = KP.C.EVAL;
    const phase = Math.floor(KP.hash01([state.seed, 'evalphase'].join('|')) * E.every);
    if (state.week % E.every !== phase) return;
    const trainees = roster.filter(p => p.status === 'trainee' && !KP.onBreak(p));
    if (trainees.length < E.minTrainees) return;
    const led = evalLedger(state);
    const panel = KP.DATA.evaluators[0];
    // the coaches rank what they SEE — perceived reads, the fog intact,
    // plus the day itself (a showcase has nerves)
    const ranked = trainees.map(p => ({
      p,
      score: KP.C.TALENTS.reduce((s, d) => s + KP.perceived(state, p, d, panel), 0) / KP.C.TALENTS.length +
        KP.derived(p).stagePresence * 0.15 + rng.normal(0, 3),
    })).sort((a, b) => b.score - a.score);
    led.sheets++;
    const of = ranked.length;
    let climber = null, climberDelta = 0;
    // the ladder's witnesses (v0.11.5, §96 wiring): a first #1, the talk,
    // the biggest move either way, and whether the top changed hands
    let firstTop = null, talked = null, slider = null, sliderDelta = 0, maxMove = 0;
    const prevTop = state.lastEvalTopId || null;
    const aceChanged = !!prevTop && prevTop !== ranked[0].p.id && ranked.some(r => r.p.id === prevTop);
    // the room knows who is first (group.js's passed-over ace reads this)
    state.lastEvalTopId = ranked[0].p.id;
    ranked.forEach((row, i) => {
      const p = row.p;
      const rank = i + 1;
      p.evalHistory = p.evalHistory || [];
      const prev = p.evalHistory.length ? p.evalHistory[p.evalHistory.length - 1] : null;
      // her first #1 (v0.11.5): the flag remembers past the twelve-month
      // window; an old save with a #1 already on the file backfills quietly
      if (rank === 1 && !p.flags.firstEvalTopWeek) {
        const before = p.evalHistory.find(e => e.rank === 1);
        p.flags.firstEvalTopWeek = before ? before.week : state.week;
        if (!before) firstTop = firstTop || p;
      }
      p.evalHistory.push({ week: state.week, rank, of });
      if (p.evalHistory.length > E.historyCap) p.evalHistory.shift();
      // the ace (from practice.js, v0.10.30 §89 D4): three straight months
      // at the top of the sheet and the room has a name for her
      if (rank === 1) {
        p.flags.evalStreak = (prev && prev.rank === 1 ? (p.flags.evalStreak || 0) : 0) + 1;
        if (p.flags.evalStreak === E.aceStreakAt) {
          p.history.push({ week: state.week, text: 'Held the top of the evaluation sheet three months running. The vocal coaches started saying “the ace” and meaning it.' });
        }
      } else {
        p.flags.evalStreak = 0;
      }
      // morale rides trajectory, not position
      if (prev) {
        const delta = KP.clamp(prev.rank - rank, -E.swingCap, E.swingCap);
        if (delta !== 0) p.morale = KP.clamp(p.morale + delta, 0, 100);
        if (delta > climberDelta) { climber = p; climberDelta = delta; }
        if (delta < sliderDelta) { slider = p; sliderDelta = delta; }
        if (Math.abs(delta) > maxMove) maxMove = Math.abs(delta);
        if (delta > 0) led.climbs++;
        if (delta < 0) led.slides++;
        if (delta >= 2) {
          p.history.push({ week: state.week, text: 'Climbed the monthly eval sheet — ' + prev.rank + ' to ' + rank + ' of ' + of + '. The practice room noticed before the sheet did; the sheet made it official.' });
        }
      }
      // the bottom of the sheet gets the talk
      const bottomThird = rank > of - Math.max(1, Math.floor(of / 3));
      if (bottomThird) {
        p.evalBottomStreak = (p.evalBottomStreak || 0) + 1;
        if (p.evalBottomStreak === E.bottomTalkAfter) {
          led.talks++;
          p.morale = KP.clamp(p.morale - E.bottomMorale, 0, 100);
          p.history.push({ week: state.week, text: 'The after-eval talk — the one held with the door open just enough that everyone knows it is happening. Rank ' + rank + ' of ' + of + ' again. The room gets smaller every month the sheet says the same thing.' });
          talked = talked || p;   // the month of the talk posts the sheet critical (v0.11.5)
          inbox.push({ kind: 'company', ind: 'evalTalk', priority: 'high', personId: p.id,
            text: KP.fillPro(KP.lineFor(state, 'evalTalk|' + p.id, [
              KP.displayName(p) + ' got the after-eval talk — bottom of the sheet twice running. {She} nodded through it and stayed two extra hours in practice room 3, which is either the answer or the beginning of a different conversation.',
              KP.displayName(p) + ' got the after-eval talk — the door open just enough. Bottom of the sheet twice running. {She} said “yes” eleven times and nothing else, and was in practice room 3 before the coaches had left the building.',
              'The after-eval talk, held with ' + KP.displayName(p) + ' this month: two sheets at the bottom, one quiet conversation. {She} did not cry. {She} asked for a copy of the sheet. That is either the answer or a different conversation starting.',
            ]), p) });
        }
      } else {
        p.evalBottomStreak = 0;
      }
    });
    const names = ranked.slice(0, 3).map((r, i) => (i + 1) + '. ' + KP.displayName(r.p));
    // the ladder (v0.11.5, §96 wiring): critical the month a trainee takes
    // #1 for the first time or the talk is held; high on a real move either
    // way or a new ace; normal when the sheet moved at all; flavor only when
    // nothing did. One clause names the movement that set it.
    const priority = (firstTop || talked) ? 'critical'
      : (maxMove >= E.sheetHighMove || aceChanged) ? 'high'
      : maxMove > 0 ? 'normal' : 'flavor';
    const story = firstTop ? KP.displayName(firstTop) + ' took the top of the sheet for the first time'
      : talked ? 'the after-eval talk, held with ' + KP.displayName(talked)
      : aceChanged ? KP.displayName(ranked[0].p) + ', who took the top from ' + KP.displayName(state.people[prevTop])
      : climber ? KP.displayName(climber) + ', up ' + climberDelta
      : slider ? KP.displayName(slider) + ', down ' + (-sliderDelta)
      : null;
    inbox.push({ kind: 'company', ind: 'evalSheet', priority,
      text: KP.lineFor(state, 'evalSheet', [
        'Monthly evaluation day: showcase run twice, coaches at the long table, and the ranked sheet on the wall by six — ' + names.join(' · ') + ' of ' + of +
          (story ? '. The room’s story is ' + story + ' — everyone recalibrated who to practice next to.' : '. Nobody moved — the sheet read like last month’s.') +
          ' The sheet ranks what the coaches can SEE. Everyone in the building knows those are not always the same thing.',
        'Evaluation day. The showcase ran twice, the coaches sat the long table, and by six the sheet was on the wall: ' + names.join(' · ') + ' of ' + of +
          (story ? '. The story is ' + story + ', and the room re-sorted itself by dinner.' : '. Nothing moved; the room ate dinner in the usual order.') +
          ' The sheet is what the coaches saw. The building keeps its own sheet.',
        'The monthly sheet went up at six: ' + names.join(' · ') + ' of ' + of +
          (story ? '. Everyone read it for one thing first — ' + story + ' — and then back up to see who had been passed.' : '. Everyone read it once and went back to practice; nothing had moved.') +
          ' Rank is what a showcase can measure. The rest gets argued in the hallway.',
      ]) });
  });

  // ---- the timeline reacts ----------------------------------------------
  KP.onFeedEvent('evalSheet', (state, n, rng) => rng.chance(0.25) ? rng.pick([
    { persona: 'casual', text: 'monthly-evaluation culture is the most k-pop thing that civilians never see: a ranked sheet, a quiet hallway, and eleven teenagers doing calculus about their own futures' },
    { persona: 'stan', text: 'trainee eval day. somewhere a future legend just ranked seventh and is about to practice until the janitor sends her home. this is how the stories all start' },
  ]) : null);
  KP.onFeedEvent('pointNudge', (state, n, rng) => rng.chance(0.4) ? rng.pick([
    { persona: 'fan', text: 'the voting guide is out. ID verified. alarms set. we did not organize this fandom for DECORATIVE purposes' },
    { persona: 'casual', text: 'fandom mobilization infrastructure remains more sophisticated than most political campaigns and nobody in either field wants to talk about it' },
  ]) : null);
  KP.onFeedEvent('pointBreakdown', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'we read the breakdown. we know EXACTLY which line fell short. the spreadsheet has been updated. next week that line comes home' },
    { persona: 'casual', text: 'music show point breakdowns: the only sports analytics scene where the analysts also buy the merchandise' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
