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
      { invites: 0, booked: 0, declined: 0, played: 0, headlines: 0, missed: 0 };
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
        g.festBook = g.festBook || {};
        if (g.festBook[f.id] === year) return;   // this year's edition, once
        const playedThisYear = Object.values(g.festBook).filter(y => y === year).length;
        if (playedThisYear >= F.maxPerYear) return;
        if ((state.scenes || []).some(sc => sc.kind === 'festivalInvite' && sc.groupId === g.id)) return;
        const icon = !!KP.getNarrative(state, 'festivalIcons', 'group', g.id);
        // icons always get the call; everyone else gets it most years
        if (!icon && !rng.chance(0.75)) return;
        led.invites++;
        KP.openScene(state, { kind: 'festivalInvite', groupId: g.id,
          festivalId: f.id, headline: icon && f.tier >= 2, expiresWeek: state.week + 2 });
        inbox.push({ kind: 'company', urgent: true, groupId: g.id,
          text: 'The ' + f.name + ' organizers reached out about ' + g.name +
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
      led.played++;
      if (due.headline) led.headlines++;
      g.festBook = g.festBook || {};
      g.festBook[due.festivalId] = yearOf(state);
      g.festivalsPlayed = (g.festivalsPlayed || 0) + 1;   // the icons arc counts (v0.9.18)
      const pay = Math.round(f.pay * (due.headline ? F.headlineMult : 1));
      state.budget += pay;
      const members = g.members.map(id => state.people[id]).filter(Boolean)
        .filter(m => !(m.flags && m.flags.military));   // he is not on this stage (v0.9.23)
      members.forEach(m => {
        m.liveExp += KP.C.SEASON.festLiveExp;
        m.fatigue = KP.clamp(m.fatigue + f.fatigue, 0, 100);
        m.morale = KP.clamp(m.morale + 1, 0, 100);
      });
      inbox.push({ kind: 'company', ind: 'festival', priority: 'high', groupId: g.id,
        text: (due.headline
          ? g.name + ' HEADLINED ' + f.name + ' — top of the poster, last light of the night, ' + f.blurb + '. Fee +' + pay + ', and a closing-set clip the archive will keep forever.'
          : g.name + ' played ' + f.name + ' — ' + f.blurb + '. Fee +' + pay + ', and the kind of live reps no practice room sells.') });
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
      return 'The ' + f.name + ' bill wants ' + g.name +
        (sc.headline ? ' at the TOP of the poster' : '') + ' — ' + f.blurb +
        '. The slot is ' + KP.weekLabel(week).text + '; the fee runs ' +
        Math.round(f.pay * (sc.headline ? KP.C.FESTS.headlineMult : 1)) +
        ' and travel bills ' + f.travel + '.' +
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
