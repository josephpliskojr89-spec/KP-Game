/* The year (v0.9.5) — the calendar has a shape.
   §39 consult #4: annual tentpoles. January sleeps; spring belongs to
   the university festival circuit (mid-tier money and live reps);
   summer runs the song-of-the-summer race (bright concepts, in
   season); December belongs to the gayo stages — invitation by
   popularity, period — where special-stage collabs feed the society
   layer. The seasons touch receptions through one read; the year
   touches morale, money, and memory through this phase. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function woyOf(state) { return ((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1; }
  function yearOf(state) { return Math.floor((state.week - 1) / KP.C.WEEKS_PER_YEAR) + 1; }

  // ---- one read: how the season meets a release -------------------------
  // Called from the release driver. Words AND number from the same place.
  KP.seasonRead = function (state, conceptId) {
    const S = KP.C.SEASON;
    const woy = woyOf(state);
    if (woy >= S.deadZoneWeeks[0] && woy <= S.deadZoneWeeks[1]) {
      return { mod: S.deadZoneMod,
        line: 'Released into the January dead zone — the industry is asleep, the public is broke, and the charts echo. Brave, or badly scheduled.' };
    }
    if (conceptId === 'bright' && woy >= S.summerWeeks[0] && woy <= S.summerWeeks[1]) {
      return { mod: S.summerBrightLift,
        line: 'A bright record in the song-of-the-summer window — the season did some of the promotion for free.' };
    }
    return { mod: 0, line: null };
  };

  // ---- the weekly shape of the year -------------------------------------
  KP.registerWeekly('theYear', 750, function (state, rng, inbox, roster, groups) {
    const S = KP.C.SEASON;
    const woy = woyOf(state);
    const year = yearOf(state);

    // January: the note, once, atmospheric
    if (woy === 1 && (state.deadZoneNotedYear || 0) < year && groups.some(g => g.debuted)) {
      state.deadZoneNotedYear = year;
      inbox.push({ kind: 'industry', priority: 'flavor',
        text: 'January in the industry: the year-end stages are struck, the award shows are hung over, and nobody sane releases anything. The building runs on leftovers and planning meetings. It is, quietly, everyone’s favorite month.' });
    }

    // school milestones (v0.9.7, §32): February belongs to the gowns —
    // the young ones who kept studying through all of this graduate,
    // and the whole internet behaves for a day
    if (woy === 6) {
      let gowns = 0;
      roster.forEach(p => {
        if ((p.status !== 'trainee' && p.status !== 'idol') || p.age !== 19 || p.flags.gradNoted) return;
        // everyone eligible graduates (0.9.13 audit A1: the narration cap
        // used to silently drop the third gown FOREVER — now the flag is
        // universal and only the coverage is capped at two)
        p.flags.gradNoted = 1;
        p.morale = KP.clamp(p.morale + KP.C.CREDITS.gradMoraleBonus, 0, 100);
        p.history.push({ week: state.week, text: 'Graduated high school. The gown photo, the flowers, the whole building in attendance.' });
        if (gowns >= 2) return;
        gowns++;
        inbox.push({ kind: 'public', ind: 'graduation', priority: 'high', personId: p.id,
          text: KP.fillPro(KP.displayName(p) + ' graduated high school this week — gown, flowers, the members screaming from the second row like proud aunts. {She} did every practice schedule AND the homework. The staff who covered for {her} exam weeks got a handwritten note each.', p) });
      });
    }

    // spring: the university festival circuit calls the mid-tier
    if (woy >= S.festWeeks[0] && woy <= S.festWeeks[1]) {
      groups.forEach(g => {
        // a festival is one afternoon, not a calendar block — production
        // weeks don't stop it, only being physically on the road does
        if (!g.debuted || g.tour) return;
        if ((g.festYear || 0) >= year) return;
        const pop = g.popularity || 0;
        // the FEE is mid-tier; the lineup is not — festival season books
        // headliners too (a pop ceiling here made the circuit dead
        // content for any successful org: 2/40 in the census)
        if (pop < S.festPopRange[0]) return;
        g.festYear = year;
        const pay = Math.min(24, Math.round(S.festPayBase + pop * S.festPayPerPop));
        state.budget += pay;
        const members = g.members.map(id => state.people[id]).filter(Boolean);
        members.forEach(m => {
          m.liveExp += S.festLiveExp;
          m.fatigue = KP.clamp(m.fatigue + S.festFatigue, 0, 100);
        });
        inbox.push({ kind: 'company', ind: 'festival', priority: 'high', groupId: g.id,
          text: pop > S.festPopRange[1]
            ? g.name + ' headlined a university festival this week — the fee is a rounding error at their level, but the dean asked nicely and the crowd was twenty thousand students who know every word. Fee +' + pay + '. The clips will outperform the last music video. Fields do that.'
            : g.name + ' played the university festival circuit this week — a field, a spring evening, a crowd that paid nothing and gave everything. The students screamed the b-sides. Fee +' + pay +
              ', and the kind of live reps no practice room sells. Half the industry’s best stage clips are secretly from festivals.' });
      });
    }

    // summer: the race opens, once a year, as atmosphere
    if (woy === S.summerWeeks[0] && (state.summerNotedYear || 0) < year && groups.some(g => g.debuted)) {
      state.summerNotedYear = year;
      inbox.push({ kind: 'industry', priority: 'flavor',
        text: 'The song-of-the-summer race is officially open. Every company with a bright concept in the drawer just moved it up the calendar. For the next two months the charts smell like sunscreen.' });
    }

    // December: the gayo stages
    if (woy === S.gayoInviteWeek) {
      groups.forEach(g => {
        if (!g.debuted) return;
        if ((g.popularity || 0) >= S.gayoPopAt) {
          g.gayoYear = year;
          inbox.push({ kind: 'public', ind: 'gayoInvite', priority: 'high', groupId: g.id,
            text: 'The year-end gayo invitations went out, and ' + g.name + ' is ON the broadcast. Invitation is by popularity, period — no politics survives December. Wardrobe has already started fighting about the special stage.' });
        } else if ((g.releases || []).some(r => Math.floor((r.week - 1) / KP.C.WEEKS_PER_YEAR) + 1 === year)) {
          inbox.push({ kind: 'company', priority: 'flavor', groupId: g.id,
            text: 'The gayo lineups are out; ' + g.name + ' is not on them. The building watched the announcement in silence, then someone said “next year” in a voice that made it a plan, not a hope. The quiet Decembers are the ones nobody forgets.' });
        }
      });
    }
    if (woy === S.gayoStageWeek) {
      groups.forEach(g => {
        if (!g.debuted || (g.gayoYear || 0) !== year) return;
        const members = g.members.map(id => state.people[id]).filter(Boolean);
        members.forEach(m => { m.morale = KP.clamp(m.morale + S.gayoMorale, 0, 100); });
        KP.fandomGain(g, 2);
        inbox.push({ kind: 'public', ind: 'gayoStage', priority: 'high', groupId: g.id,
          text: g.name + ' closed the year on the gayo stage — the remix nobody asked for and everybody screenshotted, the outfit change, the year in ninety seconds. The fancams will outlive us all.' });
        // the special stage: a waiting-room friendship becomes television
        const withFriend = members.find(m => (KP.friendsOf(state, m.id) || []).length);
        if (withFriend && rng.chance(S.gayoCollabChance)) {
          const f = KP.friendsOf(state, withFriend.id)[0];
          const friend = state.people[f.a === withFriend.id ? f.b : f.a];
          if (friend) {
            withFriend.morale = KP.clamp(withFriend.morale + 1, 0, 100);
            inbox.push({ kind: 'public', ind: 'gayoCollab', priority: 'high',
              personId: withFriend.id, friendId: friend.id,
              text: KP.fillPro('And the special stage: ' + KP.publicGiven(withFriend) + ' and ' + KP.displayName(friend) +
                ' — the waiting-room friendship the fans have been tracking for months — sharing one song on year-end television. Two fandoms used the same hashtag for one night. Nobody fought. December magic.', withFriend) });
          }
        }
      });
    }
  });

  // ---- the timeline answers ---------------------------------------------
  KP.onFeedEvent('festival', (state, n, rng) => {
    return rng.pick([
      { persona: 'fan', text: 'festival season fancams are a genre of their own. wind, golden hour, a b-side, ten thousand students losing their minds. cinema' },
      { persona: 'casual', text: 'went to a university festival for the food and left an idol fan. this happens to hundreds of people every spring and nobody warns you' },
    ]);
  });
  KP.onFeedEvent('gayoInvite', (state, n, rng) => {
    return rng.pick([
      { persona: 'stan', text: 'GAYO LINEUP CONFIRMED. clearing my last week of december. the group chat has already assigned screaming shifts' },
      { persona: 'fan', text: 'year-end stage confirmed which means remix, outfit change, and one camera angle that becomes a legend. december rules' },
    ]);
  });
  KP.onFeedEvent('gayoStage', (state, n, rng) => {
    return rng.pick([
      { persona: 'fan', text: 'the year-end stage happened and I have watched the fancam nine times before breakfast. the remix went places. I went with it' },
      { persona: 'casual', text: 'only watch music shows once a year but the december ones justify the whole format. everyone brought their best and it shows' },
    ]);
  });
  KP.onFeedEvent('gayoCollab', (state, n, rng) => {
    return rng.pick([
      { persona: 'stan', text: 'THE SPECIAL STAGE HAPPENED. the friendship is CANON on BROADCAST. two fandoms holding hands. screenshot everything, this is history' },
      { persona: 'fan', text: 'special stages between actual friends hit different — you can tell they rehearsed for fun. december television understood its purpose tonight' },
    ]);
  });
  KP.onFeedEvent('daesang', (state, n, rng) => {
    return rng.pick([
      { persona: 'stan', text: 'DAESANG. DAESANG. the speech named US. I am printing the transcript and framing it. years of streaming and every minute was worth it' },
      { persona: 'fan', text: 'watching them win the grand prize and cry in a line on television… the debut-day fancam quote-posts are already going around. we raised them right' },
      { persona: 'casual', text: 'even neutrals felt that daesang speech. whoever writes their story arc has range' },
    ]);
  });
  KP.onFeedEvent('daesangSnub', (state, n, rng) => {
    return rng.pick([
      { persona: 'stan', text: 'a bonsang. again. do you know what we are going to do about it? stream. organize. and win the big one out of SPITE' },
      { persona: 'fan', text: 'the bonsang photo where everyone’s smile stops exactly at the eyes is going in the vault labeled MOTIVATION' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
