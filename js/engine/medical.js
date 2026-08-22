/* The medical desk (v0.10.4, §80 finding 12) — injuries as arcs, not
   a meter. Rare events off high-load weeks open the diagnosis scene:
   full rest (the bench, the seat kept), partial participation (the
   seated-performance notice — the industry's most photographed chair),
   or push through — which the directed ledger judges forever and the
   body files under chronic. Chronic files accumulate: the veteran's
   knee is a character, and it flares on the weeks the calendar is
   heaviest. Shapes at altitude — the file says "the knee," never
   more; the story is the decision, not the anatomy. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.medLedger = state.medLedger ||
      { cases: 0, rested: 0, seated: 0, pushed: 0, chronics: 0, flares: 0 };
    return state.medLedger;
  }
  KP.medLedger = ledger;
  function fileOf(p) { p.medical = p.medical || { chronic: [] }; return p.medical; }

  const PHYS_SITES = ['the knee', 'the ankle', 'the lower back', 'the shoulder'];
  const siteFor = (state, p, kind) => kind === 'vocal' ? 'the voice'
    : PHYS_SITES[Math.floor(KP.hash01([state.seed, 'medsite', p.id, fileOf(p).chronic.length].join('|')) * PHYS_SITES.length)];

  function loadRead(state, p, g) {
    const M = KP.C.MEDICAL;
    const inPromo = g && state.week <= (g.promoUntil || 0);
    const onTour = !!(g && g.tour);
    const inCrunch = !!(g && g.prep && g.prep.crunchUntil && state.week <= g.prep.crunchUntil);
    let risk = M.base;
    if (p.fatigue >= M.fatigueAt) risk *= M.fatigueMult;
    if (inPromo || onTour || inCrunch) risk *= M.loadMult;
    risk *= Math.pow(M.chronicMult, fileOf(p).chronic.length);
    if (p.flags.injuryWatch && state.week <= p.flags.injuryWatch) risk *= M.pushWatchMult;
    return { risk, hot: inPromo || onTour || inCrunch };
  }

  // ---- the diagnosis: three doors, judged forever -----------------------
  KP.registerScene('theDiagnosis', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'The file') + ' · the diagnosis';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      return 'The medical report on ' + (p ? KP.displayName(p) : 'her') + ' is one page and it is about ' +
        sc.site + '. ' + (sc.kindOf === 'vocal'
          ? 'The instrument needs silence, and the schedule sells sound.'
          : 'The body needs weeks, and the calendar sells days.') +
        ' Three doors, and the whole roster will hear which one the company opened: full rest, ' +
        'a seated arrangement that keeps the schedule and shows the chair, or push through and ' +
        'let the schedule win. The file remembers. So does she.';
    },
    options: () => [
      { id: 'rest', label: 'Full rest — bench the schedule' },
      { id: 'seated', label: 'Partial — the seated arrangement' },
      { id: 'push', label: 'Push through' },
    ],
    resolve: (state, sc, optionId) => {
      const p = state.people[sc.personId];
      if (!p) return { toast: 'The file closed itself.' };
      const M = KP.C.MEDICAL;
      const led = ledger(state);
      const rng = KP.rngFor(state);
      let out;
      if (optionId === 'seated') {
        led.seated++;
        p.flags.seatedUntil = state.week + M.seatedWeeks;
        p.morale = KP.clamp(p.morale + 1, 0, 100);
        p.history.push({ week: state.week, text: 'The seated arrangement: ' + sc.site + ' gets the chair, the schedule gets the rest of ' + (p.gender === 'm' ? 'him' : 'her') + '. The most photographed chair in the industry.' });
        KP.note(state, { kind: 'public', ind: 'seatedNotice', priority: 'high', personId: p.id,
          text: KP.fillPro(KP.displayName(p) + ' will join this week’s schedules seated, per medical guidance — the company statement is two sentences and the fandom’s reply is a thousand: {she} showed up. The chair is now part of the stage.', p) });
        out = { toast: 'Seated. The schedule holds; the chair does the talking.' };
      } else if (optionId === 'push') {
        led.pushed++;
        p.morale = KP.clamp(p.morale - 2, 0, 100);
        KP.recordDirected(state, p.id, 'pushedThrough', -1);
        p.flags.injuryWatch = state.week + M.pushWatchWeeks;
        p.medPushes = (p.medPushes || 0) + 1;
        p.history.push({ week: state.week, text: 'The report said rest. The schedule said no. ' + (p.gender === 'm' ? 'He' : 'She') + ' taped ' + sc.site + ' and worked the week — and filed which one the company sided with.' });
        if (rng.chance(M.pushChronicChance)) {
          led.chronics++;
          fileOf(p).chronic.push({ site: sc.site, since: state.week, flares: 0 });
          KP.note(state, { kind: 'health', ind: 'chronicOpened', priority: 'high', personId: p.id,
            text: KP.fillPro('The follow-up on ' + KP.displayName(p) + ' uses the word the first report avoided: chronic. ' + sc.site.charAt(0).toUpperCase() + sc.site.slice(1) + ' is on {her} file now — not an injury, a CHARACTER. It will have opinions about every heavy week from here.', p) });
        }
        if (p.medPushes >= M.playedHurtAt) {
          const nar = KP.recordEvidence(state, 'playedHurt', 'idol', p.id);
          if (nar) KP.note(state, nar);
        }
        out = { toast: 'The week is worked. The file is longer. The ledger she reads is too.' };
      } else {
        led.rested++;
        p.flags.burnout = rng.int(M.restMin, M.restMax);
        p.morale = KP.clamp(p.morale + 2, 0, 100);
        KP.recordDirected(state, p.id, 'protectedHealth', 1);
        p.history.push({ week: state.week, text: 'Pulled from the schedule for ' + sc.site + ' — a real rest with a real end date, and a company that chose the body over the calendar. Noted.' });
        KP.note(state, { kind: 'public', ind: 'medicalRest', priority: 'high', personId: p.id,
          text: KP.fillPro(KP.displayName(p) + ' steps back on medical guidance — ' + sc.site + ', weeks not days, seat kept. The fandom’s reply is the industry’s one unanimous sentence: health first, we will be here.', p) });
        out = { toast: 'Benched with a return date. The roster saw which door the company opened.' };
      }
      state.rngState = rng.state();
      return out;
    },
    expire: (state, sc) => {
      // nobody decided — medical staff default to the protective door
      const p = state.people[sc.personId];
      if (p) {
        const rng = KP.rngFor(state);
        ledger(state).rested++;
        p.flags.burnout = rng.int(KP.C.MEDICAL.restMin, KP.C.MEDICAL.restMax);
        state.rngState = rng.state();
      }
      return null;
    },
  });

  // ---- the week: rare events, chronic flares ----------------------------
  KP.registerWeekly('medical', 290, function (state, rng, inbox, roster) {
    const M = KP.C.MEDICAL;
    const led = ledger(state);
    const sceneOpen = () => (state.scenes || []).some(sc => sc.kind === 'theDiagnosis');
    roster.forEach(p => {
      if (p.status !== 'idol' || KP.onBreak(p)) return;
      const g = KP.groupOf(state, p.id);
      const { risk, hot } = loadRead(state, p, g);
      // the seated clock runs out quietly
      if (p.flags.seatedUntil && state.week >= p.flags.seatedUntil) delete p.flags.seatedUntil;
      // chronic files flare on the heavy weeks
      if (hot && fileOf(p).chronic.length) {
        fileOf(p).chronic.forEach(c => {
          if (!rng.chance(M.flareChance)) return;
          c.flares++;
          led.flares++;
          p.fatigue = KP.clamp(p.fatigue + M.flareFatigue, 0, 100);
          if (c.flares <= 2) {
            inbox.push({ kind: 'health', ind: 'chronicFlare', priority: 'flavor', personId: p.id,
              text: KP.displayName(p) + ' worked the week around ' + c.site + ' again — the trainers taped it, the schedule pretended not to see it, and everyone backstage moved the props two steps closer without being asked.' });
          }
        });
      }
      // the new case: rare, load-priced, one desk at a time
      if (sceneOpen()) return;
      const vocalLead = g && p.talents.vocals.cur >= 60 &&
        (state.week <= (g.promoUntil || 0) ||
         (g.prep && (g.prep.stations || []).some(st => st.id === 'recording' && !st.done)));
      const vocalRoll = vocalLead && p.fatigue >= 60 && rng.chance(M.nodulesBase);
      const physRoll = rng.chance(risk);
      if (!vocalRoll && !physRoll) return;
      const kindOf = vocalRoll ? 'vocal' : 'physical';
      led.cases++;
      KP.openScene(state, { kind: 'theDiagnosis', personId: p.id, kindOf,
        site: siteFor(state, p, kindOf), expiresWeek: state.week + 2 });
      inbox.push({ kind: 'health', ind: 'diagnosisIn', priority: 'high', personId: p.id,
        text: KP.fillPro('The clinic report on ' + KP.displayName(p) + ' is on the desk and it is not routine — ' + (kindOf === 'vocal' ? 'the voice' : 'a working part of the job') + ' needs a decision, not a schedule. Three doors on the Desk. The roster will hear which one opens.', p) });
    });
  });

  // ---- the timeline reacts ---------------------------------------------
  KP.onFeedEvent('seatedNotice', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'she performed the whole stage SEATED and it was still the best stage of the week. the chair is getting a fan account. this is not a joke. it has 4k followers' },
    { persona: 'casual', text: 'the seated-performance notice: the one piece of idol-industry theater that is somehow also just… true, and kind, and good. protect it' },
  ]));
  KP.onFeedEvent('medicalRest', (state, n, rng) => rng.pick([
    { persona: 'fan', text: 'health first. seat kept. we will be here. the three sentences every fandom has memorized and means every time' },
    { persona: 'press', text: 'A rest notice with an actual end date — rarer than it should be. Companies that write these keep their veterans; companies that don’t keep their schedules.' },
  ]));
  KP.onFeedEvent('chronicOpened', (state, n, rng) => rng.chance(0.5) ? rng.pick([
    { persona: 'fan', text: 'the word "chronic" in an official statement ages a fandom ten years in one line. tape it, pace it, PROTECT her, we are begging' },
    { persona: 'casual', text: 'every veteran act carries a file like this and the industry treats it as a rounding error until, suddenly, structurally, it is not' },
  ]) : null);
})(typeof window !== 'undefined' ? window : globalThis);
