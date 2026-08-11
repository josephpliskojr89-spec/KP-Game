/* The office door (v0.8.2) — the idols initiate.
   §37's unanimous #1: the game made the idols real and never made the
   player real to them. This module is the answer. Condition-gated,
   voice-true scenes where SHE comes to YOU: the request, the
   confession, the challenge, and the ask — the ambition meeting that
   mints a promise on HER ledger, checked by predicate like every
   promise in this house. Answers write the directed-acts door.
   Pacing law: a knock is memorable, not a mailbox — one open idol
   scene at a time, real cooldowns, and silence has a price. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // how she opens the door, by voice — the option text stays neutral,
  // the personality lives in the opener (content-budget doctrine)
  const OPENERS = {
    blunt: '{She} knocks once and is already sitting down.',
    sunshine: '{She} brings two coffees. One is for you. This is a negotiation tactic and it works.',
    deadpan: '{She} stands in the doorway until you look up, which takes four seconds {she} will never let you forget.',
    gremlin: '{She} has been "walking past" your office for twenty minutes. The fourth pass, you wave {her} in.',
    softspoken: '{She} asks the manager to ask you if you have a minute. You have a minute.',
    earnest: '{She} has notes. {She} apologizes for having notes. {She} uses the notes.',
    wry: '{She} leans on the doorframe like {she} has all day, which you both know {she} does not.',
  };
  function opener(state, p) {
    const base = OPENERS[KP.voiceOf(state, p)] || OPENERS.earnest;
    // standing colors the doorway (v0.8.3): the same knock reads
    // differently from someone who trusts this office — or doesn't
    const st = KP.standingScore(state, p);
    if (st >= 3) return base + ' {She} came to you first, before {pos} manager, before the group chat — which tells you more than the ask will.';
    if (st <= -3) return base + ' {She} almost took this to {pos} manager instead. You can see the decision still sitting in {pos} shoulders.';
    return base;
  }

  // ---- the weekly knock (order 787: after stageDoor, before meeting) ----
  KP.registerWeekly('officeDoor', 787, function (state, rng, inbox, roster, groups) {
    const D = KP.C.DOOR;
    // one open idol scene at a time; the door stays memorable
    const open = (state.scenes || []).some(sc =>
      sc.kind === 'idolAsk' || sc.kind === 'idolDoor' || sc.kind === 'momentChoice');
    if (open) return;
    if (state.week < (state.doorQuietUntil || 0)) return;
    if (!rng.chance(D.knockChance)) return;

    const eligible = [];
    roster.forEach(p => {
      if (p.status === 'released') return;
      if (state.week - (p.flags.doorWeek || -999) < D.personCooldownWeeks) return;
      const g = KP.groupOf(state, p.id);
      // the ASK: the ambition meeting — the one she has rehearsed
      if (p.status === 'idol' && g && g.debuted && !p.flags.ambitionMet &&
          !p.flags.ambitionAsked &&
          state.week - g.debutWeek >= D.askAfterWeeks) {
        eligible.push({ p, kind: 'idolAsk', weight: 4 });
        return;
      }
      // the CONFESSION: the resilient one struggling quietly — the
      // staff scan catches low-resilience girls; the tough ones knock
      if (p.morale < 40 && p.personality.resilience >= 60) {
        eligible.push({ p, kind: 'idolDoor', topic: 'confession', weight: 3 });
        return;
      }
      // the CHALLENGE: she disagrees with the direction, and says so
      if (g && g.concept && p.personality.confidence >= 62 &&
          KP.conceptFit(p, KP.conceptById(g.concept)) < 42) {
        eligible.push({ p, kind: 'idolDoor', topic: 'challenge', weight: 2 });
        return;
      }
      // the REQUEST: running on fumes and asking for the schedule
      if (p.fatigue >= 68 && p.status === 'idol') {
        eligible.push({ p, kind: 'idolDoor', topic: 'breather', weight: 1 });
      }
    });
    if (!eligible.length) return;
    eligible.sort((a, b) => b.weight - a.weight ||
      KP.hash01([state.seed, a.p.id, 'door'].join('|')) - KP.hash01([state.seed, b.p.id, 'door'].join('|')));
    const pick = eligible[0];
    pick.p.flags.doorWeek = state.week;
    state.doorQuietUntil = state.week + KP.C.DOOR.globalCooldownWeeks;
    if (pick.kind === 'idolAsk') pick.p.flags.ambitionAsked = state.week;
    KP.openScene(state, { kind: pick.kind, personId: pick.p.id, topic: pick.topic,
      expiresWeek: state.week + D.expireWeeks });
    inbox.push({ kind: 'development', priority: 'high', personId: pick.p.id,
      text: KP.displayName(pick.p) + ' asked for a minute of your time this week. The door is on the Desk. In this building, a minute is never about a minute.' });
  });

  // ---- the ASK: the ambition meeting ------------------------------------
  KP.registerScene('idolAsk', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'She') + ' · the door';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return '';
      const amb = KP.C.LIFE.AMBITIONS[KP.ambitionOf(state, p)];
      return KP.fillPro(opener(state, p) + ' Then, plainly: {she} wants to know if there is a plan for {her} — ' +
        amb.label + '. {She} has clearly rehearsed asking, which somehow makes it harder to hear.', p);
    },
    options: () => [
      { id: 'promise', label: 'Promise it within the year' },
      { id: 'honest', label: 'Be honest: the group comes first' },
      { id: 'deflect', label: 'We’ll see' },
    ],
    resolve: (state, sc, optionId) => {
      const D = KP.C.DOOR;
      const p = state.people[sc.personId];
      if (!p) return {};
      const amb = KP.ambitionOf(state, p);
      const label = KP.C.LIFE.AMBITIONS[amb].label;
      if (optionId === 'promise') {
        p.morale = KP.clamp(p.morale + D.promiseMorale, 0, 100);
        KP.recordDirected(state, p.id, 'ambitionPromised', 2);
        KP.openClaim(state, { type: 'ambitionPromise', subject: { kind: 'idol', id: p.id },
          personId: p.id, ambition: amb, byWeek: state.week + D.askPromiseWeeks });
        p.history.push({ week: state.week, text: KP.fillPro('The company promised {her} ' + label + ' within the year. {She} wrote the date down.', p) });
        return { toast: KP.fillPro('{She} nodded once, said thank you twice, and left before you could see {pos} face. The date is on ' + KP.pro(p).pos.toUpperCase() + ' calendar now — and {she} keeps {hers}.', p) };
      }
      if (optionId === 'honest') {
        KP.recordDirected(state, p.id, 'honestAnswer', 1);
        p.history.push({ week: state.week, text: 'Asked about ' + label + '; got the honest answer: the group first, for now.' });
        return { toast: KP.fillPro('{She} took the honesty like a professional, which {she} is. On the way out {she} said "okay" in the tone of someone filing it, not dropping it.', p) };
      }
      p.morale = KP.clamp(p.morale + KP.C.DOOR.deflectMorale, 0, 100);
      KP.recordDirected(state, p.id, 'deflected', -2);
      p.history.push({ week: state.week, text: 'Asked about ' + label + '; got "we’ll see."' });
      return { toast: KP.fillPro('“We’ll see.” {She} smiled the smile they teach for music-show losses and closed your door very, very gently.', p) };
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return null;
      p.morale = KP.clamp(p.morale + KP.C.DOOR.expireMorale, 0, 100);
      KP.recordDirected(state, p.id, 'leftWaiting', -2);
      return { kind: 'development', priority: 'high', personId: p.id,
        text: KP.fillPro(KP.displayName(p) + ' stopped asking for that minute. {She} rehearsed the question for weeks. {She} will not rehearse it again soon.', p) };
    },
  });

  // the promise on HER ledger — checked like every promise here
  KP.registerClaim('ambitionPromise', (state, c) => {
    const p = state.people[c.personId];
    if (!p) return { resolved: 'missed', notes: [] };
    if (p.flags.ambitionMet) {
      KP.recordDirected(state, p.id, 'promiseKept', 3);
      return { resolved: 'met',
        notes: [{ kind: 'development', priority: 'high', personId: p.id,
          text: KP.fillPro(KP.displayName(p) + ', in the doorway, not coming in: “You said within the year.” A beat. “Thank you for meaning it.” The staff report {she} kept the sticky note with the date on it.', p) }] };
    }
    if (state.week > c.byWeek) {
      p.morale = KP.clamp(p.morale - 6, 0, 100);
      KP.recordDirected(state, p.id, 'promiseBroken', -4);
      return { resolved: 'missed',
        notes: [{ kind: 'development', priority: 'high', personId: p.id,
          text: KP.fillPro(KP.displayName(p) + ' asked for one minute, and used it for one sentence: “It has been a year since ' +
            KP.weekLabel(c.week).text + '.” {She} was not angry. It would have been easier if {she} were angry.', p) }] };
    }
    return null;
  });

  // ---- the DOOR: request / confession / challenge -----------------------
  const TOPICS = {
    breather: {
      body: (state, p) => KP.fillPro(opener(state, p) + ' {She} is careful about it, but the ask is plain: the schedule is eating {her}, and {she} needs a real week — not a rest chip on a planner, a week.', p),
      options: [
        { id: 'grant', label: 'Clear {pos} week' },
        { id: 'decline', label: 'After the next stage' },
      ],
      resolve: (state, p, optionId) => {
        const D = KP.C.DOOR;
        if (optionId === 'grant') {
          if (state.budget >= D.breatherCost) state.budget -= D.breatherCost;
          p.fatigue = KP.clamp(p.fatigue + D.breatherFatigue, 0, 100);
          p.morale = KP.clamp(p.morale + 3, 0, 100);
          KP.recordDirected(state, p.id, 'breatherGranted', 2);
          p.history.push({ week: state.week, text: 'Asked for a real week off. Got it.' });
          return { toast: KP.fillPro('The schedule got rebuilt around {her}, which cost money and three phone calls. {She} slept fourteen hours the first day. The van is quieter without {her} and everyone hates it.', p) };
        }
        p.morale = KP.clamp(p.morale - 2, 0, 100);
        KP.recordDirected(state, p.id, 'breatherDeclined', -1);
        p.history.push({ week: state.week, text: 'Asked for a week off. Told: after the next stage.' });
        return { toast: KP.fillPro('“After the next stage.” {She} said {she} understood. Understanding and agreeing are different words, and {she} chose {hers} carefully.', p) };
      },
    },
    confession: {
      body: (state, p) => KP.fillPro(opener(state, p) + ' Then it comes out, level and rehearsed: {she} is not okay. Not dramatically. Just — not. {She} wanted you to hear it from {her} before you read it in a number.', p),
      options: [
        { id: 'lighten', label: 'Lighten {pos} load quietly' },
        { id: 'coach', label: 'Set up a talk with the vocal coach' },
        { id: 'push', label: 'The comeback needs {her}' },
      ],
      resolve: (state, p, optionId) => {
        const D = KP.C.DOOR;
        if (optionId === 'lighten') {
          p.fatigue = KP.clamp(p.fatigue - 8, 0, 100);
          p.morale = KP.clamp(p.morale + 4, 0, 100);
          KP.recordDirected(state, p.id, 'listened', 2);
          p.history.push({ week: state.week, text: KP.fillPro('Told the company {she} was struggling. The load got lighter, quietly, no announcement.', p) });
          return { toast: KP.fillPro('Nothing was announced. {Pos} schedule just got — kinder. {She} noticed by Wednesday. The thing about quiet help is that the person you help always knows exactly what it was.', p) };
        }
        if (optionId === 'coach') {
          p.morale = KP.clamp(p.morale + D.coachTalkMorale, 0, 100);
          KP.recordDirected(state, p.id, 'listened', 1);
          p.history.push({ week: state.week, text: KP.fillPro('Told the company {she} was struggling. Got a long talk with the coach who has seen everything.', p) });
          return { toast: KP.fillPro('The vocal coach took {her} for kalguksu and told {her} about three famous careers that nearly ended at nineteen. {She} came back with red eyes and better posture.', p) };
        }
        p.morale = KP.clamp(p.morale + D.pushThroughMorale, 0, 100);
        KP.recordDirected(state, p.id, 'pushedThrough', -2);
        p.history.push({ week: state.week, text: KP.fillPro('Told the company {she} was struggling. Was told the comeback needs {her}.', p) });
        return { toast: KP.fillPro('“The comeback needs you.” {She} nodded, because it is true, and left, because there was nothing else to say. Some true things cost more than false ones.', p) };
      },
    },
    challenge: {
      body: (state, p) => {
        const g = KP.groupOf(state, p.id);
        const c = g && g.concept ? KP.conceptById(g.concept).label : 'the direction';
        return KP.fillPro(opener(state, p) + ' {She} has opinions about ' + c.toLowerCase() +
          ' — specifically that it fits the group and does not fit ' + KP.pro(p).her.toUpperCase() + ', and {she} can name the exact bars where it shows. {She} is not wrong, which is the inconvenient part.', p);
      },
      options: [
        { id: 'retool', label: 'Send the producers back in with {pos} notes' },
        { id: 'hold', label: 'Hold the direction' },
      ],
      resolve: (state, p, optionId) => {
        const g = KP.groupOf(state, p.id);
        if (optionId === 'retool') {
          if (g && !g.prep) g.demos = null;   // the next pitch meeting starts over, with her notes in the room
          p.morale = KP.clamp(p.morale + 4, 0, 100);
          KP.recordDirected(state, p.id, 'heardOut', 2);
          p.history.push({ week: state.week, text: KP.fillPro('Challenged the creative direction to the CEO’s face. The producers got {pos} notes.', p) });
          return { toast: KP.fillPro('The producers got a page of {pos} notes with the next brief. Two of them are annoyed. The good one is intrigued. The next pitch meeting will be better for it.', p) };
        }
        p.morale = KP.clamp(p.morale - 2, 0, 100);
        KP.recordDirected(state, p.id, 'overruled', -1);
        p.history.push({ week: state.week, text: 'Challenged the creative direction. The company held the line.' });
        return { toast: KP.fillPro('You held the line — identity is a long game and the lane is working. {She} accepted it like a pro. {She} will also, quietly, keep the notes.', p) };
      },
    },
  };

  KP.registerScene('idolDoor', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'She') + ' · the door';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      return p ? TOPICS[sc.topic].body(state, p) : '';
    },
    options: (state, sc) => {
      const p = state.people[sc.personId] || null;
      return TOPICS[sc.topic].options.map(o => ({ id: o.id, label: KP.fillPro(o.label, p) }));
    },
    resolve: (state, sc, optionId) => {
      const p = state.people[sc.personId];
      return p ? TOPICS[sc.topic].resolve(state, p, optionId) : {};
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return null;
      p.morale = KP.clamp(p.morale + KP.C.DOOR.expireMorale, 0, 100);
      KP.recordDirected(state, p.id, 'leftWaiting', -2);
      return { kind: 'development', priority: 'high', personId: p.id,
        text: KP.fillPro(KP.displayName(p) + ' waited for that minute all week, then stopped waiting. {She} is fine. That word is doing a lot of work and everyone in the building knows it.', p) };
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
