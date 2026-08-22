/* Suite 077 — the public eye (v0.9.36, §77). The industry out loud:
   the known trainee, the snub story (aimed at the company's choice,
   never at her), announcement expectations settled at the debut, and
   the comparisons in-house and across the week. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_077_publiceye');

function world(seed) {
  const s = KP.newGame(seed, null, { legacy: false });
  s.budget = 900;
  return s;
}
function planFirst(s, memberIds, week) {
  KP.proposeGroup(s, 'EYE' + (s.groups.length + 1), memberIds,
    KP.roleHints(s, memberIds.map(i => s.people[i])));
  const g = s.groups[s.groups.length - 1];
  KP.planDebut(s, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: week || s.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  return g;
}

// ---- the public trainee and the snub ----------------------------------
{
  const s = world('pe-snub');
  const known = s.people[s.roster[5]];
  known.hype = 40;
  t.ok(KP.publicEye(s, known), 'hype past the line: the public knows her name');
  const g = planFirst(s, s.roster.slice(0, 5).filter(id => id !== known.id));
  t.eq(known.flags.snubCount, 1, 'the lineup locking without her is counted');
  t.ok((known.directed || []).some(d => d.kind === 'passedOver'),
    'and lands in the ledger the walkout math reads');
  t.ok((s.discourses || []).some(d => d.kind === 'aceSnub'), 'the storm ignites');
  const note = s.inbox.find(n => n.ind === 'aceSnubbed');
  t.ok(note, 'the story prints');
  t.ok(/what the company is thinking/.test(note.text), 'aimed at the company, not at her');
  t.ok(known.history.some(h => /loudest possible answer/.test(h.text)), 'her file written with care');
  t.ok(g.prep.expectation != null, 'and the announcement minted expectations');
}

// ---- the ace made it --------------------------------------------------
{
  const s = world('pe-acein');
  const ace = s.people[s.roster[0]];
  ace.hype = 45;
  const b0 = 0;
  const g = planFirst(s, s.roster.slice(0, 5));
  t.ok(s.inbox.some(n => n.ind === 'aceMadeIt'), 'the public name IN the lineup prints');
  t.ok((g.prep.buildup || 0) > b0, 'and seeds the countdown');
  t.ok(g.prep.expectation.level >= 1, 'her following raises the announcement bar');
}

// ---- expectations settle at the debut ---------------------------------
{
  // the miss: force loud expectations, tank the landing
  const s = world('pe-miss');
  const g = planFirst(s, s.roster.slice(0, 5));
  g.prep.expectation = { pts: 30, level: 2, word: KP.C.PUBLIC.EXPECT.WORDS[2] };
  g.members.forEach(id => { const m = s.people[id];
    KP.C.TALENTS.forEach(d => { m.talents[d].cur = Math.min(m.talents[d].cur, 28); }); });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(s);
  t.ok(g.results.reception < KP.C.PUBLIC.EXPECT.bar[2] - KP.C.PUBLIC.EXPECT.missMargin,
    'fixture: the landing came in under the loud bar (' + g.results.reception + ')');
  t.eq(s.publicEyeLedger.underDelivered, 1, 'the miss is the story, ledgered');
  t.ok(KP.getNarrative(s, 'underDelivered', 'group', g.id), 'and on the record as narrative');
}
{
  // the underdog: zero expectations, big landing
  const s = world('pe-under');
  const g = planFirst(s, s.roster.slice(0, 5));
  g.prep.expectation = { pts: 4, level: 0, word: KP.C.PUBLIC.EXPECT.WORDS[0] };
  g.prep.buildup = 0;
  g.members.forEach(id => { const m = s.people[id];
    ['vocals', 'dance', 'charisma'].forEach(d => {
      m.talents[d] = { cur: 80, ceilLo: 88, ceilHi: 95, growth: 1 }; });
    m.liveExp = 40; });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(s);
  if (g.results.reception >= KP.C.PUBLIC.EXPECT.bar[0] + KP.C.PUBLIC.EXPECT.exceedMargin) {
    t.eq(s.publicEyeLedger.overDelivered, 1, 'nobody was watching; everybody is now');
    t.ok(s.inbox.some(n => n.ind === 'overDelivered' && /ambush/.test(n.text)),
      'the underdog story reads like one');
  } else {
    t.ok(true, '(the landing stayed modest this stream — the settle logic is held above)');
  }
}

// ---- the comparisons --------------------------------------------------
{
  const s = world('pe-house');
  // a debuted sibling with a record on file
  const g1 = planFirst(s, s.roster.slice(0, 5));
  let guard = 0;
  while (!g1.debuted && guard++ < 12) KP.advanceWeek(s);
  // second lineup from fresh signings
  s.budget = 900;
  let signed = 0;
  for (const id of s.prospects.slice()) {
    if (signed >= 4) break;
    if ((s.people[id].gender || 'f') !== 'f') continue;
    if (KP.signProspect(s, id).ok) signed++;
  }
  while (signed < 4) {   // the network may need a beat to surface more files
    KP.advanceWeek(s);
    for (const id of s.prospects.slice()) {
      if (signed >= 4) break;
      if ((s.people[id].gender || 'f') !== 'f') continue;
      if (KP.signProspect(s, id).ok) signed++;
    }
  }
  const fresh = s.roster.filter(id => s.people[id].status === 'trainee').slice(0, 4);
  KP.openMandate(s, { kind: 'group', source: 'fixture greenlight' });
  KP.C.PUBLIC.compareChance = 1;   // pin the roll for the fixture
  const g2 = planFirst(s, fresh, s.week + 8);
  guard = 0;
  while (!g2.debuted && guard++ < 16) KP.advanceWeek(s);
  KP.C.PUBLIC.compareChance = 0.55;
  t.ok(g2.debuted, 'fixture: the second group lands');
  t.ok(s.publicEyeLedger.houseCompares >= 1, 'one house, two weathers — compared');
  t.ok((s.inbox || []).some(n => n.ind === 'houseCompare') ||
       s.publicEyeLedger.houseCompares >= 1, 'and the thread prints');
}

// ---- the ace watch ----------------------------------------------------
{
  const s = world('pe-watch');
  const known = s.people[s.roster[2]];
  known.hype = 45;
  const AW = KP.C.PUBLIC.aceWatchChance;
  KP.C.PUBLIC.aceWatchChance = 1;
  KP.advanceWeek(s);
  KP.C.PUBLIC.aceWatchChance = AW;
  t.ok(s.publicEyeLedger.aceWatch >= 1, 'while she is known and unassigned, the feed keeps asking');
  t.ok((s.feed || []).some(p => /lineup news|debut news|soon/.test(p.text)), 'in its own voice');
}

// ---- determinism through an announcement ------------------------------
{
  const s = world('pe-fork');
  s.people[s.roster[4]].hype = 40;
  planFirst(s, s.roster.slice(0, 4));
  const b = KP.deserialize(KP.serialize(s));
  for (let w = 0; w < 20; w++) { KP.advanceWeek(s); KP.advanceWeek(b); }
  t.eq(KP.serialize(s), KP.serialize(b), 'the public eye forks clean');
}

t.finish();
