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
// the Desk, counted (v0.11.21, §112): what each week wrote and what landed
const deskCount = require('./desk_count');
const DESK = deskCount.watch(KP);

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
const GL = { given: 0, met: 0, lapsed: 0, open: 0, void: 0, walls: 0 };   // the greenlights of every career (v0.11.37, §129)
const RV = { given: 0, firsts: 0, counted: 0 };                            // the annual reviews of every career (v0.11.38, §130)
const HO = { given: 0 };                                                    // the handovers of every career (v0.11.39, §131)
const CH = { walls: 0, minted: 0 };                                         // the chairs at every desk change (v0.11.40, §132)
const CR = { held: 0, calls: 0, callsHeld: 0 };                             // the credits of every chair (v0.11.41, §133)
for (const sc of RUN) {
  const deskMark = deskCount.mark(DESK);   // this scenario's share of the Desk's count
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
  // the greenlights on the record (v0.11.37, §129). The bookkeeping is this tool's own: which greenlights it has seen,
  // who sat in the chair when each first appeared, and which were on file when the desk moved to another house.
  // Nothing here asks the engine what it expects: a check that does agrees with an engine that has it wrong
  const gl = { seen: {}, chair: state.executive.name, last: {}, given: 0, walls: 0, wallOpen: 0 };
  // the handover (v0.11.39, §131): this tool's own books of each chair of this desk. What it saw greenlit and promised
  // upstairs while they sat, by the look it first saw each at, and the last review it saw them give
  const ho = { books: {}, claims: {}, changes: {}, given: 0 };
  const book = name => (ho.books[name] = ho.books[name] || { lights: [], claims: [], band: null });
  // the chairs (v0.11.40, §132): this tool's own books of the building. Every chair it has seen sat, the week the desk
  // last moved, and the house the desk walked out of. A house keeps its staff when the desk moves: the next building
  // opens with four of its own. Nothing here asks the engine when the desk began
  const ch = { seen: {}, opened: 1, walls: 0, minted: 0, walked: null };
  const chLook = () => {
    const S = state.seats || {};
    Object.keys(S).forEach(seatId => {
      const st = S[seatId];
      ch.seen[st.id] = true;
      if (!(st.since >= ch.opened && st.since <= state.week)) flag(sc.seed, state.week, st.name + ' is filed as sat in the ' + seatId + ' chair since week ' + st.since + ', and this building opened in week ' + ch.opened);
    });
  };
  // the credits (v0.11.41, §133): this tool's own books of what happened while each chair sat. Which records landed
  // in a week the chair began sat, how each closed by this tool's own reading of the close, and the week each of
  // the roster came on to it. The engine's read of a chair's credit is held to them every week, and so is what a
  // call from outside says the industry read. Nothing here asks the engine what a chair is credited with
  const cr = { rec: {}, on: {}, sat: [], seen: {}, held: 0, calls: 0, callsHeld: 0 };
  const ERA_CHAIRS = ['vocal', 'dance', 'perf', 'anr', 'marketing'];
  const closedAs = rel => ((rel.trophies || 0) >= 1 ? 'crowned' : rel.receptionBand === 'sensation' || rel.receptionBand === 'strong' ? 'warm' : rel.receptionBand === 'miss' ? 'cold' : 'quiet');
  const crRoster = () => {   // who is on the roster at this look, and since which week
    const now = {};
    state.roster.forEach(id => { now[id] = cr.on[id] != null ? cr.on[id] : state.week; });
    cr.on = now;
  };
  const crBegin = () => { crRoster(); cr.sat = Object.keys(state.seats || {}).map(k => state.seats[k].id); };   // the chairs sat as the week begins
  const crOwn = id => {
    const book = cr.rec[id] || {}, keys = Object.keys(book);
    const own = { n: keys.length, crowned: 0, warm: 0, quiet: 0, cold: 0 };
    keys.forEach(k => { if (book[k]) own[book[k]]++; });
    own.running = own.n - own.crowned - own.warm - own.quiet - own.cold;
    return own;
  };
  const crLook = () => {
    crRoster();
    const rels = {};
    KP.groups(state).forEach(g => (g.releases || []).forEach(rel => { rels[g.id + '|' + rel.week] = rel; }));
    Object.keys(rels).forEach(key => {
      const rel = rels[key];
      if (rel.week === state.week) cr.sat.forEach(id => { (cr.rec[id] = cr.rec[id] || {})[key] = null; });   // landed this week, under every chair sat as it began
    });
    Object.keys(cr.rec).forEach(id => Object.keys(cr.rec[id]).forEach(key => {
      if (cr.rec[id][key] == null && rels[key] && rels[key].closed) cr.rec[id][key] = closedAs(rels[key]);   // closed since the last look
    }));
    const S = state.seats || {};
    Object.keys(S).forEach(seatId => {
      const st = S[seatId];
      const c = KP.seatCredit(state, st);
      if (ERA_CHAIRS.includes(seatId)) {
        const own = crOwn(st.id);
        cr.held++;
        const a = [c.n, c.crowned, c.warm, c.quiet, c.cold, c.running].join('/'), b = [own.n, own.crowned, own.warm, own.quiet, own.cold, own.running].join('/');
        if (c.kind !== 'eras' || a !== b) flag(sc.seed, state.week, st.name + '’s credit reads ' + a + ' (eras, with a trophy, warm, quietly, cold, still running) and this tool saw ' + b + ' land and close while they sat');
      } else if (seatId === 'scout') {
        const mine = state.roster.filter(id => cr.on[id] > st.since);
        cr.held++;
        const a = [c.n, c.of, c.debuted].join('/'), b = [mine.length, state.roster.length, mine.filter(id => state.people[id].status === 'idol').length].join('/');
        if (c.kind !== 'floor' || a !== b) flag(sc.seed, state.week, st.name + '’s credit reads ' + a + ' (signed on their watch, on the roster, debuted) and this tool saw ' + b + ' come on to the roster while they sat');
      }
    });
    // a call from outside says what the industry read: the count, and the best of it
    (state.scenes || []).forEach(x => {
      if (x.kind !== 'seatPoach' || !x.seatId || cr.seen[x.id]) return;
      cr.seen[x.id] = true; cr.calls++;
      const st = S[x.seatId];
      if (!st || !ERA_CHAIRS.includes(x.seatId)) return;
      cr.callsHeld++;
      const own = crOwn(st.id), body = KP.sceneDef('seatPoach').body(state, x);
      const m = /What it read: (one|\d+) eras? for this house(?:, (?:(one|\d+) of them )?closed (with a trophy|warm))?\./.exec(body);
      const said = m ? [num(m[1]), m[3] ? num(m[2] || m[1]) : 0, m[3] || 'none'].join('/') : /has no credit at this house yet/.test(body) ? 'no credit, a name' : /not for a credit or a name/.test(body) ? 'no credit, no name' : 'nothing';
      const best = own.crowned ? [own.crowned, 'with a trophy'] : own.warm ? [own.warm, 'warm'] : [0, 'none'];
      const named = ['known', 'a name'].includes(st.tier);
      const want = own.n ? [own.n, best[0], best[1]].join('/') : named ? 'no credit, a name' : 'no credit, no name';
      if (said !== want) flag(sc.seed, state.week, 'the call for ' + st.name + ' says the industry read “' + said + '” and this tool’s books hold “' + want + '”');
    });
  };
  const glLook = () => {   // one not seen before was given since the last look, by the chair of that time
    chLook();
    (state.mandates || []).forEach(m => {
      if (gl.seen[m.id]) return;
      gl.seen[m.id] = true; gl.given++;
      book(gl.chair).lights.push(m.id);
      if (m.exec !== gl.chair) flag(sc.seed, state.week, 'a greenlight given under ' + gl.chair + ' carries the name ' + m.exec);
    });
    (state.claims || []).forEach(c => {
      if (ho.claims[c.id]) return;
      ho.claims[c.id] = true;
      if (c.subject.kind === 'exec') book(gl.chair).claims.push(c.id);
    });
    gl.chair = state.executive.name;
  };
  const num = w => (w === 'no' || w === 'none' ? 0 : w === 'one' ? 1 : Number(w));
  const hoLook = (old, trustAsTheTickBegan) => {   // the chair changed this week with no desk change: the letter is held to the books of the one who left
    ho.given++;
    ho.changes[state.week] = true;
    const b = book(old);
    const lights = b.lights.map(id => (state.mandates || []).find(m => m.id === id)).filter(Boolean);
    // a promise made in the very week of an earlier change is nobody's by the record, unless it names its chair
    const claims = b.claims.map(id => (state.claims || []).find(c => c.id === id)).filter(c => c && (c.execName || !ho.changes[c.week] || c.week === state.week));
    const own = [lights.length, lights.filter(m => m.status === 'met').length, lights.filter(m => m.status === 'lapsed').length,
      claims.length, claims.filter(c => c.resolved === 'met' || c.resolved === 'metPoorly').length, claims.filter(c => c.resolved === 'missed').length];
    const letter = (KP.lastTickNotes || []).find(n => n.ind === 'newChair');
    const m = letter && /has read the file (.+?) left: (?:(no) greenlights|(one|\d+) greenlights?, (none|one|\d+) kept and (none|one|\d+) left dark); (?:(no) promises upstairs|(one|\d+) promises? upstairs, (none|one|\d+) kept and (none|one|\d+) broken); and (?:a last review that read “(\w+)”|no review of theirs on the file)\./.exec(letter.text);
    if (!m) { flag(sc.seed, state.week, 'the chair changed and the letter does not say what ' + old + ' left'); return; }
    const said = [m[2] ? 0 : num(m[3]), m[2] ? 0 : num(m[4]), m[2] ? 0 : num(m[5]), m[6] ? 0 : num(m[7]), m[6] ? 0 : num(m[8]), m[6] ? 0 : num(m[9])];
    if (m[1] !== old) flag(sc.seed, state.week, 'the handover names ' + m[1] + ' and the chair who left was ' + old);
    if (said.join() !== own.join()) flag(sc.seed, state.week, 'the handover says ' + said.join('/') + ' of ' + old + ' (greenlights given, kept, left dark; promises made, kept, broken) and this tool saw ' + own.join('/'));
    if ((m[10] || null) !== b.band) flag(sc.seed, state.week, 'the handover gives ' + old + '’s last review as “' + (m[10] || 'none') + '” and the last this tool saw them give read “' + (b.band || 'none') + '”');
    const scene = (state.scenes || []).find(x => x.kind === 'newChair');
    const rating = b.band || KP.trustBand(trustAsTheTickBegan);   // with no review of theirs, where the desk stood as the week began
    if (!scene || scene.rated !== rating) flag(sc.seed, state.week, 'the first meeting carries “' + (scene && scene.rated) + '” and the rating ' + old + ' left was “' + rating + '”');
  };
  // the annual reviews (v0.11.38, §130). A chair who counts sheets says how many reached the desk this year. The count
  // is held to this tool's own books: the sheets the career had seen at the last mark, which is the desk's last review
  // or the day the desk moved, read off the ledger as the weeks go by and never asked of the engine's review
  const sheetsNow = () => (state.evalLedger ? state.evalLedger.sheets : 0);
  const rv = { base: 0, first: false, seen: 0, given: 0, firsts: 0, counted: 0 };
  const rvLook = before => {   // a review not seen yet was filed since the last look; `before` is the count as the week's tick began
    const list = state.reviews || [];
    const r = list[list.length - 1];
    if (!r || r.week !== state.week || rv.seen === r.week) return;
    rv.seen = r.week; rv.given++;
    book(r.exec).band = r.band;
    if (rv.first) rv.firsts++;
    const at = [sheetsNow()].concat(before == null || before === sheetsNow() ? [] : [before]);   // a showcase in the same tick may fall either side of the review
    if (!at.includes(r.sheets)) flag(sc.seed, state.week, 'a review notes ' + r.sheets + ' sheets, and the career had seen ' + at.join(' or '));
    const m = /^(?:I read (one|\d+) evaluation sheets? this year\.|No evaluation sheet reached my desk this year\.)/.exec(r.said);
    if (m) {
      rv.counted++;
      const said = m[1] == null ? 0 : m[1] === 'one' ? 1 : Number(m[1]);
      const own = at.map(x => Math.max(0, x - rv.base));
      if (!own.includes(said)) flag(sc.seed, state.week, 'a chair who counts sheets said ' + said + ' this year, and this desk’s own year held ' + own.join(' or '));
    }
    rv.base = r.sheets; rv.first = false;
  };
  const glWall = (move, walkout) => {   // the desk moves to another house: everything on file is the last house's from here on
    glLook();
    const was = {};
    (state.mandates || []).forEach(m => { was[m.id] = m.status; });
    const left = state.company.short;
    if (!move()) return;
    // the chairs: none of the last house's, four of the next building's own, sat from this week, each under its own name
    {
      const S = state.seats || {}, sat = Object.keys(S), names = sat.map(seatId => S[seatId].name);
      if (sat.join() !== 'vocal,dance,perf,scout') flag(sc.seed, state.week, 'the next building opened with the chairs [' + sat.join() + '] sat, and a house opens with its four');
      sat.forEach(seatId => {
        const st = S[seatId];
        if (ch.seen[st.id]) flag(sc.seed, state.week, st.name + ' sat in the last house’s chairs and sits in the next building’s ' + seatId + ' chair');
        if (st.since !== state.week) flag(sc.seed, state.week, st.name + ' is filed as sat since week ' + st.since + ' in a building that opened this week');
        if (st.tier !== 'working') flag(sc.seed, state.week, st.name + ' opens the next building as “' + st.tier + '”');
      });
      if (new Set(names).size !== names.length) flag(sc.seed, state.week, 'two chairs of the next building answer to one name: ' + names.join(', '));
      ch.opened = state.week; ch.walls++; ch.minted += sat.length;
      if (walkout) ch.walked = { short: left, week: state.week };
    }
    gl.walls++;
    Object.keys(was).forEach(id => { if (was[id] === 'open') gl.wallOpen++; gl.last[id] = was[id] === 'open' ? 'void' : was[id]; });   // what each must read from now on
    gl.chair = state.executive.name;
    rv.base = sheetsNow(); rv.first = true;   // and the next house's year of sheets begins here
    ho.books = {}; ho.changes = {};           // and so do the books of its chairs
  };
  if (sc.mode === 'service') seedBoyGroup(state);
  glLook();
  let founded = false;
  let dissolvedAt = null;
  const bd = { due: 0, wrote: 0, landed: 0 };   // the label's birthdays (v0.11.36, §128)
  for (let w = 0; w < WEEKS; w++) {
    // the last statement (v0.11.0, §86): the bot is allowed to die. A
    // dissolved label takes the blank page and the world keeps running
    if (KP.chapterPending && KP.chapterPending(state)) {
      if (dissolvedAt == null) dissolvedAt = state.week;
      glWall(() => {
        const r = KP.nextChapter(state, 'blank', { companyName: 'Chapter' + ((state.career || []).length + 2) + ' House' });   // a distinct short per chapter — the obituaries keep their names
        if (!r.ok) flag(sc.seed, state.week, 'the blank page refused: ' + r.reason);
        return r.ok;
      });
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
      glWall(() => { KP.foundLabel(state, 'Audit House'); return !!state.founded; }, true);
      founded = true;
    }
    glLook();
    rvLook();
    const sheetsAsTheTickBegan = sheetsNow(), chairAsTheTickBegan = gl.chair, trustAsTheTickBegan = state.trust;
    crBegin();
    KP.advanceWeek(state);
    crLook();
    rvLook(sheetsAsTheTickBegan);
    // the greenlights (v0.11.37, §129): one the last house gave reads as it did the day the desk moved, and one that
    // was open that day reads set aside; the record lists this desk's own and no other, each with its chair and its end
    glLook();
    if (state.executive.name !== chairAsTheTickBegan) hoLook(chairAsTheTickBegan, trustAsTheTickBegan);
    {
      const all = state.mandates || [];
      all.forEach(m => { if (gl.last[m.id] && m.status !== gl.last[m.id]) flag(sc.seed, state.week, 'a greenlight the last house gave (' + m.id + ') reads “' + m.status + '” at this one and should read “' + gl.last[m.id] + '”'); });
      const mine = all.filter(m => !gl.last[m.id]), rec = KP.greenlights(state);
      if (rec.map(e => e.id).join() !== mine.map(m => m.id).join()) flag(sc.seed, state.week, 'the record lists the greenlights [' + rec.map(e => e.id).join() + '] and this desk was given [' + mine.map(m => m.id).join() + ']');
      else rec.forEach((e, i) => { if (e.status !== mine[i].status || e.who !== mine[i].exec) flag(sc.seed, state.week, 'the record says “' + e.who + ', ' + e.status + '” of a greenlight (' + e.id + ') that ' + mine[i].exec + ' gave and that reads “' + mine[i].status + '”'); });
    }
    // the label's birthday (v0.11.36, §128): the week its doors opened, each year, one letter, and it lands.
    // The week it is due is worked out here from the founding itself, never asked of the engine: a check that
    // asks the engine when the birthday is agrees with an engine that has it wrong
    {
      const f = state.founded, since = f ? state.week - f.week : 0;
      const age = f && since > 0 && since % KP.C.WEEKS_PER_YEAR === 0 ? since / KP.C.WEEKS_PER_YEAR : 0;
      const due = age > 0 && !(state.dissolved && !state.dissolved.door);
      const wrote = (KP.lastTickNotes || []).filter(n => n.ind === 'labelBirthday');
      const landed = state.inbox.filter(m => m.week === state.week && m.ind === 'labelBirthday');
      if (due) bd.due++;
      bd.wrote += wrote.length; bd.landed += landed.length;
      if (wrote.length !== (due ? 1 : 0)) flag(sc.seed, state.week, due ? 'a founded label’s birthday came round with ' + wrote.length + ' letters' : 'a birthday letter on a week that is no birthday');
      if (landed.length !== wrote.length) flag(sc.seed, state.week, 'a birthday letter was written and did not land');
      if (wrote.length && wrote[0].years !== age) flag(sc.seed, state.week, 'a birthday letter gives the wrong age: ' + wrote[0].years + ' for ' + age);
    }
    if (w % 10 === 0) checkIntegrity(sc.seed, state.week, state);
    if (w % 40 === 0) checkRoundtrip(sc.seed, state.week, state);
    if (w === 200 || w === 420 || w === WEEKS - 20) {
      // determinism fork: 20 weeks side by side
      const b = KP.deserialize(KP.serialize(state));
      const a2 = KP.deserialize(KP.serialize(state));
      DESK.off = true;   // the twins' weeks are not the career's: the Desk is counted once
      for (let i = 0; i < 20; i++) { KP.advanceWeek(a2); KP.advanceWeek(b); }
      DESK.off = false;
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
  // the head (v0.11.22, §113): every signing house is run by somebody, no
  // two by the same name, and the January issue never quotes more often
  // than it comes out
  {
    const wl = state.wallLedger || {};
    const hs = KP.signingHouses(state).map(r => KP.rivalHead(state, r) || {});
    if (!hs.every(h => h.name && KP.HEAD_TEMPERS.includes(h.temper))) flag(sc.seed, state.week, 'a signing house has no head');
    if (new Set(hs.map(h => h.name)).size !== hs.length) flag(sc.seed, state.week, 'two houses share a head’s name: ' + hs.map(h => h.name).join(', '));
    if ((wl.quotes || 0) > ((state.riseFallLedger || {}).rankings || 0)) flag(sc.seed, state.week, 'the ranking quoted a head ' + wl.quotes + ' times in ' + ((state.riseFallLedger || {}).rankings || 0) + ' rankings');
    // the ledger (v0.11.23, §114): only acts the table knows, within the caps
    KP.signingHouses(state).forEach(r => {
      const acts = r.directed || [];
      if (!acts.every(a => KP.C.WALL.KINDS[a.kind] && a.week <= state.week)) flag(sc.seed, state.week, r.short + '’s books hold an act the table does not know, or one from the future');
      if (acts.length > KP.C.WALL.cap || Object.keys(KP.C.WALL.KINDS).some(k => acts.filter(a => a.kind === k).length > KP.C.WALL.perKind)) flag(sc.seed, state.week, r.short + '’s books are over their caps');
    });
    // the weight (v0.11.24, §115): the parked dates add up, and each one a
    // house parked is on that house's books
    if ((wl.parksBooks || 0) + (wl.parksTemper || 0) > (wl.parks || 0) || (wl.parksMoved || 0) > (wl.parks || 0)) flag(sc.seed, state.week, 'the parked dates do not add up: ' + [wl.parks, wl.parksBooks, wl.parksTemper, wl.parksMoved].join('/'));
    if ((wl.parks || 0) !== ((wl.kinds || {}).theyAmbushed || 0)) flag(sc.seed, state.week, 'a house parked on a date and it did not go on its books: ' + (wl.parks || 0) + ' parked, ' + ((wl.kinds || {}).theyAmbushed || 0) + ' on the books');
    // the truce (v0.11.26, §117): a call is answered once, a truce ends once, and nothing outlives its year
    if ((wl.truces || 0) + (wl.truceDeclined || 0) > (wl.truceCalls || 0)) flag(sc.seed, state.week, 'more truce answers than calls: ' + [wl.truceCalls, wl.truces, wl.truceDeclined].join('/'));
    KP.signingHouses(state).forEach(r => {
      if (r.truce && state.week > r.truce.until + 1) flag(sc.seed, state.week, r.short + '’s truce ran out and is still on the file');
      if (KP.truceWith(state, r) && r.lastAmbushWeek > r.truce.since) flag(sc.seed, state.week, r.short + ' parked on a date inside its truce');
    });
    // her own questions (v0.11.27, §119): an answer needs a question, a verdict needs a promise, one stands at a time, and it is this chair's
    {
      const up = KP.upstairsLedger(state);
      const openOwn = (state.claims || []).filter(c => !c.resolved && up.types[c.type]);
      if (up.promised + up.passed + up.overtaken > up.asked) flag(sc.seed, state.week, 'more answers to her own questions than questions: ' + [up.asked, up.promised, up.passed, up.overtaken].join('/'));
      if (up.met + up.missed + up.void + openOwn.length > up.promised) flag(sc.seed, state.week, 'more verdicts on her own promises than promises: ' + [up.promised, up.met, up.missed, up.void, openOwn.length].join('/'));
      if (openOwn.length > 1) flag(sc.seed, state.week, openOwn.length + ' of her own promises stand at once');
      if (openOwn.some(c => c.execName !== state.executive.name)) flag(sc.seed, state.week, 'a promise made to another chair’s question is still on the clock');
      // the annual review (v0.11.28, §120): counted under one band, the one its trust falls in
      if (Object.keys(up.bands).reduce((n, k) => n + up.bands[k], 0) !== up.reviews) flag(sc.seed, state.week, 'the reviews do not add up by band: ' + up.reviews + ' against ' + JSON.stringify(up.bands));
      if ((state.reviews || []).some(r => r.band !== KP.trustBand(r.trust))) flag(sc.seed, state.week, 'a review is filed under a band its trust is not in');
    }
    // the company's own file (v0.11.29, §121): in order, one chapter for this desk, nothing dated after today
    {
      const cf = KP.companyFile(state), since = KP.deskSince(state);
      if (!cf.chapters.every((c, i) => i === 0 || c.week >= cf.chapters[i - 1].week)) flag(sc.seed, state.week, 'the company’s file is out of order');
      if (cf.chapters.filter(c => c.kind === 'desk' && c.week === since).length !== 1) flag(sc.seed, state.week, 'the company’s file has no one chapter for this desk');
      if (cf.chapters.some(c => c.week > state.week)) flag(sc.seed, state.week, 'a chapter of the company’s file is dated after today');
      // the written record (v0.11.30, §122): of a known kind, inside this desk's weeks, a first once, the red weeks paired, every mark a chapter
      const marks = KP.fileMarks(state);
      const n = k => marks.filter(m => m.kind === k).length;
      if (!marks.every(m => KP.fileMarkKinds().includes(m.kind) && m.week >= since && m.week <= state.week)) flag(sc.seed, state.week, 'a mark on the written record is of no known kind, or dated outside this desk’s weeks');
      if (n('trophy') > 1 || n('breakthrough') > 1) flag(sc.seed, state.week, 'a first is on the written record twice');
      if (n('redCleared') > n('red') || n('red') - n('redCleared') > 1) flag(sc.seed, state.week, 'the red weeks on the written record do not pair up: ' + n('red') + ' meetings, ' + n('redCleared') + ' cleared');
      if (KP.groups(state).some(g => g.lastShowWinWeek >= since) && n('trophy') !== 1) flag(sc.seed, state.week, 'this desk has won a trophy and the written record has no night for it');
      if (!marks.every(m => cf.chapters.some(c => c.week === m.week && c.kind === m.kind))) flag(sc.seed, state.week, 'a mark on the written record is not a chapter of the company’s file');
    }
    // the year's close (v0.11.32, §124): one year after another, each on its last week, and the books of the year in hand open
    {
      const years = state.years || [], led = state.yearLedger;
      if (!years.every((a, i) => i === 0 || a.year === years[i - 1].year + 1)) flag(sc.seed, state.week, 'the closed years do not follow one another');
      if (!years.every(a => a.week === a.year * KP.C.WEEKS_PER_YEAR && a.week <= state.week)) flag(sc.seed, state.week, 'a year is closed on a week that is not its last');
      if (!years.every(a => !/came in/.test(a.said || '') || a.took >= a.till - a.was)) flag(sc.seed, state.week, 'a year’s letter gives a sum that does not add up');
      if (years.length > KP.C.YEAR.kept) flag(sc.seed, state.week, years.length + ' closed years on the file');
      if (!led || !(led.took >= 0) || led.open.week > state.week) flag(sc.seed, state.week, 'the books of the year in hand are not open');
    }
    // the letterhead (v0.11.25, §116): the staff calls add up, and an answer needs a call
    if ((wl.callsBooks || 0) + (wl.callsTemper || 0) > (wl.calls || 0)) flag(sc.seed, state.week, 'the staff calls do not add up: ' + [wl.calls, wl.callsBooks, wl.callsTemper].join('/'));
    if (((wl.kinds || {}).theyHiredOurStaff || 0) + ((wl.kinds || {}).weKeptOurStaff || 0) > (wl.calls || 0)) flag(sc.seed, state.week, 'more answers on the books than staff calls: ' + (wl.calls || 0) + ' calls');
    // the walkout: the house we walked out of (the founding; a fresh start
    // after a dissolution or from a blank door leaves no house behind) holds
    // it once, dated the week of the founding, and no other house holds one
    {
      const walk = KP.signingHouses(state).map(r => [r.short, (r.directed || []).filter(a => a.kind === 'weWalkedOut').map(a => a.week).join()]).filter(x => x[1]);
      // by this tool's own book of the house the desk walked out of (v0.11.40, §132). It used to ask the file where
      // the label was founded from, and a founded label that later dissolved made the old house's true entry look wrong
      const want = ch.walked && KP.signingHouses(state).some(r => r.short === ch.walked.short) ? ch.walked.short + ' @' + ch.walked.week : '';
      if (walk.map(x => x.join(' @')).join('; ') !== want) {
        flag(sc.seed, state.week, 'the walkout is not on the old house’s books alone: wanted ' + (want || 'none') + ', found ' + (walk.map(x => x.join(' @')).join('; ') || 'none'));
      }
    }
  }
  // the letters that land (v0.11.21, §112): a one-shot letter is written
  // once, so the week's budget must never cut it. The ledgers below count
  // letters written; this counts the Desk.
  deskCount.cutOneShots(DESK, deskMark).forEach(m => flag(sc.seed, state.week, 'a one-shot letter was written and cut by the week’s budget: ' + m));
  // the wait (v0.11.19, §110): a house whose men came home heard from the
  // wait on the way — day 100, the letter from the base, the turn — and
  // never more often than men went
  if ((svl.discharged || 0) >= 1 && !((svl.hundred || 0) >= 1 && (svl.wrote || 0) >= 1 && (svl.turn || 0) >= 1)) {
    flag(sc.seed, state.week, 'men came home (' + svl.discharged + ') but the wait was silent: day 100 ' + (svl.hundred || 0) +
      ', letters from the base ' + (svl.wrote || 0) + ', turns ' + (svl.turn || 0));
  }
  ['hundred', 'wrote', 'turn'].forEach(k => {
    if ((svl[k] || 0) > (svl.enlisted || 0)) flag(sc.seed, state.week, 'more ' + k + ' letters (' + svl[k] + ') than men who went (' + (svl.enlisted || 0) + ')');
  });
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
  // the greenlights at the scenario's end (v0.11.37, §129), and this tool's own count of the wall held against the file
  const glEnd = { met: 0, lapsed: 0, open: 0, void: 0 };
  (state.mandates || []).forEach(m => { glEnd[m.status]++; });
  if (glEnd.void !== gl.wallOpen) flag(sc.seed, state.week, gl.wallOpen + ' greenlights were open when the desk moved and ' + glEnd.void + ' read set aside');
  GL.given += gl.given; GL.walls += gl.walls;
  RV.given += rv.given; RV.firsts += rv.firsts; RV.counted += rv.counted;
  HO.given += ho.given;
  CH.walls += ch.walls; CH.minted += ch.minted;
  CR.held += cr.held; CR.calls += cr.calls; CR.callsHeld += cr.callsHeld;
  ['met', 'lapsed', 'open', 'void'].forEach(k => { GL[k] += glEnd[k]; });
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
    ' | service: ' + ['plans', 'notices', 'enlisted', 'walls', 'discharged', 'returns', 'spent', 'closing', 'lapsed', 'soloChapters', 'hundred', 'wrote', 'turn']
      .map(k => k + ' ' + (svl[k] || 0)).join(', ') +
    // what reached the Desk of it (v0.11.21, §112): the ledger above counts letters written
    ' | landed: ' + [['whole again', 'wholeAgain'], ['closing', 'returnClosing'], ['lapsed', 'returnLapsed'], ['hundred', 'waitHundred'], ['wrote', 'baseLetter'], ['turn', 'waitTurn']]
      .map(([w, k]) => w + ' ' + deskCount.since(DESK, deskMark, k).landed).join(', ') +
    ' | risefall: ' + ['rankings', 'overtakes', 'playerNo1', 'classes', 'offers', 'genTurns', 'torchPasses', 'rivalServices']
      .map(k => k + ' ' + ((state.riseFallLedger || {})[k] || 0)).join(', ') +
    ' | wall: heads stamped ' + ((state.wallLedger || {}).heads || 0) + ', houses standing ' + KP.signingHouses(state).length + ', quoted ' + ((state.wallLedger || {}).quotes || 0) +
    ', acts on the books ' + ((state.wallLedger || {}).acts || 0) +
    ', truce calls ' + ((state.wallLedger || {}).truceCalls || 0) + ' (shaken ' + ((state.wallLedger || {}).truces || 0) + ', broken ' + ((state.wallLedger || {}).trucesBroken || 0) + ', ran ' + ((state.wallLedger || {}).trucesRun || 0) + ')' +
    ', calls ' + ((state.wallLedger || {}).calls || 0) + ' (books ' + ((state.wallLedger || {}).callsBooks || 0) + ', temper ' + ((state.wallLedger || {}).callsTemper || 0) + ')' +
    ', parked ' + ((state.wallLedger || {}).parks || 0) + ' (books ' + ((state.wallLedger || {}).parksBooks || 0) + ', temper ' + ((state.wallLedger || {}).parksTemper || 0) + ', moved ' + ((state.wallLedger || {}).parksMoved || 0) + ')' +
    ' | upstairs: ' + (up => 'asked ' + up.asked + ', promised ' + up.promised + ', kept ' + up.met + ', broken ' + up.missed + ', set aside ' + up.void +
      ', reviews ' + up.reviews + ' (thin ' + up.bands.thin + ', gone ' + up.bands.gone + ')')(KP.upstairsLedger(state)) +
    ' | file: ' + (cf => cf.chapters.length + ' chapter' + (cf.chapters.length === 1 ? '' : 's') + ' (' + cf.chapters.filter(c => !c.before).length + ' under this desk), ' + cf.manager.title)(KP.companyFile(state)) +
    ' | years: ' + (state.years || []).length + ' closed (' + (state.years || []).filter(a => a.headline).length + ' with a headline)' +
    ' | birthdays: ' + bd.wrote + ' written, ' + bd.landed + ' landed, of ' + bd.due + ' due' +
    ' | greenlights: ' + gl.given + ' given (' + glEnd.met + ' kept, ' + glEnd.lapsed + ' left dark, ' + glEnd.open + ' open, ' + glEnd.void + ' set aside), ' + gl.walls + ' desk change' + (gl.walls === 1 ? '' : 's') +
    ' | reviews: ' + rv.given + ' given, ' + rv.firsts + ' the first under a new desk, ' + rv.counted + ' by a chair who counts sheets' +
    ' | handovers: ' + ho.given +
    ' | record: ' + (marks => marks.length + ' mark' + (marks.length === 1 ? '' : 's') + ' (chairs ' + marks.filter(m => m.kind === 'chair').length + ', red weeks ' + marks.filter(m => m.kind === 'red').length + ')')(KP.fileMarks(state)) +
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

deskCount.lines(DESK, 5).forEach(l => console.log(l));
console.log('the credits (v0.11.41): ' + CR.held + ' weeks of a chair’s credit held to this tool’s own books of what landed, how it closed and who signed · ' + CR.calls + ' calls from outside, ' + CR.callsHeld + ' of them for a chair that works an era, each held to the same books');
console.log('the chairs (v0.11.40): ' + CH.walls + ' desk change' + (CH.walls === 1 ? '' : 's') + ' · ' + CH.minted + ' chairs opened the next buildings, four at each · none carried across, by this tool’s own books of who sat');
console.log('the handovers (v0.11.39): ' + HO.given + ' · each letter held to this tool’s own books of the chair who left');
console.log('the reviews (v0.11.38): ' + RV.given + ' given · ' + RV.firsts + ' the first under a new desk · ' + RV.counted + ' by a chair who counts sheets, each count held to the desk’s own year');
console.log('the greenlights (v0.11.37): ' + GL.given + ' given · ' + GL.met + ' kept · ' + GL.lapsed + ' left dark · ' + GL.open + ' open · ' + GL.void + ' set aside at ' + GL.walls + ' desk change' + (GL.walls === 1 ? '' : 's'));
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
