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

    // the greenlights (v0.9.19): every open mandate is a window on the
    // Desk — and the pitch upstairs lives beside them
    {
      const open = (KP.openMandates ? KP.openMandates(state) : []);
      open.filter(m => !m.virtual).forEach(m => {
        const weeksLeft = m.window - state.week;
        html.push('<div class="objective" style="margin-top:10px;border-color:color-mix(in srgb,var(--gold,#e2c76c) 45%,var(--line))">' +
          '<div class="o-from">Greenlight · ' + UI.esc(m.source) + '</div>' +
          '<div class="o-text">' + (m.kind === 'solo' ? 'A solo act' : m.gender === 'm' ? 'A boy group' : m.gender === 'f' ? 'A girl group' : 'A new group') +
          ' is approved. Assemble it, name it, debut it — the window is yours to use or lose.</div>' +
          '<div class="o-meta"><span class="chip ' + (weeksLeft <= 8 ? 'hot' : '') + '">' +
          (weeksLeft > 0 ? weeksLeft + ' weeks left' : 'closing') + '</span></div></div>');
      });
      const cool = (state.mandateCooldownUntil || 0) >= state.week;
      html.push('<div class="pad" style="margin-top:10px"><button class="btn small" data-action="pitch-mandate"' +
        (cool ? ' disabled' : '') + '>Pitch a new act upstairs' +
        (cool ? ' · ' + (state.mandateCooldownUntil - state.week + 1) + 'w' : '') + '</button></div>');
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

    // the invoice (v0.9.14): active sponsorships and their next dates
    const activeDeals = KP.activeDeals(state);
    if (activeDeals.length) {
      html.push('<div class="kicker">Sponsorships running</div>');
      activeDeals.forEach(d => {
        const p = state.people[d.personId];
        const nextIn = Math.max(0, (d.nextObligationWeek || d.signedWeek + KP.C.DEALS.obligationEveryWeeks) - state.week);
        html.push('<div class="card" style="display:flex;gap:10px;align-items:center">' +
          '<div style="flex:1;min-width:0"><b>' + (p ? UI.esc(KP.displayName(p)) : '?') + '</b> — ' +
          UI.esc(d.brand) + ' · ' + d.weeksLeft + 'w left · next appearance ' +
          (nextIn === 0 ? 'this week' : 'in ' + nextIn + 'w') +
          ((d.missStreak || 0) > 0 ? ' · <span style="color:var(--magenta)">missed ×' + d.missStreak + '</span>' : '') +
          (d.cooled ? ' · <span style="color:var(--ink-dim)">cooled</span>' : '') +
          '</div></div>');
      });
    }

    // the staff (v0.10.6): the building's seats — names, files, no numbers.
    // the help wanted (v0.10.11): the two verbs live on the rows
    if (KP.staffSeats) {
      const S = KP.staffSeats(state);
      const HR = KP.C.HIRES;
      const searchBusy = !!state.staffSearch ||
        (state.scenes || []).some(sc => sc.kind === 'theInterview');
      const rows = KP.C.HIRES.SEATS.map(seat => {
        const st = S[seat.id];
        const sev = st ? Math.max(HR.severanceMin,
          Math.round((HR.hireCost[st.tier] || HR.hireCost.working) * HR.severanceMult)) : 0;
        const cooled = state.week - ((state.seatSearchCooldowns || {})[seat.id] || -999) >= HR.searchCooldown;
        return '<div style="display:flex;justify-content:space-between;align-items:center;font-size:.78rem;padding:3px 0;gap:6px">' +
          '<span style="flex:1">' + UI.esc(seat.label) +
          (st ? '<br><span style="color:var(--ink-dim)">' + UI.esc(st.name) + ' · ' + UI.esc(st.tier) + '</span>'
              : '<br><span style="color:var(--ink-dim)">— chair open —</span>') + '</span>' +
          '<span style="display:flex;gap:4px;flex-shrink:0">' +
          (st ? '<button class="btn small ghost" style="border:1px solid var(--line);font-size:.62rem" data-action="seat-release" data-id="' + seat.id + '">let go · ' + sev + '</button>' : '') +
          (!searchBusy && cooled
            ? '<button class="btn small" style="font-size:.62rem" data-action="seat-search" data-id="' + seat.id + '">help wanted · ' + HR.searchCost + '</button>' : '') +
          '</span></div>';
      }).join('');
      html.push('<div class="kicker">The building</div>');
      html.push('<div class="card">' + rows +
        (state.staffSearch
          ? '<div style="font-size:.7rem;color:var(--gold);margin-top:6px">A posting is up — somebody takes the meeting within the week.</div>' : '') +
        '<div style="font-size:.68rem;color:var(--ink-dim);margin-top:6px">The file shows who they are and what the industry says. What they are actually worth, only the months say — and never in a number.</div></div>');
    }

    // the settlement (v0.10.1): the quarterly books, on the desk
    const stmt = KP.lastStatement ? KP.lastStatement(state) : null;
    if (stmt) {
      html.push('<div class="kicker">The books · Q' + stmt.quarter + ', year ' + stmt.year + '</div>');
      html.push('<div class="card" style="font-size:.78rem;line-height:1.6">' +
        stmt.lines.map(l => '<div>' + UI.esc(l) + '</div>').join('') +
        '<div>Operations & payroll: ' + (stmt.other > 0 ? '+' : '') + stmt.other + '</div>' +
        '<div style="margin-top:6px;font-weight:600;color:' + (stmt.net >= 0 ? 'var(--gold)' : 'var(--magenta)') + '">NET: ' +
        (stmt.net > 0 ? '+' : '') + stmt.net + '</div>' +
        KP.groups(state).filter(g => g.debuted && g.recoup && !g.retiredWeek).map(g =>
          '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:4px">' + UI.esc(g.name) + ': ' +
          (g.recoup.settledWeek != null
            ? 'settled · paid out ' + g.recoup.paid + ' to date'
            : 'unrecouped · ' + Math.max(0, Math.round(g.recoup.debt)) + ' on the ledger') + '</div>').join('') +
        '</div>');
    }

    // the grind (v0.9.37, §76 E): the era desk — a locked release is a
    // campaign to RUN, not a date to wait for
    KP.groups(state).filter(g => g.prep && !g.retiredWeek).forEach(g => {
      const c = g.prep.campaign || { momentum: 0, worked: 0 };
      const P = KP.C.FAME.PUSHES;
      const pushedThisWeek = c.lastPush === state.week;
      const fame = KP.fameRead ? KP.fameRead(state) : 1;
      html.push('<div class="kicker">The campaign · ' + UI.esc(g.name) + '</div>' +
        '<div class="war-card held"><div class="w-flag">Release week ' + g.prep.scheduledWeek +
        ' · word of mouth: ' + UI.esc(KP.momentumWord(c.momentum)) + '</div>' +
        '<div class="w-text">' + (c.worked ? c.worked + ' push' + (c.worked === 1 ? '' : 'es') + ' worked so far.' :
          'Nobody has worked this era yet.') +
        (fame < KP.C.FAME.wallBelow
          ? ' At this label’s size, the ground game is the only marketing that converts at full rate — momentum lifts what the label’s name cannot.'
          : ' Momentum stacks on top of the paid campaign.') +
        (pushedThisWeek ? ' This week’s push is done — the members are not a media plan.' : '') + '</div>' +
        '<div class="w-actions">' +
        Object.keys(P).map(k => {
          const disabled = pushedThisWeek || (P[k].once && c[k + 'Done']) ||
            state.budget < P[k].cost || (P[k].needsFame && fame < P[k].needsFame);
          return '<button class="btn small' + (disabled ? '' : ' primary') + '"' +
            (disabled ? ' disabled' : '') +
            ' data-action="campaign-push" data-group="' + g.id + '" data-kind="' + k + '">' +
            UI.esc(P[k].label) + ' · ' + P[k].cost + '</button>';
        }).join('') +
        '</div></div>');
    });

    // the grind (v0.9.37, §76 D): the booking pile — the pile deals
    // more than a group can take; choosing is the game
    const offers = KP.openBookings ? KP.openBookings(state) : [];
    const bookableGs = KP.groups(state).filter(g => !g.retiredWeek && !g.hiatus && !g.tour &&
      g.members.length && (g.debuted || g.prep));
    if (offers.length && bookableGs.length) {
      html.push('<div class="kicker">The booking pile</div>');
      offers.forEach(o => {
        const K = KP.C.BOOK.KINDS[o.kindId] || {};
        html.push('<div class="war-card held"><div class="w-flag">' + UI.esc(o.label) +
          ' · week ' + o.week + ' · ' + (o.fee < 0 ? 'costs ' + (-o.fee) : 'fee ' + o.fee) + '</div>' +
          '<div class="w-text">Answer by week ' + o.expiresWeek + '.' +
          (K.flyerable ? ' A flyer week beforehand fills the room — and earns it twice.' : '') + '</div>' +
          '<div class="w-actions">' +
          bookableGs.map(g =>
            '<button class="btn small primary" data-action="take-booking" data-offer="' + o.id +
            '" data-group="' + g.id + '">Send ' + UI.esc(g.name) + '</button>' +
            (K.flyerable && o.week > state.week
              ? '<button class="btn small" data-action="take-booking" data-offer="' + o.id +
                '" data-group="' + g.id + '" data-flyer="1">+ flyer week</button>' : '')
          ).join('') +
          '</div></div>');
      });
    }
    const takenGigs = KP.takenBookings ? KP.takenBookings(state) : [];
    if (takenGigs.length) {
      html.push('<div class="kicker">Booked stages</div>');
      takenGigs.forEach(o => {
        const g = KP.groups(state).find(x => x.id === o.taken);
        html.push('<div class="card" style="display:flex;gap:10px;align-items:center">' +
          '<div style="flex:1;min-width:0"><b>' + (g ? UI.esc(g.name) : '?') + '</b> — ' +
          UI.esc(o.label) + ' · week ' + o.week + (o.flyered ? ' · flyered' : '') + '</div></div>');
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
      if (c.type === 'ambitionPromise') {
        const A = KP.C.LIFE.AMBITIONS[c.ambition];
        const p = state.people[c.personId];   // {pos} fills for real people (0.9.26.2)
        const raw = (A ? A.label : 'the thing they wanted') + ', within the year';
        return UI.esc(p ? KP.fillPro(raw, p) : raw.replace('{pos} ', ''));
      }
      if (c.label) return UI.esc(c.label);   // gravity-era claims carry prose
      const WORDS = { soloPromise: 'the promised solo, on a record',
        soloAlbumPromise: 'the promised solo album — her name on the spine',
        growthPromise: 'the growth the board was promised' };
      return WORDS[c.type] || c.type;
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
