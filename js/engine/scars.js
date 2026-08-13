/* Standing & scars (v0.8.3) — wounds with shadows, trust with teeth.
   The critic: "a world that remembers your chart positions but not
   your scars feels like a press archive, not a life." A boiled storm
   on an idol now leaves a WEEKS-long shadow — a changed mood word, a
   subdued bubble tone — and ends with a recovery scene where the tone
   of her return is your call. Standing (v0.8.0's derived words) stops
   being invisible: it reads in her file and gates what morale can't
   buy. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // ---- the shadow lifts: the recovery scene -----------------------------
  KP.registerScene('scarRecovery', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'She') + ' · coming back';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return '';
      return KP.fillPro('The storm around ' + KP.displayName(p) + ' burned out weeks ago, but {she} has been carrying it — quieter on camera, careful in a way {she} never used to be. This week, for the first time, {she} laughed at practice like nobody was filming. The staff want to know how to play {pos} return.', p);
    },
    options: (state, sc) => {
      const p = state.people[sc.personId] || null;
      return [
        { id: 'loud', label: KP.fillPro('Welcome {her} back loudly', p) },
        { id: 'quiet', label: 'Let it be quiet' },
      ];
    },
    resolve: (state, sc, optionId) => {
      const S = KP.C.SCAR;
      const p = state.people[sc.personId];
      if (!p) return {};
      if (optionId === 'loud') {
        p.morale = KP.clamp(p.morale + S.recoveryMorale, 0, 100);
        KP.recordDirected(state, p.id, 'welcomedBack', 2);
        p.history.push({ week: state.week, text: KP.fillPro('Came back from the hardest stretch to a company that made sure everyone saw {her}.', p) });
        return { toast: KP.fillPro('The next content schedule is suddenly full of {her} — center of the selca, first out of the van, {pos} verse in the fancam edit. The message, to {her} and to everyone watching, is unambiguous: we never went anywhere.', p),
          note: { kind: 'public', ind: 'scarBack', priority: 'normal', personId: p.id,
            text: KP.fillPro(KP.displayName(p) + ' is BACK back — the company put {her} front and center this week and the fandom noticed the noticing.', p) } };
      }
      p.morale = KP.clamp(p.morale + S.quietRecoveryMorale, 0, 100);
      KP.recordDirected(state, p.id, 'welcomedBack', 1);
      p.history.push({ week: state.week, text: KP.fillPro('Came back from the hardest stretch quietly, the way {she} asked.', p) });
      return { toast: KP.fillPro('No announcement, no push. {She} just started being {herself} again on schedule, and the people who watched closely — the ones who matter to {her} — saw it happen at {pos} own pace.', p) };
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return null;
      p.morale = KP.clamp(p.morale + KP.C.SCAR.quietRecoveryMorale, 0, 100);
      // priority high (0.9.18.1): the guilt note is the CONSEQUENCE of
      // ignoring the scene — it must not lose the week to industry noise
      return { kind: 'development', priority: 'high', personId: p.id,
        text: KP.fillPro(KP.displayName(p) + ' found {pos} own way back this week — no plan, no meeting, just time doing what time does. The staff note it with relief and a little guilt about the unopened question on your desk.', p) };
    },
  });

  // the timeline notices the loud return
  KP.onFeedEvent('scarBack', (state, n, rng) => {
    const p = state.people[n.personId];
    if (!p) return null;
    return rng.pick([
      { persona: 'fan', text: KP.fillPro(KP.displayName(p) + ' in the center of every photo this week after everything… the company said with its whole chest that {she} is THEIRS. this is what protection looks like', p) },
      { persona: 'stan', text: KP.fillPro('{pos} first full-volume laugh on camera since the whole thing. I have watched it nine times. welcome back. we kept your seat', p) },
    ]);
  });

  // ---- the weekly shadow (order 858: after the spotlight reads moods) ---
  KP.registerWeekly('scars', 858, function (state, rng, inbox, roster, groups) {
    roster.forEach(p => {
      if (!(p.flags.scar > 0)) return;
      p.flags.scar--;
      if (p.flags.scar === 0) {
        // the shadow lifts — the return is a scene if the desk is clear
        const doorBusy = (state.scenes || []).some(sc =>
          sc.kind === 'idolAsk' || sc.kind === 'idolDoor' || sc.kind === 'scarRecovery');
        if (!doorBusy) {
          KP.openScene(state, { kind: 'scarRecovery', personId: p.id,
            expiresWeek: state.week + 2 });
          inbox.push({ kind: 'development', priority: 'high', personId: p.id,
            text: KP.fillPro(KP.displayName(p) + ' laughed at practice today like nobody was filming — first time since the storm. How {pos} return gets played is on the Desk.', p) });
        } else {
          p.morale = KP.clamp(p.morale + KP.C.SCAR.quietRecoveryMorale, 0, 100);
          inbox.push({ kind: 'development', priority: 'normal', personId: p.id,
            text: KP.fillPro(KP.displayName(p) + ' is coming back to {herself} — quieter than before, steadier than expected. Time did most of it. It usually does.', p) });
        }
      }
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
