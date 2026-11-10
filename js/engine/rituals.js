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

  // ---- the mission (v0.11.13, §104): the month has a room ---------------
  // The trainee years were two dials and four silent weeks. Each showcase is
  // now held in one of five rooms, known a month ahead, so the focus dial
  // has a reason to move: a trainee who drills the month's room until the
  // day carries it in. The coaches run a rotation: every room once in five
  // months, in an order of the save's own, never the same room twice
  // running. A hash, never a draw.
  const MISSIONS = [
    { id: 'vocals', name: 'the ballad round', what: 'one voice, one piano, nowhere to stand but in the song' },
    { id: 'dance', name: 'the formation round', what: 'eight counts, a wall of mirror, and the dance coach’s clipboard' },
    { id: 'rap', name: 'the cypher', what: 'a beat nobody chose and sixteen bars each' },
    { id: 'charisma', name: 'the solo stage', what: 'ninety seconds alone in front of the long table' },
    { id: 'visuals', name: 'the camera test', what: 'three lenses, a ring light, and the playback on the big screen' },
  ];
  KP.EVAL_MISSIONS = MISSIONS;
  KP.evalPhase = function (state) { return Math.floor(KP.hash01([state.seed, 'evalphase'].join('|')) * KP.C.EVAL.every); };
  // the next showcase on or after a week
  KP.nextEvalWeek = function (state, from) {
    const every = KP.C.EVAL.every, ph = KP.evalPhase(state);
    let w = from == null ? state.week : from;
    while (((w % every) + every) % every !== ph) w++;
    return w;
  };
  KP.evalMissionAt = function (state, evalWeek) {
    const n = MISSIONS.length;
    const k = Math.floor((evalWeek - KP.evalPhase(state)) / KP.C.EVAL.every);   // which showcase this is
    const lap = Math.floor(k / n), pos = ((k % n) + n) % n;
    const order = L => MISSIONS.map((m, i) => ({ i, h: KP.hash01([state.seed, 'mission', L, m.id].join('|')) }))
      .sort((a, b) => a.h - b.h || a.i - b.i).map(x => x.i);
    const cur = order(lap);
    // a lap that would open on the room the last one closed on swaps its
    // first two. The swap never reaches a lap's last room, so this needs no
    // look further back than one lap.
    if (cur[0] === order(lap - 1)[n - 1]) { const t = cur[0]; cur[0] = cur[1]; cur[1] = t; }
    return MISSIONS[cur[pos]];
  };
  // the room the next showcase is held in, and its date, from the desk's
  // seat: between weeks, this week's showcase (if it was one) is over
  KP.evalMission = function (state) {
    const week = KP.nextEvalWeek(state, state.week + 1);
    return Object.assign({ week, label: KP.C.TALENT_LABELS[KP.evalMissionAt(state, week).id] }, KP.evalMissionAt(state, week));
  };
  // how much of the month she has drilled it, in words the board prints
  KP.missionPrepOf = function (state, p) {
    const every = KP.C.EVAL.every;
    const weeks = Math.min(every, (p && p.missionWeeks) || 0);
    return { weeks, of: every, share: weeks / every, bonus: Math.round((weeks / every) * KP.C.EVAL.missionPrep * 100) / 100 };
  };

  // ---- the moment: one thing from the room, never the same kind twice running ----
  // each kind finds its own subject off the files, or stands down. Words only.
  const tenure = (state, p) => (p.signedWeek != null ? state.week - p.signedWeek : 0);
  const MOMENTS = [
    { kind: 'newest', find: (state, rows) => { const E = KP.C.EVAL; const r = rows.filter(x => tenure(state, x.p) <= E.momentNewWeeks && (x.p.evalHistory || []).length <= 1).sort((a, b) => tenure(state, a.p) - tenure(state, b.p) || (a.p.id < b.p.id ? -1 : 1))[0]; return r ? [r.p] : null; },
      text: 'It was {N}’s first showcase. {She} lost the second verse, said so out loud, and started again from the top. The long table wrote that down as a point in {pos} favour.' },
    { kind: 'drilled', find: (state, rows) => { const r = rows.filter(x => (x.p.missionWeeks || 0) >= KP.C.EVAL.every).sort((a, b) => a.rank - b.rank)[0]; return r ? [r.p] : null; },
      text: '{N} had the month’s piece in {pos} sleep. {Pos} roommate confirms this literally.' },
    { kind: 'veteran', find: (state, rows) => { const r = rows.filter(x => tenure(state, x.p) >= KP.C.EVAL.momentVeteranWeeks).sort((a, b) => tenure(state, b.p) - tenure(state, a.p) || (a.p.id < b.p.id ? -1 : 1))[0]; return r ? [r.p] : null; },
      text: '{N} has stood in front of that table for two years and more. {She} still bows to it before the music starts, and the newer ones have started doing it too.' },
    { kind: 'youngest', find: (state, rows) => { const s = rows.slice().sort((a, b) => a.p.age - b.p.age || (a.p.id < b.p.id ? -1 : 1)); return s.length >= 2 && s[0].p.age < s[1].p.age ? [s[0].p] : null; },
      text: '{N}, the youngest in the room, did not look at the long table once. The coaches are divided on whether that is nerve or nerves.' },
    { kind: 'last', find: (state, rows) => { const r = rows[rows.length - 1]; return r && rows.length >= 3 && !(r.p.evalBottomStreak >= KP.C.EVAL.bottomTalkAfter) ? [r.p] : null; },
      text: '{N}, last on the sheet, stayed to stack the chairs and asked the dance coach one question. The answer took ten minutes, and {she} wrote it down.' },
    { kind: 'pair', find: (state, rows) => { for (let i = 0; i + 1 < rows.length; i++) { const rel = (state.relationships || {})[KP.pairKey(rows[i].p, rows[i + 1].p)]; if (rel && rel.state === 'close') return [rows[i].p, rows[i + 1].p]; } return null; },
      text: '{N} and {M} finished one place apart and compared notes on the stairs, which is either friendship or reconnaissance. In this building it is usually both.' },
    { kind: 'early', find: (state, rows) => { const r = rows.filter(x => x.p.training && x.p.training.intensity === 'heavy').sort((a, b) => b.p.fatigue - a.p.fatigue || (a.p.id < b.p.id ? -1 : 1))[0]; return r ? [r.p] : null; },
      text: '{N} was running the piece in the stairwell at seven in the morning. The showcase was at four.' },
  ];
  KP.EVAL_MOMENTS = MOMENTS.map(m => m.kind);
  // rows: [{ p, rank }] in sheet order. Returns { kind, text, ids } or null.
  KP.evalMoment = function (state, rows) {
    const open = MOMENTS.map(m => ({ m, who: m.find(state, rows) })).filter(x => x.who && x.m.kind !== state.lastEvalMomentKind);
    if (!open.length) return null;
    const pick = open[Math.floor(KP.hash01([state.seed, 'evalMoment', state.week].join('|')) * open.length)];
    const text = KP.fillPro(pick.m.text.split('{N}').join(KP.displayName(pick.who[0])).split('{M}').join(pick.who[1] ? KP.displayName(pick.who[1]) : ''), pick.who[0]);
    return { kind: pick.m.kind, text, ids: pick.who.map(p => p.id) };
  };

  // ---- the after-eval talk, as a question (v0.11.14, §105) ---------------
  // Two sheets at the bottom used to be ten minutes with the coaches and a
  // letter. The talk is called on the day now, and how it gets said is
  // asked through the one queue: left with the long table (what it always
  // was, and what silence still is), said straight by the one who signed
  // her, or not held at all and the month spent on her instead.
  const bump = (state, k) => { const L = evalLedger(state); L[k] = (L[k] || 0) + 1; };
  const HELD = name => [
    name + ' got the after-eval talk — bottom of the sheet twice running. {She} nodded through it and stayed two extra hours in practice room 3, which is either the answer or the beginning of a different conversation.',
    name + ' got the after-eval talk — the door open just enough. Bottom of the sheet twice running. {She} said “yes” eleven times and nothing else, and was in practice room 3 before the coaches had left the building.',
    'The after-eval talk, held with ' + name + ' this month: two sheets at the bottom, one quiet conversation. {She} did not cry. {She} asked for a copy of the sheet. That is either the answer or a different conversation starting.',
  ];
  // the coaches' version: what the talk was before it was a question
  function coachesTalk(state, p) {
    const E = KP.C.EVAL, d = p.flags.talkDue || {};
    p.morale = KP.clamp(p.morale - E.bottomMorale, 0, 100);
    p.history.push({ week: state.week, text: 'The after-eval talk — the one held with the door open just enough that everyone knows it is happening.' +
      (d.rank ? ' Rank ' + d.rank + ' of ' + d.of + ' again.' : '') + ' The room gets smaller every month the sheet says the same thing.' });
    delete p.flags.talkDue;
    return KP.fillPro(KP.lineFor(state, 'evalTalkHeld|' + p.id, HELD(KP.displayName(p))), p);
  }
  KP.registerKnock('evalTalk', ['afterEvalTalk'], function (state) {
    const out = [];
    (state.roster || []).forEach(id => {
      const p = state.people[id];
      if (!p || p.status !== 'trainee' || !p.flags || !p.flags.talkDue || KP.onBreak(p)) return;
      out.push({ kind: 'afterEvalTalk', personId: p.id, priority: 1, weight: 6, expiresIn: KP.C.EVAL.talkExpire,
        onPick: st => bump(st, 'talkAsked') });
    });
    return out;
  });
  KP.registerScene('afterEvalTalk', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'A trainee') + ' · the after-eval talk';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      const d = p && p.flags ? p.flags.talkDue : null;
      if (!p || !d) return 'The month has moved on.';
      const room = KP.evalMission(state);
      return KP.fillPro(KP.displayName(p) + ' has been at the bottom of the sheet two months running: rank ' + d.rank + ' of ' + d.of +
        '. The head coach is at the door asking how it gets said. Left with the long table, it is ten minutes with the door open just enough. Said by you, it is the truth from the person who signed {her}: it lands harder, and {she} will remember who said it. Or there is no talk at all: the head coach takes {her} one on one until the next showcase, ' +
        room.name + ', and the sheet answers for itself, either way.', p);
    },
    options: (state) => [
      { id: 'coaches', label: 'Leave it with the coaches' },
      { id: 'yourself', label: 'Say it yourself, straight' },
      state.budget >= KP.C.EVAL.coachCost ? { id: 'room', label: 'No talk: a month one on one · ' + KP.C.EVAL.coachCost } : null,
    ].filter(Boolean),
    resolve: (state, sc, optionId) => {
      const E = KP.C.EVAL;
      const p = state.people[sc.personId];
      if (!p || p.status !== 'trainee' || !p.flags.talkDue) return { toast: 'The month has moved on.' };
      const d = p.flags.talkDue;
      if (optionId === 'yourself') {
        delete p.flags.talkDue;
        p.morale = KP.clamp(p.morale - E.straightMorale, 0, 100);
        p.flags.toldStraight = { week: state.week, rank: d.rank };
        KP.recordDirected(state, p.id, 'toldStraight');
        bump(state, 'talkStraight');
        p.history.push({ week: state.week, text: 'Was told where ' + KP.pro(p).she + ' stands by the person who signed ' + KP.pro(p).her + ': rank ' + d.rank + ' of ' + d.of + ', two sheets running, and no adjectives.' });
        return { toast: KP.fillPro('{She} did not look away once. At the end {she} said “thank you for saying it yourself,” and meant about half of it.', p) };
      }
      if (optionId === 'room') {
        delete p.flags.talkDue;
        state.budget -= E.coachCost;
        p.morale = KP.clamp(p.morale + E.coachMorale, 0, 100);
        p.flags.coached = { since: state.week };
        bump(state, 'talkRoom');
        p.history.push({ week: state.week, text: 'No after-eval talk. The head coach took ' + KP.pro(p).her + ' one on one for the month instead, on the room the next showcase is held in.' });
        return { toast: KP.fillPro('The head coach cleared an hour a day. {She} was told there would be no talk, and why, and has not been late since.', p) };
      }
      const text = coachesTalk(state, p);
      bump(state, 'talkCoaches');
      return { toast: 'The long table held it. Ten minutes, the door open just enough.',
        note: { kind: 'company', ind: 'evalTalkHeld', priority: 'normal', personId: p.id, by: 'coaches', text } };
    },
    // silence leaves it with the coaches: what the talk always was
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p || p.status !== 'trainee' || !p.flags.talkDue) return null;
      const text = coachesTalk(state, p);
      bump(state, 'talkUnanswered');
      return { kind: 'company', ind: 'evalTalkHeld', priority: 'normal', personId: p.id, by: 'coaches', text };
    },
  });

  // ---- the closing slot (v0.11.14, §105): one pick a month ---------------
  // The last one up has the long table's whole attention. By the coaches'
  // custom the slot goes to last month's first, and nothing comes of it.
  // The desk can give it to somebody else: she is read a little higher on
  // the day and knows she was given it, and the one who had it by custom
  // knows that too. The pick is for one showcase.
  KP.showcaseSlotRead = function (state) {
    const E = KP.C.EVAL;
    const floor = (state.roster || []).map(id => state.people[id]).filter(p => p && p.status === 'trainee' && !KP.onBreak(p));
    if (floor.length < E.minTrainees) return null;
    const week = KP.nextEvalWeek(state, state.week + 1);
    const ace = floor.find(p => p.id === state.lastEvalTopId) || null;
    const pick = state.evalSlot && state.evalSlot.week === week ? floor.find(p => p.id === state.evalSlot.personId) || null : null;
    return { week, aceId: ace ? ace.id : null, pickId: pick ? pick.id : null, holderId: pick ? pick.id : (ace ? ace.id : null), byCoaches: !pick };
  };
  KP.setShowcaseSlot = function (state, personId) {
    const read = KP.showcaseSlotRead(state);
    if (!read) return { ok: false, reason: 'There are too few trainees on the floor for a showcase.' };
    // back to the custom: nobody picked, or the pick is the one who has it anyway
    if (!personId || personId === read.aceId) { state.evalSlot = null; return { ok: true, byCoaches: true }; }
    const p = state.people[personId];
    if (!p || p.status !== 'trainee' || !(state.roster || []).includes(personId)) return { ok: false, reason: 'The closing slot is for a trainee on the floor.' };
    if (KP.onBreak(p)) return { ok: false, reason: KP.fillPro('{She} is off the floor this month.', p) };
    state.evalSlot = { personId, week: read.week };
    return { ok: true, byCoaches: false };
  };

  // ---- the monthly eval --------------------------------------------------
  // the one eval (v0.10.30, §89 D4): her latest rank on the sheet
  KP.evalRankOf = function (p) {
    const e = p && p.evalHistory && p.evalHistory[p.evalHistory.length - 1];
    return e ? e.rank : null;
  };
  KP.registerWeekly('evals', 612, function (state, rng, inbox, roster, groups) {
    const E = KP.C.EVAL;
    const phase = Math.floor(KP.hash01([state.seed, 'evalphase'].join('|')) * E.every);
    // the mission (v0.11.13, §104): every week, a trainee whose focus is on
    // the month's room (and who is training at all) has drilled it a week
    const mission = KP.evalMissionAt(state, KP.nextEvalWeek(state));
    // (a lineup in rehearsal has no week of its own: the debut schedule owns it)
    const rehearsing = new Set();
    (groups || []).forEach(g => { if (g.prep) g.members.forEach(id => rehearsing.add(id)); });
    roster.forEach(p => {
      if (p.status !== 'trainee' || KP.onBreak(p) || !p.training || rehearsing.has(p.id)) return;
      if ((p.training.focus || []).includes(mission.id) && p.training.intensity !== 'rest') p.missionWeeks = Math.min(E.every, (p.missionWeeks || 0) + 1);
    });
    // (v0.11.14, §105) a talk the door never got to: the coaches hold it
    roster.forEach(p => {
      const d = p.flags && p.flags.talkDue;
      if (!d) return;
      if (p.status !== 'trainee') { delete p.flags.talkDue; return; }
      if (state.week - d.week < E.talkWaitWeeks || (state.scenes || []).some(sc => sc.kind === 'afterEvalTalk' && sc.personId === p.id)) return;
      const text = coachesTalk(state, p);
      bump(state, 'talkUnasked');
      inbox.push({ kind: 'company', ind: 'evalTalkHeld', priority: 'normal', personId: p.id, by: 'coaches', text });
    });
    if (state.week % E.every !== phase) return;
    const trainees = roster.filter(p => p.status === 'trainee' && !KP.onBreak(p));
    // a showcase that is not held still closes the month: nobody carries a
    // drilled room into the next one
    if (trainees.length < E.minTrainees) { roster.forEach(p => { if (p.missionWeeks) p.missionWeeks = 0; }); return; }
    const led = evalLedger(state);
    const panel = KP.DATA.evaluators[0];
    // the coaches rank what they SEE — perceived reads, the fog intact,
    // plus the day itself (a showcase has nerves), plus the room she drilled
    const ranked = trainees.map(p => ({
      p, prep: KP.missionPrepOf(state, p),
      score: KP.C.TALENTS.reduce((s, d) => s + KP.perceived(state, p, d, panel), 0) / KP.C.TALENTS.length +
        KP.derived(p).stagePresence * 0.15 + rng.normal(0, 3),
    }));
    ranked.forEach(r => { r.score += r.prep.bonus; });
    // (v0.11.14, §105) a month one on one with the head coach, and the
    // closing slot when the desk gave it to somebody
    ranked.forEach(r => { if (r.p.flags.coached) r.score += E.coachBonus; });
    const slotRow = state.evalSlot && state.evalSlot.week === state.week ? ranked.find(r => r.p.id === state.evalSlot.personId) || null : null;
    if (slotRow) slotRow.score += E.slotBonus;
    ranked.sort((a, b) => b.score - a.score);
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
          // (v0.11.14, §105) the talk is called on the day and held through
          // the one queue: how it gets said is the desk's to decide
          led.talks++;
          p.flags.talkDue = { week: state.week, rank, of };
          talked = talked || p;   // the month of the talk posts the sheet critical (v0.11.5)
          inbox.push({ kind: 'company', ind: 'evalTalk', priority: 'high', personId: p.id,
            text: KP.fillPro(KP.lineFor(state, 'evalTalk|' + p.id, [
              'The after-eval talk is due with ' + KP.displayName(p) + ': bottom of the sheet twice running. The coaches will hold it the way they always have, unless you would rather say it yourself, or spend the month on {her} instead of a conversation. The head coach is waiting on the answer.',
              KP.displayName(p) + ' is due the after-eval talk: rank ' + rank + ' of ' + of + ' again, two sheets running. The head coach asked whether it stays with the long table. {She} is in practice room 3 and has already guessed.',
              'Two sheets at the bottom for ' + KP.displayName(p) + ', and the after-eval talk comes next. Who holds it, and what gets said, is yours this week. If nobody says otherwise, the coaches hold it.',
            ]), p) });
        }
      } else {
        p.evalBottomStreak = 0;
      }
      // (v0.11.14, §105) the sheet answers the month one on one, and the truth
      if (p.flags.coached) {
        delete p.flags.coached;
        if (bottomThird) {
          p.morale = KP.clamp(p.morale - E.coachMissMorale, 0, 100);
          p.history.push({ week: state.week, text: 'A month of the head coach’s hours, one on one, and the sheet did not move: rank ' + rank + ' of ' + of + '.' });
          led.coachMisses = (led.coachMisses || 0) + 1;
        } else {
          p.morale = KP.clamp(p.morale + E.coachClimbMorale, 0, 100);
          p.history.push({ week: state.week, text: 'Came off the bottom of the sheet after a month one on one with the head coach: rank ' + rank + ' of ' + of + '.' });
          led.coachClimbs = (led.coachClimbs || 0) + 1;
        }
      }
      if (p.flags.toldStraight && !bottomThird) {
        delete p.flags.toldStraight;
        p.morale = KP.clamp(p.morale + E.straightClimbMorale, 0, 100);
        p.history.push({ week: state.week, text: 'Came off the bottom of the sheet: rank ' + rank + ' of ' + of + '. ' + (p.gender === 'm' ? 'He' : 'She') + ' had been told straight where ' + KP.pro(p).she + ' stood, and by whom.' });
        led.straightClimbs = (led.straightClimbs || 0) + 1;
      }
    });
    // the closing slot: hers for being given it, and the one who had it by custom
    let slotClause = '';
    if (slotRow) {
      const sp = slotRow.p;
      const custom = prevTop && prevTop !== sp.id ? ranked.find(r => r.p.id === prevTop) || null : null;
      sp.morale = KP.clamp(sp.morale + E.slotMorale, 0, 100);
      sp.history.push({ week: state.week, text: 'Was given the showcase’s closing slot: the last one up, with the long table’s whole attention.' });
      led.slots = (led.slots || 0) + 1;
      if (custom) { custom.p.morale = KP.clamp(custom.p.morale - E.slotSnubMorale, 0, 100); led.slotSnubs = (led.slotSnubs || 0) + 1; }
      slotClause = ' The closing slot went to ' + KP.displayName(sp) + (custom ? ', not to ' + KP.displayName(custom.p) + ', who had it by custom' : '') + '.';
    }
    state.evalSlot = null;
    // ---- the mission, the line and the moment (v0.11.13, §104) ----------
    // who drilled the room all month and climbed for it: the best-placed
    const drilled = ranked.map((r, i) => ({ p: r.p, rank: i + 1, full: (r.p.missionWeeks || 0) >= E.every }))
      .filter(x => x.full).filter(x => { const h = x.p.evalHistory; return h.length >= 2 && h[h.length - 2].rank > x.rank; })[0] || null;
    const anyDrilled = ranked.some(r => (r.p.missionWeeks || 0) > 0);
    led.missions = (led.missions || 0) + 1;
    led.drilledFull = (led.drilledFull || 0) + ranked.filter(r => (r.p.missionWeeks || 0) >= E.every).length;
    if (drilled) led.drilledClimbs = (led.drilledClimbs || 0) + 1;
    // the line: with a project open, the room reads the sheet at the lineup's edge
    let line = null, crossedIn = null, crossedOut = null;
    if (state.project) {
      const slots = (state.project.locked || []).length + ((state.project.seeking || []).length || 2);
      line = Math.min(of, Math.max(3, slots));
      ranked.forEach((r, i) => {
        const h = r.p.evalHistory;
        if (h.length < 2) return;
        const was = h[h.length - 2].rank, now = i + 1;
        if (was > line && now <= line && !crossedIn) crossedIn = r.p;
        if (was <= line && now > line && !crossedOut) crossedOut = r.p;
      });
      if (crossedIn || crossedOut) led.lineCross = (led.lineCross || 0) + 1;
    }
    const moment = KP.evalMoment(state, ranked.map((r, i) => ({ p: r.p, rank: i + 1 })));
    if (moment) { state.lastEvalMomentKind = moment.kind; led.moments = (led.moments || 0) + 1; }
    // the month closes: the next room starts from nothing
    roster.forEach(p => { if (p.missionWeeks) p.missionWeeks = 0; });
    state.lastEvalMission = { week: state.week, id: mission.id };
    const extra = ' The room this month was ' + mission.name + ': ' + mission.what + '.' +
      (drilled ? ' ' + KP.displayName(drilled.p) + ' had drilled it since the day it was posted, and it showed.'
        : anyDrilled ? '' : ' Nobody had drilled it; the room was read on what it already had.') +
      (line ? ' With a project open the sheet is read at the line: the top ' + line + ' have a case' +
        (crossedIn ? ', and ' + KP.displayName(crossedIn) + ' crossed into it this month' : '') +
        (crossedOut ? (crossedIn ? ' as ' : ', and ') + KP.displayName(crossedOut) + ' fell out of it' + (crossedIn ? '' : ' this month') : '') + '.' : '') +
      slotClause +
      (moment ? ' One thing from the room: ' + moment.text : '');
    const names = ranked.slice(0, 3).map((r, i) => (i + 1) + '. ' + KP.displayName(r.p));
    // the ladder (v0.11.5, §96 wiring): critical the month the talk is held
    // or the FIRST #1 in the building's history is taken; high on a trainee's
    // own first #1, a real move either way or a new ace; normal when the
    // sheet moved at all; flavor only when nothing did. One clause names the
    // movement that set it. (A churning room must not shout monthly: the
    // first cut made every personal first #1 critical — 7 criticals in 90
    // weeks of a small room.)
    const roomsFirst = !!firstTop && !Object.values(state.people).some(q =>
      q !== firstTop && q.flags && q.flags.firstEvalTopWeek && q.flags.firstEvalTopWeek < state.week);
    // (v0.11.13) a trainee crossing the line while a project is open is news
    const priority = (talked || roomsFirst) ? 'critical'
      : (firstTop || maxMove >= E.sheetHighMove || aceChanged || crossedIn || crossedOut) ? 'high'
      : maxMove > 0 ? 'normal' : 'flavor';
    const story = firstTop ? KP.displayName(firstTop) + ' took the top of the sheet for the first time'
      : talked ? 'the after-eval talk, due with ' + KP.displayName(talked)
      : aceChanged ? KP.displayName(ranked[0].p) + ', who took the top from ' + KP.displayName(state.people[prevTop])
      : climber ? KP.displayName(climber) + ', up ' + climberDelta
      : slider ? KP.displayName(slider) + ', down ' + (-sliderDelta)
      : null;
    inbox.push({ kind: 'company', ind: 'evalSheet', priority, mission: mission.id, moment: moment ? moment.kind : null,
      text: KP.lineFor(state, 'evalSheet', [
        'Monthly evaluation day: showcase run twice, coaches at the long table, and the ranked sheet on the wall by six — ' + names.join(' · ') + ' of ' + of +
          (story ? '. The room’s story is ' + story + ' — everyone recalibrated who to practice next to.' : '. Nobody moved — the sheet read like last month’s.') + extra +
          ' The sheet ranks what the coaches can SEE. Everyone in the building knows those are not always the same thing.',
        'Evaluation day. The showcase ran twice, the coaches sat the long table, and by six the sheet was on the wall: ' + names.join(' · ') + ' of ' + of +
          (story ? '. The story is ' + story + ', and the room re-sorted itself by dinner.' : '. Nothing moved; the room ate dinner in the usual order.') + extra +
          ' The sheet is what the coaches saw. The building keeps its own sheet.',
        'The monthly sheet went up at six: ' + names.join(' · ') + ' of ' + of +
          (story ? '. Everyone read it for one thing first — ' + story + ' — and then back up to see who had been passed.' : '. Everyone read it once and went back to practice; nothing had moved.') + extra +
          ' Rank is what a showcase can measure. The rest gets argued in the hallway.',
      ]) });
    // the next room is posted with the sheet: a month to drill it
    const next = KP.evalMissionAt(state, state.week + E.every);
    inbox.push({ kind: 'company', ind: 'evalMission', priority: 'flavor', mission: next.id,
      text: 'Posted under the sheet: next month’s showcase is ' + next.name + ' — ' + next.what + '. ' + KP.weekLabel(state.week + E.every).text +
        '. A trainee whose focus is on ' + KP.C.TALENT_LABELS[next.id].toLowerCase() + ' from now until then walks in with it drilled.' });
    // (v0.11.16, §107) the year's last showcase: the year, read in reverse
    if (KP.evalYearDue(state)) KP.evalYearSheet(state, inbox);
  });

  // ---- the year's sheet (v0.11.16, §107) --------------------------------
  // Twelve showcases make a year, and the twelfth sheet was the same letter
  // as the other eleven. The year's sheet is built from what the monthly
  // sheets already wrote on every file (evalHistory keeps twelve): each
  // trainee's place across the year, her best month, her months at the top,
  // where she started the year and where she ends it. It is a read all year
  // (the Training tab shows the year so far) and a ceremony once: on the
  // year's last showcase the head coach reads it from the bottom up.
  // Nothing is drawn.
  const yearOfWeek = w => Math.floor((w - 1) / KP.C.WEEKS_PER_YEAR) + 1;
  const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
  const MONTHS = { Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June',
    Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December' };
  const monthOf = w => { const m = KP.weekLabel(w).month; return MONTHS[m] || m; };
  const listAnd = xs => xs.length <= 1 ? (xs[0] || '') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
  KP.evalYearOf = function (state) { return yearOfWeek(state.week); };
  // the year so far, as a read. A trainee has a place on it once she has
  // stood yearMinSheets showcases this year AND half of the ones held: four
  // months at the top is a strong winter, not a year (the first career it
  // was read in gave the year to a trainee who had stood four of ten). The
  // order is her average standing in the room she stood in (a 2nd of 4 and
  // a 4th of 8 are not the same month), then months at the top, then her
  // best, then how many she stood. Pure: it writes nothing.
  KP.evalYearRead = function (state, year) {
    const E = KP.C.EVAL, Y = KP.C.WEEKS_PER_YEAR;
    year = year || yearOfWeek(state.week);
    const from = (year - 1) * Y + 1, to = year * Y;
    const weeks = new Set(), rows = [], fresh = [];
    const floor = (state.roster || []).map(id => state.people[id]).filter(p => p && p.status === 'trainee')
      .map(p => ({ p, h: (p.evalHistory || []).filter(e => e.week >= from && e.week <= to) })).filter(x => x.h.length);
    floor.forEach(x => x.h.forEach(e => weeks.add(e.week)));
    const need = Math.max(E.yearMinSheets, Math.ceil(weeks.size / 2));
    floor.forEach(({ p, h }) => {
      if (h.length < need) { fresh.push(p); return; }
      rows.push({ p, sheets: h.length,
        pct: h.reduce((s, e) => s + (e.rank - 1) / Math.max(1, e.of - 1), 0) / h.length,
        mean: Math.round(h.reduce((s, e) => s + e.rank, 0) / h.length * 10) / 10,
        best: h.reduce((m, e) => Math.min(m, e.rank), Infinity),
        firsts: h.filter(e => e.rank === 1).length,
        first: h[0], last: h[h.length - 1], move: h[0].rank - h[h.length - 1].rank });
    });
    rows.sort((a, b) => a.pct - b.pct || b.firsts - a.firsts || a.best - b.best || b.sheets - a.sheets || (a.p.id < b.p.id ? -1 : 1));
    rows.forEach((r, i) => { r.place = i + 1; });
    let toGo = 0;
    for (let w = KP.nextEvalWeek(state, state.week + 1); w <= to; w += E.every) toGo++;
    // the year's climb: the furthest up from her first sheet of the year to
    // her last, and not the one who is first (her clause already says it)
    const climb = rows.filter(r => r.place !== 1 && r.move >= E.yearClimbAt).sort((a, b) => b.move - a.move || a.place - b.place)[0] || null;
    return { year, held: weeks.size, need, toGo, rows, fresh, top: rows[0] || null, climb, ok: rows.length >= E.minTrainees };
  };
  // is this week's showcase the year's last, with the year not yet read?
  KP.evalYearDue = function (state) {
    const year = yearOfWeek(state.week);
    if (state.week !== KP.nextEvalWeek(state, state.week)) return false;
    if (KP.nextEvalWeek(state, state.week + 1) <= year * KP.C.WEEKS_PER_YEAR) return false;
    return !(state.evalYears || []).some(y => y.year === year);
  };
  // one clause of a year: what she did with it
  KP.evalYearClause = function (r) {
    return (r.firsts ? r.firsts + (r.firsts === 1 ? ' month' : ' months') + ' at the top' : 'best month a ' + ordinal(r.best)) +
      ', in ' + r.sheets + ' showcases';
  };
  // the ceremony, in words: from the bottom up, so the last name read is
  // the year's first. Three ways to close it, turned by the year, never the
  // same two years running.
  const YEAR_CLOSERS = [
    'The first name read is not the last word on anybody; the last name read will be reminded of it for twelve months.',
    'Nobody clapped until the last name. Then everybody did, including the ones who had hoped it would be theirs.',
    'The sheet stays on the wall until the new year. Everyone in the room will pass it forty times and read it every time.',
  ];
  KP.evalYearText = function (state, read) {
    const rows = read.rows, nm = r => KP.displayName(r.p), words = ['And first on the year, ', 'Second, ', 'Third, '];
    const tail = rows.slice(3).reverse(), head = rows.slice(0, 3).reverse();
    const turn = Math.floor(KP.hash01([state.seed, 'evalYearClose'].join('|')) * YEAR_CLOSERS.length);
    return 'The year’s sheet went up beside this month’s, and the head coach read it the way it is always read: from the bottom up. ' +
      (tail.length ? 'From the bottom: ' + tail.map(nm).join(', ') + '. ' : '') +
      head.map(r => words[r.place - 1] + nm(r) + ': ' + KP.evalYearClause(r) + '. ').join('') +
      (read.climb ? 'The year’s climb was ' + nm(read.climb) + '’s: ' + ordinal(read.climb.first.rank) + ' in ' + monthOf(read.climb.first.week) +
        ', ' + ordinal(read.climb.last.rank) + ' now. ' : '') +
      (read.fresh.length ? listAnd(read.fresh.map(p => KP.displayName(p))) + ' did not stand enough of the year’s showcases for a place on it. ' : '') +
      read.held + ' showcases this year. ' + YEAR_CLOSERS[(read.year + turn) % YEAR_CLOSERS.length];
  };
  // the ceremony. What it does is small and is hers: the year's first knows
  // she was read last, the one who climbed furthest is named for it, and the
  // first name read has it on her file. The wall keeps the sheet.
  KP.evalYearSheet = function (state, inbox) {
    const E = KP.C.EVAL;
    const read = KP.evalYearRead(state);
    if (!read.ok) return null;
    const led = evalLedger(state);
    led.years = (led.years || 0) + 1;
    const top = read.top, last = read.rows[read.rows.length - 1], climb = read.climb;
    top.p.morale = KP.clamp(top.p.morale + E.yearTopMorale, 0, 100);
    top.p.flags.yearTop = (top.p.flags.yearTop || []).concat([read.year]);
    top.p.history.push({ week: state.week, text: 'First on the year’s sheet for Y' + read.year + ': ' + KP.evalYearClause(top) +
      '. ' + (top.p.gender === 'm' ? 'His' : 'Her') + ' name was read last, which is how the room is told.' });
    if (climb) {
      climb.p.morale = KP.clamp(climb.p.morale + E.yearClimbMorale, 0, 100);
      climb.p.history.push({ week: state.week, text: 'The year’s climb for Y' + read.year + ': ' + ordinal(climb.first.rank) + ' in ' + monthOf(climb.first.week) +
        ', ' + ordinal(climb.last.rank) + ' on the year’s last sheet. The head coach said so in front of the room.' });
      led.yearClimbs = (led.yearClimbs || 0) + 1;
    }
    if (last !== climb) {
      last.p.history.push({ week: state.week, text: 'Read first off the year’s sheet for Y' + read.year + ', which is read from the bottom.' });
    }
    state.evalYears = (state.evalYears || []).concat([{ year: read.year, week: state.week, held: read.held,
      topId: top.p.id, climbId: climb ? climb.p.id : null,
      rows: read.rows.map(r => ({ id: r.p.id, name: KP.displayName(r.p), place: r.place, mean: r.mean, best: r.best, firsts: r.firsts, sheets: r.sheets, move: r.move })) }])
      .slice(-E.yearKeep);
    inbox.push({ kind: 'company', ind: 'evalYear', priority: 'critical', year: read.year, personId: top.p.id,
      text: KP.evalYearText(state, read) });
    return read;
  };

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
