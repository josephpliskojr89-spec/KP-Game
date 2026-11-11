/* The Japan cycle (v0.10.8, §80 finding 4) — the second discography
   on its own calendar. Past a warmth threshold the partner label
   calls: a licensing deal that opens the JP lane — the JP-version
   single (the hit re-cut, cheap and quick) or the JP-original (a
   real record, written for the market, twice the weeks). The lane
   claims REAL in-country weeks: no Korean release, no tour, no
   fancon while the group is in Tokyo. Results post to the Nichion
   weekly against the rival titans who run the same cycle, revenue
   flows through the books with the partner's cut off the top, and
   the JP fanbase climbs the ladder every touring act measures
   itself against: the hall, the arena, THE DOME. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.jpLedger = state.jpLedger ||
      { offers: 0, signed: 0, releases: 0, originals: 0, topTens: 0,
        numberOnes: 0, rungs: 0, domes: 0, notYets: 0 };
    // the "not yet"s counted (v0.11.5, §96 wiring) — healed lazily
    if (state.jpLedger.notYets == null) state.jpLedger.notYets = 0;
    if (state.jpLedger.awayMoments == null) state.jpLedger.awayMoments = 0;   // the in-country weeks (v0.11.7, §98)
    return state.jpLedger;
  }
  KP.jpLedger = ledger;
  // the partner's cut: the signed deal's number (stored on the partnership
  // at signing), or the first letter's constant for a deal signed before
  // the cut could move (v0.11.5, §96 wiring)
  KP.jpCut = function (state) {
    const J = KP.C.JAPAN;
    return state.jpPartner && state.jpPartner.cut != null ? state.jpPartner.cut : J.partnerCut;
  };
  // the NEXT letter's cut: every "not yet" (and every letter left to
  // expire) makes it steeper, up to the partner's ceiling
  KP.jpOfferCut = function (state) {
    const J = KP.C.JAPAN;
    return Math.min(J.cutMax, J.partnerCut + ((state.jpLedger || {}).notYets || 0) * J.notYetCutStep);   // a read, never a create
  };
  function cutWord(state, cut) {
    const J = KP.C.JAPAN;
    const steps = Math.round((cut - J.partnerCut) / J.notYetCutStep);
    return steps <= 0 ? null
      : cut >= J.cutMax ? 'as steep as the partner’s letters get'
      : steps === 1 ? 'a few points steeper than the last letter'
      : 'steeper again than the last letter';
  }

  const PARTNERS = ['Aozora Records', 'Hoshiboshi', 'Kagayaki Tokyo', 'Umineko Label'];

  // the titans' pulse: hash-driven weekly scores, no state
  function titanScore(state, i) {
    const J = KP.C.JAPAN;
    const pulse = KP.hash01([state.seed, 'titan', i, Math.floor(state.week / 8)].join('|'));
    return J.titanBase[i] * (0.75 + pulse * 0.5);
  }

  // ---- the partner call --------------------------------------------------
  KP.registerScene('partnerDeal', {
    title: (state, sc) => sc.partner + ' · the licensing table',
    body: (state, sc) => {
      const J = KP.C.JAPAN;
      const cut = sc.cut != null ? sc.cut : J.partnerCut;   // the letter keeps its own number (v0.11.5)
      const word = cutWord(state, cut);
      return sc.partner + ' flew in for this meeting: a licensing partnership for the Japanese market. ' +
        'They handle distribution, broadcast bookings, the in-country machine — and take ' +
        Math.round(cut * 100) + '% of everything Japan, forever' +
        (word ? ' — ' + word + ', because the partner remembers every “not yet”' : '') +
        '. In exchange, the second ' +
        'discography opens: JP releases on their calendar, the Nichion chart, the hall-arena-dome ladder every ' +
        'touring act measures itself against. Nobody runs Japan alone. The question is whether you run it with them.';
    },
    options: () => [
      { id: 'sign', label: 'Sign the partnership' },
      { id: 'decline', label: 'Not yet' },
    ],
    resolve: (state, sc, optionId) => {
      const J = KP.C.JAPAN;
      if (optionId !== 'sign') {
        state.jpDeclinedWeek = state.week;
        // "not yet" is not free (v0.11.5, §96 wiring): the next letter asks for more
        ledger(state).notYets++;
        const next = KP.jpOfferCut(state);
        return { toast: 'Declined, politely. The market stays across the water; the phone number keeps — and the next letter, if it comes, ' +
          (next > (sc.cut != null ? sc.cut : J.partnerCut) ? 'asks for a little more of everything Japan. Partners price patience.' : 'asks for the same cut; their letters do not go steeper than this one.') };
      }
      state.jpPartner = { name: sc.partner, since: state.week, cut: sc.cut != null ? sc.cut : J.partnerCut };
      ledger(state).signed++;
      KP.note(state, { kind: 'company', ind: 'jpSigned', priority: 'high',
        text: 'Signed: the ' + sc.partner + ' partnership' + (cutWord(state, state.jpPartner.cut) ? ', at a cut ' + cutWord(state, state.jpPartner.cut) : '') + '. The press release runs in two languages, the second discography officially exists, and somewhere in the building somebody pins a map of dome venues to a corkboard. The ladder starts at the bottom like every ladder.' });
      return { toast: 'The second discography opens. Japan runs on its own calendar now.' };
    },
    // a letter left to expire is a "not yet" the partner heard the same way (v0.11.5)
    expire: (state, sc) => { state.jpDeclinedWeek = state.week; ledger(state).notYets++; return null; },
  });

  // ---- the lane: the verb ------------------------------------------------
  KP.planJapanRelease = function (state, groupId, laneId) {
    const J = KP.C.JAPAN;
    const lane = J.LANES[laneId];
    if (!lane) return { ok: false, reason: 'The lane is JP-version or JP-original. Pick one.' };
    if (!state.jpPartner) return { ok: false, reason: 'Nobody runs Japan alone. The partnership comes first.' };
    const g = KP.groups(state).find(x => x.id === groupId);
    if (!g || !g.debuted || g.retiredWeek) return { ok: false, reason: 'The lane is for a debuted act.' };
    if (g.prep || g.tour || g.hiatus || g.jpAway) return { ok: false, reason: 'The calendar is spoken for.' };
    if (state.week <= (g.promoUntil || 0)) return { ok: false, reason: 'Mid-promotion. Japan claims whole weeks, not spare ones.' };
    if ((KP.regionsRead(g).jp || 0) < J.minWarmth) {
      return { ok: false, reason: 'The room over there is still quiet. A release into silence is a shipment, not a debut.' };
    }
    if (state.week - (g.lastJpWeek || -999) < J.cooldown) {
      return { ok: false, reason: 'The partner paces the market. The last JP record is still working.' };
    }
    // a booked festival inside the trip is a signed contract (audit v0.11.3)
    if ((g.festivalBookings || []).some(b => b.week >= state.week && b.week <= state.week + lane.weeks)) {
      return { ok: false, reason: 'A festival slot is booked inside those weeks. Play it, or decline it first.' };
    }
    if (state.budget < lane.cost) return { ok: false, reason: 'The lane bills up front — ' + lane.cost + '.' };
    state.budget -= lane.cost;
    if (KP.ledgerFlow) { KP.ledgerFlow(state, 'japan', -lane.cost); KP.accrueDebt(state, g, lane.cost); }
    g.jpAway = { lane: laneId, until: state.week + lane.weeks };
    g.lastJpWeek = state.week;
    KP.note(state, { kind: 'company', ind: 'jpLaneOpen', priority: 'high', groupId: g.id,
      text: g.name + ' flies out: ' + lane.word + ', ' + lane.weeks + ' weeks in-country on ' +
        state.jpPartner.name + '’s calendar. The Korean schedule goes quiet — that is not a gap, that is the cost. Groups that run Japan vanish from Seoul for a quarter, and the ones that do it right come back bigger in both places.' });
    return { ok: true };
  };

  // ---- the in-country week (v0.11.7, §98) ---------------------------------
  // the away weeks stop being silent: one letter a week from a moment family
  // — the billboard, the radio spot in slow Japanese, the fan letter in
  // katakana, the hall's soundcheck, the convenience-store photo, the train
  // platform — hash-picked, never the same kind two weeks running, and the
  // sentence kept on the trip for the Today card. The districts are invented
  // (content law); the voice abroad is named when the room has one.
  const DISTRICTS = ['Hoshigawa crossing', 'Kagerou-dōri', 'Yumemachi station square', 'Tsukikawa crossing', 'Hinodebashi'];
  function jpMoment(state, g) {
    const members = g.members.map(id => state.people[id]).filter(Boolean).filter(m => !KP.onBreak(m) && !(m.flags && m.flags.military));
    if (!members.length) return null;
    // the key is pre-hashed (KP.hashStr) before hash01: FNV-1a barely moves
    // its top bits for a change in the key's last characters, and the week
    // is what changes; the line salt leads with the week for the same reason
    const h = tag => KP.hash01(KP.hashStr([state.seed, tag, g.id, state.week].join('|')));
    const pickM = tag => members[Math.floor(h(tag) * members.length)];
    const line = (kind, lines) => KP.lineFor(state, state.week + ':jpMoment:' + kind + ':' + g.id, lines, null);
    const N = m => KP.displayName(m);
    const partner = state.jpPartner ? state.jpPartner.name : 'the partner';
    const voice = KP.voiceAbroad ? KP.voiceAbroad(state, g, 'jp') : null;
    const district = DISTRICTS[Math.floor(h('jpDistrict') * DISTRICTS.length)];
    const hall = g.jpRung === 2 ? 'the dome' : g.jpRung === 1 ? 'the arena' : g.jpRung === 0 ? 'the hall' : 'the showcase room ' + partner + ' booked';
    const kinds = [
      { kind: 'billboard', text: () => line('billboard', [
        'The ' + district + ' billboard went up this week — ' + g.name + ' four storeys tall over a crossing that does not stop moving, and the fans who found it filmed the whole light cycle.',
        g.name + ' is on the big screen at ' + district + ' now, between a phone and a canned coffee; ' + partner + ' sent a photo at six in the morning with no caption, which is how a partner celebrates.',
        'A billboard at ' + district + ': the group looking down on a crossing of ten thousand people an hour. Somebody on the staff stood under it for the whole loop. Twice.',
      ]) },
      { kind: 'radioSlow', text: () => voice
        ? KP.fillPro(line('radioSlowVoice', [
            'The radio spot aired — ' + N(voice) + ' carried it in slow, careful Japanese, and the host slowed down to meet {her}. The clip is circulating with hearts drawn on it.',
            N(voice) + ' did the radio interview in the market’s own language, a pause here and there and every one of them forgiven on air; ' + partner + ' played it back on the office speakers.',
            'Morning radio: ' + N(voice) + ' answered in Japanese slow enough to be a lesson, and the listeners wrote in to say they were taking notes.',
          ]), voice)
        : line('radioSlowInterp', [
            'The radio spot aired through the interpreter — the pauses were long, the host was kind, and the clip is making the rounds with subtitles the company did not write.',
            'Morning radio, the interpreter in the booth: every answer landed a beat late. The fans say it was charming. ' + partner + ' said nothing, which was its own note.',
            'The radio interview ran in slow Japanese on the host’s side and in Korean on ours, an interpreter in between; the market noticed who was not speaking to it.',
          ]) },
      { kind: 'fanLetter', text: () => { const m = pickM('jpLetter'); return KP.fillPro(line('fanLetter', [
        'A fan letter reached the hotel desk with ' + N(m) + '’s name written in katakana, each stroke practised; {she} read it twice and keeps it in the passport pocket.',
        N(m) + ' got a letter in katakana this week — three pages, a pressed flower, a phonetic fanchant guide written by hand. {She} has not stopped showing people.',
        'The first fan letter of the trip: ' + N(m) + '’s name in katakana on the envelope and a drawing of the whole group inside, one member slightly too tall. {She} says it is accurate.',
      ]), m); } },
      { kind: 'soundcheck', text: () => line('soundcheck', [
        'Soundcheck at ' + hall + ': an empty room, a clean mix, and the staff in the back row filming the moment the first chorus hit the ceiling.',
        'The ' + hall + ' soundcheck ran long and nobody minded — the monitors were right for once, and the group did the fanchant themselves to hear how the room would answer.',
        'An afternoon of soundcheck in ' + hall + ': the empty seats, the lights tested one color at a time, and a photo of the group sitting on the lip of the stage that the fans will frame.',
      ]) },
      { kind: 'konbini', text: () => { const m = pickM('jpKonbini'); return KP.fillPro(line('konbini', [
        'A convenience-store photo trended: ' + N(m) + ' at one in the morning with an onigiri and the face of someone who has found the meaning of life. The store sold out of that onigiri.',
        'The konbini photo — ' + N(m) + ', fluorescent light, a basket of things nobody needs at midnight — went around the market faster than the single did. {She} wants royalties.',
        N(m) + '’s convenience-store selfie trended for a day: a steamed bun, a hood up, a caption in three languages. The staff found {her} there again the next night.',
      ]), m); } },
      { kind: 'trainPlatform', text: () => line('trainPlatform', [
        'The whole group on a train platform at rush hour, masks up, in a line like everyone else; a fan recognised them by the shoes and said nothing until the doors closed. The post has a million views.',
        'A platform photo: ' + g.name + ' waiting for the last train with the commuters, a vending-machine coffee each. The market likes a group that takes the train; ' + partner + ' likes that the market likes it.',
        'The train-platform clip — ' + g.name + ' bowing to a station attendant who bowed back — is the week’s quiet hit. Nobody staged it, which is why it worked.',
      ]) },
    ];
    const pool = kinds.filter(k => k.kind !== g.jpLastMomentKind);
    const pick = pool[Math.floor(h('jpMoment') * pool.length)] || kinds[0];
    g.jpLastMomentKind = pick.kind;
    return pick.text();
  }
  // the pure read the Today card renders (the "In Japan" card): null when
  // the group is not away; the moment is this week's sentence or null
  KP.japanAwayRead = function (state, g) {
    if (!g || !g.jpAway) return null;
    const lane = KP.C.JAPAN.LANES[g.jpAway.lane] || { weeks: 0 };
    const m = g.jpAway.moment;
    return { weeksLeft: Math.max(0, g.jpAway.until - state.week), weeksTotal: lane.weeks,
      lane: g.jpAway.lane === 'original' ? 'JP-original' : 'JP-version', laneId: g.jpAway.lane,
      partner: state.jpPartner ? state.jpPartner.name : null,
      moment: m && m.week === state.week ? m.text : null };
  };

  // ---- the week ----------------------------------------------------------
  KP.registerWeekly('japan', 762, function (state, rng, inbox) {
    const J = KP.C.JAPAN;
    const led = ledger(state);
    // the partner calls when the warmth is real
    if (!state.jpPartner &&
        state.week - (state.jpDeclinedWeek || -999) > 24 &&
        !(state.scenes || []).some(sc => sc.kind === 'partnerDeal')) {
      const warm = KP.groups(state).some(g => g.debuted && (KP.regionsRead(g).jp || 0) >= J.partnerAt);
      if (warm && rng.chance(0.25)) {
        led.offers++;
        const partner = PARTNERS[Math.floor(KP.hash01([state.seed, 'jppartner'].join('|')) * PARTNERS.length)];
        const cut = KP.jpOfferCut(state);   // the letter keeps its own number (v0.11.5, §96 wiring)
        const word = cutWord(state, cut);
        KP.openScene(state, { kind: 'partnerDeal', partner, cut, expiresWeek: state.week + 3 });
        inbox.push({ kind: 'industry', ind: 'jpOffer', priority: 'high',
          text: word
            ? partner + ' has been watching the Japanese numbers and wants the meeting again — the same partnership, the second discography behind it, and a cut ' + word + '. The “not yet” was heard; it was priced. The table is on the Desk.'
            : partner + ' has been watching the Japanese numbers and wants the meeting — a licensing partnership, the real kind, with the second discography behind it. The table is on the Desk. The market across the water does not knock twice quickly.' });
      }
    }
    // the away weeks resolve
    KP.groups(state).forEach(g => {
      if (!g.jpAway) return;
      // the weeks in-country: fatigue, warmth building on the ground
      if (state.week < g.jpAway.until) {
        g.members.map(id => state.people[id]).filter(Boolean).forEach(m => {
          if (!KP.onBreak(m)) m.fatigue = KP.clamp(m.fatigue + 3, 0, 100);
        });
        // the in-country week (v0.11.7, §98): a moment a week, the landing
        // week excepted — the lane-open letter already told that one
        if (state.week !== (g.lastJpWeek || 0)) {
          const text = jpMoment(state, g);
          if (text) {
            const lane = J.LANES[g.jpAway.lane] || { weeks: 0 };
            led.awayMoments++;
            g.jpAway.moment = { week: state.week, kind: g.jpLastMomentKind, text };
            inbox.push({ kind: 'company', ind: 'jpAwayWeek', priority: 'normal', groupId: g.id,
              text: 'In Japan, week ' + Math.max(1, lane.weeks - (g.jpAway.until - state.week)) + ' of ' + lane.weeks + ': ' + text });
          }
        }
        return;
      }
      // release week: the record posts to the Nichion weekly
      const laneId = g.jpAway.lane;
      const lane = J.LANES[laneId];
      delete g.jpAway;
      led.releases++;
      if (laneId === 'original') led.originals++;
      const regions = KP.regionsOf(g);
      const lastRec = (g.releases || []).length ? g.releases[g.releases.length - 1].reception : 45;
      const voice = KP.voiceAbroad ? KP.voiceAbroad(state, g, 'jp') : null;
      let score = (regions.jp * 0.55 + lastRec * 0.45) * lane.mult *
        (0.9 + rng.next() * 0.25);
      score *= KP.tongueFactor(state, g, 'jp', 'japan');   // one table (§89 D12)
      const board = J.titans.map((name, i) => ({ name, score: titanScore(state, i) }));
      board.push({ name: g.name, score, mine: true });
      board.sort((a, b) => b.score - a.score);
      const rank = board.findIndex(r => r.mine) + 1;
      if (rank <= 10) led.topTens++;
      if (rank === 1) led.numberOnes++;
      const revenue = Math.round(score * J.revPerScore * (1 - KP.jpCut(state)));   // the signed cut (v0.11.5)
      KP.takeIn(state, revenue);
      if (KP.ledgerFlow) KP.ledgerFlow(state, 'japan', revenue);
      if (KP.settleShare) KP.settleShare(state, g, revenue);
      regions.jp = KP.clamp(regions.jp + J.warmthGain[laneId], 0, 100);
      g.jpFans = (g.jpFans || 0) + Math.round(score * J.fansPerScore);
      inbox.push({ kind: 'public', ind: 'jpRelease', priority: 'high', groupId: g.id,
        text: g.name + '’s ' + (laneId === 'original' ? 'JP-original' : 'JP-version') + ' posts at #' + rank +
          ' on the Nichion weekly' + (rank === 1 ? ' — NUMBER ONE, over ' + board[1].name + ', and the partner office sent flowers'
            : rank === 2 ? ', one rung under ' + board[0].name : ', in a chart the titans own by default') +
          '. ' + revenue + ' through the books after ' + state.jpPartner.name + '’s cut' +
          (voice ? ', with ' + KP.displayName(voice) + ' carrying every interview — the market remembers who speaks to it.'
                 : ' — and every interview ran through an interpreter, which the variety clips did not forgive.') });
      // the ladder: the fanbase buys the next rung
      const rung = J.LADDER.filter(r => g.jpFans >= r.at).pop();
      const rungIdx = rung ? J.LADDER.indexOf(rung) : -1;
      if (rungIdx > (g.jpRung != null ? g.jpRung : -1)) {
        g.jpRung = rungIdx;
        led.rungs++;
        const rrev = Math.round(rung.rev * (1 - KP.jpCut(state)));
        KP.takeIn(state, rrev);
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'japan', rrev);
        if (KP.settleShare) KP.settleShare(state, g, rrev);
        if (rung.id === 'dome') {
          led.domes++;
          const nar = KP.recordEvidence(state, 'domeNight', 'group', g.id);
          if (nar) inbox.push(nar);
          inbox.push({ kind: 'public', ind: 'jpDome', priority: 'critical', groupId: g.id,
            text: g.name + ' PLAYED THE DOME. Fifty thousand lightsticks, a stage the size of a district, and the encore in careful Japanese that the crowd finished for them. There are two kinds of touring acts in this industry, and as of tonight this label manages the other kind. ' + rrev + ' through the books, and a photograph for every office wall the company will ever have.' });
        } else {
          inbox.push({ kind: 'public', ind: 'jpRung', priority: 'high', groupId: g.id,
            text: g.name + ' books ' + rung.word + ' in Japan — the ladder every touring act measures itself against, one rung bought with ' + KP.fmtCount(g.jpFans) + ' fans who learned the fanchants phonetically. ' + rrev + ' through the books. The next rung is visible from this one. That is the trap and the point.' });
        }
      }
    });
  });

  // ---- the timeline reacts -----------------------------------------------
  KP.onFeedEvent('jpRelease', (state, n, rng) => rng.chance(0.5) ? rng.pick([
    { persona: 'fan', text: 'the JP release is out and the fandom is learning a second language out of spite and love. the phonetic fanchant guide has 40k views' },
    { persona: 'casual', text: 'the japan cycle remains the industry’s best-kept open secret: vanish from seoul for a quarter, come back with a second country’s receipts' },
  ]) : null);
  KP.onFeedEvent('jpDome', (state, n, rng) => rng.pick([
    { persona: 'press', text: 'A dome night changes a company’s category. Charts are argued about; fifty thousand tickets are counted. Tonight somebody’s category changed.' },
    { persona: 'stan', text: 'THE DOME. THE ACTUAL DOME. the fancams are 4K and the crying in them is bilingual. nothing will ever be the same and we have the lightstick ocean footage to prove it' },
    { persona: 'fan', text: 'from a practice room to the dome. somebody check on the first fansite master, she has earned the night off' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
