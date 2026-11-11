/* Suite 148 — the credits (v0.11.41, §133: the people upstairs and down the
   hall, part nine; the first of the staff given years). A chair was kept as
   a multiplier and nothing on the file said what this house did while they
   sat. Now it is read off the file, in the résumé's own voice: it says where
   they were, never what they did there. A chair that works an era is
   credited with the eras that landed after they sat, by how each closed; a
   studio chair with the records made here; the scout with who on the roster
   signed on their watch. The chair's card says it, a call from outside says
   what the industry read, and a goodbye says what the résumé takes with it.
   Found on the way: a chair that walked on an unanswered call went without
   a word.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing
   sentence fails by name; nothing here can crash or hang under a broken
   engine. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const KP = loadEngine();
const t = makeT('suite_148_credits');

// ---- the kit ------------------------------------------------------------------
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const js = x => JSON.stringify(x);
const obj = x => (x && typeof x === 'object' ? x : { threw: String(x) });
const act = s => KP.groups(s)[0] || { name: 'no act', id: 'none', releases: [], members: [] };
const desk = (seed, week) => { const s = KP.newGame(seed, null, {}); s.week = week; s.objective.status = 'met'; return s; };
// a chair as the interview leaves it on the file
const sit = (s, seatId, since, more) => { const S = obj(say(() => KP.staffSeats(s)));
  S[seatId] = Object.assign({ id: 'sf' + since + '_' + seatId.length + '31', name: 'Chair of ' + seatId, seatId, tier: 'known', knownForTag: null, since, style: 'scrappy', warmth: 60, candor: 60,
    resume: ['9 years in, most recently at a mid-tier label'], truth: { base: 0.5, gem: false, bestSeat: 'vocal' } }, more || {});
  return S[seatId]; };
// a record on a group's file: the week it landed, and how its era closed, if it has
const rec = (week, closed, more) => Object.assign({ week, songTitle: 'T' + week, receptionBand: 'solid', trophies: 0, chartPeak: 9, chartWeeks: 3, conceptId: 'cute' },
  closed ? { closed: { week: week + 5, verdict: closed, trophies: closed === 'crowned' ? 1 : 0, lastStage: 'clean', room: 'fresh' } } : {}, more || {});
const records = (s, list, promoUntil) => { const g = act(s); g.debuted = true; g.releases = list; g.promoUntil = promoUntil || 0; delete g.retiredWeek; return g; };
const credit = (s, seatId) => obj(say(() => KP.seatCredit(s, (s.seats || {})[seatId])));
const tally = c => [c.kind, c.n, c.crowned, c.warm, c.quiet, c.cold, c.running].join('/');
const full = c => String(say(() => KP.seatCreditSaid(c)));
const short = c => String(say(() => KP.seatCreditShort(c)));
const eras = (n, crowned, warm, quiet, cold, running) => ({ kind: 'eras', n, crowned: crowned || 0, warm: warm || 0, quiet: quiet || 0, cold: cold || 0, running: running || 0 });
const mailOf = (s, ind) => (s.inbox || []).filter(n => n.ind === ind)[0] || { text: 'no such letter' };
const call = (seatId, more) => Object.assign({ id: 'sc-call', kind: 'seatPoach', seatId, rivalName: 'Rival House', expiresWeek: 999 }, more || {});
const body = (s, sc) => String(say(() => KP.sceneDef('seatPoach').body(s, sc)));

// ---- A. what a chair that works an era is credited with --------------------------------
{
  ['seatCredit', 'seatCreditSaid', 'seatCreditShort', 'seatLeavesWith'].forEach(k => t.ok(typeof KP[k] === 'function', 'the engine carries KP.' + k));
  const s = desk('cr-eras', 200);
  sit(s, 'anr', 100);
  records(s, [rec(90, 'crowned'), rec(100, 'crowned'), rec(110, 'crowned'), rec(120, 'warm'), rec(130, 'quiet'), rec(140, 'cold'),
    rec(150, null, { trophies: 1 }), rec(160, null, { receptionBand: 'strong' }), rec(170, null, { receptionBand: 'miss' }), rec(180, null), rec(195, null)], 205);
  t.eq(tally(credit(s, 'anr')), 'eras/9/2/2/2/2/1', 'the eras that landed after they sat, by how each closed: the one before and the one that landed the very week are not theirs');
  t.eq(tally(credit(s, 'vocal')), 'eras/11/4/2/2/2/1', 'a chair that has been here from the first is in the room for all of them');
  sit(s, 'marketing', 190);
  t.eq(tally(credit(s, 'marketing')), 'eras/1/0/0/0/0/1', 'one who sat down last month has the one still running');
  s.week = 205;
  t.eq(tally(credit(s, 'marketing')), 'eras/1/0/0/0/0/1', 'it is still running in its last promotion week');
  s.week = 206;
  t.eq(tally(credit(s, 'marketing')), 'eras/1/0/0/1/0/0', 'an era past its last promotion week that never came to a close is read off its own record');
  s.week = 200;
  // every act of the house counts, a retired one too, and a retired act has nothing running
  const g2 = JSON.parse(JSON.stringify(act(s)));
  g2.id = 'g-second'; g2.name = 'SECOND'; g2.releases = [rec(125, 'crowned'), rec(198, null)]; g2.promoUntil = 210; g2.retiredWeek = 199;
  s.groups.push(g2);
  t.eq(tally(credit(s, 'anr')), 'eras/11/3/2/3/2/1', 'a second act’s eras count, and a retired act’s last record is not “still running”');
  delete g2.retiredWeek;
  t.eq(tally(credit(s, 'anr')), 'eras/11/3/2/2/2/2', 'two acts in promotion at once are two eras still running');
  // nothing on the file
  const none = desk('cr-none', 50);
  sit(none, 'perf', 10);
  records(none, []);
  t.eq(tally(credit(none, 'perf')) + ' · ' + js(full(credit(none, 'perf'))) + ' · ' + js(short(credit(none, 'perf'))), 'eras/0/0/0/0/0/0 · "" · ""', 'a chair with no era behind them is credited with none, and nothing is said of it');
  ['vocal', 'dance', 'perf', 'anr', 'marketing'].forEach(k => { sit(none, k, 10); t.eq(credit(none, k).kind, 'eras', 'the ' + k + ' chair works an era'); });
}

// ---- B. the words -------------------------------------------------------------------------
{
  t.eq(full(eras(9, 3, 4, 1, 1)), 'In the room for 9 eras of this house: 3 closed with a trophy, 4 warm, one quietly, one cold.', 'in full: the count, then how they closed, each kind once');
  t.eq(full(eras(9, 3, 4, 1, 0, 1)), 'In the room for 9 eras of this house: 3 closed with a trophy, 4 warm, one quietly; one still running.', 'one still in promotion is said last');
  t.eq(full(eras(5, 0, 0, 2, 3)), 'In the room for 5 eras of this house: 2 closed quietly, 3 cold.', 'the first kind named carries the word “closed”, whichever it is');
  t.eq(full(eras(3, 0, 0, 0, 3)), 'In the room for 3 eras of this house, all closed cold.', 'all one way is said in a word');
  t.eq(full(eras(3, 0, 0, 0, 2, 1)), 'In the room for 3 eras of this house: 2 closed cold; one still running.', 'but not when one is still running');
  t.eq(full(eras(2, 0, 0, 0, 0, 2)), 'In the room for 2 eras of this house, all still running.', 'two acts in promotion and nothing closed yet');
  t.eq([eras(1, 1), eras(1, 0, 1), eras(1, 0, 0, 1), eras(1, 0, 0, 0, 1), eras(1, 0, 0, 0, 0, 1)].map(full).join(' | '),
    'In the room for one era of this house, which closed with a trophy. | In the room for one era of this house, which closed warm. | In the room for one era of this house, which closed quietly. | ' +
    'In the room for one era of this house, which closed cold. | In the room for one era of this house, still running.', 'one era, each way it can stand');
  t.eq(short(eras(9, 3, 4, 1, 1)), '9 eras for this house, 3 of them closed with a trophy', 'in a clause: the count and the best of it');
  t.eq(short(eras(9, 0, 4, 4, 1)), '9 eras for this house, 4 of them closed warm', 'with no trophy the best is the warm ones');
  t.eq(short(eras(9, 1, 4, 4)), '9 eras for this house, one of them closed with a trophy', 'one trophy is “one of them”');
  t.eq(short(eras(4, 0, 0, 2, 2)), '4 eras for this house', 'with neither, the count alone');
  t.eq([eras(1, 1), eras(1, 0, 1), eras(1, 0, 0, 1), eras(1, 0, 0, 0, 0, 1)].map(short).join(' | '), 'one era for this house, closed with a trophy | one era for this house, closed warm | one era for this house | one era for this house', 'one era, in a clause');
  t.eq(short({ kind: 'records', n: 3 }) + ' | ' + short({ kind: 'records', n: 1 }) + ' | ' + js(full({ kind: 'records', n: 3 })), '3 records for this house | one record for this house | ""', 'a studio chair’s credit is its records made here; in full it is the card’s own chip');
  t.eq(full({ kind: 'floor', n: 7, of: 17, debuted: 3 }), 'Of the 17 on this house’s roster, 7 signed on their watch, and 3 of them have debuted.', 'the scout: who signed on their watch, and who of those has debuted');
  t.eq(full({ kind: 'floor', n: 7, of: 17, debuted: 1 }) + ' | ' + full({ kind: 'floor', n: 1, of: 17, debuted: 0 }), 'Of the 17 on this house’s roster, 7 signed on their watch, and one of them has debuted. | Of the 17 on this house’s roster, one signed on their watch.', 'one who has, and none who have');
  t.eq(short({ kind: 'floor', n: 7, of: 17, debuted: 3 }) + ' | ' + js(short({ kind: 'floor', n: 0, of: 17, debuted: 0 })), '7 of the 17 on this house’s roster signed on their watch | ""', 'the scout in a clause, and nothing said of a scout nobody signed under');
}

// ---- C. the scout and the studio ---------------------------------------------------------------
{
  const s = desk('cr-scout', 200);
  sit(s, 'scout', 100);
  const ids = s.roster.slice(0, 6);
  t.ok(ids.length === 6, 'the fixture: six of the roster to date (' + s.roster.length + ' on it)');
  s.roster.forEach(id => { delete s.people[id].signedWeek; s.people[id].status = 'trainee'; });
  [90, 100, 101, 150, 199].forEach((w, i) => { s.people[ids[i]].signedWeek = w; });
  s.people[ids[2]].status = 'idol'; s.people[ids[0]].status = 'idol';
  const c = credit(s, 'scout');
  t.eq([c.kind, c.n, c.of, c.debuted].join('/'), ['floor', 3, s.roster.length, 1].join('/'), 'the scout is credited with those of the roster who signed after they sat: not one from before, not one that very week, not one with no week on file');
  const gone = Object.keys(s.people).find(id => !s.roster.includes(id));
  if (gone) s.people[gone].signedWeek = 150;
  t.eq(credit(s, 'scout').n, 3, 'and with nobody who is not on the roster');
  s.roster.push('nobody-with-a-file');
  t.eq([credit(s, 'scout').n, credit(s, 'scout').of].join('/'), [3, s.roster.length - 1].join('/'), 'a roster entry with no file behind it is not counted, and breaks nothing');
  s.roster.pop();
  sit(s, 'producer', 141, { works: [{ week: 100, title: 'A' }, { week: 141, title: 'B' }, { week: 150, title: 'C' }, { week: 160, title: 'D' }] });
  t.eq(js(credit(s, 'producer')), js({ kind: 'records', n: 2 }), 'a studio chair is credited with the records made here, after they sat');
  sit(s, 'writer2', 141);
  t.eq(js(credit(s, 'writer2')), js({ kind: 'records', n: 0 }), 'a second studio chair with none made yet has none');
}

// ---- D. the Building card ----------------------------------------------------------------------
{
  const D = dom.load();
  const { App, el } = D;
  const draw = () => { const r = say(() => App.render()); return typeof r === 'string' ? r : el('screen').innerHTML; };
  const s = desk('cr-ui', 200);
  sit(s, 'anr', 100, { name: 'Sa <i>Bo-ra</i>' });
  sit(s, 'marketing', 198, { name: 'Joo Bo-ra' });
  sit(s, 'scout', 100, { name: 'Scout Im' });
  records(s, [rec(110, 'crowned'), rec(120, 'warm'), rec(195, null)], 205);
  s.roster.forEach(id => { delete s.people[id].signedWeek; });
  s.people[s.roster[0]].signedWeek = 150; s.people[s.roster[0]].status = 'trainee';
  App.state = s; App.mode = 'game'; App.tab = 'desk'; App.deskSub = 'building'; App.stack = []; App.view = null;
  const html = draw();
  const card = word => { const i = html.indexOf(word); return i < 0 ? 'no card for ' + word + ' (' + html.slice(0, 60) + ')' : html.slice(i, html.indexOf('data-action="seat-release"', i)); };
  t.ok(card('Sa &lt;i&gt;Bo-ra&lt;/i&gt;').includes('<div class="seat-credit" style="font-size:.72rem;color:var(--ink-dim);margin-top:4px">In the room for 3 eras of this house: one closed with a trophy, one warm; one still running.</div>'),
    'the chair’s card says what they were in the room for, under the résumé (' + card('Sa &lt;i&gt;Bo-ra&lt;/i&gt;').replace(/<[^>]+>/g, '|').replace(/\|+/g, '|').slice(-230) + ')');
  t.ok(card('Sa &lt;i&gt;Bo-ra&lt;/i&gt;').indexOf('The résumé:') < card('Sa &lt;i&gt;Bo-ra&lt;/i&gt;').indexOf('seat-credit') && card('Sa &lt;i&gt;Bo-ra&lt;/i&gt;').indexOf('seat-credit') < card('Sa &lt;i&gt;Bo-ra&lt;/i&gt;').indexOf('This chair '),
    'between the résumé and what the chair runs');
  t.ok(!card('Joo Bo-ra').includes('seat-credit'), 'a chair with nothing behind it at this house has no such line');
  t.ok(card('Scout Im').includes('Of the ' + s.roster.length + ' on this house’s roster, one signed on their watch.</div>'), 'the scout’s card says who signed on their watch');
}

// ---- E. a call from outside says what the industry read -----------------------------------------
{
  const s = desk('cr-call', 200);
  sit(s, 'vocal', 100, { name: 'Coach Shin', tier: 'known' });
  records(s, [rec(110, 'crowned'), rec(120, 'crowned'), rec(130, 'quiet')]);
  const RAISE = KP.C.HIRES.raiseCost;
  t.eq(body(s, call('vocal')), 'Coach Shin got the call — Rival House, better title, real money. This is what happens when the results carry a name: the industry reads your credits and hires your people. ' +
    'What it read: 3 eras for this house, 2 of them closed with a trophy. A raise keeps the chair (' + RAISE + '); pride keeps nothing.', 'a chair with credits here: the scene says what the industry read');
  sit(s, 'dance', 195, { name: 'Coach Nam', tier: 'a name' });
  t.eq(body(s, call('dance')), 'Coach Nam got the call — Rival House, better title, real money. Coach Nam has no credit at this house yet: the call is for the name they came in with. ' +
    'A raise keeps the chair (' + RAISE + '); pride keeps nothing.', 'a chair with none here and a name in the trades: the call is for the name, and the scene does not say the industry read credits');
  sit(s, 'marketing', 195, { name: 'Joo Bo-ra', tier: 'known' });
  t.ok(body(s, call('marketing')).includes('Joo Bo-ra has no credit at this house yet: the call is for the name they came in with.'), 'a known name counts as a name');
  sit(s, 'perf', 195, { name: 'Director Baek', tier: 'working' });
  t.eq(body(s, call('perf')), 'Director Baek got the call — Rival House, better title, real money. The call is not for a credit or a name: a house this far behind has its chairs called. ' +
    'A raise keeps the chair (' + RAISE + '); pride keeps nothing.', 'a chair with neither is only ever called in the red weeks, and the scene says so');
  sit(s, 'anr', 195, { name: 'Sa Bo-ra', tier: 'unknown' });
  t.ok(body(s, call('anr')).includes('The call is not for a credit or a name'), 'an unknown likewise');
  sit(s, 'perf', 100, { name: 'Director Baek', tier: 'working' });
  t.ok(body(s, call('perf')).includes('What it read: 3 eras for this house, 2 of them closed with a trophy.'), 'a working name with credits here is read on them');
  sit(s, 'producer', 100, { name: 'Pyo Sang-cheol', tier: 'a name', works: [{ week: 110, title: 'A' }, { week: 120, title: 'B' }] });
  t.ok(body(s, call('producer')).includes('the industry reads your credits and hires your people. What it read: 2 records for this house. A raise'), 'a house producer is read on the records made here');
  sit(s, 'scout', 100, { name: 'Scout Yoon', tier: 'known' });
  s.roster.forEach(id => { delete s.people[id].signedWeek; });
  s.people[s.roster[0]].signedWeek = 150; s.people[s.roster[1]].signedWeek = 160;
  t.ok(body(s, call('scout')).includes('What it read: 2 of the ' + s.roster.length + ' on this house’s roster signed on their watch. A raise'), 'a scout on who signed on their watch');
  delete s.seats.scout;
  t.ok(body(s, call('scout')).startsWith('Your head scout got the call — Rival House, better title, real money. This is what happens when the results carry a name: the industry reads your credits and hires your people. A raise'),
    'a call for a chair that has since emptied reads as it always did, and does not crash');
}

// ---- F. the goodbyes ------------------------------------------------------------------------------
{
  const mk = (seed) => { const s = desk(seed, 200); s.budget = 500; sit(s, 'vocal', 100, { name: 'Coach Shin', tier: 'working' }); records(s, [rec(110, 'crowned'), rec(120, 'warm'), rec(130, 'quiet')]); return s; };
  const SENT = ' On the résumé that leaves with Coach Shin: 3 eras for this house, one of them closed with a trophy.';
  t.eq(String(say(() => KP.seatLeavesWith(mk('cr-leaves'), mk('cr-leaves').seats.vocal))), SENT, 'what a chair takes out of the door, in one sentence');
  const bare = mk('cr-leaves-none'); records(bare, []);
  t.eq(js(say(() => KP.seatLeavesWith(bare, bare.seats.vocal))), '""', 'and nothing when there is nothing to take');
  // let go
  const a = mk('cr-letgo');
  const ra = obj(say(() => KP.releaseSeat(a, 'vocal')));
  const la = mailOf(a, 'seatReleased').text;
  t.ok(ra.ok === true && !a.seats.vocal && la.startsWith('Coach Shin and the company part ways') && la.endsWith('Firing into the fog is still firing.' + SENT), 'a chair let go: the letter ends on what the résumé takes with it (' + la.slice(-120) + ')');
  const a0 = mk('cr-letgo-none'); records(a0, []);
  say(() => KP.releaseSeat(a0, 'vocal'));
  t.ok(mailOf(a0, 'seatReleased').text.endsWith('Firing into the fog is still firing.'), 'one let go with nothing behind them: the letter reads as it did');
  // replaced at the interview
  const b = mk('cr-replaced');
  const cand = { id: 'sf200_9', name: 'Im Ha-eun', seatId: 'vocal', tier: 'unknown', knownForTag: null, resume: ['x'], style: 'scrappy', warmth: 50, candor: 50, truth: { base: 0.5, gem: false, bestSeat: 'vocal' } };
  const rb = obj(say(() => KP.sceneDef('theInterview').resolve(b, { id: 'sc-int', kind: 'theInterview', cand }, 'hire')));
  const lb = mailOf(b, 'seatFilled').text;
  t.ok(typeof rb.toast === 'string' && b.seats.vocal.name === 'Im Ha-eun' && lb.includes('taking the chair from Coach Shin — severance paid, and the building notices chairs.' + SENT + ' What the hire actually is, only the months will say'),
    'a chair replaced at an interview: the letter says what the one who leaves takes (' + lb.slice(40, 240) + ')');
  const b0 = mk('cr-hired-open'); delete b0.seats.vocal;
  say(() => KP.sceneDef('theInterview').resolve(b0, { id: 'sc-int', kind: 'theInterview', cand }, 'hire'));
  t.ok(mailOf(b0, 'seatFilled').text === 'Im Ha-eun signs on as head vocal coach. What the hire actually is, only the months will say: the results arrive tangled with everything else, which is the whole job of judging them.', 'a hire into an open chair reads as it did');
  // walked on the call
  const c = mk('cr-walked');
  const rc = obj(say(() => KP.sceneDef('seatPoach').resolve(c, call('vocal'), 'walk')));
  const lc = mailOf(c, 'seatWalked').text;
  t.ok(typeof rc.toast === 'string' && !c.seats.vocal && lc === 'Coach Shin goes to Rival House with a leaving speech that thanks everyone and a start date that says everything.' + SENT +
    ' The chair is open, and whether that is a loss or a mercy is exactly the thing nobody will ever know for certain.', 'a chair that takes the offer: the letter says what goes with them (' + lc.slice(100, 220) + ')');
  // kept with a raise: nobody leaves, nothing is said
  const k = mk('cr-kept');
  say(() => KP.sceneDef('seatPoach').resolve(k, call('vocal'), 'raise'));
  t.ok(!!k.seats.vocal && !(k.inbox || []).some(n => /On the résumé that leaves/.test(n.text)), 'a chair kept with a raise takes nothing anywhere');
}

// ---- G. the call left unanswered ---------------------------------------------------------------------
{
  const s = desk('cr-lapsed', 200);
  sit(s, 'vocal', 100, { name: 'Coach Shin', tier: 'known' });
  records(s, [rec(110, 'crowned'), rec(120, 'warm')]);
  const walkedBefore = obj(say(() => KP.hiresLedger(s))).walked || 0;
  const n = obj(say(() => KP.sceneDef('seatPoach').expire(s, call('vocal'))));
  t.eq(n.text, 'The offer sat on the desk until it answered itself: Coach Shin signed with Rival House, and the head vocal coach chair is open. On the résumé that leaves with Coach Shin: 2 eras for this house, one of them closed with a trophy.',
    'a call left unanswered: the chair goes, and a letter says who took them, which chair is open, and what went with them');
  t.eq([n.kind, n.ind, n.priority].join('/'), 'company/seatLapsed/critical', 'it is said once, and the week’s budget cannot cut it');
  t.ok(!s.seats.vocal && (KP.hiresLedger(s).walked || 0) === walkedBefore + 1, 'and the chair is open, counted as walked');
  t.eq(js(say(() => KP.sceneDef('seatPoach').expire(s, call('vocal')))), 'null', 'a call for a chair already empty lapses without a word');
  // and the house that took them has it on its books, as when the offer is taken at the desk
  const b = desk('cr-lapsed-books', 200);
  sit(b, 'dance', 100, { name: 'Coach Nam' });
  const house = KP.signingHouses(b)[0] || { short: 'no house', name: 'no house' };
  say(() => KP.sceneDef('seatPoach').expire(b, call('dance', { rivalName: house.name, rivalShort: house.short })));
  t.ok((house.directed || []).some(a => a.kind === 'theyHiredOurStaff' && a.week === 200), 'the house that took them holds it on its books (' + house.short + ')');
  // through the real week: the scene on the Desk, unanswered, and the letter lands
  const r = desk('cr-lapsed-real', 60);
  sit(r, 'anr', 20, { name: 'Sa Bo-ra', tier: 'known' });
  const opened = obj(say(() => KP.openScene(r, { kind: 'seatPoach', seatId: 'anr', rivalName: 'Rival House', expiresWeek: 61 })));
  let landed = null, wrote = 0;
  for (let i = 0; i < 4 && !landed; i++) {
    const kept = say(() => KP.advanceWeek(r));
    wrote += (KP.lastTickNotes || []).filter(x => x.ind === 'seatLapsed').length;
    landed = (Array.isArray(kept) ? kept : []).find(x => x.ind === 'seatLapsed') || null;
  }
  t.ok(!!opened.id && wrote === 1 && !!landed && landed.text.startsWith('The offer sat on the desk until it answered itself: Sa Bo-ra signed with Rival House, and the A&R lead chair is open.') && !r.seats.anr,
    'two real weeks with the offer unanswered: one letter is written, it lands, and the chair is open (' + String(landed && landed.text).slice(0, 90) + ')');
}

t.finish();
