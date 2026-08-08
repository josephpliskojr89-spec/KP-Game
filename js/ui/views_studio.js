/* Studio: demos, concept, rehearsal allocation, promotion, the date —
   and the debut results page, which inherits the era's identity. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};
  const UI = KP.UI;

  // Which group the studio is working with right now.
  UI.studioGroup = function (state) {
    const groups = KP.groups(state);
    if (!groups.length) return null;
    const chosen = KP.groupById(state, KP.App.studioGroupId);
    if (chosen) return chosen;
    // default: the group most in need of a record
    return KP.devGroup(state) ||
      groups.slice().sort((a, b) => (a.lastReleaseWeek || 0) - (b.lastReleaseWeek || 0))[0];
  };

  UI.renderStudio = function (state, draft) {
    const groups = KP.groups(state);
    const g = UI.studioGroup(state);
    const html = [];
    if (!g) {
      return '<div class="group-hero"><div class="g-status">Studio</div>' +
        '<div class="g-name" style="font-size:clamp(1.7rem,8vw,2.4rem)">No artist,<br>no record.</div>' +
        '<div style="color:var(--ink-dim);font-size:.86rem;margin-top:8px;line-height:1.5">Form a group first. The demos will be waiting.</div></div>';
    }
    const switcher = groups.length > 1
      ? '<div class="pad" style="margin-bottom:8px"><div class="seg">' +
        groups.map(x => '<button class="' + (x.id === g.id ? 'on' : '') + '" data-action="studio-group" data-id="' + x.id + '">' + UI.esc(x.name) + '</button>').join('') +
        '</div></div>'
      : '';
    if (g.prep) {
      const inW = g.prep.scheduledWeek - state.week;
      const demo = (g.demos || []).find(s => s.id === g.prep.songId);
      UI.setEra(g.prep.conceptId);
      return switcher + '<div class="group-hero"><div class="g-status">Locked & in production · ' + UI.esc(g.name) + '</div>' +
        '<div class="g-name" style="font-size:clamp(1.9rem,10vw,2.8rem)">“' + UI.esc(demo.title) + '”</div>' +
        '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:8px">' +
        '<span class="chip cool">' + UI.esc(KP.conceptById(g.prep.conceptId).label) + '</span>' +
        '<span class="chip">' + UI.esc(g.prep.promo) + ' promotion</span>' +
        '<span class="chip hot">' + (inW <= 0 ? 'this week' : inW + ' week' + (inW === 1 ? '' : 's') + ' to ' + (g.debuted ? 'comeback' : 'debut')) + '</span></div>' +
        '<div style="color:var(--ink-dim);font-size:.84rem;margin-top:12px;line-height:1.5">Rehearsal split — vocals ' + g.prep.alloc.vocals + '%, dance ' + g.prep.alloc.dance + '%, rap ' + g.prep.alloc.rap + '%, media ' + g.prep.alloc.media + '%. Advance the weeks. The date does not move.</div></div>';
    }

    // --- the calendar is closed: promotion, then contractual rest (v0.4.2)
    if (g.debuted) {
      const opens = (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks;
      if (state.week <= opens) {
        const promoting = state.week <= (g.promoUntil || 0);
        const members = g.members.map(id => state.people[id]);
        const avgF = Math.round(members.reduce((s, m) => s + m.fatigue, 0) / members.length);
        return switcher + '<div class="group-hero"><div class="g-status">' +
          (promoting ? 'Mid-promotion · ' : 'Scheduled rest · ') + UI.esc(g.name) + '</div>' +
          '<div class="g-name" style="font-size:clamp(1.7rem,8vw,2.4rem)">' +
          (promoting ? 'The stages<br>come first.' : 'Let them<br>sleep.') + '</div>' +
          '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px">' +
          (promoting ? '<span class="chip hot">promo through ' + UI.esc(KP.weekLabel(g.promoUntil).text) + '</span>' : '') +
          '<span class="chip cool">calendar reopens ' + UI.esc(KP.weekLabel(opens + 1).text) + '</span>' +
          '<span class="chip' + (avgF >= 70 ? ' hot' : '') + '">the room is ' + (avgF >= 70 ? 'running on fumes' : avgF >= 45 ? 'tired' : 'recovering well') + '</span>' +
          '</div>' +
          '<div style="color:var(--ink-dim);font-size:.84rem;margin-top:12px;line-height:1.5">' +
          (promoting
            ? 'Promotion runs hot by design. The rest window after it is contractual — the next release cannot be locked until the calendar reopens.'
            : 'The rest is contractual and it works: recovery runs at double pace until the calendar reopens. The producers are already writing.') +
          '</div></div>';
      }
    }

    // --- planning mode ---
    if (!g.demos) {
      const rng = KP.rngFor(state);
      g.demos = KP.generateDemos(state, rng);
      state.rngState = rng.state();
      KP.App.save();
    }
    const members = g.members.map(id => state.people[id]);
    const sel = g.demos.find(s => s.id === draft.songId) || null;
    const conceptId = draft.conceptId || (sel ? sel.conceptId : null);
    if (conceptId) UI.setEra(conceptId);

    html.push(switcher);
    html.push('<div class="pad"><div class="d-label">' + (g.debuted ? 'Comeback planning' : 'Debut planning') + ' · ' + UI.esc(g.name) + '</div>' +
      '<div class="bigname" style="font-size:clamp(1.6rem,8vw,2.2rem)">Pick the record.<br>Pick the day.</div>' +
      (g.debuted && g.results ? '<div style="font-size:.76rem;color:var(--ink-dim);margin-top:8px">Last release: “' + UI.esc(g.results.songTitle) + '” — ' + UI.esc(g.results.receptionLabel.toLowerCase()) + ', peaked #' + g.results.chartPeak + '. The room is ' + KP.popularityWord(g.popularity) + '.</div>' : '') +
      '</div>');

    html.push('<div class="kicker">Demos on the desk</div>');
    g.demos.forEach(demo => {
      const on = draft.songId === demo.id;
      html.push('<div class="card demo-card ' + (on ? 'on' : '') + '" data-action="studio-song" data-id="' + demo.id + '">' +
        '<div class="s-eq"><i></i><i></i><i></i></div>' +
        '<div class="s-title">“' + UI.esc(demo.title) + '”</div>' +
        '<div class="s-prod">' + UI.esc(demo.producer) + ' · leans ' + UI.esc(KP.conceptById(demo.conceptId).label) + '</div>' +
        '<div class="s-notes">' + KP.demoOpinion(state, demo, members).map(l => UI.esc(l)).join('<br>') + '</div>' +
        '</div>');
    });

    if (sel) {
      html.push('<div class="kicker">Concept direction</div>');
      html.push('<div class="concept-scroll">' +
        KP.C.CONCEPTS.map(c => '<button class="chip concept-pill ' + (conceptId === c.id ? 'on' : '') + '" ' +
          'data-action="studio-concept" data-id="' + c.id + '">' + UI.esc(c.label) +
          (c.id === sel.conceptId ? ' ✦' : '') + '</button>').join('') +
        '</div>' +
        '<div class="pad" style="font-size:.7rem;color:var(--ink-dim)">✦ = the demo’s natural lean. Fighting it is allowed. Sometimes it even works.</div>');

      const a = draft.alloc;
      html.push('<div class="kicker">Rehearsal allocation</div><div class="card">' +
        ['vocals', 'dance', 'rap', 'media'].map(k =>
          '<div class="alloc-row"><span class="a-label">' + k + '</span>' +
          '<input type="range" min="0" max="70" step="5" value="' + a[k] + '" data-action="studio-alloc" data-key="' + k + '">' +
          '<span class="a-val">' + a[k] + '%</span></div>').join('') +
        '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:10px">Total ' +
        (a.vocals + a.dance + a.rap + a.media) + '% — must land on 100.</div></div>');

      const fmt = KP.C.DEBUT.FORMATS.find(f => f.id === draft.format) || KP.C.DEBUT.FORMATS[0];
      html.push('<div class="kicker">The record</div>');
      html.push('<div class="pad"><div class="seg">' +
        KP.C.DEBUT.FORMATS.map(f => '<button class="' + (draft.format === f.id ? 'on' : '') + '" ' +
          'data-action="studio-format" data-format="' + f.id + '">' + UI.esc(f.label) + ' · ' + f.cost + '</button>').join('') +
        '</div><div style="font-size:.7rem;color:var(--ink-dim);margin-top:8px">' +
        UI.esc(fmt.label) + ': ' + fmt.tracks + ' tracks, needs ' + Math.max(KP.C.DEBUT.prepWeeksMin, fmt.minPrep) + ' weeks of runway, pays ×' + fmt.revenueMult + ' when it lands.</div></div>');

      html.push('<div class="kicker">Promotion</div>');
      html.push('<div class="pad"><div class="seg">' +
        KP.C.DEBUT.promoLevels.map(pl => '<button class="' + (draft.promo === pl ? 'on' : '') + '" ' +
          'data-action="studio-promo" data-promo="' + pl + '">' + pl + ' · ' + KP.C.DEBUT.promoCost[pl] + '</button>').join('') +
        '</div><div style="font-size:.7rem;color:var(--ink-dim);margin-top:8px">Plus the record itself (' + fmt.cost + '). Budget: ' + state.budget + '.</div></div>');

      html.push('<div class="kicker">Rollout focus</div>');
      html.push('<div class="pad">' +
        Object.keys(KP.C.COMEBACK.FOCUS).map(k => {
          const f = KP.C.COMEBACK.FOCUS[k];
          return '<button class="chip ' + (draft.focus === k ? 'hot' : '') + '" style="margin:0 6px 6px 0" ' +
            'data-action="studio-focus" data-focus="' + k + '">' + UI.esc(f.label) + '</button>';
        }).join('') +
        '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:4px">' +
        UI.esc((KP.C.COMEBACK.FOCUS[draft.focus] || KP.C.COMEBACK.FOCUS.musicShows).desc) +
        '</div></div>');

      const minW = state.week + Math.max(KP.C.DEBUT.prepWeeksMin, fmt.minPrep);
      const options = [];
      const lastOption = (state.objective.status === 'open' && state.objective.type === 'debutGirlGroup')
        ? Math.min(minW + 16, state.objective.deadlineWeek)
        : minW + 16;
      for (let w = minW; w <= lastOption; w += 2) options.push(w);
      html.push('<div class="kicker">The date</div>');
      html.push('<div class="pad"><div style="display:flex;gap:8px;flex-wrap:wrap">' +
        options.map(w => '<button class="chip ' + (draft.week === w ? 'hot' : '') + '" data-action="studio-week" data-week="' + w + '">' +
          UI.esc(KP.weekLabel(w).text) + '</button>').join('') +
        '</div>' +
        (options.length ? '' : '<div style="color:var(--danger);font-size:.8rem">No runway left before the deadline.</div>') +
        '</div>');

      html.push('<div class="pad" style="margin-top:20px">' +
        '<button class="btn primary" style="width:100%" data-action="studio-lock"' + (draft.week ? '' : ' disabled') + '>Lock the ' + (g.debuted ? 'comeback' : 'debut') + '</button></div>');
    }
    return html.join('');
  };

  // ---- results ---------------------------------------------------------
  UI.renderResults = function (state, groupId) {
    const g = (groupId && KP.groupById(state, groupId)) ||
      KP.groups(state).filter(x => x.results)
        .sort((a, b) => (b.results.week || 0) - (a.results.week || 0))[0];
    if (!g || !g.results) return '<div class="card">No report yet.</div>';
    const r = g.results;
    const html = [];
    UI.setEra(r.conceptId);
    const breakout = state.people[r.breakoutId];

    html.push('<div class="result-hero">' +
      '<div class="r-band">' + (r.isDebut === false ? 'Comeback report' : 'Debut report') + ' · ' + UI.esc(KP.weekLabel(r.week).text) + '</div>' +
      '<div class="r-title">' + UI.esc(r.receptionLabel) + '</div>' +
      '<div class="r-song">' + UI.esc(g.name) + ' — “' + UI.esc(r.songTitle) + '” · ' + UI.esc(KP.conceptById(r.conceptId).label) + '</div>' +
      '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:14px">' +
      '<span class="chip">stage: ' + perfWord(r.performance) + '</span>' +
      '<span class="chip">room: ' + chemWord(r.chem) + '</span>' +
      (r.chartPeak != null ? '<span class="chip cool">peaked #' + r.chartPeak + '</span>' : '') +
      '<span class="chip gold">revenue +' + r.revenue + '</span>' +
      '</div></div>');

    html.push('<div class="kicker">The public decided</div>');
    r.publicNotes.forEach(n => html.push('<div class="note">' + UI.esc(n) + '<span class="n-who">— community & PR digest</span></div>'));

    html.push('<div class="kicker">Breakout</div>');
    html.push('<div class="card" data-action="open-dossier" data-id="' + breakout.id + '" style="display:flex;gap:14px;align-items:center">' +
      UI.portrait(breakout, 'md') +
      '<div style="flex:1"><div style="font-weight:800">' + UI.esc(KP.displayName(breakout)) + '</div>' +
      '<div style="font-size:.78rem;color:var(--ink-dim);margin-top:3px">' +
      (r.breakoutId === g.roles.center ? 'The center held the center. The plan worked.' : 'Not your center. The public picked her anyway.') +
      '</div></div></div>');
    if (r.centerOvershadowed) {
      html.push('<div class="note urgent">The designated center is losing the room to ' + UI.esc(breakout.name.given) + '. Reassigning the center is your call to make — and your consequence to own.<span class="n-who">— performance division</span></div>');
    }

    html.push('<div class="kicker">Upstairs</div>');
    html.push('<div class="note">' + UI.esc(r.execLine) + '<span class="n-who">— ' + UI.esc(state.executive.name) + ' · trust ' + (r.trustDelta >= 0 ? 'up' : 'down') + '</span></div>');

    return html.join('');
  };

  function perfWord(v) { return v >= 75 ? 'commanding' : v >= 58 ? 'sharp' : v >= 42 ? 'uneven' : 'shaky'; }
  function chemWord(v) { return v >= 66 ? 'together' : v >= 40 ? 'workable' : 'cold'; }
})(typeof window !== 'undefined' ? window : globalThis);
