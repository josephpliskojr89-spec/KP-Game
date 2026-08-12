/* Suite 026 — the world remembers (v0.6.0).
   Narratives form at thresholds, strengthen on evidence, decay without
   it, and change how later events are read: long-awaited returns land
   warmer, pedigree cuts both ways, new vocalists get compared to the
   house's established ones BY NAME, and the fourth viral moment
   reinforces a reputation instead of surprising anyone. Deterministic
   throughout — memory never rolls dice. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_026_memory');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'MEMLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return state;
}

// ---- form, reinforce, decay, prune, cap ----
{
  const state = KP.newGame('mem-core', null, { legacy: false });
  const M = KP.C.MEMORY;
  const note = KP.recordEvidence(state, 'monsterRookies', 'group', 'g1');
  t.ok(note && /monster rookies/.test(note.text), 'formation speaks');
  const n = KP.getNarrative(state, 'monsterRookies', 'group', 'g1');
  t.eq(n.strength, M.formStrength, 'opens at forming strength');
  const again = KP.recordEvidence(state, 'monsterRookies', 'group', 'g1');
  t.ok(again === null, 'reinforcement is silent');
  t.eq(n.evidence, 2, 'evidence counted');
  t.eq(n.strength, M.formStrength + M.reinforceGain, 'evidence strengthens');
  // decay to nothing without evidence
  let weeks = 0;
  while (KP.getNarrative(state, 'monsterRookies', 'group', 'g1') && weeks++ < 300) KP.memoryWeek(state);
  t.ok(weeks > 30 && weeks < 300, 'opinions fade without evidence (' + weeks + ' weeks)');
  // cap holds
  for (let i = 0; i < KP.C.MEMORY.cap + 10; i++) KP.recordEvidence(state, 'k' + i, 'group', 'gx');
  t.ok(state.memory.length <= KP.C.MEMORY.cap, 'the world holds only so many opinions (' + state.memory.length + ')');
}

// ---- viral and breakout thresholds: luck first, reputation second ----
{
  const state = KP.newGame('mem-viral', null, { legacy: false });
  const p = state.people[state.roster[0]];
  t.ok(KP.recordViral(state, p) === null, 'one viral moment is luck');
  const note = KP.recordViral(state, p);
  // 0.9.8.2: a trainee's virality is covers and clips — she becomes the
  // one to watch; the fancam story needs stages (suite 050 proves the
  // idol path)
  t.ok(note && !/fancam/i.test(note.text), 'the second makes her a story — but not a fancam story');
  t.ok(KP.recordViral(state, p) === null, 'the third reinforces silently');
  t.eq(KP.getNarrative(state, 'oneToWatch', 'idol', p.id).evidence, 2, 'and is counted');
  t.ok(!KP.getNarrative(state, 'fancamStar', 'idol', p.id), 'fancams of what, exactly? — nothing, correctly');
  const q = state.people[state.roster[1]];
  KP.recordBreakout(state, q); KP.recordBreakout(state, q);
  t.ok(!KP.getNarrative(state, 'itGirl', 'idol', q.id), 'two breakouts is a hot streak');
  KP.recordBreakout(state, q);
  t.ok(KP.getNarrative(state, 'itGirl', 'idol', q.id), 'three is an it-girl');
}

// ---- vocal pedigree forms from standing reputation, immediately ----
{
  const state = KP.newGame('mem-pedigree', null, { legacy: false });
  t.ok(state.company.reputation.vocal >= KP.C.MEMORY.repPedigreeAt, 'fixture: HCG opens with vocal pedigree');
  KP.advanceWeek(state);
  t.ok(KP.getNarrative(state, 'vocalHouse', 'company', 'player'), 'the vocal-house narrative forms at once — six years of history walked in with you');
  t.ok(state.inbox.some(m => /never misses on vocals/.test(m.text)), 'and the trades say so');
}

// ---- dormancy: quiet is a story, and the return resolves it warmly ----
{
  const state = debuted('mem-dormant');
  const g = state.groups[0];
  g.lastReleaseWeek = state.week - KP.C.MEMORY.dormantWeeks;
  g.promoUntil = g.lastReleaseWeek + KP.C.COMEBACK.promoWeeks;   // keep the fake coherent
  KP.advanceWeek(state);
  const dorm = KP.getNarrative(state, 'dormant', 'group', g.id);
  t.ok(dorm, 'the fans started counting');
  t.ok(state.inbox.some(m => /Quiet is a story too/.test(m.text)), 'narrated on formation');
  // the long-awaited return: fork with and without the dormancy narrative
  const json = KP.serialize(state);
  const a = KP.deserialize(json);
  const b = KP.deserialize(json);
  b.memory = b.memory.filter(n => n.key !== 'dormant');
  [a, b].forEach(s => {
    const sg = s.groups[0];
    sg.demos = KP.generateDemos(s, KP.rngFor(s));
    KP.planDebut(s, { groupId: sg.id, songId: sg.demos[0].id, promo: 'modest',
      week: s.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
    sg.prep.progress = 6; s.week = sg.prep.scheduledWeek;
    KP.resolveDebut(s, KP.rngFor(s), sg);
  });
  t.eq(a.groups[0].results.reception - b.groups[0].results.reception, KP.C.MEMORY.returnBonus,
    'the long-awaited return lands exactly warmer (' + a.groups[0].results.reception + ' vs ' + b.groups[0].results.reception + ')');
  t.ok(a.groups[0].results.publicNotes.some(n => /long-awaited return/.test(n)), 'and the public says why');
  t.ok(!KP.getNarrative(a, 'dormant', 'group', a.groups[0].id), 'the comeback resolves the complaint');
}

// ---- pedigree reads the SECOND debut, comparisons by name ----
{
  const state = debuted('mem-compare');
  const first = state.groups[0];
  const priorVocal = state.people[first.roles.mainVocal];
  // build a second lineup from remaining trainees, sign as needed
  while (KP.freeTrainees(state).length < 4) {
    const pid = state.prospects[0];
    state.people[pid].status = 'trainee';
    state.people[pid].gender = 'f';   // one hall — this suite tests memory, not gender
    state.people[pid].training = { focus: [], intensity: 'standard' };
    state.roster.push(pid);
    state.prospects.shift();
  }
  const ids = KP.freeTrainees(state).slice(0, 4);
  ids.forEach(id => { state.people[id].talents.vocals.cur = 70; });   // pedigree met
  KP.proposeGroup(state, 'SECONDLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g2 = state.groups[1];
  g2.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g2.id, songId: g2.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  g2.prep.progress = 6; state.week = g2.prep.scheduledWeek;
  t.ok(KP.getNarrative(state, 'vocalHouse', 'company', 'player'), 'fixture: the pedigree narrative lives');
  const res = KP.resolveDebut(state, KP.rngFor(state), g2);
  t.ok(res.publicNotes.some(n => /who’s the vocalist/.test(n)), 'the pedigree question is asked and answered');
  t.ok(res.publicNotes.some(n => n.includes(KP.displayName(priorVocal))),
    'the new voice is measured against ' + KP.displayName(priorVocal) + ' BY NAME');
}

// ---- underperformance becomes a story ----
{
  const state = debuted('mem-under');
  const g = state.groups[0];
  g.releases[g.releases.length - 1].reception = 100;   // an impossible act to follow
  while (state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) KP.advanceWeek(state);
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (g.prep && guard++ < 12) KP.advanceWeek(state);
  t.ok(KP.getNarrative(state, 'underperformed', 'group', g.id), 'the drop-off became a narrative');
}

// ---- the words use live names ----
{
  const state = debuted('mem-names');
  const p = state.people[state.groups[0].members[0]];
  KP.recordViral(state, p); KP.recordViral(state, p);
  const nar = KP.getNarrative(state, 'fancamStar', 'idol', p.id);
  t.ok(KP.narrativeText(state, nar).includes(KP.displayName(p)), 'narrative text carries her current name');
  KP.setStageName(state, p.id, 'Vexa');
  t.ok(KP.narrativeText(state, nar).includes('Vexa'), 'a stage name change re-renders the narrative — words are live, memory is structured');
}

// ---- migration: the clippings file opens already full ----
{
  const old = debuted('mem-mig');
  const g = old.groups[0];
  g.releases[0].reception = 80;   // a sensation on the record
  const b = old.people[g.members[1]];
  b.history.push({ week: 3, text: 'Named the breakout of the debut by nearly every recap.' });
  b.history.push({ week: 9, text: 'Named the breakout of the comeback by nearly every recap.' });
  b.history.push({ week: 15, text: 'Named the breakout of the comeback by nearly every recap.' });
  delete old.memory; delete old.nextNarrativeId;
  old.version = '0.5.1';
  const json = KP.serialize(old);
  const m = KP.deserialize(json);
  t.ok(KP.getNarrative(m, 'vocalHouse', 'company', 'player'), 'company identity backfilled from reputation');
  t.ok(KP.getNarrative(m, 'monsterRookies', 'group', g.id), 'the sensation on the record became a narrative');
  t.ok(KP.getNarrative(m, 'itGirl', 'idol', b.id), 'three remembered breakouts made an it-girl');
  t.ok(m.inbox.some(x => /clippings file/.test(x.text)), 'the desk announces the file');
  const m2 = KP.deserialize(json);
  for (let w = 0; w < 8; w++) { KP.advanceWeek(m); KP.advanceWeek(m2); }
  t.eq(KP.serialize(m), KP.serialize(m2), 'the remembering world stays deterministic');
}

// ---- determinism ----
{
  const a = debuted('mem-fork');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 25; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'memory forks clean — opinions are state, not dice');
}

t.finish();
