/* Social presence (v0.6.1) — public numbers on every face.
   Owner: "I want to see social media numbers on all of my idols and
   trainees profiles." Follower counts are in-fiction PUBLIC numbers —
   the no-Overall law bans hidden talent scales, not the numbers the
   whole world can already see.

   Design rule: entirely hash-driven. Initialization, weekly jitter and
   event spikes all key off (seed, person, week) — zero rng draws, so
   this system adds no seed drift to anything that already exists. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  KP.fmtCount = function (n) {
    n = Math.round(n || 0);
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e4) return Math.round(n / 1e3) + 'k';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  };

  function jitter(state, p, tag) {
    return 0.7 + KP.hash01([state.seed, p.id, tag, state.week].join('|')) * 0.6;
  }

  // Lazy init: one code path covers new games, fresh leads, generated
  // rival members AND old saves — the first look at any profile mints a
  // plausible following from who she already is.
  KP.socialOf = function (state, p) {
    if (p.social == null) {
      const h = KP.hash01([state.seed, p.id, 'social0'].join('|'));
      let base;
      if (p.status === 'idol') {
        const g = KP.groupOf(state, p.id);
        base = 5000 + ((g && g.popularity) || 20) * 800 +
          (p.breakoutCount || 0) * 20000 + (p.viralCount || 0) * 30000;
      } else if (p.status === 'rival') {
        base = 3000 + 25000 * h;
      } else {
        base = 200 + (p.hype || 0) * 400 + (p.source === 'Social media' ? 1500 : 0);
      }
      p.social = Math.round(base * (0.7 + h * 0.6));
      p.socialDelta = 0;
    }
    return p.social;
  };

  // Eager mint (v0.6.3): the mint reads mutable facts (group popularity,
  // hype), so WHEN it runs is part of the number. Every door people enter
  // the world through mints on the spot — the lazy branch above is a
  // safety net, never the normal path. Otherwise merely LOOKING at a
  // profile could fork a save from its unviewed twin.
  KP.mintSocialAll = function (state) {
    Object.values(state.people || {}).forEach(p => KP.socialOf(state, p));
  };

  // Event spikes — called where the event happens, hash-scaled. Folded
  // into the week's displayed delta by the weekly pass.
  KP.socialSpike = function (state, p, amount, tag) {
    KP.socialOf(state, p);
    const gain = Math.round(amount * jitter(state, p, tag || 'spike'));
    p.social += gain;
    p.socialPending = (p.socialPending || 0) + gain;
    return gain;
  };

  // Weekly pass: growth follows what is actually happening to her.
  // Returns milestone notes for ROSTER people only (the world's numbers
  // move silently; yours make the inbox).
  KP.socialWeek = function (state) {
    const S = KP.C.SOCIAL;
    const notes = [];

    const grow = (p, weekly) => {
      KP.socialOf(state, p);
      const gain = Math.round(weekly * jitter(state, p, 'grow'));
      p.socialDelta = gain + (p.socialPending || 0);
      delete p.socialPending;
      p.social += gain;
    };

    // player people
    state.roster.forEach(id => {
      const p = state.people[id];
      let weekly;
      if (p.status === 'idol') {
        const g = KP.groupOf(state, p.id);
        const pop = (g && g.popularity) || 10;
        const promoting = g && g.debuted && state.week <= (g.promoUntil || 0);
        weekly = pop * (promoting ? S.idolPromoPerPop : S.idolIdlePerPop);
        if (g && KP.getNarrative(state, 'dormant', 'group', g.id)) weekly *= S.dormantMult;
      } else {
        weekly = S.traineeBase + (p.hype || 0) * S.traineePerHype;
      }
      if (KP.getNarrative(state, 'fancamStar', 'idol', p.id)) weekly *= S.narrativeMult;
      if (KP.getNarrative(state, 'itGirl', 'idol', p.id)) weekly *= S.narrativeMult;
      grow(p, weekly);

      // milestones fire once each, roster only
      p.socialMilestones = p.socialMilestones || [];
      S.milestones.forEach(m => {
        if (p.social >= m && !p.socialMilestones.includes(m)) {
          p.socialMilestones.push(m);
          if (m >= 100000) {
            // 100k is a career event — it survives a crowded week's trim
            notes.push({ kind: 'public', urgent: true, ind: 'socialMilestone', personId: p.id, milestone: m,
              text: KP.displayName(p) + ' crossed ' + KP.fmtCount(m) + ' followers. ' +
                (m >= 1000000 ? 'A million people chose her. The company account has a tenth of that — nobody upstairs finds it funny.'
                  : 'The comment section is already organizing her birthday support.') });
          }
        }
      });
    });

    // rival idols coast on their act's popularity
    (state.rivals || []).forEach(r => (r.acts || []).forEach(a => {
      if (a.retired) return;
      (a.members || []).forEach(id => {
        const p = state.people[id];
        if (p) grow(p, (a.popularity || 10) * S.rivalPerPop);
      });
    }));
    return notes;
  };
})(typeof window !== 'undefined' ? window : globalThis);
