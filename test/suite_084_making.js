/* Suite 084 — the making (v0.10.4, §80 findings 5+12). The production
   pipeline: stations on the runway, the line card the fandom audits,
   the named choreographer whose difficulty the stage pays for, the MV
   clip lottery, and slippage as a decision — postpone or crunch, never
   silent. The medical desk: the diagnosis scene's three doors, the
   chronic file, the flare, and push-through judged forever. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_084_making');

function debutWorld(seed, weeks) {
  const s = KP.newGame(seed, null, { legacy: false });
  s.budget = 900;
  const ids = s.roster.slice(0, 5);
  KP.proposeGroup(s, 'MAKELINE', ids, KP.roleHints(s, ids.map(i => s.people[i])));
  const g = s.groups[0];
  g.demos = KP.generateDemos(s, KP.rngFor(s), g);
  KP.planDebut(s, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: s.week + (weeks || 8), alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  return { s, g };
}

// ---- the board: stations scheduled, resolved, stamped ------------------
{
  const { s, g } = debutWorld('mk-board');
  KP.advanceWeek(s);
  t.ok(g.prep.stations && g.prep.stations.length === 4, 'the runway auto-schedules four stations');
  const order = g.prep.stations.map(st => st.id).join(',');
  t.eq(order, 'recording,choreo,mv,jacket', 'in production order');
  t.ok(g.prep.stations.every(st => st.week < g.prep.scheduledWeek), 'all before the date');
  let sawLine = false, guard = 0;
  while (g.prep && guard++ < 12) {
    KP.advanceWeek(s);
    const sc = (s.scenes || []).find(x => x.kind === 'lineCard');
    if (sc) { sawLine = true; KP.resolveScene(s, sc.id, 'center'); }
  }
  t.ok(sawLine, 'recording week slides the line sheet across the desk');
  t.eq(s.pipeLedger.stationsRun, 4, 'every station ran');
  const rel = g.releases[0];
  t.ok(rel.choreo && rel.choreo.name, 'the choreographer has a NAME on the record (' + (rel.choreo && rel.choreo.name) + ')');
  t.eq(rel.lineCard, 'center', 'and the line card is archived with the release');
  t.ok(s.inbox.concat([]).length >= 0 && s.pipeLedger.lineCards === 1, 'ledgered');
}

// ---- the line card: three doors, priced --------------------------------
{
  const mk = (seed, opt) => {
    const { s, g } = debutWorld(seed);
    let sc = null, guard = 0;
    while (!sc && guard++ < 10) {
      KP.advanceWeek(s);
      sc = (s.scenes || []).find(x => x.kind === 'lineCard');
    }
    const members = g.members.map(id => s.people[id]);
    const before = members.map(m => ({ id: m.id, morale: m.morale, hype: m.hype || 0 }));
    KP.resolveScene(s, sc.id, opt);
    return { s, g, members, before };
  };
  const sp = mk('mk-spread', 'spread');
  t.ok(sp.members.every((m, i) => m.morale >= sp.before[i].morale), 'every voice on the record warms the room');
  const ce = mk('mk-center', 'center');
  const ace = ce.s.people[ce.g.roles.center] || ce.members[0];
  const aceBefore = ce.before.find(b => b.id === ace.id);
  t.ok((ace.hype || 0) > aceBefore.hype, 'front-loading the ace buys her shine');
}
{
  // the audit: a center-cut card gets litigated at release
  const { s, g } = debutWorld('mk-linewar');
  const LW = KP.C.PIPE.lineWarChance;
  KP.C.PIPE.lineWarChance = 1;
  let guard = 0;
  while (g.prep && guard++ < 12) {
    KP.advanceWeek(s);
    const sc = (s.scenes || []).find(x => x.kind === 'lineCard');
    if (sc) KP.resolveScene(s, sc.id, 'center');
  }
  KP.advanceWeek(s);   // the audit reads the fresh record on the next tick
  KP.C.PIPE.lineWarChance = LW;
  t.ok((s.discourses || []).some(d => d.kind === 'lineShare'), 'the stopwatch thread organizes');
  t.eq(s.pipeLedger.lineWars, 1, 'ledgered');
}

// ---- the clip lottery --------------------------------------------------
{
  const { s, g } = debutWorld('mk-clip');
  const CC = KP.C.PIPE.mvClipChance;
  KP.C.PIPE.mvClipChance = 1;
  let guard = 0;
  while (g.prep && !(s.pipeLedger || {}).clips && guard++ < 12) {
    KP.advanceWeek(s);
    const sc = (s.scenes || []).find(x => x.kind === 'lineCard');
    if (sc) KP.resolveScene(s, sc.id, 'trust');
  }
  KP.C.PIPE.mvClipChance = CC;
  t.eq(s.pipeLedger.clips, 1, 'the on-set clip escapes — a trailer nobody paid for');
  t.ok(s.inbox.some(n => n.ind === 'onSetClip') ||
       (g.prep ? g.prep.campaign.momentum > 0 : true), 'and it warms the era');
}

// ---- the slip: postpone or crunch, never silent ------------------------
{
  const mk = (seed) => {
    const { s, g } = debutWorld(seed);
    KP.advanceWeek(s);
    const lead = g.members.map(id => s.people[id])
      .sort((a, b) => b.talents.vocals.cur - a.talents.vocals.cur)[0];
    let guard = 0;
    while (g.prep && !(s.scenes || []).some(x => x.kind === 'theSlip') && guard++ < 10) {
      lead.fatigue = 95;
      KP.advanceWeek(s);
    }
    return { s, g, sc: (s.scenes || []).find(x => x.kind === 'theSlip') };
  };
  const a = mk('mk-slip-a');
  t.ok(a.sc, 'a slip inside the final stretch is a DECISION, not a footnote');
  t.ok(a.s.pipeLedger.recSlips >= 1, 'the booth waited for the voice, on the record');
  const dateBefore = a.g.prep.scheduledWeek;
  KP.resolveScene(a.s, a.sc.id, 'postpone');
  t.eq(a.g.prep.scheduledWeek, dateBefore + KP.C.PIPE.postponeWeeks, 'postponing moves the date, publicly');
  t.ok(a.s.inbox.some(n => n.ind === 'postponed'), 'in the flat font companies use for bad news');
  const b = mk('mk-slip-b');
  t.ok(b.sc, 'fixture: the other world slips too');
  const fat0 = b.g.members.map(id => b.s.people[id]).reduce((x, m) => x + m.fatigue, 0);
  KP.resolveScene(b.s, b.sc.id, 'crunch');
  const fat1 = b.g.members.map(id => b.s.people[id]).reduce((x, m) => x + m.fatigue, 0);
  t.ok(fat1 > fat0, 'crunch holds the date and the room pays in hours');
  t.ok(b.g.prep.crunchUntil >= b.s.week, 'and the medical desk is watching the window');
}

// ---- the stage bill: reach priced against grasp ------------------------
{
  const { s, g } = debutWorld('mk-bill', 5);
  // roll to the release week with the pipeline quiet, then fork the
  // world and hand the two copies different choreography
  let guard = 0;
  while (g.prep && g.prep.scheduledWeek - s.week > 1 && guard++ < 10) {
    KP.advanceWeek(s);
    const sc = (s.scenes || []).find(x => x.kind === 'lineCard');
    if (sc) KP.resolveScene(s, sc.id, 'trust');
  }
  g.members.map(id => s.people[id]).forEach(m => { m.talents.dance.cur = 40; });
  const easy = KP.deserialize(KP.serialize(s));
  const hard = KP.deserialize(KP.serialize(s));
  easy.groups[0].prep.choreo = { id: 'ch0', name: 'X', style: 'minimal', difficulty: 40 };
  hard.groups[0].prep.choreo = { id: 'ch0', name: 'X', style: 'athletic', difficulty: 90 };
  while (easy.groups[0].prep) KP.advanceWeek(easy);
  while (hard.groups[0].prep) KP.advanceWeek(hard);
  t.ok(hard.groups[0].releases[0].reception < easy.groups[0].releases[0].reception,
    'punishing choreography a weak room cannot carry costs the stage (' +
    hard.groups[0].releases[0].reception + ' < ' + easy.groups[0].releases[0].reception + ')');
}

// ---- the medical desk: the diagnosis and its three doors ---------------
function medWorld(seed) {
  const s = KP.newGame(seed, null, { legacy: true });
  const M = KP.C.MEDICAL;
  const B = M.base;
  M.base = 5;
  KP.advanceWeek(s);
  M.base = B;
  return { s, sc: (s.scenes || []).find(x => x.kind === 'theDiagnosis') };
}
{
  const { s, sc } = medWorld('mk-med-rest');
  t.ok(sc && sc.site, 'the report names a shape, never more (' + (sc && sc.site) + ')');
  KP.resolveScene(s, sc.id, 'rest');
  const p = s.people[sc.personId];
  t.ok(p.flags.burnout > 0 && KP.onBreak(p), 'full rest benches the schedule with a real end date');
  t.ok((p.directed || []).some(d => d.kind === 'protectedHealth' && d.w > 0), 'and the ledger she reads says protected');
  t.eq(s.medLedger.rested, 1, 'ledgered');
}
{
  const { s, sc } = medWorld('mk-med-seat');
  KP.resolveScene(s, sc.id, 'seated');
  const p = s.people[sc.personId];
  t.ok(p.flags.seatedUntil > s.week, 'the seated arrangement keeps the schedule and shows the chair');
  t.ok(s.inbox.some(n => n.ind === 'seatedNotice'), 'the most photographed chair in the industry');
  // the clock runs out quietly
  p.flags.seatedUntil = s.week;
  KP.advanceWeek(s);
  t.ok(!p.flags.seatedUntil, 'and ends on its clock');
}
{
  const { s, sc } = medWorld('mk-med-push');
  const M = KP.C.MEDICAL;
  const PC = M.pushChronicChance;
  M.pushChronicChance = 1;
  KP.resolveScene(s, sc.id, 'push');
  M.pushChronicChance = PC;
  const p = s.people[sc.personId];
  t.ok((p.directed || []).some(d => d.kind === 'pushedThrough' && d.w < 0), 'push-through goes in the ledger, negative');
  t.eq(p.medical.chronic.length, 1, 'and the body opens a file');
  t.ok(p.flags.injuryWatch > s.week, 'the watch window prices the next weeks');
  // the second push names it
  const B = M.base;
  M.base = 5;
  let guard = 0;
  while (p.medPushes < KP.C.MEDICAL.playedHurtAt && guard++ < 40) {
    const open = (s.scenes || []).find(x => x.kind === 'theDiagnosis');
    if (open) KP.resolveScene(s, open.id, open.personId === p.id ? 'push' : 'rest');
    KP.advanceWeek(s);
  }
  M.base = B;
  t.ok(KP.getNarrative(s, 'playedHurt', 'idol', p.id), 'the world names what the schedule kept choosing');
}
{
  // the chronic file flares on the heavy weeks
  const s = KP.newGame('mk-med-flare', null, { legacy: true });
  const g = s.groups[0];
  const p = s.people[g.members[0]];
  p.medical = { chronic: [{ site: 'the knee', since: 1, flares: 0 }] };
  g.promoUntil = s.week + 30;
  const M = KP.C.MEDICAL;
  const FC = M.flareChance;
  M.flareChance = 1;
  KP.advanceWeek(s);
  M.flareChance = FC;
  t.ok(p.medical.chronic[0].flares >= 1, 'the veteran\'s knee has opinions about heavy weeks');
  t.ok(s.medLedger.flares >= 1, 'ledgered');
}
{
  // trainees are the practice room's problem — the desk watches idols
  const { s } = debutWorld('mk-med-trainee');
  const M = KP.C.MEDICAL;
  const B = M.base;
  M.base = 5;
  KP.advanceWeek(s);
  M.base = B;
  t.ok(!(s.scenes || []).some(x => x.kind === 'theDiagnosis'),
    'pre-debut bodies live under the practice-room rules, not the working desk');
}

// ---- determinism -------------------------------------------------------
{
  const a = KP.newGame('mk-fork', null, { legacy: true });
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 40; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the making forks clean');
}

t.finish();
