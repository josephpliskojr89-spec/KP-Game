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

t.finish();
