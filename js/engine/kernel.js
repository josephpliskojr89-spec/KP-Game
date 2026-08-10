/* The kernel (v0.7.2) — the architectural foundation for the Living
   Industry era. Built from this project's own bug history:

   1. NOTES had two lifecycles (returned-and-stamped vs pushed-and-
      hand-stamped), boolean urgency, and no validation — which cost us
      a null-note crash (v0.6.8) and two trim-crowding bugs where real
      letters were silently dropped (v0.6.5, v0.7.1). One bus now.
   2. FEED REACTIONS were a 34-branch if-chain on magic strings — a
      typo'd ind produced silence, not an error. A registry now.
   3. THE WEEKLY PIPELINE was 26 hand-numbered sections in one god
      function — every ordering bug this project ever had (prestige
      captured after use, weekReleases reset timing, the version-bump
      fork tell) was an ordering bug. An explicit named pipeline now.
   4. STATE had no invariant checker — corruption would surface as a
      distant NaN. A validator now, run by the harness every week.

   LAWS (also in docs/ARCHITECTURE.md):
   - rng draws happen in exactly two places: the weekly tick and player
     actions. NEVER during render. (v0.6.3's social-mint lesson,
     promoted to law after the demo-generation render mutation.)
   - One truth per visible number. Hash channels for observer-safe
     derived values; rng for world evolution.
   - Notes go through KP.note / are returned to the tick. Nothing else
     touches the inbox.
   - New systems extend via registries; they do not edit the driver. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // ---- 1. the note bus --------------------------------------------------
  // priorities: 'critical' (never trimmed, always tops), 'high'
  // (survives the weekly trim), 'normal' (trimmable), 'flavor' (first
  // to go). Legacy urgent:true maps to 'high'.
  const PRIORITY = { critical: 3, high: 2, normal: 1, flavor: 0 };
  KP.noteCheck = function (n, where) {
    if (!n || typeof n.text !== 'string' || !n.text.length) {
      throw new Error('kernel: malformed note from ' + (where || 'unknown') +
        ' — every note needs text. Got: ' + JSON.stringify(n));
    }
    return n;
  };
  KP.notePriority = function (n) {
    if (n.priority && PRIORITY[n.priority] != null) return PRIORITY[n.priority];
    return n.urgent ? PRIORITY.high : PRIORITY.normal;
  };
  // immediate delivery (player actions) — ONE stamping path
  KP.note = function (state, n) {
    KP.noteCheck(n, 'action');
    n.week = state.week; n.read = false;
    n.id = 'm' + (state.nextMsgId++);
    state.inbox.unshift(n);
    return n;
  };
  // the weekly trim, priority-aware: criticals and highs always kept,
  // the rest fill the budget in arrival order
  KP.trimWeekNotes = function (notes, budget) {
    notes.forEach(n => { KP.noteCheck(n, 'tick'); });
    // the budget applies to trimmables only — the old contract was
    // maxInboxPerWeek + count(urgent); this is the same shape with
    // real names and 'flavor' going first when the week is loud
    const must = notes.filter(n => KP.notePriority(n) >= PRIORITY.high);
    const rest = notes.filter(n => KP.notePriority(n) < PRIORITY.high)
      .sort((a, b) => KP.notePriority(b) - KP.notePriority(a));
    return must.concat(rest.slice(0, budget));
  };

  // ---- 2. the feed-reaction registry ------------------------------------
  // systems register reactions to event indicators; the feed looks them
  // up. Registering twice for one ind is a bug and throws at load.
  const feedReactions = {};
  KP.onFeedEvent = function (ind, fn) {
    if (feedReactions[ind]) throw new Error('kernel: duplicate feed reaction for "' + ind + '"');
    feedReactions[ind] = fn;
  };
  KP.feedReactionFor = function (ind) { return feedReactions[ind] || null; };
  KP.feedReactionInds = function () { return Object.keys(feedReactions); };

  // ---- 3. the weekly pipeline -------------------------------------------
  // The driver (sim.js) declares its phases as an explicit named list.
  // Future systems insert phases WITHOUT editing the driver. Order keys
  // are sparse numbers; ties resolve by registration order (stable).
  const extraPhases = [];
  KP.registerWeekly = function (name, order, fn) {
    if (typeof order !== 'number' || !name || typeof fn !== 'function') {
      throw new Error('kernel: registerWeekly(name, order, fn)');
    }
    extraPhases.push({ name, order, fn, seq: extraPhases.length });
  };
  KP.weeklyPipeline = function (corePhases) {
    const all = corePhases.map((p, i) => ({ name: p.name, order: p.order, fn: p.fn, seq: -corePhases.length + i }));
    extraPhases.forEach(p => all.push(p));
    return all.sort((a, b) => a.order - b.order || a.seq - b.seq);
  };

  // ---- 4. the state validator -------------------------------------------
  // Structural invariants only — cheap enough for the harness to run
  // weekly. Returns a list of violations; empty means sound.
  KP.validateState = function (state) {
    const v = [];
    const bad = (msg) => v.push(msg);
    if (!state || !state.people) return ['no state'];
    (state.roster || []).forEach(id => { if (!state.people[id]) bad('roster ghost ' + id); });
    (state.prospects || []).forEach(id => { if (!state.people[id]) bad('prospect ghost ' + id); });
    (state.groups || []).forEach(g => {
      (g.members || []).forEach(id => { if (!state.people[id]) bad(g.name + ' member ghost ' + id); });
      if (g.rooms) {
        const roomed = g.rooms.flat().sort().join();
        const members = g.members.slice().sort().join();
        if (roomed !== members) bad(g.name + ' room chart does not partition the lineup');
      }
      if (g.regions) Object.entries(g.regions).forEach(([k, val]) => {
        if (!isFinite(val)) bad(g.name + ' region ' + k + ' is ' + val);
      });
      if (!isFinite(g.popularity || 0)) bad(g.name + ' popularity NaN');
    });
    Object.values(state.people).forEach(p => {
      if (!isFinite(p.fatigue) || !isFinite(p.morale)) bad(p.id + ' vital NaN');
      KP.C.TALENTS.forEach(d => { if (!isFinite(p.talents[d].cur)) bad(p.id + ' ' + d + ' NaN'); });
    });
    if (!isFinite(state.budget)) bad('budget NaN');
    if (!isFinite(state.trust)) bad('trust NaN');
    (state.deals || []).forEach(d => { if (!state.people[d.personId]) bad('deal ghost ' + d.personId); });
    return v;
  };
})(typeof window !== 'undefined' ? window : globalThis);
