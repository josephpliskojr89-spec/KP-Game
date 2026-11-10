/* Groups tab: the group page (or the builder when none exists).
   Chemistry is observations; roles are decisions; the maknae is a fact. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};
  const UI = KP.UI;

  UI.renderGroups = function (state) {
    // the concluded chapters live below the living ones (0.9.18.2);
    // dissolved pre-debut projects leave no card — there was no era
    const all = KP.groups(state);
    const groups = all.filter(g => !g.retiredWeek);
    const gone = all.filter(g => g.retiredWeek && g.debuted);
    const archive = gone.length
      ? '<div class="kicker" style="margin-top:16px">Concluded</div>' +
        gone.map(g => archiveCard(state, g)).join('')
      : '';
    const lineup = newLineupCard(state);
    const pitch = /pitch-mandate/.test(lineup) ? '' : pitchCard(state);   // the boardroom, once
    if (!groups.length) return renderNoGroup(state) + (state.project ? lineup : '') + pitch + archive;
    if (groups.length === 1) return UI.renderGroupPage(state, groups[0]) + lineup + pitch + archive;
    const html = [];
    groups.forEach(g => html.push(groupCard(state, g)));
    html.push(lineup);
    html.push(pitch);
    html.push(archive);
    return html.join('');
  };

  // the pitch upstairs (from Today since v0.10.41, §89 D15): a new act
  // starts in the boardroom, and the boardroom is reached from here
  function pitchCard(state) {
    if (!KP.pitchMandate) return '';
    const open = (KP.openMandates ? KP.openMandates(state) : []).filter(m => !m.virtual);
    return '<div class="card" style="margin-top:14px"><b>Upstairs</b> — ' +
      (open.length
        ? open.length + ' greenlight' + (open.length === 1 ? '' : 's') + ' open; the window' + (open.length === 1 ? ' is' : 's are') + ' on Today.'
        : 'no greenlight is open. Debuts come down from the boardroom.') +
      '<div style="margin-top:12px">' + UI.pitchButton(state) + '</div></div>';
  }

  function archiveCard(state, g) {
    const rels = (g.releases || []).length;
    const size = (g.finalLineup || []).length || g.members.length;
    const before = alumniOf(state, g).length;
    // the card is a door (v0.11.10, §101): the record page existed and nothing opened it
    return '<div class="card" style="opacity:.72;cursor:pointer" data-action="open-grouppage" data-id="' + g.id + '"><b>' + UI.esc(g.name) + '</b>' +
      '<div style="font-size:.78rem;color:var(--ink-dim);margin-top:4px">Concluded ' +
      UI.esc(KP.weekLabel(g.retiredWeek).text) + ' · ' +
      (g.type === 'solo' ? 'solo act' : size === 1 ? 'one member at the end' : size + ' members at the end') +
      (before ? ' · ' + before + ' before' : '') + ' · ' +
      rels + ' release' + (rels === 1 ? '' : 's') +
      (g.fandom ? ' · ' + UI.esc(g.fandom.name) + ' keeps the archive' : '') +
      '</div></div>';
  }

  // the second life (v0.11.1, §92 E+F): the shelf's tickets, in words, and
  // the push — a streaming party, a dance challenge, the live clip
  function secondLifeCard(state, g) {
    if (!KP.catalogPushRead) return '';
    const read = KP.catalogPushRead(state, g);
    const cands = (read.candidates || []).slice(0, 5);
    const live = read.live || (g.catalogPush && state.week <= g.catalogPush.until ? g.catalogPush : null);
    if (!cands.length && !live) return '';
    const App = KP.App || {};
    const picked = (App._catalogPick && App._catalogPick[g.id]) || (cands[0] && cands[0].title);
    const active = KP.catalogActive ? KP.catalogActive(state, g) : false;
    const html = ['<div class="kicker">The second life</div><div class="card" style="font-size:.8rem;line-height:1.55">'];
    html.push('<div style="color:var(--ink-dim)">Old records are lottery tickets: every song on the shelf can reverse-chart years later — the better the record, the better the ticket' +
      (active ? '; the act is on stages this month, and people hear old songs where they hear the act, so every ticket doubles' : '') + '.</div>');
    if (cands.length) {
      html.push('<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' + cands.map(c =>
        '<button class="btn small' + (c.title === picked ? ' primary' : ' ghost') + '" style="' + (c.title === picked ? '' : 'border:1px solid var(--line)') +
        '" data-action="catalog-pick" data-id="' + g.id + '" data-title="' + UI.esc(c.title) + '">“' + UI.esc(c.title) + '”' +
        (c.kind === 'bside' ? ' · b-side, ' + UI.esc(KP.bsideWord(c.b)) : c.r.sleeperTitle ? ' · the record with the sleeper' : '') + '</button>').join('') + '</div>');
    }
    if (live) {
      html.push('<div style="margin-top:8px;color:var(--gold)">' + UI.esc(KP.C.CATALOG.PUSH.KINDS[live.kind].label) + ' on “' + UI.esc(live.title) + '” — running through ' + UI.esc(KP.weekLabel(live.until).text) + '.</div>');
    } else if (read.ok) {
      html.push('<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' + read.kinds.map(k =>
        '<button class="btn small"' + (k.ok ? '' : ' disabled title="' + UI.esc(k.reason || '') + '"') +
        ' data-action="catalog-push" data-id="' + g.id + '" data-kind="' + k.id + '">' + UI.esc(k.label) + ' · ' + k.cost + '</button>').join('') + '</div>');
    } else if (read.reason) {
      html.push('<div style="margin-top:8px;color:var(--ink-dim)">' + UI.esc(read.reason) + '</div>');
    }
    html.push('</div>');
    return html.join('');
  }

  // the tenure in words (v0.11.5, §96 wiring): weeks are public, so the
  // count shows — phrased off the calendar's own units, no new numbers
  function tenureWords(weeks) {
    const C = KP.C;
    if (!(weeks >= 0)) return '';
    if (weeks < C.WEEKS_PER_MONTH) return 'just took the van keys';
    if (weeks < C.WEEKS_PER_YEAR) {
      const m = Math.floor(weeks / C.WEEKS_PER_MONTH);
      return m + ' month' + (m === 1 ? '' : 's') + ' on the road';
    }
    const y = Math.floor(weeks / C.WEEKS_PER_YEAR);
    return y + ' year' + (y === 1 ? '' : 's') + ' on the road';
  }

  function groupCard(state, g) {
    const promoting = g.debuted && state.week <= (g.promoUntil || 0);
    const status = g.debuted
      ? (g.prep ? 'Comeback in prep' : promoting ? 'Promoting' : g.hiatus ? 'On hiatus' : 'Active')
      : g.prep ? 'Debut in prep' : 'In development';
    return '<div class="group-hero" data-action="open-grouppage" data-id="' + g.id + '" style="cursor:pointer">' +
      '<div class="g-status">' + UI.esc(status) + '</div>' +
      '<div class="g-name" style="font-size:clamp(2rem,10vw,2.8rem)">' + UI.esc(g.name) + '</div>' +
      '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:6px">' +
      '<span class="chip">' + (g.type === 'solo' || g.members.length === 1 ? 'solo act' : g.members.length + ' members') + '</span>' +
      (g.debuted ? '<span class="chip ' + (g.popularity >= 58 ? 'hot' : '') + '">' + KP.popularityWord(g.popularity) + '</span>' : '') +
      ((g.releases || []).length ? '<span class="chip gold">' + g.releases.length + ' release' + (g.releases.length === 1 ? '' : 's') + '</span>' : '') +
      '</div></div>';
  }

  function newLineupCard(state) {
    const free = KP.freeTrainees(state).length;
    if (KP.devGroup(state)) return '';
    if (state.project) {
      const seeking = state.project.seeking.map(d => KP.C.TALENT_LABELS[d]).join(' + ');
      return '<div class="card" style="margin-top:14px"><b>Project open</b> — ' + state.project.locked.length +
        ' locked' + (seeking ? ', seeking ' + UI.esc(seeking) : '') + '. The free trainees are pushing.' +
        '<div style="margin-top:12px"><button class="btn primary" data-action="open-builder">Continue the lineup</button></div></div>';
    }
    if (free >= KP.C.GROUP.minMembers) {
      // the mandate (v0.9.19): the room being ready is half the equation —
      // the greenlight is the other half, and the card says which is missing
      const lit = KP.mandateFitting && KP.mandateFitting(state, { kind: 'group', gender: null, memberIds: [] });
      if (!lit) {
        return '<div class="card" style="margin-top:14px">The trainee room still has people waiting for their shot — ' + free + ' without a lineup. But no greenlight covers a new act: debuts come down from upstairs.' +
          '<div style="margin-top:12px">' + UI.pitchButton(state) + '</div></div>';
      }
      return '<div class="card" style="margin-top:14px">The trainee room still has people waiting for their shot — ' + free + ' without a lineup. The greenlight is open.' +
        '<div style="margin-top:12px"><button class="btn primary" data-action="open-builder">Propose a new lineup</button></div></div>';
    }
    if (free > 0) {
      return '<div class="card" style="margin-top:14px;color:var(--ink-dim);font-size:.82rem">' + free + ' trainee' + (free === 1 ? '' : 's') + ' without a lineup — a second group needs at least ' + KP.C.GROUP.minMembers + '. The scouting board is open.</div>';
    }
    return '';
  }

  function renderNoGroup(state) {
    const ready = KP.freeTrainees(state).length >= KP.C.GROUP.minMembers;
    const monthsLeft = KP.monthsUntil(state.week, state.objective.deadlineWeek);
    return '<div class="group-hero">' +
      '<div class="g-status">No group in development</div>' +
      '<div class="g-name" style="font-size:clamp(1.7rem,8vw,2.4rem)">The lineup<br>is the job.</div>' +
      '<div style="color:var(--ink-dim);font-size:.86rem;line-height:1.5;margin-top:8px">' +
      UI.esc(state.executive.name) + ' expects a 4–6 member girl group' +
      (state.objective.status === 'open' ? ' within ' + monthsLeft + ' months.' : '.') +
      ' The best five trainees are not automatically the best group.</div>' +
      '<div style="margin-top:16px"><button class="btn primary" data-action="open-builder"' + (ready ? '' : ' disabled') + '>Propose a lineup</button></div>' +
      (ready ? '' : '<div style="font-size:.72rem;color:var(--ink-dim);margin-top:8px">You need at least ' + KP.C.GROUP.minMembers + ' unassigned trainees.</div>') +
      '</div>';
  }

  // the discography (lifted out in v0.11.10, §101, unchanged): the story so
  // far, on the record — the living act's page and a concluded one's read it
  function discography(state, g, html) {
      html.push('<div class="kicker">Discography</div>');
      g.releases.slice().reverse().forEach(r => {
        const fmt = KP.C.DEBUT.FORMATS.find(f => f.id === r.format);
        // the record inside the record (v0.7.5): credits and the sleeper
        const creditBits = [];
        (r.tracklist || []).forEach(tr => {
          if (!tr.credit) return;
          if (tr.credit.type === 'solo') {
            const p = state.people[tr.credit.memberId];
            creditBits.push((p ? UI.esc(KP.publicGiven(p)) : '?') + '’s solo “' + UI.esc(tr.title) + '”');
          } else {
            creditBits.push('the ' + tr.credit.memberIds.map(id => {
              const p = state.people[id]; return p ? UI.esc(KP.publicGiven(p)) : '?';
            }).join(' & ') + ' unit “' + UI.esc(tr.title) + '”');
          }
        });
        // the b-sides, judged (v0.11.1, §92 A): the fan pick in words, and
        // any b-side that charted or ran again — never the hook
        if (r.bsides && r.bsides.length) {
          const pick = r.bsides.slice().sort((a, b) => b.heat - a.heat)[0];
          creditBits.push('fan pick “' + UI.esc(pick.title) + '” · ' + UI.esc(KP.bsideWord(pick)) +
            r.bsides.filter(b => b !== pick && (b.peak || b.revivedWeek)).map(b => ' · “' + UI.esc(b.title) + '” ' + UI.esc(KP.bsideWord(b))).join(''));
        } else if (r.sleeperTitle) creditBits.push('b-side hit “' + UI.esc(r.sleeperTitle) + '”');
        if (r.revivedWeek) creditBits.push('reverse run ' + UI.esc(KP.weekLabel(r.revivedWeek).text) + (r.revivalNationalPeak ? ' (national #' + r.revivalNationalPeak + ')' : ''));
        // the pen credits (v0.9.7): names inside the booklet
        (r.tracklist || []).forEach(tr => {
          if (!tr.writtenBy) return;
          const p = state.people[tr.writtenBy];
          if (p) creditBits.push('“' + UI.esc(tr.title) + '” co-written by ' + UI.esc(KP.publicGiven(p)));
        });
        // the era's last line (v0.11.9, §100): how it closed and what followed
        // it — words and the public shelf only, read off the close's own mark
        const closeBit = !r.closed ? '' : ' · closed ' + ({
          crowned: r.closed.trophies >= 2 ? 'with ' + r.closed.trophies + ' trophies' : 'with a trophy',
          warm: 'warm', quiet: 'quietly', cold: 'cold' }[r.closed.verdict] || 'quietly') +
          (r.closed.extended ? ' after a second wind' : '');
        const afterBit = (r.reissuedAs ? ' · reissued as “' + UI.esc(r.reissuedAs) + '”'
          : r.reissueRested ? ' · left to rest' : '') +
          // whose last era it was (v0.11.10, §101)
          ((r.farewellFor || []).map(id => state.people[id]).filter(Boolean).map(p => ' · ' + UI.esc(KP.publicGiven(p)) + '’s last era').join('')) +
          (r.lastRecord ? ' · the last record' : '');   // the act's own (v0.11.11, §102)
        html.push('<div class="mail"><span class="m-tag">' + UI.esc(KP.weekLabel(r.week).text) + '</span>' +
          '<div><b>“' + UI.esc(r.songTitle) + '”</b> · ' + UI.esc(KP.conceptById(r.conceptId).label) +
          (fmt ? ' · ' + UI.esc(fmt.label.toLowerCase()) : '') +
          (r.producer ? ' · prod. ' + UI.esc(r.producer) : '') +
          // the reissue names its era (v0.11.5, §96 wiring): repackageOf is the first record's title
          '<span class="m-week">' + (r.isDebut ? 'debut · ' : r.repackageOf ? 'extends “' + UI.esc(r.repackageOf) + '” · ' : '') + 'peaked #' + r.chartPeak +
          (r.nationalPeak != null ? ' · national #' + r.nationalPeak : '') +
          (r.critics ? ' · critics: ' + UI.esc(KP.verdictWord(r.critics.consensus)) + (r.critics.split ? ' (split)' : '') : '') +
          (r.chartWeeks ? ' · ' + r.chartWeeks + ' weeks charting' : ' · missed the charts') +
          closeBit + afterBit +
          (creditBits.length ? '<br>' + creditBits.join(' · ') : '') + '</span></div></div>');
      });
  }

  // who has left this lineup (v0.11.10, §101): the files stay open forever
  // and were reachable from no list. Words only: where she is now is read
  // off her own file.
  function nowWord(state, p) {
    if (p.status === 'idol') return KP.groupOf(state, p.id) ? KP.fillPro('on {pos} own calendar', p) : 'still with the company';
    const last = (p.chapters || [])[(p.chapters || []).length - 1];
    return last ? KP.chapterLine(state, last).replace(/^./, c => c.toLowerCase()) : 'gone from the company';
  }
  function personChip(state, p, tail) {
    return '<span class="chip" style="cursor:pointer" data-action="open-dossier" data-id="' + p.id + '">' + UI.esc(KP.displayName(p)) +
      (tail ? ' · ' + UI.esc(tail) : '') + '</span>';
  }
  function alumniOf(state, g) {
    const here = new Set((g.members || []).concat(g.finalLineup || []));
    return (g.alumni || []).filter(a => !here.has(a.id) && state.people[a.id]).map(a => ({ p: state.people[a.id], week: a.week }));
  }
  function alumniStrip(state, g) {
    const list = alumniOf(state, g);
    if (!list.length) return '';
    return '<div class="kicker">Former members · ' + list.length + '</div>' +
      '<div class="pad" style="display:flex;gap:7px;flex-wrap:wrap">' +
      list.map(a => personChip(state, a.p, 'left ' + KP.chapterWhen(a.week))).join('') + '</div>';
  }

  // the last bow (v0.11.11, §102): the three doors, as the engine reads
  // them. A door that is shut says why in place of its button.
  UI.endingSheet = function (state, g, read) {
    return '<div class="note">Three ways to close ' + UI.esc(g.name) + '. Whichever one is taken cannot be undone.</div>' +
      read.doors.map(d =>
        '<div class="card" style="margin-top:10px' + (d.ok ? '' : ';opacity:.62') + '">' +
        '<div style="font-weight:800">' + UI.esc(d.title) + '</div>' +
        d.lines.map(l => '<div style="font-size:.78rem;color:var(--ink-dim);margin-top:5px;line-height:1.35">' + UI.esc(l) + '</div>').join('') +
        (d.ok
          ? '<div style="margin-top:10px"><button class="btn ' + (d.id === 'statement' ? 'danger' : 'primary') + '" data-action="ending-door" data-id="' + g.id +
            '" data-how="' + d.id + '" style="width:100%">' + UI.esc(d.label) + '</button></div>'
          : '<div style="font-size:.76rem;color:var(--danger);margin-top:8px;line-height:1.35">' + UI.esc(d.reason) + '</div>') +
        '</div>').join('');
  };
  // an ending in flight: the last record is announced and owed
  function endingCard(state, g) {
    const r = (KP.endingRead ? KP.endingRead(state) : []).find(x => x.groupId === g.id);
    if (!r) return '';
    return '<div class="card" style="border-color:color-mix(in srgb,var(--magenta) 50%,var(--line))">' +
      '<b>The last record</b> — announced ' + UI.esc(KP.weekLabel(r.since).text) + '. ' + UI.esc(r.word.replace(/^./, c => c.toUpperCase())) + '. ' +
      UI.esc(g.type === 'solo' ? 'The chapter' : 'The act') + ' concludes when that era closes, and the final statement names what ' +
      (g.type === 'solo' ? 'comes next' : 'each member does next') + '.' +
      (r.stage === 'open' ? '<div style="margin-top:10px"><button class="btn primary" data-nav="studio">Open the Studio</button></div>' : '') +
      '</div>';
  }

  UI.renderGroupPage = function (state, g) {
    // a closed chapter reads as a record, not a dashboard (0.9.18.2)
    if (g.retiredWeek) {
      const rels = (g.releases || []).length;
      const lineup = (g.finalLineup || []).map(id => state.people[id]).filter(Boolean);
      const rec = [];
      if (rels) discography(state, g, rec);
      return '<div class="group-hero"><div class="g-status">Concluded · ' +
        UI.esc(KP.weekLabel(g.retiredWeek).text) + '</div>' +
        '<div class="g-name">' + UI.esc(g.name) + '</div>' +
        '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:6px">' +
        '<span class="chip">' + rels + ' release' + (rels === 1 ? '' : 's') + '</span>' +
        (g.fandom ? '<span class="chip">' + UI.esc(g.fandom.name) + ' keeps the archive</span>' : '') +
        // how it ended, and what that left on the shelf (v0.11.11, §102)
        (g.debuted && KP.endedWord ? '<span class="chip">' + UI.esc(KP.endedWord(state, g)) + '</span>' : '') +
        (KP.afterglowOf && KP.afterglowOf(state, g)
          ? '<span class="chip gold">the shelf stays warm until ' + UI.esc(KP.weekLabel(g.afterglow.until).text) + ': the catalog pays ' + Math.round(g.afterglow.mult * 100) + '% more</span>' : '') +
        '</div></div>' +
        // the lineup at the end, each a door to her file, with where she is
        // now (v0.11.10, §101): the card said "still with the company" of
        // members whose contracts had ended
        (lineup.length ? '<div class="kicker">The final lineup · ' + lineup.length + '</div>' +
          '<div class="pad" style="display:flex;gap:7px;flex-wrap:wrap">' +
          lineup.map(p => personChip(state, p, nowWord(state, p))).join('') + '</div>' : '') +
        alumniStrip(state, g) + rec.join('');
    }
    const members = g.members.map(id => state.people[id]);
    const html = [];
    const era = g.prep ? g.prep.conceptId : null;
    if (era) UI.setEra(era);

    const promoting = g.debuted && state.week <= (g.promoUntil || 0);
    html.push('<div class="group-hero">' +
      '<div class="g-status">' + (g.debuted
        ? (g.prep ? 'Comeback in preparation' : promoting ? 'Promoting' : g.hiatus ? 'On official hiatus' : 'Active · debuted ' + UI.esc(KP.weekLabel(g.debutWeek).text))
        : g.prep ? 'Debut in preparation' : 'In development') + '</div>' +
      '<div class="g-name">' + UI.esc(g.name) + '</div>' +
      '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:6px">' +
      '<span class="chip">' + (g.type === 'solo' || members.length === 1 ? 'solo act' : members.length + ' members') + '</span>' +
      (g.gen ? '<span class="chip">gen ' + g.gen + '</span>' : '') +
      (g.prep ? '<span class="chip cool">' + UI.esc(KP.conceptById(g.prep.conceptId).label) + '</span>' : '') +
      (g.debuted ? '<span class="chip ' + (g.popularity >= 58 ? 'hot' : '') + '">' + KP.popularityWord(g.popularity) + '</span>' : '') +
      (g.debuted && g.results ? '<span class="chip gold">' + UI.esc(g.results.receptionLabel) + '</span>' : '') +
      (g.gravity && !g.gravity.settled && state.people[g.gravity.personId]
        ? '<span class="chip hot">the clamor: ' + UI.esc(KP.publicGiven(state.people[g.gravity.personId])) + '</span>' : '') +
      // the bad blood (v0.9.21): the named rivalries ride the hero
      (KP.sceneRivalries ? KP.sceneRivalries(state, g.id).map(r =>
        '<span class="chip hot">vs ' + UI.esc(r.actName) + '</span>').join('') : '') +
      // the service (v0.9.23): who is away rides the hero too
      (function () {
        const away = members.filter(m => m.flags && m.flags.military).length;
        if (away) return '<span class="chip cool">' + away + ' in service</span>';
        if (g.servicePlan && members.some(m => m.gender === 'm' && !m.serviceDone)) {
          return '<span class="chip">service: ' + (g.servicePlan === 'together' ? 'together' : 'staggered') + '</span>';
        }
        return '';
      })() +
      '</div>' +
      // the road manager (v0.11.5, §96 wiring): the name only letters
      // carried, on the header — with the tenure in words
      (g.manager && g.manager.name
        ? '<div style="font-size:.74rem;color:var(--ink-dim);margin-top:8px">Road manager: ' + UI.esc(g.manager.name) +
          (g.manager.since != null ? ' · ' + UI.esc(tenureWords(state.week - g.manager.since)) : '') + '</div>'
        : '') +
      '</div>');

    html.push('<div class="member-strip">');
    members.forEach(m => {
      if (g.type === 'solo') {
        html.push('<div class="member-cell" data-action="open-dossier" data-id="' + m.id + '">' +
          UI.portrait(m, 'md') +
          '<div class="mc-name">' + UI.esc(m.name.stage || m.name.given) + '</div>' +
          '<div class="mc-role">Solo</div></div>');
        return;
      }
      const roles = [];
      if (g.roles.leader === m.id) roles.push('Leader');
      if (g.roles.center === m.id) roles.push('Center');
      if (g.roles.mainVocal === m.id) roles.push('Main Vocal');
      if (g.roles.mainDancer === m.id) roles.push('Main Dancer');
      if (g.roles.mainRapper === m.id) roles.push('Main Rapper');
      if (g.maknae === m.id) roles.push('Maknae');
      // the gravity word (v0.11.5, §96 wiring): a member pulling away from
      // the room wears the read on the strip — above the floor word only
      const grav = g.debuted && KP.gravityRead ? KP.gravityRead(state, m) : null;
      html.push('<div class="member-cell" data-action="open-dossier" data-id="' + m.id + '">' +
        UI.portrait(m, 'md') +
        '<div class="mc-name">' + UI.esc(m.name.stage || m.name.given) + '</div>' +
        '<div class="mc-role">' + UI.esc(roles.join(' · ') || 'Member') + '</div>' +
        (grav && !grav.floor ? '<span class="chip hot" style="font-size:.5rem;padding:1px 5px;margin-top:4px;display:inline-block;white-space:normal;line-height:1.2">' + UI.esc(grav.word) + '</span>' : '') +
        '</div>');
    });
    html.push('</div>');

    if (g.type !== 'solo') {
      html.push('<div class="pad" style="margin-top:2px"><button class="btn small ghost" style="border:1px solid var(--line)" data-action="open-roles" data-id="' + g.id + '">Edit roles</button></div>');
    }
    html.push(alumniStrip(state, g));   // who has left the lineup (v0.11.10, §101)
    html.push(endingCard(state, g));    // the last record, announced and owed (v0.11.11, §102)

    // chemistry observations + frictions with their handles
    // what the public remembers about this group (v0.6.0)
    const gNars = KP.narrativesFor(state, 'group', g.id)
      .concat(g.members.flatMap(id => KP.narrativesFor(state, 'idol', id)));
    if (gNars.length) {
      html.push('<div class="kicker">The narrative</div>');
      html.push('<div class="card">' + UI.narrativeLines(state, gNars) + '</div>');
    }

    // the fandom (v0.7.0): a name, a color, and a temperature
    if (g.fandom) {
      const f = g.fandom;
      html.push('<div class="kicker">The fandom</div>');
      html.push('<div class="pad" style="display:flex;gap:7px;flex-wrap:wrap">' +
        '<span class="chip gold">' + UI.esc(f.name) + '</span>' +
        '<span class="chip cool">' + UI.esc(f.color) + '</span>' +
        '<span class="chip">' + UI.esc(KP.popularityWord(g.popularity)) + ' · ' + UI.esc(KP.intensityWord(f.intensity)) + '</span>' +
        ((g.fandomGrudge || 0) >= 1 ? '<span class="chip clash">keeping receipts</span>' : '') +
        (g.lightstickWeek ? '<span class="chip">lightstick era</span>' : '') +
        '</div>');
      // the constituency (v0.9.6): the company gets a voice back
      const C = KP.C.CONSTITUENCY;
      html.push('<div class="pad" style="display:flex;gap:7px;flex-wrap:wrap;margin-top:6px">' +
        '<button class="btn small ghost" data-action="cafe-notice" data-id="' + g.id + '">Café notice</button>' +
        (!g.lightstickWeek ? '<button class="btn small ghost" data-action="lightstick" data-id="' + g.id + '">Launch the lightstick · ' + C.lightstickCost + '</button>' : '') +
        '</div>');
    } else if (KP.fandomEligible(state, g)) {
      const opts = KP.fandomNameOptions(state, g);
      html.push('<div class="kicker">The naming vote</div>');
      html.push('<div class="war-card held"><div class="w-flag">The fan cafés are voting</div>' +
        '<div class="w-text">The fanbase is big enough to want a name. The cafés have proposals; the company can back one, or let the vote run.</div>' +
        '<div class="w-actions" style="flex-wrap:wrap">' +
        opts.map((o, i) => '<button class="btn" data-action="fandom-name" data-id="' + g.id + '" data-choice="' + i + '">' + UI.esc(o) + '</button>').join('') +
        '<button class="btn primary" data-action="fandom-name" data-id="' + g.id + '" data-choice="-1">Let them decide</button>' +
        '</div></div>');
    }

    // honors (v0.7.0): what the year-end juries said
    if (g.honors && g.honors.length) {
      html.push('<div class="kicker">Honors</div>');
      html.push('<div class="pad" style="display:flex;gap:7px;flex-wrap:wrap">' +
        g.honors.map(h => '<span class="chip gold">' + UI.esc(KP.C.AWARDS.LABELS[h.category] || h.category) + ' · Y' + h.year + '</span>').join('') +
        '</div>');
    }

    // the creative direction (v0.6.7): the brief the producers pitch to
    {
      const dirId = g.concept || null;
      const idNar = KP.getNarrative(state, 'conceptIdentity', 'group', g.id);
      html.push('<div class="kicker">Creative direction</div>');
      html.push('<div class="pad">' +
        '<div style="display:flex;gap:7px;flex-wrap:wrap">' +
        '<button class="chip' + (!dirId ? ' hot' : '') + '" data-action="group-concept" data-id="' + g.id + '" data-concept="">Open field</button>' +
        KP.C.CONCEPTS.map(c => '<button class="chip' + (dirId === c.id ? ' hot' : '') + '" ' +
          'data-action="group-concept" data-id="' + g.id + '" data-concept="' + c.id + '">' + UI.esc(c.label) + '</button>').join('') +
        '</div>' +
        '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:8px">' +
        (dirId
          ? 'The producers pitch to this brief — most demos in the lane, one stretch, one wildcard. Consistency becomes identity.' +
            (idNar ? ' The identity is CANON now; changing lanes will be news.' : '')
          : 'No brief: the producers pitch the whole field. Commit to a lane and the pitches follow.') +
        '</div></div>');
    }

    // the map (v0.6.6): where the world already knows them
    if (g.debuted) {
      const regions = KP.regionsRead(g);
      const rows = KP.C.REGIONS.map(r => {
        const v = regions[r.id] || 0;
        const word = KP.regionWord(v);
        const cls = word === 'devoted' ? ' gold' : word === 'loud' ? ' hot' : word === 'quiet' ? '' : ' cool';
        return '<span class="chip' + cls + '"' + (word === 'quiet' ? ' style="opacity:.45"' : '') + '>' +
          UI.esc(r.label) + ' · ' + word + '</span>';
      });
      html.push('<div class="kicker">The map</div>');
      html.push('<div class="pad" style="display:flex;gap:7px;flex-wrap:wrap">' + rows.join('') + '</div>');
    }

    // the road record (v0.11.5, §96 wiring): toursDone and the wrap's own
    // numbers, read back — counts are public
    if (g.debuted && KP.tourRecordRead) {
      const road = KP.tourRecordRead(g);
      if (road.count) {
        const scaleLabel = t => ((KP.C.TOUR.SCALES[t.scale] || {}).label || t.scale || 'a tour').toLowerCase();
        const legsLabel = legs => (legs || []).map(id => id === 'kr' ? 'Korea' : KP.regionLabel(id)).join(' / ');
        html.push('<div class="kicker">The road</div>');
        html.push('<div class="card" style="font-size:.8rem;line-height:1.55">The road: ' + road.count + ' tour' + (road.count === 1 ? '' : 's') +
          (road.last ? ' · last: ' + UI.esc(scaleLabel(road.last)) + ', ' + road.last.stops + ' stops, ' + road.last.soldOut + ' sold out' : '') +
          (road.recent.length
            ? '<div style="margin-top:6px;color:var(--ink-dim)">' + road.recent.map(t =>
                '<div>' + UI.esc(KP.weekLabel(t.week).text) + ' — ' + UI.esc(scaleLabel(t)) + ' · ' + UI.esc(legsLabel(t.legs)) +
                ' · ' + t.stops + ' stops · ' + t.soldOut + ' sold out · ' + t.soft + ' soft' +
                // the ceremony's verdict, kept (v0.11.7, §98): the best and worst night by name
                (t.best ? ' · best: ' + UI.esc(t.best) : '') + (t.worst ? ' · worst: ' + UI.esc(t.worst) : '') + '</div>').join('') + '</div>'
            : '<div style="margin-top:6px;color:var(--ink-dim)">The tours before this build left no record — the road remembers from here.</div>') +
          '</div>');
      }
    }

    // festival season (v0.11.5, §96 wiring): a booked bill stays on the page
    // until it plays — and the regrets the organizer keeps, if the ledger has them
    if (g.debuted) {
      const pending = (g.festivalBookings || []).filter(b => b.week >= state.week).slice().sort((a, b) => a.week - b.week);
      const yr = Math.floor((state.week - 1) / KP.C.WEEKS_PER_YEAR) + 1;
      const regrets = Object.keys(g.festRegrets || {}).filter(id => g.festRegrets[id] === yr);
      const festName = id => ((KP.C.FESTS.LIST || []).find(f => f.id === id) || { name: id }).name;
      if (pending.length || regrets.length) {
        html.push('<div class="kicker">Festival season</div>');
        html.push('<div class="card" style="font-size:.8rem;line-height:1.55">' +
          pending.map(b => '<div>Booked: ' + UI.esc(festName(b.festivalId)) + ', ' + UI.esc(KP.weekLabel(b.week).text) +
            (b.headline ? ' · <span style="color:var(--gold)">the headline slot</span>' : '') + '</div>').join('') +
          (regrets.length ? '<div style="color:var(--ink-dim)">Regrets sent to ' + regrets.map(id => UI.esc(festName(id))).join(', ') + ' this year — the organizers keep notes.</div>' : '') +
          '</div>');
      }
    }

    // the Japan ladder (v0.11.5, §96 wiring): the partner, the rung and the
    // next one, the JP fanbase as a band — the page the cycle never had
    if (g.debuted && (state.jpPartner || g.jpRung != null || g.jpFans)) {
      const L = KP.C.JAPAN.LADDER || [];
      const rung = g.jpRung != null ? L[g.jpRung] || null : null;
      const next = L[(g.jpRung != null ? g.jpRung : -1) + 1] || null;
      const fans = g.jpFans || 0;
      const band = L.filter(r => fans >= r.at).length;
      const fansWord = !fans ? 'nobody on the books yet'
        : ['a club’s worth', 'a hall’s worth', 'an arena’s worth', 'a dome’s worth'][Math.min(3, band)];
      html.push('<div class="kicker">Japan</div>');
      html.push('<div class="card" style="font-size:.8rem;line-height:1.55">' +
        (state.jpPartner
          ? '<div><b>' + UI.esc(state.jpPartner.name) + '</b> runs the second discography' +
            (state.jpPartner.since != null ? ' · since ' + UI.esc(KP.weekLabel(state.jpPartner.since).text) : '') + '</div>'
          : '<div>No partner label yet — nobody runs Japan alone.</div>') +
        '<div>The ladder: ' + (rung ? UI.esc(rung.word) + ' booked' : 'no stage yet') +
        (next ? ' · next rung: ' + UI.esc(next.word) : ' · the top of the ladder') + '</div>' +
        '<div style="color:var(--ink-dim)">The JP fanbase: ' + fansWord + (fans ? ' (' + UI.esc(KP.fmtCount(fans)) + ')' : '') + '</div>' +
        '</div>');
    }

    // the trophy case (v0.6.5): music-show wins, counted forever
    const trophies = Object.entries(g.trophies || {}).filter(([, n]) => n > 0);
    if (trophies.length) {
      const total = trophies.reduce((s, [, n]) => s + n, 0);
      html.push('<div class="kicker">The trophy case</div>');
      html.push('<div class="pad" style="display:flex;gap:7px;flex-wrap:wrap">' +
        trophies.map(([show, n]) => '<span class="chip gold">' + UI.esc(KP.showLabel(show)) + ' × ' + n + '</span>').join('') +
        '<span class="chip">' + total + ' win' + (total === 1 ? '' : 's') + ' total</span></div>');
    }

    // the rivalries (v0.6.4): shared release weeks, counted forever
    const feudIds = Object.keys(g.feuds || {});
    if (feudIds.length) {
      html.push('<div class="kicker">The rivalries</div>');
      feudIds.forEach(actId => {
        const hit = KP.rivalActById(state, actId);
        if (!hit) return;
        const f = g.feuds[actId];
        html.push('<div class="note">vs ' + UI.esc(hit.act.name) + ' (' + UI.esc(hit.rival.short) + '): ' +
          f.wins + '–' + f.losses + ' on shared release weeks' +
          (f.wins === f.losses ? '. Dead even. The next one decides the narrative.'
            : f.wins > f.losses ? '. We lead — and their fandom has receipts folders about it.'
            : '. They lead. The building does not talk about it, which is how you know it matters.') +
          '<span class="n-who">— the desk’s rivalry file</span></div>');
      });
    }

    // the dorm (v0.7.1): chemistry has an address
    if (g.debuted && g.rooms && g.rooms.length) {
      html.push('<div class="kicker">The dorm</div>');
      html.push('<div class="pad"><div style="display:flex;gap:7px;flex-wrap:wrap">' +
        g.rooms.map((r, i) => '<span class="chip">Room ' + (i + 1) + ': ' +
          r.map(id => UI.esc(KP.publicGiven(state.people[id]))).join(' · ') + '</span>').join('') +
        '</div><div style="margin-top:8px"><button class="btn" data-action="dorm-shuffle" data-id="' + g.id + '">' +
        'Reassign rooms · ' + KP.C.LIFE.roomShuffleCost + '</button></div>' +
        '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:6px">Roommates shape chemistry both ways. A reshuffle separates the coldest pair — the sit-down’s domestic twin.</div></div>');
    }

    html.push('<div class="kicker">Room report</div>');
    KP.chemistryNotes(state, members).forEach(n => html.push('<div class="note">' + UI.esc(n) + '</div>'));
    // the stage, judged (v0.10.37): the act's rolling stage craft, in words
    const stageLine = KP.stageCraftLine ? KP.stageCraftLine(state, g) : null;
    if (stageLine) html.push('<div class="note">' + UI.esc(stageLine) + '</div>');
    KP.frictionPairs(state, g.members).forEach(f => html.push(UI.frictionCard(state, f, g)));
    // the rivalry inside the group, framed (v0.10.40, §88 D)
    if (KP.rivalryPairs) {
      KP.rivalryPairs(state, g).forEach(({ a, b, rel }) => {
        const framed = !!rel.rivalry.sharpened, soured = !!rel.rivalry.soured;
        html.push('<div class="note ' + (soured ? 'urgent' : '') + '">' + UI.esc(KP.publicGiven(a) + ' and ' + KP.publicGiven(b) + ' are rivals inside the lineup' +
          (framed ? (soured ? ' — framed as competition, and it has gone sour: the scoreboard reads as a verdict now.' : ' — framed as competition, and holding: both train like it is a final.')
            : '. Framed as competition it sharpens both while morale holds; left alone it is the sit-down’s problem.')) +
          '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">' +
          (framed
            ? '<button class="btn small" data-action="pair-rival" data-id="' + g.id + '" data-a="' + a.id + '" data-b="' + b.id + '" data-stance="defuse">Take the framing down</button>'
            : '<button class="btn small" data-action="pair-rival" data-id="' + g.id + '" data-a="' + a.id + '" data-b="' + b.id + '" data-stance="sharpen">Frame it as competition</button>') +
          '</div><span class="n-who">— the pair desk</span></div>');
      });
    }
    // the pairs (v0.10.40, §88 D): the mentorship and the writing pair
    if (KP.mentorshipRead) {
      const mr = KP.mentorshipRead(state, g.id);
      const wr = KP.writingPairRead(state, g.id);
      html.push('<div class="kicker">The pairs</div>');
      html.push('<div class="card">' +
        '<div style="font-weight:800;font-size:.84rem">The mentorship</div>' +
        '<div style="font-size:.76rem;color:var(--ink-dim);margin-top:4px;line-height:1.5">' + UI.esc(mr.reason) + '</div>' +
        (mr.ok ? '<div style="margin-top:8px"><button class="btn small primary" data-action="pair-mentor" data-id="' + g.id + '" data-a="' + mr.mentor.id + '" data-b="' + mr.mentee.id + '">Pair ' +
          UI.esc(KP.displayName(mr.mentor)) + ' with ' + UI.esc(KP.publicGiven(mr.mentee)) + ' · ' + mr.cost + '</button></div>' : '') +
        '<div style="font-weight:800;font-size:.84rem;margin-top:12px">The writing room</div>' +
        '<div style="font-size:.76rem;color:var(--ink-dim);margin-top:4px;line-height:1.5">' + UI.esc(wr.reason) + '</div>' +
        (wr.ok ? '<div style="margin-top:8px"><button class="btn small primary" data-action="pair-writers" data-id="' + g.id + '" data-a="' + wr.a.id + '" data-b="' + wr.b.id + '">Pair ' +
          UI.esc(KP.publicGiven(wr.a)) + ' and ' + UI.esc(KP.publicGiven(wr.b)) + ' · ' + wr.cost + '</button></div>'
          : wr.active ? '<div style="margin-top:8px"><button class="btn small" data-action="pair-unpair" data-id="' + g.id + '">Dissolve the pair</button></div>' : '') +
        '<div style="font-size:.7rem;color:var(--ink-dim);margin-top:10px">A mentorship runs ' + KP.C.PAIR.mentorWeeks + ' weeks: the rookie trains faster, the pair warms, both files remember. A writing pair bonds while a record is in production, and the next song either pens carries both names.</div>' +
        '</div>');
    }

    // status / next step
    html.push('<div class="kicker">Next step</div>');
    if (g.prep) {
      const inW = g.prep.scheduledWeek - state.week;
      // the making (v0.10.4): the production board, not a countdown
      const ST_LABEL = { recording: 'Recording', choreo: 'Choreography', mv: 'MV shoot', jacket: 'Jacket shoot' };
      const board = (g.prep.stations || []).map(st => {
        const label = ST_LABEL[st.id] || st.id;
        const extra = st.id === 'choreo' && st.done && g.prep.choreo
          ? ' · ' + UI.esc(g.prep.choreo.name) : '';
        return '<div style="display:flex;justify-content:space-between;font-size:.8rem;opacity:' + (st.done ? '.55' : '1') + '">' +
          '<span>' + (st.done ? '✓ ' : '· ') + label + extra + '</span>' +
          '<span>' + (st.done ? 'done' : st.week <= state.week ? 'this week' : 'wk ' + (st.week - state.week) + ' out') + '</span></div>';
      }).join('');
      html.push('<div class="card">' + (g.debuted ? 'Comeback' : 'Debut') + ' scheduled for <b>' + UI.esc(KP.weekLabel(g.prep.scheduledWeek).text) + '</b>' +
        (inW > 0 ? ' — ' + inW + ' week' + (inW === 1 ? '' : 's') + ' out.' : ' — this week.') +
        ' Rehearsals have replaced individual training for the members.' +
        (board ? '<div style="margin-top:10px;border-top:1px solid var(--line);padding-top:8px">' + board + '</div>' : '') +
        (g.prep.crunchUntil && state.week <= g.prep.crunchUntil
          ? '<div style="margin-top:6px;font-size:.75rem;color:var(--warn,#c66)">CRUNCH — the date holds and the room pays. The medical desk is watching.</div>' : '') +
        '</div>');
    } else if (!g.debuted) {
      html.push('<div class="card">The lineup exists on paper. It becomes real in the Studio: pick the song, the concept, and the date.' +
        '<div style="margin-top:12px"><button class="btn primary" data-nav="studio">Open the Studio</button></div></div>');
    } else if (promoting) {
      // the rituals (v0.10.7): the one mobilization push a week
      const nudged = g.pointNudge && state.week - g.pointNudge.week <= 1;
      html.push('<div class="card">Promotion week — music shows, fan signs, radio. The schedule is full and so are the members. Comeback planning opens when it winds down.' +
        (nudged
          ? '<div style="margin-top:8px;font-size:.75rem;color:var(--gold)">The fandom is mobilized — ' + (g.pointNudge.kind === 'votes' ? 'pre-voting drive' : 'streaming party') + ' running this week.</div>'
          : '<div style="margin-top:10px;display:flex;gap:6px"><button class="btn small" data-action="point-nudge" data-id="' + g.id + '" data-kind="streams">Streaming party · ' + KP.C.POINTS.nudgeCost + '</button>' +
            '<button class="btn small" data-action="point-nudge" data-id="' + g.id + '" data-kind="votes">Voting drive · ' + KP.C.POINTS.nudgeCost + '</button></div>') +
        '</div>');
    } else if (g.hiatus && g.hiatus.service) {
      // the service chapter (v0.9.23): the wait is loyal, the date is real
      const back = g.members.map(id => state.people[id]).filter(Boolean)
        .filter(m => m.flags && m.flags.military)
        .reduce((w, m) => Math.max(w, m.flags.military.until), 0);
      html.push('<div class="card"><b>The service chapter</b> — the group enlisted together and the fandom is running the wait like a project. Nothing cools while the reason is the law. Last discharge expected ' +
        (back ? UI.esc(KP.weekLabel(back).text) : 'soon') + ' — and the next date after that is not a comeback, it is a return.</div>');
    } else if (g.jpAway) {
      // the Japan cycle (v0.10.8): in-country weeks, on the record
      const lane = KP.C.JAPAN.LANES[g.jpAway.lane];
      html.push('<div class="card"><b>In Japan</b> — ' + UI.esc(lane.word) + ', back in ' +
        Math.max(0, g.jpAway.until - state.week) + ' week(s). The Korean calendar is quiet on purpose: the second discography claims real weeks, and the Nichion chart posts when the record drops.</div>');
    } else if (g.hiatus) {
      // the disappearance (v0.9.12): parked on purpose, counted weekly
      const hw = state.week - g.hiatus.since;
      const H = KP.C.HIATUS;
      html.push('<div class="card"><b>On official hiatus</b> — ' + hw + ' week' + (hw === 1 ? '' : 's') + ' and counting. ' +
        (hw <= H.graceWeeks
          ? 'The announcement is holding: the fans are patient, the members are sleeping, the second jobs have room.'
          : 'Past the grace window now — the rest is still working, and so is the forgetting. The return converts the wait into numbers; the wait converts the numbers into less.') +
        '<div style="margin-top:12px"><button class="btn primary" data-nav="studio">Announce the return</button></div></div>');
    } else {
      const unitReady = g.type !== 'solo' && members.length >= 3 &&
        state.week - (g.lastUnitWeek || -999) >= KP.C.PORTFOLIO.UNIT.cooldown;
      // the fancon (v0.10.3): the between-eras verb — membership-warm,
      // cheap to stage, impossible to review badly
      // the fan event (v0.10.3; two formats since v0.10.42, §89 D10): the
      // ticketed fancon, or the free meeting at cost — one clock
      const fanconReady = KP.fanEventRead(state, g.id, 'ticketed').ok;
      const meetReady = KP.fanEventRead(state, g.id, 'free').ok;
      html.push('<div class="card">The room between releases is where momentum goes to die. The producers have fresh demos in the Studio' +
        (unitReady ? ' — and the between is what units are for.' : '.') +
        '<div style="margin-top:12px"><button class="btn primary" data-nav="studio">Plan the comeback</button></div>' +
        (unitReady ? '<div style="margin-top:8px"><button class="btn small" data-action="plan-unit" data-id="' + g.id + '">Plan a unit era · ' + KP.C.PORTFOLIO.UNIT.cost + '</button></div>' : '') +
        (fanconReady || meetReady ? '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">' +
          (fanconReady ? '<button class="btn small" data-action="hold-fancon" data-format="ticketed" data-id="' + g.id + '">Hold a fancon · ' + KP.C.MERCH.fanconCost + '</button>' : '') +
          (meetReady ? '<button class="btn small ghost" style="border:1px solid var(--line)" data-action="hold-fancon" data-format="free" data-id="' + g.id + '">Free fan meeting · ' + KP.C.MERCH.fanMeetingCost + '</button>' : '') +
          '</div>' : '') +
        (state.jpPartner && (KP.regionsRead(g).jp || 0) >= KP.C.JAPAN.minWarmth &&
         state.week - (g.lastJpWeek || -999) >= KP.C.JAPAN.cooldown
          ? '<div style="margin-top:8px;display:flex;gap:6px">' +
            '<button class="btn small" data-action="jp-release" data-id="' + g.id + '" data-lane="version">JP-version · ' + KP.C.JAPAN.LANES.version.cost + '</button>' +
            '<button class="btn small" data-action="jp-release" data-id="' + g.id + '" data-lane="original">JP-original · ' + KP.C.JAPAN.LANES.original.cost + '</button></div>' : '') +
        (KP.cutEnglishVersion && (g.releases || []).length &&
         (g.releases[g.releases.length - 1].reception || 0) >= KP.C.CIRCUIT.EN.minRec &&
         state.week - (g.lastEnWeek || -999) >= KP.C.CIRCUIT.EN.cooldown
          ? '<div style="margin-top:8px"><button class="btn small" data-action="en-version" data-id="' + g.id + '">Cut the English version · ' + KP.C.CIRCUIT.EN.cost + '</button></div>' : '') +
        '<div style="margin-top:8px"><button class="btn small ghost" style="border:1px solid var(--line)" data-action="declare-hiatus" data-id="' + g.id + '">Declare an official hiatus</button></div></div>');
      html.push(secondLifeCard(state, g));   // the second life (v0.11.1, §92 E+F)
      // the units on the record (v0.9.26)
      (g.units || []).forEach(u => {
        if (!u.eras.length) return;
        const last = u.eras[u.eras.length - 1];
        html.push('<div class="card" style="font-size:.8rem"><b>' + UI.esc(u.name) + '</b> · ' +
          u.memberIds.map(id => state.people[id] ? UI.esc(KP.publicGiven(state.people[id])) : '').join(' · ') +
          ' — ' + u.eras.length + ' era' + (u.eras.length === 1 ? '' : 's') + ', last “' + UI.esc(last.title) + '” (' + UI.esc(KP.receptionWord(last.reception)) + ')</div>');
      });
    }

    // discography — the story so far, on the record
    if (g.releases && g.releases.length) {
      discography(state, g, html);
      // the writers' room (v0.9.7): the producers behind the records,
      // with track records in words — one truth read off their works
      const worked = KP.producersOf(state).filter(pr =>
        pr.works.some(w => w.groupId === g.id));
      if (worked.length) {
        html.push('<div class="kicker">The credits</div>');
        html.push('<div class="pad" style="display:flex;gap:7px;flex-wrap:wrap">' +
          worked.map(pr => {
            const n = pr.works.filter(w => w.groupId === g.id).length;
            return '<span class="chip">' + UI.esc(pr.name) + ' · ' + n + ' record' + (n > 1 ? 's' : '') +
              ' · ' + UI.esc(KP.producerHeat(pr)) + '</span>';
          }).join('') + '</div>');
      }
      html.push('<div class="pad" style="margin-top:8px"><button class="btn small" data-action="open-results" data-id="' + g.id + '">Latest full report</button></div>');
    }
    // the door the rivals got (0.9.18.2): quiet, at the bottom, real
    // (v0.11.11, §102) a debuted act opens the sheet of three doors; an act
    // whose last record is announced has already taken one
    if (!(KP.endingOwed && KP.endingOwed(g))) {
      html.push('<div class="pad" style="margin-top:20px"><button class="btn small ghost" style="border:1px solid var(--line);color:var(--ink-dim)" data-action="disband-group" data-id="' + g.id + '">' +
        (g.debuted ? (g.type === 'solo' ? 'Close the solo chapter' : 'Conclude team activities') : 'Dissolve the project') + '</button></div>');
    }
    return html.join('');
  }

  // ---- builder ---------------------------------------------------------
  UI.renderBuilder = function (state, draft) {
    const html = [];
    const trainees = KP.freeTrainees(state).map(id => state.people[id]);
    html.push('<div class="pushbar"><button class="btn" data-action="back">‹ Back</button></div>');
    html.push('<div class="pad"><div class="d-label">Lineup proposal</div>' +
      '<div class="bigname" style="font-size:clamp(1.6rem,8vw,2.2rem)">Who stands<br>together?</div>' +
      '<div style="font-size:.78rem;color:var(--ink-dim);margin-top:8px">Pick ' + KP.C.GROUP.minMembers + '–' + KP.C.GROUP.maxMembers + ' members. ' +
      'Complementary strengths, compatible people, one coherent concept.</div></div>');

    const proj = state.project;
    html.push('<div class="kicker">Members · ' + draft.members.length + ' selected</div>');
    html.push('<div class="pick-grid">');
    trainees.forEach(p => {
      const on = draft.members.includes(p.id);
      const locked = proj && proj.locked.includes(p.id);
      const head = KP.headline(state, p);
      html.push('<div class="pick-cell ' + (on ? 'on' : '') + '" data-action="builder-toggle" data-id="' + p.id + '">' +
        UI.portrait(p, 'md') +
        '<div class="pc-name">' + UI.esc(p.name.display) + (locked ? ' 🔒' : '') + '</div>' +
        '<div class="pc-read">' + UI.esc(head.text) + '</div></div>');
    });
    html.push('</div>');

    // a solo act (v0.2.6): exactly one, and nowhere to hide
    if (draft.members.length === 1) {
      const soloist = state.people[draft.members[0]];
      html.push('<div class="kicker">' + KP.fillPro('Or debut {her} alone', soloist) + '</div>');
      html.push('<div class="card">A solo lives or dies on one person. No room to blame, no one to cover a bad night — and nothing to share the spotlight with.' +
        ((soloist.hype || 0) >= 35 ? '<div style="margin-top:8px;color:var(--magenta);font-size:.8rem">' + KP.fillPro('The internet already knows {her}. A solo cashes all of that in.', soloist) + '</div>' : '') +
        '<div style="margin-top:12px"><button class="btn primary" data-action="builder-propose-solo" data-id="' + soloist.id + '">Propose ' + UI.esc(KP.displayName(soloist)) + ', solo</button></div>' +
        '</div>');
    }

    // the project: fewer than a full lineup can still become a commitment
    // the whole building hears about (v0.2.5)
    if (draft.members.length >= 1 && draft.members.length < KP.C.GROUP.minMembers && !proj) {
      html.push('<div class="kicker">Or open a project</div>');
      html.push('<div class="card">Lock these ' + draft.members.length + ' in without finalizing. ' +
        'The building will know a group is coming — and the rest of the trainees will train like the spot is theirs.' +
        '<div style="margin:12px 0 4px;font-size:.64rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-dim)">What the project needs (optional, up to 2)</div>' +
        '<div class="focus-chips">' +
        KP.C.TALENTS.map(d => '<button class="chip ' + ((draft.seeking || []).includes(d) ? 'on' : '') + '" ' +
          'data-action="builder-seeking" data-domain="' + d + '">' + UI.esc(KP.C.TALENT_LABELS[d]) + '</button>').join('') +
        '</div>' +
        '<div style="margin-top:14px"><button class="btn primary" data-action="open-project">Open the project</button></div>' +
        '</div>');
    }
    if (proj) {
      const seeking = proj.seeking.map(d => KP.C.TALENT_LABELS[d]).join(' + ');
      html.push('<div class="note">Project open since ' + UI.esc(KP.weekLabel(proj.openedWeek).text) + ' — ' +
        proj.locked.length + ' locked' + (seeking ? ', seeking ' + UI.esc(seeking) : '') +
        '. The free trainees are pushing for the open spots.' +
        '<div style="margin-top:10px"><button class="btn danger small" data-action="cancel-project">Shelve the project</button></div>' +
        '<span class="n-who">— the whole building knows</span></div>');
    }

    if (draft.members.length >= KP.C.GROUP.minMembers) {
      const members = draft.members.map(id => state.people[id]);
      const hints = KP.roleHints(state, members);

      html.push('<div class="kicker">Roles</div>');
      [['leader', 'Leader'], ['center', 'Center'], ['mainVocal', 'Main Vocal'], ['mainDancer', 'Main Dancer'], ['mainRapper', 'Main Rapper']].forEach(([key, label]) => {
        html.push('<div class="role-row"><span class="r-label">' + label + '</span>' +
          '<select data-action="builder-role" data-role="' + key + '">' +
          members.map(m => '<option value="' + m.id + '"' +
            ((draft.roles[key] || hints[key]) === m.id ? ' selected' : '') + '>' + UI.esc(m.name.display) +
            (hints[key] === m.id ? ' — staff pick' : '') + '</option>').join('') +
          '</select></div>');
        if (!draft.roles[key]) draft.roles[key] = hints[key];
      });

      html.push('<div class="kicker">Room preview</div>');
      KP.chemistryNotes(state, members).forEach(n => html.push('<div class="note">' + UI.esc(n) + '</div>'));
      KP.frictionPairs(state, draft.members).forEach(f => html.push(UI.frictionCard(state, f)));

      html.push('<div class="kicker">Name</div>');
      // your own name, or one of the pitches (v0.8.4, owner request)
      html.push('<div class="pad"><input class="nc-input" id="builder-name-input" maxlength="18" ' +
        'placeholder="Name the group yourself…" value="' + UI.esc(draft.customName || '') + '"></div>');
      html.push('<div class="pad" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">' +
        draft.nameOptions.map(n => '<button class="chip ' + (draft.name === n && !draft.customName ? 'on' : '') + '" style="' +
          (draft.name === n && !draft.customName ? 'background:color-mix(in srgb,var(--era1) 26%,var(--surface2));color:var(--ink);border-color:var(--era1)' : '') + '" ' +
          'data-action="builder-name" data-name="' + UI.esc(n) + '">' + UI.esc(n) + '</button>').join('') +
        '</div>');
      html.push('<div class="pad" style="font-size:.68rem;color:var(--ink-dim);margin-top:4px">Typed name wins over the chips. The marketing team pitched the chips; the marketing team also knows better than to argue.</div>');

      html.push('<div class="pad" style="margin-top:20px">' +
        '<button class="btn primary" data-action="builder-propose" style="width:100%">Propose to ' + UI.esc(state.executive.name.split(' ')[0]) + ' ' + UI.esc(state.executive.name.split(' ')[1] || '') + '</button></div>');
    }
    return html.join('');
  };
})(typeof window !== 'undefined' ? window : globalThis);
