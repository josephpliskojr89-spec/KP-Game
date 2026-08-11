/* The tracklist (v0.7.5) — the record is more than its title.
   Owner: "build track lists for singles, mini albums, and albums that
   the fans can react to. this gives us opportunities to actually give
   the idols opportunities at solos, units, etc." Formats have carried
   a track COUNT since v0.2.1; this gives the count names, credits, and
   consequences: open slots the player assigns (a member's first solo,
   a unit pairing that reads real chemistry), and b-sides the fandom
   digs into after a record that earns the digging. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // ---- building the record at lock time (action-time rng) ---------------
  // Track 1 is the chosen demo. B-sides are real songs with real names
  // and a hidden hook — the sleeper candidate is the best song on the
  // record that ISN'T the single, exactly like life.
  KP.buildTracklist = function (state, rng, g, demo, format) {
    const T = KP.C.TRACKS;
    const S = KP.C.SONG;
    const used = {};
    used[demo.title] = true;
    KP.groups(state).forEach(x => {
      (x.releases || []).forEach(r => {
        used[r.songTitle] = true;
        (r.tracklist || []).forEach(tr => { used[tr.title] = true; });
      });
      (x.demos || []).forEach(d => { used[d.title] = true; });
    });
    const slots = (g.type === 'solo' || (g.members || []).length < 2)
      ? 0 : (T.openSlots[format.id] || 0);
    const tracks = [];
    for (let n = 1; n <= format.tracks; n++) {
      if (n === 1) {
        tracks.push({ n: 1, title: demo.title, kind: 'title',
          producer: demo.producer, hook: demo.hook, slot: false, credit: null });
        continue;
      }
      const title = KP.genSongTitle(rng, used);
      used[title] = true;
      // open slots sit mid-record — track 3, then track 6 on a full
      const slot = (slots >= 1 && n === 3) || (slots >= 2 && n === 6);
      tracks.push({ n, title, kind: 'bside',
        producer: KP.genProducer(rng),
        hook: KP.clamp(Math.round(rng.normal(S.qualityMean - 6, S.qualitySd)), 10, 95),
        slot, credit: null });
    }
    return tracks;
  };

  // ---- the A&R pass: assigning credits during prep ----------------------
  // Lock the record, then decide whose name goes on track 3. Allowed
  // until release week; one special credit per member per record.
  KP.assignTrack = function (state, groupId, n, credit) {
    const T = KP.C.TRACKS;
    const g = KP.groupById(state, groupId);
    if (!g || !g.prep || !g.prep.tracks) return { ok: false, reason: 'No record is in production.' };
    const tr = g.prep.tracks.find(x => x.n === n);
    if (!tr) return { ok: false, reason: 'No such track on this record.' };
    if (!tr.slot) return { ok: false, reason: tr.kind === 'title'
      ? 'The title track belongs to everyone. That is what a title track is.'
      : 'That b-side is set as a full-group track. The open slots are marked.' };
    if (!credit || credit.type === 'group') { tr.credit = null; return { ok: true, note: null }; }

    const others = g.prep.tracks.filter(x => x.n !== n && x.credit);
    const credited = {};
    others.forEach(x => (x.credit.memberIds || [x.credit.memberId]).forEach(id => { credited[id] = true; }));

    if (credit.type === 'solo') {
      const p = state.people[credit.memberId];
      if (!p || !g.members.includes(credit.memberId)) return { ok: false, reason: 'She is not in this lineup.' };
      if (credited[credit.memberId]) return { ok: false, reason: KP.publicGiven(p) + ' already has a credit on this record. Spread the light.' };
      tr.credit = { type: 'solo', memberId: p.id };
      return { ok: true, note: '“' + tr.title + '” is now ' + KP.displayName(p) + '’s solo. The producers are re-cutting the guide vocal tonight.' };
    }
    if (credit.type === 'unit') {
      const ids = (credit.memberIds || []).filter((id, i, a) => a.indexOf(id) === i);
      if (g.members.length < T.minMembersForUnits) return { ok: false, reason: 'A unit needs a group big enough to have one.' };
      if (ids.length < T.unitSize[0] || ids.length > T.unitSize[1]) {
        return { ok: false, reason: 'A unit is ' + T.unitSize[0] + ' or ' + T.unitSize[1] + ' members. Fewer is a solo; more is the group.' };
      }
      if (ids.length >= g.members.length) return { ok: false, reason: 'All of them together is just the group.' };
      for (const id of ids) {
        const p = state.people[id];
        if (!p || !g.members.includes(id)) return { ok: false, reason: 'That lineup includes someone not in the group.' };
        if (credited[id]) return { ok: false, reason: KP.publicGiven(p) + ' already has a credit on this record. Spread the light.' };
      }
      tr.credit = { type: 'unit', memberIds: ids };
      const names = ids.map(id => KP.publicGiven(state.people[id])).join(' & ');
      return { ok: true, note: '“' + tr.title + '” is now the ' + names + ' unit. The practice-room whiteboard already has opinions about the choreography.' };
    }
    return { ok: false, reason: 'A track is the group’s, a solo, or a unit. Pick one.' };
  };

  // ---- release week: the credits become consequences --------------------
  // Called from resolveDebut with the release rng. Effects stay small
  // and personal — the tracklist is where individual careers start,
  // not a second reception formula.
  KP.tracklistResolve = function (state, g, rng, reception) {
    const T = KP.C.TRACKS;
    const notes = [];
    const tracks = (g.prep && g.prep.tracks) || null;
    if (!tracks) return { notes, tracks: null };

    tracks.forEach(tr => {
      if (!tr.credit) return;
      if (tr.credit.type === 'solo') {
        const p = state.people[tr.credit.memberId];
        if (!p) return;
        KP.socialSpike(state, p, T.soloSocialSpike, 'soloTrack');
        p.hype = (p.hype || 0) + T.soloHype;   // her name carries into the next cycle
        p.morale = KP.clamp(p.morale + T.soloMorale, 0, 100);
        KP.recordDirected(state, p.id, 'soloCredit', 3);   // you put her name on it (v0.8.0)
        p.history.push({ week: state.week, text: 'First solo on record: “' + tr.title + '”.' });
        const amb = KP.ambitionTouch(state, p, 'solo');
        if (amb) notes.push(amb);
        notes.push({ kind: 'public', ind: 'soloTrack', priority: 'normal',
          personId: p.id, groupId: g.id, trackTitle: tr.title,
          text: 'Track ' + tr.n + ', “' + tr.title + '”, is ' + KP.displayName(p) + ' alone — her first solo on record. ' +
            (reception >= 60
              ? 'The song is getting its own paragraphs in the album reviews, which is exactly what a first solo is for.'
              : 'The record around it is quieter than it deserves, but the people who found it are not letting it go.') });
      }
      if (tr.credit.type === 'unit') {
        const members = tr.credit.memberIds.map(id => state.people[id]).filter(Boolean);
        if (members.length < 2) return;
        members.forEach(m => { m.morale = KP.clamp(m.morale + T.unitMorale, 0, 100); });
        members.forEach(m => KP.recordDirected(state, m.id, 'unitCredit', 1));   // (v0.8.0)
        // the unit reads REAL chemistry — the fans always can
        let closest = null, worst = null;
        for (let i = 0; i < members.length; i++) {
          for (let j = i + 1; j < members.length; j++) {
            const rel = (state.relationships || {})[KP.pairKey(members[i], members[j])];
            if (!rel) continue;
            if (rel.state === 'close' && !closest) closest = [members[i], members[j]];
            if ((rel.state === 'tense' || rel.state === 'conflict') && !worst) worst = [members[i], members[j]];
          }
        }
        if (closest) members.forEach(m => { m.morale = KP.clamp(m.morale + T.unitCloseBonus, 0, 100); });
        const names = members.map(m => KP.publicGiven(m)).join(' & ');
        members.forEach(m => m.history.push({ week: state.week, text: 'Unit track with ' +
          members.filter(x => x.id !== m.id).map(x => KP.publicGiven(x)).join(' & ') + ': “' + tr.title + '”.' }));
        notes.push({ kind: 'public', ind: 'unitTrack', priority: 'normal',
          groupId: g.id, trackTitle: tr.title, memberIds: members.map(m => m.id),
          close: !!closest, strained: !!worst && !closest,
          text: 'Track ' + tr.n + ', “' + tr.title + '”, is the ' + names + ' unit. ' +
            (closest
              ? 'The chemistry is not acting — those two run on their own frequency and the recording caught it.'
              : worst
                ? 'Professional on the record, professional in the video, professional in the behind-the-scenes clip. The fans noticed how professional. Whoever paired this unit was braver than the schedule deserved.'
                : 'It works the way units work: same group, different weather.') });
      }
    });

    // the sleeper: after a record people actually played, the fandom
    // digs one b-side out and refuses to put it back
    let sleeper = null;
    if (reception >= T.sleeperReceptionMin && rng.chance(T.sleeperChance)) {
      sleeper = tracks.filter(tr => tr.kind === 'bside')
        .sort((a, b) => b.hook - a.hook)[0] || null;
      if (sleeper) {
        g.popularity = KP.clamp((g.popularity || 0) + T.sleeperPop, 0, 100);
        notes.push({ kind: 'public', ind: 'bsideSleeper', priority: 'normal',
          groupId: g.id, trackTitle: sleeper.title,
          text: 'The b-side truthers have reached a verdict: “' + sleeper.title + '” is the real best song on the record, and they are ' +
            (sleeper.credit ? 'unbearable' : 'organized') + ' about it. Playlist adds say they might not be wrong.' });
      }
    }
    return { notes, tracks, sleeperTitle: sleeper ? sleeper.title : null };
  };

  // ---- her discography, from the file ------------------------------------
  // Scan every release's tracklist for a person's credits — the dossier
  // shows where her career-inside-the-career started.
  KP.trackCreditsOf = function (state, personId) {
    const out = [];
    KP.groups(state).forEach(g => {
      (g.releases || []).forEach(r => {
        (r.tracklist || []).forEach(tr => {
          if (!tr.credit) return;
          const ids = tr.credit.memberIds || [tr.credit.memberId];
          if (!ids.includes(personId)) return;
          out.push({ week: r.week, type: tr.credit.type, trackTitle: tr.title,
            releaseTitle: r.songTitle, group: g.name,
            withIds: ids.filter(id => id !== personId) });
        });
      });
    });
    return out.sort((a, b) => a.week - b.week);
  };

  // ---- the timeline reacts (kernel registry) -----------------------------
  KP.onFeedEvent('soloTrack', (state, n, rng) => {
    const p = state.people[n.personId];
    if (!p) return null;
    return rng.pick([
      { persona: 'stan', text: KP.displayName(p) + ' SOLO. ON RECORD. track ' + '“' + n.trackTitle + '”' + ' on loop since midnight and I am not okay in a way I fully endorse' },
      { persona: 'fan', text: 'the way they gave ' + KP.publicGiven(p) + ' a whole solo b-side and she ATE it. this is what believing in your artist looks like, take notes industry' },
      { persona: 'press', text: 'Album cut worth your time: “' + n.trackTitle + '” — a first solo that sounds like it was waiting, not auditioning.' },
    ]);
  });
  KP.onFeedEvent('unitTrack', (state, n, rng) => {
    const names = (n.memberIds || []).map(id => state.people[id]).filter(Boolean).map(p => KP.publicGiven(p));
    if (!names.length) return null;
    return rng.pick(n.close ? [
      { persona: 'stan', text: 'the ' + names.join(' + ') + ' unit track was RECORDED with the mics on in the same room and you can hear that they are best friends. study it' },
      { persona: 'fan', text: names.join(' and ') + ' getting a unit together after years of dorm-cam lore… the fan service is that it isn’t service. it’s just true' },
    ] : [
      { persona: 'casual', text: 'unit tracks are how you find out who a group’s secret weapons are. today’s finding: ' + names.join(' & ') + '. filed' },
      { persona: 'stan', text: 'not the ' + names.join(' & ') + ' unit combo I predicted but the vocal blend said mind your business and it was right' },
    ]);
  });
  KP.onFeedEvent('bsideSleeper', (state, n, rng) => {
    return rng.pick([
      { persona: 'fan', text: 'day 4 of “' + n.trackTitle + '” supremacy posting. the title track is great but THIS is the one. b-side truthers rise' },
      { persona: 'casual', text: 'someone put “' + n.trackTitle + '” on my playlist and now I’m in a fandom apparently?? this is how they get you. the b-sides' },
      { persona: 'press', text: 'This week in fan-driven A&R: the streaming tail on “' + n.trackTitle + '” is outperforming its own title track’s second week. The listeners have voted.' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
