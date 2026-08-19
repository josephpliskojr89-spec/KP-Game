/* The award circuit (v0.7.0) — §22: "award season as campaign —
   nominations, wins, snubs, fandom warfare. Reads memory hard."
   Year-end only, computed from the year that ACTUALLY happened:
   Rookie of the Year from this year's debuts, Song of the Year from
   this year's releases, Artist of the Year from popularity and
   trophies. Nominations land at week 44 of the year; the ceremony at
   week 47 — with a hash-driven wobble, because award juries are
   award juries. Wins pay. Snubs radicalize. Rng-free throughout. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function yearOf(state) { return Math.floor((state.week - 1) / KP.C.WEEKS_PER_YEAR); }
  function weekOfYear(state) { return ((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1; }
  function yearStart(state) { return yearOf(state) * KP.C.WEEKS_PER_YEAR + 1; }

  // candidates per category: {name, company, isPlayer, groupId?, score}
  function fieldFor(state, category) {
    const A = KP.C.AWARDS;
    const from = yearStart(state);
    const list = [];
    const jitter = key => KP.hash01([state.seed, 'award', yearOf(state), category, key].join('|')) * A.jitter;
    if (category === 'rookie') {
      KP.groups(state).forEach(g => {
        if (!g.debuted || (g.debutWeek || 0) < from) return;
        const r0 = (g.releases || [])[0];
        if (r0) list.push({ name: g.name, company: state.company.short, isPlayer: true,
          groupId: g.id, score: r0.reception + (g.popularity || 0) * 0.2 + jitter(g.id) });
      });
      (state.rivals || []).forEach(rv => (rv.acts || []).forEach(a => {
        if (a.retired || (a.debutWeek || 0) < from) return;
        const r0 = (a.releases || [])[0];
        if (r0) list.push({ name: a.name, company: rv.short, isPlayer: false,
          score: r0.reception + (a.popularity || 0) * 0.2 + jitter(a.id) });
      }));
    } else if (category === 'song') {
      KP.groups(state).forEach(g => {
        (g.releases || []).forEach(r => {
          if (r.week < from) return;
          list.push({ name: '“' + r.songTitle + '” — ' + g.name, company: state.company.short,
            isPlayer: true, groupId: g.id,
            score: r.reception + Math.max(0, 30 - (r.nationalPeak || 40)) + jitter(r.songTitle) });
        });
      });
      (state.rivals || []).forEach(rv => (rv.acts || []).forEach(a => {
        (a.releases || []).forEach(r => {
          if (r.week < from || a.retired) return;
          list.push({ name: '“' + r.title + '” — ' + a.name, company: rv.short,
            isPlayer: false, score: r.reception + (a.popularity || 0) * 0.15 + jitter(r.title) });
        });
      }));
    } else {  // artist
      KP.groups(state).forEach(g => {
        if (!g.debuted) return;
        // the year's shelf, not the career's (0.9.13 audit B2: all-time
        // tallies made the top prizes an annuity by year five)
        const trophies = g.trophiesYear || 0;
        if ((g.releases || []).some(r => r.week >= from)) {
          list.push({ name: g.name, company: state.company.short, isPlayer: true,
            groupId: g.id, score: (g.popularity || 0) + trophies * 3 + KP.fandomIntensity(g) * 0.2 + jitter(g.id) });
        }
      });
      (state.rivals || []).forEach(rv => (rv.acts || []).forEach(a => {
        if (a.retired || !(a.releases || []).some(r => r.week >= from)) return;
        list.push({ name: a.name, company: rv.short, isPlayer: false,
          score: (a.popularity || 0) + (a.showWinsYear || 0) * 2 + jitter(a.id) });
      }));
    }
    return list.sort((x, y) => y.score - x.score);
  }

  // the daesang field (v0.9.5): the whole year, weighed once. Brutal by
  // construction — a year of releases, trophies, and a devoted fandom,
  // against every act in the industry at once.
  function daesangField(state) {
    const A = KP.C.AWARDS;
    const from = yearStart(state);
    const list = [];
    const jitter = key => KP.hash01([state.seed, 'daesang', yearOf(state), key].join('|')) * A.jitter;
    KP.groups(state).forEach(g => {
      if (!g.debuted) return;
      const yearRels = (g.releases || []).filter(r => r.week >= from);
      if (!yearRels.length) return;
      const trophies = g.trophiesYear || 0;   // the year, weighed once — literally (audit B2)
      // symmetric with the rival read — no fandom term the rivals can't
      // have; devotion already lives inside popularity and trophies
      list.push({ name: g.name, company: state.company.short, isPlayer: true, groupId: g.id,
        debutWeek: g.debutWeek || 0,
        score: (g.popularity || 0) * 1.2 + trophies * 2.5 +
          yearRels.reduce((s, r) => s + r.reception, 0) * 0.12 + jitter(g.id) });
    });
    (state.rivals || []).forEach(rv => (rv.acts || []).forEach(a => {
      if (a.retired) return;
      const yearRels = (a.releases || []).filter(r => r.week >= from);
      if (!yearRels.length) return;
      list.push({ name: a.name, company: rv.short, isPlayer: false,
        debutWeek: a.debutWeek || 0,
        score: (a.popularity || 0) * 1.2 + (a.showWinsYear || 0) * 2.5 +
          yearRels.reduce((s, r) => s + r.reception, 0) * 0.12 + jitter(a.id) });
    }));
    // the wider market weighs in: the national chart's year-defining
    // acts sit at this table too. The scene's best act still has to
    // beat the nation's giants — that is what makes ONE daesang brutal.
    const seen = new Set();
    ((state.national && state.national.entries) || []).forEach(e => {
      if (!e.pool || e.isPlayer || seen.has(e.act)) return;
      seen.add(e.act);
      if ((e.peakPos || 99) > 5) return;
      list.push({ name: e.act, company: 'the open market', isPlayer: false,
        // The giants' bar was stepped 140→145→148 against ALL-TIME
        // trophy inflation, then back to 140 when 0.9.13 year-scoped
        // the trophy term. The creep RETURNED by another road (v0.9.25:
        // hype concentration made forced debuts stronger, solo albums
        // and return runs made years louder — daesang censused 35% →
        // 57% → 62% across the three releases), so the bar steps to
        // 146, calibrated: 25/40 (62.5%) before the step, 22/40 (55%)
        // after — back inside the ruled ceiling with the snub band
        // healthy. Era-indexing (§18) remains the real fix if a fourth
        // chase arrives.
        score: 146 - ((e.peakPos || 1) - 1) * 6 +
          Math.min(30, e.weeksOn || 0) * 0.5 + jitter(e.act) });
    });
    return list.sort((x, y) => y.score - x.score);
  }

  // award night (v0.9.22): the planned speaker, if the desk chose one
  function plannedSpeaker(state, g) {
    const plan = state.awardNightPlan;
    if (!plan || !g || plan.groupId !== g.id) return null;
    const p = state.people[plan.speakerId];
    return p && g.members.includes(p.id) ? { p, role: plan.role } : null;
  }
  function speakerLine(state, g, fandomName) {
    const sp = plannedSpeaker(state, g);
    if (!sp) return 'The leader took the microphone, steadied it, and named ' + fandomName +
      ' before anyone else \u2014 \u201cthis belongs to ' + fandomName + ', who believed it first.\u201d';
    if (sp.role === 'writer') {
      return KP.displayName(sp.p) + ' took the microphone \u2014 the member who writes \u2014 and thanked the producers by NAME, the demo that got passed on, and ' + fandomName + ' \u201cwho heard what we meant, not just what charted.\u201d The writers\u2019 rooms will remember being thanked.';
    }
    if (sp.role === 'breakout') {
      return KP.displayName(sp.p) + ' took the microphone \u2014 the one the public picked \u2014 and turned immediately to the line behind ' + (sp.p.gender === 'm' ? 'him' : 'her') + ': \u201cI stand in the light because they hold it steady.\u201d Then ' + fandomName + ', named like family. The clip was everywhere before the next award.';
    }
    return KP.displayName(sp.p) + ' took the microphone, steadied it, and named ' + fandomName +
      ' before anyone else \u2014 \u201cthis belongs to ' + fandomName + ', who believed it first.\u201d';
  }
  // the seat-mate beat: a friend at the next table makes the night warmer
  function tableLine(state, g) {
    const f = (state.industryFriends || []).find(fr => g.members.includes(fr.a));
    if (!f) return '';
    const theirs = state.people[f.b];
    return theirs ? ' From the next table, ' + KP.displayName(theirs) + ' was on their feet before the envelope finished opening \u2014 the cameras caught it, and the friendship trended beside the trophy.' : '';
  }

  KP.awardsWeek = function (state) {
    const A = KP.C.AWARDS;
    const notes = [];
    const woy = weekOfYear(state);

    if (woy === A.nominationWeek) {
      const noms = {};
      const mine = [];
      A.categories.forEach(cat => {
        noms[cat] = fieldFor(state, cat).slice(0, A.nomineeCount);
        noms[cat].forEach(n => { if (n.isPlayer) mine.push(A.LABELS[cat] + ' (' + n.name + ')'); });
      });
      // the daesang shortlist (v0.9.5): ONE grand prize, the whole year
      // weighed once — popularity, trophies, the fandom, every release
      noms.daesang = daesangField(state).slice(0, A.nomineeCount);
      noms.daesang.forEach(n => { if (n.isPlayer) mine.push(A.LABELS.daesang + ' (' + n.name + ')'); });
      state.awardSeason = { year: yearOf(state), noms };
      if (mine.length) {
        notes.push({ kind: 'public', urgent: true, ind: 'awardNoms',
          text: 'The year-end award nominations are out, and we are ON the list: ' + mine.join('; ') +
            '. The ceremony is ' + KP.weekLabel(state.week + (A.ceremonyWeek - A.nominationWeek)).text +
            '. The fandom has already made voting guides. The building pretends to be calm.' });
      } else if (KP.groups(state).some(g => g.debuted)) {
        notes.push({ kind: 'industry', ind: 'awardNoms',
          text: 'Year-end award nominations dropped — without a single mention of this company. The trades did not even note the omission, which is the insulting part. Next year has a job.' });
      }
    }

    // award night attended (v0.9.22, §55.4): the week before the
    // ceremony, the seating chart and ONE decision reach the desk —
    // who takes the microphone if the night goes our way
    if (woy === A.ceremonyWeek - 1 && state.awardSeason &&
        state.awardSeason.year === yearOf(state) &&
        !(state.scenes || []).some(sc => sc.kind === 'awardNight')) {
      const nominated = [];
      Object.values(state.awardSeason.noms).forEach(list =>
        (list || []).forEach(n => { if (n.isPlayer && n.groupId) nominated.push(n.groupId); }));
      const gid = nominated[0];
      const g = gid && KP.groupById(state, gid);
      if (g && g.members.length) {
        KP.openScene(state, { kind: 'awardNight', groupId: g.id,
          year: state.awardSeason.year, expiresWeek: state.week + 1 });
        notes.push({ kind: 'company', urgent: true, groupId: g.id,
          text: 'The year-end ceremony seating chart arrived — ' + g.name + ' at a floor table, cameras on a rail behind them, and the acceptance-speech question suddenly not hypothetical: if the night goes our way, WHO takes the microphone? The stage manager needs a name. It is on the Desk.' });
      }
    }

    if (woy === A.ceremonyWeek && state.awardSeason && state.awardSeason.year === yearOf(state)) {
      const results = [];
      let bonsangTonight = 0;   // the ladder: bonsangs first, then the one that matters
      A.categories.forEach(cat => {
        const noms = state.awardSeason.noms[cat] || [];
        if (!noms.length) return;
        const winner = noms[0];   // scores already carry the jury wobble
        results.push({ year: state.awardSeason.year, category: cat, name: winner.name,
          company: winner.company, isPlayer: !!winner.isPlayer });
        if (winner.isPlayer) {
          const g = KP.groupById(state, winner.groupId);
          state.trust = KP.clamp(state.trust + A.winTrust, 0, 100);
          if (g) {
            g.popularity = KP.clamp((g.popularity || 0) + A.winPop, 0, 100);
            g.honors = g.honors || [];
            g.honors.push({ year: state.awardSeason.year + 1, category: cat });
            KP.fandomGain(g, 3);
          }
          bonsangTonight++;
          notes.push({ kind: 'public', urgent: true, ind: 'awardWin', groupId: winner.groupId,
            category: cat,
            text: A.LABELS[cat].toUpperCase() + ' — a bonsang: ' + winner.name + '. ' +
              (g && plannedSpeaker(state, g)
                ? KP.displayName(plannedSpeaker(state, g).p) + ' took the mic exactly as planned and thanked the fans first and the company fourth, which is the correct order. '
                : 'The speech thanked the fans first and the company fourth, which is the correct order. ') +
              state.executive.name + ' has already had the trophy photographed for the lobby.' });
        } else {
          // the snub: we were shortlisted and watched someone else walk
          const snubbed = noms.find(n => n.isPlayer);
          if (snubbed) {
            const g = KP.groupById(state, snubbed.groupId);
            if (g) KP.fandomGain(g, KP.C.FANDOM.snubGain);
            notes.push({ kind: 'public', ind: 'awardSnub', groupId: snubbed.groupId, category: cat,
              text: A.LABELS[cat] + ' went to ' + winner.name + ' (' + winner.company + ') — over ' +
                snubbed.name + '. The fandom has declared the ceremony rigged and tripled its streaming schedule out of spite. Nothing organizes a fanbase like an injustice.' });
          }
        }
      });
      // ---- the daesang: one grand prize, and the room holds its breath --
      const dNoms = state.awardSeason.noms.daesang || [];
      if (dNoms.length) {
        let dWinner = dNoms[0];
        // the tenure margin (v0.9.8): a debut-year act must be UNDENIABLE
        // to take the grand prize. Inside the margin, the jury defaults
        // to a body of work — the rookie grand slam survives only when
        // the year survives every argument against it.
        const yFrom = yearStart(state);
        const isRookie = n => n.debutWeek != null && n.debutWeek >= yFrom;
        if (isRookie(dWinner) && dNoms[1] &&
            dWinner.score - dNoms[1].score < A.rookieDaesangMargin) {
          const passed = dWinner;
          dWinner = dNoms[1];
          notes.push({ kind: 'public', ind: 'daesangTenure', priority: 'high',
            text: 'The daesang envelope had a debate inside it: ' + passed.name + '’s debut year was the loudest in the room — and the jury still went with ' + dWinner.name + '. Grand prizes answer a body of work, went the reasoning, and a rookie’s body of work is eight months old. Nobody believes that conversation is finished.' });
        }
        results.push({ year: state.awardSeason.year, category: 'daesang',
          name: dWinner.name, company: dWinner.company, isPlayer: !!dWinner.isPlayer });
        if (dWinner.isPlayer) {
          const g = KP.groupById(state, dWinner.groupId);
          state.trust = KP.clamp(state.trust + A.daesangTrust, 0, 100);
          const first = !state.daesangWonYear;
          if (g) {
            g.popularity = KP.clamp((g.popularity || 0) + A.daesangPop, 0, 100);
            g.honors = g.honors || [];
            g.honors.push({ year: state.awardSeason.year + 1, category: 'daesang' });
            KP.fandomGain(g, A.daesangFandom);
            const fandomName = (g.fandom && g.fandom.name) ? g.fandom.name : 'the fans';
            if (first) {
              // the first daesang gets the full first-win treatment:
              // the history line, the ambition door, a speech that
              // names the fandom
              // stored 1-based (awardSeason.year is 0-based): a year-1
              // daesang must not read falsy, or the "first" repeats
              state.daesangWonYear = state.awardSeason.year + 1;
              g.members.forEach(id => {
                const m = state.people[id];
                if (!m) return;
                m.morale = KP.clamp(m.morale + 5, 0, 100);
                m.history.push({ week: state.week, text: 'Won the daesang. The first one. Stood in the line on that stage and heard the fandom’s name said out loud on year-end television.' });
                const amb = KP.ambitionTouch(state, m, 'trophy');
                if (amb) notes.push(amb);
              });
              notes.push({ kind: 'public', urgent: true, priority: 'critical', ind: 'daesang',
                groupId: g.id, first: true,
                text: 'DAESANG. ' + g.name + '. The grand prize, the real one, the one the whole ladder exists for. ' + speakerLine(state, g, fandomName) +
                  ' The members cried in a line. The building will never fully recover, and should not.' + tableLine(state, g) });
            } else {
              notes.push({ kind: 'public', urgent: true, ind: 'daesang', groupId: g.id,
                text: 'DAESANG, again: ' + g.name + '. The second one lands differently — less lightning, more law. The speech was calmer. ' + fandomName + ' was still named first, because some orders are permanent.' });
            }
          }
        } else {
          // the ladder's cruelty: bonsangs in hand, the big one elsewhere
          const shortlisted = dNoms.find(n => n.isPlayer);
          if (shortlisted) {
            const g = KP.groupById(state, shortlisted.groupId);
            if (g) KP.fandomGain(g, KP.C.FANDOM.snubGain *
              (bonsangTonight ? A.snubAgainMult : 1));
            notes.push({ kind: 'public', ind: 'daesangSnub', priority: 'high',
              groupId: shortlisted.groupId, bonsangTonight,
              text: bonsangTonight
                ? 'The daesang went to ' + dWinner.name + ' (' + dWinner.company + '). ' + g.name + ' left with a bonsang. Again. The fandom’s reaction moved through grief to administration in under an hour — spreadsheets, streaming schedules, a pinned post that just says NEXT YEAR. Nothing radicalizes like almost.'
                : 'The daesang went to ' + dWinner.name + ' (' + dWinner.company + ') — with ' + g.name + ' on the shortlist. Being in the room where it happens is its own kind of homework. The fandom took notes.' });
          }
        }
      }
      // award night settles (v0.9.22): the chosen speaker either took
      // the mic \u2014 stamped once, however many trophies \u2014 or the
      // speech stayed folded in a jacket pocket
      if (state.awardNightPlan && state.awardNightPlan.year === state.awardSeason.year) {
        const sp = state.people[state.awardNightPlan.speakerId];
        if (sp) {
          if (results.some(r => r.isPlayer)) {
            const AN = KP.C.AWARD_NIGHT;
            sp.morale = KP.clamp(sp.morale + AN.speakerMorale, 0, 100);
            KP.recordDirected(state, sp.id, 'gaveTheSpeech', 2);
            sp.history.push({ week: state.week, text: 'Gave the acceptance speech on year-end television. Practiced it once in the van and then said something better.' });
          } else {
            // the folded speech is a durable memory too (v0.9.35): the
            // note alone was losing the weekly trim in loud weeks
            sp.history.push({ week: state.week, text: 'The acceptance speech stayed folded in a jacket pocket — a nominated night that stayed one. It will need exactly one edit next year: the date.' });
            notes.push({ kind: 'development', personId: sp.id,
              text: KP.fillPro('The van ride home was quiet in the specific way of a nominated night that stayed one. ' + KP.displayName(sp) + '\u2019s acceptance speech stayed folded in a jacket pocket. {She} will not throw it away. Next year it will need one edit: the date.', sp) });
          }
        }
      }
      state.awardNightPlan = null;
      state.awardHistory = (state.awardHistory || []).concat(results).slice(-24);
      state.awardSeason = null;
      // the year's tally closes with the ceremony (0.9.13 audit B2): the
      // shelf keeps everything, the SCORING starts over — next year's
      // prizes are won next year
      KP.groups(state).forEach(g => { if (g.trophiesYear) g.trophiesYear = 0; });
      (state.rivals || []).forEach(rv => (rv.acts || []).forEach(a => {
        if (a.showWinsYear) a.showWinsYear = 0;
      }));
    }
    return notes;
  };

  // ---- award night: the seating chart and the microphone (v0.9.22) ----
  KP.registerScene('awardNight', {
    title: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      return (g ? g.name : 'The ceremony') + ' \u00b7 award night';
    },
    body: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      if (!g) return '';
      const friend = (state.industryFriends || []).find(fr => g.members.includes(fr.a));
      const fp = friend && state.people[friend.b];
      return 'The floor table is booked, the stylists have opinions, and the stage manager wants ONE name: who takes the microphone if ' + g.name +
        '\u2019s night goes the way the fandom\u2019s spreadsheets say it might.' +
        (fp ? ' Seating note: ' + KP.displayName(fp) + ' is at the next table \u2014 the cameras will find that friendship the moment anything happens.' : '') +
        ' Whoever speaks carries the room; whoever expected to and does not will notice.';
    },
    options: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      if (!g) return [{ id: 'leader', label: 'The leader' }];
      const out = [{ id: 'leader', label: 'The leader \u2014 steady hands' }];
      const breakout = g.results && g.results.breakoutId &&
        g.members.includes(g.results.breakoutId) ? g.results.breakoutId : null;
      if (breakout && breakout !== g.roles.leader) {
        out.push({ id: 'breakout', label: KP.publicGiven(state.people[breakout]) + ' \u2014 the public\u2019s pick' });
      }
      const writer = g.members.find(id => (g.releases || []).some(r => r.writtenBy === id));
      if (writer && writer !== g.roles.leader && writer !== breakout) {
        out.push({ id: 'writer', label: KP.publicGiven(state.people[writer]) + ' \u2014 the one who writes' });
      }
      return out;
    },
    resolve: (state, sc, optionId) => {
      const g = KP.groupById(state, sc.groupId);
      if (!g) return {};
      let speakerId = g.roles.leader, role = 'leader';
      if (optionId === 'breakout' && g.results && g.results.breakoutId) {
        speakerId = g.results.breakoutId; role = 'breakout';
      } else if (optionId === 'writer') {
        const w = g.members.find(id => (g.releases || []).some(r => r.writtenBy === id));
        if (w) { speakerId = w; role = 'writer'; }
      }
      state.awardNightPlan = { year: sc.year, groupId: g.id, speakerId, role };
      // whoever expected the mic and lost it, noticed (the leader always
      // expects it \u2014 that is what leaders are for)
      if (role !== 'leader' && g.roles.leader && state.people[g.roles.leader]) {
        const lead = state.people[g.roles.leader];
        lead.morale = KP.clamp(lead.morale - KP.C.AWARD_NIGHT.passedOverMorale, 0, 100);
      }
      const sp = state.people[speakerId];
      return { toast: (sp ? KP.displayName(sp) : 'The leader') + ' gets the microphone if the night delivers. ' +
        (sp ? KP.fillPro('{She} has started drafting nothing, which is how the good speeches happen.', sp) : '') };
    },
    expire: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      if (!g) return null;
      state.awardNightPlan = { year: sc.year, groupId: g.id, speakerId: g.roles.leader, role: 'leader' };
      return { kind: 'company', groupId: g.id,
        text: 'Nobody answered the stage manager, so protocol answered: the leader speaks. Protocol is fine. Protocol is always fine. That is the whole problem with protocol.' };
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
