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
      return 'The storm around ' + KP.displayName(p) + ' burned out weeks ago, but she has been carrying it — quieter on camera, careful in a way she never used to be. This week, for the first time, she laughed at practice like nobody was filming. The staff want to know how to play her return.';
    },
    options: () => [
      { id: 'loud', label: 'Welcome her back loudly' },
      { id: 'quiet', label: 'Let it be quiet' },
    ],
    resolve: (state, sc, optionId) => {
      const S = KP.C.SCAR;
      const p = state.people[sc.personId];
      if (!p) return {};
      if (optionId === 'loud') {
        p.morale = KP.clamp(p.morale + S.recoveryMorale, 0, 100);
        KP.recordDirected(state, p.id, 'welcomedBack', 2);
        p.history.push({ week: state.week, text: 'Came back from the hardest stretch to a company that made sure everyone saw her.' });
        return { toast: 'The next content schedule is suddenly full of her — center of the selca, first out of the van, her verse in the fancam edit. The message, to her and to everyone watching, is unambiguous: we never went anywhere.',
          note: { kind: 'public', ind: 'scarBack', priority: 'normal', personId: p.id,
            text: KP.displayName(p) + ' is BACK back — the company put her front and center this week and the fandom noticed the noticing.' } };
      }
      p.morale = KP.clamp(p.morale + S.quietRecoveryMorale, 0, 100);
      KP.recordDirected(state, p.id, 'welcomedBack', 1);
      p.history.push({ week: state.week, text: 'Came back from the hardest stretch quietly, the way she asked.' });
      return { toast: 'No announcement, no push. She just started being herself again on schedule, and the people who watched closely — the ones who matter to her — saw it happen at her own pace.' };
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return null;
      p.morale = KP.clamp(p.morale + KP.C.SCAR.quietRecoveryMorale, 0, 100);
      return { kind: 'development', priority: 'normal', personId: p.id,
        text: KP.displayName(p) + ' found her own way back this week — no plan, no meeting, just time doing what time does. The staff note it with relief and a little guilt about the unopened question on your desk.' };
    },
  });

  // the timeline notices the loud return
  KP.onFeedEvent('scarBack', (state, n, rng) => {
    const p = state.people[n.personId];
    if (!p) return null;
    return rng.pick([
      { persona: 'fan', text: KP.displayName(p) + ' in the center of every photo this week after everything… the company said with its whole chest that she is THEIRS. this is what protection looks like' },
      { persona: 'stan', text: 'her first full-volume laugh on camera since the whole thing. I have watched it nine times. welcome back. we kept your seat' },
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
            text: KP.displayName(p) + ' laughed at practice today like nobody was filming — first time since the storm. How her return gets played is on the Desk.' });
        } else {
          p.morale = KP.clamp(p.morale + KP.C.SCAR.quietRecoveryMorale, 0, 100);
          inbox.push({ kind: 'development', priority: 'normal', personId: p.id,
            text: KP.displayName(p) + ' is coming back to herself — quieter than before, steadier than expected. Time did most of it. It usually does.' });
        }
      }
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
