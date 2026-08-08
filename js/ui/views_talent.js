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
      '<div class="t-sub">' + (p.name.stage ? UI.esc(p.name.display) + ' · ' : '') + p.age + ' · ' + UI.esc(head.text) + '</div>' +
      '<div class="t-chips">' + UI.condChips(p) +
      (grp ? '<span class="chip gold">' + UI.esc(grp.name) + '</span>' : '') +
      (p.status === 'idol' ? '<span class="chip gold">debuted</span>' : '') +
      '</div></div>' +
      '<div class="t-side"><span class="chip">' +
      (p.status === 'idol' ? 'promotion' : focus ? UI.esc(focus) : 'no focus') + '</span></div>' +
      '</div>';
  }

  function prospectRow(state, p) {
    const evl = KP.evaluate(state, p);
    const best = evl.domains.slice().sort((a, b) => bandRank(b.band) - bandRank(a.band))[0];
    const cost = KP.signCost(state, p);
    const canSign = state.signingsUsed < state.signingsAllowed && state.budget >= cost;
    return '<div class="talent-row">' +
      '<div data-action="open-dossier" data-id="' + p.id + '">' + UI.portrait(p, 'md') + '</div>' +
      '<div class="t-body" data-action="open-dossier" data-id="' + p.id + '">' +
      '<div class="t-name">' + UI.esc(p.name.display) + '</div>' +
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
        '<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:.95rem">' + UI.esc(p.name.display) + '</div>' +
        '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:4px">' + UI.condChips(p) + '</div></div></div>');
      if (inPrep) {
        html.push('<div style="font-size:.76rem;color:var(--ink-dim);font-style:italic;margin-top:9px">In debut rehearsals — the comeback schedule owns her week.</div>');
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
  function bandRank(b) { return ['raw', 'developing', 'strong', 'exceptional'].indexOf(b); }

  // ---- dossier ---------------------------------------------------------
  UI.renderDossier = function (state, id) {
    const p = state.people[id];
    if (!p) return '<div class="card">File missing.</div>';
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
      ((p.status === 'idol' || inLineup)
        ? '<div style="margin-top:8px"><button class="btn small ghost" data-action="open-stagename" data-id="' + p.id + '" style="border:1px solid var(--line)">' + (p.name.stage ? 'Change stage name' : 'Give a stage name') + '</button></div>'
        : '') +
      '</div></div>');

    if (isTrainee) {
      html.push('<div class="pad" style="margin-top:10px"><div class="cond">' + UI.condChips(p) + '</div></div>');
    }

    // evaluations: blurb per domain with restrained band + confidence
    html.push('<div class="kicker">Evaluations</div>');
    evl.domains.forEach(d => {
      const val = KP.perceived(state, p, d.domain, d.evaluator);
      const band = KP.band(val);
      html.push('<div class="domain-row"><span class="dm-name">' + UI.esc(KP.C.TALENT_LABELS[d.domain]) + '</span>' +
        UI.bandChip(band.label, d.confident) + '</div>' +
        '<div class="domain-quote">“' + UI.esc(d.line) + '”' +
        '<span class="q-who">— ' + UI.esc(d.evaluator.name) + ', ' + UI.esc(d.evaluator.role) + '</span></div>');
    });

    // recommendation + instinct
    html.push('<div class="note" style="margin-top:12px">“' + UI.esc(evl.recommendation) + '”' +
      '<span class="n-who">— overall recommendation</span></div>');
    if (evl.instinct) {
      html.push('<div class="note urgent">“' + UI.esc(evl.instinct) + '”' +
        '<span class="n-who">— Scout Im, off the record</span></div>');
    }

    // staff observations on derived qualities, once observed enough
    if (isTrainee) {
      const notes = derivedNotes(p);
      if (notes.length) {
        html.push('<div class="kicker">Staff observations</div>');
        notes.forEach(n => html.push('<div class="note">' + UI.esc(n) + '</div>'));
      }
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
        (inGroup ? '<div style="font-size:.68rem;color:var(--ink-dim);margin-top:6px">She is in a lineup.</div>' : '') +
        '</div>');
    }

    // history
    if (p.history && p.history.length) {
      html.push('<div class="kicker">File history</div>');
      p.history.slice().reverse().slice(0, 8).forEach(h => {
        html.push('<div class="mail"><span class="m-tag">' + UI.esc(KP.weekLabel(Math.max(1, h.week)).text) + '</span><div>' + UI.esc(h.text) + '</div></div>');
      });
    }
    return html.join('');
  };

  function derivedNotes(p) {
    const d = KP.derived(p);
    const notes = [];
    if (p.liveExp >= 15) {
      if (d.stagePresence >= 68) notes.push('On stage she becomes larger than the practice room ever suggested. Presence is real, and it is hers.');
      else if (d.stagePresence <= 38) notes.push('The stage still shrinks her. More live reps, or the right concept, may change that.');
    }
    if (d.leadership >= 66) notes.push('Staff and trainees both drift toward her when something needs deciding. Leadership is emerging on its own.');
    if (d.liveReliability >= 68) notes.push('Whatever else happens, she delivers live. The broadcast staff love her.');
    if (p.mediaExp >= 12 && d.varietySkill >= 62) notes.push('Cameras and interviews come easily. Variety would take her tomorrow.');
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
      if (rel.state === 'close') out.push('Close with ' + other.name.display + ' — they bring out the best in each other.');
      if (rel.state === 'friendly') out.push('Gets on well with ' + other.name.display + '.');
    });
    return out.slice(0, 3);
  }
})(typeof window !== 'undefined' ? window : globalThis);
