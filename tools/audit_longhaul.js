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
const staffYear = require('./staff_year');
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
      // the trial's own career (v0.11.47, §140): with HAUL_UNANSWERED set, the bot leaves a call for its staff
      // on the desk until it lapses, which no bot here does otherwise. Off, every call is answered
      if (process.env.HAUL_UNANSWERED) return;
      KP.resolveScene(state, sc.id, state.budget > KP.C.HIRES.raiseCost + 100 ? 'raise' : 'walk');
      return;
    }
    const def = KP.sceneDef(sc.kind);
    if (def) {
      const opts = def.options(state, sc);
      if (opts && opts.length) KP.resolveScene(state, sc.id, opts[0].id);
    }
  });
  // the trial's own career (v0.11.47, §140): with HAUL_LETGO set, the bot lets one chair go every sixty weeks,
  // each chair in its turn, which no bot here does otherwise. Off, nobody is let go
  if (process.env.HAUL_LETGO && wk % 60 === 30) {
    const turn = KP.C.HIRES.SEATS[Math.floor(wk / 60) % KP.C.HIRES.SEATS.length].id;
    if ((state.seats || {})[turn]) KP.releaseSeat(state, turn);
  }
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
    // the trial's own career (v0.11.46, §139): with HAUL_STUDIO set, the bot briefs each record to the house's own
    // producer and writer and plans the record they deliver. A long career then holds studio chairs with records
    // to their names, which no bot here makes otherwise: the staff's letter is tried on it. Off, none of this runs
    const STUDIO = !!process.env.HAUL_STUDIO;
    if (STUDIO) state.groups.forEach(g => {
      if (!g.debuted || g.retiredWeek || g.prep || g.tour || g.hiatus || g.commission || !g.members.length) return;
      if ((g.demos || []).some(d => d.commissioned)) return;
      const pr = KP.houseProducers(state)[0], w = KP.houseWriters(state)[0];
      if (!pr || !w) return;
      const lane = g.concept || 'bright', themes = KP.themesForLane(lane);
      const theme = (themes.find(th => (w.themes || []).includes(th.id)) || themes[0] || { id: 'longing' }).id;
      KP.commissionRecord(state, g.id, { lane, theme, producerId: pr.id, writerId: w.id });
    });
    // hiatus a worn group; comeback everything else on the calendar
    state.groups.forEach(g => {
      if (!g.debuted || g.prep || g.tour) return;
      if (STUDIO && g.commission) return;   // the writing room has the brief: the calendar waits for it
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
      const demo = (STUDIO && g.demos.find(d => d.commissioned)) || g.demos[0];
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
const YR = { due: 0, wrote: 0, landed: 0, lines: 0, words: 0, held: 0 };    // the staff's letters on the year (v0.11.46, §139)
const RL = { gone: 0, lines: 0, held: 0, recs: 0, stamped: 0, atDesk: 0, shut: 0 };   // the roll, the room on a record, the scout's name (v0.11.47, §140)
const NM = { cands: 0, weeks: 0, turns: 0, beyond: 0 };                     // the names of every candidate (v0.11.43, §135)
// this tool's own copy of the names (v0.11.45, §138): the hundred of before, and the four hundred
const NAMES_FAM = ['Baek', 'Cha', 'Im', 'Joo', 'Gil', 'Weon', 'Pyo', 'Sa', 'Byun', 'Ma', 'Seok', 'Ok', 'Bang', 'Eom', 'Mo', 'Kwak', 'Yeom', 'Gong', 'Ra', 'Bong'];
const NAMES_GIV = ['Ki-tae', 'Seon-mi', 'Do-hwan', 'Yeo-reum', 'Sang-cheol', 'In-na', 'Moo-young', 'Ha-eun', 'Chul-soo', 'Bo-ra',
  'Jae-hoon', 'Ji-sun', 'Sung-ho', 'Eun-sook', 'Kwang-soo', 'Hye-won', 'Dong-wook', 'Yoon-hee', 'Jin-ho', 'Soo-ah'];
const NAMES_ALL = new Set(), NAMES_OLD = new Set();
NAMES_FAM.forEach((f, i) => NAMES_GIV.forEach((g, j) => { NAMES_ALL.add(f + ' ' + g); if (i < 10 && j < 10) NAMES_OLD.add(f + ' ' + g); }));
const FD = { wrote: 0, desk: 0, below: 0, most: 0 };                        // every letter, on the Desk or below the fold (v0.11.44, §137)
const NW = { weeks: 0, landed: 0, under: 0, kinds: 0 };                     // the place kept for a kind never shown (v0.11.44, §137)
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
  // the staff's year (v0.11.46, §139; v0.11.42's yearly word, §134, as one letter). In the first week of a year, by
  // this tool's own count of the weeks, the staff write one letter and it lands; in no other week do they. It has
  // a line for each chair sat and for no one else, in the building's order, each under the chair's own name and
  // title and the weeks this tool has seen it sat. A chair seen sat fewer than twelve weeks has no word, and every
  // other has one. The year it gives the house is the year this tool saw land since the desk came. What a chair
  // says of its year is held to this tool's own books of it: one that speaks of a trophy sat through one, one
  // that speaks of the cold sat through nothing else, one that says nothing came of it sat through nothing, and a
  // count is this tool's count, the whole years running with nothing among them. In a year this tool saw nothing
  // land, the first line has said so and a room's chair does not say it again while it has anything else to say.
  // A chair speaks of its weeks here only when it came during the year. No chair says
  // a sentence it said in the letter before, no two chairs of one letter say the same sentence, and each chair's
  // card keeps the word the letter gave it. Nothing here asks the engine what a chair should say
  const yr = { first: {}, eras: [], made: {}, said: {}, dry: {}, due: 0, wrote: 0, landed: 0, lines: 0, words: 0, held: 0 };
  const yrMade = () => {   // the records each studio chair has made here, by the week this tool saw each appear
    const S = state.seats || {};
    Object.keys(S).forEach(k => {
      const st = S[k];
      if (!KP.C.HIRES.SEATS.find(x => x.id === k).studio) return;
      const now = (st.works || []).map(w => w.title + '|' + w.groupId);
      const book = yr.made[st.id] = yr.made[st.id] || { was: now, weeks: [] };   // what a chair came with is not this house's
      // the file keeps a chair's last twelve, so the list does not only grow: what is new this look is what follows
      // the longest run of last look's that still opens it
      let run = Math.min(book.was.length, now.length);
      while (run > 0 && book.was.slice(book.was.length - run).join('\n') !== now.slice(0, run).join('\n')) run--;
      for (let i = run; i < now.length; i++) book.weeks.push(state.week);
      book.was = now;
    });
  };
  const yrLook = () => {
    const S = state.seats || {}, Y = KP.C.WEEKS_PER_YEAR;
    yrMade();
    const wrote = (KP.lastTickNotes || []).filter(n => n.ind === 'seatYear');
    const landed = state.inbox.filter(m => m.week === state.week && m.ind === 'seatYear');
    const sat = KP.C.HIRES.SEATS.filter(x => S[x.id]);
    const seen = x => state.week - yr.first[S[x.id].id];   // the weeks this tool has seen the chair sat
    const turn = state.week > 1 && state.week % Y === 1;
    const due = turn && sat.some(x => seen(x) >= 12);
    if (due) yr.due++;
    yr.wrote += wrote.length; yr.landed += landed.length;
    if (wrote.length !== (due ? 1 : 0)) {
      flag(sc.seed, state.week, due ? 'the first week of a year, with a chair sat twelve weeks or more, and the staff wrote ' + wrote.length + ' letters on the year'
        : 'the staff wrote a letter on the year in ' + (turn ? 'a week no chair has been sat twelve weeks' : 'a week that is not the first of a year'));
      return;
    }
    if (landed.length !== wrote.length) flag(sc.seed, state.week, 'the staff’s letter on the year was written and did not land');
    if (!wrote.length) return;
    const L = staffYear.read(wrote[0].text), close = state.week - 1;
    if (L.year !== close / Y) flag(sc.seed, state.week, 'the staff’s letter is headed Year ' + L.year + ' in the first week after year ' + close / Y);
    const own = yr.eras.filter(w => w > Math.max(close - Y, ch.opened) && w <= close).length;
    if (L.house !== own) flag(sc.seed, state.week, 'the staff’s letter says the house put out ' + (L.house == null ? 'nothing it can be read for' : L.house) + ' in the year and this tool saw ' + own + ' land since the desk came');
    if (L.lines.length !== sat.length || L.lines.some(l => l.bad)) {
      flag(sc.seed, state.week, 'the staff’s letter has ' + L.lines.length + ' lines, ' + L.lines.filter(l => l.bad).length + ' of them unreadable, for ' + sat.length + ' chairs sat');
      return;
    }
    const heard = {};
    sat.forEach((x, i) => {
      const st = S[x.id], l = L.lines[i], weeks = seen(x);
      yr.lines++;
      if (l.name !== st.name || l.label !== x.label) { flag(sc.seed, state.week, 'line ' + (i + 1) + ' of the staff’s letter is ' + l.name + ', ' + l.label + ', and the chair sat there is ' + st.name + ', ' + x.label); return; }
      const told = l.arrived ? weeks < 2 : l.weeks != null ? weeks >= 2 && weeks < Y && l.weeks === weeks : weeks >= Y && l.years === Math.floor(weeks / Y);
      if (!told) flag(sc.seed, state.week, 'the staff’s letter gives ' + st.name + ' ' + (l.arrived ? 'as just arrived' : l.weeks != null ? l.weeks + ' weeks' : l.years + ' years') + ' in the chair and this tool has seen them sat ' + weeks + ' weeks');
      if ((l.word == null) !== (weeks < 12)) { flag(sc.seed, state.week, st.name + ' has ' + (l.word == null ? 'no word' : 'a word') + ' in the staff’s letter after ' + weeks + ' weeks sat'); return; }
      if (l.word == null) { if (st.word) flag(sc.seed, state.week, 'the card of ' + st.name + ' keeps a word and the staff’s letter gave them none'); return; }
      yr.words++;
      if (!st.word || st.word.week !== state.week || st.word.text !== l.word) flag(sc.seed, state.week, 'the card of ' + st.name + ' does not keep the word the staff’s letter gave them');
      const mine = staffYear.sentences(l.word);
      const again = mine.filter(y => (yr.said[st.id] || {})[y]);
      if (again.length) flag(sc.seed, state.week, st.name + ' says again what they said in the letter before: “' + again[0] + '”');
      const twin = mine.filter(y => heard[y]);
      if (twin.length) flag(sc.seed, state.week, st.name + ' and ' + heard[twin[0]] + ' say the same sentence in one letter: “' + twin[0] + '”');
      yr.said[st.id] = {};
      mine.forEach(y => { heard[y] = st.name; yr.said[st.id][y] = true; });
      // the chair's year by this tool's own books
      const c = staffYear.claims(l.word), whole = yr.first[st.id] <= Math.max(close - Y, 1);
      const inYear = w => w > close - Y && w <= close;
      let n;
      if (ERA_CHAIRS.includes(x.id)) {
        const book = cr.rec[st.id] || {}, keys = Object.keys(book).filter(key => inYear(Number(key.split('|').pop())));
        const crowned = keys.filter(key => book[key] === 'crowned').length, cold = keys.filter(key => book[key] === 'cold').length;
        n = keys.length;
        if (c.trophy && !crowned) flag(sc.seed, state.week, st.name + ' speaks of a trophy and this tool saw no record close with one in their year');
        if (c.cold && !(n && cold === n)) flag(sc.seed, state.week, st.name + ' says the records closed cold and this tool saw ' + cold + ' of ' + n + ' close cold in their year');
      } else if (x.id === 'scout') n = state.roster.filter(id => cr.on[id] > yr.first[st.id] && inYear(cr.on[id])).length;
      else n = ((yr.made[st.id] || {}).weeks || []).filter(inYear).length;
      yr.held++;
      const room = ERA_CHAIRS.includes(x.id);
      // whole years running with nothing, by this tool's own count; a room's are the house's, and are not counted aloud
      const dry = yr.dry[st.id] = n || room || !whole ? 0 : (yr.dry[st.id] || 0) + 1;
      const bare = !!st.word && st.word.text === st.word.second;   // the word is what the chair says of itself and no more
      if (room && !own) {   // the first line has said it: the room's chair says what it has to say of itself, and only with nothing of that says it again
        if (!bare && !(c.nothing && st.word && st.word.second === '')) flag(sc.seed, state.week, st.name + (c.nothing ? ' says again that nothing went out, in a year the letter’s first line has said so' : ' speaks of the room’s work in a year this tool saw nothing land'));
      } else if (bare) flag(sc.seed, state.week, st.name + ' says nothing of the year’s work in a year this tool counted ' + n + ' in');
      else if (c.nothing !== (n === 0)) flag(sc.seed, state.week, st.name + (c.nothing ? ' says nothing came of the year and this tool counted ' + n + ' in it' : ' speaks of work in a year this tool counted nothing in'));
      else if (!room && c.count !== n) flag(sc.seed, state.week, st.name + ' counts ' + c.count + ' in the year and this tool counted ' + n);
      else if ((c.running || 0) !== (dry > 1 ? dry : 0)) flag(sc.seed, state.week, st.name + ' counts ' + (c.running || 'no') + ' years running with nothing and this tool counted ' + dry);
      const opens = bare ? '' : mine[0];
      if (/ in my weeks here/.test(opens) && whole) flag(sc.seed, state.week, st.name + ' speaks of their weeks here and this tool has seen them sat the year through');
      if (/ last year/.test(opens) && !whole) flag(sc.seed, state.week, st.name + ' speaks of last year and this tool first saw them sat in week ' + yr.first[st.id] + ' of it');
    });
  };
  // one name, one chair (v0.11.43, §135): this tool's own note of every name it has heard take a meeting in this
  // career. A candidate does not come in under a name sat in the building, nor under one the tool has already
  // heard, until it has heard all hundred; then its note starts over, as the desk's memory does. And no week has
  // two chairs sat under one name. Nothing here asks the engine whom it remembers
  // Since v0.11.45 (§138) the pool is four hundred, and this tool keeps its own copy of it: a candidate's name is one
  // of the four hundred, and a career that meets twenty or more hears names from beyond the hundred of before
  const nm = { heard: {}, n: 0, cands: 0, seen: {}, weeks: 0, turns: 0, beyond: 0 };
  const nmLook = () => {
    const S = state.seats || {};
    const sat = Object.keys(S).map(k => S[k].name);
    nm.weeks++;
    sat.forEach((n, i) => { if (sat.indexOf(n) !== i) flag(sc.seed, state.week, 'two chairs are sat under one name: ' + n); });
    (state.scenes || []).filter(x => x.kind === 'theInterview' && x.cand).forEach(x => {
      if (nm.seen[x.cand.id]) return;
      nm.seen[x.cand.id] = true; nm.cands++;
      const name = x.cand.name;
      if (!NAMES_ALL.has(name)) flag(sc.seed, state.week, name + ' took a meeting under a name that is not one of the four hundred');
      else if (!NAMES_OLD.has(name)) nm.beyond++;
      if (sat.includes(name)) flag(sc.seed, state.week, name + ' took a meeting under a name sat in this building');
      else if (nm.heard[name]) {
        if (nm.n >= 400) { nm.heard = {}; nm.n = 0; nm.turns++; }   // all four hundred heard: the note starts over
        else flag(sc.seed, state.week, name + ' took a meeting under a name this desk had already met, with ' + (400 - nm.n) + ' of the four hundred unheard');
      }
      if (!nm.heard[name]) { nm.heard[name] = true; nm.n++; }
    });
  };
  // below the fold (v0.11.44, §137): nothing a week writes is lost. By this tool's own count of the week's wire,
  // every letter is on the Desk or below the fold with the week it was written; the week after, by this tool's
  // own note of what was cut, every one is still there; and the fold holds no letter older than that
  const fd = { wrote: 0, desk: 0, below: 0, most: 0, last: null };
  const fdLook = weekBefore => {
    if (state.week === weekBefore) return;   // no week ran: the wire is the last week's
    const wire = (KP.lastTickNotes || []).filter(n => !n.spotlight && !n.feedOnly);
    const fold = state.fold || [];
    const landed = state.inbox.filter(m => m.week === state.week && wire.includes(m));
    const desk = landed.length;
    // a folded letter is a lean copy, told by its words: what is below the fold this week is, word for word and in
    // the wire's order, what the wire wrote and the Desk does not hold
    const cut = wire.filter(n => !landed.includes(n)).map(n => n.text);
    const now = fold.filter(m => m.week === state.week).map(m => m.text);
    fd.wrote += wire.length; fd.desk += desk; fd.below += now.length;
    if (desk + now.length !== wire.length) flag(sc.seed, state.week, 'the week wrote ' + wire.length + ' letters: ' + desk + ' are on the Desk and ' + now.length + ' below the fold');
    else if (JSON.stringify(now) !== JSON.stringify(cut)) flag(sc.seed, state.week, 'below the fold are not the letters the week cut');
    if (now.length > cut.length) flag(sc.seed, state.week, 'a letter is on the Desk and below the fold');
    const before = fold.filter(m => m.week === state.week - 1).map(m => m.text);
    if (fd.last && fd.last.week === state.week - 1 && JSON.stringify(before) !== JSON.stringify(fd.last.cut))
      flag(sc.seed, state.week, 'the fold let go of last week’s letters: ' + before.length + ' of ' + fd.last.cut.length + ' are left');
    fd.last = { week: state.week, cut };
    const stale = fold.filter(m => !(m.week > state.week - 2));
    if (stale.length) flag(sc.seed, state.week, 'the fold holds a letter from week ' + stale[0].week);
    if (fold.length > fd.most) fd.most = fold.length;
  };
  // the kept place (v0.11.44, §137; the ruling's first clause): in a week that writes a kind this Desk has never
  // shown, one lands, if the five have any room. And one place is all it takes: no letter is cut for one of lower
  // priority, but for that one. Held to this tool's own note of every letter that reached the inbox, the week's
  // own and an action's, from the career's first week
  // And the file's two counts are this tool's own, kind for kind: what the Desk has shown, and what the weeks have written
  const nw = { shown: {}, lastId: 0, weeks: 0, landed: 0, under: 0, seen: {}, wrote: {}, kinds: 0, off: {} };
  const nwLook = weekBefore => {
    if (state.week === weekBefore) return;
    const idOf = m => +String(m.id || '').slice(1) || 0;
    const kindOf = n => n.ind || ('kind:' + (n.kind || '?'));
    const isCrit = n => n.priority === 'critical';
    const isHeld = n => !isCrit(n) && (!!n.opens || (n.kind === 'health' && (n.priority === 'high' || (!n.priority && !!n.urgent))));
    const wire = (KP.lastTickNotes || []).filter(n => !n.spotlight && !n.feedOnly);
    const fresh = state.inbox.filter(m => idOf(m) > nw.lastId);
    // an action's letter since the last look was on the Desk before the week was trimmed
    fresh.filter(m => !wire.includes(m)).forEach(m => { nw.shown[kindOf(m)] = true; });
    const held = wire.filter(isHeld);
    wire.filter(n => isCrit(n) || isHeld(n)).forEach(n => { nw.shown[kindOf(n)] = true; });
    const pool = wire.filter(n => !isCrit(n) && !isHeld(n));
    const newKinds = Array.from(new Set(pool.map(kindOf).filter(k => !nw.shown[k])));
    const landedKinds = new Set(pool.filter(n => fresh.includes(n)).map(kindOf));
    const room = Math.max(0, 5 - held.length);
    const got = newKinds.filter(k => landedKinds.has(k));
    if (newKinds.length && room) { nw.weeks++; if (got.length) nw.landed++; }
    if (newKinds.length && room && !got.length)
      flag(sc.seed, state.week, 'a week wrote a kind this Desk has never shown and none landed, with room for ' + room + ': ' + newKinds[0] + (newKinds.length > 1 ? ' and ' + (newKinds.length - 1) + ' more' : ''));
    // priority holds for every place but the kept one
    const prio = n => (n.priority === 'high' || (!n.priority && n.urgent) ? 2 : n.priority === 'flavor' ? 0 : 1);
    const cut = pool.filter(n => !fresh.includes(n));
    const cutMost = cut.reduce((m, n) => Math.max(m, prio(n)), -1);
    const under = pool.filter(n => fresh.includes(n) && prio(n) < cutMost);
    nw.under += under.length;
    if (under.length > 1 || (under.length === 1 && !newKinds.includes(kindOf(under[0]))))
      flag(sc.seed, state.week, 'a letter was cut for ' + under.length + ' of lower priority, and the kept place is one, for a kind never shown: ' + under.map(kindOf).join(', '));
    fresh.forEach(m => { const k = kindOf(m); nw.seen[k] = (nw.seen[k] || 0) + 1; nw.wrote[k] = (nw.wrote[k] || 0) + 1; });
    cut.concat(wire.filter(n => (isCrit(n) || isHeld(n)) && !fresh.includes(n))).forEach(n => { const k = kindOf(n); nw.wrote[k] = (nw.wrote[k] || 0) + 1; });
    [['seen', 'deskSeen', 'what its Desk has shown'], ['wrote', 'deskWrote', 'what its weeks have written']].forEach(([mine, theirs, what]) => {
      if (nw.off[mine]) return;   // said once for a career
      const file = state[theirs] || {};
      const k = Object.keys(Object.assign({}, nw[mine], file)).find(x => (nw[mine][x] || 0) !== (file[x] || 0));
      if (k) { nw.off[mine] = true; flag(sc.seed, state.week, 'the file’s count of ' + what + ' is not this tool’s: ' + k + ' is ' + (file[k] || 0) + ' on the file and ' + (nw[mine][k] || 0) + ' by the note'); }
    });
    nw.kinds = Object.keys(nw.wrote).length;
    fresh.forEach(m => { nw.shown[kindOf(m)] = true; if (idOf(m) > nw.lastId) nw.lastId = idOf(m); });
  };
  // the roll (v0.11.47, §140): this tool's own note of every chair it sees sat. One it saw sat at the last look and
  // does not see now has gone, and is on the roll: once, under the name, the chair and the house this tool noted,
  // from the week it first saw them to this one. A line of the roll is never lost and never changes, but for an era
  // that was running when they went and has closed since. While the house's records are on the file, the credit on
  // a line is this tool's own books of that chair, week by week: the eras that landed while it saw them sat and how
  // each closed, the roster that came on while the scout sat, the records it saw a studio chair's list gain. A
  // chair that goes at the desk is read that day too: it is the one read of a chair left behind when the desk
  // leaves a house. Once this tool has seen the desk leave a house, every line of that house is shut and its
  // credit never changes; a line of a house whose chairs are sat is open. A record carries the rooms' chairs this
  // tool saw sat as its week began, and keeps them. Each of the roster first seen while a scout sat carries that
  // scout's name, and nobody else carries one. And a studio chair's list of records loses nothing. Nothing here
  // asks the engine who has gone
  const rl = { sat: {}, began: {}, copy: [], rooms: {}, under: {}, floor: {}, titles: {}, house: null, left: {}, gone: 0, lines: 0, recs: 0, stamped: 0, held: 0, atDesk: 0, shut: 0 };
  const rlFloor = () => {   // what this tool's books hold for the scout sat now
    const sc = (state.seats || {}).scout;
    if (!sc) return null;
    const mine = state.roster.filter(id => cr.on[id] > yr.first[sc.id]);
    return { id: sc.id, n: mine.length, of: state.roster.length, debuted: mine.filter(id => state.people[id].status === 'idol').length };
  };
  const rlLook = after => {
    const S = state.seats || {}, now = {}, roll = state.staffRoll || [], house = state.company.short;
    Object.keys(S).forEach(k => { now[S[k].id] = { name: S[k].name, seatId: k, house }; });
    const adds = c => (c.kind !== 'eras' ? true : c.crowned + c.warm + c.quiet + c.cold + c.running === c.n);
    if (rl.house && rl.house !== house) rl.left[rl.house] = true;   // this tool has seen the desk leave that house
    crOver();   // the desk's own week can end an act
    rl.house = house;
    rl.copy.forEach((was, i) => {
      const e = roll[i];
      if (!e) { flag(sc.seed, state.week, 'a line of the roll is gone: ' + was.name + ', ' + was.seatId); return; }
      if (!['id', 'name', 'seatId', 'house', 'since', 'until', 'how', 'to', 'by'].every(f => e[f] === was[f]) || e.credit.kind !== was.credit.kind) flag(sc.seed, state.week, 'a line of the roll has changed: ' + was.name + ', ' + was.seatId);
      else if (e.credit.kind === 'eras' && e.house !== house && JSON.stringify(e.credit) !== JSON.stringify(was.credit)) flag(sc.seed, state.week, 'the credit of ' + e.name + ' on the roll has changed since the desk left ' + e.house);
    });
    // whoever was sat at the last look and is not sat now
    Object.keys(rl.sat).forEach(id => {
      if (now[id]) return;
      const was = rl.sat[id], mine = roll.filter(e => e.id === id);
      rl.gone++;
      if (mine.length !== 1) { flag(sc.seed, state.week, was.name + ' sat in the ' + was.seatId + ' chair and has gone, and the roll holds ' + mine.length + ' lines for them'); return; }
      const e = mine[0];
      if (e.name !== was.name || e.seatId !== was.seatId || e.house !== was.house || e.since !== yr.first[id] || e.until !== state.week) {
        flag(sc.seed, state.week, 'the roll files ' + e.name + ' in the ' + e.seatId + ' chair at ' + e.house + ' from week ' + e.since + ' to ' + e.until + ', and this tool saw ' + was.name + ' in the ' + was.seatId + ' chair at ' + was.house + ' from week ' + yr.first[id] + ' to ' + state.week);
      }
      // gone at the desk, before the week ran: this tool's books of the chair are as the last week left them, and
      // the line says what they say. It is the one read of a chair that stays behind when the desk leaves a house
      if (!after && ERA_CHAIRS.includes(e.seatId)) {
        const own = crOwn(id);
        const a = [e.credit.n, e.credit.crowned, e.credit.warm, e.credit.quiet, e.credit.cold, e.credit.running].join('/'), b = [own.n, own.crowned, own.warm, own.quiet, own.cold, own.running].join('/');
        rl.atDesk++;
        if (a !== b) flag(sc.seed, state.week, 'the roll files ' + e.name + ' with ' + a + ' (eras, with a trophy, warm, quietly, cold, still running) the day they went, and this tool had seen ' + b + ' land and close while they sat');
      }
      if (e.seatId === 'scout') {   // the scout's count as this tool held it at the last look, or holds it at this one
        const held = [rl.floor[id], (() => { const mineNow = state.roster.filter(p => cr.on[p] > yr.first[id]); return { n: mineNow.length, of: state.roster.length, debuted: mineNow.filter(p => state.people[p].status === 'idol').length }; })()].filter(Boolean);
        if (!held.some(f => f.n === e.credit.n && f.of === e.credit.of && f.debuted === e.credit.debuted)) flag(sc.seed, state.week, 'the roll credits ' + e.name + ' with ' + e.credit.n + ' of ' + e.credit.of + ' signed, ' + e.credit.debuted + ' debuted, and this tool held ' + held.map(f => f.n + ' of ' + f.of + ', ' + f.debuted).join(' or '));
      } else if (!ERA_CHAIRS.includes(e.seatId)) {
        const own = ((yr.made[id] || {}).weeks || []).length;
        if (e.credit.kind !== 'records' || e.credit.n !== own) flag(sc.seed, state.week, 'the roll credits ' + e.name + ' with ' + e.credit.n + ' records made here and this tool saw ' + own);
      }
    });
    rl.sat = now;
    const fl = rlFloor();
    if (fl) rl.floor[fl.id] = fl;
    // every line of this house: whole, and the eras on it this tool's own
    roll.forEach(e => {
      if (!adds(e.credit)) flag(sc.seed, state.week, 'the credit of ' + e.name + ' on the roll does not add up');
      // a line of a house this tool has seen the desk leave is shut, and a line of a house with its chairs sat is not
      if (rl.left[e.house]) { rl.shut++; if (!e.shut) flag(sc.seed, state.week, 'the desk has left ' + e.house + ', and the line of ' + e.name + ' on its roll is not shut'); }
      else if (e.shut && Object.keys(S).length) flag(sc.seed, state.week, 'the line of ' + e.name + ' on the roll is shut, and the chairs of ' + e.house + ' are sat');
      if (e.house !== house || !ERA_CHAIRS.includes(e.seatId)) return;
      const own = crOwn(e.id);
      rl.held++;
      const a = [e.credit.n, e.credit.crowned, e.credit.warm, e.credit.quiet, e.credit.cold, e.credit.running].join('/'), b = [own.n, own.crowned, own.warm, own.quiet, own.cold, own.running].join('/');
      if (after && a !== b) flag(sc.seed, state.week, 'the roll credits ' + e.name + ' with ' + a + ' (eras, with a trophy, warm, quietly, cold, still running) and this tool saw ' + b + ' land and close while they sat');
    });
    rl.copy = roll.map(e => JSON.parse(JSON.stringify(e)));
    rl.lines = roll.length;
    // a studio chair's list of records loses nothing
    Object.keys(S).forEach(k => {
      if (!KP.C.HIRES.SEATS.find(x => x.id === k).studio) return;
      const st = S[k], have = (st.works || []).map(w => w.title + '|' + w.groupId);
      (rl.titles[st.id] || []).forEach(t => { if (!have.includes(t)) flag(sc.seed, state.week, 'a record has gone from the list of ' + st.name + ': ' + t.split('|')[0]); });
      rl.titles[st.id] = have;
    });
    if (!after) { rl.began = now; return; }   // the chairs sat as the week begins: whose names a record landing this week carries
    // the records that landed this week, and every record this tool has seen: the room, by name, for good
    KP.groups(state).forEach(g => (g.releases || []).forEach(rel => {
      const key = g.id + '|' + rel.week, said = JSON.stringify(rel.room || null);
      if (rel.week === state.week && rl.rooms[key] == null) {
        const own = {};
        KP.C.HIRES.SEATS.forEach(x => { const id = Object.keys(rl.began).find(i => rl.began[i].seatId === x.id); if (id && ERA_CHAIRS.includes(x.id)) own[x.id] = rl.began[id].name; });
        rl.recs++;
        if (said !== JSON.stringify(own)) flag(sc.seed, state.week, 'the record “' + rel.songTitle + '” carries the room ' + said + ' and this tool saw ' + JSON.stringify(own) + ' sat as the week began');
        rl.rooms[key] = said;
      } else if (rl.rooms[key] != null && rl.rooms[key] !== said) flag(sc.seed, state.week, 'the room on the record “' + rel.songTitle + '” has changed');
    }));
    // who signed on a scout's watch: noted the look this tool first sees them on the roster, held from the look after
    state.roster.forEach(id => {
      const p = state.people[id];
      if (rl.under[id] === undefined) { const scn = (state.seats || {}).scout; rl.under[id] = scn && cr.on[id] > yr.first[scn.id] ? scn.name : null; }
      if (cr.on[id] >= state.week) return;
      if (rl.under[id]) rl.stamped++;
      if ((p.signedUnder || null) !== rl.under[id]) flag(sc.seed, state.week, KP.displayName(p) + ' carries the scout’s name “' + (p.signedUnder || 'none') + '” and this tool noted “' + (rl.under[id] || 'none') + '” the week they came on to the roster');
    });
  };
  const chLook = () => {
    const S = state.seats || {};
    yrMade();
    Object.keys(S).forEach(seatId => {
      const st = S[seatId];
      ch.seen[st.id] = true;
      if (yr.first[st.id] == null) yr.first[st.id] = state.week;   // the week this tool first saw them sat (§134)
      if (!(st.since >= ch.opened && st.since <= state.week)) flag(sc.seed, state.week, st.name + ' is filed as sat in the ' + seatId + ' chair since week ' + st.since + ', and this building opened in week ' + ch.opened);
    });
  };
  // the credits (v0.11.41, §133): this tool's own books of what happened while each chair sat. Which records landed
  // in a week the chair began sat, how each closed by this tool's own reading of the close, and the week each of
  // the roster came on to it. The engine's read of a chair's credit is held to them every week, and so is what a
  // call from outside says the industry read. Nothing here asks the engine what a chair is credited with
  const cr = { rec: {}, on: {}, sat: [], seen: {}, over: {}, held: 0, calls: 0, callsHeld: 0 };
  const ERA_CHAIRS = ['vocal', 'dance', 'perf', 'anr', 'marketing'];
  const closedAs = rel => ((rel.trophies || 0) >= 1 ? 'crowned' : rel.receptionBand === 'sensation' || rel.receptionBand === 'strong' ? 'warm' : rel.receptionBand === 'miss' ? 'cold' : 'quiet');
  const crRoster = () => {   // who is on the roster at this look, and since which week
    const now = {};
    state.roster.forEach(id => { now[id] = cr.on[id] != null ? cr.on[id] : state.week; });
    cr.on = now;
  };
  const crBegin = () => { crRoster(); cr.sat = Object.keys(state.seats || {}).map(k => state.seats[k].id); };   // the chairs sat as the week begins
  // an era with no close on the file is running only while it is its act's latest record, the act stands, and
  // the promotion has weeks left. One that is none of these never came to its close (an act that ends the week
  // its record lands), and it reads by its trophies and its reception, as its close would have. No long career
  // held one until the trial's own (v0.11.47, §140), and these books read it as running for good
  const crOver = () => {
    cr.over = {};
    KP.groups(state).forEach(g => (g.releases || []).forEach((rel, i, all) => {
      if (!rel.closed && (g.retiredWeek || i < all.length - 1 || state.week > (g.promoUntil || 0))) cr.over[g.id + '|' + rel.week] = closedAs(rel);
    }));
  };
  const crOwn = id => {
    const book = cr.rec[id] || {}, keys = Object.keys(book);
    const own = { n: keys.length, crowned: 0, warm: 0, quiet: 0, cold: 0 };
    keys.forEach(k => { const how = book[k] || cr.over[k]; if (how) own[how]++; });
    own.running = own.n - own.crowned - own.warm - own.quiet - own.cold;
    return own;
  };
  const crLook = () => {
    crRoster();
    crOver();
    const rels = {};
    KP.groups(state).forEach(g => (g.releases || []).forEach(rel => { rels[g.id + '|' + rel.week] = rel; }));
    Object.keys(rels).forEach(key => {
      const rel = rels[key];
      if (rel.week === state.week) { cr.sat.forEach(id => { (cr.rec[id] = cr.rec[id] || {})[key] = null; }); yr.eras.push(rel.week); }   // landed this week, under every chair sat as it began; and in the house's year (§139)
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
      const m = /The credit it read: (one|\d+) eras? at [^,.]+(?:, (?:(one|\d+) of them )?closed (with a trophy|warm))?\./.exec(body);
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
  rlLook(false);
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
      // the scout's count as the desk leaves: the desk's own week may have signed someone since the last look
      crRoster();
      { const fl = rlFloor(); if (fl) rl.floor[fl.id] = fl; }
      glWall(() => { KP.foundLabel(state, 'Audit House'); return !!state.founded; }, true);
      founded = true;
    }
    glLook();
    rlLook(false);   // the chairs sat as the week begins, and whoever the desk's own week let go
    rvLook();
    const sheetsAsTheTickBegan = sheetsNow(), chairAsTheTickBegan = gl.chair, trustAsTheTickBegan = state.trust;
    crBegin();
    const weekBefore = state.week;
    KP.advanceWeek(state);
    crLook();
    yrLook();
    nmLook();
    fdLook(weekBefore);
    nwLook(weekBefore);
    rvLook(sheetsAsTheTickBegan);
    // the greenlights (v0.11.37, §129): one the last house gave reads as it did the day the desk moved, and one that
    // was open that day reads set aside; the record lists this desk's own and no other, each with its chair and its end
    glLook();
    rlLook(true);
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
  // the letters that must land (v0.11.44, §137): a decision on the list does not open without its letter, and the letter lands
  deskCount.unannounced(DESK, deskMark).forEach(m => flag(sc.seed, state.week, 'a decision opened unannounced, or its letter was cut: ' + m));
  deskCount.heldCut(DESK, deskMark).forEach(m => flag(sc.seed, state.week, 'a letter the week must hold was cut: ' + m));
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
  YR.due += yr.due; YR.wrote += yr.wrote; YR.landed += yr.landed; YR.lines += yr.lines; YR.words += yr.words; YR.held += yr.held;
  RL.gone += rl.gone; RL.lines += rl.lines; RL.held += rl.held; RL.recs += rl.recs; RL.stamped += rl.stamped; RL.atDesk += rl.atDesk; RL.shut += rl.shut;
  NM.cands += nm.cands; NM.weeks += nm.weeks; NM.turns += nm.turns; NM.beyond += nm.beyond;
  if (nm.cands >= 20 && !nm.beyond) flag(sc.seed, state.week, nm.cands + ' candidates took a meeting and not one under a name beyond the hundred of before');
  FD.wrote += fd.wrote; FD.desk += fd.desk; FD.below += fd.below; if (fd.most > FD.most) FD.most = fd.most;
  NW.weeks += nw.weeks; NW.landed += nw.landed; NW.under += nw.under; NW.kinds += nw.kinds;
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
console.log('the kept place (v0.11.44): ' + NW.weeks + ' weeks wrote a kind its Desk had never shown, with room in the five · in ' + NW.landed + ' of them one landed · ' + NW.under +
  ' letters landed ahead of a higher priority, each alone in its week and of a kind never shown, by this tool’s own note of every letter that reached the inbox · the files’ two counts held to that note every week, ' +
  NW.kinds + ' kinds in all');
console.log('below the fold (v0.11.44): ' + FD.wrote + ' letters written by the week · ' + FD.desk + ' on the Desk, ' + FD.below + ' below the fold, each the week it was written and the week after, by this tool’s own count of the wire · the fold at its fullest held ' + FD.most + ' letters');
console.log('one name, one chair (v0.11.43): ' + NM.cands + ' candidates took a meeting, each held to this tool’s own note of the names it had heard and its own copy of the four hundred · ' + NM.beyond + ' under a name beyond the hundred of before · the four hundred came round ' + NM.turns + ' time' + (NM.turns === 1 ? '' : 's') + ' · ' + NM.weeks + ' weeks of chairs sat, each looked at for two under one name');
console.log('the staff’s year (v0.11.46): ' + YR.due + ' first weeks of a year with a chair sat twelve weeks · ' + YR.wrote + ' letters written, ' + YR.landed + ' landed · ' + YR.lines + ' lines, each under the name, the title and the weeks this tool has seen the chair sat · ' + YR.words + ' words, ' + YR.held + ' held to this tool’s own books of the chair’s year, each to the letter before and to the others of its letter');
console.log('the roll (v0.11.47): ' + RL.gone + ' chairs seen sat and gone, each on the roll the week it went, by this tool’s own note of who sat · ' + RL.lines + ' lines at the careers’ ends, none lost or changed · ' + RL.atDesk + ' credits read the day a chair went at the desk and ' + RL.held + ' weekly reads of a line’s eras, each this tool’s own books · ' + RL.shut + ' weekly reads of a line of a house the desk had left, each shut · ' + RL.recs + ' records, each carrying the room this tool saw sat as its week began · ' + RL.stamped + ' weekly reads of a scout’s name on someone who signed on their watch');
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
