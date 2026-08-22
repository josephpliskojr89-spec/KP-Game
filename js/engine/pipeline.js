/* The making (v0.10.4, §80 finding 5) — the production pipeline.
   Prep stops being an opaque countdown: the runway auto-schedules
   STATIONS — recording (with the line-distribution card the fandom
   audits), choreo creation (a NAMED choreographer whose difficulty
   the stage pays for), the MV shoot (a fatigue spike and the on-set
   clip lottery), the jacket shoot. Stations slip when the people
   they need are benched, and slippage inside the final stretch is a
   DECISION — postpone (the notice nobody wants to write; expectation
   cools) or crunch (keep the date; the medical desk watches the
   room). The LAW: slippage is never silent. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.pipeLedger = state.pipeLedger ||
      { stationsRun: 0, recSlips: 0, slipScenes: 0, postponed: 0, crunched: 0,
        clips: 0, lineCards: 0, lineWars: 0, hardEras: 0 };
    return state.pipeLedger;
  }
  KP.pipeLedger = ledger;

  // ---- the named choreographers, like the writers' room ----------------
  const CH_WORD = ['Aera', 'Haneul', 'Mook', 'Sable', 'Nari', 'Onda',
    'Kwon', 'Reign', 'Vera', 'Ilsan', 'Pace', 'June'];
  const CH_STYLES = [
    { id: 'precision', word: 'precision drill-work', base: 62 },
    { id: 'theatrical', word: 'theatrical staging', base: 56 },
    { id: 'minimal', word: 'minimal gesture-first movement', base: 46 },
    { id: 'athletic', word: 'athletic full-out choreography', base: 70 },
  ];
  function h(state, key) { return KP.hash01([state.seed, 'choreopool', key].join('|')); }
  KP.choreographersOf = function (state) {
    if (!state.choreoPool) {
      state.choreoPool = [];
      const taken = new Set();
      for (let i = 0; i < KP.C.PIPE.choreoCount; i++) {
        let name = null;
        for (let salt = 0; salt < 8 && (!name || taken.has(name)); salt++) {
          const w = CH_WORD[Math.floor(h(state, i + 'n' + salt) * CH_WORD.length)];
          const form = Math.floor(h(state, i + 'f' + salt) * 3);
          name = form === 0 ? w + ' Lim' : form === 1 ? '"' + w.toUpperCase() + '"' : w + '-ssaem';
        }
        taken.add(name);
        const style = CH_STYLES[Math.floor(h(state, i + 's') * CH_STYLES.length)];
        state.choreoPool.push({ id: 'ch' + i, name, style: style.id, works: [] });
      }
    }
    return state.choreoPool;
  };
  KP.choreographerById = function (state, id) {
    return KP.choreographersOf(state).find(c => c.id === id) || null;
  };

  // ---- the schedule: stations placed on the runway ---------------------
  function scheduleStations(state, g) {
    const P = KP.C.PIPE;
    const runway = Math.max(1, g.prep.scheduledWeek - state.week);
    const order = ['recording', 'choreo', 'mv', 'jacket'];
    const used = new Set();
    const cap = Math.max(state.week + 1, g.prep.scheduledWeek - 1);
    g.prep.stations = order.map(id => {
      let w = Math.min(cap, state.week + Math.max(1, Math.round(runway * P.place[id])));
      while (used.has(w) && w < cap) w++;   // short runways stack; the last
      used.add(w);                          // prep week absorbs the overflow
      return { id, week: w, done: 0 };
    });
  }
  function shiftAfter(prep, fromWeek, by) {
    prep.stations.forEach(st => { if (!st.done && st.week >= fromWeek) st.week += by; });
  }

  // ---- the line card: one decision the fandom litigates ----------------
  KP.registerScene('lineCard', {
    title: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      return (g ? g.name : 'The record') + ' · line distribution';
    },
    body: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      return 'Recording week for ' + (g ? g.name : 'the group') + ', and the producer slides one sheet ' +
        'across the desk: the line distribution. Who opens, who carries the chorus, who gets eight ' +
        'seconds and a look. The fandom will time every second of this with a stopwatch, because they ' +
        'always do. The sheet is one decision, and it is yours to duck or make.';
    },
    options: () => [
      { id: 'trust', label: 'The producer calls it' },
      { id: 'spread', label: 'Every voice on the record' },
      { id: 'center', label: 'Front-load the ace' },
    ],
    resolve: (state, sc, optionId) => {
      const g = KP.groupById(state, sc.groupId);
      if (!g || !g.prep) return { toast: 'The session moved on without the sheet.' };
      const choice = ['trust', 'spread', 'center'].includes(optionId) ? optionId : 'trust';
      g.prep.lineCard = choice;
      ledger(state).lineCards++;
      const members = g.members.map(id => state.people[id]).filter(Boolean);
      if (choice === 'spread') {
        members.forEach(m => { m.morale = KP.clamp(m.morale + 2, 0, 100); });
        return { toast: 'Every voice gets its bars. The room is warmer; the hook is more crowded.' };
      }
      if (choice === 'center') {
        const ace = state.people[g.roles && g.roles.center] || members[0];
        if (ace) ace.hype = KP.clamp((ace.hype || 0) + 4, 0, 100);
        const thin = members.filter(m => m.id !== (ace && ace.id))
          .sort((a, b) => a.talents.vocals.cur - b.talents.vocals.cur)[0];
        if (thin && thin.personality.professionalism < 45) {
          KP.recordDirected(state, thin.id, 'linesCut', -1);
          thin.history.push({ week: state.week, text: 'Saw the line distribution sheet. Counted ' +
            'the seconds. Said nothing in the room, which is not the same as saying nothing.' });
        }
        return { toast: 'The ace carries it. The hook will hit — and somebody counted her own seconds.' };
      }
      return { toast: 'The producer’s sheet stands. Nobody’s feelings were consulted, which is a kind of fairness.' };
    },
    expire: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      if (g && g.prep) { g.prep.lineCard = 'trust'; ledger(state).lineCards++; }
      return null;
    },
  });

  // ---- the slip: postpone or crunch ------------------------------------
  KP.registerScene('theSlip', {
    title: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      return (g ? g.name : 'The era') + ' · the schedule slipped';
    },
    body: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      return 'The production board for ' + (g ? g.name : 'the group') + ' has a red column: ' +
        (sc.station === 'recording' ? 'the recording session slipped — the booth needs a healthy lead vocal and did not get one.'
          : 'the ' + sc.station + ' station slipped.') +
        ' The release date is ' + (g ? Math.max(0, g.prep.scheduledWeek - state.week) : '?') + ' week(s) out. ' +
        'Two doors: crunch the remaining stations into the calendar that is left — the members pay in hours — ' +
        'or postpone, and write the notice every fandom reads as a confession.';
    },
    options: () => [
      { id: 'crunch', label: 'Hold the date — crunch' },
      { id: 'postpone', label: 'Postpone the release' },
    ],
    resolve: (state, sc, optionId) => {
      const g = KP.groupById(state, sc.groupId);
      if (!g || !g.prep) return { toast: 'The date resolved itself while the room argued.' };
      const P = KP.C.PIPE;
      if (optionId === 'postpone') {
        g.prep.scheduledWeek += P.postponeWeeks;
        shiftAfter(g.prep, state.week, P.postponeWeeks);
        if (g.prep.campaign) g.prep.campaign.momentum = Math.max(0, (g.prep.campaign.momentum || 0) - P.postponeBuildup);
        ledger(state).postponed++;
        KP.note(state, { kind: 'public', ind: 'postponed', priority: 'high', groupId: g.id,
          text: 'The notice went up in the flat font companies use for bad news: ' + g.name + '’s comeback moves back ' +
            P.postponeWeeks + ' weeks "to ensure the highest quality." The fandom read it in one second flat: something slipped. The wait cools what the teasers warmed.' });
        return { toast: 'Postponed. The notice is up; the heat leaks; the room breathes.' };
      }
      // crunch: keep the date, compress everything left into now
      g.prep.stations.forEach(st => { if (!st.done) st.week = Math.min(st.week, state.week + 1); });
      g.prep.crunchUntil = g.prep.scheduledWeek;
      g.members.map(id => state.people[id]).filter(Boolean).forEach(m => {
        if (KP.onBreak(m)) return;
        m.fatigue = KP.clamp(m.fatigue + P.crunchFatigue, 0, 100);
      });
      ledger(state).crunched++;
      KP.note(state, { kind: 'company', ind: 'crunched', priority: 'high', groupId: g.id,
        text: 'The date holds. The remaining stations for ' + g.name + ' collapse into one calendar column and the vans run late all week. Everyone in the building knows what this costs; the schedule is the only one not asked to pay.' });
      return { toast: 'The date holds. The room pays. The medical desk has been notified.' };
    },
    expire: (state, sc) => {
      // nobody decided; the calendar decided — the industry default is crunch
      const g = KP.groupById(state, sc.groupId);
      if (g && g.prep) {
        g.prep.stations.forEach(st => { if (!st.done) st.week = Math.min(st.week, state.week + 1); });
        g.prep.crunchUntil = g.prep.scheduledWeek;
        ledger(state).crunched++;
      }
      return null;
    },
  });

  // ---- the week: stations resolve --------------------------------------
  KP.registerWeekly('pipeline', 120, function (state, rng, inbox) {
    const P = KP.C.PIPE;
    const led = ledger(state);
    KP.groups(state).forEach(g => {
      if (!g.prep) return;
      if (!g.prep.stations) scheduleStations(state, g);
      const members = g.members.map(id => state.people[id]).filter(Boolean);
      g.prep.stations.forEach(st => {
        if (st.done || st.week > state.week) return;
        // -- recording: the booth needs a healthy lead vocal ------------
        if (st.id === 'recording') {
          const lead = members.filter(m => m.status !== 'released')
            .sort((a, b) => b.talents.vocals.cur - a.talents.vocals.cur)[0];
          if (lead && (KP.onBreak(lead) || lead.fatigue >= P.recSickFatigue) &&
              state.week < g.prep.scheduledWeek - 1) {
            st.week++;
            led.recSlips++;
            const stretch = g.prep.scheduledWeek - state.week <= P.finalStretch;
            if (stretch && !g.prep.slipAsked &&
                !(state.scenes || []).some(sc => sc.kind === 'theSlip')) {
              g.prep.slipAsked = 1;
              led.slipScenes++;
              KP.openScene(state, { kind: 'theSlip', groupId: g.id, station: 'recording',
                expiresWeek: state.week + 2 });
            } else if (!stretch) {
              inbox.push({ kind: 'company', ind: 'stationSlip', priority: 'flavor', groupId: g.id,
                text: 'Recording for ' + g.name + ' pushed a week — ' + KP.displayName(lead) +
                  '’s voice needs the days more than the booth does. The board absorbs it. For now.' });
            }
            return;
          }
          st.done = 1; led.stationsRun++;
          inbox.push({ kind: 'company', ind: 'stationRecorded', priority: 'flavor', groupId: g.id,
            text: 'Recording week for ' + g.name + ': the booth ran late, the guide vocal died a hundred deaths, and the title track exists now in a way it did not on Monday.' });
          if (!(state.scenes || []).some(sc => sc.kind === 'lineCard')) {
            KP.openScene(state, { kind: 'lineCard', groupId: g.id, expiresWeek: state.week + 2 });
          }
          return;
        }
        // -- choreo: the named hire defines the stage bill --------------
        if (st.id === 'choreo') {
          st.done = 1; led.stationsRun++;
          const pool = KP.choreographersOf(state);
          const pick = pool[Math.floor(rng.next() * pool.length)];
          const style = CH_STYLES.find(s => s.id === pick.style);
          const demo = (g.demos || []).find(d => d.id === g.prep.songId) || {};
          const difficulty = KP.clamp(Math.round(
            (demo.choreoPotential || 50) * 0.5 + style.base * 0.5 + rng.int(-6, 6)), 30, 92);
          g.prep.choreo = { id: pick.id, name: pick.name, style: pick.style, difficulty };
          if (difficulty >= P.diffHard) led.hardEras++;
          inbox.push({ kind: 'company', ind: 'stationChoreo', priority: 'flavor', groupId: g.id,
            text: pick.name + ' delivered the ' + g.name + ' choreography — ' + style.word +
              (difficulty >= P.diffHard
                ? ', and it is PUNISHING. The practice-room mirror fogged by noon. If the room can land it, the stage will talk about it; if it can’t, the stage will also talk about it.'
                : '. Teachable, filmable, safe on a tired week — the kind of eight-count a long promo run forgives.') });
          return;
        }
        // -- the MV shoot: the spike and the lottery --------------------
        if (st.id === 'mv') {
          st.done = 1; led.stationsRun++;
          members.forEach(m => { if (!KP.onBreak(m)) m.fatigue = KP.clamp(m.fatigue + P.mvFatigue, 0, 100); });
          const clip = rng.chance(P.mvClipChance);
          if (clip) {
            led.clips++;
            if (g.prep.campaign) g.prep.campaign.momentum = (g.prep.campaign.momentum || 0) + P.mvClipBuildup;
            inbox.push({ kind: 'public', ind: 'onSetClip', priority: 'high', groupId: g.id,
              text: 'A behind-the-scenes clip from the ' + g.name + ' MV set got out — twenty seconds of set-piece and one unguarded laugh — and it is doing real numbers. The era just got a trailer nobody paid for.' });
          } else {
            inbox.push({ kind: 'company', ind: 'stationMv', priority: 'flavor', groupId: g.id,
              text: 'MV shoot week for ' + g.name + ': an 19-hour day, three set changes, and a director who says "one more" the way other people say hello. The footage is worth it. The vans were silent on the way home.' });
          }
          return;
        }
        // -- jackets: the object gets its face --------------------------
        if (st.id === 'jacket') {
          st.done = 1; led.stationsRun++;
          if (g.prep.campaign) g.prep.campaign.momentum = (g.prep.campaign.momentum || 0) + P.jacketBuildup;
          inbox.push({ kind: 'company', ind: 'stationJacket', priority: 'flavor', groupId: g.id,
            text: 'Jacket shoot for ' + g.name + ' — the concept photos that will be the era’s face on every shelf and grid. The stylists won three arguments and lost one, which everyone agrees was the correct outcome.' });
        }
      });
    });
    // ---- the audit: a center-cut line card gets litigated at release.
    // This weekly runs BEFORE the week's release resolves (order 120),
    // so the fresh record is seen on the NEXT tick — stamp, don't race.
    KP.groups(state).forEach(g => {
      if (!(g.releases || []).length) return;
      const rel = g.releases[g.releases.length - 1];
      if (rel.lineAudited || state.week - rel.week > 2) return;
      rel.lineAudited = 1;
      // the choreographer's track record rides the record
      if (rel.choreo) {
        const ch = KP.choreographerById(state, rel.choreo.id);
        if (ch) { ch.works.push({ title: rel.songTitle, reception: rel.reception }); if (ch.works.length > 12) ch.works.shift(); }
      }
      if (rel.lineCard === 'center' && KP.igniteDiscourse && rng.chance(KP.C.PIPE.lineWarChance)) {
        led.lineWars++;
        const d = KP.igniteDiscourse(state, rng, 'lineShare', 'group', g.id, g.id);
        if (d) inbox.push(d);
      }
    });
  });

  // ---- the timeline reacts ---------------------------------------------
  KP.onFeedEvent('onSetClip', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'the BTS clip has more views than some title tracks and it is literally twenty seconds of a lighting rig and one laugh. this is the content. this was always the content' },
    { persona: 'casual', text: 'unpaid pre-release marketing beats paid pre-release marketing every single time and no company has ever learned this on purpose' },
  ]));
  KP.onFeedEvent('postponed', (state, n, rng) => rng.pick([
    { persona: 'fan', text: '"to ensure the highest quality" is doing SO much work in that notice. we know. it’s fine. take the weeks. we will be here, refreshing, unwell' },
    { persona: 'press', text: 'Another postponement notice in the standard font. The industry writes these like weather reports, and like weather reports, everyone reads the sky instead.' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
