/* Festival season (v0.9.22, §55.4, map slot 7) — "annual festivals that
   actually reach out to you and you have to see if you can fit in the
   schedule, arrange the travel." The §46 circuit grows up: five NAMED
   annuals with weeks-of-year and prestige tiers; organizers INVITE — a
   scene, not a notification — and the answer means schedule surgery
   read out loud, travel with a bill, a fee, and a slot. Icons get
   headline calls. Pulling out of a booked slot costs the room. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.festivalLedger = state.festivalLedger ||
      { invites: 0, booked: 0, declined: 0, played: 0, headlines: 0, missed: 0, abroadPlayed: 0, tongueFlops: 0 };
    // the far markets (v0.10.43) — fields added post-ship, healed lazily
    if (state.festivalLedger.abroadPlayed == null) { state.festivalLedger.abroadPlayed = 0; state.festivalLedger.tongueFlops = 0; }
    return state.festivalLedger;
  }
  function festById(id) { return KP.C.FESTS.LIST.find(f => f.id === id) || null; }
  function weekOfYear(state) { return ((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1; }
  function yearOf(state) { return Math.floor((state.week - 1) / KP.C.WEEKS_PER_YEAR) + 1; }
  // the festival's absolute week for THIS year's edition
  function festWeek(state, f) {
    const start = (yearOf(state) - 1) * KP.C.WEEKS_PER_YEAR;
    return start + f.woy;
  }

  // the schedule surgery, read out loud — what saying yes collides with
  KP.festivalConflicts = function (state, g, week) {
    const out = [];
    if (g.tour) out.push('they are ON TOUR that window');
    if (g.prep && Math.abs(g.prep.scheduledWeek - week) <= 1) out.push('the release lands the same week');
    if (g.debuted && week <= (g.promoUntil || 0)) out.push('promotions are still running that week');
    if (g.hiatus) out.push('the group is on official hiatus');
    const away = g.members.map(id => state.people[id]).filter(Boolean)
      .filter(m => m.flags && m.flags.military).length;
    if (away) out.push(away + ' member' + (away === 1 ? ' is' : 's are') + ' in service — the stage plays short-handed');
    const worn = g.members.map(id => state.people[id]).filter(Boolean)
      .filter(m => m.fatigue >= 65).length;
    if (worn) out.push(worn + ' member' + (worn === 1 ? ' is' : 's are') + ' already running on fumes');
    return out;
  };

  KP.registerWeekly('festivals', 745, function (state, rng, inbox, roster, groups) {
    const F = KP.C.FESTS;
    const led = ledger(state);
    const woy = weekOfYear(state);
    const year = yearOf(state);

    // ---- the invitations: the organizer calls, weeks out --------------
    F.LIST.forEach(f => {
      if (woy !== f.woy - F.inviteLead) return;
      groups.forEach(g => {
        if (!g.debuted || g.retiredWeek || !g.members.length || g.hiatus || g.tour) return;   // bookers skip acts mid-road
        if ((g.popularity || 0) < f.popMin) return;
        // the far markets (v0.10.43, §89 D9): the region has to have heard of them
        if (f.region && (KP.regionsOf(g)[f.region] || 0) < f.warmthMin) return;
        g.festBook = g.festBook || {};
        if (g.festBook[f.id] === year) return;   // this year's edition, once
        const abroadOf = id => !!(F.LIST.find(x => x.id === id) || {}).region;
        const playedThisYear = Object.keys(g.festBook).filter(id => g.festBook[id] === year && abroadOf(id) === !!f.region).length;
        if (playedThisYear >= (f.region ? F.maxAbroadPerYear : F.maxPerYear)) return;
        // one open invitation per group — an invitation that expires this
        // week does not count (the expiry pass runs later in the tick)
        if ((state.scenes || []).some(sc => sc.kind === 'festivalInvite' && sc.groupId === g.id &&
            !(sc.expiresWeek != null && state.week > sc.expiresWeek))) return;
        const icon = !f.region && !!KP.getNarrative(state, 'festivalIcons', 'group', g.id);
        // icons always get the call — and so does a room that carried
        // last year's set (the stage, v0.10.37); everyone else most years
        if (!KP.festivalCertain(state, g, year) && !rng.chance(0.75)) return;
        led.invites++;
        KP.openScene(state, { kind: 'festivalInvite', groupId: g.id,
          festivalId: f.id, headline: icon && f.tier >= 2, expiresWeek: state.week + 2 });
        // the scene on the Desk is the truth; this line competes (v0.10.29)
        inbox.push({ kind: 'company', ind: 'festivalInvite', groupId: g.id,
          text: f.region
            ? 'An invite from ' + f.name + ': a ' + KP.regionLabel(f.region) + ' convention slot for ' + g.name + ', ' +
              KP.weekLabel(festWeek(state, f)).text + '. The far markets open one weekend at a time, and the weekends have dates on them. The table is on the Desk.'
            : 'The ' + f.name + ' organizers reached out about ' + g.name +
              (icon && f.tier >= 2 ? ' — a HEADLINE slot, by name. The icons get the first call.' : ' — a confirmed slot on this year’s bill.') +
              ' The date is ' + KP.weekLabel(festWeek(state, f)).text + ', the answer is due in two weeks, and the invitation is on the Desk with the schedule laid beside it.' });
      });
    });

    // ---- the stage: booked slots play on their week -------------------
    groups.forEach(g => {
      const bookings = g.festivalBookings || [];
      const due = bookings.find(b => b.week === state.week);
      if (!due) return;
      g.festivalBookings = bookings.filter(b => b !== due);
      const f = festById(due.festivalId);
      if (!f) return;
      // the schedule moved after the ink dried: a booked slot missed
      if (g.tour || g.hiatus || g.retiredWeek || !g.members.length ||
          g.members.every(id => { const m = state.people[id]; return !m || (m.flags && m.flags.military); })) {
        led.missed++;
        if (g.fandom) KP.fandomGain(g, -F.missFandom);
        inbox.push({ kind: 'public', priority: 'high', groupId: g.id,
          text: g.name + ' pulled out of ' + f.name + ' — the calendar ate the booking. The organizers reprinted the lineup poster politely. The fans who bought train tickets were less polite, and they are right to be.' });
        return;
      }
      const pay = Math.round(f.pay * (due.headline ? F.headlineMult : 1));
      state.budget += pay;
      if (KP.ledgerFlow) KP.ledgerFlow(state, 'appearances', pay);   // a stage fee, on the stage-fee line (§89 D10)
      g.festBook = g.festBook || {};
      g.festBook[due.festivalId] = yearOf(state);
      if (f.region) {
        // the far market (v0.10.43, §89 D9): the convention stage is rated
        // light, the tongue prices the warmth, the interview clip is the story
        led.abroadPlayed++;
        const voice = KP.voiceAbroad ? KP.voiceAbroad(state, g, f.region) : null;
        const read = KP.stageRead(state, g, { kind: 'circuit', id: f.id });
        KP.settleStage(state, null, g, read, { light: true });
        const regions = KP.regionsOf(g);
        const gain = Math.round(f.warmth * KP.tongueFactor(state, g, f.region, 'circuit') * (read.band === 'fumbled' ? 0.7 : 1));
        regions[f.region] = KP.clamp((regions[f.region] || 0) + gain, 0, 100);
        g.members.map(id => state.people[id]).filter(Boolean).forEach(m => {
          if (!KP.onBreak(m) && !(m.flags && m.flags.military)) m.fatigue = KP.clamp(m.fatigue + f.fatigue, 0, 100);
        });
        if (!voice) led.tongueFlops++;
        inbox.push({ kind: 'public', ind: 'festival', priority: 'high', groupId: g.id, band: read.band, abroad: f.region, voice: !!voice,
          text: (voice
            ? g.name + ' played ' + f.name + ' — ' + KP.displayName(voice) + ' ran the talk segments in the room’s own language and the convention hall sang the fanchant back on the first try. ' + KP.regionLabel(f.region) + ' is a little less far away this week. Fee +' + pay + '; the next tour’s routing meeting just got a new pin.'
            : g.name + ' played ' + f.name + ' — the interview did not land: every answer through an interpreter, the pauses long enough to clip, and the clip is circulating with subtitles nobody at the company approved. ' + KP.regionLabel(f.region) + ' warmed anyway. Half as much as it should have. Fee +' + pay + '.') +
            ' ' + KP.stageLine(state, g, read, 'the ' + f.name + ' stage') });
        return;
      }
      led.played++;
      if (due.headline) led.headlines++;
      g.festivalsPlayed = (g.festivalsPlayed || 0) + 1;   // the icons arc counts (v0.9.18)
      // the stage, judged (v0.10.37): the set is rated, and a carried
      // set books next year's call
      const read = KP.stageRead(state, g, { kind: 'festival', id: f.id });
      KP.settleStage(state, rng, g, read, { where: f.name }).forEach(n => inbox.push(n));
      if (read.band === 'carried') { KP.stageLedger(state).festCarried++; g.festCarried = yearOf(state); }
      const setMorale = KP.C.STAGE.festMorale[read.band] != null ? KP.C.STAGE.festMorale[read.band] : 1;
      const members = g.members.map(id => state.people[id]).filter(Boolean)
        .filter(m => !(m.flags && m.flags.military));   // he is not on this stage (v0.9.23)
      members.forEach(m => {
        m.liveExp += KP.C.SEASON.festLiveExp;
        m.fatigue = KP.clamp(m.fatigue + f.fatigue, 0, 100);
        m.morale = KP.clamp(m.morale + setMorale, 0, 100);
      });
      inbox.push({ kind: 'company', ind: 'festival', priority: 'high', groupId: g.id, band: read.band,
        text: (due.headline
          ? g.name + ' HEADLINED ' + f.name + ' — top of the poster, last light of the night, ' + f.blurb + '. Fee +' + pay + ', and a closing-set clip the archive will keep forever.'
          : g.name + ' played ' + f.name + ' — ' + f.blurb + '. Fee +' + pay + ', and the kind of live reps no practice room sells.') +
          ' ' + KP.stageLine(state, g, read, 'the ' + f.name + ' set') });
    });
  });

  KP.registerScene('festivalInvite', {
    title: (state, sc) => {
      const f = festById(sc.festivalId);
      return (f ? f.name : 'A festival') + ' · the invitation';
    },
    body: (state, sc) => {
      const f = festById(sc.festivalId);
      const g = KP.groupById(state, sc.groupId);
      if (!f || !g) return '';
      const week = festWeek(state, f);
      const conflicts = KP.festivalConflicts(state, g, week);
      // the far market (v0.10.43): the tongue is read out loud with the schedule
      const voice = f.region && KP.voiceAbroad ? KP.voiceAbroad(state, g, f.region) : null;
      return (f.region ? f.name + ' wants ' + g.name + ' on the ' + KP.regionLabel(f.region) + ' stage — a convention slot, a weekend of flights, ' + f.blurb
          : 'The ' + f.name + ' bill wants ' + g.name + (sc.headline ? ' at the TOP of the poster' : '') + ' — ' + f.blurb) +
        '. The slot is ' + KP.weekLabel(week).text + '; the fee runs ' +
        Math.round(f.pay * (sc.headline ? KP.C.FESTS.headlineMult : 1)) +
        ' and travel bills ' + f.travel + '.' +
        (f.region ? (voice ? ' ' + KP.displayName(voice) + ' can run the interviews in the room’s own language.' : ' Nobody on the lineup speaks the room’s language — the interviews will limp, and the warmth with them.') : '') +
        (conflicts.length
          ? ' The schedule, read out loud: ' + conflicts.join('; ') + '. Saying yes means carrying that.'
          : ' The calendar is, for once, actually clear.');
    },
    options: (state, sc) => [
      { id: 'accept', label: sc.headline ? 'Take the headline' : 'Take the slot' },
      { id: 'decline', label: 'Send regrets' },
    ],
    resolve: (state, sc, optionId) => {
      const F = KP.C.FESTS;
      const f = festById(sc.festivalId);
      const g = KP.groupById(state, sc.groupId);
      if (!f || !g) return {};
      const led = ledger(state);
      if (optionId === 'accept') {
        if (state.budget < f.travel) return { ok: false, toast: 'Travel bills ' + f.travel + ' up front. The budget says regrets.' };
        state.budget -= f.travel;
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'appearances', -f.travel);   // the bill against the fee (§89 D10)
        led.booked++;
        g.festivalBookings = g.festivalBookings || [];
        g.festivalBookings.push({ festivalId: f.id, week: festWeek(state, f), headline: !!sc.headline });
        return { toast: 'Booked: ' + g.name + ' at ' + f.name + ', ' + KP.weekLabel(festWeek(state, f)).text +
          '. Travel −' + f.travel + '. The vans are arranged, the set list argument begins tonight.' };
      }
      led.declined++;
      return { toast: 'Regrets, sent with a fruit basket. The organizers filled the slot within the hour — festival season waits for nobody, which is exactly why the invitations matter.' };
    },
    // an unanswered invitation answers itself — the slot goes elsewhere
    expire: (state, sc) => {
      const f = festById(sc.festivalId);
      const g = KP.groupById(state, sc.groupId);
      ledger(state).declined++;
      if (!f || !g) return null;
      return { kind: 'company', groupId: g.id,
        text: 'The ' + f.name + ' deadline passed with the invitation still on the Desk. The slot went to someone who answered. The organizers keep notes about who answers.' };
    },
  });

})(typeof window !== 'undefined' ? window : globalThis);
