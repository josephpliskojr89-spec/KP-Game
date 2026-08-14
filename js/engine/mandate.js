/* The mandate (v0.9.19, §61) — the player is an executive producer.
   New acts start when the directive comes down from above: the board's
   greenlight, the exec's pet project, the hype directive, the second-
   lineup promise — or the pitch YOU take upstairs. One read-through
   truth (KP.openMandates) over every source; proposeGroup/openProject
   gate on it; the debut consumes it; a window left dark lapses and
   costs standing. Comebacks stay free — the mandate gates new acts,
   not the release loop. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.mandateLedger = state.mandateLedger ||
      { issued: 0, pitched: 0, granted: 0, denied: 0, met: 0, lapsed: 0 };
    return state.mandateLedger;
  }

  // ---- the one truth: every open mandate, whatever desk it came from --
  KP.openMandates = function (state) {
    const out = [];
    (state.mandates || []).forEach(m => {
      if (m.status === 'open') out.push(m);
    });
    // the founding objective IS the first mandate — the 18-month girl group
    if (state.objective && state.objective.type === 'debutGirlGroup' &&
        state.objective.status === 'open') {
      out.push({ id: 'obj-founding', kind: 'group', gender: 'f',
        source: 'the founding directive', window: state.objective.deadlineWeek, virtual: true });
    }
    // the hard directive: debut HER, "in a group, alone, I do not care which"
    if (state.hypeDirective && state.hypeDirective.status === 'open') {
      out.push({ id: 'obj-hype', kind: 'any', gender: null,
        personId: state.hypeDirective.personId,
        source: 'the hard directive', window: state.hypeDirective.deadlineWeek, virtual: true });
    }
    // the pet project: the exec's solo, inside the year
    (state.claims || []).forEach(c => {
      if (!c.resolved && c.type === 'petProject') {
        out.push({ id: 'claim-pet', kind: 'solo', gender: null,
          source: 'the pet project', window: c.byWeek, virtual: true });
      }
    });
    // the second-lineup promise carries its own greenlight (a promise
    // the paper will not let you keep is not a promise)
    (state.claims || []).forEach(c => {
      if (!c.resolved && c.type === 'secondGroup') {
        out.push({ id: 'claim-second', kind: 'group', gender: null,
          source: 'the promise on the record', window: c.byWeek, virtual: true });
      }
    });
    return out;
  };

  // does any open mandate fit this lineup?
  KP.mandateFitting = function (state, opts) {
    const kind = opts.kind;              // 'group' | 'solo'
    const gender = opts.gender || null;  // 'f' | 'm' | null(unknown yet)
    const memberIds = opts.memberIds || [];
    return KP.openMandates(state).find(m => {
      if (m.kind !== 'any' && m.kind !== kind) return false;
      if (m.gender && gender && m.gender !== gender) return false;
      if (m.personId && !memberIds.includes(m.personId)) return false;
      return true;
    }) || null;
  };

  KP.openMandate = function (state, opts) {
    state.mandates = state.mandates || [];
    state.nextMandateId = (state.nextMandateId || 0) + 1;
    const m = {
      id: 'md' + state.nextMandateId,
      kind: opts.kind || 'group',
      gender: opts.gender || null,
      personId: opts.personId || null,
      source: opts.source || 'the board',
      issuedWeek: state.week,
      window: opts.window || (state.week + KP.C.MANDATE.windowWeeks),
      status: 'open',
    };
    state.mandates.push(m);
    ledger(state).issued++;
    return m;
  };

  // the debut consumes the mandate that covered it (virtual mandates —
  // objective, directive, claims — settle through their own machinery)
  KP.consumeMandate = function (state, g) {
    const kind = (g.type === 'solo' || g.members.length === 1) ? 'solo' : 'group';
    const gender = g.members.length ? (state.people[g.members[0]] || {}).gender || null : null;
    const fit = KP.mandateFitting(state, { kind, gender, memberIds: g.members });
    if (!fit || fit.virtual) return;
    const m = (state.mandates || []).find(x => x.id === fit.id);
    if (m) {
      m.status = 'met';
      m.metWeek = state.week;
      m.groupId = g.id;
      ledger(state).met++;
      state.objectiveHistory = state.objectiveHistory || [];
      state.objectiveHistory.push({ type: 'mandate', status: 'met', week: state.week, source: m.source });
    }
  };

  // ---- the pitch: you take the room's case upstairs -------------------
  // Deterministic, legible — the exec says yes for reasons and no for
  // reasons, never for dice. Denied or granted, the calendar closes for
  // a while: the board does not do weekly auditions of your ambition.
  KP.pitchMandate = function (state, opts) {
    const M = KP.C.MANDATE;
    const kind = (opts && opts.kind) || 'group';
    const gender = (opts && opts.gender) || null;
    if ((state.mandateCooldownUntil || 0) >= state.week) {
      return { ok: false, reason: 'The board heard a pitch recently. The calendar upstairs reopens ' + KP.weekLabel(state.mandateCooldownUntil + 1).text + '.' };
    }
    if (KP.openMandates(state).some(m => m.kind === kind || m.kind === 'any')) {
      return { ok: false, reason: 'A greenlight of that shape is already open. Use the window you have.' };
    }
    ledger(state).pitched++;
    state.mandateCooldownUntil = state.week + M.pitchCooldown;
    const free = KP.freeTrainees(state).map(id => state.people[id])
      .filter(p => !gender || (p.gender || 'f') === gender);
    const execP = KP.execP(state);
    if (state.trust < M.pitchTrustMin) {
      ledger(state).denied++;
      return { ok: false, denied: true,
        reason: KP.fillPro('The pitch died in the room. “Ambition is not collateral,” {she} said, tapping the trust ledger without looking at it. Rebuild {pos} confidence first.', execP) };
    }
    if (kind !== 'solo' && free.length < M.pitchRoomMin) {
      ledger(state).denied++;
      return { ok: false, denied: true,
        reason: KP.fillPro('{She} listened, then asked to see the trainee floor on paper. ' + free.length + ' free ' + (free.length === 1 ? 'name' : 'names') + ' is a study group, not a lineup. Fill the room, then come back.', execP) };
    }
    if (state.fiscal && (state.fiscal.pressure || 0) >= 2) {
      ledger(state).denied++;
      return { ok: false, denied: true,
        reason: KP.fillPro('{She} slid the month’s books across the desk instead of answering. A company on a warning does not greenlight new acts. Fix the numbers.', execP) };
    }
    const m = KP.openMandate(state, { kind, gender, source: 'your pitch' });
    ledger(state).granted++;
    KP.note(state, { kind: 'executive', priority: 'high',
      text: KP.fillPro(state.executive.name + ' heard the pitch out, asked two questions about money and one about the room, and signed. A ' +
        (kind === 'solo' ? 'solo act' : (gender === 'm' ? 'boy group' : gender === 'f' ? 'girl group' : 'new group')) +
        ' is greenlit — the window runs to ' + KP.weekLabel(m.window).text + '. “You asked for this one,” {she} said. “That is the part I will remember either way.”', execP) });
    return { ok: true, mandate: m };
  };

  // ---- the weekly: the board reads the same room you do ----------------
  KP.registerWeekly('mandates', 735, function (state, rng, inbox) {
    const M = KP.C.MANDATE;
    // greenlights left dark lapse, and the board remembers who asked
    (state.mandates || []).forEach(m => {
      if (m.status !== 'open' || state.week <= m.window) return;
      const covered = KP.groups(state).some(g => !g.debuted && !g.retiredWeek);
      if (covered) { m.window += 4; return; }   // a lineup in development buys grace
      m.status = 'lapsed';
      ledger(state).lapsed++;
      state.trust = KP.clamp(state.trust + M.lapseTrust, 0, 100);
      state.objectiveHistory = state.objectiveHistory || [];
      state.objectiveHistory.push({ type: 'mandate', status: 'lapsed', week: state.week, source: m.source });
      inbox.push({ kind: 'executive', urgent: true,
        text: state.executive.name + ': “We greenlit a project and the floor stayed dark. Budgets renew. Greenlights are trust, and trust is a consumable. Noted upstairs.”' });
    });
    // the room gets loud enough that the board hears it without you
    const hasOpen = KP.openMandates(state).some(m => m.kind !== 'solo');
    const dev = KP.groups(state).some(g => !g.debuted && !g.retiredWeek);
    const anyDebuted = KP.groups(state).some(g => g.debuted);
    if (!hasOpen && !dev && anyDebuted &&
        KP.freeTrainees(state).length >= M.roomPressureAt &&
        !(state.fiscal && (state.fiscal.pressure || 0) >= 2) &&
        rng.chance(M.roomPressureChance)) {
      const m = KP.openMandate(state, { kind: 'group', gender: null, source: 'the board’s read of the room' });
      inbox.push({ kind: 'executive', priority: 'high',
        text: state.executive.name + ': “The board toured the building Thursday. They walked past the practice room slowly, on purpose. A new group is greenlit — window to ' +
          KP.weekLabel(m.window).text + '. Do not make me explain an empty stage.”' });
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
