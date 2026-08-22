/* The public eye (v0.9.36, §77) — the industry out loud. "I want a
   fandom and industry that remembers... just how public the whole
   industry is." The sim already knew — hype, lineups, siblings,
   generations — but the public never said it. Four mechanisms, all
   reaction, no new verbs: the known trainee (and the ace watch), the
   snub story (aimed at the company's CHOICE, never at her), the
   announcement expectations settled at the debut, and the
   comparisons — one house's two weathers, and the week's landings
   as the industry's yardstick. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.publicEyeLedger = state.publicEyeLedger ||
      { snubs: 0, aceIn: 0, aceWatch: 0, expectSet: 0, overDelivered: 0,
        underDelivered: 0, met: 0, houseCompares: 0, sceneCompares: 0 };
    return state.publicEyeLedger;
  }

  // ---- the public trainee ----------------------------------------------
  KP.publicEye = function (state, p) {
    const PB = KP.C.PUBLIC;
    return (p.hype || 0) >= PB.knownHype || KP.socialOf(state, p) >= PB.knownSocial;
  };

  // ---- the expectation read: what the announcement promises -------------
  KP.expectationRead = function (state, g) {
    const E = KP.C.PUBLIC.EXPECT;
    const rep = Math.max.apply(null, Object.values(state.company.reputation || { a: 25 }));
    const me = KP.powerRankingNow(state).find(r => r.isPlayer);
    let pts = rep / 4 +
      (me && me.rank <= 3 && me.score >= 85 ? 12 : me && me.rank <= 5 && me.score >= 60 ? 5 : 0);
    g.members.map(id => state.people[id]).filter(Boolean).forEach(m => {
      if (KP.publicEye(state, m)) {
        pts += Math.min(12, (m.hype || 0) / 4 + KP.socialOf(state, m) / 30000);
      }
    });
    const level = pts >= E.arenaAt ? 3 : pts >= E.loudAt ? 2 : pts >= E.watchingAt ? 1 : 0;
    return { pts: Math.round(pts), level, word: E.WORDS[level] };
  };

  // ---- the announcement: expectations mint, the snub prints -------------
  // Called from planDebut the moment a NEW group's lineup locks and the
  // date goes on the calendar — that is when the public gets a say.
  KP.publicAnnouncement = function (state, g) {
    const PB = KP.C.PUBLIC;
    const led = ledger(state);
    const rng = KP.rngFor(state);

    const ex = KP.expectationRead(state, g);
    g.prep.expectation = ex;
    led.expectSet++;
    if (ex.level >= 1) {
      KP.note(state, { kind: 'public', ind: 'expectSet', groupId: g.id,
        priority: ex.level >= 2 ? 'high' : 'normal', level: ex.level,
        text: ex.level >= 3
          ? state.company.short + ' announcing a new group stopped the timeline mid-scroll: ' + ex.word + ', before a single teaser. The names in the lineup are already famous, the letterhead already means something, and the debut has exactly one acceptable size now. The company set this bar itself.'
          : ex.level === 2
            ? 'The ' + state.company.short + ' announcement made the trades within the hour — a new group from a name the industry ranks. Expectation level: ' + ex.word + '. Every write-up ends with some version of the same sentence: they had better not miss.'
            : 'A new ' + state.company.short + ' group is officially in the works. The industry is watching — politely, notebook open. Expectations exist now, which is a thing announcements do.' });
    }

    // the ace made it: the public name IN the lineup seeds the countdown
    const acesIn = g.members.map(id => state.people[id])
      .filter(m => m && KP.publicEye(state, m));
    if (acesIn.length) {
      led.aceIn++;
      g.prep.buildup = (g.prep.buildup || 0) + 6;
      const ace = acesIn.sort((a, b) => KP.socialOf(state, b) - KP.socialOf(state, a))[0];
      KP.note(state, { kind: 'public', ind: 'aceMadeIt', groupId: g.id, personId: ace.id,
        text: KP.fillPro('The lineup confirms what the internet decided months ago: ' + KP.displayName(ace) + ' is IN. The reply sections are already planning the debut streaming schedule. ' + KP.fmtCount(KP.socialOf(state, ace)) + ' followers arrived before the group had a name — that is a head start, and a promise.', ace) });
    }

    // the snub: the public name the lineup SKIPPED is a story — the
    // story aims at the company's choice, never at her (content law)
    const snubbed = state.roster.map(id => state.people[id])
      .filter(p => p && p.status === 'trainee' && !g.members.includes(p.id) &&
        KP.publicEye(state, p) && (p.flags.snubCount || 0) < 2);
    snubbed.slice(0, 2).forEach(p => {
      p.flags.snubCount = (p.flags.snubCount || 0) + 1;
      const again = p.flags.snubCount >= 2;
      led.snubs++;
      p.morale = KP.clamp(p.morale - PB.snubMorale, 0, 100);
      KP.recordDirected(state, p.id, 'passedOver', PB.snubDirected);
      p.history.push({ week: state.week,
        text: again
          ? 'Passed over for a second lineup while the public watched. She read the announcement like everyone else — online, at midnight. The company keeps deciding; the internet keeps counting.'
          : 'The lineup was announced without her — the trainee the internet already knew by name. She practiced the next morning like nothing happened, which everybody in the building understood to be the loudest possible answer.' });
      KP.note(state, { kind: 'public', ind: 'aceSnubbed', priority: 'high', personId: p.id, groupId: g.id,
        text: KP.fillPro(again
          ? 'The question is not polite anymore: ' + KP.displayName(p) + ' — ' + KP.fmtCount(KP.socialOf(state, p)) + ' followers, the trainee this company is KNOWN for online — passed over for a SECOND lineup. The fandom-in-waiting has receipts, timestamps, and a hashtag. The company is the story now, and not the good kind.'
          : 'The lineup dropped, and the internet did the roll call in under a minute: ' + KP.displayName(p) + ' is not in it. The trainee with ' + KP.fmtCount(KP.socialOf(state, p)) + ' followers and the viral clips — left off. Nobody is asking what {she} did wrong, because nobody thinks {she} did. They are asking what the company is thinking. Loudly.', p) });
      KP.igniteDiscourse(state, rng, 'aceSnub', 'idol', p.id, g.id);
    });

    state.rngState = rng.state();
  };

  // ---- the settlement: the debut lands on the bar the world set ---------
  // Called from resolveDebut with the reception, BEFORE prep clears.
  KP.settleExpectations = function (state, g, reception, notes) {
    const E = KP.C.PUBLIC.EXPECT;
    const ex = g.prep && g.prep.expectation;
    if (!ex) return;
    const led = ledger(state);
    let level = ex.level;
    // a deep countdown raises the bar — the company kept talking
    if ((g.prep.buildup || 0) >= E.buildupRaises) level = Math.min(3, level + 1);
    const bar = E.bar[level];
    if (reception >= bar + E.exceedMargin) {
      led.overDelivered++;
      KP.fandomGain(g, E.exceedFandom);
      const nar = KP.recordEvidence(state, 'overDelivered', 'group', g.id);
      if (nar) notes.push(nar);
      notes.push({ kind: 'public', ind: 'overDelivered', priority: 'high', groupId: g.id, level,
        text: level === 0
          ? 'Nobody was watching ' + g.name + ' debut. Everybody is watching now. A launch with zero expectations just outran half the announcements that had them — the write-ups are all using the word “ambush,” affectionately. The best story in this industry is the one nobody saw coming.'
          : g.name + ' was handed ' + ex.word + ' and CLEARED it — the debut landed above the bar the announcement set, which almost never happens, which is why every trade piece today sounds surprised. Expectations met are forgotten by Friday. Expectations beaten get remembered.' });
    } else if (level >= 1 && reception < bar - E.missMargin) {
      led.underDelivered++;
      g.members.map(id => state.people[id]).filter(Boolean).forEach(m => {
        m.morale = KP.clamp(m.morale - E.missMorale, 0, 100);
      });
      const nar = KP.recordEvidence(state, 'underDelivered', 'group', g.id);
      if (nar) notes.push(nar);
      notes.push({ kind: 'public', ind: 'underDelivered', priority: 'high', groupId: g.id, level,
        text: 'The ' + g.name + ' debut everyone watched — landed short of the watching. The announcement promised ' + ex.word + '; the reception did not clear the bar the company itself raised. The write-ups are gentle and the quote-posts are not. Members read everything, whatever anyone tells them to do.' });
    } else if (level >= 1) {
      led.met++;
      notes.push({ kind: 'public', ind: 'expectMet', groupId: g.id, level,
        text: g.name + ' debuted into ' + ex.word + ' and delivered on schedule — no miracle, no faceplant, a professional landing. The industry nods and moves on, which is the quiet success nobody writes songs about.' });
    }
  };

  // ---- the comparisons: no release lands in a vacuum --------------------
  KP.publicCompare = function (state, g, reception, notes, rng) {
    const PB = KP.C.PUBLIC;
    const led = ledger(state);
    // one house, two weathers: measured against the sibling's last record
    const sib = KP.groups(state).find(o => o !== g && o.debuted && !o.retiredWeek &&
      (o.releases || []).length);
    if (sib && rng.chance(PB.compareChance)) {
      const last = sib.releases[sib.releases.length - 1];
      const gap = reception - (last.reception || 0);
      led.houseCompares++;
      notes.push({ kind: 'public', ind: 'houseCompare', priority: Math.abs(gap) >= PB.houseGapNote ? 'high' : 'flavor',
        groupId: g.id, sibName: sib.name, gap,
        text: Math.abs(gap) >= PB.houseGapNote
          ? (gap > 0
            ? 'One building, two weathers: this week’s ' + g.name + ' numbers put real distance on ' + sib.name + '’s last outing, and the fan spaces of BOTH groups noticed within the hour. The company will say there is no internal ranking. The company is the only one saying that.'
            : sib.name + '’s shadow is long this week — ' + g.name + '’s landing came in well under the house’s own bar, and the comparison threads write themselves. Sharing a letterhead means sharing a yardstick. Nobody signed up for that part.')
          : 'The in-house comparison ran on schedule: ' + g.name + ' vs ' + sib.name + ', same building, adjacent bar charts. ' + (gap >= 0 ? 'This week the younger line wins the thread.' : 'This week the elder holds the thread.') });
    }
    // the industry's yardstick: the week's nearest rival landing
    const peers = (state.weekReleases || []).filter(w => w.actId);
    if (peers.length && rng.chance(PB.compareChance)) {
      const peer = peers.slice().sort((a, b) =>
        Math.abs((a.actPop || 0) - (g.popularity || 0)) - Math.abs((b.actPop || 0) - (g.popularity || 0)))[0];
      const gap = reception - (peer.reception || 0);
      led.sceneCompares++;
      notes.push({ kind: 'public', ind: 'sceneCompare', priority: 'flavor',
        groupId: g.id, peerName: peer.actName, peerCo: peer.company, gap,
        text: 'Same week, same weight class: ' + g.name + ' and ' + peer.actName + ' (' + peer.company + ') landed side by side, and the industry did what it always does — put the numbers in one image and let the ratio speak. ' +
          (gap > 6 ? 'This round is ours, visibly.' : gap < -6 ? 'This round is theirs, visibly.' : 'Too close to call, which is its own kind of coverage.') });
    }
  };

  // ---- the weekly: the ace watch (order 596) ----------------------------
  KP.registerWeekly('publicEye', 596, function (state, rng, inbox, roster) {
    const PB = KP.C.PUBLIC;
    const led = ledger(state);
    // while a known trainee sits unassigned, the feed keeps asking
    const watched = roster.filter(p => p.status === 'trainee' &&
      !KP.groupOf(state, p.id) && KP.publicEye(state, p));
    if (watched.length && rng.chance(PB.aceWatchChance)) {
      const p = watched[Math.floor(rng.next() * watched.length)];
      led.aceWatch++;
      state.feed = state.feed || [];
      state.feed.unshift({ week: state.week, handle: KP.genFanHandle(rng, new Set()),
        persona: rng.chance(0.5) ? 'fan' : 'casual',
        text: rng.pick([
          'weekly check-in: still no lineup news for ' + KP.publicGiven(p) + '. the clips are RIGHT THERE. the company is sitting on a debut and calling it development',
          KP.publicGiven(p) + ' has been "a trainee to watch" for so long the watch has a fandom. put her in a group before we age out of stanning',
          'the ' + state.company.short + ' trainee everyone knows is still not debuting and I think about this more than my own career',
          'petition status for ' + KP.publicGiven(p) + ' debut news: growing. patience status: not',
          KP.publicGiven(p) + ' practice clip anniversary today. one year. ONE YEAR of "soon." define soon, ' + state.company.short,
        ]) });
    }
  });

  // ---- the timeline reacts ---------------------------------------------
  KP.onFeedEvent('expectSet', (state, n, rng) => rng.pick([
    { persona: 'stan', text: 'NEW GROUP ANNOUNCEMENT. deep breaths. reading the letterhead, checking the trainee rumors, opening a spreadsheet. it begins again and I am not emotionally recovered from the last one' },
    { persona: 'casual', text: 'a company announcing a group "in the works" is a promissory note the internet never forgets to collect. see you at the debut numbers' },
    { persona: 'press', text: 'The announcement sets the bar; the debut gets measured against it. Companies keep forgetting which half of that sentence is binding.' },
    { persona: 'fan', text: 'new group announced and the expectation math started in the quote posts within minutes. this industry does not do "let’s just see how it goes"' },
  ]));
  KP.onFeedEvent('aceMadeIt', (state, n, rng) => {
    const p = n.personId ? state.people[n.personId] : null;
    const name = p ? KP.publicGiven(p) : 'her';
    return rng.pick([
      { persona: 'fan', text: name + ' IS IN THE LINEUP. months of clips, months of "put her in a group," and they actually did it. we manifested this. lighting a candle for the debut date' },
      { persona: 'stan', text: 'the ace made the lineup, as the prophecy foretold. pre-debut fandom promoted to actual fandom effective immediately. streaming accounts ready' },
      { persona: 'casual', text: 'company does the obviously correct thing with its famous trainee, internet celebrates like a cup final. the bar is on the floor and yet here we are, genuinely happy' },
    ]);
  });
  KP.onFeedEvent('aceSnubbed', (state, n, rng) => {
    const p = n.personId ? state.people[n.personId] : null;
    const name = p ? KP.publicGiven(p) : 'her';
    return rng.pick([
      { persona: 'fan', text: 'refreshing the lineup post like it will change. ' + name + ' is NOT in it. the clips, the covers, the evaluation stories — for what. the company owes an explanation it will never give' },
      { persona: 'stan', text: name + ' snub thread, pinned. we are not attacking anyone, we are ASKING QUESTIONS, in bold, hourly, with receipts' },
      { persona: 'casual', text: 'the famous trainee not making the lineup is the messiest possible outcome and the company chose it on purpose. incredible content, terrible management, or both' },
      { persona: 'press', text: 'A company left its best-known trainee out of the debut lineup. There is a version of this that is strategy. The internet has not met that version.' },
    ]);
  });
  KP.onFeedEvent('overDelivered', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'the debut OUTRAN the announcement. do you know how rare that is. companies write checks with press releases and the group actually cashed it' },
    { persona: 'fan', text: 'we hoped and it was BETTER than the hope. deleting my cautious expectations post from last month before anyone screenshots it' },
    { persona: 'stan', text: 'exceeded expectations is the best genre of debut and I will hear no arguments. the trades sound genuinely confused and it is delicious' },
  ]));
  KP.onFeedEvent('underDelivered', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'announcement said event, debut said tuesday. the gap between the promise and the landing is the actual story and everyone in the quote posts knows it' },
    { persona: 'press', text: 'The debut landed under the expectations the company itself set. The lesson is old: announce quieter, or deliver louder.' },
    { persona: 'fan', text: 'the rollout wrote a check the debut couldn’t cash and now I have to defend a group I love from a bar their own company set. exhausting. streaming anyway' },
  ]));
  KP.onFeedEvent('expectMet', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'debut delivered exactly what the announcement promised. no discourse, no disaster, just a group arriving on time. rarest outcome in the industry, zero engagement, all respect' },
  ]));
  KP.onFeedEvent('houseCompare', (state, n, rng) => rng.pick([
    { persona: 'stan', text: 'the in-house comparison threads are up again. same company, "no internal competition," sure. the bar charts in the replies say otherwise and everyone is being VERY normal about it' },
    { persona: 'fan', text: 'comparing siblings from the same label should be illegal and I say that as someone currently doing it in another tab' },
    { persona: 'casual', text: 'one company, two groups, one yardstick. the fans say don’t compare. the fans compare. this is the whole ecosystem' },
  ]));
  KP.onFeedEvent('sceneCompare', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'same-week landings got the side-by-side treatment within the hour. the ratio image is already circulating. this industry keeps score in public and always has' },
    { persona: 'stan', text: 'the weekly head-to-head numbers post is up and I have opinions about the methodology exactly proportional to how my group did' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
