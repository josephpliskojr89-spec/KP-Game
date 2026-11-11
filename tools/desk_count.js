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
  // the label's birthday (§128): once a year, at a founded label
  'labelBirthday',
  // a call from outside left unanswered (§133): the chair is gone, said once
  'seatLapsed',
  // a chair's yearly word (§134): once a year, the week it was taken
  'seatYear',
];

function watch(KP) {
  const T = { written: 0, landed: 0, kinds: {}, weeks: 0, loudest: 0, off: false };
  const trim = KP.trimWeekNotes;
  KP.trimWeekNotes = function (notes) {
    const kept = trim.apply(this, arguments);
    if (T.off) return kept;
    const set = new Set(kept);
    let must = 0;
    notes.forEach(n => {
      if (n.spotlight || n.feedOnly) return;
      const k = n.ind || ('kind:' + (n.kind || '?'));
      const e = T.kinds[k] || (T.kinds[k] = { written: 0, landed: 0 });
      e.written++; T.written++;
      if (set.has(n)) { e.landed++; T.landed++; }
      if (n.priority === 'critical') must++;
    });
    T.weeks++;
    if (must > T.loudest) T.loudest = must;
    return kept;
  };
  return T;
}

// a snapshot, and the counts since one (a scenario's own share of a run)
function mark(T) {
  const m = {};
  Object.keys(T.kinds).forEach(k => { m[k] = { written: T.kinds[k].written, landed: T.kinds[k].landed }; });
  return m;
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
  return out;
}

module.exports = { ONE_SHOTS, watch, mark, since, cutOneShots, rareAndCut, lines };
