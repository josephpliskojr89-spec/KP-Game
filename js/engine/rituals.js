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
    KP.note(state, { kind: 'company', ind: 'pointNudge', priority: 'flavor', groupId: g.id,
      text: kind === 'votes'
        ? 'The word goes out through the fan cafés: pre-voting opens tonight, ID verification guide attached, the spreadsheet is already color-coded. The fandom mobilizes the way only organized love can.'
        : 'The streaming party is ON — playlists distributed, the "no muting, no skipping" rules reposted, somebody made a counter website overnight. This week’s digital line just got a floor under it.' });
    return { ok: true };
  };

  // ---- the monthly eval --------------------------------------------------
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
    ranked.forEach((row, i) => {
      const p = row.p;
      const rank = i + 1;
      p.evalHistory = p.evalHistory || [];
      const prev = p.evalHistory.length ? p.evalHistory[p.evalHistory.length - 1] : null;
      p.evalHistory.push({ week: state.week, rank, of });
      if (p.evalHistory.length > E.historyCap) p.evalHistory.shift();
      // morale rides trajectory, not position
      if (prev) {
        const delta = KP.clamp(prev.rank - rank, -E.swingCap, E.swingCap);
        if (delta !== 0) p.morale = KP.clamp(p.morale + delta, 0, 100);
        if (delta > climberDelta) { climber = p; climberDelta = delta; }
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
          inbox.push({ kind: 'company', ind: 'evalTalk', priority: 'flavor', personId: p.id,
            text: KP.fillPro(KP.displayName(p) + ' got the after-eval talk — bottom of the sheet twice running. {She} nodded through it and stayed two extra hours in practice room 3, which is either the answer or the beginning of a different conversation.', p) });
        }
      } else {
        p.evalBottomStreak = 0;
      }
    });
    const names = ranked.slice(0, 3).map((r, i) => (i + 1) + '. ' + KP.displayName(r.p));
    inbox.push({ kind: 'company', ind: 'evalSheet', priority: 'flavor',
      text: 'Monthly evaluation day: showcase run twice, coaches at the long table, and the ranked sheet on the wall by six — ' + names.join(' · ') + ' of ' + of +
        (climber ? '. The room’s story is ' + KP.displayName(climber) + ', up ' + climberDelta + ' — everyone recalibrated who to practice next to.' : '.') +
        ' The sheet ranks what the coaches can SEE. Everyone in the building knows those are not always the same thing.' });
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
