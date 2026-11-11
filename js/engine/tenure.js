/* Time takes its share (v0.9.32, §39 slot 12 — audit A4 + B4 +
   succession + the founder's board). Every anti-saturation clock in
   one release: SENESCENCE (age bites training and recovery, and pays
   the stage back in floor), TRUST DRIFT (devotion above the bar
   decays into expectation), EXECUTIVE SUCCESSION (chairs have eras;
   the record transfers, the devotion does not — prove it again), and
   THE FOUNDER'S BOARD (the founded label answers to seats with
   names). The whole module is hash-timed and consumes NO rng: worlds
   fork byte-identical through every clock. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.timeLedger = state.timeLedger ||
      { senesced: 0, driftWeeks: 0, successions: 0, receipts: 0, cleanSlates: 0,
        boardSeated: 0, boardMemos: 0, boardConfidence: 0 };
    return state.timeLedger;
  }

  // ---- senescence: the body keeps a different ledger --------------------
  // Words never meters; care always. The mechanics are three quiet
  // multipliers — growth (development.js), recovery (sim.js), and the
  // stage-IQ floor (person.js derived) — and one warm note at the line.
  KP.ageGrowthMult = function (p) {
    const S = KP.C.TIME.SENESCE;
    if ((p.age || 0) < S.at) return 1;
    return Math.max(S.growthFloor, 1 - (p.age - S.at) * S.growthPerYear);
  };
  KP.ageRecoveryMult = function (p) {
    const S = KP.C.TIME.SENESCE;
    if ((p.age || 0) < S.at) return 1;
    return Math.max(S.recoveryFloor, 1 - (p.age - S.at) * S.recoveryPerYear);
  };
  KP.stageIQ = function (p) {
    const S = KP.C.TIME.SENESCE;
    return Math.min(S.stageIQCap, Math.max(0, (p.age || 0) - S.at) * S.stageIQPerYear);
  };

  // ---- the written record (v0.11.30, §122) ------------------------------
  // What no marker keeps: a chair before the last one, the red weeks, the
  // breakthrough, the night of this desk's first trophy. The rail writes a
  // mark as it fires, and the file below reads it. A mark is a week and
  // words: it names what it is about and needs nothing still on the state.
  // The record is the company's. A founding or a last statement closes it.
  const MARK_KINDS = ['chair', 'trophy', 'breakthrough', 'red', 'redCleared'];
  KP.fileMarkKinds = () => MARK_KINDS.slice();
  KP.fileMarks = function (state) { return state.annals || []; };
  KP.fileMark = function (state, kind, data) {
    if (!MARK_KINDS.includes(kind)) throw new Error('tenure: fileMark of unknown kind "' + kind + '"');
    state.annals = state.annals || [];
    const mark = Object.assign({ week: state.week, kind }, data || {});
    state.annals.push(mark);
    return mark;
  };

  // ---- the company's own file (v0.11.29, §121) ---------------------------
  // The company had no history of its own: every first was a letter, read
  // once and gone. Most of it is still on the state, in the markers the
  // rails leave behind: a debut week, the first trophy, a record's peak,
  // the honors, the settlement, the last bow, the founding, the fold, the
  // chair. The file is READ off them, and off the written record above for
  // what no marker keeps. Reading it writes nothing. Weeks before this
  // desk's own are the company's past.
  KP.deskSince = function (state) { return state.chapterSince || (state.founded && state.founded.week) || 1; };
  const FILE_ORDER = ['fold', 'desk', 'chair', 'debut', 'breakthrough', 'numberOne', 'trophy', 'award', 'daesang', 'settlement', 'red', 'redCleared', 'lastBow'];
  const honorWeek = h => (h.year - 1) * KP.C.WEEKS_PER_YEAR + KP.C.AWARDS.ceremonyWeek;   // an honor is dated by its ceremony
  const records = (state, test) => KP.groups(state)
    .reduce((all, g) => all.concat((g.releases || []).filter(test).map(r => ({ r, g }))), [])
    .sort((a, b) => a.r.week - b.r.week || (a.g.id < b.g.id ? -1 : 1));
  const RED_WORD = { 2: 'the staff meeting', 3: 'the creditors’ letters', 4: 'the final notice' };
  // an old file (migration 0.11.30): the marks its markers can still prove.
  // The chair of the day, when she sat down after the desk did; the
  // breakthrough; and this desk's first trophy as the file dated it until
  // now, by the record that won it.
  KP.fileBackfill = function (state) {
    const since = KP.deskSince(state);
    const marks = [];
    const mark = (week, kind, data) => marks.push(Object.assign({ week, kind }, data));
    if (!state.founded && state.executive.since > since) mark(state.executive.since, 'chair', { name: state.executive.name });
    const broke = KP.groups(state).filter(g => g.eraBreakthrough >= since)
      .sort((a, b) => a.eraBreakthrough - b.eraBreakthrough || (a.id < b.id ? -1 : 1))[0];
    if (broke) {
      const rec = (broke.releases || []).find(r => r.week === broke.eraBreakthrough);
      mark(broke.eraBreakthrough, 'breakthrough', { groupId: broke.id, name: broke.name, title: rec ? rec.songTitle : null });
    }
    if (state.firstShowWinWeek < since) {
      const won = records(state, r => r.week >= since && r.trophies > 0)[0];
      if (won) mark(won.r.week, 'trophy', { groupId: won.g.id, name: won.g.name, title: won.r.songTitle, fromRecord: true });
    }
    state.annals = marks.sort((a, b) => a.week - b.week);
    return state.annals;
  };
  // who sat in the chair in a given week, as far as the written record
  // proves it (migration 0.11.37, §129). No mark: nobody has changed chairs
  // under this desk. A mark in that same week proves nothing, since two
  // people sat there that week. Before the first mark it is the one that
  // mark says had held the chair, and an old file's mark may not say.
  KP.chairProven = function (state, week) {
    const marks = KP.fileMarks(state).filter(m => m.kind === 'chair');
    if (!marks.length) return state.executive.name;
    if (marks.some(m => m.week === week)) return null;
    const last = marks.filter(m => m.week < week).pop();
    return last ? last.name : marks[0].after || null;
  };
  // a founding before v0.11.30 left the old house's firsts on the new
  // label, so its own were never firsts (migration 0.11.30). An old file
  // is put right as far as its markers go: the label's first trophy by the
  // record that won it, its first daesang by the honor
  KP.fileFoundedFirsts = function (state) {
    if (!state.founded) return state;
    const since = KP.deskSince(state);
    if (state.firstShowWinWeek && state.firstShowWinWeek < since) {
      const won = records(state, r => r.trophies > 0)[0];   // every record at a founded label is its own
      state.firstShowWinWeek = won ? won.r.week : 0;
    }
    if (state.daesangWonYear && honorWeek({ year: state.daesangWonYear }) < since) {
      const years = KP.groups(state).reduce((all, g) => all.concat((g.honors || []).filter(h => h.category === 'daesang').map(h => h.year)), [])
        .sort((a, b) => a - b);
      if (years.length) state.daesangWonYear = years[0]; else delete state.daesangWonYear;
    }
    return state;
  };
  // what the manager is called: what the file proves under this desk
  KP.managerTitle = function (state) {
    if (state.founded) return 'Founder';
    const since = KP.deskSince(state);
    const honors = KP.groups(state).reduce((all, g) => all.concat(g.honors || []), []).filter(h => honorWeek(h) >= since);
    if (honors.some(h => h.category === 'daesang')) return 'Executive Producer';
    if (honors.length) return 'Head of A&R';
    if (KP.groups(state).some(g => g.debutWeek >= since)) return 'Senior A&R Manager';
    return 'A&R Manager';
  };
  KP.companyFile = function (state) {
    const A = KP.C.AWARDS;
    const since = KP.deskSince(state);
    const ch = [];
    const add = (week, kind, text) => ch.push({ week, kind, text, before: week < since });
    add(since, 'desk', state.founded
      ? state.company.name + ' opened its doors' + (state.founded.from ? ', out of ' + state.founded.from : '') + '.'
      : 'You took the A&R desk at ' + state.company.name + '.');
    KP.groups(state).forEach(g => {
      if (g.debutWeek == null) return;   // a lineup that never debuted has no chapter
      const first = (g.releases || []).find(r => r.week === g.debutWeek);
      add(g.debutWeek, 'debut', g.name + ' debuted' + (first ? ' with “' + first.songTitle + '”' : '') + '.');
      (g.honors || []).forEach(h => add(honorWeek(h), h.category === 'daesang' ? 'daesang' : 'award',
        g.name + ' took ' + (h.category === 'daesang' ? 'the daesang, the grand prize of the year' : A.LABELS[h.category]) + '.'));
      if (g.recoup && g.recoup.settledWeek != null) add(g.recoup.settledWeek, 'settlement', g.name + ' paid back everything the company had spent on them. From that week their share was theirs.');
      if (g.retiredWeek) add(g.retiredWeek, 'lastBow', g.name + ' took a last bow.');
    });
    // the firsts: the company's own, and this desk's when the company's came before it
    const ones = records(state, r => r.chartPeak === 1);
    const says = x => '“' + x.r.songTitle + '” by ' + x.g.name + ' went to number one on the scene chart: ';
    if (ones.length) add(ones[0].r.week, 'numberOne', says(ones[0]) + 'the company’s first.');
    const mine = ones.find(x => x.r.week >= since);
    if (mine && mine !== ones[0]) add(mine.r.week, 'numberOne', says(mine) + 'the first under this desk.');
    // the first trophy. The marker says when the company's was won; the mark
    // says whose night this desk's was. When they are the same night it is
    // said once, by the mark.
    const marks = KP.fileMarks(state);
    const won = marks.find(m => m.kind === 'trophy');
    const first = state.firstShowWinWeek;
    if (first && !(won && won.week === first)) add(first, 'trophy', 'The first music-show trophy in the company’s history.');
    if (won) add(won.week, 'trophy', (won.fromRecord
      ? '“' + won.title + '” by ' + won.name + ' came out, and won a music-show trophy: '
      : won.name + ' won ' + won.show + (won.title ? ' with “' + won.title + '”' : '') + ': ') +
      (first && first < won.week ? 'the first under this desk.' : 'the first music-show trophy in the company’s history.'));
    ((state.estate && state.estate.folded) || []).forEach(f => add(f.week, 'fold', f.name + ' was dissolved.'));
    // what only the written record keeps
    marks.forEach(m => {
      if (m.kind === 'chair') add(m.week, 'chair', m.name + ' took the chair.' + (m.after ? ' ' + m.after + ' had held it ' + m.years + ' years.' : ''));
      if (m.kind === 'breakthrough') add(m.week, 'breakthrough', 'The breakthrough: ' + (m.title ? '“' + m.title + '” by ' : '') + m.name + ' charted from a label nobody had heard of.');
      if (m.kind === 'red') add(m.week, 'red', 'The red weeks. The company fell far enough behind on what it owed that the staff held a meeting nobody called.');
      if (m.kind === 'redCleared') add(m.week, 'redCleared', 'The arrears cleared. The red weeks had gone as far as ' + RED_WORD[m.rung] + '.');
    });
    ch.sort((a, b) => a.week - b.week || FILE_ORDER.indexOf(a.kind) - FILE_ORDER.indexOf(b.kind) || (a.text < b.text ? -1 : 1));
    return { name: state.company.name, short: state.company.short, since,
      manager: { name: state.player.name, title: KP.managerTitle(state), weeks: state.week - since }, chapters: ch };
  };

  // ---- the year's close (v0.11.32, §124) --------------------------------
  // In the last week of the year the company writes to itself: the year's
  // headline, the work, the people, the books. The tallies are READ off the
  // state, for this year or any year before it. Two things are kept as
  // they happen, because nothing else holds them: what came in (the flows
  // add it up) and the till the year opened with. A closed year is filed,
  // and the company's page lists the last twelve.
  KP.yearLedger = function (state) {
    state.yearLedger = state.yearLedger || { took: 0, open: { week: state.week, budget: state.budget } };
    return state.yearLedger;
  };
  const HEADLINE = ['daesang', 'award', 'numberOne', 'trophy', 'breakthrough', 'debut', 'settlement', 'chair', 'lastBow', 'redCleared', 'red'];
  KP.yearAccount = function (state, year) {
    const Y = KP.C.WEEKS_PER_YEAR;
    const now = Math.ceil(state.week / Y);
    const y = year || now;
    const open = Math.max((y - 1) * Y, KP.deskSince(state) - 1), close = Math.min(y * Y, state.week);   // the year is the weeks after `open`, up to `close`
    const inYear = w => w > open && w <= close;
    const recs = records(state, r => inYear(r.week));
    const peaks = recs.map(x => x.r.chartPeak).filter(p => p >= 1);
    const groups = KP.groups(state);
    const honors = groups.reduce((all, g) => all.concat((g.honors || []).filter(h => inYear(honorWeek(h)))), []);
    const short = state.company.short;
    const moved = kinds => Object.keys(state.people).filter(id =>
      (state.people[id].chapters || []).some(ch => kinds.includes(ch.kind) && ch.co === short && inYear(ch.week))).length;
    const chapters = KP.companyFile(state).chapters.filter(c => inYear(c.week) && c.kind !== 'desk' && c.kind !== 'fold');
    const head = HEADLINE.map(k => chapters.filter(c => c.kind === k).pop()).filter(Boolean)[0];
    // the books are this year's only, and only when they opened with the year
    const led = y === now ? state.yearLedger : null;
    const whole = !!led && led.open.week >= open && led.open.week <= open + 1;
    return { year: y, week: close,
      records: recs.length, best: peaks.length ? Math.min.apply(null, peaks) : null,
      trophies: recs.reduce((n, x) => n + (x.r.trophies || 0), 0),
      honors: honors.length, daesang: honors.some(h => h.category === 'daesang'),
      debuts: groups.filter(g => inYear(g.debutWeek)).length,
      bows: groups.filter(g => inYear(g.retiredWeek)).length,
      signed: moved(['signed']), left: moved(['released', 'departed']),
      chapters: chapters.length, headline: head ? head.text : null,
      till: y === now ? Math.round(state.budget) : null,
      was: whole ? Math.round(led.open.budget) : null, took: whole ? Math.round(led.took) : null };
  };
  const many = (n, one, more) => (n === 0 ? 'no ' + more : n === 1 ? 'one ' + one : n + ' ' + more);
  // the letter: an opening the company did not use last year, then four things in a fixed order
  KP.yearLetter = function (state, a, last) {
    const name = state.company.name;
    const lines = [
      'The year closes, and ' + name + ' writes to itself, as it does once a year.',
      name + ', to its own file, in the last week of the year.',
      'The last week of the year. ' + name + ' sets it down for the file.',
    ];
    const opening = KP.lineFor(state, 'yearEnd', lines, last);
    const people = [a.debuts ? many(a.debuts, 'act', 'acts') + ' debuted' : null, a.signed ? a.signed + ' signed' : null, a.left ? a.left + ' left' : null,
      a.bows ? many(a.bows, 'act', 'acts') + ' took a last bow' : null].filter(Boolean);
    // the sum is given only when it adds up: a till that gained more than came in was fed from outside the books
    const sums = a.took != null && a.took >= a.till - a.was;
    const moved = a.was == null ? '' : ', ' + (a.till > a.was ? 'up ' + (a.till - a.was) : a.till < a.was ? 'down ' + (a.was - a.till) : 'where it opened');
    return { line: lines.indexOf(opening), text: [
      opening, 'Year ' + a.year + '.',
      a.headline ? 'The headline: ' + a.headline : 'No headline: a quiet year on the file.',
      'The work: ' + many(a.records, 'record', 'records') + ' out' + (a.best ? ', the best at number ' + a.best : '') + ', and ' + many(a.trophies, 'trophy', 'trophies') + '.',
      'The people: ' + (people.length ? people.join(', ') : 'nobody came and nobody went') + '.',
      'The books: ' + (sums ? a.took + ' came in and ' + (a.took - (a.till - a.was)) + ' went out. The till' : 'the till') + ' closes at ' + a.till + moved + '.',
    ].join(' ') };
  };
  // the close: the account is filed with what was said, and the next year's books open
  KP.closeYear = function (state) {
    const years = state.years = state.years || [];
    const a = KP.yearAccount(state);
    const prev = years[years.length - 1];
    const said = KP.yearLetter(state, a, prev ? prev.line : null);
    years.push(Object.assign(a, { line: said.line, said: said.text }));
    if (years.length > KP.C.YEAR.kept) years.shift();
    state.yearLedger = { took: 0, open: { week: state.week, budget: state.budget } };
    return { kind: 'company', ind: 'yearEnd', priority: 'critical', year: a.year, text: said.text };
  };
  // an old file (migration 0.11.32): the years already closed under this
  // desk are filed from what the state still shows. Their tills are not on
  // any file, and nothing was said of them.
  KP.yearBackfill = function (state) {
    const Y = KP.C.WEEKS_PER_YEAR;
    const first = Math.ceil(KP.deskSince(state) / Y), ended = Math.floor(state.week / Y);
    const years = [];
    for (let y = first; y <= ended; y++) years.push(KP.yearAccount(state, y));
    state.years = years.slice(-KP.C.YEAR.kept);
    return state.years;
  };
  // the last week of the year, after every other clock of the week (order 890)
  KP.registerWeekly('yearClose', 890, function (state, rng, inbox) {
    if (state.week % KP.C.WEEKS_PER_YEAR !== 0 || KP.chapterPending(state)) return;
    inbox.push(KP.closeYear(state));
  });

  // ---- the label's birthday (v0.11.36, §128) ----------------------------
  // A founded label has a week it opened its doors. When that week comes
  // round the company sets down what it opened with and what stands there
  // now. Everything is READ off the state: the founding is on file, the
  // shelf is the records since. One thing is kept, which opening was used,
  // so next year's is another.
  const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  KP.labelAge = function (state) {
    const f = state.founded, Y = KP.C.WEEKS_PER_YEAR;
    return f && (state.week - f.week) % Y === 0 ? (state.week - f.week) / Y : 0;   // the week of the founding itself is nought
  };
  KP.labelStanding = function (state) {
    const f = state.founded;
    if (!f) return null;
    const since = w => w > f.week;
    const groups = KP.groups(state);
    return { years: KP.labelAge(state), from: f.from || null,
      chest: typeof f.warChest === 'number' ? Math.round(f.warChest) : null,   // an old file may not say
      acts: groups.filter(g => g.debuted && !g.retiredWeek).length,
      people: state.roster.length,
      trophies: records(state, r => since(r.week)).reduce((n, x) => n + (x.r.trophies || 0), 0),
      honors: groups.reduce((n, g) => n + (g.honors || []).filter(h => since(honorWeek(h))).length, 0),
      till: Math.round(state.budget) };
  };
  // the letter: an opening the label did not use last year, then and now, and the opening's own last line
  KP.birthdayLetter = function (state, s, last) {
    const name = state.company.name, age = (NUM[s.years] || s.years) + (s.years === 1 ? ' year' : ' years');
    const lines = [
      name + ' is ' + age + ' old this week.',
      'It is ' + age + ' to the week since ' + name + ' opened its doors.',
      'The week ' + name + ' opened its doors has come round again: ' + age + '.',
    ];
    const closes = [
      'Somebody left a cake at the front desk, and nobody has admitted to it.',
      'The first lease is framed by the lift now. The staff signed the back of it.',
      'The founding desk is still in the corner office. Nobody will let it be replaced.',
    ];
    const opening = KP.lineFor(state, 'labelBirthday', lines, last);
    const line = lines.indexOf(opening);
    const then = [s.from ? 'out of ' + s.from : null, s.chest != null ? 'with ' + s.chest + ' in the till' : null].filter(Boolean);
    return { line, text: [
      opening,
      then.length ? 'It started ' + then.join(' ') + '.' : null,
      'Today it has ' + many(s.acts, 'act', 'acts') + ', ' + (s.people ? s.people : 'nobody') + ' under contract, ' +
        many(s.trophies, 'trophy', 'trophies') + ' on the shelf' + (s.honors ? ', ' + many(s.honors, 'honor', 'honors') : '') +
        (s.till < 0 ? ', and a till ' + (-s.till) + ' short.' : ', and ' + s.till + ' in the till.'),
      closes[line],
    ].filter(Boolean).join(' ') };
  };
  // the week the doors opened, come round again, after the year's own close (order 892)
  KP.registerWeekly('labelBirthday', 892, function (state, rng, inbox) {
    const years = KP.labelAge(state);
    if (!years || KP.chapterPending(state)) return;
    const said = KP.birthdayLetter(state, KP.labelStanding(state), state.founded.said);
    state.founded.said = said.line;
    inbox.push({ kind: 'company', ind: 'labelBirthday', priority: 'critical', years, text: said.text });
  });

  // ---- the weekly: every clock, one pass (order 859) --------------------
  // ---- the handover (v0.11.39, §131) -------------------------------------
  // What the file holds under one chair of this desk, READ off what is
  // already there: the greenlights that chair gave (§129), the promises
  // made upstairs while they sat, and their last review's word for the desk.
  // The rating the next chair inherits is that word, or, from a chair who
  // gave no review, where the desk stands the day it is read.
  KP.chairRecord = function (state, name) {
    const since = KP.deskSince(state);
    const lights = KP.greenlights(state).filter(e => e.who === name);
    const upstairs = (state.claims || []).filter(c => c.subject.kind === 'exec' && c.week > since && (c.execName || KP.chairProven(state, c.week)) === name);
    const reviews = (state.reviews || []).filter(r => r.exec === name && r.week > since);
    const n = (list, test) => list.filter(test).length;
    return { name, given: lights.length, kept: n(lights, e => e.status === 'met'), dark: n(lights, e => e.status === 'lapsed'),
      promises: upstairs.length, promisesKept: n(upstairs, c => c.resolved === 'met' || c.resolved === 'metPoorly'), promisesBroken: n(upstairs, c => c.resolved === 'missed'),
      review: reviews.length ? reviews[reviews.length - 1].band : null, rated: reviews.length ? reviews[reviews.length - 1].band : KP.trustBand(state.trust) };
  };
  // the record in one sentence: what was greenlit and what came of it, what was promised and what came of it, and the last review's word
  const some = n => (n === 0 ? 'none' : n === 1 ? 'one' : String(n));
  KP.chairRecordSaid = function (r) {
    return [
      r.given ? many(r.given, 'greenlight', 'greenlights') + ', ' + some(r.kept) + ' kept and ' + some(r.dark) + ' left dark' : 'no greenlights',
      r.promises ? many(r.promises, 'promise', 'promises') + ' upstairs, ' + some(r.promisesKept) + ' kept and ' + some(r.promisesBroken) + ' broken' : 'no promises upstairs',
      r.review ? 'and a last review that read “' + r.review + '”' : 'and no review of theirs on the file',
    ].join('; ');
  };
  // what the next chair says of the rating they inherit, by the Desk's five words
  const RATED = {
    trusted: 'rated you as highly as this house rates anyone',
    solid: 'rated you well',
    watched: 'was still reading your work twice',
    thin: 'kept you on, and not by much',
    gone: 'had stopped answering for you',
  };

  KP.registerWeekly('timeShare', 859, function (state, rng, inbox, roster) {
    const T = KP.C.TIME;
    const led = ledger(state);

    // senescence crossings: one note, written with care, at the line
    roster.forEach(p => {
      if (p.status !== 'idol' || (p.age || 0) < T.SENESCE.at || p.flags.senesceNoted) return;
      p.flags.senesceNoted = true;
      led.senesced++;
      p.history.push({ week: state.week,
        text: 'The trainer rebuilt the routine this year — more recovery days, smarter reps, the schedule of a professional in it for the long haul. What the years took in bounce they paid back in floor.' });
      // once per life — it lands (v0.10.29, §89 Phase 1: priority, not volume)
      inbox.push({ kind: 'development', ind: 'senesced', priority: 'high', personId: p.id,
        text: KP.fillPro(KP.displayName(p) + ' is ' + p.age + ' now, and the training staff quietly rebuilt {pos} week: recovery days on the calendar, reps that count instead of reps that impress. The tradeoff is the industry’s oldest and {she} took it like the professional {she} is — the explosive gains are behind {her}, and so are the shaky nights. {She} has not missed on a tired stage in years. The veterans never do.', p) });
    });

    // trust drift: above the bar, excellence becomes the expectation
    if (state.week % T.DRIFT.everyWeeks === 0 && (state.trust || 0) > T.DRIFT.above) {
      state.trust -= 1;
      led.driftWeeks++;
      if (!state.driftNoted) {
        state.driftNoted = true;
        inbox.push({ kind: 'executive', priority: 'high',
          text: state.executive.name + KP.fillPro(', at the end of an otherwise glowing review: “Do not mistake this building’s mood for a resting state. At this level, last year’s miracle is this year’s baseline.” {She} is not wrong, and {she} is not going to stop being not wrong.', KP.execP(state)) });
      }
    }

    // ---- executive succession: chairs have eras (non-founded houses —
    // a founder cannot be succeeded out of their own chair; their
    // pressure layer is the board, below)
    if (!state.founded) {
      state.executive.since = state.executive.since || 1;
      const gen = state.execGen || 0;
      const era = Math.round(T.EXEC.eraWeeks[0] +
        KP.hash01([state.seed, 'execEra', gen].join('|')) * (T.EXEC.eraWeeks[1] - T.EXEC.eraWeeks[0]));
      if (state.week >= T.EXEC.minWeek && state.week - state.executive.since >= era &&
          !(state.scenes || []).some(sc => sc.kind === 'newChair')) {
        const old = state.executive;
        const warm = (state.trust || 0) >= 60;
        const left = KP.chairRecord(state, old.name);   // read while the chair is still theirs (v0.11.39, §131)
        const candidates = KP.DATA.executives.filter(e => e.name !== old.name);
        const next = candidates[Math.floor(
          KP.hash01([state.seed, 'nextExec', gen].join('|')) * candidates.length)];
        state.execGen = gen + 1;
        state.executive = { name: next.name, gender: next.gender || 'f',
          personality: next.personality, intro: next.intro, since: state.week };
        // the ledger reset: the record transfers, the devotion does not
        const startT = KP.C.EXEC.startTrust;
        state.trust = KP.clamp(Math.round(startT + ((state.trust || 0) - startT) * T.EXEC.carry), 0, 100);
        delete state.petProjectDone;   // a new chair brings its own someday
        delete state.driftNoted;       // and its own bar
        led.successions++;
        // the written record (v0.11.30, §122): each chair, not only the last
        KP.fileMark(state, 'chair', { name: next.name, after: old.name,
          years: Math.round((state.week - (old.since || 1)) / KP.C.WEEKS_PER_YEAR) });
        // a succession is once an era — it lands whatever else happened (v0.10.29)
        inbox.push({ kind: 'executive', priority: 'critical', ind: 'execFarewell',
          text: old.name + KP.fillPro(' announced it in the all-hands voice: after ' +
            Math.round((state.week - (old.since || 1)) / KP.C.WEEKS_PER_YEAR) +
            ' years in the chair, {she} is stepping away. ', { gender: old.gender || 'f' }) +
            (warm ? 'The last thing packed was a framed chart printout — one of ours. “Whatever the next chair thinks of you,” ' + old.name.split(' ')[0] + ' said at the door, “make them learn it the way I did.”'
                  : 'The goodbye was professional, which both of you understood to be a complete sentence. Some eras end even; this one ends filed.') });
        inbox.push({ kind: 'executive', urgent: true, ind: 'newChair', priority: 'critical',
          text: next.name + ' takes the chair Monday. ' + next.intro + ' The new executive has read the file ' + old.name + ' left: ' + KP.chairRecordSaid(left) + '. What has not transferred is the part that took years to build: the benefit of the doubt. The first meeting is on the Desk, and it sets the tone for the era.' });
        KP.openScene(state, { kind: 'newChair', prevName: old.name, rated: left.rated,
          expiresWeek: state.week + 3 });
      }
    }

    // ---- the founder's board: seats with names ------------------------
    if (state.founded) {
      if (!state.board) {
        const FAM = ['Cho', 'Han', 'Ryu', 'Min', 'Gu', 'Jin', 'Pyo', 'Chae'];
        const GIV = ['Sung-min', 'Ae-ra', 'Kwang-ho', 'Yeon-woo', 'Sang-hee', 'Do-yun', 'Mi-sook', 'Jae-beom'];
        const nm = k => FAM[Math.floor(KP.hash01([state.seed, 'board', k, 'f'].join('|')) * FAM.length)] +
          ' ' + GIV[Math.floor(KP.hash01([state.seed, 'board', k, 'g'].join('|')) * GIV.length)];
        state.board = { since: state.week, seats: [
          { name: nm('inv'), role: 'lead investor' },
          { name: nm('vet'), role: 'industry veteran' },
          { name: nm('ally'), role: 'first believer' },
        ] };
        ledger(state).boardSeated++;
        inbox.push({ kind: 'company', priority: 'high',
          text: 'The board seats itself this week — the war chest came with names attached: ' +
            state.board.seats.map(s => s.name + ' (' + s.role + ')').join(', ') +
            '. Three people, three reasons to be in the room: the money, the credibility, and the one who believed first. They meet once a year, and they read everything in between.' });
      }
      const chest = (state.founded.warChest || 0) || 1;
      if (!state.board.burnNoted && state.budget < chest * T.BOARD.burnAt) {
        state.board.burnNoted = true;
        led.boardMemos++;
        inbox.push({ kind: 'company', urgent: true, ind: 'boardMemo',
          text: state.board.seats[0].name + ' — the lead investor — sent the memo founders describe to each other in bars: two paragraphs, no adjectives, a chart of the war chest with a line where the runway ends. The last sentence is the whole message: “I funded a company, not a countdown. Show me which one this is.”' });
      }
      if (!state.board.proudNoted && state.budget > chest * T.BOARD.proudAt) {
        state.board.proudNoted = true;
        led.boardConfidence++;
        state.trust = KP.clamp((state.trust || 0) + T.BOARD.proudTrust, 0, 100);
        inbox.push({ kind: 'company', priority: 'high', ind: 'boardProud',
          text: 'The board’s year-end letter runs one paragraph longer than usual, and the extra paragraph is the one founders frame: the company has more than doubled the money it started with. ' + state.board.seats[2].name + ' — the first believer — added a handwritten line at the bottom: “Told them so.”' });
      }
    }
  });

  // ---- the first meeting: the new chair sets the tone -------------------
  KP.registerScene('newChair', {
    title: (state) => state.executive.name + ' · the first meeting',
    body: (state, sc) => state.executive.name + KP.fillPro(' opens the file — YOUR file — and closes it again without reading, which is the test. “' + (sc.prevName || 'My predecessor') + ' ' + (RATED[sc.rated] || 'rated you highly') + '. I inherited the rating, not the reasons. You can walk me through the record, or we can start from a clean page and let this year speak. Choose — I read a lot into how people choose.”', KP.execP(state)),
    options: () => [
      { id: 'receipts', label: 'Walk the record — bring the receipts' },
      { id: 'slate', label: 'The clean page — let this year speak' },
    ],
    resolve: (state, sc, optionId) => {
      const led = ledger(state);
      if (optionId === 'receipts') {
        led.receipts++;
        state.trust = KP.clamp((state.trust || 0) + 3, 0, 100);
        return { toast: KP.fillPro('You walked the whole ledger — the debuts, the promises kept, the years the numbers earned. {She} interrupted twice with sharp questions and once with a note to {herself}, which is how this one shows respect. The record moved {her} where charm never would have. Trust +3, and the new era opens with the file OPEN.', KP.execP(state)) };
      }
      led.cleanSlates++;
      state.trust = KP.clamp((state.trust || 0) + 1, 0, 100);
      return { toast: KP.fillPro('“The clean page.” {She} nodded slowly, filed something away, and moved to the calendar. Confidence reads either as strength or as a gamble, and {she} has not decided which — that is the point of a clean page. This year will be read closely.', KP.execP(state)) };
    },
    expire: (state) => {
      state.trust = KP.clamp((state.trust || 0) - 2, 0, 100);
      return { kind: 'executive',
        text: KP.fillPro('The first meeting with the new chair never happened — the window closed with your calendar full. {She} noticed, because noticing is the whole job. The era opens with the benefit of the doubt already spent.', KP.execP(state)) };
    },
  });

  // ---- the timeline reacts ---------------------------------------------
  KP.onFeedEvent('execFarewell', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'the CEO stepping down after all those years. say what you want about suits, the eras of this industry get written in boardrooms as much as on stages' },
    { persona: 'press', text: 'An executive era ends. The interesting question is never the farewell — it is which promises the next chair considers inherited.' },
  ]));
  KP.onFeedEvent('newChair', (state, n, rng) => rng.pick([
    { persona: 'stan', text: 'new CEO just walked into my faves’ company. immediately researching everything this person has ever greenlit. the fandom does due diligence now, we’ve been burned before' },
    { persona: 'casual', text: 'new executive, new era, same question every fandom asks: does the new boss love the artists or the spreadsheet. the first year always answers' },
  ]));
  KP.onFeedEvent('boardMemo', (state, n, rng) => rng.pick([
    { persona: 'press', text: 'Word in the trades: the founder’s investors are reading the runway chart closely. Independence is a beautiful word with a burn rate.' },
  ]));
  KP.onFeedEvent('boardProud', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'the founded label DOUBLED its war chest. every executive who passed on that founder is rereading an old email right now and saying nothing' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
