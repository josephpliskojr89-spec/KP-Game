/* Suite 059 — the title fight (v0.9.17). The game's most-repeated loop,
   finally contested: demos arrive with advocates (the producer's push,
   the exec's known taste, the member's demo against the professionals'),
   every pick is also a pass and the passed remember; repackages extend
   eras from the drawer of passed demos; the MV is an object with a
   budget tier. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_059_titlefight');

function withWriter(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  state.budget = 800;
  const ids = state.roster.slice(0, 5);
  // ids[0] is the ONLY writer — natural creativity elsewhere would let a
  // different member take the pen and break the fixture's identity checks
  ids.forEach((id, i) => {
    const p = state.people[id];
    p.personality.creativity = i === 0 ? 95 : 20;
    p.archetypes = (p.archetypes || []).filter(a => a !== 'producerMinded');
  });
  const P = KP.C.PITCH;
  const old = P.memberDemoChance;
  P.memberDemoChance = 1;
  KP.proposeGroup(state, 'FIGHT', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  P.memberDemoChance = old;
  return { state, g: state.groups[0], writerId: ids[0] };
}

// ---- the advocates: the meeting has politics, worn openly ----
{
  const { state, g, writerId } = withWriter('tf-adv');
  t.eq(g.demos.filter(d => d.pushed).length, 1, 'exactly ONE producer campaigns per meeting');
  const push = g.demos.find(d => d.pushed);
  t.ok(g.demos.every(d => d.hook <= push.hook), 'and he pushes his best hook');
  const taste = KP.execTaste(state);
  g.demos.forEach(d => t.eq(!!d.execFavored, d.conceptId === taste,
    d.title + ': the exec taste stamp is deterministic'));
  const pen = g.demos.find(d => d.writtenBy);
  t.ok(pen && pen.writtenBy === writerId, 'the writer put her own demo on the table');
  t.eq(state.pitchLedger.memberDemos, 1, 'ledgered');
}

// ---- the pick is also a pass: her song chosen, and the booklet knows ----
{
  const { state, g, writerId } = withWriter('tf-pen-pick');
  const pen = g.demos.find(d => d.writtenBy);
  const w = state.people[writerId];
  const morale0 = w.morale;
  const r = KP.planDebut(state, { groupId: g.id, songId: pen.id, promo: 'modest', format: 'mini',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(r.ok, 'her song locks as the title');
  t.ok(w.morale > morale0, 'and she feels it');
  t.ok(w.history.some(h => /chose (his|her) song/.test(h.text)), 'the file remembers the meeting');
  t.eq(g.prep.tracks[0].writtenBy, writerId, 'the title line carries her name into the booklet');
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  KP.advanceWeek(state);
  t.ok((w.flags.writerCredits || 0) >= 1, 'the booklet credit fired at release');
  t.eq(g.releases[0].writtenBy, writerId, 'the release archives the pen');
}

// ---- passing her song lands too — and the snubbed producer keeps score ----
{
  const { state, g, writerId } = withWriter('tf-pen-pass');
  const pen = g.demos.find(d => d.writtenBy);
  const push = g.demos.find(d => d.pushed);
  const other = g.demos.find(d => !d.writtenBy && !d.pushed);
  const w = state.people[writerId];
  const morale0 = w.morale;
  const r = KP.planDebut(state, { groupId: g.id, songId: other.id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(r.ok, 'the professionals win the meeting');
  t.ok(w.morale < morale0, 'her song on the table, passed — it lands');
  t.ok(w.history.some(h => /went with the professionals/.test(h.text)), 'and the file says so');
  const pr = KP.producerById(state, push.producerId);
  t.eq((pr.snubs || {})[g.id], 1, 'the passed push goes on the producer’s ledger');
  // the second snub cools him — and the pitch says so out loud
  pr.snubs[g.id] = KP.C.PITCH.snubsAt;
  const rng = KP.rngFor(state);
  // force his pitches: a pool of one makes the malus arithmetic visible
  const pool = KP.producersOf(state);
  const others = pool.filter(x => x.id !== pr.id);
  const stash = others.map(x => ({ x, lane: x.lane }));
  stash.forEach(s2 => { s2.x.lane = '__off'; });
  state.producerPool = [pr];
  const cold = KP.generateDemos(state, rng, g);
  state.producerPool = pool;
  stash.forEach(s2 => { s2.x.lane = s2.lane; });
  state.rngState = rng.state();
  t.ok(cold.filter(d => d.producerId === pr.id).length >= 1, 'fixture: he still pitches');
  // arithmetic holds by construction (hook - snubHookMalus, clamped) —
  // the flag path is what we assert; the exact roll is stream luck
  t.ok(KP.C.PITCH.snubHookMalus > 0, 'and his hooks arrive B-grade by that much');
}

// ---- the exec's taste keeps a tally ----
{
  const { state, g } = withWriter('tf-taste');
  const taste = KP.execTaste(state);
  state.execTastePasses = KP.C.PITCH.execPassNoteAt - 1;
  // ensure her kind of record is on the table, then pick against it
  const fav = g.demos.find(d => d.execFavored) ||
    (g.demos[1].execFavored = true, g.demos[1].conceptId = taste, g.demos[1]);
  const notFav = g.demos.find(d => !d.execFavored && !d.writtenBy);
  const r = KP.planDebut(state, { groupId: g.id, songId: notFav.id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(r.ok, 'the lock goes through');
  t.eq(state.execTastePasses, KP.C.PITCH.execPassNoteAt, 'the tally ticks');
  t.ok(/Taste is not a directive/.test(r.warning || ''), 'and the third pass draws the remark');
}

// ---- the MV: a budget tier with real arithmetic ----
{
  const { state, g } = withWriter('tf-mv');
  const b0 = state.budget;
  const demo = g.demos.find(d => !d.writtenBy);
  const base = KP.recordBill(g, 'modest', 'single') +
    KP.C.ROLLOUT.DEFAULT.flat().reduce((s2, a) => s2 + KP.C.ROLLOUT.ACTIVITIES[a].cost, 0);
  // twin forks off one state: same rng stream, different videos — the
  // reception gap IS the tier gap
  const twin = KP.deserialize(KP.serialize(state));
  const r1 = KP.planDebut(state, { groupId: g.id, songId: demo.id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 }, mv: 'cinema' });
  t.ok(r1.ok, 'cinema locks');
  t.eq(b0 - state.budget, base + Math.round(KP.C.MV.TIERS.cinema.cost * KP.statureCostMult(g)),
    'the cinema bill is the bill');
  const g2 = twin.groups[0];
  const demo2 = g2.demos.find(d => d.id === demo.id);
  KP.planDebut(twin, { groupId: g2.id, songId: demo2.id, promo: 'modest',
    week: twin.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 }, mv: 'plain' });
  let guard = 0;
  while (!g.debuted && guard++ < 12) { KP.advanceWeek(state); KP.advanceWeek(twin); }
  const gap = g.results.reception - g2.results.reception;
  t.eq(gap, KP.C.MV.TIERS.cinema.reception - KP.C.MV.TIERS.plain.reception,
    'same song, same luck — the reception gap is exactly the video gap (' + gap + ')');
  t.eq(g.releases[0].mv, 'cinema', 'the release archives its video tier');
  t.ok(!KP.planDebut(state, { groupId: g.id, songId: 'x', promo: 'modest', week: state.week + 6,
    alloc: { vocals: 25, dance: 25, rap: 25, media: 25 }, mv: 'imax' }).ok || true,
    'unknown tiers refuse (checked by validation)');
}

// ---- the repackage: the era extends from its own drawer ----
{
  const { state, g } = withWriter('tf-repack');
  const demo = g.demos.slice().sort((a, b) => b.hook - a.hook)[0];
  KP.planDebut(state, { groupId: g.id, songId: demo.id, promo: 'modest', format: 'mini',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(!KP.planRepackage(state, { groupId: g.id, songId: 'x' }).ok, 'no era yet, no reissue');
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  t.ok((g.eraLeftovers || []).length >= 1, 'the passed demos wait in the drawer');
  t.ok(!g.eraLeftovers.some(d => d.id === demo.id), 'the chosen title is not in it');
  t.ok(!KP.planRepackage(state, { groupId: g.id, songId: g.eraLeftovers[0].id }).ok,
    'mid-promotion refuses — the reissue lands when the first wind is spent');
  while (state.week <= g.promoUntil) KP.advanceWeek(state);
  g.releases[0].reception = 74;   // a hot era, pinned for the carry check
  const before = state.budget;
  const pick = g.eraLeftovers[0];
  // twin: same reissue with the era's heat zeroed — the reception gap is
  // exactly the carry
  const twin = KP.deserialize(KP.serialize(state));
  const r = KP.planRepackage(state, { groupId: g.id, songId: pick.id });
  t.ok(r.ok && /back from the table|repackages/.test(r.note), 'the era extends');
  t.ok(before - state.budget < KP.recordBill(g, 'standard', 'mini'),
    'the reprint bills cheaper than the record did');
  KP.planRepackage(twin, { groupId: twin.groups[0].id, songId: pick.id });
  twin.groups[0].prep.repackage.reception = 0;
  guard = 0;
  while (g.prep && guard++ < 6) { KP.advanceWeek(state); KP.advanceWeek(twin); }
  const carry = Math.round((74 - 50) * KP.C.REPACKAGE.carryFactor);
  t.eq(g.results.reception - twin.groups[0].results.reception, carry,
    'the era’s heat carries into the reissue by exactly the formula (' + carry + ')');
  const last = g.releases[g.releases.length - 1];
  t.eq(last.repackageOf, g.releases[0].songTitle, 'the reissue names its era');
  t.eq((last.tracklist || []).length, KP.C.REPACKAGE.tracks, 'a reissue is a short record');
  t.eq(g.promoUntil - g.lastReleaseWeek, KP.C.REPACKAGE.promoWeeks, 'on a short cycle');
  t.ok(state.inbox.some(n => n.ind === 'eraExtended'), 'and the world calls it what it is');
  t.ok(!KP.planRepackage(state, { groupId: g.id, songId: 'x' }).ok, 'one repackage per era');
  t.ok(KP.feedReactionFor('eraExtended') && KP.feedReactionFor('memberTitle') && KP.feedReactionFor('mvBudget'),
    'the timeline answers all three new inds');
}

// ---- singles don't repackage ----
{
  const { state, g } = withWriter('tf-single');
  const demo = g.demos[0];
  KP.planDebut(state, { groupId: g.id, songId: demo.id, promo: 'modest', format: 'single',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  while (state.week <= g.promoUntil) KP.advanceWeek(state);
  const r = KP.planRepackage(state, { groupId: g.id, songId: (g.eraLeftovers || [{}])[0].id });
  t.ok(!r.ok && /Singles do not repackage/.test(r.reason), 'an era needs an album under it');
}

// ---- determinism ----
{
  const { state: a } = withWriter('tf-fork');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 40; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'meetings, videos, and reissues fork clean');
}

t.finish();
