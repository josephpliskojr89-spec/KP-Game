/* Suite 067 — the star's clock (v0.9.25). Owner: "one solo stage
   shouldn't be enough, forever." The clamor re-arms one rung bigger:
   stage → ALBUM (fans campaigning, her tracklist on the desk) →
   CAREER (the fork: launch, or hold and start the lawyer clock) —
   plus chapter two for the group, and the return run. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_067_starclock');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  state.budget = 800;
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'ORBITAL', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  const star = state.people[g.members[0]];
  return { state, g, star };
}

// ---- the re-arm: a settled clamor comes back one rung bigger ----------
{
  const { state, g, star } = debuted('sc-ladder');
  const ST = KP.C.STAR;
  // a settled rung-1 clamor, aged past the quiet year, star still pulling
  g.gravity = { personId: star.id, since: state.week - ST.reclamorWeeks - 10,
    stage: 3, settled: 'solo', settledWeek: state.week - ST.reclamorWeeks - 1, rung: 1 };
  // album-tier dominance on purpose: with v0.9.27's entry rung, a star
  // who TOWERS over the room would skip straight to the career fork —
  // this block tests the one-rung climb, so keep the ratio near 2×
  const read = () => {
    star.social = 900000; star.morale = 70;
    g.members.forEach(id => { if (id !== star.id) state.people[id].social = 400000; });
  };
  read();
  // make her read as transcendent whatever the fixture math says
  const realRead = KP.transcendRead;
  KP.transcendRead = () => KP.C.GRAVITY.transcendAt + 10;
  KP.advanceWeek(state);
  t.ok(g.gravity && !g.gravity.settled && g.gravity.rung === 2,
    'the conversation returns — and it is about the ALBUM now');
  t.ok((state.gravityLedger || {}).reclamors >= 1, 'ledgered');
  // ride to the split: the fans campaign for the album, not a stage
  let guard = 0;
  while (!(state.discourses || []).some(d => d.kind === 'albumClamor') && guard++ < 30) {
    // keep the discourse cap clear — the campaign needs a live slot
    KP.liveDiscourses(state).forEach(d => {
      if (d.kind !== 'albumClamor' && !d.responded) {
        KP.respondDiscourse(state, d.id, KP.C.DISCOURSE.KINDS[d.kind].actions[0]);
      }
    });
    KP.advanceWeek(state);
  }
  t.ok((state.discourses || []).some(d => d.kind === 'albumClamor'),
    'the fandom is CAMPAIGNING for the album');
  // the knock at rung 2: the promise is the album
  guard = 0;
  while (!(state.scenes || []).some(sc => sc.kind === 'soloKnock') && guard++ < 30) {
    KP.advanceWeek(state);
  }
  const knock = (state.scenes || []).find(sc => sc.kind === 'soloKnock');
  t.ok(knock, 'she knocks again — with a tracklist this time');
  t.ok(/tracklist/.test(KP.sceneDef('soloKnock').body(state, knock)), 'the body knows the rung');
  KP.resolveScene(state, knock.id, 'promise');
  t.ok((state.claims || []).some(c => !c.resolved && c.type === 'soloAlbumPromise' && c.personId === star.id),
    'the album is on the record');
  // keep the promise: produce the record
  state.budget = 600;
  const r = KP.releaseSoloAlbum(state, star.id);
  t.ok(r.ok, 'the album exists');
  t.ok(star.soloAlbums === 1 && star.lastSoloAlbumWeek === state.week, 'stamped durable');
  t.ok((state.gravityLedger || {}).albums >= 1, 'ledgered');
  KP.advanceWeek(state);
  t.ok(g.gravity.settled === 'solo', 'the album settles rung 2');
  t.ok(!(state.claims || []).some(c => !c.resolved && c.type === 'soloAlbumPromise'),
    'and the promise resolves kept');
  // rung 3: the career fork — no promise on the menu
  g.gravity.settledWeek = state.week - ST.reclamorWeeks - 1;
  KP.advanceWeek(state);
  t.eq(g.gravity.rung, 3, 'the third conversation arrives');
  guard = 0;
  while (!(state.scenes || []).some(sc => sc.kind === 'soloKnock') && guard++ < 30) KP.advanceWeek(state);
  const fork = (state.scenes || []).find(sc => sc.kind === 'soloKnock');
  t.ok(fork, 'the fork reaches the desk');
  const opts = KP.sceneDef('soloKnock').options(state, fork);
  t.ok(!opts.some(o => o.id === 'promise'), 'no promises at the career rung');
  KP.resolveScene(state, fork.id, 'open');
  KP.transcendRead = realRead;
  const solo = state.groups.find(s => s.type === 'solo' && s.members.includes(star.id));
  t.ok(solo && solo.originGroupId === g.id, 'launched — same house, the door remembers home');
  t.ok(!g.members.includes(star.id), 'the lineup is chapter two now');
  t.ok(g.newEra, 'and the group knows it');
  t.ok((state.gravityLedger || {}).careers >= 1, 'the career is ledgered');
}

// ---- holding at the fork cuts deep ------------------------------------
{
  const { state, g, star } = debuted('sc-hold');
  g.gravity = { personId: star.id, since: state.week - 30, stage: 3, settled: null, rung: 3 };
  KP.openScene(state, { kind: 'soloKnock', personId: star.id, groupId: g.id,
    expiresWeek: state.week + 3 });
  const morale0 = star.morale;
  KP.resolveScene(state, (state.scenes || []).find(sc => sc.kind === 'soloKnock').id, 'group');
  t.ok(star.morale < morale0, 'the no lands hard');
  t.ok((star.directed || []).some(d => d.kind === 'heldToPaper'),
    'and the grudge ledger gets the entry the walkout machinery reads');
}

// ---- the return run: the door swings both ways ------------------------
{
  const { state, g, star } = debuted('sc-return');
  // she graduated a while back; the group plans a comeback
  KP.graduateToSolo(state, star.id);
  const solo = state.groups.find(s => s.type === 'solo' && s.members.includes(star.id));
  t.ok(solo && solo.originGroupId === g.id, 'fixture: the alum next door');
  delete g.newEra;   // isolate the return-run path
  let guard = 0;
  while ((g.prep || state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) && guard++ < 30) {
    KP.advanceWeek(state);
  }
  state.budget = Math.max(state.budget, 500);
  if (!g.demos) { const rng = KP.rngFor(state); g.demos = KP.generateDemos(state, rng, g); state.rngState = rng.state(); }
  const r = KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(r.ok !== false, 'fixture: the comeback locks');
  const sc = (state.scenes || []).find(x => x.kind === 'returnRun');
  t.ok(sc && sc.personId === star.id, 'the obvious question is on the Desk within the hour');
  const buildup0 = g.prep.buildup || 0;
  KP.resolveScene(state, sc.id, 'invite');
  t.eq(g.prep.returnRun, star.id, 'she is IN for the era');
  t.ok((g.prep.buildup || 0) >= buildup0 + KP.C.STAR.returnRunBuildup, 'and the countdown gets LOUD');
  t.ok((state.gravityLedger || {}).returnRuns >= 1, 'ledgered');
  guard = 0;
  while (g.prep && guard++ < 12) KP.advanceWeek(state);
  const rel = g.releases[g.releases.length - 1];
  t.eq(rel.returnRun, star.id, 'the alum is on the sleeve, permanently');
  t.ok(star.history.some(h => /return run/.test(h.text)), 'and in her story');
  t.ok(state.inbox.some(n => n.ind === 'returnRunSet' && /LANDED/.test(n.text)), 'the era landed loud');
}


// ---- the entry rung (v0.9.27): the ladder reads the record ------------
{
  const { state, g, star } = debuted('sc-entry');
  // a prior album on her record: the conversation opens at the career
  star.soloAlbums = 1;
  t.eq(KP.starRung(state, g, star), 3, 'a prior album skips to the career');
  star.soloAlbums = 0;
  // dominance: she more than doubles the room's median following
  g.members.forEach(id => { state.people[id].social = 40000; });
  star.social = 100000;
  t.eq(KP.starRung(state, g, star), 2, 'doubling the room enters at the album');
  star.social = 200000;
  t.eq(KP.starRung(state, g, star), 2, 'even towering dominance enters at the album — the career entrance requires an album on the record');
  star.social = 45000;
  t.eq(KP.starRung(state, g, star), 1, 'a first among equals starts at the stage');
}

// ---- the proactive launch: the door opened first -----------------------
{
  const { state, g, star } = debuted('sc-launch');
  let guard = 0;
  while ((g.prep || state.week <= (g.promoUntil || 0)) && guard++ < 20) KP.advanceWeek(state);
  const r = KP.launchSoloCareer(state, star.id);
  t.ok(r.ok, 'the launch runs');
  t.ok(!g.members.includes(star.id), 'she has her own calendar now');
  t.ok(state.groups.some(s2 => s2.type === 'solo' && s2.originGroupId === g.id), 'next door, not gone');
  t.ok(g.newEra, 'the group opens chapter two');
  t.ok((star.directed || []).some(d => d.kind === 'openedTheDoor'), 'and she remembers WHO opened the door');
  t.ok((state.gravityLedger || {}).careers >= 1, 'ledgered');
}

// ---- determinism ------------------------------------------------------
{
  const { state } = debuted('sc-fork2');
  const b = KP.deserialize(KP.serialize(state));
  for (let w = 0; w < 60; w++) { KP.advanceWeek(state); KP.advanceWeek(b); }
  t.eq(KP.serialize(state), KP.serialize(b), 'ladders, albums, and return runs fork clean');
}

t.finish();
