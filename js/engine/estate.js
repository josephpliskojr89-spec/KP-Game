/* The last statement (v0.11.0, §86) — insolvency and the second chances.
   Owner: "insolvency should mean game over, at least for that company.
   now if you've managed to have some success but the economic reality
   of being a small label just won, your reputation should at least
   provide the possibility of getting another job... so that it's never
   truly game over."

   The shape: the COMPANY can die; the CAREER survives it if the career
   earned survival. A red week is a week the label is BEHIND on what it
   owes — the clamp law (0.10.11) still takes only what exists, but the
   rest is not forgiven any more: the month-end invoice and the fund's
   toll report their shortfall here as ARREARS, and every won that
   arrives afterwards pays the arrears first. The ladder is legible the
   whole way (the memo, the staff meeting, the creditors' letters, the
   FINAL NOTICE with the date on it); at twelve the last statement is on
   the Desk, and reading it closes the company ON THE RECORD — the
   people scatter through the exits that exist, the shelf goes to the
   distributor and keeps charting, the obituary gets the game's voice.
   Then the doors: what the career earned, in the SAME world. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // ---- the counter beside the books ----------------------------------------
  function redOf(state) {
    state.red = state.red ||
      { weeks: 0, arrears: 0, rung: 0, peak: 0, total: 0, paid: 0, episodes: 0 };
    return state.red;
  }
  KP.redOf = redOf;
  // the clamps REPORT what they swallowed; the counter reads the report.
  // The clawback keeps its own balance (f.debt) — its short quarter only
  // stamps the week red
  KP.redReport = function (state, kind, amount) {
    if (!(amount > 0)) return;
    const red = redOf(state);
    red.shortWeek = state.week;
    if (kind === 'clawback') return;
    red.arrears += Math.round(amount);
  };
  KP.redRead = function (state) {
    const R = KP.C.RED;
    const red = redOf(state);
    const weeks = red.weeks;
    const word = weeks >= R.finalNoticeAt ? 'the final notice'
      : weeks >= R.creditorsAt ? 'the creditors’ letters'
      : weeks >= R.meetingAt ? 'the staff meeting'
      : weeks >= R.memoAt ? 'the accountant’s memo' : 'clean';
    const dissolving = (state.scenes || []).some(sc => sc.kind === 'lastStatement') || !!red.sentenced;
    return { weeks, arrears: red.arrears, rung: red.rung, word, dissolving,
      finalWeek: weeks >= R.finalNoticeAt && !dissolving ? state.week + Math.max(0, R.weeksToDissolve - weeks) : null };
  };

  function letter(state, rung, red) {
    const R = KP.C.RED;
    const exec = state.executive.name;
    const owed = red.arrears;
    if (rung === 1) return { kind: 'company', ind: 'redMemo', priority: 'high',
      text: 'The month closed short. The accountant’s memo is one paragraph and no adjectives: ' + owed +
        ' owed to the practice rooms and the payroll, the account at zero, and a sentence underlined by hand — “every won that arrives pays this first.” The red weeks have started. A label that pays its month in full cools the count by one; a label that cannot is counting toward ' + R.weeksToDissolve + '.' };
    if (rung === 2) return { kind: 'company', ind: 'redMeeting', priority: 'high',
      text: 'The staff meeting nobody called: four weeks behind, and the building held it in the corridor without you. ' +
        'Nobody said the word. Everybody did the arithmetic — the dorm, the coaches, the stipends — and every file on the roster now carries the month the company could not pay. The fog eats a drowning company first: the morale drains weekly from here, and the renewal tables will remember.' };
    if (rung === 3) return { kind: 'company', ind: 'redCreditors', priority: 'high',
      text: 'The creditors’ letters arrived in one week, as they do: the distributor “reserving its position on the catalog,” the building’s management “noting the arrears,”' +
        (state.financing && (state.financing.board || state.financing.revShare || state.financing.debt) ? ' the fund “reviewing its options,”' : '') +
        ' and three rival houses calling your staff directly — the chairs are taking the calls now. Eight weeks behind. ' + owed + ' owed. The remaining moves are the honest ones: release someone, end an act, stop a bleed, pitch if the funds will still take the meeting.' };
    return { kind: 'company', ind: 'redFinal', priority: 'critical',
      text: 'FINAL NOTICE. ' + exec + ' signed it, which is the part that will keep you up: ten weeks behind, ' + owed + ' owed, and a date — ' +
        KP.weekLabel(state.week + (R.weeksToDissolve - red.weeks)).text + '. If the arrears are not cleared by then, the last statement is written and the company is dissolved on the record. ' +
        KP.fillPro('{She} did not editorialize. The date did.', KP.execP(state)) };
  }

  // ---- the weekly: order 762, after the month boundary (760) and the toll ----
  KP.registerWeekly('red', 762, function (state, rng, inbox, roster) {
    if (KP.chapterPending(state)) return;
    const R = KP.C.RED;
    const red = redOf(state);
    // the paydown: what comes in goes to what is owed first
    if (red.arrears > 0 && state.budget > 0) {
      const pay = Math.min(red.arrears, Math.floor(state.budget));
      if (pay > 0) { state.budget -= pay; red.arrears -= pay; red.paid += pay; }
    }
    const redWeek = red.arrears > 0 || red.shortWeek === state.week;
    if (redWeek) {
      if (red.weeks === 0) red.episodes++;
      red.weeks++; red.total++;
      if (red.weeks > red.peak) red.peak = red.weeks;
      // the ladder: one letter per rung per episode
      [[R.memoAt, 1], [R.meetingAt, 2], [R.creditorsAt, 3], [R.finalNoticeAt, 4]].forEach(([at, idx]) => {
        if (red.weeks < at || red.rung >= idx) return;
        red.rung = idx;
        inbox.push(letter(state, idx, red));
        // the written record (v0.11.30, §122): a short week is not history;
        // the meeting the staff held without us is
        if (idx === 2) KP.fileMark(state, 'red');
        if (idx === 2 || idx === 3) roster.forEach(p => { if (state.roster.includes(p.id)) KP.recordDirected(state, p.id, 'unpaid'); });
      });
      if (red.weeks >= R.meetingAt) {
        roster.forEach(p => { if (state.roster.includes(p.id)) p.morale = KP.clamp(p.morale - R.moralePerWeek, 0, 100); });
      }
      if (red.weeks >= R.weeksToDissolve && !red.sentenced &&
          !(state.scenes || []).some(sc => sc.kind === 'lastStatement')) {
        KP.openScene(state, { kind: 'lastStatement', expiresWeek: state.week + R.sceneFuseWeeks });
        inbox.push({ kind: 'company', ind: 'lastStatement', priority: 'critical',
          text: 'The last statement is on the Desk. Twelve weeks behind, the arrears still standing, the creditors done writing. It is one page. Reading it dissolves ' + state.company.name + ' on the record; leaving it unread for a week reads it for you.' });
      }
    } else if (red.weeks > 0) {
      red.weeks = Math.max(0, red.weeks - R.decayPerCleanWeek);
      if (red.weeks === 0 && red.rung > 0) {
        if (red.rung >= 2) KP.fileMark(state, 'redCleared', { rung: red.rung });   // and how far it had gone
        red.rung = 0;
        inbox.push({ kind: 'company', ind: 'redCleared', priority: 'high',
          text: 'The arrears cleared and the count ran back to zero. The accountant filed the red memos in a folder labeled, with no irony anyone could prove, “history.” The building breathes. It remembers.' });
      }
    }
  });

  // ---- the scene: options[0] = read the last statement -------------------
  KP.registerScene('lastStatement', {
    title: (state) => state.company.name + ' · the last statement',
    body: (state) => {
      const red = redOf(state);
      return 'Twelve weeks behind on what the building owes — ' + red.arrears + ' still standing — and the creditors stopped writing letters; they sent a page instead. ' +
        state.executive.name + ' has already signed it. The contracts void on the record, the files go where files go, the shelf goes to the distributor, and the name comes off the door. The statement is written. Reading it closes the company; not reading it closes the company a week later, without you in the room.';
    },
    options: () => [{ id: 'read', label: 'Read the last statement' }],
    resolve: (state) => {
      const r = KP.dissolveLabel(state, 'read');
      return { toast: r.ok ? 'The last statement is read. The doors are on the next page.' : r.reason };
    },
    expire: (state) => {
      // never mid-tick: the week's end reads it (sim.js)
      redOf(state).sentenced = state.week;
      return { kind: 'company', ind: 'lastStatementSilence', priority: 'critical',
        text: 'The last statement went unread for a week. The creditors did not wait for the reading; the page read itself.' };
    },
  });

  // ---- what you built: the statement, from the ledger -----------------------
  KP.lastStatementOf = function (state) {
    const h = KP.careerHonors(state);
    const groups = KP.groups(state);
    const debuted = groups.filter(g => g.debuted);
    let releases = 0, bestScene = null, bestNational = null;
    debuted.forEach(g => (g.releases || []).forEach(r => {
      releases++;
      if (r.chartPeak && (bestScene == null || r.chartPeak < bestScene)) bestScene = r.chartPeak;
      if (r.nationalPeak && (bestNational == null || r.nationalPeak < bestNational)) bestNational = r.nationalPeak;
    }));
    const since = state.chapterSince || (state.founded && state.founded.week) || 1;
    const weeks = Math.max(0, state.week - since);
    const co = state.company.short;
    const people = Object.values(state.people);
    const ours = new Set(state.roster);
    groups.forEach(g => (g.members || []).forEach(id => ours.add(id)));
    const everOurs = people.filter(p => ours.has(p.id) || (p.releasedFrom === co) ||
      (p.chapters || []).some(ch => (ch.co === co) && ['signed', 'released', 'departed', 'stayed'].includes(ch.kind))).length;
    const stageYears = people.filter(p => (p.chapters || []).some(ch => ch.kind === 'debut') &&
      (ours.has(p.id) || p.releasedFrom === co || (p.chapters || []).some(ch => ch.co === co && ch.kind === 'departed'))).length;
    return { name: state.company.name, short: co, since, weeks,
      years: Math.floor(weeks / KP.C.WEEKS_PER_YEAR),
      debuts: debuted.length, releases, bestScene, bestNational,
      trophies: h.trophies, daesangs: h.daesangs, bonsangs: h.bonsangs, natOnes: h.natOnes,
      signed: everOurs, debutedPeople: stageYears,
      acts: debuted.map(g => ({ name: g.name, debutWeek: g.debutWeek, releases: (g.releases || []).length,
        peak: (g.releases || []).reduce((b, r) => r.chartPeak && (b == null || r.chartPeak < b) ? r.chartPeak : b, null),
        members: g.members.length, pop: Math.round(g.popularity || 0) })) };
  };

  // ---- the dissolution: the company closes ON THE RECORD -------------------
  KP.chapterPending = function (state) { return !!(state && state.dissolved && !state.dissolved.door); };

  KP.dissolveLabel = function (state, how) {
    if (KP.chapterPending(state)) return { ok: false, reason: 'The company is already dissolved. The doors are on the next page.' };
    const co = state.company;
    const red = redOf(state);
    const stmt = KP.lastStatementOf(state);
    const week = state.week;
    const oldGroups = KP.groups(state).slice();
    const oldGroupIds = oldGroups.map(g => g.id);
    const CL = KP.C.SCHOOLS.CLASS;
    const went = { market: 0, academy: 0, project: 0, service: 0 };

    // ---- the people: the file is forever; the letterhead is not -----------
    const everybody = new Set(state.roster.slice());
    oldGroups.forEach(g => g.members.forEach(id => everybody.add(id)));
    everybody.forEach(id => {
      const p = state.people[id];
      if (!p) return;
      if (KP.outsideDrop) KP.outsideDrop(state, p.id);
      delete p.contract; delete p.traineeContract; delete p.dualCareer; delete p.soloEra;
      if (p.training) p.training.focus = [];
      const school = p.schoolId && KP.schoolById ? KP.schoolById(state, p.schoolId) : null;
      if (p.status === 'trainee' && school && p.age < CL.leaveAge && !(p.flags && p.flags.onProject)) {
        // the students return to their schools — the class is where she came from
        p.flags.wasOurs = 1;
        p.releasedFrom = co.short; p.releasedWeek = week;
        p.status = 'student'; p.channel = 'school'; p.company = null;
        delete p.castoffUntil; delete p.reentryAt;
        KP.chapter(state, p, 'released', { co: co.short, how: 'folded' });
        KP.chapter(state, p, 'enrolled', { school: school.name });
        p.history.push({ week, text: co.short + ' folded. Back at ' + school.name + ' by the next term — the practice room was a lease; the file is still a file.' });
        went.academy++;
        return;
      }
      KP.leftUs(state, p, 'folded');   // wasOurs, the chapter; a project member goes with the show
      if (p.status === 'rival') { went.project++; return; }
      // the released board the open market with real history (floor.js's re-entry clock)
      p.status = 'released'; p.company = null;
      delete p.reentryAt; delete p.castoffUntil;
      p.releasedBy = co.short;
      if (p.flags && p.flags.military) {
        // the service finishes with no letterhead to come home to; the board sees her at discharge
        p.reentryAt = p.flags.military.until;
        p.serviceDone = true;
        delete p.flags.military;
        went.service++;
      }
      p.history.push({ week, text: co.short + ' folded. The contract was void by the afternoon; the file was not. On the open market, with every line of the record.' });
      went.market++;
    });
    (state.rivals || []).forEach(r => { if (r.interest) everybody.forEach(id => { delete r.interest[id]; }); });

    // ---- the acts: retired on the record; the shelf keeps the songs ---------
    const shelfActs = [];
    oldGroups.forEach(g => {
      if (g.debuted && (g.releases || []).length) {
        shelfActs.push({ id: 'shelf-' + g.id, name: g.name, gender: g.gender || 'f',
          debutWeek: g.debutWeek, popularity: Math.round(g.popularity || 0), members: g.members.slice(),
          trophies: Object.assign({}, g.trophies || {}),
          releases: (g.releases || []).map(r => ({ week: r.week, title: r.songTitle, reception: r.reception,
            craft: r.craft, chartPeak: r.chartPeak, nationalPeak: r.nationalPeak, isDebut: !!r.isDebut })) });
      }
      (state.claims || []).forEach(c => {
        if (!c.resolved && c.groupId === g.id) { c.resolved = 'void'; c.resolvedWeek = week; }
      });
    });
    state.estate = state.estate || { folded: [] };
    state.estate.folded.push({ name: co.name, short: co.short, week, since: stmt.since,
      years: stmt.years, acts: shelfActs, runs: 0 });
    state.groups = [];
    state.roster = [];
    state.annals = [];   // the written record was the dead label's (v0.11.30, §122)

    // ---- the staff: the chairs take the calls ------------------------------
    const houses = KP.signingHouses ? KP.signingHouses(state) : (state.rivals || []);
    const seatsWent = [];
    Object.keys(state.seats || {}).forEach(seatId => {
      const st = state.seats[seatId];
      if (!st) return;
      const seat = KP.C.HIRES.SEATS.find(x => x.id === seatId);
      const r = houses.length ? houses[Math.floor(KP.hash01([state.seed, st.id, 'fold'].join('|')) * houses.length)] : null;
      seatsWent.push({ name: st.name, seat: seat ? seat.label : seatId, where: r ? r.short : 'the fog' });
    });
    delete state.seats;   // the next building mints its own chairs
    delete state.staffSearch;

    // ---- the world keeps its book straight (the founding's sweep) ----------
    state.memory = (state.memory || []).filter(n =>
      !(n.subjectType === 'group' && oldGroupIds.includes(n.subjectId)) && n.subjectType !== 'company');
    (state.chart && state.chart.entries || []).forEach(e => { if (e.isPlayer) e.isPlayer = false; });
    (state.national && state.national.entries || []).forEach(e => { if (e.isPlayer) e.isPlayer = false; });
    state.scenes = [];
    (state.claims || []).forEach(c => {
      if (!c.resolved) { c.resolved = 'void'; c.resolvedWeek = week; }
    });
    state.outside = []; state.outsideOffers = []; state.project = null;
    Object.keys(state.feedCast || {}).forEach(h => {
      const c = state.feedCast[h];
      const bp = c && c.biasId && state.people[c.biasId];
      if (bp && bp.status !== 'idol') delete state.feedCast[h];
    });
    state.grievances = []; state.ghostDemos = [];
    state.discourses = (state.discourses || []).filter(d =>
      !(d.subjectType === 'group' && oldGroupIds.includes(d.subjectId)));
    // the private leads vanish with the desk they wrote to; the public
    // board is the world's and stays
    state.prospects = (state.prospects || []).filter(id => {
      const p = state.people[id];
      if (!p) return false;
      if (KP.CHANNEL_PRIVATE && KP.CHANNEL_PRIVATE[p.channel]) { delete state.people[id]; return false; }
      return true;
    });
    state.bookings = (state.bookings || []).filter(o => !o.taken);
    state.awardSeason = null; state.hypeDirective = null;
    delete state.knockLedger; delete state.petProjectDone;
    delete state.distributor;   // the shelf went to them against the debts; the next label starts over
    state.renewalQuietUntil = 0; state.truckQuietUntil = 0;
    state.managerGen = (state.managerGen || 0) + 1;
    if (state.objective) state.objective.status = 'void';
    // the estate settled: no money, no running paper — the funds keep their ledger
    const f = state.financing || {};
    state.financing = { reputation: f.reputation || 0 };
    if (f.burned) state.financing.burned = true;
    state.budget = 0;
    state.fiscal = { monthStartBudget: 0, pressure: 0, monthSignings: 0 };
    state.red = { weeks: 0, arrears: 0, rung: 0, peak: red.peak, total: red.total, paid: red.paid, episodes: red.episodes };
    // the dead label's books close with it (audit v0.11.3: the next
    // chapter's first statement netted the old streams); its trophies
    // and its daesang are its own — the next company's first is a first
    state.books = { cur: {}, curStartBudget: 0, last: null, closed: (state.books && state.books.closed) || 0 };
    // its years close with it too (v0.11.32, §124)
    state.yearLedger = { took: 0, open: { week, budget: 0 } };
    state.years = [];
    delete state.gravityExecAsk;
    state.firstShowWinWeek = 0;
    delete state.daesangWonYear;

    // ---- the record ----------------------------------------------------------
    stmt.went = went; stmt.seats = seatsWent; stmt.how = how || 'read';
    state.dissolved = { week, name: co.name, short: co.short, door: null, statement: stmt };
    state.scar = { week, co: co.short, count: (state.scar ? state.scar.count : 0) + 1 };
    co.blurb = 'Dissolved ' + KP.weekLabel(week).text + ' — the month-end won. The name is on an obituary and a shelf.';

    // ---- the obituary: institutions get the snark, the people the dignity --
    const push = n => KP.note(state, n);   // unshifts — the company note goes last, so it reads first
    push({ kind: 'public', ind: 'dissolutionFans', priority: 'high',
      text: 'The fandom did what fandoms do: an archive drive, a candle thread, a timeline video with chapters. Nobody blamed the members, which was correct, and everybody blamed the company, which was also correct. The members’ handwritten letters were short. The replies were not.' });
    push({ kind: 'industry', priority: 'high',
      text: 'The trades ran it below the fold: ' + co.name + ' has ceased operations. The distributor priced the catalog before the door finished closing; the building’s management called the lease “a learning” by Friday; the funds’ memo calls it “a managed wind-down,” which is what funds call a thing they did not manage. Three rival A&R departments already have the ex-roster’s files open.' });
    push({ kind: 'company', ind: 'dissolution', priority: 'critical',
      text: 'The last statement is ' + (how === 'silence' ? 'read, by nobody, which counts' : 'read') + '. ' + co.name + ' is dissolved on the record — ' +
        (stmt.years ? stmt.years + ' year' + (stmt.years === 1 ? '' : 's') : stmt.weeks + ' weeks') + ', ' +
        stmt.debuts + ' debut' + (stmt.debuts === 1 ? '' : 's') + ', ' + stmt.releases + ' record' + (stmt.releases === 1 ? '' : 's') +
        ', and a building that could not make its month for twelve weeks. The contracts are void: ' +
        (went.market + went.academy + went.project + went.service) + ' people walk out with their files intact — ' +
        (went.academy ? went.academy + ' back to the academies, ' : '') + (went.market + went.service) + ' onto the open market with real history' +
        (went.project ? ', ' + went.project + ' with the show' : '') + '. The shelf goes to the distributor against the debts: the songs keep existing; the royalties do not come here. ' +
        (seatsWent.length ? 'The chairs took the calls they had been declining for a year. ' : '') +
        'Nobody at the funds shouted. Funds never shout.' });
    return { ok: true, statement: stmt };
  };

  // ---- the second chances: what the career earned ---------------------------
  // a specific person with a specific bond history, big on the other side
  // of the wall — her undecayed kindnesses, her act's pull
  KP.protegeOf = function (state) {
    const P = KP.C.RED.DOORS.protege;
    const L = KP.C.LEDGER.KINDS;
    let best = null;
    (state.rivals || []).forEach(r => (r.acts || []).forEach(a => {
      if (r.projectHouse) return;   // a broadcaster's house hosts nobody (audit v0.11.3)
      if (a.retired || (a.popularity || 0) < P.popAt) return;
      (a.members || []).forEach(id => {
        const p = state.people[id];
        if (!p || !(p.flags && p.flags.wasOurs) && !(p.chapters || []).some(ch => ch.kind === 'stayed')) return;
        let bond = 0, grudge = 0;
        (p.directed || []).forEach(d => { const w = (L[d.kind] || { w: 0 }).w; if (w > 0) bond += w; grudge += (L[d.kind] || {}).grudge || 0; });
        const score = bond - grudge * 2;
        if (score < P.bondAt) return;
        const key = score * 3 + (a.popularity || 0);
        if (!best || key > best.key) best = { id: p.id, key, bond: score, rival: r.short, rivalName: r.name, act: a.name };
      });
    }));
    return best;
  };
  KP.chapterDoors = function (state) {
    const D = KP.C.RED.DOORS;
    const st = (state.dissolved && state.dissolved.statement) || KP.lastStatementOf(state);
    const f = state.financing || {};
    const charted = st.bestScene != null && st.bestScene <= D.salaried.chartedAt;
    const honored = (st.daesangs + st.bonsangs) > 0 || st.trophies >= D.salaried.trophiesAt;
    const pro = KP.protegeOf(state);
    return [
      { id: 'salaried', open: charted || honored,
        reason: 'Nobody hires a manager whose acts never charted. A top-' + D.salaried.chartedAt + ' record or a trophy shelf would have been the résumé.' },
      { id: 'investor', open: (f.reputation || 0) >= 1 && !f.burned,
        reason: f.burned ? 'The funds remember the clawback. A burned name does not get the second call.'
          : 'No fund ever watched you keep a covenant. The money calls people it has seen execute.' },
      { id: 'protege', open: !!pro, personId: pro && pro.id, host: pro && pro.rival, hostName: pro && pro.rivalName, act: pro && pro.act,
        reason: 'Nobody you built got big enough on the other side of the wall to bring you in — or nobody who did remembers you warmly.' },
      { id: 'blank', open: true, reason: '' },
    ];
  };

  function mintTrainee(state, rng, usedNames, opts) {
    const p = KP.generatePerson(rng, { status: 'trainee', inherited: true, source: 'Inherited trainee', usedNames,
      gender: opts.gender });
    p.flags.wasOurs = 1;
    const served = opts.served != null ? opts.served : rng.int(20, 90);
    p.traineeContract = { start: state.week - served, years: KP.C.TRAINEE_CONTRACT.years, term: 1 };
    p.signedWeek = state.week - served;
    state.people[p.id] = p;
    state.roster.push(p.id);
    KP.stampBorn(state, p, 'inherited', { week: p.signedWeek });
    p.history.push({ week: state.week, text: 'Already in the building when you took the job.' });
    return p;
  }
  // their aging act: the salaried chapter inherits a situation, not a page
  function mintAgingGroup(state, rng, usedNames) {
    const D = KP.C.RED.DOORS.salaried;
    const debutWeek = state.week - D.groupAge;
    const memberIds = [];
    for (let i = 0; i < 4; i++) {
      const p = KP.generatePerson(rng, { status: 'idol', usedNames, gender: 'f', age: rng.int(21, 25) });
      ['vocals', 'dance', 'charisma', 'visuals'].forEach(d => {
        p.talents[d].cur = rng.int(48, 62);
        p.talents[d].ceilLo = Math.min(97, Math.max(p.talents[d].ceilLo, p.talents[d].cur + 1));
        p.talents[d].ceilHi = Math.min(100, Math.max(p.talents[d].ceilHi, p.talents[d].ceilLo + 3));
      });
      p.liveExp = 50; p.mediaExp = 25;
      p.morale = rng.int(40, 55); p.fatigue = rng.int(25, 40);
      p.observations = 4;
      p.flags.wasOurs = 1;
      p.contract = { start: debutWeek, years: KP.C.CONTRACT.years, term: 1 };
      p.history.push({ week: debutWeek, text: 'Debuted under a small letterhead. The stage was real; the marketing budget was a rumor.' });
      p.history.push({ week: state.week, text: 'The new manager arrived with a reputation and no illusions. Watched the introductions from the good chair.' });
      state.people[p.id] = p;
      state.roster.push(p.id);
      KP.stampBorn(state, p, 'inherited', { week: debutWeek });
      memberIds.push(p.id);
    }
    const members = memberIds.map(id => state.people[id]);
    const roles = KP.roleHints(state, members);
    state.nextGroupId = state.nextGroupId || 1;
    const g = {
      id: 'g' + (state.nextGroupId++),
      type: 'group', gender: 'f',
      name: KP.suggestGroupNames(state, rng)[0],
      members: memberIds.slice(),
      roles: Object.assign({}, roles),
      formedWeek: debutWeek - 40,
      centerHistory: [{ week: debutWeek - 40, id: roles.center }],
      debuted: true, debutWeek,
      prep: null, results: null, demos: null,
      popularity: D.groupPop,
      lastReleaseWeek: state.week - 30,
      promoUntil: state.week - 30 + KP.C.COMEBACK.promoWeeks,
      concept: 'bright', conceptRun: 1,
      trophies: {},
      releases: [],
      legacy: true,   // start-content marker: the harness reads it
    };
    [[debutWeek, 56, 6, 28, 'single', true],
     [state.week - 30, 49, 11, 46, 'mini', false]].forEach(([wk, rec, peak, natPeak, fmt, isDebut]) => {
      g.releases.push(KP.deriveVerdict(state, { week: wk, songTitle: KP.genSongTitle(rng, {}),
        conceptId: 'bright', reception: rec, receptionBand: rec >= 55 ? 'solid' : 'quiet',
        chartPeak: peak, chartWeeks: 6, nationalPeak: natPeak, nationalWeeks: 5,
        isDebut, format: fmt, tracks: fmt === 'single' ? 1 : 5, tracklist: [] }, g.id + '|' + wk, 'bright'));
    });
    g.fandom = { name: KP.fandomNameOptions(state, g)[0], color: 'slate blue', since: debutWeek + 20, intensity: 28 };
    g.gen = KP.C.RISEFALL.GEN.start;
    state.groups.push(g);
    KP.assignRooms(state, g);
    return g;
  }

  KP.nextChapter = function (state, door, opts) {
    opts = opts || {};
    if (!KP.chapterPending(state)) return { ok: false, reason: 'There is no door to walk through — the company is still open.' };
    const doors = KP.chapterDoors(state);
    const d = doors.find(x => x.id === door);
    if (!d) return { ok: false, reason: 'No such door.' };
    if (!d.open) return { ok: false, reason: d.reason };
    const R = KP.C.RED.DOORS[door];
    const F = KP.C.FINANCE;
    const dead = state.dissolved;
    const week = state.week;
    const rng = KP.rngFor(state);
    KP.resetIds(state.nextPersonId || KP.peekNextId());
    const usedNames = new Set();
    Object.values(state.people).forEach(p => {
      usedNames.add(p.name.display.toLowerCase());
      usedNames.add(p.name.given.toLowerCase());
    });
    const usedShorts = new Set();
    (state.rivals || []).forEach(r => usedShorts.add(String(r.short).toLowerCase()));
    ((state.estate && state.estate.folded) || []).forEach(f => usedShorts.add(String(f.short).toLowerCase()));

    // ---- the company ----------------------------------------------------------
    let name, short;
    if (door === 'salaried') {
      const named = KP.genCompanyName(rng, usedShorts);
      name = named.name; short = named.short;
    } else {
      name = String(opts.companyName || '').trim().slice(0, 28) || { investor: 'Second Label', protege: 'Reunion Label', blank: 'Paper Label' }[door];
      short = name.split(' ')[0].slice(0, 9);
      const taken = usedShorts.has(short.toLowerCase()) ||
        (state.rivals || []).some(r => r.name.toLowerCase() === name.toLowerCase()) ||
        ((state.estate && state.estate.folded) || []).some(f => f.name.toLowerCase() === name.toLowerCase());
      if (taken) return { ok: false, reason: 'That name is already on a building in this industry — or on an obituary.' };
    }
    const host = door === 'protege' ? (state.rivals || []).find(r => r.short === d.host) : null;
    const pro = door === 'protege' ? state.people[d.personId] : null;
    const blurb = door === 'salaried'
      ? 'A small label with a lease, a half-built roster, an aging act, and an exec who read your file and hired you anyway. Someone else’s name on the door.'
      : door === 'investor'
        ? 'Backed around one name — yours — by a fund that watched you keep a covenant once. The money arrived with its hand already on the label.'
        : door === 'protege'
          ? 'An imprint hosted by ' + (host ? host.name : 'a rival house') + ', opened because ' + (pro ? KP.displayName(pro) : 'someone you built') + ' asked for it. The trades call it the reunion.'
          : 'Registered the month after the obituary. One desk, one name on the door — yours, again — and an industry that has your last statement on file.';
    state.company = { name, short, blurb,
      reputation: { vocal: R.rep, girlGroup: R.rep, starMaker: R.rep, performance: R.rep } };
    const execPool = KP.DATA.executives.filter(e => e.name !== (state.executive && state.executive.name));
    const exec = execPool[Math.floor(KP.hash01([state.seed, 'chapter-exec', week].join('|')) * execPool.length)];
    state.executive = { name: exec.name, gender: exec.gender || 'f', personality: exec.personality, intro: exec.intro, since: week };
    state.trust = R.trust;
    const chest = door === 'salaried' ? R.budget : R.chest;
    state.budget = chest;
    state.fiscal = { monthStartBudget: chest, pressure: 0, monthSignings: 0 };
    if (state.books) state.books.curStartBudget = chest;   // the first statement nets from the chest, not from zero
    state.yearLedger = { took: 0, open: { week, budget: chest } };   // and so does the first year's close (v0.11.32, §124)
    // the salaried door inherits an act with trophies on the wall — its
    // first win is not the company's first; every other door starts clean
    state.firstShowWinWeek = door === 'salaried' ? week - R.groupAge : 0;
    state.signingsAllowed = R.signings;
    state.signingsUsed = 0;
    state.objective = {
      type: 'debutGirlGroup',
      text: door === 'salaried'
        ? 'Debut ' + name + '’s next group within 18 months. Their deadline, their money, your name on the result.'
        : 'Debut ' + name + '’s first group within 18 months. The industry has your obituary on file; the next page is the only answer to it.',
      minMembers: KP.C.GROUP.minMembers, maxMembers: KP.C.GROUP.maxMembers,
      deadlineWeek: week + KP.C.FOUNDING.deadlineWeeks,
      status: 'open',
    };
    delete state.board;
    delete state.seats;
    if (door === 'salaried') delete state.founded;
    else state.founded = { week, warChest: chest, from: dead.short, door };
    state.chapterSince = week;
    KP.closeGreenlights(state);   // what the dead label was greenlit is not the next house's to keep (v0.11.37, §129)
    KP.evalDeskOpens(state);      // nor are the sheets its floor was read on the next house's year (v0.11.38, §130)
    state.nextMeetingWeek = week + 8;
    state.renewalQuietUntil = 0; state.truckQuietUntil = 0;
    delete state.petProjectDone; delete state.hypeDirective;
    state.managerGen = (state.managerGen || 0) + 1;
    state.red = { weeks: 0, arrears: 0, rung: 0, peak: 0, total: 0, paid: 0, episodes: 0 };

    // ---- the door's own machinery --------------------------------------------
    const notes = [];
    if (door === 'investor') {
      // §85's whole thesis: the money arrives with hands attached from week 1
      const f = state.financing = state.financing || { reputation: 0 };
      const fund = KP.FUNDS[Math.floor(KP.hash01([state.seed, 'chapter-fund', week].join('|')) * KP.FUNDS.length)];
      const seat = KP.hash01([state.seed, 'chapter-hand', week].join('|')) < 0.5;
      if (seat) f.board = { until: week + F.boardWeeks, fund };
      else f.revShare = { pct: F.revSharePct, until: week + F.revShareWeeks, fund };
      f.lastPitchWeek = week;
      if (KP.ledgerFlow) KP.ledgerFlow(state, 'financing', chest);
      const led = KP.financeLedger(state);
      led.taken++; if (seat) led.boardSeats++; else led.revShares++;
      notes.push({ kind: 'company', ind: 'financeTaken', priority: 'high',
        text: fund + ' wired ' + chest + ' into ' + name + ' and ' + (seat ? 'took the board seat on day one — a partner at every Monday meeting before there is a Monday meeting.' : 'wrote the toll into the first statement — ' + Math.round(F.revSharePct * 100) + '% of gross for two years, from a gross of nothing.') + ' Funded founding is the blank page with a landlord.' });
    }
    if (door === 'protege' && host) {
      state.host = { company: host.short, personId: d.personId, act: d.act, since: week };
      // two of the host's bench walk in with you — real people, real files
      const floor = KP.rivalFloor(state, host)
        .sort((a, b) => KP.hash01([state.seed, a.id, 'loan'].join('|')) - KP.hash01([state.seed, b.id, 'loan'].join('|')))
        .slice(0, R.loaned);
      floor.forEach(p => {
        p.status = 'trainee'; p.company = null;
        p.traineeContract = { start: week, years: KP.C.TRAINEE_CONTRACT.years, term: 1 };
        p.signedWeek = week;
        p.flags.wasOurs = 1;
        delete p.flags.rivalNative;
        (state.rivals || []).forEach(r => { if (r.interest) delete r.interest[p.id]; });
        state.roster.push(p.id);
        KP.chapter(state, p, 'signed', { co: short, how: 'hosted' });
        p.history.push({ week, text: 'Walked from ' + host.short + '’s bench into ' + name + ' — ' + (pro ? KP.displayName(pro) : 'the host') + ' asked, and the house said yes.' });
      });
      if (pro) KP.recordDirected(state, pro.id, 'promiseKept');   // the bond answered: her door, kept on the record
      notes.push({ kind: 'company', ind: 'hosted', priority: 'high',
        text: (pro ? KP.displayName(pro) : 'Someone you built') + ' made the call. ' + host.name + ' hosts the imprint — their name beside yours on the letterhead, ' +
          (floor.length ? floor.length + ' of their bench walking in with you, ' : '') + 'and a war chest of ' + chest + ' that reads as a favor and prices as one. The fandom made the reunion edit before the paperwork cleared.' });
    }
    if (door === 'salaried') {
      for (let i = 0; i < R.trainees; i++) mintTrainee(state, rng, usedNames, { gender: rng.chance(0.3) ? 'm' : 'f' });
      mintAgingGroup(state, rng, usedNames);
      notes.push({ kind: 'company', ind: 'salaried', priority: 'high',
        text: name + ' hired you to run the roster: ' + R.trainees + ' trainees who have heard what happened, one act past its peak, a budget of ' + chest + ', and an exec who starts you at the trust a stranger gets. ' + state.executive.intro + ' Someone else’s name on the building. That is the humbling, and the job.' });
    }
    // the board: the scene knows the new name
    const count = R.board;
    for (let i = 0; i < count; i++) {
      const gender = rng.chance(0.4) ? 'm' : 'f';
      const p = KP.generatePerson(rng, { status: 'prospect', usedNames, gender });
      state.people[p.id] = p;
      state.prospects.push(p.id);
      KP.socialOf(state, p);
      KP.stampBorn(state, p, 'founding');
    }
    state.nextPersonId = KP.peekNextId();
    // the chairs: a new building's names (the salaried label's staff; the founders' four)
    const S = KP.staffSeats(state);
    const chapterN = ((state.career || []).length + 1);
    Object.keys(S).forEach(seatId => {
      const st = S[seatId];
      if (!st) return;
      st.name = seatId === 'perf' ? 'Director ' + KP.staffName(state.seed + '|ch' + chapterN + '|' + seatId).split(' ')[0]
        : seatId === 'scout' ? 'Scout ' + KP.staffName(state.seed + '|ch' + chapterN + '|' + seatId).split(' ')[0]
        : 'Coach ' + KP.staffName(state.seed + '|ch' + chapterN + '|' + seatId).split(' ')[0];
      st.since = week;
      st.resume = [door === 'salaried' ? 'here before you — the résumé is this company' : 'here since the second beginning'];
    });
    // every door people enter the world through mints the public number
    // on the spot (social.js's law; audit v0.11.3: the chapter's trainees
    // and the inherited act minted at first render and forked the twin)
    const minted = new Set();
    (state.roster || []).forEach(id => { const p = state.people[id]; if (p && !minted.has(id)) { minted.add(id); KP.socialOf(state, p); } });
    KP.groups(state).forEach(g => (g.members || []).forEach(id => { const p = state.people[id]; if (p && !minted.has(id)) { minted.add(id); KP.socialOf(state, p); } }));
    // what follows you
    state.career = (state.career || []).concat([{ week, from: dead.short, door, to: short }]);
    dead.door = door; dead.doorWeek = week;
    state.rngState = rng.state();
    notes.push({ kind: 'company', ind: 'chapterDoor', priority: 'critical',
      text: { salaried: 'You took the job. ' + name + ' is someone else’s company, and you run it now — ' + state.executive.name + ' reads the file every Monday.',
        investor: 'You signed. ' + name + ' exists — a desk, a lease, a fund’s hand on the label from the first morning, and ' + dead.short + '’s obituary in the same folder as the pitch deck.',
        protege: 'You walked through her door. ' + name + ' exists under ' + (host ? host.short : 'the host') + '’s roof — the reunion the trades wanted, the imprint you have to make real.',
        blank: 'You registered the name. ' + name + ' exists — no calls, no reputation, a seed round that remembers the last one, and the scar. Start from nothing, in the same world.' }[door] +
        ' Eighteen months to the next debut. The industry remembers the last statement; the only answer is the next one.' });
    notes.forEach(n => KP.note(state, n));   // the door's note lands last, so it reads first
    return { ok: true, name, short };
  };

  // ---- the shelf, sold (§86 A): one of the honest moves a broke label has —
  // the catalog's upside for cash now. The distributor buys the masters'
  // reverse runs; the label keeps the songs' history and loses the royalties
  KP.shelfPrice = function (state) {
    const C = KP.C.CATALOG;
    const S = KP.C.RED.SHELF;
    let price = 0, tracks = 0;
    KP.groups(state).forEach(g => (g.releases || []).forEach(r => {
      if (r.sold || (r.reception || 0) < S.saleMinReception) return;
      price += C.revivalWindfallBase + Math.max(0, (r.reception || 0) - 30) * C.revivalWindfallPerReception;
      tracks++;
    }));
    price = Math.round(price * S.salePct);
    if (!tracks) return { ok: false, reason: 'There is no shelf to sell — nothing on record that anyone would reprint.', price: 0, tracks: 0 };
    return { ok: true, price, tracks };
  };
  KP.sellShelf = function (state) {
    const S = KP.C.RED.SHELF;
    const q = KP.shelfPrice(state);
    if (!q.ok) return q;
    KP.groups(state).forEach(g => (g.releases || []).forEach(r => {
      if (!r.sold && (r.reception || 0) >= S.saleMinReception) r.sold = state.week;
    }));
    KP.takeIn(state, q.price);
    if (KP.ledgerFlow) KP.ledgerFlow(state, 'financing', q.price);   // an asset sale is capital — the fund's toll reads revenue, not the shelf (audit v0.11.3)
    state.shelfSales = (state.shelfSales || 0) + 1;
    KP.note(state, { kind: 'company', ind: 'shelfSold', priority: 'high',
      text: 'The shelf is sold: ' + q.tracks + ' record' + (q.tracks === 1 ? '' : 's') + ' of masters’ upside to the distributor for ' + q.price + ', wired today. The songs keep their history and lose their royalties — a reverse run on any of them pays somebody else now. The accountant called it “liquidity.” The members called it something shorter.' });
    return { ok: true, price: q.price, tracks: q.tracks };
  };

  // ---- the shelf: a dead label's songs keep existing — and charting ---------
  KP.registerWeekly('shelf', 566, function (state, rng, inbox) {
    const E = state.estate;
    if (!E || !E.folded.length) return;
    const C = KP.C.CATALOG;
    const S = KP.C.RED.SHELF;
    E.folded.forEach(dead => {
      if (!rng.chance(S.runChance)) return;
      const cands = [];
      dead.acts.forEach(a => (a.releases || []).forEach(r => {
        if (!r.revivedWeek && state.week - r.week >= C.minAgeWeeks && (r.reception || 0) >= C.minReception) cands.push({ a, r });
      }));
      if (!cands.length) return;
      const pick = cands.sort((x, y) => y.r.reception - x.r.reception)[0];
      pick.r.revivedWeek = state.week;
      dead.runs++;
      KP.chartEnter(state, { title: pick.r.title, act: pick.a.name, company: dead.short, isPlayer: false,
        catalog: true, shelf: true, score: C.revivalScore + (pick.r.reception - 50) * 0.3, entered: state.week });
      const yearsOld = Math.max(1, Math.round((state.week - pick.r.week) / KP.C.WEEKS_PER_YEAR));
      inbox.push({ kind: 'public', ind: 'shelfRun', priority: 'high',
        text: '“' + pick.r.title + '” is CHARTING — ' + yearsOld + ' year' + (yearsOld === 1 ? '' : 's') + ' old, from ' + pick.a.name + ', from ' + dead.name + ', which no longer exists. ' +
          'The reverse run nobody planned: the royalties go to the distributor against the old debts, the masters answer to a liquidator, and somewhere the people who made it are reading the same chart screenshot and typing in a group chat that still has the old name.' });
    });
  });

  // ---- the timeline reacts ----------------------------------------------------
  KP.onFeedEvent('dissolution', (state, n, rng) => rng.pick([
    { persona: 'press', text: 'Label closures are the industry’s least-covered story and its most common one. This one had a catalog worth arguing about, which is more than most.' },
    { persona: 'fan', text: 'the company is gone and the songs are not. streaming the whole discography tonight with the lights off. the members deserved a building that could pay for them' },
    { persona: 'casual', text: 'every small label obituary reads the same: the music was good, the month-end was not. the distributor already owns the masters. capitalism is a genre' },
  ]));
  KP.onFeedEvent('shelfRun', (state, n, rng) => rng.pick([
    { persona: 'stan', text: 'a song from a DEAD LABEL is on the chart and the royalties go to a liquidator. the fandom is streaming it anyway. we know. we always knew' },
    { persona: 'casual', text: 'reverse run from a company that no longer exists is the most k-pop sentence of the year. the song outlived the building' },
  ]));
  KP.onFeedEvent('chapterDoor', (state, n, rng) => rng.pick([
    { persona: 'press', text: 'Second chapters are the industry’s quietest tradition: the A&R behind a folded label resurfaces with a new letterhead, an old reputation, and a very specific set of lessons.' },
    { persona: 'fan', text: 'the person who ran the label that folded is BACK with a new company and I have decided to be cautiously, suspiciously, completely invested' },
  ]));
  KP.onFeedEvent('hosted', (state, n, rng) => rng.pick([
    { persona: 'stan', text: 'she brought her old manager in under her company’s roof. the reunion edit has three hundred thousand views and a soundtrack. we are not okay' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
