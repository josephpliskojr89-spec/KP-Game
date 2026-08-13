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

// alive-and-plausible bands, as fraction of seeds
const BANDS = {
  sensation:         { lo: 0.02, hi: 0.30, label: 'sensation debuts' },
  strongPlus:        { lo: 0.15, hi: 0.75, label: 'strong-or-better debuts' },
  missOrQuiet:       { lo: 0.05, hi: 0.55, label: 'quiet/miss debuts' },
  nonCenterBreakout: { lo: 0.10, hi: 0.65, label: 'public picked a non-center breakout' },
  rivalSteals:       { lo: 0.30, hi: 1.00, label: 'rivals signed >=1 prospect' },
  burnouts:          { lo: 0.00, hi: 0.45, label: 'orgs with a burnout incident' },
  instinctSigning:   { lo: 0.00, hi: 1.00, label: 'scout instinct notes seen' },
  frictionSeen:      { lo: 0.20, hi: 1.00, label: 'orgs that saw real friction' },
  conflictEndemic:   { lo: 0.00, hi: 0.25, label: 'orgs ending conflict-heavy (>30% pairs)' },
  multiRelease:      { lo: 0.70, hi: 1.00, label: 'orgs with >=2 releases (the loop loops)' },
  chartTopTen:       { lo: 0.20, hi: 1.00, label: 'orgs whose first group hit #1 on the scene chart' },
  popAlive:          { lo: 0.50, hi: 1.00, label: 'orgs ending with a warm-or-better fanbase' },
  secondGroup:       { lo: 0.30, hi: 1.00, label: 'orgs that launched a second group' },
  // ceiling 0.85→0.95 by ruling (v0.9.14): mature acts now carry real
  // costs (stature bills, retainers, sponsor obligations) — the CEO
  // reading the books most careers is the price-of-fame WORKING. The
  // meaningful alarm is the trust-hitting escalation band below.
  fiscalNoticed:     { lo: 0.00, hi: 0.95, label: 'orgs whose books got noticed (mature economies stay solvent)' },
  hypeSeen:          { lo: 0.30, hi: 1.00, label: 'orgs where the internet found someone' },
  directiveFired:    { lo: 0.02, hi: 0.80, label: 'orgs that drew a hype directive' },
  // ceiling raised 0.60→0.75 in v0.8.4: the executive pet project now
  // DEMANDS a solo debut in most careers (39/40 assigned) — more solos
  // is the designed consequence, not drift
  soloDebuts:        { lo: 0.02, hi: 0.75, label: 'orgs that debuted a solo act' },
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
  fiscalWarned:      { lo: 0.00, hi: 0.75, label: 'orgs warned at trust-hitting level (2+)' },
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
  natNumberOne:      { lo: 0.00, hi: 0.40, label: 'orgs that topped the national chart (the summit stays rare)' },
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
  catalogRevived:    { lo: 0.02, hi: 0.75, label: 'orgs whose catalog track reverse-charted (the lottery ticket)' },
  viralSourced:      { lo: 0.50, hi: 1.00, label: 'orgs whose viral moments carry provenance (the clip has a stage)' },
  obligationMissed:  { lo: 0.00, hi: 0.80, label: 'orgs that missed a sponsored appearance (the road won)' },
  dealClawedBack:    { lo: 0.00, hi: 0.50, label: 'orgs a brand terminated for cause (two misses)' },
  soloRequested:     { lo: 0.05, hi: 1.00, label: 'orgs that got the sponsor solo request' },
  soloAllowed:       { lo: 0.00, hi: 1.00, label: 'orgs that let the solo stage happen' },
  // the practice room years + the regional schools (v0.9.16). Floors on
  // the rare arcs (quit, aging-out, last-chance) open at 0 for the first
  // soak and tighten once measured — the ceilings are the day-one alarms.
  // the title fight (v0.9.17). The producer-cooling path runs dormant in
  // soak by construction — the bot picks the best hook, which IS the
  // push — so that band opens floor 0 (suite-held, watch human play).
  // the gravity (v0.9.18). Floors open low/zero on the rare arcs for the
  // first soak; ceilings are the day-one alarms.
  clamorBegan:       { lo: 0.05, hi: 1.00, label: 'orgs where the transcendence clamor began (the trades feature)' },
  clamorSettled:     { lo: 0.00, hi: 1.00, label: 'orgs that settled a clamor with the in-group solo' },
  clamorHeld:        { lo: 0.00, hi: 0.90, label: 'orgs that held a transcendent and paid the resentment clock' },
  soloKnocked:       { lo: 0.00, hi: 1.00, label: 'orgs where she knocked with the rehearsed ask' },
  slumpSeen:         { lo: 0.00, hi: 0.80, label: 'orgs where somebody lost the nerve (the slump)' },
  footingFound:      { lo: 0.00, hi: 0.80, label: 'orgs where the nerve came back (the footing)' },
  arcMinted:         { lo: 0.02, hi: 1.00, label: 'orgs that minted a group identity arc (icons/variety/OST)' },
  memberDemoSeen:    { lo: 0.20, hi: 1.00, label: 'orgs whose meeting carried a member-written demo' },
  memberTitleChosen: { lo: 0.00, hi: 0.90, label: 'orgs that chose her song as the title track' },
  producerCooled:    { lo: 0.00, hi: 0.80, label: 'orgs a snubbed producer stopped sending good hooks' },
  repackaged:        { lo: 0.05, hi: 1.00, label: 'orgs that extended an era with a repackage' },
  mvCinema:          { lo: 0.02, hi: 1.00, label: 'orgs that shot a cinema-budget video' },
  mvPlain:           { lo: 0.00, hi: 0.90, label: 'orgs that shipped the performance cut (the internet noticed)' },
  schoolLead:        { lo: 0.60, hi: 1.00, label: 'orgs whose board carried a school-stamped file' },
  schoolClass:       { lo: 0.30, hi: 1.00, label: 'worlds where a school sent its class to an open casting' },
  schoolTrip:        { lo: 0.30, hi: 1.00, label: 'orgs that took the scouting trip (the train to the regions)' },
  schoolPartner:     { lo: 0.20, hi: 1.00, label: 'orgs that signed a first-look school partnership' },
  schoolHot:         { lo: 0.00, hi: 0.60, label: 'worlds where a school got HOT off its graduates' },
  evalHeld:          { lo: 0.80, hi: 1.00, label: 'orgs whose practice room held evaluation days' },
  projectTalkSeen:   { lo: 0.10, hi: 1.00, label: 'orgs where an open project set the practice room talking' },
  traineeQuitAsked:  { lo: 0.00, hi: 0.80, label: 'orgs where a trainee brought the resignation letter' },
  traineeGone:       { lo: 0.00, hi: 0.80, label: 'orgs that lost a trainee on her own terms (quit or broken promise)' },
  agingOutFaced:     { lo: 0.00, hi: 1.00, label: 'orgs where the aging-out clock got loud' },
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
  hiatusCooled:      { lo: 0.00, hi: 1.00, label: 'orgs that stayed gone past the grace window (the forgetting)' },
  gigWrapped:        { lo: 0.10, hi: 1.00, label: 'orgs where a full gig run wrapped with a sendoff' },
  ostDropped:        { lo: 0.05, hi: 1.00, label: 'orgs whose idol dropped a drama OST' },
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
  industryCongrats:  { lo: 0.02, hi: 1.00, label: 'orgs whose idol congratulated a friend in public' },
  // v0.9.5 — the year (floors provisional on first soak)
  festPlayed:        { lo: 0.50, hi: 1.00, label: 'orgs that played the university festival circuit' },
  gayoStaged:        { lo: 0.20, hi: 1.00, label: 'orgs that closed a year on the gayo stage' },
  // the summit stays rare — same law as natNumberOne
  daesangWon:        { lo: 0.00, hi: 0.45, label: 'orgs that took the daesang home' },
  daesangSnubbed:    { lo: 0.00, hi: 0.90, label: 'orgs shortlisted that watched the daesang go elsewhere' },
  // v0.9.6 — the gamble + the constituency (floors provisional; ~35% of
  // orgs run a fusion second group by construction)
  fusionTried:       { lo: 0.10, hi: 0.60, label: 'orgs that released a genre mash' },
  fusionShift:       { lo: 0.00, hi: 0.40, label: 'orgs whose mash changed the industry (the textbook entry stays rare)' },
  fusionAcclaim:     { lo: 0.00, hi: 0.60, label: 'orgs with a critics-loved, public-shrugged mash' },
  fusionFlop:        { lo: 0.00, hi: 0.70, label: 'orgs whose mash ate itself' },
  // floor 0 by ruling: trucks need an organized fandom AND a grievance —
  // the competent bot rarely supplies the grievance (same physics as
  // discourseBoiled); the mechanism is suite-proven
  truckParked:       { lo: 0.00, hi: 0.80, label: 'orgs that found a protest truck outside' },
  fanMeetingHeld:    { lo: 0.30, hi: 1.00, label: 'orgs that held a fan meeting' },
  lightstickOut:     { lo: 0.30, hi: 1.00, label: 'orgs that launched the lightstick' },
  // v0.9.8 — the flagships. The owner's report ("every release straight
  // to #1, never lost a head to head") becomes a censused guarantee:
  // a real share of careers must lose weeks and miss the top slot.
  warLost:           { lo: 0.25, hi: 1.00, label: 'orgs that LOST a head-to-head week (the era is contested)' },
  flagshipHunt:      { lo: 0.30, hi: 1.00, label: 'worlds where a flagship openly hunted the leader' },
  peakDenied:        { lo: 0.25, hi: 1.00, label: 'orgs with a release that missed #1 on the scene chart' },
};

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
  slumpSeen: 0, footingFound: 0, arcMinted: 0,
  memberDemoSeen: 0, memberTitleChosen: 0, producerCooled: 0,
  repackaged: 0, mvCinema: 0, mvPlain: 0,
  schoolLead: 0, schoolClass: 0, schoolTrip: 0, schoolPartner: 0, schoolHot: 0,
  evalHeld: 0, projectTalkSeen: 0, traineeQuitAsked: 0, traineeGone: 0,
  agingOutFaced: 0, lastChanceSeen: 0,
  bubbleSeen: 0, meetingKept: 0, ambitionMet: 0,
  peopleFelt: 0, quietWeekCaught: 0,
  soloCredit: 0, unitCredit: 0, sleeperHeard: 0,
  doorKnocked: 0, askPromiseKept: 0, momentChoiceSeen: 0, doorLeftWaiting: 0,
  annivFelt: 0, scarCarried: 0,
  boysSigned: 0, boyGroupFormed: 0, staffNamed: 0, boardFaced: 0, petAssigned: 0,
  contractStamped: 0,
  homeCircuit: 0, encoreEarned: 0, friendMade: 0, coffeeTruck: 0,
  seniorStan: 0, debutClass: 0, industryCongrats: 0,
  festPlayed: 0, gayoStaged: 0, daesangWon: 0, daesangSnubbed: 0,
  fusionTried: 0, fusionShift: 0, fusionAcclaim: 0, fusionFlop: 0,
  truckParked: 0, fanMeetingHeld: 0, lightstickOut: 0,
  warLost: 0, flagshipHunt: 0, peakDenied: 0,
};
let totalGroups = 0;
let totalAmbushes = 0;
const bestRegions = [];
const endBudgets = [];
let totalSaveKB = 0;
let mediationsRun = 0;
let totalReleases = 0;
const receptions = [];
const growths = [];
const allAges = [];
let violations = [];

function guard(cond, msg) { if (!cond) violations.push(msg); }

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

for (let s = 0; s < SEEDS; s++) {
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
  let pressureWarned = false;
  let hypeSeen = false, directiveSeen = false, soloProposed = false;
  let playerTop3 = false;
  let warAnnounceSeen = false, warAmbushSeen = false, warBattleSeen = false, warWonSeen = false;
  let personMomentWeeks = 0, quietWeekSeen = false;
  let doorKnockSeen = false, momentChoiceWasSeen = false, doorWaitSeen = false;
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
    // --- auto-player policy (perceived reads only) ---
    // pre-debut: use the tutorial allowance; post-cap: restock the trainee
    // room when it runs thin and the books allow (v0.2.3)
    const wantSign = KP.signingsCapped(state)
      ? (state.week <= 3 && state.signingsUsed < state.signingsAllowed)
      : (KP.freeTrainees(state).length < 4 && state.budget > 150);
    if (wantSign) {
      const ranked = state.prospects.map(id => state.people[id])
        .map(p => ({ p, v: KP.C.TALENTS.reduce((sum, d) => sum + KP.perceived(state, p, d, scout), 0) }))
        .sort((a, b) => b.v - a.v);
      if (ranked.length && state.budget > KP.signCost(state, ranked[0].p) + 60) {
        KP.signProspect(state, ranked[0].p.id);
      }
    }
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
      const pool = (mPool.length >= 4 && (fPool.length < 4 || sum(mPool) > sum(fPool)) ? mPool : fPool)
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
    KP.openDealOffers(state).forEach(o => KP.respondDeal(state, o.id, true));

    // the second job (v0.9.11): a sensible boss books the gig when the
    // idol has room — and pulls her out once the misses start stacking
    // against a long remaining run (the controlled exit beats the recast)
    KP.openGigOffers(state).forEach(o => {
      const p = state.people[o.personId];
      const g = p && KP.groupOf(state, p.id);
      const busy = g && (g.prep || g.tour);
      KP.respondGig(state, o.id, !!(p && !busy && p.fatigue < 55));
    });
    KP.activeGigs(state).forEach(gig => {
      if ((gig.strain || 0) >= KP.C.GIGS.strainRecastAt - 1 && gig.weeksLeft > 4) {
        KP.quitGig(state, gig.id);
      }
    });

    // the disappearance (v0.9.12): a boss who reads the fatigue sheet
    // parks a worn group ON PURPOSE — announced rest beats idle waiting
    state.groups.forEach(g => {
      if (!g.debuted || g.prep || g.tour || g.hiatus) return;
      if (state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) return;
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
        // is the mechanism under test
        KP.resolveScene(state, sc.id, 'promise');
        return;
      }
      if (sc.kind === 'quietEra') {
        const p = state.people[sc.personId];
        KP.resolveScene(state, sc.id, p && p.fatigue > 50 ? 'shield' : 'push');
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
      const def = KP.sceneDef(sc.kind);
      if (def) KP.resolveScene(state, sc.id, def.options(state, sc)[0].id);
    });

    // the company's voice (v0.9.6): launch the lightstick the moment the
    // market team clears it; hold a fan meeting when flush — the engine
    // gates cooldowns and calendars
    state.groups.forEach(g => {
      if (!g.debuted || !g.fandom || !g.fandom.name) return;
      if (!g.lightstickWeek) KP.launchLightstick(state, g.id);
      if (state.budget > 150) KP.fanMeeting(state, g.id);
    });

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
      if ((state.deals || []).some(d => d.weeksLeft > 0 &&
          g.members.includes(d.personId) &&
          (d.nextObligationWeek || 0) <= state.week + 4)) return;
      const spot = T.SCALES[scale].sweetSpot;
      const legs = ['kr'].concat(warm.filter(o => o.demand >= spot * T.softBelow)
        .slice(0, 2).map(o => o.id));
      KP.planTour(state, { groupId: g.id, scale, legs, pacing: 'humane', setlist: 'hits' });
    });

    // the era extends (v0.9.17): a boss with a hot record and a stocked
    // drawer repackages inside the window — the fandom budgets for it
    state.groups.forEach(g => {
      if (g.prep || g.tour || !g.debuted) return;
      if ((state.fiscal || {}).pressure > 0) return;
      const last = (g.releases || [])[(g.releases || []).length - 1];
      if (!last || (last.format || 'single') === 'single' || last.repackageOf) return;
      if ((last.reception || 0) < 62) return;
      if (state.week <= (g.promoUntil || 0) || state.week > (g.promoUntil || 0) + KP.C.REPACKAGE.windowWeeks) return;
      const drawer = (g.eraLeftovers || []).slice().sort((a, b) => b.hook - a.hook);
      if (!drawer.length || state.budget < 200) return;
      KP.planRepackage(state, { groupId: g.id, songId: drawer[0].id });
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
      KP.planDebut(state, {
        groupId: g.id, songId: demo.id, conceptId: g.concept === 'fusion' ? 'fusion' : demo.conceptId, promo: promoAffordable,
        week: targetWeek, rollout, format: fmt.id,
        alloc: { vocals: 30, dance: 30, rap: 10, media: 30 },
        mv: mvTier,
        mash,
      });
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
      if (n.ind === 'industryCongrats') congratsSeen = true;
    });
    // the people census (v0.7.4): the spotlight lands most weeks
    if (notes.some(n => n.moment)) personMomentWeeks++;
    if (notes.some(n => n.moment === 'quietWeek')) quietWeekSeen = true;
    // the door census (v0.8.2)
    if (notes.some(n => /asked for a minute of your time/.test(n.text))) doorKnockSeen = true;
    if (notes.some(n => n.choice)) momentChoiceWasSeen = true;
    if (notes.some(n => /stopped waiting|stopped asking for that minute/.test(n.text))) doorWaitSeen = true;
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
    guard(state.rivals.length >= I.minRivals && state.rivals.length <= I.maxRivals,
      seed + ' rival count out of bounds: ' + state.rivals.length);
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
        guard(r.nationalPeak >= r.chartPeak,
          seed + ' national peak better than scene peak — impossible in a superset field (' +
          r.nationalPeak + ' vs ' + r.chartPeak + ')');
      }
    }));

    // rivals with faces (v0.4.3): every active act is made of real people
    state.rivals.forEach(r => (r.acts || []).forEach(a => {
      if (a.retired) return;
      guard((a.members || []).length >= KP.C.INDUSTRY.actSize[0],
        seed + ' rival act ' + a.name + ' has no real lineup');
      (a.members || []).forEach(id => guard(state.people[id] && state.people[id].status === 'rival',
        seed + ' rival act member ' + id + ' missing or mis-statused'));
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
  guard(!!(g && g.debuted), seed + ' auto-player failed to reach a debut');
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
  if (pressureWarned) tally.fiscalWarned++;
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
  // save-size telemetry (v0.5.1): bloat must not sneak up on the quota
  const sizeKB = KP.saveSizeKB(state);
  guard(sizeKB <= 400, seed + ' save size runaway: ' + sizeKB + ' KB after 140 weeks');
  totalSaveKB += sizeKB;

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
  if (state.firstShowWinWeek) tally.showFirstWin++;
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
  if ((state.memory || []).some(n => ['festivalIcons', 'varietyGroup', 'ostFactory'].includes(n.key))) tally.arcMinted++;
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
  const pl = state.practiceLedger || {};
  if ((pl.evals || 0) >= 1) tally.evalHeld++;
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
  if ((state.deals || []).length || Object.values(state.people).some(p => (p.dealCount || 0) > 0)) tally.dealSigned++;
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
  if (doorWaitSeen) tally.doorLeftWaiting++;
  if (annivSeen) tally.annivFelt++;
  if (scarSeen) tally.scarCarried++;
  // the building + boy groups census (v0.8.4)
  if (state.roster.some(id => state.people[id].gender === 'm')) tally.boysSigned++;
  if (state.groups.some(g => g.gender === 'm')) tally.boyGroupFormed++;
  if (state.groups.filter(g => g.debuted).every(g => KP.managerOf(state, g)) &&
      state.groups.some(g => g.debuted)) tally.staffNamed++;
  if ((state.convoLog || []).some(e => e.kind === 'boardSeason')) tally.boardFaced++;
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
  if (state.groups.some(g => g.fanMeetingQuiet)) tally.fanMeetingHeld++;
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
  if (truckSeen) tally.coffeeTruck++;
  if (stanSeen) tally.seniorStan++;
  if (classSeen) tally.debutClass++;
  if (congratsSeen) tally.industryCongrats++;
  // the tracklist census (v0.7.5)
  const allReleases = state.groups.flatMap(gg => gg.releases || []);
  const credits = allReleases.flatMap(r => (r.tracklist || []).filter(tk => tk.credit));
  if (credits.some(tk => tk.credit.type === 'solo')) tally.soloCredit++;
  if (credits.some(tk => tk.credit.type === 'unit')) tally.unitCredit++;
  if (allReleases.some(r => r.sleeperTitle)) tally.sleeperHeard++;

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
console.log('date ambushes per career: ' + (totalAmbushes / SEEDS).toFixed(1) + ' average (pettiness stays memorable, not constant)');
console.log('best overseas region at career end: ' + bestRegions.map(v => Math.round(v)).sort((a, b) => a - b).join(','));
console.log('save size after 140 weeks: ' + Math.round(totalSaveKB / SEEDS) + ' KB average (quota ~5 MB)');
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
      KP.advanceWeek(state);
      const errs = KP.validateState(state);
      guard(errs.length === 0, seed + ' long clock wk' + state.week + ': ' + errs[0]);
    }
    guard(neglect || seedTables >= 1, seed + ' long clock: no renewal table ever opened');
    // (budget telemetry lives on the MAIN pass — the slim clock bot
    // never plans comebacks, so its balance pins at the monthly floor
    // and measures nothing about the economy)
    const departed = Object.values(state.people).filter(p => p.status === 'departed');
    clockDeparted += departed.length;
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
}

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
