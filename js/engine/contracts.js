/* Contracts & the clock (v0.9.0) — nothing lasted forever until now.
   §37: "care requires the possibility of loss." Every idol's exclusive
   contract runs seven years from debut; at year five the renewal table
   opens as a SCENE whose tone reads the WHOLE ledger — standing,
   ambitions fed or starved, promises kept, silences left at the door,
   the years themselves. Most re-sign. Some renegotiate. And someone
   the company truly failed can leave — fully narrated, file preserved
   forever, mostly warm, because the content law knows how to write
   bittersweet. One departure per career is enough; the possibility
   charges every quiet week with meaning. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // ---- the clock ---------------------------------------------------------
  KP.contractOf = function (p) { return p && p.contract || null; };
  KP.contractYear = function (state, p) {
    if (!p.contract) return null;
    return Math.min(KP.C.CONTRACT.years,
      Math.floor((state.week - p.contract.start) / KP.C.WEEKS_PER_YEAR) + 1);
  };
  KP.stampContract = function (state, p) {
    if (p.contract) return p.contract;
    p.contract = { start: state.week, years: KP.C.CONTRACT.years, term: 1 };
    return p.contract;
  };

  // ---- the disposition: what seven years wrote on the ledger -------------
  // Words decide the scene; the score is never shown. Standing is the
  // spine; the ambition question and the door's silences are the marrow.
  KP.renewalRead = function (state, p) {
    let s = KP.standingScore(state, p) * 1.5;
    if (p.flags.ambitionMet) s += 3; else s -= 2;
    (p.directed || []).forEach(a => {
      if (a.kind === 'promiseBroken') s -= 3;
      if (a.kind === 'leftWaiting') s -= 1;
      if (a.kind === 'promiseKept') s += 2;
      if (a.kind === 'heldBack') s -= 2;   // the solo stage you said no to (v0.9.14)
    });
    const g = KP.groupOf(state, p.id);
    if (g && (g.popularity || 0) >= 55) s += 2;   // a warm room is worth staying in
    if (p.morale >= 60) s += 1;
    if (p.morale < 40) s -= 2;
    const band = s >= 6 ? 'devoted' : s >= 0 ? 'professional' : s >= -5 ? 'strained' : 'gone';
    // leverage: her individual fame prices her signature (§22 v0.6.15)
    const fame = Math.min(4, Math.floor(KP.socialOf(state, p) / 150000));
    return { score: s, band, fame };
  };

  // ---- the weekly clock (order 785.5 → use 784) ---------------------------
  KP.registerWeekly('contracts', 784, function (state, rng, inbox, roster, groups) {
    const C = KP.C.CONTRACT;
    // the clock stamps at debut (idempotent — first group debut only)
    groups.forEach(g => {
      if (!g.debuted) return;
      g.members.forEach(id => {
        const p = state.people[id];
        if (p && p.status === 'idol' && !p.contract) {
          p.contract = { start: g.debutWeek || state.week, years: C.years, term: 1 };
          delete p.traineeContract;   // the debut converts the paper (v0.9.19)
        }
      });
    });

    // ---- the trainee clock (v0.9.19): three years, then a real table --
    const TC = KP.C.TRAINEE_CONTRACT;
    const tcWeeks = TC.years * KP.C.WEEKS_PER_YEAR;
    const dueTrainee = roster.find(p => {
      if (p.status !== 'trainee' || !p.traineeContract) return false;
      if (state.week < p.traineeContract.start + tcWeeks - TC.noticeWeeks) return false;
      return !(state.scenes || []).some(sc => sc.kind === 'traineeRenewal' && sc.personId === p.id);
    });
    if (dueTrainee) {
      const inLineup = !!KP.groupOf(state, dueTrainee.id) ||
        !!(state.project && state.project.locked.includes(dueTrainee.id));
      if (inLineup) {
        // nobody renegotiates during debut prep — the term bridges to
        // the stage, quietly
        dueTrainee.traineeContract.start += tcWeeks;
        dueTrainee.traineeContract.term++;
        inbox.push({ kind: 'company', personId: dueTrainee.id,
          text: KP.fillPro(KP.displayName(dueTrainee) + '’s trainee term lapped while {she} is slated for a lineup — legal bridged the paper to the debut without a meeting. Some renewals sign themselves.', dueTrainee) });
      } else {
        KP.openScene(state, { kind: 'traineeRenewal', personId: dueTrainee.id,
          expiresWeek: state.week + TC.noticeWeeks });
        inbox.push({ kind: 'company', urgent: true, personId: dueTrainee.id,
          text: KP.fillPro(KP.displayName(dueTrainee) + '’s three-year trainee contract is running out — term ' + dueTrainee.traineeContract.term + ' ends ' + KP.weekLabel(dueTrainee.traineeContract.start + tcWeeks).text + '. The table is on the Desk, and {she} has been doing {pos} own math about {pos} odds all week.', dueTrainee) });
      }
    }
    // a term that expires with the scene unanswered ends the story itself
    roster.slice().forEach(p => {
      if (p.status !== 'trainee' || !p.traineeContract) return;
      if (state.week <= p.traineeContract.start + tcWeeks) return;
      if (KP.groupOf(state, p.id) || (state.project && state.project.locked.includes(p.id))) return;
      if ((state.scenes || []).some(sc => sc.kind === 'traineeRenewal' && sc.personId === p.id)) return;
      p.history.push({ week: state.week, text: 'The trainee contract ran out with no new paper on the table. Packed the practice room locker without a meeting.' });
      KP.releaseTrainee(state, p.id);
      inbox.push({ kind: 'company', urgent: true, personId: p.id,
        text: KP.fillPro(KP.displayName(p) + '’s term expired while the desk was busy. {She} left the building politely, which somehow made it worse. Legal notes that contracts do not wait for meetings.', p) });
    });

    // the seventh year ends for whoever chose to go — departures do not
    // wait on anyone else's table
    const leaving = roster.find(p => p.status === 'idol' && p.contract &&
      p.contract.leaving && state.week - p.contract.start >= C.years * KP.C.WEEKS_PER_YEAR);
    if (leaving) KP.departIdol(state, leaving.id, leaving.contract.leaveMode || 'warm', inbox);

    // the paper itself runs out: half a year past the seventh with the
    // ledger at gone, she does not keep working while the office ignores
    // the table — the silence was the answer (one departure per week)
    if (!leaving) {
      const lapsed = roster.find(p => p.status === 'idol' && p.contract &&
        !p.contract.leaving &&
        state.week - p.contract.start >= (C.years + 0.5) * KP.C.WEEKS_PER_YEAR &&
        KP.renewalRead(state, p).band === 'gone');
      if (lapsed) KP.departIdol(state, lapsed.id, 'cold', inbox);
    }

    // one renewal table at a time, spaced so each conversation breathes
    if ((state.scenes || []).some(sc => sc.kind === 'renewal')) return;
    if (state.week < (state.renewalQuietUntil || 0)) return;
    const due = roster.filter(p => p.status === 'idol' && p.contract &&
      !p.contract.leaving && !(p.flags && p.flags.military) &&
      state.week - p.contract.start >= C.renewalAtYears * KP.C.WEEKS_PER_YEAR)
      .sort((a, b) => a.contract.start - b.contract.start)[0];
    if (!due) return;
    state.renewalQuietUntil = state.week + C.spacingWeeks;
    KP.openScene(state, { kind: 'renewal', personId: due.id,
      expiresWeek: state.week + 3 });
    inbox.push({ kind: 'company', priority: 'high', personId: due.id,
      text: KP.fillPro('Legal sent up the folder nobody rushes to open: ' + KP.displayName(due) +
        '’s exclusive contract enters its renewal window. Two years of runway, one conversation that decides how they get used. The table is on the Desk — and {she} knows the folder went up.', due) });
  });

  // ---- the renewal table --------------------------------------------------
  const BODIES = {
    devoted: '{She} signs before the coffee arrives, then holds the pen out and asks, grinning, if the company wants another seven on top. The ledger between you is the reason: the answered doors, the kept dates, the name on the right tracks. Some renewals are ceremonies. This is one.',
    professional: '{She} reads every page, which is what seven professional years teach a person. {She} is staying — probably — but the signature has a price now, and {pos} representation knows exactly what the last era earned. The number on the table is real.',
    strained: '{She} came alone, which says more than the folder does. The years are on the ledger and not enough of them went {pos} way: the waiting, the promises that slid, the plans that were always for someone else. {She} has not decided. That is the honest truth of this table.',
    gone: '{She} tells you straight, with the calm of someone who rehearsed it in the van: this is {pos} last contract. It is not anger — anger would be easier. It is arithmetic. Seven years, and the ledger reads the way it reads. What remains is how the ending gets written.',
  };
  // ---- the trainee table (v0.9.19): three years, then this room ------
  KP.registerScene('traineeRenewal', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'The') + ' · the trainee table';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return '';
      const TC = KP.C.TRAINEE_CONTRACT;
      const tenure = Math.round((state.week - (p.signedWeek || p.traineeContract.start)) / KP.C.WEEKS_PER_YEAR * 10) / 10;
      const bleak = p.morale < TC.declineMoraleBelow && tenure >= TC.declineTenureYears;
      return KP.fillPro('Term ' + (p.traineeContract.term || 1) + ' of ' + KP.displayName(p) + '’s trainee contract is ending — ' +
        tenure + ' years in the building, no debut yet on paper. ' +
        (bleak
          ? '{She} came to the table with {pos} own spreadsheet, which is never a good sign. The offer is yours to make; whether {she} takes it may not be.'
          : '{She} still believes — you can see it in how early {she} books the practice room. Three more years is a lot to ask of somebody. It is also what {she} is hoping you will ask.'), p);
    },
    options: () => [
      { id: 'renew', label: 'Offer another term' },
      { id: 'farewell', label: 'Let the term run out' },
    ],
    resolve: (state, sc, optionId) => {
      const TC = KP.C.TRAINEE_CONTRACT;
      const p = state.people[sc.personId];
      if (!p || p.status !== 'trainee') return {};
      const tcWeeks = TC.years * KP.C.WEEKS_PER_YEAR;
      const tenure = (state.week - (p.signedWeek || p.traineeContract.start)) / KP.C.WEEKS_PER_YEAR;
      if (optionId === 'renew') {
        const declines = p.morale < TC.declineMoraleBelow && tenure >= TC.declineTenureYears;
        if (declines) {
          p.history.push({ week: state.week, text: 'Offered a new trainee term and turned it down — thanked the room, named the years, chose the exam season instead.' });
          KP.releaseTrainee(state, p.id);
          return { toast: KP.fillPro('{She} read the offer twice, thanked you by name, and declined. ' + Math.floor(tenure) + ' years is an answer even when the question is kind. The practice room went quiet for a day.', p) };
        }
        p.traineeContract = { start: state.week, years: TC.years, term: (p.traineeContract.term || 1) + 1 };
        p.morale = KP.clamp(p.morale + 4, 0, 100);
        p.history.push({ week: state.week, text: 'Signed trainee term ' + p.traineeContract.term + '. Somebody still believes — and put it in writing.' });
        return { toast: KP.fillPro('{She} signed the new term the same afternoon and was back on the floor by six. Three more years, on the record. The belief is now mutual and notarized.', p),
          note: { kind: 'company', personId: p.id,
            text: KP.displayName(p) + ' re-signed for term ' + p.traineeContract.term + '. The practice room noticed who got new paper.' } };
      }
      p.history.push({ week: state.week, text: 'The company let the trainee term run out. The industry-standard goodbye: polite, dated, final.' });
      KP.releaseTrainee(state, p.id);
      return { toast: KP.fillPro('No new offer. {She} finished the week like a professional, cleared the locker on Sunday, and left a thank-you note that will bother you at odd hours for a while.', p) };
    },
    // an unanswered table is an answer — the paper does not wait
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p || p.status !== 'trainee') return null;
      p.history.push({ week: state.week, text: 'The trainee contract ran out with no new paper on the table. Packed the practice room locker without a meeting.' });
      KP.releaseTrainee(state, p.id);
      return { kind: 'company', urgent: true,
        text: KP.fillPro(KP.displayName(p) + '’s term expired while the desk was busy. {She} left the building politely, which somehow made it worse. Legal notes that contracts do not wait for meetings.', p) };
    },
  });

  KP.registerScene('renewal', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'The') + ' · the renewal table';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return '';
      const read = KP.renewalRead(state, p);
      return KP.fillPro(BODIES[read.band], p) +
        (read.fame >= 2 ? KP.fillPro(' (And {pos} name alone sells tickets now — the table knows it.)', p) : '');
    },
    options: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return [{ id: 'ok', label: 'Noted' }];
      const C = KP.C.CONTRACT;
      const read = KP.renewalRead(state, p);
      if (read.band === 'devoted') return [
        { id: 'sign', label: 'Sign the renewal' },
        state.budget >= C.sweetenCost
          ? { id: 'sweeten', label: 'Sign it — and sweeten it · ' + C.sweetenCost } : null,
      ].filter(Boolean);
      // the table never offers what the account cannot cover (0.9.13
      // audit B3: these were the only ungated spends in the game)
      const termsCost = C.termsCostBase + read.fame * C.termsCostPerFame;
      const canTerms = state.budget >= termsCost;
      if (read.band === 'professional') return [
        canTerms ? { id: 'terms', label: 'Meet the terms · ' + termsCost } : null,
        { id: 'standard', label: 'Offer the standard renewal' },
      ].filter(Boolean);
      if (read.band === 'strained') return [
        canTerms ? { id: 'terms', label: 'Give real terms · ' + termsCost } : null,
        { id: 'hold', label: 'Hold the company line' },
      ].filter(Boolean);
      return [
        { id: 'farewell', label: 'Write the ending right' },
        { id: 'plead', label: 'Try to change the arithmetic' },
      ];
    },
    resolve: (state, sc, optionId, rng) => {
      const p = state.people[sc.personId];
      if (!p) return {};
      const C = KP.C.CONTRACT;
      const read = KP.renewalRead(state, p);
      const renew = () => {
        p.contract.start = state.week;   // a fresh seven begins — the
        // reset clock is itself the gate: the next table is five years out
        p.contract.term = (p.contract.term || 1) + 1;
        p.history.push({ week: state.week, text: 'Re-signed with the company. Term ' + p.contract.term + '.' });
      };
      if (optionId === 'sign' || (optionId === 'standard' && read.band === 'professional')) {
        renew();
        if (optionId === 'standard') KP.recordDirected(state, p.id, 'standardTerms', -1);
        return { toast: optionId === 'sign'
          ? KP.fillPro('{She} signed like it was the easiest decision of the month, because for {her} it was. Seven more years. The staff group chat is all exclamation marks.', p)
          : KP.fillPro('{She} took the standard paper after a silence exactly one page long. Signed, professional, filed — and {pos} representation filed the silence too.', p),
          note: { kind: 'public', ind: 'renewed', priority: 'high', personId: p.id,
            text: KP.fillPro(KP.displayName(p) + ' re-signed with the company — the fan cafés exhaled in real time. Seven more years of the era. The candles can go back in the drawer.', p) } };
      }
      if (optionId === 'sweeten') {
        state.budget -= C.sweetenCost;
        renew();
        KP.recordDirected(state, p.id, 'sweetened', 2);
        p.morale = KP.clamp(p.morale + 4, 0, 100);
        return { toast: KP.fillPro('{She} was signing anyway — the sweetener was for the YEARS, and {she} understood that instantly. The look across the table was worth more than the line item.', p),
          note: { kind: 'public', ind: 'renewed', priority: 'high', personId: p.id,
            text: KP.fillPro(KP.displayName(p) + ' re-signed — and word slipped out that the company came to the table generous. The fandom is framing it as proof of the thing they always said this company was.', p) } };
      }
      if (optionId === 'terms') {
        const cost = C.termsCostBase + read.fame * C.termsCostPerFame;
        state.budget -= cost;
        renew();
        KP.recordDirected(state, p.id, 'realTerms', 2);
        p.morale = KP.clamp(p.morale + 3, 0, 100);
        return { toast: KP.fillPro('The terms met {pos} leverage where it actually lives. {She} read the final page twice, signed once, and shook your hand like a colleague — which, the contract now admits, {she} is.', p),
          note: { kind: 'public', ind: 'renewed', priority: 'high', personId: p.id,
            text: KP.fillPro(KP.displayName(p) + ' re-signed on renegotiated terms. The trades read it as the company keeping its own star instead of renting one. Correct.', p) } };
      }
      if (optionId === 'hold') {
        if (rng.chance(C.holdLeaveChance)) {
          p.contract.leaving = true;
          p.contract.leaveMode = 'cold';
          KP.recordDirected(state, p.id, 'heldLine', -2);
          return { toast: KP.fillPro('You held the line. {She} nodded, closed the folder, and said {she} would honor the current term — which was {pos} way of answering the question you did not ask. The seventh year has a date on it now.', p) };
        }
        renew();
        KP.recordDirected(state, p.id, 'heldLine', -1);
        return { toast: KP.fillPro('You held the line, and after two long weeks {she} signed the standard paper anyway. Staying is not the same as staying happily — the ledger keeps both.', p) };
      }
      if (optionId === 'plead') {
        const bonus = KP.standingScore(state, p) >= 3 ? 0.15 : 0;
        if (rng.chance(C.changeMindChance + bonus)) {
          renew();
          KP.recordDirected(state, p.id, 'wonBack', 3);
          p.morale = KP.clamp(p.morale + 5, 0, 100);
          return { toast: KP.fillPro('You did not argue with {pos} arithmetic — you changed it: the plan {she} stopped believing in, on paper, with dates. {She} looked at it for a long time. Then {she} signed. Nobody in the building will ever know how close this was.', p),
            note: { kind: 'public', ind: 'renewed', priority: 'high', personId: p.id,
              text: KP.fillPro(KP.displayName(p) + ' re-signed. The fandom will never know there was a night the candles almost came out. Some saves happen in rooms with no cameras.', p) } };
        }
        p.contract.leaving = true;
        p.contract.leaveMode = 'warm';
        return { toast: KP.fillPro('{She} heard you out — all of it — and then said, gently, that some decisions are finished before the meeting. The seventh year will be {pos} last. {She} asked to spend it well, which is the kindest available version of this.', p) };
      }
      if (optionId === 'farewell') {
        p.contract.leaving = true;
        p.contract.leaveMode = 'warm';
        KP.recordDirected(state, p.id, 'endingHonored', 2);
        return { toast: KP.fillPro('You wrote the ending right: the seventh year becomes a farewell lap — {pos} stages, {pos} goodbyes, on {pos} terms. {She} cried exactly once, thanked you twice, and started planning what to wear for the last encore.', p),
          note: { kind: 'company', priority: 'high', personId: p.id,
            text: KP.fillPro('The building knows now: ' + KP.displayName(p) + '’s seventh year will be {pos} last. The fandom will find out when it is time. Until then, every stage {she} takes is quietly a farewell stage — the staff have started filming everything.', p) } };
      }
      return {};
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return null;
      KP.recordDirected(state, p.id, 'tableLeftWaiting', -3);
      return { kind: 'company', priority: 'high', personId: p.id,
        text: KP.fillPro('The renewal folder sat unopened until legal quietly took it back downstairs. ' + KP.displayName(p) + ' noticed — people always notice the folder. The table will have a colder temperature when it comes back.', p) };
    },
  });

  // ---- the departure: every invariant, handled ----------------------------
  // one truth for taking a person OUT of a lineup (v0.9.20): the
  // departure, the termination, and the removal verb all run the
  // same surgery — roles, rooms, maknae, credits, the left-behind
  KP.lineupSurgery = function (state, g, p, warm, push) {
    const C = KP.C.CONTRACT;
      g.members = g.members.filter(id => id !== p.id);
      if (g.roles) {
        const remaining = g.members.map(id => state.people[id]).filter(Boolean);
        if (remaining.length) {
          if (g.roles.leader === p.id) {
            g.roles.leader = remaining.slice().sort((a, b) =>
              (b.personality.leadership || 0) - (a.personality.leadership || 0))[0].id;
          }
          if (g.roles.center === p.id) {
            g.roles.center = remaining.slice().sort((a, b) =>
              KP.derived(b).centerPull - KP.derived(a).centerPull)[0].id;
            g.centerHistory = g.centerHistory || [];
            g.centerHistory.push({ week: state.week, id: g.roles.center });
          }
          ['mainVocal', 'mainDancer', 'mainRapper'].forEach(r => {
            if (g.roles[r] === p.id) delete g.roles[r];
          });
        }
      }
      if (g.rooms) { g.rooms = null; if (g.members.length) KP.assignRooms(state, g); }
      // the maknae is a fact — recompute it when the youngest walks (0.9.13)
      if (g.maknae === p.id && g.members.length) {
        g.maknae = g.members.map(id => state.people[id]).filter(Boolean)
          .sort((a, b) => a.age - b.age)[0].id;
      }
      // a locked record does not survive its credited member (0.9.13
      // audit H3): strip her name from the unreleased tracklist
      if (g.prep && g.prep.tracks) {
        g.prep.tracks.forEach(tr => {
          if (!tr.credit) return;
          if (tr.credit.type === 'solo' && tr.credit.memberId === p.id) tr.credit = null;
          else if (tr.credit.type === 'unit' && (tr.credit.memberIds || []).includes(p.id)) {
            tr.credit.memberIds = tr.credit.memberIds.filter(id => id !== p.id);
            if (tr.credit.memberIds.length < 2) tr.credit = null;
          }
        });
      }
      g.popularity = KP.clamp((g.popularity || 0) - (warm ? C.departPopHitWarm : C.departPopHitCold), 0, 100);
      // the ones left behind
      g.members.forEach(id => {
        const m = state.people[id];
        if (!m) return;
        m.morale = KP.clamp(m.morale - (warm ? C.departMoraleWarm : C.departMoraleCold), 0, 100);
        const rel = (state.relationships || {})[KP.pairKey(p, m)];
        if (rel && rel.state === 'close') {
          m.morale = KP.clamp(m.morale - C.friendGrief, 0, 100);
          KP.recordDirected(state, m.id, 'friendDeparted', warm ? -1 : -2);
        }
      });
      if (!g.members.length) {
        // the group ends here (0.9.13 audit C1): an empty lineup holding
        // a locked release bricked the weekly loop forever. Everything
        // scheduled dies with the act, and retiredWeek becomes a real
        // gate every desk checks — not a write-only stamp.
        g.retiredWeek = state.week;
        g.prep = null; g.demos = null; g.tour = null;
        g.hiatus = null; delete g.returnFrom;
        push({ kind: 'public', priority: 'high', groupId: g.id,
          text: g.name + '’s chapter closes with the last contract — the company statement thanks the fans for every era, and means it. The scheduled work comes off the calendar. The catalog stays.' });
      }
  };

  KP.departIdol = function (state, personId, mode, inbox) {
    const C = KP.C.CONTRACT;
    const p = state.people[personId];
    if (!p) return null;
    const g = KP.groupOf(state, p.id);
    const warm = mode !== 'cold';
    const push = n => { if (inbox) inbox.push(n); else KP.note(state, n); };

    // the group: lineup, roles, rooms — the validator's whole checklist
    if (g) KP.lineupSurgery(state, g, p, warm, push);

    // the desk: deals wind down, her claims settle void
    (state.deals || []).slice().forEach(d => {
      if (d.personId === p.id) {
        state.deals = state.deals.filter(x => x !== d);
        push({ kind: 'company', text: KP.fillPro('The ' + (d.brand || 'brand') + ' contract wound down with ' + KP.displayName(p) + '’s departure — the clause everyone signs and nobody reads. The brand sent flowers, which was a first.', p) });
      }
    });
    (state.claims || []).forEach(c => {
      if (!c.resolved && c.subject && c.subject.kind === 'idol' && c.subject.id === p.id) {
        c.resolved = 'void'; c.resolvedWeek = state.week;
      }
    });
    // pending offers naming {her} come off the desk too (0.9.13 audit H1)
    if (state.dealOffers) state.dealOffers = state.dealOffers.filter(o => o.personId !== p.id);
    if (state.gigOffers) state.gigOffers = state.gigOffers.filter(o => o.personId !== p.id);
    // any scene still holding her name comes off the desk with her —
    // nobody renews, promises, or consoles a person who already left
    if (state.scenes) state.scenes = state.scenes.filter(sc => sc.personId !== p.id);

    // the person: the file is FOREVER — that is the whole point
    state.roster = state.roster.filter(id => id !== p.id);
    p.status = 'departed';
    p.flags.departedWeek = state.week;
    p.flags.departMode = mode;
    p.history.push({ week: state.week, text: warm
      ? 'Contract completed. Left ' + state.company.short + ' after ' + (p.contract ? p.contract.term : 1) + ' term' + ((p.contract && p.contract.term > 1) ? 's' : '') + ', on good terms, with the send-off ' + (p.gender === 'm' ? 'he' : 'she') + ' earned.'
      : 'Contract expired. Left ' + state.company.short + '. The last year was quiet in the wrong way.' });

    push({ kind: 'public', ind: 'contractEnd', priority: 'high', personId: p.id,
      groupId: g ? g.id : null, warm,
      text: warm
        ? KP.fillPro(KP.displayName(p) + '’s contract completed today, and the goodbye was everything the fandom needed it to be: the letter in {pos} own handwriting, the members crying through the last group bow, the company statement that read like it was written by a person. {She} leaves full, not empty. The door stays open.', p)
        : KP.fillPro(KP.displayName(p) + '’s contract expired today. The statement was three sentences. The fandom read everything the sentences did not say, and the quote-posts will run for a week. Somewhere in the building is a ledger that explains this, and everyone who can read it knows it.', p) });
    if (g && g.members.length) {
      push({ kind: 'company', priority: 'high', groupId: g.id,
        text: g.name + ' continues as ' + g.members.length + '. The formations get reblocked, the line distribution gets rewritten, and the fandom — after a week of candles — starts the “' + g.members.length + ' is still ' + g.name + '” hashtag. It trends. Fandoms are good at continuing.' });
    }
    KP.recordEvidence && KP.recordEvidence(state, 'lineupChange', 'group', g ? g.id : 'company');
    return p;
  };

  // ---- graduation: she stays in the family, as a solo --------------------
  // (offered by the renewal flow in a later pass; the door exists now)
  KP.graduateToSolo = function (state, personId) {
    const p = state.people[personId];
    if (!p || p.status !== 'idol') return { ok: false, reason: 'Only an active artist graduates.' };
    const g = KP.groupOf(state, p.id);
    if (!g) return { ok: false, reason: 'A soloist without a group is already solo.' };
    // leave the group warmly WITHOUT leaving the company
    g.members = g.members.filter(id => id !== p.id);
    if (g.roles) {
      const remaining = g.members.map(id => state.people[id]).filter(Boolean);
      if (remaining.length) {
        if (g.roles.leader === p.id) g.roles.leader = remaining[0].id;
        if (g.roles.center === p.id) g.roles.center = remaining.slice().sort((a, b) =>
          KP.derived(b).centerPull - KP.derived(a).centerPull)[0].id;
        ['mainVocal', 'mainDancer', 'mainRapper'].forEach(r => { if (g.roles[r] === p.id) delete g.roles[r]; });
      }
    }
    if (g.rooms) { g.rooms = null; if (g.members.length) KP.assignRooms(state, g); }
    state.groups.push({
      id: 'g' + (state.nextGroupId++),
      type: 'solo', gender: p.gender || 'f',
      gen: (state.gen && state.gen.n) || (KP.C.RISEFALL && KP.C.RISEFALL.GEN.start),
      originGroupId: g.id,   // the door swings both ways (v0.9.25)
      name: KP.displayName(p),
      members: [p.id],
      roles: { leader: p.id, center: p.id },
      formedWeek: state.week,
      centerHistory: [{ week: state.week, id: p.id }],
      debuted: false, prep: null, results: null, demos: null, releases: [],
    });
    p.history.push({ week: state.week, text: 'Graduated from ' + g.name + ' into solo management. Same building, new door on it.' });
    return { ok: true, note: KP.fillPro(KP.displayName(p) + ' graduates from ' + g.name + ' into solo management — same company, {pos} own calendar now. The fandom grieves the lineup for a week and then starts the solo-debut countdown clock.', p) };
  };

  // ---- the timeline reacts -------------------------------------------------
  KP.onFeedEvent('renewed', (state, n, rng) => {
    const p = state.people[n.personId];
    if (!p) return null;
    return rng.pick([
      { persona: 'fan', text: KP.fillPro('RE-SIGNED. SEVEN MORE YEARS. deleting my worry drafts, un-lighting my candle, returning the tissues. ' + KP.displayName(p) + ' chose US', p) },
      { persona: 'stan', text: KP.fillPro('the ' + KP.displayName(p) + ' renewal announcement dropped at 9am sharp and the fandom moved from panic to euphoria in eleven seconds. new record', p) },
    ]);
  });
  KP.onFeedEvent('contractEnd', (state, n, rng) => {
    const p = state.people[n.personId];
    if (!p) return null;
    return rng.pick(n.warm ? [
      { persona: 'fan', text: KP.fillPro('read ' + KP.displayName(p) + '’s handwritten letter four times and cried four times. thank you for seven years. the door stays open and so do we', p) },
      { persona: 'casual', text: KP.fillPro('don’t follow this group closely but the ' + KP.displayName(p) + ' farewell letter got ME. imagine being loved like that at your job', p) },
    ] : [
      { persona: 'stan', text: KP.fillPro('three sentences. SEVEN YEARS and the statement was three sentences. the fandom is doing forensics on every comma and honestly? so am I', p) },
      { persona: 'anti', text: 'companies really let their own people walk out the door and then act surprised when the fandom asks questions. asking the questions louder now' },
    ]);
  });

  // ---- the member desk (v0.9.20, §61 items 3/4) -------------------------
  // Three verbs on a contracted member — remove from the lineup but keep
  // the paper, terminate the paper entirely at a priced buyout, or grant
  // a personal break the group promotes through — and the meeting SHE
  // calls when the grudge ledger and an empty tank agree.

  // 1. cut from the lineup, kept on the books: she becomes a groupless
  // idol on her own calendar (the 0.9.18.2 machinery carries her)
  KP.removeFromLineup = function (state, groupId, personId) {
    const MD = KP.C.MEMBER_DESK;
    const g = KP.groupById(state, groupId);
    const p = state.people[personId];
    if (!g || !p || !g.members.includes(personId)) return { ok: false, reason: 'Not in that lineup.' };
    if (p.flags && p.flags.military) return { ok: false, reason: KP.fillPro('Not while {she} serves — cutting a man from the lineup mid-service is the kind of headline that ends companies.', p) };
    if (g.tour) return { ok: false, reason: 'Lineup surgery on the road is a scandal, not a decision. Bring them home.' };
    if (g.prep) return { ok: false, reason: 'A release is locked with this lineup on the sleeve. Let the era land first.' };
    if (g.debuted && state.week <= (g.promoUntil || 0)) return { ok: false, reason: 'Promotions are running. The stage count changes when the era ends, not mid-song.' };
    if (g.members.length <= 2) return { ok: false, reason: 'Removing ' + KP.publicGiven(p) + ' would not leave a group. That is a different conversation — the disband, or the solo.' };
    KP.lineupSurgery(state, g, p, false, n => KP.note(state, n));
    p.morale = KP.clamp(p.morale - MD.removeMorale, 0, 100);
    KP.recordDirected(state, p.id, 'cutFromLineup', -3);
    p.history.push({ week: state.week, text: 'Removed from ' + g.name + ' by company decision — contract retained. The statement said “new individual activities.” The practice room said other things.' });
    g.members.map(id => state.people[id]).filter(Boolean).forEach(m => {
      m.morale = KP.clamp(m.morale - MD.removeMateMorale, 0, 100);
    });
    const note = KP.note(state, { kind: 'public', ind: 'lineupChange', priority: 'critical',
      personId: p.id, groupId: g.id,
      text: KP.fillPro(g.name + ' continues as ' + g.members.length + ': ' + KP.displayName(p) +
        ' leaves the lineup but stays with the company for “individual activities.” The fandom read the statement four times looking for the sentence that explains it. It is not there.', p) });
    return { ok: true, note: note.text };
  };

  // 2. the buyout: end the paper entirely, priced by what remains of it
  KP.terminationCost = function (state, p) {
    const T = KP.C.MEMBER_DESK.TERMINATE;
    const yearsLeft = p.contract ? Math.max(0, KP.C.CONTRACT.years - (KP.contractYear(state, p) || 1)) : 1;
    return Math.round(T.base + yearsLeft * T.perYear + KP.renewalRead(state, p).fame * T.perFame);
  };
  KP.terminateContract = function (state, personId) {
    const T = KP.C.MEMBER_DESK.TERMINATE;
    const p = state.people[personId];
    if (!p || p.status !== 'idol') return { ok: false, reason: 'Termination is for active artists. Trainees are released, not bought out.' };
    if (p.flags && p.flags.military) return { ok: false, reason: KP.fillPro('Not while {she} serves. Even this industry has a floor, and buying out a soldier is under it.', p) };
    const g = KP.groupOf(state, personId);
    if (g && g.tour) return { ok: false, reason: 'Not from a tour bus. Bring them home first.' };
    const cost = KP.terminationCost(state, p);
    if (state.budget < cost) return { ok: false, reason: 'The buyout runs ' + cost + ' — remaining years plus what her name is worth. The budget says no.' };
    state.budget -= cost;
    const mates = g ? g.members.filter(id => id !== personId) : [];
    p.history.push({ week: state.week, text: 'Contract terminated by ' + state.company.short + ' — bought out, effective immediately. The industry keeps a list of companies that do this, and how.' });
    KP.departIdol(state, personId, 'cold', null);
    mates.map(id => state.people[id]).filter(Boolean).forEach(m => {
      m.morale = KP.clamp(m.morale - T.mateMorale, 0, 100);
      KP.recordDirected(state, m.id, 'watchedTermination', -2);
    });
    const note = KP.note(state, { kind: 'public', ind: 'terminated', priority: 'critical', personId: p.id,
      text: KP.fillPro(state.company.short + ' terminated ' + KP.displayName(p) + '’s exclusive contract — a buyout, effective immediately, ' + cost + ' on the books. The statement is legally immaculate, which the internet correctly reads as its own kind of statement.', p) });
    return { ok: true, cost, note: note.text };
  };

  // 3. the personal break: the group promotes as N−1; her calendar stops
  KP.declareMemberBreak = function (state, personId) {
    const p = state.people[personId];
    if (!p || p.status !== 'idol') return { ok: false, reason: 'Personal breaks are for active artists.' };
    if (p.flags.military) return { ok: false, reason: KP.fillPro('{She} is in service — the state has already scheduled the break.', p) };
    if (p.flags.personalHiatus) return { ok: false, reason: KP.fillPro('{She} is already on a break.', p) };
    const g = KP.groupOf(state, personId);
    if (!g) return { ok: false, reason: 'A groupless artist rests by scheduling nothing. No statement needed.' };
    if (g.type === 'solo' || g.members.length === 1) return { ok: false, reason: 'A solo act’s break IS the act’s hiatus. Declare it from the group page.' };
    if (g.tour) return { ok: false, reason: 'Mid-tour, this is a medical statement, not a plan. Bring them home.' };
    p.flags.personalHiatus = { since: state.week };
    p.history.push({ week: state.week, text: 'Stepped back for a personal break — health and rest, the statement said, and for once meant it. The group promotes on without ' + (p.gender === 'm' ? 'him' : 'her') + ' for a while.' });
    const note = KP.note(state, { kind: 'public', ind: 'memberBreak', priority: 'high', personId: p.id, groupId: g.id,
      text: KP.fillPro(KP.displayName(p) + ' is taking a break from activities for health and rest — ' + g.name + ' continues as ' + (g.members.length - 1) + ' for now. The fandom’s reply is unanimous for once: rest well, seat kept.', p) });
    return { ok: true, note: note.text };
  };
  KP.endMemberBreak = function (state, personId) {
    const p = state.people[personId];
    if (!p || !p.flags.personalHiatus) return { ok: false, reason: 'No break to end.' };
    const weeks = state.week - p.flags.personalHiatus.since;
    delete p.flags.personalHiatus;
    p.morale = KP.clamp(p.morale + 3, 0, 100);
    p.history.push({ week: state.week, text: 'Returned from a ' + weeks + '-week personal break — quieter, steadier, visibly slept.' });
    const note = KP.note(state, { kind: 'public', ind: 'memberReturn', priority: 'high', personId: p.id,
      text: KP.fillPro(KP.displayName(p) + ' is back after ' + weeks + ' weeks — the return photo is one coffee cup and a practice room mirror, and the fandom has already made it a wallpaper.', p) });
    return { ok: true, note: note.text };
  };

  // 4. the meeting she calls — the grudge ledger and an empty tank agree
  function grudgeScore(p) {
    let s = 0;
    (p.directed || []).forEach(a => {
      if (a.kind === 'promiseBroken') s += 2;
      if (a.kind === 'disbandedUs') s += 2;
      if (a.kind === 'cutFromLineup') s += 2;
      if (a.kind === 'heldBack') s += 1;
      if (a.kind === 'leftWaiting') s += 1;
      if (a.kind === 'watchedTermination') s += 1;
      if (a.kind === 'heldToPaper') s += 2;
      if (a.kind === 'madeHerHide') s += 2;   // the denial she carries (v0.9.30)
    });
    return s;
  }
  KP.registerWeekly('memberDesk', 788, function (state, rng, inbox, roster) {
    const W = KP.C.MEMBER_DESK.WALKOUT;
    // personal breaks rest for real (the medical bench's gentler cousin)
    roster.forEach(p => {
      if (!p.flags.personalHiatus) return;
      const MD = KP.C.MEMBER_DESK;
      p.fatigue = KP.clamp(p.fatigue - MD.breakRecovery, 0, 100);
      p.morale = KP.clamp(p.morale + MD.breakMorale, 0, 100);
    });
    // the walkout: at most one such meeting on the desk at a time
    if ((state.scenes || []).some(sc => sc.kind === 'walkOut')) return;
    const candidate = roster.find(p =>
      p.status === 'idol' && !KP.onBreak(p) &&
      p.morale < W.moraleBelow && grudgeScore(p) >= W.grudgeAt &&
      state.week - (p.flags.walkoutAsked || -999) >= W.cooldownWeeks &&
      !(state.scenes || []).some(sc => sc.personId === p.id));
    if (candidate && rng.chance(W.chance)) {
      candidate.flags.walkoutAsked = state.week;
      KP.openScene(state, { kind: 'walkOut', personId: candidate.id,
        expiresWeek: state.week + 3 });
      inbox.push({ kind: 'development', urgent: true, personId: candidate.id,
        text: KP.fillPro(KP.displayName(candidate) + ' requested a meeting through {pos} manager — formally, in writing, with a lawyer’s font. Everyone in the building knows what a meeting requested like THAT is about. {She} wants out.', candidate) });
    }
  });

  KP.registerScene('walkOut', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'The') + ' · the meeting she called';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return '';
      return KP.fillPro(KP.displayName(p) + ' sat down, thanked you for the years, and asked to be released from {pos} contract. No tears, no threats — {she} has clearly rehearsed this more than any stage. The ledger between you is the reason, and you both know every line of it.', p);
    },
    options: (state, sc) => {
      const p = state.people[sc.personId] || null;
      const cost = p ? KP.C.MEMBER_DESK.WALKOUT.negotiateBase +
        KP.renewalRead(state, p).fame * KP.C.MEMBER_DESK.WALKOUT.negotiatePerFame : 0;
      return [
        { id: 'negotiate', label: 'Hear her out and fix it · ' + cost },
        { id: 'hold', label: 'Hold her to the paper' },
        { id: 'release', label: KP.fillPro('Let {her} go', p) },
      ];
    },
    resolve: (state, sc, optionId) => {
      const W = KP.C.MEMBER_DESK.WALKOUT;
      const p = state.people[sc.personId];
      if (!p) return {};
      if (optionId === 'negotiate') {
        const cost = W.negotiateBase + KP.renewalRead(state, p).fame * W.negotiatePerFame;
        if (state.budget < cost) return { ok: false, toast: 'Fixing it costs ' + cost + '. The budget says hold or fold.' };
        state.budget -= cost;
        p.morale = KP.clamp(p.morale + W.negotiateMorale, 0, 100);
        KP.recordDirected(state, p.id, 'heardOut', 2);
        p.flags.walkoutSettled = state.week;
        p.history.push({ week: state.week, text: 'Asked to leave; stayed. The company heard the whole list and changed what it could. Neither side pretended it fixed everything. Both sides showed up Monday.' });
        return { toast: KP.fillPro('{She} read the revised terms twice, and the second time {pos} shoulders came down an inch. “Okay,” {she} said. Not happy — heard. There is a difference, and it cost exactly ' + cost + '.', p) };
      }
      if (optionId === 'hold') {
        p.morale = KP.clamp(p.morale + W.holdMorale, 0, 100);
        p.personality.confidence = KP.clamp((p.personality.confidence || 50) - 4, 0, 100);
        KP.recordDirected(state, p.id, 'heldToPaper', -2);
        p.history.push({ week: state.week, text: 'Asked to leave. The company pointed at the contract. The contract won. Something else lost.' });
        return { toast: KP.fillPro('You slid the contract across the table, and {she} looked at it the way people look at weather. “Understood,” {she} said, and went back to work. The renewal table will remember this meeting better than either of you.', p) };
      }
      // release: at her request — warm for her, real for the roster
      p.history.push({ week: state.week, text: 'Asked to be released, and was. The goodbye was quiet, mutual, and cheaper than the fight.' });
      KP.departIdol(state, p.id, 'warm', null);
      return { toast: KP.fillPro('You signed it. {She} thanked you twice — once as an artist, once as a person — and left the building lighter than {she} entered it. The fandom will grieve. The renewal tables of everyone watching just got easier.', p) };
    },
    expire: (state, sc) => {
      const W = KP.C.MEMBER_DESK.WALKOUT;
      const p = state.people[sc.personId];
      if (!p) return null;
      p.morale = KP.clamp(p.morale + W.expireMorale, 0, 100);
      KP.recordDirected(state, p.id, 'leftWaiting', -2);
      return { kind: 'development', urgent: true, personId: p.id,
        text: KP.fillPro('The meeting ' + KP.displayName(p) + ' requested never got scheduled. {She} noticed. The lawyer’s font will be back, and next time it will not be addressed to you first.', p) };
    },
  });

  // the timeline reacts to the desk's verbs
  KP.onFeedEvent('lineupChange', (state, n, rng) => {
    const p = state.people[n.personId];
    const g = KP.groupById(state, n.groupId);
    if (!p || !g) return null;
    return rng.pick([
      { persona: 'fan', text: '“individual activities” is doing SO much work in the ' + g.name + ' statement. we can all read. we are choosing not to, for our health' },
      { persona: 'anti', text: 'a lineup change with a statement that explains nothing. the group chat has theories and honestly some of them are load-bearing' },
    ]);
  });
  KP.onFeedEvent('terminated', (state, n, rng) => {
    const p = state.people[n.personId];
    if (!p) return null;
    return rng.pick([
      { persona: 'press', text: 'Contract termination, effective immediately, buyout undisclosed. Industry sources describe the move as “decisive,” which is what industry sources say when they mean “cold.”' },
      { persona: 'fan', text: KP.fillPro('terminated. TERMINATED. like a phone plan. {she} gave that company years and the statement has a word count in the thirties', p) },
    ]);
  });
  KP.onFeedEvent('memberBreak', (state, n, rng) => {
    const p = state.people[n.personId];
    if (!p) return null;
    return rng.pick([
      { persona: 'fan', text: KP.fillPro('rest well ' + KP.publicGiven(p) + '. the seat is kept, the fancams are archived, the group chat lights a candle every friday. take every week you need', p) },
      { persona: 'casual', text: 'a company actually letting somebody rest BEFORE the hospital thread? growth. genuine growth. cautiously impressed' },
    ]);
  });
  KP.onFeedEvent('memberReturn', (state, n, rng) => {
    const p = state.people[n.personId];
    if (!p) return null;
    return { persona: 'stan', text: KP.fillPro(KP.publicGiven(p) + ' IS BACK. one coffee cup photo and the timeline is HEALED. attendance at the next stage is mandatory, tell your bosses', p) };
  });
})(typeof window !== 'undefined' ? window : globalThis);
