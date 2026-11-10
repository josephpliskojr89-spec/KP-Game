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
    // the return (v0.11.18, §109): a soloist in service is the act's
    // service chapter once the calendar is clear — never a plain gap the
    // desk could declare an ordinary, cooling hiatus over
    if (g.debuted && !g.retiredWeek && g.members.length === 1) {
      const only = person(g.members[0]);
      if (only && only.flags && only.flags.military && !g.prep && !g.tour &&
          state.week > (g.promoUntil || 0) && !(g.hiatus && g.hiatus.service)) {
        flag(seed, week, g.name + ' is a soloist in service with no service chapter');
      }
    }
    // and no return window outlives its last week
    if (g.returnStage && (!num(g.returnStage.until) || state.week > g.returnStage.until)) {
      flag(seed, week, g.name + ' holds a return window past its last week');
    }
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
  (state.outside || []).forEach(d => {
    const dp = person(d.personId);
    if (d.weeksLeft > 0 && (!dp || dp.status !== 'idol')) flag(seed, week, 'active ' + d.kind + ' job on non-idol ' + d.personId);
  });
  (state.outsideOffers || []).forEach(o => {
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
    if (sc.groupId && !(state.groups || []).some(g => g.id === sc.groupId)) flag(seed, week, 'scene ' + sc.kind + ' holds missing group ' + sc.groupId);
  });
  // the audit (v0.11.3): the kernel's validator every ten weeks; a LIVE rival
  // act holds real members; open claims and the season point at people
  (KP.validateState(state) || []).forEach(e => flag(seed, week, 'validate: ' + e));
  (state.rivals || []).forEach(r => (r.acts || []).forEach(a => {
    if (a.retired) return;
    (a.members || []).forEach(id => { if (!person(id)) flag(seed, week, a.name + ' (live) holds missing member ' + id); });
  }));
  (state.claims || []).forEach(c => {
    if (c.resolved) return;
    if (c.subject && c.subject.kind === 'idol' && !person(c.subject.id)) flag(seed, week, 'open claim on missing person ' + c.subject.id);
  });
  // (a season's eliminated contestants may since have gone home — pruned by
  // design, read only through guarded lookups; not flagged)
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
    // the staff (v0.11.0): options[0] of the interview is the hire, and a
    // fresh label taking every candidate on its seed money never reached
    // its first debut — the soak bot's flush gate, shared
    if (sc.kind === 'theInterview') {
      KP.resolveScene(state, sc.id, state.budget > KP.C.HIRES.hireCost[sc.cand.tier] + 200 ? 'hire' : 'pass');
      return;
    }
    if (sc.kind === 'seatPoach') {
      KP.resolveScene(state, sc.id, state.budget > KP.C.HIRES.raiseCost + 100 ? 'raise' : 'walk');
      return;
    }
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
  KP.openOutsideOffers(state).forEach(o => KP.respondOutside(state, o.id, true));
  if (KP.fandomEligible) {
    state.groups.forEach(g => { if (KP.fandomEligible(state, g)) KP.nameFandom(state, g.id, 0); });
  }
  if (mode !== 'neglect' && mode !== 'insolvent') {
    // the red weeks (v0.11.0, §86): the honest moves a competent broke label
    // makes — from the staff meeting on, release the weakest free trainee
    // past a lineup's worth, one a month, and sign nobody while behind
    const redNow = KP.redRead ? KP.redRead(state) : { weeks: 0 };
    // a small label's first job is the first debut (v0.11.0): until an own
    // act is on a stage, the seed money is for the record, not for content
    // posts and extra signings — the grind bot used to spend the fresh
    // door's 80 on uploads and die at week 40 under the red weeks
    const ownDebuted = state.groups.some(g => !g.legacy && g.debuted);
    if (redNow.weeks >= KP.C.RED.meetingAt && state.week % 4 === 0) {
      const free = KP.freeTrainees(state).map(id => state.people[id]);
      if (free.length > 5) {
        const worst = free.slice().sort((a, b) => KP.peakOf(a) - KP.peakOf(b))[0];
        KP.releaseTrainee(state, worst.id);
      }
    }
    // the grind (v0.9.37): work every locked era, take a stage a week
    const restRead = g => {
      const ms = g.members.map(id => state.people[id]).filter(Boolean);
      return ms.length ? ms.reduce((s2, m) => s2 + m.fatigue, 0) / ms.length : 100;
    };
    state.groups.forEach(g => {
      if (!g.prep || g.retiredWeek) return;
      const c = g.prep.campaign;
      // paced, not relentless: a real staff skips the push week when the
      // room is worn — the first soak's always-on bot benched members
      // into a 40/40 protest-truck flood
      if (c && c.lastPush !== state.week && state.budget > 40 && restRead(g) < 55) {
        KP.campaignPush(state, g.id, 'streetTeam');
      }
    });
    if (KP.openBookings && state.budget > 20) {
      const offer = KP.openBookings(state).find(o => o.week > state.week && o.fee >= 0);
      if (offer) {
        const gs = state.groups.filter(g => !g.retiredWeek && !g.hiatus && !g.tour &&
          g.members.length && (g.debuted || g.prep) &&
          state.week > (g.promoUntil || 0) &&        // promo weeks are already full
          restRead(g) < 50);                          // and worn rooms rest
        const pick = gs.find(g => g.prep) || gs[0];
        if (pick) KP.takeBooking(state, offer.id, pick.id);
      }
    }
    // sign a prospect when thin — never while behind on the building (v0.11.0)
    if (redNow.weeks === 0 &&
        state.roster.filter(id => state.people[id].status === 'trainee').length < 5 &&
        state.prospects.length < 4 && state.budget > 160) {
      // the network (v0.9.35): a thin board is a verb problem now
      if (!KP.holdOpenCall(state).ok) KP.streetCast(state);
    }
    // the content desk (v0.10.18): the long game films what happens
    if (KP.contentTopics && state.budget > 60 && state.week % 3 === 0 && (ownDebuted || state.budget > 120)) {
      const openTopic = KP.contentTopics(state).find(tp => tp.open && state.budget > tp.cost + 40);
      if (openTopic) KP.postContent(state, openTopic.id);
    }
    if (redNow.weeks === 0 &&
        state.roster.filter(id => state.people[id].status === 'trainee').length < 5 &&
        state.prospects.length && state.budget > (ownDebuted ? 60 : 100)) {
      // a holdout's no (v0.9.33) walks the bot down the board; the
      // founding directive is a girl group, so the bot casts for it
      const girls = state.prospects.filter(id => (state.people[id].gender || 'f') === 'f');
      for (const pid of (girls.length ? girls : state.prospects).slice(0, 3)) {
        // the table (v0.9.38): meet the counter when the books allow
        let r = KP.signProspect(state, pid);
        if (!r.ok && r.counter && state.budget > (r.counter.price || 0) + 100) {
          r = KP.signProspect(state, pid, { answer: 'accept' });
        }
        if (r.ok) break;
      }
    }
    // form a group when none of ours exists
    const own = state.groups.filter(g => !g.legacy);
    const free = KP.freeTrainees(state);
    if (!own.length && free.length >= 5 && wk >= 16) {
      // one group, one gender — and the founding greenlight is female
      const fFree = free.filter(id => (state.people[id].gender || 'f') === 'f');
      const ids = (fFree.length >= 5 ? fFree : free).slice(0, 5);   // freeTrainees returns ids
      KP.proposeGroup(state, 'AUDITLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
    }
    // the first debut (v0.9.37): a formed lineup gets its era planned.
    // The longhaul bot used to let AUDITLINE sit undebuted for 13
    // years, which left every under-the-wall path unwitnessed here.
    state.groups.forEach(g => {
      if (g.legacy || g.debuted || g.prep || g.retiredWeek || !g.members.length) return;
      // the red weeks (v0.11.0): a fresh label never sees 90 — it debuts
      // with what the modest single actually bills, plus a month's cushion
      if (state.budget < KP.recordBill(g, 'modest', 'single') + 12) return;
      if (!g.demos) {
        const rng = KP.rngFor(state);
        g.demos = KP.generateDemos(state, rng, g);
        state.rngState = rng.state();
      }
      if (g.demos && g.demos[0]) {
        KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
          week: state.week + Math.max(KP.C.DEBUT.prepWeeksMin, 5),
          alloc: { vocals: 30, dance: 30, rap: 10, media: 30 } });
      }
    });
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

// one man who debuts alone (v0.11.18, §109): a soloist's service is the
// whole act away, which no four-man line ever shows. He arrives in year
// four, once the house is standing: seeded with the boy group in week one,
// a second debut emptied the till and the label dissolved in week 26 —
// which silenced the whole scenario, and nothing said so. The bot debuts
// his lineup when the till allows, like any other.
const SOLO_SEED_WEEK = 150;
function seedSoloMan(state) {
  const rng = KP.rngFor(state);
  const solo = KP.generatePerson(rng, { status: 'trainee', gender: 'm' });
  solo.signedWeek = state.week;
  solo.age = 24;   // papers about two years after he arrives
  state.people[solo.id] = solo; state.roster.push(solo.id);
  state.rngState = rng.state();
  state.nextPersonId = KP.peekNextId();
  KP.openMandate(state, { kind: 'solo', gender: 'm', source: 'longhaul service fixture' });
  KP.proposeGroup(state, 'HAULSOLO', [solo.id], KP.roleHints(state, [solo]));
}

// ---- scenarios ---------------------------------------------------------
const SCENARIOS = [
  { seed: 'haul-standard-1', mode: 'standard' },
  { seed: 'haul-standard-2', mode: 'standard' },
  { seed: 'haul-standard-3', mode: 'standard' },
  { seed: 'haul-neglect', mode: 'neglect' },     // the world alone, 13 years
  { seed: 'haul-founder', mode: 'founder' },     // walk out mid-run, keep going
  { seed: 'haul-service', mode: 'service' },     // the boy-group decade (v0.9.23)
  { seed: 'haul-blank', mode: 'blank' },         // hard mode from nothing (v0.9.34)
  { seed: 'haul-major', mode: 'major' },         // stewardship decade (0.9.35.2 —
                                                 // the 'fierce' crash hid here)
  { seed: 'haul-fresh', mode: 'fresh' },         // the grind decade (v0.9.37):
  { seed: 'haul-insolvent', mode: 'insolvent' }, // the last statement (v0.11.0, §86):
                                                 // a neglected fresh label is EXPECTED
                                                 // to dissolve — the proof the teeth
                                                 // are real — then the blank page, again
  { seed: 'haul-home', mode: 'home' },           // the regional decade (v0.10.10):
                                                 // Busan founding, same fresh grind
                                                 // a small label lives UNDER the
                                                 // wall — gigs, pushes, the ladder
];

// HAUL_ONLY=<seed> runs one scenario, for working on a fixture. The audit
// is all of them, and a partial run says it is partial.
const RUN = process.env.HAUL_ONLY ? SCENARIOS.filter(sc => sc.seed === process.env.HAUL_ONLY) : SCENARIOS;
if (!RUN.length) { console.error('no scenario named ' + process.env.HAUL_ONLY); process.exit(2); }

const sizes = {};
const dissolvedWeeks = {};
const careers = {};
for (const sc of RUN) {
  const state = KP.newGame(sc.seed, null,
    sc.mode === 'blank' ? { door: 'blank', companyName: 'Audit Blank House' }
      : sc.mode === 'major' ? { door: 'major' }
      : sc.mode === 'fresh' ? { door: 'fresh' }
      // the founder audit soaks the FOUNDED state shape, not the climb —
      // v0.10.21's distribution gap made a current-door bot's trophy a
      // coin flip on this horizon, so the walk-out starts where honors
      // arrive on schedule: a major house (the same door, guaranteed open)
      : sc.mode === 'founder' ? { door: 'major' }
      : sc.mode === 'home' ? { door: 'fresh', homeCity: 'busan' }
      : sc.mode === 'insolvent' ? { door: 'fresh' } : undefined);
  if (sc.mode === 'service') seedBoyGroup(state);
  let founded = false;
  let dissolvedAt = null;
  for (let w = 0; w < WEEKS; w++) {
    // the last statement (v0.11.0, §86): the bot is allowed to die. A
    // dissolved label takes the blank page and the world keeps running
    if (KP.chapterPending && KP.chapterPending(state)) {
      if (dissolvedAt == null) dissolvedAt = state.week;
      const r = KP.nextChapter(state, 'blank', { companyName: 'Chapter' + ((state.career || []).length + 2) + ' House' });   // a distinct short per chapter — the obituaries keep their names
      if (!r.ok) flag(sc.seed, state.week, 'the blank page refused: ' + r.reason);
    }
    if (sc.mode === 'service' && w === SOLO_SEED_WEEK && dissolvedAt == null) seedSoloMan(state);
    botWeek(state, sc.mode);
    if (process.env.HAUL_TRACE === sc.seed && state.week <= 60) {
      const g0 = state.groups.find(g => !g.legacy);
      console.log('[trace] ' + sc.seed + ' wk' + state.week + ' budget ' + Math.round(state.budget) + ' red ' + ((state.red || {}).weeks || 0) + '/' + ((state.red || {}).arrears || 0) +
        ' roster ' + state.roster.length + ' free ' + KP.freeTrainees(state).length + ' prospects ' + state.prospects.length +
        (g0 ? ' own ' + g0.name + ' debuted ' + !!g0.debuted + ' prep ' + !!g0.prep + ' bill ' + KP.recordBill(g0, 'modest', 'single') : ' own -') +
        ' notes ' + (KP.lastTickNotes || []).map(n => n.ind).filter(Boolean).slice(0, 4).join(','));
    }
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
  dissolvedWeeks[sc.seed] = dissolvedAt;
  careers[sc.seed] = (state.career || []).map(c => c.door + '@' + c.week).join(',');
  if (sc.mode === 'insolvent' && dissolvedAt == null) {
    flag(sc.seed, state.week, 'the insolvent scenario never dissolved — the teeth are not real');
  }
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
  // the service scenario exists to produce service traffic: if its house
  // dissolves or its men never serve, the scenario is measuring nothing
  if (sc.mode === 'service') {
    if (!((svl.enlisted || 0) >= 4 && (svl.discharged || 0) >= 4)) {
      flag(sc.seed, state.week, 'the service scenario went quiet: enlisted ' + (svl.enlisted || 0) + ', discharged ' + (svl.discharged || 0));
    }
    if (!((svl.returns || 0) >= 1)) flag(sc.seed, state.week, 'the service scenario never saw an act come home whole');
    if (!((svl.soloChapters || 0) >= 1)) flag(sc.seed, state.week, 'the service scenario’s soloist never served a service chapter');
  }
  // the return (v0.11.18, §109): every time an act came home whole there
  // was a ceremony, and every window it opened was spent, lapsed or is
  // still open (an act that ended takes its window with it)
  if ((svl.returns || 0) !== (svl.ceremonies || 0)) {
    flag(sc.seed, state.week, 'acts came home whole ' + (svl.returns || 0) + ' times but the ceremony was held ' + (svl.ceremonies || 0));
  }
  const openWindows = state.groups.filter(g => g.returnStage).length;
  if ((svl.spent || 0) + (svl.lapsed || 0) + openWindows > (svl.returns || 0)) {
    flag(sc.seed, state.week, 'more return windows closed (' + (svl.spent || 0) + ' spent, ' + (svl.lapsed || 0) +
      ' lapsed, ' + openWindows + ' open) than acts that came home (' + (svl.returns || 0) + ')');
  }
  // a letter says a window is closing before one says it closed
  if ((svl.lapsed || 0) > (svl.closing || 0)) {
    flag(sc.seed, state.week, 'a return window lapsed (' + svl.lapsed + ') with no closing letter before it (' + (svl.closing || 0) + ')');
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
  // the grind (v0.9.37): the soak's legacy orgs are famous, so THIS is
  // where the positive path gets verified — a blank/fresh house that
  // debuted anybody in 620 weeks must have grinded: gigs off the pile,
  // pushes worked, and the wall felt at least once at low fame
  const bkl = state.bookingLedger || {};
  const fml = state.fameLedger || {};
  if ((sc.mode === 'blank' || sc.mode === 'fresh' || sc.mode === 'home') &&
      state.groups.some(g => g.debuted)) {
    if ((bkl.played || 0) < 1) {
      flag(sc.seed, state.week, 'a ' + sc.mode + ' house debuted without ever playing a stage off the pile');
    }
    if ((bkl.pushes || 0) < 1) {
      flag(sc.seed, state.week, 'a ' + sc.mode + ' house ran an era with zero campaign pushes (bot policy broken)');
    }
    // the mechanism assert (v0.10.4): a modest-promo debut can fit
    // INSIDE its cap with zero measurable waste and no breakthrough —
    // the wall still gated it. underEras counts every under-wall
    // release applyWall processed; zero there means the wall system
    // genuinely never engaged for a low-fame house, which is the bug
    // this invariant exists to catch.
    if ((fml.walled || 0) + (fml.ground || 0) + (fml.breaks || 0) +
        (fml.wasted || 0) + (fml.underEras || 0) < 1) {
      flag(sc.seed, state.week, 'a ' + sc.mode + ' house released under the wall and never felt it');
    }
  }
  console.log(sc.seed + ': wk ' + state.week + ', ' + Math.round(total / 1024) + ' KB, ' +
    Object.keys(state.people).length + ' files | top: ' +
    top.map(([k, v]) => k + ' ' + Math.round(v / 1024) + 'K').join(', ') +
    ' | service: ' + ['plans', 'notices', 'enlisted', 'walls', 'discharged', 'returns', 'spent', 'closing', 'lapsed', 'soloChapters']
      .map(k => k + ' ' + (svl[k] || 0)).join(', ') +
    ' | risefall: ' + ['rankings', 'overtakes', 'playerNo1', 'classes', 'offers', 'genTurns', 'torchPasses', 'rivalServices']
      .map(k => k + ' ' + ((state.riseFallLedger || {})[k] || 0)).join(', ') +
    ' | sagas: ' + (state.sagas ? state.sagas.fired.map(f => f.kind + '@' + f.week).join(' ') || 'none' : 'none') +
    (sgl.jvSigned ? ' jvSigned' : '') + (sgl.jvDeclined ? ' jvDeclined' : '') +
    (sgl.heirStabilized ? ' heirStabilized' : '') + (sgl.heirBurst ? ' heirBurst' : '') +
    ' | time: ' + ['senesced', 'driftWeeks', 'successions', 'boardMemos']
      .map(k => k + ' ' + (tml[k] || 0)).join(', ') +
    ' | grind: gigs ' + (bkl.played || 0) + ', pushes ' + (bkl.pushes || 0) +
    ', cams ' + (bkl.virals || 0) + ', walled ' + (fml.walled || 0) +
    ', ground ' + (fml.ground || 0) + ', breaks ' + (fml.breaks || 0) +
    (fml.showsOpenWeek ? ', showsOpen@' + fml.showsOpenWeek : '') +
    ' | table: counters ' + ((state.tableLedger || {}).counters || 0) +
    ', clauses ' + ((state.tableLedger || {}).clausesTaken || 0) +
    ' (kept ' + ((state.tableLedger || {}).clausesKept || 0) +
    ', walked ' + ((state.tableLedger || {}).walkedFree || 0) + ')' +
    ', bonuses ' + ((state.tableLedger || {}).bonusesPaid || 0) +
    ', trained ' + ((state.tableLedger || {}).trained || 0));
}

console.log('dissolutions (the last statement, v0.11.0): ' + RUN.map(sc => sc.seed + ' ' + (dissolvedWeeks[sc.seed] == null ? '—' : 'wk ' + dissolvedWeeks[sc.seed] + (careers[sc.seed] ? ' then ' + careers[sc.seed] : ''))).join(' · '));
report();
function report() {
  if (problems.length) {
    console.error('\n=== LONGHAUL: ' + problems.length + ' PROBLEM(S) ===');
    problems.forEach(p => console.error('  ' + p));
    process.exitCode = 1;
  } else {
    console.log('\n=== LONGHAUL ' + (RUN.length === SCENARIOS.length ? 'CLEAN' : 'PARTIAL, CLEAN SO FAR') + ': ' + RUN.length + ' scenario' +
      (RUN.length === 1 ? '' : 's') + ' × ' + WEEKS +
      ' weeks — integrity, round-trips, forks, and numbers all hold ===');
  }
}
