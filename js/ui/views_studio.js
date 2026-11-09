/* Studio: demos, concept, rehearsal allocation, promotion, the date —
   and the debut results page, which inherits the era's identity. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};
  const UI = KP.UI;

  // Which group the studio is working with right now.
  UI.studioGroup = function (state) {
    const groups = KP.groups(state).filter(g => !g.retiredWeek && g.members.length);
    if (!groups.length) return null;
    const chosen = KP.groupById(state, KP.App.studioGroupId);
    if (chosen) return chosen;
    // default: the group most in need of a record
    return KP.devGroup(state) ||
      groups.slice().sort((a, b) => (a.lastReleaseWeek || 0) - (b.lastReleaseWeek || 0))[0];
  };

  // the reissue's sheet (v0.11.9, §100): the desk's build until the boss changes it
  UI.reissueBuildFor = function (state, g) {
    const base = KP.reissueBuild(state, g);
    const rd = KP.App && KP.App.reissueDraft && KP.App.reissueDraft.groupId === g.id ? KP.App.reissueDraft : null;
    return { mv: rd && KP.C.MV.TIERS[rd.mv] ? rd.mv : base.mv,
      signRounds: rd && rd.signRounds != null ? rd.signRounds : base.signRounds };
  };

  UI.renderStudio = function (state, draft) {
    const groups = KP.groups(state);
    const g = UI.studioGroup(state);
    const html = [];
    if (!g) {
      return '<div class="group-hero"><div class="g-status">Studio</div>' +
        '<div class="g-name" style="font-size:clamp(1.7rem,8vw,2.4rem)">No artist,<br>no record.</div>' +
        '<div style="color:var(--ink-dim);font-size:.86rem;margin-top:8px;line-height:1.5">Form a group first. The demos will be waiting.</div></div>';
    }
    // the tracklist (v0.7.5): the record in production, credit slots and
    // all. Open slots are the A&R decision the fans will react to.
    function tracklistCard(state, g) {
      const tracks = g.prep && g.prep.tracks;
      if (!tracks) return '';
      const rows = tracks.map(tr => {
        let chip;
        if (tr.kind === 'title') chip = '<span class="chip gold">TITLE</span>';
        else if (tr.credit && tr.credit.type === 'solo') {
          const p = state.people[tr.credit.memberId];
          chip = '<span class="chip hot">solo · ' + UI.esc(p ? KP.publicGiven(p) : '?') + '</span>';
        } else if (tr.credit && tr.credit.type === 'unit') {
          chip = '<span class="chip cool">unit · ' + tr.credit.memberIds.map(id => {
            const p = state.people[id]; return UI.esc(p ? KP.publicGiven(p) : '?');
          }).join(' & ') + '</span>';
        } else if (tr.slot) chip = '<span class="chip">open slot</span>';
        else chip = '<span class="chip" style="opacity:.55">group</span>';
        const assignable = tr.slot
          ? ' data-action="track-open" data-id="' + g.id + '" data-n="' + tr.n + '"'
          : '';
        // renaming (0.9.7.1): credited songs deserve names somebody chose
        const renamable = tr.kind !== 'title' && tr.credit;
        const renameRow = renamable
          ? '<div style="display:flex;gap:6px;padding:2px 0 8px 26px;border-bottom:1px solid var(--line)">' +
            '<input class="track-rename-input" data-n="' + tr.n + '" maxlength="24" ' +
            'style="flex:1;background:var(--bg2);border:1px solid var(--line);color:var(--ink);border-radius:6px;padding:4px 8px;font-size:.78rem" ' +
            'placeholder="Rename “' + UI.esc(tr.title) + '”… (make it memorable)" value="' + UI.esc((KP.App.trackRenames || {})[tr.n] || '') + '">' +
            '<button class="btn small ghost" data-action="rename-track" data-id="' + g.id + '" data-n="' + tr.n + '">✓</button></div>'
          : '';
        return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;' + (renamable ? '' : 'border-bottom:1px solid var(--line)') + '"' + assignable + '>' +
          '<span style="color:var(--ink-dim);font-size:.8rem;width:16px">' + tr.n + '</span>' +
          '<span style="flex:1;font-size:.9rem">' + UI.esc(tr.title) + (tr.renamed ? ' <span style="color:var(--magenta);font-size:.7rem">✎</span>' : '') + '</span>' + chip +
          (tr.slot ? '<span style="color:var(--ink-dim)">›</span>' : '') +
          '</div>' + renameRow;
      }).join('');
      const openLeft = tracks.filter(tr => tr.slot && !tr.credit).length;
      return '<div class="kicker" style="margin-top:14px">The tracklist' +
        (openLeft ? ' · ' + openLeft + ' credit' + (openLeft === 1 ? '' : 's') + ' to assign' : '') + '</div>' +
        '<div class="card">' + rows +
        '<div style="color:var(--ink-dim);font-size:.78rem;padding-top:9px;line-height:1.5">' +
        (tracks.some(tr => tr.slot)
          ? 'Open slots take a solo or a unit until release week. Whose name goes on track ' +
            tracks.filter(tr => tr.slot).map(tr => tr.n).join(' and ') + ' is an A&R decision the fans WILL have opinions about.'
          : 'A single rides on its title. The bigger formats open credit slots.') +
        '</div></div>';
    }

    const switcher = groups.length > 1
      ? '<div class="pad" style="margin-bottom:8px"><div class="seg">' +
        groups.map(x => '<button class="' + (x.id === g.id ? 'on' : '') + '" data-action="studio-group" data-id="' + x.id + '">' + UI.esc(x.name) + '</button>').join('') +
        '</div></div>'
      : '';
    if (g.prep) {
      const inW = g.prep.scheduledWeek - state.week;
      const demo = (g.demos || []).find(s => s.id === g.prep.songId);
      UI.setEra(g.prep.conceptId);
      const clash = g.prep.clash;
      // the war room (v0.6.4): a rival parked a release on our date —
      // hold it, or slip. One decision, once.
      let clashCard = '';
      if (clash && !clash.resolved) {
        const W = KP.C.WAR;
        clashCard = '<div class="war-card">' +
          '<div class="w-flag">Date clash · ' + UI.esc(clash.company) + '</div>' +
          '<div class="w-text">' + UI.esc(clash.actName) + '’s comeback just landed on our announced date. Scheduling coincidences do not exist in this industry.</div>' +
          '<div class="w-actions">' +
          '<button class="btn primary" data-action="clash-hold" data-id="' + g.id + '">Hold the date</button>' +
          '<button class="btn" data-action="clash-slip" data-id="' + g.id + '">Slip ' + W.slipWeeks + ' weeks · ' + W.slipCost + '</button>' +
          '</div></div>';
      } else if (clash && clash.resolved === 'hold') {
        clashCard = '<div class="war-card held"><div class="w-flag">Head-to-head · ' + UI.esc(clash.company) + '</div>' +
          '<div class="w-text">The date stands. ' + UI.esc(clash.actName) + ' releases the same week. The whole scene is watching the scoreboard.</div></div>';
      }
      return switcher + '<div class="group-hero"><div class="g-status">Locked & in production · ' + UI.esc(g.name) + '</div>' +
        '<div class="g-name" style="font-size:clamp(1.9rem,10vw,2.8rem)">“' + UI.esc(demo.title) + '”</div>' +
        '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:8px">' +
        '<span class="chip cool">' + UI.esc(KP.conceptById(g.prep.conceptId).label) + '</span>' +
        '<span class="chip">' + UI.esc(g.prep.promo) + ' promotion</span>' +
        '<span class="chip hot">' + (inW <= 0 ? 'this week' : inW + ' week' + (inW === 1 ? '' : 's') + ' to ' + (g.debuted ? 'comeback' : 'debut')) + '</span></div>' +
        '<div style="color:var(--ink-dim);font-size:.84rem;margin-top:12px;line-height:1.5">Rehearsal split — vocals ' + g.prep.alloc.vocals + '%, dance ' + g.prep.alloc.dance + '%, rap ' + g.prep.alloc.rap + '%, media ' + g.prep.alloc.media + '%. Advance the weeks.' +
        (clash && !clash.resolved ? '' : ' The date does not move.') + '</div></div>' + clashCard +
        sheetCard(state, g) +
        tracklistCard(state, g);
    }

    // the sheet (v0.10.36): the line distribution over the song's parts.
    // Shares are public (the fandom times them); the fit of a voice on
    // its part is a read through the staff's eyes — words, never numbers.
    function sheetCard(state, g) {
      const sh = g.prep.sheet;
      const st = (g.prep.stations || []).find(x => x.id === 'recording');
      if (!sh) {
        return st && !st.done
          ? '<div class="kicker" style="margin-top:14px">The sheet</div><div class="card"><div style="color:var(--ink-dim);font-size:.78rem;line-height:1.5">The booth opens ' +
            UI.esc(KP.weekLabel(st.week).text) + '. The producer brings the line sheet with the session; the fandom brings a stopwatch.</div></div>'
          : '';
      }
      const SH = KP.C.SHEET;
      const editing = sh.mode === 'custom' && !sh.locked;
      const shares = KP.sheetShares(sh);
      const members = g.members.map(id => state.people[id]).filter(Boolean);
      const rows = sh.parts.map(p => {
        const m = p.who ? state.people[p.who] : null;
        return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)">' +
          '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:.84rem">' + UI.esc(p.label) +
          ' <span style="color:var(--ink-dim);font-weight:400;font-size:.74rem">· ' + Math.round(p.share * 100) + '% · ' + UI.esc(KP.partDemandWord(p)) + '</span></div>' +
          '<div style="font-size:.76rem;color:var(--ink-dim)">' + (m ? UI.esc(KP.displayName(m)) + ' · ' + UI.esc(KP.partFitWord(state, m, p)) : 'nobody') + '</div></div>' +
          (editing
            ? '<button class="btn" data-action="sheet-cycle" data-id="' + g.id + '" data-part="' + p.id + '" data-dir="-1">‹</button>' +
              '<button class="btn" data-action="sheet-cycle" data-id="' + g.id + '" data-part="' + p.id + '" data-dir="1">›</button>'
            : '') +
          '</div>';
      }).join('');
      const chips = members.map(m => {
        const sv = shares[m.id] || 0;
        const cls = sv < SH.floorShare ? ' clash' : sv >= SH.heavyShare ? ' hot' : '';
        return '<span class="chip' + cls + '">' + UI.esc(KP.displayName(m)) + ' ' + (sv ? Math.round(sv * 100) + '%' : '—') + '</span>';
      }).join('');
      const modeWord = { trust: 'the producer’s sheet', spread: 'every voice', center: 'front-loaded', custom: 'your sheet' }[sh.mode] || 'the producer’s proposal';
      return '<div class="kicker" style="margin-top:14px">The sheet · ' + UI.esc(modeWord) + (sh.locked ? ' · locked' : sh.mode ? '' : ' · waiting on the Desk') + '</div>' +
        '<div class="card">' + rows +
        '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:8px">' + chips + '</div>' +
        (editing ? '<div style="margin-top:10px"><button class="btn primary" style="width:100%" data-action="sheet-lock" data-id="' + g.id + '">Lock the sheet</button></div>' : '') +
        '<div style="color:var(--ink-dim);font-size:.72rem;padding-top:8px;line-height:1.5">' +
        (editing
          ? 'Cycle the voice on each part. One voice holds at most ' + KP.sheetCap(state, g) + ' parts. Release week locks whatever is on the desk.'
          : 'Who sings what is public the minute the record is out — the fandom times it to the second. What each voice is worth on its part is a read.') +
        '</div></div>';
    }

    // --- on the road (v0.6.8): the tour owns the calendar
    if (g.tour) {
      const T = KP.C.TOUR;
      const tour = g.tour;
      const legId = tour.legs[tour.legIdx];
      const krLive = legId === 'kr' && tour.kr;
      const where = krLive
        ? 'Home circuit · ' + (T.KR_CITIES.find(c => c.id === tour.kr.route[Math.min(tour.kr.idx, tour.kr.route.length - 1)]) || {}).label +
          ' · date ' + Math.min(tour.kr.idx + 1, tour.kr.route.length) + '/' + tour.kr.route.length +
          (tour.kr.encores ? ' (+' + tour.kr.encores + ' encore' + (tour.kr.encores > 1 ? 's' : '') + ')' : '')
        : legId === 'kr' ? 'Korea' : KP.regionLabel(legId);
      return switcher + '<div class="group-hero"><div class="g-status">On tour · ' + UI.esc(g.name) + '</div>' +
        '<div class="g-name" style="font-size:clamp(1.7rem,8vw,2.4rem)">The road<br>has them.</div>' +
        '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px">' +
        '<span class="chip hot">' + UI.esc(T.SCALES[tour.scale].label) + ' · leg ' + (tour.legIdx + 1) + '/' + tour.legs.length + ' · ' + UI.esc(where) + '</span>' +
        '<span class="chip">' + UI.esc(T.PACING[tour.pacing].label.toLowerCase()) + ' pacing</span>' +
        '<span class="chip cool">' + UI.esc(T.SETLISTS[tour.setlist].label.toLowerCase()) + ' setlist</span>' +
        (tour.soldOut ? '<span class="chip gold">' + tour.soldOut + ' sold out</span>' : '') +
        '</div>' +
        // the next stop, named before it plays (v0.11.7, §98) — the Today card's own read
        (() => { const rd = KP.tourRoadRead ? KP.tourRoadRead(state, g) : null;
          return rd && rd.nextStop ? '<div style="font-size:.84rem;margin-top:10px">Next: ' + UI.esc(rd.nextStop) + ', ' + UI.esc(KP.weekLabel(rd.nextWeek).text) +
            (rd.demandWord ? ' — ' + UI.esc(rd.demandWord) : '') + '</div>' : ''; })() +
        '<div style="color:var(--ink-dim);font-size:.84rem;margin-top:12px;line-height:1.5">Every leg reports honestly when it closes. Advance the weeks — the leg letters land on the Desk.</div></div>';
    }

    // --- off the road (v0.7.6): post-tour rest is contractual too — the
    // engine always refused to lock inside it (debut.js); now the desk
    // SAYS so instead of rendering a planning room with a locked door
    if (g.debuted && state.week <= (g.tourRestUntil || 0)) {
      const members = g.members.map(id => state.people[id]);
      const avgF = Math.round(members.reduce((s, m) => s + m.fatigue, 0) / members.length);
      return switcher + '<div class="group-hero"><div class="g-status">Post-tour rest · ' + UI.esc(g.name) + '</div>' +
        '<div class="g-name" style="font-size:clamp(1.7rem,8vw,2.4rem)">Home from<br>the road.</div>' +
        '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px">' +
        '<span class="chip cool">calendar reopens ' + UI.esc(KP.weekLabel((g.tourRestUntil || 0) + 1).text) + '</span>' +
        '<span class="chip' + (avgF >= 70 ? ' hot' : '') + '">the room is ' + (avgF >= 70 ? 'running on fumes' : avgF >= 45 ? 'tired' : 'recovering well') + '</span>' +
        ((g.tourHype || 0) > 0 ? '<span class="chip gold">the road seeded the next era</span>' : '') +
        '</div>' +
        '<div style="color:var(--ink-dim);font-size:.84rem;margin-top:12px;line-height:1.5">Post-tour rest is contractual — no release locks until the calendar reopens. The laundry alone takes a week. The producers are writing.</div></div>';
    }

    // --- the calendar is closed: promotion, then contractual rest (v0.4.2)
    if (g.debuted) {
      const opens = (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks;
      if (state.week <= opens) {
        const promoting = state.week <= (g.promoUntil || 0);
        const members = g.members.map(id => state.people[id]);
        const avgF = Math.round(members.reduce((s, m) => s + m.fatigue, 0) / members.length);
        // the repackage door (v0.9.17): the rest window is exactly when
        // an era extends — the reissue rides heat that is still there
        const RP = KP.C.REPACKAGE;
        const last = (g.releases || [])[(g.releases || []).length - 1];
        const repackOpen = !promoting && last && (last.format || 'single') !== 'single' &&
          !last.repackageOf && !last.reissueRested && state.week <= (g.promoUntil || 0) + RP.windowWeeks &&
          (g.eraLeftovers || []).length;
        let repackHtml = '';
        if (repackOpen) {
          // the reissue's own sheet (v0.11.9, §100): the video and the rounds
          // are chosen here — the desk's build by default — not inherited
          // from whatever the last lock form's draft happened to hold
          const MV = KP.C.MV;
          const build = UI.reissueBuildFor(state, g);
          const repackBill = KP.reissueBill(state, g, build);
          const mult = KP.statureCostMult(g);
          const door = (state.scenes || []).find(sc => sc.kind === 'theReissue' && sc.groupId === g.id);
          const tag = d => door && (d.id === door.anrId || d.id === door.fansId)
            ? ' · <span style="color:var(--gold)">' + (d.id === door.anrId && d.id === door.fansId ? 'the chair’s pick and the fans’'
              : d.id === door.anrId ? 'the chair’s pick' : 'the fans’ pick') + '</span>' : '';
          repackHtml = '<div class="kicker" style="margin-top:16px">The era can extend</div>' +
            '<div class="pad" style="font-size:.76rem;color:var(--ink-dim);margin-bottom:4px">“' + UI.esc(last.songTitle) +
            '” is still warm. A repackage re-releases it with a new title track — from the era’s own drawer of passed demos — on a shorter cycle. The window closes ' +
            UI.esc(KP.weekLabel((g.promoUntil || 0) + RP.windowWeeks).text) + '.' +
            (door ? ' The same call is waiting on the Desk with the desk’s build; this sheet is where you change it.' : '') + '</div>' +
            '<div class="pad" style="padding-top:0"><div style="font-size:.7rem;color:var(--ink-dim);margin-bottom:4px">The video</div>' +
            '<div class="seg" style="margin-bottom:8px">' + Object.keys(MV.TIERS).map(tid =>
              '<button class="' + (build.mv === tid ? 'on' : '') + '" data-action="reissue-mv" data-id="' + g.id + '" data-mv="' + tid + '">' +
              UI.esc(MV.TIERS[tid].label) + ' · ' + Math.round(MV.TIERS[tid].cost * mult) + '</button>').join('') + '</div>' +
            '<div style="font-size:.7rem;color:var(--ink-dim);margin-bottom:4px">Fan-sign rounds — they sell the reprint and spend the members</div>' +
            '<div class="seg">' + [0, 1, 2, 3].map(sr =>
              '<button class="' + (build.signRounds === sr ? 'on' : '') + '" data-action="reissue-signs" data-id="' + g.id + '" data-r="' + sr + '">' + sr + '</button>').join('') + '</div>' +
            '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:8px">The reissue as built: a ' + UI.esc(MV.TIERS[build.mv].label) + ', ' +
            UI.esc(KP.roundsWord(build.signRounds)) + ', a pressing of ' + KP.fmtCount(KP.reissuePressing(state, g, build.signRounds).run) +
            '. The bill is ' + repackBill + ', video, pressing and rounds included.</div></div>' +
            (g.eraLeftovers || []).map(d => '<div class="card" style="padding:10px 12px;display:flex;align-items:center;gap:10px">' +
              '<div style="flex:1;min-width:0"><div style="font-weight:800">“' + UI.esc(d.title) + '”</div>' +
              '<div style="font-size:.72rem;color:var(--ink-dim)">' + UI.esc(d.producer) + ' · leans ' + UI.esc((KP.conceptById(d.conceptId) || {}).label || '') + tag(d) + '</div></div>' +
              '<button class="btn small primary" data-action="studio-repackage" data-id="' + g.id + '" data-song="' + d.id + '"' +
              (state.budget < repackBill ? ' disabled' : '') + '>Repackage</button></div>').join('');
        }
        // the promotion desk (v0.10.38, §91 B5): the plan's weeks, the
        // offer waiting on the Desk, the extension, the booking desks' memory
        let promoHtml = '';
        if (promoting && g.rollout) {
          const A = KP.C.ROLLOUT.ACTIVITIES;
          const idx = state.week - (g.lastReleaseWeek || 0) - 1;
          const offer = (state.scenes || []).find(sc => sc.kind === 'promoOffer' && sc.groupId === g.id);
          const ext = KP.extensionRead ? KP.extensionRead(state, g) : { ok: false };
          const climb = KP.recordClimbing ? KP.recordClimbing(state, g) : { climbing: false };
          const weeks = g.rollout.map((wk, i) => '<div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid var(--line)' + (i < idx ? ';opacity:.5' : '') + '">' +
            '<span style="font-size:.72rem;color:var(--ink-dim);min-width:46px">Wk ' + (i + 1) + (i === idx ? ' · now' : '') + '</span>' +
            '<span style="font-size:.8rem">' + (wk.length ? wk.map(a => UI.esc((A[a] || { label: a }).label)).join(' · ') : 'a breather') + '</span></div>').join('');
          const desks = KP.broadcasterLines ? KP.broadcasterLines(state) : [];
          promoHtml = '<div class="kicker" style="margin-top:16px">The promotion' + (g.eraExtendedWeek ? ' · extended' : '') + '</div>' +
            '<div class="card">' + weeks +
            '<div style="font-size:.74rem;color:var(--ink-dim);margin-top:8px;line-height:1.5">' +
            (climb.climbing ? 'The record is climbing — ' + UI.esc(climb.why) + ' says so. ' : 'The record is holding, not climbing. ') +
            (offer ? 'An invitation is waiting on the Desk — it answers within the week. ' : 'Offers arrive keyed to how the record is doing: a show for the risers and the carriers, variety for a face. ') +
            desks.map(UI.esc).join(' ') + '</div>' +
            (ext.ok
              ? '<div style="margin-top:10px"><button class="btn primary" style="width:100%" data-action="era-extend" data-id="' + g.id + '">Extend the era · ' + ext.weeks + ' weeks · bookings ' + ext.bill + '</button>' +
                '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:6px">On the strength of ' + UI.esc(ext.why) + '. The members pay in hours' + (ext.tired ? ' — and the staff say the room is already tired' : '') + '.</div></div>'
              : (state.week === (g.promoUntil || 0) && !g.eraExtendedWeek ? '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:8px">The last week. ' + UI.esc(ext.reason || '') + '</div>' : '')) +
            '</div>';
        }
        return switcher + '<div class="group-hero"><div class="g-status">' +
          (promoting ? 'Mid-promotion · ' : 'Scheduled rest · ') + UI.esc(g.name) + '</div>' +
          '<div class="g-name" style="font-size:clamp(1.7rem,8vw,2.4rem)">' +
          (promoting ? 'The stages<br>come first.' : 'Let them<br>sleep.') + '</div>' +
          '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px">' +
          (promoting ? '<span class="chip hot">promo through ' + UI.esc(KP.weekLabel(g.promoUntil).text) + '</span>' : '') +
          '<span class="chip cool">calendar reopens ' + UI.esc(KP.weekLabel(opens + 1).text) + '</span>' +
          '<span class="chip' + (avgF >= 70 ? ' hot' : '') + '">the room is ' + (avgF >= 70 ? 'running on fumes' : avgF >= 45 ? 'tired' : 'recovering well') + '</span>' +
          '</div>' +
          '<div style="color:var(--ink-dim);font-size:.84rem;margin-top:12px;line-height:1.5">' +
          (promoting
            ? 'Promotion runs hot by design. The rest window after it is contractual — the next release cannot be locked until the calendar reopens.'
            : 'The rest is contractual and it works: recovery runs at double pace until the calendar reopens. The producers are already writing.') +
          '</div></div>' + promoHtml + repackHtml;
      }
    }

    // --- planning mode ---
    // render never draws rng (kernel law, v0.7.2): demos are generated
    // at formation and by the weekly tick. If they are not here yet,
    // the producers are literally still writing — say so and wait.
    if (!g.demos) {
      return switcher + '<div class="group-hero"><div class="g-status">The pitch meeting · ' + UI.esc(g.name) + '</div>' +
        '<div class="g-name" style="font-size:clamp(1.7rem,8vw,2.4rem)">The producers<br>are writing.</div>' +
        '<div style="color:var(--ink-dim);font-size:.86rem;margin-top:8px;line-height:1.5">Fresh pitches land next week' +
        (g.concept ? ' — written to the ' + UI.esc((KP.conceptById(g.concept) || {}).label || '') + ' brief' : '') +
        '. Advance the week; the demos will be on the desk.</div></div>';
    }
    const members = g.members.map(id => state.people[id]);
    const sel = g.demos.find(s => s.id === draft.songId) || null;
    const conceptId = draft.conceptId || (sel ? sel.conceptId : null);
    if (conceptId) UI.setEra(conceptId);

    html.push(switcher);
    html.push('<div class="pad"><div class="d-label">' + (g.debuted ? 'Comeback planning' : 'Debut planning') + ' · ' + UI.esc(g.name) + '</div>' +
      '<div class="bigname" style="font-size:clamp(1.6rem,8vw,2.2rem)">Pick the record.<br>Pick the day.</div>' +
      (g.debuted && g.results ? '<div style="font-size:.76rem;color:var(--ink-dim);margin-top:8px">Last release: “' + UI.esc(g.results.songTitle) + '” — ' + UI.esc(g.results.receptionLabel.toLowerCase()) + ', scene #' + g.results.chartPeak + (g.results.nationalPeak != null ? ' · national #' + g.results.nationalPeak : '') + '. The room is ' + KP.popularityWord(g.popularity) + '.</div>' : '') +
      '</div>');

    // the song camp (v0.10.5): the spend verb that summons a hotter sheet
    const campReady = state.week - (g.lastCampWeek || -999) >= KP.C.MARKET.campCooldown &&
      state.budget >= KP.C.MARKET.campCost;
    // the studio (v0.10.35): commission a record — the brief, the people, the fee
    html.push(commissionCard(state, g, KP.App.commDraft || (KP.App.commDraft = { lane: null, theme: null, producerId: null, writerId: null })));
    html.push('<div class="kicker">Demos on the desk</div>');
    if (campReady) {
      html.push('<div class="pad" style="padding-top:0"><button class="btn small" data-action="song-camp" data-id="' + g.id + '">Hold a song camp · ' + KP.C.MARKET.campCost + '</button>' +
        '<span style="font-size:.68rem;color:var(--ink-dim);margin-left:8px">flights, studios, a deeper and hotter sheet</span></div>');
    }
    g.demos.forEach(demo => {
      const on = draft.songId === demo.id;
      // the advocates (v0.9.17): the meeting has politics, worn openly
      const advocates = [];
      if (demo.pushed) advocates.push('<span class="chip hot">the producer’s push</span>');
      if (demo.execFavored) advocates.push('<span class="chip gold">' + UI.esc(state.executive.name.split(' ')[0]) + '’s kind of record</span>');
      // the song market (v0.10.5): the sheet shows its prices and clocks
      if (demo.bonded) advocates.push('<span class="chip gold">house regular</span>');
      if (demo.circUntil) {
        const left = demo.circUntil - state.week;
        advocates.push('<span class="chip hot">circulating · ' +
          (left > 0 ? left + ' wk window' : 'window CLOSED') + '</span>');
      }
      if (demo.price > 0) advocates.push('<span class="chip">asking ' + demo.price + '</span>');
      if (demo.writtenBy) {
        const w = state.people[demo.writtenBy];
        advocates.push('<span class="chip hot">written by ' + UI.esc(w ? KP.publicGiven(w) : 'a member') + '</span>');
      }
      // the studio (v0.10.35): the brief's record, the theme, the lyric's name
      if (demo.commissioned) advocates.push('<span class="chip gold">commissioned</span>');
      if (demo.theme && KP.themeById(demo.theme)) advocates.push('<span class="chip">about ' + UI.esc(KP.themeById(demo.theme).label.toLowerCase()) + '</span>');
      if (demo.writer && !demo.writtenBy) advocates.push('<span class="chip">lyric · ' + UI.esc(demo.writer) + '</span>');
      // the sound of the year (v0.10.34): the lane against the year, in a chip
      if (KP.trendWord) {
        const tw = KP.trendWord(state, demo.conceptId);
        if (tw === 'the year’s sound') advocates.push('<span class="chip cool">the year’s sound</span>');
        else if (tw === 'against the year’s sound') advocates.push('<span class="chip">against the year’s sound</span>');
      }
      html.push('<div class="card demo-card ' + (on ? 'on' : '') + '" data-action="studio-song" data-id="' + demo.id + '">' +
        '<div class="s-eq"><i></i><i></i><i></i></div>' +
        '<div class="s-title">“' + UI.esc(demo.title) + '”</div>' +
        '<div class="s-prod">' + UI.esc(demo.producer) + ' · leans ' + UI.esc(KP.conceptById(demo.conceptId).label) +
        (demo.toBrief ? ' · <span style="color:var(--gold)">to the brief</span>' : '') + '</div>' +
        (advocates.length ? '<div style="display:flex;gap:5px;flex-wrap:wrap;margin:5px 0 2px">' + advocates.join('') + '</div>' : '') +
        '<div class="s-notes">' + KP.demoOpinion(state, demo, members).map(l => UI.esc(l)).join('<br>') + '</div>' +
        '</div>');
    });

    if (sel) {
      // the company names the record (v0.8.4, owner request)
      html.push('<div class="kicker">The title</div>');
      html.push('<div class="pad"><input class="nc-input" id="title-name-input" maxlength="24" ' +
        'placeholder="Rename “' + UI.esc(sel.title) + '”… (optional)" value="' + UI.esc(draft.customTitle || '') + '">' +
        '<div style="font-size:.68rem;color:var(--ink-dim);margin-top:5px">The producers pitch working titles. The company names records. Leave it blank to keep theirs.</div></div>');
      html.push('<div class="kicker">Concept direction</div>');
      html.push('<div class="concept-scroll">' +
        KP.C.CONCEPTS.map(c => '<button class="chip concept-pill ' + (conceptId === c.id ? 'on' : '') + '" ' +
          'data-action="studio-concept" data-id="' + c.id + '">' + UI.esc(c.label) +
          (c.id === sel.conceptId ? ' ✦' : '') + '</button>').join('') +
        '</div>' +
        '<div class="pad" style="font-size:.7rem;color:var(--ink-dim)">✦ = the demo’s natural lean. Fighting it is allowed. Sometimes it even works.</div>');

      const a = draft.alloc;
      html.push('<div class="kicker">Rehearsal allocation</div><div class="card">' +
        ['vocals', 'dance', 'rap', 'media'].map(k =>
          '<div class="alloc-row"><span class="a-label">' + k + '</span>' +
          '<input type="range" min="0" max="70" step="5" value="' + a[k] + '" data-action="studio-alloc" data-key="' + k + '">' +
          '<span class="a-val">' + a[k] + '%</span></div>').join('') +
        '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:10px">Total ' +
        (a.vocals + a.dance + a.rap + a.media) + '% — must land on 100.</div></div>');

      const fmt = KP.C.DEBUT.FORMATS.find(f => f.id === draft.format) || KP.C.DEBUT.FORMATS[0];
      html.push('<div class="kicker">The record</div>');
      html.push('<div class="pad"><div class="seg">' +
        KP.C.DEBUT.FORMATS.map(f => '<button class="' + (draft.format === f.id ? 'on' : '') + '" ' +
          'data-action="studio-format" data-format="' + f.id + '">' + UI.esc(f.label) + ' · ' + f.cost + '</button>').join('') +
        '</div><div style="font-size:.7rem;color:var(--ink-dim);margin-top:8px">' +
        UI.esc(fmt.label) + ': ' + fmt.tracks + ' tracks, needs ' + Math.max(KP.C.DEBUT.prepWeeksMin, fmt.minPrep) + ' weeks of runway, pays ×' + fmt.revenueMult + ' when it lands.</div></div>');

      // the solo project (v0.10.24, §87 E): one mini through the group
      // name, one solo single per member — the title pick is the call
      {
        const ST = KP.C.STAR;
        const actives = g.members.map(id => state.people[id])
          .filter(m => m && m.status === 'idol' && !m.flags.military && !KP.onBreak(m));
        const projectOpen = g.debuted && g.type !== 'solo' && actives.length >= 3 &&
          state.week - (g.lastSoloProjectWeek || -999) >= ST.projectCooldown;
        if (projectOpen) {
          if (draft.soloProject && !actives.some(m => m.id === draft.projectTitleId)) {
            draft.projectTitleId = actives[0].id;
          }
          html.push('<div class="kicker">The solo project</div>');
          html.push('<div class="card"><button class="btn small' + (draft.soloProject ? ' primary' : ' ghost') + '"' +
            (draft.soloProject ? '' : ' style="border:1px solid var(--line)"') +
            ' data-action="studio-project">' +
            (draft.soloProject ? 'ON — one solo single for every member' : 'Make it the project — a single for every member') + '</button>' +
            (draft.soloProject
              ? '<div style="margin-top:10px;font-size:.72rem">Whose single leads it: <select data-action="studio-project-title">' +
                actives.map(m => '<option value="' + m.id + '"' + (m.id === draft.projectTitleId ? ' selected' : '') + '>' +
                  UI.esc(KP.displayName(m)) + '</option>').join('') +
                '</select></div>' +
                '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:8px">A mini through ' + UI.esc(g.name) + '’s name — ' + actives.length + ' tracks, each one member’s own single. The title pick leads the era, and the fandom will compare every number. A generational event: long cooldown.</div>'
              : '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:8px">The aespa format: the group releases a mini that is nothing but member solos. Everyone gets a spotlight; the spotlights get compared.</div>') +
            '</div>');
        }
      }

      // the MV (v0.9.17): the video is an object with a budget tier
      const MV = KP.C.MV;
      const statureMult0 = KP.statureCostMult(g);
      if (!draft.mv) draft.mv = 'standard';
      html.push('<div class="kicker">The video</div>');
      html.push('<div class="pad"><div class="seg">' +
        Object.keys(MV.TIERS).map(tid => '<button class="' + (draft.mv === tid ? 'on' : '') + '" ' +
          'data-action="studio-mv" data-mv="' + tid + '">' + UI.esc(MV.TIERS[tid].label) + ' · ' + Math.round(MV.TIERS[tid].cost * statureMult0) + '</button>').join('') +
        '</div><div style="font-size:.7rem;color:var(--ink-dim);margin-top:8px">' +
        (draft.mv === 'cinema' ? 'A cinema budget lifts the record, travels overseas, and makes the breakout’s numbers move harder. Expensive on purpose.'
          : draft.mv === 'plain' ? 'A performance cut saves real money. The internet notices budgets — the receipts go to the company, not the members.'
          : 'The standard video: professional, invisible, exactly what it costs.') + '</div></div>');

      html.push('<div class="kicker">Promotion</div>');
      // the price of fame (v0.9.14): the bill the studio shows is the
      // bill planDebut charges — one truth, stature multiplier included
      const statureMult = KP.statureCostMult(g);
      html.push('<div class="pad"><div class="seg">' +
        KP.C.DEBUT.promoLevels.map(pl => '<button class="' + (draft.promo === pl ? 'on' : '') + '" ' +
          'data-action="studio-promo" data-promo="' + pl + '">' + pl + ' · ' + Math.round(KP.C.DEBUT.promoCost[pl] * statureMult) + '</button>').join('') +
        '</div><div style="font-size:.7rem;color:var(--ink-dim);margin-top:8px">Plus the record itself (' + Math.round(fmt.cost * statureMult) + ').' +
        (statureMult > 1 ? ' An act this size bills like it — video, staging, styling scale with the name (×' + statureMult.toFixed(1) + ').' : '') +
        ' Budget: ' + state.budget + '.</div></div>');

      // the rollout builder (v0.6.3): 4 promo weeks, 2 bookings each —
      // constrained choices, not sliders
      const R = KP.C.ROLLOUT;
      if (!draft.rollout) draft.rollout = R.DEFAULT.map(w => w.slice());
      const rolloutCost = draft.rollout.reduce((s, wk) =>
        s + wk.reduce((x, a) => x + (R.ACTIVITIES[a] ? R.ACTIVITIES[a].cost : 0), 0), 0);
      html.push('<div class="kicker">The rollout · ' + R.slotsPerWeek + ' bookings a week · cost ' + rolloutCost + '</div>');
      html.push('<div class="card">' + draft.rollout.map((wk, i) =>
        '<div class="ro-week"><span class="ro-label">Wk ' + (i + 1) + '</span>' +
        '<div class="ro-chips">' +
        Object.keys(R.ACTIVITIES).map(a =>
          '<button class="chip ro-chip' + (wk.includes(a) ? ' on' : '') + '" ' +
          'data-action="studio-rollact" data-week="' + i + '" data-act="' + a + '">' +
          UI.esc(R.ACTIVITIES[a].label) + '</button>').join('') +
        '</div></div>').join('') +
        '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:8px">The Countdown is the Sunday institution, Prime Stage rewards performers, Pop Wave takes chances on new faces — and every show week, somebody goes home with the trophy. Variety builds faces; fan signs buy loyalty; the challenge is cheap reach; rest is rest. They cannot be everywhere — pick.</div>' +
        // marketing fit (v0.10.38, §91 B5): the seat reads the record's lane
        (KP.promoFitSummary && draft.conceptId ? (() => {
          const f = KP.promoFitSummary(draft.conceptId);
          return (f.home.length || f.off.length)
            ? '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:6px">For a ' + UI.esc((KP.conceptById(draft.conceptId) || { label: '' }).label.toLowerCase()) + ' record the marketing seat reads: ' +
              (f.home.length ? 'built for it — ' + f.home.map(UI.esc).join(', ') : '') + (f.home.length && f.off.length ? '; ' : '') +
              (f.off.length ? 'the wrong tool — ' + f.off.map(UI.esc).join(', ') : '') + '.</div>'
            : '';
        })() : '') +
        '</div>');

      // the product (v0.10.0, §80): the pressing sheet — the album is a
      // product line, and the run is a bet against the pre-order read
      if (KP.suggestPressing) {
        const P = KP.C.PRODUCT;
        if (!draft.pressing) draft.pressing = KP.suggestPressing(state, g);
        const dp = draft.pressing;
        const sheet = KP.normalizePressing(state, g, dp);
        const bill = KP.pressingBill(state, g, sheet);
        const preorders = KP.preorderRead(state, g);
        html.push('<div class="kicker">The pressing · bill ' + bill + '</div>');
        html.push('<div class="card">' +
          '<div style="font-size:.7rem;color:var(--ink-dim);margin-bottom:4px">Versions — collectors buy the line</div>' +
          '<div class="seg" style="margin-bottom:8px">' + [1, 2, 3, 4].map(v =>
            '<button class="' + (sheet.versions === v ? 'on' : '') + '" data-action="press-versions" data-v="' + v + '">' + v + '</button>').join('') + '</div>' +
          '<div style="font-size:.7rem;color:var(--ink-dim);margin-bottom:4px">Pre-order gifts</div>' +
          '<div class="seg" style="margin-bottom:8px">' + Object.keys(P.pobCost).map(pb =>
            '<button class="' + (sheet.pob === pb ? 'on' : '') + '" data-action="press-pob" data-pob="' + pb + '">' + pb + '</button>').join('') + '</div>' +
          '<div style="font-size:.7rem;color:var(--ink-dim);margin-bottom:4px">The run — pre-orders read ' + KP.fmtCount(preorders) + '; press cautious, to the read, or brave</div>' +
          '<div class="seg" style="margin-bottom:8px">' + Object.keys(P.runPresets).map(rp =>
            '<button class="' + (sheet.preset === rp ? 'on' : '') + '" data-action="press-run" data-preset="' + rp + '">' + rp + '</button>').join('') + '</div>' +
          '<div style="font-size:.7rem;color:var(--ink-dim);margin-bottom:4px">Fan-sign rounds — entry rides purchases; rounds sell albums and spend the members</div>' +
          '<div class="seg">' + [0, 1, 2, 3].map(sr =>
            '<button class="' + (sheet.signRounds === sr ? 'on' : '') + '" data-action="press-signs" data-r="' + sr + '">' + sr + '</button>').join('') + '</div>' +
          '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:8px">Pressing ' + KP.fmtCount(sheet.run) + ' units. Undersell the week that counts and the reorder catches only the diehards; overpress and the warehouse writes the memo. First-week sales print PUBLICLY — the fandom’s scoreboard, next to the public’s.' +
          (sheet.signRounds >= P.dumpRiskAt ? ' <span style="color:var(--magenta)">Heavy rounds risk the album-dumping story.</span>' : '') + '</div>' +
          '</div>');
      }

      const minW = state.week + Math.max(KP.C.DEBUT.prepWeeksMin, fmt.minPrep);
      const options = [];
      const lastOption = (state.objective.status === 'open' && state.objective.type === 'debutGirlGroup')
        ? Math.min(minW + 16, state.objective.deadlineWeek)
        : minW + 16;
      for (let w = minW; w <= lastOption; w += 2) options.push(w);
      html.push('<div class="kicker">The date</div>');
      // the war calendar (v0.6.4): announced rival weeks are visible at
      // pick time — dodge the traffic, or pick the fight on purpose
      html.push('<div class="pad"><div style="display:flex;gap:8px;flex-wrap:wrap">' +
        options.map(w => {
          const foes = KP.announcedAt(state, w);
          const big = foes.find(x => (x.act.popularity || 0) >= KP.C.WAR.battleMinPop);
          return '<button class="chip ' + (draft.week === w ? 'hot' : '') + (big ? ' clash' : '') +
            '" data-action="studio-week" data-week="' + w + '">' + UI.esc(KP.weekLabel(w).text) +
            (foes.length ? ' · vs ' + UI.esc(foes[0].act.name) : '') + '</button>';
        }).join('') +
        '</div>' +
        (options.length ? '' : '<div style="color:var(--danger);font-size:.8rem">No runway left before the deadline.</div>') +
        '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:8px">Announced rival weeks are marked. A clean week keeps the public’s attention whole; a shared week is a head-to-head the recaps will score.</div>' +
        '</div>');

      // genre-bending (v0.9.6): under the fusion brief, the second option
      // — pick the two genres to collide. Extremely high risk, high
      // reward, and the desk says so out loud.
      // `sel` is the selected demo from the enclosing scope
      if (g.concept === 'fusion' || (sel && sel.conceptId === 'fusion') || draft.conceptId === 'fusion') {
        const FU = KP.C.FUSION;
        const mashOn = draft.mashA && draft.mashB && draft.mashA !== draft.mashB;
        html.push('<div class="kicker" style="margin-top:20px">The collision</div>');
        html.push('<div class="card">' +
          '<div style="font-size:.78rem;color:var(--ink-dim);margin-bottom:8px">Genre-bending brief detected. Pick two genres to mash — or pick none and release it straight. ' +
          (mashOn ? '<span style="color:var(--magenta)">Locked in: ' + UI.esc(KP.mashLabel([draft.mashA, draft.mashB])) + '. All outcomes are on the table — the flop, the critics’ shrine, the textbook entry.</span>' : 'The mash is the gamble: it can flop, it can be acclaimed and ignored, it can change the industry.') + '</div>' +
          '<div style="font-size:.68rem;color:var(--ink-dim);margin-bottom:4px">First genre</div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' +
          FU.GENRES.map(ge => '<button class="chip' + (draft.mashA === ge ? ' hot' : '') + '" data-action="mash-a" data-genre="' + UI.esc(ge) + '">' + UI.esc(ge) + '</button>').join('') +
          '</div>' +
          '<div style="font-size:.68rem;color:var(--ink-dim);margin-bottom:4px">Second genre</div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
          FU.GENRES.map(ge => '<button class="chip' + (draft.mashB === ge ? ' hot' : '') + '" data-action="mash-b" data-genre="' + UI.esc(ge) + '">' + UI.esc(ge) + '</button>').join('') +
          '</div></div>');
      }

      html.push('<div class="pad" style="margin-top:20px">' +
        '<button class="btn primary" style="width:100%" data-action="studio-lock"' + (draft.week ? '' : ' disabled') + '>Lock the ' + (g.debuted ? 'comeback' : 'debut') + '</button></div>');
    }

    // --- the touring desk (v0.6.8): the other thing a calendar is for ---
    const gate = KP.tourEligible(state, g);
    if (gate.ok) {
      const T = KP.C.TOUR;
      const td = KP.App.tourDraft = KP.App.tourDraft ||
        { scale: 'clubs', legs: [], pacing: 'humane', setlist: 'hits' };
      const scale = T.SCALES[td.scale];
      // mirror the engine's pricing: the home circuit costs by the week
      const krRoute = td.legs.includes('kr') ? KP.krRoute(state, g, td.scale) : [];
      const krWeeks = krRoute.length ? Math.max(1, Math.ceil(krRoute.length / T.datesPerWeek)) : 0;
      const costUnits = Math.max(1, td.legs.filter(l => l !== 'kr').length + krWeeks);
      const cost = Math.round(scale.costPerLeg * costUnits * T.PACING[td.pacing].costMult);
      html.push('<div class="kicker" style="margin-top:26px">The touring desk</div>');
      html.push('<div class="card">' +
        '<div class="seg" style="margin-bottom:10px">' +
        Object.keys(T.SCALES).map(s => '<button class="' + (td.scale === s ? 'on' : '') + '" data-action="tour-scale" data-scale="' + s + '">' + UI.esc(T.SCALES[s].label) + '</button>').join('') +
        '</div>' +
        '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px">' +
        KP.tourLegOptions(state, g).map(o => {
          const on = td.legs.includes(o.id);
          const viable = o.demand >= scale.sweetSpot * T.softBelow * 0.6;
          return '<button class="chip' + (on ? ' hot' : '') + '" data-action="tour-leg" data-leg="' + o.id + '"' +
            (viable ? '' : ' style="opacity:.4"') + '>' + UI.esc(o.label) + ' · ' +
            (o.id === 'kr' ? KP.popularityWord(o.demand) : KP.regionWord(o.demand)) + '</button>';
        }).join('') +
        '</div>' +
        '<div class="seg" style="margin-bottom:10px">' +
        Object.keys(T.PACING).map(p => '<button class="' + (td.pacing === p ? 'on' : '') + '" data-action="tour-pacing" data-pacing="' + p + '">' + UI.esc(T.PACING[p].label) + '</button>').join('') +
        '</div>' +
        '<div class="seg" style="margin-bottom:10px">' +
        Object.keys(T.SETLISTS).map(sl => '<button class="' + (td.setlist === sl ? 'on' : '') + '" data-action="tour-setlist" data-setlist="' + sl + '">' + UI.esc(T.SETLISTS[sl].label) + '</button>').join('') +
        '</div>' +
        (krRoute.length
          ? '<div style="font-size:.7rem;color:var(--cyan);margin-bottom:6px">Home circuit routes ' + krRoute.length + ' cities (' +
            krRoute.map(id => UI.esc((T.KR_CITIES.find(c => c.id === id) || {}).label || id)).join(' → ') +
            ') over ' + krWeeks + ' week' + (krWeeks > 1 ? 's' : '') + '. Cities that sell out earn a second night.</div>'
          : '') +
        '<div style="font-size:.7rem;color:var(--ink-dim);margin-bottom:10px">Overseas legs run ' + T.legWeeks + ' weeks each; the home circuit plays ' + T.datesPerWeek + ' cities a week. Punishing pacing is cheaper and costs the humans; humane costs money. The hits sell, new material seeds the next era, fan service builds devotion. Production: ' + cost + '.</div>' +
        '<button class="btn primary" style="width:100%" data-action="tour-book"' + (td.legs.length ? '' : ' disabled') + '>Book the tour · ' + cost + '</button>' +
        '</div>');
    }
    return html.join('');
  };

  // ---- results ---------------------------------------------------------
  UI.renderResults = function (state, groupId) {
    const g = (groupId && KP.groupById(state, groupId)) ||
      KP.groups(state).filter(x => x.results)
        .sort((a, b) => (b.results.week || 0) - (a.results.week || 0))[0];
    if (!g || !g.results) return '<div class="card">No report yet.</div>';
    const r = g.results;
    const html = [];
    UI.setEra(r.conceptId);
    const breakout = state.people[r.breakoutId];

    html.push('<div class="result-hero">' +
      '<div class="r-band">' + (r.isDebut === false ? 'Comeback report' : 'Debut report') + ' · ' + UI.esc(KP.weekLabel(r.week).text) + '</div>' +
      '<div class="r-title">' + UI.esc(r.receptionLabel) + '</div>' +
      '<div class="r-song">' + UI.esc(g.name) + ' — “' + UI.esc(r.songTitle) + '” · ' + UI.esc(KP.conceptById(r.conceptId).label) +
      (r.mash ? ' · <span style="color:var(--magenta)">' + UI.esc(KP.mashLabel(r.mash)) + '</span>' : '') + '</div>' +
      // the verdict lives where the question does (0.9.8.3)
      (r.fusionOutcome ? '<div style="margin-top:6px"><span class="chip ' +
        (r.fusionOutcome === 'shift' ? 'gold' : r.fusionOutcome === 'acclaim' ? 'cool' : r.fusionOutcome === 'flop' ? 'clash' : 'hot') + '">the mash: ' +
        (r.fusionOutcome === 'shift' ? 'CHANGED THE INDUSTRY'
          : r.fusionOutcome === 'acclaim' ? 'critics’ shrine, public shrug'
          : r.fusionOutcome === 'flop' ? 'ate itself' : 'it worked') + '</span></div>' : '') +
      // the two verdicts (v0.10.34): the critics' consensus, in a word
      (r.critics ? '<div style="margin-top:6px;font-size:.78rem;color:var(--ink-dim)">' +
        UI.esc(KP.criticsLine(state, r.critics, r.songTitle)) + '</div>' : '') +
      // the sheet (v0.10.36): the booth's verdict — who owned her part, who reached
      (r.sheetLine ? '<div style="margin-top:4px;font-size:.78rem;color:var(--ink-dim)">' + UI.esc(r.sheetLine) + '</div>' : '') +
      '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:14px">' +
      (r.critics ? '<span class="chip ' + (['acclaimed', 'warm'].includes(r.critics.consensus) ? 'cool' : r.critics.consensus === 'mixed' ? '' : 'clash') + '">critics: ' + UI.esc(KP.verdictWord(r.critics.consensus)) + '</span>' : '') +
      // the comeback stage (v0.10.38): the era's first stage, by band
      (r.comebackStage ? '<span class="chip ' + (r.comebackStage.band === 'carried' ? 'gold' : r.comebackStage.band === 'fumbled' ? 'clash' : '') + '">' + (r.isDebut === false ? 'comeback' : 'debut') + ' stage: ' + UI.esc(r.comebackStage.band) + '</span>'
        : '<span class="chip">stage: ' + perfWord(r.performance) + '</span>') +
      '<span class="chip">room: ' + chemWord(r.chem) + '</span>' +
      (r.chartPeak != null ? '<span class="chip cool">scene #' + r.chartPeak + '</span>' : '') +
      (r.nationalPeak != null ? '<span class="chip gold">national #' + r.nationalPeak + '</span>' : '') +
      (r.battle ? '<span class="chip ' + (r.battle.won ? 'gold' : 'hot') + '">' +
        (r.battle.won ? 'took the week vs ' : 'lost the week to ') + UI.esc(r.battle.actName) + '</span>' : '') +
      (r.product && r.product.chodong != null
        ? '<span class="chip hot">chodong ' + KP.fmtCount(r.product.chodong) +
          (r.product.soldOut ? ' · SOLD OUT' : r.product.overpress ? ' · overpressed' : '') + '</span>' : '') +   // the warehouse's verdict (v0.11.5, §96 wiring)
      '<span class="chip gold">revenue +' + r.revenue +
      (r.product ? ' (streams ' + r.product.digital + ' · albums ' + r.product.physRev + ')' : '') + '</span>' +
      '</div></div>');

    html.push('<div class="kicker">The public decided</div>');
    r.publicNotes.forEach(n => html.push('<div class="note">' + UI.esc(n) + '<span class="n-who">— community & PR digest</span></div>'));
    // the b-sides, judged (v0.11.1, §92 A): the record is more than its title —
    // read from the release, the one place they live (audit v0.11.3)
    const relOfResults = (g.releases || []).find(x => x.week === r.week) || null;
    const bsides = (relOfResults && relOfResults.bsides) || r.bsides || [];
    if (bsides.length) {
      const pick = bsides.slice().sort((a, b) => b.heat - a.heat)[0];
      html.push('<div class="kicker">The b-sides</div>');
      html.push('<div class="card" style="font-size:.8rem;line-height:1.6">' +
        bsides.map(b => '<div>' + (b === pick ? '<b>' : '') + 'Track ' + b.n + ' · “' + UI.esc(b.title) + '”' + (b === pick ? '</b>' : '') +
          (b.credit ? ' <span class="chip cool">' + UI.esc(b.credit) + '</span>' : '') +
          ' <span style="color:var(--ink-dim)">' + UI.esc(KP.bsideWord(b)) + (b === pick ? ' · the fan pick' : '') + '</span></div>').join('') +
        '<div style="color:var(--ink-dim);font-size:.72rem;margin-top:6px">The streams are public; the hooks are not. A fan pick hot enough charts beside the title; a warm one can climb mid-era; every b-side with heat is a lottery ticket on the shelf for years.</div>' +
        '</div>');
    }

    html.push('<div class="kicker">Breakout</div>');
    html.push('<div class="card" data-action="open-dossier" data-id="' + breakout.id + '" style="display:flex;gap:14px;align-items:center">' +
      UI.portrait(breakout, 'md') +
      '<div style="flex:1"><div style="font-weight:800">' + UI.esc(KP.displayName(breakout)) + '</div>' +
      '<div style="font-size:.78rem;color:var(--ink-dim);margin-top:3px">' +
      (r.breakoutId === g.roles.center ? 'The center held the center. The plan worked.' : KP.fillPro('Not your center. The public picked {her} anyway.', breakout)) +
      '</div></div></div>');
    if (r.centerOvershadowed) {
      html.push('<div class="note urgent">The designated center is losing the room to ' + UI.esc(breakout.name.given) + '. Reassigning the center is your call to make — and your consequence to own.<span class="n-who">— performance division</span></div>');
    }

    html.push('<div class="kicker">Upstairs</div>');
    html.push('<div class="note">' + UI.esc(r.execLine) + '<span class="n-who">— ' + UI.esc(state.executive.name) + ' · trust ' + (r.trustDelta >= 0 ? 'up' : 'down') + '</span></div>');

    return html.join('');
  };

  // ---- the commission card (v0.10.35): brief a record -------------------
  function commissionCard(state, g, cd) {
    const S = KP.C.STUDIO;
    const html = [];
    html.push('<div class="kicker">Commission a record</div>');
    if (g.commission) {
      const c = g.commission;
      const lane = KP.conceptById(c.lane), theme = KP.themeById(c.theme);
      html.push('<div class="card" style="border-color:var(--gold)"><div style="font-weight:800">The writing room is working</div>' +
        '<div style="font-size:.78rem;color:var(--ink-dim);margin-top:4px">' + UI.esc(c.producer) + ' and ' + UI.esc(c.writer) + ' — ' +
        UI.esc(lane ? lane.label.toLowerCase() : c.lane) + ', about ' + UI.esc(theme ? theme.label.toLowerCase() : c.theme) +
        '. On the desk ' + UI.esc(KP.weekLabel(c.due).text) + '.</div></div>');
      return html.join('');
    }
    if (!cd.lane && g.concept) cd.lane = g.concept;
    const lane = cd.lane ? KP.conceptById(cd.lane) : null;
    const theme = cd.theme ? KP.themeById(cd.theme) : null;
    const members = g.members.map(id => state.people[id]).filter(Boolean);
    const producers = KP.houseProducers(state).concat(KP.producersOf(state));   // both house chairs (v0.10.39)
    const writers = KP.houseWriters(state).concat(KP.writersOf(state))
      .concat(members.filter(KP.canWrite).map(p => KP.penWriter(state, p)));
    const read = cd.lane && cd.theme && cd.producerId && cd.writerId
      ? KP.commissionRead(state, g.id, { lane: cd.lane, theme: cd.theme, producerId: cd.producerId, writerId: cd.writerId }) : null;
    html.push('<div class="card">' +
      '<div style="font-size:.74rem;color:var(--ink-dim);margin-bottom:8px">Brief a record instead of taking what gets pitched: a lane, a theme, a producer, a writer. The producer’s lanes and the writer’s themes are public. What they are worth is not.</div>' +
      '<div class="concept-scroll">' + KP.C.CONCEPTS.map(c => '<button class="chip concept-pill ' + (cd.lane === c.id ? 'on' : '') + '" data-action="comm-lane" data-id="' + c.id + '">' + UI.esc(c.label) + '</button>').join('') + '</div>' +
      '<div style="display:flex;gap:5px;flex-wrap:wrap;margin:8px 0">' + KP.C.THEMES.map(t => {
        const natural = !lane || t.lanes.includes(lane.id);
        return '<button class="chip' + (cd.theme === t.id ? ' hot' : '') + '" data-action="comm-theme" data-id="' + t.id + '"' + (natural ? '' : ' style="opacity:.55"') + '>' + UI.esc(t.label) + '</button>';
      }).join('') + '</div>' +
      (theme ? '<div style="font-size:.7rem;color:var(--ink-dim);margin-bottom:8px">' + UI.esc(theme.label) + ': natural to ' + theme.lanes.map(l => UI.esc((KP.conceptById(l) || { label: l }).label.toLowerCase())).join(', ') +
        ' · a room of ' + theme.ages[0] + '–' + theme.ages[1] + (KP.themeRoomMiss(state, members, theme) ? ' · <span style="color:var(--magenta)">' + UI.esc(KP.themeRoomMiss(state, members, theme)) + '</span>' : '') + '</div>' : '') +
      '<div style="font-size:.72rem;font-weight:800;margin-top:4px">The producer</div>' +
      producers.map(pr => {
        const acc = KP.producerAccess(state, g, pr);
        const on = cd.producerId === pr.id;
        return '<div class="chip-row" style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--line)' + (acc.ok ? '' : ';opacity:.6') + '">' +
          '<button class="chip' + (on ? ' hot' : '') + '" data-action="comm-producer" data-id="' + pr.id + '"' + (acc.ok ? '' : ' disabled') + '>' + UI.esc(pr.name) + (pr.house ? ' · house' : '') + '</button>' +
          '<span style="font-size:.68rem;color:var(--ink-dim);flex:1">' + KP.producerLanes(pr).map(l => UI.esc((KP.conceptById(l) || { label: l }).label.toLowerCase())).join(' / ') +
          ' · ' + UI.esc(KP.producerHeat(pr)) + (lane ? ' · ' + UI.esc(KP.laneFitWord(KP.producerLanes(pr), lane.id)) : '') + (acc.ok ? '' : ' · <span style="color:var(--magenta)">won’t take the call</span>') + '</span>' +
          '<span style="font-size:.7rem">' + (KP.producerFee(pr) ? KP.producerFee(pr) : 'no fee') + '</span></div>';
      }).join('') +
      '<div style="font-size:.72rem;font-weight:800;margin-top:8px">The writer</div>' +
      writers.map(w => {
        const on = cd.writerId === w.id;
        return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--line)">' +
          '<button class="chip' + (on ? ' hot' : '') + '" data-action="comm-writer" data-id="' + w.id + '">' + UI.esc(w.name) + (w.house ? ' · house' : w.pen ? ' · the pen' : '') + '</button>' +
          '<span style="font-size:.68rem;color:var(--ink-dim);flex:1">' + w.themes.map(t => UI.esc((KP.themeById(t) || { label: t }).label.toLowerCase())).join(', ') +
          (theme ? ' · ' + (w.themes.includes(theme.id) ? 'a theme ' + (w.pen ? 'she' : 'they') + ' own' : 'off their themes') : '') + '</span>' +
          '<span style="font-size:.7rem">' + (KP.writerFee(w) ? KP.writerFee(w) : 'no fee') + '</span></div>';
      }).join('') +
      '<div style="margin-top:10px"><button class="btn primary" style="width:100%" data-action="commission" data-id="' + g.id + '"' + (read && read.ok && state.budget >= read.fee ? '' : ' disabled') + '>Commission · ' + (read && read.ok ? read.fee : '—') + '</button>' +
      (read && !read.ok ? '<div style="font-size:.7rem;color:var(--magenta);margin-top:6px">' + UI.esc(read.reason) + '</div>' : '') +
      (read && read.ok ? '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:6px">' + UI.esc(read.fitWord) + ' · ' + UI.esc(read.themeWord) + '. The record lands in ' + S.COMMISSION.writeWeeks[0] + '–' + S.COMMISSION.writeWeeks[1] + ' weeks, beside the pitch.</div>' : '') +
      '</div></div>');
    return html.join('');
  }

  function perfWord(v) { return v >= 75 ? 'commanding' : v >= 58 ? 'sharp' : v >= 42 ? 'uneven' : 'shaky'; }
  function chemWord(v) { return v >= 66 ? 'together' : v >= 40 ? 'workable' : 'cold'; }
})(typeof window !== 'undefined' ? window : globalThis);
