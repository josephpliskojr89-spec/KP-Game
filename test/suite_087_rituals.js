/* Suite 087 — the rituals (v0.10.7, §80 findings 15 + 9). The monthly
   eval: the ranked showcase from perceived reads, morale on
   trajectory not position, the bottom-rank talk. The point desk:
   post-air breakdowns in words, the near-miss as fuel, one
   mobilization nudge a week. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_087_rituals');

function evalWeekOf(s) {
  const E = KP.C.EVAL;
  return Math.floor(KP.hash01([s.seed, 'evalphase'].join('|')) * E.every);
}
function toEvalWeek(s) {
  const phase = evalWeekOf(s);
  let guard = 0;
  while (s.week % KP.C.EVAL.every !== phase && guard++ < 8) KP.advanceWeek(s);
  return s;
}

// ---- the sheet: monthly, ranked, remembered ----------------------------
{
  const s = KP.newGame('rt-sheet', null, { legacy: false, door: 'fresh' });
  s.budget = 900;
  for (let i = 0; i < 9; i++) KP.advanceWeek(s);
  t.ok(s.evalLedger && s.evalLedger.sheets >= 2, 'the showcase runs monthly (' + s.evalLedger.sheets + ' sheets in 9 weeks)');
  const trainees = s.roster.map(id => s.people[id]).filter(p => p.status === 'trainee');
  t.ok(trainees.every(p => p.evalHistory && p.evalHistory.length), 'every trainee carries the sheet on the file');
  const h = trainees[0].evalHistory[0];
  t.ok(h.rank >= 1 && h.rank <= h.of && h.of === trainees.length, 'ranks are ranks, of the whole room');
  t.ok(s.inbox.some(n => n.ind === 'evalSheet'), 'and the sheet is posted where everyone reads it');
}

// ---- trajectory, not position ------------------------------------------
{
  const s = KP.newGame('rt-traj', null, { legacy: false, door: 'fresh' });
  s.budget = 900;
  KP.advanceWeek(s);
  const trainees = s.roster.map(id => s.people[id]).filter(p => p.status === 'trainee');
  const star = trainees[0], anchor = trainees[1];
  // the star climbs from the printed bottom; the anchor falls from first
  KP.C.TALENTS.forEach(d => { star.talents[d].cur = 90; star.flags['ceil_' + d] = 95; });
  KP.C.TALENTS.forEach(d => { anchor.talents[d].cur = 12; });
  star.evalHistory = [{ week: 1, rank: trainees.length, of: trainees.length }];
  anchor.evalHistory = [{ week: 1, rank: 1, of: trainees.length }];
  const mStar = star.morale, mAnchor = anchor.morale;
  toEvalWeek(s);
  t.ok(star.morale > mStar, 'climbing the sheet feels like flying (' + mStar + ' → ' + star.morale + ')');
  t.ok(anchor.morale < mAnchor, 'sliding from first feels like falling (' + mAnchor + ' → ' + anchor.morale + ')');
  t.ok(s.evalLedger.climbs >= 1 && s.evalLedger.slides >= 1, 'both directions ledgered');
}

// ---- the bottom of the sheet gets the talk -----------------------------
{
  const s = KP.newGame('rt-talk', null, { legacy: false, door: 'fresh' });
  s.budget = 900;
  KP.advanceWeek(s);
  const trainees = s.roster.map(id => s.people[id]).filter(p => p.status === 'trainee');
  const low = trainees[0];
  KP.C.TALENTS.forEach(d => { low.talents[d].cur = 10; });
  low.evalBottomStreak = KP.C.EVAL.bottomTalkAfter - 1;
  toEvalWeek(s);
  t.ok(s.evalLedger.talks >= 1, 'the after-eval talk happens');
  t.ok(low.history.some(h => /after-eval talk/.test(h.text)), 'and goes on the file, in her hearing');
}

// ---- the nudge: one push a week, promo only ----------------------------
{
  const s = KP.newGame('rt-nudge', null, { legacy: true });
  s.budget = 900;
  const g = s.groups[0];
  t.ok(!KP.pointNudge(s, g.id, 'votes').ok, 'no scoreboard, no mobilization');
  if (!g.demos) { const rng = KP.rngFor(s); g.demos = KP.generateDemos(s, rng, g); s.rngState = rng.state(); }
  KP.planDebut(s, { groupId: g.id, songId: g.demos[0].id, promo: 'standard', week: s.week + 5,
    alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!(g.lastReleaseWeek && s.week <= (g.promoUntil || 0)) && guard++ < 12) KP.advanceWeek(s);
  const b0 = s.budget;
  const r = KP.pointNudge(s, g.id, 'votes');
  t.ok(r.ok, 'promo week opens the drive');
  t.eq(b0 - s.budget, KP.C.POINTS.nudgeCost, 'the catering bill is real');
  t.ok(!KP.pointNudge(s, g.id, 'streams').ok, 'ONE push a week — the fandom is organized, not infinite');
  t.eq(s.pointLedger.nudges, 1, 'ledgered');
  // the breakdown posts when the week is lost
  guard = 0;
  while (s.week <= (g.promoUntil || 0) && guard++ < 8) KP.advanceWeek(s);
  t.ok((s.pointLedger.breakdowns || 0) >= 1, 'the post-air breakdown reads the loss in words');
  const note = s.inbox.find(n => n.ind === 'pointBreakdown');
  t.ok(note && /carried;.*didn’t come home/.test(note.text), 'words, never a formula');
  t.ok(!/[0-9]+\.[0-9]/.test(note.text.replace(/[A-Za-z’']+/g, '')), 'no component number leaks');
}

// ---- determinism -------------------------------------------------------
{
  const a = KP.newGame('rt-fork', null, { legacy: false, door: 'fresh' });
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 25; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the rituals fork clean');
}

t.finish();
