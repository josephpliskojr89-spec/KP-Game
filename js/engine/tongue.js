/* The deep map + the tongue + the world's auditions (v0.9.29, map
   slot 10, §55.5 + §55.15). Language colors the map's verbs: the
   fluent member becomes the voice abroad, interpreters bill when
   nobody is, and the world auditions — global tours minting prospects
   with home regions and native languages on the file. Her corner of
   the map loves her from day one, and the airport fills when the tour
   finally comes. CONTENT LAW (ruled at folding): the feed's register
   for international members is home-region pride and the bridge she
   becomes — never the ugly half, which exists only as institutional
   pressure the player manages. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.tongueLedger = state.tongueLedger ||
      { auditions: 0, intlMinted: 0, intlSigned: 0, voiceLegs: 0, interpreterLegs: 0, airports: 0 };
    return state.tongueLedger;
  }
  KP.marketLang = function (regionId) {
    return KP.C.TONGUE.MARKET_LANG[regionId] || 'English';
  };
  KP.koOf = function (p) {
    return p.origin ? (p.ko != null ? p.ko : 30) : 100;
  };
  // the fluent voice for a market: native tongue, or Korean-level command
  KP.speaks = function (p, lang) {
    if (lang === 'Korean') return KP.koOf(p) >= KP.C.TONGUE.koConversational;
    return p.nativeLang === lang;
  };
  KP.voiceAbroad = function (state, g, regionId) {
    const lang = KP.marketLang(regionId);
    return g.members.map(id => state.people[id]).filter(Boolean)
      .find(m => !KP.onBreak(m) && KP.speaks(m, lang)) || null;
  };

  // ---- the world's auditions: fund a tour, mint the class -------------
  KP.fundAudition = function (state, regionId) {
    const T = KP.C.TONGUE, A = T.AUDITION;
    if (!KP.C.REGIONS.some(r => r.id === regionId)) return { ok: false, reason: 'No audition circuit runs there.' };
    state.auditionCooldowns = state.auditionCooldowns || {};
    if (state.week - (state.auditionCooldowns[regionId] || -999) < A.cooldownWeeks) {
      return { ok: false, reason: 'The ' + KP.regionLabel(regionId) + ' circuit ran recently. Auditions are annual affairs — the next class is still in school.' };
    }
    if (state.budget < A.cost) return { ok: false, reason: 'A global audition tour runs ' + A.cost + ' — venues, judges, flights, tape. The budget says stay home.' };
    state.budget -= A.cost;
    state.auditionCooldowns[regionId] = state.week;
    const rng = KP.rngFor(state);
    const pool = T.NAMES[regionId];
    const usedNames = new Set(Object.values(state.people).map(x => x.name.given.toLowerCase()));
    const n = rng.int(A.minted[0], A.minted[1]);
    const led = ledger(state);
    led.auditions++;
    KP.resetIds(state.nextPersonId || KP.peekNextId());
    const names = [];
    for (let i = 0; i < n; i++) {
      const p = KP.generatePerson(rng, { status: 'prospect', usedNames,
        source: 'Global audition — ' + KP.regionLabel(regionId) });
      // the file: home region, native tongue, a name from home
      p.origin = regionId;
      p.nativeLang = KP.marketLang(regionId);
      p.ko = rng.int(T.koStart[0], T.koStart[1]);
      const given = rng.pick(pool.given);
      p.name = { family: rng.pick(pool.fam), given,
        display: given };
      // higher ceiling, harder read — the whole bet of going abroad
      KP.C.TALENTS.forEach(d => {
        p.talents[d].ceilLo = Math.min(100, p.talents[d].ceilLo + A.ceilingBump);
        p.talents[d].ceilHi = Math.min(100, p.talents[d].ceilHi + A.ceilingBump);
      });
      p.observations = A.fogObservations;
      state.people[p.id] = p;
      state.prospects.push(p.id);
      KP.socialOf(state, p);
      led.intlMinted++;
      names.push(KP.displayName(p));
    }
    state.nextPersonId = KP.peekNextId();
    state.rngState = rng.state();
    const note = KP.note(state, { kind: 'scouting', priority: 'high', ind: 'auditionTour',
      text: 'The ' + KP.regionLabel(regionId) + ' audition tour wrapped — ' + n + ' callbacks made the tape: ' +
        names.join(', ') + '. Higher ceilings than the home board, and a read the scouts admit is half guesswork: new city, new stage habits, and the tape does not show what a practice room shows. The bet is the point. Files are on the board.' });
    return { ok: true, minted: n, note: note.text };
  };

  // ---- the tongue trains: Korean, weekly, quietly ---------------------
  KP.registerWeekly('tongue', 792, function (state, rng, inbox, roster) {
    const T = KP.C.TONGUE;
    roster.forEach(p => {
      if (!p.origin || KP.onBreak(p)) return;
      const before = KP.koOf(p);
      if (before >= 95) return;
      p.ko = KP.clamp(before + (p.status === 'idol' ? T.koActive : T.koIdle), 0, 95);
      if (before < T.koConversational && p.ko >= T.koConversational) {
        ledger(state);   // shape stays stable
        inbox.push({ kind: 'development', personId: p.id,
          text: KP.fillPro(KP.displayName(p) + '’s Korean crossed the line this week — the variety clip where {she} lands a joke WITHOUT the pause is already cut and captioned. The bridge runs both directions now, and {she} built it in the practice room after hours.', p) });
      }
    });
  });

  // ---- signing an international is a ledgered event -------------------
  KP.onFeedEvent('auditionTour', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'a korean label running open auditions here is genuinely a whole city holding its breath. somebody from THIS scene might be on that stage next year' },
    { persona: 'fan', text: 'the audition tour lines went around the block. every dance academy in the city emptied out for the day. futures happened today, we just don’t know whose yet' },
  ]));
  KP.onFeedEvent('airportHome', (state, n, rng) => {
    const p = n.personId ? state.people[n.personId] : null;
    const name = p ? KP.publicGiven(p) : 'her';
    return rng.pick([
      { persona: 'fan', text: name + ' landing in her home airport and the ARRIVALS HALL IS FULL. the signs are in two languages and the crying is in one. she left as a trainee and came home as the reason kids here start dancing' },
      { persona: 'casual', text: 'an idol coming home to play the stadium she grew up next to is the single best storyline this industry produces. the whole city showed up at the airport like a relative' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
