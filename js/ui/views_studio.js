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
        tracklistCard(state, g);
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
          !last.repackageOf && state.week <= (g.promoUntil || 0) + RP.windowWeeks &&
          (g.eraLeftovers || []).length;
        let repackHtml = '';
        if (repackOpen) {
          const repackBill = Math.round(KP.recordBill(g, 'standard', last.format) * RP.costMult) +
            Math.round(KP.C.MV.TIERS.standard.cost * KP.statureCostMult(g));
          repackHtml = '<div class="kicker" style="margin-top:16px">The era can extend</div>' +
            '<div class="pad" style="font-size:.76rem;color:var(--ink-dim);margin-bottom:4px">“' + UI.esc(last.songTitle) +
            '” is still warm. A repackage re-releases it with a new title track — from the era’s own drawer of passed demos — for ' + repackBill +
            ', on a shorter cycle. The window closes ' + UI.esc(KP.weekLabel((g.promoUntil || 0) + RP.windowWeeks).text) + '.</div>' +
            (g.eraLeftovers || []).map(d => '<div class="card" style="padding:10px 12px;display:flex;align-items:center;gap:10px">' +
              '<div style="flex:1;min-width:0"><div style="font-weight:800">“' + UI.esc(d.title) + '”</div>' +
              '<div style="font-size:.72rem;color:var(--ink-dim)">' + UI.esc(d.producer) + ' · leans ' + UI.esc((KP.conceptById(d.conceptId) || {}).label || '') + '</div></div>' +
              '<button class="btn small primary" data-action="studio-repackage" data-id="' + g.id + '" data-song="' + d.id + '"' +
              (state.budget < repackBill ? ' disabled' : '') + '>Repackage</button></div>').join('');
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
          '</div></div>' + repackHtml;
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

    html.push('<div class="kicker">Demos on the desk</div>');
    g.demos.forEach(demo => {
      const on = draft.songId === demo.id;
      // the advocates (v0.9.17): the meeting has politics, worn openly
      const advocates = [];
      if (demo.pushed) advocates.push('<span class="chip hot">the producer’s push</span>');
      if (demo.execFavored) advocates.push('<span class="chip gold">' + UI.esc(state.executive.name.split(' ')[0]) + '’s kind of record</span>');
      if (demo.writtenBy) {
        const w = state.people[demo.writtenBy];
        advocates.push('<span class="chip hot">written by ' + UI.esc(w ? KP.publicGiven(w) : 'a member') + '</span>');
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
        '</div>');

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
      '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:14px">' +
      '<span class="chip">stage: ' + perfWord(r.performance) + '</span>' +
      '<span class="chip">room: ' + chemWord(r.chem) + '</span>' +
      (r.chartPeak != null ? '<span class="chip cool">scene #' + r.chartPeak + '</span>' : '') +
      (r.nationalPeak != null ? '<span class="chip gold">national #' + r.nationalPeak + '</span>' : '') +
      (r.battle ? '<span class="chip ' + (r.battle.won ? 'gold' : 'hot') + '">' +
        (r.battle.won ? 'took the week vs ' : 'lost the week to ') + UI.esc(r.battle.actName) + '</span>' : '') +
      '<span class="chip gold">revenue +' + r.revenue + '</span>' +
      '</div></div>');

    html.push('<div class="kicker">The public decided</div>');
    r.publicNotes.forEach(n => html.push('<div class="note">' + UI.esc(n) + '<span class="n-who">— community & PR digest</span></div>'));

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

  function perfWord(v) { return v >= 75 ? 'commanding' : v >= 58 ? 'sharp' : v >= 42 ? 'uneven' : 'shaky'; }
  function chemWord(v) { return v >= 66 ? 'together' : v >= 40 ? 'workable' : 'cold'; }
})(typeof window !== 'undefined' ? window : globalThis);
