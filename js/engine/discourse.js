/* The discourse (v0.6.2) — interactive social media.
   Owner: "I want interactive social media to be a huge part of this…
   Let posts react to real events… Give the player limited company
   responses… Importantly, don't make every post actionable."

   A discourse is a trending storm with a subject and a heat level. It
   ignites from REAL events, feeds itself while live, fades if minor,
   and boils over with consequences if ignored at high heat. The
   company's options are constrained per kind; ignoring is always legal
   and frequently correct. Content law (§19 feed rules) applies in
   full: storms attack schedules, styling, songs and companies — never
   bodies. Dating rumors stay wholesome-adjacent and are, in this
   world, always false. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function list(state) { return state.discourses = state.discourses || []; }
  function dId(state) {
    state.nextDiscourseId = state.nextDiscourseId || 1;
    return 'd' + (state.nextDiscourseId++);
  }
  KP.liveDiscourses = function (state) {
    return list(state).filter(d => d.status === 'live');
  };
  KP.discourseById = function (state, id) {
    return list(state).find(d => d.id === id) || null;
  };
  KP.heatWord = function (h) {
    return h >= 70 ? 'everywhere' : h >= 45 ? 'trending' : h >= 25 ? 'simmering' : 'murmurs';
  };

  function subjectName(state, d) {
    if (d.subjectType === 'idol') {
      const p = state.people[d.subjectId];
      return p ? KP.displayName(p) : 'her';
    }
    const g = KP.groupById(state, d.subjectId);
    return g ? g.name : 'the group';
  }

  KP.discourseHeadline = function (state, d) {
    const who = subjectName(state, d);
    const p = d.subjectType === 'idol' ? (state.people[d.subjectId] || null) : null;
    switch (d.kind) {
      case 'exhausted': return 'Fans are worried: “' + who + ' looks exhausted.” Clips of tired stages are being compared side by side.';
      case 'dating': return 'A tabloid ran blurry café photos and invented a story about ' + who + '. It is false. It is also everywhere.';
      case 'styling': return 'The styling discourse found ' + who + ' — the outfits are being roasted, the stylist is being subpoenaed by the group chat.';
      case 'encore': return 'A shaky encore clip of ' + who + ' is making the rounds. The tone is split between concern and cruelty.';
      case 'benched': return who + ' being pulled from the schedule set off a wave of health-worry posts aimed at the company.';
      case 'fancam': return KP.fillPro('A ' + who + ' fancam is having a MOMENT. The algorithm has chosen {her}, and the window is open.', p);
      case 'gaffe': return who + ' posted something at 2am that reads very differently in daylight — a caption, a like, a reply. Screenshots outlive deletions, and the quote-posts are rolling in.';
      default: return 'Something about ' + who + ' is trending.';
    }
  };

  // ---- ignition ---------------------------------------------------------
  KP.igniteDiscourse = function (state, rng, kind, subjectType, subjectId, groupId) {
    const D = KP.C.DISCOURSE;
    const spec = D.KINDS[kind];
    if (!spec) return null;
    if (KP.liveDiscourses(state).length >= D.maxLive) return null;
    if (list(state).some(d => d.status === 'live' && d.kind === kind &&
      String(d.subjectId) === String(subjectId))) return null;
    const d = {
      id: dId(state), kind, subjectType, subjectId, groupId: groupId || null,
      week: state.week, heat: rng.int(spec.start[0], spec.start[1]),
      negative: !!spec.negative, status: 'live', responded: false,
    };
    list(state).push(d);
    // history stays bounded: resolved storms beyond a dozen are forgotten
    const dead = list(state).filter(x => x.status !== 'live');
    if (dead.length > 12) {
      state.discourses = list(state).filter(x => x.status === 'live')
        .concat(dead.slice(-12));
    }
    return {
      kind: spec.negative ? 'public' : 'public', urgent: spec.negative,
      ind: 'discourse', discourseId: d.id,
      text: 'PR flag — ' + spec.label + ' (' + KP.heatWord(d.heat) + '): ' +
        KP.discourseHeadline(state, d) + ' Response options are on the Feed desk. Ignoring it is also a strategy.',
    };
  };

  // ---- the weekly burn --------------------------------------------------
  KP.discourseWeek = function (state, rng) {
    const D = KP.C.DISCOURSE;
    const notes = [];

    // new weekly-pattern ignitions
    KP.groups(state).forEach(g => {
      if (!g.debuted || state.week > (g.promoUntil || 0)) return;
      const members = g.members.map(id => state.people[id]);
      const avgF = members.reduce((s, m) => s + m.fatigue, 0) / members.length;
      if (avgF >= 75 && rng.chance(D.exhaustedChance)) {
        const tired = members.slice().sort((a, b) => b.fatigue - a.fatigue)[0];
        const n = KP.igniteDiscourse(state, rng, 'exhausted', 'idol', tired.id, g.id);
        if (n) notes.push(n);
      }
    });
    state.roster.forEach(id => {
      const p = state.people[id];
      if (p.status === 'idol' && (p.social || 0) >= D.datingMinSocial && rng.chance(D.datingChance)) {
        const g = KP.groupOf(state, p.id);
        const n = KP.igniteDiscourse(state, rng, 'dating', 'idol', p.id, g && g.id);
        if (n) notes.push(n);
      }
      // the posting incident (v0.6.8): tired people post carelessly —
      // the storm has a systemic cause, not just a dice roll
      if (p.status === 'idol' && (p.social || 0) >= D.gaffeMinSocial) {
        const chance = D.gaffeChance + (p.fatigue >= D.gaffeTiredAt ? D.gaffeTiredBonus : 0);
        if (rng.chance(chance)) {
          const g = KP.groupOf(state, p.id);
          const n = KP.igniteDiscourse(state, rng, 'gaffe', 'idol', p.id, g && g.id);
          if (n) notes.push(n);
        }
      }
    });

    // burn: grow, decay, fade, boil. Cool storms tend to die (most do);
    // hot ones feed themselves; even a missed response bleeds heat —
    // the desk's advice ("most storms die on their own") must be TRUE
    KP.liveDiscourses(state).forEach(d => {
      if (d.negative) {
        const feed = rng.int(D.weeklyGrowth[0], D.weeklyGrowth[1]);
        // an organized fandom floods the tag with fancams (v0.7.0)
        const g = d.groupId && KP.groupById(state, d.groupId);
        const defense = (g && KP.fandomIntensity(g) >= KP.C.FANDOM.stormDefenseAt)
          ? KP.C.FANDOM.stormDefenseCool : 0;
        const cool = D.weeklyDecay + (d.heat < 45 ? 3 : 0) + (d.responded ? 4 : 0) + defense;
        d.heat += feed - cool;
      } else {
        d.heat += -D.weeklyDecay + rng.int(0, 6);
      }
      d.heat = KP.clamp(d.heat, 0, 100);
      if (d.heat < D.fadeBelow) {
        d.status = 'faded';
        return;
      }
      if (d.negative && d.heat >= D.boilAt) {
        d.status = 'boiled';
        const g = d.groupId && KP.groupById(state, d.groupId);
        if (g) g.popularity = KP.clamp((g.popularity || 0) - D.boilPopHit, 0, 100);
        const p = d.subjectType === 'idol' && state.people[d.subjectId];
        if (p) {
          p.morale = KP.clamp(p.morale - D.boilMoraleHit, 0, 100);
          // the scar (v0.8.3): a boiled storm shadows her for weeks —
          // mood word, bubble tone, and a recovery scene when it lifts
          p.flags.scar = KP.C.SCAR.weeks;
        }
        notes.push({ kind: 'public', urgent: true, ind: 'discourseBoiled', discourseId: d.id,
          text: 'The ' + KP.C.DISCOURSE.KINDS[d.kind].label + ' around ' + subjectName(state, d) +
            ' boiled over before it burned out. The narrative set without us' +
            (g ? '; ' + g.name + ' felt it' : '') + '. Sometimes silence is a statement too — this time it read as one.' });
      }
    });
    return notes;
  };

  // ---- the response menu ------------------------------------------------
  KP.respondDiscourse = function (state, discourseId, action) {
    const D = KP.C.DISCOURSE;
    const d = KP.discourseById(state, discourseId);
    if (!d || d.status !== 'live') return { ok: false, reason: 'That story has already run its course.' };
    if (d.responded) return { ok: false, reason: 'The company has spoken once. Speaking twice IS the story.' };
    const spec = D.KINDS[d.kind];
    if (!spec.actions.includes(action)) return { ok: false, reason: 'Not a move the room would sign off on here.' };

    const cost = action === 'statement' ? D.statementCost : action === 'legal' ? D.legalCost : 0;
    if (cost && state.budget < cost) return { ok: false, reason: 'PR hours cost money the budget does not have.' };
    state.budget -= cost;

    const rng = KP.rngFor(state);
    const p = d.subjectType === 'idol' ? state.people[d.subjectId] : null;
    const g = d.groupId ? KP.groupById(state, d.groupId) : (d.subjectType === 'group' ? KP.groupById(state, d.subjectId) : null);
    const who = subjectName(state, d);

    let chance = D.baseSuccess[action] || 0.5;
    if (action === 'statement' && p) chance += (p.personality.professionalism - 50) / 250;
    if (action === 'livestream' && p) chance += (p.personality.warmth - 50) / 200;
    // standing gates sincerity (v0.8.3): the public can hear whether an
    // apology or a live comes from somewhere real — a girl who trusts
    // the office sells the company line; one counting the days cannot
    if ((action === 'statement' || action === 'livestream') && p) {
      const st = KP.standingScore(state, p);
      if (st >= KP.C.SCAR.leaderEaseStanding) chance += KP.C.SCAR.sincerityGate;
      else if (st <= -3) chance -= KP.C.SCAR.sincerityGate;
    }
    if (action === 'meme' && d.subjectType === 'idol' &&
      KP.getNarrative(state, 'fancamStar', 'idol', d.subjectId)) chance += 0.15;
    chance -= Math.max(0, d.heat - 55) / 220;   // hotter storms are harder to steer
    chance = KP.clamp(chance, 0.15, 0.92);

    if (action === 'livestream' && p) {
      p.fatigue = KP.clamp(p.fatigue + D.livestreamFatigue, 0, 100);
    }

    d.responded = true;
    d.response = action;
    let outcome, text, feedText;
    const roll = rng.next();
    const legalBackfired = action === 'legal' && rng.chance(D.legalBackfire);

    if (legalBackfired) {
      outcome = 'backfire';
      d.heat = KP.clamp(d.heat + 30, 0, 100);
      text = 'Legal sent the letter. The internet framed it within the hour: “they’re threatening fans now.” The rumor was false; the reaction is real. Heat is UP.';
      feedText = 'the legal threat over the ' + who + ' rumor is such a bad look. the rumor was dumb but THIS is a story';
    } else if (roll < chance) {
      outcome = 'success';
      d.status = 'resolved';
      if (!d.negative) {
        // riding a positive wave converts attention into reach
        if (p) KP.socialSpike(state, p, D.memeFollowerGain, 'discourseWin');
        if (g) g.popularity = KP.clamp((g.popularity || 0) + 2, 0, 100);
      }
      if (action === 'apology') {
        if (g) g.popularity = KP.clamp((g.popularity || 0) - D.apologyPopCost, 0, 100);
      }
      text = {
        statement: 'The statement was short, specific and human. The quote-posts turned from anger to “okay, fair.” The story is cooling.',
        apology: 'The apology conceded the point cleanly. It costs a little pride and a little shine — and it closed the story.',
        legal: 'Legal’s letter landed quietly and the accounts that mattered deleted. The rumor died the boring death it deserved.',
        meme: 'The company account leaned all the way in. The joke landed, the quote tweets flipped, and the algorithm rewarded shamelessness.',
        livestream: KP.fillPro(who + ' went live for two hours — no script, mostly snacks. You cannot stay mad at a person who shows you {pos} dog.', p),
      }[action];
      feedText = {
        statement: 'okay the ' + state.company.short + ' statement was actually… fine? direct? growth',
        apology: 'they APOLOGIZED apologized. no lawyer voice. noted and respected',
        legal: 'the ' + who + ' rumor accounts went quiet overnight. good riddance',
        meme: state.company.short + '’s admin posting the meme themselves. a coward would have issued a statement. legends',
        livestream: KP.fillPro(who + ' live for two hours and now I physically cannot be mad about anything. {she} showed the DOG', p),
      }[action];
    } else {
      outcome = 'miss';
      d.heat = KP.clamp(d.heat + 8, 0, 100);
      text = {
        statement: 'The statement read like it was written by a committee of lawyers being watched by a second committee of lawyers. It fed the story a fresh news cycle.',
        apology: 'The apology hit the wrong note — too fast for some, too little for others. The story rolls on.',
        legal: 'Legal moved, the accounts lawyered up, and the story got a second act it did not deserve.',
        meme: 'The company account attempted The Joke. The internet performed surgery on it. Heat is up a notch.',
        livestream: who + ' went live, and it was fine — but tired is hard to hide on camera, and the comments noticed.',
      }[action];
      feedText = {
        statement: 'three paragraphs of corporate nothing from ' + state.company.short + '. who writes these',
        apology: 'that apology apologized for the WEATHER. address the actual thing next time',
        legal: 'lawyering up over THAT? interesting choice. interesting…',
        meme: 'the admin tried to be funny and I need them to log off immediately. immediately',
        livestream: KP.fillPro('{she} went live and {she} is clearly exhausted, this made it worse actually. let {her} SLEEP', p),
      }[action];
    }

    // the response itself becomes a post, right now
    state.feed = state.feed || [];
    state.feed.unshift({
      week: state.week,
      handle: KP.genFanHandle(rng, null),
      persona: outcome === 'success' ? 'fan' : 'anti',
      text: feedText,
      likes: rng.int(40, 900),
    });
    if (state.feed.length > KP.C.FEED.maxPosts) state.feed.length = KP.C.FEED.maxPosts;

    state.rngState = rng.state();
    return { ok: true, outcome, text };
  };
})(typeof window !== 'undefined' ? window : globalThis);
