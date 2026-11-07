/* Industry tab (v0.4.0): three rooms — the Scene (companies and their
   acts), the Chart (this week's positions), and the Feed (the fans,
   verbatim). Plus the new-career intro screen. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};
  const UI = KP.UI;

  UI.renderIndustry = function (state, sub, chartWhich) {
    sub = sub || 'scene';
    // the fandom is a filter on the feed now (v0.10.41, §89 D15)
    const fandom = sub === 'fandom' || !!(KP.App && KP.App.feedFilter === 'fandom');
    if (sub === 'fandom') sub = 'feed';
    const html = [];
    html.push('<div class="pad" style="margin-top:2px"><div class="seg">' +
      '<button class="' + (sub === 'scene' ? 'on' : '') + '" data-action="industry-sub" data-sub="scene">Scene</button>' +
      '<button class="' + (sub === 'chart' ? 'on' : '') + '" data-action="industry-sub" data-sub="chart">Charts</button>' +
      '<button class="' + (sub === 'feed' ? 'on' : '') + '" data-action="industry-sub" data-sub="feed">Feed</button>' +
      '</div></div>');
    if (sub === 'chart') html.push(renderChart(state, chartWhich));
    else if (sub === 'feed') html.push(renderFeed(state, fandom));
    else html.push(renderScene(state));
    return html.join('');
  };

  // ---- Fandom (owner request: "what our biggest fans are saying — for
  // a sense of community"): the adopted accounts, and the home-crowd
  // slice of the timeline (our devoted regulars + the stans)
  function renderFandom(state) {
    const html = [];
    const groups = KP.groups(state).filter(g => g.debuted);
    groups.forEach(g => {
      if (g.fandom) {
        html.push('<div class="card"><b>' + UI.esc(g.fandom.name) + '</b> · ' + UI.esc(g.name) + '’s people' +
          '<div style="font-size:.78rem;color:var(--ink-dim);margin-top:4px">' +
          UI.esc(KP.intensityWord(g.fandom.intensity)) + ' · they were here before the numbers and they will be here after</div></div>');
      }
    });
    const cast = state.feedCast || {};
    const adopted = Object.entries(cast).filter(([h, c]) => c.biasId && state.people[c.biasId]);
    if (adopted.length) {
      html.push('<div class="kicker">The devoted</div>');
      adopted.forEach(([handle, c]) => {
        const p = state.people[c.biasId];
        html.push('<div class="card" style="padding:12px"><b>' + UI.esc(handle) + '</b>' +
          '<div style="font-size:.8rem;color:var(--ink-dim);margin-top:3px">' +
          UI.esc(KP.displayName(p)) + '’s account since ' + UI.esc(KP.weekLabel(c.since).text) +
          ' · the kind of fan every career needs exactly one hundred of</div></div>');
      });
    }
    // the home-crowd timeline: adopted handles + the stan register
    const handles = new Set(adopted.map(([h]) => h));
    const ours = (state.feed || []).filter(post =>
      (post.handle && handles.has(post.handle)) || post.persona === 'stan').slice(0, 25);
    html.push('<div class="kicker">From the barricade</div>');
    if (ours.length) {
      ours.forEach(p => {
        html.push('<div class="feed-post">' +
          '<div class="fp-head"><span class="fp-handle">@' + UI.esc(p.handle) + '</span>' +
          (p.persona ? '<span class="fp-persona ' + UI.esc(p.persona) + '">' + UI.esc(PERSONA_LABELS[p.persona] || p.persona) + '</span>' : '') +
          '<span class="fp-week">' + UI.esc(KP.weekLabel(p.week).text) + '</span></div>' +
          (p.quotes ? '<div class="fp-text" style="color:var(--ink-dim);font-size:.72rem">\u21b3 quoting @' + UI.esc(p.quotes) + '</div>' : '') +
        '<div class="fp-text">' + UI.esc(p.text) + '</div>' +
          '<div class="fp-likes">♥ ' + formatLikes(p.likes) + '</div>' +
          '</div>');
      });
    } else {
      html.push('<div class="card" style="color:var(--ink-dim);font-style:italic">Quiet in the fan cafés this week. Debut somebody. Give them a reason.</div>');
    }
    return html.join('');
  }

  // ---- Scene -----------------------------------------------------------
  function renderScene(state) {
    const html = [];
    // the sound of the year (v0.10.34): what the trades named in January
    if (KP.trendOf) {
      const t = KP.trendOf(state);
      html.push('<div class="card" style="padding:10px 14px;font-size:.8rem"><b>The sound of the year:</b> ' + UI.esc(t.label) +
        '<span style="color:var(--ink-dim)"> · ' + (t.years > 1 ? t.years + ' years running' : 'named this January') +
        ' · a record in the lane rides the wind; a record against it has to be the argument</span></div>');
    }
    html.push('<div class="kicker">Your company</div>');
    html.push('<div class="card rival-card">' +
      '<div class="rv-name">' + UI.esc(state.company.name) + '</div>' +
      '<div class="rv-phil">' + repHeadline(state.company.reputation) + '</div>' +
      '<div class="rv-blurb">' + UI.esc(state.company.blurb || KP.DATA.playerCompany.reputationLine) + '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">' + repChips(state.company.reputation) + '</div>' +
      (KP.fameWord
        ? '<div style="font-size:.72rem;color:var(--ink-dim);margin-top:8px">Public profile: ' +
          UI.esc(KP.fameWord(state)) +
          (KP.showsOpen && !KP.showsOpen(state)
            ? ' · <span style="color:var(--magenta)">the music shows do not return the calls yet</span>' : '') + '</div>'
        : '') +
      (state.founded && state.board
        ? '<div style="font-size:.72rem;color:var(--ink-dim);margin-top:8px">The board: ' +
          state.board.seats.map(s => UI.esc(s.name) + ' <span style="opacity:.7">(' + UI.esc(s.role) + ')</span>').join(' · ') + '</div>'
        : '') +
      // the company's own history (v0.11.5, §96 wiring): the chair's tenure,
      // the first trophy, the chapters and the labels before this one —
      // fields the engine kept and no page read
      '<div style="font-size:.72rem;color:var(--ink-dim);margin-top:8px">' + UI.esc(state.executive.name) + ', in the chair since ' +
      UI.esc(KP.weekLabel(state.executive.since || 1).text) +
      (state.firstShowWinWeek
        ? ' · first trophy ' + UI.esc(KP.weekLabel(state.firstShowWinWeek).text) + (state.firstShowWinWeek < 1 ? ' — the inherited act’s' : '')
        : '') + '</div>' +
      ((state.career || []).length
        ? '<div style="font-size:.72rem;color:var(--ink-dim);margin-top:6px">The chapters:' + state.career.map(ch =>
            '<div>' + UI.esc(KP.weekLabel(ch.week).text) + ' — ' + UI.esc(ch.from || 'the last label') + ' closed · ' +
            UI.esc(((CHAPTER_DOORS[ch.door] || {}).title || ch.door || 'a door').toLowerCase()) + ' · ' + UI.esc(ch.to || state.company.short) + '</div>').join('') + '</div>'
        : '') +
      (((state.estate || {}).folded || []).length
        ? '<div style="font-size:.72rem;color:var(--ink-dim);margin-top:6px">Labels before this one: ' +
          state.estate.folded.map(f => UI.esc(f.name || f.short || '')).join(', ') + '</div>'
        : '') +
      '</div>');

    // the power ranking + the generation (v0.9.24): the scene, scored
    if (state.powerRanking && state.powerRanking.entries) {
      const pr = state.powerRanking;
      // the reveal law (v0.11.5, §96 wiring): the score column went — rank
      // and the arrows carry the read; the number was a hidden truth in digits
      const rows = pr.entries.map(e =>
        '<div style="display:flex;justify-content:space-between;font-size:.82rem;padding:3px 0' +
        (e.isPlayer ? ';color:var(--gold);font-weight:600' : '') + '">' +
        '<span>#' + e.rank + ' ' + UI.esc(e.short) +
        (e.delta > 0 ? ' <span style="color:var(--cyan)">▲' + e.delta + '</span>'
          : e.delta < 0 ? ' <span style="color:var(--magenta)">▼' + Math.abs(e.delta) + '</span>' : '') +
        '</span></div>').join('');
      html.push('<div class="kicker">The power ranking · Yr ' + pr.year +
        (state.gen ? ' · the ' + state.gen.n + (state.gen.n === 3 ? 'rd' : 'th') + ' generation' : '') + '</div>');
      html.push('<div class="card">' + rows + '</div>');
    }

    // the season (v0.10.32, §90 B; televised v0.11.4, §95): the show the
    // whole world sent people to — the board, the line, the mission, the
    // pick, and the doors for whoever is ours
    if (state.season && (state.season.status !== 'done' || state.week - state.season.finaleWeek <= 4)) {
      const s = state.season;
      const S = KP.C.COMPETITION;
      const board = KP.seasonBoard(state);
      const line = KP.seasonLine(state);
      const mission = KP.seasonMission(state);
      const oursAll = s.contestants.filter(c => c.source === 'player').map(c => {
        const p = state.people[c.personId];
        return p ? UI.esc(KP.displayName(p)) + (c.eliminatedWeek ? (c.rank && c.rank <= S.lineupSize ? ' — the lineup' : c.withdrawn ? ' — withdrawn week ' + (c.eliminatedWeek - s.startWeek) : ' — out week ' + (c.eliminatedWeek - s.startWeek) + (c.rank ? ', ' + KP.ordinal(c.rank) : '')) : '') : null;
      }).filter(Boolean);
      html.push('<div class="kicker">The season</div>');
      html.push('<div class="card"><b>' + UI.esc(s.show) + '</b> · ' + (s.gender === 'm' ? 'boys’' : 'girls’') + ' season · ' +
        (s.status === 'casting' ? 'casting' : s.status === 'airing' ? 'episode ' + (state.week - s.startWeek) + ' of ' + (s.finaleWeek - s.startWeek) : 'the finale aired' + (s.permanent != null ? (s.permanent ? ' — the lineup is PERMANENT' : ' — a project run') : '')) +
        (s.status === 'airing' && mission ? '<div style="font-size:.75rem;color:var(--ink-dim);margin-top:4px">This week: ' + UI.esc(mission) + (line ? ' · the line falls at ' + KP.ordinal(line) : '') +
          (s.fanPick && state.people[s.fanPick] ? ' · the public’s pick: ' + UI.esc(KP.displayName(state.people[s.fanPick])) : '') + '</div>' : '') +
        (s.status === 'done'
          ? '<div style="font-size:.75rem;color:var(--ink-dim);margin-top:4px">' + s.contestants.filter(c => c.rank && c.rank <= S.lineupSize).sort((a, b) => a.rank - b.rank).map(c => state.people[c.personId] ? KP.ordinal(c.rank) + ' ' + UI.esc(KP.displayName(state.people[c.personId])) : '').filter(Boolean).join(' · ') + '</div>'
          : board.length
            ? '<div style="font-size:.78rem;margin-top:6px;line-height:1.7">' + board.filter((row, i) => i < 8 || row.ours).map(row => {
                const move = row.prev == null || row.rank == null ? '' : row.rank < row.prev ? ' <span style="color:var(--gold)">▲' + (row.prev - row.rank) + '</span>' : row.rank > row.prev ? ' <span style="color:var(--danger,#e05a5a)">▼' + (row.rank - row.prev) + '</span>' : ' <span style="color:var(--ink-dim)">—</span>';
                const onLine = line && row.rank && row.rank > line;
                return '<div' + (row.ours ? ' style="color:var(--gold)"' : onLine ? ' style="color:var(--ink-dim)"' : '') + '>' + (row.rank ? KP.ordinal(row.rank) : '—') + ' ' + UI.esc(KP.displayName(row.p)) + ' <span style="color:var(--ink-dim)">· ' + UI.esc(row.company) + '</span>' + move + (row.ours ? ' · ours' : '') + '</div>';
              }).join('') + (board.length > 8 ? '<div style="color:var(--ink-dim)">… ' + board.length + ' still in</div>' : '') + '</div>'
            : '<div style="font-size:.75rem;color:var(--ink-dim);margin-top:4px">the cast is in; the first ranking reveal airs next week</div>') +
        (oursAll.length ? '<div style="margin-top:6px;color:var(--gold);font-size:.78rem">' + oursAll.join(' · ') + '</div>' : '') +
        (s.status === 'airing' ? KP.seasonOurs(state).filter(c => !c.eliminatedWeek).map(c => {
            const p = state.people[c.personId];
            const push = KP.seasonPushRead(state, p.id), coach = KP.seasonCoachRead(state, p.id);
            return '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' +
              '<button class="btn small" data-action="season-push" data-id="' + p.id + '"' + (push.ok ? '' : ' disabled') + ' title="' + UI.esc(push.ok ? '' : push.reason) + '">Vote push · ' + S.pushCost + (push.ok ? ' (' + push.left + ' left)' : '') + '</button>' +
              '<button class="btn small" data-action="season-coach" data-id="' + p.id + '"' + (coach.ok ? '' : ' disabled') + ' title="' + UI.esc(coach.ok ? '' : coach.reason) + '">Send the coach · ' + S.coachCost + '</button>' +
              '<button class="btn small danger" data-action="season-withdraw" data-id="' + p.id + '">Withdraw ' + UI.esc(KP.publicGiven(p)) + '</button>' +
              '</div>';
          }).join('') : '') +
        '</div>');
    }

    // the open market lane folded into the scouting board (v0.10.33, §89 D7):
    // a collapse's careers are files on the board like every castoff

    // the sagas' standing arrangements (v0.9.31): the pact and the fund
    if (state.jv && state.week <= state.jv.until) {
      html.push('<div class="kicker">The pact</div>');
      html.push('<div class="card"><b>' + UI.esc(state.jv.partner) + '</b> · the co-build' +
        '<div style="font-size:.75rem;color:var(--ink-dim);margin-top:4px">Worldwide auditions on their money — an annual class on the board. ' +
        'Their split abroad: ' + Math.round(state.jv.share * 100) + '% of overseas touring. Runs ' +
        Math.max(0, Math.ceil((state.jv.until - state.week) / KP.C.WEEKS_PER_YEAR * 10) / 10) + ' more years.</div></div>');
    }
    if (state.secondCapital && state.week <= state.secondCapital.until) {
      html.push('<div class="kicker">The second capital</div>');
      html.push('<div class="card"><b>' + UI.esc(state.secondCapital.name) + '</b> · ' +
        UI.esc(KP.regionLabel(state.secondCapital.region)) +
        '<div style="font-size:.75rem;color:var(--ink-dim);margin-top:4px">Touring there pays a premium, auditions run subsidized, releases travel with the wind at their back. ' +
        'The fund runs through ' + UI.esc(KP.weekLabel(state.secondCapital.until).text) + ' — the harvest belongs to whoever plants.</div></div>');
    }

    // what the world remembers about us (v0.6.0; rival stories moved to
    // their own cards in v0.6.1)
    const conversation = KP.playerNarratives(state);
    if (conversation.length) {
      html.push('<div class="kicker">The conversation</div>');
      html.push('<div class="card">' + UI.narrativeLines(state, conversation) + '</div>');
    }

    html.push('<div class="kicker">The other companies</div>');
    (state.rivals || []).forEach(r => {
      const interested = Object.keys(r.interest || {}).length;
      const activeActs = (r.acts || []).filter(a => !a.retired);
      const actLines = activeActs.map(a =>
        '<div class="rv-act tappable" data-action="open-rivalact" data-id="' + UI.esc(a.id || '') + '">' +
        '<span class="rv-act-name">' + UI.esc(a.name) +
        (a.gen ? ' <span style="font-size:.62rem;color:var(--ink-dim)">gen ' + a.gen + '</span>' : '') +
        (a.servicePause ? ' <span style="font-size:.62rem;color:var(--magenta)">in service</span>'
          : a.serviceRotation ? ' <span style="font-size:.62rem;color:var(--magenta)">rotation</span>' : '') + '</span>' +
        '<span class="rv-act-note">' + KP.popularityWord(a.popularity) + ' fanbase · ' +
        (a.members || []).length + ' members · ' +
        (a.releases || []).length + ' release' + ((a.releases || []).length === 1 ? '' : 's') + ' ›</span></div>').join('');
      const moves = (r.recentMoves || []).slice(-2).reverse().map(m =>
        '<span class="chip">' + UI.esc(m) + '</span>').join('');
      // what the world says about THEM (v0.6.1)
      const rNars = KP.narrativesFor(state, 'rivalCompany', r.short)
        .concat((r.acts || []).flatMap(a => KP.narrativesFor(state, 'rivalAct', a.id)));
      const casting = r.nextDebutWeek != null &&
        state.week >= r.nextDebutWeek - KP.C.SCOUT.rivalHungerWindow;
      html.push('<div class="card rival-card">' +
        '<div class="rv-name">' + UI.esc(r.name) + '</div>' +
        '<div class="rv-phil">' + philWord(r.philosophy) + ' · ' + prestigeWord(r.prestige) +
        (KP.rivalEra ? ' · <span style="color:' +
          ({ imperial: 'var(--gold)', rising: 'var(--cyan)', fading: 'var(--magenta)' }[KP.rivalEra(state, r)] || 'var(--ink-dim)') +
          '">' + KP.eraWord(KP.rivalEra(state, r)) + '</span>' : '') +
        (casting ? ' · <span style="color:var(--magenta)">casting a new group</span>' : '') +
        (r.bankroll && state.week <= r.bankroll.until
          ? ' · <span style="color:var(--gold)">the money is real</span>' : '') + '</div>' +
        '<div class="rv-blurb">' + UI.esc(r.blurb || '') + '</div>' +
        (rNars.length ? UI.narrativeLines(state, rNars.slice(0, 2)) : '') +
        // what they remember of you (v0.11.5, §96 wiring): the offer's two
        // answers, recorded on the rival by the offer scene, read here
        (r.offerLeveraged || r.offerDeclined
          ? '<div style="font-size:.72rem;color:var(--ink-dim);margin-top:6px">' +
            (r.offerLeveraged ? 'Remembers the letter you put on the board’s table.' : '') +
            (r.offerLeveraged && r.offerDeclined ? ' ' : '') +
            (r.offerDeclined ? 'Sent an offer once; you declined with the good stationery.' : '') + '</div>'
          : '') +
        (actLines ? '<div class="rv-acts">' + actLines + '</div>'
          : '<div class="rv-acts"><div class="rv-act"><span class="rv-act-note">No active act — the trainee floor is all they have.</span></div></div>') +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">' +
        (function () {   // the floor (v0.10.31, §90 A): the trainee room is PEOPLE
          const floor = KP.rivalFloor(state, r).sort((a, b) => KP.peakOf(b) - KP.peakOf(a));
          const top = floor.slice(0, 3).map(p => UI.esc(KP.displayName(p)) +
            (p.flags.lostToRival ? '<span class="rv-act-note"> (once on our board)</span>' : '') +
            (p.releasedFrom === state.company.short ? '<span class="rv-act-note"> (left this building)</span>' : ''));
          return '<span class="chip">' + floor.length + ' trainees' + (top.length ? ' · ' + top.join(', ') + (floor.length > 3 ? ', …' : '') : '') + '</span>';
        })() +
        (interested ? '<span class="chip hot">tracking ' + interested + ' of your leads</span>' : '') +
        moves +
        '</div></div>');
    });

    return html.join('');   // "The wire" went (§89 C): the inbox is the inbox
  }

  // ---- Chart -----------------------------------------------------------
  function renderChart(state, which) {
    const html = [];
    const national = which === 'national';
    html.push('<div class="pad" style="margin-top:2px"><div class="seg">' +
      '<button class="' + (!national ? 'on' : '') + '" data-action="industry-chart" data-chart="scene">Scene</button>' +
      '<button class="' + (national ? 'on' : '') + '" data-action="industry-chart" data-chart="national">National</button>' +
      '</div></div>');
    const entries = national
      ? KP.nationalPositions(state).slice(0, KP.C.NATIONAL.showTop)
      : KP.chartPositions(state).slice(0, KP.C.CHART.showTop);
    html.push('<div class="kicker">' + (national ? 'The national chart' : 'The scene chart') +
      ' · ' + UI.esc(KP.weekLabel(state.week).text) + '</div>');
    if (!entries.length) {
      html.push('<div class="card" style="color:var(--ink-dim);font-size:.85rem">A quiet week on the charts. Someone will fix that — the only question is whose logo is on the album.</div>');
      return html.join('');
    }
    html.push('<div class="card" style="padding:6px 0">');
    entries.forEach((e, i) => {
      const pos = i + 1;
      let move;
      if (e.lastPos == null) move = '<span class="cr-move new">NEW</span>';
      else if (e.lastPos > pos) move = '<span class="cr-move up">▲' + (e.lastPos - pos) + '</span>';
      else if (e.lastPos < pos) move = '<span class="cr-move down">▼' + (pos - e.lastPos) + '</span>';
      else move = '<span class="cr-move">—</span>';
      html.push('<div class="chart-row' + (e.isPlayer ? ' mine' : '') + '">' +
        '<span class="cr-pos">' + pos + '</span>' +
        '<div class="cr-body"><div class="cr-title">' + UI.esc(e.title) + '</div>' +
        '<div class="cr-act">' + UI.esc(e.act) + ' · ' + UI.esc(e.company) +
        (e.isPlayer ? ' <span class="chip gold" style="margin-left:4px">yours</span>' : '') +
        (e.bside ? ' <span class="chip" style="margin-left:4px">b-side</span>' : '') +            // §92 B+C
        (e.catalog ? ' <span class="chip cool" style="margin-left:4px">reverse run</span>' : '') +   // §92 D
        (e.shelf ? ' <span class="chip" style="margin-left:4px">a folded label’s</span>' : '') + '</div></div>' +
        move +
        '<span class="cr-weeks">' + (e.weeksOn || 0) + 'w</span>' +
        '</div>');
    });
    html.push('</div>');
    html.push('<div class="pad" style="font-size:.72rem;color:var(--ink-faint);line-height:1.5">' +
      (national
        ? 'The whole industry — titans, legacy fandoms, arena tours. The scene fights for the middle of this board. National peaks live in each discography beside the scene peak.'
        : 'Your lane: the companies you actually trade blows with. Every release enters on impact and cools week by week; discography peaks are this chart’s truth.') +
      '</div>');
    return html.join('');
  }

  // ---- Rival act page (v0.4.3): the competition, viewable ---------------
  UI.renderRivalAct = function (state, actId) {
    const hit = KP.rivalActById(state, actId);
    if (!hit) return '<div class="card">That group is no longer on the desk’s files.</div>';
    const a = hit.act, r = hit.rival;
    const concept = KP.conceptById(a.concept);
    const debutLabel = a.debutWeek >= 1 ? KP.weekLabel(a.debutWeek).text : 'before your time';
    const html = [];
    html.push('<div class="group-hero"><div class="g-status">' + UI.esc(r.name) + '</div>' +
      '<div class="g-name" style="font-size:clamp(1.9rem,10vw,2.8rem)">' + UI.esc(a.name) + '</div>' +
      '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px">' +
      (concept ? '<span class="chip cool">' + UI.esc(concept.label) + '</span>' : '') +
      (a.retired ? '<span class="chip hot">disbanded</span>'
        : '<span class="chip">' + KP.popularityWord(a.popularity) + ' fanbase</span>') +
      '<span class="chip">since ' + UI.esc(debutLabel) + '</span>' +
      (a.announcedWeek && a.announcedWeek >= state.week
        ? '<span class="chip clash">comeback · ' + UI.esc(KP.weekLabel(a.announcedWeek).text) + '</span>' : '') +
      ((a.showWins || 0) > 0 ? '<span class="chip gold">' + a.showWins + ' show win' + (a.showWins === 1 ? '' : 's') + '</span>' : '') +
      '</div></div>');

    // the scoreboard (v0.6.4): shared release weeks, counted forever
    const feuds = KP.groups(state).filter(g => g.feuds && g.feuds[a.id]);
    if (feuds.length) {
      html.push('<div class="kicker">The scoreboard</div>');
      feuds.forEach(g => {
        const f = g.feuds[a.id];
        html.push('<div class="note">' + UI.esc(g.name) + ' vs ' + UI.esc(a.name) + ': ' +
          f.wins + '–' + f.losses + ' on shared release weeks' +
          (f.wins === f.losses ? ' — dead even, which nobody finds satisfying.'
            : f.wins > f.losses ? '. We lead. They know.' : '. They lead. We know.') +
          '<span class="n-who">— the recap channels, keeping score</span></div>');
      });
    }

    // the world's story about this act (v0.6.1)
    const aNars = KP.narrativesFor(state, 'rivalAct', a.id)
      .concat(KP.narrativesFor(state, 'rivalCompany', r.short));
    if (aNars.length) {
      html.push('<div class="kicker">The story</div>');
      html.push('<div class="card">' + UI.narrativeLines(state, aNars) + '</div>');
    }

    const members = (a.members || []).map(id => state.people[id]).filter(Boolean);
    if (members.length) {
      html.push('<div class="kicker">Members</div>');
      html.push('<div class="member-strip">');
      members.forEach(m => {
        const fromBoard = !m.flags.rivalNative;
        html.push('<div class="member-cell">' +
          UI.portrait(m, 'md') +
          '<div class="mc-name">' + UI.esc(m.name.stage || m.name.given) + '</div>' +
          '<div class="mc-role">' + m.age + ' · ' + KP.fmtCount(KP.socialOf(state, m)) +
          (fromBoard ? ' · was on your board' : '') + '</div></div>');
      });
      html.push('</div>');
      const lost = members.filter(m => !m.flags.rivalNative);
      if (lost.length) {
        html.push('<div class="note">' + UI.esc(lost.map(m => KP.displayName(m)).join(' and ')) +
          (lost.length === 1 ? ' was' : ' were') + ' on our scouting board once. ' + UI.esc(r.short) +
          ' moved faster. Worth remembering how that felt.<span class="n-who">— ' + UI.esc(KP.scoutName(state)) + ', in passing</span></div>');
      }
    }

    const rels = (a.releases || []).slice().reverse();
    if (rels.length) {
      html.push('<div class="kicker">Discography</div>');
      rels.forEach(rel => {
        html.push('<div class="mail"><span class="m-tag">' + (rel.isDebut ? 'debut' : 'single') + '</span>' +
          '<div style="flex:1">“' + UI.esc(rel.title) + '” — ' + receptionWord(rel.reception) +
          '<span class="m-week">' + UI.esc(KP.weekLabel(Math.max(1, rel.week)).text) + '</span></div></div>');
      });
    }
    return html.join('');
  };
  function receptionWord(v) {
    return v >= 75 ? 'a sensation' : v >= 64 ? 'a hit' : v >= 48 ? 'held its own' : v >= 35 ? 'quiet' : 'a miss';
  }

  // ---- Feed ------------------------------------------------------------
  const ACTION_LABELS = { statement: 'Issue statement', apology: 'Apologize',
    legal: 'Legal threat', meme: 'Lean into the meme', livestream: 'Member livestream' };
  const PERSONA_LABELS = { fan: 'fan', stan: 'stan', casual: 'casual', anti: 'anti', press: 'press' };

  function renderFeed(state, fandom) {
    const html = [];
    // the filter (v0.10.41, §89 D15): everyone, or the barricade — the
    // adopted accounts and the stan register, the old Fandom tab
    html.push('<div class="pad" style="margin-top:4px"><div class="seg">' +
      '<button class="' + (!fandom ? 'on' : '') + '" data-action="feed-filter" data-filter="all">Everyone</button>' +
      '<button class="' + (fandom ? 'on' : '') + '" data-action="feed-filter" data-filter="fandom">The barricade</button>' +
      '</div></div>');

    // trending storms first (v0.6.2) — the interactive part
    const live = KP.liveDiscourses(state);
    if (live.length) {
      html.push('<div class="kicker">Trending</div>');
      live.forEach(d => {
        const spec = KP.C.DISCOURSE.KINDS[d.kind];
        html.push('<div class="card disc-card' + (d.negative ? ' neg' : ' pos') + '">' +
          '<div class="disc-head">' + UI.esc(spec.label).toUpperCase() +
          ' · <span class="disc-heat">' + UI.esc(KP.heatWord(d.heat)) + '</span></div>' +
          '<div class="disc-text">' + UI.esc(KP.discourseHeadline(state, d)) + '</div>' +
          (d.responded
            ? '<div class="disc-done">The company has spoken. The internet decides what that meant.</div>'
            : '<div class="disc-actions">' +
              spec.actions.map(a => '<button class="btn small" data-action="discourse-respond" data-id="' +
                d.id + '" data-move="' + a + '">' + ACTION_LABELS[a] + '</button>').join('') +
              '</div>' +
              '<div class="disc-hint">Or say nothing — some stories die on their own. Some don’t.</div>') +
          '</div>');
      });
    }

    if (fandom) { html.push(renderFandom(state)); return html.join(''); }
    html.push('<div class="kicker">The fan feed</div>');
    const posts = state.feed || [];
    if (!posts.length) {
      html.push('<div class="card" style="color:var(--ink-dim);font-size:.85rem">The forums are quiet. Debut someone and they will never be quiet again.</div>');
      return html.join('');
    }
    posts.forEach(p => {
      html.push('<div class="feed-post">' +
        '<div class="fp-head"><span class="fp-handle">@' + UI.esc(p.handle) + '</span>' +
        (p.persona ? '<span class="fp-persona ' + UI.esc(p.persona) + '">' + UI.esc(PERSONA_LABELS[p.persona] || p.persona) + '</span>' : '') +
        '<span class="fp-week">' + UI.esc(KP.weekLabel(p.week).text) + '</span></div>' +
        (p.quotes ? '<div class="fp-text" style="color:var(--ink-dim);font-size:.72rem">\u21b3 quoting @' + UI.esc(p.quotes) + '</div>' : '') +
        '<div class="fp-text">' + UI.esc(p.text) + '</div>' +
        '<div class="fp-likes">♥ ' + formatLikes(p.likes) + '</div>' +
        '</div>');
    });
    return html.join('');
  }
  function formatLikes(n) {
    n = n || 0;
    return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
  }

  function philWord(p) {
    return { trendChaser: 'Trend chasers', performance: 'Performance monsters',
      patient: 'Patient developers', hungry: 'Hungry newcomers' }[p] || p;
  }
  function prestigeWord(v) {
    return v >= 70 ? 'powerhouse' : v >= 55 ? 'established' : v >= 40 ? 'mid-tier' : 'scrappy';
  }
  function repHeadline(rep) {
    const best = Object.entries(rep).sort((a, b) => b[1] - a[1])[0];
    // a fresh label has no headline yet — nothing above "noted" means
    // the market has no word for you (0.9.28.1, the fresh door)
    if (!best || best[1] < 40) return 'Unproven label';
    return { vocal: 'Vocal powerhouse', girlGroup: 'Girl group factory', starMaker: 'Star makers', performance: 'Performance house' }[best[0]] || 'Mid-tier label';
  }
  function repChips(rep) {
    const words = v => v >= 70 ? 'renowned' : v >= 55 ? 'respected' : v >= 40 ? 'noted' : 'unproven';
    return [
      '<span class="chip cool">vocals: ' + words(rep.vocal || 0) + '</span>',
      '<span class="chip">girl groups: ' + words(rep.girlGroup || 0) + '</span>',
      '<span class="chip">star-making: ' + words(rep.starMaker || 0) + '</span>',
    ].join('');
  }

  // ---- title screen (v0.5.1): the front door ---------------------------
  UI.renderTitle = function (meta) {
    const html = [];
    html.push('<div class="nc-wrap title-wrap">' +
      '<div class="title-mark">HCG</div>' +
      '<div class="title-name">K-POP<br>AGENCY<br>MANAGER</div>' +
      '<div class="title-sub">talent development division · build ' + KP.C.VERSION + '</div>');
    if (meta) {
      html.push('<button class="btn primary title-btn" data-action="title-continue">Continue' +
        '<span class="tb-meta">' + UI.esc(meta.label) + ' · v' + UI.esc(meta.version) + '</span></button>');
    }
    html.push('<button class="btn title-btn" data-action="title-new">New career</button>');
    html.push('<button class="btn title-btn" data-action="title-import">Import save</button>');
    html.push('<div class="title-foot">Careers autosave every week. Export lives in the in-game System menu.</div>');
    html.push('</div>');
    return html.join('');
  };

  // ---- new career ------------------------------------------------------
  // the three doors (v0.9.28, §69): which company you choose to run
  const DOORS = {
    fresh: { title: 'The fresh label', chips: '<span class="chip">no history</span><span class="chip cool">founding class of six</span><span class="chip hot">payroll is burning</span>',
      quote: '“No history means no bad habits. Build the first thing this label is ever known for.”',
      copy: 'A lease, a logo, and a practice room that still smells of paint. No catalog, no legacy group, no cushion — six trainees, a thin budget, and eighteen months to put a girl group on a stage. Startups debut as fast as they can, because they have to.' },
    current: { title: 'The inheritance', chips: '<span class="chip cool">vocal powerhouse</span><span class="chip">mid-sized</span><span class="chip hot">6 years without a girl-group hit</span>',
      copy: 'You inherit the last group — four vocalists in year six of their contracts, still selling, visibly slowing — plus six trainees and a scouting board the rivals are already reading. Their renewal folders reach your desk before your first debut does. The deadline is eighteen months.' },
    major: { title: 'The major', chips: '<span class="chip gold">top-three house</span><span class="chip cool">two flagships mid-era</span><span class="chip hot">everything to lose</span>',
      quote: '“Everything in this building works. Your job is to keep that true — and to know when the generation turns.”',
      copy: 'The infrastructure is in place: a girl-group flagship, a boy-group flagship, a deep bench, real money — and the doctrine active from day one. New groups come once a generation here. The game is stewardship: the clocks, the renewals, the overtake to defend. A major has everything, which is exactly the problem.' },
    blank: { title: 'The blank page', chips: '<span class="chip">name your own company</span><span class="chip cool">empty practice rooms</span><span class="chip hot">hard mode</span>',
      quote: '“The money is real and the patience is finite. Show us why you needed your own name on the door.”',
      copy: 'Registered last month: no trainees, no catalog, no reputation — a name you choose and a seed round you answer for, to a board with three seats and a runway chart. The recruits everyone wants will not take your calls yet; you build from the overlooked until the ranking says otherwise, and the first time a holdout calls YOU back, you will know exactly what it cost.' },
  };
  UI.renderNewCareer = function (door) {
    door = door || 'current';
    const d = DOORS[door];
    const card = k => '<button class="btn small' + (k === door ? ' primary' : ' ghost') + '" style="flex:1 1 46%' +
      (k === door ? '' : ';border:1px solid var(--line)') + '" data-action="pick-door" data-door="' + k + '">' + DOORS[k].title + '</button>';
    return '<div class="nc-wrap">' +
      '<div style="margin-bottom:10px"><button class="btn small" data-action="title-back">‹ Title</button></div>' +
      '<div class="d-label">New career</div>' +
      '<div class="nc-co">' + (door === 'blank' ? 'Your Name<br>Here' : 'Hanseong<br>Culture Group') + '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 4px">' + card('fresh') + card('current') + card('major') + card('blank') + '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 2px">' + d.chips + '</div>' +
      '<div class="nc-quote">' + (d.quote || '“I don’t need five perfect trainees. I need one group people remember.”') + '</div>' +
      '<div class="nc-p">' + d.copy + '</div>' +
      (door === 'blank'
        ? '<label style="font-size:.68rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-dim)">Company name</label>' +
          '<input class="nc-input" id="nc-company" placeholder="Paper Label" maxlength="28">'
        : '') +
      (door === 'blank' || door === 'fresh'
        ? '<label style="font-size:.68rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-dim)">Home city <span style="color:var(--ink-faint)">(§76 B — the regional founding)</span></label>' +
          '<select class="nc-input" id="nc-city">' +
          '<option value="seoul">Seoul — the capital, full price, full gravity</option>' +
          '<option value="busan">Busan — the second city: a real scene, a fair discount</option>' +
          '<option value="incheon">Incheon — Seoul without the address: full price, plus the train</option>' +
          '<option value="daegu">Daegu — the deep discount, at the far end of the line</option>' +
          '<option value="gwangju">Gwangju — the arts city: cheap, remote, a school with a name</option>' +
          '<option value="daejeon">Daejeon — the rail hub: mid price, everything an hour away</option>' +
          '</select>' +
          '<div style="font-size:.66rem;color:var(--ink-dim);line-height:1.5;margin-top:2px">Every address is a trade — rent and rooms against the pull of the capital circuit. Wherever you land, the local academy is a walk, not a train.</div>'
        : '') +
      '<label style="font-size:.68rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-dim)">Your name</label>' +
      '<input class="nc-input" id="nc-name" placeholder="A&R Manager" maxlength="24">' +
      '<label style="font-size:.68rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-dim)">World seed <span style="color:var(--ink-faint)">(optional)</span></label>' +
      '<input class="nc-input" id="nc-seed" placeholder="random">' +
      '<button class="btn primary" style="width:100%;margin-top:8px" data-action="start-career">Take the job</button>' +
      '</div>';
  };

  // ---- the epilogue (v0.11.0, §86): the last statement, then the doors ----
  // NOT a fail screen; an accounting — what you built, who you built,
  // where they all went — and what the career earned next, in the same
  // world. The locked doors say why, in words.
  const CHAPTER_DOORS = {
    salaried: { title: 'The salaried chapter',
      chips: '<span class="chip">someone else’s name on the door</span><span class="chip cool">their roster, their act</span><span class="chip hot">trust starts low</span>',
      quote: '“I read your file. All of it. The job is yours if you want to be humbled by it.”',
      copy: 'A small label with a lease, a half-built roster, an aging act, and an exec who read your last statement and hired you anyway. You run their situation, not yours — three signings on a short leash, eighteen months, and a building that will decide what you are worth by the quarter.' },
    investor: { title: 'The investor’s call',
      chips: '<span class="chip gold">a fund you never burned</span><span class="chip">a war chest</span><span class="chip hot">a hand on the label from day one</span>',
      quote: '“We watched you keep a covenant once. That is rarer than a hit. Here is the money, and here is the chair we keep.”',
      copy: 'The kept covenants were a reputation, and a reputation is a phone call. A fund backs a NEW label around you — the money arrives with its hand already on the label: a board seat or the toll, pre-installed, from the first Monday. Funded founding is the blank page with a landlord.' },
    protege: { title: 'The protégé’s door',
      chips: '<span class="chip gold">someone you built brings you in</span><span class="chip cool">the host’s bench</span><span class="chip">their name beside yours</span>',
      quote: '“You answered the door every time I knocked. My turn.”',
      copy: 'Someone you developed got big enough on the other side of the wall to have an opinion about where you go next — and said it out loud, to her company. The house hosts the imprint; two of their bench walk in with you; the trades call it the reunion. The rarest door, and the one that feels like something.' },
    blank: { title: 'The blank page, again',
      chips: '<span class="chip">no calls</span><span class="chip">no reputation</span><span class="chip hot">the scar</span>',
      quote: '“Nobody called. Start anyway.”',
      copy: 'Start from nothing in the same world — a name you choose, a seed round that remembers the last one, an industry with your obituary on file and your ex-idols on other labels’ stages. Always available: the floor is never a locked save.' },
  };
  UI.renderEpilogue = function (state, door) {
    const dead = state.dissolved || {};
    const st = dead.statement || {};
    const doors = KP.chapterDoors ? KP.chapterDoors(state) : [];
    door = doors.some(d => d.id === door && d.open) ? door : (doors.find(d => d.open) || { id: 'blank' }).id;
    const chosen = doors.find(d => d.id === door) || { id: door, open: true };
    const D = CHAPTER_DOORS[door];
    const when = KP.weekLabel(dead.week || state.week).text;
    const pro = chosen.personId ? state.people[chosen.personId] : null;
    const html = ['<div class="nc-wrap epilogue">'];
    html.push('<div class="d-label">The last statement</div>');
    html.push('<div class="nc-co">' + UI.esc(dead.name || state.company.name) + '</div>');
    html.push('<div class="title-sub" style="margin:4px 0 14px">dissolved ' + UI.esc(when) + ' · ' +
      (st.years ? st.years + ' year' + (st.years === 1 ? '' : 's') : (st.weeks || 0) + ' weeks') + '</div>');
    html.push('<div class="nc-quote">“The month-end won. The songs did not lose.”</div>');
    // what you built — observables only, the ledger's own numbers
    const built = [];
    built.push((st.debuts || 0) + ' debut' + (st.debuts === 1 ? '' : 's') + ' · ' + (st.releases || 0) + ' record' + (st.releases === 1 ? '' : 's'));
    if (st.bestScene != null) built.push('best scene-chart peak #' + st.bestScene + (st.bestNational != null ? ' · national #' + st.bestNational : ''));
    if (st.trophies) built.push(st.trophies + ' music-show troph' + (st.trophies === 1 ? 'y' : 'ies'));
    if (st.daesangs || st.bonsangs) built.push((st.daesangs ? st.daesangs + ' daesang' + (st.daesangs > 1 ? 's' : '') : '') + (st.daesangs && st.bonsangs ? ', ' : '') + (st.bonsangs ? st.bonsangs + ' bonsang' + (st.bonsangs > 1 ? 's' : '') : ''));
    built.push((st.signed || 0) + ' people carried this letterhead · ' + (st.debutedPeople || 0) + ' of them stood on a stage for it');
    html.push('<div class="kicker">What you built</div><div class="card" style="font-size:.82rem;line-height:1.6">' +
      built.map(l => '<div>' + UI.esc(l) + '</div>').join('') +
      (st.acts && st.acts.length ? '<div style="color:var(--ink-dim);margin-top:6px">' + st.acts.map(a => UI.esc(a.name) + ' — ' + a.releases + ' record' + (a.releases === 1 ? '' : 's') + (a.peak ? ', peak #' + a.peak : '')).join(' · ') + '</div>' : '') +
      '</div>');
    const went = st.went || {};
    const seats = st.seats || [];
    html.push('<div class="kicker">Where they went</div><div class="card" style="font-size:.82rem;line-height:1.6">' +
      '<div>' + ((went.market || 0) + (went.service || 0)) + ' onto the open market with real history' + (went.service ? ' (' + went.service + ' after the service)' : '') + '</div>' +
      (went.academy ? '<div>' + went.academy + ' back to the academies</div>' : '') +
      (went.project ? '<div>' + went.project + ' stayed with the show</div>' : '') +
      (seats.length ? '<div style="color:var(--ink-dim);margin-top:6px">' + seats.map(s2 => UI.esc(s2.name) + ' (' + UI.esc(s2.seat) + ') → ' + UI.esc(s2.where)).join(' · ') + '</div>' : '') +
      '<div style="color:var(--ink-dim);margin-top:6px">The shelf went to the distributor against the debts. The songs keep existing; the royalties do not come here.</div>' +
      '</div>');
    // the doors: what the career earned
    html.push('<div class="kicker">The doors</div>');
    html.push('<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 4px">' + doors.map(d =>
      '<button class="btn small' + (d.id === door ? ' primary' : ' ghost') + '" style="flex:1 1 46%' + (d.id === door ? '' : ';border:1px solid var(--line)') +
      (d.open ? '' : ';opacity:.55') + '" data-action="pick-chapter" data-door="' + d.id + '">' + CHAPTER_DOORS[d.id].title + (d.open ? '' : ' · locked') + '</button>').join('') + '</div>');
    html.push('<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 2px">' + D.chips + '</div>');
    html.push('<div class="nc-quote">' + (door === 'protege' && pro ? '“' + UI.esc(KP.displayName(pro)) + ' made the call. ' + UI.esc(chosen.hostName || '') + ' said yes.”' : D.quote) + '</div>');
    html.push('<div class="nc-p">' + D.copy + '</div>');
    if (!chosen.open) {
      html.push('<div class="card" style="color:var(--ink-dim);font-size:.8rem;line-height:1.5">Locked: ' + UI.esc(chosen.reason || '') + '</div>');
    } else {
      if (door !== 'salaried') {
        html.push('<label style="font-size:.68rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-dim)">Company name</label>' +
          '<input class="nc-input" id="ch-company" placeholder="' + { investor: 'Second Label', protege: 'Reunion Label', blank: 'Paper Label' }[door] + '" maxlength="28">');
      }
      html.push('<button class="btn primary" style="width:100%;margin-top:8px" data-action="take-door" data-door="' + door + '">' +
        { salaried: 'Take the job', investor: 'Sign the term sheet', protege: 'Walk through her door', blank: 'Register the name' }[door] + '</button>');
    }
    html.push('<div class="title-foot">The world kept running while you read this. The career did not end; the company did.</div>');
    html.push('</div>');
    return html.join('');
  };
})(typeof window !== 'undefined' ? window : globalThis);
