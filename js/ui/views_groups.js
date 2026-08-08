/* Groups tab: the group page (or the builder when none exists).
   Chemistry is observations; roles are decisions; the maknae is a fact. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};
  const UI = KP.UI;

  UI.renderGroups = function (state) {
    if (!state.group) return renderNoGroup(state);
    return renderGroupPage(state);
  };

  function renderNoGroup(state) {
    const ready = state.roster.length >= state.objective.minMembers;
    const monthsLeft = KP.monthsUntil(state.week, state.objective.deadlineWeek);
    return '<div class="group-hero">' +
      '<div class="g-status">No group in development</div>' +
      '<div class="g-name" style="font-size:clamp(1.7rem,8vw,2.4rem)">The lineup<br>is the job.</div>' +
      '<div style="color:var(--ink-dim);font-size:.86rem;line-height:1.5;margin-top:8px">' +
      UI.esc(state.executive.name) + ' expects a 4–6 member girl group' +
      (state.objective.status === 'open' ? ' within ' + monthsLeft + ' months.' : '.') +
      ' The best five trainees are not automatically the best group.</div>' +
      '<div style="margin-top:16px"><button class="btn primary" data-action="open-builder"' + (ready ? '' : ' disabled') + '>Propose a lineup</button></div>' +
      (ready ? '' : '<div style="font-size:.72rem;color:var(--ink-dim);margin-top:8px">You need at least ' + state.objective.minMembers + ' trainees.</div>') +
      '</div>';
  }

  function renderGroupPage(state) {
    const g = state.group;
    const members = g.members.map(id => state.people[id]);
    const html = [];
    const era = g.prep ? g.prep.conceptId : null;
    if (era) UI.setEra(era);

    html.push('<div class="group-hero">' +
      '<div class="g-status">' + (g.debuted ? 'Debuted · ' + UI.esc(KP.weekLabel(g.debutWeek).text) : g.prep ? 'Debut in preparation' : 'In development') + '</div>' +
      '<div class="g-name">' + UI.esc(g.name) + '</div>' +
      '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:6px">' +
      '<span class="chip">' + members.length + ' members</span>' +
      (g.prep ? '<span class="chip cool">' + UI.esc(KP.conceptById(g.prep.conceptId).label) + '</span>' : '') +
      (g.debuted && g.results ? '<span class="chip gold">' + UI.esc(g.results.receptionLabel) + '</span>' : '') +
      '</div></div>');

    html.push('<div class="member-strip">');
    members.forEach(m => {
      const roles = [];
      if (g.roles.leader === m.id) roles.push('Leader');
      if (g.roles.center === m.id) roles.push('Center');
      if (g.roles.mainVocal === m.id) roles.push('Main Vocal');
      if (g.roles.mainDancer === m.id) roles.push('Main Dancer');
      if (g.roles.mainRapper === m.id) roles.push('Main Rapper');
      if (g.maknae === m.id) roles.push('Maknae');
      html.push('<div class="member-cell" data-action="open-dossier" data-id="' + m.id + '">' +
        UI.portrait(m, 'md') +
        '<div class="mc-name">' + UI.esc(m.name.given) + '</div>' +
        '<div class="mc-role">' + UI.esc(roles.join(' · ') || 'Member') + '</div></div>');
    });
    html.push('</div>');

    // chemistry observations + frictions with their handles
    html.push('<div class="kicker">Room report</div>');
    KP.chemistryNotes(state, members).forEach(n => html.push('<div class="note">' + UI.esc(n) + '</div>'));
    KP.frictionPairs(state, g.members).forEach(f => html.push(UI.frictionCard(state, f)));

    // status / next step
    if (!g.debuted) {
      html.push('<div class="kicker">Next step</div>');
      if (!g.prep) {
        html.push('<div class="card">The lineup exists on paper. It becomes real in the Studio: pick the song, the concept, and the date.' +
          '<div style="margin-top:12px"><button class="btn primary" data-action="nav-studio">Open the Studio</button></div></div>');
      } else {
        const inW = g.prep.scheduledWeek - state.week;
        html.push('<div class="card">Debut scheduled for <b>' + UI.esc(KP.weekLabel(g.prep.scheduledWeek).text) + '</b>' +
          (inW > 0 ? ' — ' + inW + ' week' + (inW === 1 ? '' : 's') + ' out.' : ' — this week.') +
          ' Rehearsals have replaced individual training for the members.</div>');
      }
    } else if (g.results) {
      html.push('<div class="kicker">Debut</div>');
      html.push('<div class="card">“' + UI.esc(g.results.songTitle) + '” — ' + UI.esc(g.results.receptionLabel) + '.' +
        '<div style="margin-top:12px"><button class="btn" data-action="open-results">Full report</button></div></div>');
    }
    return html.join('');
  }

  // ---- builder ---------------------------------------------------------
  UI.renderBuilder = function (state, draft) {
    const html = [];
    const trainees = state.roster.map(id => state.people[id]).filter(p => p.status === 'trainee');
    html.push('<div class="pushbar"><button class="btn" data-action="back">‹ Back</button></div>');
    html.push('<div class="pad"><div class="d-label">Lineup proposal</div>' +
      '<div class="bigname" style="font-size:clamp(1.6rem,8vw,2.2rem)">Who stands<br>together?</div>' +
      '<div style="font-size:.78rem;color:var(--ink-dim);margin-top:8px">Pick ' + state.objective.minMembers + '–' + state.objective.maxMembers + ' members. ' +
      'Complementary strengths, compatible people, one coherent concept.</div></div>');

    html.push('<div class="kicker">Members · ' + draft.members.length + ' selected</div>');
    html.push('<div class="pick-grid">');
    trainees.forEach(p => {
      const on = draft.members.includes(p.id);
      const head = KP.headline(state, p);
      html.push('<div class="pick-cell ' + (on ? 'on' : '') + '" data-action="builder-toggle" data-id="' + p.id + '">' +
        UI.portrait(p, 'md') +
        '<div class="pc-name">' + UI.esc(p.name.display) + '</div>' +
        '<div class="pc-read">' + UI.esc(head.text) + '</div></div>');
    });
    html.push('</div>');

    if (draft.members.length >= state.objective.minMembers) {
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
      html.push('<div class="pad" style="display:flex;gap:8px;flex-wrap:wrap">' +
        draft.nameOptions.map(n => '<button class="chip ' + (draft.name === n ? 'on' : '') + '" style="' +
          (draft.name === n ? 'background:color-mix(in srgb,var(--era1) 26%,var(--surface2));color:var(--ink);border-color:var(--era1)' : '') + '" ' +
          'data-action="builder-name" data-name="' + UI.esc(n) + '">' + UI.esc(n) + '</button>').join('') +
        '</div>');

      html.push('<div class="pad" style="margin-top:20px">' +
        '<button class="btn primary" data-action="builder-propose" style="width:100%">Propose to ' + UI.esc(state.executive.name.split(' ')[0]) + ' ' + UI.esc(state.executive.name.split(' ')[1] || '') + '</button></div>');
    }
    return html.join('');
  };
})(typeof window !== 'undefined' ? window : globalThis);
