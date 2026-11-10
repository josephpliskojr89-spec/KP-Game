/* K-Pop Agency Manager — central tuning constants.
   Every number the simulation uses lives here, not in UI code.
   Owner's law: no visible Overall rating — the scale below is internal only. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  KP.C = {
    VERSION: '0.11.19',

    // ---- Calendar: 4-week months, 48-week years -------------------------
    WEEKS_PER_MONTH: 4,
    WEEKS_PER_YEAR: 48,
    MONTH_NAMES: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

    // ---- Internal talent scale (never shown to the player) --------------
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
    // the growth bands (v0.11.5, §96 wiring): "Since debut" printed the
    // hidden scale's raw deltas (§96 slip 9 — "Vocals +7"); the file now
    // says a step / a rung / a flight, up or down, never the digits. Edges
    // are |Δ| on the 0–100 talent scale (v0.11.5, §96 wiring — measure-first)
    GROWTH_BANDS: [
      { max: 2, word: 'a step' },       // |Δ| 1–2
      { max: 5, word: 'a rung' },       // |Δ| 3–5
      { max: 100, word: 'a flight' },   // |Δ| 6+
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
      maleCastingShare: 0.60,  // a posted boys' audition fills with boys (0.9.26.1)
    },

    ARCHETYPES: [
      'naturalVocalist', 'performanceAce', 'centerCandidate', 'lateBloomer',
      'workhorse', 'producerMinded', 'varietyNatural', 'glassSpirit',
      'slowBurner', 'quietProfessional',
    ],

    // ---- Scouting -------------------------------------------------------
    SCOUT: {
      // the dated report (0.9.16.3, owner rethink of the .2 ladder):
      // everything shows from the first report — wearing a question mark
      // until somebody actually GOES — and one targeted look is expensive
      // but lands most of the accuracy. Reads are snapshots taken at the
      // look; prospects keep training at their academies, so an old
      // report goes stale and a repeat trip is a real choice.
      baseReadWidth: 18,          // +/- fog on the desk report (the "?" width)
      firstLookFactor: 0.4,       // one look collapses the fog to ~40%
      widthPerObservation: 1,     // repeat looks polish, barely
      minReadWidth: 5,            // certainty is never perfect
      observeCost: 12,            // a real trip costs real money now (was 4)
      maxObservations: 5,         // fog floor after five; looks stay repeatable
      boardGrowth: 0.09,          // weekly avg trained-skill drift on the board
      boardGrowthLane: 2.2,       // ...times this in a school kid's lane
      instinctNoteChance: 0.12,   // rare gut-call scout note on high hidden charisma
      // v0.4.3, owner: "more aggressive in signing talented trainees"
      rivalSignBaseChance: 0.09,  // weekly chance an interested rival signs a prospect
      rivalSignHotChance: 0.25,   // ...when interest is hot
      rivalHungerMult: 1.7,       // ...and hungrier still with a debut to cast
      rivalHungerWindow: 16,      // weeks before a planned debut that hunger starts
      prospectAgeOut: 24,         // unsigned past this, the market moves on (0.9.13)
    },

    SOURCES: [
      'Dance academy', 'Vocal academy', 'Street casting', 'Social media',
      'School performance', 'Open audition', 'Referral',
    ],

    // ---- The title fight (v0.9.17): the pitch meeting gets politics ----
    // Demos arrive with ADVOCATES: one producer campaigns for his track,
    // the exec's known taste sits on the table, and a member who writes
    // sometimes pitches her own against the professionals'. Every pick
    // is also a pass, and the passed remember.
    PITCH: {
      memberDemoChance: 0.4,     // a writer in the room brings her own sometimes
      memberHookShift: -4,       // her demo runs wilder: lower floor...
      memberHookSd: 9,           // ...bigger spread — raw, or special
      pickMorale: 8,             // you chose HER song over the professionals'
      passMorale: -4,            // her song left on the table, at a real lock
      snubsAt: 2,                // two passed pushes and the producer cools
      snubHookMalus: 6,          // his next pitches to this room arrive B-grade
      execPassNoteAt: 3,         // the third pass on her taste draws a remark
    },

    // ---- The gravity (v0.9.18): individual-trajectory rails ------------
    // §55.2: a member who begins to transcend her group draws a CLAMOR
    // from every voice the game has — staged, resolvable, and costly to
    // ignore. The same rails read downward: the slump.
    GRAVITY: {
      transcendAt: 24,           // the read that starts the conversation
      holdWeeksToClamor: 4,      // it has to be a pattern, not a spike
      minMembers: 3,             // a duo's math is different; solos exempt
      splitStage: 3,             // the fandom divides into camps
      execStage: 6,              // the Monday meeting asks
      knockStage: 10,            // she rehearsed this ask
      sponsorMult: 3,            // clamor makes the brand call likelier (§55.1)
      resentEvery: 6,            // held past the exec stage, the clock ticks
      resentMorale: -2,
      soloPromiseWeeks: 30,      // "a solo is happening" needs a date
      settleMorale: 8,           // the credit lands and the room exhales
      settleFandom: 3,
    },
    SLUMP: {
      enterMoraleBelow: 42,      // the nerve goes when everything else has
      enterConfidenceBelow: 45,
      enterChance: 0.08,         // weekly, when the conditions align
      damp: 0.82,                // stage presence and live reliability, dimmed
      pushConfidence: -1,        // promoting through it costs weekly
      shieldWeeks: 8,            // the quiet era
      shieldRecovery: 1.5,       // confidence per shielded week
      shieldPerformance: -3,     // the group's next stage misses her
      talkMorale: 4,             // a friend saying it out loud helps
      exitConfidence: 55,        // the nerve returns
      exitWeeksMax: 16,          // or time does what time does
      winExits: true,            // a trophy while slumping ends it NOW
    },
    // group identity arcs: repeated behavior mints a narrative that
    // changes how the invitations arrive
    ARCS: {
      festivalIconsAt: 6,        // festivals played (3→6 in v0.9.22: the
                                 // named circuit offers up to three a year
                                 // — the identity should take seasons)
      varietyGroupAt: 3,         // gig runs wrapped across the lineup
      varietyOfferBoost: 1.6,
      ostFactoryAt: 2,           // OSTs dropped across the lineup
    },

    // ---- The MV (v0.9.17): the video is an object with a budget --------
    // Costs scale with stature (a big act's video bills like one).
    MV: {
      // the standard video was always implicitly in the promo budget —
      // priced as DELTAS so the default bill never moves: plain refunds
      // (skipping the shoot saves real money), cinema is the premium
      TIERS: {
        plain:    { label: 'performance cut', cost: -12, reception: -2 },
        standard: { label: 'standard MV',     cost: 0,   reception: 0 },
        cinema:   { label: 'cinema budget',   cost: 45,  reception: 4 },
      },
      cinemaSpikeMult: 1.6,      // a blockbuster video travels
      cinemaOverseas: 2,         // ...literally: the map warms a touch
      plainSnarkChance: 0.5,     // the internet notices a budget (at the company)
    },

    // ---- The repackage (v0.9.17): the era extends ----------------------
    // A warm era re-releases with a new title track — one of the demos
    // you passed on, back from the table. Cheaper, shorter, and it rides
    // the era's heat. Once per era; singles don't repackage.
    REPACKAGE: {
      windowWeeks: 6,            // after promo ends, while the era is warm
      costMult: 0.55,            // the record exists; the reprint is cheaper
      minPrep: 2,
      promoWeeks: 3,             // a shorter cycle than a full comeback
      carryFrom: 60,             // a hot era lifts the repackage...
      carryFactor: 0.15,         // ...by this share of the era's reception
      revenueMult: 0.75,         // reprints sell real, not full
      tracks: 3,                 // new title + two new b-sides on the reissue
    },

    // The era, closed (v0.11.9, §100 — measure-first). The week promotion
    // ends the desk reads the era back, and the reissue becomes a door.
    ERA: {
      closeMoraleUp: 3,          // a crowned era lifts the room (v0.11.9, §100 — measure-first)
      closeMoraleDown: 2,        // a missed one sits on it
      roomSpentAt: 70,           // average fatigue at the close: the room is spent...
      roomTiredAt: 45,           // ...or merely tired; below, fresh
      restRelief: 8,             // "let it rest": fatigue handed back to the room
      fansPickFandom: 2,         // the cafés were heard (fandom intensity)
      // The pre-order word has NO thresholds here, on purpose: it is the
      // settle's own verdict on an ordinary week (sold out, or the
      // warehouse at PRODUCT.overpressAt). The first build carried two
      // (preorderAheadAt 1.0, preorderSoftAt 0.7) on a different sum, and
      // the soak read 569 of 665 landings 'ahead' and none 'soft'.
    },

    // The long goodbye (v0.11.10, §101 — measure-first). A chosen ending is
    // a lap with a date on it. The member desk asks once how the fans are
    // told, and both answers cost: told now, the last era is an event and
    // every record before it is a countdown; kept in the house, the year
    // stays about the work and everything rides on the last era happening.
    FAREWELL: {
      askMinWeeks: 8,            // the question is not asked with fewer weeks than this left
      toldIntensity: 5,          // told now: the cafés rally (fandom intensity)...
      toldPopHit: 2,             // ...and the casual audience starts counting down (subtracted)
      toldMorale: 2,             // hers: she said it herself
      lastEraWeeks: 24,          // a record landing this close to her last week is her last era
      eraReach: 3,               // the last era lands warmer (reach)...
      eraPerWeek: 0.1,           // ...and warmer for every week the fans have known...
      eraCap: 4,                 // ...up to this much on top
      eraIntensity: 3,           // the last era belongs to the fandom
      shadowReach: 2,            // a record inside an announced countdown, before the last era (subtracted)
      suddenPopHit: 3,           // nobody was told before she left: on top of the warm hit
      suddenGrudge: 1,           // ...and the fandom remembers who knew
      brokenRoomMorale: 3,       // a promised ending that never came: the room watched (subtracted)
      bowRoomMorale: 2,          // the bow gives the room some of its grief back
      memorialYears: 3,          // a concluded group's fandom keeps the debut date this long
    },

    // The last bow (v0.11.11, §102). How an act ends is a choice of three
    // doors. The quiet statement is the one the game always had and it
    // keeps its price (DISBAND). One last concert costs a room and pays a
    // till, and the act concludes that night. A farewell record is
    // announced, made, promoted, and the act concludes when that era
    // closes. What the door leaves behind is on the shelf: a fandom that
    // was given a goodbye keeps the catalog warm for years.
    ENDING: {
      concertCostMult: 2,        // the last night books a bigger room than a fancon...
      concertTillMult: 2.5,      // ...and sells it out
      concertFatigue: 8,         // one long night
      concertMorale: 4,          // what it costs the people in it (the statement costs DISBAND.morale)
      recordWeeks: 30,           // announced: the last record must be locked inside this many weeks
      recordIntensity: 6,        // the announcement rallies the fandom
      recordReach: 4,            // the last record lands warmer (reach)...
      recordPerIntensity: 0.04,  // ...and warmer for an organized fandom...
      recordCap: 3,              // ...up to this much on top
      recordMorale: 2,           // they got a last era: this door costs the room least
      trustPlanned: -3,          // the board prices a planned ending of an act that sells (the statement is DISBAND.trustSelling)
      lapseTrust: -8,            // a last record announced and never made: upstairs reads a company that cannot plan
      lapseMorale: 6,            // ...and the room pays on top of the statement
      glowWeeks: 144,            // three years of a warm shelf
      glowConcert: 0.25,         // the catalog annuity's lift after a last night...
      glowRecord: 0.5,           // ...and after a last era
    },

    // Across the street (v0.11.12, §103). A departed artist's file stayed
    // open forever and nothing was ever written in it again. She has a next
    // chapter now, on a clock of her own: another house signs her as a
    // soloist and she debuts there, against the company she left, or she
    // builds a life outside the industry and the file says which. How she
    // left decides the tone, and the tone has one small consequence.
    ACROSS: {
      waitMin: 12, waitMax: 40,  // weeks after she leaves before the next chapter is written
      signBase: 0.4,             // the chance another house signs her...
      signPerFame: 0.12,         // ...per step of her own name (0-4, the renewal table's fame)...
      coldBonus: 0.15,           // ...and likelier when leaving was not her idea
      ageFrom: 27, agePerYear: 0.06,   // the market's clock, from this birthday on
      starFame: 2,               // a name this big signs with the top half of the street
      debutMin: 6, debutMax: 16, // weeks from the signing to her first record there
      seedPop: 18, seedPerFame: 12,    // she does not debut as an unknown
      trustBow: 1,               // she thanked the company by name: the board read it
      trustCold: -2,             // the announcement did not mention the company: the board read that too
      grudgeSudden: 1,           // the fandom of the act she left remembers how she had to go
      friendMorale: 2,           // a close friend still in the building, on her debut day
    },

    // ---- The regional schools (v0.9.16): the pipeline has addresses ----
    // Persistent named academies in the home circuit's cities. Each has a
    // specialty lane, an alumni ledger, and a reputation that moves with
    // its graduates' careers. When casting opens — yours or a rival's —
    // the schools submit their classes, and everyone fishes the same
    // ponds. Player verbs: the scouting trip and the partnership.
    SCHOOLS: {
      startRep: [35, 60],        // day-one reputations, before anyone graduates
      baseRep: 45,               // where reputation drifts absent news
      repDrift: 0.08,            // weekly pull toward the base — fame fades
      repDebut: 4,               // an alum on a debut stage
      repViral: 2,               // an alum's clip doing numbers
      repItGirl: 6,              // an alum becomes THE one — the school gets hot
      hotAt: 75,                 // the trades start calling it a factory
      classChance: 0.22,         // weekly while casting is open: a school submits
      classSize: [1, 2],
      repTalentBonus: 8,         // lane-skill lift at rep 100 (scaled from base)
      // the school map (v0.10.14, §83): the flat fares became a
      // geography — tripCost/partnerCost survive as the FALLBACK terms
      // the derived prices build from (and as old fixtures' anchors)
      tripCost: 10,              // legacy flat fare (pre-map saves only)
      tripBase: 3,               // the train ticket's floor
      fareScale: 10,             // fare = round(map distance × this)
      // access premium by reputation word: quiet/steady/respected/
      // name-brand/hot — a hot school's door costs what it is worth
      repPremium: [0, 1, 2, 4, 6],
      tripCooldownWeeks: 8,      // a visit is a trip, not a subscription
      partnerCost: 32,           // legacy flat retainer (pre-map anchors)
      partnerBase: 22,           // retainer floor…
      partnerRepMult: 3,         // …plus 3× the access premium + the fare
      partnerWeeks: 26,          // half a year of first look
      partnerObs: 2,             // partnered leads arrive pre-read
      firstLookWeeks: 4,         // rivals can't circle a protected lead
      maxAlumni: 12,             // the ledger keeps the names that matter
      // §83 A+B: the population breathes
      minSchools: 6, maxSchools: 12,
      floorSchools: 5,           // closures never thin the map below this
      closeRep: 30,              // under this, unpartnered, the clock runs…
      closeAfterWeeks: 26,       // …for half a year before
      closeChance: 0.06,         // …the weekly dice can call it
      openChance: 0.012,         // a new door opens toward the cap
      openHomeFameBonus: 2,      // a famous local label pulls the scene home
      // §83 C: the city sets the pond — lead polish depth term
      depthTalentSpan: 10,       // lane cur lift at w=1.0 vs w=0.5
      depthClassWeight: 0.5,     // submission weight floor for small towns
      // the academy's game (v0.10.17, §84) — the persistent class and
      // the powers' head start. Owner: "they always exist, we just
      // don't know who they are until we've visited enough times."
      CLASS: {
        sizeBase: 4, sizePerGravity: 4,   // Seoul rooms run ~8, small towns ~6
        enrollAge: [14, 16], leaveAge: 19,   // the 14 floor is the owner's law (v0.3.1)
        enrollChance: 0.06,              // weekly top-up toward the size
        growChance: 0.3,                 // weekly: the lane grows toward the cone
        revealPerTrip: [1, 2],           // the back row shows you one or two
        // the head start: at enrollment, the obviously-talented are
        // ALREADY known — chance scales with her ceiling and the
        // school's name
        knownBase: 0.06, knownCeilSlope: 0.5, knownCeilFloor: 55,
        knownRepBonus: 0.15,             // a hot school's class is watched
        knownInterest: 2,                // the powers arrive circling
        // the fog poach: a known unrevealed student can be signed away
        // before you ever meet her — the clock ticks in the dark
        fogPoachChance: 0.008,
        // the director's calls: shown interest in a strong student can
        // summon the biggest letterheads THAT WEEK, by temper
        callBar: 58,                     // perceived read that reads "strong"
        callChance: { loyalist: 0.15, guardian: 0.30, starstruck: 0.75, auctioneer: 0.90 },
        callInterest: 2, callRivals: 2,  // top-prestige letterheads, circling
      },
      // §84 E: the partnership gate — a nothing label's retainer is
      // refused. Real fame, or an alum debuted under your roof.
      partnerFameBar: 0.16,
    },

    // ---- The practice room years (v0.9.16): trainee life has weather ---
    // Monthly evaluation days with rankings the trainees can see and
    // feel; debut-team speculation once a project opens; the trainee who
    // quits on you; and the aging-out clock with all three endings.
    PRACTICE: {
      quitBaseChance: 0.012,     // weekly, for the discouraged long-timer
      quitMoraleBelow: 38,
      quitTenureWeeks: 60,       // quitting is earned — nobody quits month two
      pleadCost: 8,              // the real week off that buys one more season
      pleadMorale: 5,
      pleadQuietWeeks: 12,
      promiseWindowWeeks: 40,    // "the next lineup" has an expiry date
      agingTenureWeeks: 90,      // the practice room clock gets loud here
      agingAge: 22,              // or the birthday does
      watchMorale: -4,           // watching a debut from the doorway
      lastChanceMorale: 10,      // finally
    },

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
      // the big room (v0.10.28) — owner: "If Twice can have 9, why
      // can't I?" The old cap of 6 was a tuning-era relic, not a law:
      // every system iterates the lineup. Nine mouths is nine salaries,
      // nine shares of the spotlight, and nine friction candidates —
      // the size is legal; feeding it is the game.
      minMembers: 4, maxMembers: 9,
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
      { id: 'bright',      label: 'Bright / Youthful',   weights: { vocals: 0.9, dance: 1.0, charisma: 1.15, visuals: 1.05, rap: 0.7 }, personality: { confidence: 0.6, warmth: 1.0 }, breadth: 4 },
      { id: 'elegant',     label: 'Elegant / Luxury',    weights: { vocals: 1.2, dance: 0.85, charisma: 1.0, visuals: 1.25, rap: 0.5 }, personality: { professionalism: 1.0, confidence: 0.6 }, breadth: 0 },
      { id: 'futuristic',  label: 'Futuristic / Experimental', weights: { vocals: 0.8, dance: 1.25, charisma: 1.1, visuals: 1.0, rap: 1.0 }, personality: { creativity: 1.2, adaptability: 0.8 }, breadth: -3 },
      { id: 'dark',        label: 'Dark / Dramatic',     weights: { vocals: 1.0, dance: 1.15, charisma: 1.25, visuals: 0.95, rap: 0.9 }, personality: { confidence: 1.1, competitiveness: 0.7 }, breadth: 2 },
      { id: 'performance', label: 'Performance-Heavy',   weights: { vocals: 0.8, dance: 1.45, charisma: 1.1, visuals: 0.8, rap: 0.9 }, personality: { workEthic: 1.0, resilience: 0.8 }, breadth: 3 },
      { id: 'hiphop',      label: 'Hip-hop / Swagger',   weights: { vocals: 0.7, dance: 1.0, charisma: 1.2, visuals: 0.85, rap: 1.5 }, personality: { confidence: 1.3, competitiveness: 0.9 }, breadth: 1 },
      { id: 'retro',       label: 'Retro',               weights: { vocals: 1.15, dance: 1.0, charisma: 1.15, visuals: 1.0, rap: 0.6 }, personality: { creativity: 0.9, warmth: 0.8 }, breadth: 1 },
      { id: 'dreamy',      label: 'Dreamy / Ethereal',   weights: { vocals: 1.25, dance: 0.8, charisma: 1.0, visuals: 1.2, rap: 0.4 }, personality: { creativity: 1.0, warmth: 0.9 }, breadth: -3 },
      // genre-bending (v0.9.6, owner's request): the concept that mashes.
      // Locking a release under this brief opens a second option — pick
      // the two genres to collide. Extremely high risk, high reward.
      { id: 'fusion',      label: 'Genre-Bending',       weights: { vocals: 1.0, dance: 1.0, charisma: 1.2, visuals: 0.9, rap: 1.0 }, personality: { creativity: 1.5, confidence: 0.8 }, breadth: -2 },
    ],

    // ---- The two verdicts (v0.10.34, §91 Phase 1) ------------------------
    // A record is judged twice: CRAFT is what the critics hear (the
    // record itself — never popularity, hype, spend or the week), APPEAL
    // is what the public wants. The chart hears appeal through reach;
    // `reception` keeps its name and means the commercial result.
    VERDICT: {
      // craft terms (weights on 0–100 inputs)
      craftHook: 0.38, craftRecording: 0.30, craftFit: 0.14, craftChem: 0.10,
      craftLyric: 0.08,                    // the studio (v0.10.35): the writer's craft × theme fit
      craftIdentity: 2, craftLuckSd: 6,
      // appeal terms
      appealBase: 2, appealCatch: 0.55, appealRecording: 0.15, appealTrend: 0.13,
      appealIdentity: 2, appealLuckSd: 9,
      // commercial = appeal × (reachBase + reachSpan × chartReach) + the reach lifts
      reachBase: 0.8, reachSpan: 0.2,
      // the catch: a second seed on every demo — hash-derived from the hook,
      // so the two can diverge (a grower, a cheap thrill)
      catchFromHook: 0.5, catchBase: 27.5, catchSpread: 18,
      // the fusion lane's four outcomes as moves on the two numbers
      FUSION_MOVES: { shift: { craft: 8, appeal: 16 }, acclaim: { craft: 14, appeal: -12 },
        flop: { craft: -12, appeal: -14 }, worked: { craft: 3, appeal: 4 } },
      // the critics: three invented outlets with tastes that disagree
      OUTLETS: [
        { id: 'needle', name: 'The Needle', favours: ['elegant', 'dreamy', 'retro'], dislikes: ['bright'], severity: -3,
          voice: 'the broadsheet that wants to be bored by anything it can hum' },
        { id: 'mixdown', name: 'Mixdown Monthly', favours: ['performance', 'dark', 'futuristic'], dislikes: ['retro'], severity: 0,
          voice: 'the producers’ magazine: it listens to the low end first' },
        { id: 'chorus', name: 'Chorus & Co.', favours: ['bright', 'hiphop', 'fusion'], dislikes: ['futuristic'], severity: 3,
          voice: 'the pop site that grades on whether the song is fun' },
      ],
      tasteLift: 4, outletJitter: 8,       // ± a lane the outlet loves/hates; the hash wobble per review
      splitSteps: 2,                       // verdicts this many bands apart = a split review (a story)
      // measured v0.10.34 (12 worlds × 100 weeks, craft mean 63): the
      // bands sit so 'acclaimed' is rare and 'warm' is earned
      BANDS: [
        { min: 76, key: 'acclaimed', word: 'acclaimed' },
        { min: 64, key: 'warm', word: 'warm' },
        { min: 52, key: 'mixed', word: 'mixed' },
        { min: 40, key: 'cold', word: 'cold' },
        { min: -101, key: 'panned', word: 'panned' },
      ],
      // the divergences the owner asked for, measured-first
      darlingCraft: 70, darlingBelow: 50,  // the critics' darling: loved, not bought
      pannedHitAt: 64, pannedCraftBelow: 48, // the hit the critics panned
      slumpDrop: 12, growerRise: 12,       // the critics' expectation: the house's last craft
      // what craft moves that reception does not
      prideCraft: 70, prideFandom: 2,      // the fandom's pride in a great record, chart or no chart
      vocalRepCraft: 68, vocalRepBump: 3,  // the vocal house is built on records
      longevityCraft: 60,                  // a well-made record stays in the catalog's lottery
    },
    // ---- The studio (v0.10.35, §91 Phase 2) ---------------------------------
    // The song is MADE by named people. A producer has lanes (public) and
    // a hidden craft and catch (the second fog: read through the works);
    // the fit law caps a composition by lane distance — "a hip-hop
    // producer on an ethereal song" tops out whatever the skill. Writers
    // own themes the same way. The commission is the player's verb.
    STUDIO: {
      fit: { home: 1.0, neighbour: 0.85, far: 0.65 },      // the fit law (owner: a cap, not a slope)
      craftSpread: [34, 86], catchSpread: [30, 85],         // a producer's hidden numbers, by hash
      secondLaneChance: 0.4,                               // a versatile producer owns a second lane
      hookFromCraft: 0.9, hookBase: 6, hookSd: 9,          // hook = N(craft × fit × .9 + 8, 9) + the sheet's modifiers
      catchFromHook: 0.45, catchFromProducer: 0.4, catchBase: 8, catchWobble: 12,   // the catch reads the commercial sense
      writerCount: 6, writerCraftSpread: [34, 86], writerThemes: [2, 3],
      themeFit: { home: 1.0, far: 0.75 },                   // the lyric's cap off a writer's themes
      roomMissCraft: 6,                                     // a theme that fights the room (age band, trait)
      pen: { base: 20, perCreativity: 0.6 },               // a member writer's craft, from creativity
      houseCraftBase: 30, houseCraftSpan: 60,               // a house chair's craft from its hidden aptitude
      devotionFandom: 1,                                    // the fan song feeds the fandom
      COMMISSION: {
        writeWeeks: [2, 3],                                 // the writing room's clock
        writerFee: 8,                                       // a pool writer's fee (the pen and the house write free)
        fees: { unproven: 6, 'cold streak': 5, workmanlike: 12, reliable: 22, 'in demand': 40 },
        access: { reliable: 0.30, 'in demand': 0.55 },      // fame to get the call — or a bond with this room
      },
    },
    THEMES: [
      { id: 'longing',    label: 'Longing',        ages: [17, 30], lanes: ['dreamy', 'elegant', 'retro'],       breadth: 0,  trait: { key: 'warmth', min: 35 } },
      { id: 'firstLove',  label: 'First love',     ages: [15, 21], lanes: ['bright', 'dreamy'],                 breadth: 3,  trait: { key: 'warmth', min: 45 } },
      { id: 'defiance',   label: 'Defiance',       ages: [17, 30], lanes: ['dark', 'hiphop', 'performance'],    breadth: 1,  trait: { key: 'confidence', min: 48 } },
      { id: 'summer',     label: 'Summer',         ages: [15, 26], lanes: ['bright', 'retro'],                  breadth: 4,  trait: null },
      { id: 'nightDrive', label: 'The night drive', ages: [18, 32], lanes: ['retro', 'futuristic', 'elegant'],  breadth: 0,  trait: null },
      { id: 'grief',      label: 'Grief',          ages: [21, 40], lanes: ['dreamy', 'elegant'],                breadth: -3, trait: { key: 'resilience', min: 40 } },
      { id: 'confidence', label: 'Swagger',        ages: [17, 30], lanes: ['hiphop', 'dark', 'performance'],    breadth: 2,  trait: { key: 'confidence', min: 55 } },
      { id: 'nostalgia',  label: 'Nostalgia',      ages: [20, 40], lanes: ['retro', 'dreamy'],                  breadth: 0,  trait: null },
      { id: 'escape',     label: 'Escape',         ages: [16, 28], lanes: ['futuristic', 'performance', 'bright'], breadth: 1, trait: { key: 'adaptability', min: 40 } },
      { id: 'devotion',   label: 'Devotion',       ages: [15, 40], lanes: ['bright', 'elegant'],                breadth: 2,  trait: { key: 'warmth', min: 40 } },
    ],
    // the sound of the year (v0.10.34): a lane the trades name every
    // January — hash per year with persistence, moved for real by a
    // fusion shift. trendFit on a demo was a random draw with no world
    // behind it; now it is a read of the lane against the year.
    TREND: {
      keepChance: 0.55,                    // a year keeps last year's sound this often
      inLane: 70, neighbour: 58, far: 45,  // trendFit by lane distance
      NEIGHBOURS: {
        bright: ['retro', 'elegant'], elegant: ['bright', 'dreamy', 'retro'],
        futuristic: ['dark', 'performance', 'hiphop'], dark: ['performance', 'hiphop', 'futuristic'],
        performance: ['dark', 'hiphop', 'futuristic'], hiphop: ['dark', 'performance', 'futuristic'],
        retro: ['bright', 'elegant', 'dreamy'], dreamy: ['elegant', 'retro'],
        fusion: ['bright', 'elegant', 'futuristic', 'dark', 'performance', 'hiphop', 'retro', 'dreamy'],
      },
    },

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
      allocLeanGap: 15,      // rehearsal shares: top minus bottom past this names a lean on the countdown letter (v0.11.5, §96 wiring — measure-first)
      // release formats (v0.2.1): bigger records cost more, need more
      // runway, and pay more when they land
      FORMATS: [
        { id: 'single', label: 'Single', cost: 30, minPrep: 4, revenueMult: 1.0, tracks: 2 },
        { id: 'mini',   label: 'Mini-album', cost: 55, minPrep: 6, revenueMult: 1.6, tracks: 5 },
        { id: 'full',   label: 'Full album', cost: 90, minPrep: 8, revenueMult: 2.3, tracks: 9 },
      ],
      promoLevels: ['modest', 'standard', 'aggressive'],
      promoCost: { modest: 10, standard: 22, aggressive: 40 },
      // the price of fame (v0.9.14): the record and the marketing scale
      // with the act's stature — a pop-80 act's comeback bills like a
      // pop-80 act's comeback. Self-balancing: the same popularity that
      // scales the income scales the invoice. Rollout bookings stay flat
      // (a radio slot costs what a radio slot costs).
      statureCostFloor: 50,
      statureCostPer: 0.012,     // ×1.36 at pop 80, ×1.6 at pop 100
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
      idolRecovery: 8,             // weekly fatigue recovery when idle
      // v0.4.2 — the schedule breathes (owner: idols were perpetually on
      // fumes; "I like both" — contractual rest AND exhaustion with teeth)
      restWeeks: 3,                // after promo the calendar CLOSES: no new lock
      restRecovery: 15,            // scheduled rest actually restores people
      promoSoftCap: 70,            // above this, managers rotate her stages…
      promoSoftMult: 0.5,          // …and the promo load halves (not the risk)
      // the rollout promotes the ACT once per activity, scaled by who showed
      // up; the norm (a typical five) keeps the trajectory the soaks were
      // tuned on when the gain paid per member (audit v0.11.3)
      popLineupNorm: 5,
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
      // the weekly scene chart (v0.4.0): every release — yours and the
      // rivals' — enters with a heat score and cools until it drops off
      decay: 0.88,              // last week's heat, kept per week
      dropBelow: 8,             // entries fall off below this score
      maxEntries: 24,
      showTop: 10,
      // the standing rotation (v0.10.21): the establishment's catalog
      // never leaves the room — the top scene acts hold ambient heat
      rotationActs: 4,
      rotationPop: 0.92,        // rotation score ≈ act popularity × this ± 10%
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
      // the trainee floor gets a door (0.9.18.1, owner: "every rival
      // with ~30 trainees... make it possible to more ruthlessly
      // release those that aren't cutting it") — rooms are sized to a
      // plan, graded twice a year, and cut back to the plan
      ROOM: {
        bench: 3,                // trainees kept beyond the next debut's cost
        benchPerPrestige: 25,    // +1 bench per this much prestige
        satedIntake: 0.12,       // intake multiplier once the room is full
        cullEvery: 26,           // weeks between evaluations (staggered per company)
        cullMax: 8,              // deepest routine single-evaluation cut
        purgeAt: 16,             // overage at which the evaluation becomes a purge…
        purgeFactor: 0.6,        // …cutting this share of the overage at once
        cullNoteAt: 3,           // cuts this deep make the wire
        namedTenure: 40,         // weeks a signee gets before the bar applies
        actPace: 7,              // extra debut-delay weeks per active act
        overextendAt: 5,         // active acts past which the bottom act prunes faster
        comfortBase: 2,          // active acts a company runs comfortably…
        comfortPerPrestige: 30,  // …+1 per this much prestige (40→3, 90→5)
        comfortRecheck: 8,       // weeks a full portfolio waits before re-asking
        sevenYearWeeks: 364,     // the contract wall rival acts hit too
        wallChance: 0.03,        // weekly wind-down chance past the wall
        focusCycleFactor: 0.65,  // a focused machine cycles its acts faster
      },
      comebackNoteMin: 70,       // rival comebacks only make the inbox when hot
                                 // (64→70 in 0.9.18.1: the focused machine
                                 // punches receptions up — the bar for
                                 // "everywhere this week" rises with the era)
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
      announceNoteMinPop: 42,    // smaller acts announce quietly (calendar only) — 28→42 v0.10.29 (measured 15.7 kept/org-year)
      ambushChance: 0.12,        // weekly, while a worthwhile target is locked
      ambushWindow: 3,           // an act due within ± this of your date can move
      ambushMinTarget: 22,       // popularity/hype a release needs to be worth sniping
      ambushMinLeadWeeks: 2,     // they move while you still have time to react
      ambushCooldown: 14,        // weeks before the same company snipes again
      slipWeeks: 2,              // the dodge: push the date back…
      slipCost: 8,               // …rebook everything…
      slipMorale: 2,             // …and the members know what it looks like (cost)
      battleMinPop: 20,          // a same-week rival release this big is a BATTLE
      // the nerve (v0.10.26, §88 B): the fighters rise in a head-to-head
      nerveAt: 65, nervePer: 1, nerveCap: 3,
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
      // the standing rotation, national edition (v0.10.22): the titans'
      // catalog holds the top of the big board between releases
      rotationTitans: 3,
      rotationFame: 0.72,          // rotation score = titan fame × this ± 10%
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
      traineePerHype: 18,      // trainees grow only as fast as the internet cares
                               // (25→18, 0.9.24.1: the hype trickle compounded
                               // six-figure counts onto unremarkable benches)
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
      shakyEncoreChance: 0.2,  // after a win on a shaky or fumbled stage: a storm (the stage, v0.10.37)
      fairyChance: 0.12,       // weekly, per appearance: the ending fairy trends
      fairyCarried: 20,        // the camera leans toward the voice that carried the week (v0.10.37)
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
        // the gravity (v0.9.18): the fandom divides into solo-clamor and
        // ot5-loyalist camps — a debate, not an attack; both camps love her
        soloClamor: { label: 'solo-clamor debate', negative: false, start: [35, 60],
          actions: ['statement', 'meme'] },
        // the star's clock (v0.9.25): the fans call for the ALBUM
        albumClamor: { label: 'solo-album campaign', negative: false, start: [40, 65],
          actions: ['statement', 'meme'] },
        // the public eye (v0.9.36): the known trainee the lineup skipped
        aceSnub: { label: 'lineup snub story', negative: true, start: [30, 55],
          actions: ['statement', 'meme'] },
        // the product (v0.10.0): heavy fan-sign rounds read as sales
        // machinery — the dumping-photo story aims at the COMPANY
        albumDump: { label: 'album-dumping story', negative: true, start: [25, 50],
          actions: ['statement', 'meme'] },
        // the person in public (v0.10.2): she said a thing; a story
        // broke. One kind for both the WeCast slip and the v0.6.8
        // posting incident — a duplicate key here used to shadow this
        // entry entirely (fixed v0.10.4)
        gaffe: { label: 'the clip of what was said', negative: true, start: [20, 45],   // the subject can be anyone (audit v0.11.3)
          actions: ['apology', 'statement', 'meme'] },
        // the recurring money (v0.10.3): squeeze the fandom too hard
        atmStory: { label: '"we are not ATMs"', negative: true, start: [25, 45],
          actions: ['statement', 'meme'] },
        // the making (v0.10.4): the line distribution the fandom audits
        lineShare: { label: 'line-distribution audit', negative: true, start: [22, 42],
          actions: ['statement', 'meme'] },
        scandal: { label: 'the story', negative: true, start: [35, 60],
          actions: ['statement', 'meme'] },
        // the bad blood (v0.9.21): the fandom throws the gasoline
        didntStand: { label: 'distance watch', negative: true, start: [25, 45],
          actions: ['statement', 'meme'] },
        fanWar: { label: 'fan war', negative: true, start: [35, 60],
          actions: ['statement', 'meme'] },
        civilWar: { label: 'in-house fan war', negative: true, start: [30, 50],
          actions: ['statement', 'meme'] },
        masterTurn: { label: 'fansite closing receipts', negative: true, start: [35, 55],
          actions: ['statement', 'apology'] },
        // 0.9.8.2: pre-debut virality is covers and leaked clips, not
        // fancams — she has no stages to film
        coverClip: { label: 'cover-clip wave', negative: false, start: [30, 55],
          actions: ['meme', 'livestream'] },
      },
      // response base success; personality and context shift these
      baseSuccess: { statement: 0.55, apology: 0.8, legal: 0.7, meme: 0.5, livestream: 0.6 },
      legalBackfire: 0.25,      // Streisand is real
      // trigger chances
      exhaustedChance: 0.10,    // weekly, per promoting group at avg fatigue 75+
      encoreChance: 0.5,        // at release, performance < 45
      stylingChance: 0.35,      // at release, reception < 50
      fancamChance: 0.5,        // at spark/viral
      benchedChance: 0.6,       // at an overwork incident — else the fandom files the grievance itself
      truckAt: 55,              // a benched story this hot hands the fandom its receipts (v0.10.30)
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
        // v0.10.22 rebalance (the tour-abuse probe): production up —
        // the road pays the crew before it pays the label
        clubs:  { label: 'Club halls',  costPerLeg: 10, revBase: 18, sweetSpot: 18, fatiguePerWeek: 5 },
        halls:  { label: 'Theaters',    costPerLeg: 20, revBase: 38, sweetSpot: 38, fatiguePerWeek: 6 },
        arenas: { label: 'Arenas',      costPerLeg: 38, revBase: 75, sweetSpot: 60, fatiguePerWeek: 7 },
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
      // the school map (v0.10.14, §83): rough normalized map coordinates
      // — one geography, every distance derives from it
      KR_CITIES: [
        { id: 'seoul',   label: 'Seoul',   w: 1.00, x: 0.42, y: 0.18 },
        { id: 'busan',   label: 'Busan',   w: 0.80, x: 0.72, y: 0.72 },
        { id: 'incheon', label: 'Incheon', w: 0.70, x: 0.36, y: 0.19 },
        { id: 'daegu',   label: 'Daegu',   w: 0.62, x: 0.62, y: 0.58 },
        { id: 'gwangju', label: 'Gwangju', w: 0.55, x: 0.32, y: 0.72 },
        { id: 'daejeon', label: 'Daejeon', w: 0.52, x: 0.45, y: 0.45 },
      ],
      datesPerWeek: 2,           // two stages a week is a schedule, not a stunt
      maxKrDates: 9,             // routed dates + earned encores, capped
      encoreRevMult: 0.85,       // the second night sells a shade under the first
      // the tour record (v0.11.5, §96 wiring): the wrap archives every tour
      // on the group and the page reads the road back — toursDone had no
      // reader; eight is a career's shelf (v0.11.5, §96 wiring — measure-first)
      historyCap: 8,
      // the stages, lived (v0.11.7, §98): the road gets the season's shape —
      // a card, three doors, a moment a week, a ceremony. Every default is
      // today's behaviour; who sells out and what a night is worth did not move.
      doorFuseWeeks: 1,          // a road door waits a week, then today's law answers it — the edit's fuse (v0.11.7, §98 — measure-first)
      encoreRestFatigue: 6,      // the second night handed back: the night off, in fatigue, for every present member (v0.11.7, §98 — measure-first)
      presserCost: 4,            // the road statement's bill — the edit statement's price (v0.11.7, §98 — measure-first)
      presserHype: 1,            // and what it costs every member in hype: a little, not the edit's three (v0.11.7, §98 — measure-first)
      swapPickHeat: 62,          // the fandom is LOUD about a b-side at the truthers' bar (TRACKS.sleeperHeatAt), inside the 'warm' word (v0.11.7, §98 — measure-first)
      swapIntensity: 3,          // singing the pick pays the fandom in intensity (v0.11.7, §98 — measure-first)
      rainChance: 0.25,          // the rain set is rare: hash-gated per home-circuit week (v0.11.7, §98 — measure-first)
      FATIGUE_WORDS: [[70, 'running on fumes'], [45, 'tired'], [0, 'fresh']],   // the room's fatigue in words — the rest card's own bands (v0.11.7, §98 — measure-first)
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
      nameBackedIntensity: 2,   // naming day: the company backed the name the cafés wanted (v0.11.5, §96 wiring — measure-first)
      nameOverruledIntensity: 2, // …or backed another over it — ratified, and remembered (v0.11.5, §96 wiring — measure-first)
      COLORS: ['pearl violet', 'coral rose', 'midnight teal', 'champagne gold',
        'arctic mint', 'garnet red', 'moonstone grey', 'electric periwinkle'],
    },
    // ---- The outside work (v0.10.42, §89 D6): one desk for the calls ---
    // Brand deals and the second job were the same machine twice. One
    // list, one expiry, one capacity — the kinds keep their own teeth.
    OUTSIDE: {
      expiresWeeks: 3,          // offers do not wait — brands or broadcast
      maxActive: 5,             // running jobs + open calls, company-wide (was 3 brand + 2 show)
    },
    DEALS: {
      offerBaseChance: 0.04,    // weekly, once anyone is famous enough
      minSocial: 40000,         // brands want reach
      itGirlBonus: 0.06,        // the narrative does the selling
      lump: [6, 14], weekly: [1, 2], weeks: [12, 20],
      shootFatigue: 2,          // monthly, the shoots are real work
      scandalPenaltyMult: 0.5,  // a cancelled deal claws back half the lump
      brandDarlingAt: 2,        // deals before the narrative forms
      // the invoice (v0.9.14): sponsorship is a JOB — periodic appearances
      // that claim real weeks, a strain ladder when the van cannot make
      // them, and the mid-contract request everyone dreads answering
      obligationEveryWeeks: 10,  // the sponsored appearance cadence
      obligationFatigue: 2,      // the store event is real work
      squeezeFatigue: 4,         // ...squeezed into a promo/prep week, more so
      missRescheduleWeeks: 3,    // a missed one gets rebooked, pointedly
      missCancelAt: 2,           // consecutive misses before the brand walks
      missClawbackMult: 0.25,    // ...taking a quarter of the lump with them
      soloAskAfterWeeks: 6,      // the solo request comes once trust is built
      soloAskChance: 0.05,       // weekly, once eligible, once per deal
      soloBonusMult: 0.5,        // the solo stage pays half a lump again
      soloSpike: 2600,           // her name alone on the sponsor's stage
      cooledWeeklyCut: 1,        // a declined brand pays with less warmth
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
      hiatusOfferBonus: 0.08,    // productions love an idle idol (v0.9.12)
    },

    // ---- The catalog (v0.9.15): old records are lottery tickets ---------
    // Nothing you ever shipped stops mattering: a resurfaced clip finds
    // an idol years after the stage, a sleeper B-side reverse-charts long
    // after its era. Works for disbanded groups too, because
    // the song outliving the group is one of music's best stories.
    CATALOG: {
      resurfaceChance: 0.015,    // weekly: an old clip finds new eyes
      resurfaceMinWeeks: 40,     // the stage must be old enough to be "found"
      // halved 0.006→0.003 in soak calibration: at 0.006 the lottery
      // ticket hit 29/40 orgs per career — a lottery everyone wins is a
      // salary
      revivalChance: 0.003,      // weekly: a catalog track catches fire...
      revivalClipBoost: 0.04,    // ...far likelier while a clip is burning
      clipBoostWindow: 6,        // weeks a resurfaced clip keeps the door open
      minAgeWeeks: 48,           // a year old before it counts as catalog
      minReception: 50,          // flops stay flopped (mostly — sleepers exempt)
      revivalScore: 46,          // the re-entry lands mid-chart and climbs or dies
      // 3→2 in soak calibration: revival pop feeds the daesang score
      // (×1.2) and the stature bill both — at 3 the lottery ticket was
      // quietly co-writing award season
      revivalPop: 2,             // the group feels it — even a disbanded one's members
      revivalFandomGain: 3,
      // the royalties: an old song charting is INCOME — streams, the
      // merch reprint the note talks about. Disbanded or not, the label
      // still owns the masters. Claims something real, per §55.6.
      revivalWindfallBase: 25,
      revivalWindfallPerReception: 1.2,   // × max(0, reception − 30)
      // the reverse run, re-priced (v0.11.1, §92 D): the roll reads the song,
      // the act's month and the push; b-sides with heat are tickets of their
      // own; a strong revival reaches the national board at a discount
      qualitySpan: 0.4,          // chance × (1 + (quality − 50) / 50 × this) — .5→.4 at the second soak (35/40 orgs; the ticket stays a ticket)
      activityWindow: 8,         // a judged stage, a tour or a panel seat inside this many weeks…
      // activityMult 2→1.5 at the first soak: with every judged stage stamping
      // the month, a promoting act is 'active' most weeks and the lottery
      // ticket flooded 39/40 (band ceiling .85 — a lottery everyone wins is
      // a salary); the lift is real, not a doubling
      activityMult: 1.5,         // …lifts the roll: people hear old songs where they hear the act
      bsideRevivalHeat: 58,      // a b-side is a candidate from this heat
      nationalRevivalAt: 72,     // a revival this good enters the national board too… (64→72 at the first soak: 36/40 crossed — the trades write up the rare one)
      nationalScoreMult: 0.8,    // …at this discount on its scene score
      // the catalog push (§92 E): the desk's verb on the shelf
      PUSH: {
        KINDS: {
          party:     { label: 'Streaming party', cost: 6, mult: 4, weeks: 6 },
          challenge: { label: 'Dance challenge', cost: 12, mult: 6, weeks: 8, dance: 60 },      // needs a dancer
          liveClip:  { label: 'The live clip', cost: 8, mult: 5, weeks: 6, stageWithin: 8 },   // needs a stage inside the window
        },
        cooldown: 20,            // weeks after a push ends before the next
      },
    },

    // ---- The disappearance (v0.9.12): hiatus as strategy ----------------
    // Not-releasing was always possible; ANNOUNCING it is a move. A
    // declared hiatus rests the roster faster and builds anticipation for
    // the return — but past the grace window the public starts forgetting,
    // and forgetting compounds. Restoration vs relevance, chosen weekly.
    // the mandate (v0.9.19, §61 items 1/2/5) — the player is an
    // executive producer: new acts start when the directive comes down
    MANDATE: {
      windowWeeks: 40,         // a greenlight is a window, not a deed
      lapseTrust: -3,          // a greenlight left dark costs standing
      pitchCooldown: 8,        // weeks between trips upstairs
      pitchRoomMin: 4,         // free trainees before a group pitch is credible
      pitchTrustMin: 45,       // below this the board hears nothing
      roomPressureAt: 5,       // free trainees before the board notices the floor
      roomPressureChance: 0.06, // weekly, once the floor is loud
    },
    TRAINEE_CONTRACT: {
      years: 3,                // the real-world standard trainee term
      noticeWeeks: 8,          // the expiry reaches the desk this early
      // she declines the re-sign herself when the math stops working:
      declineMoraleBelow: 38,  // low morale AND
      declineTenureYears: 4,   // a long tenure with no project in sight
    },
    TEASER: {
      beats: [3, 2, 1],        // T-minus weeks: concept film, tracklist, MV teaser
      hypePerBeat: 1.5,        // members warm up as the date approaches
      buildupBase: 4,          // per beat, plus the audience terms below
      buildupFandom: 0.10,     // × fandom intensity
      buildupPop: 0.06,        // × group popularity
      anticipationCap: 4,      // reception lift ceiling at release
      anticipationPer: 22,     // buildup points per +1 reception
    },
    // festival season (v0.9.22, §55.4, map slot 7) — the calendar's
    // events become ATTENDED: named annuals that invite, schedule
    // surgery read out loud, travel with a bill, and a slot
    FESTS: {
      inviteLead: 4,           // the organizer calls this many weeks out
      inviteChance: 0.75,      // most years the call comes — the invite rail's old literal (v0.11.5, §96 wiring — measure-first)
      inviteAfterRegrets: 0.45, // the year after regrets the organizers call less surely — same single draw (v0.11.5, §96 wiring — measure-first)
      maxPerYear: 3,           // a group plays at most this many a year
      missFandom: 2,           // pulling out of a booked slot costs the room
      headlineMult: 1.6,       // icons headline for icon money (one truth w/ ARCS)
      LIST: [
        { id: 'cherryPoint', name: 'Cherry Point Campus Week', woy: 17, tier: 1,
          popMin: 25, pay: 12, travel: 3, fatigue: 3, blurb: 'a field, a spring evening, twenty thousand students who know every word' },
        { id: 'hanRiver', name: 'Han River Summer Wave', woy: 30, tier: 2,
          popMin: 40, pay: 22, travel: 6, fatigue: 4, blurb: 'the city’s big summer stage, floating lanterns and a broadcast truck' },
        { id: 'moonlitGarden', name: 'Gyeongju Moonlight Garden', woy: 38, tier: 2,
          popMin: 45, pay: 24, travel: 9, fatigue: 5, blurb: 'heritage grounds, lantern light, the set every act films for the archive' },
        { id: 'neonHarbor', name: 'Neon Harbor', woy: 44, tier: 3,
          popMin: 58, pay: 40, travel: 12, fatigue: 6, blurb: 'the year’s biggest open-air bill — headlining it is a line in a career summary' },
        { id: 'firstFrost', name: 'First Frost Fest', woy: 47, tier: 1,   // inside the 48-week year (audit v0.11.3: 49 was next January, and the festival went biennial)
          popMin: 25, pay: 12, travel: 3, fatigue: 3, blurb: 'the winter campus circuit, breath clouds and hot packs taped inside coats' },
        // the overseas conventions (v0.10.9's circuit; FESTS rows since
        // v0.10.43, §89 D9): region-keyed, warmth-gated, the tongue applied
        // on resolve — one weekend a year per far market, the old bills
        { id: 'conHarbour', name: 'the Harbour Lights Showcase', woy: 14, tier: 1, region: 'cn',
          popMin: 30, warmthMin: 12, pay: 10, travel: 14, fatigue: 6, warmth: 6, blurb: 'a harbour-side convention hall and a crowd that found them through a screen' },
        { id: 'conBangkok', name: 'K-Fest Bangkok', woy: 21, tier: 1, region: 'sea',
          popMin: 30, warmthMin: 12, pay: 10, travel: 15, fatigue: 6, warmth: 6, blurb: 'a humid convention weekend, three thousand fans and a fanchant in two languages' },
        { id: 'conDallas', name: 'K-Wave Con Dallas', woy: 27, tier: 1, region: 'na',
          popMin: 30, warmthMin: 12, pay: 10, travel: 20, fatigue: 6, warmth: 6, blurb: 'a convention-center ballroom, a long flight, and people who drove six hours' },
        { id: 'conCDMX', name: 'Ola Coreana CDMX', woy: 33, tier: 1, region: 'latam',
          popMin: 30, warmthMin: 12, pay: 10, travel: 22, fatigue: 6, warmth: 6, blurb: 'a city that sings every line back at double volume, altitude included' },
        { id: 'conBerlin', name: 'Hallyu Expo Berlin', woy: 41, tier: 1, region: 'eu',
          popMin: 30, warmthMin: 12, pay: 10, travel: 20, fatigue: 6, warmth: 6, blurb: 'an expo hall, a continent of fans on one train network, the interview booth right by the stage' },
      ],
      maxAbroadPerYear: 2,     // the far markets, two weekends a year at most
      // the stages, lived (v0.11.7, §98): the bill posted when the organizers
      // call, the set as a door inside the invite, the night as a moment
      billSize: 6,             // acts on a posted bill, cast from the rival acts by popularity (v0.11.7, §98 — measure-first)
      seasonCardCount: 3,      // editions the Industry tab's season card lists ahead (v0.11.7, §98 — measure-first)
      deepPickHeat: 58,        // the fan pick's public heat (the 'warm' word's floor) before the deep-cut door opens (v0.11.7, §98 — measure-first)
      deepIntensity: 2,        // the fandom's b-side sung to a field: intensity (v0.11.7, §98 — measure-first)
      rainChance: 0.2,         // the rain set, hash-gated per edition and act (v0.11.7, §98 — measure-first)
      wrongBannerChance: 0.15, // the crowd's banner with the wrong name under the right face, hash-gated (v0.11.7, §98 — measure-first)
      oceanIntensity: 55,      // fandom intensity at which the lightstick ocean is a moment (v0.11.7, §98 — measure-first)
      collabViralChance: 0.35, // the collab clip travels, hash-gated per edition and act (v0.11.7, §98 — measure-first)
      collabClipSpike: 0.6,    // × SOCIAL.viralSpike on the leader when it does — the tour-stop clip's fraction (v0.11.7, §98 — measure-first)
    },
    AWARD_NIGHT: {
      speakerMorale: 6,        // the mic is a gift to whoever holds it
      passedOverMorale: 2,     // and a small sting to whoever expected it
    },
    // the bad blood (v0.9.21, §55.3 + §55.13, map slot 6) — conflict
    // must COST, and the fandom must amplify. Three tiers: in-group,
    // in-company, in-scene — plus the fansite masters, the gasoline
    // with faces.
    BADBLOOD: {
      coldWeeksToRivalry: 8,   // consecutive conflict weeks before it hardens
      rivalryChemDrag: 45,     // extra pair-score drag once it is NAMED
      rivalryChance: 0.25,     // weekly, once the cold streak qualifies
      buryWeeks: 6,            // non-conflict weeks before the hatchet buries
      creditDisputeMorale: 3,  // a unit track shared by rivals costs both
      didntStandChance: 0.15,  // promo weeks with a live rivalry draw the eye
      // tier 2: two own groups on one calendar cannibalize
      cannibalReception: 4,    // the split-attention cost at release
      civilWarChance: 0.30,    // and the fandoms notice each other
      // tier 3: professional rivalries (§55.13) — formation sources
      maxSceneRivalries: 2,    // per player group, at most
      formChance: 0.06,        // weekly, per eligible source
      classPopMin: 45,         // both names have to matter first
      positionGap: 8,          // chasing the same seat = this close
      awardBeatenTwice: 2,     // the name that keeps taking it
      feudUpgradeAt: 3,        // calendar wins+losses before it is personal
      fanWarChance: 0.35,      // shared release weeks ignite the war
      heatPerClash: 8,         // and the rivalry remembers each one
      heatDecay: 0.5,          // weekly cooling between meetings
      namedAt: 30,             // heat at which the trades name it
      stakesReception: 2,      // a named-rivalry head-to-head fights harder
    },
    FANSITE: {
      masterTenure: 30,        // weeks a biased regular runs the account first
      masterSocialMin: 25000,  // the bias has to be worth the lens
      maxPerPerson: 1,         // one master per face
      fundBuildup: 6,          // the master funds the countdown (per era)
      fundFandom: 2,           // organized money organizes the room
      turnChance: 0.5,         // a betrayal trigger flips the account…
      turnFandom: 6,           // …and the closing notice costs the room
      turnTriggers: ['heldToPaper', 'cutFromLineup', 'promiseBroken', 'watchedTermination'],
    },
    // the member desk (v0.9.20, §61 items 3/4) — three verbs on a
    // contracted member, and the meeting SHE calls
    MEMBER_DESK: {
      removeMorale: 12,        // cut from the lineup, kept on the books
      removeMateMorale: 4,     // the room watches the seat empty
      breakRecovery: 2.5,      // weekly fatigue relief on a personal break
      breakMorale: 0.8,        // the rest is real here too
      TERMINATE: {
        base: 40,              // the buyout's floor
        perYear: 30,           // × contract years remaining
        perFame: 40,           // × her leverage (the renewal table's fame read)
        mateMorale: 6,         // everyone who shared a dorm learns something
      },
      WALKOUT: {
        grudgeAt: 5,           // stacked directed grievances before she calls it
        moraleBelow: 35,       // and the tank has to be empty
        cooldownWeeks: 52,     // one such meeting a year, at most
        negotiateBase: 60,     // hearing her out costs real money…
        negotiatePerFame: 30,  // …scaled to what walking would cost you
        negotiateMorale: 10,
        holdMorale: -8,        // the paper wins; the room remembers
        expireMorale: -4,      // not answering is also an answer
      },
    },
    // the conclusion of team activities (0.9.18.2, owner: "there's no
    // way for ME to disband a group") — the same door the rivals got
    DISBAND: {
      morale: 10,            // what ending it costs the people in it
      traineeMorale: 4,      // a dissolved project stings less than a dead era
      sellingPop: 45,        // at this popularity, the board calls it instability…
      trustSelling: -8,      // …and prices it
    },
    HIATUS: {
      graceWeeks: 6,             // the announcement buys this much patience
      coolPerWeek: 0.6,          // popularity, after grace — out of sight...
      fandomCoolPerWeek: 0.4,    // ...and the cafés go quiet slower but surely
      restBonus: 4,              // extra weekly fatigue recovery — real rest
      moraleGain: 1,             // being a person again, weekly
      // anticipation counts only the weeks PAST grace — the weeks that
      // cost popularity. A stay inside the window is a schedule gap, not
      // a story: no toll paid, no bonus earned. Every point of hype is
      // bought with cooling, which is the whole bet.
      anticipationPerWeek: 0.75,
      anticipationCap: 10,       // hype has a ceiling; cooling does not
    },
    // the service (v0.9.23, §55.7, map slot 8) — every male idol carries
    // an enlistment window with a hard deadline; the decision is the
    // industry's classic (stagger vs together); the contract clock
    // pauses; the fandom starts the wait; the discharge return stage is
    // the event the whole anticipation system builds toward
    MIL: {
      noticeAge: 26,             // the papers reach the desk — two years of runway
      deadlineAge: 28,           // the wall — postponement runs out on this birthday
      serviceWeeks: 72,          // ~18 months, in 48-week years
      minTogetherAge: 20,        // together: younger members stay home, clock still runs
      mateMorale: 2,             // the send-off hits the room
      soldierMorale: 3,          // and the one leaving, a little more
      serviceFatigueRelief: 3,   // the schedule stops; the body clock resets weekly
      dischargeMorale: 8,        // the gate photo, the first meal, the group chat
      dischargeFatigueCap: 30,   // nobody comes back from service worn out
      professionalism: 4,        // the spine of steel comes home with him
      returnBuildup: 26,         // a comeback locked inside the window banks this
      returnWindowWeeks: 24,     // how long the discharge moment stays convertible
      returnClosingWeeks: 4,     // the letter that says the window is closing (v0.11.18, §109)
      // the wait (v0.11.19, §110): a service has three marks between the gates
      hundredWeeks: 14,          // day 100 of the wait falls in this week of it
      turnWeeks: 14,             // D-100: the countdown turns this many weeks before he is home
      halfMorale: 2,             // the room reads his letter from the base
      planSilenceMorale: -2,     // the plan folder left to the scheduling office: each man reads the default off the wall (v0.11.5, §96 wiring — measure-first)
      papersSilenceMorale: -3,   // his papers left in the drawer unanswered: left waiting, and the room noticed (v0.11.5, §96 wiring — measure-first)
    },
    // the rise and fall (v0.9.24, §55.10 + §55.12 + being poached, map
    // slot 9) — rival eras made legible, the trades' annual power
    // ranking, collapse fallout as a signing class, the imperial
    // rival's job offer, named generations — and the rival world's
    // boys pay the service tax too (owner, after v0.9.23)
    // the secret (v0.9.30, map slot 11, §72) — dating & Dispatch under
    // the full content law: never player-controlled, never at bodies,
    // adults only, the snark at the cameras and the norms — never her
    SECRET: {
      formChance: 0.006,         // weekly, per eligible privateNote (19+)
      industrySphereShare: 0.3,  // some secrets are two schedules deep
      briefWeeks: 6,             // the manager's careful brief, this long in
      riskBase: 0.004,           // weekly reveal risk…
      riskPerFame: 0.004,        // …scaled by fame bands (renewal read)
      riskPromo: 0.006,          // promo weeks put vans outside buildings
      protectCost: 4,            // weekly: cover schedules, decoy vans
      protectFactor: 0.45,       // protection buys real quiet, not silence
      resurfaceChance: 0.25,     // a denial is a loan against a second set of photos
      TABLOIDS: ['Flashcut', 'The Peninsula Lens', 'Paparazzo Weekly', 'Camera Nine', 'The Long Lens'],
      // the response menu, priced
      confirmFandom: 8,          // the room takes it hard…
      confirmRecovery: 0.5,      // …and heals honestly, weekly
      statementFandom: 5,        // the middle path cools less, heals slower
      statementRecovery: 0.3,
      denyFandom: 2,             // cheapest today
      denyResurfaceFandom: 16,   // costliest when the second set lands
      silenceFandom: 10,         // nothing reads as everything
      confirmMorale: 7,          // the response she never forgets
      denyMorale: -8,            // the one she carries
      recoveryWeeks: 20,         // the arc, either way
    },
    // the deep map + the tongue + the world's auditions (v0.9.29, map
    // slot 10, §55.5 + §55.15) — language colors the map's verbs, the
    // fluent member is the voice abroad, and the world auditions
    TONGUE: {
      MARKET_LANG: { jp: 'Japanese', cn: 'Mandarin', sea: 'Thai', na: 'English', latam: 'Spanish', eu: 'English' },
      koStart: [25, 45],         // an international arrives mid-sentence
      koIdle: 0.25, koActive: 0.5,   // weekly Korean growth (trainee / active idol)
      koConversational: 60,      // the interview stops needing subtitles
      interpreterFee: 6,         // per overseas tour leg with no fluent voice
      // one table (v0.10.42, §89 D12): what a fluent voice is worth per
      // surface — the tour leg sells like a homecoming; the convention
      // and the Japan cycle lose warmth and interviews without one
      FACTOR: { tour: 1.18, circuit: 0.5, japan: 0.82 },
      airportMorale: 8,          // the hometown airport, full
      AUDITION: {
        // §82 B: 60 buys a LIST now — owner: "I should get a decent
        // list of prospects, even if they aren't all that good." The
        // ceiling bet lands on most of the class; the rest are filler
        // the scouts flew home anyway.
        cost: 60, cooldownWeeks: 40, minted: [4, 6],
        ceilingBump: 6,          // higher ceiling…
        betChance: 0.6,          // …on the ones the bet is actually about
        fogObservations: 0,      // …harder to read
      },
      // origin name pools (§55.15: data work, done with care) — modest,
      // real, and used with respect. Display order follows each culture's
      // own convention (family-first only where that is the custom).
      NAMES: {
        jp:    { fam: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Ito', 'Watanabe', 'Yamamoto', 'Nakamura'],
                 given: ['Yuki', 'Hana', 'Rin', 'Mio', 'Aoi', 'Sakura', 'Riko', 'Mei', 'Haruto', 'Ren', 'Sota', 'Yuma'] },
        cn:    { fam: ['Wang', 'Chen', 'Liu', 'Zhang', 'Lin', 'Huang', 'Wu', 'Xu'],
                 given: ['Yuqi', 'Xinyi', 'Jiaqi', 'Meilin', 'Ruolan', 'Zihan', 'Yichen', 'Haoran', 'Junjie', 'Zixuan'] },
        sea:   { fam: ['Sriwijaya', 'Chaiyasit', 'Rattanakorn', 'Santos', 'Nguyen', 'Pham', 'Wongsawat', 'Reyes'],
                 given: ['Ploy', 'Nicha', 'Mali', 'Anh', 'Linh', 'Dara', 'Amara', 'Kiet', 'Minh', 'Arthit', 'Bao'] },
        na:    { fam: ['Miller', 'Johnson', 'Garcia', 'Lee', 'Brown', 'Nguyen', 'Kim', 'Davis'],
                 given: ['Madison', 'Ashley', 'Chloe', 'Grace', 'Zoe', 'Skylar', 'Ethan', 'Tyler', 'Jordan', 'Dylan'] },
        latam: { fam: ['Garcia', 'Rodriguez', 'Silva', 'Fernandez', 'Lopez', 'Santos', 'Morales', 'Castillo'],
                 given: ['Valentina', 'Camila', 'Sofia', 'Isabela', 'Luna', 'Mariana', 'Mateo', 'Santiago', 'Diego', 'Luca'] },
        eu:    { fam: ['Novak', 'Kowalski', 'Muller', 'Rossi', 'Dubois', 'Jensen', 'Petrov', 'Laurent'],
                 given: ['Emma', 'Lena', 'Sofia', 'Mila', 'Clara', 'Anya', 'Luka', 'Felix', 'Nico', 'Theo'] },
      },
    },
    // the sagas (v0.9.31, §71) — rare world events that "basically
    // invade the world and have the potential to reshape it, rather
    // than come in with a script." Birth certificate, not biography:
    // one standard entrance per saga, then the sim takes the wheel —
    // receptions, eras, the ranking, collapse and coronation belong
    // to the existing physics. Every name below is generated fiction;
    // nothing borrows a real name or mirrors an identifiable real
    // organization. The deck is APPEND-ONLY and grows as ideas arrive.
    SAGA: {
      firstWindow: [60, 320],  // the first saga lands in years ~2–7 (hash-timed)
      secondChance: 0.35,      // some worlds get a second act…
      secondGap: [70, 250],    // …spaced into the later years
      latestWeek: 384,         // nothing fires past year 8
      SUPER: {                 // the super-group project: a new house, an
        prestige: 66,          // elite international act, deep pockets
        roster: 8, quality: 84, size: 6, maleShare: 0.35,
        courtInterest: 2,      // their scouts open on OUR international board
        NAMES: [
          { co: 'Meridian Sound Group', short: 'Meridian', act: 'LUMEN NINE' },
          { co: 'Halcyon Works', short: 'Halcyon', act: 'GLASS PARADE' },
          { co: 'North Terminal Media', short: 'NorthTerminal', act: 'SIGNAL FLARE' },
          { co: 'Onda Global', short: 'Onda', act: 'VELVET ORBIT' },
          { co: 'Kitestring Collective', short: 'Kitestring', act: 'PAPER COMET' },
        ],
      },
      JV: {                    // the global joint venture — YOUR desk first
        answerWeeks: 3,        // the term sheet does not wait long
        years: 4, share: 0.25, // their money, their cut of the road abroad
        classN: [3, 4], classEvery: 48,   // worldwide audition classes, annual
        declinePrestige: 8,    // decline and it signs across the street…
        declineActWeeks: 20,   // …and the co-built act debuts there
        declineQuality: 80,
        NAMES: [
          { co: 'Westbrook Music Group', short: 'Westbrook', act: 'HORIZON CALL' },
          { co: 'Atlantica Records', short: 'Atlantica', act: 'SEVEN HARBORS' },
          { co: 'Northlight Music', short: 'Northlight', act: 'POLAR BLOOM' },
          { co: 'Silver Coast Media', short: 'SilverCoast', act: 'TIDE ATLAS' },
          { co: 'Granville Audio', short: 'Granville', act: 'MIRROR CONTINENT' },
        ],
      },
      INVASION: {              // the reverse invasion: an overseas company
        prestige: 50,          // enters Korea with diaspora talent —
        roster: 6,             // pre-warmed abroad, cold at home, the
        quality: 78, size: 5,  // tongue running backwards
        koRange: [40, 60],     // heritage speakers, mid-sentence the other way
        coldDrag: 8,           // the domestic market makes them earn it
        NAMES: [
          { co: 'Liberty Row Records', short: 'LibertyRow', act: 'CROSSTIDE' },
          { co: 'Coastline United', short: 'Coastline', act: 'NEW HARBOR' },
          { co: 'Beacon Street Music', short: 'BeaconStreet', act: 'TWO ADDRESSES' },
          { co: 'Foxglove America', short: 'Foxglove', act: 'RIVER WEST' },
          { co: 'Kestrel & Vine', short: 'Kestrel', act: 'LONG DISTANCE' },
        ],
      },
      HEIR: {                  // the heir's money: a fortune bankrolls a
        prestige: 30,          // label whose budget ignores prestige
        roster: 14, runwayWeeks: 120,
        intakeMult: 3,         // signing prices distort everywhere…
        interestMult: 2.5,     // …poaching offers get stupid…
        faInflate: 1.5,        // …and the open market reprices
        stabilizeAt: 55,       // the ending belongs to whether the gambles hit:
        burstPrestige: 12,     // prestige here by runway's end = a real company;
        burstRoster: 4,        // below it, the tap closes and the room empties
        NAMES: [
          { co: 'Aster Haus Entertainment', short: 'AsterHaus' },
          { co: 'Goldleaf Group', short: 'Goldleaf' },
          { co: 'Perihelion Music', short: 'Perihelion' },
          { co: 'Marble Arch Music', short: 'MarbleArch' },
          { co: 'Onyx Standard', short: 'OnyxStandard' },
        ],
      },
      CAPITAL: {               // the second capital: a regional market funds
        years: 5,              // a bid to become the scene's other center —
        tourRevMult: 1.3,      // supercharged region verbs for years, and the
        exportMult: 1.35,      // harvest belongs to whoever actually plants there
        auditionDiscount: 0.5, extraMinted: 1,
        NAMES: ['The Harborlight Initiative', 'The Second Stage Fund',
          'The Gateway Compact', 'The Crossroads Charter', 'The Estuary Project'],
      },
    },
    // time takes its share (v0.9.32, §39 slot 12 — audit A4 + B4 +
    // succession + the founder's board). Every anti-saturation clock
    // in one release: age bites and pays back, devotion above the bar
    // decays into expectation, executives have eras, and the founder
    // answers to a board with names. All hash-timed — the module
    // consumes no rng.
    TIME: {
      SENESCE: {               // audit A4: a 33-year-old trained like a rookie
        at: 28,                // the body starts keeping a different ledger
        growthPerYear: 0.12,   // training gains fall off past the line…
        growthFloor: 0.35,     // …but never to nothing
        recoveryPerYear: 0.06, // recovery softens year by year…
        recoveryFloor: 0.55,   // …to a floor a pro schedule can live with
        stageIQPerYear: 1.5,   // what the years take in bounce…
        stageIQCap: 9,         // …they pay back in floor (liveReliability)
      },
      DRIFT: {                 // audit B4: trust saturated high by year 3
        above: 75,             // devotion above the bar decays toward it —
        everyWeeks: 4,         // excellence becomes the expectation, monthly.
                               // Set ABOVE the founding gate (70) on purpose:
                               // the gate stays winnable, the summit does not
                               // stay owned
      },
      EXEC: {                  // executives have eras too
        eraWeeks: [240, 336],  // 5–7 years per chair, hash-timed per exec
        minWeek: 96,           // no successions in the opening years
        carry: 0.35,           // the record transfers; the devotion does not
      },
      BOARD: {                 // the founder's own board
        burnAt: 0.25,          // war-chest share that draws the investor memo
        proudAt: 2.0,          // war-chest multiple that earns the confidence
        proudTrust: 2,
      },
    },
    // the holdout (v0.9.33, §74) — "a particularly talented and highly
    // sought after recruit wouldn't necessarily sign on with a more
    // reputation company at the first offer. I'd think they'd hold out
    // for one of the powers to come knocking." The top slice of talent
    // WITH a hot market knows what she is worth. Money alone never
    // flips her — the paths past the bar are stature, her lane at real
    // height, and the courtship the powers never bother to make.
    // the product (v0.10.0, §80 findings 1+8+3) — the album is a
    // PRODUCT LINE and first-week sales are the fandom's public
    // scoreboard. Revenue splits into two publics: the fandom buys the
    // object (chodong), the general public streams the song (digital).
    PRODUCT: {
      versionCost: 6,          // each extra version: design, photobook, cards
      pobCost:   { none: 0, standard: 4, lavish: 10 },
      pobDemand: { none: 1.0, standard: 1.12, lavish: 1.22 },
      pobMargin: { none: 1.0, standard: 1.05, lavish: 1.12 },
      unitCostPerK: 0.55,      // manufacturing per 1000 units PRESSED
      marginPerK: 2.0,         // gross per 1000 units SOLD, PRE-distributor
                               // cut (v0.10.1 raised 1.55 so standard-tier
                               // net matches the pre-distributor calibration;
                               // 1.9 at first
                               // calibration — the chodong feedback loop
                               // compounded flagship budgets past the soak's
                               // runaway invariant; the flywheel needed a governor)
      versionDemand: [1, 1.14, 1.24, 1.30],  // collectors buy the line, diminishing
      runPresets: { cautious: 0.85, suggested: 1.25, bold: 1.9 },  // x demand read
      reorderShare: 0.25,      // a sold-out week reorders late, catches this much
      chodongNoise: 0.15,      // the market is not a formula
      overpressAt: 1.6,        // run past demand x this = the warehouse memo
      overpressDoubleAt: 2, overpressTripleAt: 3,   // the memo's words — "twice" / "three times" what the fandom bought (v0.11.5, §96 wiring — measure-first)
      restockShare: 0.6,       // the second run catches this much of what the late reorder left (v0.11.5, §96 wiring — measure-first)
      scarceIntensity: 2,       // the answered call that keeps it scarce feeds the fandom the story; silence gets nothing (v0.11.5, §96 wiring — measure-first)
      restockFuseWeeks: 2,     // the distributor's restock call waits this long on the Desk (v0.11.5, §96 wiring — measure-first)
      restockMinUnits: 200,    // under this the leftover is an envelope, not a run — no call (v0.11.5, §96 wiring — measure-first)
      repackDemand: 0.55,      // reprints sell real, not full (era heat carries)
      signRoundCost: 3, signRoundBoost: 0.11, signRoundsMax: 3, signFatigue: 4,
      dumpRiskAt: 2, dumpChance: 0.30,  // heavy rounds roll the album-dump story
      digitalPerReception: 1.25, digitalPopFactor: 0.25,
      titanSkew: 2.2, rumorSkew: 0.45,  // phys/dig ratio bars for the identity story
      FANBASE: { popPow: 1.55, popMult: 3.0, socialRoot: 12,
        lastMult: 0.25, preorderShare: 0.55 },
    },
    // the recurring money (v0.10.3, §80 findings 6+10) — the commerce
    // that pays salaries between comebacks, and the catalog that pays
    // forever. The fandom is a managed revenue RELATIONSHIP now.
    MERCH: {
      clubAt: 35,                 // fandom intensity that opens enrollment
      TIERS: {                    // annual membership pricing — money vs love
        gentle:   { rate: 0.9,  intensity: 2 },
        standard: { rate: 1.4,  intensity: 0 },
        steep:    { rate: 2.0,  intensity: -3 },
      },
      memberShare: 0.55,          // fanbase share that actually enrolls
      perK: 6,                    // revenue per 1000 members at rate 1.0
      greetingsWoy: 44,           // Season's Greetings ships in Q4
      greetingsPerK: 3, greetingsLavishMult: 1.6, greetingsLavishCost: 8,
      tourMerchPerK: 4,           // the merch line at every tour start
      fanconCost: 10, fanconPerK: 7, fanconIntensity: 4,
      // the free format (v0.10.42, §89 D10): the fan meeting, at cost —
      // no till, a warmer room, the grudge cooled; one clock for both
      fanMeetingCost: 25, fanMeetingFandomGain: 5, fanMeetingMorale: 2, fanMeetingCooldown: 16,
      fanconCooldown: 36, fanconFatigue: 5, fanconMinIntensity: 30,
      // v0.10.23 (the hostile audit): the window was arithmetically
      // unreachable — fancon cooldown 36 + annual greetings could never
      // stack 3 pushes in 24 weeks. The greediest legal calendar was
      // storm-proof. Widened so a stacked season is actually a risk.
      atmWindow: 40, atmPushes: 3, atmChance: 0.35,  // squeeze too hard, get the story
    },
    CATALOG_PAY: {
      perReception: 0.05,         // weekly, per release, x (reception-45)
      floorDecay: 0.15,           // an old hit never pays zero
      halfLifeWeeks: 48,          // the annuity's decay clock
      royaltyEvery: 8,            // the writer's publishing check cadence
      leverageAt: 12,             // accumulated royalties = "she doesn't
                                  // need the re-sign the way the dancer does"
    },
    // the regional founding (v0.10.10, §76 B) — found away from Seoul.
    // The LAW: the trade is real on both sides — cheaper everything and
    // a home crowd that shows up, against Seoul's gravity: a thinner
    // applicant pipeline and a longer road to the capital circuit.
    HOME: {
      costMult: 0.85,           // fallback profile (pre-atlas saves)
      networkDamp: 0.85,        // the industry's gravity is Seoul
      showsGateLift: 0.06,      // the broadcast circuit is a longer drive
      homeChance: 0.30,         // pile rows that come from the home town
      homeFeeMult: 1.35,        // the local premium
      homeFandom: 1,            // the home crowd converts
      // the atlas (v0.10.12, §82): each city is a real trade — owner:
      // "all of the cities we use have strategic implications"
      CITIES: {
        busan:   { costMult: 0.88, networkDamp: 0.90, gateLift: 0.050, pileChance: 0.35, commute: 0,
                   trade: 'the second city — a real scene of its own, and the industry half-knows the address' },
        incheon: { costMult: 0.97, networkDamp: 0.97, gateLift: 0.015, pileChance: 0.15, commute: 3,
                   trade: 'Seoul without the address — Seoul prices, Seoul access, and a monthly commute for the privilege' },
        daegu:   { costMult: 0.78, networkDamp: 0.78, gateLift: 0.090, pileChance: 0.30, commute: 0,
                   trade: 'the deep discount at the far end of the line — cheapest house in the industry, and everyone knows how far away it is' },
        gwangju: { costMult: 0.82, networkDamp: 0.82, gateLift: 0.080, pileChance: 0.30, commute: 0, schoolRep: 6,
                   trade: 'the arts city — cheap, remote, and the local academy opens with a name' },
        daejeon: { costMult: 0.85, networkDamp: 0.88, gateLift: 0.040, pileChance: 0.20, commute: 0,
                   trade: 'the rail hub — everything is an hour away by KTX, and nobody stays long enough to build a scene' },
      },
      homeTripCost: 2,          // the home-city school is up the road — lunch money, not a train ticket
    },
    // the world circuit (v0.10.9, §80 finding 13) — the overseas promo
    // wing. The LAW: the circuit is how mid-tiers actually break the
    // far markets between tours — a weekend flight, a travel bill, a
    // tongue-gated stage — and its gains feed the next tour's routing
    // through region warmth, the one truth the map already keeps.
    CIRCUIT: {
      // the overseas conventions moved onto the festival calendar — the
      // region-keyed FESTS rows (v0.10.43, §89 D9); only the version lane stays
      EN: { cost: 18, cooldown: 16, minRec: 55,   // the English-version lane
        warmth: 7, rev: 0.35 },                    // x last reception
    },
    // the Japan cycle (v0.10.8, §80 finding 4) — the second discography
    // on its own calendar. The LAW: Japan is a real quarter, not a
    // stat — the lane claims in-country weeks the Korean calendar
    // cannot use, the partner takes a real cut, and the dome is a
    // crown you climb to, not a payout. Chart and labels invented
    // (content law): the Nichion weekly, not the real one.
    JAPAN: {
      partnerAt: 35,            // jp warmth that draws the partner call
      partnerCut: 0.25,         // the partner label's share, forever — the FIRST letter's number
      notYetCutStep: 0.03,      // every "not yet" (and every letter left to expire) makes the next offer this much steeper… (v0.11.5, §96 wiring — measure-first)
      cutMax: 0.34,             // …up to here; the partner's letters never go past it (v0.11.5, §96 wiring — measure-first)
      LANES: {
        version: { cost: 25, weeks: 3, mult: 0.62,
          word: 'a JP-version single — the hit re-cut, quick and warm' },
        original: { cost: 60, weeks: 6, mult: 1.0,
          word: 'a JP-original — written for the market, a real record' },
      },
      minWarmth: 22,            // the lane needs a room that knows them
      cooldown: 20,             // between JP releases per group
      revPerScore: 1.6,         // pre-partner-cut
      warmthGain: { version: 4, original: 8 },
      fansPerScore: 22,         // the JP fanbase the ladder climbs on
      titans: ['AOI GATE', 'Shirahama Eight', 'Kaguya Moon', 'Denkou City'],
      titanBase: [78, 70, 62, 55],
      LADDER: [
        { id: 'hall', at: 800, word: 'the hall tour', rev: 25 },
        { id: 'arena', at: 2600, word: 'the arena run', rev: 70 },
        { id: 'dome', at: 5200, word: 'THE DOME', rev: 180 },
      ],
    },
    // the rituals (v0.10.7, §80 findings 15+9) — the monthly eval and
    // the point breakdown. The LAW: the eval ranks what the coaches
    // SEE (perceived reads — the fog applies), and morale swings on
    // TRAJECTORY, not position; the show breakdown is words, never a
    // formula, and the near-miss is injustice fuel the intensity eats.
    EVAL: {
      every: 4,               // the monthly showcase, hash-phased
      aceStreakAt: 3,         // three straight #1s and the room has a name for her (from PRACTICE, v0.10.30)
      minTrainees: 3,
      swingCap: 3,            // morale by trajectory, capped
      bottomTalkAfter: 2,     // consecutive bottom-third rankings
      bottomMorale: 2,
      historyCap: 12,
      sheetHighMove: 2,       // a move this big, either way, or a new ace posts the sheet 'high' (v0.11.5, §96 wiring — measure-first)
      // the mission (v0.11.13, §104 — measure-first): each showcase is held in
      // one of five rooms, announced a month ahead. A trainee who drills that
      // room until the day carries it into the showcase.
      missionPrep: 4,         // on the day, for a full month of drilling the mission (pro rata for less)
      momentNewWeeks: 8,      // a first showcase is hers for this long after she signs
      momentVeteranWeeks: 96, // two years in front of the long table
      // the talk and the slot (v0.11.14, §105 — measure-first). The
      // after-eval talk is a question now: left with the coaches (what it
      // always was), said straight by the one who signed her, or not held
      // at all and the month spent on her instead.
      talkExpire: 2,          // weeks the question waits on the desk before the coaches hold it anyway
      talkWaitWeeks: 3,       // a talk the door never got to is held by the coaches after this long
      straightMorale: 4,      // said straight: it lands harder than the coaches' version (bottomMorale)...
      straightClimbMorale: 4, // ...and the month she climbs off the bottom, she knows who told her
      coachCost: 6,           // a month of the head coach's hours, one on one
      coachBonus: 3,          // on the day, on top of whatever she drilled
      coachMorale: 1,         // given something, not told something
      coachClimbMorale: 2,    // off the bottom after the month
      coachMissMorale: 3,     // still there after it (subtracted)
      // the showcase's closing slot: the coaches' custom gives it to last
      // month's first. The desk can give it to somebody else, once a month.
      slotBonus: 2,           // the long table is watching the last one up
      slotMorale: 2,          // hers, for being given it
      slotSnubMorale: 1,      // the one who had it by custom (subtracted)
      // the year's sheet (v0.11.16, §107 — measure-first). Twelve showcases
      // make a year. On the year's last one the head coach reads the year
      // from the bottom up, off what the monthly sheets already wrote.
      yearMinSheets: 4,       // showcases stood this year to have a place on it (a third of the year)
      yearTopMorale: 3,       // first on the year: read last, and the room knows why
      yearClimbAt: 2,         // places up, first sheet of the year to the last, to be the year's climb
      yearClimbMorale: 2,     // hers, for being named
      yearKeep: 3,            // years of sheets the wall keeps
    },
    // the posting (v0.11.17, §108 — measure-first). The list on the door is a
    // letter for the room; the one it slighted most comes to the desk once.
    POSTING: {
      yearOffMorale: 4,       // first on the year's sheet, not on the list (the month's first is docked 6, in group.js)
      bothExtraMorale: 2,     // first on both: the month's dock, and this
      waitedWeeks: 96,        // two years on the floor before a list with her name on it is worth a sentence
      doorWeeks: 6,           // she comes to the desk within this many weeks of the list, or not at all
      doorExpire: 3,          // weeks she stands in the doorway
      whyMorale: 3,           // told why: a reason is worth half the dock
      promiseMorale: 6,       // promised the next lineup: all of it, on credit
      promiseWeeks: 96,       // "the next lineup" has two years to exist
      nothingMorale: 2,       // "the list is the list" (subtracted)
    },
    POINTS: {
      nearMissGap: 8,         // close enough to hurt out loud
      nearMissIntensity: 2,   // the fuel the fandom machinery eats
      nudgeCost: 6, nudgeBoost: 7,   // ONE player push a week
    },
    // the staff (v0.10.6, §79) — the second fog. The LAW: the truth
    // (aptitude + style) is hash-stable per person and NEVER surfaces —
    // no stat, no reveal, no number in any blurb, ever. The player
    // reads personality (true, not skill), the résumé (true facts,
    // selection-biased), and reputation (the PRICE, imperfectly
    // correlated with truth by construction). Results arrive tangled
    // with every other cause; the attribution problem IS the game.
    HIRES: {
      SEATS: [
        { id: 'vocal', label: 'head vocal coach' },
        { id: 'dance', label: 'head dance coach' },
        { id: 'perf', label: 'performance director' },
        { id: 'scout', label: 'head scout' },
        { id: 'anr', label: 'A&R lead' },
        { id: 'marketing', label: 'marketing lead' },
        // the studio (v0.10.35): two chairs whose truth is a craft, not a multiplier
        { id: 'producer', label: 'house producer', studio: true },
        { id: 'writer', label: 'house writer', studio: true },
        // the second chair (v0.10.39, §91 B2): opens when the first proves out
        { id: 'producer2', label: 'second house producer', studio: true, second: 'producer' },
        { id: 'writer2', label: 'second house writer', studio: true, second: 'writer' },
      ],
      secondChairAfter: 2,       // records the first chair has to show before the second opens
      REP_TIERS: ['unknown', 'working', 'known', 'a name'],
      hireCost: { 'unknown': 8, 'working': 18, 'known': 40, 'a name': 80 },
      // the hidden range — never printed anywhere
      multLo: 0.88, multHi: 1.15, meshSpan: 0.06,
      offSeatDamp: 0.8,          // best at one seat, hired into another
      knownForMatch: 0.6,        // the tag points at the true seat this often
      gemChance: 0.18,           // the unknown genius nobody has caught
      tierFloor: { 'unknown': 0.10, 'working': 0.25, 'known': 0.38, 'a name': 0.48 },
      tierSpan: 0.55,            // + hash * this = aptitude
      candidateChance: 0.05,     // per week, one interview at a time
      fameForKnown: 0.30, fameForName: 0.55,   // who takes the meeting
      noteChance: 0.04,          // a staff note in their voice
      meshNoteAfter: 10,         // friction shows in prose first
      repRiseAt: 68, repRiseChance: 0.30,   // hits polish the seats' names
      poachTierMin: 2, poachChance: 0.010, poachCooldown: 30,
      raiseCost: 25,
      // the road manager (v0.8.4; on the group since v0.10.43, §89 D8): one
      // staff — the seats are the building's, the manager is the group's,
      // and one poach scene covers every chair (the raise is the same 25)
      MANAGER: { poachPopMin: 45, poachTenureMin: 20, poachChance: 0.04, poachMorale: 3 },
      // the help wanted (v0.10.11): act on the market instead of
      // waiting for it — and fire into the fog, severance attached
      searchCost: 12, searchCooldown: 8,
      severanceMult: 0.5, severanceMin: 4,
      fireTrustTierMin: 2,     // letting a KNOWN name go costs boardroom trust
      passMemoryCap: 6,        // the market remembers this many names the desk passed on (v0.11.5, §96 wiring — measure-first)
      passReturnWeeks: 20,     // …and about a season later one of them takes a chair across the street (v0.11.5, §96 wiring — measure-first)
    },
    // the song market (v0.10.5, §80 finding 11) — demos cost money and
    // have other suitors. The LAW: passing on a hot hook is a bet with
    // a clock on it, and the ghost story is the industry collecting.
    MARKET: {
      priceFloorHook: 45,       // below this a demo is relationship-priced (free)
      pricePerHook: 0.5,        // asking ≈ (hook − floor) × this × heat
      heatMult: { 'in demand': 1.6, reliable: 1.2, workmanlike: 1.0,
        'cold streak': 0.7, unproven: 0.85 },
      circulatingAt: 68,        // hooks this hot are shopping while you read
      windowWeeks: 3,           // the dated window before rivals may buy
      buyChance: 0.30,          // per week past the window
      campCost: 25, campDemos: 2, campHookShift: 6,   // the spend verb
      campCooldown: 12,
      bondAt: 2,                // records together = a working relationship
      bondHookBonus: 5,         // a bonded producer shows you his best
    },
    // the making (v0.10.4, §80 finding 5) — prep stops being an opaque
    // countdown: the runway auto-schedules STATIONS with surfaces. The
    // LAW: slippage is a decision (postpone or crunch), never silent.
    PIPE: {
      place: { recording: 0.30, choreo: 0.50, mv: 0.72, jacket: 0.86 },
      recSickFatigue: 74,         // a lead vocalist above this pushes recording
      finalStretch: 3,            // weeks-out where a slip threatens the date
      postponeWeeks: 2,           // the notice nobody wants to write
      postponeBuildup: 8,         // expectation cools with the date
      crunchFatigue: 9,           // per member, the week the crunch eats
      mvFatigue: 7, mvClipChance: 0.07, mvClipBuildup: 6,
      jacketBuildup: 3,
      choreoCount: 8,             // the named pool, like the writers' room
      diffHard: 68,               // at/above: "punishing" choreography
      hardDanceFloor: 58,         // avg dance below this pays on stage
      hardPerfPenalty: 6,         // the stage bill for reach > grasp
      hardEncoreBonus: 0.08,      // and the encore lottery watches closer
      lineWarChance: 0.20,        // per fault on the sheet (a quiet voice, one voice carrying
                                  // the record), the stopwatch thread organizes at release
    },
    // the pair (v0.10.40, §88 D) — two-person content, playable: the
    // mentorship, the writing pair, the seating chart, the in-group
    // rivalry framed. Verbs on the group page; consequences ride the
    // rails that exist (relationships, badblood, credits, development).
    PAIR: {
      cost: 3,                    // staff time: a pairing, a seating chart
      mentorWeeks: 10,            // a mentorship runs this long
      mentorWarmth: 55,           // the veteran has to be warm
      mentorLead: 12,             // and ahead of the rookie (live reps, or age ×6)
      menteeMorale: 55,           // a rookie struggling: morale under this, or sliding on the sheet
      mentorGrowth: 1.15,         // the rookie trains faster while mentored
      mentorDrift: 1.2,           // the pair warms, weekly
      mentorCooldown: 16,         // per rookie, between mentorships
      writeDrift: 1.5,            // the writing pair bonds while a record is in production
      writeBond: 8,               // and a co-written track lands on the pair for real
      seatWeeks: 8,               // the seating chart runs this long
      seatCoolMult: 2.0,          // kept apart, a feud cools at twice the pace
      seatDistanceMult: 0.5,      // and the distance watch sees half as much
      seatMediationAfter: 4, seatMediationBonus: 0.1,   // weeks apart make the sit-down likelier
      rivalryMoraleHold: 55,      // framed as competition: both above → the edge; either under → the room sours
      rivalryGrowth: 1.1,         // the edge: both train harder
      rivalryLiveExp: 0.5,        // and rehearse like it is a final
      rivalrySourDrag: 2.0,       // sour: the rivalry's drag on the room doubles
      unpairSoonWeeks: 8,         // a writing pair dissolved inside this many weeks was just getting somewhere… (v0.11.5, §96 wiring — measure-first)
      unpairSoonMorale: -1,       // …and both notebooks notice (v0.11.5, §96 wiring — measure-first)
    },
    // the mirror (v0.10.40, §88 E) — the manager's shadow: the directed
    // ledger aggregated across the roster and said out loud, in words.
    // It gates, gently, which questions people bring and how early.
    MIRROR: {
      minEntries: 3,              // under this the building has no read of you
      lead: 2,                    // a trait reads one way when its side leads by this (and has two)
      knockEarly: 1,              // a boss who listens: the per-person knock gap shrinks
      knockLate: 2,               // a boss who schedules through it: it grows
      CATEGORIES: {
        promises:   { for: ['promiseKept'], against: ['promiseBroken'],
          yes: 'keeps promises', no: 'has broken promises people remember' },
        doors:      { for: ['openedTheDoor', 'ambitionPromised', 'honestAnswer', 'realTerms', 'sweetened', 'wonBack'],
          against: ['deflected', 'leftWaiting', 'tableLeftWaiting', 'heldBack', 'heldToPaper', 'standardTerms'],
          yes: 'opens doors before the third ask', no: 'makes people push for what they want' },
        hearing:    { for: ['heardHer', 'heardOut', 'listened', 'breatherGranted', 'mediated', 'mentored'],
          against: ['breatherDeclined', 'pressed', 'pushedThrough', 'muzzled'],
          yes: 'listens when they say they are struggling', no: 'schedules through what people say' },
        protection: { for: ['protected', 'protectedHealth', 'stoodByHer', 'welcomedBack', 'endingHonored', 'lastNight', 'lastRecord'],
          against: ['madeHerHide', 'benchedPride', 'keptOffline', 'reprimanded'],
          yes: 'puts the person before the schedule when it costs', no: 'puts the schedule first' },
        credit:     { for: ['seen', 'carrySeen', 'glueSeen', 'unitCredit', 'soloCredit', 'gaveTheSpeech', 'trusted'],
          against: ['linesCut', 'songPassed', 'passedOver', 'cutFromLineup'],
          yes: 'spreads the light', no: 'sends the credit where the numbers are' },
        hard:       { for: ['toldStraight', 'honestAnswer', 'stingRespected'],
          against: ['deflected', 'leftWaiting'],
          yes: 'has the hard conversation', no: 'avoids the hard conversation' },
      },
    },
    // the promotion (v0.10.38, §91 Phase 5) — the plan stays the plan
    // (two slots a week, four weeks, billed at lock — the owner's law)
    // and gains four doors: the OFFERS (a show invites the risers and
    // the carriers, variety invites a face with media reps — a swap on
    // the locked plan, with a broadcaster ledger that remembers a
    // cancellation), the EXTENSION (a record still climbing runs two
    // more weeks for a fatigue price), the COMEBACK STAGE (the era's
    // first stage is a named special), and MARKETING FIT (a push is a
    // match to the record, not a budget line).
    PROMO: {
      FIT: {   // home ×1.25 / off ×.75 / otherwise ×1 — by the record's lane
        challenge:   { home: ['performance', 'hiphop', 'futuristic', 'dark'], off: ['dreamy', 'elegant', 'retro'] },
        radio:       { home: ['dreamy', 'elegant', 'retro', 'bright'], off: ['performance', 'hiphop', 'futuristic'] },
        radioPush:   { home: ['dreamy', 'elegant', 'retro', 'bright'], off: ['performance', 'hiphop', 'futuristic'] },
        contentDrop: { home: ['futuristic', 'fusion', 'bright'], off: ['retro'] },
        showcase:    { home: ['performance', 'hiphop', 'dark'], off: ['dreamy', 'elegant'] },
        primeStage:  { home: ['performance', 'hiphop', 'dark', 'futuristic'], off: [] },
        popWave:     { home: ['bright', 'fusion'], off: [] },
      },
      fitHome: 1.25, fitOff: 0.75,
      OFFERS: {
        showChance: 0.4,          // per promo week with a reason (climbing, a carried stage, or the numbers)
        showOfferReception: 62,   // "the numbers": a record this warm gets the call anyway
        varietyChance: 0.3,       // a face the variety producers want
        varietySkillAt: 60, varietyMediaAt: 6,
        perEra: 2,                // the desk fields at most this many invitations an era — a choice, not a task list
        trustMin: -1,             // a broadcaster at/under this does not call
        declineCoolAt: 2,         // a desk told no this many times without a yes between… (v0.11.5, §96 wiring — measure-first)
        declinedOfferMult: 0.5,   // …calls at this fraction of its chance — the same draw, a lower bar (v0.11.5, §96 wiring — measure-first)
      },
      trustFloor: -3, trustHealWeeks: 12,   // the booking desks forgive, slowly
      EXT: {
        weeks: 2, fatigue: 6,     // the second wind, and what the members pay for it
        plan: [['popWave', 'radio'], ['livestream']],   // the extension's own light plan
        warnFatigue: 70,          // the staff flag a tired room before it signs on
      },
      CB: { carrierHype: 3, roomHype: 1, clipChance: 0.15 },   // the comeback stage: hype-bearing, the one everyone clips
    },
    // the stage, judged (v0.10.37, §91 Phase 4) — ONE rating per
    // performance, `KP.stageRead`: each voice against her load on the
    // sheet (the song's vocal demand scaled by her share), each body
    // against the choreography, presence, live reliability, fatigue
    // (steeper than the old read), morale (a low room goes through the
    // motions), the formation (chemistry, the pairs, the rehearsal
    // chair, the choreography against the room, the holes), and a hash
    // wobble per (seed, stage, week) — television, not the stream.
    STAGE: {
      MIX: {   // the song's live demand by lane: voice, body, presence
        performance: { vocals: 0.25, dance: 0.50, presence: 0.25 },
        hiphop:      { vocals: 0.30, dance: 0.40, presence: 0.30 },
        futuristic:  { vocals: 0.30, dance: 0.45, presence: 0.25 },
        dark:        { vocals: 0.35, dance: 0.40, presence: 0.25 },
        bright:      { vocals: 0.40, dance: 0.35, presence: 0.25 },
        retro:       { vocals: 0.45, dance: 0.30, presence: 0.25 },
        elegant:     { vocals: 0.50, dance: 0.25, presence: 0.25 },
        dreamy:      { vocals: 0.55, dance: 0.20, presence: 0.25 },
        fusion:      { vocals: 0.35, dance: 0.35, presence: 0.30 },
      },
      scale: 75,                  // × the mixed fit (voice, body, presence against their bars) — measured v0.10.37
      presenceAt: 52,             // stage presence reads 1.0 here
      fitCap: 1.05, presenceCap: 1.1,   // a voice over its bar stops paying early: a veteran room is carried on its good nights, not every night (measured v0.10.37)
      loadBase: 0.7, loadPerShare: 1.5,   // her vocal bar = the song's demand × (base + share × per)
      seatedDance: 0.5,           // the chair performs half the choreography
      relPer: 0.25,               // (liveReliability − 50) × this
      fatigueFrom: 60, fatiguePer: 0.35,  // steeper than the old −0.03 a point
      moraleFrom: 50, moralePer: 0.15,    // a low room goes through the motions
      chemPer: 0.12,              // (chemistry − 50) × this on the formation
      closePair: 1, closeCap: 3,  // close pairs read as not acting
      tensePair: 2, tenseCap: 6,  // tense pairs read cold in formation
      gapPer: 0.2, gapCap: 12,    // the choreography's difficulty over the room's dance
      easyAt: -15, easyBonus: 2,  // a room well over its choreography makes it look easy
      absentPer: 3, absentCap: 9, // formation holes
      rehearsalSpan: 30,          // (seatMult('perf') − 1) × this — the chair finally multiplies
      formationApart: -8, formationLocked: 5,
      wobble: 6,                  // ± per (seed, stage, week)
      carriedAt: 75, cleanAt: 58, shakyAt: 44,   // bands: carried / clean / shaky / fumbled
      carrierMin: 75, momentLead: 10,  // the one who carried: her score, and over the room
      fumblerMax: 40, momentLag: 12,   // the one who lost it
      intensity: 1, morale: 1,    // ± per carried / fumbled stage (ruling 5: teeth)
      fancamChance: 0.10,         // a carried stage posts the clip
      stormChance: 0.20,          // a lost stage wakes the clip storm
      distanceChance: 0.25,       // a fumbled stage with a tense pair wakes the distance watch
      repPer: 1,                  // reputation.performance ± on carried / fumbled (its first writer)
      craftAlpha: 0.25,           // the act's rolling stage craft
      awardsPer: 0.3,             // (stageCraft − 55) × this on the artist ballot
      badNightDemand: 0.9, goodNightDemand: 1.05,   // the tour: a bad night sells the next week softer
      festMorale: { carried: 2, clean: 1, shaky: 0, fumbled: -1 },
      gayoCarriedFandom: 1,       // on top of the gayo stage's own
    },
    // the sheet (v0.10.36, §91 Phase 3) — the line distribution over the
    // song's PARTS. Shares are running-time fractions the fandom times
    // with a stopwatch (public facts, never a read); bars are the demand
    // each part makes on its voice, scaled from the song's own demands.
    // The producer proposes by the voices as his ear hears them — a
    // weak ear mis-hears — and the desk trusts, flattens, front-loads
    // the ace, or writes its own, bounded.
    SHEET: {
      PARTS: [
        { id: 'verse1', label: 'the first verse', share: 0.11, demand: 'vocals', bar: 0.97 },
        { id: 'verse2', label: 'the second verse', share: 0.11, demand: 'vocals', bar: 0.97 },
        { id: 'pre', label: 'the pre-chorus', share: 0.12, demand: 'vocals', bar: 1.12 },
        { id: 'chorus', label: 'the chorus', share: 0.26, demand: 'vocals', bar: 1.25 },
        { id: 'rap', label: 'the rap', share: 0.14, demand: 'rap', bar: 1.08 },
        { id: 'bridge', label: 'the bridge', share: 0.12, demand: 'vocals', bar: 1.4 },
        { id: 'killing', label: 'the killing part', share: 0.14, demand: 'presence', bar: 1.0 },
      ],
      // the lane's shape: share multipliers per part (missing = 1)
      SHAPES: {
        bright: { killing: 1.2 }, elegant: { rap: 0.4, bridge: 1.5 }, dreamy: { rap: 0.3, bridge: 1.5, pre: 1.2 },
        retro: { rap: 0.5, killing: 0.8 }, dark: { rap: 1.3, killing: 1.2 }, hiphop: { rap: 2.0, bridge: 0.5, pre: 0.8 },
        performance: { killing: 1.8, bridge: 0.6 }, futuristic: { killing: 1.4, rap: 1.2 }, fusion: {},
      },
      rapFrom: 20,                // a song with less rap demand than this has no rap part
      minShare: 0.05,             // no part is a footnote — a sliver is lifted to this
      rapDemandAt: 50, rapDemandSpan: [0.5, 1.4],   // the rap's share follows the song's rap demand
      presenceBase: 30, presencePer: 0.5,    // the killing part's bar, from the song's choreo potential
      barFloor: 30, ratioCap: 1.15,          // a voice over its bar stops paying past the cap
      earDefault: 60, earWobble: 0.18,       // the producer's ear: ±(100 − craft) × wobble on each voice
      repeatPenalty: 30,          // fit points a second part costs on the proposal (measured v0.10.36:
                                  // 10 handed one voice 59% of the record; 30 → top voice ~40%, one in six sheets heavy)
      aceBonus: 8,                // the producer hears the ace on the killing part
      maxParts: 3,                // a custom sheet hands one voice at most three parts (or the even split)
      floorShare: 0.05,           // under this, the stopwatch calls her quiet
      heavyShare: 0.45,           // at/above: one voice carries the record
      recordingScale: 57,         // measured v0.10.36 (160 debut fixtures, trust): fit p10/50/90 .78/.95/1.08 →
                                  // the recording term's row lands where the room average left it (19.4 of craft)
      boothFatigue: 10,           // × share, the booth's hours
      quietMorale: 3, spreadMorale: 2, grievancePro: 45,   // under the floor / every voice on it
      hypeFrom: 0.20, hypePer: 20, hypeCap: 6,             // the voice of the record
      centerParts: ['chorus', 'killing', 'verse1'],         // front-load the ace
    },
    // the medical desk (v0.10.4, §80 finding 12) — injuries as arcs,
    // not a meter: the diagnosis scene, the chronic file, the flare.
    // Push-through-or-protect is judged forever (the directed ledger).
    MEDICAL: {
      base: 0.0011,               // per member-week, before multipliers
      fatigueAt: 68, fatigueMult: 3.0,
      loadMult: 1.9,              // promo, tour, crunch weeks
      chronicMult: 1.5,           // per chronic entry — bodies keep books
      restMin: 3, restMax: 6,     // the full-rest arc
      seatedWeeks: 4,             // partial participation, seated
      pushChronicChance: 0.35,    // pushing through mints a chronic file
      pushWatchWeeks: 8, pushWatchMult: 2.0,
      nodulesBase: 0.0015,        // vocal cords in singing-load weeks
      strainShare: 0.40,          // the sheet (v0.10.36): a share at/above makes her a vocal lead…
      strainMult: 2.0,            // …and the roll scales with the share (× (1 + share × mult))
      flareChance: 0.05,          // per chronic, in high-load weeks
      flareFatigue: 6,
      playedHurtAt: 2,            // pushes before the world names it
    },
    // the person in public (v0.10.2, §78 A) — "they might ask for
    // permission to go live or to start a video channel... things that
    // could really help a small unknown and really hurt a major group
    // depending on what's said." The platform is WeCast (invented).
    // The LAW: her own voice is a lever whose throw scales with how
    // known she is — growth is fame-UNdamped (phone-camera law), the
    // gaffe blast scales with the public eye.
    // the runway (v0.10.19, §85): financing, the Rescene path. Money
    // is a bridge, not a rescue — every won arrives with a hand
    // attached. Priced on observables ONLY.
    FINANCE: {
      pitchCost: 2,              // the data room: printing, coffee, one good suit
      pitchCooldown: 12,         // funds remember last quarter's deck
      answerWeeks: 1,            // the fund reads the room, then calls
      sheetFuseWeeks: 3,         // a term sheet has a fuse
      // the read: observables, weighted — fame, the chart line, the
      // fandom, the archive, the personal channels ("the channels can
      // pay off" — owner)
      wFame: 0.35, wChart: 0.20, wFandom: 0.15, wCatalog: 0.15, wChannels: 0.15,
      catalogViewsFull: 150000,  // archive views that read as "a real library"
      channelFull: 3,            // this many live member channels reads as max
      passBar: 0.05,             // below this read, the answer is a pass
      passClosedChance: 0.5,     // a closed window passes on half of everyone
      offerBase: 70, offerScale: 400,
      covenantMult: 1.35, boardMult: 1.15,   // the poison prices the money
      closedMult: 0.55,          // harsh money is smaller money
      burnedMult: 0.7,           // a missed covenant follows you
      repBonus: 0.15,            // each kept covenant re-prices the next round
      revSharePct: 0.12, revShareWeeks: 104,  // the settlement line, two years
      boardWeeks: 104,           // the seat, two years
      covenantWeeks: 44,         // the milestone clock
      // v0.10.23 (the hostile audit): the covenant was an infinite
      // printer — the milestone was unmissable, the wire never came
      // back, and kept covenants compounded offers without bound
      covenantPeak: 15,          // the milestone is a REAL landing now
      covenantKeptTrust: 2, covenantMissTrust: -3,
      repBonusCap: 3,            // kept-covenant re-pricing stacks thrice, then stops
      // even a KEPT covenant leaves a hand on the label (v0.10.23):
      // the fund converts to a light revenue share — cheap capital for
      // executors, never free capital
      covenantKeptSharePct: 0.06, covenantKeptShareWeeks: 52,
      raiseGapWeeks: 24,         // after a covenant resolves, funds want a full cycle
      windowShare: 0.55,         // years the mother-fund allocation is open
    },
    // the content desk (v0.10.18): the company account. Owner: "you
    // can only choose a topic that's relevant. if you aren't touring,
    // you can't post a tour vlog."
    CONTENT: {
      baseViews: 900,            // the floor an unknown account pulls
      viewsPerSocial: 0.05,      // + a share of the featured following
      viewsPerPop: 120,          // + the group's name recognition
      hitChance: 0.05,           // an upload breaks containment
      hitViewsMult: 8,
      hitHype: 4,                // the featured face feels the numbers
      hitFollowShare: 0.06,      // hit views that convert to followers
      featureMorale: 1,          // being in the frame feels good
      maxCatalog: 60,            // the shelf keeps the recent archive
      // the ad settlement (v0.10.20): owner — "1 won per x amount of
      // views feels easiest. your total views compound over time."
      adViewsPerWon: 10000,      // the platform's flat rate, quarterly
      adChannelShare: 0.04,      // weekly views a live channel pulls, per follower
      adCatalogTail: 0.01,       // the ACTIVE archive keeps getting watched…
      adTailDecay: 0.94,         // …but attention has a half-life (v0.10.23 —
                                 // the lifetime tail compounded quadratically)
      adWeeklyViewCap: 40000,    // the meter banks at most this much per week
    },
    CAST: {
      askChance: 0.05,           // weekly, when somebody eligible wants the mic
      askConfidence: 55, askWarmth: 50,  // who wants it: the outgoing
      unsancProfessionalism: 32, // below this, she sometimes just... goes live
      unsancChance: 0.20,        // of the ask that week being unsanctioned instead
      trainCost: 4, trainGaffeMult: 0.5, // media training halves the lottery
      declineMorale: 3,          // "the company does not trust me"
      liveFollowers: 2500,       // a one-off live, personality-scaled
      drip: 700,                 // weekly channel growth, personality-scaled
      viralChance: 0.04,         // an upload breaks out (fame-UNdamped)
      gaffeBase: 0.035,          // weekly, scaled by personality + training
      gaffeMoraleKnown: 5, gaffeCharm: 400,  // hurt when known; charming when not
      hypePerViral: 5,
    },
    // the person in public (v0.10.2, §78 B) — the scandals. The house
    // philosophy holds: the sim names the SHAPE at altitude, never the
    // contents. Consequences and institutions, never bodies.
    SCANDAL: {
      base: 0.0009,              // per public person-week, before the scalers
      exposurePer: 0.35,         // each public surface (channel, deal, gig) adds
      SHAPES: ['an old post resurfacing', 'a remark caught on the record',
        'a story with legs', 'an entanglement making the rounds'],
      sevWeights: [0.58, 0.25, 0.12, 0.05],  // storm / sponsors / hiatus / choice
      smallFameCap: 0.30,        // below this fame, severity caps at 2 —
                                 // the unknown label's scandal dies on
                                 // page four (its own bleak mercy)
      hiatusWeeks: 12,           // the forced break, severity 3
      protectCost: 40, protectTrust: 4, protectFandom: 8,
      releaseFandom: 15,         // the fandom wound that heals
      denyRebreakChance: 0.35, denyWindow: 12,  // the trap, same as the secret
      statementCost: 3,
      rivalChance: 0.012,        // the world draws from the same deck weekly
    },
    // the settlement (v0.10.1, §80 findings 2+7+14) — jeongsan: idols
    // see no pay until the label recoups; the quarterly books; the
    // distributor who puts the record in stores for a cut.
    SETTLE: {
      groupShare: 0.30,          // the group's contract share of era/tour revenue
      trainingDebtPerMember: 15, // the practice years, on the ledger at debut
      backpay: 10,               // the fair first settlement pays it warm
      fairMorale: 8, leanMorale: 3,
      grindAt: 120,              // unsettled this long after debut = the grievance
      grindEvery: 48,            // ...renewed yearly in the directed ledger
      paidMorale: 1,             // every settled era pays a little pride too
    },
    BOOKS: {
      quarterWeeks: 12,          // 48-week year, four statements
      redErasAt: 3,              // loss-making eras in a row = the hard talk
      tightBeltCut: 0.85,        // the cost-cut option trims the next era's bills
      redInkSilenceMorale: -2,   // the red-ink meeting left unheld: the room reads the silence, every member (v0.11.5, §96 wiring — measure-first)
    },
    DIST: {
      TIERS: [
        { id: 'indie',    label: 'a regional distributor', cut: 0.30, reach: 0.85, bar: 0 },
        { id: 'standard', label: 'a national distributor',  cut: 0.25, reach: 1.00, bar: 8000 },
        { id: 'major',    label: 'a major distribution arm', cut: 0.18, reach: 1.12, bar: 30000 },
      ],
      advance: 60, advanceVig: 1.15, advanceRepayShare: 0.5,
      fameTier: [0.30, 0.60],    // lazy init: fame below/between/above → tier
      recourtWeeks: 52,          // "stay" is remembered: the courting call waits about a year before it comes again (v0.11.5, §96 wiring — measure-first)
    },
    // the table (v0.9.38, §76 A) — "feels a little too easy to just
    // click the sign button as a brand new label competing against
    // established brands." Worthwhile files counter at the table when
    // the label's name cannot close on its own. Holdouts are exempt —
    // their premium IS the table; applications came to YOU.
    TABLE: {
      fameBar: 0.45,        // above this, the name closes deals — one click
      talentBar: 48,        // ordinary files sign standard; the table is
                            // for the ones worth arguing over (perceived avg)
      bonusMult: 0.5,       // signing bonus counter: extra signCost share…
      bonusMin: 8,          // …scaled by how unknown the label is
      debutByWeeks: 72,     // the debut-by clause: about 18 months, in writing
      extendWeeks: 24,      // one plead buys half a year, once
      warnAt: 12,           // the clock gets a warning letter this far out
      trainFee: 15,         // the training guarantee: facility money up front…
      trainGrowth: 1.12,    // …and the coaches actually deliver it
      pleadMorale: 8,       // asking her to wait past her own clause
      keptMorale: 4,        // a promise kept in writing lands warmer
    },
    HOLDOUT: {
      talentMin: 64,        // real peak talent — the top slice of the board
                            // (measured: fresh boards run top-5 ≈ 72–78,
                            // p75 ≈ 58 across 130 files; 64 ≈ the top ~8%)
      heatMin: 2,           // AND rivals circling — she knows the market
      gratefulShare: 0.25,  // a hash-carved minority sign anyway: some kids
                            // just want the door that opened
      rankBar: 3,           // a power = top-3 on the trades' ranking…
      powerScore: 85,       // …with a REAL score — the scene chart is a
                            // small pond early (legacy start opens rank 1
                            // of 4 at score ~64); her bar is the wider
                            // world's read, so the seat must be earned in
                            // absolute terms, not just relative ones
      laneRep: 60,          // …or HER lane at real height on your letterhead
      visitsToWin: 3,       // the third sincere visit wins her
      visitGapWeeks: 6,     // visits need air between them to read sincere
      premium: 1.4,         // the market's read is priced in when she signs
      rivalPrestigeBar: 55, // she refuses the small houses too — only the
                            // heir's bankroll jumps her bar with money
    },
    // the blank page (v0.9.34, §74 second half) — the fourth door:
    // "name your own company, start with no trainees, and no
    // reputation. hard mode, essentially." Built as THE FOUNDING AT
    // WEEK ONE, WITHOUT THE FAME: state.founded from day one, the
    // founder's board (§73) as the pressure layer, the holdout
    // (v0.9.33) as the wall — the sought-after kids will not take
    // your calls until the ranking says otherwise.
    BLANK: {
      warChest: 240,       // the seed round — the runway memo fires at 25%
      signings: 6,         // the founder's allowance (a class needs 4-6)
      rep: 25,             // Unproven label, every lane
      trust: 55,           // the money believes in you — provisionally
    },
    // the network (v0.9.35, §75) — "the board should be empty at game
    // start. all of the prospects already exist, but you have to choose
    // who you uncover." The board is what your network can see; the
    // network is READ from numbers that already exist, never stored.
    // Private channels are yours alone (no rival heat = rarely
    // holdouts); the public landscape arrives contested.
    NETWORK: {
      boardCap: 24,            // arrivals wait when the board is full
                               // (the season's finale ignores the cap —
                               // world events do not check your desk)
      OPENING: { major: 12, current: 5, fresh: 3, blank: 0 },
      APP: {                   // applications: inbound, scaled by the name
        base: 0.06, perNetwork: 0.30,
        hitSpike: 2.0, hitWindow: 10,  // a hot release spikes the pile
        believerChance: 0.15,  // some kids apply because of your STORY
      },
      REF: {                   // referrals: the building knows people
        base: 0.04, perRoster: 0.008,
        observations: 2,       // a referral arrives half-read
      },
      SOCIAL: { chance: 0.03, hype: [20, 35] },
      // §84 D (v0.10.17): the private channels, imperfectly — sometimes
      // the girl you found has been seen before, and the file says so
      preKnownChance: 0.10,
      STREET: {                // shoe leather, not reputation.
        // the ladder rebalance (v0.10.12, §82 B) — owner: "it should
        // feel like a total crapshoot heavily weighed towards extremely
        // raw prospects. chasing upside is the risk." The districts hand
        // you teenagers who move well in a crowd, not trainees.
        cost: 8, cooldownWeeks: 4, minted: [1, 2],
        rawFactor: 0.6,        // current skill scaled — years from a stage
        dudChance: 0.25, dudDrop: 8,    // the fog swings down too now
        gemChance: 0.12, gemBump: 10,   // …and higher when it swings up
      },
      CALL: {                  // the open call: turnout scales with the name.
        // §82 B: everyone in that line CHOSE to audition — a real polish
        // floor, a collapsed first read (you watched the tape), and a
        // bigger class. Quality AND quantity; that is what 40 buys.
        cost: 40, cooldownWeeks: 30, baseMinted: 3, perNetwork: 5,
        polishBump: 5, observations: 1,
      },
      CASTOFF: {               // the castoff market (v0.10.12, §82 C;
        // reworked v0.10.13) — owner: "if it's public knowledge that
        // Aurum released 3 trainees, it's public knowledge that they're
        // at least theoretically available." EVERY announced cut boards.
        debutChance: 0.45,              // the one who missed the lineup by a hair
        polishBump: 6, ageMin: 17, ageMax: 21, obs: 2,
        window: 10,                     // weeks on the board — the market moves fast on known quantities
        // v0.10.13: some are done with the industry — the offer gets
        // made, the offer gets declined, the file leaves the board
        doneChance: 0.30,
        // the majors' castoffs: trained at a big agency, known to the
        // public, and they sign on THEIR terms — debut in writing, at
        // a premium
        majorPrestige: 55, majorPremium: 1.4, majorHype: [8, 18],
      },
    },
    // the public eye (v0.9.36, §77) — "just how public the whole
    // industry is." The sim knew; now the public SAYS it: known
    // trainees, snub stories, announcement expectations, comparisons.
    PUBLIC: {
      knownHype: 25,           // hype past this = the public knows her name
      knownSocial: 60000,      // …or a following that big
      aceWatchChance: 0.05,    // weekly ambient "where is she" while known+unassigned
      snubMorale: 6,           // watching the lineup announced without you
      EXPECT: {
        watchingAt: 12, loudAt: 24, arenaAt: 40,   // expectation points → level
        WORDS: ['quiet curiosity', 'the industry is watching',
          'loud — the announcement made the trades', 'arena-sized expectations'],
        bar: [38, 50, 60, 70],   // reception the world calls "delivering", per level
        exceedMargin: 12, missMargin: 10,
        buildupRaises: 30,       // a countdown this deep raises the bar a level
        exceedFandom: 3, missMorale: 4,
      },
      compareChance: 0.55,     // a landing week draws the comparison post
      houseGapNote: 18,        // sibling gap that makes the inbox, not just the feed
    },
    // the grind (v0.9.37, §76 C) — "label reputation should have a
    // direct impact on a song's ceiling. if no one knows who you are,
    // it should be difficult to get the song out there, even if you
    // spend big." fameRead is who knows YOU (networkRead is who you
    // can find) — derived from durable facts, no stored meter.
    FAME: {
      base: 0.05,
      repFloor: 20, repDiv: 130,    // best reputation lane's share
      perChart: 0.03, chartMax: 0.12, hitReception: 60, // real hits, not weak-week peaks
      perWin: 0.012, winMax: 0.10,  // music-show trophies
      popFloor: 40, popDiv: 200, popMax: 0.15, // standing ABOVE "recently debuted"
      perFace: 0.02, faceMax: 0.08, // publicly known names on the roster
      perBreak: 0.05,               // a breakthrough moves the wall PERMANENTLY
      wallBelow: 0.50,              // under this, the ceiling is real
      capBase: 42, capSlope: 65,    // the ceiling: base + fame x slope
      overCapKeep: 0.30,            // quality above the wall mostly goes unheard
      paidFloor: 0.30, paidKnee: 0.55, // ad money converts through fame
      showBar: 0.28,                // below this the music shows don't call back
      camCapLift: 10,               // a phone-shot gig clip lifts the era's ceiling
      viralLiftCap: 20,             // clips stack the ceiling only so far (v0.10.23)
      // the top is heavy (v0.10.23, the hostile audit: major autopilot
      // landed 85% hits with zero effort): repeating the same concept
      // wears the formula, and a giant fanbase raises the bar
      conceptFatiguePer: 5, conceptFatigueCap: 12,
      expectationDragFrom: 70, expectationDragPer: 0.2,
      sparkCapLift: 8,              // so does the defining stage clip
      // the distribution gap (v0.10.21): the wall caps how good the
      // song SOUNDS; reach caps how far it TRAVELS. Under the wall the
      // chart score converts through fame — a capped song from a label
      // nobody knows does not walk onto #1 of anything. The ground
      // campaign pierces reach the same way it pierces the wall.
      reachFloor: 0.55,          // an unknown label's song counts at 55%… (v0.10.23: was .62; the audit walked a top-10 debut through it)
      reachMomPer: 0.0015, reachMomCap: 0.15,  // …plus the ground game
      reachSpark: 0.05,          // a defining clip carries the song farther
      breakBelow: 0.45, breakMin: 62, // unknown label + a landing this loud = breakthrough
      breakRep: 7, breakTrust: 3,   // the wall moves: rep jump, board notices
      MOM: {                        // §76 E — earned reach converts through WORK
        receptionPer: 0.12, receptionCap: 12,  // momentum into opening numbers
        capLiftPer: 0.20,           // and into ceiling lift — the ground game pierces
        decay: 2,                   // idle campaign weeks cool off
        diminishAt: 140,            // pushes pay less as the era saturates
        gigByRung: [4, 6, 8],       // a played booking feeds the era
        WORDS: [                    // words, never meters (kernel law)
          [0,  'nobody has heard a thing'],
          [10, 'a murmur in the neighborhood'],
          [25, 'the fansites are stirring'],
          [45, 'people are talking'],
          [70, 'the internet knows the date'],
          [90, 'everywhere at once']],
      },
      PUSHES: {                     // campaign verbs — the run-up, played by hand
        streetTeam:  { label: 'Street team week', cost: 1, mom: 7,  fatigue: 3 },
        fanMeet:     { label: 'Pre-release fan-sign', cost: 2, mom: 6, fatigue: 3, fandom: 1 },
        radioPush:   { label: 'Radio circuit push', cost: 3, mom: 8, fatigue: 2, needsFame: 0.22 },
        contentDrop: { label: 'Content drop', cost: 2, mom: 7, fatigue: 2, social: 400 },
        showcase:    { label: 'Small showcase', cost: 4, mom: 12, fatigue: 5, once: true, liveExp: 2 },
      },
    },
    // the grind (v0.9.37, §76 D) — "a whole pile of bookings from the
    // lowest rung of fame up, all generated as needed." The pile deals
    // more than a group can take; choosing is the game.
    BOOK: {
      boardCap: 6, expireWeeks: 2, leadWeeks: [1, 3],  // offers land 1-3 weeks out
      dealBands: [                 // fame → rungs dealt, offers per week
        { under: 0.18, rungs: [0],    deals: [2, 3] },
        { under: 0.32, rungs: [0, 1], deals: [2, 3] },
        { under: 0.48, rungs: [1, 2], deals: [1, 2] },
        { under: 0.62, rungs: [2],    deals: [0, 1] },
      ],                           // above the last band the pile dries up
      camBase: 0.022,              // the phone-camera lottery, per played gig
      camSpikeMult: 1.2, camHype: 6,
      flyerBoost: 1.35, flyerFatigue: 4,  // papering the neighborhood is work
      TOWNS: ['Suwon', 'Jeonju', 'Changwon', 'Cheongju', 'Pohang', 'Bucheon',
        'Anyang', 'Gimhae', 'Jeju City', 'Chuncheon', 'Mokpo', 'Gumi'],
      // university festival, local radio, the bookstore fan-sign, the radio
      // tour and the festival opener slot left the pile (v0.10.43, §89 D9):
      // the named festivals and the campaign pushes already cover them
      KINDS: {
        schoolShow:  { rung: 0, label: 'school assembly',       fee: [1, 2],  fans: [140, 300],  pop: 0.10, fatigue: 3, liveExp: 1.2, morale: 1,  viralMult: 1.3 },
        wedding:     { rung: 0, label: 'wedding stage',         fee: [2, 3],  fans: [80, 200],   pop: 0.05, fatigue: 3, liveExp: 0.8, morale: -1, viralMult: 1.5 },
        mallOpening: { rung: 0, label: 'mall opening',          fee: [1, 3],  fans: [200, 420],  pop: 0.12, fatigue: 3, liveExp: 1.0, morale: 0,  viralMult: 1.0 },
        sportsDay:   { rung: 0, label: 'halftime stage',        fee: [1, 2],  fans: [160, 380],  pop: 0.10, fatigue: 3, liveExp: 1.0, morale: 0,  viralMult: 1.2 },
        townFair:    { rung: 0, label: 'regional fair',         fee: [1, 2],  fans: [180, 400],  pop: 0.12, fatigue: 4, liveExp: 1.2, morale: 0,  viralMult: 1.0 },
        theaterNight:{ rung: 0, label: 'small-theater night',   fee: [-2, -2], fans: [240, 520], pop: 0.16, fatigue: 4, liveExp: 1.8, morale: 1,  viralMult: 1.2, flyerable: true },
        clubNight:   { rung: 1, label: 'club-circuit night',    fee: [2, 4],  fans: [340, 700],  pop: 0.16, fatigue: 5, liveExp: 2.2, morale: 0,  viralMult: 1.2, flyerable: true },
        busking:     { rung: 1, label: 'busking permit',        fee: [0, 0],  fans: [300, 900],  pop: 0.10, fatigue: 4, liveExp: 1.6, morale: 1,  viralMult: 2.0 },
        cableSpot:   { rung: 1, label: 'cable variety spot',    fee: [2, 4],  fans: [420, 900],  pop: 0.14, fatigue: 4, liveExp: 0.3, morale: 0,  viralMult: 0.9, mediaExp: 2 },
        showcase:    { rung: 2, label: 'showcase hall',         fee: [4, 7],  fans: [700, 1500], pop: 0.35, fatigue: 5, liveExp: 2.5, morale: 2,  viralMult: 1.4 },
        brandStage:  { rung: 2, label: 'brand stage',           fee: [5, 8],  fans: [600, 1200], pop: 0.25, fatigue: 4, liveExp: 1.0, morale: 0,  viralMult: 1.0 },
      },
    },
    // the portfolio (v0.9.26, §69) — "a major company might only debut
    // a new girl group once every 5 to 7 years. essentially one per
    // generation." Established houses greenlight on DOCTRINE; units are
    // the pressure valve between group eras.
    PORTFOLIO: {
      establishedGroups: 2,    // debuted groups at which the doctrine engages
      establishedPop: 62,      // or one group at real stature…
      establishedMinWeeks: 144,// …once the company is 3+ years old — a
                               // startup with one hot debut is still a
                               // startup, and its second group is hunger
      genWindowWeeks: 96,      // a wave's opening window — greenlights live here
      wallLookahead: 60,       // a flagship this close to the 7-yr wall = ending
      deniedCooldown: 48,      // a doctrine no closes the calendar for a year
      rivalLateGenPace: 30,    // extra weeks on rival intervals late in a wave
      UNIT: {
        cost: 55, cooldown: 36, minSize: 2, maxSize: 3,
        revPerReception: 1.2, fandomGain: 2, morale: 5,
      },
    },
    // the star's clock (v0.9.25, owner: "one solo stage shouldn't be
    // enough, forever... a ticking clock until she's on hiatus from the
    // group for her solo career, or leaves her group entirely")
    STAR: {
      reclamorWeeks: 40,         // a settled clamor stays settled ~a year…
      rungMax: 3,                // …then the ladder climbs: stage → album → career
      albumPromiseWeeks: 30,     // the album promise gets a real runway
      albumCost: 90,             // producing her record
      albumCooldown: 60,         // one solo era at a time
      albumRevPerReception: 1.6, // her record sells like her name
      albumFandomSplit: 3,       // the group's room splits its attention
      albumMorale: 8,            // her name on a spine of its own
      rung3Morale: 8,            // holding her at the career rung cuts deep
      launchNewEraWeeks: 30,     // the group's fresh-chapter window after she goes
      returnRunBuildup: 30,      // the comeback she guests on counts down LOUD
      returnRunReception: 4,     // and lands louder
      returnRunMorale: 6,
      dominanceAlbum: 2.0,       // her following vs the room's median: the
      launchMorale: 8,           // the door opened before she had to push
      // the career, in-house (v0.10.25, §87 F): rung 3's answer keeps
      // her in the lineup — the label never volunteers its star away
      dualCadenceMult: 0.5,      // her own calendar: solo cooldowns halve
      // the solo era (v0.10.24, §87): in-group solo releases as a
      // proactive company strategy — the label holds the cards
      soloSingleCost: 35,        // her single, produced inside the group
      soloSinglePrep: 4,         // teaser-to-stage runway for a single
      soloMiniPrep: 6,           // the mini takes the studio longer
      soloSingleCooldown: 24,    // one solo moment per stretch of calendar
      soloSingleRev: 0.9,        // fee per reception point on a single
      soloEraFatigue: 5,         // her weeks run double-booked
      soloSingleMorale: 5,       // a stage of her own
      soloSingleFandomSplit: 1,  // the room barely notices a single's split
      directionHersBonus: 6,     // her direction, when it lands, lands hers
      directionHersVar: 9,       // ...and swings wider than the company's 5
      directionCompanyVar: 5,
      directionHersMorale: 5,    // being heard is the whole point
      directionCoBonus: 4,       // the co-write: her pen, the house polish
      directionCoVar: 6,
      directionCoMorale: 3,
      // the solo project (§87 E): the group-name mini, one single
      // per member — a generational event, not a cadence
      projectCooldown: 96,       // roughly once per two years
      projectMoraleTitle: 6,     // the title pick carries the project
      projectMorale: 3,          // everyone's name on a spine, together
      projectFandomGain: 3,      // fan service of the highest order
      projectSpreadGap: 25,      // cut-score gap that makes the spread a story
    },
    // the spotlight surface (v0.10.29, §89 B): the week's person-moments
    // live on a card, not in the inbox
    PERSONA: {
      spotlightKeep: 12,         // the ring the Desk and the files read
    },
    // the arc (v0.10.27, §88 C) — people change, slowly, on the record.
    // Owner: "I do think people should change, for sure." Drift only at
    // anchored events, always narrated, capped so she stays herself.
    ARC: {
      capPerTrait: 12,           // total movement a trait allows, ever
      debutConfidence: 1,        // debut night changes the shoulders
      firstWinConfidence: 2,     // the first trophy changes the eyes
      stormWarmth: -2,           // a storm hardens the softness…
      stormPro: 1,               // …and professionalizes the guard
      heldDominance: 2,          // held at the career rung, she pushes back
      openedConfidence: 1,       // the door opened before the third ask
      renewalPro: 1,             // years served, signed again
      brokenWarmth: -1,          // every broken promise chips the warmth
    },
    // the friction stream (v0.10.26, §88 A) — the week-to-week choice.
    // Cadence ruled by the owner: one question every 2-3 weeks feels
    // alive; more is a mailbox. Teeth ruled too: every answer deposits,
    // the badly-read ones can genuinely bite.
    FRICTION: {
      fuseWeeks: 2,              // the moment waits, briefly
      breatherAt: 75,            // the door's "a real week" ask, folded in (v0.10.30; 68 made it half of all questions)
      confessResilience: 60,     // the tough one brings the quiet no herself (v0.10.30)
      // the extra hour
      grinderEthic: 70, grinderFatigueLo: 50, grinderFatigueHi: 72,
      drainedEthic: 40, drainedFatigue: 55,
      extraHourPolish: 0.5, extraHourFatigue: 9, extraHourBurnChance: 0.45,
      extraHourRefuseMorale: 4, lightenRest: 8, lightenMorale: 4,
      lightenSpread: 2, holdMorale: 3,
      // the clip call
      clipMinSocial: 15, clipProAt: 55, clipLuckChance: 0.55,
      clipKillFandom: 1, clipKillMorale: 3, clipRideFandom: 2,
      clipRideMorale: 4, clipBurnMorale: 5, clipBurnTrust: 2,
      // the substitution
      subWornAt: 68, subConfidence: 62, subFreshBelow: 45,
      subRelief: 10, subLoad: 6, subVolunteerReps: 2, subVolunteerMorale: 3,
      subPrideAt: 60, subPrideMorale: 5, subGratefulMorale: 2,
      // variety, alone
      varietyPersonGap: 20, varietySendMorale: 5, varietyMediaExp: 3,
      varietyEnvyAt: 65, varietyEnvyMorale: 3, varietyDeclineWanted: 5,
      // the quiet no
      quietDominance: 42, quietMorale: 45, quietFatigue: 55,
      quietAskMorale: 4, quietRestAt: 65, quietRest: 8,
      quietProAt: 60, quietPressFatigue: 5, quietBurnMorale: 8,
      quietCrashBelow: 30, quietCrashChance: 0.5,
      // the steadying (§88 B): the warm veteran holds the room up
      steadyWarmth: 68, steadyBelow: 35, steadyLift: 1, steadyNoteChance: 0.08,
    },
    RISEFALL: {
      rankWeek: 2,               // woy the trades publish the power ranking
      imperialAt: 74,            // prestige at or above = the imperial era
      risingDelta: 6,            // ~half-year prestige climb that reads as rising
      risingFloor: 45,           // nobody calls a basement climb a rise
      fadingBelow: 32,           // low water = fading…
      fadingDelta: -5,           // …and so does a real slide from anywhere
      trailEvery: 12,            // prestige sampled this often for the trend
      imperialPunch: 3,          // the imperial house's releases come backed
      fadingDrag: 3,             // a fading house's releases come thin
      freeAgentWindow: 16,       // weeks the signing class stays on the market
      freeAgentMax: 5,           // named files a collapse mints at most
      freeAgentAgeMax: 29,       // the market wants runway
      faCostBase: 45,            // signing a name with a career…
      faCostPerFame: 35,         // …priced by the career (renewal fame bands)
      offerPrestige: 78,         // the imperial house that comes for YOU
      offerTrust: 55,            // they only call proven operators
      offerCooldownWeeks: 96,    // once per ~two years at most
      leverageBudget: 120,       // what the board finds when you show the letter
      leverageTrust: 3,          // and what staying is suddenly worth
      GEN: {
        start: 3,                // the scene arrives mid-conversation
        minYears: 4,             // a generation lasts at least this long —
                                 // real waves run ~4-6 years; the seed
                                 // backdates `since` 2y so the first turn
                                 // still lands on a playable horizon
        landmarkReception: 78,   // a debut the trades call a landmark
        landmarksToTurn: 3,      // this many inside a year turns the wave
        rookieWeeks: 96,         // debuted within = the new blood
        oldGuardPop: 60,         // the flagship the torch is taken from
        talkChance: 0.03,        // ambient gen-vs-gen feed chatter, weekly
      },
      SERVICE: {                 // rival boy acts carry the window too
        staggerPop: 55,          // a warm act rotates; a cool one pauses whole
        staggerDrag: 5,          // reception malus while the line is short
        rotationTail: 36,        // stagger runs serviceWeeks + this
        pauseCool: 0.35,         // weekly popularity cool during a full pause
        returnBump: 8,           // the return release punches
      },
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
      // the two verdicts (v0.10.34): the critics' circle gives its own
      // prize — Record of the Year is judged on craft, Song on the public
      categories: ['rookie', 'song', 'record', 'artist'],
      LABELS: { rookie: 'Rookie of the Year', song: 'Song of the Year', record: 'Record of the Year (critics’ circle)',
        artist: 'Artist of the Year', daesang: 'DAESANG — Grand Prize of the Year' },
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
      // the floors and caps (shiftReceptionMin / acclaimReceptionCap /
      // flopReceptionCap / workedLift) moved to VERDICT.FUSION_MOVES
      // (v0.10.34): every outcome is a move on craft AND appeal
      acclaimFandomGain: 6,      // the devoted love being right early
      acclaimTrust: 2,
      shiftPop: 8, shiftFandomGain: 8,
      flopMorale: 3,
    },

    // ---- The last statement (v0.11.0, §86) -----------------------------
    // Owner: "insolvency should mean game over, at least for that
    // company... your reputation should at least provide the possibility
    // of getting another job." A red week is a week the label is BEHIND
    // on what it owes: the month-end invoice and the fund's toll are not
    // forgiven any more — the shortfall is arrears, and what comes in
    // pays the arrears first. Twelve red weeks to dissolution at every
    // door; a clean week cools the counter by one. Measure-first (ruling
    // E1): the soak guards that standard play never dissolves; the clock
    // moves only with a history comment.
    RED: {
      weeksToDissolve: 12,     // the clock, at every door — the FINAL NOTICE carries the date
      decayPerCleanWeek: 1,    // decay, not reset: lurching in and out of default is still dying
      memoAt: 1,               // the accountant's memo
      meetingAt: 4,            // the staff meeting nobody called: the ledger takes 'unpaid', morale erodes weekly
      creditorsAt: 8,          // the creditors' letters: 'unpaid' again, the chairs take the calls
      finalNoticeAt: 10,       // the date on it
      moralePerWeek: 1,        // from the staff meeting on — the fog eats a drowning company first
      poachMult: 3,            // from the creditors' letters on: the poach roll triples, the tier gate drops
      sceneFuseWeeks: 1,       // the last statement waits one week to be read, then reads itself
      // the second chances (§86 C): what the career earned, gated on
      // things the save already tracks — observables, the financing law
      DOORS: {
        // budget 70/5 trainees → 110/4 at first smoke: a neglected salaried
        // label was red by week 16 and gone by 28 — a death trap, not a
        // situation. At 110/4 the month runs −16 and the act's comeback is
        // open from the first morning: ~7 months to the first red week
        salaried: { budget: 110, trust: 50, signings: 3, trainees: 4, board: 8, rep: 32,
          chartedAt: 10, trophiesAt: 3,   // a debuted act that charted, or hardware
          groupPop: 30, groupAge: 120 },  // their aging act: a release this old
        investor: { chest: 180, trust: 55, signings: 6, board: 10, rep: 30 },
        protege:  { chest: 150, trust: 58, signings: 6, board: 10, rep: 32,
          bondAt: 6, popAt: 30, loaned: 2 },   // her undecayed kindnesses; her act's pull; the bench that walks in with you
        blank:    { chest: 120, trust: 50, signings: 6, board: 4, rep: 25 },
      },
      // the shelf (§86 B): a dead label's songs keep existing — and charting;
      // and sold alive (§86 A), the catalog's upside is one of the honest moves
      SHELF: { runChance: 0.004,     // weekly, per folded label: a reverse run nobody here gets paid for
        salePct: 0.4, saleMinReception: 40 },   // the distributor pays this share of each record's revival windfall, once
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
      lightstickPopAt: 45,       // the launch: a fandom this warm sells one
      lightstickCost: 35,
      lightstickRevenue: 60,     // it sells out — that is what lightsticks do
      lightstickFandomGain: 6,
      // the lightstick sells to the fandom that exists: revenue = min(lightstickRevenue, fanbaseRead × this).
      // Measured on the 8-seed bot soak: the launch-week fandom (the bot launches the week the market
      // clears it) reads 5–10k buyers, a flagship 20–50k, a mid-tier act 13–17k. At 0.003 the break-even
      // sits near 11.7k — a rookie-size launch loses 15–20 and leaves boxes in the hallway, a flagship
      // still clears the full 60 (v0.11.5, §96 wiring — measure-first)
      lightstickPerFan: 0.003,
      cafeNoticeIntensity: 1,    // a notice that answers a fresh grievance warms the cafés (v0.11.5, §96 wiring — measure-first)
      cafeNoticeEmptyIntensity: 1, // a notice with nothing in it cools them — the cafés noticed (v0.11.5, §96 wiring — measure-first)
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
    },
    // ---- The tracklist (v0.7.5) — the record is more than its title ----
    TRACKS: {
      openSlots: { single: 0, mini: 1, full: 2 },   // credit slots the player assigns
      minMembersForUnits: 3,     // a duo's "unit" is just the group
      unitSize: [2, 3],          // members per unit track
      soloSocialSpike: 2600,     // her name on her own track travels
      soloHype: 6,
      soloMorale: 5,
      unitMorale: 3,             // both/all unit members feel seen
      unitCloseBonus: 4,         // a close pair's unit cuts DEEPER (morale, both)
      sleeperChance: 0.22,       // one b-side may quietly outgrow the record — the base, at the heat bar
      sleeperPop: 2,             // the truthers move the number a little
      sleeperReceptionMin: 55,   // nobody digs into a record nobody played
      // the b-side and the reverse run (v0.11.1, §92 A): every b-side gets
      // a PUBLIC heat at landing — the streams the fans can see — from the
      // hidden hook, the record's craft, the credit and the pen; the best
      // is the fan pick, and the sleeper reads her heat instead of a coin
      heatFromHook: 0.62, heatFromCraft: 0.28,
      heatCredit: { solo: 6, unit: 4 }, heatPen: 3, heatWobble: 6,
      sleeperHeatAt: 62,         // the truthers organize around a song: at this heat the base chance
      sleeperChanceSpan: 0.02,   // per heat point above (below) the bar
      sleeperChanceFloor: 0.06, sleeperChanceCap: 0.60,
      // §92 B: a fan pick this hot charts beside the title the week the record lands
      // heatAt 66→72 at the first soak: 34/40 orgs double-charted — a story
      // every other record tells is wallpaper; the bar sits where a mini's
      // best b-side clears it maybe once a career
      DOUBLE: { heatAt: 72, scoreMult: 0.6 },
      // §92 C: the late climb — an uncharted fan pick with real heat enters
      // on a small weekly hash during promotion (a world fact, not a draw)
      LATE: { heatAt: 62, chance: 0.05, scoreMult: 0.7 },   // heatAt 58→62 at the first soak (20/40 climbed): the climb is the rarer story
      HEAT_WORDS: [[70, 'burning'], [58, 'warm'], [45, 'quiet'], [0, 'skipped']],
    },
    // ---- The stage door (v0.8.0) — scenes, claims, directed acts --------
    SCENES: {
      maxResolvedClaims: 10,     // settled promises kept for the record
    },
    // ---- the ledger between you (v0.10.30, §89 D3) -----------------------
    // ONE table for what the player did to a person: the standing
    // weight (decayed, the warmth), the grudge weight (undecayed, the
    // wound), and the words her file uses. Four readers used to carry
    // four tables; standingScore, renewalRead, the walkout and the
    // fansite turn now read KP.ledgerRead. Unknown kinds throw.
    LEDGER: {
      cap: 40,                   // per-person ledger of what YOU did
      halfLifeWeeks: 48,         // kindnesses fade, wounds heal — slowly
      renewalGrudgeMult: 1.5,    // the renewal table weighs the wounds
      KINDS: {
        // kept word: promises
        promiseKept:      { w: 3,  words: 'a promise kept, on the record' },
        promiseBroken:    { w: -4, grudge: 2, words: 'a promise broken — she remembers the date' },
        ambitionPromised: { w: 2,  words: 'promised the thing she wanted, with a date' },
        honestAnswer:     { w: 1,  words: 'given the honest answer, and no promise' },
        deflected:        { w: -2, grudge: 1, words: 'told "we’ll see" about the thing she wanted' },
        // being heard
        heardHer:         { w: 2,  words: 'you asked, and listened' },
        heardOut:         { w: 2,  words: 'heard out, the whole list' },
        listened:         { w: 2,  words: 'told you she was struggling; the load got lighter' },
        breatherGranted:  { w: 2,  words: 'asked for a real week off, and got it' },
        breatherDeclined: { w: -1, grudge: 1, words: 'asked for a week off; told "after the next stage"' },
        mediated:         { w: 2,  words: 'a sit-down the company arranged' },
        mentored:         { w: 2,  words: 'given a mentor when she was struggling' },        // the pair (v0.10.40)
        trustedToMentor:  { w: 2,  words: 'trusted to bring the rookie along' },
        keptApart:        { w: -1, words: 'seated apart from the one she cannot stand' },
        framedRival:      { w: 1,  words: 'the rivalry framed as competition, out loud' },
        trusted:          { w: 2,  words: 'you trusted her with the room' },
        seen:             { w: 1,  words: 'her offer was seen and taken' },
        openedTheDoor:    { w: 2,  words: 'you opened a door before she had to push it' },
        toldStraight:     { w: 1,  words: 'told straight, no spin' },
        protected:        { w: 2,  words: 'the company blinked first — shielded' },
        protectedHealth:  { w: 1,  words: 'her health put before the schedule' },
        stoodByHer:       { w: 2,  words: 'the company stood by her in public' },
        welcomedBack:     { w: 2,  words: 'welcomed back after the hardest stretch' },
        wonBack:          { w: 3,  words: 'won back at the table' },
        endingHonored:    { w: 2,  words: 'the ending she asked for, honored' },
        saidItHerself:    { w: 2,  words: 'told the fans herself, in her own words' },   // the long goodbye (v0.11.10, §101)
        gaveTheSpeech:    { w: 2,  words: 'the speech was hers to give' },
        stingCoached:     { w: 1,  words: 'the coach sent over when a loss sat badly' },
        stingRespected:   { w: 1,  words: 'let a loss fuel her, on purpose' },
        carrySeen:        { w: 2,  words: 'carried the group; it went in her file' },
        unitCredit:       { w: 1,  words: 'a unit credit, hers' },
        soloCredit:       { w: 3,  words: 'the solo credit, on a record' },
        realTerms:        { w: 2,  words: 'offered real terms at renewal' },
        sweetened:        { w: 2,  words: 'the renewal sweetened before she asked' },
        standardTerms:    { w: -1, words: 'given the standard paper, nothing more' },
        leanSettlement:   { w: -1, grudge: 1, words: 'a lean settlement, hers to notice' },
        neverPaid:        { w: -1, grudge: 1, words: 'a settlement that never came' },
        unpaid:           { w: -2, grudge: 1, words: 'a month the company could not pay' },   // the red weeks (v0.11.0, §86)
        // being held, pressed, managed
        heldBack:         { w: -2, grudge: 1, words: 'held back when she wanted forward' },
        heldLine:         { w: -1, words: 'the company held the line over her ask' },
        overruled:        { w: -1, words: 'challenged the direction; overruled' },
        heldToPaper:      { w: -3, grudge: 2, words: 'held to the contract at the career ask' },
        pressed:          { w: -2, grudge: 1, words: 'pressed through a no' },
        pushedThrough:    { w: -2, grudge: 1, words: 'told the comeback needed her, when she said she was not okay' },
        muzzled:          { w: -1, words: 'her words were managed' },
        reprimanded:      { w: -1, words: 'reprimanded, on the record' },
        keptOffline:      { w: -1, words: 'kept off the screen' },
        madeHerHide:      { w: -2, grudge: 2, words: 'made to deny who she is' },
        benchedPride:     { w: -2, grudge: 1, words: 'helped in a way that cost her pride' },
        linesCut:         { w: -1, words: 'watched her lines get cut' },
        songPassed:       { w: -1, words: 'her song passed over' },
        passedOver:       { w: -2, grudge: 1, words: 'first on the board, not on the list' },
        cutFromLineup:    { w: -3, grudge: 2, words: 'cut from the lineup' },
        disbandedUs:      { w: -2, grudge: 2, words: 'the group disbanded under her' },
        lastNight:        { w: 1,  words: 'given one last night on a stage before the end' },   // the last bow (v0.11.11, §102)
        lastRecord:       { w: 2,  words: 'given a last era, announced and finished, before the end' },
        watchedTermination: { w: -2, grudge: 1, words: 'watched a member get terminated' },
        friendDeparted:   { w: -1, words: 'her friend left the company' },
        friendReleased:   { w: -3, grudge: 1, words: 'her friend was released' },
        leftWaiting:      { w: -2, grudge: 1, words: 'left waiting for an answer' },
        tableLeftWaiting: { w: -3, grudge: 1, words: 'the renewal folder left unopened' },
      },
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
      // the solo door at the cold table (v0.11.5, §96 wiring): a star who
      // is leaving anyway can be kept in the building as a solo act — out
      // of the lineup, her own name on the marquee. graduateToSolo had no
      // caller since v0.9.25 and the return-run scene behind it was
      // unreachable. Offered only when she reads 'first among equals' or
      // above, or sits at rung 2+; the bot never takes it (measure-first)
      graduateCost: 40,          // the solo signing bonus, gated on the account
      graduateRungMin: 2,        // KP.starRung at or above this opens the door
      graduateMorale: 4,         // hers: the door she did not have to push
      graduateRoomMorale: 2,     // the room's: losing the star to the marquee (subtracted)
      departPopHitWarm: 4,       // a warm goodbye still costs the room
      departPopHitCold: 9,       // a cold one costs more
      departMoraleWarm: 4,
      departMoraleCold: 7,
      friendGrief: 3,            // close friends take departures hardest
    },
    // ---- The building (v0.8.4) — staff, taste, board season -------------
    BUILDING: {
      // the manager's poach moved to HIRES.MANAGER (v0.10.43, §89 D8)
      boardWeek: 46,             // the year answers for itself
      petAfterWeek: 60,          // the pet project waits for a real company
      petChance: 0.06,           // weekly, once eligible — once per career
      boardArtistsMorale: 1,     // board season's third answer: the room heard it — every idol (v0.11.5, §96 wiring — measure-first)
      boardArtistsTrust: -1,     // …and the board wanted a slide (v0.11.5, §96 wiring — measure-first)
    },
    // ---- The office door (v0.8.2) — idols initiate ----------------------
    // ---- the season (v0.10.32, §90 Phase B) --------------------------------
    // One competition show a year, CAST FROM THE WORLD: rival floors send
    // their most promising, academies send a known student or two, the
    // open board's unsigned enter on their own, and the player gets one
    // invitation (up to two trainees — owner's ruling). Weekly
    // eliminations on hash (the show is television, not the stream);
    // the finale forms a project group under the broadcaster's house —
    // fixed-term or permanent by a roll (owner: "Random roll").
    COMPETITION: {
      castWoy: 22,              // the casting call goes out
      finaleWoy: 34,            // the finale airs (the old calendar law)
      lineupSize: 5,            // the finale lineup
      runnersUp: 3,             // the field at the finale beyond the lineup
      rivalSlots: 2,            // trainees a rival floor sends
      schoolSlots: 4,           // academy students across the map
      boardSlots: 4,            // unsigned files off the open board
      playerSlots: 2,           // owner: "Yes, you can send trainees to a season"
      minAge: 15, maxAge: 23,
      boyShowShare: 0.35,       // seasons are one gender; most are girl-group seasons
      noise: 14,                // televised judging swings this much per week
      weeklyFatigue: 3, weeklyLive: 1, weeklyMedia: 1,
      weeklyFollowers: [4000, 12000],
      elimHype: [8, 20], finalistHype: [20, 35], lineupHype: [30, 50],
      elimFollowers: [20000, 60000], finalistFollowers: [60000, 140000], lineupFollowers: [120000, 260000],
      elimMorale: -4, lineupMorale: 8,
      termWeeks: 60,            // a fixed-term project group's run
      permanentChance: 0.4,     // …or the broadcaster's label keeps the lineup, forever
      housePrestige: 55,
      returnPolish: 3,          // what a year on real stages taught her
      NAMES: ['STARFORGE', 'THE FINAL LINEUP', 'DEBUT OR NOTHING',
        'CLASS OF NEXT YEAR', 'ELEVEN LIGHTS'],
      // the season, televised (v0.11.4, §95): the event's numbers
      MISSIONS: ['the signal song', 'the position evaluation', 'the first ranking reveal', 'the team battle',
        'the concept evaluation', 'the cover mission', 'the second ranking reveal', 'the unit stage',
        'the fan-vote mission', 'the final-mission rehearsal', 'the final mission', 'the finale'],
      pushCost: 8, pushScores: [6, 4, 2], pushCalledChance: 0.25, pushCalledHype: -6,   // the vote push: three a season, thinner each time; the edit may call it company money
      coachCost: 3, coachScore: 4, coachAwayMult: 0.7,                                 // the chair flies out; the room at home trains thinner that week
      editWeekMin: 3, editWeekMax: 5, editChance: 0.5, editWeeks: 3,                    // the producers cut her an edit once a season
      villainPenalty: 5, underdogBonus: 4, editStatementCost: 4, editStatementHype: -3,
      nervesMorale: 2, nervesWithin: 2, topMorale: 2, topAt: 3,                         // her arc on the line and at the top
      withdrawMorale: -8, withdrawHypeMult: 0.5,
      fanPickFlip: 0.3, pickFollowers: [6000, 15000],                                 // the public's pick, paid in followers
      finalistInterest: 2,                                                            // the scouts have an eliminated finalist's number
    },
    // ---- the floor (v0.10.31, §90 Phase A) ---------------------------------
    // One world of people: rival trainee floors are people, a cut is a
    // person, a released trainee re-enters the world, and the world
    // forgets only at its exits — never a person with a chapter.
    FLOOR: {
      reentryMin: 8, reentryMax: 16,   // weeks a released trainee is away before the open board sees her
      marketWaitWeeks: 10,             // then, with no seat on the board: another pen, or home — the market does not hold files forever
      floorAgeOut: 25,                 // a trainee this old leaves a rival floor at the next evaluation (the industry's clock)
      castTenureWeeks: 8,              // nobody debuts the week she signs — a lineup is cast from people with time on the floor
      chapterCap: 40,                  // the file's chapters strip (v0.10.33) — where she has been, bounded
      marketChannels: ['castoff', 'released', 'freeAgent'],   // the one market's lanes on the open board (§89 D7)
      intakeFromBoardChance: 0.5,      // a rival's intake signs off the public board when a file is there
      castoffSignsElsewhere: 0.55,     // past the window: another company's pen (else home)
      staleSignsElsewhere: 0.4,        // aged off the board: signed elsewhere (else back to school)
      migrateTenure: [4, 160],         // back-dated signing weeks when a counter becomes people
      signAge: [15, 18],               // the age a trainee signs at a rival's door
      resignDiscount: 0.8,             // she wanted to come back (warm standing)
      resignPremium: 1.25,             // she came back on her terms (a grudge, under her bar)
      grudgeBarBase: 2,                // her bar: base + warmth/pro forgiveness − dominance/competitiveness
    },
    // ---- the one door (v0.10.30, §89 D1) ----------------------------------
    // Every "she comes to you" scene — the ask, the challenge, the five
    // frictions, the moment call, the walkout, the solo knock, the quiet
    // era, the recovery — is a CANDIDATE on one queue. One weekly pick,
    // one cadence, one open at a time. Owner: one question every 2–3
    // weeks. Priority candidates (walkout, knock, slump, recovery) skip
    // the roll; the rest compete by weight, then a per-week hash.
    KNOCK: {
      gapWeeks: 1,               // min quiet gap after a question
      chance: 0.6,               // then this per week → ~2-3 week cadence
      personGapWeeks: 6,         // she does not knock twice a month
      expireWeeks: 2,            // the default fuse
    },
    DOOR: {
      expireWeeks: 3,            // how long she waits for an answer
      askAfterWeeks: 30,         // ambition unmet this long past debut → she asks
      askPromiseWeeks: 48,       // "within the year" — the claim window
      promiseMorale: 6,          // a plan means everything
      deflectMorale: -3,
      expireMorale: -2,          // waiting and hearing nothing
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
    },

    // ---- Executives & trust ---------------------------------------------
    EXEC: {
      startTrust: 55,
      trustFloor: 0, trustCap: 100,
      debutTrustDelta: { sensation: 22, strong: 14, solid: 6, quiet: -8, miss: -18 },
      missedDeadlinePenalty: -30,
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
      // the practice-room invoice (v0.10.11): a trainee is a real
      // monthly cost, not a rounding error the stipend swallows —
      // owner: "I'm not seeing any debit from accounts as I advance"
      weeklyTrainingCostPerTrainee: 0.75,
      monthlyStipend: 12,
      // the retainer (0.9.13, simplified v0.9.14): a flat per-idol monthly
      // cost — fame-scaling moved to the PRODUCTION bill (statureCostPer),
      // where it is self-balancing against the income it shadows
      idolPayrollPerMember: 1,
    },

    // ---- Rival agencies -------------------------------------------------
    RIVALS: {
      count: 3,   // v0.4.0: Whitecliff finally activates — the world is full

      weeklyInterestShift: 0.26,  // chance a rival escalates interest (v0.4.3: hungrier)
    },

    // ---- Inbox / events -------------------------------------------------
    EVENTS: {
      maxInboxPerWeek: 5,        // the inbox law (v0.10.29): five a week, all events — only critical bypasses
      viralChance: 0.02,          // ultra-rare pre-debut viral moment
    },

    // ---- Save -----------------------------------------------------------
    SAVE_KEY: 'kpam_save',
    SAVE_SLOTS: 3,
  };
})(typeof window !== 'undefined' ? window : globalThis);
