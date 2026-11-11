/* Suite 142 — the till's one door in (v0.11.35, §127: a repair of §124's
   books). The year's sum was fed by the books, and the books miss part of
   what comes in: they enter some takings net of their cost, and some not at
   all. Now every credit to the till passes through KP.takeIn and is counted
   there, so what the company writes to itself at the year's close is what
   the till saw.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   letter fails by name; nothing here can crash or hang under a broken
   engine. */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_142_till');
const YEAR = KP.C.WEEKS_PER_YEAR, MONTH = KP.C.WEEKS_PER_MONTH;

// ---- the kit ------------------------------------------------------------------
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const js = x => JSON.stringify(x);
const led = s => (s && s.yearLedger) || { took: 'no books', open: {} };
const act = s => KP.groups(s)[0] || { name: 'no act', id: 'none', releases: [], members: [] };
const phase = name => KP.weeklyPipeline([]).filter(p => p.name === name)[0] || { fn: () => { throw new Error('no phase ' + name); } };
const run = (name, s) => { const inbox = []; const r = say(() => phase(name).fn(s, KP.rngFor(s), inbox, s.roster, KP.groups(s))); return typeof r === 'string' ? [{ ind: r, text: r }] : inbox; };
const answerAll = s => (s.scenes || []).slice().forEach(sc => { const d = KP.sceneDef(sc.kind); if (d) KP.resolveScene(s, sc.id, d.options(s, sc)[0].id); });
// a till watched from outside the engine: every rise and every fall it sees
function watch(s) {
  const w = { came: 0, went: 0 };
  let v = s.budget;
  Object.defineProperty(s, 'budget', { enumerable: true, configurable: true,
    get() { return v; }, set(n) { const d = n - v; v = n; if (d > 0) w.came += d; else w.went += -d; } });
  return w;
}
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const files = dir => fs.readdirSync(path.join(ROOT, dir)).filter(f => f.endsWith('.js')).map(f => dir + '/' + f);

// ---- A. the source: one door in ---------------------------------------------------------------
{
  const all = files('js/engine').concat(files('js/ui'));
  const credits = [], sets = [], odd = [];
  all.forEach(f => read(f).split('\n').forEach((l, i) => {
    if (/\bbudget\s*\+=/.test(l)) credits.push(f + ':' + (i + 1));
    if (/\.budget\s*=(?!=)/.test(l)) sets.push({ at: f + ':' + (i + 1), f, l: l.trim() });
    if (/\[\s*['"]budget['"]\s*\]\s*[-+]?=(?!=)/.test(l)) odd.push(f + ':' + (i + 1));
  }));
  t.eq(credits.length, 1, 'one line in the engine and the screens adds to the till (' + credits.slice(0, 4).join(', ') + ')');
  t.ok(credits.length === 1 && credits[0].startsWith('js/engine/money.js:'), 'and it is the door’s own, in money.js');
  // every plain assignment to the till is an opening or a clamp that can only lower it
  const opening = x => ['js/engine/newgame.js', 'js/engine/founding.js', 'js/engine/estate.js'].includes(x.f) && /^state\.budget = [^;]+;/.test(x.l);
  const clamp = x => /state\.budget = Math\.max\(0, (state\.budget|have) - [^;]+\);/.test(x.l);
  const stray = sets.filter(x => !opening(x) && !clamp(x));
  t.eq(stray.map(x => x.at).join(', '), '', 'every plain assignment to the till is a company’s opening till, or a clamp that can only lower it');
  t.eq([sets.filter(opening).length, sets.filter(x => clamp(x) && !opening(x)).length].join('|'), '6|5', 'six openings and five clamps, as counted');
  t.eq(odd.join(', '), '', 'and nothing reaches the till by another name');
  const door = (/KP\.takeIn = function \(state, amount\) \{[\s\S]*?\n  \};/.exec(read('js/engine/money.js')) || [''])[0];
  t.ok(/state\.budget \+= amount;/.test(door) && /led\.took \+= amount;/.test(door), 'the door adds to the till and to the year’s sum');
  const flow = (/KP\.ledgerFlow = function \(state, stream, amount\) \{[\s\S]*?\n  \};/.exec(read('js/engine/money.js')) || ['took'])[0];
  t.ok(!/took|yearLedger/.test(flow), 'and the books’ own entry no longer feeds the year’s sum');
}

// ---- B. the door ------------------------------------------------------------------------------
{
  const s = KP.newGame('till-door', null, {});
  const till = s.budget;
  say(() => KP.takeIn(s, 100));
  t.eq([s.budget - till, led(s).took].join('|'), '100|100', 'a credit raises the till and is counted in the year’s sum');
  say(() => KP.takeIn(s, -40));
  t.eq([s.budget - till, led(s).took].join('|'), '60|100', 'an amount below nothing lowers the till and is not counted');
  say(() => KP.takeIn(s, 0));
  t.eq([s.budget - till, led(s).took].join('|'), '60|100', 'nothing changes nothing');
  say(() => KP.takeIn(s, 12.5));
  t.eq([s.budget - till, led(s).took].join('|'), '72.5|112.5', 'and the count is the amount, to the fraction');
  // books that open at the door open with the till as it stood
  const bare = KP.newGame('till-bare', null, {});
  delete bare.yearLedger; bare.week = 30; bare.budget = 500;
  say(() => KP.takeIn(bare, 70));
  t.eq(js(bare.yearLedger) + ' ' + bare.budget, '{"took":70,"open":{"week":30,"budget":500}} 570', 'books opened by a credit open with the till as it stood before it');
  // the books keep their own count and no longer feed the year's
  const b = KP.newGame('till-books', null, {});
  say(() => KP.ledgerFlow(b, 'albums', 300));
  say(() => KP.ledgerFlow(b, 'production', -120));
  t.eq([led(b).took, js(b.books.cur)].join(' '), '0 {"albums":300,"production":-120}', 'an entry in the books is the books’ alone: the year’s sum does not move');
}

// ---- C. what the books missed, through the real lines ---------------------------------------------
{
  // the month's turn, at a label with nobody to pay: the stipend comes in, and nothing else moves the till
  const s = KP.newGame('till-month', null, { door: 'blank', companyName: 'Paper Label' });
  const w0 = watch(s);
  const till = s.budget, quiet = [];
  for (let i = 0; i < MONTH - 1; i++) { say(() => { answerAll(s); KP.advanceWeek(s); }); quiet.push(led(s).took); }
  t.eq([s.week, quiet.join(','), w0.came].join('|'), MONTH + '|' + quiet.map(() => 0).join(',') + '|0', 'the fixture: an empty label’s first month takes nothing in, and no stipend comes between two months');
  say(() => { answerAll(s); KP.advanceWeek(s); });
  t.eq([s.week, led(s).took, w0.came, s.budget - till].join('|'), [MONTH + 1, KP.C.ECON.monthlyStipend, KP.C.ECON.monthlyStipend, KP.C.ECON.monthlyStipend].join('|'),
    'at the month’s turn the stipend comes into the till and is counted in the year’s sum');
  // and where the month's bills are more than the till holds, the stipend still came in before they went out
  const poor = KP.newGame('till-poor', null, {});
  poor.week = MONTH; poor.budget = 0; poor.yearLedger = { took: 0, open: { week: 1, budget: 0 } };
  const wp = watch(poor);
  say(() => { answerAll(poor); KP.advanceWeek(poor); });
  t.ok(poor.week === MONTH + 1 && led(poor).took >= KP.C.ECON.monthlyStipend && led(poor).took === wp.came, 'a till with nothing in it still counts the stipend that came in before the month’s bills took it (' + led(poor).took + ' of ' + wp.came + ')');

  // a unit era: its cost goes out, its takings come in, and the books hear of neither
  const u = KP.newGame('till-unit', null, {});
  const g = act(u);
  Object.assign(g, { prep: null, tour: null, hiatus: null, promoUntil: 0, popularity: 50 });
  delete g.lastUnitWeek;
  u.week = 60; u.budget = 500;
  (g.members || []).forEach(id => { const m = u.people[id]; if (m) { delete m.break; m.onBreak = false; } });
  const w = watch(u);
  const r = say(() => KP.planUnitEra(u, g.id, (g.members || []).slice(0, 2), 'Pair'));
  t.ok(r && r.ok === true, 'the fixture: a unit era goes through (' + js(r).slice(0, 90) + ')');
  t.ok(w.came > 0 && led(u).took === w.came, 'a unit era’s takings are counted in the year’s sum (' + led(u).took + ' of ' + w.came + ')');
  t.eq(w.went, KP.C.PORTFOLIO.UNIT.cost, 'and its cost went out of the till beside them');
  t.eq(js((u.books || {}).cur || {}), '{}', 'the quarter’s books were never told of either: that is why they cannot be asked');

  // the lightstick: the books enter it net of its cost, the year counts what came in
  const l = KP.newGame('till-stick', null, {});
  const lg = act(l);
  lg.popularity = 80; delete lg.lightstickWeek;
  lg.fandom = lg.fandom && lg.fandom.name ? lg.fandom : { name: 'Lanterns', color: 'rose', since: 1, intensity: 60 };
  l.budget = 500;
  const lw = watch(l);
  const lr = say(() => KP.launchLightstick(l, lg.id));
  t.ok(lr && lr.ok !== false && lw.came > 0, 'the fixture: the lightstick launches and sells (' + js(lr).slice(0, 90) + ')');
  t.eq(led(l).took, lw.came, 'the lightstick’s whole takings are counted');
  t.eq([lw.went, js((l.books || {}).cur || {})].join(' '), KP.C.CONSTITUENCY.lightstickCost + ' ' + js({ commerce: lw.came - KP.C.CONSTITUENCY.lightstickCost }),
    'its cost went out beside them, and the books hold the one net figure');

  // one last concert: the night's takings come in whole, and its cost goes out
  const e = KP.newGame('till-night', null, {});
  const eg = act(e);
  Object.assign(eg, { prep: null, tour: null, hiatus: null, jpAway: null, promoUntil: 0 });
  eg.fandom = Object.assign({ name: 'Lanterns', color: 'rose', since: 1 }, eg.fandom || {}, { intensity: 90 });
  (eg.members || []).forEach(id => { const m = e.people[id]; if (m) delete m.soloEra; });
  e.week = 60; e.budget = 5000;
  const door = ((say(() => KP.endingDoors(e, eg.id)) || {}).doors || []).filter(d => d.id === 'concert')[0] || { ok: false, reason: 'no such door' };
  t.ok(door.ok === true && door.till > 0 && door.cost > 0, 'the fixture: the last concert’s door is open, with a till and a cost (' + js([door.ok, door.till, door.cost, door.reason]).slice(0, 90) + ')');
  const ew = watch(e);
  const er = say(() => KP.endGroup(e, eg.id, 'concert'));
  t.ok(er && er.ok !== false, 'and the night is played (' + js(er).slice(0, 80) + ')');
  t.eq([led(e).took, ew.came, ew.went].join('|'), [door.till, door.till, door.cost].join('|'), 'the night’s takings are counted whole, and its cost went out beside them');
}

// ---- D. real weeks: the year's sum is what the till saw ----------------------------------------------
{
  const s = KP.newGame('till-real', null, {});
  s.budget = 5e4; s.yearLedger = { took: 0, open: { week: 1, budget: 5e4 } };   // a till deep enough for two idle years; the books open with it
  const w = watch(s);
  const bad = [];
  let closes = 0, landed = 0, last = { came: 0, went: 0 };
  for (let i = 0; i < 2 * YEAR && s.week < 2 * YEAR && !KP.chapterPending(s); i++) {
    const r = say(() => { answerAll(s); KP.advanceWeek(s); return 'ok'; });
    if (r !== 'ok') { bad.push('week ' + s.week + ' ' + r); break; }
    if (s.week % YEAR !== 0) continue;
    closes++;
    const a = (s.years || [])[closes - 1] || {};
    const came = w.came - last.came, went = w.went - last.went;
    last = { came: w.came, went: w.went };
    if (a.took !== Math.round(came)) bad.push('year ' + closes + ': counted ' + a.took + ' coming in, the till saw ' + came);
    if (a.took - (a.till - a.was) !== Math.round(went)) bad.push('year ' + closes + ': ' + (a.took - (a.till - a.was)) + ' went out by the sum, the till saw ' + went);
    if (!/\d+ came in and \d+ went out\./.test(a.said || '')) bad.push('year ' + closes + ': the letter gives no sum: ' + String(a.said).slice(-70));
    // the letter itself, the week it lands
    const mail = (s.inbox || []).filter(m => m.ind === 'yearEnd' && m.week === s.week)[0];
    if (!mail || mail.text !== a.said) bad.push('year ' + closes + ': the letter with that sum is not in the inbox');
    landed++;
  }
  t.eq(closes, 2, 'two real years close');
  t.eq(bad.join(' · '), '', 'in each, what the letter counts as coming in is what the till saw come in, and what went out is what it saw go out');
  t.ok(last.came > 2 * 12 * KP.C.ECON.monthlyStipend - 1 && last.went > 0, 'and the two years moved money both ways (' + Math.round(last.came) + ' in, ' + Math.round(last.went) + ' out)');
  t.eq(landed, 2, 'and each letter was in the inbox the week it was written, saying what was filed');
}

// ---- E. the letter, from a till the fixture moves by hand ----------------------------------------
{
  const s = KP.newGame('till-letter', null, {});
  s.week = 2 * YEAR; s.budget = 400;
  s.yearLedger = { took: 0, open: { week: YEAR, budget: 400 } };
  say(() => KP.takeIn(s, 500));
  s.budget -= 180;
  const inbox = run('yearClose', s);
  t.ok(inbox[0] && /The books: 500 came in and 180 went out\. The till closes at 720, up 320\.$/.test(inbox[0].text), 'a year that took 500 in and paid 180 out says so (' + String(inbox[0] && inbox[0].text).slice(-76) + ')');
}

// ---- F. an old file -------------------------------------------------------------------------------
{
  const old = (seed, version, week, edit) => {
    const s = KP.newGame(seed, null, {});
    s.week = week; s.budget = 900;
    edit(s);
    const raw = JSON.parse(KP.serialize(s));
    raw.version = version;
    const back = say(() => KP.deserialize(JSON.stringify(raw)));
    return back && typeof back === 'object' ? back : { threw: String(back), yearLedger: null, years: [], inbox: [] };
  };
  // a file saved by v0.11.34 in the middle of its third year
  const s = old('till-old', '0.11.34', 2 * YEAR + 20, x => {
    x.yearLedger = { took: 1500, open: { week: 2 * YEAR, budget: 300 } };
    x.years = [{ year: 1, took: 800, said: 'what was said of year one' }, { year: 2, took: 900, said: 'what was said of year two' }];
  });
  t.eq(js(s.yearLedger), js({ took: 0, open: { week: 2 * YEAR + 20, budget: 900 } }), 'an old file’s books open again on the day it is loaded: what the year in hand had counted cannot be made whole');
  t.eq(js((s.years || []).map(a => [a.year, a.took, a.said])), js([[1, 800, 'what was said of year one'], [2, 900, 'what was said of year two']]), 'the years already filed keep what they said');
  t.eq(s.version, KP.C.VERSION, 'and the file is this version’s now');
  if (s.yearLedger) {
    s.week = 3 * YEAR; say(() => KP.takeIn(s, 300));
    const first = run('yearClose', s);
    t.ok(first[0] && /The books: the till closes at 1200\.$/.test(first[0].text), 'its next close gives the till and not the sum (' + String(first[0] && first[0].text).slice(-50) + ')');
    s.week = 4 * YEAR; say(() => KP.takeIn(s, 250)); s.budget -= 100;
    const next = run('yearClose', s);
    t.ok(next[0] && /The books: 250 came in and 100 went out\. The till closes at 1350, up 150\.$/.test(next[0].text), 'and the year after is whole (' + String(next[0] && next[0].text).slice(-76) + ')');
  } else t.ok(false, 'the old file did not load: ' + js(s).slice(0, 80));
  // a file from before the year's close has the same books: opened today
  const older = old('till-older', '0.11.29', YEAR + 10, x => { delete x.yearLedger; delete x.years; });
  t.eq(js(older.yearLedger), js({ took: 0, open: { week: YEAR + 10, budget: 900 } }), 'a file from before the year’s close is given books that open today');
  // a file already at this version keeps its books
  const now = old('till-now', KP.C.VERSION, YEAR + 10, x => { x.yearLedger = { took: 77, open: { week: YEAR, budget: 5 } }; });
  t.eq(js(now.yearLedger), js({ took: 77, open: { week: YEAR, budget: 5 } }), 'and a file of this version keeps the books it has');
}

// ---- G. the audit, held on a small case of its own ------------------------------------------------
{
  const audit = say(() => require('../tools/audit_till.js'));
  const has = !!audit && typeof audit.wrap === 'function' && typeof audit.report === 'function' && typeof audit.tally === 'function';
  t.ok(has, 'the till audit gives the suite its watcher and its report');
  t.ok(/suite_142_till\.js$/.test(process.argv[1] || ''), 'and it runs nothing when it is only required: this is still the suite’s own run (' + path.basename(process.argv[1] || '') + ')');
  const T = has ? audit.tally() : { outside: {}, miscount: [] };
  const K2 = has ? say(() => audit.wrap(loadEngine(), T)) : null;
  const ok = !!K2 && typeof K2 === 'object';
  t.ok(ok, 'the audit wraps a fresh engine (' + String(K2).slice(0, 60) + ')');
  const rep = x => (ok ? say(() => audit.report(x)) : null) || { bad: null, lines: [], outside: [] };
  const s = ok ? say(() => K2.newGame('till-audit', null, {})) : null;
  if (ok && s && typeof s === 'object') {
    t.eq(T.worlds, 1, 'a new world’s till is watched');
    say(() => K2.takeIn(s, 70));
    say(() => K2.takeIn(s, -20));
    t.eq([T.door, T.doorSum, T.tookSum, js(T.outside)].join('|'), '1|70|70|{}', 'a credit through the door is counted once with what the year’s ledger took, and a debit is no credit');
    const clean = rep(T);
    t.ok(clean.bad === false && /TILL CLEAN/.test(clean.lines[clean.lines.length - 1] || ''), 'a till fed only through the door is clean');
    // a world reloaded from its save is watched too
    say(() => K2.deserialize(K2.serialize(s)));
    t.eq(T.worlds, 2, 'a world loaded from a save is watched as well');
    // a founding sets an opening till: not income, and not a line to name
    const f = say(() => K2.newGame('till-audit-found', null, {})) || {};
    f.week = 3 * YEAR; f.trust = 80; f.budget = 0;
    f.awardHistory = [{ year: 2, category: 'daesang', name: act(f).name, company: (f.company || {}).short, isPlayer: true }];
    const fr = say(() => K2.foundLabel(f, 'HOMEWARD'));
    t.ok(fr && fr.ok === true && f.budget > 0, 'the fixture: a founding fills an empty till with its war chest (' + js(fr).slice(0, 60) + ')');
    t.eq([T.openings, T.openingSum, js(T.outside)].join('|'), '1|' + f.budget + '|{}', 'a company’s opening till is counted apart, and is no line to name');
    // a line that goes round the door is named
    s.budget += 5;
    const off = rep(T);
    t.ok(off.bad === true && off.outside.length === 1 && off.lines.some(l => /OUTSIDE THE DOOR: suite_142_till\.js:\d+ raised the till 1 times, by 5 in all/.test(l)) &&
      /TILL AUDIT FAILED: 1 line/.test(off.lines[off.lines.length - 1] || ''), 'a line that raises the till outside the door is named, and the audit fails (' + off.lines.slice(-2).join(' / ').slice(0, 150) + ')');
    // a door that does not count what it takes
    const T3 = audit.tally(), K3 = loadEngine();
    K3.takeIn = function (st, amount) { st.budget += amount; };
    const s3 = say(() => { audit.wrap(K3, T3); const x = K3.newGame('till-audit-3', null, {}); K3.takeIn(x, 9); return x; });
    const mis = rep(T3);
    t.ok(!!s3 && mis.bad === true && T3.miscount.length === 1 && mis.lines.some(l => /MISCOUNTED: a credit of 9 was counted as 0/.test(l)), 'a door that does not count what it takes is caught');
  } else t.ok(false, 'the audit’s own case could not be staged: ' + String(s).slice(0, 80));
  // an audit that saw nothing at all is not a clean one
  const empty = has ? rep(audit.tally()) : { bad: null, lines: [] };
  t.ok(empty.bad === true && empty.lines.some(l => /NOTHING CAME THROUGH THE DOOR/.test(l)), 'an audit that saw no credit at all fails');
  const src = say(() => read('tools/audit_till.js'));
  t.ok(/require\.main === module/.test(src) && /require\(path\.join\(__dirname, 'harness\.js'\)\)/.test(src), 'run on its own it plays the soak underneath, as the people audit does');
}

t.finish();
