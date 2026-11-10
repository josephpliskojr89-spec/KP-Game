/* Across the street (v0.11.12, §103). "A departed idol's file stays open
   forever": it did, and nothing was ever written in it again. She has a
   next chapter now, on a clock of her own. Another house signs her as a
   soloist and she debuts there, on the chart, against the company she
   left; or she builds a life outside the industry, and the file says
   which. How she left decides the tone of both letters, and the tone has
   one small consequence.

   She stays 'departed' between the signing and the debut: a rival's floor
   is cast into rookie groups and culled by age, and she is neither. The
   week her record lands she is a rival act of one, and the machinery that
   carries every rival act carries her.

   The main stream is never drawn from. Every pick here is a hash, and her
   debut record is made on an rng of its own, keyed by her file. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  KP.acrossLedger = function (state) {
    state.acrossLedger = state.acrossLedger || { clocked: 0, signed: 0, debuted: 0, lives: 0, fell: 0,
      bow: 0, plain: 0, released: 0, sudden: 0, cold: 0, friends: 0, ended: 0 };
    // the solo runs that ended (v0.11.15): a field added post-ship, healed lazily
    if (state.acrossLedger.ended == null) state.acrossLedger.ended = 0;
    return state.acrossLedger;
  };

  const h = (state, p, salt) => KP.hash01([state.seed, p.id, 'across', salt].join('|'));
  const when = w => KP.weekLabel(w).text;
  // the chapter that made her an alumna of this company
  const leftCh = (state, p) => (p.chapters || []).slice().reverse().find(ch => ch.kind === 'departed' && ch.co === state.company.short) || null;
  KP.isAlum = function (state, p) { return !!p && (p.status === 'departed' || !!leftCh(state, p)) && p.status !== 'idol' && p.status !== 'trainee'; };
  // every artist who was ours and is not now, most recent first
  KP.alumniOf = function (state) {
    return Object.values(state.people).filter(p => KP.isAlum(state, p))
      .sort((a, b) => ((b.flags || {}).departedWeek || 0) - ((a.flags || {}).departedWeek || 0) || (a.id < b.id ? -1 : 1));
  };
  // how she left: stamped at the exit from this build on, read back off the
  // file for anyone who left before it
  KP.exitShape = function (state, p) {
    const f = p.flags || {};
    if (f.departShape) return f.departShape;
    const ch = leftCh(state, p) || {};
    if (ch.how === 'released') return 'released';
    if (ch.mode === 'cold' || f.departMode === 'cold') return 'cold';
    return p.contract && p.contract.farewellEra ? 'bow' : 'plain';
  };
  const fameOf = (state, p) => Math.min(4, Math.floor(KP.socialOf(state, p) / 150000));
  // the act she left, if it is still on the books in any state
  function oldAct(state, p) {
    const ch = leftCh(state, p);
    return ch && ch.group ? KP.groups(state).find(g => g.name === ch.group) || null : null;
  }
  const living = g => !!g && !g.retiredWeek && g.members.length > 0;

  // ---- a life outside the industry -------------------------------------------
  // picked by what she was best at, then by hash inside that. Words on a
  // file: nothing here moves a number.
  const LIVES = {
    dance: ['opened a dance studio two stops from the old practice room', 'choreographs for other people’s debuts now, uncredited and booked solid'],
    vocals: ['teaches voice at an academy, and is said to be terrifying about breathing', 'sings on other people’s demos, and is the reason several of them got bought'],
    rap: ['writes for other people’s records under a name nobody has connected yet', 'runs a small studio where rookies cut their first verses'],
    visuals: ['signed with an acting agency and has a second lead in a weekday drama', 'models for the brands that used to send flowers'],
    charisma: ['took a late-night radio slot and kept it', 'hosts a variety segment that was meant to run a month and is in its second year'],
  };
  const QUIET = ['went back to school, on a schedule nobody else writes', 'went home, and by every account sleeps eight hours'];
  function lifeOf(state, p) {
    const T = p.talents || {};
    const best = ['dance', 'vocals', 'rap', 'visuals', 'charisma'].map(k => ({ k, v: (T[k] || {}).cur || 0 })).sort((a, b) => b.v - a.v || (a.k < b.k ? -1 : 1))[0];
    const pool = (h(state, p, 'quiet') < 0.25 || !best) ? QUIET : LIVES[best.k];
    return pool[Math.floor(h(state, p, 'life') * pool.length)];
  }
  function afterLife(state, p, inbox, fell) {
    const L = KP.acrossLedger(state);
    const what = lifeOf(state, p);
    const act = oldAct(state, p);
    p.flags.after = { week: state.week, what };
    delete p.flags.across;
    KP.chapter(state, p, 'after', { what: what.replace(/^./, c => c.toUpperCase()) });
    p.history.push({ week: state.week, text: KP.fillPro((fell ? 'The solo deal fell through when the house that offered it stopped existing. ' : '') +
      what.replace(/^./, c => c.toUpperCase()) + '. The stage years are a chapter {she} talks about kindly.', p) });
    L.lives++;
    if (fell) L.fell++;
    // high since v0.11.15 (it shipped normal): this is the one letter that
    // closes an artist's file, and the week's budget of five kept it three
    // times in five (measured over the soak's long careers; the signing and
    // the debut, both high, landed fifteen times in fifteen). A one-shot
    // about a person is not what a busy week should cut.
    inbox.push({ kind: 'company', ind: 'alumAfter', priority: 'high', personId: p.id,
      text: KP.fillPro('Word from outside the building: ' + KP.displayName(p) + (act ? ', formerly of ' + act.name + ',' : '') + ' ' + what +
        (fell ? ', after the solo deal {she} had signed went down with the house that offered it' : '') +
        '. Nobody here was asked, and nobody needed to be. The file stays open; it just has a later page in it now.', p) });
  }

  // ---- the signing ------------------------------------------------------------
  const SIGNED = {
    bow: ' The announcement thanks ' + '{CO}' + ' by name, twice, and uses a photo from {pos} last stage there.',
    plain: ' The announcement is cordial, brief, and wishes everyone at ' + '{CO}' + ' well.',
    released: ' The announcement says “a fresh start” and not one word more about the last one.',
    sudden: ' The announcement says {she} is looking forward to “being able to say hello and goodbye properly this time”, and the old fan cafés are quoting that line at each other.',
    cold: ' The announcement does not mention ' + '{CO}' + '. The comment section does, at length.',
  };
  function pickHouse(state, p) {
    const A = KP.C.ACROSS;
    const all = KP.signingHouses(state).slice().sort((a, b) => (b.prestige || 0) - (a.prestige || 0) || (a.short < b.short ? -1 : 1));
    if (!all.length) return null;
    const pool = fameOf(state, p) >= A.starFame ? all.slice(0, Math.max(1, Math.ceil(all.length / 2))) : all;
    return pool[Math.floor(h(state, p, 'where') * pool.length)];
  }
  function sign(state, p, r, inbox) {
    const A = KP.C.ACROSS, L = KP.acrossLedger(state);
    const co = state.company.short;
    const shape = KP.exitShape(state, p);
    const act = oldAct(state, p);
    const away = state.week - (p.flags.departedWeek != null ? p.flags.departedWeek : state.week);
    p.flags.across = { company: r.short, week: state.week,
      debutAt: state.week + A.debutMin + Math.floor(h(state, p, 'debut') * (A.debutMax - A.debutMin + 1)) };
    KP.chapter(state, p, 'signed', { co: r.short, how: 'solo' });
    p.history.push({ week: state.week, text: 'Signed with ' + r.short + ' as a soloist, ' + away + ' weeks after leaving ' + co + '.' });
    L.signed++;
    L[shape] = (L[shape] || 0) + 1;
    // what the tone costs, or gives
    let tail = '';
    if (shape === 'bow') {
      state.trust = KP.clamp(state.trust + A.trustBow, 0, 100);
      tail = ' ' + state.executive.name + ' had it forwarded upstairs: a former artist thanking the house by name is the cheapest advertising it will ever get.';
    } else if (shape === 'cold') {
      state.trust = KP.clamp(state.trust + A.trustCold, 0, 100);
      tail = ' ' + state.executive.name + ' read it and asked one question: why is {she} making money for somebody else.';
    }
    const broken = (p.directed || []).some(d => d.kind === 'promiseBroken');
    if ((shape === 'sudden' || broken) && living(act)) {
      act.fandomGrudge = (act.fandomGrudge || 0) + A.grudgeSudden;
      tail += ' ' + act.name + '’s fandom has not forgotten how {she} had to leave, and this week it is saying so again.';
    }
    inbox.push({ kind: 'industry', ind: 'acrossSigned', priority: 'high', personId: p.id, company: r.short, shape,
      text: KP.fillPro(KP.displayName(p) + (act ? ', formerly of ' + act.name + ',' : '') + ' has signed with ' + r.short + ' as a soloist, ' + away + ' weeks after {pos} contract with ' + co +
        (shape === 'cold' ? ' expired' : shape === 'released' ? ' was dissolved at {pos} own request' : ' completed') + '.' +
        SIGNED[shape].split('{CO}').join(co) + (broken && shape !== 'sudden' ? ' Asked about {pos} last year there, {she} said {she} had learned to get dates in writing.' : '') + tail +
        ' A first record is promised “soon”, which on that street means inside a season.', p) });
  }

  // ---- the debut --------------------------------------------------------------
  function debut(state, p, inbox) {
    const A = KP.C.ACROSS, L = KP.acrossLedger(state);
    const f = p.flags;
    // the house that signed her may have folded or merged since
    const r = KP.signingHouses(state).find(x => x.short === f.across.company) || pickHouse(state, p);
    if (!r) { afterLife(state, p, inbox, true); return; }
    const moved = r.short !== f.across.company;
    const co = state.company.short;
    const shape = KP.exitShape(state, p);
    const act = oldAct(state, p);
    const lastRel = act && (act.releases || []).length ? act.releases[act.releases.length - 1] : null;
    p.status = 'rival';
    p.company = r.short;
    p.signedWeek = f.across.week;
    // her record is made on an rng of its own: the main stream stands still
    const prng = new KP.Rng([state.seed, p.id, 'acrossDebut'].join('|'));
    const made = KP.makeRivalAct(state, prng, r, { members: [p.id], name: KP.displayName(p), gender: p.gender || 'f',
      concept: lastRel && lastRel.conceptId ? lastRel.conceptId : null, alumOf: co, gen: act && act.gen ? act.gen : null,
      popularity: KP.clamp(A.seedPop + fameOf(state, p) * A.seedPerFame, 0, 80) });
    if (!made) { p.status = 'departed'; p.company = null; afterLife(state, p, inbox, true); return; }
    f.across = Object.assign(f.across, { company: r.short, debutWeek: state.week, actId: made.act.id, title: made.rel.title });
    KP.chapter(state, p, 'debut', { solo: true, co: r.short });
    p.history.push({ week: state.week, text: 'Debuted solo at ' + r.short + ' with “' + made.rel.title + '”.' });
    L.debuted++;
    (made.rel.narNotes || []).forEach(n => inbox.push(n));
    // a close friend still in the building
    const friend = state.roster.map(id => state.people[id]).filter(m => m && m.status === 'idol')
      .map(m => ({ m, rel: (state.relationships || {})[KP.pairKey(p, m)] }))
      .filter(x => x.rel && x.rel.state === 'close')
      .sort((a, b) => b.rel.score - a.rel.score || (a.m.id < b.m.id ? -1 : 1))[0];
    const warm = shape === 'bow' || shape === 'plain' || shape === 'released';
    let tail;
    if (warm && friend) {
      friend.m.morale = KP.clamp(friend.m.morale + A.friendMorale, 0, 100);
      L.friends++;
      tail = ' ' + KP.displayName(friend.m) + ' posted the album cover an hour after midnight. Nobody at ' + co + ' told ' + KP.pro(friend.m).her + ' to, and nobody told ' + KP.pro(friend.m).her + ' not to.';
    } else if (warm) {
      tail = ' ' + co + '’s official account posted a one-line congratulation, and meant it.';
    } else {
      tail = ' Nobody at ' + co + ' posted anything. The fandom keeps a list of who did not.';
    }
    const rec = made.rel.reception;
    inbox.push({ kind: 'industry', ind: 'acrossDebut', priority: 'high', personId: p.id, company: r.short, actName: made.act.name, shape,
      text: KP.fillPro(KP.displayName(p) + ' debuted solo under ' + r.short + ' this week with “' + made.rel.title + '”' +
        (moved ? ' (the house that first signed {her} is gone; the contract moved)' : '') + '. ' +
        (rec >= 64 ? 'It is getting real traction: the name did half the work and the record did the rest.'
          : rec >= 48 ? 'A competent launch. The name bought the first week; the follow-up has to buy the second.'
          : 'It landed quietly. A famous name is a loan, and the first record did not repay it.') +
        (living(act) ? ' From here {she} is on the same chart as ' + act.name + ', and the week they share a release date the recaps will not need a headline writer.'
          : ' From here {she} is one more act on the chart this company releases against.') + tail, p) });
  }

  // ---- the clock (order 621: behind the open board's own re-entries at 619) ----
  KP.registerWeekly('across', 621, function (state, rng, inbox) {
    const A = KP.C.ACROSS, L = KP.acrossLedger(state);
    Object.values(state.people).forEach(p => {
      if (p.status !== 'departed') return;
      const f = p.flags = p.flags || {};
      if (f.after) return;
      if (f.across) { if (state.week >= f.across.debutAt) debut(state, p, inbox); return; }
      if (f.nextAt == null) {
        f.nextAt = (f.departedWeek != null ? f.departedWeek : state.week) + A.waitMin + Math.floor(h(state, p, 'wait') * (A.waitMax - A.waitMin + 1));
        L.clocked++;
      }
      if (state.week < f.nextAt) return;
      const house = pickHouse(state, p);
      if (house && h(state, p, 'sign') < KP.acrossChance(state, p)) sign(state, p, house, inbox);
      else afterLife(state, p, inbox, false);
    });
  });
  // the odds another house signs her: her own name, how she left, her age
  KP.acrossChance = function (state, p) {
    const A = KP.C.ACROSS;
    return A.signBase + fameOf(state, p) * A.signPerFame + (KP.exitShape(state, p) === 'cold' ? A.coldBonus : 0) -
      Math.max(0, (p.age || 0) - A.ageFrom) * A.agePerYear;
  };
  // the three chapters, as verbs (the rail calls them; so can a test)
  KP.acrossHouse = pickHouse;
  KP.acrossSign = sign;
  KP.acrossDebut = debut;
  KP.acrossAfter = afterLife;
  // her solo run across the street is over (v0.11.15). The act's ending is
  // the industry's to tell (industry.js); what this module owns is her
  // file: when it ended and under which name the house then had, the
  // count, and the one sentence that makes the letter about an artist who
  // was ours. Called before the act retires. Words and a stamp: no draw,
  // and nothing here moves a number.
  KP.acrossEnded = function (state, p, rival, act, how) {
    const f = p.flags = p.flags || {};
    if (!f.across || f.across.debutWeek == null || f.across.endedWeek != null) return '';
    f.across.endedWeek = state.week;
    f.across.endedCo = rival.short;
    f.across.endedHow = how;
    KP.acrossLedger(state).ended++;
    return KP.fillPro(' {She} was ' + (act.alumOf || state.company.short) + '’s before {she} was theirs; the file here has one more page in it now.', p);
  };

  // ---- the read: where an alumna is now, in words -----------------------------
  KP.whereNow = function (state, p) {
    const f = p.flags || {};
    if (p.status === 'rival' && f.across && f.across.debutWeek != null) return 'soloist at ' + p.company + ' since ' + when(f.across.debutWeek);
    if (p.status === 'departed' && f.across) return 'signed with ' + f.across.company + ' as a soloist';
    if (f.after) return f.after.what;
    // her solo run is over (v0.11.15): read off her file, never off the
    // wording of her last chapter. That line led with the act's name, the
    // act's name is hers, and the fallback below lowercased it.
    if (f.across && f.across.debutWeek != null) {
      return 'home' + (f.across.endedWeek != null ? ' since ' + when(f.across.endedWeek) : '') + ', after a solo run at ' + (f.across.endedCo || f.across.company);
    }
    const last = (p.chapters || [])[(p.chapters || []).length - 1];
    return last ? KP.chapterLine(state, last).replace(/^./, c => c.toLowerCase()) : 'gone from the company';
  };

  // ---- the timeline hears it ---------------------------------------------------
  const pick = (state, salt, id, lines) => lines[Math.floor(KP.hash01([state.seed, salt, id, state.week].join('|')) * lines.length)];
  KP.onFeedEvent('acrossSigned', (state, n) => {
    const p = state.people[n.personId];
    if (!p) return null;
    const N = KP.publicGiven(p);
    return pick(state, 'acrossSignedEcho', p.id, n.shape === 'cold' || n.shape === 'sudden' ? [
      { persona: 'fan', text: N + ' signed somewhere that is going to let ' + KP.pro(p).her + ' make music. that is all I ever wanted for ' + KP.pro(p).her + '. I have notes for the old company and they are not short' },
      { persona: 'anti', text: 'so ' + N + ' was good enough for a rival to sign as a soloist but not good enough to keep. somebody upstairs at the old place should be asked about that' },
    ] : [
      { persona: 'fan', text: N + ' SOLO. new company, same ' + N + ', and the announcement thanked the old one. everybody behaved like adults and I am crying about it' },
      { persona: 'casual', text: 'former group member signs elsewhere as a soloist and both companies are being nice about it. rare. bookmarking this for the next time one goes badly' },
    ]);
  });
  KP.onFeedEvent('soloEnded', (state, n) => {
    const p = state.people[n.personId];
    if (!p) return null;
    const N = KP.publicGiven(p);
    return pick(state, 'soloEndedEcho', p.id, n.alumOf ? [
      { persona: 'fan', text: N + '’s solo run is over and I am going to be normal about it. two companies, one voice, and I have every photocard from both' },
      { persona: 'casual', text: 'so ' + N + ' is done with the second company too. somebody should write down what that career was, start to finish, before the timelines forget' },
      { persona: 'stan', text: 'streaming ' + N + '’s solo records tonight and the old group’s after. ' + KP.pro(p).she + ' was good in both rooms. that is the whole post' },
    ] : [
      { persona: 'fan', text: N + '’s contract is up and there is no farewell stage. I will be rewatching the debut showcase and I will not be taking questions' },
      { persona: 'casual', text: 'a soloist quietly leaving a company is the saddest two-line statement this industry prints' },
    ]);
  });
  KP.onFeedEvent('acrossDebut', (state, n) => {
    const p = state.people[n.personId];
    if (!p) return null;
    const N = KP.publicGiven(p);
    return pick(state, 'acrossDebutEcho', p.id, [
      { persona: 'fan', text: N + '’s solo debut is out. I have followed ' + KP.pro(p).her + ' through two companies and I will follow ' + KP.pro(p).her + ' through a third if I have to' },
      { persona: 'stan', text: 'reminder that we can stream ' + N + '’s solo AND the old group. it is not a custody hearing. it is two playlists' },
      { persona: 'casual', text: 'did not expect ' + N + '’s solo to sound like that. the old group never let ' + KP.pro(p).her + ' do this, or never asked' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
