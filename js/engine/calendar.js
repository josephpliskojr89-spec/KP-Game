/* The release war (v0.6.4) — the calendar is a battlefield.
   Owner mandate (§22): "Rival agencies announce comebacks. Do you move
   your date or take the collision?… rivals occasionally ambush a
   committed date." Rival comebacks go public weeks ahead; the player's
   locked date goes public too; rivals with a motive PARK their release
   on that date; same-week landings resolve as head-to-head battles the
   world keeps score on — and remembers. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function eachAct(state, fn) {
    (state.rivals || []).forEach(r => (r.acts || []).forEach(a => {
      if (!a.retired) fn(r, a);
    }));
  }
  function actDue(a) { return (a.lastReleaseWeek || 0) + (a.cycleWeeks || 18); }

  // ---- the public calendar ---------------------------------------------
  // One source of truth: player dates live on g.prep, rival dates on the
  // acts themselves (announcedWeek). This just reads both.
  KP.releaseCalendar = function (state) {
    const items = [];
    KP.groups(state).forEach(g => {
      if (g.prep) items.push({ week: g.prep.scheduledWeek, isPlayer: true,
        label: g.name + (g.debuted ? ' comeback' : ' debut'),
        clash: g.prep.clash && g.prep.clash.resolved !== 'slip' ? g.prep.clash : null });
    });
    eachAct(state, (r, a) => {
      if (a.announcedWeek && a.announcedWeek >= state.week) {
        items.push({ week: a.announcedWeek, isPlayer: false, actId: a.id,
          company: r.short, label: a.name + ' comeback', pop: a.popularity || 0 });
      }
    });
    return items.sort((x, y) => x.week - y.week);
  };
  KP.announcedAt = function (state, week) {
    const out = [];
    eachAct(state, (r, a) => {
      if (a.announcedWeek === week) out.push({ act: a, rival: r });
    });
    return out.sort((x, y) => (y.act.popularity || 0) - (x.act.popularity || 0));
  };

  // how much a locked release matters to the people who'd snipe it —
  // debuts run on walk-in hype, comebacks on the fanbase already built
  function targetHeat(state, g) {
    const hypeMax = Math.max.apply(null, g.members.map(id => (state.people[id] || {}).hype || 0).concat([0]));
    return Math.max(g.popularity || 0, hypeMax);
  }

  // ---- the weekly pass --------------------------------------------------
  KP.calendarWeek = function (state, rng) {
    const W = KP.C.WAR;
    const notes = [];

    // 1. rival comebacks go public inside the announce window
    eachAct(state, (r, a) => {
      const due = actDue(a);
      if (due <= state.week || due - state.week > W.announceLead) return;
      if (a.announcedWeek === due) return;
      a.announcedWeek = due;
      if ((a.popularity || 0) >= W.announceNoteMinPop) {
        notes.push({ kind: 'industry', ind: 'comebackAnnounce', actName: a.name,
          company: r.short, releaseWeek: due,
          text: r.short + ' announced ' + a.name + '’s comeback for ' + KP.weekLabel(due).text +
            '. The date is public, which means the date is a statement. Plan around it — or through it.' });
      }
    });

    // 2. the player's locked date goes public the week after lock —
    //    teasers exist, the industry reads them
    KP.groups(state).forEach(g => {
      if (!g.prep || g.prep.announced) return;
      g.prep.announced = true;
      const foes = KP.announcedAt(state, g.prep.scheduledWeek)
        .filter(x => (x.act.popularity || 0) >= W.battleMinPop);
      notes.push({ kind: 'public', ind: 'playerAnnounce', groupId: g.id,
        actName: foes.length ? foes[0].act.name : null,
        text: 'The date is out: trade calendars now list ' + g.name + '’s ' +
          (g.debuted ? 'comeback' : 'debut') + ' for ' + KP.weekLabel(g.prep.scheduledWeek).text + '.' +
          (foes.length ? ' The same week as ' + foes[0].act.name + '. Everyone has noticed. Nobody thinks it is an accident.' : '') });
    });

    // 3. the ambush: a rival with an act in shifting distance parks it on
    //    a date worth sniping. They move while you still have time to
    //    respond — that is what makes it a taunt and not just a calendar.
    const target = KP.groups(state).find(g => g.prep && !g.prep.clash &&
      g.prep.scheduledWeek - state.week > W.ambushMinLeadWeeks &&
      targetHeat(state, g) >= W.ambushMinTarget);
    if (target) {
      const week = target.prep.scheduledWeek;
      const candidates = [];
      eachAct(state, (r, a) => {
        if (state.week - (r.lastAmbushWeek || -999) < W.ambushCooldown) return;
        const due = actDue(a);
        if (due <= state.week || due === week) return;
        if (Math.abs(due - week) > W.ambushWindow) return;
        candidates.push({ r, a });
      });
      if (candidates.length && rng.chance(W.ambushChance)) {
        // the most prestigious house does it — they can afford the pettiness
        candidates.sort((x, y) => y.r.prestige - x.r.prestige);
        const { r, a } = candidates[0];
        const wasPublic = a.announcedWeek != null;
        a.cycleWeeks = week - a.lastReleaseWeek;
        a.announcedWeek = week;
        r.lastAmbushWeek = state.week;
        r.ambushCount = (r.ambushCount || 0) + 1;
        target.prep.clash = { actId: a.id, company: r.short, actName: a.name, week, resolved: null };
        if (r.ambushCount >= W.sniperAt) {
          const nar = KP.recordEvidence(state, 'dateSniper', 'rivalCompany', r.short);
          if (nar) notes.push(nar);
        }
        notes.push({ kind: 'industry', urgent: true, ind: 'ambush', groupId: target.id,
          actName: a.name, company: r.short,
          text: r.short + (wasPublic
            ? ' just MOVED ' + a.name + '’s announced comeback — onto ' + target.name + '’s date. '
            : ' just announced ' + a.name + '’s comeback for ' + KP.weekLabel(week).text + ' — ' + target.name + '’s date. ') +
            'Scheduling coincidences do not exist in this industry. The desk options are in the Studio: hold the date, or slip ' +
            W.slipWeeks + ' weeks (' + W.slipCost + ' to rebook the calendar).' });
      }
    }
    return notes;
  };

  // ---- the decision: hold or slip --------------------------------------
  KP.respondClash = function (state, groupId, choice) {
    const W = KP.C.WAR;
    const g = KP.groupById(state, groupId);
    if (!g || !g.prep || !g.prep.clash) return { ok: false, reason: 'There is no clash on this calendar.' };
    const clash = g.prep.clash;
    if (clash.resolved) return { ok: false, reason: 'The company has already decided. Deciding twice IS the story.' };
    const members = g.members.map(id => state.people[id]);

    if (choice === 'hold') {
      clash.resolved = 'hold';
      members.forEach(m => { m.morale = KP.clamp(m.morale + 1, 0, 100); });
      const note = { kind: 'company', ind: 'dateHold', groupId: g.id, actName: clash.actName,
        text: 'The word went out quietly and firmly: ' + g.name + '’s date stands. The practice rooms heard it before the press did. Head-to-head with ' + clash.actName + ' it is.' };
      pushNote(state, note);
      return { ok: true, note };
    }
    if (choice === 'slip') {
      if (state.budget < W.slipCost) return { ok: false, reason: 'Rebooking the calendar costs ' + W.slipCost + ' and the budget cannot carry it. The date stands whether we like it or not.' };
      const newWeek = g.prep.scheduledWeek + W.slipWeeks;
      if (state.objective.status === 'open' && state.objective.type === 'debutGirlGroup' &&
          !g.debuted && newWeek > state.objective.deadlineWeek) {
        return { ok: false, reason: 'Slipping past the executive deadline is not on the menu. She was clear. The date stands.' };
      }
      state.budget -= W.slipCost;
      g.prep.scheduledWeek = newWeek;
      clash.resolved = 'slip';
      members.forEach(m => { m.morale = KP.clamp(m.morale - W.slipMorale, 0, 100); });
      const note = { kind: 'company', ind: 'dateSlip', groupId: g.id, actName: clash.actName,
        text: g.name + '’s release slips to ' + KP.weekLabel(newWeek).text + '. The stages are rebooked, the teasers re-cut, and ' +
          clash.company + ' gets the week they wanted. The members did not say anything, which said plenty.' };
      pushNote(state, note);
      return { ok: true, note };
    }
    return { ok: false, reason: 'Hold or slip. There is no third door.' };
  };
  function pushNote(state, n) { KP.note(state, n); }   // one lifecycle (v0.7.2)

  // ---- the battle: two releases, one week, one winner -------------------
  // Called from resolveDebut once the player's score exists. Rival
  // releases that landed this week are on state.weekReleases.
  KP.releaseWar = function (state, g, score, reception, conceptId, rng) {
    const W = KP.C.WAR;
    const notes = [];
    const keep = n => { if (n) notes.push(n); };
    const clash = g.prep && g.prep.clash;
    const landed = state.weekReleases || [];

    // pick the opponent: the clash act if it showed up, else the biggest
    // same-week release that is big enough to call it a battle
    let foe = clash && clash.resolved !== 'slip'
      ? landed.find(e => e.actId === clash.actId) : null;
    if (!foe) {
      foe = landed.slice().sort((x, y) => y.score - x.score)
        .find(e => (e.actPop || 0) >= W.battleMinPop) || null;
    }

    let battle = null;
    if (foe) {
      const won = score > foe.score;
      const hit = KP.rivalActById(state, foe.actId);
      const members = g.members.map(id => state.people[id]);
      g.feuds = g.feuds || {};
      const feud = g.feuds[foe.actId] = g.feuds[foe.actId] || { wins: 0, losses: 0 };
      if (won) {
        feud.wins++;
        g.popularity = KP.clamp(g.popularity + W.winPop, 0, 100);
        members.forEach(m => { m.morale = KP.clamp(m.morale + W.winMorale, 0, 100); });
        if (hit) hit.act.popularity = Math.max(0, hit.act.popularity - W.loseActPop);
        keep({ kind: 'public', ind: 'battleWin', priority: 'high', groupId: g.id, actName: foe.actName, company: foe.company,
          text: 'Head-to-head week, and the numbers are in: ' + g.name + ' over ' + foe.actName +
            '. ' + foe.company + ' picked this fight' + (clash && clash.resolved !== 'slip' ? ' — on our date —' : '') +
            ' and the recaps are calling the winner by name. ' + state.executive.name + ' read the coverage twice.' });
      } else {
        feud.losses++;
        g.popularity = KP.clamp(g.popularity - W.losePop, 0, 100);
        members.forEach(m => { m.morale = KP.clamp(m.morale - W.loseMorale, 0, 100); });
        keep({ kind: 'public', ind: 'battleLoss', priority: 'high', groupId: g.id, actName: foe.actName, company: foe.company,
          text: foe.actName + ' took the week. Same release day, and every chart shows them a rung above ' + g.name +
            '. ' + foe.company + '’s floor manager told the trades: “We were not aware anyone else released this week.” They were aware.' });
      }
      const meetings = feud.wins + feud.losses;
      if (meetings >= W.rivalryAt) {
        keep(KP.recordEvidence(state, 'rivalry', 'rivalAct', foe.actId));
      }
      battle = { actId: foe.actId, actName: foe.actName, company: foe.company,
        won, wins: feud.wins, losses: feud.losses };
    }

    // the copycat: a hit this big gets its concept stolen by the trend
    // chasers — their NEXT debut wears your clothes
    if (reception >= W.copyReceptionMin) {
      (state.rivals || []).forEach(r => {
        if (r.philosophy !== 'trendChaser' || r.copyConcept) return;
        if (!rng.chance(W.copyChance)) return;
        r.copyConcept = { conceptId, from: g.name };
        // silent for now — the reveal is their next debut showing up in
        // your wardrobe; the world only gets the receipt then
      });
    }
    return { notes, battle };
  };
})(typeof window !== 'undefined' ? window : globalThis);
