/* Suite 144 — the greenlights on the record (v0.11.37, §129: the people
   upstairs and down the hall, part seven). What the chair gave this desk
   and what came of it, in words. A greenlight carries the name of the chair
   who gave it. The record is read off the greenlights themselves. And a
   greenlight is the house's that gave it: when the desk moves to another
   house, one still open is set aside, unjudged.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   row fails by name; nothing here can crash or hang under a broken
   engine. */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const KP = loadEngine();
const t = makeT('suite_144_greenlights');
const YEAR = KP.C.WEEKS_PER_YEAR;

// ---- the kit ------------------------------------------------------------------
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const js = x => JSON.stringify(x);
const obj = x => (x && typeof x === 'object' ? x : { threw: String(x), id: String(x) });
const act = s => KP.groups(s)[0] || { name: 'no act', id: 'none', releases: [], members: [] };
// a salaried desk's world in a given week. Its founding directive is settled, so nothing else is open upstairs
const desk = (seed, week) => { const s = KP.newGame(seed, null, {}); s.week = week; s.objective.status = 'met'; return s; };
// a greenlight given in a given week, through the engine's own hand
const give = (s, week, o) => { const now = s.week; s.week = week; const m = obj(say(() => KP.openMandate(s, o || {}))); s.week = now; return m; };
// the record, or one row that says what went wrong
const lights = s => { const r = say(() => KP.greenlights(s)); return Array.isArray(r) ? r : [{ id: String(r), who: String(r), gave: String(r), came: String(r), status: String(r) }]; };
const ids = s => lights(s).map(e => e.id).join(',');
const row = (s, id) => lights(s).filter(e => e.id === id)[0] || { id: 'not on the record', who: 'not on the record', gave: 'not on the record', came: 'not on the record', status: 'not on the record' };
const byId = (s, id) => (s.mandates || []).filter(m => m.id === id)[0] || { status: 'not on file' };
const phase = name => KP.weeklyPipeline([]).filter(p => p.name === name)[0] || { fn: () => { throw new Error('no phase ' + name); } };
const upstairs = s => { const inbox = []; const r = say(() => phase('mandates').fn(s, KP.rngFor(s), inbox, s.roster, KP.groups(s))); return typeof r === 'string' ? [{ text: r }] : inbox; };
const complaints = s => { const r = say(() => KP.validateState(s)); return (Array.isArray(r) ? r : [String(r)]).filter(e => /greenlight|threw/.test(e)); };
// a house the desk can be walked out of: the founding's gates, forced
const founder = (seed, week) => { const s = desk(seed, week); s.trust = 80; s.awardHistory = [{ year: 2, category: 'daesang', name: act(s).name, company: s.company.short, isPlayer: true }]; return s; };
const CHAIR = { name: 'CEO Other Chair', gender: 'f', personality: 'patient', intro: 'x', since: 1 };

// ---- A. who gave it ---------------------------------------------------------------
{
  ['greenlights', 'closeGreenlights', 'chairProven'].forEach(k => t.ok(typeof KP[k] === 'function', 'the engine carries KP.' + k));
  const s = desk('gl-stamp', 10);
  const first = s.executive.name;
  const a = give(s, 10, { kind: 'group', gender: 'f', source: 'your pitch' });
  t.eq(a.exec, first, 'a greenlight carries the name of the chair who gave it');
  s.executive = Object.assign({}, CHAIR);
  const b = give(s, 20, { kind: 'solo', source: 'your pitch' });
  t.eq([byId(s, a.id).exec, b.exec].join(' | '), first + ' | CEO Other Chair', 'under the next chair a new one carries the next name, and the first keeps the name it was given under');

  // through the real pitch
  const p = desk('gl-pitch', 30);
  p.trust = 90;
  const r = obj(say(() => KP.pitchMandate(p, { kind: 'group', gender: 'f' })));
  t.ok(r.ok === true && r.mandate && r.mandate.exec === p.executive.name && r.mandate.source === 'your pitch', 'a pitch the chair grants is a greenlight in the chair’s name (' + js(r).slice(0, 90) + ')');
  t.ok(/and signed\. A girl group is greenlit — the window runs to /.test(String((p.inbox[0] || {}).text)), 'and the note still says what was greenlit (' + String((p.inbox[0] || {}).text).slice(80, 150) + ')');
  const q = desk('gl-pitch-boys', 30);
  q.trust = 90;
  KP.freeTrainees(q).forEach(id => { q.people[id].gender = 'm'; });
  const rb = obj(say(() => KP.pitchMandate(q, { kind: 'group', gender: 'm' })));
  t.ok(rb.ok === true && /and signed\. A boy group is greenlit — /.test(String((q.inbox[0] || {}).text)), 'a boy group pitched is a boy group in the note (' + js(rb).slice(0, 60) + ')');
  const so = desk('gl-pitch-solo', 30);
  so.trust = 90;
  const rs = obj(say(() => KP.pitchMandate(so, { kind: 'solo', gender: 'f' })));
  t.ok(rs.ok === true && /and signed\. A solo act is greenlit — /.test(String((so.inbox[0] || {}).text)), 'and a solo is a solo act whoever it is for (' + js(rs).slice(0, 60) + ')');

  // through the real rail: the generation turns at an established house
  const g = desk('gl-gen', 150);
  act(g).popularity = 70;
  g.gen = { n: 4, since: 150 }; g.genGrantN = 3;
  const inbox = upstairs(g);
  const m = (g.mandates || [])[0] || {};
  t.ok(inbox.length === 1 && m.source === 'the generational directive' && m.exec === g.executive.name && m.issuedWeek === 150,
    'the directive the chair hands down when the generation turns is in the chair’s name too (' + js(m).slice(0, 120) + ')');
}

// ---- B. the record ------------------------------------------------------------------
{
  const s = desk('gl-read', 60);
  t.eq(js(say(() => KP.greenlights(s))), '[]', 'a desk that was given nothing has an empty record');
  const who = s.executive.name;
  const a = give(s, 10, { kind: 'group', gender: 'f', source: 'your pitch' });
  const b = give(s, 20, { kind: 'group', gender: 'm', source: 'the generational directive', window: 116 });
  const c = give(s, 30, { kind: 'group', gender: null, source: 'the board’s read of the room' });
  const d = give(s, 40, { kind: 'solo', gender: 'f', source: 'your pitch' });
  t.eq(ids(s), [a.id, b.id, c.id, d.id].join(','), 'the record lists what the desk was given, in the order it was given');
  t.eq(lights(s).map(e => e.week).join(','), '10,20,30,40', 'each with the week it was given');
  t.eq(lights(s).map(e => e.gave).join(' / '), ['greenlit a girl group. It came from your pitch.', 'greenlit a boy group. It came from the generational directive.',
    'greenlit a new group. It came from the board’s read of the room.', 'greenlit a solo act. It came from your pitch.'].join(' / '), 'what was greenlit and where it came from, in words');
  t.eq(lights(s).map(e => e.who).join('|'), [who, who, who, who].join('|'), 'and who gave it');
  t.eq(lights(s).map(e => e.status).join(','), 'open,open,open,open', 'none of them settled yet');
  t.eq(row(s, a.id).came, 'The window runs to Jan · Wk 2 · Y2.', 'an open one says when its window runs to: forty weeks from the week it was given');
  t.eq(row(s, b.id).came, 'The window runs to May · Wk 4 · Y3.', 'and a longer window is the one the row gives');
  const before = KP.serialize(s);
  lights(s);
  t.eq(KP.serialize(s) === before, true, 'reading the record writes nothing');

  // kept: the real debut's own line, by the act that covered it
  const k = desk('gl-kept', 60);
  const km = give(k, 30, { kind: 'group', gender: null, source: 'your pitch' });
  act(k).name = 'LUMEN <5>';
  say(() => KP.consumeMandate(k, act(k)));
  t.eq(row(k, km.id).status + ' · ' + row(k, km.id).came, 'met · LUMEN <5> debuted Mar · Wk 4 · Y2, inside the window.', 'a greenlight a debut covered reads kept: the act, and the week it debuted');
  t.eq(byId(k, km.id).groupId + ' ' + byId(k, km.id).act, act(k).id + ' LUMEN <5>', 'the debut’s own line marks the greenlight with the act and its name');
  k.groups = [];
  t.eq(row(k, km.id).came, 'LUMEN <5> debuted Mar · Wk 4 · Y2, inside the window.', 'and the row reads the same with no act on the file at all');
  delete byId(k, km.id).act;
  t.eq(row(k, km.id).came, 'An act debuted Mar · Wk 4 · Y2, inside the window.', 'a kept greenlight that does not name its act still reads');

  // left dark: the real rail, a week past the window with nothing in development
  const l = desk('gl-dark', 71);
  const lm = give(l, 30, { kind: 'group', gender: null, source: 'the board’s read of the room' });
  const trust = l.trust;
  upstairs(l);
  t.eq(row(l, lm.id).status + ' · ' + row(l, lm.id).came + ' · ' + (l.trust - trust), 'lapsed · The window closed Jun · Wk 2 · Y2 with no stage in it. · ' + KP.C.MANDATE.lapseTrust,
    'a greenlight whose window closes on an empty floor reads left dark, with the week the window closed');
  // a lineup in development buys the window four more weeks, and the row reads the window as it stands
  const e = desk('gl-grace', 71);
  const em = give(e, 30, { kind: 'group', gender: null, source: 'the board’s read of the room' });
  e.groups.push(Object.assign(JSON.parse(JSON.stringify(act(e))), { id: 'g-dev', name: 'In The Room', debuted: false, releases: [] }));
  delete e.groups[e.groups.length - 1].retiredWeek;
  upstairs(e);
  t.eq(row(e, em.id).status + ' · ' + row(e, em.id).came, 'open · The window runs to Jul · Wk 2 · Y2.', 'while a lineup is in development the window runs on, and the row says the later week');

  // a name the file cannot give
  const n = desk('gl-noname', 60);
  const nm = give(n, 30, { kind: 'solo', source: 'your pitch' });
  delete byId(n, nm.id).exec;
  t.eq(row(n, nm.id).who, 'The chair of the day', 'a greenlight with no name on it is the chair of the day’s');
}

// ---- C. this desk's, and no other's ---------------------------------------------------------------
{
  const mk = (seed, set) => {
    const s = desk(seed, 200);
    set(s);
    const a = give(s, 99, { source: 'your pitch' }), b = give(s, 100, { source: 'your pitch' }), c = give(s, 101, { source: 'your pitch' });
    return { s, a, b, c };
  };
  const f = mk('gl-wall-founded', s => { s.founded = { week: 100, from: 'HCG', warChest: 300 }; });
  t.eq(ids(f.s), [f.b.id, f.c.id].join(','), 'at a founded label the record begins the week its doors opened: what was given before is the old house’s');
  const ch = mk('gl-wall-chapter', s => { s.chapterSince = 100; });
  t.eq(ids(ch.s), [ch.b.id, ch.c.id].join(','), 'and after a second chance it begins the week of the door');
  const plain = mk('gl-wall-none', () => {});
  t.eq(ids(plain.s), [plain.a.id, plain.b.id, plain.c.id].join(','), 'a desk that has never moved lists everything it was given');
  byId(f.s, f.b.id).status = 'void';
  t.eq(ids(f.s), f.c.id, 'one set aside when the desk moved is not on the record, though its week is the desk’s first');
}

// ---- D. the wall -------------------------------------------------------------------------------------
{
  // the sweep itself
  const s = desk('gl-sweep', 60);
  const a = give(s, 10, { kind: 'group', source: 'your pitch' });
  say(() => KP.consumeMandate(s, act(s)));
  const b = give(s, 20, { kind: 'group', source: 'the board’s read of the room' });
  byId(s, b.id).status = 'lapsed';
  const c = give(s, 30, { kind: 'group', source: 'your pitch' });
  const d = give(s, 40, { kind: 'solo', source: 'your pitch' });
  s.mandateCooldownUntil = 90;
  const r = say(() => KP.closeGreenlights(s));
  t.eq([a, b, c, d].map(m => byId(s, m.id).status).join(','), 'met,lapsed,void,void', 'when the desk moves, each greenlight still open is set aside, and one kept or left dark stays as it was (' + String(r) + ')');
  t.eq(s.mandateCooldownUntil, undefined, 'and the calendar upstairs closes with the board that kept it');
  t.eq(say(() => KP.openMandates(s).length), 0, 'nothing of the old house’s is open afterwards');
  const none = desk('gl-sweep-none', 60);
  delete none.mandates;
  t.eq(String(say(() => KP.closeGreenlights(none))), 'undefined', 'a desk that was never given one moves without a word');

  // a real founding
  const f = founder('gl-found', 3 * YEAR);
  const old = f.executive.name;
  const kept = give(f, 3 * YEAR - 30, { kind: 'group', source: 'your pitch' });
  say(() => KP.consumeMandate(f, act(f)));
  const open = give(f, 3 * YEAR - 9, { kind: 'group', gender: 'f', source: 'the board’s read of the room' });
  const sameWeek = give(f, 3 * YEAR, { kind: 'solo', source: 'your pitch' });
  f.mandateCooldownUntil = 3 * YEAR + 30;
  const fr = obj(say(() => KP.foundLabel(f, 'HOMEWARD')));
  t.ok(fr.ok === true && f.founded && f.founded.week === 3 * YEAR, 'the fixture: the founding goes through (' + js(fr).slice(0, 80) + ')');
  t.eq([kept, open, sameWeek].map(m => byId(f, m.id).status).join(','), 'met,void,void', 'a founding sets aside what the old house had greenlit and not seen kept, the one given that very week among them');
  t.eq(ids(f), '', 'the new label’s record is empty: nothing on the file was given by it');
  t.eq(f.mandateCooldownUntil, undefined, 'and its calendar upstairs is open');
  const fit = obj(say(() => KP.mandateFitting(f, { kind: 'group', gender: 'f', memberIds: [] })));
  t.eq(fit.id, 'obj-founding', 'what covers the new label’s first act is its own founding directive');
  t.eq(complaints(f).join(' / '), '', 'the state has no complaint: a greenlight the old house saw kept names an act the new label never had, and that is in order');
  // the old window closes at the new label, and nobody there is judged for it
  const trust = f.trust;
  f.week = byId(f, open.id).window + 1;
  const inbox = upstairs(f);
  t.eq(byId(f, open.id).status + ' ' + (f.trust - trust) + ' ' + inbox.length, 'void 0 0', 'when the old window closes the new label is not judged for it: no trust moves and nothing is said');
  // and the label's own are its own
  const mine = give(f, f.week, { kind: 'group', source: 'your pitch' });
  t.ok(ids(f) === mine.id && row(f, mine.id).who === f.executive.name, 'a greenlight given at the new label is the first on its record, in its own chair’s name (' + ids(f) + ', ' + row(f, mine.id).who + ', the old house’s chair was ' + old + ')');

  // a label at its last statement: its acts are off the file, and its record still reads
  const p = desk('gl-pending', 2 * YEAR - 10);
  const pk = give(p, 2 * YEAR - 40, { kind: 'group', source: 'your pitch' });
  p.week = 2 * YEAR - 30; say(() => KP.consumeMandate(p, act(p))); p.week = 2 * YEAR - 10;
  const actName = act(p).name;
  say(() => KP.dissolveLabel(p, 'read'));
  t.ok(KP.chapterPending(p) && KP.groups(p).length === 0, 'the fixture: the label is dissolved, its acts are off the file, and a door is waited for');
  t.eq(row(p, pk.id).status + ' · ' + row(p, pk.id).came + ' · ' + complaints(p).join('/'), 'met · ' + actName + ' debuted ' + KP.weekLabel(2 * YEAR - 30).text + ', inside the window. · ',
    'while the door is waited for, the dead label’s record still reads, by the name it kept, and the state has no complaint');
  const pd = obj(say(() => KP.nextChapter(p, 'blank', { companyName: 'After Paper' })));
  t.ok(pd.ok === true && ids(p) === '' && byId(p, pk.id).status === 'met', 'and through the door the next house’s record is empty, with the dead label’s kept one left as it was (' + js(pd).slice(0, 40) + ' ' + ids(p) + ')');

  // a second chance, by each door
  ['blank', 'salaried'].forEach(door => {
    const x = desk('gl-door-' + door, 2 * YEAR - 10);
    const xo = give(x, 2 * YEAR - 20, { kind: 'group', source: 'your pitch' });
    x.mandateCooldownUntil = 2 * YEAR + 30;
    say(() => KP.dissolveLabel(x, 'read'));
    const dr = obj(say(() => KP.nextChapter(x, door, door === 'blank' ? { companyName: 'Second Paper' } : undefined)));
    t.ok(dr.ok === true && byId(x, xo.id).status === 'void' && ids(x) === '' && x.mandateCooldownUntil === undefined && complaints(x).length === 0,
      'a second chance by the ' + door + ' door sets aside what the dead label was greenlit, opens the calendar, and starts an empty record (' + js(dr).slice(0, 50) + ' ' + byId(x, xo.id).status + ' ' + ids(x) + ' ' + x.mandateCooldownUntil + ' ' + complaints(x).join('/') + ')');
  });
}

// ---- E. who sat in the chair, as far as the written record proves it ----------------------------------
{
  const s = desk('gl-chair', 200);
  const now = s.executive.name;
  const proven = w => { const r = say(() => KP.chairProven(s, w)); return r === null ? 'nobody' : String(r); };
  t.eq([1, 77, 200].map(proven).join('|'), [now, now, now].join('|'), 'with no change of chair on the record, the chair of any week is the one sitting now');
  s.annals = [{ week: 20, kind: 'trophy', name: 'Not A Chair' }, { week: 60, kind: 'chair', name: 'CEO B', after: 'CEO A', years: 1 }, { week: 80, kind: 'red' },
    { week: 130, kind: 'chair', name: 'CEO C', after: 'CEO B', years: 1 }];
  t.eq([10, 20, 59].map(proven).join('|'), 'CEO A|CEO A|CEO A', 'before the first change, the chair is the one that change says had held it');
  t.eq([61, 80, 129].map(proven).join('|'), 'CEO B|CEO B|CEO B', 'between two changes, the one who took it at the first; a mark of another kind changes nothing');
  t.eq([131, 200].map(proven).join('|'), 'CEO C|CEO C', 'after the last, the one who took it then');
  t.eq([60, 130].map(proven).join('|'), 'nobody|nobody', 'the week of a change proves nobody: two people sat in the chair that week');
  s.annals = [{ week: 60, kind: 'chair', name: 'CEO B' }];
  t.eq([10, 61].map(proven).join('|'), 'nobody|CEO B', 'an old file’s mark does not say who came before, so nobody is proven before it');
}

// ---- F. old files ---------------------------------------------------------------------------------------
{
  const old = (seed, set) => {
    const s = desk(seed, 200);
    set(s);
    (s.mandates || []).forEach(m => { delete m.exec; delete m.act; });
    s.version = '0.11.36';
    const r = say(() => KP.deserialize(KP.serialize(s)));
    return r && typeof r === 'object' ? r : { mandates: [], executive: { name: String(r) }, groups: [], week: 200, threw: String(r) };
  };
  // nobody has changed chairs: every one of them is the sitting chair's
  const a = old('gl-old-plain', s => { give(s, 10, { source: 'your pitch' }); say(() => KP.consumeMandate(s, act(s))); give(s, 170, { source: 'your pitch' }); });
  t.eq((a.mandates || []).map(m => m.exec + ':' + m.status).join(' '), [a.executive.name + ':met', a.executive.name + ':open'].join(' '),
    'an old file with no change of chair on its record: each greenlight is named for the chair sitting now, and stays as it stood');
  t.eq((a.mandates || []).map(m => String(m.act)).join(' | '), act(a).name + ' | undefined', 'the one that was kept is given the name of the act that kept it, off the file, and the open one names none');
  const gone = old('gl-old-gone', s => { give(s, 10, { source: 'your pitch' }); say(() => KP.consumeMandate(s, act(s))); delete s.mandates[0].act; s.groups = []; });
  t.eq(String(((gone.mandates || [])[0] || {}).act) + ' · ' + String((lights(gone)[0] || {}).came), 'undefined · An act debuted Feb · Wk 4 · Y5, inside the window.',
    'an old file whose act is off the file loads all the same, and its row names no act');
  // a change of chair on the record
  const b = old('gl-old-chair', s => {
    s.annals = [{ week: 60, kind: 'chair', name: s.executive.name, after: 'CEO Before', years: 1 }];
    give(s, 10, { source: 'your pitch' }); give(s, 60, { source: 'your pitch' }); give(s, 170, { source: 'your pitch' });
  });
  t.eq((b.mandates || []).map(m => String(m.exec)).join(' | '), ['CEO Before', 'undefined', b.executive.name].join(' | '),
    'with a change of chair on its record: the one before is named for the chair before, the one after for the chair after, and the one given that week for nobody');
  t.eq(lights(b).map(e => e.who).join(' | '), ['CEO Before', 'The chair of the day', b.executive.name].join(' | '), 'and the record says so');
  // a founded label carrying what the old house gave
  const c = old('gl-old-founded', s => {
    s.founded = { week: 100, from: 'HCG', warChest: 300 };
    give(s, 80, { kind: 'group', source: 'your pitch' }); say(() => KP.consumeMandate(s, act(s)));
    give(s, 90, { kind: 'group', source: 'the board’s read of the room' });
    give(s, 100, { kind: 'group', source: 'your pitch' });
    give(s, 110, { kind: 'solo', source: 'your pitch' });
    s.groups = [];
  });
  t.eq((c.mandates || []).map(m => m.status + ':' + String(m.exec)).join(' '), ['met:undefined', 'void:undefined', 'open:' + c.executive.name, 'open:' + c.executive.name].join(' '),
    'an old file at a founded label: what the old house gave and was still open is set aside, what it saw kept stays kept, and only the label’s own are named, from the week its doors opened');
  t.eq(ids(c) + ' · ' + complaints(c).join('/'), (c.mandates || []).slice(2).map(m => m.id).join(',') + ' · ', 'its record is the label’s own, and the state has no complaint');
  // a file of this version is left as it is
  const now = desk('gl-now', 200);
  give(now, 10, { source: 'your pitch' });
  delete now.mandates[0].exec;
  const back = say(() => KP.deserialize(KP.serialize(now)));
  t.eq(js(back && back.mandates && back.mandates[0] && back.mandates[0].exec), undefined, 'a save of this version is not named again');
}

// ---- G. the state's own check ---------------------------------------------------------------------------
{
  const s = desk('gl-valid', 200);
  s.founded = { week: 100, from: 'HCG', warChest: 300 };
  const first = give(s, 100, { source: 'your pitch' });
  t.eq(complaints(s).join(' / '), '', 'a greenlight open since the desk’s first week is in order');
  const stale = give(s, 99, { source: 'your pitch' });
  t.eq(complaints(s).join(' / '), 'a greenlight from before this desk is still open (' + stale.id + ', given week 99)', 'one still open from before the desk is named');
  ['met', 'lapsed', 'void'].forEach(st => {
    byId(s, stale.id).status = st;
    t.eq(complaints(s).join(' / '), '', 'one from before the desk that reads ' + st + ' is in order');
  });
}

// ---- H. the Desk ----------------------------------------------------------------------------------------
{
  const D = dom.load();
  const { App, el } = D;
  const draw = () => { const r = say(() => App.render()); return typeof r === 'string' ? r : el('screen').innerHTML; };
  const s = desk('gl-ui', 120);
  App.state = s; App.mode = 'game'; App.tab = 'desk'; App.deskSub = 'record'; App.stack = []; App.view = null;
  const KICK = '<div class="kicker">The greenlights</div>';
  const empty = draw();
  t.ok(empty.includes('<div class="kicker">Promises on the clock</div>') && !empty.includes(KICK), 'the Record tab of a desk that was given nothing has no greenlights to list (' + empty.slice(0, 60).replace(/\s+/g, ' ') + ')');
  const who = s.executive.name;
  const k = give(s, 30, { kind: 'group', gender: null, source: 'your pitch' });
  act(s).name = 'LUMEN <5>';
  s.week = 44; say(() => KP.consumeMandate(s, act(s))); s.week = 120;
  const d = give(s, 40, { kind: 'group', gender: 'f', source: 'the board’s read of the room' });
  byId(s, d.id).status = 'lapsed';
  give(s, 100, { kind: 'solo', source: 'your pitch' });
  s.reviews = [{ year: 2, week: 94, exec: who, trust: 60, band: 'solid', till: 900, sheets: 2, said: 'A fact. A band. A gate.' }];
  const html = draw();
  const at = x => html.indexOf(x);
  const iKick = at(KICK), iPromises = at('<div class="kicker">Promises on the clock</div>'), iReview = at('<div class="kicker">The annual review</div>'), iTalk = at('<div class="kicker">Conversations</div>');
  t.ok(iKick > iPromises && iPromises > -1 && iKick < iReview && iReview < iTalk, 'the greenlights are listed on the Record tab, after the promises and before the annual review (' + [iPromises, iKick, iReview, iTalk].join(',') + ')');
  const CAME = '<div class="gl-came" style="font-size:.78rem;color:var(--ink-dim);margin-top:5px;line-height:1.45">';
  const rowOf = (tag, gave, chip, came) => '<div class="mail gl-row"><span class="m-tag">' + tag + '</span><div><b>' + who + '</b> ' + gave + ' ' + chip + CAME + came + '</div></div></div>';
  const open = at(rowOf('Jan · Wk 4 · Y3', 'greenlit a solo act. It came from your pitch.', '<span class="chip gold">open</span>', 'The window runs to Nov · Wk 4 · Y3.'));
  const dark = at(rowOf('Oct · Wk 4 · Y1', 'greenlit a girl group. It came from the board’s read of the room.', '<span class="chip hot">left dark</span>', 'The window closed Aug · Wk 4 · Y2 with no stage in it.'));
  const kept = at(rowOf('Aug · Wk 2 · Y1', 'greenlit a new group. It came from your pitch.', '<span class="chip cool">kept</span>', 'LUMEN &lt;5&gt; debuted Nov · Wk 4 · Y1, inside the window.'));
  t.ok(open > iKick && dark > open && kept > dark && kept < iReview, 'the newest first: the chair in bold, what was greenlit, a chip for what came of it, and the line beneath, with an act’s name escaped (' + [open, dark, kept].join(',') + ')');
  t.eq((html.match(/class="mail gl-row"/g) || []).length, 3, 'three greenlights, three rows');
}

// ---- I. the tools ------------------------------------------------------------------------------------------
{
  const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const l = read('tools/audit_longhaul.js');
  t.ok(["' | greenlights: '", "console.log('the greenlights (v0.11.37): '", 'a greenlight given under ', 'a greenlight the last house gave (', 'the record lists the greenlights [', 'the record says “',
    ' greenlights were open when the desk moved and '].every(x => l.includes(x)), 'the long haul counts the greenlights of every career and guards them five ways, by its own bookkeeping');
}

t.finish();
