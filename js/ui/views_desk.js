/* The Desk — the player's internal label portal. Objective front and
   center, calendar pressure, inbox stack, one featured story. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};
  const UI = KP.UI;

  // long answers stack (v0.11.9, §100): a row shares the card's width
  // between its buttons, so the reissue door's three answers (each a
  // title, a build and a bill) stood as three ten-line columns on a phone.
  // An answer that would run past three lines in its share of the row
  // takes a row of its own. The rooms are characters, measured on the
  // 390px column in a real browser: two answers get about 13 a line,
  // three about 8, four about 4.
  UI.answersStack = function (opts) {
    const n = (opts || []).length;
    if (n < 2) return false;
    const room = n === 2 ? 40 : n === 3 ? 24 : 12;
    return opts.some(o => String(o.label || '').length > room);
  };

  // the stage door (v0.8.0): EVERY held scene renders through this one card
  function sceneCard(state, sc) {
    const def = KP.sceneDef(sc.kind);
    if (!def) return '';
    const opts = def.options(state, sc);
    return '<div class="war-card held"><div class="w-flag">' + UI.esc(def.title(state, sc)) + '</div>' +
      '<div class="w-text">' + UI.esc(def.body(state, sc)) + '</div>' +
      (UI.answersStack(opts) ? '<div class="w-actions stack">' : '<div class="w-actions" style="flex-wrap:wrap">') +
      opts.map(o => '<button class="btn" data-action="scene-opt" data-scene="' + sc.id + '" data-opt="' + UI.esc(o.id) + '">' + UI.esc(o.label) + '</button>').join('') +
      '</div></div>';
  }

  // the offers tab (v0.11.6, §97): the stages, the endorsements and the
  // second jobs, the festival bills and the broadcasters' invitations —
  // every ask the market makes of the label, with its answer-by date,
  // soonest first. The buttons are the ones the Desk rail carried.
  function renderOffers(state, read) {
    const html = [];
    const bookableGs = KP.groups(state).filter(g => !g.retiredWeek && !g.hiatus && !g.tour &&
      g.members.length && (g.debuted || g.prep));
    const stages = read.stages || [];
    const outside = read.outside || [];
    const scenes = read.scenes || [];
    if (!read.count) {
      html.push('<div class="kicker">Offers</div>' +
        '<div class="card" style="font-size:.84rem;color:var(--ink-dim)">Nothing on the table this week. The pile deals while the label is small; the brands and the bills call when somebody is worth calling about. The count on the tab says when to look.</div>');
      return html.join('');
    }
    html.push('<div class="pad" style="font-size:.76rem;color:var(--ink-dim);margin-top:6px">' + read.count + ' offer' + (read.count === 1 ? '' : 's') + ' waiting' +
      (read.fresh ? ' · ' + read.fresh + ' new this week' : '') + ' · soonest answer first</div>');
    if (stages.length) {
      html.push('<div class="kicker">Stages · ' + stages.length + '</div>');
      if (!bookableGs.length) html.push('<div class="pad" style="font-size:.76rem;color:var(--ink-dim)">Nobody in the building can take a stage this week.</div>');
      stages.forEach(o => {
        const K = KP.C.BOOK.KINDS[o.kindId] || {};
        html.push('<div class="war-card held"><div class="w-flag">Booking · ' + UI.esc(o.label) +
          ' · ' + UI.esc(KP.weekLabel(o.week).text) + ' · ' + (o.fee < 0 ? 'costs ' + (-o.fee) : 'fee ' + o.fee) +
          (o.fresh ? ' · <span class="chip hot">new</span>' : '') + '</div>' +
          '<div class="w-text">Answer by ' + UI.esc(KP.weekLabel(o.expiresWeek).text) + '.' +
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
    if (scenes.length) {
      html.push('<div class="kicker">Bills and broadcasters · ' + scenes.length + '</div>');
      scenes.forEach(sc => html.push(sceneCard(state, sc)));
    }
    if (outside.length) {
      html.push('<div class="kicker">Endorsements and second jobs · ' + outside.length + '</div>');
      outside.forEach(o => {
        const p = state.people[o.personId];
        const who = p ? UI.esc(KP.displayName(p)) : 'She';
        const text = o.kind === 'brand'
          ? UI.esc(o.label) + ' wants ' + who + ': ' + o.lump + ' up front, ' + o.weekly + '/week for ' + o.weeks + ' weeks. The shoots cost energy; the billboard pays in more than money.'
          : who + ' is wanted for ' + (o.kind === 'panel' ? 'a fixed panel seat on ' : o.kind === 'mc' ? 'the MC mic at ' : 'the OST for ') + UI.esc(o.label) + ': ' +
            (o.kind === 'ost' ? o.lump + ' on delivery, three weeks of recording' : o.weekly + '/week for ' + o.weeks + ' weeks, taping weekly') +
            '. A second job pays the person — and claims the weeks.';
        html.push('<div class="war-card held"><div class="w-flag">' + KP.outsideKindLabel(o.kind) + ' · expires ' + UI.esc(KP.weekLabel(o.expiresWeek).text) +
          (o.fresh ? ' · <span class="chip hot">new</span>' : '') + '</div>' +
          '<div class="w-text">' + text + '</div>' +
          '<div class="w-actions">' +
          '<button class="btn primary" data-action="outside-accept" data-id="' + o.id + '">' + (o.kind === 'brand' ? 'Sign it' : 'Book it') + '</button>' +
          '<button class="btn" data-action="outside-decline" data-id="' + o.id + '">Pass</button>' +
          '</div></div>');
      });
    }
    return html.join('');
  }

  UI.renderDesk = function (state, sub) {
    sub = sub || 'today';
    const wl = KP.weekLabel(state.week);
    const monthsLeft = KP.monthsUntil(state.week, state.objective.deadlineWeek);
    const html = [];
    // the offers tab (v0.11.6, §97): the market's asks — the pile, the
    // brands, the bills, the broadcasters — wait on their own tab with the
    // count on it; Today keeps the decisions
    const offersRead = KP.offersRead ? KP.offersRead(state) : { count: 0, fresh: 0 };
    html.push('<div class="pad" style="margin-top:2px"><div class="seg">' +
      '<button class="' + (sub === 'today' ? 'on' : '') + '" data-action="desk-sub" data-sub="today">Today</button>' +
      '<button class="' + (sub === 'offers' ? 'on' : '') + '" data-action="desk-sub" data-sub="offers">Offers' +
        (offersRead.count ? '<span class="badge">' + offersRead.count + '</span>' : '') + '</button>' +
      '<button class="' + (sub === 'building' ? 'on' : '') + '" data-action="desk-sub" data-sub="building">Building</button>' +
      '<button class="' + (sub === 'content' ? 'on' : '') + '" data-action="desk-sub" data-sub="content">Content</button>' +
      '<button class="' + (sub === 'record' ? 'on' : '') + '" data-action="desk-sub" data-sub="record">Record</button>' +
      '</div></div>');
    if (sub === 'record') return html.join('') + renderRecord(state);
    if (sub === 'building') return html.join('') + renderBuilding(state);
    if (sub === 'content') return html.join('') + renderContent(state);
    if (sub === 'offers') return html.join('') + renderOffers(state, offersRead);

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
      '<span class="chip">trust: ' + KP.trustBand(state.trust) + '</span>' +
      '</div></div>');

    // the red weeks (v0.11.0, §86): the count beside the directive — the
    // one clock that ends the company, legible the whole way
    if (KP.redRead) {
      const red = KP.redRead(state);
      if (red.weeks > 0 || red.arrears > 0) {
        const R = KP.C.RED;
        html.push('<div class="objective" style="margin-top:10px;border-color:color-mix(in srgb,var(--danger,#e05a5a) 60%,var(--line))">' +
          '<div class="o-from" style="color:var(--danger,#e05a5a)">The red weeks · ' + UI.esc(red.word) + '</div>' +
          '<div class="o-text">' + red.weeks + ' of ' + R.weeksToDissolve + ' weeks behind' +
          (red.arrears > 0 ? ' · ' + red.arrears + ' owed to the building — every won that arrives pays it first' : ' · the arrears cleared; a clean week cools the count by one') +
          (red.finalWeek != null ? '. The last statement is dated ' + UI.esc(KP.weekLabel(red.finalWeek).text) + ' unless the arrears clear.' : '.') + '</div>' +
          '<div class="o-meta"><span class="chip hot">' + (red.weeks >= R.creditorsAt ? 'the chairs are taking the calls' : red.weeks >= R.meetingAt ? 'morale draining weekly' : 'the memo is on file') + '</span></div></div>');
      }
    }

    // the season, televised (v0.11.4, §95): while somebody of ours is on the air
    if (state.season && state.season.status === 'airing') {
      const s = state.season;
      const ours = KP.seasonOurs(state).filter(c => !c.eliminatedWeek);
      if (ours.length) {
        const line = KP.seasonLine(state);
        const rows = ours.map(c => {
          const p = state.people[c.personId];
          const rk = c.ranks && c.ranks.length ? c.ranks[c.ranks.length - 1] : null;
          const pv = c.ranks && c.ranks.length > 1 ? c.ranks[c.ranks.length - 2] : null;
          return UI.esc(KP.displayName(p)) + (rk ? ' is ' + KP.ordinal(rk) + (pv != null ? (rk < pv ? ' (▲' + (pv - rk) + ')' : rk > pv ? ' (▼' + (rk - pv) + ')' : ' (—)') : '') : ' awaits the first reveal');
        });
        html.push('<div class="objective" style="margin-top:10px;border-color:color-mix(in srgb,var(--gold) 50%,var(--line))">' +
          '<div class="o-from" style="color:var(--gold)">On the air · ' + UI.esc(s.show) + ' · episode ' + (state.week - s.startWeek) + ' of ' + (s.finaleWeek - s.startWeek) + '</div>' +
          '<div class="o-text">' + rows.join('; ') + (line ? '. The line falls at ' + KP.ordinal(line) + '.' : '.') + '</div>' +
          '<div class="o-meta"><span class="chip">' + UI.esc(KP.seasonMission(state) || 'the week') + '</span>' +
          (s.fanPick && state.people[s.fanPick] ? '<span class="chip gold">the public’s pick: ' + UI.esc(KP.publicGiven(state.people[s.fanPick])) + '</span>' : '') +
          '<span class="chip">the board is on the Industry tab</span></div></div>');
      }
    }

    // the road (v0.11.7, §98): one card per touring group, the season's shape —
    // the scale and leg, the next stop before it plays, the room in words,
    // last night's band, the counts, the night the road ends
    if (KP.tourRoadRead) {
      KP.groups(state).forEach(g => {
        const rd = g.tour ? KP.tourRoadRead(state, g) : null;
        if (!rd) return;
        html.push('<div class="objective" style="margin-top:10px;border-color:color-mix(in srgb,var(--gold) 50%,var(--line))">' +
          '<div class="o-from" style="color:var(--gold)">On the road · ' + UI.esc(g.name) + '</div>' +
          '<div class="o-text">' + UI.esc(rd.scale) + ' · leg ' + (rd.legIdx + 1) + '/' + rd.legs.length + (rd.legLabel ? ' · ' + UI.esc(rd.legLabel) : '') +
          (rd.nextStop ? ' · next: ' + UI.esc(rd.nextStop) + ', ' + UI.esc(KP.weekLabel(rd.nextWeek).text) + ' · ' + UI.esc(rd.demandWord) : ' · the leg just closed') +
          (rd.lastNight ? ' · last night: ' + UI.esc(rd.lastNight) : '') + '</div>' +
          '<div class="o-meta"><span class="chip gold">' + rd.soldOut + ' sold out · ' + rd.encores + ' second night' + (rd.encores === 1 ? '' : 's') + '</span>' +
          (rd.soft ? '<span class="chip hot">' + rd.soft + ' soft</span>' : '') +
          (rd.pickSwapped ? '<span class="chip">the fandom’s pick is in the setlist</span>' : '') +
          '<span class="chip">home ' + UI.esc(KP.weekLabel(rd.endWeek).text) + '</span></div></div>');
      });
    }
    // the last year (v0.11.10, §101): one card per member on her farewell lap —
    // the date, how the fans are told, and where her last era stands. A
    // promise made at the renewal table shows as one, and turns red when no
    // record can land in time to keep it.
    if (KP.farewellRead) {
      KP.farewellRead(state).forEach(r => {
        const p = state.people[r.personId];
        const g = r.groupId ? KP.groupById(state, r.groupId) : null;
        html.push('<div class="objective" style="margin-top:10px;border-color:color-mix(in srgb,var(--magenta) 50%,var(--line));cursor:pointer" data-action="open-dossier" data-id="' + p.id + '">' +
          '<div class="o-from" style="color:var(--magenta)">The last year · ' + UI.esc(KP.displayName(p)) + (g ? ' · ' + UI.esc(g.name) : '') + '</div>' +
          '<div class="o-text">' + UI.esc(KP.fillPro('{Pos} contract ends ', p) + KP.weekLabel(r.ends).text) + ' · ' + UI.esc(r.toldWord) +
          (r.eraWord ? ' · ' + UI.esc(r.eraWord) : '') + '</div>' +
          '<div class="o-meta"><span class="chip">' + r.weeksLeft + ' week' + (r.weeksLeft === 1 ? '' : 's') + ' left</span>' +
          (r.promise ? (r.era === 'late' ? '<span class="chip hot">the promised last era will not happen</span>'
            : r.era === 'landed' ? '<span class="chip gold">the promise at the table: kept when ' + UI.esc(KP.pro(p).she) + ' goes</span>'
            : '<span class="chip gold">promised at the table: a last era</span>') : '') +
          '</div></div>');
      });
    }
    // the last record (v0.11.11, §102): an act whose ending is announced and
    // owed — where the record stands, and the date it must be locked by
    if (KP.endingRead) {
      KP.endingRead(state).forEach(r => {
        const g = KP.groupById(state, r.groupId);
        if (!g) return;
        html.push('<div class="objective" style="margin-top:10px;border-color:color-mix(in srgb,var(--magenta) 50%,var(--line));cursor:pointer" data-action="open-grouppage" data-id="' + g.id + '">' +
          '<div class="o-from" style="color:var(--magenta)">The last record · ' + UI.esc(g.name) + '</div>' +
          '<div class="o-text">Announced ' + UI.esc(KP.weekLabel(r.since).text) + ' · ' + UI.esc(r.word) + '</div>' +
          '<div class="o-meta">' +
          (r.stage === 'open' ? '<span class="chip' + (r.weeksLeft <= 6 ? ' hot' : '') + '">' + r.weeksLeft + ' week' + (r.weeksLeft === 1 ? '' : 's') + ' to lock it</span>' : '') +
          '<span class="chip gold">' + UI.esc(g.type === 'solo' ? 'the chapter' : 'the act') + ' concludes when that era closes</span>' +
          '</div></div>');
      });
    }
    // Japan (v0.11.7, §98): the in-country weeks, read beside the road
    if (KP.japanAwayRead) {
      KP.groups(state).forEach(g => {
        const jr = g.jpAway ? KP.japanAwayRead(state, g) : null;
        if (!jr) return;
        html.push('<div class="objective" style="margin-top:10px;border-color:color-mix(in srgb,var(--gold) 50%,var(--line))">' +
          '<div class="o-from" style="color:var(--gold)">In Japan · ' + UI.esc(g.name) + '</div>' +
          '<div class="o-text">' + jr.weeksLeft + ' of ' + jr.weeksTotal + ' week' + (jr.weeksTotal === 1 ? '' : 's') + ' left · ' + UI.esc(jr.lane) +
          (jr.partner ? ' · with ' + UI.esc(jr.partner) : '') + (jr.moment ? '. ' + UI.esc(jr.moment) : '') + '</div></div>');
      });
    }

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
      // the pitch upstairs → the Groups tab (v0.10.41, §89 D15)
    }

    // the stage door (v0.8.0): EVERY held scene renders through this one
    // rail — the meeting today, the office door and the renewal table
    // tomorrow. New conversations never add cards here again.
    // the one desk (v0.10.41, §89 D15): the offers wait on the same rail —
    // the booking pile, the brand offers and the casting calls are answers
    // owed too. One kicker, one list, decisions first.
    // the offers tab (v0.11.6, §97): the market's asks — the pile, the
    // brands, the bills and the broadcasters' invitations — moved to their
    // own tab; Today keeps the decisions (the people, the tables, the money)
    // and says in one line how many offers wait
    const rail = [];
    (state.scenes || []).forEach(sc => {
      if (KP.offerSceneKinds && KP.offerSceneKinds.includes(sc.kind)) return;
      rail.push(sceneCard(state, sc));
    });
    if (rail.length) {
      html.push('<div class="kicker">Waiting on your answer</div>');
      html.push(rail.join(''));
    }
    if (offersRead.count) {
      html.push('<div class="pad" style="font-size:.76rem;color:var(--gold);margin-top:10px;cursor:pointer" data-action="desk-sub" data-sub="offers">' +
        offersRead.count + ' offer' + (offersRead.count === 1 ? '' : 's') + ' on the table' +
        (offersRead.fresh ? ' — ' + offersRead.fresh + ' new this week' : '') + ' — the Offers tab.</div>');
    }
    // sponsorships and second jobs running → her file's Career tab (§89 C);
    // booked stages → the calendar strip and the books → The record (D15)

    // the building (v0.10.6; the directory tab v0.10.15; one line since
    // v0.10.41, §89 D15): Today says only that a chair is open — the
    // files, the mirror and the verbs live on the tab
    if (KP.staffSeats) {
      const S = KP.staffSeats(state);
      const open = KP.C.HIRES.SEATS.filter(seat => !S[seat.id] && (!KP.chairOpenable || KP.chairOpenable(state, seat.id)));
      const line = state.staffSearch
        ? 'A posting is up — somebody takes the meeting within the week.'
        : open.length
          ? open.length + ' chair' + (open.length === 1 ? '' : 's') + ' open: ' + open.map(seat => UI.esc(seat.label)).join(', ') + ' — the help-wanted is on The building tab.'
          : null;
      if (line) html.push('<div class="pad" style="font-size:.76rem;color:var(--gold);margin-top:10px;cursor:pointer" data-action="desk-sub" data-sub="building">' + line + '</div>');
    }

    // the grind (v0.9.37, §76 E): the era desk — a locked release is a
    // campaign to RUN, not a date to wait for
    KP.groups(state).filter(g => g.prep && !g.retiredWeek).forEach(g => {
      const c = g.prep.campaign || { momentum: 0, worked: 0 };
      const P = KP.C.FAME.PUSHES;
      const pushedThisWeek = c.lastPush === state.week;
      const fame = KP.fameRead ? KP.fameRead(state) : 1;
      html.push('<div class="kicker">The campaign · ' + UI.esc(g.name) + '</div>' +
        '<div class="war-card held"><div class="w-flag">Release ' + UI.esc(KP.weekLabel(g.prep.scheduledWeek).text) +
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
          const fitWord = KP.promoFitWord ? KP.promoFitWord(g.prep.conceptId, k) : null;   // marketing fit (v0.10.38)
          return '<button class="btn small' + (disabled ? '' : ' primary') + '"' +
            (disabled ? ' disabled' : '') + (fitWord ? ' title="' + UI.esc(fitWord) + '"' : '') +
            ' data-action="campaign-push" data-group="' + g.id + '" data-kind="' + k + '">' +
            UI.esc(P[k].label) + ' · ' + P[k].cost + (fitWord ? (fitWord === 'built for this record' ? ' ★' : ' ✕') : '') + '</button>';
        }).join('') +
        '</div>' +
        (KP.promoFitSummary ? (() => {
          const f = KP.promoFitSummary(g.prep.conceptId);
          return '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:6px">The marketing seat reads the fit: ★ built for this record, ✕ the wrong tool. A push is a match, not a budget line.</div>';
        })() : '') +
        '</div>');
    });

    // the calendar strip and the radar card → The record and the Talent roster (v0.10.41, §89 D15)

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
            gate.honors.trophies + ' trophies and ' + gate.honors.years + ' years of your work. Walk, and everything you built stays behind — the groups, the trainees, the staff — as the competition. This is not reversible.</div>' +
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
    // the spotlight (v0.10.29, §89 B): this week's person-moments, up
    // close — the card that replaced 70 untrimmable notes a year
    const spot = KP.spotlightThisWeek ? KP.spotlightThisWeek(state) : [];
    if (spot.length) {
      html.push('<div class="kicker">Up close</div>');
      spot.forEach(m => {
        const p = state.people[m.personId];
        if (!p) return;
        html.push('<div class="card" data-action="open-dossier" data-id="' + p.id + '" style="display:flex;gap:12px;align-items:flex-start">' +
          UI.portrait(p, 'sm') +
          '<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:.9rem">' + UI.esc(KP.displayName(p)) +
          (m.choice ? ' <span class="chip">the call is on the Desk</span>' : '') + '</div>' +
          '<div style="font-size:.82rem;line-height:1.45;margin-top:4px">' + UI.esc(m.text) + '</div></div></div>');
      });
    }
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
  // ---- the building directory (v0.10.15): the staff, on cards ----------
  // Everything the file legitimately knows — the interview read, the
  // résumé, the tenure, the industry's word — and NOTHING the fog keeps.
  const SEAT_BLURBS = {
    vocal: 'runs the vocal room — what the practice weeks actually buy',
    dance: 'runs the dance room — what the practice weeks actually buy',
    perf: 'runs the rehearsal room before every stage',
    scout: 'decides how far the company’s name reaches when it looks for people',
    anr: 'sits over the demo sheet — what lands on it, and how it is heard',
    marketing: 'decides what a campaign push actually buys',
    producer: 'writes the company’s own records — no fee, nobody else’s ghost, and their lane is their lane',
    writer: 'writes the company’s own lyrics — the themes they own, free, for every room in the building',
    producer2: 'writes the company’s records from a second lane — the house stops being one sound',
    writer2: 'writes the company’s lyrics from a second set of themes — more rooms get a lyric that fits',
  };
  // ---- the content desk (v0.10.18): the company account ----------------
  // The law of the menu: only what is actually happening can be filmed —
  // and a locked topic says why, in words.
  function renderContent(state) {
    const html = [];
    const led = KP.contentLedger(state);
    const posted = state.contentPostWeek === state.week;
    html.push('<div class="pad" style="font-size:.74rem;color:var(--ink-dim);margin-top:4px">' +
      'The ' + UI.esc(state.company.short) + ' official account. One upload a week, filmed in-house: the menu only offers what is actually happening in this building — no tour vlog while the van is parked. The archive is an asset; somebody will price it one day.</div>');
    html.push('<div class="card"><div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px">' +
      '<span style="font-weight:800">' + UI.esc(state.company.short) + ' official</span>' +
      '<span style="font-size:.76rem;color:var(--ink-dim)">' + (led.posted || 0) + ' upload' + (led.posted === 1 ? '' : 's') +
      ' · ' + KP.fmtCount(led.views || 0) + ' lifetime views' +
      ((led.hits || 0) ? ' · ' + led.hits + ' broke containment' : '') + '</span></div>' +
      '<div style="font-size:.72rem;color:var(--ink-dim);margin-top:4px">The ad meter: ' +
      KP.fmtCount(state.adViews || 0) + ' views banked · pays ' + '1 per ' +
      KP.fmtCount(KP.C.CONTENT.adViewsPerWon) + ' at each quarterly close' +
      ((led.adPaid || 0) ? ' · ' + led.adPaid + ' earned lifetime' : ' · nothing settled yet') + '</div>' +
      (posted ? '<div style="font-size:.74rem;color:var(--gold);margin-top:5px">This week’s upload is out. The editor is rendering feelings.</div>' : '') +
      '</div>');
    // the menu: the open topics, and the locked ones folded into one
    // line that says why on request (v0.10.41, §89 D15)
    const topics = KP.contentTopics(state);
    topics.filter(t => t.open).forEach(t => {
      html.push('<div class="card" style="padding:11px">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap">' +
        '<span style="font-weight:800">' + UI.esc(t.label) + '</span>' +
        '<button class="btn small" data-action="content-post" data-topic="' + t.id + '"' +
        (posted || state.budget < t.cost ? ' disabled' : '') + '>' +
        (t.cost ? 'Film · ' + t.cost : 'Post · free') + '</button></div>' +
        '<div style="font-size:.74rem;color:var(--ink-dim);margin-top:4px">' + UI.esc(t.blurb) + '</div></div>');
    });
    const locked = topics.filter(t => !t.open);
    if (locked.length) {
      const show = !!(KP.App && KP.App.contentShowLocked);
      html.push('<div class="card" style="padding:11px">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap">' +
        '<span style="font-weight:800;color:var(--ink-dim)">' + locked.length + ' topic' + (locked.length === 1 ? '' : 's') + ' locked</span>' +
        '<button class="btn small ghost" style="border:1px solid var(--line)" data-action="content-locked-toggle">' + (show ? 'Hide why' : 'Why') + '</button></div>' +
        (show
          ? locked.map(t => '<div style="font-size:.74rem;color:var(--ink-dim);margin-top:6px"><b>' + UI.esc(t.label) + '</b> — ' + UI.esc(t.reason) + '</div>').join('')
          : '<div style="font-size:.72rem;color:var(--ink-dim);margin-top:4px">Only what is actually happening in this building can be filmed. Each lock says why, on request.</div>') +
        '</div>');
    }
    // the archive
    const cat = (state.contentCatalog || []).slice(-8).reverse();
    if (cat.length) {
      html.push('<div class="pad" style="margin:12px 0 2px;font-size:.74rem;color:var(--ink-dim)">The archive — most recent first.</div>');
      cat.forEach(v => {
        html.push('<div class="card" style="padding:10px">' +
          '<div style="font-size:.8rem">' + UI.esc(v.line) + '</div>' +
          '<div style="font-size:.72rem;color:var(--ink-dim);margin-top:4px">' +
          UI.esc(KP.weekLabel(v.week).text) + ' · ' + KP.fmtCount(v.views) + ' views' +
          (v.hit ? ' · <span class="chip hot">broke containment</span>' : '') + '</div></div>');
      });
    }
    // the member channels (v0.10.2 machinery, finally visible)
    const channels = (state.roster || []).map(id => state.people[id])
      .filter(p => p && p.broadcast);
    html.push('<div class="pad" style="margin:12px 0 2px;font-size:.74rem;color:var(--ink-dim)">The personal channels — their voices, their numbers. The company account shares the building, not the mic.</div>');
    if (!channels.length) {
      html.push('<div class="card"><div style="font-size:.76rem;color:var(--ink-dim)">Nobody holds a personal WeCast channel yet. The asks come through the Desk when somebody wants the mic.</div></div>');
    }
    channels.forEach(p => {
      html.push('<div class="card" style="padding:11px">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap">' +
        '<span style="font-weight:800">' + UI.esc(KP.displayName(p)) + '</span>' +
        '<span style="font-size:.76rem;color:var(--ink-dim)">' + KP.fmtCount(KP.socialOf(state, p)) + ' followers</span></div>' +
        '<div style="font-size:.74rem;color:var(--ink-dim);margin-top:4px">Channel since ' + UI.esc(KP.weekLabel(p.broadcast.since).text) +
        ' · ' + (p.broadcast.uploads || 0) + ' upload' + (p.broadcast.uploads === 1 ? '' : 's') + '</div>' +
        '<div style="margin-top:5px">' +
        (p.flags.mediaTrained ? '<span class="chip">media-trained</span>' : '') +
        (p.flags.castChilled && state.week < p.flags.castChilled ? '<span class="chip hot">reprimanded — quiet</span>' : '') +
        '</div></div>');
    });
    return html.join('');
  }

  function renderBuilding(state) {
    const html = [];
    const S = KP.staffSeats ? KP.staffSeats(state) : {};
    const HR = KP.C.HIRES;
    const searchBusy = !!state.staffSearch ||
      (state.scenes || []).some(sc => sc.kind === 'theInterview');
    // the mirror (v0.10.40, §88 E): the manager's shadow, said out loud
    if (KP.mirrorLine) {
      html.push('<div class="card" style="border-color:var(--gold)"><div style="font-weight:800;font-size:.84rem">The mirror</div>' +
        '<div style="font-size:.78rem;margin-top:4px;line-height:1.5">' + UI.esc(KP.mirrorLine(state)) + '</div>' +
        '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:6px">Read from what you actually did to the people in this building — the ledger each of them keeps, added up. It changes which questions they bring you, and how soon.</div></div>');
    }
    html.push('<div class="pad" style="font-size:.74rem;color:var(--ink-dim);margin-top:4px">' +
      'Ten chairs — the second studio chairs open when the first prove out. The file on each shows who they are, where they were, and what the industry says — never what they are worth. That part costs a year, and it never prints.</div>');
    if (state.staffSearch) {
      const seat = HR.SEATS.find(x => x.id === state.staffSearch.seatId);
      html.push('<div class="card" style="border-color:var(--gold)"><div style="font-size:.78rem;color:var(--gold)">A posting is up for the ' +
        UI.esc(seat ? seat.label : 'open') + ' chair — somebody takes the meeting within the week.</div></div>');
    }
    if ((state.scenes || []).some(sc => sc.kind === 'theInterview')) {
      html.push('<div class="card" style="border-color:var(--gold)"><div style="font-size:.78rem;color:var(--gold)">A candidate is in the building — the meeting is waiting on Today.</div></div>');
    }
    HR.SEATS.forEach(seat => {
      const st = S[seat.id];
      const cooled = state.week - ((state.seatSearchCooldowns || {})[seat.id] || -999) >= HR.searchCooldown;
      if (!st && KP.chairOpenable && !KP.chairOpenable(state, seat.id)) {
        // the second chair (v0.10.39): not open yet — the first has to prove out
        html.push('<div class="card" style="opacity:.75">' +
          '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap">' +
          '<span style="font-weight:800">' + UI.esc(seat.label) + '</span>' +
          '<span class="chip">not yet</span></div>' +
          '<div style="font-size:.76rem;color:var(--ink-dim);margin-top:5px">' + UI.esc(KP.chairOpenReason(state, seat.id)) + '</div></div>');
        return;
      }
      if (!st) {
        html.push('<div class="card">' +
          '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap">' +
          '<span style="font-weight:800">' + UI.esc(seat.label) + '</span>' +
          '<span class="chip">chair open</span></div>' +
          '<div style="font-size:.76rem;color:var(--ink-dim);margin-top:5px">Whoever sits here ' +
          UI.esc(SEAT_BLURBS[seat.id] || 'runs a room') + '. Right now, nobody does — the room runs at whatever baseline is.</div>' +
          (!searchBusy && cooled
            ? '<div style="margin-top:9px"><button class="btn small" data-action="seat-search" data-id="' + seat.id + '">Help wanted · ' + HR.searchCost + '</button></div>'
            : !cooled ? '<div style="font-size:.68rem;color:var(--ink-dim);margin-top:7px">The posting for this chair is still warm.</div>' : '') +
          '</div>');
        return;
      }
      const read = KP.staffFileRead ? KP.staffFileRead(st) : null;
      const weeks = state.week - (st.since || 1);
      const made = KP.seatMade(st).length;   // the records made for this house (v0.11.40, §132)
      const credit = KP.seatCreditSaid(KP.seatCredit(state, st));
      const sev = Math.max(HR.severanceMin,
        Math.round((HR.hireCost[st.tier] || HR.hireCost.working) * HR.severanceMult));
      const knownFor = st.knownForTag
        ? (HR.SEATS.find(x => x.id === st.knownForTag) || seat).label : null;
      html.push('<div class="card">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap">' +
        '<span style="font-weight:800">' + UI.esc(st.name) + '</span>' +
        '<span style="font-size:.72rem;color:var(--ink-dim)">' + UI.esc(seat.label) + '</span></div>' +
        '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:5px">' +
        '<span class="chip">' + UI.esc(st.tier) + '</span>' +
        (knownFor ? '<span class="chip">known for ' + UI.esc(knownFor) + ' work</span>' : '') +
        (st.lane ? '<span class="chip cool">lanes: ' + UI.esc(KP.producerLanes(st).map(l => (KP.conceptById(l) || { label: l }).label.toLowerCase()).join(' / ')) + '</span>' : '') +
        (st.themes ? '<span class="chip cool">themes: ' + UI.esc(st.themes.map(t => (KP.themeById(t) || { label: t }).label.toLowerCase()).join(', ')) + '</span>' : '') +
        (made ? '<span class="chip">' + made + ' record' + (made > 1 ? 's' : '') + ' for this house</span>' : '') +
        '<span class="chip">' + (weeks < 2 ? 'just arrived' : weeks + ' weeks in the chair') + '</span>' +
        '</div>' +
        (read ? '<div style="font-size:.76rem;line-height:1.5;margin-top:7px">The read across the table: ' +
          UI.esc(read.warmth) + '; ' + UI.esc(read.candor) + '. By every account, ' + UI.esc(read.style) + '.</div>' : '') +
        ((st.resume || []).length
          ? '<div style="font-size:.72rem;color:var(--ink-dim);margin-top:6px">The résumé: ' +
            UI.esc(st.resume.join('; ')) + '.</div>' : '') +
        // the credit (v0.11.41, §133): what this house did after they sat, in the résumé's own voice
        (credit ? '<div class="seat-credit" style="font-size:.72rem;color:var(--ink-dim);margin-top:4px">' + UI.esc(credit) + '</div>' : '') +
        '<div style="font-size:.72rem;color:var(--ink-dim);margin-top:4px">This chair ' + UI.esc(SEAT_BLURBS[seat.id] || 'runs a room') + '.</div>' +
        '<div style="display:flex;gap:6px;margin-top:9px">' +
        '<button class="btn small ghost" style="border:1px solid var(--line)" data-action="seat-release" data-id="' + seat.id + '">Let go · ' + sev + '</button>' +
        (!searchBusy && cooled
          ? '<button class="btn small" data-action="seat-search" data-id="' + seat.id + '">Help wanted · ' + HR.searchCost + '</button>' : '') +
        '</div></div>');
    });
    html.push('<div class="pad" style="font-size:.68rem;color:var(--ink-dim);margin-bottom:12px">The résumé says where they were. The industry file says the price. What they actually do to your rooms, only the months say — and never in a number. That is the whole job of judging them.</div>');
    return html.join('');
  }

  // the books (v0.10.1; on The record since v0.10.41, §89 D15): the
  // quarterly settlement reads beside the runway and the promises
  function booksCard(state) {
    const stmt = KP.lastStatement ? KP.lastStatement(state) : null;
    if (!stmt) return '';
    // the distributor, the fanclubs and the running quarter (v0.11.5, §96
    // wiring): read-only — KP.distributorOf mints on first call, so the card
    // reads the field (the regionsRead law); the quarter sums the streams
    const dist = state.distributor || null;
    const distTier = dist ? (KP.C.DIST.TIERS[dist.tier] || null) : null;
    const clubs = KP.groups(state).filter(g => g.debuted && !g.retiredWeek && g.fanclub);
    const CLUB_WORDS = { gentle: 'warm-priced', standard: 'market-rate', steep: 'steep-priced' };
    const cur = (state.books || {}).cur || {};
    const running = Math.round(Object.keys(cur).reduce((s, k) => s + (Number(cur[k]) || 0), 0));
    const wpy = KP.C.WEEKS_PER_YEAR;
    return '<div class="kicker">The books · Q' + stmt.quarter + ', year ' + stmt.year + '</div>' +
      '<div class="card" style="font-size:.78rem;line-height:1.6">' +
      stmt.lines.map(l => '<div>' + UI.esc(l) + '</div>').join('') +
      '<div>Operations & payroll: ' + (stmt.other > 0 ? '+' : '') + stmt.other + '</div>' +
      '<div style="margin-top:6px;font-weight:600;color:' + (stmt.net >= 0 ? 'var(--gold)' : 'var(--magenta)') + '">NET: ' +
      (stmt.net > 0 ? '+' : '') + stmt.net + '</div>' +
      KP.groups(state).filter(g => g.debuted && g.recoup && !g.retiredWeek).map(g =>
        '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:4px">' + UI.esc(g.name) + ': ' +
        (g.recoup.settledWeek != null
          ? 'settled · paid out ' + g.recoup.paid + ' to date'
          : 'unrecouped · ' + Math.max(0, Math.round(g.recoup.debt)) + ' on the ledger') + '</div>').join('') +
      (distTier
        ? '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:6px">Distribution: ' + UI.esc(distTier.label) +
          (dist.advanceOwed > 0 ? ' · advance outstanding ' + Math.round(dist.advanceOwed) : '') + '</div>' : '') +
      clubs.map(g => {
        const since = g.fanclub.since || 1;
        const next = state.week > since ? since + wpy * Math.ceil((state.week - since) / wpy) : since + wpy;
        return '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:4px">' + UI.esc(g.name) + ': ' +
          UI.esc(CLUB_WORDS[g.fanclub.tier] || g.fanclub.tier || 'standard') + ' club since ' + UI.esc(KP.weekLabel(since).text) +
          ' · dues renew ' + UI.esc(KP.weekLabel(next).text) + '</div>';
      }).join('') +
      '<div style="font-size:.72rem;margin-top:6px;color:' + (running >= 0 ? 'var(--gold)' : 'var(--magenta)') + '">This quarter so far: ' +
      (running > 0 ? '+' : '') + running + '</div>' +
      '</div>';
  }
  // the calendar strip (on The record since v0.10.41, §89 D15): the
  // clocks live with the promises on the clock
  function calendarStrip(state) {
    const up = KP.upcoming(state);
    if (!up.length) return '';
    const html = ['<div class="kicker">Coming up</div><div class="calstrip">'];
    up.forEach(u => {
      const uwl = KP.weekLabel(u.week);
      const inW = u.week - state.week;
      html.push('<div class="calcard' + (u.hot ? ' hot' : '') + (u.clash ? ' clash' : '') + '">' +
        '<div class="c-when">' + UI.esc(uwl.month) + ' · wk ' + uwl.weekOfMonth +
        (inW === 0 ? ' · now' : ' · in ' + inW + 'w') + '</div>' +
        '<div class="c-what">' + UI.esc(u.label) + '</div></div>');
    });
    html.push('</div>');
    return html.join('');
  }

  // the company's own file (v0.11.29, §121): the page behind the row on The record
  const yearsWord = weeks => { const y = Math.floor(weeks / KP.C.WEEKS_PER_YEAR); return y < 1 ? 'in the first year' : y === 1 ? 'one year in' : y + ' years in'; };
  UI.renderCompany = function (state) {
    const f = KP.companyFile(state);
    const row = c => '<div class="mail"><span class="m-tag">' + UI.esc(KP.weekLabel(c.week).text) + '</span><div>' + UI.esc(c.text) + '</div></div>';
    const past = f.chapters.filter(c => c.before), mine = f.chapters.filter(c => !c.before);
    const years = state.years || [];
    const n = (x, one, more) => x + ' ' + (x === 1 ? one : more);
    const yearRow = a => '<div class="mail yr-row"><span class="m-tag">Y' + a.year + '</span><div>' + UI.esc([
      n(a.records, 'record', 'records'), n(a.trophies, 'trophy', 'trophies'),
      a.honors ? n(a.honors, 'honor', 'honors') + (a.daesang ? ', the daesang among them' : '') : null,
      a.debuts ? n(a.debuts, 'debut', 'debuts') : null,
      a.till != null ? 'till ' + a.till : null,
    ].filter(Boolean).join(' · ')) + '</div></div>';
    return '<div class="card co-file"><div class="kicker" style="margin-top:0">The company</div>' +
      '<div style="font-size:1.25rem;font-weight:800;line-height:1.15">' + UI.esc(f.name) + '</div>' +
      '<div style="font-size:.8rem;color:var(--ink-dim);margin-top:6px">' + UI.esc(f.manager.name) + ' · ' + UI.esc(f.manager.title) + ' · ' + yearsWord(f.manager.weeks) + '</div></div>' +
      // the years it has closed (v0.11.32, §124), the newest first
      (years.length ? '<div class="kicker">The years</div>' + years.slice().reverse().map(yearRow).join('') : '') +
      '<div class="kicker">Under this desk</div>' + mine.slice().reverse().map(row).join('') +
      (past.length ? '<div class="kicker">Before this desk</div>' + past.slice().reverse().map(row).join('') : '');
  };

  function renderRecord(state) {
    const html = [];
    const claims = state.claims || [];
    {
      const f = KP.companyFile(state);
      html.push('<div class="card co-row" data-action="open-company" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px">' +
        '<div><div style="font-weight:700">' + UI.esc(f.name) + '</div>' +
        '<div style="font-size:.76rem;color:var(--ink-dim);margin-top:3px">' + UI.esc(f.manager.title) + ' · ' + yearsWord(f.manager.weeks) + ' · ' + f.chapters.length + ' chapter' + (f.chapters.length === 1 ? '' : 's') + ' on the file</div></div>' +
        '<span style="color:var(--gold);font-size:1.1rem">›</span></div>');
    }
    html.push(calendarStrip(state));
    // the red counter lives beside the books (v0.11.0, §86): one truth —
    // the clamps report what they swallowed, the counter reads the report
    if (KP.redOf) {
      const red = KP.redOf(state);
      if (red.total > 0 || red.arrears > 0) {
        const now = KP.redRead(state);
        html.push('<div class="kicker">The red weeks</div>' +
          '<div class="card" style="font-size:.78rem;line-height:1.6">' +
          '<div style="font-weight:600;color:' + (now.weeks > 0 ? 'var(--magenta)' : 'var(--gold)') + '">' +
          (now.weeks > 0 ? now.weeks + ' of ' + KP.C.RED.weeksToDissolve + ' weeks behind · ' + UI.esc(now.word) : 'Clean this week') + '</div>' +
          '<div>Owed to the building: ' + red.arrears + '</div>' +
          '<div style="color:var(--ink-dim)">Red weeks this career: ' + red.total + ' · longest run ' + red.peak + ' · arrears paid down ' + red.paid + '</div>' +
          (now.finalWeek != null ? '<div style="color:var(--magenta);margin-top:4px">The last statement is dated ' + UI.esc(KP.weekLabel(now.finalWeek).text) + '.</div>' : '') +
          (now.weeks > 0 ? (() => {
            // the honest moves (§86 A): release someone, end an act, sell the shelf, pitch if unburned
            const q = KP.shelfPrice ? KP.shelfPrice(state) : { ok: false };
            return '<div style="margin-top:8px;font-size:.74rem;color:var(--ink-dim)">The moves left: release someone (Talent), end an act (Groups), pitch the funds below — the deck prints on credit while the count runs' +
              (q.ok ? ', or sell the shelf.' : '.') + '</div>' +
              (q.ok ? '<div style="display:flex;gap:8px;margin-top:8px"><button class="btn small" data-action="sell-shelf">Sell the shelf · +' + q.price + '</button></div>' : '');
          })() : '') +
          '</div>');
      }
    }
    html.push(booksCard(state));
    const who = c => c.subject.kind === 'exec' ? (c.execName || state.executive.name)   // a promise to her own question names the chair it was made to (v0.11.27, §119)
      : c.subject.kind === 'idol' ? (state.people[c.subject.id || c.personId] ? KP.displayName(state.people[c.subject.id || c.personId]) : 'her')
      : c.subject.kind === 'fund' ? (c.fundName || 'the fund')
      : c.subject.kind;
    // ---- the runway (v0.10.19, §85): financing lives with the books ----
    if (KP.financeRead) {
      const f = state.financing || {};
      const open = KP.fundWindowOpen(state);
      const read = KP.financeRead(state);
      const busy = KP.financingBusy(state);
      const cooling = state.week - (f.lastPitchWeek || -999) < KP.C.FINANCE.pitchCooldown;
      html.push('<div class="kicker">The runway</div>');
      html.push('<div class="card" style="padding:12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap">' +
        '<span style="font-weight:800">Financing</span>' +
        '<span class="chip' + (open ? ' gold' : '') + '">' + (open ? 'mother-fund open' : 'window closed') + '</span></div>' +
        '<div style="font-size:.74rem;color:var(--ink-dim);margin-top:5px">What a fund can see: ' +
        UI.esc(read.words.join(', ')) + '. That is the entire pitch — the observables are the deck.</div>' +
        (f.board && state.week < f.board.until
          ? '<div style="font-size:.74rem;color:var(--gold);margin-top:5px">' + UI.esc(f.board.fund) + ' holds the board seat until ' + UI.esc(KP.weekLabel(f.board.until).text) + ' — twice the questions, twice the cost of a miss.</div>' : '') +
        (f.revShare && state.week < f.revShare.until
          ? '<div style="font-size:.74rem;color:var(--gold);margin-top:5px">' + UI.esc(f.revShare.fund) + ' takes ' + Math.round(f.revShare.pct * 100) + '% of gross until ' + UI.esc(KP.weekLabel(f.revShare.until).text) + ' — the toll line on every statement.</div>' : '') +
        '<div style="display:flex;gap:8px;margin-top:9px">' +
        '<button class="btn small" data-action="fund-pitch"' +
        (busy || cooling || (state.budget < KP.C.FINANCE.pitchCost && !(KP.redRead && KP.redRead(state).weeks > 0)) ? ' disabled' : '') + '>' +   // the deck prints on credit in the red weeks (§86; audit v0.11.3)
        (busy ? 'Committed' : cooling ? 'Deck is stale' : 'Pitch the funds · ' + KP.C.FINANCE.pitchCost) + '</button></div>' +
        (busy ? '<div style="font-size:.72rem;color:var(--ink-dim);margin-top:5px">' + UI.esc(busy) + '</div>' : '') +
        '</div>');
    }
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
      const WORDS = { soloPromise: (c.rung || 1) >= 2 ? 'the promised solo album — her name on the spine' : 'the promised solo, on a record',
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
          : c.resolved === 'void' ? '<span class="chip">set aside</span>'   // not judged: the act ended, the chair changed, the sheet was not held (v0.11.27, §119)
          : '<span class="chip hot">broken</span>';
        html.push('<div class="mail"><span class="m-tag">' + UI.esc(KP.weekLabel(c.resolvedWeek || c.week).text) + '</span>' +
          '<div><b>' + UI.esc(who(c)) + '</b>: ' + what(c) + ' ' + chip +
          (c.replyText ? '<div style="font-size:.78rem;font-style:italic;color:var(--ink-dim);margin-top:5px;line-height:1.45">' + UI.esc(c.replyText) + '</div>' : '') +
          '</div></div>');
      });
    }
    // the greenlights (v0.11.37, §129): what the chair gave this desk and what came of it, the newest first
    const lights = KP.greenlights(state).reverse();
    if (lights.length) {
      const LIGHT_CHIP = { met: '<span class="chip cool">kept</span>', open: '<span class="chip gold">open</span>', lapsed: '<span class="chip hot">left dark</span>' };
      html.push('<div class="kicker">The greenlights</div>');
      lights.forEach(e => {
        html.push('<div class="mail gl-row"><span class="m-tag">' + UI.esc(KP.weekLabel(e.week).text) + '</span>' +
          '<div><b>' + UI.esc(e.who) + '</b> ' + UI.esc(e.gave) + ' ' + LIGHT_CHIP[e.status] +
          '<div class="gl-came" style="font-size:.78rem;color:var(--ink-dim);margin-top:5px;line-height:1.45">' + UI.esc(e.came) + '</div>' +
          '</div></div>');
      });
    }
    // the annual review (v0.11.28, §120): what she said when the directors had gone, the newest first
    const reviews = (state.reviews || []).slice().reverse();
    if (reviews.length) {
      const BAND_CHIP = { trusted: 'chip gold', solid: 'chip cool', watched: 'chip', thin: 'chip hot', gone: 'chip hot' };
      html.push('<div class="kicker">The annual review</div>');
      reviews.forEach(r => {
        html.push('<div class="mail"><span class="m-tag">' + UI.esc(KP.weekLabel(r.week).text) + '</span>' +
          '<div><b>' + UI.esc(r.exec) + '</b> <span class="' + BAND_CHIP[r.band] + '">' + UI.esc(r.band) + '</span>' +
          '<div style="font-size:.78rem;font-style:italic;color:var(--ink-dim);margin-top:5px;line-height:1.45">“' + UI.esc(r.said) + '”</div>' +
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

})(typeof window !== 'undefined' ? window : globalThis);
