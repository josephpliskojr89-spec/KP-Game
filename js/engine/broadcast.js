/* The person in public, part one (v0.10.2, §78 A) — WeCast. Owner:
   "they might ask for permission to go live or to start a video
   channel... things that could really help a small unknown and
   really hurt a major group depending on what's said."

   The law: her own voice is a lever whose throw scales with how
   known she is. Channel growth rides the phone-camera rule — fame
   does NOT damp it, which makes it the small label's third lottery
   ticket — while the gaffe's blast radius scales with the public
   eye. Who asks is personality: the outgoing knock; the properly
   professional ask first; the LOW-professionalism sometimes just go
   live, and the company finds out afterward. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.castLedger = state.castLedger ||
      { channels: 0, lives: 0, gaffes: 0, virals: 0, unsanctioned: 0, trained: 0, declined: 0 };
    return state.castLedger;
  }
  KP.castLedger = ledger;

  function presence(p) {
    return (p.personality.warmth + p.personality.confidence + p.personality.creativity) / 3;
  }
  function gaffeChance(state, p) {
    const C = KP.C.CAST;
    return C.gaffeBase *
      (1 - p.personality.professionalism / 130) *
      (1 - p.personality.resilience / 300) *
      (p.flags.mediaTrained ? C.trainGaffeMult : 1);
  }

  function doLive(state, rng, inbox, p, sanctioned) {
    const C = KP.C.CAST;
    const led = ledger(state);
    led.lives++;
    const spike = Math.round(C.liveFollowers * (0.5 + presence(p) / 80));
    KP.socialSpike(state, p, spike, 'wecast-live');
    if (sanctioned) {
      inbox.push({ kind: 'public', ind: 'liveHappened', priority: 'flavor', personId: p.id,
        text: KP.fillPro(KP.displayName(p) + ' went live on WeCast — an hour of ' +
          (p.personality.warmth >= 60 ? 'reading comments by name and answering all of them' :
           p.personality.creativity >= 60 ? 'half-finished song covers and a tour of the practice room' :
           'quiet talk and a shared meal, which the internet has decided is a genre') +
          '. ' + KP.fmtCount(spike) + ' new followers by morning.', p) });
    }
    // she said a thing — the lottery every open mic runs
    if (rng.chance(gaffeChance(state, p) * 2)) {   // lives run hotter than uploads
      gaffe(state, rng, inbox, p, 'the live');
    }
  }

  function gaffe(state, rng, inbox, p, where) {
    const C = KP.C.CAST;
    const led = ledger(state);
    led.gaffes++;
    const known = KP.publicEye ? KP.publicEye(state, p) : false;
    const g = KP.groupOf(state, p.id);
    const bigStage = known || (g && (g.popularity || 0) >= 55);
    if (bigStage) {
      p.morale = KP.clamp(p.morale - C.gaffeMoraleKnown, 0, 100);
      inbox.push({ kind: 'public', ind: 'castGaffe', priority: 'high', personId: p.id,
        groupId: g ? g.id : undefined,
        text: KP.fillPro('A clip from ' + KP.displayName(p) + '’s ' + where + ' is circulating with the caption doing all the work. What {she} said matters less than how many people were listening — and a face this known had EVERYONE listening. The company phone is ringing in the specific tone of sponsors.', p) });
      const d = KP.igniteDiscourse && KP.igniteDiscourse(state, rng, 'gaffe', 'idol', p.id, g ? g.id : null);
      if (d) inbox.push(d);
      (state.deals || []).forEach(dl => {
        if (dl.personId === p.id && dl.weeksLeft > 0 && !dl.cooled && rng.chance(0.4)) {
          dl.cooled = true;
          inbox.push({ kind: 'company', ind: 'dealCooled', priority: 'high', personId: p.id,
            text: 'The ' + dl.brand + ' account manager called “to check in,” which is brand for “we saw the clip.” The weekly fee just got a haircut until this blows over.' });
        }
      });
    } else {
      // at an unknown label a gaffe is chatter — sometimes even charming
      KP.socialSpike(state, p, C.gaffeCharm, 'wecast-charm');
      inbox.push({ kind: 'public', ind: 'castGaffe', priority: 'flavor', personId: p.id,
        text: KP.fillPro(KP.displayName(p) + ' said a thing on ' + where + ' that a bigger label’s PR team would be sweating about. At this size it read as candor, did small charming numbers, and taught the desk a lesson for later: the same sentence costs more the more people are listening.', p) });
    }
  }

  // ---- the asks --------------------------------------------------------
  KP.registerScene('liveAsk', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'She') + ' · asking to go live';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      return KP.fillPro((p ? KP.displayName(p) : 'She') + ' wants to go live on WeCast — just {her}, a camera, and whoever shows up. Unscripted is the appeal and the risk in one word. The staff read is on file; the mic does not read it.', p);
    },
    options: () => [
      { id: 'allow', label: 'Go live' },
      { id: 'train', label: 'Media training first' },
      { id: 'decline', label: 'Not yet' },
    ],
    resolve: (state, sc, optionId) => {
      const p = state.people[sc.personId];
      if (!p) return { toast: 'The moment passed.' };
      const C = KP.C.CAST;
      if (optionId === 'decline') {
        ledger(state).declined++;
        p.morale = KP.clamp(p.morale - C.declineMorale, 0, 100);
        KP.recordDirected(state, p.id, 'keptOffline', -1);
        return { toast: KP.fillPro('{She} nodded and closed the laptop slowly, which is a whole sentence.', p) };
      }
      if (optionId === 'train') {
        state.budget -= C.trainCost;
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'marketing', -C.trainCost);
        p.flags.mediaTrained = 1;
        ledger(state).trained++;
      }
      p.flags.pendingLive = state.week + (optionId === 'train' ? 1 : 0);
      return { toast: optionId === 'train'
        ? 'Two days with the media coach first — what not to say, and how to say nothing warmly. Then the mic.'
        : 'Approved. The staff group chat is already placing bets on the hour count.' };
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (p) { p.morale = KP.clamp(p.morale - 2, 0, 100); KP.recordDirected(state, p.id, 'keptOffline', -1); }
      return null;
    },
  });
  KP.registerScene('channelAsk', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'She') + ' · the channel pitch';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      return KP.fillPro((p ? KP.displayName(p) : 'She') + ' came in with an actual DECK: a personal WeCast channel — {her} own uploads, {her} own voice, weekly. At this label’s size it is free reach money cannot buy; every upload is also a sentence the company did not write. The ask is standing permission.', p);
    },
    options: () => [
      { id: 'allow', label: 'Open the channel' },
      { id: 'train', label: 'Open it — after media training' },
      { id: 'decline', label: 'The company posts for you' },
    ],
    resolve: (state, sc, optionId) => {
      const p = state.people[sc.personId];
      if (!p) return { toast: 'The moment passed.' };
      const C = KP.C.CAST;
      if (optionId === 'decline') {
        ledger(state).declined++;
        p.morale = KP.clamp(p.morale - C.declineMorale - 1, 0, 100);
        KP.recordDirected(state, p.id, 'keptOffline', -1);
        return { toast: KP.fillPro('“The company posts for you.” {She} heard every word under that sentence. The deck went back in the bag.', p) };
      }
      if (optionId === 'train') {
        state.budget -= C.trainCost;
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'marketing', -C.trainCost);
        p.flags.mediaTrained = 1;
        ledger(state).trained++;
      }
      p.broadcast = { since: state.week, uploads: 0 };
      ledger(state).channels++;
      p.history.push({ week: state.week, text: 'Opened a personal WeCast channel — her own voice, on the record, weekly.' });
      KP.note(state, { kind: 'public', ind: 'channelOpened', priority: 'high', personId: p.id,
        text: KP.fillPro(KP.displayName(p) + '’s personal WeCast channel is LIVE. First upload: ' +
          (p.personality.creativity >= 60 ? 'a bedroom demo nobody at the label had heard' : 'a day-in-the-life with aggressively normal lunch content') +
          '. The subscriber counter is a public number now, and it belongs to {her}.', p) });
      return { toast: 'The channel opens. Free reach, weekly — and a live mic the company does not hold.' };
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (p) { p.morale = KP.clamp(p.morale - 2, 0, 100); KP.recordDirected(state, p.id, 'keptOffline', -1); }
      return null;
    },
  });
  KP.registerScene('unsanctionedLive', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'She') + ' · the live nobody approved';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      return KP.fillPro('The report reached the desk after the fact: ' + (p ? KP.displayName(p) : 'she') + ' went live on WeCast last night — no approval, no plan, ' + KP.fmtCount(3000) + '-odd viewers by the end. Nothing broke. This time. The question on the desk is about next time.', p);
    },
    options: () => [
      { id: 'slide', label: 'Let it slide — it worked' },
      { id: 'train', label: 'Media training, mandatory' },
      { id: 'reprimand', label: 'A formal reprimand' },
    ],
    resolve: (state, sc, optionId) => {
      const p = state.people[sc.personId];
      if (!p) return { toast: 'The moment passed.' };
      const C = KP.C.CAST;
      if (optionId === 'reprimand') {
        p.morale = KP.clamp(p.morale - 5, 0, 100);
        KP.recordDirected(state, p.id, 'reprimanded', -1);
        p.flags.castChilled = state.week + 48;
        return { toast: 'On the record, in writing. The lives stop. Some other things quietly stop too.' };
      }
      if (optionId === 'train') {
        state.budget -= C.trainCost;
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'marketing', -C.trainCost);
        p.flags.mediaTrained = 1;
        ledger(state).trained++;
        return { toast: 'Mandatory coaching, framed as an upgrade. She rolled her eyes and took notes anyway.' };
      }
      p.flags.castEmboldened = 1;
      return { toast: 'You let it slide. It DID work. She noticed both facts, and only one of them was the lesson you intended.' };
    },
    expire: () => null,
  });

  // ---- the week --------------------------------------------------------
  KP.registerWeekly('wecast', 796, function (state, rng, inbox, roster) {
    const C = KP.C.CAST;
    const led = ledger(state);
    // pending approved lives happen
    roster.forEach(p => {
      if (p.flags.pendingLive != null && state.week >= p.flags.pendingLive) {
        delete p.flags.pendingLive;
        doLive(state, rng, inbox, p, true);
      }
    });
    // running channels upload
    roster.forEach(p => {
      if (!p.broadcast) return;
      if (p.flags.personalHiatus || p.flags.military || KP.onBreak(p)) return;
      p.broadcast.uploads++;
      // fame does NOT damp this — the camera doesn't care who you are
      KP.socialSpike(state, p, Math.round(C.drip * (0.5 + presence(p) / 80)), 'wecast');
      if (rng.chance(C.viralChance * (0.5 + presence(p) / 80))) {
        led.virals++;
        p.hype = KP.clamp((p.hype || 0) + C.hypePerViral, 0, 100);
        KP.socialSpike(state, p, KP.C.SOCIAL.viralSpike, 'wecast-viral');
        const nar = KP.recordViral(state, p, { kind: 'wecast', label: 'a WeCast upload' });
        if (nar) inbox.push(nar);
        inbox.push({ kind: 'public', ind: 'castViral', priority: 'high', personId: p.id,
          text: KP.fillPro('A ' + KP.displayName(p) + ' WeCast upload broke containment overnight — reposted by accounts that have never once covered this label. The channel {she} pitched in a meeting is outperforming campaigns the company paid for.', p) });
      }
      if (rng.chance(gaffeChance(state, p))) {
        gaffe(state, rng, inbox, p, 'this week’s upload');
      }
    });
    // the ask, or the live nobody approved
    if (rng.chance(C.askChance) &&
        !(state.scenes || []).some(sc => sc.kind === 'liveAsk' || sc.kind === 'channelAsk' || sc.kind === 'unsanctionedLive')) {
      const eligible = roster.filter(p =>
        (p.status === 'trainee' || p.status === 'idol') &&
        !p.broadcast && p.flags.pendingLive == null &&
        !(p.flags.castChilled && state.week < p.flags.castChilled) &&
        (p.personality.confidence >= C.askConfidence || p.personality.warmth >= C.askWarmth ||
         p.flags.castEmboldened));
      if (eligible.length) {
        const p = eligible[Math.floor(rng.next() * eligible.length)];
        const unsanc = (p.personality.professionalism < C.unsancProfessionalism || p.flags.castEmboldened) &&
          rng.chance(C.unsancChance);
        if (unsanc) {
          led.unsanctioned++;
          doLive(state, rng, inbox, p, false);
          KP.openScene(state, { kind: 'unsanctionedLive', personId: p.id, expiresWeek: state.week + 2 });
          inbox.push({ kind: 'company', ind: 'unsancLive', priority: 'high', personId: p.id,
            text: KP.fillPro(KP.displayName(p) + ' went live on WeCast last night without asking anyone. The staff found out from the fans, which is the worst available way. The conversation is on the Desk.', p) });
        } else {
          const wantsChannel = p.personality.creativity >= 55 || p.broadcastAskedLive;
          KP.openScene(state, { kind: wantsChannel ? 'channelAsk' : 'liveAsk',
            personId: p.id, expiresWeek: state.week + 2 });
        }
      }
    }
  });

  // ---- the timeline reacts ---------------------------------------------
  KP.onFeedEvent('channelOpened', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'SHE HAS A CHANNEL. personal uploads. her own voice. subscribing was the fastest decision of my week and I include lunch' },
    { persona: 'casual', text: 'idol opens a personal WeCast and the first upload is just… a person? being normal? this is the content actually. companies take note' },
    { persona: 'press', text: 'Another artist opens a personal channel — the industry’s most reliable arbitrage: authenticity the label cannot manufacture, at a price the label cannot beat.' },
  ]));
  KP.onFeedEvent('castViral', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'a bedroom upload from an idol channel is outperforming actual marketing campaigns this week. the mic is mightier than the media plan' },
    { persona: 'stan', text: 'the channel upload went viral and we KNEW. we were in the first hundred comments. archaeologists will find our receipts' },
    { persona: 'fan', text: 'her own upload, her own voice, no company filter, one million views. this is why you let them have the mic' },
  ]));
  KP.onFeedEvent('castGaffe', (state, n, rng) => rng.pick([
    { persona: 'press', text: 'The weekly reminder that a live mic is a liability instrument: one sentence, one clip, one caption doing the damage. The company statement is being drafted in the usual font.' },
    { persona: 'casual', text: 'idol says a thing on a live, internet does what the internet does. the sentence was fine. the reach was the problem. it is always the reach' },
    { persona: 'fan', text: 'the clip is out of context and we have the full VOD and nobody who is quote-posting will watch it. defending with timestamps anyway. this is devotion' },
  ]));
  KP.onFeedEvent('liveHappened', (state, n, rng) => rng.chance(0.35) ? rng.pick([
    { persona: 'fan', text: 'she went live at midnight and 3 hours later I know her skincare order and her childhood dog’s name. best broadcast of the year. no competition' },
    { persona: 'casual', text: 'the idol live-broadcast genre remains undefeated: no script, no edit, just a person and forty thousand strangers having dinner together' },
  ]) : null);
  KP.onFeedEvent('unsancLive', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'an idol going live without telling the company is the most alive content format there is. you can HEAR the manager’s phone buzzing off camera' },
    { persona: 'stan', text: 'the unsanctioned live was chaotic and perfect and somewhere a PR team aged five years in one hour. we were there. history' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
