/* Regional popularity (v0.6.6) — the map opens.
   §22: "KR / JP / greater-China / SEA / NA / LATAM / EU per group and
   idol; concepts and members resonate differently by region.
   Prerequisite for tours."

   KR is g.popularity — the number the whole sim already runs on; the
   six overseas regions are new numbers. They move on releases (concept
   resonance × reach), on member viral moments (each idol has personal
   strongholds — the "inexplicably huge in Brazil" phenomenon, derived
   from a stable hash, never from anything about who she is), and on
   borderless promo. Entirely rng-free: zero seed drift by design. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function regionIds() { return KP.C.REGIONS.map(r => r.id); }
  KP.regionLabel = function (id) {
    const r = KP.C.REGIONS.find(x => x.id === id);
    return r ? r.label : id;
  };
  KP.regionsOf = function (g) {
    if (!g.regions) {
      g.regions = {};
      regionIds().forEach(id => { g.regions[id] = 0; });
    }
    return g.regions;
  };
  KP.regionWord = function (v) {
    const R = KP.C.REGIONAL;
    if (v >= R.devotedAt) return 'devoted';
    if (v >= R.loudAt) return 'loud';
    if (v >= 15) return 'stirring';
    return 'quiet';
  };
  KP.affinity = function (conceptId, regionId) {
    const row = KP.C.CONCEPT_AFFINITY[conceptId];
    return (row && row[regionId]) || 1;
  };

  // Every idol has two corners of the map that simply love her — a
  // stable trait of the world, not of her résumé.
  KP.strongholdsOf = function (state, p) {
    const ids = regionIds();
    const a = Math.floor(KP.hash01([state.seed, p.id, 'home1'].join('|')) * ids.length);
    const b = (a + 1 + Math.floor(KP.hash01([state.seed, p.id, 'home2'].join('|')) * (ids.length - 1))) % ids.length;
    return [ids[a], ids[b]];
  };

  // ---- releases export (called from resolveDebut) ----------------------
  KP.regionsOnRelease = function (state, g, reception, conceptId) {
    const R = KP.C.REGIONAL;
    const notes = [];
    const regions = KP.regionsOf(g);
    const reach = R.reachBase + (g.popularity || 0) * R.reachPerPop;
    regionIds().forEach(id => {
      const before = regions[id];
      // markets saturate: the tenth hit moves Japan less than the first
      const sat = Math.max(0, 1 - regions[id] / 95);
      regions[id] = KP.clamp(regions[id] +
        reception * R.exportBase * KP.affinity(conceptId, id) * reach * sat, 0, 100);
      if (before < R.loudAt && regions[id] >= R.loudAt) {
        notes.push({ kind: 'public', ind: 'regionLoud', groupId: g.id, region: id,
          text: 'The overseas desk flags it: ' + g.name + ' is getting LOUD in ' + KP.regionLabel(id) +
            ' — fan-sub accounts, airport rumors, a fan café that runs in two languages. Nobody planned this market. It chose us.' });
      }
    });
    // a region loud enough becomes a story (one narrative, strongest
    // region rendered live)
    const loudest = regionIds().slice().sort((x, y) => regions[y] - regions[x])[0];
    if (regions[loudest] >= R.strongholdNarrativeAt) {
      const nar = KP.recordEvidence(state, 'regionStronghold', 'group', g.id, { region: loudest });
      if (nar) notes.push(nar);
    }
    return notes;
  };

  // ---- viral moments travel (single door: called from recordViral) -----
  // Saturating: a clip sets a cold region on fire and barely moves a
  // market that already loves you — no runaway compounding.
  KP.regionsOnViral = function (state, person) {
    const R = KP.C.REGIONAL;
    const g = KP.groupOf(state, person.id);
    if (!g || !g.debuted) return;
    const regions = KP.regionsOf(g);
    const homes = KP.strongholdsOf(state, person);
    regionIds().forEach(id => {
      const sat = Math.max(0, 1 - regions[id] / 90);
      regions[id] = KP.clamp(regions[id] +
        (homes.includes(id) ? R.strongholdViral : R.otherViral) * sat, 0, 100);
    });
  };

  // ---- the weekly pass: borderless promo, slow cooling -----------------
  KP.regionsWeek = function (state) {
    const R = KP.C.REGIONAL;
    KP.groups(state).forEach(g => {
      if (!g.debuted) return;
      const regions = KP.regionsOf(g);
      const promoting = !g.prep && state.week <= (g.promoUntil || 0) &&
        state.week > (g.lastReleaseWeek || 0);
      let spread = 0;
      let challengeHomes = null;
      if (promoting && g.rollout) {
        const idx = KP.clamp(state.week - (g.lastReleaseWeek || 0) - 1, 0, KP.C.ROLLOUT.weeks - 1);
        const plan = g.rollout[idx] || [];
        if (plan.includes('livestream')) spread += R.livestreamSpread;
        if (plan.includes('challenge')) {
          // the challenge lands where it lands — two regions, hash-picked
          const ids = regionIds();
          const a = Math.floor(KP.hash01([state.seed, g.id, state.week, 'ch1'].join('|')) * ids.length);
          const b = (a + 1 + Math.floor(KP.hash01([state.seed, g.id, state.week, 'ch2'].join('|')) * (ids.length - 1))) % ids.length;
          challengeHomes = [ids[a], ids[b]];
        }
      }
      regionIds().forEach(id => {
        let v = regions[id] + spread - R.idleDecay;
        if (challengeHomes && challengeHomes.includes(id)) v += R.challengeSpread;
        regions[id] = KP.clamp(v, 0, 100);
      });
    });
  };

  // avg overseas warmth — the number revenue reads
  KP.overseasAvg = function (g) {
    if (!g.regions) return 0;
    const ids = regionIds();
    return ids.reduce((s, id) => s + (g.regions[id] || 0), 0) / ids.length;
  };
})(typeof window !== 'undefined' ? window : globalThis);
