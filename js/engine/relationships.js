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
        }

        const st = KP.relState(rel.score);
        if (rel.state && st.key !== rel.state && rng.chance(R.observationChance)) {
          notes.push({ kind: 'relationship', text: relObservation(a, b, st, rel.state) });
        }
        rel.state = st.key;
      }
    }
    return notes;
  };

  function relObservation(a, b, st, prev) {
    const A = KP.publicGiven(a), B = KP.publicGiven(b);
    switch (st.key) {
      case 'close': return A + ' and ' + B + ' bring out the best in each other. Staff have started scheduling them together on purpose.';
      case 'friendly': return A + ' and ' + B + ' have warmed up to each other lately.';
      case 'neutral': return prev === 'tense'
        ? A + ' and ' + B + ' have settled things. It’s professional again.'
        : A + ' and ' + B + ' remain professional, but there is very little warmth between them.';
      case 'tense': return 'There is friction between ' + A + ' and ' + B + '. Nothing public yet, but the practice room feels it.';
      case 'conflict': return A + ' and ' + B + ' are in open conflict. This needs handling before it needs explaining.';
      default: return A + ' and ' + B + ' were seen practicing together.';
    }
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
    const chance = KP.clamp(
      M.baseChance + (prof - 50) / 220 + (warmth - 50) / 260 - (bothDominant ? 0.18 : 0),
      0.15, 0.9);
    const roll = rng.next();
    const A = KP.publicGiven(a), B = KP.publicGiven(b);
    let outcome, text;
    if (roll < chance) {
      rel.score = KP.clamp(rel.score + 10 + rng.next() * 14, -100, 100);
      a.morale = KP.clamp(a.morale + 2, 0, 100);
      b.morale = KP.clamp(b.morale + 2, 0, 100);
      outcome = 'cleared';
      text = rng.pick([
        A + ' and ' + B + ' talked for two hours. Nobody cried, one of them laughed, and the room feels lighter already.',
        'It went better than staff expected. ' + A + ' said what she had been sitting on for weeks; ' + B + ' actually heard it.',
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
      return ['It is her, a stage, and nowhere to hide. Solo acts do not get a room to blame.'];
    }
    const chem = KP.groupChemistry(state, members);
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const rel = (state.relationships || {})[pairKey(members[i], members[j])];
        if (!rel) continue;
        const st = KP.relState(rel.score);
        if (st.key === 'close') notes.push(KP.publicGiven(members[i]) + ' + ' + KP.publicGiven(members[j]) + ': trusted partners.');
      }
    }
    const leaders = members.filter(m => m.personality.leadership > 65);
    if (leaders.length > 1) notes.push('More than one member expects to lead. That will surface.');
    if (leaders.length === 0) notes.push('No obvious leader in this lineup yet.');
    if (chem >= 66) notes.unshift('Staff consensus: this room works. They move like they already know each other.');
    else if (chem <= 38) notes.unshift('Staff consensus: talented individuals, cold room. Chemistry is not there yet.');
    else notes.unshift('Staff consensus: a workable room. Chemistry will be built, not found.');
    return notes;
  };
})(typeof window !== 'undefined' ? window : globalThis);
