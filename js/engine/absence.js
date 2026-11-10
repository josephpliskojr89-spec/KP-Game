/* The absences, attended (v0.11.18, §109; v0.11.19, §110; v0.11.20, §111).
   Part one: the return.
   §96: "The absences are the purest plan → wait → result loops left." The
   result end of a service was one generic sentence and a window nobody
   could see. Here: the chapter an act is short is a record; "whole again"
   is a ceremony that reads it and names the window's last week; the window
   is a read the group page shows; a letter says when it is closing and a
   letter says when it closed. And a soloist's service is read as what it
   is: the whole act is away, so it is the act's service chapter.
   Part two: the wait. A service has three marks between the gates, read
   from the fandom's side: day 100, when its project gets a name and a
   count; the half, when he writes from the base; and D-100, when the
   countdown turns and the return is said ahead of time.
   Part three: the quiet. A declared hiatus is a bet with two halves, the
   rest and the wait the return converts. Both are a read the card shows,
   and each half says when it is done. A personal break says when she is
   rested. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const nm = p => KP.displayName(p);
  const wk = n => n + ' week' + (n === 1 ? '' : 's');
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const fmt = n => Number(n).toLocaleString('en-US');
  const listAnd = xs => xs.length <= 1 ? (xs[0] || '') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
  const when = w => KP.weekLabel(w).text;

  // the service ledger is military.js's; this module's sums ride on it
  function ledger(state) {
    const led = state.serviceLedger = state.serviceLedger ||
      { plans: 0, together: 0, stagger: 0, notices: 0, enlisted: 0, walls: 0, discharged: 0, returns: 0 };
    ['ceremonies', 'spent', 'closing', 'lapsed', 'soloChapters', 'hundred', 'wrote', 'turn'].forEach(k => { if (led[k] == null) led[k] = 0; });
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
    // the fandom's project (v0.11.19, §110): named at day 100, so a chapter
    // that never reached it closes with no project to count
    const proj = away != null && away >= M.hundredWeeks ? KP.waitProject(state, g, since, state.week, ch && ch.count) : null;
    if (proj) head += ' ' + cap(proj.name) + ' closed at ' + proj.said + '. ' + proj.def.end(projectCtx(g, home.length ? home : [p]));
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

  // ==== part two: the wait (v0.11.19, §110) ==========================================

  // ---- one man's wait, read (pure) ------------------------------------------------
  // Three marks between the gates: day 100, the half and D-100. A service
  // too short to hold them in order (a fixture's, a cut-down file's) has
  // only its gate.
  KP.waitRead = function (state, p) {
    const mil = p && p.flags && p.flags.military;
    if (!mil) return null;
    const M = KP.C.MIL;
    const total = Math.max(1, mil.until - mil.since);
    const half = Math.floor(total / 2);
    const marks = [];
    if (half > M.hundredWeeks && total - M.turnWeeks > half) {
      marks.push({ kind: 'hundred', week: mil.since + M.hundredWeeks });
      marks.push({ kind: 'half', week: mil.since + half });
      marks.push({ kind: 'turn', week: mil.until - M.turnWeeks });
    }
    marks.push({ kind: 'gate', week: mil.until });
    return { since: mil.since, until: mil.until, total,
      served: Math.max(0, Math.min(total, state.week - mil.since)), left: Math.max(0, mil.until - state.week),
      how: mil.how || null, marks,
      next: marks.find(m => m.week > state.week) || marks[marks.length - 1],
      at: marks.filter(m => m.week === state.week).map(m => m.kind) };
  };
  // the next mark, in the page's words
  KP.waitNextWords = function (state, p) {
    const r = KP.waitRead(state, p);
    if (!r) return '';
    const n = r.next, inWk = n.week - state.week;
    const what = { hundred: 'day 100 of the wait', half: KP.fillPro('{pos} letter from the base', p),
      turn: 'the countdown turns', gate: 'the gate' }[n.kind];
    return what + (inWk <= 0 ? ', this week' : ', in ' + wk(inWk));
  };

  // ---- the fandom's project (pure) --------------------------------------------------
  // A fandom runs a wait like a project, and a project has a name and a
  // count. Which one is by hash: the seed, the act, the week the chapter
  // opened. The count is real state: the weeks waited, the act's
  // popularity, the fandom's intensity.
  const PROJECTS = [
    { key: 'letters', name: 'the letter drive', per: 30, unit: 'letter',
      so: c => 'sorted by a mail clerk on the base who has started to recognize the handwriting',
      end: c => 'The last one was handed over at the gate.' },
    { key: 'cranes', name: 'the paper cranes', per: 45, unit: 'crane', plural: true,   // "the paper cranes stand at
      so: c => 'folded in ' + c.color + ' and kept in somebody’s spare room',
      end: c => 'Nobody has decided where they go now.' },
    { key: 'forest', name: 'the forest', per: 3, unit: 'tree',
      so: c => 'planted in ' + c.pos + ' name' + (c.many ? 's' : '') + ' on a hillside none of them have seen',
      end: c => 'It will outlast every contract in the building.' },
    { key: 'rice', name: 'the rice', per: 2, unit: 'sack',
      so: c => 'given in ' + c.pos + ' name' + (c.many ? 's' : '') + ' to a kitchen that knows the name' + (c.many ? 's' : '') + ' by now',
      end: c => 'The kitchen sent a card.' },
  ];
  // `said` is the last count a letter gave (the chapter keeps it): a pile of
  // letters does not shrink because the act had a bad month
  KP.waitProject = function (state, g, since, week, said) {
    if (!g || since == null) return null;
    const w = Math.max(0, (week != null ? week : state.week) - since);
    const P = PROJECTS[Math.floor(KP.hash01([state.seed, g.id, 'waitProject', since].join('|')) * PROJECTS.length) % PROJECTS.length];
    const scale = 1 + (g.popularity || 0) / 20 + ((g.fandom && g.fandom.intensity) || 0) / 20;
    const count = Math.max(1, said || 0, Math.round(w * P.per * scale));
    return { key: P.key, name: P.name, count, said: fmt(count) + ' ' + P.unit + (count === 1 ? '' : 's'), def: P };
  };
  // whose project it is, and whose names are on it
  function projectCtx(g, men) {
    const many = men.length !== 1;
    return { many, pos: many ? 'their' : KP.fillPro('{pos}', men[0]),
      color: g.fandom && g.fandom.color ? g.fandom.color : 'the lightstick’s color' };
  }
  const fandomOf = g => (g.fandom && g.fandom.name ? g.fandom.name + '’s' : 'The fan cafés’');
  const whoOf = men => men.length === 1 ? nm(men[0]) : men.length === 2 ? nm(men[0]) + ' and ' + nm(men[1])
    : 'the ' + (NUM[men.length] || men.length) + ' of them';
  const homeOf = (state, g) => g.members.map(id => state.people[id]).filter(m => m && !KP.inService(m));
  const lastHome = men => men.reduce((w, m) => Math.max(w, m.flags.military.until), 0);

  // ---- day 100 ---------------------------------------------------------------------
  KP.waitHundredText = function (state, g, men, proj) {
    const one = men.length === 1, c = projectCtx(g, men), home = homeOf(state, g);
    return 'The hundredth day of the wait for ' + whoOf(men) + ' fell this week. ' + fandomOf(g) + ' project for it has a name now, ' +
      proj.name + ': ' + proj.said + ' so far, ' + proj.def.so(c) + '. ' +
      (one ? KP.fillPro('{She} is', men[0]) : 'They are') + ' home ' + when(lastHome(men)) +
      (home.length ? ', and ' + g.name + ' works as ' + (NUM[home.length] || home.length) + ' until then.'
        : '. The act waits with ' + (one ? KP.fillPro('{her}', men[0]) : 'them') + '.');
  };

  // ---- the half: his letter from the base ----------------------------------------------
  // Composed from his file: what the act did without him, how he went,
  // whether his papers were left on the desk, and how he carries the company.
  const HEARD = [
    (t, pk) => '{She} heard ‘' + t + '’ on the canteen television and says the room went quiet for it' + (pk ? ', and that {she} knows it peaked at #' + pk + ': somebody on a base always knows' : '') + '.',
    (t, pk) => 'Somebody on the base played ‘' + t + '’ off a phone before {she} had heard it {herself}' + (pk ? ', and told {her} it peaked at #' + pk + ' before {she} could ask' : '') + '.',
  ];
  const ASKS = [
    '{She} asks what the group is working on, and then says not to tell {her}.',
    '{She} asks who has {pos} spot in the formation, and then says {she} does not want to know.',
  ];
  const ALONE = [
    '{She} says {she} has stopped humming {pos} own songs in the washroom, because the others had started to join in.',
    '{She} says nobody on the base knew who {she} was for a month, and that it was the best month.',
  ];
  const TOGETHER = [
    'They are on different bases and have compared notes: the food is the same on all of them.',
    'They are on different bases and write to each other more than they ever spoke in the dorm.',
  ];
  KP.baseLetterText = function (state, g, p, men) {
    const mil = p.flags.military, r = KP.waitRead(state, p);
    const home = g ? homeOf(state, g) : [];
    const head = 'A letter came from the base in ' + nm(p) + '’s handwriting, ' + wk(r.served) + ' in and ' + wk(r.left) + ' to go' +
      (men.length > 1 ? ', for the ' + (NUM[men.length] || men.length) + ' of them' : '') + '.';
    // what the act did without him
    const rel = g && home.length ? (g.releases || []).filter(x => x.week > mil.since).slice(-1)[0] : null;
    const salt = 'baseLetter|' + p.id;
    let heard;
    if (rel) heard = KP.lineFor(state, salt, HEARD.map(f => f(rel.songTitle, rel.chartPeak && rel.chartPeak <= 20 ? rel.chartPeak : null)));
    else if (home.length) heard = KP.lineFor(state, salt, ASKS);
    else heard = KP.lineFor(state, salt, men.length > 1 ? TOGETHER : ALONE);
    // how he went
    const went = mil.how === 'wall' ? ' {She} went at the wall, and writes that the ones who went early are already home. {She} does not make more of it than that.'
      : mil.how === 'now' ? ' {She} went early, and writes that {she} is glad of it on most days.' : '';
    // the papers that sat on the desk: the service stamps it itself, because
    // the ledger's "left waiting" is every door's and not only this one's
    const papers = p.flags.papersUnanswered != null ? ' {She} does not mention the papers that sat on the desk unanswered. {She} does not need to.' : '';
    // how he carries the company
    const st = KP.standingScore(state, p);
    const signs = st >= 3 ? ' {She} signs it with the company’s name before {pos} own.'
      : st > -3 ? ' {She} signs it with {pos} name and the date, the way the base teaches.'
        : ' {She} signs it with {pos} name. It is polite the way a form is polite.';
    const read = home.length ? ' The room read it standing up.' : '';
    return head + ' ' + KP.fillPro(heard + went + papers + signs, p) + read;
  };

  // ---- D-100: the countdown turns --------------------------------------------------------
  KP.waitTurnRead = function (state, g, men) {
    const until = lastHome(men);
    const after = g.members.map(id => state.people[id])
      .filter(m => m && KP.inService(m) && !men.includes(m) && m.flags.military.until > until);
    return { until, after, whole: !after.length, lastUntil: after.length ? lastHome(after) : until };
  };
  KP.waitTurnText = function (state, g, men, proj) {
    const M = KP.C.MIL, one = men.length === 1, t = KP.waitTurnRead(state, g, men);
    const they = one ? KP.fillPro('{she} is', men[0]) : 'they are';
    return 'The countdown accounts turned their counters over this week: a hundred days until ' + whoOf(men) + (one ? ' is' : ' are') +
      ' home, ' + when(t.until) + '. ' + cap(proj.name) + (proj.def.plural ? ' stand at ' : ' stands at ') + proj.said + '.' +
      (t.whole
        ? ' That week ' + (soloAct(g) ? 'the solo desk opens again' : g.name + ' is whole') + ', and a window opens for ' + wk(M.returnWindowWeeks) +
          ': a record locked inside it is THE RETURN.' +
          (homeOf(state, g).length ? ' A record locked before ' + they + ' home is a comeback like any other.'
            : ' Nothing can be locked before then: the record waits for the gate.')
        : ' ' + listAnd(t.after.map(nm)) + (t.after.length === 1 ? ' is' : ' are') + ' still away after that, so the act is not whole until ' + when(t.lastUntil) + '.');
  };

  // ---- the marks of the week: one letter an act, a mark -------------------------------
  function marksOfWeek(state, inbox, roster) {
    const M = KP.C.MIL, led = ledger(state);
    const byAct = new Map();
    roster.forEach(p => {
      const r = KP.waitRead(state, p);
      if (!r || !r.at.length) return;
      const g = KP.groupOf(state, p.id);
      if (!g) return;   // a man with no act has no fandom counting for him
      r.at.forEach(kind => {
        if (kind === 'gate') return;
        const key = g.id + '|' + kind;
        if (!byAct.has(key)) byAct.set(key, { g, kind, men: [] });
        byAct.get(key).men.push(p);
      });
    });
    byAct.forEach(({ g, kind, men }) => {
      const since = g.wait && g.wait.since != null ? g.wait.since : men.reduce((w, m) => Math.min(w, m.flags.military.since), Infinity);
      const proj = KP.waitProject(state, g, since, state.week, g.wait && g.wait.count);
      if (g.wait && kind !== 'half') g.wait.count = proj.count;   // the count a letter gave
      // Each mark is said once: the week it falls in never comes again. So each
      // is critical (§89 B). They shipped normal and high (v0.11.19), and the
      // week's budget cut most of them: nine of eleven day-100 letters, six of
      // eleven from the base, eight of ten turns (v0.11.21, §112, measured
      // over the long haul).
      if (kind === 'hundred') {
        led.hundred++;
        inbox.push({ kind: 'public', ind: 'waitHundred', priority: 'critical', groupId: g.id, personId: men[0].id,
          text: KP.waitHundredText(state, g, men, proj) });
      } else if (kind === 'half') {
        // the leader writes for them if he is among them, else the eldest
        const writer = men.find(m => g.roles && g.roles.leader === m.id) || men.slice().sort((a, b) => b.age - a.age)[0];
        led.wrote++;
        homeOf(state, g).forEach(m => { m.morale = KP.clamp(m.morale + M.halfMorale, 0, 100); });
        writer.history.push({ week: state.week, text: 'Wrote to the company from the base, at the half of the service.' });
        inbox.push({ kind: 'company', ind: 'baseLetter', priority: 'critical', groupId: g.id, personId: writer.id,
          text: KP.baseLetterText(state, g, writer, men) });
      } else if (kind === 'turn') {
        led.turn++;
        inbox.push({ kind: 'public', ind: 'waitTurn', priority: 'critical',
          groupId: g.id, personId: men[0].id, text: KP.waitTurnText(state, g, men, proj) });
      }
    });
  }

  // ==== part three: the quiet (v0.11.20, §111) ========================================

  function quietLedger(state) {
    const led = state.quietLedger = state.quietLedger || {};
    ['rested', 'full', 'breakRested'].forEach(k => { if (led[k] == null) led[k] = 0; });
    return led;
  }
  KP.quietLedger = quietLedger;

  // ---- a declared hiatus, read (pure) ----------------------------------------------
  // What a return announced this week would read, when the bank is full,
  // whether the patience has run out and what that has cost, and whether
  // the rest has done its work. A service chapter is not a bet: it has its
  // own card and its own letters (§109, §110).
  KP.hiatusRead = function (state, g) {
    const hi = g && g.hiatus;
    if (!hi || hi.service) return null;
    const H = KP.C.HIATUS;
    const weeks = state.week - hi.since;
    const graceLeft = H.graceWeeks - (state.week - (hi.graceFrom || hi.since));
    const banked = KP.hiatusBank(weeks);
    let fullAt = H.graceWeeks;
    while (KP.hiatusBank(fullAt) < H.anticipationCap && fullAt < 520) fullAt++;
    const ms = (g.members || []).map(id => state.people[id]).filter(Boolean);
    const tired = ms.length ? ms.reduce((sum, m) => sum + m.fatigue, 0) / ms.length : 0;
    return { weeks, graceLeft, cooling: graceLeft < 0, banked, cap: H.anticipationCap, full: banked >= H.anticipationCap,
      fullWeek: hi.since + fullAt, toFull: Math.max(0, hi.since + fullAt - state.week),
      tired, rested: tired <= H.restedAt,
      cooled: hi.popAtCool != null ? Math.max(0, Math.round((hi.popAtCool - (g.popularity || 0)) * 10) / 10) : null };
  };
  // the bank, in the card's and the letters' words
  KP.hiatusBankWords = function (state, r) {
    return r.banked > 0
      ? 'A return announced this week would read +' + r.banked + ' of a possible +' + r.cap + ' on the release sheet’s return row'
      : 'A return announced this week would read nothing on the release sheet’s return row: only the weeks after the patience runs out are counted';
  };
  KP.hiatusReadWords = function (state, g, r) {
    return KP.hiatusBankWords(state, r) + '. ' +
      (r.full ? 'The bank is full: every week from here only costs.'
        : 'The bank is full ' + when(r.fullWeek) + ', in ' + wk(r.toFull) + '.') +
      (r.cooled != null && r.cooled > 0 ? ' Popularity is down ' + r.cooled + ' since the patience ran out.' : '') +
      ' ' + (r.rested ? 'The rest has done its work.' : 'The rest is still working.');
  };
  KP.hiatusRestedText = function (state, g, r) {
    const H = KP.C.HIATUS;
    return 'The rest has done its work on ' + g.name + ': ' + wk(r.weeks) + ' in, ' +
      (soloAct(g) ? 'the act is' : 'the members are') + ' as rested as a hiatus makes anybody. ' +
      (r.cooling ? 'The patience ran out ' + wk(-r.graceLeft) + ' ago, and the numbers are cooling.'
        : r.graceLeft === 0 ? 'This is the last week of the fandom’s patience.'
          : 'The fandom’s patience holds ' + wk(r.graceLeft) + ' more.') +
      ' What the hiatus buys from here is the wait alone. ' + KP.hiatusBankWords(state, r) +
      (r.full ? ', and that is the most it can.' : ', and the bank is full ' + when(r.fullWeek) + '.');
  };
  KP.hiatusFullText = function (state, g, r) {
    return g.name + '’s wait has banked all it can: +' + r.cap + ' on the release sheet’s return row, ' + wk(r.weeks) +
      ' in. No week after this one adds to it. ' +
      (r.cooled != null && r.cooled > 0 ? 'Popularity is down ' + r.cooled + ' since the patience ran out, and that goes on.' : 'The cooling goes on.') +
      ' From here every week only costs.';
  };

  // ---- a personal break, read (pure) -----------------------------------------------
  // `until` is the week a break a story forced ends on its own clock (scandal.js);
  // a break the desk granted has none, and ends when the desk says
  KP.breakRead = function (state, p) {
    const b = p && p.flags && p.flags.personalHiatus;
    if (!b) return null;
    return { weeks: state.week - b.since, tired: p.fatigue, rested: p.fatigue <= KP.C.MEMBER_DESK.breakRestedAt,
      until: b.forced && p.flags.scandalBreakUntil != null ? p.flags.scandalBreakUntil : null };
  };
  KP.breakRestedText = function (state, p, g, r) {
    const n = g ? g.members.filter(id => id !== p.id).length : 0;
    return KP.fillPro(nm(p) + ' is rested: ' + wk(r.weeks) + ' into the break, {she} is sleeping, and the trainers say it shows.' +
      // a parked act has not gone on without anybody
      (g && !g.hiatus ? ' ' + g.name + ' has gone on as ' + (NUM[n] || n) + ' without {her}.' : '') +
      ' The seat is kept. ' +
      // most breaks in a career are the ones a story forced, and those end on the statement's date
      (r.until != null ? 'The statement that sent {her} away runs until ' + when(r.until) + ', and {she} is back that week. The story chose that calendar; the desk cannot shorten it.'
        : '{She} comes back when the desk ends the break, from {pos} file.'), p);
  };

  // ---- the cost's stamp ------------------------------------------------------------------
  // What the patience running out has cost is counted from the week it ran
  // out, so the stamp is taken on the absence rail, before the hiatus rail
  // takes that week's cooling.
  function coolStampOfWeek(state, groups) {
    groups.forEach(g => {
      const r = KP.hiatusRead(state, g);
      if (r && r.cooling && g.hiatus.popAtCool == null) g.hiatus.popAtCool = g.popularity || 0;
    });
  }

  // ---- the quiet's letters: each half of the bet says when it is done -----------------
  function quietOfWeek(state, inbox, roster, groups) {
    const led = quietLedger(state);
    groups.forEach(g => {
      const r = KP.hiatusRead(state, g);
      if (!r) return;   // an ended act holds no hiatus: the validator's law, not this rail's
      const hi = g.hiatus;
      // a hiatus left over from a service chapter was never this bet (§109): its ceremony said so
      if (hi.graceFrom) return;
      if (r.rested && !hi.restedNoted) {
        hi.restedNoted = true;
        led.rested++;
        // one-shot: the stamp burns here, so the letter must land. As a high
        // letter the week's budget cut one in five of them (measured, 40 careers)
        inbox.push({ kind: 'company', ind: 'hiatusRested', priority: 'critical', groupId: g.id, text: KP.hiatusRestedText(state, g, r) });
      }
      if (r.full && !hi.fullNoted) {
        hi.fullNoted = true;
        led.full++;
        // one-shot: the stamp burns here, so the letter must land
        inbox.push({ kind: 'company', ind: 'hiatusFull', priority: 'critical', groupId: g.id, text: KP.hiatusFullText(state, g, r) });
      }
    });
    roster.forEach(p => {
      const b = p.flags && p.flags.personalHiatus;
      if (!b || b.restedNoted) return;
      const r = KP.breakRead(state, p);
      if (!r || !r.rested) return;
      b.restedNoted = true;
      led.breakRested++;
      const g = KP.groupOf(state, p.id);
      // one-shot, like the rest's letter above: said once, so it must land
      const n = { kind: 'company', ind: 'breakRested', priority: 'critical', personId: p.id, text: KP.breakRestedText(state, p, g, r) };
      if (g) n.groupId = g.id;
      inbox.push(n);
    });
  }

  // ---- the weekly: the chapter and the window -------------------------------------
  KP.registerWeekly('absence', 787, function (state, rng, inbox, roster, groups) {
    const M = KP.C.MIL, led = ledger(state);
    marksOfWeek(state, inbox, roster);
    coolStampOfWeek(state, groups);
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
        // one-shot: the warning has one week to be said in, so it must land (v0.11.21, §112)
        inbox.push({ kind: 'company', ind: 'returnClosing', priority: 'critical', groupId: g.id,
          text: KP.returnClosingText(state, g, r) });
      }
    });
  });

  // The quiet's letters go out after the rails that do the resting (the member
  // desk 788, the hiatus 789). On the absence rail they read the week before
  // its rest, so each came a week after the card or the file already said
  // rested, and the bank's letter gave a cost one week short of the card's.
  KP.registerWeekly('quiet', 789.5, function (state, rng, inbox, roster, groups) {
    quietOfWeek(state, inbox, roster, groups);
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
  KP.onFeedEvent('waitHundred', (state, n, rng) => {
    const g = KP.groupById(state, n.groupId);
    const p = n.personId ? state.people[n.personId] : null;
    if (!g || !p) return null;
    const who = soloAct(g) ? KP.publicGiven(p) : g.name;
    return rng.pick([
      { persona: 'fan', text: 'D+100. a hundred days down. I have learned what a base postal code is and I have opinions about stationery now. ' + who + ' we are fine. we are thriving. send help' },
      { persona: 'stan', text: 'the ' + who + ' wait project hit its hundred-day count today and the spreadsheet has a second tab. nobody asked us to be this organized. nobody could stop us either' },
      { persona: 'casual', text: 'a fandom just posted a hundred-day progress report for waiting. with totals. I respect it the way I respect people who run marathons' },
    ]);
  });
  KP.onFeedEvent('waitTurn', (state, n, rng) => {
    const g = KP.groupById(state, n.groupId);
    const p = n.personId ? state.people[n.personId] : null;
    if (!g || !p) return null;
    const who = soloAct(g) ? KP.publicGiven(p) : g.name;
    return rng.pick([
      { persona: 'fan', text: 'D-100. the counter flipped. I have been counting UP for so long I forgot the number could go down. ' + who + ' see you at the gate' },
      { persona: 'stan', text: 'a hundred days until the ' + who + ' gate photo. the homecoming banner has been proofread four times. the company has one job and it is a date' },
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
