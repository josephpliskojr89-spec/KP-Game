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
      const clash = g.prep.clash;
      // the war room (v0.6.4): a rival parked a release on our date —
      // hold it, or slip. One decision, once.
      let clashCard = '';
      if (clash && !clash.resolved) {
        const W = KP.C.WAR;
        clashCard = '<div class="war-card">' +
          '<div class="w-flag">Date clash · ' + UI.esc(clash.company) + '</div>' +
          '<div class="w-text">' + UI.esc(clash.actName) + '’s comeback just landed on our announced date. Scheduling coincidences do not exist in this industry.</div>' +
          '<div class="w-actions">' +
          '<button class="btn primary" data-action="clash-hold" data-id="' + g.id + '">Hold the date</button>' +
          '<button class="btn" data-action="clash-slip" data-id="' + g.id + '">Slip ' + W.slipWeeks + ' weeks · ' + W.slipCost + '</button>' +
          '</div></div>';
      } else if (clash && clash.resolved === 'hold') {
        clashCard = '<div class="war-card held"><div class="w-flag">Head-to-head · ' + UI.esc(clash.company) + '</div>' +
          '<div class="w-text">The date stands. ' + UI.esc(clash.actName) + ' releases the same week. The whole scene is watching the scoreboard.</div></div>';
      }
      return switcher + '<div class="group-hero"><div class="g-status">Locked & in production · ' + UI.esc(g.name) + '</div>' +
        '<div class="g-name" style="font-size:clamp(1.9rem,10vw,2.8rem)">“' + UI.esc(demo.title) + '”</div>' +
        '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:8px">' +
        '<span class="chip cool">' + UI.esc(KP.conceptById(g.prep.conceptId).label) + '</span>' +
        '<span class="chip">' + UI.esc(g.prep.promo) + ' promotion</span>' +
        '<span class="chip hot">' + (inW <= 0 ? 'this week' : inW + ' week' + (inW === 1 ? '' : 's') + ' to ' + (g.debuted ? 'comeback' : 'debut')) + '</span></div>' +
        '<div style="color:var(--ink-dim);font-size:.84rem;margin-top:12px;line-height:1.5">Rehearsal split — vocals ' + g.prep.alloc.vocals + '%, dance ' + g.prep.alloc.dance + '%, rap ' + g.prep.alloc.rap + '%, media ' + g.prep.alloc.media + '%. Advance the weeks.' +
        (clash && !clash.resolved ? '' : ' The date does not move.') + '</div></div>' + clashCard;
    }

    // --- on the road (v0.6.8): the tour owns the calendar
    if (g.tour) {
      const T = KP.C.TOUR;
      const tour = g.tour;
      const legId = tour.legs[tour.legIdx];
      const where = legId === 'kr' ? 'Korea' : KP.regionLabel(legId);
      return switcher + '<div class="group-hero"><div class="g-status">On tour · ' + UI.esc(g.name) + '</div>' +
        '<div class="g-name" style="font-size:clamp(1.7rem,8vw,2.4rem)">The road<br>has them.</div>' +
        '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px">' +
        '<span class="chip hot">' + UI.esc(T.SCALES[tour.scale].label) + ' · leg ' + (tour.legIdx + 1) + '/' + tour.legs.length + ' · ' + UI.esc(where) + '</span>' +
        '<span class="chip">' + UI.esc(T.PACING[tour.pacing].label.toLowerCase()) + ' pacing</span>' +
        '<span class="chip cool">' + UI.esc(T.SETLISTS[tour.setlist].label.toLowerCase()) + ' setlist</span>' +
        (tour.soldOut ? '<span class="chip gold">' + tour.soldOut + ' sold out</span>' : '') +
        '</div>' +
        '<div style="color:var(--ink-dim);font-size:.84rem;margin-top:12px;line-height:1.5">Every leg reports honestly when it closes. Advance the weeks — the leg letters land on the Desk.</div></div>';
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
    // render never draws rng (kernel law, v0.7.2): demos are generated
    // at formation and by the weekly tick. If they are not here yet,
    // the producers are literally still writing — say so and wait.
    if (!g.demos) {
      return switcher + '<div class="group-hero"><div class="g-status">The pitch meeting · ' + UI.esc(g.name) + '</div>' +
        '<div class="g-name" style="font-size:clamp(1.7rem,8vw,2.4rem)">The producers<br>are writing.</div>' +
        '<div style="color:var(--ink-dim);font-size:.86rem;margin-top:8px;line-height:1.5">Fresh pitches land next week' +
        (g.concept ? ' — written to the ' + UI.esc((KP.conceptById(g.concept) || {}).label || '') + ' brief' : '') +
        '. Advance the week; the demos will be on the desk.</div></div>';
    }
    const members = g.members.map(id => state.people[id]);
    const sel = g.demos.find(s => s.id === draft.songId) || null;
    const conceptId = draft.conceptId || (sel ? sel.conceptId : null);
    if (conceptId) UI.setEra(conceptId);

    html.push(switcher);
    html.push('<div class="pad"><div class="d-label">' + (g.debuted ? 'Comeback planning' : 'Debut planning') + ' · ' + UI.esc(g.name) + '</div>' +
      '<div class="bigname" style="font-size:clamp(1.6rem,8vw,2.2rem)">Pick the record.<br>Pick the day.</div>' +
      (g.debuted && g.results ? '<div style="font-size:.76rem;color:var(--ink-dim);margin-top:8px">Last release: “' + UI.esc(g.results.songTitle) + '” — ' + UI.esc(g.results.receptionLabel.toLowerCase()) + ', scene #' + g.results.chartPeak + (g.results.nationalPeak != null ? ' · national #' + g.results.nationalPeak : '') + '. The room is ' + KP.popularityWord(g.popularity) + '.</div>' : '') +
      '</div>');

    html.push('<div class="kicker">Demos on the desk</div>');
    g.demos.forEach(demo => {
      const on = draft.songId === demo.id;
      html.push('<div class="card demo-card ' + (on ? 'on' : '') + '" data-action="studio-song" data-id="' + demo.id + '">' +
        '<div class="s-eq"><i></i><i></i><i></i></div>' +
        '<div class="s-title">“' + UI.esc(demo.title) + '”</div>' +
        '<div class="s-prod">' + UI.esc(demo.producer) + ' · leans ' + UI.esc(KP.conceptById(demo.conceptId).label) +
        (demo.toBrief ? ' · <span style="color:var(--gold)">to the brief</span>' : '') + '</div>' +
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

      // the rollout builder (v0.6.3): 4 promo weeks, 2 bookings each —
      // constrained choices, not sliders
      const R = KP.C.ROLLOUT;
      if (!draft.rollout) draft.rollout = R.DEFAULT.map(w => w.slice());
      const rolloutCost = draft.rollout.reduce((s, wk) =>
        s + wk.reduce((x, a) => x + (R.ACTIVITIES[a] ? R.ACTIVITIES[a].cost : 0), 0), 0);
      html.push('<div class="kicker">The rollout · ' + R.slotsPerWeek + ' bookings a week · cost ' + rolloutCost + '</div>');
      html.push('<div class="card">' + draft.rollout.map((wk, i) =>
        '<div class="ro-week"><span class="ro-label">Wk ' + (i + 1) + '</span>' +
        '<div class="ro-chips">' +
        Object.keys(R.ACTIVITIES).map(a =>
          '<button class="chip ro-chip' + (wk.includes(a) ? ' on' : '') + '" ' +
          'data-action="studio-rollact" data-week="' + i + '" data-act="' + a + '">' +
          UI.esc(R.ACTIVITIES[a].label) + '</button>').join('') +
        '</div></div>').join('') +
        '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:8px">The Countdown is the Sunday institution, Prime Stage rewards performers, Pop Wave takes chances on new faces — and every show week, somebody goes home with the trophy. Variety builds faces; fan signs buy loyalty; the challenge is cheap reach; rest is rest. They cannot be everywhere — pick.</div>' +
        '</div>');

      const minW = state.week + Math.max(KP.C.DEBUT.prepWeeksMin, fmt.minPrep);
      const options = [];
      const lastOption = (state.objective.status === 'open' && state.objective.type === 'debutGirlGroup')
        ? Math.min(minW + 16, state.objective.deadlineWeek)
        : minW + 16;
      for (let w = minW; w <= lastOption; w += 2) options.push(w);
      html.push('<div class="kicker">The date</div>');
      // the war calendar (v0.6.4): announced rival weeks are visible at
      // pick time — dodge the traffic, or pick the fight on purpose
      html.push('<div class="pad"><div style="display:flex;gap:8px;flex-wrap:wrap">' +
        options.map(w => {
          const foes = KP.announcedAt(state, w);
          const big = foes.find(x => (x.act.popularity || 0) >= KP.C.WAR.battleMinPop);
          return '<button class="chip ' + (draft.week === w ? 'hot' : '') + (big ? ' clash' : '') +
            '" data-action="studio-week" data-week="' + w + '">' + UI.esc(KP.weekLabel(w).text) +
            (foes.length ? ' · vs ' + UI.esc(foes[0].act.name) : '') + '</button>';
        }).join('') +
        '</div>' +
        (options.length ? '' : '<div style="color:var(--danger);font-size:.8rem">No runway left before the deadline.</div>') +
        '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:8px">Announced rival weeks are marked. A clean week keeps the public’s attention whole; a shared week is a head-to-head the recaps will score.</div>' +
        '</div>');

      html.push('<div class="pad" style="margin-top:20px">' +
        '<button class="btn primary" style="width:100%" data-action="studio-lock"' + (draft.week ? '' : ' disabled') + '>Lock the ' + (g.debuted ? 'comeback' : 'debut') + '</button></div>');
    }

    // --- the touring desk (v0.6.8): the other thing a calendar is for ---
    const gate = KP.tourEligible(state, g);
    if (gate.ok) {
      const T = KP.C.TOUR;
      const td = KP.App.tourDraft = KP.App.tourDraft ||
        { scale: 'clubs', legs: [], pacing: 'humane', setlist: 'hits' };
      const scale = T.SCALES[td.scale];
      const cost = Math.round(scale.costPerLeg * Math.max(1, td.legs.length) * T.PACING[td.pacing].costMult);
      html.push('<div class="kicker" style="margin-top:26px">The touring desk</div>');
      html.push('<div class="card">' +
        '<div class="seg" style="margin-bottom:10px">' +
        Object.keys(T.SCALES).map(s => '<button class="' + (td.scale === s ? 'on' : '') + '" data-action="tour-scale" data-scale="' + s + '">' + UI.esc(T.SCALES[s].label) + '</button>').join('') +
        '</div>' +
        '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px">' +
        KP.tourLegOptions(state, g).map(o => {
          const on = td.legs.includes(o.id);
          const viable = o.demand >= scale.sweetSpot * T.softBelow * 0.6;
          return '<button class="chip' + (on ? ' hot' : '') + '" data-action="tour-leg" data-leg="' + o.id + '"' +
            (viable ? '' : ' style="opacity:.4"') + '>' + UI.esc(o.label) + ' · ' +
            (o.id === 'kr' ? KP.popularityWord(o.demand) : KP.regionWord(o.demand)) + '</button>';
        }).join('') +
        '</div>' +
        '<div class="seg" style="margin-bottom:10px">' +
        Object.keys(T.PACING).map(p => '<button class="' + (td.pacing === p ? 'on' : '') + '" data-action="tour-pacing" data-pacing="' + p + '">' + UI.esc(T.PACING[p].label) + '</button>').join('') +
        '</div>' +
        '<div class="seg" style="margin-bottom:10px">' +
        Object.keys(T.SETLISTS).map(sl => '<button class="' + (td.setlist === sl ? 'on' : '') + '" data-action="tour-setlist" data-setlist="' + sl + '">' + UI.esc(T.SETLISTS[sl].label) + '</button>').join('') +
        '</div>' +
        '<div style="font-size:.7rem;color:var(--ink-dim);margin-bottom:10px">Legs run ' + T.legWeeks + ' weeks each. Punishing pacing is cheaper and costs the humans; humane costs money. The hits sell, new material seeds the next era, fan service builds devotion. Production: ' + cost + '.</div>' +
        '<button class="btn primary" style="width:100%" data-action="tour-book"' + (td.legs.length ? '' : ' disabled') + '>Book the tour · ' + cost + '</button>' +
        '</div>');
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
      (r.chartPeak != null ? '<span class="chip cool">scene #' + r.chartPeak + '</span>' : '') +
      (r.nationalPeak != null ? '<span class="chip gold">national #' + r.nationalPeak + '</span>' : '') +
      (r.battle ? '<span class="chip ' + (r.battle.won ? 'gold' : 'hot') + '">' +
        (r.battle.won ? 'took the week vs ' : 'lost the week to ') + UI.esc(r.battle.actName) + '</span>' : '') +
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
