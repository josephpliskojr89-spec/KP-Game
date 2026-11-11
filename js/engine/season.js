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
      finaleWeek: state.week + (S.finaleWoy - S.castWoy), contestants, eliminations: [], invited: false, ours: [], fanPick: null };
    state.season.fanPick = pickFan(state, state.season);   // the public's pick, from the cast on (v0.11.4)
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
    inbox.push({ kind: 'industry', opens: 'seasonInvite', ind: 'seasonCast', priority: 'high',
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
      const names = free.slice(0, KP.C.COMPETITION.playerSlots).map(p => KP.displayName(p));
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
      const sent = free.slice(0, optionId === 'two' ? KP.C.COMPETITION.playerSlots : 1);
      sent.forEach(p => {
        s.contestants.push({ personId: p.id, source: 'player', company: state.company.short, eliminatedWeek: null, rank: null });
        s.ours.push(p.id);
        p.flags.onSeason = { year: s.year, show: s.show, since: state.week };
        p.history.push({ week: state.week, text: 'Sent to the ' + s.show + ' season by ' + state.company.short + '. The cameras start Monday.' });
        KP.chapter(state, p, 'seasonSent', { show: s.show });
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

  // ---- the season, televised (v0.11.4, §95) --------------------------------
  // Rankings the player can read, a mission a week, a named moment, the
  // doors during the run, the public's pick, the ceremony. Every number
  // here is hashed off the seed, the person and the week — television,
  // not the stream — so the event never moves the save.
  const ordinal = n => { const r = n % 100; if (r >= 11 && r <= 13) return n + 'th'; const d = n % 10; return n + (d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'); };
  KP.ordinal = ordinal;
  function aliveOf(state, s) { return (s.contestants || []).filter(c => !c.eliminatedWeek && state.people[c.personId]); }
  function pickFan(state, s) {
    const alive = aliveOf(state, s);
    if (!alive.length) return null;
    return alive.slice().sort((a, b) => ((state.people[b.personId].hype || 0) - (state.people[a.personId].hype || 0)) ||
      (h(state, state.people[a.personId], 'pick') - h(state, state.people[b.personId], 'pick')))[0].personId;
  }
  // the score the cut uses, with the week's modifiers: the push, the coach, the edit
  function weekScore(state, c, p, tag, extra) {
    const S = KP.C.COMPETITION;
    let score = KP.seasonReadiness(state, p) + (h(state, p, tag, extra) - 0.5) * 2 * S.noise;
    if (c.pushWeek === state.week) score += c.pushScore || 0;
    if (c.coachWeek === state.week) score += S.coachScore;
    if (c.edit && !c.editAnswered && state.week - (c.editWeek || 0) <= S.editWeeks) {
      score += c.edit === 'villain' ? -S.villainPenalty : S.underdogBonus;
    }
    return score;
  }
  const lastRank = c => (c.ranks && c.ranks.length) ? c.ranks[c.ranks.length - 1] : null;
  const prevRank = c => (c.ranks && c.ranks.length > 1) ? c.ranks[c.ranks.length - 2] : null;
  // the board the Industry tab reads: the alive field by last rank, with movement
  KP.seasonBoard = function (state) {
    const s = state.season;
    if (!s || s.status === 'done') return [];
    return aliveOf(state, s).map(c => ({ c, p: state.people[c.personId], rank: lastRank(c), prev: prevRank(c),
      ours: c.source === 'player', company: c.source === 'rival' ? c.company : c.source === 'player' ? state.company.short : c.source === 'school' ? 'academy' : 'unsigned' }))
      .sort((a, b) => (a.rank || 99) - (b.rank || 99));
  };
  // the line: the last safe rank next week, as the field stands
  KP.seasonLine = function (state) {
    const s = state.season;
    if (!s || s.status === 'done') return null;
    const S = KP.C.COMPETITION;
    const field = aliveOf(state, s).length;
    const weeksLeft = s.finaleWeek - (state.week + 1);
    if (weeksLeft < 0) return null;
    const target = S.lineupSize + S.runnersUp;
    const toCut = Math.max(0, Math.ceil((field - target) / Math.max(1, weeksLeft)));
    return field - toCut;
  };
  KP.seasonMission = function (state) {
    const s = state.season;
    if (!s || s.status === 'done') return null;
    const weekNo = state.week - s.startWeek;
    return KP.C.COMPETITION.MISSIONS[Math.max(0, Math.min(KP.C.COMPETITION.MISSIONS.length - 1, weekNo - 1))];
  };
  KP.seasonOurs = function (state) {
    const s = state.season;
    if (!s) return [];
    return (s.contestants || []).filter(c => c.source === 'player' && state.people[c.personId]);
  };
  // the named moment of the week: one sentence the letter keeps — picked by
  // hash among what the week offers (the center, the climber, the faller,
  // the one on the line, the pick's fancam, ours at the top), never the
  // same kind two weeks running
  function momentOf(state, s, scored, line, mission) {
    const S = KP.C.COMPETITION;
    const N = r => KP.displayName(r.x.p);
    const leader = scored[0];
    const moved = scored.map(r => ({ r, k: (prevRank(r.x.c) == null ? 0 : prevRank(r.x.c) - lastRank(r.x.c)) }));
    const climber = moved.slice().sort((a, b) => b.k - a.k)[0];
    const faller = moved.slice().sort((a, b) => a.k - b.k)[0];
    const onLine = scored.find(r => lastRank(r.x.c) === line);
    const pickP = s.fanPick && s.fanPick !== leader.x.p.id ? state.people[s.fanPick] : null;
    const oursTop = scored.find(r => r.x.c.source === 'player' && lastRank(r.x.c) <= S.topAt && r !== leader);
    const kinds = [
      { kind: 'center', text: () => KP.fillPro(N(leader) + ' took the center of ' + mission + ' and the camera did not leave {her}.', leader.x.p) },
      { kind: 'mentor', text: () => KP.fillPro('The mentors stopped ' + mission + ' to say something about ' + N(leader) + ' that the subtitles put in a bigger font.', leader.x.p) },
    ];
    if (climber && climber.k >= 2) kinds.push({ kind: 'climber', text: () => N(climber.r) + ' climbed ' + climber.k + ' places on the back of a ' + mission + ' clip that would not stop circulating.' });
    if (faller && faller.k <= -2 && faller.r !== leader) kinds.push({ kind: 'faller', text: () => KP.fillPro(N(faller.r) + ' dropped ' + (-faller.k) + ' places after ' + mission + ' — the edit showed the mistake twice, once in slow motion.', faller.r.x.p) });
    if (onLine) kinds.push({ kind: 'line', text: () => KP.fillPro(N(onLine) + ' sat on the line until the last name was read, and the last name was not {hers}.', onLine.x.p) });
    if (pickP) kinds.push({ kind: 'fancam', text: () => { KP.socialSpike(state, pickP, hin(state, pickP, 'pickFancam', S.pickFollowers, state.week), 'seasonfancam' + state.week); return 'The ' + KP.displayName(pickP) + ' fancam crossed a million by morning.'; } });
    if (oursTop) kinds.push({ kind: 'ours', text: () => KP.fillPro(N(oursTop) + ' owned ' + mission + ' — the room at home watched it twice, once with the sound off to see {pos} face.', oursTop.x.p) });
    const pool = kinds.filter(k => k.kind !== s.lastMomentKind);
    const pick = pool[Math.floor(KP.hash01([state.seed, 'seasonMoment', state.week].join('|')) * pool.length)] || kinds[0];
    s.lastMomentKind = pick.kind;
    return pick.text();
  }
  // the show's name in a sentence: "THE FINAL LINEUP finale", "the STARFORGE finale"
  const showRef = s => (/^THE\b/i.test(s.show) ? '' : 'the ') + s.show;
  KP.seasonShowRef = showRef;

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
        (act.members || []).forEach(id => {
          const p = state.people[id];
          if (!p) return;
          const home = p.flags.seasonHome || {};
          delete p.flags.seasonHome;
          KP.chapter(state, p, 'projectEnd', { act: act.name, co: p.flags.onProject ? state.company.short : (home.company || null) });
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
        KP.retireAct(state, r, act, act.name + '’s project run ended');   // whoever was not re-homed goes on (v0.10.33)
        inbox.push({ kind: 'industry', ind: 'projectEnd', priority: 'high', actName: act.name,
          text: act.name + '’s run is over — the project contract ran out this week, as it was always going to. The members go back where they came from, which is the sentence every fandom dreads and every company counts on.' });
      });
      if (!(r.acts || []).some(a => !a.retired) && !KP.rivalFloor(state, r).length) {
        state.rivals = state.rivals.filter(x => x !== r);   // the house folds its tent until the next season
        if (KP.forgetCompany) KP.forgetCompany(state, r);
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
      const weekNo = state.week - s.startWeek;
      const weeksLeft = s.finaleWeek - state.week;
      const target = S.lineupSize + S.runnersUp;
      const toCut = Math.max(0, Math.ceil((field.length - target) / Math.max(1, weeksLeft)));
      const mission = S.MISSIONS[Math.max(0, Math.min(S.MISSIONS.length - 1, weekNo - 1))];
      // the ranking reveal (v0.11.4): every contestant's place this week, kept on the file
      const scored = field.map(c => ({ c, p: state.people[c.personId] }))
        .map(x => ({ x, score: weekScore(state, x.c, x.p, 'judge', state.week) }))
        .sort((a, b) => b.score - a.score);
      scored.forEach((row, i) => { row.x.c.ranks = (row.x.c.ranks || []).concat([i + 1]); });
      const line = field.length - toCut;   // the last safe rank this week
      const gone = [];
      scored.slice().reverse().slice(0, toCut).forEach(({ x }) => {
        x.c.eliminatedWeek = state.week;
        x.c.rank = field.length - gone.length;
        gone.push(x.p);
        touch(state, x.p, 'eliminated');
        x.p.morale = KP.clamp(x.p.morale + S.elimMorale, 0, 100);
        x.p.history.push({ week: state.week, text: 'Eliminated from ' + s.show + ' in week ' + (state.week - s.startWeek) + ', on national television. The public learned the name on the way out.' });
        KP.chapter(state, x.p, 'seasonOut', { show: s.show, weekNo: state.week - s.startWeek });
        if (x.c.source === 'player' && x.p.status === 'trainee' && (state.roster || []).includes(x.p.id)) {
          led.oursEliminated++;
          inbox.push({ kind: 'company', ind: 'seasonElim', priority: 'critical', personId: x.p.id,
            text: KP.fillPro(KP.displayName(x.p) + ' was eliminated from ' + s.show + ' last night — ' + mission + ', week ' + (state.week - s.startWeek) + ', ' + ordinal(x.c.rank) + ' of ' + field.length + ' at the reveal. {She} is back in the practice room Monday with ' +
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
      // the public's pick: the highest hype from the cast; a leader can take it
      const remaining = scored.filter(r => !r.x.c.eliminatedWeek);
      if (s.fanPick && !remaining.some(r => r.x.p.id === s.fanPick)) s.fanPick = null;
      if (remaining.length && (!s.fanPick || (remaining[0].x.p.id !== s.fanPick && KP.hash01([state.seed, 'pickflip', state.week].join('|')) < S.fanPickFlip))) {
        s.fanPick = remaining[0].x.p.id;
      }
      // the named moment, the arc on the line, the edit
      const moment = remaining.length ? momentOf(state, s, remaining, line, mission) : '';
      const ours = remaining.filter(r => r.x.c.source === 'player' && r.x.p.status === 'trainee' && (state.roster || []).includes(r.x.p.id));
      let danger = false;
      ours.forEach(r => {
        const c = r.x.c, p = r.x.p, rk = lastRank(c);
        if (rk <= S.topAt) p.morale = KP.clamp(p.morale + S.topMorale, 0, 100);
        if (rk >= line - S.nervesWithin) { p.morale = KP.clamp(p.morale - S.nervesMorale, 0, 100); danger = true; }
        // the edit: once a season, the producers decide what she is
        const editAt = S.editWeekMin + Math.floor(h(state, p, 'editAt', s.year) * (S.editWeekMax - S.editWeekMin + 1));
        if (!c.edit && weekNo === editAt && h(state, p, 'edit', s.year) < S.editChance) {
          c.edit = h(state, p, 'editKind', s.year) < 0.5 ? 'villain' : 'underdog';
          c.editWeek = state.week;
          led.edits = (led.edits || 0) + 1;
          KP.openScene(state, { kind: 'seasonEdit', personId: p.id, edit: c.edit, expiresWeek: state.week + 1 });
          inbox.push({ kind: 'company', opens: 'seasonEdit', ind: 'seasonEdit', priority: 'critical', personId: p.id, edit: c.edit,
            text: KP.fillPro(s.show + ' cut ' + KP.displayName(p) + ' ' + (c.edit === 'villain'
              ? 'the villain edit this week — a reaction shot, a line out of context, a caption that chose a side. The comments found {her} by midnight.'
              : 'the underdog edit this week — the practice-room footage, the late-night run, the mentor who said {she} was not ready and the clip of {her} proving otherwise. The nation is rooting.') +
              ' The desk can answer with a statement, or let it ride. The call is on the Desk; it answers within the week.', p) });
        }
      });
      // the episode: one letter a week, the shape of the night
      const leaderP = remaining.length ? remaining[0].x.p : null;
      const rankLine = ours.length
        ? ours.map(r => { const c = r.x.c, rk = lastRank(c), pv = prevRank(c);
            const move = pv == null ? '' : rk < pv ? ' (up ' + (pv - rk) + ')' : rk > pv ? ' (down ' + (rk - pv) + ')' : ' (holding)';
            return KP.displayName(r.x.p) + ' is ' + ordinal(rk) + ' of ' + remaining.length + move; }).join('; ') +
          '. The line falls at ' + ordinal(Math.max(1, KP.seasonLine(state) || line)) + ' next week.'
        : (leaderP ? KP.displayName(leaderP) + ' holds first' + (s.fanPick && s.fanPick !== leaderP.id && state.people[s.fanPick]
            ? '; the public’s pick is ' + KP.displayName(state.people[s.fanPick]) + '.' : ', and the public agrees.') : '');
      const goneLine = gone.length ? ' Gone: ' + gone.map(p => { const c = s.contestants.find(x => x.personId === p.id);
        return KP.displayName(p) + (c && c.source === 'rival' ? ' (' + c.company + ')' : c && c.source === 'school' ? ' (academy)' : c && c.source === 'player' ? ' (' + state.company.short + ')' : ''); }).join(', ') + '.' : ' Nobody went home.';
      inbox.push({ kind: ours.length ? 'company' : 'industry', ind: 'seasonEpisode', priority: ours.length ? (danger ? 'critical' : 'high') : 'normal',
        show: s.show, weekNo,
        text: s.show + ', episode ' + weekNo + ' — ' + mission + '. ' + rankLine + (moment ? ' ' + moment : '') + goneLine });
      inbox.push({ kind: 'public', feedOnly: true, ind: 'seasonWeek', show: s.show, weekNo,
        gone: gone.map(p => KP.displayName(p)), remaining: remaining.length,
        leader: leaderP ? KP.displayName(leaderP) : null, pick: s.fanPick && state.people[s.fanPick] ? KP.displayName(state.people[s.fanPick]) : null,
        mission, text: 'the season airs' });
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
        x.p.history.push({ week: state.week, text: 'Made ' + showRef(s) + ' finale and missed the lineup. The fandom that voted has not logged off.' });
        KP.chapter(state, x.p, 'seasonFinalist', { show: s.show });
        if (x.c.source === 'school') KP.seasonRevealStudent(state, x.p);
        if (x.c.source === 'player' && x.p.status === 'trainee' && (state.roster || []).includes(x.p.id)) inbox.push({ kind: 'company', ind: 'seasonFinalist', priority: 'high', personId: x.p.id,
          text: KP.fillPro(KP.displayName(x.p) + ' made ' + showRef(s) + ' finale and missed the lineup by a televised vote. {She} is yours again Monday — with a fandom that already has a name for itself.', x.p) });
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
        const stillOurs = p.status === 'trainee' && (state.roster || []).includes(p.id);   // whoever is on this roster tonight — a board kid signed mid-season included (v0.10.35)
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
            p.history.push({ week: state.week, text: 'Won ' + showRef(s) + ' lineup — and the broadcaster’s label kept it. Left ' + state.company.short + ' on the finale night, on television, to applause.' });
            inbox.push({ kind: 'company', ind: 'seasonKept', priority: 'critical', personId: p.id,
              text: KP.fillPro(KP.displayName(p) + ' made ' + showRef(s) + ' lineup — and this season the lineup is PERMANENT. The broadcaster’s label holds {pos} contract now; you held the tape. ' +
                'Every rival desk sent somebody knowing this could happen. So did you.', p) });
          } else {
            p.flags.onProject = { until: state.week + S.termWeeks, house: house.short, show: s.show };
            p.history.push({ week: state.week, text: 'Won ' + showRef(s) + ' lineup. A ' + S.termWeeks + '-week project run under the broadcaster’s label; the seat at ' + state.company.short + ' is held.' });
            inbox.push({ kind: 'company', ind: 'seasonLineup', priority: 'critical', personId: p.id,
              text: KP.fillPro(KP.displayName(p) + ' made ' + showRef(s) + ' lineup. The project group debuts under the broadcaster’s label for ' + S.termWeeks + ' weeks — {she} is theirs on stage and yours on paper until ' +
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
          p.history.push({ week: state.week, text: 'Won ' + showRef(s) + ' lineup' + (permanent ? ' — the broadcaster’s label keeps it.' : ' — a ' + S.termWeeks + '-week project run, then home.') });
        }
      });
      const made = KP.makeRivalAct(state, rng, house, { members: memberIds, gender: s.gender });
      if (made && !permanent) made.act.projectTerm = { until: state.week + S.termWeeks, show: s.show };
      if (made) made.act.season = s.year;
      memberIds.forEach(id => {
        const p = state.people[id];
        if (!p) return;
        KP.chapter(state, p, 'seasonLineup', { show: s.show, act: made ? made.act.name : null, permanent });
        if (permanent && p.flags.seasonHome && p.flags.seasonHome.keptFrom) KP.chapter(state, p, 'kept', { show: s.show, co: house.short });
      });
      s.actId = made ? made.act.id : null;
      s.houseShort = house.short;
      const names = lineup.map(({ x }) => KP.displayName(x.p));
      // the ceremony (v0.11.4): the ranks read in the order the stage read them
      const coOf = c => c.source === 'rival' ? c.company : c.source === 'player' ? state.company.short : c.source === 'school' ? 'academy' : 'unsigned';
      const readOut = field.slice().reverse().map(({ x }, i) => ordinal(field.length - i) + ' ' + KP.displayName(x.p) + ' (' + coOf(x.c) + ')').join(' · ');
      const oursInFinale = field.filter(({ x }) => x.c.source === 'player');
      const oursLine = oursInFinale.length ? ' ' + oursInFinale.map(({ x }) => KP.displayName(x.p) + ' finished ' + ordinal(x.c.rank) + (x.c.rank <= S.lineupSize ? ' — in the lineup.' : '.')).join(' ') : '';
      const pickP = s.fanPick ? state.people[s.fanPick] : null;
      const pickLine = pickP ? (lineup.some(({ x }) => x.p.id === pickP.id) ? ' The public’s pick, ' + KP.displayName(pickP) + ', made it; the voting app is a victory parade.' : ' The public’s pick, ' + KP.displayName(pickP) + ', missed the lineup; the word “robbed” trended before the credits.') : '';
      inbox.push({ kind: oursInFinale.length ? 'company' : 'industry', ind: 'seasonFinale', priority: oursInFinale.length ? 'critical' : 'high', show: s.show, permanent,
        text: showRef(s).charAt(0).toUpperCase() + showRef(s).slice(1) + ' finale, read in the order the stage read it: ' + readOut + '. The lineup: ' + names.join(', ') + (made ? ' — ' + made.act.name : '') + '. ' +
          (permanent ? 'And the roll came up PERMANENT: the broadcaster’s label keeps them. Five companies just lost a trainee each to a television show, and the fandom that voted is already buying lightsticks.'
            : 'A ' + S.termWeeks + '-week project run, then everyone goes home — which every fandom knows and refuses to believe.') +
          oursLine + pickLine + ' The finalists who missed the lineup are the morning’s favorite market.' });
      // the set makes a friend (the industry-friends system), and the scouts have a finalist's number
      field.forEach(({ x }) => {
        if (x.c.source !== 'player' || !(state.roster || []).includes(x.p.id)) return;
        const others = field.filter(o => o.x.p.id !== x.p.id && o.x.c.source !== 'player');
        if (others.length && !(state.industryFriends || []).some(f => f.a === x.p.id || f.b === x.p.id)) {
          const friend = others[Math.floor(h(state, x.p, 'setFriend', s.year) * others.length)].x.p;
          state.industryFriends = state.industryFriends || [];
          state.industryFriends.push({ a: x.p.id, b: friend.id, actId: made ? made.act.id : null, since: state.week, how: 'season' });
          x.p.history.push({ week: state.week, text: 'Made a real friend on the ' + s.show + ' set: ' + KP.displayName(friend) + '. Three months of dorm rooms and cut lines; the number stays.' });
        }
        if (x.c.rank > S.lineupSize) {
          KP.signingHouses(state).slice().sort((a, b) => (b.prestige || 0) - (a.prestige || 0)).slice(0, 2).forEach(r => {
            r.interest = r.interest || {}; r.interest[x.p.id] = Math.max(r.interest[x.p.id] || 0, S.finalistInterest);
          });
        }
      });
      s.contestants.forEach(c => { const p = state.people[c.personId]; if (p) delete p.flags.onSeason; });
      return;
    }
  });

  // ---- the doors during the run (v0.11.4, §95) ------------------------------
  function ourAlive(state, personId) {
    const s = state.season;
    if (!s || s.status !== 'airing') return { ok: false, reason: 'No season is on the air.' };
    const c = (s.contestants || []).find(x => x.personId === personId && x.source === 'player');
    if (!c || c.eliminatedWeek) return { ok: false, reason: 'She is not on the show.' };
    const p = state.people[personId];
    if (!p || !(state.roster || []).includes(p.id)) return { ok: false, reason: 'She is not on the roster.' };
    return { ok: true, s, c, p };
  }
  // the vote push: the fandom machinery, bought — three a season, thinner each time
  KP.seasonPushRead = function (state, personId) {
    const S = KP.C.COMPETITION;
    const r = ourAlive(state, personId);
    if (!r.ok) return r;
    if ((r.c.pushes || 0) >= S.pushScores.length) return { ok: false, reason: 'Three pushes a season is the ceiling. The app has seen the pattern.' };
    if (r.c.pushWeek === state.week) return { ok: false, reason: 'The push is already running this week.' };
    if (state.budget < S.pushCost) return { ok: false, reason: 'A push bills ' + S.pushCost + '. The account says no.' };
    return { ok: true, cost: S.pushCost, left: S.pushScores.length - (r.c.pushes || 0) };
  };
  KP.seasonPush = function (state, personId) {
    const S = KP.C.COMPETITION;
    const read = KP.seasonPushRead(state, personId);
    if (!read.ok) return read;
    const { s, c, p } = ourAlive(state, personId);
    state.budget -= S.pushCost;
    if (KP.ledgerFlow) KP.ledgerFlow(state, 'marketing', -S.pushCost);
    c.pushes = (c.pushes || 0) + 1;
    c.pushWeek = state.week;
    c.pushScore = S.pushScores[c.pushes - 1];
    ledger(state).pushes = (ledger(state).pushes || 0) + 1;
    // the edit may call it: company money is a story the show loves
    const called = h(state, p, 'pushCalled', state.week) < S.pushCalledChance;
    if (called) {
      p.hype = KP.clamp((p.hype || 0) + S.pushCalledHype, 0, 100);
      c.pushCalled = state.week;
      KP.note(state, { kind: 'public', ind: 'seasonPushCalled', priority: 'high', personId: p.id,
        text: KP.fillPro(showRef(s).charAt(0).toUpperCase() + showRef(s).slice(1) + ' recap caught the push: a graphic, a pause, “company money.” ' + KP.displayName(p) + '’s votes are up and {pos} comments are a courtroom.', p) });
    }
    return { ok: true, called, note: 'The voting push runs this week — ' + (c.pushes === 1 ? 'the first' : c.pushes === 2 ? 'the second' : 'the last') + ' of the season' + (called ? ', and the edit noticed.' : '.') };
  };
  // the coach visit: the chair flies out; the room at home trains thinner that week
  KP.seasonCoachRead = function (state, personId) {
    const S = KP.C.COMPETITION;
    const r = ourAlive(state, personId);
    if (!r.ok) return r;
    const seat = (state.seats || {}).vocal ? 'vocal' : (state.seats || {}).dance ? 'dance' : null;
    if (!seat) return { ok: false, reason: 'No vocal or dance chair to send.' };
    if (r.c.coachWeek === state.week) return { ok: false, reason: 'The coach is already on the set this week.' };
    if (state.coachAway && state.coachAway.week === state.week) return { ok: false, reason: 'One chair flies out a week.' };
    if (state.budget < S.coachCost) return { ok: false, reason: 'The trip bills ' + S.coachCost + '. The account says no.' };
    return { ok: true, seat, cost: S.coachCost };
  };
  KP.seasonCoach = function (state, personId) {
    const S = KP.C.COMPETITION;
    const read = KP.seasonCoachRead(state, personId);
    if (!read.ok) return read;
    const { s, c, p } = ourAlive(state, personId);
    state.budget -= S.coachCost;
    if (KP.ledgerFlow) KP.ledgerFlow(state, 'signings', -S.coachCost);
    c.coachWeek = state.week;
    state.coachAway = { seat: read.seat, week: state.week };
    ledger(state).coached = (ledger(state).coached || 0) + 1;
    const st = state.seats[read.seat];
    return { ok: true, note: (st ? st.name : 'The coach') + ' flies out to the ' + s.show + ' set for ' + KP.displayName(p) + '’s week. The practice room at home runs on the assistants.' };
  };
  // the withdrawal: she comes home before the show is done with her
  KP.seasonWithdraw = function (state, personId) {
    const S = KP.C.COMPETITION;
    const r = ourAlive(state, personId);
    if (!r.ok) return r;
    const { s, c, p } = r;
    const field = aliveOf(state, s).length;
    c.eliminatedWeek = state.week; c.rank = field; c.withdrawn = true;
    p.morale = KP.clamp(p.morale + S.withdrawMorale, 0, 100);
    p.hype = Math.round((p.hype || 0) * S.withdrawHypeMult);
    delete p.flags.onSeason;
    p.seasonRecord = { show: s.show, year: s.year, result: 'withdrawn' };
    KP.chapter(state, p, 'seasonOut', { show: s.show, weekNo: state.week - s.startWeek, withdrawn: true });
    p.history.push({ week: state.week, text: 'Pulled out of ' + s.show + ' in week ' + (state.week - s.startWeek) + ' by the company. The show ran a caption. The fandom ran a thread.' });
    ledger(state).withdrawn = (ledger(state).withdrawn || 0) + 1;
    if (state.scenes) state.scenes = state.scenes.filter(sc => !(sc.kind === 'seasonEdit' && sc.personId === p.id));
    KP.note(state, { kind: 'company', ind: 'seasonWithdrawn', priority: 'critical', personId: p.id,
      text: KP.fillPro(KP.displayName(p) + ' is out of ' + s.show + ' — the company pulled {her} in week ' + (state.week - s.startWeek) + '. The caption said “schedule conflict.” The timeline said other things. {She} is in the practice room Monday, quieter than {she} left.', p) });
    return { ok: true };
  };
  // the edit: the producers decided what she is; the desk decides what to say
  KP.registerScene('seasonEdit', {
    title: (state, sc) => { const p = state.people[sc.personId]; return (p ? KP.displayName(p) : 'The edit') + ' · the edit'; },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      const S = KP.C.COMPETITION;
      if (!p) return '';
      return KP.fillPro(sc.edit === 'villain'
        ? 'The show has decided ' + KP.displayName(p) + ' is this season’s villain: the reaction shots, the subtitles, the music under {pos} interviews. It costs votes every week it runs. A statement from the company (' + S.editStatementCost + ') ends the story at the price of looking defensive; letting it ride keeps {her} in the edit, and the villain who survives is a star.'
        : 'The show has decided ' + KP.displayName(p) + ' is this season’s underdog: the late-night footage, the mentor who doubted, the clip of {her} proving otherwise. The nation is rooting and the votes show it. A statement from the company would only remind everyone there is a company; the underdog story is the one thing money cannot buy.', p);
    },
    options: (state, sc) => [
      { id: 'ride', label: 'Let it ride' },
      ...(state.budget >= KP.C.COMPETITION.editStatementCost ? [{ id: 'statement', label: 'Put out a statement · ' + KP.C.COMPETITION.editStatementCost }] : []),
    ],
    resolve: (state, sc, optionId) => {
      const S = KP.C.COMPETITION;
      const p = state.people[sc.personId];
      const s = state.season;
      const c = s && (s.contestants || []).find(x => x.personId === sc.personId);
      if (!p || !c) return { toast: 'The moment passed.' };
      if (optionId === 'statement') {
        state.budget -= S.editStatementCost;
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'marketing', -S.editStatementCost);
        c.editAnswered = true;
        p.hype = KP.clamp((p.hype || 0) + S.editStatementHype, 0, 100);
        ledger(state).statements = (ledger(state).statements || 0) + 1;
        return { toast: sc.edit === 'villain'
          ? 'The statement ran. The edit lost its subject; the comments lost their fun. The votes stopped bleeding — and the story that would have made her is over.'
          : KP.fillPro('The statement ran, and the underdog story died on the spot: there was a company all along. {She} is just a contestant again.', p) };
      }
      c.editRode = true;
      return { toast: sc.edit === 'villain'
        ? KP.fillPro('You let it ride. The edit will cost {her} for a few weeks. If {she} survives it, {she} survives it on camera — and the public remembers who did not flinch.', p)
        : KP.fillPro('You let it ride. The nation keeps rooting; the votes keep coming. Nobody mentions the company, which is the point.', p) };
    },
    expire: (state, sc) => {
      const s = state.season;
      const c = s && (s.contestants || []).find(x => x.personId === sc.personId);
      if (c) c.editRode = true;
      return null;   // silence lets it ride
    },
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
      { persona: 'stan', text: (gone ? gone + ' eliminated from ' + n.show + ' week ' + n.weekNo + ' is the robbery of the decade. SOMEBODY sign them. ' : n.show + ' week ' + n.weekNo + ' and my kid survived. ') + 'rank reveal at midnight' },
      ...(n.leader ? [{ persona: 'stan', text: n.leader + ' holding first on ' + n.show + ' after ' + n.mission + '. the gap is not closing. the gap is a lifestyle' }] : []),
      ...(n.pick ? [{ persona: 'fan', text: 'the ' + n.show + ' fan pick is ' + n.pick + ' and it is not close. the fancams have fancams. the voting app crashed twice' }] : []),
      ...(n.mission ? [{ persona: 'casual', text: n.show + ' did ' + n.mission + ' this week and I have never cared about a key change this much in my life. ' + n.remaining + ' left' }] : []),
      ...(n.pick && n.leader && n.pick !== n.leader ? [{ persona: 'anti', text: n.show + ': the judges have ' + n.leader + ' first, the internet has ' + n.pick + ' first. one of these groups votes at 2am. guess which' }] : []),
    ]);
  });
  KP.onFeedEvent('seasonEdit', (state, n, rng) => {
    const p = state.people[n.personId];
    if (!p) return null;
    return rng.pick(n.edit === 'villain' ? [
      { persona: 'anti', text: KP.fillPro('the ' + KP.publicGiven(p) + ' edit this week was a crime scene. one reaction shot, one caption, and {she} is the villain of the season. editors are the real contestants', p) },
      { persona: 'fan', text: KP.fillPro('they gave ' + KP.publicGiven(p) + ' the VILLAIN EDIT and I have the full clip and {she} was being NICE. timestamps in the replies. defending with my life', p) },
    ] : [
      { persona: 'fan', text: KP.fillPro(KP.publicGiven(p) + ' underdog edit. the practice-room footage. the mentor who said no. I am sobbing at a survival show at 1am and I regret nothing', p) },
      { persona: 'casual', text: 'the show found its underdog and it is ' + KP.publicGiven(p) + '. the nation has adopted a child. the nation does this every year and never learns' },
    ]);
  });
  KP.onFeedEvent('seasonPushCalled', (state, n, rng) => {
    const p = state.people[n.personId];
    return p ? { persona: 'anti', text: 'the “company money” graphic on ' + KP.publicGiven(p) + '’s votes… the show said it so I don’t have to. anyway the votes are real and so is the invoice' } : null;
  });
  KP.onFeedEvent('seasonWithdrawn', (state, n, rng) => {
    const p = state.people[n.personId];
    return p ? { persona: 'fan', text: KP.fillPro(KP.publicGiven(p) + ' pulled from the show mid-season by {pos} own company. “schedule conflict.” sure. the thread has 4k replies and none of them believe it', p) } : null;
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
