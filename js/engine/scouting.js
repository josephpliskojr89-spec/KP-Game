/* Scouting board: prospects, targeted looks, signings, rival interest.
   Information is an economy — a look costs budget the same currency as a
   signing. Rivals compete for the same prospects through the same board. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  KP.prospectById = function (state, id) { return state.people[id]; };

  // Rival heat on a prospect: 0 none, 1 watching, 2 interested, 3 hot
  KP.rivalHeat = function (state, personId) {
    let max = 0;
    const names = [];
    state.rivals.forEach(r => {
      const lvl = r.interest[personId] || 0;
      if (lvl > 0) names.push({ name: r.short, level: lvl });
      max = Math.max(max, lvl);
    });
    return { max, names };
  };

  KP.signCost = function (state, person) {
    const E = KP.C.ECON;
    const heat = KP.rivalHeat(state, person.id).max;
    return E.signCostBase + heat * E.signCostPerHeat;
  };

  // Targeted look: spend budget, gain one observation (narrows every read).
  KP.observeProspect = function (state, personId) {
    const p = state.people[personId];
    const cost = KP.C.SCOUT.observeCost;
    if (!p || p.status !== 'prospect') return { ok: false, reason: 'Not on the board.' };
    if ((p.observations || 0) >= KP.C.SCOUT.maxObservations) return { ok: false, reason: 'The staff have seen all they need to see.' };
    if (state.budget < cost) return { ok: false, reason: 'No budget for another look.' };
    state.budget -= cost;
    p.observations = (p.observations || 0) + 1;
    return { ok: true };
  };

  // The signing allowance is the tutorial rail: it binds only until the
  // first debut. After that the agency is open — the CEO watches the
  // books instead (fiscal pressure, sim.js).
  KP.signingsCapped = function (state) {
    return !KP.groups(state).some(g => g.debuted);
  };

  KP.signProspect = function (state, personId) {
    const p = state.people[personId];
    if (!p || p.status !== 'prospect') return { ok: false, reason: 'No longer available.' };
    const cost = KP.signCost(state, p);
    if (state.budget < cost) return { ok: false, reason: 'The budget cannot cover this signing.' };
    if (KP.signingsCapped(state) && state.signingsUsed >= state.signingsAllowed) {
      return { ok: false, reason: 'The executive approved ' + state.signingsAllowed + ' external signings until the debut. That allowance is spent.' };
    }
    state.budget -= cost;
    state.signingsUsed++;
    if (state.fiscal) state.fiscal.monthSignings = (state.fiscal.monthSignings || 0) + 1;
    p.status = 'trainee';
    p.signedWeek = state.week;
    p.training = { focus: [], intensity: 'standard' };
    state.roster.push(p.id);
    state.prospects = state.prospects.filter(id => id !== p.id);
    // rivals notice
    state.rivals.forEach(r => { delete r.interest[p.id]; });
    // the school hangs the signing photo (v0.9.16)
    KP.schoolRecordAlum(state, p, state.company.short);
    p.history.push({ week: state.week, text: 'Signed to ' + state.company.short + ' (' + p.source + ').' });
    return { ok: true, cost };
  };

  // Weekly rival scouting activity. Rivals escalate interest, and sometimes
  // sign a prospect out from under the player. They act through the same
  // perceived layer — their scouts read the same fogged truth.
  KP.rivalScoutingWeek = function (state, rng) {
    const S = KP.C.SCOUT;
    const notes = [];
    state.rivals.forEach(rival => {
      // a rival with a debut to cast scouts like it (v0.4.3)
      const hungry = rival.nextDebutWeek != null &&
        state.week >= rival.nextDebutWeek - S.rivalHungerWindow;
      // escalate or open interest on prospects fitting the rival's philosophy
      const shiftChance = Math.min(0.9, KP.C.RIVALS.weeklyInterestShift * (hungry ? 1.4 : 1));
      if (rng.chance(shiftChance)) {
        const target = pickRivalTarget(state, rival, rng);
        if (target) {
          const cur = rival.interest[target.id] || 0;
          if (cur < 3) {
            rival.interest[target.id] = cur + 1;
            if (rival.interest[target.id] >= 2) {
              notes.push({ kind: 'scouting', text: rival.short + ' scouts were seen at ' + KP.displayName(target) + '’s academy. Their interest looks ' + (rival.interest[target.id] === 3 ? 'serious' : 'real') + (hungry ? ' — and word is they are casting a new group' : '') + '.' });
            }
          }
        }
      }
      // attempt signings on interested prospects
      Object.keys(rival.interest).forEach(pid => {
        const p = state.people[pid];
        if (!p || p.status !== 'prospect') { delete rival.interest[pid]; return; }
        const lvl = rival.interest[pid];
        let chance = lvl >= 3 ? S.rivalSignHotChance : lvl === 2 ? S.rivalSignBaseChance : 0;
        if (hungry) chance = Math.min(0.6, chance * S.rivalHungerMult);
        if (chance && rng.chance(chance)) {
          p.status = 'rival';
          p.company = rival.short;
          KP.schoolRecordAlum(state, p, rival.short);
          p.history.push({ week: state.week, text: 'Signed to ' + rival.short + ' — off our board.' });
          state.prospects = state.prospects.filter(id => id !== pid);
          state.rivals.forEach(r => { delete r.interest[pid]; });
          rival.rosterCount = (rival.rosterCount || 0) + 1;
          notes.push({ kind: 'scouting', urgent: true, text: KP.fillPro(rival.short + ' signed ' + KP.displayName(p) + '. {She} is off the board' + (hungry ? ' — and probably in their debut lineup' : '') + '.', p) });
          // the scouts keep score (v0.6.1): enough poaches become a name
          rival.poachCount = (rival.poachCount || 0) + 1;
          if (rival.poachCount >= KP.C.MEMORY.poachAt) {
            const nar = KP.recordEvidence(state, 'poachers', 'rivalCompany', rival.short);
            if (nar) notes.push(nar);
          }
        }
      });
    });
    // the board is a market, not a museum (0.9.13 audit A2): leads who
    // aged past the market without a signature move on — file and all,
    // because nobody here ever met them
    const stale = (state.prospects || []).filter(id => {
      const pr = state.people[id];
      return pr && pr.age >= S.prospectAgeOut;
    });
    if (stale.length) {
      stale.forEach(id => {
        (state.rivals || []).forEach(r => { if (r.interest) delete r.interest[id]; });
        delete state.people[id];
      });
      state.prospects = state.prospects.filter(id => state.people[id]);
      notes.push({ kind: 'scouting', text: 'Scout Im thinned the board: ' + stale.length +
        ' long-listed lead' + (stale.length === 1 ? '' : 's') + ' aged past the market and signed elsewhere, or went back to school, or both. The board is for the ones still reachable.' });
    }
    // fresh leads keep the board alive
    if (rng.chance(S.newProspectChance)) {
      // some walk-ins come through the regional schools (v0.9.16): the
      // pipeline has addresses now, and reputation pulls the eye
      if (state.schools && rng.chance(0.4)) {
        const weighted = state.schools.map(s => ({ s, w: 1 + s.rep / 40 }));
        const total = weighted.reduce((sum, x) => sum + x.w, 0);
        let roll = rng.next() * total;
        let school = weighted[weighted.length - 1].s;
        for (const x of weighted) { roll -= x.w; if (roll <= 0) { school = x.s; break; } }
        const p = KP.spawnSchoolLead(state, rng, school,
          { firstLook: school.partnerUntil > state.week });
        notes.push({ kind: 'scouting', text: 'New lead: ' + KP.displayName(p) + ', ' + p.age + ', out of ' +
          school.name + ' (' + school.city + '). The school’s stamp is on the file.' });
      } else {
        // person ids come from state, never from module memory — saves depend on it
        KP.resetIds(state.nextPersonId || KP.peekNextId());
        const usedNames = new Set(Object.values(state.people).map(x => x.name.given.toLowerCase()));
        // boys walk into open auditions too (v0.8.4)
        const gender = rng.chance(KP.C.GEN.maleLeadShare) ? 'm' : 'f';
        const p = KP.generatePerson(rng, { status: 'prospect', usedNames, gender });
        state.nextPersonId = KP.peekNextId();
        state.people[p.id] = p;
        state.prospects.push(p.id);
        KP.socialOf(state, p);   // minted at the door, not on first look
        notes.push({ kind: 'scouting', text: 'New lead: ' + KP.displayName(p) + ', ' + p.age + ', via ' + p.source.toLowerCase() + '. First report is on the board.' });
      }
    }
    return notes;
  };

  function pickRivalTarget(state, rival, rng) {
    // a partnered school's leads reach our desk first (v0.9.16): rival
    // scouts don't get a seat at those showcases until the window lapses
    const pool = state.prospects.map(id => state.people[id]).filter(Boolean)
      .filter(p => (p.flags.firstLookUntil || 0) <= state.week);
    if (!pool.length) return null;
    // rivals read through their own (coarse) fog: perceived best by philosophy
    const scored = pool.map(p => {
      let v;
      const key = [state.seed, rival.short, p.id, 'read'].join('|');
      const fog = (KP.hash01(key) - 0.5) * 20;
      if (rival.philosophy === 'performance') v = p.talents.dance.cur + p.talents.charisma.cur * 0.5;
      else if (rival.philosophy === 'trendChaser') v = p.talents.visuals.cur + p.talents.charisma.cur;
      else v = (p.talents.vocals.cur + p.talents.dance.cur + p.talents.charisma.cur) / 3 + (KP.C.GEN.ageRange[1] - p.age) * 2;
      // raw talent turns every head, whatever the philosophy (v0.4.3)
      const peak = Math.max(p.talents.vocals.cur, p.talents.dance.cur, p.talents.rap.cur, p.talents.charisma.cur);
      return { p, v: v + peak * 0.4 + fog };
    }).sort((a, b) => b.v - a.v);
    // weighted hard toward the top, not omniscient (v0.4.3: sharper)
    const idx = Math.min(scored.length - 1, Math.floor(Math.pow(rng.next(), 3) * Math.min(6, scored.length)));
    return scored[idx].p;
  }
})(typeof window !== 'undefined' ? window : globalThis);
