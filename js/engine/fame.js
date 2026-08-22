/* The grind, part one (v0.9.37, §76 C) — the obscurity wall.
   Owner: "Label reputation should have a direct impact on a song's
   ceiling. if no one knows who you are, it should be difficult to get
   the song out there, even if you spend big. makes it a risk to spend
   big money when it could return very little."

   fameRead is the label's PUBLIC profile — who knows YOU — derived
   fresh from durable facts every call (kernel law: one truth per
   number, no stored meter to drift). networkRead (v0.9.35) is the
   other direction: who you can find. The wall has two teeth at
   release resolution: paid promotion converts through fame, and an
   unknown label's song fights a soft ceiling no budget can buy past.
   The valves — momentum from a worked campaign, a phone-shot gig
   clip, the defining stage moment — are how it gets pierced, and
   piercing it while unknown is a BREAKTHROUGH: the reputation jump
   that moves the wall permanently. Rng-free module: reads and
   arithmetic only; every draw stays in the callers' streams. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.fameLedger = state.fameLedger ||
      { breaks: 0, showsOpenWeek: null, walled: 0, ground: 0, wasted: 0 };
    return state.fameLedger;
  }
  KP.fameLedger = ledger;

  // ---- who knows you ---------------------------------------------------
  KP.fameRead = function (state) {
    const F = KP.C.FAME;
    const rep = Math.max.apply(null,
      Object.values(state.company.reputation || { a: 25 }));
    let hits = 0, wins = 0, bestPop = 0;
    (state.groups || []).forEach(g => {
      (g.releases || []).forEach(r => {
        // a HIT is what travels — a weak-week #1 with a shrug of a
        // reception makes nobody famous
        if ((r.reception || 0) >= F.hitReception) hits++;
      });
      Object.keys(g.trophies || {}).forEach(k => { wins += g.trophies[k]; });
      if ((g.popularity || 0) > bestPop) bestPop = g.popularity || 0;
    });
    let faces = 0;
    if (KP.publicEye) {
      (state.roster || []).forEach(id => {
        const p = state.people[id];
        if (p && KP.publicEye(state, p)) faces++;
      });
      (state.groups || []).forEach(g => {
        if (g.retiredWeek) return;
        (g.members || []).forEach(id => {
          const p = state.people[id];
          if (p && KP.publicEye(state, p)) faces++;
        });
      });
    }
    return KP.clamp(
      F.base +
      Math.max(0, rep - F.repFloor) / F.repDiv +
      Math.min(F.chartMax, hits * F.perChart) +
      Math.min(F.winMax, wins * F.perWin) +
      Math.min(F.popMax, Math.max(0, bestPop - F.popFloor) / F.popDiv) +
      Math.min(F.faceMax, faces * F.perFace) +
      ledger(state).breaks * F.perBreak,
      0.03, 1);
  };

  // words for the company card — never the raw number
  KP.fameWord = function (state) {
    const f = KP.fameRead(state);
    return f < 0.14 ? 'nobody has heard of this label'
      : f < 0.25 ? 'a name that draws a blank in most rooms'
      : f < 0.40 ? 'known in the corners that pay attention'
      : f < 0.55 ? 'a label people can place'
      : f < 0.80 ? 'a known quantity'
      : 'a household name in this industry';
  };

  // ---- the wall's teeth ------------------------------------------------
  // Ad money converts through fame: the campaign a major buys outright,
  // an unknown label half-wastes. Floor keeps quality promo from being
  // pointless — just expensive per point.
  KP.paidEfficiency = function (state) {
    const F = KP.C.FAME;
    const f = KP.fameRead(state);
    return KP.clamp(F.paidFloor + (1 - F.paidFloor) * (f / F.paidKnee),
      F.paidFloor, 1);
  };

  // Applied once at release resolution, between the base formula and
  // the mash roll (an industry-changing mash pierces any wall by
  // definition). opts.paid = the promo+MV points already inside the
  // base number; opts.spark = the defining-clip valve fired.
  KP.applyWall = function (state, g, reception, opts) {
    const F = KP.C.FAME;
    const led = ledger(state);
    const fame = KP.fameRead(state);
    const eff = KP.paidEfficiency(state);
    const paid = Math.max(0, (opts && opts.paid) || 0);
    const waste = Math.round(paid * (1 - eff));
    const camp = (g.prep && g.prep.campaign) || null;
    const mom = (camp && camp.momentum) || 0;
    const under0 = fame < F.wallBelow;
    // the asymmetry, both directions: under the wall the ground game is
    // the only marketing that converts at full rate; above it a street
    // team is a rounding line against national campaigns (half rate —
    // first soak had momentum walking famous labels to #1 wholesale)
    const momLift = Math.min(F.MOM.receptionCap,
      Math.round(mom * F.MOM.receptionPer * (under0 ? 1 : 0.5)));
    let r = reception - waste + momLift;
    const cap = Math.round(F.capBase + fame * F.capSlope +
      mom * F.MOM.capLiftPer +
      ((g.prep && g.prep.viralLift) || 0) +
      (opts && opts.spark ? F.sparkCapLift : 0));
    const under = fame < F.wallBelow;
    const walled = under && r > cap;
    if (walled) r = cap + Math.round((r - cap) * F.overCapKeep);
    if (under) {
      if (walled) led.walled++;
      if (momLift >= 8) led.ground++;
      led.wasted += waste;
      // mechanism census (v0.10.4): a release CAN fit inside its cap
      // with zero waste and no breakthrough — the wall still gated it.
      // The longhaul asserts engagement, not any particular outcome.
      led.underEras = (led.underEras || 0) + 1;
    }
    return { reception: KP.clamp(Math.round(r), 1, 100),
      fame, waste, momLift, cap, walled, under };
  };

  // ---- the breakthrough ------------------------------------------------
  // A landing this loud from a label this unknown is the story that
  // moves the wall for good. Called with the FINAL reception (post-
  // mash: "changed the industry" from a one-room label IS this event).
  KP.recordBreakthrough = function (state, g, reception, fameBefore) {
    const F = KP.C.FAME;
    if (fameBefore >= F.breakBelow || reception < F.breakMin) return null;
    const led = ledger(state);
    led.breaks++;
    const repObj = state.company.reputation || {};
    Object.keys(repObj).sort((a, b) => repObj[b] - repObj[a]).slice(0, 2)
      .forEach(k => { repObj[k] = KP.clamp(repObj[k] + F.breakRep, 0, 100); });
    state.trust = KP.clamp((state.trust || 0) + F.breakTrust, 0, 100);
    g.eraBreakthrough = state.week;
    KP.recordEvidence(state, 'breakthrough', 'group', g.id);
    return { kind: 'public', ind: 'breakthrough', priority: 'high', groupId: g.id,
      text: '“Who is ' + state.company.name + '?” is the industry question of the week. ' +
        g.name + ' just landed a number nobody’s org chart predicted, from a label ' +
        'most write-ups had to look up before filing. The reputation jump is already ' +
        'real: venues that screened the calls are calling back. The wall moved.' };
  };

  // ---- the music shows return your calls, or don't ---------------------
  KP.showsOpen = function (state) {
    return KP.fameRead(state) >= KP.C.FAME.showBar;
  };

  // ---- the timeline reacts ---------------------------------------------
  KP.onFeedEvent('breakthrough', (state, n, rng) => rng.pick([
    { persona: 'press', text: 'Every cycle one release comes out of a label nobody covers and embarrasses the coverage. This week’s edition arrived. Recalibrating.' },
    { persona: 'fan', text: 'been on this train since the wedding-stage clips and now EVERYONE shows up acting like they discovered them. where were you when the venue was a school gym' },
    { persona: 'casual', text: 'small label charts out of nowhere and the quote posts split evenly between "industry plant" and "I called this." neither of you called this' },
    { persona: 'stan', text: 'the label account went from 3 replies per post to RATIOING MAJORS in one week. underdog arcs are undefeated content' },
  ]));
  KP.onFeedEvent('wallFelt', (state, n, rng) => rng.pick([
    { persona: 'critic', text: 'Good record, invisible label. The saddest genre in this industry: songs that deserved a bigger door than the one their company could open.' },
    { persona: 'fan', text: 'the song is RIGHT THERE and nobody is playing it because nobody knows the label exists. screaming into the group chat does not count as promotion apparently' },
    { persona: 'casual', text: 'heard an actually good debut from a company I could not name five minutes after reading it. that, kids, is what a marketing budget cannot fix' },
  ]));
  KP.onFeedEvent('groundPaid', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'this label played every gym, fair, and theater within bus distance and you can SEE it in the first-week numbers. earned every single listener the hard way' },
    { persona: 'press', text: 'The interesting number this week belongs to a small label whose release outran its ad spend on ground game alone. The old playbook still works if you actually run it.' },
    { persona: 'casual', text: 'apparently the trick to charting without a budget is playing forty tiny stages until the neighborhood knows the choreo. exhausting. effective. respect' },
  ]));
  KP.onFeedEvent('showsClosed', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'small label books a whole comeback with zero music shows because the shows literally will not take their calls. the industry has a bouncer and he does not know your name' },
    { persona: 'fan', text: 'no countdown stage, no prime stage, no pop wave. the era will be fought in theaters and radio slots. underdog documentary footage, basically' },
  ]));
  KP.onFeedEvent('showsOpen', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'THE MUSIC SHOWS CALLED BACK. from wedding stages to an actual broadcast lineup. someone frame the booking email' },
    { persona: 'press', text: 'A label that spent its first era locked out of the broadcast circuit just got its first booking call. That door only opens one way: from the inside.' },
    { persona: 'casual', text: 'the little label got its first music show booking and honestly the grind arc earned it. television at last' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
