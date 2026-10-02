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

  // ---- the knock: candidates for the one door (v0.10.30, §89 D1) --------
  // The ASK (the ambition meeting she rehearsed) and the CHALLENGE (she
  // disagrees with the direction and says so). The request and the
  // confession folded into the frictions — the extra hour's drained
  // variant and the quiet no — where the same question already lived.
  KP.registerKnock('door', ['idolAsk', 'idolDoor'], function (state) {
    const D = KP.C.DOOR;
    const out = [];
    state.roster.forEach(id => {
      const p = state.people[id];
      if (!p || (p.status !== 'trainee' && p.status !== 'idol')) return;
      const g = KP.groupOf(state, p.id);
      if (p.status === 'idol' && g && g.debuted && !p.flags.ambitionMet &&
          !p.flags.ambitionAsked && state.week - g.debutWeek >= D.askAfterWeeks) {
        out.push({ kind: 'idolAsk', personId: p.id, weight: 4, expiresIn: D.expireWeeks,
          onPick: (st) => { st.people[p.id].flags.ambitionAsked = st.week; } });
        return;
      }
      if (g && g.concept && p.personality.confidence >= 62 &&
          state.week - (p.flags.challengeWeek || -999) >= 40 &&
          KP.conceptFit(p, KP.conceptById(g.concept)) < 42) {
        out.push({ kind: 'idolDoor', topic: 'challenge', personId: p.id, weight: 2, expiresIn: D.expireWeeks,
          onPick: (st) => { st.people[p.id].flags.challengeWeek = st.week; } });
      }
    });
    return out;
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
        KP.recordDirected(state, p.id, 'ambitionPromised');
        // the solo ask is ONE promise (v0.10.30, §89 D2): the door, the
        // knock and the Monday meeting all mint the same claim, and one
        // solo credit pays it out once
        if (amb === 'solo') {
          const already = (state.claims || []).some(c => !c.resolved &&
            c.type === 'soloPromise' && c.personId === p.id);
          if (!already) KP.openClaim(state, { type: 'soloPromise', subject: { kind: 'idol', id: p.id },
            personId: p.id, byWeek: state.week + D.askPromiseWeeks,
            label: 'A solo for ' + KP.displayName(p) + ' — promised at the door' });
        } else {
          KP.openClaim(state, { type: 'ambitionPromise', subject: { kind: 'idol', id: p.id },
            personId: p.id, ambition: amb, byWeek: state.week + D.askPromiseWeeks });
        }
        p.history.push({ week: state.week, text: KP.fillPro('The company promised {her} ' + label + ' within the year. {She} wrote the date down.', p) });
        return { toast: KP.fillPro('{She} nodded once, said thank you twice, and left before you could see {pos} face. The date is on ' + KP.pro(p).pos.toUpperCase() + ' calendar now — and {she} keeps {hers}.', p) };
      }
      if (optionId === 'honest') {
        KP.recordDirected(state, p.id, 'honestAnswer');
        p.history.push({ week: state.week, text: 'Asked about ' + label + '; got the honest answer: the group first, for now.' });
        return { toast: KP.fillPro('{She} took the honesty like a professional, which {she} is. On the way out {she} said "okay" in the tone of someone filing it, not dropping it.', p) };
      }
      p.morale = KP.clamp(p.morale + KP.C.DOOR.deflectMorale, 0, 100);
      KP.recordDirected(state, p.id, 'deflected');
      p.history.push({ week: state.week, text: 'Asked about ' + label + '; got "we’ll see."' });
      return { toast: KP.fillPro('“We’ll see.” {She} smiled the smile they teach for music-show losses and closed your door very, very gently.', p) };
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return null;
      p.morale = KP.clamp(p.morale + KP.C.DOOR.expireMorale, 0, 100);
      KP.recordDirected(state, p.id, 'leftWaiting');
      return { kind: 'development', priority: 'high', personId: p.id,
        text: KP.fillPro(KP.displayName(p) + ' stopped asking for that minute. {She} rehearsed the question for weeks. {She} will not rehearse it again soon.', p) };
    },
  });

  // the promise on HER ledger — checked like every promise here
  KP.registerClaim('ambitionPromise', (state, c) => {
    const p = state.people[c.personId];
    if (!p) return { resolved: 'missed', notes: [] };
    if (p.flags.ambitionMet) {
      KP.recordDirected(state, p.id, 'promiseKept');
      return { resolved: 'met',
        notes: [{ kind: 'development', priority: 'high', personId: p.id,
          text: KP.fillPro(KP.displayName(p) + ', in the doorway, not coming in: “You said within the year.” A beat. “Thank you for meaning it.” The staff report {she} kept the sticky note with the date on it.', p) }] };
    }
    if (state.week > c.byWeek) {
      p.morale = KP.clamp(p.morale - 6, 0, 100);
      KP.recordDirected(state, p.id, 'promiseBroken');
      return { resolved: 'missed',
        notes: [{ kind: 'development', priority: 'high', personId: p.id,
          text: KP.fillPro(KP.displayName(p) + ' asked for one minute, and used it for one sentence: “It has been a year since ' +
            KP.weekLabel(c.week).text + '.” {She} was not angry. It would have been easier if {she} were angry.', p) }] };
    }
    return null;
  });

  // ---- the DOOR: request / confession / challenge -----------------------
  // the request and the confession folded into the frictions (v0.10.30)
  const TOPICS = {
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
          KP.recordDirected(state, p.id, 'heardOut');
          p.history.push({ week: state.week, text: KP.fillPro('Challenged the creative direction to the CEO’s face. The producers got {pos} notes.', p) });
          return { toast: KP.fillPro('The producers got a page of {pos} notes with the next brief. Two of them are annoyed. The good one is intrigued. The next pitch meeting will be better for it.', p) };
        }
        p.morale = KP.clamp(p.morale - 2, 0, 100);
        KP.recordDirected(state, p.id, 'overruled');
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
      return p ? (TOPICS[sc.topic] || TOPICS.challenge).body(state, p) : '';
    },
    options: (state, sc) => {
      const p = state.people[sc.personId] || null;
      return (TOPICS[sc.topic] || TOPICS.challenge).options.map(o => ({ id: o.id, label: KP.fillPro(o.label, p) }));
    },
    resolve: (state, sc, optionId) => {
      const p = state.people[sc.personId];
      return p ? (TOPICS[sc.topic] || TOPICS.challenge).resolve(state, p, optionId) : {};
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return null;
      p.morale = KP.clamp(p.morale + KP.C.DOOR.expireMorale, 0, 100);
      KP.recordDirected(state, p.id, 'leftWaiting');
      return { kind: 'development', priority: 'high', personId: p.id,
        text: KP.fillPro(KP.displayName(p) + ' waited for that minute all week, then stopped waiting. {She} is fine. That word is doing a lot of work and everyone in the building knows it.', p) };
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
