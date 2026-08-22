/* Talent tab: roster + scouting board, and the dossier push-view —
   a confidential file crossed with an artist profile. Blurbs carry the
   evaluation; numbers stay in the engine. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};
  const UI = KP.UI;

  UI.renderTalent = function (state, sub) {
    sub = sub || 'roster';
    const html = [];
    html.push('<div class="pad" style="margin-top:2px"><div class="seg">' +
      '<button class="' + (sub === 'roster' ? 'on' : '') + '" data-action="talent-sub" data-sub="roster">Roster (' + state.roster.length + ')</button>' +
      '<button class="' + (sub === 'training' ? 'on' : '') + '" data-action="talent-sub" data-sub="training">Training</button>' +
      '<button class="' + (sub === 'board' ? 'on' : '') + '" data-action="talent-sub" data-sub="board">Board (' + state.prospects.length + ')</button>' +
      '</div></div>');
    if (sub === 'roster') {
      state.roster.map(id => state.people[id]).forEach(p => html.push(rosterRow(state, p)));
      if (!state.roster.length) html.push('<div class="card">No trainees. That is a problem money can fix.</div>');
    } else if (sub === 'training') {
      html.push(renderTrainingPage(state));
    } else {
      html.push('<div class="pad" style="margin:10px 0 2px;font-size:.74rem;color:var(--ink-dim)">' +
        'A targeted look costs ' + KP.C.SCOUT.observeCost + ' — one trip, a real read, the question marks come off. Reports date: the academies keep training. Signing costs rise when rivals circle.</div>');
      // the network (v0.9.35): the board is what your reach can see
      {
        const net = KP.networkRead(state);
        const scd = state.week - (state.streetCastWeek || -999) < KP.C.NETWORK.STREET.cooldownWeeks;
        const ccd = state.week - (state.openCallWeek || -999) < KP.C.NETWORK.CALL.cooldownWeeks;
        html.push('<div class="card" style="padding:12px">' +
          '<div style="font-size:.74rem;color:var(--ink-dim);margin-bottom:8px">The network: ' + UI.esc(KP.networkWord(net)) +
          '. Applications and referrals arrive on their own — and they are YOURS alone. The public landscape (washouts, season finalists, the viral kids) is every desk’s to fight over.</div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
          '<button class="btn small"' + (scd ? ' disabled style="opacity:.4"' : '') + ' data-action="street-cast">Street casting · ' + KP.C.NETWORK.STREET.cost + '</button>' +
          '<button class="btn small"' + (ccd ? ' disabled style="opacity:.4"' : '') + ' data-action="open-call">Open call · ' + KP.C.NETWORK.CALL.cost + '</button>' +
          '</div></div>');
      }
      state.prospects.map(id => state.people[id])
        .sort((a, b) => KP.rivalHeat(state, b.id).max - KP.rivalHeat(state, a.id).max)
        .forEach(p => html.push(prospectRow(state, p)));
      if (!state.prospects.length) html.push('<div class="card">The board is empty — the talent is all out there, waiting to be uncovered. Applications find a name, referrals find a friend, the public landscape finds everyone at once, and shoe leather finds the rest.</div>');
      // the world's auditions (v0.9.29): fund a circuit, mint a class
      html.push('<div class="kicker">Global auditions</div>');
      html.push('<div class="card"><div style="font-size:.78rem;color:var(--ink-dim);margin-bottom:8px">Fund an audition tour — ' +
        KP.C.TONGUE.AUDITION.cost + ' per circuit, annual per region. Higher ceilings, harder reads: prospects arrive with a home region and a native language on the file.</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        KP.C.REGIONS.map(r => {
          const cool = state.auditionCooldowns && state.week - (state.auditionCooldowns[r.id] || -999) < KP.C.TONGUE.AUDITION.cooldownWeeks;
          return '<button class="btn small' + (cool ? ' ghost" disabled style="opacity:.4;border:1px solid var(--line)' : '') + '" data-action="fund-audition" data-id="' + r.id + '">' + UI.esc(r.label) + '</button>';
        }).join('') + '</div></div>');
      html.push(renderSchools(state));
    }
    return html.join('');
  };

  // ---- the regional schools (v0.9.16): the map under the board ---------
  function renderSchools(state) {
    const schools = state.schools || [];
    if (!schools.length) return '';
    const S = KP.C.SCHOOLS;
    const html = ['<div class="pad" style="margin:14px 0 2px;font-size:.74rem;color:var(--ink-dim)">' +
      'The regional schools. A trip (' + S.tripCost + ') buys sharper reads on a school’s class; a partnership (' + S.partnerCost + ') buys first look before any rival scout gets a seat.</div>'];
    // one trip per week (0.9.16.1): Scout Im is one person on one train
    const trippedThisWeek = schools.some(s => s.visitedWeek === state.week);
    schools.slice().sort((a, b) => b.rep - a.rep).forEach(s => {
      const partnered = s.partnerUntil > state.week;
      const cooling = s.visitedWeek && state.week - s.visitedWeek < S.tripCooldownWeeks;
      const grads = s.alumni.filter(a => a.debuted).length;
      html.push('<div class="card" style="padding:12px">' +
        '<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">' +
        '<span style="font-weight:800">' + UI.esc(s.name) + '</span>' +
        '<span style="font-size:.74rem;color:var(--ink-dim)">' + UI.esc(s.city) + ' · ' +
        (s.lane === 'vocals' ? 'vocal' : s.lane === 'dance' ? 'dance' : 'all-round') + ' lane</span>' +
        (s.hot ? '<span class="chip hot">hot</span>' : '<span class="chip">' + KP.schoolRepWord(s.rep) + '</span>') +
        (partnered ? '<span class="chip gold">first look</span>' : '') +
        '</div>' +
        '<div style="font-size:.76rem;color:var(--ink-dim);margin-top:5px">' +
        (s.alumni.length
          ? 'Alumni ledger: ' + s.alumni.slice(-3).map(a => UI.esc(a.name)).reverse().join(', ') +
            (grads ? ' — ' + grads + ' on debut stages' : '')
          : 'No signed alumni yet. Every ledger starts blank.') + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:9px">' +
        '<button class="btn small" data-action="school-trip" data-id="' + s.id + '"' +
        (state.budget < S.tripCost || cooling || trippedThisWeek ? ' disabled' : '') + '>' +
        (cooling ? 'Visited' : trippedThisWeek ? 'Next week' : 'Trip · ' + S.tripCost) + '</button>' +
        '<button class="btn small" data-action="school-partner" data-id="' + s.id + '"' +
        (partnered || state.budget < S.partnerCost ? ' disabled' : '') + '>' + (partnered ? 'Partnered' : 'Partner · ' + S.partnerCost) + '</button>' +
        '</div></div>');
    });
    return html.join('');
  }

  function rosterRow(state, p) {
    const head = KP.headline(state, p);
    const grp = KP.groupOf(state, p.id);
    const focus = (p.training.focus || []).map(f => KP.C.TALENT_LABELS[f]).join(' + ');
    return '<div class="talent-row" data-action="open-dossier" data-id="' + p.id + '">' +
      UI.portrait(p, 'md') +
      '<div class="t-body">' +
      '<div class="t-name">' + UI.esc(KP.displayName(p)) + '</div>' +
      '<div class="t-sub">' + (p.name.stage ? UI.esc(p.name.display) + ' · ' : '') + p.age + ' · ' +
      KP.fmtCount(KP.socialOf(state, p)) + ' followers · ' + UI.esc(head.text) + '</div>' +
      '<div class="t-chips">' + UI.condChips(p) +
      (grp ? '<span class="chip gold">' + UI.esc(grp.name) + '</span>' : '') +
      (p.status === 'idol' ? '<span class="chip gold">debuted</span>' : '') +
      ((p.hype || 0) >= 35 ? '<span class="chip hot">' + UI.esc(KP.hypeWord(p.hype)) + '</span>' : '') +
      (p.clause && p.clause.kind === 'debutBy'
        ? '<span class="chip' + (state.week > p.clause.byWeek - KP.C.TABLE.warnAt ? ' hot' : '') +
          '">debut-by wk ' + p.clause.byWeek + '</span>' : '') +
      (p.flags && p.flags.trainClause ? '<span class="chip">training clause</span>' : '') +
      (p.medical && p.medical.chronic && p.medical.chronic.length
        ? '<span class="chip hot">' + UI.esc(p.medical.chronic.map(c => c.site).join(' · ')) + '</span>' : '') +
      (p.flags && p.flags.seatedUntil && state.week < p.flags.seatedUntil
        ? '<span class="chip">seated</span>' : '') +
      '</div></div>' +
      '<div class="t-side"><span class="chip">' + idolOrFocusChip(state, p, focus) + '</span></div>' +
      '</div>';
  }

  function idolOrFocusChip(state, p, focus) {
    if (p.status !== 'idol') return focus ? UI.esc(focus) : 'no focus';
    const grp = KP.groupOf(state, p.id);
    if (grp && grp.prep) return 'rehearsals';
    if (grp && state.week <= (grp.promoUntil || 0)) return 'promotion';
    const auto = KP.idolFocus(state, p);
    return auto ? 'drilling ' + UI.esc(KP.C.TALENT_LABELS[auto.domain]) : 'polished';
  }

  function prospectRow(state, p) {
    const evl = KP.evaluate(state, p);
    const best = evl.domains.slice().sort((a, b) => bandRank(b.band) - bandRank(a.band))[0];
    const cost = KP.signCost(state, p);
    const canSign = state.budget >= cost &&
      (!KP.signingsCapped(state) || state.signingsUsed < state.signingsAllowed);
    return '<div class="talent-row">' +
      '<div data-action="open-dossier" data-id="' + p.id + '">' + UI.portrait(p, 'md') + '</div>' +
      '<div class="t-body" data-action="open-dossier" data-id="' + p.id + '">' +
      '<div class="t-name">' + UI.esc(p.name.display) +
      (p.gender === 'm' ? ' <span class="chip" style="font-size:.6rem;vertical-align:middle">boy</span>' : '') + '</div>' +
      '<div class="t-sub">' + p.age + ' · ' + UI.esc(sourceLabel(state, p)) + ' · ' + looksWord(state, p) + '</div>' +
      '<div class="t-read">“' + UI.esc(best.line) + '”</div>' +
      '<div class="t-chips">' + UI.heatChips(state, p.id) +
      (p.channel && { application: 'applicant', referral: 'referred', street: 'street cast',
        washout: 'washout', social: 'went viral', showKid: 'season finalist' }[p.channel]
        ? '<span class="chip' + (KP.CHANNEL_PRIVATE[p.channel] ? ' cool' : '') + '">' +
          { application: 'applicant', referral: 'referred', street: 'street cast',
            washout: 'washout', social: 'went viral', showKid: 'season finalist' }[p.channel] + '</span>'
        : '') +
      (KP.holdoutOf(state, p)
        ? '<span class="chip hot">' + ((p.holdout || {}).callback ? (p.gender === 'm' ? 'he called back' : 'she called back')
          : (p.holdout || {}).visits ? 'holding out · visit ' + p.holdout.visits
          : 'holding out for a power') + '</span>' : '') + '</div>' +
      '</div>' +
      '<div class="t-side">' +
      '<button class="btn small" data-action="observe" data-id="' + p.id + '">Look · ' + KP.C.SCOUT.observeCost + '</button>' +
      '<button class="btn small primary" data-action="sign" data-id="' + p.id + '"' + (canSign ? '' : ' disabled') + '>Sign · ' + cost + '</button>' +
      '</div></div>';
  }

  // Training page: every trainee's plan, adjustable in place.
  function renderTrainingPage(state) {
    const html = [];
    const trainees = state.roster.map(id => state.people[id]).filter(p => p.status === 'trainee');
    const prepIds = [];
    KP.groups(state).forEach(g => { if (g.prep) g.members.forEach(id => prepIds.push(id)); });
    if (!trainees.length) {
      return '<div class="card" style="margin-top:12px">No trainees to schedule.</div>';
    }
    html.push('<div class="pad" style="margin:10px 0 2px;font-size:.74rem;color:var(--ink-dim)">' +
      'Two focus areas max per trainee. Heavy weeks add up — so does rest.</div>');
    // the evaluation board (v0.9.16): the ranking everyone reads monthly
    const ranked = trainees.filter(p => p.evalRank).sort((a, b) => a.evalRank - b.evalRank);
    if (ranked.length >= 2) {
      const P = KP.C.PRACTICE;
      const evalWeek = ranked[0].evalWeek || state.week;
      const next = evalWeek + P.evalEveryWeeks;
      html.push('<div class="card" style="padding:12px">' +
        '<div style="font-weight:800">The evaluation board</div>' +
        '<div style="font-size:.74rem;color:var(--ink-dim);margin-top:2px">Posted ' + UI.esc(KP.weekLabel(evalWeek).text) +
        ' · next board ' + UI.esc(KP.weekLabel(next).text) + '. The trainees read it before you do.</div>' +
        '<div style="margin-top:8px">' +
        ranked.map(p => '<div style="display:flex;gap:8px;align-items:baseline;padding:2px 0">' +
          '<span style="font-weight:800;width:1.4em">' + p.evalRank + '</span>' +
          '<span data-action="open-dossier" data-id="' + p.id + '">' + UI.esc(KP.displayName(p)) + '</span>' +
          ((p.flags.evalStreak || 0) >= KP.C.PRACTICE.aceStreakAt ? '<span class="chip gold">the ace</span>' : '') +
          (p.flags.agingOut ? '<span class="chip">the clock</span>' : '') +
          '</div>').join('') +
        '</div></div>');
    }
    trainees.forEach(p => {
      const inPrep = prepIds.includes(p.id);
      html.push('<div class="card train-card" style="padding:12px">' +
        '<div style="display:flex;gap:11px;align-items:center" data-action="open-dossier" data-id="' + p.id + '">' +
        UI.portrait(p, 'sm') +
        '<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:.95rem">' + UI.esc(KP.displayName(p)) + '</div>' +
        '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:4px">' + UI.condChips(p) + '</div></div></div>');
      if (inPrep) {
        html.push('<div style="font-size:.76rem;color:var(--ink-dim);font-style:italic;margin-top:9px">' + KP.fillPro('In debut rehearsals — the comeback schedule owns {pos} week.', p) + '</div>');
      } else {
        html.push('<div class="focus-chips" style="margin-top:10px">' +
          KP.C.TALENTS.map(d => '<button class="chip ' + ((p.training.focus || []).includes(d) ? 'on' : '') + '" ' +
            'data-action="toggle-focus" data-id="' + p.id + '" data-domain="' + d + '">' + UI.esc(KP.C.TALENT_LABELS[d]) + '</button>').join('') +
          '</div>' +
          '<div class="seg" style="margin-top:9px">' +
          KP.C.TRAIN.intensities.map(i => '<button class="' + (p.training.intensity === i ? 'on ' + i : '') + '" ' +
            'data-action="set-intensity" data-id="' + p.id + '" data-intensity="' + i + '">' + i + '</button>').join('') +
          '</div>');
      }
      html.push('</div>');
    });
    return html.join('');
  }

  // the report's state on the file (0.9.16.3): unconfirmed until a look,
  // then dated — because the board keeps training and reports go stale
  function looksWord(state, p) {
    if (!(p.observations > 0)) return 'desk report only';
    const age = p.reads ? state.week - p.reads.week : null;
    if (age == null || age === 0) return 'fresh read';
    return 'read ' + age + 'w ago';
  }
  // the school's stamp outranks the generic channel on the file
  function sourceLabel(state, p) {
    const s = p.schoolId && KP.schoolById(state, p.schoolId);
    return s ? s.name + ' (' + s.city + ')' : p.source;
  }
  function bandRank(b) { return KP.C.BANDS.findIndex(x => x.key === b); }

  // ---- dossier ---------------------------------------------------------
  // ---- dossier (tabbed, owner request: "so it's not so much scrolling")
  // Profile = the working card (attributes, plan, actions). The file =
  // every written blurb and staff note. History = the whole record.
  UI.renderDossier = function (state, id, tab) {
    const p = state.people[id];
    if (!p) return '<div class="card">File missing.</div>';
    tab = tab || 'profile';
    const evl = KP.evaluate(state, p);
    const isTrainee = p.status === 'trainee' || p.status === 'idol';
    const html = [];

    html.push('<div class="pushbar"><button class="btn" data-action="back">‹ Back</button></div>');
    const inLineup = !!KP.groupOf(state, p.id);
    const nameHtml = p.name.stage
      ? UI.esc(p.name.stage)
      : UI.esc(p.name.family) + '<br>' + UI.esc(p.name.given);
    html.push('<div class="dossier-head">' + UI.portrait(p, 'lg') +
      '<div class="d-id"><div class="d-label">' + (p.status === 'prospect' ? 'Prospect file' : p.status === 'idol' ? 'Artist file' : 'Trainee file') + '</div>' +
      '<div class="bigname">' + nameHtml + '</div>' +
      '<div class="d-meta">' + (p.name.stage ? UI.esc(p.name.display) + ' · ' : '') + p.age + ' · ' +
      (p.gender === 'm' ? 'boy' : 'girl') + ' · ' + UI.esc(sourceLabel(state, p)) +
      (p.status === 'prospect' ? ' · ' + looksWord(state, p) : '') +
      (p.signedWeek ? ' · signed ' + UI.esc(KP.weekLabel(p.signedWeek).text) : '') +
      (p.origin ? ' · <span style="color:var(--cyan)">' + UI.esc(KP.regionLabel(p.origin)) + ' · ' + UI.esc(p.nativeLang || '') +
        (KP.koOf(p) < 95 ? ' · Korean ' + (KP.koOf(p) >= KP.C.TONGUE.koConversational ? 'conversational' : 'learning') : '') + '</span>' : '') +
      (p.status === 'idol' && p.age >= KP.C.TIME.SENESCE.at
        ? ' · <span style="color:var(--gold)">the veteran’s pace</span>' : '') + '</div>' +
      '<div class="d-social">' + KP.fmtCount(KP.socialOf(state, p)) + ' followers' +
      ((p.socialDelta || 0) > 0 ? ' <span class="ds-up">▲' + KP.fmtCount(p.socialDelta) + ' this week</span>' : '') +
      '</div>' +
      (p.contract && p.status === 'idol'
        ? '<div style="font-size:.72rem;color:var(--ink-dim);margin-top:5px">Exclusive contract · year ' +
          KP.contractYear(state, p) + ' of ' + p.contract.years +
          (p.contract.term > 1 ? ' · term ' + p.contract.term : '') +
          (p.contract.leaving ? ' · <span style="color:var(--magenta)">final term</span>' : '') +
          (p.flags.military ? ' · <span style="color:var(--magenta)">in service — back ' + UI.esc(KP.weekLabel(p.flags.military.until).text) + '</span>' : p.serviceDone ? ' · service completed' : '') + '</div>'
        : '') +
      (p.status === 'departed'
        ? '<div style="font-size:.72rem;color:var(--ink-dim);margin-top:5px">Departed ' + UI.esc(KP.weekLabel(p.flags.departedWeek || 1).text) + ' · the file stays open forever</div>'
        : '') +
      ((p.status === 'idol' || inLineup)
        ? '<div style="margin-top:8px"><button class="btn small ghost" data-action="open-stagename" data-id="' + p.id + '" style="border:1px solid var(--line)">' + (p.name.stage ? 'Change stage name' : 'Give a stage name') + '</button></div>'
        : '') +
      '</div></div>');

    if (isTrainee) {
      html.push('<div class="pad" style="margin-top:10px"><div class="cond">' + UI.condChips(p) + '</div></div>');
    }

    html.push('<div class="pad" style="margin-top:8px"><div class="seg">' +
      [['profile', 'Profile'], ['notes', 'The file'], ['history', 'History']].map(tb =>
        '<button class="' + (tab === tb[0] ? 'on' : '') + '" data-action="dossier-tab" data-tab="' + tb[0] + '">' + tb[1] + '</button>').join('') +
      '</div></div>');

    if (tab === 'history') {
      if (p.history && p.history.length) {
        p.history.slice().reverse().slice(0, 40).forEach(h => {
          html.push('<div class="mail"><span class="m-tag">' + UI.esc(KP.weekLabel(Math.max(1, h.week)).text) + '</span><div>' + UI.esc(h.text) + '</div></div>');
        });
      } else {
        html.push('<div class="card" style="color:var(--ink-dim);font-style:italic">The file is new. The stories come with the weeks.</div>');
      }
      return html.join('');
    }

    if (tab === 'notes') {
      // what the public calls her (v0.6.0)
      const pNars = KP.narrativesFor(state, 'idol', p.id);
      if (pNars.length) {
        html.push('<div class="kicker">' + KP.fillPro('The public knows {her}', p) + '</div>');
        html.push('<div class="card">' + UI.narrativeLines(state, pNars) + '</div>');
      }
      const pick = (key, arr) => arr[Math.floor(KP.hash01([state.seed, p.id, key].join('|')) * arr.length)];
      if (p.status === 'idol') {
        const gOf = KP.groupOf(state, p.id);
        if (gOf && gOf.debuted) {
          const homes = KP.strongholdsOf(state, p).map(KP.regionLabel).map(UI.esc);
          const homeNote = pick('homeNote', [
            'Overseas desk margin note: {pos} clips travel best in ' + homes[0] + ' and ' + homes[1] + '. Nobody assigned that. Some corners of the map just decide.',
            'The analytics team flags it every quarter: ' + homes[0] + ' and ' + homes[1] + ' move first on anything with {pos} face in the thumbnail. No campaign has ever run there.',
            'Fan-mail routing says ' + homes[0] + ' and ' + homes[1] + ' found {her} before the company did. The overseas desk has stopped calling it a fluke.',
            'When {pos} clips go up, ' + homes[0] + ' wakes up first — then ' + homes[1] + ', an hour later, like clockwork nobody wound.',
            'Two markets pre-order anything {she} fronts: ' + homes[0] + ' and ' + homes[1] + '. The desk keeps trying to explain it, and keeps writing “just is” in the margin.',
          ]);
          html.push('<div class="note">' + KP.fillPro(homeNote, p) + '<span class="n-who">' +
            pick('homeWho', ['— audience analytics, informally', '— the overseas desk, quarterly report', '— fan-mail routing, of all places']) +
            '</span></div>');
        }
      }
      if (p.status === 'idol' || p.status === 'trainee') {
        const facts = KP.factsOf(state, p).map(UI.esc);
        const voiceLine = 'In the room, {she} ' + UI.esc(KP.VOICES[KP.voiceOf(state, p)].label) + '.';
        const factNote = pick('factNote', [
          'Off the clock: {she} ' + facts[0] + ', and ' + facts[1] + '. ' + voiceLine,
          'The staff profile, unofficial edition: {she} ' + facts[0] + '. Also ' + facts[1] + ' — ask anyone. ' + voiceLine,
          'Two true things the cameras keep missing: {she} ' + facts[0] + ', and {she} ' + facts[1] + '. ' + voiceLine,
          'What the fans would trade anything to confirm (the staff can): {she} ' + facts[0] + ', and ' + facts[1] + '. ' + voiceLine,
        ]);
        html.push('<div class="note">' + KP.fillPro(factNote, p) + '<span class="n-who">' +
          KP.fillPro(pick('factWho', ['— the staff, fondly', '— the managers’ group chat, leaked internally', '— {pos} roommate, under mild duress', '— the stylists, between fittings']), p) +
          '</span></div>');
        if (p.status === 'idol') {
          const amb = KP.ambitionOf(state, p);
          const A = KP.C.LIFE.AMBITIONS[amb];
          html.push('<div class="note">' + KP.fillPro(p.flags.ambitionMet
            ? '{She} got the thing {she} wanted — ' + UI.esc(A.label) + ' — and it shows in how {she} carries the rest.'
            : 'What {she} wants, if you watch closely: ' + UI.esc(pick('ambLine', A.lines)), p) +
            '<span class="n-who">— a staff observation, not a metric</span></div>');
        }
        if ((p.directed || []).length) {
          html.push('<div class="note">' + KP.fillPro('Where {she} stands with the company, if you ask the people who drive the vans: ' +
            UI.esc(KP.standingOf(state, p)), p) +
            '.<span class="n-who">— the road staff, off the record</span></div>');
        }
        // the credits (v0.9.7): the pen record
        if ((p.flags.writerCredits || 0) > 0) {
          html.push('<div class="note">' + KP.fillPro('Songwriting credits on record: ' + p.flags.writerCredits +
            '. The word “artist” has started replacing “performer” in {pos} coverage, which was the whole point of the pen.', p) +
            '<span class="n-who">— the liner notes, cumulatively</span></div>');
        }
        // the society (v0.9.4): friendships across company lines
        const friends = (KP.friendsOf ? KP.friendsOf(state, p.id) : [])
          .map(f => state.people[f.a === p.id ? f.b : f.a]).filter(Boolean);
        if (friends.length) {
          html.push('<div class="note">' + KP.fillPro('Industry friends, the real kind: ' +
            friends.map(fr => UI.esc(KP.displayName(fr))).join(', ') +
            '. Different companies, same waiting rooms. The managers pretend not to coordinate pickup times, and coordinate pickup times.', p) +
            '<span class="n-who">— common knowledge backstage</span></div>');
        }
        const credits = KP.trackCreditsOf(state, p.id);
        if (credits.length) {
          const first = credits.find(c => c.type === 'solo');
          const parts = [];
          if (first) parts.push('first solo on record: “' + UI.esc(first.trackTitle) + '” (' + UI.esc(KP.weekLabel(first.week).text) + ')');
          const units = credits.filter(c => c.type === 'unit');
          if (units.length) {
            const u = units[units.length - 1];
            const withNames = u.withIds.map(id => state.people[id]).filter(Boolean).map(x => UI.esc(KP.publicGiven(x))).join(' & ');
            parts.push('unit work with ' + withNames + ' on “' + UI.esc(u.trackTitle) + '”');
          }
          html.push('<div class="note">' + KP.fillPro('Discography margin, the part {she} checks: ', p) + parts.join('; ') +
            '.<span class="n-who">— A&R, keeping receipts</span></div>');
        }
      }
      // the written evaluations, in the evaluators' own words — desk
      // reports (no look yet) say so in the byline (0.9.16.3)
      html.push('<div class="kicker">In their words</div>');
      evl.domains.forEach(d => {
        html.push('<div class="domain-quote">“' + UI.esc(d.line) + '”' +
          '<span class="q-who">— ' + UI.esc(d.evaluator.name) + ', ' + UI.esc(d.evaluator.role) + ' · ' + UI.esc(KP.C.TALENT_LABELS[d.domain]) +
          (d.uncertain ? ' · from the desk report, unconfirmed' : '') + '</span></div>');
      });
      html.push('<div class="note" style="margin-top:12px">“' + UI.esc(evl.recommendation) + '”' +
        '<span class="n-who">— overall recommendation' + (evl.uncertain ? ', pending a real look' : '') + '</span></div>');
      if (evl.instinct) {
        html.push('<div class="note urgent">“' + UI.esc(evl.instinct) + '”' +
          '<span class="n-who">— Scout Im, off the record</span></div>');
      }
      if (isTrainee) {
        const notes = derivedNotes(p);
        if (p.status === 'trainee' && (p.hype || 0) >= 35) {
          notes.unshift((p.hype >= KP.C.HYPE.directiveThreshold
            ? '{Pos} clip counts read like a mid-tier idol’s and {she} has not debuted. The building is not the only one that noticed.'
            : '{Pos} socials are moving on their own. The public is early — or we are late.'));
        }
        if (p.status === 'idol') {
          const grp = KP.groupOf(state, p.id);
          const idle = !(grp && (grp.prep || state.week <= (grp.promoUntil || 0)));
          const auto = idle ? KP.idolFocus(state, p) : null;
          if (auto) notes.unshift('Between schedules {she} drills ' + KP.C.TALENT_LABELS[auto.domain].toLowerCase() +
            ' on {pos} own. After a debut, everyone knows the gap — including {her}.');
          else if (idle) notes.unshift('{Pos} coaches have little left to teach. What remains now is stages.');
        }
        if (notes.length) {
          html.push('<div class="kicker">Staff observations</div>');
          notes.forEach(n => html.push('<div class="note">' + UI.esc(KP.fillPro(n, p)) + '</div>'));
        }
      }
      return html.join('');
    }

    // ---- profile: the working card — attributes, plan, actions ----------
    // one truth: the chip shows the same band the report wrote (evl),
    // wearing a "?" until somebody has actually gone and looked
    html.push('<div class="kicker">Evaluations</div>');
    evl.domains.forEach(d => {
      const band = KP.C.BANDS.find(b => b.key === d.band);
      html.push('<div class="domain-row"><span class="dm-name">' + UI.esc(KP.C.TALENT_LABELS[d.domain]) + '</span>' +
        UI.bandChip((band ? band.label : d.band) + (d.uncertain ? '?' : ''), d.confident) + '</div>');
    });
    if (p.status === 'prospect' && evl.reportAge != null && evl.reportAge > 0) {
      html.push('<div class="pad" style="font-size:.72rem;color:var(--ink-dim);margin-top:4px">Report from ' +
        UI.esc(KP.weekLabel(state.week - evl.reportAge).text) + ' — ' + evl.reportAge + ' week' + (evl.reportAge === 1 ? '' : 's') +
        ' old. The academies keep training; another look would say if the file still tells the truth.</div>');
    }

    // the staff read (v0.9.3): personality in words, from the live
    // numbers — prospects excluded on purpose: the coaches read
    // character in the building, not from a scouting clip
    if (p.status === 'trainee' || p.status === 'idol') {
      html.push('<div class="kicker">' + UI.esc(KP.fillPro('How the staff read {her}', p)) + '</div>');
      KP.staffRead(state, p).forEach(l =>
        html.push('<div class="note">' + UI.esc(l) + '<span class="n-who">— the coaching staff, when asked directly</span></div>'));
    }

    // relationships seen so far — frictions come with their handle
    if (isTrainee) {
      const rels = relationshipLines(state, p);
      const frictions = KP.frictionPairs(state, state.roster)
        .filter(f => f.a.id === p.id || f.b.id === p.id);
      if (rels.length || frictions.length) {
        html.push('<div class="kicker">In the building</div>');
        rels.forEach(r => html.push('<div class="note">' + UI.esc(r) + '</div>'));
        frictions.forEach(f => html.push(UI.frictionCard(state, f)));
      }
    }

    // training plan
    if (p.status === 'trainee') {
      html.push('<div class="kicker">This week’s plan</div>');
      html.push('<div class="pad"><div class="focus-chips">' +
        KP.C.TALENTS.map(d => '<button class="chip ' + ((p.training.focus || []).includes(d) ? 'on' : '') + '" ' +
          'data-action="toggle-focus" data-id="' + p.id + '" data-domain="' + d + '">' + UI.esc(KP.C.TALENT_LABELS[d]) + '</button>').join('') +
        '</div>' +
        '<div class="seg" style="margin-top:10px">' +
        KP.C.TRAIN.intensities.map(i => '<button class="' + (p.training.intensity === i ? 'on ' + i : '') + '" ' +
          'data-action="set-intensity" data-id="' + p.id + '" data-intensity="' + i + '">' + i + '</button>').join('') +
        '</div>' +
        '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:8px">Two focus areas max. Heavy weeks add up — so does rest.</div>' +
        '</div>');
    }

    // actions for prospects
    if (p.status === 'prospect') {
      const cost = KP.signCost(state, p);
      html.push('<div class="pad" style="margin-top:16px;display:flex;gap:9px">' +
        '<button class="btn" data-action="observe" data-id="' + p.id + '">Targeted look · ' + KP.C.SCOUT.observeCost + '</button>' +
        '<button class="btn primary" data-action="sign" data-id="' + p.id + '">Sign · ' + cost + '</button>' +
        '</div>');
      const heat = UI.heatChips(state, p.id);
      if (heat) html.push('<div class="pad" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">' + heat + '</div>');
    }

    // releasing — a hard decision, so it lives behind a confirm
    if (p.status === 'trainee') {
      const inGroup = !!KP.groupOf(state, p.id);
      html.push('<div class="pad" style="margin-top:18px">' +
        '<button class="btn danger small" data-action="release" data-id="' + p.id + '"' + (inGroup ? ' disabled' : '') + '>Release from contract</button>' +
        (inGroup ? '<div style="font-size:.68rem;color:var(--ink-dim);margin-top:6px">' + KP.fillPro('{She} is in a lineup.', p) + '</div>' : '') +
        '</div>');
    }

    // the service (v0.9.23): while he serves, the desk waits with everyone
    if (p.flags.military) {
      html.push('<div class="pad" style="margin-top:18px;font-size:.72rem;color:var(--ink-dim)">In mandatory service — discharge expected ' +
        UI.esc(KP.weekLabel(p.flags.military.until).text) + '. The contract clock is paused. The desk has no verbs here; nobody does.</div>');
      return html.join('');
    }

    // the member desk (v0.9.20): three verbs on a contracted artist
    if (p.status === 'idol') {
      const g = KP.groupOf(state, p.id);
      const inRealGroup = g && g.type !== 'solo' && g.members.length > 1;
      const row = [];
      // the star's clock (v0.9.25): when the album conversation is live,
      // the desk can simply SAY YES
      const albumAsk = inRealGroup && (
        (state.claims || []).some(c => !c.resolved && c.type === 'soloAlbumPromise' && c.personId === p.id) ||
        (KP.liveDiscourses(state) || []).some(d => d.kind === 'albumClamor' && String(d.subjectId) === String(p.id)) ||
        (g.gravity && !g.gravity.settled && g.gravity.personId === p.id && (g.gravity.rung || 1) === 2));
      // the secret (v0.9.30): once the brief lands, the desk can pay for quiet
      if (p.flags.secret && p.flags.secret.briefed && !p.flags.secret.revealed) {
        row.push('<button class="btn small' + (p.flags.protectedLife ? ' primary' : ' ghost') +
          '"' + (p.flags.protectedLife ? '' : ' style="border:1px solid var(--line)"') +
          ' data-action="protect-life" data-id="' + p.id + '">' +
          (p.flags.protectedLife ? 'Protection on · ' + KP.C.SECRET.protectCost + '/wk' : 'Protect her privacy · ' + KP.C.SECRET.protectCost + '/wk') + '</button>');
      }
      if (albumAsk && state.week - (p.lastSoloAlbumWeek || -999) >= KP.C.STAR.albumCooldown) {
        row.push('<button class="btn primary small" data-action="solo-album" data-id="' + p.id + '">Produce the solo album · ' + KP.C.STAR.albumCost + '</button>');
      }
      if (p.flags.personalHiatus) {
        row.push('<button class="btn small" data-action="end-break" data-id="' + p.id + '">End the personal break · week ' + (state.week - p.flags.personalHiatus.since) + '</button>');
      } else if (inRealGroup) {
        row.push('<button class="btn small" data-action="member-break" data-id="' + p.id + '">Grant a personal break</button>');
      }
      if (inRealGroup && g.members.length > 2) {
        row.push('<button class="btn small ghost" style="border:1px solid var(--line)" data-action="remove-lineup" data-id="' + p.id + '" data-gid="' + g.id + '">Remove from the lineup</button>');
        // the proactive launch (v0.9.27): open the career door first
        row.push('<button class="btn small ghost" style="border:1px solid var(--line)" data-action="launch-solo" data-id="' + p.id + '">Launch the solo career</button>');
      }
      row.push('<button class="btn danger small" data-action="terminate" data-id="' + p.id + '">Terminate · ' + KP.terminationCost(state, p) + '</button>');
      html.push('<div class="pad" style="margin-top:18px;display:flex;gap:8px;flex-wrap:wrap">' + row.join('') + '</div>');
    }
    return html.join('');
  };

  function derivedNotes(p) {
    const d = KP.derived(p);
    const notes = [];
    if (p.liveExp >= 15) {
      if (d.stagePresence >= 68) notes.push('On stage {she} becomes larger than the practice room ever suggested. Presence is real, and it is {hers}.');
      else if (d.stagePresence <= 38) notes.push('The stage still shrinks {her}. More live reps, or the right concept, may change that.');
    }
    if (d.leadership >= 66) notes.push('Staff and trainees both drift toward {her} when something needs deciding. Leadership is emerging on its own.');
    if (d.liveReliability >= 68) notes.push('Whatever else happens, {she} delivers live. The broadcast staff love {her}.');
    if (p.mediaExp >= 12 && d.varietySkill >= 62) notes.push('Cameras and interviews come easily. Variety would take {her} tomorrow.');
    if (p.flags.privateNote) notes.push('Has a life outside the building. It has not been a work matter, and it is not our business unless it becomes one.');
    return notes;
  }

  function relationshipLines(state, p) {
    const out = [];
    const rels = state.relationships || {};
    state.roster.forEach(otherId => {
      if (otherId === p.id) return;
      const other = state.people[otherId];
      const rel = rels[KP.pairKey(p, other)];
      if (!rel || rel.state == null) return;
      if (rel.state === 'close') out.push('Close with ' + KP.displayName(other) + ' — they bring out the best in each other.');
      if (rel.state === 'friendly') out.push('Gets on well with ' + KP.displayName(other) + '.');
    });
    return out.slice(0, 3);
  }
})(typeof window !== 'undefined' ? window : globalThis);
