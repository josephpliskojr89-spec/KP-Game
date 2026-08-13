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

  // ---- the pronoun kit (v0.8.4, boy groups) -----------------------------
  // Prose is written with {she}/{her}/{pos}/{hers}/{herself}/{girl}
  // placeholders where it refers to a specific person; KP.fillPro
  // resolves them. For a female subject the output is byte-identical
  // to the original text — the kit costs the girls nothing.
  const PRO_F = { she: 'she', her: 'her', pos: 'her', hers: 'hers', herself: 'herself',
    girl: 'girl', She: 'She', Her: 'Her', Pos: 'Her', Girl: 'Girl', Hers: 'Hers' };
  const PRO_M = { she: 'he', her: 'him', pos: 'his', hers: 'his', herself: 'himself',
    girl: 'boy', She: 'He', Her: 'Him', Pos: 'His', Girl: 'Boy', Hers: 'His' };
  KP.pro = function (p) { return p && p.gender === 'm' ? PRO_M : PRO_F; };
  // the executive as a pronoun subject (0.9.12.1): CEO Kang Min-ho was
  // being written up as "she" — fillPro needs only a gender to get it right
  KP.execP = function (state) {
    return { gender: (state.executive && state.executive.gender) || 'f' };
  };
  KP.fillPro = function (text, p) {
    if (!text || text.indexOf('{') === -1) return text;
    const pr = KP.pro(p);
    return text.replace(/\{(she|her|pos|hers|herself|girl|She|Her|Pos|Girl|Hers)\}/g,
      (m, k) => pr[k] !== undefined ? pr[k] : m);
  };

  KP.generatePerson = function (rng, opts) {
    opts = opts || {};
    const G = C().GEN;
    const family = rng.pick(KP.DATA.familyNames);
    const given = KP.genGivenName(rng, opts.usedNames, opts.gender);
    const age = opts.age != null ? opts.age : sampleAge(rng);
    const youth = (G.ageRange[1] - age) / (G.ageRange[1] - G.ageRange[0]); // 1 = youngest

    const TRAINED = ['vocals', 'rap', 'dance'];
    const ageFactor = (age - G.ageRange[0]) / (G.ageRange[1] - G.ageRange[0]);
    const talents = {};
    C().TALENTS.forEach(key => {
      // polish comes from training time: trained skills scale with age;
      // visuals and charisma are innate and don't
      const isTrainedSkill = TRAINED.includes(key);
      const mean = isTrainedSkill
        ? G.trainedAptBase + ageFactor * G.trainedAptSlope
        : G.aptMean;
      const sd = isTrainedSkill
        ? G.trainedSdBase + ageFactor * G.trainedSdSlope
        : G.aptSd;
      const cur = KP.clamp(Math.round(rng.normal(mean, sd)), G.aptMin, G.aptMax);
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
      gender: opts.gender || 'f',
      age,
      status: opts.status || 'prospect',
      source: opts.source || rng.pick(C().SOURCES),
      talents, personality, archetypes,
      fatigue: rng.int(5, 25),
      morale: rng.int(45, 70),
      liveExp: opts.inherited ? rng.int(5, 30) : rng.int(0, 12),
      mediaExp: rng.int(0, 8),
      training: { focus: [], intensity: 'standard' },
      // 0.9.17.1 (owner: "new leads are coming with a fresh read already
      // on them"): nobody counts as looked-at until somebody PAYS for a
      // look — every walk-in starts as a desk report wearing the "?"
      observations: opts.inherited ? 3 : 0,
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
    // the market is efficient (v0.3.2): an 18+ PROSPECT with elite trained
    // skill was almost certainly signed already — correct the roll down,
    // except the rare overlooked find, who becomes a story instead
    if (p.status === 'prospect' && !opts.inherited && age >= G.marketAge) {
      TRAINED.forEach(k => {
        const t = p.talents[k];
        if (t.cur > G.marketElite) {
          if (rng.chance(1 - G.marketKeepChance)) {
            t.cur = Math.round(G.marketCompressBase + (t.cur - G.marketElite) * G.marketCompressFactor);
            t.ceilLo = KP.clamp(t.ceilLo, t.cur + 1, 97);
            t.ceilHi = KP.clamp(t.ceilHi, t.ceilLo + 2, 100);
          } else {
            p.flags.overlooked = true;
          }
        }
      });
    }
    // sources follow profiles (v0.3.2): academies produce trained kids,
    // the street finds young magnetic faces, adults arrive via channels
    if (!opts.source) p.source = pickSource(rng, age, p.talents);
    return p;
  };

  function pickSource(rng, age, talents) {
    const youth = Math.max(0, 18 - age);
    const entries = [
      ['Dance academy', talents.dance.cur * 1.2],
      ['Vocal academy', talents.vocals.cur * 1.2],
      ['Street casting', (talents.visuals.cur + talents.charisma.cur) / 2 + youth * 6],
      ['Social media', talents.charisma.cur * 0.8 + youth * 4],
      ['School performance', youth * 8 + 10],
      ['Open audition', 15 + age * 2],
      ['Referral', 10 + age * 2.5],
    ];
    const total = entries.reduce((s, e) => s + e[1], 0);
    let roll = rng.next() * total;
    for (const [label, w] of entries) {
      roll -= w;
      if (roll <= 0) return label;
    }
    return entries[entries.length - 1][0];
  }

  // ---- Derived qualities — never purchased, always computed ------------
  KP.derived = function (p) {
    const t = p.talents, per = p.personality;
    const live = Math.min(40, p.liveExp);          // live experience saturates
    const media = Math.min(30, p.mediaExp);
    // the slump (v0.9.18): the nerve dims the stage stats — not the
    // skill, the NERVE. Practice-room numbers are untouched.
    const slumpDamp = p.flags && p.flags.slump ? KP.C.SLUMP.damp : 1;
    return {
      stagePresence: KP.clamp(
        (0.38 * t.charisma.cur + 0.22 * t.dance.cur + 0.22 * per.confidence + live * 0.6) * slumpDamp, 0, 100),
      // 0.9.8.1 (owner: "they're all trainees... why is it acting like
      // they [have experience]?") — showcase reps made the live term
      // dominate the leader pick, so years-in-the-building beat the born
      // leader. Polish is stagePresence's business; leadership is the
      // trait, steadied by professionalism and warmth. One truth: the
      // builder, the exec's verdict, and the tour bar now agree.
      leadership: KP.clamp(
        0.5 * per.leadership + 0.3 * per.professionalism + 0.2 * per.warmth, 0, 100),
      varietySkill: KP.clamp(
        0.35 * t.charisma.cur + 0.3 * per.warmth + 0.2 * per.confidence + media * 0.8, 0, 100),
      liveReliability: KP.clamp(
        (0.3 * ((t.vocals.cur + t.dance.cur) / 2) + 0.3 * per.professionalism +
        0.15 * per.resilience + live * 0.55 - p.fatigue * 0.15) * slumpDamp, 0, 100),
      centerPull: KP.clamp(
        0.45 * t.charisma.cur + 0.3 * t.visuals.cur + 0.15 * per.confidence + live * 0.25, 0, 100),
    };
  };

  // Public-facing names. Owner's law (v0.2.3): "if using a stage name,
  // only use that in reports." Every report surface routes through these;
  // the dossier header keeps the legal name — a file, not a report.
  KP.displayName = function (p) {
    return (p.name && p.name.stage) ? p.name.stage : p.name.display;
  };
  KP.publicGiven = function (p) {
    return (p.name && p.name.stage) ? p.name.stage : p.name.given;
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
    // a solo act IS the person (0.9.17.1, owner: releases and the group
    // page should carry the stage name): renaming the artist renames the
    // act — one truth, and every report follows
    const g = KP.groupOf ? KP.groupOf(state, personId) : null;
    if (g && (g.type === 'solo' || (g.members || []).length === 1)) {
      const dupe = KP.groups(state).some(x => x.id !== g.id &&
        x.name.toLowerCase() === clean.toLowerCase());
      if (!dupe) g.name = clean;
    }
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
    const pool = person.gender === 'm' ? KP.DATA.stageNamesM : KP.DATA.stageNames;
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
