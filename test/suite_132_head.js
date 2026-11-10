/* Suite 132 — the head (v0.11.22, §113: the other side of the wall, part one).
   Each signing house has a head: a name and a temper, stamped once from a
   private stream. The card says who runs the house and what that means.
   The trades' yearly ranking quotes one head, the one whose year it was,
   in a family of lines for that temper.

   Laws (§99): the wire is read before the trim; a fixture forces every
   gate and rolls nothing; a missing letter fails by name. And §112's: a
   letter said once is critical, and held to a loud week here. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const desk = require('../tools/desk_count');
const KP = loadEngine();
const t = makeT('suite_132_head');
const RF = KP.C.RISEFALL, YEAR = KP.C.WEEKS_PER_YEAR;
const TEMPERS = ['duelist', 'broker', 'steward', 'showman'];
const SITS = ['tookTop', 'lostTop', 'heldTop', 'aboveUs', 'chasing'];

// ---- the kit ------------------------------------------------------------------
const world = seed => KP.newGame(seed, null, { legacy: true });
const houses = s => KP.signingHouses(s);
const headOf = (s, r) => KP.rivalHead(s, r) || {};
function tick(s) {
  (s.scenes || []).slice().forEach(sc => { const d = KP.sceneDef(sc.kind); if (d) KP.resolveScene(s, sc.id, d.options(s, sc)[0].id); });
  s.budget = Math.max(s.budget, 900);
  KP.advanceWeek(s);
  return (KP.lastTickNotes || []).slice();
}
const firstOf = (list, ind) => (list || []).find(n => n.ind === ind) || {};
const txt = n => String((n && n.text) || '');
const lands = n => { const crowd = []; for (let i = 0; i < 9; i++) crowd.push({ kind: 'company', priority: 'high', text: 'crowd ' + i }); return !!(n && n.text) && KP.trimWeekNotes(crowd.concat([n]), KP.C.EVENTS.maxInboxPerWeek).includes(n); };
// a ranking as the trades would print it: rows in order, ranks filled in
const rows = list => list.map((x, i) => ({ short: x, name: x + ' Co', isPlayer: x === 'US', score: 100 - i, rank: i + 1 }));
const prevOf = list => ({ year: 1, entries: rows(list) });

// ---- A. the shape -------------------------------------------------------------
{
  ['rivalHead', 'stampHeads', 'headTemperProse', 'rankingStory', 'headQuoteText', 'rankingQuote', 'wallLedger'].forEach(k =>
    t.ok(typeof KP[k] === 'function', 'the engine carries KP.' + k));
  t.eq(KP.HEAD_TEMPERS.join(','), TEMPERS.join(','), 'four tempers');
  const s = world('head-shape');
  t.ok(houses(s).length >= 3, 'fixture: a new career opens with houses across the street (' + houses(s).length + ')');
  houses(s).forEach(r => {
    const h = r.head || {};
    t.ok(/^[A-Z][a-z]+ [A-Z][a-z]+-[a-z]+$/.test(h.name || ''), r.short + ' opens with a head who has a family name and a given name (' + h.name + ')');
    t.ok(TEMPERS.includes(h.temper) && (h.g === 'f' || h.g === 'm') && h.since === 1, r.short + '’s head has a temper, and has been there since the first week');
  });
  t.eq(new Set(houses(s).map(r => (r.head || {}).name)).size, houses(s).length, 'no two heads share a name');
  t.eq(JSON.stringify(s.wallLedger), JSON.stringify({ heads: houses(s).length, quotes: 0 }), 'the ledger counts the heads stamped, and no quote yet');
  const s2 = world('head-shape');
  delete s2.wallLedger;
  KP.ensureLedgers(s2);
  t.eq(JSON.stringify(s2.wallLedger), JSON.stringify({ heads: 0, quotes: 0 }), 'a file with no ledger is given one, at zero');
  t.eq(KP.rivalHead(s, null), null, 'no house has no head');
  t.eq(KP.rivalHead(s, { short: 'ShowHouse', projectHouse: true }), null, 'the broadcaster’s project house is a show, not a house, and has none');
  // each temper's words, and a pronoun that is the head's own
  const prose = TEMPERS.map(k => KP.headTemperProse({ temper: k, g: 'f' }));
  t.ok(prose.every(p => p.length > 20 && !/[{}]/.test(p)) && new Set(prose).size === 4, 'each temper has its own sentence, with no token left in it');
  t.ok(KP.headTemperProse({ temper: 'showman', g: 'm' }).endsWith('meant for him') && KP.headTemperProse({ temper: 'showman', g: 'f' }).endsWith('meant for her'), 'and the showman’s is said of him or of her');
  t.eq(KP.headTemperProse({ temper: 'nobody', g: 'f' }), '', 'a temper nobody has says nothing');
  t.eq(KP.headTemperProse(null), '', 'and no head says nothing');
}

// ---- B. the stamp: once, from a private stream ------------------------------------
{
  const a = world('head-stamp'), b = world('head-stamp');
  t.ok(houses(a).every(r => r.head) && JSON.stringify(houses(a).map(r => r.head)) === JSON.stringify(houses(b).map(r => r.head)), 'the same seed gives the same heads');
  const c = world('head-stamp-other');
  t.ok(JSON.stringify(houses(a).map(r => (r.head || {}).name)) !== JSON.stringify(houses(c).map(r => (r.head || {}).name)), 'and another seed gives others');
  // a head is the house's own: alone in the world, two houses are still run by different people
  const solo = short => { const w = world('head-stamp'); w.rivals = w.rivals.filter(r => r.short === short); w.rivals.forEach(r => { delete r.head; }); return headOf(w, w.rivals[0]).name; };
  const [h0, h1] = houses(a).map(r => r.short);
  t.ok(solo(h0) && solo(h1) && solo(h0) !== solo(h1), 'a head’s name is drawn for the house, not for its place in the list (' + solo(h0) + ', ' + solo(h1) + ')');
  t.eq(solo(h0), (houses(b)[0].head || {}).name, 'and it is the name the house has in the full world');
  // stamping again changes nothing, and draws nothing
  const before = KP.serialize(a);
  t.eq(KP.stampHeads(a), 0, 'a house that has a head is not given another');
  t.eq(KP.serialize(a), before, 'and the file is as it was');
  // heads taken off and stamped again: the same people, and the main stream untouched
  const rs = JSON.stringify(a.rngState);
  const was = houses(a).map(r => JSON.stringify(r.head || null));
  houses(a).forEach(r => { delete r.head; });
  t.eq(houses(a).map(r => JSON.stringify(KP.rivalHead(a, r))).join(), was.join(), 'before the stamp the read already gives the head the stamp will');
  t.ok(houses(a).every(r => !r.head), 'and the read writes nothing');
  t.eq(KP.stampHeads(a), was.length, 'the stamp gives every house without a head one');
  t.eq(houses(a).map(r => JSON.stringify(r.head)).join(), was.join(), 'the same people as before');
  t.eq(JSON.stringify(a.rngState), rs, 'and the main stream has not been drawn from');
  // the world a new game makes is the world it would make with no stamp at all
  const stamp = KP.stampHeads;
  let bare;
  KP.stampHeads = () => 0;
  try { bare = world('head-stamp'); } finally { KP.stampHeads = stamp; }
  t.ok(houses(bare).every(r => !r.head), 'fixture: a world made with the stamp switched off has no heads');
  const strip = s => { const o = JSON.parse(KP.serialize(s)); (o.rivals || []).forEach(r => { delete r.head; }); delete o.wallLedger; return JSON.stringify(o); };
  t.eq(strip(b), strip(bare), 'take the heads off a new world and it is the world made without them: the stamp moves nothing else');
  // and a career rides the same way with heads as without: eight weeks, the same file but for the heads
  const ride = s => { for (let i = 0; i < 8; i++) tick(s); return s; };
  const withHeads = ride(world('head-stamp'));
  KP.stampHeads = () => 0;
  let without;
  try { without = ride(bare); } finally { KP.stampHeads = stamp; }
  const stripLetters = s => { const o = JSON.parse(strip(s)); delete o.inbox; delete o.powerRanking; return JSON.stringify(o); };
  t.eq(stripLetters(withHeads), stripLetters(without), 'eight weeks on, a career with heads is the career without them');
}
{
  // the tempers are spread: forty worlds, every temper somewhere, none everywhere
  const count = {}, firstTemper = new Set(), gender = {};
  let n = 0, allAlike = 0;
  for (let i = 0; i < 40; i++) {
    const hs = houses(world('head-spread-' + i)).map(r => r.head || {});
    hs.forEach(h => { count[h.temper] = (count[h.temper] || 0) + 1; gender[h.g] = (gender[h.g] || 0) + 1; n++; });
    firstTemper.add(hs[0].temper);
    if (new Set(hs.map(h => h.temper)).size === 1) allAlike++;
  }
  t.ok(TEMPERS.every(k => count[k] >= n * 0.1 && count[k] <= n * 0.45), 'over forty worlds each temper runs between a tenth and under half of the houses (' + TEMPERS.map(k => k + ' ' + (count[k] || 0)).join(', ') + ' of ' + n + ')');
  t.ok(firstTemper.size >= 3, 'the same house has different tempers in different worlds (' + firstTemper.size + ' of four)');
  t.ok(allAlike <= 12, 'and the houses of one world do not share one temper as a rule (' + allAlike + ' worlds of forty)');
  t.ok((gender.f || 0) >= n * 0.3 && (gender.m || 0) >= n * 0.3, 'heads are women and men (' + (gender.f || 0) + ' and ' + (gender.m || 0) + ')');
}
{
  // a name already carried is drawn again
  const s = world('head-clash');
  const [r0, r1] = houses(s);
  const wanted = (() => { const keep = r1.head; delete r1.head; const h = KP.rivalHead(s, r1); r1.head = keep; return h.name; })();
  delete r1.head;
  (r0.head = r0.head || {}).name = wanted;
  const h = KP.rivalHead(s, r1);
  t.ok(h.name && h.name !== wanted, 'a head is not given a name another head carries (' + wanted + ' was taken; ' + h.name + ')');
  // nor our own executive's
  delete r0.head; delete r1.head;
  const free = KP.rivalHead(s, r0).name;
  const exec = s.executive.name;
  s.executive.name = 'CEO ' + free;
  t.ok(KP.rivalHead(s, r0).name !== free, 'nor the name of our own executive');
  s.executive.name = exec;
  KP.stampHeads(s);
  t.eq(new Set(houses(s).map(r => r.head.name)).size, houses(s).length, 'stamped, they are all different people');
}
{
  // a house founded mid-career has its head by the next tick, and the read gave it already
  const s = world('head-founded');
  for (let i = 0; i < 3; i++) tick(s);
  const fresh = { name: 'Lantern Works', short: 'Lantern', philosophy: 'hungry', blurb: 'New money.', prestige: 30, interest: {}, acts: [], recentMoves: [] };
  s.rivals.push(fresh);
  const promised = headOf(s, fresh);
  t.ok(!!promised.name && !fresh.head, 'a house founded this week can be asked who runs it, and nothing is written');
  const stamped0 = s.wallLedger.heads;
  tick(s);
  t.eq(JSON.stringify({ name: (fresh.head || {}).name, temper: (fresh.head || {}).temper }), JSON.stringify({ name: promised.name, temper: promised.temper }), 'by the next tick the head is stamped: the one the read gave');
  t.eq((fresh.head || {}).since, s.week, 'since the week of the stamp');
  t.eq(s.wallLedger.heads, stamped0 + 1, 'and counted');
  // a project house founded the same way gets none
  const show = { name: 'The Show', short: 'Show', philosophy: 'hungry', blurb: '', prestige: 30, interest: {}, acts: [], recentMoves: [], projectHouse: true };
  s.rivals.push(show);
  tick(s);
  t.ok(!show.head, 'the project house is not stamped');
}

// ---- C. whose year it was --------------------------------------------------------
{
  const s = world('head-story');
  const [A, B, C] = houses(s).map(r => r.short);
  const story = (now, before) => { const x = KP.rankingStory(s, rows(now), before ? prevOf(before) : null); return x ? x.house.short + '|' + x.sit : 'none'; };
  t.eq(story([A, 'US', B, C], ['US', A, B, C]), A + '|tookTop', 'a house that took the seat is the story, whoever held it');
  t.eq(story([A, B, 'US', C], [B, A, 'US', C]), A + '|tookTop', 'also when it took it from another house');
  t.eq(story(['US', A, B, C], [A, 'US', B, C]), A + '|lostTop', 'when we take it, the house that lost it is');
  t.eq(story(['US', B, A, C], [A, 'US', B, C]), A + '|lostTop', 'wherever on the list it fell to');
  t.eq(story(['US', A, B, C], ['US', A, B, C]), A + '|chasing', 'when we hold it, the house in second is');
  t.eq(story(['US', B, A, C], null), B + '|chasing', 'and in a first ranking with us on top');
  t.eq(story([A, 'US', B, C], [A, 'US', B, C]), A + '|heldTop', 'when a house holds the top one rung above us, it is');
  t.eq(story([A, B, 'US', C], [A, B, 'US', C]), B + '|aboveUs', 'otherwise the house one rung above us is');
  t.eq(story([A, B, C, 'US'], null), C + '|aboveUs', 'from the bottom of a first ranking too');
  // a house that lost the seat to us and is gone: the chaser speaks
  t.eq(story(['US', B, C], ['Gone', 'US', B, C]), B + '|chasing', 'if the house that lost the seat no longer stands, the chaser is');
  t.eq(story(['US'], ['US']), 'none', 'alone on the list, nobody is quoted');
  t.eq(KP.rankingStory(s, [], null), null, 'and an empty list has no story');
  const before = KP.serialize(s);
  KP.rankingStory(s, rows([A, 'US', B, C]), prevOf(['US', A, B, C]));
  t.eq(KP.serialize(s), before, 'the read changes nothing');
}

// ---- D. the families: four tempers, five seats, two lines each --------------------
{
  const s = world('head-lines');
  const r = houses(s)[0];
  const Q = KP.HEAD_QUOTES;
  t.eq(Object.keys(Q).sort().join(','), TEMPERS.slice().sort().join(','), 'a family of lines for each temper');
  const all = [];
  TEMPERS.forEach(k => SITS.forEach(sit => {
    const fam = (Q[k] || {})[sit] || [];
    t.ok(fam.length >= 2 && new Set(fam).size === fam.length, k + ' / ' + sit + ' has two lines or more, all different');
    fam.forEach(l => {
      all.push(l);
      t.ok(l.includes('{N}') && l.includes('{CO}') && /[.”]$/.test(l), k + ' / ' + sit + ': the line names the head and the house, and ends as a sentence');
    });
  }));
  t.eq(new Set(all).size, all.length, 'no line is used in two places (' + all.length + ' lines)');
  // filled: the head's name, the house, our house, the head's pronouns
  TEMPERS.forEach(k => SITS.forEach(sit => {
    ['f', 'm'].forEach(g => {
      r.head = { name: 'Seo Min-jae', g, temper: k, since: 1 };
      [null, 0].forEach(last => {
        const q = KP.headQuoteText(s, r, sit, last) || {};
        const fam = Q[k][sit];
        t.ok(q.text && !/[{}]/.test(q.text) && q.text.includes('Seo Min-jae') && q.text.includes(r.short), k + ' / ' + sit + ' / ' + g + ': filled, with the head and the house in it');
        t.ok(q.i >= 0 && q.i < fam.length && (last == null || q.i !== last), k + ' / ' + sit + ': the line is one of the family, and not the one said last time');
        t.ok(g === 'm' ? !/\b(she|her)\b/.test(q.text) : !/\b(he|him|his)\b/.test(q.text), k + ' / ' + sit + ' / ' + g + ': the pronouns are the head’s own');
      });
    });
  }));
  t.eq(KP.headQuoteText(s, r, 'noSuchSeat', null), null, 'a seat nobody has a line for gives nothing');
  // {US} is our house
  r.head = { name: 'Seo Min-jae', g: 'f', temper: 'duelist', since: 1 };
  const withUs = Q.duelist.aboveUs.map((l, i) => KP.headQuoteText(s, r, 'aboveUs', i === 0 ? 1 : 0).text);
  t.ok(withUs.every(x => x.includes(s.company.short)), 'a line that names us names our house');
}

// ---- E. the ranking quotes a head --------------------------------------------------
{
  const s = world('head-ranking');
  // ride to the week before the trades' January issue
  let guard = 0;
  while (!((s.week + 1) % YEAR === RF.rankWeek % YEAR && s.week + 1 > 4) && guard++ < 80) tick(s);
  const quotes0 = s.wallLedger.quotes;
  const wire = tick(s);
  const n = firstOf(wire, 'powerRanking');
  t.ok(txt(n).startsWith('The trades published the annual power ranking. #1: '), 'fixture: the January issue came out (week ' + s.week + ')');
  const q = (s.powerRanking || {}).quote || {};
  const house = houses(s).find(r => r.short === q.short) || {};
  t.ok(house.head && q.head === house.head.name && q.temper === house.head.temper && SITS.includes(q.sit), 'the ranking remembers whom it quoted, and in which seat');
  const fam = ((KP.HEAD_QUOTES[q.temper] || {})[q.sit] || []).map(l => KP.fillPro(l.split('{N}').join(q.head).split('{CO}').join(q.short).split('{US}').join(s.company.short), { gender: (house.head || {}).g }));
  t.ok(fam.some(l => txt(n).endsWith(' ' + l)), 'the letter ends with a line from that head’s family for that seat');
  t.eq(s.wallLedger.quotes, quotes0 + 1, 'one quote a ranking');
  t.eq(JSON.stringify(Object.keys(s.wallLedger.last || {}).sort()), JSON.stringify(['i', 'key']), 'and the line is remembered for next year');
  t.eq(n.priority, 'critical', 'the January issue is said once a year, so it is critical');
  t.ok(lands(n), 'and a loud week does not cut it');
  t.ok(desk.ONE_SHOTS.includes('powerRanking'), 'it is on the list of letters said once');
  // next year, the same house in the same seat is not given the same line
  const last = s.wallLedger.last || {};
  const again = house.short ? KP.headQuoteText(s, house, q.sit, last.i) : null;
  t.ok(!!again && last.i != null && again.i !== last.i, 'the same head in the same seat next year says the family’s other line');
  // the memory is of one house in one seat: another house, or another seat, is not held to it
  {
    const w = world('head-memory');
    const [A, B, C] = houses(w).map(r => r.short);
    const now = rows([A, B, 'US', C]), before = prevOf([A, B, 'US', C]);
    const say = () => KP.rankingQuote(w, now, before) || {};
    const free = say();                                                // B, aboveUs: the line the hash picks
    const fam = ((KP.HEAD_QUOTES[free.temper] || {})[free.sit] || []).map(l => KP.fillPro(l.split('{N}').join(free.head).split('{CO}').join(free.short).split('{US}').join(w.company.short), { gender: ((houses(w).find(r => r.short === free.short) || {}).head || {}).g }));
    const picked = fam.indexOf(free.text);
    t.ok(picked >= 0, 'fixture: the line said is one of the family');
    t.eq([free.short, free.sit, free.head, free.temper].join('|'), [B, 'aboveUs', (houses(w)[1].head || {}).name, (houses(w)[1].head || {}).temper].join('|'), 'the quote says whose it is, from which seat, and in what temper');
    const took = KP.rankingQuote(w, rows([A, 'US', B, C]), prevOf(['US', A, B, C])) || {};
    t.eq([took.short, took.sit].join('|'), [A, 'tookTop'].join('|'), 'and a house that took the seat is quoted as having taken it');
    w.wallLedger.last = { key: C + '|aboveUs', i: picked };            // last year another house said its line of that number
    t.eq(say().text, free.text, 'a line another house said last year is not held against this one');
    w.wallLedger.last = { key: B + '|heldTop', i: picked };            // or this house, from another seat
    t.eq(say().text, free.text, 'nor a line this house said from another seat');
    w.wallLedger.last = { key: B + '|aboveUs', i: picked };            // the same house in the same seat
    const other = say();                                               // said once: each saying is remembered
    t.ok(!!other.text && other.text !== free.text, 'the same house in the same seat is given the other line');
  }
  // a ranking with nobody to quote still goes out
  const lone = world('head-alone');
  lone.rivals = lone.rivals.filter(r => r.projectHouse);
  guard = 0;
  while (!((lone.week + 1) % YEAR === RF.rankWeek % YEAR && lone.week + 1 > 4) && guard++ < 80) { lone.rivals = lone.rivals.filter(r => r.projectHouse); tick(lone); }
  lone.rivals = lone.rivals.filter(r => r.projectHouse);
  const ln = firstOf(tick(lone), 'powerRanking');
  t.ok(txt(ln).startsWith('The trades published the annual power ranking. #1: ') && !(lone.powerRanking || {}).quote, 'with no house across the street the ranking goes out and quotes nobody');
}

// ---- F. the card ---------------------------------------------------------------------
{
  const s = world('head-card');
  const { App, el } = dom.load();
  const scene = () => { App.state = s; App.mode = 'game'; App.tab = 'industry'; App.industrySub = 'scene'; App.view = null; App.render(); return el('screen').innerHTML; };
  const html = scene();
  houses(s).forEach(r => {
    const h = r.head || {};
    t.ok(!!h.name && html.includes('<span style="color:var(--ink)">' + h.name + '</span> runs it: a ' + h.temper + ', who ' + KP.headTemperProse(h) + '.</div>'), r.short + '’s card says who runs it, and what the temper means');
  });
  t.eq((html.match(/class="rv-head"/g) || []).length, houses(s).length, 'one such line a house');
  t.ok(!/\{(she|her|pos)\}/.test(html), 'and no token is left on the page');
  // a house founded this week is on the page with the head it will have
  const fresh = { name: 'Lantern Works', short: 'Lantern', philosophy: 'hungry', blurb: 'New money.', prestige: 30, interest: {}, acts: [], recentMoves: [] };
  s.rivals.push(fresh);
  const before = KP.serialize(s);
  const html2 = scene();
  t.ok(html2.includes('>' + headOf(s, fresh).name + '</span> runs it: a '), 'a house a day old is shown with its head');
  t.eq(KP.serialize(s), before, 'and drawing the page writes nothing');
}

// ---- G. old saves ---------------------------------------------------------------------
{
  const s = world('head-old');
  for (let i = 0; i < 4; i++) tick(s);
  const was = houses(s).map(r => JSON.stringify({ name: (r.head || {}).name, g: (r.head || {}).g, temper: (r.head || {}).temper }));
  const old = JSON.parse(KP.serialize(s));
  old.version = '0.11.21';
  old.rivals.forEach(r => { delete r.head; });
  delete old.wallLedger;
  const back = KP.deserialize(JSON.stringify(old));
  t.eq(houses(back).map(r => JSON.stringify({ name: (r.head || {}).name, g: (r.head || {}).g, temper: (r.head || {}).temper })).join(), was.join(), 'an old file’s houses get the heads a new game would have given them');
  t.ok(houses(back).every(r => (r.head || {}).since === back.week), 'since the week the file was opened');
  t.eq(JSON.stringify(back.wallLedger), JSON.stringify({ heads: was.length, quotes: 0 }), 'and its ledger starts there');
  t.eq(JSON.stringify(back.rngState), JSON.stringify(s.rngState), 'the main stream is where it was');
  // a current file is left alone
  const cur = KP.deserialize(KP.serialize(s));
  t.eq(KP.serialize(cur), KP.serialize(s), 'a file already at this version loads as it was saved');
}

t.finish();
