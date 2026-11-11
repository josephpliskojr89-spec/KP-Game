/* Suite 153 — the credits that stay (v0.11.47, §140; the owner's ruling,
   §136: 21 and 27). A chair that goes is kept on the roll for good: the
   chair, the house, the weeks, how it went, and the credit as the file read
   it that day (§133), an era still running read again until it has closed.
   When the desk leaves a house or the house folds, everyone still sat goes
   on the roll as the house stands, and every line of that house is shut: it
   is never read again, whatever the next house is called. A record carries the rooms' chairs sat as
   it landed, by name; each of the roster signed on a scout's watch carries
   the scout's name; and a house chair's own list of records is kept whole.
   The words for a credit and a résumé are plainer, and say what they said.
   Nothing here is drawn, and nothing moves in the simulation.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   sentence fails by name; nothing here can crash or hang under a broken
   engine. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const KP = loadEngine();
const t = makeT('suite_153_roll');
const YEAR = KP.C.WEEKS_PER_YEAR;

// ---- the kit ------------------------------------------------------------------
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const js = x => JSON.stringify(x);
const obj = x => (x && typeof x === 'object' ? x : { threw: String(x) });
const act = s => KP.groups(s)[0] || { name: 'no act', id: 'none', releases: [], members: [] };
const desk = (seed, week) => { const s = KP.newGame(seed, null, {}); s.week = week; s.objective.status = 'met'; return s; };
const founder = (seed, week) => { const s = desk(seed, week); s.trust = 80; s.awardHistory = [{ year: 2, category: 'daesang', name: act(s).name, company: s.company.short, isPlayer: true }]; return s; };
const sit = (s, seatId, since, more) => { const S = obj(say(() => KP.staffSeats(s)));
  S[seatId] = Object.assign({ id: 'sf' + since + '_' + seatId.length + '53', name: 'Chair of ' + seatId, seatId, tier: 'working', knownForTag: null, since, style: 'scrappy', warmth: 60, candor: 60,
    resume: ['9 years in the industry, most recently at a mid-tier label'], truth: { base: 0.5, gem: false, bestSeat: 'vocal' } }, more || {});
  return S[seatId]; };
const rec = (week, closed, more) => Object.assign({ week, songTitle: 'T' + week, receptionBand: 'solid', trophies: 0, chartPeak: 9, chartWeeks: 3, conceptId: 'cute' },
  closed ? { closed: { week: week + 5, verdict: closed, trophies: closed === 'crowned' ? 1 : 0, lastStage: 'clean', room: 'fresh' } } : {}, more || {});
const records = (s, list, promoUntil) => { const g = act(s); g.debuted = true; g.releases = list; g.promoUntil = promoUntil || 0; delete g.retiredWeek; return g; };
const signed = (s, weeks) => { s.roster.forEach(id => { delete s.people[id].signedWeek; delete s.people[id].signedUnder; s.people[id].status = 'trainee'; }); weeks.forEach((w, i) => { if (s.roster[i]) s.people[s.roster[i]].signedWeek = w; }); };
// the scout's watch, forced: one of the act (debuted) and one more of the roster signed in week w; nobody else has a date
const watch = (s, w) => { const m = act(s).members[0], other = s.roster.filter(id => id !== m)[0];
  s.roster.forEach(id => { delete s.people[id].signedWeek; delete s.people[id].signedUnder; });
  [m, other].forEach(id => { if (s.people[id]) s.people[id].signedWeek = w; });
  if (s.people[m]) s.people[m].status = 'idol';
  if (s.people[other]) s.people[other].status = 'trainee';
  return { ids: [m, other], of: s.roster.length }; };
const roll = s => (Array.isArray(s.staffRoll) ? s.staffRoll : []);
const line = (s, i) => roll(s)[i == null ? roll(s).length - 1 : i] || { name: 'no line on the roll', credit: {}, how: 'none' };
const tally = c => (c ? [c.kind, c.n, c.crowned, c.warm, c.quiet, c.cold, c.running].join('/') : 'no credit');
const facts = e => [e.id, e.name, e.seatId, e.house, e.since, e.until, e.how, e.to || '-', e.by || '-'].join(' · ');
const call = (seatId, more) => Object.assign({ id: 'sc-call', kind: 'seatPoach', seatId, rivalName: 'Rival House', expiresWeek: 999 }, more || {});
const said = (s, e) => obj(say(() => KP.rollSaid(s, e)));
const phase = name => KP.weeklyPipeline([]).filter(p => p.name === name)[0] || { fn: () => { throw new Error('no phase ' + name); } };
// a stream that grants nothing: the rail's own chances all fall, and what the roll does is not drawn
const still = new Proxy({}, { get: (o, k) => (k === 'chance' ? () => false : k === 'int' ? a => a : k === 'pick' ? l => l[0] : () => 0.99) });
const rail = s => say(() => { phase('hires').fn(s, still, [], [], KP.groups(s)); return 'ok'; });
const load = (s, version) => { const raw = JSON.parse(KP.serialize(s)); (raw.state || raw).version = version; return obj(say(() => KP.deserialize(JSON.stringify(raw)))); };
// a house with a vocal coach of a hundred weeks, a word on file, and three records: one still in promotion
const WORD = { week: 193, text: 'The vocal room did its part.', second: '', dry: 0 };
const mk = seed => { const s = desk(seed, 200); s.budget = 500; sit(s, 'vocal', 100, { name: 'Coach Shin', word: Object.assign({}, WORD) });
  records(s, [rec(90, 'crowned'), rec(110, 'crowned'), rec(120, 'warm'), rec(195, null)], 205); return s; };
const CAND = { id: 'sf200_9', name: 'Im Ha-eun', seatId: 'vocal', tier: 'unknown', knownForTag: null, resume: ['x'], style: 'scrappy', warmth: 50, candor: 50, truth: { base: 0.5, gem: false, bestSeat: 'vocal' } };

// ---- A. a chair that goes is on the roll ------------------------------------------------------
{
  ['staffRoll', 'seatGoes', 'rollSettle', 'rollHouseCloses', 'rollSaid', 'roomNames', 'roomSaid', 'signedStamp', 'resumePlain', 'knownForSaid', 'worksRecent'].forEach(k => t.ok(typeof KP[k] === 'function', 'the engine carries KP.' + k));
  t.eq(js(say(() => KP.rollHows())), js(['released', 'replaced', 'walked', 'lapsed', 'stayed', 'folded']), 'the six ways a chair leaves the building');
  const fresh = KP.newGame('rl-fresh', null, {});
  t.eq(js(fresh.staffRoll) + ' · ' + js(say(() => KP.staffRoll(fresh))), 'undefined · []', 'a new career’s roll is empty, and is made the first time it is asked for');
  // let go
  const a = mk('rl-letgo');
  const before = tally(obj(say(() => KP.seatCredit(a, a.seats.vocal))));
  const ra = obj(say(() => KP.releaseSeat(a, 'vocal')));
  t.eq(ra.ok + ' · ' + roll(a).length + ' · ' + facts(line(a)), 'true · 1 · sf100_553 · Coach Shin · vocal · HCG · 100 · 200 · released · - · -', 'a chair let go: one line, its name, its chair, the house, the weeks it sat, and how it went');
  t.eq(tally(line(a).credit) + ' · ' + before, 'eras/3/1/1/0/0/1 · eras/3/1/1/0/0/1', 'the credit is the credit as the file read it that day: what landed after they sat, and not before');
  t.eq(js(line(a).word), js({ week: 193, text: 'The vocal room did its part.' }), 'and their last word on a year goes with the line');
  // replaced at an interview
  const b = mk('rl-replaced');
  say(() => KP.sceneDef('theInterview').resolve(b, { id: 'sc-int', kind: 'theInterview', cand: CAND }, 'hire'));
  t.eq(roll(b).length + ' · ' + facts(line(b)) + ' · ' + (b.seats.vocal || {}).name, '1 · sf100_553 · Coach Shin · vocal · HCG · 100 · 200 · replaced · - · Im Ha-eun · Im Ha-eun', 'a chair replaced at an interview: the line says who took it');
  const b0 = mk('rl-open'); delete b0.seats.vocal;
  say(() => KP.sceneDef('theInterview').resolve(b0, { id: 'sc-int', kind: 'theInterview', cand: CAND }, 'hire'));
  t.eq(roll(b0).length, 0, 'a hire into an open chair puts nobody on the roll');
  // took the call
  const c = mk('rl-walked');
  say(() => KP.sceneDef('seatPoach').resolve(c, call('vocal'), 'walk'));
  t.eq(roll(c).length + ' · ' + facts(line(c)), '1 · sf100_553 · Coach Shin · vocal · HCG · 100 · 200 · walked · Rival House · -', 'a chair that takes a call: the line says where they went');
  const k = mk('rl-kept');
  say(() => KP.sceneDef('seatPoach').resolve(k, call('vocal'), 'raise'));
  t.eq(roll(k).length + ' · ' + !!k.seats.vocal, '0 · true', 'a chair kept with a raise is not on the roll');
  // the call left unanswered
  const d = mk('rl-lapsed');
  say(() => KP.sceneDef('seatPoach').expire(d, call('vocal')));
  t.eq(roll(d).length + ' · ' + facts(line(d)) + ' · ' + !!d.seats.vocal, '1 · sf100_553 · Coach Shin · vocal · HCG · 100 · 200 · lapsed · Rival House · - · false', 'a call left unanswered: the chair goes, and the line says so');
  // a line holds nothing but its own facts
  t.eq(Object.keys(line(a)).sort().join(), 'credit,house,how,id,name,seatId,since,until,word', 'a line holds its facts and nothing of the fog: no truth, no price, no read of the person');
  const nw = mk('rl-noword'); delete nw.seats.vocal.word;
  say(() => KP.releaseSeat(nw, 'vocal'));
  t.ok(!('word' in line(nw)), 'a chair that had said nothing of a year has no word on its line');
}

// ---- B. the other chairs’ credits ---------------------------------------------------------------
{
  const s = desk('rl-kinds', 200); s.budget = 900;
  sit(s, 'scout', 100, { name: 'Scout Im' });
  signed(s, [90, 100, 150, 200, 201]);
  s.people[s.roster[2]].status = 'idol';
  const rs = obj(say(() => KP.releaseSeat(s, 'scout')));
  t.eq(rs.ok + ' · ' + js(line(s).credit), 'true · ' + js({ kind: 'floor', n: 3, of: s.roster.length, debuted: 1 }), 'a scout’s line: who of the roster signed after they sat, of how many, and who of those has debuted');
  t.eq(s.roster.slice(0, 5).map(id => s.people[id].signedUnder || '-').join(), '-,-,Scout Im,Scout Im,Scout Im', 'and each of them carries the scout’s name from that day, the ones signed that very week too');
  sit(s, 'producer', 100, { name: 'Baek Chul-soo', works: [{ week: 90, title: 'A', groupId: 'g1' }, { week: 100, title: 'B', groupId: 'g1' }, { week: 150, title: 'C', groupId: 'g1' }, { week: 180, title: 'D', groupId: 'g1' }] });
  say(() => KP.releaseSeat(s, 'producer'));
  t.eq(js(line(s).credit), js({ kind: 'records', n: 2 }), 'a studio chair’s line: the records it made here, not the ones it came with');
  sit(s, 'anr', 100);
  records(s, []);
  say(() => KP.releaseSeat(s, 'anr'));
  t.eq(tally(line(s).credit) + ' · ' + roll(s).length, 'eras/0/0/0/0/0/0 · 3', 'a chair with nothing to its name is on the roll all the same');
}

// ---- C. an era running the day they went ----------------------------------------------------------
{
  const s = mk('rl-settle');
  say(() => KP.releaseSeat(s, 'vocal'));
  const g = act(s);
  t.eq(tally(line(s).credit), 'eras/3/1/1/0/0/1', 'the fixture: one era was running the day the chair went');
  s.week = 204;
  say(() => KP.rollSettle(s));
  t.eq(tally(line(s).credit), 'eras/3/1/1/0/0/1', 'four weeks on, the era they left running is still running, and the line says so');
  g.releases[3].closed = { week: 206, verdict: 'crowned', trophies: 1, lastStage: 'clean', room: 'fresh' };
  s.week = 207;
  say(() => KP.rollSettle(s));
  t.eq(tally(line(s).credit), 'eras/3/2/1/0/0/0', 'when it closes, the line says how: a trophy won after they went, on a record they worked on, is on their line');
  g.releases[3].closed.verdict = 'cold';
  say(() => KP.rollSettle(s));
  t.eq(tally(line(s).credit), 'eras/3/2/1/0/0/0', 'a line with nothing running is settled, and is not read again');
  // through the rail, on a stream that grants nothing
  const r = mk('rl-rail');
  say(() => KP.releaseSeat(r, 'vocal'));
  act(r).releases[3].closed = { week: 206, verdict: 'warm', trophies: 0, lastStage: 'clean', room: 'fresh' };
  r.week = 207;
  t.eq(rail(r) + ' · ' + tally(line(r).credit), 'ok · eras/3/1/2/0/0/0', 'the week reads a running era again, and draws nothing to do it');
  // a record that lands after they went is not theirs: a second act puts one out while the line is read again
  const w = mk('rl-after');
  say(() => KP.releaseSeat(w, 'vocal'));
  const second = JSON.parse(JSON.stringify(act(w)));
  second.id = act(w).id + '-b'; second.name = 'Second Act'; second.releases = [rec(203, 'crowned')]; second.promoUntil = 0;
  w.groups.push(second);
  act(w).releases[3].closed = { week: 206, verdict: 'warm', trophies: 0, lastStage: 'clean', room: 'fresh' };
  w.week = 207;
  say(() => KP.rollSettle(w));
  t.eq(KP.groups(w).length + ' · ' + tally(line(w).credit), '2 · eras/3/1/2/0/0/0', 'the line is read again when the era closes, and a trophy record another act put out after they went is not on it');
  // an era that never came to its close: the act ended the week after its record landed
  const n = mk('rl-neverclosed');
  act(n).retiredWeek = 196;
  say(() => KP.releaseSeat(n, 'vocal'));
  t.eq(tally(line(n).credit), 'eras/3/1/1/1/0/0', 'an era whose act ended before its close is not running: it reads by its trophies and its reception, as its close would have');
  // a line that is shut is never read again
  const o = mk('rl-shut');
  say(() => KP.releaseSeat(o, 'vocal'));
  line(o).shut = 'stayed';
  act(o).releases[3].closed = { week: 206, verdict: 'crowned', trophies: 1, lastStage: 'clean', room: 'fresh' };
  o.week = 207;
  say(() => KP.rollSettle(o));
  t.eq(tally(line(o).credit), 'eras/3/1/1/0/0/1', 'a line of a house the desk has left is shut, and is not read against the records on the file');
}

// ---- D. the desk leaves a house, and a house folds ---------------------------------------------------
{
  const f = founder('rl-found', 3 * YEAR);
  sit(f, 'anr', 20, { name: 'Sa Bo-ra' });
  records(f, [rec(30, 'crowned'), rec(60, 'warm')]);
  say(() => KP.releaseSeat(f, 'dance'));   // one who went before the desk did
  const fw = watch(f, 50), scoutF = f.seats.scout.name;
  const old = f.company.short, sat = Object.keys(f.seats).map(k => f.seats[k].name);
  const fr = obj(say(() => KP.foundLabel(f, 'HOMEWARD')));
  t.ok(fr.ok === true && f.company.short !== old, 'the fixture: the founding goes through (' + js(fr).slice(0, 80) + ')');
  const stayed = roll(f).filter(e => e.how === 'stayed');
  t.eq(stayed.map(e => e.name).join() + ' · ' + stayed.map(e => e.house + '/' + e.until).join(), sat.join() + ' · ' + sat.map(() => old + '/' + 3 * YEAR).join(),
    'the chairs stay with the house (§132), and the roll says so: each one sat that day, under the old house’s name, to the founding week');
  t.eq(tally((stayed.filter(e => e.seatId === 'anr')[0] || {}).credit) + ' · ' + tally((stayed.filter(e => e.seatId === 'vocal')[0] || {}).credit), 'eras/2/1/1/0/0/0 · eras/2/1/1/0/0/0', 'their credits are read while the old house’s records are still on the file');
  t.eq(js((stayed.filter(e => e.seatId === 'scout')[0] || {}).credit), js({ kind: 'floor', n: 2, of: fw.of, debuted: 1 }),
    'the scout’s line is read while the roster is still the roster: who signed on their watch, of how many, and who of those had debuted');
  t.eq(fw.ids.map(id => f.people[id].signedUnder).join() + ' · ' + Object.keys(f.people).filter(id => f.people[id].signedUnder).length, scoutF + ',' + scoutF + ' · 2',
    'those two carry the scout’s name on to the other side of the wall, and nobody the founding gave a date to does');
  t.eq(roll(f).length + ' · ' + roll(f)[0].how + ' · ' + roll(f)[0].house, (sat.length + 1) + ' · released · ' + old, 'the one who went before is still on it, as it was');
  t.eq(roll(f).map(e => e.shut).join(), roll(f).map(() => 'stayed').join(), 'and every line of the old house is shut, the earlier one too, with how the house closed to the desk');
  t.ok(Object.keys(f.seats).every(k => !roll(f).some(e => e.id === f.seats[k].id)), 'and the label’s own four are sat, not on the roll');
  say(() => KP.releaseSeat(f, 'perf'));
  t.eq(line(f).house + ' · ' + line(f).since + ' · ' + line(f).how + ' · ' + js(line(f).shut), f.company.short + ' · ' + 3 * YEAR + ' · released · undefined', 'a chair let go at the label is filed under the label, and its line is open');
  // the label folds in its turn: its own lines are shut as folded, and the old house's keep how that house closed
  const label = f.company.short;
  say(() => KP.dissolveLabel(f, 'read'));
  t.eq([...new Set(roll(f).filter(e => e.house === old).map(e => e.shut))].join() + ' · ' + [...new Set(roll(f).filter(e => e.house === label).map(e => e.shut))].join() + ' · ' + roll(f).filter(e => e.house === label).length,
    'stayed · folded · 4', 'a second house closes: the first house’s lines still say the desk left it, and the label’s four (one let go, three there to the end) say it folded');
  // an era that closed after a chair went is read once more as the house closes, before its records are left behind
  const q = mk('rl-lastread');
  say(() => KP.releaseSeat(q, 'vocal'));
  act(q).releases[3].closed = { week: 206, verdict: 'warm', trophies: 0, lastStage: 'clean', room: 'fresh' };
  q.week = 207;
  say(() => KP.dissolveLabel(q, 'read'));
  t.eq(tally(roll(q)[0].credit) + ' · ' + roll(q)[0].shut, 'eras/3/1/2/0/0/0 · folded', 'a line with an era that has closed since is read one last time as the house folds, and then shut');
  // a house that folds
  const d = desk('rl-fold', 2 * YEAR - 10);
  sit(d, 'anr', 20, { name: 'Sa Bo-ra' });
  sit(d, 'marketing', 20, { name: 'Joo Bo-ra' });
  records(d, [rec(30, 'cold'), rec(2 * YEAR - 12, null)], 2 * YEAR);
  d.budget = 900;
  say(() => KP.releaseSeat(d, 'marketing'));   // one let go while an era was running, before the house folded
  const names = Object.keys(d.seats).map(k => d.seats[k].name), co = d.company.short;
  const dw = watch(d, 30);
  const gone = JSON.parse(JSON.stringify(act(d)));
  say(() => KP.dissolveLabel(d, 'read'));
  const folded = roll(d).filter(e => e.how === 'folded');
  t.eq(folded.map(e => e.name).join() + ' · ' + js(d.seats), names.join() + ' · undefined', 'a house that folds: everyone still sat is on the roll, and the building is empty');
  t.eq(folded.map(e => e.house).join() + ' · ' + tally((folded.filter(e => e.seatId === 'anr')[0] || {}).credit), names.map(() => co).join() + ' · eras/2/0/0/0/1/1', 'under the folded house’s name, with the credit as it stood');
  t.eq(roll(d).map(e => e.how + '/' + e.shut).join(), ['released/folded'].concat(names.map(() => 'folded/folded')).join(), 'every line of the folded house is shut, the one let go before it folded too');
  t.eq(js((folded.filter(e => e.seatId === 'scout')[0] || {}).credit), js({ kind: 'floor', n: 2, of: dw.of, debuted: 1 }), 'and the scout’s line is read before the roster is let go: it counts the one who had debuted');
  const houses = KP.signingHouses(d).map(r => r.short);
  t.ok(folded.length > 0 && folded.every(e => houses.includes(e.to)), 'and each line says which house took them (' + folded.map(e => e.to).join() + ')');
  say(() => KP.nextChapter(d, 'blank', { companyName: 'Second Paper' }));
  t.eq(roll(d).length + ' · ' + roll(d).filter(e => e.house === co).length, (names.length + 1) + ' · ' + (names.length + 1), 'the next building opens, and the roll of the last one comes with the desk');
  // whatever the next house is called: under the folded house’s own short, with a record out, the weeks run
  const before = js(roll(d));
  d.company.short = co;
  gone.releases = [rec(d.week + 1, 'crowned')];
  d.groups.push(gone);
  d.week += 3;
  t.eq(rail(d) + ' · ' + (js(roll(d)) === before) + ' · ' + tally(roll(d)[0].credit), 'ok · true · eras/2/0/0/0/1/1',
    'a house of the same name is not the same house: the folded house’s lines are not read against its records, and the era that was running that day stays as it stood');
}

// ---- E. the roll, said ------------------------------------------------------------------------------
{
  const s = mk('rl-said');
  const e = (how, more) => Object.assign({ id: 'x', name: 'Coach Shin', seatId: 'vocal', house: 'HCG', since: 100, until: 200, how, credit: { kind: 'eras', n: 3, crowned: 1, warm: 1, quiet: 0, cold: 0, running: 1 } }, more || {});
  const hows = [e('released'), e('replaced', { by: 'Im Ha-eun' }), e('walked', { to: 'Aurum' }), e('lapsed', { to: 'Aurum' }), e('stayed'), e('folded', { to: 'Novaline' }), e('folded')].map(x => said(s, x).how);
  t.eq(hows.join(' | '), 'let go | replaced by Im Ha-eun | went to Aurum | went to Aurum on an offer left unanswered | stayed with HCG when the desk left | there when HCG folded, and went to Novaline | there when HCG folded',
    'how each one went, in a person’s words');
  const r = said(s, e('released', { word: { week: 193, text: 'The vocal room did its part.' } }));
  t.eq([r.name, r.label, r.from, r.to, r.credit, js(r.word)].join(' · '), 'Coach Shin · head vocal coach · 100 · 200 · Worked on 3 eras here: one closed with a trophy, one warm; one still running. · ' + js({ week: 193, text: 'The vocal room did its part.' }),
    'a line as the Building tab says it: who, which chair, from when to when, the credit, and their last word');
  t.eq(said(s, e('released', { seatId: 'scout', credit: { kind: 'floor', n: 3, of: 12, debuted: 1 } })).credit, 'Ran scouting when 3 of the 12 on the roster signed, one of whom has debuted.', 'a scout’s credit on the roll');
  t.eq(said(s, e('released', { seatId: 'producer', credit: { kind: 'records', n: 2 } })).credit + ' | ' + said(s, e('released', { seatId: 'writer', credit: { kind: 'records', n: 1 } })).credit + ' | ' +
    js(said(s, e('released', { seatId: 'writer', credit: { kind: 'records', n: 0 } })).credit), 'Made 2 records here. | Made one record here. | ""', 'a studio chair’s, and nothing said of one that made nothing');
  t.eq(js(said(s, e('released', { credit: { kind: 'eras', n: 0, crowned: 0, warm: 0, quiet: 0, cold: 0, running: 0 } })).credit), '""', 'nor of a room’s chair that saw no record land');
  // a line of a house the desk has left is said of then and there
  t.eq([said(s, e('released', { shut: 'stayed' })).credit, said(s, e('folded', { shut: 'folded' })).credit, said(s, e('stayed', { shut: 'stayed', credit: { kind: 'eras', n: 1, crowned: 0, warm: 0, quiet: 0, cold: 0, running: 1 } })).credit,
    said(s, e('folded', { shut: 'folded', credit: { kind: 'eras', n: 2, crowned: 0, warm: 0, quiet: 0, cold: 0, running: 2 } })).credit, said(s, e('stayed', { shut: 'stayed', credit: { kind: 'eras', n: 2, crowned: 1, warm: 1, quiet: 0, cold: 0, running: 0 } })).credit].join(' | '),
  'Worked on 3 eras there: one closed with a trophy, one warm; one still running when the desk left. | Worked on 3 eras there: one closed with a trophy, one warm; one still running when HCG folded. | ' +
    'Worked on one era there, still running when the desk left. | Worked on 2 eras there, all still running when HCG folded. | Worked on 2 eras there: one closed with a trophy, one warm.',
  'a shut line says “there”, and an era that was running the day the house closed to the desk is said to have been running that day');
  t.eq(said(s, e('stayed', { shut: 'stayed', seatId: 'scout', credit: { kind: 'floor', n: 3, of: 12, debuted: 2 } })).credit + ' | ' + said(s, e('folded', { shut: 'folded', seatId: 'producer', credit: { kind: 'records', n: 2 } })).credit,
    'Ran scouting when 3 of the 12 on the roster signed, 2 of whom had debuted. | Made 2 records there.', 'and so are a scout’s and a studio chair’s');
}

// ---- F. the Building tab ---------------------------------------------------------------------------
{
  const D = dom.load();
  const { App, el } = D;
  const draw = () => { const r = say(() => App.render()); return typeof r === 'string' ? r : el('screen').innerHTML; };
  const s = mk('rl-ui');
  sit(s, 'anr', 150, { name: 'Sa <i>Bo-ra</i>', knownForTag: 'vocal', resume: ['9 years in the industry, most recently at a mid-tier label', 'worked through a famous era'] });
  App.state = s; App.mode = 'game'; App.tab = 'desk'; App.deskSub = 'building'; App.stack = []; App.view = null; App.rollOpen = false;
  t.ok(!draw().includes('data-action="roll-toggle"'), 'a building nobody has left shows no roll');
  t.ok(draw().includes('<span class="chip">known for vocal coaching</span>') && draw().includes('The résumé: 9 years in the industry, most recently at a mid-tier label; worked through a famous era.'),
    'a card says what the trades know a name for by the work, and the résumé in plain words');
  say(() => KP.releaseSeat(s, 'anr'));
  say(() => KP.releaseSeat(s, 'vocal'));
  t.ok(draw().includes('>Who has sat here · 2 names</button>') && !draw().includes('class="roll-row"'), 'once someone has gone, one line says how many are on the roll, and it is closed');
  say(() => D.click({ action: 'roll-toggle' }));
  const html = draw();
  const rows = html.split('class="roll-row"').slice(1).concat(['', '']);   // a row that is not there reads as nothing
  t.eq(rows.filter(Boolean).length + ' · ' + html.includes('>Close the roll</button>'), '2 · true', 'one tap opens it: a row a name');
  t.ok(rows[0].includes('<span class="roll-name">Coach Shin</span> <span class="roll-seat">head vocal coach</span>') && rows[1].includes('<span class="roll-name">Sa &lt;i&gt;Bo-ra&lt;/i&gt;</span> <span class="roll-seat">A&amp;R lead</span>'),
    'the last to go first, each under their name and their chair');
  t.ok(rows[0].includes(KP.weekLabel(100).text + ' to ' + KP.weekLabel(200).text + ' · let go') && rows[0].includes('<div class="roll-credit">Worked on 3 eras here: one closed with a trophy, one warm; one still running.</div>') &&
    rows[0].includes('<div class="roll-word">Their last word, on Year 4: “The vocal room did its part.”</div>'), 'when they sat, how they went, the credit, and their last word with the year it is of');
  t.ok(!html.includes('class="roll-house"'), 'with one house on the roll, no house is named');
  s.staffRoll = roll(s);
  s.staffRoll.unshift({ id: 'old1', name: 'Coach Mo', seatId: 'dance', house: 'ELDER', since: 10, until: 60, how: 'stayed', shut: 'stayed', credit: { kind: 'eras', n: 1, crowned: 0, warm: 1, quiet: 0, cold: 0, running: 0 } });
  s.staffRoll.unshift({ id: 'old0', name: 'Coach Nam', seatId: 'vocal', house: s.company.short, since: 2, until: 9, how: 'folded', shut: 'folded', credit: { kind: 'eras', n: 1, crowned: 0, warm: 0, quiet: 0, cold: 0, running: 1 } });
  const two = draw();
  t.ok(two.includes('<div class="roll-house">Here</div>') && two.includes('<div class="roll-house">At ELDER</div>') && two.indexOf('>Here<') < two.indexOf('>At ELDER<') && two.includes('stayed with ELDER when the desk left') &&
    two.includes('<div class="roll-credit">Worked on one era there, which closed warm.</div>'), 'with a house before this one on the roll, each is named: here first, then the house before, its credits said of there');
  t.ok(two.includes('<div class="roll-house">At ' + s.company.short + '</div>') && two.indexOf('>At ELDER<') < two.indexOf('>At ' + s.company.short + '<') && two.split('class="roll-house"').length === 4 &&
    two.includes('<div class="roll-credit">Worked on one era there, still running when ' + s.company.short + ' folded.</div>'), 'and an earlier house of this one’s own name is a house before, under its own heading');
  App.rollOpen = false;
  const mixed = draw();
  s.staffRoll = roll(s).filter(e => e.shut);
  const before = draw();
  t.ok(mixed.includes('>Who has sat here and before · 4 names</button>') && before.includes('>Who sat at the houses before · 2 names</button>'), 'the roll’s line says whose names it holds: here, here and before, or the houses before');
}

// ---- F2. the real buttons, the act’s page and a person’s page ----------------------------------------------
{
  const D = dom.load();
  const { App, el } = D;
  const draw = () => { const r = say(() => App.render()); return typeof r === 'string' ? r : el('screen').innerHTML; };
  const u = mk('rl-click');
  App.state = u; App.mode = 'game'; App.tab = 'desk'; App.deskSub = 'building'; App.stack = []; App.view = null; App.rollOpen = false;
  say(() => D.click({ action: 'seat-release', id: 'vocal' }));
  say(() => D.click({ action: 'seat-release-confirm', id: 'vocal' }));
  t.eq(roll(u).length + ' · ' + line(u).how + ' · ' + line(u).name + ' · ' + !!u.seats.vocal, '1 · released · Coach Shin · false', 'the Building tab’s own button lets a chair go, and the roll has it');
  say(() => D.click({ action: 'roll-toggle' }));
  const opened = App.rollOpen === true && draw().includes('class="roll-row"');
  say(() => D.click({ action: 'roll-toggle' }));
  t.eq(opened + ' · ' + App.rollOpen + ' · ' + draw().includes('class="roll-row"'), 'true · false · false', 'the roll’s line opens it and closes it again');
  // a record’s line on the act’s page
  const r = KP.newGame('rl-page', null, {});
  const g = act(r);
  const had = (g.releases || []).length;
  if (had) g.releases[had - 1].room = { vocal: 'Coach Shin', anr: 'Sa <i>Bo-ra</i>' };
  App.state = r; App.tab = 'groups'; App.stack = []; App.view = { type: 'grouppage', id: g.id };
  const page = draw();
  t.ok(had >= 2 && page.includes('<br><span class="rel-room">in the room: Coach Shin (vocal), Sa &lt;i&gt;Bo-ra&lt;/i&gt; (A&amp;R)</span>') && page.split('class="rel-room"').length === 2,
    'the act’s page names who was in the room under the record that carries it, and says nothing under one that carries none (' + had + ' records)');
  // who signed them, on their own page
  const p = r.people[r.roster[0]];
  p.signedWeek = 30; p.signedUnder = 'Scout <b>Im</b>';
  App.tab = 'talent'; App.view = { type: 'dossier', id: p.id };
  const file = draw();
  delete p.signedUnder;
  const bare = draw();
  t.ok(file.includes(' · signed ' + KP.weekLabel(30).text + ' under Scout &lt;b&gt;Im&lt;/b&gt;') && bare.includes(' · signed ' + KP.weekLabel(30).text) && !bare.includes(KP.weekLabel(30).text + ' under '),
    'a person’s page says when they signed and under which scout, and only the date for one who carries no name');
}

// ---- G. who was in the room, on the record --------------------------------------------------------------
{
  const s = desk('rl-room', 200);
  ['vocal', 'dance', 'perf', 'scout'].forEach(k => { s.seats[k].since = 1; });
  sit(s, 'anr', 199, { name: 'Sa Bo-ra' }); sit(s, 'marketing', 200, { name: 'Joo Bo-ra' }); sit(s, 'producer', 100, { name: 'Baek Chul-soo' });
  const room = obj(say(() => KP.roomNames(s)));
  t.eq(js(room), js({ vocal: s.seats.vocal.name, dance: s.seats.dance.name, perf: s.seats.perf.name, anr: 'Sa Bo-ra' }),
    'the room on a record that lands this week: the rooms’ chairs sat before the week began; not one hired this week, not the scout, not the studio');
  t.eq(String(say(() => KP.roomSaid(room))), [s.seats.vocal.name + ' (vocal)', s.seats.dance.name + ' (dance)', s.seats.perf.name + ' (staging)', 'Sa Bo-ra (A&R)'].join(', '), 'said in the building’s order, each with the room');
  t.eq(js(say(() => KP.roomSaid({}))) + ' · ' + js(say(() => KP.roomSaid(null))), '"" · ""', 'an empty room says nothing');
  // a real record, landed by the real weeks: it carries the room, and keeps it when a chair goes
  const r = KP.newGame('rl-landing', null, {});
  r.budget = 9000;
  const g = r.groups.filter(x => x.debuted && !x.retiredWeek)[0] || r.groups[0];
  const went = say(() => {
    if (!g.demos) { const rng = KP.rngFor(r); g.demos = KP.generateDemos(r, rng, g); r.rngState = rng.state(); }
    const p = KP.planDebut(r, { groupId: g.id, songId: g.demos[0].id, promo: 'modest', week: r.week + Math.max(KP.C.DEBUT.prepWeeksMin, 5), alloc: { vocals: 30, dance: 30, rap: 10, media: 30 } });
    for (let i = 0; i < 14 && !(g.releases || []).some(x => x.week > 1); i++) { const was = r.week; KP.advanceWeek(r); if (r.week === was) return 'the week did not move at ' + was; }
    return p && p.ok === false ? 'the plan was refused: ' + p.reason : 'ok';
  });
  const landed = (g.releases || []).filter(x => x.week > 1)[0] || { room: 'no record landed' };
  const want = {}; ['vocal', 'dance', 'perf'].forEach(k => { want[k] = r.seats[k].name; });
  t.eq(went + ' · ' + js(landed.room), 'ok · ' + js(want), 'a record landed by real weeks carries the names of the rooms’ chairs sat that week');
  const coach = r.seats.vocal.name;
  r.budget = 9000;
  say(() => KP.releaseSeat(r, 'vocal'));
  t.eq((landed.room || {}).vocal + ' · ' + !!r.seats.vocal + ' · ' + line(r).name, coach + ' · false · ' + coach, 'the coach is let go, and is still on the record they worked on: a departure erases nothing');
  const round = obj(say(() => KP.deserialize(KP.serialize(r))));
  const again = ((KP.groups(round).filter(x => x.id === g.id)[0] || {}).releases || []).filter(x => x.week === landed.week)[0] || {};
  t.eq(js(again.room) + ' · ' + js(round.staffRoll), js(landed.room) + ' · ' + js(r.staffRoll), 'the room and the roll are saved with the file');
}

// ---- H. the scout’s name on who they brought in -----------------------------------------------------------
{
  const s = desk('rl-stamp', 200);
  sit(s, 'scout', 100, { name: 'Scout Im' });
  signed(s, [99, 100, 101, 150]);
  say(() => KP.signedStamp(s));
  const under = () => s.roster.slice(0, 5).map(id => s.people[id].signedUnder || '-').join();
  t.eq(under(), '-,-,Scout Im,Scout Im,-', 'whoever signed after the scout sat carries the scout’s name: not one signed the week they sat, nor before, nor one with no date');
  say(() => KP.releaseSeat(s, 'scout'));
  sit(s, 'scout', 201, { name: 'Pyo Jae-hoon' });
  s.week = 260;
  s.people[s.roster[4]].signedWeek = 230;
  t.eq(rail(s) + ' · ' + under(), 'ok · -,-,Scout Im,Scout Im,Pyo Jae-hoon', 'the week writes the name on a new signing; the next scout’s name does not go over the last one’s, nor on those from before either');
  s.people[s.roster[2]].signedWeek = 240;   // forced: a signing date that moves on to the next scout’s watch
  t.eq(rail(s) + ' · ' + under(), 'ok · -,-,Scout Im,Scout Im,Pyo Jae-hoon', 'a name once written is not written over, whatever the dates say after');
  delete s.seats.scout;
  s.people[s.roster[0]].signedWeek = 259;
  rail(s);
  sit(s, 'scout', 262, { name: 'Gong In-na' });
  s.week = 270;
  t.eq(rail(s) + ' · ' + under(), 'ok · -,-,Scout Im,Scout Im,Pyo Jae-hoon', 'one who signed while the chair was empty carries no scout’s name, then or after');
}

// ---- I. a house chair’s list is kept whole ------------------------------------------------------------------
{
  const s = desk('rl-works', 300);
  const g = act(s); g.debuted = true;
  sit(s, 'producer', 10, { name: 'Baek Chul-soo', lane: 'cute', craft: 60, works: [] });
  sit(s, 'writer', 10, { name: 'Im Bo-ra', themes: ['longing'], craft: 60, works: [] });
  const pool = obj(say(() => KP.producersOf(s)[0]));
  const land = (w, prId) => { s.week = w; g.lastReleaseWeek = w; g.releases = (g.releases || []).concat([rec(w, 'warm', { producerId: prId, writerId: KP.houseWriters(s)[0].id, reception: 60, craft: 60 })]);
    return say(() => { phase('credits').fn(s, still, [], [], KP.groups(s)); return 'ok'; }); };
  const house = obj(say(() => KP.houseProducers(s)[0]));
  let ran = 'ok';
  for (let i = 0; i < 15; i++) { const r = land(301 + i, house.id); if (r !== 'ok') ran = r; }
  const CAP = (KP.C.CREDITS || {}).worksCap;
  t.eq([ran, CAP, s.seats.producer.works.length, s.seats.writer.works.length, KP.seatMade(s.seats.producer).length].join(' · '), 'ok · 12 · 15 · 15 · 15', 'fifteen records through the rail: the house producer and the house writer keep all fifteen, past the depth of twelve');
  t.eq(js(say(() => KP.worksRecent(s.seats.producer).map(w => w.week))), js(Array.from({ length: 12 }, (x, i) => 304 + i)), 'what a read that decides anything looks at is still the last twelve');
  pool.works = [];
  for (let i = 0; i < 15; i++) land(320 + i, pool.id);
  t.eq(pool.works.length + ' · ' + s.seats.producer.works.length, '12 · 15', 'a producer who is not of the house keeps twelve, as before');
  // three records together make a sound the public can name (§91): counted over the same twelve
  const sound = works => { const x = desk('rl-sound-' + works, 300); const a = act(x); a.debuted = true;
    const w = (n, from, gid) => Array.from({ length: n }, (q, i) => ({ week: from + i, title: gid + i, craft: 60, groupId: gid }));
    sit(x, 'producer', 10, { name: 'Baek Chul-soo', lane: 'cute', craft: 60, works: works === 'long ago' ? w(3, 100, a.id).concat(w(12, 200, 'another act')) : w(12, 100, 'another act').concat(w(2, 200, a.id)) });
    x.week = 301; a.lastReleaseWeek = 301; a.releases = [rec(301, 'warm', { producerId: obj(say(() => KP.houseProducers(x)[0])).id, reception: 60, craft: 60 })];
    const ran = say(() => { phase('credits').fn(x, still, [], [], KP.groups(x)); return 'ok'; });
    return ran + '/' + x.seats.producer.works.length + '/' + (say(() => KP.getNarrative(x, 'signatureSound', 'group', a.id)) ? 'a sound' : 'no sound'); };
  t.eq(sound('long ago') + ' · ' + sound('lately'), 'ok/16/no sound · ok/15/a sound', 'three records with an act among a producer’s last twelve make a sound; three long ago, behind twelve for another act, do not, though the list keeps them');
  s.seats.producer.works = Array.from({ length: 20 }, (x, i) => ({ week: 100 + i, title: 'W' + i, craft: i < 8 ? 10 : 80, groupId: g.id }));
  t.eq(String(say(() => KP.producerHeat(KP.houseProducers(s)[0]))) + ' · ' + String(say(() => KP.producerHeat({ works: s.seats.producer.works.slice(0, 12) }))), 'in demand · cold streak', 'a track record’s word is read off the last twelve, not the eight cold records before them: the first twelve would have read otherwise');
}

// ---- J. the plainer words ---------------------------------------------------------------------------------
{
  const P = x => String(say(() => KP.resumePlain(x)));
  t.eq([P('11 years in, most recently at a management boutique'), P('was in the room for one long tour cycle'), P('here since the beginning — the résumé is this company'),
    P('here since the founding — the résumé is this label'), P('here before you — the résumé is this company'), P('here since the second beginning'), P('came across from HCG at the founding'), P('9 years in the industry, most recently at a mid-tier label')].join(' | '),
  '11 years in the industry, most recently at a management boutique | worked through one long tour cycle | here since the beginning; this company is the whole résumé | ' +
    'here since the founding; this label is the whole résumé | here before you came; this company is the whole résumé | here since the second beginning | came across from HCG at the founding | 9 years in the industry, most recently at a mid-tier label',
  'a résumé line as older files wrote it, in the plainer words: the same years, the same house, the same era; a line already plain is left alone');
  t.eq(['vocal', 'dance', 'perf', 'scout', 'anr', 'marketing'].map(k => String(say(() => KP.knownForSaid(k)))).join(' | '), 'vocal coaching | dance coaching | staging | scouting | A&R | marketing', 'what the trades know a name for is the work, not the title');
  // a candidate minted now carries the plain words, and the meeting says them
  const s = desk('rl-cand', 60); s.budget = 900;
  const posted = obj(say(() => KP.openSearch(s, 'anr')));
  const yes = new Proxy({}, { get: (o, k) => (k === 'chance' ? () => true : k === 'int' ? a => a : k === 'pick' ? l => l[0] : () => 0.5) });
  say(() => { for (let i = 0; i < 6 && !(s.scenes || []).some(x => x.kind === 'theInterview'); i++) { s.week++; phase('hires').fn(s, yes, [], [], KP.groups(s)); } });
  const sc = (s.scenes || []).filter(x => x.kind === 'theInterview')[0] || { cand: { resume: ['no candidate came'], knownForTag: null } };
  t.ok(posted.ok === true && /^\d+ years in the industry, most recently at /.test(sc.cand.resume[0]) && /^worked through /.test(sc.cand.resume[1]), 'a candidate’s résumé is written in them (' + js(sc.cand.resume) + ')');
  sc.cand.knownForTag = 'perf';
  const body = String(say(() => KP.sceneDef('theInterview').body(s, sc)));
  t.ok(body.includes('The résumé: ' + sc.cand.resume.join('; ') + '.') && body.includes(', known for staging. The fee is ') && body.endsWith('The résumé says where they were. It does not say what they did there.'), 'and the meeting reads them out, with what the trades know them for');
  t.eq((KP.staffSeats(KP.newGame('rl-open-res', null, {})).vocal || {}).resume.join(), 'here since the beginning; this company is the whole résumé', 'the chairs a first house opens with');
  // a credit in a clause names the house
  const c = { kind: 'eras', n: 3, crowned: 1, warm: 1, quiet: 0, cold: 0, running: 1 };
  t.eq([KP.seatCreditShort(c, 'HCG'), KP.seatCreditShort(c), KP.seatCreditShort({ kind: 'floor', n: 2, of: 9, debuted: 0 }, 'HCG'), KP.seatCreditShort({ kind: 'records', n: 1 }, 'HCG')].join(' | '),
    '3 eras at HCG, one of them closed with a trophy | 3 eras at this house, one of them closed with a trophy | 2 of the 9 on HCG’s roster, signed while they ran scouting | one record made at HCG', 'a credit that crosses the street names the house it was earned at');
}

// ---- K. an older file -------------------------------------------------------------------------------------
{
  const s = desk('rl-old', 200);
  ['vocal', 'dance', 'perf'].forEach(k => { s.seats[k].since = 1; s.seats[k].resume = ['here since the beginning — the résumé is this company']; });
  sit(s, 'scout', 100, { name: 'Scout Im', resume: ['11 years in, most recently at a management boutique', 'was in the room for one long tour cycle'] });
  sit(s, 'anr', 150, { name: 'Sa Bo-ra' });
  records(s, [rec(90, 'warm'), rec(160, 'warm')]);
  signed(s, [90, 120]);
  s.scenes = [{ id: 'sc9', kind: 'theInterview', cand: Object.assign({}, CAND, { resume: ['4 years in, most recently at a one-room agency', 'was in the room for a famous era'] }) }];
  delete s.staffRoll;
  const old = load(s, '0.11.46');
  const rels = (act(old).releases || []).map(x => js(x.room)).join(' ');
  const names = k => ((old.seats || {})[k] || {}).name;
  t.eq(js(old.staffRoll), '[]', 'a file from before opens with an empty roll: it kept nothing of a chair once it had gone, and cannot say who sat before');
  t.eq(rels, js({ vocal: names('vocal'), dance: names('dance'), perf: names('perf') }) + ' ' + js({ vocal: names('vocal'), dance: names('dance'), perf: names('perf'), anr: 'Sa Bo-ra' }),
    'each record is given the rooms’ chairs who sat when it landed and sit yet: the A&R lead only on the one that landed after they came');
  t.eq((old.roster || []).slice(0, 3).map(id => old.people[id].signedUnder || '-').join(), '-,Scout Im,-', 'each of the roster signed after the scout who sits yet is given their name');
  t.eq(js(old.seats.vocal.resume) + ' · ' + js(old.seats.scout.resume) + ' · ' + js(old.scenes[0].cand.resume),
    js(['here since the beginning; this company is the whole résumé']) + ' · ' + js(['11 years in the industry, most recently at a management boutique', 'worked through one long tour cycle']) + ' · ' +
    js(['4 years in the industry, most recently at a one-room agency', 'worked through a famous era']), 'the résumés are put in the plainer words, a candidate’s in the building among them');
  t.eq(js(say(() => KP.validateState(old).filter(x => /roll|chair/.test(x)))), '[]', 'and the file is whole');
  const now = load(old, KP.C.VERSION);
  t.eq(js(now.staffRoll) + ' · ' + js(act(now).releases.map(x => x.room)), js(old.staffRoll) + ' · ' + js(act(old).releases.map(x => x.room)), 'a file of this version is not migrated again');
}

// ---- L. the file is held whole ----------------------------------------------------------------------------
{
  const s = mk('rl-valid');
  say(() => KP.releaseSeat(s, 'vocal'));
  const bad = fn => { const c = JSON.parse(JSON.stringify(s)); const first = (c.staffRoll || [])[0]; if (!first) return 'no line'; fn(first); const r = say(() => KP.validateState(c)); return (Array.isArray(r) ? r : [String(r)]).filter(x => /roll/.test(x)).length; };
  t.eq([bad(() => {}), bad(e => { delete e.name; }), bad(e => { e.seatId = 'janitor'; }), bad(e => { e.how = 'vanished'; }), bad(e => { delete e.credit; }), bad(e => { e.until = e.since - 1; }), bad(e => { e.until = 999; }), bad(e => { delete e.house; }), bad(e => { e.shut = 'folded'; }), bad(e => { e.shut = 'burned'; })].join(),
    '0,1,1,1,1,1,1,1,0,1', 'the validator passes a whole line, open or shut, and names a line with no name, no such chair, no such way of going, no credit, no house, weeks that cannot be, or a house closed some other way');
}

t.finish();
