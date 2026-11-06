/* The mirror (v0.10.40, §88 E) — the manager's shadow. The directed-acts
   ledger — what YOU did to each person, one write path (scenes.js) —
   aggregated across the roster and said OUT LOUD: "keeps promises;
   opens doors before the third ask; avoids the hard conversation."
   Computed from real entries, in words, never a number, shown on the
   building. It gates, gently, which friction questions people bring
   (the softspoken one only brings the quiet no to a boss who has
   answered doors before) and how early the knocks come (a boss who
   listens is knocked on sooner; one who schedules through it, later).
   The player's style becomes a fact of the world, read the way the
   staff reads the idols. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};
  const M = () => KP.C.MIRROR;

  function roster(state) {
    return (state.roster || []).map(id => state.people[id]).filter(Boolean);
  }
  // the read: per category, how many acts for and against across the
  // people in the building today — the ledger is theirs, the pattern is yours
  KP.mirrorRead = function (state) {
    const C = M();
    const out = { entries: 0, traits: {}, counts: {}, lines: [] };
    const people = roster(state);
    Object.keys(C.CATEGORIES).forEach(key => {
      const cat = C.CATEGORIES[key];
      let yes = 0, no = 0;
      people.forEach(p => (p.directed || []).forEach(a => {
        if (cat.for.includes(a.kind)) yes++;
        else if (cat.against.includes(a.kind)) no++;
      }));
      out.counts[key] = { for: yes, against: no };
      out.traits[key] = (yes >= 2 && yes >= no + C.lead) ? 1 : (no >= 2 && no >= yes + C.lead) ? -1 : 0;
      if (out.traits[key] === 1) out.lines.push(cat.yes);
      if (out.traits[key] === -1) out.lines.push(cat.no);
    });
    people.forEach(p => { out.entries += (p.directed || []).length; });
    out.spoken = out.entries >= C.minEntries && out.lines.length > 0;
    return out;
  };
  KP.mirrorLine = function (state) {
    const r = KP.mirrorRead(state);
    if (r.entries < M().minEntries) return 'The building has no read of you yet. It is keeping notes.';
    if (!r.lines.length) return 'The building reads you as even-handed — nothing it would say out loud, yet.';
    return 'The building reads you: ' + r.lines.join('; ') + '.';
  };
  // has this boss answered a door before? — the softspoken one's gate
  KP.mirrorDoorsAnswered = function (state) {
    const C = M();
    const kinds = C.CATEGORIES.hearing.for.concat(C.CATEGORIES.doors.for);
    let n = 0;
    roster(state).forEach(p => (p.directed || []).forEach(a => { if (kinds.includes(a.kind)) n++; }));
    return n;
  };
  // the knocks come early to a boss who listens, late to one who does not
  KP.knockGap = function (state) {
    const K = KP.C.KNOCK, C = M();
    const r = KP.mirrorRead(state);
    const listens = r.traits.hearing || 0;
    return Math.max(1, K.personGapWeeks - (listens > 0 ? C.knockEarly : 0) + (listens < 0 ? C.knockLate : 0));
  };
})(typeof window !== 'undefined' ? window : globalThis);
