/* Suite 140 — the written record (v0.11.30, §122: the people upstairs and
   down the hall, part four). The company's file is read off the markers the
   rails leave. Four things leave no marker: a chair before the last one, the
   red weeks, the breakthrough, and the night of this desk's first trophy.
   The rail writes a mark as it fires, and the file reads it. The record is
   the company's: a founding or a last statement closes it, and a founded
   label's firsts are its own. An old file gets the marks its markers can
   still prove.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing mark
   fails by name; nothing here can crash or hang under a broken engine. */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const KP = loadEngine();
const t = makeT('suite_140_record');
const YEAR = KP.C.WEEKS_PER_YEAR, CEREMONY = KP.C.AWARDS.ceremonyWeek, RED = KP.C.RED;

// ---- the kit ------------------------------------------------------------------
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const js = x => JSON.stringify(x);
const marks = s => { const m = say(() => KP.fileMarks(s)); return Array.isArray(m) ? m : []; };
const of = (s, kind) => marks(s).filter(m => m && m.kind === kind);
const file = s => { const f = say(() => KP.companyFile(s)); return f && typeof f === 'object' ? f : { chapters: [], manager: {}, threw: String(f) }; };
const rows = (s, kind) => file(s).chapters.filter(c => !kind || c.kind === kind).map(c => c.week + (c.before ? ' before ' : ' ') + c.text);
const act = s => KP.groups(s)[0] || { name: 'no act', id: 'none', releases: [], members: [] };
const world = (seed, week) => { const s = KP.newGame(seed, null, {}); s.week = week || 100; return s; };
const lastTitle = g => { const r = (g.releases || [])[(g.releases || []).length - 1]; return r ? r.songTitle : null; };
// one phase of the real week, by name
const phase = name => KP.weeklyPipeline([]).filter(p => p.name === name)[0];
const run = (name, s) => {
  const inbox = [];
  const r = say(() => phase(name).fn(s, KP.rngFor(s), inbox, s.roster.map(id => s.people[id]), KP.groups(s)));
  return typeof r === 'string' ? [{ ind: r }] : inbox;
};
const inds = notes => notes.map(n => n.ind).filter(Boolean).join();
// an old file's record, as the backfill returns it (a throw is a mark that says so)
const fill = s => { const r = say(() => KP.fileBackfill(s)); return Array.isArray(r) ? r : [{ week: String(r), kind: 'threw', name: String(r), title: String(r), groupId: String(r) }]; };
// a second act of ours: a copy of the inherited one, with its past removed
function lineup(s, id, name, from) {
  const g = Object.assign(JSON.parse(JSON.stringify(from || act(s))), { id, name, releases: [], debuted: false });
  ['debutWeek', 'honors', 'recoup', 'retiredWeek', 'trophies', 'legacy', 'lastShowWinWeek', 'eraBreakthrough'].forEach(k => { delete g[k]; });
  s.groups.push(g);
  return g;
}
const debut = (g, week, o) => { g.debuted = true; g.debutWeek = week; g.releases.push(Object.assign({ week, songTitle: 'First ' + g.name, chartPeak: 9, reception: 50 }, o || {})); return g; };
// the stages cleared of everyone else, and our act on them this week
function onStage(s, g, shows) {
  (s.rivals || []).forEach(r => (r.acts || []).forEach(a => { a.lastReleaseWeek = s.week - 40; }));
  ((s.national || {}).artists || []).forEach(ar => { ar.lastRelease = -99; });
  g.lastReleaseWeek = s.week - 1; g.promoUntil = s.week + 3; g.popularity = 100; delete g.prep;
  g.rollout = [shows, shows, shows, shows];
}
const cups = g => Object.keys(g.trophies || {}).reduce((n, k) => n + g.trophies[k], 0);
const air = s => say(() => KP.showsWeek(s, KP.rngFor(s)));
// a week on the stages for one act: how many trophies it took
const win = (s, g, shows) => { onStage(s, g, shows || ['popWave']); const before = cups(g); air(s); return cups(g) - before; };

// ---- A. the shape -----------------------------------------------------------------
{
  ['fileMark', 'fileMarks', 'fileMarkKinds', 'fileBackfill', 'fileFoundedFirsts'].forEach(k => t.ok(typeof KP[k] === 'function', 'the engine carries KP.' + k));
  t.eq(String(say(() => KP.fileMarkKinds().join())), 'chair,trophy,breakthrough,red,redCleared', 'a mark is one of five kinds');
  const s = KP.newGame('rec-new', null, {});
  t.eq(js(s.annals), '[]', 'a new career opens with an empty record, there from week one');
  s.week = 12;
  const first = say(() => KP.fileMark(s, 'red'));
  t.eq(js(first), '{"week":12,"kind":"red"}', 'a mark is the week and the kind');
  s.week = 13;
  const second = say(() => KP.fileMark(s, 'chair', { name: 'A', after: 'B', years: 5 }));
  t.eq(js(s.annals), '[{"week":12,"kind":"red"},{"week":13,"kind":"chair","name":"A","after":"B","years":5}]', 'with what it is about, kept in the order written');
  t.ok(second === s.annals[1], 'the rail gets back the mark it wrote');
  t.ok(String(say(() => KP.fileMark(s, 'gossip'))).startsWith('threw: tenure: fileMark of unknown kind "gossip"') && marks(s).length === 2, 'a mark of no known kind is refused, loudly, and nothing is written');
  const bare = { week: 5 };
  t.ok(marks(bare).length === 0 && !('annals' in bare), 'reading a record that is not there reads nothing and makes nothing');
  say(() => KP.fileMark(bare, 'red'));
  t.eq(js(bare.annals), '[{"week":5,"kind":"red"}]', 'and the first mark opens it');
  const back = say(() => KP.deserialize(KP.serialize(s)));
  t.eq(js(back && back.annals), js(s.annals), 'the record survives a save and a load');
  const twin = KP.newGame('rec-new', null, {});
  t.eq(Object.keys(twin).join(), Object.keys(say(() => KP.ensureLedgers(JSON.parse(KP.serialize(twin))))).join(), 'and making sure of the ledgers moves nothing on a state that has them');
  const none = JSON.parse(KP.serialize(twin)); delete none.annals;
  say(() => KP.ensureLedgers(none));
  t.eq(js(none.annals), '[]', 'a state without the record is given an empty one');
  const kept = JSON.parse(KP.serialize(s));
  say(() => KP.ensureLedgers(kept));
  t.eq(js(kept.annals), js(s.annals), 'and a record that is there is kept');
}

// ---- B. each rail writes its mark ------------------------------------------------
{
  // the chair: every succession, not only the last
  const s = world('rec-chair', 100);
  const first = s.executive.name;
  t.eq([inds(run('timeShare', s)), marks(s).length, s.executive.name].join('|'), '|0|' + first, 'a chair in the middle of her era stays in it, and nothing is written');
  s.week = 400;
  const letters = run('timeShare', s);
  const second = s.executive.name;
  t.ok(second !== first && /execFarewell/.test(inds(letters)) && /newChair/.test(inds(letters)), 'the fixture: at the end of her era the chair changes, with both letters');
  t.eq(js(marks(s)), js([{ week: 400, kind: 'chair', name: second, after: first, years: Math.round(399 / YEAR) }]), 'the succession writes who sat down, after whom, and how long the chair had been held');
  s.week = 400 + 340;
  run('timeShare', s);
  t.eq(of(s, 'chair').length, 1, 'while the new chair’s first meeting waits on the Desk there is no next succession to write');
  (s.scenes || []).slice().forEach(sc => say(() => KP.resolveScene(s, sc.id, KP.sceneDef(sc.kind).options(s, sc)[0].id)));
  run('timeShare', s);
  const third = s.executive.name;
  t.eq(js(of(s, 'chair').slice(1)), js([{ week: 740, kind: 'chair', name: third, after: second, years: Math.round(340 / YEAR) }]), 'the next succession writes its own mark, and the years are that chair’s own');
  t.eq(rows(s, 'chair').join(' / '), '400 ' + second + ' took the chair. ' + first + ' had held it ' + Math.round(399 / YEAR) + ' years. / 740 ' + third + ' took the chair. ' + second + ' had held it ' + Math.round(340 / YEAR) + ' years.',
    'and the file tells each chair, not only the last');
  // a founder's own chair has no succession
  const f = world('rec-chair-founded', 400);
  f.founded = { week: 1 };
  run('timeShare', f);
  t.eq(of(f, 'chair').length, 0, 'a founded label has no succession, and no chair is written');
}
{
  // the night of this desk's first trophy
  const s = world('rec-night', 20);
  const g = act(s), was = s.firstShowWinWeek;
  const shelf = () => { const r = g.releases[g.releases.length - 1]; return (r && r.trophies) || 0; };
  const onShelf = shelf();
  t.eq([win(s, g), js(marks(s))].join(' '), '1 ' + js([{ week: 20, kind: 'trophy', groupId: g.id, name: g.name, show: 'Pop Wave', title: lastTitle(g) }]),
    'the first trophy since the desk began writes the night: the act, the stage, and the record it was promoting');
  t.eq(shelf(), onShelf + 1, 'and the record keeps the trophy on its own shelf, as it did');
  t.eq(s.firstShowWinWeek, was, 'the company’s own first, from before this desk, stays where it was');
  t.eq(rows(s, 'trophy').join(' / '), was + ' before The first music-show trophy in the company’s history. / 20 ' + g.name + ' won Pop Wave with “' + lastTitle(g) + '”: the first under this desk.',
    'and the file has both: the company’s first, and this desk’s on the night it was won');
  s.week = 21;
  t.eq([win(s, g), of(s, 'trophy').length].join(' '), '1 1', 'the next trophy is not the first');
  const b = debut(lineup(s, 'g-b', 'BRAVO'), 22);
  s.week = 23;
  t.eq([win(s, b), of(s, 'trophy').length].join(' '), '1 1', 'and neither is another act’s first');
  // two stages in one night are one night
  const two = world('rec-night-two', 20);
  t.eq([win(two, act(two), ['popWave', 'primeStage']), of(two, 'trophy').length].join(' '), '2 1', 'two stages won the same week are one night');
  // an act with no record out
  const bareAct = world('rec-night-bare', 20);
  act(bareAct).releases = [];
  t.eq([win(bareAct, act(bareAct)), js(of(bareAct, 'trophy').map(m => m.title))].join(' '), '1 [null]', 'an act with no record on file wins without one');
  t.eq(rows(bareAct, 'trophy')[1], '20 ' + act(bareAct).name + ' won Pop Wave: the first under this desk.', 'and the file says so without one');
  // "since the desk began": a win the week it began is this desk's; the week before is not
  const late = world('rec-night-late', 40);
  late.chapterSince = 30;
  act(late).lastShowWinWeek = 29;
  t.eq([win(late, act(late)), of(late, 'trophy').length].join(' '), '1 1', 'a win from the week before the desk began is not this desk’s, so the next one is its first');
  const same = world('rec-night-same', 40);
  same.chapterSince = 30;
  act(same).lastShowWinWeek = 30;
  t.eq([win(same, act(same)), of(same, 'trophy').length].join(' '), '1 0', 'a win the week the desk began was this desk’s, so the next one is not');
  // a house with no trophy on its wall: this desk's first is the company's, said once
  const bareWall = world('rec-night-wall', 20);
  bareWall.firstShowWinWeek = 0; act(bareWall).trophies = {};
  t.eq([win(bareWall, act(bareWall)), bareWall.firstShowWinWeek, rows(bareWall, 'trophy').join(' / ')].join(' | '),
    '1 | 20 | 20 ' + act(bareWall).name + ' won Pop Wave with “' + lastTitle(act(bareWall)) + '”: the first music-show trophy in the company’s history.',
    'at a house with no trophy before, this desk’s first is the company’s, and the file says it once');
}
{
  // the breakthrough
  const F = KP.C.FAME;
  const s = world('rec-break', 50);
  const g = act(s);
  t.eq([say(() => KP.recordBreakthrough(s, g, F.breakMin - 1, 0.1, 'Quiet')), say(() => KP.recordBreakthrough(s, g, 90, F.breakBelow, 'Known')), marks(s).length].join('|'), '||0',
    'a landing not loud enough, or a label already known, is no breakthrough, and nothing is written');
  const note = say(() => KP.recordBreakthrough(s, g, F.breakMin, F.breakBelow - 0.01, 'Loud One'));
  t.eq([note && note.ind, js(marks(s))].join(' '), 'breakthrough ' + js([{ week: 50, kind: 'breakthrough', groupId: g.id, name: g.name, title: 'Loud One' }]), 'the breakthrough writes the act and the record');
  s.week = 60;
  const b = debut(lineup(s, 'g-b', 'BRAVO'), 55);
  say(() => KP.recordBreakthrough(s, b, 90, 0.1, 'Louder'));
  t.eq([of(s, 'breakthrough').length, s.fameLedger.breaks, b.eraBreakthrough].join(' '), '1 2 60', 'a second one moves the wall again, and the company’s breakthrough is still the first');
  const n = world('rec-break-untitled', 50);
  say(() => KP.recordBreakthrough(n, act(n), 90, 0.1));
  t.eq(js(of(n, 'breakthrough').map(m => m.title)), '[null]', 'with no title given, none is written');
  // the landing itself passes the record's title: a real debut at a label nobody knows
  const d = KP.newGame('rec-break-real', null, { legacy: false, door: 'fresh' });
  const ids = d.roster.slice(0, 5);
  say(() => KP.proposeGroup(d, 'BREAKLINE', ids, KP.roleHints(d, ids.map(i => d.people[i]))));
  const dg = d.groups[0] || { demos: [] };
  dg.demos = say(() => KP.generateDemos(d, KP.rngFor(d)));
  const demo = (Array.isArray(dg.demos) && dg.demos[0]) || { id: 'none', title: 'no demo' };
  const heard = [];
  const real = KP.recordBreakthrough;
  KP.recordBreakthrough = function () { heard.push([].slice.call(arguments, 4)); return real.apply(this, arguments); };
  say(() => KP.planDebut(d, { groupId: dg.id, songId: demo.id, promo: 'modest', week: d.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 }, rollout: [[], [], [], []] }));
  for (let i = 0; i < 12 && !dg.debuted; i++) if (typeof say(() => KP.advanceWeek(d)) === 'string') break;
  KP.recordBreakthrough = real;
  t.eq(js(heard), js([[demo.title]]), 'the landing hands the breakthrough the title of the record that landed');
}
{
  // the red weeks: a short week is not history; the meeting the staff held without us is
  const s = world('rec-red', 30);
  s.budget = 0;
  Object.assign(KP.redOf(s), { weeks: 0, rung: 0, arrears: 50 });
  t.eq([inds(run('red', s)), marks(s).length].join(' '), 'redMemo 0', 'the accountant’s memo is a letter, and not a mark');
  Object.assign(KP.redOf(s), { weeks: RED.meetingAt - 1, rung: 1, arrears: 50 });
  s.week = 33;
  t.eq([inds(run('red', s)), js(marks(s))].join(' '), 'redMeeting [{"week":33,"kind":"red"}]', 'the staff meeting writes the red weeks');
  Object.assign(KP.redOf(s), { weeks: RED.creditorsAt - 1, rung: 2, arrears: 50 });
  s.week = 37;
  t.eq([inds(run('red', s)), marks(s).length].join(' '), 'redCreditors 1', 'going deeper is the same episode, and writes nothing more');
  // a clean week that does not reach zero clears nothing
  Object.assign(KP.redOf(s), { weeks: 3, rung: 3, arrears: 0, shortWeek: 0 });
  s.week = 38; s.budget = 100;
  t.eq([inds(run('red', s)), marks(s).length, KP.redOf(s).rung].join(' '), ' 1 3', 'a clean week short of zero clears nothing');
  // cleared, and how far it had gone
  [2, 3, 4].forEach(rung => {
    const c = world('rec-red-clear-' + rung, 40);
    c.budget = 100;
    Object.assign(KP.redOf(c), { weeks: 1, rung, arrears: 0, shortWeek: 0 });
    t.eq([inds(run('red', c)), js(marks(c)), KP.redOf(c).rung].join(' '), 'redCleared [{"week":40,"kind":"redCleared","rung":' + rung + '}] 0', 'the clearing writes how far the red weeks had gone (rung ' + rung + ')');
  });
  const memoOnly = world('rec-red-memo', 40);
  memoOnly.budget = 100;
  Object.assign(KP.redOf(memoOnly), { weeks: 1, rung: 1, arrears: 0, shortWeek: 0 });
  t.eq([inds(run('red', memoOnly)), marks(memoOnly).length].join(' '), 'redCleared 0', 'an episode that never reached the meeting clears with its letter and no mark');
}

// ---- C. the file reads the record ---------------------------------------------------
{
  const s = world('rec-read', 150);
  const was = s.firstShowWinWeek;
  s.annals = [
    { week: 40, kind: 'red' },
    { week: 44, kind: 'redCleared', rung: 2 },
    { week: 50, kind: 'breakthrough', groupId: 'g-a', name: 'ALPHA', title: 'Loud One' },
    { week: 60, kind: 'chair', name: 'CEO New', after: 'CEO Old', years: 6 },
    { week: 70, kind: 'red' },
    { week: 82, kind: 'redCleared', rung: 3 },
    { week: 90, kind: 'red' },
    { week: 99, kind: 'redCleared', rung: 4 },
    { week: 110, kind: 'chair', name: 'CEO Newer' },
    { week: 120, kind: 'trophy', groupId: 'g-a', name: 'ALPHA', show: 'Prime Stage', title: 'Winner' },
  ];
  const snap = KP.serialize(s);
  const f = file(s);
  t.eq(f.chapters.filter(c => c.week >= 40).map(c => c.week + ' ' + c.kind + ' ' + c.text).join('\n'), [
    '40 red The red weeks. The company fell far enough behind on what it owed that the staff held a meeting nobody called.',
    '44 redCleared The arrears cleared. The red weeks had gone as far as the staff meeting.',
    '50 breakthrough The breakthrough: “Loud One” by ALPHA charted from a label nobody had heard of.',
    '60 chair CEO New took the chair. CEO Old had held it 6 years.',
    '70 red The red weeks. The company fell far enough behind on what it owed that the staff held a meeting nobody called.',
    '82 redCleared The arrears cleared. The red weeks had gone as far as the creditors’ letters.',
    '90 red The red weeks. The company fell far enough behind on what it owed that the staff held a meeting nobody called.',
    '99 redCleared The arrears cleared. The red weeks had gone as far as the final notice.',
    '110 chair CEO Newer took the chair.',
    '120 trophy ALPHA won Prime Stage with “Winner”: the first under this desk.',
  ].join('\n'), 'each mark is a chapter, in its own words');
  t.ok(KP.serialize(s) === snap, 'reading the record writes nothing');
  t.ok(f.chapters.filter(c => c.week >= 40).every(c => c.before === false), 'and a mark is on this desk’s side of the file');
  t.eq(rows(s, 'trophy')[0], was + ' before The first music-show trophy in the company’s history.', 'the company’s first, from before this desk, is still told by its marker');
  // a breakthrough with no title on it; a trophy an old file dated by its record
  s.annals = [{ week: 50, kind: 'breakthrough', groupId: 'g-a', name: 'ALPHA', title: null },
    { week: 120, kind: 'trophy', groupId: 'g-a', name: 'ALPHA', title: 'Winner', fromRecord: true }];
  t.eq(rows(s).filter(r => /^(50|120) /.test(r)).join(' / '), '50 The breakthrough: ALPHA charted from a label nobody had heard of. / 120 “Winner” by ALPHA came out, and won a music-show trophy: the first under this desk.',
    'a breakthrough with no title is told without one, and a trophy dated by its record says so');
  // the two firsts: the marker says when the company's was won, the mark says whose night
  s.firstShowWinWeek = 120;
  s.annals = [{ week: 120, kind: 'trophy', groupId: 'g-a', name: 'ALPHA', show: 'Pop Wave', title: 'Winner' }];
  t.eq(rows(s, 'trophy').join(' / '), '120 ALPHA won Pop Wave with “Winner”: the first music-show trophy in the company’s history.', 'when this desk’s first is the company’s, it is said once, by the mark');
  s.firstShowWinWeek = 0;
  t.eq(rows(s, 'trophy').join(' / '), '120 ALPHA won Pop Wave with “Winner”: the first music-show trophy in the company’s history.', 'a mark with no marker beside it is the company’s first too');
  s.firstShowWinWeek = 100;
  t.eq(rows(s, 'trophy').join(' / '), '100 The first music-show trophy in the company’s history. / 120 ALPHA won Pop Wave with “Winner”: the first under this desk.', 'and when the company’s came first, both are told');
}
{
  // in order within a week
  const s = world('rec-order', 150);
  act(s).releases.forEach(r => { r.chartPeak = 5; });
  const a = debut(lineup(s, 'g-a', 'ALPHA'), 30, { chartPeak: 1 });
  a.recoup = { debt: 0, paid: 10, settledWeek: 30 }; a.retiredWeek = 30;
  a.honors = [{ year: 1, category: 'rookie' }];
  s.firstShowWinWeek = 30;
  s.annals = ['redCleared', 'red', 'trophy', 'breakthrough', 'chair'].map(kind => ({ week: 30, kind, name: 'ALPHA', show: 'Pop Wave', title: 'First ALPHA', rung: 2 }));
  t.eq(file(s).chapters.filter(c => c.week === 30).map(c => c.kind).join(), 'chair,debut,breakthrough,numberOne,trophy,settlement,red,redCleared,lastBow',
    'within a week: the chair, the debut, the breakthrough, the number one, the trophy, the settlement, the red weeks and their clearing, the last bow');
  s.annals.forEach(m => { m.week = CEREMONY; });
  t.eq(file(s).chapters.filter(c => c.week === CEREMONY).map(c => c.kind).join(), 'chair,breakthrough,trophy,award,red,redCleared', 'and an honor comes after the trophy and before the red weeks');
}

// ---- D. the record is the company's: a move closes it --------------------------------
{
  // a founding: the record stays with the old house, and so do its firsts
  const s = world('rec-found', YEAR * 3);
  const g = act(s);
  s.trust = 80;
  s.awardHistory = [{ year: 2, category: 'daesang', name: g.name, company: s.company.short, isPlayer: true }];
  s.daesangWonYear = 2;
  say(() => KP.fileMark(s, 'red'));
  say(() => KP.fileMark(s, 'chair', { name: 'CEO New', after: 'CEO Old', years: 5 }));
  const from = s.company.short, donor = JSON.parse(JSON.stringify(g));
  const r = say(() => KP.foundLabel(s, 'HOMEWARD'));
  t.ok(r && r.ok === true && s.company.name === 'HOMEWARD', 'the fixture: the founding goes through');
  t.eq(js(s.annals), '[]', 'a founding closes the record: it was the old house’s');
  t.eq([s.firstShowWinWeek, s.daesangWonYear].join('|'), '0|', 'and the old house keeps its first trophy and its first daesang');
  t.eq(rows(s).join(' / '), s.founded.week + ' HOMEWARD opened its doors, out of ' + from + '.', 'so the new label’s file opens with its doors and nothing else');
  // the new label's first trophy is a first
  const n = debut(lineup(s, 'g-n', 'NEWLINE', donor), s.week + 2);
  s.week += 4;
  const trust = s.trust;
  const notes = (() => { onStage(s, n, ['popWave']); const out = air(s); return Array.isArray(out) ? out : []; })();
  t.ok(cups(n) === 1, 'the fixture: the new label’s act wins a stage');
  t.ok(notes.some(x => x.ind === 'showWin' && /FIRST music-show win in company history/.test(x.text)) && s.firstShowWinWeek === s.week && s.trust === Math.min(100, trust + KP.C.SHOWWIN.firstWinTrust),
    'a founded label’s first trophy is its first: the letter says so, the week is kept, and the boardroom hears of it');
  t.eq(rows(s, 'trophy').join(' / '), s.week + ' NEWLINE won Pop Wave with “First NEWLINE”: the first music-show trophy in the company’s history.', 'and the file tells it as the company’s first');
}
{
  // a last statement, and the second chance after it
  const s = world('rec-fold', 60);
  say(() => KP.fileMark(s, 'red'));
  say(() => KP.fileMark(s, 'trophy', { groupId: act(s).id, name: act(s).name, show: 'Pop Wave', title: 'Old' }));
  const dead = s.company.name;
  say(() => KP.dissolveLabel(s, 'read'));
  t.ok(KP.chapterPending(s) && js(s.annals) === '[]', 'the last statement closes the record with the label');
  const r = say(() => KP.nextChapter(s, 'salaried'));
  const g = act(s);
  t.ok(r && r.ok === true && g.debuted === true, 'the fixture: the salaried door opens on a label with an act');
  t.eq(js(s.annals), '[]', 'the next label’s record opens empty');
  s.week += 5;
  t.eq([win(s, g), js(of(s, 'trophy'))].join(' '), '1 ' + js([{ week: s.week, kind: 'trophy', groupId: g.id, name: g.name, show: 'Pop Wave', title: lastTitle(g) }]), 'and its first trophy under this desk is written there');
  t.eq(rows(s).filter(x => !/ before /.test(x)).join(' / '), '60 ' + dead + ' was dissolved. / 60 You took the A&R desk at ' + s.company.name + '. / 65 ' + g.name + ' won Pop Wave with “' + lastTitle(g) + '”: the first under this desk.',
    'the file of the second chance: the fold, the desk, the night');
}

// ---- E. an old file ----------------------------------------------------------------------
{
  // the marks its markers can still prove
  const s = world('rec-old', 150);
  const a = debut(lineup(s, 'g-a', 'ALPHA'), 30);
  const b = debut(lineup(s, 'g-b', 'BRAVO'), 35);
  delete s.annals;
  t.eq(js(fill(s)), '[]', 'an old file with nothing to prove gets an empty record');
  t.ok(Array.isArray(s.annals), 'which is on the state from then on');
  // the chair of the day
  s.executive.since = 60;
  t.eq(js(fill(s)), js([{ week: 60, kind: 'chair', name: s.executive.name }]), 'a chair who sat down after the desk did is on it, with nobody named before her');
  t.ok(marks(s).length === 1 && marks(s)[0].week === 60, 'and what the backfill returns is what the state keeps');
  s.executive.since = 1;
  t.eq(js(fill(s)), '[]', 'the chair who was there when the desk began is not');
  s.executive.since = 60; s.founded = { week: 20 };
  t.eq(js(fill(s)), '[]', 'and a founded label has no chair to tell');
  delete s.founded;
  s.executive.since = 1;
  // the breakthrough: the earliest the acts still carry, with the record of that week
  a.eraBreakthrough = 50; b.eraBreakthrough = 40;
  b.releases.push({ week: 40, songTitle: 'Loud One', chartPeak: 4 });
  t.eq(js(fill(s)), js([{ week: 40, kind: 'breakthrough', groupId: 'g-b', name: 'BRAVO', title: 'Loud One' }]), 'the breakthrough is the earliest one an act still carries, with the record of its week');
  b.releases.pop();
  t.eq(js(fill(s).map(m => m.title)), '[null]', 'or with none, when the file has no record of that week');
  const shelf = b.releases; delete b.releases;
  t.eq(js(fill(s).map(m => m.week + ' ' + m.kind + ' ' + m.title)), '["40 breakthrough null"]', 'and an act with no shelf at all does not stop the load');
  b.releases = shelf;
  a.eraBreakthrough = 40;
  t.eq((fill(s)[0] || {}).groupId, 'g-a', 'of two the same week, the same one every time');
  s.chapterSince = 45; a.eraBreakthrough = 50;
  t.eq(js(fill(s).map(m => m.week + m.name)), '["50ALPHA"]', 'one from before this desk is not this desk’s');
  delete s.chapterSince; delete a.eraBreakthrough; delete b.eraBreakthrough;
  // this desk's first trophy, as the file dated it until now: by the record that won it
  act(s).releases[0].trophies = 3;   // the inherited act's wall, from before the desk
  a.releases.push({ week: 50, songTitle: 'Winner', chartPeak: 3, trophies: 2 }, { week: 60, songTitle: 'Again', chartPeak: 3, trophies: 1 });
  t.eq(js(fill(s)), js([{ week: 50, kind: 'trophy', groupId: 'g-a', name: 'ALPHA', title: 'Winner', fromRecord: true }]), 'this desk’s first trophy is dated by the first record since the desk began that won one');
  t.eq(rows(s, 'trophy')[1], '50 “Winner” by ALPHA came out, and won a music-show trophy: the first under this desk.', 'and the file says of it what it said before');
  a.releases[1].trophies = 0;
  t.eq(js(fill(s).map(m => m.week)), '[60]', 'a record with no trophy is not it');
  s.firstShowWinWeek = 55;
  t.eq(js(fill(s)), '[]', 'when the company’s first was under this desk the marker tells it, and no mark is needed');
  s.firstShowWinWeek = -180;
  // in order of the weeks
  s.executive.since = 70; a.eraBreakthrough = 65;
  t.eq(js(fill(s).map(m => m.week + ' ' + m.kind)), '["60 trophy","65 breakthrough","70 chair"]', 'the record it gets is in order of the weeks');
}
{
  // through the real load: the file of an old save is what it was
  const s = world('rec-migrate', 150);
  const a = debut(lineup(s, 'g-a', 'ALPHA'), 30);
  a.releases.push({ week: 50, songTitle: 'Winner', chartPeak: 3, trophies: 2 });
  a.lastShowWinWeek = 52;
  s.executive.since = 60;
  const old = JSON.parse(KP.serialize(s));
  old.version = '0.11.29'; delete old.annals;
  const back = say(() => KP.deserialize(JSON.stringify(old)));
  const ok = back && typeof back === 'object';
  t.eq(ok ? [js(back.annals), back.version].join(' ') : String(back), js([{ week: 50, kind: 'trophy', groupId: 'g-a', name: 'ALPHA', title: 'Winner', fromRecord: true }, { week: 60, kind: 'chair', name: s.executive.name }]) + ' ' + KP.C.VERSION,
    'an old save opens at this version with the marks its markers prove');
  const mine = ok ? rows(back).filter(r => !/ before /.test(r)) : [];
  t.eq(mine.join(' / '), ['1 You took the A&R desk at ' + s.company.name + '.', '30 ALPHA debuted with “First ALPHA”.', '50 “Winner” by ALPHA came out, and won a music-show trophy: the first under this desk.', '60 ' + s.executive.name + ' took the chair.'].join(' / '),
    'and its file reads word for word as it did');
  // the desk had already won: the next trophy is not written as its first
  if (ok) { back.week = 151; const g = KP.groups(back).find(x => x.id === 'g-a') || act(back); g.members = act(back).members.slice(); t.eq([win(back, g), of(back, 'trophy').length, of(back, 'trophy')[0] && of(back, 'trophy')[0].week].join(' '), '1 1 50', 'a desk that had already won gets no second first'); }
  else t.ok(false, 'a desk that had already won gets no second first (the old save did not load)');
  // a save of this version is not read again
  const now = say(() => KP.deserialize(KP.serialize(Object.assign(JSON.parse(KP.serialize(s)), { annals: [{ week: 44, kind: 'red' }] }))));
  t.eq(js(now && now.annals), '[{"week":44,"kind":"red"}]', 'a save of this version keeps the record it has');
}
{
  // a label founded before this version: the old house's firsts are given back
  const s = world('rec-founded-old', 300);
  s.founded = { week: 200, from: 'HCG' };
  const donor = act(s);
  s.groups = [];
  const n = debut(lineup(s, 'g-n', 'NEWLINE', donor), 210);
  s.firstShowWinWeek = -180; s.daesangWonYear = 2;
  say(() => KP.fileFoundedFirsts(s));
  t.eq([s.firstShowWinWeek, s.daesangWonYear].join('|'), '0|', 'a founded label with no trophy and no daesang of its own keeps neither of the old house’s');
  s.firstShowWinWeek = -180; s.daesangWonYear = 2;
  n.releases.push({ week: 230, songTitle: 'Winner', chartPeak: 2, trophies: 1 }, { week: 250, songTitle: 'Again', chartPeak: 2, trophies: 2 });
  n.honors = [{ year: 7, category: 'daesang' }, { year: 6, category: 'daesang' }, { year: 5, category: 'song' }];
  say(() => KP.fileFoundedFirsts(s));
  t.eq([s.firstShowWinWeek, s.daesangWonYear].join('|'), '230|6', 'one that has won since is given its own: the trophy by the record that won it, the daesang by its first');
  // what is already the label's own is left alone
  s.firstShowWinWeek = 240; s.daesangWonYear = 7;
  say(() => KP.fileFoundedFirsts(s));
  t.eq([s.firstShowWinWeek, s.daesangWonYear].join('|'), '240|7', 'firsts from after the founding are the label’s own, and are left alone');
  // the daesang's edge: the ceremony the week the label opened is the label's
  s.daesangWonYear = 5; s.founded.week = (5 - 1) * YEAR + CEREMONY;
  say(() => KP.fileFoundedFirsts(s));
  t.eq(s.daesangWonYear, 5, 'a daesang given the week the label opened is the label’s');
  s.founded.week = (5 - 1) * YEAR + CEREMONY + 1;
  say(() => KP.fileFoundedFirsts(s));
  t.eq(s.daesangWonYear, 6, 'and one given the week before is not');
  // a house that was never founded is left alone
  const h = world('rec-founded-not', 300);
  h.daesangWonYear = 2;
  say(() => KP.fileFoundedFirsts(h));
  t.eq([h.firstShowWinWeek, h.daesangWonYear].join('|'), '-180|2', 'a house nobody founded keeps its firsts');
  // through the real load
  const f = world('rec-founded-load', 300);
  f.founded = { week: 200, from: 'HCG' }; f.groups = []; f.daesangWonYear = 2;
  const old = JSON.parse(KP.serialize(f));
  old.version = '0.11.29'; delete old.annals;
  const back = say(() => KP.deserialize(JSON.stringify(old)));
  t.eq(back && typeof back === 'object' ? [back.firstShowWinWeek, back.daesangWonYear, rows(back).join(' / ')].join('|') : String(back), '0||200 ' + f.company.name + ' opened its doors, out of HCG.',
    'an old save of a founded label opens with the old house’s firsts gone from its file');
  // and one that has won since: its first is its own, told once by the marker
  const w = world('rec-founded-won', 300);
  const from = act(w);
  w.founded = { week: 200, from: 'HCG' }; w.groups = [];
  debut(lineup(w, 'g-n', 'NEWLINE', from), 210).releases.push({ week: 230, songTitle: 'Winner', chartPeak: 2, trophies: 1 });
  const oldW = JSON.parse(KP.serialize(w));
  oldW.version = '0.11.29'; delete oldW.annals;
  const backW = say(() => KP.deserialize(JSON.stringify(oldW)));
  t.eq(backW && typeof backW === 'object' ? [backW.firstShowWinWeek, js(backW.annals), rows(backW, 'trophy').join(' / ')].join('|') : String(backW), '230|[]|230 The first music-show trophy in the company’s history.',
    'an old save of a founded label that has won since tells its own first, once');
}

// ---- F. the state's own check ------------------------------------------------------------
{
  const s = world('rec-valid', 100);
  const about = () => { const v = say(() => KP.validateState(s)); return Array.isArray(v) ? v.filter(x => /written record/.test(x)).join(' / ') : String(v); };
  s.annals = [{ week: 40, kind: 'red' }, { week: 100, kind: 'chair', name: 'A' }, { week: 1, kind: 'trophy', name: 'B' }];
  t.eq(about(), '', 'a sound record raises nothing, at this desk’s first week and at today');
  const held = s.annals; delete s.annals;
  t.eq(about(), '', 'and a state with no record at all raises nothing');
  s.annals = held;
  s.annals = [{ week: 40, kind: 'gossip' }];
  t.eq(about(), 'malformed mark on the written record "gossip"', 'a mark of no known kind is named');
  s.annals = [{ week: NaN, kind: 'red' }];
  t.eq(about(), 'malformed mark on the written record "red"', 'and so is one with no week');
  s.annals = [null];
  t.eq(about(), 'malformed mark on the written record null', 'and one that is nothing at all');
  s.annals = [{ week: 101, kind: 'red' }];
  t.eq(about(), 'a red mark on the written record is dated outside this desk’s weeks (101)', 'a mark dated after today is named');
  s.chapterSince = 50; s.annals = [{ week: 49, kind: 'chair', name: 'A' }];
  t.eq(about(), 'a chair mark on the written record is dated outside this desk’s weeks (49)', 'and one from before this desk began');
}

// ---- G. the Desk ------------------------------------------------------------------------------
{
  const D = dom.load();
  const { App, el } = D;
  const esc = D.UI.esc;
  const draw = () => { const r = say(() => App.render()); return typeof r === 'string' ? r : el('screen').innerHTML; };
  const s = world('rec-ui', 150);
  const n = file(s).chapters.length;
  s.annals = [{ week: 40, kind: 'red' }, { week: 44, kind: 'redCleared', rung: 2 }, { week: 120, kind: 'trophy', groupId: act(s).id, name: act(s).name, show: 'Pop Wave', title: 'Winner' }];
  App.state = s; App.mode = 'game'; App.tab = 'desk'; App.view = null; App.stack = []; App.deskSub = 'record';
  let html = draw();
  t.ok(html.includes(' · ' + (n + 3) + ' chapters on the file'), 'the row on the record counts the marks among the chapters');
  say(() => D.click({ action: 'open-company' }));
  html = draw();
  const at = text => html.indexOf('<div>' + esc(text) + '</div>');
  const iMine = html.indexOf('<div class="kicker">Under this desk</div>'), iPast = html.indexOf('<div class="kicker">Before this desk</div>');
  t.ok(html.includes('<span class="m-tag">' + esc(KP.weekLabel(40).text) + '</span><div>The red weeks. The company fell far enough behind on what it owed that the staff held a meeting nobody called.</div>'), 'the company’s page carries the red weeks, with their date');
  t.ok(at('The arrears cleared. The red weeks had gone as far as the staff meeting.') > iMine && at(act(s).name + ' won Pop Wave with “Winner”: the first under this desk.') > iMine && at(act(s).name + ' won Pop Wave with “Winner”: the first under this desk.') < iPast, 'and the marks are under this desk');
  t.ok(at(act(s).name + ' won Pop Wave with “Winner”: the first under this desk.') < at('The arrears cleared. The red weeks had gone as far as the staff meeting.') && at('The arrears cleared. The red weeks had gone as far as the staff meeting.') < at('The red weeks. The company fell far enough behind on what it owed that the staff held a meeting nobody called.'), 'the newest first');
}

// ---- H. real weeks, and the tools -----------------------------------------------------------
{
  // a desk with no money: the red weeks go on the record through the real weeks, and the last statement closes it
  const s = KP.newGame('rec-weeks-red', null, {});
  s.budget = 0;
  const bad = [];
  let met = 0, folded = 0;
  for (let i = 0; i < 60 && !folded; i++) {
    const a = say(() => { (s.scenes || []).slice().forEach(sc => { const d = KP.sceneDef(sc.kind); if (d) KP.resolveScene(s, sc.id, d.options(s, sc)[0].id); }); return KP.advanceWeek(s); });
    if (typeof a === 'string') { bad.push('week ' + s.week + ' ' + a); break; }
    const v = say(() => KP.validateState(s));
    if (!Array.isArray(v) || v.some(x => /written record/.test(x))) bad.push('week ' + s.week + ' ' + String(v));
    const f = file(s);
    if (f.threw) { bad.push('week ' + s.week + ' ' + f.threw); break; }
    if (!marks(s).every(m => f.chapters.some(c => c.week === m.week && c.kind === m.kind))) bad.push('week ' + s.week + ' a mark is not a chapter');
    if (!marks(s).every((m, j) => j === 0 || m.week >= marks(s)[j - 1].week)) bad.push('week ' + s.week + ' the record is out of order');
    if (of(s, 'red').length && !met) met = s.week;
    if (KP.chapterPending(s)) folded = s.week;
  }
  t.ok(bad.length === 0, 'real weeks with an empty till: the record is sound every week, and every mark is a chapter (' + (bad[0] || 'clean') + ')');
  t.ok(met > 0 && folded > met, 'the staff meeting went on the record through the real week (week ' + met + '), before the last statement (week ' + folded + ')');
  t.eq(js(s.annals), '[]', 'and the last statement closed the record');
}
{
  // a desk with money: sixty real weeks, and reading changes nothing
  const s = KP.newGame('rec-weeks', null, {});
  s.budget = 1e6;
  const bad = [];
  for (let i = 0; i < 60; i++) {
    const a = say(() => { (s.scenes || []).slice().forEach(sc => { const d = KP.sceneDef(sc.kind); if (d) KP.resolveScene(s, sc.id, d.options(s, sc)[0].id); }); return KP.advanceWeek(s); });
    if (typeof a === 'string') { bad.push('week ' + s.week + ' ' + a); break; }
    const before = KP.serialize(s);
    const f = file(s);
    if (f.threw) { bad.push('week ' + s.week + ' ' + f.threw); break; }
    if (KP.serialize(s) !== before) bad.push('week ' + s.week + ' reading the file changed the save');
    const v = say(() => KP.validateState(s));
    if (!Array.isArray(v) || v.some(x => /written record/.test(x))) bad.push('week ' + s.week + ' ' + String(v));
  }
  t.ok(bad.length === 0, 'sixty real weeks with a full till: the record is sound and reading the file changes nothing (' + (bad[0] || 'clean') + ')');
  const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const h = read('tools/harness.js'), l = read('tools/audit_longhaul.js');
  t.ok(h.includes("console.log('the written record: marks ") && h.includes('recordNight:') && h.includes('recordRed:') && h.includes('tally.recordNight++') && h.includes('tally.recordRed++'), 'the census prints the record’s line and holds two bands on it');
  t.ok(['a mark on the written record is of no known kind, or dated outside this desk’s weeks', 'the written record is out of order', 'a first is on the written record twice', 'the red weeks on the written record do not pair up',
    'this desk has won a trophy and the written record has no night for it', ' chairs on the written record', 'a mark on the written record is not a chapter of the company’s file'].every(x => h.includes(x)), 'and guards it seven ways');
  t.ok(l.includes("' | record: '") && ['a mark on the written record is of no known kind, or dated outside this desk’s weeks', 'a first is on the written record twice', 'the red weeks on the written record do not pair up',
    'this desk has won a trophy and the written record has no night for it', 'a mark on the written record is not a chapter of the company’s file'].every(x => l.includes(x)), 'the long haul carries it on each scenario’s line, with its flags');
}

t.finish();
