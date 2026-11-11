/* Suite 154 — the promises that stay (v0.11.49, §142; the owner's ruling,
   §136: 36). A promise that has settled stays on the file: the list was cut
   to ten every week, and the cut kept the ten that had settled first, so
   every promise after them went the week it settled. A promise upstairs
   keeps the name of the chair it was made to. A plain one is the house's:
   whoever sits there when it falls due judges it, and where that is another
   chair the words say whose it was and the file says who judged it. A pet
   project is its chair's own, and goes with them, as a promise to a chair's
   own question does. The Record tab lists what settled, the last first, ten
   at a time, and says who holds an open receipt and whom it was made to.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   sentence fails by name; nothing here can crash or hang under a broken
   engine. */
'use strict';
const fs = require('fs'), path = require('path');
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const KP = loadEngine();
const t = makeT('suite_154_promises');
const YEAR = KP.C.WEEKS_PER_YEAR;

// ---- the kit ------------------------------------------------------------------
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const js = x => JSON.stringify(x);
const obj = x => (x && typeof x === 'object' ? x : { threw: String(x) });
const list = x => (Array.isArray(x) ? x : []);
const desk = (seed, week) => { const s = KP.newGame(seed, null, {}); s.week = week; s.scenes = []; s.claims = []; s.objective.status = 'met'; return s; };
const act = s => KP.groups(s)[0] || { name: 'no act', id: 'none', releases: [], members: [] };
const phase = name => KP.weeklyPipeline([]).filter(p => p.name === name)[0] || { fn: () => { throw new Error('no phase ' + name); } };
// a stream that grants nothing: nothing the door does with a promise is drawn
const still = new Proxy({}, { get: (o, k) => (k === 'chance' ? () => false : k === 'int' ? a => a : k === 'pick' ? l => l[0] : () => 0.99) });
// the stage door alone, one turn: what it wrote
const door = s => { const inbox = []; const r = say(() => { phase('stageDoor').fn(s, still, inbox, s.roster.map(id => s.people[id]), KP.groups(s)); return 'ok'; }); return r === 'ok' ? inbox : [{ text: r }]; };
const promise = (s, type, more) => obj(say(() => KP.openClaim(s, Object.assign({ type, subject: { kind: 'exec' }, byWeek: s.week + 40 }, more || {}))));
// the chairs: the one a career opens with, and two more of the house's six
const others = s => KP.DATA.executives.filter(e => e.name !== s.executive.name);
const seat = (s, e) => { s.executive = { name: e.name, gender: e.gender || 'f', personality: e.personality, intro: e.intro, since: s.week }; return e.name; };
const trainee = s => { const p = s.roster.map(id => s.people[id]).filter(x => x.status === 'trainee')[0] || { id: 'nobody', name: {} }; p.gender = 'f'; return p; };
const nm = p => String(say(() => KP.displayName(p)));
const wk = w => String(say(() => KP.weekLabel(w).text));
const first = notes => (list(notes)[0] || { text: 'no letter' }).text;
const how = c => [c.resolved, c.resolvedWeek, c.judgedBy || '-'].join(' · ');
// the suite's own kind of promise: it settles the week it falls due, the way it is told to
say(() => KP.registerClaim('suiteSettles', (state, c) => (state.week >= c.byWeek ? { resolved: c.as || 'met', notes: [] } : null)));
const load = (s, version) => { const raw = JSON.parse(KP.serialize(s)); (raw.state || raw).version = version; return obj(say(() => KP.deserialize(JSON.stringify(raw)))); };

// ---- A. what settles stays ---------------------------------------------------------------------------------
{
  const s = desk('pr-stays', 20);
  const made = [];
  for (let i = 1; i <= 12; i++) made.push(promise(s, 'suiteSettles', { subject: { kind: 'idol', id: 'p' + i }, byWeek: 20 + i, as: i % 3 ? 'met' : 'missed' }));
  const kept = [];
  for (let i = 1; i <= 12; i++) { s.week = 20 + i; door(s); if (list(s.claims).includes(made[i - 1]) && made[i - 1].resolved) kept.push(i); }
  t.eq(kept.join(), '1,2,3,4,5,6,7,8,9,10,11,12', 'twelve promises fall due a week apart, and each is on the file the week it settles: the eleventh and the twelfth as the first');
  t.eq(list(s.claims).filter(c => c.resolved).map(c => c.resolvedWeek).join(), '21,22,23,24,25,26,27,28,29,30,31,32', 'all twelve are on the file at the end, each under the week it settled');
  t.eq(list(s.claims).map(c => c.id).join(), made.map(c => c.id).join(), 'the list stands in the order the promises were made');
  t.eq(list(s.claims).filter(c => c.resolved === 'missed').length + ' broken · ' + list(s.claims).filter(c => c.resolved === 'met').length + ' kept', '4 broken · 8 kept', 'and each as it settled');
  const back = obj(say(() => KP.deserialize(KP.serialize(s))));
  t.eq(list(back.claims).filter(c => c.resolved).length, 12, 'all twelve come back from a save');
  // by the real week, on a file that already holds twelve
  const late = [promise(s, 'suiteSettles', { subject: { kind: 'idol', id: 'p13' }, byWeek: s.week + 1 }), promise(s, 'suiteSettles', { subject: { kind: 'idol', id: 'p14' }, byWeek: s.week + 2 })];
  say(() => KP.advanceWeek(s)); say(() => KP.advanceWeek(s));
  t.eq(late.map(c => (list(s.claims).includes(c) ? c.resolved : 'gone')).join(), 'met,met', 'two more settle in real weeks and both are kept');
  t.eq(list(s.claims).filter(c => c.type === 'suiteSettles' && c.resolved).length, 14, 'fourteen settled, fourteen on the file');
  t.ok(!KP.C.SCENES || KP.C.SCENES.maxResolvedClaims === undefined, 'nothing says how many settled promises a file may hold');
}

// ---- B. the name on a promise upstairs ---------------------------------------------------------------------
{
  const s = desk('pr-name', 30);
  const A = s.executive.name;
  const five = ['readyTrainee', 'comebackPromise', 'secondGroup', 'growthPromise', 'petProject'].map(type => promise(s, type, { personId: trainee(s).id, groupId: act(s).id, baseline: 99 }));
  t.eq(five.map(c => c.execName).join(' | '), [A, A, A, A, A].join(' | '), 'each of the five plain promises upstairs carries the name of the chair it was made to');
  const idol = promise(s, 'suiteSettles', { subject: { kind: 'idol', id: 'p1' } }), fund = promise(s, 'suiteSettles', { subject: { kind: 'fund' } });
  t.eq(js([idol.execName, fund.execName]), js([undefined, undefined]).replace(/null/g, 'null'), 'a promise to an artist or to a fund names no chair');
  const B = others(s)[0].name, C = others(s)[1];
  const own = promise(s, 'execQuarter', { execName: B, baseline: 0 });
  t.eq(own.execName, B, 'a name the promise was given is the name it keeps');
  seat(s, C);
  t.eq(five.map(c => c.execName).join(' | '), [A, A, A, A, A].join(' | '), 'the chair changes and the name on each promise is as it was');
  t.eq(js(five.map(c => say(() => KP.madeTo(s, c)))), js([A, A, A, A, A]), 'under another chair each says whose it was');
  seat(s, { name: A });
  t.eq(js(five.map(c => say(() => KP.madeTo(s, c)))), js([null, null, null, null, null]), 'and under the chair it was made to, nothing: it is theirs');
  seat(s, C);
  t.eq(js([say(() => KP.madeTo(s, idol)), say(() => KP.madeTo(s, { type: 'readyTrainee', subject: { kind: 'exec' } })), say(() => KP.madeTo(s, { type: 'readyTrainee' }))]), js([null, null, null]),
    'a promise to an artist, one an old file could not name, and one with no subject at all are nobody’s but the sitting chair’s');
  t.eq(js(say(() => KP.madeTo(s, { type: 'suiteSettles', subject: { kind: 'idol', id: 'p1' }, execName: A }))), 'null', 'and a promise to an artist is no chair’s, whatever name it has been given');
}

// ---- C. judged by the chair that sits there, in words that say whose it was ----------------------------------
// the trainee who was closest to ready
{
  const ready = (seed, change) => { const s = desk(seed, 40); const p = trainee(s); const A = s.executive.name;
    const c = promise(s, 'readyTrainee', { personId: p.id, personName: nm(p), byWeek: 80 });
    const B = change ? seat(s, others(s)[0]) : A;
    return { s, p, c, A, B }; };
  const debut = (f, reception) => { const g = act(f.s); f.p.status = 'idol'; g.members = [f.p.id].concat(g.members.filter(id => id !== f.p.id)); g.results = { reception }; f.s.week = 60; };
  let f = ready('pr-ready-1', false); debut(f, 70);
  t.eq(first(door(f.s)), f.A + ': “You told me ' + nm(f.p) + ' was the one, and then she was. I remember the people who read talent correctly.”', 'kept under the chair it was made to: “You told me”');
  t.eq(how(f.c) + ' · trust ' + f.s.trust, 'met · 60 · - · trust 57', 'it is kept, the week it settled, with no other judge, and trust is two the better');
  f = ready('pr-ready-2', true); debut(f, 70);
  t.eq(first(door(f.s)), f.B + ': “You told ' + f.A + ' that ' + nm(f.p) + ' was the one, and then she was. It is in the file, and I remember the people who read talent correctly.”',
    'kept under another chair: the one who sits there says whom it was told to');
  t.eq(how(f.c) + ' · trust ' + f.s.trust + ' · ' + f.c.execName, 'met · 60 · ' + f.B + ' · trust 57 · ' + f.A, 'the file says who judged it, the name it was made to stands, and trust moves as it would have');
  t.eq(f.c.replyText, first([{ text: f.B + ': “You told ' + f.A + ' that ' + nm(f.p) + ' was the one, and then she was. It is in the file, and I remember the people who read talent correctly.”' }]), 'and the words are kept on the promise');
  f = ready('pr-ready-3', true); debut(f, 40);
  t.eq(first(door(f.s)) + ' · ' + how(f.c) + ' · trust ' + f.s.trust, f.B + ': “She debuted, as you said. The debut itself we will discuss another day.” · metPoorly · 60 · ' + f.B + ' · trust 55', 'kept, barely, under another chair: the words name nobody, and the file says who judged it');
  f = ready('pr-ready-4', false); f.s.week = 81;
  t.eq(first(door(f.s)), f.A + ': “You told me in ' + wk(40) + ' that ' + nm(f.p) + ' was closest to ready. The window has closed. I keep my notes, and I reread them.”', 'broken under the chair it was made to: their own notes');
  t.eq(how(f.c) + ' · trust ' + f.s.trust, 'missed · 81 · - · trust 53', 'broken, and trust two the worse');
  f = ready('pr-ready-5', true); f.s.week = 81;
  t.eq(first(door(f.s)), f.B + ': “You told ' + f.A + ' in ' + wk(40) + ' that ' + nm(f.p) + ' was closest to ready. The window has closed. The notes came with the chair, and I have read them.”',
    'broken under another chair: the notes came with the chair');
  t.eq(how(f.c) + ' · trust ' + f.s.trust, 'missed · 81 · ' + f.B + ' · trust 53', 'the same cost, and the file says who judged it');
  f = ready('pr-ready-6', true); f.p.status = 'released'; f.s.week = 50;
  t.eq(first(door(f.s)), f.B + ': “You told ' + f.A + ' in ' + wk(40) + ' that ' + nm(f.p) + ' was closest to ready. You then released her. The notes came with the chair, and I have read them.”', 'and one released since, under another chair');
}
// the comeback on the calendar
{
  const come = (seed, change) => { const s = desk(seed, 40); const g = act(s); const A = s.executive.name; g.lastReleaseWeek = 10;
    const c = promise(s, 'comebackPromise', { groupId: g.id, byWeek: 52 }); const B = change ? seat(s, others(s)[1]) : A; return { s, g, c, A, B }; };
  let f = come('pr-come-1', false); f.g.lastReleaseWeek = 45; f.s.week = 46;
  t.eq(first(door(f.s)), f.A + ': “' + f.g.name + ' came back inside the window you promised. A calendar that means something — refreshing.”', 'a comeback kept under its own chair says no name');
  f = come('pr-come-2', true); f.g.lastReleaseWeek = 45; f.s.week = 46;
  t.eq(first(door(f.s)) + ' · ' + how(f.c), f.B + ': “' + f.g.name + ' came back inside the window you promised ' + f.A + '. A calendar that means something — refreshing.” · met · 46 · ' + f.B, 'kept under another chair: the window you promised them');
  f = come('pr-come-3', false); f.s.week = 53;
  t.eq(first(door(f.s)), f.A + ': “You promised the ' + f.g.name + ' comeback by ' + wk(52) + '. It is ' + wk(53) + '. I do not enjoy being a person who checks dates. And yet.”', 'a comeback broken under its own chair');
  f = come('pr-come-4', true); f.s.week = 53;
  t.eq(first(door(f.s)) + ' · ' + how(f.c) + ' · trust ' + f.s.trust, f.B + ': “You promised ' + f.A + ' the ' + f.g.name + ' comeback by ' + wk(52) + '. It is ' + wk(53) + '. I do not enjoy being a person who checks dates. And yet.” · missed · 53 · ' + f.B + ' · trust 53',
    'broken under another chair: whom it was promised to');
}
// the second lineup
{
  const second = (seed, change, met) => { const s = desk(seed, 40); const A = s.executive.name;
    const c = promise(s, 'secondGroup', { baseline: KP.groups(s).length - (met ? 1 : 0), byWeek: 88 }); const B = change ? seat(s, others(s)[2]) : A; s.week = met ? 60 : 89; return { s, c, A, B }; };
  let f = second('pr-second-1', false, true);
  t.eq(first(door(f.s)), f.A + ': “A second lineup, inside the window. This building is starting to look like a company.”', 'a second lineup kept under its own chair');
  f = second('pr-second-2', true, true);
  t.eq(first(door(f.s)) + ' · ' + how(f.c), f.B + ': “A second lineup, inside the window you gave ' + f.A + '. This building is starting to look like a company.” · met · 60 · ' + f.B, 'kept under another chair: the window you gave them');
  f = second('pr-second-3', false, false);
  t.eq(first(door(f.s)), f.A + ': “A year ago the trainee room was full and you said a second lineup was coming. The room is still full. Rooms do not debut, unfortunately.”', 'broken under its own chair');
  f = second('pr-second-4', true, false);
  t.eq(first(door(f.s)) + ' · ' + how(f.c), f.B + ': “A year ago the trainee room was full and you told ' + f.A + ' a second lineup was coming. The room is still full. Rooms do not debut, unfortunately.” · missed · 89 · ' + f.B, 'broken under another chair: you told them');
}
// the growth the board was promised, the pet project, and a chair's own question
{
  const s = desk('pr-growth', 40); const A = s.executive.name;
  const c = promise(s, 'growthPromise', { baseline: -1, byWeek: 88 }); const B = seat(s, others(s)[0]); s.week = 88;
  const said = first(door(s));
  t.eq(how(c) + ' · ' + said.includes(A), 'met · 88 · ' + B + ' · false', 'the growth the board was promised is judged under another chair, in the words it always had, and the file says who judged it');

  const pet = (seed, change) => { const u = desk(seed, 40); const A2 = u.executive.name; const p = promise(u, 'petProject', { byWeek: 88 }); if (change) seat(u, others(u)[0]); u.week = 89; return { u, p, A2 }; };
  let f = pet('pr-pet-1', false); let notes = door(f.u);
  t.eq(how(f.p) + ' · trust ' + f.u.trust + ' · ' + notes.length, 'missed · 89 · - · trust 52 · 1', 'a pet project with no solo stage is broken under the chair that asked for it, as it ever was');
  f = pet('pr-pet-2', true); notes = door(f.u);
  t.eq(how(f.p) + ' · trust ' + f.u.trust + ' · ' + notes.length + ' · ' + f.p.execName, 'void · 89 · - · trust 55 · 0 · ' + f.A2, 'under another chair it is set aside: no verdict, no letter, no cost, no judge, and the name it was made to stands');
  const g = act(f.u); const solo = desk('pr-pet-3', 40); const sp = promise(solo, 'petProject', { byWeek: 88 }); seat(solo, others(solo)[0]);
  solo.groups.push({ id: 'g-solo', name: 'Solo', type: 'solo', debuted: true, debutWeek: 50, members: [], releases: [] }); solo.week = 51;
  notes = door(solo);
  t.eq(how(sp) + ' · trust ' + solo.trust + ' · ' + notes.length + ' · ' + !!g, 'void · 51 · - · trust 55 · 0 · true', 'and a solo stage under another chair banks nothing with them: the project was not theirs');

  const q = desk('pr-own', 40); const QA = q.executive.name;
  const oc = promise(q, 'execQuarter', { execName: QA, baseline: 0, askedWeek: 40, byWeek: 52 }); seat(q, others(q)[0]); q.week = 52;
  notes = door(q);
  t.eq(how(oc) + ' · trust ' + q.trust + ' · ' + notes.length, 'void · 52 · - · trust 55 · 0', 'a promise to a chair’s own question is set aside under another chair, as it ever was, and has no judge');
}

// ---- D. the Record tab ---------------------------------------------------------------------------------------
{
  const D = dom.load();
  const { App, el } = D;
  const draw = () => { const r = say(() => App.render()); return typeof r === 'string' ? r : el('screen').innerHTML; };
  const s = desk('pr-ui', 100); const A = s.executive.name; const p = trainee(s);
  const open = [promise(s, 'readyTrainee', { personId: p.id, personName: nm(p), byWeek: 140 }), promise(s, 'secondGroup', { baseline: 99, byWeek: 148 }), promise(s, 'petProject', { byWeek: 148 })];
  App.state = s; App.mode = 'game'; App.tab = 'desk'; App.deskSub = 'record'; App.stack = []; App.view = null; App.settledOpen = false;
  let html = draw();
  t.ok(html.includes('<b>' + A + '</b> holds the receipt: “' + nm(p) + ' is closest to ready”') && !html.includes('made to'), 'an open promise upstairs: the chair it was made to holds the receipt');
  t.ok(html.includes('holds the receipt: a second lineup, inside the year<') && html.includes('holds the receipt: the solo debut the chair asked for, inside the year<') && !/receipt: (secondGroup|petProject)/.test(html),
    'a second lineup and a pet project are said in words, where the tab said the file’s own name for them');
  const B = seat(s, others(s)[0]);
  html = draw();
  t.ok(html.includes('<b>' + B + '</b> holds the receipt, made to ' + A + ': “' + nm(p) + ' is closest to ready”') && html.includes('<b>' + B + '</b> holds the receipt, made to ' + A + ': a second lineup, inside the year<span class="m-week">due '),
    'the chair changes: the one who sits there holds the receipt, and the row says whom it was made to');
  const ownQ = promise(s, 'execSound', { execName: A, label: 'our next record, in the sound of its year' });
  html = draw();
  t.ok(html.includes('<b>' + A + '</b> held the receipt, and it goes with them: the solo debut the chair asked for, inside the year</div>') && html.includes('<b>' + A + '</b> held the receipt, and it goes with them: our next record, in the sound of its year</div>'),
    'a pet project and a promise to a chair’s own question went with the chair: the row says who held it, and gives no date');
  t.eq(js([say(() => KP.chairsOwn(open[0])), say(() => KP.chairsOwn(open[1])), say(() => KP.chairsOwn(open[2])), say(() => KP.chairsOwn(ownQ)), say(() => KP.chairsOwn({ type: 'growthPromise' }))]), js([false, false, true, true, false]),
    'the three the meeting takes and the growth the board was promised are the house’s; a pet project and a chair’s own question are the chair’s');
  t.ok(!html.includes('data-action="settled-toggle"') && !html.includes('>Settled<'), 'with nothing settled there is no list and no button');
  // ten settled, the first of them made in the career's first week
  s.claims = [];
  for (let i = 1; i <= 10; i++) { const c = promise(s, 'suiteSettles', { week: i, label: 'early promise ' + i }); c.resolved = 'met'; c.resolvedWeek = 50 + i; }
  html = draw();
  t.eq((html.match(/early promise \d+/g) || []).length + ' · ' + html.includes('early promise 1 <') + ' · ' + html.includes('data-action="settled-toggle"'), '10 · true · false',
    'ten settled are ten rows and no button, and one made in the career’s first week is among them');
  // twelve settle, a week apart; the eighth is judged by the new chair
  s.claims = [];
  for (let i = 1; i <= 12; i++) { const c = promise(s, 'suiteSettles', { execName: A, label: 'promise number ' + i, byWeek: 100 + i, as: i % 2 ? 'met' : 'missed' }); c.resolved = c.as; c.resolvedWeek = 100 + i; if (i === 8) c.judgedBy = B; }
  s.week = 113;
  html = draw();
  const rows = h => h.split('promise number ').slice(1).map(x => parseInt(x, 10));
  t.eq(rows(html).join(), '12,11,10,9,8,7,6,5,4,3', 'ten are shown, the last to settle first');
  t.ok(html.includes('data-action="settled-toggle"') && html.includes('>All 12 settled promises</button>'), 'and one line says how many there are');
  t.ok(html.includes('<b>' + A + '</b>: promise number 8 <span class="chip hot">broken</span><div class="judged-by"') && html.includes('>judged by ' + B + '</div>') && html.split('class="judged-by"').length === 2,
    'a settled promise stands under the chair it was made to, and one another chair judged says who');
  say(() => D.click({ action: 'settled-toggle' }));
  html = draw();
  t.eq(rows(html).join() + ' · ' + html.includes('>Show the last ten</button>'), '12,11,10,9,8,7,6,5,4,3,2,1 · true', 'one tap shows all twelve, and the line closes them again');
  say(() => D.click({ action: 'settled-toggle' }));
  t.eq(rows(draw()).length, 10, 'and a second tap shows ten');
  // settled in another order than made: the list goes by the week each settled
  s.claims[0].resolvedWeek = 120;
  t.eq(rows(draw()).slice(0, 3).join(), '1,12,11', 'the order is the week each settled, not the week each was made');
  // a desk that has moved: what was promised at the house before stays on the file and is not this building's to list
  const m = desk('pr-ui-moved', 300); m.chapterSince = 200;
  [150, 199, 200].forEach((w, i) => { const c = promise(m, 'suiteSettles', { label: 'old promise ' + i, week: w }); c.resolved = 'void'; c.resolvedWeek = 200; });
  [210, 250].forEach((w, i) => { const c = promise(m, 'suiteSettles', { label: 'new promise ' + i, week: w }); c.resolved = 'met'; c.resolvedWeek = w + 5; });
  App.state = m; App.settledOpen = true;
  html = draw();
  t.eq((html.match(/new promise \d/g) || []).join() + ' · ' + (html.match(/old promise \d/g) || []).length + ' · ' + list(m.claims).length, 'new promise 1,new promise 0 · 0 · 5',
    'at a desk that has moved the list is this desk’s own, and the house before’s promises are still on the file');
  App.settledOpen = false;
}

// ---- E. the handover's record reads them -------------------------------------------------------------------
{
  const s = desk('pr-record', 200); const A = s.executive.name;
  for (let i = 1; i <= 12; i++) { const c = promise(s, 'suiteSettles', { week: 100 + i, byWeek: 110 + i, as: i <= 6 ? 'met' : i <= 10 ? 'missed' : 'void' }); }
  for (let i = 1; i <= 12; i++) { s.week = 110 + i; door(s); }
  s.week = 200;
  const B = seat(s, others(s)[0]);
  for (let i = 1; i <= 3; i++) promise(s, 'suiteSettles', { week: 200 + i });
  const r = obj(say(() => KP.chairRecord(s, A))), rb = obj(say(() => KP.chairRecord(s, B)));
  t.eq([r.promises, r.promisesKept, r.promisesBroken].join('/') + ' · ' + [rb.promises, rb.promisesKept, rb.promisesBroken].join('/'), '12/6/4 · 3/0/0', 'the record a chair leaves counts every promise made to them, the eleventh and twelfth with the first ten, and none made to the next');
  t.ok(String(say(() => KP.chairRecordSaid(r))).includes('12 promises upstairs, 6 kept and 4 broken'), 'and says so in the handover’s sentence');
}

// ---- F. an older file --------------------------------------------------------------------------------------
{
  const s = desk('pr-old', 150); const A = s.executive.name; const B = others(s)[0].name;
  s.week = 100; say(() => KP.fileMark(s, 'chair', { name: B, after: A, years: 2 })); seat(s, others(s)[0]); s.week = 150;
  const mk = (week, more) => { const c = promise(s, 'readyTrainee', Object.assign({ week, personId: trainee(s).id, personName: 'Someone' }, more || {})); delete c.execName; return c; };
  mk(60); mk(100); mk(120);
  const own = mk(130); own.type = 'execQuarter'; own.execName = A;
  const idol = promise(s, 'suiteSettles', { subject: { kind: 'idol', id: 'p1' }, week: 90 });
  const b = load(s, '0.11.48');
  t.eq(list(b.claims).map(c => c.execName || 'none').join(' | '), [A, 'none', B, A, 'none'].join(' | '),
    'an older file’s plain promises are named by its written record: the chair before the change, the chair after, and none for the week both sat; a name already there and a promise to an artist are left alone');
  t.eq(b.version, KP.C.VERSION, 'and the file is of this version');
  const fresh = desk('pr-old-2', 150); const c2 = promise(fresh, 'comebackPromise', { week: 40, groupId: act(fresh).id }); delete c2.execName;
  t.eq(list(load(fresh, '0.11.48').claims).map(c => c.execName).join(), fresh.executive.name, 'with no change of chair on the record, a promise was made to the one who sits there');
  const moved = desk('pr-old-3', 300); moved.chapterSince = 200;
  [150, 200, 250].forEach(w => { const c = promise(moved, 'comebackPromise', { week: w, groupId: act(moved).id }); delete c.execName; });
  t.eq(list(load(moved, '0.11.48').claims).map(c => c.execName || 'none').join(' | '), ['none', 'none', moved.executive.name].join(' | '), 'at a desk that has moved, a promise made at the house before is left unnamed: this record cannot say');
  const one = desk('pr-old-4', 150); const c1 = promise(one, 'comebackPromise', { week: 1, groupId: act(one).id }); delete c1.execName;
  t.eq(list(load(one, '0.11.48').claims).map(c => c.execName || 'none').join(), one.executive.name, 'and at a house the desk has never left, a promise made in its first week is named');
  const now = load(s, KP.C.VERSION);
  t.eq(list(now.claims).map(c => c.execName || 'none').join(' | '), ['none', 'none', 'none', A, 'none'].join(' | '), 'a file of this version is not named again');
}

// ---- G. the validator ---------------------------------------------------------------------------------------
{
  const bad = fn => { const s = desk('pr-valid', 50); const c = promise(s, 'secondGroup', { baseline: 99 }); const d = promise(s, 'suiteSettles', { subject: { kind: 'idol', id: 'p1' } }); fn(c, d, s);
    return list(say(() => KP.validateState(s))).filter(x => /promise names/.test(x)).join(' ; ') || 'sound'; };
  t.eq(bad(() => {}), 'sound', 'a promise upstairs with its chair’s name is sound');
  t.eq(bad((c, d) => { d.execName = 'CEO Somebody'; }), 'a suiteSettles promise names “CEO Somebody” as the chair it was made to', 'a promise to an artist that names a chair is flagged');
  t.eq(bad(c => { c.execName = ''; }), 'a secondGroup promise names “” as the chair it was made to', 'and a name that is empty');
  t.eq(bad(c => { c.execName = 7; }), 'a secondGroup promise names “7” as the chair it was made to', 'and a name that is not a name');
  t.eq(bad(c => { c.judgedBy = 'CEO Other'; }), 'a secondGroup promise names “CEO Other” as its judge', 'a judge on a promise still open is flagged');
  t.eq(bad(c => { c.resolved = 'void'; c.judgedBy = 'CEO Other'; }), 'a secondGroup promise names “CEO Other” as its judge', 'and on one set aside');
  t.eq(bad(c => { c.resolved = 'met'; c.judgedBy = c.execName; }), 'a secondGroup promise names “' + desk('pr-valid', 50).executive.name + '” as its judge', 'and a judge who is the chair it was made to');
  t.eq(bad(c => { c.resolved = 'missed'; c.judgedBy = 'CEO Other'; }), 'sound', 'a broken promise another chair judged is sound');
}

// ---- H. real weeks ---------------------------------------------------------------------------------------------
{
  const s = KP.newGame('pr-real-1', null, {});
  const seen = new Map(); let lost = 0, misnamed = 0, weeks = 0;
  for (let i = 0; i < 150; i++) {
    list(s.scenes).slice().forEach(sc => { const d = KP.sceneDef(sc.kind); if (!d) return; const o = list(say(() => d.options(s, sc))); const pick = o.filter(x => x.id === 'promise')[0] || o[0]; if (pick) say(() => KP.resolveScene(s, sc.id, pick.id)); });
    list(s.claims).forEach(c => { if (!seen.has(c)) seen.set(c, s.executive.name); });
    const open = list(s.claims).filter(c => !c.resolved);
    s.budget = Math.max(s.budget, 3000);
    if (say(() => { KP.advanceWeek(s); return 'ok'; }) !== 'ok') break;
    weeks++;
    open.forEach(c => { if (c.resolved && !list(s.claims).includes(c)) lost++; });
  }
  const all = [...seen.keys()], settled = all.filter(c => c.resolved);
  all.forEach(c => { if (c.subject.kind === 'exec' ? c.execName !== seen.get(c) : c.execName != null) misnamed++; });
  t.ok(weeks === 150 && settled.length >= 11, 'a real career of 150 real weeks, every question upstairs answered with a promise: ' + settled.length + ' promises settle in ' + weeks + ' weeks');
  t.eq(lost + ' gone · ' + settled.filter(c => list(s.claims).includes(c)).length + ' of ' + settled.length + ' on the file', '0 gone · ' + settled.length + ' of ' + settled.length + ' on the file', 'and every one is on the file the week it settles, and at the end');
  t.eq(misnamed + ' · ' + (all.filter(c => c.subject.kind === 'exec').length > 0), '0 · true', 'each promise upstairs carries the chair that sat the week it was made, and no other promise carries one');
  t.eq(list(say(() => KP.validateState(s))).join(' ; '), '', 'and the file is sound');
}

// ---- I. the tools ---------------------------------------------------------------------------------------------
{
  const read = f => String(say(() => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')));
  const haul = read('tools/audit_longhaul.js');
  t.ok(/the promises that stay \(v0\.11\.49\)/.test(haul) && /a promise that settled has gone from the file/.test(haul) && /and this tool saw it made to/.test(haul), 'the long haul holds the file to its own note of every promise it saw settle, and of the chair each was made to');
  t.ok(!/state\.claims = /.test(read('js/engine/scenes.js')) && !/maxResolvedClaims/.test(read('js/engine/constants.js')), 'and the stage door cuts nothing from the list');
}

t.finish();
