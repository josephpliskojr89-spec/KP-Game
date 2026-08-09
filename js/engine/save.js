/* Versioned saves + the migration chain. Saves are sacred: every future
   schema change adds a one-shot, version-gated migration here. Stamping is
   forward-only — a rolled-back client never un-stamps a newer save. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  KP.versionLt = function (a, b) {
    const pa = String(a || '0.0.0').split('.').map(Number);
    const pb = String(b || '0.0.0').split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) < (pb[i] || 0)) return true;
      if ((pa[i] || 0) > (pb[i] || 0)) return false;
    }
    return false;
  };

  // The chain. Each entry: { v, fn(state) } applied in order when save < v.
  const MIGRATIONS = [
    // v0.2.0 — the comeback loop. Backfills release/popularity fields on
    // debuted groups and repairs the idol-fatigue accumulation bug (idols
    // kept their training intensity with no recovery path after debut).
    { v: '0.2.0', fn: function (state) {
      state.objectiveHistory = state.objectiveHistory || [];
      const g = state.group;
      if (g && g.debuted && g.results) {
        g.releases = g.releases || [{
          week: g.results.week, songTitle: g.results.songTitle,
          conceptId: g.results.conceptId, reception: g.results.reception,
          receptionBand: g.results.receptionBand,
          chartPeak: g.results.chartPeak != null ? g.results.chartPeak
            : Math.max(1, Math.min(100, Math.round(104 - g.results.reception))),
          chartWeeks: g.results.chartWeeks != null ? g.results.chartWeeks
            : Math.max(0, Math.round((g.results.reception - 28) / 6)),
          isDebut: true,
        }];
        if (g.results.isDebut == null) g.results.isDebut = true;
        if (g.popularity == null) g.popularity = Math.max(0, Math.min(100, Math.round(15 + g.results.reception * 0.75)));
        if (g.lastReleaseWeek == null) g.lastReleaseWeek = g.results.week;
        if (g.promoUntil == null) g.promoUntil = g.results.week + 4;
        // a comeback needs a locked plan to exist, so a stale prep is cleared
        if (g.prep && g.debuted && g.results.week >= (g.prep.scheduledWeek || 0)) g.prep = null;
        // fatigue repair, narrated in the fiction
        let repaired = false;
        g.members.forEach(id => {
          const p = state.people[id];
          if (p && p.status === 'idol' && p.fatigue > 65) { p.fatigue = 60; repaired = true; }
        });
        if (repaired) {
          state.inbox = state.inbox || [];
          state.inbox.unshift({
            kind: 'health', week: state.week, read: false,
            id: 'm' + (state.nextMsgId++),
            text: 'Management review: post-debut schedules had never been rebalanced, and the members were running on empty. Rest days are now built into the promotion calendar. They finally slept.',
          });
        }
      }
    } },
    // v0.2.1 — formats, rollout focus, comeback labels. Backfills old
    // preps/releases as singles and repairs any comeback report that was
    // mislabeled with debut wording (owner-reported).
    { v: '0.2.1', fn: function (state) {
      const g = state.group;
      if (!g) return;
      if (g.prep) {
        if (!g.prep.format) g.prep.format = 'single';
        if (!g.prep.focus) g.prep.focus = 'musicShows';
      }
      if (g.debuted && !g.promoFocus) g.promoFocus = 'musicShows';
      (g.releases || []).forEach(r => {
        if (!r.format) { r.format = 'single'; r.tracks = 2; }
      });
      if (g.results) {
        if (!g.results.format) g.results.format = 'single';
        if (g.results.isDebut === false) {
          g.results.receptionLabel =
            KP.C.COMEBACK.bandLabels[g.results.receptionBand] || g.results.receptionLabel;
        }
      }
    } },
  ];

  // v0.2.2 — one group becomes many. The single group moves into
  // state.groups[] with an id; its demos ride along; the open objective
  // learns which group it concerns.
  MIGRATIONS.push({ v: '0.2.2', fn: function (state) {
    state.groups = state.groups || [];
    state.nextGroupId = state.nextGroupId || 1;
    if (state.group) {
      const g = state.group;
      g.id = g.id || ('g' + (state.nextGroupId++));
      g.releases = g.releases || [];
      g.demos = state.demos || null;
      state.groups.push(g);
      delete state.group;
      delete state.demos;
      if (state.objective && state.objective.type === 'comeback' && !state.objective.groupId) {
        state.objective.groupId = g.id;
      }
    }
  } });

  // v0.2.3 — the open agency. Fiscal tracking begins; the signing cap is
  // computed (capped only until first debut), so no data change needed.
  MIGRATIONS.push({ v: '0.2.3', fn: function (state) {
    state.fiscal = state.fiscal || {
      monthStartBudget: state.budget, pressure: 0, monthSignings: 0,
    };
  } });

  // v0.3.1 — the age curve moved (15-16 is the norm now, floor 14) and
  // the owner asked for the scouting board to be reborn under it. The
  // signed roster is untouched — those people are the save's story.
  MIGRATIONS.push({ v: '0.3.1', fn: function (state) {
    if (!state.prospects || !state.rngState) return;
    const rng = KP.Rng.fromState(state.rngState);
    state.prospects.forEach(id => {
      (state.rivals || []).forEach(r => { delete r.interest[id]; });
      delete state.people[id];
    });
    state.prospects = [];
    const usedNames = new Set(Object.values(state.people).map(p => p.name.given.toLowerCase()));
    KP.resetIds(state.nextPersonId || 1);
    const count = rng.int(KP.C.GEN.prospectCount[0], KP.C.GEN.prospectCount[1]);
    let hot = null;
    for (let i = 0; i < count; i++) {
      const p = KP.generatePerson(rng, { status: 'prospect', usedNames });
      state.people[p.id] = p;
      state.prospects.push(p.id);
      if (!hot || p.talents.charisma.cur > hot.talents.charisma.cur) hot = p;
    }
    state.nextPersonId = KP.peekNextId();
    if (hot) (state.rivals || []).forEach(r => { r.interest[hot.id] = 2; });
    state.rngState = rng.state();
    state.inbox = state.inbox || [];
    state.inbox.unshift({
      kind: 'scouting', week: state.week, read: false,
      id: 'm' + (state.nextMsgId++),
      text: 'Scout Im cleared the board and rebuilt it overnight: “The academies are full of fourteen- and fifteen-year-olds — that is where the industry looks now, so that is where we look. Fresh reports on your desk. The old files are archived, not mourned.”',
    });
  } });

  // v0.4.0 — the living world. Existing rivals gain prestige, running acts
  // and a debut calendar; the scene chart and the fan feed switch on. All
  // through the same seeding path a new game uses.
  MIGRATIONS.push({ v: '0.4.0', fn: function (state) {
    if (!state.rngState) return;
    const rng = KP.Rng.fromState(state.rngState);
    KP.seedIndustry(state, rng);
    state.rngState = rng.state();
    state.inbox = state.inbox || [];
    state.inbox.unshift({
      kind: 'industry', week: state.week, read: false,
      id: 'm' + (state.nextMsgId++),
      text: 'The industry desk has expanded: the trade wires, the weekly scene chart, and — heaven help us — the fan forums now run on your monitors. The other companies were always out there working. Now you get to watch them do it.',
    });
  } });

  // v0.4.1 — the five-band ladder. No data changes (bands are read, not
  // stored — Law 2), but dossier language shifts mid-save, so the
  // evaluation department says so.
  MIGRATIONS.push({ v: '0.4.1', fn: function (state) {
    state.inbox = state.inbox || [];
    state.inbox.unshift({
      kind: 'company', week: state.week, read: false,
      id: 'm' + (state.nextMsgId++),
      text: 'The evaluation department has recalibrated its rubric: five grades now, with “Capable” between Developing and Strong. Coach Baek: “Half the roster was neither learning nor excelling and the old forms had no word for it. Now we have the word.” Existing reads have been restated — nobody got better or worse overnight, only described more honestly.',
    });
  } });

  // v0.4.2 — the schedule breathes. The v0.2.0 letter promised rest days;
  // the calendar never actually scheduled them, and debuted rosters ran
  // pinned on fumes. Contractual rest now exists — and the repair honors
  // the old promise: exhausted idols finally sleep.
  MIGRATIONS.push({ v: '0.4.2', fn: function (state) {
    let repaired = false;
    (state.groups || []).forEach(g => {
      if (!g.debuted) return;
      g.members.forEach(id => {
        const p = state.people[id];
        if (p && p.status === 'idol' && p.fatigue > 55) { p.fatigue = 50; repaired = true; }
      });
    });
    state.inbox = state.inbox || [];
    state.inbox.unshift({
      kind: 'health', week: state.week, read: false,
      id: 'm' + (state.nextMsgId++),
      text: 'A management audit found what the members already knew: the release calendar never actually contained the rest days it promised. Effective immediately, promotion cool-downs are contractual — after every cycle the schedule closes and stays closed.' +
        (repaired ? ' The current roster was sent home for a real week off. They slept like the debt it was.' : ''),
    });
  } });

  // v0.4.3 — rivals with faces. Existing rival acts gain real member
  // rosters through the same seeding path; the desk announces its files.
  MIGRATIONS.push({ v: '0.4.3', fn: function (state) {
    if (!state.rngState) return;
    const rng = KP.Rng.fromState(state.rngState);
    KP.seedIndustry(state, rng);
    state.rngState = rng.state();
    state.inbox = state.inbox || [];
    state.inbox.unshift({
      kind: 'industry', week: state.week, read: false,
      id: 'm' + (state.nextMsgId++),
      text: 'The industry desk finished its artist files: every active group on the scene now has member profiles on record — names, ages, faces. Including, where it stings, the ones who used to be on our board.',
    });
  } });

  KP.migrate = function (state) {
    const applied = [];
    MIGRATIONS.forEach(m => {
      if (KP.versionLt(state.version, m.v)) {
        m.fn(state);
        applied.push(m.v);
      }
    });
    // forward-only stamp
    if (KP.versionLt(state.version, KP.C.VERSION)) state.version = KP.C.VERSION;
    return applied;
  };

  KP.serialize = function (state) { return JSON.stringify(state); };
  KP.deserialize = function (json) {
    const state = JSON.parse(json);
    KP.migrate(state);
    // keep the id counter ahead of every loaded person/message
    let maxP = 0;
    Object.keys(state.people || {}).forEach(id => {
      const n = parseInt(id.slice(1), 10);
      if (n > maxP) maxP = n;
    });
    state.nextPersonId = Math.max(maxP + 1, state.nextPersonId || 0);
    KP.resetIds(state.nextPersonId);
    return state;
  };

  // Browser-side persistence (no-ops under Node test sandbox).
  KP.saveLocal = function (state, slot) {
    if (typeof localStorage === 'undefined') return false;
    const key = KP.C.SAVE_KEY + (slot ? '_slot' + slot : '_auto');
    localStorage.setItem(key, KP.serialize(state));
    localStorage.setItem(key + '_meta', JSON.stringify({
      when: Date.now(), week: state.week, version: state.version,
      label: KP.weekLabel(state.week).text,
    }));
    return true;
  };
  KP.loadLocal = function (slot) {
    if (typeof localStorage === 'undefined') return null;
    const key = KP.C.SAVE_KEY + (slot ? '_slot' + slot : '_auto');
    const json = localStorage.getItem(key);
    return json ? KP.deserialize(json) : null;
  };
  KP.saveMeta = function (slot) {
    if (typeof localStorage === 'undefined') return null;
    const key = KP.C.SAVE_KEY + (slot ? '_slot' + slot : '_auto') + '_meta';
    const json = localStorage.getItem(key);
    return json ? JSON.parse(json) : null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
