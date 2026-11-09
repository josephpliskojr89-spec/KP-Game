/* The promotion (v0.10.38, §91 Phase 5) — the plan stays the plan: two
   slots a week, four weeks, billed at lock (the owner's own law). It
   gains four doors. THE OFFERS: each promo week the desk may receive an
   invitation keyed to how the record is actually doing — a show invites
   the risers and the carriers, variety invites a face with media reps —
   and the player may SWAP a planned slot for it; cancelling a booked
   stage costs a little trust with that broadcaster, a small ledger read
   at the next invitation. THE EXTENSION: in the last week, a record
   still climbing (chart up, or the sleeper) can run two more weeks for a
   fatigue price. THE COMEBACK STAGE lives in shows.js (the era's first
   stage, rated, hype-bearing, the one everyone clips). MARKETING FIT: a
   push is a match to the record, not a budget line — the challenge
   carries a performance record, radio carries a ballad — and the
   marketing seat reads the fit in words. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};
  const P = () => KP.C.PROMO;

  function ledger(state) {
    state.promoLedger = state.promoLedger ||
      { offers: 0, taken: 0, declined: 0, cancelled: 0, extended: 0, comebackStages: 0, fitHome: 0, fitOff: 0, declines: {} };
    // the desks remember a no (v0.11.5, §96 wiring) — per activity, healed lazily
    if (!state.promoLedger.declines) state.promoLedger.declines = {};
    return state.promoLedger;
  }
  KP.promoLedger = ledger;
  // the booking desk's count of invitations declined (or left to expire)
  // since the last one taken — the memory the decline toast promised
  // (a read: never creates the ledger, so a render leaves the save untouched)
  KP.deskDeclines = function (state, activity) { return (((state.promoLedger || {}).declines) || {})[activity] || 0; };
  function deskDeclined(state, activity) {
    const d = ledger(state).declines;
    d[activity] = (d[activity] || 0) + 1;
    return d[activity];
  }
  function deskCooled(state, activity) { return KP.deskDeclines(state, activity) >= P().OFFERS.declineCoolAt; }

  // ---- marketing fit ----------------------------------------------------
  KP.promoFit = function (laneId, actId) {
    const spec = P().FIT[actId];
    if (!spec || !laneId) return 1;
    if (spec.home.includes(laneId)) return P().fitHome;
    if (spec.off.includes(laneId)) return P().fitOff;
    return 1;
  };
  KP.promoFitWord = function (laneId, actId) {
    const f = KP.promoFit(laneId, actId);
    return f > 1 ? 'built for this record' : f < 1 ? 'the wrong tool for this record' : null;
  };
  // the record a campaign or a rollout is for: in production, or the last one out
  KP.eraLane = function (state, g) {
    if (g.prep && g.prep.conceptId) return g.prep.conceptId;
    const rel = (g.releases || []).length ? g.releases[g.releases.length - 1] : null;
    return rel ? rel.conceptId : (g.concept || null);
  };
  // the marketing seat's read of a lane, for the rollout builder
  KP.promoFitSummary = function (laneId) {
    const A = KP.C.ROLLOUT.ACTIVITIES;
    const home = [], off = [];
    Object.keys(A).forEach(id => {
      const f = KP.promoFit(laneId, id);
      if (f > 1) home.push(A[id].label);
      else if (f < 1) off.push(A[id].label);
    });
    return { home, off };
  };

  // ---- the broadcasters remember ------------------------------------------
  function broadcasters(state) {
    state.broadcasters = state.broadcasters || {};
    return state.broadcasters;
  }
  KP.broadcasterTrust = function (state, showId) { return broadcasters(state)[showId] || 0; };
  KP.broadcasterCancel = function (state, showId) {
    const b = broadcasters(state);
    b[showId] = Math.max(P().trustFloor, (b[showId] || 0) - 1);
    return b[showId];
  };
  KP.broadcasterLines = function (state) {
    const b = broadcasters(state);
    const d = ((state.promoLedger || {}).declines) || {};   // the desks remember a no too (v0.11.5, §96 wiring) — a read, never a create
    const keys = Object.keys(b).filter(k => b[k] < 0);
    Object.keys(d).forEach(k => { if (d[k] >= 1 && !keys.includes(k)) keys.push(k); });
    return keys.map(k => {
      const parts = [];
      if ((b[k] || 0) < 0) parts.push(b[k] <= -2 ? 'the cancellations' : 'a cancellation');
      if ((d[k] || 0) >= 1) parts.push(d[k] >= P().OFFERS.declineCoolAt ? 'the invitations declined' : 'an invitation declined');
      return KP.showLabel(k) + '’s booking desk remembers ' + parts.join(' and ') +
        ((b[k] || 0) <= P().OFFERS.trustMin ? ' — they are not calling.'
          : (d[k] || 0) >= P().OFFERS.declineCoolAt ? ' — they call half as often.' : '.');
    });
  };

  // ---- still climbing --------------------------------------------------------
  KP.recordClimbing = function (state, g) {
    const rel = (g.releases || []).length ? g.releases[g.releases.length - 1] : null;
    if (!rel) return { climbing: false, why: null };
    // the title's entry or a b-side's — a b-side enters the week it climbs,
    // so it is matched by the record it belongs to (audit v0.11.3: the
    // late climb never counted as still climbing)
    const rising = list => (list || []).find(e => e.isPlayer && e.groupId === g.id &&
      (e.entered === rel.week || (e.bside && e.releaseWeek === rel.week)) &&
      e.pos != null && e.lastPos != null && e.pos < e.lastPos);
    if (rising((state.chart || {}).entries)) return { climbing: true, why: 'the scene chart' };
    if (rising((state.national || {}).entries)) return { climbing: true, why: 'the national board' };
    // a b-side that climbed onto the chart this month IS the record moving (§92 C)
    if ((rel.bsides || []).some(b => b.late && b.charted && state.week - b.charted <= 4)) return { climbing: true, why: 'the b-side' };
    if (rel.sleeperTitle) return { climbing: true, why: 'the sleeper' };
    return { climbing: false, why: null };
  };

  // ---- the extension: the second wind -----------------------------------------
  function promoting(state, g) {
    return g.debuted && !g.prep && !g.retiredWeek &&
      state.week <= (g.promoUntil || 0) && state.week > (g.lastReleaseWeek || 0);
  }
  // the stamp belongs to the promotion that set it (v0.11.9, §100): it was
  // written on the group and never cleared, so one extension shut the door
  // for the rest of a career and every later promotion wore "· extended".
  // A stamp older than the last landing is another era's. Read, not
  // cleared: an old save carries a stale stamp and needs no migration.
  KP.eraExtended = function (g) {
    return !!(g && g.eraExtendedWeek) && g.eraExtendedWeek > (g.lastReleaseWeek || 0);
  };
  KP.extensionRead = function (state, g) {
    const E = P().EXT;
    if (!promoting(state, g)) return { ok: false, reason: 'No promotion is running.' };
    if (KP.eraExtended(g)) return { ok: false, reason: 'The era already took its second wind.' };
    if (state.week < (g.promoUntil || 0)) return { ok: false, reason: 'The question comes in the last week of promotion.' };
    const climb = KP.recordClimbing(state, g);
    if (!climb.climbing) return { ok: false, reason: 'The record is not climbing. An extension sells a story the chart is not telling.' };
    const bill = E.plan.flat().reduce((s, a) => s + (KP.C.ROLLOUT.ACTIVITIES[a] ? KP.C.ROLLOUT.ACTIVITIES[a].cost : 0), 0);
    if (state.budget < bill) return { ok: false, reason: 'Two more weeks of bookings bill ' + bill + '. The account says no.' };
    const members = g.members.map(id => state.people[id]).filter(Boolean);
    const avgF = members.length ? members.reduce((s, m) => s + m.fatigue, 0) / members.length : 0;
    return { ok: true, why: climb.why, weeks: E.weeks, fatigue: E.fatigue, bill, tired: avgF >= E.warnFatigue };
  };
  KP.extendEra = function (state, groupId) {
    const g = KP.groupById(state, groupId);
    if (!g) return { ok: false, reason: 'No such group.' };
    const r = KP.extensionRead(state, g);
    if (!r.ok) return r;
    const E = P().EXT;
    state.budget -= r.bill;
    if (KP.ledgerFlow) KP.ledgerFlow(state, 'marketing', -r.bill);
    g.promoUntil = (g.promoUntil || state.week) + E.weeks;
    g.eraExtendedWeek = state.week;
    g.rollout = (g.rollout || []).concat(E.plan.map(w => w.slice()));
    g.members.map(id => state.people[id]).filter(Boolean).forEach(m => {
      if (!KP.onBreak(m)) m.fatigue = KP.clamp(m.fatigue + E.fatigue, 0, 100);
    });
    ledger(state).extended++;
    const rel = g.releases[g.releases.length - 1];
    KP.note(state, { kind: 'public', ind: 'eraExtended', priority: 'high', groupId: g.id, extension: true,
      text: 'The “' + rel.songTitle + '” era EXTENDS: ' + g.name + ' adds ' + E.weeks + ' weeks of promotion on the strength of ' + r.why +
        '. The members heard the news the way members hear it — gratefully, and with a look at the calendar.' +
        (r.tired ? ' The staff flagged the room as tired before anyone signed; the schedule signed anyway.' : '') });
    return { ok: true, toast: 'Extended: ' + E.weeks + ' more weeks, on the strength of ' + r.why + '. The room pays in hours.' };
  };

  // ---- the offers: a swap on the locked plan ---------------------------------
  // the slot the desk would give up: the weakest of next week's plan,
  // never a stage when a non-stage booking stands; null when the week
  // has room
  KP.offerSwapTarget = function (week) {
    const R = KP.C.ROLLOUT;
    if ((week || []).length < R.slotsPerWeek) return null;
    return week.slice().sort((a, b) => {
      const A = R.ACTIVITIES[a] || {}, B = R.ACTIVITIES[b] || {};
      return (A.show ? 1 : 0) - (B.show ? 1 : 0) || (A.pop || 0) - (B.pop || 0);
    })[0];
  };
  KP.registerWeekly('promotion', 585, function (state, rng, inbox) {
    const C = P();
    const led = ledger(state);
    // the booking desks forgive, slowly
    if (state.week % C.trustHealWeeks === 0) {
      const b = broadcasters(state);
      Object.keys(b).forEach(k => { if (b[k] < 0) b[k]++; });
    }
    KP.groups(state).forEach(g => {
      if (!promoting(state, g) || !g.rollout) return;
      const idx = state.week - (g.lastReleaseWeek || 0) - 1;
      const nextIdx = idx + 1;
      if (nextIdx > g.rollout.length - 1) return;   // the plan ends; nothing to swap into
      if ((state.scenes || []).some(sc => sc.kind === 'promoOffer' && sc.groupId === g.id)) return;
      const rel0 = g.releases[g.releases.length - 1];
      if (rel0 && (rel0.offers || 0) >= C.OFFERS.perEra) return;   // a choice, not a task list
      const next = g.rollout[nextIdx];
      const rel = g.releases[g.releases.length - 1];
      const climb = KP.recordClimbing(state, g);
      const carried = g.lastStageBand === 'carried' && g.stageNoteWeek === state.week;
      let offer = null;
      // a show invites the risers and the carriers — and a warm record anyway
      if (climb.climbing || carried || (rel && (rel.reception || 0) >= C.OFFERS.showOfferReception)) {
        const shows = Object.keys(KP.C.SHOWS).filter(id => !next.includes(id) &&
          KP.broadcasterTrust(state, id) > C.OFFERS.trustMin);
        if (shows.length) {
          // the desk is picked by hash before the draw (no stream cost), so
          // a desk told no twice can call at half its chance on the SAME
          // draw (v0.11.5, §96 wiring)
          const pick = shows[Math.floor(KP.hash01([state.seed, 'offer', g.id, state.week].join('|')) * shows.length)];
          if (rng.chance(C.OFFERS.showChance * (deskCooled(state, pick) ? C.OFFERS.declinedOfferMult : 1))) {
            offer = { kind: 'show', activity: pick,
              why: climb.climbing ? climb.why : carried ? 'the stage' : 'the numbers' };
          }
        }
      }
      // variety invites a face with media reps
      if (!offer && !next.includes('variety')) {
        const face = g.members.map(id => state.people[id]).filter(m => m && !KP.onBreak(m))
          .sort((a, b) => KP.derived(b).varietySkill - KP.derived(a).varietySkill)[0];
        if (face && KP.derived(face).varietySkill >= C.OFFERS.varietySkillAt &&
            (face.mediaExp || 0) >= C.OFFERS.varietyMediaAt &&
            rng.chance(C.OFFERS.varietyChance * (deskCooled(state, 'variety') ? C.OFFERS.declinedOfferMult : 1))) {
          offer = { kind: 'variety', activity: 'variety', personId: face.id, why: 'the face' };
        }
      }
      if (!offer) return;
      led.offers++;
      rel.offers = (rel.offers || 0) + 1;
      const replace = KP.offerSwapTarget(next);
      KP.openScene(state, { kind: 'promoOffer', groupId: g.id, offerKind: offer.kind, activity: offer.activity,
        personId: offer.personId || null, why: offer.why, slotWeek: nextIdx, replace, expiresWeek: state.week });
      const A = KP.C.ROLLOUT.ACTIVITIES;
      const lead = offer.kind === 'show'
        ? KP.lineFor(state, 'offerShow|' + g.id, [
          A[offer.activity].label + '’s booking desk called about next week — a slot for ' + g.name + ' on the strength of ' + offer.why + '.',
          'A call from ' + A[offer.activity].label + ': they have a slot next week and they want ' + g.name + ' in it — ' + offer.why + ' did the talking.',
          A[offer.activity].label + ' has an opening next week and asked for ' + g.name + ' by name, citing ' + offer.why + '.',
        ])
        : KP.fillPro(KP.lineFor(state, 'offerVariety|' + g.id, [
          'The variety producers called about next week — they want ' + KP.displayName(state.people[offer.personId]) + ' on the panel, and the group comes with {her}.',
          'The variety desk wants ' + KP.displayName(state.people[offer.personId]) + ' next week — a panel seat, with the group in the shot.',
          'Variety called: ' + KP.displayName(state.people[offer.personId]) + ' tested well with the writers’ room, and a panel slot opened for next week. The group rides along.',
        ]), state.people[offer.personId]);
      inbox.push({ kind: 'company', ind: 'promoOffer', priority: 'high', groupId: g.id,
        text: lead +
          (replace ? ' Taking it means cancelling ' + A[replace].label + (A[replace].show ? ', and their desk will remember.' : '.') : ' Next week has room.') +
          ' The invitation is on the Desk; it answers within the week.' });
    });
  });

  KP.registerScene('promoOffer', {
    title: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      const A = KP.C.ROLLOUT.ACTIVITIES[sc.activity] || { label: 'A booking' };
      return (g ? g.name : 'The era') + ' · ' + A.label + ' invites';
    },
    body: (state, sc) => {
      const g = KP.groupById(state, sc.groupId);
      if (!g || !g.rollout || !g.rollout[sc.slotWeek]) return 'The week moved on without the invitation.';
      const A = KP.C.ROLLOUT.ACTIVITIES;
      const plan = g.rollout[sc.slotWeek].map(a => (A[a] || { label: a }).label).join(' and ') || 'nothing';
      const face = sc.personId ? state.people[sc.personId] : null;
      return (sc.offerKind === 'show'
        ? A[sc.activity].label + ' wants ' + g.name + ' next week, on the strength of ' + sc.why + '. '
        : 'The variety producers want ' + (face ? KP.displayName(face) : 'a face') + ' next week — the whole group comes, but the chair is hers. ') +
        'Next week’s plan is ' + plan + '. ' +
        (sc.replace
          ? 'Taking the invitation means cancelling ' + A[sc.replace].label + (A[sc.replace].show ? ' — a broadcaster whose booking desk keeps notes.' : '.')
          : 'Next week has room for it.') +
        ' Offers answer within the week; silence is a no.';
    },
    options: (state, sc) => {
      const A = KP.C.ROLLOUT.ACTIVITIES;
      return [
        { id: 'take', label: sc.replace ? 'Take it — swap out ' + (A[sc.replace] || { label: sc.replace }).label : 'Take it — add the booking' },
        { id: 'decline', label: 'Keep the plan' },
      ];
    },
    resolve: (state, sc, optionId) => {
      const g = KP.groupById(state, sc.groupId);
      const led = ledger(state);
      if (!g || !g.rollout || !g.rollout[sc.slotWeek]) return { toast: 'The week moved on without the invitation.' };
      const A = KP.C.ROLLOUT.ACTIVITIES;
      const deskLabel = (A[sc.activity] || { label: 'The booking' }).label;
      if (optionId !== 'take') {
        led.declined++;
        // what the desk actually wrote down (v0.11.5, §96 wiring)
        const n = deskDeclined(state, sc.activity);
        return { toast: 'The plan stands. ' + deskLabel + '’s booking desk said they understood, in the voice that means they wrote it down' +
          (n >= P().OFFERS.declineCoolAt
            ? ': that is ' + n + ' invitations declined with no yes between, and their desk calls half as often until one is taken.'
            : ': one invitation declined, on their file. A second one and they call less.') };
      }
      const wk = g.rollout[sc.slotWeek];
      const delta = (A[sc.activity] ? A[sc.activity].cost : 0) - (sc.replace && A[sc.replace] ? A[sc.replace].cost : 0);
      if (delta > 0 && state.budget < delta) {
        led.declined++;
        deskDeclined(state, sc.activity);   // the desk only sees the no
        return { toast: 'The swap bills ' + delta + ' more than the plan did. The account says no; the plan stands, and ' + deskLabel + '’s desk wrote down a no.' };
      }
      delete ledger(state).declines[sc.activity];   // a yes clears the desk's count
      if (sc.replace && wk.includes(sc.replace)) {
        wk.splice(wk.indexOf(sc.replace), 1);
        if (A[sc.replace] && A[sc.replace].show) { KP.broadcasterCancel(state, sc.replace); led.cancelled++; }
      }
      if (!wk.includes(sc.activity)) wk.push(sc.activity);
      if (delta) { state.budget -= delta; if (KP.ledgerFlow) KP.ledgerFlow(state, 'marketing', -delta); }
      led.taken++;
      return { toast: A[sc.activity].label + ' is on next week’s plan' +
        (sc.replace ? ' and ' + A[sc.replace].label + ' is off it' + (A[sc.replace].show ? ' — their desk wrote it down' : '') : '') + '.' };
    },
    // silence is a no, and the desk writes it down the same way (v0.11.5, §96 wiring)
    expire: (state, sc) => { ledger(state).declined++; deskDeclined(state, sc.activity); return null; },
  });

  // ---- the timeline reacts -----------------------------------------------
  KP.onFeedEvent('promoOffer', (state, n, rng) => rng.chance(0.4) ? rng.pick([
    { persona: 'fan', text: 'a mid-promo stage ADDED to the schedule is the single most reliable sign a song is doing numbers. the booking desks know before the charts post' },
    { persona: 'casual', text: 'the "we were invited back" tweet from a rookie group’s account. the way it is phrased. somebody in that office is having the best week of their life' },
  ]) : null);
  KP.onFeedEvent('comebackStage', (state, n, rng) => n.band === 'carried' ? rng.pick([
    { persona: 'fan', text: 'THE COMEBACK STAGE. first stage of the era and they came out like the record was already a classic. the fancam is loading. my body is ready' },
    { persona: 'press', text: 'A comeback stage that lands on the first night is the cheapest marketing in the industry and the hardest to buy. One act managed it this week.' },
  ]) : n.band === 'fumbled' ? rng.pick([
    { persona: 'fan', text: 'the comeback stage was… a first stage. the record is good! the stage will catch up! this is me coping in real time' },
    { persona: 'casual', text: 'a shaky comeback stage on night one — the kind of clip the group will be asked about in every interview of the era. rough draw' },
  ]) : null);
})(typeof window !== 'undefined' ? window : globalThis);
