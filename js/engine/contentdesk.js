/* The content desk (v0.10.18) — the company account. Owner: "we need
   a way to produce content in house… and we should be able to share
   videos from a company account as well." The law of the menu: you
   can only film what is actually happening — no tour vlog without a
   tour, no birthday cam without a birthday. Every topic's gate READS
   the state that makes it true, and a locked topic says why. Posts
   build the catalog: the asset the grind leaves behind (§85 D prices
   it later), and once in a while an upload breaks containment — the
   small label's fourth lottery ticket. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.contentLedger = state.contentLedger ||
      { posted: 0, hits: 0, views: 0 };
    return state.contentLedger;
  }
  KP.contentLedger = ledger;

  function debutedGroups(state) {
    return KP.groups(state).filter(g => g.debuted && !g.retiredWeek && g.members.length);
  }
  function activeRoster(state) {
    return (state.roster || []).map(id => state.people[id])
      .filter(p => p && (p.status === 'trainee' || p.status === 'idol') &&
        !p.flags.military && !p.flags.personalHiatus);
  }
  function pickTop(list, score) {
    return list.slice().sort((a, b) => score(b) - score(a))[0] || null;
  }

  // ---- the menu: every topic is a gate that reads the world ------------
  // when(state) returns null when locked (with .reason via lockReason),
  // or { subjectId | groupId, line } — the line is the video's title-card
  // sentence, written from the state that unlocked it.
  const TOPICS = [
    { id: 'dancePractice', label: 'Dance practice', cost: 2,
      blurb: 'The fixed-camera mirror-room take of the latest title.',
      lock: 'Needs a debuted group with a release to rehearse.',
      when: (state) => {
        const g = debutedGroups(state).filter(x => (x.releases || []).some(r => r.week > 0))
          .sort((a, b) => (b.lastReleaseWeek || 0) - (a.lastReleaseWeek || 0))[0];
        if (!g) return null;
        const rel = g.releases[g.releases.length - 1];
        return { groupId: g.id, line: g.name + ' — “' + rel.songTitle + '” dance practice, one take, mirror room' };
      } },
    { id: 'choreoTeaser', label: 'Choreo teaser', cost: 2,
      blurb: 'Eight seconds of unreleased choreography, cut to black.',
      lock: 'Needs a group in prep — no upcoming release, no tease.',
      when: (state) => {
        const g = KP.groups(state).find(x => x.prep && !x.retiredWeek);
        if (!g) return null;
        return { groupId: g.id, line: g.name + ' — choreography spoiler, eight seconds, comments locked on purpose' };
      } },
    { id: 'debutCountdown', label: 'Debut countdown', cost: 1,
      blurb: 'The D-day series: practice rooms, nerves, a calendar.',
      lock: 'Needs a debut or comeback inside the eight-week window.',
      when: (state) => {
        const g = KP.groups(state).find(x => x.prep && x.prep.scheduledWeek &&
          x.prep.scheduledWeek > state.week && x.prep.scheduledWeek - state.week <= 8);
        if (!g) return null;
        return { groupId: g.id, line: g.name + ' — D-' + ((g.prep.scheduledWeek - state.week) * 7) + ': the calendar on the practice-room door' };
      } },
    { id: 'evalDiary', label: 'Evaluation diary', cost: 1,
      blurb: 'The walk to the board, the faces after.',
      lock: 'Needs an evaluation day within the last month.',
      when: (state) => {
        const p = activeRoster(state).find(x => x.status === 'trainee' &&
          x.evalHistory && x.evalHistory.length &&
          state.week - x.evalHistory[x.evalHistory.length - 1].week <= 4);
        if (!p) return null;
        const e = p.evalHistory[p.evalHistory.length - 1];
        return { subjectId: p.id, line: 'Evaluation diary — ' + KP.displayName(p) + ' walks to the board (' + e.rank + ' of ' + e.of + ')' };
      } },
    { id: 'stageFancam', label: 'Stage fancam', cost: 0,
      blurb: 'The official cut of a stage that already happened. Free — the tape exists.',
      lock: 'Needs a stage on the record — nobody has performed yet.',
      when: (state) => {
        const g = debutedGroups(state).filter(x => x.lastReleaseWeek)
          .sort((a, b) => (b.lastReleaseWeek || 0) - (a.lastReleaseWeek || 0))[0];
        if (!g) return null;
        const rel = (g.releases || [])[g.releases.length - 1];
        return { groupId: g.id, line: g.name + ' — “' + (rel ? rel.songTitle : 'the stage') + '” official fancam, 4K, one member per frame' };
      } },
    { id: 'waitingRoomCam', label: 'Waiting-room cam', cost: 1,
      blurb: 'Before and after the music show — the hallway truth.',
      lock: 'Needs an active promo run — the waiting room is empty.',
      when: (state) => {
        const g = debutedGroups(state).find(x => state.week <= (x.promoUntil || 0));
        if (!g) return null;
        return { groupId: g.id, line: g.name + ' — waiting-room cam, music show week: gimbap, vocal warmups, one nap' };
      } },
    { id: 'tourVlog', label: 'Tour vlog', cost: 2,
      blurb: 'The van, the venue, the city. The road, on the record.',
      lock: 'Needs a tour actually running — the van is parked.',
      when: (state) => {
        const g = KP.groups(state).find(x => x.tour && !x.retiredWeek);
        if (!g) return null;
        return { groupId: g.id, line: g.name + ' — tour vlog: load-in, soundcheck, and the city from the van window' };
      } },
    { id: 'dormVlog', label: 'Dorm vlog', cost: 1,
      blurb: 'Roommates, the fridge, whose turn it was to clean.',
      lock: 'Needs a debuted group with a dorm to film.',
      when: (state) => {
        const g = debutedGroups(state).find(x => x.rooms && x.rooms.length);
        if (!g) return null;
        return { groupId: g.id, line: g.name + ' — dorm vlog: the fridge audit, the cleaning rota, the couch hierarchy' };
      } },
    { id: 'birthdayCam', label: 'Birthday cam', cost: 1,
      blurb: 'The cake ambush, filmed properly this time.',
      lock: 'Nobody in the building has a birthday this week.',
      when: (state) => {
        const woy = ((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1;
        const p = activeRoster(state).find(x => KP.birthWeekOf(state, x) === woy);
        if (!p) return null;
        return { subjectId: p.id, line: 'Birthday cam — ' + KP.displayName(p) + ' turns ' + p.age + ', the cake arrives with suspicious speed' };
      } },
    { id: 'maknaeTakeover', label: 'Maknae takeover', cost: 1,
      blurb: 'The youngest gets the account for a day. Supervised. Barely.',
      lock: 'Needs a group with a maknae to hand the account to.',
      when: (state) => {
        const g = KP.groups(state).find(x => !x.retiredWeek &&
          x.maknae && x.members.includes(x.maknae));
        if (!g) return null;
        const p = state.people[g.maknae];
        if (!p) return null;
        return { subjectId: p.id, groupId: g.id, line: 'Channel takeover — the maknae, ' + KP.displayName(p) + ', has the account and a list of rules {she} has already stopped reading' };
      } },
    { id: 'coverSong', label: 'Song cover', cost: 2,
      blurb: 'One member, one mic, somebody else’s song.',
      lock: 'Needs somebody in the building to point a camera at.',
      when: (state) => {
        const p = pickTop(activeRoster(state), x => x.talents.vocals.cur);
        if (!p) return null;
        return { subjectId: p.id, line: 'Cover — ' + KP.displayName(p) + ', one mic, one take, a song the label does not own' };
      } },
    { id: 'danceChallenge', label: 'Dance challenge', cost: 1,
      blurb: 'Fifteen seconds with a friend from another letterhead.',
      lock: 'Needs a cross-company friendship — the society makes this one.',
      when: (state) => {
        const p = activeRoster(state).find(x => KP.friendsOf &&
          KP.friendsOf(state, x.id).length);
        if (!p) return null;
        const f = KP.friendsOf(state, p.id)[0];
        const other = state.people[f.a === p.id ? f.b : f.a];
        return { subjectId: p.id, line: 'Dance challenge — ' + KP.displayName(p) + ' × ' +
          (other ? KP.displayName(other) : 'a friend from another company') +
          ', fifteen seconds, two letterheads, zero managers in frame' };
      } },
    { id: 'signingDay', label: 'Signing day', cost: 1,
      blurb: 'The first-day photo: a pen, a contract, a face deciding to be brave.',
      lock: 'Needs a signing within the last two weeks.',
      when: (state) => {
        if (!state.lastSigningWeek || state.week - state.lastSigningWeek > 2) return null;
        const p = activeRoster(state).filter(x => x.signedWeek != null)
          .sort((a, b) => (b.signedWeek || 0) - (a.signedWeek || 0))[0];
        if (!p) return null;
        return { subjectId: p.id, line: 'Welcome to the building — ' + KP.displayName(p) + '’s first-day photo, one pen, one very deep breath' };
      } },
    { id: 'anniversary', label: 'Anniversary film', cost: 2,
      blurb: 'A year in the group’s life, cut from footage that actually happened.',
      lock: 'Needs a debut anniversary week — the calendar decides.',
      when: (state) => {
        const g = debutedGroups(state).find(x => state.week > x.debutWeek &&
          (state.week - x.debutWeek) % KP.C.WEEKS_PER_YEAR <= 1);
        if (!g) return null;
        const yrs = Math.max(1, Math.round((state.week - g.debutWeek) / KP.C.WEEKS_PER_YEAR));
        return { groupId: g.id, line: g.name + ' — ' + yrs + ' year' + (yrs === 1 ? '' : 's') + ': the anniversary film, cut from the real footage' };
      } },
  ];

  // one truth for the menu: the tab renders exactly what the verb allows
  KP.contentTopics = function (state) {
    return TOPICS.map(t => {
      const open = t.when(state);
      return { id: t.id, label: t.label, blurb: t.blurb, cost: t.cost,
        open: !!open, reason: open ? null : t.lock };
    });
  };

  KP.postContent = function (state, topicId) {
    const C = KP.C.CONTENT;
    const t = TOPICS.find(x => x.id === topicId);
    if (!t) return { ok: false, reason: 'The content desk has never heard of that format.' };
    if (state.contentPostWeek === state.week) {
      return { ok: false, reason: 'One upload a week. The editor is one person, and the render bar is honest.' };
    }
    const open = t.when(state);
    if (!open) return { ok: false, reason: t.lock };
    if (state.budget < t.cost) return { ok: false, reason: 'Even in-house content costs ' + t.cost + ' — the editor eats.' };
    const rng = KP.rngFor(state);
    state.budget -= t.cost;
    if (t.cost && KP.ledgerFlow) KP.ledgerFlow(state, 'marketing', -t.cost);
    state.contentPostWeek = state.week;
    const led = ledger(state);

    // the numbers: what the account pulls is who was in the frame
    const p = open.subjectId ? state.people[open.subjectId] : null;
    const g = open.groupId ? KP.groupById(state, open.groupId)
      : (p ? KP.groupOf(state, p.id) : null);
    const social = p ? KP.socialOf(state, p)
      : (g ? g.members.reduce((s2, id) => s2 + KP.socialOf(state, state.people[id]), 0) : 0);
    let views = Math.round((C.baseViews + social * C.viewsPerSocial +
      ((g && g.popularity) || 0) * C.viewsPerPop) * (0.7 + rng.next() * 0.6));
    const hit = rng.chance(C.hitChance);
    if (hit) {
      views = Math.round(views * C.hitViewsMult);
      led.hits++;
      if (p) {
        p.hype = KP.clamp((p.hype || 0) + C.hitHype, 0, 100);
        KP.socialSpike(state, p, Math.round(views * C.hitFollowShare), 'content-hit');
      } else if (g) {
        g.members.forEach(id => {
          const m = state.people[id];
          if (m) KP.socialSpike(state, m, Math.round(views * C.hitFollowShare / g.members.length), 'content-hit');
        });
      }
      KP.note(state, { kind: 'public', ind: 'contentHit', priority: 'high',
        personId: p ? p.id : undefined,
        text: 'The company account posted “' + (p ? KP.fillPro(open.line, p) : open.line) + '” — and it BROKE CONTAINMENT: ' +
          KP.fmtCount(views) + ' views and climbing, reposted by accounts that do not know this label’s name yet. In-house, no budget, all reach. This is why the desk keeps filming.' });
    }
    if (p) p.morale = KP.clamp(p.morale + C.featureMorale, 0, 100);
    // the ad settlement (v0.10.20): every view banks toward the
    // quarterly check — "your total views compound over time" (owner).
    // v0.10.23: the post also feeds the ACTIVE archive pool the weekly
    // tail reads — attention has a half-life now (the hostile audit
    // caught the lifetime tail compounding quadratically).
    // the meter banks capped attention, not raw scale (v0.10.23): a
    // megastar's quarter-million-view upload is real, but ad money is
    // lunch money at every size
    state.adViews = (state.adViews || 0) + Math.min(views, C.adWeeklyViewCap);
    state.adRecent = (state.adRecent || 0) + Math.min(views, C.adWeeklyViewCap);
    state.contentCatalog = state.contentCatalog || [];
    state.contentCatalog.push({ week: state.week, topic: t.id,
      line: p ? KP.fillPro(open.line, p) : open.line, views, hit: hit ? 1 : 0 });
    if (state.contentCatalog.length > C.maxCatalog) {
      state.contentCatalog = state.contentCatalog.slice(-C.maxCatalog);
    }
    led.posted++;
    led.views += views;
    state.rngState = rng.state();
    return { ok: true, views, hit,
      line: p ? KP.fillPro(open.line, p) : open.line };
  };

  // ---- the ad settlement (v0.10.20) -------------------------------------
  // Owner: "it should produce SOMETHING… 1 won per x amount of views
  // feels easiest. your total views compound over time." Views bank
  // continuously — company posts at the upload, the archive's long
  // tail weekly, every live member channel weekly by her following —
  // and the bank converts at the platform's flat rate on the closing
  // quarter, as its own line on the statement. Order 756: the check
  // lands BEFORE the investor's toll (757) and the books close (758),
  // so the fund takes its cut of ad money too. The toll is the toll.
  KP.registerWeekly('adRevenue', 756, function (state, rng, inbox) {
    const C = KP.C.CONTENT;
    const led = ledger(state);
    // the ACTIVE archive keeps getting watched — and cools (v0.10.23):
    // the tail reads a decaying pool, not lifetime views, and the whole
    // week's banking is capped. The meter pays attention, not history.
    state.adRecent = Math.round((state.adRecent || 0) * C.adTailDecay);
    let weekAdd = Math.round((state.adRecent || 0) * C.adCatalogTail);
    // the member channels: her weekly upload pulls a slice of her
    // following — no rng, the audience is the audience
    (state.roster || []).map(id => state.people[id]).forEach(p => {
      if (!p || !p.broadcast) return;
      if (p.flags.personalHiatus || p.flags.military || KP.onBreak(p)) return;
      weekAdd += Math.round(KP.socialOf(state, p) * C.adChannelShare);
    });
    state.adViews = (state.adViews || 0) + Math.min(weekAdd, C.adWeeklyViewCap);
    // the quarterly conversion: flat rate, remainder carries
    const woy = ((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1;
    if (woy % KP.C.BOOKS.quarterWeeks === 0 && state.week > 4 && state.adViews >= C.adViewsPerWon) {
      const won = Math.floor(state.adViews / C.adViewsPerWon);
      state.adViews -= won * C.adViewsPerWon;
      state.budget += won;
      if (KP.ledgerFlow) KP.ledgerFlow(state, 'adRevenue', won);
      const first = !(led.adPaid > 0);
      led.adPaid = (led.adPaid || 0) + won;
      if (first) {
        inbox.push({ kind: 'company', ind: 'adFirstCheck', priority: 'high',
          text: 'WeCast’s quarterly ad settlement cleared for the first time: ' + won +
            ' won, wired against every view the videos ever pulled. It is not tour money. It is not album money. It is money the CAMERA made while everyone was doing something else — and it will clear again next quarter, bigger if the archive grows.' });
      }
    }
  });

  // ---- the timeline reacts ---------------------------------------------
  KP.onFeedEvent('adFirstCheck', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'the label just learned their videos make actual money and honestly? deserved. keep feeding us content, the algorithm pays in real currency now' },
    { persona: 'casual', text: 'small agency discovers ad revenue, a coming-of-age story. the fried-chicken-counter vlogs were monetized the whole time' },
  ]));
  KP.onFeedEvent('contentHit', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'the OFFICIAL account posted actual content and it is genuinely good?? in-house era. whoever runs that channel deserves a raise and a nap' },
    { persona: 'casual', text: 'algorithm handed me a small label’s company video and I watched the whole thing. no ad budget, just a camera and people who like each other. more of this' },
    { persona: 'stan', text: 'company content breaking containment is the best timeline. the fans made the clips, the label finally noticed, everybody wins. archive it NOW' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
