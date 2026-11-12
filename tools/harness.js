/* The soak harness: runs the whole game headless across many seeds using
   the SAME engine code paths the UI calls (advanceWeek, signProspect,
   proposeGroup, planDebut). The auto-player acts only on perceived reads —
   the same fog the human sees.

   On top sits the observatory: census bands that alarm when an archetype
   of outcome goes EXTINCT or FLOODS, plus hard invariant guards that kill
   the run. Usage: node tools/harness.js [seeds=40] */
'use strict';
const { loadEngine } = require('../test/load_engine');

const SEEDS = parseInt(process.argv[2] || '40', 10);
const KP = loadEngine();
// the Desk, counted (v0.11.21, §112): what each week wrote and what landed
const deskCount = require('./desk_count');
const DESK = deskCount.watch(KP);

// alive-and-plausible bands, as fraction of seeds
const BANDS = {
  // sensation floor .02 → 0 (v0.10.36): a ~4% event cannot carry a 2% floor
  // on 40 orgs — measured 2/40 (v0.10.34), 2/40 (v0.10.35), then 0/40 with
  // 5/120 and max 94 on the same build (P(0 of 40) ≈ 18%); a paired run on
  // the same 40 seeds moved the first debut −0.7 on average (noise). The
  // 120-org run at release is the tail's guard; the ceiling still catches floods.
  sensation:         { lo: 0.00, hi: 0.30, label: 'sensation debuts' },
  strongPlus:        { lo: 0.15, hi: 0.75, label: 'strong-or-better debuts' },
  missOrQuiet:       { lo: 0.05, hi: 0.55, label: 'quiet/miss debuts' },
  // the season (v0.10.32): an ex-contestant debuts with a public already
  // there and the breakout is hers, center or not — measured 28/40; hi .65→.80
  nonCenterBreakout: { lo: 0.10, hi: 0.80, label: 'public picked a non-center breakout' },
  rivalSteals:       { lo: 0.30, hi: 1.00, label: 'rivals signed >=1 prospect' },
  burnouts:          { lo: 0.00, hi: 0.45, label: 'orgs with a burnout incident' },
  instinctSigning:   { lo: 0.30, hi: 1.00, label: 'scout instinct notes seen' },   // ruled v0.11.3 from the measured count
  frictionSeen:      { lo: 0.20, hi: 1.00, label: 'orgs that saw real friction' },
  // ceiling 0.25→0.30 (0.9.24.1): the virality retune shifted every rng
  // stream; measured 11/40 (27.5%) and 20/80 (exactly 25%) after — the
  // band was sitting on its own edge, not moving. Third flap: look at
  // mediation drift, not the ceiling.
  conflictEndemic:   { lo: 0.00, hi: 0.30, label: 'orgs ending conflict-heavy (>30% pairs)' },
  multiRelease:      { lo: 0.70, hi: 1.00, label: 'orgs with >=2 releases (the loop loops)' },
  chartTopTen:       { lo: 0.20, hi: 1.00, label: 'orgs whose first group hit #1 on the scene chart' },
  popAlive:          { lo: 0.50, hi: 1.00, label: 'orgs ending with a warm-or-better fanbase' },
  secondGroup:       { lo: 0.30, hi: 1.00, label: 'orgs that launched a second group' },
  // ceiling 0.85→0.95 by ruling (v0.9.14), flooded again at 40/40 when
  // the network's verbs (calls, street runs) joined the designed costs
  // (v0.9.35). Second flap — per this band's own note the real alarm is
  // the escalation band below, so the ceiling flips to a FLOOR guard:
  // a career where the CEO never once reads the books means the fiscal
  // read itself died.
  fiscalNoticed:     { lo: 0.30, hi: 1.00, label: 'orgs whose books got noticed (mature economies stay solvent)' },
  hypeSeen:          { lo: 0.30, hi: 1.00, label: 'orgs where the internet found someone' },
  directiveFired:    { lo: 0.02, hi: 0.80, label: 'orgs that drew a hype directive' },
  // ceiling raised 0.60→0.75 in v0.8.4: the executive pet project now
  // DEMANDS a solo debut in most careers (39/40 assigned) — more solos
  // is the designed consequence, not drift
  // ceiling 0.75→0.90 (v0.9.27, measured 80%), grazed again at 37/40
  // (0.9.35.2 stream shift). Second flap — and this band's own note
  // already says soloists are the §69 STANDARD shape and the bot always
  // launches where a human may hold. The ceiling retires per precedent;
  // the floor (extinction) was always the real alarm here.
  soloDebuts:        { lo: 0.02, hi: 1.00, label: 'orgs that debuted a solo act' },
  // ceiling 0.35→0.45 by ruling (v0.9.14): with the sink live, roughly
  // a third-to-two-fifths of bot orgs eat a trust-level warning across
  // 140 weeks — 'success stops being free' is the owner's brief. Past
  // 45% the sink is punishing, not pricing; that stays the alarm.
  // ceiling 0.45→0.65 by ruling (v0.9.17): measured 14-25/40 across ten
  // soaks in three releases — the operating point of the price-of-fame
  // economy is ~50% ± 8, and a ceiling INSIDE the band's own noise
  // flapped on every stream reshuffle (the probes found real fixes
  // twice, then found noise). Per the v0.9.14 owner brief, the CEO
  // reading the books most careers IS the feature; the alarm now lives
  // at the tail, where a genuine poverty-spiral regression would push.
  // ceiling 0.65→0.75 by ruling (v0.9.18): measured 27/40 and 52/80
  // (65%) — the operating point drifted up with the DESIGNED spending
  // of slots 3-5 (weekly scouting trips, school partnerships, cinema
  // MVs, repackages). The poverty tail stayed healthy (80-seed min
  // end-budget 2147, none below 300), so the drift is pricing, not
  // spiraling. The alarm keeps living past the operating point.
  // ceiling 0.75→0.85 by ruling (0.9.18.1): 31/40 and 63/80 (~79%) —
  // the rival rework's faster comeback cycles mean more contested
  // weeks and thinner blind-bot margins; the tail stayed healthy
  // (80-seed min end-budget 2065, none below 300). THIRD chase of this
  // ceiling: if it flaps again, stop chasing and re-point the band at
  // the poverty tail itself (orgs ending under ~300), which is the
  // regression this alarm actually exists to catch.
  // RE-POINTED (v0.9.30, the §18 rule executed on the third chase): the
  // warned-count ceiling was chased 0.65→0.75→0.85 and hit 35/40 again —
  // warnings are weather for a lean bot. The alarm this band exists for
  // is the POVERTY SPIRAL, so it now measures the tail directly: orgs
  // ENDING the career under 300 (observatory median end-budget ~4200).
  fiscalWarned:      { lo: 0.00, hi: 0.10, label: 'orgs that ended the career broke (end budget < 300)' },
  idolsRested:       { lo: 0.50, hi: 1.00, label: 'orgs whose idol weeks average off the fumes (<70, rolling)' },
  overworkSeen:      { lo: 0.05, hi: 1.00, label: 'orgs where medical staff benched somebody' },
  rivalActDebut:     { lo: 0.80, hi: 1.00, label: 'worlds where a rival debuted a new act' },
  boardLosses:       { lo: 0.50, hi: 1.00, label: 'orgs that lost 3+ board prospects to rivals' },
  stolenOnStage:     { lo: 0.30, hi: 1.00, label: 'worlds where a lost prospect debuted for a rival' },
  memoryAlive:       { lo: 0.60, hi: 1.00, label: 'worlds holding living narratives (>=2)' },
  discourseSeen:     { lo: 0.50, hi: 1.00, label: 'worlds where a storm trended' },
  discourseHandled:  { lo: 0.10, hi: 1.00, label: 'orgs that steered a storm successfully' },
  discourseBoiled:   { lo: 0.00, hi: 0.80, label: 'orgs that let a storm boil over' },
  idolNarrative:     { lo: 0.05, hi: 1.00, label: 'worlds where an idol earned a personal narrative' },
  nationalAlive:     { lo: 0.80, hi: 1.00, label: 'worlds with a living national chart (>=12 entries)' },
  natTopTwenty:      { lo: 0.30, hi: 1.00, label: 'orgs that cracked the national top 20' },
  natTopTen:         { lo: 0.10, hi: 1.00, label: 'orgs that reached the national top 10' },
  // ceiling 0.40→0.50 by ruling (0.9.20.1): measured 34/80 (42.5%) —
  // the mandate era's bots ALWAYS field a second act and every
  // announced era banks the countdown edge, so more careers touch
  // the summit once. Designed strength, not chart rot; the alarm
  // now guards a summit that becomes a doormat.
  // RE-RULED (v0.9.30, the fourth sample): 34/80 → 41/80 → 26/40 across
  // three stream shifts. The rarity CLAIM is retired honestly — the
  // accumulated star-power arc (hype concentration, solo albums, return
  // runs, units) makes the summit a normal career milestone for a
  // competent full-arc bot. The band now guards RUNAWAY, not rarity;
  // if it crosses 0.75, tune the national board's decay.
  natNumberOne:      { lo: 0.00, hi: 0.75, label: 'orgs that topped the national chart (guarding runaway, not rarity)' },
  chartAlive:        { lo: 0.40, hi: 1.00, label: 'worlds ending with a living chart (>=3 entries)' },
  lifecycleSeen:     { lo: 0.35, hi: 1.00, label: 'worlds where a company rose/fell/merged/split' },
  feedAlive:         { lo: 0.85, hi: 1.00, label: 'worlds with a full fan feed (>=25 posts)' },
  playerTopThree:    { lo: 0.25, hi: 1.00, label: 'orgs that reached the chart top three' },
  crowdedRelease:    { lo: 0.10, hi: 1.00, label: 'orgs that released into a crowded week' },
  warAnnounced:      { lo: 0.80, hi: 1.00, label: 'worlds where comebacks were announced ahead (the calendar lives)' },
  warAmbushed:       { lo: 0.05, hi: 1.00, label: 'orgs whose announced date drew an ambush (avg/career in header)' },
  warBattled:        { lo: 0.10, hi: 1.00, label: 'orgs that fought a head-to-head release week' },
  warWon:            { lo: 0.05, hi: 1.00, label: 'orgs that took at least one shared week' },
  warRivalry:        { lo: 0.00, hi: 0.85, label: 'worlds where a rivalry became canon' },
  showFirstWin:      { lo: 0.20, hi: 1.00, label: 'orgs that won their first music-show trophy' },
  showRivalWins:     { lo: 0.80, hi: 1.00, label: 'worlds where rival acts took stages' },
  // ceiling lifted to 1.00 by ruling (v0.9.10): careers now open with a
  // six-year act holding two trophies per stage. darlingAt is 7, so the
  // dynasty still takes FIVE wins earned on the player's watch — but an
  // established act kept winning for three seasons gets there in nearly
  // every world, and that is the designed shape of "still selling", not
  // wallpaper. The floor is the alarm now: no darlings = broken stages.
  showDarling:       { lo: 0.30, hi: 1.00, label: 'worlds where a stage became somebody\'s (darling narrative)' },
  regionLoud:        { lo: 0.20, hi: 1.00, label: 'orgs that got loud in at least one overseas region' },
  // floor 10%→2% by ruling (v0.9.1): the stronghold threshold (75) sits
  // in the tail of the 140-week best-region distribution (median ~71,
  // identical before/after the aging stream re-roll — checked both).
  // A true second home is designed rare in a 140-week career; the
  // mechanism itself is suite-proven (suite_032).
  regionStory:       { lo: 0.02, hi: 1.00, label: 'orgs whose overseas market became a story (the long game pays)' },
  conceptCanon:      { lo: 0.10, hi: 1.00, label: 'orgs whose group earned a concept identity (the sound IS the group)' },
  toured:            { lo: 0.20, hi: 1.00, label: 'orgs that took a tour on the road' },
  tourSoldOut:       { lo: 0.05, hi: 1.00, label: 'orgs that sold a leg out in minutes' },
  tourSoft:          { lo: 0.00, hi: 0.80, label: 'orgs that played to curtained-off sections' },
  // ceiling lifted 0.90→1.00 by ruling (v0.9.11): the second job grows
  // followings past gaffeMinSocial and stacks fatigue past the tired-
  // posting bonus — tired famous people posting carelessly at 2am IS the
  // designed fiction. At-least-one-trended-gaffe per 140-week career is
  // realism, not wallpaper. If the owner reports storm fatigue in human
  // play, tune gaffeChance down before touching the second job.
  gaffeSeen:         { lo: 0.02, hi: 1.00, label: 'worlds where a posting incident trended' },
  fandomNamed:       { lo: 0.30, hi: 1.00, label: 'orgs whose fandom got its name' },
  dealSigned:        { lo: 0.10, hi: 1.00, label: 'orgs that signed a brand deal' },
  gigBooked:         { lo: 0.30, hi: 1.00, label: 'orgs that booked somebody a second job (panel/MC/OST)' },
  obligationKept:    { lo: 0.10, hi: 1.00, label: 'orgs that worked a sponsored appearance (the invoice arrives)' },
  clipResurfaced:    { lo: 0.10, hi: 1.00, label: 'worlds where an old clip resurfaced (the archive naps)' },
  // ceiling 0.70→0.75 by ruling (v0.9.16): tuned at revivalChance 0.003
  // the operating point is ~0.65 ± 0.08 across builds (26-29/40) — the
  // old ceiling sat INSIDE the band's own binomial noise and flapped.
  // A lottery ~2/3 of three-year careers hit once is the design; the
  // everyone-wins alarm now lives at 0.75.
  // ceiling 0.75→0.85 by ruling (0.9.18.1): the 40-seed read flapped
  // at the old ceiling twice in one patch cycle (30, 27, 31/40); the
  // 80-seed operating point is 65%, so the ceiling moves outside the
  // small-sample noise (~2 sigma) instead of sitting inside it.
  // ceiling .85→.90 by ruling (v0.11.1, §92 D): the owner asked for more
  // reverse-run chances, and the roll reads the song, the month and the
  // push now — measured 27/40 before, 39/40 at the first soak (activity
  // doubled, the bot pushing every nine weeks), 35/40 tuned. The alarm
  // this band keeps is the salary: revivals per org-year prints in the
  // header; past ~1 a year the windfall is wages, not a lottery
  // the lottery ticket's guard is the RATE printed at the foot of the census
  // (reverse runs per org-year, "stays a ticket under ~1"): v0.11.7 measured
  // 37/40 orgs against the .90 ceiling while the rate FELL 0.74 → 0.63 —
  // fewer revivals, spread wider by the stages' small intensity moves. The
  // org count is re-pointed at the flood it exists to catch (hi .90 → .97);
  // the rate line stays the alarm that matters
  catalogRevived:    { lo: 0.02, hi: 0.97, label: 'orgs whose catalog track reverse-charted (the lottery ticket)' },
  viralSourced:      { lo: 0.50, hi: 1.00, label: 'orgs whose viral moments carry provenance (the clip has a stage)' },
  obligationMissed:  { lo: 0.00, hi: 0.80, label: 'orgs that missed a sponsored appearance (the road won)' },
  dealClawedBack:    { lo: 0.00, hi: 0.50, label: 'orgs a brand terminated for cause (two misses)' },
  soloRequested:     { lo: 0.05, hi: 1.00, label: 'orgs that got the sponsor solo request' },
  soloAllowed:       { lo: 0.50, hi: 1.00, label: 'orgs that let the solo stage happen' },   // ruled v0.11.3 from the measured count
  // the practice room years + the regional schools (v0.9.16). Floors on
  // the rare arcs (quit, aging-out, last-chance) open at 0 for the first
  // soak and tighten once measured — the ceilings are the day-one alarms.
  // the title fight (v0.9.17). The producer-cooling path runs dormant in
  // soak by construction — the bot picks the best hook, which IS the
  // push — so that band opens floor 0 (suite-held, watch human play).
  // the gravity (v0.9.18). Floors open low/zero on the rare arcs for the
  // first soak; ceilings are the day-one alarms.
  clamorBegan:       { lo: 0.05, hi: 1.00, label: 'orgs where the transcendence clamor began (the trades feature)' },
  clamorSettled:     { lo: 0.50, hi: 1.00, label: 'orgs that settled a clamor with the in-group solo' },   // ruled v0.11.3 from the measured count
  // ceiling re-ruled 0.90→0.97 at v0.10.7 (37/40): the scout seat
  // (v0.10.6) multiplies applicant flow, so long soak orgs sign a
  // transcendent — and pay her clock — in most worlds now. Alive both
  // ways while any world escapes it; watch for 40/40 wallpaper.
  clamorHeld:        { lo: 0.00, hi: 0.97, label: 'orgs that held a transcendent and paid the resentment clock' },
  soloKnocked:       { lo: 0.50, hi: 1.00, label: 'orgs where she knocked with the rehearsed ask' },   // ruled v0.11.3 from the measured count
  slumpSeen:         { lo: 0.00, hi: 0.80, label: 'orgs where somebody lost the nerve (the slump)' },
  footingFound:      { lo: 0.00, hi: 0.80, label: 'orgs where the nerve came back (the footing)' },
  arcMinted:         { lo: 0.02, hi: 1.00, label: 'orgs that minted a group identity arc (icons/variety/OST)' },
  // the trainee floor gets a door (0.9.18.1): rooms sized to a plan
  rivalCulled:       { lo: 0.05, hi: 1.00, label: 'worlds where a rival evaluation cut the trainee floor' },
  // ceiling 0.90→1.00 by ruling (0.9.18.1, first soak): median 3 named
  // cuts per world across FIVE companies in 140 weeks — one per company
  // every two years, lowest peak first once tenure runs (audit v0.11.3: no cap).
  // Ruthless is the owner's brief; the alarm guards extinction.
  rivalNamedCut:     { lo: 0.05, hi: 1.00, label: 'worlds where a NAMED signee was cut at an evaluation' },
  // the mandate (v0.9.19): first soak; ceilings are the day-one alarms
  mandateGranted:    { lo: 0.10, hi: 1.00, label: 'orgs whose pitch survived the boardroom' },
  // floor 0.02→0 (v0.9.19 first soak): the bot ALWAYS pitches before the
  // floor gets loud enough, so the unasked greenlight is bot-dormant by
  // construction — the resignation-letter pattern. Suite-held, §18.
  mandateBoard:      { lo: 0.20, hi: 1.00, label: 'orgs the board greenlit unasked (the loud floor)' },   // ruled v0.11.3 from the measured count
  mandateLapsed:     { lo: 0.00, hi: 0.60, label: 'orgs that let a greenlight lapse dark' },
  // floor 0.40→0.05 by ruling (0.9.20.1): the one-hall bot consumes
  // its bench into lineups before any term laps (6/80) — the table
  // fires for hoarders, and the bot stopped being one (1/40, 6/80).
  // Suite-held; floor guards outright extinction only.
  traineeTabled:     { lo: 0.02, hi: 1.00, label: 'orgs where a trainee term reached the table' },
  traineeWalked:     { lo: 0.00, hi: 0.90, label: 'orgs where the table ended a trainee story' },
  anticipationBanked:{ lo: 0.50, hi: 1.00, label: 'orgs whose countdown banked an opening edge' },
  // the member desk (v0.9.20): the walkout is world-driven — grudges the
  // ledgers accumulate can summon it even for a decent boss
  walkoutCalled:     { lo: 0.00, hi: 0.60, label: 'orgs where she called the meeting (the walkout)' },
  // the bad blood (v0.9.21): first soak; ceilings are the day-one alarms
  sceneRivalry:      { lo: 0.05, hi: 1.00, label: 'orgs with a named professional rivalry (the coverage found its angle)' },
  fanWarSeen:        { lo: 0.02, hi: 1.00, label: 'orgs whose rivalry ignited a fan war week' },
  inGroupRivalry:    { lo: 0.00, hi: 0.60, label: 'orgs where a cold pair hardened into an in-house rivalry' },
  cannibalSeen:      { lo: 0.00, hi: 0.80, label: 'orgs whose own groups habitually cannibalize (3+ overlaps)' },
  masterMinted:      { lo: 0.05, hi: 1.00, label: 'orgs whose fandom minted a fansite master' },
  // history: hi .70 through 0.10.19 (soaks ran 24–28/40); 0.10.20's ad
  // settlement nudged bot cashflow and one org across the line (29/40) —
  // stream drift, not a mechanism change. Widened to .75.
  masterTurned:      { lo: 0.00, hi: 0.75, label: 'orgs that watched a fansite post the closing notice' },
  // festival season + award night (v0.9.22): first soak
  festInvited:       { lo: 0.30, hi: 1.00, label: 'orgs the festival organizers called by name' },
  festHeadlined:     { lo: 0.00, hi: 0.80, label: 'orgs whose icons took the top of a poster' },
  festMissed:        { lo: 0.00, hi: 0.50, label: 'orgs that pulled out of a booked slot' },
  nightPlanned:      { lo: 0.10, hi: 1.00, label: 'orgs that chose the microphone before the ceremony' },
  // ceiling 0.90→1.00, floor 0.02 (v0.9.22 first soak): a bot that wins
  // a bonsang most careers and always answers the seating chart speaks
  // ~always — the alarm guards extinction of the attended night.
  speechGiven:       { lo: 0.02, hi: 1.00, label: 'orgs whose chosen speaker took the mic on a win' },
  // the service (v0.9.23): a 140-week soak CANNOT reach the enlistment
  // window by age math — prospects generate 14–22, so the oldest male
  // idol is ~25 at soak end against a notice age of 26. These bands
  // assert that structural silence (nothing fires early); the system's
  // positive teeth live in audit_longhaul (620 weeks, invariant: no
  // male idol past the wall who is neither serving nor served).
  svcPapersSeen:     { lo: 0.00, hi: 0.10, label: 'orgs where enlistment papers reached the desk' },
  svcEnlisted:       { lo: 0.00, hi: 0.10, label: 'orgs that sent a man to service' },
  // the rise and fall (v0.9.24): ruled on first-soak measurement
  // (40 seeds: rankings 40, seat moved 40, classes 4, offers 32,
  // turns 33, torches 33, rival service 0 — age-silent by design)
  rfRankings:        { lo: 0.90, hi: 1.00, label: 'worlds where the trades published the power ranking' },
  rfTopSeatMoved:    { lo: 0.50, hi: 1.00, label: 'worlds where the top seat changed hands (any overtake)' },
  rfClassSeen:       { lo: 0.00, hi: 0.45, label: 'worlds that watched a collapse mint a signing class' },
  rfOfferSeen:       { lo: 0.20, hi: 1.00, label: 'orgs the imperial house tried to hire' },
  rfGenTurned:       { lo: 0.30, hi: 1.00, label: 'worlds where a generation turned' },
  rfTorchSeen:       { lo: 0.30, hi: 1.00, label: 'worlds where a rookie took the torch' },
  rfRivalService:    { lo: 0.00, hi: 0.10, label: 'worlds where a rival act hit the service wall (age-silent in soak)' },
  // the portfolio (v0.9.26): first soak — provisional, measure-first
  unitEraSeen:       { lo: 0.10, hi: 1.00, label: 'orgs that ran a unit era between group eras' },
  doctrineDeniedSeen:{ lo: 0.00, hi: 1.00, label: 'orgs told no by their own doctrine' },
  // the tongue (v0.9.29): first soak — provisional
  auditionRun:       { lo: 0.10, hi: 1.00, label: 'orgs that funded a global audition tour' },
  intlSigned:        { lo: 0.10, hi: 0.90, label: 'orgs that signed an international trainee' },   // ruled v0.11.3 from the measured count
  // the secret (v0.9.30): first soak — provisional
  secretFormed:      { lo: 0.20, hi: 1.00, label: 'orgs where a private life deepened (19+ only)' },   // ruled v0.11.3 from the measured count
  revealSeen:        { lo: 0.00, hi: 0.80, label: 'orgs where the midnight photos landed' },
  // the sagas (v0.9.31): the hash window [60,320] puts ~31% of first
  // sagas inside a 140-week census; the rest belong to the longhaul,
  // which asserts every world gets one. Measured 9/40 first soak —
  // sampling variance around the window math, exactly as planned.
  sagaFired:         { lo: 0.05, hi: 0.60, label: 'orgs whose world a saga invaded inside 140 weeks' },
  // one saga in five is the JV, and only fired JVs get answered
  // (measured 2/40 first soak)
  jvAnswered:        { lo: 0.00, hi: 0.30, label: 'orgs that answered the co-build term sheet' },
  // the network (v0.9.35): first soak — provisional, measure then rule
  networkApps:       { lo: 0.60, hi: 1.00, label: 'orgs whose application pile produced a file' },   // ruled v0.11.3 from the measured count
  networkRefs:       { lo: 0.50, hi: 1.00, label: 'orgs the building referred somebody to' },   // ruled v0.11.3 from the measured count
  washoutReturned:   { lo: 0.50, hi: 1.00, label: 'worlds where a rival cut a REAL trainee (the floor is people, v0.10.31)' },
  reentrySeen:       { lo: 0.30, hi: 1.00, label: 'orgs where a released trainee resurfaced on the open board (v0.10.31)' },
  rivalDoorBorn:     { lo: 0.90, hi: 1.00, label: 'worlds where a rival signed somebody at its own door, with a hometown' },
  // measured 37/40 at v0.10.12 intro — culls fire on every rival's clock;
  // the misses are boards that stayed full when the dice came up
  castoffSeen:       { lo: 0.70, hi: 1.00, label: 'worlds where a rival cut put a face on the board' },
  seasonAired:       { lo: 0.50, hi: 1.00, label: 'worlds whose annual season finale aired (calendar law)' },
  seasonCastWorld:   { lo: 0.50, hi: 1.00, label: 'worlds whose season drew 8+ contestants from 3+ sources (cast from the world, v0.10.32)' },
  seasonInvited:     { lo: 0.30, hi: 1.00, label: 'orgs the season producers invited (a free trainee of the season’s gender)' },
  seasonSent:        { lo: 0.10, hi: 1.00, label: 'orgs that sent somebody to a season' },
  // measured 23/40 at v0.10.32, 25/40 at v0.10.35 (two stream shifts) — hi .60→.70
  seasonOursLineup:  { lo: 0.00, hi: 0.70, label: 'orgs whose trainee made a finale lineup (held, or kept)' },
  seasonPermanent:   { lo: 0.02, hi: 0.90, label: 'worlds where a season’s roll came up permanent' },
  // the season, televised (v0.11.4, §95): measure-first
  // ruled v0.11.4 from the first soak: pushed 16/40, coached 19, edited 13, episodes 20 (= every org that sent)
  seasonPushed:      { lo: 0.10, hi: 0.90, label: 'orgs that bought a vote push for their contestant' },
  seasonCoached:     { lo: 0.10, hi: 0.90, label: 'orgs that flew a coach to the set' },
  seasonEdited:      { lo: 0.05, hi: 0.80, label: 'orgs whose contestant was cut an edit' },
  seasonEpisodes:    { lo: 0.10, hi: 1.00, label: 'orgs that read an episode letter with their kid in it' },
  // the wiring (v0.11.5, §96 recommendation 1): ruled from the second
  // 40-org soak on the final code — passed chair 36, red-ink silence 0
  // (the bot answers every scene), greenlight 4, warehouse memo 25 (at
  // normal it was 0: trimmed every release week), second run 0 (bot
  // never), repackage announced 28, landing critical 40, sheet critical
  // 40 / high 40, solo door 0 (bot never), leveraged offer 0 (the bot
  // leverages only when broke; the offer itself came 16), regrets 40,
  // desk cooled 0, tour record 40
  wirePassedChair:    { lo: 0.40, hi: 1.00, label: 'orgs told a passed candidate took a rival’s chair' },
  wireRedInkSilence:  { lo: 0.00, hi: 0.20, label: 'orgs that let the red-ink talk expire (the room read the silence)' },
  // re-ruled v0.11.21 (§112): "greenlight 4" above was the letter landing,
  // not the mandate being met. It was written in more than four careers in
  // five and the week's budget cut it 157 times in 168. Critical now, and it
  // lands when it is written: 31 of 40.
  wireMandateMet:     { lo: 0.40, hi: 1.00, label: 'orgs whose exec acknowledged a kept greenlight' },
  wireWarehouseMemo:  { lo: 0.20, hi: 0.95, label: 'orgs that got the warehouse memo (overpressed)' },
  wireRestockPressed: { lo: 0.00, hi: 0.10, label: 'orgs that pressed a second run (bot never)' },
  wireRepackageSet:   { lo: 0.30, hi: 1.00, label: 'orgs whose repackage was announced by letter' },
  wireLandedCritical: { lo: 0.90, hi: 1.00, label: 'orgs whose landing letter arrived critical' },
  wireEvalCritical:   { lo: 0.60, hi: 1.00, label: 'orgs whose evaluation sheet went critical (the talk or the building’s first #1)' },
  wireEvalHigh:       { lo: 0.60, hi: 1.00, label: 'orgs whose evaluation sheet went high (a first #1, a climber or a new ace)' },
  wireGraduatedSolo:  { lo: 0.00, hi: 0.10, label: 'orgs that opened the solo door at the table (bot never — suite-held)' },
  wireOfferLeveraged: { lo: 0.00, hi: 0.40, label: 'orgs whose leveraged offer is remembered by the house' },
  wireFestRegrets:    { lo: 0.50, hi: 1.00, label: 'orgs that sent regrets an organizer remembers' },
  wireDeskCooled:     { lo: 0.00, hi: 0.40, label: 'orgs with a broadcaster desk cooled by declines' },
  wireTourRecord:     { lo: 0.60, hi: 1.00, label: 'orgs whose group page keeps a tour record' },
  // the stages, lived (v0.11.7, §98): ruled from the first 40-org soak —
  // encore door 40, handed back 0 (the bot's worn-room bar of 75 is rarely
  // met on humane pacing; suite-held), presser 1 / statement 1 (a fumbled
  // night is rare for a sensible bot), swap offered 24 / sung 20, moments
  // 40, ceremony 40, road card 40, bills 40, deep 17, collab 38 (friends
  // form in promo weeks and the bot collabs whenever one is on the bill),
  // fest moments 40, tier-3 headline 0 (icons + pop 58 inside 140 weeks is
  // rare; suite-held), Japan 40
  roadEncoreOffered:    { lo: 0.50, hi: 1.00, label: 'orgs offered the encore night door' },
  roadEncoreHandedBack: { lo: 0.00, hi: 0.40, label: 'orgs that handed a second night back (worn room)' },
  roadPresserOffered:   { lo: 0.00, hi: 0.40, label: 'orgs offered the road presser after a fumbled night' },
  roadStatement:        { lo: 0.00, hi: 0.40, label: 'orgs that put out a road statement' },
  roadSwapOffered:      { lo: 0.20, hi: 1.00, label: 'orgs offered the setlist swap (a loud fan pick)' },
  roadSwapped:          { lo: 0.10, hi: 1.00, label: 'orgs that sang the pick on the road' },
  roadMoments:          { lo: 0.80, hi: 1.00, label: 'orgs whose leg letters named a moment' },
  roadCeremony:         { lo: 0.80, hi: 1.00, label: 'orgs that read a tour wrap as a ceremony' },
  roadCardSeen:         { lo: 0.80, hi: 1.00, label: 'orgs with the road card on Today during a tour' },
  festBillPosted:       { lo: 0.90, hi: 1.00, label: 'orgs in a world that posted a festival bill' },
  festDeepSet:          { lo: 0.10, hi: 0.90, label: 'orgs that took a festival slot with the deep cut' },
  festCollab:           { lo: 0.30, hi: 1.00, label: 'orgs that played a festival collab with a friend’s act' },
  festMoments:          { lo: 0.80, hi: 1.00, label: 'orgs whose festival night named a moment' },
  festHeadlineCeremony: { lo: 0.00, hi: 0.30, label: 'orgs that headlined a top-tier bill (the ceremony letter)' },
  jpAwayMoments:        { lo: 0.60, hi: 1.00, label: 'orgs whose Japan weeks wrote a moment' },
  // the era, closed (v0.11.9, §100): measured open, then ruled from two
  // soaks on the release's code. 40 seeds / 120 seeds: close letter 40 /
  // 120; reissue offered 40 / 119; chair's pick 32 / 86; fans' pick 4 / 14
  // (the boss takes it only for a cold fandom); Studio build 0 / 0 (bot
  // never); rested 40 / 119; lapsed 1 / 7 (the boss waits on the account
  // and the fuse runs out); superseded 0 / 0 (the boss does not lock under
  // an open door); pre-order read 40 / 120; ahead 38 / 115; soft 39 / 116.
  // The second wind's three rows were measured once, at 40 seeds, with the
  // boss signing through the flag under 75: offered 36, through the flag
  // 7, closed-and-marked 10. Floors of .02 mean "at least one org in
  // forty": at the measured rates they false-alarm under 1% of re-samplings.
  eraClosedLetter:   { lo: 0.95, hi: 1.00, label: 'orgs that read an era’s close as a ceremony' },
  eraReissueOffered: { lo: 0.85, hi: 1.00, label: 'orgs offered the reissue door at a close' },
  eraReissueAnr:     { lo: 0.40, hi: 1.00, label: 'orgs that reissued with the chair’s pick' },
  eraReissueFans:    { lo: 0.02, hi: 0.50, label: 'orgs that reissued with the fans’ pick' },
  eraReissueDesk:    { lo: 0.00, hi: 0.10, label: 'orgs that set a reissue from the Studio (bot never)' },
  eraRested:         { lo: 0.85, hi: 1.00, label: 'orgs that let an era rest' },
  eraLapsed:         { lo: 0.00, hi: 0.40, label: 'orgs whose reissue door lapsed unanswered' },
  eraSuperseded:     { lo: 0.00, hi: 0.20, label: 'orgs whose reissue door a new lock closed' },
  eraPreorderRead:   { lo: 0.95, hi: 1.00, label: 'orgs that got the pre-order week’s read' },
  eraPreorderAhead:  { lo: 0.60, hi: 1.00, label: 'orgs whose pre-orders ran ahead of a pressing' },
  eraPreorderSoft:   { lo: 0.60, hi: 1.00, label: 'orgs whose pre-orders read soft against a pressing' },
  eraExtOffered:     { lo: 0.60, hi: 1.00, label: 'orgs offered the second wind (a climbing record in a last week)' },
  eraExtTired:       { lo: 0.02, hi: 0.80, label: 'orgs that signed the second wind through the staff’s flag' },
  eraClosedExtended: { lo: 0.05, hi: 0.90, label: 'orgs whose file marks a closed era as extended' },
  // the long goodbye (v0.11.10, §101). The first soak measured every row
  // of it at 0/40: inside 140 weeks only the inherited act reaches its
  // renewal tables, and a boss who answers them keeps everyone (a lap
  // begins on the gone band, or on a held line the till could not better).
  // So the census keeps three ceilings, and the lap itself is measured
  // where people do choose to go: the long-horizon pass below, which
  // prints its own line and holds its own guards.
  byeLap:        { lo: 0.00, hi: 0.30, label: 'orgs where a member chose to go (a farewell lap began)' },
  byeAlumni:     { lo: 0.00, hi: 0.30, label: 'orgs with a former member on an act’s list' },
  byeColdExit:   { lo: 0.00, hi: 0.10, label: 'orgs where a contract ended cold' },
  // across the street (v0.11.12, §103). An attentive boss loses almost
  // nobody inside 140 weeks, so these are ceilings: the chapter is
  // measured where people do leave, in the long-horizon pass below.
  acrossSigned:  { lo: 0.00, hi: 0.20, label: 'orgs with an alumna signed across the street' },
  acrossLife:    { lo: 0.00, hi: 0.20, label: 'orgs with an alumna in a life outside' },
  // v0.10.33 — the one market: a collapse's signing class is on the open
  // board and the bot buys a career when flush. Measure-first: collapses
  // are rare inside 140 weeks, so the floor is 0 until a census says more.
  careerSigned:      { lo: 0.00, hi: 1.00, label: 'orgs that signed a career off the open market (a collapse’s class)' },
  // v0.10.34 — the two verdicts. "Plenty of great songs never chart high":
  // the critics' darling and the panned hit must both be live outcomes;
  // the trades name the year's sound every January. Measure-first floors.
  criticsDarling:    { lo: 0.02, hi: 0.90, label: 'orgs with a critics’ darling (craft high, chart low)' },
  // v0.10.35 — the studio. The bot briefs a record whenever the room is
  // free and the account can carry the fees; the chairs fill when the
  // market sends a candidate. Measure-first floors on the chairs.
  commissioned:      { lo: 0.60, hi: 1.00, label: 'orgs that commissioned a record' },
  offLaneRecord:     { lo: 0.05, hi: 1.00, label: 'orgs that released a producer out of his lane' },
  houseChair:        { lo: 0.60, hi: 1.00, label: 'orgs that filled a house producer or writer chair' },   // ruled v0.11.3 from the measured count
  // ceiling .90→.95 (v0.11.0): measured 26–35/40 across v0.10.35–43 and
  // 101/120 at the wide run — the operating point sits AT the old ceiling,
  // and the red weeks' pitches moved the stream in 24 orgs (37/40). First
  // chase; a second flap re-points the band at the mechanism (§18 rule)
  themeNamed:        { lo: 0.00, hi: 0.95, label: 'orgs whose critics named a theme that fought the room' },
  pannedHit:         { lo: 0.00, hi: 0.80, label: 'orgs with a hit the critics panned' },
  criticsSplit:      { lo: 0.05, hi: 1.00, label: 'orgs that drew a split review' },
  trendNamed:        { lo: 0.95, hi: 1.00, label: 'worlds where the trades named the year’s sound' },
  callHeld:          { lo: 0.00, hi: 1.00, label: 'orgs that held an open call or walked the districts' },
  // the public eye (v0.9.36): every announcement mints an expectation
  // and every debut settles against it, so these are FLOORS — if they
  // fall the announcement/settle hooks came unwired. Measured 40/40 and
  // 40/40 first soak. Snubs need a KNOWN trainee left off a lineup
  // (measured 24/40); compares ride the 0.55 roll across many releases
  // (measured 40/40, floored lower for sampling room).
  // the grind (v0.9.37): legacy soak orgs start FAMOUS (fame ~0.64),
  // so the pile correctly never deals to them and the wall never
  // bites — measured 0/40 first soak, by design. These are CEILINGS:
  // if famous orgs start drawing wedding gigs or feeling the wall,
  // the fame gates broke. The positive path is verified where low-fame
  // worlds exist: the longhaul's blank scenario asserts gigs played
  // and the wall felt (hard invariants), and suite_078 forces both.
  // the product (v0.10.0): every resolution settles a pressing — a
  // FLOOR like the §77 verdict band (falling means the hook came
  // unwired). Sold-out and warehouse are the gamble's two tails; the
  // dump storm needs 2+ sign rounds, which the auto sheet caps at 1.
  // First soak — provisional on the tails, measure then rule.
  // the person in public (v0.10.2): first soak — provisional. Asks are
  // rare by design (5%/wk gated on an eligible ask-er and an empty
  // scene slot); scandals are rarer (personality-priced per person-week).
  // ruled first soak: 40/40, 36/40, 31/40, 15/40 — the mic is common,
  // the slip is the lottery working, a story every ~3-4 label-years,
  // and the heavy end stays a minority of worlds
  channelSeen:       { lo: 0.80, hi: 1.00, label: 'orgs where somebody got the mic (channel or live)' },
  gaffeLottery:      { lo: 0.50, hi: 1.00, label: 'orgs whose open mic slipped at least once' },
  storySeen:         { lo: 0.40, hi: 1.00, label: 'orgs a story broke on (the response desk opened)' },
  storyForced:       { lo: 0.10, hi: 0.90, label: 'orgs where a story forced a hiatus or the choice' },
  // the recurring money (v0.10.3): ruled first soak — 40/40, 40/40,
  // 40/40, 40/40, 31/40. Clubs open at intensity 35 (legacy soak orgs
  // organize fast), greetings/fancons follow once the bot is idle+flush,
  // and any shelf with reception>45 pays. The storm is the lottery on
  // stacked seasons (3+ pushes/24wk, 35%): first measure was 0/40
  // because only fancon+greetings pushed — club enrollment and the tour
  // table now count, which is what made it reachable at all. Floors
  // guard each mechanism against going dead, not against variance.
  clubOpened:        { lo: 0.90, hi: 1.00, label: 'orgs whose fandom opened paid membership' },
  greetingsOut:      { lo: 0.80, hi: 1.00, label: 'orgs that shipped a Season\'s Greetings' },
  fanconHeld:        { lo: 0.70, hi: 1.00, label: 'orgs that held a fancon between eras' },
  catalogPaying:     { lo: 0.90, hi: 1.00, label: 'orgs whose shelf pays the weekly annuity' },
  // atmStorm: hi 0.95 → 1.00 at v0.10.23 (the hostile audit) — the
  // lightstick launch now marks a merch push, so the commerce-maximal
  // bot ALWAYS earns the story inside 140 weeks (40/40). A player who
  // paces the calendar still escapes; the bot never paces. lo guards
  // the mechanism against going dead again.
  atmStorm:          { lo: 0.15, hi: 1.00, label: 'orgs that squeezed into the ATM story' },
  // the solo era (v0.10.24, §87): first measure 40/40 both — the bot
  // opens a single whenever a star is first-among-equals in the rest
  // window, which is every org by week 140. Floors guard the mechanism
  // against going dead, not against variance
  soloEraRun:        { lo: 0.05, hi: 1.00, label: 'orgs that opened an in-group solo era' },
  soloCutOut:        { lo: 0.05, hi: 1.00, label: 'orgs whose member dropped a standalone solo single' },
  // the friction stream (v0.10.26, §88): floors guard a dead stream;
  // teeth band stays wide — the bot answers safe, so its teeth are the
  // rare tails only (measure-first)
  frictionFlows:     { lo: 0.30, hi: 1.00, label: 'orgs where the person questions kept coming (3+)' },
  frictionTeeth:     { lo: 0.00, hi: 0.80, label: 'orgs that got bitten by a badly-read answer' },
  // the making (v0.10.4): ruled first soak — 40/40, 28/40, 30/40,
  // 40/40, 11/40, 39/40, 10/40, 8/40. Stations and the line card ride
  // every prep (floors); slips/clips are calendar lotteries; the
  // stopwatch audit needs a centered card (bot centers a hyped ace at
  // 12+, first measure was 0/40 at threshold 25 — hype builds late);
  // chronics need the push door, which the bot walks only under
  // schedule pressure. Floors guard against going dead.
  stationRun:        { lo: 0.90, hi: 1.00, label: 'orgs whose eras ran the production board' },
  slipDecided:       { lo: 0.15, hi: 1.00, label: 'orgs that faced postpone-or-crunch' },
  clipCaught:        { lo: 0.20, hi: 1.00, label: 'orgs whose MV set leaked the free trailer' },
  sheetSet:          { lo: 0.90, hi: 1.00, label: 'orgs that set a sheet at the booth' },
  lineWarSeen:       { lo: 0.05, hi: 0.70, label: 'orgs litigated by the stopwatch thread' },   // §91 Phase 3: measured 26/40 at .30 a fault, 22/40 and 72/120 at .20 — hi .60→.70
  // the stage, judged (v0.10.37, §91 Phase 4) — measure-first
  stageCarried:      { lo: 0.50, hi: 1.00, label: 'orgs that carried a stage' },
  stageFumbled:      { lo: 0.10, hi: 0.90, label: 'orgs that fumbled a stage' },
  chemistryStaged:   { lo: 0.05, hi: 1.00, label: 'orgs whose formation read a pair (close or tense) on a stage' },
  // the promotion (v0.10.38, §91 Phase 5) — measure-first
  offerTaken:        { lo: 0.30, hi: 1.00, label: 'orgs that took a promo invitation (a swap on the plan)' },
  // the band holds; the history is the boss's, not the verb's. Under the
  // boss that signed only an unflagged room the row read 7, 8, 5, 4, 7, 4,
  // 3 of 40 across the saved soaks and 11 of 120 (9%, under the floor):
  // the room's median in a last promotion week is 83 against the staff's
  // flag at 70, so nearly every climbing last week arrived flagged. Since
  // v0.11.9 (§100) the boss signs through the flag under 75 and the row
  // reads 10/40, the probe's counterfactual to the org.
  eraExtended:       { lo: 0.10, hi: 0.90, label: 'orgs that extended an era on a climbing record' },
  comebackStaged:    { lo: 0.90, hi: 1.00, label: 'orgs whose era opened on a named comeback stage' },
  // the second chair (v0.10.39) — measure-first: the first chair must prove out first
  secondChair:       { lo: 0.00, hi: 0.60, label: 'orgs that seated a second studio chair' },   // ruled v0.11.3 from the measured count
  // the pair and the mirror (v0.10.40, §88 D+E) — measure-first
  mentorPaired:      { lo: 0.10, hi: 1.00, label: 'orgs that paired a mentor with a struggling rookie' },
  writingPaired:     { lo: 0.02, hi: 0.80, label: 'orgs that paired two pens (and a co-written track landed)' },   // ruled v0.11.3 from the measured count
  keptApart:         { lo: 0.05, hi: 0.90, label: 'orgs that seated a feud apart' },   // ruled v0.11.3 from the measured count
  rivalryFramed:     { lo: 0.02, hi: 0.80, label: 'orgs that framed an in-group rivalry as competition' },   // ruled v0.11.3 from the measured count
  mirrorSpoken:      { lo: 0.80, hi: 1.00, label: 'orgs whose building formed a read of the boss' },
  // the song market (v0.10.5): ruled first soak — 40/40, 39/40, 39/40.
  // Hot hooks sit past windows constantly over long orgs (the bot
  // deliberates like everyone else); camps fire whenever a cold sheet
  // meets a flush till; bonds form from repeat collaboration. Floors
  // guard against going dead.
  // the staff (v0.10.6): ruled first soak — 40/40, 40/40, 31/40,
  // 40/40, 40/40. Interviews and notes are steady weekly lotteries
  // over long orgs; the outside call needs a "known" seat (results
  // built it); friction needs a bad-fit hire to sit ten weeks — the
  // fog-blind bot hires enough of them. Floors guard the mechanisms.
  // the rituals (v0.10.7): ruled first soak — all five at 40/40 over
  // long orgs (monthly sheets are constant; every career loses show
  // weeks; the bot mobilizes every promo). Floors guard against dead.
  // the Japan cycle (v0.10.8): ruled first soak — 40/40, 40/40, 40/40,
  // 0/40. Legacy soak orgs all sign, drop, and climb the first rungs;
  // the DOME needs ~4 stacked cycles the paced bot rarely strings
  // together — a crown, not wallpaper. Positive dome path is
  // suite-held (forced fans); the ceiling watches for wallpaper if
  // the economy ever inflates jp fans.
  // the world circuit (v0.10.9): ruled first soak — 31/40, 31/40,
  // 40/40. Invites need a warm far region AND an idle rested group;
  // most orgs that play also flop at least once (the tongue is rare);
  // every long org cuts a version off some hit. Floors guard dead.
  circuitPlayed:     { lo: 0.30, hi: 1.00, label: 'orgs that played a far-market convention' },
  circuitFlopped:    { lo: 0.15, hi: 1.00, label: 'orgs whose interview needed the interpreter' },
  enVersioned:       { lo: 0.85, hi: 1.00, label: 'orgs that cut the English version' },
  jpSigned:          { lo: 0.90, hi: 1.00, label: 'orgs that signed the Japan partnership' },
  jpDropped:         { lo: 0.85, hi: 1.00, label: 'orgs that posted a record to the Nichion weekly' },
  jpRungUp:          { lo: 0.70, hi: 1.00, label: 'orgs that climbed a rung of the JP ladder' },
  jpDomed:           { lo: 0.00, hi: 0.60, label: 'orgs that played the dome' },
  evalTalked:        { lo: 0.70, hi: 1.00, label: 'orgs that held the after-eval talk' },
  breakdownRead:     { lo: 0.80, hi: 1.00, label: 'orgs that read a point breakdown out loud' },
  nearMissFuel:      { lo: 0.50, hi: 1.00, label: 'orgs whose near-miss fed the fandom' },
  nudgeRun:          { lo: 0.85, hi: 1.00, label: 'orgs that ran a mobilization drive' },
  interviewHeld:     { lo: 0.90, hi: 1.00, label: 'orgs where a candidate took the meeting' },
  seatHired:         { lo: 0.80, hi: 1.00, label: 'orgs that made a hire into the fog' },
  seatCalled:        { lo: 0.30, hi: 1.00, label: 'orgs whose staff got the outside call' },
  staffVoice:        { lo: 0.90, hi: 1.00, label: 'orgs that heard a staff note in their voice' },
  meshFelt:          { lo: 0.60, hi: 1.00, label: 'orgs whose corridor read named the friction' },
  // measured 40/40 at v0.10.11 intro: legacy worlds open with the A&R and
  // marketing chairs empty and the bot posts when flush — the floor says
  // the verb stays reachable, not that every playstyle uses it
  searchPosted:      { lo: 0.85, hi: 1.00, label: 'orgs that posted a help wanted' },
  demoLost:          { lo: 0.60, hi: 1.00, label: 'orgs that lost a circulating hook to a faster checkbook' },
  campHeld:          { lo: 0.50, hi: 1.00, label: 'orgs that held a song camp' },
  bondWorking:       { lo: 0.50, hi: 1.00, label: 'orgs whose house regular showed his best' },
  medCase:           { lo: 0.60, hi: 1.00, label: 'orgs whose desk saw a diagnosis' },
  medChronic:        { lo: 0.05, hi: 0.80, label: 'orgs carrying a chronic file' },
  // floor .02 → 0 (v0.11.14): the flare is the last link of a thin chain
  // (a diagnosis, pushed through, opens a chronic file 35% of the time;
  // the file flares 5% of its heavy weeks) and one career in 40 is not a
  // floor it can carry. Measured 3/40, 3/40, 3/40, 4/40 (v0.11.10–13), then
  // 0/40 here; on 200 careers 12/200 on this build and 21/200 on v0.11.13
  // (z 1.6; of 340 rows none moved past z 2.6, six past 2). At 6% of
  // careers P(0 of 40) is 8%. The roll was read raw over those 200: 35 of
  // 116 pushes opened a file, the draws uniform. The chain is held by
  // suite_084 (a chronic knee forced through heavy weeks), the throughput
  // line prints every link, and a run large enough to be sure is guarded
  // below (20 chronic files and no flare). The ceiling still catches a flood.
  flareFelt:         { lo: 0.00, hi: 0.80, label: 'orgs whose veteran worked around the file' },
  chodongMinted:     { lo: 0.90, hi: 1.00, label: 'orgs whose releases printed a first-week number' },
  // ruled first soak: 25/40 and 36/40 — the gamble's two tails. Dead at 0
  // (the pressing choice stopped mattering), wallpaper at 1.0 for sellouts
  // (press braver, always). WHAT THESE TWO ROWS SAMPLE: each group's LAST
  // landing only (`g.results.product`), not the archive. An earlier note
  // here said "across ~6 eras per world"; that was never true of the code.
  // The career-long count of memos is `wireWarehouseMemo` above.
  // v0.11.9: sold out 32/40, 31/40 and 90/120 once the boss learned the
  // pressing ladder (cautious under deep fiscal pressure, bold after a
  // sellout). The ceiling holds.
  pressSoldOut:      { lo: 0.20, hi: 0.90, label: 'orgs whose last pressing sold out (the sweet lost money)' },
  // floor .30 → .20 (v0.10.38): measured 14/40, 22/40, 11/40 across
  // v0.10.36–38, when every landing rode the suggested sheet. Floor .20 →
  // .05 (v0.11.9, §100): 8/40, 7/40 and 27/120 with the ladder. The
  // suggested sheet almost never overpresses (1 of 393 landings in the
  // probe); the memo now belongs to the bold run after a sellout (59 of
  // 142), so at career end it sits on about one org in five. A floor at
  // the measured rate fails a third of re-samplings; .05 fails about one
  // in six hundred and still says the tail exists.
  pressWarehouse:    { lo: 0.05, hi: 1.00, label: 'orgs whose last pressing left boxes in the warehouse' },
  // the table (v0.9.38): counters need fame under 0.45 AND a file
  // worth arguing over — legacy soak orgs sit at 0.64, so this is a
  // CEILING like the wall bands (gates broken if famous orgs get
  // countered); the positive path lives in haul-fresh/blank and
  // suite_079. First soak — provisional, measure then rule.
  counterMet:        { lo: 0.00, hi: 0.50, label: 'orgs a worthwhile file countered at the table' },
  clauseLive:        { lo: 0.00, hi: 0.50, label: 'orgs that signed a debut-by clause (paper with teeth)' },
  gigPlayed:         { lo: 0.00, hi: 0.50, label: 'orgs that played a stage off the booking pile' },
  // the bot works EVERY locked era (measured 40/40 first soak) — a
  // floor: falling means the campaign verb came unwired
  campaignRun:       { lo: 0.90, hi: 1.00, label: 'orgs that worked a release campaign by hand' },
  gigViralSeen:      { lo: 0.00, hi: 0.50, label: 'orgs the phone-camera lottery paid out for' },
  wallTouched:       { lo: 0.00, hi: 0.50, label: 'orgs whose release felt the obscurity wall' },
  breakSeen:         { lo: 0.00, hi: 0.30, label: 'orgs that broke through the wall (the story)' },
  expectSet:         { lo: 0.90, hi: 1.00, label: 'orgs whose announcement minted public expectations' },
  // the passed-over ace (v0.9.16): 8–10/40 under the first hash, whose fog
  // read a person's five talents with one offset that never shrank (§99);
  // 5/40 at v0.11.8 once the reads became per-talent and the sheet's #1
  // and the bot's lineup started agreeing. A story, not a rate — the
  // floor is the extinction guard
  snubSeen:          { lo: 0.05, hi: 0.95, label: 'orgs where a known trainee was passed over (the story)' },
  verdictSeen:       { lo: 0.90, hi: 1.00, label: 'orgs whose debut settled against its own announcement' },
  compared:          { lo: 0.75, hi: 1.00, label: 'orgs the write-ups compared in-house or across the week' },
  // the holdout (v0.9.33): first soak — provisional. Holdouts need the
  // top slice of talent AND rival heat >= 2 on the same file; the bot
  // meets them wherever its wanted prospect is also the market's.
  holdoutMet:        { lo: 0.00, hi: 1.00, label: 'orgs a recruit said no to (the board has agency)' },
  holdoutWon:        { lo: 0.02, hi: 0.80, label: 'orgs that got a holdout signed by any path' },   // ruled v0.11.3 from the measured count
  holdoutLost:       { lo: 0.50, hi: 1.00, label: 'orgs whose holdout signed with a power instead' },   // ruled v0.11.3 from the measured count
  // time takes its share (v0.9.32): first soak — provisional. The
  // legacy act's members cross 28 inside 140 weeks in most worlds;
  // drift needs trust above 75, which the bot rarely holds; and
  // successions start at week 240+ (era math), so the census asserts
  // silence and the positive coverage lives in the longhaul.
  // measured 39/40 first soak: the legacy act ships aging members by
  // design, so the crossing is near-universal — the band guards the
  // FLOOR (silence would mean the clock broke)
  senesceSeen:       { lo: 0.50, hi: 1.00, label: 'orgs where an idol crossed the senescence line' },
  // measured 40/40 first soak: the bot rides trust high, so every org
  // ticks the clock at least once — that is the anti-saturation working,
  // not an alarm. Floor guard: a dead clock is the regression here.
  trustDrifted:      { lo: 0.30, hi: 1.00, label: 'orgs whose devotion decayed above the bar' },
  successionSeen:    { lo: 0.00, hi: 0.10, label: 'orgs that saw a chair change inside 140 weeks (era math says none)' },
  memberDemoSeen:    { lo: 0.20, hi: 1.00, label: 'orgs whose meeting carried a member-written demo' },
  memberTitleChosen: { lo: 0.00, hi: 0.90, label: 'orgs that chose her song as the title track' },
  producerCooled:    { lo: 0.00, hi: 0.80, label: 'orgs a snubbed producer stopped sending good hooks' },
  repackaged:        { lo: 0.05, hi: 1.00, label: 'orgs that extended an era with a repackage' },
  mvCinema:          { lo: 0.02, hi: 1.00, label: 'orgs that shot a cinema-budget video' },
  // ceiling 0.90→0.97 by ruling (0.9.20.1), flapped AGAIN at 39/40
  // (v0.9.33 stream shift) — third flap, so the alarm flips per the
  // showDarling precedent: the plain cut is the budget default, near-
  // universal by design, and the regression this band exists to catch
  // is plain cuts VANISHING (an economy where everyone flexes cinema).
  mvPlain:           { lo: 0.30, hi: 1.00, label: 'orgs that shipped the performance cut (the internet noticed)' },
  schoolLead:        { lo: 0.60, hi: 1.00, label: 'orgs whose board carried a school-stamped file' },
  schoolClass:       { lo: 0.30, hi: 1.00, label: 'worlds where a school sent its class to an open casting' },
  schoolTrip:        { lo: 0.30, hi: 1.00, label: 'orgs that took the scouting trip (the train to the regions)' },
  schoolPartner:     { lo: 0.20, hi: 1.00, label: 'orgs that signed a first-look school partnership' },
  schoolHot:         { lo: 0.00, hi: 0.60, label: 'worlds where a school got HOT off its graduates' },
  // measured 26/40 at v0.10.14 intro (openChance 0.012/wk over 140wk)
  schoolOpened:      { lo: 0.30, hi: 1.00, label: 'worlds where a new school opened its doors' },
  // closures need rep<30 held half a year — a longhaul-scale event, 0/40
  // in the 140-week soak by design; the suite pins the mechanism
  schoolClosed:      { lo: 0.00, hi: 0.60, label: 'worlds where a quiet school became a math hagwon' },
  // the academy's game (v0.10.17, §84) — measured 40/24/40 of 40 at
  // intro (trips + showcases reveal everywhere; calls need a strong
  // student met while the temper dice cooperate; the fog ALWAYS eats
  // somebody in 140 weeks, which is the owner's ruling working)
  // the runway (v0.10.19, §85) — measured 32/25/12 of 40 at intro (the
  // bot pitches when broke past week 40; takes the revenue share)
  fundPitched:       { lo: 0.40, hi: 1.00, label: 'orgs that printed a deck and pitched the funds' },
  fundFinanced:      { lo: 0.30, hi: 1.00, label: 'orgs that took fund money (any structure)' },
  fundPassed:        { lo: 0.05, hi: 0.90, label: 'orgs a fund passed on — a pass is an answer' },
  // the content desk (v0.10.18) — measured 40/36 of 40 at intro (the
  // bot films every other week; hits ride hitChance .05 over 140wk)
  contentPosted:     { lo: 0.80, hi: 1.00, label: 'orgs whose company account posted in-house content' },
  contentHit:        { lo: 0.40, hi: 1.00, label: 'orgs with an upload that broke containment' },
  classRevealed:     { lo: 0.80, hi: 1.00, label: 'worlds where the fog gave up a student (trip or showcase)' },
  directorCalled:    { lo: 0.20, hi: 1.00, label: 'worlds where a director phoned the majors about shown interest' },
  fogPoached:        { lo: 0.30, hi: 1.00, label: 'worlds where a known student signed away before anyone met her' },
  evalHeld:          { lo: 0.80, hi: 1.00, label: 'orgs whose practice room held evaluation days' },
  // the mission (v0.11.13, §104 — measure-first): the bot trains each
  // trainee's two best reads, so a room is drilled whenever it is one of
  // them. Floors only: the room must be drilled somewhere and a moment
  // must be told somewhere, in most careers.
  // the talk and the slot (v0.11.14, §105 — measure-first): the talk is a
  // question wherever it is called; the bot gives the closing slot to a
  // trainee one sheet from the talk.
  talkQuestion:      { lo: 0.60, hi: 1.00, label: 'orgs asked how the after-eval talk gets said' },
  slotGiven:         { lo: 0.30, hi: 1.00, label: 'orgs that gave the showcase’s closing slot to somebody' },
  missionDrilled:    { lo: 0.60, hi: 1.00, label: 'orgs where a trainee drilled a whole month’s room' },
  missionMoment:     { lo: 0.60, hi: 1.00, label: 'orgs where the sheet told one thing from the room' },
  // the year's sheet (v0.11.16, §107) — measure-first: 36/40 and 25/40 on the
  // first soak (47 readings of a possible 80: a new building's first year
  // often has fewer than three trainees who stood half of it)
  yearRead:          { lo: 0.60, hi: 1.00, label: 'orgs whose year was read from the bottom up' },
  yearClimb:         { lo: 0.30, hi: 1.00, label: 'orgs where the year’s climb was named' },
  // the posting (v0.11.17, §108) — measure-first: 40/40 and 11/40 on the first
  // soak (79 lists; the bot's lists left the month's first off 13 times and
  // the year's first never: that door is suite-held)
  listPosted:        { lo: 0.90, hi: 1.00, label: 'orgs whose lineup went up as a letter for the room' },
  offListDoor:       { lo: 0.05, hi: 0.80, label: 'orgs where the one a list left off came to the desk' },
  // the quiet (v0.11.20, §111): each half of a declared hiatus says when it
  // is done. The bot parks a worn act and comes back at twelve weeks if it
  // can, so the rest is nearly always said and the full bank only when the
  // till kept the act parked. Floors by measurement.
  quietRested:       { lo: 0.40, hi: 1.00, label: 'orgs told the rest had done its work (a declared hiatus)' },
  quietFull:         { lo: 0.00, hi: 0.90, label: 'orgs told the wait had banked all it can (guarding a bot that parks forever)' },
  // the head (v0.11.22, §113): the trades' yearly ranking quotes one rival
  // head. Ruled from the first soak: 40 of 40, and 80 quotes in 80 rankings
  headQuoted:        { lo: 0.90, hi: 1.00, label: 'orgs whose yearly ranking quoted a rival head' },
  // the ledger (v0.11.23, §114): something went on the books between this
  // house and one across the street. Ruled from the first soak: 40 of 40, 564 acts
  houseBooks:        { lo: 0.90, hi: 1.00, label: 'orgs with something on the books with a rival house' },
  // the weight (v0.11.24, §115): the books or a head's temper changed which
  // house parked on a date. Ruled from the first soak: 35 of 40, and 90 of
  // 174 parked dates were not the grandest house in reach
  parkMoved:         { lo: 0.40, hi: 1.00, label: 'orgs where the books or a temper changed which house parked on a date' },
  // the letterhead (v0.11.25, §116): a house that called one of our staff
  // had a reason the scene could give. Ruled from the first soak: 39 of 40,
  // and 94 of 111 calls
  callReason:        { lo: 0.40, hi: 1.00, label: 'orgs where a house that called our staff had a reason the scene could give' },
  // the truce (v0.11.26, §117): a head who holds a grudge calls once. The
  // bot shakes on it in half its careers, by seed. Ruled from the census:
  // called in 68 of 200 careers, shaken on in 33, broken in none (the bot
  // never signs a castoff of a house it has a truce with; the suite does)
  truceCalled:       { lo: 0.05, hi: 0.90, label: 'orgs a rival head called with a truce' },
  truceTaken:        { lo: 0.02, hi: 0.60, label: 'orgs that shook on a truce' },
  truceBroken:       { lo: 0.00, hi: 0.30, label: 'orgs that broke a truce by signing one the house had cut' },
  // her own questions (v0.11.27, §119): five of the six kinds of executive
  // ask one when the meeting has nothing else, and a succession can change
  // the kind. The bot steers toward none of them and answers each by a hash
  // of its week. Ruled from the census: asked in 168 of 200 careers, a
  // promise kept in 103, one broken in 133
  ownAsked:          { lo: 0.50, hi: 1.00, label: 'orgs the executive asked a question of her own' },
  ownKept:           { lo: 0.15, hi: 0.90, label: 'orgs that kept a promise made to her own question' },
  ownBroken:         { lo: 0.15, hi: 0.95, label: 'orgs that broke one' },
  // the annual review (v0.11.28, §120): every career that reaches a board
  // week hears one. Ruled from the census: 400 reviews in 200 of 200
  // careers, 5 of them with trust gone, in 5 careers (the suite forces it)
  reviewHeard:       { lo: 0.90, hi: 1.00, label: 'orgs the executive reviewed when the directors had gone' },
  reviewGone:        { lo: 0.00, hi: 0.40, label: 'orgs reviewed with trust gone' },
  fileFirst:         { lo: 0.50, hi: 1.00, label: 'orgs whose file holds a first number one or a first trophy under this desk' },
  // the written record (v0.11.30, §122): what no marker keeps. Ruled from
  // the census: the night of this desk's first trophy in 200 of 200
  // careers, the staff meeting of the red weeks in 42
  recordNight:       { lo: 0.90, hi: 1.00, label: 'orgs whose written record holds the night of this desk’s first trophy' },
  recordRed:         { lo: 0.05, hi: 0.60, label: 'orgs whose written record holds the red weeks' },
  // the year's close (v0.11.32, §124): every career that sees a December
  // closes its year. Ruled from the census: 424 letters, all landed; a
  // headline in 401 of 421 years
  yearClosed:        { lo: 0.90, hi: 1.00, label: 'orgs whose company wrote to itself at the year’s close' },
  yearHeadline:      { lo: 0.70, hi: 1.00, label: 'orgs with a year that had a headline' },
  projectTalkSeen:   { lo: 0.10, hi: 1.00, label: 'orgs where an open project set the practice room talking' },
  traineeQuitAsked:  { lo: 0.00, hi: 0.80, label: 'orgs where a trainee brought the resignation letter' },
  traineeGone:       { lo: 0.00, hi: 0.80, label: 'orgs that lost a trainee on her own terms (quit or broken promise)' },
  agingOutFaced:     { lo: 0.00, hi: 0.60, label: 'orgs where the aging-out clock got loud' },   // ruled v0.11.3 from the measured count
  lastChanceSeen:    { lo: 0.00, hi: 0.60, label: 'orgs where the long-timer finally debuted (the story everyone wants)' },
  // ceiling 0.95→1.00 by ruling (v0.9.15): a fatigue-reading boss
  // declares at least one hiatus in nearly every 140-week career — the
  // band flapped at its own ceiling for three builds. The floor is the
  // alarm (a world where nobody ever rests is the bug).
  hiatusDeclared:    { lo: 0.02, hi: 1.00, label: 'orgs that announced an official hiatus (the disappearance)' },
  // ceiling 0.95→1.00 by ruling (v0.9.17): flapped at its own ceiling —
  // a bot that parks long enough converts nearly every declared return.
  // The floor is the alarm (a return nobody converts is the bug).
  hiatusReturned:    { lo: 0.02, hi: 1.00, label: 'orgs whose declared return converted the wait into numbers' },
  // ceiling 1.00 by design (v0.9.12): anticipation only accrues past the
  // grace window, so every hiatus that earns its bonus pays the cooling
  // toll — cooled-among-declarers ≈ 100% is the bet working, not a flood
  hiatusCooled:      { lo: 0.50, hi: 1.00, label: 'orgs that stayed gone past the grace window (the forgetting)' },   // ruled v0.11.3 from the measured count
  gigWrapped:        { lo: 0.10, hi: 1.00, label: 'orgs where a full gig run wrapped with a sendoff' },
  // floor 0.05→0.02 (v0.10.1): the grind-era calendar is FULLER —
  // sign rounds, flyer weeks, and campaign pushes bench more idols,
  // and a benched idol takes no second job. OST is the rarest pick
  // off the candidate list, so it thins first (measured 1/40 twice
  // across the v0.9.37→v0.10.1 stream changes). The pipe itself is
  // suite-proven (suite_053); this floor now guards only "the OST
  // door still EXISTS in soak worlds."
  ostDropped:        { lo: 0.02, hi: 1.00, label: 'orgs whose idol dropped a drama OST' },
  // ceiling 0.95→1.00 by ruling (v0.9.16): flapped at its own ceiling
  // two builds running — a busy roster ends most second jobs early by
  // DESIGN (the company chooses the group calendar). The floor is the
  // alarm: a world where no gig ever ends early has no calendar at all.
  gigTension:        { lo: 0.02, hi: 1.00, label: 'orgs where a second job ended early (recast or pulled)' },
  // ceiling 0.70→0.85 by ruling (v0.9.12): the hiatus synergy is the
  // design — parked groups run second jobs clash-free, arcs wrap, and
  // wrapped arcs stack into narratives. One second-job story per company
  // per 3-year career is Phase C's thesis working, not wallpaper. If all
  // three keys blur together in human play, split the band per key.
  // ceiling 0.85→0.90 (0.9.13): measured 33-35/40 across adjacent builds
  // — the band sat exactly on its own ceiling and flapped with rng-stream
  // shifts. One seed of headroom; the 0.9.12 ruling on WHY it runs high
  // (parked-group synergy) stands unchanged.
  secondJobStory:    { lo: 0.00, hi: 0.90, label: 'worlds where a second job became a narrative (variety monster / MC / OST voice)' },
  awardWon:          { lo: 0.05, hi: 1.00, label: 'orgs that took a year-end award home' },
  awardSnubbed:      { lo: 0.00, hi: 0.90, label: 'orgs that watched someone else win (the radicalizer)' },
  bubbleSeen:        { lo: 0.50, hi: 1.00, label: 'worlds where bubble screenshots reached the feed' },
  meetingKept:       { lo: 0.05, hi: 1.00, label: 'orgs that kept a Monday-meeting promise on the record' },
  ambitionMet:       { lo: 0.05, hi: 1.00, label: 'worlds where somebody got the thing she always wanted' },
  peopleFelt:        { lo: 0.95, hi: 1.00, label: 'orgs where the people were felt weekly (person-moments most weeks)' },
  soloCredit:        { lo: 0.50, hi: 1.00, label: 'orgs that put a member\'s first solo on a record' },
  doorKnocked:       { lo: 0.60, hi: 1.00, label: 'orgs where an idol knocked on the office door' },
  askPromiseKept:    { lo: 0.05, hi: 1.00, label: 'orgs that kept a promise made across the desk to an idol' },
  momentChoiceSeen:  { lo: 0.10, hi: 1.00, label: 'orgs where a person-moment put the call on the desk' },
  // floor 0 by ruling (competent bot answers every knock — see quietWeek)
  doorLeftWaiting:   { lo: 0.00, hi: 0.60, label: 'orgs that left somebody waiting at the door' },
  annivFelt:         { lo: 0.80, hi: 1.00, label: 'orgs that celebrated a debut anniversary (the calendar knows the date)' },
  boysSigned:        { lo: 0.60, hi: 1.00, label: 'orgs that signed a male trainee (both halls run)' },
  boyGroupFormed:    { lo: 0.02, hi: 0.80, label: 'orgs whose second act was a boy group' },
  staffNamed:        { lo: 0.90, hi: 1.00, label: 'orgs whose groups have a named road manager' },
  boardFaced:        { lo: 0.80, hi: 1.00, label: 'orgs that faced board season' },
  petAssigned:       { lo: 0.10, hi: 1.00, label: 'orgs handed the executive pet project' },
  // floor 0 by ruling: scars require a BOILED storm, and the bot steers
  // every storm before the boil (discourseBoiled runs 0 — same physics)
  scarCarried:       { lo: 0.00, hi: 0.80, label: 'orgs where somebody carried a boiled storm for weeks' },
  unitCredit:        { lo: 0.05, hi: 1.00, label: 'orgs that cut a unit track (full albums open the second slot)' },
  sleeperHeard:      { lo: 0.30, hi: 1.00, label: 'orgs where a b-side outgrew its record (the truthers organize)' },
  // the b-side and the reverse run (v0.11.1, §92) — measure-first
  bsideCharted:      { lo: 0.15, hi: 0.90, label: 'orgs where a b-side charted beside its title (double charting)' },   // ruled v0.11.3 from the measured count
  bsideClimbed:      { lo: 0.15, hi: 0.90, label: 'orgs where a b-side climbed onto the chart mid-era' },   // ruled v0.11.3 from the measured count
  bsideRevived:      { lo: 0.02, hi: 0.80, label: 'orgs whose b-side reverse-charted years later' },   // ruled v0.11.3 from the measured count
  nationalRevived:   { lo: 0.15, hi: 0.95, label: 'orgs whose reverse run crossed onto the national board' },   // ruled v0.11.3 from the measured count
  catalogPushed:     { lo: 0.40, hi: 1.00, label: 'orgs that pushed a song on the shelf (the bot, when flush)' },   // ruled v0.11.3 from the measured count
  pushPaidOut:       { lo: 0.02, hi: 0.60, label: 'orgs whose push paid out in a reverse run' },   // ruled v0.11.3 from the measured count
  // floor 0 by ruling: going quiet needs morale under 38, and the bot
  // rests, mediates, and wins its way out of that hole — a risk
  // mechanic reading zero under a competent bot is working (see
  // fiscalNoticed). The mechanism itself is suite-tested.
  quietWeekCaught:   { lo: 0.00, hi: 1.00, label: 'orgs where the staff flagged somebody going quiet' },
  // v0.9.0 — the clock stamps at debut, every debut. Renewal/departure
  // bands do NOT live here: the window opens at year five (week ~246),
  // beyond this census's horizon — the long-horizon pass below owns them.
  contractStamped:   { lo: 0.90, hi: 1.00, label: 'orgs whose debuted idols all carry a stamped contract' },
  // v0.9.4 — the home circuit + the society (floors provisional on first
  // soak; tighten once the distribution shows itself)
  homeCircuit:       { lo: 0.20, hi: 1.00, label: 'orgs that toured the country (home circuit wrapped)' },
  encoreEarned:      { lo: 0.05, hi: 1.00, label: 'orgs whose city demanded a second night' },
  friendMade:        { lo: 0.30, hi: 1.00, label: 'orgs whose idol made a cross-company friend' },
  coffeeTruck:       { lo: 0.02, hi: 1.00, label: 'orgs that got the coffee truck' },
  seniorStan:        { lo: 0.30, hi: 1.00, label: 'orgs whose rookie a senior publicly stanned' },
  debutClass:        { lo: 0.20, hi: 1.00, label: 'orgs whose debut class the fans lined up at award season' },
  // v0.9.5 — the year (floors provisional on first soak)
  festPlayed:        { lo: 0.50, hi: 1.00, label: 'orgs that played the university festival circuit' },
  gayoStaged:        { lo: 0.20, hi: 1.00, label: 'orgs that closed a year on the gayo stage' },
  // the summit stays rare — same law as natNumberOne
  // ceiling 0.45→0.60 (0.9.24.1): hype concentration (pull² virality)
  // means the CEO's hard directives land on genuinely strong trainees,
  // and better forced castings win more year-end hardware. Measured
  // 23/40 (57.5%) and 38/80 (47.5%) after the retune vs ~35% before —
  // a small true shift with a legible mechanism, ruled to cover the
  // ritual's own 40-seed sample. If a third chase arrives, re-examine
  // the daesang field's giants instead of the ceiling.
  daesangWon:        { lo: 0.00, hi: 0.60, label: 'orgs that took the daesang home' },
  daesangSnubbed:    { lo: 0.00, hi: 0.90, label: 'orgs shortlisted that watched the daesang go elsewhere' },
  // v0.9.6 — the gamble + the constituency (floors provisional; ~35% of
  // orgs run a fusion second group by construction). Ceiling 0.60→0.75
  // (v0.9.33): the holdout taught the bot to walk down the board, so it
  // signs deeper and fields more second groups — 23/40 → 27/40 measured.
  // The claim guarded stays: the mash is a gamble, never the default.
  // Acclaim ceiling 0.60→0.75 (v0.11.9, §100): this row counts orgs that
  // EVER saw the outcome, and an org with a fusion group mashes every
  // comeback, so it meets the outcome sooner or later (26 of the 28 orgs
  // that tried). The row follows `fusionTried` and its ceiling cannot sit
  // under that row's. Series at 40 seeds since v0.11.6: tried 22, 22, 26,
  // 26, 26, 26, 28, 28; acclaim 19, 21, 20, 19, 23, 22, 26, 26. At 120
  // seeds: tried 72 (60%), acclaim 63 (52.5%). Nothing in v0.11.9 touches
  // the mash's roll; the ritual's own forty seeds run high on it.
  fusionTried:       { lo: 0.10, hi: 0.75, label: 'orgs that released a genre mash' },
  fusionShift:       { lo: 0.00, hi: 0.40, label: 'orgs whose mash changed the industry (the textbook entry stays rare)' },
  fusionAcclaim:     { lo: 0.00, hi: 0.75, label: 'orgs with a critics-loved, public-shrugged mash' },
  fusionFlop:        { lo: 0.00, hi: 0.70, label: 'orgs whose mash ate itself' },
  // floor 0 by ruling: trucks need an organized fandom AND a grievance —
  // the competent bot rarely supplies the grievance (same physics as
  // discourseBoiled); the mechanism is suite-proven
  // ceiling 0.80→0.90 (v0.9.33): deeper rosters mean more organized
  // fandoms holding more grievances — 31/40 → 33/40 measured across the
  // stream shift. The ceiling still guards trucks-as-wallpaper.
  // FLIPPED ceiling→floor (v0.9.37): the campaign adds real era
  // workload, so the fandom noticing overwork became the norm across a
  // 140-week run — 39/40 measured with the PACED bot (fatigue-aware,
  // no gigs in promo weeks). One truck per ~2.5 label-years is honest
  // fiction; within-world spam stays bounded by quietWeeks spacing.
  // The alarm worth keeping is trucks VANISHING: constituency broke.
  truckParked:       { lo: 0.30, hi: 1.00, label: 'orgs that found a protest truck outside' },
  fanMeetingHeld:    { lo: 0.30, hi: 1.00, label: 'orgs that held a fan meeting' },
  lightstickOut:     { lo: 0.30, hi: 1.00, label: 'orgs that launched the lightstick' },
  // v0.9.8 — the flagships. The owner's report ("every release straight
  // to #1, never lost a head to head") becomes a censused guarantee:
  // a real share of careers must lose weeks and miss the top slot.
  warLost:           { lo: 0.25, hi: 1.00, label: 'orgs that LOST a head-to-head week (the era is contested)' },
  flagshipHunt:      { lo: 0.30, hi: 1.00, label: 'worlds where a flagship openly hunted the leader' },
  peakDenied:        { lo: 0.25, hi: 1.00, label: 'orgs with a release that missed #1 on the scene chart' },
  // the last statement (v0.11.0, §86) — measure-first: a red week is a
  // week behind on the building; standard play must never DISSOLVE (a
  // hard guard below), but may well run red for a week or two
  redWeekSeen:       { lo: 0.20, hi: 1.00, label: 'orgs that ran a red week (behind on the building)' },   // ruled v0.11.3 from the measured count
  // measured 1/40 at the first soak (soak-12 formed a second lineup on an
  // empty account at week 16 and saw no income for twelve weeks — a fatal
  // decision, not a bug) — the ceiling guards the teeth biting NORMAL play
  dissolvedStd:      { lo: 0.00, hi: 0.05, label: 'orgs that DISSOLVED in standard play (a fatal week, never a flood)' },
};

const missionSum = {};   // the mission (v0.11.13, §104): summed over the census
const yearSum = { years: 0, climbs: 0, rows: 0, sheets: 0, max: 0 };   // the year's sheet (v0.11.16, §107)
const postSum = {};   // the posting (v0.11.17, §108)
const quietSum = {};  // the quiet (v0.11.20, §111)
const wallSum = {};   // the head (v0.11.22, §113)
const upSum = { types: {} };   // her own questions (v0.11.27, §119)
const ownSum = { passes: 0, urgent: 0 };   // this tool's own notes of each pass on one (v0.11.51, §144)
const fileSum = {};            // the company's own file (v0.11.29, §121)
const recSum = {};             // the written record (v0.11.30, §122)
const closeSum = {};           // the year's close (v0.11.32, §124)
const tally = {
  sensation: 0, strongPlus: 0, missOrQuiet: 0, nonCenterBreakout: 0,
  rivalSteals: 0, burnouts: 0, instinctSigning: 0,
  frictionSeen: 0, conflictEndemic: 0,
  multiRelease: 0, chartTopTen: 0, popAlive: 0, secondGroup: 0, fiscalNoticed: 0, fiscalWarned: 0,
  hypeSeen: 0, directiveFired: 0, soloDebuts: 0,
  rivalActDebut: 0, chartAlive: 0, lifecycleSeen: 0, feedAlive: 0, playerTopThree: 0, crowdedRelease: 0,
  idolsRested: 0, overworkSeen: 0, boardLosses: 0, stolenOnStage: 0,
  nationalAlive: 0, natTopTwenty: 0, natTopTen: 0, natNumberOne: 0,
  memoryAlive: 0, idolNarrative: 0,
  discourseSeen: 0, discourseHandled: 0, discourseBoiled: 0,
  warAnnounced: 0, warAmbushed: 0, warBattled: 0, warWon: 0, warRivalry: 0,
  showFirstWin: 0, showRivalWins: 0, showDarling: 0,
  regionLoud: 0, regionStory: 0, conceptCanon: 0,
  toured: 0, tourSoldOut: 0, tourSoft: 0, gaffeSeen: 0,
  fandomNamed: 0, dealSigned: 0, awardWon: 0, awardSnubbed: 0,
  gigBooked: 0, gigWrapped: 0, ostDropped: 0, gigTension: 0, secondJobStory: 0,
  hiatusDeclared: 0, hiatusReturned: 0, hiatusCooled: 0,
  obligationKept: 0, obligationMissed: 0, dealClawedBack: 0, soloRequested: 0, soloAllowed: 0,
  clipResurfaced: 0, catalogRevived: 0, viralSourced: 0,
  clamorBegan: 0, clamorSettled: 0, clamorHeld: 0, soloKnocked: 0,
  slumpSeen: 0, footingFound: 0, arcMinted: 0, rivalCulled: 0, rivalNamedCut: 0,
  mandateGranted: 0, mandateBoard: 0, mandateLapsed: 0,
  walkoutCalled: 0, sceneRivalry: 0, fanWarSeen: 0, inGroupRivalry: 0,
  cannibalSeen: 0, masterMinted: 0, masterTurned: 0,
  festInvited: 0, festHeadlined: 0, festMissed: 0, festMissedWhy: {}, nightPlanned: 0, speechGiven: 0,
  svcPapersSeen: 0, svcEnlisted: 0,
  rfRankings: 0, rfTopSeatMoved: 0, rfClassSeen: 0, rfOfferSeen: 0,
  rfGenTurned: 0, rfTorchSeen: 0, rfRivalService: 0,
  unitEraSeen: 0, doctrineDeniedSeen: 0, auditionRun: 0, intlSigned: 0,
  secretFormed: 0, revealSeen: 0, sagaFired: 0, jvAnswered: 0,
  senesceSeen: 0, trustDrifted: 0, successionSeen: 0,
  holdoutMet: 0, holdoutWon: 0, holdoutLost: 0,
  networkApps: 0, networkRefs: 0, washoutReturned: 0, seasonAired: 0, callHeld: 0,
  seasonCastWorld: 0, seasonInvited: 0, seasonSent: 0, seasonOursLineup: 0, seasonPermanent: 0,
  seasonPushed: 0, seasonCoached: 0, seasonEdited: 0, seasonEpisodes: 0,
  wirePassedChair: 0, wireRedInkSilence: 0, wireMandateMet: 0, wireWarehouseMemo: 0, wireRestockPressed: 0,
  wireRepackageSet: 0, wireLandedCritical: 0, wireEvalCritical: 0, wireEvalHigh: 0, wireGraduatedSolo: 0,
  wireOfferLeveraged: 0, wireFestRegrets: 0, wireDeskCooled: 0, wireTourRecord: 0,
  roadEncoreOffered: 0, roadEncoreHandedBack: 0, roadPresserOffered: 0, roadStatement: 0, roadSwapOffered: 0, roadSwapped: 0,
  roadMoments: 0, roadCeremony: 0, roadCardSeen: 0, festBillPosted: 0, festDeepSet: 0, festCollab: 0, festMoments: 0,
  festHeadlineCeremony: 0, jpAwayMoments: 0,
  eraClosedLetter: 0, eraReissueOffered: 0, eraReissueAnr: 0, eraReissueFans: 0, eraReissueDesk: 0,
  eraRested: 0, eraLapsed: 0, eraSuperseded: 0, eraPreorderRead: 0, eraPreorderAhead: 0, eraPreorderSoft: 0,
  eraExtOffered: 0, eraExtTired: 0, eraClosedExtended: 0,
  byeLap: 0, byeAlumni: 0, byeColdExit: 0,
  acrossSigned: 0, acrossLife: 0,
  careerSigned: 0,
  criticsDarling: 0, pannedHit: 0, criticsSplit: 0, trendNamed: 0,
  commissioned: 0, offLaneRecord: 0, houseChair: 0, themeNamed: 0,
  castoffSeen: 0, reentrySeen: 0, rivalDoorBorn: 0,
  expectSet: 0, snubSeen: 0, verdictSeen: 0, compared: 0,
  gigPlayed: 0, campaignRun: 0, gigViralSeen: 0, wallTouched: 0, breakSeen: 0,
  counterMet: 0, clauseLive: 0,
  chodongMinted: 0, pressSoldOut: 0, pressWarehouse: 0,
  channelSeen: 0, gaffeLottery: 0, storySeen: 0, storyForced: 0,
  clubOpened: 0, greetingsOut: 0, fanconHeld: 0, catalogPaying: 0, atmStorm: 0,
  soloEraRun: 0, soloCutOut: 0, frictionFlows: 0, frictionTeeth: 0,
  stationRun: 0, slipDecided: 0, clipCaught: 0, sheetSet: 0, lineWarSeen: 0,
  stageCarried: 0, stageFumbled: 0, chemistryStaged: 0,
  offerTaken: 0, eraExtended: 0, comebackStaged: 0, secondChair: 0,
  mentorPaired: 0, writingPaired: 0, keptApart: 0, rivalryFramed: 0, mirrorSpoken: 0,
  medCase: 0, medChronic: 0, flareFelt: 0,
  demoLost: 0, campHeld: 0, bondWorking: 0,
  interviewHeld: 0, seatHired: 0, seatCalled: 0, staffVoice: 0, meshFelt: 0,
  searchPosted: 0,
  evalTalked: 0, breakdownRead: 0, nearMissFuel: 0, nudgeRun: 0,
  jpSigned: 0, jpDropped: 0, jpRungUp: 0, jpDomed: 0,
  circuitPlayed: 0, circuitFlopped: 0, enVersioned: 0,
  traineeTabled: 0, traineeWalked: 0, anticipationBanked: 0,
  memberDemoSeen: 0, memberTitleChosen: 0, producerCooled: 0,
  repackaged: 0, mvCinema: 0, mvPlain: 0,
  schoolLead: 0, schoolClass: 0, schoolTrip: 0, schoolPartner: 0, schoolHot: 0,
  schoolOpened: 0, schoolClosed: 0,
  classRevealed: 0, directorCalled: 0, fogPoached: 0,
  contentPosted: 0, contentHit: 0,
  fundPitched: 0, fundFinanced: 0, fundPassed: 0,
  evalHeld: 0, projectTalkSeen: 0, traineeQuitAsked: 0, traineeGone: 0,
  missionDrilled: 0, missionMoment: 0, talkQuestion: 0, slotGiven: 0, yearRead: 0, yearClimb: 0,
  listPosted: 0, offListDoor: 0,
  quietRested: 0, quietFull: 0,
  headQuoted: 0, houseBooks: 0, parkMoved: 0, callReason: 0, truceCalled: 0, truceTaken: 0, truceBroken: 0,
  ownAsked: 0, ownKept: 0, ownBroken: 0, reviewHeard: 0, reviewGone: 0, fileFirst: 0, recordNight: 0, recordRed: 0, yearClosed: 0, yearHeadline: 0,
  agingOutFaced: 0, lastChanceSeen: 0,
  bubbleSeen: 0, meetingKept: 0, ambitionMet: 0,
  peopleFelt: 0, quietWeekCaught: 0,
  soloCredit: 0, unitCredit: 0, sleeperHeard: 0,
  bsideCharted: 0, bsideClimbed: 0, bsideRevived: 0, nationalRevived: 0, catalogPushed: 0, pushPaidOut: 0,
  doorKnocked: 0, askPromiseKept: 0, momentChoiceSeen: 0, doorLeftWaiting: 0,
  annivFelt: 0, scarCarried: 0,
  boysSigned: 0, boyGroupFormed: 0, staffNamed: 0, boardFaced: 0, petAssigned: 0,
  contractStamped: 0,
  homeCircuit: 0, encoreEarned: 0, friendMade: 0, coffeeTruck: 0,
  seniorStan: 0, debutClass: 0,
  festPlayed: 0, gayoStaged: 0, daesangWon: 0, daesangSnubbed: 0,
  fusionTried: 0, fusionShift: 0, fusionAcclaim: 0, fusionFlop: 0,
  truckParked: 0, fanMeetingHeld: 0, lightstickOut: 0,
  warLost: 0, flagshipHunt: 0, peakDenied: 0,
  redWeekSeen: 0, dissolvedStd: 0,
};
let totalGroups = 0;
let totalAmbushes = 0;
const bestRegions = [];
const endBudgets = [];
let totalSaveKB = 0, maxSaveKB = 0, maxSaveSeed = '', maxPeople = 0;
let mediationsRun = 0;
let totalReleases = 0;
let totalRevivals = 0;
// the flare chain's throughput (v0.11.2): cases → seated/pushed/rested → chronics → flares
const medSum = { cases: 0, seated: 0, pushed: 0, rested: 0, chronics: 0, flares: 0 };
const receptions = [];
const growths = [];
const allAges = [];
let violations = [];

function guard(cond, msg) { if (!cond) violations.push(msg); }
// the sound next door (v0.11.51, §144; the owner's ruling, §136: 12). This tool stands either side of the stage door,
// where a promise is judged. Before the door turns it works out, by its own rule, what each open promise on the sound
// of the year is owed: kept in full where the next record is in the year's sound, kept in part where it is next door,
// broken where it is further off or a year has gone with no record. After, it holds the door to that
const SOUND = { judged: 0, inIt: 0, nextDoor: 0, far: 0, noRecord: 0, setAside: 0, by: new WeakMap() };
const nextDoorTo = (a, b) => { const N = KP.C.TREND.NEIGHBOURS; return a !== b && ((N[a] || []).includes(b) || (N[b] || []).includes(a)); };
{
  const ph = KP.weeklyPipeline([]).find(x => x.name === 'stageDoor');
  const fn = ph.fn;
  ph.fn = function (state) {
    const open = (state.claims || []).filter(c => c.type === 'execSound' && !c.resolved).map(c => {
      const rel = KP.groups(state).reduce((all, g) => all.concat((g.releases || []).filter(r => r.week > c.askedWeek)), []).sort((x, y) => x.week - y.week)[0];
      const lane = rel ? KP.trendLane(state, Math.floor((rel.week - 1) / KP.C.WEEKS_PER_YEAR)) : null;
      const owed = c.execName && c.execName !== state.executive.name ? 'void'
        : !rel ? (state.week > c.byWeek ? 'missed' : null)
        : lane === rel.conceptId ? 'met' : nextDoorTo(lane, rel.conceptId) ? 'metPoorly' : 'missed';
      return { c, owed, rel };
    });
    const r = fn.apply(this, arguments);
    const book = SOUND.by.get(state) || { nextDoor: 0 };
    SOUND.by.set(state, book);
    open.forEach(o => {
      const got = o.c.resolved || null, at = state.seed + ' wk ' + state.week + ': ';
      if (got !== o.owed) { violations.push(at + 'a promise on the sound of the year reads “' + got + '”, and by this tool’s own reading of the record it is owed “' + o.owed + '”' + (o.rel ? ' (“' + o.rel.songTitle + '”, ' + o.rel.conceptId + ')' : ' (no record)')); return; }
      if (!got) return;
      SOUND.judged++;
      if (got === 'void') { SOUND.setAside++; return; }
      if (!o.rel) { SOUND.noRecord++; return; }
      const near = /, which is next door\. /.test(o.c.replyText || '');
      if (got === 'metPoorly') { SOUND.nextDoor++; book.nextDoor++; }
      else if (got === 'met') SOUND.inIt++; else SOUND.far++;
      if (near !== (got === 'metPoorly')) violations.push(at + 'a promise on the sound of the year, owed “' + got + '”, is ' + (near ? '' : 'not ') + 'said to be next door: ' + String(o.c.replyText).slice(0, 140));
    });
    return r;
  };
}

// the renewal table policy (v0.9.0), shared by the census bot and the
// long-horizon pass: a decent boss pays real terms when the books allow,
// never signs into the red, and writes endings right when the read says
// gone. Returns the resolved option id (or null when the table was empty).
function botRenewal(state, sc) {
  const p = state.people[sc.personId];
  if (!p) { KP.resolveScene(state, sc.id, 'ok'); return null; }
  const C = KP.C.CONTRACT;
  const read = KP.renewalRead(state, p);
  const cost = C.termsCostBase + read.fame * C.termsCostPerFame;
  const pick = read.band === 'devoted' ? 'sign'
    : read.band === 'professional' ? (state.budget >= cost ? 'terms' : 'standard')
    : read.band === 'strained' ? (state.budget >= cost ? 'terms' : 'hold')
    : 'farewell';
  KP.resolveScene(state, sc.id, pick);
  return pick;
}

// the trial's own careers (v0.11.51, §144): with HARNESS_ONLY set, only the careers it names are played. A trial of
// this tool's books needs the careers that hold the case, and not the census
const ONLY = process.env.HARNESS_ONLY ? process.env.HARNESS_ONLY.split(',').map(Number) : null;
for (let s = 0; s < SEEDS; s++) {
  if (ONLY && !ONLY.includes(s)) continue;
  const seed = 'soak-' + s;
  const state = KP.newGame(seed);
  const scout = KP.DATA.evaluators[2];
  let burnoutSeen = false;

  const startTalent = avgRosterTalent(state);
  // age census measures the scouting pipeline — rival idols run older by design
  Object.values(state.people).forEach(p => {
    // trainees + prospects only (v0.9.10): the census measures the
    // GENERATION pipeline — the legacy veterans are start-content
    if (p.status === 'trainee' || p.status === 'prospect') allAges.push(p.age);
  });
  let sawFriction = false;
  let pressureSeen = false;
  // a pass on her own question (v0.11.51, §144; the owner's ruling, §136: 11): this tool's own note of each one, with
  // the till's ladder as it stood that morning
  const ownBook = { passes: 0, urgent: 0 };
  let pressureWarned = false;
  let hypeSeen = false, directiveSeen = false, soloProposed = false;
  let playerTop3 = false;
  let warAnnounceSeen = false, warAmbushSeen = false, warBattleSeen = false, warWonSeen = false;
  let personMomentWeeks = 0, quietWeekSeen = false;
  let doorKnockSeen = false, momentChoiceWasSeen = false, doorWaitSeen = false;
  let seasonEpisodeSeen = false;
  // the wiring (v0.11.5, §96): the letters that did not exist, seen per org
  const wire = { passedChair: false, redInkSilence: false, mandateMet: false, warehouseMemo: false, restockPressed: false,
    repackageSet: false, landedCritical: false, evalCritical: false, evalHigh: false, graduatedSolo: false };
  // the stages, lived (v0.11.7, §98): the letters seen per org
  const stages = { headline: false, jpAway: false, roadCard: false };
  // the era, closed (v0.11.9, §100): the two new letters, seen pre-trim
  const era = { closeLetter: false, preorderLetter: false, extOffered: false, extTired: false };
  // the long goodbye (v0.11.10, §101): a cold ending's letter, seen pre-trim
  const bye = { cold: false };
  let annivSeen = false, scarSeen = false;
  let tourSoldOutSeen = false, tourSoftSeen = false, awardSnubSeen = false;
  let circuitSeen = false, encoreSeen = false, truckSeen = false,
    stanSeen = false, classSeen = false, congratsSeen = false;
  let festSeen = false, gayoSeen = false, daesangSeen = false, daesangSnubSeen = false;
  let fusionTrySeen = false, fusionShiftSeen = false, fusionAcclaimSeen = false,
    fusionFlopSeen = false, truckSeen2 = false, meetingSeen = false;
  let warLostSeen = false, huntSeen = false;
  let regionStorySeen = false;   // ever-formed, not end-state (v0.9.1):
  // narratives decay and the memory cap evicts — "became a story" is an
  // event, and a richer narrative world (aging feeds the rumor pool)
  // was crowding it out of the week-140 snapshot
  const fatigueTrace = [];   // weekly avg fatigue of debuted idols (v0.4.2)

  for (let w = 0; w < 140; w++) {
    // the last statement (v0.11.0, §86): a dissolved label takes the first
    // open door — the bot is allowed to die, and the world keeps running
    if (KP.chapterPending && KP.chapterPending(state)) {
      const door = KP.chapterDoors(state).find(d => d.open);
      KP.nextChapter(state, door.id, { companyName: 'Soak Again' });
    }
    // the honest moves a competent broke label makes (§86 A): from the
    // staff meeting on, release the weakest free trainee once a month,
    // sell the shelf at the creditors' letters, pitch while the funds will
    // still take the meeting — and sign nobody while behind
    const redNow = KP.redRead ? KP.redRead(state) : { weeks: 0 };
    if (redNow.weeks >= KP.C.RED.meetingAt) {
      if (state.week % 4 === 0) {
        const freeRed = KP.freeTrainees(state).map(id => state.people[id]);
        if (freeRed.length > 1) {
          const worst = freeRed.slice().sort((a, b) =>
            KP.C.TALENTS.reduce((sum, d) => sum + KP.perceived(state, a, d, scout), 0) -
            KP.C.TALENTS.reduce((sum, d) => sum + KP.perceived(state, b, d, scout), 0))[0];
          KP.releaseTrainee(state, worst.id);
        }
      }
      if (redNow.weeks >= KP.C.RED.creditorsAt && KP.shelfPrice && KP.shelfPrice(state).ok) KP.sellShelf(state);
      if (KP.pitchFinancing) KP.pitchFinancing(state);
    }
    // --- auto-player policy (perceived reads only) ---
    // pre-debut: use the tutorial allowance; post-cap: restock the trainee
    // room when it runs thin and the books allow (v0.2.3)
    // a boss holding a greenlight FILLS the room (0.9.20.1): the window
    // is burning, and that is what the money is for
    // a boss holding a greenlight FILLS the room (0.9.20.1) — and fills
    // ONE HALL: a 3-girl/2-boy bench cannot field a one-gender lineup,
    // which is how greenlight windows were quietly burning out
    const openLight = KP.openMandates(state).some(m => m.kind !== 'solo' && !m.virtual);
    const freeNow = KP.freeTrainees(state).map(id => state.people[id]);
    const hallOf = gdr => freeNow.filter(p => (p.gender || 'f') === gdr).length;
    const leadHall = hallOf('m') > hallOf('f') ? 'm' : 'f';
    const hallShort = openLight && Math.max(hallOf('f'), hallOf('m')) < 4;
    const wantSign = redNow.weeks === 0 && (KP.signingsCapped(state)
      ? (state.week <= 3 && state.signingsUsed < state.signingsAllowed)
      : ((freeNow.length < 4 || hallShort) && state.budget > (openLight ? 120 : 150)));
    if (wantSign) {
      // the network (v0.9.35): a thin board is a verb problem now —
      // the bot holds an open call when the name can draw one, and
      // walks the districts when it cannot
      if (state.prospects.length < 4 && state.budget > 160) {
        if (!KP.holdOpenCall(state).ok) KP.streetCast(state);
      }
      const ranked = state.prospects.map(id => state.people[id])
        .filter(p => !hallShort || (p.gender || 'f') === leadHall)
        .map(p => ({ p, v: KP.C.TALENTS.reduce((sum, d) => sum + KP.perceived(state, p, d, scout), 0) }))
        .sort((a, b) => b.v - a.v);
      // the holdout (v0.9.33): a declined offer is an answer, not an
      // error — the bot walks down the board like a real scout would.
      // the table (v0.9.38): a counter gets met when the books allow —
      // a real scout signs the terms, not just the cheap files
      for (const cand of ranked.slice(0, 3)) {
        if (state.budget <= KP.signCost(state, cand.p) + 60) break;
        let r = KP.signProspect(state, cand.p.id);
        if (!r.ok && r.counter &&
            state.budget > KP.signCost(state, cand.p) + (r.counter.price || 0) + 60) {
          r = KP.signProspect(state, cand.p.id, { answer: 'accept' });
        }
        if (r.ok) break;
      }
    }
    // the grind (v0.9.37): the bot runs a simple campaign — one push a
    // week on any locked era, and the first affordable stage off the
    // pile. The human game is in taking the RIGHT ones; the bot just
    // keeps the census honest.
    const restRead = g => {
      const ms = g.members.map(id => state.people[id]).filter(Boolean);
      return ms.length ? ms.reduce((s2, m) => s2 + m.fatigue, 0) / ms.length : 100;
    };
    state.groups.forEach(g => {
      if (!g.prep || g.retiredWeek) return;
      const c = g.prep.campaign;
      // paced, not relentless: a real staff skips the push week when the
      // room is worn — the first soak's always-on bot benched members
      // into a 40/40 protest-truck flood
      if (c && c.lastPush !== state.week && state.budget > 40 && restRead(g) < 55) {
        KP.campaignPush(state, g.id, 'streetTeam');
      }
    });
    if (KP.openBookings && state.budget > 20) {
      const offer = KP.openBookings(state).find(o => o.week > state.week && o.fee >= 0);
      if (offer) {
        const gs = state.groups.filter(g => !g.retiredWeek && !g.hiatus && !g.tour &&
          g.members.length && (g.debuted || g.prep) &&
          state.week > (g.promoUntil || 0) &&        // promo weeks are already full
          restRead(g) < 50);                          // and worn rooms rest
        const pick = gs.find(g => g.prep) || gs[0];
        if (pick) KP.takeBooking(state, offer.id, pick.id);
      }
    }
    // the world auditions (v0.9.29): a flush boss funds a circuit —
    // once a career is rolling, the board should carry the world
    if (state.week >= 60 && state.budget > KP.C.TONGUE.AUDITION.cost + 250 &&
        (state.week % 48) === 20) {
      const regions = KP.C.REGIONS;
      KP.fundAudition(state, regions[state.week % regions.length].id);
    }
    // the between gets fed (v0.9.26): a unit era when the group calendar
    // is quiet and the till can carry it — the portfolio breathing
    state.groups.forEach(g => {
      if (!g.debuted || g.retiredWeek || g.type === 'solo' || g.members.length < 4) return;
      if (g.prep || g.tour || g.hiatus || state.week <= (g.promoUntil || 0)) return;
      if (state.week - (g.lastUnitWeek || -999) < KP.C.PORTFOLIO.UNIT.cooldown) return;
      if (state.budget < KP.C.PORTFOLIO.UNIT.cost + 150) return;
      const picks = g.members.map(id => state.people[id]).filter(Boolean)
        .filter(m => !KP.onBreak(m))
        .sort((a, b) => KP.derived(b).stagePresence - KP.derived(a).stagePresence)
        .slice(0, 2).map(m => m.id);
      if (picks.length === 2) KP.planUnitEra(state, g.id, picks, null);
    });
    // the solo era (v0.10.24, §87): when the group calendar is quiet and
    // one member is clearly pulling away, the bot opens her single in
    // the rest window — the era resolves before the calendar reopens,
    // so comeback cadence is untouched
    if (KP.planSoloEra) state.groups.forEach(g => {
      if (!g.debuted || g.retiredWeek || g.type === 'solo' || g.members.length < 3) return;
      if (g.prep || g.tour || g.hiatus || g.jpAway) return;
      if (state.week > (g.promoUntil || 0) + 1) return;   // just-released window only
      if (state.budget < 200) return;
      const G2 = KP.C.GRAVITY;
      const star = g.members.map(id => state.people[id]).filter(Boolean)
        .filter(m => !KP.onBreak(m) && !m.soloEra && !m.flags.military)
        .sort((a, b) => KP.transcendRead(state, g, b) - KP.transcendRead(state, g, a))[0];
      if (!star) return;
      if (KP.transcendRead(state, g, star) < G2.transcendAt * 0.6) return;   // 'first among equals'
      KP.planSoloEra(state, star.id, { format: 'single' });
    });
    // the recurring money (v0.10.3): a fancon when the calendar is quiet,
    // the fandom is organized, and the room is rested — the between-eras
    // verb a real label leans on
    if (KP.holdFancon) state.groups.forEach(g => {
      if (!g.debuted || g.retiredWeek || g.prep || g.tour || g.hiatus) return;
      if (state.week <= (g.promoUntil || 0)) return;
      if (!g.fandom || (g.fandom.intensity || 0) < KP.C.MERCH.fanconMinIntensity) return;
      if (state.week < (g.fanEventQuietUntil || 0)) return;
      if (state.budget < KP.C.MERCH.fanconCost + 80 || restRead(g) >= 50) return;
      KP.holdFancon(state, g.id);
    });
    // the second life (v0.11.1, §92 E): a flush label between eras pushes
    // its best ticket — the party by default, the clip after a stage
    if (KP.pushCatalog) state.groups.forEach(g => {
      if (!g.debuted || g.retiredWeek || g.prep || g.tour || g.hiatus) return;
      if (state.week <= (g.promoUntil || 0)) return;
      if (state.budget < 300 || state.week % 20 !== 0) return;   // a quarterly campaign, not a weekly habit (every 9 weeks at the first soak paid out 30/40 and flooded the lottery)
      const read = KP.catalogPushRead(state, g);
      if (!read.ok || !read.candidates.length) return;
      const kind = read.kinds.find(k => k.id === 'liveClip' && k.ok) ? 'liveClip' : 'party';
      KP.pushCatalog(state, g.id, read.candidates[0].title, kind);
    });
    // the season, televised (v0.11.4, §95): the bot pushes when its kid sits
    // near the line and the account can pay; sends the coach once from the top
    if (KP.seasonOurs && state.season && state.season.status === 'airing') {
      KP.seasonOurs(state).filter(c => !c.eliminatedWeek).forEach(c => {
        const rk = c.ranks && c.ranks.length ? c.ranks[c.ranks.length - 1] : null;
        const line = KP.seasonLine(state);
        if (rk != null && line != null && rk >= line - 2 && state.budget >= 300 && KP.seasonPushRead(state, c.personId).ok) KP.seasonPush(state, c.personId);
        else if (rk != null && rk <= 3 && !c.coachWeek && state.budget >= 200 && KP.seasonCoachRead(state, c.personId).ok) KP.seasonCoach(state, c.personId);
      });
    }
    // the Japan cycle (v0.10.8): an idle warm group flies out — the
    // bot runs the version lane (cheap) unless the room is devoted
    if (KP.planJapanRelease && state.jpPartner) state.groups.forEach(g => {
      if (!g.debuted || g.retiredWeek || g.prep || g.tour || g.hiatus || g.jpAway) return;
      if (state.week <= (g.promoUntil || 0)) return;
      if ((KP.regionsOf(g).jp || 0) < KP.C.JAPAN.minWarmth) return;
      if (state.week - (g.lastJpWeek || -999) < KP.C.JAPAN.cooldown) return;
      const lane = (KP.regionsOf(g).jp || 0) >= 55 ? 'original' : 'version';
      if (state.budget < KP.C.JAPAN.LANES[lane].cost + 150 || restRead(g) >= 50) return;
      KP.planJapanRelease(state, g.id, lane);
    });
    // the world circuit (v0.10.9): a hit between eras earns its re-cut
    if (KP.cutEnglishVersion) state.groups.forEach(g => {
      if (!g.debuted || g.retiredWeek || g.prep || g.tour || g.hiatus || g.jpAway) return;
      if (state.week <= (g.promoUntil || 0)) return;
      const last = (g.releases || [])[g.releases ? g.releases.length - 1 : 0];
      if (!last || (last.reception || 0) < KP.C.CIRCUIT.EN.minRec) return;
      if (state.week - (g.lastEnWeek || -999) < KP.C.CIRCUIT.EN.cooldown) return;
      if (state.budget < KP.C.CIRCUIT.EN.cost + 120) return;
      KP.cutEnglishVersion(state, g.id);
    });
    // the rituals (v0.10.7): a promo week gets its one mobilization
    if (KP.pointNudge) state.groups.forEach(g => {
      if (!g.debuted || g.prep || state.week > (g.promoUntil || 0)) return;
      if (g.pointNudge && state.week - g.pointNudge.week <= 1) return;
      if (state.budget < KP.C.POINTS.nudgeCost + 60) return;
      KP.pointNudge(state, g.id, KP.fandomIntensity(g) >= 40 ? 'votes' : 'streams');
    });
    // the song market (v0.10.5): a flush boss camps when the cold sheet
    // has no hook worth the pitch meeting's time
    if (KP.holdSongCamp) state.groups.forEach(g => {
      if (!g.debuted || g.retiredWeek || g.prep || g.tour || g.hiatus) return;
      if (state.week <= (g.promoUntil || 0)) return;
      if (!g.demos || !g.demos.length) return;
      if (Math.max.apply(null, g.demos.map(d => d.hook)) >= 60) return;
      if (state.budget < KP.C.MARKET.campCost + 150) return;
      KP.holdSongCamp(state, g.id);
    });
    // the studio (v0.10.35): a flush boss briefs a record for an open
    // calendar — the brief's lane, a theme natural to it, the house chair
    // or the best-fitting name that takes the call, the house writer or a
    // writer who owns the theme
    if (KP.commissionRecord) state.groups.forEach(g => {
      if (g.retiredWeek || g.prep || g.tour || g.hiatus || g.commission || !g.members.length) return;
      if (g.debuted && state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) return;
      if (state.budget < 600) return;   // the ground game and the shows come first (soak: the darling band starved at 200 and 450)
      // a player briefs a record when the pitched sheet is weak, or now and
      // then on principle — not every cycle (the first soaks did, and the
      // fees ate the show bookings)
      const bestHook = (g.demos || []).reduce((m, d) => Math.max(m, d.hook || 0), 0);
      const onPrinciple = ((g.releases || []).length % 3) === 1;
      if (g.demos && g.demos.length && bestHook >= 62 && !onPrinciple) return;
      const lastRel = (g.releases || [])[(g.releases || []).length - 1];
      const lane = g.concept || (lastRel && lastRel.conceptId) || 'bright';
      const roomNow = g.members.map(id => state.people[id]).filter(Boolean);
      const themesAll = KP.themesForLane(lane);
      const themes = themesAll.filter(th => !KP.themeRoomMiss(state, roomNow, th));   // a player reads the warning on the sheet
      const pickFrom = themes.length ? themes : themesAll;
      const theme = pickFrom.length ? pickFrom[Math.floor(KP.hash01([seed, g.id, 'botTheme', (g.releases || []).length].join('|')) * pickFrom.length)].id : 'longing';
      const heatRank = { 'in demand': 4, reliable: 3, workmanlike: 2, unproven: 1, 'cold streak': 0 };
      // the second chair (v0.10.39): a player uses the free, bonded house
      // chair whenever it is at least next door to the brief — fit first
      // among the rest, then heat
      const houseFirst = pr => (pr.house && KP.laneFitMult(KP.producerLanes(pr), lane) >= KP.C.STUDIO.fit.neighbour) ? 1 : 0;
      const prs = KP.houseProducers(state).concat(KP.producersOf(state))
        .filter(pr => KP.producerAccess(state, g, pr).ok)
        .sort((a, b) => (houseFirst(b) - houseFirst(a)) ||
          (KP.laneFitMult(KP.producerLanes(b), lane) - KP.laneFitMult(KP.producerLanes(a), lane)) ||
          ((heatRank[KP.producerHeat(b)] || 0) - (heatRank[KP.producerHeat(a)] || 0)));
      const pr = prs[0];
      if (!pr) return;
      const ws = KP.houseWriters(state).concat(KP.writersOf(state));
      const w = ws.find(x => x.themes.includes(theme)) || ws[0];
      const fee = KP.producerFee(pr) + KP.writerFee(w);
      if (state.budget < fee + 600) return;
      KP.commissionRecord(state, g.id, { lane, theme, producerId: pr.id, writerId: w.id });
    });
    // the album promise gets kept (v0.9.25): produce her record when
    // the claim is open and the till can carry it
    (state.claims || []).forEach(c => {
      if (c.resolved || c.type !== 'soloPromise' || (c.rung || 1) < 2) return;
      if (state.budget > KP.C.STAR.albumCost + 120) KP.releaseSoloAlbum(state, c.personId);
    });
    // the open market (v0.9.24): a flush boss buys a career when one
    // is on it — the signing-class verb gets exercised
    (state.prospects || []).map(id => state.people[id]).filter(p => p && p.channel === 'freeAgent').slice(0, 1).forEach(p => {
      if (state.budget > KP.signCost(state, p) + 150) KP.signProspect(state, p.id, { answer: 'accept' });   // the one market (v0.10.33)
    });
    // weekly training: two best perceived domains, rest when tired
    state.roster.forEach(id => {
      const p = state.people[id];
      const best = KP.C.TALENTS.map(d => ({ d, v: KP.perceived(state, p, d, scout) }))
        .sort((a, b) => b.v - a.v).slice(0, 2).map(x => x.d);
      const intensity = p.fatigue > 70 ? 'rest' : p.fatigue > 55 ? 'light' : 'standard';
      KP.setTraining(state, id, best, intensity);
    });
    // conflict management: the auto-player uses the same sit-down tool
    const frictions = KP.frictionPairs(state, state.roster);
    if (frictions.length) sawFriction = true;
    const worst = frictions.find(f => f.state === 'conflict') || frictions[0];
    if (worst && state.budget > 60 && KP.mediationCooldown(state, worst.a.id, worst.b.id) === 0) {
      const m = KP.mediatePair(state, worst.a.id, worst.b.id);
      if (m.ok) mediationsRun++;
    }
    // the pair (v0.10.40, §88 D): a boss who reads the room pairs a mentor
    // when a rookie struggles, seats a feud apart when the sit-down is
    // cooling, pairs two pens, and frames a rivalry while morale holds
    if (KP.mentorshipRead && state.budget > 60) {
      state.groups.forEach(g => {
        if (g.retiredWeek) return;
        const mr = KP.mentorshipRead(state, g.id);
        if (mr.ok) KP.assignMentor(state, g.id, mr.mentor.id, mr.mentee.id);
        const wr = KP.writingPairRead(state, g.id);
        if (wr.ok) KP.pairWriters(state, g.id, wr.a.id, wr.b.id);
        const feud = KP.frictionPairs(state, g.members).find(f => f.state === 'conflict' && KP.mediationCooldown(state, f.a.id, f.b.id) > 0);
        if (feud && !(g.seating && KP.seatingLeft(state, g) > 0)) KP.seatApart(state, g.id, feud.a.id, feud.b.id);
        KP.rivalryPairs(state, g).forEach(({ a, b, rel }) => {
          const hold = a.morale >= 65 && b.morale >= 65;
          if (hold && !rel.rivalry.sharpened) KP.rivalryStance(state, g.id, a.id, b.id, 'sharpen');
          else if (!hold && rel.rivalry.sharpened) KP.rivalryStance(state, g.id, a.id, b.id, 'defuse');
        });
      });
    }
    // the hard directive: if the CEO demands a hyped trainee debut and no
    // lineup is coming, solo her (v0.2.6)
    if (state.hypeDirective && state.hypeDirective.status === 'open') {
      const pid = state.hypeDirective.personId;
      const person = state.people[pid];
      if (person && person.status === 'trainee' && !KP.groupOf(state, pid) && !KP.devGroup(state)) {
        let actName = KP.displayName(person);
        if (KP.groups(state).some(gg => gg.name.toLowerCase() === actName.toLowerCase())) actName += ' SOLO';
        const solo = KP.proposeGroup(state, actName, [pid], {});
        if (solo.ok) soloProposed = true;
      }
    }
    // the regional desk (v0.9.16): a boss who reads the map takes the
    // train — trip the best unvisited school when the books are healthy,
    // and sign one first-look partnership once established. Red quarters
    // ground the train the same way they ground the road (0.9.13 rule):
    // scouting trips are discretionary spending.
    const fiscalCalm = !((state.fiscal || {}).pressure > 0);
    if (state.schools && fiscalCalm && state.budget > 200 && state.week % 16 === 5) {
      const target = state.schools.slice().sort((a, b) => b.rep - a.rep)
        .find(sc2 => !sc2.visitedWeek || state.week - sc2.visitedWeek >= KP.C.SCHOOLS.tripCooldownWeeks);
      if (target) KP.scoutingTrip(state, target.id);
    }
    if (state.schools && fiscalCalm && state.budget > 250 && state.week > 30 &&
        !state.schools.some(sc2 => sc2.partnerUntil > state.week)) {
      const best = state.schools.slice().sort((a, b) => b.rep - a.rep)[0];
      KP.schoolPartnership(state, best.id);
    }
    // the content desk (v0.10.18): the bot films what is happening —
    // cheapest of survival habits, every other week when solvent
    if (KP.contentTopics && fiscalCalm && state.budget > 40 && state.week % 2 === 0) {
      const open = KP.contentTopics(state).find(tp => tp.open && state.budget > tp.cost + 30);
      if (open) KP.postContent(state, open.id);
    }
    // the runway (v0.10.19, §85): the bot pitches when money is tight —
    // and when a sheet lands, it takes the revenue share (the survivable
    // poison). Threshold raised at v0.10.22: the tour rebalance made the
    // whole economy leaner, and a real label raises MORE when poorer.
    if (KP.pitchFinancing && state.week > 30 && state.budget < 100 &&
        !KP.financingBusy(state)) {
      KP.pitchFinancing(state);
    }
    const sheet = (state.scenes || []).find(sc2 => sc2.kind === 'termSheet');
    if (sheet) KP.resolveScene(state, sheet.id, 'revshare');
    // form the first group around week 20; a second lineup once the first
    // has debuted and the trainee room can field one (v0.2.2)
    // v0.9.10: the legacy group is start-content — the bot's OWN groups
    // are the non-legacy ones, and the forming logic counts only those
    const own = state.groups.filter(x => !x.legacy);
    // a boss who knows a second lineup is coming opens the PROJECT first
    // (v0.9.16) — which is exactly what sets the practice room talking
    if (own.length === 1 && own[0].debuted && !state.project &&
        state.week >= 64 && state.week < 70 && KP.freeTrainees(state).length >= 4) {
      const top2 = KP.freeTrainees(state).map(id => state.people[id])
        .map(p => ({ p, v: KP.C.TALENTS.reduce((sum, d) => sum + KP.perceived(state, p, d, scout), 0) }))
        .sort((a, b) => b.v - a.v).slice(0, 2).map(x => x.p.id);
      if (top2.length === 2) KP.openProject(state, top2, ['vocals', 'dance']);
    }
    // the mandate (v0.9.19): the boss asks upstairs before assembling —
    // pitch from week 60, retry as the boardroom calendar reopens; the
    // room-pressure greenlight covers orgs whose pitches keep dying
    // pitch only when formation can FOLLOW (0.9.20.1): asking at week
    // 60 with a bench age-out could eat left windows dying dark — the
    // boss walks upstairs when the room AND the books are ready
    if (own.length === 1 && own[0].debuted && state.week >= 66 &&
        KP.freeTrainees(state).length >= 4 && state.budget > 160 &&
        !KP.openMandates(state).some(m => m.kind !== 'solo')) {
      KP.pitchMandate(state, { kind: 'group', gender: null });
    }
    const wantSecond = own.length === 1 && own[0].debuted &&
      state.week >= 70 && KP.freeTrainees(state).length >= 4 && state.budget > 120;
    if ((!own.length && state.week >= 20 && KP.freeTrainees(state).length >= 5) || wantSecond) {
      const size = own.length ? 4 : 5;
      // one group, one gender (v0.8.4): the bot fields the strongest
      // SAME-GENDER lineup — its second act is a boy group when the
      // boys outrank the remaining girls
      const ranked = KP.freeTrainees(state).map(id => state.people[id])
        .map(p => ({ p, v: KP.C.TALENTS.reduce((sum, d) => sum + KP.perceived(state, p, d, scout), 0) }));
      const byGender = gdr => ranked.filter(x => (x.p.gender || 'f') === gdr)
        .sort((a, b) => b.v - a.v).slice(0, size);
      const fPool = byGender('f'), mPool = byGender('m');
      const sum = pool2 => pool2.reduce((s2, x) => s2 + x.v, 0);
      // the founding directive demands a girl group (v0.9.19): the
      // first act obeys the mandate on the desk, not the depth chart
      const foundingOpen = state.objective &&
        state.objective.type === 'debutGirlGroup' && state.objective.status === 'open';
      const pool = ((!foundingOpen || own.length) &&
        mPool.length >= 4 && (fPool.length < 4 || sum(mPool) > sum(fPool)) ? mPool : fPool)
        .map(x => x.p);
      if (pool.length >= 4) {
        const hints = KP.roleHints(state, pool);
        const name = KP.suggestGroupNames(state, KP.rngFor(state))[0] + (state.groups.length ? ' II' : '');
        const formed = KP.proposeGroup(state, name, pool.map(m => m.id), hints);
        // the gamble seeds (v0.9.6): about a third of orgs run their
        // second group under the genre-bending brief — the soak must
        // exercise the whole fusion outcome table
        if (formed && formed.ok && state.groups.length > 1 &&
            KP.hash01(seed + '|fusionOrg') < 0.35) {
          KP.setGroupConcept(state, state.groups[state.groups.length - 1].id, 'fusion');
        }
      }
    }
    // the war desk (v0.6.4): an ambushed date gets a decision, same menu
    // the human gets — square up when the room can win, dodge when it
    // cannot and the books allow
    state.groups.forEach(g => {
      if (!g.prep || !g.prep.clash || g.prep.clash.resolved) return;
      const hit = KP.rivalActById(state, g.prep.clash.actId);
      const theirPop = hit ? (hit.act.popularity || 0) : 50;
      const fight = (g.popularity || 0) + 10 >= theirPop;
      if (!fight && state.budget > KP.C.WAR.slipCost + 20) KP.respondClash(state, g.id, 'slip');
      else KP.respondClash(state, g.id, 'hold');
    });

    // the PR desk: respond to hot negative storms, ride positive waves —
    // the same constrained menu the human gets (v0.6.2)
    KP.liveDiscourses(state).forEach(d => {
      if (d.responded) return;
      const actions = KP.C.DISCOURSE.KINDS[d.kind].actions;
      if (!d.negative) {
        KP.respondDiscourse(state, d.id, actions.includes('meme') ? 'meme' : actions[0]);
      } else if (d.heat >= 50) {
        KP.respondDiscourse(state, d.id, actions.includes('statement') ? 'statement' : actions[0]);
      }
    });

    // the fandom era (v0.7.0): name the fandom when the cafés ask, sign
    // the brand offers — a player would
    state.groups.forEach(g => {
      if (KP.fandomEligible(state, g)) KP.nameFandom(state, g.id, 0);
    });
    KP.openOutsideOffers(state, 'brand').forEach(o => KP.respondOutside(state, o.id, true));

    // the second job (v0.9.11): a sensible boss books the gig when the
    // idol has room — and pulls her out once the misses start stacking
    // against a long remaining run (the controlled exit beats the recast)
    KP.openOutsideOffers(state, 'show').forEach(o => {
      const p = state.people[o.personId];
      const g = p && KP.groupOf(state, p.id);
      const busy = g && (g.prep || g.tour);
      KP.respondOutside(state, o.id, !!(p && !busy && p.fatigue < 55));
    });
    KP.activeGigs(state).forEach(gig => {
      if ((gig.strain || 0) >= KP.C.GIGS.strainRecastAt - 1 && gig.weeksLeft > 4) {
        KP.quitOutside(state, gig.id);
      }
    });

    // the disappearance (v0.9.12): a boss who reads the fatigue sheet
    // parks a worn group ON PURPOSE — announced rest beats idle waiting
    state.groups.forEach(g => {
      if (!g.debuted || g.prep || g.tour || g.hiatus) return;
      if (state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) return;
      // a booked festival plays before anyone disappears (0.9.22)
      if ((g.festivalBookings || []).some(b => b.week >= state.week)) return;
      const avgF = g.members.reduce((s, id) => s + state.people[id].fatigue, 0) / g.members.length;
      if (avgF >= 55) KP.declareHiatus(state, g.id);
    });

    // the Monday meeting (v0.7.1): the bot answers with its best read —
    // and promises comebacks like someone who knows their own calendar
    // the scenes desk (v0.8.2): the bot answers every held scene the way
    // a decent boss would — exec reads its own calendar, idol asks get
    // promised only when the bot's own play can plausibly deliver
    (state.scenes || []).slice().forEach(sc => {
      if (sc.kind === 'sponsorSolo') {
        // a sensible boss lets the stage happen unless the face is worn
        const face = state.people[sc.personId];
        KP.resolveScene(state, sc.id, face && face.fatigue < 65 ? 'allow' : 'decline');
        return;
      }
      if (sc.kind === 'execQuestion') {
        const q = sc.q;
        if (q.type === 'comebackPromise') {
          const g = KP.groupById(state, q.groupId);
          const reopens = g ? Math.max((g.promoUntil || 0) + KP.C.COMEBACK.restWeeks, g.tourRestUntil || 0) : state.week;
          const canThisQuarter = reopens + 6 <= state.week + KP.C.MEETING.quarterWeeks;
          KP.answerMeeting(state, canThisQuarter ? 0 : 1);
        } else if (KP.upstairsLedger(state).types[q.type]) {
          // her own questions (v0.11.27, §119): this bot steers toward none of
          // them, so it answers each by a hash of the week it was asked, and
          // both answers are measured (the other tools' bots always promise)
          const pick = KP.hash01([state.seed, 'botOwn', q.week].join('|')) < 0.5 ? 0 : 1;
          // a pass costs nothing, by this tool's own rule, but the quarter's while the red weeks are running
          const behind = !!(state.red && state.red.weeks > 0), was = state.trust, stale = KP.execOwnOvertaken(state, q);
          KP.answerMeeting(state, pick);
          if (pick === 1 && !stale) {
            const due = q.type === 'execQuarter' && behind ? 1 : 0;
            ownBook.passes++; ownBook.urgent += due;
            guard(was - state.trust === Math.min(due, was), seed + ' wk ' + state.week + ': a pass on her own question cost ' + (was - state.trust) + ', and by this tool’s own rule it costs ' + due +
              ' (' + q.type + ', ' + (behind ? 'the red weeks running' : 'no red week running') + ')');
          }
        } else {
          KP.answerMeeting(state, 0);
        }
        return;
      }
      if (sc.kind === 'idolAsk') {
        const p = state.people[sc.personId];
        const amb = p ? KP.ambitionOf(state, p) : 'trophy';
        // solos come from the bot's own credit slots; trophies from its
        // show wins — promise those, be honest about the rest
        KP.resolveScene(state, sc.id, (amb === 'solo' || amb === 'trophy') ? 'promise' : 'honest');
        return;
      }
      if (sc.kind === 'renewal') {
        // the renewal table (v0.9.0): pay real terms when the books allow,
        // never sign into the red, and write endings right when the read
        // says gone (dormant in the 140-week census — the window opens at
        // year five — but live in the long-horizon pass below)
        botRenewal(state, sc);
        return;
      }
      if (sc.kind === 'soloKnock') {
        // the gravity (v0.9.18): a sensible boss promises the solo — the
        // bot's own credit assignment then keeps it or breaks it, which
        // is the mechanism under test. At the career rung (v0.9.25)
        // there is no promise on the menu: launch her, same house.
        const opts = KP.sceneDef('soloKnock').options(state, sc);
        KP.resolveScene(state, sc.id, opts.some(o => o.id === 'promise') ? 'promise' : 'open');
        return;
      }
      if (sc.kind === 'returnRun') {
        // the event of the year does not get skipped by a sensible boss
        KP.resolveScene(state, sc.id, 'invite');
        return;
      }
      if (sc.kind === 'quietEra') {
        const p = state.people[sc.personId];
        KP.resolveScene(state, sc.id, p && p.fatigue > 50 ? 'shield' : 'push');
        return;
      }
      if (sc.kind === 'seasonInvite') {
        // the season (v0.10.32): a house with a bench sends two; a thin room one
        const opts = KP.sceneDef('seasonInvite').options(state, sc);
        const free = KP.seasonEligible(state).length;
        const pick = free >= 3 && opts.some(o => o.id === 'two') ? 'two' : free >= 2 && opts.some(o => o.id === 'one') ? 'one' : 'none';
        KP.resolveScene(state, sc.id, pick);
        return;
      }
      if (sc.kind === 'festivalInvite') {
        // take the stage unless the room is running on fumes; the stages,
        // lived (v0.11.7, §98): the collab when a friend is on the bill,
        // the deep cut when the fandom is loud — else the hits, as before
        const g2 = KP.groupById(state, sc.groupId);
        const avgF = g2 ? g2.members.reduce((s2, id) => s2 + (state.people[id] ? state.people[id].fatigue : 0), 0) /
          (g2.members.length || 1) : 100;
        const fOpts = KP.sceneDef('festivalInvite').options(state, sc).map(o => o.id);
        const loud = !!(g2 && g2.fandom && (g2.fandom.intensity || 0) >= 50);
        // a yes the act cannot land is refused at the signing (v0.11.8): the
        // bot reads the calendar first and sends regrets instead of lapsing
        const clash = !!(g2 && KP.festivalHardClash && KP.festivalHardClash(state, g2, KP.festivalSlotWeek(state, sc.festivalId)));
        const fPick = (clash || !(avgF < 62 && state.budget > 40)) ? 'decline'
          : fOpts.includes('collab') ? 'collab'
          : (loud && fOpts.includes('deep')) ? 'deep' : 'accept';
        KP.resolveScene(state, sc.id, fPick);
        return;
      }
      // the road's doors (v0.11.7, §98): a cautious hand — hand the second
      // night back when the room is worn, a statement when flush, the pick
      // when the fandom is loud; otherwise the house default
      if (sc.kind === 'encoreNight') {
        const g2 = KP.groupById(state, sc.groupId);
        const avgF = g2 ? g2.members.reduce((s2, id) => s2 + (state.people[id] ? state.people[id].fatigue : 0), 0) /
          (g2.members.length || 1) : 0;
        KP.resolveScene(state, sc.id, avgF >= 75 ? 'handBack' : 'play');
        return;
      }
      if (sc.kind === 'roadPresser') {
        const pOpts = KP.sceneDef('roadPresser').options(state, sc).map(o => o.id);
        KP.resolveScene(state, sc.id, state.budget >= 300 && pOpts.includes('statement') ? 'statement' : 'ride');
        return;
      }
      if (sc.kind === 'setlistSwap') {
        const g2 = KP.groupById(state, sc.groupId);
        KP.resolveScene(state, sc.id, g2 && g2.fandom && (g2.fandom.intensity || 0) >= 50 ? 'swap' : 'keep');
        return;
      }
      if (sc.kind === 'awardNight') {
        // the bot sends the public's pick when there is one — the clip travels
        const opts = KP.sceneDef('awardNight').options(state, sc);
        KP.resolveScene(state, sc.id, (opts.find(o => o.id === 'breakout') || opts[0]).id);
        return;
      }
      if (sc.kind === 'theReveal') {
        // a decent boss tells the truth when the room can carry it —
        // the warm confirm when the fandom is devoted, the privacy
        // statement otherwise. The bot never denies; denial is the
        // trap the mechanism prices, not the policy a decent desk runs.
        const p = state.people[sc.personId];
        const g = p && KP.groupOf(state, p.id);
        const devoted = g && g.fandom && g.fandom.intensity >= 55;
        KP.resolveScene(state, sc.id, devoted ? 'confirm' : 'statement');
        return;
      }
      if (sc.kind === 'theTruce') {
        // half the careers shake on it, by seed, so both answers are measured
        // (v0.11.26, §117); the other half give the polite no
        KP.resolveScene(state, sc.id, KP.hash01([state.seed, 'botTruce'].join('|')) < 0.5 ? 'take' : 'decline');
        return;
      }
      if (sc.kind === 'theOffer') {
        // a thin till leverages; a comfortable one declines with style
        KP.resolveScene(state, sc.id, state.budget < 200 ? 'leverage' : 'decline');
        return;
      }
      if (sc.kind === 'newChair') {
        // a boss with a record walks it; a thin one bets on the year
        KP.resolveScene(state, sc.id,
          KP.groups(state).some(g => g.debuted) ? 'receipts' : 'slate');
        return;
      }
      if (sc.kind === 'globalJV') {
        // a proven operator co-builds; an unproven one keeps the wheel —
        // both answers change the world, which is the saga's point
        KP.resolveScene(state, sc.id, (state.trust || 0) >= 50 ? 'sign' : 'decline');
        return;
      }
      if (sc.kind === 'servicePlan') {
        // the industry's read: a warm room staggers to keep the era
        // machine running; a cool one closes the chapter cleanly
        const g2 = KP.groupById(state, sc.groupId);
        KP.resolveScene(state, sc.id, g2 && (g2.popularity || 0) >= 45 ? 'stagger' : 'together');
        return;
      }
      if (sc.kind === 'enlistPapers') {
        // send him in a quiet stretch; hold if an era is running
        const p2 = state.people[sc.personId];
        const g2 = p2 ? KP.groupOf(state, p2.id) : null;
        const busy = g2 && (g2.prep || g2.tour || state.week <= (g2.promoUntil || 0));
        KP.resolveScene(state, sc.id, busy ? 'wall' : 'now');
        return;
      }
      if (sc.kind === 'walkOut') {
        // hear her out when the books allow; fold before holding — a
        // boss who reads renewal ledgers knows what heldToPaper costs
        const p = state.people[sc.personId];
        const cost = p ? KP.C.MEMBER_DESK.WALKOUT.negotiateBase +
          KP.renewalRead(state, p).fame * KP.C.MEMBER_DESK.WALKOUT.negotiatePerFame : 0;
        KP.resolveScene(state, sc.id, state.budget >= cost + 60 ? 'negotiate' : 'release');
        return;
      }
      if (sc.kind === 'traineeRenewal') {
        // renew the believers; let the term run out past the age wall
        const p = state.people[sc.personId];
        const keep = p && p.age < KP.C.PRACTICE.agingAge && p.morale >= 25;
        KP.resolveScene(state, sc.id, keep ? 'renew' : 'farewell');
        return;
      }
      if (sc.kind === 'traineeQuit' || sc.kind === 'agingOutTalk') {
        // the practice room (v0.9.16): promise the ones the reads back —
        // when a lineup is genuinely comeable — and be straight with the
        // rest. Promises the bot's own play then breaks COUNT: that is
        // the mechanism under test.
        const p = state.people[sc.personId];
        const avg = p ? KP.C.TALENTS.reduce((sum, d) => sum + KP.perceived(state, p, d, scout), 0) / KP.C.TALENTS.length : 0;
        const lineupComing = KP.freeTrainees(state).length >= 4;
        if (sc.kind === 'traineeQuit') {
          KP.resolveScene(state, sc.id, avg >= 50 && lineupComing ? 'promise'
            : state.budget > KP.C.PRACTICE.pleadCost + 40 ? 'plead' : 'accept');
        } else {
          KP.resolveScene(state, sc.id, avg >= 50 && lineupComing ? 'promise'
            : avg >= 45 ? 'honest' : 'release');
        }
        return;
      }
      // the far markets (v0.10.43): the conventions are festival invites now — handled above
      if (sc.kind === 'theInterview') {
        // the staff (v0.10.6): a flush boss takes the bet — the fog
        // means the bot cannot cherry-pick, which is the point
        // the studio chairs (v0.10.35) are a luxury the ground game pays for
        // first — the first soak starved the show bookings into the darling band
        const studioChair = (KP.C.HIRES.SEATS.find(x => x.id === sc.cand.seatId) || {}).studio;
        KP.resolveScene(state, sc.id,
          state.budget > KP.C.HIRES.hireCost[sc.cand.tier] + (studioChair ? 500 : 200) ? 'hire' : 'pass');
        return;
      }
      if (sc.kind === 'seatPoach') {
        KP.resolveScene(state, sc.id,
          state.budget > KP.C.HIRES.raiseCost + 100 ? 'raise' : 'walk');
        return;
      }
      if (sc.kind === 'promoOffer') {
        // the promotion (v0.10.38): a boss takes an invitation that costs a
        // lesser booking and keeps a stage it already has
        KP.resolveScene(state, sc.id, sc.replace && KP.isShowActivity(sc.replace) ? 'decline' : 'take');
        return;
      }
      if (sc.kind === 'theSheet') {
        // the sheet (v0.10.36): front-load a real ace, flatten a sour
        // room, else trust the producer — a boss with a breakout plays
        // the hand it built; the custom sheet is the player's verb
        const g2 = KP.groupById(state, sc.groupId);
        const ace = g2 && state.people[g2.roles && g2.roles.center];
        const room = g2 ? g2.members.map(id => state.people[id]).filter(Boolean) : [];
        const morale = room.length ? room.reduce((s, m) => s + m.morale, 0) / room.length : 60;
        // hype builds late in an era — at recording time even a modest
        // read on the center is enough for a boss to play the hand
        KP.resolveScene(state, sc.id, ace && (ace.hype || 0) >= 12 ? 'center' : morale < 50 ? 'spread' : 'trust');
        return;
      }
      if (sc.kind === 'theDiagnosis') {
        // schedule pressure is the industry default: mid-promo takes the
        // chair, mid-prep/tour pushes through, a quiet calendar rests —
        // all three doors get walked, which is the census's point
        const p2 = state.people[sc.personId];
        const g2 = p2 ? KP.groupOf(state, p2.id) : null;
        const pick = g2 && state.week <= (g2.promoUntil || 0) ? 'seated'
          : g2 && (g2.prep || g2.tour) ? 'push' : 'rest';
        KP.resolveScene(state, sc.id, pick);
        return;
      }
      if (sc.kind === 'farewellNews') {
        // the long goodbye (v0.11.10, §101): told now, the last era is an
        // event and every record before it is a countdown; kept in the
        // house, the year is about the work. The boss lets her tell the
        // fans when the lap is short enough that the next record is the
        // last one anyway, and keeps a long one in the house.
        const lp = KP.lapOf(state, state.people[sc.personId]);
        KP.resolveScene(state, sc.id, lp && lp.weeksLeft <= KP.C.FAREWELL.lastEraWeeks + 12 ? 'now' : 'house');
        return;
      }
      if (sc.kind === 'theReissue') {
        // the era extends (v0.9.17; a door since v0.11.9, §100): a boss with
        // a hot record and no fiscal pressure reissues — the chair's pick by
        // default, the cafés' when the fandom is the thing that needs
        // feeding — a lukewarm era rests, and a boss who cannot cover the
        // bill this week leaves the door open (it may lapse: that is counted)
        const g3 = KP.groupById(state, sc.groupId);
        const last3 = g3 ? (g3.releases || [])[(g3.releases || []).length - 1] : null;
        if (!g3 || !last3 || (state.fiscal || {}).pressure > 0 || (last3.reception || 0) < 62) {
          KP.resolveScene(state, sc.id, 'rest');
          return;
        }
        const opts3 = KP.sceneDef(sc.kind).options(state, sc);
        if (opts3[0].id === 'rest') { KP.resolveScene(state, sc.id, 'rest'); return; }
        // the bill is the real one now (pressing and rounds included): the
        // boss wants it covered half again before signing it
        const bill3 = KP.reissueBill(state, g3, KP.reissueBuild(state, g3));
        if (state.budget < Math.max(200, Math.round(bill3 * 1.5))) return;
        const cold = ((g3.fandom || {}).intensity || 0) < 45;
        KP.resolveScene(state, sc.id, cold && opts3.some(o => o.id === 'fans') ? 'fans' : opts3[0].id);
        return;
      }
      // the after-eval talk (v0.11.14, §105): a trainee who is already low
      // gets the month one on one when the books allow it; otherwise it is
      // left with the coaches, as it always was. The bot never says it
      // straight: that answer is suite-held.
      if (sc.kind === 'offTheList') {
        // the posting (v0.11.17, §108): the bot tells her why. A promise of
        // the next lineup is a real commitment and a boss's to make, not a
        // policy's: it is suite-held.
        KP.resolveScene(state, sc.id, 'why');
        return;
      }
      if (sc.kind === 'afterEvalTalk') {
        const tp = state.people[sc.personId];
        const optsT = KP.sceneDef('afterEvalTalk').options(state, sc);
        const room = tp && tp.morale < 55 && state.budget >= 150 && optsT.some(o => o.id === 'room');
        KP.resolveScene(state, sc.id, room ? 'room' : 'coaches');
        return;
      }
      const def = KP.sceneDef(sc.kind);
      if (def) KP.resolveScene(state, sc.id, def.options(state, sc)[0].id);
    });

    // the closing slot (v0.11.14, §105): a trainee one sheet from the talk
    // is given the last slot of the showcase, if nobody has been yet
    if (KP.showcaseSlotRead) {
      const slot = KP.showcaseSlotRead(state);
      if (slot && slot.byCoaches) {
        const atRisk = state.roster.map(id => state.people[id]).find(tp => tp && tp.status === 'trainee' && !KP.onBreak(tp) &&
          tp.evalBottomStreak === KP.C.EVAL.bottomTalkAfter - 1 && tp.id !== slot.aceId);
        if (atRisk) KP.setShowcaseSlot(state, atRisk.id);
      }
    }

    // the company's voice (v0.9.6): launch the lightstick once the fandom
    // that exists can pay for the run (v0.11.5: the run is sized by
    // KP.fanbaseRead — a launch-week fandom leaves boxes in the hallway);
    // hold a fan meeting when flush — the engine gates cooldowns and calendars
    state.groups.forEach(g => {
      if (!g.debuted || !g.fandom || !g.fandom.name) return;
      const CT = KP.C.CONSTITUENCY;
      if (!g.lightstickWeek && KP.fanbaseRead(state, g) * CT.lightstickPerFan >= CT.lightstickCost) KP.launchLightstick(state, g.id);
      if (state.budget > 150) KP.holdFancon(state, g.id, 'free');   // the free format (v0.10.42)
    });

    // the help wanted (v0.10.11): a flush boss with an empty chair posts
    // for it instead of waiting on the market's clock — firing stays a
    // player judgment call (suite-held), the bot never releases a seat
    if (KP.openSearch && !state.staffSearch &&
        state.budget > KP.C.HIRES.searchCost + 150 &&
        !(state.scenes || []).some(sc => sc.kind === 'theInterview')) {
      const S2 = state.seats || {};
      const openSeat = KP.C.HIRES.SEATS.find(x => !S2[x.id]);
      if (openSeat) KP.openSearch(state, openSeat.id);
    }

    // the touring desk (v0.6.8): when the calendar is open and the map
    // is warm, the bot takes the road — scale by fanbase, legs by warmth
    state.groups.forEach(g => {
      if (!KP.tourEligible(state, g).ok) return;
      if (state.budget < 80) return;
      const T = KP.C.TOUR;
      const warm = KP.tourLegOptions(state, g)
        .filter(o => o.id !== 'kr').sort((a, b) => b.demand - a.demand);
      const scale = (g.popularity >= 65 && warm[0] && warm[0].demand >= 50) ? 'arenas'
        : g.popularity >= 45 ? 'halls' : 'clubs';
      // book legs a competent player would: at least solid, never the
      // promoter's bare minimum (that is how curtained sections happen)
      if ((state.fiscal || {}).pressure > 0) return;   // red quarters ground the road (0.9.13)
      // a sensible boss reads the sponsor calendar before booking the
      // road (v0.9.15): an appearance due mid-tour is a clawback waiting.
      // Window 8→4 in soak calibration: obligations recur every 10 weeks,
      // so an 8-week lockout grounded ~80% of the touring calendar — the
      // bot stayed home, stacked comebacks, and award season inflated
      // (daesang flood) while tour income vanished. Four weeks covers the
      // actual tour span; a single landing mid-tour just reschedules.
      if (KP.outsideJobs(state, 'brand').some(d =>
          g.members.includes(d.personId) &&
          (d.nextObligationWeek || 0) <= state.week + 4)) return;
      // a booked festival slot grounds the road (0.9.22): the boss does
      // not book a stage and then drive the group away from it
      if ((g.festivalBookings || []).some(b => b.week <= state.week + 10)) return;
      const spot = T.SCALES[scale].sweetSpot;
      const legs = ['kr'].concat(warm.filter(o => o.demand >= spot * T.softBelow)
        .slice(0, 2).map(o => o.id));
      KP.planTour(state, { groupId: g.id, scale, legs, pacing: 'humane', setlist: 'hits' });
    });

    // the era extends (v0.9.17): since v0.11.9 (§100) the reissue is a door
    // — `theReissue`, answered at the scenes desk above — not a verb the
    // boss reaches for unprompted

    // the promotion (v0.10.38): a record still climbing in its last week
    // gets the second wind when the room can carry it. Until v0.11.9 the
    // boss signed only a room the staff had not flagged, and a probe over
    // 40 seeds showed what that meant: 657 last promotion weeks, 95 with a
    // record still climbing, 92 of those flagged tired (the room's median
    // in a last week is 83 against a flag at 70). The boss took 3 doors in
    // twelve years, the tired letter never ran under the soak, and the
    // census row measured the boss's caution instead of the verb. Since
    // v0.11.9 (§100) the boss signs through the flag while the room is
    // under the line the encore already uses (`encoreNight`: hand the
    // night back at 75): a tired room gives one more, a spent one does not.
    state.groups.forEach(g => {
      if (!KP.extensionRead) return;
      const r = KP.extensionRead(state, g);
      if (!r.ok) return;
      era.extOffered = true;
      const avgF = g.members.reduce((s2, id) => s2 + (state.people[id] ? state.people[id].fatigue : 0), 0) / (g.members.length || 1);
      if (r.tired && avgF >= 75) return;
      if (KP.extendEra(state, g.id).ok && r.tired) era.extTired = true;
    });

    // plan the next release for whichever group needs one — debuts and
    // comebacks ride the same studio path. After a debut lands, the bot
    // commits to the direction that worked (v0.6.7) — like a player would
    state.groups.forEach(g => {
      if (g.debuted && !g.concept && g.results && g.results.reception >= 55 && !g.prep) {
        KP.setGroupConcept(state, g.id, g.results.conceptId);
      }
    });
    state.groups.forEach(g => {
      if (g.prep) return;
      // the calendar rail (v0.4.2): promo, then contractual rest — and a
      // player who reads the staff warnings waits for the roster to
      // actually recover before locking the next cycle
      if (g.debuted && state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) return;
      // a declared hiatus means it (v0.9.12): anticipation only counts
      // the weeks past grace, so the bot stays parked long enough for
      // the bet to be real — and un-parks by locking the return
      if (g.hiatus && state.week - g.hiatus.since < KP.C.HIATUS.graceWeeks + 6) return;
      if (g.debuted) {
        const avgF = g.members.reduce((s, id) => s + state.people[id].fatigue, 0) / g.members.length;
        if (avgF >= 45) return;
      }
      const promoAffordable = (!g.debuted || state.budget > 60) ? 'standard' : 'modest';
      // the format ladder (v0.7.5): a healthy company ships minis, a rich
      // one ships albums — and the bigger formats open the credit slots
      const FMT = KP.C.DEBUT.FORMATS;
      // under fiscal pressure a sensible player ships lean (0.9.13)
      const fmt = (state.fiscal || {}).pressure > 0 ? FMT[0]
        : state.budget > 320 ? FMT[2] : state.budget > 160 ? FMT[1] : FMT[0];
      // the bot reads the same stature-scaled bill the studio shows (v0.9.14)
      const bill = KP.recordBill(g, promoAffordable, fmt.id);
      // the rollout desk bills at lock (v0.6.3) — a player trims the plan
      // before skipping the release, so the bot does too
      const R = KP.C.ROLLOUT;
      const planCost = p => p.flat().reduce((s, a) => s + R.ACTIVITIES[a].cost, 0);
      const thrifty = [['radio', 'livestream'], ['radio', 'livestream'], ['radio', 'livestream'], ['rest']];
      const wantDefault = !(state.fiscal || {}).pressure &&
        state.budget > bill + planCost(R.DEFAULT) + 20;
      const rollout = wantDefault ? R.DEFAULT.map(w => w.slice()) : thrifty;
      if (state.budget <= bill + planCost(rollout)) return;
      if (!g.demos) {
        const rng = KP.rngFor(state);
        g.demos = KP.generateDemos(state, rng, g);
        state.rngState = rng.state();
      }
      const demo = g.demos.slice().sort((a, b) => b.hook - a.hook)[0];
      const baseTarget = g.debuted
        ? state.week + 5   // comebacks ride short runways — long preps grind people (v0.4.2)
        : (state.objective.type === 'debutGirlGroup' && state.objective.status === 'open'
          ? Math.min(state.week + 8, state.objective.deadlineWeek) : state.week + 8);
      // a bigger record needs the runway it needs
      const targetWeek = Math.max(baseTarget, state.week + Math.max(KP.C.DEBUT.prepWeeksMin, fmt.minPrep));
      // the gamble (v0.9.6): a fusion-brief group always rides the mash —
      // two genres picked deterministically per group per era
      let mash = null;
      if (g.concept === 'fusion') {
        const GEN = KP.C.FUSION.GENRES;
        const i1 = Math.floor(KP.hash01([seed, g.id, 'mashA', (g.releases || []).length].join('|')) * GEN.length);
        let i2 = Math.floor(KP.hash01([seed, g.id, 'mashB', (g.releases || []).length].join('|')) * GEN.length);
        if (i2 === i1) i2 = (i2 + 1) % GEN.length;
        mash = [GEN[i1], GEN[i2]];
      }
      // the video ladder (v0.9.17): a rich, popular act flexes cinema; a
      // red quarter ships the performance cut; everyone else stays standard
      const mvTier = (state.fiscal || {}).pressure > 0 ? 'plain'
        : (state.budget > 420 && (g.popularity || 0) >= 60) ? 'cinema' : 'standard';
      // the pressing (v0.11.9, §100): the bot reads its own last landing
      // the way a player reads the two letters. The sold-out story says
      // "press braver next time" and the warehouse memo says the opposite,
      // so the run walks a ladder (cautious, the desk's sheet, bold) one
      // rung at a time from wherever the last record stood: up on a
      // sellout, down on a memo, unmoved on a week that fit. Two red
      // quarters running press lean: that is the till talking, not the
      // arithmetic (a lean run saves a little at lock and loses more at
      // the landing), so one red quarter is not enough to do it. The
      // first cut pressed lean on ANY pressure: 348 of 678 locks went
      // cautious, 346 of those sold out, sellouts flooded at 37/40 and
      // the bold rung starved (37 locks, memos at 2/40). Before the
      // ladder the bot never touched the run: every sheet in the census
      // was the suggestion, and the only overpress it ever ate was the
      // old reissue's mis-sized one. The reissue's own run is the desk's,
      // so the lesson is read from the last record the bot sized itself.
      const PRESETS = ['cautious', 'suggested', 'bold'];
      const ownLast = (g.releases || []).slice().reverse().find(r => !r.repackageOf && r.pressing);
      let rung = 1;
      if (ownLast) {
        const at = PRESETS.indexOf(ownLast.pressing.preset || 'suggested');
        rung = at < 0 ? 1 : at;
        if (ownLast.pressing.soldOut) rung = Math.min(2, rung + 1);
        else if (ownLast.pressing.overpress) rung = Math.max(0, rung - 1);
      }
      if ((state.fiscal || {}).pressure >= 2) rung = 0;
      const learned = rung === 1 ? null : { preset: PRESETS[rung] };
      const lockPlan = {
        groupId: g.id, songId: demo.id, conceptId: g.concept === 'fusion' ? 'fusion' : demo.conceptId, promo: promoAffordable,
        week: targetWeek, rollout, format: fmt.id,
        alloc: { vocals: 30, dance: 30, rap: 10, media: 30 },
        mv: mvTier,
        mash,
      };
      const lockRes = KP.planDebut(state, learned ? Object.assign({ pressing: learned }, lockPlan) : lockPlan);
      // a brave run the till cannot cover falls back to the desk's sheet
      if (learned && lockRes && lockRes.ok === false) KP.planDebut(state, lockPlan);
      // the A&R pass (v0.7.5): the internet's favorite gets the solo slot,
      // the next two most-followed get the unit — public numbers only
      if (g.prep && g.prep.tracks) {
        const open = g.prep.tracks.filter(tk => tk.slot && !tk.credit);
        if (open.length) {
          const byFollowers = g.members.map(id => state.people[id])
            .sort((a, b) => KP.socialOf(state, b) - KP.socialOf(state, a));
          KP.assignTrack(state, g.id, open[0].n, { type: 'solo', memberId: byFollowers[0].id });
          if (open[1] && byFollowers.length >= 3) {
            KP.assignTrack(state, g.id, open[1].n,
              { type: 'unit', memberIds: [byFollowers[1].id, byFollowers[2].id] });
          }
        }
      }
    });

    const notes = KP.advanceWeek(state);
    if (state.hypeDirective) directiveSeen = true;
    if (state.roster.some(id => (state.people[id].hype || 0) >= 25)) hypeSeen = true;
    // the war census (v0.6.4) + the road census (v0.6.8)
    notes.forEach(n => {
      if (n.ind === 'ambush') totalAmbushes++;
      if (n.ind === 'tourLeg' && n.soldOut) tourSoldOutSeen = true;
      if (n.ind === 'tourLeg' && n.soft) tourSoftSeen = true;
      if (n.ind === 'awardSnub') awardSnubSeen = true;
      // the constituency + the gamble (v0.9.6)
      if (n.ind === 'fusionVerdict') {
        fusionTrySeen = true;
        if (n.outcome === 'shift') fusionShiftSeen = true;
        if (n.outcome === 'acclaim') fusionAcclaimSeen = true;
        if (n.outcome === 'flop') fusionFlopSeen = true;
      }
      if (n.ind === 'fanTruck') truckSeen2 = true;
      // the flagships (v0.9.8): difficulty is measurable
      if (n.ind === 'battleLoss') warLostSeen = true;
      if (n.ind === 'flagshipHunt') huntSeen = true;
      // the year (v0.9.5)
      if (n.ind === 'festival') festSeen = true;
      if (n.ind === 'gayoStage') gayoSeen = true;
      if (n.ind === 'daesang') daesangSeen = true;
      if (n.ind === 'daesangSnub') daesangSnubSeen = true;
      // the home circuit + the society (v0.9.4)
      if (n.ind === 'tourCircuit') circuitSeen = true;
      if (n.ind === 'tourCircuit' && n.encores > 0) encoreSeen = true;
      if (n.ind === 'coffeeTruck') truckSeen = true;
      if (n.ind === 'seniorStan') stanSeen = true;
      if (n.ind === 'debutClass') classSeen = true;
    });
    // the people census (v0.7.4): the spotlight lands most weeks
    if ((KP.spotlightThisWeek ? KP.spotlightThisWeek(state) : []).length) personMomentWeeks++;   // the spotlight surface (v0.10.29)
    if (notes.some(n => n.moment === 'quietWeek')) quietWeekSeen = true;
    // the door census (v0.8.2)
    // the one door (v0.10.30): any person scene the queue opened counts
    if ((state.knockLedger || {}).asked >= 1) doorKnockSeen = true;
    if ((state.spotlight || []).some(m => m.week === state.week && m.choice)) momentChoiceWasSeen = true;
    if (notes.some(n => /stopped waiting|stopped asking for that minute/.test(n.text))) doorWaitSeen = true;
    if (notes.some(n => n.ind === 'seasonEpisode' && n.kind === 'company')) seasonEpisodeSeen = true;
    // the wiring (v0.11.5): the new letters and the promoted priorities, pre-trim
    notes.forEach(n => {
      if (n.ind === 'passedTookChair') wire.passedChair = true;
      if (n.ind === 'redInkSilence') wire.redInkSilence = true;
      if (n.ind === 'mandateMet') wire.mandateMet = true;
      if (n.ind === 'warehouseMemo') wire.warehouseMemo = true;
      if (n.ind === 'restockPressed') wire.restockPressed = true;
      if (n.ind === 'eraAnnounced' && n.reissue) wire.repackageSet = true;
      if (n.ind === 'eraClosed') era.closeLetter = true;
      if (n.ind === 'preorderWeek') era.preorderLetter = true;
      if (n.ind === 'contractEnd' && n.shape === 'cold') bye.cold = true;
      if (n.ind === 'graduatedSolo') wire.graduatedSolo = true;
      if (n.ind === 'landed' && n.priority === 'critical') wire.landedCritical = true;
      if (n.ind === 'evalSheet' && n.priority === 'critical') wire.evalCritical = true;
      if (n.ind === 'evalSheet' && n.priority === 'high') wire.evalHigh = true;
      if (n.ind === 'festHeadline') stages.headline = true;
      if (n.ind === 'jpAwayWeek') stages.jpAway = true;
    });
    if (KP.tourRoadRead && state.groups.some(g => g.tour && KP.tourRoadRead(state, g))) stages.roadCard = true;
    if (state.inbox.some(n => n.ind === 'eraAnnounced' && n.reissue)) wire.repackageSet = true;   // a verb's letter lands on the inbox, not the stream
    if (state.inbox.some(n => n.ind === 'graduatedSolo')) wire.graduatedSolo = true;
    if (notes.some(n => n.ind === 'anniversary')) annivSeen = true;
    if (state.roster.some(id => (state.people[id].flags || {}).scar > 0)) scarSeen = true;
    if (!regionStorySeen && (state.memory || []).some(n => n.key === 'regionStronghold')) regionStorySeen = true;
    if (!warAnnounceSeen && state.rivals.some(r => (r.acts || []).some(a => a.announcedWeek != null))) warAnnounceSeen = true;
    state.groups.forEach(g => {
      if (g.prep && g.prep.clash && !g.prep.clash.chosen) warAmbushSeen = true;
      if (g.results && g.results.week === state.week && g.results.battle) {
        warBattleSeen = true;
        if (g.results.battle.won) warWonSeen = true;
      }
    });
    notes.forEach(n => {
      if (n.kind === 'health' && /wall|injur/i.test(n.text)) burnoutSeen = true;
      if (/quarterly books/.test(n.text)) pressureSeen = true;
      if (/board sees these numbers|Keep earning that/.test(n.text)) pressureWarned = true;
    });

    // --- hard invariant guards every week ---
    // the kernel validator (v0.7.2): structural soundness, weekly
    const structural = KP.validateState(state);
    guard(structural.length === 0, seed + ' state invariants: ' + structural.join('; '));
    Object.values(state.people).forEach(p => {
      KP.C.TALENTS.forEach(d => {
        const t = p.talents[d];
        guard(!Number.isNaN(t.cur) && t.cur >= 0 && t.cur <= 100, seed + ' ' + p.id + ' ' + d + ' out of scale: ' + t.cur);
        const ceil = p.flags['ceil_' + d];
        if (ceil != null) guard(t.cur <= ceil + 0.001, seed + ' ' + p.id + ' ' + d + ' above resolved ceiling');
      });
      guard(p.fatigue >= 0 && p.fatigue <= 100, seed + ' ' + p.id + ' fatigue out of range');
    });
    guard(state.budget >= 0, seed + ' negative budget: ' + state.budget);
    state.groups.forEach(gg => {
      if (gg.prep) guard(state.week <= gg.prep.scheduledWeek, seed + ' a locked release sailed past unresolved');
    });

    // --- living-world guards (v0.4.0) ---
    const I = KP.C.INDUSTRY;
    // the sagas (v0.9.31) inject rivals PAST the organic cap by design —
    // invasions do not wait for a seat; at most two sagas fire per world
    const sceneRivals = state.rivals.filter(r => !r.projectHouse).length;   // the broadcaster's house is not a seat (v0.10.32)
    guard(sceneRivals >= I.minRivals && sceneRivals <= I.maxRivals + 2,
      seed + ' rival count out of bounds: ' + sceneRivals);
    guard(state.feed.length <= KP.C.FEED.maxPosts, seed + ' feed blew its cap: ' + state.feed.length);
    state.feed.forEach(p => guard(!!(p.handle && p.text), seed + ' malformed feed post'));
    state.chart.entries.forEach(e => {
      guard(Number.isFinite(e.score) && e.score >= 0, seed + ' chart score broken: ' + e.score);
    });
    state.rivals.forEach(r => (r.acts || []).forEach(a => (a.releases || []).forEach(rel =>
      guard(rel.reception >= 1 && rel.reception <= 100, seed + ' rival reception off the scale'))));
    // the national chart (v0.5.0): the wider world stays coherent
    const NAT = KP.C.NATIONAL;
    const poolSize = Object.values(NAT.pool).reduce((a, b) => a + b, 0);
    guard(state.national.artists.length === poolSize,
      seed + ' national pool drifted: ' + state.national.artists.length);
    state.national.entries.forEach(e =>
      guard(Number.isFinite(e.score) && e.score >= 0 && !!e.title, seed + ' national entry broken'));
    state.groups.forEach(gg => (gg.releases || []).forEach(r => {
      if (r.nationalPeak != null && r.chartPeak != null) {
        // NOT a strict superset ordering (0.9.18.1): the boards decay at
        // different rates BY DESIGN (scene 0.88/wk, national 0.93 — the
        // big board has longevity), so an aging player entry can outlast
        // a late rival nationally while trailing it on the scene. Small
        // inversions are physics (first seen 3-vs-4 when rival cycles
        // sped up); a WILD inversion is still a peak-stamping bug.
        // the season (v0.10.32): a project act debuts five half-famous names
        // onto the SCENE chart — measured 3-vs-12 once in 40; tolerance 5→10
        guard(r.nationalPeak >= r.chartPeak - 10,
          seed + ' national peak wildly better than scene peak — peak stamping desync (' +
          r.nationalPeak + ' vs ' + r.chartPeak + ')');
      }
    }));

    // rivals with faces (v0.4.3): every active act is made of real people.
    // The rule is the engine's (KP.actLineupOk, v0.11.14): this check kept
    // its own "at least four" from before there were soloists (v0.11.12),
    // and the first census career an alumna debuted solo in (1 in 200) it
    // called her act no lineup at all. The long clock below reads the same
    // rule, where soloists debut on every run.
    state.rivals.forEach(r => (r.acts || []).forEach(a => {
      if (a.retired) return;
      guard(KP.actLineupOk(a),
        seed + ' rival act ' + a.name + ' has no real lineup (' + (a.members || []).length + (a.solo ? ', solo' : '') + ')');
      (a.members || []).forEach(id => guard(state.people[id] && (state.people[id].status === 'rival' ||
        (state.people[id].status === 'trainee' && state.people[id].flags.onProject)),   // the season's held seat (v0.10.32)
        seed + ' rival act member ' + id + ' missing or mis-statused (' + (state.people[id] ? state.people[id].status + ' co=' + state.people[id].company + ' ' + JSON.stringify(state.people[id].flags.onProject || null) + ' hist=' + JSON.stringify((state.people[id].history || []).slice(-3).map(h => h.text.slice(0, 50))) : 'missing') + ')'));
    }));
    if (state.chart.entries.some(e => e.isPlayer && e.pos != null && e.pos <= 3)) playerTop3 = true;

    const weekIdols = state.groups.filter(gg => gg.debuted)
      .flatMap(gg => gg.members.map(id => state.people[id]))
      .filter(p => p && p.status === 'idol');
    if (weekIdols.length) {
      fatigueTrace.push(weekIdols.reduce((s, p) => s + p.fatigue, 0) / weekIdols.length);
    }
  }

  // --- per-seed observatory tallies ---
  // the census reads the bot's OWN work: the legacy group is inherited
  const ownGroups = state.groups.filter(x => !x.legacy);
  const g = ownGroups.find(x => x.debuted && x.results) || ownGroups[0];
  guard(!!(g && g.debuted) || !!state.dissolved, seed + ' auto-player failed to reach a debut');   // a dissolved org is counted by its own band (v0.11.0)
  if (ownGroups.length >= 2) tally.secondGroup++;
  totalGroups += ownGroups.length;
  guard((state.objectiveHistory || []).length >= 1, seed + ' the objective ladder never advanced');
  if (g && g.debuted) {
    // "a schedule to blame" = any calendar contact inside the RECOVERY
    // HORIZON (0.9.16.3 repair): recovery from a stacked calendar takes
    // ~10-12 weeks at idle rates, and the original exemption list knew
    // only prep/promo — not tours' rest windows, second jobs (v0.9.11),
    // or the year-end stages this week-141 snapshot always lands near.
    // The alarm's true target survives: an idol above 90 with NO
    // calendar contact for a full season is the bug.
    const HORIZON = 12;
    guard(g.members.map(id => state.people[id])
      .every(p => p.fatigue <= 90 || g.prep || g.tour ||
        state.week <= (g.promoUntil || 0) + HORIZON ||
        state.week <= (g.tourRestUntil || 0) + HORIZON ||
        KP.gigOf(state, p.id) ||
        (p.history || []).some(h => /Wrapped a full run|Pulled out of/.test(h.text) && state.week - h.week <= HORIZON)),
      seed + ' idols pinned at high fatigue with no schedule to blame');
  }
  if (g && g.results) {
    const first = (g.releases && g.releases[0]) || g.results;
    receptions.push(first.reception);
    if (first.receptionBand === 'sensation') tally.sensation++;
    if (['sensation', 'strong'].includes(first.receptionBand)) tally.strongPlus++;
    if (['quiet', 'miss'].includes(first.receptionBand)) tally.missOrQuiet++;
    if (g.results.breakoutId !== g.roles.center) tally.nonCenterBreakout++;
    totalReleases += (g.releases || []).length;
    if ((g.releases || []).length >= 2) tally.multiRelease++;
    // v0.4.4: peaks come from the real scene chart, so top-10 is table
    // stakes — the census asks for the summit instead
    if ((g.releases || []).some(r => r.chartPeak === 1)) tally.chartTopTen++;
    if ((g.popularity || 0) >= 42) tally.popAlive++;
    (g.releases || []).forEach(r => {
      guard(r.chartPeak >= 1 && r.chartPeak <= 100, seed + ' chart peak out of range');
      guard(r.chartWeeks >= 0 && r.chartWeeks <= 30, seed + ' chart weeks out of range');
    });
  }
  if (Object.values(state.people).some(p => p.status === 'rival')) tally.rivalSteals++;
  if (burnoutSeen) tally.burnouts++;
  if (state.roster.map(id => state.people[id]).some(p => KP.evaluate(state, p).instinct)) tally.instinctSigning++;
  if (sawFriction) tally.frictionSeen++;
  if (pressureSeen || pressureWarned) tally.fiscalNoticed++;
  if (state.budget < 300) tally.fiscalWarned++;   // the poverty tail (re-pointed v0.9.30)
  if ((state.red || {}).total > 0) tally.redWeekSeen++;   // the red weeks (v0.11.0)
  if (state.dissolved) tally.dissolvedStd++;
  if (hypeSeen) tally.hypeSeen++;
  if (directiveSeen) tally.directiveFired++;
  if (state.groups.some(gg => gg.type === 'solo' && gg.debuted)) tally.soloDebuts++;
  // fatigue economy census (v0.4.2): judge the whole rhythm, not the
  // random phase the run happened to end on — rolling half-year average
  const trace = fatigueTrace.slice(-24);
  if (trace.length &&
      trace.reduce((a, b) => a + b, 0) / trace.length < 70) tally.idolsRested++;
  if (Object.values(state.people).some(p =>
      (p.history || []).some(h => /Pulled from the schedule/.test(h.text)))) tally.overworkSeen++;

  // living-world census (v0.4.0)
  if (state.rivals.some(r => (r.acts || []).some(a => a.debutWeek > 1))) tally.rivalActDebut++;
  // save-size telemetry (v0.5.1): bloat must not sneak up on the quota.
  // History: cap 400 through v0.10.16 (soaks ran ~350–380). v0.10.17's
  // persistent classes add ~60 KB of REAL people (≈64 students × 1 KB,
  // bounded by classTarget × school cap) — measured 402–441 across 40
  // orgs at intro. Cap 480 holds the same headroom over the new floor.
  const sizeKB = KP.saveSizeKB(state);
  // the floor (v0.10.31): rival trainee rooms are ~55 real people per org now
  // (measured 482–537 on the widest orgs); cap 600 keeps the same headroom.
  // v0.10.40: the save is ~1.4 KB per real person over a ~210 KB base; the
  // widest org ran 280 real people (schools + rival rooms, bounded by their
  // caps) = 611 KB with the pair content itself ~6 KB of it (averages 529).
  // Cap 700 keeps the headroom; the widest org prints below so growth shows.
  // v0.11.44: the widest org had grown to 690 KB with the releases since, and
  // the headroom with it. The Desk's two counts and the fold add about 10 KB
  // a file: 579 to 589 on the average, 690 to 703 on the widest. Over 24
  // careers the counts are 2.8 and 3.0 KB and the fold 4.3, sixteen lean
  // letters. (As first built, three weeks of whole letters, the fold took the
  // widest to 707.) Cap 760 puts back about 60 KB over the widest.
  guard(sizeKB <= 760, seed + ' save size runaway: ' + sizeKB + ' KB after 140 weeks');
  totalSaveKB += sizeKB;
  const nPeople = Object.keys(state.people || {}).length;
  if (sizeKB > maxSaveKB) { maxSaveKB = sizeKB; maxSaveSeed = seed; }
  if (nPeople > maxPeople) maxPeople = nPeople;

  // discourse census + guards (v0.6.2)
  guard(KP.liveDiscourses(state).length <= KP.C.DISCOURSE.maxLive, seed + ' too many live storms');
  (state.discourses || []).forEach(d => guard(d.heat >= 0 && d.heat <= 100 && d.kind && d.status,
    seed + ' malformed discourse'));
  if ((state.discourses || []).length) tally.discourseSeen++;
  if ((state.discourses || []).some(d => d.status === 'resolved')) tally.discourseHandled++;
  if ((state.discourses || []).some(d => d.status === 'boiled')) tally.discourseBoiled++;
  if (warAnnounceSeen) tally.warAnnounced++;
  if (warAmbushSeen) tally.warAmbushed++;
  if (warBattleSeen) tally.warBattled++;
  if (warWonSeen) tally.warWon++;
  if ((state.memory || []).some(n => n.key === 'rivalry')) tally.warRivalry++;
  if (KP.groups(state).some(g => Object.values(g.trophies || {}).some(n => n >= 1))) tally.showFirstWin++;   // a trophy won in THIS career (audit v0.11.3: the legacy door's old win read as truthy)
  if (state.rivals.some(r => (r.acts || []).some(a => (a.showWins || 0) >= 1))) tally.showRivalWins++;
  if ((state.memory || []).some(n => n.key === 'showDarling')) tally.showDarling++;
  // the second job (v0.9.11): the files are the durable record
  const folk = Object.values(state.people);
  if (folk.some(p => (p.history || []).some(h => /Signed on as/.test(h.text)))) tally.gigBooked++;
  if (folk.some(p => ((p.flags || {}).panelArcs || 0) + ((p.flags || {}).mcRuns || 0) >= 1)) tally.gigWrapped++;
  if (folk.some(p => ((p.flags || {}).ostDrops || 0) >= 1)) tally.ostDropped++;
  if (folk.some(p => (p.history || []).some(h => /Quietly written out|Pulled out of/.test(h.text)))) tally.gigTension++;
  if ((state.memory || []).some(n => ['varietyMonster', 'nationalMC', 'ostVoice'].includes(n.key))) tally.secondJobStory++;
  // the disappearance (v0.9.12): person history and group stamps are durable
  if (folk.some(p => (p.history || []).some(h => /announced an official hiatus/.test(h.text))) ||
      state.groups.some(g => g.hiatus)) tally.hiatusDeclared++;
  if (state.groups.some(g => (g.hiatusReturns || 0) >= 1)) tally.hiatusReturned++;
  if (state.groups.some(g => g.hiatusCooledEver)) tally.hiatusCooled++;
  // the invoice (v0.9.14): the sponsor ledger is durable state
  const sl = state.sponsorLedger || {};
  if ((sl.kept || 0) >= 1) tally.obligationKept++;
  if ((sl.missed || 0) >= 1) tally.obligationMissed++;
  if ((sl.clawbacks || 0) >= 1) tally.dealClawedBack++;
  if ((sl.soloAsked || 0) >= 1) tally.soloRequested++;
  if ((sl.soloAllowed || 0) >= 1) tally.soloAllowed++;
  // the catalog (v0.9.15): the ledger and the files are durable
  const cl = state.catalogLedger || {};
  if ((cl.resurfaced || 0) >= 1) tally.clipResurfaced++;
  if ((cl.revivals || 0) >= 1) tally.catalogRevived++;
  totalRevivals += cl.revivals || 0;   // the salary check (v0.11.1)
  if (Object.values(state.people).some(p =>
      (p.history || []).some(hh => /Went viral: /.test(hh.text)))) tally.viralSourced++;
  // the gravity (v0.9.18): the ledger and the narratives are durable
  const gl = state.gravityLedger || {};
  if ((gl.clamors || 0) >= 1) tally.clamorBegan++;
  if ((gl.settled || 0) >= 1) tally.clamorSettled++;
  if ((gl.held || 0) >= 1) tally.clamorHeld++;
  if ((gl.knocks || 0) >= 1) tally.soloKnocked++;
  if ((gl.slumps || 0) >= 1) tally.slumpSeen++;
  if ((gl.footings || 0) >= 1) tally.footingFound++;
  // the solo era (v0.10.24, §87): the in-group solo as company strategy
  if ((gl.eras || 0) >= 1) tally.soloEraRun++;
  if ((gl.singles || 0) >= 1) tally.soloCutOut++;
  // the friction stream (v0.10.26, §88): questions arrive; teeth exist
  const frl = state.frictionLedger || {};
  if ((frl.asked || 0) >= 3) tally.frictionFlows++;
  if ((frl.hard || 0) >= 1) tally.frictionTeeth++;
  if ((state.memory || []).some(n => ['festivalIcons', 'varietyGroup', 'ostFactory'].includes(n.key))) tally.arcMinted++;
  // the mandate (v0.9.19): ledger, histories, and release stamps
  const ml = state.mandateLedger || {};
  if ((ml.granted || 0) >= 1) tally.mandateGranted++;
  if ((ml.issued || 0) > (ml.granted || 0)) tally.mandateBoard++;
  if ((ml.lapsed || 0) >= 1) tally.mandateLapsed++;
  if (Object.values(state.people).some(p => (p.history || []).some(h =>
      /Signed trainee term|trainee contract ran out|turned it down|let the trainee term run out/i.test(h.text)))) tally.traineeTabled++;
  if (Object.values(state.people).some(p => (p.history || []).some(h =>
      /trainee contract ran out|turned it down|The company let the trainee term run out/i.test(h.text)))) tally.traineeWalked++;
  if (state.groups.some(g => (g.releases || []).some(r => (r.anticipation || 0) >= 1))) tally.anticipationBanked++;
  if (Object.values(state.people).some(p => (p.flags || {}).walkoutAsked)) tally.walkoutCalled++;
  // the bad blood (v0.9.21): the ledger and the rivalry list are durable
  const bb = state.badBloodLedger || {};
  if ((bb.scene || 0) >= 1 || (state.sceneRivalries || []).length) tally.sceneRivalry++;
  if ((bb.fanWars || 0) >= 1) tally.fanWarSeen++;
  if ((bb.inGroup || 0) >= 1) tally.inGroupRivalry++;
  // >=3 (v0.9.21 first soak): with every org running 2+ groups, ONE
  // overlap per 3-year career is structural — the census counts the
  // orgs that make a HABIT of cannibalizing their own calendar
  if ((bb.cannibal || 0) >= 3) tally.cannibalSeen++;
  if ((bb.masters || 0) >= 1) tally.masterMinted++;
  if ((bb.turns || 0) >= 1) tally.masterTurned++;
  // festival season + award night (v0.9.22): ledger + histories
  const fl = state.festivalLedger || {};
  if ((fl.invites || 0) >= 1) tally.festInvited++;
  if ((fl.headlines || 0) >= 1) tally.festHeadlined++;
  if ((fl.missed || 0) >= 1) tally.festMissed++;
  Object.entries(fl.missedWhy || {}).forEach(([k, v]) => { tally.festMissedWhy[k] = (tally.festMissedWhy[k] || 0) + v; });
  if (Object.values(state.people).some(p => (p.history || []).some(h =>
      /acceptance speech on year-end television/.test(h.text)))) tally.speechGiven++;
  if (Object.values(state.people).some(p => (p.directed || []).some(d => d.kind === 'gaveTheSpeech')) ||
      Object.values(state.people).some(p => (p.history || []).some(h => /speech stayed folded|acceptance speech on year-end/.test(h.text))))
    tally.nightPlanned++;
  // the service (v0.9.23): the ledger is durable
  const svl = state.serviceLedger || {};
  if ((svl.notices || 0) + (svl.plans || 0) >= 1) tally.svcPapersSeen++;
  if ((svl.enlisted || 0) >= 1) tally.svcEnlisted++;
  // the rise and fall (v0.9.24): the ledger is durable
  const rfl = state.riseFallLedger || {};
  if ((rfl.rankings || 0) >= 2) tally.rfRankings++;
  if ((rfl.overtakes || 0) + (rfl.playerNo1 || 0) >= 1) tally.rfTopSeatMoved++;
  if ((rfl.classes || 0) >= 1) tally.rfClassSeen++;
  if ((rfl.offers || 0) >= 1) tally.rfOfferSeen++;
  if ((rfl.genTurns || 0) >= 1) tally.rfGenTurned++;
  if ((rfl.torchPasses || 0) >= 1) tally.rfTorchSeen++;
  if ((rfl.rivalServices || 0) >= 1) tally.rfRivalService++;
  // the portfolio (v0.9.26): units + doctrine refusals are durable
  if (((state.portfolioLedger || {}).units || 0) >= 1) tally.unitEraSeen++;
  if (((state.mandateLedger || {}).doctrineDenied || 0) >= 1) tally.doctrineDeniedSeen++;
  // the tongue (v0.9.29): the ledger is durable
  if (((state.tongueLedger || {}).auditions || 0) >= 1) tally.auditionRun++;
  if (((state.tongueLedger || {}).intlSigned || 0) >= 1) tally.intlSigned++;
  // the secret (v0.9.30): the ledger is durable
  if (((state.secretLedger || {}).secrets || 0) >= 1) tally.secretFormed++;
  if (((state.secretLedger || {}).reveals || 0) >= 1) tally.revealSeen++;
  // the sagas (v0.9.31): the ledger is durable
  if (((state.sagaLedger || {}).fired || 0) >= 1) tally.sagaFired++;
  const sgl = state.sagaLedger || {};
  if ((sgl.jvSigned || 0) + (sgl.jvDeclined || 0) >= 1) tally.jvAnswered++;
  // time takes its share (v0.9.32): the ledger is durable
  const tml = state.timeLedger || {};
  if ((tml.senesced || 0) >= 1) tally.senesceSeen++;
  if ((tml.driftWeeks || 0) >= 1) tally.trustDrifted++;
  if ((tml.successions || 0) >= 1) tally.successionSeen++;
  // the network (v0.9.35): the ledger is durable
  const nl = state.networkLedger || {};
  if ((nl.apps || 0) >= 1) tally.networkApps++;
  if ((nl.refs || 0) >= 1) tally.networkRefs++;
  const flr = state.floorLedger || {};
  if ((flr.cut || 0) >= 1) tally.washoutReturned++;
  if ((flr.reentries || 0) >= 1) tally.reentrySeen++;
  if (Object.values(state.people).some(p => p.born && p.born.door === 'rivalDoor' && p.born.city)) tally.rivalDoorBorn++;
  const sel = state.seasonLedger || {};
  if ((sel.aired || 0) >= 1) tally.seasonAired++;
  if ((sel.castMax || 0) >= 8 && (sel.castSourcesMax || 0) >= 3) tally.seasonCastWorld++;
  if ((sel.invited || 0) >= 1) tally.seasonInvited++;
  if ((sel.sent || 0) >= 1) tally.seasonSent++;
  if ((sel.pushes || 0) >= 1) tally.seasonPushed++;
  if ((sel.coached || 0) >= 1) tally.seasonCoached++;
  if ((sel.edits || 0) >= 1) tally.seasonEdited++;
  if ((sel.oursLineup || 0) >= 1) tally.seasonOursLineup++;
  if ((sel.permanent || 0) >= 1) tally.seasonPermanent++;
  if (((state.riseFallLedger || {}).faSigned || 0) >= 1) tally.careerSigned++;   // the one market (v0.10.33)
  {   // the studio (v0.10.35)
    const sl = state.studioLedger || {};
    if ((sl.commissions || 0) >= 1) tally.commissioned++;
    if ((sl.roomMiss || 0) >= 1) tally.themeNamed++;
    if ((state.seats || {}).producer || (state.seats || {}).writer) tally.houseChair++;
    if (state.groups.some(g => (g.releases || []).some(r => r.fitMult != null && r.fitMult < KP.C.STUDIO.fit.home))) tally.offLaneRecord++;
  }
  {   // the two verdicts (v0.10.34)
    const vl = state.verdictLedger || {};
    if ((vl.darlings || 0) >= 1) tally.criticsDarling++;
    if ((vl.pannedHits || 0) >= 1) tally.pannedHit++;
    if ((vl.splits || 0) >= 1) tally.criticsSplit++;
    if ((vl.trendNamed || 0) >= 1) tally.trendNamed++;
  }
  if ((nl.calls || 0) + (nl.streets || 0) >= 1) tally.callHeld++;
  // the product (v0.10.0): the releases archive their own numbers
  {
    let minted = 0, sold = 0, ware = 0;
    state.groups.forEach(g => (g.releases || []).forEach(r => {
      if (r.chodong != null) minted++;
    }));
    state.groups.forEach(g => {
      const pr = g.results && g.results.product;
      if (pr && pr.soldOut) sold++;
      if (pr && pr.overpress) ware++;
    });
    if (minted >= 1) tally.chodongMinted++;
    if (sold >= 1) tally.pressSoldOut++;
    if (ware >= 1) tally.pressWarehouse++;
  }
  // the person in public (v0.10.2): both ledgers are durable
  const cstl = state.castLedger || {};
  if ((cstl.channels || 0) + (cstl.lives || 0) + (cstl.unsanctioned || 0) >= 1) tally.channelSeen++;
  if ((cstl.gaffes || 0) >= 1) tally.gaffeLottery++;
  const scl = state.scandalLedger || {};
  if ((scl.broke || 0) >= 1) tally.storySeen++;
  if ((scl.forcedBreaks || 0) + (scl.choices || 0) >= 1) tally.storyForced++;
  // the making (v0.10.4): both ledgers are durable
  const ppl = state.pipeLedger || {};
  if ((ppl.stationsRun || 0) >= 1) tally.stationRun++;
  if ((ppl.postponed || 0) + (ppl.crunched || 0) >= 1) tally.slipDecided++;
  if ((ppl.clips || 0) >= 1) tally.clipCaught++;
  if ((ppl.sheets || 0) >= 1) tally.sheetSet++;   // the sheet (v0.10.36)
  const stl = state.stageLedger || {};               // the stage (v0.10.37)
  if ((stl.carried || 0) >= 1) tally.stageCarried++;
  if ((stl.fumbled || 0) >= 1) tally.stageFumbled++;
  if ((stl.pairsRead || 0) >= 1) tally.chemistryStaged++;
  const prl = state.promoLedger || {};               // the promotion (v0.10.38)
  if ((prl.taken || 0) >= 1) tally.offerTaken++;
  if ((prl.extended || 0) >= 1) tally.eraExtended++;
  if ((prl.comebackStages || 0) >= 1) tally.comebackStaged++;
  if ((state.seats || {}).producer2 || (state.seats || {}).writer2) tally.secondChair++;   // the second chair (v0.10.39)
  const pairL = state.pairLedger || {};                // the pair and the mirror (v0.10.40)
  if ((pairL.mentorships || 0) >= 1) tally.mentorPaired++;
  if ((pairL.coWritten || 0) >= 1) tally.writingPaired++;
  if ((pairL.seatings || 0) >= 1) tally.keptApart++;
  if ((pairL.framed || 0) >= 1) tally.rivalryFramed++;
  if (KP.mirrorRead && KP.mirrorRead(state).spoken) tally.mirrorSpoken++;
  if ((ppl.lineWars || 0) >= 1) tally.lineWarSeen++;
  const mdl = state.medLedger || {};
  if ((mdl.cases || 0) >= 1) tally.medCase++;
  if ((mdl.chronics || 0) >= 1) tally.medChronic++;
  if ((mdl.flares || 0) >= 1) tally.flareFelt++;
  Object.keys(medSum).forEach(k => { medSum[k] += mdl[k] || 0; });
  // the world circuit (v0.10.9): the ledger is durable
  const cir = state.circuitLedger || {};
  const flA = state.festivalLedger || {};   // the far markets live on the festival ledger (v0.10.43)
  if ((flA.abroadPlayed || 0) >= 1) tally.circuitPlayed++;
  if ((flA.tongueFlops || 0) >= 1) tally.circuitFlopped++;
  if ((cir.enCuts || 0) >= 1) tally.enVersioned++;
  // the Japan cycle (v0.10.8): the ledger is durable
  const jpl = state.jpLedger || {};
  if ((jpl.signed || 0) >= 1) tally.jpSigned++;
  if ((jpl.releases || 0) >= 1) tally.jpDropped++;
  if ((jpl.rungs || 0) >= 1) tally.jpRungUp++;
  if ((jpl.domes || 0) >= 1) tally.jpDomed++;
  // the rituals (v0.10.7): both ledgers are durable
  const evl = state.evalLedger || {};
  if ((evl.talks || 0) >= 1) tally.evalTalked++;
  // the mission (v0.11.13, §104): the census's own sums, printed below the bands
  ['sheets', 'missions', 'drilledFull', 'drilledClimbs', 'moments', 'lineCross', 'talks',
    'talkAsked', 'talkCoaches', 'talkStraight', 'talkRoom', 'talkUnanswered', 'talkUnasked', 'coachClimbs', 'coachMisses', 'straightClimbs', 'slots', 'slotSnubs']
    .forEach(k => { missionSum[k] = (missionSum[k] || 0) + (evl[k] || 0); });
  // the talk and the slot (v0.11.14, §105)
  if ((evl.talkAsked || 0) >= 1) tally.talkQuestion++;
  if ((evl.slots || 0) >= 1) tally.slotGiven++;
  if ((evl.drilledFull || 0) >= 1) tally.missionDrilled++;
  if ((evl.moments || 0) >= 1) tally.missionMoment++;
  // the year's sheet (v0.11.16, §107): a census career is not quite three
  // years, so the year is read twice in it, or three times in the saves
  // whose showcases fall on week 141
  if ((evl.years || 0) >= 1) tally.yearRead++;
  if ((evl.yearClimbs || 0) >= 1) tally.yearClimb++;
  yearSum.years += evl.years || 0; yearSum.climbs += evl.yearClimbs || 0;
  (state.evalYears || []).forEach(y => { yearSum.rows += y.rows.length; yearSum.sheets++; if (y.rows.length > yearSum.max) yearSum.max = y.rows.length; });
  // a year can be read once its last showcase has been held, and not before.
  // (The first cut of this guard said "at most two" and was wrong: the
  // 200-career census found the career that reaches the third year's.)
  const yearsDue = (() => {
    let n = 0;
    for (let y = 1; y < 50; y++) {
      let w = KP.nextEvalWeek(state, (y - 1) * KP.C.WEEKS_PER_YEAR + 1), last = null;
      while (w <= y * KP.C.WEEKS_PER_YEAR) { last = w; w += KP.C.EVAL.every; }
      if (last == null || last > state.week) break;
      n++;
    }
    return n;
  })();
  guard((evl.years || 0) <= yearsDue, seed + ' the year’s sheet was read ' + evl.years + ' times in a career of ' + state.week + ' weeks, in which ' + yearsDue + ' years have had their last showcase');
  guard((state.evalYears || []).every(y => y.rows.length >= KP.C.EVAL.minTrainees && y.rows[0].place === 1 && y.topId === y.rows[0].id), seed + ' a year’s sheet on the wall is malformed');
  // the posting (v0.11.17, §108)
  const postL = state.postingLedger || {};
  if ((postL.posted || 0) >= 1) tally.listPosted++;
  if ((postL.knocks || 0) >= 1) tally.offListDoor++;
  Object.keys(postL).forEach(k => { postSum[k] = (postSum[k] || 0) + (postL[k] || 0); });
  // the quiet (v0.11.20, §111)
  const quietL = state.quietLedger || {};
  if ((quietL.rested || 0) >= 1) tally.quietRested++;
  if ((quietL.full || 0) >= 1) tally.quietFull++;
  Object.keys(quietL).forEach(k => { quietSum[k] = (quietSum[k] || 0) + (quietL[k] || 0); });
  state.groups.forEach(g => {
    const hr = KP.hiatusRead(state, g);
    if (!hr || g.retiredWeek) return;
    quietSum.parked = (quietSum.parked || 0) + 1;
    // a stamp means what it says, and a full bank that is not a service chapter's leftover was said
    guard(!g.hiatus.fullNoted || hr.full, seed + ' ' + g.name + ' is stamped as a full bank at ' + hr.banked + ' of ' + hr.cap);
    guard(!hr.full || g.hiatus.fullNoted || g.hiatus.graceFrom, seed + ' ' + g.name + '’s bank is full (' + hr.weeks + ' weeks) and no letter said so');
  });
  // the head (v0.11.22, §113): every signing house has one, no two share a
  // name, and the yearly ranking never quotes more often than it is published
  {
    const wallL = state.wallLedger || {};
    const houses = KP.signingHouses(state);
    const heads = houses.map(r => KP.rivalHead(state, r) || {});
    if ((wallL.quotes || 0) >= 1) tally.headQuoted++;
    wallSum.quotes = (wallSum.quotes || 0) + (wallL.quotes || 0);
    wallSum.stamped = (wallSum.stamped || 0) + (wallL.heads || 0);
    wallSum.houses = (wallSum.houses || 0) + houses.length;
    wallSum.rankings = (wallSum.rankings || 0) + ((state.riseFallLedger || {}).rankings || 0);
    heads.forEach(h => { wallSum['t_' + h.temper] = (wallSum['t_' + h.temper] || 0) + 1; });
    guard(heads.every(h => h.name && KP.HEAD_TEMPERS.includes(h.temper)), seed + ' a signing house has no head: ' + houses.map((r, i) => r.short + '=' + (heads[i].name || '?')).join(', '));
    guard(new Set(heads.map(h => h.name)).size === heads.length, seed + ' two houses share a head’s name: ' + heads.map(h => h.name).join(', '));
    guard((wallL.quotes || 0) <= ((state.riseFallLedger || {}).rankings || 0), seed + ' the ranking quoted a head ' + wallL.quotes + ' times in ' + ((state.riseFallLedger || {}).rankings || 0) + ' rankings');
    // the ledger (v0.11.23, §114): the books hold only acts the table knows,
    // within their caps, and a house's regard is one of the five words
    if ((wallL.acts || 0) >= 1) tally.houseBooks++;
    wallSum.acts = (wallSum.acts || 0) + (wallL.acts || 0);
    Object.keys(wallL.kinds || {}).forEach(k => { wallSum['k_' + k] = (wallSum['k_' + k] || 0) + wallL.kinds[k]; });
    // the weight (v0.11.24, §115): who parked on our dates, and why. A date
    // is parked on for the books, for a temper, or for the calendar alone
    if ((wallL.parksMoved || 0) >= 1) tally.parkMoved++;
    ['parks', 'parksBooks', 'parksTemper', 'parksMoved'].forEach(k => { wallSum[k] = (wallSum[k] || 0) + (wallL[k] || 0); });
    guard((wallL.parksBooks || 0) + (wallL.parksTemper || 0) <= (wallL.parks || 0) && (wallL.parksMoved || 0) <= (wallL.parks || 0),
      seed + ' the parked dates do not add up: ' + [wallL.parks, wallL.parksBooks, wallL.parksTemper, wallL.parksMoved].join('/'));
    guard((wallL.parks || 0) === ((wallL.kinds || {}).theyAmbushed || 0),
      seed + ' a house parked on a date and it did not go on its books: ' + (wallL.parks || 0) + ' parked, ' + ((wallL.kinds || {}).theyAmbushed || 0) + ' on the books');
    // the truce (v0.11.26, §117): a call is answered once; a truce ends
    // once; and a house in a truce with us has not parked on a date since
    if ((wallL.truceCalls || 0) >= 1) tally.truceCalled++;
    if ((wallL.truces || 0) >= 1) tally.truceTaken++;
    if ((wallL.trucesBroken || 0) >= 1) tally.truceBroken++;
    ['truceCalls', 'truces', 'truceDeclined', 'trucesBroken', 'trucesRun'].forEach(k => { wallSum[k] = (wallSum[k] || 0) + (wallL[k] || 0); });
    wallSum.truceOn = (wallSum.truceOn || 0) + houses.filter(r => KP.truceWith(state, r)).length;
    guard((wallL.truces || 0) + (wallL.truceDeclined || 0) <= (wallL.truceCalls || 0), seed + ' more truce answers than calls: ' + [wallL.truceCalls, wallL.truces, wallL.truceDeclined].join('/'));
    guard((wallL.trucesBroken || 0) + (wallL.trucesRun || 0) + houses.filter(r => KP.truceWith(state, r)).length <= (wallL.truces || 0), seed + ' more truces ended or in force than were shaken on');
    houses.forEach(r => {
      guard(!r.truce || state.week <= r.truce.until + 1, seed + ' ' + r.short + '’s truce ran out and is still on the file');
      guard(!KP.truceWith(state, r) || !(r.lastAmbushWeek > r.truce.since), seed + ' ' + r.short + ' parked on a date inside its truce');
      guard(!KP.truceWith(state, r) || !r.founderGrudge, seed + ' the old house is in a truce');
    });
    // her own questions (v0.11.27, §119): an answer needs a question, a
    // verdict needs a promise, and one of her promises stands at a time
    {
      const up = KP.upstairsLedger(state);
      const OWN_T = Object.keys(up.types);
      const openOwn = (state.claims || []).filter(c => !c.resolved && OWN_T.includes(c.type));
      if (up.asked >= 1) tally.ownAsked++;
      if (up.met >= 1) tally.ownKept++;
      if (up.missed >= 1) tally.ownBroken++;
      ['asked', 'promised', 'passed', 'passedTwice', 'passedUrgent', 'overtaken', 'met', 'nextDoor', 'missed', 'void'].forEach(k => { upSum[k] = (upSum[k] || 0) + up[k]; });
      upSum.open = (upSum.open || 0) + openOwn.length;
      OWN_T.forEach(k => {
        const row = upSum.types[k] = upSum.types[k] || { asked: 0, met: 0, missed: 0 };
        ['asked', 'met', 'missed'].forEach(f => { row[f] += up.types[k][f]; });
      });
      guard(up.promised + up.passed + up.overtaken <= up.asked, seed + ' more answers to her own questions than questions: ' + [up.asked, up.promised, up.passed, up.overtaken].join('/'));
      guard(up.met + up.missed + up.void + openOwn.length <= up.promised, seed + ' more verdicts on her own promises than promises: ' + [up.promised, up.met, up.missed, up.void, openOwn.length].join('/'));
      guard(openOwn.length <= 1, seed + ' ' + openOwn.length + ' of her own promises stand at once');
      guard(openOwn.every(c => c.execName === state.executive.name), seed + ' a promise made to another chair’s question is still on the clock');
      guard(up.passedTwice <= Math.max(0, up.passed - 1), seed + ' a first pass was counted as a second: ' + up.passed + ' passes, ' + up.passedTwice + ' a second in a row');
      // the ledger's counts held to this tool's own notes (v0.11.51, §144)
      guard(up.passed === ownBook.passes && up.passedUrgent === ownBook.urgent, seed + ' the ledger counts ' + up.passed + ' passes and ' + up.passedUrgent + ' with the red weeks running, and this tool noted ' + ownBook.passes + ' and ' + ownBook.urgent);
      guard(up.nextDoor === (SOUND.by.get(state) || { nextDoor: 0 }).nextDoor, seed + ' the ledger counts ' + up.nextDoor + ' promises kept next door to the sound, and this tool saw ' + (SOUND.by.get(state) || { nextDoor: 0 }).nextDoor);
      ownSum.passes += ownBook.passes; ownSum.urgent += ownBook.urgent;
      // the annual review (v0.11.28, §120): every review is counted under
      // one band, the band is the one its trust falls in, and the file
      // keeps the latest twelve in order
      const kept = state.reviews || [];
      if (up.reviews >= 1) tally.reviewHeard++;
      if (up.bands.gone >= 1) tally.reviewGone++;
      upSum.reviews = (upSum.reviews || 0) + up.reviews;
      upSum.bands = upSum.bands || {};
      Object.keys(up.bands).forEach(k => { upSum.bands[k] = (upSum.bands[k] || 0) + up.bands[k]; });
      guard(Object.keys(up.bands).reduce((n, k) => n + up.bands[k], 0) === up.reviews, seed + ' the reviews do not add up by band: ' + up.reviews + ' against ' + JSON.stringify(up.bands));
      guard(kept.length <= KP.C.MEETING.reviewsKept && kept.length <= up.reviews, seed + ' ' + kept.length + ' reviews on the file, ' + up.reviews + ' given');
      guard(kept.every(r => r.band === KP.trustBand(r.trust)), seed + ' a review is filed under a band its trust is not in');
      guard(kept.every((r, i) => i === 0 || r.week > kept[i - 1].week), seed + ' the reviews on the file are out of order');
    }
    // the company's own file (v0.11.29, §121): read off the state, never
    // written. It is in order, it has one chapter for this desk, nothing
    // on it is dated after today, every act that debuted is on it, and
    // reading it changes nothing
    {
      const before = KP.serialize(state);
      const cf = KP.companyFile(state), since = KP.deskSince(state);
      const mine = cf.chapters.filter(c => !c.before);
      if (mine.some(c => c.kind === 'numberOne' || c.kind === 'trophy')) tally.fileFirst++;
      fileSum.chapters = (fileSum.chapters || 0) + cf.chapters.length;
      fileSum.mine = (fileSum.mine || 0) + mine.length;
      cf.chapters.forEach(c => { fileSum['k_' + c.kind] = (fileSum['k_' + c.kind] || 0) + 1; });
      fileSum['t_' + cf.manager.title] = (fileSum['t_' + cf.manager.title] || 0) + 1;
      guard(KP.serialize(state) === before, seed + ' reading the company’s file changed the save');
      guard(cf.chapters.every((c, i) => i === 0 || c.week >= cf.chapters[i - 1].week), seed + ' the company’s file is out of order');
      guard(cf.chapters.filter(c => c.kind === 'desk').length === 1 && cf.chapters.find(c => c.kind === 'desk').week === since, seed + ' the company’s file has no one chapter for this desk');
      guard(cf.chapters.every(c => c.week <= state.week && c.before === (c.week < since)), seed + ' a chapter of the company’s file is dated after today, or on the wrong side of this desk');
      guard(KP.groups(state).filter(g => g.debuted && g.debutWeek != null).every(g => cf.chapters.some(c => c.kind === 'debut' && c.week === g.debutWeek && c.text.startsWith(g.name + ' debuted'))), seed + ' an act that debuted is not on the company’s file');
      // the written record (v0.11.30, §122): what no marker keeps. A mark is
      // of a known kind and dated inside this desk's weeks; a first is
      // written once; the red weeks pair up; a desk that has won has its
      // night; a succession has its chair; and every mark is a chapter
      const marks = KP.fileMarks(state);
      const n = k => marks.filter(m => m.kind === k).length;
      const moved = !!(state.founded || state.chapterSince || ((state.estate && state.estate.folded) || []).length);
      const chairs = (state.timeLedger && state.timeLedger.successions) || 0;
      recSum.marks = (recSum.marks || 0) + marks.length;
      marks.forEach(m => { recSum['k_' + m.kind] = (recSum['k_' + m.kind] || 0) + 1; });
      if (n('trophy') >= 1) tally.recordNight++;
      if (n('red') >= 1) tally.recordRed++;
      guard(marks.every(m => KP.fileMarkKinds().includes(m.kind) && m.week >= since && m.week <= state.week), seed + ' a mark on the written record is of no known kind, or dated outside this desk’s weeks');
      guard(marks.every((m, i) => i === 0 || m.week >= marks[i - 1].week), seed + ' the written record is out of order');
      guard(n('trophy') <= 1 && n('breakthrough') <= 1, seed + ' a first is on the written record twice');
      guard(n('redCleared') <= n('red') && n('red') - n('redCleared') <= 1, seed + ' the red weeks on the written record do not pair up: ' + n('red') + ' meetings, ' + n('redCleared') + ' cleared');
      guard(!KP.groups(state).some(g => g.lastShowWinWeek >= since) || n('trophy') === 1, seed + ' this desk has won a trophy and the written record has no night for it');
      guard(moved ? n('chair') <= chairs : n('chair') === chairs, seed + ' ' + chairs + ' successions and ' + n('chair') + ' chairs on the written record');
      guard(marks.every(m => cf.chapters.some(c => c.week === m.week && c.kind === m.kind)), seed + ' a mark on the written record is not a chapter of the company’s file');
    }
    // the year's close (v0.11.32, §124): one year after another, each closed
    // on its last week with its letter and its till; the sum is given only
    // when it adds up; the books of the year in hand are open; and reading
    // the account changes nothing
    {
      const years = state.years || [], led = state.yearLedger;
      const Yw = KP.C.WEEKS_PER_YEAR;
      if (years.length >= 1) tally.yearClosed++;
      if (years.some(a => a.headline)) tally.yearHeadline++;
      closeSum.years = (closeSum.years || 0) + years.length;
      ['records', 'trophies', 'honors', 'debuts', 'signed', 'left', 'bows'].forEach(k => { closeSum[k] = (closeSum[k] || 0) + years.reduce((n, a) => n + a[k], 0); });
      closeSum.headline = (closeSum.headline || 0) + years.filter(a => a.headline).length;
      closeSum.sums = (closeSum.sums || 0) + years.filter(a => /came in/.test(a.said)).length;
      guard(years.every((a, i) => i === 0 || a.year === years[i - 1].year + 1), seed + ' the closed years do not follow one another');
      guard(years.every(a => a.week === a.year * Yw && a.week <= state.week), seed + ' a year is closed on a week that is not its last');
      guard(years.every(a => typeof a.said === 'string' && a.said.includes('Year ' + a.year + '.') && a.said.includes('closes at ' + a.till)), seed + ' a closed year has no letter, or its letter has not its till');
      guard(years.every(a => !/came in/.test(a.said) || (a.took >= a.till - a.was && a.said.includes(a.took + ' came in and ' + (a.took - (a.till - a.was)) + ' went out'))), seed + ' a year’s letter gives a sum that does not add up');
      guard(years.every((a, i) => i === 0 || a.line !== years[i - 1].line), seed + ' the company opened its letter the same way two years running');
      guard(years.length <= KP.C.YEAR.kept, seed + ' ' + years.length + ' closed years on the file');
      guard(!!led && led.took >= 0 && led.open.week <= state.week, seed + ' the books of the year in hand are not open');
      const before = KP.serialize(state);
      KP.yearAccount(state);
      guard(KP.serialize(state) === before, seed + ' reading the year’s account changed the save');
    }
    // the letterhead (v0.11.25, §116): who called our staff, and what the
    // answers put on the books. An answer needs a call
    if ((wallL.callsBooks || 0) + (wallL.callsTemper || 0) >= 1) tally.callReason++;
    ['calls', 'callsBooks', 'callsTemper'].forEach(k => { wallSum[k] = (wallSum[k] || 0) + (wallL[k] || 0); });
    guard((wallL.callsBooks || 0) + (wallL.callsTemper || 0) <= (wallL.calls || 0), seed + ' the staff calls do not add up: ' + [wallL.calls, wallL.callsBooks, wallL.callsTemper].join('/'));
    guard(((wallL.kinds || {}).theyHiredOurStaff || 0) + ((wallL.kinds || {}).weKeptOurStaff || 0) <= (wallL.calls || 0),
      seed + ' more answers on the books than calls: ' + (wallL.calls || 0) + ' calls');
    houses.forEach(r => {
      const rd = KP.houseRead(state, r);
      if (rd.count) { wallSum.booked = (wallSum.booked || 0) + 1; wallSum['w_' + rd.word] = (wallSum['w_' + rd.word] || 0) + 1; }
      guard((r.directed || []).every(a => KP.C.WALL.KINDS[a.kind] && a.week <= state.week), seed + ' ' + r.short + '’s books hold an act the table does not know, or one from the future');
      guard((r.directed || []).length <= KP.C.WALL.cap && Object.keys(KP.C.WALL.KINDS).every(k => (r.directed || []).filter(a => a.kind === k).length <= KP.C.WALL.perKind), seed + ' ' + r.short + '’s books are over their caps');
      guard(!rd.count || KP.C.WALL.WORDS.some(row => row[1] === rd.word), seed + ' ' + r.short + '’s regard has no word');
    });
  }
  const doorOpen = (state.scenes || []).filter(sc => sc.kind === 'offTheList').length;
  const doorDone = (postL.why || 0) + (postL.next || 0) + (postL.nothing || 0) + (postL.unanswered || 0);
  // a door that was opened and whose trainee then left the room (debuted, released) closes with nothing counted
  guard(doorDone + doorOpen <= (postL.knocks || 0), seed + ' the posting: ' + (postL.knocks || 0) + ' came to the desk and ' + doorDone + ' were answered or left, with ' + doorOpen + ' still open');
  guard((postL.knocks || 0) <= (postL.offMonth || 0) + (postL.offYear || 0), seed + ' the posting: more came to the desk than any list left off');
  guard(state.inbox.filter(n => n.ind === 'lineupPosted').every(n => n.priority === 'critical' && !!n.groupId), seed + ' the posting: a list’s letter is not critical or names no act');
  guard((state.evalYears || []).length === Math.min(KP.C.EVAL.yearKeep, evl.years || 0), seed + ' the wall holds ' + (state.evalYears || []).length + ' sheets and the ledger read ' + (evl.years || 0));
  const ptl = state.pointLedger || {};
  if ((ptl.breakdowns || 0) >= 1) tally.breakdownRead++;
  if ((ptl.nearMisses || 0) >= 1) tally.nearMissFuel++;
  if ((ptl.nudges || 0) >= 1) tally.nudgeRun++;
  // the staff (v0.10.6): the ledger is durable
  const sfl = state.staffLedger2 || {};
  if ((sfl.candidates || 0) >= 1) tally.interviewHeld++;
  if ((sfl.hires || 0) >= 1) tally.seatHired++;
  if ((sfl.poachCalls || 0) >= 1) tally.seatCalled++;
  if ((sfl.notes || 0) >= 1) tally.staffVoice++;
  if ((sfl.meshNotes || 0) >= 1) tally.meshFelt++;
  // the help wanted (v0.10.11): the bot posts when a chair sits empty
  if ((sfl.searches || 0) >= 1) tally.searchPosted++;
  // the song market (v0.10.5): the ledger is durable
  const mkl = state.marketLedger || {};
  if ((mkl.lost || 0) >= 1) tally.demoLost++;
  if ((mkl.camps || 0) >= 1) tally.campHeld++;
  if ((mkl.bondsSeen || 0) >= 1) tally.bondWorking++;
  // the recurring money (v0.10.3): the ledger is durable
  const cml = state.commerceLedger || {};
  if ((cml.clubs || 0) >= 1) tally.clubOpened++;
  if ((cml.greetings || 0) >= 1) tally.greetingsOut++;
  if ((cml.fancons || 0) >= 1) tally.fanconHeld++;
  if ((cml.catalogPaid || 0) >= 1) tally.catalogPaying++;
  if ((cml.atmStorms || 0) >= 1) tally.atmStorm++;
  // the table (v0.9.38): the ledger is durable
  const tbl = state.tableLedger || {};
  if ((tbl.counters || 0) >= 1) tally.counterMet++;
  if ((tbl.clausesTaken || 0) >= 1) tally.clauseLive++;
  // the grind (v0.9.37): both ledgers are durable
  const bl = state.bookingLedger || {};
  if ((bl.played || 0) >= 1) tally.gigPlayed++;
  if ((bl.pushes || 0) >= 1) tally.campaignRun++;
  if ((bl.virals || 0) >= 1) tally.gigViralSeen++;
  const fml = state.fameLedger || {};
  if ((fml.walled || 0) + (fml.ground || 0) >= 1) tally.wallTouched++;
  if ((fml.breaks || 0) >= 1) tally.breakSeen++;
  // the public eye (v0.9.36): the ledger is durable
  const pel = state.publicEyeLedger || {};
  if ((pel.expectSet || 0) >= 1) tally.expectSet++;
  if ((pel.snubs || 0) >= 1) tally.snubSeen++;
  if ((pel.overDelivered || 0) + (pel.underDelivered || 0) + (pel.met || 0) >= 1) tally.verdictSeen++;
  if ((pel.houseCompares || 0) + (pel.sceneCompares || 0) >= 1) tally.compared++;
  // the holdout (v0.9.33): the ledger is durable
  const hl = state.holdoutLedger || {};
  if ((hl.declined || 0) >= 1) tally.holdoutMet++;
  if ((hl.signedStature || 0) + (hl.signedLane || 0) + (hl.signedCourtship || 0) +
      (hl.signedCallback || 0) >= 1) tally.holdoutWon++;
  if ((hl.lostToPowers || 0) >= 1) tally.holdoutLost++;
  // the trainee floor (0.9.18.1): the rival ledger is durable
  const rl = state.rivalLedger || {};
  if ((rl.culls || 0) >= 1) tally.rivalCulled++;
  if ((rl.namedCuts || 0) >= 1) tally.rivalNamedCut++;
  // the castoff market (v0.10.12): rival cuts put faces on the board
  if ((rl.castoffs || 0) >= 1) tally.castoffSeen++;
  // the title fight (v0.9.17): releases and producers carry the stamps
  const allRels = state.groups.flatMap(g => g.releases || []);
  if (((state.pitchLedger || {}).memberDemos || 0) >= 1) tally.memberDemoSeen++;
  if (allRels.some(r => r.writtenBy)) tally.memberTitleChosen++;
  if (KP.producersOf(state).some(pr => pr.snubs &&
      Object.values(pr.snubs).some(v => v >= KP.C.PITCH.snubsAt))) tally.producerCooled++;
  if (allRels.some(r => r.repackageOf)) tally.repackaged++;
  if (allRels.some(r => r.mv === 'cinema')) tally.mvCinema++;
  if (allRels.some(r => r.mv === 'plain')) tally.mvPlain++;
  // the practice room + the schools (v0.9.16): durable ledgers and stamps
  if (Object.values(state.people).some(p => p.schoolId)) tally.schoolLead++;
  const sch = state.schools || [];
  if (sch.some(s => (s.classesSent || 0) >= 1)) tally.schoolClass++;
  if (sch.some(s => s.visitedWeek != null)) tally.schoolTrip++;
  if (sch.some(s => (s.partnerUntil || 0) > 0)) tally.schoolPartner++;
  if (sch.some(s => s.hotWeek != null)) tally.schoolHot++;
  // the school map (v0.10.14): the population breathes
  const schl = state.schoolLedger || {};
  if ((schl.opened || 0) >= 1) tally.schoolOpened++;
  if ((schl.closed || 0) >= 1) tally.schoolClosed++;
  if ((schl.revealed || 0) >= 1) tally.classRevealed++;
  if ((schl.directorCalls || 0) >= 1) tally.directorCalled++;
  if ((schl.fogPoached || 0) >= 1) tally.fogPoached++;
  const cnl = state.contentLedger || {};
  if ((cnl.posted || 0) >= 1) tally.contentPosted++;
  if ((cnl.hits || 0) >= 1) tally.contentHit++;
  const fnl = state.financeLedger || {};
  if ((fnl.pitches || 0) >= 1) tally.fundPitched++;
  if ((fnl.taken || 0) >= 1) tally.fundFinanced++;
  if ((fnl.passes || 0) >= 1) tally.fundPassed++;
  const pl = state.practiceLedger || {};
  if (((state.evalLedger || {}).sheets || 0) >= 1) tally.evalHeld++;   // the one eval (v0.10.30)
  if ((pl.speculations || 0) >= 1) tally.projectTalkSeen++;
  if ((pl.quitsAsked || 0) >= 1) tally.traineeQuitAsked++;
  if ((pl.gone || 0) >= 1) tally.traineeGone++;
  if ((pl.agingFaced || 0) >= 1) tally.agingOutFaced++;
  if ((pl.lastChance || 0) >= 1) tally.lastChanceSeen++;
  if (state.groups.some(g => g.regions &&
      Object.values(g.regions).some(v => v >= KP.C.REGIONAL.loudAt))) tally.regionLoud++;
  bestRegions.push(Math.max.apply(null, state.groups
    .filter(g => g.regions).flatMap(g => Object.values(g.regions)).concat([0])));
  if (regionStorySeen) tally.regionStory++;
  if ((state.memory || []).some(n => n.key === 'conceptIdentity')) tally.conceptCanon++;
  if (state.groups.some(g => (g.toursDone || 0) >= 1 || g.tour)) tally.toured++;
  if (tourSoldOutSeen) tally.tourSoldOut++;
  if (tourSoftSeen) tally.tourSoft++;
  if ((state.discourses || []).some(d => d.kind === 'gaffe')) tally.gaffeSeen++;
  if (state.groups.some(g => g.fandom)) tally.fandomNamed++;
  if (KP.outsideJobs(state, 'brand').length || Object.values(state.people).some(p => (p.dealCount || 0) > 0)) tally.dealSigned++;
  if ((state.awardHistory || []).some(a => a.isPlayer)) tally.awardWon++;
  if (awardSnubSeen) tally.awardSnubbed++;
  if (state.feed.some(p => /bubble/.test(p.text))) tally.bubbleSeen++;
  if ((state.claims || []).some(c => c.resolved === 'met')) tally.meetingKept++;
  if (Object.values(state.people).some(p => p.flags && p.flags.ambitionMet)) tally.ambitionMet++;
  if (personMomentWeeks >= 140 * 0.7) tally.peopleFelt++;
  if (quietWeekSeen) tally.quietWeekCaught++;
  if (doorKnockSeen) tally.doorKnocked++;
  if ((state.claims || []).some(c => c.type === 'ambitionPromise' && c.resolved === 'met')) tally.askPromiseKept++;
  if (momentChoiceWasSeen) tally.momentChoiceSeen++;
  if (seasonEpisodeSeen) tally.seasonEpisodes++;
  // the wiring census (v0.11.5, §96 recommendation 1): measure-first
  if (wire.passedChair) tally.wirePassedChair++;
  if (wire.redInkSilence) tally.wireRedInkSilence++;
  if (wire.mandateMet) tally.wireMandateMet++;
  if (wire.warehouseMemo) tally.wireWarehouseMemo++;
  if (wire.restockPressed) tally.wireRestockPressed++;
  if (wire.repackageSet) tally.wireRepackageSet++;
  if (wire.landedCritical) tally.wireLandedCritical++;
  if (wire.evalCritical) tally.wireEvalCritical++;
  if (wire.evalHigh) tally.wireEvalHigh++;
  if (wire.graduatedSolo) tally.wireGraduatedSolo++;
  if ((state.rivals || []).some(r => r.offerLeveraged)) tally.wireOfferLeveraged++;
  if (state.groups.some(g => g.festRegrets && Object.keys(g.festRegrets).length)) tally.wireFestRegrets++;
  if (Object.values(((state.promoLedger || {}).declines) || {}).some(n => n >= KP.C.PROMO.OFFERS.declineCoolAt)) tally.wireDeskCooled++;
  if (state.groups.some(g => (g.tourHistory || []).length)) tally.wireTourRecord++;
  // the stages, lived (v0.11.7, §98): measure-first, from the ledgers and the letters
  {
    const TL = state.tourLedger || {}, FL = state.festivalLedger || {}, JL = state.jpLedger || {};
    if ((TL.encoresOffered || 0) >= 1) tally.roadEncoreOffered++;
    if ((TL.encoresHandedBack || 0) >= 1) tally.roadEncoreHandedBack++;
    if ((TL.pressersOffered || 0) >= 1) tally.roadPresserOffered++;
    if ((TL.statements || 0) >= 1) tally.roadStatement++;
    if ((TL.swapsOffered || 0) >= 1) tally.roadSwapOffered++;
    if ((TL.swapped || 0) >= 1) tally.roadSwapped++;
    if ((TL.moments || 0) >= 1) tally.roadMoments++;
    if ((TL.ceremonies || 0) >= 1) tally.roadCeremony++;
    if (stages.roadCard) tally.roadCardSeen++;
    if ((FL.billsPosted || 0) >= 1) tally.festBillPosted++;
    if ((FL.deepSets || 0) >= 1) tally.festDeepSet++;
    if ((FL.collabs || 0) >= 1) tally.festCollab++;
    if ((FL.moments || 0) >= 1) tally.festMoments++;
    if (stages.headline) tally.festHeadlineCeremony++;
    if ((JL.awayMoments || 0) >= 1 || stages.jpAway) tally.jpAwayMoments++;
  }
  // the era, closed (v0.11.9, §100): measure-first, from the ledger and the letters
  {
    const EL = state.eraLedger || {};
    if (era.closeLetter && (EL.closed || 0) >= 1) tally.eraClosedLetter++;
    if ((EL.reissueOffered || 0) >= 1) tally.eraReissueOffered++;
    if ((EL.anr || 0) >= 1) tally.eraReissueAnr++;
    if ((EL.fans || 0) >= 1) tally.eraReissueFans++;
    if ((EL.desk || 0) >= 1) tally.eraReissueDesk++;
    if ((EL.rested || 0) >= 1) tally.eraRested++;
    if ((EL.lapsed || 0) >= 1) tally.eraLapsed++;
    if ((EL.superseded || 0) >= 1) tally.eraSuperseded++;
    if (era.preorderLetter && (EL.preorderReads || 0) >= 1) tally.eraPreorderRead++;
    if ((EL.preorderAhead || 0) >= 1) tally.eraPreorderAhead++;
    if ((EL.preorderSoft || 0) >= 1) tally.eraPreorderSoft++;
    if (era.extOffered) tally.eraExtOffered++;
    if (era.extTired) tally.eraExtTired++;
    if (state.groups.some(g => (g.releases || []).some(r => r.closed && r.closed.extended))) tally.eraClosedExtended++;
  }
  // the long goodbye (v0.11.10, §101): three ceilings, from the ledger and the letter
  if (((state.farewellLedger || {}).laps || 0) >= 1) tally.byeLap++;
  if (state.groups.some(g => (g.alumni || []).length)) tally.byeAlumni++;
  if (bye.cold) tally.byeColdExit++;
  // across the street (v0.11.12, §103): two ceilings, from the ledger
  if (((state.acrossLedger || {}).signed || 0) >= 1) tally.acrossSigned++;
  if (((state.acrossLedger || {}).lives || 0) >= 1) tally.acrossLife++;
  if (doorWaitSeen) tally.doorLeftWaiting++;
  if (annivSeen) tally.annivFelt++;
  if (scarSeen) tally.scarCarried++;
  // the building + boy groups census (v0.8.4)
  if (state.roster.some(id => state.people[id].gender === 'm')) tally.boysSigned++;
  if (state.groups.some(g => g.gender === 'm')) tally.boyGroupFormed++;
  if (state.groups.filter(g => g.debuted).every(g => KP.managerOf(state, g)) &&
      state.groups.some(g => g.debuted)) tally.staffNamed++;
  // durable counter (v0.9.37): the convoLog read undercounted — its
  // 40-entry cap evicts old seasons in busy worlds
  if ((state.boardSeasonsFaced || 0) >= 1 ||
      (state.convoLog || []).some(e => e.kind === 'boardSeason')) tally.boardFaced++;
  if (state.petProjectDone) tally.petAssigned++;
  // the clock census (v0.9.0): every debuted idol carries the stamp
  if (state.groups.some(g => g.debuted) &&
      state.groups.filter(g => g.debuted).every(g =>
        g.members.every(id => state.people[id] && state.people[id].contract))) tally.contractStamped++;
  // the flagships census (v0.9.8): the era is contested now
  if (warLostSeen) tally.warLost++;
  if (huntSeen) tally.flagshipHunt++;
  if (state.groups.some(g => (g.releases || []).some(r => (r.chartPeak || 1) > 1))) tally.peakDenied++;
  // the constituency + the gamble census (v0.9.6)
  if (fusionTrySeen) tally.fusionTried++;
  if (fusionShiftSeen) tally.fusionShift++;
  if (fusionAcclaimSeen) tally.fusionAcclaim++;
  if (fusionFlopSeen) tally.fusionFlop++;
  if (truckSeen2) tally.truckParked++;
  // player actions write to state.inbox directly, not the weekly notes —
  // read the durable stamps, not the stream
  if (((state.commerceLedger || {}).fanMeetings || 0) >= 1) tally.fanMeetingHeld++;
  if (state.groups.some(g => g.lightstickWeek)) tally.lightstickOut++;
  // the year census (v0.9.5)
  if (festSeen) tally.festPlayed++;
  if (gayoSeen) tally.gayoStaged++;
  if (daesangSeen) tally.daesangWon++;
  if (daesangSnubSeen) tally.daesangSnubbed++;
  // the home circuit + the society census (v0.9.4)
  if (circuitSeen) tally.homeCircuit++;
  if (encoreSeen) tally.encoreEarned++;
  if ((state.industryFriends || []).length) tally.friendMade++;
  // coffeeTruck: the note rides flavor priority and the week's traffic
  // can trim it before this scan (v0.10.24's era notes land in the same
  // just-released weeks) — the durable banner in her history is the truth
  if (truckSeen || Object.values(state.people).some(p2 =>
    (p2.history || []).some(h => /coffee truck/.test(h.text)))) tally.coffeeTruck++;
  if (stanSeen) tally.seniorStan++;
  if (classSeen) tally.debutClass++;
  // the tracklist census (v0.7.5)
  const allReleases = state.groups.flatMap(gg => gg.releases || []);
  const credits = allReleases.flatMap(r => (r.tracklist || []).filter(tk => tk.credit));
  if (credits.some(tk => tk.credit.type === 'solo')) tally.soloCredit++;
  if (credits.some(tk => tk.credit.type === 'unit')) tally.unitCredit++;
  if (allReleases.some(r => r.sleeperTitle)) tally.sleeperHeard++;
  // the b-side and the reverse run (v0.11.1)
  if (allReleases.some(r => (r.bsides || []).some(b => b.charted && !b.late))) tally.bsideCharted++;
  if (allReleases.some(r => (r.bsides || []).some(b => b.late))) tally.bsideClimbed++;
  {
    const cl2 = state.catalogLedger || {};
    if ((cl2.bsideRevivals || 0) >= 1) tally.bsideRevived++;
    if ((cl2.nationalRevivals || 0) >= 1) tally.nationalRevived++;
    if ((cl2.pushes || 0) >= 1) tally.catalogPushed++;
    if ((cl2.pushPaid || 0) >= 1) tally.pushPaidOut++;
  }

  // memory census + guards (v0.6.0)
  guard((state.memory || []).length <= KP.C.MEMORY.cap, seed + ' memory over cap');
  (state.memory || []).forEach(n => guard(n.strength > 0 && n.strength <= 100 && n.key && n.subjectType,
    seed + ' malformed narrative ' + (n && n.key)));
  if (KP.liveNarratives(state).length >= 2) tally.memoryAlive++;
  if ((state.memory || []).some(n => n.subjectType === 'idol')) tally.idolNarrative++;

  // the national chart census (v0.5.0)
  if (state.national.entries.length >= 12) tally.nationalAlive++;
  const natPeaks = state.groups.flatMap(gg => (gg.releases || []).map(r => r.nationalPeak))
    .filter(p => p != null);
  if (natPeaks.some(p => p <= 20)) tally.natTopTwenty++;
  if (natPeaks.some(p => p <= 10)) tally.natTopTen++;
  if (natPeaks.some(p => p === 1)) tally.natNumberOne++;

  // rivals with faces (v0.4.3)
  const lostToRivals = Object.values(state.people).filter(p => p.status === 'rival' && !p.flags.rivalNative);
  if (lostToRivals.length >= 3) tally.boardLosses++;
  const onStageIds = new Set();
  state.rivals.forEach(r => (r.acts || []).forEach(a => (a.members || []).forEach(id => onStageIds.add(id))));
  if (lostToRivals.some(p => onStageIds.has(p.id))) tally.stolenOnStage++;
  if (state.chart.entries.length >= 3) tally.chartAlive++;
  if ((state.lifecycleEvents || 0) >= 1) tally.lifecycleSeen++;
  if (state.feed.length >= 25) tally.feedAlive++;
  if (playerTop3) tally.playerTopThree++;
  if (state.groups.some(gg => (gg.releases || []).length &&
      gg.results && (gg.results.crowd || 0) > 0)) tally.crowdedRelease++;
  {
    // end-state conflict census across roster pairs
    let negative = 0, pairCount = 0;
    for (let i = 0; i < state.roster.length; i++) {
      for (let j = i + 1; j < state.roster.length; j++) {
        const rel = state.relationships[
          KP.pairKey(state.people[state.roster[i]], state.people[state.roster[j]])];
        if (!rel) continue;
        pairCount++;
        const st = KP.relState(rel.score).key;
        if (st === 'tense' || st === 'conflict') negative++;
      }
    }
    if (pairCount && negative / pairCount > 0.3) tally.conflictEndemic++;
  }
  growths.push(avgRosterTalent(state) - startTalent);
  endBudgets.push(state.budget);
  // the price of fame (v0.9.14): a competent 140-week org banks a few
  // thousand — the stature bill governs the RATE, not the existence, of
  // wealth. The guard is an insanity ceiling; the plateau story is told
  // by tools/audit_longhaul at week 620.
  guard(state.budget < 10000, seed + ' budget ran away to ' + Math.round(state.budget) + ' by week 140');
}

function avgRosterTalent(state) {
  const roster = state.roster.map(id => state.people[id]);
  if (!roster.length) return 0;
  return roster.reduce((s, p) => s + KP.C.TALENTS.reduce((x, d) => x + p.talents[d].cur, 0) / 5, 0) / roster.length;
}

// --- report ---
console.log('=== Observatory — ' + SEEDS + ' seeds, 140 weeks each ===');
receptions.sort((a, b) => a - b);
endBudgets.sort((a, b) => a - b);
console.log('end-budget: median ' + Math.round(endBudgets[Math.floor(endBudgets.length / 2)] || 0) +
  ', max ' + Math.round(endBudgets[endBudgets.length - 1] || 0) + ' (wk140, the stature bill governs)');
const med = receptions[Math.floor(receptions.length / 2)] || 0;
console.log('debut reception: median ' + med +
  ', min ' + (receptions[0] || 0) + ', max ' + (receptions[receptions.length - 1] || 0));
console.log('releases per org: ' + (totalReleases / SEEDS).toFixed(1) + ' average; groups per org: ' + (totalGroups / SEEDS).toFixed(1));
console.log('medical throughput: ' + Object.keys(medSum).map(k => k + ' ' + medSum[k]).join(', ') + ' across ' + SEEDS + ' orgs (the flare chain; v0.11.2)');
// the last link, where the sample can carry it (v0.11.14): a chronic file
// flares at least once about a third of the time (measured on 200 careers:
// 35 files, flares in 12 careers), so twenty files and no flare is not luck
// (under 1 in 3,000); at 40 orgs there are 3 to 6 files and this is silent
if ((medSum.chronics || 0) >= 20) guard((medSum.flares || 0) >= 1, 'the flare chain: ' + medSum.chronics + ' chronic files across ' + SEEDS + ' orgs and not one flare');
console.log('reverse runs per org-year: ' + (totalRevivals / (SEEDS * 140 / 52)).toFixed(2) + ' (the lottery ticket stays a ticket under ~1; v0.11.1)');
console.log('festival slots missed, by cause: ' + (Object.entries(tally.festMissedWhy).map(([k, v]) => k + ' ' + v).join(' · ') || 'none') +
  ' across ' + SEEDS + ' orgs (a booked slot is a signed contract; v0.11.8)');
console.log('date ambushes per career: ' + (totalAmbushes / SEEDS).toFixed(1) + ' average (pettiness stays memorable, not constant)');
console.log('best overseas region at career end: ' + bestRegions.map(v => Math.round(v)).sort((a, b) => a - b).join(','));
console.log('save size after 140 weeks: ' + Math.round(totalSaveKB / SEEDS) + ' KB average, widest ' + maxSaveKB + ' KB (' + maxSaveSeed + '); most real people in one world ' + maxPeople + ' (quota ~5 MB)');
console.log('avg roster talent growth over the run: ' +
  (growths.reduce((a, b) => a + b, 0) / Math.max(1, growths.length)).toFixed(1) + ' pts');

// ---- the long clock (v0.9.0): 3 seeds × 380 weeks -----------------------
// The renewal window opens at year five (~week 246) and the seventh year
// ends at ~week 336 — both far beyond the 140-week census. This pass rides
// the clock the whole way: tables must open, the bot answers them with the
// shared renewal policy, departures resolve without breaking a single
// invariant, and the files stay open forever.
console.log('\n--- long-horizon pass: the seven-year clock (3 seeds x 380 weeks) ---');
{
  let clockTables = 0, clockRenewed = 0, clockLeavers = 0, clockDeparted = 0;
  let neglectDeparted = 0;
  // the long goodbye (v0.11.10, §101): the ledgers of the three careers, summed
  const byeSum = {};
  let byeLocks = 0, byeBowLetters = 0, byeStageLetters = 0;
  // across the street (v0.11.12, §103): the ledgers summed, the letters counted off the wire
  const acrSum = {};
  let acrSignLetters = 0, acrDebutLetters = 0, acrLifeLetters = 0, acrPending = 0, acrSoloActs = 0;
  let clockActs = 0, clockSoloActs = 0;   // the lineup rule, met by groups and by soloists (v0.11.14)
  let acrWire = 0, acrLanded = 0;         // her letters, on the wire and after the week's trim (v0.11.15)
  for (let s = 0; s < 3; s++) {
    const seed = 'clock-' + s;
    // seed 2 is the neglect org: it debuts a group and then never answers
    // a single scene again — tables expire, the ledger goes cold, and the
    // paper itself must run out (the anti-immortality rule)
    const neglect = s === 2;
    const state = KP.newGame(seed);
    const pool = state.roster.filter(id => state.people[id].gender === 'f').slice(0, 5);
    guard(pool.length === 5, seed + ' long clock: opening roster too small');
    const foundingAges = {};
    pool.forEach(id => { foundingAges[id] = state.people[id].age; });
    KP.proposeGroup(state, 'LONGRUN', pool, KP.roleHints(state, pool.map(i => state.people[i])));
    const g = state.groups[state.groups.length - 1];   // LONGRUN, not the legacy
    KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
      week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
    let seedTables = 0;
    for (let w = 0; w < 380; w++) {
      if (!neglect) (state.scenes || []).slice().forEach(sc => {
        if (sc.kind === 'sponsorSolo') {
        // a sensible boss lets the stage happen unless the face is worn
        const face = state.people[sc.personId];
        KP.resolveScene(state, sc.id, face && face.fatigue < 65 ? 'allow' : 'decline');
        return;
      }
      if (sc.kind === 'execQuestion') {
          // honest and boring: never promise what this slim bot won't ship
          KP.answerMeeting(state, sc.q && sc.q.type === 'comebackPromise' ? 1 : 0);
          return;
        }
        if (sc.kind === 'renewal') {
          clockTables++; seedTables++;
          const p = state.people[sc.personId];
          botRenewal(state, sc);
          if (p && p.contract && !p.contract.leaving) clockRenewed++;
          else if (p) clockLeavers++;
          return;
        }
        const def = KP.sceneDef(sc.kind);
        if (def) {
          const opts = def.options(state, sc);
          if (opts && opts.length) KP.resolveScene(state, sc.id, opts[0].id);
        }
      });
      // the red weeks (v0.11.0): the slim clock bot never plans comebacks,
      // so its balance pins at the monthly floor — which is now a death
      // sentence. The pass measures the seven-year PAPER, not the economy
      // (the economy's teeth are the main pass's guard and haul-insolvent),
      // so the books are kept whole here
      if (state.budget < 200) state.budget = 200;
      // the long goodbye (v0.11.10, §101): the slim clock bot plans no
      // comebacks, so a member on her lap would never get a last era. It
      // learns the one verb: when her window is open, or opens inside a
      // short runway, it locks a single that lands in it. A refusal (rest,
      // a record in flight) is tried again next week.
      if (!neglect && KP.farewellRead) {
        KP.farewellRead(state).forEach(r => {
          if (r.era !== 'open' || !r.groupId) return;
          const fg = KP.groupById(state, r.groupId);
          const land = Math.max(state.week + KP.C.DEBUT.prepWeeksMin, r.opens);
          if (!fg || fg.prep || land > r.ends || land - state.week > 8) return;
          if (!fg.demos) { const rg = KP.rngFor(state); fg.demos = KP.generateDemos(state, rg, fg); state.rngState = rg.state(); }
          state.budget = Math.max(state.budget, 400);   // the books are kept whole here, as above
          const res = KP.planDebut(state, { groupId: fg.id, songId: fg.demos[0].id, promo: 'modest', format: 'single', week: land,
            alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
          if (res.ok) byeLocks++;
        });
      }
      KP.advanceWeek(state);
      (KP.lastTickNotes || []).forEach(n => {
        if (n.ind === 'contractEnd' && n.shape === 'bow') byeBowLetters++;
        if (n.ind === 'lastStage') byeStageLetters++;
        if (n.ind === 'acrossSigned') acrSignLetters++;
        // the four letters about an artist who was ours, read AFTER the trim
        // too (v0.11.15): the wire said every one was written; nothing said
        // whether the week's budget of five kept it
        if (n.ind === 'acrossSigned' || n.ind === 'acrossDebut' || n.ind === 'alumAfter' || n.ind === 'soloEnded') {
          acrWire++;
          if ((state.inbox || []).some(m => m.ind === n.ind && m.personId === n.personId && m.week === state.week)) acrLanded++;
        }
        if (n.ind === 'acrossDebut') acrDebutLetters++;
        if (n.ind === 'alumAfter') acrLifeLetters++;
      });
      const errs = KP.validateState(state);
      guard(errs.length === 0, seed + ' long clock wk' + state.week + ': ' + errs[0]);
    }
    guard(neglect || seedTables >= 1, seed + ' long clock: no renewal table ever opened');
    // (budget telemetry lives on the MAIN pass — the slim clock bot
    // never plans comebacks, so its balance pins at the monthly floor
    // and measures nothing about the economy)
    // everyone who left this building, wherever she is now (v0.11.12, §103:
    // an alumna who debuted across the street is no longer 'departed')
    const departed = KP.alumniOf(state);
    clockDeparted += departed.length;
    Object.keys(state.farewellLedger || {}).forEach(k => { byeSum[k] = (byeSum[k] || 0) + state.farewellLedger[k]; });
    // every departed artist is on some act's list, or her act is gone with her
    departed.forEach(p => guard(state.groups.some(gg => (gg.alumni || []).some(al => al.id === p.id)) || !((p.chapters || []).some(ch => ch.kind === 'departed' && ch.group)),
      seed + ' a departed artist is on no act’s alumni list'));
    state.groups.forEach(gg => guard(!gg.retiredWeek || !gg.debuted || (gg.finalLineup || []).length > 0, seed + ' a concluded act has no final lineup: ' + gg.name));
    // across the street (v0.11.12, §103): every alumna whose date has
    // passed has a next chapter; one who debuted is in an act of the house
    // she belongs to, or has gone home with her file intact
    Object.keys(state.acrossLedger || {}).forEach(k => { acrSum[k] = (acrSum[k] || 0) + state.acrossLedger[k]; });
    const AC = KP.C.ACROSS;
    KP.alumniOf(state).forEach(p => {
      const f = p.flags || {};
      if (p.status === 'departed' && !f.across && !f.after) {
        acrPending++;
        guard(state.week <= (f.departedWeek || 0) + AC.waitMax + 1, seed + ' across: ' + p.id + ' left ' + (state.week - (f.departedWeek || 0)) + ' weeks ago and has no next chapter');
      }
      if (f.across && f.across.debutWeek != null) {
        guard(p.status === 'rival' || p.status === 'gone', seed + ' across: ' + p.id + ' debuted across the street and is ' + p.status);
        if (p.status === 'rival') {
          const house = (state.rivals || []).find(r => r.short === p.company);
          const act = house && (house.acts || []).find(a => (a.members || []).includes(p.id));
          guard(!!act, seed + ' across: ' + p.id + ' is a soloist at ' + p.company + ' in no act');
          if (act && !act.retired) acrSoloActs++;
        }
      }
      if (f.across && f.across.debutWeek == null) guard(p.status === 'departed' && state.week < f.across.debutAt + 1, seed + ' across: ' + p.id + ' signed and never debuted');
    });
    // every act still running is a real lineup by the engine's one rule
    // (v0.11.14): this pass debuts soloists on every run, so the rule and
    // a lineup of one meet here each time, not once in 200 census careers
    (state.rivals || []).forEach(r => (r.acts || []).forEach(a => {
      if (a.retired) return;
      clockActs++;
      if (a.solo) clockSoloActs++;
      guard(KP.actLineupOk(a), seed + ' long clock: rival act ' + a.name + ' has no real lineup (' + (a.members || []).length + (a.solo ? ', solo' : '') + ')');
    }));
    if (neglect) neglectDeparted = departed.length;
    departed.forEach(p => {
      guard(!state.roster.includes(p.id), seed + ' departed idol still on roster');
      guard(state.groups.every(gg => !gg.members.includes(p.id)), seed + ' departed idol still in a lineup');
      guard(!!p.flags.departedWeek, seed + ' departed file missing its date');
    });
    if (neglect) guard((Object.values(state.people)
      .some(p => (p.directed || []).some(d => d.kind === 'tableLeftWaiting'))) || departed.length,
      seed + ' neglect org: tables never even expired');
    // time passes (v0.9.1): 380 weeks is 7.9 years — every founder,
    // still here or long gone, crossed her birthday 7 or 8 times
    Object.keys(foundingAges).forEach(id => {
      const aged = state.people[id].age - foundingAges[id];
      guard(aged === 7 || aged === 8, seed + ' founder aged ' + aged + ' years in 7.9 (the clock slipped)');
    });
  }
  console.log('renewal tables opened: ' + clockTables + '  (renewed: ' + clockRenewed +
    ', chose to leave: ' + clockLeavers + ', departed by career end: ' + clockDeparted +
    '; the neglect org lost ' + neglectDeparted + ')');
  guard(clockTables >= 6, 'long clock: fewer than 6 renewal tables across the attentive careers');
  guard(clockRenewed >= 1, 'long clock: nobody ever re-signed');
  guard(neglectDeparted >= 1, 'long clock: the neglect org kept everyone — the paper never runs out');
  console.log('the long goodbye: laps ' + (byeSum.laps || 0) + ' · asked ' + (byeSum.asked || 0) + ' (told now ' + (byeSum.toldNow || 0) + ', kept in ' + (byeSum.keptIn || 0) +
    ', unanswered ' + (byeSum.unanswered || 0) + ') · told by the era ' + (byeSum.toldByEra || 0) + ' · last eras ' + (byeSum.eras || 0) + ' (locks ' + byeLocks + ') · countdown records ' + (byeSum.shadows || 0) +
    ' · last stages ' + (byeSum.lastStages || 0) + ' · exits: bow ' + (byeSum.bows || 0) + ', plain ' + (byeSum.plain || 0) + ', sudden ' + (byeSum.sudden || 0) +
    ' · promises kept ' + (byeSum.kept || 0) + ', broken ' + (byeSum.broken || 0));
  guard((byeSum.laps || 0) >= 1, 'the long goodbye: nobody chose to go across three long careers');
  guard((byeSum.eras || 0) >= 1, 'the long goodbye: no leaving member ever got her last era');
  guard((byeSum.bows || 0) >= 1 && byeBowLetters === byeSum.bows, 'the long goodbye: the bows on the ledger (' + (byeSum.bows || 0) + ') are not the bows on the wire (' + byeBowLetters + ')');
  guard(byeStageLetters === (byeSum.lastStages || 0), 'the long goodbye: the last stages on the ledger are not the ones on the wire');
  guard((byeSum.kept || 0) >= 1, 'the long goodbye: no promise of a last era was ever kept');
  console.log('across the street: clocks ' + (acrSum.clocked || 0) + ' · signed ' + (acrSum.signed || 0) + ' (bow ' + (acrSum.bow || 0) + ', plain ' + (acrSum.plain || 0) + ', released ' + (acrSum.released || 0) +
    ', sudden ' + (acrSum.sudden || 0) + ', cold ' + (acrSum.cold || 0) + ') · debuted ' + (acrSum.debuted || 0) + ' (friends who posted ' + (acrSum.friends || 0) + ') · lives outside ' + (acrSum.lives || 0) +
    ' (deals that fell ' + (acrSum.fell || 0) + ') · still to come ' + acrPending + ' · solo acts still running ' + acrSoloActs + ' · solo runs ended ' + (acrSum.ended || 0) +
    ' · her letters that reached the inbox ' + acrLanded + '/' + acrWire);
  // every one of these is high (v0.11.15: the life outside shipped normal and
  // the budget kept it 3 times in 5). A week with six highs can still cut
  // one; more than one in ten cut means a letter has lost its weight again
  guard(acrWire - acrLanded <= Math.max(1, Math.floor(acrWire / 10)),
    'across the street: ' + (acrWire - acrLanded) + ' of ' + acrWire + ' letters about a former artist were cut by the week’s budget');
  guard((acrSum.signed || 0) + (acrSum.lives || 0) >= 1, 'across the street: no departed artist ever got a next chapter across three long careers');
  guard(acrSignLetters === (acrSum.signed || 0) && acrDebutLetters === (acrSum.debuted || 0) && acrLifeLetters === (acrSum.lives || 0),
    'across the street: the ledger (' + (acrSum.signed || 0) + '/' + (acrSum.debuted || 0) + '/' + (acrSum.lives || 0) + ') is not the wire (' + acrSignLetters + '/' + acrDebutLetters + '/' + acrLifeLetters + ')');
  guard((acrSum.debuted || 0) <= (acrSum.signed || 0), 'across the street: more debuts than signings');
  // every solo debut is still running or ended in a soloist's words (v0.11.15):
  // the only two exits an act of one has both count here, so a third way
  // out, or an ending told as a group's, shows as a debut unaccounted for
  guard((acrSum.debuted || 0) === acrSoloActs + (acrSum.ended || 0),
    'across the street: ' + (acrSum.debuted || 0) + ' solo debuts, ' + acrSoloActs + ' still running and ' + (acrSum.ended || 0) + ' ended');
  console.log('lineups: ' + clockActs + ' acts still running at the end of the long careers, each a real lineup by the one rule · soloists among them ' + clockSoloActs);
  guard(clockSoloActs >= 1 && clockSoloActs === acrSoloActs, 'the lineup rule never met a soloist: ' + clockSoloActs + ' solo acts read, ' + acrSoloActs + ' alumnae in one');
}

// the last bow (v0.11.11, §102). The census bot never ends an act: ending
// one is a decision, not a policy, and no competent boss does it inside 140
// weeks. So the three doors are suite-held, and this pass rides each of
// them through a real career instead: the inherited act takes one door in
// week 10, the calendar runs on for a year and a half, and every week is
// validated. It measures that the rails conclude what the doors begin.
console.log('\n--- the last bow: three careers, one door each (3 seeds x 90 weeks) ---');
{
  const E = KP.C.ENDING;
  const out = [];
  ['record', 'concert', 'lapsed'].forEach((plan, i) => {
    const seed = 'lastbow-' + i;
    const state = KP.newGame(seed, null, { legacy: true });
    const g = state.groups.find(x => x.debuted);
    guard(!!g, seed + ' last bow: no inherited act');
    if (!g) return;
    const lineup = g.members.slice();
    let finals = 0, due = 0, took = null, locked = false, landed = null;
    for (let w = 0; w < 90; w++) {
      (state.scenes || []).slice().forEach(sc => {
        if (sc.kind === 'renewal') { botRenewal(state, sc); return; }
        if (sc.kind === 'execQuestion') { KP.answerMeeting(state, sc.q && sc.q.type === 'comebackPromise' ? 1 : 0); return; }
        const def = KP.sceneDef(sc.kind);
        if (def) { const opts = def.options(state, sc); if (opts && opts.length) KP.resolveScene(state, sc.id, opts[0].id); }
      });
      if (state.budget < 400) state.budget = 400;   // the books are kept whole: this pass measures the doors, not the economy
      if (!took && state.week >= 10 && !g.retiredWeek) {
        const read = KP.endingDoors(state, g.id);
        if (read.ok) {
          const want = plan === 'lapsed' ? 'record' : plan;
          const door = read.doors.find(d => d.id === want);
          const how = door && door.ok ? want : 'statement';
          const r = KP.endGroup(state, g.id, how);
          guard(r.ok, seed + ' last bow: an open door refused: ' + r.reason);
          if (r.ok) took = how;
        }
      }
      // the record career makes the record; the lapse career never does
      if (plan === 'record' && took === 'record' && !locked && !g.retiredWeek && !g.prep && !g.ending.record) {
        if (!g.demos) { const rg = KP.rngFor(state); g.demos = KP.generateDemos(state, rg, g); state.rngState = rg.state(); }
        const res = KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest', format: 'single', week: state.week + KP.C.DEBUT.prepWeeksMin,
          alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
        if (res.ok) locked = true;
      }
      KP.advanceWeek(state);
      (KP.lastTickNotes || []).forEach(n => {
        if (n.ind === 'playerDisband') { finals++; guard(n.priority === 'critical', seed + ' last bow: the final statement is not critical'); }
        if (n.ind === 'lastRecordDue') due++;
      });
      if (g.ending && g.ending.record && landed == null) landed = g.ending.record.week;
      const errs = KP.validateState(state);
      guard(errs.length === 0, seed + ' last bow wk' + state.week + ': ' + errs[0]);
    }
    const L = state.endingLedger || {};
    guard(!!took, seed + ' last bow: no door was ever open in 80 weeks');
    guard(!!g.retiredWeek, seed + ' last bow: the act never concluded (' + plan + ')');
    guard((g.finalLineup || []).length >= 1, seed + ' last bow: a concluded act has no final lineup');
    guard(!KP.endingRead(state).length, seed + ' last bow: an ending is still owed at the end of the pass');
    if (plan === 'record' && took === 'record') {
      const overtaken = g.ending.how === 'contract' || g.ending.how === 'story';
      guard(overtaken || (g.ending.how === 'record' && L.announced === 1 && L.records === 1 && L.closed === 1 && finals === 1),
        seed + ' last bow: the record door did not close as a record (' + JSON.stringify(g.ending) + ' ' + JSON.stringify(L) + ')');
      guard(overtaken || (!!g.afterglow && g.afterglow.mult === E.glowRecord), seed + ' last bow: no warm shelf after a farewell record');
    }
    if (plan === 'lapsed' && took === 'record') {
      const overtaken = g.ending.how === 'contract' || g.ending.how === 'story';
      guard(overtaken || (g.ending.how === 'lapsed' && L.lapsed === 1 && finals === 1 && due === 1 && !g.afterglow),
        seed + ' last bow: the unmade record did not lapse (' + JSON.stringify(g.ending) + ' ' + JSON.stringify(L) + ', due ' + due + ')');
      guard(overtaken || lineup.every(id => !state.people[id] || state.people[id].status !== 'idol' || (state.people[id].directed || []).some(d => d.kind === 'promiseBroken')),
        seed + ' last bow: a member of the lapsed act has no broken promise on her ledger');
    }
    if (took === 'concert') guard(g.ending.how === 'concert' && L.concerts === 1 && !!g.ending.night && !!g.afterglow, seed + ' last bow: the concert door did not close as a concert');
    out.push(plan + ': took ' + took + ', ' + (g.ending ? g.ending.how : '?') + ' wk ' + g.retiredWeek + (landed != null ? ' (landed wk ' + landed + ')' : '') +
      (g.ending && g.ending.night ? ' (till ' + g.ending.night.till + ' on a room of ' + g.ending.night.cost + ')' : '') +
      ', solos ' + (L.solos || 0));
  });
  out.forEach(l => console.log('  ' + l));
}

// the soloist's last page (v0.11.15). In seven years of the long clock no
// solo run ends (0 of 4), and suite_125 forces the roll. This pass rides both
// endings through a real career with the roll as shipped: an artist of the
// inherited act leaves in week 3 and is signed by the game's own verb (her
// clock's date is not waited for); the week's rail debuts her on her date;
// then her act is held cold, or past the seven-year wall, until the house
// lets it go at its own 5% or 3% a week. Every week is validated. The letter
// must be on the wire once, in a soloist's words, and in the inbox after the
// week's trim; her file must be stamped and the alumni line must read off it.
console.log('\n--- the soloist’s last page: two careers, one ending each (the roll as shipped) ---');
{
  const I = KP.C.INDUSTRY;
  const GROUPISH = /team activities|disband|the members/;
  ['cold', 'wall'].forEach(how => {
    const seed = 'solopage-' + how;
    const state = KP.newGame(seed, null, { legacy: true });
    const g = state.groups.find(x => x.debuted);
    guard(!!g, seed + ': no inherited act');
    if (!g) return;
    let p = null, act = null, letters = 0, landed = 0, text = '', leftWk = null, debutWk = null, endWk = null, after = 0;
    for (let w = 0; w < 520 && after < 4; w++) {
      (state.scenes || []).slice().forEach(sc => {
        if (sc.kind === 'renewal') { botRenewal(state, sc); return; }
        if (sc.kind === 'execQuestion') { KP.answerMeeting(state, sc.q && sc.q.type === 'comebackPromise' ? 1 : 0); return; }
        const def = KP.sceneDef(sc.kind);
        if (def) { const opts = def.options(state, sc); if (opts && opts.length) KP.resolveScene(state, sc.id, opts[0].id); }
      });
      if (state.budget < 400) state.budget = 400;   // the books are kept whole: this pass measures an ending, not the economy
      if (!p && state.week >= 3) {
        p = state.people[g.members[0]];
        KP.departIdol(state, p.id, 'cold', null);
        leftWk = state.week;
        const house = KP.signingHouses(state)[0];
        guard(!!house, seed + ': no house on the street to sign her');
        if (house) KP.acrossSign(state, p, house, []);
      }
      if (p && !act && p.status === 'rival') {
        const r = (state.rivals || []).find(x => x.short === p.company);
        act = r && (r.acts || []).find(a => (a.members || []).includes(p.id));
        debutWk = state.week;
      }
      if (act && !act.retired) {
        if (how === 'cold') { act.popularity = 0; act.debutWeek = Math.min(act.debutWeek, state.week - I.disbandMinAgeWeeks - 1); }
        else { act.popularity = 60; act.debutWeek = Math.min(act.debutWeek, state.week - I.ROOM.sevenYearWeeks - 1); }
      }
      KP.advanceWeek(state);
      (KP.lastTickNotes || []).forEach(n => {
        if (n.ind === 'disband' && act && n.actName === act.name) guard(false, seed + ': a soloist’s run was told as a group disbanding');
        if (n.ind !== 'soloEnded' || !p || n.personId !== p.id) return;
        letters++; text = n.text;
        if ((state.inbox || []).some(m => m.ind === 'soloEnded' && m.personId === p.id && m.week === state.week)) landed++;
      });
      if (act && act.retired) { if (endWk == null) endWk = state.week; after++; }
      const errs = KP.validateState(state);
      guard(errs.length === 0, seed + ' wk' + state.week + ': ' + errs[0]);
    }
    guard(!!act, seed + ': she never debuted across the street');
    guard(!!act && !!act.retired, seed + ': the solo run never ended in ten years at the shipped odds');
    if (!act || !act.retired) return;
    const ac = (p.flags || {}).across || {};
    guard(letters === 1 && landed === 1, seed + ': the ending was written ' + letters + ' times and reached the inbox ' + landed);
    guard(!!text && !GROUPISH.test(text) && text.includes(KP.displayName(p)), seed + ': the ending is not in a soloist’s words: ' + text);
    guard(p.status === 'gone' && KP.isAlum(state, p), seed + ': she is ' + p.status + ' and ' + (KP.isAlum(state, p) ? 'an alumna' : 'off the alumni list'));
    guard(ac.endedWeek === endWk && ac.endedHow === how && (state.acrossLedger || {}).ended === 1, seed + ': her file is not stamped (' + JSON.stringify(ac) + ')');
    guard(KP.whereNow(state, p).indexOf('home since ') === 0, seed + ': the alumni line reads “' + KP.whereNow(state, p) + '”');
    console.log('  ' + how + ': left wk ' + leftWk + ', debuted solo at ' + (ac.endedCo || ac.company) + ' wk ' + debutWk + ', the run ended wk ' + endWk +
      ' (' + (endWk - debutWk) + ' weeks, ' + (act.releases || []).length + ' records) · the letter reached the inbox · now: ' + KP.whereNow(state, p));
  });
}

// the mission (v0.11.13, §104): what the census's rooms did with it
console.log('\nthe mission: showcases ' + (missionSum.missions || 0) + ' (sheets ' + (missionSum.sheets || 0) + ') · trainee-months drilled whole ' + (missionSum.drilledFull || 0) +
  ' · sheets that named a climb for it ' + (missionSum.drilledClimbs || 0) + ' · moments told ' + (missionSum.moments || 0) + ' · months the line was crossed ' + (missionSum.lineCross || 0) +
  ' · after-eval talks ' + (missionSum.talks || 0));
// the talk and the slot (v0.11.14, §105)
console.log('the year’s sheet: read ' + yearSum.years + ' times · the year’s climb named ' + yearSum.climbs + ' · places on the sheets still on the wall ' + yearSum.rows +
  ' across ' + yearSum.sheets + ' (the longest ' + yearSum.max + ')');
// the Desk (v0.11.21, §112): the lines above count what the engine wrote;
// these two count what the week's budget let through, and name the rare
// letters it cuts. A one-shot written and cut is a violation.
deskCount.lines(DESK).forEach(l => console.log(l));
deskCount.cutOneShots(DESK).forEach(m => violations.push('a one-shot letter was written and cut by the week’s budget: ' + m));
deskCount.unannounced(DESK).forEach(m => violations.push('a decision opened unannounced, or its letter was cut: ' + m));
deskCount.heldCut(DESK).forEach(m => violations.push('a letter the week must hold was cut: ' + m));
deskCount.starved(DESK).forEach(m => violations.push('a high letter starves at the Desk, landing under one time in four: ' + m));
deskCount.buried(DESK).forEach(m => violations.push('a letter is buried at the Desk, landing under one time in ten: ' + m));
console.log('the heads: houses standing at the end ' + (wallSum.houses || 0) + ' (' + KP.HEAD_TEMPERS.map(k => k + ' ' + (wallSum['t_' + k] || 0)).join(' · ') +
  ') · heads stamped over the careers ' + (wallSum.stamped || 0) + ' · quoted in the yearly ranking ' + (wallSum.quotes || 0) + ' times in ' + (wallSum.rankings || 0) + ' rankings');
console.log('the books: acts recorded ' + (wallSum.acts || 0) + ' (' + Object.keys(KP.C.WALL.KINDS).map(k => k + ' ' + (wallSum['k_' + k] || 0)).join(' · ') +
  ') · houses with something on the books at the end ' + (wallSum.booked || 0) + ' of ' + (wallSum.houses || 0) +
  ' (' + KP.C.WALL.WORDS.map(row => row[1] + ' ' + (wallSum['w_' + row[1]] || 0)).join(' · ') + ')');
console.log('the weight: dates parked on by a house ' + (wallSum.parks || 0) + ' · for something on the books ' + (wallSum.parksBooks || 0) +
  ' · on its head’s temper ' + (wallSum.parksTemper || 0) + ' · for the calendar alone ' + ((wallSum.parks || 0) - (wallSum.parksBooks || 0) - (wallSum.parksTemper || 0)) +
  ' · not the grandest house in reach ' + (wallSum.parksMoved || 0));
console.log('the letterhead: staff calls ' + (wallSum.calls || 0) + ' · from a house with something against us ' + (wallSum.callsBooks || 0) +
  ' · on its head’s temper ' + (wallSum.callsTemper || 0) + ' · matched, and on its books ' + (wallSum.k_weKeptOurStaff || 0) + ' · hired away ' + (wallSum.k_theyHiredOurStaff || 0));
console.log('the truce: a head called ' + (wallSum.truceCalls || 0) + ' times · shaken on ' + (wallSum.truces || 0) + ' · declined or unanswered ' + (wallSum.truceDeclined || 0) +
  ' · broken by a signing ' + (wallSum.trucesBroken || 0) + ' · ran their year ' + (wallSum.trucesRun || 0) + ' · in force at the end ' + (wallSum.truceOn || 0));
console.log('her own questions: asked ' + (upSum.asked || 0) + ' · put on the record ' + (upSum.promised || 0) + ' · passed ' + (upSum.passed || 0) +
  ' (a second in a row ' + (upSum.passedTwice || 0) + ', none charged · with the red weeks running ' + (upSum.passedUrgent || 0) + ', each charged) · overtaken before the answer ' + (upSum.overtaken || 0) +
  ' · kept ' + (upSum.met || 0) + ' (in part, next door to the year’s sound ' + (upSum.nextDoor || 0) + ') · broken ' + (upSum.missed || 0) +
  ' · set aside ' + (upSum.void || 0) + ' · on the clock at the end ' + (upSum.open || 0));
console.log('  by question: ' + Object.keys(upSum.types).map(k => ({ execQuarter: 'the quarter', execVoice: 'the voice', execByName: 'the name', execSound: 'the sound', execRemember: 'the record' }[k] || k) +
  ' asked ' + upSum.types[k].asked + ' (kept ' + upSum.types[k].met + ', broken ' + upSum.types[k].missed + ')').join(' · '));
console.log('a pass without a toll (v0.11.51): ' + ownSum.passes + ' passes on her own questions, each held to this tool’s own note of the till’s ladder that morning · ' + ownSum.urgent +
  ' with the red weeks running, each charged one · ' + (ownSum.passes - ownSum.urgent) + ' charged nothing');
console.log('the sound next door (v0.11.51): ' + SOUND.judged + ' promises on the sound of the year judged, each held to this tool’s own reading of the record · ' + SOUND.inIt + ' in the year’s sound, kept · ' +
  SOUND.nextDoor + ' next door, kept in part · ' + SOUND.far + ' further off, broken · ' + SOUND.noRecord + ' with no record inside the year · ' + SOUND.setAside + ' set aside');
console.log('the annual review: given ' + (upSum.reviews || 0) + ' times · ' + ['trusted', 'solid', 'watched', 'thin', 'gone'].map(k => k + ' ' + ((upSum.bands || {})[k] || 0)).join(' · '));
console.log('the company’s file: chapters ' + (fileSum.chapters || 0) + ' · under this desk ' + (fileSum.mine || 0) + ' · ' +
  ['debut', 'numberOne', 'trophy', 'award', 'daesang', 'settlement', 'lastBow', 'fold', 'chair', 'breakthrough', 'red', 'redCleared'].map(k => k + ' ' + (fileSum['k_' + k] || 0)).join(' · '));
console.log('  the manager’s title at the end: ' + ['A&R Manager', 'Senior A&R Manager', 'Head of A&R', 'Executive Producer', 'Founder'].map(k => k + ' ' + (fileSum['t_' + k] || 0)).join(' · '));
console.log('the year’s close: years closed ' + (closeSum.years || 0) + ' · with a headline ' + (closeSum.headline || 0) + ' · with the year’s sum ' + (closeSum.sums || 0) + ' · records ' + (closeSum.records || 0) +
  ' · trophies ' + (closeSum.trophies || 0) + ' · honors ' + (closeSum.honors || 0) + ' · debuts ' + (closeSum.debuts || 0) + ' · signed ' + (closeSum.signed || 0) + ' · left ' + (closeSum.left || 0) + ' · last bows ' + (closeSum.bows || 0));
console.log('the written record: marks ' + (recSum.marks || 0) + ' · the night of this desk’s first trophy ' + (recSum.k_trophy || 0) + ' · the red weeks ' + (recSum.k_red || 0) +
  ' (cleared ' + (recSum.k_redCleared || 0) + ') · a new chair ' + (recSum.k_chair || 0) + ' · the breakthrough ' + (recSum.k_breakthrough || 0));
console.log('the quiet: told the rest was in ' + (quietSum.rested || 0) + ' · told the bank was full ' + (quietSum.full || 0) +
  ' · a member on a break told she was rested ' + (quietSum.breakRested || 0) + ' · acts still parked at the end ' + (quietSum.parked || 0));
console.log('the posting: lists ' + (postSum.posted || 0) + ' · the month’s first left off ' + (postSum.offMonth || 0) + ' · the year’s first left off ' + (postSum.offYear || 0) +
  ' · locked into the project and dropped ' + (postSum.dropped || 0) + ' · came to the desk about it ' + (postSum.knocks || 0) + ' (told why ' + (postSum.why || 0) +
  ', promised the next ' + (postSum.next || 0) + ', the list is the list ' + (postSum.nothing || 0) + ', left in the doorway ' + (postSum.unanswered || 0) + ')');
console.log('the talk: called ' + (missionSum.talks || 0) + ' · asked ' + (missionSum.talkAsked || 0) + ' (left with the coaches ' + (missionSum.talkCoaches || 0) + ', said straight ' + (missionSum.talkStraight || 0) +
  ', a month one on one ' + (missionSum.talkRoom || 0) + ', unanswered ' + (missionSum.talkUnanswered || 0) + ') · never asked, held by the coaches ' + (missionSum.talkUnasked || 0) +
  ' · the month one on one: off the bottom ' + (missionSum.coachClimbs || 0) + ', still there ' + (missionSum.coachMisses || 0) +
  ' · closing slots given ' + (missionSum.slots || 0) + ' (a custom holder passed over ' + (missionSum.slotSnubs || 0) + ')');

// age census: 15-16 the norm, 14 a hard floor (owner's law, v0.3.1)
const ageMean = allAges.reduce((a, b) => a + b, 0) / allAges.length;
const age19frac = allAges.filter(a => a >= 19).length / allAges.length;
console.log('generated-pool age: mean ' + ageMean.toFixed(1) + ', ' +
  Math.round(age19frac * 100) + '% aged 19+');
console.log('sit-downs run by the auto-player: ' + mediationsRun);
let alarms = 0;
if (allAges.some(a => a < 14)) { alarms++; console.error('AGE ALARM: someone under the 14 floor'); }
if (ageMean < 16.0 || ageMean > 17.2) { alarms++; console.error('AGE ALARM: mean out of [16.0, 17.2]'); }
if (age19frac > 0.22) { alarms++; console.error('AGE ALARM: 19+ share floods above 22%'); }
Object.keys(BANDS).forEach(k => {
  const frac = tally[k] / SEEDS;
  const b = BANDS[k];
  const status = frac < b.lo ? 'EXTINCT' : frac > b.hi ? 'FLOOD' : 'ok';
  if (status !== 'ok') alarms++;
  console.log(pad(b.label, 42) + pad((tally[k] + '/' + SEEDS), 8) +
    'band [' + Math.round(b.lo * 100) + '%–' + Math.round(b.hi * 100) + '%]  ' + status);
});
function pad(s, n) { s = String(s); return s + ' '.repeat(Math.max(1, n - s.length)); }

if (violations.length) {
  console.error('\n=== HARD INVARIANT VIOLATIONS (' + violations.length + ') ===');
  violations.slice(0, 20).forEach(v => console.error('  ✗ ' + v));
  process.exit(1);
}
if (alarms) {
  console.error('\n=== ' + alarms + ' CENSUS ALARM(S) — review bands above ===');
  process.exit(1);
}
console.log('\n=== SOAK CLEAN: no invariant violations, all census bands alive ===');
