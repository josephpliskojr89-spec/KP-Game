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
        const trophies = Object.values(g.trophies || {}).reduce((s, n) => s + n, 0);
        if ((g.releases || []).some(r => r.week >= from)) {
          list.push({ name: g.name, company: state.company.short, isPlayer: true,
            groupId: g.id, score: (g.popularity || 0) + trophies * 3 + KP.fandomIntensity(g) * 0.2 + jitter(g.id) });
        }
      });
      (state.rivals || []).forEach(rv => (rv.acts || []).forEach(a => {
        if (a.retired || !(a.releases || []).some(r => r.week >= from)) return;
        list.push({ name: a.name, company: rv.short, isPlayer: false,
          score: (a.popularity || 0) + (a.showWins || 0) * 2 + jitter(a.id) });
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
      const trophies = Object.values(g.trophies || {}).reduce((s, n) => s + n, 0);
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
        score: (a.popularity || 0) * 1.2 + (a.showWins || 0) * 2.5 +
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
        // 140 base (v0.9.10): careers now START with an established
        // act, so the bar the giants set rises with them. 145 (v0.9.11):
        // the second job inflates player popularity a few points per
        // career — the giants panel and sing OSTs too, and the daesang
        // stays designed-scarce (owner: "the game in general feels
        // easy"). 148 (v0.9.12): declared returns land warmer now; the
        // giants stage returns of their own. See §18 — if the creep
        // continues, index this to the era instead of stepping it.
        score: 148 - ((e.peakPos || 1) - 1) * 6 +
          Math.min(30, e.weeksOn || 0) * 0.5 + jitter(e.act) });
    });
    return list.sort((x, y) => y.score - x.score);
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
            text: A.LABELS[cat].toUpperCase() + ' — a bonsang: ' + winner.name + '. The speech thanked the fans first and the company fourth, which is the correct order. ' +
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
                text: 'DAESANG. ' + g.name + '. The grand prize, the real one, the one the whole ladder exists for. The leader took the microphone, steadied it, and named ' + fandomName +
                  ' before anyone else — “this belongs to ' + fandomName + ', who believed it first.” The members cried in a line. The building will never fully recover, and should not.' });
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
      state.awardHistory = (state.awardHistory || []).concat(results).slice(-24);
      state.awardSeason = null;
    }
    return notes;
  };
})(typeof window !== 'undefined' ? window : globalThis);
