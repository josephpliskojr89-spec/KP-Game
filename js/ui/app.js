/* App shell: boot, routing, action dispatch, autosave.
   Every simulation mutation goes through engine functions; the UI only
   renders state and forwards intents. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};
  const UI = KP.UI;

  const App = KP.App = {
    state: null,
    mode: 'title',       // 'title' | 'newcareer' | 'game' (v0.5.1)
    tab: 'desk',
    talentSub: 'roster',
    deskSub: 'today',
    dossierTab: 'profile',
    industrySub: 'scene',
    industryChart: 'scene',
    view: null,          // pushed view: {type:'dossier'|'builder'|'results', id}
    builderDraft: null,
    studioDraft: { songId: null, conceptId: null, promo: 'standard', week: null,
      format: 'single', rollout: null,
      alloc: { vocals: 30, dance: 30, rap: 10, media: 30 } },
  };

  App.save = function () {
    if (!App.state) return;
    const ok = KP.saveLocal(App.state);
    // warn once per session, not once per action — the fix is an export
    if (!ok && !App.saveWarned && typeof localStorage !== 'undefined') {
      App.saveWarned = true;
      UI.toast('Autosave failed — storage is full. Export your save from the System menu.', true);
    }
    if (ok) App.saveWarned = false;
  };

  App.render = function () {
    const el = document.getElementById('screen');
    const s = App.state;
    if (App.mode !== 'game' || !s) {
      setChrome(false);
      el.innerHTML = App.mode === 'newcareer' ? UI.renderNewCareer(App._door || 'current') : UI.renderTitle(KP.saveMeta(null));
      window.scrollTo(0, 0);
      App._lastSig = 'title';
      return;
    }
    setChrome(true);
    // the scroll lock (0.9.21.1, owner: "after I select, the scroll
    // resets to the top"): a re-render of the SAME view keeps your
    // place; only real navigation starts at the top
    const viewSig = [App.tab, App.view && App.view.type, App.view && App.view.id,
      App.deskSub, App.talentSub, App.industrySub, App.industryChart,
      App.dossierTab].join('|');
    const viewScroll = window.scrollY;

    if (!App.view || !App.view.type) UI.setEra(null);
    if (App.view && App.view.type === 'dossier') el.innerHTML = UI.renderDossier(s, App.view.id, App.dossierTab);
    else if (App.view && App.view.type === 'builder') el.innerHTML = UI.renderBuilder(s, App.builderDraft);
    else if (App.view && App.view.type === 'results') el.innerHTML = '<div class="pushbar"><button class="btn" data-action="back">‹ Back</button></div>' + UI.renderResults(s, App.view.id);
    else if (App.view && App.view.type === 'rivalact') {
      el.innerHTML = '<div class="pushbar"><button class="btn" data-action="back">‹ Back</button></div>' +
        UI.renderRivalAct(s, App.view.id);
    }
    else if (App.view && App.view.type === 'grouppage') {
      const gp = KP.groupById(s, App.view.id);
      el.innerHTML = '<div class="pushbar"><button class="btn" data-action="back">‹ Back</button></div>' +
        (gp ? UI.renderGroupPage(s, gp) : '<div class="card">Group not found.</div>');
    }
    else if (App.tab === 'desk') el.innerHTML = UI.renderDesk(s, App.deskSub);
    else if (App.tab === 'talent') el.innerHTML = UI.renderTalent(s, App.talentSub);
    else if (App.tab === 'groups') el.innerHTML = UI.renderGroups(s);
    else if (App.tab === 'studio') el.innerHTML = UI.renderStudio(s, App.studioDraft);
    else if (App.tab === 'industry') el.innerHTML = UI.renderIndustry(s, App.industrySub, App.industryChart);

    document.querySelectorAll('#bottomnav button').forEach(b => {
      b.classList.toggle('active', b.dataset.nav === App.tab && !App.view);
    });
    const wl = KP.weekLabel(s.week);
    document.getElementById('tb-week').textContent = wl.text;
    document.getElementById('tb-budget').textContent = '₩ ' + s.budget;
    // the letterhead is state, not markup (0.9.9.1 — the founding
    // revealed the topbar chip was hardcoded HCG since v0.1.0)
    const tbCo = document.querySelector('.tb-company');
    if (tbCo) tbCo.textContent = s.company.short;
    // Back restores where you were; forward navigation starts at the top
    if (App._restore) {
      const f = App._restore;
      App._restore = null;
      window.scrollTo(0, f.scroll || 0);
      if (f.mark) {
        const hit = el.querySelector('[data-id="' + f.mark + '"]');
        if (hit) {
          hit.classList.add('nav-here');
          setTimeout(() => hit.classList.remove('nav-here'), 2400);
        }
      }
    } else if (viewSig === App._lastSig) {
      window.scrollTo(0, viewScroll);
    } else {
      window.scrollTo(0, 0);
    }
    App._lastSig = viewSig;
  };

  function setChrome(on) {
    ['topbar', 'bottomnav'].forEach(id => { document.getElementById(id).hidden = !on; });
    document.getElementById('advance-btn').hidden = !on;
  }

  // push-view navigation (v0.8.1): a real stack, so Back returns to the
  // page you were ON — group page, scroll position and all — with the
  // row you came from briefly marked so you never lose your place
  App.stack = App.stack || [];
  function go(tab) {
    App.tab = tab; App.view = null; App.stack.length = 0;
    // opening the Desk reads the mail — an action-time state write with a
    // save, not a render-time timer (0.9.13 audit L2: the old 600ms timer
    // made save bytes depend on how long a tab was open)
    if (tab === 'desk' && App.state && (App.state.inbox || []).some(m => !m.read)) {
      App.state.inbox.forEach(m => { m.read = true; });
      App.save();
    }
    App.render();
  }
  function push(type, id) {
    App.stack.push({ view: App.view, scroll: window.scrollY, mark: id || null });
    App.view = { type, id };
    App.render();
  }
  function startCareer() {
    const name = (document.getElementById('nc-name').value || '').trim() || 'A&R Manager';
    const seedRaw = (document.getElementById('nc-seed').value || '').trim();
    App.state = KP.newGame(seedRaw || null, name, { door: App._door || 'current' });
    App.mode = 'game';
    App.save();
    go('desk');
  }

  // ---- weekly advance --------------------------------------------------
  function advance() {
    const s = App.state;
    const notes = KP.advanceWeek(s);
    App.save();
    const urgent = notes.filter(n => n.urgent);
    const resolved = KP.groups(s).find(g => g.results && g.results.week === s.week);
    App.render();
    if (resolved) {
      push('results', resolved.id);
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
  // typed names survive re-renders (v0.8.4): keep drafts synced without
  // re-rendering on every keystroke
  document.addEventListener('input', (e) => {
    if (e.target.id === 'builder-name-input' && App.builderDraft) {
      App.builderDraft.customName = e.target.value;
    }
    if (e.target.id === 'title-name-input' && App.studioDraft) {
      App.studioDraft.customTitle = e.target.value;
    }
    // track renames in production (0.9.7.1) — drafts keyed by track number
    if (e.target.classList && e.target.classList.contains('track-rename-input')) {
      App.trackRenames = App.trackRenames || {};
      App.trackRenames[e.target.dataset.n] = e.target.value;
    }
    if (e.target.id === 'label-name-input') {
      App.labelName = e.target.value;
    }
  });

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-action],[data-nav]');
    if (!t) return;
    const s = App.state;
    if (t.dataset.nav) { go(t.dataset.nav); return; }
    const act = t.dataset.action;

    switch (act) {
      // ---- title screen (v0.5.1) ----
      case 'title-continue': {
        const st = KP.loadLocal(null);
        if (!st) { UI.toast('No career found in the autosave.', true); App.render(); break; }
        App.state = st; App.mode = 'game';
        go('desk');
        break;
      }
      case 'title-new': App.mode = 'newcareer'; App.render(); break;
      case 'title-back': App.mode = 'title'; App.render(); break;
      case 'title-import': {
        UI.modal('Import a career',
          '<div class="pad" style="font-size:.8rem;color:var(--ink-dim);margin-bottom:8px">Paste an exported save below, or choose the file. The career loads and becomes the autosave.</div>' +
          '<div class="pad"><textarea class="nc-input" id="import-text" rows="6" style="width:100%;font-size:.7rem;font-family:monospace" placeholder="{&quot;version&quot;: …}"></textarea></div>' +
          '<div class="pad"><input type="file" id="import-file" accept=".json,application/json" style="font-size:.8rem"></div>',
          '<button class="btn" data-action="close-modal" style="flex:1">Cancel</button>' +
          '<button class="btn primary" data-action="import-confirm" style="flex:1">Import</button>');
        break;
      }
      case 'import-confirm': {
        const txt = (document.getElementById('import-text') || {}).value || '';
        const r = KP.tryImport(txt.trim());
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.state = r.state;
        if (!KP.saveLocal(App.state)) UI.toast('Imported, but the autosave did not stick — storage is full. Export to keep it safe.', true);
        App.mode = 'game';
        UI.closeModal();
        UI.toast('Career imported — ' + KP.weekLabel(App.state.week).text + '.');
        go('desk');
        break;
      }

      case 'start-career': {
        // an existing career must never be silently overwritten (v0.5.1)
        if (KP.saveMeta(null)) {
          const meta = KP.saveMeta(null);
          UI.modal('A career is in progress',
            '<div class="pad" style="font-size:.88rem;line-height:1.5;color:var(--ink-dim)">The autosave holds a career at <b>' +
            UI.esc(meta.label) + '</b>. Starting a new one overwrites it (numbered slots are kept). Export it first from the in-game System menu if it matters.</div>',
            '<button class="btn" data-action="close-modal" style="flex:1">Keep it</button>' +
            '<button class="btn danger" data-action="start-career-confirm" style="flex:1">Overwrite &amp; start</button>');
          break;
        }
        // no existing career: fall through to the real start
        startCareer();
        break;
      }
      case 'start-career-confirm': {
        UI.closeModal();
        startCareer();
        break;
      }
      case 'advance': advance(); break;
      case 'noop': break;   // sheet body: swallow so the scrim doesn't close
      case 'close-modal': UI.closeModal(); break;
      case 'back': {
        const frame = App.stack.pop() || { view: null, scroll: 0, mark: null };
        App.view = frame.view;
        App._restore = frame;
        App.render();
        break;
      }
      case 'nav-studio': go('studio'); break;
      case 'nav-desk': go('desk'); break;
      case 'open-system': systemSheet(); break;
      case 'talent-sub': App.talentSub = t.dataset.sub; App.render(); break;
      case 'desk-sub': App.deskSub = t.dataset.sub; App.render(); break;
      case 'dossier-tab': App.dossierTab = t.dataset.tab; App.render(); break;
      case 'industry-sub': App.industrySub = t.dataset.sub; App.render(); break;
      case 'industry-chart': App.industryChart = t.dataset.chart; App.render(); break;
      case 'discourse-respond': {
        const r = KP.respondDiscourse(s, t.dataset.id, t.dataset.move);
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save();
        UI.modal(r.outcome === 'success' ? 'It lands' : r.outcome === 'backfire' ? 'It backfires' : 'It misses',
          '<div class="note' + (r.outcome === 'success' ? '' : ' urgent') + '" style="margin-top:4px">' + UI.esc(r.text) +
          '<span class="n-who">— PR desk, watching the numbers</span></div>',
          '<button class="btn primary" data-action="close-modal" style="flex:1">Noted</button>');
        App.render();
        break;
      }
      // the stage door (v0.8.0): ONE dispatcher path for every held scene
      case 'scene-opt': {
        const r = KP.resolveScene(s, t.dataset.scene, t.dataset.opt);
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save();
        if (r.toast) UI.toast(r.toast);
        App.render();
        break;
      }
      case 'meeting-answer': {
        const r = KP.answerMeeting(s, parseInt(t.dataset.opt, 10));
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save();
        UI.toast(r.note.slice(0, 120));
        App.render();
        break;
      }
      case 'dorm-shuffle': {
        const r = KP.shuffleRooms(s, t.dataset.id);
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save();
        UI.toast(r.note.slice(0, 120));
        App.render();
        break;
      }
      case 'cafe-notice': {
        const r = KP.cafeNotice(s, t.dataset.id);
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save(); UI.toast('The notice is up. Plain language, actual information.'); App.render();
        break;
      }
      case 'fan-meeting': {
        const r = KP.fanMeeting(s, t.dataset.id);
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save(); UI.toast('The fan meeting happened. Somebody brought a cake shaped like the road manager.'); App.render();
        break;
      }
      case 'school-trip': {
        const r = KP.scoutingTrip(s, t.dataset.id);
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save(); UI.toast('The trip paid for itself in notebook pages. New reads on the board.'); App.render();
        break;
      }
      case 'school-partner': {
        const r = KP.schoolPartnership(s, t.dataset.id);
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save(); UI.toast('Signed. Their best files reach our desk first now.'); App.render();
        break;
      }
      case 'lightstick': {
        const r = KP.launchLightstick(s, t.dataset.id);
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save(); UI.toast('Sold out. That is what lightsticks do.'); App.render();
        break;
      }
      case 'fandom-name': {
        const r = KP.nameFandom(s, t.dataset.id, parseInt(t.dataset.choice, 10));
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save();
        UI.toast(r.name + ' — in ' + r.color + '. It is official.');
        App.render();
        break;
      }
      case 'deal-accept': case 'deal-decline': {
        const r = KP.respondDeal(s, t.dataset.id, act === 'deal-accept');
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save();
        UI.toast(r.note.slice(0, 120));
        App.render();
        break;
      }
      case 'gig-accept': case 'gig-decline': {
        const r = KP.respondGig(s, t.dataset.id, act === 'gig-accept');
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save();
        UI.toast(r.note.slice(0, 120));
        App.render();
        break;
      }
      case 'gig-quit': {
        const r = KP.quitGig(s, t.dataset.id);
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save();
        UI.toast(r.note.slice(0, 120));
        App.render();
        break;
      }
      case 'declare-hiatus': {
        const g = KP.groupById(s, t.dataset.id);
        if (!g) break;
        UI.modal('An official hiatus',
          '<div class="note">The statement goes out today: ' + UI.esc(g.name) + ' steps back — no date, no promises beyond the return. ' +
          'Real rest for the members, room for their second jobs, and a comeback that lands as an event. But past ' +
          KP.C.HIATUS.graceWeeks + ' weeks the public starts forgetting, and forgetting compounds.</div>',
          '<button class="btn primary" data-action="hiatus-confirm" data-id="' + g.id + '" style="flex:1">Announce it</button>' +
          '<button class="btn" data-action="close-modal" style="flex:1">Not yet</button>');
        break;
      }
      case 'member-break': {
        const r = KP.declareMemberBreak(s, t.dataset.id);
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save(); UI.toast(r.note.slice(0, 120)); App.render();
        break;
      }
      case 'end-break': {
        const r = KP.endMemberBreak(s, t.dataset.id);
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save(); UI.toast(r.note.slice(0, 120)); App.render();
        break;
      }
      case 'remove-lineup': {
        const p = s.people[t.dataset.id];
        const g = KP.groupById(s, t.dataset.gid);
        if (!p || !g) break;
        UI.modal('Remove from the lineup',
          '<div class="note">' + UI.esc(KP.fillPro(KP.displayName(p) + ' leaves ' + g.name + ' — the contract stays, the seat does not. ' + g.name + ' continues as ' + (g.members.length - 1) + '. {She} keeps {pos} solo calendar (gigs, deals, second jobs), and {she} will remember whose decision this was, at every table you ever sit at together again.', p)) + '</div>',
          '<button class="btn danger" data-action="remove-lineup-confirm" data-id="' + p.id + '" data-gid="' + g.id + '" style="flex:1">Remove ' + UI.esc(KP.publicGiven(p)) + '</button>' +
          '<button class="btn" data-action="close-modal" style="flex:1">Keep the lineup</button>');
        break;
      }
      case 'remove-lineup-confirm': {
        const r = KP.removeFromLineup(s, t.dataset.gid, t.dataset.id);
        UI.closeModal();
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save(); UI.toast(r.note.slice(0, 120)); App.render();
        break;
      }
      case 'terminate': {
        const p = s.people[t.dataset.id];
        if (!p) break;
        const cost = KP.terminationCost(s, p);
        UI.modal('Terminate the contract',
          '<div class="note">' + UI.esc(KP.fillPro('The buyout: ' + cost + ' — the remaining years plus what {pos} name is worth. {She} leaves the company entirely, today. The dorm learns something about this building that it will not unlearn. This cannot be undone.', p)) + '</div>',
          '<button class="btn danger" data-action="terminate-confirm" data-id="' + p.id + '" style="flex:1">Terminate · ' + cost + '</button>' +
          '<button class="btn" data-action="close-modal" style="flex:1">Keep the contract</button>');
        break;
      }
      case 'terminate-confirm': {
        const r = KP.terminateContract(s, t.dataset.id);
        UI.closeModal();
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save(); UI.toast(r.note.slice(0, 120)); App.render();
        break;
      }
      case 'pitch-mandate': {
        UI.modal('The pitch upstairs',
          '<div class="note">You get the room for ten minutes. ' + UI.esc(s.executive.name) +
          ' will say yes for reasons and no for reasons — the trust ledger, the trainee floor, the books. Either answer closes the boardroom calendar for ' +
          KP.C.MANDATE.pitchCooldown + ' weeks.</div>',
          '<button class="btn primary" data-action="pitch-confirm" data-kind="group" data-gender="f" style="flex:1">A girl group</button>' +
          '<button class="btn primary" data-action="pitch-confirm" data-kind="group" data-gender="m" style="flex:1">A boy group</button>' +
          '<button class="btn primary" data-action="pitch-confirm" data-kind="solo" style="flex:1">A solo act</button>' +
          '<button class="btn" data-action="close-modal" style="flex:1">Not this week</button>');
        break;
      }
      case 'pitch-confirm': {
        const r = KP.pitchMandate(s, { kind: t.dataset.kind, gender: t.dataset.gender || null });
        UI.closeModal();
        if (!r.ok) { UI.toast(r.reason, true); App.save(); App.render(); break; }
        App.save();
        UI.toast('Greenlit. The window is open — the rest is yours.');
        App.render();
        break;
      }
      case 'disband-group': {
        const g = KP.groupById(s, t.dataset.id);
        if (!g) break;
        const selling = g.debuted && (g.popularity || 0) >= KP.C.DISBAND.sellingPop;
        UI.modal(g.debuted ? 'Conclude team activities' : 'Dissolve the project',
          '<div class="note">' + (g.debuted
            ? 'The statement goes out today: ' + UI.esc(g.name) + ' ends. The members stay with the company — contracts, solo careers, and second jobs all continue — but the group, its calendar, and everything scheduled end here. The catalog stays on the record.' +
              (selling ? ' <b>They still sell.</b> The board will read this as instability, and price it.' : '')
            : 'The ' + UI.esc(g.name) + ' project ends before the stage. The trainees return to the practice room, and the next lineup can begin.') +
          ' This cannot be undone.</div>',
          '<button class="btn danger" data-action="disband-confirm" data-id="' + g.id + '" style="flex:1">' +
            (g.debuted ? 'End it' : 'Dissolve it') + '</button>' +
          '<button class="btn" data-action="close-modal" style="flex:1">Keep going</button>');
        break;
      }
      case 'disband-confirm': {
        const r = KP.disbandGroup(s, t.dataset.id);
        UI.closeModal();
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save();
        UI.toast(r.note.slice(0, 120));
        App.render();
        break;
      }
      case 'hiatus-confirm': {
        const r = KP.declareHiatus(s, t.dataset.id);
        UI.closeModal();
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save();
        UI.toast(r.note.slice(0, 120));
        App.render();
        break;
      }
      case 'tour-scale': App.tourDraft.scale = t.dataset.scale; App.render(); break;
      case 'tour-pacing': App.tourDraft.pacing = t.dataset.pacing; App.render(); break;
      case 'tour-setlist': App.tourDraft.setlist = t.dataset.setlist; App.render(); break;
      case 'tour-leg': {
        const td = App.tourDraft, leg = t.dataset.leg;
        if (td.legs.includes(leg)) td.legs = td.legs.filter(x => x !== leg);
        else if (td.legs.length < KP.C.TOUR.maxLegs) td.legs.push(leg);
        else UI.toast('A tour is at most ' + KP.C.TOUR.maxLegs + ' legs. They are humans, not cargo.', true);
        App.render();
        break;
      }
      case 'tour-book': {
        const g = KP.UI.studioGroup(s);
        const td = App.tourDraft;
        const r = KP.planTour(s, { groupId: g.id, scale: td.scale, legs: td.legs,
          pacing: td.pacing, setlist: td.setlist });
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.tourDraft = null;
        App.save();
        UI.toast('The tour is booked. The road starts now — advance the weeks.');
        App.render();
        break;
      }
      // the tracklist credits (v0.7.5): whose name goes on track 3
      case 'track-open': {
        App.trackDraft = { groupId: t.dataset.id, n: parseInt(t.dataset.n, 10), unit: [] };
        trackSheet(s);
        break;
      }
      case 'track-set-group': {
        const d = App.trackDraft;
        const r = KP.assignTrack(s, d.groupId, d.n, { type: 'group' });
        if (!r.ok) { UI.toast(r.reason, true); break; }
        UI.closeModal(); App.trackDraft = null; App.save();
        UI.toast('The track goes back to the full group.');
        App.render();
        break;
      }
      case 'track-set-solo': {
        const d = App.trackDraft;
        const r = KP.assignTrack(s, d.groupId, d.n, { type: 'solo', memberId: t.dataset.mid });
        if (!r.ok) { UI.toast(r.reason, true); break; }
        UI.closeModal(); App.trackDraft = null; App.save();
        if (r.note) UI.toast(r.note);
        App.render();
        break;
      }
      case 'track-unit-toggle': {
        const d = App.trackDraft;
        const i = d.unit.indexOf(t.dataset.mid);
        if (i >= 0) d.unit.splice(i, 1);
        else if (d.unit.length < KP.C.TRACKS.unitSize[1]) d.unit.push(t.dataset.mid);
        trackSheet(s);
        break;
      }
      case 'track-set-unit': {
        const d = App.trackDraft;
        const r = KP.assignTrack(s, d.groupId, d.n, { type: 'unit', memberIds: d.unit });
        if (!r.ok) { UI.toast(r.reason, true); break; }
        UI.closeModal(); App.trackDraft = null; App.save();
        if (r.note) UI.toast(r.note);
        App.render();
        break;
      }
      case 'group-concept': {
        const r = KP.setGroupConcept(s, t.dataset.id, t.dataset.concept || null);
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save();
        if (r.note) UI.toast(r.note.slice(0, 120));
        App.render();
        break;
      }
      case 'clash-hold': case 'clash-slip': {
        const r = KP.respondClash(s, t.dataset.id, act === 'clash-hold' ? 'hold' : 'slip');
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save();
        UI.toast(r.note.text.slice(0, 120));
        App.render();
        break;
      }
      case 'open-dossier': App.dossierTab = 'profile'; push('dossier', t.dataset.id); break;
      case 'open-results': push('results', t.dataset.id); break;
      case 'open-grouppage': push('grouppage', t.dataset.id); break;
      case 'open-rivalact': push('rivalact', t.dataset.id); break;
      case 'studio-group': {
        App.studioGroupId = t.dataset.id;
        App.studioDraft.songId = null; App.studioDraft.conceptId = null; App.studioDraft.week = null;
        App.render();
        break;
      }

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
          (KP.signingsCapped(s)
            ? 'Signings remaining after this: ' + (s.signingsAllowed - s.signingsUsed - 1) + '.'
            : 'Budget after this: ₩ ' + (s.budget - cost) + '. The executive reads the books monthly.') + '</div>',
          '<button class="btn" data-action="close-modal" style="flex:1">Not yet</button>' +
          '<button class="btn primary" data-action="sign-confirm" data-id="' + p.id + '" style="flex:1">' + KP.fillPro('Sign {her}', p) + '</button>');
        break;
      }
      case 'protect-life': {
        const p = s.people[t.dataset.id];
        KP.setProtectedLife(s, p.id, !p.flags.protectedLife);
        UI.toast(p.flags.protectedLife ? 'Cover schedules and decoy vans — quiet, on retainer.' : 'Protection stood down.');
        App.save(); App.render();
        break;
      }
      case 'fund-audition': {
        const r = KP.fundAudition(s, t.dataset.id);
        if (r.ok) { UI.toast(r.minted + ' callbacks made the tape — files on the board.'); App.save(); App.render(); }
        else UI.toast(r.reason, true);
        break;
      }
      case 'pick-door': {
        App._door = t.dataset.door;   // the three doors (v0.9.28)
        App.render();
        break;
      }
      case 'launch-solo': {
        const p = s.people[t.dataset.id];
        UI.modal('Launch ' + p.name.display + '’s solo career?',
          '<div class="pad" style="font-size:.88rem;line-height:1.5;color:var(--ink-dim)">' + KP.fillPro('{She} leaves the lineup warmly — same company, {pos} own calendar. The group opens a new chapter, and the door stays oiled for return runs. This is the move stars remember forever.', p) + '</div>',
          '<button class="btn" data-action="close-modal" style="flex:1">Not yet</button>' +
          '<button class="btn primary" data-action="launch-solo-confirm" data-id="' + p.id + '" style="flex:1">Launch</button>');
        break;
      }
      case 'launch-solo-confirm': {
        const r = KP.launchSoloCareer(s, t.dataset.id);
        UI.closeModal();
        if (r.ok) { UI.toast('The career launches — announced as a family.'); App.save(); App.view = null; App.stack.length = 0; App.render(); }
        else UI.toast(r.reason, true);
        break;
      }
      case 'plan-unit': {
        const g = KP.groupById(s, t.dataset.id);
        if (!g) break;
        const rows = g.members.map(id => {
          const m = s.people[id];
          return '<label style="display:flex;gap:8px;align-items:center;padding:6px 0;font-size:.85rem">' +
            '<input type="checkbox" class="unit-pick" value="' + id + '"> ' + UI.esc(KP.displayName(m)) + '</label>';
        }).join('');
        UI.modal('The unit — pick ' + KP.C.PORTFOLIO.UNIT.minSize + ' or ' + KP.C.PORTFOLIO.UNIT.maxSize,
          '<div class="pad">' + rows + '</div>',
          '<button class="btn" data-action="close-modal" style="flex:1">Not now</button>' +
          '<button class="btn primary" data-action="unit-confirm" data-id="' + g.id + '" style="flex:1">Book the era</button>');
        break;
      }
      case 'unit-confirm': {
        const picks = Array.from(document.querySelectorAll('.unit-pick:checked')).map(el => el.value);
        const r = KP.planUnitEra(s, t.dataset.id, picks, null);
        UI.closeModal();
        if (r.ok) { UI.toast(r.unitName + ' — “' + r.title + '” is out. Reception ' + r.reception + '.'); App.save(); App.render(); }
        else UI.toast(r.reason, true);
        break;
      }
      case 'solo-album': {
        const r = KP.releaseSoloAlbum(s, t.dataset.id);
        if (r.ok) { UI.toast('“' + r.title + '” is out — reception ' + r.reception + '.'); App.save(); App.render(); }
        else UI.toast(r.reason, true);
        break;
      }
      case 'sign-freeagent': {
        const r = KP.signFreeAgent(s, t.dataset.id);
        if (r.ok) { UI.toast(s.people[t.dataset.id].name.display + ' signs — a career walks in the door.'); App.save(); App.render(); }
        else UI.toast(r.reason, true);
        break;
      }
      case 'sign-confirm': {
        const r = KP.signProspect(s, t.dataset.id);
        UI.closeModal();
        if (r.ok) { UI.toast(s.people[t.dataset.id].name.display + ' is ours.'); App.save(); App.view = null; App.stack.length = 0; App.render(); }
        else UI.toast(r.reason, true);
        break;
      }

      case 'open-roles': {
        const g = KP.groupById(s, t.dataset.id);
        if (!g) break;
        const members = g.members.map(id => s.people[id]);
        const rows = [['leader', 'Leader'], ['center', 'Center'], ['mainVocal', 'Main Vocal'],
          ['mainDancer', 'Main Dancer'], ['mainRapper', 'Main Rapper']].map(([key, label]) =>
          '<div class="role-row"><span class="r-label">' + label + '</span>' +
          '<select id="roles-edit-' + key + '">' +
          members.map(m => '<option value="' + m.id + '"' + (g.roles[key] === m.id ? ' selected' : '') + '>' +
            UI.esc(KP.displayName(m)) + '</option>').join('') +
          '</select></div>').join('');
        UI.modal('Roles · ' + g.name,
          rows +
          (g.debuted
            ? '<div class="pad" style="margin-top:12px;font-size:.78rem;color:var(--magenta)">They have debuted. A center change is public — the fans will have a verdict, and the member who loses the spot will feel it either way.</div>'
            : '<div class="pad" style="margin-top:12px;font-size:.78rem;color:var(--ink-dim)">Before a debut, the room adjusts quietly.</div>'),
          '<button class="btn" data-action="close-modal" style="flex:1">Cancel</button>' +
          '<button class="btn primary" data-action="roles-save" data-id="' + g.id + '" style="flex:1">Apply</button>');
        break;
      }
      case 'roles-save': {
        const roles = {};
        ['leader', 'center', 'mainVocal', 'mainDancer', 'mainRapper'].forEach(key => {
          const el = document.getElementById('roles-edit-' + key);
          if (el) roles[key] = el.value;
        });
        const r = KP.setGroupRoles(s, t.dataset.id, roles);
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save();
        UI.closeModal();
        if (r.notes.length) {
          UI.modal('The change lands',
            r.notes.map(n => '<div class="note' + (n.urgent ? ' urgent' : '') + '">' + UI.esc(n.text) +
              '<span class="n-who">— community & PR digest</span></div>').join(''),
            '<button class="btn primary" data-action="close-modal" style="flex:1">Noted</button>');
        } else {
          UI.toast('Roles updated.');
        }
        App.render();
        break;
      }

      case 'open-stagename': {
        const p = s.people[t.dataset.id];
        const sugg = KP.suggestStageNames(s, p);
        UI.modal('A name for the lights',
          '<div class="pad" style="font-size:.82rem;color:var(--ink-dim);margin-bottom:10px">' +
          UI.esc(p.name.display) + ' signs the fan cards with whatever we choose here. Pick well.</div>' +
          '<div class="pad"><input class="nc-input" id="stagename-input" maxlength="14" placeholder="Stage name" value="' + UI.esc(p.name.stage || '') + '"></div>' +
          '<div class="pad" style="display:flex;gap:7px;flex-wrap:wrap">' +
          sugg.map(n => '<button class="chip" data-action="stagename-pick" data-name="' + UI.esc(n) + '">' + UI.esc(n) + '</button>').join('') +
          '</div>',
          '<button class="btn" data-action="close-modal" style="flex:1">Cancel</button>' +
          '<button class="btn primary" data-action="stagename-save" data-id="' + p.id + '" style="flex:1">Set the name</button>');
        break;
      }
      case 'stagename-pick': {
        const input = document.getElementById('stagename-input');
        if (input) input.value = t.dataset.name;
        break;
      }
      case 'stagename-save': {
        const input = document.getElementById('stagename-input');
        const r = KP.setStageName(s, t.dataset.id, input ? input.value : '');
        if (!r.ok) { UI.toast(r.reason, true); break; }
        UI.closeModal();
        App.save();
        UI.toast('From now on, the lights say ' + s.people[t.dataset.id].name.stage + '.');
        App.render();
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
        UI.modal('Release ' + KP.displayName(p) + '?',
          '<div class="pad" style="font-size:.88rem;line-height:1.55;color:var(--ink-dim)">' + KP.fillPro('{Pos} contract ends, {she} leaves the building, and the decision is yours to own. Signings spent on {her} are not refunded.', p) +
          (close.length ? '<br><br>' + close.map(o => KP.publicGiven(o)).join(' and ') + ' will take it hard.' : '') + '</div>',
          '<button class="btn" data-action="close-modal" style="flex:1">' + KP.fillPro('Keep {her}', p) + '</button>' +
          '<button class="btn danger" data-action="release-confirm" data-id="' + p.id + '" style="flex:1">' + KP.fillPro('Release {her}', p) + '</button>');
        break;
      }
      case 'release-confirm': {
        const p = s.people[t.dataset.id];
        const r = KP.releaseTrainee(s, t.dataset.id);
        UI.closeModal();
        if (r.ok) {
          App.save();
          App.view = null; App.stack.length = 0; App.tab = 'talent';
          UI.toast(KP.displayName(p) + ' has left the building.');
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
        App.builderDraft = { members: [], roles: {}, name: null, seeking: [],
          nameOptions: KP.suggestGroupNames(s,
            new KP.Rng([s.seed, 'builder-names', s.week, s.nextGroupId].join('|'))) };
        // an open project walks in with its locked members already selected
        if (s.project) {
          App.builderDraft.members = s.project.locked.slice();
          App.builderDraft.seeking = s.project.seeking.slice();
        }
        App.builderDraft.name = App.builderDraft.nameOptions[0];
        push('builder');
        break;
      }
      case 'builder-seeking': {
        const d = App.builderDraft;
        const dom = t.dataset.domain;
        d.seeking = d.seeking || [];
        if (d.seeking.includes(dom)) d.seeking = d.seeking.filter(x => x !== dom);
        else if (d.seeking.length < KP.C.PROJECT.maxSeeking) d.seeking.push(dom);
        App.render();
        break;
      }
      case 'open-project': {
        const d = App.builderDraft;
        const r = KP.openProject(s, d.members, d.seeking);
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save();
        App.view = null; App.stack.length = 0; App.tab = 'groups';
        UI.toast('The project is open. The building will know by morning.');
        App.render();
        break;
      }
      case 'cancel-project': {
        const r = KP.cancelProject(s);
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save();
        UI.toast('Project shelved.' + (r.disappointed ? ' ' + r.disappointed + ' hopefuls heard.' : ''));
        App.render();
        break;
      }
      case 'builder-toggle': {
        const d = App.builderDraft;
        const id = t.dataset.id;
        if (d.members.includes(id)) {
          d.members = d.members.filter(x => x !== id);
          Object.keys(d.roles).forEach(r => { if (d.roles[r] === id) delete d.roles[r]; });
        } else if (d.members.length < KP.C.GROUP.maxMembers) d.members.push(id);
        else UI.toast('The directive caps the lineup at ' + KP.C.GROUP.maxMembers + '.', true);
        App.render();
        break;
      }
      case 'builder-name': App.builderDraft.name = t.dataset.name; App.builderDraft.customName = ''; App.render(); break;
      case 'builder-propose-solo': {
        const soloist = s.people[t.dataset.id];
        let actName = KP.displayName(soloist);
        if (KP.groups(s).some(g => g.name.toLowerCase() === actName.toLowerCase())) actName += ' (solo)';
        const r = KP.proposeGroup(s, actName, [soloist.id], {});
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save();
        App.view = null; App.stack.length = 0; App.tab = 'groups';
        UI.modal('The executive reviews the solo',
          r.review.map(line => '<div class="note">' + UI.esc(line) +
            '<span class="n-who">— ' + UI.esc(s.executive.name) + '</span></div>').join(''),
          '<button class="btn primary" data-action="close-modal" style="flex:1">Understood</button>');
        App.render();
        break;
      }
      case 'builder-propose': {
        const d = App.builderDraft;
        const typed = (document.getElementById('builder-name-input') || {}).value || '';
        const finalName = typed.trim() || d.name;
        const r = KP.proposeGroup(s, finalName, d.members, d.roles);
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save();
        App.view = null; App.stack.length = 0; App.tab = 'groups';
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
      case 'studio-format': App.studioDraft.format = t.dataset.format; App.studioDraft.week = null; App.render(); break;
      case 'studio-rollact': {
        const d = App.studioDraft;
        if (!d.rollout) break;
        const wk = d.rollout[parseInt(t.dataset.week, 10)];
        const a = t.dataset.act;
        if (wk.includes(a)) wk.splice(wk.indexOf(a), 1);
        else if (wk.length < KP.C.ROLLOUT.slotsPerWeek) wk.push(a);
        else UI.toast('Two bookings a week is the ceiling. They are humans, not content.', true);
        App.render();
        break;
      }
      case 'studio-week': App.studioDraft.week = parseInt(t.dataset.week, 10); App.render(); break;
      case 'studio-mv': App.studioDraft.mv = t.dataset.mv; App.render(); break;
      case 'studio-repackage': {
        const r = KP.planRepackage(s, { groupId: t.dataset.id, songId: t.dataset.song,
          mv: App.studioDraft.mv || 'standard' });
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save(); UI.toast('The era extends. The fandom is already budgeting for photocards.'); App.render();
        break;
      }
      case 'found-label': {
        const nm = (App.labelName || '').trim();
        if (!nm) { UI.toast('Name the label first. It goes on a building.', true); break; }
        if (!App.foundArmed) {
          App.foundArmed = true;
          UI.toast('Tap again to sign. Everything you built stays behind — as the competition.', true);
          setTimeout(() => { App.foundArmed = false; }, 6000);
          break;
        }
        App.foundArmed = false;
        const r = KP.foundLabel(s, nm);
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.labelName = '';
        App.save();
        UI.toast(nm + ' exists. War chest: ' + r.warChest + '. Eighteen months.');
        App.render();
        break;
      }
      case 'rename-track': {
        const val = (App.trackRenames || {})[t.dataset.n] || '';
        const r = KP.renameTrack(s, t.dataset.id, t.dataset.n, val);
        if (!r.ok) { UI.toast(r.reason, true); break; }
        if (App.trackRenames) delete App.trackRenames[t.dataset.n];
        App.save(); UI.toast('Renamed. The booklet will say so.'); App.render();
        break;
      }
      case 'mash-a': App.studioDraft.mashA = App.studioDraft.mashA === t.dataset.genre ? null : t.dataset.genre; App.render(); break;
      case 'mash-b': App.studioDraft.mashB = App.studioDraft.mashB === t.dataset.genre ? null : t.dataset.genre; App.render(); break;
      case 'studio-lock': {
        const d = App.studioDraft;
        const total = d.alloc.vocals + d.alloc.dance + d.alloc.rap + d.alloc.media;
        if (total !== 100) { UI.toast('Allocation totals ' + total + '% — make it 100.', true); break; }
        const sg = UI.studioGroup(s);
        const sel = (sg.demos || []).find(x => x.id === d.songId);
        // the company names the record (v0.8.4): a typed title replaces
        // the producers' working title before the lock
        if ((d.customTitle || '').trim()) {
          const rn = KP.renameDemo(s, sg.id, d.songId, d.customTitle);
          if (!rn.ok) { UI.toast(rn.reason, true); break; }
          d.customTitle = '';
        }
        // genre-bending (v0.9.6): both mash slots picked → the gamble rides
        const mash = (d.mashA && d.mashB && d.mashA !== d.mashB) ? [d.mashA, d.mashB] : null;
        const r = KP.planDebut(s, { groupId: sg.id, songId: d.songId, conceptId: d.conceptId || sel.conceptId,
          promo: d.promo, week: d.week, alloc: d.alloc, format: d.format, rollout: d.rollout, mash,
          mv: d.mv || 'standard' });
        if (!r.ok) { UI.toast(r.reason, true); break; }
        App.save();
        if (r.warning) {
          UI.modal('Locked — with a note from staff',
            '<div class="note urgent" style="margin-top:4px">' + UI.esc(r.warning) +
            '<span class="n-who">— management, quietly</span></div>',
            '<button class="btn primary" data-action="close-modal" style="flex:1">Understood</button>');
        } else {
          UI.toast('Locked. ' + KP.weekLabel(d.week).text + '. No going back.');
        }
        App.render();
        break;
      }
    }
  });

  // selects: builder role picks must actually stick (v0.3.3 bug fix —
  // there was no change handler, so re-renders reverted to staff picks)
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.action === 'builder-role' && App.builderDraft) {
      App.builderDraft.roles[t.dataset.role] = t.value;
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
  // the credit sheet (v0.7.5): a solo, a unit, or back to the group
  function trackSheet(s) {
    const d = App.trackDraft;
    const g = KP.groupById(s, d.groupId);
    if (!g || !g.prep || !g.prep.tracks) { UI.closeModal(); return; }
    const tr = g.prep.tracks.find(x => x.n === d.n);
    if (!tr) { UI.closeModal(); return; }
    const T = KP.C.TRACKS;
    const credited = {};
    g.prep.tracks.forEach(x => {
      if (x.n !== tr.n && x.credit) (x.credit.memberIds || [x.credit.memberId]).forEach(id => { credited[id] = true; });
    });
    const members = g.members.map(id => s.people[id]).filter(Boolean);
    const unitOk = d.unit.length >= T.unitSize[0] && d.unit.length <= T.unitSize[1] && d.unit.length < members.length;
    UI.modal('Track ' + tr.n + ' · “' + UI.esc(tr.title) + '”',
      '<div class="pad" style="font-size:.82rem;color:var(--ink-dim);margin-bottom:10px">Whose name goes on this one? The fans will have opinions either way. One special credit per member per record.</div>' +
      '<div class="pad"><button class="btn" style="width:100%" data-action="track-set-group">Full group' + (tr.credit ? ' (clear the credit)' : '') + '</button></div>' +
      '<div class="pad kicker" style="margin-top:8px">A solo</div>' +
      '<div class="pad" style="display:flex;gap:7px;flex-wrap:wrap">' +
      members.map(p => '<button class="chip' + (credited[p.id] ? '' : ' cool') + '"' +
        (credited[p.id] ? ' disabled style="opacity:.4"' : ' data-action="track-set-solo" data-mid="' + p.id + '"') + '>' +
        UI.esc(KP.publicGiven(p)) + (credited[p.id] ? ' · credited' : '') + '</button>').join('') +
      '</div>' +
      (members.length >= T.minMembersForUnits
        ? '<div class="pad kicker" style="margin-top:8px">A unit · pick ' + T.unitSize[0] + '–' + T.unitSize[1] + '</div>' +
          '<div class="pad" style="display:flex;gap:7px;flex-wrap:wrap">' +
          members.map(p => '<button class="chip' + (d.unit.includes(p.id) ? ' hot' : '') + '"' +
            (credited[p.id] ? ' disabled style="opacity:.4"' : ' data-action="track-unit-toggle" data-mid="' + p.id + '"') + '>' +
            UI.esc(KP.publicGiven(p)) + '</button>').join('') +
          '</div>'
        : ''),
      '<button class="btn" data-action="close-modal" style="flex:1">Close</button>' +
      (members.length >= T.minMembersForUnits
        ? '<button class="btn primary" data-action="track-set-unit" style="flex:1"' + (unitOk ? '' : ' disabled') + '>Set the unit</button>'
        : ''));
  }

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
      '<div class="pad" style="font-size:.78rem;color:var(--ink-dim);margin-bottom:8px">Autosaves every week advance. v' + KP.C.VERSION +
      ' · save ' + KP.saveSizeKB(s) + ' KB · storage <span id="storage-status">…</span></div>' +
      slots.join('') +
      '<div class="pad" style="margin-top:14px;display:flex;gap:8px">' +
      '<button class="btn small" data-action="export-save">Export save</button>' +
      '<button class="btn danger small" data-action="abandon">Abandon career</button></div>',
      '<button class="btn primary" data-action="close-modal" style="flex:1">Close</button>');
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(p => {
        const el = document.getElementById('storage-status');
        if (el) el.textContent = p ? 'protected' : 'best-effort';
      }).catch(() => {});
    }
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    if (t.dataset.action === 'save-slot') {
      const ok = KP.saveLocal(App.state, t.dataset.slot);
      UI.toast(ok ? 'Saved to slot ' + t.dataset.slot + '.' : 'Slot save failed — storage is full. Export instead.', !ok);
      systemSheet();
    }
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
      App.state = null; App.view = null; App.stack.length = 0; App.mode = 'title';
      UI.closeModal(); App.render();
    }
    // export (v0.5.1): the career as a file or a clipboard string
    if (t.dataset.action === 'export-save') {
      const json = KP.serialize(App.state);
      UI.modal('Export career',
        '<div class="pad" style="font-size:.8rem;color:var(--ink-dim);margin-bottom:8px">' +
        KP.weekLabel(App.state.week).text + ' · v' + KP.C.VERSION + ' · ' + KP.saveSizeKB(App.state) + ' KB. ' +
        'Keep a copy anywhere safe — it re-imports from the title screen.</div>' +
        '<div class="pad"><textarea class="nc-input" id="export-text" rows="5" readonly style="width:100%;font-size:.66rem;font-family:monospace">' +
        UI.esc(json) + '</textarea></div>',
        '<button class="btn" data-action="export-copy" style="flex:1">Copy</button>' +
        '<button class="btn" data-action="export-download" style="flex:1">Download</button>' +
        '<button class="btn primary" data-action="close-modal" style="flex:1">Done</button>');
    }
    if (t.dataset.action === 'export-copy') {
      const ta = document.getElementById('export-text');
      if (!ta) return;
      const done = () => UI.toast('Copied. Paste it somewhere that survives your phone.');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ta.value).then(done).catch(() => { ta.select(); document.execCommand('copy'); done(); });
      } else { ta.select(); document.execCommand('copy'); done(); }
    }
    if (t.dataset.action === 'export-download') {
      const blob = new Blob([KP.serialize(App.state)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'kpam-save-w' + App.state.week + '-v' + KP.C.VERSION + '.json';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      UI.toast('Save downloaded.');
    }
  });

  // import file picker feeds the paste box (v0.5.1)
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t && t.id === 'import-file' && t.files && t.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        const ta = document.getElementById('import-text');
        if (ta) ta.value = String(reader.result || '');
      };
      reader.readAsText(t.files[0]);
    }
  });

  // ---- boot ------------------------------------------------------------
  window.addEventListener('load', () => {
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    // ask the browser to protect our storage from eviction (v0.5.1) —
    // best-effort everywhere, meaningful on iOS home-screen installs
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
    App.mode = 'title';
    App.render();
    setTimeout(() => {
      const sp = document.getElementById('splash');
      sp.classList.add('gone');
      setTimeout(() => sp.remove(), 500);
    }, 900);
  });
})(typeof window !== 'undefined' ? window : globalThis);
