/* The society (v0.9.4) — the industry has waiting rooms.
   §39 consult #3: your idols meet the industry. Music-show weeks roll
   cross-company friendships (personality-gated — sunshine befriends
   everyone, deadpan takes a year); friendships send coffee trucks on
   opening weeks, congratulate releases and first wins in public, and
   a senior sometimes stans your rookie where everyone can see it.
   Debut classes get named by fans and resurface every award season.
   Presence, not power — aimed outward. Small morale, small spikes,
   big texture. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // ---- lookups ----------------------------------------------------------
  function allActs(state) {
    const out = [];
    (state.rivals || []).forEach(r => (r.acts || []).forEach(a => {
      if (!a.retired) out.push({ rival: r, act: a });
    }));
    return out;
  }
  function actOfPerson(state, personId) {
    for (const { rival, act } of allActs(state)) {
      if ((act.members || []).includes(personId)) return { rival, act };
    }
    return null;
  }
  KP.friendsOf = function (state, personId) {
    return (state.industryFriends || []).filter(f => f.a === personId || f.b === personId);
  };
  function areFriends(state, aId, bId) {
    return (state.industryFriends || []).some(f =>
      (f.a === aId && f.b === bId) || (f.a === bId && f.b === aId));
  }
  // how easily this person makes an industry friend — the same warmth
  // the room reads (one truth), shaped by the voice
  function friendliness(state, p) {
    const v = KP.voiceOf(state, p);
    const base = p.personality.warmth / 60;
    if (v === 'sunshine' || v === 'softspoken') return base * 1.5;
    if (v === 'deadpan') return base * 0.5;
    return base;
  }

  // ---- the weekly phase --------------------------------------------------
  KP.registerWeekly('society', 857, function (state, rng, inbox, roster, groups) {
    const S = KP.C.SOCIETY;
    state.industryFriends = state.industryFriends || [];

    groups.forEach(g => {
      if (!g.debuted) return;
      const members = g.members.map(id => state.people[id]).filter(Boolean);
      const promoting = !g.prep && state.week <= (g.promoUntil || 0);

      // 1) the waiting room: promo weeks are where the industry meets
      if (promoting && state.industryFriends.length < S.maxFriends &&
          state.week >= (state.societyQuietUntil || 0)) {
        // rival acts working the same shows this month
        const active = allActs(state).filter(({ act }) =>
          act.debuted !== false && state.week - (act.lastReleaseWeek || -99) <= 6 &&
          (act.members || []).length);
        if (active.length) {
          const ours = members[rng.int(0, members.length - 1)];
          if (rng.chance(KP.C.SOCIETY.friendChance * friendliness(state, ours))) {
            const { act } = active[rng.int(0, active.length - 1)];
            const theirs = (act.members || [])
              .map(id => state.people[id]).filter(Boolean)
              .filter(q => q.gender === ours.gender && !areFriends(state, ours.id, q.id));
            if (theirs.length) {
              const friend = theirs[rng.int(0, theirs.length - 1)];
              state.industryFriends.push({ a: ours.id, b: friend.id, actId: act.id, since: state.week });
              ours.morale = KP.clamp(ours.morale + S.friendMorale, 0, 100);
              state.societyQuietUntil = state.week + S.quietWeeks;
              ours.history.push({ week: state.week,
                text: 'Made a real friend in a music-show waiting room: ' + KP.displayName(friend) + ' of ' + act.name + '.' });
              inbox.push({ kind: 'public', ind: 'industryFriend', priority: 'flavor',
                personId: ours.id, friendId: friend.id, actName: act.name,
                text: KP.fillPro('Music-show week did what music-show weeks do: ' + KP.publicGiven(ours) +
                  ' and ' + KP.displayName(friend) + ' (' + act.name + ') left the building laughing at the same thing, and a fan photo of it is already everywhere. The waiting rooms are where the industry actually lives.', ours) });
            }
          }
        }
      }

      // 2) the coffee truck: a friend marks your opening week in public
      if (g.lastReleaseWeek === state.week || (g.tour && g.tour.startWeek === state.week)) {
        const friended = members.filter(m => KP.friendsOf(state, m.id).length);
        if (friended.length && rng.chance(S.coffeeTruckChance)) {
          const ours = friended[rng.int(0, friended.length - 1)];
          const f = KP.friendsOf(state, ours.id)[0];
          const friend = state.people[f.a === ours.id ? f.b : f.a];
          const home = friend && actOfPerson(state, friend.id);
          if (friend) {
            ours.morale = KP.clamp(ours.morale + S.truckMorale, 0, 100);
            inbox.push({ kind: 'public', ind: 'coffeeTruck', priority: 'flavor',
              personId: ours.id, friendId: friend.id,
              text: KP.fillPro('A coffee truck arrived at the site with ' + KP.publicGiven(ours) +
                '’s name on the banner, sent by ' + KP.displayName(friend) +
                (home ? ' of ' + home.act.name : '') +
                '. The staff drank the industry’s friendliest espresso and the fan accounts cried about it for a day. {She} kept the banner.', ours) });
          }
        }
      }

      // 3) your idol congratulates a friend's release — in public
      if (state.week >= (state.congratsQuietUntil || 0)) {
        const releasedActs = (state.weekReleases || []).map(w => w.actId);
        outer:
        for (const m of members) {
          for (const f of KP.friendsOf(state, m.id)) {
            if (releasedActs.includes(f.actId) && rng.chance(S.congratsChance)) {
              const friend = state.people[f.a === m.id ? f.b : f.a];
              if (!friend) continue;
              state.congratsQuietUntil = state.week + S.congratsQuietWeeks;
              inbox.push({ kind: 'public', ind: 'industryCongrats', priority: 'flavor',
                personId: m.id, friendId: friend.id,
                text: KP.fillPro(KP.publicGiven(m) + ' publicly congratulated ' + KP.displayName(friend) +
                  ' on the new release — a comment, one emoji, posted within the hour. Both fandoms declared a one-day armistice to screenshot it.', m) });
              break outer;
            }
          }
        }
      }

      // 4) a senior publicly stans the rookie — once per group, early
      if (!g.seniorStanWeek && state.week - (g.debutWeek || 0) <= S.seniorStanWindow &&
          rng.chance(S.seniorStanChance)) {
        const seniors = allActs(state).filter(({ act }) =>
          (state.week - (act.debutWeek || 0)) >= S.seniorMinAge && (act.members || []).length);
        if (seniors.length) {
          const { act } = seniors[rng.int(0, seniors.length - 1)];
          const senior = state.people[(act.members || [])[0]];
          const rookie = members.slice().sort((a, b) => KP.socialOf(state, b) - KP.socialOf(state, a))[0];
          if (senior && rookie) {
            g.seniorStanWeek = state.week;
            rookie.morale = KP.clamp(rookie.morale + S.stanMorale, 0, 100);
            KP.socialSpike(state, rookie, KP.C.SOCIAL.viralSpike * 0.4, 'seniorStan');
            rookie.history.push({ week: state.week,
              text: KP.displayName(senior) + ' of ' + act.name + ' named ' + (rookie.gender === 'm' ? 'him' : 'her') + ' a favorite rookie, in public.' });
            inbox.push({ kind: 'public', ind: 'seniorStan', priority: 'high',
              personId: rookie.id, seniorName: KP.displayName(senior), actName: act.name,
              text: KP.fillPro(KP.displayName(senior) + ' of ' + act.name + ' — a name this industry answers to — was asked about rookies and said ' +
                KP.publicGiven(rookie) + '’s, unprompted, with a whole sentence of reasons. The clip is everywhere. {She} has watched it eleven times and denies it.', rookie) });
          }
        }
      }

      // 5) award season: the debut class resurfaces
      const woy = ((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1;
      if (woy === S.cohortWeek && g.debutWeek != null) {
        const debutYear = Math.floor((g.debutWeek - 1) / KP.C.WEEKS_PER_YEAR) + 1;
        const curYear = Math.floor((state.week - 1) / KP.C.WEEKS_PER_YEAR) + 1;
        // guard on the 1-based year — a 0-based compare read 0 < 0 in
        // year one and the first award season skipped its own class
        if ((g.cohortNotedYear || 0) < curYear) {
          const classmates = allActs(state).filter(({ act }) =>
            act.debutWeek > 0 &&
            Math.floor((act.debutWeek - 1) / KP.C.WEEKS_PER_YEAR) + 1 === debutYear).map(x => x.act.name);
          if (classmates.length) {
            g.cohortNotedYear = curYear;
            inbox.push({ kind: 'public', ind: 'debutClass', groupId: g.id,
              text: 'Award season did the thing it does every year: the fan accounts lined up the Year ' + debutYear +
                ' debut class — ' + g.name + ', ' + classmates.slice(0, 3).join(', ') +
                ' — side by side, then and now. Same starting line, very different roads. The quote-posts are a whole genre tonight.' });
          }
        }
      }
    });
  });

  // ---- the timeline answers (registry, never the frozen chain) ----------
  KP.onFeedEvent('industryFriend', (state, n, rng) => {
    const p = state.people[n.personId];
    return rng.pick([
      { persona: 'fan', text: 'the ' + (p ? KP.publicGiven(p) : '') + ' x ' + (n.actName || 'that group') + ' friendship reveal was NOT on my bingo card. crossover episode of the year' },
      { persona: 'stan', text: 'two fandoms discovering their faves are friends is the only diplomacy that has ever worked. embassy status: open' },
      { persona: 'casual', text: 'idols from rival companies just being friends in a hallway is somehow the most humanizing content this industry produces' },
    ]);
  });
  KP.onFeedEvent('coffeeTruck', (state, n, rng) => {
    const p = state.people[n.personId];
    return rng.pick([
      { persona: 'fan', text: 'THE COFFEE TRUCK. THE BANNER. ' + (p ? KP.publicGiven(p).toUpperCase() : '') + ' HAS INDUSTRY FRIENDS AND PROOF. crying at a beverage vehicle again' },
      { persona: 'stan', text: 'coffee truck lore update: the banner pun was terrible, which by coffee truck law means the friendship is real' },
    ]);
  });
  KP.onFeedEvent('industryCongrats', (state, n, rng) => {
    return rng.pick([
      { persona: 'fan', text: 'one congratulatory emoji between idols and both fan cafés are writing think pieces. as is right and proper' },
      { persona: 'casual', text: 'idols congratulating each other across company lines is the closest thing this industry has to a handshake at the net. respect it' },
    ]);
  });
  KP.onFeedEvent('seniorStan', (state, n, rng) => {
    const p = state.people[n.personId];
    return rng.pick([
      { persona: 'stan', text: (n.seniorName || 'a whole senior') + ' naming ' + (p ? KP.publicGiven(p) : 'our rookie') + ' as a favorite UNPROMPTED. framed. printed. museum acquisition' },
      { persona: 'fan', text: 'when a senior stans your rookie it is not a compliment it is a PROPHECY. the elders have spoken' },
    ]);
  });
  KP.onFeedEvent('debutClass', (state, n, rng) => {
    return rng.pick([
      { persona: 'casual', text: 'the debut-class lineup posts are out again. same year, same stages, completely different lives now. annual tradition of making everyone emotional about time' },
      { persona: 'fan', text: 'our group in the class photo thread next to everyone they debuted against… growth arc visible from space' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
