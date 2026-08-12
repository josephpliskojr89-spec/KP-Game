/* K-Pop Agency Manager — central tuning constants.
   Every number the simulation uses lives here, not in UI code.
   Owner's law: no visible Overall rating — the scale below is internal only. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  KP.C = {
    VERSION: '0.9.11',

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
      // boy groups (v0.8.4): the opening board leans female (the mandate
      // is a girl group); the weekly leads run closer to even
      maleBoardShare: 0.25,
      maleLeadShare: 0.35,
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
      // genre-bending (v0.9.6, owner's request): the concept that mashes.
      // Locking a release under this brief opens a second option — pick
      // the two genres to collide. Extremely high risk, high reward.
      { id: 'fusion',      label: 'Genre-Bending',       weights: { vocals: 1.0, dance: 1.0, charisma: 1.2, visuals: 0.9, rap: 1.0 }, personality: { creativity: 1.5, confidence: 0.8 } },
    ],

    // ---- Regional popularity (v0.6.6): the map opens --------------------
    // KR stays g.popularity — the number the charts, shows and war
    // already run on (one truth per number). The six overseas regions
    // are NEW numbers that move on releases (by concept resonance),
    // member viral moments (personal strongholds), and borderless
    // promo. Prerequisite for tours. Entirely rng-free.
    REGIONS: [
      { id: 'jp',    label: 'Japan' },
      { id: 'cn',    label: 'Greater China' },
      { id: 'sea',   label: 'Southeast Asia' },
      { id: 'na',    label: 'North America' },
      { id: 'latam', label: 'Latin America' },
      { id: 'eu',    label: 'Europe' },
    ],
    // how each concept travels — craft resonance per market
    CONCEPT_AFFINITY: {
      bright:      { jp: 1.40, cn: 1.00, sea: 1.25, na: 0.70, latam: 0.85, eu: 0.80 },
      elegant:     { jp: 1.10, cn: 1.35, sea: 0.95, na: 0.80, latam: 0.70, eu: 1.10 },
      futuristic:  { jp: 0.90, cn: 0.90, sea: 0.90, na: 1.20, latam: 1.00, eu: 1.30 },
      dark:        { jp: 0.80, cn: 1.00, sea: 1.00, na: 1.25, latam: 1.20, eu: 1.15 },
      performance: { jp: 0.90, cn: 1.20, sea: 1.15, na: 1.00, latam: 1.20, eu: 0.95 },
      hiphop:      { jp: 0.70, cn: 0.75, sea: 0.95, na: 1.40, latam: 1.30, eu: 1.05 },
      retro:       { jp: 1.30, cn: 0.85, sea: 1.00, na: 0.90, latam: 1.00, eu: 1.15 },
      dreamy:      { jp: 1.10, cn: 1.15, sea: 1.00, na: 0.80, latam: 0.75, eu: 1.25 },
    },
    REGIONAL: {
      exportBase: 0.20,        // per-release gain = reception × this × affinity × reach
      reachBase: 0.45,         // reach grows with the home fanbase…
      reachPerPop: 1 / 140,    // …because fame is what travels
      idleDecay: 0.12,         // overseas fandoms are patient — but not eternal
      strongholdViral: 6,      // a member's viral moment lands HARD where she is loved
      otherViral: 1.5,         // and ripples everywhere else
      livestreamSpread: 0.4,   // livestreams are borderless — all regions, weekly
      challengeSpread: 0.9,    // the challenge lands where it lands, hard
      loudAt: 40,              // a region worth a letter
      devotedAt: 65,           // a region worth a tour (v0.6.7 will collect)
      // 75→72 (v0.9.4): the home circuit lengthened tours, so careers fit
      // fewer overseas legs and the map runs ~3pts cooler — the §18 watch
      // item said to move the threshold, not the band, when this happened
      strongholdNarrativeAt: 72, // a region past devoted becomes a story — a true second home
      revenuePerOverseas: 1 / 220, // release revenue × (1 + avgOverseas × this)
    },

    // ---- Creative direction (v0.6.7) ------------------------------------
    // Owner: "choosing a concept for a group that has an effect on the
    // songs pitched to them." A group can commit to a concept; the
    // producers then pitch TO the brief — most demos in-lane and a
    // little sharper for it, one adjacent, one wildcard they push
    // anyway. Consistency becomes identity; identity makes pivots news.
    DIRECTION: {
      laneSlots: 2,            // demos written to the brief (of demoCount 4)
      briefHookBonus: 2,       // a clear brief makes better records (gently — power creep is real)
      identityAt: 2,           // consecutive in-lane releases before it is canon
      pivotStrengthMult: 0.5,  // a pivot cuts the identity story down…
      reinventionAt: 70,       // …and a pivot landing THIS well is a reinvention
    },

    // ---- Debut resolution ----------------------------------------------
    DEBUT: {
      prepWeeksMin: 4,
      prepFatigue: 6,   // weekly rehearsal load (v0.4.2: was a hardcoded 9)
      // v0.6.9 — the crunch: early cycle is recording, fittings and
      // teasers; the dance-practice hell is the LAST weeks. A long
      // runway stops being a fatigue trap — resting first now works.
      crunchWeeks: 3,        // full rehearsal load only this close to the date
      prepFatigueEase: 0.35, // load multiplier before the crunch
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
      // the flagships (v0.9.8, owner: "the game in general feels easy") —
      // each rival company puts its machine behind its best act, which
      // PURSUES the scene ceiling instead of mean-reverting under it:
      // weekly investment drift when behind, hungrier releases when
      // behind, and a hunting note when they pull within reach
      FLAGSHIP: {
        catchUp: 0.025,          // weekly pop drift toward the scene ceiling
        punchFactor: 0.25,       // release reception lift per point behind…
        punchCap: 10,            // …capped: hunger, not magic
        huntNoteAt: 8,           // gap at which the trades notice the pursuit
      },
      debutTraineeCost: 4,       // minimum roster a rival needs to field a debut
      actSize: [4, 5],           // rival lineups are real people now (v0.4.3)
      boyActShare: 0.35,         // the industry runs both markets (v0.8.4)
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

    // ---- The release war (v0.6.4): the calendar is a battlefield --------
    // Rival comebacks are announced ahead of time; the player's locked
    // date goes public; rivals with a motive park their release ON that
    // date; same-week landings resolve as head-to-head battles the whole
    // world keeps score on. Target emotion, verbatim from the mandate:
    // "Novaline, you absolute motherfuckers."
    WAR: {
      announceLead: 4,           // weeks ahead a rival comeback goes public
      announceNoteMinPop: 28,    // smaller acts announce quietly (calendar only)
      ambushChance: 0.12,        // weekly, while a worthwhile target is locked
      ambushWindow: 3,           // an act due within ± this of your date can move
      ambushMinTarget: 22,       // popularity/hype a release needs to be worth sniping
      ambushMinLeadWeeks: 2,     // they move while you still have time to react
      ambushCooldown: 14,        // weeks before the same company snipes again
      slipWeeks: 2,              // the dodge: push the date back…
      slipCost: 8,               // …rebook everything…
      slipMorale: 2,             // …and the members know what it looks like (cost)
      battleMinPop: 20,          // a same-week rival release this big is a BATTLE
      winPop: 3, winMorale: 2,   // taking the week
      losePop: 2, loseMorale: 2, // losing it
      loseActPop: 3,             // what the rival act pays when we win
      rivalryAt: 2,              // meetings before the internet declares a rivalry
      sniperAt: 2,               // ambushes before a company earns the name
      copyReceptionMin: 72,      // a player hit this big is worth stealing
      copyChance: 0.5,           // …and the trend chasers usually do
    },

    // ---- The national chart (v0.5.0): the wider world, low resolution ---
    // The prestigious chart. A generated mainstream pool — titans,
    // established names, risers — releases on its own cadence and sets a
    // bar the scene has to climb to. Player and scene-rival releases
    // enter the same field with the scores they already carry.
    NATIONAL: {
      pool: { titan: 6, established: 11, riser: 12 },
      fame: { titan: [88, 97], established: [60, 80], riser: [40, 62] },
      cadence: [14, 26],           // weeks between a pool artist's releases
      titanCadenceBonus: 4,        // titans release a little slower, land harder
      scoreMult: [0.95, 1.25],     // release score = fame × this roll
      decay: 0.93,                 // national songs have longevity the scene lacks
      titanDecay: 0.972,           // titan hits linger — the summit is defended
      megaChance: 0.55,            // a titan release is often a cultural moment…
      megaMult: 1.45,              // …that parks on top for a season
      dropBelow: 14,               // and the floor is higher
      maxEntries: 48,
      showTop: 25,
      fameDriftMax: 2,             // fame random-walks a little per release
      fameFloor: 25, fameCap: 98,
      retireBelow: 32,             // monthly: faded artists bow out…
      retireChance: 0.25,          // …and a fresh riser takes the slot
      milestones: [20, 10, 3, 1],  // the ladders worth a letter
      firstTopTenTrust: 3,         // the CEO notices the national top 10
    },

    // ---- Memory (v0.6.0): the world develops opinions and keeps them ----
    // Narratives form from patterns, strengthen on new evidence, decay
    // when nothing feeds them, and change how later events are read.
    MEMORY: {
      cap: 40,                 // v0.6.1: the whole world holds opinions now
      decayPerWeek: 0.35,      // opinions fade without evidence
      pruneBelow: 8,           // forgotten
      reinforceGain: 16,       // each new piece of evidence
      formStrength: 26,        // a fresh narrative's opening strength
      dormantWeeks: 40,        // a debuted group silent this long goes noticed
      dormantNagWeeks: 8,      // fans repeat the complaint on this cadence
      viralFormAt: 2,          // viral moments before "the fancam one" sticks
      breakoutFormAt: 3,       // breakouts before "it-girl" sticks
      repPedigreeAt: 68,       // company rep that reads as identity
      // memory changes interpretation — modest, deterministic
      returnBonus: 4,          // a long-awaited comeback lands warmer
      pedigreeMeet: 2,         // living up to the company's name
      pedigreeMiss: -3,        // debuting UNDER the company's name
      underperformGap: 12,     // reception drop that becomes a story
      minShowStrength: 22,     // below this, the UI stays quiet about it
      // v0.6.1 — the world's stories about everyone else
      poachAt: 3,              // board signings before a rival is "the poachers"
      streakAt: 3,             // consecutive hits (>=64) before "on a run"
      flopAt: 2,               // consecutive misses (<40) before "flop era"
      risingAt: 75,            // prestige crossing this = "rising power"
      fadingBelow: 35,         // prestige under this at a disband = "fading house"
    },

    // ---- Social presence (v0.6.1): public numbers on every face ---------
    // Follower counts are IN-FICTION public numbers (the no-Overall law
    // bans hidden talent numbers, not the ones the world can see).
    // Entirely hash-driven — zero rng draws, zero seed drift.
    SOCIAL: {
      milestones: [10000, 100000, 500000, 1000000, 5000000],
      // weekly growth shape (×jitter 0.7–1.3, hash-keyed):
      idolPromoPerPop: 90,     // promoting idols grow fastest
      idolIdlePerPop: 12,      // idle idols coast
      traineePerHype: 25,      // trainees grow only as fast as the internet cares
      traineeBase: 6,          // plus a trickle — practice clips leak
      rivalPerPop: 10,         // rival idols coast on act popularity
      narrativeMult: 1.5,      // fancamStar / itGirl compound growth
      dormantMult: 0.25,       // nobody follows a silent act
      // event spikes (×jitter):
      viralSpike: 22000,
      breakoutSpike: 15000, breakoutPerReception: 400,
      debutSpike: 6000,
      rivalReleasePerReception: 150,
    },

    // ---- The rollout (v0.6.3): promotion as constrained choices ---------
    // Owner's rail, verbatim: "I shouldn't be able to send NUNITE to six
    // music shows, three variety programs, seventeen fan signs, Tokyo,
    // Los Angeles and fucking Mars in the same week." Two slots. Pick.
    ROLLOUT: {
      slotsPerWeek: 2,
      weeks: 4,                  // the promo window the plan covers
      emptyWeekRecovery: 4,      // a light week breathes a little
      encoreChance: 0.05,        // weekly, when a music show is scheduled
      challengeViralChance: 0.10, // weekly, when the challenge is running
      // the three weekly music shows are first-class bookings (v0.6.5):
      // same generic payoff plumbing, different stages, different wins
      ACTIVITIES: {
        countdown: { label: 'The Countdown', cost: 5, fatigue: 6, pop: 0.26,
          liveExp: 2.5, mediaExp: 0.6, morale: 0, followers: 600, show: true },
        primeStage:{ label: 'Prime Stage', cost: 4, fatigue: 6, pop: 0.22,
          liveExp: 2.8, mediaExp: 0.4, morale: 0, followers: 450, show: true },
        popWave:   { label: 'Pop Wave', cost: 3, fatigue: 5, pop: 0.20,
          liveExp: 2.2, mediaExp: 0.6, morale: 0, followers: 500, show: true },
        variety:   { label: 'Variety', cost: 3, fatigue: 4, pop: 0.10,
          liveExp: 0.3, mediaExp: 3.5, morale: 0, followers: 900 },
        radio:     { label: 'Radio', cost: 1, fatigue: 2, pop: 0.08,
          liveExp: 0.5, mediaExp: 1.5, morale: 0, followers: 250 },
        fanSign:   { label: 'Fan sign', cost: 3, fatigue: 4, pop: 0.08,
          liveExp: 0.3, mediaExp: 0.8, morale: 2, followers: 400, gracePerWeek: 2 },
        challenge: { label: 'Dance challenge', cost: 1, fatigue: 3, pop: 0.06,
          liveExp: 0.2, mediaExp: 0.8, morale: 0, followers: 1400 },
        livestream:{ label: 'Livestream', cost: 0, fatigue: 2, pop: 0.04,
          liveExp: 0.2, mediaExp: 1.0, morale: 1, followers: 800 },
        rest:      { label: 'Rest day', cost: 0, fatigue: -10, pop: 0,
          liveExp: 0, mediaExp: 0, morale: 1, followers: 0 },
      },
      // the staff suggestion: the friendly stage first, the big one once
      // the fanbase is counted, faces later — and the last week ends
      // gentle (v0.6.9): thank-yous and a live, half a breather
      DEFAULT: [['popWave', 'challenge'], ['countdown', 'variety'],
        ['primeStage', 'fanSign'], ['livestream']],
    },

    // ---- The music-show ecosystem (v0.6.5) ------------------------------
    // Three weekly shows with personalities. A win is computed among
    // everyone promoting that week — fandom votes, live command, and
    // freshness weighted per show. Wins mint trophies, encores, and
    // grudges. The national pool is above cable trophies by design.
    SHOWS: {
      // the broadcast stages host the national pool the week it drops —
      // the summit is defended on TV too. Pop Wave is the underdog door.
      countdown:  { fandomW: 0.50, liveW: 0.35, freshW: 0.15, floor: 46,
        nationalGuests: true,
        line: 'the Sunday institution — fandoms move armies for this one' },
      primeStage: { fandomW: 0.30, liveW: 0.55, freshW: 0.15, floor: 40,
        nationalGuests: true,
        line: 'the performers’ show — the camera does not cut away' },
      popWave:    { fandomW: 0.30, liveW: 0.30, freshW: 0.40, floor: 32,
        line: 'the cable upstart — new songs and new faces welcome' },
    },
    SHOWWIN: {
      winPop: 2,               // a trophy moves the fanbase
      winMorale: 2,
      winFollowers: 2500,      // per member, hash-jittered
      firstWinTrust: 3,        // the first trophy reaches the boardroom
      rivalPromoWeeks: 4,      // how long a rival release keeps them on stages
      jitter: 12,              // hash-driven weekly wobble in scores
      encoreChance: 0.35,      // after a WIN: the encore is live, no track
      encoreVocalsMin: 65,     //   — a real voice makes it a moment
      shakyEncoreChance: 0.2,  // after a win with a shaky room: a storm
      shakyLiveMax: 42,
      fairyChance: 0.12,       // weekly, per appearance: the ending fairy trends
      darlingAt: 7,            // wins on ONE show before it becomes a story (dynasty, not tenure)
    },

    // ---- The discourse (v0.6.2): interactive social media ---------------
    // Trending storms ignite from real events, grow or fade on their own,
    // and boil over if ignored at high heat. The company's response menu
    // is CONSTRAINED per kind — and ignoring is always legal, often right.
    DISCOURSE: {
      maxLive: 2,               // the internet can only care about so much
      fadeBelow: 15,            // heat under this = the feed moves on
      boilAt: 85,               // negative heat over this = it boils over
      weeklyDecay: 6,
      weeklyGrowth: [0, 12],    // hot storms feed themselves; cool ones die
      postChance: 0.85,         // chance/week a live storm posts to the feed
      boilPopHit: 4, boilMoraleHit: 6,   // the cost of losing the narrative
      statementCost: 2, legalCost: 3,    // PR hours are billable
      livestreamFatigue: 8,     // she gives the fans two hours of herself
      apologyPopCost: 2,        // conceding the story costs a little now
      memeFollowerGain: 9000,   // a meme that lands converts heat to reach
      KINDS: {
        exhausted: { label: 'overwork worry', negative: true, start: [30, 55],
          actions: ['statement', 'livestream'] },
        dating:    { label: 'dating rumor', negative: true, start: [35, 60],
          actions: ['statement', 'legal'] },
        styling:   { label: 'styling discourse', negative: true, start: [25, 45],
          actions: ['statement', 'meme'] },
        encore:    { label: 'encore clip', negative: true, start: [30, 50],
          actions: ['statement', 'apology', 'livestream'] },
        benched:   { label: 'health worry', negative: true, start: [25, 45],
          actions: ['statement', 'apology'] },
        fancam:    { label: 'fancam wave', negative: false, start: [30, 55],
          actions: ['meme', 'livestream'] },
        // 0.9.8.2: pre-debut virality is covers and leaked clips, not
        // fancams — she has no stages to film
        coverClip: { label: 'cover-clip wave', negative: false, start: [30, 55],
          actions: ['meme', 'livestream'] },
        // v0.6.8 — the posting incident: an idol's post reads wrong.
        // Delete-and-apologize, add context, or lean into the joke.
        gaffe:     { label: 'posting incident', negative: true, start: [22, 42],
          actions: ['apology', 'statement', 'meme'] },
      },
      // response base success; personality and context shift these
      baseSuccess: { statement: 0.55, apology: 0.8, legal: 0.7, meme: 0.5, livestream: 0.6 },
      legalBackfire: 0.25,      // Streisand is real
      // trigger chances
      exhaustedChance: 0.10,    // weekly, per promoting group at avg fatigue 75+
      encoreChance: 0.5,        // at release, performance < 45
      stylingChance: 0.35,      // at release, reception < 50
      fancamChance: 0.5,        // at spark/viral
      benchedChance: 0.6,       // at an overwork incident
      datingChance: 0.006,      // weekly, per idol with 50k+ followers
      datingMinSocial: 50000,
      gaffeChance: 0.004,       // weekly, per idol with a real following…
      gaffeTiredBonus: 0.008,   // …and tired people post carelessly (v0.6.8)
      gaffeTiredAt: 70,
      gaffeMinSocial: 20000,
    },

    // ---- The road (v0.6.8): tours ---------------------------------------
    // §22: "Cities, venue sizes, pricing, dates, rest days, production
    // budget, setlists. Undersell/oversell both visible and narrated.
    // Tours grow regional fandom and prestige, not just cash." A tour
    // is constrained choices: a scale you can fill, legs the map has
    // earned, a pacing with a human cost, a setlist with a point.
    TOUR: {
      legWeeks: 2, maxLegs: 4,
      restWeeks: 3,              // the post-tour rest rail (contractual)
      cooldownWeeks: 20,         // between tours — the road is not a lifestyle
      minPopularity: 30,         // nobody tours a debut with no fanbase
      SCALES: {
        clubs:  { label: 'Club halls',  costPerLeg: 8,  revBase: 18, sweetSpot: 18, fatiguePerWeek: 5 },
        halls:  { label: 'Theaters',    costPerLeg: 16, revBase: 38, sweetSpot: 38, fatiguePerWeek: 6 },
        arenas: { label: 'Arenas',      costPerLeg: 30, revBase: 75, sweetSpot: 60, fatiguePerWeek: 7 },
      },
      // demand/sweetSpot ratio decides the narration and the money
      soldOutAt: 1.35, softBelow: 0.75,
      soldOutRevMult: 1.15, softRevMult: 0.55,
      PACING: {
        punishing: { label: 'Punishing', costMult: 1.0,  fatigueMult: 1.3 },
        humane:    { label: 'Humane',    costMult: 1.3,  fatigueMult: 0.85 },
      },
      SETLISTS: {
        hits:        { label: 'The hits',     revMult: 1.08 },
        newMaterial: { label: 'New material', nextReleaseHype: 3 },
        fanService:  { label: 'Fan service',  moralePerLeg: 2, regionMult: 1.2 },
      },
      regionGainPerLeg: 8,       // touring grows the region (saturating)
      soldOutRegionBonus: 4,
      soldOutMorale: 2, softMorale: 3,   // (soft is a hit, not a bonus)
      liveExpPerWeek: 3,
      leaderLeadershipAt: 60,    // a real leader runs the room on the road
      leaderFatigueMult: 0.88,
      weakLeaderFrictionChance: 0.3,  // per leg, when nobody runs the room
      // the home circuit (v0.9.4): the KR leg is a routed national tour,
      // not one show — Seoul always, then every city whose room the
      // promoter believes the fanbase can fill at this scale. Cities
      // whose pre-sales blow past the ceiling get a SECOND NIGHT.
      KR_CITIES: [
        { id: 'seoul',   label: 'Seoul',   w: 1.00 },
        { id: 'busan',   label: 'Busan',   w: 0.80 },
        { id: 'incheon', label: 'Incheon', w: 0.70 },
        { id: 'daegu',   label: 'Daegu',   w: 0.62 },
        { id: 'gwangju', label: 'Gwangju', w: 0.55 },
        { id: 'daejeon', label: 'Daejeon', w: 0.52 },
      ],
      datesPerWeek: 2,           // two stages a week is a schedule, not a stunt
      maxKrDates: 9,             // routed dates + earned encores, capped
      encoreRevMult: 0.85,       // the second night sells a shade under the first
    },

    // ---- The society (v0.9.4): the industry has waiting rooms -----------
    SOCIETY: {
      friendChance: 0.2,         // per promo week, further gated by warmth
      maxFriends: 12,
      quietWeeks: 5,             // formation spacing — friendships take time
      coffeeTruckChance: 0.5,    // a friend marks your opening week
      congratsChance: 0.5,       // your idol congratulates a friend's release
      congratsQuietWeeks: 8,
      seniorStanWindow: 12,      // weeks after debut a senior might notice
      seniorStanChance: 0.18,    // per week inside the window, once per group
      seniorMinAge: 96,          // an act two years older counts as senior
      cohortWeek: 45,            // award season: the debut class resurfaces
      friendMorale: 2, truckMorale: 2, stanMorale: 3,
    },

    // ---- The fan feed (v0.4.0→v0.6.3): a real feed, never cruel ---------
    FEED: {
      maxPosts: 80,
      weeklyMax: 8,              // a timeline you check every week (v0.7.3)
      weeklyMin: 5,              // v0.6.3 floor, raised with the v0.7.3 volume
      ambientChance: 0.55,       // chance of ambient fan chatter in a quiet week
      hypePostMin: 35,           // trainee hype level the feed starts noticing
      viralChance: 0.08,         // a post occasionally escapes containment
      quoteChance: 0.3,          // the timeline talks to itself (v0.9.7)
    },

    // ---- The credits (v0.9.7) -------------------------------------------
    CREDITS: {
      producerCount: 6,          // the persistent pool: the scene's writers' room
      laneStickiness: 0.6,       // producers mostly pitch their home lane
      worksCap: 12,              // track record depth per producer
      signatureAt: 3,            // releases together = a signature sound
      ghostHookMin: 62,          // a rejected demo this good gets shopped
      ghostCap: 6,
      ghostAgeWeeks: 10,         // the shopped demo takes time to resurface
      ghostChance: 0.25,         // per week, per eligible rival hit
      ghostHitAt: 60,            // it only becomes the ghost story if it HITS
      writeChance: 0.22,         // per b-side, when a writer is in the room
      writeCreativityAt: 70,     // creativity that reaches for a pen
      writeCapPerRecord: 2,
      gradMoraleBonus: 2,        // school milestones: the gown photo
    },

    // ---- The fandom era (v0.7.0) ----------------------------------------
    // §22 phases shipped together because they interlock: a fandom with
    // a NAME has intensity; intensity mobilizes for shows, buys records,
    // defends against storms; brands chase the faces; award season reads
    // the whole year and hands out trophies — and radicalizing snubs.
    FANDOM: {
      nameAt: 35,               // popularity before the fan cafés hold the vote
      intensityDecay: 0.2,      // devotion cools without care
      gainFanSign: 2, gainLivestream: 1, gainFanServiceLeg: 3,
      gainSoldOut: 2, gainShowWin: 1,
      showVoteFactor: 0.1,      // show score bonus = intensity × this
      revenueFactor: 1 / 400,   // release revenue × (1 + intensity × this)
      stormDefenseAt: 60,       // an intense fandom cools storms…
      stormDefenseCool: 2,      // …by this much extra per week
      snubGain: 6,              // nothing radicalizes like a snub
      COLORS: ['pearl violet', 'coral rose', 'midnight teal', 'champagne gold',
        'arctic mint', 'garnet red', 'moonstone grey', 'electric periwinkle'],
    },
    DEALS: {
      offerBaseChance: 0.04,    // weekly, once anyone is famous enough
      minSocial: 40000,         // brands want reach
      itGirlBonus: 0.06,        // the narrative does the selling
      lump: [6, 14], weekly: [1, 2], weeks: [12, 20],
      expiresWeeks: 3,          // offers do not wait
      shootFatigue: 2,          // monthly, the shoots are real work
      scandalPenaltyMult: 0.5,  // a cancelled deal claws back half the lump
      maxActive: 3,             // the market has limits
      brandDarlingAt: 2,        // deals before the narrative forms
      CATEGORIES: ['cosmetics', 'fashion house', 'soft drink', 'tech', 'jewelry', 'sportswear'],
      BRANDS: ['Léore', 'Maison Vue', 'Bombora', 'Nexel', 'Clair de Terre', 'Volt Athletics',
        'Aurum Beauty', 'Peau', 'Fizzi', 'Hyperion Mobile', 'Lumière Seoul', 'Stride'],
    },

    // ---- The second job (v0.9.11): individual careers -------------------
    // Productions call for the idols whose SECONDARY strengths the market
    // wants: a panel seat for the funny one, an MC mic for the poised one,
    // an OST for the voice. The gig pays the person, not the group — and
    // it collides with the group calendar, which is the whole system.
    GIGS: {
      offerBaseChance: 0.09,     // weekly, when anyone qualifies
      naturalBonus: 0.06,        // a variety natural in the building attracts calls
      expiresWeeks: 3,           // productions do not wait either
      maxActive: 2,              // company-wide; the schedule is finite
      // eligibility: the market reads the derived stats, not the résumé
      panelSkillMin: 60,         // varietySkill — the funny one
      mcPoiseMin: 62,            // stagePresence — the poised one
      mcPopMin: 50,              // MC seats go to names the public knows
      ostVocalsMin: 70,          // the voice
      minSocial: 15000,          // productions want SOME reach
      // the runs
      panelWeeks: [10, 16], panelWeekly: [2, 4],
      mcWeeks: [16, 24], mcWeekly: [4, 6],
      ostWeeks: 3, ostLump: [18, 32],       // recording, then the drop
      gigFatigue: 2,             // a second job is a second job
      clashFatigue: 3,           // ...and busy group weeks stack on top of it
      clashMissChance: 0.25,     // per busy week: the van does not make the taping
      strainRecastAt: 3,         // missed tapings before the production recasts
      recastMorale: 6,           // being quietly replaced stings
      quitMorale: 4,             // being pulled out by the company also stings
      followerDrip: 900,         // every other week on air, hash-jittered
      mediaExpEvery: 2,          // weeks per +1 mediaExp — the loop feeds varietySkill
      completePop: 1,            // the group feels the individual shine
      ostHitAt: 74,              // reception that makes the OST "everywhere"
      varietyMonsterAt: 2,       // completed panel arcs before the narrative
      ostVoiceAt: 2,             // OST drops before the narrative
      SHOWS: ['Weekly Antenna', 'Midnight Common Room', 'The Grocery Run', 'Panic Quiz Club',
        'Off-Duty', 'The Long Lunch', 'Homework Hotel'],
      DRAMAS: ['Paper Moon District', 'The Winter Clinic', 'Four Families', 'Signal Garden',
        'Dusk Patrol', 'My Landlord the Ghost'],
    },
    AWARDS: {
      nominationWeek: 44,       // of the 48-week year
      ceremonyWeek: 47,
      nomineeCount: 3,          // per category, the short list
      winTrust: 3,
      winPop: 3,
      jitter: 6,                // hash-driven ceremony-night wobble
      // the ladder (v0.9.5): the categories are bonsangs — several, and
      // genuinely attainable. Above them sits ONE daesang, and it is
      // brutal: the whole year, weighed once.
      categories: ['rookie', 'song', 'artist'],
      LABELS: { rookie: 'Rookie of the Year', song: 'Song of the Year', artist: 'Artist of the Year',
        daesang: 'DAESANG — Grand Prize of the Year' },
      daesangTrust: 5, daesangPop: 5, daesangFandom: 6,
      snubAgainMult: 2,         // "a bonsang, again" — the radicalizer, doubled
      // v0.9.8: a debut-year act must be UNDENIABLE to take the grand
      // prize — inside this margin the jury defaults to a body of work
      rookieDaesangMargin: 8,
    },

    // ---- The year (v0.9.5): the calendar has a shape --------------------
    SEASON: {
      deadZoneWeeks: [1, 4],     // January: the industry sleeps
      deadZoneMod: -3,
      festWeeks: [16, 20],       // spring university festival circuit
      festPopRange: [25, 62],    // mid-tier acts get the calls
      festPayBase: 10, festPayPerPop: 0.2,
      festLiveExp: 2, festFatigue: 3,
      summerWeeks: [24, 33],     // song-of-the-summer season
      summerBrightLift: 4,       // bright concepts, in season
      gayoInviteWeek: 46,        // year-end gayo invitations land
      gayoStageWeek: 48,         // the stages themselves
      gayoPopAt: 55,             // invitation is by popularity, period
      gayoMorale: 2,
      gayoCollabChance: 0.5,     // a friendship becomes year-end television
    },

    // ---- Genre-bending (v0.9.6, owner's request) ------------------------
    // "if I want a k-metalcore group, I should be able to do it...
    // extremely high risk high reward. could be critically acclaimed but
    // unpopular, could flop, could change the industry. all on the table."
    FUSION: {
      // the standards first (0.9.6.1 — "we overlooked the obvious
      // genres lol"): half the point is mashing a standard K-pop genre
      // with a strange one. K-pop × metalcore is now literally on the menu.
      GENRES: ['pop', 'hip-hop', 'dance', 'rock', 'ballad', 'R&B', 'EDM',
        'metalcore', 'trot', 'jazz', 'drill', 'city pop',
        'hardcore punk', 'folk', 'industrial', 'orchestral',
        'disco', 'shoegaze', 'bossa nova'],
      // outcome weights, tilted by the room's creativity (avg/100):
      // creative rooms shift weight from flop toward acclaim and shift
      shiftBase: 0.06, shiftPerCreativity: 0.06,   // changed the industry
      acclaimBase: 0.18, acclaimPerCreativity: 0.10, // critics' darling, public shrug
      flopBase: 0.30, flopLessPerCreativity: 0.12,   // the mash ate itself
      // "worked" takes the remainder — the gamble pays modestly
      shiftReceptionMin: 84,     // an industry-shift lands at least here
      acclaimReceptionCap: 45,   // acclaimed-but-unpopular caps the charts
      flopReceptionCap: 26,
      workedLift: 6,
      acclaimFandomGain: 6,      // the devoted love being right early
      acclaimTrust: 2,
      shiftPop: 8, shiftFandomGain: 8,
      flopMorale: 3,
    },

    // ---- The founding (v0.9.9, Phase C opens) ---------------------------
    // Owner: "I'm not the CEO, I work below them... option, after your
    // reputation is high enough, to leave and start your own label.
    // completely fresh start, going up against what you built."
    FOUNDING: {
      trustAt: 70,             // the exec must trust you this much to make leaving mean something
      minYears: 2,             // nobody funds a rookie A&R's label
      seedBase: 60,            // what any credible founder raises
      seedPerDaesang: 50,      // the war chest is your career, liquidated
      seedPerBonsang: 15,
      seedPerNatOne: 25,
      seedPerTrophy: 1.5,
      seedPerYear: 6,
      seedCap: 320,
      newTrust: 55,            // investors believe in you — provisionally
      deadlineWeeks: 72,       // prove it again: first debut inside 18 months
    },

    // ---- The constituency (v0.9.6) — the fandom acts on YOUR decisions --
    CONSTITUENCY: {
      intensityAt: 55,           // organized enough to rent a truck
      truckChance: 0.5,          // per grievance, when organized
      quietWeeks: 10,            // between actions — outrage has logistics
      grievanceWindow: 3,        // weeks a grievance stays truck-worthy
      concedeCost: 20,           // catering, statements, the walked-back plan
      fanMeetingCost: 25,        // the fan meeting: a real event
      fanMeetingFandomGain: 5,
      fanMeetingMorale: 2,
      lightstickPopAt: 45,       // the launch: a fandom this warm sells one
      lightstickCost: 35,
      lightstickRevenue: 60,     // it sells out — that is what lightsticks do
      lightstickFandomGain: 6,
    },

    // ---- The inner life (v0.7.1) ----------------------------------------
    // Expert consult, distilled: the feed had no people in it, the idols
    // never spoke and wanted nothing, and knowing your own roster was
    // never tested. Facts are hash-truth; the Bubble leaks the numbers
    // the sim already computes; the regulars remember; the dorm makes
    // chemistry domestic; ambitions make morale psychology; the Monday
    // meeting makes reading your people the job.
    LIFE: {
      bubbleChance: 0.07,        // weekly, per idol — screenshots travel
      roomDriftMult: 1.5,        // roommates amplify chemistry both ways
      roomShuffleCost: 2,
      roomShuffleCooldown: 8,
      regularShare: 0.35,        // feed posts voiced by the recurring cast
      varietyAmbitionAt: 8,      // variety weeks before that dream is real
      ambitionMoraleBonus: 8,    // the day the dream lands
      ambitionTouchBonus: 1,     // weeks that feed the dream feel different
      FACTS: [
        'has a small dog the entire fandom knows by name',
        'is a menace in online games under an alias nobody has cracked',
        'cooks for the dorm every Sunday without being asked',
        'collects film cameras and shoots the members constantly',
        'keeps plants on the dorm windowsill and names all of them',
        'is one of four siblings and calls home after every stage',
        'can win any crane game in one try, witnesses confirm',
        'reads webtoons until 3am and reviews them at breakfast',
        'goes to the aquarium alone on rest days',
        'was a church-choir kid and still hums harmonies in vans',
        'is the dorm’s unofficial barista with strong opinions',
        'does thousand-piece puzzles during comeback prep to stay calm',
        'learned to skateboard in the company parking garage at night',
        'keeps a running ranking of every convenience-store snack, updated weekly',
        'writes letters to {pos} future self and mails them to {pos} mom for safekeeping',
        'can identify any song from the first second, a party trick with a 94% record',
        'sews and has quietly repaired half the group’s stage outfits',
        'is terrified of butterflies and completely unashamed about it',
        'memorizes the staff’s birthdays and is never wrong',
        'has a green belt in judo {she} brings up exactly once per interview',
        'narrates nature documentaries over muted broadcasts, voices and all',
        'buys two of every book — one to annotate, one to keep clean',
        'is banned from the claw machine at one specific arcade, by name',
        'does the group’s taxes conceptually, for fun, and is worryingly good',
        'has never once lost at rock-paper-scissors on a broadcast',
        'keeps a jar of bad-day notes from fans and reads one when {she} needs it',
        'grew up on an island and can gut a fish faster than the cooks',
        'speaks three languages and eavesdrops in all of them',
        'has adopted every stray cat within a block of the company building, socially',
        'runs at 6am and has a route named after {her} by the neighborhood aunties',
        'collects hotel key cards from every tour city, labeled and dated',
        'once fixed the practice-room speaker with a hairpin and refuses to explain',
        'draws caricatures of the members that are too accurate to publish',
        'knows the bus network of the entire capital by heart and misses riding it',
      ],
      // v0.7.5: one ambition, several ways the staff have noticed it —
      // the note hash-picks a phrasing per person, so two idols who
      // want the same thing do not read as the same person
      AMBITIONS: {
        solo:    { label: 'a stage of {pos} own', lines: [
          '{she} wants a solo. Everyone who has watched {her} rehearse alone after practice knows it.',
          '{she} keeps a private playlist labeled only with {pos} own initials. The A&R team has theories. The theories are correct.',
          'when the members divide up lines, {she} counts {hers} twice — not out of greed. Out of wanting a song where the count is all of them.',
        ] },
        trophy:  { label: 'a music-show trophy', lines: [
          '{she} wants a trophy in {pos} hands — {she} has rewatched other groups’ win announcements more than their stages.',
          '{she} practices an acceptance-speech face in the van window when {she} thinks no one can see. Everyone can see.',
          '{she} knows the exact broadcast-point formula of every music show, from memory, unprompted. Nobody studies that for fun. {She} would say it is for fun.',
        ] },
        stage:   { label: 'a sold-out room', lines: [
          '{she} wants a sold-out room singing {pos} lines back. The bigger the better.',
          'venues are the only numbers {she} remembers — capacities, not chart positions. Ask {her} what the biggest room in any city is. Go on.',
          'at other artists’ concerts {she} watches the crowd, not the stage. Staff stopped asking why.',
        ] },
        variety: { label: 'a seat at the variety table', lines: [
          '{she} wants to be the funny one on the panel shows — and {she} is right about being good at it.',
          '{she} times {pos} jokes to the second in dorm conversations and studies which ones land. This is a professional practice regimen wearing pajamas.',
          '{she} can name every fixed panelist on television and which chair they sit in. {She} has a chair picked out.',
        ] },
      },
      REGULARS: [
        { handle: '@fromthebarricade', persona: 'fan' },
        { handle: '@chartseyes_kr',    persona: 'press' },
        { handle: '@biaswrecked_gg',   persona: 'stan' },
        { handle: '@formerstan_txt',   persona: 'anti' },
        { handle: '@fourthgenfiles',   persona: 'casual' },
        { handle: '@lightstickrepair', persona: 'fan' },
        // the timeline grows (v0.7.3) — a fandom is mostly its regulars
        { handle: '@subwayadfund',     persona: 'fan' },
        { handle: '@dawnpatrol_gg',    persona: 'fan' },
        { handle: '@voteguide_arch',   persona: 'stan' },
        { handle: '@encorewatcher',    persona: 'stan' },
        { handle: '@idontevenstan',    persona: 'casual' },
        { handle: '@heardinhongdae',   persona: 'casual' },
        { handle: '@quietlyunwell',    persona: 'anti' },
        { handle: '@deskwatch_ent',    persona: 'press' },
      ],
      // idol posting moments (v0.7.3) — all hash-gated, all wholesome
      selcaEveryWeeks: 4,        // monthly selca day, industry-wide
      selcaSpike: 1200,
      birthdaySpike: 3000,
      birthdayMorale: 2,
      birthdayAdIntensity: 50,   // a devoted fandom funds the subway ad
      liveClipChance: 0.35,      // a livestream week leaves a clip behind
      biasBreakupWeeks: 8,       // a heartbroken regular stays unbiased a while
    },
    // ---- The tracklist (v0.7.5) — the record is more than its title ----
    TRACKS: {
      openSlots: { single: 0, mini: 1, full: 2 },   // credit slots the player assigns
      minMembersForUnits: 3,     // a duo's "unit" is just the group
      unitSize: [2, 3],          // members per unit track
      maxCreditsPerMember: 1,    // one special credit per record — spread the light
      soloSocialSpike: 2600,     // her name on her own track travels
      soloHype: 6,
      soloMorale: 5,
      unitMorale: 3,             // both/all unit members feel seen
      unitCloseBonus: 4,         // a close pair's unit cuts DEEPER (morale, both)
      sleeperChance: 0.22,       // one b-side may quietly outgrow the record
      sleeperPop: 2,             // the truthers move the number a little
      sleeperReceptionMin: 55,   // nobody digs into a record nobody played
    },
    // ---- The stage door (v0.8.0) — scenes, claims, directed acts --------
    SCENES: {
      maxResolvedClaims: 10,     // settled promises kept for the record
      directedCap: 40,           // per-person ledger of what YOU did
      directedHalfLifeWeeks: 48, // kindnesses fade, wounds heal — slowly
    },
    // ---- Standing & scars (v0.8.3) --------------------------------------
    SCAR: {
      weeks: 8,                  // a boiled storm shadows her this long
      recoveryMorale: 4,         // the loud welcome-back
      quietRecoveryMorale: 2,    // the quiet one — smaller, still real
      sincerityGate: 0.08,       // standing moves whether apologies READ as real
      leaderEase: 1,             // a trusted leader absorbs promo grind for the room
      leaderEaseStanding: 3,     // ...if her standing has earned the followership
    },
    ANNIV: {
      morale: 2,                 // the anniversary vlive does everyone good
      spike: 1800,               // N-years hashtags travel
    },
    // ---- Contracts & the clock (v0.9.0) ---------------------------------
    CONTRACT: {
      years: 7,                  // the standard exclusive term, from debut
      renewalAtYears: 5,         // the table opens two years out
      spacingWeeks: 6,           // one renewal conversation at a time
      sweetenCost: 30,           // making the devoted feel it
      termsCostBase: 40,         // real terms for the professional
      termsCostPerFame: 12,      // leverage: her fame prices her signature
      holdLeaveChance: 0.5,      // holding the line on the strained is a coin
      changeMindChance: 0.25,    // the gone rarely turn back — standing helps
      departPopHitWarm: 4,       // a warm goodbye still costs the room
      departPopHitCold: 9,       // a cold one costs more
      departMoraleWarm: 4,
      departMoraleCold: 7,
      friendGrief: 3,            // close friends take departures hardest
    },
    // ---- The building (v0.8.4) — staff, taste, board season -------------
    BUILDING: {
      poachPopMin: 45,           // rivals hire from winners
      poachTenureMin: 20,        // a manager worth poaching has history
      poachChance: 0.04,         // weekly, when a target exists
      poachCooldown: 30,         // rare enough to hurt
      counterCost: 25,           // keeping her costs real money
      poachMorale: 3,            // losing her costs the members
      boardWeek: 46,             // the year answers for itself
      petAfterWeek: 60,          // the pet project waits for a real company
      petChance: 0.06,           // weekly, once eligible — once per career
    },
    // ---- The office door (v0.8.2) — idols initiate ----------------------
    DOOR: {
      globalCooldownWeeks: 5,    // at most one knock every ~5 weeks — memorable, not inbox
      personCooldownWeeks: 16,   // she does not knock twice a season
      expireWeeks: 3,            // how long she waits for an answer
      knockChance: 0.55,         // weekly, when someone is eligible and the door is quiet
      askAfterWeeks: 30,         // ambition unmet this long past debut → she asks
      askPromiseWeeks: 48,       // "within the year" — the claim window
      promiseMorale: 6,          // a plan means everything
      deflectMorale: -3,
      expireMorale: -2,          // waiting and hearing nothing
      breatherFatigue: -14,      // the granted rest week actually rests
      breatherCost: 5,           // the schedule shuffle has a price
      coachTalkMorale: 4,
      pushThroughMorale: -3,
      // moment-choice scenes (persona teeth): small, honest effects
      restDayFatigue: -8, restDayCost: 3,
      coachOverCost: 2, coachOverMorale: 3,
    },
    MEETING: {
      everyWeeks: 10,            // the Monday meeting cadence
      claimWindow: 40,           // "closest to ready" gets this long
      quarterWeeks: 12,          // "this quarter" means this quarter
      payoffTrust: 2, missTrust: -2, silenceTrust: -1,
      ignoreAfterWeeks: 4,       // an unanswered question is an answer
      maxNotes: 6,
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
