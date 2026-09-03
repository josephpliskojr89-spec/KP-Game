/* Suite 095 — the friction stream (v0.10.26, §88 A+B). The design law
   under test: same event + different person = different correct
   answer. Every answer deposits; the badly-read ones bite. Plus the
   trait checks: the nerve in head-to-head weeks and the warm
   veteran's steadying. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_095_friction');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  state.budget = Math.max(state.budget, 2000);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'FRIC', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return { state, g };
}
function open(state, sc) {
  return KP.openScene(state, Object.assign({ expiresWeek: state.week + 2 }, sc));
}

// ---- the extra hour: the inversion IS the content ----
{
  const { state, g } = debuted('fr-hour');
  const FR = KP.C.FRICTION;
  const p = state.people[g.members[0]];
  p.personality.workEthic = 80;
  p.fatigue = 60;
  const v0 = p.talents.vocals.cur;
  // fork A: allow the grinder — polish lands, the hours land too
  const a = KP.deserialize(KP.serialize(state));
  const sa = open(a, { kind: 'frictionExtraHour', personId: p.id, groupId: g.id, variant: 'grinder' });
  KP.resolveScene(a, sa.id, 'allow');
  const ap = a.people[p.id];
  t.ok(ap.talents.vocals.cur > v0, 'the extra hour polishes for real');
  t.ok(ap.fatigue > 60, 'and costs real hours');
  t.ok((ap.directed || []).some(d => d.kind === 'trusted'), 'being trusted with the room is a deposit');
  // fork B: refuse the grinder — rested and quietly furious
  const b = KP.deserialize(KP.serialize(state));
  const sb = open(b, { kind: 'frictionExtraHour', personId: p.id, groupId: g.id, variant: 'grinder' });
  const m0 = b.people[p.id].morale;
  KP.resolveScene(b, sb.id, 'refuse');
  t.ok(b.people[p.id].morale < m0, 'refusing the grinder cuts HER');
  // fork C: the teeth — allowing someone already at the line can crash
  let crashed = 0, tries = 0;
  for (const seed of ['x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'x8']) {
    const c = KP.deserialize(KP.serialize(state));
    const cp = c.people[p.id];
    cp.fatigue = KP.C.COMEBACK.OVERWORK.threshold - FR.extraHourFatigue + 1;
    // vary the stream per fork: real draws move the state
    { const r2 = KP.rngFor(c); for (let k = 0; k <= tries; k++) r2.chance(0.5); c.rngState = r2.state(); }
    const sc2 = open(c, { kind: 'frictionExtraHour', personId: p.id, groupId: g.id, variant: 'grinder' });
    KP.resolveScene(c, sc2.id, 'allow');
    if (c.people[p.id].flags.burnout > 0) crashed++;
    tries++;
  }
  t.ok(crashed >= 1, 'the teeth are real: the worn grinder can crash (' + crashed + '/8)');
  t.ok(crashed < 8, 'but a crash is a risk, not a rule');
  // the drained variant: the lighter week spreads to the room
  const d = KP.deserialize(KP.serialize(state));
  const dp = d.people[g.members[1]];
  dp.personality.workEthic = 30; dp.fatigue = 60;
  const others0 = g.members.filter(id => id !== dp.id).map(id => d.people[id].fatigue);
  const sd = open(d, { kind: 'frictionExtraHour', personId: dp.id, groupId: g.id, variant: 'drained' });
  KP.resolveScene(d, sd.id, 'lighten');
  t.ok(d.people[dp.id].fatigue < 60, 'the lighter week rests her');
  const others1 = g.members.filter(id => id !== dp.id).map(id => d.people[id].fatigue);
  t.ok(others1.some((f, i) => f > others0[i]), 'and the room absorbs the hours — a kindness with a bill');
}

// ---- the clip call: her file tells you the answer ----
{
  const { state, g } = debuted('fr-clip');
  const p = state.people[g.members[0]];
  p.personality.professionalism = 80;
  // riding with a professional lands
  const a = KP.deserialize(KP.serialize(state));
  const sa = open(a, { kind: 'frictionClipCall', personId: p.id, groupId: g.id });
  const soc0 = a.people[p.id].social || 0;
  KP.resolveScene(a, sa.id, 'ride');
  t.ok((a.people[p.id].social || 0) > soc0, 'riding the right mouth is a spike');
  t.ok((a.people[p.id].directed || []).some(d => d.kind === 'trusted'), 'and a deposit');
  // killing is safe and costs quietly
  const b = KP.deserialize(KP.serialize(state));
  const sb = open(b, { kind: 'frictionClipCall', personId: p.id, groupId: g.id });
  const m0 = b.people[p.id].morale;
  KP.resolveScene(b, sb.id, 'kill');
  t.ok(b.people[p.id].morale < m0, 'the muzzle costs her something');
  t.ok((b.people[p.id].directed || []).some(d => d.kind === 'muzzled'), 'and she files it');
  // the teeth: riding the wrong mouth can burn
  let burned = 0;
  for (let i = 0; i < 10; i++) {
    const c = KP.deserialize(KP.serialize(state));
    const cp = c.people[p.id];
    cp.personality.professionalism = 20;
    { const r2 = KP.rngFor(c); for (let k = 0; k <= i; k++) r2.chance(0.5); c.rngState = r2.state(); }
    const sc2 = open(c, { kind: 'frictionClipCall', personId: p.id, groupId: g.id });
    KP.resolveScene(c, sc2.id, 'ride');
    if ((c.frictionLedger || {}).hard >= 1) burned++;
  }
  t.ok(burned >= 1, 'the teeth are real: the wrong mouth can turn (' + burned + '/10)');
  t.ok(burned < 10, 'but even the wrong mouth sometimes lands');
}

// ---- the substitution: pride reads the same gift twice ----
{
  const { state, g } = debuted('fr-sub');
  const worn = state.people[g.members[0]];
  const fresh = state.people[g.members[1]];
  worn.fatigue = 75; fresh.personality.confidence = 70; fresh.fatigue = 30;
  // the proud one pays for being helped
  const a = KP.deserialize(KP.serialize(state));
  a.people[worn.id].personality.competitiveness = 75;
  const sa = open(a, { kind: 'frictionSubstitution', personId: worn.id, groupId: g.id, volunteerId: fresh.id });
  const m0 = a.people[worn.id].morale;
  KP.resolveScene(a, sa.id, 'accept');
  t.ok(a.people[worn.id].fatigue < 75, 'the body is saved either way');
  t.ok(a.people[worn.id].morale < m0, 'the proud one pays in something she values more');
  t.ok((a.people[worn.id].directed || []).some(d => d.kind === 'benchedPride'), 'and the file remembers');
  // the humble one is grateful for the same gift
  const b = KP.deserialize(KP.serialize(state));
  b.people[worn.id].personality.competitiveness = 30;
  const sb = open(b, { kind: 'frictionSubstitution', personId: worn.id, groupId: g.id, volunteerId: fresh.id });
  const m1 = b.people[worn.id].morale;
  KP.resolveScene(b, sb.id, 'accept');
  t.ok(b.people[worn.id].morale >= m1, 'the humble one takes the help as help — SAME event, opposite answer');
  t.ok((b.people[fresh.id].directed || []).some(d => d.kind === 'seen'), 'the volunteer is seen either way');
}

// ---- the quiet no: asking is cheap, pressing the wrong person is not ----
{
  const { state, g } = debuted('fr-quiet');
  const p = state.people[g.members[0]];
  p.morale = 40; p.fatigue = 68;
  // asking heals
  const a = KP.deserialize(KP.serialize(state));
  const sa = open(a, { kind: 'frictionQuietNo', personId: p.id, groupId: g.id });
  KP.resolveScene(a, sa.id, 'ask');
  t.ok(a.people[p.id].morale > 40, 'asking why is worth morale');
  t.ok(a.people[p.id].fatigue < 68, 'and the day off fixes what a day off fixes');
  t.ok((a.people[p.id].directed || []).some(d => d.kind === 'heardHer'), 'heard, on the record');
  // pressing the professional holds — at a hidden price
  const b = KP.deserialize(KP.serialize(state));
  b.people[p.id].personality.professionalism = 75;
  const sb = open(b, { kind: 'frictionQuietNo', personId: p.id, groupId: g.id });
  KP.resolveScene(b, sb.id, 'press');
  t.ok((b.people[p.id].directed || []).some(d => d.kind === 'pressed'), 'the withdrawal is on the ledger even when she performs');
  // the teeth: pressing the wrong person in the wrong week
  let crashed = 0;
  for (let i = 0; i < 10; i++) {
    const c = KP.deserialize(KP.serialize(state));
    const cp = c.people[p.id];
    cp.personality.professionalism = 25; cp.morale = 34;
    { const r2 = KP.rngFor(c); for (let k = 0; k <= i; k++) r2.chance(0.5); c.rngState = r2.state(); }
    const sc2 = open(c, { kind: 'frictionQuietNo', personId: p.id, groupId: g.id });
    KP.resolveScene(c, sc2.id, 'press');
    if (c.people[p.id].flags.burnout > 0) crashed++;
  }
  t.ok(crashed >= 1, 'the big consequence exists: she can go down mid-schedule (' + crashed + '/10)');
  // silence has a price (the door law)
  const d = KP.deserialize(KP.serialize(state));
  const sd = open(d, { kind: 'frictionQuietNo', personId: p.id, groupId: g.id });
  sd.expiresWeek = d.week - 1;
  const md = d.people[p.id].morale;
  KP.advanceWeek(d);
  t.ok(d.people[p.id].morale < md, 'leaving the quiet no unanswered costs more than answering it');
}

// ---- the rail: questions actually arrive, paced ----
{
  const { state, g } = debuted('fr-rail');
  // make several members eligible and run the clock
  g.members.forEach((id, i) => {
    const m = state.people[id];
    if (i === 0) { m.personality.workEthic = 80; }
  });
  let asked = 0, guard = 0;
  while (guard++ < 40) {
    state.budget = Math.max(state.budget, 500);
    // keep a prep cycle alive so extra-hour conditions recur
    if (!g.prep && !g.tour && state.week > (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks &&
        (g.demos || []).length) {
      KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
        week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
    }
    const before = (state.frictionLedger || {}).asked || 0;
    KP.advanceWeek(state);
    const p0 = state.people[g.members[0]];
    p0.fatigue = KP.clamp(p0.fatigue, 52, 70);   // keep the grinder eligible
    if (((state.frictionLedger || {}).asked || 0) > before) asked++;
    (state.scenes || []).filter(sc => /^friction/.test(sc.kind))
      .forEach(sc => KP.resolveScene(state, sc.id, KP.sceneDef(sc.kind).options(state, sc)[0].id));
  }
  t.ok(asked >= 4, 'the stream flows — questions arrive over a season (' + asked + '/40 weeks)');
  t.ok(asked <= 20, 'and it is a stream, not a mailbox');
}

// ---- the nerve (§88 B): the fighters rise in a head-to-head ----
{
  const { state, g } = debuted('fr-nerve');
  g.members.forEach(id => { state.people[id].personality.competitiveness = 80; });
  t.eq(KP.battleNerve(state, g), KP.C.WAR.nerveCap, 'a room of fighters hits the cap');
  g.members.forEach(id => { state.people[id].personality.competitiveness = 30; });
  t.eq(KP.battleNerve(state, g), 0, 'a gentle room brings no edge');
}

// ---- the steadying (§88 B): the warm veteran holds the room up ----
{
  const { state, g } = debuted('fr-steady');
  const warm = state.people[g.members[0]];
  const low = state.people[g.members[1]];
  warm.personality.warmth = 80;
  low.morale = 20;
  const m0 = low.morale;
  KP.advanceWeek(state);
  t.ok(state.people[low.id].morale >= m0, 'the lowest member is quietly held up, every week');
}

// ---- determinism ----
{
  const { state } = debuted('fr-fork');
  const b = KP.deserialize(KP.serialize(state));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(state); KP.advanceWeek(b); }
  t.eq(KP.serialize(state), KP.serialize(b), 'the friction stream forks clean');
}

t.finish();
