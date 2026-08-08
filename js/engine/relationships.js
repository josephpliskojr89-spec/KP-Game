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
  function compatibility(a, b) {
    const pa = a.personality, pb = b.personality;
    let c = 0;
    c += (pa.warmth + pb.warmth - 100) / 18;
    c -= Math.max(0, (pa.dominance + pb.dominance - 130)) / 14;
    c -= Math.abs(pa.workEthic - pb.workEthic) / 22;      // effort mismatch grates
    c += (Math.min(pa.professionalism, pb.professionalism) - 50) / 20;
    const comp = (pa.competitiveness + pb.competitiveness) / 2;
    c += comp > 70 ? -1.2 : comp > 55 ? 0.6 : 0;          // rivalry: productive until it isn't
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
        if (shared) drift += R.sharedFocusBonus * (compatibility(a, b) >= 0 ? 1 : -0.6);
        drift += (rng.next() - 0.5) * R.weeklyDrift;
        rel.score = KP.clamp(rel.score + drift, -100, 100);

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
    const A = a.name.given, B = b.name.given;
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

  // Group chemistry (hidden 0-100) from pair scores + personality mix.
  KP.groupChemistry = function (state, members) {
    const G = KP.C.GROUP;
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
  KP.chemistryNotes = function (state, members) {
    const notes = [];
    const chem = KP.groupChemistry(state, members);
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const rel = (state.relationships || {})[pairKey(members[i], members[j])];
        if (!rel) continue;
        const st = KP.relState(rel.score);
        if (st.key === 'close') notes.push(members[i].name.given + ' + ' + members[j].name.given + ': trusted partners.');
        if (st.key === 'tense' || st.key === 'conflict') notes.push(members[i].name.given + ' + ' + members[j].name.given + ': friction the cameras would find.');
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
