/* The sagas (v0.9.31, §71) — rare world events that invade the world
   and have the potential to reshape it. The ruling frame, owner's
   words: a BIRTH CERTIFICATE, NOT A BIOGRAPHY — each saga gets one
   standard entrance script, then the sim takes the wheel. No outcome
   stages, no destiny: receptions, era reads, the power ranking,
   collapse and coronation are all owned by the existing physics, and
   the trades narrate whatever actually happens in the voice they use
   for everything else. Hash-timed into years 2–8, deterministic per
   seed; every name is generated fiction. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  const KINDS = ['superGroup', 'globalJV', 'reverseInvasion', 'heirMoney', 'secondCapital'];

  function ledger(state) {
    state.sagaLedger = state.sagaLedger ||
      { fired: 0, superGroup: 0, globalJV: 0, reverseInvasion: 0, heirMoney: 0,
        secondCapital: 0, jvSigned: 0, jvDeclined: 0, jvClasses: 0,
        heirStabilized: 0, heirBurst: 0 };
    return state.sagaLedger;
  }

  // ---- the deck: hash-planned at the world's first tick ----------------
  // Deterministic per seed, rare enough to feel like weather, guaranteed
  // enough that most careers get one. Hash-only: planning consumes no
  // rng, so worlds that never reach a saga week are byte-identical to
  // pre-saga builds until one fires.
  KP.planSagas = function (state) {
    if (state.sagas) return state.sagas;
    const S = KP.C.SAGA;
    const h = k => KP.hash01([state.seed, 'saga', k].join('|'));
    const plan = [];
    const first = KINDS[Math.floor(h('k1') * KINDS.length)];
    const w1 = Math.round(S.firstWindow[0] + h('w1') * (S.firstWindow[1] - S.firstWindow[0]));
    plan.push({ kind: first, week: w1, nameIdx: Math.floor(h('n1') * 5) });
    if (h('two') < S.secondChance) {
      const rest = KINDS.filter(k => k !== first);
      const second = rest[Math.floor(h('k2') * rest.length)];
      const w2 = Math.min(S.latestWeek,
        w1 + Math.round(S.secondGap[0] + h('w2') * (S.secondGap[1] - S.secondGap[0])));
      plan.push({ kind: second, week: w2, nameIdx: Math.floor(h('n2') * 5) });
    }
    state.sagas = { plan, fired: [], pending: [] };
    return state.sagas;
  };

  // ---- shared machinery -------------------------------------------------
  function usedTitles(state) {
    const used = {};
    KP.groups(state).forEach(g => (g.releases || []).forEach(r => { used[r.songTitle] = true; }));
    (state.rivals || []).forEach(r => (r.acts || []).forEach(a =>
      (a.releases || []).forEach(rel => { used[rel.title] = true; })));
    return used;
  }
  function pickIdentity(state, pool, idx) {
    for (let i = 0; i < pool.length; i++) {
      const cand = pool[(idx + i) % pool.length];
      if (!(state.rivals || []).some(r => r.short === cand.short)) return cand;
    }
    return pool[idx % pool.length];
  }
  function inject(state, id, base, extra) {
    // world events do not wait for a seat: the maxRivals cap governs
    // organic emergence, not invasions
    const rival = Object.assign({
      name: id.co, short: id.short, philosophy: 'hungry', blurb: '',
      prestige: base.prestige, rosterCount: base.roster,
      nextDebutWeek: state.week + 40,
      interest: {}, acts: [], recentMoves: ['Arrived'],
    }, extra || {});
    state.rivals = state.rivals || [];
    state.rivals.push(rival);
    return rival;
  }
  function newActId(state) {
    state.nextActId = state.nextActId || 1;
    return 'ra' + (state.nextActId++);
  }
  // an act of internationals: real people with home regions on file —
  // the tongue's whole apparatus reads them from day one
  function mintIntlMembers(state, rng, opts) {
    const T = KP.C.TONGUE;
    const usedNames = new Set(Object.values(state.people).map(x => x.name.given.toLowerCase()));
    const members = [];
    KP.resetIds(state.nextPersonId || KP.peekNextId());
    for (let i = 0; i < opts.size; i++) {
      const p = KP.generatePerson(rng, { status: 'rival', source: opts.source,
        usedNames, gender: opts.gender, age: rng.int(16, 22) });
      p.company = opts.short;
      p.flags.rivalNative = true;
      const region = opts.region || KP.C.REGIONS[Math.floor(rng.next() * KP.C.REGIONS.length)].id;
      p.origin = region;
      p.nativeLang = KP.marketLang(region);
      p.ko = rng.int(opts.ko[0], opts.ko[1]);
      if (!opts.keepNames) {
        const pool = T.NAMES[region];
        const given = rng.pick(pool.given);
        p.name = { family: rng.pick(pool.fam), given, display: given };
      }
      state.people[p.id] = p;
      KP.socialOf(state, p);
      members.push(p.id);
    }
    state.nextPersonId = KP.peekNextId();
    return members;
  }
  function makeAct(state, rng, rival, opts) {
    const I = KP.C.INDUSTRY;
    const act = {
      id: newActId(state), gender: opts.gender,
      gen: (state.gen && state.gen.n) || KP.C.RISEFALL.GEN.start,
      name: opts.name, concept: rng.pick(KP.C.CONCEPTS).id,
      quality: KP.clamp(opts.quality + rng.int(-3, 3), 20, 95),
      members: opts.members, popularity: 0,
      debutWeek: state.week, lastReleaseWeek: state.week,
      cycleWeeks: rng.int(I.cycleWeeks[0], I.cycleWeeks[1]),
      releases: [], retired: false,
    };
    rival.acts.push(act);
    return act;
  }
  // the entrance single: enters the same charts, counts in the same
  // week-ledger the generation math reads — a saga debut CAN be the
  // landmark that turns a wave. That is the whole point.
  function entranceRelease(state, rng, rival, act, drag) {
    const I = KP.C.INDUSTRY;
    const title = KP.genSongTitle(rng, usedTitles(state));
    const reception = Math.round(KP.clamp(
      act.quality * 0.85 + rng.normal(0, I.releaseNoiseSd) - (drag || 0), 1, 100));
    act.popularity = KP.clamp(Math.round(10 + reception * 0.7), 0, 100);
    act.releases.push({ week: state.week, title, reception, isDebut: true });
    const score = reception + act.popularity * 0.2;
    KP.chartEnter(state, { title, act: act.name, company: rival.short,
      isPlayer: false, score, entered: state.week });
    KP.nationalEnter(state, { title, act: act.name, company: rival.short,
      isPlayer: false, score, entered: state.week });
    state.rivalReleasesThisWeek = (state.rivalReleasesThisWeek || 0) + 1;
    state.weekReleases = state.weekReleases || [];
    state.weekReleases.push({ actId: act.id, actName: act.name, company: rival.short,
      title, score, reception, actPop: act.popularity });
    return { title, reception };
  }
  // a worldwide audition class on the partner's money — the same bet
  // the player's own funded circuits make, region hash-spread
  function mintWorldClass(state, rng, sourceLabel) {
    const T = KP.C.TONGUE, A = T.AUDITION, S = KP.C.SAGA;
    const n = rng.int(S.JV.classN[0], S.JV.classN[1]);
    const usedNames = new Set(Object.values(state.people).map(x => x.name.given.toLowerCase()));
    const names = [];
    KP.resetIds(state.nextPersonId || KP.peekNextId());
    for (let i = 0; i < n; i++) {
      const region = KP.C.REGIONS[Math.floor(rng.next() * KP.C.REGIONS.length)].id;
      const p = KP.generatePerson(rng, { status: 'prospect', usedNames, source: sourceLabel });
      p.origin = region;
      p.nativeLang = KP.marketLang(region);
      p.ko = rng.int(T.koStart[0], T.koStart[1]);
      const pool = T.NAMES[region];
      const given = rng.pick(pool.given);
      p.name = { family: rng.pick(pool.fam), given, display: given };
      KP.C.TALENTS.forEach(d => {
        p.talents[d].ceilLo = Math.min(100, p.talents[d].ceilLo + A.ceilingBump);
        p.talents[d].ceilHi = Math.min(100, p.talents[d].ceilHi + A.ceilingBump);
      });
      p.observations = A.fogObservations;
      state.people[p.id] = p;
      state.prospects.push(p.id);
      KP.socialOf(state, p);
      const tl = state.tongueLedger;
      if (tl) tl.intlMinted++;
      names.push(KP.displayName(p));
    }
    state.nextPersonId = KP.peekNextId();
    return names;
  }

  // ---- the entrances: one script each, then physics ---------------------
  KP.fireSaga = function (state, rng, entry, inbox) {
    const S = KP.C.SAGA;
    const led = ledger(state);
    const push = n => (inbox ? inbox.push(n) : KP.note(state, n));
    led.fired++;
    led[entry.kind]++;
    (state.sagas || KP.planSagas(state)).fired.push({ kind: entry.kind, week: state.week });

    if (entry.kind === 'superGroup') {
      const id = pickIdentity(state, S.SUPER.NAMES, entry.nameIdx);
      const rival = inject(state, id, S.SUPER, { philosophy: 'performance',
        blurb: 'Arrived fully formed: an international lineup, a global marketing plan, and a budget that has never once heard the word no.' });
      const gender = rng.chance(S.SUPER.maleShare) ? 'm' : 'f';
      const members = mintIntlMembers(state, rng, { size: S.SUPER.size, gender,
        short: rival.short, ko: KP.C.TONGUE.koStart,
        source: 'Global project trainee' });
      const act = makeAct(state, rng, rival, { name: id.act, gender,
        quality: S.SUPER.quality, members });
      const rel = entranceRelease(state, rng, rival, act, 0);
      // the courting: their scouts open on our international board on the way in
      (state.prospects || []).map(pid => state.people[pid])
        .filter(p => p && p.origin).forEach(p => { rival.interest[p.id] = S.SUPER.courtInterest; });
      const courted = state.roster.map(pid => state.people[pid])
        .filter(p => p && p.origin && p.status === 'trainee');
      push({ kind: 'industry', ind: 'sagaSuper', priority: 'critical',
        text: id.co + ' announced itself today the way money announces itself: all at once. A new house, an international project group — ' + act.name + ', ' + S.SUPER.size + ' members from four time zones, assembled over two years in total silence — and a debut single, “' + rel.title + '”, that entered the charts before the press release finished loading. The trades have no file on them. The file starts now.' });
      if (courted.length) {
        push({ kind: 'scouting', priority: 'high', personId: courted[0].id,
          text: KP.fillPro(id.co + '’s scouts asked about ' + KP.displayName(courted[0]) + ' by name within a week of arriving — the international board is exactly the shelf they shop from, and they know what we have on it. {She} has not said anything. Their money says things anyway.', courted[0]) });
      }
      return;
    }

    if (entry.kind === 'globalJV') {
      const id = pickIdentity(state, S.JV.NAMES, entry.nameIdx);
      KP.openScene(state, { kind: 'globalJV', company: id.short, coName: id.co,
        act: id.act, expiresWeek: state.week + S.JV.answerWeeks });
      push({ kind: 'company', urgent: true, ind: 'sagaJV',
        text: id.co + ' put the co-build on YOUR desk first: worldwide auditions on their money, split control, split revenue — a global group built between two letterheads. The term sheet is generous and it is dated: they are doing this with or without us, and the second meeting on their itinerary is across the street. It is on the Desk.' });
      return;
    }

    if (entry.kind === 'reverseInvasion') {
      const id = pickIdentity(state, S.INVASION.NAMES, entry.nameIdx);
      const rival = inject(state, id, S.INVASION, {
        blurb: 'An overseas major with a Seoul office and a thesis: the next wave can start from the other side of the ocean.' });
      const gender = rng.chance(0.5) ? 'm' : 'f';
      // diaspora talent: Korean names kept, home regions and first
      // languages on file — the tongue mechanics run backwards
      const members = mintIntlMembers(state, rng, { size: S.INVASION.size, gender,
        short: rival.short, ko: S.INVASION.koRange, region: 'na', keepNames: true,
        source: 'Diaspora audition' });
      const act = makeAct(state, rng, rival, { name: id.act, gender,
        quality: S.INVASION.quality, members });
      const rel = entranceRelease(state, rng, rival, act, S.INVASION.coldDrag);
      push({ kind: 'industry', ind: 'sagaInvasion', priority: 'critical',
        text: id.co + ' opened a Seoul office and debuted ' + act.name + ' the same week — diaspora kids, trained abroad, fluent in the culture twice over and working on the accent. “' + rel.title + '” arrived pre-loved overseas and stone cold domestically, which is the entire experiment in one chart. The January power ranking will have an entry nobody knows how to score. The invasion runs in reverse now.' });
      return;
    }

    if (entry.kind === 'heirMoney') {
      const id = pickIdentity(state, S.HEIR.NAMES, entry.nameIdx);
      inject(state, id, S.HEIR, {
        nextDebutWeek: state.week + 20,
        bankroll: { since: state.week, until: state.week + S.HEIR.runwayWeeks },
        blurb: 'A fortune decided it wanted a label. The budget does not read the power ranking, because the budget has never had to read anything.' });
      push({ kind: 'industry', ind: 'sagaHeir', priority: 'critical',
        text: id.co + ' registered as a label this week with no catalog, no history, and a war chest the trades describe in adjectives instead of numbers. Their first offers are already out and they are STUPID — double the market on trainees, triple on names. Every signing price in the scene just repriced. The only question the industry has is the one money cannot answer in advance: whether the gambles hit before the runway ends.' });
      return;
    }

    // secondCapital
    const region = KP.C.REGIONS[Math.floor(
      KP.hash01([state.seed, 'saga', 'capital'].join('|')) * KP.C.REGIONS.length)].id;
    state.secondCapital = { region, name: S.CAPITAL.NAMES[entry.nameIdx % 5],
      since: state.week, until: state.week + S.CAPITAL.years * KP.C.WEEKS_PER_YEAR };
    push({ kind: 'industry', ind: 'sagaCapital', priority: 'critical',
      text: state.secondCapital.name + ' launched in ' + KP.regionLabel(region) + ' today: public money, private money, and a stated ambition the announcement did not soften — to make the city this scene’s OTHER capital. Touring there pays a premium. Auditioning there is subsidized. Releases travel there with the wind at their back. The fund runs for years, and the harvest belongs to whoever actually plants.' });
  };

  // ---- the weekly: fire on schedule, then keep the books ---------------
  KP.registerWeekly('sagas', 561, function (state, rng, inbox) {
    const S = KP.C.SAGA;
    const sagas = KP.planSagas(state);
    const led = ledger(state);

    // entrances, on the hash schedule
    sagas.plan.forEach(entry => {
      if (entry.done || state.week < entry.week) return;
      entry.done = true;
      KP.fireSaga(state, rng, entry, inbox);
    });

    // pending injections (the declined JV signs across the street)
    (sagas.pending || []).slice().forEach(job => {
      if (state.week < job.week) return;
      sagas.pending = sagas.pending.filter(j => j !== job);
      if (job.kind !== 'jvAct') return;
      const rival = (state.rivals || []).find(r => r.short === job.rivalShort);
      if (!rival) return;
      const gender = rng.chance(0.5) ? 'm' : 'f';
      const members = mintIntlMembers(state, rng, { size: 5, gender,
        short: rival.short, ko: KP.C.TONGUE.koStart, source: 'Global co-build trainee' });
      const act = makeAct(state, rng, rival, { name: job.actName, gender,
        quality: S.JV.declineQuality, members });
      const rel = entranceRelease(state, rng, rival, act, 0);
      inbox.push({ kind: 'industry', ind: 'sagaJVAcross', priority: 'high',
        text: job.partner + ' found its Korean partner: ' + rival.short + '. The co-built group is called ' + act.name + ', the debut — “' + rel.title + '” — dropped in eleven markets at once, and the press kit does not mention that the term sheet crossed our desk first. Ours does.' });
    });

    // the JV keeps its promises: an audition class a year, their money
    if (state.jv && state.week <= state.jv.until) {
      const age = state.week - state.jv.since;
      if (age > 0 && age % S.JV.classEvery === 0) {
        const names = mintWorldClass(state, rng, 'JV worldwide audition — ' + state.jv.partner);
        led.jvClasses++;
        inbox.push({ kind: 'scouting', priority: 'high', ind: 'sagaJVClass',
          text: 'The ' + state.jv.partner + ' worldwide audition circuit wrapped its annual sweep — on their money, per the pact: ' + names.join(', ') + '. Files on the board, ceilings high, reads foggy. Their half of the deal keeps arriving.' });
      }
    }
    if (state.jv && !state.jv.closed && state.week > state.jv.until) {
      state.jv.closed = true;
      inbox.push({ kind: 'company', ind: 'sagaJVEnd',
        text: 'The ' + state.jv.partner + ' pact reached the end of its term and both letterheads signed the wind-down like adults. The auditions stop. The split stops. What stays is everything the pact minted: the classes, the reach, and a working relationship the trades still call “the co-build years.”' });
    }

    // the second capital sunsets on schedule
    if (state.secondCapital && !state.secondCapital.closed &&
        state.week > state.secondCapital.until) {
      state.secondCapital.closed = true;
      inbox.push({ kind: 'industry', ind: 'sagaCapitalEnd',
        text: state.secondCapital.name + ' spent its last budget line this quarter. ' + KP.regionLabel(state.secondCapital.region) + ' keeps whatever actually took root there — the venues, the circuits, the fandoms that grew up subsidized — and loses the tailwind. The trades are already arguing about whether the bid worked. The map will answer slowly.' });
    }

    // the heir's runway ends: the ending the gambles earned
    (state.rivals || []).forEach(r => {
      if (!r.bankroll || state.week < r.bankroll.until) return;
      delete r.bankroll;
      if ((r.prestige || 0) >= S.HEIR.stabilizeAt) {
        led.heirStabilized++;
        inbox.push({ kind: 'industry', ind: 'sagaHeirEnd', priority: 'high',
          text: r.short + '’s runway ended this week and nobody noticed, which is the whole story: the gambles hit, the acts are real, and the label that started as somebody’s fortune now runs on its own receipts. The trades quietly moved them from “money” to “company.” That is the hardest promotion in this industry.' });
      } else {
        led.heirBurst++;
        r.prestige = KP.clamp((r.prestige || 0) - S.HEIR.burstPrestige, 5, 95);
        r.rosterCount = Math.min(r.rosterCount || 0, S.HEIR.burstRoster);
        inbox.push({ kind: 'industry', ind: 'sagaHeirEnd', priority: 'high',
          text: 'The tap closed at ' + r.short + '. The fortune behind the label read the receipts, and the receipts read like receipts. Half the floor was released in a week, the stupid offers stopped mid-sentence, and every price they distorted is drifting back to market. The scene absorbs the signing class. It always does.' });
      }
    });
  });

  // ---- the JV scene: the one saga whose entrance is a player decision --
  KP.registerScene('globalJV', {
    title: (state, sc) => sc.company + ' · the co-build',
    body: (state, sc) => (sc.coName || sc.company) +
      ' is offering the joint venture: worldwide auditions funded entirely by their side, an annual class of international prospects on our board, their marketing muscle behind the project — and in exchange, split control and a ' +
      Math.round((KP.C.SAGA.JV.share) * 100) + '% share of overseas touring revenue for ' + KP.C.SAGA.JV.years +
      ' years. Decline, and the same term sheet goes across the street by Friday. Either way the world changes; the only question is whether it changes with our name on it.',
    options: () => [
      { id: 'sign', label: 'Sign the pact — build it together' },
      { id: 'decline', label: 'Decline — we build alone' },
    ],
    resolve: (state, sc, optionId) => {
      const S = KP.C.SAGA;
      const led = ledger(state);
      if (optionId === 'sign') {
        led.jvSigned++;
        state.jv = { partner: sc.company, since: state.week,
          until: state.week + S.JV.years * KP.C.WEEKS_PER_YEAR, share: S.JV.share };
        const rng = KP.rngFor(state);
        const names = mintWorldClass(state, rng, 'JV worldwide audition — ' + sc.company);
        state.rngState = rng.state();
        return { toast: 'Signed. ' + sc.company + '’s first worldwide sweep was already in motion — ' + names.join(', ') + ' land on the board this week, on their money. The pact runs ' + S.JV.years + ' years: their auditions, their split of the road abroad, our rooms, our name on half of everything. The world’s inputs just changed shape.' };
      }
      return { toast: declineJV(state, sc) };
    },
    expire: (state, sc) => ({ kind: 'company',
      text: declineJV(state, sc) + ' The term sheet expired on the Desk, which their side read fluently: silence is an answer with worse manners.' }),
  });
  function declineJV(state, sc) {
    const S = KP.C.SAGA;
    ledger(state).jvDeclined++;
    const partner = (state.rivals || []).filter(r => !r.founderGrudge)
      .sort((a, b) => (b.prestige || 0) - (a.prestige || 0))[0];
    if (partner) {
      partner.prestige = KP.clamp((partner.prestige || 0) + S.JV.declinePrestige, 5, 95);
      const sagas = KP.planSagas(state);
      sagas.pending.push({ kind: 'jvAct', week: state.week + S.JV.declineActWeeks,
        actName: sc.act, partner: sc.company, rivalShort: partner.short });
      return 'Declined. ' + sc.company + '’s people were professionally gracious about it, which is how you know the second meeting was already booked: ' + partner.short + ' takes the pact, the money, and the worldwide sweep. We will be watching the group we said no to.';
    }
    return 'Declined. ' + sc.company + ' folded the term sheet away and thanked the room. The scene is thin enough right now that the deal may simply go home unsigned — which is its own kind of ending.';
  }

  // ---- the timeline reacts ---------------------------------------------
  KP.onFeedEvent('sagaSuper', (state, n, rng) => rng.pick([
    { persona: 'stan', text: 'a whole company materialized overnight with an international group that trained in SECRET for two years?? the debut stage looks like a final. the industry chat is in shambles and so am I' },
    { persona: 'casual', text: 'new label, global lineup, debut already charting. either this reshapes the whole scene or it is the most expensive fireworks show ever staged. watching either way' },
    { persona: 'press', text: 'The new arrival skipped every rung of the ladder — no survival show, no slow build, straight to scale. Whether the scene bends around them is now the year’s actual story.' },
  ]));
  KP.onFeedEvent('sagaJV', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'the co-build rumors are REAL. a foreign major wants to build a global group from inside our scene. terrified and excited is a normal way to feel about mergers, right' },
    { persona: 'casual', text: 'global joint venture talk in the trades. every one of these either changes the industry or becomes a very expensive press release. no in-between has ever existed' },
  ]));
  KP.onFeedEvent('sagaJVAcross', (state, n, rng) => rng.pick([
    { persona: 'stan', text: 'so the global co-build landed across the street. eleven markets, day one. we are going to be hearing this group’s name for YEARS and I already have opinions about that' },
    { persona: 'casual', text: 'the foreign money found a partner and the debut dropped everywhere at once. the scene’s map just got bigger whether the scene likes it or not' },
  ]));
  KP.onFeedEvent('sagaJVClass', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'the worldwide audition class landed and the files are all ceiling and fog. somebody in this batch is the future, statistically. the fun part is nobody knows which one' },
    { persona: 'casual', text: 'annual global audition sweep, funded by the partner side. the pipeline is planetary now. wild time to be a trainee anywhere on earth' },
  ]));
  KP.onFeedEvent('sagaInvasion', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'the diaspora group debuted and their interviews are this beautiful two-language braid. huge overseas, ice cold here, and watching them earn the home crowd is going to be a SAGA. rooting honestly' },
    { persona: 'casual', text: 'an overseas company invading the home market with kids who grew up on this music from the other side of the ocean. the thesis writes itself. the charts will grade it' },
    { persona: 'press', text: 'The reverse invasion is the rare debut where the overseas numbers arrived before the domestic ones. The scene has no scoring rubric for it, which the January ranking is about to make obvious.' },
  ]));
  KP.onFeedEvent('sagaHeir', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'new label with infinite money and zero history making offers that made three CEOs choke on their coffee. every trainee in the city just got more expensive. chaos. delicious, terrible chaos' },
    { persona: 'stan', text: 'the money label is REAL and the offers are unhinged. protect your faves’ companies, or don’t, honestly some of these numbers would improve several lives' },
  ]));
  KP.onFeedEvent('sagaHeirEnd', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'the money label’s runway ended and the whole scene checked the receipts at the same time. either a company got born or a very expensive lesson did. both are content' },
    { persona: 'press', text: 'Bankroll eras end the same way they begin: all at once. The market is repricing this week — trainee offers, veteran signings, all of it.' },
  ]));
  KP.onFeedEvent('sagaCapital', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'a whole CITY is bidding to become the scene’s second capital. subsidized auditions, premium touring, the works. planting season is open and I hope my faves’ company is paying attention' },
    { persona: 'casual', text: 'a regional market just put public money behind becoming the other center of this industry. infrastructure bids are the least glamorous world-changing news there is' },
  ]));
  KP.onFeedEvent('sagaCapitalEnd', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'the second-capital fund sunset today. the venues stay, the subsidies don’t. now we find out what actually took root vs what was just watered' },
  ]));
  KP.onFeedEvent('sagaJVEnd', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'the co-build pact wrapped its term. the classes it minted are mid-career now. deals end, the people they found don’t. that’s the whole industry in one sentence' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
