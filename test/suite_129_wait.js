/* Suite 129 — the wait (v0.11.19, §110: the absences, part two).
   A service has three marks between the gates, read from the fandom's
   side: day 100, when its project gets a name and a count; the half,
   when he writes from the base; D-100, when the countdown turns and the
   return is said ahead of time. The group page carries a service map and
   his file says where he is in the wait.

   Laws (§99): the wire is read before the trim; a fixture forces every
   gate and rolls nothing; a missing letter fails by name. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const KP = loadEngine();
const t = makeT('suite_129_wait');
const M = KP.C.MIL, H = KP.C.HIATUS;
const HALF = Math.floor(M.serviceWeeks / 2);

// ---- the kit ----------------------------------------------------------------
function boys(seed, ages, name) {
  const state = KP.newGame(seed, null, { legacy: false });
  state.budget = 9000;
  const rng = KP.rngFor(state);
  const ids = [];
  for (let i = 0; i < ages.length; i++) {
    const b = KP.generatePerson(rng, { status: 'trainee', gender: 'm' });
    b.signedWeek = 1;
    state.people[b.id] = b; state.roster.push(b.id); ids.push(b.id);
  }
  state.rngState = rng.state();
  state.nextPersonId = KP.peekNextId();
  const nm = name || 'GARRISON';
  KP.openMandate(state, { kind: ages.length === 1 ? 'solo' : 'group', gender: 'm', source: 'fixture greenlight' });
  KP.proposeGroup(state, nm, ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups.find(x => x.name === nm);
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 14) KP.advanceWeek(state);
  guard = 0;
  while ((g.prep || state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) && guard++ < 40) KP.advanceWeek(state);
  ids.forEach((id, i) => { state.people[id].age = ages[i]; });
  return { state, g, ids, men: ids.map(id => state.people[id]), ages };
}
// one week, and what it wrote before the trim. Doors are answered with their
// first option so nothing else in the building stalls; the men at home are
// held at their fixture ages so only the fixture decides who goes.
function tick(f) {
  const s = f.state;
  (s.scenes || []).slice().forEach(sc => { const d = KP.sceneDef(sc.kind); if (d && sc.kind !== 'enlistPapers' && sc.kind !== 'servicePlan') KP.resolveScene(s, sc.id, d.options(s, sc)[0].id); });
  f.men.forEach((m, i) => { if (!KP.inService(m) && !m.serviceDone && f.hold !== false) m.age = Math.min(m.age, f.ages[i]); });
  KP.advanceWeek(s);
  return (KP.lastTickNotes || []).slice();
}
function ride(f, weeks) { let all = []; for (let i = 0; i < weeks; i++) all = all.concat(tick(f)); return all; }
function rideTo(f, week) { let all = []; let guard = 0; while (f.state.week < week && guard++ < 200) all = all.concat(tick(f)); return all; }
const firstOf = (list, ind) => (list || []).find(n => n.ind === ind) || {};
const allOf = (list, ind) => (list || []).filter(n => n.ind === ind);
const txt = n => String((n && n.text) || '');
const mil = p => (p && p.flags && p.flags.military) || {};
const led = state => state.serviceLedger || {};
const when = w => KP.weekLabel(w).text;
// the wall takes him this tick: no door, no roll
function wall(f, man) { const i = f.men.indexOf(man); f.ages[i] = M.deadlineAge; man.age = M.deadlineAge; return tick(f); }
const projOf = (f, week) => KP.waitProject(f.state, f.g, (f.g.wait || {}).since, week, (f.g.wait || {}).count) || { def: { so: () => '', end: () => '' } };
const at = (state, week) => Object.assign({}, state, { week });   // the same world, read at another week (reads only)

// ---- A. the shape ---------------------------------------------------------------
{
  ['waitRead', 'waitNextWords', 'waitProject', 'waitHundredText', 'baseLetterText', 'waitTurnRead', 'waitTurnText'].forEach(k =>
    t.ok(typeof KP[k] === 'function', 'the module carries KP.' + k));
  t.ok(HALF > M.hundredWeeks && M.serviceWeeks - M.turnWeeks > HALF, 'a full service holds its three marks in order');
  const s = KP.newGame('wait-shape', null, { legacy: false });
  KP.advanceWeek(s);
  ['hundred', 'wrote', 'turn'].forEach(k => t.eq(led(s)[k], 0, 'the service ledger carries ' + k + ' from the first week, at zero'));
  t.eq(KP.waitRead(s, Object.values(s.people)[0]), null, 'somebody who is not away has no wait to read');
  t.eq(KP.waitNextWords(s, Object.values(s.people)[0]), '', 'and no next mark');
}

// ---- B. the read ------------------------------------------------------------------
{
  const f = boys('wait-read', [24, 23, 23, 22]);
  const { state, g } = f, man = f.men[0];
  g.servicePlan = 'stagger';
  wall(f, man);
  const since = state.week;
  t.eq(JSON.stringify(mil(man)), JSON.stringify({ since, until: since + M.serviceWeeks, how: 'wall' }), 'the service records how he went: the wall');
  const r = KP.waitRead(state, man) || {};
  t.eq(JSON.stringify(r.marks), JSON.stringify([{ kind: 'hundred', week: since + M.hundredWeeks }, { kind: 'half', week: since + HALF },
    { kind: 'turn', week: since + M.serviceWeeks - M.turnWeeks }, { kind: 'gate', week: since + M.serviceWeeks }]), 'three marks between the gates, and the gate');
  t.eq([r.since, r.until, r.total, r.served, r.left, r.how].join('|'), [since, since + M.serviceWeeks, M.serviceWeeks, 0, M.serviceWeeks, 'wall'].join('|'), 'where he is in it');
  t.eq(JSON.stringify(r.next), JSON.stringify({ kind: 'hundred', week: since + M.hundredWeeks }), 'the next mark is day 100');
  t.eq(JSON.stringify(r.at), '[]', 'no mark falls on the week he leaves');
  t.eq(KP.waitNextWords(state, man), 'day 100 of the wait, in ' + M.hundredWeeks + ' weeks', 'the next mark in the page’s words');
  const before = KP.serialize(state);
  KP.waitRead(state, man); KP.waitNextWords(state, man); KP.waitProject(state, g, since); KP.waitTurnRead(state, g, [man]);
  t.eq(KP.serialize(state), before, 'the reads change nothing');
  // read at other weeks
  const rd = w => KP.waitRead(at(state, w), man) || {};
  t.eq(JSON.stringify(rd(since + M.hundredWeeks).at), '["hundred"]', 'day 100 falls on its week');
  t.eq(JSON.stringify(rd(since + M.hundredWeeks - 1).at) + JSON.stringify(rd(since + M.hundredWeeks + 1).at), '[][]', 'and on no other');
  t.eq(rd(since + M.hundredWeeks).next.kind, 'half', 'after day 100 the next mark is the half');
  t.eq(KP.waitNextWords(at(state, since + HALF - 1), man), 'his letter from the base, in 1 week', 'one week is one week');
  t.eq(KP.waitNextWords(at(state, since + HALF), man), 'the countdown turns, in ' + (M.serviceWeeks - M.turnWeeks - HALF) + ' weeks', 'after the half, the turn');
  t.eq(KP.waitNextWords(at(state, since + M.serviceWeeks - 3), man), 'the gate, in 3 weeks', 'after the turn, the gate');
  t.eq(KP.waitNextWords(at(state, since + M.serviceWeeks), man), 'the gate, this week', 'and the gate’s own week');
  t.eq([rd(since + 20).served, rd(since + 20).left].join('|'), '20|' + (M.serviceWeeks - 20), 'served and left add up');
  // a service too short to hold the marks in order has only its gate
  const short = n => { const c = KP.deserialize(KP.serialize(state)); const m = c.people[man.id]; m.flags.military.until = m.flags.military.since + n; return (KP.waitRead(c, m) || {}).marks || []; };
  t.eq(short(2 * M.hundredWeeks + 1).map(k => k.kind).join(','), 'gate', 'a service whose half would land on day 100 has no marks');
  t.eq(short(2 * M.hundredWeeks + 2).map(k => k.kind + '@' + (k.week - since)).join(','), 'hundred@14,half@15,turn@16,gate@30', 'the shortest service that holds them, holds them in order');
  t.eq(short(5).map(k => k.kind).join(','), 'gate', 'a fixture’s three-week service has only its gate');
}
{
  // how he went: the papers answered "now", and together
  const f = boys('wait-how-now', [M.noticeAge, 22, 22, 21]);
  const { state, g } = f, man = f.men[0];
  g.servicePlan = 'stagger';
  let guard = 0;
  while (!(state.scenes || []).some(sc => sc.kind === 'enlistPapers') && guard++ < 12) tick(f);
  const papers = (state.scenes || []).find(sc => sc.kind === 'enlistPapers') || {};
  t.eq(papers.personId, man.id, 'fixture: his papers are on the desk');
  KP.resolveScene(state, papers.id, 'now');
  t.eq(mil(man).how, 'now', 'sent now, the service records it');
}
{
  const f = boys('wait-how-together', [26, 25, 24, 24]);
  f.g.servicePlan = 'together'; f.g.pendingService = true;
  tick(f);
  t.eq(f.men.map(m => mil(m).how).join(','), 'together,together,together,together', 'gone together, each man’s service records it');
}

// ---- C. the project (pure) ---------------------------------------------------------
{
  const f = boys('wait-project', [24, 23, 23, 22]);
  const { state, g } = f;
  g.popularity = 40; g.fandom = { name: 'AURAINE', color: 'pearl ivory', since: state.week, intensity: 20 };
  // one project per chapter, by hash: over forty opening weeks every kind turns up
  const seen = {};
  for (let since = 1; since <= 40; since++) {
    const p = KP.waitProject(at(state, since + 14), g, since);
    seen[p.key] = p;
    t.ok(KP.waitProject(at(state, since + 30), g, since).key === p.key, 'a chapter keeps its project (opened week ' + since + ')');
  }
  t.eq(Object.keys(seen).sort().join(','), 'cranes,forest,letters,rice', 'four projects, and each one turns up');
  ['letters', 'cranes', 'forest', 'rice'].forEach(k => { seen[k] = seen[k] || { def: { so: () => '', end: () => '' } }; });   // a missing one fails below by name
  // the count: weeks waited x the project's rate x (1 + popularity/20 + intensity/20)
  t.eq([seen.letters.count, seen.cranes.count, seen.forest.count, seen.rice.count].join('|'), [14 * 30 * 4, 14 * 45 * 4, 14 * 3 * 4, 14 * 2 * 4].join('|'),
    'the count is the weeks waited, the project’s rate, and how big and how warm the fandom is');
  t.eq([seen.letters.said, seen.cranes.said, seen.forest.said, seen.rice.said].join('|'), '1,680 letters|2,520 cranes|168 trees|112 sacks', 'said with its unit and a thousands mark');
  t.eq([seen.letters.name, seen.cranes.name, seen.forest.name, seen.rice.name].join('|'), 'the letter drive|the paper cranes|the forest|the rice', 'each has a name');
  const quiet = Object.assign({}, g, { popularity: 0, fandom: null });
  // a chapter whose project is the forest (week 1 stands in if none is: the checks then fail by name)
  const sinceL = [...Array(40).keys()].map(i => i + 1).find(w => (KP.waitProject(at(state, w + 14), g, w) || {}).key === 'forest') || 1;
  const pr = (...args) => KP.waitProject(...args) || {};
  t.eq(pr(at(state, sinceL + 14), quiet, sinceL).count, 14 * 3, 'an act nobody is watching still gets the bare rate');
  t.eq(pr(at(state, sinceL), quiet, sinceL).said, '1 tree', 'never less than one, and one is one');
  // a count that was said is never said smaller
  t.eq(pr(at(state, sinceL + 14), quiet, sinceL, sinceL + 14, 500).count, 500, 'a count a letter gave is the floor of the next one');
  t.eq(pr(at(state, sinceL + 14), g, sinceL, sinceL + 14, 100).count, 168, 'and a bigger truth passes it');
  t.eq(KP.waitProject(state, null, 5), null, 'no act, no project');
  t.eq(KP.waitProject(state, g, null), null, 'no chapter, no project');
  // what each one is, said of one man and of several, in the fandom's color
  const one = { many: false, pos: 'his', color: 'pearl ivory' }, many = { many: true, pos: 'their', color: 'pearl ivory' };
  t.eq(seen.cranes.def.so(one), 'folded in pearl ivory and kept in somebody’s spare room', 'the cranes are in the fandom’s color');
  t.eq(seen.forest.def.so(one) + '|' + seen.forest.def.so(many), 'planted in his name on a hillside none of them have seen|planted in their names on a hillside none of them have seen', 'the forest is in his name, or theirs');
  t.eq(seen.rice.def.so(one) + '|' + seen.rice.def.so(many), 'given in his name to a kitchen that knows the name by now|given in their names to a kitchen that knows the names by now', 'and so is the rice');
  t.ok(['letters', 'cranes', 'forest', 'rice'].every(k => typeof seen[k].def.end(one) === 'string' && seen[k].def.end(one).length > 10), 'each has a closing line');
}

// ---- the project's words, in the letter (pure) -----------------------------------------
{
  const f = boys('wait-words', [24, 24, 23, 22]);
  const { state, g } = f, a = f.men[0], b = f.men[1];
  // both away from this week: set by hand, and only read
  [a, b].forEach(m => { m.flags.military = { since: state.week, until: state.week + M.serviceWeeks, how: 'wall' }; });
  const projBy = (gg, key) => {
    for (let since = 1; since <= 80; since++) { const p = KP.waitProject(at(state, since + 14), gg, since); if (p && p.key === key) return p; }
    return { name: '?', said: '?', def: { so: () => '?', end: () => '?' } };
  };
  const named = Object.assign({}, g, { fandom: { name: 'AURAINE', color: 'pearl ivory', since: 1, intensity: 20 } });
  const bare = Object.assign({}, g, { fandom: null });
  const h = (gg, men, key) => KP.waitHundredText(state, gg, men, projBy(gg, key));
  t.ok(h(named, [a], 'cranes').includes('folded in pearl ivory and kept in somebody’s spare room'), 'the cranes are folded in the fandom’s own color');
  t.ok(h(bare, [a], 'cranes').includes('folded in the lightstick’s color and kept'), 'and in the lightstick’s when the fandom has none');
  t.ok(h(named, [a], 'forest').includes('planted in his name on a hillside'), 'one man: the forest is in his name');
  t.ok(h(named, [a, b], 'forest').includes('planted in their names on a hillside'), 'two men: in their names');
  t.ok(h(named, [a, b], 'rice').includes('given in their names to a kitchen that knows the names by now'), 'and the kitchen knows both');
  t.ok(h(named, [a], 'letters').includes(' fell this week. AURAINE’s project for it has a name now, the letter drive: '), 'the project is the fandom’s, by its name');
  t.ok(h(bare, [a], 'letters').includes(' fell this week. The fan cafés’ project for it has a name now, the letter drive: '), 'or the fan cafés’ when it has none');
  // the verb agrees with the project
  const turn = key => KP.waitTurnText(state, named, [a], projBy(named, key));
  t.ok(turn('cranes').includes(' The paper cranes stand at ') && !turn('cranes').includes('cranes stands'), 'the paper cranes stand');
  t.ok(turn('letters').includes(' The letter drive stands at ') && turn('forest').includes(' The forest stands at ') && turn('rice').includes(' The rice stands at '), 'the letter drive, the forest and the rice each stands');
}
{
  // a count a letter gave is the floor of the next one, through the real letters
  const f = boys('wait-floor', [24, 23, 23, 22]);
  const { state, g } = f, man = f.men[0];
  g.servicePlan = 'stagger';
  wall(f, man);
  const since = state.week;
  const loud = () => { g.popularity = 100; g.fandom = { name: 'AURAINE', color: 'pearl ivory', since: 1, intensity: 100 }; };
  const quiet = () => { g.popularity = 0; g.fandom.intensity = 0; };
  rideTo(f, since + M.hundredWeeks - 1);
  loud();
  const h = firstOf(tick(f), 'waitHundred');
  const n100 = Number(((txt(h).match(/: ([\d,]+) [a-z]+ so far/) || [])[1] || '0').replace(/,/g, ''));
  t.ok(n100 > 0, 'fixture: day 100 gave a count (' + n100 + ')');
  rideTo(f, since + M.serviceWeeks - M.turnWeeks - 1);
  quiet();
  const tn = firstOf(tick(f), 'waitTurn');
  const nTurn = Number(((txt(tn).match(/ stands at ([\d,]+) /) || [])[1] || '0').replace(/,/g, ''));
  const bareNow = KP.waitProject(state, g, since, state.week, 0).count;
  t.ok(bareNow < n100, 'fixture: with the act gone quiet, the bare count today is smaller than the one said at day 100 (' + bareNow + ')');
  t.eq(nTurn, n100, 'the turn does not say a smaller count than day 100 did');
}

// ---- D. a stagger, the act working: day 100, the half, the turn, the gate ------------------
{
  const f = boys('wait-stagger', [24, 23, 23, 22]);
  const { state, g } = f, man = f.men[0];
  g.servicePlan = 'stagger';
  wall(f, man);
  const since = state.week, until = since + M.serviceWeeks, NAME = KP.displayName(man);
  // day 100
  const pre = rideTo(f, since + M.hundredWeeks - 1);
  t.eq(allOf(pre, 'waitHundred').length, 0, 'nothing is said before day 100');
  t.ok(!(g.wait || {}).count, 'and the chapter holds no count yet');
  const w100 = tick(f);
  const h = firstOf(w100, 'waitHundred');
  const p100 = projOf(f);
  t.eq([h.priority, h.kind, h.groupId, h.personId].join('|'), ['normal', 'public', g.id, man.id].join('|'), 'day 100 is a normal public letter that carries the act and the man');
  t.eq(txt(h), 'The hundredth day of the wait for ' + NAME + ' fell this week. The fan cafés’ project for it has a name now, ' + p100.name + ': ' +
    p100.said + ' so far, ' + p100.def.so({ many: false, pos: 'his', color: 'the lightstick’s color' }) + '. He is home ' + when(until) +
    ', and GARRISON works as three until then.', 'it names the project, its count, when he is home and how the act works until then');
  t.eq((g.wait || {}).count, p100.count, 'the chapter keeps the count the letter gave');
  t.eq(led(state).hundred, 1, 'the ledger counts it');
  t.eq(allOf(ride(f, 3), 'waitHundred').length, 0, 'said once');
  const react = KP.feedReactionFor('waitHundred');
  t.ok(react && /GARRISON/.test((react(state, h, { pick: xs => xs[0] }) || {}).text || '') && /D\+100/.test((react(state, h, { pick: xs => xs[0] }) || {}).text || ''), 'the timeline counts the day');
  // the half
  rideTo(f, since + HALF - 1);
  f.men.slice(1).forEach(m => { m.morale = 50; });
  const twin = { state: KP.deserialize(KP.serialize(state)), ages: f.ages.slice(), hold: f.hold };
  twin.g = twin.state.groups.find(x => x.id === g.id); twin.men = f.ids.map(id => twin.state.people[id]);
  const keep = M.halfMorale;
  let twinWire;
  try { M.halfMorale = 0; twinWire = tick(twin); } finally { M.halfMorale = keep; }
  const wHalf = tick(f);
  const b = firstOf(wHalf, 'baseLetter');
  t.eq([b.priority, b.kind, b.groupId, b.personId].join('|'), ['high', 'company', g.id, man.id].join('|'), 'the letter from the base is a high company letter that carries him');
  t.ok(txt(b).startsWith('A letter came from the base in ' + NAME + '’s handwriting, ' + HALF + ' weeks in and ' + (M.serviceWeeks - HALF) + ' weeks to go. '), 'it says how far in he is');
  t.ok(['He asks what the group is working on, and then says not to tell him.', 'He asks who has his spot in the formation, and then says he does not want to know.']
    .some(x => txt(b).includes(x)), 'with no record out since he left, he asks about the work');
  t.ok(txt(b).includes(' He went at the wall, and writes that the ones who went early are already home. He does not make more of it than that.'), 'he went at the wall, and it is in the letter');
  t.ok(txt(b).includes(' He signs it with his name and the date, the way the base teaches.'), 'a man with nothing on his ledger signs it plainly');
  t.ok(txt(b).endsWith(' The room read it standing up.'), 'and the room at home read it');
  t.ok(!/\{|\}/.test(txt(b)), 'no pronoun token is left in it');
  t.eq(f.men.slice(1).map((m, i) => Math.round((m.morale - twin.men[i + 1].morale) * 100) / 100).join(','), [M.halfMorale, M.halfMorale, M.halfMorale].join(','),
    'the three at home are lifted by the letter, and by exactly that');
  t.eq(firstOf(twinWire, 'baseLetter').ind, 'baseLetter', 'fixture: the twin got the same letter');
  t.ok((man.history || []).some(x => x.week === state.week && x.text === 'Wrote to the company from the base, at the half of the service.'), 'the letter is on his file');
  t.eq(led(state).wrote, 1, 'the ledger counts it');
  t.eq(allOf(ride(f, 3), 'baseLetter').length, 0, 'written once');
  // the turn
  const preTurn = rideTo(f, until - M.turnWeeks - 1);
  t.eq(allOf(preTurn, 'waitTurn').length, 0, 'the countdown does not turn early');
  const said100 = (g.wait || {}).count;
  const wTurn = tick(f);
  const tn = firstOf(wTurn, 'waitTurn');
  const pT = projOf(f);
  t.eq([tn.priority, tn.kind, tn.groupId, tn.personId].join('|'), ['high', 'public', g.id, man.id].join('|'), 'the turn is high when the act is whole once he is home');
  t.eq(txt(tn), 'The countdown accounts turned their counters over this week: a hundred days until ' + NAME + ' is home, ' + when(until) + '. ' +
    pT.name.charAt(0).toUpperCase() + pT.name.slice(1) + (pT.def.plural ? ' stand at ' : ' stands at ') + pT.said + '. That week GARRISON is whole, and a window opens for ' + M.returnWindowWeeks +
    ' weeks: a record locked inside it is THE RETURN. A record locked before he is home is a comeback like any other.',
    'it says when he is home, what the project stands at, and the return’s rule ahead of time');
  t.ok(pT.count >= said100 && (g.wait || {}).count === pT.count, 'the count has not shrunk, and the chapter keeps the new one');
  t.eq(led(state).turn, 1, 'the ledger counts it');
  const reactT = KP.feedReactionFor('waitTurn');
  t.ok(reactT && /D-100/.test((reactT(state, tn, { pick: xs => xs[0] }) || {}).text || ''), 'the timeline turns its counter too');
  // the gate: the ceremony reads the project
  const saidTurn = (g.wait || {}).count;
  const wGate = rideTo(f, until);
  const c = firstOf(wGate, 'wholeAgain');
  const closed = (txt(c).match(/closed at ([\d,]+) /) || [])[1];
  t.ok(txt(c).startsWith('GARRISON is whole again. ' + NAME + ' came through the gate this week, ' + M.serviceWeeks + ' weeks after he went in. ' +
    pT.name.charAt(0).toUpperCase() + pT.name.slice(1) + ' closed at '), 'the ceremony reads the project’s last count');
  t.ok(closed && Number(closed.replace(/,/g, '')) >= saidTurn, 'and it is not smaller than the last one said (' + closed + ')');
  t.ok(txt(c).includes(' ' + pT.def.end({ many: false, pos: 'his', color: '' }) + ' The next date this company announces'), 'with the project’s own closing line, before the window');
  t.eq(allOf(wGate, 'waitHundred').length + allOf(wGate, 'baseLetter').length + allOf(wGate, 'waitTurn').length, 0, 'and nothing else of the wait is said after the turn');
  t.eq([led(state).hundred, led(state).wrote, led(state).turn].join('|'), '1|1|1', 'one man, one of each');
}

// ---- E. the base letter, read from his file (pure) ----------------------------------------
{
  const f = boys('wait-letter', [24, 23, 23, 22]);
  const { state, g } = f, man = f.men[0];
  g.servicePlan = 'stagger';
  wall(f, man);
  const since = state.week;
  rideTo(f, since + HALF);
  const letter = (st, gg, mm, men) => KP.baseLetterText(st, gg, mm, men || [mm]);
  const fork = () => { const s = KP.deserialize(KP.serialize(state)); return { s, g: s.groups.find(x => x.id === g.id), m: s.people[man.id] }; };
  // a record out since he left: he heard it, and where it peaked if it charted
  const withRel = rel => Object.assign({}, g, { releases: (g.releases || []).concat([rel]) });
  const hit = letter(state, withRel({ week: since + 9, songTitle: 'Glass Harbor', chartPeak: 3 }), man);
  t.ok(/‘Glass Harbor’/.test(hit) && /peaked at #3/.test(hit), 'a record out since he left: he heard it, and he knows where it peaked');
  const deep = letter(state, withRel({ week: since + 9, songTitle: 'Glass Harbor', chartPeak: 21 }), man);
  t.ok(/‘Glass Harbor’/.test(deep) && !/peaked at/.test(deep), 'outside the top twenty nobody told him a number');
  const none = letter(state, withRel({ week: since + 9, songTitle: 'Glass Harbor', chartPeak: null }), man);
  t.ok(/‘Glass Harbor’/.test(none) && !/peaked at/.test(none), 'and a record that never charted has none');
  const old = letter(state, withRel({ week: since, songTitle: 'Glass Harbor', chartPeak: 3 }), man);
  t.ok(!/Glass Harbor/.test(old) && /He asks /.test(old), 'a record from before he left is not news to him');
  const two = letter(state, withRel({ week: since + 4, songTitle: 'First One', chartPeak: 9 }).releases.length
    ? Object.assign({}, g, { releases: (g.releases || []).concat([{ week: since + 4, songTitle: 'First One', chartPeak: 9 }, { week: since + 20, songTitle: 'Second One', chartPeak: 12 }]) }) : g, man);
  t.ok(/‘Second One’/.test(two) && !/First One/.test(two), 'he writes about the latest one');
  // both tellings of each family turn up, and only those
  const fam = (lines, make) => {
    const seen = new Set();
    for (let w = 0; w < 40; w++) { const x = make(at(state, state.week + w)); const hitLine = lines.find(l => x.includes(l)); seen.add(hitLine || '?'); }
    return [...seen].sort().join(' / ');
  };
  t.eq(fam(['He asks what the group is working on, and then says not to tell him.', 'He asks who has his spot in the formation, and then says he does not want to know.'], st => letter(st, g, man)),
    ['He asks what the group is working on, and then says not to tell him.', 'He asks who has his spot in the formation, and then says he does not want to know.'].sort().join(' / '),
    'two ways of asking, by the week, and no third');
  t.eq(fam(['He heard ‘Glass Harbor’ on the canteen television', 'Somebody on the base played ‘Glass Harbor’ off a phone'], st => letter(st, withRel({ week: since + 9, songTitle: 'Glass Harbor', chartPeak: 3 }), man)),
    ['He heard ‘Glass Harbor’ on the canteen television', 'Somebody on the base played ‘Glass Harbor’ off a phone'].sort().join(' / '), 'two ways of hearing it');
  // how he went
  { const x = fork(); x.m.flags.military.how = 'now';
    t.ok(letter(x.s, x.g, x.m).includes(' He went early, and writes that he is glad of it on most days.') && !/at the wall/.test(letter(x.s, x.g, x.m)), 'sent early, he says so'); }
  { const x = fork(); delete x.m.flags.military.how;
    t.ok(!/He went /.test(letter(x.s, x.g, x.m)), 'a file that never recorded how he went says nothing about it'); }
  { const x = fork(); x.m.flags.military.how = 'together';
    t.ok(!/He went /.test(letter(x.s, x.g, x.m)), 'and going together needs no sentence'); }
  // the papers that sat on the desk: the service's own stamp, never the ledger's
  { const x = fork(); x.m.flags.papersUnanswered = since - 2;
    t.ok(letter(x.s, x.g, x.m).includes(' He does not mention the papers that sat on the desk unanswered. He does not need to.'), 'papers left unanswered are in the letter by their absence'); }
  { const x = fork(); delete x.m.flags.papersUnanswered; x.m.flags.enlistPapers = since - 6;
    x.m.directed = (x.m.directed || []).concat([{ week: since - 2, kind: 'leftWaiting', w: -1 }]);
    t.ok(!/the papers that sat/.test(letter(x.s, x.g, x.m)), 'being left waiting at some other door is not the papers, whatever week it was'); }
  t.ok(!/the papers that sat/.test(letter(state, g, man)), 'and a man the wall took has none to mention');
  // how he carries the company: a clean ledger, so each line is on its edge (weights 3, 2, -2, -3)
  const carries = kinds => { const x = fork(); x.m.directed = []; kinds.forEach(k => KP.recordDirected(x.s, x.m.id, k)); return letter(x.s, x.g, x.m); };
  t.ok(carries(['promiseKept']).includes(' He signs it with the company’s name before his own.'), 'a man who trusts the office signs with the company’s name first');
  t.ok(carries(['heardHer']).includes(' He signs it with his name and the date, the way the base teaches.'), 'one kindness is not yet trust');
  t.ok(carries([]).includes(' He signs it with his name and the date, the way the base teaches.'), 'a clean ledger signs plainly');
  t.ok(carries(['deflected']).includes(' He signs it with his name and the date, the way the base teaches.'), 'one slight is not yet a grudge');
  t.ok(carries(['deflected', 'breatherDeclined']).includes(' He signs it with his name. It is polite the way a form is polite.'), 'a guarded one signs with his name, and it is polite');
  const before = KP.serialize(state);
  letter(state, g, man);
  t.eq(KP.serialize(state), before, 'the letter’s text changes nothing');
}

{
  // the real door: his papers sit unanswered, the wall takes him, and the letter knows
  const f = boys('wait-papers', [M.noticeAge, 22, 22, 21]);
  const { state, g } = f, man = f.men[0];
  g.servicePlan = 'stagger';
  let guard = 0;
  while (!(state.scenes || []).some(sc => sc.kind === 'enlistPapers') && guard++ < 12) tick(f);
  t.ok((state.scenes || []).some(sc => sc.kind === 'enlistPapers' && sc.personId === man.id), 'fixture: his papers are on the desk');
  t.ok(man.flags.papersUnanswered == null, 'papers that are still waiting for an answer are not yet unanswered');
  guard = 0;
  while ((state.scenes || []).some(sc => sc.kind === 'enlistPapers') && guard++ < 8) tick(f);
  t.eq(man.flags.papersUnanswered, state.week, 'left to expire, the service stamps it the week it does');
  wall(f, man);
  const since = state.week;
  t.ok(KP.inService(man) && man.flags.papersUnanswered != null, 'fixture: the wall took him, and the stamp went with him');
  const b = firstOf(rideTo(f, since + HALF), 'baseLetter');
  t.ok(txt(b).includes(' He went at the wall, and writes that the ones who went early are already home. He does not make more of it than that. He does not mention the papers that sat on the desk unanswered. He does not need to.'),
    'his letter carries both: how he went, and what was left on the desk');
  rideTo(f, since + M.serviceWeeks);
  t.ok(!KP.inService(man) && man.flags.papersUnanswered == null, 'home, the stamp is gone with the papers: the next window is a new story');
}

// ---- F. together: one letter an act, a mark ----------------------------------------------
{
  const f = boys('wait-together', [26, 25, 24, 24]);
  const { state, g } = f;
  g.servicePlan = 'together'; g.pendingService = true;
  g.fandom = { name: 'AURAINE', color: 'pearl ivory', since: state.week, intensity: 20 };
  tick(f);
  const since = state.week, until = since + M.serviceWeeks;
  t.eq(f.men.filter(m => KP.inService(m)).length, 4, 'fixture: all four went');
  f.men.forEach(m => { m.morale = 50; });
  const wire = rideTo(f, until);
  const h = firstOf(wire, 'waitHundred'), b = firstOf(wire, 'baseLetter'), tn = firstOf(wire, 'waitTurn'), c = firstOf(wire, 'wholeAgain');
  t.eq([allOf(wire, 'waitHundred').length, allOf(wire, 'baseLetter').length, allOf(wire, 'waitTurn').length].join('|'), '1|1|1', 'four men, one letter a mark');
  t.eq([led(state).hundred, led(state).wrote, led(state).turn].join('|'), '1|1|1', 'and the ledger counts letters, not men');
  t.ok(txt(h).startsWith('The hundredth day of the wait for the four of them fell this week. AURAINE’s project for it has a name now, '), 'day 100 is for the four of them, and the project is the fandom’s by name');
  t.ok(txt(h).endsWith('They are home ' + when(until) + '. The act waits with them.'), 'the whole act is away, and the letter says it waits');
  t.ok(!/works as/.test(txt(h)), 'nobody is left to work');
  t.eq(b.personId, g.roles.leader, 'the leader writes for them');
  t.ok(txt(b).startsWith('A letter came from the base in ' + KP.displayName(state.people[g.roles.leader]) + '’s handwriting, ' + HALF + ' weeks in and ' + (M.serviceWeeks - HALF) + ' weeks to go, for the four of them. They are on different bases and '),
    'one letter, for the four of them, about the four of them');
  t.ok(!/The room read it/.test(txt(b)), 'there is no room at home to read it');
  t.ok(!/He went /.test(txt(b)), 'and going together needs no sentence');
  t.eq(tn.priority, 'high', 'the turn is high: the act is whole when they are home');
  t.ok(txt(tn).includes('a hundred days until the four of them are home, ' + when(until) + '.') &&
    txt(tn).endsWith('That week GARRISON is whole, and a window opens for ' + M.returnWindowWeeks + ' weeks: a record locked inside it is THE RETURN. Nothing can be locked before then: the record waits for the gate.'),
    'nothing can be locked before the gate, and the turn says so');
  t.ok(/^GARRISON is whole again\. All four came through the gate this week, 72 weeks after they went in together\. The [a-z ]+ closed at [\d,]+ [a-z]+\. /.test(txt(c)), 'the ceremony closes the project for the four of them');
}
{
  // nobody at home, nobody lifted: the same week with the lift at nothing reads the same
  const f = boys('wait-together-morale', [26, 25, 24, 24]);
  f.g.servicePlan = 'together'; f.g.pendingService = true;
  tick(f);
  rideTo(f, f.state.week + HALF - 1);
  const twin = { state: KP.deserialize(KP.serialize(f.state)), ages: f.ages.slice(), ids: f.ids };
  twin.g = twin.state.groups.find(x => x.id === f.g.id); twin.men = f.ids.map(id => twin.state.people[id]);
  const keep = M.halfMorale;
  try { M.halfMorale = 0; tick(twin); } finally { M.halfMorale = keep; }
  const wire = tick(f);
  t.eq(firstOf(wire, 'baseLetter').ind, 'baseLetter', 'fixture: the letter came');
  t.eq(f.men.map(m => m.morale).join(','), twin.men.map(m => m.morale).join(','), 'with no one at home, the letter lifts no one');
}
{
  // the leader stayed home: the eldest of those away writes
  const f = boys('wait-eldest', [26, 25, 19, 19]);
  const { state, g } = f;
  g.roles.leader = f.men[2].id;
  g.servicePlan = 'together'; g.pendingService = true;
  tick(f);
  const since = state.week;
  t.eq(f.men.filter(m => KP.inService(m)).length, 2, 'fixture: the two of age went');
  f.men[0].age = 30; f.ages[0] = 30;
  const b = firstOf(rideTo(f, since + HALF), 'baseLetter');
  t.eq(b.personId, f.men[0].id, 'with the leader at home, the eldest of those away writes');
  t.ok(txt(b).includes(', for the two of them.') && txt(b).endsWith(' The room read it standing up.'), 'for the two of them, and the two at home read it');
}
{
  // two men of a stagger who left the same week: one letter, both names
  const f = boys('wait-pair', [24, 24, 23, 22]);
  const { state, g } = f, a = f.men[0], b = f.men[1];
  g.servicePlan = 'stagger';
  f.ages[1] = M.deadlineAge; b.age = M.deadlineAge;
  wall(f, a);
  const since = state.week, until = since + M.serviceWeeks;
  t.ok(KP.inService(a) && KP.inService(b) && mil(a).since === mil(b).since, 'fixture: the wall took two the same week');
  const h = firstOf(rideTo(f, since + M.hundredWeeks), 'waitHundred');
  t.ok(txt(h).startsWith('The hundredth day of the wait for ' + KP.displayName(a) + ' and ' + KP.displayName(b) + ' fell this week.'), 'two men, both names');
  t.ok(txt(h).endsWith('They are home ' + when(until) + ', and GARRISON works as two until then.'), 'and the act works as two');
  t.ok(/in their names? /.test(txt(h)) || !/in his name/.test(txt(h)), 'the project is not in one man’s name');
  t.eq(led(state).hundred, 1, 'one letter');
}

// ---- G. three men, one after another: whose project, and who is still away ------------------
{
  const f = boys('wait-after', [24, 24, 23, 22]);
  const { state, g } = f, a = f.men[0], b = f.men[1], c = f.men[2];
  g.servicePlan = 'stagger';
  wall(f, a);
  const s0 = state.week;
  // the second man leaves on a week whose own hash would pick another project
  let gap = 8;
  while (gap < 16 && KP.waitProject(state, g, s0 + gap).key === KP.waitProject(state, g, s0).key) gap++;
  t.ok(KP.waitProject(state, g, s0 + gap).key !== KP.waitProject(state, g, s0).key, 'fixture: the second man’s own week would name another project');
  rideTo(f, s0 + gap - 1);
  wall(f, c);
  rideTo(f, s0 + gap + 9);
  wall(f, b);
  const uA = mil(a).until, uB = mil(b).until, uC = mil(c).until;
  t.ok(uA < uC && uC < uB, 'fixture: home in the order a, c, b');
  t.eq(JSON.stringify(g.wait && [g.wait.since, g.wait.first, g.wait.out]), JSON.stringify([s0, a.id, 3]), 'one chapter for the three of them, opened by the first');
  // the second man's day 100 is the chapter's project, counted from the chapter's first week
  const chapter = KP.waitProject(state, g, s0);
  const wire = rideTo(f, uA - M.turnWeeks);
  const hC = allOf(wire, 'waitHundred').find(n => n.personId === c.id) || {};
  t.ok(txt(hC).includes(' has a name now, ' + chapter.name + ': '), 'the second man’s day 100 names the chapter’s project, not one of his own');
  // the first man's turn: two are still away after him, and the act is whole when the last is home
  const tA = allOf(wire, 'waitTurn').find(n => n.personId === a.id) || {};
  t.eq(tA.priority, 'normal', 'the turn is normal when the act is still short after him');
  t.ok(txt(tA).endsWith(' ' + KP.displayName(b) + ' and ' + KP.displayName(c) + ' are still away after that, so the act is not whole until ' + when(uB) + '.'),
    'it names the two still away, and the week the last of them is home');
  t.ok(!/THE RETURN/.test(txt(tA)), 'and does not promise a window that will not open');
  const rd = KP.waitTurnRead(state, g, [a]) || {};
  t.eq([rd.until, rd.whole, rd.lastUntil, (rd.after || []).map(m => m.id).join(',')].join('|'), [uA, false, uB, [b.id, c.id].join(',')].join('|'), 'the turn’s read says who is after him');
  // the second man's turn: the first is still away but home sooner, so only the third is "after"
  const wireC = rideTo(f, uC - M.turnWeeks);
  const tC = allOf(wireC, 'waitTurn').find(n => n.personId === c.id) || {};
  t.ok(KP.inService(a), 'fixture: the first man is still away at the second man’s turn');
  t.ok(txt(tC).endsWith(' ' + KP.displayName(b) + ' is still away after that, so the act is not whole until ' + when(uB) + '.'), 'a man who is home sooner is not still away after');
  t.eq(tC.priority, 'normal', 'normal again');
  // the last man's turn: the second is still away but home sooner, so the act is whole when he is
  const wireB = rideTo(f, uB - M.turnWeeks);
  const tB = allOf(wireB, 'waitTurn').find(n => n.personId === b.id) || {};
  t.ok(KP.inService(c) && !KP.inService(a), 'fixture: at the last man’s turn the second is still away and the first is home');
  t.eq(tB.priority, 'high', 'the last man’s turn is the high one');
  t.ok(/That week GARRISON is whole, and a window opens/.test(txt(tB)), 'and it says the act is whole that week');
  t.eq([led(state).hundred, led(state).turn].join('|'), '3|3', 'three men who left on three weeks: three of each');
}

// ---- H. a soloist ---------------------------------------------------------------------
{
  const f = boys('wait-solo', [24], 'SOLOMAN');
  const { state, g } = f, man = f.men[0];
  wall(f, man);
  const since = state.week, until = since + M.serviceWeeks, NAME = KP.displayName(man);
  const wire = rideTo(f, until);
  const h = firstOf(wire, 'waitHundred'), b = firstOf(wire, 'baseLetter'), tn = firstOf(wire, 'waitTurn'), c = firstOf(wire, 'wholeAgain');
  t.ok(txt(h).endsWith('He is home ' + when(until) + '. The act waits with him.'), 'a soloist’s day 100: the act waits with him');
  t.ok(['He says he has stopped humming his own songs in the washroom, because the others had started to join in.', 'He says nobody on the base knew who he was for a month, and that it was the best month.']
    .some(x => txt(b).includes(x)), 'his letter is about himself');
  t.ok(!/The room read it|They are on different bases|what the group is working on/.test(txt(b)), 'with no group in it');
  const away = KP.deserialize(KP.serialize(state));   // read at the half, while he is still away
  const aw = { s: Object.assign({}, away, { week: since + HALF }), m: away.people[man.id], g: away.groups.find(x => x.id === g.id) };
  aw.m.flags.military = { since, until, how: 'wall' }; delete aw.m.serviceDone;
  const ghost = KP.baseLetterText(aw.s, Object.assign({}, aw.g, { releases: (aw.g.releases || []).concat([{ week: since + 3, songTitle: 'Glass Harbor', chartPeak: 2 }]) }), aw.m, [aw.m]);
  t.ok(!/Glass Harbor/.test(ghost) && /He says /.test(ghost), 'an act with nobody at home has no record for him to hear');
  t.ok(txt(tn).includes('That week the solo desk opens again, and a window opens for ' + M.returnWindowWeeks + ' weeks') && !/is whole/.test(txt(tn)), 'his turn speaks of the solo desk');
  t.ok(txt(tn).endsWith('Nothing can be locked before then: the record waits for the gate.'), 'and of the gate');
  t.ok(txt(c).startsWith(NAME + ' is home, ' + M.serviceWeeks + ' weeks after he went in. The solo desk is open again. The ') && / closed at [\d,]+ /.test(txt(c)), 'his ceremony closes the project');
  t.ok(!/whole again|every member|members|the group/.test(txt(h) + txt(b) + txt(tn) + txt(c)), 'no group words in any of the four');
  const react = KP.feedReactionFor('waitHundred');
  t.ok(react && ((react(state, h, { pick: xs => xs[0] }) || {}).text || '').includes(KP.publicGiven(man)), 'the timeline counts for him by name');
}

// ---- I. a chapter too short for a project closes with none ----------------------------------
{
  const f = boys('wait-short', [24, 23, 23, 22]);
  const { state, g } = f, man = f.men[0];
  g.servicePlan = 'stagger';
  wall(f, man);
  const since = state.week;
  const text = n => KP.wholeAgainText(at(state, since + n), Object.assign({}, g), Object.assign({}, man, { serviceDone: since + n }), { since, first: man.id, out: 1 });
  t.ok(!/ closed at /.test(text(M.hundredWeeks - 1)), 'a chapter that never reached day 100 closes with no project');
  t.ok(/ closed at [\d,]+ /.test(text(M.hundredWeeks)), 'one that did, has one');
  t.ok(text(40).includes(' closed at 999,999 ') === false && KP.wholeAgainText(at(state, since + 40), Object.assign({}, g), Object.assign({}, man, { serviceDone: since + 40 }),
    { since, first: man.id, out: 1, count: 999999 }).includes(' closed at 999,999 '), 'and the ceremony never says less than the last count a letter gave');
  // a three-week fixture service writes nothing of the wait
  man.flags.military.until = state.week + 3;
  const wire = ride(f, 3);
  t.eq(allOf(wire, 'waitHundred').length + allOf(wire, 'baseLetter').length + allOf(wire, 'waitTurn').length, 0, 'a service cut short has no marks to pass');
  t.eq([led(state).hundred, led(state).wrote, led(state).turn].join('|'), '0|0|0', 'and nothing on the ledger');
}

// ---- J. the page -------------------------------------------------------------------------
{
  const f = boys('wait-page', [24, 23, 23, 22]);
  const { state, g } = f, man = f.men[0];
  const { App, el, UI } = dom.load();
  const page = () => { App.state = state; App.mode = 'game'; App.tab = 'groups'; App.view = { type: 'grouppage', id: g.id }; App.render(); return dom.stripTags(el('screen').innerHTML).replace(/\s+/g, ' '); };
  const file = id => { App.state = state; App.mode = 'game'; App.tab = 'talent'; App.view = { type: 'dossier', id }; App.render(); return dom.stripTags(el('screen').innerHTML).replace(/\s+/g, ' '); };
  f.men.forEach(m => { m.age = 22; }); f.ages = [22, 22, 22, 22];
  t.ok(!/The service map/.test(page()), 'a young act has no map yet');
  f.men[0].age = M.noticeAge - 2; f.ages[0] = M.noticeAge - 2;
  let p = page();
  t.ok(/The service map/.test(p), 'two years from the notice age, the map is on the page');
  t.ok(p.includes(KP.displayName(man) + ', ' + (M.noticeAge - 2) + ' papers at ' + M.noticeAge + ' · the wall at ' + M.deadlineAge), 'a man not yet called: his age, the papers’ age, the wall');
  t.ok(p.includes('The plan: not chosen yet. The folder reaches the Desk when the eldest is ' + M.noticeAge + '.'), 'and the plan, not chosen yet');
  g.servicePlan = 'stagger';
  t.ok(page().includes('The plan: staggered, one at a time as each window closes.'), 'a staggered plan says so');
  g.servicePlan = 'together';
  t.ok(page().includes('The plan: together, one wait and one return.'), 'and a together plan');
  g.servicePlan = 'stagger';
  man.flags.enlistPapers = state.week; man.age = M.noticeAge; f.ages[0] = M.noticeAge;
  t.ok(page().includes(KP.displayName(man) + ', ' + M.noticeAge + ' papers held · the wall at ' + M.deadlineAge), 'papers held are marked');
  man.age = M.deadlineAge - 1;
  t.ok(page().includes(KP.displayName(man) + ', ' + (M.deadlineAge - 1) + ' the wall is close · the wall at ' + M.deadlineAge), 'and a wall that is close');
  delete man.flags.enlistPapers;
  wall(f, man);
  const since = state.week, until = since + M.serviceWeeks;
  ride(f, 5);
  p = page();
  t.ok(p.includes(KP.displayName(man) + ', ' + man.age + ' away · home ' + when(until)), 'a man away: his row says when he is home');
  t.ok(p.includes(' week 5 of ' + M.serviceWeeks + ' · next: day 100 of the wait, in ' + (M.hundredWeeks - 5) + ' weeks'), 'and the line under it how far in he is, and his next mark');
  const rawMap = (() => { page(); return el('screen').innerHTML; })();
  t.ok(rawMap.includes('<span style="white-space:nowrap">' + KP.displayName(man) + ', ' + man.age + '</span>'), 'his name does not break across lines');
  t.ok(p.indexOf(KP.displayName(man) + ', ' + man.age + ' away') < p.indexOf(KP.displayName(f.men[1]) + ', '), 'the one away is first on the map');
  t.ok(!/The fandom’s project for the wait/.test(p), 'before day 100 the project has no name to show');
  let d = file(man.id);
  t.ok(d.includes('In mandatory service — week 5 of ' + M.serviceWeeks + ', home ' + when(until) + '. Next: day 100 of the wait, in ' + (M.hundredWeeks - 5) +
    ' weeks. The contract clock is paused. The desk has no verbs here; nobody does.'), 'his file says where he is in the wait and what is next');
  rideTo(f, since + M.hundredWeeks);
  const pj = projOf(f);
  p = page();
  t.ok(p.includes('The fandom’s project for the wait: ' + pj.name + ', ' + pj.said + ' so far.'), 'from day 100 the map carries the project and its count');
  t.ok(p.includes('next: his letter from the base, in ' + (HALF - M.hundredWeeks) + ' weeks'), 'and the next mark moves on');
  { const kept = g.wait.count; g.wait.count = 999999;
    t.ok(page().includes('The fandom’s project for the wait: ' + pj.name + ', 999,999 '), 'the map never shows less than the last count a letter gave');
    g.wait.count = kept; }
  // served, and a soloist's map (another man is near his own window, so the map stays up)
  f.ages[1] = M.noticeAge - 1; f.men[1].age = M.noticeAge - 1;
  rideTo(f, until);
  p = page();
  t.ok(p.includes(KP.displayName(man) + ', ' + man.age + ' served'), 'a man who is home reads served');
  t.ok(p.indexOf(KP.displayName(man) + ', ' + man.age + ' served') > p.indexOf(KP.displayName(f.men[1]) + ', '), 'and goes to the bottom of the map');
  t.eq(UI.serviceMapCard(state, { debuted: true, members: [], name: 'x' }), '', 'an act with no men has no map');
  t.eq(UI.serviceMapCard(state, Object.assign({}, g, { retiredWeek: 5 })), '', 'nor an act that ended');
}
{
  const f = boys('wait-page-solo', [24], 'SOLOMAN');
  const { state, g } = f, man = f.men[0];
  const { App, el } = dom.load();
  wall(f, man);
  ride(f, 2);
  App.state = state; App.mode = 'game'; App.tab = 'groups'; App.view = { type: 'grouppage', id: g.id }; App.render();
  const p = dom.stripTags(el('screen').innerHTML).replace(/\s+/g, ' ');
  t.ok(/The service map/.test(p) && p.includes(' week 2 of ' + M.serviceWeeks + ' · next: '), 'a soloist has a map of one');
  t.ok(!/The plan:/.test(p), 'and no plan line: one man has no order to go in');
}

// ---- K. old saves --------------------------------------------------------------------------
{
  const f = boys('wait-old', [24, 23, 23, 22]);
  const { state, g } = f, man = f.men[0];
  g.servicePlan = 'stagger';
  wall(f, man);
  const since = state.week;
  ride(f, 20);   // past day 100
  const old = JSON.parse(KP.serialize(state));
  old.version = '0.11.18';
  delete old.people[man.id].flags.military.how;
  ['hundred', 'wrote', 'turn'].forEach(k => delete old.serviceLedger[k]);
  delete old.groups.find(x => x.id === g.id).wait.count;
  const s = KP.deserialize(JSON.stringify(old));
  const o = { state: s, g: s.groups.find(x => x.id === g.id), ages: f.ages.slice(), ids: f.ids };
  o.men = f.ids.map(id => s.people[id]);
  t.eq(s.version, KP.C.VERSION, 'the old file is brought to this version');
  t.eq([led(s).hundred, led(s).wrote, led(s).turn].join('|'), '0|0|0', 'its ledger gains the three sums at zero');
  const wire = rideTo(o, since + M.serviceWeeks - M.turnWeeks);
  t.eq(allOf(wire, 'waitHundred').length, 0, 'a mark already behind him is never said late');
  const b = firstOf(wire, 'baseLetter');
  t.ok(txt(b).startsWith('A letter came from the base in ') && !/He went /.test(txt(b)), 'the half still comes, and does not guess how he went');
  t.eq(allOf(wire, 'waitTurn').length, 1, 'and so does the turn');
  t.eq([led(s).hundred, led(s).wrote, led(s).turn].join('|'), '0|1|1', 'counted as they happened');
}

// ---- L. determinism ---------------------------------------------------------------------
{
  const f = boys('wait-fork', [24, 23, 23, 22]);
  const { state, g } = f, man = f.men[0];
  g.servicePlan = 'stagger';
  wall(f, man);
  const b = KP.deserialize(KP.serialize(state));
  for (let w = 0; w < M.serviceWeeks + 2; w++) { KP.advanceWeek(state); KP.advanceWeek(b); }
  t.eq(KP.serialize(state), KP.serialize(b), 'a whole service, its three marks and its gate fork clean');
  t.ok(led(state).hundred >= 1 && led(state).wrote >= 1 && led(state).turn >= 1 && led(state).ceremonies >= 1, 'fixture: the fork rode through all of them');
  t.eq(JSON.stringify(KP.validateState(state)), '[]', 'and the state is valid at the end of it');
}

t.finish();
