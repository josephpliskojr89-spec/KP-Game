/* Suite 052 — the last group (v0.9.10). The intro copy was always true;
   now the game is. A new career opens with the six-year girl group the
   company's reputation was built on: four road-worn vocalists deep in
   their contracts, a declining discography, a fading but named fandom —
   and renewal folders that reach the Desk before the first debut does.
   This suite runs the REAL newGame (no legacy opt-out): it is the one
   place the battery proves the opening the player actually gets. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_052_legacy');

// ---- the opening: the last group is in the building ----
{
  const state = KP.newGame('legacy-open');
  t.eq(state.groups.length, 1, 'a new career opens with one group already on the books');
  const g = state.groups[0];
  t.ok(g.legacy === true, 'and it is marked as start content');
  t.ok(g.debuted && g.debutWeek < 0, 'they debuted years before you arrived');
  t.eq(g.members.length, 4, 'four members');
  const members = g.members.map(id => state.people[id]);
  t.ok(members.every(p => p.status === 'idol'), 'all idols, not trainees');
  t.ok(members.every(p => p.age >= 23 && p.age <= 26), 'all in their mid-twenties (' +
    members.map(p => p.age).join('/') + ') — aging, per the brief');
  t.ok(members.every(p => p.talents.vocals.cur >= 66), 'the vocal-house reputation is embodied');
  t.ok(members.every(p => p.liveExp >= 80), 'six years of stages on every file');
  t.ok(members.every(p => p.observations >= 4), 'no scouting fog on people you have employed for years');
  t.ok(g.roles && g.roles.center && g.members.includes(g.roles.center), 'the roles are set');
  t.ok(g.fandom && g.fandom.name && g.fandom.intensity > 0, 'the fandom has a name and a pulse (' + g.fandom.name + ')');
}

// ---- the roster order: trainees first, veterans behind them ----
{
  const state = KP.newGame('legacy-order');
  t.eq(state.roster.length, KP.C.GEN.inheritedCount + 4, 'roster = six trainees + four veterans');
  const statuses = state.roster.map(id => state.people[id].status);
  t.ok(statuses.slice(0, KP.C.GEN.inheritedCount).every(s => s === 'trainee'),
    'the first rows are the trainees — the fixtures that slice the roster stay honest');
  t.ok(statuses.slice(KP.C.GEN.inheritedCount).every(s => s === 'idol'), 'the veterans ride behind them');
  t.ok(KP.freeTrainees(state).length === KP.C.GEN.inheritedCount,
    'the group builder still sees exactly the six trainees');
}

// ---- the discography: a real peak, then the slide ----
{
  const state = KP.newGame('legacy-disco');
  const g = state.groups[0];
  t.eq(g.releases.length, 3, 'three records on the shelf');
  const rec = g.releases.map(r => r.reception);
  t.ok(rec[0] > rec[1] && rec[1] > rec[2], 'reception slides era over era (' + rec.join(' → ') + ')');
  t.ok(g.releases[0].isDebut && g.releases[0].chartPeak === 1, 'the debut was a #1 — the peak was real');
  t.ok(g.releases[2].chartPeak > g.releases[0].chartPeak, 'the latest peaked lower — "still sells, but aging"');
  t.ok(g.popularity >= 50, 'still selling');
  t.eq(state.firstShowWinWeek, -180, 'their trophies predate you — the first-win beat will not re-fire');
  t.ok((g.trophies.countdown || 0) < KP.C.SHOWWIN.darlingAt, 'seeded hardware sits short of the dynasty line — that story is earned on your watch or not at all');
}

// ---- the renewal clock: the folders reach the desk early ----
{
  const state = KP.newGame('legacy-renewal');
  const g = state.groups[0];
  for (let w = 0; w < 6; w++) KP.advanceWeek(state);
  const vets = g.members.map(id => state.people[id]);
  t.ok(vets.every(p => p.contract && p.contract.start === g.debutWeek),
    'the contracts run from their real debut, not from your arrival');
  t.ok(vets.every(p => KP.contractYear(state, p) >= KP.C.CONTRACT.renewalAtYears + 1),
    'year six of seven — inside the renewal window on day one');
  const tabled = vets.some(p => p.contract.renewalOpen) ||
    (state.scenes || []).some(sc => sc.kind === 'renewal') ||
    state.inbox.some(n => /renewal window/.test(n.text));
  t.ok(tabled, 'a renewal folder reached the desk within six weeks');
}

// ---- the veterans can work: a comeback is plannable immediately ----
{
  const state = KP.newGame('legacy-work');
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state), g);
  const r = KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(r.ok, 'the inherited group takes a comeback plan on week one');
  let guard = 0;
  while (g.prep && guard++ < 12) KP.advanceWeek(state);
  t.eq(g.releases.length, 4, 'and the fourth record ships');
  t.ok(g.releases[3].week > 0, 'on the player\'s clock this time');
}

// ---- the opt-out: mechanism suites run lean, on purpose ----
{
  const lean = KP.newGame('legacy-lean', null, { legacy: false });
  t.eq(lean.groups.length, 0, 'opts.legacy === false opens the old empty building');
  t.eq(lean.roster.length, KP.C.GEN.inheritedCount, 'six trainees only');
  t.ok(!lean.firstShowWinWeek, 'and no inherited trophies');
}

// ---- determinism: the inherited world forks clean ----
{
  const a = KP.newGame('legacy-fork');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 25; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the last group forks clean — inherited history is state, not dice');
}

t.finish();
