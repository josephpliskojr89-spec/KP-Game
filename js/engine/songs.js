/* Song demos and concepts. Songs are procedural assets with qualities the
   player weighs against the roster — never a DAW, always a judgment call. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // The pitch meeting. With a creative direction set (v0.6.7), the
  // producers write TO the brief: most demos in-lane and a little
  // sharper for it, one adjacent to stretch, one wildcard they push
  // anyway — producers gonna produce.
  KP.generateDemos = function (state, rng, group, opts) {
    const S = KP.C.SONG;
    const MK = KP.C.MARKET;
    const camp = !!(opts && opts.camp);
    const D = KP.C.DIRECTION;
    const P = KP.C.PITCH;
    const demos = [];
    const usedTitles = {};
    // titles already in any discography stay retired — no accidental reissues
    KP.groups(state).forEach(g => (g.releases || []).forEach(r => { usedTitles[r.songTitle] = true; }));
    const direction = group && group.concept ? KP.conceptById(group.concept) : null;
    for (let i = 0; i < S.demoCount + (camp ? MK.campDemos : 0); i++) {
      const title = KP.genSongTitle(rng, usedTitles);
      let concept;
      if (direction && i < D.laneSlots) {
        concept = direction;                                   // to the brief
      } else if (direction && i === D.laneSlots) {
        concept = rng.pick(KP.C.CONCEPTS.filter(c => c.id !== direction.id));  // the stretch
      } else {
        concept = rng.pick(KP.C.CONCEPTS);                     // the wildcard
      }
      const toBrief = !!(direction && concept.id === direction.id);
      // the credits (v0.9.7): pitches come from the persistent pool —
      // names with track records, not strings
      const pr = KP.pickProducer(state, rng, concept.id);
      // a snubbed producer sends this room his B-grade material (v0.9.17):
      // pass his pushes twice and the good hooks go elsewhere — where
      // they become ghost demos, which was always the ghost's origin story
      const snubbed = group && pr.snubs && (pr.snubs[group.id] || 0) >= P.snubsAt;
      // the song market (v0.10.5): a producer with records made HERE
      // shows this room his best — repeat collaboration is a discount
      // paid in access, not money
      const bonded = !!(group && pr.works &&
        pr.works.filter(w => w.groupId === group.id).length >= MK.bondAt);
      demos.push({
        id: 'song' + (i + 1),
        title,
        producer: pr.name,
        producerId: pr.id,
        conceptId: concept.id,
        toBrief,
        bonded,
        hook: KP.clamp(q(rng) + (toBrief ? D.briefHookBonus : 0) - (snubbed ? P.snubHookMalus : 0) + (bonded ? MK.bondHookBonus : 0) + (camp ? MK.campHookShift : 0), 10, 95),
        vocalDemand: q(rng), rapDemand: KP.clamp(q(rng) - 15, 5, 95),
        choreoPotential: q(rng), trendFit: q(rng),
      });
    }
    // ---- the advocates (v0.9.17): the meeting has politics --------------
    // ONE producer campaigns hard this meeting — his own best hook
    const pushIdx = demos.reduce((bi, d, i) => d.hook > demos[bi].hook ? i : bi, 0);
    demos[pushIdx].pushed = true;
    // the exec's known taste marks its own — deterministic, everyone
    // in the building knows what she likes
    const taste = KP.execTaste(state);
    demos.forEach(d => { if (d.conceptId === taste) d.execFavored = true; });
    // and sometimes a member who writes puts her OWN demo on the table,
    // against the professionals' — wilder odds, realer stakes
    if (group && group.members) {
      const CR = KP.C.CREDITS;
      const writers = group.members.map(id => state.people[id]).filter(p => p &&
        ((p.archetypes || []).includes('producerMinded') ||
          p.personality.creativity >= CR.writeCreativityAt));
      if (writers.length && rng.chance(P.memberDemoChance)) {
        // durable census stamp: the meeting carried a member's demo
        state.pitchLedger = state.pitchLedger || { memberDemos: 0 };
        state.pitchLedger.memberDemos++;
        const w = writers[rng.int(0, writers.length - 1)];
        const concept = direction || rng.pick(KP.C.CONCEPTS);
        demos.push({
          id: 'song' + (demos.length + 1),
          title: KP.genSongTitle(rng, usedTitles),
          producer: KP.displayName(w), producerId: null,
          writtenBy: w.id,
          conceptId: concept.id,
          toBrief: !!(direction && concept.id === direction.id),
          hook: KP.clamp(Math.round(rng.normal(S.qualityMean + P.memberHookShift, P.memberHookSd)), 10, 95),
          vocalDemand: q(rng), rapDemand: KP.clamp(q(rng) - 15, 5, 95),
          choreoPotential: q(rng), trendFit: q(rng),
        });
      }
    }
    // the song market (v0.10.5): the sheet gets prices and clocks.
    // A member's own demo is hers (price 0); everyone else's asking
    // price scales with the hook and the producer's heat, and a hook
    // hot enough is CIRCULATING — a dated window before other rooms
    // may buy it out from under this one.
    demos.forEach(d => {
      if (d.writtenBy) { d.price = 0; return; }
      const pr2 = d.producerId && KP.producerById(state, d.producerId);
      const heat = pr2 ? KP.producerHeat(pr2) : 'unproven';
      d.price = Math.max(0, Math.round((d.hook - MK.priceFloorHook) * MK.pricePerHook * (MK.heatMult[heat] || 1)));
      if (d.hook >= MK.circulatingAt) d.circUntil = state.week + MK.windowWeeks;
    });
    function q(r) { return KP.clamp(Math.round(r.normal(S.qualityMean, S.qualitySd)), 10, 95); }
    return demos;
  };

  // The creative direction (v0.6.7): a group-level commitment the
  // producers pitch to. Free to set while undebuted; changing an active
  // group's direction re-tools the next cycle's pitches.
  // genre-bending (v0.9.6): the mash reads as a K- prefix on the first
  // genre and a collision with the second — "K-metalcore × trot"
  KP.mashLabel = function (mash) {
    if (!mash || mash.length !== 2) return '';
    return 'K-' + mash[0] + ' × ' + mash[1];
  };

  KP.setGroupConcept = function (state, groupId, conceptId) {
    const g = KP.groupById(state, groupId);
    if (!g) return { ok: false, reason: 'No such group.' };
    if (conceptId != null && !KP.conceptById(conceptId)) {
      return { ok: false, reason: 'No stylist has heard of that concept.' };
    }
    if (g.prep) return { ok: false, reason: 'A release is locked. The direction changes between cycles, not mid-production.' };
    const before = g.concept || null;
    g.concept = conceptId || null;
    if (before === g.concept) return { ok: true, note: null };
    g.conceptRun = 0;   // a new lane starts a new streak — identity is earned per lane
    g.demos = null;     // the producers re-tool: fresh pitches next time
    const note = g.concept
      ? 'Creative direction set: ' + KP.conceptById(g.concept).label + ' for ' + g.name +
        '. The producers have the brief' + (before ? ' — and the re-tooling starts tonight' : '') + '. The next pitch meeting will sound like it.'
      : g.name + '’s direction is open again. The producers will pitch the whole field.';
    return { ok: true, note };
  };

  // Renaming a demo (v0.8.4, owner request): the producers pitch the
  // working title; the company names the record. Locked in at the
  // studio before the release is scheduled.
  KP.renameDemo = function (state, groupId, songId, title) {
    const g = KP.groupById(state, groupId);
    const demo = ((g && g.demos) || []).find(d => d.id === songId);
    if (!demo) return { ok: false, reason: 'No such demo on the board.' };
    title = String(title || '').trim().slice(0, 24);
    if (!title.length) return { ok: false, reason: 'A title needs letters.' };
    const used = {};
    KP.groups(state).forEach(x => (x.releases || []).forEach(r => {
      used[r.songTitle.toLowerCase()] = true;
      (r.tracklist || []).forEach(tr => { used[tr.title.toLowerCase()] = true; });
    }));
    if (used[title.toLowerCase()]) {
      return { ok: false, reason: 'That title is already in a discography. The archive keeps receipts.' };
    }
    demo.title = title;
    demo.renamed = true;
    return { ok: true };
  };

  // renaming a track in production (0.9.7.1, owner: "I want them to be
  // memorable rather than feel generated") — the credited songs
  // especially: her first solo deserves a name somebody chose
  KP.renameTrack = function (state, groupId, trackN, title) {
    const g = KP.groupById(state, groupId);
    const tracks = g && g.prep && g.prep.tracks;
    const tr = (tracks || []).find(x => x.n === Number(trackN));
    if (!tr) return { ok: false, reason: 'No such track in production.' };
    if (tr.kind === 'title') return { ok: false, reason: 'The title track is renamed on the demo board, before the lock.' };
    title = String(title || '').trim().slice(0, 24);
    if (!title.length) return { ok: false, reason: 'A title needs letters.' };
    const used = {};
    KP.groups(state).forEach(x => (x.releases || []).forEach(r => {
      used[r.songTitle.toLowerCase()] = true;
      (r.tracklist || []).forEach(t2 => { used[t2.title.toLowerCase()] = true; });
    }));
    tracks.forEach(t2 => { if (t2 !== tr) used[t2.title.toLowerCase()] = true; });
    if (used[title.toLowerCase()]) {
      return { ok: false, reason: 'That title is already in a discography. The archive keeps receipts.' };
    }
    tr.title = title;
    tr.renamed = true;
    return { ok: true };
  };

  KP.conceptById = function (id) {
    return KP.C.CONCEPTS.find(c => c.id === id);
  };

  // Individual concept fit (hidden): how a member's talents + personality
  // resonate with a concept. The source of accidental stars.
  KP.conceptFit = function (person, concept) {
    let num = 0, den = 0;
    Object.keys(concept.weights).forEach(d => {
      num += person.talents[d].cur * concept.weights[d];
      den += concept.weights[d];
    });
    let fit = num / den;
    Object.keys(concept.personality || {}).forEach(trait => {
      fit += (person.personality[trait] - 50) * 0.12 * concept.personality[trait];
    });
    return KP.clamp(fit, 0, 100);
  };

  // Staff opinion of a demo for a specific lineup — perceived, in words.
  KP.demoOpinion = function (state, demo, members) {
    const concept = KP.conceptById(demo.conceptId);
    const lines = [];
    if (demo.hook >= 72) lines.push('The hook does not leave your head. That is the point of a hook.');
    else if (demo.hook <= 40) lines.push('The chorus is doing a lot of standing around.');
    if (members && members.length) {
      const avgVocal = members.reduce((s, m) => s + m.talents.vocals.cur, 0) / members.length;
      const avgDance = members.reduce((s, m) => s + m.talents.dance.cur, 0) / members.length;
      const maxRap = Math.max.apply(null, members.map(m => m.talents.rap.cur));
      if (demo.vocalDemand > avgVocal + 12) lines.push('Vocally, this asks more than the room currently has.');
      if (demo.choreoPotential > 70 && avgDance < 50) lines.push('The choreography this deserves would eat this lineup alive.');
      if (demo.rapDemand > 55 && maxRap < 45) lines.push('There is a rap verse here and no one to give it to.');
      const fits = members.map(m => KP.conceptFit(m, concept));
      const spread = Math.max.apply(null, fits) - Math.min.apply(null, fits);
      if (spread > 30) lines.push('This concept fits some of these members far better than others.');
    }
    if (demo.trendFit >= 70) lines.push('Right sound, right year. The market is already leaning this way.');
    else if (demo.trendFit <= 35) lines.push('Nobody is asking for this sound right now. That is either a problem or a statement.');
    if (!lines.length) lines.push('A professional record. Whether it becomes more depends on who stands in front of it.');
    return lines;
  };
})(typeof window !== 'undefined' ? window : globalThis);
