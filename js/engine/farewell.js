/* The long goodbye (v0.11.10, §101). A chosen ending used to be a flag: the
   renewal table set `contract.leaving`, nothing read it for up to two years,
   and the week she went was one letter. This module makes the ending a LAP
   with a date on it and three readers: the member desk (one question: how
   the fans are told), the release (her last era), and the stage (her last
   one). The exit reads the lap back. No draw is made anywhere in this file:
   every pick is a hash or a voice. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  KP.farewellLedger = function (state) {
    state.farewellLedger = state.farewellLedger || { laps: 0, asked: 0, toldNow: 0, keptIn: 0, unanswered: 0,
      toldByEra: 0, eras: 0, shadows: 0, lastStages: 0, bows: 0, plain: 0, sudden: 0, kept: 0, broken: 0 };
    return state.farewellLedger;
  };

  // ---- the lap: what the table wrote, with its date ------------------------
  // the last week is the clock's own (the seventh year, counted from a start
  // that service pauses), so it is derived and never stored
  KP.lapOf = function (state, p) {
    if (!p || p.status !== 'idol' || !p.contract || !p.contract.leaving) return null;
    const c = p.contract;
    const ends = c.start + KP.C.CONTRACT.years * KP.C.WEEKS_PER_YEAR;
    return { ends, weeksLeft: Math.max(0, ends - state.week), mode: c.leaveMode || 'warm',
      since: c.leavingSince == null ? null : c.leavingSince,
      told: c.told || null, toldWeek: c.toldWeek == null ? null : c.toldWeek,
      era: c.farewellEra || null, stage: c.lastStage || null };
  };
  // the fans know: she said it, or the last era's announcement did
  const known = lap => lap.told === 'fans' || lap.told === 'era';
  // a record landing this close to her last week is her last era
  const inWindow = (lap, week) => week <= lap.ends && lap.ends - week <= KP.C.FAREWELL.lastEraWeeks;
  // a lap the company can stage: warm, in a group that is still a group
  function stagedLap(state, p) {
    const lap = KP.lapOf(state, p);
    if (!lap || lap.mode !== 'warm') return null;
    const g = KP.groupOf(state, p.id);
    if (!g || g.type === 'solo' || !g.debuted || g.retiredWeek || g.members.length < 2) return null;
    return Object.assign(lap, { g });
  }
  KP.farewellLap = stagedLap;
  const names = (state, ids) => {
    const ns = ids.map(id => KP.displayName(state.people[id]));
    return ns.length <= 1 ? ns.join('') : ns.slice(0, -1).join(', ') + ' and ' + ns[ns.length - 1];
  };

  // ---- the member desk: how the fans are told ------------------------------
  // one question per lap, through the one queue. An event, not a roll: it
  // waits its turn behind the walkout and the clamor and then it is asked.
  KP.registerKnock('farewell', ['farewellNews'], function (state) {
    const F = KP.C.FAREWELL;
    const out = [];
    state.roster.forEach(id => {
      const p = state.people[id];
      if (!p || KP.onBreak(p) || (p.flags && p.flags.military)) return;
      const lap = stagedLap(state, p);
      if (!lap || lap.told || lap.era || lap.weeksLeft < F.askMinWeeks) return;
      out.push({ kind: 'farewellNews', personId: p.id, priority: 1, weight: 7, expiresIn: 3,
        onPick: (st) => { KP.farewellLedger(st).asked++; } });
    });
    return out;
  });

  // how she raises it, by voice
  const ASKS = {
    blunt: '{She} does not sit down. “Somebody has to tell them. I would rather it was me than a statement.”',
    sunshine: '{She} brought the good biscuits, which is how you know it is a hard conversation.',
    deadpan: '{She} slides a sheet of paper across the desk. It is a calendar with one week circled. {She} says nothing else for a while.',
    gremlin: '{She} opens with a bit about faking {pos} own retirement tour, gets to the end of it, and stops smiling.',
    softspoken: '{She} asks if this is a good time. It is not, and it is the only one there is.',
    earnest: '{She} has written it out, both ways, on two index cards, and holds one in each hand.',
    wry: '“So,” {she} says, “do I get a press release, or do I just stop appearing in photos?”',
  };
  function tell(state, p, g, how) {
    const c = p.contract, L = KP.farewellLedger(state);
    c.told = how; c.toldWeek = state.week;
    if (how === 'fans') L.toldNow++;
    if (how === 'era') L.toldByEra++;
    // the question leaves the desk when the answer is out, wherever it came from
    if (state.scenes) state.scenes = state.scenes.filter(sc => !(sc.kind === 'farewellNews' && sc.personId === p.id));
  }
  KP.registerScene('farewellNews', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'The') + ' · the last year';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      const lap = p ? KP.lapOf(state, p) : null;
      if (!p || !lap) return 'The year has moved on.';
      const g = KP.groupOf(state, p.id);
      return KP.fillPro((ASKS[KP.voiceOf(state, p)] || ASKS.earnest) + ' {Pos} contract ends ' + KP.weekLabel(lap.ends).text +
        ', the building knows, and the fandom does not. Tell them now and {she} says it {herself}: the cafés rally, the last era becomes an event, and every record before it is a countdown. Keep it in the house until the last era is announced and the year stays about the work' +
        (g ? ' for ' + g.name : '') + '; if that last era never comes, the fandom learns it from a statement.', p);
    },
    options: () => [
      { id: 'house', label: 'Keep it in-house until the last era' },
      { id: 'now', label: 'Tell the fans now' },
    ],
    resolve: (state, sc, optionId) => {
      const F = KP.C.FAREWELL;
      const p = state.people[sc.personId];
      const lap = p ? stagedLap(state, p) : null;
      if (!p || !lap) return { toast: 'The year has moved on.' };
      const g = lap.g;
      if (optionId === 'now') {
        tell(state, p, g, 'fans');
        KP.fandomGain(g, F.toldIntensity);
        g.popularity = KP.clamp((g.popularity || 0) - F.toldPopHit, 0, 100);
        p.morale = KP.clamp(p.morale + F.toldMorale, 0, 100);
        KP.recordDirected(state, p.id, 'saidItHerself');
        return { toast: KP.fillPro('{She} wrote it {herself}, in one evening, and asked for nothing to be changed. It goes up at noon.', p),
          note: { kind: 'public', ind: 'farewellTold', priority: 'high', personId: p.id, groupId: g.id, by: 'fans',
            text: KP.fillPro(KP.displayName(p) + ' told the fandom {herself}: {pos} contract with ' + state.company.short + ' ends ' + KP.weekLabel(lap.ends).text +
              ', and {she} will not be renewing it. The letter went up at noon and the cafés had a project name by one. Every ' + g.name +
              ' stage from here is counted, out loud, by people who are going to be at all of them.', p) } };
      }
      tell(state, p, g, 'house');
      KP.farewellLedger(state).keptIn++;
      return { toast: KP.fillPro('It stays in the building. {She} nodded: the year is about the work, and the news rides with the last record.', p) };
    },
    // silence keeps the secret by default, and she noticed who decided
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      const lap = p ? stagedLap(state, p) : null;
      if (!p || !lap) return null;
      tell(state, p, lap.g, 'house');
      KP.farewellLedger(state).unanswered++;
      KP.recordDirected(state, p.id, 'leftWaiting');
      return { kind: 'development', priority: 'high', personId: p.id,
        text: KP.fillPro(KP.displayName(p) + ' asked how the fans would be told that {she} is leaving, and nobody answered. The building keeps the secret by default now. {She} noticed that the decision was made by nobody.', p) };
    },
  });

  // ---- the release: her last era -------------------------------------------
  // a lock that lands inside her window says so in its announcement: an
  // in-house lap is told here, with the record that will be her last
  // whose last era a record landing that week would be (pure: the Studio's
  // date picker reads it before anything is locked)
  KP.farewellWould = function (state, g, week) {
    if (!g || g.type === 'solo' || !g.debuted) return [];
    return g.members.filter(id => {
      const lap = stagedLap(state, state.people[id]);
      return !!lap && !lap.era && inWindow(lap, week);
    });
  };
  KP.farewellLockTells = function (state, g, scheduledWeek) {
    const ids = KP.farewellWould(state, g, scheduledWeek);
    ids.forEach(id => {
      const p = state.people[id];
      if (!known(KP.lapOf(state, p))) tell(state, p, g, 'era');
    });
    if (ids.length) {
      KP.note(state, { kind: 'public', ind: 'farewellTold', priority: 'high', personId: ids[0], groupId: g.id, by: 'era',
        text: 'The announcement carries a second line: the record landing ' + KP.weekLabel(scheduledWeek).text + ' is ' + names(state, ids) + '’s last with ' + g.name +
          '. The contract' + (ids.length > 1 ? 's end' : ' ends') + ' ' + KP.weekLabel(Math.min.apply(null, ids.map(id => KP.lapOf(state, state.people[id]).ends))).text +
          ', the statement says so in the first sentence, and the fandom is reading the tracklist for the goodbye before there is a tracklist.' });
    }
    return ids;
  };
  // the landing reads the lap (hiatusReadsRelease's shape). Her last era
  // lands warmer, and warmer the longer the fans have known. A record that
  // lands before the window on a lap she announced is a countdown record:
  // the press day was about the member who is leaving.
  KP.farewellReadsRelease = function (state, g, isDebut) {
    const F = KP.C.FAREWELL;
    const out = { mod: 0, note: null, ids: [] };
    if (isDebut || !g || g.type === 'solo' || !g.debuted || g.members.length < 2) return out;
    let knownWeeks = 0;
    const counting = [];
    g.members.forEach(id => {
      const p = state.people[id];
      const lap = stagedLap(state, p);
      if (!lap || lap.era) return;
      if (inWindow(lap, state.week)) {
        // a lock from before the lap, or one nobody announced: the landing tells
        if (!known(lap)) tell(state, p, g, 'era');
        knownWeeks = Math.max(knownWeeks, state.week - p.contract.toldWeek);
        out.ids.push(id);
      } else if (lap.told === 'fans') counting.push(id);
    });
    const L = KP.farewellLedger(state);
    if (out.ids.length) {
      out.mod = F.eraReach + Math.min(F.eraCap, Math.round(knownWeeks * F.eraPerWeek));
      out.ids.forEach(id => { state.people[id].contract.farewellEra = { week: state.week }; });
      KP.fandomGain(g, F.eraIntensity);
      L.eras++;
      out.note = 'This is ' + names(state, out.ids) + '’s last era with ' + g.name + ', and it was bought like one: ' +
        (knownWeeks >= 12 ? 'the fandom has known for months and saved for it.' : 'the fandom has known since the announcement and is not wasting a week of it.');
    } else if (counting.length) {
      out.mod = -F.shadowReach;
      L.shadows++;
      out.note = 'Every question at the press day was about ' + names(state, counting) + ' leaving. The record landed inside a countdown, and a countdown is a hard thing to sell a new song over.';
    }
    return out;
  };

  // ---- the stage: her last one ---------------------------------------------
  // read at the close (order 597, behind the era's own close at 596): an
  // extension can add a stage in the last promotion week, so only the close
  // knows which one was last
  const AFTER = {
    blunt: 'Asked in the corridor what {she} would miss, {she} said “the in-ears, ours are worse,” and then stood in the wings for one more song after the cameras cut.',
    sunshine: '{She} hugged the camera director, both floor managers and a lighting rig, in that order, and thanked the audience by section.',
    deadpan: '{She} bowed exactly as long as the rundown allowed, said “that was the last one” to nobody in particular, and went to find {pos} coat.',
    gremlin: '{She} did the ending pose, held it two seconds past the cut, and then did the trainee-year version of it for the fancams.',
    softspoken: '{She} said thank you to the stage itself, quietly, with the microphone already off. The front row heard it anyway.',
    earnest: '{She} had a list of every staff member to thank and got through all of it, in the hallway, with the next act waiting.',
    wry: '“Seven years,” {she} told the fancams, “and they still gave us the dressing room by the loading dock.” Then {she} stopped being able to talk.',
  };
  const BAND = {
    carried: (p, me, other) => me ? '{She} carried it, which is the only way {she} was ever going to leave that stage. '
      : (other ? other + ' carried it and handed {her} the ending pose. ' : 'It was carried, and the ending pose was {hers}. '),
    clean: () => 'It was clean: every count where it has been for years. ',
    shaky: () => 'It wobbled, the way a stage does when half of it is trying not to cry. ',
    fumbled: () => 'It was fumbled, and nobody in the building will let that be the clip that gets kept. ',
  };
  KP.lastStageNote = function (state, g, rel, p) {
    const ls = rel.lastStage;
    const who = ls.carried ? state.people[ls.carried] : null;
    const band = BAND[ls.band] ? BAND[ls.band](p, !!who && who.id === p.id, who && who.id !== p.id ? KP.displayName(who) : null) : '';
    return { kind: 'public', ind: 'lastStage', priority: 'critical', personId: p.id, groupId: g.id, band: ls.band,
      text: KP.fillPro(KP.displayName(p) + ' has taken {pos} last music-show stage with ' + g.name + ': ' +
        (KP.showLabel ? KP.showLabel(ls.showId) : 'the last show') + ', ' + KP.weekLabel(ls.week).text + '. ' + band +
        (AFTER[KP.voiceOf(state, p)] || AFTER.earnest), p) };
  };
  KP.registerWeekly('lastStage', 597, function (state, rng, inbox, roster, groups) {
    groups.forEach(g => {
      if (g.retiredWeek || !g.debuted || !(g.releases || []).length) return;
      const rel = g.releases[g.releases.length - 1];
      if (!rel.closed || rel.closed.week !== state.week || !(rel.farewellFor || []).length || !rel.lastStage) return;
      rel.farewellFor.forEach(id => {
        const p = state.people[id];
        if (!p || !g.members.includes(id) || !KP.lapOf(state, p) || p.contract.lastStage) return;
        p.contract.lastStage = { week: rel.lastStage.week, showId: rel.lastStage.showId, band: rel.lastStage.band };
        KP.farewellLedger(state).lastStages++;
        inbox.push(KP.lastStageNote(state, g, rel, p));
      });
    });
  });

  // ---- the promise: "write the ending right" has a date on it ---------------
  // opened by the table's farewell answer; kept by her last era landing.
  // Settled at the exit (below), because departIdol voids every open claim
  // on her file: this predicate only heals a claim whose subject is gone.
  KP.registerClaim('farewellEra', (state, c) => {
    const p = state.people[c.personId];
    if (!p || p.status !== 'idol' || !p.contract || !p.contract.leaving) return { resolved: 'void', notes: [] };
    return null;
  });
  KP.farewellPromise = function (state, p) {
    const lap = KP.lapOf(state, p);
    if (!lap) return null;
    return KP.openClaim(state, { type: 'farewellEra', subject: { kind: 'idol', id: p.id }, personId: p.id, byWeek: lap.ends,
      label: KP.fillPro('the ending written right — a last era before {she} goes', p) });
  };

  // ---- the exit reads the lap back ------------------------------------------
  const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const num = n => (n >= 0 && n < NUM.length ? NUM[n] : String(n));
  // a span of weeks in the calendar's own units (weeks are public)
  function span(weeks) {
    const y = Math.floor(weeks / KP.C.WEEKS_PER_YEAR), m = Math.floor((weeks % KP.C.WEEKS_PER_YEAR) / KP.C.WEEKS_PER_MONTH);
    const ys = y ? num(y) + ' year' + (y === 1 ? '' : 's') : '', ms = m ? num(m) + ' month' + (m === 1 ? '' : 's') : '';
    return ys && ms ? ys + ' and ' + ms : ys || ms || 'a few weeks';
  }
  // the facts the bow reads, each from the file that already keeps it
  KP.farewellFacts = function (state, p, g) {
    const c = p.contract || {};
    const joined = ((p.chapters || []).find(ch => ch.kind === 'debut' && ch.group === g.name) || {}).week;
    const eras = (g.releases || []).filter(r => joined == null || r.week >= joined).map(r => r.songTitle);
    let centerWeeks = 0;
    (g.centerHistory || []).forEach((e, i, all) => {
      if (e.id !== p.id) return;
      const from = Math.max(e.week, g.debutWeek == null ? e.week : g.debutWeek);
      const to = i + 1 < all.length ? all[i + 1].week : state.week;
      centerWeeks += Math.max(0, to - from);
    });
    const trophies = Object.keys(g.trophies || {}).reduce((n, k) => n + (g.trophies[k] || 0), 0);
    const friend = g.members.filter(id => id !== p.id).map(id => state.people[id]).filter(Boolean)
      .map(m => ({ m, rel: (state.relationships || {})[KP.pairKey(p, m)] }))
      .filter(x => x.rel && x.rel.state === 'close')
      .sort((a, b) => b.rel.score - a.rel.score || (a.m.id < b.m.id ? -1 : 1))[0];
    let written = 0;
    KP.groups(state).forEach(gg => (gg.releases || []).forEach(r => (r.tracklist || []).forEach(tr => { if (tr.writtenBy === p.id) written++; })));
    const credits = KP.trackCreditsOf ? KP.trackCreditsOf(state, p.id).length : 0;
    return { stage: c.lastStage || null, eras, centerWeeks, trophies, friendId: friend ? friend.m.id : null, written, credits };
  };
  // the bow, read the way a finale is read: last thing first
  KP.farewellBow = function (state, p, g) {
    const f = KP.farewellFacts(state, p, g);
    const q = t => '“' + t + '”';
    const parts = [KP.displayName(p) + '’s contract completed today, and the bow was read the way a finale is read, last thing first.'];
    parts.push(f.stage
      ? 'The last stage: ' + (KP.showLabel ? KP.showLabel(f.stage.showId) : 'the last show') + ', ' + KP.weekLabel(f.stage.week).text +
        ({ carried: ', carried', clean: ', clean', shaky: ', and it wobbled', fumbled: ', and nobody is keeping that clip' }[f.stage.band] || '') + '.'
      : 'There was no last stage to read: the era ended off the schedule.');
    const e = f.eras.slice().reverse();
    if (e.length === 1) parts.push('The last era was also the first: ' + q(e[0]) + '.');
    else if (e.length === 2) parts.push('The last era: ' + q(e[0]) + '. Before it, ' + q(e[1]) + ', where it started.');
    else if (e.length === 3) parts.push('The last era: ' + q(e[0]) + '. Before it, ' + q(e[1]) + ', and back to ' + q(e[2]) + ', where it started.');
    else if (e.length > 3) parts.push('The last era: ' + q(e[0]) + '. Before it, ' + q(e[1]) + ' and ' + q(e[2]) + ', ' +
      (e.length > 4 ? num(e.length - 4) + ' more behind those, ' : '') + 'and back to ' + q(e[e.length - 1]) + ', where it started.');
    if (f.centerWeeks >= KP.C.WEEKS_PER_MONTH) parts.push(span(f.centerWeeks).replace(/^./, ch => ch.toUpperCase()) + ' of it at the center.');
    if (f.trophies) parts.push(num(f.trophies).replace(/^./, ch => ch.toUpperCase()) + ' ' + (f.trophies === 1 ? 'trophy' : 'trophies') + ' on the shelf with {pos} fingerprints on ' + (f.trophies === 1 ? 'it' : 'them') + '.');
    if (f.friendId) parts.push('{She} leaves ' + KP.displayName(state.people[f.friendId]) + ' the other half of every inside joke.');
    if (f.written) parts.push('{She} keeps {pos} chair in the writing room in the only way that counts: ' + num(f.written) + ' ' + (f.written === 1 ? 'song here carries' : 'songs here carry') + ' {pos} name, and the checks will keep finding {her}.');
    else if (f.credits) parts.push('{She} keeps {pos} name in the booklet, ' + (f.credits === 1 ? 'once' : num(f.credits) + ' times over') + '.');
    parts.push('The letter is in {pos} own handwriting, dated ' + KP.weekLabel(state.week).text + ', and its last line is the one {she} asked for: the door stays open.');
    return KP.fillPro(parts.join(' '), p);
  };
  // called by departIdol BEFORE the lineup forgets her. Returns null for an
  // exit this module has no words for (a cold one); otherwise the shape of
  // the goodbye, its letter, and what it costs or gives the room.
  KP.farewellAtExit = function (state, p, g, warm) {
    if (!warm || !p.contract) return null;
    const F = KP.C.FAREWELL, L = KP.farewellLedger(state);
    const c = p.contract;
    const out = { shape: 'plain', priority: 'high', pop: 0, grudge: 0, roomMorale: 0, text: null, promise: null };
    // she asked to go early and was let go: not a completed contract
    if (!c.leaving) {
      out.shape = 'released';
      out.text = KP.fillPro(KP.displayName(p) + ' asked to be released from {pos} contract, and was. The company statement is short and kind; {pos} own letter to the fans is longer and kinder, and neither one says why. {She} leaves on speaking terms with everyone in the building, which is its own kind of ending. The door stays open.', p);
      return out;
    }
    const group = !!g && g.type !== 'solo' && g.debuted;
    const claim = (state.claims || []).find(x => !x.resolved && x.type === 'farewellEra' && x.personId === p.id);
    if (claim) {
      claim.resolved = c.farewellEra ? 'met' : 'missed';
      claim.resolvedWeek = state.week;
      out.promise = claim.resolved;
      if (c.farewellEra) { L.kept++; KP.recordDirected(state, p.id, 'promiseKept'); }
      else { L.broken++; KP.recordDirected(state, p.id, 'promiseBroken'); out.roomMorale -= F.brokenRoomMorale; }
    }
    const broken = out.promise === 'missed'
      ? ' The last era the company promised {her} at the renewal table never came, and everyone left in the room watched it not come.' : '';
    if (group && c.farewellEra) {
      out.shape = 'bow'; out.priority = 'critical'; out.roomMorale += F.bowRoomMorale;
      L.bows++;
      out.text = KP.farewellBow(state, p, g);
      if (claim) claim.replyText = KP.fillPro('{She} got the last era the table promised {her}.', p);
    } else if (group && c.told !== 'fans' && c.leavingSince != null &&
        (c.start + KP.C.CONTRACT.years * KP.C.WEEKS_PER_YEAR) - c.leavingSince >= F.askMinWeeks) {
      // the company had the year and the fandom got a day
      out.shape = 'sudden'; out.pop = F.suddenPopHit; out.grudge = F.suddenGrudge;
      L.sudden++;
      out.text = KP.fillPro(KP.displayName(p) + '’s contract completed today, and today is when the fandom found out. There is a letter in {pos} own handwriting and nobody was given the year to get ready to read it: no last era, no last stage with a name on it, a goodbye that fits in one afternoon.' + broken +
        ' {She} leaves on good terms with the building. The cafés are asking who knew, and for how long. The door stays open.', p);
    } else {
      L.plain++;
      out.text = KP.fillPro(KP.displayName(p) + '’s contract completed today, and the goodbye was everything the fandom needed it to be: the letter in {pos} own handwriting, the members crying through the last group bow, the company statement that read like it was written by a person.' + broken +
        ' {She} leaves full, not empty. The door stays open.', p);
    }
    if (claim && out.promise === 'missed') claim.replyText = KP.fillPro('The date came and the last era did not. {She} left without it.', p);
    return out;
  };

  // ---- the read: one truth for Today's card and the file's line ----------
  // where the telling stands, and where her last era stands, in words the
  // surfaces print. Pure: it writes nothing.
  KP.farewellRead = function (state) {
    const F = KP.C.FAREWELL;
    const out = [];
    (state.roster || []).forEach(id => {
      const p = state.people[id];
      const lap = KP.lapOf(state, p);
      if (!lap) return;
      const g = KP.groupOf(state, p.id);
      const staged = !!stagedLap(state, p);
      const opens = lap.ends - F.lastEraWeeks;
      const when = w => KP.weekLabel(w).text;
      const toldWord = lap.mode !== 'warm' ? 'leaving cold: there is no goodbye to stage'
        : lap.told === 'fans' ? 'the fans know: ' + KP.fillPro('{she} told them ', p) + when(lap.toldWeek)
        : lap.told === 'era' ? KP.fillPro('the fans know: announced with {pos} last era', p)
        : lap.told === 'house' ? KP.fillPro('kept in the house until {pos} last era is announced', p)
        : 'the fans have not been told';
      // her last era: landed, locked, still possible, or out of time
      let era = 'none', eraWord = '';
      if (lap.era) { era = 'landed'; eraWord = KP.fillPro('{pos} last era has landed' + (lap.stage ? ', and {pos} last stage is on file' : ''), p); }
      else if (staged && g.prep && inWindow(lap, g.prep.scheduledWeek)) { era = 'locked'; eraWord = KP.fillPro('{pos} last era is locked: it lands ', p) + when(g.prep.scheduledWeek); }
      else if (staged && state.week + KP.C.DEBUT.prepWeeksMin > lap.ends) { era = 'late'; eraWord = KP.fillPro('no record can land before {she} goes now', p); }
      else if (staged) {
        era = 'open';
        eraWord = state.week < opens ? KP.fillPro('a record that lands from ' + when(opens) + ' on will be {pos} last era', p)
          : KP.fillPro('a record that lands by ' + when(lap.ends) + ' will be {pos} last era', p);
      }
      const promise = (state.claims || []).some(c => !c.resolved && c.type === 'farewellEra' && c.personId === p.id);
      out.push({ personId: p.id, groupId: g ? g.id : null, ends: lap.ends, weeksLeft: lap.weeksLeft, mode: lap.mode,
        told: lap.told, toldWord, opens, era, eraWord, promise });
    });
    return out.sort((a, b) => a.ends - b.ends || (a.personId < b.personId ? -1 : 1));
  };

  // ---- the timeline hears it (hash picks: the stream stands still) ---------
  const pick = (state, salt, id, lines) => lines[Math.floor(KP.hash01([state.seed, salt, id, state.week].join('|')) * lines.length)];
  KP.onFeedEvent('farewellTold', (state, n) => {
    const p = state.people[n.personId];
    if (!p) return null;
    const N = KP.publicGiven(p);
    return pick(state, 'farewellToldEcho', p.id, n.by === 'fans' ? [
      { persona: 'fan', text: KP.fillPro(N + ' wrote the letter {herself} and told us first. I am not okay and I am so proud. we have until the last stage and we are going to use every week of it', p) },
      { persona: 'casual', text: KP.fillPro('a member announcing {pos} own exit ahead of time, in {pos} own words, with the company co-signing? that is how you do it. respect to everyone involved', p) },
    ] : [
      { persona: 'fan', text: 'so the comeback announcement is also a goodbye. ' + N + '’s last era. I need a minute and then I need the pre-order link' },
      { persona: 'stan', text: 'they kept ' + N + ' leaving in the building until the last record had a date. the fandom is arguing about whether that was kind. both sides are crying' },
    ]);
  });
  KP.onFeedEvent('lastStage', (state, n) => {
    const p = state.people[n.personId];
    if (!p) return null;
    const N = KP.publicGiven(p);
    return pick(state, 'lastStageEcho', p.id, [
      { persona: 'fan', text: N + '’s last music show stage. I watched the fancam with the sound off first because I was not ready. I was not ready with the sound on either' },
      { persona: 'casual', text: 'that ' + N + ' last-stage clip is on every timeline today. I do not even follow the group and I had to put my phone down' },
      { persona: 'fan', text: 'the ending pose. ' + N + ' held it a little longer than the count. everyone in the room knew why. saving this one in four places' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
