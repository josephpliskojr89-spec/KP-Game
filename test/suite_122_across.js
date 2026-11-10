/* Suite 122 — across the street (v0.11.12, §103; §96 recommendation 4, what
   comes after). Owner: "Break remaining work into smaller pieces": the
   last piece of the long goodbye ships on its own.

   The survey's finding: "a departed idol's file 'stays open forever' and
   is reachable from no list." v0.11.10 made it reachable. Nothing was ever
   written in it again.

   Pinned here:
   · a departed artist's next chapter is on a clock of her own, read off
     the week she left; nothing is written before its date
   · the chapter is one of two: another house signs her as a soloist, or
     she builds a life outside the industry. Her own name, how she left
     and her age set the odds; an empty street leaves only the second
   · the signing is a letter whose tone is how she left, and each tone
     has one small consequence
   · she stays 'departed' until her record lands, then she is a rival act
     of one: on the chart, off every rookie list, carried by the machinery
     that carries any rival act
   · no chapter draws from the main stream
   · every artist who was ours stays on the alumni list, wherever she is
   · an old file's overdue chapters are spread out, not written in a week
   · the screens: the Talent tab, her file, the act's page, the Industry tab
   Two laws from §99 hold throughout: the week's wire is read before the
   trim, and a fixture forces every gate and relies on no roll. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_122_across');

const A = KP.C.ACROSS, C = KP.C.CONTRACT, YEAR = KP.C.WEEKS_PER_YEAR;
const firstOf = list => (list && list[0]) || { text: '', priority: null, shape: null, week: null };
const noisy = x => /undefined|NaN|\{she\}|\{her\}|\{pos\}|\{herself\}|\{hers\}|\{She\}|\{Pos\}|\{CO\}|\[object/.test(x);
const when = w => KP.weekLabel(w).text;
const count = (p, kind) => (p.directed || []).filter(d => d.kind === kind).length;

function answerAll(eng, s, skip) {
  (s.scenes || []).slice().forEach(sc => {
    if (skip && skip.includes(sc.kind)) return;
    const def = eng.sceneDef(sc.kind);
    if (def) eng.resolveScene(s, sc.id, def.options(s, sc)[0].id);
  });
}
function tick(eng, s) {
  s.budget = Math.max(s.budget, 900);
  eng.advanceWeek(s);
  return (eng.lastTickNotes || []).slice();
}

// ---- the fixture: the opening's inherited act, everyone on a fresh seven ----
const base = (() => {
  const s = KP.newGame('across-122', null, { legacy: true });
  const g = s.groups.find(x => x.debuted);
  tick(KP, s);
  g.members.forEach(id => { s.people[id].contract.start = s.week; s.people[id].contract.term = 2; });
  s.scenes = (s.scenes || []).filter(sc => sc.kind !== 'renewal');
  return { s, gid: g.id, ids: g.members.slice() };
})();
function fork(src) {
  const s = KP.deserialize(KP.serialize((src || base).s));
  return { s, g: s.groups.find(x => x.id === base.gid), gid: base.gid, ids: base.ids.slice() };
}
const CO = base.s.company.short;
const runTo = (f, week) => { const wire = []; while (f.s.week < week) { answerAll(KP, f.s); tick(KP, f.s).forEach(n => wire.push(n)); } return wire; };
const mine = (wire, ind, id) => wire.filter(n => n.ind === ind && (id == null || n.personId === id));
const lands = n => { const crowd = []; for (let i = 0; i < 9; i++) crowd.push({ kind: 'company', priority: 'high', text: 'crowd ' + i }); return !!(n && n.text) && KP.trimWeekNotes(crowd.concat([n]), KP.C.EVENTS.maxInboxPerWeek).includes(n); };   // nine high letters pushed before it, and the week's budget of five (v0.11.21, §112)
// a member leaves, in one of the five shapes an exit can have. Every gate
// of the exit is forced on her paper; the verb is the game's own.
function leave(f, i, shape) {
  const p = f.s.people[f.ids[i]];
  if (shape === 'cold') KP.departIdol(f.s, p.id, 'cold', null);
  else if (shape === 'released') KP.departIdol(f.s, p.id, 'warm', null);
  else {
    KP.beginLap(f.s, p, 'warm');
    if (shape === 'plain') { p.contract.told = 'fans'; p.contract.toldWeek = f.s.week; }
    if (shape === 'bow') { p.contract.told = 'era'; p.contract.toldWeek = f.s.week; p.contract.farewellEra = { week: f.s.week }; }
    KP.departIdol(f.s, p.id, 'warm', null);
  }
  return p;
}
// the two forced ends of the odds: a name and an exit no hash can refuse,
// and an age no house signs
const sure = p => { p.social = 600000; };                 // forced: the top step of her own name
const never = p => { p.age = 60; };                       // forced: far past the market's clock
const due = (f, p) => { p.flags.nextAt = f.s.week + 1; }; // forced: her chapter is next week
const houses = s => KP.signingHouses(s).slice().sort((a, b) => (b.prestige || 0) - (a.prestige || 0) || (a.short < b.short ? -1 : 1));

// ---- the fixture is what the tests think it is ----
{
  const f = fork();
  t.eq(f.g.members.length, 4, 'fixture: the inherited act has four members');
  t.ok(houses(f.s).length >= 3, 'fixture: at least three houses sign people (' + houses(f.s).map(r => r.short).join(', ') + ')');
  t.ok(f.ids.every(id => f.s.people[id].age < A.ageFrom && KP.socialOf(f.s, f.s.people[id]) < 150000), 'fixture: all four are under the market’s clock and none is a name yet');
  // re-pinned v0.11.15: the ledger gained the count of solo runs that ended (suite_125)
  t.eq(JSON.stringify(f.s.acrossLedger), JSON.stringify({ clocked: 0, signed: 0, debuted: 0, lives: 0, fell: 0, bow: 0, plain: 0, released: 0, sudden: 0, cold: 0, friends: 0, ended: 0 }), 'fixture: the ledger exists from week one and counts nothing');
  t.ok(!!KP.newGame('across-122-b', null, { legacy: false }).acrossLedger, 'on every door into the game');
  t.eq(KP.alumniOf(f.s).length, 0, 'fixture: nobody has left yet');
  t.ok(A.signBase + 4 * A.signPerFame + A.coldBonus >= 1, 'fixture: a cold exit with the biggest name is a signing no hash can refuse');
  t.ok(A.signBase - (60 - A.ageFrom) * A.agePerYear < 0, 'fixture: at sixty the odds are under zero');
  t.eq(KP.validateState(f.s).length, 0, 'fixture: the file is valid');
}

// ---- how she left stays on her file ----
{
  const shapes = ['bow', 'plain', 'released', 'sudden', 'cold'];
  const got = shapes.map((sh, i) => { const f = fork(); const p = leave(f, i % 4, sh); return { f, p, sh }; });
  t.eq(got.map(x => x.p.flags.departShape).join(','), shapes.join(','), 'the exit stamps its shape: the bow, a plain goodbye, a release, a sudden one, a cold one');
  t.eq(got.map(x => KP.exitShape(x.f.s, x.p)).join(','), shapes.join(','), 'and the read returns it');
  // an artist who left before the stamp existed: read back off the file
  got.forEach(x => { delete x.p.flags.departShape; });
  t.eq(got.map(x => KP.exitShape(x.f.s, x.p)).join(','), 'bow,plain,released,plain,cold', 'without the stamp it is read off her chapters and her paper (a sudden goodbye cannot be told from a plain one, and is not guessed)');
  t.ok(got.every(x => x.p.status === 'departed' && KP.isAlum(x.f.s, x.p)), 'each of them is an alumna');
  t.ok(!KP.isAlum(base.s, base.s.people[base.ids[0]]), 'and a member who has not left is not');
}

// ---- the clock: her next chapter has a date, and nothing is written before it ----
{
  const f = fork();
  const p = leave(f, 0, 'cold'), q = leave(f, 1, 'released');
  const LEFT = f.s.week;
  t.ok(p.flags.nextAt === undefined && f.s.acrossLedger.clocked === 0, 'the exit itself sets no clock');
  answerAll(KP, f.s); tick(KP, f.s);
  const at = [p.flags.nextAt, q.flags.nextAt];
  t.ok(at.every(w => w >= LEFT + A.waitMin && w <= LEFT + A.waitMax), 'the first week after, each has a date: ' + A.waitMin + ' to ' + A.waitMax + ' weeks after she left (' + at.map(w => w - LEFT).join(' and ') + ')');
  // the date is the wait's floor plus her own share of its span
  const dateOf = x => LEFT + A.waitMin + Math.floor(KP.hash01([f.s.seed, x.id, 'across', 'wait'].join('|')) * (A.waitMax - A.waitMin + 1));
  t.eq(at.join(','), [dateOf(p), dateOf(q)].join(','), 'exactly: the shortest wait, plus her own share of the rest');
  t.eq(f.s.acrossLedger.clocked, 2, 'the ledger counts two clocks');
  const again = fork(); leave(again, 0, 'cold'); leave(again, 1, 'released'); answerAll(KP, again.s); tick(KP, again.s);
  t.eq([again.s.people[p.id].flags.nextAt, again.s.people[q.id].flags.nextAt].join(','), at.join(','), 'the date is hers: the same file gives the same dates');
  const first = Math.min.apply(null, at);
  const wire = runTo(f, first - 1);
  t.eq(mine(wire, 'acrossSigned').length + mine(wire, 'alumAfter').length + mine(wire, 'acrossDebut').length, 0, 'up to the week before the first date, nothing is written');
  t.ok([p, q].every(x => !x.flags.across && !x.flags.after && x.status === 'departed') && [p.flags.nextAt, q.flags.nextAt].join(',') === at.join(','), 'and neither file has moved');
  t.eq(f.s.acrossLedger.clocked, 2, 'a clock is set once');
  t.ok(f.ids.slice(2).every(id => f.s.people[id].flags.nextAt === undefined), 'a member who is still here has no such clock');
  t.eq(KP.validateState(f.s).length, 0, 'the file is valid');
}

// ---- the odds: her own name, how she left, her age ----
{
  const f = fork();
  const p = f.s.people[f.ids[0]];
  const cold = fork(); const pc = leave(cold, 0, 'cold');
  const warm = fork(); const pw = leave(warm, 0, 'plain');
  const before = KP.serialize(cold.s);
  t.eq(KP.acrossChance(cold.s, pc), A.signBase + A.coldBonus, 'a cold exit: the base and the cold bonus');
  t.eq(KP.serialize(cold.s), before, 'reading the odds writes nothing');
  t.eq(KP.acrossChance(warm.s, pw), A.signBase, 'a warm one: the base');
  pw.social = 150000 * 3;
  t.ok(Math.abs(KP.acrossChance(warm.s, pw) - (A.signBase + 3 * A.signPerFame)) < 1e-9, 'each step of her own name adds to it');
  pw.social = 150000 * 40;
  t.ok(Math.abs(KP.acrossChance(warm.s, pw) - (A.signBase + 4 * A.signPerFame)) < 1e-9, 'up to four steps');
  pw.social = 0; pw.age = A.ageFrom + 3;
  t.ok(Math.abs(KP.acrossChance(warm.s, pw) - (A.signBase - 3 * A.agePerYear)) < 1e-9, 'and every birthday past the market’s clock takes from it');
  t.ok(!!p, 'fixture');
}

// ---- a signing no hash can refuse: the rail writes it on her date ----
const signed = (() => {
  const f = fork();
  const p = leave(f, 0, 'cold');
  sure(p); due(f, p);
  f.trust0 = f.s.trust;
  f.wire = (answerAll(KP, f.s), tick(KP, f.s));
  f.pid = p.id;
  return f;
})();
{
  const f = fork(signed); const p = f.s.people[signed.pid];
  const n = firstOf(mine(signed.wire, 'acrossSigned', p.id));
  const top = houses(base.s).slice(0, Math.ceil(houses(base.s).length / 2)).map(r => r.short);
  t.eq(mine(signed.wire, 'acrossSigned').length + '|' + n.priority + '|' + n.shape, '1|critical|cold', 'on her date the signing is one letter, said once and so critical, in the tone of how she left');
  t.ok(lands(n), 'and a loud week does not cut it');
  t.ok(!!p.flags.across && p.flags.across.week === f.s.week, 'her file carries the signing, and its week');
  // on the books between the houses (v0.11.23, §114): the house that signed her, and only that house
  const across = (p.flags.across || {}).company;
  t.eq(f.s.rivals.filter(r => !r.projectHouse).map(r => r.short + ':' + (r.directed || []).filter(a => a.kind === 'theySignedOurAlumna' && a.week === f.s.week).length).join(),
    f.s.rivals.filter(r => !r.projectHouse).map(r => r.short + ':' + (r.short === across ? 1 : 0)).join(), 'the house that signed her has it on its books, that week, and no other house does');
  t.ok(top.includes(p.flags.across.company), 'a name this big signs with the top half of the street (' + p.flags.across.company + ' of ' + top.join(', ') + ')');
  t.eq(n.company, p.flags.across.company, 'the letter names the same house');
  t.ok(p.flags.across.debutAt >= f.s.week + A.debutMin && p.flags.across.debutAt <= f.s.week + A.debutMax, 'with a date for her first record there: ' + A.debutMin + ' to ' + A.debutMax + ' weeks out (' + (p.flags.across.debutAt - f.s.week) + ')');
  t.eq(p.status + '|' + (p.company || 'no house'), 'departed|no house', 'she is not on that house’s floor: she stays departed until the record lands');
  t.ok(houses(f.s).every(r => !KP.rivalFloor(f.s, r).some(x => x.id === p.id)), 'no house can cast her into a rookie lineup');
  const last = p.chapters[p.chapters.length - 1];
  t.eq(KP.chapterLine(f.s, last), 'Signed to ' + p.flags.across.company + ' as a soloist', 'the chapter on her file');
  t.eq(KP.whereNow(f.s, p), 'signed with ' + p.flags.across.company + ' as a soloist', 'and where she is now, in words');
  t.ok(/^Signed with .* as a soloist, \d+ weeks after leaving /.test(p.history[p.history.length - 1].text), 'it is in her history');
  t.eq(f.s.acrossLedger.signed + '|' + f.s.acrossLedger.cold + '|' + f.s.acrossLedger.lives, '1|1|0', 'the ledger counts a signing, and its tone');
  t.ok(n.text.startsWith(KP.displayName(p) + ', formerly of ' + f.g.name + ', has signed with ' + p.flags.across.company + ' as a soloist, ') && n.text.includes('weeks after her contract with ' + CO + ' expired.') && !noisy(n.text), 'the letter: who, from where, to where, how long after, and how the paper ended');
  t.eq(KP.validateState(f.s).length, 0, 'the file is valid');
  // nothing more is written until her record
  const wire = runTo(f, p.flags.across.debutAt - 1);
  t.eq(mine(wire, 'acrossSigned').length + mine(wire, 'acrossDebut').length + mine(wire, 'alumAfter').length, 0, 'between the signing and the record, nothing');
}

// ---- the tone, and what each tone costs or gives ----
{
  const tone = (shape, mut) => {
    const f = fork();
    const p = leave(f, 0, shape);
    f.s.week += 20;   // forced: twenty weeks on, so the letter has a span to say
    if (mut) mut(f, p);
    const was = { trust: f.s.trust, grudge: f.g.fandomGrudge || 0, rng: JSON.stringify(f.s.rngState) };
    const inbox = [];
    KP.acrossSign(f.s, p, houses(f.s)[0], inbox);
    return { f, p, n: firstOf(inbox), was, inbox };
  };
  const bow = tone('bow'), plain = tone('plain'), rel = tone('released'), sud = tone('sudden'), cold = tone('cold');
  t.ok([bow, plain, rel, sud, cold].every(x => x.inbox.length === 1 && x.n.ind === 'acrossSigned' && !noisy(x.n.text)), 'each tone writes one whole letter');
  t.ok([bow, plain, rel, sud, cold].every(x => JSON.stringify(x.f.s.rngState) === x.was.rng), 'and the signing draws nothing from the main stream');
  t.ok(bow.n.text.includes('The announcement thanks ' + CO + ' by name, twice, and uses a photo from her last stage there.'), 'after a bow she thanks the company by name');
  t.eq(bow.f.s.trust, bow.was.trust + A.trustBow, 'and the board reads that: trust rises');
  t.ok(bow.n.text.includes(bow.f.s.executive.name + ' had it forwarded upstairs'), 'the letter says so');
  t.ok(plain.n.text.includes('The announcement is cordial, brief, and wishes everyone at ' + CO + ' well.') && plain.f.s.trust === plain.was.trust, 'a plain goodbye: cordial, and nothing moves');
  t.ok(rel.n.text.includes('weeks after her contract with ' + CO + ' was dissolved at her own request.') && rel.n.text.includes('“a fresh start”') && rel.f.s.trust === rel.was.trust, 'a release: a fresh start, and nothing moves');
  t.ok(cold.n.text.includes('The announcement does not mention ' + CO + '. The comment section does, at length.'), 'after a cold exit the announcement leaves the company out');
  t.eq(cold.f.s.trust, cold.was.trust + A.trustCold, 'and the board reads that too: trust falls');
  t.ok(A.trustBow > 0 && A.trustCold < 0, 'by rule');
  t.ok(sud.n.text.includes('“being able to say hello and goodbye properly this time”'), 'after a sudden goodbye she says what she was not given');
  t.eq(sud.f.g.fandomGrudge || 0, sud.was.grudge + A.grudgeSudden, 'and the fandom of the act she left remembers it');
  t.ok(sud.n.text.includes(sud.f.g.name + '’s fandom has not forgotten how she had to leave'), 'the letter says so');
  t.eq([bow, plain, rel, cold].map(x => (x.f.g.fandomGrudge || 0) - x.was.grudge).join(','), '0,0,0,0', 'no other tone touches the fandom');
  t.eq([bow, plain, rel, sud, cold].map(x => x.f.s.acrossLedger[x.p.flags.departShape]).join(','), '1,1,1,1,1', 'the ledger counts each tone under its own name');
  // a promise broken on her file speaks, whatever the exit looked like
  const brk = tone('plain', (f, p) => { KP.recordDirected(f.s, p.id, 'promiseBroken'); });
  t.ok(brk.n.text.includes('Asked about her last year there, she said she had learned to get dates in writing.') && (brk.f.g.fandomGrudge || 0) === brk.was.grudge + A.grudgeSudden, 'a broken promise on her file: she says so, and the old fandom hears it');
  // an act that is gone has no fandom left to be reminded
  const gone = tone('sudden', (f) => { f.g.retiredWeek = f.s.week; });
  t.ok(!gone.n.text.includes('has not forgotten') && (gone.f.g.fandomGrudge || 0) === gone.was.grudge, 'an act that has concluded has no fandom to remind');
  t.ok(bow.n.text.includes(', has signed with ' + houses(bow.f.s)[0].short + ' as a soloist, 20 weeks after her contract with ' + CO + ' completed.'), 'the span is counted from the week she left');
}

// ---- a life outside the industry ----
{
  const f = fork();
  const p = leave(f, 1, 'plain');
  never(p); due(f, p);
  answerAll(KP, f.s);
  const wire = tick(KP, f.s);
  const n = firstOf(mine(wire, 'alumAfter', p.id));
  // re-pinned v0.11.15: the letter is high, not normal. Measured over the
  // soak's long careers the week's budget of five kept a normal one three
  // times in five; it is the one letter that closes her file (suite_125).
  t.eq(mine(wire, 'alumAfter').length + '|' + n.priority + '|' + mine(wire, 'acrossSigned').length, '1|critical|0', 'past the market’s clock her chapter is one critical letter, and no signing');
  t.ok(lands(n), 'which the week will not cut, however loud');
  if (!p.flags.after) p.flags.after = { week: null, what: '' };   // a chapter that is not there fails the checks below by name
  t.ok(p.flags.after.week === f.s.week && typeof p.flags.after.what === 'string' && p.flags.after.what.length > 10, 'her file carries what she does now');
  t.ok(n.text.startsWith('Word from outside the building: ' + KP.displayName(p) + ', formerly of ' + f.g.name + ', ' + p.flags.after.what + '.') && !noisy(n.text), 'the letter says it in the same words');
  t.eq(p.status, 'departed', 'she stays an alumna on the books');
  t.eq(KP.chapterLine(f.s, p.chapters[p.chapters.length - 1]), p.flags.after.what.replace(/^./, c => c.toUpperCase()), 'the chapter on her file');
  t.eq(KP.whereNow(f.s, p), p.flags.after.what, 'and where she is now');
  t.eq(f.s.acrossLedger.lives + '|' + f.s.acrossLedger.signed + '|' + f.s.acrossLedger.fell, '1|0|0', 'the ledger counts a life outside');
  const later = runTo(f, f.s.week + 45);
  t.eq(mine(later, 'alumAfter').length + mine(later, 'acrossSigned').length + mine(later, 'acrossDebut').length, 0, 'the chapter is written once: nothing follows it');
  t.eq(KP.validateState(f.s).length, 0, 'the file is valid');
  // what she does is read off what she was best at
  const best = (key) => {
    const g2 = fork(); const q = leave(g2, 2, 'plain');
    Object.keys(q.talents).forEach(k => { q.talents[k].cur = k === key ? 95 : 20; });   // forced: one clear best
    const lines = new Set();
    for (let i = 0; i < 40; i++) { const x = KP.deserialize(KP.serialize(g2.s)); x.seed = 'life-' + i; const qq = x.people[q.id]; const inbox = []; KP.acrossAfter(x, qq, inbox, false); lines.add(qq.flags.after.what); }
    return [...lines];
  };
  const dance = best('dance'), vocals = best('vocals');
  t.ok(dance.some(l => /dance studio|choreographs/.test(l)) && !dance.some(l => /voice|demos/.test(l)), 'a dancer’s life outside is a dancer’s (' + dance.length + ' lines seen)');
  t.ok(vocals.some(l => /voice|demos/.test(l)) && !vocals.some(l => /dance studio|choreographs/.test(l)), 'a vocalist’s is a vocalist’s');
  t.ok(dance.some(l => /went back to school|went home/.test(l)), 'and some simply go home');
  // an empty street: even the surest signing has nowhere to go
  const empty = fork(); const e = leave(empty, 0, 'cold');
  sure(e); due(empty, e);
  empty.s.rivals = empty.s.rivals.filter(r => r.projectHouse);   // forced: no house signs people
  answerAll(KP, empty.s);
  const w2 = tick(KP, empty.s);
  t.eq(mine(w2, 'acrossSigned').length + '|' + mine(w2, 'alumAfter', e.id).length + '|' + !!e.flags.after, '0|1|true', 'with no house on the street to sign her, the chapter is a life outside');
}

// ---- the debut: a rival act of one ----
const debuted = (() => {
  const f = fork(signed); const p = f.s.people[signed.pid];
  runTo(f, p.flags.across.debutAt - 1);
  f.before = { status: p.status, acts: houses(f.s).reduce((n, r) => n + (r.acts || []).length, 0) };
  answerAll(KP, f.s);
  f.wire = tick(KP, f.s);
  f.pid = p.id;
  return f;
})();
{
  const f = fork(debuted); const p = f.s.people[debuted.pid];
  const n = firstOf(mine(debuted.wire, 'acrossDebut', p.id));
  const r = f.s.rivals.find(x => x.short === p.company) || { acts: [], short: '?' };
  const act = (r.acts || []).find(a => (a.members || []).includes(p.id)) || { members: [], releases: [], name: '' };
  t.eq(debuted.before.status, 'departed', 'fixture: up to the week before, she was still departed');
  t.eq(mine(debuted.wire, 'acrossDebut').length + '|' + n.priority + '|' + n.shape, '1|critical|cold', 'on its date her record is one letter, said once and so critical');
  t.ok(lands(n), 'and a loud week does not cut it');
  t.eq(p.status + '|' + p.company, 'rival|' + p.flags.across.company, 'she belongs to that house now');
  t.eq(p.signedWeek, p.flags.across.week, 'signed there the week of the announcement');
  t.eq(JSON.stringify(act.members) + '|' + act.name + '|' + act.solo + '|' + act.alumOf, JSON.stringify([p.id]) + '|' + KP.displayName(p) + '|true|' + CO, 'as a solo act under her own name, marked as an artist who was ours');
  t.eq(houses(f.s).reduce((k, x) => k + (x.acts || []).length, 0), debuted.before.acts + 1, 'one act is added to the street');
  // the lineup rule the soak reads every week (v0.11.14): the harness kept its
  // own "at least four" from before there were soloists, and failed the first
  // census career an alumna debuted solo in. The rule is the engine's now.
  t.ok(KP.actLineupOk(act), 'a soloist’s act of one is a real lineup');
  t.ok(!KP.actLineupOk(Object.assign({}, act, { members: [] })) && !KP.actLineupOk(Object.assign({}, act, { members: [p.id, 'x'] })), 'and only of one: an empty solo act is not a lineup, and neither is a solo act of two');
  const grp = houses(f.s).map(x => (x.acts || []).find(q => !q.solo && !q.retired)).find(Boolean) || { members: [] };
  t.ok(grp.members.length >= KP.C.INDUSTRY.actSize[0] && KP.actLineupOk(grp), 'a group on the same street still fields at least ' + KP.C.INDUSTRY.actSize[0]);
  t.ok(!KP.actLineupOk(Object.assign({}, grp, { members: grp.members.slice(0, KP.C.INDUSTRY.actSize[0] - 1) })) && !KP.actLineupOk(Object.assign({}, grp, { members: grp.members.slice(0, 1) })), 'a group one short is not a lineup, and a group of one is not a soloist');
  t.ok(!KP.actLineupOk(null) && !KP.actLineupOk({ solo: true }) && !KP.actLineupOk({}), 'no act, and an act with no list, are no lineup');
  t.eq(houses(f.s).reduce((k, x) => k + (x.acts || []).filter(q => !q.retired && !KP.actLineupOk(q)).length, 0), 0, 'every act still running on the street is a real lineup the week she debuts');
  t.eq(act.gen, f.g.gen, 'the act carries the generation of the group she came from: she is not a rookie of this one');
  t.eq(act.releases.length + '|' + (act.releases[0] || {}).isDebut + '|' + (act.releases[0] || {}).title, '1|true|' + p.flags.across.title, 'with one record out, and its title on her file');
  t.eq(p.flags.across.debutWeek + '|' + p.flags.across.actId, f.s.week + '|' + act.id, 'her file carries the week and the act');
  t.ok(!KP.rivalFloor(f.s, r).some(x => x.id === p.id), 'she is in an act, not on the floor');
  t.ok(!f.s.roster.includes(p.id) && KP.groups(f.s).every(g => !g.members.includes(p.id)), 'and nowhere in this building');
  t.eq(p.chapters.slice(-3).map(ch => KP.chapterLine(f.s, ch)).join(' / '), 'Contract expired at ' + CO + ' (' + f.g.name + ') / Signed to ' + r.short + ' as a soloist / Debuted solo at ' + r.short, 'her file reads in order: left, signed, debuted');
  t.eq(KP.whereNow(f.s, p), 'soloist at ' + r.short + ' since ' + when(f.s.week), 'where she is now');
  t.ok(n.text.startsWith(KP.displayName(p) + ' debuted solo under ' + r.short + ' this week with “' + p.flags.across.title + '”.') && !noisy(n.text), 'the letter names the house and the record');
  t.ok(n.text.includes('From here she is on the same chart as ' + f.g.name), 'and what it means for the act she left');
  t.ok(n.text.includes('Nobody at ' + CO + ' posted anything.'), 'a cold exit: nobody here posts');
  t.ok(((f.s.chart || {}).entries || []).some(e => e.act === act.name && e.company === r.short && !e.isPlayer), 'her record is on the chart this company releases against');
  t.eq(f.s.acrossLedger.debuted + '|' + f.s.acrossLedger.signed, '1|1', 'the ledger counts the debut');
  t.ok(KP.isAlum(f.s, p) && KP.alumniOf(f.s).some(x => x.id === p.id), 'she is still an alumna of this company');
  t.eq(KP.validateState(f.s).length, 0, 'the file is valid');
  // the machinery that carries any rival act carries her
  const wire = runTo(f, f.s.week + 30);
  t.ok(act.releases.length >= 2 && KP.validateState(f.s).length === 0, 'thirty weeks on she has released again, on that house’s clock (' + act.releases.length + ' records), and the file is valid');
  t.eq(mine(wire, 'acrossDebut').length + mine(wire, 'acrossSigned').length, 0, 'and she debuts once');
  // when the act is over she goes home with a chapter, and stays on the list.
  // Her ledger here is empty: the world's exit forgets a stranger with no
  // file, and it deleted her.
  t.eq((p.directed || []).length, 0, 'fixture: nothing was ever written on her ledger here');
  t.ok(KP.hasChapter(f.s, p), 'an artist who completed a contract here has a chapter with this company, ledger or no ledger');
  KP.retireAct(f.s, r, act, 'the solo years ended');
  t.ok(f.s.people[p.id] === p, 'when her act there ends her file is still in the world (it was deleted)');
  t.eq(p.status, 'gone', 'she goes home');
  t.ok(KP.isAlum(f.s, p) && KP.alumniOf(f.s).some(x => x.id === p.id), 'and is an alumna still');
  // re-pinned v0.11.15: where she is now is read off her file, not off the
  // wording of her last chapter. In the game that chapter led with the act's
  // name, the act's name is hers, and the read lowercased it ("jung Da-min
  // disbanded"). Her last chapter still carries the words it was given.
  t.ok(/the solo years ended/i.test(KP.chapterLine(f.s, p.chapters[p.chapters.length - 1])), 'with the last line of her file as it was written');
  t.eq(KP.whereNow(f.s, p), 'home, after a solo run at ' + r.short, 'and where she is now read off her file');
  t.eq(KP.validateState(f.s).length, 0, 'the file is valid');
}

// ---- the debut as a verb: no draw, the same record, the friend, a house that is gone ----
{
  const ready = (shape, mut) => {
    const f = fork();
    const p = leave(f, 0, shape);
    f.s.week += 10;
    KP.acrossSign(f.s, p, houses(f.s)[0], []);
    f.s.week = p.flags.across.debutAt;   // forced: the record's week
    if (mut) mut(f, p);
    return { f, p };
  };
  const go = x => { const inbox = []; const rng = JSON.stringify(x.f.s.rngState); KP.acrossDebut(x.f.s, x.p, inbox); return { inbox, n: firstOf(inbox.filter(n => n.ind === 'acrossDebut')), still: JSON.stringify(x.f.s.rngState) === rng }; };
  const a = ready('plain'), b = ready('plain');
  const ra = go(a), rb = go(b);
  t.ok(ra.still, 'the debut draws nothing from the main stream: her record is made on an rng of its own');
  t.eq(a.p.flags.across.title + '|' + ra.n.text, b.p.flags.across.title + '|' + rb.n.text, 'and the same file makes the same record, word for word');
  t.ok(ra.n.text.includes(CO + '’s official account posted a one-line congratulation, and meant it.'), 'a warm exit with no close friend left here: the company posts');
  // a close friend still in the building
  const fr = ready('bow', (f, p) => {
    const m = f.s.people[f.ids[1]];
    f.s.relationships[KP.pairKey(p, m)] = { score: 40, state: 'close', coldStreak: 0 };   // forced: close
    f.m0 = m.morale; f.mid = m.id;
  });
  const rf = go(fr);
  const friend = fr.f.s.people[fr.f.mid];
  t.eq(friend.morale, Math.min(100, fr.f.m0 + A.friendMorale), 'a close friend still here: her morale rises on the debut day');
  t.ok(rf.n.text.includes(KP.displayName(friend) + ' posted the album cover an hour after midnight.') && !noisy(rf.n.text), 'and the letter names her');
  t.eq(fr.f.s.acrossLedger.friends, 1, 'the ledger counts it');
  const cf = ready('cold', (f, p) => { const m = f.s.people[f.ids[1]]; f.s.relationships[KP.pairKey(p, m)] = { score: 40, state: 'close', coldStreak: 0 }; f.m0 = m.morale; f.mid = m.id; });
  const rc = go(cf);
  t.ok(cf.f.s.people[cf.f.mid].morale === cf.f.m0 && rc.n.text.includes('Nobody at ' + CO + ' posted anything.'), 'after a cold exit nobody posts, friend or not');
  // the act she left is gone: the letter does not name it as a rival
  const og = ready('plain', (f) => { f.g.retiredWeek = f.s.week; });
  t.ok(go(og).n.text.includes('From here she is one more act on the chart this company releases against.'), 'an act that has concluded is not named as her rival');
  // the house that signed her is gone by the record's week
  const mv = ready('plain', (f, p) => { f.was = p.flags.across.company; f.s.rivals = f.s.rivals.filter(r => r.short !== p.flags.across.company); });
  const rm = go(mv);
  t.ok(mv.p.status === 'rival' && mv.p.company !== mv.f.was && mv.p.flags.across.company === mv.p.company, 'a house that folded before her record: the contract moves to another');
  t.ok(rm.n.text.includes('(the house that first signed her is gone; the contract moved)'), 'and the letter says so');
  // and with no house left at all, the deal falls through
  const fell = ready('plain', (f) => { f.s.rivals = f.s.rivals.filter(r => r.projectHouse); });
  const rl = go(fell);
  t.eq(fell.p.status + '|' + !!fell.p.flags.after + '|' + String(fell.p.flags.across) + '|' + fell.f.s.acrossLedger.fell, 'departed|true|undefined|1', 'with no house left the deal falls through, and her chapter is a life outside');
  t.ok(firstOf(rl.inbox.filter(n => n.ind === 'alumAfter')).text.includes('after the solo deal she had signed went down with the house that offered it'), 'the letter says what happened');
  t.eq([a, fr, cf, og, mv, fell].map(x => KP.validateState(x.f.s).length).join(','), '0,0,0,0,0,0', 'every one of these files is valid');
}

// ---- a veteran is nobody's rookie ----
{
  const f = fork();
  const p = leave(f, 0, 'plain');
  Object.keys(p.talents).forEach(k => { p.talents[k].cur = 99; });   // forced: a record this good would crown any rookie
  sure(p);                                                           // forced: and a name that lifts it further
  KP.acrossSign(f.s, p, houses(f.s)[0], []);
  f.s.week = p.flags.across.debutAt;
  KP.acrossDebut(f.s, p, []);
  const r = f.s.rivals.find(x => x.short === p.company) || { acts: [] };
  const act = r.acts.find(a => a.members.includes(p.id)) || { id: 'none', name: '', releases: [{}] };
  t.ok((act.releases[0].reception || 0) >= 75, 'fixture: her first record there lands at monster-rookie numbers (' + act.releases[0].reception + ')');
  t.ok(KP.getNarrative(f.s, 'rivalMonsterRookies', 'rivalAct', act.id) == null, 'a seven-year artist’s first solo record is not written up as a monster rookie');
  act.releases[0].reception = 100; act.popularity = 100;   // forced: the top of any field she stands in
  const field = KP.awardField(f.s, 'rookie');
  t.ok(!field.some(x => x.name === act.name), 'and she does not stand in the rookie field');
  delete act.alumOf;   // the same act, read as a stranger: the check above has teeth
  t.eq(KP.awardField(f.s, 'rookie')[0].name, act.name, 'the same act with no history here would top that field');
}

// ---- every artist who was ours stays on the list ----
{
  const f = fork();
  const a = leave(f, 0, 'cold'), b = leave(f, 1, 'plain');
  f.s.week += 3;
  const c = leave(f, 2, 'released');
  KP.acrossSign(f.s, a, houses(f.s)[0], []);
  f.s.week = a.flags.across.debutAt; KP.acrossDebut(f.s, a, []);
  KP.acrossAfter(f.s, b, [], false);
  t.eq(KP.alumniOf(f.s).map(p => p.id).join(','), [c.id, a.id, b.id].sort((x, y) => (f.s.people[y].flags.departedWeek - f.s.people[x].flags.departedWeek) || (x < y ? -1 : 1)).join(','), 'the list: most recent first, then by file');
  t.eq(KP.alumniOf(f.s).map(p => p.status).sort().join(','), 'departed,departed,rival', 'whatever her status is now');
  t.ok(!KP.alumniOf(f.s).some(p => p.id === f.ids[3]), 'a member who is still here is not on it');
  const native = Object.values(f.s.people).find(p => p.status === 'rival' && p.id !== a.id);
  t.ok(!!native && !KP.isAlum(f.s, native), 'nor is an artist who was never ours');
}

// ---- the timeline hears it ----
{
  const f = fork(); const p = leave(f, 0, 'cold');
  const cold = KP.feedReactionFor('acrossSigned')(f.s, { personId: p.id, shape: 'cold' });
  const warm = KP.feedReactionFor('acrossSigned')(f.s, { personId: p.id, shape: 'bow' });
  const deb = KP.feedReactionFor('acrossDebut')(f.s, { personId: p.id, shape: 'cold' });
  t.ok([cold, warm, deb].every(e => e && e.persona && e.text.includes(KP.publicGiven(p)) || (e && /former group member/.test(e.text))) && [cold, warm, deb].every(e => !noisy(e.text)), 'the timeline hears the signing and the debut');
  t.ok(cold.text !== warm.text && /old company|good enough/.test(cold.text) && /thanked the old one|being nice/.test(warm.text), 'and a cold exit is talked about differently from a warm one');
}

// ---- old saves: a file from before a departed artist had a clock ----
// what 0.11.11 wrote: no across ledger, no shape on the exit, no date. The
// version is set by hand: the build's own number moves at the ship.
{
  const oldFile = (src, mut) => {
    const o = JSON.parse(KP.serialize(src));
    o.version = '0.11.11';
    delete o.acrossLedger;
    Object.values(o.people).forEach(p => { if (p.flags) { delete p.flags.departShape; delete p.flags.nextAt; } });
    if (mut) mut(o);
    return JSON.stringify(o);
  };
  const f = fork();
  const longAgo = leave(f, 0, 'cold'), recent = leave(f, 1, 'plain');
  const NOW = f.s.week;
  const s = KP.deserialize(oldFile(f.s, o => { o.people[longAgo.id].flags.departedWeek = NOW - 200; }));   // forced: she left four years ago
  const p1 = s.people[longAgo.id], p2 = s.people[recent.id];
  t.eq(s.version, KP.C.VERSION, 'an old file is stamped to this build on load');
  t.ok(!!s.acrossLedger && Object.values(s.acrossLedger).reduce((a, b) => a + b, 0) === 0, 'the across ledger arrives, all zeros');
  t.ok(p1.flags.nextAt >= NOW + 2 && p1.flags.nextAt <= NOW + 31, 'an artist whose chapter is long overdue is given a date in the months ahead, not this week (' + (p1.flags.nextAt - NOW) + ' weeks out)');
  t.ok(p2.flags.nextAt === undefined, 'one whose date is still to come keeps it: the clock stamps it as it would have');
  t.eq(KP.exitShape(s, p1) + '|' + KP.exitShape(s, p2), 'cold|plain', 'how each left is read back off her file');
  t.eq(KP.validateState(s).length, 0, 'the upgraded file is valid');
  const twice = KP.deserialize(KP.serialize(s));
  const at = twice.people[longAgo.id].flags.nextAt;
  KP.migrate(twice);
  t.eq(twice.people[longAgo.id].flags.nextAt, at, 'the chain run over it again changes nothing');
  // many who left long ago: their chapters are spread, not written in one week
  const many = fork();
  const leavers = [leave(many, 0, 'cold'), leave(many, 1, 'plain'), leave(many, 2, 'released')];
  const s3 = KP.deserialize(oldFile(many.s, o => { leavers.forEach((q, i) => { o.people[q.id].flags.departedWeek = many.s.week - 150 - i; }); }));
  const dates = leavers.map(q => s3.people[q.id].flags.nextAt);
  t.ok(dates.every(w => w >= many.s.week + 2 && w <= many.s.week + 31) && new Set(dates).size >= 2, 'three overdue chapters fall on more than one week (' + dates.map(w => w - many.s.week).join(', ') + ' weeks out)');
  const wire = (() => { const out = []; while (s3.week < many.s.week + 33) { answerAll(KP, s3); tick(KP, s3).forEach(n => out.push(n)); } return out; })();
  t.eq(mine(wire, 'acrossSigned').length + mine(wire, 'alumAfter').length, 3, 'and each is written, on its date');
  t.eq(KP.validateState(s3).length, 0, 'the file is valid after them');
}

// ---- the screens: the Talent tab, her file, the act's page, the Industry tab ----
{
  const dom = require('./dom_stub');
  const Dm = dom.load();
  const K = Dm.KP, App = Dm.App, el = Dm.el;
  const load = x => { const s = K.deserialize(KP.serialize(x.s)); return { s, g: s.groups.find(y => y.id === x.gid) }; };
  const page = (s, tab, sub) => { App.state = s; App.mode = 'game'; App.tab = tab; App.view = null; if (sub) App.deskSub = sub; App.render(); return el('screen').innerHTML; };
  const text = h => dom.stripTags(h).replace(/\s+/g, ' ');
  const clean = h => !/undefined|NaN|\{she\}|\{her\}|\{pos\}|\{Pos\}/.test(h);
  const opens = (h, id) => dom.actionsIn(h).filter(a => a.action === 'open-dossier' && a.dataset.id === id).length;

  // three alumnae: one with no chapter yet, one signed and waiting, one outside the industry
  const f = fork();
  const a = leave(f, 0, 'cold'), b = leave(f, 1, 'plain'), c = leave(f, 2, 'released');
  const LEFT = f.s.week;
  KP.acrossSign(f.s, a, houses(f.s)[0], []);
  KP.acrossAfter(f.s, b, [], false);
  const X = load(f);
  let h = page(X.s, 'talent', 'roster');
  const T = text(h);
  t.ok(clean(h) && T.includes('Alumni · 3'), 'the Talent tab lists all three');
  t.ok(T.includes(K.displayName(X.s.people[a.id]) + ' Signed with ' + a.flags.across.company + ' as a soloist · left ' + K.weekLabel(LEFT).text), 'one signed across the street: where, and when she left');
  t.ok(T.includes(K.displayName(X.s.people[b.id]) + ' ' + b.flags.after.what.replace(/^./, ch => ch.toUpperCase()) + ' · left ' + K.weekLabel(LEFT).text), 'one outside the industry: what she does now');
  t.ok(T.includes(K.displayName(X.s.people[c.id]) + ' Released at her own request from ' + CO + ' (' + f.g.name + ') · ' + K.weekLabel(LEFT).text), 'one with no chapter yet: how she left, as before');
  t.eq([a, b, c].map(p => opens(h, p.id) >= 1).join(','), 'true,true,true', 'and every row opens her file');
  h = Dm.UI.renderDossier(X.s, a.id);
  t.ok(clean(h) && text(h).includes('Alumni file') && text(h).includes('Departed ' + K.weekLabel(LEFT).text + ' · the file stays open forever · now: signed with ' + a.flags.across.company + ' as a soloist'), 'her file says where she is now');
  h = Dm.UI.renderDossier(X.s, c.id);
  t.ok(text(h).includes('Departed ' + K.weekLabel(LEFT).text + ' · the file stays open forever') && !text(h).includes('now:'), 'a file with no later chapter says nothing more');
  h = Dm.UI.renderGroupPage(X.s, X.g);
  t.ok(clean(h) && text(h).includes('Former members · 3') && text(h).includes(K.displayName(X.s.people[a.id]) + ' · left ' + K.weekLabel(LEFT).text), 'the act’s page still lists them as former members');

  // after her record: a rival act of one
  f.s.week = a.flags.across.debutAt; KP.acrossDebut(f.s, a, []);
  const Y = load(f);
  const pa = Y.s.people[a.id];
  const rv = Y.s.rivals.find(r => r.short === pa.company);
  const act = rv.acts.find(q => q.members.includes(a.id));
  h = page(Y.s, 'talent', 'roster');
  t.ok(clean(h) && text(h).includes('Alumni · 3') && text(h).includes(K.displayName(pa) + ' Soloist at ' + rv.short + ' since ' + K.weekLabel(f.s.week).text + ' · left ' + K.weekLabel(LEFT).text), 'an alumna who has debuted across the street is still on the list, with where she is');
  h = Dm.UI.renderDossier(Y.s, a.id);
  t.ok(clean(h) && text(h).includes('Alumni file') && !text(h).includes('Trainee file') && text(h).includes('now: soloist at ' + rv.short + ' since ' + K.weekLabel(f.s.week).text), 'and her file is still an alumni file, not a stranger’s');
  h = Dm.UI.renderRivalAct(Y.s, act.id);
  t.ok(clean(h) && text(h).includes('was ours') && !text(h).includes('was on your board') && !text(h).includes('moved faster'), 'the Industry tab’s page for her act says she was ours, not a face we lost off the board');
  t.ok(text(h).includes(K.displayName(pa) + ' was ours until ' + K.weekLabel(LEFT).text + '. She records for ' + rv.short + ' now, on the same chart we release against.'), 'with a note from the file room');
  t.eq(opens(h, a.id), 1, 'and her name there opens her file');
  h = page(Y.s, 'industry');
  t.ok(clean(h) && text(h).includes('solo, formerly ours'), 'the house’s card marks the act: solo, formerly ours');
  // a native act's page is as it was
  const nat = rv.acts.find(q => !q.solo && !q.retired) || Y.s.rivals.map(r => r.acts.find(q => !q.solo && !q.retired)).find(Boolean);
  t.ok(!!nat && !text(Dm.UI.renderRivalAct(Y.s, nat.id)).includes('was ours'), 'an act of people who were never ours says nothing of the kind');
}

t.finish();
