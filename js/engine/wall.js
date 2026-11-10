/* The other side of the wall (§96 recommendation 6): rivals as people.

   Part one, the head (v0.11.22, §113). A signing house was a name, a
   philosophy and a prestige number. It has a head now: a person with a
   name and a temper, stamped once and kept. The card says who runs the
   house and what that means, and the trades' yearly ranking quotes one
   head, in that head's own way of talking.

   The stamp never draws from the main stream. A head's name comes from a
   private stream keyed by the seed and the house; the temper is a hash in
   the schools' pattern (§84). So no career moves, and a house's head is
   the same in every fork of a save.

   Later parts read the temper: the ledger each house keeps on us, the
   call a head makes, the seat in play, the press. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    const led = state.wallLedger = state.wallLedger || {};
    ['heads', 'quotes', 'acts'].forEach(k => { if (led[k] == null) led[k] = 0; });
    if (!led.kinds) led.kinds = {};
    return led;
  }
  KP.wallLedger = ledger;

  // ---- the tempers --------------------------------------------------------------
  // Who the head is when another house is in the room. Words only, in this
  // part; the parts after it weigh them.
  const TEMPERS = ['duelist', 'broker', 'steward', 'showman'];
  const TEMPER_PROSE = {
    duelist: 'takes a shared release week as a personal remark',
    broker: 'believes every problem is a trade nobody has priced yet',
    steward: 'runs the house like a trust and returns calls on Thursdays',
    showman: 'has never met a microphone that was not meant for {her}',
  };
  KP.HEAD_TEMPERS = TEMPERS.slice();
  KP.headTemperProse = function (head) {
    return head && TEMPER_PROSE[head.temper] ? KP.fillPro(TEMPER_PROSE[head.temper], { gender: head.g }) : '';
  };

  // ---- the stamp ----------------------------------------------------------------
  // The name comes from a private stream; a name another head or our own
  // executive already carries is drawn again, up to a dozen times.
  const bare = name => String(name || '').replace(/^(CEO|Chairman|Chairwoman|President|Director)\s+/, '');
  function takenNames(state) {
    const taken = new Set();
    KP.signingHouses(state).forEach(r => { if (r.head) taken.add(r.head.name); });
    if (state.executive && state.executive.name) taken.add(bare(state.executive.name));
    return taken;
  }
  function mint(state, r, taken) {
    const temper = TEMPERS[Math.floor(KP.hash01([state.seed, r.short, 'temper'].join('|')) * TEMPERS.length)];
    let name = '', g = 'f';
    for (let k = 0; k < 12; k++) {
      const prng = new KP.Rng([state.seed, r.short, 'head', k].join('|'));
      g = prng.chance(0.5) ? 'f' : 'm';
      name = prng.pick(KP.DATA.familyNames) + ' ' + KP.genGivenName(prng, null, g);
      if (!taken.has(name)) break;
    }
    return { name, g, temper, since: state.week };
  }
  // every signing house without a head gets one; the broadcaster's project
  // house is a show, not a house, and has none
  KP.stampHeads = function (state) {
    let n = 0;
    KP.signingHouses(state).forEach(r => {
      if (r.head) return;
      r.head = mint(state, r, takenNames(state));
      n++;
    });
    if (n) ledger(state).heads += n;
    return n;
  };
  // the read (pure): the stamped head, or the one the stamp will give a
  // house founded since the last tick. It writes nothing, so a screen can ask.
  KP.rivalHead = function (state, r) {
    if (!r || r.projectHouse) return null;
    return r.head || mint(state, r, takenNames(state));
  };

  // ---- the head speaks: one quote a year, in the trades' ranking -----------------
  // {N} the head, {CO} the head's house, {US} our house; pronouns are the head's.
  const QUOTES = {
    duelist: {
      tookTop: [
        '{CO}’s {N} was asked how the seat felt and said: “Ask whoever was sitting here last year.”',
        '{N} of {CO} took the question standing: “We did not arrive. We were always coming.”',
      ],
      lostTop: [
        '{N} of {CO} gave the trades one sentence about losing the seat: “Print it in pencil.”',
        '{CO}’s {N} did not congratulate anyone. “A ranking is a photograph,” {she} said. “I am told they fade.”',
      ],
      heldTop: [
        '{N} of {CO}, asked about another year in the seat: “Somebody has to keep it warm for the people who talk about taking it.”',
        '{CO}’s {N} was shown the list and found {US} on it. “Good,” {she} said. “I like to know where everyone is.”',
      ],
      aboveUs: [
        '{N} of {CO}, one rung above {US}, was asked about the gap: “It is the right size. I measured.”',
        '{CO}’s {N} on the house just below {pos} own: “I have heard of {US}. I hear of everyone eventually.”',
      ],
      chasing: [
        '{N} of {CO}, second on the list, kept it short: “Enjoy the view. It comes with a clock.”',
        '{CO}’s {N} was asked about {US} at the top and said {she} did not comment on temporary arrangements.',
      ],
    },
    broker: {
      tookTop: [
        '{CO}’s {N} called the seat “an asset we acquired at a fair price”, and thanked three partners by name.',
        '{N} of {CO} on taking the top: “Everyone in this scene has a number. Ours went up.”',
      ],
      lostTop: [
        '{N} of {CO} was relaxed about the seat: “Positions are inventory. You do not cry over it, you restock.”',
        '{CO}’s {N} told the trades the year had been “a correction”, and that {she} buys in corrections.',
      ],
      heldTop: [
        '{N} of {CO}, first again: “We are open to conversations. We usually are, from up here.”',
        '{CO}’s {N} said holding the seat was cheaper than taking it had been, and left it there.',
      ],
      aboveUs: [
        '{N} of {CO}, a rung above {US}: “They are close enough to talk to. My door is a door.”',
        '{CO}’s {N} described {US} as “a house with something to trade and no idea yet what it is worth”.',
      ],
      chasing: [
        '{N} of {CO}, second: “There is a version of next year where we and {US} are both happy. I have priced it.”',
        '{CO}’s {N} said second place was “a negotiating position”, and smiled the way people do when they mean it.',
      ],
    },
    steward: {
      tookTop: [
        '{CO}’s {N} did not take questions. The statement was two lines and thanked the trainees’ parents first.',
        '{N} of {CO} on the top seat: “We did the same work as last year. The list moved, not us.”',
      ],
      lostTop: [
        '{N} of {CO} sent the new number one a plant, with a card that read “Water it.” That was the whole comment.',
        '{CO}’s {N} said the house had been here before the ranking and would be here after it.',
      ],
      heldTop: [
        '{N} of {CO}, first for another year, said only that the practice rooms open at seven, as they always have.',
        '{CO}’s {N} declined the cover and sent the vocal coaches to be photographed instead.',
      ],
      aboveUs: [
        '{N} of {CO}, just above {US}, spoke well of the house below: “They train properly. It shows up late, and then it shows up.”',
        '{CO}’s {N} said {she} does not read the rungs beneath {her}, and then named two of {US}’s trainees correctly.',
      ],
      chasing: [
        '{N} of {CO}, second, was patient about it: “A seat like that is held, not owned. We will be here.”',
        '{CO}’s {N} congratulated {US} in one line and went back to a rehearsal that was, by all accounts, more interesting to {her}.',
      ],
    },
    showman: {
      tookTop: [
        '{CO}’s {N} took the call on speaker, in front of the staff, and let them answer it by cheering.',
        '{N} of {CO} arrived at the trades’ photo shoot with a chair of {pos} own. “I brought the seat,” {she} said. “I was told it was mine.”',
      ],
      lostTop: [
        '{N} of {CO} gave the longest quote in the piece, about momentum, and none of it was about the ranking.',
        '{CO}’s {N} called second place “the better story” and booked a press conference to tell it.',
      ],
      heldTop: [
        '{N} of {CO}, first again, asked the trades to use last year’s photo: “I liked the lighting, and nothing has changed.”',
        '{CO}’s {N} marked another year in the seat with a banner on the building. The banner can be read from {US}’s practice rooms.',
      ],
      aboveUs: [
        '{N} of {CO}, one place above {US}, waved at the question: “Tell them the weather is lovely up here.”',
        '{CO}’s {N} said {she} was “flattered to be chased”, and then asked which house was doing the chasing.',
      ],
      chasing: [
        '{N} of {CO}, second, promised “a year the trades will need a bigger font for”.',
        '{CO}’s {N} posted a photo of the list with one name circled. It was not {US}’s.',
      ],
    },
  };
  KP.HEAD_QUOTES = QUOTES;

  // Whose year it was, and how: the house that took the seat, the house
  // that lost it to us, the house chasing us from second, or the house one
  // rung above us (which holds the top if that rung is the first).
  KP.rankingStory = function (state, rows, prev) {
    const top = rows[0], me = rows.find(r => r.isPlayer);
    if (!top || !me) return null;
    const prevTop = prev && prev.entries && prev.entries[0];
    const houseOf = row => row ? KP.signingHouses(state).find(r => r.short === row.short) || null : null;
    let who = null, sit = null;
    if (prevTop && prevTop.short !== top.short) {
      if (!top.isPlayer) { who = houseOf(top); sit = 'tookTop'; }
      else { who = houseOf(rows.find(r => r.short === prevTop.short)); sit = 'lostTop'; }
    }
    if (!who && top.isPlayer) { who = houseOf(rows[1]); sit = 'chasing'; }
    if (!who && !top.isPlayer) {
      const above = rows[me.rank - 2];
      who = houseOf(above);
      sit = above && above.rank === 1 ? 'heldTop' : 'aboveUs';
    }
    return who ? { house: who, sit } : null;
  };
  // the sentence (pure): which line, and its words
  KP.headQuoteText = function (state, house, sit, last) {
    const head = KP.rivalHead(state, house);
    const fam = head && QUOTES[head.temper] && QUOTES[head.temper][sit];
    if (!fam) return null;
    const line = KP.lineFor(state, 'headQuote|' + house.short + '|' + sit, fam, last);
    return { i: fam.indexOf(line), text: KP.fillPro(line.split('{N}').join(head.name).split('{CO}').join(house.short).split('{US}').join(state.company.short), { gender: head.g }) };
  };
  // the ranking calls this once a year: it says the quote and remembers it,
  // so the same house in the same seat is not given the same line twice running
  KP.rankingQuote = function (state, rows, prev) {
    const story = KP.rankingStory(state, rows, prev);
    if (!story) return null;
    const led = ledger(state);
    const key = story.house.short + '|' + story.sit;
    const q = KP.headQuoteText(state, story.house, story.sit, led.last && led.last.key === key ? led.last.i : null);
    if (!q) return null;
    led.quotes++;
    led.last = { key, i: q.i };
    const head = KP.rivalHead(state, story.house);
    return { short: story.house.short, head: head.name, temper: head.temper, sit: story.sit, text: q.text };
  };

  // ==== part two: the ledger (v0.11.23, §114) =========================================
  // What lies between this house and one across the street. An act is
  // recorded where the game already decides it: the head-to-head week, the
  // date they parked on, the lead they took, the castoff we signed, the
  // one who left us and signed there, the offer and what we did with it,
  // the pact we passed on, the walkout that made the old house a rival.
  // One table weighs them (KP.C.WALL.KINDS); a call site names the kind
  // and nothing else, and an unknown kind throws. A house that no longer
  // stands records nothing.
  KP.recordHouse = function (state, short, kind, week) {
    const W = KP.C.WALL;
    if (!W.KINDS[kind]) throw new Error('wall: unknown house act "' + kind + '"');
    const r = KP.signingHouses(state).find(x => x.short === short);
    if (!r) return null;
    r.directed = r.directed || [];
    const act = { week: week != null ? week : state.week, kind };
    r.directed.push(act);
    // of one kind the oldest goes first, then the oldest of all; an act
    // the table keeps (the walkout) is never the one to go
    const same = r.directed.filter(a => a.kind === kind);
    if (same.length > W.perKind) r.directed.splice(r.directed.indexOf(same[0]), 1);
    while (r.directed.length > W.cap) {
      const i = r.directed.findIndex(a => !(W.KINDS[a.kind] || {}).keep);
      r.directed.splice(i < 0 ? 0 : i, 1);
    }
    const led = ledger(state);
    led.acts++;
    led.kinds[kind] = (led.kinds[kind] || 0) + 1;
    return act;
  };
  // the read (pure): their regard for us, decayed, in a number and a word;
  // what they hold against us, undecayed; and the acts, newest first
  KP.houseRead = function (state, r) {
    const W = KP.C.WALL;
    const acts = ((r && r.directed) || []).filter(a => W.KINDS[a.kind]);
    let standing = 0, grudge = 0;
    acts.forEach(a => {
      const w = W.KINDS[a.kind].w;
      standing += w * Math.pow(0.5, Math.max(0, state.week - a.week) / W.halfLifeWeeks);
      if (w < 0) grudge += -w;
    });
    const word = acts.length ? (W.WORDS.find(row => standing >= row[0]) || W.WORDS[W.WORDS.length - 1])[1] : null;
    return { standing, grudge, word, count: acts.length,
      acts: acts.slice().reverse().map(a => ({ week: a.week, kind: a.kind, w: W.KINDS[a.kind].w, words: W.KINDS[a.kind].words })) };
  };
  // the card's sentence: how the head regards us, and the three latest
  // acts with their weeks. A house with nothing on the books says nothing.
  KP.houseLedgerWords = function (state, r) {
    const read = KP.houseRead(state, r);
    if (!read.count) return '';
    const head = KP.rivalHead(state, r);
    const shown = read.acts.slice(0, 3).map(a => a.words + ' (' + KP.weekLabel(a.week).text + ')');
    return (head ? head.name : r.short) + ' is ' + read.word + '. On the books: ' + shown.join('; ') +
      (read.count > 3 ? '; and ' + (read.count - 3) + ' more' : '') + '.';
  };

  // ---- the weekly: a house founded since the last tick gets its head -------------
  // before the ranking (562), so a house a week old can be quoted
  KP.registerWeekly('wall', 560, function (state) {
    KP.stampHeads(state);
  });
})(typeof window !== 'undefined' ? window : globalThis);
