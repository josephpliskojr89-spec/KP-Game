/* The music-show ecosystem (v0.6.5) — §22: "Named shows, stage picks,
   special stages, encores, ending fairies, wins. The Gaya-encore-goes-
   viral moment: emergent, memory-fed, feed-amplified."

   Three weekly shows with personalities. Booking one is a rollout
   choice; WINNING one is computed among everybody promoting that week
   — player groups and rival acts alike — from fandom, live command and
   freshness, weighted per show. Scores are hash-jittered, never
   rng-drawn: the same week always airs the same way. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  KP.isShowActivity = function (id) {
    const A = KP.C.ROLLOUT.ACTIVITIES[id];
    return !!(A && A.show);
  };
  KP.showLabel = function (id) {
    const A = KP.C.ROLLOUT.ACTIVITIES[id];
    return A ? A.label : id;
  };

  function fresh(weeksSince) { return KP.clamp(100 - weeksSince * 18, 0, 100); }
  function livePerf(state, g) {
    const ms = g.members.map(id => state.people[id]).filter(Boolean);
    if (!ms.length) return 0;
    return ms.reduce((s, m) =>
      s + 0.5 * KP.derived(m).liveReliability +
      0.5 * Math.max(m.talents.vocals.cur, m.talents.dance.cur), 0) / ms.length;
  }
  function planFor(state, g) {
    const idx = KP.clamp(state.week - (g.lastReleaseWeek || 0) - 1, 0, KP.C.ROLLOUT.weeks - 1);
    return (g.rollout && g.rollout[idx]) || [];
  }
  function promoting(state, g) {
    return g.debuted && !g.prep && state.week <= (g.promoUntil || 0) &&
      state.week > (g.lastReleaseWeek || 0);
  }

  // Everyone on stages this week, per show.
  function contenders(state, showId) {
    const S = KP.C.SHOWS[showId];
    const W = KP.C.SHOWWIN;
    const list = [];
    KP.groups(state).forEach(g => {
      if (!promoting(state, g) || !planFor(state, g).includes(showId)) return;
      const score = (g.popularity || 0) * S.fandomW + livePerf(state, g) * S.liveW +
        fresh(state.week - (g.lastReleaseWeek || 0)) * S.freshW +
        KP.fandomIntensity(g) * KP.C.FANDOM.showVoteFactor +   // an organized fandom votes (v0.7.0)
        KP.hash01([state.seed, showId, state.week, g.id].join('|')) * W.jitter;
      list.push({ type: 'player', g, score });
    });
    (state.rivals || []).forEach(r => (r.acts || []).forEach(a => {
      if (a.retired) return;
      const since = state.week - (a.lastReleaseWeek || 0);
      if (since < 0 || since > W.rivalPromoWeeks) return;
      const score = (a.popularity || 0) * S.fandomW + (a.quality || 0) * S.liveW +
        fresh(since) * S.freshW +
        KP.hash01([state.seed, showId, state.week, a.id].join('|')) * W.jitter;
      list.push({ type: 'rival', act: a, rival: r, score });
    }));
    // the broadcast stages host the national pool the week it drops —
    // a titan comeback week is not YOUR week, whoever you are
    if (S.nationalGuests) {
      ((state.national || {}).artists || []).forEach(ar => {
        const since = state.week - (ar.lastRelease || -99);
        if (since < 0 || since > 1) return;
        const score = ar.fame * (S.fandomW + S.liveW * 0.8) + fresh(since) * S.freshW +
          KP.hash01([state.seed, showId, state.week, ar.name].join('|')) * W.jitter;
        list.push({ type: 'pool', artist: ar, score });
      });
    }
    return list.sort((x, y) => y.score - x.score);
  }

  KP.showsWeek = function (state, rng) {
    const W = KP.C.SHOWWIN;
    const notes = [];
    const keep = n => { if (n) notes.push(n); };

    Object.keys(KP.C.SHOWS).forEach(showId => {
      const field = contenders(state, showId);
      const top = field[0];
      const winner = top && top.score >= KP.C.SHOWS[showId].floor ? top : null;
      const label = KP.showLabel(showId);

      if (winner && winner.type === 'player') {
        const g = winner.g;
        g.trophies = g.trophies || {};
        g.trophies[showId] = (g.trophies[showId] || 0) + 1;
        g.popularity = KP.clamp((g.popularity || 0) + W.winPop, 0, 100);
        const members = g.members.map(id => state.people[id]).filter(Boolean);
        members.forEach(m => {
          m.morale = KP.clamp(m.morale + W.winMorale, 0, 100);
          KP.socialSpike(state, m, W.winFollowers, 'showwin-' + showId);
        });
        KP.fandomGain(g, KP.C.SHOWWIN.winMorale ? KP.C.FANDOM.gainShowWin : 0);   // shared trophies bind (v0.7.0)
        const runnerUp = field[1];
        const first = !state.firstShowWinWeek;
        if (first) {
          state.firstShowWinWeek = state.week;
          state.trust = KP.clamp(state.trust + W.firstWinTrust, 0, 100);
          keep({ kind: 'debut', urgent: true, ind: 'showWin', groupId: g.id, showId,
            text: g.name + ' just won ' + label + '. The FIRST music-show win in company history — the members cried through the encore, the fans cried at home, and ' +
              state.executive.name + ' put the trophy photo where the board will see it. Some weeks this job pays in something other than money.' });
        } else {
          keep({ kind: 'debut', ind: 'showWin', groupId: g.id, showId,
            text: g.name + ' took ' + label + ' this week' +
              (runnerUp && runnerUp.type === 'rival' ? ' — over ' + runnerUp.act.name + ', by the margin the fandom will be quoting all week' : '') +
              '. Trophy number ' + g.trophies[showId] + ' from this stage.' });
        }
        // the trophy shelf becomes a story
        if (g.trophies[showId] >= W.darlingAt) {
          keep(KP.recordEvidence(state, 'showDarling', 'group', g.id, { show: showId }));
        }
        // the encore: live vocals, no track — where the Gaya moment lives
        const voice = members.slice().sort((a, b) => b.talents.vocals.cur - a.talents.vocals.cur)[0];
        if (voice && voice.talents.vocals.cur >= W.encoreVocalsMin && rng.chance(W.encoreChance)) {
          KP.socialSpike(state, voice, KP.C.SOCIAL.viralSpike, 'encore');
          keep({ kind: 'public', ind: 'encoreMoment', personId: voice.id, groupId: g.id,
            text: KP.displayName(voice) + ' took the winning encore without a backing track and casually murdered the vocal. The clip is everywhere by morning — this is what the music-show grind is FOR.' });
          keep(KP.recordViral(state, voice));
          keep(KP.igniteDiscourse(state, rng, 'fancam', 'idol', voice.id, g.id));
        } else if (livePerf(state, g) < W.shakyLiveMax * 1.4 &&
            members.reduce((s, m) => s + KP.derived(m).liveReliability, 0) / members.length < W.shakyLiveMax &&
            rng.chance(W.shakyEncoreChance)) {
          // winning on fandom votes and wobbling the encore is ALSO a story
          const shaky = members.slice().sort((a, b) => KP.derived(a).liveReliability - KP.derived(b).liveReliability)[0];
          keep(KP.igniteDiscourse(state, rng, 'encore', 'idol', shaky.id, g.id));
        }
      } else if (winner && winner.type === 'rival') {
        const act = winner.act;
        act.showWins = (act.showWins || 0) + 1;
        // did they take it off OUR stage?
        const beaten = field.find(c => c.type === 'player');
        if (beaten) {
          keep({ kind: 'industry', ind: 'rivalShowWin', actName: act.name,
            company: winner.rival.short, showId, beatGroupId: beaten.g.id,
            text: act.name + ' took ' + label + ' — with ' + beaten.g.name +
              ' standing on the same stage for the announcement. Second on points. The cameras found our members’ faces immediately, because of course they did.' });
          // losing a stage to a declared rival feeds the story
          if (KP.getNarrative(state, 'rivalry', 'rivalAct', act.id)) {
            KP.recordEvidence(state, 'rivalry', 'rivalAct', act.id);
          }
        } else if (act.showWins === 1 && (act.popularity || 0) >= 45) {
          // only their FIRST trophy is news — a hot act re-winning weekly
          // is wallpaper, and wallpaper crowds real letters out of the desk
          keep({ kind: 'industry', ind: 'rivalShowWin', actName: act.name,
            company: winner.rival.short, showId,
            text: act.name + ' won ' + label + ' — their first. ' + winner.rival.short +
              '’s floor will be unbearable about it through Friday.' });
        }
      } else if (winner && winner.type === 'pool') {
        const beaten = field.find(c => c.type === 'player');
        if (beaten) {
          keep({ kind: 'industry', ind: 'poolShowWin', showId,
            text: winner.artist.name + ' took ' + label + ' this week — comeback week for them, and the national pool does not do mercy. ' +
              beaten.g.name + ' stood for the announcement anyway. That is the stage we are trying to belong on.' });
        }
      }
    });

    // the ending fairy: every show appearance ends on one face (v0.6.5)
    KP.groups(state).forEach(g => {
      if (!promoting(state, g)) return;
      const booked = planFor(state, g).filter(KP.isShowActivity);
      if (!booked.length) return;
      const members = g.members.map(id => state.people[id]).filter(Boolean);
      if (!members.length) return;
      // the camera picks: visuals and pull, with a weekly wobble so the
      // fairy rotates — sometimes onto the one nobody expected
      const fairy = members.slice().sort((a, b) => fairyPull(state, g, b) - fairyPull(state, g, a))[0];
      if (rng.chance(KP.C.SHOWWIN.fairyChance)) {
        KP.socialSpike(state, fairy, KP.C.SOCIAL.viralSpike * 0.5, 'fairy');
        keep({ kind: 'public', ind: 'endingFairy', personId: fairy.id, groupId: g.id,
          text: 'The ending-fairy clip of ' + KP.displayName(fairy) + ' from this week’s ' +
            KP.showLabel(booked[0]) + ' is quietly outperforming the actual stage. Fifteen seconds, one look at the camera. That is all it takes now.' });
        keep(KP.recordViral(state, fairy));
      }
    });
    return notes;
  };
  function fairyPull(state, g, m) {
    return m.talents.visuals.cur * 0.5 + KP.derived(m).centerPull * 0.3 +
      KP.hash01([state.seed, 'fairy', state.week, m.id].join('|')) * 30;
  }
})(typeof window !== 'undefined' ? window : globalThis);
