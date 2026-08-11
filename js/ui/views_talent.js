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
        'A targeted look costs ' + KP.C.SCOUT.observeCost + ' and sharpens every read. Signing costs rise when rivals circle.</div>');
      state.prospects.map(id => state.people[id])
        .sort((a, b) => KP.rivalHeat(state, b.id).max - KP.rivalHeat(state, a.id).max)
        .forEach(p => html.push(prospectRow(state, p)));
      if (!state.prospects.length) html.push('<div class="card">The board is empty. Leads arrive weekly.</div>');
    }
    return html.join('');
  };

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
      '<div class="t-sub">' + p.age + ' · ' + UI.esc(p.source) + ' · ' + looksWord(p) + '</div>' +
      '<div class="t-read">“' + UI.esc(best.line) + '”</div>' +
      '<div class="t-chips">' + UI.heatChips(state, p.id) + '</div>' +
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

  function looksWord(p) {
    const n = Math.min(p.observations || 0, KP.C.SCOUT.maxObservations);
    return n === 0 ? 'one report' : n >= KP.C.SCOUT.maxObservations ? 'fully scouted' : n + 1 + ' looks';
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
      '<div class="d-meta">' + (p.name.stage ? UI.esc(p.name.display) + ' · ' : '') + p.age + ' · ' + UI.esc(p.source) +
      (p.signedWeek ? ' · signed ' + UI.esc(KP.weekLabel(p.signedWeek).text) : '') + '</div>' +
      '<div class="d-social">' + KP.fmtCount(KP.socialOf(state, p)) + ' followers' +
      ((p.socialDelta || 0) > 0 ? ' <span class="ds-up">▲' + KP.fmtCount(p.socialDelta) + ' this week</span>' : '') +
      '</div>' +
      (p.contract && p.status === 'idol'
        ? '<div style="font-size:.72rem;color:var(--ink-dim);margin-top:5px">Exclusive contract · year ' +
          KP.contractYear(state, p) + ' of ' + p.contract.years +
          (p.contract.term > 1 ? ' · term ' + p.contract.term : '') +
          (p.contract.leaving ? ' · <span style="color:var(--magenta)">final term</span>' : '') + '</div>'
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
      // the written evaluations, in the evaluators' own words
      html.push('<div class="kicker">In their words</div>');
      evl.domains.forEach(d => {
        html.push('<div class="domain-quote">“' + UI.esc(d.line) + '”' +
          '<span class="q-who">— ' + UI.esc(d.evaluator.name) + ', ' + UI.esc(d.evaluator.role) + ' · ' + UI.esc(KP.C.TALENT_LABELS[d.domain]) + '</span></div>');
      });
      html.push('<div class="note" style="margin-top:12px">“' + UI.esc(evl.recommendation) + '”' +
        '<span class="n-who">— overall recommendation</span></div>');
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
    html.push('<div class="kicker">Evaluations</div>');
    evl.domains.forEach(d => {
      const val = KP.perceived(state, p, d.domain, d.evaluator);
      const band = KP.band(val);
      html.push('<div class="domain-row"><span class="dm-name">' + UI.esc(KP.C.TALENT_LABELS[d.domain]) + '</span>' +
        UI.bandChip(band.label, d.confident) + '</div>');
    });

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
