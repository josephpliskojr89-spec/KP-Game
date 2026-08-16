/* The gravity (v0.9.18) — individual-trajectory rails, both directions.
   §55.2, owner: "social media, executives, and the industry as a whole
   would begin clamoring for a solo career for a member who begins to
   transcend their group." The transcendence READ crosses a line and the
   CLAMOR begins in stages, from every voice the game already has: the
   trades write the feature, the fandom splits into camps, the exec asks
   at the Monday meeting, the sponsors call likelier, and eventually SHE
   knocks. Settle it with the in-group solo credit, hold it and pay the
   resentment clock the renewal table reads, or open the door and watch
   the spin-out. The same rails read downward: the SLUMP — the vocalist
   who loses her nerve for an era, with a middle register (the quiet
   era, the push-through, the friend who says it out loud) and the
   stage that gives it back. Plus the identity arcs: repeated behavior
   mints group narratives — festival icons, the variety group, the OST
   factory — that change how the invitations arrive. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  const SHELF = ['fancamStar', 'itGirl', 'varietyMonster', 'nationalMC', 'ostVoice', 'brandDarling'];

  // ---- the transcendence read (deterministic — no rng, one truth) ------
  KP.transcendRead = function (state, g, p) {
    const total = g.members.reduce((s, id) => s + ((state.people[id] || {}).social || 0), 0) || 1;
    const share = ((p.social || 0) / total) - 1 / Math.max(1, g.members.length);
    const shelf = SHELF.filter(k => KP.getNarrative(state, k, 'idol', p.id)).length;
    const breakouts = Math.min(4, (p.history || []).filter(h => /Named the breakout/.test(h.text)).length);
    const shines = Math.min(3, p.flags.soloShines || 0);
    return Math.round(share * 120 + shelf * 8 + breakouts * 5 + shines * 4);
  };
  // words, never a meter
  KP.gravityWord = function (read) {
    const G = KP.C.GRAVITY;
    return read >= G.transcendAt ? 'bigger than the group?'
      : read >= G.transcendAt * 0.6 ? 'first among equals'
      : read >= G.transcendAt * 0.3 ? 'the face' : 'one of the room';
  };

  function ledger(state) {
    return state.gravityLedger = state.gravityLedger ||
      { clamors: 0, settled: 0, held: 0, knocks: 0, slumps: 0, footings: 0 };
  }

  // the entry rung (v0.9.27, owner: "not all solo acts should be created
  // equal... more flexible than a ladder every single time") — the
  // conversation STARTS at the rung her record and her dominance have
  // already earned. A prior solo credit skips the stage ask; a prior
  // album skips to the career; a star who doubles the room's median
  // following was never going to ask for one song.
  KP.starRung = function (state, g, p) {
    const ST = KP.C.STAR;
    let rung = 1;
    const credits = (KP.trackCreditsOf ? KP.trackCreditsOf(state, p.id) : []);
    if (credits.some(c => c.type === 'solo')) rung = 2;
    if ((p.soloAlbums || 0) >= 1) rung = 3;
    const others = g.members.filter(id => id !== p.id)
      .map(id => KP.socialOf(state, state.people[id])).sort((a, b) => a - b);
    if (others.length) {
      const median = others[Math.floor(others.length / 2)] || 1;
      const ratio = KP.socialOf(state, p) / Math.max(1, median);
      // dominance fast-tracks to the ALBUM; the career entrance still
      // requires an album on the record — even a star who towers over
      // the room runs an era of her own before the office ask (first
      // cut let dominance jump straight to the fork: 80% of soak orgs
      // minted solo acts, which is an epidemic, not flexibility)
      if (ratio >= ST.dominanceAlbum) rung = Math.max(rung, 2);
    }
    return Math.min(ST.rungMax, rung);
  };

  // the proactive launch (v0.9.27): the boss who opens the career door
  // BEFORE she has to ask three times — remembered warmly, forever
  KP.launchSoloCareer = function (state, personId) {
    const p = state.people[personId];
    if (!p || p.status !== 'idol') return { ok: false, reason: 'Careers launch for active artists.' };
    const g = KP.groupOf(state, personId);
    if (!g || g.type === 'solo') return { ok: false, reason: 'A soloist already has the career.' };
    if (g.members.length <= 2) return { ok: false, reason: 'Launching her would not leave a group behind. That is the disband conversation, not this one.' };
    if (KP.onBreak(p)) return { ok: false, reason: KP.fillPro('{She} is off the schedule. The launch waits for {her}.', p) };
    if (g.tour || g.prep) return { ok: false, reason: 'Mid-era is the wrong week for this press release. Let the calendar clear.' };
    const r = KP.graduateToSolo(state, personId);
    if (!r.ok) return r;
    if (g.gravity && !g.gravity.settled) { g.gravity.settled = 'spinout'; g.gravity.settledWeek = state.week; }
    g.newEra = { week: state.week, alum: p.id };
    p.morale = KP.clamp(p.morale + KP.C.STAR.launchMorale, 0, 100);
    KP.recordDirected(state, p.id, 'openedTheDoor', 2);
    p.history.push({ week: state.week, text: 'The company launched the solo career before the third conversation ever happened. Some doors get opened for you. She has never forgotten which kind of company does that.' });
    const led = ledger(state);
    led.careers = (led.careers || 0) + 1;
    const note = KP.note(state, { kind: 'public', ind: 'gravitySettled', priority: 'critical', personId: p.id, groupId: g.id,
      text: KP.fillPro(state.company.short + ' launched ' + KP.displayName(p) + '’s solo career — announced WITH the group, photographed as a family, framed as the plan all along. The industry note is unanimous: this is how it is done. ' + g.name + ' opens its next chapter; {she} opens {pos} own office door.', p) });
    return { ok: true, note: note.text };
  };

  // ---- the weekly rails --------------------------------------------------
  // Order 640: after releases (600) and the schools (620) — this week's
  // breakouts and follower moves feed this week's read.
  KP.registerWeekly('gravity', 640, function (state, rng, inbox, roster, groups) {
    const G = KP.C.GRAVITY;
    const S = KP.C.SLUMP;
    const A = KP.C.ARCS;
    const led = ledger(state);

    groups.forEach(g => {
      if (!g.debuted || g.retiredWeek) return;

      // ---- the up rail: transcendence and the clamor -------------------
      if (g.members.length >= G.minMembers) {
        const cur = g.gravity && !g.gravity.settled ? state.people[g.gravity.personId] : null;
        // the star's clock (v0.9.25): a settled clamor stays settled for
        // a while — then, if she is STILL the one pulling away, the
        // conversation comes back one rung bigger. A stage was an
        // answer; it stops being one.
        if (g.gravity && g.gravity.settled &&
            state.week - (g.gravity.settledWeek || 0) >= KP.C.STAR.reclamorWeeks) {
          const ST = KP.C.STAR;
          const star = state.people[g.gravity.personId];
          const rung = g.gravity.rung || 1;
          if (star && g.members.includes(star.id) && !KP.onBreak(star) &&
              rung < ST.rungMax &&
              KP.transcendRead(state, g, star) >= G.transcendAt) {
            g.gravity = { personId: star.id, since: state.week, stage: 0,
              settled: null,
              rung: Math.min(ST.rungMax, Math.max(rung + 1, KP.starRung(state, g, star))) };
            led.reclamors = (led.reclamors || 0) + 1;
            inbox.push({ kind: 'public', ind: 'gravityTrades', priority: 'critical',
              personId: star.id, groupId: g.id,
              text: KP.fillPro('The trades are back on ' + KP.displayName(star) + ', and the question grew: ' +
                (rung + 1 === 2 ? 'not a stage this time — an ALBUM. {Pos} name on a spine. The last answer bought a year, which is what answers buy.'
                  : 'not a stage, not an album — a CAREER. The word the piece uses is “inevitable,” and the piece is not wrong about people like {her}. The clock this starts does not wind back.'), star) });
          } else {
            delete g.gravity;   // the wave passed — the room resets for anyone
          }
        }
        if (!g.gravity) {
          // who, if anyone, is pulling away from the room
          const reads = g.members.map(id => state.people[id]).filter(Boolean)
            .filter(p => !(p.flags && p.flags.military))   // nobody clamors from a base (v0.9.23)
            .map(p => ({ p, read: KP.transcendRead(state, g, p) }))
            .sort((a, b) => b.read - a.read);
          const top = reads[0];
          if (top && top.read >= G.transcendAt) {
            g.gravityWatch = g.gravityWatch || { personId: top.p.id, since: state.week };
            if (g.gravityWatch.personId !== top.p.id) g.gravityWatch = { personId: top.p.id, since: state.week };
            if (state.week - g.gravityWatch.since >= G.holdWeeksToClamor) {
              // the pattern held — the clamor begins
              g.gravity = { personId: top.p.id, since: state.week, stage: 0, settled: null,
                rung: KP.starRung(state, g, top.p) };   // enter where the numbers are (v0.9.27)
              delete g.gravityWatch;
              led.clamors++;
              const nar = KP.recordEvidence(state, 'biggerThan', 'idol', top.p.id, { group: g.name });
              if (nar) inbox.push(nar);
              inbox.push({ kind: 'public', ind: 'gravityTrades', priority: 'critical',
                personId: top.p.id, groupId: g.id,
                text: KP.fillPro('The trades ran the feature everyone has been drafting for weeks: “' +
                  KP.displayName(top.p) + ' — bigger than ' + g.name + '?” Her numbers, her narratives, her share of every camera. The piece is careful. The comment sections are not. This conversation does not go back in its box.', top.p) });
            }
          } else {
            delete g.gravityWatch;
          }
        } else if (cur && !g.gravity.settled) {
          const gv = g.gravity;
          const weeks = state.week - gv.since;
          // stage 2: the fandom divides into camps — at rung 2 they are
          // not debating anymore, they are CAMPAIGNING for the album
          if (gv.stage < 1 && weeks >= G.splitStage) {
            gv.stage = 1;
            const dn = KP.igniteDiscourse(state, rng,
              (gv.rung || 1) >= 2 ? 'albumClamor' : 'soloClamor', 'idol', cur.id, g.id);
            if (dn) inbox.push(dn);
          }
          // stage 3: the Monday meeting asks (meeting.js reads this flag)
          if (gv.stage < 2 && weeks >= G.execStage) {
            gv.stage = 2;
            state.gravityExecAsk = { groupId: g.id, personId: cur.id };
          }
          // stage 5: she knocks — the ask she rehearsed
          if (gv.stage < 3 && weeks >= G.knockStage &&
              !(state.scenes || []).some(sc => sc.personId === cur.id)) {
            gv.stage = 3;
            led.knocks++;
            KP.openScene(state, { kind: 'soloKnock', personId: cur.id, groupId: g.id,
              expiresWeek: state.week + 3 });
            inbox.push({ kind: 'development', urgent: true, personId: cur.id,
              text: KP.fillPro(KP.displayName(cur) + ' asked for the meeting {she} has clearly rehearsed: the solo conversation, out loud, at last. Everyone in the building knew this knock was coming. The answer is on the Desk — and {she} has read the same trades everyone else has.', cur) });
          }
          // the resentment clock: held past the exec stage, it ticks —
          // unless a promise with a date is on the record. A promise is
          // an answer, not a hold; breaking it already costs more.
          const promised = (state.claims || []).some(c =>
            !c.resolved && c.type === 'soloPromise' && c.personId === cur.id);
          if (!promised && gv.stage >= 2 && weeks >= G.execStage &&
              (weeks - G.execStage) % G.resentEvery === 0 && weeks > G.execStage) {
            gv.heldTicks = (gv.heldTicks || 0) + 1;
            if (gv.heldTicks === 1) led.held++;
            cur.morale = KP.clamp(cur.morale + G.resentMorale, 0, 100);
            KP.recordDirected(state, cur.id, 'heldBack', -1);
            if (gv.heldTicks === 2) {
              inbox.push({ kind: 'development', priority: 'high', personId: cur.id,
                text: KP.fillPro('The staff notice ' + KP.displayName(cur) + ' checking the door of every meeting {she} is in. The solo conversation everyone is having AROUND {her} has not been had WITH {her}. That arithmetic is being done nightly, in a dorm room, with the lights off.', cur) });
            }
          }
          // ---- resolution: rung 1 settles on a solo credit; rung 2 on
          // the ALBUM; rung 3 only settles at the knock (the fork)
          const soloCredit = (gv.rung || 1) >= 3 ? false
            : (gv.rung || 1) === 2 ? (cur.lastSoloAlbumWeek || 0) >= gv.since
            : (KP.trackCreditsOf ? KP.trackCreditsOf(state, cur.id) : [])
              .some(c => c.type === 'solo' && c.week >= gv.since);
          if (soloCredit) {
            gv.settled = 'solo';
            gv.settledWeek = state.week;
            led.settled++;
            cur.morale = KP.clamp(cur.morale + G.settleMorale, 0, 100);
            if (g.fandom) KP.fandomGain(g, G.settleFandom);
            KP.recordDirected(state, cur.id, 'promiseKept', 2);
            const wasAlbum = (gv.rung || 1) === 2;
            cur.history.push({ week: state.week, text: wasAlbum
              ? 'The solo album — her name on a spine, the group name in the liner notes. The answer to the second wave of clamor, and a bigger one than the first.'
              : 'The solo stage inside the group — the answer to a year of clamor. Both camps claimed the win. Both were right.' });
            inbox.push({ kind: 'public', ind: 'gravitySettled', priority: 'critical',
              personId: cur.id, groupId: g.id,
              text: KP.fillPro(wasAlbum
                ? 'The album is REAL: ' + KP.displayName(cur) + ', solo, a full record, still in the group. The campaign accounts posted the tracklist like a treaty. Everyone knows what the third conversation is about, and everyone has agreed not to have it today.'
                : 'The clamor got its answer: ' + KP.displayName(cur) + ' — solo, ON the record, IN the group. The solo-clamor camp is celebrating a win. The loyalists are celebrating that {she} stayed. The company is celebrating quietly, because this was the only move that let everyone win, and it nearly did not happen.', cur) });
            (state.discourses || []).forEach(d => {
              if ((d.kind === 'soloClamor' || d.kind === 'albumClamor') &&
                  String(d.subjectId) === String(cur.id) && d.status === 'live') {
                d.status = 'resolved'; d.resolved = 'settled';
              }
            });
          }
        }
        // the spin-out settles it from outside: she left the lineup
        if (g.gravity && !g.gravity.settled && !g.members.includes(g.gravity.personId)) {
          g.gravity.settled = 'spinout';
          g.gravity.settledWeek = state.week;
        }
      }

      // ---- the identity arcs -------------------------------------------
      if ((g.festivalsPlayed || 0) >= A.festivalIconsAt &&
          !KP.getNarrative(state, 'festivalIcons', 'group', g.id)) {
        const nar = KP.recordEvidence(state, 'festivalIcons', 'group', g.id);
        if (nar) inbox.push(nar);
      }
      // the counters are the gig system's own (v0.9.11) — one truth
      const wraps = g.members.reduce((s, id) => {
        const m = state.people[id];
        return s + (m ? (m.flags.panelArcs || 0) + (m.flags.mcRuns || 0) : 0);
      }, 0);
      if (wraps >= A.varietyGroupAt && !KP.getNarrative(state, 'varietyGroup', 'group', g.id)) {
        const nar = KP.recordEvidence(state, 'varietyGroup', 'group', g.id);
        if (nar) inbox.push(nar);
      }
      const osts = g.members.reduce((s, id) =>
        s + (((state.people[id] || { flags: {} }).flags.ostDrops) || 0), 0);
      if (osts >= A.ostFactoryAt && !KP.getNarrative(state, 'ostFactory', 'group', g.id)) {
        const nar = KP.recordEvidence(state, 'ostFactory', 'group', g.id);
        if (nar) inbox.push(nar);
      }
    });

    // ---- the down rail: the slump ----------------------------------------
    roster.forEach(p => {
      if (!p || p.status !== 'idol') return;
      const g = KP.groupOf(state, p.id);
      if (!g || !g.debuted) return;

      if (!p.flags.slump) {
        // entry: the nerve goes when everything else already has
        const lastRel = (g.releases || [])[(g.releases || []).length - 1];
        const badEra = lastRel && (lastRel.receptionBand === 'miss' || lastRel.receptionBand === 'quiet');
        const stormed = (state.discourses || []).some(d => d.kind === 'encore' &&
          String(d.subjectId) === String(p.id) && state.week - d.week <= 8);
        if (p.morale < S.enterMoraleBelow && p.personality.confidence < S.enterConfidenceBelow &&
            (badEra || stormed) && rng.chance(S.enterChance)) {
          p.flags.slump = { since: state.week, kind: 'nerve' };
          ledger(state).slumps++;
          p.history.push({ week: state.week, text: 'The nerve went somewhere. Hitting the notes in the practice room, missing something on the stage — and knowing everyone can tell.' });
          if (!(state.scenes || []).some(sc => sc.personId === p.id)) {
            KP.openScene(state, { kind: 'quietEra', personId: p.id, groupId: g.id,
              expiresWeek: state.week + 3 });
          }
          inbox.push({ kind: 'development', urgent: true, personId: p.id,
            text: KP.fillPro('The vocal coach closed the door to say it: ' + KP.displayName(p) +
              ' has lost the nerve — not the voice, the NERVE. Clean in rehearsal, braced on stage, and {she} knows everyone can tell, which is the engine of the whole thing. What the company does next is on the Desk.', p) });
        }
      } else {
        const sl = p.flags.slump;
        const shielded = g.slumpShield && g.slumpShield.personId === p.id && state.week <= g.slumpShield.until;
        const promoting = g.debuted && state.week <= (g.promoUntil || 0);
        if (shielded) {
          p.personality.confidence = KP.clamp(p.personality.confidence + S.shieldRecovery * (sl.talked ? 1.5 : 1), 0, 100);
        } else if (promoting) {
          p.personality.confidence = KP.clamp(p.personality.confidence + S.pushConfidence, 0, 100);
        } else {
          p.personality.confidence = KP.clamp(p.personality.confidence + 0.5 * (sl.talked ? 1.5 : 1), 0, 100);
        }
        // the exits: the nerve returns — by a win, by recovery, by time
        const stageWin = S.winExits && g.lastShowWinWeek === state.week;
        if (stageWin || p.personality.confidence >= S.exitConfidence ||
            state.week - sl.since >= S.exitWeeksMax) {
          delete p.flags.slump;
          if (g.slumpShield && g.slumpShield.personId === p.id) delete g.slumpShield;
          ledger(state).footings++;
          const byStage = stageWin;
          p.history.push({ week: state.week, text: byStage
            ? 'The stage gave the nerve back. One clean night in front of a real crowd did what four months of practice-room reassurance could not.'
            : 'Found the footing again. Quietly, the way it left.' });
          inbox.push({ kind: 'public', ind: 'foundFooting', priority: 'high', personId: p.id,
            text: KP.fillPro(byStage
              ? KP.displayName(p) + ' stood on the stage that had been the problem and OWNED it — and the whole room could see the nerve come back mid-song. The fancams caught the exact moment. The fandom has watched it a thousand times and cried a thousand times.'
              : KP.displayName(p) + ' looks like {herself} again — the staff noticed it before {she} said it, the fans noticed it before the staff. Nobody is making it a thing, which is exactly how {she} wants it.', p) });
        }
      }
    });
  });

  // ---- the knock: the ask she rehearsed ---------------------------------
  KP.registerScene('soloKnock', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'The one they clamor for') + ' · the solo conversation';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      const g = KP.groupById(state, sc.groupId);
      const rung = (g && g.gravity && g.gravity.rung) || 1;
      if (rung >= 3) {
        return KP.fillPro((p ? KP.displayName(p) : 'She') + ' does not bring a clipping this time. “The stage happened. The album happened. Both were true answers, and I am grateful — and we both know what this meeting is. I want the career. I would rather build it HERE, next door to ' + (g ? g.name : 'the group') + ', than across the street.” The clock on the wall is very loud.', p);
      }
      if (rung === 2) {
        return KP.fillPro((p ? KP.displayName(p) : 'She') + ' sits down with a folder this time, not a clipping — a tracklist, handwritten, page numbers and everything. “The stage was real. Thank you for it. But the fans are not campaigning for a stage anymore — they want the ALBUM, and honestly? So do I.” The campaign hashtag has been trending twice a week.', p);
      }
      return KP.fillPro((p ? KP.displayName(p) : 'She') + ' sits down with the trades feature everyone read, folded to the page. “I am not asking to leave ' + (g ? g.name : 'the group') + '. I am asking what the plan is — for me. There is one, isn’t there?” {She} rehearsed this. It shows, in the best way.', p);
    },
    options: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      const rung = (g && g.gravity && g.gravity.rung) || 1;
      if (rung >= 3) {
        return [
          { id: 'open', label: 'Launch the solo career — same house' },
          { id: 'group', label: 'Hold her to the lineup' },
        ];
      }
      return [
        { id: 'promise', label: rung === 2 ? 'The album. On the record.' : 'A solo. On the record.' },
        { id: 'group', label: 'The group comes first — for now' },
        { id: 'open', label: 'Open the solo door — graduation' },
      ];
    },
    resolve: (state, sc, optionId) => {
      const G = KP.C.GRAVITY;
      const p = state.people[sc.personId];
      const g = KP.groupById(state, sc.groupId);
      if (!p) return { toast: 'The moment resolved itself.' };
      const rung = (g && g.gravity && g.gravity.rung) || 1;
      if (optionId === 'promise') {
        p.morale = KP.clamp(p.morale + 6, 0, 100);
        const type = rung === 2 ? 'soloAlbumPromise' : 'soloPromise';
        const already = (state.claims || []).some(c => !c.resolved &&
          c.type === type && c.personId === p.id);
        if (!already) KP.openClaim(state, { type, subject: { kind: 'idol', id: p.id },
          personId: p.id,
          byWeek: state.week + (rung === 2 ? KP.C.STAR.albumPromiseWeeks : G.soloPromiseWeeks),
          label: rung === 2 ? 'A solo ALBUM for ' + KP.displayName(p) + ' — her name on the spine'
            : 'A solo credit for ' + KP.displayName(p) + ', on a record' });
        p.history.push({ week: state.week, text: rung === 2
          ? 'Asked the album question and got a date, on the record. Left the handwritten tracklist behind — on purpose.'
          : 'Asked the solo question and got a date, on the record. Kept the trades clipping anyway.' });
        return { toast: KP.fillPro('“On the record” were the words {she} came for.' +
          (rung === 2 ? ' The tracklist stays on your desk — a reminder, in {pos} handwriting.' : ' {She} left the clipping on your desk — a reminder, politely.'), p) };
      }
      if (optionId === 'group') {
        // holding at the career rung is a different weight class of no
        p.morale = KP.clamp(p.morale - (rung >= 3 ? KP.C.STAR.rung3Morale : 5), 0, 100);
        KP.recordDirected(state, p.id, rung >= 3 ? 'heldToPaper' : 'heldBack', rung >= 3 ? -3 : -2);
        p.history.push({ week: state.week, text: rung >= 3
          ? 'Asked for the career and was held to the lineup. Said nothing. Started keeping the kind of counsel lawyers eventually hear.'
          : 'Asked the solo question. The answer was the group, for now. Wrote the date of the meeting somewhere private.' });
        return { toast: KP.fillPro(rung >= 3
          ? '{She} heard the no all the way through, thanked you for the years in a voice you did not recognize, and left. The clamor will not stop. The clock will not stop. And the meeting {she} calls next may have a lawyer’s font on it.'
          : '{She} nodded like a professional and left like a stranger. The clamor outside continues; the clock inside just started.', p) };
      }
      // the spin-out, chosen: graduation with the door held open — at
      // rung 3 it is the LAUNCH, the fork the whole clock pointed at
      const r = KP.graduateToSolo ? KP.graduateToSolo(state, p.id) : { ok: false };
      if (!r.ok) {
        return { toast: r.reason || 'The graduation path is not open this week.' };
      }
      if (g && g.gravity) { g.gravity.settled = 'spinout'; g.gravity.settledWeek = state.week; }
      if (g) g.newEra = { week: state.week, alum: p.id };   // chapter two opens (v0.9.25)
      if (rung >= 3) {
        const led2 = ledger(state);
        led2.careers = (led2.careers || 0) + 1;
      }
      return { toast: KP.fillPro(rung >= 3
        ? 'You said yes before the clock finished ticking. The launch, done right: same house, {pos} own calendar, a group that gets a new chapter instead of a wound — and a door that swings BOTH ways. Return runs have been arranged for less.'
        : 'You opened the door before {she} had to push it. The spin-out, done warm: same company, {pos} own calendar, and a group that gets to say it blessed the flight.', p),
        note: r.note ? { kind: 'public', priority: 'high', personId: p.id, text: r.note } : null };
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return null;
      p.morale = KP.clamp(p.morale - 6, 0, 100);
      KP.recordDirected(state, p.id, 'leftWaiting', -2);
      return { kind: 'development', priority: 'high', personId: p.id,
        text: KP.fillPro(KP.displayName(p) + ' asked the rehearsed question and got a week of silence for it. {She} will not ask again. The trades will — they always do — and next time {she} may answer them instead of you.', p) };
    },
  });

  // ---- the solo album (v0.9.25): her name on a spine of its own -------
  KP.releaseSoloAlbum = function (state, personId) {
    const ST = KP.C.STAR;
    const p = state.people[personId];
    if (!p || p.status !== 'idol') return { ok: false, reason: 'Solo albums are for active artists.' };
    const g = KP.groupOf(state, p.id);
    if (!g || !g.debuted) return { ok: false, reason: 'The in-group solo album needs a group around it. A soloist just makes albums.' };
    if (KP.onBreak(p)) return { ok: false, reason: KP.fillPro('{She} is off the schedule. The record waits for {her}.', p) };
    if (g.tour) return { ok: false, reason: 'Not from the road. The tour ends, then the studio opens.' };
    if (state.week - (p.lastSoloAlbumWeek || -999) < ST.albumCooldown) {
      return { ok: false, reason: 'One solo era at a time. The last one is still on the charts of somebody’s heart.' };
    }
    if (state.budget < ST.albumCost) return { ok: false, reason: 'Producing her record runs ' + ST.albumCost + '. The budget says not yet.' };
    state.budget -= ST.albumCost;
    const rng = KP.rngFor(state);
    const d = KP.derived(p);
    const read = KP.transcendRead ? KP.transcendRead(state, g, p) : 40;
    const reception = Math.round(KP.clamp(
      0.42 * d.stagePresence + 0.28 * Math.max(p.talents.vocals.cur, p.talents.dance.cur) +
      0.30 * read + rng.normal(0, 5), 1, 100));
    state.rngState = rng.state();
    const title = KP.genSongTitle(rng, {});
    const revenue = Math.round(reception * ST.albumRevPerReception);
    state.budget += revenue;
    p.lastSoloAlbumWeek = state.week;
    p.soloAlbums = (p.soloAlbums || 0) + 1;
    p.morale = KP.clamp(p.morale + ST.albumMorale, 0, 100);
    KP.socialSpike(state, p, KP.C.SOCIAL.breakoutSpike * 2, 'soloAlbum');
    if (g.fandom) g.fandom.intensity = KP.clamp((g.fandom.intensity || 0) - ST.albumFandomSplit, 0, 100);
    KP.chartEnter(state, { title, act: KP.displayName(p), company: state.company.short,
      isPlayer: true, score: reception, entered: state.week });
    (state.discourses || []).forEach(dc => {
      if (dc.kind === 'albumClamor' && String(dc.subjectId) === String(p.id) && dc.status === 'live') {
        dc.status = 'resolved'; dc.resolved = 'answered';
      }
    });
    p.history.push({ week: state.week, text: 'Released the solo album — “' + title + '”. ' + g.name + ' in the liner notes, her name alone on the spine.' });
    const led = ledger(state);
    led.albums = (led.albums || 0) + 1;
    const note = KP.note(state, { kind: 'public', ind: 'soloAlbum', priority: 'critical',
      personId: p.id, groupId: g.id,
      text: KP.fillPro(KP.displayName(p) + '’s solo album “' + title + '” is OUT — full record, {pos} name on the spine, ' + g.name + ' thanked in the first line of the credits. The campaign accounts that spent a year asking for this are somewhere between triumphant and unemployed. Reception ' + reception + ', fee +' + revenue + '.', p) });
    return { ok: true, reception, title, note: note.text };
  };

  // the album promise: a full record by the deadline
  KP.registerClaim('soloAlbumPromise', (state, c) => {
    const p = state.people[c.personId];
    if (!p) return { resolved: 'missed', notes: [] };
    if ((p.lastSoloAlbumWeek || 0) >= c.week) {
      KP.recordDirected(state, p.id, 'promiseKept', 3);
      return { resolved: 'met',
        notes: [{ kind: 'development', priority: 'high', personId: p.id,
          text: KP.fillPro('The promised album exists. ' + KP.displayName(p) + ' signed a copy for the front desk — “to the company that said yes.” The campaign accounts have already moved on to demanding a repackage, because fandoms are perpetual-motion machines.', p) }] };
    }
    if (state.week > c.byWeek) {
      p.morale = KP.clamp(p.morale - 8, 0, 100);
      KP.recordDirected(state, p.id, 'promiseBroken', -4);
      return { resolved: 'missed',
        notes: [{ kind: 'development', priority: 'high', personId: p.id,
          text: KP.fillPro('The album date passed with no album. ' + KP.displayName(p) + ' took the handwritten tracklist back off your desk without a word, which said the whole thing. The next conversation will not be about records.', p) }] };
    }
    return null;
  });

  // ---- the return run (v0.9.25): the door swings both ways ------------
  KP.registerScene('returnRun', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'The alum') + ' · the return run';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      const g = KP.groupById(state, sc.groupId);
      if (!p || !g) return '';
      return KP.fillPro('The date is announced, and the obvious question is on every account within the hour: is ' + KP.displayName(p) + ' on it? {She} graduated, not left — same building, one floor over — and {pos} manager has already asked, carefully, what the plan is. A return run: one era, full member, then back to {pos} own calendar. The fandom would lose its collective mind in the best possible way.', p);
    },
    options: () => [
      { id: 'invite', label: 'Bring her back for the run' },
      { id: 'skip', label: 'This era stands on its own' },
    ],
    resolve: (state, sc, optionId) => {
      const ST = KP.C.STAR;
      const p = state.people[sc.personId];
      const g = KP.groupById(state, sc.groupId);
      if (!p || !g || !g.prep) return {};
      if (optionId === 'invite') {
        g.prep.returnRun = p.id;
        g.prep.buildup = (g.prep.buildup || 0) + ST.returnRunBuildup;
        p.morale = KP.clamp(p.morale + ST.returnRunMorale, 0, 100);
        const led = ledger(state);
        led.returnRuns = (led.returnRuns || 0) + 1;
        p.history.push({ week: state.week, text: 'Said yes to the return run before the sentence finished. Some doors you keep oiled.' });
        KP.note(state, { kind: 'public', ind: 'returnRunSet', priority: 'critical',
          personId: p.id, groupId: g.id,
          text: KP.fillPro('CONFIRMED: ' + KP.displayName(p) + ' returns to ' + g.name + ' for the whole era — the photo of {her} back in the practice room, in {pos} old spot, broke every record the fan cafés keep. One run. Full member. The countdown accounts are not okay, and they would like everyone to know it.', p) });
        return { toast: KP.displayName(p) + ' is IN for the era. The room is already rearranging itself around the old chemistry.' };
      }
      return { toast: 'This era stands on its own — the alum sends flowers and a very public stream link on release day. The door stays oiled for next time.' };
    },
    expire: () => null,
  });

  KP.onFeedEvent('soloAlbum', (state, n, rng) => {
    const p = n.personId ? state.people[n.personId] : null;
    const name = p ? KP.publicGiven(p) : 'her';
    return rng.pick([
      { persona: 'fan', text: name + ' SOLO ALBUM DAY. her name. on a SPINE. we campaigned, we trended, we believed, and the b-sides are better than entire discographies I could name but won’t' },
      { persona: 'stan', text: 'the ' + name + ' solo album credits thank the group in line one and the fans in line two. correct order debatable. crying either way' },
      { persona: 'casual', text: 'a group idol dropping a genuinely good solo album while staying in the group is the industry actually working for once. more of this' },
    ]);
  });
  KP.onFeedEvent('returnRunSet', (state, n, rng) => {
    const p = n.personId ? state.people[n.personId] : null;
    const name = p ? KP.publicGiven(p) : 'she';
    return rng.pick([
      { persona: 'fan', text: name + ' IS BACK FOR THE ERA. the practice room photo. the OLD SPOT. I have been normal for zero seconds and counting. this is the event of the year and it is not close' },
      { persona: 'stan', text: 'return run confirmed and the fandom civil war (solo stans vs group stans) just signed a peace treaty for one era. historians will study this' },
    ]);
  });

  // the promise with a date: a solo credit, on a record, by the deadline
  KP.registerClaim('soloPromise', (state, c) => {
    const p = state.people[c.personId];
    if (!p) return { resolved: 'missed', notes: [] };
    const kept = (KP.trackCreditsOf ? KP.trackCreditsOf(state, p.id) : [])
      .some(cr => cr.type === 'solo' && cr.week >= c.week);
    if (kept) {
      KP.recordDirected(state, p.id, 'promiseKept', 3);
      return { resolved: 'met',
        notes: [{ kind: 'development', priority: 'high', personId: p.id,
          text: KP.fillPro(KP.displayName(p) + ' played the promised solo. Afterwards, backstage: “You said on the record. It is on the record.” {She} finally threw the trades clipping away — it had done its job.', p) }] };
    }
    if (state.week > c.byWeek) {
      p.morale = KP.clamp(p.morale - 8, 0, 100);
      KP.recordDirected(state, p.id, 'promiseBroken', -4);
      return { resolved: 'missed',
        notes: [{ kind: 'development', priority: 'high', personId: p.id,
          text: KP.fillPro('The solo date came and went without a solo. ' + KP.displayName(p) + ' did not bring it up, which was worse than bringing it up. The renewal table will remember what {she} is too professional to say.', p) }] };
    }
    return null;
  });

  // ---- the quiet era: what the company does about a slump ---------------
  KP.registerScene('quietEra', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'A member') + ' · the quiet era';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      return KP.fillPro('The staff are asking what the plan is for ' + (p ? KP.displayName(p) : 'her') +
        '. The nerve is gone — not the skill, the nerve — and every camera makes it worse. There are three schools of thought and the building holds all of them.', p);
    },
    options: (state, sc) => {
      const p = state.people[sc.personId];
      const hasFriend = p && KP.friendsOf && KP.friendsOf(state, p.id).length > 0;
      return [
        { id: 'shield', label: 'The quiet era — shield her' },
        { id: 'push', label: 'The schedule is the schedule' },
        hasFriend ? { id: 'talk', label: 'Ask her friend to take her to dinner' } : null,
      ].filter(Boolean);
    },
    resolve: (state, sc, optionId) => {
      const S = KP.C.SLUMP;
      const p = state.people[sc.personId];
      const g = KP.groupById(state, sc.groupId);
      if (!p || !p.flags.slump) return { toast: 'The moment resolved itself.' };
      if (optionId === 'shield') {
        if (g) g.slumpShield = { personId: p.id, until: state.week + S.shieldWeeks };
        KP.recordDirected(state, p.id, 'protected', 2);
        p.history.push({ week: state.week, text: 'The company built a quiet era around the bad stretch — fewer cameras, no questions. Protected, and {she} knew it.'.replace('{she}', p.gender === 'm' ? 'he' : 'she') });
        return { toast: KP.fillPro('The schedule around {her} goes soft for two months. The fans will notice {she} is resting. That is the point — let them see the company blink first.', p) };
      }
      if (optionId === 'talk') {
        const f = KP.friendsOf(state, p.id)[0];
        const friend = state.people[f.a === p.id ? f.b : f.a];
        p.flags.slump.talked = true;
        p.morale = KP.clamp(p.morale + S.talkMorale, 0, 100);
        return { toast: KP.fillPro((friend ? KP.displayName(friend) : 'A friend') + ' took {her} to the kind of dinner where nobody performs. Whatever got said stays there. {She} came back lighter — not fixed. Lighter counts.', p) };
      }
      p.history.push({ week: state.week, text: 'The schedule stayed the schedule, slump or no slump. Professionalism as policy.' });
      return { toast: KP.fillPro('The schedule holds. {She} will stand on every stage booked, nerve or no nerve — and either the stage gives it back, or the era costs {her} more than it should.', p) };
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return null;
      return { kind: 'development', personId: p.id,
        text: KP.fillPro('Nobody decided anything about ' + KP.displayName(p) + '’s stretch, which is itself a decision — the schedule stays the schedule by default. The staff exchanged the look staff exchange.', p) };
    },
  });

  // ---- the timeline reads the rails --------------------------------------
  KP.onFeedEvent('gravityTrades', (state, n, rng) => {
    const p = state.people[n.personId];
    const name = p ? KP.publicGiven(p) : 'her';
    return rng.pick([
      { persona: 'stan', text: 'the “bigger than the group” article is out and I am NOT ready for this conversation. she IS the group. she is ALSO bigger than it. both true. do not make me choose' },
      { persona: 'casual', text: 'that feature on ' + name + ' asked the question everyone thinks during every stage. the group is great. she is a PHENOMENON. what happens next is the whole story' },
      { persona: 'anti', text: 'trades manufacturing a solo debate to sell clicks, meanwhile the group is fine and eating. anyway everyone read it twice, me included' },
    ]);
  });
  KP.onFeedEvent('gravitySettled', (state, n, rng) => {
    const p = state.people[n.personId];
    const name = p ? KP.publicGiven(p) : 'she';
    return rng.pick([
      { persona: 'fan', text: name + ' SOLO ON THE ALBUM. in the group. with the group. the only correct answer to a year of discourse and they actually chose it' },
      { persona: 'stan', text: 'solo-clamor camp: we won. loyalist camp: we won. the group: still whole. rare W for literally every faction including the company' },
    ]);
  });
  KP.onFeedEvent('foundFooting', (state, n, rng) => {
    const p = state.people[n.personId];
    const name = p ? KP.publicGiven(p) : 'she';
    return rng.pick([
      { persona: 'fan', text: 'the clip of ' + name + ' finding it again mid-song is the most rewatched thing on my phone. you can SEE the exact second. sports documentaries wish' },
      { persona: 'casual', text: 'did not realize how braced I was for ' + name + '’s stages until tonight, when nobody had to be. welcome back' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
