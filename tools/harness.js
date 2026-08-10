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
  fiscalNoticed:     { lo: 0.00, hi: 0.85, label: 'orgs whose books got noticed (mature economies stay solvent)' },
  hypeSeen:          { lo: 0.30, hi: 1.00, label: 'orgs where the internet found someone' },
  directiveFired:    { lo: 0.02, hi: 0.80, label: 'orgs that drew a hype directive' },
  soloDebuts:        { lo: 0.02, hi: 0.60, label: 'orgs that debuted a solo act' },
  fiscalWarned:      { lo: 0.00, hi: 0.35, label: 'orgs warned at trust-hitting level (2+)' },
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
  showDarling:       { lo: 0.00, hi: 0.70, label: 'worlds where a stage became somebody\'s (darling narrative)' },
  regionLoud:        { lo: 0.20, hi: 1.00, label: 'orgs that got loud in at least one overseas region' },
  regionStory:       { lo: 0.10, hi: 1.00, label: 'orgs whose overseas market became a story (the long game pays)' },
  conceptCanon:      { lo: 0.10, hi: 1.00, label: 'orgs whose group earned a concept identity (the sound IS the group)' },
  toured:            { lo: 0.20, hi: 1.00, label: 'orgs that took a tour on the road' },
  tourSoldOut:       { lo: 0.05, hi: 1.00, label: 'orgs that sold a leg out in minutes' },
  tourSoft:          { lo: 0.00, hi: 0.80, label: 'orgs that played to curtained-off sections' },
  gaffeSeen:         { lo: 0.02, hi: 0.90, label: 'worlds where a posting incident trended' },
  fandomNamed:       { lo: 0.30, hi: 1.00, label: 'orgs whose fandom got its name' },
  dealSigned:        { lo: 0.10, hi: 1.00, label: 'orgs that signed a brand deal' },
  awardWon:          { lo: 0.05, hi: 1.00, label: 'orgs that took a year-end award home' },
  awardSnubbed:      { lo: 0.00, hi: 0.90, label: 'orgs that watched someone else win (the radicalizer)' },
  bubbleSeen:        { lo: 0.50, hi: 1.00, label: 'worlds where bubble screenshots reached the feed' },
  meetingKept:       { lo: 0.05, hi: 1.00, label: 'orgs that kept a Monday-meeting promise on the record' },
  ambitionMet:       { lo: 0.05, hi: 1.00, label: 'worlds where somebody got the thing she always wanted' },
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
  bubbleSeen: 0, meetingKept: 0, ambitionMet: 0,
};
let totalGroups = 0;
let totalAmbushes = 0;
const bestRegions = [];
let totalSaveKB = 0;
let mediationsRun = 0;
let totalReleases = 0;
const receptions = [];
const growths = [];
const allAges = [];
let violations = [];

function guard(cond, msg) { if (!cond) violations.push(msg); }

for (let s = 0; s < SEEDS; s++) {
  const seed = 'soak-' + s;
  const state = KP.newGame(seed);
  const scout = KP.DATA.evaluators[2];
  let burnoutSeen = false;

  const startTalent = avgRosterTalent(state);
  // age census measures the scouting pipeline — rival idols run older by design
  Object.values(state.people).forEach(p => { if (p.status !== 'rival') allAges.push(p.age); });
  let sawFriction = false;
  let pressureSeen = false;
  let pressureWarned = false;
  let hypeSeen = false, directiveSeen = false, soloProposed = false;
  let playerTop3 = false;
  let warAnnounceSeen = false, warAmbushSeen = false, warBattleSeen = false, warWonSeen = false;
  let tourSoldOutSeen = false, tourSoftSeen = false, awardSnubSeen = false;
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
    // form the first group around week 20; a second lineup once the first
    // has debuted and the trainee room can field one (v0.2.2)
    const wantSecond = state.groups.length === 1 && state.groups[0].debuted &&
      state.week >= 70 && KP.freeTrainees(state).length >= 4 && state.budget > 120;
    if ((!state.groups.length && state.week >= 20 && state.roster.length >= 5) || wantSecond) {
      const size = state.groups.length ? 4 : 5;
      const pool = KP.freeTrainees(state).map(id => state.people[id])
        .map(p => ({ p, v: KP.C.TALENTS.reduce((sum, d) => sum + KP.perceived(state, p, d, scout), 0) }))
        .sort((a, b) => b.v - a.v).slice(0, size).map(x => x.p);
      if (pool.length >= 4) {
        const hints = KP.roleHints(state, pool);
        const name = KP.suggestGroupNames(state, KP.rngFor(state))[0] + (state.groups.length ? ' II' : '');
        KP.proposeGroup(state, name, pool.map(m => m.id), hints);
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

    // the Monday meeting (v0.7.1): the bot answers with its best read —
    // and promises comebacks like someone who knows their own calendar
    if (state.execQuestion) {
      const q = state.execQuestion;
      if (q.type === 'comebackPromise') {
        const g = KP.groupById(state, q.groupId);
        const reopens = g ? Math.max((g.promoUntil || 0) + KP.C.COMEBACK.restWeeks, g.tourRestUntil || 0) : state.week;
        const canThisQuarter = reopens + 6 <= state.week + KP.C.MEETING.quarterWeeks;
        KP.answerMeeting(state, canThisQuarter ? 0 : 1);
      } else {
        KP.answerMeeting(state, 0);
      }
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
      const spot = T.SCALES[scale].sweetSpot;
      const legs = ['kr'].concat(warm.filter(o => o.demand >= spot * T.softBelow)
        .slice(0, 2).map(o => o.id));
      KP.planTour(state, { groupId: g.id, scale, legs, pacing: 'humane', setlist: 'hits' });
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
      if (g.debuted) {
        const avgF = g.members.reduce((s, id) => s + state.people[id].fatigue, 0) / g.members.length;
        if (avgF >= 45) return;
      }
      const promoAffordable = (!g.debuted || state.budget > 60) ? 'standard' : 'modest';
      const fmtCost = KP.C.DEBUT.FORMATS[0].cost;
      // the rollout desk bills at lock (v0.6.3) — a player trims the plan
      // before skipping the release, so the bot does too
      const R = KP.C.ROLLOUT;
      const planCost = p => p.flat().reduce((s, a) => s + R.ACTIVITIES[a].cost, 0);
      const thrifty = [['radio', 'livestream'], ['radio', 'livestream'], ['radio', 'livestream'], ['rest']];
      const wantDefault = state.budget > KP.C.DEBUT.promoCost[promoAffordable] + fmtCost + planCost(R.DEFAULT) + 20;
      const rollout = wantDefault ? R.DEFAULT.map(w => w.slice()) : thrifty;
      if (state.budget <= KP.C.DEBUT.promoCost[promoAffordable] + fmtCost + planCost(rollout)) return;
      if (!g.demos) {
        const rng = KP.rngFor(state);
        g.demos = KP.generateDemos(state, rng, g);
        state.rngState = rng.state();
      }
      const demo = g.demos.slice().sort((a, b) => b.hook - a.hook)[0];
      const targetWeek = g.debuted
        ? state.week + 5   // comebacks ride short runways — long preps grind people (v0.4.2)
        : (state.objective.type === 'debutGirlGroup' && state.objective.status === 'open'
          ? Math.min(state.week + 8, state.objective.deadlineWeek) : state.week + 8);
      KP.planDebut(state, {
        groupId: g.id, songId: demo.id, conceptId: demo.conceptId, promo: promoAffordable,
        week: targetWeek, rollout,
        alloc: { vocals: 30, dance: 30, rap: 10, media: 30 },
      });
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
    });
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
  const g = state.groups[0];
  guard(!!(g && g.debuted && g.results), seed + ' auto-player failed to reach a debut');
  if (state.groups.length >= 2) tally.secondGroup++;
  totalGroups += state.groups.length;
  guard((state.objectiveHistory || []).length >= 1, seed + ' the objective ladder never advanced');
  if (g && g.debuted) {
    guard(g.members.map(id => state.people[id])
      .every(p => p.fatigue <= 90 || g.prep || state.week <= (g.promoUntil || 0)),
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
  if (state.groups.some(g => g.regions &&
      Object.values(g.regions).some(v => v >= KP.C.REGIONAL.loudAt))) tally.regionLoud++;
  bestRegions.push(Math.max.apply(null, state.groups
    .filter(g => g.regions).flatMap(g => Object.values(g.regions)).concat([0])));
  if ((state.memory || []).some(n => n.key === 'regionStronghold')) tally.regionStory++;
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
  if ((state.execNotes || []).some(c => c.resolved === 'met')) tally.meetingKept++;
  if (Object.values(state.people).some(p => p.flags && p.flags.ambitionMet)) tally.ambitionMet++;

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
}

function avgRosterTalent(state) {
  const roster = state.roster.map(id => state.people[id]);
  if (!roster.length) return 0;
  return roster.reduce((s, p) => s + KP.C.TALENTS.reduce((x, d) => x + p.talents[d].cur, 0) / 5, 0) / roster.length;
}

// --- report ---
console.log('=== Observatory — ' + SEEDS + ' seeds, 140 weeks each ===');
receptions.sort((a, b) => a - b);
const med = receptions[Math.floor(receptions.length / 2)] || 0;
console.log('debut reception: median ' + med +
  ', min ' + (receptions[0] || 0) + ', max ' + (receptions[receptions.length - 1] || 0));
console.log('releases per org: ' + (totalReleases / SEEDS).toFixed(1) + ' average; groups per org: ' + (totalGroups / SEEDS).toFixed(1));
console.log('date ambushes per career: ' + (totalAmbushes / SEEDS).toFixed(1) + ' average (pettiness stays memorable, not constant)');
console.log('best overseas region at career end: ' + bestRegions.map(v => Math.round(v)).sort((a, b) => a - b).join(','));
console.log('save size after 140 weeks: ' + Math.round(totalSaveKB / SEEDS) + ' KB average (quota ~5 MB)');
console.log('avg roster talent growth over the run: ' +
  (growths.reduce((a, b) => a + b, 0) / Math.max(1, growths.length)).toFixed(1) + ' pts');

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
