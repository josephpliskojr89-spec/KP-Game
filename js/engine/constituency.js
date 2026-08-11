/* The constituency (v0.9.6) — the organized fandom acts on YOUR
   decisions. §39 consult #5: protest trucks and joint statements,
   intensity-gated, over the calls the office made — a center changed,
   a record shipped with no member credits, somebody worked into the
   medical bench. Concede, hold, or half-measure — and the fandom
   remembers like the exec does (the grudge counter has teeth). The
   company gets a voice back: the official café notice, the fan
   meeting, and the lightstick launch as real events. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  const GRIEVANCES = {
    centerChange: {
      what: 'the center change',
      truck: 'WHO MOVED THE CENTER. A truck with a very specific LED message is parked outside the building: the fandom noticed the formation change nobody explained, and they have organized about it.',
    },
    creditsMissing: {
      what: 'the empty credit slots',
      truck: 'A truck outside the building is asking, in scrolling LED, why the new record shipped with zero member credits. The fandom counted the slots. The fandom always counts the slots.',
    },
    overwork: {
      what: 'the schedule that benched her',
      truck: 'The truck outside is not angry, which is worse: PLEASE LET THEM REST, with receipts — a timeline of every schedule since the medical bench. The fandom made a spreadsheet. It is correct.',
    },
  };

  // ---- the weekly watch ---------------------------------------------------
  KP.registerWeekly('constituency', 860, function (state, rng, inbox, roster, groups) {
    const C = KP.C.CONSTITUENCY;
    state.grievances = state.grievances || [];

    groups.forEach(g => {
      if (!g.debuted) return;
      // watch the decisions the fandom watches
      // 1) the center moved (post-debut, not via a departure — those are
      //    grieved differently and the fandom knows the difference)
      const center = g.roles && g.roles.center;
      if (g.constCenterSeen == null) g.constCenterSeen = center || null;
      else if (center && g.constCenterSeen !== center) {
        if (!(g.flags && g.flags.departedWeek === state.week) &&
            !Object.values(state.people).some(p => p.flags.departedWeek === state.week)) {
          state.grievances.push({ week: state.week, kind: 'centerChange', groupId: g.id });
        }
        g.constCenterSeen = center;
      }
      // 2) a record with open credit slots and no member on any of them
      if (g.lastReleaseWeek === state.week) {
        const rel = (g.releases || [])[g.releases.length - 1];
        const slots = rel && rel.tracklist && rel.tracklist.length >= 5;
        if (slots && !rel.tracklist.some(tk => tk.credit)) {
          state.grievances.push({ week: state.week, kind: 'creditsMissing', groupId: g.id });
        }
      }
      // 3) somebody worked onto the medical bench
      g.members.forEach(id => {
        const p = state.people[id];
        if (p && p.flags.burnout > 0 && !p.flags.constBenchNoted) {
          p.flags.constBenchNoted = 1;
          state.grievances.push({ week: state.week, kind: 'overwork', groupId: g.id, personId: p.id });
        }
        if (p && !p.flags.burnout) delete p.flags.constBenchNoted;
      });

      // the truck: organized enough, aggrieved enough, and the spacing
      // respected — outrage has logistics
      if (KP.fandomIntensity(g) < C.intensityAt) return;
      if (state.week < (state.truckQuietUntil || 0)) return;
      if ((state.scenes || []).some(sc => sc.kind === 'fanTruck')) return;
      const grudge = (g.fandomGrudge || 0);
      const fresh = state.grievances.find(gr => gr.groupId === g.id &&
        state.week - gr.week <= C.grievanceWindow && !gr.trucked);
      if (fresh && rng.chance(Math.min(0.95, C.truckChance + grudge * 0.15))) {
        fresh.trucked = true;
        state.truckQuietUntil = state.week + C.quietWeeks;
        KP.openScene(state, { kind: 'fanTruck', groupId: g.id,
          grievance: fresh.kind, expiresWeek: state.week + 2 });
        inbox.push({ kind: 'public', ind: 'fanTruck', priority: 'high', groupId: g.id,
          text: GRIEVANCES[fresh.kind].truck + ' The statement window is open, and silence is also a statement. The table is on the Desk.' });
      }
    });
    // grievances age out — the internet moves on, mostly
    state.grievances = state.grievances.filter(gr => state.week - gr.week <= C.grievanceWindow + 2);
  });

  // ---- the truck scene: concede, hold, or half-measure -------------------
  KP.registerScene('fanTruck', {
    title: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      return (g ? g.name : 'The') + ' · the truck outside';
    },
    body: (state, sc) => {
      const G = GRIEVANCES[sc.grievance] || GRIEVANCES.centerChange;
      const g = KP.groupById(state, sc.groupId);
      const grudge = g && (g.fandomGrudge || 0) >= 1;   // one shrug is remembered — that is the doctrine
      return 'The organized fandom has a position on ' + G.what +
        ', and the position is parked outside with an LED screen. They are not wrong about the facts — they never are; that is what makes them the constituency. ' +
        (grudge ? 'And they remember the last time this office answered them with a shrug. The truck company offered them a loyalty discount.' : 'This is the first truck in a while. How this table goes decides how the next one reads.');
    },
    options: (state, sc) => {
      const C = KP.C.CONSTITUENCY;
      return [
        { id: 'concede', label: 'Concede — publicly, with the fix · ' + C.concedeCost },
        { id: 'half', label: 'A careful statement (change nothing)' },
        { id: 'hold', label: 'Hold — the office does not answer trucks' },
      ];
    },
    resolve: (state, sc, optionId, rng) => {
      const C = KP.C.CONSTITUENCY;
      const g = KP.groupById(state, sc.groupId);
      if (!g) return {};
      if (optionId === 'concede') {
        state.budget -= C.concedeCost;
        g.fandomGrudge = Math.max(0, (g.fandomGrudge || 0) - 1);
        KP.fandomGain(g, 4);
        state.trust = KP.clamp(state.trust - 1, 0, 100);
        return { toast: 'The company statement named the thing, fixed the thing, and thanked the truck by implication. The fandom declared victory graciously. The exec asked, mildly, who is running this company — but the barricade holds, and barricades sell albums.',
          note: { kind: 'public', ind: 'truckResolved', outcome: 'concede', priority: 'high', groupId: g.id,
            text: 'Official notice, four sentences, one real concession — and the truck drove home to a hero’s welcome online. The fandom framed the LED message. Trust between barricade and building: restored, this time.' } };
      }
      if (optionId === 'half') {
        g.fandomGrudge = (g.fandomGrudge || 0) + 0.5;
        KP.fandomGain(g, 1);
        return { toast: 'A statement was issued that acknowledged feelings, committed to nothing, and used the word “communication” twice. The fandom read it in four seconds and rated it accordingly. The truck left; the receipts stayed.',
          note: { kind: 'public', ind: 'truckResolved', outcome: 'half', groupId: g.id,
            text: 'The official response to the truck was a masterpiece of saying nothing beautifully. The fandom archived it next to the last one. The folder is getting thick.' } };
      }
      // hold
      g.fandomGrudge = (g.fandomGrudge || 0) + 1;
      KP.fandomGain(g, -2);
      return { toast: 'The office did not answer the truck. The truck answered the office — with a second day of parking. The fandom keeps receipts, and this one is going in the permanent file. Some lines you hold; make sure this one was worth it.',
        note: { kind: 'public', ind: 'truckResolved', outcome: 'hold', groupId: g.id,
          text: 'No statement came. The fandom noticed the silence with the precision of people who notice everything, and the intensity cooled by exactly the amount trust costs. The next truck is already funded.' } };
    },
    expire: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      if (!g) return null;
      g.fandomGrudge = (g.fandomGrudge || 0) + 1;
      KP.fandomGain(g, -2);
      return { kind: 'public', priority: 'high', groupId: g.id,
        text: 'The statement window on the truck closed with no statement in it. To the fandom that reads as an answer — the worst available one. The grudge fund gained interest.' };
    },
  });

  // ---- the company's voice: café notice, fan meeting, lightstick ---------
  KP.cafeNotice = function (state, groupId) {
    const C = KP.C.CONSTITUENCY;
    const g = KP.groupById(state, groupId);
    if (!g || !g.debuted) return { ok: false, reason: 'A café notice needs a debuted group and something to say.' };
    if (state.week < (g.cafeNoticeQuiet || 0)) {
      return { ok: false, reason: 'One notice at a time. The last one is still pinned.' };
    }
    g.cafeNoticeQuiet = state.week + 6;
    // a notice cools the freshest grievance — named, it loses its heat
    const fresh = (state.grievances || []).find(gr => gr.groupId === g.id && !gr.trucked);
    if (fresh) fresh.trucked = true;
    state.inbox.push({ kind: 'public', week: state.week, read: false, id: 'm' + (state.nextMsgId++),
      ind: 'cafeNotice', groupId: g.id,
      text: 'An official notice went up on ' + g.name + '’s fan café — plain language, actual information, posted before the rumor cycle instead of after. The fandom’s translation accounts had it in nine languages within the hour. Talking first is a strategy; it even works.' });
    return { ok: true };
  };

  KP.fanMeeting = function (state, groupId) {
    const C = KP.C.CONSTITUENCY;
    const g = KP.groupById(state, groupId);
    if (!g || !g.debuted) return { ok: false, reason: 'Fan meetings are for debuted groups.' };
    if (state.budget < C.fanMeetingCost) return { ok: false, reason: 'The venue, the security, the printed slogans — it costs ' + C.fanMeetingCost + '.' };
    if (state.week < (g.fanMeetingQuiet || 0)) return { ok: false, reason: 'The last fan meeting is still being posted about. Let it breathe.' };
    if (g.tour || g.prep) return { ok: false, reason: 'The calendar is full. A fan meeting deserves a clear week.' };
    state.budget -= C.fanMeetingCost;
    g.fanMeetingQuiet = state.week + 16;
    KP.fandomGain(g, C.fanMeetingFandomGain);
    g.fandomGrudge = Math.max(0, (g.fandomGrudge || 0) - 0.5);
    g.members.forEach(id => {
      const p = state.people[id];
      if (p) p.morale = KP.clamp(p.morale + C.fanMeetingMorale, 0, 100);
    });
    state.inbox.push({ kind: 'public', week: state.week, read: false, id: 'm' + (state.nextMsgId++),
      ind: 'fanMeeting', priority: 'high', groupId: g.id,
      text: g.name + ' held a fan meeting — games, letters, one member crying at a fan’s handmade gift, security gently confiscating a cake shaped like the road manager. Three hours where the parasocial contract was just social. The fandom will run on this for months.' });
    return { ok: true, cost: C.fanMeetingCost };
  };

  KP.launchLightstick = function (state, groupId) {
    const C = KP.C.CONSTITUENCY;
    const g = KP.groupById(state, groupId);
    if (!g || !g.debuted) return { ok: false, reason: 'A lightstick needs a debuted group.' };
    if (!g.fandom || !g.fandom.name) return { ok: false, reason: 'Name the fandom first — a lightstick without a fandom is a lamp.' };
    if (g.lightstickWeek) return { ok: false, reason: 'The lightstick exists. Version 2 is a conversation for another era.' };
    if ((g.popularity || 0) < C.lightstickPopAt) return { ok: false, reason: 'The market team says the fanbase is not there yet. Lightsticks sell to devotion, not curiosity.' };
    if (state.budget < C.lightstickCost) return { ok: false, reason: 'Design, molds, LEDs, an app pairing nobody asked for — ' + C.lightstickCost + '.' };
    state.budget -= C.lightstickCost;
    state.budget += C.lightstickRevenue;
    g.lightstickWeek = state.week;
    KP.fandomGain(g, C.lightstickFandomGain);
    state.inbox.push({ kind: 'public', week: state.week, read: false, id: 'm' + (state.nextMsgId++),
      ind: 'lightstick', priority: 'high', groupId: g.id,
      text: 'The official ' + g.name + ' lightstick launched — and sold out, because that is what lightsticks do. The design survived the fandom’s 48-hour critique gauntlet with honors. Concert crowds will be a single organism now: one color, one name (' + (g.fandom.name) + '), several thousand batteries. Net +' + (C.lightstickRevenue - C.lightstickCost) + '.' });
    return { ok: true };
  };

  // ---- the timeline answers ---------------------------------------------
  KP.onFeedEvent('fanTruck', (state, n, rng) => {
    return rng.pick([
      { persona: 'stan', text: 'the truck is PARKED. we fundraised it in six hours. this is what organization looks like. the company WILL read the LED' },
      { persona: 'casual', text: 'k-pop fandoms renting protest trucks with scrolling demands remains the most functional democracy I have ever observed' },
    ]);
  });
  KP.onFeedEvent('truckResolved', (state, n, rng) => {
    if (n.outcome === 'concede') return rng.pick([
      { persona: 'stan', text: 'THEY CONCEDED. the truck worked. framing the official notice. accountability is real when you rent it by the day' },
      { persona: 'fan', text: 'company statement actually fixed the thing?? growth. the truck drives home a hero' },
    ]);
    if (n.outcome === 'hold') return rng.pick([
      { persona: 'stan', text: 'no statement. noted. NOTED. the spreadsheet gains a tab. we do not forget, we compound' },
      { persona: 'fan', text: 'the silence was a choice and we heard it perfectly clearly. see you at the next truck' },
    ]);
    return rng.pick([
      { persona: 'stan', text: 'a statement that says nothing is a genre and this one was a masterwork of it. archived with the others. the folder grows' },
      { persona: 'casual', text: 'corporate k-pop statements should be studied in diplomacy programs. four sentences, zero commitments, immaculate vibes' },
    ]);
  });
  KP.onFeedEvent('cafeNotice', (state, n, rng) => {
    return rng.pick([
      { persona: 'fan', text: 'an official notice with ACTUAL INFORMATION posted BEFORE the rumors?? who taught this company communication. keep them' },
      { persona: 'casual', text: 'the rare corporate notice that just says the thing. fandom stunned into brief, suspicious gratitude' },
    ]);
  });
  KP.onFeedEvent('fanMeeting', (state, n, rng) => {
    return rng.pick([
      { persona: 'stan', text: 'FAN MEETING RECAP: crying (them), crying (us), the cake incident, a high five I will describe to my grandchildren. best day of the era' },
      { persona: 'fan', text: 'three hours of games and letters and zero performances and it did more for this fandom than any stage this year. more of this' },
    ]);
  });
  KP.onFeedEvent('lightstick', (state, n, rng) => {
    return rng.pick([
      { persona: 'stan', text: 'LIGHTSTICK ACQUIRED. it is beautiful. it pairs with an app for no reason. I would defend it in court' },
      { persona: 'fan', text: 'the ocean at the next concert is going to be ONE COLOR and I will cry about it. lightstick day is a holiday now' },
    ]);
  });
  KP.onFeedEvent('fusionVerdict', (state, n, rng) => {
    if (n.outcome === 'shift') return rng.pick([
      { persona: 'casual', text: 'so apparently ' + (n.mashLabel || 'the mash') + ' is a genre now and everyone is acting like it always existed. I watched it be invented on a tuesday' },
      { persona: 'stan', text: 'THEY CHANGED THE INDUSTRY. the trades said PIONEERING. remember this week. we were here when the sound got a name' },
    ]);
    if (n.outcome === 'acclaim') return rng.pick([
      { persona: 'fan', text: 'critics: masterpiece. charts: polite silence. me: streaming it on loop out of spite and genuine love, which is the fandom condition' },
      { persona: 'casual', text: 'the best-reviewed record of the season is the one nobody bought. this industry is a riddle and I respect it' },
    ]);
    if (n.outcome === 'flop') return rng.pick([
      { persona: 'casual', text: 'points for bravery on the genre mash but two sounds entered and neither survived. the remix community is already performing surgery' },
      { persona: 'stan', text: 'okay the experiment did not land BUT the ambition was real and I will hear no slander of the attempt. next era will eat' },
    ]);
    return rng.pick([
      { persona: 'fan', text: 'the genre mash just… works? no notes. weird engine, good car. the producers are officially dangerous now' },
      { persona: 'casual', text: 'heard the mash expecting chaos and got an actual song. mild disappointment, great record' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
