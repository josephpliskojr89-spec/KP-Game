/* Suite 105 — the promotion (v0.10.38, §91 Phase 5). The plan stays the
   plan and gains four doors: the offers (a show for the risers and the
   carriers, variety for a face — a swap on the locked plan, capped per
   era, with a broadcaster ledger that remembers a cancellation), the
   extension (the last week, a record still climbing, two more weeks for
   a fatigue price), the comeback stage (the era's first stage, named,
   hype-bearing, the one everyone clips, watched by the critics), and
   marketing fit (a push is a match to the record; the seat reads it). */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_105_promotion');

const PLAN = [['popWave', 'challenge'], ['countdown', 'variety'], ['primeStage', 'fanSign'], ['livestream']];
function debuted(seed, opts) {
  opts = opts || {};
  const s = KP.newGame(seed, null, { legacy: false });
  s.budget = 900;
  const ids = s.roster.slice(0, 5);
  KP.proposeGroup(s, 'PROMOLINE', ids, KP.roleHints(s, ids.map(i => s.people[i])));
  const g = s.groups[0];
  g.demos = KP.generateDemos(s, KP.rngFor(s), g);
  if (opts.lane) { g.demos[0].conceptId = opts.lane; }
  KP.planDebut(s, { groupId: g.id, songId: g.demos[0].id, conceptId: opts.lane || g.demos[0].conceptId, promo: 'modest', week: s.week + 6,
    alloc: { vocals: 25, dance: 25, rap: 25, media: 25 }, rollout: PLAN.map(w => w.slice()) });
  let guard = 0;
  while (g.prep && guard++ < 12) {
    KP.advanceWeek(s);
    (s.scenes || []).slice().forEach(sc => { const def = KP.sceneDef(sc.kind); if (def) KP.resolveScene(s, sc.id, def.options(s, sc)[0].id); });
  }
  return { s, g, ids };
}
const offerOf = (s, g) => (s.scenes || []).find(sc => sc.kind === 'promoOffer' && sc.groupId === g.id);

// ---- marketing fit: a push is a match, not a budget line -------------------
{
  t.ok(KP.promoFit('performance', 'challenge') > 1 && KP.promoFit('dreamy', 'challenge') < 1 && KP.promoFit('bright', 'challenge') === 1,
    'the challenge carries a performance record, not a ballad');
  t.ok(KP.promoFit('dreamy', 'radio') > 1 && KP.promoFit('hiphop', 'radio') < 1, 'radio carries the ballad');
  t.eq(KP.promoFitWord('performance', 'challenge'), 'built for this record', 'the seat reads the fit in words');
  t.eq(KP.promoFitWord('dreamy', 'challenge'), 'the wrong tool for this record', 'and names the wrong tool');
  t.eq(KP.promoFitWord('bright', 'countdown'), null, 'a neutral booking is just a booking');
  const sum = KP.promoFitSummary('dreamy');
  t.ok(sum.home.includes('Radio') && sum.off.includes('Dance challenge'), 'the builder gets a summary for the lane');
  // the push itself: the same campaign, two records
  const mk = lane => {
    const s = KP.newGame('pr-fit-' + lane, null, { legacy: false }); s.budget = 900;
    const ids = s.roster.slice(0, 5);
    KP.proposeGroup(s, 'FITLINE', ids, KP.roleHints(s, ids.map(i => s.people[i])));
    const g = s.groups[0]; g.demos = KP.generateDemos(s, KP.rngFor(s), g);
    KP.planDebut(s, { groupId: g.id, songId: g.demos[0].id, conceptId: lane, promo: 'modest', week: s.week + 8, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
    const r = KP.campaignPush(s, g.id, 'radioPush');
    return { s, g, r };
  };
  const F = KP.C.FAME.PUSHES.radioPush.needsFame; KP.C.FAME.PUSHES.radioPush.needsFame = 0;
  const a = mk('dreamy'), b = mk('hiphop');
  KP.C.FAME.PUSHES.radioPush.needsFame = F;
  t.ok(a.r.ok && b.r.ok, 'fixture: both pushes ran');
  t.ok(a.g.prep.campaign.momentum > b.g.prep.campaign.momentum, 'the radio push buys more for the ballad (' + a.g.prep.campaign.momentum + ' > ' + b.g.prep.campaign.momentum + ')');
  t.ok(a.s.promoLedger.fitHome === 1 && b.s.promoLedger.fitOff === 1, 'ledgered both ways');
  // the rollout's pop gain reads the fit too
  const x = debuted('pr-fit-roll', { lane: 'performance' });
  const y = debuted('pr-fit-roll', { lane: 'dreamy' });
  t.ok(KP.eraLane(x.s, x.g) === 'performance' && KP.eraLane(y.s, y.g) === 'dreamy', 'the era’s lane is the record’s');
}

// ---- the comeback stage: the era's first stage is a named special -----------
{
  const { s, g } = debuted('pr-comeback');
  const rel = g.releases[0];
  t.ok(!rel.comebackStage, 'fixture: the era has not opened');
  KP.advanceWeek(s);
  const notes = KP.lastTickNotes || [];
  t.ok(rel.comebackStage && rel.comebackStage.showId === 'popWave' && ['carried', 'clean', 'shaky', 'fumbled'].includes(rel.comebackStage.band),
    'the first stage of the era is the comeback stage, rated (' + rel.comebackStage.band + ')');
  const note = notes.find(n => n.ind === 'comebackStage');
  t.ok(note && /THE DEBUT STAGE/.test(note.text) && /critics/.test(note.text), 'and it posts as the named special — a debut’s first stage is the debut stage (v0.11.5) — with the critics in the front row');
  t.ok(!notes.some(n => n.ind === 'stageRead' && n.groupId === g.id), 'the week’s one stage line IS the comeback stage');
  t.ok(g.results.comebackStage && g.results.comebackStage.band === rel.comebackStage.band, 'the report carries it');
  t.eq(s.promoLedger.comebackStages, 1, 'ledgered');
  KP.advanceWeek(s);
  t.eq(s.promoLedger.comebackStages, 1, 'one comeback stage an era');
  // hype-bearing: a carried comeback stage lifts the room
  const w = debuted('pr-comeback-2');
  w.g.members.forEach(id => { const p = w.s.people[id]; p.talents.vocals.cur = 88; p.talents.dance.cur = 88; p.talents.charisma.cur = 85; p.liveExp = 40; p.fatigue = 20; p.morale = 80; });
  const hype0 = w.g.members.reduce((x, id) => x + (w.s.people[id].hype || 0), 0);
  KP.advanceWeek(w.s);
  const cb = w.g.releases[0].comebackStage;
  t.ok(cb && cb.band === 'carried', 'fixture: a carried comeback stage (' + (cb && cb.band) + ')');
  const hype1 = w.g.members.reduce((x, id) => x + (w.s.people[id].hype || 0), 0);
  t.ok(hype1 > hype0, 'a carried comeback stage is hype-bearing');
}

// ---- the offers: a swap on the locked plan ---------------------------------
{
  const C = KP.C.PROMO.OFFERS;
  const SC = C.showChance, VC = C.varietyChance;
  C.showChance = 1; C.varietyChance = 0;
  const { s, g } = debuted('pr-offer');
  g.releases[0].reception = 80;   // "the numbers"
  KP.advanceWeek(s);
  const sc = offerOf(s, g);
  t.ok(sc && sc.offerKind === 'show' && sc.slotWeek === 1 && !PLAN[1].includes(sc.activity), 'a warm record gets a show’s call for next week — a stage not already on the plan');
  t.eq(sc.replace, 'variety', 'the desk would give up the weakest booking, never a stage when a non-stage stands');
  const def = KP.sceneDef('promoOffer');
  t.ok(/next week/.test(def.body(s, sc)) && def.options(s, sc)[0].id === 'take' && /swap out Variety/.test(def.options(s, sc)[0].label), 'the scene names the week, the swap and the default door');
  t.ok((KP.lastTickNotes || []).some(n => n.ind === 'promoOffer'), 'and the desk letter lands');
  const budget0 = s.budget;
  const r = KP.resolveScene(s, sc.id, 'take');
  t.ok(r.ok && g.rollout[1].includes(sc.activity) && !g.rollout[1].includes('variety') && g.rollout[1].length === 2, 'taking it swaps the slot on the locked plan');
  t.ok(s.budget <= budget0, 'the swap bills the difference');
  t.ok(s.promoLedger.taken === 1 && KP.broadcasterTrust(s, 'variety') === 0 && KP.broadcasterLines(s).length === 0, 'cancelling variety costs no broadcaster');
  // the second offer of the era
  KP.advanceWeek(s);
  const sc2 = offerOf(s, g);
  t.ok(sc2 && sc2.slotWeek === 2, 'the second invitation targets the week after');
  KP.resolveScene(s, sc2.id, 'decline');
  t.eq(s.promoLedger.declined, 1, 'keeping the plan is a choice');
  KP.advanceWeek(s);
  t.ok(!offerOf(s, g) && g.releases[0].offers === 2, 'the desk fields at most two invitations an era — a choice, not a task list');
  C.showChance = SC; C.varietyChance = VC;
}
{
  // cancelling a stage: the broadcaster remembers, and stops calling
  const C = KP.C.PROMO.OFFERS;
  const SC = C.showChance, VC = C.varietyChance;
  C.showChance = 1; C.varietyChance = 0;
  const { s, g } = debuted('pr-cancel');
  g.releases[0].reception = 80;
  g.rollout[1] = ['countdown', 'primeStage'];   // a week of two stages: the swap must cancel one
  KP.advanceWeek(s);
  const sc = offerOf(s, g);
  t.ok(sc && sc.activity === 'popWave' && KP.isShowActivity(sc.replace), 'the only stage not on the plan calls; the swap would cancel a stage');
  t.ok(/desk keeps notes|will remember/.test(KP.sceneDef('promoOffer').body(s, sc)), 'the scene says the desk keeps notes');
  KP.resolveScene(s, sc.id, 'take');
  t.ok(KP.broadcasterTrust(s, sc.replace) === -1 && s.promoLedger.cancelled === 1, 'the cancelled broadcaster remembers');
  t.ok(KP.broadcasterLines(s).some(l => /remembers a cancellation/.test(l)), 'in words, on the desk');
  s.broadcasters[sc.replace] = -1;
  // at trustMin the desk does not call: force an offer week where only that show is free
  g.rollout[3] = ['countdown', 'primeStage', 'popWave'].filter(id => id !== sc.replace);
  const rel = g.releases[0]; rel.offers = 0;
  s.scenes = [];
  KP.advanceWeek(s);
  const next = offerOf(s, g);
  t.ok(!next || next.activity !== sc.replace, 'a broadcaster at the trust floor does not call (' + (next ? next.activity : 'no call') + ')');
  // silence is a no
  const w = debuted('pr-silence');
  w.g.releases[0].reception = 80;
  KP.advanceWeek(w.s);
  const sw = offerOf(w.s, w.g);
  t.ok(sw, 'fixture: an offer');
  const plan1 = JSON.stringify(w.g.rollout[1]);
  KP.advanceWeek(w.s);
  t.ok(!offerOf(w.s, w.g) && JSON.stringify(w.g.rollout[1]) === plan1 && w.s.promoLedger.declined >= 1, 'an unanswered invitation expires with the plan untouched');
  C.showChance = SC; C.varietyChance = VC;
}
{
  // variety invites a face with media reps
  const C = KP.C.PROMO.OFFERS;
  const SC = C.showChance, VC = C.varietyChance;
  C.showChance = 0; C.varietyChance = 1;
  const { s, g, ids } = debuted('pr-variety');
  g.releases[0].reception = 30;
  const face = s.people[ids[2]];
  face.talents.charisma.cur = 90; face.personality.warmth = 85; face.personality.confidence = 80; face.mediaExp = 20;
  g.rollout[1] = ['countdown', 'radio'];
  KP.advanceWeek(s);
  const sc = offerOf(s, g);
  t.ok(sc && sc.offerKind === 'variety' && sc.personId === face.id && sc.replace === 'radio', 'the variety producers want the face — and the group comes with her');
  t.ok(new RegExp(KP.displayName(face)).test(KP.sceneDef('promoOffer').body(s, sc)), 'the scene names her');
  C.showChance = SC; C.varietyChance = VC;
}

// ---- the extension: the second wind --------------------------------------------
{
  const { s, g, ids } = debuted('pr-extend');
  t.ok(!KP.extensionRead(s, g).ok && /No promotion/.test(KP.extensionRead(s, g).reason), 'release week is not promotion yet');
  KP.advanceWeek(s); s.scenes = (s.scenes || []).filter(x => x.kind !== 'promoOffer');
  t.ok(!KP.extensionRead(s, g).ok && /last week/.test(KP.extensionRead(s, g).reason), 'the question comes in the last week');
  while (s.week < g.promoUntil) { KP.advanceWeek(s); s.scenes = (s.scenes || []).filter(x => x.kind !== 'promoOffer'); }
  t.eq(s.week, g.promoUntil, 'fixture: the last week');
  const r0 = KP.extensionRead(s, g);
  const rel = g.releases[0];
  if (!KP.recordClimbing(s, g).climbing) {
    t.ok(!r0.ok && /not climbing/.test(r0.reason), 'a record that is not climbing cannot sell the story');
    rel.sleeperTitle = rel.sleeperTitle || 'The Quiet One';   // the sleeper is the other door
  }
  const r1 = KP.extensionRead(s, g);
  t.ok(r1.ok && r1.weeks === 2 && r1.why, 'the sleeper opens the door (' + r1.why + ')');
  ids.forEach(id => { s.people[id].fatigue = Math.min(s.people[id].fatigue, 80); });   // under the cap: the claim is the bill, not the ceiling (v0.10.43 stream)
  const fat0 = ids.map(id => s.people[id].fatigue);
  const until = g.promoUntil, len = g.rollout.length, budget0 = s.budget;
  const r = KP.extendEra(s, g.id);
  t.ok(r.ok && g.promoUntil === until + 2 && g.rollout.length === len + 2 && g.eraExtendedWeek === s.week, 'two more weeks, with their own light plan');
  t.ok(ids.every((id, i) => KP.onBreak(s.people[id]) || s.people[id].fatigue > fat0[i]), 'the members pay in hours (a member on a break is not on the schedule)');
  t.ok(s.budget < budget0, 'and the bookings bill');
  t.ok(s.inbox.some(n => n.ind === 'eraExtended' && n.extension), 'the era EXTENDS, in the letter');
  t.ok(!KP.extendEra(s, g.id).ok, 'once an era');
  // the plan runs through the extra weeks and the stages are rated there
  const rated0 = s.stageLedger.rated;
  KP.advanceWeek(s); KP.advanceWeek(s);
  t.ok(s.week === until + 2 && s.stageLedger.rated > rated0, 'the extension’s stages are promotion, rated like any');
  t.eq(s.promoLedger.extended, 1, 'ledgered');
}

// ---- still climbing: the chart's movement ---------------------------------------
{
  const { s, g } = debuted('pr-climb');
  const rel = g.releases[0];
  const e = (s.chart.entries || []).find(x => x.isPlayer && x.groupId === g.id && x.entered === rel.week);
  t.ok(e, 'fixture: the record is on the scene chart');
  e.lastPos = 9; e.pos = 4;
  t.eq(KP.recordClimbing(s, g).why, 'the scene chart', 'a rank that rose reads as climbing');
  e.lastPos = 4; e.pos = 6;
  t.ok(!KP.recordClimbing(s, g).climbing, 'a rank that fell does not');
  rel.sleeperTitle = 'Late';
  t.eq(KP.recordClimbing(s, g).why, 'the sleeper', 'the sleeper is the other door');
}

// ---- the swap target and the plan beyond four weeks -----------------------------
{
  t.eq(KP.offerSwapTarget(['countdown', 'variety']), 'variety', 'the weakest non-stage booking goes');
  t.eq(KP.offerSwapTarget(['countdown', 'primeStage']), 'primeStage', 'between two stages, the lesser one');
  t.eq(KP.offerSwapTarget(['livestream']), null, 'a light week has room');
  t.eq(KP.offerSwapTarget([]), null, 'so does an empty one');
}

// ---- determinism ---------------------------------------------------------------
{
  const a = KP.newGame('pr-fork', null, { legacy: true });
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 40; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the promotion forks clean');
}

t.finish();
