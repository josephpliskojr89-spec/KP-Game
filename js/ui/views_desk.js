/* The Desk — the player's internal label portal. Objective front and
   center, calendar pressure, inbox stack, one featured story. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};
  const UI = KP.UI;

  UI.renderDesk = function (state) {
    const wl = KP.weekLabel(state.week);
    const monthsLeft = KP.monthsUntil(state.week, state.objective.deadlineWeek);
    const html = [];

    // objective banner
    html.push('<div class="objective">' +
      '<div class="o-from">Directive · ' + UI.esc(state.executive.name) + '</div>' +
      '<div class="o-text">' + UI.esc(state.objective.text) + '</div>' +
      '<div class="o-meta">' +
      (state.objective.status === 'open'
        ? '<span class="chip ' + (monthsLeft <= 4 ? 'hot' : '') + '">' + monthsLeft + ' months left</span>'
        : state.objective.status === 'met' || state.objective.status === 'metPoorly'
          ? '<span class="chip gold">delivered</span>'
          : '<span class="chip hot">deadline missed</span>') +
      '<span class="chip">' + (state.signingsAllowed - state.signingsUsed) + ' signings left</span>' +
      '<span class="chip">trust: ' + trustWord(state.trust) + '</span>' +
      '</div></div>');

    // calendar strip
    const up = KP.upcoming(state);
    if (up.length) {
      html.push('<div class="kicker">Coming up</div><div class="calstrip">');
      up.forEach(u => {
        const uwl = KP.weekLabel(u.week);
        const inW = u.week - state.week;
        html.push('<div class="calcard' + (u.hot ? ' hot' : '') + '">' +
          '<div class="c-when">' + UI.esc(uwl.month) + ' · wk ' + uwl.weekOfMonth +
          (inW === 0 ? ' · now' : ' · in ' + inW + 'w') + '</div>' +
          '<div class="c-what">' + UI.esc(u.label) + '</div></div>');
      });
      html.push('</div>');
    }

    // featured story: highest center-pull trainee not yet debuted
    const feature = state.roster.map(id => state.people[id])
      .filter(p => p.status === 'trainee')
      .sort((a, b) => KP.derived(b).centerPull - KP.derived(a).centerPull)[0];
    if (feature) {
      const evl = KP.evaluate(state, feature);
      const line = evl.instinct || evl.recommendation;
      html.push('<div class="kicker">On the <span class="k-accent">radar</span></div>');
      html.push('<div class="card" data-action="open-dossier" data-id="' + feature.id + '" style="display:flex;gap:14px;align-items:center">' +
        UI.portrait(feature, 'md') +
        '<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:1rem">' + UI.esc(feature.name.display) + '</div>' +
        '<div style="font-size:.82rem;font-style:italic;color:var(--ink-dim);margin-top:4px;line-height:1.4">“' + UI.esc(line) + '”</div></div>' +
        '</div>');
    }

    // inbox
    html.push('<div class="kicker">Inbox</div>');
    if (!state.inbox.length) {
      html.push('<div class="card" style="color:var(--ink-dim);font-style:italic">A quiet week. They exist, occasionally.</div>');
    } else {
      html.push('<div>');
      state.inbox.slice(0, 14).forEach(m => { html.push(UI.mailRow(state, m)); });
      html.push('</div>');
    }
    setTimeout(() => { state.inbox.forEach(m => { m.read = true; }); }, 600);

    return html.join('');
  };

  function trustWord(t) {
    return t >= 80 ? 'trusted' : t >= 60 ? 'solid' : t >= 40 ? 'watched' : t >= 20 ? 'thin' : 'gone';
  }
  UI.trustWord = trustWord;
})(typeof window !== 'undefined' ? window : globalThis);
