/* K-Pop Agency Manager — central tuning constants.
   Every number the simulation uses lives here, not in UI code.
   Owner's law: no visible Overall rating — the scale below is internal only. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  KP.C = {
    VERSION: '0.4.4',

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
    // Player-facing qualitative bands (usability rail, blurbs carry the load).
    // v0.4.1, owner's ladder: clean 20-point ranges, with Capable bridging
    // the jump from still-learning to genuinely strong.
    BANDS: [
      { max: 21, key: 'raw',         label: 'Raw' },          //  1–20
      { max: 41, key: 'developing',  label: 'Developing' },   // 21–40
      { max: 61, key: 'capable',     label: 'Capable' },      // 41–60
      { max: 81, key: 'strong',      label: 'Strong' },       // 61–80
      { max: 101, key: 'exceptional', label: 'Exceptional' }, // 81–100
    ],

    // ---- Generation -----------------------------------------------------
    GEN: {
      prospectCount: [22, 28],     // external scouting board size at new game
      inheritedCount: 6,           // trainees the player starts with
      ageRange: [14, 22],
      // owner's law (v0.3.1): "15-16 should be the norm, just like
      // reality, with 14-18 making up the bulk and 19-21 far more
      // uncommon. I don't want to go any younger than 14." Mean ~16.6,
      // 14-18 ≈ 86%, 19+ ≈ 14%. The 14 floor is a hard line.
      ageWeights: { 14: 10, 15: 22, 16: 22, 17: 16, 18: 12, 19: 6, 20: 4, 21: 2, 22: 1 },
      aptMean: 44, aptSd: 15,      // innate domains (visuals, charisma) — age-independent
      aptMin: 12, aptMax: 78,
      // v0.3.2, owner: "a 14 year old shouldn't be that polished."
      // Trained skills (vocals/rap/dance) scale with age: raw at 14,
      // formed by 22. Mean = trainedAptBase + ageFactor·trainedAptSlope.
      trainedAptBase: 30, trainedAptSlope: 22,
      // spread narrows with youth too: training time is what differentiates
      // people, so young rolls cluster — prodigies come from archetypes
      trainedSdBase: 10, trainedSdSlope: 5,
      // v0.3.2, owner: "I find it hard to believe a 19 year old with that
      // much talent would just be walking around on the streets." The
      // market is efficient: elite trained skills on 18+ PROSPECTS are
      // corrected down (someone already signed the great ones) — except
      // the rare overlooked find, who gets flagged and narrated.
      marketAge: 18, marketElite: 62, marketKeepChance: 0.25,
      marketCompressBase: 45, marketCompressFactor: 0.3,
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
      // v0.4.3, owner: "more aggressive in signing talented trainees"
      rivalSignBaseChance: 0.09,  // weekly chance an interested rival signs a prospect
      rivalSignHotChance: 0.25,   // ...when interest is hot
      rivalHungerMult: 1.7,       // ...and hungrier still with a debut to cast
      rivalHungerWindow: 16,      // weeks before a planned debut that hunger starts
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
      // role changes after formation (v0.3.3): pre-debut shuffles are
      // cheap; post-debut center changes are news, and questionable ones
      // are bad news
      ROLECHANGE: {
        demoteMorale: 4, promoteMorale: 4,
        centerDemoteMorale: 10, centerDemoteConf: 6, centerPromoteConf: 4,
        strain: 12,               // old center vs new center, humanly
        questionableGap: 8,       // new center pulls this much less = questionable
        questionablePopHit: 6,
        approvalPopGain: 4,       // giving the public the center it chose
      },
    },

    // ---- The project (v0.2.5): a provisional lineup the building knows about
    PROJECT: {
      maxLocked: 3,               // lock in up to this many; the rest compete
      maxSeeking: 2,              // domains the project declares it needs
      driveMult: 1.15,            // free trainees push harder while a spot is open
      driveFatigue: 1,            // pushing has a cost
      lockedMoraleDrip: 0.5,      // a secured spot steadies you
      cancelMoraleHit: 4,         // shelving the project stings the hopefuls
      droppedMoraleHit: 8,        // being locked in, then left out, stings more
      standoutNoteChance: 0.05,   // weekly chance a hopeful gets named
    },

    // ---- Pre-debut hype (v0.2.6): a window, not a stockpile -------------
    HYPE: {
      eventBase: 0.055,          // weekly event chance, scaled by centerPull
      gainMin: 10, gainMax: 20,
      decayPerWeek: 0.5,         // the internet forgets
      directiveThreshold: 65,    // past this, the CEO forces your hand
      directiveWeeks: 20,
      directiveMetTrust: 6,
      directiveMissTrust: -12,
      collapseTo: 20,            // a missed window does not come back
      cashReceptionFactor: 0.12, cashReceptionMax: 12,   // group debut cash-in
      soloReceptionFactor: 0.16, soloReceptionMax: 15,   // a solo cashes it all
      cashPopFactor: 0.25,       // hype founds fanbase
      breakoutPullFactor: 0.12,  // the public watches whom it already knows
    },

    // ---- Solo acts (v0.2.6): high leverage, nowhere to hide -------------
    SOLO: {
      charismaFactor: 0.12,      // a solo lives on the person, not the average
      luckMult: 1.4,             // and it is volatile
      promoFatigueMult: 1.5,     // one body carries the whole rollout
      chemBase: 45, chemConfFactor: 0.18,   // "chemistry" is her own nerve
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
      prepFatigue: 6,   // weekly rehearsal load (v0.4.2: was a hardcoded 9)
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
      // v0.4.2 — the schedule breathes (owner: idols were perpetually on
      // fumes; "I like both" — contractual rest AND exhaustion with teeth)
      restWeeks: 3,                // after promo the calendar CLOSES: no new lock
      restRecovery: 15,            // scheduled rest actually restores people
      promoSoftCap: 70,            // above this, managers rotate her stages…
      promoSoftMult: 0.5,          // …and the promo load halves (not the risk)
      OVERWORK: {                  // pushing a gassed roster is legal — and risky
        threshold: 88,             // fatigue where incidents become possible
        chance: 0.045,             // weekly, per member, during promo/prep
        weeksMin: 2, weeksMax: 4,  // benched duration
        benchRecovery: 12,         // recovery while benched
        moraleHit: 8,              // hers, when she is pulled from the schedule
        perfPenalty: 4,            // stage cost per member benched at release
        lockWarnAt: 65,            // avg fatigue where staff warn at lock time
      },
      popDecayPerWeek: 0.35,       // popularity cools once promo + grace end
      decayGraceWeeks: 8,
      // idol self-development (v0.2.4): between promotions, a debuted pro
      // drills the attribute with the most runway on her own — after a
      // debut, everyone knows the gap, including her
      IDOL_AUTO: { mult: 0.5, fatigueCost: 3, restThreshold: 60 },
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
          fatigue: 7, liveExp: 2.5, mediaExp: 0.5, morale: 0, pop: 0, graceBonus: 0 },
        variety:    { label: 'Variety & media', desc: 'Panels, radio, content. Personalities get found here.',
          fatigue: 5, liveExp: 0.5, mediaExp: 3.5, morale: 0, pop: 0, graceBonus: 0 },
        fanCare:    { label: 'Fan engagement', desc: 'Fansigns and fan content. Slow promotion, loyal fans.',
          fatigue: 4, liveExp: 0.5, mediaExp: 1, morale: 2, pop: 0.25, graceBonus: 4 },
      },
    },
    CHART: {
      noiseSd: 6,
      maxWeeksOn: 16,
      // the weekly scene chart (v0.4.0): every release — yours and the
      // rivals' — enters with a heat score and cools until it drops off
      decay: 0.88,              // last week's heat, kept per week
      dropBelow: 8,             // entries fall off below this score
      maxEntries: 24,
      showTop: 10,
    },

    // ---- The living world (v0.4.0): rival acts, lifecycle, crowding -----
    INDUSTRY: {
      minRivals: 2, maxRivals: 6,
      debutTraineeCost: 4,       // minimum roster a rival needs to field a debut
      actSize: [4, 5],           // rival lineups are real people now (v0.4.3)
      memberDebutAge: [16, 19],  // generated fill members debut at plausible ages
      memberQualityWeight: 0.55, // act quality leans on who is actually in it…
      prestigeQualityWeight: 0.35, // …with the company machine behind them
      debutInterval: [28, 52],   // weeks between one rival's debuts
      actQualityNoise: 7,        // debut quality = prestige-anchored + noise
      cycleWeeks: [16, 26],      // how often a rival act comes back
      releaseNoiseSd: 9,         // rival release reception noise
      actPopDecay: 0.45,         // rival act popularity cools while idle
      disbandFloorPop: 14,       // below this, an aging act is at risk
      disbandMinAgeWeeks: 70,
      disbandChance: 0.05,       // weekly, when at risk
      scoutIntake: 0.35,         // weekly chance a rival roster grows by one
      comebackNoteMin: 64,       // rival comebacks only make the inbox when hot
      emergeChance: 0.06,        // monthly, while below maxRivals
      collapseChance: 0.09,      // monthly, for a starved company
      collapsePrestige: 26,      // below this with no active act = starved
      mergeChance: 0.035,        // monthly, needs 4+ rivals
      splitChance: 0.03,         // monthly, needs a giant to crack
      splitPrestige: 72, splitRoster: 14,
      crowdPenaltyPer: 2.5, crowdPenaltyMax: 6,  // releasing into a crowded week
    },

    // ---- The fan feed (v0.4.0): curated, world-aware, never cruel -------
    FEED: {
      maxPosts: 44,
      weeklyMax: 4,              // a digest, not a firehose
      ambientChance: 0.55,       // chance of ambient fan chatter in a quiet week
      hypePostMin: 35,           // trainee hype level the feed starts noticing
      viralChance: 0.08,         // a post occasionally escapes containment
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
      // fiscal pressure (v0.2.3): after the first debut the signing cap
      // lifts — the CEO watches burn rate instead. Judged on the rolling
      // quarter, so one big album month is business, three deficit months
      // are a problem. Level 2+ costs trust.
      PRESSURE: { quarterBurnWarn: 90, trustHitL2: -3, trustHitL3: -5 },
      weeklyTrainingCostPerTrainee: 0.25,
      productionCost: 30,
      monthlyStipend: 12,         // roughly covers upkeep; spends are the choices
    },

    // ---- Rival agencies -------------------------------------------------
    RIVALS: {
      count: 3,   // v0.4.0: Whitecliff finally activates — the world is full

      interestLevels: ['watching', 'interested', 'hot'],
      weeklyInterestShift: 0.26,  // chance a rival escalates interest (v0.4.3: hungrier)
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
