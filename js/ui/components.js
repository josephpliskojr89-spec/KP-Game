/* Shared UI helpers: escaping, portraits, chips, notes, modal, toast.
   Views consume derived view models; simulation logic stays in the engine. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};
  const UI = KP.UI = KP.UI || {};

  UI.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  // deterministic two-color gradient per person — a "concept photo" placeholder
  const PALETTES = [
    ['#7c3aed', '#db2777'], ['#0ea5e9', '#8b5cf6'], ['#f43f5e', '#f59e0b'],
    ['#10b981', '#0ea5e9'], ['#e11d48', '#7c3aed'], ['#f59e0b', '#ec4899'],
    ['#06b6d4', '#22c55e'], ['#a855f7', '#06b6d4'],
  ];
  UI.portrait = function (person, size) {
    const pal = PALETTES[KP.hashStr(person.id + person.name.display) % PALETTES.length];
    const initials = person.name.given.split('-').map(x => x[0]).join('').toUpperCase();
    return '<div class="portrait ' + (size || 'md') + '" style="--p1:' + pal[0] + ';--p2:' + pal[1] + '">' +
      '<span class="p-init">' + UI.esc(initials) + '</span></div>';
  };

  UI.bandChip = function (bandLabel, confident) {
    const key = bandLabel.toLowerCase();
    return '<span class="chip' + (confident ? '' : ' uncertain') + '">' +
      '<span class="band ' + key + '">' + UI.esc(bandLabel) + (confident ? '' : ' ?') + '</span></span>';
  };

  // What the world says (v0.6.0): living narratives, rendered with live names
  UI.narrativeLines = function (state, narratives) {
    if (!narratives || !narratives.length) return '';
    return narratives.slice(0, 4).map(n =>
      '<div class="nar-line">“' + UI.esc(KP.narrativeText(state, n)) + '”' +
      '<span class="nar-since">since ' + UI.esc(KP.weekLabel(Math.max(1, n.firstWeek)).text) + '</span></div>'
    ).join('');
  };

  // one mood word per person (v0.7.4) — KP.moodOf is the single truth
  // for "how is she doing"; the two-chip fatigue/morale readout it
  // replaced was a second derivation of the same numbers
  UI.condChips = function (p) {
    const mood = KP.moodOf(p);
    const cls = { benched: 'hot', 'running on fumes': 'hot', 'quietly off': 'hot',
      'carrying it': '', worn: '', glowing: 'cool', steady: 'cool' }[mood] || '';
    return '<span class="chip' + (cls ? ' ' + cls : '') + '">' + mood + '</span>';
  };

  UI.heatChips = function (state, personId) {
    const heat = KP.rivalHeat(state, personId);
    return heat.names.map(h =>
      '<span class="chip ' + (h.level >= 3 ? 'hot' : '') + '">' + UI.esc(h.name) + ' ' +
      (h.level >= 3 ? '● circling' : h.level === 2 ? '● interested' : '○ watching') + '</span>'
    ).join('');
  };

  UI.mailRow = function (state, m, extraClass) {
    const wl = KP.weekLabel(m.week);
    return '<div class="mail ' + (m.urgent ? 'urgent ' : '') + (m.read ? '' : 'unread ') + (extraClass || '') + '">' +
      '<span class="m-tag">' + UI.esc(m.kind) + '</span>' +
      '<div>' + UI.esc(m.text) +
      '<span class="m-week">' + UI.esc(wl.text) + '</span></div></div>';
  };

  // ---- modal sheet -----------------------------------------------------
  UI.modal = function (title, bodyHtml, actionsHtml) {
    const rootEl = document.getElementById('modal-root');
    rootEl.innerHTML =
      '<div class="modal-scrim" data-action="close-modal">' +
      '<div class="modal-sheet" data-action="noop">' +
      '<div class="modal-grab"></div>' +
      (title ? '<div class="modal-title">' + UI.esc(title) + '</div>' : '') +
      '<div class="modal-body">' + bodyHtml + '</div>' +
      (actionsHtml ? '<div class="pad" style="margin-top:14px;display:flex;gap:9px;flex-wrap:wrap">' + actionsHtml + '</div>' : '') +
      '</div></div>';
  };
  UI.closeModal = function () { document.getElementById('modal-root').innerHTML = ''; };

  UI.toast = function (msg, bad) {
    const t = document.createElement('div');
    t.className = 'toast' + (bad ? ' bad' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 2200);
    setTimeout(() => t.remove(), 2600);
  };

  // Friction card: the problem and its handle, together. Used by dossier,
  // group page and builder — anywhere a tense pair surfaces.
  UI.frictionCard = function (state, f) {
    const cd = KP.mediationCooldown(state, f.a.id, f.b.id);
    const label = f.state === 'conflict'
      ? KP.publicGiven(f.a) + ' and ' + KP.publicGiven(f.b) + ' are in open conflict. This needs handling before it needs explaining.'
      : 'There is friction between ' + KP.publicGiven(f.a) + ' and ' + KP.publicGiven(f.b) + '. Professional in public, cold everywhere else.';
    const sharedFocus = (f.a.training.focus || []).some(x => (f.b.training.focus || []).includes(x));
    return '<div class="note ' + (f.state === 'conflict' ? 'urgent' : '') + '">' + UI.esc(label) +
      (sharedFocus ? '<div style="font-size:.74rem;color:var(--ink-dim);margin-top:5px">They train side by side every day. Distance might help — so might a conversation.</div>' : '') +
      '<div style="margin-top:10px;display:flex;gap:8px;align-items:center">' +
      (cd > 0
        ? '<span class="chip">sat down recently · ' + cd + 'w</span>'
        : '<button class="btn small" data-action="mediate" data-a="' + f.a.id + '" data-b="' + f.b.id + '">Arrange a sit-down · ' + KP.C.REL.MED.cost + '</button>') +
      '</div><span class="n-who">— staff observation</span></div>';
  };

  // era accents: comeback/debut pages inherit the chosen concept's identity
  const ERA_COLORS = {
    bright: ['#f59e0b', '#f43f5e'], elegant: ['#a78bfa', '#e2c76c'],
    futuristic: ['#22d3ee', '#8b5cf6'], dark: ['#7c3aed', '#e11d48'],
    performance: ['#ef4444', '#f59e0b'], hiphop: ['#f59e0b', '#10b981'],
    retro: ['#ec4899', '#22d3ee'], dreamy: ['#93c5fd', '#c084fc'],
  };
  UI.setEra = function (conceptId) {
    const c = ERA_COLORS[conceptId];
    const el = document.documentElement;
    if (c) { el.style.setProperty('--era1', c[0]); el.style.setProperty('--era2', c[1]); }
    else { el.style.removeProperty('--era1'); el.style.removeProperty('--era2'); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
