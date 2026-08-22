/* The song market (v0.10.5, §80 finding 11) — demos cost money and
   have other suitors. The asking price rides the era bill; a hook hot
   enough is CIRCULATING, and the dated window on the pitch sheet is
   real: sit on it past the window and another room buys it — where it
   enters the ghost-demo drawer and, one day, comes back as somebody
   else's hit with everyone in the industry knowing whose desk it
   crossed first. The song camp is the spend verb that summons a
   better sheet; producer relationships (records made together) are
   the discount paid in access, not money. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.marketLedger = state.marketLedger ||
      { priced: 0, lost: 0, camps: 0, bondsSeen: 0 };
    return state.marketLedger;
  }
  KP.marketLedger = ledger;

  // ---- the song camp: the spend verb ------------------------------------
  KP.holdSongCamp = function (state, groupId) {
    const MK = KP.C.MARKET;
    const g = KP.groups(state).find(x => x.id === groupId);
    if (!g || !g.members.length) return { ok: false, reason: 'A camp writes for a room that exists.' };
    if (g.prep) return { ok: false, reason: 'A record is locked. The camp writes for the NEXT one.' };
    if (state.week - (g.lastCampWeek || -999) < MK.campCooldown) {
      return { ok: false, reason: 'The writers just left. Camps work because they are occasions, not furniture.' };
    }
    if (state.budget < MK.campCost) return { ok: false, reason: 'A song camp is flights, studios, and per-diems — ' + MK.campCost + ' up front.' };
    state.budget -= MK.campCost;
    if (KP.ledgerFlow) KP.ledgerFlow(state, 'production', -MK.campCost);
    g.lastCampWeek = state.week;
    const rng = KP.rngFor(state);
    g.demos = KP.generateDemos(state, rng, g, { camp: true });
    state.rngState = rng.state();
    ledger(state).camps++;
    KP.note(state, { kind: 'company', ind: 'songCamp', priority: 'high', groupId: g.id,
      text: 'Song camp week for ' + g.name + ': ' + (KP.C.SONG.demoCount + KP.C.MARKET.campDemos) +
        ' demos on the desk by Friday, two writing rooms running past midnight, and one hook the whole camp kept humming in the hallway. The sheet is deeper and hotter than a cold pitch cycle — that is what the money bought.' });
    return { ok: true, count: g.demos.length };
  };

  // ---- the week: the windows close --------------------------------------
  KP.registerWeekly('market', 155, function (state, rng, inbox) {
    const MK = KP.C.MARKET;
    const led = ledger(state);
    KP.groups(state).forEach(g => {
      if (!g.demos || !g.demos.length) return;
      led.priced = 1;   // the sheet carries prices — mechanism stamp
      const keep = [];
      g.demos.forEach(d => {
        const locked = g.prep && g.prep.songId === d.id;
        if (!d.circUntil || d.writtenBy || locked ||
            state.week <= d.circUntil || !rng.chance(MK.buyChance)) {
          keep.push(d);
          return;
        }
        // the window closed with the demo still on this desk — sold
        led.lost++;
        const rivals = state.rivals || [];
        const buyer = rivals.length ? rivals[rng.int(0, rivals.length - 1)] : null;
        state.ghostDemos = state.ghostDemos || [];
        state.ghostDemos.push({ title: d.title, hook: d.hook,
          producer: d.producer, week: state.week, groupName: g.name });
        if (state.ghostDemos.length > KP.C.CREDITS.ghostCap) state.ghostDemos.shift();
        inbox.push({ kind: 'industry', ind: 'demoSold', priority: 'high', groupId: g.id,
          text: '“' + d.title + '” came off the market — ' + d.producer + '’s people called to say ' +
            (buyer ? buyer.short : 'another label') + ' met the asking price while this desk deliberated. The dated window on a circulating hook is not a decoration. The A&R team has opinions about the deliberating.' });
      });
      // a sheet bought down to nothing goes back to the producers —
      // null, not [], so the pitch machinery re-tools next cycle
      g.demos = keep.length ? keep : null;
      // the bond census: a sheet showing a house regular is the
      // relationship machinery working
      if (g.demos && g.demos.some(d => d.bonded)) led.bondsSeen++;
    });
  });

  // ---- the timeline reacts ----------------------------------------------
  KP.onFeedEvent('demoSold', (state, n, rng) => rng.pick([
    { persona: 'casual', text: 'somewhere right now an A&R team is watching a demo they passed on get bought by a rival, and the meeting about it will use the word "process" nine times' },
    { persona: 'press', text: 'The song market moves faster than the companies bidding in it — this week another circulating hook found a faster checkbook. The ones that become hits get names; the deliberations that lost them get meetings.' },
  ]));
  KP.onFeedEvent('songCamp', (state, n, rng) => rng.chance(0.5) ? rng.pick([
    { persona: 'fan', text: 'song camp photos: fourteen writers, one whiteboard, coffee cups arranged like evidence. whatever comes out of that room, we are pre-committed' },
    { persona: 'casual', text: 'the song camp remains the industry’s best-value ritual: lock songwriters in nice rooms until hooks fall out. it should not work. it always works' },
  ]) : null);
})(typeof window !== 'undefined' ? window : globalThis);
