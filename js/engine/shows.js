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
  // the stage, judged (v0.10.37, §91 Phase 4): the live term IS the one
  // stage read — the old livePerf average retired (§91 E). The shield's
  // cost rides along: a shielded member is off the front of the stage.
  function liveRead(state, g, showId) {
    const read = KP.stageRead(state, g, { kind: 'show', id: showId });
    const shielded = g.slumpShield && state.week <= g.slumpShield.until ?
      KP.C.SLUMP.shieldPerformance : 0;
    read.live = Math.max(0, read.score + shielded);
    return read;
  }
  function planFor(state, g) {
    // the extension (v0.10.38) can make a plan longer than the four weeks
    const last = Math.max(KP.C.ROLLOUT.weeks, (g.rollout || []).length) - 1;
    const idx = KP.clamp(state.week - (g.lastReleaseWeek || 0) - 1, 0, last);
    return (g.rollout && g.rollout[idx]) || [];
  }
  function promoting(state, g) {
    return g.debuted && !g.prep && !g.retiredWeek && g.members.length > 0 &&
      state.week <= (g.promoUntil || 0) && state.week > (g.lastReleaseWeek || 0);
  }

  // Everyone on stages this week, per show. `reads` collects the stage
  // read per (group, show) so the post-air pass settles the same stage.
  function contenders(state, showId, reads) {
    const S = KP.C.SHOWS[showId];
    const W = KP.C.SHOWWIN;
    const list = [];
    KP.groups(state).forEach(g => {
      if (!promoting(state, g) || !planFor(state, g).includes(showId)) return;
      const read = liveRead(state, g, showId);
      if (reads) { reads[g.id] = reads[g.id] || {}; reads[g.id][showId] = read; }
      const comp = {
        base: (g.popularity || 0) * S.fandomW,
        live: read.live * S.liveW,
        dig: fresh(state.week - (g.lastReleaseWeek || 0)) * S.freshW,
        vote: KP.fandomIntensity(g) * KP.C.FANDOM.showVoteFactor,   // an organized fandom votes (v0.7.0)
      };
      // the rituals (v0.10.7): the one mobilization push a week
      const nudge = g.pointNudge && state.week - g.pointNudge.week <= 1
        ? KP.C.POINTS.nudgeBoost : 0;
      const score = comp.base + comp.live + comp.dig + comp.vote + nudge +
        KP.hash01([state.seed, showId, state.week, g.id].join('|')) * W.jitter;
      list.push({ type: 'player', g, score, comp, read });
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

    const playerLosses = [];   // the rituals (v0.10.7): the point desk reads
    const reads = {};          // the stage, judged (v0.10.37): one read per (act, show)
    Object.keys(KP.C.SHOWS).forEach(showId => {
      const field = contenders(state, showId, reads);
      const top = field[0];
      const winner = top && top.score >= KP.C.SHOWS[showId].floor ? top : null;
      const label = KP.showLabel(showId);
      if (winner && winner.type !== 'player') {
        const mine = field.find(c => c.type === 'player');
        if (mine) {
          playerLosses.push({ g: mine.g, comp: mine.comp, label,
            gap: winner.score - mine.score,
            winnerName: winner.type === 'rival' ? winner.act.name : winner.artist.name });
        }
      }

      if (winner && winner.type === 'player') {
        const g = winner.g;
        g.trophies = g.trophies || {};
        g.trophies[showId] = (g.trophies[showId] || 0) + 1;
        g.trophiesYear = (g.trophiesYear || 0) + 1;   // the award year's tally (0.9.13 audit B2)
        g.lastShowWinWeek = state.week;   // the slump reads this (v0.9.18)
        // the era's own shelf (v0.11.9, §100): the close reads it back
        if ((g.releases || []).length) {
          const eraRel = g.releases[g.releases.length - 1];
          eraRel.trophies = (eraRel.trophies || 0) + 1;
        }
        g.popularity = KP.clamp((g.popularity || 0) + W.winPop, 0, 100);
        const members = g.members.map(id => state.people[id]).filter(Boolean);
        members.forEach(m => {
          m.morale = KP.clamp(m.morale + W.winMorale, 0, 100);
          KP.socialSpike(state, m, W.winFollowers, 'showwin-' + showId);
          keep(KP.ambitionTouch(state, m, 'trophy'));   // somebody's dream (v0.7.1)
        });
        KP.fandomGain(g, KP.C.FANDOM.gainShowWin);   // shared trophies bind (v0.7.0)
        const runnerUp = field[1];
        const first = !state.firstShowWinWeek;
        if (first) {
          state.firstShowWinWeek = state.week;
          state.trust = KP.clamp(state.trust + W.firstWinTrust, 0, 100);
          // the arc (v0.10.27, §88 C): the first trophy changes the eyes
          if (KP.driftTrait) members.forEach(m => KP.driftTrait(state, m, 'confidence',
            KP.C.ARC.firstWinConfidence, 'the first trophy',
            KP.fillPro('Something in {her} settled the night of the first trophy — the stage stopped being a test.', m)));
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
        // the encore: live vocals, no track — where the Gaya moment lives.
        // Keyed to the stage (v0.10.37): a CARRIED stage and a real voice
        // make the moment — the voice that carried it, when she can sing
        // it; a shaky or fumbled stage with the trophy in hand is ALSO a
        // story, and the storm lands on the one who lost it
        const read = winner.read;
        const carrier = read.moments.carried ? state.people[read.moments.carried] : null;
        const voice = carrier && carrier.talents.vocals.cur >= W.encoreVocalsMin ? carrier
          : members.slice().sort((a, b) => b.talents.vocals.cur - a.talents.vocals.cur)[0];
        if (read.band === 'carried' && voice && voice.talents.vocals.cur >= W.encoreVocalsMin && rng.chance(W.encoreChance)) {
          KP.stageLedger(state).encores++;
          KP.socialSpike(state, voice, KP.C.SOCIAL.viralSpike, 'encore');
          keep({ kind: 'public', ind: 'encoreMoment', personId: voice.id, groupId: g.id,
            text: KP.displayName(voice) + ' took the winning encore without a backing track and casually murdered the vocal. The clip is everywhere by morning — this is what the music-show grind is FOR.' });
          keep(KP.recordViral(state, voice, { kind: 'encore', label: 'the ' + label + ' encore' }));
          keep(KP.igniteDiscourse(state, rng, 'fancam', 'idol', voice.id, g.id));
        } else if ((read.band === 'shaky' || read.band === 'fumbled') && rng.chance(W.shakyEncoreChance)) {
          // winning on fandom votes and wobbling the encore is ALSO a story
          const shaky = read.moments.fumbled ? state.people[read.moments.fumbled]
            : members.slice().sort((a, b) => KP.derived(a).liveReliability - KP.derived(b).liveReliability)[0];
          keep(KP.igniteDiscourse(state, rng, 'encore', 'idol', shaky.id, g.id));
        }
      } else if (winner && winner.type === 'rival') {
        const act = winner.act;
        act.showWins = (act.showWins || 0) + 1;
        act.showWinsYear = (act.showWinsYear || 0) + 1;
        // did they take it off OUR stage?
        const beaten = field.find(c => c.type === 'player');
        if (beaten) {
          // the loss is told once, by the point breakdown (§89 C); the
          // rivalry evidence still lands
          // losing a stage to a declared rival feeds the story
          if (KP.getNarrative(state, 'rivalry', 'rivalAct', act.id)) {
            KP.recordEvidence(state, 'rivalry', 'rivalAct', act.id);
          }
        } else if (act.showWins === 1 && (act.popularity || 0) >= 45) {
          // only their FIRST trophy is news — a hot act re-winning weekly
          // is wallpaper, and wallpaper crowds real letters out of the desk
          keep({ kind: 'industry', ind: 'rivalShowWin', actName: act.name,
            company: winner.rival.short, showId,
            text: KP.lineFor(state, 'rivalFirstWin|' + act.id, [
              act.name + ' won ' + label + ' — their first. ' + winner.rival.short + '’s floor will be unbearable about it through Friday.',
              act.name + ' won ' + label + ' — their first. ' + winner.rival.short + ' had the trophy photo on every account they own before the broadcast ended.',
              'First trophy: ' + act.name + ' won ' + label + ' — their first. ' + winner.rival.short + '’s lobby has a new framed photo and nobody is allowed to walk past it quietly.',
              act.name + ' won ' + label + ' — their first. The encore was mostly crying. ' + winner.rival.short + ' will treat the win as a policy.',
            ]) });
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

    // the point breakdown (v0.10.7, §80 finding 9): the post-air
    // component read, in WORDS, never a formula — one per week, on
    // the closest loss; a near-miss is injustice fuel the intensity
    // machinery eats
    if (playerLosses.length && KP.pointLedger) {
      const P = KP.C.POINTS;
      const closest = playerLosses.sort((a, b) => a.gap - b.gap)[0];
      const led = KP.pointLedger(state);
      led.breakdowns++;
      const WORDS = { base: 'the general-public base', live: 'the live',
        dig: 'the digital', vote: 'the fan vote' };
      const parts = Object.keys(closest.comp).map(k => ({ k, v: closest.comp[k] }))
        .sort((a, b) => b.v - a.v);
      const strong = WORDS[parts[0].k], weak = WORDS[parts[parts.length - 1].k];
      const near = closest.gap <= P.nearMissGap;
      if (near) {
        led.nearMisses++;
        KP.fandomGain(closest.g, P.nearMissIntensity);
      }
      keep({ kind: 'public', ind: 'pointBreakdown', priority: near ? 'high' : 'flavor',
        groupId: closest.g.id,
        text: 'The ' + closest.label + ' point breakdown posted: ' + strong + ' carried; ' + weak +
          ' didn’t come home. ' + closest.g.name + ' finished behind ' + closest.winnerName +
          (near ? ' by a margin thin enough to read out loud — and the fandom is reading it out loud, with timestamps. Nothing organizes a fan café like a number that was ALMOST enough.'
                : '. The gap was honest this week; the spreadsheet crowd has already assigned next week’s homework.') });
    }

    // the stage, judged (v0.10.37): every booked stage is rated once —
    // the lotteries fire per stage, the words post once a week per act,
    // on the week's most notable stage
    const weekCarried = {};
    KP.groups(state).forEach(g => {
      if (!promoting(state, g) || !reads[g.id]) return;
      let notable = null;
      const booked = planFor(state, g).filter(KP.isShowActivity);
      // the comeback stage (v0.10.38, §91 B5): the era's first stage is a
      // named special — rated like any night, hype-bearing, the one
      // everyone clips, watched by the critics who already filed
      const rel = (g.releases || []).length ? g.releases[g.releases.length - 1] : null;
      const comebackId = rel && !rel.comebackStage && state.week === rel.week + 1 ? booked[0] : null;
      booked.forEach(showId => {
        const read = reads[g.id][showId];
        if (!read) return;
        KP.settleStage(state, rng, g, read, { where: KP.showLabel(showId) }).forEach(keep);
        const edge = Math.abs(read.score - KP.C.STAGE.cleanAt) +
          (read.band === 'carried' || read.band === 'fumbled' ? 100 : 0) + (showId === comebackId ? 1000 : 0);
        if (!notable || edge > notable.edge) notable = { read, showId, edge };
      });
      // the era's last stage is whichever week's stage came last (v0.11.9, §100):
      // overwritten each promotion week, so an extension's stage is the true one
      if (notable && rel) {
        rel.lastStage = { week: state.week, showId: notable.showId, band: notable.read.band, carried: notable.read.moments.carried || null };
      }
      if (notable && notable.showId === comebackId) {
        const CB = KP.C.PROMO.CB;
        const read = notable.read;
        const carrier = read.moments.carried ? state.people[read.moments.carried] : null;
        rel.comebackStage = { showId: comebackId, score: read.score, band: read.band, carried: carrier ? carrier.id : null };
        if (g.results && g.results.week === rel.week) g.results.comebackStage = { showId: comebackId, band: read.band };
        KP.promoLedger(state).comebackStages++;
        const members = g.members.map(id => state.people[id]).filter(Boolean);
        if (carrier) carrier.hype = KP.clamp((carrier.hype || 0) + CB.carrierHype, 0, 100);
        else if (read.band === 'carried') members.forEach(m => { m.hype = KP.clamp((m.hype || 0) + CB.roomHype, 0, 100); });
        if (carrier && rng.chance(CB.clipChance)) {
          KP.stageLedger(state).fancams++;
          keep(KP.recordViral(state, carrier, { kind: 'fancam', label: 'the comeback-stage fancam' }));
          keep(KP.igniteDiscourse(state, rng, 'fancam', 'idol', carrier.id, g.id));
        }
        // a debut's first stage is a debut stage (v0.11.5, §96 wiring): the
        // release archive knows which it was
        const special = rel.isDebut ? 'debut stage' : 'comeback stage';
        const line = KP.stageLine(state, g, read, 'the ' + special);
        g.stageNoteWeek = state.week; g.lastStageBand = read.band;
        KP.stageLedger(state).lines++;
        keep({ kind: 'public', ind: 'comebackStage', priority: 'high', groupId: g.id, band: read.band,
          personId: carrier ? carrier.id : null,
          text: 'THE ' + special.toUpperCase() + ', on ' + KP.showLabel(comebackId) + ': ' + line +
            (rel.critics && rel.critics.consensus ? ' The critics, who called the record ' + KP.verdictWord(rel.critics.consensus) + ', watched from the front row.' : '') });
        weekCarried[g.id] = carrier ? carrier.id : null;
      } else if (notable) {
        keep(KP.stageNote(state, g, notable.read, KP.showLabel(notable.showId)));
        weekCarried[g.id] = notable.read.moments.carried || null;
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
      // fairy rotates — sometimes onto the one nobody expected; the
      // voice that carried the week pulls the lens (v0.10.37)
      const lean = m => m.id === weekCarried[g.id] ? KP.C.SHOWWIN.fairyCarried : 0;
      const fairy = members.slice().sort((a, b) => (fairyPull(state, g, b) + lean(b)) - (fairyPull(state, g, a) + lean(a)))[0];
      if (rng.chance(KP.C.SHOWWIN.fairyChance)) {
        KP.socialSpike(state, fairy, KP.C.SOCIAL.viralSpike * 0.5, 'fairy');
        keep({ kind: 'public', ind: 'endingFairy', personId: fairy.id, groupId: g.id,
          text: 'The ending-fairy clip of ' + KP.displayName(fairy) + ' from this week’s ' +
            KP.showLabel(booked[0]) + ' is quietly outperforming the actual stage. Fifteen seconds, one look at the camera. That is all it takes now.' });
        keep(KP.recordViral(state, fairy, { kind: 'fairy', label: 'the ' + KP.showLabel(booked[0]) + ' ending fairy' }));
      }
    });
    return notes;
  };
  function fairyPull(state, g, m) {
    return m.talents.visuals.cur * 0.5 + KP.derived(m).centerPull * 0.3 +
      KP.hash01([state.seed, 'fairy', state.week, m.id].join('|')) * 30;
  }
})(typeof window !== 'undefined' ? window : globalThis);
