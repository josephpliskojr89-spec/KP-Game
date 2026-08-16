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
              g.gravity = { personId: top.p.id, since: state.week, stage: 0, settled: null };
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
          // stage 2: the fandom divides into camps
          if (gv.stage < 1 && weeks >= G.splitStage) {
            gv.stage = 1;
            const dn = KP.igniteDiscourse(state, rng, 'soloClamor', 'idol', cur.id, g.id);
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
          // ---- resolution: the in-group solo credit settles it ----------
          const soloCredit = (KP.trackCreditsOf ? KP.trackCreditsOf(state, cur.id) : [])
            .some(c => c.type === 'solo' && c.week >= gv.since);
          if (soloCredit) {
            gv.settled = 'solo';
            gv.settledWeek = state.week;
            led.settled++;
            cur.morale = KP.clamp(cur.morale + G.settleMorale, 0, 100);
            if (g.fandom) KP.fandomGain(g, G.settleFandom);
            KP.recordDirected(state, cur.id, 'promiseKept', 2);
            cur.history.push({ week: state.week, text: 'The solo stage inside the group — the answer to a year of clamor. Both camps claimed the win. Both were right.' });
            inbox.push({ kind: 'public', ind: 'gravitySettled', priority: 'critical',
              personId: cur.id, groupId: g.id,
              text: KP.fillPro('The clamor got its answer: ' + KP.displayName(cur) + ' — solo, ON the record, IN the group. The solo-clamor camp is celebrating a win. The loyalists are celebrating that {she} stayed. The company is celebrating quietly, because this was the only move that let everyone win, and it nearly did not happen.', cur) });
            (state.discourses || []).forEach(d => {
              if (d.kind === 'soloClamor' && String(d.subjectId) === String(cur.id) && d.status === 'live') {
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
      return KP.fillPro((p ? KP.displayName(p) : 'She') + ' sits down with the trades feature everyone read, folded to the page. “I am not asking to leave ' + (g ? g.name : 'the group') + '. I am asking what the plan is — for me. There is one, isn’t there?” {She} rehearsed this. It shows, in the best way.', p);
    },
    options: () => [
      { id: 'promise', label: 'A solo. On the record.' },
      { id: 'group', label: 'The group comes first — for now' },
      { id: 'open', label: 'Open the solo door — graduation' },
    ],
    resolve: (state, sc, optionId) => {
      const G = KP.C.GRAVITY;
      const p = state.people[sc.personId];
      const g = KP.groupById(state, sc.groupId);
      if (!p) return { toast: 'The moment resolved itself.' };
      if (optionId === 'promise') {
        p.morale = KP.clamp(p.morale + 6, 0, 100);
        const already = (state.claims || []).some(c => !c.resolved &&
          c.type === 'soloPromise' && c.personId === p.id);
        if (!already) KP.openClaim(state, { type: 'soloPromise', subject: { kind: 'idol', id: p.id },
          personId: p.id, byWeek: state.week + G.soloPromiseWeeks,
          label: 'A solo credit for ' + KP.displayName(p) + ', on a record' });
        p.history.push({ week: state.week, text: 'Asked the solo question and got a date, on the record. Kept the trades clipping anyway.' });
        return { toast: KP.fillPro('“On the record” were the words {she} came for. {She} left the clipping on your desk — a reminder, politely.', p) };
      }
      if (optionId === 'group') {
        p.morale = KP.clamp(p.morale - 5, 0, 100);
        KP.recordDirected(state, p.id, 'heldBack', -2);
        p.history.push({ week: state.week, text: 'Asked the solo question. The answer was the group, for now. Wrote the date of the meeting somewhere private.' });
        return { toast: KP.fillPro('{She} nodded like a professional and left like a stranger. The clamor outside continues; the clock inside just started.', p) };
      }
      // the spin-out, chosen: graduation with the door held open
      const r = KP.graduateToSolo ? KP.graduateToSolo(state, p.id) : { ok: false };
      if (!r.ok) {
        return { toast: r.reason || 'The graduation path is not open this week.' };
      }
      if (g && g.gravity) { g.gravity.settled = 'spinout'; g.gravity.settledWeek = state.week; }
      return { toast: KP.fillPro('You opened the door before {she} had to push it. The spin-out, done warm: same company, {pos} own calendar, and a group that gets to say it blessed the flight.', p),
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
