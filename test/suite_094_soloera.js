/* Suite 094 — the solo era (v0.10.24, §87). The in-group solo as a
   proactive company strategy: the studio verb, the direction meeting
   (the aespa clause), the landing, the ladder rewired, and the
   every-member project through the group's name. The owner's ruling:
   the company holds the cards — the era is how it plays them without
   opening the graduation door. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_094_soloera');

function debuted(seed, n) {
  const state = KP.newGame(seed, null, { legacy: false });
  state.budget = Math.max(state.budget, 2000);
  const ids = state.roster.slice(0, n || 5);
  KP.proposeGroup(state, 'ERA', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return { state, g };
}
function afterRest(state, g) {
  let guard = 0;
  while (state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks && guard++ < 20) {
    KP.advanceWeek(state);
  }
  state.budget = Math.max(state.budget, 2000);
}

// ---- the studio verb: gates, proactive, one era per group ----
{
  const { state, g } = debuted('era-gates');
  const star = state.people[g.members[0]];
  const second = state.people[g.members[1]];
  // pre-debut refuse checked on a fresh world
  const fresh = KP.newGame('era-gates-2', null, { legacy: false });
  const anyIdol = Object.values(fresh.people).find(p => p.status === 'idol');
  if (anyIdol) t.ok(!KP.soloEraCheck(fresh, anyIdol.id, 'single').ok, 'no era without a debuted group around it');
  afterRest(state, g);
  const chk = KP.soloEraCheck(state, star.id, 'single');
  t.ok(chk.ok, 'the proactive door is OPEN — no clamor required (' + JSON.stringify(chk.reason || '') + ')');
  t.ok(chk.cost >= KP.C.STAR.soloSingleCost, 'the single bills at least its base');
  const poor = state.budget;
  state.budget = 1;
  t.ok(!KP.soloEraCheck(state, star.id, 'single').ok, 'the budget gate holds');
  state.budget = poor;
  const r = KP.planSoloEra(state, star.id, { format: 'single' });
  t.ok(r.ok, 'the era is planned');
  t.ok(!!star.soloEra && star.soloEra.format === 'single', 'the era sits on the person');
  t.eq(star.soloEra.scheduledWeek - state.week, KP.C.STAR.soloSinglePrep, 'a single runs the short runway');
  t.ok(!KP.soloEraCheck(state, second.id, 'single').ok, 'ONE member era per group — the studio is taken');
  t.ok(!KP.planSoloEra(state, star.id, { format: 'mini' }).ok, 'and she cannot double-book herself');
  // the calendar law: her era blocks the group record and the road
  const pd = KP.planDebut(state, { groupId: g.id, songId: 'x', promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(!pd.ok && /solo era/.test(pd.reason), 'the group record waits for her drop');
  t.ok(!KP.tourEligible(state, g).ok, 'the road waits too');
}

// ---- the direction meeting: the aespa clause ----
{
  const { state, g } = debuted('era-direction');
  afterRest(state, g);
  const star = state.people[g.members[0]];
  KP.planSoloEra(state, star.id, { format: 'single' });
  t.ok(KP.sceneKinds().includes('soloDirection'), 'the meeting is a registered scene');
  const sc = (state.scenes || []).find(x => x.kind === 'soloDirection');
  t.ok(sc, 'planning opens the direction meeting');
  t.eq(star.soloEra.direction, 'company', 'the company brief is the default before anyone speaks');
  const m0 = star.morale;
  KP.resolveScene(state, sc.id, 'hers');
  t.eq(star.soloEra.direction, 'hers', 'handing over the aux cord sticks');
  t.ok(star.morale > m0, 'being heard is worth morale');
}

// ---- the landing: reception, the record, the ladder ----
{
  const { state, g } = debuted('era-landing');
  afterRest(state, g);
  const star = state.people[g.members[0]];
  KP.planSoloEra(state, star.id, { format: 'single' });
  let guard = 0;
  while (star.soloEra && guard++ < 10) KP.advanceWeek(state);
  t.ok(!star.soloEra, 'the era resolves at its week');
  const disc = star.soloDisc || [];
  t.eq(disc.length, 1, 'the standalone release is durable on the person');
  t.ok(disc[0].reception >= 1 && disc[0].reception <= 100, 'reception is a real number');
  t.eq(disc[0].format, 'single', 'and remembers its format');
  t.eq(star.lastSoloCutWeek, disc[0].week, 'the single stamps its own cooldown clock');
  t.ok((star.flags.soloShines || 0) >= 1, 'the shine marks the transcendence read');
  t.ok(((state.chart || {}).entries || []).some(e => e.act === KP.displayName(star)),
    'her name enters the scene chart alone');
  t.eq(KP.starRung(state, g, star), 2, 'the ladder reads the era: the stage ask is already answered');
  t.ok(!KP.soloEraCheck(state, star.id, 'single').ok, 'the cooldown holds after the drop');
  // the promise machinery accepts the standalone release
  state.claims = state.claims || [];
  state.claims.push({ id: 'c-test', type: 'soloPromise', personId: star.id,
    week: disc[0].week - 1, byWeek: state.week + 10, label: 'test promise' });
  KP.advanceWeek(state);
  const cl = state.claims.find(c => c.id === 'c-test');
  t.eq(cl.resolved, 'met', 'a standalone single keeps the solo promise');
}

// ---- the mini: the album ladder unchanged ----
{
  const { state, g } = debuted('era-mini');
  afterRest(state, g);
  const star = state.people[g.members[0]];
  const r = KP.planSoloEra(state, star.id, { format: 'mini' });
  t.ok(r.ok, 'the mini plans');
  t.eq(star.soloEra.scheduledWeek - state.week, KP.C.STAR.soloMiniPrep, 'the mini takes the studio longer');
  let guard = 0;
  while (star.soloEra && guard++ < 10) KP.advanceWeek(state);
  t.eq(star.soloAlbums, 1, 'the mini counts as HER album');
  t.ok(star.lastSoloAlbumWeek > 0, 'and stamps the album clock the star’s-clock ladder reads');
  t.eq(KP.starRung(state, g, star), 3, 'after the album, the next conversation is the career');
}

// ---- the era shelves when the world moves ----
{
  const { state, g } = debuted('era-shelve');
  afterRest(state, g);
  const star = state.people[g.members[0]];
  KP.planSoloEra(state, star.id, { format: 'single' });
  star.flags.personalHiatus = { since: state.week };
  KP.advanceWeek(state);
  t.ok(!star.soloEra, 'a break shelves the era instead of resolving it');
  t.ok((star.soloDisc || []).length === 0, 'no phantom release');
}

// ---- the solo project: the group-name mini, one single each ----
{
  const { state, g } = debuted('era-project');
  afterRest(state, g);
  const title = g.members[2];
  const bad = KP.planSoloProject(state, { groupId: g.id, songId: (g.demos[0] || {}).id,
    promo: 'modest', week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(!bad.ok && /whose single leads/.test(bad.reason), 'the title pick is mandatory — that choice IS the project');
  const r = KP.planSoloProject(state, { groupId: g.id, songId: g.demos[0].id,
    promo: 'modest', week: state.week + 6, titleMemberId: title,
    alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(r.ok, 'the project locks through the normal pipeline');
  t.eq(g.prep.tracks.length, g.members.length, 'one track per member — the tracklist IS the lineup');
  t.ok(g.prep.tracks.every(tr => tr.credit && tr.credit.type === 'solo'), 'every cut is a solo');
  t.eq(g.prep.tracks.find(tr => tr.n === 1).credit.memberId, title, 'the chosen member leads');
  const ids = g.prep.tracks.map(tr => tr.credit.memberId);
  t.eq(new Set(ids).size, g.members.length, 'every member gets exactly one');
  const before = g.releases.length;
  let guard = 0;
  while (g.releases.length === before && guard++ < 12) KP.advanceWeek(state);
  const rel = g.releases[g.releases.length - 1];
  t.ok(rel.soloProject && rel.soloProject.cuts.length === g.members.length,
    'the landing archives every cut with a public number');
  t.eq(rel.soloProject.titleMemberId, title, 'the title pick is on the record');
  t.ok(g.members.every(id => (state.people[id].flags.soloShines || 0) >= 1),
    'every member’s read carries the shine');
  t.ok(g.members.every(id => KP.starRung(state, g, state.people[id]) >= 2),
    'the whole room enters the ladder at rung 2 — everyone has a solo on record');
  t.ok(state.week - (g.lastSoloProjectWeek || -999) < KP.C.STAR.projectCooldown, 'the clock stamped');
  const again = KP.planSoloProject(state, { groupId: g.id, songId: 'x', titleMemberId: title, week: state.week + 8 });
  t.ok(!again.ok && /generational/.test(again.reason), 'the project does not become a cadence');
}

// ---- determinism: the era forks clean ----
{
  const { state, g } = debuted('era-fork');
  afterRest(state, g);
  const star = state.people[g.members[0]];
  KP.planSoloEra(state, star.id, { format: 'single' });
  const sc = (state.scenes || []).find(x => x.kind === 'soloDirection');
  if (sc) KP.resolveScene(state, sc.id, 'hers');
  const b = KP.deserialize(KP.serialize(state));
  for (let w = 0; w < 20; w++) { KP.advanceWeek(state); KP.advanceWeek(b); }
  t.eq(KP.serialize(state), KP.serialize(b), 'the era forks clean');
}

t.finish();
