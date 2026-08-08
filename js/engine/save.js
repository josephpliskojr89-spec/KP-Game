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
    // v0.1.0 is the genesis schema — nothing to migrate yet.
  ];

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
