/* The inner life (v0.7.1) — idols are people, not attribute sets.
   Expert consult: "she has no dorm, no off-day, no pet… morale is
   weather, not psychology." Personal facts and ambitions are stable
   hash-truth (zero rng, zero save bytes — like §28 strongholds); the
   Bubble leaks the fatigue/morale numbers the sim already computes to
   a public surface; the dorm gives chemistry a domestic lever. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // ---- off the clock: two facts per person, forever ---------------------
  KP.factsOf = function (state, p) {
    const F = KP.C.LIFE.FACTS;
    const a = Math.floor(KP.hash01([state.seed, p.id, 'fact1'].join('|')) * F.length);
    const b = (a + 1 + Math.floor(KP.hash01([state.seed, p.id, 'fact2'].join('|')) * (F.length - 1))) % F.length;
    return [F[a], F[b]];
  };

  // ---- what she wants: one ambition, seeded by who she is ---------------
  KP.ambitionOf = function (state, p) {
    if ((p.archetypes || []).includes('varietyNatural')) return 'variety';
    if ((p.archetypes || []).includes('centerCandidate') || p.talents.charisma.cur >= 68) return 'solo';
    if (p.personality.competitiveness >= 62) return 'trophy';
    const keys = ['solo', 'trophy', 'stage', 'variety'];
    return keys[Math.floor(KP.hash01([state.seed, p.id, 'wants'].join('|')) * keys.length)];
  };
  // the day the dream lands — one door for every fulfillment site
  KP.ambitionTouch = function (state, p, kind) {
    if (!p || p.status !== 'idol') return null;
    if (KP.ambitionOf(state, p) !== kind || p.flags.ambitionMet) return null;
    p.flags.ambitionMet = state.week;
    p.morale = KP.clamp(p.morale + KP.C.LIFE.ambitionMoraleBonus, 0, 100);
    p.history.push({ week: state.week, text: 'The thing she always wanted — ' +
      KP.C.LIFE.AMBITIONS[kind].label + ' — actually happened.' });
    return { kind: 'company', ind: 'ambitionMet', personId: p.id,
      text: KP.displayName(p) + ' got the thing she always wanted: ' + KP.C.LIFE.AMBITIONS[kind].label +
        '. The staff say she called home first, then cried in the practice room, in that order. Some numbers do not show this. Morale does.' };
  };

  // ---- the bubble: her side of the screen, finally ----------------------
  // Weekly, hash-gated, wholesome by construction. The tone reads her
  // TRUE state — the feed starts showing interiority instead of
  // asserting it.
  KP.bubblePosts = function (state) {
    const posts = [];
    KP.groups(state).forEach(g => {
      if (!g.debuted) return;
      g.members.forEach(id => {
        const p = state.people[id];
        if (!p || p.status !== 'idol') return;
        if (KP.hash01([state.seed, p.id, state.week, 'bubble'].join('|')) >= KP.C.LIFE.bubbleChance) return;
        const fact = KP.factsOf(state, p)[state.week % 2];
        const name = KP.publicGiven(p);
        let text;
        if (p.fatigue >= 70) {
          text = 'bubble from ' + name + ' at 3am: “still at the company. eat well tomorrow, promise me.” she is comforting US. someone protect her';
        } else if (p.morale >= 72) {
          text = name + '’s bubble today was 14 messages, 9 of them photos of her lunch, and one voice note of her laughing at her own joke. subscription justified forever';
        } else if (state.week <= (g.tourRestUntil || 0) || state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks && state.week > (g.promoUntil || 0)) {
          text = 'day-off bubble: ' + name + ' — who ' + fact + ' — sent a full photo diary of it. rest era content is the BEST content';
        } else {
          text = name + ' casually mentioned in bubble that she ' + fact + '. the fandom wiki was updated within four minutes';
        }
        posts.push({ persona: 'fan', text });
      });
    });
    return posts;
  };

  // ---- the regulars: a feed with people in it ---------------------------
  KP.regularFor = function (state, persona, week) {
    const cast = KP.C.LIFE.REGULARS.filter(r => r.persona === persona);
    if (!cast.length) return null;
    return cast[Math.floor(KP.hash01([state.seed, 'regular', persona, week].join('|')) * cast.length)].handle;
  };

  // ---- the dorm: chemistry has an address -------------------------------
  KP.assignRooms = function (state, g) {
    if (g.rooms && g.rooms.length) return g.rooms;
    const ids = g.members.slice();
    // initial pairing by hash — the manager didn't pick these, the
    // company van schedule did
    ids.sort((a, b) => KP.hash01([state.seed, g.id, a].join('|')) - KP.hash01([state.seed, g.id, b].join('|')));
    g.rooms = [];
    while (ids.length >= 4) g.rooms.push(ids.splice(0, 2));
    if (ids.length) g.rooms.push(ids.splice(0));
    return g.rooms;
  };
  KP.roommates = function (g, aId, bId) {
    return !!(g && g.rooms && g.rooms.some(r => r.includes(aId) && r.includes(bId)));
  };
  // the lever: reshuffle to separate the worst pair — a real management
  // move with a bill and a cooldown, the sit-down's domestic twin
  KP.shuffleRooms = function (state, groupId) {
    const L = KP.C.LIFE;
    const g = KP.groupById(state, groupId);
    if (!g || !g.debuted && !g.members.length) return { ok: false, reason: 'No group.' };
    if (state.week - (g.lastRoomShuffle || -999) < L.roomShuffleCooldown) {
      return { ok: false, reason: 'The dorm just re-settled. Moving boxes every month is its own morale problem.' };
    }
    if (state.budget < L.roomShuffleCost) return { ok: false, reason: 'Even moving furniture costs money.' };
    state.budget -= L.roomShuffleCost;
    g.lastRoomShuffle = state.week;
    // separate the coldest pair: sort members by pairwise score with
    // current roommates, rebuild rooms greedily from best-compatible
    const members = g.members.map(id => state.people[id]);
    const rels = state.relationships || {};
    const score = (a, b) => {
      const rel = rels[KP.pairKey(a, b)];
      return rel ? rel.score : 0;
    };
    const ids = g.members.slice().sort((a, b) =>
      KP.hash01([state.seed, g.id, state.week, a].join('|')) - KP.hash01([state.seed, g.id, state.week, b].join('|')));
    // greedy: repeatedly take the first id and its best-liked remaining partner
    g.rooms = [];
    while (ids.length >= 4) {
      const a = ids.shift();
      const pa = state.people[a];
      ids.sort((x, y) => score(pa, state.people[y]) - score(pa, state.people[x]));
      g.rooms.push([a, ids.shift()]);
    }
    if (ids.length) g.rooms.push(ids.splice(0));
    members.forEach(m => { m.morale = KP.clamp(m.morale - 1, 0, 100); });   // moving is moving
    return { ok: true, note: 'Rooms reassigned. The first night is quiet — new roommates negotiating the thermostat treaty. The tour manager approves of the new seating chart energy.' };
  };
})(typeof window !== 'undefined' ? window : globalThis);
