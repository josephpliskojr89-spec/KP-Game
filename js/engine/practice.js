/* The practice room years (v0.9.16) — trainee life has weather.
   §55.9, the agreed trainee pass: monthly evaluation days with rankings
   the trainees can see and feel; debut-team speculation once a project
   opens (they know, and the game finally uses that they know); the
   trainee who QUITS on you — a scene, with a promise that has an
   expiry date; and the aging-out clock — the long-timer watching
   younger kids debut past her, with all three endings: her leaving,
   your releasing, the last-chance debut. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    return state.practiceLedger = state.practiceLedger ||
      { evals: 0, quitsAsked: 0, gone: 0, agingFaced: 0, lastChance: 0, speculations: 0 };
  }
  function freeTraineesOf(state) {
    return state.roster.map(id => state.people[id])
      .filter(p => p && p.status === 'trainee');
  }
  function tenureOf(state, p) {
    return p.signedWeek != null ? state.week - p.signedWeek : 0;
  }

  // she leaves — her call, not yours. The same sweep a release gets,
  // without the directed blame a release earns (0.9.13 audit M3 shape).
  // Notes go through KP.note directly: this runs from scene resolves,
  // expiries, and claim checks alike, and only some of those carry an
  // inbox back.
  function quitNow(state, p, how) {
    state.roster = state.roster.filter(id => id !== p.id);
    p.status = 'released';
    p.training.focus = [];
    p.history.push({ week: state.week, text:
      how === 'grace' ? 'Chose to leave ' + state.company.short + '. On ' + (p.gender === 'm' ? 'his' : 'her') + ' own terms, with the room’s respect.'
      : how === 'silence' ? 'Waited a week for an answer that never came, then packed.'
      : 'Left when the promised lineup never materialized.' });
    if (state.scenes) state.scenes = state.scenes.filter(sc => sc.personId !== p.id);
    (state.claims || []).forEach(c => {
      if (!c.resolved && c.personId === p.id && c.type === 'debutByPromise') {
        c.resolved = 'missed'; c.resolvedWeek = state.week;
      }
    });
    if (state.project && (state.project.locked || []).includes(p.id)) {
      state.project.locked = state.project.locked.filter(id => id !== p.id);
    }
    if (state.hypeDirective && state.hypeDirective.status === 'open' &&
        state.hypeDirective.personId === p.id) {
      state.trust = KP.clamp(state.trust + KP.C.HYPE.directiveMissTrust, 0, 100);
      state.objectiveHistory = state.objectiveHistory || [];
      state.objectiveHistory.push({ type: 'hypeDebut', status: 'missed', week: state.week, personId: p.id });
      state.hypeDirective = null;
      KP.note(state, { kind: 'executive', urgent: true,
        text: state.executive.name + ': “The internet decided on ' + KP.displayName(p) +
          ' and ' + (p.gender === 'm' ? 'he' : 'she') + ' walked. The numbers will want to know what the practice room felt like. So do I.”' });
    }
    // friends grieve the empty chair — nobody blames the desk for a choice
    const rels = state.relationships || {};
    state.roster.forEach(otherId => {
      const other = state.people[otherId];
      const rel = other && rels[KP.pairKey(p, other)];
      if (rel && rel.state === 'close') other.morale = KP.clamp(other.morale - 5, 0, 100);
    });
    ledger(state).gone++;
  }

  // ---- the weekly phase --------------------------------------------------
  // Order 610: right after releases (600) so this week's debuts land on
  // the ones still in the room THIS week, not next.
  KP.registerWeekly('practice', 610, function (state, rng, inbox, roster, groups) {
    const P = KP.C.PRACTICE;
    const led = ledger(state);
    const trainees = freeTraineesOf(state);

    // ---- 1. evaluation day: the board goes up --------------------------
    if (trainees.length >= 2 && ((state.week - 1) % P.evalEveryWeeks) === 0) {
      const scored = trainees.map(p => {
        const t = p.talents;
        const score = (t.vocals.cur + t.dance.cur + t.rap.cur) / 3 +
          t.charisma.cur * 0.35 + Math.min(40, p.liveExp) * 0.2 +
          (rng.next() - 0.5) * 8;   // evaluation days have moods too
        return { p, score };
      }).sort((a, b) => b.score - a.score);
      const prev = {};
      trainees.forEach(p => { prev[p.id] = p.evalRank || null; });
      scored.forEach((x, i) => { x.p.evalRank = i + 1; x.p.evalWeek = state.week; });
      led.evals++;
      const top = scored[0].p;
      top.morale = KP.clamp(top.morale + P.evalMoraleTop, 0, 100);
      if (trainees.length >= 3) {
        const last = scored[scored.length - 1].p;
        last.morale = KP.clamp(last.morale + P.evalMoraleBottom, 0, 100);
      }
      // the biggest climber feels the arrow
      let climber = null, climb = 0;
      scored.forEach(x => {
        const was = prev[x.p.id];
        if (was && was - x.p.evalRank > climb) { climb = was - x.p.evalRank; climber = x.p; }
      });
      if (climber) climber.morale = KP.clamp(climber.morale + P.evalClimb, 0, 100);
      // the ace: three straight months at #1 and the room has a name for her
      if (state.lastEvalTopId === top.id) {
        top.flags.evalStreak = (top.flags.evalStreak || 0) + 1;
        if (top.flags.evalStreak === P.aceStreakAt) {
          top.history.push({ week: state.week, text: 'Held the top of the evaluation board three months running. The vocal coaches started saying “the ace” and meaning it.' });
        }
      } else {
        top.flags.evalStreak = 1;
      }
      state.lastEvalTopId = top.id;
      const names = scored.slice(0, 3).map((x, i) => (i + 1) + '. ' + KP.displayName(x.p));
      inbox.push({ kind: 'development', ind: 'evalDay', priority: 'flavor',
        text: 'Evaluation day. The board went up at six and the hallway went quiet: ' + names.join('  ') +
          (trainees.length >= 3 ? '. ' + KP.publicGiven(scored[scored.length - 1].p) + ' read the bottom line once and went back into the practice room without changing shoes.' : '.') +
          (climber && climb >= 2 ? ' Biggest arrow: ' + KP.publicGiven(climber) + ', up ' + climb + '.' : '') });
    }

    // ---- 2. the speculation: a project opens and the room KNOWS --------
    if (state.project && !state.project.speculated && state.week > state.project.openedWeek) {
      state.project.speculated = true;
      led.speculations = (led.speculations || 0) + 1;
      const locked = state.project.locked || [];
      const hopefuls = [], quiet = [];
      trainees.forEach(p => {
        if (locked.includes(p.id)) return;
        const slots = locked.length + ((state.project.seeking || []).length || 2);
        if (p.evalRank && p.evalRank <= Math.max(3, slots)) {
          p.flags.projectHopeful = true;
          p.morale = KP.clamp(p.morale + 2, 0, 100);
          hopefuls.push(KP.publicGiven(p));
        } else {
          p.morale = KP.clamp(p.morale - 1, 0, 100);
          quiet.push(p);
        }
      });
      if (hopefuls.length || quiet.length) {
        inbox.push({ kind: 'development', ind: 'projectTalk', priority: 'flavor',
          text: 'A debut project is open and the practice room found out before the paperwork dried. ' +
            (hopefuls.length ? hopefuls.join(' and ') + ' started arriving an hour early — the evaluation board says they have a case. ' : '') +
            (quiet.length ? 'The rest do the math against the board every night and say nothing.' : '') });
      }
    }

    // ---- 3. debuts land on the ones still in the room ------------------
    groups.forEach(g => {
      if (g.debutWeek !== state.week) return;
      // the last-chance debut: the long-timer made the lineup
      g.members.forEach(id => {
        const m = state.people[id];
        if (!m || !m.flags.agingOut) return;
        const years = Math.max(1, Math.round(tenureOf(state, m) / KP.C.WEEKS_PER_YEAR));
        m.morale = KP.clamp(m.morale + P.lastChanceMorale, 0, 100);
        m.history.push({ week: state.week, text: 'Debuted. After ' + years + ' years in the practice room, watching other lineups walk out the door first. The first bow on stage lasted a beat longer than choreographed.' });
        delete m.flags.agingOut; delete m.flags.agingTalk; delete m.flags.resigned;
        led.lastChance++;
        const nar = KP.recordEvidence(state, 'lastChanceDebut', 'idol', m.id, { years });
        if (nar) inbox.push(nar);
        inbox.push({ kind: 'public', ind: 'lastChanceDebut', priority: 'critical', personId: m.id,
          text: KP.fillPro(KP.displayName(m) + ' debuted this week — after ' + years + ' years as a trainee. The fan accounts found the old evaluation-day photos within the hour, and the phrase “{she} never left the building” is doing exactly what you think it is doing to the comment sections.', m) });
      });
      // the doorway: the long-timers who watched it happen
      trainees.forEach(p => {
        if (g.members.includes(p.id)) return;
        const tenure = tenureOf(state, p);
        const aging = tenure >= P.agingTenureWeeks || (p.age >= P.agingAge && tenure >= 40);
        if (!aging) return;
        p.morale = KP.clamp(p.morale + P.watchMorale, 0, 100);
        p.history.push({ week: state.week, text: 'Watched ' + g.name + ' debut from the practice-room doorway. The room felt smaller that night.' });
        if (!p.flags.agingOut) { p.flags.agingOut = state.week; led.agingFaced++; }
        if (!p.flags.agingTalk && !(state.scenes || []).some(sc => sc.personId === p.id)) {
          p.flags.agingTalk = true;
          KP.openScene(state, { kind: 'agingOutTalk', personId: p.id, expiresWeek: state.week + 3 });
          inbox.push({ kind: 'development', urgent: true, personId: p.id,
            text: KP.fillPro(KP.displayName(p) + ' asked for five minutes after practice and used four of them on silence. The fifth: “Am I ever debuting?” The question is on the Desk, and {she} watched you hear it.', p) });
        }
      });
    });

    // ---- 4. the quitter ------------------------------------------------
    trainees.forEach(p => {
      if (KP.groupOf(state, p.id)) return;
      if (state.project && (state.project.locked || []).includes(p.id)) return;
      if ((state.scenes || []).some(sc => sc.personId === p.id)) return;
      if ((p.flags.pleadQuietUntil || 0) > state.week) return;
      const tenure = tenureOf(state, p);
      const discouraged = p.morale < P.quitMoraleBelow &&
        (tenure > P.quitTenureWeeks || p.flags.resigned);
      if (!discouraged) return;
      let chance = P.quitBaseChance;
      if (p.evalRank && p.evalRank === freeTraineesOf(state).length) chance *= 1.5;
      if (p.flags.agingOut) chance *= 1.5;
      if (p.flags.resigned) chance *= 2;
      if (!rng.chance(chance)) return;
      led.quitsAsked++;
      KP.openScene(state, { kind: 'traineeQuit', personId: p.id, expiresWeek: state.week + 2 });
      inbox.push({ kind: 'development', urgent: true, personId: p.id,
        text: KP.fillPro(KP.displayName(p) + ' knocked with a folded piece of paper — a resignation, handwritten, dated today. ' +
          Math.round(tenure / KP.C.WEEKS_PER_YEAR * 10) / 10 + ' years in the practice room and {she} is done waiting for the door to be for {her}. What you say next is on the Desk.', p) });
    });
  });

  // ---- the quitter's scene -----------------------------------------------
  KP.registerScene('traineeQuit', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'A trainee') + ' · the resignation';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      return KP.fillPro((p ? KP.displayName(p) : 'She') + ' is standing in the office with the letter on the desk, not sitting down. “I have watched the board every month. I know what it says about me. I would rather choose the day I stop than have it chosen.” {She} means it — and {she} is watching whether you do.', p);
    },
    options: (state, sc) => [
      { id: 'promise', label: 'Promise the next lineup' },
      state.budget >= KP.C.PRACTICE.pleadCost
        ? { id: 'plead', label: 'A real week off — then decide' } : null,
      { id: 'accept', label: 'Let her go with grace' },
    ].filter(Boolean),
    resolve: (state, sc, optionId) => {
      const P = KP.C.PRACTICE;
      const p = state.people[sc.personId];
      if (!p) return { toast: 'The moment resolved itself.' };
      if (optionId === 'promise') {
        p.morale = KP.clamp(p.morale + 8, 0, 100);
        p.history.push({ week: state.week, text: 'Handed in a resignation; took it back on a promise: the next lineup, on the record.' });
        KP.openClaim(state, { type: 'debutByPromise', subject: { kind: 'idol', id: p.id },
          personId: p.id, byWeek: state.week + P.promiseWindowWeeks,
          label: 'The next debut lineup includes ' + KP.displayName(p) });
        return { toast: KP.fillPro('{She} folded the letter back into {her} pocket — kept, not discarded. “The next one. You said it.”', p),
          note: { kind: 'development', personId: p.id,
            text: KP.fillPro(KP.displayName(p) + ' stayed. The resignation letter went back into a pocket, not a bin — {she} is keeping it exactly as long as you keep the promise. The claim is on the record.', p) } };
      }
      if (optionId === 'plead') {
        state.budget = Math.max(0, state.budget - P.pleadCost);
        p.morale = KP.clamp(p.morale + P.pleadMorale, 0, 100);
        p.fatigue = KP.clamp(p.fatigue - 15, 0, 100);
        p.flags.pleadQuietUntil = state.week + P.pleadQuietWeeks;
        p.history.push({ week: state.week, text: 'Nearly quit. Took the offered week home instead — a real one, phone off.' });
        return { toast: KP.fillPro('{She} took the train ticket without promising anything. A week is not an answer. It is a week.', p) };
      }
      quitNow(state, p, 'grace');
      return { toast: KP.fillPro('You shook {her} hand. Some doors should be opened FOR people.', p),
        note: { kind: 'development', priority: 'high', personId: p.id,
          text: KP.fillPro(KP.displayName(p) + ' left ' + state.company.short + ' with a handshake and the room’s respect. The practice room ran quieter that evening — not sadder, exactly. Quieter.', p) } };
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return null;
      quitNow(state, p, 'silence');
      return { kind: 'development', priority: 'high', personId: p.id,
        text: KP.fillPro(KP.displayName(p) + ' waited a week for an answer to the letter. None came, which is also an answer. {Her} locker was empty by Friday.', p) };
    },
  });

  // ---- the aging-out talk ------------------------------------------------
  KP.registerScene('agingOutTalk', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'A trainee') + ' · the question';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      const tenure = p ? Math.round((state.week - (p.signedWeek || state.week)) / KP.C.WEEKS_PER_YEAR * 10) / 10 : 0;
      return KP.fillPro((p ? KP.displayName(p) : 'She') + ' — ' + tenure + ' years in the practice room, ' + (p ? p.age : '?') + ' now — asked the only question that matters: “Am I ever debuting?” {She} has earned a real answer, and every trainee in the building will hear whichever one you give.', p);
    },
    options: () => [
      { id: 'promise', label: 'The next lineup. Promised.' },
      { id: 'honest', label: 'Be honest — no guarantees' },
      { id: 'release', label: 'The kind cut — release her now' },
    ],
    resolve: (state, sc, optionId) => {
      const P = KP.C.PRACTICE;
      const p = state.people[sc.personId];
      if (!p) return { toast: 'The moment resolved itself.' };
      if (optionId === 'promise') {
        p.morale = KP.clamp(p.morale + 6, 0, 100);
        p.history.push({ week: state.week, text: 'Asked the question. Got a date, not an adjective: the next lineup, promised.' });
        KP.openClaim(state, { type: 'debutByPromise', subject: { kind: 'idol', id: p.id },
          personId: p.id, byWeek: state.week + P.promiseWindowWeeks,
          label: 'The next debut lineup includes ' + KP.displayName(p) });
        return { toast: KP.fillPro('{She} nodded once, like a contract. The practice room will know by morning — which is the point of promising.', p) };
      }
      if (optionId === 'honest') {
        p.morale = KP.clamp(p.morale - 8, 0, 100);
        p.flags.resigned = true;
        KP.recordDirected(state, p.id, 'toldStraight', 1);
        p.history.push({ week: state.week, text: 'Asked the question and got the truth: no guarantees. Kept training anyway. For now.' });
        return { toast: KP.fillPro('{She} thanked you for not decorating it. Then {she} went back to the practice room, because the alternative was going home.', p) };
      }
      const r = KP.releaseTrainee(state, p.id);
      if (!r.ok) return { toast: r.reason };
      p.history.push({ week: state.week, text: 'The kind cut: released with a recommendation letter and the truth. Better a door than a hallway.' });
      return { toast: KP.fillPro('You said it before {she} had to. A recommendation letter, a real goodbye, and a door that opens outward.', p),
        note: { kind: 'development', priority: 'high', personId: p.id,
          text: KP.fillPro(KP.displayName(p) + ' left with a letter of recommendation and the staff lining the hallway. The kind cut is still a cut — but nobody watched {her} age out by inches, and {she} knows what that mercy cost you both.', p) } };
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return null;
      p.morale = KP.clamp(p.morale - 6, 0, 100);
      p.flags.resigned = true;
      KP.recordDirected(state, p.id, 'leftWaiting', -2);
      return { kind: 'development', priority: 'high', personId: p.id,
        text: KP.fillPro(KP.displayName(p) + ' asked the only question that matters and got a week of scheduling noise instead of an answer. {She} stopped asking. The staff say {she} still trains hardest in the building, which is somehow worse.', p) };
    },
  });

  // ---- the promise with the expiry date ----------------------------------
  KP.registerClaim('debutByPromise', (state, c) => {
    const p = state.people[c.personId];
    if (!p) return { resolved: 'missed', notes: [] };
    if (p.status === 'idol') {
      KP.recordDirected(state, p.id, 'promiseKept', 3);
      return { resolved: 'met',
        notes: [{ kind: 'development', priority: 'high', personId: p.id,
          text: KP.fillPro(KP.displayName(p) + ', backstage after the debut stage, found you in the hallway: “You said the next one. It was the next one.” The resignation letter, it turns out, got burned in a dorm-kitchen pan, ceremonially, at 2am.', p) }] };
    }
    if (p.status !== 'trainee') return { resolved: 'missed', notes: [] };
    // "the NEXT lineup" means the next one: a debut that goes out without
    // her breaks the promise on the spot, not at the deadline
    const passedBy = KP.groups(state).some(g =>
      (g.debutWeek || 0) > c.week && g.debutWeek <= state.week && !g.members.includes(p.id));
    if (state.week > c.byWeek || passedBy) {
      quitNow(state, p, 'promiseExpired');
      // the room watched the promise break — that lands on everyone
      state.roster.forEach(id => {
        const o = state.people[id];
        if (o && o.status === 'trainee') o.morale = KP.clamp(o.morale - 3, 0, 100);
      });
      return { resolved: 'missed',
        notes: [{ kind: 'development', priority: 'high', personId: p.id,
          text: KP.fillPro(KP.displayName(p) + ' packed the same night the promise ' +
            (passedBy ? 'broke — a lineup walked out the door, and it was not {hers}' : 'window closed') +
            '. No scene, no letter this time — {she} had already written it once. Every trainee in the building did the arithmetic on their own file before lights out.', p) }] };
    }
    return null;
  });

  // ---- the timeline loves a long road ------------------------------------
  KP.onFeedEvent('lastChanceDebut', (state, n, rng) => {
    const p = state.people[n.personId];
    const name = p ? KP.publicGiven(p) : 'her';
    return rng.pick([
      { persona: 'fan', text: name + ' debuting after YEARS as a trainee. the pre-debut vault is opening and I am not emotionally prepared for the 2-years-ago evaluation clips' },
      { persona: 'casual', text: 'the trainee who never gave up finally debuting is the one k-pop story that gets everyone. no exceptions. not even me' },
      { persona: 'stan', text: name + ' waited out entire LINEUPS to get here. the patience arc is canon now. protect the veteran rookie at all costs' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
