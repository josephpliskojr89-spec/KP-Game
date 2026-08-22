/* The person in public, part two (v0.10.2, §78 B) — the scandals.
   Owner: "no need to go in with what the scandals are per our
   philosophy, but they absolutely do happen. could force hiatuses or
   a member being let go. makes personality matter even more."

   The house philosophy holds: the sim names the SHAPE at altitude —
   an old post, a remark on the record, a story with legs, an
   entanglement — and never goes lower. The severity ladder: a storm;
   sponsors flinch; the forced hiatus the company did not choose; and
   the unsurvivable, where the company decides who it is. Personality
   moves the rate, exposure moves the surface, the public eye moves
   the blast radius — and below the fame line the story dies on page
   four, which is its own bleak mercy. Consequences and institutions,
   never bodies. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.scandalLedger = state.scandalLedger ||
      { broke: 0, storms: 0, sponsorHits: 0, forcedBreaks: 0, choices: 0,
        released: 0, protectedCount: 0, denied: 0, rebroke: 0, rivalStories: 0 };
    return state.scandalLedger;
  }
  KP.scandalLedger = ledger;

  function exposureOf(state, p) {
    const S = KP.C.SCANDAL;
    let surfaces = 0;
    if (p.broadcast) surfaces++;
    if ((state.deals || []).some(d => d.personId === p.id && d.weeksLeft > 0)) surfaces++;
    if ((state.gigs || []).some(gg => gg.personId === p.id && gg.weeksLeft > 0)) surfaces++;
    return 1 + surfaces * S.exposurePer;
  }
  function personRisk(state, p) {
    const S = KP.C.SCANDAL;
    return S.base *
      (1.6 - p.personality.professionalism / 100) *
      (1.3 - p.personality.resilience / 200) *
      exposureOf(state, p);
  }
  function rollSeverity(state, p, rng) {
    const S = KP.C.SCANDAL;
    const known = KP.publicEye ? KP.publicEye(state, p) : false;
    const r = rng.next() + (known ? 0.10 : 0);   // the public eye biases up
    let acc = 0, sev = 1;
    for (let i = 0; i < S.sevWeights.length; i++) {
      acc += S.sevWeights[i];
      if (r < acc) { sev = i + 1; break; }
      sev = i + 1;
    }
    // the unknown label's story dies on page four
    const fame = KP.fameRead ? KP.fameRead(state) : 1;
    if (fame < S.smallFameCap) sev = Math.min(sev, 2);
    return sev;
  }

  function breakStory(state, rng, inbox, p) {
    const S = KP.C.SCANDAL;
    const led = ledger(state);
    led.broke++;
    const shape = S.SHAPES[Math.floor(rng.next() * S.SHAPES.length)];
    const sev = rollSeverity(state, p, rng);
    const g = KP.groupOf(state, p.id);
    p.scandal = { shape, sev, week: state.week, answered: false };
    inbox.push({ kind: 'public', ind: 'scandalBreak', priority: 'high', personId: p.id,
      groupId: g ? g.id : undefined,
      text: KP.fillPro('The call every label dreads, at the hour they always come: a story about ' +
        KP.displayName(p) + ' is moving — ' + shape + '. The contents matter less than the physics: ' +
        (sev >= 3 ? 'this one has WEIGHT, and the outlets holding it are not asking for comment as a courtesy.'
          : sev === 2 ? 'big enough that the sponsors will see it before lunch.'
          : 'a storm-sized story — survivable, loud, and already moving.') +
        ' The response desk is open.', p) });
    const d = KP.igniteDiscourse && KP.igniteDiscourse(state, rng, 'scandal', 'idol', p.id, g ? g.id : null);
    if (d) inbox.push(d);
    led.storms++;
    p.morale = KP.clamp(p.morale - 4, 0, 100);
    if (sev >= 2) {
      led.sponsorHits++;
      (state.deals || []).forEach(dl => {
        if (dl.personId === p.id && dl.weeksLeft > 0) dl.cooled = true;
      });
      if (g && g.debuted) g.popularity = KP.clamp((g.popularity || 0) - 3, 0, 100);
    }
    KP.openScene(state, { kind: 'theStory', personId: p.id, sev, shape,
      expiresWeek: state.week + 2 });
  }

  function forceBreak(state, p, led) {
    if (p.status === 'idol' && KP.groupOf(state, p.id) &&
        KP.groupOf(state, p.id).members.length > 1 && !p.flags.personalHiatus) {
      const r = KP.declareMemberBreak(state, p.id);
      if (r.ok) {
        led.forcedBreaks++;
        p.flags.scandalBreakUntil = state.week + KP.C.SCANDAL.hiatusWeeks;
        p.history.push({ week: state.week, text: 'The story forced the company’s hand: a hiatus nobody planned, announced in the flattest possible statement.' });
        return true;
      }
    }
    // trainees and solo acts weather it in place — the file remembers
    p.history.push({ week: state.week, text: 'Weathered the story without stepping back — there was nowhere to step back FROM, which is its own kind of hard.' });
    return false;
  }

  KP.registerScene('theStory', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'The story') + ' · the response desk';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      return KP.fillPro('The story — ' + sc.shape + ' — is in its first news cycle, and the first ' +
        'cycle is the only one a response can shape. Statement, silence, or denial: three doors, ' +
        'all of them recorded forever. ' +
        (sc.sev >= 4 ? 'And the weight of this one means the NEXT meeting may not be about the story at all. It may be about {her}.' :
         sc.sev === 3 ? 'At this weight, a hiatus is likely leaving the building with or without your signature.' :
         'At this weight it is survivable — handled, or fumbled.'), p);
    },
    options: () => [
      { id: 'statement', label: 'A statement — own the frame' },
      { id: 'silence', label: 'Say nothing — starve it' },
      { id: 'deny', label: 'Deny it' },
    ],
    resolve: (state, sc, optionId) => {
      const p = state.people[sc.personId];
      if (!p || !p.scandal) return { toast: 'The cycle moved on.' };
      const S = KP.C.SCANDAL;
      const led = ledger(state);
      p.scandal.answered = optionId;
      if (optionId === 'statement') {
        state.budget -= S.statementCost;
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'marketing', -S.statementCost);
        p.morale = KP.clamp(p.morale - 2, 0, 100);
      }
      if (optionId === 'deny') {
        led.denied++;
        p.scandal.denied = state.week;
      }
      let toast;
      if (p.scandal.sev >= 3) {
        const broke = forceBreak(state, p, led);
        if (broke) {
          KP.note(state, { kind: 'public', ind: 'scandalBreakForced', priority: 'high', personId: p.id,
            text: KP.fillPro(KP.displayName(p) + ' steps back from activities effective immediately — the statement is one paragraph and the paragraph is exhausted. Nobody at the label chose this calendar. The story did.', p) });
        }
        toast = broke
          ? 'The response went out — and so did the hiatus notice. Twelve weeks, minimum. The story chose the calendar.'
          : 'The response went out. She weathers it in place — there was no lineup to step back from.';
      } else {
        toast = optionId === 'statement'
          ? 'The statement landed inside the first cycle — the frame is yours now, mostly. The fee was worth it.'
          : optionId === 'silence'
            ? 'Silence. The story eats itself or it doesn’t — you have chosen to find out which.'
            : 'Denied, on the record. If the story holds, the denial becomes the second story. That is the whole bet.';
      }
      if (p.scandal.sev >= 4) {
        KP.openScene(state, { kind: 'theChoice', personId: p.id, expiresWeek: state.week + 3 });
        led.choices++;
        KP.note(state, { kind: 'company', ind: 'theChoice', priority: 'high', personId: p.id,
          text: KP.fillPro('The weight of the ' + KP.displayName(p) + ' story has outgrown the response desk. The next meeting has two chairs and one question, and every label answers it eventually: protect {her}, or let {her} go. The table is on the Desk.', p) });
      } else if (p.scandal.sev < 3) {
        // survivable: the scar files, the story fades on its own clock
        KP.recordEvidence(state, 'weatheredStory', 'idol', p.id);
      }
      if (p.scandal.sev < 4) p.scandalFading = state.week + S.denyWindow;
      return { toast };
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p || !p.scandal) return null;
      p.scandal.answered = 'silence';
      if (p.scandal.sev >= 3) forceBreak(state, p, ledger(state));
      if (p.scandal.sev >= 4) {
        KP.openScene(state, { kind: 'theChoice', personId: p.id, expiresWeek: state.week + 3 });
        ledger(state).choices++;
      }
      return { kind: 'public', ind: 'scandalDrift', priority: 'high', personId: p.id,
        text: 'The response window closed with no response — the story wrote its own second cycle, and the company’s silence is quoted in it as a character.' };
    },
  });

  KP.registerScene('theChoice', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'The choice') + ' · two chairs, one question';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      return KP.fillPro('The story did not die. The sponsors are gone quiet, the fandom is split ' +
        'into two rooms that no longer speak, and the board wants a name for what happens next. ' +
        'Protect {her} — money, trust, and a wound the fandom will carry — or release {her}, and ' +
        'let the wound close over an empty chair. There is no third door. There never is.', p);
    },
    options: () => [
      { id: 'protect', label: 'Protect her — whatever it costs' },
      { id: 'release', label: 'Let her go' },
    ],
    resolve: (state, sc, optionId) => {
      const p = state.people[sc.personId];
      if (!p) return { toast: 'The moment passed.' };
      const S = KP.C.SCANDAL;
      const led = ledger(state);
      const g = KP.groupOf(state, p.id);
      if (optionId === 'protect' && state.budget >= S.protectCost) {
        led.protectedCount++;
        state.budget -= S.protectCost;
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'marketing', -S.protectCost);
        state.trust = KP.clamp(state.trust - S.protectTrust, 0, 100);
        if (g && g.fandom) g.fandom.intensity = KP.clamp(g.fandom.intensity - S.protectFandom, 0, 100);
        p.morale = KP.clamp(p.morale + 6, 0, 100);
        KP.recordEvidence(state, 'stoodByHer', 'idol', p.id);
        p.history.push({ week: state.week, text: 'The company stood in front of the story and did not move. Whatever else is ever said about this label, that is on the record too.' });
        delete p.scandal;
        return { toast: 'You protected her. It cost money, trust, and part of a fandom — and bought the only thing those can’t: the roster knowing what this label does when it matters.' };
      }
      led.released++;
      if (g) {
        g.members = g.members.filter(id => id !== p.id);
        Object.keys(g.roles || {}).forEach(r => { if (g.roles[r] === p.id) delete g.roles[r]; });
        if (g.fandom) g.fandom.intensity = KP.clamp(g.fandom.intensity - S.releaseFandom, 0, 100);
        // the dorm re-partitions around the empty chair (latent v0.10.2
        // bug: the room chart kept the released member)
        if (g.rooms) { g.rooms = null; if (g.members.length) KP.assignRooms(state, g); }
      }
      p.status = 'released';
      state.roster = state.roster.filter(id => id !== p.id);
      delete p.flags.personalHiatus;
      p.history.push({ week: state.week, text: 'Released. The statement used the word “mutual,” and nobody anywhere believed it. The story won.' });
      KP.note(state, { kind: 'public', ind: 'scandalRelease', priority: 'high', personId: p.id,
        groupId: g ? g.id : undefined,
        text: KP.fillPro('It is done: ' + KP.displayName(p) + ' and the company have parted ways. The statement is four sentences; the fandom’s response will run for months. An empty chair closes a wound and opens a different one — every label learns which trade this was, later.', p) });
      delete p.scandal;
      return { toast: 'She’s gone. The wound will close over the empty chair. What kind of label survives is now a settled question — the answer just cost you a person.' };
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return null;
      // an unanswered unsurvivable answers itself, worst
      const led = ledger(state);
      led.released++;
      const g = KP.groupOf(state, p.id);
      if (g) {
        g.members = g.members.filter(id => id !== p.id);
        Object.keys(g.roles || {}).forEach(r => { if (g.roles[r] === p.id) delete g.roles[r]; });
        if (g.fandom) g.fandom.intensity = KP.clamp(g.fandom.intensity - KP.C.SCANDAL.releaseFandom - 5, 0, 100);
        if (g.rooms) { g.rooms = null; if (g.members.length) KP.assignRooms(state, g); }
      }
      p.status = 'released';
      state.roster = state.roster.filter(id => id !== p.id);
      delete p.flags.personalHiatus;
      delete p.scandal;
      p.history.push({ week: state.week, text: 'Released by a company that never held the meeting. The silence was the decision.' });
      return { kind: 'public', ind: 'scandalRelease', priority: 'high', personId: p.id,
        text: 'The departure announced itself: no meeting, no defense, one paragraph. The fandom will remember that the company chose by not choosing.' };
    },
  });

  // ---- the week --------------------------------------------------------
  KP.registerWeekly('scandal', 797, function (state, rng, inbox, roster) {
    const S = KP.C.SCANDAL;
    const led = ledger(state);
    // the deny trap: a denied story can re-break, heavier
    roster.forEach(p => {
      if (p.scandal && p.scandal.denied && !p.scandal.rebroke &&
          state.week - p.scandal.denied <= S.denyWindow &&
          rng.chance(S.denyRebreakChance / S.denyWindow)) {
        p.scandal.rebroke = true;
        led.rebroke++;
        state.trust = KP.clamp(state.trust - 3, 0, 100);
        p.scandal.sev = Math.min(4, p.scandal.sev + 1);
        inbox.push({ kind: 'public', ind: 'scandalRebreak', priority: 'high', personId: p.id,
          text: KP.fillPro('The story re-broke — with receipts this time, and the company’s denial pinned above every repost. The first story was about ' + KP.displayName(p) + '. The second story is about the label, which is the trade denial always offers.', p) });
        if (p.scandal.sev >= 4 && !(state.scenes || []).some(sc => sc.kind === 'theChoice' && sc.personId === p.id)) {
          KP.openScene(state, { kind: 'theChoice', personId: p.id, expiresWeek: state.week + 3 });
          led.choices++;
        }
      }
      // fading: a survivable story ages off the file
      if (p.scandal && p.scandalFading && state.week > p.scandalFading && p.scandal.sev < 3) {
        delete p.scandal;
        delete p.scandalFading;
      }
      // the forced break ends on its clock
      if (p.flags.scandalBreakUntil && state.week >= p.flags.scandalBreakUntil) {
        delete p.flags.scandalBreakUntil;
        if (p.flags.personalHiatus) KP.endMemberBreak(state, p.id);
        if (p.scandal && p.scandal.sev < 4) delete p.scandal;
      }
    });
    // a new story breaks — rare, personality-priced, exposure-scaled
    if (!(state.scenes || []).some(sc => sc.kind === 'theStory' || sc.kind === 'theChoice')) {
      const candidates = roster.filter(p =>
        (p.status === 'idol' || p.status === 'trainee') && !p.scandal &&
        !p.flags.military);
      for (const p of candidates) {
        if (rng.chance(personRisk(state, p))) { breakStory(state, rng, inbox, p); break; }
      }
    }
    // the world draws from the same deck
    if (rng.chance(S.rivalChance)) {
      const rivals = (state.rivals || []).filter(r => (r.acts || []).some(a => !a.retired));
      if (rivals.length) {
        const r = rivals[Math.floor(rng.next() * rivals.length)];
        const act = r.acts.filter(a => !a.retired)[0];
        if (act) {
          led.rivalStories++;
          const shape = S.SHAPES[Math.floor(rng.next() * S.SHAPES.length)];
          inbox.push({ kind: 'industry', ind: 'rivalScandal', priority: 'flavor',
            text: 'The industry’s week: a story about a ' + act.name + ' member is moving — ' + shape +
              '. ' + r.short + '’s response desk is doing what response desks do, and every other label is quietly re-reading its own files.' });
        }
      }
    }
  });

  // ---- the timeline, careful with it ------------------------------------
  KP.onFeedEvent('scandalBreak', (state, n, rng) => rng.pick([
    { persona: 'press', text: 'A story is moving tonight. The pattern is always the same: the first cycle belongs to whoever frames it, and companies keep discovering this one cycle late.' },
    { persona: 'casual', text: 'the story is everywhere and nobody knows anything, which has never once slowed a quote-post down. waiting for the statement like everyone else' },
    { persona: 'fan', text: 'not reposting anything until there is a statement. the timeline is a courtroom with no judge tonight and we are not participating. (refreshing constantly though)' },
  ]));
  KP.onFeedEvent('scandalRelease', (state, n, rng) => rng.pick([
    { persona: 'press', text: 'The departure statement runs four sentences. The story that forced it ran four weeks. The career it ended ran years. The arithmetic of this industry, in one press release.' },
    { persona: 'fan', text: 'the chair is empty and the fandom is two rooms now: the one that grieves and the one that understands. I am in the doorway between them and staying there' },
    { persona: 'casual', text: 'company cuts the member, fandom splits, story finally dies. everyone calls it closure. it is actually just quiet. those are different things' },
  ]));
  KP.onFeedEvent('scandalRebreak', (state, n, rng) => rng.pick([
    { persona: 'press', text: 'The re-break, with receipts: the denial aged exactly as denials age. The first story had a subject. The second story has an author — the label.' },
    { persona: 'casual', text: 'they DENIED it and it re-broke with screenshots. rule one of this industry remains undefeated: the cover-up outbills the crime' },
  ]));
  KP.onFeedEvent('scandalBreakForced', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'hiatus notice. one paragraph. we all knew it was coming and it still lands like a door closing. seat kept, candle lit, see you on the other side of this' },
    { persona: 'casual', text: 'the story got a hiatus nobody scheduled. the industry’s weather can bench a person mid-season and everyone just updates the calendar. brutal, ordinary' },
  ]));
  KP.onFeedEvent('rivalScandal', (state, n, rng) => rng.chance(0.4) ? rng.pick([
    { persona: 'casual', text: 'a story moving about another company’s act tonight. every label PR team just opened their own files and said "could be us." because it could' },
    { persona: 'press', text: 'Elsewhere in the industry, a response desk is having the night every response desk eventually has. Professional sympathy, from a safe distance.' },
  ]) : null);
})(typeof window !== 'undefined' ? window : globalThis);
