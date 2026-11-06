/* The pair (v0.10.40, §88 D) — two-person content, playable. The
   relationships exist; this makes them the subject of choices. THE
   MENTORSHIP: assign the warm veteran to the struggling rookie — she
   trains faster, the pair warms, both files remember. THE WRITING
   PAIR: two members who write, paired; the next record one of them
   pens is co-written, the booklet names both, the bond is real. THE
   SEATING CHART: a feuding pair kept apart — fan signs and blocking
   with a body between them — cools faster, draws the distance watch
   less, and makes the sit-down likelier. THE RIVALRY INSIDE THE GROUP,
   FRAMED: competition sharpens both while morale holds; when it slips,
   the room sours. Verbs land on the group page; consequences ride the
   rails that already exist (relationships, badblood, credits, evals,
   development). */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};
  const P = () => KP.C.PAIR;

  function ledger(state) {
    state.pairLedger = state.pairLedger ||
      { mentorships: 0, mentorEnded: 0, writingPairs: 0, coWritten: 0, seatings: 0, framed: 0, soured: 0, edged: 0 };
    return state.pairLedger;
  }
  KP.pairLedger = ledger;
  function relOf(state, a, b) {
    return (state.relationships || {})[KP.pairKey(a, b)] || null;
  }
  function roomOf(state, g) {
    return g.members.map(id => state.people[id]).filter(m => m && m.status !== 'released');
  }

  // ---- the mentorship -----------------------------------------------------
  // the rookie: struggling (morale under the bar, or sliding on the sheet);
  // the veteran: warm, and ahead of her — live reps or years
  function sliding(p) {
    const h = p.evalHistory || [];
    return h.length >= 2 && h[h.length - 1].rank > h[h.length - 2].rank;
  }
  function lead(mentor, mentee) {
    return (mentor.liveExp || 0) - (mentee.liveExp || 0) + ((mentor.age || 0) - (mentee.age || 0)) * 6;
  }
  KP.mentorshipRead = function (state, groupId) {
    const C = P();
    const g = KP.groupById(state, groupId);
    if (!g) return { ok: false, reason: 'No such group.' };
    if (g.mentorship && state.week < g.mentorship.until) {
      const m = state.people[g.mentorship.mentor], r = state.people[g.mentorship.mentee];
      return { ok: false, active: g.mentorship, reason: (m && r ? KP.displayName(m) + ' is bringing ' + KP.publicGiven(r) + ' along' : 'A mentorship is running') + ' — ' + (g.mentorship.until - state.week) + ' weeks left.' };
    }
    const room = roomOf(state, g).filter(m => !KP.onBreak(m));
    if (room.length < 2) return { ok: false, reason: 'A mentorship needs two people in the room.' };
    const rookies = room.filter(m => (m.morale < C.menteeMorale || sliding(m)) &&
      state.week - (m.flags.mentoredUntil || -999) >= C.mentorCooldown);
    if (!rookies.length) return { ok: false, reason: 'Nobody in the room is struggling enough to need a hand — or the last hand was recent.' };
    const mentee = rookies.slice().sort((a, b) => a.morale - b.morale)[0];
    const mentors = room.filter(m => m.id !== mentee.id && m.personality.warmth >= C.mentorWarmth && lead(m, mentee) >= C.mentorLead);
    if (!mentors.length) return { ok: false, reason: KP.fillPro('No warm veteran stands far enough ahead of ' + KP.publicGiven(mentee) + ' to bring {her} along.', mentee) };
    const mentor = mentors.slice().sort((a, b) => lead(b, mentee) - lead(a, mentee) || b.personality.warmth - a.personality.warmth)[0];
    return { ok: true, mentor, mentee, cost: C.cost,
      reason: KP.publicGiven(mentee) + (mentee.morale < C.menteeMorale ? ' is low' : ' is sliding on the sheet') + '; ' + KP.displayName(mentor) + ' is warm and ahead.' };
  };
  KP.assignMentor = function (state, groupId, mentorId, menteeId) {
    const C = P();
    const g = KP.groupById(state, groupId);
    if (!g) return { ok: false, reason: 'No such group.' };
    const mentor = state.people[mentorId], mentee = state.people[menteeId];
    if (!mentor || !mentee || !g.members.includes(mentorId) || !g.members.includes(menteeId) || mentorId === menteeId) {
      return { ok: false, reason: 'Both of them have to be in this lineup.' };
    }
    if (g.mentorship && state.week < g.mentorship.until) return { ok: false, reason: 'A mentorship is already running in this room.' };
    if (mentor.personality.warmth < C.mentorWarmth) return { ok: false, reason: KP.displayName(mentor) + ' is not the warm one. A mentorship needs warmth before it needs seniority.' };
    if (lead(mentor, mentee) < C.mentorLead) return { ok: false, reason: 'They are peers. A mentor has to stand somewhere ahead.' };
    if (state.week - (mentee.flags.mentoredUntil || -999) < C.mentorCooldown) return { ok: false, reason: KP.fillPro('{She} was just brought along. Another hand this soon reads as a message.', mentee) };
    if (state.budget < C.cost) return { ok: false, reason: 'Staff time bills ' + C.cost + '. The account says no.' };
    state.budget -= C.cost;
    if (KP.ledgerFlow) KP.ledgerFlow(state, 'signings', -C.cost);
    g.mentorship = { mentor: mentorId, mentee: menteeId, since: state.week, until: state.week + C.mentorWeeks,
      moraleAt: mentee.morale };
    mentee.flags.mentoredBy = mentorId;
    KP.recordDirected(state, menteeId, 'mentored');
    KP.recordDirected(state, mentorId, 'trustedToMentor');
    mentee.history.push({ week: state.week, text: KP.fillPro(KP.displayName(mentor) + ' was asked to bring {her} along — practice-room hours, the ride home, the questions nobody else answers.', mentee) });
    mentor.history.push({ week: state.week, text: KP.fillPro('Asked to mentor ' + KP.publicGiven(mentee) + '. {She} said yes before the sentence ended.', mentor) });
    ledger(state).mentorships++;
    return { ok: true, note: KP.fillPro(KP.displayName(mentor) + ' takes ' + KP.publicGiven(mentee) + ' under {pos} wing — ' + C.mentorWeeks + ' weeks of hours nobody bills.', mentor) };
  };

  // ---- the writing pair ----------------------------------------------------
  KP.writingPairRead = function (state, groupId) {
    const g = KP.groupById(state, groupId);
    if (!g) return { ok: false, reason: 'No such group.' };
    if (g.writingPair) {
      const a = state.people[g.writingPair.a], b = state.people[g.writingPair.b];
      return { ok: false, active: g.writingPair, reason: (a && b ? KP.publicGiven(a) + ' and ' + KP.publicGiven(b) + ' write together.' : 'A writing pair stands.') };
    }
    const writers = roomOf(state, g).filter(m => KP.canWrite(m));
    if (writers.length < 2) return { ok: false, reason: writers.length ? 'Only ' + KP.publicGiven(writers[0]) + ' writes. A pair needs two pens.' : 'Nobody in this room writes yet.' };
    let best = null;
    for (let i = 0; i < writers.length; i++) {
      for (let j = i + 1; j < writers.length; j++) {
        const rel = relOf(state, writers[i], writers[j]);
        const score = rel ? rel.score : 0;
        if (!best || score > best.score) best = { a: writers[i], b: writers[j], score };
      }
    }
    return { ok: true, a: best.a, b: best.b, cost: P().cost,
      reason: KP.publicGiven(best.a) + ' and ' + KP.publicGiven(best.b) + ' both write' + (best.score >= 25 ? ', and already get along.' : '.') };
  };
  KP.pairWriters = function (state, groupId, aId, bId) {
    const g = KP.groupById(state, groupId);
    if (!g) return { ok: false, reason: 'No such group.' };
    const a = state.people[aId], b = state.people[bId];
    if (!a || !b || !g.members.includes(aId) || !g.members.includes(bId) || aId === bId) return { ok: false, reason: 'Both of them have to be in this lineup.' };
    if (!KP.canWrite(a) || !KP.canWrite(b)) return { ok: false, reason: 'A writing pair is two people who write.' };
    if (g.writingPair) return { ok: false, reason: 'A writing pair already stands. Dissolve it first.' };
    if (state.budget < P().cost) return { ok: false, reason: 'Staff time bills ' + P().cost + '. The account says no.' };
    state.budget -= P().cost;
    if (KP.ledgerFlow) KP.ledgerFlow(state, 'signings', -P().cost);
    g.writingPair = { a: aId, b: bId, since: state.week };
    a.history.push({ week: state.week, text: 'Paired with ' + KP.publicGiven(b) + ' in the writing room. Two notebooks, one song, eventually.' });
    b.history.push({ week: state.week, text: 'Paired with ' + KP.publicGiven(a) + ' in the writing room. Two notebooks, one song, eventually.' });
    ledger(state).writingPairs++;
    return { ok: true, note: KP.publicGiven(a) + ' and ' + KP.publicGiven(b) + ' share a writing room now. The next song either of them pens carries both names.' };
  };
  KP.unpairWriters = function (state, groupId) {
    const g = KP.groupById(state, groupId);
    if (!g || !g.writingPair) return { ok: false, reason: 'No writing pair stands.' };
    delete g.writingPair;
    return { ok: true };
  };
  // the pen's partner: songs.js asks when a member writes a demo
  KP.coWriterFor = function (state, g, writerId) {
    const wp = g && g.writingPair;
    if (!wp) return null;
    const other = wp.a === writerId ? wp.b : wp.b === writerId ? wp.a : null;
    return other && g.members.includes(other) ? other : null;
  };

  // ---- the seating chart ---------------------------------------------------
  KP.keptApart = function (g, aId, bId) {
    const s = g && g.seating;
    return !!(s && ((s.a === aId && s.b === bId) || (s.a === bId && s.b === aId)));
  };
  KP.seatApart = function (state, groupId, aId, bId) {
    const C = P();
    const g = KP.groupById(state, groupId);
    if (!g) return { ok: false, reason: 'No such group.' };
    const a = state.people[aId], b = state.people[bId];
    if (!a || !b || !g.members.includes(aId) || !g.members.includes(bId) || aId === bId) return { ok: false, reason: 'Both of them have to be in this lineup.' };
    const rel = relOf(state, a, b);
    if (!rel || rel.score >= -14) return { ok: false, reason: 'Staff see nothing between them that needs a seating chart.' };
    if (g.seating && state.week < g.seating.until) return { ok: false, reason: 'A seating chart already runs for this room. One feud at a time.' };
    if (state.budget < C.cost) return { ok: false, reason: 'Staff time bills ' + C.cost + '. The account says no.' };
    state.budget -= C.cost;
    if (KP.ledgerFlow) KP.ledgerFlow(state, 'signings', -C.cost);
    g.seating = { a: aId, b: bId, since: state.week, until: state.week + C.seatWeeks };
    KP.recordDirected(state, aId, 'keptApart');
    KP.recordDirected(state, bId, 'keptApart');
    ledger(state).seatings++;
    return { ok: true, note: KP.publicGiven(a) + ' and ' + KP.publicGiven(b) + ' get a body between them at every fan sign and every blocking chart for ' + C.seatWeeks + ' weeks. The fandom will count the centimeters either way.' };
  };
  KP.seatingLeft = function (state, g) {
    return g && g.seating && state.week < g.seating.until ? g.seating.until - state.week : 0;
  };

  // ---- the rivalry inside the group, framed --------------------------------
  KP.rivalryPairs = function (state, g) {
    const out = [];
    const room = roomOf(state, g);
    for (let i = 0; i < room.length; i++) {
      for (let j = i + 1; j < room.length; j++) {
        const rel = relOf(state, room[i], room[j]);
        if (rel && rel.rivalry) out.push({ a: room[i], b: room[j], rel });
      }
    }
    return out;
  };
  KP.rivalryStance = function (state, groupId, aId, bId, stance) {
    const g = KP.groupById(state, groupId);
    if (!g) return { ok: false, reason: 'No such group.' };
    const a = state.people[aId], b = state.people[bId];
    if (!a || !b) return { ok: false, reason: 'Both of them have to be in this lineup.' };
    const rel = relOf(state, a, b);
    if (!rel || !rel.rivalry) return { ok: false, reason: 'The staff have not named a rivalry between them. Friction is not a rivalry.' };
    if (stance === 'sharpen') {
      if (rel.rivalry.sharpened) return { ok: false, reason: 'It is already framed as competition.' };
      rel.rivalry.sharpened = state.week;
      delete rel.rivalry.soured;
      KP.recordDirected(state, aId, 'framedRival');
      KP.recordDirected(state, bId, 'framedRival');
      ledger(state).framed++;
      return { ok: true, note: KP.publicGiven(a) + ' and ' + KP.publicGiven(b) + ' hear it from you, out loud: it is a competition, and the company is watching both. Rooms like that train hard — until somebody stops sleeping.' };
    }
    if (!rel.rivalry.sharpened) return { ok: false, reason: 'It was never framed as competition.' };
    delete rel.rivalry.sharpened;
    delete rel.rivalry.soured;
    a.flags.edged = false; b.flags.edged = false;
    return { ok: true, note: 'The competition framing comes down. What is left is the rivalry, and the sit-down.' };
  };

  // ---- the week ---------------------------------------------------------------
  KP.registerWeekly('pairs', 405, function (state, rng, inbox) {
    const C = P();
    const R = KP.C.REL;
    const led = ledger(state);
    KP.groups(state).forEach(g => {
      if (g.retiredWeek) return;
      // the mentorship: the pair warms, and ends on its clock
      if (g.mentorship) {
        const mentor = state.people[g.mentorship.mentor], mentee = state.people[g.mentorship.mentee];
        const alive = mentor && mentee && g.members.includes(mentor.id) && g.members.includes(mentee.id);
        if (alive && state.week < g.mentorship.until) {
          const rel = relOf(state, mentor, mentee);
          if (rel) rel.score = KP.clamp(rel.score + C.mentorDrift, -100, 100);
          mentee.flags.mentoredBy = mentor.id;
        } else {
          if (mentee) {
            delete mentee.flags.mentoredBy;
            mentee.flags.mentoredUntil = state.week;
            if (alive) {
              const better = mentee.morale > g.mentorship.moraleAt;
              if (better && KP.driftTrait) KP.driftTrait(state, mentee, 'confidence', 1, 'the mentorship');
              mentee.history.push({ week: state.week, text: KP.fillPro('The mentorship ran its course. ' + KP.displayName(mentor) + ' says {she} does not need the hand anymore' + (better ? ', and the room agrees.' : '. The room is not sure yet.'), mentee) });
              led.mentorEnded++;
              inbox.push({ kind: 'development', ind: 'mentorEnded', priority: 'normal', personId: mentee.id, groupId: g.id,
                text: KP.fillPro(KP.displayName(mentor) + ' handed ' + KP.publicGiven(mentee) + ' back to the room after ' + C.mentorWeeks + ' weeks — ' +
                  (better ? '{she} walks differently now, and the vocal coach noticed before anyone said it.' : 'the hours were real; the turn has not come yet. Some turns take two mentors.'), mentee) });
            }
          }
          delete g.mentorship;
        }
      }
      // the writing pair: the bond builds while a record is in production
      if (g.writingPair) {
        const a = state.people[g.writingPair.a], b = state.people[g.writingPair.b];
        if (!a || !b || !g.members.includes(a.id) || !g.members.includes(b.id)) delete g.writingPair;
        else if (g.prep) {
          const rel = relOf(state, a, b);
          if (rel) rel.score = KP.clamp(rel.score + C.writeDrift, -100, 100);
        }
      }
      // the seating chart runs its weeks; the pair's cooling rides relationships.js
      if (g.seating && state.week >= g.seating.until) delete g.seating;
      // the rivalry framed: the edge while morale holds, the sour when it slips
      KP.rivalryPairs(state, g).forEach(({ a, b, rel }) => {
        if (!rel.rivalry.sharpened) { a.flags.edged = false; b.flags.edged = false; return; }
        const holds = a.morale >= C.rivalryMoraleHold && b.morale >= C.rivalryMoraleHold;
        if (holds) {
          a.flags.edged = true; b.flags.edged = true;
          a.liveExp += C.rivalryLiveExp; b.liveExp += C.rivalryLiveExp;
          led.edged++;
          if (rel.rivalry.soured) delete rel.rivalry.soured;
        } else {
          a.flags.edged = false; b.flags.edged = false;
          if (!rel.rivalry.soured) {
            rel.rivalry.soured = state.week;
            led.soured++;
            inbox.push({ kind: 'development', ind: 'rivalrySoured', priority: 'high', personId: a.id, groupId: g.id,
              text: 'The competition framing between ' + KP.publicGiven(a) + ' and ' + KP.publicGiven(b) + ' stopped being fuel this week — one of them is not sleeping, and the practice room reads the scoreboard as a verdict. The staff say the word "sour" in the hallway. The room feels it.' });
          }
        }
      });
    });
  });

  // ---- the timeline reacts ---------------------------------------------------
  KP.onFeedEvent('mentorEnded', (state, n, rng) => rng.chance(0.5) ? rng.pick([
    { persona: 'fan', text: KP.fillPro('the senior member walking the rookie through the hard choreo in the practice-room vlog. nobody told {her} to. this is the content', state.people[n.personId] || { gender: 'f' }) },
    { persona: 'casual', text: 'every group has one member who is secretly the staff. you can tell by who the rookies look at when they are lost' },
  ]) : null);
})(typeof window !== 'undefined' ? window : globalThis);
