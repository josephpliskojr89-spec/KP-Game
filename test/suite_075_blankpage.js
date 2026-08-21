/* Suite 075 — the blank page (v0.9.34, §74 second half). The fourth
   door: name your own company, empty rooms, no reputation. Hard mode
   = the founding at week one, without the fame — the founder's board
   is the pressure layer and the holdout is the wall. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_075_blankpage');

// ---- the door: what you get, and what you pointedly do not ------------
{
  const s = KP.newGame('bp-door', null, { door: 'blank', companyName: 'Glasshouse Records' });
  t.eq(s.door, 'blank', 'the fourth door stamps');
  t.eq(s.company.name, 'Glasshouse Records', 'the name on the door is YOURS');
  t.eq(s.roster.length, 0, 'the practice rooms are empty');
  // the network (v0.9.35): the board opens EMPTY here — the talent all
  // exists, but the blank page has to choose who it uncovers
  t.eq(s.prospects.length, 0, 'and so is the board — nothing but the verbs');
  t.eq(s.budget, KP.C.BLANK.warChest, 'a seed round, not a budget');
  t.eq(s.signingsAllowed, KP.C.BLANK.signings, 'the founder’s allowance');
  t.ok(Object.values(s.company.reputation).every(v => v === KP.C.BLANK.rep),
    'Unproven label, every lane');
  t.ok(s.founded && s.founded.warChest === KP.C.BLANK.warChest,
    'founded from week zero — you named it, you own it');
  t.ok(!s.groups.length, 'no legacy group ever existed here');
  t.ok(s.inbox.some(n => /blank page/.test(n.text)), 'the door tells its own truth');
  t.ok(s.inbox.some(n => /patience is finite/.test(n.text)), 'and the money says its line');
  // 0.9.35.1 (owner screenshot): the feed opener knows the door too —
  // no six-years backstory on a label registered last month
  t.ok(!s.feed.some(p => /six years/.test(p.text)), 'the feed carries no inherited history');
  t.ok(s.feed.some(p => /one-room label/.test(p.text)), 'it carries the blank page own story');
}

// ---- the board seats itself, week one ---------------------------------
{
  const s = KP.newGame('bp-board', null, { door: 'blank' });
  KP.advanceWeek(s);
  t.ok(s.board && s.board.seats.length === 3, 'three seats, week one');
  t.ok(s.inbox.some(n => /war chest came with names/.test(n.text)), 'introduced by name');
  // the runway memo is live from the start
  s.budget = Math.floor(KP.C.BLANK.warChest * 0.2);
  KP.advanceWeek(s);
  t.ok(s.board.burnNoted, 'the lead investor reads the chart');
}

// ---- the founder cannot be succeeded; the imperial house never calls --
{
  const s = KP.newGame('bp-noexec', null, { door: 'blank' });
  for (let w = 0; w < 6; w++) KP.advanceWeek(s);
  s.executive.since = -600;
  s.trust = 90;
  for (let w = 0; w < 10; w++) KP.advanceWeek(s);
  t.ok(!s.execGen, 'no succession — the board is the pressure layer');
  t.ok(!(s.scenes || []).some(sc => sc.kind === 'theOffer'),
    'and theOffer never courts a founder');
}

// ---- the holdout is the wall ------------------------------------------
{
  const s = KP.newGame('bp-wall', null, { door: 'blank' });
  s.budget = 600;
  // the network (v0.9.35): the blank board opens EMPTY — the wall test
  // earns its file the way the door does, through an open call
  KP.holdOpenCall(s);
  let p = null;
  for (const id of s.prospects) {
    const c = s.people[id];
    if (KP.hash01([s.seed, c.id, 'grateful'].join('|')) >= KP.C.HOLDOUT.gratefulShare) { p = c; break; }
  }
  if (!p) p = s.people[s.prospects[0]];
  p.talents.dance = { cur: 70, ceilLo: 82, ceilHi: 90, growth: 1 };
  s.rivals[0].interest[p.id] = 2;
  t.eq(KP.holdoutBar(s, p), null, 'rep 25 on every lane: the sought-after will not take your calls');
  const r = KP.signProspect(s, p.id);
  t.ok(!r.ok && r.holdout, 'hard mode has a face and a voice');
}

// ---- hard, not impossible: the door is playable ------------------------
{
  const s = KP.newGame('bp-play', null, { door: 'blank' });
  // the real door loop now: verbs + the trickle, then sign the class
  let signed = 0;
  let vguard = 0;
  while (signed < 5 && vguard++ < 60) {
    if (!KP.holdOpenCall(s).ok) KP.streetCast(s);
    for (const id of s.prospects.slice()) {
      if (signed >= 5) break;
      if ((s.people[id].gender || 'f') !== 'f') continue;   // the directive is a girl group
      if (KP.signProspect(s, id).ok) signed++;
    }
    if (signed < 5) KP.advanceWeek(s);
  }
  t.ok(signed >= 4, 'a founding class can be signed from the overlooked');
  const ids = s.roster.slice(0, Math.min(5, signed));
  KP.proposeGroup(s, 'FIRSTPAGE', ids, KP.roleHints(s, ids.map(i => s.people[i])));
  const g = s.groups[0];
  KP.planDebut(s, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: s.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 14) KP.advanceWeek(s);
  t.ok(g.debuted, 'and the first debut is reachable on the seed round');
  t.ok(s.budget > -50, 'without cratering the books (' + Math.round(s.budget) + ')');
}

// ---- the default name, and the other doors unharmed -------------------
{
  const d = KP.newGame('bp-name', null, { door: 'blank' });
  t.eq(d.company.name, 'Paper Label', 'an unnamed page gets a modest default');
  const cur = KP.newGame('bp-cur', null, {});
  t.eq(cur.roster.length, 10, 'the inheritance still inherits');
  t.ok(!cur.founded, 'and answers to an executive, not a board');
  const fresh = KP.newGame('bp-fresh', null, { door: 'fresh' });
  t.eq(fresh.roster.length, 6, 'the fresh label keeps its founding class of six');
}

// ---- determinism -------------------------------------------------------
{
  const s = KP.newGame('bp-fork', null, { door: 'blank', companyName: 'Fork House' });
  const b = KP.deserialize(KP.serialize(s));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(s); KP.advanceWeek(b); }
  t.eq(KP.serialize(s), KP.serialize(b), 'the blank page forks clean');
}

t.finish();
