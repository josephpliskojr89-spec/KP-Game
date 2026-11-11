/* The catalog (v0.9.15) — old records are lottery tickets.
   Nothing you ever shipped stops mattering: a resurfaced clip finds an
   idol years after the stage, a sleeper B-side catches fire and
   reverse-charts long after its era — and a clip lighting up makes the
   song's run likelier (the clip→song pipeline). Works for disbanded
   groups too, because the song outliving the group is one of music's
   best stories. Every event carries provenance, per the §55 clause.

   The reverse run, re-priced (v0.11.1, §92 D+E): the weekly roll reads
   the SONG (craft, heat — a good record is a better ticket), the act's
   MONTH (a judged stage, a tour, a panel seat inside a window doubles
   it: people hear old songs where they hear the act) and the PUSH (the
   desk's verb on the shelf: a streaming party, a dance challenge, the
   live clip). B-sides with heat are tickets of their own, each spent
   once; a strong revival reaches the national board too, at a discount.
   The late climb (§92 C) lives here as well: during promotion an
   uncharted fan pick with real heat enters the chart on a weekly hash. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.catalogLedger = state.catalogLedger ||
      { resurfaced: 0, revivals: 0, lastClip: null };
    const led = state.catalogLedger;
    // v0.11.1 fields, healed lazily on old saves
    if (led.bsideRevivals == null) { led.bsideRevivals = 0; led.nationalRevivals = 0; led.pushes = 0; led.pushPaid = 0; led.lateClimbs = 0; }
    return led;
  }
  KP.catalogLedger = ledger;

  // ---- the tickets: what on the shelf can still stir -----------------------
  // A release old enough and good enough (or sleeper-blessed), and every
  // b-side with heat — each a candidate of its own, spent once
  function qualityOf(r) { return r.craft != null ? r.craft : (r.reception || 0); }
  KP.catalogCandidates = function (state, g) {
    const C = KP.C.CATALOG;
    const out = [];
    (g.releases || []).forEach(r => {
      if (state.week - r.week < C.minAgeWeeks || r.sold) return;
      if (!r.revivedWeek && (r.reception >= C.minReception || r.sleeperTitle ||
          qualityOf(r) >= KP.C.VERDICT.longevityCraft)) {
        // a record from before the b-sides were judged (v0.11.1) keeps the
        // old nod: its sleeper's title rides the record's own ticket
        const sleeperJudged = !!r.sleeperTitle && (r.bsides || []).some(b => b.title === r.sleeperTitle);
        out.push({ kind: 'title', title: (r.sleeperTitle && !sleeperJudged) ? r.sleeperTitle : r.songTitle, r, q: qualityOf(r),
          key: (r.sleeperTitle ? 10 : 0) + r.reception + (qualityOf(r) - 50) * 0.5 });
      }
      (r.bsides || []).forEach(b => {
        if (b.revivedWeek || (b.heat || 0) < C.bsideRevivalHeat) return;
        out.push({ kind: 'bside', title: b.title, r, b, q: b.heat,
          key: (b.sleeper ? 20 : 0) + b.heat + (qualityOf(r) - 50) * 0.3 });
      });
    });
    return out.sort((a, b) => b.key - a.key);
  };
  // the act's month: a judged stage, a tour leg or a panel seat inside the window
  KP.catalogActive = function (state, g) {
    const C = KP.C.CATALOG;
    if (g.tour) return true;
    if (state.week - (g.lastActivityWeek || -999) <= C.activityWindow) return true;
    if (KP.outsideJobs) {
      const jobs = KP.outsideJobs(state, 'show');
      if (jobs.some(j => j.kind !== 'ost' && (g.members || []).includes(j.personId))) return true;
    }
    return false;
  };
  // one truth for the week's roll: the chance and the ticket it would draw
  KP.revivalChanceOf = function (state, g, clipHot) {
    const C = KP.C.CATALOG;
    const cands = KP.catalogCandidates(state, g);
    if (!cands.length) return { chance: 0, pick: null, cands, active: false, pushed: false };
    const push = g.catalogPush && state.week <= g.catalogPush.until ? g.catalogPush : null;
    const pushedPick = push ? cands.find(c => c.title === push.title) : null;
    const pick = pushedPick || cands[0];
    const active = KP.catalogActive(state, g);
    let chance = C.revivalChance + (clipHot ? C.revivalClipBoost : 0);
    chance *= 1 + ((pick.q - 50) / 50) * C.qualitySpan;
    if (active) chance *= C.activityMult;
    if (pushedPick) chance *= C.PUSH.KINDS[push.kind].mult;
    return { chance: Math.max(0, chance), pick, cands, active, pushed: !!pushedPick };
  };

  // ---- the catalog push (§92 E): the desk's verb on the shelf ---------------
  KP.catalogPushRead = function (state, g) {
    const C = KP.C.CATALOG;
    if (!g || !g.debuted || g.retiredWeek) return { ok: false, reason: 'The shelf belongs to a debuted act.', candidates: [], kinds: [] };
    const cands = KP.catalogCandidates(state, g);
    const live = g.catalogPush && state.week <= g.catalogPush.until ? g.catalogPush : null;
    const kinds = Object.keys(C.PUSH.KINDS).map(id => {
      const k = C.PUSH.KINDS[id];
      let reason = null;
      if (k.dance && !(g.members || []).some(mid => state.people[mid] && state.people[mid].talents.dance.cur >= k.dance)) reason = 'A dance challenge needs a dancer the clips can follow.';
      if (k.stageWithin && state.week - (g.lastActivityWeek || -999) > k.stageWithin) reason = 'A live clip needs a stage inside the last ' + k.stageWithin + ' weeks.';
      if (state.budget < k.cost) reason = reason || ('The push bills ' + k.cost + '.');
      return { id, label: k.label, cost: k.cost, weeks: k.weeks, ok: !reason, reason };
    });
    if (live) return { ok: false, reason: 'A push is running — “' + live.title + '” through ' + KP.weekLabel(live.until).text + '.', candidates: cands, kinds, live };
    if (state.week < (g.catalogPushQuiet || 0)) return { ok: false, reason: 'The fandom just ran a campaign. The next one lands ' + KP.weekLabel(g.catalogPushQuiet).text + '.', candidates: cands, kinds };
    if (!cands.length) return { ok: false, reason: 'Nothing on the shelf is old enough, or good enough, to push yet.', candidates: cands, kinds };
    return { ok: true, candidates: cands, kinds };
  };
  KP.pushCatalog = function (state, groupId, title, kindId) {
    const C = KP.C.CATALOG;
    const g = KP.groupById(state, groupId);
    if (!g) return { ok: false, reason: 'No such group.' };
    const read = KP.catalogPushRead(state, g);
    if (!read.ok) return { ok: false, reason: read.reason };
    const cand = read.candidates.find(c => c.title === title);
    if (!cand) return { ok: false, reason: 'That song is not on the shelf.' };
    const kind = read.kinds.find(k => k.id === kindId);
    if (!kind) return { ok: false, reason: 'A push is a party, a challenge, or a clip.' };
    if (!kind.ok) return { ok: false, reason: kind.reason };
    const K = C.PUSH.KINDS[kindId];
    state.budget -= K.cost;
    if (KP.ledgerFlow) KP.ledgerFlow(state, 'marketing', -K.cost);
    g.catalogPush = { title: cand.title, kind: kindId, since: state.week, until: state.week + K.weeks, bside: cand.kind === 'bside' };
    g.catalogPushQuiet = state.week + K.weeks + C.PUSH.cooldown;
    ledger(state).pushes++;
    const note = { kind: 'company', ind: 'catalogPush', priority: 'normal', groupId: g.id, trackTitle: cand.title, pushKind: kindId,
      text: KP.catalogPushLine ? KP.catalogPushLine(state, g, cand, kindId, K) : (K.label + ' on “' + cand.title + '” — ' + K.weeks + ' weeks.') };
    KP.note(state, note);
    return { ok: true, note, until: g.catalogPush.until };
  };

  KP.registerWeekly('catalog', 565, function (state, rng, inbox) {
    const C = KP.C.CATALOG;
    const led = ledger(state);

    // ---- the resurfaced clip: an old stage finds new eyes --------------
    // The demoted "random" viral — random no longer means sourceless:
    // the clip names its stage and its year, always.
    if (rng.chance(C.resurfaceChance)) {
      const cands = [];
      KP.groups(state).forEach(g => {
        if (!g.debuted || state.week - (g.debutWeek || 0) < C.resurfaceMinWeeks) return;
        g.members.forEach(id => {
          const p = state.people[id];
          if (p && p.status === 'idol') cands.push({ p, g });
        });
      });
      if (cands.length) {
        const pick = cands[Math.floor(rng.next() * cands.length)];
        const yearsAgo = Math.max(1, Math.round((state.week - pick.g.debutWeek) / KP.C.WEEKS_PER_YEAR / 2));
        const stage = Object.keys(pick.g.trophies || {}).length
          ? 'a ' + yearsAgo + '-year-old ' + KP.showLabel(Object.keys(pick.g.trophies)[0]) + ' stage'
          : 'a ' + yearsAgo + '-year-old “' + ((pick.g.releases || [])[0] || {}).songTitle + '” stage';
        led.resurfaced++;
        led.lastClip = { groupId: pick.g.id, week: state.week };
        const narNote = KP.recordViral(state, pick.p, { kind: 'resurfaced', label: stage + ' clip, resurfaced' });
        if (narNote) inbox.push(narNote);
        KP.socialSpike(state, pick.p, KP.C.SOCIAL.viralSpike * 0.8, 'resurfaced');
        inbox.push({ kind: 'public', ind: 'clipResurfaced', priority: 'high', personId: pick.p.id, groupId: pick.g.id,
          text: KP.fillPro('An algorithm did what algorithms do: ' + stage + ' clip of ' + KP.displayName(pick.p) +
            ' resurfaced this week and the comments are all “WHY is this in my feed” followed by “ok I watched it eleven times.” The archive never sleeps — it naps.', pick.p) });
      }
    }

    // ---- the reverse chart run: a catalog track catches fire -----------
    // Far likelier while a resurfaced clip is still burning — the
    // clip→song pipeline, the way it actually happens. One draw per
    // group per week (the stream's shape since v0.9.15); the chance
    // reads the song, the month and the push (v0.11.1)
    KP.groups(state).forEach(g => {
      const clipHot = led.lastClip && led.lastClip.groupId === g.id &&
        state.week - led.lastClip.week <= C.clipBoostWindow;
      const roll = KP.revivalChanceOf(state, g, clipHot);
      // a push that ends without paying out winds down quietly (flavor priority)
      if (g.catalogPush && state.week === g.catalogPush.until + 1) {
        inbox.push({ kind: 'company', ind: 'catalogPushDone', priority: 'flavor', groupId: g.id, trackTitle: g.catalogPush.title,
          text: 'The ' + C.PUSH.KINDS[g.catalogPush.kind].label.toLowerCase() + ' on “' + g.catalogPush.title + '” wound down: a bump in the playlists, a few thousand new ears, no chart entry. The fandom filed it under “next time” and meant it.' });
        delete g.catalogPush;
      }
      if (!roll.pick) return;
      if (!rng.chance(roll.chance)) return;
      const pick = roll.pick;
      const r = pick.r;
      const title = pick.title;
      if (pick.kind === 'bside') { pick.b.revivedWeek = state.week; led.bsideRevivals++; }
      else r.revivedWeek = state.week;
      led.revivals++;
      if (roll.pushed) { led.pushPaid++; delete g.catalogPush; }
      const alive = !g.retiredWeek && g.members.length > 0;
      if (alive) {
        g.popularity = KP.clamp((g.popularity || 0) + C.revivalPop, 0, 100);
        if (g.fandom) KP.fandomGain(g, C.revivalFandomGain);
      }
      // the royalties: an old song charting is income — streams, the
      // merch reprint. The label owns the masters whether the group
      // still exists or not, so the money arrives either way.
      const fandomMult = alive ? 1 + KP.fandomIntensity(g) * KP.C.FANDOM.revenueFactor : 1;
      const windfall = Math.round((C.revivalWindfallBase +
        Math.max(0, pick.q - 30) * C.revivalWindfallPerReception) * fandomMult);
      KP.takeIn(state, windfall);
      if (KP.ledgerFlow) KP.ledgerFlow(state, 'catalog', windfall);   // §89 E: royalties are a books line
      const sceneScore = C.revivalScore + (pick.q - 50) * 0.3;
      KP.chartEnter(state, {
        title, act: g.name, company: state.company.short,
        isPlayer: true, groupId: g.id, catalog: true, bside: pick.kind === 'bside', releaseWeek: r.week,
        score: sceneScore, entered: state.week,
      });
      // the national back door (§92 D): a revival this good reaches the whole industry
      let national = false;
      if (pick.q >= C.nationalRevivalAt) {
        national = true;
        led.nationalRevivals++;
        KP.nationalEnter(state, {
          title, act: g.name, company: state.company.short,
          isPlayer: true, groupId: g.id, catalog: true, bside: pick.kind === 'bside', releaseWeek: r.week,
          score: sceneScore * C.nationalScoreMult, entered: state.week,
        });
      }
      const yearsOld = Math.max(1, Math.round((state.week - r.week) / KP.C.WEEKS_PER_YEAR));
      const nar = KP.recordEvidence(state, 'catalogRevival', 'group', g.id, { title });
      if (nar) inbox.push(nar);
      inbox.push({ kind: 'public', ind: 'catalogRevival', priority: 'critical', groupId: g.id,
        catalogTitle: title, alive, bside: pick.kind === 'bside', national, pushed: roll.pushed, clipHot: !!clipHot,
        text: KP.revivalLine(state, g, { title, alive, bside: pick.kind === 'bside', national, pushed: roll.pushed, clipHot: !!clipHot, yearsOld, windfall, record: r.songTitle }) });
    });

    // ---- the late climb (§92 C): the b-side the second stage keeps pushing ----
    // During promotion an uncharted fan pick with real heat enters the
    // scene chart on a weekly hash — a world fact, not a draw: the
    // stream keeps its shape under the new mechanism
    const L = KP.C.TRACKS.LATE;
    KP.groups(state).forEach(g => {
      if (!g.debuted || g.retiredWeek || g.prep) return;
      if (state.week > (g.promoUntil || 0) || state.week <= (g.lastReleaseWeek || 0)) return;
      const rel = (g.releases || [])[(g.releases || []).length - 1];
      if (!rel || !rel.bsides || !rel.bsides.length) return;
      const pick = rel.bsides.slice().sort((a, b) => b.heat - a.heat)[0];
      if (!pick || pick.charted || pick.heat < L.heatAt) return;
      if (KP.hash01([state.seed, g.id, rel.week, state.week, 'late'].join('|')) >= L.chance) return;
      const titleEntry = ((state.chart || {}).entries || []).find(e => e.isPlayer && e.groupId === g.id && e.entered === rel.week && !e.bside);
      const base = titleEntry ? titleEntry.score : C.revivalScore;
      pick.charted = state.week; pick.late = true;
      led.lateClimbs++;
      KP.chartEnter(state, {
        title: pick.title, act: g.name, company: state.company.short,
        isPlayer: true, groupId: g.id, bside: true, releaseWeek: rel.week,
        score: Math.max(C.revivalScore * 0.6, base * L.scoreMult), entered: state.week,
      });
      inbox.push({ kind: 'public', ind: 'bsideClimbs', priority: 'high', groupId: g.id, trackTitle: pick.title,
        text: KP.bsideClimbsLine ? KP.bsideClimbsLine(state, g, rel.songTitle, pick) :
          '“' + pick.title + '” entered the chart mid-promotion — the b-side the second stage kept pushing until the public agreed.' });
    });
  });

  // ---- the words -------------------------------------------------------------
  KP.revivalLine = function (state, g, o) {
    const where = o.national ? ' — and it crossed onto the NATIONAL board, which is where the trades start writing' : '';
    const how = o.pushed ? 'The push paid out: the fandom’s campaign put it there on purpose.'
      : o.clipHot ? 'The resurfaced clip lit the fuse.'
      : 'Nothing lit it but word of mouth.';
    if (!o.alive) {
      return '“' + o.title + '” is CHARTING — ' + o.yearsOld + ' year' + (o.yearsOld === 1 ? '' : 's') + ' old, ' +
        (o.bside ? 'a b-side off “' + o.record + '”, ' : '') + 'from a group that no longer exists. ' + g.name + ' disbanded; the song did not. ' + how +
        ' Somewhere, the people who used to share a dorm are reading the same chart screenshot and typing in the old group chat. The masters, it turns out, still pay: ' + o.windfall + ' in catalog revenue.' + where + '.';
    }
    if (o.bside) {
      return '“' + o.title + '” — a b-side, ' + o.yearsOld + ' year' + (o.yearsOld === 1 ? '' : 's') + ' old, track ' + 'off “' + o.record + '” — is CHARTING. ' + how +
        ' The truthers were right and are being gracious about it in the way they are gracious about nothing: screenshots, timestamps, a thread titled “we told you.” ' + g.name + '’s catalog just proved the record was more than its title. The royalties came in at ' + o.windfall + where + '.';
    }
    return '“' + o.title + '” is CHARTING. The ' + o.yearsOld + '-year-old track caught fire ' + (o.pushed ? 'on purpose' : 'out of nowhere') + ' — ' + how +
      ' It is climbing on pure word of mouth. ' + g.name + '’s catalog just proved it never expires. The company is reprinting merch nobody expected to reprint, and the royalties came in at ' + o.windfall + where + '.';
  };
  KP.bsideChartsLine = function (state, g, titleTrack, pick) {
    return '“' + pick.title + '” is charting beside “' + titleTrack + '” — two songs off one ' + g.name + ' record on the same board the same week. ' +
      (pick.credit === 'solo' ? 'A solo cut charting on its own is a career inside the career, and the booklet now has a line people quote. '
        : pick.credit === 'unit' ? 'A unit cut charting on its own means the pairing was a song, not a schedule. ' : '') +
      'The tracklist poster thread has declared victory, which it does weekly, but this time with a chart screenshot.';
  };
  KP.bsideClimbsLine = function (state, g, titleTrack, pick) {
    return '“' + pick.title + '” entered the chart mid-promotion — the b-side the second stage kept pushing until the public agreed. ' +
      '“' + titleTrack + '” is still the single; the room is now arguing about whether it should have been. ' + g.name + '’s era just got a second week of stories.';
  };
  KP.catalogPushLine = function (state, g, cand, kindId, K) {
    const song = '“' + cand.title + '”' + (cand.kind === 'bside' ? ' (the b-side)' : '');
    if (kindId === 'party') return 'Streaming party on ' + song + ': the fan cafés posted the schedule, the hydration reminders and the playlist order inside an hour. ' + K.weeks + ' weeks of the fandom’s own machine, billed at ' + K.cost + '. Whether the algorithm notices is the bet.';
    if (kindId === 'challenge') return 'Dance challenge on ' + song + ': the point choreography cut to fifteen seconds, the members filmed it in the practice room with the lights half off, and the hashtag went up before the edit finished. ' + K.weeks + ' weeks, billed at ' + K.cost + '. Challenges travel further than parties — when they travel.';
    return 'The live clip of ' + song + ' is out — one take from the last stage, no cuts, the audio exactly as it happened. ' + K.weeks + ' weeks of it in every reply, billed at ' + K.cost + '. The best argument a song can make is being sung well in front of people.';
  };

  // ---- the timeline reacts through the registry ------------------------
  KP.onFeedEvent('clipResurfaced', (state, n, rng) => {
    const p = state.people[n.personId];
    const name = p ? KP.publicGiven(p) : 'her';
    return rng.pick([
      { persona: 'casual', text: 'a years-old idol clip showed up in my feed and I have now watched it eleven times and followed three accounts. how does this keep happening. (I know how. I am not mad)' },
      { persona: 'fan', text: 'NEW people discovering the ' + name + ' clip in the year of our lord this year. welcome. the wiki is extensive. mind the lore threshold on your way in' },
      { persona: 'stan', text: 'the resurfaced ' + name + ' clip doing numbers again proves what the archive team (me) has always said: we do not lose. we simply wait' },
    ]);
  });
  KP.onFeedEvent('catalogRevival', (state, n, rng) => {
    const g = KP.groupById(state, n.groupId);
    const title = n.catalogTitle || 'the song';
    return rng.pick([
      { persona: 'casual', text: 'why is “' + title + '” on the chart. it is YEARS old. anyway it has been in my head for three days, carry on' },
      { persona: 'fan', text: '“' + title + '” REVERSE CHARTING. justice arrives late but it arrives. streaming parties are BACK on the schedule, veterans report for duty' },
      n.bside
        ? { persona: 'stan', text: 'a B-SIDE reverse charting. not the single. the b-side. the truthers have been vindicated and are insufferable and correct' }
        : n.alive
          ? { persona: 'stan', text: (g ? g.name : 'the group') + ' watching their old b-side outchart half the current lineup of rookies… the catalog is undefeated. press the vinyl' }
          : { persona: 'stan', text: 'a disbanded group charting in the current year. the members are posting cryptic emojis. the fandom discord has achieved consciousness. reunion truthers, our moment' },
      n.national
        ? { persona: 'press', text: 'A reverse run that crosses onto the national board is the industry’s favorite kind of embarrassment: everyone who passed on it the first time now has a column explaining why they always believed.' }
        : { persona: 'casual', text: 'old song charting again and the comments are a reunion of people who were there the first time. a wholesome timeline for once' },
    ]);
  });
  KP.onFeedEvent('bsideCharts', (state, n, rng) => rng.pick([
    { persona: 'stan', text: 'TWO songs charting off one record. the title AND “' + (n.trackTitle || 'the b-side') + '”. the b-side truthers would like the floor. we have slides' },
    { persona: 'casual', text: 'a b-side charting beside its own title track is the tracklist poster thread’s entire personality now and honestly they earned it' },
    { persona: 'fan', text: '“' + (n.trackTitle || 'the b-side') + '” charting on its own. no MV, no stage, no push. just a good song finding people. this is why we read the tracklist' },
  ]));
  KP.onFeedEvent('bsideClimbs', (state, n, rng) => rng.pick([
    { persona: 'fan', text: '“' + (n.trackTitle || 'the b-side') + '” entering the chart in week three of promo is the slow burn we were promised. the second stage did its job' },
    { persona: 'stan', text: 'the b-side CLIMBED. mid-era. no promotion. the public simply arrived. streaming it as a thank you' },
  ]));
  KP.onFeedEvent('catalogPush', (state, n, rng) => rng.pick([
    n.pushKind === 'challenge'
      ? { persona: 'casual', text: 'a dance challenge for a song from years ago is either desperate or genius and the algorithm will tell us which by friday' }
      : n.pushKind === 'liveClip'
        ? { persona: 'fan', text: 'the live clip of “' + (n.trackTitle || 'the old song') + '” has the audio untouched and you can HEAR the room. put this on the chart, cowards' }
        : { persona: 'stan', text: 'streaming party for “' + (n.trackTitle || 'the old song') + '” starts tonight. veterans know the order. newcomers: the playlist is pinned, hydrate, do not skip the bridge' },
    { persona: 'anti', text: 'label-sponsored “organic” streaming campaign for a catalog track. we can all see the schedule was posted by an admin account. anyway it’s a good song' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
