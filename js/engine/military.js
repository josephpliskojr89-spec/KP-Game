/* The service (v0.9.23, §55.7, map slot 8) — "boy bands are missing one
   massive part of their stories: military enlistment." Every male idol
   carries an enlistment window with a hard deadline age; postponement
   moves a date, never removes it. The decision is the industry's
   classic — STAGGER (the group holds the line short-handed) or TOGETHER
   (the full chapter, one wait, one return) — the contract clock pauses
   in service, the fandom starts the wait, and the discharge return
   stage is the event the whole anticipation system builds toward. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.serviceLedger = state.serviceLedger ||
      { plans: 0, together: 0, stagger: 0, notices: 0, enlisted: 0, walls: 0, discharged: 0, returns: 0 };
    return state.serviceLedger;
  }
  KP.inService = function (p) { return !!(p && p.flags && p.flags.military); };

  // whether HIS papers reach the desk — the group's plan decides first
  function papersAllowed(state, g) {
    if (!g || g.members.length < 2 || g.gender !== 'm') return true;   // solo or groupless: his own desk
    if (g.pendingService) return false;                                // the joint date is already set
    if (!g.servicePlan) return false;                                  // the plan scene decides first
    if (g.servicePlan === 'stagger') return true;
    // together: once the chapter is done, any straggler goes one at a time
    return !g.members.some(id => KP.inService(state.people[id]));
  }

  function enlist(state, p, opts) {
    const M = KP.C.MIL;
    const forced = !!(opts && opts.forced);
    const g = KP.groupOf(state, p.id);
    p.flags.military = { since: state.week, until: state.week + M.serviceWeeks };
    delete p.flags.personalHiatus;   // the state supersedes the statement
    p.morale = KP.clamp(p.morale - M.soldierMorale, 0, 100);
    const led = ledger(state);
    led.enlisted++;
    if (forced) led.walls++;
    p.history.push({ week: state.week, text: 'Enlisted for mandatory service' +
      (forced ? ' — the postponements ran out on schedule, the way postponements do' : '') +
      '. Discharge expected ' + KP.weekLabel(p.flags.military.until).text + '.' });
    (g ? g.members : []).filter(id => id !== p.id).map(id => state.people[id]).filter(Boolean)
      .forEach(m => { m.morale = KP.clamp(m.morale - M.mateMorale, 0, 100); });
    // an unanswered papers scene is answered by the bus leaving
    state.scenes = (state.scenes || []).filter(sc =>
      !(sc.kind === 'enlistPapers' && sc.personId === p.id));
    // brand campaigns close with a farewell post — nobody bills a soldier
    (state.deals || []).forEach(d => {
      if (d.personId === p.id && d.weeksLeft > 0) d.weeksLeft = 0;
    });
    // a live solo clamor goes back in its box — the service parks every
    // conversation; the gravity (§60) can re-form it when he is home
    if (g && g.gravity && g.gravity.personId === p.id && !g.gravity.settled) delete g.gravity;
    if (g && g.gravityWatch && g.gravityWatch.personId === p.id) delete g.gravityWatch;
    if (!(opts && opts.quiet)) {
      const n = { kind: 'public', ind: 'enlisted', priority: 'high', personId: p.id,
        text: KP.fillPro(KP.displayName(p) + ' enlists for mandatory service this week — the photo at the gate, the short haircut, the bow that lasted a beat longer than protocol asks. The fandom’s send-off trended for a day and settled into the long project: see you ' + KP.weekLabel(p.flags.military.until).text + '. The wait has a calendar now.', p) };
      if (g) n.groupId = g.id;
      KP.note(state, n);
    }
    return g;
  }

  function discharge(state, p, inbox) {
    const M = KP.C.MIL;
    const weeks = state.week - p.flags.military.since;
    delete p.flags.military;
    delete p.flags.enlistPapers;     // the next window, if any, is a new story
    p.serviceDone = state.week;      // durable — the census and the wall both read it
    p.morale = KP.clamp(p.morale + M.dischargeMorale, 0, 100);
    p.fatigue = Math.min(p.fatigue, M.dischargeFatigueCap);
    p.personality.professionalism = KP.clamp(p.personality.professionalism + M.professionalism, 0, 100);
    ledger(state).discharged++;
    p.history.push({ week: state.week, text: 'Discharged after ' + weeks +
      ' weeks of service. Came back with a straighter spine, a phone full of two years of group chat, and the same job waiting — which is the whole point of the wait.' });
    const g = KP.groupOf(state, p.id);
    const n = { kind: 'public', ind: 'discharged', priority: 'high', personId: p.id,
      text: KP.fillPro(KP.displayName(p) + ' is BACK — discharged on schedule, met at the gate by managers, members, and a fan-organized coffee truck that was definitely not sanctioned and definitely appreciated. The first photo is a salute and a grin. The quote is “I watched every stage from the base.” The wait is over.', p) };
    if (g) n.groupId = g.id;
    KP.note(state, n);
    // the return stage: the last man back re-arms the whole machine —
    // the next lock inside the window banks the countdown (see debut.js)
    if (g && g.debuted && !g.retiredWeek &&
        !g.members.some(id => KP.inService(state.people[id]))) {
      g.returnStage = { week: state.week };
      ledger(state).returns++;
      if (g.hiatus && g.hiatus.service) {
        // the wait ends; the ordinary clock (grace, then cooling) restarts
        // NOW so the return comeback gets planned against a fresh window
        g.hiatus.service = false;
        g.hiatus.graceFrom = state.week;
      }
      inbox.push({ kind: 'company', priority: 'high', groupId: g.id,
        text: g.name + ' is whole again — every member home, every clock running. The next date this company announces is not a comeback, it is a RETURN, and the room that waited knows the difference. The window is open.' });
    }
  }

  KP.registerWeekly('military', 786, function (state, rng, inbox, roster, groups) {
    const M = KP.C.MIL;
    const led = ledger(state);

    // ---- the ones away: the clock pauses, the body resets -------------
    roster.forEach(p => {
      const mil = p.flags && p.flags.military;
      if (!mil) return;
      p.fatigue = KP.clamp(p.fatigue - M.serviceFatigueRelief, 0, 100);
      if (p.contract) p.contract.start += 1;   // one week in, one week back — the paper waits
      if (state.week >= mil.until) discharge(state, p, inbox);
    });

    // ---- the joint date (together): executes once the era closes ------
    groups.forEach(g => {
      if (!g.pendingService) return;
      if (g.retiredWeek || !g.members.length) { g.pendingService = false; return; }
      if (g.prep || g.tour || state.week <= (g.promoUntil || 0)) return;
      g.pendingService = false;
      const going = g.members.map(id => state.people[id]).filter(Boolean)
        .filter(m => m.gender === 'm' && !m.serviceDone && !KP.inService(m) &&
          m.age >= M.minTogetherAge);
      if (!going.length) return;
      going.forEach(m => enlist(state, m, { quiet: true }));
      // the chapter closes officially — a service hiatus, which the
      // hiatus weekly treats as loyal (no cooling while the reason is law)
      g.hiatus = g.hiatus || { since: state.week };
      g.hiatus.service = true;
      KP.note(state, { kind: 'public', ind: 'enlisted', priority: 'critical', groupId: g.id,
        text: g.name + ' enlists TOGETHER this week — one statement, ' + going.length + ' short haircuts, a group photo at the gate that the fandom will keep as a lock screen for the duration. The wait starts today, and it ends ' + KP.weekLabel(state.week + M.serviceWeeks).text + '. One chapter, one return. See you there.' });
    });

    // ---- the plan: the folder with the flag on it ----------------------
    groups.forEach(g => {
      if (g.gender !== 'm' || !g.debuted || g.retiredWeek || g.servicePlan || g.pendingService) return;
      if (g.members.length < 2) return;
      if ((state.scenes || []).some(sc => sc.kind === 'servicePlan' && sc.groupId === g.id)) return;
      const men = g.members.map(id => state.people[id]).filter(Boolean)
        .filter(m => m.gender === 'm' && !m.serviceDone);
      if (!men.length || !men.some(m => m.age >= M.noticeAge)) return;
      led.plans++;
      KP.openScene(state, { kind: 'servicePlan', groupId: g.id, expiresWeek: state.week + 4 });
      inbox.push({ kind: 'company', urgent: true, groupId: g.id,
        text: 'The folder with the flag on it reached the Desk: ' + g.name + '’s service plan. ' +
          KP.displayName(men.slice().sort((a, b) => b.age - a.age)[0]) + ' is ' +
          men.slice().sort((a, b) => b.age - a.age)[0].age + ', the wall is age ' + M.deadlineAge +
          ', and the industry has exactly two answers. The scheduling office would like ONE of them, in writing.' });
    });

    // ---- the papers: his window opens (stagger and solo desks) --------
    const due = roster.find(p => {
      if (p.status !== 'idol' || p.gender !== 'm') return false;
      if (p.serviceDone || (p.flags && (p.flags.military || p.flags.enlistPapers))) return false;
      if (p.age < M.noticeAge) return false;
      if (!papersAllowed(state, KP.groupOf(state, p.id))) return false;
      return !(state.scenes || []).some(sc => sc.kind === 'enlistPapers' && sc.personId === p.id);
    });
    if (due) {
      due.flags.enlistPapers = state.week;
      led.notices++;
      KP.openScene(state, { kind: 'enlistPapers', personId: due.id, expiresWeek: state.week + 4 });
      inbox.push({ kind: 'company', urgent: true, personId: due.id,
        text: KP.fillPro(KP.displayName(due) + '’s enlistment window is open — {she} is ' + due.age +
          ', the wall is age ' + M.deadlineAge + ', and the papers on the Desk only have two boxes. {She} has already done the math; everyone {pos} age has. The question is the calendar’s, and it is yours.', due) });
    }

    // ---- the wall: postponement runs out on the birthday --------------
    roster.slice().forEach(p => {
      if (p.gender !== 'm' || p.serviceDone || KP.inService(p)) return;
      if (p.age < M.deadlineAge) return;
      if (p.status === 'idol') {
        const g = KP.groupOf(state, p.id);
        if (g && g.tour) return;   // the date negotiated to the day after the final show
        enlist(state, p, { forced: true });
      } else if (p.status === 'trainee') {
        // the service takes the trainee the building never debuted — a
        // story that ends at the practice room door, not the stage door
        if (KP.groupOf(state, p.id) ||
            (state.project && state.project.locked.includes(p.id))) return;
        ledger(state).walls++;
        p.history.push({ week: state.week, text: 'Left the company for mandatory service with no debut on the books. Cleared the practice room locker the slow way.' });
        KP.releaseTrainee(state, p.id);
        inbox.push({ kind: 'development', urgent: true, personId: p.id,
          text: KP.fillPro(KP.displayName(p) + ' hit the enlistment wall still wearing a trainee badge. {She} bowed to the practice room on the way out — the room, not the staff — and the building pretended not to see. The service does not care whose debut never came.', p) });
      }
    });
  });

  // ---- the plan scene: the industry's two answers ----------------------
  KP.registerScene('servicePlan', {
    title: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      return (g ? g.name : 'The group') + ' · the service plan';
    },
    body: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      if (!g) return '';
      const M = KP.C.MIL;
      const men = g.members.map(id => state.people[id]).filter(Boolean)
        .filter(m => m.gender === 'm' && !m.serviceDone);
      const lines = men.slice().sort((a, b) => b.age - a.age)
        .map(m => KP.displayName(m) + ', ' + m.age +
          (m.age >= M.deadlineAge - 1 ? ' — the wall is CLOSE' : ''));
      return 'The ages, read out loud: ' + lines.join('; ') +
        '. The industry knows two answers. STAGGER — one at a time as each window closes, the group holds the line short-handed, and the calendar becomes a map of who is away when. TOGETHER — everyone at once when the current era ends, the full chapter, one wait, one return stage. Both end the same way: everyone comes back. The only question is what the years in between look like.';
    },
    options: () => [
      { id: 'stagger', label: 'Stagger — hold the line' },
      { id: 'together', label: 'Together — one wait, one return' },
    ],
    resolve: (state, sc, optionId) => {
      const g = KP.groupById(state, sc.groupId);
      if (!g) return {};
      const led = ledger(state);
      if (optionId === 'together') {
        g.servicePlan = 'together';
        g.pendingService = true;
        led.together++;
        return { toast: g.name + ' enlists together once the current calendar clears — one statement, one wait, one return. The fan cafés will need a support group. They will build a beautiful one.' };
      }
      g.servicePlan = 'stagger';
      led.stagger++;
      return { toast: g.name + ' goes one at a time — the group holds the line short-handed. The scheduling office pinned a two-year map of who-is-away-when to the wall and stood in front of it a long time.' };
    },
    // an unanswered folder answers itself: the wall staggers them anyway
    expire: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      if (!g || g.servicePlan) return null;
      g.servicePlan = 'stagger';
      ledger(state).stagger++;
      return { kind: 'company', groupId: g.id,
        text: 'The service-plan folder for ' + g.name + ' sat unanswered until the scheduling office filed the default: staggered, each man as his window closes. Some plans are made by making no plan. The office notes this is the worse way to arrive at the same place.' };
    },
  });

  // ---- the papers scene: send him now, or spend the runway -------------
  KP.registerScene('enlistPapers', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'The artist') + ' · the papers';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return '';
      const M = KP.C.MIL;
      const runway = Math.max(0, M.deadlineAge - p.age);
      return KP.fillPro(KP.displayName(p) + ' is ' + p.age + '. The wall is age ' + M.deadlineAge +
        (runway ? ' — about ' + runway + ' year' + (runway === 1 ? '' : 's') + ' of runway' : ' — now') +
        ' — and postponements only move a date, they never remove one. Send {her} now and {she} is back before the wall was ever a problem, with the goodbye behind everyone. Hold, and the calendar spends the runway on eras — with the same goodbye waiting at the end of it, on the law’s schedule instead of yours.', p);
    },
    options: () => [
      { id: 'now', label: 'Enlist now — sooner gone, sooner back' },
      { id: 'wall', label: 'Hold to the wall' },
    ],
    resolve: (state, sc, optionId) => {
      const p = state.people[sc.personId];
      if (!p) return {};
      if (optionId === 'now') {
        enlist(state, p, {});
        return { toast: KP.fillPro(KP.displayName(p) + ' enlists this week. The fandom’s countdown flipped from dread to a date within the hour — a date is a thing you can WAIT on. Discharge ' + KP.weekLabel(p.flags.military.until).text + '.', p) };
      }
      return { toast: KP.fillPro('The papers go back in the drawer — {she} works until the wall. The scheduling office circled a birthday two calendars out and did not label it, because everyone knows what it is.', p) };
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return null;
      return { kind: 'company', personId: p.id,
        text: KP.fillPro('The enlistment papers for ' + KP.displayName(p) + ' sat unanswered — which is an answer: {she} works until the wall. The law keeps better calendars than desks do.', p) };
    },
  });

  // ---- the timeline: the send-off and the gate ------------------------
  KP.onFeedEvent('enlisted', (state, n, rng) => {
    const g = n.groupId ? KP.groupById(state, n.groupId) : null;
    const p = n.personId ? state.people[n.personId] : null;
    const name = p ? KP.publicGiven(p) : (g ? g.name : 'him');
    return rng.pick([
      { persona: 'fan', text: name + ' enlistment day. I said I would not cry at a haircut and I was wrong on every count. see you soon. we are not going anywhere. the wait starts NOW and we are going to be so good at it' },
      { persona: 'stan', text: 'the ' + (g ? g.name + ' ' : '') + 'gate photo: the bow, the grin, the peace sign. printing it. framing it. the countdown account has already rebranded to the homecoming account. this fandom does not do despair, it does PROJECTS' },
      { persona: 'casual', text: 'an idol enlisting and the entire fandom pivoting to a two-year group waiting project is genuinely one of the most organized things this country produces' },
    ]);
  });
  KP.onFeedEvent('discharged', (state, n, rng) => {
    const p = n.personId ? state.people[n.personId] : null;
    const name = p ? KP.publicGiven(p) : 'him';
    return rng.pick([
      { persona: 'fan', text: name + ' IS HOME. the salute. the GRIN. two years of quiet and the first photo undid all of it in one frame. I am not crying at a coffee truck. I am absolutely crying at a coffee truck' },
      { persona: 'stan', text: 'discharge day checklist: gate photo ✓ first meal post ✓ “I watched every stage from the base” quote ✓. the wait is OVER. whatever this company announces next better understand what this room has been saving up' },
      { persona: 'casual', text: 'watched a fandom keep a two-year countdown to the minute and meet a man at a military gate with a coffee truck. say what you want, that is devotion with logistics' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
