/* K-Pop Agency Manager — central tuning constants.
   Every number the simulation uses lives here, not in UI code.
   Owner's law: no visible Overall rating — the scale below is internal only. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  KP.C = {
    VERSION: '0.2.1',

    // ---- Calendar: 4-week months, 48-week years -------------------------
    WEEKS_PER_MONTH: 4,
    MONTHS_PER_YEAR: 12,
    WEEKS_PER_YEAR: 48,
    MONTH_NAMES: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

    // ---- Internal talent scale (never shown to the player) --------------
    SCALE_MAX: 100,
    TALENTS: ['vocals', 'rap', 'dance', 'visuals', 'charisma'],
    TALENT_LABELS: {
      vocals: 'Vocals', rap: 'Rap', dance: 'Dance',
      visuals: 'Visuals', charisma: 'Charisma',
    },
    // Player-facing qualitative bands (usability rail, blurbs carry the load)
    BANDS: [
      { max: 35, key: 'raw',         label: 'Raw' },
      { max: 55, key: 'developing',  label: 'Developing' },
      { max: 72, key: 'strong',      label: 'Strong' },
      { max: 101, key: 'exceptional', label: 'Exceptional' },
    ],

    // ---- Generation -----------------------------------------------------
    GEN: {
      prospectCount: [22, 28],     // external scouting board size at new game
      inheritedCount: 6,           // trainees the player starts with
      ageRange: [15, 23],
      // owner's law: trainees skew young. Weighted distribution, mean ~18,
      // ~22% aged 20+ (late recruits are the rarity, not the norm).
      ageWeights: { 15: 8, 16: 16, 17: 20, 18: 20, 19: 14, 20: 10, 21: 7, 22: 4, 23: 1 },
      aptMean: 44, aptSd: 15,      // current-ability seed distribution
      aptMin: 12, aptMax: 78,
      // potential cone: ceiling = cur + headroomBase..headroomMax, scaled by age
      headroomMin: 4, headroomMax: 34,
      youngHeadroomBonus: 10,      // extra max headroom at the youngest ages
      coneWidthMin: 6, coneWidthMax: 22,  // ceilLo..ceilHi spread
      growthMin: 0.55, growthMax: 1.65,   // per-person growth-rate multiplier
      personalityMean: 50, personalitySd: 17,
      archetypeChance: 0.65,       // chance a person carries >= 1 hidden archetype
      secondArchetypeChance: 0.2,
    },

    ARCHETYPES: [
      'naturalVocalist', 'performanceAce', 'centerCandidate', 'lateBloomer',
      'workhorse', 'producerMinded', 'varietyNatural', 'glassSpirit',
      'slowBurner', 'quietProfessional',
    ],

    // ---- Scouting -------------------------------------------------------
    SCOUT: {
      baseReadWidth: 18,          // +/- fog on a never-observed prospect
      widthPerObservation: 4,     // each extra look narrows the cone
      minReadWidth: 5,            // certainty is never perfect
      observeCost: 4,             // budget units per targeted look
      maxObservations: 4,
      instinctNoteChance: 0.12,   // rare gut-call scout note on high hidden charisma
      rivalSignBaseChance: 0.05,  // weekly chance an interested rival signs a prospect
      rivalSignHotChance: 0.16,   // ...when interest is hot
      newProspectChance: 0.3,     // weekly chance a fresh lead appears
    },

    SOURCES: [
      'Dance academy', 'Vocal academy', 'Street casting', 'Social media',
      'School performance', 'Open audition', 'Referral',
    ],

    // ---- Training / development ----------------------------------------
    TRAIN: {
      intensities: ['rest', 'light', 'standard', 'heavy'],
      gainMult:  { rest: 0, light: 0.55, standard: 1.0, heavy: 1.38 },
      fatigueLoad: { rest: -20, light: 5, standard: 11, heavy: 19 },
      baseGain: 1.05,             // pts/week at growth 1.0, standard, one focus
      secondFocusMult: 0.55,      // splitting focus splits gains
      fatigueSoftCap: 65,         // gains decay above this
      fatigueHardCap: 88,         // burnout risk zone
      burnoutChance: 0.10,        // weekly, above hard cap
      injuryChance: 0.02,         // weekly, above soft cap on heavy
      ceilingCrawl: 0.25,         // gain multiplier in the last 6 pts under ceiling
      breakthroughChance: 0.035,  // weekly chance of a development pop
      plateauChance: 0.03,
      showcaseEveryWeeks: 8,      // monthly-ish internal showcase => live experience
      liveExpGainShowcase: 6,
      confidenceFromBreakthrough: 6,
      moraleRestBonus: 4,
    },

    // ---- Relationships --------------------------------------------------
    REL: {
      startRange: [-12, 12],
      weeklyDrift: 2.2,           // max weekly movement from compatibility
      sharedFocusBonus: 0.6,
      states: [
        { min: 55, key: 'close', label: 'Close friends' },
        { min: 25, key: 'friendly', label: 'Friendly' },
        { min: -14, key: 'neutral', label: 'Professional' },
        { min: -34, key: 'tense', label: 'Tense' },
        { min: -101, key: 'conflict', label: 'Open conflict' },
      ],
      mentorAgeGap: 3,
      observationChance: 0.5,     // chance a state change surfaces as a note
      reversion: 0.038,           // negative pairs drift back toward professional
      coolOff: 0.7,               // extra weekly healing when a feuding pair is kept apart
      MED: {                      // the sit-down: mediation is a player tool
        cost: 3,                  // staff time, in budget units
        cooldownWeeks: 6,         // per pair — you cannot force it weekly
        baseChance: 0.55,         // shaped by professionalism, warmth, dominance
      },
    },

    // ---- Groups ---------------------------------------------------------
    GROUP: {
      minMembers: 4, maxMembers: 6,
      roles: ['leader', 'center', 'mainVocal', 'mainDancer', 'mainRapper'],
      chemistryPairWeight: 0.55,
      chemistryPersonalityWeight: 0.45,
    },

    // ---- Songs & concepts ----------------------------------------------
    SONG: {
      demoCount: 4,
      qualityMean: 55, qualitySd: 14,
    },
    CONCEPTS: [
      { id: 'bright',      label: 'Bright / Youthful',   weights: { vocals: 0.9, dance: 1.0, charisma: 1.15, visuals: 1.05, rap: 0.7 }, personality: { confidence: 0.6, warmth: 1.0 } },
      { id: 'elegant',     label: 'Elegant / Luxury',    weights: { vocals: 1.2, dance: 0.85, charisma: 1.0, visuals: 1.25, rap: 0.5 }, personality: { professionalism: 1.0, confidence: 0.6 } },
      { id: 'futuristic',  label: 'Futuristic / Experimental', weights: { vocals: 0.8, dance: 1.25, charisma: 1.1, visuals: 1.0, rap: 1.0 }, personality: { creativity: 1.2, adaptability: 0.8 } },
      { id: 'dark',        label: 'Dark / Dramatic',     weights: { vocals: 1.0, dance: 1.15, charisma: 1.25, visuals: 0.95, rap: 0.9 }, personality: { confidence: 1.1, competitiveness: 0.7 } },
      { id: 'performance', label: 'Performance-Heavy',   weights: { vocals: 0.8, dance: 1.45, charisma: 1.1, visuals: 0.8, rap: 0.9 }, personality: { workEthic: 1.0, resilience: 0.8 } },
      { id: 'hiphop',      label: 'Hip-hop / Swagger',   weights: { vocals: 0.7, dance: 1.0, charisma: 1.2, visuals: 0.85, rap: 1.5 }, personality: { confidence: 1.3, competitiveness: 0.9 } },
      { id: 'retro',       label: 'Retro',               weights: { vocals: 1.15, dance: 1.0, charisma: 1.15, visuals: 1.0, rap: 0.6 }, personality: { creativity: 0.9, warmth: 0.8 } },
      { id: 'dreamy',      label: 'Dreamy / Ethereal',   weights: { vocals: 1.25, dance: 0.8, charisma: 1.0, visuals: 1.2, rap: 0.4 }, personality: { creativity: 1.0, warmth: 0.9 } },
    ],

    // ---- Debut resolution ----------------------------------------------
    DEBUT: {
      prepWeeksMin: 4,
      // release formats (v0.2.1): bigger records cost more, need more
      // runway, and pay more when they land
      FORMATS: [
        { id: 'single', label: 'Single', cost: 30, minPrep: 4, revenueMult: 1.0, tracks: 2 },
        { id: 'mini',   label: 'Mini-album', cost: 55, minPrep: 6, revenueMult: 1.6, tracks: 5 },
        { id: 'full',   label: 'Full album', cost: 90, minPrep: 8, revenueMult: 2.3, tracks: 9 },
      ],
      promoLevels: ['modest', 'standard', 'aggressive'],
      promoCost: { modest: 10, standard: 22, aggressive: 40 },
      promoBoost: { modest: -4, standard: 0, aggressive: 6 },
      luckSd: 9,                 // public reaction noise — the market is not a formula
      breakoutNoiseSd: 14,       // who the public actually watches
      centerBreakoutBonus: 10,   // exposure edge, not destiny
      // the defining clip: a big hook + a magnetic performer can catch fire
      spark: { hookMin: 68, pullMin: 66, chance: 0.35, boostMin: 4, boostMax: 10 },
      receptionBands: [
        // sensation edge calibrated v0.2.0: measured 200-seed debut
        // distribution put >=75 at 3.5% — rare but alive, never extinct
        { min: 75, key: 'sensation', label: 'A sensation' },
        { min: 64, key: 'strong', label: 'A strong debut' },
        { min: 50, key: 'solid', label: 'A respectable start' },
        { min: 38, key: 'quiet', label: 'A quiet landing' },
        { min: -101, key: 'miss', label: 'A miss' },
      ],
    },

    // ---- Comebacks, popularity & charts (v0.2.0) ------------------------
    COMEBACK: {
      objectiveWeeks: 28,          // runway the executive grants per comeback
      promoWeeks: 4,               // promotion period after a release
      promoFatigue: 7,             // weekly fatigue during promotion
      idolRecovery: 8,             // weekly fatigue recovery when idle
      popDecayPerWeek: 0.35,       // popularity cools once promo + grace end
      decayGraceWeeks: 8,
      popFactor: 0.12,             // how much an existing fanbase lifts reception
      comebackTrustDelta: { sensation: 14, strong: 9, solid: 4, quiet: -5, miss: -12 },
      missedDeadlinePenalty: -15,  // gentler than the debut deadline
      // a comeback is not a debut — the recaps know the difference (v0.2.1)
      bandLabels: {
        sensation: 'A sensation', strong: 'A strong comeback',
        solid: 'A solid comeback', quiet: 'A quiet return', miss: 'A miss',
      },
      // rollout focus: what the promotion weeks are actually spent on
      FOCUS: {
        musicShows: { label: 'Music shows', desc: 'Live stages every week. The hard reps.',
          fatigue: 9, liveExp: 2.5, mediaExp: 0.5, morale: 0, pop: 0, graceBonus: 0 },
        variety:    { label: 'Variety & media', desc: 'Panels, radio, content. Personalities get found here.',
          fatigue: 6, liveExp: 0.5, mediaExp: 3.5, morale: 0, pop: 0, graceBonus: 0 },
        fanCare:    { label: 'Fan engagement', desc: 'Fansigns and fan content. Slow promotion, loyal fans.',
          fatigue: 5, liveExp: 0.5, mediaExp: 1, morale: 2, pop: 0.25, graceBonus: 4 },
      },
    },
    CHART: {
      noiseSd: 6,
      maxWeeksOn: 16,
    },

    // ---- Executives & trust ---------------------------------------------
    EXEC: {
      startTrust: 55,
      trustFloor: 0, trustCap: 100,
      debutTrustDelta: { sensation: 22, strong: 14, solid: 6, quiet: -8, miss: -18 },
      missedDeadlinePenalty: -30,
      ignoredDirectivepenalty: -6,
      personalities: ['visionary', 'patient', 'trendChaser', 'profitHunter', 'traditionalist', 'micromanager'],
    },

    // ---- Economy (division budget units, ~1 = ₩10M feel) ---------------
    ECON: {
      startBudget: 120,
      signCostBase: 14, signCostPerHeat: 6,  // rival heat raises price
      weeklyTrainingCostPerTrainee: 0.25,
      productionCost: 30,
      monthlyStipend: 12,         // roughly covers upkeep; spends are the choices
    },

    // ---- Rival agencies -------------------------------------------------
    RIVALS: {
      count: 2,
      interestLevels: ['watching', 'interested', 'hot'],
      weeklyInterestShift: 0.18,  // chance a rival escalates interest in someone
    },

    // ---- Inbox / events -------------------------------------------------
    EVENTS: {
      maxInboxPerWeek: 5,
      viralChance: 0.02,          // ultra-rare pre-debut viral moment
    },

    // ---- Save -----------------------------------------------------------
    SAVE_KEY: 'kpam_save',
    SAVE_SLOTS: 3,
  };
})(typeof window !== 'undefined' ? window : globalThis);
