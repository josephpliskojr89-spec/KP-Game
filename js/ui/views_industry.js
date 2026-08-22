/* Industry tab (v0.4.0): three rooms — the Scene (companies and their
   acts), the Chart (this week's positions), and the Feed (the fans,
   verbatim). Plus the new-career intro screen. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};
  const UI = KP.UI;

  UI.renderIndustry = function (state, sub, chartWhich) {
    sub = sub || 'scene';
    const html = [];
    html.push('<div class="pad" style="margin-top:2px"><div class="seg">' +
      '<button class="' + (sub === 'scene' ? 'on' : '') + '" data-action="industry-sub" data-sub="scene">Scene</button>' +
      '<button class="' + (sub === 'chart' ? 'on' : '') + '" data-action="industry-sub" data-sub="chart">Charts</button>' +
      '<button class="' + (sub === 'feed' ? 'on' : '') + '" data-action="industry-sub" data-sub="feed">Feed</button>' +
      '<button class="' + (sub === 'fandom' ? 'on' : '') + '" data-action="industry-sub" data-sub="fandom">Fandom</button>' +
      '</div></div>');
    if (sub === 'chart') html.push(renderChart(state, chartWhich));
    else if (sub === 'feed') html.push(renderFeed(state));
    else if (sub === 'fandom') html.push(renderFandom(state));
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
      '</div>');

    // the power ranking + the generation (v0.9.24): the scene, scored
    if (state.powerRanking && state.powerRanking.entries) {
      const pr = state.powerRanking;
      const rows = pr.entries.map(e =>
        '<div style="display:flex;justify-content:space-between;font-size:.82rem;padding:3px 0' +
        (e.isPlayer ? ';color:var(--gold);font-weight:600' : '') + '">' +
        '<span>#' + e.rank + ' ' + UI.esc(e.short) +
        (e.delta > 0 ? ' <span style="color:var(--cyan)">▲' + e.delta + '</span>'
          : e.delta < 0 ? ' <span style="color:var(--magenta)">▼' + Math.abs(e.delta) + '</span>' : '') +
        '</span><span>' + e.score + '</span></div>').join('');
      html.push('<div class="kicker">The power ranking · Yr ' + pr.year +
        (state.gen ? ' · the ' + state.gen.n + (state.gen.n === 3 ? 'rd' : 'th') + ' generation' : '') + '</div>');
      html.push('<div class="card">' + rows + '</div>');
    }

    // the open market (v0.9.24): careers, priced and waiting
    if (state.freeAgents && state.freeAgents.length) {
      html.push('<div class="kicker">The open market</div>');
      state.freeAgents.forEach(f => {
        const p = state.people[f.personId];
        if (!p || state.week > f.until) return;
        html.push('<div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:10px">' +
          '<div><b>' + UI.esc(KP.displayName(p)) + '</b> · ' + p.age + ' · ex-' + UI.esc(f.from) +
          '<div style="font-size:.7rem;color:var(--ink-dim)">' + KP.fmtCount(KP.socialOf(state, p)) +
          ' followers · window closes ' + UI.esc(KP.weekLabel(f.until).text) + '</div></div>' +
          '<button class="btn small" data-action="sign-freeagent" data-id="' + p.id + '">Sign · ' +
          KP.freeAgentCost(state, p) + '</button></div>');
      });
    }

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
        (actLines ? '<div class="rv-acts">' + actLines + '</div>'
          : '<div class="rv-acts"><div class="rv-act"><span class="rv-act-note">No active act — the trainee floor is all they have.</span></div></div>') +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">' +
        '<span class="chip">~' + (r.rosterCount || 0) + ' trainees</span>' +
        (interested ? '<span class="chip hot">tracking ' + interested + ' of your leads</span>' : '') +
        moves +
        '</div></div>');
    });

    const news = state.inbox.filter(m => ['industry', 'scouting', 'public'].includes(m.kind)).slice(0, 8);
    if (news.length) {
      html.push('<div class="kicker">The wire</div>');
      news.forEach(m => html.push(UI.mailRow(state, m)));
    }
    return html.join('');
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
        (e.isPlayer ? ' <span class="chip gold" style="margin-left:4px">yours</span>' : '') + '</div></div>' +
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
          ' moved faster. Worth remembering how that felt.<span class="n-who">— Scout Im, in passing</span></div>');
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

  function renderFeed(state) {
    const html = [];

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
      '<label style="font-size:.68rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-dim)">Your name</label>' +
      '<input class="nc-input" id="nc-name" placeholder="A&R Manager" maxlength="24">' +
      '<label style="font-size:.68rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-dim)">World seed <span style="color:var(--ink-faint)">(optional)</span></label>' +
      '<input class="nc-input" id="nc-seed" placeholder="random">' +
      '<button class="btn primary" style="width:100%;margin-top:8px" data-action="start-career">Take the job</button>' +
      '</div>';
  };
})(typeof window !== 'undefined' ? window : globalThis);
