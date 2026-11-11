/* Suite 147 — the chairs stay with the house (v0.11.40, §132: a repair of
   the founding, found counting the staff). The founding swept the groups,
   the roster and the record, and never the staff: a founded label opened
   with the old house's chairs still sat. The dissolution has always swept
   them. Now every desk change does: the house keeps its people, and the next
   building opens with four of its own, sat from the week its doors open,
   each under a name of its own. Found on the way: a label founded out of a
   second house dated its desk from that second house.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   sentence fails by name; nothing here can crash or hang under a broken
   engine. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const KP = loadEngine();
const t = makeT('suite_147_chairs');
const YEAR = KP.C.WEEKS_PER_YEAR;

// ---- the kit ------------------------------------------------------------------
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const js = x => JSON.stringify(x);
const obj = x => (x && typeof x === 'object' ? x : { threw: String(x) });
const act = s => KP.groups(s)[0] || { name: 'no act', id: 'none', releases: [], members: [] };
const desk = (seed, week) => { const s = KP.newGame(seed, null, {}); s.week = week; s.objective.status = 'met'; return s; };
// a house the desk can be walked out of: the founding's gates, forced
const founder = (seed, week) => { const s = desk(seed, week); s.trust = 80; s.awardHistory = [{ year: 2, category: 'daesang', name: act(s).name, company: s.company.short, isPlayer: true }]; return s; };
// the building as it stands: every chair, in the file's own order
const chairs = s => Object.keys(s.seats || {}).map(seatId => Object.assign({ seatId }, s.seats[seatId]));
const col = (s, k) => chairs(s).map(c => (Array.isArray(c[k]) ? c[k].join(' + ') : String(c[k]))).join(',');
const distinct = list => new Set(list).size === list.length;
// a chair hired the ordinary way, as the interview leaves it on the file
const hire = (s, seatId, week, more) => { const S = obj(say(() => KP.staffSeats(s)));
  S[seatId] = Object.assign({ id: 'sf' + week + '_' + seatId.length + '77', name: 'Hired ' + seatId, seatId, tier: 'a name', knownForTag: null, since: week, style: 'scrappy', warmth: 60, candor: 60,
    resume: ['9 years in the industry, most recently at a mid-tier label', 'worked through a famous era'], truth: { base: 0.5, gem: false, bestSeat: 'vocal' } }, more || {});
  return S[seatId]; };
// a full building at an old house: the four it opened with, three hired since, a posting up
const full = s => { hire(s, 'anr', 20); hire(s, 'marketing', 60); hire(s, 'producer', 90, { works: [{ week: 100, title: 'A', craft: 60, groupId: act(s).id }, { week: 120, title: 'B', craft: 70, groupId: act(s).id }] });
  s.staffSearch = { seatId: 'writer', week: s.week - 1 }; s.seatSearchCooldowns = { writer: s.week - 1, anr: 20 }; return s; };
const fam = key => String(say(() => KP.staffName(key))).split(' ')[0];
const TITLE = { vocal: 'Coach ', dance: 'Coach ', perf: 'Director ', scout: 'Scout ' };
const FOUR = 'vocal,dance,perf,scout';
// the names a building's key gives when no two collide, worked out here and never asked of the mint
const plain = key => FOUR.split(',').map(seatId => TITLE[seatId] + fam(key + '|' + seatId));
// and the names it gives when two would: the first keeps the name, the next takes the key's next one. This suite's own working
const named = key => { const taken = {}; return FOUR.split(',').map(seatId => { let name = null;
  for (let salt = 0; salt < 8 && (!name || taken[name]); salt++) name = TITLE[seatId] + fam(key + '|' + seatId + (salt ? '|' + salt : ''));
  taken[name] = true; return name; }); };
const resume = (s, seatId) => js(((s.seats || {})[seatId] || { resume: 'no such chair on the file' }).resume);
const complaints = s => { const r = say(() => KP.validateState(s)); return (Array.isArray(r) ? r : [String(r)]).filter(e => /chair|threw/.test(e)); };
const mailOf = (s, ind) => (s.inbox || []).filter(n => n.ind === ind)[0] || { text: 'no such letter' };
const load = (s, version) => { const raw = JSON.parse(KP.serialize(s)); (raw.state || raw).version = version; return obj(say(() => KP.deserialize(JSON.stringify(raw)))); };

// ---- A. one mint for every desk change ---------------------------------------------
{
  t.ok(typeof KP.seatBuilding === 'function', 'the engine carries KP.seatBuilding');
  const s = full(desk('ch-mint', 200));
  s.managerGen = 3;
  const before = chairs(s).map(c => c.id);
  const S = obj(say(() => KP.seatBuilding(s, 'ch-mint|key', 'the line')));
  t.eq(Object.keys(S).join(), FOUR, 'a building opens with its four: the vocal coach, the dance coach, the performance director and the scout');
  t.ok(S === s.seats, 'and they are the building’s own, on the file');
  t.eq(col(s, 'since'), '200,200,200,200', 'each has sat from the week the doors opened');
  t.eq(col(s, 'tier'), 'working,working,working,working', 'each is a working name, as a new house’s are');
  t.eq(col(s, 'resume'), 'the line,the line,the line,the line', 'each résumé says the one thing it is given to say');
  t.eq(col(s, 'id'), 'sf3_vocal,sf3_dance,sf3_perf,sf3_scout', 'each is a new person: the file number carries the building’s own count');
  t.ok(chairs(s).every(c => !before.includes(c.id)), 'none of them sat in the last building');
  t.ok(chairs(s).every(c => c.truth && typeof c.truth.base === 'number' && typeof c.truth.bestSeat === 'string'), 'and each has a truth of their own, minted once');
  t.eq(js([s.staffSearch, s.seatSearchCooldowns]), '[null,null]', 'the posting that was up, and the market’s memory of the last ones, were the last building’s');
  // the names
  let clash = null, clear = null;
  for (let i = 0; i < 400 && !(clash && clear); i++) {
    const key = 'ch-names|' + i, names = plain(key);
    if (!clash && names[0] === names[1]) clash = key;
    if (!clear && distinct(names)) clear = key;
  }
  t.ok(!!clash && !!clear, 'the fixture: one key whose two coaches would share a name, and one whose four are all different (' + clash + ', ' + clear + ')');
  const c1 = desk('ch-clear', 50);
  say(() => KP.seatBuilding(c1, clear, 'x'));
  t.eq(col(c1, 'name'), plain(clear).join(), 'four names that do not collide are the ones the key gives: a second chance is named as it always was');
  const c2 = desk('ch-clash', 50);
  say(() => KP.seatBuilding(c2, clash, 'x'));
  let want = null;
  for (let salt = 1; salt < 8 && !want; salt++) { const n = 'Coach ' + fam(clash + '|dance|' + salt); if (n !== plain(clash)[0]) want = n; }
  t.ok(distinct(chairs(c2).map(c => c.name)), 'two chairs of one building do not answer to one name (' + col(c2, 'name') + ')');
  t.eq(col(c2, 'name').split(',').slice(0, 2).join(), [plain(clash)[0], want].join(), 'the first keeps the name, and the second is given the next one the key yields');
  // a building with no file yet
  const bare = desk('ch-bare', 30);
  delete bare.seats;
  t.eq(Object.keys(obj(say(() => KP.seatBuilding(bare, 'k', 'x')))).join(), FOUR, 'a house whose chairs were never looked at opens with the same four');
}

// ---- B. the founding ------------------------------------------------------------------
{
  const f = full(founder('ch-found', 3 * YEAR));
  const old = f.company.short;
  const was = chairs(f);
  t.eq(was.length + ' · ' + was.filter(c => c.tier === 'a name').length, '7 · 3', 'the fixture: the old house has seven chairs sat, three of them names the trades know');
  const gen = f.managerGen || 0;
  const fr = obj(say(() => KP.foundLabel(f, 'HOMEWARD')));
  t.ok(fr.ok === true && f.founded && f.founded.week === 3 * YEAR && f.founded.from === old, 'the fixture: the founding goes through (' + js(fr).slice(0, 80) + ')');
  t.eq(col(f, 'seatId'), FOUR, 'the label opens with four chairs sat');
  t.ok(chairs(f).every(c => !was.some(o => o.id === c.id)), 'none of the old house’s people is in them: everything built stays behind, the staff with it');
  t.eq(col(f, 'since'), [1, 1, 1, 1].map(() => 3 * YEAR).join(), 'the four have sat since the founding week');
  t.eq(col(f, 'tier'), 'working,working,working,working', 'and are working names, as the blank page’s are');
  t.eq(col(f, 'resume'), [1, 1, 1, 1].map(() => 'here since the founding; this label is the whole résumé').join(), 'their résumé is this label');
  t.eq(col(f, 'id'), FOUR.split(',').map(k => 'sf' + (gen + 1) + '_' + k).join(), 'they are minted under the new building’s count, after it has moved on');
  t.eq(col(f, 'name'), named(f.seed + '|founded|' + 3 * YEAR).join(), 'under names the founding’s own week gives');
  t.ok(distinct(chairs(f).map(c => c.name)), 'each under a name of its own');
  t.eq(js([f.staffSearch, f.seatSearchCooldowns]), '[null,null]', 'the old house’s posting does not bring a candidate to the label’s door');
  const names = chairs(f).map(c => c.name);
  const letter = mailOf(f, 'founding').text;
  t.ok(letter.includes('Its staff stayed with it: ' + names.slice(0, 3).join(', ') + ' and ' + names[3] + ' took the bet on you, and sit in the new label’s chairs.'),
    'the founding letter says the staff stayed, and names the four who came (' + letter.slice(letter.indexOf('Its staff'), letter.indexOf('Its staff') + 120) + ')');
  t.ok(letter.includes('The groups you built belong to the building you left') && letter.includes('Eighteen months to prove it was you all along.'), 'and the rest of it reads as it did');
  t.eq(js(complaints(f)), '[]', 'the file has no complaint about the label’s chairs');
  // the weeks after
  const ids = col(f, 'id');
  const r = say(() => { for (let i = 0; i < 6; i++) KP.advanceWeek(f); return 'ok'; });
  t.ok(r === 'ok' && FOUR.split(',').every(k => f.seats[k] && ids.includes(f.seats[k].id)), 'six real weeks on the four are still the four (' + r + ')');
  t.ok(['vocal', 'dance', 'perf', 'scout', 'anr'].every(k => { const m = say(() => KP.seatMult(f, k)); return typeof m === 'number' && m > 0.8 && m < 1.2; }), 'and each room runs: a sat chair at its own worth, an open one at the baseline');
  t.eq(String(say(() => KP.seatMult(f, 'anr'))), '1', 'the chairs a label has not filled are open, as at any beginning');
  hire(f, 'anr', f.week);
  t.eq(js(complaints(f)), '[]', 'and one hired there since is the label’s own');
}

// ---- C. the second chance ---------------------------------------------------------------
{
  const d = full(desk('ch-door', 2 * YEAR - 10));
  const was = chairs(d).map(c => c.id);
  say(() => KP.dissolveLabel(d, 'read'));
  t.eq(js(d.seats), undefined, 'a dissolved label’s chairs took their calls: the building is empty at the door');
  d.seatSearchCooldowns = { writer: d.week };
  const chapter = (d.career || []).length + 1;   // the chapter the door opens, counted before it does
  const door = obj(say(() => KP.nextChapter(d, 'blank', { companyName: 'Second Paper' })));
  t.ok(door.ok === true && d.founded && d.founded.week === 2 * YEAR - 10, 'the fixture: the blank door founds a label that week (' + js(door).slice(0, 60) + ')');
  t.eq(col(d, 'seatId') + ' · ' + col(d, 'since'), FOUR + ' · ' + [1, 1, 1, 1].map(() => 2 * YEAR - 10).join(), 'the next building opens with its four, sat from the door’s week');
  t.eq(col(d, 'resume'), [1, 1, 1, 1].map(() => 'here since the second beginning').join(), 'a founder’s second building says so');
  t.ok(chairs(d).every(c => !was.includes(c.id)) && distinct(chairs(d).map(c => c.name)), 'new people, each under a name of their own (' + col(d, 'name') + ')');
  t.eq(col(d, 'name'), named(d.seed + '|ch' + chapter).join(), 'named by the chapter’s own key, as a second chance’s chairs always were');
  t.eq(js(d.seatSearchCooldowns), undefined, 'and the dead label’s postings are not held against the next building');
  t.eq(js(complaints(d)), '[]', 'the file has no complaint about them');
  const sal = desk('ch-salaried', 2 * YEAR - 10);
  say(() => KP.dissolveLabel(sal, 'read'));
  const sd = obj(say(() => KP.nextChapter(sal, 'salaried')));
  t.ok(sd.ok === true && !sal.founded, 'the fixture: the salaried door opens (' + js(sd).slice(0, 40) + ')');
  t.eq(col(sal, 'resume'), [1, 1, 1, 1].map(() => 'here before you came; this company is the whole résumé').join(), 'a house that hires the desk has chairs that were there first');
  t.eq(col(sal, 'since') + ' · ' + js(complaints(sal)), [1, 1, 1, 1].map(() => 2 * YEAR - 10).join() + ' · []', 'sat, on the file, from the week the desk arrived');
}

// ---- D. the week this desk began ----------------------------------------------------------
{
  const at = (chapterSince, founded) => { const s = { }; if (chapterSince) s.chapterSince = chapterSince; if (founded) s.founded = { week: founded }; return say(() => KP.deskSince(s)); };
  t.eq([at(0, 0), at(0, 100), at(150, 150), at(150, 0)].join(), '1,100,150,150', 'a first house dates from week 1, a label from its founding, a second chance from its door, founded or salaried');
  t.eq(at(150, 300), 300, 'a label founded out of a second house dates from its own founding, not from the day that house hired the desk');
  // the real road: a house folds, another hires the desk, and the desk walks out of that one
  const s = desk('ch-twice', YEAR);
  say(() => KP.dissolveLabel(s, 'read'));
  const sd = obj(say(() => KP.nextChapter(s, 'salaried')));
  const arrived = s.week;
  s.week = arrived + 2 * YEAR + 6;
  const m = obj(say(() => KP.openMandate(s, { kind: 'group', source: 'your pitch' })));
  m.status = 'lapsed';
  s.trust = 80; s.objective.status = 'met';
  s.awardHistory = [{ year: Math.ceil(s.week / YEAR), category: 'daesang', name: act(s).name, company: s.company.short, isPlayer: true }];
  act(s).debuted = true;
  s.week = arrived + 3 * YEAR;
  const second = s.company.short;
  const fr = obj(say(() => KP.foundLabel(s, 'THIRDHOUSE')));
  t.ok(sd.ok === true && fr.ok === true && s.chapterSince === arrived && s.founded.week === arrived + 3 * YEAR && s.founded.from === second, 'the fixture: hired by a second house, then walked out of it three years on (' + js(fr).slice(0, 70) + ')');
  t.eq(say(() => KP.deskSince(s)), arrived + 3 * YEAR, 'the label’s desk began the week it was founded');
  t.eq(js(say(() => KP.greenlights(s))), '[]', 'so what the second house greenlit is not on the label’s record');
  s.week += 10;
  t.eq(obj(say(() => KP.lastStatementOf(s))).weeks, 10, 'and a last statement would count the label’s own ten weeks');
  t.eq(col(s, 'since') + ' · ' + js(complaints(s)), [1, 1, 1, 1].map(() => arrived + 3 * YEAR).join() + ' · []', 'its chairs are its own, and the file agrees');
}

// ---- E. the file’s own check ---------------------------------------------------------------
{
  const s = full(desk('ch-valid', 200));
  t.eq(js(complaints(s)), '[]', 'a first house whose chairs have sat since week 1, or since they were hired, is a valid state');
  s.founded = { week: 150, from: 'HCG', warChest: 300 };
  const c = complaints(s);
  t.ok(c.length === 7 && c[0].includes('vocal') && c[0].includes('since week 1') && c.some(e => e.includes('producer') && e.includes('since week 90')),
    'a chair filed as sat since before the building opened is named, with its week (' + c.length + ': ' + String(c[0]).slice(0, 90) + ')');
  chairs(s).forEach(x => { if (x.since < 150) s.seats[x.seatId].since = 150; });
  t.eq(js(complaints(s)), '[]', 'and one sat from the very week it opened is not');
  delete s.seats;
  t.eq(js(complaints(s)), '[]', 'a house with no chairs on the file yet has nothing to answer for');
}

// ---- F. old saves -----------------------------------------------------------------------------
{
  // a label founded by walking out, saved before this version: the old house's people are in its chairs
  const s = full(desk('ch-old', 161));
  s.founded = { week: 141, from: 'HCG', warChest: 278 };
  s.company = Object.assign({}, s.company, { name: 'HOMEWARD', short: 'HOMEWARD' });   // the label's own name, not the old house's
  hire(s, 'writer', 150, { tier: 'unknown' });
  delete s.seats.dance.resume;   // a chair from before a résumé was kept
  const before = chairs(s);
  const back = load(s, '0.11.39');
  t.eq(col(back, 'id') + ' · ' + col(back, 'name') + ' · ' + col(back, 'tier'), before.map(c => c.id).join() + ' · ' + before.map(c => c.name).join() + ' · ' + before.map(c => c.tier).join(),
    'an old founded label keeps the people it has lived with: the same eight, under the same names, as well known as they were');
  t.eq(js(chairs(back).map(c => c.truth)), js(before.map(c => c.truth)), 'and each is worth what they were worth');
  t.eq(col(back, 'since'), '141,141,141,141,141,141,141,150', 'each who came across has sat in this label’s chair since the day it opened; one hired there since keeps their week');
  t.eq(resume(back, 'vocal'), js(['came across from HCG at the founding']), 'one who was “here since the beginning” at the old house is not at this one: the file says where they came from');
  t.eq(resume(back, 'anr'), js(['9 years in the industry, most recently at a mid-tier label', 'worked through a famous era', 'came across from HCG at the founding']), 'a hired one keeps the résumé they came with, and gains the line');
  t.eq(resume(back, 'writer'), js(before.filter(c => c.seatId === 'writer')[0].resume), 'the one hired at the label gains nothing');
  t.eq(resume(back, 'dance'), js(['came across from HCG at the founding']), 'and a chair with no résumé on the file is given the one true line');
  const second = full(desk('ch-old-second', 161));
  second.chapterSince = 60; second.founded = { week: 141, from: 'SECOND', warChest: 278 };
  second.seats.vocal.since = 60; second.seats.vocal.resume = ['here before you came; this company is the whole résumé'];
  t.eq(resume(load(second, '0.11.39'), 'vocal'), js(['came across from SECOND at the founding']), 'one who was “here before you” at a second house was not here before the label: that line goes too');
  t.eq((((back.seats || {}).producer || {}).works || []).length, 2, 'the records a producer made for the old house stay on their file');
  t.eq(js(complaints(back)), '[]', 'and the corrected file is a valid state');
  // files the correction is not for
  const door = desk('ch-old-door', 100);
  say(() => KP.dissolveLabel(door, 'read'));
  say(() => KP.nextChapter(door, 'blank', { companyName: 'Second Paper' }));
  door.week += 30; hire(door, 'anr', door.week - 5);
  const doorBack = load(door, '0.11.39');
  t.eq(col(doorBack, 'since') + ' · ' + col(doorBack, 'resume'), col(door, 'since') + ' · ' + col(door, 'resume'), 'a label founded through a door minted its own chairs: nothing to correct');
  const plainHouse = full(desk('ch-old-plain', 161));
  t.eq(col(load(plainHouse, '0.11.39'), 'since') + ' · ' + resume(load(plainHouse, '0.11.39'), 'vocal'), col(plainHouse, 'since') + ' · ' + resume(plainHouse, 'vocal'), 'a house that was never left has chairs that have been there since the beginning, and the file goes on saying so');
  const noFile = desk('ch-old-bare', 161);
  noFile.founded = { week: 141, from: 'HCG', warChest: 278 };
  delete noFile.seats;
  t.eq(js(load(noFile, '0.11.39').threw), undefined, 'an old label whose chairs were never looked at loads');
  // a file of this version is left as it stands, and says what is wrong with it
  const cur = load(s, KP.C.VERSION);
  t.eq(col(cur, 'since') + ' · ' + complaints(cur).length, col(s, 'since') + ' · 7', 'a file of this version is not corrected: it keeps what it holds, and the file’s own check names each chair');
}

// ---- G. the Building tab ------------------------------------------------------------------------
{
  const D = dom.load();
  const { App, el } = D;
  const draw = () => { const r = say(() => App.render()); return typeof r === 'string' ? r : el('screen').innerHTML; };
  const s = desk('ch-ui', 161);
  hire(s, 'producer', 141, { name: 'Pyo <b>Sang</b>', works: [{ week: 100, title: 'A', craft: 60 }, { week: 141, title: 'B', craft: 70 }, { week: 150, title: 'C', craft: 70 }] });
  App.state = s; App.mode = 'game'; App.tab = 'desk'; App.deskSub = 'building'; App.stack = []; App.view = null;
  const card = html => { const i = html.indexOf('Pyo &lt;b&gt;Sang&lt;/b&gt;'); return i < 0 ? 'no card for the producer (' + html.slice(0, 60) + ')' : html.slice(i, html.indexOf('data-action="seat-release"', i)); };
  t.ok(card(draw()).includes('<span class="chip">1 record for this house</span>') && card(draw()).includes('20 weeks in the chair'),
    'the card counts the records made after they sat in this house’s chair: one of the three on the file, and not the one that landed the week they came (' + card(draw()).replace(/<[^>]+>/g, '|').replace(/\|+/g, '|').slice(0, 110) + ')');
  s.seats.producer.since = 90;
  t.ok(card(draw()).includes('<span class="chip">3 records for this house</span>'), 'a chair that has been here for all of them counts all three');
  s.seats.producer.since = 155;
  t.ok(!card(draw()).includes('for this house'), 'and one with none made here shows no count');
  s.seats.producer.works = [{ title: 'undated', craft: 60 }];
  t.ok(card(draw()).includes('<span class="chip">1 record for this house</span>'), 'a record with no week on it is not taken off anybody');
  // the door says what stays behind before it is walked through
  const door = founder('ch-door-card', 3 * YEAR);
  App.state = door; App.deskSub = 'today';
  t.ok(draw().includes('Walk, and everything you built stays behind — the groups, the trainees, the staff — as the competition. This is not reversible.'), 'the card for the door names what stays behind, the staff with the rest');
  App.state = s; App.deskSub = 'building';
  // the second chair opens on the records made for this house, counted the same way
  const two = desk('ch-second', 161);
  hire(two, 'producer', 141, { name: 'Pyo Sang-cheol', works: [{ week: 100, title: 'A', craft: 60 }, { week: 141, title: 'B', craft: 70 }, { week: 150, title: 'C', craft: 70 }] });
  t.eq(js(say(() => KP.seatMade(two.seats.producer)).map(w => w.title)), '["C"]', 'the records made for this house are the ones that landed after the chair was taken');
  t.eq(String(say(() => KP.chairOpenable(two, 'producer2'))) + ' · ' + String(say(() => KP.chairOpenReason(two, 'producer2'))),
    'false · A second chair opens when Pyo Sang-cheol has 2 records for this house — 1 so far.', 'a second chair does not open on records made for another house, and the card says how many count');
  two.seats.producer.works.push({ week: 158, title: 'D', craft: 70 });
  t.eq(String(say(() => KP.chairOpenable(two, 'producer2'))), 'true', 'it opens when two have been made here');
  two.seats.producer.works = [{ week: 100, title: 'A', craft: 60 }];
  t.ok(String(say(() => KP.chairOpenReason(two, 'producer2'))).endsWith('— none so far.'), 'and with none made here it says none');
  t.eq(js(say(() => KP.seatMade({ since: 5 }))), '[]', 'a chair with no records on the file has made none');
}

t.finish();
