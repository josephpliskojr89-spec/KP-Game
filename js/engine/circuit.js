/* The world circuit (v0.10.9, §80 finding 13) — the overseas promo
   wing. Between tours the far markets are not passive: convention
   festivals and TV one-offs arrive region-keyed, priced in travel
   bills and weekend fatigue, and gated by the tongue — a stage with
   nobody to carry the interviews lands at half weight with the
   awkward clip attached. The English version joins the JP-version
   lane: the hit re-cut for the west, cheap, warming NA and EU at
   once. Circuit gains feed the next tour's routing through region
   warmth — the one truth the map already keeps. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.circuitLedger = state.circuitLedger ||
      { invites: 0, played: 0, declined: 0, tongueFlops: 0, enCuts: 0 };
    return state.circuitLedger;
  }
  KP.circuitLedger = ledger;

  const CONS = {
    cn: ['the Harbour Lights Showcase', 'the Golden Coast K-Night'],
    sea: ['Island Wave Manila', 'K-Fest Bangkok', 'the Merlion Stage'],
    na: ['K-Wave Con Dallas', 'Neon Bridge LA', 'the Northern Lights Showcase'],
    latam: ['Ola Coreana CDMX', 'the São Paulo Hallyu Night'],
    eu: ['Hallyu Expo Berlin', 'Seoul Nights Paris', 'the Thames K-Fest'],
  };

  // ---- the invite --------------------------------------------------------
  KP.registerScene('circuitInvite', {
    title: (state, sc) => sc.con + ' · the invite',
    body: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      const C = KP.C.CIRCUIT;
      const bill = C.travelBase + (C.travelFar[sc.regionId] || 5);
      return sc.con + ' wants ' + (g ? g.name : 'the group') + ' on the ' +
        KP.regionLabel(sc.regionId) + ' stage — a convention slot, a weekend of flights, ' +
        'and a room full of people who found this group through a screen and are about to find out ' +
        'they are real. The bill is ' + bill + ' against a ' + C.fee + ' fee. This is how the far markets ' +
        'actually open for a label this size: one weekend at a time, between the tours that money buys later.';
    },
    options: () => [
      { id: 'accept', label: 'Take the stage' },
      { id: 'decline', label: 'Pass' },
    ],
    resolve: (state, sc, optionId) => {
      const led = ledger(state);
      const g = KP.groupById(state, sc.groupId);
      const C = KP.C.CIRCUIT;
      if (optionId !== 'accept' || !g) {
        led.declined++;
        return { toast: 'Passed. The far markets wait — they are patient, and they are also not waiting for you specifically.' };
      }
      const bill = C.travelBase + (C.travelFar[sc.regionId] || 5);
      if (state.budget < bill) { led.declined++; return { toast: 'The flights alone outran the account.' }; }
      state.budget -= bill + 0;
      state.budget += C.fee;
      if (KP.ledgerFlow) KP.ledgerFlow(state, 'appearances', C.fee - bill);
      led.played++;
      const voice = KP.voiceAbroad ? KP.voiceAbroad(state, g, sc.regionId) : null;
      const regions = KP.regionsOf(g);
      const gain = voice ? C.warmthGain : Math.round(C.warmthGain * C.tongueDamp);
      regions[sc.regionId] = KP.clamp((regions[sc.regionId] || 0) + gain, 0, 100);
      g.members.map(id => state.people[id]).filter(Boolean).forEach(m => {
        if (!KP.onBreak(m)) m.fatigue = KP.clamp(m.fatigue + C.fatigue, 0, 100);
      });
      if (!voice) led.tongueFlops++;
      KP.note(state, { kind: 'public', ind: voice ? 'circuitStage' : 'circuitFlop',
        priority: 'high', groupId: g.id,
        text: voice
          ? g.name + ' played ' + sc.con + ' — ' + KP.displayName(voice) + ' ran the talk segments in the room’s own language and the convention hall sang the fanchant back on the first try. ' + KP.regionLabel(sc.regionId) + ' is a little less far away this week. The next tour’s routing meeting just got a new pin.'
          : g.name + ' played ' + sc.con + ' — the stage landed, the interview did not: every answer through an interpreter, the pauses long enough to clip, and the clip is circulating with subtitles nobody at the company approved. ' + KP.regionLabel(sc.regionId) + ' warmed anyway. Half as much as it should have.' });
      return { toast: voice ? 'The weekend paid in a market. That is the whole circuit.' : 'The stage landed; the interviews limped. The tongue is a line item now.' };
    },
    expire: (state, sc) => { ledger(state).declined++; return null; },
  });

  // ---- the English version -----------------------------------------------
  KP.cutEnglishVersion = function (state, groupId) {
    const E = KP.C.CIRCUIT.EN;
    const g = KP.groups(state).find(x => x.id === groupId);
    if (!g || !g.debuted || g.retiredWeek) return { ok: false, reason: 'The lane is for a debuted act.' };
    if (g.prep || g.tour || g.hiatus || g.jpAway) return { ok: false, reason: 'The calendar is spoken for.' };
    if (state.week <= (g.promoUntil || 0)) return { ok: false, reason: 'Mid-promotion — the version drops between eras.' };
    const last = (g.releases || [])[g.releases ? g.releases.length - 1 : 0];
    if (!last || (last.reception || 0) < E.minRec) {
      return { ok: false, reason: 'The version lane re-cuts a HIT. The last record does not travel at this weight.' };
    }
    if (state.week - (g.lastEnWeek || -999) < E.cooldown) {
      return { ok: false, reason: 'The last version is still working the playlists.' };
    }
    if (state.budget < E.cost) return { ok: false, reason: 'The re-cut bills up front — ' + E.cost + '.' };
    state.budget -= E.cost;
    if (KP.ledgerFlow) KP.ledgerFlow(state, 'production', -E.cost);
    g.lastEnWeek = state.week;
    const voice = KP.voiceAbroad ? KP.voiceAbroad(state, g, 'na') : null;
    const regions = KP.regionsOf(g);
    const gain = voice ? E.warmth : Math.round(E.warmth * KP.C.CIRCUIT.tongueDamp);
    regions.na = KP.clamp((regions.na || 0) + gain, 0, 100);
    regions.eu = KP.clamp((regions.eu || 0) + gain, 0, 100);
    const revenue = Math.round((last.reception || 0) * E.rev);
    state.budget += revenue;
    if (KP.ledgerFlow) KP.ledgerFlow(state, 'streams', revenue);
    if (KP.settleShare) KP.settleShare(state, g, revenue);
    ledger(state).enCuts++;
    KP.note(state, { kind: 'public', ind: 'enVersion', priority: 'high', groupId: g.id,
      text: '“' + last.songTitle + '” (English Ver.) is out — the hit re-cut for the west, ' +
        (voice ? 'with ' + KP.displayName(voice) + '’s pronunciation earning genuine surprise in the reaction videos'
               : 'the pronunciation debate already three threads deep, which is also promotion') +
        '. ' + revenue + ' off the playlists, and two far corners of the map warmed at once. Cheap, effective, and every A&R team pretends to be above it right up until the quarter needs it.' });
    return { ok: true, revenue };
  };

  // ---- the week ----------------------------------------------------------
  KP.registerWeekly('circuit', 748, function (state, rng, inbox) {
    const C = KP.C.CIRCUIT;
    if ((state.scenes || []).some(sc => sc.kind === 'circuitInvite')) return;
    if (!rng.chance(C.inviteChance)) return;
    const cands = [];
    KP.groups(state).forEach(g => {
      if (!g.debuted || g.retiredWeek || g.prep || g.tour || g.hiatus || g.jpAway) return;
      if ((g.popularity || 0) < C.minPop) return;
      const regions = KP.regionsOf(g);
      Object.keys(CONS).forEach(rid => {
        if ((regions[rid] || 0) >= C.minWarmth) cands.push({ g, rid });
      });
    });
    if (!cands.length) return;
    const pick = cands[rng.int(0, cands.length - 1)];
    const cons = CONS[pick.rid];
    const con = cons[rng.int(0, cons.length - 1)];
    ledger(state).invites++;
    KP.openScene(state, { kind: 'circuitInvite', groupId: pick.g.id,
      regionId: pick.rid, con, expiresWeek: state.week + 2 });
    inbox.push({ kind: 'industry', ind: 'circuitInviteIn', priority: 'high', groupId: pick.g.id,
      text: 'An invite from ' + con + ': a ' + KP.regionLabel(pick.rid) + ' convention slot for ' +
        pick.g.name + '. The far markets open one weekend at a time, and the weekends have dates on them. The table is on the Desk.' });
  });

  // ---- the timeline reacts -----------------------------------------------
  KP.onFeedEvent('circuitStage', (state, n, rng) => rng.chance(0.5) ? rng.pick([
    { persona: 'fan', text: 'convention footage: three thousand people who learned korean from lyrics singing every word back. the world is smaller than the industry maps say' },
    { persona: 'casual', text: 'the overseas convention circuit is how groups actually break markets between tours and it gets covered like a hobby. those rooms BUY TICKETS later' },
  ]) : null);
  KP.onFeedEvent('circuitFlop', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'the interpreter-pause clip is making the rounds again. the stage was great! the interview was a hostage video! languages are part of the job now, somebody tell the training rooms' },
    { persona: 'fan', text: 'protecting them from the awkward-interview clip with my LIFE. learn the language or bring the member who did, agencies. we keep saying this' },
  ]));
  KP.onFeedEvent('enVersion', (state, n, rng) => rng.chance(0.5) ? rng.pick([
    { persona: 'casual', text: 'the english version pipeline: mock it, skip it, watch it chart in two markets you have no other road into, release one next quarter. the cycle of acceptance' },
    { persona: 'stan', text: 'the english ver is out and yes we are streaming both versions. they count separately. we checked. we always check' },
  ]) : null);
})(typeof window !== 'undefined' ? window : globalThis);
