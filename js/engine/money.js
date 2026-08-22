/* The settlement (v0.10.1, §80 findings 2+7+14) — jeongsan, the
   quarterly books, and the distributor. Idols see no pay until the
   label recoups its investment: every era's bills and the practice
   years accrue to a per-group debt the group's contract share pays
   down — the quarter it crosses zero is FIRST SETTLEMENT, a meeting
   where you slide the statements across the table and decide what
   kind of label this is. The books close quarterly: revenue by
   stream, the rest bucketed honestly as operations, and three
   loss-making eras in a row put the hard question on the desk. And
   somebody else puts the record in stores: the distributor's cut and
   reach shape every physical won, the starter deal is one more brick
   in the obscurity wall, and a real chodong history earns the
   courting call. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // ---- the stream ledger (the books' raw material) ---------------------
  function books(state) {
    state.books = state.books ||
      { cur: {}, curStartBudget: state.budget, last: null, closed: 0 };
    return state.books;
  }
  KP.ledgerFlow = function (state, stream, amount) {
    const b = books(state);
    b.cur[stream] = (b.cur[stream] || 0) + amount;
  };

  // ---- jeongsan: the recoup ledger -------------------------------------
  KP.accrueDebt = function (state, g, amount) {
    g.recoup = g.recoup || { debt: 0, paid: 0, settledWeek: null };
    g.recoup.debt += amount;
    g.eraSpend = (g.eraSpend || 0) + amount;
  };
  // Called at every group-attributed revenue event (releases, tours).
  // Pre-settlement the label keeps the cash and the debt shrinks on
  // paper; post-settlement the share is PAID — real money leaves.
  KP.settleShare = function (state, g, amount) {
    const S = KP.C.SETTLE;
    if (!g.recoup || amount <= 0) return null;
    const share = Math.round(amount * S.groupShare);
    if (share <= 0) return null;
    if (g.recoup.settledWeek == null) {
      g.recoup.debt -= share;
      if (g.recoup.debt <= 0 &&
          !(state.scenes || []).some(sc => sc.kind === 'firstSettlement' && sc.groupId === g.id)) {
        KP.openScene(state, { kind: 'firstSettlement', groupId: g.id,
          expiresWeek: state.week + 3 });
        return { kind: 'company', ind: 'settlementDue', priority: 'high', groupId: g.id,
          text: g.name + '’s ledger crossed zero this week: every won the company put into ' +
            'the practice years and the eras has been recouped. The first settlement meeting ' +
            'is on the Desk — the statements, the members, and the question of what kind of ' +
            'label this is.' };
      }
      return null;
    }
    state.budget -= share;
    g.recoup.paid += share;
    KP.ledgerFlow(state, 'artistPay', -share);
    (g.members || []).forEach(id => {
      const m = state.people[id];
      if (m) m.morale = KP.clamp(m.morale + S.paidMorale, 0, 100);
    });
    return null;
  };

  KP.registerScene('firstSettlement', {
    title: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      return (g ? g.name : 'The group') + ' · first settlement';
    },
    body: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      return 'The statements are printed and the room is quiet in the specific way of people ' +
        'who have waited years for a meeting. ' + (g ? g.name : 'The group') +
        ' has paid back everything: the practice years, the productions, the pressings. From ' +
        'this day their share is THEIRS. The only question left is how the first check reads — ' +
        'and they will remember the answer longer than any stage.';
    },
    options: () => [
      { id: 'fair', label: 'Pay it warm — with backpay' },
      { id: 'lean', label: 'Pay it to the letter' },
    ],
    resolve: (state, sc, optionId) => {
      const g = KP.groupById(state, sc.groupId);
      if (!g || !g.recoup) return { toast: 'The moment passed.' };
      const S = KP.C.SETTLE;
      g.recoup.settledWeek = state.week;
      g.recoup.debt = 0;
      const members = (g.members || []).map(id => state.people[id]).filter(Boolean);
      KP.recordEvidence(state, 'firstSettlement', 'group', g.id);
      if (optionId === 'fair') {
        state.budget -= S.backpay;
        KP.ledgerFlow(state, 'artistPay', -S.backpay);
        members.forEach(m => {
          m.morale = KP.clamp(m.morale + S.fairMorale, 0, 100);
          m.history.push({ week: state.week, text: 'FIRST SETTLEMENT — with backpay. The label did not have to. That is the point. The screenshot of the deposit is framed in the group chat forever.' });
        });
        return { toast: 'Paid warm. Somebody cried in the meeting and it was not entirely the members. This is the story they will tell in every anniversary interview.' };
      }
      members.forEach(m => {
        m.morale = KP.clamp(m.morale + S.leanMorale, 0, 100);
        KP.recordDirected(state, m.id, 'leanSettlement', -1);
        m.history.push({ week: state.week, text: 'First settlement — to the letter of the contract, not a won past it. Paid, noted, remembered.' });
      });
      return { toast: 'Paid to the letter. Legal is satisfied. The room said thank you in the tone of people updating a spreadsheet about you.' };
    },
    expire: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      if (!g || !g.recoup) return null;
      g.recoup.settledWeek = state.week;
      g.recoup.debt = 0;
      (g.members || []).map(id => state.people[id]).filter(Boolean).forEach(m => {
        KP.recordDirected(state, m.id, 'leanSettlement', -1);
        m.history.push({ week: state.week, text: 'The ledger crossed zero and the company never even held the meeting. The deposits started arriving with no note attached. Read into that exactly what everyone did.' });
      });
      return { kind: 'company', ind: 'settlementQuiet', priority: 'high', groupId: g.id,
        text: 'The ' + g.name + ' settlement began without a meeting — the deposits just started. Money talks; silence also talks, and the members heard both.' };
    },
  });

  // ---- the distributor -------------------------------------------------
  KP.distributorOf = function (state) {
    if (!state.distributor) {
      const D = KP.C.DIST;
      const fame = KP.fameRead ? KP.fameRead(state) : 0.5;
      const tier = fame < D.fameTier[0] ? 0 : fame < D.fameTier[1] ? 1 : 2;
      state.distributor = { tier, advanceOwed: 0, bestChodong: 0 };
    }
    return state.distributor;
  };
  KP.distCut = function (state) {
    const d = KP.distributorOf(state);
    const T = KP.C.DIST.TIERS[d.tier];
    return (1 - T.cut) * T.reach;
  };
  KP.repayAdvance = function (state, product) {
    const d = KP.distributorOf(state);
    if (!d.advanceOwed || !product || !product.physRev) return null;
    const pay = Math.min(d.advanceOwed,
      Math.round(product.physRev * KP.C.DIST.advanceRepayShare));
    if (pay <= 0) return null;
    state.budget -= pay;
    d.advanceOwed -= pay;
    KP.ledgerFlow(state, 'distributor', -pay);
    if (d.advanceOwed <= 0) {
      d.advanceOwed = 0;
      return { kind: 'company', ind: 'advanceClear', priority: 'flavor',
        text: 'The distribution advance is repaid — the physical revenue is whole again. The books breathe.' };
    }
    return null;
  };
  KP.acceptDistributor = function (state, withAdvance) {
    const d = KP.distributorOf(state);
    const D = KP.C.DIST;
    if (d.tier >= D.TIERS.length - 1) return { ok: false, reason: 'There is no bigger desk to sign with.' };
    d.tier++;
    if (withAdvance) {
      state.budget += D.advance;
      d.advanceOwed = Math.round(D.advance * D.advanceVig);
      KP.ledgerFlow(state, 'distributor', D.advance);
    }
    return { ok: true, tier: D.TIERS[d.tier] };
  };
  KP.registerScene('distributorCall', {
    title: (state, sc) => 'The distributor · the courting call',
    body: (state, sc) => {
      const D = KP.C.DIST;
      const next = D.TIERS[KP.distributorOf(state).tier + 1];
      return 'The chodong history did the talking: ' + (next ? next.label : 'a bigger desk') +
        ' wants this label’s physicals. A thinner cut, real retail reach — and their leverage ' +
        'in your cap table of favors. They will also front an advance against future sales, ' +
        'at their arithmetic, if the war chest is thin. Distribution is plumbing until you ' +
        'need it. Then it is everything.';
    },
    options: (state, sc) => {
      const opts = [
        { id: 'accept', label: 'Sign the better deal' },
        { id: 'advance', label: 'Sign — and take the advance' },
        { id: 'stay', label: 'Stay where we are known' },
      ];
      return opts;
    },
    resolve: (state, sc, optionId) => {
      if (optionId === 'stay') {
        return { toast: 'You stayed. The small desk sent a fruit basket. The big desk will call again if the numbers keep talking.' };
      }
      const r = KP.acceptDistributor(state, optionId === 'advance');
      if (!r.ok) return { toast: r.reason };
      return { toast: 'Signed with ' + r.tier.label + ' — thinner cut, longer reach' +
        (optionId === 'advance' ? ', and the advance lands this week. It repays itself out of every pressing until it doesn’t hurt anymore.' : '.') };
    },
    expire: () => null,
  });

  // ---- the quarterly close + red ink + the grind -----------------------
  const STREAM_LABELS = [
    ['albums', 'Album sales'], ['streams', 'Streaming & digital'],
    ['tours', 'Touring'], ['deals', 'Brand deals'],
    ['appearances', 'Appearances & gigs'], ['distributor', 'Distribution'],
    ['production', 'Production & pressing'], ['marketing', 'Marketing'],
    ['signings', 'Signings & scouting'], ['artistPay', 'Artist settlement'],
    ['commerce', 'Fandom commerce'], ['catalog', 'Catalog royalties'],
    ['japan', 'Japan cycle'],
    ['trainees', 'Practice rooms & stipends'],
  ];
  KP.lastStatement = function (state) { return (state.books || {}).last || null; };
  KP.registerWeekly('books', 758, function (state, rng, inbox) {
    const b = books(state);
    const S = KP.C.SETTLE;
    // the grind: years unsettled after debut is a grievance the
    // directed ledger renews annually
    KP.groups(state).forEach(g => {
      if (!g.debuted || g.retiredWeek || !g.recoup || g.recoup.settledWeek != null) return;
      const age = state.week - (g.debutWeek || g.formedWeek);
      if (age >= S.grindAt && (age - S.grindAt) % S.grindEvery === 0) {
        (g.members || []).map(id => state.people[id]).filter(Boolean).forEach(m => {
          KP.recordDirected(state, m.id, 'neverPaid', -1);
        });
        inbox.push({ kind: 'company', ind: 'neverPaid', priority: 'high', groupId: g.id,
          text: 'Another year, and ' + g.name + ' has still never been settled — the eras keep ' +
            'coming, the ledger keeps not crossing zero, and the members do the same arithmetic ' +
            'at every schedule: working constantly, paid never. This is the number-one reason ' +
            'renewal tables go cold.' });
      }
    });
    // the distributor courts a chodong history
    const d = KP.distributorOf(state);
    KP.groups(state).forEach(g => { if ((g.lastChodong || 0) > d.bestChodong) d.bestChodong = g.lastChodong; });
    const D = KP.C.DIST;
    const next = D.TIERS[d.tier + 1];
    if (next && d.bestChodong >= next.bar &&
        !(state.scenes || []).some(sc => sc.kind === 'distributorCall')) {
      KP.openScene(state, { kind: 'distributorCall', expiresWeek: state.week + 3 });
      inbox.push({ kind: 'company', ind: 'distCourted', priority: 'high',
        text: 'The courting call: a first-week number like this label’s does not stay a secret in ' +
          'distribution. ' + next.label.charAt(0).toUpperCase() + next.label.slice(1) +
          ' wants the account. The table is on the Desk.' });
    }
    // the quarter closes
    const woy = ((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1;
    if (woy % KP.C.BOOKS.quarterWeeks === 0 && state.week > 4) {
      const net = Math.round(state.budget - b.curStartBudget);
      const tracked = Object.values(b.cur).reduce((s2, v) => s2 + v, 0);
      const other = Math.round(net - tracked);
      const lines = STREAM_LABELS
        .filter(([k]) => Math.round(b.cur[k] || 0) !== 0)
        .map(([k, label]) => label + ': ' + (b.cur[k] > 0 ? '+' : '') + Math.round(b.cur[k]));
      b.last = { quarter: Math.ceil(woy / KP.C.BOOKS.quarterWeeks),
        year: Math.ceil(state.week / KP.C.WEEKS_PER_YEAR),
        lines, other, net, week: state.week };
      b.closed++;
      inbox.push({ kind: 'company', ind: 'quarterlyBooks', priority: 'high',
        text: 'Q' + b.last.quarter + ' statement: ' + (lines.length ? lines.join(' · ') : 'a quiet quarter') +
          ' · Operations & payroll: ' + (other > 0 ? '+' : '') + other +
          ' · NET: ' + (net > 0 ? '+' : '') + net + '. ' +
          (net >= 0 ? 'The executive initials the page without comment, which is executive for “good.”'
            : 'The executive circles the net in red pen and leaves it on your desk, which is executive for a whole conversation.') });
      b.cur = {};
      b.curStartBudget = state.budget;
    }
    // red ink: three loss-making eras in a row puts the question on the desk
    KP.groups(state).forEach(g => {
      if ((g.redEras || 0) >= KP.C.BOOKS.redErasAt && !g.redTalkDone &&
          !(state.scenes || []).some(sc => sc.kind === 'redInk' && sc.groupId === g.id)) {
        KP.openScene(state, { kind: 'redInk', groupId: g.id, expiresWeek: state.week + 3 });
        inbox.push({ kind: 'company', ind: 'redInk', priority: 'high', groupId: g.id,
          text: g.name + ' has now lost money three eras running — the books say so in the ' +
            'flattest possible font. The hard conversation is on the Desk. Every label has ' +
            'this meeting eventually; the good ones have it on purpose.' });
      }
    });
  });
  KP.registerScene('redInk', {
    title: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      return (g ? g.name : 'The group') + ' · the red ledger';
    },
    body: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      return 'Three eras, three losses. The act is real, the fans are real, and the math is ' +
        'also real. Nobody in this room is saying the word that starts with D — but everybody ' +
        'brought a version of this meeting in their bag. What kind of label is this?';
    },
    options: () => [
      { id: 'backThem', label: 'Back them — money follows belief' },
      { id: 'tighten', label: 'Tighten the next era’s belt' },
    ],
    resolve: (state, sc, optionId) => {
      const g = KP.groupById(state, sc.groupId);
      if (!g) return { toast: 'The moment passed.' };
      g.redTalkDone = true;
      if (optionId === 'backThem') {
        state.trust = KP.clamp(state.trust - 2, 0, 100);
        (g.members || []).map(id => state.people[id]).filter(Boolean).forEach(m => {
          m.morale = KP.clamp(m.morale + 4, 0, 100);
        });
        return { toast: 'You backed them, on the record, with the books open on the table. The executive noted the trust withdrawal. The members noted something that outlasts trust.' };
      }
      g.tightBelt = true;
      (g.members || []).map(id => state.people[id]).filter(Boolean).forEach(m => {
        m.morale = KP.clamp(m.morale - 3, 0, 100);
      });
      return { toast: 'The next era ships on a tighter budget — smaller bills, and everyone in the room understood what was not said. The books will thank you. The room may not.' };
    },
    expire: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      if (g) g.redTalkDone = true;
      return null;
    },
  });

  // ---- the timeline reads the money ------------------------------------
  KP.onFeedEvent('settlementDue', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'the group is reportedly at settlement. YEARS of "we work hard for you" posts and now the deposits are real. crying in fan and in accountant' },
    { persona: 'press', text: 'A group reaching first settlement is the most under-covered milestone in this industry — the moment the career becomes a job that pays.' },
    { persona: 'casual', text: 'til that idols don’t get paid until the company recoups everything. the debut you cheered was years of debt with choreography' },
  ]));
  KP.onFeedEvent('neverPaid', (state, n, rng) => rng.pick([
    { persona: 'press', text: 'Another year, another group working a full calendar without reaching settlement. The industry files this under "standard practice," which is precisely the problem.' },
    { persona: 'fan', text: 'our kids have three eras and a tour and reportedly still no settlement. streaming harder won’t fix a ledger but here I am, streaming harder' },
    { persona: 'casual', text: 'the phrase "pre-settlement idol" should be taught in schools. imagine four years at a job where payday is a rumor' },
  ]));
  KP.onFeedEvent('quarterlyBooks', (state, n, rng) => rng.chance(0.35) ? rng.pick([
    { persona: 'casual', text: 'small label quarterly earnings szn. somewhere a CEO is explaining a warehouse line item to a board with a fruit plate between them' },
    { persona: 'press', text: 'Quarterly statements are where the industry’s stories go to be audited. The chodong brags meet the operations line, and only one of them is wearing makeup.' },
  ]) : null);
  KP.onFeedEvent('distCourted', (state, n, rng) => rng.pick([
    { persona: 'press', text: 'A bigger distributor courting a small label is the quiet promotion the charts never show — reach is the product nobody streams.' },
    { persona: 'fan', text: 'the label upgraded distribution which means the album might actually BE IN STORES this era. growth is buying it without a proxy service' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
