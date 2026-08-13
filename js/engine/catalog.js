/* The catalog (v0.9.15) — old records are lottery tickets.
   Nothing you ever shipped stops mattering: a resurfaced clip finds an
   idol years after the stage, a sleeper B-side catches fire and
   reverse-charts long after its era — and a clip lighting up makes the
   song's run likelier (the clip→song pipeline). Works for disbanded
   groups too, because the song outliving the group is one of music's
   best stories. Every event carries provenance, per the §55 clause. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    return state.catalogLedger = state.catalogLedger ||
      { resurfaced: 0, revivals: 0, lastClip: null };
  }

  // releases old enough, good enough (or sleeper-blessed) to stir
  function catalogOf(state, g) {
    const C = KP.C.CATALOG;
    return (g.releases || []).filter(r =>
      state.week - r.week >= C.minAgeWeeks && !r.revivedWeek &&
      (r.reception >= C.minReception || r.sleeperTitle));
  }

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
    // clip→song pipeline, the way it actually happens.
    KP.groups(state).forEach(g => {
      const cands = catalogOf(state, g);
      if (!cands.length) return;
      const clipHot = led.lastClip && led.lastClip.groupId === g.id &&
        state.week - led.lastClip.week <= C.clipBoostWindow;
      if (!rng.chance(C.revivalChance + (clipHot ? C.revivalClipBoost : 0))) return;
      // the best-loved eligible record catches — sleepers get the nod
      const r = cands.slice().sort((a, b) =>
        (b.sleeperTitle ? 20 : 0) + b.reception - ((a.sleeperTitle ? 20 : 0) + a.reception))[0];
      const title = r.sleeperTitle || r.songTitle;
      r.revivedWeek = state.week;
      led.revivals++;
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
        Math.max(0, r.reception - 30) * C.revivalWindfallPerReception) * fandomMult);
      state.budget += windfall;
      KP.chartEnter(state, {
        title: title, act: g.name, company: state.company.short,
        isPlayer: true, groupId: g.id, catalog: true,
        score: C.revivalScore + (r.reception - 50) * 0.3,
        entered: state.week,
      });
      const yearsOld = Math.max(1, Math.round((state.week - r.week) / KP.C.WEEKS_PER_YEAR));
      const nar = KP.recordEvidence(state, 'catalogRevival', 'group', g.id, { title });
      if (nar) inbox.push(nar);
      inbox.push({ kind: 'public', ind: 'catalogRevival', priority: 'critical', groupId: g.id,
        catalogTitle: title, alive,
        text: alive
          ? '“' + title + '” is CHARTING. The ' + yearsOld + '-year-old track caught fire out of nowhere' +
            (clipHot ? ' — the resurfaced clip lit the fuse — ' : ' — ') +
            'and it is climbing on pure word of mouth. ' + g.name + '’s catalog just proved it never expires. The company is reprinting merch nobody expected to reprint, and the royalties came in at ' + windfall + '.'
          : '“' + title + '” is CHARTING — ' + yearsOld + ' years old, from a group that no longer exists. ' +
            g.name + ' disbanded; the song did not. Somewhere, four people who used to share a dorm are reading the same chart screenshot and typing in the old group chat. The masters, it turns out, still pay: ' + windfall + ' in catalog revenue.' });
    });
  });

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
      n.alive
        ? { persona: 'stan', text: (g ? g.name : 'the group') + ' watching their old b-side outchart half the current lineup of rookies… the catalog is undefeated. press the vinyl' }
        : { persona: 'stan', text: 'a disbanded group charting in the current year. the members are posting cryptic emojis. the fandom discord has achieved consciousness. reunion truthers, our moment' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
