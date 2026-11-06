/* Relationships & chemistry. Pair scores (-100..100) drift weekly from
   personality compatibility and shared context. Chemistry is never a single
   visible number — the player sees observations, not meters. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function pairKey(a, b) { return a.id < b.id ? a.id + '~' + b.id : b.id + '~' + a.id; }
  KP.pairKey = pairKey;

  // Static compatibility from personalities: warmth helps, twin dominance
  // clashes, competitiveness cuts both ways, professionalism stabilizes.
  // Rebalanced v0.1.2 — the old always-negative penalty terms decayed the
  // average pair into conflict ("a lot of conflict", owner). Mean is now
  // ~neutral; conflict comes from genuinely clashing people.
  function compatibility(a, b) {
    const pa = a.personality, pb = b.personality;
    let c = 0;
    c += (pa.warmth + pb.warmth - 100) / 16;
    c -= Math.max(0, (pa.dominance + pb.dominance - 145)) / 16;
    c -= Math.max(0, Math.abs(pa.workEthic - pb.workEthic) - 15) / 28;  // only real mismatch grates
    c += (Math.min(pa.professionalism, pb.professionalism) - 42) / 24;
    const comp = (pa.competitiveness + pb.competitiveness) / 2;
    c += comp > 72 ? -1.0 : comp > 55 ? 0.5 : 0;          // rivalry: productive until it isn't
    return c;
  }

  KP.relState = function (score) {
    for (const s of KP.C.REL.states) if (score >= s.min) return s;
    return KP.C.REL.states[KP.C.REL.states.length - 1];
  };

  KP.relationsWeek = function (state, roster, rng) {
    const R = KP.C.REL;
    const notes = [];
    state.relationships = state.relationships || {};
    for (let i = 0; i < roster.length; i++) {
      for (let j = i + 1; j < roster.length; j++) {
        const a = roster[i], b = roster[j];
        const key = pairKey(a, b);
        if (state.relationships[key] == null) {
          state.relationships[key] = { score: rng.int(R.startRange[0], R.startRange[1]), state: null };
        }
        const rel = state.relationships[key];
        let drift = compatibility(a, b) * 0.35;
        const shared = (a.training.focus || []).some(f => (b.training.focus || []).includes(f));
        if (shared) drift += R.sharedFocusBonus * (compatibility(a, b) >= 0 ? 1 : -0.25);
        // the dorm (v0.7.1): roommates amplify chemistry in BOTH directions
        const gA = KP.groupOf(state, a.id);
        if (gA && KP.roommates(gA, a.id, b.id)) drift *= KP.C.LIFE.roomDriftMult;
        drift += (rng.next() - 0.5) * R.weeklyDrift;
        rel.score = KP.clamp(rel.score + drift, -100, 100);
        // repair forces (v0.1.2): professionals let grudges go, and time
        // apart cools a feud — rooms no longer rot unattended
        if (rel.score < 0) {
          const prof = (a.personality.professionalism + b.personality.professionalism) / 2;
          rel.score += (-rel.score) * R.reversion * (0.5 + prof / 100);
          if (rel.score < -14 && !shared) rel.score += R.coolOff;
          // the seating chart (v0.10.40, §88 D): kept apart, a feud cools faster
          if (rel.score < -14 && gA && KP.keptApart && KP.keptApart(gA, a.id, b.id)) {
            rel.score += R.coolOff * (KP.C.PAIR.seatCoolMult - 1);
          }
        }

        const st = KP.relState(rel.score);
        // (v0.10.29) only the crossings that change what the office should do
        // are letters: a feud opening or closing, a friendship the staff can
        // use. 'warmed up' and 'remain professional' were wallpaper. The
        // chance is drawn either way — the stream does not move.
        const worth = st.key === 'tense' || st.key === 'conflict' || st.key === 'close' ||
          (st.key === 'neutral' && rel.state === 'tense');
        if (rel.state && st.key !== rel.state && rng.chance(R.observationChance) && worth) {
          notes.push({ kind: 'relationship', relKey: st.key, text: relObservation(state, a, b, st, rel.state) });
        }
        rel.state = st.key;
      }
    }
    // the quiet (v0.10.29, §89 Phase 1): the house notices ONE pair a week,
    // the worst first — the rest is on the group page (frictionPairs).
    // Measured 34 kept/org-year across n² pairs before the throttle.
    const rank = { conflict: 0, tense: 1, close: 2, friendly: 3, neutral: 4 };
    notes.sort((x, y) => (rank[x.relKey] || 0) - (rank[y.relKey] || 0));
    return notes.slice(0, 1);
  };

  // the family (v0.11.2, §93): the same change reads differently for
  // different pairs — the room it happened in and the traits that drove it
  // choose the sentence; the hash chooses among what fits
  function relObservation(state, a, b, st, prev) {
    const A = KP.publicGiven(a), B = KP.publicGiven(b);
    const pa = a.personality || {}, pb = b.personality || {};
    const bothCompetitive = pa.competitiveness >= 60 && pb.competitiveness >= 60;
    const bossy = pa.dominance - pb.dominance >= 20 ? A : pb.dominance - pa.dominance >= 20 ? B : null;
    const other = bossy === A ? B : A;
    const warm = pa.warmth >= 60 || pb.warmth >= 60;
    const quiet = pa.dominance < 42 && pb.dominance < 42;
    const salt = 'rel|' + KP.pairKey(a, b) + '|' + st.key;
    let lines;
    switch (st.key) {
      case 'close':
        lines = [
          A + ' and ' + B + ' bring out the best in each other. Staff have started scheduling them together on purpose.',
          A + ' and ' + B + ' have a shorthand now — half a word, a look, the count picked up mid-phrase. The choreographer has stopped explaining things to them twice.',
          A + ' and ' + B + ' were the last two in the practice room again, and the run-through they did alone was the cleanest anyone saw all week. Nobody scheduled it. Nobody will.',
          'The van has a new seating chart nobody wrote down: ' + A + ' and ' + B + ' in the back, sharing one playlist. The road manager calls it “the office.”',
          warm ? A + ' and ' + B + ' have started finishing each other’s sentences in interviews, which the editors love and the members tease them for. The teasing is affectionate. So is the rest of it.'
               : A + ' and ' + B + ' do not say much to each other, and do not need to — the eval sheet shows them climbing together, and the coaches have noticed who sits next to whom.',
        ];
        break;
      case 'friendly':
        lines = [
          A + ' and ' + B + ' have warmed up to each other lately.',
          A + ' and ' + B + ' ate together three times this week without anyone arranging it. The dorm noticed. The dorm notices everything.',
          A + ' and ' + B + ' have stopped being polite to each other, which in this building is the beginning of being friends.',
        ];
        break;
      case 'neutral':
        lines = prev === 'tense' ? [
          A + ' and ' + B + ' have settled things. It’s professional again.',
          A + ' and ' + B + ' ran the formation without the half-second of hesitation that used to sit between them. Whatever it was, it got said. It’s professional again.',
          'Somebody — nobody is saying who — got ' + A + ' and ' + B + ' into the same room for an hour with the door closed. They came out tired and civil. Civil holds.',
          A + ' and ' + B + ' are back to sharing a mic stand in rehearsal, which is the building’s unit of peace. The staff exhaled.',
        ] : [
          A + ' and ' + B + ' remain professional, but there is very little warmth between them.',
          A + ' and ' + B + ' are courteous in exactly the way colleagues are courteous. The room reads it as a draw.',
        ];
        break;
      case 'tense':
        lines = [
          'There is friction between ' + A + ' and ' + B + '. Nothing public yet, but the practice room feels it.',
          bothCompetitive ? A + ' and ' + B + ' want the same spot in the same formation, and both of them have the counts to argue for it. The choreographer is mediating with a stopwatch.'
                          : A + ' and ' + B + ' have started leaving the room at different times. Small, deliberate, and the kind of thing the staff clock without saying so.',
          bossy ? bossy + ' has been giving ' + other + ' notes nobody asked for, in front of people. ' + other + ' has stopped answering. The silence is louder than the notes.'
                : 'The van went quiet when ' + A + ' and ' + B + ' ended up in adjacent seats. The road manager put music on. The music did not help.',
          quiet ? 'Nobody has raised a voice — ' + A + ' and ' + B + ' are not the type — but the two of them have not shared a mic in rehearsal for a fortnight, and the coaches have noticed the detour.'
                : A + ' and ' + B + ' had a short, sharp exchange in the hallway over something small enough that neither will say what it was. Everyone within earshot found a reason to be elsewhere.',
          'The group chat has a new silence in it, and it sits between ' + A + ' and ' + B + '. Nothing public yet. The practice room feels it anyway.',
        ];
        break;
      case 'conflict':
        lines = [
          A + ' and ' + B + ' are in open conflict. This needs handling before it needs explaining.',
          A + ' and ' + B + ' are no longer pretending for the staff, and that is the line: when it stops being hidden from the building, it starts being visible to the cameras.',
          'The members have started taking sides between ' + A + ' and ' + B + ', quietly, and sides are how a group becomes two groups. This needs handling before it needs explaining.',
        ];
        break;
      default:
        lines = [A + ' and ' + B + ' were seen practicing together.'];
    }
    return KP.lineFor(state, salt, lines);
  }

  // Frictions among a set of people — structured, for UI buttons.
  KP.frictionPairs = function (state, personIds) {
    const out = [];
    const rels = state.relationships || {};
    for (let i = 0; i < personIds.length; i++) {
      for (let j = i + 1; j < personIds.length; j++) {
        const a = state.people[personIds[i]], b = state.people[personIds[j]];
        if (!a || !b) continue;
        const rel = rels[pairKey(a, b)];
        if (rel && rel.score < -14) {
          out.push({ a, b, score: rel.score, state: KP.relState(rel.score).key });
        }
      }
    }
    return out.sort((x, y) => x.score - y.score);
  };

  KP.mediationCooldown = function (state, aId, bId) {
    const key = aId < bId ? aId + '~' + bId : bId + '~' + aId;
    const last = (state.mediations || {})[key];
    if (last == null) return 0;
    return Math.max(0, KP.C.REL.MED.cooldownWeeks - (state.week - last));
  };

  // The sit-down. A player tool, not a button that fixes people: success
  // odds come from who they are, and forcing it too often makes it worse.
  KP.mediatePair = function (state, aId, bId) {
    const M = KP.C.REL.MED;
    const a = state.people[aId], b = state.people[bId];
    if (!a || !b || !state.roster.includes(aId) || !state.roster.includes(bId)) {
      return { ok: false, reason: 'Both of them need to be in the building.' };
    }
    const key = pairKey(a, b);
    const rel = (state.relationships || {})[key];
    if (!rel || rel.score >= -5) {
      return { ok: false, reason: 'Staff see nothing there that needs a closed door.' };
    }
    if (KP.mediationCooldown(state, aId, bId) > 0) {
      return { ok: false, reason: 'They sat down recently. Pushing again this soon does more harm than good.' };
    }
    if (state.budget < M.cost) return { ok: false, reason: 'No budget for staff time this week.' };
    state.budget -= M.cost;
    state.mediations = state.mediations || {};
    state.mediations[key] = state.week;

    const rng = KP.rngFor(state);
    const prof = (a.personality.professionalism + b.personality.professionalism) / 2;
    const warmth = (a.personality.warmth + b.personality.warmth) / 2;
    const bothDominant = a.personality.dominance > 65 && b.personality.dominance > 65;
    // the seating chart (v0.10.40): weeks apart make the sit-down likelier
    const gAB = KP.groupOf(state, a.id);
    const apart = gAB && KP.keptApart && KP.keptApart(gAB, a.id, b.id) && gAB.seating &&
      state.week - gAB.seating.since >= KP.C.PAIR.seatMediationAfter ? KP.C.PAIR.seatMediationBonus : 0;
    const chance = KP.clamp(
      M.baseChance + (prof - 50) / 220 + (warmth - 50) / 260 - (bothDominant ? 0.18 : 0) + apart,
      0.15, 0.9);
    const roll = rng.next();
    const A = KP.publicGiven(a), B = KP.publicGiven(b);
    let outcome, text;
    if (roll < chance) {
      rel.score = KP.clamp(rel.score + 10 + rng.next() * 14, -100, 100);
      a.morale = KP.clamp(a.morale + 2, 0, 100);
      b.morale = KP.clamp(b.morale + 2, 0, 100);
      // the office made room for them (v0.8.0) — they both remember
      KP.recordDirected(state, a.id, 'mediated');
      KP.recordDirected(state, b.id, 'mediated');
      outcome = 'cleared';
      text = rng.pick([
        A + ' and ' + B + ' talked for two hours. Nobody cried, one of them laughed, and the room feels lighter already.',
        KP.fillPro('It went better than staff expected. ' + A + ' said what {she} had been sitting on for weeks; ' + B + ' actually heard it.', a),
        'They walked in separately and left together to get food. Take the win.',
      ]);
    } else if (bothDominant && roll > 0.93) {
      rel.score = KP.clamp(rel.score - 6, -100, 100);
      outcome = 'backfired';
      text = 'Two strong personalities, one small room. Voices were raised. This one is worse before it is better.';
    } else {
      rel.score = KP.clamp(rel.score + 2, -100, 100);
      outcome = 'cool';
      text = rng.pick([
        A + ' and ' + B + ' were polite, brief, and unresolved. The door is at least open now.',
        'They said the professional things. Staff believe it bought calm, not peace.',
      ]);
    }
    rel.state = KP.relState(rel.score).key;
    state.rngState = rng.state();
    return { ok: true, outcome, text };
  };

  // Group chemistry (hidden 0-100) from pair scores + personality mix.
  // A solo's "chemistry" is her own nerve (v0.2.6).
  KP.groupChemistry = function (state, members) {
    const G = KP.C.GROUP;
    if (members.length === 1) {
      return Math.round(KP.clamp(
        KP.C.SOLO.chemBase + members[0].personality.confidence * KP.C.SOLO.chemConfFactor, 0, 100));
    }
    let pairSum = 0, pairs = 0;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const rel = (state.relationships || {})[pairKey(members[i], members[j])];
        pairSum += rel ? rel.score : 0;
        // the bad blood (v0.9.21): a rivalry that got a NAME drags the
        // room beyond what the pair score already says — and a rivalry
        // framed as competition that soured drags double (v0.10.40)
        if (rel && rel.rivalry) pairSum -= KP.C.BADBLOOD.rivalryChemDrag * (rel.rivalry.soured ? KP.C.PAIR.rivalrySourDrag : 1);
        pairs++;
      }
    }
    const pairAvg = pairs ? pairSum / pairs : 0;              // -100..100
    // personality mix: exactly one natural leader helps; all-dominant hurts
    const leaders = members.filter(m => m.personality.leadership > 65).length;
    const domAvg = members.reduce((s, m) => s + m.personality.dominance, 0) / members.length;
    let mix = 50;
    mix += leaders === 1 ? 10 : leaders === 0 ? -4 : -6 * (leaders - 1);
    mix -= Math.max(0, domAvg - 62) * 0.5;
    mix += (members.reduce((s, m) => s + m.personality.warmth, 0) / members.length - 50) * 0.25;
    const score = KP.clamp(
      (50 + pairAvg * 0.45) * G.chemistryPairWeight + mix * G.chemistryPersonalityWeight, 0, 100);
    return Math.round(score);
  };

  // Player-facing chemistry observations (words, not a meter).
  // Frictions are NOT listed here — they render separately with sit-down
  // actions (KP.frictionPairs), so a problem is always next to its handle.
  KP.chemistryNotes = function (state, members) {
    const notes = [];
    if (members.length === 1) {
      return [KP.fillPro('It is {her}, a stage, and nowhere to hide. Solo acts do not get a room to blame.', members[0])];
    }
    const chem = KP.groupChemistry(state, members);
    const quiet = [];
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const rel = (state.relationships || {})[pairKey(members[i], members[j])];
        if (!rel) continue;
        const st = KP.relState(rel.score);
        if (st.key === 'close') notes.push(KP.publicGiven(members[i]) + ' + ' + KP.publicGiven(members[j]) + ': trusted partners.');
        // the quiet pairs (v0.9.3): the gap between "everyone gets along"
        // and "this room works" lives here — name it next to its handle
        // (frictions render separately, with sit-downs attached)
        else if (st.key === 'friendly') quiet.push({ s: rel.score, t: KP.publicGiven(members[i]) + ' + ' + KP.publicGiven(members[j]) + ': friendly, not yet trusted.' });
        else if (st.key === 'neutral') quiet.push({ s: rel.score, t: KP.publicGiven(members[i]) + ' + ' + KP.publicGiven(members[j]) + ': cordial, not close yet.' });
      }
    }
    // only worth naming once some pairs ARE close — an all-quiet room is
    // already covered by the consensus line; cap three, coldest first
    if (notes.length && quiet.length) {
      quiet.sort((a, b) => a.s - b.s).slice(0, 3).forEach(q => notes.push(q.t));
    }
    const leaders = members.filter(m => m.personality.leadership > 65);
    if (leaders.length > 1) notes.push('More than one member expects to lead. That will surface.');
    if (leaders.length === 0) notes.push('No obvious leader in this lineup yet.');
    // the mix, in words (v0.9.3): the half of the consensus that is who
    // they are, not how they get along — it can hold a warm room at
    // "workable" and the player deserves to see it
    const domAvg = members.reduce((s, m) => s + m.personality.dominance, 0) / members.length;
    const warmAvg = members.reduce((s, m) => s + m.personality.warmth, 0) / members.length;
    if (domAvg > 62) notes.push('A lot of strong wills sharing one dorm. The thermostat reads it.');
    if (warmAvg >= 60) notes.push('The room runs warm — chemistry has a tailwind here.');
    else if (warmAvg <= 42) notes.push('The room runs cool. Whatever chemistry this lineup gets will be built on purpose.');
    if (chem >= 66) notes.unshift('Staff consensus: this room works. They move like they already know each other.');
    else if (chem <= 38) notes.unshift('Staff consensus: talented individuals, cold room. Chemistry is not there yet.');
    else notes.unshift('Staff consensus: a workable room. Chemistry will be built, not found.');
    return notes;
  };
})(typeof window !== 'undefined' ? window : globalThis);
