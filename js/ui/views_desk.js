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
      (KP.signingsCapped(state)
        ? '<span class="chip">' + (state.signingsAllowed - state.signingsUsed) + ' signings left</span>'
        : (state.fiscal && state.fiscal.pressure > 0
          ? '<span class="chip hot">the board is watching spend</span>'
          : '<span class="chip cool">open signing</span>')) +
      '<span class="chip">trust: ' + trustWord(state.trust) + '</span>' +
      '</div></div>');

    // the hype directive: a second clock, and it is not yours (v0.2.6)
    if (state.hypeDirective && state.hypeDirective.status === 'open') {
      const hd = state.hypeDirective;
      const person = state.people[hd.personId];
      const weeksLeft = hd.deadlineWeek - state.week;
      html.push('<div class="objective" style="margin-top:10px;border-color:color-mix(in srgb,var(--magenta) 50%,var(--line))">' +
        '<div class="o-from" style="color:var(--magenta)">Directive · the internet has decided</div>' +
        '<div class="o-text">Debut ' + UI.esc(person ? KP.displayName(person) : 'her') + ' — group her or solo her — before the window closes.</div>' +
        '<div class="o-meta"><span class="chip hot">' + (weeksLeft > 0 ? weeksLeft + ' weeks left' : 'overdue') + '</span>' +
        (person ? '<span class="chip">' + UI.esc(KP.hypeWord(person.hype || 0)) + '</span>' : '') +
        '</div></div>');
    }

    // the stage door (v0.8.0): EVERY held scene renders through this one
    // rail — the meeting today, the office door and the renewal table
    // tomorrow. New conversations never add cards here again.
    const scenes = state.scenes || [];
    if (scenes.length) {
      html.push('<div class="kicker">Waiting on your answer</div>');
      scenes.forEach(sc => {
        const def = KP.sceneDef(sc.kind);
        if (!def) return;
        html.push('<div class="war-card held"><div class="w-flag">' + UI.esc(def.title(state, sc)) + '</div>' +
          '<div class="w-text">' + UI.esc(def.body(state, sc)) + '</div>' +
          '<div class="w-actions" style="flex-wrap:wrap">' +
          def.options(state, sc).map(o => '<button class="btn" data-action="scene-opt" data-scene="' + sc.id + '" data-opt="' + UI.esc(o.id) + '">' + UI.esc(o.label) + '</button>').join('') +
          '</div></div>');
      });
    }

    // the deals desk (v0.7.0): offers wait for an answer, briefly
    const dealOffers = KP.openDealOffers(state);
    if (dealOffers.length) {
      html.push('<div class="kicker">On the deals desk</div>');
      dealOffers.forEach(o => {
        const p = state.people[o.personId];
        html.push('<div class="war-card held"><div class="w-flag">Brand offer · expires ' + UI.esc(KP.weekLabel(o.expiresWeek).text) + '</div>' +
          '<div class="w-text">' + UI.esc(o.brand) + ' wants ' + (p ? UI.esc(KP.displayName(p)) : 'her') +
          ': ' + o.lump + ' up front, ' + o.weekly + '/week for ' + o.weeks + ' weeks. The shoots cost energy; the billboard pays in more than money.</div>' +
          '<div class="w-actions">' +
          '<button class="btn primary" data-action="deal-accept" data-id="' + o.id + '">Sign it</button>' +
          '<button class="btn" data-action="deal-decline" data-id="' + o.id + '">Pass</button>' +
          '</div></div>');
      });
    }

    // calendar strip
    const up = KP.upcoming(state);
    if (up.length) {
      html.push('<div class="kicker">Coming up</div><div class="calstrip">');
      up.forEach(u => {
        const uwl = KP.weekLabel(u.week);
        const inW = u.week - state.week;
        html.push('<div class="calcard' + (u.hot ? ' hot' : '') + (u.clash ? ' clash' : '') + '">' +
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
        '<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:1rem">' + UI.esc(KP.displayName(feature)) + '</div>' +
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
