/* The sheet (v0.10.36, §91 Phase 3) — the line distribution, where it
   finally matters. The song reaches the booth with PARTS from its lane
   — a first verse and a second, the pre-chorus, the chorus, the rap,
   the bridge with the high note, the killing part — each with a demand
   (range, the flow, presence) and a share of the running time the
   fandom will time with a stopwatch. The producer proposes a sheet by
   the voices as his ear hears them (a weak ear mis-hears); the desk
   trusts it, flattens it, front-loads the ace, or writes its own in
   the Studio, bounded. The sheet feeds the record's recording term
   (the right voice on the demanding part), the booth's hours, the
   vocal strain, morale and the `linesCut` grievance, the stopwatch
   discourse, the voice of the record's hype — and the stage, when the
   stage is judged (§91 B4). Shares are public facts; what a voice is
   worth on its part is a read. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};
  const S = () => KP.C.SHEET;

  // ---- the parts: the song's shape from its lane -------------------------
  KP.songParts = function (demo, laneId) {
    const C = S();
    demo = demo || {};
    const shape = C.SHAPES[laneId] || {};
    const rapDemand = demo.rapDemand || 0;
    const raw = C.PARTS.filter(p => p.id !== 'rap' || rapDemand >= C.rapFrom).map(p => {
      let w = p.share * (shape[p.id] != null ? shape[p.id] : 1);
      if (p.id === 'rap') w *= KP.clamp(rapDemand / C.rapDemandAt, C.rapDemandSpan[0], C.rapDemandSpan[1]);
      return { spec: p, w };
    });
    // no part is a footnote: a sliver under minShare is lifted to it and
    // the rest of the record gives way proportionally
    const total = raw.reduce((s, p) => s + p.w, 0);
    raw.forEach(p => { p.s = p.w / total; });
    const small = raw.filter(p => p.s < C.minShare);
    if (small.length && small.length < raw.length) {
      const rest = raw.filter(p => p.s >= C.minShare);
      const restSum = rest.reduce((s, p) => s + p.s, 0);
      const room = 1 - C.minShare * small.length;
      small.forEach(p => { p.s = C.minShare; });
      rest.forEach(p => { p.s = p.s / restSum * room; });
    }
    const parts = raw.map(({ spec, s }) => {
      const base = spec.demand === 'rap' ? rapDemand
        : spec.demand === 'presence' ? C.presenceBase + (demo.choreoPotential || 50) * C.presencePer
        : (demo.vocalDemand || 50);
      return { id: spec.id, label: spec.label, demand: spec.demand,
        share: Math.round(s * 1000) / 1000,
        bar: Math.round(KP.clamp(base * spec.bar, C.barFloor, 95)), who: null };
    });
    // the rounding lands on the biggest part so the shares sum to one
    const sum = parts.reduce((s, p) => s + p.share, 0);
    const big = parts.slice().sort((a, b) => b.share - a.share)[0];
    big.share = Math.round((big.share + 1 - sum) * 1000) / 1000;
    return parts;
  };
  KP.partVoice = function (m, demand) {
    if (demand === 'rap') return m.talents.rap.cur;
    if (demand === 'presence') return KP.derived(m).stagePresence;
    return m.talents.vocals.cur;
  };
  KP.partDemandWord = function (part) {
    if (part.demand === 'rap') return 'the flow';
    if (part.demand === 'presence') return 'presence';
    if (part.id === 'bridge' && part.bar >= 65) return 'the high note';
    return part.bar >= 65 ? 'real range' : 'range';
  };

  // who is in the booth: on the roster, not on a break
  function booth(state, g) {
    const all = g.members.map(id => state.people[id]).filter(m => m && m.status !== 'released');
    const here = all.filter(m => !KP.onBreak(m));
    return here.length ? here : all;
  }
  KP.sheetBooth = booth;
  function demoOf(state, g) {
    return (g.demos || state.demos || []).find(d => d.id === g.prep.songId) || {};
  }

  // ---- the producer's ear: the voices as he hears them -------------------
  function ear(state, g, demo, members) {
    const C = S();
    const pr = KP.producerOf ? KP.producerOf(state, demo.producerId) : null;
    const craft = pr && pr.craft != null ? pr.craft : C.earDefault;
    const sigma = Math.max(0, 100 - craft) * C.earWobble;
    const heard = {};
    members.forEach(m => {
      heard[m.id] = {};
      ['vocals', 'rap', 'presence'].forEach(d => {
        const h = KP.hash01([state.seed, 'sheet-ear', g.id, demo.id, m.id, d].join('|'));
        heard[m.id][d] = KP.partVoice(m, d) + (h - 0.5) * 2 * sigma;
      });
    });
    return heard;
  }

  // greedy by share: the biggest part gets the best voice the ear hears,
  // a second part costs repeatPenalty, the ace is heard on the killing
  // part. `flat` hands every voice a part before anyone gets a second;
  // `fixed` pins parts; `exclude` keeps the pinned voice off the rest.
  function assign(parts, members, heard, roles, opts) {
    const C = S();
    opts = opts || {};
    const held = {};
    members.forEach(m => { held[m.id] = 0; });
    const order = parts.slice().sort((a, b) => b.share - a.share || (a.id < b.id ? -1 : 1));
    order.forEach(p => {
      if (opts.fixed && opts.fixed[p.id]) {
        p.who = opts.fixed[p.id];
        held[p.who] = (held[p.who] || 0) + 1;
        return;
      }
      let pool = members.filter(m => !(opts.exclude && opts.exclude.has(m.id)));
      if (!pool.length) pool = members;
      if (opts.flat) {
        const min = Math.min.apply(null, pool.map(m => held[m.id]));
        pool = pool.filter(m => held[m.id] === min);
      }
      let best = null, bestScore = -Infinity;
      pool.forEach(m => {
        let score = heard[m.id][p.demand] - held[m.id] * C.repeatPenalty;
        if (p.id === 'killing' && roles && m.id === roles.center) score += C.aceBonus;
        if (score > bestScore) { bestScore = score; best = m; }
      });
      p.who = best ? best.id : null;
      if (best) held[best.id]++;
    });
    return parts;
  }

  // ---- the sheet on the desk ---------------------------------------------
  KP.buildSheet = function (state, g) {
    const demo = demoOf(state, g);
    const members = booth(state, g);
    const parts = KP.songParts(demo, g.prep.conceptId);
    assign(parts, members, ear(state, g, demo, members), g.roles);
    const proposal = {};
    parts.forEach(p => { proposal[p.id] = p.who; });
    g.prep.sheet = { mode: null, parts, proposal, producer: demo.producer || null, locked: null, settled: 0 };
    return g.prep.sheet;
  };
  KP.applySheetPreset = function (state, g, mode) {
    const sh = g.prep && g.prep.sheet;
    if (!sh || sh.locked) return sh || null;
    const demo = demoOf(state, g);
    const members = booth(state, g);
    if (mode === 'trust') {
      sh.parts.forEach(p => { p.who = sh.proposal[p.id] || p.who; });
    } else if (mode === 'spread') {
      assign(sh.parts, members, ear(state, g, demo, members), g.roles, { flat: true });
    } else if (mode === 'center') {
      const aceId = g.roles && members.some(m => m.id === g.roles.center) ? g.roles.center
        : members.slice().sort((a, b) => KP.derived(b).centerPull - KP.derived(a).centerPull)[0].id;
      const fixed = {};
      S().centerParts.forEach(id => { if (sh.parts.some(p => p.id === id)) fixed[id] = aceId; });
      assign(sh.parts, members, ear(state, g, demo, members), g.roles,
        { fixed, exclude: members.length > 1 ? new Set([aceId]) : null });
    } else {
      mode = 'custom';   // the parts stay as proposed; the Studio writes
    }
    sh.mode = mode;
    return sh;
  };
  // one voice holds at most maxParts — or the even split, when the
  // room is smaller than the song (a duo sings the whole sheet)
  KP.sheetCap = function (state, g) {
    const sh = g.prep && g.prep.sheet;
    const n = Math.max(1, booth(state, g).length);
    return Math.max(S().maxParts, Math.ceil(((sh && sh.parts) || []).length / n));
  };
  function editable(state, groupId) {
    const g = KP.groupById(state, groupId);
    const sh = g && g.prep && g.prep.sheet;
    if (!sh) return { ok: false, reason: 'No sheet on the desk.' };
    if (sh.mode !== 'custom') return { ok: false, reason: 'You chose a preset — the producer’s sheet is not yours to edit.' };
    if (sh.locked) return { ok: false, reason: 'The sheet is locked. The booth has the files.' };
    return { ok: true, g, sh };
  }
  KP.setSheetCarrier = function (state, groupId, partId, memberId) {
    const e = editable(state, groupId);
    if (!e.ok) return e;
    const part = e.sh.parts.find(p => p.id === partId);
    if (!part) return { ok: false, reason: 'No such part on this record.' };
    const members = booth(state, e.g);
    if (!members.some(m => m.id === memberId)) return { ok: false, reason: 'That voice is not in the booth.' };
    const cap = KP.sheetCap(state, e.g);
    const held = e.sh.parts.filter(p => p.who === memberId && p.id !== partId).length;
    if (held >= cap) return { ok: false, reason: 'One voice holds at most ' + cap + ' parts. The sheet is bounded.' };
    part.who = memberId;
    return { ok: true };
  };
  KP.cycleSheetPart = function (state, groupId, partId, dir) {
    const e = editable(state, groupId);
    if (!e.ok) return e;
    const part = e.sh.parts.find(p => p.id === partId);
    if (!part) return { ok: false, reason: 'No such part on this record.' };
    const ids = booth(state, e.g).map(m => m.id);
    let i = ids.indexOf(part.who);
    for (let step = 0; step < ids.length; step++) {
      i = (i + (dir < 0 ? -1 : 1) + ids.length) % ids.length;
      if (ids[i] === part.who) break;
      const r = KP.setSheetCarrier(state, groupId, partId, ids[i]);
      if (r.ok) return r;
    }
    return { ok: false, reason: 'Every other voice already holds its share of parts. The sheet is bounded.' };
  };

  // ---- reading the sheet --------------------------------------------------
  KP.sheetShares = function (sh) {
    const out = {};
    ((sh && sh.parts) || []).forEach(p => {
      if (p.who) out[p.who] = Math.round(((out[p.who] || 0) + p.share) * 1000) / 1000;
    });
    return out;
  };
  KP.sheetTop = function (sh) {
    const sv = KP.sheetShares(sh);
    let top = null;
    Object.keys(sv).forEach(id => { if (!top || sv[id] > top.share) top = { id, share: sv[id] }; });
    return top;
  };
  // the share she sings on the record in production, or the record in
  // promotion — the medical desk's singing-load read
  KP.sheetShareOf = function (state, g, personId) {
    if (!g) return 0;
    if (g.prep && g.prep.sheet) return KP.sheetShares(g.prep.sheet)[personId] || 0;
    const rel = (g.releases || []).length ? g.releases[g.releases.length - 1] : null;
    if (rel && rel.sheet && rel.sheet.shares && state.week <= (g.promoUntil || 0)) return rel.sheet.shares[personId] || 0;
    return 0;
  };
  // the record as sung: each part's voice against its bar, weighted by
  // the share — fit ≈ 0.5 (the wrong voices) … ratioCap (every part owned)
  KP.sheetRead = function (state, sh) {
    const C = S();
    let fit = 0;
    const rows = ((sh && sh.parts) || []).map(p => {
      const m = p.who ? state.people[p.who] : null;
      const voice = m ? KP.partVoice(m, p.demand) : 0;
      const ratio = Math.min(C.ratioCap, voice / Math.max(C.barFloor, p.bar));
      fit += p.share * ratio;
      return { id: p.id, label: p.label, who: p.who, ratio: Math.round(ratio * 100) / 100 };
    });
    return { fit: Math.round(fit * 1000) / 1000, rows };
  };
  KP.sheetArchive = function (sh) {
    return { mode: sh.mode,
      parts: sh.parts.map(p => ({ id: p.id, label: p.label, demand: p.demand, share: p.share, bar: p.bar, who: p.who })),
      shares: KP.sheetShares(sh), quiet: (sh.quiet || []).slice(),
      top: sh.top ? Object.assign({}, sh.top) : null };
  };

  // ---- the words ----------------------------------------------------------
  function list(arr) {
    return arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
  }
  KP.sheetWords = function (state, g, sh) {
    const members = booth(state, g);
    const byWho = {};
    (sh.parts || []).forEach(p => { if (p.who) (byWho[p.who] = byWho[p.who] || []).push(p); });
    const shares = KP.sheetShares(sh);
    const named = members.filter(m => byWho[m.id]).sort((a, b) => (shares[b.id] || 0) - (shares[a.id] || 0));
    const off = members.filter(m => !byWho[m.id]);
    const phrases = named.map(m => {
      const ps = byWho[m.id];
      const verb = ps.some(p => p.id === 'chorus') ? 'carries' : ps.some(p => p.id === 'killing') ? 'has' : 'takes';
      return KP.displayName(m) + ' ' + verb + ' ' + list(ps.map(p => p.label));
    });
    let text = phrases.join('; ') + '.';
    if (off.length) text += ' ' + list(off.map(KP.displayName)) + (off.length === 1 ? ' is' : ' are') + ' not on it.';
    return text;
  };
  KP.sheetShapeWords = function (sh) {
    const parts = sh.parts || [];
    const has = id => parts.find(p => p.id === id);
    const out = [];
    if (has('verse1') && has('verse2')) out.push('two verses');
    else if (has('verse1') || has('verse2')) out.push('a verse');
    if (has('pre')) out.push('a pre-chorus');
    if (has('chorus')) out.push('a chorus that wants ' + KP.partDemandWord(has('chorus')));
    if (has('rap')) out.push(has('rap').share >= 0.2 ? 'a rap that carries real weight' : 'a rap');
    if (has('bridge')) out.push('a bridge' + (has('bridge').bar >= 65 ? ' with the high note' : ''));
    if (has('killing')) out.push('a killing part');
    return list(out);
  };
  // the booth's verdict at release — names, never reads
  KP.sheetLine = function (state, sh, read) {
    const rows = (read.rows || []).filter(r => r.who && state.people[r.who]);
    if (!rows.length) return null;
    const best = rows.slice().sort((a, b) => b.ratio - a.ratio)[0];
    const worst = rows.slice().sort((a, b) => a.ratio - b.ratio)[0];
    const bits = [];
    if (best.ratio >= 1.05) bits.push(KP.displayName(state.people[best.who]) + ' owned ' + best.label);
    if (worst.ratio <= 0.78 && worst.id !== best.id) {
      bits.push(KP.displayName(state.people[worst.who]) + ' reached for ' + worst.label + ' and did not quite get there');
    }
    if (!bits.length) return 'The booth: every voice sat where it could sing.';
    return 'The booth: ' + bits.join('; ') + '.';
  };
  // the panel's read of a voice on a part — through the staff's eyes,
  // fogged (Law 2): words, never the number
  KP.partFitWord = function (state, m, part) {
    let read;
    if (part.demand === 'presence') {
      const sc = KP.DATA.evaluators[2];
      read = KP.perceived(state, m, 'charisma', sc) * 0.6 + KP.perceived(state, m, 'dance', sc) * 0.4;
    } else {
      read = KP.perceived(state, m, part.demand, KP.DATA.evaluators[0]);
    }
    const d = read - part.bar;
    return d >= 8 ? 'owns it' : d >= -4 ? 'carries it' : d >= -14 ? 'reaches for it' : 'strains';
  };

  // ---- the lock: the sheet is paid for once -------------------------------
  function settle(state, g, sh) {
    const C = S();
    const members = booth(state, g);
    const shares = KP.sheetShares(sh);
    const quiet = members.filter(m => (shares[m.id] || 0) < C.floorShare);
    const top = KP.sheetTop(sh);
    const led = KP.pipeLedger(state);
    led.sheets = (led.sheets || 0) + 1;
    if (sh.mode === 'custom') led.customSheets = (led.customSheets || 0) + 1;
    led.quietVoices = (led.quietVoices || 0) + quiet.length;
    // the booth's hours ride the share
    members.forEach(m => {
      const sv = shares[m.id] || 0;
      if (sv > 0) m.fatigue = KP.clamp(m.fatigue + Math.round(sv * C.boothFatigue), 0, 100);
    });
    // every voice on the record warms the room; a voice under the floor
    // counts her seconds — and, if she is the type, keeps the count
    if (!quiet.length) members.forEach(m => { m.morale = KP.clamp(m.morale + C.spreadMorale, 0, 100); });
    quiet.forEach(m => {
      m.morale = KP.clamp(m.morale - C.quietMorale, 0, 100);
      if (m.personality.professionalism < C.grievancePro) {
        KP.recordDirected(state, m.id, 'linesCut');
        m.history.push({ week: state.week, text: 'Saw the line sheet. Counted the seconds. Said nothing in the room, which is not the same as saying nothing.' });
      }
    });
    // the voice of the record — a solo IS the record, no lift there
    const face = top && members.length > 1 ? state.people[top.id] : null;
    if (face) {
      const lift = KP.clamp(Math.round((top.share - C.hypeFrom) * C.hypePer), 0, C.hypeCap);
      if (lift) face.hype = KP.clamp((face.hype || 0) + lift, 0, 100);
    }
    sh.quiet = quiet.map(m => m.id);
    sh.top = top;
    sh.settled = 1;
  }
  const TOASTS = {
    trust: 'The producer’s sheet stands. Nobody’s feelings were consulted, which is a kind of fairness.',
    spread: 'Every voice gets its bars. The room is warmer; the hook is more crowded.',
    center: 'The ace carries it. The hook will hit — and somebody counted her own seconds.',
    custom: 'Your sheet is locked. The booth has the files; the fandom has a stopwatch.',
  };
  KP.lockSheet = function (state, groupId, opts) {
    const g = KP.groupById(state, groupId);
    const sh = g && g.prep && g.prep.sheet;
    if (!sh) return { ok: false, reason: 'No sheet on the desk.' };
    if (sh.locked) return { ok: false, reason: 'The sheet is already locked.' };
    if (!sh.mode) sh.mode = 'trust';
    sh.locked = state.week;
    if (opts && opts.silent) sh.settled = 1;   // a migrated card already paid
    else settle(state, g, sh);
    const quiet = (sh.quiet || []).map(id => state.people[id]).filter(Boolean);
    return { ok: true, toast: TOASTS[sh.mode] +
      (quiet.length ? ' ' + list(quiet.map(KP.displayName)) + (quiet.length === 1 ? ' is' : ' are') + ' barely on it.' : '') };
  };

  // ---- the scene: one decision the fandom litigates ---------------------
  KP.registerScene('theSheet', {
    title: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      return (g ? g.name : 'The record') + ' · the sheet';
    },
    body: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      const sh = g && g.prep && g.prep.sheet;
      if (!g || !sh) return 'The session moved on without the sheet.';
      const demo = demoOf(state, g);
      return 'Recording week for ' + g.name + ', and ' + (sh.producer || 'the producer') + ' slides one sheet across the desk: ' +
        'the line distribution. “' + (demo.title || 'The record') + '” has ' + KP.sheetShapeWords(sh) + '. The sheet as proposed: ' +
        KP.sheetWords(state, g, sh) + ' The fandom will time every second of this with a stopwatch, because they always do. ' +
        'Trust the ear, flatten it, front-load the ace — or write it yourself, in the Studio.';
    },
    options: () => [
      { id: 'trust', label: 'The producer’s sheet stands' },
      { id: 'spread', label: 'Every voice on the record' },
      { id: 'center', label: 'Front-load the ace' },
      { id: 'custom', label: 'I’ll write it — in the Studio' },
    ],
    resolve: (state, sc, optionId) => {
      const g = KP.groupById(state, sc.groupId);
      if (!g || !g.prep || !g.prep.sheet) return { toast: 'The session moved on without the sheet.' };
      const mode = ['trust', 'spread', 'center', 'custom'].includes(optionId) ? optionId : 'trust';
      KP.applySheetPreset(state, g, mode);
      if (mode === 'custom') {
        return { toast: 'Your sheet. It is on the Studio desk — cycle the voice on each part, then lock it. Release week locks whatever is on it.' };
      }
      return { toast: KP.lockSheet(state, g.id).toast };
    },
    expire: (state, sc) => {
      // nobody decided; the producer's sheet went to the booth
      const g = KP.groupById(state, sc.groupId);
      if (g && g.prep && g.prep.sheet && !g.prep.sheet.locked) {
        if (!g.prep.sheet.mode) KP.applySheetPreset(state, g, 'trust');
        KP.lockSheet(state, g.id);
      }
      return null;
    },
  });
  // the recording station opens the sheet — a solo sings every part and
  // skips the question; a release that beats its booth (resolveDebut)
  // sings the producer's sheet
  KP.openSheet = function (state, g) {
    KP.buildSheet(state, g);
    if (booth(state, g).length <= 1) {
      KP.applySheetPreset(state, g, 'trust');
      KP.lockSheet(state, g.id);
      return null;
    }
    if ((state.scenes || []).some(sc => sc.kind === 'theSheet' && sc.groupId === g.id)) return null;
    return KP.openScene(state, { kind: 'theSheet', groupId: g.id, expiresWeek: state.week + 2 });
  };
  KP.settleSheetForRelease = function (state, g) {
    if (!g.prep.sheet) KP.buildSheet(state, g);
    const sh = g.prep.sheet;
    if (!sh.locked) {
      if (!sh.mode) KP.applySheetPreset(state, g, 'trust');
      KP.lockSheet(state, g.id);
    }
    return sh;
  };
})(typeof window !== 'undefined' ? window : globalThis);
