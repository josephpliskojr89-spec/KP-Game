/* Industry tab: rival agencies, company standing, the news wire.
   Plus the new-career intro screen. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};
  const UI = KP.UI;

  UI.renderIndustry = function (state) {
    const html = [];

    html.push('<div class="kicker">Your company</div>');
    html.push('<div class="card rival-card">' +
      '<div class="rv-name">' + UI.esc(state.company.name) + '</div>' +
      '<div class="rv-phil">' + repHeadline(state.company.reputation) + '</div>' +
      '<div class="rv-blurb">' + UI.esc(KP.DATA.playerCompany.reputationLine) + '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">' + repChips(state.company.reputation) + '</div>' +
      '</div>');

    html.push('<div class="kicker">Rival agencies</div>');
    state.rivals.forEach(r => {
      const interested = Object.keys(r.interest).length;
      html.push('<div class="card rival-card">' +
        '<div class="rv-name">' + UI.esc(r.name) + '</div>' +
        '<div class="rv-phil">' + philWord(r.philosophy) + '</div>' +
        '<div class="rv-blurb">' + UI.esc(r.blurb) + '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">' +
        '<span class="chip">~' + r.rosterCount + ' trainees</span>' +
        (interested ? '<span class="chip hot">tracking ' + interested + ' of your leads</span>' : '<span class="chip">quiet this week</span>') +
        '</div></div>');
    });

    const news = state.inbox.filter(m => ['industry', 'scouting', 'public'].includes(m.kind)).slice(0, 8);
    if (news.length) {
      html.push('<div class="kicker">The wire</div>');
      news.forEach(m => html.push(UI.mailRow(state, m)));
    }
    return html.join('');
  };

  function philWord(p) {
    return { trendChaser: 'Trend chasers', performance: 'Performance monsters', patient: 'Patient developers' }[p] || p;
  }
  function repHeadline(rep) {
    const best = Object.entries(rep).sort((a, b) => b[1] - a[1])[0];
    return { vocal: 'Vocal powerhouse', girlGroup: 'Girl group factory', starMaker: 'Star makers', performance: 'Performance house' }[best[0]] || 'Mid-tier label';
  }
  function repChips(rep) {
    const words = v => v >= 70 ? 'renowned' : v >= 55 ? 'respected' : v >= 40 ? 'noted' : 'unproven';
    return [
      '<span class="chip cool">vocals: ' + words(rep.vocal || 0) + '</span>',
      '<span class="chip">girl groups: ' + words(rep.girlGroup || 0) + '</span>',
      '<span class="chip">star-making: ' + words(rep.starMaker || 0) + '</span>',
    ].join('');
  }

  // ---- new career ------------------------------------------------------
  UI.renderNewCareer = function () {
    return '<div class="nc-wrap">' +
      '<div class="d-label">New career</div>' +
      '<div class="nc-co">Hanseong<br>Culture Group</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 2px">' +
      '<span class="chip cool">vocal powerhouse</span><span class="chip">mid-sized</span><span class="chip hot">6 years without a girl-group hit</span></div>' +
      '<div class="nc-p">The last group still sells, but it is aging out of its peak. A new executive wants growth, and you — the new A&R Manager — are how she intends to get it.</div>' +
      '<div class="nc-quote">“I don’t need five perfect trainees. I need one group people remember.”</div>' +
      '<div class="nc-p">You inherit six trainees and a scouting board the rivals are already reading. Budget covers three signings. The deadline is eighteen months.</div>' +
      '<label style="font-size:.68rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-dim)">Your name</label>' +
      '<input class="nc-input" id="nc-name" placeholder="A&R Manager" maxlength="24">' +
      '<label style="font-size:.68rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-dim)">World seed <span style="color:var(--ink-faint)">(optional)</span></label>' +
      '<input class="nc-input" id="nc-seed" placeholder="random">' +
      '<button class="btn primary" style="width:100%;margin-top:8px" data-action="start-career">Take the job</button>' +
      '</div>';
  };
})(typeof window !== 'undefined' ? window : globalThis);
