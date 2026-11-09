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
    // the stages, lived (v0.11.7, §98) — healed lazily the same way
    if (state.festivalLedger.billsPosted == null) {
      state.festivalLedger.billsPosted = 0; state.festivalLedger.deepSets = 0; state.festivalLedger.collabs = 0;
      state.festivalLedger.ceremonies = 0; state.festivalLedger.moments = 0;
    }
    return state.festivalLedger;
  }
  // the bills (v0.11.7, §98): one per edition, keyed festivalId:year —
  // created lazily here; ensureLedgers creates it at newGame so a viewed
  // save never differs from its unviewed twin
  function bills(state) { return state.festBills = state.festBills || {}; }
  KP.festBills = bills;
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
    if (g.jpAway) out.push('they are in Japan that window');
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
  // the hard clashes (v0.11.8): a yes the act cannot land is not a booking.
  // The soak read twenty of forty orgs "pulling out" of slots they had said
  // yes to from Japan — an open invitation is not yet a booking, so the
  // lane's guard (v0.11.3) could not see it. The signing reads the calendar
  // the way the lane and the road do.
  KP.festivalHardClash = function (state, g, week) {
    if (g.jpAway && week <= g.jpAway.until) return 'they are in Japan that week';
    if (g.tour && KP.tourWeeksLeft && week <= state.week + KP.tourWeeksLeft(g)) return 'the road has that week';
    if (g.hiatus && (g.hiatus.until == null || week <= g.hiatus.until)) return 'the group is on official hiatus';
    return null;
  };
  KP.festivalSlotWeek = function (state, festivalId) {
    const f = festById(festivalId);
    return f ? festWeek(state, f) : null;
  };

  // ---- the bill (v0.11.7, §98) -------------------------------------------
  // posted ONCE per edition when the organizers call: the rival acts live
  // that week (not retired, not paused for the service), by popularity with
  // a hash for the ties — never a draw — the top name the headliner. A home
  // bill books at the festival's popMin; the far markets book who they can.
  // `pop` is placement only and is never rendered (the reveal law).
  function composeBill(state, f, year) {
    const F = KP.C.FESTS;
    const pool = [];
    (state.rivals || []).forEach(r => (r.acts || []).forEach(a => {
      if (a.retired || a.servicePause || a.debuted === false) return;
      if (!f.region && (a.popularity || 0) < f.popMin) return;
      const id = a.id || a.name;
      pool.push({ id, name: a.name, company: r.short, pop: a.popularity || 0,
        h: KP.hash01(KP.hashStr([state.seed, 'festBill', f.id, year, id].join('|'))) });   // pre-hashed: FNV-1a is weak in its last characters
    }));
    pool.sort((a, b) => b.pop - a.pop || a.h - b.h);
    const acts = pool.slice(0, F.billSize).map(a => ({ id: a.id, name: a.name, company: a.company, pop: a.pop }));
    return { acts, headliner: acts.length ? acts[0].name : null, week: festWeek(state, f) };
  }
  KP.festivalBillRead = function (state, f, year) {
    if (!f) return null;
    return (state.festBills || {})[f.id + ':' + year] || null;
  };
  // the poster: the stored bill in poster order (the headliner first) with
  // our act placed by popularity — or at the top when headlining — at read
  // time, never stored. ours = { name, company, pop, headline } or null.
  KP.festivalPoster = function (bill, ours) {
    const stored = (bill && bill.acts) || [];
    const acts = stored.map(a => ({ name: a.name, company: a.company, ours: false }));
    if (!ours) return acts;
    const at = ours.headline ? 0 : stored.filter(a => (a.pop || 0) >= (ours.pop || 0)).length;
    acts.splice(at, 0, { name: ours.name, company: ours.company, ours: true });
    return acts;
  };
  function oursOn(state, g, booking) {
    return { name: g.name, company: state.company.short, pop: g.popularity || 0, headline: !!(booking && booking.headline) };
  }
  // the season ahead, for the Industry card: the next editions by week, each
  // with its bill (null before the organizers call) and our standing in a
  // word — booked, invited (the scene is open), regrets (this edition), or null
  KP.festivalSeasonRead = function (state) {
    const F = KP.C.FESTS, W = KP.C.WEEKS_PER_YEAR;
    const groups = KP.groups(state);
    const open = (state.scenes || []).filter(sc => sc.kind === 'festivalInvite' && !(sc.expiresWeek != null && state.week > sc.expiresWeek));
    return F.LIST.map(f => {
      let week = festWeek(state, f);
      if (week < state.week) week += W;
      const year = Math.floor((week - 1) / W) + 1;
      const bill = (state.festBills || {})[f.id + ':' + year] || null;
      let ours = null, group = null, booking = null;
      groups.forEach(g => {
        const b = (g.festivalBookings || []).find(x => x.festivalId === f.id && x.week === week);
        if (b && !booking) { ours = 'booked'; group = g; booking = b; }
      });
      let headline = !!(booking && booking.headline);
      if (!ours) {
        const sc = open.find(x => x.festivalId === f.id);
        const g = sc ? KP.groupById(state, sc.groupId) : null;
        if (g) { ours = 'invited'; group = g; headline = !!sc.headline; }
      }
      if (!ours) {
        const g = groups.find(x => (x.festRegrets || {})[f.id] === year);
        if (g) { ours = 'regrets'; group = g; }
      }
      return { fest: f, week, year, bill, ours, group, headline, booking };
    }).sort((a, b) => a.week - b.week).slice(0, F.seasonCardCount);
  };
  // the invite body reads the bill
  function billLine(state, f, sc) {
    const bill = KP.festivalBillRead(state, f, yearOf(state));
    if (!bill || !bill.acts.length) return '';
    const names = bill.acts.map(a => a.name + ' (' + a.company + ')').join(' · ');
    return sc.headline ? ' On the bill beneath you: ' + names + '.' : ' On the bill: ' + names + ' — headliner ' + bill.headliner + '.';
  }

  // ---- the set as a door (v0.11.7, §98) ----------------------------------
  // the deep cut: the latest record's fan pick, hot enough that the fandom
  // asked for it — the same public b-side heat §92 charts by
  KP.festivalDeepPick = function (state, g) {
    const rel = (g.releases || [])[(g.releases || []).length - 1];
    if (!rel || !rel.bsides || !rel.bsides.length) return null;
    const pick = rel.bsides.slice().sort((a, b) => b.heat - a.heat)[0];
    return pick && pick.heat >= KP.C.FESTS.deepPickHeat ? pick : null;
  };
  // the collab: a society friend of one of ours whose act is on this
  // edition's posted bill — the first such friendship on the list
  KP.festivalCollabRead = function (state, g, f, year) {
    const bill = KP.festivalBillRead(state, f, year);
    if (!bill || !bill.acts.length) return null;
    for (const fr of (state.industryFriends || [])) {
      const ourId = g.members.includes(fr.a) ? fr.a : g.members.includes(fr.b) ? fr.b : null;
      if (!ourId || !fr.actId) continue;
      const act = bill.acts.find(a => a.id === fr.actId);
      if (act) return { name: act.name, company: act.company, actId: fr.actId, ourId, theirId: fr.a === ourId ? fr.b : fr.a };
    }
    return null;
  };

  // ---- the night as a moment (v0.11.7, §98) --------------------------------
  // one sentence the play letter keeps, hash-picked among what the night
  // offers (the golden hour, the rain, the b-side singalong, the ment, the
  // banner, the lightstick ocean, the collab), never the same kind two
  // editions running — the televised season's momentOf, on a field
  function festMoment(state, g, f, due, read) {
    const F = KP.C.FESTS;
    const year = yearOf(state);
    const members = g.members.map(id => state.people[id]).filter(Boolean).filter(m => !(m.flags && m.flags.military));
    if (!members.length) return null;
    // the key is pre-hashed (KP.hashStr) before hash01: FNV-1a barely moves
    // its top bits for a change in the key's last characters, and the
    // edition is what changes; the line salt leads with the edition for the same reason
    const h = tag => KP.hash01(KP.hashStr([state.seed, tag, f.id, year, g.id].join('|')));
    const pickM = tag => members[Math.floor(h(tag) * members.length)];
    const line = (kind, lines) => KP.lineFor(state, year + ':' + f.id + ':festMoment:' + kind + ':' + g.id, lines, null);
    const N = m => KP.displayName(m);
    const leader = g.roles && g.roles.leader ? members.find(m => m.id === g.roles.leader) : null;
    const kinds = [];
    if (f.tier >= 2) {
      const m = (read.moments && read.moments.carried && members.find(x => x.id === read.moments.carried)) || pickM('festGolden');
      kinds.push({ kind: 'goldenHour', text: () => KP.fillPro(line('goldenHour', [
        'The golden-hour fancam belongs to ' + N(m) + ' — the light went orange on the second song and the camera never found anyone else.',
        N(m) + '’s golden-hour fancam was online before the set ended; the sky did half the work and nobody is complaining about the half.',
        'The sun went down during ' + N(m) + '’s verse, and the fancam of it is next year’s poster whether the organizers know it yet or not.',
      ]), m) });
    }
    if (h('festRain') < F.rainChance) kinds.push({ kind: 'rainSet', text: () => line('rainSet', [
      'It rained on the set. Nobody left: the choreography went half-speed on a wet stage and the field sang louder to make up the difference.',
      'The rain came in on the third song and stayed. The rain set is the one the fans will talk about — soaked, grinning, in time.',
      'A wet stage, a slowed set, umbrellas down on request — the rain set did what rain sets do, and the photos look like a film.',
    ]) });
    if (due.set === 'deep') {
      const title = due.pick ? '“' + due.pick + '”' : 'the b-side the fandom asked for';
      kinds.push({ kind: 'singalong', text: () => line('singalong', [
        'They played ' + title + ' — the fandom’s b-side, by request — and the field sang it back louder than the single. The truthers were right and they know it.',
        'The deep cut landed: ' + title + ' on a festival stage, and ten thousand people who were not supposed to know the words knew the words.',
        title + ' in the set because the fandom asked; the singalong on the second chorus is already a clip with its own hashtag.',
      ]) });
    }
    if (leader) kinds.push({ kind: 'mentLong', text: () => KP.fillPro(line('mentLong', [
      N(leader) + '’s ment went long — a thank-you that became a speech that became a story about the van — and the stage manager let it, because the crowd would not have let {her} stop.',
      N(leader) + ' took the ment and kept it: three minutes over, every one of them earned, and the staffer with the schedule board waved and gave up.',
      'The ment ran long. ' + N(leader) + ' had something to say to the field and said all of it; the set lost a song and nobody who was there wants it back.',
    ]), leader) });
    if (h('festBanner') < F.wrongBannerChance) {
      const a = pickM('festBannerWho');
      kinds.push({ kind: 'wrongBanner', text: () => KP.fillPro(line('wrongBanner', [
        'A banner in the front rows had ' + N(a) + '’s face with the wrong name under it. {She} signed it anyway, next to the correction.',
        'The banner the cameras found had another member’s name printed under ' + N(a) + '. The group laughed on stage; the fan had a new one by the encore.',
        'Somebody’s banner put the wrong name under ' + N(a) + '’s face, and the clip of {her} pointing at it, delighted, outran the set.',
      ]), a) });
    }
    if (KP.fandomIntensity(g) >= F.oceanIntensity) {
      const color = g.fandom && g.fandom.color ? g.fandom.color : 'one color';
      kinds.push({ kind: 'lightstickOcean', text: () => line('lightstickOcean', [
        'The lightstick ocean: the whole field went ' + color + ' when the lights dropped, and the broadcast truck kept cutting back to the wide shot.',
        'From the stage the field turned ' + color + ' at the first chorus — the fandom brought its own weather, and the pull-back shot is the night’s best photo.',
        'The ocean. Every lightstick in the field at once, ' + color + ' to the fences, the wide shot held for ten full seconds, and the fansites gave up on close-ups.',
      ]) });
    }
    if (due.set === 'collab' && due.collabAct) kinds.push({ kind: 'collab', text: () => line('collab', [
      'The collab stage: ' + g.name + ' and ' + due.collabAct + ' on one stage for one song — two fandoms sharing a chant, and the backstage photo everyone had been waiting for.',
      g.name + ' brought ' + due.collabAct + ' out for the last song. The two fandoms learned each other’s fanchant in real time; the clip is already a thread.',
      'One stage, two acts: the ' + due.collabAct + ' collab closed the set, and the waiting-room friendship the fans have tracked for months finally had a stage to stand on.',
    ]) });
    const pool = kinds.filter(k => k.kind !== g.festLastMomentKind);
    const list = pool.length ? pool : kinds;
    if (!list.length) return null;
    const pick = list[Math.floor(h('festMoment') * list.length)];
    g.festLastMomentKind = pick.kind;
    return pick.text();
  }
  // the set's own effects: the deep cut feeds the fandom; the collab is
  // remembered on the friendship and may travel as a clip (hash-gated) —
  // the tour-stop clip's shape: a spike on the leader, the provenance stamped
  function settleSet(state, g, f, due, members, inbox) {
    const F = KP.C.FESTS;
    const led = ledger(state);
    if (due.set === 'deep') { led.deepSets++; KP.fandomGain(g, F.deepIntensity); }
    if (due.set !== 'collab') return;
    led.collabs++;
    const fr = (state.industryFriends || []).find(x => due.collabActId && x.actId === due.collabActId && (g.members.includes(x.a) || g.members.includes(x.b)));
    if (fr) fr.collabs = (fr.collabs || 0) + 1;
    if (KP.hash01(KP.hashStr([state.seed, 'festCollabClip', f.id, yearOf(state), g.id].join('|'))) >= F.collabViralChance) return;
    const leader = (g.roles && members.find(m => m.id === g.roles.leader)) || members[0];
    if (!leader) return;
    const act = due.collabAct || 'the friend’s act';
    KP.socialSpike(state, leader, KP.C.SOCIAL.viralSpike * F.collabClipSpike, 'festCollab');
    const nar = KP.recordViral ? KP.recordViral(state, leader, { kind: 'festival', label: 'the ' + f.name + ' collab clip with ' + act }) : null;
    if (nar) inbox.push(nar);
    inbox.push({ kind: 'public', ind: 'festCollabClip', priority: 'high', groupId: g.id, personId: leader.id, actName: due.collabAct || null,
      text: KP.fillPro('The ' + f.name + ' collab clip travelled: ' + KP.publicGiven(leader) + ' and ' + act + ' on one stage, the two fanchants colliding in the chorus, and {pos} face when the field got it right. Two fandoms are using one hashtag tonight; the timeline has never been this polite.', leader) });
  }
  // who played before us and after us, from the posted bill with our slot
  // placed by popularity — or last, when headlining
  function neighboursLine(state, g, due, bill) {
    if (!bill || !bill.acts || !bill.acts.length) return '';
    const poster = KP.festivalPoster(bill, oursOn(state, g, due));
    const at = poster.findIndex(a => a.ours);
    const before = poster[at + 1];   // lower on the poster: plays before us
    const after = poster[at - 1];    // higher on the poster: plays after us
    const who = a => a.name + ' (' + a.company + ')';
    if (!after) return 'On after ' + who(before) + ', closing the night.';
    if (!before) return 'Opening the bill, before ' + who(after) + '.';
    return 'On after ' + who(before) + ', before ' + who(after) + '.';
  }
  // the headline ceremony (a tier-3 bill): the poster read the way the night
  // ran, every act with its company, ours last with the set's band word and
  // the moment — then the fee
  const BAND_WORD = { carried: 'a set that carried the whole field', clean: 'a clean set', shaky: 'a shaky set the field carried', fumbled: 'a fumbled set the wide shot kept' };
  function ceremonyText(state, g, f, due, read, bill, pay, moment) {
    const poster = KP.festivalPoster(bill, oursOn(state, g, due));
    const others = poster.filter(a => !a.ours).reverse().map(a => a.name + ' (' + a.company + ')');
    return g.name + ' HEADLINED ' + f.name + ' — ' + f.blurb + '. ' +
      (others.length ? 'The poster, read the way the night ran: ' + others.join(' · ') + ' · and ' : 'Top of the poster: ') +
      g.name + ' (' + state.company.short + '), last light of the night, ' + (BAND_WORD[read.band] || 'the set') + '.' +
      (moment ? ' ' + moment : '') + ' ' + KP.stageLine(state, g, read, 'the ' + f.name + ' set') +
      ' Fee +' + pay + ', and a closing-set clip the archive will keep forever.';
  }

  KP.registerWeekly('festivals', 745, function (state, rng, inbox, roster, groups) {
    const F = KP.C.FESTS;
    const led = ledger(state);
    const woy = weekOfYear(state);
    const year = yearOf(state);

    // ---- the invitations: the organizer calls, weeks out --------------
    F.LIST.forEach(f => {
      if (woy !== f.woy - F.inviteLead) return;
      // the bill (v0.11.7, §98): posted once per edition the week the
      // organizers call, whoever they call — the world's poster, not ours
      const billKey = f.id + ':' + year;
      if (!bills(state)[billKey]) {
        bills(state)[billKey] = composeBill(state, f, year);
        led.billsPosted++;
      }
      groups.forEach(g => {
        if (!g.debuted || g.retiredWeek || !g.members.length || g.hiatus || g.tour || g.jpAway) return;   // bookers skip acts mid-road (and abroad)
        if ((g.popularity || 0) < f.popMin) return;
        // the far markets (v0.10.43, §89 D9): the region has to have heard of them
        if (f.region && (KP.regionsRead(g)[f.region] || 0) < f.warmthMin) return;
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
        // last year's set (the stage, v0.10.37); everyone else most years —
        // and the year after regrets, less surely: the organizers remember
        // who answered (v0.11.5, §96 wiring; the same single draw)
        const regrets = (g.festRegrets || {})[f.id] === year - 1;
        if (!KP.festivalCertain(state, g, year) && !rng.chance(regrets ? F.inviteAfterRegrets : F.inviteChance)) return;
        led.invites++;
        KP.openScene(state, { kind: 'festivalInvite', groupId: g.id,
          festivalId: f.id, headline: icon && f.tier >= 2, expiresWeek: state.week + 2 });
        // the scene on the Desk is the truth; this line competes (v0.10.29)
        inbox.push({ kind: 'company', ind: 'festivalInvite', groupId: g.id,
          text: (f.region
            ? 'An invite from ' + f.name + ': a ' + KP.regionLabel(f.region) + ' convention slot for ' + g.name + ', ' +
              KP.weekLabel(festWeek(state, f)).text + '. The far markets open one weekend at a time, and the weekends have dates on them. The table is on the Desk.'
            : 'The ' + f.name + ' organizers reached out about ' + g.name +
              (icon && f.tier >= 2 ? ' — a HEADLINE slot, by name. The icons get the first call.' : ' — a confirmed slot on this year’s bill.') +
              ' The date is ' + KP.weekLabel(festWeek(state, f)).text + ', the answer is due in two weeks, and the invitation is on the Desk with the schedule laid beside it.') +
            (regrets ? ' After last year’s regrets the organizers called anyway — once. They remember who answered.' : '') });
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
      // the schedule moved after the ink dried: a booked slot missed — the
      // cause is ledgered (v0.11.8) so the census can read it
      const why = g.tour ? 'road' : g.jpAway ? 'japan' : g.hiatus ? 'hiatus' : (g.retiredWeek || !g.members.length) ? 'folded'
        : g.members.every(id => { const m = state.people[id]; return !m || (m.flags && m.flags.military); }) ? 'service' : null;
      if (why) {
        led.missed++;
        led.missedWhy = led.missedWhy || {};
        led.missedWhy[why] = (led.missedWhy[why] || 0) + 1;
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
      // the stages, lived (v0.11.7, §98): the night's moment, the neighbours
      // on the posted bill, the set's own effects — hashed, never drawn
      const bill = KP.festivalBillRead(state, f, yearOf(state));
      const moment = festMoment(state, g, f, due, read);
      if (moment) led.moments++;
      const neighbours = neighboursLine(state, g, due, bill);
      if (due.headline && f.tier >= 3) {
        // the headline ceremony: a top-tier poster, read top to bottom, ours last
        led.ceremonies++;
        inbox.push({ kind: 'company', ind: 'festHeadline', priority: 'critical', groupId: g.id, band: read.band, headline: true,
          text: ceremonyText(state, g, f, due, read, bill, pay, moment) });
      } else {
        inbox.push({ kind: 'company', ind: 'festival', priority: 'high', groupId: g.id, band: read.band,
          text: (due.headline
            ? g.name + ' HEADLINED ' + f.name + ' — top of the poster, last light of the night, ' + f.blurb + '. Fee +' + pay + ', and a closing-set clip the archive will keep forever.'
            : g.name + ' played ' + f.name + ' — ' + f.blurb + '. Fee +' + pay + ', and the kind of live reps no practice room sells.') +
            ' ' + KP.stageLine(state, g, read, 'the ' + f.name + ' set') +
            (neighbours ? ' ' + neighbours : '') + (moment ? ' ' + moment : '') });
      }
      settleSet(state, g, f, due, members, inbox);
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
      // the organizers remember last year's regrets (v0.11.5, §96 wiring)
      const regrets = (g.festRegrets || {})[f.id] === yearOf(state) - 1;
      return (f.region ? f.name + ' wants ' + g.name + ' on the ' + KP.regionLabel(f.region) + ' stage — a convention slot, a weekend of flights, ' + f.blurb
          : 'The ' + f.name + ' bill wants ' + g.name + (sc.headline ? ' at the TOP of the poster' : '') + ' — ' + f.blurb) +
        '. The slot is ' + KP.weekLabel(week).text + '; the fee runs ' +
        Math.round(f.pay * (sc.headline ? KP.C.FESTS.headlineMult : 1)) +
        ' and travel bills ' + f.travel + '.' +
        billLine(state, f, sc) +   // the bill, posted the week they called (v0.11.7, §98)
        (regrets ? ' After last year’s regrets the organizers called anyway; they remember who answered, and this is the call after the regrets.' : '') +
        (f.region ? (voice ? ' ' + KP.displayName(voice) + ' can run the interviews in the room’s own language.' : ' Nobody on the lineup speaks the room’s language — the interviews will limp, and the warmth with them.') : '') +
        (conflicts.length
          ? ' The schedule, read out loud: ' + conflicts.join('; ') + '. Saying yes means carrying that.'
          : ' The calendar is, for once, actually clear.');
    },
    options: (state, sc) => {
      const f = festById(sc.festivalId);
      const g = KP.groupById(state, sc.groupId);
      const out = [{ id: 'accept', label: sc.headline ? 'Take the headline' : 'Take the slot' }];   // the hits: the bot's door, today's behaviour
      // the set as a door (v0.11.7, §98): the deep cut when the fandom's pick
      // is hot, the collab when a society friend's act is on this edition's
      // bill — home bills only; a convention keeps its one slot
      if (f && g && !f.region) {
        if (KP.festivalDeepPick(state, g)) out.push({ id: 'deep', label: 'Take it with the deep cut' });
        const collab = KP.festivalCollabRead(state, g, f, yearOf(state));
        if (collab) out.push({ id: 'collab', label: 'Take it — and the collab with ' + collab.name });
      }
      out.push({ id: 'decline', label: 'Send regrets' });
      return out;
    },
    resolve: (state, sc, optionId) => {
      const F = KP.C.FESTS;
      const f = festById(sc.festivalId);
      const g = KP.groupById(state, sc.groupId);
      if (!f || !g) return {};
      const led = ledger(state);
      if (optionId === 'accept' || optionId === 'deep' || optionId === 'collab') {
        const clash = KP.festivalHardClash(state, g, festWeek(state, f));
        if (clash) return { ok: false, toast: 'The organizers need a yes that can land — ' + clash + '. Send regrets, or let the invitation lapse.' };
        if (state.budget < f.travel) return { ok: false, toast: 'Travel bills ' + f.travel + ' up front. The budget says regrets.' };
        state.budget -= f.travel;
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'appearances', -f.travel);   // the bill against the fee (§89 D10)
        led.booked++;
        g.festivalBookings = g.festivalBookings || [];
        const booking = { festivalId: f.id, week: festWeek(state, f), headline: !!sc.headline };
        // the set rides on the booking (v0.11.7, §98); the hits store nothing new
        if (optionId === 'deep') {
          const pick = KP.festivalDeepPick(state, g);
          booking.set = 'deep'; booking.pick = pick ? pick.title : null;
        } else if (optionId === 'collab') {
          const c = KP.festivalCollabRead(state, g, f, yearOf(state));
          booking.set = 'collab'; booking.collabAct = c ? c.name : null; booking.collabActId = c ? c.actId : null;
        }
        g.festivalBookings.push(booking);
        const when = KP.weekLabel(festWeek(state, f)).text;
        if (optionId === 'deep') return { toast: 'Booked: ' + g.name + ' at ' + f.name + ', ' + when + '. Travel −' + f.travel +
          '. The set list argument is settled before it starts: ' + (booking.pick ? '“' + booking.pick + '”' : 'the fandom’s b-side') + ' goes in, and the fandom will know who asked.' };
        if (optionId === 'collab') return { toast: 'Booked: ' + g.name + ' at ' + f.name + ', ' + when + '. Travel −' + f.travel +
          '. Two acts, one stage: ' + (booking.collabAct || 'the friend’s act') + ' said yes before the ink dried, and the group chat between the two is already a rehearsal schedule.' };
        return { toast: 'Booked: ' + g.name + ' at ' + f.name + ', ' + KP.weekLabel(festWeek(state, f)).text +
          '. Travel −' + f.travel + '. The vans are arranged, the set list argument begins tonight.' };
      }
      led.declined++;
      // the regrets are remembered by the organizer, by edition year
      // (v0.11.5, §96 wiring): next year's call comes less surely
      g.festRegrets = g.festRegrets || {};
      g.festRegrets[f.id] = yearOf(state);
      return { toast: 'Regrets, sent with a fruit basket. The organizers filled the slot within the hour — festival season waits for nobody, which is exactly why the invitations matter. They wrote the regrets down; next year’s call, if it comes, is the one after them.' };
    },
    // an unanswered invitation answers itself — the slot goes elsewhere
    expire: (state, sc) => {
      const f = festById(sc.festivalId);
      const g = KP.groupById(state, sc.groupId);
      ledger(state).declined++;
      if (!f || !g) return null;
      g.festRegrets = g.festRegrets || {};   // silence is regrets too (v0.11.5, §96 wiring)
      g.festRegrets[f.id] = yearOf(state);
      return { kind: 'company', groupId: g.id,
        text: 'The ' + f.name + ' deadline passed with the invitation still on the Desk. The slot went to someone who answered. The organizers keep notes about who answers.' };
    },
  });

  // ---- the timeline answers (v0.11.7, §98) — the feed's own hash stream ----
  KP.onFeedEvent('festHeadline', (state, n, rng) => {
    const gName = (KP.groupById(state, n.groupId) || { name: 'they' }).name;
    return rng.pick([
      { persona: 'stan', text: gName + ' HEADLINED. top of the poster, last light, the closing-set fancam is 4K and I am not okay. a line in a career summary happened in front of me' },
      { persona: 'casual', text: 'headlining the year’s biggest open-air bill is the sentence a career gets introduced with from now on. watched ' + gName + ' earn it from the back of a field' },
      { persona: 'fan', text: 'the whole poster read bottom to top and then ' + gName + ' at the end of it. I was there for the openers. I stayed for history' },
    ]);
  });
  KP.onFeedEvent('festCollabClip', (state, n, rng) => {
    const p = state.people[n.personId];
    const act = n.actName || 'the other group';
    return rng.pick([
      { persona: 'fan', text: 'the festival collab clip — ' + (p ? KP.publicGiven(p) : 'her') + ' and ' + act + ' on ONE stage — two fanchants colliding and nobody losing. we can have nice things' },
      { persona: 'casual', text: 'two fandoms using one hashtag over a festival collab and being normal about it. ' + act + ' on a shared stage is the kind of thing this industry forgets it can do' },
    ]);
  });

})(typeof window !== 'undefined' ? window : globalThis);
