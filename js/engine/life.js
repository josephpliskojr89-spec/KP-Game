/* The inner life (v0.7.1) — idols are people, not attribute sets.
   Expert consult: "she has no dorm, no off-day, no pet… morale is
   weather, not psychology." Personal facts and ambitions are stable
   hash-truth (zero rng, zero save bytes — like §28 strongholds); the
   Bubble leaks the fatigue/morale numbers the sim already computes to
   a public surface; the dorm gives chemistry a domestic lever. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // ---- off the clock: two facts per person, forever ---------------------
  KP.factsOf = function (state, p) {
    const F = KP.C.LIFE.FACTS;
    const a = Math.floor(KP.hash01([state.seed, p.id, 'fact1'].join('|')) * F.length);
    const b = (a + 1 + Math.floor(KP.hash01([state.seed, p.id, 'fact2'].join('|')) * (F.length - 1))) % F.length;
    return [KP.fillPro(F[a], p), KP.fillPro(F[b], p)];
  };

  // ---- what she wants: one ambition, seeded by who she is ---------------
  KP.ambitionOf = function (state, p) {
    if ((p.archetypes || []).includes('varietyNatural')) return 'variety';
    if ((p.archetypes || []).includes('centerCandidate') || p.talents.charisma.cur >= 68) return 'solo';
    if (p.personality.competitiveness >= 62) return 'trophy';
    const keys = ['solo', 'trophy', 'stage', 'variety'];
    return keys[Math.floor(KP.hash01([state.seed, p.id, 'wants'].join('|')) * keys.length)];
  };
  // the day the dream lands — one door for every fulfillment site
  KP.ambitionTouch = function (state, p, kind) {
    if (!p || p.status !== 'idol') return null;
    if (KP.ambitionOf(state, p) !== kind || p.flags.ambitionMet) return null;
    p.flags.ambitionMet = state.week;
    p.morale = KP.clamp(p.morale + KP.C.LIFE.ambitionMoraleBonus, 0, 100);
    p.history.push({ week: state.week, text: KP.fillPro('The thing {she} always wanted — ' +
      KP.C.LIFE.AMBITIONS[kind].label + ' — actually happened.', p) });
    return { kind: 'company', ind: 'ambitionMet', personId: p.id,
      text: KP.fillPro(KP.displayName(p) + ' got the thing {she} always wanted: ' + KP.C.LIFE.AMBITIONS[kind].label +
        '. The staff say {she} called home first, then cried in the practice room, in that order. Some numbers do not show this. Morale does.', p) };
  };

  // ---- the bubble: her side of the screen, finally ----------------------
  // Weekly, hash-gated, wholesome by construction. The tone reads her
  // TRUE state — the feed starts showing interiority instead of
  // asserting it.
  KP.bubblePosts = function (state) {
    const posts = [];
    KP.groups(state).forEach(g => {
      if (!g.debuted) return;
      g.members.forEach(id => {
        const p = state.people[id];
        if (!p || p.status !== 'idol') return;
        if (KP.hash01([state.seed, p.id, state.week, 'bubble'].join('|')) >= KP.C.LIFE.bubbleChance) return;
        const fact = KP.factsOf(state, p)[state.week % 2];
        const name = KP.publicGiven(p);
        // the families (v0.11.2, §93): every line keeps the word "bubble" —
        // the harness tallies it
        const salt = 'bubble|' + p.id;
        let text;
        if (p.flags.scar > 0) {
          text = KP.lineFor(state, salt, [
            name + '’s bubble this week was two messages and a photo of the sky. no caption. we are all replying “take your time” and meaning it. {she} reads them. we know {she} reads them',
            name + '’s bubble: one message this week. “thank you for waiting.” that is all. that is enough. {she} is reading the replies — you can tell from the timing',
            'the ' + name + ' bubble went quiet for six days and then: a photo of {pos} shoes by the door. going somewhere. small steps. we are here',
          ]);
        } else if (p.fatigue >= 70) {
          text = KP.lineFor(state, salt, [
            'bubble from ' + name + ' at 3am: “still at the company. eat well tomorrow, promise me.” {she} is comforting US. someone protect {her}',
            name + '’s bubble at 2am: a photo of the practice-room clock and “almost done.” the clock said 2:14. {she} was not almost done. protect {her}',
            'bubble from ' + name + ': “slept four hours, feeling great!!” the fandom has started a sleep-tracking thread. we are not okay with four',
          ]);
        } else if (p.morale >= 72) {
          text = KP.lineFor(state, salt, [
            name + '’s bubble today was 14 messages, 9 of them photos of {pos} lunch, and one voice note of {her} laughing at {pos} own joke. subscription justified forever',
            name + ' sent a bubble voice note that was just {her} singing the chorus of a song {she} refuses to name. 31 seconds. the 10-hour loop is already up',
            name + '’s bubble today: a tour of {pos} desk, item by item, with commentary. the stapler got a backstory. the subscription paid for itself',
          ]);
        } else if (state.week <= (g.tourRestUntil || 0) || state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks && state.week > (g.promoUntil || 0)) {
          text = KP.lineFor(state, salt, [
            'day-off bubble: ' + name + ' — who ' + fact + ' — sent a full photo diary of it. rest era content is the BEST content',
            'rest-week bubble from ' + name + ': three photos of food, one of a cat that is not {hers}, and “don’t worry about me.” we are worrying about {her} correctly',
            'day-off bubble: ' + name + ' — who ' + fact + ' — spent the whole day on exactly that and reported in like a field scientist. rest era supremacy',
          ]);
        } else {
          text = KP.lineFor(state, salt, [
            name + ' casually mentioned in bubble that {she} ' + fact + '. the fandom wiki was updated within four minutes',
            name + '’s bubble today confirmed that {she} ' + fact + '. the fan wiki has a citation now. the citation is a screenshot',
            'bubble from ' + name + ': “random fact about me today.” the fact: {she} ' + fact + '. the wiki editors were already awake',
          ]);
        }
        posts.push({ persona: 'fan', text: KP.fillPro(text, p) });
      });
    });
    return posts;
  };

  // ---- the regulars: a feed with people in it ---------------------------
  KP.regularFor = function (state, persona, week) {
    const cast = KP.C.LIFE.REGULARS.filter(r => r.persona === persona);
    if (!cast.length) return null;
    return cast[Math.floor(KP.hash01([state.seed, 'regular', persona, week].join('|')) * cast.length)].handle;
  };

  // ---- the dorm: chemistry has an address -------------------------------
  KP.assignRooms = function (state, g) {
    if (g.rooms && g.rooms.length) return g.rooms;
    const ids = g.members.slice();
    // initial pairing by hash — the manager didn't pick these, the
    // company van schedule did
    ids.sort((a, b) => KP.hash01([state.seed, g.id, a].join('|')) - KP.hash01([state.seed, g.id, b].join('|')));
    g.rooms = [];
    while (ids.length >= 4) g.rooms.push(ids.splice(0, 2));
    if (ids.length) g.rooms.push(ids.splice(0));
    return g.rooms;
  };
  KP.roommates = function (g, aId, bId) {
    return !!(g && g.rooms && g.rooms.some(r => r.includes(aId) && r.includes(bId)));
  };
  // the lever: reshuffle to separate the worst pair — a real management
  // move with a bill and a cooldown, the sit-down's domestic twin
  KP.shuffleRooms = function (state, groupId) {
    const L = KP.C.LIFE;
    const g = KP.groupById(state, groupId);
    if (!g || !g.debuted && !g.members.length) return { ok: false, reason: 'No group.' };
    if (state.week - (g.lastRoomShuffle || -999) < L.roomShuffleCooldown) {
      return { ok: false, reason: 'The dorm just re-settled. Moving boxes every month is its own morale problem.' };
    }
    if (state.budget < L.roomShuffleCost) return { ok: false, reason: 'Even moving furniture costs money.' };
    state.budget -= L.roomShuffleCost;
    g.lastRoomShuffle = state.week;
    // separate the coldest pair: sort members by pairwise score with
    // current roommates, rebuild rooms greedily from best-compatible
    const members = g.members.map(id => state.people[id]);
    const rels = state.relationships || {};
    const score = (a, b) => {
      const rel = rels[KP.pairKey(a, b)];
      return rel ? rel.score : 0;
    };
    const ids = g.members.slice().sort((a, b) =>
      KP.hash01([state.seed, g.id, state.week, a].join('|')) - KP.hash01([state.seed, g.id, state.week, b].join('|')));
    // greedy: repeatedly take the first id and its best-liked remaining partner
    g.rooms = [];
    while (ids.length >= 4) {
      const a = ids.shift();
      const pa = state.people[a];
      ids.sort((x, y) => score(pa, state.people[y]) - score(pa, state.people[x]));
      g.rooms.push([a, ids.shift()]);
    }
    if (ids.length) g.rooms.push(ids.splice(0));
    members.forEach(m => { m.morale = KP.clamp(m.morale - 1, 0, 100); });   // moving is moving
    return { ok: true, note: 'Rooms reassigned. The first night is quiet — new roommates negotiating the thermostat treaty. The tour manager approves of the new seating chart energy.' };
  };

  // ======================================================================
  // The timeline (v0.7.3) — the feed becomes something you check weekly.
  // Built ON the kernel: a registered weekly phase, registered feed
  // reactions, zero edits to the drivers or the frozen chain.
  // ======================================================================

  // ---- regulars with biases: the accounts develop taste ------------------
  function cast(state) { return state.feedCast = state.feedCast || {}; }
  KP.regularBias = function (state, handle) {
    const c = cast(state)[handle];
    return c && c.biasId ? c : null;
  };
  // called from the recordViral door: an unbiased fan/stan regular
  // adopts her — deterministically, because parasociality is destiny
  KP.regularsNotice = function (state, person) {
    if (!person || person.status !== 'idol') return;
    const free = KP.C.LIFE.REGULARS.filter(r =>
      (r.persona === 'fan' || r.persona === 'stan') && !cast(state)[r.handle]);
    if (!free.length) return;
    const pick = free[Math.floor(KP.hash01([state.seed, person.id, 'adopt'].join('|')) * free.length)];
    cast(state)[pick.handle] = { biasId: person.id, since: state.week };
  };
  KP.biasFor = function (state, personId) {
    return Object.keys(cast(state)).filter(h => cast(state)[h].biasId === personId);
  };

  // ---- her side of the screen, expanded ---------------------------------
  KP.lifePosts = function (state) {
    const L = KP.C.LIFE;
    const posts = [];

    // biased regulars post about their person weekly-ish
    Object.entries(cast(state)).forEach(([handle, c]) => {
      if (!c.biasId) return;
      const p = state.people[c.biasId];
      if (!p || p.status !== 'idol') return;
      if (KP.hash01([state.seed, handle, state.week, 'biaspost'].join('|')) >= 0.22) return;
      const fact = KP.factsOf(state, p)[state.week % 2];
      const reg = L.REGULARS.find(r => r.handle === handle);
      posts.push({ persona: (reg && reg.persona) || 'fan', handle, text: KP.fillPro(KP.hash01([state.seed, handle, state.week, 'v'].join('|')) < 0.5
        ? 'daily reminder that ' + KP.displayName(p) + ' ' + fact + '. this account remains correct about {her}'
        : 'thinking about how ' + KP.displayName(p) + ' carried that last stage again. no reason. (there is a reason. watch the fancam)', p) });
    });

    // monthly selca day: one member per debuted group takes the timeline
    if ((state.week - 1) % L.selcaEveryWeeks === 2) {
      KP.groups(state).forEach(g => {
        if (!g.debuted || !g.members.length) return;
        const idx = Math.floor(KP.hash01([state.seed, g.id, state.week, 'selca'].join('|')) * g.members.length);
        const p = state.people[g.members[idx]];
        if (!p) return;
        KP.socialSpike(state, p, L.selcaSpike, 'selca');
        {
          const N = KP.publicGiven(p);
          // the family (v0.11.2, §93): "SELCA DAY" stays in every line — the
          // timeline suite counts it
          posts.push({ persona: 'fan', text: KP.lineFor(state, 'selcaLine|' + g.id, [
            'SELCA DAY and ' + N + ' posted FOUR. the camera roll generosity. saving all of them like they owe me money',
            'SELCA DAY. ' + N + ' posted one (1) photo, slightly blurry, from an angle that should not work. it works. it is my lock screen now',
            'SELCA DAY and ' + N + ' did the mirror one, the car one and the “someone else took this” one. a full set. the fandom is eating',
            'SELCA DAY: ' + N + ', no caption, one emoji, four million interpretations. the quote-posts are a book club',
            'SELCA DAY and ' + N + ' posted from the practice room with the lights half off. candid era. we are so unwell',
          ]) });
        }
      });
    }
    return posts;
  };

  // ---- the life-moments weekly phase (kernel-registered) ----------------
  // birthdays, live clips, bias breakups — notes flow to the inbox and
  // their inds render as feed posts through the registry
  function birthWeekOf(state, p) {
    return 1 + Math.floor(KP.hash01([state.seed, p.id, 'bday'].join('|')) * KP.C.WEEKS_PER_YEAR);
  }
  KP.birthWeekOf = birthWeekOf;   // one truth per date — UI and tests read this
  KP.registerWeekly('lifeMoments', 855, function (state, rng, inbox, roster, groups) {
    const L = KP.C.LIFE;
    const woy = ((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1;

    // the clock, personally (v0.9.1): a birthday adds a year — for
    // everyone in the world, on the same hash-truth week the timeline
    // already celebrates. Trainees get the practice-room version; rivals,
    // prospects, and the departed age quietly, because time does.
    Object.values(state.people).forEach(p => {
      if (birthWeekOf(state, p) !== woy) return;
      p.age += 1;
      // the trainee birthday cake was 75% trimmed (§89 A): the age is on her file
    });

    groups.forEach(g => {
      if (!g.debuted) return;
      g.members.forEach(id => {
        const p = state.people[id];
        if (!p || p.status !== 'idol') return;
        // her birthday week: the timeline celebrates, the members post,
        // a devoted fandom funds the subway ad
        if (birthWeekOf(state, p) === woy) {
          p.morale = KP.clamp(p.morale + L.birthdayMorale, 0, 100);
          KP.socialSpike(state, p, L.birthdaySpike, 'bday');
          {
            const funded = KP.fandomIntensity(g) >= L.birthdayAdIntensity;
            const N = KP.displayName(p);
            inbox.push({ kind: 'public', ind: 'idolBirthday', priority: 'flavor', personId: p.id, funded,
              text: KP.fillPro(KP.lineFor(state, 'bday|' + p.id, [
                'It is ' + N + '’s birthday week — {she} turns ' + p.age + '. The members got to {pos} cake before the fans got to the hashtag — barely. ' +
                  (funded ? 'The fandom funded a subway station ad. {She} went to see it in a mask and cried anyway.' : 'The fan cafés ran the countdown at midnight, as is law.'),
                N + '’s birthday week — {she} turns ' + p.age + '. The dorm did the cake at midnight with the lights off and the phones up; the timeline did the hashtag at 00:01. ' +
                  (funded ? 'The fandom bought a subway station ad. {She} went to see it in a mask and stood there longer than planned.' : 'The fan cafés ran the countdown, as is law.'),
                'It is ' + N + '’s birthday week. {She} is ' + p.age + ' now, which the fan accounts have turned into a numbered retrospective. ' +
                  (funded ? 'A subway-station ad, fandom-funded, is up for the week; the driver detoured the van past it without being asked.' : 'The cafés did the countdown; the members did the ambush; the cake survived, barely.'),
              ]), p) });
          }
        }
      });
      // the debut anniversary (v0.8.3): the most ritualized date in
      // fandom — café banners, N-years hashtags, and the memory system's
      // stories resurfacing on schedule
      if (g.debuted && state.week > g.debutWeek &&
          (state.week - g.debutWeek) % KP.C.WEEKS_PER_YEAR === 0) {
        const years = (state.week - g.debutWeek) / KP.C.WEEKS_PER_YEAR;
        // a concluded group has no anniversary live (v0.11.10, §101): the
        // letter had the members streaming from the practice room for an
        // act with nobody in it. The fandom keeps the date for a few
        // years, quietly, and nobody's morale moves.
        if (g.retiredWeek) {
          if (g.fandom && state.week - g.retiredWeek <= KP.C.FAREWELL.memorialYears * KP.C.WEEKS_PER_YEAR) {
            inbox.push({ kind: 'public', ind: 'anniversaryKept', priority: 'normal', groupId: g.id, years,
              text: KP.lineFor(state, 'annivKept|' + g.id, [
                'It would have been ' + g.name + '’s ' + years + '-year anniversary week. The café banner changed at midnight anyway: ' + g.fandom.name + ' keeps the archive, and the archive keeps the date.',
                g.name + '’s debut date came around again, ' + years + ' year' + (years === 1 ? '' : 's') + ' on. Nobody streamed from the practice room this time. ' + g.fandom.name + ' posted the old stages frame by frame, on schedule.',
                years + ' year' + (years === 1 ? '' : 's') + ' since ' + g.name + '’s debut stage. The group is concluded and the hashtag is not: it trended for an afternoon, mostly photographs.',
              ]) });
          }
          return;
        }
        g.members.forEach(id => {
          const m = state.people[id];
          if (m) { m.morale = KP.clamp(m.morale + KP.C.ANNIV.morale, 0, 100); KP.socialSpike(state, m, KP.C.ANNIV.spike, 'anniv'); }
        });
        const story = KP.liveNarratives(state).find(n => n.subjectType === 'group' && n.subjectId === g.id);
        const retold = story ? KP.narrativeText(state, story).toLowerCase() : '';
        inbox.push({ kind: 'public', ind: 'anniversary', priority: 'high', groupId: g.id, years,
          text: KP.lineFor(state, 'anniv|' + g.id, [
            'It is ' + g.name + '’s ' + years + '-year anniversary week. The café banner changed at midnight, the members did the anniversary live in the practice room where it started' +
              (story ? ', and the timeline is retelling the whole story — ' + retold : '') +
              '. Somewhere in the building, someone who was in that first meeting got quietly emotional about a spreadsheet.',
            g.name + '’s ' + years + '-year anniversary week: the café banner changed at midnight, the members streamed from the first practice room' +
              (story ? ', and the timeline retold the whole story — ' + retold : '') +
              '. The building let itself feel it for exactly one afternoon.',
            'Anniversary week — ' + years + ' year' + (years === 1 ? '' : 's') + ' of ' + g.name + '. The café banner changed at midnight; the fandom posted the debut stage frame by frame; the members posted the group photo from before the group had a name' +
              (story ? '; the timeline retold the story — ' + retold : '') +
              '. Someone in accounting ran the numbers out of habit and then did not share them.',
          ]) });
      }
    });

    // heartbreak: a boiled storm on a regular's bias breaks the parasocial
    // contract — the account goes quiet on her, publicly
    Object.entries(cast(state)).forEach(([handle, c]) => {
      if (!c.biasId) return;
      const boiled = (state.discourses || []).some(d => d.status === 'boiled' &&
        d.subjectType === 'idol' && String(d.subjectId) === String(c.biasId) && d.week >= c.since);
      if (boiled) {
        const p = state.people[c.biasId];
        // feed-only (§89 C): the quiet post is the fan's, so it lives on
        // the timeline — the inbox never needed the letter
        inbox.push({ kind: 'public', ind: 'biasBreakup', feedOnly: true, priority: 'flavor', personId: c.biasId,
          text: (p ? KP.displayName(p) : 'her') + ' — ' + handle + ' stepped back.' });
        delete cast(state)[handle];
      }
    });
  });

  // ---- the new inds render through the kernel registry ------------------
  KP.onFeedEvent('idolBirthday', (state, n, rng) => {
    const p = state.people[n.personId];
    return rng.pick([
      { persona: 'fan', text: 'HAPPY BIRTHDAY ' + (p ? KP.displayName(p).toUpperCase() : '') + '. the hashtag hit trending before sunrise because we are PROFESSIONALS' },
      { persona: 'stan', text: KP.fillPro((p ? KP.publicGiven(p) : '{she}') + ' birthday content: the members’ posts are out and the maknae’s one is unhinged in the best way. family behavior', p) },
      n.funded ? { persona: 'casual', text: 'walked past a whole subway station of birthday ads for an idol today. fandom infrastructure is genuinely impressive. happy birthday, stranger' }
        : { persona: 'fan', text: 'midnight birthday countdown complete. year captured. the café banner is already updated. we run a tight ship' },
    ]);
  });
  KP.onFeedEvent('anniversary', (state, n, rng) => {
    const g = KP.groupById(state, n.groupId);
    if (!g) return null;
    return rng.pick([
      { persona: 'fan', text: n.years + ' YEARS OF ' + g.name.toUpperCase() + '. the anniversary hashtag hit trending before the members even woke up because we scheduled it. happy anniversary to the group and to us' },
      { persona: 'stan', text: 'the ' + g.name + ' anniversary live: they went back to the FIRST practice room. the maknae cried first. then the leader. then me. then everyone. tradition intact' },
      { persona: 'casual', text: 'apparently it’s ' + g.name + '’s anniversary because my entire feed is baby photos of idols and long threads that start with “' + n.years + ' years ago today.” fandom memory is a beautiful thing' },
    ]);
  });
  KP.onFeedEvent('liveClip', (state, n) => {
    const p = state.people[n.personId];
    return { persona: 'casual', text: KP.fillPro('the clip of ' + (p ? KP.publicGiven(p) : '{her}') +
      ' going full documentary mode on {pos} own hobby mid-live… idols are just people with better lighting and I love that for them', p) };
  });
  KP.onFeedEvent('biasBreakup', (state, n) => ({
    persona: 'casual', text: 'the ' + '“stepping back” post from a big fan account has the quote posts doing sociology today. parasocial weather: cloudy',
  }));
})(typeof window !== 'undefined' ? window : globalThis);
