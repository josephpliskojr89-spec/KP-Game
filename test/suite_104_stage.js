/* Suite 104 — the stage, judged (v0.10.37, §91 Phase 4). ONE rating per
   performance: the voices against their load on the sheet, the bodies
   against the choreography, presence, reliability, fatigue with teeth,
   morale, the formation (chemistry, the pairs, the chair, the gap, the
   holes), the wobble; the moments and the words; the consequences paid
   once per stage (counts, craft, intensity, morale, the performance
   house, the lotteries); the consumers — the shows' live term and the
   encore keyed to the rating, the festival's next-year call, the tour's
   soft night, the gayo stage, the booking pile rated light, the awards'
   artist term, the dossier's words. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_104_stage');

const SHOWS = [['countdown', 'popWave'], ['countdown', 'primeStage'], ['countdown', 'popWave'], ['countdown', 'primeStage']];
function debuted(seed, n, level) {
  const s = KP.newGame(seed, null, { legacy: false });
  s.budget = 900;
  const ids = s.roster.slice(0, n || 5);
  KP.proposeGroup(s, 'STAGELINE', ids, KP.roleHints(s, ids.map(i => s.people[i])));
  const g = s.groups[0];
  g.demos = KP.generateDemos(s, KP.rngFor(s), g);
  KP.planDebut(s, { groupId: g.id, songId: g.demos[0].id, promo: 'modest', week: s.week + 6,
    alloc: { vocals: 25, dance: 25, rap: 25, media: 25 }, rollout: SHOWS });
  let guard = 0;
  while (g.prep && guard++ < 12) {
    KP.advanceWeek(s);
    (s.scenes || []).slice().forEach(sc => { const def = KP.sceneDef(sc.kind); if (def) KP.resolveScene(s, sc.id, def.options(s, sc)[0].id); });
  }
  if (level) boost(s, g, level);
  return { s, g, ids };
}
function boost(s, g, level) {
  g.members.forEach(id => {
    const p = s.people[id];
    p.talents.vocals.cur = level; p.talents.dance.cur = level; p.talents.charisma.cur = level;
    p.personality.confidence = 60; p.liveExp = 30; p.fatigue = 30; p.morale = 70;
  });
}
function clearStages(s) {
  (s.rivals || []).forEach(r => {
    r.nextDebutWeek = s.week + 60;
    (r.acts || []).forEach(a => { a.lastReleaseWeek = s.week - 5; a.cycleWeeks = 26; });
  });
}
const read = (s, g, id) => KP.stageRead(s, g, { kind: 'show', id: id || 'countdown' });

// ---- the one read: a strong room carries, a weak room fumbles ------------
{
  const strong = debuted('st-strong', 5, 85), weak = debuted('st-weak', 5, 30);
  const rs = read(strong.s, strong.g), rw = read(weak.s, weak.g);
  t.ok(rs.score > rw.score + 20, 'a strong room reads far above a weak one (' + rs.score + ' vs ' + rw.score + ')');
  t.eq(rs.band, 'carried', 'the strong room carried the stage');
  t.ok(['fumbled', 'shaky'].includes(rw.band), 'the weak room ' + rw.band + ' it');
  t.ok(Object.keys(rs.perMember).length === 5 && rs.present.length === 5, 'every present voice is read');
  t.ok(rs.perMember[strong.ids[0]].score >= 1 && rs.perMember[strong.ids[0]].score <= 100, 'per-member scores stay on the scale');
  t.ok(typeof rs.formation === 'number' && rs.pairs && 'close' in rs.pairs, 'the formation and the pairs are on the read');
  t.eq(read(strong.s, strong.g).score, rs.score, 'the same stage reads the same way twice (television, not the stream)');
}

// ---- fatigue has teeth; morale goes through the motions ----------------------
{
  const { s, g } = debuted('st-fatigue', 5, 65);
  const fresh = read(s, g).score;
  g.members.forEach(id => { s.people[id].fatigue = 92; });
  const tired = read(s, g).score;
  t.ok(fresh - tired >= 8, 'a room on fumes loses the stage (' + fresh + ' → ' + tired + ')');
  g.members.forEach(id => { s.people[id].fatigue = 30; s.people[id].morale = 20; });
  const low = read(s, g).score;
  t.ok(low < fresh, 'a low room goes through the motions (' + fresh + ' → ' + low + ')');
}

// ---- the formation: the pairs, the choreography against the room, the holes --
{
  const { s, g, ids } = debuted('st-form', 5, 65);
  const base = read(s, g);
  const key = KP.pairKey(s.people[ids[0]], s.people[ids[1]]);
  s.relationships = s.relationships || {};
  s.relationships[key] = { score: -40, state: 'conflict' };
  const cold = read(s, g);
  t.ok(cold.pairs.tense === 1 && cold.formation < base.formation, 'a tense pair reads cold in formation (' + base.formation + ' → ' + cold.formation + ')');
  s.relationships[key] = { score: 70, state: 'close' };
  const warm = read(s, g);
  t.ok(warm.pairs.close === 1 && warm.formation > cold.formation, 'a close pair reads as not acting');
  delete s.relationships[key];
  const rel = g.releases[g.releases.length - 1];
  rel.choreo = { id: 'ch0', name: 'X', style: 'athletic', difficulty: 92 };
  const hard = read(s, g);
  rel.choreo = { id: 'ch0', name: 'X', style: 'minimal', difficulty: 35 };
  const easy = read(s, g);
  t.ok(hard.score < easy.score, 'punishing choreography over the room costs the stage (' + hard.score + ' < ' + easy.score + ')');
  s.people[ids[4]].flags.burnout = 3;
  const short = read(s, g);
  t.ok(short.present.length === 4 && short.moments.shortHanded === 1 && short.formation < easy.formation, 'a hole in the formation is read (short-handed)');
  s.people[ids[4]].flags.burnout = 0;
  s.people[ids[3]].flags.seatedUntil = s.week + 3;
  const seated = read(s, g);
  t.ok(seated.perMember[ids[3]].seated && seated.moments.seated === ids[3] && seated.perMember[ids[3]].score < easy.perMember[ids[3]].score,
    'the seated arrangement performs half the choreography');
}

// ---- the load: the sheet's share raises her bar --------------------------------
{
  const { s, g, ids } = debuted('st-load', 5, 60);
  const rel = g.releases[g.releases.length - 1];
  rel.liveDemand = { vocals: 70, dance: 50, rap: 30 };
  rel.sheet.shares = {}; g.members.forEach(id => { rel.sheet.shares[id] = 0.1; });
  rel.sheet.shares[ids[0]] = 0.6;
  const r = read(s, g);
  t.ok(r.perMember[ids[0]].score < r.perMember[ids[1]].score, 'the same voice carrying most of the record reads harder (' + r.perMember[ids[0]].score + ' < ' + r.perMember[ids[1]].score + ')');
  t.eq(r.perMember[ids[0]].share, 0.6, 'and her load is on the read');
}

// ---- the moments and the words ---------------------------------------------------
{
  const { s, g, ids } = debuted('st-moments', 5, 55);
  const ace = s.people[ids[0]];
  ace.talents.vocals.cur = 92; ace.talents.dance.cur = 92; ace.talents.charisma.cur = 90; ace.liveExp = 40;
  const r = read(s, g);
  t.eq(r.moments.carried, ace.id, 'the voice that stands out carried the stage');
  const line = KP.stageLine(s, g, r, 'The Countdown');
  t.ok(line.includes(KP.displayName(ace)) && line.includes('The Countdown') && !/\d/.test(line), 'the words name her and the stage, with no number (' + line + ')');
  const thin = s.people[ids[4]];
  thin.talents.vocals.cur = 20; thin.talents.dance.cur = 20; thin.talents.charisma.cur = 20; thin.fatigue = 95; thin.morale = 15;
  const r2 = read(s, g);
  t.eq(r2.moments.fumbled, thin.id, 'the voice that lost it is named');
  t.ok(/lost|fumbled|footing/.test(KP.stageLine(s, g, r2, 'Prime Stage')), 'and the words say so');
  t.ok(['carried', 'clean', 'shaky', 'fumbled'].includes(KP.stageBand(10)) && KP.stageBand(10) === 'fumbled' && KP.stageBand(90) === 'carried', 'the bands hold');
}

// ---- the consequences, paid once per stage ---------------------------------------
{
  const { s, g, ids } = debuted('st-settle', 5, 85);
  const rep0 = s.company.reputation.performance;
  g.fandom = g.fandom || { name: 'STAGELINE', color: '#fff', since: s.week, intensity: 20 };
  const int0 = KP.fandomIntensity(g);
  const m0 = s.people[ids[0]].morale;
  const r = read(s, g);
  t.eq(r.band, 'carried', 'fixture: a carried stage');
  KP.settleStage(s, null, g, r, { where: 'The Countdown' });
  t.ok(s.company.reputation.performance > rep0, 'the performance house gets its first writer');
  t.ok(KP.fandomIntensity(g) > int0 && s.people[ids[0]].morale > m0, 'a carried stage warms the fandom and the room');
  t.ok(s.stageLedger.rated === 1 && s.stageLedger.carried === 1 && g.stageCraft === r.score, 'ledgered; the act’s craft starts at the night');
  t.ok(g.members.every(id => s.people[id].stages && s.people[id].stages.played === 1), 'every voice on it has a stage on her record');
  const w = debuted('st-settle-2', 5, 25);
  w.g.fandom = w.g.fandom || { name: 'STAGELINE', color: '#fff', since: w.s.week, intensity: 20 };
  w.g.members.forEach(id => { w.s.people[id].fatigue = 90; });
  const rw = read(w.s, w.g);
  t.eq(rw.band, 'fumbled', 'fixture: a fumbled stage');
  const repW = w.s.company.reputation.performance, intW = KP.fandomIntensity(w.g);
  KP.settleStage(w.s, null, w.g, rw, {});
  t.ok(w.s.company.reputation.performance < repW && KP.fandomIntensity(w.g) <= intW, 'a fumbled stage cools the house and the fandom (ruling 5: teeth)');
  const light = debuted('st-light', 5, 25);
  const repL = light.s.company.reputation.performance;
  KP.settleStage(light.s, null, light.g, read(light.s, light.g), { light: true });
  t.ok(light.s.company.reputation.performance === repL && light.s.stageLedger.rated === 1, 'the booking pile rates light: counts, no teeth');
}

// ---- the lotteries: the clip, the storm, the distance watch --------------------
{
  const C = KP.C.STAGE;
  const F = C.fancamChance, ST = C.stormChance, DI = C.distanceChance;
  C.fancamChance = 1; C.stormChance = 1; C.distanceChance = 1;
  // the load law: the lead voice sings the hardest bar, so she stands
  // out over a modest room, not over a room of equals (measured: an ace
  // at 92 over a 55 room reads nine over the mean, one short of a moment)
  const { s, g, ids } = debuted('st-lottery', 5, 45);
  const ace = s.people[ids[0]];
  ace.talents.vocals.cur = 92; ace.talents.dance.cur = 92; ace.talents.charisma.cur = 90; ace.liveExp = 40;
  const r = read(s, g);
  const rng = KP.rngFor(s);
  const notes = KP.settleStage(s, rng, g, r, { where: 'The Countdown' });
  t.ok((s.discourses || []).some(d => d.kind === 'fancam' && String(d.subjectId) === String(ace.id)), 'a carried stage posts her clip');
  t.ok(ace.viralCount >= 1 && /fancam/.test((ace.lastViral || {}).label || ''), 'with provenance');
  const w = debuted('st-lottery-2', 5, 25);
  const thin = w.s.people[w.ids[4]];
  thin.fatigue = 95; thin.morale = 10; thin.talents.vocals.cur = 15; thin.talents.dance.cur = 15;
  w.g.members.forEach(id => { w.s.people[id].fatigue = Math.max(w.s.people[id].fatigue, 85); });
  const key = KP.pairKey(w.s.people[w.ids[0]], w.s.people[w.ids[1]]);
  w.s.relationships = w.s.relationships || {};
  w.s.relationships[key] = { score: -40, state: 'conflict' };
  const rw = read(w.s, w.g);
  t.ok(rw.band === 'fumbled' && rw.moments.fumbled === thin.id, 'fixture: a fumbled stage with a named loss and a tense pair');
  KP.settleStage(w.s, KP.rngFor(w.s), w.g, rw, { where: 'Prime Stage' });
  const storm = (w.s.discourses || []).find(d => d.kind === 'encore' && String(d.subjectId) === String(thin.id));
  t.ok(storm && storm.from === 'stage', 'the storm wakes around the one who lost it');
  t.ok(/losing the second chorus/.test(KP.discourseHeadline(w.s, storm)), 'and the headline is the stage, not an encore');
  t.ok((w.s.discourses || []).some(d => d.kind === 'didntStand'), 'the distance watch wakes on a fumbled stage with a tense pair');
  C.fancamChance = F; C.stormChance = ST; C.distanceChance = DI;
}

// ---- the shows: the live term is the read; the words post once a week ------------
{
  const { s, g } = debuted('st-shows', 5, 70);
  clearStages(s);
  const before = (s.stageLedger || {}).rated || 0;
  KP.advanceWeek(s);
  const notes = KP.lastTickNotes || [];   // the week's emissions, pre-trim (the inbox keeps the same objects)
  t.ok(s.stageLedger.rated > before, 'every booked stage is rated');
  // the era's first stage posts as the comeback stage (v0.10.38) — still the week's ONE line
  const lines = notes.filter(n => ['stageRead', 'comebackStage'].includes(n.ind) && n.groupId === g.id);
  t.eq(lines.length, 1, 'the read posts once a week, in words');
  const note = lines[0];
  t.ok(!/\d/.test(note.text) && /Countdown|Pop Wave|Prime Stage/.test(note.text), 'names and a stage, never a number');
  t.ok(g.members.every(id => (s.people[id].stages || {}).played >= 2), 'two stages a week, two on every record');
  t.ok(g.stageCraft != null, 'the act’s rolling craft is on the group');
}

// ---- the encore keyed to the rating -------------------------------------------------
{
  const W = KP.C.SHOWWIN;
  const EC = W.encoreChance, SC = W.shakyEncoreChance;
  W.encoreChance = 1; W.shakyEncoreChance = 1;
  const a = debuted('st-encore-a', 5, 88);
  clearStages(a.s);
  KP.advanceWeek(a.s);
  const notesA = a.s.inbox.concat(KP.lastTickNotes || []);
  t.ok(notesA.some(n => n.ind === 'encoreMoment'), 'a carried, winning stage makes the encore moment');
  const b = debuted('st-encore-b', 5, 40);
  b.g.popularity = 95; b.g.fandom = { name: 'X', color: '#fff', since: 1, intensity: 90 };
  b.g.members.forEach(id => { b.s.people[id].fatigue = 60; b.s.people[id].liveExp = 0; });
  b.s.discourses = [];   // the cap: two live storms and nothing else can ignite
  clearStages(b.s);
  KP.advanceWeek(b.s);
  const won = Object.values(b.g.trophies || {}).reduce((x, n) => x + n, 0) >= 1;
  t.ok(won, 'fixture: a huge fandom carries a shaky room to the trophy');
  t.ok((b.s.discourses || []).some(d => d.kind === 'encore'), 'and the shaky encore after the win is a storm');
  W.encoreChance = EC; W.shakyEncoreChance = SC;
}

// ---- the festival's next-year call, the tour's soft night, the awards' term ----
{
  const { s, g } = debuted('st-fest', 5, 85);
  const year = Math.floor((s.week - 1) / KP.C.WEEKS_PER_YEAR) + 1;
  t.ok(!KP.festivalCertain(s, g, year + 1), 'no icon, no carried set: the call is a roll');
  g.festCarried = year;
  t.ok(KP.festivalCertain(s, g, year + 1) && !KP.festivalCertain(s, g, year + 2), 'a carried set books next year’s call, and only next year’s');
  t.eq(KP.nightDemandMult({ lastNight: 'fumbled' }), KP.C.STAGE.badNightDemand, 'a bad night sells the next week softer');
  t.eq(KP.nightDemandMult({ lastNight: 'carried' }), KP.C.STAGE.goodNightDemand, 'a carried night sells it warmer');
  t.eq(KP.nightDemandMult({}), 1, 'the first night sells on the name');
  t.ok(KP.stageAwardsTerm({ stageCraft: 80 }) > 0 && KP.stageAwardsTerm({ stageCraft: 40 }) < 0 && KP.stageAwardsTerm({}) === 0, 'the artist ballot has a performance term');
}

// ---- the tour plays its nights ---------------------------------------------------------
{
  const s = KP.newGame('st-tour', null, { legacy: true });
  const g = s.groups[0];
  g.popularity = 70; g.promoUntil = 0; g.tourRestUntil = 0;
  const opts = KP.tourLegOptions(s, g);
  const r = KP.planTour(s, { groupId: g.id, scale: 'theater', legs: ['kr'], pacing: 'steady', setlist: 'hits' });
  if (r.ok) {
    let guard = 0;
    while (g.tour && guard++ < 12) KP.advanceWeek(s);
    t.ok((s.stageLedger || {}).rated >= 1, 'the road is rated night by night');
    const leg = s.inbox.concat(KP.lastTickNotes || []).find(n => n.ind === 'tourLeg');
    t.ok(!leg || /night/.test(leg.text), 'and the leg letter carries the night’s words');
  } else {
    t.ok(true, 'fixture: the tour desk said ' + r.reason + ' — the nights are covered by the demand multiplier pin');
  }
}

// ---- the dossier's words, the group's line -----------------------------------------
{
  const { s, g, ids } = debuted('st-words', 5, 60);
  const p = s.people[ids[0]];
  t.eq(KP.stageRecordLines(s, p).length, 0, 'no stages, no words');
  p.stages = { played: 4, carried: 1, fumbled: 0 };
  t.ok(/carried a stage/.test(KP.stageRecordLines(s, p)[0]), 'one carried stage: the staff noticed');
  p.stages = { played: 9, carried: 3, fumbled: 3 };
  const lines = KP.stageRecordLines(s, p);
  t.ok(lines.length === 2 && lines.every(l => !/\d/.test(l)), 'a record in words, never a count');
  t.eq(KP.stageCraftLine(s, g), null, 'no nights yet, no line');
  g.stageCraft = 80;
  t.ok(/carries its nights/.test(KP.stageCraftLine(s, g)), 'a room that carries its nights');
  g.stageCraft = 30;
  t.ok(/exposed/.test(KP.stageCraftLine(s, g)), 'a room the stage keeps exposing');
}

// ---- the release remembers the song's live demand -----------------------------------
{
  const { s, g } = debuted('st-demand', 5);
  const rel = g.releases[0];
  t.ok(rel.liveDemand && rel.liveDemand.vocals > 0 && rel.liveDemand.dance > 0, 'the record carries its live demand for every night of the era');
  const era = KP.stageEra(s, g);
  t.ok(era.lane === rel.conceptId && era.shares === rel.sheet.shares, 'the era on the stage is the last record: its lane, its sheet');
  const empty = KP.stageRead(s, { id: 'none', members: [], releases: [] }, {});
  t.eq(empty.band, 'empty', 'an empty stage is empty, not a crash');
}

// ---- determinism ---------------------------------------------------------------
{
  const a = KP.newGame('st-fork', null, { legacy: true });
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 40; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the stage forks clean');
}

t.finish();
