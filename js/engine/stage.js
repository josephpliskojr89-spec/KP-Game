/* The stage, judged (v0.10.37, §91 Phase 4) — ONE rating per
   performance. `KP.stageRead(state, g, stage)` reads the era's record
   on the people who are on the stage tonight: each voice against her
   LOAD on the sheet (the song's vocal demand, scaled by her share),
   each body against the choreography, presence, live reliability
   (reps and stage IQ), fatigue (steeper than the old read), morale (a
   low room goes through the motions); then the FORMATION — chemistry,
   the pairs (tense ones read cold, close ones read as not acting), the
   rehearsal chair, the choreography against the room, the holes — and
   a hash wobble per (seed, stage, week): television, not the stream.
   Consumers read the one number: the three shows' live term, the
   encore and fancam lotteries, the ending fairy, intensity and morale,
   the storms that wake on a bad night, the festivals, the tour's
   nights, the gayo stage, the circuit, the booking pile. The read
   posts IN WORDS, at most once a week per act. Bad decisions have
   teeth: punishing choreography on a tired room is a fumbled stage on
   national television. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};
  const S = () => KP.C.STAGE;

  function ledger(state) {
    state.stageLedger = state.stageLedger ||
      { rated: 0, carried: 0, fumbled: 0, lines: 0, encores: 0, storms: 0, fancams: 0,
        pairsRead: 0, distance: 0, festCarried: 0, badNights: 0 };
    return state.stageLedger;
  }
  KP.stageLedger = ledger;

  // ---- the record on the stage ------------------------------------------
  // the era's song: its lane, its demands, its sheet, its choreography.
  // A room without a record sings the house standard.
  function eraOf(state, g) {
    const rel = (g.releases || []).length ? g.releases[g.releases.length - 1] : null;
    const lane = (rel && rel.conceptId) || g.concept || 'bright';
    const demand = rel && rel.liveDemand ? rel.liveDemand : null;
    return {
      lane,
      vocals: demand ? demand.vocals : 55,
      dance: rel && rel.choreo && rel.choreo.difficulty ? rel.choreo.difficulty : (demand ? demand.dance : 50),
      shares: rel && rel.sheet && rel.sheet.shares ? rel.sheet.shares : null,
    };
  }
  KP.stageEra = eraOf;

  KP.stageBand = function (score) {
    const C = S();
    return score >= C.carriedAt ? 'carried' : score >= C.cleanAt ? 'clean' : score >= C.shakyAt ? 'shaky' : 'fumbled';
  };

  // ---- the one read --------------------------------------------------------
  KP.stageRead = function (state, g, stage) {
    const C = S();
    stage = stage || {};
    const era = eraOf(state, g);
    const mix = C.MIX[era.lane] || C.MIX.bright;
    const all = g.members.map(id => state.people[id]).filter(m => m && m.status !== 'released');
    const present = all.filter(m => !KP.onBreak(m));
    const absent = all.length - present.length;
    if (!present.length) {
      return { score: 0, band: 'empty', perMember: {}, moments: {}, formation: 0, pairs: { close: 0, tense: 0 }, present: [], mean: 0 };
    }
    const n = present.length;
    const perMember = {};
    let sum = 0;
    present.forEach(m => {
      const d = KP.derived(m);
      const share = era.shares && era.shares[m.id] != null ? era.shares[m.id] : 1 / n;
      const vBar = Math.max(30, era.vocals * (C.loadBase + share * C.loadPerShare));
      const seated = !!(m.flags && m.flags.seatedUntil && state.week < m.flags.seatedUntil);
      const dance = seated ? m.talents.dance.cur * C.seatedDance : m.talents.dance.cur;
      const voice = Math.min(C.fitCap, m.talents.vocals.cur / vBar);
      const move = Math.min(C.fitCap, dance / Math.max(30, era.dance));
      const pres = Math.min(C.presenceCap, d.stagePresence / C.presenceAt);
      const raw = C.scale * (mix.vocals * voice + mix.dance * move + mix.presence * pres)
        + (d.liveReliability - 50) * C.relPer
        - Math.max(0, m.fatigue - C.fatigueFrom) * C.fatiguePer
        - Math.max(0, C.moraleFrom - m.morale) * C.moralePer;
      const score = KP.clamp(Math.round(raw), 1, 100);
      perMember[m.id] = { score, seated, share: Math.round(share * 1000) / 1000 };
      sum += score;
    });
    const mean = sum / n;
    // the formation: the room, the pairs, the chair, the choreography
    // against the room, the holes
    let form = 0;
    const pairs = { close: 0, tense: 0 };
    if (n > 1) {
      form += (KP.groupChemistry(state, present) - 50) * C.chemPer;
      const rels = state.relationships || {};
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const rel = rels[KP.pairKey(present[i], present[j])];
          if (!rel) continue;
          const st = KP.relState(rel.score).key;
          if (st === 'close') pairs.close++;
          else if (st === 'tense' || st === 'conflict') pairs.tense++;
        }
      }
      form += Math.min(C.closeCap, pairs.close * C.closePair) - Math.min(C.tenseCap, pairs.tense * C.tensePair);
      const avgDance = present.reduce((s2, m) => s2 + m.talents.dance.cur, 0) / n;
      const gap = era.dance - avgDance;
      if (gap > 0) form -= Math.min(C.gapCap, gap * C.gapPer);
      else if (gap <= C.easyAt) form += C.easyBonus;
      form -= Math.min(C.absentCap, absent * C.absentPer);
    }
    if (KP.seatMult) form += (KP.seatMult(state, 'perf') - 1) * C.rehearsalSpan;
    const wobble = (KP.hash01([state.seed, 'stage', stage.kind || 'stage', stage.id || '', state.week, g.id].join('|')) - 0.5) * 2 * C.wobble;
    const score = KP.clamp(Math.round(mean + form + wobble), 1, 100);
    const band = KP.stageBand(score);
    // the moments: who carried, who lost it, whether the formation held
    const sorted = present.slice().sort((a, b) => perMember[b.id].score - perMember[a.id].score);
    const top = sorted[0], low = sorted[sorted.length - 1];
    const moments = {};
    if (n > 1) {
      if (perMember[top.id].score >= C.carrierMin && perMember[top.id].score - mean >= C.momentLead) moments.carried = top.id;
      if (perMember[low.id].score <= C.fumblerMax && mean - perMember[low.id].score >= C.momentLag) moments.fumbled = low.id;
    } else if (band === 'carried') {
      moments.carried = top.id;
    } else if (band === 'fumbled') {
      moments.fumbled = top.id;
    }
    if (form <= C.formationApart) moments.formation = 'apart';
    else if (form >= C.formationLocked) moments.formation = 'locked';
    const seatedOne = present.find(m => perMember[m.id].seated);
    if (seatedOne) moments.seated = seatedOne.id;
    if (absent) moments.shortHanded = absent;
    return { score, band, perMember, moments, formation: Math.round(form * 10) / 10, pairs,
      present: present.map(m => m.id), mean: Math.round(mean) };
  };

  // ---- the words: names, never reads ---------------------------------------
  KP.stageLine = function (state, g, read, where) {
    const mo = read.moments || {};
    where = where || 'the stage';
    const P = id => state.people[id];
    if (mo.carried && mo.formation === 'apart') {
      return KP.fillPro(KP.displayName(P(mo.carried)) + ' carried ' + where + '; the formation came apart behind {her}.', P(mo.carried));
    }
    if (mo.carried && mo.fumbled) {
      return KP.fillPro(KP.displayName(P(mo.carried)) + ' carried ' + where + ' while ' + KP.displayName(P(mo.fumbled)) +
        ' lost {pos} footing in it — the fancams will tell two stories.', P(mo.fumbled));
    }
    if (mo.carried) {
      return KP.fillPro(KP.displayName(P(mo.carried)) + ' carried ' + where +
        (read.band === 'carried' ? ' — the clip is {hers}.' : ' — and the room let {her}.'), P(mo.carried));
    }
    if (mo.fumbled) {
      return KP.displayName(P(mo.fumbled)) + ' lost ' + where + ' in the second chorus; the room covered, visibly.';
    }
    if (read.band === 'carried') {
      return g.name + ' owned ' + where + (mo.formation === 'locked' ? ' — the formation locked from the first count.' : ' — every mark hit, nothing to apologize for.');
    }
    if (read.band === 'clean') {
      return g.name + ' played ' + where + ' clean' + (mo.shortHanded ? ', short-handed and reblocked' : '') + ' — nothing to clip, nothing to explain.';
    }
    if (read.band === 'shaky') {
      return g.name + ' got through ' + where + (mo.formation === 'apart' ? ' with the formation drifting' : ' on a tired room') + ' — the fancams are kind; the wide shot is not.';
    }
    return g.name + ' fumbled ' + where + ' — the sync went, the ad-libs went, and the wide shot kept rolling.';
  };
  // the act's rolling stage craft, in words (the group page)
  KP.stageCraftLine = function (state, g) {
    const C = S();
    if (g.stageCraft == null) return null;
    if (g.stageCraft >= C.carriedAt) return 'On stage this room carries its nights — the broadcast staff stopped worrying about the wide shot.';
    if (g.stageCraft >= C.cleanAt) return 'On stage this room gets through its nights clean; the clips come from somewhere else.';
    if (g.stageCraft >= C.shakyAt) return 'On stage this room is still finding its feet — the wide shot keeps catching it.';
    return 'On stage this room keeps getting exposed. The fancams are kind. Nothing else is.';
  };
  // the member's stage record, in words (the dossier)
  KP.stageRecordLines = function (state, p) {
    const st = p.stages || {};
    const out = [];
    if ((st.carried || 0) >= 3) out.push(KP.fillPro('The stage has been {hers} more than once — when the room needs carrying, the camera already knows where to look.', p));
    else if ((st.carried || 0) >= 1) out.push(KP.fillPro('{She} has carried a stage. The staff noticed; so did the fancams.', p));
    if ((st.fumbled || 0) >= 3) out.push(KP.fillPro('There have been nights the room covered for {her}. The wide shot keeps a list.', p));
    else if ((st.fumbled || 0) >= 1) out.push(KP.fillPro('One night the stage got away from {her}. It happens to everyone once; the second time is a pattern.', p));
    return out;
  };

  // ---- the consequences: paid once per rated stage -------------------------
  // `opts.light`: the booking pile and the circuit — counts and craft,
  // no teeth. Returns the notes the lotteries produced.
  KP.settleStage = function (state, rng, g, read, opts) {
    const C = S();
    const led = ledger(state);
    const notes = [];
    const keep = n => { if (n) notes.push(n); };
    if (!read || read.band === 'empty') return notes;
    opts = opts || {};
    led.rated++;
    const present = read.present.map(id => state.people[id]).filter(Boolean);
    present.forEach(m => {
      m.stages = m.stages || { played: 0, carried: 0, fumbled: 0 };
      m.stages.played++;
    });
    if (read.pairs && (read.pairs.close || read.pairs.tense)) led.pairsRead++;
    g.stageCraft = g.stageCraft == null ? read.score
      : Math.round((g.stageCraft + C.craftAlpha * (read.score - g.stageCraft)) * 10) / 10;
    const mo = read.moments || {};
    if (mo.carried && state.people[mo.carried]) {
      const m = state.people[mo.carried];
      m.stages.carried++;
    }
    if (mo.fumbled && state.people[mo.fumbled]) state.people[mo.fumbled].stages.fumbled++;
    if (read.band === 'carried') led.carried++;
    if (read.band === 'fumbled') led.fumbled++;
    g.lastActivityWeek = state.week;   // the reverse run reads the act's month (v0.11.1, §92 D)
    if (opts.light) return notes;
    // the teeth (ruling 5): a carried stage warms the fandom and the
    // room and writes the performance house; a fumbled one cools them
    const rep = state.company.reputation || (state.company.reputation = {});
    if (read.band === 'carried') {
      rep.performance = KP.clamp((rep.performance || 45) + C.repPer, 0, 100);
      KP.fandomGain(g, C.intensity);
      present.forEach(m => { m.morale = KP.clamp(m.morale + C.morale, 0, 100); });
    } else if (read.band === 'fumbled') {
      rep.performance = KP.clamp((rep.performance || 45) - C.repPer, 0, 100);
      KP.fandomGain(g, -C.intensity);
      present.forEach(m => { m.morale = KP.clamp(m.morale - C.morale, 0, 100); });
    }
    if (!rng) return notes;
    // the lotteries: the clip of the one who carried; the storm around
    // the one who lost it; the distance watch on a fumbled stage with a
    // tense pair in the formation
    if (mo.carried && state.people[mo.carried]) {
      const m = state.people[mo.carried];
      keep(KP.ambitionTouch(state, m, 'stage'));
      if (rng.chance(C.fancamChance)) {
        led.fancams++;
        keep(KP.recordViral(state, m, { kind: 'fancam', label: 'the ' + (opts.where || 'stage') + ' fancam' }));
        keep(KP.igniteDiscourse(state, rng, 'fancam', 'idol', m.id, g.id));
      }
    }
    if (mo.fumbled && state.people[mo.fumbled] && rng.chance(C.stormChance)) {
      led.storms++;
      keep(KP.igniteDiscourse(state, rng, 'encore', 'idol', mo.fumbled, g.id, { from: 'stage' }));
    }
    if (read.band === 'fumbled' && read.pairs && read.pairs.tense && rng.chance(C.distanceChance)) {
      const tense = KP.frictionPairs(state, read.present)[0];
      if (tense) {
        led.distance++;
        keep(KP.igniteDiscourse(state, rng, 'didntStand', 'idol', tense.a.id, g.id));
      }
    }
    return notes;
  };

  // the read posts in words, at most once a week per act
  KP.stageNote = function (state, g, read, where) {
    if (g.stageNoteWeek === state.week) return null;
    g.stageNoteWeek = state.week;
    g.lastStageBand = read.band;   // the promotion (v0.10.38): the offers read the week's stage
    ledger(state).lines++;
    const notable = read.band === 'carried' || read.band === 'fumbled';
    return { kind: 'public', ind: 'stageRead', priority: notable ? 'high' : 'normal', groupId: g.id,
      band: read.band, personId: (read.moments || {}).carried || (read.moments || {}).fumbled || null,
      text: KP.stageLine(state, g, read, where) };
  };

  // the tour's nights (v0.10.37): a bad night sells the next week softer
  KP.nightDemandMult = function (tour) {
    const C = S();
    if (!tour || !tour.lastNight) return 1;
    // the road presser (v0.11.7, §98): a statement after the fumbled night
    // steadies the next room — it sells on its own, not on the clip
    if (tour.lastNight === 'fumbled' && tour.pressered) return 1;
    return tour.lastNight === 'fumbled' ? C.badNightDemand : tour.lastNight === 'carried' ? C.goodNightDemand : 1;
  };
  // the festivals (v0.10.37): a carried set books next year's call
  KP.festivalCertain = function (state, g, year) {
    return !!KP.getNarrative(state, 'festivalIcons', 'group', g.id) || g.festCarried === year - 1;
  };
  // the awards (v0.10.37): the artist ballot has a performance term
  KP.stageAwardsTerm = function (g) {
    const C = S();
    return g.stageCraft == null ? 0 : (g.stageCraft - 55) * C.awardsPer;
  };

  // ---- the timeline reacts ------------------------------------------------
  KP.onFeedEvent('stageRead', (state, n, rng) => n.band === 'carried' ? rng.pick([
    { persona: 'fan', text: 'the wide shot. THE WIDE SHOT. every mark hit, the formation locked, and the camera finally stopped cutting away from the thing it was supposed to show' },
    { persona: 'casual', text: 'a carried stage is the whole argument for the music-show grind: nobody paid for that clip and everybody shared it' },
  ]) : n.band === 'fumbled' ? rng.pick([
    { persona: 'fan', text: 'the fancam is lovely and the wide shot is a documentary about tiredness. let them SLEEP. whose schedule is this' },
    { persona: 'press', text: 'A fumbled stage on a national broadcast is the one review nobody can spin: the sync, the ad-libs and the wide shot all filed the same report.' },
  ]) : null);
})(typeof window !== 'undefined' ? window : globalThis);
