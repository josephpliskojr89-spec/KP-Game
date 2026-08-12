/* The Desk — the player's internal label portal. Objective front and
   center, calendar pressure, inbox stack, one featured story. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};
  const UI = KP.UI;

  UI.renderDesk = function (state, sub) {
    sub = sub || 'today';
    const wl = KP.weekLabel(state.week);
    const monthsLeft = KP.monthsUntil(state.week, state.objective.deadlineWeek);
    const html = [];
    html.push('<div class="pad" style="margin-top:2px"><div class="seg">' +
      '<button class="' + (sub === 'today' ? 'on' : '') + '" data-action="desk-sub" data-sub="today">Today</button>' +
      '<button class="' + (sub === 'record' ? 'on' : '') + '" data-action="desk-sub" data-sub="record">The record</button>' +
      '</div></div>');
    if (sub === 'record') return html.join('') + renderRecord(state);

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
        '<div class="o-text">' + UI.esc(KP.fillPro('Debut ' + (person ? KP.displayName(person) : '{her}') + ' — group {her} or solo {her} — before the window closes.', person)) + '</div>' +
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

    // the second job (v0.9.11): productions call, the desk answers
    const gigOffers = KP.openGigOffers(state);
    if (gigOffers.length) {
      html.push('<div class="kicker">Casting calls</div>');
      gigOffers.forEach(o => {
        const p = state.people[o.personId];
        const terms = o.kind === 'ost'
          ? o.lump + ' on delivery, three weeks of recording'
          : o.weekly + '/week for ' + o.weeks + ' weeks, taping weekly';
        const seat = o.kind === 'panel' ? 'a fixed panel seat on ' : o.kind === 'mc' ? 'the MC mic at ' : 'the OST for ';
        html.push('<div class="war-card held"><div class="w-flag">' +
          (o.kind === 'ost' ? 'OST offer' : o.kind === 'mc' ? 'MC offer' : 'Variety offer') +
          ' · expires ' + UI.esc(KP.weekLabel(o.expiresWeek).text) + '</div>' +
          '<div class="w-text">' + (p ? UI.esc(KP.displayName(p)) : 'She') + ' is wanted for ' + seat + UI.esc(o.show) +
          ': ' + terms + '. A second job pays the person — and claims the weeks.</div>' +
          '<div class="w-actions">' +
          '<button class="btn primary" data-action="gig-accept" data-id="' + o.id + '">Book it</button>' +
          '<button class="btn" data-action="gig-decline" data-id="' + o.id + '">Pass</button>' +
          '</div></div>');
      });
    }
    const activeGigs = KP.activeGigs(state);
    if (activeGigs.length) {
      html.push('<div class="kicker">Second jobs running</div>');
      activeGigs.forEach(gig => {
        const p = state.people[gig.personId];
        html.push('<div class="card" style="display:flex;gap:10px;align-items:center">' +
          '<div style="flex:1;min-width:0"><b>' + (p ? UI.esc(KP.displayName(p)) : '?') + '</b> — ' +
          UI.esc(KP.gigLabel(gig)) + ' · ' + gig.weeksLeft + 'w left' +
          (gig.strain ? ' · <span style="color:var(--magenta)">stretched ×' + gig.strain + '</span>' : '') +
          '</div>' +
          '<button class="btn small" data-action="gig-quit" data-id="' + gig.id + '">Pull out</button>' +
          '</div>');
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

    // the founding (v0.9.9): the door out — shown once the career could
    // plausibly open it, locked with honest reasons until it does
    if (!state.founded && KP.foundingEligible) {
      const gate = KP.foundingEligible(state);
      const worth = gate.ok || (gate.honors && gate.honors.years >= KP.C.FOUNDING.minYears &&
        KP.groups(state).some(g => g.debuted));
      if (worth) {
        if (gate.ok) {
          html.push('<div class="kicker" style="margin-top:18px">The door</div>');
          html.push('<div class="war-card held"><div class="w-flag">Your name is worth money now</div>' +
            '<div class="w-text">Investors will back a label with you on the letterhead: a war chest of <b>' + gate.warChest + '</b>, raised on ' +
            (gate.honors.daesangs ? gate.honors.daesangs + ' daesang' + (gate.honors.daesangs > 1 ? 's' : '') + ', ' : '') +
            (gate.honors.bonsangs ? gate.honors.bonsangs + ' bonsang' + (gate.honors.bonsangs > 1 ? 's' : '') + ', ' : '') +
            gate.honors.trophies + ' trophies and ' + gate.honors.years + ' years of your work. Walk, and everything you built stays behind — as the competition. This is not reversible.</div>' +
            '<div style="display:flex;gap:6px;margin-top:10px">' +
            '<input id="label-name-input" maxlength="14" placeholder="Name the label…" value="' + UI.esc((KP.App || {}).labelName || '') + '" ' +
            'style="flex:1;background:var(--bg2);border:1px solid var(--line);color:var(--ink);border-radius:6px;padding:6px 10px;font-size:.85rem">' +
            '<button class="btn primary" data-action="found-label">Sign the papers</button></div></div>');
        } else {
          html.push('<div class="kicker" style="margin-top:18px">The door</div>');
          html.push('<div class="card" style="color:var(--ink-dim);font-size:.8rem;line-height:1.5">There is a version of your career where you leave and start your own label. Not yet: ' +
            UI.esc(gate.reasons[0]) + '</div>');
        }
      }
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

  // the record (owner request): past conversations and every promise —
  // open ones with their clocks, settled ones with their verdicts
  function renderRecord(state) {
    const html = [];
    const claims = state.claims || [];
    const who = c => c.subject.kind === 'exec' ? state.executive.name
      : c.subject.kind === 'idol' ? (state.people[c.subject.id || c.personId] ? KP.displayName(state.people[c.subject.id || c.personId]) : 'her')
      : c.subject.kind;
    const what = c => {
      if (c.type === 'readyTrainee') return '“' + UI.esc(c.personName || '') + ' is closest to ready” — a debut that lands';
      if (c.type === 'comebackPromise') { const g = KP.groupById(state, c.groupId); return 'the ' + (g ? UI.esc(g.name) : '') + ' comeback, on the calendar'; }
      if (c.type === 'ambitionPromise') { const A = KP.C.LIFE.AMBITIONS[c.ambition]; return (A ? A.label : 'the thing they wanted') + ', within the year'; }
      return c.type;
    };
    const open = claims.filter(c => !c.resolved);
    html.push('<div class="kicker">Promises on the clock</div>');
    if (open.length) {
      open.forEach(c => {
        html.push('<div class="mail"><span class="m-tag">' + UI.esc(KP.weekLabel(c.week).text) + '</span>' +
          '<div><b>' + UI.esc(who(c)) + '</b> holds the receipt: ' + what(c) +
          '<span class="m-week">due ' + UI.esc(KP.weekLabel(c.byWeek).text) + '</span></div></div>');
      });
    } else {
      html.push('<div class="card" style="color:var(--ink-dim);font-style:italic">Nothing on the clock. Either you promise carefully or not at all — both are strategies.</div>');
    }
    const settled = claims.filter(c => c.resolved).slice().reverse();
    if (settled.length) {
      html.push('<div class="kicker">Settled</div>');
      settled.forEach(c => {
        const chip = c.resolved === 'met' ? '<span class="chip cool">kept</span>'
          : c.resolved === 'metPoorly' ? '<span class="chip">kept, barely</span>'
          : '<span class="chip hot">broken</span>';
        html.push('<div class="mail"><span class="m-tag">' + UI.esc(KP.weekLabel(c.resolvedWeek || c.week).text) + '</span>' +
          '<div><b>' + UI.esc(who(c)) + '</b>: ' + what(c) + ' ' + chip +
          (c.replyText ? '<div style="font-size:.78rem;font-style:italic;color:var(--ink-dim);margin-top:5px;line-height:1.45">' + UI.esc(c.replyText) + '</div>' : '') +
          '</div></div>');
      });
    }
    html.push('<div class="kicker">Conversations</div>');
    const log = state.convoLog || [];
    if (log.length) {
      log.forEach(e => {
        html.push('<div class="mail"><span class="m-tag">' + UI.esc(KP.weekLabel(e.week).text) + '</span>' +
          '<div><b>' + UI.esc(e.title) + '</b><span class="m-week">your answer: ' + UI.esc(e.answer) + '</span>' +
          (e.reply ? '<div style="font-size:.78rem;font-style:italic;color:var(--ink-dim);margin-top:5px;line-height:1.45">' + UI.esc(e.reply) + '</div>' : '') +
          '</div></div>');
      });
    } else {
      html.push('<div class="card" style="color:var(--ink-dim);font-style:italic">No conversations on the record yet. The record starts the next time someone is waiting on your answer.</div>');
    }
    return html.join('');
  }

  function trustWord(t) {
    return t >= 80 ? 'trusted' : t >= 60 ? 'solid' : t >= 40 ? 'watched' : t >= 20 ? 'thin' : 'gone';
  }
  UI.trustWord = trustWord;
})(typeof window !== 'undefined' ? window : globalThis);
