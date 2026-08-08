/* Person generation and derived qualities.
   Hidden truth lives here: true talents, potential cones, personality,
   archetypes. The player only ever sees the perceived layer (blurbs.js). */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};
  const C = () => KP.C;

  let nextId = 1;
  KP.resetIds = function (n) { nextId = n || 1; };
  KP.peekNextId = function () { return nextId; };

  const PERSONALITY_TRAITS = [
    'workEthic', 'coachability', 'confidence', 'professionalism', 'adaptability',
    'resilience', 'creativity', 'competitiveness', 'leadership', 'warmth', 'dominance',
  ];
  KP.PERSONALITY_TRAITS = PERSONALITY_TRAITS;

  // archetype -> mutations on a freshly rolled person (hidden texture of the world)
  const ARCHETYPE_FX = {
    naturalVocalist: (p) => { bump(p, 'vocals', 12); p.talents.vocals.growth += 0.3; },
    performanceAce:  (p) => { bump(p, 'dance', 10); bump(p, 'charisma', 6); },
    centerCandidate: (p) => { p.talents.charisma.ceilLo += 8; p.talents.charisma.ceilHi += 14; bump(p, 'visuals', 6); },
    lateBloomer:     (p) => { addAll(p, -7); eachTalent(p, t => { t.ceilHi += 11; t.growth += 0.35; }); },
    workhorse:       (p) => { p.personality.workEthic = KP.clamp(p.personality.workEthic + 18, 0, 100); p.personality.resilience += 8; },
    producerMinded:  (p) => { p.personality.creativity = KP.clamp(p.personality.creativity + 20, 0, 100); },
    varietyNatural:  (p) => { p.personality.warmth += 10; p.personality.confidence += 8; },
    glassSpirit:     (p) => { addAll(p, 5); p.personality.resilience = KP.clamp(p.personality.resilience - 20, 5, 100); },
    slowBurner:      (p) => { eachTalent(p, t => { t.ceilHi += 8; }); p.personality.confidence -= 10; },
    quietProfessional: (p) => { p.personality.professionalism += 15; p.talents.charisma.cur = Math.max(C().GEN.aptMin, p.talents.charisma.cur - 6); },
  };

  function sampleAge(rng) {
    const w = C().GEN.ageWeights;
    const ages = Object.keys(w).map(Number).sort((a, b) => a - b);
    let total = 0;
    ages.forEach(a => { total += w[a]; });
    let roll = rng.next() * total;
    for (const a of ages) {
      roll -= w[a];
      if (roll <= 0) return a;
    }
    return ages[ages.length - 1];
  }

  function eachTalent(p, fn) { C().TALENTS.forEach(k => fn(p.talents[k], k)); }
  function bump(p, key, amt) {
    const t = p.talents[key];
    t.cur = KP.clamp(t.cur + amt, C().GEN.aptMin, C().GEN.aptMax + 10);
    t.ceilLo = Math.max(t.ceilLo, t.cur + 2);
    t.ceilHi = Math.max(t.ceilHi, t.ceilLo + 4);
  }
  function addAll(p, amt) { eachTalent(p, t => { t.cur = KP.clamp(t.cur + amt, 8, 90); }); }

  KP.generatePerson = function (rng, opts) {
    opts = opts || {};
    const G = C().GEN;
    const family = rng.pick(KP.DATA.familyNames);
    const given = rng.pick(KP.DATA.givenNamesF);
    const age = opts.age != null ? opts.age : sampleAge(rng);
    const youth = (G.ageRange[1] - age) / (G.ageRange[1] - G.ageRange[0]); // 1 = youngest

    const talents = {};
    C().TALENTS.forEach(key => {
      const cur = KP.clamp(Math.round(rng.normal(G.aptMean, G.aptSd)), G.aptMin, G.aptMax);
      const headroom = rng.range(G.headroomMin, G.headroomMax + youth * G.youngHeadroomBonus);
      const width = rng.range(G.coneWidthMin, G.coneWidthMax) * (0.7 + 0.6 * youth);
      const ceilLo = Math.round(cur + Math.max(2, headroom - width / 2));
      const ceilHi = Math.round(cur + headroom + width / 2);
      talents[key] = {
        cur,
        ceilLo, ceilHi,                     // the true cone — never shown raw
        growth: rng.range(G.growthMin, G.growthMax),
      };
    });

    const personality = {};
    PERSONALITY_TRAITS.forEach(k => {
      personality[k] = KP.clamp(Math.round(rng.normal(G.personalityMean, G.personalitySd)), 2, 98);
    });

    const archetypes = [];
    if (rng.chance(G.archetypeChance)) {
      archetypes.push(rng.pick(C().ARCHETYPES));
      if (rng.chance(G.secondArchetypeChance)) {
        const second = rng.pick(C().ARCHETYPES);
        if (second !== archetypes[0]) archetypes.push(second);
      }
    }

    const p = {
      id: 'p' + (nextId++),
      name: { family, given, display: family + ' ' + given },
      age,
      status: opts.status || 'prospect',
      source: opts.source || rng.pick(C().SOURCES),
      talents, personality, archetypes,
      fatigue: rng.int(5, 25),
      morale: rng.int(45, 70),
      liveExp: opts.inherited ? rng.int(5, 30) : rng.int(0, 12),
      mediaExp: rng.int(0, 8),
      training: { focus: [], intensity: 'standard' },
      observations: opts.inherited ? 3 : rng.int(0, 1),
      signedWeek: null,
      history: [],
      flags: {},
    };
    archetypes.forEach(a => ARCHETYPE_FX[a] && ARCHETYPE_FX[a](p));
    // re-clamp after archetype mutation
    PERSONALITY_TRAITS.forEach(k => { p.personality[k] = KP.clamp(p.personality[k], 2, 98); });
    eachTalent(p, t => {
      t.cur = KP.clamp(Math.round(t.cur), 5, 95);
      t.ceilLo = KP.clamp(Math.round(t.ceilLo), t.cur + 1, 97);
      t.ceilHi = KP.clamp(Math.round(t.ceilHi), t.ceilLo + 2, 100);
      t.growth = Math.max(0.3, Math.min(2.2, t.growth));
    });
    return p;
  };

  // ---- Derived qualities — never purchased, always computed ------------
  KP.derived = function (p) {
    const t = p.talents, per = p.personality;
    const live = Math.min(40, p.liveExp);          // live experience saturates
    const media = Math.min(30, p.mediaExp);
    return {
      stagePresence: KP.clamp(
        0.38 * t.charisma.cur + 0.22 * t.dance.cur + 0.22 * per.confidence + live * 0.6, 0, 100),
      leadership: KP.clamp(
        0.45 * per.leadership + 0.25 * per.professionalism + 0.15 * per.warmth + live * 0.35, 0, 100),
      varietySkill: KP.clamp(
        0.35 * t.charisma.cur + 0.3 * per.warmth + 0.2 * per.confidence + media * 0.8, 0, 100),
      liveReliability: KP.clamp(
        0.3 * ((t.vocals.cur + t.dance.cur) / 2) + 0.3 * per.professionalism +
        0.15 * per.resilience + live * 0.55 - p.fatigue * 0.15, 0, 100),
      centerPull: KP.clamp(
        0.45 * t.charisma.cur + 0.3 * t.visuals.cur + 0.15 * per.confidence + live * 0.25, 0, 100),
    };
  };

  // Public-facing name: the stage name once one exists, else the real one.
  // Staff notes keep using real names — the building knows who people are.
  KP.displayName = function (p) {
    return (p.name && p.name.stage) ? p.name.stage : p.name.display;
  };

  KP.setStageName = function (state, personId, name) {
    const p = state.people[personId];
    if (!p) return { ok: false, reason: 'No such person.' };
    const clean = String(name || '').trim();
    if (!clean) return { ok: false, reason: 'A stage name needs letters in it.' };
    if (clean.length > 14) return { ok: false, reason: 'Fourteen characters or fewer — it has to fit on a lightstick.' };
    const taken = Object.values(state.people).some(o =>
      o.id !== personId && o.name.stage && o.name.stage.toLowerCase() === clean.toLowerCase());
    if (taken) return { ok: false, reason: 'Another artist already uses that name.' };
    const had = p.name.stage;
    p.name.stage = clean;
    if (!had) p.history.push({ week: state.week, text: 'Took the stage name “' + clean + '”.' });
    else if (had !== clean) p.history.push({ week: state.week, text: 'Changed stage name from “' + had + '” to “' + clean + '”.' });
    return { ok: true };
  };

  // Deterministic suggestions: condensed given name + curated pool picks.
  KP.suggestStageNames = function (state, person) {
    const out = [];
    const condensed = person.name.given.replace(/-/g, '').toUpperCase();
    out.push(condensed.charAt(0) + condensed.slice(1).toLowerCase());
    const parts = person.name.given.split('-');
    if (parts.length > 1) out.push(parts[1].charAt(0).toUpperCase() + parts[1].slice(1));
    const used = new Set(Object.values(state.people)
      .map(p => p.name.stage && p.name.stage.toLowerCase()).filter(Boolean));
    const pool = KP.DATA.stageNames;
    let i = KP.hashStr(state.seed + person.id) % pool.length;
    while (out.length < 4) {
      const cand = pool[i % pool.length];
      if (!used.has(cand.toLowerCase()) && !out.includes(cand)) out.push(cand);
      i++;
      if (i > KP.hashStr(state.seed + person.id) % pool.length + pool.length) break;
    }
    return out.filter(n => !used.has(n.toLowerCase())).slice(0, 4);
  };

  KP.band = function (v) {
    for (const b of KP.C.BANDS) if (v < b.max) return b;
    return KP.C.BANDS[KP.C.BANDS.length - 1];
  };
})(typeof window !== 'undefined' ? window : globalThis);
