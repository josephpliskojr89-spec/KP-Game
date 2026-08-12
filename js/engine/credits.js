/* The credits (v0.9.7) — §39 consult #8. The names behind the songs
   become people: a persistent producer pool with visible track records
   and home lanes; repeat collaboration hardens into a signature-sound
   narrative; the demo you passed on gets shopped and comes back as a
   rival hit (the industry's favorite ghost story); and members who
   reach for a pen get their names inside the booklet — the credit that
   shifts perception from performer to artist. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // ---- the persistent pool ----------------------------------------------
  const PR_WORD = ['Glasshouse', 'Mireu', 'Daybreak', 'Vermilion', 'Kestrel',
    'Juniper', 'Onyx', 'Hollow', 'Satellite', 'Meridian', 'Peach', 'Voltage'];
  function h(state, key) { return KP.hash01([state.seed, 'prodpool', key].join('|')); }
  KP.producersOf = function (state) {
    if (!state.producerPool) {
      const C = KP.C.CREDITS;
      state.producerPool = [];
      const taken = new Set();
      for (let i = 0; i < C.producerCount; i++) {
        let name = null;
        // salt until unique — a writers' room needs distinct names
        for (let salt = 0; salt < 8 && (!name || taken.has(name)); salt++) {
          const w1 = PR_WORD[Math.floor(h(state, i + 'a' + salt) * PR_WORD.length)];
          const w2 = PR_WORD[Math.floor(h(state, i + 'b' + salt) * PR_WORD.length)];
          const style = Math.floor(h(state, i + 'c' + salt) * 4);
          name = style === 0 ? 'Studio ' + w1
            : style === 1 ? w1 + ' Collective'
            : style === 2 ? w1.toUpperCase() + (w2 !== w1 ? ' & ' + w2 : ' & Co.')
            : 'producer ' + w1.slice(0, 3).toUpperCase();
        }
        taken.add(name);
        const lane = KP.C.CONCEPTS[Math.floor(h(state, i + 'lane') * KP.C.CONCEPTS.length)].id;
        state.producerPool.push({ id: 'pr' + i, name, lane, works: [] });
      }
    }
    return state.producerPool;
  };
  // the pitch pick: producers mostly work their home lane
  KP.pickProducer = function (state, rng, conceptId) {
    const C = KP.C.CREDITS;
    const pool = KP.producersOf(state);
    const inLane = pool.filter(p => p.lane === conceptId);
    if (inLane.length && rng.chance(C.laneStickiness)) {
      return inLane[rng.int(0, inLane.length - 1)];
    }
    return pool[rng.int(0, pool.length - 1)];
  };
  KP.producerById = function (state, id) {
    return KP.producersOf(state).find(p => p.id === id) || null;
  };
  // words, never a meter: how the desk describes a track record
  KP.producerHeat = function (pr) {
    if (!pr.works.length) return 'unproven';
    const avg = pr.works.reduce((s, w) => s + w.reception, 0) / pr.works.length;
    if (avg >= 66) return 'in demand';
    if (avg >= 55) return 'reliable';
    if (avg >= 45) return 'workmanlike';
    return 'cold streak';
  };

  // ---- the weekly ledger --------------------------------------------------
  KP.registerWeekly('credits', 880, function (state, rng, inbox, roster, groups) {
    const C = KP.C.CREDITS;

    groups.forEach(g => {
      // harvest the ghost: at lock, the best demo left on the table with
      // a real hook gets shopped around — producers gonna produce
      if (g.prep && !g.prep.ghostHarvested) {
        g.prep.ghostHarvested = 1;
        const left = (g.demos || []).filter(d => d.id !== g.prep.songId &&
          d.hook >= C.ghostHookMin).sort((a, b) => b.hook - a.hook)[0];
        if (left) {
          state.ghostDemos = (state.ghostDemos || []);
          state.ghostDemos.push({ title: left.title, hook: left.hook,
            producer: left.producer, week: state.week, groupName: g.name });
          if (state.ghostDemos.length > C.ghostCap) state.ghostDemos.shift();
        }
      }

      // the release ledger: this week's record goes on its producer's
      // track record; enough records together become a signature sound
      if (g.lastReleaseWeek === state.week && (g.releases || []).length) {
        const rel = g.releases[g.releases.length - 1];
        const pr = rel.producerId && KP.producerById(state, rel.producerId);
        if (pr) {
          pr.works.push({ week: state.week, title: rel.songTitle, reception: rel.reception, groupId: g.id });
          if (pr.works.length > C.worksCap) pr.works.shift();
          const together = pr.works.filter(w => w.groupId === g.id).length;
          if (together >= C.signatureAt) {
            const nar = KP.recordEvidence(state, 'signatureSound', 'group', g.id, { producer: pr.name });
            if (nar) inbox.push(nar);
          }
        }
        // the booklet: members who wrote get their names read out loud
        (rel.tracklist || []).forEach(tk => {
          if (!tk.writtenBy) return;
          const p = state.people[tk.writtenBy];
          if (!p) return;
          p.flags.writerCredits = (p.flags.writerCredits || 0) + 1;
          if (p.flags.writerCredits === 1) {
            p.history.push({ week: state.week, text: 'First songwriting credit: “' + tk.title + '.” The booklet says so.' });
            KP.socialSpike(state, p, KP.C.SOCIAL.viralSpike * 0.3, 'writer');
            inbox.push({ kind: 'public', ind: 'memberWrote', priority: 'high', personId: p.id,
              text: KP.fillPro(KP.publicGiven(p) + ' has a SONGWRITING credit on the new record — “' + tk.title + ',” co-written, name in the booklet. The fandom is passing the liner notes around like evidence. Performer is a job; artist is a verdict, and it just shifted.', p) });
          } else if (rng.chance(0.4)) {
            inbox.push({ kind: 'public', ind: 'memberWrote', priority: 'flavor', personId: p.id,
              text: KP.fillPro('Another pen credit for ' + KP.publicGiven(p) + ' — “' + tk.title + '.” That is ' + p.flags.writerCredits + ' now. Nobody calls it a surprise anymore, which is its own milestone.', p) });
          }
        });
      }
    });

    // the ghost resurfaces: a shopped demo, aged and shopped again,
    // comes back as somebody else's hit — the industry's favorite story
    const ghosts = state.ghostDemos || [];
    if (ghosts.length) {
      const aged = ghosts.find(gh => state.week - gh.week >= C.ghostAgeWeeks);
      if (aged) {
        const hit = (state.weekReleases || []).find(w => (w.reception || 0) >= C.ghostHitAt);
        if (hit && rng.chance(C.ghostChance)) {
          state.ghostDemos = ghosts.filter(x => x !== aged);
          const found = KP.rivalActById(state, hit.actId);
          if (found && found.act) found.act.popularity = KP.clamp((found.act.popularity || 0) + 2, 0, 100);
          inbox.push({ kind: 'industry', ind: 'ghostDemo', priority: 'high',
            text: 'The industry’s favorite ghost story, starring us: “' + hit.title + '” — ' + hit.actName + '’s hit of the week — is, per everyone who was in the room, the demo ' + aged.producer + ' pitched for ' + aged.groupName + ' and this company passed on. Retooled, retitled, unmistakable. The A&R meeting about it is scheduled for tomorrow and will be very quiet.' });
        }
      }
    }
  });

  // ---- the timeline answers ---------------------------------------------
  KP.onFeedEvent('memberWrote', (state, n, rng) => {
    const p = state.people[n.personId];
    return rng.pick([
      { persona: 'stan', text: (p ? KP.publicGiven(p).toUpperCase() : 'SHE') + ' WROTE IT. name in the booklet. we are framing the liner notes. artist era confirmed' },
      { persona: 'fan', text: KP.fillPro('the shift from “{she} performs songs” to “{she} writes songs” is doing something to the general public and to me personally', p) },
      { persona: 'casual', text: 'idol songwriting credits always change how a group gets talked about. watch the word “artist” start appearing in the coverage' },
    ]);
  });
  KP.onFeedEvent('ghostDemo', (state, n, rng) => {
    return rng.pick([
      { persona: 'press', text: 'Industry sources confirm this week’s chart riser began life as a demo pitched — and passed on — elsewhere. The A&R subplot writes itself.' },
      { persona: 'fan', text: 'finding out a rival’s hit was OUR rejected demo is a specific genre of pain. the pitch meeting that got away' },
      { persona: 'casual', text: 'the rejected-demo-becomes-a-hit story happens every year and every year it is the best gossip the industry produces' },
    ]);
  });
  KP.onFeedEvent('graduation', (state, n, rng) => {
    const p = state.people[n.personId];
    return rng.pick([
      { persona: 'fan', text: (p ? KP.publicGiven(p) : 'the trainee') + ' in the graduation gown with the members holding flowers. growth chart: visible from space. crying' },
      { persona: 'casual', text: 'idol graduation photos are the one genre of content where the whole internet just behaves for a day' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
