/* App shell: boot, routing, action dispatch, autosave.
   Every simulation mutation goes through engine functions; the UI only
   renders state and forwards intents. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};
  const UI = KP.UI;

  const App = KP.App = {
    state: null,
    tab: 'desk',
    talentSub: 'roster',
    view: null,          // pushed view: {type:'dossier'|'builder'|'results', id}
    builderDraft: null,
    studioDraft: { songId: null, conceptId: null, promo: 'standard', week: null,
      alloc: { vocals: 30, dance: 30, rap: 10, media: 30 } },
  };

  App.save = function () { if (App.state) KP.saveLocal(App.state); };

  App.render = function () {
    const el = document.getElementById('screen');
    const s = App.state;
    if (!s) { el.innerHTML = UI.renderNewCareer(); setChrome(false); return; }
    setChrome(true);

    if (!App.view || !App.view.type) UI.setEra(null);
    if (App.view && App.view.type === 'dossier') el.innerHTML = UI.renderDossier(s, App.view.id);
    else if (App.view && App.view.type === 'builder') el.innerHTML = UI.renderBuilder(s, App.builderDraft);
    else if (App.view && App.view.type === 'results') el.innerHTML = '<div class="pushbar"><button class="btn" data-action="back">‹ Back</button></div>' + UI.renderResults(s);
    else if (App.tab === 'desk') el.innerHTML = UI.renderDesk(s);
    else if (App.tab === 'talent') el.innerHTML = UI.renderTalent(s, App.talentSub);
    else if (App.tab === 'groups') el.innerHTML = UI.renderGroups(s);
    else if (App.tab === 'studio') el.innerHTML = UI.renderStudio(s, App.studioDraft);
    else if (App.tab === 'industry') el.innerHTML = UI.renderIndustry(s);

    document.querySelectorAll('#bottomnav button').forEach(b => {
      b.classList.toggle('active', b.dataset.nav === App.tab && !App.view);
    });
    const wl = KP.weekLabel(s.week);
    document.getElementById('tb-week').textContent = wl.text;
    document.getElementById('tb-budget').textContent = '₩ ' + s.budget;
    window.scrollTo(0, 0);
  };

  function setChrome(on) {
    ['topbar', 'bottomnav'].forEach(id => { document.getElementById(id).hidden = !on; });
    document.getElementById('advance-btn').hidden = !on;
  }

  function go(tab) { App.tab = tab; App.view = null; App.render(); }
  function push(type, id) { App.view = { type, id }; App.render(); }

  // ---- weekly advance --------------------------------------------------
  function advance() {
    const s = App.state;
    const notes = KP.advanceWeek(s);
    App.save();
    const urgent = notes.filter(n => n.urgent);
    const debut = notes.find(n => n.kind === 'debut' && s.group && s.group.debuted &&
      s.group.results && s.group.results.week === s.week);
    App.render();
    if (debut) {
      push('results');
      return;
    }
    if (notes.length) {
      UI.modal(KP.weekLabel(s.week).text,
        '<div class="report-list">' + notes.map(n => UI.mailRow(s, Object.assign({}, n, { read: true }))).join('') + '</div>',
        '<button class="btn primary" data-action="close-modal" style="flex:1">Noted</button>');
    } else {
      UI.toast('A quiet week.');
    }
    if (urgent.length) navigator.vibrate && navigator.vibrate(30);
  }

  // ---- action dispatch -------------------------------------------------
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-action],[data-nav]');
    if (!t) return;
    const s = App.state;
    if (t.dataset.nav) { go(t.dataset.nav); return; }
    const act = t.dataset.action;

    switch (act) {
      case 'start-career': {
        const name = (document.getElementById('nc-name').value || '').trim() || 'A&R Manager';
        const seedRaw = (document.getElementById('nc-seed').value || '').trim();
        App.state = KP.newGame(seedRaw || null, name);
        App.save();
        go('desk');
        break;
      }
      case 'advance': advance(); break;
      case 'noop': break;   // sheet body: swallow so the scrim doesn't close
      case 'close-modal': UI.closeModal(); break;
      case 'back': App.view = null; App.render(); break;
      case 'nav-studio': go('studio'); break;
      case 'open-system': systemSheet(); break;
      case 'talent-sub': App.talentSub = t.dataset.sub; App.render(); break;
      case 'open-dossier': push('dossier', t.dataset.id); break;
      case 'open-results': push('results'); break;

      case 'observe': {
        const r = KP.observeProspect(s, t.dataset.id);
        if (r.ok) { UI.toast('The staff took another look.'); App.save(); App.render(); }
        else UI.toast(r.reason, true);
        break;
      }
      case 'sign': {
        const p = s.people[t.dataset.id];
        const cost = KP.signCost(s, p);
        UI.modal('Sign ' + p.name.display + '?',
          '<div class="pad" style="font-size:.88rem;line-height:1.5;color:var(--ink-dim)">Contract cost <b style="color:var(--gold)">₩ ' + cost + '</b>. ' +
          'Signings remaining after this: ' + (s.signingsAllowed - s.signingsUsed - 1) + '.</div>',
          '<button class="btn" data-action="close-modal" style="flex:1">Not yet</button>' +
          '<button class="btn primary" data-action="sign-confirm" data-id="' + p.id + '" style="flex:1">Sign her</button>');
        break;
      }
      case 'sign-confirm': {
        const r = KP.signProspect(s, t.dataset.id);
        UI.closeModal();
        if (r.ok) { UI.toast(s.people[t.dataset.id].name.display + ' is ours.'); App.save(); App.view = null; App.render(); }
        else UI.toast(r.reason, true);
        break;
      }

      case 'mediate': {
        const r = KP.mediatePair(s, t.dataset.a, t.dataset.b);
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save();
        UI.modal('The sit-down',
          '<div class="note" style="margin-top:4px">' + UI.esc(r.text) +
          '<span class="n-who">— staff, afterwards</span></div>',
          '<button class="btn primary" data-action="close-modal" style="flex:1">Noted</button>');
        App.render();
        break;
      }

      case 'release': {
        const p = s.people[t.dataset.id];
        const rels = s.relationships || {};
        const close = s.roster.filter(oid => oid !== p.id).map(oid => s.people[oid])
          .filter(o => { const r = rels[KP.pairKey(p, o)]; return r && r.state === 'close'; });
        UI.modal('Release ' + p.name.display + '?',
          '<div class="pad" style="font-size:.88rem;line-height:1.55;color:var(--ink-dim)">Her contract ends, she leaves the building, and the decision is yours to own. Signings spent on her are not refunded.' +
          (close.length ? '<br><br>' + close.map(o => o.name.given).join(' and ') + ' will take it hard.' : '') + '</div>',
          '<button class="btn" data-action="close-modal" style="flex:1">Keep her</button>' +
          '<button class="btn danger" data-action="release-confirm" data-id="' + p.id + '" style="flex:1">Release her</button>');
        break;
      }
      case 'release-confirm': {
        const p = s.people[t.dataset.id];
        const r = KP.releaseTrainee(s, t.dataset.id);
        UI.closeModal();
        if (r.ok) {
          App.save();
          App.view = null; App.tab = 'talent';
          UI.toast(p.name.display + ' has left the building.');
          App.render();
        } else UI.toast(r.reason, true);
        break;
      }

      case 'toggle-focus': {
        const p = s.people[t.dataset.id];
        const d = t.dataset.domain;
        let focus = (p.training.focus || []).slice();
        if (focus.includes(d)) focus = focus.filter(x => x !== d);
        else { focus.push(d); if (focus.length > 2) focus.shift(); }
        const r = KP.setTraining(s, p.id, focus, p.training.intensity);
        if (!r.ok) UI.toast(r.reason, true);
        App.save(); App.render();
        break;
      }
      case 'set-intensity': {
        const p = s.people[t.dataset.id];
        const r = KP.setTraining(s, p.id, p.training.focus, t.dataset.intensity);
        if (!r.ok) UI.toast(r.reason, true);
        App.save(); App.render();
        break;
      }

      case 'open-builder': {
        App.builderDraft = { members: [], roles: {}, name: null,
          nameOptions: KP.suggestGroupNames(s, KP.rngFor(s)) };
        App.builderDraft.name = App.builderDraft.nameOptions[0];
        push('builder');
        break;
      }
      case 'builder-toggle': {
        const d = App.builderDraft;
        const id = t.dataset.id;
        if (d.members.includes(id)) {
          d.members = d.members.filter(x => x !== id);
          Object.keys(d.roles).forEach(r => { if (d.roles[r] === id) delete d.roles[r]; });
        } else if (d.members.length < s.objective.maxMembers) d.members.push(id);
        else UI.toast('The directive caps the lineup at ' + s.objective.maxMembers + '.', true);
        App.render();
        break;
      }
      case 'builder-name': App.builderDraft.name = t.dataset.name; App.render(); break;
      case 'builder-propose': {
        const d = App.builderDraft;
        const r = KP.proposeGroup(s, d.name, d.members, d.roles);
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save();
        App.view = null; App.tab = 'groups';
        UI.modal('The executive reviews the lineup',
          r.review.map(line => '<div class="note">' + UI.esc(line) +
            '<span class="n-who">— ' + UI.esc(s.executive.name) + '</span></div>').join(''),
          '<button class="btn primary" data-action="close-modal" style="flex:1">Understood</button>');
        App.render();
        break;
      }

      case 'studio-song': {
        const d = App.studioDraft;
        d.songId = t.dataset.id;
        d.conceptId = null; d.week = null;
        App.render();
        break;
      }
      case 'studio-concept': App.studioDraft.conceptId = t.dataset.id; App.render(); break;
      case 'studio-promo': App.studioDraft.promo = t.dataset.promo; App.render(); break;
      case 'studio-week': App.studioDraft.week = parseInt(t.dataset.week, 10); App.render(); break;
      case 'studio-lock': {
        const d = App.studioDraft;
        const total = d.alloc.vocals + d.alloc.dance + d.alloc.rap + d.alloc.media;
        if (total !== 100) { UI.toast('Allocation totals ' + total + '% — make it 100.', true); break; }
        const sel = s.demos.find(x => x.id === d.songId);
        const r = KP.planDebut(s, { songId: d.songId, conceptId: d.conceptId || sel.conceptId,
          promo: d.promo, week: d.week, alloc: d.alloc });
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save();
        UI.toast('Locked. ' + KP.weekLabel(d.week).text + '. No going back.');
        App.render();
        break;
      }
    }
  });

  // range inputs (rehearsal allocation)
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.action === 'studio-alloc') {
      App.studioDraft.alloc[t.dataset.key] = parseInt(t.value, 10);
      const row = t.closest('.alloc-row');
      row.querySelector('.a-val').textContent = t.value + '%';
      const a = App.studioDraft.alloc;
      const card = t.closest('.card');
      const totalEl = card && card.querySelector('div[style*="margin-top"]');
      if (totalEl) totalEl.textContent = 'Total ' + (a.vocals + a.dance + a.rap + a.media) + '% — must land on 100.';
    }
  });

  // ---- system sheet: saves ---------------------------------------------
  function systemSheet() {
    const s = App.state;
    const slots = [];
    for (let i = 1; i <= KP.C.SAVE_SLOTS; i++) {
      const meta = KP.saveMeta(i);
      slots.push('<div class="mail"><span class="m-tag">Slot ' + i + '</span>' +
        '<div style="flex:1">' + (meta ? UI.esc(meta.label) + ' · v' + UI.esc(meta.version) : '<span style="color:var(--ink-faint)">empty</span>') + '</div>' +
        '<button class="btn small" data-action="save-slot" data-slot="' + i + '">Save</button>' +
        (meta ? '<button class="btn small" data-action="load-slot" data-slot="' + i + '">Load</button>' : '') +
        '</div>');
    }
    UI.modal('System',
      '<div class="pad" style="font-size:.78rem;color:var(--ink-dim);margin-bottom:8px">Autosaves every week advance. v' + KP.C.VERSION + '</div>' +
      slots.join('') +
      '<div class="pad" style="margin-top:14px"><button class="btn danger small" data-action="abandon">Abandon career</button></div>',
      '<button class="btn primary" data-action="close-modal" style="flex:1">Close</button>');
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    if (t.dataset.action === 'save-slot') { KP.saveLocal(App.state, t.dataset.slot); UI.toast('Saved to slot ' + t.dataset.slot + '.'); systemSheet(); }
    if (t.dataset.action === 'load-slot') {
      const st = KP.loadLocal(t.dataset.slot);
      if (st) { App.state = st; App.save(); UI.closeModal(); go('desk'); UI.toast('Loaded.'); }
    }
    if (t.dataset.action === 'abandon') {
      UI.modal('Abandon this career?',
        '<div class="pad" style="font-size:.88rem;color:var(--ink-dim)">The autosave is erased. Slots stay.</div>',
        '<button class="btn" data-action="close-modal" style="flex:1">Stay</button>' +
        '<button class="btn danger" data-action="abandon-confirm" style="flex:1">Walk out</button>');
    }
    if (t.dataset.action === 'abandon-confirm') {
      localStorage.removeItem(KP.C.SAVE_KEY + '_auto');
      localStorage.removeItem(KP.C.SAVE_KEY + '_auto_meta');
      App.state = null; App.view = null; UI.closeModal(); App.render();
    }
  });

  // ---- boot ------------------------------------------------------------
  window.addEventListener('load', () => {
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    App.state = KP.loadLocal(null);
    App.render();
    setTimeout(() => {
      const sp = document.getElementById('splash');
      sp.classList.add('gone');
      setTimeout(() => sp.remove(), 500);
    }, 900);
  });
})(typeof window !== 'undefined' ? window : globalThis);
