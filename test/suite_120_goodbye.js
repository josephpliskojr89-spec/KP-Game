/* Suite 120 — the long goodbye (v0.11.10, §101; §96 recommendation 4, a
   member leaves). Owner: "Approved to tackle as much of the remaining
   queue as you see fit" and "Break remaining work into smaller pieces":
   recommendation 4 ships in two, and this is the half where a member goes.

   The survey's finding: "How a group ends is a status flip with a good
   sentence on it: the farewell lap is announced… and nothing reads
   `contract.leaving` for two years."

   Pinned here:
   · the lap is an object with a date: one write path at the renewal
     table, the last week read off the clock
   · the member desk asks once how the fans are told, through the one
     queue, and both answers cost; silence keeps it in the house
   · the release reads the lap: a record inside an announced countdown,
     the lock that tells, her last era
   · her last stage is a critical letter, a line by voice, read at the
     era's close
   · the exit reads the lap back: the bow (a critical letter, last
     thing first), a plain goodbye, a sudden one; the promise made at
     the table is kept by her last era and never merely void
   · every ending leaves a list and a lineup: alumni written by the one
     sweep, a final lineup when the last contract goes; a concluded act
     has no anniversary live
   · an old file keeps its past: alumni read back off the files, a lap
     in flight never charged as sudden
   · the screens: the last year on Today, the lap on her file, former
     members on the act's page, the alumni on the Talent tab, and an
     archive card that opens a record
   Two laws from §99 hold throughout: the week's wire is read before
   the trim, and a fixture forces every gate and relies on no roll. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_120_goodbye');

const F = KP.C.FAREWELL, C = KP.C.CONTRACT, YEAR = KP.C.WEEKS_PER_YEAR;
const PLAN = [['popWave', 'challenge'], ['countdown', 'variety'], ['primeStage', 'fanSign'], ['livestream']];
const noisy = x => /undefined|NaN|\{she\}|\{her\}|\{pos\}|\{herself\}|\{hers\}|\{She\}|\{Pos\}|\[object/.test(x);

// every open door answered with the bot's default (options[0]), except
// the kinds a test wants left on the desk
function answerAll(eng, s, skip) {
  (s.scenes || []).slice().forEach(sc => {
    if (skip && skip.includes(sc.kind)) return;
    const def = eng.sceneDef(sc.kind);
    if (def) eng.resolveScene(s, sc.id, def.options(s, sc)[0].id);
  });
}
// one week, and the week's wire as the rails wrote it (pre-trim). The till
// is kept full: the inherited label folds inside a year on no income, and
// a folded label's week is a no-op.
function tick(eng, s) {
  s.budget = Math.max(s.budget, 900);
  eng.advanceWeek(s);
  return (eng.lastTickNotes || []).slice();
}

// ---- the fixture: the opening's inherited act, in its sixth year ----
// four veterans whose contracts began before the player arrived. The first
// week stamps the paper. The other three are re-signed by hand (a fresh
// seven, no table for five years), so the one lap in the room is the one
// a test begins.
const base = (() => {
  const s = KP.newGame('goodbye-120', null, { legacy: true });
  const g = s.groups.find(x => x.debuted);
  tick(KP, s);
  const p = g.members.map(id => s.people[id]).find(m => !(s.scenes || []).some(sc => sc.personId === m.id));
  g.members.forEach(id => { if (id !== p.id) { s.people[id].contract.start = s.week; s.people[id].contract.term = 2; } });
  s.scenes = (s.scenes || []).filter(sc => sc.kind !== 'renewal');
  return { s, gid: g.id, pid: p.id };
})();
function fork(src) {
  const s = KP.deserialize(KP.serialize((src || base).s));
  return { s, g: s.groups.find(x => x.id === base.gid), p: s.people[base.pid], gid: base.gid, pid: base.pid };
}
const others = f => f.g.members.filter(id => id !== f.pid).map(id => f.s.people[id]);
const ENDS = base.s.people[base.pid].contract.start + C.years * YEAR;
const told = wire => wire.filter(n => n.ind === 'farewellTold');
const doorOf = f => (f.s.scenes || []).find(sc => sc.kind === 'farewellNews' && sc.personId === f.pid) || null;
const asked = f => KP.knockCandidates(f.s).filter(c => c.kind === 'farewellNews');
const lapped = (mode) => { const f = fork(); KP.beginLap(f.s, f.p, mode || 'warm'); return f; };

// ---- the fixture is what the tests think it is ----
{
  const { s, g, p } = fork();
  t.eq(g.members.length, 4, 'fixture: the inherited act has four members');
  t.eq(p.contract.start + '|' + p.contract.term, g.debutWeek + '|1', 'fixture: her paper began at the debut, first term');
  t.eq(ENDS, 84, 'fixture: her seventh year ends in week 84');
  t.eq(s.week, 2, 'fixture: the file stands in week 2');
  t.eq(g.roles.center, p.id, 'fixture: she holds the center');
  t.ok(g.fandom && g.fandom.intensity > 20 && g.fandom.intensity < 80, 'fixture: a named fandom with room to move either way');
  t.ok(p.morale > 10 && p.morale < 90 && g.popularity > 10 && g.popularity < 90, 'fixture: her morale and the act’s popularity have room to move');
  t.ok(others({ s, g, pid: p.id, p }).every(m => m.contract.start === s.week && !m.contract.leaving), 'fixture: the other three hold a fresh seven');
  t.ok(!(s.scenes || []).some(sc => sc.kind === 'renewal'), 'fixture: no renewal table is on the desk');
  t.eq(JSON.stringify(s.farewellLedger), JSON.stringify(KP.newGame('goodbye-120-b', null, { legacy: false }).farewellLedger), 'fixture: the ledger exists from week one, all zeros');
  t.eq(Object.values(s.farewellLedger).reduce((a, b) => a + b, 0), 0, 'and counts nothing yet');
  t.eq(KP.validateState(s).length, 0, 'fixture: the file is valid');
}

// ---- the lap: a chosen ending is an object with a date ----
{
  const f = fork();
  t.ok(KP.lapOf(f.s, f.p) === null, 'a member who has not chosen to go has no lap');
  t.ok(others(f).every(m => KP.lapOf(f.s, m) === null), 'nor do the ones who re-signed');
  KP.beginLap(f.s, f.p, 'warm');
  const lap = KP.lapOf(f.s, f.p);
  t.eq(JSON.stringify(lap), JSON.stringify({ ends: ENDS, weeksLeft: ENDS - f.s.week, mode: 'warm', since: f.s.week, told: null, toldWeek: null, era: null, stage: null }),
    'the lap: its last week, the weeks left, how she goes, when it began, and nothing told yet');
  t.eq(f.p.contract.leaving + '|' + f.p.contract.leaveMode, 'true|warm', 'the table’s two old fields are written by the same call');
  t.eq(f.s.farewellLedger.laps, 1, 'the ledger counts the lap');
  // the last week is the clock's own: service pauses the clock by moving its start
  f.p.contract.start += 5;
  t.eq(KP.lapOf(f.s, f.p).ends, ENDS + 5, 'the last week is read off the clock, never stored: a paused clock moves it');
  f.p.contract.start -= 5;
  // and it is the week the clock lets her go
  const g2 = fork(f);
  g2.p.contract.told = 'fans';   // forced: no question left to ask, nothing sudden about it
  let left = null, guard = 0;
  while (g2.p.status === 'idol' && guard++ < 90) { answerAll(KP, g2.s); tick(KP, g2.s); if (g2.p.status !== 'idol') left = g2.s.week; }
  t.eq(left, ENDS, 'she leaves in the week the lap named');
  t.ok(KP.lapOf(g2.s, g2.p) === null, 'and a member who has left has no lap');
  t.eq(KP.validateState(g2.s).length, 0, 'the file is valid after she goes');
  // a cold lap is a lap too
  const cold = lapped('cold');
  t.eq(KP.lapOf(cold.s, cold.p).mode, 'cold', 'a cold ending is a lap as well, in its own mode');
  // a save and a load keep it
  const again = fork(f);
  t.eq(JSON.stringify(KP.lapOf(again.s, again.p)), JSON.stringify(lap), 'a save and a load keep the lap');
}

// ---- the renewal table writes the lap through one door ----
// the three answers that end a contract. The table is opened by hand and
// her ledger is forced, so no roll picks the band; the two coins are
// weighted to one side for the length of the answer.
{
  const table = (band) => {
    const f = fork();
    // forced: the years on the ledger, read the way the table reads them.
    // An unmet ambition in a cooling room reads strained; two wounds on
    // top of that read gone.
    const acts = band === 'gone' ? 2 : 0;
    f.p.directed = (f.p.directed || []).concat(Array.from({ length: acts }, () => ({ week: f.s.week, kind: 'heldToPaper', w: KP.C.LEDGER.KINDS.heldToPaper.w })));
    f.p.flags.ambitionMet = false;
    f.p.morale = 50;
    f.g.popularity = 40;
    const sc = KP.openScene(f.s, { kind: 'renewal', personId: f.pid, expiresWeek: f.s.week + 3 });
    return Object.assign(f, { sc, read: KP.renewalRead(f.s, f.p).band, ids: KP.sceneDef('renewal').options(f.s, sc).map(o => o.id) });
  };
  const claimOf = f => (f.s.claims || []).filter(c => c.type === 'farewellEra' && c.personId === f.pid);

  // "write the ending right": a warm lap, and a promise with a date on it
  const fw = table('gone');
  t.eq(fw.read, 'gone', 'fixture: the ledger reads gone');
  t.ok(fw.ids.includes('farewell') && fw.ids.includes('plead'), 'fixture: the cold table offers the ending and the plea');
  const r = KP.resolveScene(fw.s, fw.sc.id, 'farewell');
  t.ok(r.ok, 'the ending is written');
  const lap = KP.lapOf(fw.s, fw.p);
  t.eq(lap.mode + '|' + lap.since + '|' + lap.ends, 'warm|' + fw.s.week + '|' + ENDS, 'the farewell begins a warm lap, dated');
  t.eq(claimOf(fw).length, 1, 'and opens one promise');
  const cl = claimOf(fw)[0];
  t.eq(cl.byWeek + '|' + cl.resolved + '|' + cl.subject.kind + '|' + cl.subject.id, ENDS + '|null|idol|' + fw.pid, 'due the week she goes, held by her');
  t.eq(cl.label, 'the ending written right — a last era before she goes', 'in words the promises page can print');
  t.ok(fw.p.directed.some(d => d.kind === 'endingHonored'), 'the ending she asked for is on her ledger');
  t.eq(fw.s.farewellLedger.laps, 1, 'the ledger counts the lap');
  t.eq(KP.validateState(fw.s).length, 0, 'the file is valid');
  // the promise waits: the weekly check leaves it open while she is here
  answerAll(KP, fw.s); tick(KP, fw.s);
  t.eq(claimOf(fw)[0].resolved, null, 'the promise stays open while the lap runs');

  // the plea that fails: a warm lap, and no promise was made
  const keep = { change: C.changeMindChance, hold: C.holdLeaveChance };
  const pl = table('gone');
  C.changeMindChance = 0;   // forced: the arithmetic does not change
  const rp = KP.resolveScene(pl.s, pl.sc.id, 'plead');
  C.changeMindChance = keep.change;
  t.ok(rp.ok && KP.standingScore(pl.s, pl.p) < 3, 'fixture: the plea is heard, with no standing to lean on');
  t.eq(KP.lapOf(pl.s, pl.p).mode + '|' + KP.lapOf(pl.s, pl.p).since, 'warm|' + pl.s.week, 'a plea that fails begins a warm lap too');
  t.eq(claimOf(pl).length, 0, 'with no promise: nobody offered to write the ending');

  // the line held, and she goes: a cold lap
  const hd = table('strained');
  t.eq(hd.read, 'strained', 'fixture: the ledger reads strained');
  t.ok(hd.ids.includes('hold'), 'fixture: the strained table offers the company line');
  C.holdLeaveChance = 1;   // forced: she takes it as her answer
  const rh = KP.resolveScene(hd.s, hd.sc.id, 'hold');
  C.holdLeaveChance = keep.hold;
  t.ok(rh.ok, 'the line is held');
  t.eq(KP.lapOf(hd.s, hd.p).mode + '|' + KP.lapOf(hd.s, hd.p).since, 'cold|' + hd.s.week, 'holding the line on someone who leaves begins a cold lap');
  t.eq(claimOf(hd).length, 0, 'with no promise');
  t.eq(asked(hd).length, 0, 'and the company is not asked how to tell it: a cold ending is not its to stage');
  t.eq(C.changeMindChance + '|' + C.holdLeaveChance, keep.change + '|' + keep.hold, 'fixture: the coins are back as they were');
}

// ---- the member desk: one question, through the one queue ----
{
  const f = lapped();
  t.ok(KP.isKnockKind('farewellNews') && !!KP.sceneDef('farewellNews'), 'the question is a person scene, on the one queue');
  const c = asked(f);
  t.eq(c.length, 1, 'a warm lap puts one question in the queue');
  t.eq(c[0].personId + '|' + c[0].priority + '|' + c[0].expiresIn + '|' + c[0].source, f.pid + '|1|3|farewell', 'hers, an event that waits its turn, three weeks on the desk');

  // who is not asked
  const not = (label, mut) => { const x = lapped(); mut(x); t.eq(asked(x).length, 0, 'not asked: ' + label); };
  not('the fans already know', x => { x.p.contract.told = 'fans'; });
  not('the answer was to keep it in the house', x => { x.p.contract.told = 'house'; });
  not('her last era has already landed', x => { x.p.contract.farewellEra = { week: x.s.week }; });
  not('she is on a personal break', x => { x.p.flags.personalHiatus = x.s.week; });
  not('she is in service', x => { x.p.flags.military = { since: x.s.week }; });
  not('the act is a solo act', x => { x.g.type = 'solo'; });
  not('the act is concluded', x => { x.g.retiredWeek = x.s.week; });
  not('she is the only one left in it', x => { x.g.members = [x.pid]; });
  not('one week short of the time it takes to plan a goodbye', x => { x.p.contract.start = x.s.week + (F.askMinWeeks - 1) - C.years * YEAR; });
  const edge = lapped();
  edge.p.contract.start = edge.s.week + F.askMinWeeks - C.years * YEAR;
  t.eq(KP.lapOf(edge.s, edge.p).weeksLeft + '|' + asked(edge).length, F.askMinWeeks + '|1', 'asked with exactly ' + F.askMinWeeks + ' weeks left');

  // the rail opens it, behind whatever is already on the desk
  let guard = 0;
  while (!doorOf(f) && guard++ < 6) { answerAll(KP, f.s, ['farewellNews']); tick(KP, f.s); }
  const sc = doorOf(f);
  t.ok(!!sc, 'the question reaches the desk within weeks of the table');
  t.eq(sc.expiresWeek, sc.week + 3, 'and waits three weeks for an answer');
  t.eq(f.s.farewellLedger.asked, 1, 'the ledger counts the question');
  t.eq(asked(f).length, 0, 'it is not queued twice while it is on the desk');

  const def = KP.sceneDef('farewellNews');
  t.eq(def.title(f.s, sc), KP.displayName(f.p) + ' · the last year', 'the card is hers');
  const body = def.body(f.s, sc);
  t.ok(body.includes('contract ends ' + KP.weekLabel(ENDS).text + ', the building knows, and the fandom does not.'), 'the question names the date: ' + body.slice(0, 90));
  t.ok(body.includes('every record before it is a countdown') && body.includes('the fandom learns it from a statement'), 'and what each answer costs');
  t.ok(body.includes(' for ' + f.g.name + ';') && !noisy(body), 'by the act’s name, in clean words');
  t.eq(def.options(f.s, sc).map(o => o.id + '=' + o.label).join(' | '),
    'house=Keep it in-house until the last era | now=Tell the fans now', 'two answers: the house first, which is today’s behaviour');
  // how she raises it is hers: a line by voice opens the card
  const voice = KP.voiceOf(f.s, f.p);
  t.ok(Object.keys(KP.VOICES).includes(voice), 'fixture: she has a voice (' + voice + ')');
  const openers = Object.keys(KP.VOICES).map(v => {
    const x = fork(f);
    const tr = x.p.personality;
    // forced: the traits that decide each voice, in the order voiceOf reads them
    Object.assign(tr, { dominance: 50, confidence: 50, warmth: 50, professionalism: 50, creativity: 50, workEthic: 50, coachability: 50 });
    if (v === 'blunt') Object.assign(tr, { dominance: 70, confidence: 65 });
    if (v === 'sunshine') Object.assign(tr, { warmth: 70, confidence: 60 });
    if (v === 'deadpan') Object.assign(tr, { professionalism: 70, warmth: 40 });
    if (v === 'gremlin') Object.assign(tr, { creativity: 70, professionalism: 50 });
    if (v === 'softspoken') Object.assign(tr, { dominance: 40, warmth: 60 });
    if (v === 'earnest') Object.assign(tr, { workEthic: 70, coachability: 60 });
    return { v, got: KP.voiceOf(x.s, x.p), line: def.body(x.s, doorOf(x)).split(' Her contract ends ')[0] };
  });
  const forced = openers.filter(o => o.v !== 'wry');
  t.ok(forced.every(o => o.got === o.v), 'fixture: six voices are forced by their traits (' + forced.map(o => o.got).join(', ') + ')');
  t.eq(new Set(forced.map(o => o.line)).size, 6, 'each of them raises it in her own way');
  t.ok(openers.every(o => o.line.length > 20 && !noisy(o.line)), 'and the seventh, which only the hash gives, has words too');

  // ---- tell the fans now ----
  {
    const x = fork(f);
    const was = { pop: x.g.popularity, heat: x.g.fandom.intensity, morale: x.p.morale, inbox: x.s.inbox.length, acts: (x.p.directed || []).length };
    const r = KP.resolveScene(x.s, doorOf(x).id, 'now');
    t.ok(r.ok && !noisy(r.toast), 'the answer resolves: ' + r.toast);
    const lap = KP.lapOf(x.s, x.p);
    t.eq(lap.told + '|' + lap.toldWeek, 'fans|' + x.s.week, 'the fans know, as of this week');
    t.eq(Math.round((x.g.fandom.intensity - was.heat) * 100) / 100, F.toldIntensity, 'the cafés rally: the fandom runs ' + F.toldIntensity + ' hotter');
    t.eq(Math.round((was.pop - x.g.popularity) * 100) / 100, F.toldPopHit, 'the casual audience starts counting down: popularity gives up ' + F.toldPopHit);
    t.eq(x.p.morale - was.morale, F.toldMorale, 'she said it herself: her morale rises ' + F.toldMorale);
    t.eq((x.p.directed || []).length - was.acts + '|' + x.p.directed[x.p.directed.length - 1].kind, '1|saidItHerself', 'and it is on her ledger');
    t.eq(x.s.inbox.length, was.inbox + 1, 'one letter');
    const n = x.s.inbox[0];
    t.eq([n.kind, n.ind, n.priority, n.personId, n.groupId, n.by].join('|'), ['public', 'farewellTold', 'high', x.pid, x.gid, 'fans'].join('|'), 'public, high, hers and the act’s, told by her');
    t.ok(n.text.startsWith(KP.displayName(x.p) + ' told the fandom herself: her contract with ' + x.s.company.short + ' ends ' + KP.weekLabel(ENDS).text) && !noisy(n.text),
      'it names the date and the company: ' + n.text.slice(0, 80));
    t.ok(!doorOf(x) && asked(x).length === 0, 'the question leaves the desk and is not asked again');
    t.eq(x.s.farewellLedger.toldNow + '|' + x.s.farewellLedger.keptIn, '1|0', 'the ledger counts the answer');
    t.eq(KP.validateState(x.s).length, 0, 'the file is valid');
  }
  // ---- keep it in the house ----
  {
    const x = fork(f);
    const was = JSON.stringify([x.g.popularity, x.g.fandom.intensity, x.p.morale, x.s.inbox.length, (x.p.directed || []).length]);
    const r = KP.resolveScene(x.s, doorOf(x).id, 'house');
    t.ok(r.ok && !noisy(r.toast), 'the answer resolves: ' + r.toast);
    t.eq(KP.lapOf(x.s, x.p).told + '|' + KP.lapOf(x.s, x.p).toldWeek, 'house|' + x.s.week, 'it stays in the building');
    t.eq(JSON.stringify([x.g.popularity, x.g.fandom.intensity, x.p.morale, x.s.inbox.length, (x.p.directed || []).length]), was,
      'and nothing moves this week: no letter, no heat, no cost');
    t.ok(!doorOf(x) && asked(x).length === 0, 'the question leaves the desk and is not asked again');
    t.eq(x.s.farewellLedger.toldNow + '|' + x.s.farewellLedger.keptIn, '0|1', 'the ledger counts the answer');
  }
  // ---- silence ----
  {
    const x = fork(f);
    const acts = (x.p.directed || []).length;
    const wire = [];
    let guard2 = 0;
    while (doorOf(x) && guard2++ < 6) { answerAll(KP, x.s, ['farewellNews']); tick(KP, x.s).forEach(n => wire.push(n)); }
    t.eq(x.s.week, sc.expiresWeek + 1, 'fixture: the question lapses the week after its last');
    t.eq(KP.lapOf(x.s, x.p).told, 'house', 'silence keeps the secret by default');
    t.eq(x.s.farewellLedger.unanswered + '|' + x.s.farewellLedger.keptIn + '|' + x.s.farewellLedger.toldNow, '1|0|0', 'counted as unanswered, not as an answer');
    t.eq((x.p.directed || []).slice(acts).map(d => d.kind).join(','), 'leftWaiting', 'and she was left waiting: it is on her ledger');
    const n = wire.find(w => w.personId === x.pid && /nobody answered/.test(w.text));
    t.ok(!!n && n.kind === 'development' && n.priority === 'high' && !noisy(n.text), 'a high letter says who decided: nobody');
    t.eq(asked(x).length, 0, 'it is not asked a second time');
  }
}

// ---- the record: locked, landed, promoted ----
// a single, six weeks of runway by default, the stages booked as planned
function lock(f, week) {
  f.g.demos = KP.generateDemos(f.s, KP.rngFor(f.s), f.g);
  const d = f.g.demos[0];
  const r = KP.planDebut(f.s, { groupId: f.gid, songId: d.id, conceptId: d.conceptId, promo: 'standard', format: 'single', week,
    alloc: { vocals: 25, dance: 25, rap: 25, media: 25 }, rollout: PLAN.map(w => w.slice()) });
  if (!r.ok) throw new Error('fixture: the lock refused: ' + r.reason);
  return r;
}
function land(f) {
  const wire = [];
  let guard = 0;
  while (f.g.prep && guard++ < 30) { answerAll(KP, f.s); tick(KP, f.s).forEach(n => wire.push(n)); }
  if (f.g.prep) throw new Error('fixture: the record never landed');
  return wire;
}
function runTo(f, week, skip) {
  const wire = [];
  while (f.s.week < week) { answerAll(KP, f.s, skip); tick(KP, f.s).forEach(n => wire.push(n)); }
  return wire;
}
const lastRel = f => f.g.releases[f.g.releases.length - 1];
const reach = (f, src) => ((f.g.results.ledger || {}).reach || []).filter(r => r.src === src);
const WINDOW = ENDS - F.lastEraWeeks;   // the first week a record can land and be her last

// the lap, with the question answered each way, carried to the week the
// window opens for a lock (a single needs four weeks of runway)
const fansAt = (() => {
  const f = lapped();
  let guard = 0;
  while (!doorOf(f) && guard++ < 6) { answerAll(KP, f.s, ['farewellNews']); tick(KP, f.s); }
  const r = KP.resolveScene(f.s, doorOf(f).id, 'now');
  if (!r.ok) throw new Error('fixture: the answer refused');
  return f;
})();
const houseLate = (() => { const f = lapped(); runTo(f, WINDOW + 2); return f; })();
const fansLate = (() => { const f = fork(fansAt); runTo(f, WINDOW + 2); return f; })();
{
  t.eq(WINDOW, 60, 'fixture: her window opens in week 60');
  t.eq(houseLate.s.week + '|' + KP.lapOf(houseLate.s, houseLate.p).told, '62|house', 'fixture: the bot’s default kept it in the house, and the file stands in week 62');
  t.eq(fansLate.s.week + '|' + KP.lapOf(fansLate.s, fansLate.p).told + '|' + KP.lapOf(fansLate.s, fansLate.p).toldWeek, '62|fans|3', 'fixture: or she told them in week 3');
  t.ok(!houseLate.g.prep && !fansLate.g.prep && houseLate.g.members.length === 4, 'fixture: no record is in flight, and all four are in the room');
}

// ---- the release reads the lap: the countdown ----
// she told the fans, and a record lands long before her last weeks
{
  const f = fork(fansAt);
  lock(f, f.s.week + 6);
  t.ok(f.g.prep.scheduledWeek < WINDOW, 'fixture: the record lands before her window opens');
  t.eq(told(f.s.inbox).filter(n => n.by === 'era').length, 0, 'a lock that lands before her last weeks announces nothing about them');
  land(f);
  const rel = lastRel(f);
  t.ok(rel.farewellFor === null && KP.lapOf(f.s, f.p).era === null, 'it is not her last era, and the lap keeps its one for later');
  t.eq(JSON.stringify(reach(f, 'the countdown')), JSON.stringify([{ src: 'the countdown', mod: -F.shadowReach }]), 'the landing carries the countdown: reach gives up ' + F.shadowReach);
  t.eq(reach(f, 'the farewell').length, 0, 'and no farewell row');
  const line = 'Every question at the press day was about ' + KP.displayName(f.p) + ' leaving. The record landed inside a countdown, and a countdown is a hard thing to sell a new song over.';
  t.ok(f.g.results.publicNotes.includes(line), 'the report says why, by name');
  t.eq(f.s.farewellLedger.shadows + '|' + f.s.farewellLedger.eras, '1|0', 'the ledger counts a countdown record, not an era');

  // kept in the house, the same record is an ordinary record
  const h = lapped();
  h.p.contract.told = 'house'; h.p.contract.toldWeek = h.s.week;   // forced: the answer
  runTo(h, f.g.releases[f.g.releases.length - 1].week - 6);
  lock(h, h.s.week + 6);
  land(h);
  t.eq(reach(h, 'the countdown').length + reach(h, 'the farewell').length, 0, 'kept in the house, the same record carries neither row');
  t.ok(!h.g.results.publicNotes.some(n => /leaving|last era/.test(n)), 'and the report says nothing about her');
  t.eq(h.s.farewellLedger.shadows, 0, 'nothing is counted');
  t.eq(KP.validateState(f.s).length + KP.validateState(h.s).length, 0, 'both files are valid');
}

// ---- the lock that tells: an in-house lap is told by the record that will be her last ----
{
  const f = fork(houseLate);
  const inbox = f.s.inbox.length;
  lock(f, 70);
  const notes = told(f.s.inbox);
  t.eq(notes.length, 1, 'the lock of her last record writes one letter');
  const n = notes[0];
  t.eq([n.kind, n.priority, n.personId, n.groupId, n.by].join('|'), ['public', 'high', f.pid, f.gid, 'era'].join('|'), 'public, high, hers and the act’s, told by the era');
  t.eq(n.text, 'The announcement carries a second line: the record landing ' + KP.weekLabel(70).text + ' is ' + KP.displayName(f.p) + '’s last with ' + f.g.name +
    '. The contract ends ' + KP.weekLabel(ENDS).text + ', the statement says so in the first sentence, and the fandom is reading the tracklist for the goodbye before there is a tracklist.',
    'it names her, the landing and the date the paper ends');
  t.ok(f.s.inbox.length >= inbox + 2, 'beside the era’s own announcement');
  const lap = KP.lapOf(f.s, f.p);
  t.eq(lap.told + '|' + lap.toldWeek, 'era|' + f.s.week, 'the fans know now, as of the lock');
  t.eq(f.s.farewellLedger.toldByEra, 1, 'the ledger counts a lap told by its era');
  t.eq(KP.validateState(f.s).length, 0, 'the file is valid');

  // a question still on the desk is answered by the announcement
  const q = fork(houseLate);
  delete q.p.contract.told; delete q.p.contract.toldWeek;   // forced: nobody has answered
  KP.openScene(q.s, { kind: 'farewellNews', personId: q.pid, expiresWeek: q.s.week + 3 });
  t.ok(!!doorOf(q), 'fixture: the question is on the desk');
  lock(q, 70);
  t.ok(!doorOf(q) && KP.lapOf(q.s, q.p).told === 'era', 'the announcement answers it: the question leaves the desk');

  // she told them long ago: the lock still says whose last era this is, and her telling stands
  const x = fork(fansLate);
  lock(x, 70);
  t.eq(told(x.s.inbox).filter(m => m.by === 'era').length, 1, 'a lap the fans already know about is announced as her last era all the same');
  t.eq(KP.lapOf(x.s, x.p).told + '|' + KP.lapOf(x.s, x.p).toldWeek + '|' + x.s.farewellLedger.toldByEra, 'fans|3|0', 'and the telling stays hers, dated when she did it');

  // a cold ending is not staged
  const c = fork(houseLate);
  c.p.contract.leaveMode = 'cold'; delete c.p.contract.told;   // forced: she is leaving cold
  lock(c, 70);
  t.ok(told(c.s.inbox).length === 0 && KP.lapOf(c.s, c.p).told === null, 'a cold ending gets no announcement');

  // the read on its own: who a lock would name
  const d = fork(houseLate);
  t.eq(JSON.stringify(KP.farewellLockTells(d.s, d.g, WINDOW - 1)), '[]', 'a landing one week before her window names nobody');
  t.eq(JSON.stringify(KP.farewellLockTells(d.s, d.g, ENDS + 1)), '[]', 'nor one the week after she is gone');
  t.eq(JSON.stringify(KP.farewellLockTells(d.s, d.g, WINDOW)), JSON.stringify([d.pid]), 'the first week of the window names her');
}

// ---- her last era ----
{
  // told by the era, eight weeks before it lands
  const f = fork(houseLate);
  lock(f, 70);
  land(f);
  const rel = lastRel(f);
  t.eq(rel.week, 70, 'fixture: the record lands in week 70');
  t.eq(JSON.stringify(rel.farewellFor), JSON.stringify([f.pid]), 'the record is archived as her last era');
  t.eq(JSON.stringify(KP.lapOf(f.s, f.p).era), JSON.stringify({ week: 70 }), 'and the lap is stamped with it');
  const known = 70 - 62, lift = F.eraReach + Math.min(F.eraCap, Math.round(known * F.eraPerWeek));
  t.eq(JSON.stringify(reach(f, 'the farewell')), JSON.stringify([{ src: 'the farewell', mod: lift }]), 'the landing carries the farewell: ' + F.eraReach + ' and ' + (lift - F.eraReach) + ' for the ' + known + ' weeks the fans have known');
  t.eq(reach(f, 'the countdown').length, 0, 'and no countdown row');
  t.ok(f.g.results.publicNotes.includes('This is ' + KP.displayName(f.p) + '’s last era with ' + f.g.name + ', and it was bought like one: the fandom has known since the announcement and is not wasting a week of it.'),
    'the report says whose last era it is');
  t.eq(f.s.farewellLedger.eras + '|' + f.s.farewellLedger.shadows, '1|0', 'the ledger counts the era');
  t.eq(KP.validateState(f.s).length, 0, 'the file is valid');

  // told by her in week 3: the fandom saved for it
  const x = fork(fansLate);
  lock(x, 70);
  land(x);
  t.eq(JSON.stringify(reach(x, 'the farewell')), JSON.stringify([{ src: 'the farewell', mod: F.eraReach + F.eraCap }]), 'known for more than a year, the lift is capped at ' + F.eraCap + ' on top');
  t.ok(x.g.results.publicNotes.some(n => n.endsWith('the fandom has known for months and saved for it.')), 'and the report says they saved for it');
  t.ok(Math.round((70 - 3) * F.eraPerWeek) > F.eraCap, 'fixture: the weeks known would have earned more than the cap');

  // the read on its own: what it gives, once
  const u = fork(houseLate);
  const heat = u.g.fandom.intensity;
  const first = KP.farewellReadsRelease(u.s, u.g, false);
  t.eq(first.mod + '|' + JSON.stringify(first.ids), F.eraReach + '|' + JSON.stringify([u.pid]), 'a landing that tells the fans itself earns the base lift, no more');
  t.eq(Math.round((u.g.fandom.intensity - heat) * 100) / 100, F.eraIntensity, 'the last era warms the fandom by ' + F.eraIntensity);
  t.eq(KP.lapOf(u.s, u.p).told + '|' + KP.lapOf(u.s, u.p).toldWeek, 'era|' + u.s.week, 'a record nobody announced tells them the week it lands');
  const second = KP.farewellReadsRelease(u.s, u.g, false);
  t.eq(second.mod + '|' + second.ids.length + '|' + second.note, '0|0|null', 'a lap has one last era: a second record in the window is an ordinary record');
  t.eq(u.s.farewellLedger.eras, 1, 'counted once');

  // who and when
  const none = (label, mut) => { const y = fork(houseLate); mut(y); const r = KP.farewellReadsRelease(y.s, y.g, false); t.eq(r.mod + '|' + r.ids.length, '0|0', 'no last era: ' + label); };
  none('a cold ending', y => { y.p.contract.leaveMode = 'cold'; });
  none('a solo act', y => { y.g.type = 'solo'; });
  none('an act of one', y => { y.g.members = [y.pid]; });
  none('one week before the window', y => { y.p.contract.start += 3; });
  t.eq(KP.lapOf(houseLate.s, houseLate.p).ends - houseLate.s.week, F.lastEraWeeks - 2, 'fixture: the file stands two weeks inside the window');
  const edge = fork(houseLate);
  edge.p.contract.start += 2;   // forced: her clock, so this week is the window's first
  t.eq(KP.farewellReadsRelease(edge.s, edge.g, false).ids.length, 1, 'the window’s first week counts');
  const debut = fork(houseLate);
  t.eq(KP.farewellReadsRelease(debut.s, debut.g, true).ids.length, 0, 'a debut is nobody’s last era');
}

// ---- her last stage ----
const AFTER = {
  blunt: 'Asked in the corridor what she would miss, she said “the in-ears, ours are worse,” and then stood in the wings for one more song after the cameras cut.',
  sunshine: 'She hugged the camera director, both floor managers and a lighting rig, in that order, and thanked the audience by section.',
  deadpan: 'She bowed exactly as long as the rundown allowed, said “that was the last one” to nobody in particular, and went to find her coat.',
  gremlin: 'She did the ending pose, held it two seconds past the cut, and then did the trainee-year version of it for the fancams.',
  softspoken: 'She said thank you to the stage itself, quietly, with the microphone already off. The front row heard it anyway.',
  earnest: 'She had a list of every staff member to thank and got through all of it, in the hallway, with the next act waiting.',
  wry: '“Seven years,” she told the fancams, “and they still gave us the dressing room by the loading dock.” Then she stopped being able to talk.',
};
const lastEra = (() => { const f = fork(houseLate); lock(f, 70); land(f); return f; })();
{
  const f = fork(lastEra);
  const rel = lastRel(f);
  const wire = [];
  let guard = 0;
  while (!rel.closed && guard++ < 10) { answerAll(KP, f.s); tick(KP, f.s).forEach(n => wire.push(n)); }
  t.eq(f.s.week, f.g.promoUntil + 1, 'fixture: the era closes the week after its last promotion week');
  const notes = wire.filter(n => n.ind === 'lastStage');
  t.eq(notes.length, 1, 'the close of her last era writes her last stage, once');
  const n = notes[0], ls = rel.lastStage;
  t.eq([n.kind, n.priority, n.personId, n.groupId, n.band].join('|'), ['public', 'critical', f.pid, f.gid, ls.band].join('|'), 'public, critical, hers and the act’s');
  t.eq(ls.band + '|' + KP.voiceOf(f.s, f.p) + '|' + (ls.carried || 'nobody'), 'clean|gremlin|nobody', 'fixture: the last stage was clean, and she is the gremlin of the room');
  t.eq(n.text, KP.displayName(f.p) + ' has taken her last music-show stage with ' + f.g.name + ': ' + KP.showLabel(ls.showId) + ', ' + KP.weekLabel(ls.week).text +
    '. It was clean: every count where it has been for years. ' + AFTER.gremlin, 'the letter names the show and the week, says how it went, and closes in her voice');
  t.ok(ls.week < f.s.week, 'it is read at the close, when the last stage is known to have been the last');
  t.eq(JSON.stringify(KP.lapOf(f.s, f.p).stage), JSON.stringify({ week: ls.week, showId: ls.showId, band: ls.band }), 'the lap keeps the stage');
  t.eq(f.s.farewellLedger.lastStages, 1, 'the ledger counts it');
  t.eq(wire.filter(x => x.ind === 'eraClosed').length, 1, 'the era’s own close is written the same week');
  t.eq(KP.validateState(f.s).length, 0, 'the file is valid');
  const more = runTo(f, f.s.week + 4);
  t.eq(more.filter(x => x.ind === 'lastStage').length, 0, 'and it is not written again');

  // when there is nothing to write
  const quiet = (label, mut) => {
    const y = fork(lastEra);
    mut(y, lastRel(y));
    const w = [];
    let g2 = 0;
    while (!lastRel(y).closed && g2++ < 10) { answerAll(KP, y.s); tick(KP, y.s).forEach(m => w.push(m)); }
    t.eq(w.filter(m => m.ind === 'lastStage').length + '|' + y.s.farewellLedger.lastStages, '0|0', 'no last-stage letter: ' + label);
  };
  quiet('the record is not anybody’s last era', (y, r) => { r.farewellFor = null; });
  quiet('she has already gone', (y) => { KP.departIdol(y.s, y.pid, 'warm', null); });
  // no stage at all: every promotion week of the era runs radio
  {
    const y = fork(houseLate);
    y.g.demos = KP.generateDemos(y.s, KP.rngFor(y.s), y.g);
    const d = y.g.demos[0];
    const r = KP.planDebut(y.s, { groupId: y.gid, songId: d.id, conceptId: d.conceptId, promo: 'standard', format: 'single', week: 70,
      alloc: { vocals: 25, dance: 25, rap: 25, media: 25 }, rollout: [['radio', 'challenge'], ['radio', 'variety'], ['radio', 'fanSign'], ['livestream']] });
    if (!r.ok) throw new Error('fixture: the radio plan refused: ' + r.reason);
    land(y);
    const w = [];
    let g2 = 0;
    while (!lastRel(y).closed && g2++ < 10) { answerAll(KP, y.s, ['promoOffer']); tick(KP, y.s).forEach(m => w.push(m)); }
    t.ok(!lastRel(y).lastStage && !!lastRel(y).closed, 'fixture: an era with no music-show booking closes with no last stage on file');
    t.eq(w.filter(m => m.ind === 'lastStage').length, 0, 'no last-stage letter for an era that had no stage');
    t.ok(KP.lapOf(y.s, y.p).stage === null && !!KP.lapOf(y.s, y.p).era, 'the lap has its era and no stage');
  }

  // every way a last stage can go, and every voice
  const say = (band, carried, traits) => {
    const y = fork(lastEra);
    const r = lastRel(y);
    r.lastStage = { week: r.week + 2, showId: 'primeStage', band, carried: carried === 'her' ? y.pid : carried === 'other' ? others(y)[0].id : null };
    if (traits) Object.assign(y.p.personality, { dominance: 50, confidence: 50, warmth: 50, professionalism: 50, creativity: 50, workEthic: 50, coachability: 50 }, traits);
    return { y, note: KP.lastStageNote(y.s, y.g, r, y.p), other: KP.displayName(others(y)[0]) };
  };
  const mid = t2 => t2.split(' Y2. ')[1];
  const ways = { carriedHer: say('carried', 'her'), carriedOther: say('carried', 'other'), clean: say('clean'), shaky: say('shaky'), fumbled: say('fumbled') };
  t.ok(mid(ways.carriedHer.note.text).startsWith('She carried it, which is the only way she was ever going to leave that stage. '), 'carried by her: it says so');
  t.ok(mid(ways.carriedOther.note.text).startsWith(ways.carriedOther.other + ' carried it and handed her the ending pose. '), 'carried by another: she is handed the ending pose, by name');
  t.ok(mid(ways.shaky.note.text).startsWith('It wobbled, the way a stage does when half of it is trying not to cry. '), 'shaky: it wobbled');
  t.ok(mid(ways.fumbled.note.text).startsWith('It was fumbled, and nobody in the building will let that be the clip that gets kept. '), 'fumbled: nobody keeps the clip');
  t.eq(new Set(Object.values(ways).map(w => w.note.text)).size, 5, 'five ways, five letters');
  t.ok(Object.values(ways).every(w => w.note.priority === 'critical' && !noisy(w.note.text)), 'all critical, all clean');
  const TRAITS = { blunt: { dominance: 70, confidence: 65 }, sunshine: { warmth: 70, confidence: 60 }, deadpan: { professionalism: 70, warmth: 40 },
    gremlin: { creativity: 70 }, softspoken: { dominance: 40, warmth: 60 }, earnest: { workEthic: 70, coachability: 60 } };
  Object.keys(TRAITS).forEach(v => {
    const w = say('clean', null, TRAITS[v]);
    t.eq(KP.voiceOf(w.y.s, w.y.p) + '|' + w.note.text.endsWith(AFTER[v]), v + '|true', v + ': the letter closes in her voice');
  });
  t.eq(Object.keys(AFTER).sort().join(','), Object.keys(KP.VOICES).sort().join(','), 'fixture: a closing line for every voice the engine has');
}

// ---- the timeline hears it: hash picks, no draw ----
{
  const trap = new Proxy({}, { get(_, k) { throw new Error('the echo drew: rng.' + String(k)); } });
  const toldEcho = KP.feedReactionFor('farewellTold'), stageEcho = KP.feedReactionFor('lastStage');
  t.ok(typeof toldEcho === 'function' && typeof stageEcho === 'function', 'the telling and the last stage are both in the feed registry');
  const f = fork(lastEra);
  const N = KP.publicGiven(f.p);
  const sweep = fn => { const seen = new Set(); const w0 = f.s.week; for (let w = 1; w <= 40; w++) { f.s.week = w; const p2 = fn(); seen.add(p2.persona + '|' + p2.text); } f.s.week = w0; return seen; };
  const byHer = sweep(() => toldEcho(f.s, { ind: 'farewellTold', personId: f.pid, by: 'fans' }, trap));
  const byEra = sweep(() => toldEcho(f.s, { ind: 'farewellTold', personId: f.pid, by: 'era' }, trap));
  const stage = sweep(() => stageEcho(f.s, { ind: 'lastStage', personId: f.pid }, trap));
  t.eq(byHer.size + '|' + byEra.size + '|' + stage.size, '2|2|3', 'two lines when she tells it, two when the era does, three for the last stage');
  t.ok([...byHer].every(x => ![...byEra].includes(x)), 'her own telling and the era’s do not share a line');
  t.ok([...byHer, ...byEra, ...stage].every(x => !noisy(x) && x.split('|')[1].length > 30), 'every post reads clean');
  t.ok([...byEra, ...stage].every(x => x.includes(N)), 'and names her');
  t.ok(toldEcho(f.s, { ind: 'farewellTold', personId: 'nobody', by: 'fans' }, trap) === null && stageEcho(f.s, { ind: 'lastStage', personId: 'nobody' }, trap) === null,
    'a letter about someone who is not there says nothing');
}

// ---- the exit reads the lap back ----
// the lap with its last era and its last stage on file, one week before
// the paper ends. Each case forks it and changes one thing by hand; the
// exit is called as the action it is, so nothing else in a week moves.
const preExit = (() => {
  const f = fork(lastEra);
  let guard = 0;
  while (!lastRel(f).closed && guard++ < 10) { answerAll(KP, f.s); tick(KP, f.s); }
  runTo(f, ENDS - 1);
  // forced: sixty idle weeks saturate a room's morale, and a goodbye is read by what it moves
  others(f).forEach(m => { m.morale = 70; });
  return f;
})();
const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const Cap = w => w.charAt(0).toUpperCase() + w.slice(1);
const exitOf = (mut, mode) => {
  const f = fork(preExit);
  if (mut) mut(f);
  const was = { pop: f.g.popularity, grudge: f.g.fandomGrudge || 0, morale: others(f).map(m => m.morale), acts: (f.p.directed || []).length,
    close: others(f).map(m => { const rel = (f.s.relationships || {})[KP.pairKey(f.p, m)]; return !!rel && rel.state === 'close'; }) };
  const mates = others(f);
  KP.departIdol(f.s, f.pid, mode || 'warm', null);
  const note = f.s.inbox.find(n => n.ind === 'contractEnd' && n.personId === f.pid);
  return Object.assign(f, { was, note, mates,
    popDrop: Math.round((was.pop - f.g.popularity) * 100) / 100,
    grudge: (f.g.fandomGrudge || 0) - was.grudge,
    // what the goodbye itself gave or took, once the lineup's own grief is set aside
    room: mates.map((m, i) => m.morale - was.morale[i] + C.departMoraleWarm + (was.close[i] ? C.friendGrief : 0)),
    acts: (f.p.directed || []).slice(was.acts).map(d => d.kind),
    claim: (f.s.claims || []).find(c => c.type === 'farewellEra' && c.personId === f.pid) || null });
};
const plainly = f => { delete f.p.contract.farewellEra; delete f.p.contract.lastStage; f.p.contract.told = 'fans'; };
const PLAIN = N => N + '’s contract completed today, and the goodbye was everything the fandom needed it to be: the letter in her own handwriting, the members crying through the last group bow, the company statement that read like it was written by a person. She leaves full, not empty. The door stays open.';
{
  const f = fork(preExit);
  const lap = KP.lapOf(f.s, f.p);
  t.eq(f.s.week + '|' + lap.weeksLeft + '|' + lap.told + '|' + !!lap.era + '|' + !!lap.stage, (ENDS - 1) + '|1|era|true|true', 'fixture: one week left, the fans told by the era, her last era and last stage on file');
  t.ok(others(f).every(m => m.morale >= 20 && m.morale <= 90) && f.g.popularity >= 20, 'fixture: the room’s morale and the act’s popularity have room to move');
  t.eq(f.g.members.length, 4, 'fixture: all four are still in the room');
}

// the bow: a critical letter, read last thing first
{
  const x = exitOf();
  const n = x.note, N = KP.displayName(x.p);
  t.eq([n.kind, n.priority, n.shape, n.warm, n.groupId].join('|'), ['public', 'critical', 'bow', true, x.gid].join('|'), 'a member who had her last era leaves on a critical letter: the bow');
  const facts = KP.farewellFacts(preExit.s, preExit.p, preExit.g);
  t.eq(JSON.stringify(facts.eras), JSON.stringify(preExit.g.releases.map(r => r.songTitle)), 'fixture: every record of the act is one of her eras');
  t.eq(facts.eras.length + '|' + facts.centerWeeks + '|' + facts.friendId + '|' + facts.written + '|' + facts.credits, '4|' + (C.years * YEAR - 1) + '|null|0|0',
    'fixture: four eras, the center since the debut, no close friend in the room, no credit to her name');
  const e = facts.eras, ls = preExit.p.contract.lastStage;
  const trophies = Object.values(preExit.g.trophies).reduce((a, b) => a + b, 0);
  t.ok(trophies >= 2 && trophies <= 12, 'fixture: a shelf the letter can count in words (' + trophies + ')');
  t.eq(n.text, N + '’s contract completed today, and the bow was read the way a finale is read, last thing first. ' +
    'The last stage: ' + KP.showLabel(ls.showId) + ', ' + KP.weekLabel(ls.week).text + ', clean. ' +
    'The last era: “' + e[3] + '”. Before it, “' + e[2] + '” and “' + e[1] + '”, and back to “' + e[0] + '”, where it started. ' +
    'Six years and eleven months of it at the center. ' +
    Cap(NUM[trophies]) + ' trophies on the shelf with her fingerprints on them. ' +
    'The letter is in her own handwriting, dated ' + KP.weekLabel(x.s.week).text + ', and its last line is the one she asked for: the door stays open.',
    'the stage, the eras back to the first, the center, the shelf, and the letter with its date');
  t.ok(!noisy(n.text), 'in clean words');
  t.eq(x.popDrop + '|' + x.grudge, C.departPopHitWarm + '|0', 'the act pays the warm goodbye’s ' + C.departPopHitWarm + ' and nothing more');
  t.eq(x.room.join(','), x.mates.map(() => F.bowRoomMorale).join(','), 'and the bow gives the room ' + F.bowRoomMorale + ' of its grief back');
  t.eq(x.p.status + '|' + x.p.flags.departMode + '|' + x.s.farewellLedger.bows, 'departed|warm|1', 'she is gone, warmly, and the ledger counts a bow');
  t.eq(KP.chapterLine(x.s, x.p.chapters[x.p.chapters.length - 1]), 'Contract completed at ' + x.s.company.short + ' (' + x.g.name + ')', 'her file says the contract was completed');
  t.eq(KP.validateState(x.s).length, 0, 'the file is valid');

  // through the week itself: the clock lets her go and the wire carries the bow
  const w = fork(preExit);
  answerAll(KP, w.s);
  const wire = tick(KP, w.s);
  const ends = wire.filter(m => m.ind === 'contractEnd');
  t.eq(ends.length + '|' + ends[0].priority + '|' + ends[0].shape, '1|critical|bow', 'the week the paper ends, the wire carries one bow');
  t.ok(ends[0].text.includes('dated ' + KP.weekLabel(ENDS).text), 'dated the week she left');
  t.ok(ends[0].text.includes('Seven years of it at the center.'), 'and a whole seven years at the center, to the week');
  t.eq(w.p.status + '|' + w.g.members.length, 'departed|3', 'the act goes on as three');
  t.eq(KP.validateState(w.s).length, 0, 'the file is valid after the week');
}

// the bow's sentences, each forced on its own
{
  const bow = mut => { const f = fork(preExit); mut(f); return KP.farewellBow(f.s, f.p, f.g); };
  const titles = preExit.g.releases.map(r => r.songTitle);
  const eras = n => bow(f => { f.g.releases = f.g.releases.slice(-n); });
  t.ok(eras(1).includes('The last era was also the first: “' + titles[3] + '”. '), 'one era: the last was also the first');
  t.ok(eras(2).includes('The last era: “' + titles[3] + '”. Before it, “' + titles[2] + '”, where it started. '), 'two eras');
  t.ok(eras(3).includes('The last era: “' + titles[3] + '”. Before it, “' + titles[2] + '”, and back to “' + titles[1] + '”, where it started. '), 'three eras');
  const six = bow(f => { const r = f.g.releases; f.g.releases = [r[0], Object.assign({}, r[1], { songTitle: 'Extra One' }), Object.assign({}, r[1], { songTitle: 'Extra Two' }), r[1], r[2], r[3]]; });
  t.ok(six.includes('Before it, “' + titles[2] + '” and “' + titles[1] + '”, two more behind those, and back to “' + titles[0] + '”, where it started. '), 'six eras: the ones in between are counted, not listed');
  // a member who joined later owns only the eras since
  const late = bow(f => { f.p.chapters = (f.p.chapters || []).concat([{ week: f.g.releases[2].week, kind: 'debut', group: f.g.name }]); });
  t.ok(late.includes('The last era: “' + titles[3] + '”. Before it, “' + titles[2] + '”, where it started. '), 'her eras start where her file says she joined');
  // the center
  t.ok(!bow(f => { f.g.centerHistory = [{ week: f.g.debutWeek, id: others(f)[0].id }]; }).includes('at the center'), 'never the center: no center sentence');
  t.ok(bow(f => { f.g.centerHistory = [{ week: f.g.debutWeek, id: others(f)[0].id }, { week: f.s.week - (2 * YEAR + 12), id: f.pid }]; }).includes('Two years and three months of it at the center. '),
    'two years and three months at the center, in the calendar’s units');
  t.ok(bow(f => { f.g.centerHistory = [{ week: f.s.week - 20, id: f.pid }, { week: f.s.week - 8, id: others(f)[0].id }]; }).includes('Three months of it at the center. '), 'a center she handed on is counted to the week she handed it on');
  // the shelf
  t.ok(!bow(f => { f.g.trophies = {}; }).includes('on the shelf'), 'an empty shelf: no trophy sentence');
  t.ok(bow(f => { f.g.trophies = { countdown: 1 }; }).includes('One trophy on the shelf with her fingerprints on it. '), 'one trophy, in the singular');
  // the friend she leaves
  const friend = bow(f => { const m = others(f)[1]; f.s.relationships[KP.pairKey(f.p, m)] = { score: 70, state: 'close' }; });
  t.ok(friend.includes('She leaves ' + KP.displayName(others(preExit)[1]) + ' the other half of every inside joke. '), 'a close friend in the room is named');
  const two = bow(f => { const o = others(f); f.s.relationships[KP.pairKey(f.p, o[1])] = { score: 60, state: 'close' }; f.s.relationships[KP.pairKey(f.p, o[2])] = { score: 80, state: 'close' }; });
  t.ok(two.includes('She leaves ' + KP.displayName(others(preExit)[2]) + ' the other half'), 'of two close friends, the closer one');
  // what she keeps
  const chair = bow(f => { lastRel(f).tracklist[1].writtenBy = f.pid; });
  t.ok(chair.includes('She keeps her chair in the writing room in the only way that counts: one song here carries her name, and the checks will keep finding her. '), 'a song she wrote: she keeps her chair in the writing room');
  const booklet = bow(f => { lastRel(f).tracklist[1].credit = { type: 'solo', memberId: f.pid }; });
  t.ok(booklet.includes('She keeps her name in the booklet, once. ') && !booklet.includes('writing room'), 'a credit and no song of her own: her name in the booklet');
  // no last stage on file
  t.ok(bow(f => { delete f.p.contract.lastStage; }).includes('There was no last stage to read: the era ended off the schedule. '), 'a last era with no stage says so');
  [eras(1), six, late, friend, chair, booklet].forEach((x, i) => t.ok(!noisy(x), 'bow variant ' + (i + 1) + ' reads clean'));
}

// a warm goodbye with no last era, when the fans were told
{
  const x = exitOf(plainly);
  t.eq(x.note.priority + '|' + x.note.shape, 'high|plain', 'no last era, and the fans knew: a plain warm goodbye, high');
  t.eq(x.note.text, PLAIN(KP.displayName(x.p)), 'in the words it always had');
  t.eq(x.popDrop + '|' + x.grudge + '|' + x.room.join(','), C.departPopHitWarm + '|0|' + x.mates.map(() => 0).join(','), 'at the cost it always had: nothing given back, nothing added');
  t.eq(x.s.farewellLedger.plain + '|' + x.s.farewellLedger.bows + '|' + x.s.farewellLedger.sudden, '1|0|0', 'the ledger counts a plain goodbye');
}

// a sudden one: the company had the year and the fandom got a day
{
  const sudden = f => { delete f.p.contract.farewellEra; delete f.p.contract.lastStage; f.p.contract.told = 'house'; };
  const x = exitOf(sudden);
  const N = KP.displayName(x.p);
  t.eq(x.note.priority + '|' + x.note.shape, 'high|sudden', 'kept in the house and no last era ever came: a sudden goodbye');
  t.eq(x.note.text, N + '’s contract completed today, and today is when the fandom found out. There is a letter in her own handwriting and nobody was given the year to get ready to read it: no last era, no last stage with a name on it, a goodbye that fits in one afternoon. She leaves on good terms with the building. The cafés are asking who knew, and for how long. The door stays open.',
    'the letter says who found out when');
  t.eq(x.popDrop + '|' + x.grudge, (C.departPopHitWarm + F.suddenPopHit) + '|' + F.suddenGrudge, 'it costs ' + F.suddenPopHit + ' more popularity, and the fandom holds a grudge');
  t.eq(x.room.join(','), x.mates.map(() => 0).join(','), 'the room’s grief is the ordinary one');
  t.eq(x.s.farewellLedger.sudden, 1, 'the ledger counts it');
  t.eq(KP.validateState(x.s).length, 0, 'the file is valid');
  // never asked, never told: the same
  t.eq(exitOf(f => { sudden(f); delete f.p.contract.told; }).note.shape, 'sudden', 'a question nobody was asked is no excuse');
  // but a company that never had the time is not charged for it
  const short = exitOf(f => { sudden(f); f.p.contract.leavingSince = ENDS - (F.askMinWeeks - 1); });
  t.eq(short.note.shape + '|' + short.popDrop + '|' + short.grudge, 'plain|' + C.departPopHitWarm + '|0', 'a lap too short to plan a goodbye in ends plainly');
  t.eq(exitOf(f => { sudden(f); f.p.contract.leavingSince = ENDS - F.askMinWeeks; }).note.shape, 'sudden', 'with exactly the weeks the question needs, it is sudden');
  t.eq(exitOf(f => { sudden(f); delete f.p.contract.leavingSince; }).note.shape, 'plain', 'a lap from before the lap was dated ends plainly');
  t.eq(exitOf(f => { sudden(f); f.g.type = 'solo'; }).note.shape, 'plain', 'and so does a solo act’s: there was no room to tell');
}

// the promise: "write the ending right" is kept by her last era
{
  const promised = f => { KP.farewellPromise(f.s, f.p); };
  const kept = exitOf(promised);
  t.eq(kept.claim.resolved + '|' + kept.claim.resolvedWeek, 'met|' + kept.s.week, 'her last era landed: the promise is kept, settled the week she goes');
  t.eq(kept.acts.join(','), 'promiseKept', 'and it is on her ledger');
  t.eq(kept.claim.replyText, 'She got the last era the table promised her.', 'the promises page keeps how it ended');
  t.eq(kept.note.shape + '|' + kept.s.farewellLedger.kept + '|' + kept.s.farewellLedger.broken, 'bow|1|0', 'it is a bow, and the ledger counts a promise kept');
  t.eq(kept.room.join(','), kept.mates.map(() => F.bowRoomMorale).join(','), 'the room gets what a bow gives');

  const broke = exitOf(f => { promised(f); plainly(f); });
  t.eq(broke.claim.resolved + '|' + broke.claim.resolvedWeek, 'missed|' + broke.s.week, 'no last era ever came: the promise is broken, and never merely void');
  t.eq(broke.acts.join(','), 'promiseBroken', 'on her ledger, with what a broken promise does to a person');
  t.eq(broke.room.join(','), broke.mates.map(() => -F.brokenRoomMorale).join(','), 'everyone left in the room watched it: ' + F.brokenRoomMorale + ' off each');
  t.eq(broke.note.text, PLAIN(KP.displayName(broke.p)).replace(' She leaves full,', ' The last era the company promised her at the renewal table never came, and everyone left in the room watched it not come. She leaves full,'),
    'the letter says the promised era never came');
  t.eq(broke.claim.replyText, 'The date came and the last era did not. She left without it.', 'and so does the promises page');
  t.eq(broke.s.farewellLedger.kept + '|' + broke.s.farewellLedger.broken, '0|1', 'the ledger counts a promise broken');
  const both = exitOf(f => { promised(f); delete f.p.contract.farewellEra; delete f.p.contract.lastStage; f.p.contract.told = 'house'; });
  t.eq(both.note.shape + '|' + both.claim.resolved, 'sudden|missed', 'a broken promise and a sudden goodbye can be the same goodbye');
  t.ok(both.note.text.includes('a goodbye that fits in one afternoon. The last era the company promised her at the renewal table never came'), 'and the letter carries both');
  t.eq(both.room.join(',') + '|' + both.popDrop, both.mates.map(() => -F.brokenRoomMorale).join(',') + '|' + (C.departPopHitWarm + F.suddenPopHit), 'at both prices');
  // no promise, no settlement
  const none = exitOf();
  t.ok(none.claim === null && none.acts.length === 0, 'a lap with no promise settles nothing');
}

// released at her own request: not a completed contract, and not the lap's business
{
  const f = fork();
  t.ok(!f.p.contract.leaving, 'fixture: she has not chosen to go');
  const was = f.g.popularity;
  KP.departIdol(f.s, f.pid, 'warm', null);
  const n = f.s.inbox.find(m => m.ind === 'contractEnd');
  t.eq(n.priority + '|' + n.shape + '|' + n.warm, 'high|released|true', 'a member let go early leaves on her own letter');
  t.eq(n.text, KP.displayName(f.p) + ' asked to be released from her contract, and was. The company statement is short and kind; her own letter to the fans is longer and kinder, and neither one says why. She leaves on speaking terms with everyone in the building, which is its own kind of ending. The door stays open.',
    'which does not say the contract was completed');
  t.eq(f.p.history[f.p.history.length - 1].text, 'Released at her own request. Left ' + f.s.company.short + ' on speaking terms with everyone in it.', 'nor does her history');
  t.eq(KP.chapterLine(f.s, f.p.chapters[f.p.chapters.length - 1]), 'Released at her own request from ' + f.s.company.short + ' (' + f.g.name + ')', 'nor does her file');
  t.eq(Math.round((was - f.g.popularity) * 100) / 100, C.departPopHitWarm, 'the act pays the warm goodbye’s price');
  t.eq(Object.values(f.s.farewellLedger).reduce((a, b) => a + b, 0), 0, 'and the lap’s ledger counts nothing');

  // the meeting she called, answered "let her go": the same letter
  const w = fork();
  const sc = KP.openScene(w.s, { kind: 'walkOut', personId: w.pid, expiresWeek: w.s.week + 3 });
  const r = KP.resolveScene(w.s, sc.id, 'release');
  t.ok(r.ok && w.p.status === 'departed', 'fixture: the walkout’s release lets her go');
  t.eq(w.s.inbox.find(m => m.ind === 'contractEnd').shape, 'released', 'the walkout’s release reads as a release');

  // a cold ending keeps the words it had
  const c = fork(preExit);
  c.p.contract.leaveMode = 'cold';
  KP.departIdol(c.s, c.pid, 'cold', null);
  const cn = c.s.inbox.find(m => m.ind === 'contractEnd');
  t.eq(cn.priority + '|' + cn.shape + '|' + cn.warm, 'high|cold|false', 'a cold ending is the letter it always was');
  t.ok(cn.text.startsWith(KP.displayName(c.p) + '’s contract expired today. The statement was three sentences.'), 'three sentences');
  t.eq(c.s.farewellLedger.bows + c.s.farewellLedger.plain + c.s.farewellLedger.sudden, 0, 'and the lap’s ledger does not count it, last era or not');
}

// ---- every ending leaves a list and a lineup ----
{
  // the one sweep every lineup exit runs: who has left is an alumna, who is still in the room is not
  const f = fork();
  t.ok(!f.g.alumni, 'fixture: nobody has left the act');
  KP.lineupPointerSweep(f.s, f.g, f.pid);
  t.ok(!(f.g.alumni || []).length, 'a sweep over a member still in the lineup (the disband’s order) lists nobody');
  f.g.members = f.g.members.filter(id => id !== f.pid);
  KP.lineupPointerSweep(f.s, f.g, f.pid);
  KP.lineupPointerSweep(f.s, f.g, f.pid);
  t.eq(JSON.stringify(f.g.alumni), JSON.stringify([{ id: f.pid, week: f.s.week }]), 'once she is out of it, the sweep lists her, with the week, once');

  // each door out of a lineup
  const door = (label, go) => {
    const x = fork();
    go(x);
    t.eq(JSON.stringify(x.g.alumni), JSON.stringify([{ id: x.pid, week: x.s.week }]), 'alumni: ' + label);
    t.ok(!x.g.members.includes(x.pid) && x.g.members.length === 3 && !x.g.retiredWeek, label + ': the act goes on as three');
    t.eq(KP.validateState(x.s).length, 0, label + ': the file is valid');
    return x;
  };
  const must = r => { if (!r || r.ok === false) throw new Error('fixture: ' + (r && r.reason)); };
  door('the contract ends', x => KP.departIdol(x.s, x.pid, 'warm', null));
  door('the paper is bought out', x => { x.s.budget = 9000; must(KP.terminateContract(x.s, x.pid)); });
  const rem = door('she is removed from the lineup', x => must(KP.removeFromLineup(x.s, x.gid, x.pid)));
  t.eq(rem.p.status, 'idol', 'a member removed from the lineup is its alumna and still on the books');
  const grad = door('she graduates to her own name', x => must(KP.graduateToSolo(x.s, x.pid)));
  t.ok(grad.s.groups.some(g2 => g2.type === 'solo' && g2.originGroupId === grad.gid && g2.members[0] === grad.pid), 'and has her own act next door');

  // the disband verb: the lineup is the final lineup, nobody is an alumna
  const d = fork();
  must(KP.disbandGroup(d.s, d.gid));
  t.eq((d.g.finalLineup || []).length + '|' + (d.g.alumni || []).length + '|' + d.g.retiredWeek, '4|0|' + d.s.week, 'a disband keeps a final lineup of four and lists no alumni');

  // the last contract out: the act concludes with a lineup on the record
  const last = fork();
  const order = last.g.members.slice();
  order.slice(0, 3).forEach(id => KP.departIdol(last.s, id, 'warm', null));
  t.ok(!last.g.retiredWeek && last.g.members.length === 1, 'fixture: one member is left');
  answerAll(KP, last.s); tick(KP, last.s);
  KP.departIdol(last.s, order[3], 'warm', null);
  t.eq(last.g.retiredWeek, last.s.week, 'the last contract out concludes the act');
  t.eq(JSON.stringify(last.g.finalLineup), JSON.stringify([order[3]]), 'and the record keeps who was standing at the end');
  t.eq(JSON.stringify(last.g.alumni), JSON.stringify(order.map((id, i) => ({ id, week: i < 3 ? last.s.week - 1 : last.s.week }))), 'with all four on the list, in the order they went');
  t.eq(KP.validateState(last.s).length, 0, 'the file is valid');
}

// ---- a concluded act has no anniversary live ----
{
  const YEARS = (36 - base.s.groups.find(g => g.id === base.gid).debutWeek) / YEAR;
  t.eq(YEARS, 6, 'fixture: week 36 is the act’s sixth debut anniversary');
  const live = fork();
  const w1 = runTo(live, 36);
  t.eq(w1.filter(n => n.ind === 'anniversary' && n.groupId === live.gid).length + '|' + w1.filter(n => n.ind === 'anniversaryKept').length, '1|0',
    'fixture: a living act gets its anniversary letter that week, and no other');

  const kept = w => w.filter(n => n.ind === 'anniversaryKept');
  const gone = fork();
  const r = KP.disbandGroup(gone.s, gone.gid);
  if (!r.ok) throw new Error('fixture: ' + r.reason);
  const w2 = runTo(gone, 36);
  t.eq(w2.filter(n => n.ind === 'anniversary').length, 0, 'a concluded act gets no anniversary live: there is nobody to stream it');
  t.eq(kept(w2).length, 1, 'its fandom keeps the date instead, once');
  const n = kept(w2)[0], G = gone.g.name, FN = gone.g.fandom.name;
  t.eq([n.kind, n.priority, n.groupId, n.years].join('|'), ['public', 'normal', gone.gid, YEARS].join('|'), 'a normal letter, the act’s, counting the years');
  const LINES = [
    'It would have been ' + G + '’s 6-year anniversary week. The café banner changed at midnight anyway: ' + FN + ' keeps the archive, and the archive keeps the date.',
    G + '’s debut date came around again, 6 years on. Nobody streamed from the practice room this time. ' + FN + ' posted the old stages frame by frame, on schedule.',
    '6 years since ' + G + '’s debut stage. The group is concluded and the hashtag is not: it trended for an afternoon, mostly photographs.',
  ];
  t.ok(LINES.includes(n.text) && !noisy(n.text), 'in one of the family’s three lines: ' + n.text.slice(0, 70));

  // the fandom keeps it for a few years, not forever
  const after = (weeksAgo) => { const x = fork(); KP.disbandGroup(x.s, x.gid); x.g.retiredWeek = 36 - weeksAgo; return kept(runTo(x, 36)).length; };   // forced: when it concluded
  t.eq(after(F.memorialYears * YEAR) + '|' + after(F.memorialYears * YEAR + 1), '1|0', 'kept through the third year, and not a week past it');
  const nameless = fork();
  KP.disbandGroup(nameless.s, nameless.gid);
  delete nameless.g.fandom;   // forced: an act that never had a named fandom
  t.eq(kept(runTo(nameless, 36)).length, 0, 'an act with no named fandom has nobody to keep it');
}

// ---- old saves: a file from before the lap had a date ----
// what 0.11.9 wrote: no farewell ledger, no alumni, a final lineup only from
// the disband verb, and a lap that was two fields. The version is set by
// hand: the build's own number moves at the ship.
const oldFile = (src, mut) => {
  const o = JSON.parse(KP.serialize(src));
  o.version = '0.11.9';
  delete o.farewellLedger;
  o.groups.forEach(g => { delete g.alumni; });
  if (mut) mut(o);
  return JSON.stringify(o);
};
{
  // one member gone on the old build, the act still running
  const x = exitOf();
  const s = KP.deserialize(oldFile(x.s));
  const g = s.groups.find(y => y.id === x.gid);
  t.eq(s.version, KP.C.VERSION, 'an old file is stamped to this build on load');
  t.ok(!!s.farewellLedger && Object.values(s.farewellLedger).reduce((a, b) => a + b, 0) === 0, 'the farewell ledger arrives, all zeros');
  t.eq(JSON.stringify(g.alumni), JSON.stringify([{ id: x.pid, week: x.s.week }]), 'the alumni list is read back off her file: who, and the week she went');
  t.eq(KP.validateState(s).length, 0, 'the upgraded file is valid');
  const twice = KP.deserialize(KP.serialize(s));
  KP.migrate(twice);
  t.eq(JSON.stringify(twice.groups.find(y => y.id === x.gid).alumni), JSON.stringify(g.alumni), 'the chain run over it again changes nothing');

  // an act the old build ended with its last contract: no final lineup on file
  const last = fork();
  const order = last.g.members.slice();
  order.slice(0, 3).forEach(id => KP.departIdol(last.s, id, 'warm', null));
  answerAll(KP, last.s); tick(KP, last.s);
  KP.departIdol(last.s, order[3], 'warm', null);
  const o = KP.deserialize(oldFile(last.s, f => { f.groups.forEach(y => { delete y.finalLineup; }); }));
  const og = o.groups.find(y => y.id === last.gid);
  t.eq(JSON.stringify(og.alumni.map(a => a.id)), JSON.stringify(order), 'all four are read back, in the order they went');
  t.eq(JSON.stringify(og.finalLineup), JSON.stringify([order[3]]), 'and the act gets the final lineup it never had: whoever left last');
  t.eq(KP.validateState(o).length, 0, 'the upgraded file is valid');
  // a final lineup the disband verb wrote is left alone
  const dis = fork();
  KP.disbandGroup(dis.s, dis.gid);
  const od = KP.deserialize(oldFile(dis.s)).groups.find(y => y.id === dis.gid);
  t.eq((od.finalLineup || []).length + '|' + (od.alumni || []).length, '4|0', 'a disbanded act keeps the lineup it was given, and gains no alumni');

  // a lap in flight: two fields on the old build
  const lf = lapped();
  const ol = KP.deserialize(oldFile(lf.s, f => { delete f.people[lf.pid].contract.leavingSince; }));
  const op = ol.people[lf.pid];
  const lap = KP.lapOf(ol, op);
  t.eq(lap.ends + '|' + lap.since + '|' + lap.told, ENDS + '|null|null', 'an old lap keeps its date, and gains no week it began');
  t.eq(KP.knockCandidates(ol).filter(c => c.kind === 'farewellNews' && c.personId === lf.pid).length, 1, 'the question is still asked');
  const og2 = ol.groups.find(y => y.id === lf.gid);
  const was = og2.popularity;
  KP.departIdol(ol, lf.pid, 'warm', null);
  const n = ol.inbox.find(m => m.ind === 'contractEnd');
  t.eq(n.shape + '|' + Math.round((was - og2.popularity) * 100) / 100, 'plain|' + C.departPopHitWarm, 'and a goodbye the old build began is never charged as sudden');
}

// ---- the read: one truth for Today's card and the file's line ----
{
  const one = f => KP.farewellRead(f.s).filter(r => r.personId === f.pid)[0];
  t.eq(KP.farewellRead(fork().s).length, 0, 'nobody on a lap: nothing to read');
  const f = lapped();
  const before = JSON.stringify(f.s);
  const r = one(f);
  t.eq(JSON.stringify(f.s), before, 'the read writes nothing');
  t.eq([r.groupId, r.ends, r.weeksLeft, r.mode, String(r.told), r.opens, r.era, r.promise].join('|'), [f.gid, ENDS, ENDS - f.s.week, 'warm', 'null', WINDOW, 'open', false].join('|'),
    'the lap, the week her window opens, and where her last era stands');
  t.eq(r.toldWord + ' / ' + r.eraWord, 'the fans have not been told / a record that lands from ' + KP.weekLabel(WINDOW).text + ' on will be her last era', 'in words: untold, and the window still ahead');
  // how the telling reads
  const word = mut => { const x = lapped(); mut(x); return one(x).toldWord; };
  t.eq(word(x => { x.p.contract.told = 'house'; }), 'kept in the house until her last era is announced', 'kept in the house');
  t.eq(word(x => { x.p.contract.told = 'fans'; x.p.contract.toldWeek = 3; }), 'the fans know: she told them ' + KP.weekLabel(3).text, 'told by her, with the week');
  t.eq(word(x => { x.p.contract.told = 'era'; x.p.contract.toldWeek = 62; }), 'the fans know: announced with her last era', 'told by the era');
  const cold = one(lapped('cold'));
  t.eq(cold.toldWord + '|' + cold.era + '|' + cold.eraWord, 'leaving cold: there is no goodbye to stage|none|', 'a cold ending has nothing to stage');
  // where her last era stands
  const era = x => { const y = one(x); return y.era + ' / ' + y.eraWord; };
  t.eq(era(houseLate), 'open / a record that lands by ' + KP.weekLabel(ENDS).text + ' will be her last era', 'inside the window, the deadline is the week she goes');
  const locked = fork(houseLate);
  lock(locked, 70);
  t.eq(era(locked), 'locked / her last era is locked: it lands ' + KP.weekLabel(70).text, 'locked, with its date');
  t.eq(era(lastEra), 'landed / her last era has landed', 'landed');
  t.eq(era(preExit), 'landed / her last era has landed, and her last stage is on file', 'landed, with her last stage on file');
  const late = fork(houseLate);
  late.p.contract.start -= (late.p.contract.start + C.years * YEAR) - (late.s.week + KP.C.DEBUT.prepWeeksMin - 1);   // forced: her clock
  t.eq(KP.lapOf(late.s, late.p).ends - late.s.week, KP.C.DEBUT.prepWeeksMin - 1, 'fixture: one week short of the shortest runway');
  t.eq(era(late), 'late / no record can land before she goes now', 'out of time');
  late.p.contract.start += 1;
  t.eq(one(late).era, 'open', 'with exactly the shortest runway left, a record can still land');
  // the promise shows while it is open
  const pr = lapped();
  KP.farewellPromise(pr.s, pr.p);
  t.eq(one(pr).promise, true, 'a promise made at the table shows on the read');
  // two laps, soonest first
  const two = lapped();
  const o = others(two)[0];
  o.contract.start = two.p.contract.start - 10;
  KP.beginLap(two.s, o, 'warm');
  t.eq(KP.farewellRead(two.s).map(x => x.personId).join(','), o.id + ',' + two.pid, 'two laps read soonest first');
}

// ---- the screens: Today, the file, the group page, the alumni, the archive ----
// the stub's own engine reads a save of each fixture
{
  const dom = require('./dom_stub');
  const D = dom.load();
  const K = D.KP, App = D.App, el = D.el;
  const load = x => { const s = K.deserialize(KP.serialize(x.s)); return { s, g: s.groups.find(y => y.id === x.gid), p: s.people[x.pid] }; };
  const page = (s, tab, sub) => { App.state = s; App.mode = 'game'; App.tab = tab; App.view = null; if (sub) App.deskSub = sub; App.render(); return el('screen').innerHTML; };
  const text = h => dom.stripTags(h).replace(/\s+/g, ' ');
  const clean = h => !/undefined|NaN|\{she\}|\{her\}|\{pos\}|\{Pos\}/.test(h);
  const opens = (h, id) => dom.actionsIn(h).filter(a => a.action === 'open-dossier' && a.dataset.id === id).length;

  // a lap with a promise, week 2
  const a = lapped();
  KP.farewellPromise(a.s, a.p);
  const A = load(a);
  const N = K.displayName(A.p), LEAVES = K.weekLabel(ENDS).text;
  let h = page(A.s, 'desk', 'today');
  t.ok(clean(h), 'Today renders clean with a lap on it');
  t.ok(text(h).includes('The last year · ' + N + ' · ' + A.g.name + ' Her contract ends ' + LEAVES + ' · the fans have not been told · a record that lands from ' + K.weekLabel(WINDOW).text + ' on will be her last era'),
    'Today carries the last year: who, the date, the telling, the window');
  t.ok(text(h).includes((ENDS - A.s.week) + ' weeks left') && text(h).includes('promised at the table: a last era'), 'with the weeks left and the promise');
  t.ok(opens(h, A.p.id) >= 1, 'and the card opens her file');
  t.ok(!text(page(load(fork()).s, 'desk', 'today')).includes('The last year'), 'no lap, no card');
  h = page(A.s, 'talent', 'roster');
  t.ok(text(h).includes('final term · leaves ' + LEAVES), 'the roster row carries the date');
  h = D.UI.renderDossier(A.s, A.p.id);
  t.ok(clean(h) && text(h).includes('final term · leaves ' + LEAVES + ' · the fans have not been told · a record that lands from ' + K.weekLabel(WINDOW).text + ' on will be her last era'),
    'her file carries the lap on the contract line');
  t.ok(text(h).includes('Artist file') && !text(h).includes('Alumni file'), 'and is still an artist’s file');

  // the promise with no time left to keep it
  const lateFix = lapped();
  KP.farewellPromise(lateFix.s, lateFix.p);
  lateFix.p.contract.start -= (lateFix.p.contract.start + C.years * YEAR) - (lateFix.s.week + 2);   // forced: two weeks left
  h = page(load(lateFix).s, 'desk', 'today');
  t.ok(text(h).includes('no record can land before she goes now') && text(h).includes('the promised last era will not happen'), 'a promise that can no longer be kept says so on Today');
  // and one already kept
  const keptFix = fork(preExit);
  KP.farewellPromise(keptFix.s, keptFix.p);
  h = page(load(keptFix).s, 'desk', 'today');
  t.ok(text(h).includes('her last era has landed, and her last stage is on file') && text(h).includes('the promise at the table: kept when she goes'), 'a promise her last era has kept says so');

  // after she goes
  const gone = exitOf();
  const G = load(gone);
  h = page(G.s, 'desk', 'today');
  t.ok(clean(h) && !text(h).includes('The last year'), 'once she is gone the card is gone');
  h = D.UI.renderGroupPage(G.s, G.g);
  t.ok(clean(h) && text(h).includes('Former members · 1') && text(h).includes(N + ' · left ' + K.weekLabel(gone.s.week).text), 'the act’s page lists her as a former member, with the week');
  t.eq(opens(h, G.p.id), 1, 'and the name opens her file');
  t.ok(text(h).includes(K.publicGiven(G.p) + '’s last era'), 'the discography marks whose last era the record was');
  h = page(G.s, 'talent', 'roster');
  t.ok(clean(h) && text(h).includes('Alumni · 1') && text(h).includes(N + ' Contract completed at ' + G.s.company.short + ' (' + G.g.name + ') · ' + K.weekLabel(gone.s.week).text),
    'the Talent tab lists the alumni, with how and when she left');
  t.ok(opens(h, G.p.id) >= 1, 'and the row opens her file');
  h = D.UI.renderDossier(G.s, G.p.id);
  t.ok(clean(h) && text(h).includes('Alumni file') && text(h).includes('Departed ' + K.weekLabel(gone.s.week).text + ' · the file stays open forever'), 'which is named as an alumni file');
  t.ok(!text(page(load(fork()).s, 'talent', 'roster')).includes('Alumni'), 'no alumni, no list');
  t.ok(!text(D.UI.renderGroupPage(load(fork()).s, load(fork()).g)).includes('Former members'), 'and no former members on an act nobody has left');

  // an act concluded by its last contract
  const last = fork();
  const order = last.g.members.slice();
  order.forEach(id => { KP.beginLap(last.s, last.s.people[id], 'warm'); last.s.people[id].contract.told = 'fans'; });   // forced: all four chose to go
  order.slice(0, 3).forEach(id => KP.departIdol(last.s, id, 'warm', null));
  answerAll(KP, last.s); tick(KP, last.s);
  KP.departIdol(last.s, order[3], 'warm', null);
  const L = load(last);
  h = page(L.s, 'groups');
  t.ok(clean(h) && text(h).includes('Concluded ' + K.weekLabel(last.s.week).text + ' · one member at the end · 3 before · ' + L.g.releases.length + ' releases'),
    'the archive card counts who was there at the end and who went before (it read “0 members”)');
  t.eq(dom.actionsIn(h).filter(x => x.action === 'open-grouppage' && x.dataset.id === L.g.id).length, 1, 'and the card opens the record (nothing did)');
  h = D.UI.renderGroupPage(L.s, L.g);
  const T = text(h);
  t.ok(clean(h) && T.includes('The final lineup · 1') && T.includes('Former members · 3') && T.includes('Discography'), 'the record: the final lineup, the former members, the discography');
  t.ok(T.includes(K.displayName(L.s.people[order[3]]) + ' · contract completed at ' + L.s.company.short + ' (' + L.g.name + ')') && !T.includes('still with the company'),
    'the last one standing is read off her own file, not called “still with the company”');
  t.eq(order.map(id => opens(h, id)).join(','), '1,1,1,1', 'all four names open their files');

  // an act the disband verb concluded: the lineup stayed with the company
  const dis = fork();
  KP.disbandGroup(dis.s, dis.gid);
  const Dd = load(dis);
  h = D.UI.renderGroupPage(Dd.s, Dd.g);
  t.ok(clean(h) && text(h).includes('The final lineup · 4') && (text(h).match(/still with the company/g) || []).length === 4 && !text(h).includes('Former members'),
    'a disbanded act’s four are still with the company, and it has no former members');
  t.ok(text(page(Dd.s, 'groups')).includes('4 members at the end ·'), 'its archive card counts four');
}

t.finish();
