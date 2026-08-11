/* The people (v0.7.4) — personalities you feel every single week.
   Owner: "give the idols real personalities. I want to feel their
   existence every single week." The stats existed; this makes them
   BREATHE: a stable VOICE derived from who she is, a weekly MOOD
   read off her real numbers, and a rotating spotlight that turns
   state into small specific scenes — same event, different person,
   different words. Effects stay tiny; this is presence, not power. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // ---- the voice: how she talks, forever --------------------------------
  KP.VOICES = {
    blunt:      { label: 'says exactly what she thinks, at any volume' },
    sunshine:   { label: 'talks like the room is already her friend' },
    deadpan:    { label: 'delivers everything at one perfect flat pitch' },
    gremlin:    { label: 'is three jokes deep before anyone catches the first' },
    softspoken: { label: 'speaks quietly and means every word of it' },
    earnest:    { label: 'answers every question like it matters, because to her it does' },
    wry:        { label: 'has a raised eyebrow where other people keep opinions' },
  };
  KP.voiceOf = function (state, p) {
    const t = p.personality;
    if (t.dominance >= 68 && t.confidence >= 60) return 'blunt';
    if (t.warmth >= 68 && t.confidence >= 55) return 'sunshine';
    if (t.professionalism >= 65 && t.warmth < 50) return 'deadpan';
    if (t.creativity >= 65 && t.professionalism < 55) return 'gremlin';
    if (t.dominance < 42 && t.warmth >= 55) return 'softspoken';
    if (t.workEthic >= 65 && t.coachability >= 55) return 'earnest';
    const keys = Object.keys(KP.VOICES);
    return keys[Math.floor(KP.hash01([state.seed, p.id, 'voice'].join('|')) * keys.length)];
  };

  // ---- the mood: her week, in one honest word (derived, never stored) ---
  KP.moodOf = function (p) {
    if (p.flags.burnout > 0) return 'benched';
    if (p.fatigue >= 75) return 'running on fumes';
    if (p.flags.scar > 0) return 'carrying it';
    if (p.morale >= 72 && p.fatigue < 50) return 'glowing';
    if (p.morale < 38) return 'quietly off';
    if (p.fatigue >= 55) return 'worn';
    return 'steady';
  };

  // ---- the spotlight: one or two lives per week, up close ---------------
  // Moments are condition-gated readers of REAL state. The spotlight
  // hash-rotates through the roster so everyone's week eventually
  // reaches the desk.
  const MOMENTS = [
    { key: 'quietWeek', priority: 'high', when: (s, p) => p.morale < 38 && p.personality.resilience < 50,
      text: (s, p) => KP.displayName(p) + ' has been quieter than usual this week — earlier to the van, earlier to her room. The staff mention it carefully, the way you carry something breakable. Worth a look before it becomes a number.' },
    { key: 'afterHours', when: (s, p) => p.fatigue > 55 && p.personality.workEthic >= 65,
      text: (s, p) => 'Security logged ' + KP.displayName(p) + ' out of the practice building at 1am again. Nobody scheduled that. ' + (KP.voiceOf(s, p) === 'earnest' ? '“The chorus wasn’t right yet,” she said, like that settles it. For her it does.' : 'She shrugged it off in one sentence and slept in the van.') },
    { key: 'competitiveSting', when: (s, p) => {
        const g = KP.groupOf(s, p.id);
        return g && g.results && g.results.battle && !g.results.battle.won &&
          s.week - (g.lastReleaseWeek || 0) <= 4 && p.personality.competitiveness >= 65;
      },
      effect: (s, p) => { p.morale = KP.clamp(p.morale - 1, 0, 100); },
      text: (s, p) => { const g = KP.groupOf(s, p.id);
        return KP.displayName(p) + ' has rewatched the ' + (g.results.battle.actName) + ' stages from the shared week three times, taking notes nobody asked her to take. Losing sits badly with her. That is not entirely a flaw.'; } },
    { key: 'warmthGlue', when: (s, p) => {
        if (p.personality.warmth < 68) return false;
        const g = KP.groupOf(s, p.id);
        if (!g) return false;
        return KP.frictionPairs(s, g.members).some(f => f.state === 'tense' || f.state === 'conflict');
      },
      effect: (s, p) => {
        const g = KP.groupOf(s, p.id);
        const pair = KP.frictionPairs(s, g.members).find(f => f.state === 'tense' || f.state === 'conflict');
        if (pair) {
          const rel = (s.relationships || {})[KP.pairKey(pair.a, pair.b)];
          if (rel) rel.score = KP.clamp(rel.score + 2, -100, 100);
        }
      },
      text: (s, p) => KP.displayName(p) + ' noticed the cold air in the dorm before anyone said anything, and quietly engineered a late-night food run with exactly the right two people in the back seat. Nothing was discussed. Something was fixed anyway, a little.' },
    { key: 'leaderCarry', when: (s, p) => {
        const g = KP.groupOf(s, p.id);
        return g && g.roles && g.roles.leader === p.id && p.personality.leadership >= 60 &&
          g.members.some(id => (s.people[id] || {}).fatigue >= 70);
      },
      text: (s, p) => { const g = KP.groupOf(s, p.id);
        const tired = s.people[g.members.find(id => s.people[id].fatigue >= 70)];
        return KP.displayName(p) + ' rearranged the van seating so ' + (tired ? KP.publicGiven(tired) : 'the tired one') + ' gets the window and the extra twenty minutes of sleep, then took the early interviews herself. Nobody upstairs will ever see this work. It is the job anyway.'; } },
    { key: 'ambitionGlimpse', when: (s, p) => p.status === 'idol' && !p.flags.ambitionMet,
      public: true,
      text: (s, p) => {
        const amb = KP.ambitionOf(s, p);
        const lines = {
          solo: KP.displayName(p) + ' stayed at the company alone on her day off, working on something on the practice-room piano. She closed the lid when staff came in. Everyone knows anyway.',
          trophy: KP.displayName(p) + ' watches other groups’ win announcements the way scholars read primary sources. She thinks nobody has noticed the folder of encore speeches. Everyone has noticed the folder.',
          stage: KP.displayName(p) + ' asked the tour manager, casually, what the biggest venue in ' + KP.regionLabel(KP.strongholdsOf(s, p)[0]) + ' is called. Then she looked it up herself. Then she saved the photo.',
          variety: KP.displayName(p) + ' rehearses variety-show reaction timing in the dorm mirror. Her roommate confirmed it. Her roommate was sworn to secrecy. Her roommate lasted one day.',
        };
        return lines[amb] || lines.trophy;
      } },
    { key: 'friendScene', when: (s, p) => {
        const g = KP.groupOf(s, p.id);
        if (!g) return false;
        return g.members.some(id => {
          if (id === p.id) return false;
          const rel = (s.relationships || {})[KP.pairKey(p, s.people[id])];
          return rel && rel.state === 'close';
        });
      },
      public: true,
      text: (s, p) => {
        const g = KP.groupOf(s, p.id);
        const friendId = g.members.find(id => {
          if (id === p.id) return false;
          const rel = (s.relationships || {})[KP.pairKey(p, s.people[id])];
          return rel && rel.state === 'close';
        });
        const f = s.people[friendId];
        const fact = KP.factsOf(s, p)[0];
        return KP.displayName(p) + ' — who ' + fact + ' — dragged ' + KP.publicGiven(f) +
          ' into it at 2am, and the staff group chat has photos. Some friendships are the actual product. This is one.';
      } },
    { key: 'voiceMoment', when: () => true, public: true,
      text: (s, p) => {
        const v = KP.voiceOf(s, p);
        if (p.status !== 'idol') {
          const tr = {
            blunt: KP.displayName(p) + ' told the vocal coach, mid-evaluation, exactly which key change was not working. She was right, which is the only reason the room survived it.',
            sunshine: KP.displayName(p) + ' knows the building’s cleaning crew by name and leaves the practice room spotless with a thank-you note taped to the mirror. The facilities staff have unofficially adopted her.',
            deadpan: KP.displayName(p) + ' answered the monthly evaluation question “what is your dream?” with “Tuesday off,” at her usual flat pitch. The panel wrote down “grounded.”',
            gremlin: KP.displayName(p) + ' set the practice-room speaker to play trot at full volume when the lights come on. Three days of investigation found nothing. She sat on the investigating committee.',
            softspoken: KP.displayName(p) + ' stayed behind to walk a homesick younger trainee through the choreography at half volume until it stuck. Neither of them has mentioned it to anyone.',
            earnest: KP.displayName(p) + ' keeps a notebook of every correction any coach has ever given her, indexed by month. The coaches have started checking their own notes against it.',
            wry: KP.displayName(p) + ' listened to the new evaluation rubric in complete silence and asked one question that sent it back for a second draft.',
          };
          return tr[v];
        }
        const m = {
          blunt: KP.displayName(p) + ' was asked a polite filler question in a radio pre-interview and answered it honestly, at length, with numbers. The host is still recovering. The clip is doing well.',
          sunshine: KP.displayName(p) + ' learned every staffer’s coffee order this month, including the new intern nobody introduces. The building runs two degrees warmer when she is in it.',
          deadpan: KP.displayName(p) + ' delivered a flawless joke in a fan call at her signature flat pitch, waited out the three-second delay, and moved on before the laugh landed. The compilation channels feast.',
          gremlin: KP.displayName(p) + ' has been hiding a rubber duck in a different member’s bag every day this week. No one has caught her. She has photos of all of it. The reveal is being saved for something.',
          softspoken: KP.displayName(p) + ' said maybe eleven words at the team dinner, and two of them fixed an argument nobody knew how to end. The room went quiet in the good way.',
          earnest: KP.displayName(p) + ' wrote thank-you notes to the session musicians from the last record. By hand. They have started asking to be booked on her songs specifically.',
          wry: KP.displayName(p) + ' watched the marketing meeting propose a concept in complete silence, raised one eyebrow at the exactly correct moment, and the deck was revised by Friday.',
        };
        return m[v];
      } },
  ];

  // ---- the choices (v0.8.2): some moments put the call on YOUR desk ----
  // The critic's finding: a spotlight that provably never matters gets
  // skimmed, and a skimmed person is an attribute set with better
  // prose. The three moments that already carried effects now carry a
  // decision instead — resolve it and the effect is yours; let it
  // expire and the week resolves the old way without you.
  const CHOICES = {
    competitiveSting: {
      options: [{ id: 'fuel', label: 'Let it fuel her' }, { id: 'coach', label: 'Send the vocal coach over' }],
      resolve: (state, p, optionId) => {
        const D = KP.C.DOOR;
        if (optionId === 'coach') {
          if (state.budget >= D.coachOverCost) state.budget -= D.coachOverCost;
          p.morale = KP.clamp(p.morale + D.coachOverMorale, 0, 100);
          KP.recordDirected(state, p.id, 'stingCoached', 1);
          return { toast: 'The vocal coach "happened to be passing" the practice room at 11pm. They broke the rival stage down bar by bar until it stopped being a wound and became homework.' };
        }
        p.morale = KP.clamp(p.morale - 1, 0, 100);
        KP.recordDirected(state, p.id, 'stingRespected', 1);
        return { toast: 'You let her burn on it. Some engines run on exactly this fuel, and she is one of them — the notes she is taking nobody asked for are getting sharper.' };
      },
      expire: (state, p) => { p.morale = KP.clamp(p.morale - 1, 0, 100); },
    },
    warmthGlue: {
      options: [{ id: 'quiet', label: 'Let her handle it her way' }, { id: 'shuffle', label: 'Make it official — reshuffle the rooms' }],
      resolve: (state, p, optionId) => {
        const g = KP.groupOf(state, p.id);
        const applyGlue = () => {
          if (!g) return;
          const pair = KP.frictionPairs(state, g.members).find(f => f.state === 'tense' || f.state === 'conflict');
          if (pair) {
            const rel = (state.relationships || {})[KP.pairKey(pair.a, pair.b)];
            if (rel) rel.score = KP.clamp(rel.score + 2, -100, 100);
          }
        };
        if (optionId === 'shuffle' && g) {
          const r = KP.shuffleRooms(state, g.id);
          if (!r.ok) { applyGlue(); KP.recordDirected(state, p.id, 'glueSeen', 1);
            return { toast: r.reason + ' Her food-run diplomacy carries the week instead — and you saw it.' }; }
          applyGlue();
          KP.recordDirected(state, p.id, 'glueSeen', 1);
          return { toast: 'The room chart changed the same week she was quietly fixing things by hand. Between her food runs and your furniture, the cold air is losing.' };
        }
        applyGlue();
        KP.recordDirected(state, p.id, 'glueSeen', 1);
        return { toast: 'You let her work. The staff know exactly who is holding that room together, and now the file says you know too.' };
      },
      expire: (state, p) => {
        const g = KP.groupOf(state, p.id);
        if (!g) return;
        const pair = KP.frictionPairs(state, g.members).find(f => f.state === 'tense' || f.state === 'conflict');
        if (pair) {
          const rel = (state.relationships || {})[KP.pairKey(pair.a, pair.b)];
          if (rel) rel.score = KP.clamp(rel.score + 2, -100, 100);
        }
      },
    },
    leaderCarry: {
      options: [{ id: 'restday', label: 'Give the leader a rest day too' }, { id: 'file', label: 'Put it in her file' }],
      resolve: (state, p, optionId) => {
        const D = KP.C.DOOR;
        if (optionId === 'restday') {
          if (state.budget >= D.restDayCost) state.budget -= D.restDayCost;
          p.fatigue = KP.clamp(p.fatigue + D.restDayFatigue, 0, 100);
          KP.recordDirected(state, p.id, 'carrySeen', 2);
          return { toast: 'Somebody rearranged the van seating so SHE gets the window this time. She pretended not to notice who ordered it. She noticed.' };
        }
        KP.recordDirected(state, p.id, 'carrySeen', 1);
        p.history.push({ week: state.week, text: 'Carried the group through a tired week. The company put it on the record.' });
        return { toast: 'It went in her file, in writing, where renewal negotiations live. Invisible work stops being invisible the day someone writes it down.' };
      },
      expire: () => {},
    },
  };

  KP.registerScene('momentChoice', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'She') + ' · this week';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      const m = MOMENTS.find(x => x.key === sc.momentKey);
      return p && m ? m.text(state, p) + ' The call is yours.' : '';
    },
    options: (state, sc) => CHOICES[sc.momentKey].options,
    resolve: (state, sc, optionId) => {
      const p = state.people[sc.personId];
      return p ? CHOICES[sc.momentKey].resolve(state, p, optionId) : {};
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return null;
      CHOICES[sc.momentKey].expire(state, p);
      return { kind: 'development', moment: sc.momentKey, priority: 'normal', personId: p.id,
        text: 'The week moved on before you weighed in — ' + KP.displayName(p) + '’s moment resolved itself the way these things do when the office stays quiet.' };
    },
  });

  // ---- the pressure read (v0.8.2): the spotlight follows the fire -------
  // Round-robin coverage was metronomic fairness; lives that are
  // actually on fire kept waiting their turn. Score the roster by
  // drama pressure and follow the top of it; the rota stays as the
  // boredom fallback so quiet stretches still give everyone a week.
  function pressureOf(state, p) {
    let s = 0;
    if (p.morale < 42) s += (42 - p.morale) / 6;
    if (p.fatigue >= 58) s += (p.fatigue - 58) / 11;
    const g = KP.groupOf(state, p.id);
    if (g && g.results && g.results.battle && !g.results.battle.won &&
        state.week - (g.lastReleaseWeek || 0) <= 4) s += 2;
    if (p.status === 'idol' && !p.flags.ambitionMet && g && g.debuted &&
        state.week - g.debutWeek >= 40) s += 1;
    if (g && p.personality.warmth >= 68 &&
        KP.frictionPairs(state, g.members).some(f => f.state === 'tense' || f.state === 'conflict')) s += 2;
    return s;
  }

  KP.registerWeekly('personhood', 856, function (state, rng, inbox, roster, groups) {
    if (!roster.length) return;
    const count = roster.length > 6 ? 2 : 1;
    // pressure first: whoever's life is on fire, recent features excluded
    const fresh = roster.filter(p => p && p.status !== 'released' &&
      state.week - (p.flags.spotWeek || -99) >= 4);
    const byPressure = fresh
      .map(p => ({ p, s: pressureOf(state, p) }))
      .filter(x => x.s >= 1.5)
      .sort((a, b) => b.s - a.s ||
        KP.hash01([state.seed, a.p.id, state.week].join('|')) - KP.hash01([state.seed, b.p.id, state.week].join('|')));
    const picks = byPressure.slice(0, count).map(x => x.p);
    // the rota fills the quiet weeks — everyone still gets her turn
    for (let k = 0; picks.length < count && k < roster.length; k++) {
      const p = roster[(state.week * count + k) % roster.length];
      if (p && p.status !== 'released' && !picks.includes(p) &&
          state.week - (p.flags.spotWeek || -99) >= 4) picks.push(p);
    }
    picks.forEach(p => {
      p.flags.spotWeek = state.week;
      const ROT = MOMENTS.slice(1);   // quietWeek belongs to the staff scan below
      const offset = Math.floor(KP.hash01([state.seed, p.id, state.week, 'moment'].join('|')) * ROT.length);
      for (let i = 0; i < ROT.length; i++) {
        const pick = ROT[(offset + i) % ROT.length];
        if (!pick.when(state, p)) continue;
        // a moment with a CHOICE goes to the desk as a held scene — one
        // at a time, so the desk never becomes a form to clear
        if (CHOICES[pick.key] &&
            !(state.scenes || []).some(sc => sc.kind === 'momentChoice')) {
          KP.openScene(state, { kind: 'momentChoice', momentKey: pick.key,
            personId: p.id, expiresWeek: state.week + 2 });
          inbox.push({ kind: 'development', moment: pick.key, choice: true,
            priority: 'high', personId: p.id,
            text: pick.text(state, p) + ' The call is on the Desk.' });
          break;
        }
        if (pick.effect) pick.effect(state, p);
        // only debuted idols echo on the public timeline — a trainee's
        // week stays a desk note. Priority 'high': the spotlight IS the
        // mandate — at any lower priority a loud comeback week trims
        // the person right back out of the game. Capped at 1–2 weekly
        // by construction, so it cannot flood.
        inbox.push({ kind: 'development', moment: pick.key,
          ind: (pick.public && p.status === 'idol') ? 'personMoment' : undefined,
          priority: pick.priority || 'high', personId: p.id,
          text: pick.text(state, p) });
        break;
      }
    });

    // going quiet is not a rotation event — the staff flag whoever is
    // doing worst, whoever the spotlight is on this week. One person
    // per week, with a cooldown so concern reads as concern, not
    // nagging. Priority 'high': "worth a look before it becomes a
    // number" is a warning, and warnings survive the trim.
    const quiet = MOMENTS[0];
    const flagged = roster
      .filter(p => p.status !== 'released' && quiet.when(state, p) &&
        state.week - (p.flags.quietFlagged || -99) >= 10)
      .sort((a, b) => a.morale - b.morale)[0];
    if (flagged) {
      flagged.flags.quietFlagged = state.week;
      inbox.push({ kind: 'development', moment: 'quietWeek', priority: 'high',
        personId: flagged.id, text: quiet.text(state, flagged) });
    }
  });

  // public moments echo on the timeline through the kernel registry
  KP.onFeedEvent('personMoment', (state, n, rng) => {
    const p = state.people[n.personId];
    if (!p) return null;
    return rng.pick([
      { persona: 'fan', text: 'the ' + KP.displayName(p) + ' story from this week’s staff-adjacent accounts… she is exactly who we thought she was and BETTER. protect this one' },
      { persona: 'casual', text: 'every week I learn one (1) new fact about ' + KP.displayName(p) + ' and every week it improves my quality of life measurably' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
