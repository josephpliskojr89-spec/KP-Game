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
          notes.push({ kind: 'public', urgent: true, ind: 'awardWin', groupId: winner.groupId,
            category: cat,
            text: A.LABELS[cat].toUpperCase() + ': ' + winner.name + '. The speech thanked the fans first and the company fourth, which is the correct order. ' +
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
      state.awardHistory = (state.awardHistory || []).concat(results).slice(-24);
      state.awardSeason = null;
    }
    return notes;
  };
})(typeof window !== 'undefined' ? window : globalThis);
