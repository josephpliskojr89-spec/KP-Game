/* The bad blood (v0.9.21, §55.3 + §55.13, map slot 6) — "conflict must
   COST and the fandom must amplify." Three tiers of rivalry, one
   principle:
   - in-group: a pair that stays in open conflict long enough HARDENS
     into a named rivalry with felt effects — chemistry drag, credit
     disputes, the distance the cameras notice;
   - in-company: two own groups on one calendar cannibalize, and their
     fandoms turn on each other;
   - in-scene: professional rivalries form from SOURCES beyond the
     shared week — the debut class, the concept, the position, the
     award taken twice — and every meeting after that has stakes.
   Plus the fansite masters: the fandom warfare gets named faces with
   funding power, closeness, and turn risk. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.badBloodLedger = state.badBloodLedger ||
      { inGroup: 0, buried: 0, disputes: 0, cannibal: 0, scene: 0, fanWars: 0, masters: 0, turns: 0 };
    return state.badBloodLedger;
  }
  function pairKey(a, b) { return a.id < b.id ? a.id + '~' + b.id : b.id + '~' + a.id; }

  // ---- tier 3 read-throughs (UI + effects use these) -------------------
  KP.sceneRivalries = function (state, groupId) {
    return (state.sceneRivalries || []).filter(r =>
      r.groupId === groupId && r.status === 'live');
  };
  KP.sceneRivalryWith = function (state, groupId, actId) {
    return (state.sceneRivalries || []).find(r =>
      r.groupId === groupId && r.actId === actId && r.status === 'live') || null;
  };

  const SOURCE_WORD = {
    class: 'the debut-class rivalry',
    concept: 'the concept rivalry',
    position: 'the same-seat rivalry',
    award: 'the award rivalry',
    calendar: 'the calendar feud, grown personal',
  };

  KP.registerWeekly('badBlood', 592, function (state, rng, inbox, roster, groups) {
    const B = KP.C.BADBLOOD;
    const led = ledger(state);
    const rels = state.relationships || {};

    // ---- tier 1: the in-group rivalry ---------------------------------
    groups.forEach(g => {
      if (g.retiredWeek || g.members.length < 2) return;
      const members = g.members.map(id => state.people[id]).filter(Boolean);
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const a = members[i], b = members[j];
          const rel = rels[pairKey(a, b)];
          if (!rel) continue;
          const inConflict = KP.relState(rel.score).key === 'conflict';
          if (!rel.rivalry) {
            rel.coldStreak = inConflict ? (rel.coldStreak || 0) + 1 : 0;
            if (rel.coldStreak >= B.coldWeeksToRivalry && rng.chance(B.rivalryChance)) {
              rel.rivalry = { since: state.week };
              led.inGroup++;
              a.history.push({ week: state.week, text: 'The thing with ' + KP.displayName(b) + ' stopped being a phase and got a name nobody says out loud. The room plans around it now.' });
              b.history.push({ week: state.week, text: 'The thing with ' + KP.displayName(a) + ' stopped being a phase and got a name nobody says out loud. The room plans around it now.' });
              inbox.push({ kind: 'development', urgent: true, personId: a.id,
                text: 'The staff stopped calling it friction: ' + KP.publicGiven(a) + ' and ' + KP.publicGiven(b) +
                  ' are RIVALS now, inside one lineup — separate vans when possible, camera blocking that keeps a body between them, and a room that reads the seating chart before it reads the schedule. This costs something every single week.' });
            }
          } else {
            // the hatchet: sustained recovery buries it — mediation and
            // time are the handles the game already sells
            rel.thawStreak = inConflict ? 0 : (rel.thawStreak || 0) + 1;
            if (rel.thawStreak >= B.buryWeeks) {
              delete rel.rivalry; delete rel.coldStreak; delete rel.thawStreak;
              led.buried++;
              inbox.push({ kind: 'development', priority: 'high', personId: a.id,
                text: KP.publicGiven(a) + ' and ' + KP.publicGiven(b) + ' were seen running lines together, voluntarily, twice. The staff are calling the rivalry buried — carefully, quietly, the way you talk about weather that might come back.' });
            }
            // the distance the cameras notice
            if (g.debuted && state.week <= (g.promoUntil || 0) && rng.chance(B.didntStandChance)) {
              const dn = KP.igniteDiscourse(state, rng, 'didntStand', 'idol', a.id, g.id);
              if (dn) inbox.push(dn);
            }
          }
        }
      }
    });

    // ---- tier 2: the in-company cannibalization -----------------------
    // two own groups promoting the same week split one audience
    const promoting = groups.filter(g => g.debuted && !g.retiredWeek &&
      state.week <= (g.promoUntil || 0) && state.week > (g.lastReleaseWeek || 0));
    if (promoting.length >= 2 && state.week > (state.civilWarQuietUntil || 0) &&
        rng.chance(B.civilWarChance)) {
      state.civilWarQuietUntil = state.week + 10;
      led.cannibal++;
      const [ga, gb] = promoting;
      const dn = KP.igniteDiscourse(state, rng, 'civilWar', 'group', ga.id, ga.id);
      if (dn) inbox.push(dn);
      inbox.push({ kind: 'public', groupId: ga.id,
        text: ga.name + ' and ' + gb.name + ' are promoting the same weeks, from the same building, at the same shows — and their fandoms have stopped pretending to be one family. The company calendar did this, and both fandoms have noticed exactly whose calendar it is.' });
    }

    // ---- tier 3: the professional rivalries ---------------------------
    state.sceneRivalries = state.sceneRivalries || [];
    // heat cools between meetings; a cold rivalry fades from the papers
    state.sceneRivalries.forEach(r => {
      if (r.status !== 'live') return;
      r.heat = Math.max(0, (r.heat || 0) - B.heatDecay);
      const act = KP.rivalActById && KP.rivalActById(state, r.actId);
      if (!act || act.act.retired) { r.status = 'faded'; r.fadedWeek = state.week; }
    });
    // formation: each debuted player group scans its sources
    groups.forEach(g => {
      if (!g.debuted || g.retiredWeek || !g.members.length) return;
      if (KP.sceneRivalries(state, g.id).length >= B.maxSceneRivalries) return;
      if (!rng.chance(B.formChance)) return;
      const gYear = Math.floor(((g.debutWeek || 1) - 1) / KP.C.WEEKS_PER_YEAR) + 1;
      const candidates = [];
      (state.rivals || []).forEach(rv => (rv.acts || []).forEach(a => {
        if (a.retired || KP.sceneRivalryWith(state, g.id, a.id)) return;
        const aYear = Math.floor(((a.debutWeek || 1) - 1) / KP.C.WEEKS_PER_YEAR) + 1;
        const bothMatter = (g.popularity || 0) >= B.classPopMin && (a.popularity || 0) >= B.classPopMin;
        if (bothMatter && aYear === gYear) candidates.push({ a, rv, source: 'class' });
        else if (bothMatter && a.concept === (g.concept || (g.prep && g.prep.conceptId))) candidates.push({ a, rv, source: 'concept' });
        else if (bothMatter && Math.abs((a.popularity || 0) - (g.popularity || 0)) <= B.positionGap &&
          (g.popularity || 0) >= 55) candidates.push({ a, rv, source: 'position' });
        else if ((g.feuds && g.feuds[a.id] &&
          (g.feuds[a.id].wins + g.feuds[a.id].losses) >= B.feudUpgradeAt)) candidates.push({ a, rv, source: 'calendar' });
      }));
      // the award source: the name that keeps taking the daesang
      const daesangs = {};
      (state.awardHistory || []).forEach(res => {
        if (res && res.kind === 'daesang' && !res.isPlayer && res.name) {
          daesangs[res.name] = (daesangs[res.name] || 0) + 1;
        }
      });
      (state.rivals || []).forEach(rv => (rv.acts || []).forEach(a => {
        if (a.retired || KP.sceneRivalryWith(state, g.id, a.id)) return;
        if ((daesangs[a.name] || 0) >= B.awardBeatenTwice &&
            !(state.awardHistory || []).some(res => res.kind === 'daesang' && res.isPlayer)) {
          candidates.push({ a, rv, source: 'award' });
        }
      }));
      if (!candidates.length) return;
      const pick = candidates[rng.int(0, candidates.length - 1)];
      state.sceneRivalries.push({
        id: 'sr' + ((state.nextRivalryId = (state.nextRivalryId || 0) + 1)),
        groupId: g.id, actId: pick.a.id, actName: pick.a.name, company: pick.rv.short,
        source: pick.source, since: state.week, heat: 12, status: 'live', clashes: 0,
      });
      led.scene++;
      inbox.push({ kind: 'public', ind: 'rivalryNamed', priority: 'high', groupId: g.id,
        text: 'The coverage found its angle: ' + g.name + ' vs ' + pick.a.name + ' (' + pick.rv.short + ') — ' +
          SOURCE_WORD[pick.source] + '. Neither company chose it and neither can un-choose it now: every chart week, every stage, every year-end table will be read through it. The fandoms have already picked their trenches.' });
    });
    // the war: shared release weeks ignite, and the rivalry remembers
    groups.forEach(g => {
      if (!g.debuted || g.retiredWeek) return;
      KP.sceneRivalries(state, g.id).forEach(r => {
        const act = KP.rivalActById && KP.rivalActById(state, r.actId);
        if (!act) return;
        const shared = g.lastReleaseWeek === state.week || act.act.lastReleaseWeek === state.week;
        const bothLive = state.week - (g.lastReleaseWeek || -99) <= 2 &&
          state.week - (act.act.lastReleaseWeek || -99) <= 2;
        if (shared && bothLive) {
          r.heat = Math.min(100, (r.heat || 0) + B.heatPerClash);
          r.clashes++;
          led.fanWars++;
          if (rng.chance(B.fanWarChance)) {
            const dn = KP.igniteDiscourse(state, rng, 'fanWar', 'group', g.id, g.id);
            if (dn) inbox.push(dn);
          }
          if (r.heat >= B.namedAt && !r.named) {
            r.named = true;
            const nar = KP.recordEvidence(state, 'archRivals', 'group', g.id, { foe: r.actName });
            if (nar) inbox.push(nar);
          }
        }
      });
    });

    // ---- the fansite masters ------------------------------------------
    const F = KP.C.FANSITE;
    const cast = state.feedCast = state.feedCast || {};
    // graduation: a biased regular with tenure and a subject worth the lens
    Object.keys(cast).forEach(h => {
      const c = cast[h];
      if (!c.biasId || c.master) return;
      const p = state.people[c.biasId];
      if (!p || p.status !== 'idol') return;
      if (state.week - (c.since || 0) < F.masterTenure) return;
      if ((p.social || 0) < F.masterSocialMin) return;
      const already = Object.values(cast).filter(x => x.master && !x.master.turned && x.biasId === c.biasId).length;
      if (already >= F.maxPerPerson) return;
      c.master = { since: state.week };
      led.masters++;
      const g = KP.groupOf(state, p.id);
      inbox.push({ kind: 'public', ind: 'masterMinted', priority: 'high', personId: p.id,
        text: KP.fillPro('The account everyone already followed made it official: @' + h + ' is now a full fansite master for ' + KP.displayName(p) +
          ' — the airport previews, the cake trucks, the lens that costs more than a car. Organized devotion with a budget. ' +
          (g ? g.name + '’s fandom infrastructure just gained a load-bearing wall.' : 'The fandom just gained a load-bearing wall.'), p) });
    });
    // the funding: a master banks the countdown (once per era)
    groups.forEach(g => {
      if (!g.prep || !g.prep.teaserBeat || g.prep.teaserBeat.week !== state.week) return;
      if (g.prep.masterFunded) return;
      const master = Object.entries(cast).find(([, c]) =>
        c.master && !c.master.turned && g.members.includes(c.biasId));
      if (!master) return;
      g.prep.masterFunded = true;
      g.prep.buildup = (g.prep.buildup || 0) + F.fundBuildup;
      if (g.fandom) KP.fandomGain(g, F.fundFandom);
      const p = state.people[master[1].biasId];
      inbox.push({ kind: 'public', personId: p && p.id,
        text: '@' + master[0] + ' bought the comeback a subway station: pillar wraps, a countdown screen, the works — fansite money moving faster than the marketing budget. The company sent a fruit basket, which is the protocol for being publicly out-spent by a fan.' });
    });
    // the turn: a betrayal trigger flips the account into receipts
    Object.keys(cast).forEach(h => {
      const c = cast[h];
      if (!c.master || c.master.turned || !c.biasId) return;
      const p = state.people[c.biasId];
      if (!p) return;
      const wounded = (p.directed || []).some(d =>
        F.turnTriggers.includes(d.kind) && state.week - d.week <= 2);
      if (wounded && rng.chance(F.turnChance)) {
        c.master.turned = state.week;
        c.biasId = null;   // the account closes; the person is not the target
        led.turns++;
        const g = KP.groupOf(state, p.id);
        if (g && g.fandom) KP.fandomGain(g, -F.turnFandom);
        const dn = KP.igniteDiscourse(state, rng, 'masterTurn', 'idol', p.id, g && g.id);
        if (dn) inbox.push(dn);
        inbox.push({ kind: 'public', ind: 'masterTurned', priority: 'critical', personId: p.id,
          text: '@' + h + ' posted a closing notice at 2am — the format every fandom dreads: thanks, dates, and a last paragraph aimed straight at the COMPANY. “She deserved better than this building.” The receipts thread under it is long, organized, and not wrong about the dates. The gasoline has a face, and it used to be on your side.' });
      }
    });
  });

  // ---- the felt effects other modules read ----------------------------
  // tier 1 stage cost: a named rivalry drags chemistry beyond its scores
  // (hooked from relationships.groupChemistry via this read)
  KP.rivalryDragFor = function (state, a, b) {
    const rel = (state.relationships || {})[pairKey(a, b)];
    return rel && rel.rivalry ? KP.C.BADBLOOD.rivalryChemDrag : 0;
  };

  // ---- the timeline reacts --------------------------------------------
  KP.onFeedEvent('rivalryNamed', (state, n, rng) => {
    const g = KP.groupById(state, n.groupId);
    if (!g) return null;
    return rng.pick([
      { persona: 'press', text: 'The ' + g.name + ' rivalry coverage has reached the stage where both fandoms accuse the press of inventing it while producing sixty charts a day about it.' },
      { persona: 'casual', text: 'I do not have a side in the ' + g.name + ' thing. I have a snack and a front-row timeline seat. this is better than the music sometimes and I say that with love' },
    ]);
  });
  KP.onFeedEvent('masterMinted', (state, n, rng) => {
    const p = state.people[n.personId];
    if (!p) return null;
    return { persona: 'fan', text: KP.fillPro('the new ' + KP.publicGiven(p) + ' fansite master posted ONE preview photo and the quality jumped a generation. we are being fed by professionals now. blessed era', p) };
  });
  KP.onFeedEvent('masterTurned', (state, n, rng) => {
    const p = state.people[n.personId];
    if (!p) return null;
    return rng.pick([
      { persona: 'fan', text: 'a fansite closing notice with RECEIPTS. I have read it four times. I am not okay and neither is the company reply section' },
      { persona: 'anti', text: 'when the fansite masters start posting the dates and the flight numbers, that is not hating, that is journalism. we been said this' },
    ]);
  });
})(typeof window !== 'undefined' ? window : globalThis);
