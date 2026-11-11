/* The last bow (v0.11.11, §102). How an act ends used to be one button and
   one statement: "a status flip with a good sentence on it". Now the ending
   is a choice of three doors, and each leaves something different behind.

   THE QUIET STATEMENT: today, free, and the price it always had.
   ONE LAST CONCERT: the fancon machinery at a bigger room, tonight; the
     act concludes when the house lights come up.
   A FAREWELL RECORD: announced, made in the Studio, promoted; the act
     concludes when that era closes. Announced and never made is the quiet
     statement with a broken promise on top.

   Whichever door, the final statement names what each member does next,
   and every line of that is read off a file that already keeps it. No draw
   is made anywhere in this file. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  KP.endingLedger = function (state) {
    state.endingLedger = state.endingLedger || { statements: 0, concerts: 0, announced: 0, records: 0,
      closed: 0, lapsed: 0, solos: 0 };
    return state.endingLedger;
  };

  const when = w => KP.weekLabel(w).text;
  const selling = g => (g.popularity || 0) >= KP.C.DISBAND.sellingPop;
  // a last record is owed: announced, and the act still stands
  const owed = g => !!g && !!g.ending && g.ending.how === 'record' && !g.retiredWeek;
  KP.endingOwed = owed;
  const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const num = n => (n >= 0 && n < NUM.length ? NUM[n] : String(n));
  const list = ns => (ns.length <= 1 ? ns.join('') : ns.slice(0, -1).join(', ') + ' and ' + ns[ns.length - 1]);
  function span(weeks) {
    const y = Math.floor(weeks / KP.C.WEEKS_PER_YEAR), m = Math.floor((weeks % KP.C.WEEKS_PER_YEAR) / KP.C.WEEKS_PER_MONTH);
    const ys = y ? num(y) + ' year' + (y === 1 ? '' : 's') : '', ms = m ? num(m) + ' month' + (m === 1 ? '' : 's') : '';
    return ys && ms ? ys + ' and ' + ms : ys || ms || 'a few weeks';
  }
  // what the last night costs and pays: one sum for the sheet and the verb
  function night(state, g) {
    const M = KP.C.MERCH, E = KP.C.ENDING;
    const fanbase = KP.fanbaseRead ? KP.fanbaseRead(state, g) : 2000;
    return { cost: Math.round(M.fanconCost * E.concertCostMult),
      till: Math.round((fanbase / 1000) * M.fanconPerK * E.concertTillMult),
      seats: Math.round(fanbase * 0.4 * E.concertCostMult) };
  }

  // ---- the three doors, read ------------------------------------------------
  // pure: the sheet prints this, and the verb refuses on the same reasons
  KP.endingDoors = function (state, groupId) {
    const D = KP.C.DISBAND, E = KP.C.ENDING, M = KP.C.MERCH;
    const g = KP.groupById(state, groupId);
    const out = { ok: false, reason: null, g, doors: [], notes: [] };
    if (!g) { out.reason = 'No such group.'; return out; }
    if (!g.debuted) { out.reason = 'A project is dissolved, not ended. Nothing has been promised to anyone yet.'; return out; }
    if (g.retiredWeek) { out.reason = 'That chapter is already closed.'; return out; }
    if (owed(g)) { out.reason = 'The last record is already announced. The act concludes when that era closes.'; return out; }
    if (g.tour) { out.reason = 'They are on the road — a tour is a stack of signed venue contracts. Bring them home first.'; return out; }
    if (state.week <= (g.promoUntil || 0)) { out.reason = 'Promotions are running. Ending an act mid-era is a scandal, not a decision.'; return out; }
    out.ok = true;
    const solo = g.type === 'solo';
    // what the ending does to the people in it that no door changes
    out.notes = [];
    if (!solo) {
      g.members.map(id => state.people[id]).filter(m => m && m.dualCareer).forEach(m => {
        out.notes.push(KP.fillPro(KP.displayName(m) + '’s solo career becomes an act of its own when ' + g.name + ' ends. It holds the development slot until {pos} solo debut.', m));
      });
    }
    const era = g.members.map(id => state.people[id]).find(m => m && m.soloEra);
    const eraWhy = era ? KP.fillPro(KP.displayName(era) + '’s solo record is on the calendar. Let it land before the act it comes out of ends.', era) : null;
    const prepWhy = g.prep ? 'A release is in production. Let the era end before you end the act, or make that record the last one.' : null;
    const sell = selling(g);
    const pct = x => Math.round(x * 100) + '%';
    const years = Math.round(E.glowWeeks / KP.C.WEEKS_PER_YEAR);

    // the farewell record
    const recWhy = g.hiatus ? 'They are on hiatus. Announce the return first; a last record needs a group that is here.'
      : g.jpAway ? 'They are in Japan. The last record is announced from home.' : eraWhy;
    out.doors.push({ id: 'record', title: 'A farewell record', ok: !recWhy, reason: recWhy,
      label: g.prep ? 'Make the record in production the last one' : 'Announce a farewell record',
      lines: [
        g.prep ? 'Announced today. The record landing ' + when(g.prep.scheduledWeek) + ' becomes the last one, and ' + (solo ? 'the chapter' : 'the act') + ' concludes when that era closes.'
          : 'Announced today, made in the Studio. Lock it by ' + when(state.week + E.recordWeeks) + '; ' + (solo ? 'the chapter' : 'the act') + ' concludes when that era closes.',
        'The last record lands warmer (reach +' + E.recordReach + ' or more). ' + (solo ? 'It costs the artist ' : 'It costs the room ') + E.recordMorale + ' morale, the least of the three, and it is remembered as an ending done right.',
        (sell ? 'This act still sells: the board reads a planned ending (trust ' + E.trustPlanned + '). ' : '') +
          'The shelf stays warm: the catalog pays ' + pct(E.glowRecord) + ' more for ' + num(years) + ' years.',
        g.prep ? '' : 'No record locked by the date is the quiet statement, with a broken promise to everyone in the room.',
      ].filter(Boolean) });

    // one last concert
    const n = night(state, g);
    const conWhy = prepWhy || eraWhy ||
      (g.hiatus ? 'They are on hiatus. A last night needs a group that is here.'
        : g.jpAway ? 'They are in Japan. The last night is played at home.'
        : (!g.fandom || (g.fandom.intensity || 0) < M.fanconMinIntensity) ? 'A last concert for an unorganized fandom is a theater rental with extra sadness. The room is not there yet.'
        : state.budget < n.cost ? 'The venue bills up front: ' + n.cost + '.' : null);
    out.doors.push({ id: 'concert', title: 'One last concert', ok: !conWhy, reason: conWhy, cost: n.cost, till: n.till,
      label: 'Play one last concert · ' + n.cost,
      lines: [
        'Tonight. The room costs ' + n.cost + ' and the till reads about ' + n.till + '. ' + (solo ? 'The chapter' : 'The act') + ' concludes when the house lights come up.',
        (solo ? 'It costs the artist ' : 'It costs the room ') + E.concertMorale + ' morale where the statement costs ' + D.morale + ', and they remember being given the night.',
        (sell ? 'This act still sells: the board prices it (trust ' + D.trustSelling + '). ' : '') +
          'The shelf stays warm: the catalog pays ' + pct(E.glowConcert) + ' more for ' + num(years) + ' years.',
      ] });

    // the quiet statement
    const stWhy = (g.prep ? 'A release is in production. Let the era end before you end the act.' : null) || eraWhy;
    out.doors.push({ id: 'statement', title: 'The quiet statement', ok: !stWhy, reason: stWhy,
      label: 'Put out the quiet statement',
      lines: [
        'Today, and free. ' + (solo ? 'The artist loses ' : 'Every member loses ') + D.morale + ' morale and files it against you.',
        (sell ? 'This act still sells: the board prices it (trust ' + D.trustSelling + '). ' : '') +
          'Nothing is left on the shelf but the records themselves.',
      ] });
    return out;
  };

  // ---- the verb: one door, taken -----------------------------------------------
  KP.endGroup = function (state, groupId, how) {
    const E = KP.C.ENDING;
    const read = KP.endingDoors(state, groupId);
    if (!read.ok) return { ok: false, reason: read.reason };
    const door = read.doors.find(d => d.id === how);
    if (!door) return { ok: false, reason: 'That is not one of the ways it ends.' };
    if (!door.ok) return { ok: false, reason: door.reason };
    const g = read.g, L = KP.endingLedger(state);
    if (how === 'statement') return KP.disbandGroup(state, groupId);
    if (how === 'concert') {
      const n = night(state, g);
      KP.takeIn(state, n.till);   // the night's takings come in whole, and its cost goes out (v0.11.35, §127)
      state.budget -= n.cost;
      if (KP.ledgerFlow) KP.ledgerFlow(state, 'commerce', n.till - n.cost);
      if (KP.settleShare) KP.settleShare(state, g, n.till);
      g.members.map(id => state.people[id]).filter(Boolean).forEach(m => {
        if (!KP.onBreak(m)) m.fatigue = KP.clamp(m.fatigue + E.concertFatigue, 0, 100);
      });
      return KP.disbandGroup(state, groupId, { how: 'concert', night: n });
    }
    // the farewell record: an announcement with a date on it
    g.ending = { how: 'record', since: state.week, by: state.week + E.recordWeeks };
    KP.fandomGain(g, E.recordIntensity);
    let trustLine = '';
    if (selling(g)) {
      state.trust = KP.clamp(state.trust + E.trustPlanned, 0, 100);
      trustLine = ' ' + state.executive.name + ' read the plan twice and initialed it: an act that still sells, ended on a schedule, is at least a schedule.';
    }
    const solo = g.type === 'solo';
    g.members.map(id => state.people[id]).filter(Boolean).forEach(p => {
      p.history.push({ week: state.week, text: solo ? 'Announced that the next record closes this chapter. Wrote the statement in the first person.'
        : g.name + ' announced that the next record is the last one. The group chat was quiet for an hour and then would not stop.' });
    });
    // the question a reissue door was asking is answered by this
    if (state.scenes) state.scenes = state.scenes.filter(sc => !(sc.kind === 'theReissue' && sc.groupId === g.id));
    L.announced++;
    const locked = g.prep ? ' The record already on the calendar, landing ' + when(g.prep.scheduledWeek) + ', is that record.' : '';
    const note = KP.note(state, { kind: 'public', ind: 'endingAnnounced', priority: 'critical', groupId: g.id,
      text: (solo ? g.name + ' will close this chapter of the solo career after one last record.'
        : g.name + ' will conclude team activities after one last record.') + ' The statement says so in its first line and says thank you in every line after it.' + locked +
        ' The fan cafés read it three times, and then somebody posted a calendar. Everything from here to the last stage is being counted.' + trustLine });
    return { ok: true, note: note.text, announced: true };
  };

  // ---- the roll call: what each member does next, from her own file ----------
  // read BEFORE the lineup empties. A fact with a date goes first; the ones
  // with nothing special on file share one sentence. `solos` names the
  // members whose open solo career becomes an act of its own.
  KP.endingRollCall = function (state, g) {
    const co = state.company.short;
    const lines = [], rest = [], solos = [];
    g.members.map(id => state.people[id]).filter(Boolean).forEach(p => {
      const name = KP.displayName(p);
      const lap = KP.lapOf ? KP.lapOf(state, p) : null;
      const job = KP.outsideOf ? KP.outsideOf(state, p.id) : null;
      if (p.flags && p.flags.military) {
        lines.push(KP.fillPro(name + ' is in service until ' + when(p.flags.military.until) + ', and the discharge is the next date on {pos} calendar.', p));
      } else if (lap && (lap.told === 'fans' || lap.told === 'era')) {
        lines.push(KP.fillPro(name + '’s contract ends ' + when(lap.ends) + ', as {she} said it would.', p));
      } else if (p.dualCareer && g.type !== 'solo') {
        solos.push(p.id);
        lines.push(KP.fillPro(name + ' continues as a soloist under ' + co + ': the career that was already {hers}, with a door of its own now.', p));
      } else if (p.flags && p.flags.personalHiatus) {
        lines.push(KP.fillPro(name + ' stays on {pos} break, and nothing is asked of {her}.', p));
      } else if (job) {
        lines.push(name + ' stays on as ' + KP.outsideLabel(job) + '.');
      } else rest.push(p);
    });
    if (rest.length === 1 && g.type === 'solo') {
      lines.push(KP.fillPro(KP.displayName(rest[0]) + ' remains with ' + co + '; the contract runs, and the calendar is {hers} to fill.', rest[0]));
    } else if (rest.length) {
      lines.push(list(rest.map(p => KP.displayName(p))) + ' ' + (rest.length === 1 ? 'remains' : 'remain') + ' with ' + co +
        ', ' + (rest.length === 1 ? 'the contract running and the calendar open.' : 'contracts running and calendars open.'));
    }
    return { lines, solos };
  };

  // ---- the final statement ------------------------------------------------------
  // one composer for every door. ctx: { roll, night, trustLine }
  KP.finalStatement = function (state, g, how, ctx) {
    const c = ctx || {};
    const solo = g.type === 'solo';
    const closes = solo ? g.name + ' closes this chapter of the solo career' : g.name + ' concludes team activities';
    const rels = g.releases || [];
    const first = rels[0], last = rels[rels.length - 1];
    const q = t => '“' + t + '”';
    const organized = !!g.fandom && (g.fandom.intensity || 0) >= KP.C.MERCH.fanconMinIntensity;
    let head, tail;
    if (how === 'concert') {
      const set = !first ? 'a set nobody will be able to describe properly'
        : rels.length === 1 ? 'a set built around ' + q(first.songTitle)
        : 'a set that ran from ' + q(first.songTitle) + ' to ' + q(last.songTitle);
      head = g.name + ' played the last night: ' + KP.fmtCount(c.night ? c.night.seats : 0) + ' seats, ' + (c.night ? c.night.till : 0) +
        ' through the till, and ' + set + '. The statement went up while the house lights were still down: ' + closes + '.';
      tail = ' The fan cafés are holding a wake and an archive drive at the same time, and this time they have the footage.';
    } else if (how === 'record') {
      const run = g.debutWeek == null ? '' : ' in ' + span(Math.max(0, state.week - g.debutWeek));
      head = (last ? q(last.songTitle) + ' was announced as ' + g.name + '’s last record, and it was. ' : '') +
        'The era closed this week and ' + (solo ? 'the chapter' : 'the group') + ' closed with it: ' + num(rels.length) + ' record' + (rels.length === 1 ? '' : 's') + run +
        ', the last one made by people who knew it was the last. ' + closes.replace(/^./, ch => ch.toUpperCase()) + ', on the date it said it would.';
      tail = ' The catalog stays, and the fandom has already decided it is not finished with it.';
    } else if (how === 'lapsed') {
      const ago = g.ending && g.ending.since != null ? state.week - g.ending.since : 0;
      head = g.name + ' announced one last record ' + num(ago) + ' weeks ago, and it was never made. The statement that went out today is the quiet one: ' + closes +
        '. Everyone who was promised a last era, inside the building and outside it, has the date written down.';
      tail = ' The fan cafés are not holding a wake. They are holding a receipt.';
    } else {
      head = 'The statement is out: ' + closes + '. It thanks the fans for every era, and for once every word of it is true.';
      tail = (organized ? ' The cafés asked for one last night and got a paragraph.' : '') +
        ' The fan cafés are holding a wake and an archive drive at the same time.';
    }
    const roll = c.roll && c.roll.lines.length ? ' ' + c.roll.lines.join(' ') : '';
    return head + roll + tail + (c.trustLine || '');
  };

  // ---- the farewell record: the lock tells, the landing reads --------------------
  KP.endingLockTells = function (state, g, scheduledWeek) {
    if (!owed(g) || g.ending.record) return false;
    KP.note(state, { kind: 'public', ind: 'lastRecordSet', priority: 'high', groupId: g.id,
      text: 'The last one has a date: ' + g.name + '’s final record lands ' + when(scheduledWeek) +
        '. The announcement is one image and one line, and the fandom has already planned what it is doing that week, the week before, and the week after.' });
    return true;
  };
  // hiatusReadsRelease's shape. The first record to land after the
  // announcement is the last record, whatever it was locked as.
  KP.endingReadsRelease = function (state, g, isDebut) {
    const E = KP.C.ENDING;
    const out = { mod: 0, note: null, last: false };
    if (isDebut || !owed(g) || g.ending.record) return out;
    g.ending.record = { week: state.week };
    out.last = true;
    out.mod = E.recordReach + Math.min(E.recordCap, Math.round(KP.fandomIntensity(g) * E.recordPerIntensity));
    KP.endingLedger(state).records++;
    out.note = 'This is the last ' + g.name + ' record, announced as one and bought as one: nobody in the fandom is saving anything for later.';
    return out;
  };

  // ---- the weekly: the act concludes at the close, or the promise lapses ---------
  // order 598: behind the era's own close (596) and a member's last stage
  // (597), ahead of a landing (600). A landing week therefore reads as
  // "still in production" here, and the record is stamped two rails later.
  KP.registerWeekly('theEnding', 598, function (state, rng, inbox, roster, groups) {
    const E = KP.C.ENDING;
    groups.forEach(g => {
      if (!owed(g) || !g.members.length) return;
      const e = g.ending;
      // the act cannot end under a record: its own, or a member's solo one
      const quiet = !g.prep && !g.tour && state.week > (g.promoUntil || 0) &&
        !g.members.some(id => state.people[id] && state.people[id].soloEra);
      if (e.record) {
        if (quiet) KP.disbandGroup(state, g.id, { how: 'record', inbox });
        return;
      }
      // the law has these weeks: the date waits for the discharge
      if (g.hiatus && g.hiatus.service) { e.by = Math.max(e.by, state.week + E.recordWeeks); return; }
      if (state.week > e.by && quiet) {
        KP.disbandGroup(state, g.id, { how: 'lapsed', inbox });
      } else if (state.week === e.by - 6 && !g.prep) {
        inbox.push({ kind: 'company', ind: 'lastRecordDue', priority: 'high', groupId: g.id,
          text: 'Six weeks are left to lock the last ' + g.name + ' record: the date the announcement implied is ' + when(e.by) +
            '. The Studio has the demos. A last record that is announced and never made is the quiet statement with a broken promise on top of it.' });
      }
    });
  });

  // ---- the read: one truth for Today's card, the act's page and the Studio ------
  KP.endingRead = function (state) {
    const out = [];
    KP.groups(state).forEach(g => {
      if (!owed(g)) return;
      const e = g.ending;
      let stage, word;
      if (e.record) {
        stage = 'landed';
        const act = g.type === 'solo' ? 'the chapter' : 'the act';
        word = state.week <= (g.promoUntil || 0) ? 'the last record is out; ' + act + ' concludes when promotion ends, ' + when((g.promoUntil || 0) + 1)
          : g.tour ? 'the last record is out; ' + act + ' concludes when the tour comes home'
          : g.members.some(id => state.people[id] && state.people[id].soloEra) ? 'the last record is out; ' + act + ' concludes when the solo record on the calendar has landed'
          : 'the last record is out; ' + act + ' concludes this week';
      } else if (g.prep) {
        stage = 'locked'; word = 'the last record is locked: it lands ' + when(g.prep.scheduledWeek);
      } else if (g.hiatus && g.hiatus.service) {
        stage = 'service'; word = 'the date waits for the discharge';
      } else {
        stage = state.week > e.by ? 'late' : 'open';
        word = stage === 'late' ? 'the date has passed with no record locked' : 'lock the last record in the Studio by ' + when(e.by);
      }
      out.push({ groupId: g.id, since: e.since, by: e.by, weeksLeft: Math.max(0, e.by - state.week), stage, word });
    });
    return out;
  };
  // how a concluded act ended, in words, for its record page
  KP.endedWord = function (state, g) {
    if (!g || !g.retiredWeek) return '';
    const e = g.ending;
    // an act an older build concluded has no record of how
    if (!e || e.week == null) return '';
    return e.how === 'concert' ? 'ended with one last concert'
      : e.how === 'record' ? 'ended with a farewell record'
      : e.how === 'lapsed' ? 'ended with a statement, after a last record that was never made'
      : e.how === 'contract' ? 'closed with the last contract'
      : e.how === 'story' ? 'closed when the last member was released'
      : 'ended with a statement';
  };
  KP.afterglowOf = function (state, g) {
    return g && g.afterglow && state.week <= g.afterglow.until ? g.afterglow : null;
  };

  // ---- the timeline hears it (hash picks: the stream stands still) ---------------
  const pick = (state, salt, id, lines) => lines[Math.floor(KP.hash01([state.seed, salt, id, state.week].join('|')) * lines.length)];
  KP.onFeedEvent('endingAnnounced', (state, n) => {
    const g = KP.groupById(state, n.groupId);
    if (!g) return null;
    return pick(state, 'endingAnnouncedEcho', g.id, [
      { persona: 'fan', text: 'one more ' + g.name + ' record and then that is it. they told us first and they told us properly. I am going to be so normal about this for exactly zero days' },
      { persona: 'stan', text: g.name + ' announcing the last record BEFORE making it means we get to do the whole thing awake. clear your calendars. we are sending them off with a number' },
      { persona: 'casual', text: 'a group ending on its own announcement with one last album instead of a friday-night statement? did not think this industry still did that' },
    ]);
  });
  KP.onFeedEvent('lastRecordSet', (state, n) => {
    const g = KP.groupById(state, n.groupId);
    if (!g) return null;
    return pick(state, 'lastRecordSetEcho', g.id, [
      { persona: 'fan', text: 'the last ' + g.name + ' comeback has a date. I have taken the week off. I have not told my manager why and I am not going to' },
      { persona: 'stan', text: 'streaming guide for the final ' + g.name + ' record is pinned. yes it is long. yes you will follow all of it. this is the last time we get to do this' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
