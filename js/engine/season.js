/* The season (v0.10.32, §90 Phase B) — a competition show cast from the
   world. Owner: "Survival shows actually draw from the active trainee
   pool." The annual show used to mint 2–3 finalists from nothing on
   a fixed week. Now it is a SEASON: a casting call that reaches into
   rival floors, academy classes and the open board — and YOUR trainee
   room, through one invitation scene (up to two) — twelve weeks of
   hash-judged eliminations the timeline watches, and a finale that
   forms a project group under the broadcaster's house: a fixed-term
   run or a permanent act, rolled per season (owner: "Fixed-term it
   permanent. Random roll."). The eliminated go home famous: rival
   kids to their floors, students to the open board, yours to the
   practice room. A finalist of yours in the lineup is held out of
   your lineups for the term and comes back with a public — or, on a
   permanent roll, the show's label keeps her. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    return state.seasonLedger = state.seasonLedger ||
      { cast: 0, aired: 0, invited: 0, sent: 0, oursEliminated: 0, oursLineup: 0,
        permanent: 0, fixed: 0, returned: 0, kept: 0, castSourcesMax: 0, castMax: 0 };
  }
  KP.seasonLedger = ledger;
  const woyOf = w => ((w - 1) % KP.C.WEEKS_PER_YEAR) + 1;
  const yearOf = w => Math.ceil(w / KP.C.WEEKS_PER_YEAR);
  function h(state, p, tag, extra) { return KP.hash01([state.seed, p.id, tag, extra || ''].join('|')); }
  function hin(state, p, tag, range, extra) { return range[0] + Math.floor(h(state, p, tag, extra) * (range[1] - range[0] + 1)); }

  // what the cameras see — talent, charisma, the public already there
  KP.seasonReadiness = function (state, p) {
    const t = p.talents;
    return Math.max(t.vocals.cur, t.dance.cur, t.rap.cur) * 0.6 + t.charisma.cur * 0.25 + t.visuals.cur * 0.15 +
      Math.min(30, p.liveExp || 0) * 0.2 + (p.hype || 0) * 0.3;
  };
  function ageOk(p) { const S = KP.C.COMPETITION; return p.age >= S.minAge && p.age <= S.maxAge; }

  // ---- the casting call: the world sends its people ----------------------
  function castSeason(state, inbox) {
    const S = KP.C.COMPETITION;
    const led = ledger(state);
    const yr = yearOf(state.week);
    // the show rotates year to year — a different title every season
    const show = S.NAMES[(Math.floor(KP.hash01([state.seed, 'season'].join('|')) * S.NAMES.length) + yr) % S.NAMES.length];
    const gender = KP.hash01([state.seed, 'seasonGender', yr].join('|')) < S.boyShowShare ? 'm' : 'f';
    const contestants = [];
    const used = new Set();
    const add = (p, source, company) => {
      if (used.has(p.id)) return;
      used.add(p.id);
      contestants.push({ personId: p.id, source, company: company || null, eliminatedWeek: null, rank: null });
      p.flags.onSeason = { year: yr, show, since: state.week };
    };
    const inActs = new Set();
    (state.rivals || []).forEach(r => (r.acts || []).forEach(a => (a.members || []).forEach(id => inActs.add(id))));
    // rivals: the floor's most promising, by what the cameras see
    (state.rivals || []).forEach(r => {
      if (r.projectHouse) return;
      KP.rivalFloor(state, r).filter(p => (p.gender || 'f') === gender && ageOk(p) && !KP.onBreak(p))
        .sort((a, b) => KP.seasonReadiness(state, b) - KP.seasonReadiness(state, a) || h(state, a, 'cast') - h(state, b, 'cast'))
        .slice(0, S.rivalSlots).forEach(p => add(p, 'rival', r.short));
    });
    // academies: the known students, across the map
    const students = [];
    (state.schools || []).forEach(s => KP.schoolClass(state, s).forEach(p => {
      if ((p.gender || 'f') === gender && ageOk(p)) students.push(p);
    }));
    students.sort((a, b) => (b.industryKnown ? 1 : 0) - (a.industryKnown ? 1 : 0) ||
      KP.seasonReadiness(state, b) - KP.seasonReadiness(state, a) || h(state, a, 'cast') - h(state, b, 'cast'))
      .slice(0, S.schoolSlots).forEach(p => add(p, 'school', null));
    // the open board: the unsigned enter on their own
    (state.prospects || []).map(id => state.people[id]).filter(p => p && (p.gender || 'f') === gender && ageOk(p) &&
        !KP.CHANNEL_PRIVATE[p.channel] && (p.flags.firstLookUntil || 0) <= state.week)
      .sort((a, b) => (b.hype || 0) - (a.hype || 0) || KP.seasonReadiness(state, b) - KP.seasonReadiness(state, a) || h(state, a, 'cast') - h(state, b, 'cast'))
      .slice(0, S.boardSlots).forEach(p => add(p, 'board', null));
    state.season = { year: yr, show, gender, status: 'casting', startWeek: state.week,
      finaleWeek: state.week + (S.finaleWoy - S.castWoy), contestants, eliminations: [], invited: false, ours: [] };
    led.cast++;
    const sources = new Set(contestants.map(c => c.source));
    led.castSourcesMax = Math.max(led.castSourcesMax, sources.size);
    led.castMax = Math.max(led.castMax, contestants.length);
    // the invitation: your room, if you have one
    const free = KP.seasonEligible(state);
    if (free.length) {
      state.season.invited = true;
      led.invited++;
      KP.openScene(state, { kind: 'seasonInvite', expiresWeek: state.week + 2 });
    }
    const byCo = {};
    contestants.forEach(c => { if (c.source === 'rival') byCo[c.company] = (byCo[c.company] || 0) + 1; });
    inbox.push({ kind: 'industry', ind: 'seasonCast', priority: 'high',
      text: 'The ' + show + ' casting call went out this week — a ' + (gender === 'm' ? 'boys’' : 'girls’') + ' season: ' +
        Object.keys(byCo).length + ' companies sent ' + contestants.filter(c => c.source === 'rival').length + ' trainees' +
        (Object.keys(byCo).length ? ' (' + Object.entries(byCo).map(([k, v]) => k + ' ' + v).join(', ') + ')' : '') +
        ', the academies ' + contestants.filter(c => c.source === 'school').length +
        ', and ' + contestants.filter(c => c.source === 'board').length + ' unsigned names walked in off the open board. ' +
        (free.length ? 'The producers want to know if this building is sending anyone. The invitation is on the Desk.' : 'Nobody here was eligible to send.') });
  }

  // your room: trainees not in a lineup, of age, not away
  KP.seasonEligible = function (state) {
    const s = state.season;
    const gender = s && s.status === 'casting' ? s.gender : null;
    return KP.freeTrainees(state).map(id => state.people[id]).filter(p => p && ageOk(p) && !KP.onBreak(p) &&
      (!gender || (p.gender || 'f') === gender))
      .sort((a, b) => (KP.evalRankOf(a) || 99) - (KP.evalRankOf(b) || 99) ||
        KP.seasonReadiness(state, b) - KP.seasonReadiness(state, a));
  };

  // ---- the invitation: one scene, up to two trainees ----------------------
  KP.registerScene('seasonInvite', {
    title: (state) => (state.season ? state.season.show : 'The season') + ' · the invitation',
    body: (state) => {
      const s = state.season;
      const free = KP.seasonEligible(state);
      const names = free.slice(0, 2).map(p => KP.displayName(p));
      return 'The ' + (s ? s.show : 'season') + ' producers called: they want trainees from this building for the ' +
        (s && s.gender === 'm' ? 'boys’' : 'girls’') + ' season — ' + (s ? s.contestants.length : 0) + ' names are already in. ' +
        'Twelve weeks of national television, eliminations every week, and the finale lineup debuts as a project group under the broadcaster’s label. ' +
        'Some seasons that run is a year; some seasons it is forever. Nobody knows which until the finale. ' +
        (names.length ? 'The coaches would send ' + names.join(' and ') + '.' : '');
    },
    options: (state) => {
      const free = KP.seasonEligible(state);
      const out = [];
      if (free.length >= 2) out.push({ id: 'two', label: 'Send ' + KP.displayName(free[0]) + ' and ' + KP.displayName(free[1]) });
      if (free.length >= 1) out.push({ id: 'one', label: 'Send ' + KP.displayName(free[0]) + ' alone' });
      out.push({ id: 'none', label: 'Keep them in the practice room' });
      return out;
    },
    resolve: (state, sc, optionId) => {
      const s = state.season;
      const free = KP.seasonEligible(state);
      if (!s || s.status !== 'casting' || optionId === 'none' || !free.length) {
        return { toast: 'The practice room keeps its people. The season airs without this building.' };
      }
      const sent = free.slice(0, optionId === 'two' ? 2 : 1);
      sent.forEach(p => {
        s.contestants.push({ personId: p.id, source: 'player', company: state.company.short, eliminatedWeek: null, rank: null });
        s.ours.push(p.id);
        p.flags.onSeason = { year: s.year, show: s.show, since: state.week };
        p.history.push({ week: state.week, text: 'Sent to the ' + s.show + ' season by ' + state.company.short + '. The cameras start Monday.' });
      });
      ledger(state).sent += sent.length;
      return { toast: sent.map(p => KP.displayName(p)).join(' and ') + (sent.length > 1 ? ' pack' : ' packs') +
        ' for the studio. The practice room is quieter, the group chat is not, and every rival desk in the city just learned ' + (sent.length > 1 ? 'two' : 'one') + ' of your names.' };
    },
    expire: (state) => {
      return { kind: 'industry', priority: 'normal',
        text: 'The ' + (state.season ? state.season.show : 'season') + ' casting window closed without an answer from this building. The producers filled the seats by Friday.' };
    },
  });

  // ---- what television does to a person -----------------------------------
  function touch(state, p, kind) {
    const S = KP.C.COMPETITION;
    const s = state.season;
    const ranges = { eliminated: [S.elimHype, S.elimFollowers], finalist: [S.finalistHype, S.finalistFollowers], lineup: [S.lineupHype, S.lineupFollowers] }[kind];
    p.hype = Math.max(p.hype || 0, hin(state, p, 'seasonHype' + kind, ranges[0], s.year));
    KP.socialSpike(state, p, hin(state, p, 'seasonFollowers' + kind, ranges[1], s.year), 'season' + s.year);
    p.seasonRecord = { show: s.show, year: s.year, result: kind };
    delete p.flags.onSeason;
  }

  // ---- the house: the broadcaster's label ----------------------------------
  function projectHouse(state, show) {
    let house = (state.rivals || []).find(r => r.projectHouse && r.show === show);
    if (house) return house;
    const used = new Set((state.rivals || []).map(r => r.short));
    let short = show.replace(/[^A-Z]/g, '').slice(0, 9) || 'SEASON';
    while (used.has(short)) short += '*';
    house = { name: show + ' — the project', short, philosophy: 'hungry',
      blurb: 'The broadcaster’s label: a lineup the public voted for, a staff that answers to a programming department.',
      prestige: KP.C.COMPETITION.housePrestige, projectHouse: true, show,
      interest: {}, acts: [], recentMoves: ['The season aired'] };
    state.rivals.push(house);
    return house;
  }

  // ---- the weekly rail (order 617: before the network's arrivals) ---------
  KP.registerWeekly('season', 617, function (state, rng, inbox) {
    const S = KP.C.COMPETITION;
    const led = ledger(state);
    const woy = woyOf(state.week), yr = yearOf(state.week);

    // the term's end: a fixed-term project group retires and everyone goes home
    (state.rivals || []).forEach(r => {
      if (!r.projectHouse) return;
      (r.acts || []).forEach(act => {
        if (act.retired || !act.projectTerm || state.week < act.projectTerm.until) return;
        act.retired = true;
        act.retiredWeek = state.week;
        (act.members || []).forEach(id => {
          const p = state.people[id];
          if (!p) return;
          const home = p.flags.seasonHome || {};
          delete p.flags.seasonHome;
          ['vocals', 'dance'].forEach(d => { const t = p.talents[d]; t.cur = Math.min(t.ceilLo - 1, t.cur + S.returnPolish); });
          if (p.flags.onProject) {
            // ours: she comes back with a public
            delete p.flags.onProject;
            led.returned++;
            p.history.push({ week: state.week, text: 'The ' + act.name + ' run ended. Back to ' + state.company.short + ' with a year of real stages and a public that knows the name.' });
            inbox.push({ kind: 'company', ind: 'seasonReturn', priority: 'critical', personId: p.id,
              text: KP.fillPro(KP.displayName(p) + ' is back from ' + act.name + ' — the project run is over, the contract reverts, and {she} walks into the practice room with ' +
                KP.fmtCount(KP.socialOf(state, p)) + ' followers and a year of arena stages in {pos} legs. The lineup math in this building just changed.', p) });
            return;
          }
          if (home.company && (state.rivals || []).some(x => x.short === home.company)) {
            p.company = home.company;
            p.history.push({ week: state.week, text: 'The ' + act.name + ' run ended. Back to ' + home.company + '’s floor — famous now, and everyone there knows it.' });
          } else {
            // nobody's: the open market gets a name the public already knows
            p.company = null;
            p.status = 'released';
            p.releasedBy = r.short;
            p.releasedWeek = state.week;
            p.history.push({ week: state.week, text: 'The ' + act.name + ' run ended with no home label waiting. On the open market with a public already there.' });
          }
        });
        inbox.push({ kind: 'industry', ind: 'projectEnd', priority: 'high', actName: act.name,
          text: act.name + '’s run is over — the project contract ran out this week, as it was always going to. The members go back where they came from, which is the sentence every fandom dreads and every company counts on.' });
      });
      if (!(r.acts || []).some(a => !a.retired) && !KP.rivalFloor(state, r).length) {
        state.rivals = state.rivals.filter(x => x !== r);   // the house folds its tent until the next season
      }
    });

    const s = state.season;
    // 1. the casting call
    if (woy === S.castWoy && (state.seasonYear || 0) < yr) {
      state.seasonYear = yr;
      castSeason(state, inbox);
      return;
    }
    if (!s || s.status === 'done') return;
    if (s.status === 'casting' && state.week > s.startWeek + 2) {
      s.status = 'airing';   // casting closed; whoever is in is in
      (state.scenes || []).forEach(sc => { if (sc.kind === 'seasonInvite') sc.expiresWeek = state.week - 1; });
    }
    const alive = () => s.contestants.filter(c => !c.eliminatedWeek && state.people[c.personId]);

    // 2. the air: weekly eliminations, hash-judged
    if (state.week > s.startWeek && state.week < s.finaleWeek) {
      if (s.status === 'casting') s.status = 'airing';
      const field = alive();
      const weeksLeft = s.finaleWeek - state.week;
      const target = S.lineupSize + S.runnersUp;
      const toCut = Math.max(0, Math.ceil((field.length - target) / Math.max(1, weeksLeft)));
      const scored = field.map(c => ({ c, p: state.people[c.personId] }))
        .map(x => ({ x, score: KP.seasonReadiness(state, x.p) + (h(state, x.p, 'judge', state.week) - 0.5) * 2 * S.noise }))
        .sort((a, b) => a.score - b.score);
      const gone = [];
      scored.slice(0, toCut).forEach(({ x }) => {
        x.c.eliminatedWeek = state.week;
        x.c.rank = field.length - gone.length;
        gone.push(x.p);
        touch(state, x.p, 'eliminated');
        x.p.morale = KP.clamp(x.p.morale + S.elimMorale, 0, 100);
        x.p.history.push({ week: state.week, text: 'Eliminated from ' + s.show + ' in week ' + (state.week - s.startWeek) + ', on national television. The public learned the name on the way out.' });
        if (x.c.source === 'player' && x.p.status === 'trainee' && (state.roster || []).includes(x.p.id)) {
          led.oursEliminated++;
          inbox.push({ kind: 'company', ind: 'seasonElim', priority: 'high', personId: x.p.id,
            text: KP.fillPro(KP.displayName(x.p) + ' was eliminated from ' + s.show + ' last night — week ' + (state.week - s.startWeek) + ', a vote nobody in the building saw coming. {She} is back in the practice room Monday with ' +
              KP.fmtCount(KP.socialOf(state, x.p)) + ' followers who watched {her} go. Nobody here will say the word "exposure." Everyone is thinking it.', x.p) });
        } else if (x.c.source === 'school') {
          KP.seasonRevealStudent(state, x.p);
        }
      });
      s.eliminations.push({ week: state.week, gone: gone.map(p => p.id) });
      // the week on the remaining: tired, seasoned, seen
      alive().forEach(c => {
        const p = state.people[c.personId];
        p.fatigue = KP.clamp(p.fatigue + S.weeklyFatigue, 0, 100);
        p.liveExp = (p.liveExp || 0) + S.weeklyLive;
        p.mediaExp = (p.mediaExp || 0) + S.weeklyMedia;
        KP.socialSpike(state, p, hin(state, p, 'seasonWeek', S.weeklyFollowers, state.week), 'season' + s.year + 'w' + state.week);
      });
      inbox.push({ kind: 'public', feedOnly: true, ind: 'seasonWeek', show: s.show, weekNo: state.week - s.startWeek,
        gone: gone.map(p => KP.displayName(p)), remaining: alive().length, text: 'the season airs' });
      return;
    }

    // 3. the finale
    if (state.week === s.finaleWeek) {
      s.status = 'done';
      led.aired++;
      const field = alive().map(c => ({ c, p: state.people[c.personId] }))
        .map(x => ({ x, score: KP.seasonReadiness(state, x.p) + (h(state, x.p, 'finale', s.year) - 0.5) * 2 * S.noise }))
        .sort((a, b) => b.score - a.score);
      const lineup = field.slice(0, S.lineupSize), runners = field.slice(S.lineupSize);
      runners.forEach(({ x }, i) => {
        x.c.eliminatedWeek = state.week; x.c.rank = S.lineupSize + i + 1;
        touch(state, x.p, 'finalist');
        x.p.history.push({ week: state.week, text: 'Made the ' + s.show + ' finale and missed the lineup. The fandom that voted has not logged off.' });
        if (x.c.source === 'school') KP.seasonRevealStudent(state, x.p);
        if (x.c.source === 'player' && x.p.status === 'trainee' && (state.roster || []).includes(x.p.id)) inbox.push({ kind: 'company', ind: 'seasonFinalist', priority: 'high', personId: x.p.id,
          text: KP.fillPro(KP.displayName(x.p) + ' made the ' + s.show + ' finale and missed the lineup by a televised vote. {She} is yours again Monday — with a fandom that already has a name for itself.', x.p) });
      });
      const permanent = KP.hash01([state.seed, 'seasonRoll', s.year].join('|')) < S.permanentChance;
      s.permanent = permanent;
      if (permanent) led.permanent++; else led.fixed++;
      const house = projectHouse(state, s.show);
      const memberIds = [];
      lineup.forEach(({ x }, i) => {
        const p = x.p;
        x.c.rank = i + 1;
        touch(state, p, 'lineup');
        memberIds.push(p.id);
        const stillOurs = x.c.source === 'player' && p.status === 'trainee' && (state.roster || []).includes(p.id);
        if (stillOurs) {
          led.oursLineup++;
          if (permanent) {
            // the show keeps her (owner's roll): she leaves this building
            led.kept++;
            state.roster = state.roster.filter(id => id !== p.id);
            if (state.scenes) state.scenes = state.scenes.filter(sc => sc.personId !== p.id);
            p.flags.wasOurs = 1;
            p.status = 'rival';
            p.company = house.short;
            p.signedWeek = state.week;
            p.flags.seasonHome = { company: null, keptFrom: state.company.short };
            p.history.push({ week: state.week, text: 'Won the ' + s.show + ' lineup — and the broadcaster’s label kept it. Left ' + state.company.short + ' on the finale night, on television, to applause.' });
            inbox.push({ kind: 'company', ind: 'seasonKept', priority: 'critical', personId: p.id,
              text: KP.fillPro(KP.displayName(p) + ' made the ' + s.show + ' lineup — and this season the lineup is PERMANENT. The broadcaster’s label holds {pos} contract now; you held the tape. ' +
                'Every rival desk sent somebody knowing this could happen. So did you.', p) });
          } else {
            p.flags.onProject = { until: state.week + S.termWeeks, house: house.short, show: s.show };
            p.history.push({ week: state.week, text: 'Won the ' + s.show + ' lineup. A ' + S.termWeeks + '-week project run under the broadcaster’s label; the seat at ' + state.company.short + ' is held.' });
            inbox.push({ kind: 'company', ind: 'seasonLineup', priority: 'critical', personId: p.id,
              text: KP.fillPro(KP.displayName(p) + ' made the ' + s.show + ' lineup. The project group debuts under the broadcaster’s label for ' + S.termWeeks + ' weeks — {she} is theirs on stage and yours on paper until ' +
                KP.weekLabel(state.week + S.termWeeks).text + ', and {she} comes back with a public. Your lineups wait.', p) });
          }
        } else {
          p.flags.seasonHome = { company: x.c.source === 'rival' ? x.c.company : null, school: p.schoolId || null };
          if (x.c.source === 'school') { if (KP.schoolRecordAlum) KP.schoolRecordAlum(state, p, house.short); }
          // off the open board whatever her source was (a student the
          // academy revealed mid-season is a prospect by finale night)
          state.prospects = (state.prospects || []).filter(id => id !== p.id);
          (state.rivals || []).forEach(r => { if (r.interest) delete r.interest[p.id]; });
          delete p.castoffUntil; delete p.reentryAt;
          p.status = 'rival';
          p.company = house.short;
          if (p.signedWeek == null) p.signedWeek = state.week;
          p.history.push({ week: state.week, text: 'Won the ' + s.show + ' lineup' + (permanent ? ' — the broadcaster’s label keeps it.' : ' — a ' + S.termWeeks + '-week project run, then home.') });
        }
      });
      const made = KP.makeRivalAct(state, rng, house, { members: memberIds, gender: s.gender });
      if (made && !permanent) made.act.projectTerm = { until: state.week + S.termWeeks, show: s.show };
      if (made) made.act.season = s.year;
      s.actId = made ? made.act.id : null;
      s.houseShort = house.short;
      const names = lineup.map(({ x }) => KP.displayName(x.p));
      inbox.push({ kind: 'industry', ind: 'seasonFinale', priority: 'high', show: s.show, permanent,
        text: 'The ' + s.show + ' finale aired last night: ' + names.join(', ') + ' are the lineup' + (made ? ' — ' + made.act.name : '') + '. ' +
          (permanent ? 'And the roll came up PERMANENT: the broadcaster’s label keeps them. Five companies just lost a trainee each to a television show, and the fandom that voted is already buying lightsticks.'
            : 'A ' + S.termWeeks + '-week project run, then everyone goes home — which every fandom knows and refuses to believe.') +
          ' The finalists who missed the lineup are the morning’s favorite market.' });
      s.contestants.forEach(c => { const p = state.people[c.personId]; if (p) delete p.flags.onSeason; });
      return;
    }
  });

  // a student the cameras found: she is on the open board now, public
  KP.seasonRevealStudent = function (state, p) {
    if (p.status !== 'student') return;
    p.status = 'prospect';
    p.channel = 'season';
    if ((state.prospects || []).length >= KP.C.NETWORK.boardCap) {
      p.status = 'released'; p.releasedBy = (state.season || {}).show || 'the season'; p.releasedWeek = state.week;
      return;
    }
    state.prospects.push(p.id);
    KP.socialOf(state, p);
    if (state.schoolLedger) state.schoolLedger.revealed = (state.schoolLedger.revealed || 0) + 1;
  };

  // ---- the timeline watches --------------------------------------------
  KP.onFeedEvent('seasonWeek', (state, n, rng) => {
    const gone = n.gone && n.gone.length ? n.gone[0] : null;
    return rng.pick([
      { persona: 'fan', text: n.show + ' week ' + n.weekNo + (gone ? ': ' + gone + ' went home and I am NOT okay. ' : ': nobody I love went home. ') + n.remaining + ' left. the voting app is my full-time job now' },
      { persona: 'casual', text: 'watching ' + n.show + ' purely as a sociologist. ' + n.remaining + ' teenagers, one lineup, and a nation that has opinions about key changes' },
      { persona: 'stan', text: (gone ? gone + ' eliminated from ' + n.show + ' week ' + n.weekNo + ' is the robbery of the decade. SOMEBODY sign her. ' : n.show + ' week ' + n.weekNo + ' and my kid survived. ') + 'rank reveal at midnight' },
    ]);
  });
  KP.onFeedEvent('seasonFinale', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'the ' + n.show + ' finale robbed my kid AGAIN. she trained on national television for three months and missed the lineup by ONE vote. some company better call her by Monday' },
    { persona: 'casual', text: n.show + ' finales are just a draft combine with crying. the ones who don’t make it are all signed within a month anyway. the show is the audition' },
    { persona: 'stan', text: n.permanent ? 'PERMANENT. the ' + n.show + ' lineup is PERMANENT. I was emotionally prepared for a year and the broadcaster said forever. lightstick preorder: done' : 'a ' + n.show + ' project group with a countdown on it. I will love them for every one of those weeks and then sue the broadcaster' },
  ]));
  KP.onFeedEvent('seasonCast', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'casting call season. every company in the city just sent its most photogenic trainee to be judged by people who vote at 2am' },
    { persona: 'fan', text: 'the new season cast is OUT and I have already picked a kid to ruin my sleep schedule over. do not ask me how I know her name' },
  ]));
  KP.onFeedEvent('seasonReturn', (state, n, rng) => {
    const p = state.people[n.personId];
    return p ? { persona: 'stan', text: KP.fillPro(KP.publicGiven(p) + ' is HOME. the project run is over and {she} walked back into {pos} own company with the whole fandom following. the lineup there is going to be unfair and I cannot wait', p) } : null;
  });
  KP.onFeedEvent('seasonKept', (state, n, rng) => {
    const p = state.people[n.personId];
    return p ? { persona: 'anti', text: KP.fillPro('so the broadcaster just KEEPS ' + KP.publicGiven(p) + '? the little company that trained {her} sent {her} to a show and the show kept {her}. this industry is a casino and the house always wins', p) } : null;
  });
})(typeof window !== 'undefined' ? window : globalThis);
