/* The era, closed (v0.11.9, §100). Every comeback had a first half — the
   announcement, the teasers, the landing — and then promotion simply ran
   out. This module is the second half: the week promotion ends the desk
   reads the era back (the last stage, the tally in words, the room), marks
   the release closed, and, when the drawer is stocked, opens the reissue as
   a door instead of a panel. The pressing's pre-order week is a read here
   too. No draw is made anywhere in this file: every pick is a hash. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  KP.eraLedger = function (state) {
    state.eraLedger = state.eraLedger || { closed: 0, reissueOffered: 0, anr: 0, fans: 0, desk: 0,
      rested: 0, lapsed: 0, superseded: 0, preorderReads: 0, preorderAhead: 0, preorderSoft: 0 };
    return state.eraLedger;
  };

  const lastRel = g => (g.releases || []).length ? g.releases[g.releases.length - 1] : null;
  const present = (state, g) => g.members.map(id => state.people[id]).filter(m => m && !KP.onBreak(m));
  const BAND_WORD = { sensation: 'a sensation', strong: 'strong', solid: 'solid', quiet: 'quiet', miss: 'a miss' };

  // the room after a cycle, in a word (fatigue is a hidden truth: never a digit)
  KP.eraRoomWord = function (state, g) {
    const E = KP.C.ERA, ms = present(state, g);
    if (!ms.length) return 'empty';
    const avg = ms.reduce((a, m) => a + (m.fatigue || 0), 0) / ms.length;
    return avg >= E.roomSpentAt ? 'spent' : avg >= E.roomTiredAt ? 'tired' : 'fresh';
  };
  // the era's verdict: a win on the shelf outranks the reception's word
  KP.eraVerdict = function (rel) {
    if ((rel.trophies || 0) >= 1) return 'crowned';
    const b = rel.receptionBand;
    return b === 'sensation' || b === 'strong' ? 'warm' : b === 'miss' ? 'cold' : 'quiet';
  };

  const OPEN = {
    crowned: [
      (g, t) => 'The “' + t + '” era closes with hardware on the shelf.',
      (g, t) => 'The lights go down on “' + t + '”, and ' + g.name + '’s trophy case is heavier than it was a month ago.',
      (g, t) => g.name + ' are done promoting “' + t + '”, and the era ends the way the meeting hoped: with a win to point at.',
    ],
    warm: [
      (g, t) => 'The “' + t + '” era closes warm.',
      (g, t) => g.name + '’s last stage for “' + t + '” is in the can, and the era goes out on its feet.',
      (g, t) => 'Promotion for “' + t + '” is over, and nobody in the building is in a hurry to stop talking about it.',
    ],
    quiet: [
      (g, t) => 'The “' + t + '” era closes quietly.',
      (g, t) => g.name + ' have played “' + t + '” for the last time this cycle. The era did its job and no more.',
      (g, t) => 'Promotion for “' + t + '” ends on schedule, which is the kindest thing the schedule did for it.',
    ],
    cold: [
      (g, t) => 'The “' + t + '” era closes, and the building is relieved to say so.',
      (g, t) => g.name + '’s “' + t + '” cycle is over. The meeting that planned it will be reading its own notes for a while.',
      (g, t) => 'Promotion for “' + t + '” ends. The broadcasters had stopped asking a week ago.',
    ],
  };
  const ROOM = {
    fresh: 'The room comes out of it fresh.',
    tired: 'The room comes out of it tired, in the ordinary way.',
    spent: 'The room comes out of it spent, and the calendar should know that.',
  };

  function stageSentence(state, rel) {
    const ls = rel.lastStage;
    if (!ls) return 'No broadcaster had the group in its last week: the era ended off the schedule.';
    const where = KP.showLabel ? KP.showLabel(ls.showId) : 'the last show';
    const p = ls.carried ? state.people[ls.carried] : null;
    const head = 'The last stage, on ' + where + ', ';
    if (ls.band === 'carried') return head + 'was carried' + (p ? ': ' + KP.displayName(p) + ' took it and did not hand it back.' : '.');
    if (ls.band === 'clean') return head + 'was clean.';
    if (ls.band === 'shaky') return head + 'wobbled, the way last stages do when the month catches up with the room.';
    if (ls.band === 'fumbled') return head + 'was fumbled, and that is the clip the era ends on.';
    return 'The last slot, on ' + where + ', went unfilled.';
  }

  function tallySentence(state, g, rel) {
    const bits = [];
    const n = rel.trophies || 0;
    bits.push(n >= 2 ? n + ' trophies' : n === 1 ? 'one trophy' : 'no trophy');
    bits.push(rel.chartPeak ? 'a best chart week at #' + rel.chartPeak +
      (rel.nationalPeak ? ' (#' + rel.nationalPeak + ' on the national board)' : '') : 'no week on the chart');
    if (rel.chodong) {
      const pr = rel.pressing || {};
      const best = g.releases.length > 1 && g.releases.every(r => r === rel || (r.chodong || 0) < rel.chodong);
      let s = 'a first week of ' + KP.fmtCount(rel.chodong) + ' copies';
      if (best) s += ', a career best';
      if (pr.soldOut) s += ', the pressing sold through';
      else if (pr.overpress) s += ', boxes left in the warehouse';
      if (pr.preorder) {
        // the read against the landing, on one scale: sold through, sized, boxes left.
        // The read was an ordinary week's; the gap between the two is the record itself.
        const w = pr.preorder.word;
        const exp = w === 'ahead' ? 1 : w === 'soft' ? -1 : 0;
        const out = pr.soldOut ? 1 : pr.overpress ? -1 : 0;
        s += out === exp ? ' (the pre-order week called it)'
          : Math.abs(out - exp) === 2 ? ' (the pre-order week read it wrong)'
          : out > exp ? ' (the record outran its pre-orders)'
          : ' (the record fell short of its pre-orders)';
      }
      bits.push(s);
    }
    if (rel.critics && rel.critics.consensus && KP.verdictWord) {
      // a split verdict was told its arguments would outlast the promotion:
      // the close does not say the critics settled when they did not
      bits.push(rel.critics.split
        ? 'critics still arguing, the middle voice at “' + KP.verdictWord(rel.critics.consensus) + '”'
        : 'critics who settled on “' + KP.verdictWord(rel.critics.consensus) + '”');
    }
    return 'The tally: ' + bits.join('; ') + '.';
  }

  // the door's gates: the same ground planRepackage stands on, read at the close
  KP.reissueOpenFor = function (state, g, rel) {
    if (!rel || (rel.format || 'single') === 'single' || rel.repackageOf || rel.reissueRested) return false;
    if (!(g.eraLeftovers || []).length || g.prep || g.jpAway || g.tour) return false;
    return !g.members.some(id => state.people[id] && state.people[id].soloEra);
  };

  // the close itself: the letter, the mark on the file, the room's small move
  KP.closeEra = function (state, g, rel) {
    const E = KP.C.ERA, RP = KP.C.REPACKAGE;
    const verdict = KP.eraVerdict(rel);
    const lines = OPEN[verdict].map(f => f(g, rel.songTitle));
    const open = KP.lineFor(state, 'eraClosed|' + g.id, lines, g.lastCloseLine);
    g.lastCloseLine = lines.indexOf(open);
    const parts = [open, stageSentence(state, rel), tallySentence(state, g, rel)];
    // the second wind: an era that took its extra weeks says so, and the file keeps it
    const extended = !!(KP.eraExtended && KP.eraExtended(g));
    if (extended) parts.splice(2, 0, 'It ran past its plan on a second wind: the record was still climbing when the last week came.');
    const room = KP.eraRoomWord(state, g);
    if (ROOM[room]) parts.push(ROOM[room]);
    if (rel.repackageOf) {
      const first = g.releases.slice(0, -1).reverse().find(r => r.songTitle === rel.repackageOf);
      if (first && BAND_WORD[first.receptionBand] && BAND_WORD[rel.receptionBand]) {
        parts.push('That closes both acts: “' + first.songTitle + '” landed ' + BAND_WORD[first.receptionBand] +
          ', and its reissue ' + BAND_WORD[rel.receptionBand] + '.');
      }
    }
    const door = KP.reissueOpenFor(state, g, rel);
    if (door) {
      const n = g.eraLeftovers.length;
      parts.push('The drawer still holds ' + (n === 1 ? 'a demo' : n + ' demos') + ' the meeting passed on, and the era is warm enough to reissue until ' +
        KP.weekLabel((g.promoUntil || 0) + RP.windowWeeks).text + ': the call is on the desk.');
    }
    const d = verdict === 'crowned' ? E.closeMoraleUp : verdict === 'cold' ? -E.closeMoraleDown : 0;
    if (d) present(state, g).forEach(m => { m.morale = KP.clamp((m.morale || 0) + d, 0, 100); });
    rel.closed = { week: state.week, trophies: rel.trophies || 0, lastStage: rel.lastStage ? rel.lastStage.band : null, verdict, room };
    if (extended) rel.closed.extended = true;
    KP.eraLedger(state).closed++;
    if (door) KP.openReissue(state, g, rel);
    return { kind: 'company', ind: 'eraClosed', priority: 'high', groupId: g.id, verdict, text: parts.join(' ') };
  };

  // order 596: after the week's stages (580) and promotion (585), before a landing (600)
  KP.registerWeekly('eraClose', 596, function (state, rng, inbox, roster, groups) {
    groups.forEach(g => {
      if (g.retiredWeek || !g.members.length || !g.debuted) return;
      const rel = lastRel(g);
      // exact-week equality: an old save never closes an ancient era
      if (!rel || rel.closed || state.week !== (g.promoUntil || 0) + 1) return;
      // nor one it joined mid-promotion: the tally and the last stage were
      // not kept before this build (save.js stamps `since` on such a file).
      // A record that landed the week of the stamp has every promotion week
      // ahead of it, and closes whole.
      const since = KP.eraLedger(state).since;
      if (since != null && (rel.week || 0) < since) return;
      inbox.push(KP.closeEra(state, g, rel));
    });
  });

  // ---- the reissue, as a door ---------------------------------------------
  // the desk's build: one truth for the scene's label, the Studio panel and the verb
  KP.reissueBuild = function (state, g) {
    return { mv: 'standard', signRounds: KP.suggestPressing(state, g).signRounds };
  };
  KP.reissuePressing = function (state, g, signRounds) {
    const P = KP.C.PRODUCT;
    const sheet = KP.normalizePressing(state, g, signRounds == null ? null : { signRounds });
    // a reprint sells a share of the era's demand: the run is sized to it
    sheet.run = Math.max(200, Math.round(sheet.run * P.repackDemand));
    sheet.lockRead = Math.round(sheet.lockRead * P.repackDemand);
    return sheet;
  };
  KP.reissueBill = function (state, g, opts) {
    const RP = KP.C.REPACKAGE, MV = KP.C.MV, o = opts || {};
    const last = lastRel(g);
    const mv = MV.TIERS[o.mv] ? o.mv : 'standard';
    let bill = Math.round(KP.recordBill(g, o.promo || 'standard', (last && last.format) || 'mini') * RP.costMult) +
      Math.round(MV.TIERS[mv].cost * KP.statureCostMult(g)) +
      KP.pressingBill(state, g, KP.reissuePressing(state, g, o.signRounds));
    if (KP.homeCostMult) bill = Math.round(bill * KP.homeCostMult(state));
    return bill;
  };
  KP.roundsWord = n => n === 0 ? 'no fan-sign rounds' : n === 1 ? 'one fan-sign round' : n + ' fan-sign rounds';

  // the picks are stamped when the door opens: the chair hears the hook, the
  // cafés hear the era they just fell for
  KP.openReissue = function (state, g, rel) {
    const byId = (a, b) => (a.id < b.id ? -1 : 1);
    const drawer = g.eraLeftovers.slice();
    const anr = drawer.slice().sort((a, b) => (b.hook || 0) - (a.hook || 0) || byId(a, b))[0];
    const same = drawer.filter(d => d.conceptId === (rel.conceptId || g.conceptId));
    // what a fandom can see is the stage: among the era's own sound (or, with
    // none of it left, the whole drawer) the cafés ask for the best performance
    const fans = (same.length ? same : drawer).slice().sort((a, b) => (b.choreoPotential || 0) - (a.choreoPotential || 0) || byId(a, b))[0];
    KP.eraLedger(state).reissueOffered++;
    return KP.openScene(state, { kind: 'theReissue', groupId: g.id, anrId: anr.id, fansId: fans.id,
      fansWhy: same.length ? 'sound' : 'stage',
      expiresWeek: (g.promoUntil || 0) + KP.C.REPACKAGE.windowWeeks });
  };
  // a lock, or a reissue set from the Studio, answers the door: the question leaves the desk
  KP.eraDropReissue = function (state, g) {
    const before = (state.scenes || []).length;
    state.scenes = (state.scenes || []).filter(sc => !(sc.kind === 'theReissue' && sc.groupId === g.id));
    return state.scenes.length < before;
  };

  const demoOf = (g, id) => (g.eraLeftovers || []).find(d => d.id === id) || null;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  KP.registerScene('theReissue', {
    title: (state, sc) => { const g = KP.groupById(state, sc.groupId); return (g ? g.name : 'The era') + ' · the reissue'; },
    body: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      const rel = g ? lastRel(g) : null;
      const a = g ? demoOf(g, sc.anrId) : null, f = g ? demoOf(g, sc.fansId) : null;
      if (!g || !rel || !a) return 'The era has moved on, and the drawer with it.';
      const b = KP.reissueBuild(state, g);
      return 'The “' + rel.songTitle + '” era is closed and still warm. A reissue puts one of the demos the meeting passed on out as a new title track: a shorter cycle, a cheaper record, the fandom buying the photocards twice. ' +
        cap(KP.seatHolderName(state, 'anr')) + ' wants “' + a.title + '”: the strongest hook left in the drawer. ' +
        (f && f.id !== a.id ? 'The fan desk reads the cafés differently: ' +
            (sc.fansWhy === 'stage' ? 'they want the one that will look best on a stage' : 'they want more of this era’s sound') +
            ', and that is “' + f.title + '”. '
          : 'The fan desk reads the cafés the same way, for once. ') +
        'The desk would shoot a ' + KP.C.MV.TIERS[b.mv].label + ' and hold ' + KP.roundsWord(b.signRounds) + '. ' +
        'Or let the era rest: the room gets its weeks back, and the drawer closes for good.';
    },
    options: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      const a = g ? demoOf(g, sc.anrId) : null, f = g ? demoOf(g, sc.fansId) : null;
      const out = [];
      if (g && a) {
        const b = KP.reissueBuild(state, g);
        const tail = ' · ' + KP.C.MV.TIERS[b.mv].label + ' · ' + KP.roundsWord(b.signRounds) + ' · ' + KP.reissueBill(state, g, b);
        const agree = !f || f.id === a.id;
        out.push({ id: 'anr', label: (agree ? 'Reissue with “' + a.title + '” (the chair and the fans agree)'
          : 'Reissue with the chair’s pick, “' + a.title + '”') + tail });
        if (!agree) out.push({ id: 'fans', label: 'Reissue with the fans’ pick, “' + f.title + '”' + tail });
      }
      out.push({ id: 'rest', label: 'Let the era rest' });
      return out;
    },
    resolve: (state, sc, optionId, rng) => {
      const E = KP.C.ERA, L = KP.eraLedger(state);
      const g = KP.groupById(state, sc.groupId);
      const rel = g ? lastRel(g) : null;
      if (!g || !rel) return { toast: 'The era has moved on.' };
      if (optionId === 'rest') {
        rel.reissueRested = true;
        g.eraLeftovers = null;
        present(state, g).forEach(m => { m.fatigue = KP.clamp((m.fatigue || 0) - E.restRelief, 0, 100); });
        L.rested++;
        return { toast: 'The era rests. The drawer closes.',
          note: { kind: 'company', ind: 'eraRested', priority: 'normal', groupId: g.id,
            text: g.name + '’s “' + rel.songTitle + '” era rests where it closed: no reissue. The demos go back in the drawer for good, the room gets its weeks back, and the fandom gets to miss them, which is its own kind of promotion.' } };
      }
      const b = KP.reissueBuild(state, g);
      const fansPick = optionId === 'fans';
      const r = KP.planRepackage(state, { groupId: g.id, songId: fansPick ? sc.fansId : sc.anrId,
        mv: b.mv, signRounds: b.signRounds, by: fansPick ? 'fans' : 'anr', rng });
      if (!r.ok) return r;
      // the cafés were heard: the pick they asked for is the one on the sleeve
      if (fansPick || sc.fansId === sc.anrId) KP.fandomGain(g, E.fansPickFandom);
      return { toast: r.note.split(' — ')[0] + '.' };
    },
    // silence is the worst answer: no reissue, and no rest handed back either
    expire: (state) => { KP.eraLedger(state).lapsed++; return null; },
  });

  // ---- the pre-order week, as a read ---------------------------------------
  // order 591: the T-1 teaser (590) is in the buildup. The run was fixed at
  // lock against the fandom of that day; the read is the fandom of THIS
  // day, through the settle's own sum (KP.demandRead), a week before the
  // record and the luck finish it.
  //
  // The word is the settle's verdict on an ordinary week: a middling record
  // with no luck either way. 'ahead' is that week selling the run out;
  // 'soft' is that week leaving the warehouse memo (the settle's own
  // overpressAt); 'tracking' is everything between. No thresholds of its
  // own: the first build carried two (preorderAheadAt 1.0, preorderSoftAt
  // 0.7) against a different sum (KP.preorderRead's campaign factor, which
  // the settle never reads), and the soak measured the word as wallpaper,
  // 569 of 665 landings 'ahead' and none 'soft', calling the week no
  // better than the base rate (v0.11.9, §100 — measure-first).
  KP.preorderExpect = function (state, g) {
    const P = KP.C.PRODUCT;
    const sheet = g.prep && g.prep.pressing;
    if (!sheet) return null;
    return KP.demandRead(state, g, sheet) * (g.prep.repackage ? P.repackDemand : 1);
  };
  // the count the distributor reports: the share of that week already paid for
  KP.preorderCount = function (state, g) {
    const x = KP.preorderExpect(state, g);
    return x == null ? null : Math.round(x * KP.C.PRODUCT.FANBASE.preorderShare);
  };
  KP.preorderWord = function (state, g) {
    const P = KP.C.PRODUCT;
    const x = KP.preorderExpect(state, g);
    if (x == null) return null;
    const run = g.prep.pressing.run;
    return x > run ? 'ahead' : run > x * P.overpressAt ? 'soft' : 'tracking';
  };
  const PRE = {
    ahead: 'the read is ahead of the run. An ordinary week sells this pressing through, and the plant gets a phone call.',
    tracking: 'the read is tracking the run. The pressing is sized to the fandom that exists, and the record decides the rest.',
    soft: 'the read is soft against the run. Unless the record lands well, the warehouse is about to learn how many boxes that is.',
  };
  KP.registerWeekly('preorderWeek', 591, function (state, rng, inbox, roster, groups) {
    groups.forEach(g => {
      if (g.retiredWeek || !g.members.length || !g.prep || !g.prep.pressing || g.prep.preorder) return;
      if (g.prep.scheduledWeek - state.week !== 1) return;
      const word = KP.preorderWord(state, g);
      const L = KP.eraLedger(state);
      g.prep.preorder = { week: state.week, word };
      L.preorderReads++;
      if (word === 'ahead') L.preorderAhead++;
      if (word === 'soft') L.preorderSoft++;
      const demo = (g.demos || []).find(d => d.id === g.prep.songId);
      inbox.push({ kind: 'company', ind: 'preorderWeek', priority: 'normal', groupId: g.id, word,
        text: 'Pre-orders for ' + g.name + (demo ? '’s “' + demo.title + '”' : '’s record') + ' close the week at ' +
          KP.fmtCount(KP.preorderCount(state, g)) + ' against a pressing of ' + KP.fmtCount(g.prep.pressing.run) +
          '. Pre-orders run a little over half of a first week, and by that arithmetic ' + PRE[word] });
    });
  });

  // ---- the timeline hears the close (a hash pick: the stream stands still) ---
  KP.onFeedEvent('eraClosed', (state, n) => {
    const g = KP.groupById(state, n.groupId);
    if (!g) return null;
    const lines = {
      crowned: [
        { persona: 'fan', text: 'last stage of the era and I am not okay. ' + g.name + ' walked out of this one with a trophy and I walked out with no voice' },
        { persona: 'casual', text: g.name + ' wrapped promotions with a win on the shelf. that is how you close a cycle' },
      ],
      warm: [
        { persona: 'fan', text: 'goodbye stage done. ' + g.name + ' era over. the fancams are saved in three places and I will be rationing them' },
        { persona: 'casual', text: 'apparently ' + g.name + ' finished promoting this week. felt short, which I think is a compliment' },
      ],
      quiet: [
        { persona: 'fan', text: g.name + ' goodbye stage was today. small era, good era, ours. see you at the next one' },
        { persona: 'casual', text: g.name + ' wrapped up promotions. I caught maybe one stage. it was fine' },
      ],
      cold: [
        { persona: 'fan', text: 'the era is over and we are not going to talk about the charts. ' + g.name + ' did their job. the planning did not' },
        { persona: 'casual', text: 'did ' + g.name + ' have a comeback this month? genuinely asking. it is apparently already over' },
      ],
    }[n.verdict] || [];
    if (!lines.length) return null;
    return lines[Math.floor(KP.hash01([state.seed, 'eraClosedEcho', g.id, state.week].join('|')) * lines.length)];
  });

  KP.eraLastRelease = lastRel;
  KP.eraPresent = present;
})(typeof window !== 'undefined' ? window : globalThis);
