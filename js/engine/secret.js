/* The secret (v0.9.30, map slot 11, §72) — dating & Dispatch, under
   the FULL content law. The relationship is real, never player-
   controlled, never detailed: no partner identity beyond a sphere,
   no bodies, adults only. The player's whole game is the COMPANY's
   side — secrecy logistics, the camera clock, the reveal, the
   response menu, the fandom's spectrum. Snark aims at the cameras
   and the industry's norms. She is written with care, always. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.secretLedger = state.secretLedger ||
      { secrets: 0, briefs: 0, reveals: 0, confirms: 0, statements: 0,
        denials: 0, silences: 0, resurfaces: 0, protectedWeeks: 0 };
    return state.secretLedger;
  }
  function tabloid(state, p) {
    const T = KP.C.SECRET.TABLOIDS;
    return T[Math.floor(KP.hash01([state.seed, p.id, 'lens'].join('|')) * T.length)];
  }
  function fameOf(state, p) { return KP.renewalRead(state, p).fame; }

  KP.registerWeekly('secret', 794, function (state, rng, inbox, roster) {
    const S = KP.C.SECRET;
    const led = ledger(state);

    roster.forEach(p => {
      // ---- formation: a private life sometimes deepens (adults only) --
      if (!p.flags.secret && p.flags.privateNote && p.age >= 19 &&
          p.status === 'idol' && !KP.onBreak(p) && rng.chance(S.formChance)) {
        p.flags.secret = { since: state.week,
          sphere: rng.chance(S.industrySphereShare) ? 'industry' : 'outside' };
        led.secrets++;
      }
      const sec = p.flags.secret;
      if (!sec) return;

      // ---- the manager's careful brief: the player learns, once ------
      if (!sec.briefed && state.week - sec.since >= S.briefWeeks) {
        sec.briefed = true;
        led.briefs++;
        inbox.push({ kind: 'development', urgent: true, personId: p.id,
          text: KP.fillPro(KP.displayName(p) + '’s manager closed your door to say it in one sentence: {she} is seeing someone — ' +
            (sec.sphere === 'industry' ? 'someone whose schedule looks like {hers}' : 'someone with a normal life, outside all of this') +
            ' — and it is serious enough to know about. That is ALL the company gets to know; the rest is {hers}. The only question on this desk is logistics: quiet costs money, and cameras never sleep.', p) });
      }
      if (!sec.briefed || sec.revealed) {
        // ---- recovery: the room heals at the pace the answer set ------
        if (sec.revealed && sec.recovery > 0) {
          const g = KP.groupOf(state, p.id);
          if (g && g.fandom) g.fandom.intensity = KP.clamp(g.fandom.intensity + sec.recovery, 0, 100);
          if (state.week - sec.revealedWeek >= S.recoveryWeeks) sec.recovery = 0;
        }
        // a denial is a loan: the second set of photos can land
        if (sec.revealed && sec.denied && !sec.resurfaced &&
            rng.chance(S.resurfaceChance / 24)) {
          sec.resurfaced = true;
          led.resurfaces++;
          const g = KP.groupOf(state, p.id);
          if (g && g.fandom) g.fandom.intensity = KP.clamp(g.fandom.intensity - S.denyResurfaceFandom, 0, 100);
          p.morale = KP.clamp(p.morale - 6, 0, 100);
          inbox.push({ kind: 'public', ind: 'secretResurfaced', priority: 'critical', personId: p.id,
            text: KP.fillPro(tabloid(state, p) + ' ran the second set of photos, and this time the story is not the relationship — it is the DENIAL. The fandom’s anger has two addresses and the company’s is first. ' + KP.displayName(p) + ' said nothing, which everyone understood: {she} wanted to say something true the first time.', p) });
        }
        return;
      }

      // ---- the camera clock ------------------------------------------
      const g = KP.groupOf(state, p.id);
      const promoting = g && g.debuted && state.week <= (g.promoUntil || 0);
      let risk = S.riskBase + fameOf(state, p) * S.riskPerFame + (promoting ? S.riskPromo : 0);
      if (p.flags.protectedLife) { risk *= S.protectFactor; state.budget -= S.protectCost; led.protectedWeeks++; }
      if (rng.chance(risk)) {
        sec.revealed = true;
        sec.revealedWeek = state.week;
        led.reveals++;
        KP.openScene(state, { kind: 'theReveal', personId: p.id, expiresWeek: state.week + 2 });
        KP.note(state, { kind: 'public', ind: 'theReveal', priority: 'critical', personId: p.id,
          text: KP.fillPro(tabloid(state, p) + ' published the photos at midnight, the way they always do: ' + KP.displayName(p) + ', a parking garage, an umbrella held by someone the caption calls “a companion.” The story is thin because there is no story — two adults, one dinner, forty telephoto frames. The phones started at 12:01. The response is due before the morning shows open.', p) });
      }
    });
  });

  // ---- the response menu ------------------------------------------------
  KP.registerScene('theReveal', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'The artist') + ' · the midnight photos';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return '';
      return KP.fillPro('The photos are out and say almost nothing, which has never once stopped a cycle. ' + KP.displayName(p) + ' is on the phone with {pos} manager, calmer than the building is. What {she} asked for, exactly: “Tell me what the company is going to say, before it says it.” Four answers exist. All of them are about the company — none of them get a vote on {pos} life.', p);
    },
    options: () => [
      { id: 'confirm', label: 'Confirm, warmly — ask for privacy' },
      { id: 'statement', label: 'The privacy statement' },
      { id: 'deny', label: 'Deny it' },
      { id: 'silence', label: 'Say nothing' },
    ],
    resolve: (state, sc, optionId) => {
      const S = KP.C.SECRET;
      const p = state.people[sc.personId];
      if (!p || !p.flags.secret) return {};
      const sec = p.flags.secret;
      const g = KP.groupOf(state, p.id);
      const led = ledger(state);
      const hit = (amt, rec) => {
        if (g && g.fandom) g.fandom.intensity = KP.clamp(g.fandom.intensity - amt, 0, 100);
        sec.recovery = rec;
      };
      if (optionId === 'confirm') {
        led.confirms++;
        hit(S.confirmFandom, S.confirmRecovery);
        p.morale = KP.clamp(p.morale + S.confirmMorale, 0, 100);
        KP.recordDirected(state, p.id, 'stoodByHer', 2);
        p.history.push({ week: state.week, text: 'The company confirmed it warmly and asked for privacy — the statement she got to read before it went out. She kept a printed copy. Some employers say the true thing.' });
        return { toast: KP.fillPro('Confirmed, warmly, with the privacy ask — and {she} read it before the world did. The room will take it hard and heal honest. {She} will remember this exact sentence for the rest of {pos} career.', p) };
      }
      if (optionId === 'statement') {
        led.statements++;
        hit(S.statementFandom, S.statementRecovery);
        p.history.push({ week: state.week, text: 'The privacy statement — neither confirmed nor denied, professionally worded. The middle path, walked carefully.' });
        return { toast: 'The privacy statement goes out: her personal life is her own, the company asks the cameras to mind their business. Nobody is satisfied and nobody is bleeding. The middle path costs less and heals slower.' };
      }
      if (optionId === 'deny') {
        led.denials++;
        sec.denied = true;
        hit(S.denyFandom, 0.2);
        p.morale = KP.clamp(p.morale + S.denyMorale, 0, 100);
        KP.recordDirected(state, p.id, 'madeHerHide', -2);
        p.history.push({ week: state.week, text: 'The company denied it. She read the statement twice, said “understood,” and hung up. What it cost her is not on any ledger the office keeps.' });
        return { toast: KP.fillPro('Denied. The cycle dies by Thursday — cheapest answer on the board. {She} said “understood” in the flattest voice {pos} manager has ever heard, and the cameras, who know what they photographed, are patient.', p) };
      }
      led.silences++;
      hit(S.silenceFandom, 0.3);
      p.history.push({ week: state.week, text: 'The company said nothing about the photos. The silence got louder every day for a week, then became the story.' });
      return { toast: 'No statement. The fandom fills silence with everything they fear, the trades fill it with columns, and the cameras fill it with a follow-up assignment. Sometimes nothing is a plan. Usually it is a delay.' };
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p || !p.flags.secret) return null;
      const S = KP.C.SECRET;
      const g = KP.groupOf(state, p.id);
      ledger(state).silences++;
      if (g && g.fandom) g.fandom.intensity = KP.clamp(g.fandom.intensity - S.silenceFandom, 0, 100);
      p.flags.secret.recovery = 0.3;
      return { kind: 'company', personId: p.id,
        text: 'The morning shows opened with no statement on the record — the desk let the deadline answer for it. Silence is also a response. It is just never read as one.' };
    },
  });

  // ---- the protect posture: a player verb on the person -----------------
  KP.setProtectedLife = function (state, personId, on) {
    const p = state.people[personId];
    if (!p) return { ok: false };
    p.flags.protectedLife = !!on || undefined;
    if (!on) delete p.flags.protectedLife;
    return { ok: true };
  };

  // ---- the spectrum: the feed, aimed at the cameras and the norms -------
  KP.onFeedEvent('theReveal', (state, n, rng) => {
    const p = n.personId ? state.people[n.personId] : null;
    const name = p ? KP.publicGiven(p) : 'her';
    return rng.pick([
      { persona: 'fan', text: 'so the midnight photos are of ' + name + ' having DINNER. adults eat dinner. I am sad in a way I need to sit with and also none of this is my business and BOTH things are true. rest of the fandom, be normal, I am begging' },
      { persona: 'stan', text: 'the tabloid staked out a parking garage for six weeks to photograph an umbrella. imagine telling your parents that is your job. protect ' + name + ' at all costs, the account said, meaning it' },
      { persona: 'casual', text: 'an idol was photographed existing near another adult and four hashtags are trending. the industry that built this expectation is the actual story and nobody will run it' },
      { persona: 'press', text: 'The cycle will run a week. The photographs show nothing. The economics of the midnight drop, however, remain excellent — which is the only sentence in this story that explains anything.' },
    ]);
  });
  KP.onFeedEvent('secretResurfaced', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'the second set of photos isn’t the story. the DENIAL is the story. she wanted to tell us something true and a press release got there first. I’m not mad at her. I was never going to be mad at her' },
    { persona: 'casual', text: 'company denies thing, thing turns out true, fandom angrier about the lie than the thing. every industry, every time, and the tabloids collect twice' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
