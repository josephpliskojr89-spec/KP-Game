/* The two verdicts (v0.10.34, §91 Phase 1) — a record is judged twice.
   CRAFT is what the critics hear: the record itself, never popularity,
   hype, spend or the week. APPEAL is what the public wants. The chart
   hears appeal through reach — `reception` keeps its name and means the
   commercial result. This module owns the release-read ledger (every
   modifier tagged once), the critics' circle (three invented outlets
   whose tastes disagree, in words), the sound of the year (a lane the
   trades name every January), the catch (a second seed on every demo),
   and the divergence notes the owner asked for out loud: "plenty of
   great songs never chart high." */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  const yearOf = week => Math.floor((week - 1) / KP.C.WEEKS_PER_YEAR);   // 0-based
  function ledger(state) {
    return state.verdictLedger = state.verdictLedger ||
      { verdicts: 0, splits: 0, darlings: 0, pannedHits: 0, slumps: 0, growers: 0, trendNamed: 0, shifts: 0 };
  }
  KP.verdictLedger = ledger;

  // ---- the ledger: every modifier tagged once -----------------------------
  KP.readLedger = function () {
    const rows = { craft: [], appeal: [], reach: [] };
    return {
      add(kind, src, mod) {
        if (!rows[kind]) throw new Error('readLedger: unknown kind ' + kind);
        const m = Math.round((mod || 0) * 100) / 100;
        if (m) rows[kind].push({ src, mod: m });
      },
      sum(kind) { return rows[kind].reduce((s, r) => s + r.mod, 0); },
      rows() { return { craft: rows.craft.slice(), appeal: rows.appeal.slice(), reach: rows.reach.slice() }; },
    };
  };

  // ---- the lanes' distance: home 0, neighbour 1, far 2 --------------------
  KP.laneDistance = function (a, b) {
    if (!a || !b) return 2;
    if (a === b) return 0;
    const N = KP.C.TREND.NEIGHBOURS;
    if ((N[a] || []).includes(b) || (N[b] || []).includes(a)) return 1;
    return 2;
  };

  // ---- the sound of the year ------------------------------------------------
  // Hash per year with persistence (keepChance), chained from the
  // world's first year; a fusion SHIFT overrides the chain from its year
  // on. Pure read, no state but the overrides — the trades can name it
  // any week and every save agrees.
  function laneAt(h) {
    const lanes = KP.C.CONCEPTS.filter(c => c.id !== 'fusion');
    return lanes[Math.floor(h * lanes.length) % lanes.length].id;
  }
  KP.trendLane = function (state, year) {
    const T = KP.C.TREND;
    if (year == null) year = yearOf(state.week);
    const ov = (state.trendOverrides || []).filter(o => o.year <= year).sort((a, b) => b.year - a.year)[0];
    let lane, from;
    if (ov) { lane = ov.lane; from = ov.year + 1; }
    else { lane = laneAt(KP.hash01([state.seed, 'trend', 0].join('|'))); from = 1; }
    for (let y = from; y <= year; y++) {
      if (KP.hash01([state.seed, 'trend-keep', y].join('|')) < T.keepChance) continue;
      let next = laneAt(KP.hash01([state.seed, 'trend-pick', y].join('|')));
      if (next === lane) next = laneAt(KP.hash01([state.seed, 'trend-pick2', y].join('|')));
      lane = next;
    }
    return lane;
  };
  KP.trendOf = function (state) {
    const y = yearOf(state.week);
    const lane = KP.trendLane(state, y);
    let since = y;
    while (since > 0 && KP.trendLane(state, since - 1) === lane) since--;
    const c = KP.conceptById(lane);
    return { lane, label: c ? c.label : lane, since, years: y - since + 1 };
  };
  KP.trendFit = function (state, laneId) {
    const T = KP.C.TREND;
    const d = KP.laneDistance(KP.trendLane(state), laneId);
    return d === 0 ? T.inLane : d === 1 ? T.neighbour : T.far;
  };
  KP.trendWord = function (state, laneId) {
    const d = KP.laneDistance(KP.trendLane(state), laneId);
    return d === 0 ? 'the year’s sound' : d === 1 ? 'next door to the year’s sound' : 'against the year’s sound';
  };
  // a fusion shift moves the year's sound for real — from this year on
  KP.shiftTrend = function (state, lane) {
    state.trendOverrides = state.trendOverrides || [];
    state.trendOverrides.push({ year: yearOf(state.week), lane, week: state.week });
    ledger(state).shifts++;
  };
  // January (and the first week of a career): the trades name the sound.
  // Order 505 — before the calendar and the releases read the year.
  KP.registerWeekly('trend', 505, function (state, rng, inbox) {
    const y = yearOf(state.week);
    const woy = ((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1;
    if (woy > 2 || state.trendNamedYear === y) return;
    state.trendNamedYear = y;
    ledger(state).trendNamed++;
    const t = KP.trendOf(state);
    const prev = y > 0 ? KP.trendLane(state, y - 1) : null;
    const kept = prev === t.lane;
    inbox.push({ kind: 'industry', ind: 'trendNamed', priority: 'normal', lane: t.lane, kept,
      text: 'The trades named the sound of the year: ' + t.label.toLowerCase() + '. ' +
        (kept
          ? 'Same as last year — the ' + t.years + (t.years === 2 ? 'nd' : t.years === 3 ? 'rd' : 'th') + ' year running, which is either a golden age or a rut depending on who is selling what. '
          : (prev ? 'Last year’s ' + ((KP.conceptById(prev) || {}).label || prev).toLowerCase() + ' records are already being called “a bit last year” by people who bought them. ' : '')) +
        'A record in the lane rides the wind; a record against it has to be the argument.' });
  });

  // ---- the catch: a second seed on every demo ---------------------------
  // Hash-derived from the hook so the two can diverge — a grower with a
  // modest chorus, a cheap thrill with nothing under it — without the
  // pitch meeting drawing a new number from the stream.
  KP.catchOf = function (state, demo) {
    if (demo.catch != null) return demo.catch;
    const V = KP.C.VERDICT;
    const h = KP.hash01([state.seed, demo.id, demo.title, 'catch'].join('|'));
    return KP.clamp(Math.round(demo.hook * V.catchFromHook + V.catchBase + (h * 2 - 1) * V.catchSpread), 10, 95);
  };

  // ---- a record that predates the verdicts ----------------------------------
  // The opening world's back-dated discographies and old saves carry a
  // reception only: craft lands near it (hash), appeal IS it, and the
  // critics file retroactively. One derive, used at world start and in
  // the migration — a fresh save never changes under a reload.
  KP.deriveVerdict = function (state, rel, key, conceptId) {
    const h = KP.hash01([state.seed, 'verdict-derive', key].join('|'));
    if (rel.craft == null) rel.craft = KP.clamp(Math.round((rel.reception || 50) + (h * 2 - 1) * 8), 1, 100);
    if (rel.appeal == null) rel.appeal = KP.clamp(Math.round(rel.reception || 50), 1, 100);
    if (!rel.critics) {
      const cv = KP.criticsVerdict(state, key, rel.craft, conceptId || rel.conceptId || null);
      rel.critics = { consensus: cv.consensus, split: cv.split, verdicts: cv.verdicts.map(v => ({ id: v.id, band: v.band })) };
    }
    delete rel.acclaim;
    return rel;
  };

  // ---- the critics' circle ---------------------------------------------------
  KP.verdictBand = function (score) {
    return KP.C.VERDICT.BANDS.find(b => score >= b.min) || KP.C.VERDICT.BANDS[KP.C.VERDICT.BANDS.length - 1];
  };
  KP.verdictWord = function (key) {
    const b = KP.C.VERDICT.BANDS.find(x => x.key === key);
    return b ? b.word : (key || 'unreviewed');
  };
  // three outlets read the SAME craft through their own tastes and a
  // per-review hash wobble; the consensus is the median voice, and a
  // spread of two bands is a split — the arguments outlast the promotion
  KP.criticsVerdict = function (state, key, craft, laneId) {
    const V = KP.C.VERDICT;
    const verdicts = V.OUTLETS.map(o => {
      const taste = o.favours.includes(laneId) ? V.tasteLift : o.dislikes.includes(laneId) ? -V.tasteLift : 0;
      const jitter = (KP.hash01([state.seed, 'critic', key, o.id].join('|')) * 2 - 1) * V.outletJitter;
      const score = KP.clamp(Math.round(craft + taste + o.severity + jitter), 1, 100);
      return { id: o.id, name: o.name, band: KP.verdictBand(score).key, score, taste };
    });
    const idx = b => V.BANDS.findIndex(x => x.key === b);
    const sorted = verdicts.map(v => idx(v.band)).sort((a, b) => a - b);
    const consensus = V.BANDS[sorted[Math.floor(sorted.length / 2)]].key;
    const split = (sorted[sorted.length - 1] - sorted[0]) >= V.splitSteps;
    return { consensus, split, verdicts };
  };
  // the words: one line for a report, with the outlets' own voices
  const QUOTES = {
    acclaimed: ['the record of a company that finally stopped explaining itself',
      'every second of it sounds decided — the rare record that knows what it is for',
      'a title track that will outlive the promotion it was built for'],
    warm: ['sturdy, generous, a little safe — the kind of record that gets better in a car',
      'the chorus earns its keep and the bridge earns the chorus',
      'nothing here is new; everything here is done properly, which is rarer'],
    mixed: ['two good ideas and a committee between them',
      'a hook in search of a song — the best twenty seconds are the first twenty',
      'competent the way a brochure is competent'],
    cold: ['the arrangement spends the whole runtime looking for the exit',
      'a record that has heard other records and remembers them slightly wrong',
      'the song cannot decide who it is for, so it settles for being loud'],
    panned: ['the label should bill whoever signed off on this',
      'a demo that escaped the building before anyone finished it',
      'the kind of release that makes you check the credits for a reason'],
  };
  KP.criticsLine = function (state, cv, title) {
    const parts = cv.verdicts.map(v => v.name + ': ' + KP.verdictWord(v.band));
    const loud = cv.verdicts.slice().sort((a, b) => b.score - a.score);
    const pick = cv.split ? loud[loud.length - 1] : loud[0];
    const pool = QUOTES[pick.band] || QUOTES.mixed;
    const q = pool[Math.floor(KP.hash01([state.seed, 'quote', title, pick.id].join('|')) * pool.length) % pool.length];
    return 'The critics on “' + title + '” — ' + parts.join(' · ') + '. ' + pick.name + ': “' + q + '.”' +
      (cv.split ? ' A split verdict; the arguments will outlast the promotion.' : '');
  };

  // ---- the divergences and the critics' expectation -------------------------
  // Called from resolveDebut once the two numbers and the chart result
  // are settled. The darling and the panned hit are the owner's sentence
  // ("plenty of great songs never chart high") said out loud; the slump
  // and the grower are the critics' bar — the house's last craft.
  KP.verdictNotes = function (state, g, rel, prevCraft) {
    const V = KP.C.VERDICT;
    const led = ledger(state);
    const notes = [];
    led.verdicts++;
    if (rel.critics.split) led.splits++;
    notes.push({ kind: 'public', ind: 'criticsVerdict', priority: 'high', groupId: g.id,
      consensus: rel.critics.consensus, split: rel.critics.split,
      text: KP.criticsLine(state, rel.critics, rel.title) });
    if (rel.craft >= V.darlingCraft && rel.reception < V.darlingBelow) {
      led.darlings++;
      KP.fandomGain(g, V.prideFandom);
      notes.push({ kind: 'public', ind: 'criticsDarling', priority: 'critical', groupId: g.id,
        text: '“' + rel.title + '” is the critics’ record of the season and the public has not noticed. The write-ups are long and the numbers are short; the fandom is already calling it “the one that will age.” Plenty of great songs never chart high. This building just made one of them, and knows it.' });
    } else if (rel.reception >= V.pannedHitAt && rel.craft < V.pannedCraftBelow) {
      led.pannedHits++;
      notes.push({ kind: 'public', ind: 'pannedHit', priority: 'high', groupId: g.id,
        text: '“' + rel.title + '” is a HIT the critics would like struck from the record. The numbers are loud, the reviews are the opposite of loud, and both sides are quoting the other as proof. A hit is a hit. The company will cash it and the writers’ room will pretend it was somebody else’s.' });
    }
    if (prevCraft != null && prevCraft >= V.longevityCraft && rel.craft <= prevCraft - V.slumpDrop) {
      led.slumps++;
      notes.push({ kind: 'public', ind: 'sophomoreSlump', priority: 'high', groupId: g.id,
        text: 'The critics graded “' + rel.title + '” against the last one, and the last one won. The word “slump” appeared in two headlines and one of them put a question mark on it, which is the polite version. The record is not bad. It is just after a better one.' });
    } else if (prevCraft != null && rel.craft >= prevCraft + V.growerRise && rel.craft >= V.longevityCraft) {
      led.growers++;
      notes.push({ kind: 'public', ind: 'criticsGrower', priority: 'normal', groupId: g.id,
        text: 'The reviews of “' + rel.title + '” all reach for the same word: growth. The record is a clear step past the last one, and the critics who were lukewarm then are being gracious about it now, which is their way of saying they noticed.' });
    }
    return notes;
  };

  // ---- the staff read a demo in words, before the world does ---------------
  // The fog applies: the A&R chair hears the craft, marketing hears the
  // catch, and neither prints a number.
  KP.demoVerdictLines = function (state, demo) {
    const lines = [];
    const c = KP.catchOf(state, demo);
    if (c >= 72 && demo.hook < 55) lines.push('Marketing can already hear the chorus shouted back at a festival. The A&R chair is quieter about the verses.');
    else if (c >= 72) lines.push('The chorus is built to be shouted back. Everyone in the meeting hummed it on the way out.');
    else if (c <= 40 && demo.hook >= 65) lines.push('A grower, not a shower: the A&R chair calls it the best writing on the sheet, and marketing asked where the chorus is.');
    else if (c <= 40) lines.push('Nothing here wants to be a single. That can be a strength on a record; it is a problem on a title track.');
    const tw = KP.trendWord(state, demo.conceptId);
    if (tw === 'the year’s sound') lines.push('Right sound, right year. The market is already leaning this way.');
    else if (tw === 'against the year’s sound') lines.push('Nobody is asking for this sound right now. That is either a problem or a statement.');
    return lines;
  };

  // ---- the timeline reacts ------------------------------------------------------
  KP.onFeedEvent('criticsDarling', (state, n, rng) => {
    const g = KP.groupById(state, n.groupId);
    const name = g ? g.name : 'that group';
    return rng.pick([
      { persona: 'critic', text: 'the ' + name + ' record is the best thing out this season and it is charting like a rumor. the public is wrong. I will be saying this for a decade' },
      { persona: 'stan', text: 'the reviews for the new ' + name + ' are UNANIMOUS and the chart is a crime scene. streaming party at nine. bring the receipts, we are RIGHT' },
      { persona: 'casual', text: 'apparently the new ' + name + ' song is a masterpiece? I have not heard it once in public. where are these masterpieces being played' },
    ]);
  });
  KP.onFeedEvent('pannedHit', (state, n, rng) => {
    const g = KP.groupById(state, n.groupId);
    const name = g ? g.name : 'that group';
    return rng.pick([
      { persona: 'critic', text: 'the ' + name + ' single is number everything and I have now read four reviews that agree with me and zero charts that do. the people have spoken. the people are wrong' },
      { persona: 'anti', text: 'the critics hate the ' + name + ' song and it is STILL everywhere. I did not need this evidence that taste is dead but here we are' },
      { persona: 'stan', text: 'the reviews are mean and the song is at the top of every chart and I know which of those two things I can scream at a concert' },
    ]);
  });
  KP.onFeedEvent('criticsVerdict', (state, n, rng) => {
    if (!n.split) return null;
    const g = KP.groupById(state, n.groupId);
    const name = g ? g.name : 'that group';
    return rng.pick([
      { persona: 'critic', text: 'three outlets, three verdicts on the ' + name + ' record. one of us is right and it is the one who listened past the first chorus' },
      { persona: 'fan', text: 'the ' + name + ' reviews are a civil war and the quote-posts are picking sides like it is a sport. it IS a sport' },
    ]);
  });
  KP.onFeedEvent('trendNamed', (state, n, rng) => {
    const c = KP.conceptById(n.lane);
    const label = c ? c.label.toLowerCase() : 'that sound';
    return rng.pick([
      { persona: 'critic', text: 'the trades have declared this the year of ' + label + '. every A&R department in the city just forwarded the article to a producer who was already doing it' },
      { persona: 'casual', text: label + ' is the sound of the year apparently. I was told this last year too about a different sound. anyway the songs are fine' },
      n.kept
        ? { persona: 'stan', text: label + ' AGAIN. the trades are not even pretending to try. give us a year of something else, cowards' }
        : { persona: 'fan', text: 'new year, new sound: ' + label + '. the comebacks already locked in the old lane are about to find out how fast the wind changes' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
