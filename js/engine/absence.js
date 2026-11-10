/* The absences, attended (v0.11.18, §109) — part one: the return.
   §96: "The absences are the purest plan → wait → result loops left." The
   result end of a service was one generic sentence and a window nobody
   could see. Here: the chapter an act is short is a record; "whole again"
   is a ceremony that reads it and names the window's last week; the window
   is a read the group page shows; a letter says when it is closing and a
   letter says when it closed. And a soloist's service is read as what it
   is: the whole act is away, so it is the act's service chapter. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const nm = p => KP.displayName(p);
  const wk = n => n + ' week' + (n === 1 ? '' : 's');
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const when = w => KP.weekLabel(w).text;

  // the service ledger is military.js's; this module's sums ride on it
  function ledger(state) {
    const led = state.serviceLedger = state.serviceLedger ||
      { plans: 0, together: 0, stagger: 0, notices: 0, enlisted: 0, walls: 0, discharged: 0, returns: 0 };
    ['ceremonies', 'spent', 'closing', 'lapsed', 'soloChapters'].forEach(k => { if (led[k] == null) led[k] = 0; });
    return led;
  }
  KP.returnLedger = ledger;

  // one person on the act: the words are a person's, not a group's
  const soloAct = g => !!g && (g.members || []).length === 1;
  KP.soloAct = soloAct;

  // ---- the chapter: from the first one out to the last one home ----------------
  // military.js calls this as each man leaves. The chapter is the stretch
  // an act is short; the ceremony reads it and closes it.
  KP.waitOut = function (state, g, p) {
    if (!g || !p) return;
    if (!g.wait) g.wait = { since: state.week, first: p.id, out: 0 };
    g.wait.out++;
  };

  // ---- a soloist away is the act's service chapter ----------------------------
  // A group that enlists together goes on a service hiatus: the wait is
  // loyal and the hiatus clock does not cool it. A soloist's act had none,
  // so the desk could declare an ordinary hiatus over a man in service and
  // the forgetting ran for the whole of it. The whole act away is a service
  // chapter, once the calendar is clear, whoever decided it.
  KP.soloServiceChapter = function (state, g) {
    if (!g || !g.debuted || g.retiredWeek || !soloAct(g)) return false;
    if (g.prep || g.tour || state.week <= (g.promoUntil || 0)) return false;
    const only = state.people[g.members[0]];
    if (!only || !KP.inService(only)) return false;
    if (g.hiatus && g.hiatus.service) return false;
    g.hiatus = g.hiatus || { since: state.week };
    g.hiatus.service = true;
    ledger(state).soloChapters++;
    return true;
  };

  // ---- the window, read (pure) -------------------------------------------------
  // What the group page, the letters and the lock all agree on.
  KP.returnRead = function (state, g) {
    const rs = g && g.returnStage;
    if (!rs) return null;
    const M = KP.C.MIL;
    const until = rs.until != null ? rs.until : rs.week + M.returnWindowWeeks;
    const left = until - state.week;
    return { since: rs.week, until, left, open: left >= 0,
      closing: left >= 0 && left <= M.returnClosingWeeks,
      banks: M.returnBuildup, worth: KP.returnWorth(), away: rs.away != null ? rs.away : null };
  };
  // What the banked build-up comes to where the player can see it: the
  // release sheet's anticipation row. The build-up itself is never shown,
  // so the letters speak in the sheet's points and not in the engine's 26.
  KP.returnWorth = function () {
    return Math.max(1, Math.round(KP.C.MIL.returnBuildup / KP.C.TEASER.anticipationPer));
  };
  KP.returnWorthWords = function () {
    const w = KP.returnWorth();
    return 'about ' + (w === 1 ? 'a point' : (NUM[w] || w) + ' points') + ' of anticipation on release week';
  };
  // the lock inside the window (debut.js) says so here
  KP.returnSpent = function (state) { ledger(state).spent++; };

  // ---- the ceremony ---------------------------------------------------------------
  // Who came home, how long the act was short, and the window's last week.
  KP.wholeAgainText = function (state, g, p, ch) {
    const M = KP.C.MIL, H = KP.C.HIATUS;
    const since = ch && ch.since != null ? ch.since : null;
    const away = since != null ? state.week - since : null;
    const until = state.week + M.returnWindowWeeks;
    const home = g.members.map(id => state.people[id]).filter(m => m && typeof m.serviceDone === 'number' &&
      (since != null ? m.serviceDone >= since : m.id === p.id));
    const first = ch && ch.first != null ? state.people[ch.first] : null;
    let head;
    if (soloAct(g)) {
      head = nm(p) + ' is home' + (away != null ? KP.fillPro(', ' + wk(away) + ' after {she} went in', p) : '') +
        '. The solo desk is open again.';
    } else if (home.length <= 1) {
      head = g.name + ' is whole again. ' + nm(p) + ' came through the gate this week' +
        (away != null ? KP.fillPro(', ' + wk(away) + ' after {she} went in', p) : '') + '.';
    } else if (home.every(m => m.serviceDone === state.week)) {
      head = g.name + ' is whole again. ' + (home.length === 2 ? 'Both' : 'All ' + (NUM[home.length] || home.length)) +
        ' came through the gate this week' + (away != null ? ', ' + wk(away) + ' after they went in together' : '') + '.';
    } else {
      head = g.name + ' is whole again. ' + nm(p) + ' is the last one home' +
        (away != null ? ', ' + wk(away) + ' after ' + (first && first.id !== p.id ? nm(first) : 'the first of them') + ' went in' : '') + '.';
    }
    const win = ' The next date this company announces is not a comeback, it is a RETURN. Lock a record by ' + when(until) +
      ' and the wait the fandom saved up goes into its build-up, worth ' + KP.returnWorthWords() + '. After that week it is a comeback like any other.';
    // a service chapter ends on the ordinary clock (military.js restarts it this
    // week), and the chapter itself converts like any declared hiatus (hiatus.js)
    const clock = g.hiatus && g.hiatus.graceFrom === state.week
      ? ' The chapter itself converts whenever the return record lands, the way a declared hiatus does. But the wait is an ordinary hiatus from today: the fandom’s patience holds ' +
        wk(H.graceWeeks) + ', and after that the numbers cool until a date is announced.'
      : '';
    return head + win + clock;
  };
  KP.wholeAgain = function (state, g, p, inbox) {
    const M = KP.C.MIL;
    const ch = g.wait || null;
    const text = KP.wholeAgainText(state, g, p, ch);
    // military.js stamped { week }; the window gets its last week and the chapter's length
    g.returnStage.until = state.week + M.returnWindowWeeks;
    if (ch && ch.since != null) g.returnStage.away = state.week - ch.since;
    delete g.wait;
    ledger(state).ceremonies++;
    // one-shot: the window opens whether or not the letter survives the week, so it must
    inbox.push({ kind: 'company', ind: 'wholeAgain', priority: 'critical', groupId: g.id, personId: p.id, text });
  };

  // ---- the gate letter for one person ---------------------------------------------
  // "met at the gate by managers, members, and a coffee truck" is a group's sentence
  KP.gateLine = function (state, p, g) {
    return (g && !soloAct(g)) ? 'managers, members, and a fan-organized coffee truck'
      : KP.fillPro('{pos} managers and a fan-organized coffee truck', p);
  };

  // ---- the window's two letters (pure) -------------------------------------------
  KP.returnClosingText = function (state, g, r) {
    return cap(String(NUM[r.left] || r.left)) + (r.left === 1 ? ' week is' : ' weeks are') + ' left on ' + g.name +
      '’s return window. A record locked by ' + when(r.until) + ' is THE RETURN, and the wait the fandom saved up goes into its build-up.' +
      (g.prep ? ' The record in production was locked before the gate, so it is not the return.' : '') +
      ' After that week the banner comes down and the next record is a comeback like any other.';
  };
  KP.returnLapsedText = function (state, g) {
    return 'The return window for ' + g.name + ' closed this week. It stood open ' + wk(KP.C.MIL.returnWindowWeeks) +
      ' after the gate and no record was locked inside it. The banner the fandom kept for it came down. The next record is a comeback like any other: its build-up starts from nothing.';
  };

  // ---- the weekly: the chapter and the window -------------------------------------
  KP.registerWeekly('absence', 787, function (state, rng, inbox, roster, groups) {
    const M = KP.C.MIL, led = ledger(state);
    groups.forEach(g => {
      KP.soloServiceChapter(state, g);
      const r = KP.returnRead(state, g);
      if (!r) return;
      // an act that ended holds no window
      if (g.retiredWeek || !g.members.length) { delete g.returnStage; return; }
      if (!r.open) {
        delete g.returnStage;
        led.lapsed++;
        // one-shot: the stamp burns here, so the letter must land
        inbox.push({ kind: 'company', ind: 'returnLapsed', priority: 'critical', groupId: g.id,
          text: KP.returnLapsedText(state, g) });
        return;
      }
      if (r.left === M.returnClosingWeeks) {
        led.closing++;
        inbox.push({ kind: 'company', ind: 'returnClosing', priority: 'high', groupId: g.id,
          text: KP.returnClosingText(state, g, r) });
      }
    });
  });

  // ---- the timeline ----------------------------------------------------------------
  KP.onFeedEvent('wholeAgain', (state, n, rng) => {
    const g = KP.groupById(state, n.groupId);
    if (!g) return null;
    const p = n.personId ? state.people[n.personId] : null;
    const who = soloAct(g) && p ? KP.publicGiven(p) : g.name;
    return rng.pick([
      { persona: 'fan', text: who + (soloAct(g) ? ' is HOME' : ' is WHOLE') + '. I kept a countdown on my lock screen for this and now I do not know what to put there. the next announcement is the one we saved up for' },
      { persona: 'stan', text: 'reminder that the first date after the gate is not a comeback, it is a RETURN, and ' + who + ' stans have been budgeting for it since the haircut' },
      { persona: 'casual', text: 'the ' + who + ' fans waited the whole service and are now refreshing one company account in shifts. give them a date before somebody faints' },
    ]);
  });
  KP.onFeedEvent('returnLapsed', (state, n, rng) => {
    const g = KP.groupById(state, n.groupId);
    if (!g) return null;
    return rng.pick([
      { persona: 'fan', text: 'we waited through the whole service for ' + g.name + ' and then waited half a year more for a date. the banner is in a drawer now. I am not angry. I am tired' },
      { persona: 'stan', text: 'the ' + g.name + ' homecoming project wound itself down this week with a thank-you post and no date to put on it. that is not how any of us pictured the end of the wait' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
