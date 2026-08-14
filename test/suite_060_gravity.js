/* Suite 060 — the gravity, both directions (v0.9.18). §55.2: the
   transcendence read crosses a line and the clamor begins in stages,
   from every voice the game has; settle it with the in-group solo,
   hold it and pay the resentment clock, or open the door. The same
   rails read downward: the slump — the nerve, the quiet era, the
   stage that gives it back. Plus the identity arcs. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_060_gravity');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  state.budget = 600;
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'ORBIT', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return { state, g };
}
// make one member transcend: the follower share IS the read's spine
function elevate(state, g, p) {
  g.members.forEach(id => { state.people[id].social = 5000; });
  p.social = 60000;
  p.flags.soloShines = 3;
}

// ---- the read: deterministic, worded, and honest about the math ----
{
  const { state, g } = debuted('gv-read');
  const p = state.people[g.members[0]];
  const flat = KP.transcendRead(state, g, p);
  t.ok(flat < KP.C.GRAVITY.transcendAt, 'five even members read as a room, not a launchpad (' + flat + ')');
  elevate(state, g, p);
  const read = KP.transcendRead(state, g, p);
  t.ok(read >= KP.C.GRAVITY.transcendAt, 'the follower gap plus the shine crosses the line (' + read + ')');
  t.eq(KP.gravityWord(read), 'bigger than the group?', 'and the word says what the trades will');
  t.eq(KP.transcendRead(state, g, p), read, 'the read never re-rolls');
}

// ---- the clamor: staged, loud, and resolvable by the solo credit ----
{
  const { state, g } = debuted('gv-clamor');
  const p = state.people[g.members[0]];
  elevate(state, g, p);
  const G = KP.C.GRAVITY;
  let guard = 0;
  while (!g.gravity && guard++ < G.holdWeeksToClamor + 4) KP.advanceWeek(state);
  t.ok(g.gravity && g.gravity.personId === p.id, 'the pattern held — the clamor begins on her');
  t.ok(state.inbox.some(n => n.ind === 'gravityTrades'), 'the trades run the feature');
  t.ok(KP.getNarrative(state, 'biggerThan', 'idol', p.id), 'and the question becomes a narrative');
  t.eq(state.gravityLedger.clamors, 1, 'ledgered');
  // ride to the split and the exec stages
  guard = 0;
  while ((g.gravity.stage || 0) < 2 && guard++ < G.execStage + 6) {
    // keep the discourse cap clear for the split (stream shifts can
    // seat an unrelated storm in the only chair)
    (state.discourses || []).forEach(d => {
      if (d.kind !== 'soloClamor' && d.status === 'live') { d.status = 'resolved'; d.resolved = 'faded'; }
    });
    KP.advanceWeek(state);
  }
  t.ok((state.discourses || []).some(d => d.kind === 'soloClamor'), 'the fandom splits into camps');
  // the exec ask queues the NEXT Monday meeting
  let sawSoloQ = false;
  guard = 0;
  while (!sawSoloQ && guard++ < 10) {
    KP.advanceWeek(state);
    const sc = (state.scenes || []).find(x => x.kind === 'execQuestion');
    if (sc && sc.q.type === 'soloQuestion') {
      sawSoloQ = true;
      KP.resolveScene(state, sc.id, 'group');   // the hold — she hears
    } else if (sc) {
      KP.resolveScene(state, sc.id, sc.q.options[0].id);
    }
  }
  t.ok(sawSoloQ, 'the Monday meeting asks the solo question');
  // the settle: a solo credit lands and the whole thing exhales
  const morale0 = p.morale;
  const rel = g.releases[g.releases.length - 1];
  rel.tracklist = rel.tracklist || [];
  rel.tracklist.push({ n: 9, title: 'Alone, Lit', kind: 'bside',
    credit: { type: 'solo', memberId: p.id }, slot: true });
  rel.week = state.week;   // the credit reads as post-clamor
  KP.advanceWeek(state);
  t.eq(g.gravity.settled, 'solo', 'the in-group solo settles the clamor');
  t.ok(p.morale > morale0, 'and she feels the answer');
  t.ok(state.inbox.some(n => n.ind === 'gravitySettled'), 'both camps get told they won');
  t.eq(state.gravityLedger.settled, 1, 'ledgered');
}

// ---- the knock: the ask she rehearsed, all three answers ----
{
  const { state, g } = debuted('gv-knock');
  const p = state.people[g.members[0]];
  elevate(state, g, p);
  const G = KP.C.GRAVITY;
  let guard = 0;
  while ((!g.gravity || (g.gravity.stage || 0) < 3) && guard++ < G.knockStage + G.holdWeeksToClamor + 8) {
    KP.advanceWeek(state);
    // keep the desk clear so the knock can land (the bot pattern)
    (state.scenes || []).slice().forEach(sc => {
      if (sc.kind !== 'soloKnock') {
        const def = KP.sceneDef(sc.kind);
        if (def) KP.resolveScene(state, sc.id, def.options(state, sc)[0].id);
      }
    });
  }
  const sc = (state.scenes || []).find(x => x.kind === 'soloKnock');
  t.ok(sc, 'she knocks with the rehearsed ask');
  t.eq(state.gravityLedger.knocks, 1, 'ledgered');
  // fork A: the promise — a claim with a date
  const a = KP.deserialize(KP.serialize(state));
  KP.resolveScene(a, a.scenes.find(x => x.kind === 'soloKnock').id, 'promise');
  t.ok((a.claims || []).some(c => c.type === 'soloPromise' && !c.resolved), 'the promise goes on the record');
  // ...and breaking it lands on the renewal ledger
  const claim = a.claims.find(c => c.type === 'soloPromise');
  claim.byWeek = a.week - 1;
  KP.advanceWeek(a);
  t.eq(claim.resolved, 'missed', 'the missed date resolves against you');
  const ap = a.people[p.id];
  t.ok((ap.directed || []).some(d => d.kind === 'promiseBroken'), 'and she remembers who broke it');
  // fork B: the hold — the ledger the renewal table reads
  const b = KP.deserialize(KP.serialize(state));
  KP.resolveScene(b, b.scenes.find(x => x.kind === 'soloKnock').id, 'group');
  t.ok((b.people[p.id].directed || []).some(d => d.kind === 'heldBack'), 'the hold goes on the directed ledger');
  // fork C: the spin-out — graduation with the door held open
  const c = KP.deserialize(KP.serialize(state));
  KP.resolveScene(c, c.scenes.find(x => x.kind === 'soloKnock').id, 'open');
  const cg = c.groups[0];
  t.ok(!cg.members.includes(p.id), 'the spin-out: she flies');
  t.eq(cg.gravity.settled, 'spinout', 'and the clamor closes with her');
}

// ---- the slump: the nerve goes, the middle register, the stage exit ----
{
  const { state, g } = debuted('gv-slump');
  const p = state.people[g.members[1]];
  g.releases[g.releases.length - 1].receptionBand = 'miss';
  p.morale = 30; p.personality.confidence = 30;
  const S = KP.C.SLUMP;
  const old = S.enterChance;
  S.enterChance = 1;
  KP.advanceWeek(state);
  S.enterChance = old;
  t.ok(p.flags.slump, 'the nerve goes when everything else already has');
  t.ok(p.history.some(h => /nerve went somewhere/i.test(h.text)), 'and the file says it plainly');
  t.eq(state.gravityLedger.slumps, 1, 'ledgered');
  const dimmed = KP.derived(p).liveReliability;
  delete p.flags.slump;
  const clear = KP.derived(p).liveReliability;
  p.flags.slump = { since: state.week, kind: 'nerve' };
  t.ok(dimmed < clear, 'the slump dims the stage stats, not the practice room');
  // the quiet era scene arrived — shield her
  const sc = (state.scenes || []).find(x => x.kind === 'quietEra');
  t.ok(sc, 'the quiet-era decision reaches the desk');
  KP.resolveScene(state, sc.id, 'shield');
  t.ok(g.slumpShield && g.slumpShield.personId === p.id, 'the company blinks first — shielded');
  t.ok((p.directed || []).some(d => d.kind === 'protected'), 'and she remembers being protected');
  // the stage exit: a show win while slumping ends it NOW
  g.lastShowWinWeek = state.week + 1;
  KP.advanceWeek(state);
  t.ok(!p.flags.slump, 'the stage gave the nerve back');
  t.ok(state.inbox.some(n => n.ind === 'foundFooting'), 'and everyone saw the exact moment');
  t.eq(state.gravityLedger.footings, 1, 'ledgered');
}

// ---- the identity arcs: repeated behavior mints the narrative ----
{
  const { state, g } = debuted('gv-arcs');
  g.festivalsPlayed = KP.C.ARCS.festivalIconsAt;
  state.people[g.members[0]].flags.panelArcs = 2;
  state.people[g.members[1]].flags.mcRuns = 1;
  state.people[g.members[2]].flags.ostDrops = KP.C.ARCS.ostFactoryAt;
  KP.advanceWeek(state);
  t.ok(KP.getNarrative(state, 'festivalIcons', 'group', g.id), 'three springs make icons');
  t.ok(KP.getNarrative(state, 'varietyGroup', 'group', g.id), 'three wrapped runs make the variety group');
  t.ok(KP.getNarrative(state, 'ostFactory', 'group', g.id), 'two OSTs make the factory');
  t.ok(KP.feedReactionFor('gravityTrades') && KP.feedReactionFor('gravitySettled') && KP.feedReactionFor('foundFooting'),
    'the timeline answers the new inds through the registry');
}

// ---- determinism ----
{
  const { state: a } = debuted('gv-fork');
  const p = a.people[a.groups[0].members[0]];
  elevate(a, a.groups[0], p);
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 40; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'clamors, slumps, and arcs fork clean');
}

t.finish();
