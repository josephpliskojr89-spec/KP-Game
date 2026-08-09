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
      '</div></div>');
    if (sub === 'chart') html.push(renderChart(state, chartWhich));
    else if (sub === 'feed') html.push(renderFeed(state));
    else html.push(renderScene(state));
    return html.join('');
  };

  // ---- Scene -----------------------------------------------------------
  function renderScene(state) {
    const html = [];
    html.push('<div class="kicker">Your company</div>');
    html.push('<div class="card rival-card">' +
      '<div class="rv-name">' + UI.esc(state.company.name) + '</div>' +
      '<div class="rv-phil">' + repHeadline(state.company.reputation) + '</div>' +
      '<div class="rv-blurb">' + UI.esc(KP.DATA.playerCompany.reputationLine) + '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">' + repChips(state.company.reputation) + '</div>' +
      '</div>');

    html.push('<div class="kicker">The other companies</div>');
    (state.rivals || []).forEach(r => {
      const interested = Object.keys(r.interest || {}).length;
      const activeActs = (r.acts || []).filter(a => !a.retired);
      const actLines = activeActs.map(a =>
        '<div class="rv-act tappable" data-action="open-rivalact" data-id="' + UI.esc(a.id || '') + '">' +
        '<span class="rv-act-name">' + UI.esc(a.name) + '</span>' +
        '<span class="rv-act-note">' + KP.popularityWord(a.popularity) + ' fanbase · ' +
        (a.members || []).length + ' members · ' +
        (a.releases || []).length + ' release' + ((a.releases || []).length === 1 ? '' : 's') + ' ›</span></div>').join('');
      const moves = (r.recentMoves || []).slice(-2).reverse().map(m =>
        '<span class="chip">' + UI.esc(m) + '</span>').join('');
      html.push('<div class="card rival-card">' +
        '<div class="rv-name">' + UI.esc(r.name) + '</div>' +
        '<div class="rv-phil">' + philWord(r.philosophy) + ' · ' + prestigeWord(r.prestige) + '</div>' +
        '<div class="rv-blurb">' + UI.esc(r.blurb || '') + '</div>' +
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
      '</div></div>');

    const members = (a.members || []).map(id => state.people[id]).filter(Boolean);
    if (members.length) {
      html.push('<div class="kicker">Members</div>');
      html.push('<div class="member-strip">');
      members.forEach(m => {
        const fromBoard = !m.flags.rivalNative;
        html.push('<div class="member-cell">' +
          UI.portrait(m, 'md') +
          '<div class="mc-name">' + UI.esc(m.name.stage || m.name.given) + '</div>' +
          '<div class="mc-role">' + m.age + (fromBoard ? ' · was on your board' : '') + '</div></div>');
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
  function renderFeed(state) {
    const html = [];
    html.push('<div class="kicker">The fan feed</div>');
    const posts = state.feed || [];
    if (!posts.length) {
      html.push('<div class="card" style="color:var(--ink-dim);font-size:.85rem">The forums are quiet. Debut someone and they will never be quiet again.</div>');
      return html.join('');
    }
    posts.forEach(p => {
      html.push('<div class="feed-post">' +
        '<div class="fp-head"><span class="fp-handle">@' + UI.esc(p.handle) + '</span>' +
        '<span class="fp-week">' + UI.esc(KP.weekLabel(p.week).text) + '</span></div>' +
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

  // ---- new career ------------------------------------------------------
  UI.renderNewCareer = function () {
    return '<div class="nc-wrap">' +
      '<div class="d-label">New career</div>' +
      '<div class="nc-co">Hanseong<br>Culture Group</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 2px">' +
      '<span class="chip cool">vocal powerhouse</span><span class="chip">mid-sized</span><span class="chip hot">6 years without a girl-group hit</span></div>' +
      '<div class="nc-p">The last group still sells, but it is aging out of its peak. A new executive wants growth, and you — the new A&R Manager — are how she intends to get it.</div>' +
      '<div class="nc-quote">“I don’t need five perfect trainees. I need one group people remember.”</div>' +
      '<div class="nc-p">You inherit six trainees and a scouting board the rivals are already reading. Budget covers three signings. The deadline is eighteen months.</div>' +
      '<label style="font-size:.68rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-dim)">Your name</label>' +
      '<input class="nc-input" id="nc-name" placeholder="A&R Manager" maxlength="24">' +
      '<label style="font-size:.68rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-dim)">World seed <span style="color:var(--ink-faint)">(optional)</span></label>' +
      '<input class="nc-input" id="nc-seed" placeholder="random">' +
      '<button class="btn primary" style="width:100%;margin-top:8px" data-action="start-career">Take the job</button>' +
      '</div>';
  };
})(typeof window !== 'undefined' ? window : globalThis);
