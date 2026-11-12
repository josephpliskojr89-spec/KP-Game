/* The Desk, counted (v0.11.21, §112).
   The suites read the week's wire before the trim (§99). That is right for
   a suite and wrong for a census: a letter can pass every check and never
   reach the Desk. This wraps the kernel's one trim and counts, by kind,
   what the week wrote and what landed. The census and the long haul print
   it, and a one-shot letter that was written and cut is a violation.

   Only the week's letters are counted. A letter an action writes (KP.note)
   is delivered at once and never meets the budget. */
'use strict';

// Said once: its stamp burns, or the week it belongs to never comes again.
// The law (§89 B) makes such a letter critical. suite_131 holds each of
// these to it at its source; the tools hold it to it at the Desk.
const ONE_SHOTS = [
  // the absences (§109, §110, §111)
  'wholeAgain', 'returnClosing', 'returnLapsed',
  'waitHundred', 'baseLetter', 'waitTurn',
  'hiatusRested', 'hiatusFull', 'breakRested', 'hiatusCooling',
  // a departed artist's next chapter (§103)
  'acrossSigned', 'acrossDebut', 'alumAfter',
  // the met mandate (§96 wiring), the year's sheet (§107), the year's ranking (§113)
  'mandateMet', 'evalYear', 'powerRanking',
  // the ceremonies of the road and the last stage (§98, §101)
  'tourEnd', 'festHeadline', 'lastStage',
  // the truce (§117): a head calls about it once in two years, and it runs out once
  'truceCall', 'truceRan',
  // her own questions (§119): how a promise to the executive ended, said once
  'execOwnMet', 'execOwnMissed',
  // the annual review (§120): once a year, when the directors have gone
  'annualReview',
  // the year's close (§124): once a year, the company to itself
  'yearEnd',
  // a house's milestone birthday (§128, §141): its first, and every fifth after
  'labelBirthday',
  // a call from outside left unanswered (§133): the chair is gone, said once
  'seatLapsed',
  // and a road manager's (§145): the van has a new driver, and the letter says what the silence did
  'vanLapsed',
  // a chair's yearly word (§134): once a year, the week it was taken
  'seatYear',
];

// A decision that does not open unannounced (v0.11.44, §137; the owner's
// ruling, §136). Each of these scenes has its door in the week's tick, and a
// letter stands beside it that names it (`opens`). The kernel holds such a
// letter to the Desk whatever the week holds. The tools hold it here, by
// their own note of the scenes the week opened: an opening with no letter
// written beside it, or with its letter cut, is a violation.
const ANNOUNCED = [
  // the people who come and go (§79, §136: 23 and 24)
  'theInterview', 'seatPoach',
  // offers and invitations with a clock on them
  'promoOffer', 'festivalInvite', 'partnerDeal', 'theOffer', 'seasonInvite', 'distributorCall', 'sponsorSolo', 'fanclubOpen', 'termSheet', 'globalJV',
  // paper that falls due
  'traineeRenewal', 'renewal', 'servicePlan', 'enlistPapers', 'clauseCall', 'redInk', 'lastStatement',
  // the room and the people in it
  'awardNight', 'unsanctionedLive', 'fanTruck', 'theDiagnosis', 'agingOutTalk', 'traineeQuit', 'seasonEdit',
  // upstairs, and across the street
  'execQuestion', 'boardSeason', 'petProject', 'newChair', 'theTruce',
];

function watch(KP) {
  const T = { written: 0, landed: 0, kinds: {}, weeks: 0, loudest: 0, off: false,
    held: { written: 0, landed: 0 }, health: { written: 0, landed: 0 }, opened: {}, tick: null, most: 0 };
  // the scenes the week itself opens: noted from the tick's start to its trim. A scene a player's answer opens
  // is no part of this: its letter is delivered at once and never meets the budget
  const adv = KP.advanceWeek;
  KP.advanceWeek = function () { T.tick = []; try { return adv.apply(this, arguments); } finally { T.tick = null; } };
  const open = KP.openScene;
  KP.openScene = function (state, sc) { if (T.tick && sc && sc.kind) T.tick.push(sc.kind); return open.apply(this, arguments); };
  const urgent = n => n.kind === 'health' && (n.priority === 'high' || n.priority === 'critical' || (!n.priority && n.urgent));
  const trim = KP.trimWeekNotes;
  KP.trimWeekNotes = function (notes) {
    const kept = trim.apply(this, arguments);
    if (T.off) return kept;
    const set = new Set(kept);
    let must = 0, landed = 0;
    const said = {}, got = {};
    notes.forEach(n => {
      if (n.spotlight || n.feedOnly) return;
      const k = n.ind || ('kind:' + (n.kind || '?'));
      const e = T.kinds[k] || (T.kinds[k] = { written: 0, landed: 0 });
      e.written++; T.written++;
      if (n.priority === 'high' || (!n.priority && n.urgent)) e.high = (e.high || 0) + 1;
      if (set.has(n)) { e.landed++; T.landed++; landed++; }
      if (n.priority === 'critical') must++;
      if (n.opens) { T.held.written++; said[n.opens] = (said[n.opens] || 0) + 1; if (set.has(n)) { T.held.landed++; got[n.opens] = (got[n.opens] || 0) + 1; } }
      if (urgent(n)) { T.health.written++; if (set.has(n)) T.health.landed++; }
    });
    // each scene the week opened, against the letters written beside it and the ones that landed
    const by = {};
    (T.tick || []).forEach(kind => { by[kind] = (by[kind] || 0) + 1; });
    Object.keys(by).forEach(kind => {
      const e = T.opened[kind] || (T.opened[kind] = { opened: 0, said: 0, landed: 0 });
      e.opened += by[kind]; e.said += Math.min(by[kind], said[kind] || 0); e.landed += Math.min(by[kind], got[kind] || 0);
    });
    T.weeks++;
    if (must > T.loudest) T.loudest = must;
    if (landed > T.most) T.most = landed;
    return kept;
  };
  return T;
}

// a snapshot, and the counts since one (a scenario's own share of a run)
function mark(T) {
  const m = {};
  Object.keys(T.kinds).forEach(k => { m[k] = { written: T.kinds[k].written, landed: T.kinds[k].landed }; });
  Object.defineProperty(m, 'opened', { value: JSON.parse(JSON.stringify(T.opened || {})), enumerable: false });
  Object.defineProperty(m, 'held', { value: JSON.parse(JSON.stringify([T.held || { written: 0, landed: 0 }, T.health || { written: 0, landed: 0 }])), enumerable: false });
  return m;
}
// a letter the week must hold that was written and did not land: each is a violation
function heldCut(T, m) {
  const was = (m && m.held) || [{ written: 0, landed: 0 }, { written: 0, landed: 0 }];
  const now = [T.held || { written: 0, landed: 0 }, T.health || { written: 0, landed: 0 }];
  return ['letters that open a decision', 'urgent health notices'].map((what, i) => ({ what, w: now[i].written - was[i].written, l: now[i].landed - was[i].landed }))
    .filter(x => x.l < x.w).map(x => x.what + ' written ' + x.w + ', landed ' + x.l);
}
// a kind the week mostly writes at high, written a hundred times or more, that lands less than one time in four:
// the tie-break exists so that no such kind starves behind the systems that run before it (§112, §137)
const STARVED_UNDER = 0.25, STARVED_LEAST = 100;
function starved(T) {
  return Object.keys(T.kinds).map(k => Object.assign({ k }, T.kinds[k]))
    .filter(e => e.written >= STARVED_LEAST && (e.high || 0) * 2 >= e.written && e.landed / e.written < STARVED_UNDER)
    .sort((a, b) => a.landed / a.written - b.landed / b.written)
    .map(e => e.k + ' landed ' + e.landed + ' of ' + e.written);
}
// a kind written a hundred times or more that lands less than one time in ten, whatever its priority. A kind the
// Desk has never shown goes first (§137, the ruling's first clause), so a kind a career is written now and then is
// not buried under the ones it is shown every week
const BURIED_UNDER = 0.10;
function buried(T) {
  return Object.keys(T.kinds).map(k => Object.assign({ k }, T.kinds[k]))
    .filter(e => e.written >= STARVED_LEAST && e.landed / e.written < BURIED_UNDER)
    .sort((a, b) => a.landed / a.written - b.landed / b.written)
    .map(e => e.k + ' landed ' + e.landed + ' of ' + e.written);
}
// the decisions the week opened since a snapshot, by kind
function openedSince(T, m) {
  const was = (m && m.opened) || {};
  const out = {};
  Object.keys(T.opened || {}).forEach(k => { const e = T.opened[k], w = was[k] || { opened: 0, said: 0, landed: 0 };
    out[k] = { opened: e.opened - w.opened, said: e.said - w.said, landed: e.landed - w.landed }; });
  return out;
}
// a decision on the list that opened with no letter beside it, or whose letter was cut: each is a violation
function unannounced(T, m) {
  const o = openedSince(T, m);
  return ANNOUNCED.filter(k => o[k] && (o[k].said < o[k].opened || o[k].landed < o[k].said))
    .map(k => k + ' opened ' + o[k].opened + ', said ' + o[k].said + ', landed ' + o[k].landed);
}
function since(T, m, kind) {
  const e = T.kinds[kind] || { written: 0, landed: 0 };
  const was = (m && m[kind]) || { written: 0, landed: 0 };
  return { written: e.written - was.written, landed: e.landed - was.landed };
}

// one-shot letters that were written and did not land: each is a violation
function cutOneShots(T, m) {
  return ONE_SHOTS.map(k => ({ k, c: since(T, m, k) })).filter(x => x.c.landed < x.c.written)
    .map(x => x.k + ' written ' + x.c.written + ', landed ' + x.c.landed);
}

// kinds a year of play writes about once or less, cut a quarter of the time or more
const RARE_PER_YEAR = 1.1;
function rareAndCut(T, least) {
  const years = Math.max(1, T.weeks / 52);
  return Object.keys(T.kinds).map(k => Object.assign({ k }, T.kinds[k]))
    .filter(e => e.written >= (least || 20) && e.written / years <= RARE_PER_YEAR && (e.written - e.landed) / e.written >= 0.25)
    .sort((a, b) => (b.written - b.landed) / b.written - (a.written - a.landed) / a.written || b.written - a.written || (a.k < b.k ? -1 : 1));
}

function lines(T, least) {
  const cut = T.written - T.landed;
  const rare = rareAndCut(T, least);
  const out = ['the Desk: ' + T.written + ' letters written by the week · ' + T.landed + ' landed · ' +
    (T.written ? Math.round(100 * cut / T.written) : 0) + '% cut by the week’s budget · the most critical letters in one week ' + T.loudest];
  out.push('rare and cut (a year of play writes it about once or less; a quarter or more never land): ' +
    (rare.length ? rare.slice(0, 14).map(e => e.k + ' ' + (e.written - e.landed) + '/' + e.written).join(' · ') + (rare.length > 14 ? ' · and ' + (rare.length - 14) + ' more' : '') : 'none'));
  // the letters the week cannot cut though they are not critical (v0.11.44, §137)
  // (a count kept by hand, with none of these books, reads as nothing held and nothing opened)
  const opened = T.opened || {}, held = T.held || { written: 0, landed: 0 }, health = T.health || { written: 0, landed: 0 };
  const o = Object.keys(opened).map(k => opened[k]);
  const sum = f => o.reduce((n, e) => n + f(e), 0);
  const listed = ANNOUNCED.map(k => opened[k]).filter(Boolean);
  out.push('held to the Desk: ' + held.written + ' letters that open a decision, ' + held.landed + ' landed · ' + health.written + ' urgent health notices, ' + health.landed +
    ' landed · the week opened ' + sum(e => e.opened) + ' decisions, ' + sum(e => e.said) + ' with a letter beside them · of the ' + ANNOUNCED.length + ' kinds that never open unannounced, ' +
    listed.reduce((n, e) => n + e.opened, 0) + ' opened, ' + listed.reduce((n, e) => n + e.landed, 0) + ' said and landed · the most letters landed in one week ' + (T.most || 0));
  return out;
}

module.exports = { ONE_SHOTS, ANNOUNCED, watch, mark, since, openedSince, unannounced, heldCut, starved, buried, cutOneShots, rareAndCut, lines };
