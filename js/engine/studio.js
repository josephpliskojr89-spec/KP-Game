/* The studio (v0.10.35, §91 Phase 2) — the song, made.
   A record is made by named people: a producer with lanes he owns (public
   knowledge) and a craft and a commercial sense he does not print (the
   second fog — read through the works and the critics' words), a writer
   with themes she owns the same way, and the room that sings it. THE FIT
   LAW: a composition's craft is capped by lane distance — home, next
   door, far — so the owner's hip-hop producer on the ethereal song tops
   out whatever his skill. The COMMISSION is the player's verb: brief a
   record (a lane, a theme), choose the people, pay the fees, wait the
   writing weeks; the demo arrives on the sheet beside the pitch. The
   pitch stays: the world's producers still send four a cycle. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    return state.studioLedger = state.studioLedger ||
      { commissions: 0, landed: 0, refused: 0, offLane: 0, roomMiss: 0, houseRecords: 0, penRecords: 0 };
  }
  KP.studioLedger = ledger;
  const ST = () => KP.C.STUDIO;

  // ---- themes ---------------------------------------------------------------
  KP.themeById = function (id) { return KP.C.THEMES.find(t => t.id === id) || null; };
  KP.themesForLane = function (laneId) { return KP.C.THEMES.filter(t => t.lanes.includes(laneId)); };
  // a theme that fights the room: the lineup's age against the band, the
  // room's read against the trait. Returns the sentence the critics use,
  // or null.
  KP.themeRoomMiss = function (state, members, theme) {
    if (!theme || !members || !members.length) return null;
    const age = members.reduce((s, m) => s + (m.age || 20), 0) / members.length;
    if (age < theme.ages[0] - 1) return 'a lyric about ' + theme.label.toLowerCase() + ' sung by a room too young to have lived it';
    if (age > theme.ages[1] + 1) return 'a lyric about ' + theme.label.toLowerCase() + ' sung by a room that has outgrown it';
    if (theme.trait) {
      const v = members.reduce((s, m) => s + (m.personality[theme.trait.key] || 50), 0) / members.length;
      if (v < theme.trait.min) return 'a lyric about ' + theme.label.toLowerCase() + ' that the room does not believe — it reads as ' +
        ({ warmth: 'cold', confidence: 'timid', resilience: 'brittle', adaptability: 'stiff' }[theme.trait.key] || 'untrue') + ' where it should not';
    }
    return null;
  };

  // ---- the fit law ------------------------------------------------------------
  KP.laneFitMult = function (lanes, laneId) {
    const F = ST().fit;
    const list = (lanes || []).filter(Boolean);
    if (!list.length || !laneId) return F.far;
    const d = Math.min.apply(null, list.map(l => KP.laneDistance(l, laneId)));
    return d === 0 ? F.home : d === 1 ? F.neighbour : F.far;
  };
  KP.laneFitWord = function (lanes, laneId) {
    const m = KP.laneFitMult(lanes, laneId);
    const F = ST().fit;
    return m >= F.home ? 'home turf' : m >= F.neighbour ? 'next door — a stretch they can make' : 'far from their lane — it works, it just isn’t them';
  };
  KP.producerLanes = function (pr) { return pr ? [pr.lane, pr.lane2].filter(Boolean) : []; };

  // ---- writers: the pool, the pen, the house ------------------------------------
  const WR_FAM = ['Seo', 'Kang', 'Oh', 'Han', 'Yoon', 'Nam', 'Bae', 'Shin', 'Hong', 'Ryu'];
  const WR_GIV = ['Ji-woo', 'Tae-rin', 'Min-seo', 'Hye-jin', 'Yu-na', 'Da-eun', 'Eun-chae', 'Soo-ah', 'Ye-rin', 'Ha-neul'];
  function h(state, key) { return KP.hash01([state.seed, 'studio', key].join('|')); }
  function pickThemes(state, key, n, laneHint) {
    const all = KP.C.THEMES.slice();
    const out = [];
    for (let i = 0; i < n && all.length; i++) {
      // the varying part leads the key: near-identical tails hash close
      let idx = Math.floor(h(state, 'theme' + (i * 7919 + 17) + '|' + key + '|' + i) * all.length);
      if (i === 0 && laneHint) {
        const nat = all.filter(t => t.lanes.includes(laneHint));
        if (nat.length) idx = all.indexOf(nat[Math.floor(h(state, 'themen|' + key) * nat.length)]);
      }
      out.push(all[idx].id);
      all.splice(idx, 1);
    }
    return out;
  }
  function backfillWriter(state, w, key) {
    const S = ST();
    if (w.craft == null) w.craft = Math.round(S.writerCraftSpread[0] + h(state, key + ':wc') * (S.writerCraftSpread[1] - S.writerCraftSpread[0]));
    if (!w.themes || !w.themes.length) w.themes = pickThemes(state, key, S.writerThemes[0] + Math.floor(h(state, key + ':wn') * (S.writerThemes[1] - S.writerThemes[0] + 1)));
    if (!w.works) w.works = [];
    return w;
  }
  KP.writersOf = function (state) {
    if (!state.writerPool) {
      const S = ST();
      state.writerPool = [];
      const taken = new Set();
      for (let i = 0; i < S.writerCount; i++) {
        let name = null;
        for (let salt = 0; salt < 8 && (!name || taken.has(name)); salt++) {
          name = WR_FAM[Math.floor(h(state, 'wr' + i + 'f' + salt) * WR_FAM.length)] + ' ' +
            WR_GIV[Math.floor(h(state, 'wr' + i + 'g' + salt) * WR_GIV.length)];
        }
        taken.add(name);
        state.writerPool.push(backfillWriter(state, { id: 'wr' + i, name }, 'wr' + i));
      }
    }
    state.writerPool.forEach((w, i) => backfillWriter(state, w, w.id || ('wr' + i)));
    return state.writerPool;
  };
  // the pen: a member who writes owns themes her personality and age give her
  KP.penThemes = function (p) {
    const P = p.personality || {};
    const out = [];
    if ((P.warmth || 50) >= 60) out.push('devotion');
    if ((P.confidence || 50) >= 62) out.push('confidence');
    if ((P.confidence || 50) >= 55 && (P.competitiveness || 50) >= 55) out.push('defiance');
    if ((P.creativity || 50) >= 70) out.push('nightDrive', 'escape');
    if ((P.resilience || 50) <= 40) out.push('grief');
    if ((p.age || 20) <= 20) out.push('firstLove', 'summer');
    if ((p.age || 20) >= 23) out.push('nostalgia');
    if (!out.length) out.push('longing');
    return out.slice(0, 3);
  };
  KP.penWriter = function (state, p) {
    if (!p) return null;
    const S = ST().pen;
    return { id: p.id, name: KP.displayName(p), themes: KP.penThemes(p),
      craft: KP.clamp(Math.round(S.base + (p.personality.creativity || 50) * S.perCreativity), 10, 95), pen: true };
  };
  KP.canWrite = function (p) {
    return !!p && ((p.archetypes || []).includes('producerMinded') ||
      (p.personality && p.personality.creativity >= KP.C.CREDITS.writeCreativityAt));
  };
  // the house chairs (hires.js seats 'producer' / 'writer'): the truth is a
  // craft from the hidden aptitude — a name is reliably decent, an unknown
  // might be the gem nobody caught
  function houseCraft(state, st) {
    const S = ST();
    const apt = KP.staffTruth(state, st).apt;
    return KP.clamp(Math.round(S.houseCraftBase + apt * S.houseCraftSpan), 10, 95);
  }
  // the second chair (v0.10.39, §91 B2): the house seats a family of two
  // producer chairs and two writer chairs; the ids read 'seat:<seatId>'
  function houseProducerAt(state, seatId) {
    const st = (state.seats || {})[seatId];
    if (!st) return null;
    const S = ST();
    return { id: 'seat:' + seatId, seatId, name: st.name, lane: st.lane || 'bright', lane2: st.lane2 || null,
      craft: houseCraft(state, st),
      catch: Math.round(S.catchSpread[0] + h(state, st.id + ':catch') * (S.catchSpread[1] - S.catchSpread[0])),
      works: st.works || (st.works = []), house: true };
  }
  function houseWriterAt(state, seatId) {
    const st = (state.seats || {})[seatId];
    if (!st) return null;
    return { id: 'seat:' + seatId, seatId, name: st.name, themes: st.themes || ['longing'], craft: houseCraft(state, st),
      works: st.works || (st.works = []), house: true };
  }
  KP.houseProducers = function (state) {
    return ['producer', 'producer2'].map(id => houseProducerAt(state, id)).filter(Boolean);
  };
  KP.houseWriters = function (state) {
    return ['writer', 'writer2'].map(id => houseWriterAt(state, id)).filter(Boolean);
  };
  KP.houseProducer = function (state) { return houseProducerAt(state, 'producer'); };
  KP.houseWriter = function (state) { return houseWriterAt(state, 'writer'); };
  // one resolver for every writer id: the pool, the house, the pen
  KP.writerById = function (state, id) {
    if (!id) return null;
    if (String(id).indexOf('seat:') === 0) return houseWriterAt(state, String(id).slice(5));
    const w = KP.writersOf(state).find(x => x.id === id);
    if (w) return w;
    const p = state.people && state.people[id];
    return p ? KP.penWriter(state, p) : null;
  };
  // one resolver for every producer id: the pool, the house
  KP.producerOf = function (state, id) {
    if (!id) return null;
    if (String(id).indexOf('seat:') === 0) return houseProducerAt(state, String(id).slice(5));
    return KP.producerById(state, id);
  };
  // the pitch's writer: a pool writer with a theme natural to the lane
  KP.pickWriter = function (state, rng, laneId, members) {
    const pool = KP.writersOf(state);
    const fitsRoom = t => {
      const th = KP.themeById(t);
      if (!th || !members || !members.length) return true;
      const age = members.reduce((s, m) => s + (m.age || 20), 0) / members.length;
      return age >= th.ages[0] - 1 && age <= th.ages[1] + 1;   // writers write for the artist in front of them
    };
    const natural = pool.filter(w => w.themes.some(t => (KP.themeById(t) || { lanes: [] }).lanes.includes(laneId) && fitsRoom(t)));
    const w = natural.length && rng.chance(0.75) ? natural[rng.int(0, natural.length - 1)] : pool[rng.int(0, pool.length - 1)];
    const inLane = w.themes.filter(t => (KP.themeById(t) || { lanes: [] }).lanes.includes(laneId));
    const roomed = inLane.filter(fitsRoom);
    const themes = roomed.length ? roomed : inLane.length ? inLane : w.themes.filter(fitsRoom).length ? w.themes.filter(fitsRoom) : w.themes;
    const theme = themes[rng.int(0, themes.length - 1)];
    return { writer: w, theme };
  };

  // ---- access and fees: who takes the call -------------------------------------
  KP.producerAccess = function (state, g, pr) {
    if (!pr) return { ok: false, reason: 'No such producer.' };
    if (pr.house) return { ok: true };
    const A = ST().COMMISSION.access;
    const heat = KP.producerHeat(pr);
    const need = A[heat];
    if (!need) return { ok: true };
    const bonded = !!(g && KP.worksRecent(pr).filter(w => w.groupId === g.id).length >= KP.C.MARKET.bondAt);
    if (bonded) return { ok: true, bonded: true };
    const fame = KP.fameRead ? KP.fameRead(state) : 1;
    if (fame >= need) return { ok: true };
    return { ok: false, reason: pr.name + '’s people say the calendar is full. It is not full. A label this size does not get ' +
      (heat === 'in demand' ? 'a producer in demand' : 'a reliable name') + ' on the phone — not without a record together, or a name of its own.' };
  };
  KP.producerFee = function (pr) {
    if (!pr || pr.house) return 0;
    const F = ST().COMMISSION.fees;
    return F[KP.producerHeat(pr)] != null ? F[KP.producerHeat(pr)] : F.workmanlike;
  };
  KP.writerFee = function (w) { return !w || w.house || w.pen ? 0 : ST().COMMISSION.writerFee; };

  // ---- the commission: brief a record ------------------------------------------
  KP.commissionRead = function (state, groupId, opts) {
    const g = KP.groupById(state, groupId);
    if (!g) return { ok: false, reason: 'No such group.' };
    if (!g.members.length) return { ok: false, reason: 'A record is written for a room that exists.' };
    if (g.commission) return { ok: false, reason: 'The writing room is already working for ' + g.name + '.' };
    const lane = KP.conceptById(opts.lane);
    if (!lane) return { ok: false, reason: 'Pick a lane.' };
    const theme = KP.themeById(opts.theme);
    if (!theme) return { ok: false, reason: 'Pick a theme.' };
    const pr = KP.producerOf(state, opts.producerId);
    if (!pr) return { ok: false, reason: 'Pick a producer.' };
    const access = KP.producerAccess(state, g, pr);
    if (!access.ok) return { ok: false, reason: access.reason, refused: true };
    const w = KP.writerById(state, opts.writerId);
    if (!w) return { ok: false, reason: 'Pick a writer.' };
    if (w.pen && !g.members.includes(w.id)) return { ok: false, reason: 'The pen writes for her own room.' };
    const fee = KP.producerFee(pr) + KP.writerFee(w);
    return { ok: true, g, lane, theme, pr, w, fee,
      fitWord: KP.laneFitWord(KP.producerLanes(pr), lane.id),
      themeWord: w.themes.includes(theme.id) ? 'a theme ' + (w.pen ? 'she' : 'they') + ' own' : 'off their themes — competent, never personal',
      roomMiss: KP.themeRoomMiss(state, g.members.map(id => state.people[id]).filter(Boolean), theme) };
  };
  KP.commissionRecord = function (state, groupId, opts) {
    const r = KP.commissionRead(state, groupId, opts);
    if (!r.ok) { if (r.refused) ledger(state).refused++; return r; }
    if (state.budget < r.fee) return { ok: false, reason: 'The fees come to ' + r.fee + ' and the account cannot cover the writing room.' };
    state.budget -= r.fee;
    if (KP.ledgerFlow && r.fee) KP.ledgerFlow(state, 'production', -r.fee);
    const W = ST().COMMISSION.writeWeeks;
    const weeks = W[0] + Math.floor(KP.hash01([state.seed, r.g.id, state.week, 'write'].join('|')) * (W[1] - W[0] + 1));
    r.g.commission = { lane: r.lane.id, theme: r.theme.id, producerId: r.pr.id, producer: r.pr.name,
      writerId: r.w.id, writer: r.w.name, started: state.week, due: state.week + weeks, fee: r.fee };
    ledger(state).commissions++;
    if (r.w.pen) ledger(state).penRecords++;
    KP.note(state, { kind: 'company', ind: 'commissioned', priority: 'normal', groupId: r.g.id,
      text: r.pr.name + ' and ' + r.w.name + ' take the brief for ' + r.g.name + ': ' + r.lane.label.toLowerCase() + ', about ' +
        r.theme.label.toLowerCase() + '. ' + (r.fitWord === 'home turf' ? 'The producer is on home turf.' : 'The producer is ' + r.fitWord + '.') +
        ' ' + (r.roomMiss ? 'The A&R chair flagged one thing before the door closed: ' + r.roomMiss + '.' : 'The writing room has ' + weeks + ' weeks.') });
    return { ok: true, weeks, fee: r.fee };
  };

  // the demo a commission produces — the SAME shape as a pitch, with the
  // brief on it; the producer's craft × the fit law is the composition
  KP.commissionedDemo = function (state, rng, g, c) {
    const S = ST();
    const pr = KP.producerOf(state, c.producerId);
    const w = KP.writerById(state, c.writerId);
    const usedTitles = {};
    KP.groups(state).forEach(o => (o.releases || []).forEach(rl => { usedTitles[rl.songTitle] = true; }));
    (g.demos || []).forEach(d => { usedTitles[d.title] = true; });
    const craft = pr ? pr.craft : 50;
    const fit = KP.laneFitMult(KP.producerLanes(pr), c.lane);
    const bonded = !!(pr && (pr.house || KP.worksRecent(pr).filter(x => x.groupId === g.id).length >= KP.C.MARKET.bondAt));
    const q = () => KP.clamp(Math.round(rng.normal(KP.C.SONG.qualityMean, KP.C.SONG.qualitySd)), 10, 95);
    const d = {
      id: 'comm' + state.week + '_' + (g.id || ''),
      title: KP.genSongTitle(rng, usedTitles),
      producer: pr ? pr.name : 'the house', producerId: pr ? pr.id : null,
      writerId: w ? w.id : null, writer: w ? w.name : null, theme: c.theme,
      conceptId: c.lane, toBrief: !!(g.concept && g.concept === c.lane), bonded, commissioned: true,
      hook: KP.clamp(Math.round(rng.normal(craft * fit * S.hookFromCraft + S.hookBase, S.hookSd)) +
        (bonded ? KP.C.MARKET.bondHookBonus : 0) + (KP.seatMult ? Math.round((KP.seatMult(state, 'anr') - 1) * 30) : 0), 10, 95),
      vocalDemand: q(), rapDemand: KP.clamp(q() - 15, 5, 95), choreoPotential: q(),
      price: 0, fitMult: fit,
    };
    if (w && w.pen) d.writtenBy = w.id;
    d.catch = KP.catchOf(state, d);
    if (fit < S.fit.home) ledger(state).offLane++;
    return d;
  };

  // ---- the week: the writing room delivers (order 148, before the pitch) ----
  KP.registerWeekly('studio', 148, function (state, rng, inbox) {
    KP.groups(state).forEach(g => {
      const c = g.commission;
      if (!c || state.week < c.due || g.retiredWeek) return;
      delete g.commission;
      const d = KP.commissionedDemo(state, rng, g, c);
      // the sheet: beside the pitch when there is one, alone until the
      // meeting — generateDemos only writes to an EMPTY drawer
      if (!g.demos) {
        const calendarOpen = !g.debuted ||
          (state.week > (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks && state.week > (g.tourRestUntil || 0));
        g.demos = (calendarOpen && !g.prep && !g.tour) ? KP.generateDemos(state, rng, g) : [];
      }
      g.demos.push(d);
      ledger(state).landed++;
      const lane = KP.conceptById(c.lane), theme = KP.themeById(c.theme);
      inbox.push({ kind: 'company', ind: 'commissionDone', priority: 'high', groupId: g.id, demoId: d.id,
        text: '“' + d.title + '” is on the desk — ' + c.producer + '’s ' + (lane ? lane.label.toLowerCase() : '') + ' record about ' +
          (theme ? theme.label.toLowerCase() : 'the brief') + ', lyric by ' + c.writer + '. ' +
          (d.fitMult >= ST().fit.home ? 'It sounds like the brief wanted.' : d.fitMult >= ST().fit.neighbour ? 'It sounds like a producer reaching a lane over — a good stretch.' : 'It sounds like a producer out of his lane: professional, and not his.') +
          ' The A&R chair will say what it thinks on the sheet.' });
    });
  });

  // ---- the timeline reacts ----------------------------------------------------------
  KP.onFeedEvent('commissionDone', (state, n, rng) => rng.chance(0.5) ? rng.pick([
    { persona: 'fan', text: 'the credits leaked for the next record and the fandom has already ranked the producer’s discography, twice, with charts' },
    { persona: 'casual', text: 'a label commissioning a song on purpose instead of taking what gets pitched. novel. hope the song is good' },
  ]) : null);
})(typeof window !== 'undefined' ? window : globalThis);
