/* Group formation. The player proposes; the executive reviews.
   The best five individuals are not automatically the best group. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  KP.suggestGroupNames = function (state, rng) {
    const used = new Set(KP.groups(state).map(g => g.name.toLowerCase()));
    const names = [];
    while (names.length < 3) {
      const n = KP.genGroupName(rng, used);
      if (!names.includes(n)) names.push(n);
    }
    return names;
  };

  // ---- multi-group helpers (v0.2.2) ------------------------------------
  KP.groups = function (state) { return state.groups || []; };
  KP.groupById = function (state, gid) { return KP.groups(state).find(g => g.id === gid) || null; };
  KP.groupOf = function (state, personId) {
    return KP.groups(state).find(g => g.members.includes(personId)) || null;
  };
  // retired-guard added 0.9.18.2: a dissolved pre-debut project must not
  // block the next lineup forever
  KP.devGroup = function (state) { return KP.groups(state).find(g => !g.debuted && !g.retiredWeek) || null; };
  KP.freeTrainees = function (state) {
    return state.roster.filter(id =>
      state.people[id].status === 'trainee' && !KP.groupOf(state, id));
  };

  // ---- The project (v0.2.5): a provisional lineup ----------------------
  // "These 3 are in. Now the rest of the trainees know there's a project
  // and they start working to make it." — owner
  KP.openProject = function (state, lockedIds, seeking) {
    const P = KP.C.PROJECT;
    if (state.project) return { ok: false, reason: 'A project is already open. Finalize or shelve it first.' };
    if (KP.devGroup(state)) return { ok: false, reason: 'A group is already in development.' };
    // the mandate (v0.9.19): a project is a lineup in the making — it
    // needs the same greenlight the lineup will
    const pGender = (lockedIds && lockedIds.length) ?
      ((state.people[lockedIds[0]] || {}).gender || 'f') : null;
    if (KP.mandateFitting && !KP.mandateFitting(state, { kind: 'group', gender: pGender, memberIds: lockedIds || [] })) {
      return { ok: false, reason: 'No greenlight covers a new group. Pitch the board, or wait for the directive.' };
    }
    lockedIds = (lockedIds || []).slice();
    if (!lockedIds.length) return { ok: false, reason: 'Lock in at least one member to make it a project.' };
    if (lockedIds.length >= KP.C.GROUP.minMembers) return { ok: false, reason: 'That is a full lineup — propose it instead.' };
    if (lockedIds.length > P.maxLocked) return { ok: false, reason: 'Lock at most ' + P.maxLocked + ' — a project needs open spots to fight for.' };
    for (const id of lockedIds) {
      const p = state.people[id];
      if (!p || p.status !== 'trainee') return { ok: false, reason: 'Locked members must be signed trainees.' };
      if (KP.groupOf(state, id)) return { ok: false, reason: 'Someone in this project already belongs to a group.' };
    }
    seeking = (seeking || []).filter(d => KP.C.TALENTS.includes(d)).slice(0, P.maxSeeking);
    state.project = { locked: lockedIds.slice(), seeking, openedWeek: state.week };
    lockedIds.forEach(id => {
      state.people[id].history.push({ week: state.week, text: 'Locked into the new group project.' });
    });
    return { ok: true };
  };

  KP.cancelProject = function (state) {
    if (!state.project) return { ok: false, reason: 'No project to shelve.' };
    const hopefuls = KP.freeTrainees(state).filter(id => !state.project.locked.includes(id));
    hopefuls.forEach(id => {
      const p = state.people[id];
      p.morale = KP.clamp(p.morale - KP.C.PROJECT.cancelMoraleHit, 0, 100);
    });
    state.project = null;
    return { ok: true, disappointed: hopefuls.length };
  };

  // Validate + form a group. roles: {leader, center, mainVocal, mainDancer, mainRapper}
  // One group in development at a time; a new lineup needs every existing
  // group already debuted, and members belong to at most one group.
  KP.proposeGroup = function (state, name, memberIds, roles) {
    if (KP.devGroup(state)) return { ok: false, reason: 'A group is already in development. Debut them first.' };
    // the mandate (v0.9.19): new acts start when the directive comes down.
    // The executive producer assembles the lineup; the board opens the door.
    const mGender = memberIds.length ? ((state.people[memberIds[0]] || {}).gender || 'f') : null;
    const mKind = memberIds.length === 1 ? 'solo' : 'group';
    if (KP.mandateFitting && !KP.mandateFitting(state, { kind: mKind, gender: mGender, memberIds })) {
      return { ok: false, reason: 'No greenlight covers this act. Debuts come down from upstairs — pitch the board, or wait for the directive.' };
    }
    const isSolo = memberIds.length === 1;   // v0.2.6: an act of one
    if (!isSolo && (memberIds.length < KP.C.GROUP.minMembers || memberIds.length > KP.C.GROUP.maxMembers)) {
      return { ok: false, reason: 'A lineup runs ' + KP.C.GROUP.minMembers + '–' + KP.C.GROUP.maxMembers + ' members — or exactly one, for a solo.' };
    }
    const members = memberIds.map(id => state.people[id]);
    if (members.some(m => !m || m.status !== 'trainee')) return { ok: false, reason: 'Every member must be a signed trainee.' };
    if (memberIds.some(id => KP.groupOf(state, id))) return { ok: false, reason: 'Someone in this lineup already belongs to a group.' };
    // one group, one gender (v0.8.4) — the market the company sells into
    // does not sign mixed idol groups, and neither does the exec
    const genders = new Set(members.map(m => m.gender || 'f'));
    if (genders.size > 1) {
      return { ok: false, reason: 'A mixed lineup is a different business plan. One group, one gender — the exec was very clear.' };
    }
    if (KP.groups(state).some(g => g.name.toLowerCase() === String(name).toLowerCase())) {
      return { ok: false, reason: 'That name is taken in this building.' };
    }
    name = String(name || '').trim().slice(0, 18);
    if (!name.length) return { ok: false, reason: 'A group needs a name before it needs anything else.' };
    if (isSolo) {
      roles = { leader: memberIds[0], center: memberIds[0] };
    }
    for (const role of ['leader', 'center']) {
      if (!roles[role] || !memberIds.includes(roles[role])) {
        return { ok: false, reason: 'Assign a ' + role + ' from the lineup.' };
      }
    }
    ['mainVocal', 'mainDancer', 'mainRapper'].forEach(r => {
      if (roles[r] && !memberIds.includes(roles[r])) delete roles[r];
    });

    state.groups = state.groups || [];
    state.nextGroupId = state.nextGroupId || 1;
    const group = {
      id: 'g' + (state.nextGroupId++),
      type: isSolo ? 'solo' : 'group',
      gender: members[0].gender || 'f',
      name,
      members: memberIds.slice(),
      roles: Object.assign({}, roles),
      formedWeek: state.week,
      centerHistory: [{ week: state.week, id: roles.center }],
      debuted: false,
      prep: null,          // set by the studio when a release is scheduled
      results: null,
      demos: null,         // each group hears its own demos
      releases: [],
    };
    state.groups.push(group);
    // the first pitch meeting happens the day the lineup forms (v0.7.2)
    // — an action-time draw, so render never has to (kernel law)
    {
      const rng = KP.rngFor(state);
      group.demos = KP.generateDemos(state, rng, group);
      state.rngState = rng.state();
    }
    members.forEach(m => {
      m.history.push({ week: state.week, text: 'Selected for the debut lineup of ' + name + '.' });
    });
    // maknae is a fact, not a role
    const youngest = members.slice().sort((a, b) => a.age - b.age)[0];
    group.maknae = youngest.id;
    // the project becomes the group — and anyone locked in but left out
    // learns what that feels like
    if (state.project) {
      state.project.locked.forEach(id => {
        if (!memberIds.includes(id)) {
          const p = state.people[id];
          if (p) {
            p.morale = KP.clamp(p.morale - KP.C.PROJECT.droppedMoraleHit, 0, 100);
            p.history.push({ week: state.week, text: 'Locked into the project, then left out of the final lineup.' });
          }
        }
      });
      state.project = null;
    }
    // the evaluation board's #1 left off the lineup (v0.9.16): everyone
    // in the practice room saw the board, and everyone saw the list
    const ace = state.lastEvalTopId && state.people[state.lastEvalTopId];
    if (ace && ace.status === 'trainee' && !memberIds.includes(ace.id) && !KP.groupOf(state, ace.id)) {
      ace.morale = KP.clamp(ace.morale - 6, 0, 100);
      KP.recordDirected(state, ace.id, 'passedOver', -2);
      ace.history.push({ week: state.week, text: 'Ranked first on the evaluation board when the ' + name + ' lineup was posted — without ' + (ace.gender === 'm' ? 'his' : 'her') + ' name on it. Nobody in the practice room said anything, which said everything.' });
    }
    return { ok: true, group, review: KP.execReviewLineup(state, members, roles) };
  };

  // The executive reacts to the proposal in words. Approval is granted —
  // the player has the authority — but the reaction is remembered.
  KP.execReviewLineup = function (state, members, roles) {
    const lines = [];
    if (members.length === 1) {
      const pull = KP.derived(members[0]).centerPull;
      lines.push(KP.fillPro(pull >= 60
        ? '“A solo. Bold. {She} had better be exactly who you think {she} is — there is nobody to stand next to when {she} isn’t.”'
        : '“A solo debut for {her}? I hope you know something my reports do not.”', members[0]));
      if ((members[0].hype || 0) >= 35) lines.push('“At least the internet already did half the marketing. Do not waste that.”');
      return lines;
    }
    const chem = KP.groupChemistry(state, members);
    const center = state.people[roles.center];
    const centerPull = KP.derived(center).centerPull;
    const leader = state.people[roles.leader];
    const avgAge = members.reduce((s, m) => s + m.age, 0) / members.length;

    if (centerPull >= 62) lines.push(KP.fillPro('“The center choice, I understand. Even I keep watching {her}.”', center));
    else if (centerPull <= 42) lines.push('“Your center. Explain to me later why the public will agree with you.”');
    if (leader.personality.leadership >= 62) lines.push('“The leader can carry a room. Good.”');
    else lines.push('“You have named a leader the room has not.”');
    if (chem <= 40) lines.push('“Staff tell me these members barely speak. Fix that before the cameras find it.”');
    if (avgAge >= 21) lines.push('“An older lineup. They had better be ready faster, then.”');
    if (!lines.length) lines.push('“Proceed. Make me look right.”');
    return lines;
  };

  // ---- Editing roles after formation (v0.3.3) --------------------------
  // Pre-debut, the room adjusts. Post-debut, a center change is news —
  // and a questionable one is bad news the fans write themselves.
  KP.setGroupRoles = function (state, groupId, roles) {
    const RC = KP.C.GROUP.ROLECHANGE;
    const g = KP.groupById(state, groupId);
    if (!g) return { ok: false, reason: 'No such group.' };
    if (g.type === 'solo') return { ok: false, reason: 'A solo already has one of everything.' };
    for (const role of ['leader', 'center']) {
      if (!roles[role] || !g.members.includes(roles[role])) {
        return { ok: false, reason: 'Assign a ' + role + ' from the lineup.' };
      }
    }
    ['mainVocal', 'mainDancer', 'mainRapper'].forEach(r => {
      if (roles[r] && !g.members.includes(roles[r])) delete roles[r];
    });
    const old = g.roles;
    const changed = ['leader', 'center', 'mainVocal', 'mainDancer', 'mainRapper']
      .filter(r => (old[r] || null) !== (roles[r] || null));
    if (!changed.length) return { ok: false, reason: 'Nothing changed.' };

    const notes = [];
    // human cost/gain on every named-role move
    changed.forEach(r => {
      const isCenter = r === 'center';
      const demoted = old[r] && state.people[old[r]];
      const promoted = roles[r] && state.people[roles[r]];
      if (demoted && demoted.id !== (roles[r] || null)) {
        demoted.morale = KP.clamp(demoted.morale - (isCenter ? RC.centerDemoteMorale : RC.demoteMorale), 0, 100);
        if (isCenter) demoted.personality.confidence = KP.clamp(demoted.personality.confidence - RC.centerDemoteConf, 0, 100);
        demoted.history.push({ week: state.week, text: 'Lost the ' + roleLabel(r) + ' position in ' + g.name + '.' });
      }
      if (promoted && promoted.id !== (old[r] || null)) {
        promoted.morale = KP.clamp(promoted.morale + RC.promoteMorale, 0, 100);
        if (isCenter) promoted.personality.confidence = KP.clamp(promoted.personality.confidence + RC.centerPromoteConf, 0, 100);
        promoted.history.push({ week: state.week, text: 'Named ' + roleLabel(r) + ' of ' + g.name + '.' });
      }
    });

    const centerChanged = changed.includes('center');
    if (centerChanged) {
      const oldC = state.people[old.center];
      const newC = state.people[roles.center];
      // the two of them will feel this, whatever the press says
      if (oldC && newC) {
        const key = KP.pairKey(oldC, newC);
        state.relationships[key] = state.relationships[key] || { score: 0, state: null };
        state.relationships[key].score = KP.clamp(state.relationships[key].score - RC.strain, -100, 100);
      }
      g.centerHistory = g.centerHistory || [];
      g.centerHistory.push({ week: state.week, id: roles.center });

      if (g.debuted && oldC && newC) {
        const oldPull = KP.derived(oldC).centerPull;
        const newPull = KP.derived(newC).centerPull;
        const publicPick = g.results && g.results.centerOvershadowed && roles.center === g.results.breakoutId;
        if (publicPick) {
          g.popularity = KP.clamp((g.popularity || 0) + RC.approvalPopGain, 0, 100);
          notes.push({ kind: 'public', text: 'The internet takes full credit: ' + KP.displayName(newC) +
            ' is now the center it chose months ago. The fan accounts are insufferable and the engagement is real.' });
        } else if (newPull < oldPull - RC.questionableGap) {
          g.popularity = KP.clamp((g.popularity || 0) - RC.questionablePopHit, 0, 100);
          notes.push({ kind: 'public', urgent: true, text: 'The center change is not landing. Fancams still point at ' +
            KP.displayName(oldC) + ', and the comment sections are asking what the company is thinking.' });
        } else {
          notes.push({ kind: 'public', text: 'A center change this deep into an act is news. Coverage is cautiously curious; the next comeback will settle it.' });
        }
      } else if (!g.debuted) {
        notes.push({ kind: 'company', text: g.name + ' room report: the center change landed quietly — before a debut, everything is still rehearsal.' });
      }
    }

    g.roles = Object.assign({}, roles);
    notes.forEach(n => {
      n.week = state.week; n.read = false; n.id = 'm' + (state.nextMsgId++);
    });
    state.inbox = notes.concat(state.inbox || []).slice(0, 60);
    return { ok: true, notes, centerChanged };
  };

  function roleLabel(r) {
    return { leader: 'leader', center: 'center', mainVocal: 'main vocal',
      mainDancer: 'main dancer', mainRapper: 'main rapper' }[r] || r;
  }

  // Perceived role suggestions for the builder UI — through the scout's eyes.
  KP.roleHints = function (state, members) {
    const scout = KP.DATA.evaluators[2];
    function bestBy(fn) {
      return members.slice().sort((a, b) => fn(b) - fn(a))[0];
    }
    return {
      mainVocal: bestBy(m => KP.perceived(state, m, 'vocals', KP.DATA.evaluators[0])).id,
      mainDancer: bestBy(m => KP.perceived(state, m, 'dance', KP.DATA.evaluators[1])).id,
      mainRapper: bestBy(m => KP.perceived(state, m, 'rap', KP.DATA.evaluators[0])).id,
      center: bestBy(m => KP.perceived(state, m, 'charisma', scout) + KP.perceived(state, m, 'visuals', scout) * 0.6).id,
      leader: bestBy(m => KP.derived(m).leadership).id,
    };
  };

  // ---- the conclusion of team activities (0.9.18.2) ---------------------
  // owner: "there's no way for ME to disband a group". The same ending
  // the rivals got in 0.9.18.1 — a written chapter, not a deletion. The
  // GROUP ends; the contracts don't: the members stay signed idols with
  // their solo careers (gigs, deals, second jobs) until their own clocks
  // run out. The catalog stays and can still resurface.
  KP.disbandGroup = function (state, groupId) {
    const D = KP.C.DISBAND;
    const g = KP.groupById(state, groupId);
    if (!g) return { ok: false, reason: 'No such group.' };
    if (g.retiredWeek) return { ok: false, reason: 'That chapter is already closed.' };
    if (g.tour) return { ok: false, reason: 'They are on the road — a tour is a stack of signed venue contracts. Bring them home first.' };
    if (g.debuted && g.prep) return { ok: false, reason: 'A release is in production. Let the era end before you end the act.' };
    if (g.debuted && state.week <= (g.promoUntil || 0)) return { ok: false, reason: 'Promotions are running. Ending an act mid-era is a scandal, not a decision.' };
    const debuted = !!g.debuted;
    const members = g.members.map(id => state.people[id]).filter(Boolean);
    members.forEach(p => {
      if (debuted) {
        p.morale = KP.clamp(p.morale - D.morale, 0, 100);
        KP.recordDirected(state, p.id, 'disbandedUs', -2);
        p.history.push({ week: state.week, text: g.name + ' concluded team activities. The statement thanked the fans for every era. The group chat renamed itself and kept going.' });
      } else {
        p.morale = KP.clamp(p.morale - D.traineeMorale, 0, 100);
        p.history.push({ week: state.week, text: 'The ' + g.name + ' project was dissolved before the stage. Back to the practice room, carrying it.' });
      }
    });
    // the record keeps the lineup; every gate reads empty from here
    g.finalLineup = g.members.slice();
    g.members = []; g.roles = {}; g.rooms = null; g.maknae = null;
    g.prep = null; g.demos = null; g.tour = null; g.hiatus = null;
    delete g.returnFrom;
    g.retiredWeek = state.week;
    // promises about a group that no longer exists settle void
    (state.claims || []).forEach(c => {
      if (!c.resolved && c.groupId === g.id) { c.resolved = 'void'; c.resolvedWeek = state.week; }
    });
    if (!debuted) {
      const note = KP.note(state, { kind: 'company', priority: 'high',
        text: 'The ' + g.name + ' project is dissolved. The trainees are back on the floor by the afternoon — the practice room does not do funerals, it does Monday.' });
      return { ok: true, note: note.text };
    }
    let trustLine = '';
    if ((g.popularity || 0) >= D.sellingPop) {
      state.trust = KP.clamp(state.trust + D.trustSelling, 0, 100);
      trustLine = ' ' + state.executive.name + ' signed the paperwork with one eyebrow raised: ending an act that still sells reads as instability upstairs, and upstairs reads everything.';
    }
    const note = KP.note(state, { kind: 'public', ind: 'playerDisband', priority: 'critical', groupId: g.id,
      text: 'The statement is out: ' + g.name + ' concludes team activities. It thanks the fans for every era, and for once every word of it is true. The members remain with the company — their own calendars, their own rooms, the same building. The fan cafés are holding a wake and an archive drive at the same time.' + trustLine });
    return { ok: true, note: note.text };
  };

  // the timeline grieves in public, the way it does everything
  KP.onFeedEvent('playerDisband', (state, n, rng) => {
    const g = KP.groupById(state, n.groupId);
    if (!g) return null;
    return rng.pick([
      { persona: 'fan', text: 'the ' + g.name + ' statement says "concludes team activities" like it isn’t seven years of my life in four words. rest well. thank you. I’m not okay' },
      { persona: 'stan', text: 'archiving every ' + g.name + ' stage tonight. twice. the catalog doesn’t disband and neither do we' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
