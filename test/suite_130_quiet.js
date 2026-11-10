/* Suite 130 — the quiet (v0.11.20, §111: the absences, part three).
   A declared hiatus is a bet with two halves, the rest and the wait the
   return converts. Both are one read the card shows, and each half says
   when it is done: a letter when the rest is in, a letter when the bank
   is full. A personal break rests at least as well as an idle week, and
   says when she is rested.

   Laws (§99): the wire is read before the trim; a fixture forces every
   gate and rolls nothing; a missing letter fails by name. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const KP = loadEngine();
const t = makeT('suite_130_quiet');
const H = KP.C.HIATUS, MD = KP.C.MEMBER_DESK, CB = KP.C.COMEBACK;
// the first week the bank reads full, from the one formula
let FULL = H.graceWeeks; while (KP.hiatusBank(FULL) < H.anticipationCap && FULL < 520) FULL++;

// ---- the kit ----------------------------------------------------------------
// an inherited act with a clear calendar, as tired and as popular as the fixture says
function act(seed, tired, pop) {
  const state = KP.newGame(seed, null, { legacy: true });
  state.budget = 9000;
  const g = state.groups.find(x => x.debuted && !x.retiredWeek);
  let guard = 0;
  while ((g.prep || g.tour || state.week <= (g.promoUntil || 0)) && guard++ < 40) KP.advanceWeek(state);
  g.members.forEach(id => { state.people[id].fatigue = tired; });
  g.popularity = pop;
  return { state, g, ms: g.members.map(id => state.people[id]) };
}
function tick(f) {
  const s = f.state;
  (s.scenes || []).slice().forEach(sc => { const d = KP.sceneDef(sc.kind); if (d) KP.resolveScene(s, sc.id, d.options(s, sc)[0].id); });
  KP.advanceWeek(s);
  return (KP.lastTickNotes || []).slice();
}
function ride(f, weeks) { let all = []; for (let i = 0; i < weeks; i++) all = all.concat(tick(f)); return all; }
const firstOf = (list, ind) => (list || []).find(n => n.ind === ind) || {};
const allOf = (list, ind) => (list || []).filter(n => n.ind === ind);
const txt = n => String((n && n.text) || '');
const hi = g => (g && g.hiatus) || {};
const led = state => state.quietLedger || {};
const when = w => KP.weekLabel(w).text;
const at = (state, week) => Object.assign({}, state, { week });   // the same world, read at another week (reads only)
const rd = (state, g) => KP.hiatusRead(state, g) || {};

// ---- A. the shape ---------------------------------------------------------------
{
  ['hiatusBank', 'hiatusRead', 'hiatusBankWords', 'hiatusReadWords', 'hiatusRestedText', 'hiatusFullText', 'breakRead', 'breakRestedText', 'breakLock', 'quietLedger'].forEach(k =>
    t.ok(typeof KP[k] === 'function', 'the engine carries KP.' + k));
  t.ok(H.restedAt >= 0 && H.restedAt < 30 && MD.breakRestedAt >= 0 && MD.breakRestedAt < 40, 'rested is a low line, for an act and for one person');
  const s = KP.newGame('quiet-shape', null, { legacy: true });
  KP.advanceWeek(s);
  t.eq(JSON.stringify(led(s)), JSON.stringify({ rested: 0, full: 0, breakRested: 0 }), 'the ledger carries its three sums from the first week, at zero');
  t.eq(KP.hiatusRead(s, s.groups[0]), null, 'an act that is not parked has no bet to read');
  t.eq(KP.hiatusRead(s, null), null, 'and no act has none');
  t.eq(KP.breakRead(s, Object.values(s.people)[0]), null, 'somebody who is not on a break has no break to read');
}

// ---- B. the bank: one formula, read by the release and by the card ----------------------
{
  t.eq([0, H.graceWeeks, H.graceWeeks + 1, 12, FULL - 1, FULL, FULL + 1, 60].map(w => KP.hiatusBank(w)).join(','),
    [0, 0, 1, 5, 9, 10, 10, 10].join(','), 'nothing inside the grace window, then three quarters of a point a week, to the cap');
  t.eq(FULL, 19, 'the bank is full in week 19');
  const s = KP.newGame('quiet-bank', null, { legacy: true });
  const same = [];
  for (let w = 0; w <= 40; w++) { const g = { returnFrom: { weeks: w } }; same.push(KP.hiatusReadsRelease(s, g, false).mod === KP.hiatusBank(w)); }
  t.ok(same.every(Boolean), 'what the card says a return would read is what the release reads, week for week');
}

// ---- C. the read (pure) ------------------------------------------------------------
{
  const f = act('quiet-read', 62, 50);
  const { state, g } = f;
  t.ok(KP.declareHiatus(state, g.id).ok, 'fixture: the act is parked');
  const since = state.week;
  t.eq(JSON.stringify(KP.hiatusRead(state, g)), JSON.stringify({ weeks: 0, graceLeft: H.graceWeeks, cooling: false, banked: 0, cap: H.anticipationCap,
    full: false, fullWeek: since + FULL, toFull: FULL, tired: 62, rested: false, cooled: null }), 'the week it is announced: nothing banked, the patience whole, the rest not in');
  const before = KP.serialize(state);
  KP.hiatusRead(state, g); KP.hiatusReadWords(state, g, rd(state, g)); KP.hiatusRestedText(state, g, rd(state, g)); KP.hiatusFullText(state, g, rd(state, g));
  t.eq(KP.serialize(state), before, 'the reads change nothing');
  const r = w => rd(at(state, since + w), g);
  t.eq([r(H.graceWeeks).graceLeft, r(H.graceWeeks).cooling, r(H.graceWeeks + 1).graceLeft, r(H.graceWeeks + 1).cooling].join('|'), '0|false|-1|true', 'the last week of patience is not yet cooling; the week after is');
  t.eq([r(12).banked, r(12).full, r(12).toFull, r(FULL - 1).full, r(FULL).full, r(FULL).toFull, r(FULL + 9).toFull].join('|'), '5|false|' + (FULL - 12) + '|false|true|0|0', 'the bank fills on its week and stays full');
  t.eq(r(FULL + 9).fullWeek, since + FULL, 'the week the bank filled does not move once it is behind');
  // rested is the average, at the line
  const tiredAs = xs => { const c = KP.deserialize(KP.serialize(state)); const cg = c.groups.find(x => x.id === g.id); cg.members.forEach((id, i) => { c.people[id].fatigue = xs[i % xs.length]; }); return rd(c, cg); };
  t.eq([tiredAs([H.restedAt]).rested, tiredAs([H.restedAt + 1]).rested, tiredAs([0, 2 * H.restedAt]).rested, tiredAs([0, 2 * H.restedAt + 2]).rested].join('|'), 'true|false|true|false', 'rested is the act’s average fatigue, at the line');
  // a clock a gate restarted moves the patience, never the bank
  const gated = Object.assign({}, g, { hiatus: { since: since - 80, service: false, graceFrom: since } });
  t.eq([rd(state, gated).graceLeft, rd(state, gated).cooling, rd(state, gated).banked, rd(state, gated).full].join('|'), [H.graceWeeks, false, H.anticipationCap, true].join('|'), 'a clock restarted at a gate renews the patience and leaves the bank as it is');
  t.eq(KP.hiatusRead(state, Object.assign({}, g, { hiatus: { since, service: true } })), null, 'a service chapter is not this bet');
  // what the cooling has cost, from the week the patience ran out
  const cost = (stamp, pop) => rd(state, Object.assign({}, g, { popularity: pop, hiatus: { since, popAtCool: stamp } })).cooled;
  t.eq([cost(50, 44.33), cost(50, 50), cost(50, 53), rd(state, g).cooled].join('|'), '5.7|0|0|', 'the cost is to a tenth, never below nothing, and unknown without the stamp');
}

// ---- D. the words (pure) ---------------------------------------------------------------
{
  const f = act('quiet-words', 62, 50);
  const { state, g } = f;
  KP.declareHiatus(state, g.id);
  const since = state.week;
  const R = over => Object.assign({ weeks: 8, graceLeft: -2, cooling: true, banked: 2, cap: 10, full: false, fullWeek: since + FULL, toFull: 11, tired: 4, rested: true, cooled: 1.6 }, over || {});
  t.eq(KP.hiatusBankWords(state, R()), 'A return announced this week would read +2 of a possible +10 on the release sheet’s return row', 'the bank, in the sheet’s points');
  t.eq(KP.hiatusBankWords(state, R({ banked: 0 })), 'A return announced this week would read nothing on the release sheet’s return row: only the weeks after the patience runs out are counted', 'and nothing, with why');
  t.eq(KP.hiatusReadWords(state, g, R()), 'A return announced this week would read +2 of a possible +10 on the release sheet’s return row. The bank is full ' + when(since + FULL) +
    ', in 11 weeks. Popularity is down 1.6 since the patience ran out. The rest has done its work.', 'the card’s read: the bank, when it is full, what it has cost, whether the rest is in');
  t.ok(KP.hiatusReadWords(state, g, R({ full: true, banked: 10, toFull: 0 })).includes('. The bank is full: every week from here only costs. '), 'a full bank says every week from here only costs');
  t.ok(KP.hiatusReadWords(state, g, R({ toFull: 1 })).includes(', in 1 week. '), 'one week is one week');
  t.ok(!/Popularity is down/.test(KP.hiatusReadWords(state, g, R({ cooled: null }))) && !/Popularity is down/.test(KP.hiatusReadWords(state, g, R({ cooled: 0 }))), 'no cost is said where none is known or none was paid');
  t.ok(KP.hiatusReadWords(state, g, R({ rested: false })).endsWith(' The rest is still working.'), 'an act still tired reads so');
  // the rest's letter, in each state of the patience
  const NAME = g.name;
  t.eq(KP.hiatusRestedText(state, g, R({ weeks: 7, graceLeft: -1, banked: 1 })), 'The rest has done its work on ' + NAME + ': 7 weeks in, the members are as rested as a hiatus makes anybody. ' +
    'The patience ran out 1 week ago, and the numbers are cooling. What the hiatus buys from here is the wait alone. ' +
    'A return announced this week would read +1 of a possible +10 on the release sheet’s return row, and the bank is full ' + when(since + FULL) + '.', 'the rest’s letter, past the patience');
  t.ok(KP.hiatusRestedText(state, g, R({ weeks: 3, graceLeft: 3, cooling: false, banked: 0 })).includes(' The fandom’s patience holds 3 weeks more. What the hiatus buys from here is the wait alone. A return announced this week would read nothing'), 'inside the patience, it says how much is left');
  t.ok(KP.hiatusRestedText(state, g, R({ weeks: 6, graceLeft: 0, cooling: false, banked: 0 })).includes(' This is the last week of the fandom’s patience. '), 'and names its last week');
  t.ok(KP.hiatusRestedText(state, g, R({ weeks: 5, graceLeft: 1, cooling: false, banked: 0 })).includes(' The fandom’s patience holds 1 week more. '), 'one week is one week');
  t.ok(KP.hiatusRestedText(state, g, R({ weeks: 25, graceLeft: -19, banked: 10, full: true })).endsWith(' on the release sheet’s return row, and that is the most it can.'), 'a rest that comes in after the bank is full says so');
  t.ok(KP.hiatusRestedText(state, Object.assign({}, g, { members: g.members.slice(0, 1) }), R()).includes(' in, the act is as rested as '), 'one person is not "the members"');
  // the bank's letter
  t.eq(KP.hiatusFullText(state, g, R({ weeks: FULL, banked: 10, full: true, cooled: 11.4 })), NAME + '’s wait has banked all it can: +10 on the release sheet’s return row, ' + FULL +
    ' weeks in. No week after this one adds to it. Popularity is down 11.4 since the patience ran out, and that goes on. From here every week only costs.', 'the bank’s letter, with what it cost');
  t.ok(KP.hiatusFullText(state, g, R({ weeks: FULL, banked: 10, full: true, cooled: null })).includes(' No week after this one adds to it. The cooling goes on. From here every week only costs.'), 'and without a cost it never measured');
}

// ---- E. a declared hiatus through both letters ------------------------------------------
{
  const f = act('quiet-bet', 62, 50);
  const { state, g } = f;
  KP.declareHiatus(state, g.id);
  const since = state.week;
  // the rest
  // the week the cost's stamp first appears, and the popularity it was taken from, are watched throughout
  let stampWeek = null, stampFrom = null;
  let stampAfter = null;
  const watch = fn => { const pop = g.popularity; const out = fn(); if (stampWeek == null && hi(g).popAtCool != null) { stampWeek = state.week; stampFrom = pop; stampAfter = g.popularity; } return out; };
  let wire = [], guard = 0;
  while (!firstOf(wire, 'hiatusRested').ind && guard++ < 14) {
    t.ok(!hi(g).restedNoted, 'not stamped as rested before the letter (week ' + (state.week - since) + ')');
    t.ok(!rd(state, g).rested, 'and the card does not say rested before the letter does (week ' + (state.week - since) + ')');
    wire = watch(() => tick(f));
  }
  const rest = firstOf(wire, 'hiatusRested');
  const rr = rd(state, g);
  t.eq([rest.priority, rest.kind, rest.groupId].join('|'), ['critical', 'company', g.id].join('|'), 'the rest’s letter is critical: it is said once and must land');
  {
    const crowd = [];
    for (let i = 0; i < 9; i++) crowd.push({ kind: 'company', priority: 'high', text: 'crowd ' + i });
    t.ok(rest.ind && KP.trimWeekNotes(crowd.concat([rest]), KP.C.EVENTS.maxInboxPerWeek).includes(rest), 'nine high letters pushed before it in the same week do not cut it');
  }
  t.ok(rr.rested, 'it comes the week the read says rested');
  t.eq(txt(rest), KP.hiatusRestedText(state, g, rr), 'and it reads as the read does');
  t.ok(hi(g).restedNoted === true && led(state).rested === 1, 'stamped and counted');
  t.ok(rr.weeks <= H.graceWeeks + 2, 'an act at sixty-two is rested about when the patience runs out (week ' + rr.weeks + ')');
  // the patience runs out: the stamp, taken before the first cooling
  guard = 0;
  let coolWire = [];
  while (stampWeek == null && guard++ < 10) coolWire = watch(() => tick(f));
  t.eq(stampWeek, since + H.graceWeeks + 1, 'what the cooling costs is counted from the week the patience ran out, not from the announcement');
  t.ok(txt(firstOf(coolWire, 'hiatusCooling')).endsWith(' weeks of patience and the patience is spent. The rest has done its work. The forgetting has only started, and it compounds.'),
    'the cooling letter of an act already rested does not say the rest is still working');
  t.ok(stampFrom != null && hi(g).popAtCool <= stampFrom + 1e-9 && hi(g).popAtCool > stampFrom - 1, 'and the stamp is the popularity the cooling started from');
  t.ok(stampAfter != null && Math.abs((hi(g).popAtCool - stampAfter) - H.coolPerWeek) < 1e-9, 'taken before that week’s cooling, so the first week of it is counted (' + (hi(g).popAtCool - stampAfter) + ')');
  const quiet = ride(f, FULL - (state.week - since) - 1);
  t.eq(allOf(quiet, 'hiatusRested').length, 0, 'the rest is said once');
  t.eq(allOf(quiet, 'hiatusFull').length, 0, 'the bank does not say it is full a week early');
  t.eq(state.week - since, FULL - 1, 'fixture: the week before the bank fills');
  t.ok(!hi(g).fullNoted && !rd(state, g).full, 'not full, not stamped');
  // the bank
  const popBefore = g.popularity;
  const wk = tick(f);
  const full = firstOf(wk, 'hiatusFull');
  const fr = rd(state, g);
  t.eq([full.priority, full.kind, full.groupId].join('|'), ['critical', 'company', g.id].join('|'), 'the bank’s letter is critical: it is said once and must land');
  t.ok(txt(full).startsWith(g.name + '’s wait has banked all it can: +' + H.anticipationCap + ' on the release sheet’s return row, ' + FULL + ' weeks in. No week after this one adds to it. Popularity is down '), 'it says the bank is full and when');
  const said = Number((txt(full).match(/Popularity is down ([\d.]+) since/) || [])[1]);
  t.ok(said === fr.cooled && said > Math.round((hi(g).popAtCool - popBefore) * 10) / 10 && said > 5,
    'and what the cooling has cost since the patience ran out, this week’s included: the number the card shows (' + said + ')');
  t.ok(txt(full).endsWith(' and that goes on. From here every week only costs.'), 'and that every week from here only costs');
  t.ok(fr.full && hi(g).fullNoted === true && led(state).full === 1, 'stamped and counted');
  const crowd = [];
  for (let i = 0; i < 9; i++) crowd.push({ kind: 'company', priority: 'high', text: 'crowd ' + i });
  const kept = full.ind ? KP.trimWeekNotes(crowd.concat([full]), KP.C.EVENTS.maxInboxPerWeek) : [];
  t.ok(kept.includes(full), 'nine high letters in the same week do not push it out');
  const after = ride(f, 4);
  t.eq(allOf(after, 'hiatusFull').length + allOf(after, 'hiatusRested').length, 0, 'each is said once');
  t.eq(JSON.stringify(led(state)), JSON.stringify({ rested: 1, full: 1, breakRested: 0 }), 'one bet, one of each');
  // the return reads what the card said
  const promised = rd(state, g).banked;
  state.budget = 9000;
  if (!g.demos) { const rng = KP.rngFor(state); g.demos = KP.generateDemos(state, rng, g); state.rngState = rng.state(); }
  const r = KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest', week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(r && r.ok !== false && !g.hiatus, 'fixture: the return locks');
  t.eq(KP.hiatusBank((g.returnFrom || {}).weeks), promised, 'the return will read what the card promised the week it was announced');
}
{
  // a second hiatus is a second bet
  const f = act('quiet-again', 5, 50);
  const { state, g } = f;
  KP.declareHiatus(state, g.id);
  const w1 = ride(f, 2);
  t.eq(allOf(w1, 'hiatusRested').length, 1, 'an act that parks already rested is told the first week');
  state.budget = 9000;
  if (!g.demos) { const rng = KP.rngFor(state); g.demos = KP.generateDemos(state, rng, g); state.rngState = rng.state(); }
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest', week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while ((g.prep || state.week <= (g.promoUntil || 0)) && guard++ < 40) tick(f);
  g.members.forEach(id => { state.people[id].fatigue = 5; });
  t.ok(KP.declareHiatus(state, g.id).ok, 'fixture: parked again');
  t.eq(allOf(ride(f, 2), 'hiatusRested').length, 1, 'the second hiatus says its own rest');
  t.eq(led(state).rested, 2, 'two bets, two letters');
}

{
  // an act still tired when the patience runs out: the cooling letter says both are working
  const f = act('quiet-tired', 100, 50);
  const { state, g } = f;
  KP.declareHiatus(state, g.id);
  const wire = ride(f, H.graceWeeks + 1);
  t.ok(!rd(state, g).rested, 'fixture: still tired when the patience runs out');
  t.ok(txt(firstOf(wire, 'hiatusCooling')).endsWith(' weeks of patience and the patience is spent. Rest is still working. So is forgetting. Both compound.'), 'the cooling letter of an act still tired says the rest is still working');
}

// ---- F. what is not this bet ---------------------------------------------------------
{
  const f = act('quiet-not', 5, 50);
  const { state, g } = f;
  // a hiatus left over from a service chapter: the gate's ceremony spoke for it (§109)
  g.hiatus = { since: state.week - 80, service: false, graceFrom: state.week };
  const wire = ride(f, 3);
  t.eq(allOf(wire, 'hiatusRested').length + allOf(wire, 'hiatusFull').length, 0, 'a hiatus a service chapter left behind gets neither letter');
  t.eq(JSON.stringify(led(state)), JSON.stringify({ rested: 0, full: 0, breakRested: 0 }), 'and nothing on the ledger');
  t.ok(rd(state, g).full && !hi(g).fullNoted, 'though its card still reads a full bank');
  // a service chapter
  g.hiatus = { since: state.week, service: true };
  const wire2 = ride(f, 2);
  t.eq(allOf(wire2, 'hiatusRested').length + allOf(wire2, 'hiatusFull').length, 0, 'a service chapter gets neither');
  t.ok(hi(g).popAtCool == null, 'and no cost is counted against it');
}

// ---- G. the card ---------------------------------------------------------------------
{
  const f = act('quiet-card', 62, 50);
  const { state, g } = f;
  const { App, el } = dom.load();
  const card = () => {
    App.state = state; App.mode = 'game'; App.tab = 'groups'; App.view = { type: 'grouppage', id: g.id }; App.render();
    const p = dom.stripTags(el('screen').innerHTML).replace(/\s+/g, ' ');
    const i = p.indexOf('On official hiatus —');
    return i < 0 ? '' : p.slice(i, p.indexOf('Announce the return', i));
  };
  t.eq(card(), '', 'an act that is not parked has no hiatus card');
  KP.declareHiatus(state, g.id);
  const since = state.week;
  let c = card();
  t.ok(c.includes('The announcement is holding') && c.includes(KP.hiatusReadWords(state, g, rd(state, g))), 'the card carries the read from the week of the announcement');
  t.ok(c.includes('would read nothing on the release sheet’s return row') && c.includes('The bank is full ' + when(since + FULL) + ', in ' + FULL + ' weeks.') && c.includes('The rest is still working.'), 'nothing banked, the week the bank fills, and the rest still working');
  ride(f, H.graceWeeks + 2);
  c = card();
  t.ok(c.includes('Past the grace window now — the forgetting is working.'), 'past the patience the card says the forgetting is working');
  t.ok(!/the rest is still working, and so is the forgetting/.test(c), 'and no longer that the rest is still working, beside a read that says it is in');
  t.ok(c.includes('would read +' + rd(state, g).banked + ' of a possible +' + H.anticipationCap) && c.includes('Popularity is down ' + rd(state, g).cooled + ' since the patience ran out.') && c.includes('The rest has done its work.'),
    'what a return would read, what the cooling has cost, and that the rest is in');
  ride(f, FULL - (state.week - since));
  t.ok(card().includes('would read +' + H.anticipationCap + ' of a possible +' + H.anticipationCap + ' on the release sheet’s return row. The bank is full: every week from here only costs.'), 'a full bank on the card');
  // a service chapter's card carries no bank
  g.hiatus = { since: state.week, service: true };
  App.state = state; App.render();
  const p = dom.stripTags(el('screen').innerHTML);
  t.ok(/The service chapter/.test(p) && !/A return announced this week would read/.test(p), 'a service chapter’s card carries no bank');
}

// ---- H. the personal break -------------------------------------------------------------
{
  const f = act('quiet-break', 80, 50);
  const { state, g } = f, p = f.ms[0], mate = f.ms[1];
  t.eq(KP.breakRead(state, p), null, 'fixture: not on a break yet');
  t.ok(KP.declareMemberBreak(state, p.id).ok, 'fixture: the break is granted');
  const since = state.week;
  t.eq(JSON.stringify(KP.breakRead(state, p)), JSON.stringify({ weeks: 0, tired: 80, rested: false, until: null }), 'the break, read: how long, how tired, whether rested, and no date the desk did not set');
  const before = KP.serialize(state);
  KP.breakRead(state, p); KP.breakRestedText(state, p, g, KP.breakRead(state, p));
  t.eq(KP.serialize(state), before, 'the read changes nothing');
  // the repair: a break rests at least as well as an idle week
  tick(f);
  const rate = CB.idolRecovery * (KP.ageRecoveryMult ? KP.ageRecoveryMult(p) : 1) + MD.breakRecovery;
  t.ok(Math.abs((80 - p.fatigue) - rate) < 1e-9, 'a week of a break takes off an idle week’s recovery and the break’s own (' + (80 - p.fatigue) + ')');
  t.ok(80 - p.fatigue > MD.breakRecovery + 1, 'which is more than the break’s own relief, all she used to get');
  t.ok(p.fatigue < mate.fatigue, 'and she is less tired than a groupmate who started as tired and took no break (' + p.fatigue + ' against ' + mate.fatigue + ')');
  // the letter
  let wire = [], guard = 0;
  while (!firstOf(wire, 'breakRested').ind && guard++ < 14) {
    t.ok(!p.flags.personalHiatus.restedNoted, 'not stamped before the letter (week ' + (state.week - since) + ')');
    t.ok(!(KP.breakRead(state, p) || {}).rested, 'and her file does not say rested before the letter does (week ' + (state.week - since) + ')');
    wire = tick(f);
  }
  const n = firstOf(wire, 'breakRested');
  const br = KP.breakRead(state, p) || {};
  t.eq([n.priority, n.kind, n.personId, n.groupId].join('|'), ['critical', 'company', p.id, g.id].join('|'), 'the letter is critical, said once, and carries her and the act');
  {
    const crowd = [];
    for (let i = 0; i < 9; i++) crowd.push({ kind: 'company', priority: 'high', text: 'crowd ' + i });
    t.ok(n.ind && KP.trimWeekNotes(crowd.concat([n]), KP.C.EVENTS.maxInboxPerWeek).includes(n), 'nine high letters pushed before it in the same week do not cut it');
  }
  t.ok(br.rested && p.fatigue <= MD.breakRestedAt, 'it comes when she is at the line');
  t.eq(txt(n), KP.fillPro(KP.displayName(p) + ' is rested: ' + br.weeks + ' weeks into the break, {she} is sleeping, and the trainers say it shows. ' + g.name + ' has gone on as three without {her}. The seat is kept. {She} comes back when the desk ends the break, from {pos} file.', p),
    'it says how long, that the act went on without her, and where the break ends');
  t.ok(!/[{}]/.test(txt(n)), 'no token is left in it');
  t.ok(br.weeks < 12, 'from eighty she is rested inside three months, where it took half a year (week ' + br.weeks + ')');
  t.ok(p.flags.personalHiatus.restedNoted === true && led(state).breakRested === 1, 'stamped and counted');
  t.eq(allOf(ride(f, 3), 'breakRested').length, 0, 'said once');
  // a man's letter, and somebody with no act
  const him = Object.assign({}, p, { gender: 'm' });
  t.ok(KP.breakRestedText(state, him, g, { weeks: 6, tired: 10, rested: true }).includes(' he is sleeping, and the trainers say it shows. ' + g.name + ' has gone on as three without him. The seat is kept. He comes back when the desk ends the break, from his file.'), 'his letter is his');
  t.ok(KP.breakRestedText(state, p, null, { weeks: 1, tired: 10, rested: true }).includes('1 week into the break') && !/has gone on as/.test(KP.breakRestedText(state, p, null, { weeks: 1, tired: 10, rested: true })), 'one week is one week, and no act is named where there is none');
  // a break a story forced runs to the statement's date: the read carries it and the letter says it
  const forced = Object.assign({}, p, { flags: Object.assign({}, p.flags, { scandalBreakUntil: state.week + 5, personalHiatus: Object.assign({}, p.flags.personalHiatus, { forced: true }) }) });
  const fr = KP.breakRead(state, forced) || {};
  t.eq(fr.until, state.week + 5, 'a forced break’s read carries the week it ends');
  t.ok(KP.breakRestedText(state, forced, g, fr).endsWith(' The seat is kept. The statement that sent her away runs until ' + when(state.week + 5) + ', and she is back that week. The story chose that calendar; the desk cannot shorten it.'),
    'its letter says the statement’s date, and that the desk cannot shorten it');
  t.ok(!/comes back when the desk ends the break/.test(KP.breakRestedText(state, forced, g, fr)), 'and not that it waits for the desk');
  t.ok(txt(n).endsWith(' She comes back when the desk ends the break, from her file.') && !/The statement that sent/.test(txt(n)), 'a break the desk granted waits for the desk');
  // a parked act has not gone on without her
  const parked = Object.assign({}, g, { hiatus: { since: state.week } });
  t.ok(!/has gone on as/.test(KP.breakRestedText(state, p, parked, br)) && KP.breakRestedText(state, p, parked, br).includes('and the trainers say it shows. The seat is kept.'), 'if the act is parked too, the letter does not say it went on without her');
  // a date an older story left behind is not this break's date
  const stale = Object.assign({}, p, { flags: Object.assign({}, p.flags, { scandalBreakUntil: state.week + 5 }) });
  t.eq((KP.breakRead(state, stale) || {}).until, null, 'a date left by an older story is not a granted break’s date');
  t.eq(KP.breakLock(state, stale), null, 'and does not lock it');
  t.eq(KP.breakLock(state, p), null, 'a break the desk granted is the desk’s to end');
  t.eq(KP.breakLock(state, null), null, 'and nobody has no lock');
  // the rested line
  const tiredAt = x => (KP.breakRead(state, Object.assign({}, p, { fatigue: x })) || {}).rested;
  t.eq([tiredAt(MD.breakRestedAt), tiredAt(MD.breakRestedAt + 0.5)].join('|'), 'true|false', 'rested is at the line');
  // the file's button
  const { App, el } = dom.load();
  const file = () => { App.state = state; App.mode = 'game'; App.tab = 'talent'; App.view = { type: 'dossier', id: p.id }; App.render(); return el('screen').innerHTML; };
  t.ok(/class="btn small primary" data-action="end-break"[^>]*>End the personal break · week \d+ · rested</.test(file()), 'the button that ends the break says she is rested, and stands out');
  p.fatigue = 60;
  t.ok(/class="btn small" data-action="end-break"[^>]*>End the personal break · week \d+ · still resting</.test(file()), 'and still resting when she is not');
  t.ok(!/The story’s break/.test(file()) && !/back&nbsp;/.test(file()), 'and a break the desk granted carries no date');
  // a new break is a new letter
  p.fatigue = 5;
  t.ok(KP.endMemberBreak(state, p.id).ok && KP.declareMemberBreak(state, p.id).ok, 'fixture: the break ends and another begins');
  t.eq(allOf(ride(f, 2), 'breakRested').length, 1, 'a second break says its own rest');
  t.eq(led(state).breakRested, 2, 'two breaks, two letters');
}

// ---- H2. the break a story forced: twelve weeks, and the desk cannot shorten it --------------
{
  const SC = KP.C.SCANDAL;
  // a severity-three story lands on the first of the roster, and the response goes out
  function story(f) {
    const s = f.state, p = f.ms[0];
    p.personality.professionalism = 20;
    s.roster = [p.id].concat(s.roster.filter(id => id !== p.id));
    const base = SC.base, sev = SC.sevWeights.slice();
    SC.base = 1; SC.sevWeights = [0, 0, 1, 0];
    try { KP.advanceWeek(s); } finally { SC.base = base; SC.sevWeights = sev; }
    const sc = (s.scenes || []).find(x => x.kind === 'theStory') || {};
    if (sc.id) KP.resolveScene(s, sc.id, 'statement');
    return s.people[sc.personId] || p;
  }
  const f = act('quiet-forced', 70, 50);
  const { state, g } = f;
  const hit = story(f);
  const brk = () => hit.flags.personalHiatus || {};
  const since = state.week, until = hit.flags.scandalBreakUntil;
  t.ok(hit.flags.personalHiatus && until === since + SC.hiatusWeeks, 'fixture: the story forced a break, twelve weeks on the clock');
  t.eq(brk().forced, true, 'the break knows the story forced it');
  t.eq(KP.breakLock(state, hit), until, 'and it is locked to the statement’s date');
  t.eq((KP.breakRead(state, hit) || {}).until, until, 'which the read carries');
  // the desk cannot end it
  const before = KP.serialize(state);
  const r = KP.endMemberBreak(state, hit.id);
  t.eq(r.ok, false, 'the desk cannot end a break the story forced');
  t.eq(r.reason, 'The statement that sent ' + (hit.gender === 'm' ? 'him' : 'her') + ' away runs until ' + when(until) + '. The story chose that calendar, and the desk cannot shorten it.', 'and is told why, with the date');
  t.eq(KP.serialize(state), before, 'the refusal changes nothing');
  // the same refusal for a man: the sentence is filled from the person, not left as written
  const was = hit.gender; hit.gender = was === 'm' ? 'f' : 'm';
  t.ok(String(KP.endMemberBreak(state, hit.id).reason || '').startsWith('The statement that sent ' + (hit.gender === 'm' ? 'him' : 'her') + ' away runs until '), 'and the refusal is said of whoever it is');
  hit.gender = was;
  // the boundary: locked through the week before, the desk's on the date
  t.eq([KP.breakLock(at(state, until - 1), hit), KP.breakLock(at(state, until), hit)].join('|'), [until, null].join('|'), 'locked through the week before its date, and not on it');
  // the file says so, on a button that does nothing
  const { App, el } = dom.load();
  const file = () => { App.state = state; App.mode = 'game'; App.tab = 'talent'; App.view = { type: 'dossier', id: hit.id }; App.render(); return el('screen').innerHTML; };
  const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  t.ok(new RegExp('<button class="btn small" disabled title="The story chose this calendar\\. The desk cannot shorten it\\.">The story’s break · week 0 · still resting · back&nbsp;' + esc(when(until).replace(/ /g, '&nbsp;')) + '</button>').test(file()),
    'the file shows the story’s break, how long, how rested, and the week she is back, kept on one line');
  t.ok(!/data-action="end-break"/.test(file()), 'and no button that ends it');
  // the weeks: in place and locked every week before the date, rested along the way, back on the date
  let wire = [], held = true, rested = {};
  while (state.week < until - 1) {
    wire = tick(f);
    if (!hit.flags.personalHiatus || KP.breakLock(state, hit) !== until) held = false;
    if (firstOf(wire, 'breakRested').ind) rested = firstOf(wire, 'breakRested');
  }
  t.ok(held, 'the break holds, locked, every week before its date');
  t.ok(txt(rested).endsWith(' The statement that sent ' + (hit.gender === 'm' ? 'him' : 'her') + ' away runs until ' + when(until) + ', and ' + (hit.gender === 'm' ? 'he' : 'she') + ' is back that week. The story chose that calendar; the desk cannot shorten it.'),
    'the rested letter of a forced break names the date and does not offer the desk a button');
  t.ok(/The story’s break · week \d+ · rested · back&nbsp;/.test(file()), 'and the file says she is rested, still locked');
  tick(f);
  t.ok(state.week === until && !hit.flags.personalHiatus && hit.flags.scandalBreakUntil == null, 'the clock ends it the week the statement named, and the date comes off the file');
  // a break the desk grants later is the desk's: an older story's date does not end it
  t.ok(KP.declareMemberBreak(state, hit.id).ok, 'fixture: the desk grants a break of its own');
  hit.flags.scandalBreakUntil = state.week + 2;
  t.ok(!brk().forced && KP.breakLock(state, hit) === null, 'a granted break is not forced, whatever date is on the file');
  ride(f, 3);
  t.ok(!!hit.flags.personalHiatus && hit.flags.scandalBreakUntil == null, 'the old date comes off the file and the desk’s break goes on');
  t.ok(KP.endMemberBreak(state, hit.id).ok, 'and the desk ends it when it likes');
  // an old file: a forced break in flight is marked, a granted one beside a stale date is not
  const f2 = act('quiet-forced-old', 70, 50);
  const hit2 = story(f2);
  const mate = f2.ms.find(m => m.id !== hit2.id);
  t.ok(KP.declareMemberBreak(f2.state, mate.id).ok, 'fixture: a groupmate on a break the desk granted');
  ride(f2, 2);
  mate.flags.scandalBreakUntil = f2.state.week + 4;
  const old = JSON.parse(KP.serialize(f2.state));
  old.version = '0.11.19';
  delete old.people[hit2.id].flags.personalHiatus.forced;
  const s2 = KP.deserialize(JSON.stringify(old));
  t.eq(s2.people[hit2.id].flags.personalHiatus.forced, true, 'an old file’s forced break is marked as one');
  t.eq(KP.breakLock(s2, s2.people[hit2.id]), hit2.flags.scandalBreakUntil, 'and locked to its date');
  t.ok(!s2.people[mate.id].flags.personalHiatus.forced && KP.breakLock(s2, s2.people[mate.id]) === null, 'a granted break beside an older story’s date is not');
}

// ---- I. old saves ------------------------------------------------------------------------
{
  const f = act('quiet-old', 5, 50);
  const { state, g } = f, p = f.ms[0];
  KP.declareHiatus(state, g.id);
  ride(f, FULL + 3);
  // an old file, long parked: no stamps, no ledger
  const old = JSON.parse(KP.serialize(state));
  old.version = '0.11.19';
  delete old.quietLedger;
  const og0 = old.groups.find(x => x.id === g.id);
  delete og0.hiatus.restedNoted; delete og0.hiatus.fullNoted; delete og0.hiatus.popAtCool;
  const s = KP.deserialize(JSON.stringify(old));
  const og = s.groups.find(x => x.id === g.id);
  t.eq(s.version, KP.C.VERSION, 'the old file is brought to this version');
  t.eq(JSON.stringify(led(s)), JSON.stringify({ rested: 0, full: 0, breakRested: 0 }), 'its ledger arrives at zero');
  t.ok(hi(og).restedNoted === true && hi(og).fullNoted === true, 'a bet whose rest is in and whose bank is full is stamped');
  const o = { state: s, g: og };
  const wire = ride(o, 3);
  t.eq(allOf(wire, 'hiatusRested').length + allOf(wire, 'hiatusFull').length, 0, 'so neither letter is sent as late news');
  t.ok(rd(s, og).full && rd(s, og).cooled != null, 'the card reads the bank, and the cost from the first week it could be counted');
  // a current file is left as it is
  const cur = KP.deserialize(KP.serialize(state));
  t.eq(JSON.stringify(cur.groups.find(x => x.id === g.id).hiatus), JSON.stringify(g.hiatus), 'a current file’s hiatus is untouched');
}
{
  // an old file three weeks into a bet: nothing is due, and the letters come when they are
  const f = act('quiet-old-early', 62, 50);
  const { state, g } = f;
  KP.declareHiatus(state, g.id);
  ride(f, 3);
  const old = JSON.parse(KP.serialize(state));
  old.version = '0.11.19';
  delete old.quietLedger;
  const s = KP.deserialize(JSON.stringify(old));
  const og = s.groups.find(x => x.id === g.id);
  t.ok(!hi(og).restedNoted && !hi(og).fullNoted, 'a bet that is not there yet is not stamped');
  const wire = ride({ state: s, g: og }, 8);
  t.eq(allOf(wire, 'hiatusRested').length, 1, 'and its rest is said when it comes');
}
{
  // an old file with somebody already rested on a break
  const f = act('quiet-old-break', 5, 50);
  const { state } = f, p = f.ms[0];
  KP.declareMemberBreak(state, p.id);
  p.fatigue = 5;
  const old = JSON.parse(KP.serialize(state));
  old.version = '0.11.19';
  const s = KP.deserialize(JSON.stringify(old));
  t.ok(s.people[p.id].flags.personalHiatus.restedNoted === true, 'a break whose rest is in is stamped');
  t.eq(allOf(ride({ state: s }, 2), 'breakRested').length, 0, 'and its letter is not sent late');
}

// ---- J. determinism -------------------------------------------------------------------
{
  const f = act('quiet-fork', 62, 50);
  const { state, g } = f;
  KP.declareHiatus(state, g.id);
  KP.declareMemberBreak(state, f.ms[0].id);
  const b = KP.deserialize(KP.serialize(state));
  for (let w = 0; w < FULL + 3; w++) { KP.advanceWeek(state); KP.advanceWeek(b); }
  t.eq(KP.serialize(state), KP.serialize(b), 'a hiatus, a break and all three letters fork clean');
  t.ok(led(state).rested >= 1 && led(state).full >= 1, 'fixture: the fork rode through both of the bet’s letters');
  t.eq(JSON.stringify(KP.validateState(state)), '[]', 'and the state is valid at the end of it');
}

t.finish();
