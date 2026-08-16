/* Groups tab: the group page (or the builder when none exists).
   Chemistry is observations; roles are decisions; the maknae is a fact. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};
  const UI = KP.UI;

  UI.renderGroups = function (state) {
    // the concluded chapters live below the living ones (0.9.18.2);
    // dissolved pre-debut projects leave no card — there was no era
    const all = KP.groups(state);
    const groups = all.filter(g => !g.retiredWeek);
    const gone = all.filter(g => g.retiredWeek && g.debuted);
    const archive = gone.length
      ? '<div class="kicker" style="margin-top:16px">Concluded</div>' +
        gone.map(g => archiveCard(state, g)).join('')
      : '';
    if (!groups.length) return renderNoGroup(state) + (state.project ? newLineupCard(state) : '') + archive;
    if (groups.length === 1) return UI.renderGroupPage(state, groups[0]) + newLineupCard(state) + archive;
    const html = [];
    groups.forEach(g => html.push(groupCard(state, g)));
    html.push(newLineupCard(state));
    html.push(archive);
    return html.join('');
  };

  function archiveCard(state, g) {
    const rels = (g.releases || []).length;
    const size = (g.finalLineup || []).length || g.members.length;
    return '<div class="card" style="opacity:.72"><b>' + UI.esc(g.name) + '</b>' +
      '<div style="font-size:.78rem;color:var(--ink-dim);margin-top:4px">Concluded ' +
      UI.esc(KP.weekLabel(g.retiredWeek).text) + ' · ' +
      (size === 1 ? 'solo act' : size + ' members') + ' · ' +
      rels + ' release' + (rels === 1 ? '' : 's') +
      (g.fandom ? ' · ' + UI.esc(g.fandom.name) + ' keeps the archive' : '') +
      '</div></div>';
  }

  function groupCard(state, g) {
    const promoting = g.debuted && state.week <= (g.promoUntil || 0);
    const status = g.debuted
      ? (g.prep ? 'Comeback in prep' : promoting ? 'Promoting' : g.hiatus ? 'On hiatus' : 'Active')
      : g.prep ? 'Debut in prep' : 'In development';
    return '<div class="group-hero" data-action="open-grouppage" data-id="' + g.id + '" style="cursor:pointer">' +
      '<div class="g-status">' + UI.esc(status) + '</div>' +
      '<div class="g-name" style="font-size:clamp(2rem,10vw,2.8rem)">' + UI.esc(g.name) + '</div>' +
      '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:6px">' +
      '<span class="chip">' + (g.type === 'solo' || g.members.length === 1 ? 'solo act' : g.members.length + ' members') + '</span>' +
      (g.debuted ? '<span class="chip ' + (g.popularity >= 58 ? 'hot' : '') + '">' + KP.popularityWord(g.popularity) + '</span>' : '') +
      ((g.releases || []).length ? '<span class="chip gold">' + g.releases.length + ' release' + (g.releases.length === 1 ? '' : 's') + '</span>' : '') +
      '</div></div>';
  }

  function newLineupCard(state) {
    const free = KP.freeTrainees(state).length;
    if (KP.devGroup(state)) return '';
    if (state.project) {
      const seeking = state.project.seeking.map(d => KP.C.TALENT_LABELS[d]).join(' + ');
      return '<div class="card" style="margin-top:14px"><b>Project open</b> — ' + state.project.locked.length +
        ' locked' + (seeking ? ', seeking ' + UI.esc(seeking) : '') + '. The free trainees are pushing.' +
        '<div style="margin-top:12px"><button class="btn primary" data-action="open-builder">Continue the lineup</button></div></div>';
    }
    if (free >= KP.C.GROUP.minMembers) {
      // the mandate (v0.9.19): the room being ready is half the equation —
      // the greenlight is the other half, and the card says which is missing
      const lit = KP.mandateFitting && KP.mandateFitting(state, { kind: 'group', gender: null, memberIds: [] });
      if (!lit) {
        return '<div class="card" style="margin-top:14px">The trainee room still has people waiting for their shot — ' + free + ' without a lineup. But no greenlight covers a new act: debuts come down from upstairs.' +
          '<div style="margin-top:12px"><button class="btn small" data-action="nav-desk">Pitch the board from the Desk</button></div></div>';
      }
      return '<div class="card" style="margin-top:14px">The trainee room still has people waiting for their shot — ' + free + ' without a lineup. The greenlight is open.' +
        '<div style="margin-top:12px"><button class="btn primary" data-action="open-builder">Propose a new lineup</button></div></div>';
    }
    if (free > 0) {
      return '<div class="card" style="margin-top:14px;color:var(--ink-dim);font-size:.82rem">' + free + ' trainee' + (free === 1 ? '' : 's') + ' without a lineup — a second group needs at least ' + KP.C.GROUP.minMembers + '. The scouting board is open.</div>';
    }
    return '';
  }

  function renderNoGroup(state) {
    const ready = KP.freeTrainees(state).length >= KP.C.GROUP.minMembers;
    const monthsLeft = KP.monthsUntil(state.week, state.objective.deadlineWeek);
    return '<div class="group-hero">' +
      '<div class="g-status">No group in development</div>' +
      '<div class="g-name" style="font-size:clamp(1.7rem,8vw,2.4rem)">The lineup<br>is the job.</div>' +
      '<div style="color:var(--ink-dim);font-size:.86rem;line-height:1.5;margin-top:8px">' +
      UI.esc(state.executive.name) + ' expects a 4–6 member girl group' +
      (state.objective.status === 'open' ? ' within ' + monthsLeft + ' months.' : '.') +
      ' The best five trainees are not automatically the best group.</div>' +
      '<div style="margin-top:16px"><button class="btn primary" data-action="open-builder"' + (ready ? '' : ' disabled') + '>Propose a lineup</button></div>' +
      (ready ? '' : '<div style="font-size:.72rem;color:var(--ink-dim);margin-top:8px">You need at least ' + KP.C.GROUP.minMembers + ' unassigned trainees.</div>') +
      '</div>';
  }

  UI.renderGroupPage = function (state, g) {
    // a closed chapter reads as a record, not a dashboard (0.9.18.2)
    if (g.retiredWeek) {
      const rels = (g.releases || []).length;
      const lineup = (g.finalLineup || []).map(id => state.people[id]).filter(Boolean);
      return '<div class="group-hero"><div class="g-status">Concluded · ' +
        UI.esc(KP.weekLabel(g.retiredWeek).text) + '</div>' +
        '<div class="g-name">' + UI.esc(g.name) + '</div>' +
        '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:6px">' +
        '<span class="chip">' + rels + ' release' + (rels === 1 ? '' : 's') + '</span>' +
        (g.fandom ? '<span class="chip">' + UI.esc(g.fandom.name) + ' keeps the archive</span>' : '') +
        '</div></div>' +
        (lineup.length ? '<div class="card">The final lineup: ' +
          lineup.map(p => UI.esc(KP.displayName(p))).join(', ') +
          ' — still with the company, on their own calendars.</div>' : '');
    }
    const members = g.members.map(id => state.people[id]);
    const html = [];
    const era = g.prep ? g.prep.conceptId : null;
    if (era) UI.setEra(era);

    const promoting = g.debuted && state.week <= (g.promoUntil || 0);
    html.push('<div class="group-hero">' +
      '<div class="g-status">' + (g.debuted
        ? (g.prep ? 'Comeback in preparation' : promoting ? 'Promoting' : g.hiatus ? 'On official hiatus' : 'Active · debuted ' + UI.esc(KP.weekLabel(g.debutWeek).text))
        : g.prep ? 'Debut in preparation' : 'In development') + '</div>' +
      '<div class="g-name">' + UI.esc(g.name) + '</div>' +
      '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:6px">' +
      '<span class="chip">' + (g.type === 'solo' || members.length === 1 ? 'solo act' : members.length + ' members') + '</span>' +
      (g.gen ? '<span class="chip">gen ' + g.gen + '</span>' : '') +
      (g.prep ? '<span class="chip cool">' + UI.esc(KP.conceptById(g.prep.conceptId).label) + '</span>' : '') +
      (g.debuted ? '<span class="chip ' + (g.popularity >= 58 ? 'hot' : '') + '">' + KP.popularityWord(g.popularity) + '</span>' : '') +
      (g.debuted && g.results ? '<span class="chip gold">' + UI.esc(g.results.receptionLabel) + '</span>' : '') +
      (g.gravity && !g.gravity.settled && state.people[g.gravity.personId]
        ? '<span class="chip hot">the clamor: ' + UI.esc(KP.publicGiven(state.people[g.gravity.personId])) + '</span>' : '') +
      // the bad blood (v0.9.21): the named rivalries ride the hero
      (KP.sceneRivalries ? KP.sceneRivalries(state, g.id).map(r =>
        '<span class="chip hot">vs ' + UI.esc(r.actName) + '</span>').join('') : '') +
      // the service (v0.9.23): who is away rides the hero too
      (function () {
        const away = members.filter(m => m.flags && m.flags.military).length;
        if (away) return '<span class="chip cool">' + away + ' in service</span>';
        if (g.servicePlan && members.some(m => m.gender === 'm' && !m.serviceDone)) {
          return '<span class="chip">service: ' + (g.servicePlan === 'together' ? 'together' : 'staggered') + '</span>';
        }
        return '';
      })() +
      '</div></div>');

    html.push('<div class="member-strip">');
    members.forEach(m => {
      if (g.type === 'solo') {
        html.push('<div class="member-cell" data-action="open-dossier" data-id="' + m.id + '">' +
          UI.portrait(m, 'md') +
          '<div class="mc-name">' + UI.esc(m.name.stage || m.name.given) + '</div>' +
          '<div class="mc-role">Solo</div></div>');
        return;
      }
      const roles = [];
      if (g.roles.leader === m.id) roles.push('Leader');
      if (g.roles.center === m.id) roles.push('Center');
      if (g.roles.mainVocal === m.id) roles.push('Main Vocal');
      if (g.roles.mainDancer === m.id) roles.push('Main Dancer');
      if (g.roles.mainRapper === m.id) roles.push('Main Rapper');
      if (g.maknae === m.id) roles.push('Maknae');
      html.push('<div class="member-cell" data-action="open-dossier" data-id="' + m.id + '">' +
        UI.portrait(m, 'md') +
        '<div class="mc-name">' + UI.esc(m.name.stage || m.name.given) + '</div>' +
        '<div class="mc-role">' + UI.esc(roles.join(' · ') || 'Member') + '</div></div>');
    });
    html.push('</div>');

    if (g.type !== 'solo') {
      html.push('<div class="pad" style="margin-top:2px"><button class="btn small ghost" style="border:1px solid var(--line)" data-action="open-roles" data-id="' + g.id + '">Edit roles</button></div>');
    }

    // chemistry observations + frictions with their handles
    // what the public remembers about this group (v0.6.0)
    const gNars = KP.narrativesFor(state, 'group', g.id)
      .concat(g.members.flatMap(id => KP.narrativesFor(state, 'idol', id)));
    if (gNars.length) {
      html.push('<div class="kicker">The narrative</div>');
      html.push('<div class="card">' + UI.narrativeLines(state, gNars) + '</div>');
    }

    // the fandom (v0.7.0): a name, a color, and a temperature
    if (g.fandom) {
      const f = g.fandom;
      html.push('<div class="kicker">The fandom</div>');
      html.push('<div class="pad" style="display:flex;gap:7px;flex-wrap:wrap">' +
        '<span class="chip gold">' + UI.esc(f.name) + '</span>' +
        '<span class="chip cool">' + UI.esc(f.color) + '</span>' +
        '<span class="chip">' + UI.esc(KP.popularityWord(g.popularity)) + ' · ' + UI.esc(KP.intensityWord(f.intensity)) + '</span>' +
        ((g.fandomGrudge || 0) >= 1 ? '<span class="chip clash">keeping receipts</span>' : '') +
        (g.lightstickWeek ? '<span class="chip">lightstick era</span>' : '') +
        '</div>');
      // the constituency (v0.9.6): the company gets a voice back
      const C = KP.C.CONSTITUENCY;
      html.push('<div class="pad" style="display:flex;gap:7px;flex-wrap:wrap;margin-top:6px">' +
        '<button class="btn small ghost" data-action="cafe-notice" data-id="' + g.id + '">Café notice</button>' +
        '<button class="btn small ghost" data-action="fan-meeting" data-id="' + g.id + '">Fan meeting · ' + C.fanMeetingCost + '</button>' +
        (!g.lightstickWeek ? '<button class="btn small ghost" data-action="lightstick" data-id="' + g.id + '">Launch the lightstick · ' + C.lightstickCost + '</button>' : '') +
        '</div>');
    } else if (KP.fandomEligible(state, g)) {
      const opts = KP.fandomNameOptions(state, g);
      html.push('<div class="kicker">The naming vote</div>');
      html.push('<div class="war-card held"><div class="w-flag">The fan cafés are voting</div>' +
        '<div class="w-text">The fanbase is big enough to want a name. The cafés have proposals; the company can back one, or let the vote run.</div>' +
        '<div class="w-actions" style="flex-wrap:wrap">' +
        opts.map((o, i) => '<button class="btn" data-action="fandom-name" data-id="' + g.id + '" data-choice="' + i + '">' + UI.esc(o) + '</button>').join('') +
        '<button class="btn primary" data-action="fandom-name" data-id="' + g.id + '" data-choice="-1">Let them decide</button>' +
        '</div></div>');
    }

    // honors (v0.7.0): what the year-end juries said
    if (g.honors && g.honors.length) {
      html.push('<div class="kicker">Honors</div>');
      html.push('<div class="pad" style="display:flex;gap:7px;flex-wrap:wrap">' +
        g.honors.map(h => '<span class="chip gold">' + UI.esc(KP.C.AWARDS.LABELS[h.category] || h.category) + ' · Y' + h.year + '</span>').join('') +
        '</div>');
    }

    // the creative direction (v0.6.7): the brief the producers pitch to
    {
      const dirId = g.concept || null;
      const idNar = KP.getNarrative(state, 'conceptIdentity', 'group', g.id);
      html.push('<div class="kicker">Creative direction</div>');
      html.push('<div class="pad">' +
        '<div style="display:flex;gap:7px;flex-wrap:wrap">' +
        '<button class="chip' + (!dirId ? ' hot' : '') + '" data-action="group-concept" data-id="' + g.id + '" data-concept="">Open field</button>' +
        KP.C.CONCEPTS.map(c => '<button class="chip' + (dirId === c.id ? ' hot' : '') + '" ' +
          'data-action="group-concept" data-id="' + g.id + '" data-concept="' + c.id + '">' + UI.esc(c.label) + '</button>').join('') +
        '</div>' +
        '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:8px">' +
        (dirId
          ? 'The producers pitch to this brief — most demos in the lane, one stretch, one wildcard. Consistency becomes identity.' +
            (idNar ? ' The identity is CANON now; changing lanes will be news.' : '')
          : 'No brief: the producers pitch the whole field. Commit to a lane and the pitches follow.') +
        '</div></div>');
    }

    // the map (v0.6.6): where the world already knows them
    if (g.debuted) {
      const regions = KP.regionsOf(g);
      const rows = KP.C.REGIONS.map(r => {
        const v = regions[r.id] || 0;
        const word = KP.regionWord(v);
        const cls = word === 'devoted' ? ' gold' : word === 'loud' ? ' hot' : word === 'quiet' ? '' : ' cool';
        return '<span class="chip' + cls + '"' + (word === 'quiet' ? ' style="opacity:.45"' : '') + '>' +
          UI.esc(r.label) + ' · ' + word + '</span>';
      });
      html.push('<div class="kicker">The map</div>');
      html.push('<div class="pad" style="display:flex;gap:7px;flex-wrap:wrap">' + rows.join('') + '</div>');
    }

    // the trophy case (v0.6.5): music-show wins, counted forever
    const trophies = Object.entries(g.trophies || {}).filter(([, n]) => n > 0);
    if (trophies.length) {
      const total = trophies.reduce((s, [, n]) => s + n, 0);
      html.push('<div class="kicker">The trophy case</div>');
      html.push('<div class="pad" style="display:flex;gap:7px;flex-wrap:wrap">' +
        trophies.map(([show, n]) => '<span class="chip gold">' + UI.esc(KP.showLabel(show)) + ' × ' + n + '</span>').join('') +
        '<span class="chip">' + total + ' win' + (total === 1 ? '' : 's') + ' total</span></div>');
    }

    // the rivalries (v0.6.4): shared release weeks, counted forever
    const feudIds = Object.keys(g.feuds || {});
    if (feudIds.length) {
      html.push('<div class="kicker">The rivalries</div>');
      feudIds.forEach(actId => {
        const hit = KP.rivalActById(state, actId);
        if (!hit) return;
        const f = g.feuds[actId];
        html.push('<div class="note">vs ' + UI.esc(hit.act.name) + ' (' + UI.esc(hit.rival.short) + '): ' +
          f.wins + '–' + f.losses + ' on shared release weeks' +
          (f.wins === f.losses ? '. Dead even. The next one decides the narrative.'
            : f.wins > f.losses ? '. We lead — and their fandom has receipts folders about it.'
            : '. They lead. The building does not talk about it, which is how you know it matters.') +
          '<span class="n-who">— the desk’s rivalry file</span></div>');
      });
    }

    // the dorm (v0.7.1): chemistry has an address
    if (g.debuted && g.rooms && g.rooms.length) {
      html.push('<div class="kicker">The dorm</div>');
      html.push('<div class="pad"><div style="display:flex;gap:7px;flex-wrap:wrap">' +
        g.rooms.map((r, i) => '<span class="chip">Room ' + (i + 1) + ': ' +
          r.map(id => UI.esc(KP.publicGiven(state.people[id]))).join(' · ') + '</span>').join('') +
        '</div><div style="margin-top:8px"><button class="btn" data-action="dorm-shuffle" data-id="' + g.id + '">' +
        'Reassign rooms · ' + KP.C.LIFE.roomShuffleCost + '</button></div>' +
        '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:6px">Roommates shape chemistry both ways. A reshuffle separates the coldest pair — the sit-down’s domestic twin.</div></div>');
    }

    html.push('<div class="kicker">Room report</div>');
    KP.chemistryNotes(state, members).forEach(n => html.push('<div class="note">' + UI.esc(n) + '</div>'));
    KP.frictionPairs(state, g.members).forEach(f => html.push(UI.frictionCard(state, f)));

    // status / next step
    html.push('<div class="kicker">Next step</div>');
    if (g.prep) {
      const inW = g.prep.scheduledWeek - state.week;
      html.push('<div class="card">' + (g.debuted ? 'Comeback' : 'Debut') + ' scheduled for <b>' + UI.esc(KP.weekLabel(g.prep.scheduledWeek).text) + '</b>' +
        (inW > 0 ? ' — ' + inW + ' week' + (inW === 1 ? '' : 's') + ' out.' : ' — this week.') +
        ' Rehearsals have replaced individual training for the members.</div>');
    } else if (!g.debuted) {
      html.push('<div class="card">The lineup exists on paper. It becomes real in the Studio: pick the song, the concept, and the date.' +
        '<div style="margin-top:12px"><button class="btn primary" data-action="nav-studio">Open the Studio</button></div></div>');
    } else if (promoting) {
      html.push('<div class="card">Promotion week — music shows, fan signs, radio. The schedule is full and so are the members. Comeback planning opens when it winds down.</div>');
    } else if (g.hiatus && g.hiatus.service) {
      // the service chapter (v0.9.23): the wait is loyal, the date is real
      const back = g.members.map(id => state.people[id]).filter(Boolean)
        .filter(m => m.flags && m.flags.military)
        .reduce((w, m) => Math.max(w, m.flags.military.until), 0);
      html.push('<div class="card"><b>The service chapter</b> — the group enlisted together and the fandom is running the wait like a project. Nothing cools while the reason is the law. Last discharge expected ' +
        (back ? UI.esc(KP.weekLabel(back).text) : 'soon') + ' — and the next date after that is not a comeback, it is a return.</div>');
    } else if (g.hiatus) {
      // the disappearance (v0.9.12): parked on purpose, counted weekly
      const hw = state.week - g.hiatus.since;
      const H = KP.C.HIATUS;
      html.push('<div class="card"><b>On official hiatus</b> — ' + hw + ' week' + (hw === 1 ? '' : 's') + ' and counting. ' +
        (hw <= H.graceWeeks
          ? 'The announcement is holding: the fans are patient, the members are sleeping, the second jobs have room.'
          : 'Past the grace window now — the rest is still working, and so is the forgetting. The return converts the wait into numbers; the wait converts the numbers into less.') +
        '<div style="margin-top:12px"><button class="btn primary" data-action="nav-studio">Announce the return</button></div></div>');
    } else {
      html.push('<div class="card">The room between releases is where momentum goes to die. The producers have fresh demos in the Studio.' +
        '<div style="margin-top:12px"><button class="btn primary" data-action="nav-studio">Plan the comeback</button></div>' +
        '<div style="margin-top:8px"><button class="btn small ghost" style="border:1px solid var(--line)" data-action="declare-hiatus" data-id="' + g.id + '">Declare an official hiatus</button></div></div>');
    }

    // discography — the story so far, on the record
    if (g.releases && g.releases.length) {
      html.push('<div class="kicker">Discography</div>');
      g.releases.slice().reverse().forEach(r => {
        const fmt = KP.C.DEBUT.FORMATS.find(f => f.id === r.format);
        // the record inside the record (v0.7.5): credits and the sleeper
        const creditBits = [];
        (r.tracklist || []).forEach(tr => {
          if (!tr.credit) return;
          if (tr.credit.type === 'solo') {
            const p = state.people[tr.credit.memberId];
            creditBits.push((p ? UI.esc(KP.publicGiven(p)) : '?') + '’s solo “' + UI.esc(tr.title) + '”');
          } else {
            creditBits.push('the ' + tr.credit.memberIds.map(id => {
              const p = state.people[id]; return p ? UI.esc(KP.publicGiven(p)) : '?';
            }).join(' & ') + ' unit “' + UI.esc(tr.title) + '”');
          }
        });
        if (r.sleeperTitle) creditBits.push('b-side hit “' + UI.esc(r.sleeperTitle) + '”');
        // the pen credits (v0.9.7): names inside the booklet
        (r.tracklist || []).forEach(tr => {
          if (!tr.writtenBy) return;
          const p = state.people[tr.writtenBy];
          if (p) creditBits.push('“' + UI.esc(tr.title) + '” co-written by ' + UI.esc(KP.publicGiven(p)));
        });
        html.push('<div class="mail"><span class="m-tag">' + UI.esc(KP.weekLabel(r.week).text) + '</span>' +
          '<div><b>“' + UI.esc(r.songTitle) + '”</b> · ' + UI.esc(KP.conceptById(r.conceptId).label) +
          (fmt ? ' · ' + UI.esc(fmt.label.toLowerCase()) : '') +
          (r.producer ? ' · prod. ' + UI.esc(r.producer) : '') +
          '<span class="m-week">' + (r.isDebut ? 'debut · ' : '') + 'peaked #' + r.chartPeak +
          (r.nationalPeak != null ? ' · national #' + r.nationalPeak : '') +
          (r.chartWeeks ? ' · ' + r.chartWeeks + ' weeks charting' : ' · missed the charts') +
          (creditBits.length ? '<br>' + creditBits.join(' · ') : '') + '</span></div></div>');
      });
      // the writers' room (v0.9.7): the producers behind the records,
      // with track records in words — one truth read off their works
      const worked = KP.producersOf(state).filter(pr =>
        pr.works.some(w => w.groupId === g.id));
      if (worked.length) {
        html.push('<div class="kicker">The credits</div>');
        html.push('<div class="pad" style="display:flex;gap:7px;flex-wrap:wrap">' +
          worked.map(pr => {
            const n = pr.works.filter(w => w.groupId === g.id).length;
            return '<span class="chip">' + UI.esc(pr.name) + ' · ' + n + ' record' + (n > 1 ? 's' : '') +
              ' · ' + UI.esc(KP.producerHeat(pr)) + '</span>';
          }).join('') + '</div>');
      }
      html.push('<div class="pad" style="margin-top:8px"><button class="btn small" data-action="open-results" data-id="' + g.id + '">Latest full report</button></div>');
    }
    // the door the rivals got (0.9.18.2): quiet, at the bottom, real
    html.push('<div class="pad" style="margin-top:20px"><button class="btn small ghost" style="border:1px solid var(--line);color:var(--ink-dim)" data-action="disband-group" data-id="' + g.id + '">' +
      (g.debuted ? 'Conclude team activities' : 'Dissolve the project') + '</button></div>');
    return html.join('');
  }

  // ---- builder ---------------------------------------------------------
  UI.renderBuilder = function (state, draft) {
    const html = [];
    const trainees = KP.freeTrainees(state).map(id => state.people[id]);
    html.push('<div class="pushbar"><button class="btn" data-action="back">‹ Back</button></div>');
    html.push('<div class="pad"><div class="d-label">Lineup proposal</div>' +
      '<div class="bigname" style="font-size:clamp(1.6rem,8vw,2.2rem)">Who stands<br>together?</div>' +
      '<div style="font-size:.78rem;color:var(--ink-dim);margin-top:8px">Pick ' + KP.C.GROUP.minMembers + '–' + KP.C.GROUP.maxMembers + ' members. ' +
      'Complementary strengths, compatible people, one coherent concept.</div></div>');

    const proj = state.project;
    html.push('<div class="kicker">Members · ' + draft.members.length + ' selected</div>');
    html.push('<div class="pick-grid">');
    trainees.forEach(p => {
      const on = draft.members.includes(p.id);
      const locked = proj && proj.locked.includes(p.id);
      const head = KP.headline(state, p);
      html.push('<div class="pick-cell ' + (on ? 'on' : '') + '" data-action="builder-toggle" data-id="' + p.id + '">' +
        UI.portrait(p, 'md') +
        '<div class="pc-name">' + UI.esc(p.name.display) + (locked ? ' 🔒' : '') + '</div>' +
        '<div class="pc-read">' + UI.esc(head.text) + '</div></div>');
    });
    html.push('</div>');

    // a solo act (v0.2.6): exactly one, and nowhere to hide
    if (draft.members.length === 1) {
      const soloist = state.people[draft.members[0]];
      html.push('<div class="kicker">' + KP.fillPro('Or debut {her} alone', soloist) + '</div>');
      html.push('<div class="card">A solo lives or dies on one person. No room to blame, no one to cover a bad night — and nothing to share the spotlight with.' +
        ((soloist.hype || 0) >= 35 ? '<div style="margin-top:8px;color:var(--magenta);font-size:.8rem">' + KP.fillPro('The internet already knows {her}. A solo cashes all of that in.', soloist) + '</div>' : '') +
        '<div style="margin-top:12px"><button class="btn primary" data-action="builder-propose-solo" data-id="' + soloist.id + '">Propose ' + UI.esc(KP.displayName(soloist)) + ', solo</button></div>' +
        '</div>');
    }

    // the project: fewer than a full lineup can still become a commitment
    // the whole building hears about (v0.2.5)
    if (draft.members.length >= 1 && draft.members.length < KP.C.GROUP.minMembers && !proj) {
      html.push('<div class="kicker">Or open a project</div>');
      html.push('<div class="card">Lock these ' + draft.members.length + ' in without finalizing. ' +
        'The building will know a group is coming — and the rest of the trainees will train like the spot is theirs.' +
        '<div style="margin:12px 0 4px;font-size:.64rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-dim)">What the project needs (optional, up to 2)</div>' +
        '<div class="focus-chips">' +
        KP.C.TALENTS.map(d => '<button class="chip ' + ((draft.seeking || []).includes(d) ? 'on' : '') + '" ' +
          'data-action="builder-seeking" data-domain="' + d + '">' + UI.esc(KP.C.TALENT_LABELS[d]) + '</button>').join('') +
        '</div>' +
        '<div style="margin-top:14px"><button class="btn primary" data-action="open-project">Open the project</button></div>' +
        '</div>');
    }
    if (proj) {
      const seeking = proj.seeking.map(d => KP.C.TALENT_LABELS[d]).join(' + ');
      html.push('<div class="note">Project open since ' + UI.esc(KP.weekLabel(proj.openedWeek).text) + ' — ' +
        proj.locked.length + ' locked' + (seeking ? ', seeking ' + UI.esc(seeking) : '') +
        '. The free trainees are pushing for the open spots.' +
        '<div style="margin-top:10px"><button class="btn danger small" data-action="cancel-project">Shelve the project</button></div>' +
        '<span class="n-who">— the whole building knows</span></div>');
    }

    if (draft.members.length >= KP.C.GROUP.minMembers) {
      const members = draft.members.map(id => state.people[id]);
      const hints = KP.roleHints(state, members);

      html.push('<div class="kicker">Roles</div>');
      [['leader', 'Leader'], ['center', 'Center'], ['mainVocal', 'Main Vocal'], ['mainDancer', 'Main Dancer'], ['mainRapper', 'Main Rapper']].forEach(([key, label]) => {
        html.push('<div class="role-row"><span class="r-label">' + label + '</span>' +
          '<select data-action="builder-role" data-role="' + key + '">' +
          members.map(m => '<option value="' + m.id + '"' +
            ((draft.roles[key] || hints[key]) === m.id ? ' selected' : '') + '>' + UI.esc(m.name.display) +
            (hints[key] === m.id ? ' — staff pick' : '') + '</option>').join('') +
          '</select></div>');
        if (!draft.roles[key]) draft.roles[key] = hints[key];
      });

      html.push('<div class="kicker">Room preview</div>');
      KP.chemistryNotes(state, members).forEach(n => html.push('<div class="note">' + UI.esc(n) + '</div>'));
      KP.frictionPairs(state, draft.members).forEach(f => html.push(UI.frictionCard(state, f)));

      html.push('<div class="kicker">Name</div>');
      // your own name, or one of the pitches (v0.8.4, owner request)
      html.push('<div class="pad"><input class="nc-input" id="builder-name-input" maxlength="18" ' +
        'placeholder="Name the group yourself…" value="' + UI.esc(draft.customName || '') + '"></div>');
      html.push('<div class="pad" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">' +
        draft.nameOptions.map(n => '<button class="chip ' + (draft.name === n && !draft.customName ? 'on' : '') + '" style="' +
          (draft.name === n && !draft.customName ? 'background:color-mix(in srgb,var(--era1) 26%,var(--surface2));color:var(--ink);border-color:var(--era1)' : '') + '" ' +
          'data-action="builder-name" data-name="' + UI.esc(n) + '">' + UI.esc(n) + '</button>').join('') +
        '</div>');
      html.push('<div class="pad" style="font-size:.68rem;color:var(--ink-dim);margin-top:4px">Typed name wins over the chips. The marketing team pitched the chips; the marketing team also knows better than to argue.</div>');

      html.push('<div class="pad" style="margin-top:20px">' +
        '<button class="btn primary" data-action="builder-propose" style="width:100%">Propose to ' + UI.esc(state.executive.name.split(' ')[0]) + ' ' + UI.esc(state.executive.name.split(' ')[1] || '') + '</button></div>');
    }
    return html.join('');
  };
})(typeof window !== 'undefined' ? window : globalThis);
