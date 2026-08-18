/* The longhaul audit (0.9.13): can a save survive a decade?
   Runs multi-scenario careers to week 620 (~13 years) with a deep
   invariant checker between the weeks: referential integrity, numeric
   sanity (no NaN, no Infinity, clamps honored), save round-trip
   identity, determinism forks at three horizons, and size telemetry.
   The soak harness proves the game is ALIVE; this proves it cannot
   quietly rot. Usage: node tools/audit_longhaul.js [weeks=620] */
'use strict';
const { loadEngine } = require('../test/load_engine');
const KP = loadEngine();

const WEEKS = parseInt(process.argv[2] || '620', 10);
const problems = [];
function flag(seed, week, msg) {
  problems.push('[' + seed + ' wk' + week + '] ' + msg);
  if (problems.length > 60) { report(); process.exit(1); }
}

// ---- the deep checker --------------------------------------------------
function num(v) { return typeof v === 'number' && isFinite(v); }
function checkNumbersDeep(seed, week, obj, path) {
  // walk everything: any NaN/Infinity stored in state is latent corruption
  if (obj === null) return;
  const t = typeof obj;
  if (t === 'number') {
    if (!isFinite(obj)) flag(seed, week, 'non-finite number at ' + path + ' = ' + obj);
    return;
  }
  if (t === 'function') { flag(seed, week, 'function stored in state at ' + path); return; }
  if (t === 'undefined') { flag(seed, week, 'undefined stored in state at ' + path); return; }
  if (t !== 'object') return;
  if (obj instanceof Set || obj instanceof Map) {
    flag(seed, week, 'Set/Map in state at ' + path + ' — JSON drops it'); return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => checkNumbersDeep(seed, week, v, path + '[' + i + ']'));
    return;
  }
  Object.keys(obj).forEach(k => checkNumbersDeep(seed, week, obj[k], path + '.' + k));
}

function checkIntegrity(seed, week, state) {
  const P = state.people;
  const person = id => P[id];
  // roster and prospects: disjoint, existing, right-status
  state.roster.forEach(id => {
    const p = person(id);
    if (!p) return flag(seed, week, 'roster id ' + id + ' has no file');
    if (p.status !== 'trainee' && p.status !== 'idol') {
      flag(seed, week, 'roster ' + id + ' has status ' + p.status);
    }
  });
  state.prospects.forEach(id => {
    const p = person(id);
    if (!p) return flag(seed, week, 'prospect id ' + id + ' has no file');
    if (p.status !== 'prospect') flag(seed, week, 'prospect ' + id + ' has status ' + p.status);
  });
  if (state.roster.some(id => state.prospects.includes(id))) {
    flag(seed, week, 'roster and prospect boards overlap');
  }
  // people numeric sanity
  Object.values(P).forEach(p => {
    if (!num(p.age) || p.age < 13 || p.age > 70) flag(seed, week, p.id + ' age insane: ' + p.age);
    // the service wall (v0.9.23) is LAW: a male idol strictly past the
    // deadline age must be serving or served — one year of slack covers
    // the birthday-to-wall week and the tour deferral
    if (p.gender === 'm' && p.status === 'idol' && p.age > KP.C.MIL.deadlineAge &&
        !p.serviceDone && !(p.flags && p.flags.military)) {
      flag(seed, week, p.id + ' male idol age ' + p.age + ' past the enlistment wall, never served');
    }
    // a serving man's clock must be a real window
    if (p.flags && p.flags.military &&
        (!num(p.flags.military.until) || p.flags.military.until <= p.flags.military.since)) {
      flag(seed, week, p.id + ' military window malformed');
    }
    if (!num(p.fatigue) || p.fatigue < 0 || p.fatigue > 100) flag(seed, week, p.id + ' fatigue out of range: ' + p.fatigue);
    if (!num(p.morale) || p.morale < 0 || p.morale > 100) flag(seed, week, p.id + ' morale out of range: ' + p.morale);
    KP.C.TALENTS.forEach(d => {
      const tal = p.talents[d];
      if (!tal || !num(tal.cur) || tal.cur < 0 || tal.cur > 100) {
        flag(seed, week, p.id + ' talent ' + d + ' broken: ' + (tal && tal.cur));
      }
    });
  });
  // groups
  state.groups.forEach(g => {
    g.members.forEach(id => { if (!person(id)) flag(seed, week, g.name + ' member ' + id + ' has no file'); });
    Object.entries(g.roles || {}).forEach(([r, id]) => {
      if (id && !g.members.includes(id)) flag(seed, week, g.name + ' role ' + r + ' held by non-member ' + id);
    });
    if (g.maknae && !g.members.includes(g.maknae)) flag(seed, week, g.name + ' maknae is a non-member');
    if (g.rooms) {
      const housed = g.rooms.flat();
      if (housed.some(id => !g.members.includes(id))) flag(seed, week, g.name + ' rooms house a non-member');
      if (g.members.length >= 2 && housed.length !== g.members.length &&
          g.members.length - housed.length !== 0) {
        // rooms may lag one departure; a persistent mismatch is the bug —
        // only flag when off by 2+ (one week of lag is visible churn)
        if (Math.abs(housed.length - g.members.length) >= 2) {
          flag(seed, week, g.name + ' rooms/members mismatch: ' + housed.length + ' housed vs ' + g.members.length);
        }
      }
      if (g.hiatus && g.tour) flag(seed, week, g.name + ' on hiatus AND on tour');
    }
    // popularity is minted at debut — undebuted groups legitimately lack it
    if (g.debuted && (!num(g.popularity) || g.popularity < 0 || g.popularity > 100)) {
      flag(seed, week, g.name + ' popularity out of range: ' + g.popularity);
    }
    if (g.fandom && (!num(g.fandom.intensity) || g.fandom.intensity < 0 || g.fandom.intensity > 100)) {
      flag(seed, week, g.name + ' fandom intensity out of range');
    }
  });
  // the rival service wall (v0.9.24): the world's boys pay the same tax —
  // an active male act's member past the wall (with slack for the
  // trigger week) must be served, serving, or inside a rotation/pause
  (state.rivals || []).forEach(r => (r.acts || []).forEach(a => {
    if (a.retired || a.gender !== 'm') return;
    (a.members || []).forEach(id => {
      const p = person(id);
      if (!p || p.gender !== 'm') return;
      if (p.age > KP.C.MIL.deadlineAge + 2 && !p.serviceDone &&
          !(p.flags && p.flags.military) && !a.serviceRotation && !a.servicePause) {
        flag(seed, week, a.name + ' member ' + id + ' age ' + p.age + ' past the rival wall, never served');
      }
    });
  }));
  // engagements point at LIVE IDOLS — existence alone hid the departure
  // holes from every earlier harness (0.9.13)
  (state.deals || []).forEach(d => {
    const dp = person(d.personId);
    if (d.weeksLeft > 0 && (!dp || dp.status !== 'idol')) flag(seed, week, 'active deal on non-idol ' + d.personId);
  });
  (state.gigs || []).forEach(gg => {
    const gp = person(gg.personId);
    if (gg.weeksLeft > 0 && (!gp || gp.status !== 'idol')) flag(seed, week, 'active gig on non-idol ' + gg.personId);
  });
  (state.dealOffers || []).concat(state.gigOffers || []).forEach(o => {
    const op = person(o.personId);
    if (o.expiresWeek >= state.week && (!op || op.status !== 'idol')) flag(seed, week, 'open offer for non-idol ' + o.personId);
  });
  state.groups.forEach(g => {
    if ((g.retiredWeek || !g.members.length) && (g.prep || g.tour || g.hiatus)) {
      flag(seed, week, g.name + ' retired/empty but still scheduled');
    }
  });
  (state.scenes || []).forEach(sc => {
    if (sc.personId && !person(sc.personId)) flag(seed, week, 'scene ' + sc.kind + ' holds missing person ' + sc.personId);
  });
  // trust, budget, clock
  if (!num(state.trust) || state.trust < 0 || state.trust > 100) flag(seed, week, 'trust out of range: ' + state.trust);
  if (!num(state.budget)) flag(seed, week, 'budget is not a number: ' + state.budget);
  if (!Number.isInteger(state.week)) flag(seed, week, 'week is not an integer');
}

function checkRoundtrip(seed, week, state) {
  const a = KP.serialize(state);
  const b = KP.serialize(KP.deserialize(a));
  if (a !== b) {
    flag(seed, week, 'save round-trip is not identity (deserialize+serialize changed ' +
      Math.abs(a.length - b.length) + ' bytes)');
  }
}

// ---- the lean bot ------------------------------------------------------
// Enough hands to exercise every system the audit cares about. Not the
// soak bot (that one measures the game); this one stresses the state.
function botWeek(state, mode) {
  const wk = state.week;
  // scenes: renewal via the standard policy, everything else first-option
  (state.scenes || []).slice().forEach(sc => {
    if (sc.kind === 'renewal') {
      const p = state.people[sc.personId];
      if (!p) return;
      const read = KP.renewalRead(state, p);
      const C = KP.C.CONTRACT;
      const cost = C.termsCostBase + read.fame * C.termsCostPerFame;
      const pick = read.band === 'devoted' ? 'sign'
        : read.band === 'professional' ? (state.budget >= cost ? 'terms' : 'standard')
        : read.band === 'strained' ? (state.budget >= cost ? 'terms' : 'hold')
        : 'farewell';
      KP.resolveScene(state, sc.id, pick);
      return;
    }
    if (sc.kind === 'execQuestion') { KP.answerMeeting(state, 0); return; }
    const def = KP.sceneDef(sc.kind);
    if (def) {
      const opts = def.options(state, sc);
      if (opts && opts.length) KP.resolveScene(state, sc.id, opts[0].id);
    }
  });
  // discourse: the same constrained menu the human gets
  KP.liveDiscourses(state).forEach(d => {
    if (d.responded) return;
    const actions = KP.C.DISCOURSE.KINDS[d.kind].actions;
    KP.respondDiscourse(state, d.id, actions[0]);
  });
  // offers: take everything (stress, not strategy)
  KP.openDealOffers(state).forEach(o => KP.respondDeal(state, o.id, true));
  KP.openGigOffers(state).forEach(o => KP.respondGig(state, o.id, true));
  if (KP.fandomEligible) {
    state.groups.forEach(g => { if (KP.fandomEligible(state, g)) KP.nameFandom(state, g.id, 0); });
  }
  if (mode !== 'neglect') {
    // sign a prospect when thin
    if (state.roster.filter(id => state.people[id].status === 'trainee').length < 5 &&
        state.prospects.length && state.budget > 60) {
      KP.signProspect(state, state.prospects[0]);
    }
    // form a group when none of ours exists
    const own = state.groups.filter(g => !g.legacy);
    const free = KP.freeTrainees(state);
    if (!own.length && free.length >= 5 && wk >= 16) {
      const ids = free.slice(0, 5);   // freeTrainees returns ids
      KP.proposeGroup(state, 'AUDITLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
    }
    // hiatus a worn group; comeback everything else on the calendar
    state.groups.forEach(g => {
      if (!g.debuted || g.prep || g.tour) return;
      if (state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) return;
      if (g.hiatus && state.week - g.hiatus.since < KP.C.HIATUS.graceWeeks + 4) return;
      const avgF = g.members.reduce((s, id) => s + state.people[id].fatigue, 0) / (g.members.length || 1);
      if (!g.hiatus && avgF >= 55) { KP.declareHiatus(state, g.id); return; }
      if (avgF >= 45) return;
      if (state.budget < 120 * KP.statureCostMult(g)) return;   // the bill scales (v0.9.14)
      if (!g.demos) {
        const rng = KP.rngFor(state);
        g.demos = KP.generateDemos(state, rng, g);
        state.rngState = rng.state();
      }
      const demo = g.demos[0];
      KP.planDebut(state, { groupId: g.id, songId: demo.id, promo: 'modest',
        week: state.week + Math.max(KP.C.DEBUT.prepWeeksMin, 5),
        alloc: { vocals: 30, dance: 30, rap: 10, media: 30 } });
    });
    // tour occasionally
    state.groups.forEach(g => {
      if (g.debuted && !g.prep && !g.tour && !g.hiatus && g.popularity >= 45 &&
          wk % 60 === 30 && KP.tourEligible(state, g).ok) {
        KP.planTour(state, { groupId: g.id, scale: g.popularity >= 60 ? 'halls' : 'clubs',
          legs: ['kr'], pacing: 'humane', setlist: 'hits' });
      }
    });
  }
}

// the service scenario (v0.9.23): the lean bot's own group is female
// (the founding objective fits it), so without a fixture no male idol
// ever exists here and the enlistment machine idles. Seed a boy group
// old enough that the wall arrives MID-RUN — papers, walls, paused
// clocks, discharges, and the return all soak for a decade.
function seedBoyGroup(state) {
  const rng = KP.rngFor(state);
  const ids = [];
  for (let i = 0; i < 4; i++) {
    const b = KP.generatePerson(rng, { status: 'trainee', gender: 'm' });
    b.signedWeek = 1;
    b.age = 23 + (i % 2);   // notice ~2.5 years in, the wall ~year 5
    state.people[b.id] = b; state.roster.push(b.id); ids.push(b.id);
  }
  state.rngState = rng.state();
  state.nextPersonId = KP.peekNextId();
  KP.openMandate(state, { kind: 'group', gender: 'm', source: 'longhaul service fixture' });
  KP.proposeGroup(state, 'HAULBOYS', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups.find(x => x.name === 'HAULBOYS');
  if (g) {
    KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
      week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  }
}

// ---- scenarios ---------------------------------------------------------
const SCENARIOS = [
  { seed: 'haul-standard-1', mode: 'standard' },
  { seed: 'haul-standard-2', mode: 'standard' },
  { seed: 'haul-standard-3', mode: 'standard' },
  { seed: 'haul-neglect', mode: 'neglect' },     // the world alone, 13 years
  { seed: 'haul-founder', mode: 'founder' },     // walk out mid-run, keep going
  { seed: 'haul-service', mode: 'service' },     // the boy-group decade (v0.9.23)
];

const sizes = {};
for (const sc of SCENARIOS) {
  const state = KP.newGame(sc.seed);
  if (sc.mode === 'service') seedBoyGroup(state);
  let founded = false;
  for (let w = 0; w < WEEKS; w++) {
    botWeek(state, sc.mode);
    // the founding, once eligible (founder scenario only). This audit
    // exists to soak the FOUNDED state shape for 500 weeks — the odds of
    // a bot earning trust 70 belong to the soak, not here. If trust is
    // the ONLY unmet gate by week 150, grant the collateral and walk;
    // the lean bot pays fiscal trust warnings a player would dodge.
    if (sc.mode === 'founder' && !founded && w >= 150 && KP.foundingEligible) {
      const gate = KP.foundingEligible(state);
      if (!gate.ok && gate.reasons.length === 1 &&
          /trust is the collateral/.test(gate.reasons[0])) {
        state.trust = KP.C.FOUNDING.trustAt;
      }
    }
    if (sc.mode === 'founder' && !founded && KP.foundingEligible &&
        KP.foundingEligible(state).ok) {
      KP.foundLabel(state, 'Audit House');
      founded = true;
    }
    KP.advanceWeek(state);
    if (w % 10 === 0) checkIntegrity(sc.seed, state.week, state);
    if (w % 40 === 0) checkRoundtrip(sc.seed, state.week, state);
    if (w === 200 || w === 420 || w === WEEKS - 20) {
      // determinism fork: 20 weeks side by side
      const b = KP.deserialize(KP.serialize(state));
      const a2 = KP.deserialize(KP.serialize(state));
      for (let i = 0; i < 20; i++) { KP.advanceWeek(a2); KP.advanceWeek(b); }
      if (KP.serialize(a2) !== KP.serialize(b)) {
        flag(sc.seed, state.week, 'determinism fork DIVERGED at horizon ' + w);
      }
    }
  }
  checkNumbersDeep(sc.seed, state.week, JSON.parse(KP.serialize(state)), 'state');
  checkIntegrity(sc.seed, state.week, state);
  checkRoundtrip(sc.seed, state.week, state);
  if (sc.mode === 'founder' && !founded) {
    flag(sc.seed, state.week, 'founder scenario never became eligible in ' + WEEKS + ' weeks');
  }
  // size telemetry
  const json = KP.serialize(state);
  const total = json.length;
  const parts = {};
  Object.keys(state).forEach(k => {
    try { parts[k] = JSON.stringify(state[k]) ? JSON.stringify(state[k]).length : 0; }
    catch (e) { parts[k] = -1; }
  });
  const top = Object.entries(parts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  sizes[sc.seed] = { total, top, people: Object.keys(state.people).length, week: state.week };
  // the service (v0.9.23): positive coverage — a 13-year run where any
  // male idol reached the notice age must have produced service traffic
  const svl = state.serviceLedger || {};
  const menSeen = Object.values(state.people).some(p =>
    p.gender === 'm' && p.status === 'idol' &&
    (p.age >= KP.C.MIL.noticeAge + 1 || p.serviceDone || (p.flags && p.flags.military)));
  if (menSeen && !((svl.notices || 0) + (svl.plans || 0) + (svl.enlisted || 0))) {
    flag(sc.seed, state.week, 'male idols aged past the notice window but the service system never spoke');
  }
  // the sagas (v0.9.31): the hash window [60,320] sits fully inside a
  // 620-week run — every world MUST have been invaded at least once,
  // and the deck never deals more than two
  const sgl = state.sagaLedger || {};
  if ((sgl.fired || 0) < 1) {
    flag(sc.seed, state.week, 'no saga fired in ' + WEEKS + ' weeks — the window guarantees one');
  }
  // time takes its share (v0.9.32): the first exec era ends by week
  // ~337 at the latest, so a 620-week non-founded world MUST have
  // seen the chair change hands at least once
  const tml = state.timeLedger || {};
  if (!state.founded && (tml.successions || 0) < 1) {
    flag(sc.seed, state.week, 'no executive succession in ' + WEEKS + ' weeks of a non-founded house');
  }
  if (state.founded && !state.board) {
    flag(sc.seed, state.week, 'a founded house with no board — the seats never arrived');
  }
  if ((sgl.fired || 0) > 2) {
    flag(sc.seed, state.week, sgl.fired + ' sagas fired — the deck deals at most two');
  }
  console.log(sc.seed + ': wk ' + state.week + ', ' + Math.round(total / 1024) + ' KB, ' +
    Object.keys(state.people).length + ' files | top: ' +
    top.map(([k, v]) => k + ' ' + Math.round(v / 1024) + 'K').join(', ') +
    ' | service: ' + ['plans', 'notices', 'enlisted', 'walls', 'discharged', 'returns']
      .map(k => k + ' ' + (svl[k] || 0)).join(', ') +
    ' | risefall: ' + ['rankings', 'overtakes', 'playerNo1', 'classes', 'offers', 'genTurns', 'torchPasses', 'rivalServices']
      .map(k => k + ' ' + ((state.riseFallLedger || {})[k] || 0)).join(', ') +
    ' | sagas: ' + (state.sagas ? state.sagas.fired.map(f => f.kind + '@' + f.week).join(' ') || 'none' : 'none') +
    (sgl.jvSigned ? ' jvSigned' : '') + (sgl.jvDeclined ? ' jvDeclined' : '') +
    (sgl.heirStabilized ? ' heirStabilized' : '') + (sgl.heirBurst ? ' heirBurst' : '') +
    ' | time: ' + ['senesced', 'driftWeeks', 'successions', 'boardMemos']
      .map(k => k + ' ' + (tml[k] || 0)).join(', '));
}

report();
function report() {
  if (problems.length) {
    console.error('\n=== LONGHAUL: ' + problems.length + ' PROBLEM(S) ===');
    problems.forEach(p => console.error('  ' + p));
    process.exitCode = 1;
  } else {
    console.log('\n=== LONGHAUL CLEAN: ' + SCENARIOS.length + ' scenarios × ' + WEEKS +
      ' weeks — integrity, round-trips, forks, and numbers all hold ===');
  }
}
