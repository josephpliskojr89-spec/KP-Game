/* Suite 157 — the call left unanswered (v0.11.52, §145; the owner's ruling, §136: 13).
   A rival house calls for one of ours, a chair or a road manager, and the call sits on the Desk for two weeks. Left
   unanswered, they went, and nothing else followed. The owner: "Add contextual trust and relationship consequences
   when the player ignores a poaching approach. Consequences should reflect the employee's importance, existing
   relationships, and circumstances rather than imposing an arbitrary universal penalty."
   So the silence is weighed off the file the day the window closes. Who was called: a chair with a credit at this
   house, or a road manager a year or more with the group, matters here. What stood between them and the desk: the
   desk is bound to one it had kept before with a raise. Where the house stood: with a till that could not have
   matched the offer, or the creditors' letters out, nothing is held against the desk. It costs a point upstairs
   where they matter, and a point more where the desk was bound. The members' files take it for a road manager, and
   the chairs down the hall note it for a chair, and are dearer to keep for a year.

   Laws (§99): a fixture forces every gate and rolls nothing; a missing sentence fails by name; nothing here can
   crash or hang under a broken engine. The rule and the sums here are the suite's own. */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEngine, makeT } = require('./load_engine');
const dom = require('./dom_stub');
const KP = loadEngine();
const t = makeT('suite_157_unanswered');
const Y = KP.C.WEEKS_PER_YEAR;

// ---- the kit ------------------------------------------------------------------
const say = fn => { try { return fn(); } catch (e) { return 'threw: ' + e.message; } };
const js = x => JSON.stringify(x);
const obj = x => (x && typeof x === 'object' ? x : { threw: String(x), text: 'threw: ' + String(x), toast: 'threw: ' + String(x) });
const act = s => KP.groups(s)[0] || { name: 'no act', id: 'none', releases: [], members: [] };
// a salaried desk in a given week, its directive settled, the till full, the desk at 55 upstairs
const desk = (seed, week) => { const s = KP.newGame(seed, null, {}); s.week = week; s.objective.status = 'met'; s.budget = 500; s.trust = 55; return s; };
const sit = (s, seatId, since, more) => { const S = obj(say(() => KP.staffSeats(s)));
  S[seatId] = Object.assign({ id: 'sf' + since + '_' + seatId, name: 'Chair of ' + seatId, seatId, tier: 'known', knownForTag: null, since, style: 'scrappy', warmth: 60, candor: 60,
    resume: ['9 years in the industry, most recently at a mid-tier label'], truth: { base: 0.5, gem: false, bestSeat: 'vocal' } }, more || {});
  return S[seatId]; };
const rec = (week, closed) => Object.assign({ week, songTitle: 'T' + week, receptionBand: 'solid', trophies: 0, chartPeak: 9, chartWeeks: 3, conceptId: 'bright' },
  closed ? { closed: { week: week + 5, verdict: closed, trophies: closed === 'crowned' ? 1 : 0, lastStage: 'clean', room: 'fresh' } } : {});
const records = (s, list) => { const g = act(s); g.debuted = true; g.releases = list; g.promoUntil = 0; delete g.retiredWeek; return g; };
// a call that has stood a morning with its raise in the till, as the week's last rail marks one; SHORT is one that has not
const call = (seatId, more) => Object.assign({ id: 'sc-call', kind: 'seatPoach', seatId, rivalName: 'Rival House', expiresWeek: 999, tillHeld: true }, more || {});
const vanCall = (s, more) => Object.assign({ id: 'sc-van', kind: 'seatPoach', groupId: act(s).id, rivalName: 'Rival House', expiresWeek: 999, tillHeld: true }, more || {});
const SHORT = { tillHeld: undefined };
// the week's last rail, which marks a call when the till holds its raise
const rail = s => say(() => (KP.weeklyPipeline([]).find(p => p.name === 'callTill') || { fn: () => { throw new Error('no rail'); } }).fn(s));
const stand = (s, sc) => { s.scenes = (s.scenes || []).concat([sc]); return sc; };
const van = (s, since, more) => { const g = act(s); g.debuted = true; delete g.retiredWeek; g.manager = Object.assign({ name: 'Manager Oh', since }, more || {}); return g; };
const def = () => KP.sceneDef('seatPoach') || {};
const body = (s, sc) => String(say(() => def().body(s, sc)));
const options = (s, sc) => { const o = say(() => def().options(s, sc)); return Array.isArray(o) ? o.map(x => x.id + ':' + x.label).join(' | ') : String(o); };
const close = (s, sc) => obj(say(() => def().expire(s, sc)));
const answer = (s, sc, opt) => obj(say(() => def().resolve(s, sc, opt)));
const left = (s, sc) => obj(say(() => KP.callLeft(s, sc)));
const led = s => obj(say(() => KP.hiresLedger(s)));
const hall = s => Object.keys(s.seats || {}).filter(k => s.seats[k]).map(k => s.seats[k]);
const watched = s => hall(s).filter(x => x.sawUnanswered).map(x => x.seatId + ':' + x.sawUnanswered.week + ':' + x.sawUnanswered.name).sort().join(' ');
const allWatched = s => hall(s).length > 0 && hall(s).every(x => !!x.sawUnanswered);
const filed = (s, g) => g.members.map(id => (s.people[id].directed || []).filter(d => d.kind === 'managerUnanswered').map(d => d.week + '/' + d.w).join()).join(' ');
const morale = (s, g) => g.members.map(id => s.people[id].morale).join(' ');
const behind = (s, weeks) => { s.red = { weeks, arrears: weeks ? 40 : 0, rung: weeks >= 8 ? 3 : weeks ? 1 : 0, peak: weeks, total: weeks, paid: 0, episodes: weeks ? 1 : 0 }; return s; };
// the suite's own rule for what the silence costs upstairs
const owed = (matters, bound, excused) => (excused || !(matters || bound) ? 0 : (matters ? 1 : 0) + (bound ? 1 : 0));
const RAISE = 25, DEARER = 38, YEAR_OF_IT = 48;
// a chair with a credit at this house: the vocal coach, sat since week 100, with two eras landed since
const credited = (seed, more) => { const s = desk(seed, 200); sit(s, 'vocal', 100, Object.assign({ name: 'Coach Shin' }, more || {})); records(s, [rec(110, 'crowned'), rec(120, 'warm')]); return s; };
const EXEC = s => s.executive.name;
const BASE = 'The offer sat on the desk until it answered itself: Coach Shin signed with Rival House, and the head vocal coach chair is open.';
const RESUME = ' Coach Shin leaves with this on the résumé: 2 eras at HCG, one of them closed with a trophy.';
const VAN = 'The counter-offer window closed unanswered, and Manager Oh signed elsewhere. The members found out from the group chat. The silence in the van this week has a new-staff-orientation quality to it.';

// ---- A. the figures and the shape ---------------------------------------------------------------------
{
  ['callLeft', 'raiseCostFor'].forEach(k => t.ok(typeof KP[k] === 'function', 'the engine carries KP.' + k));
  const C = KP.C.HIRES.CALL || {};
  t.eq(js([C.mattersTrust, C.boundTrust, C.keepMore, C.memoryWeeks, KP.C.HIRES.raiseCost, Math.round(KP.C.HIRES.raiseCost * C.keepMore), Y]), js([-1, -1, 1.5, YEAR_OF_IT, RAISE, DEARER, 48]),
    'the figures: a point where they matter here and a point where the desk was bound; a chair who watched is half as dear again to keep, 38 for 25, for 48 weeks');
  t.eq(js(KP.C.LEDGER.KINDS.managerUnanswered), js({ w: -1, words: 'the road manager left on an offer nobody answered' }), 'a member’s file has a line for it, of the lightest weight');
  const s = desk('un-shape', 50);
  t.eq([led(s).unanswered, led(s).unansweredCharged].join('|'), '0|0', 'the staff ledger carries the two counts, at nought');
  const old = desk('un-shape-old', 50); KP.hiresLedger(old); delete old.staffLedger2.unanswered; delete old.staffLedger2.unansweredCharged;
  t.eq([led(old).unanswered, led(old).unansweredCharged].join('|'), '0|0', 'and a file from before is given them when it is read');
}

// ---- B. a chair's call, left unanswered ---------------------------------------------------------------
{
  // one who matters here, never kept
  const s = credited('un-chair');
  const others = hall(s).length - 1;
  t.eq(js([left(s, call('vocal')).who, left(s, call('vocal')).name, left(s, call('vocal')).matters, left(s, call('vocal')).bound, left(s, call('vocal')).excused, left(s, call('vocal')).weighs, left(s, call('vocal')).trust]),
    js(['chair', 'Coach Shin', true, false, null, true, -1]), 'a chair with a credit at this house matters here: left unanswered, it weighs a point upstairs');
  const n = close(s, call('vocal'));
  t.eq(n.text, BASE + RESUME + ' ' + EXEC(s) + ' noticed that nobody answered. Trust -1. The chairs down the hall watched it happen.', 'the letter that says they have gone says who noticed');
  t.eq([s.trust, n.ind, n.priority, !!s.seats.vocal, led(s).unanswered, led(s).unansweredCharged].join('|'), '54|seatLapsed|critical|false|1|1', 'a point upstairs, in the letter that could not be cut, and the ledger counts it');
  t.ok(others >= 2 && hall(s).length === others && hall(s).every(x => x.sawUnanswered && x.sawUnanswered.week === 200 && x.sawUnanswered.name === 'Coach Shin'),
    'every chair still sat has it on the file: the week, and whose call it was (' + others + ' chairs)');
  const roll = (s.staffRoll || []).filter(e => e.name === 'Coach Shin')[0] || {};
  t.eq([roll.how, roll.to].join('|'), 'lapsed|Rival House', 'and the roll says how they went, as it did');
  // and kept before
  const k = credited('un-chair-kept', { keptWeek: 150 });
  const nk = close(k, call('vocal'));
  t.eq(nk.text.slice(BASE.length + RESUME.length) + ' | ' + k.trust, ' ' + EXEC(k) + ' noticed that nobody answered, and that you had kept Coach Shin once before. Trust -2. The chairs down the hall watched it happen. | 53',
    'one the desk had kept before with a raise: two points, and the letter says why the second');
  // no credit here, never kept: nothing to hold against the desk
  const fresh = desk('un-chair-new', 200); sit(fresh, 'vocal', 195, { name: 'Coach Shin' }); records(fresh, [rec(110, 'crowned')]);
  const nf = close(fresh, call('vocal'));
  t.eq([nf.text, fresh.trust, watched(fresh), led(fresh).unanswered, led(fresh).unansweredCharged].join(' | '), BASE + ' | 55 |  | 1 | 0',
    'a chair five weeks in, with no record out since: they go, and nothing more is said, charged or noted');
  // no credit, but kept before: the desk was bound
  const b = desk('un-chair-bound', 200); sit(b, 'vocal', 195, { name: 'Coach Shin', keptWeek: 198 }); records(b, []);
  const nb = close(b, call('vocal'));
  t.eq(nb.text.slice(BASE.length) + ' | ' + b.trust + ' | ' + allWatched(b), ' ' + EXEC(b) + ' noticed that nobody answered, and that you had kept Coach Shin once before. Trust -1. The chairs down the hall watched it happen. | 54 | true',
    'one with no credit yet whom the desk had kept: a point, for the word it gave');
  // who they were the week the call came. A chair whose first record at this house came out while the call stood had
  // no credit here when it came: the card said nothing of silence, and the close weighs what the card said
  const late = desk('un-chair-late', 203); sit(late, 'vocal', 100, { name: 'Coach Shin' }); records(late, [rec(202, 'warm')]);
  const saidLate = body(late, call('vocal', { week: 200 })).includes('Left unanswered');
  const nl = close(late, call('vocal', { week: 200 }));
  const soon = desk('un-chair-soon', 203); sit(soon, 'vocal', 100, { name: 'Coach Shin' }); records(soon, [rec(202, 'warm')]);
  const saidSoon = body(soon, call('vocal', { week: 202 })).includes('Left unanswered');
  close(soon, call('vocal', { week: 202 }));
  t.eq([saidLate, /noticed that nobody answered/.test(nl.text), late.trust, saidSoon, soon.trust].join('|'), 'false|false|55|true|54',
    'a chair is read as it stood the week the call came: a record out while the call stood is not a credit the silence is weighed by, and one out the week it came is');
  // the till could not have matched it: the call stood no morning with the raise in the till. The till at the close is
  // not read: it holds 500 here, as it would in a week whose takings came in before the window closed
  const poor = credited('un-chair-till');
  const np = close(poor, call('vocal', SHORT));
  t.eq(np.text.slice(BASE.length + RESUME.length) + ' | ' + poor.trust + ' | ' + watched(poor) + ' | ' + led(poor).unansweredCharged + ' | ' + poor.budget, ' The till could not have matched it, and nobody holds the silence against you. | 55 |  | 0 | 500',
    'a call that stood no morning with its raise in the till: nothing is held against the desk upstairs or down the hall, whatever the till holds the day it closes');
  const spent = credited('un-chair-till-spent'); spent.budget = 0;
  close(spent, call('vocal'));
  t.eq(spent.trust, 54, 'and one that stood a morning with it is weighed, though the till is empty the day it closes');
  // the red weeks have no excuse of their own. A house with the creditors' letters out and its arrears cleared has
  // the money, and its silence weighs as any does; one with the arrears standing has an empty till (section J)
  const cool = behind(credited('un-chair-cooling'), 9); cool.red.arrears = 0;
  const nc = close(cool, call('vocal'));
  t.eq(cool.trust + ' | ' + /noticed that nobody answered\. Trust -1\./.test(nc.text) + ' | ' + left(behind(credited('un-chair-cooling2'), 11), call('vocal')).excused, '54 | true | null',
    'a house with the creditors’ letters out and money in the till is not excused: the red weeks have no excuse of their own');
  // a label the desk founded has a chair and a board upstairs, and is weighed as any house is
  const f = credited('un-chair-founder'); f.founded = { week: 150 };
  const nfo = close(f, call('vocal'));
  t.eq(nfo.text.slice(BASE.length + RESUME.length) + ' | ' + f.trust + ' | ' + allWatched(f), ' ' + EXEC(f) + ' noticed that nobody answered. Trust -1. The chairs down the hall watched it happen. | 54 | true',
    'at a label the desk founded it is weighed as anywhere: the chair upstairs notices, and so do the chairs down the hall');
  // nobody down the hall
  const alone = credited('un-chair-alone'); Object.keys(alone.seats).forEach(x => { if (x !== 'vocal') delete alone.seats[x]; });
  const na = close(alone, call('vocal'));
  t.eq(na.text.slice(BASE.length + RESUME.length) + ' | ' + alone.trust, ' ' + EXEC(alone) + ' noticed that nobody answered. Trust -1. | 54', 'with no other chair sat, nothing is said of the hall');
  // the floor
  const z = credited('un-chair-floor', { keptWeek: 150 }); z.trust = 1;
  close(z, call('vocal'));
  t.eq(z.trust, 0, 'trust does not go under its floor');
  // the other kinds of credit
  const st = desk('un-chair-studio', 200); sit(st, 'producer', 100, { name: 'Producer Ha', works: [{ week: 150, title: 'A' }] });
  const sc = desk('un-chair-scout', 200); sit(sc, 'scout', 100, { name: 'Scout Bae' }); sc.people[sc.roster[0]].signedWeek = 150;
  const sn = desk('un-chair-scout-none', 200); sit(sn, 'scout', 100, { name: 'Scout Bae' }); sn.roster.forEach(id => { sn.people[id].signedWeek = 1; });
  t.eq([left(st, call('producer')).matters, left(sc, call('scout')).matters, left(sn, call('scout')).matters].join('|'), 'true|true|false', 'a studio chair with a record made here matters, and a scout with someone signed on their watch; a scout with nobody does not yet');
  // the chair has already gone: nothing to weigh
  const gone = credited('un-chair-gone'); delete gone.seats.vocal;
  t.eq(js([say(() => KP.callLeft(gone, call('vocal'))), say(() => def().expire(gone, call('vocal'))), gone.trust]), js([null, null, 55]), 'a call for a chair that has already emptied weighs nothing and says nothing');
}

// ---- C. a road manager's --------------------------------------------------------------------------------
{
  const s = desk('un-van', 200), g = van(s, 200 - Y);
  const was = morale(s, g);
  t.eq(js([left(s, vanCall(s)).who, left(s, vanCall(s)).name, left(s, vanCall(s)).matters, left(s, vanCall(s)).bound, left(s, vanCall(s)).trust]), js(['manager', 'Manager Oh', true, false, -1]), 'a road manager a year with the group matters here');
  const n = close(s, vanCall(s));
  t.eq(n.text, VAN + ' ' + EXEC(s) + ' noticed that nobody answered. Trust -1. The members will remember who said nothing: it is on each of their files.', 'the letter says who noticed, and where it is written');
  t.eq([s.trust, !!g.manager, filed(s, g), led(s).unanswered, led(s).unansweredCharged].join(' | '), '54 | false | ' + g.members.map(() => '200/-1').join(' ') + ' | 1 | 1', 'a point upstairs, and a line on each member’s file, of the lightest weight');
  const crowd = []; for (let i = 0; i < 9; i++) crowd.push({ kind: 'company', priority: 'high', text: 'crowd ' + i });
  t.ok(n.ind === 'vanLapsed' && n.priority === 'critical' && KP.trimWeekNotes(crowd.concat([n]), KP.C.EVENTS.maxInboxPerWeek).includes(n), 'the letter lands in a crowded week: it was one the week could cut');
  t.eq(morale(s, g), was.split(' ').map(x => Math.max(0, Number(x) - KP.C.HIRES.MANAGER.poachMorale)).join(' '), 'and each member is three the lower for the goodbye, as they were');
  // under a year: as it was
  const u = desk('un-van-new', 200), gu = van(u, 200 - Y + 1);
  const nu = close(u, vanCall(u));
  t.eq([nu.text, u.trust, filed(u, gu).trim(), led(u).unanswered, led(u).unansweredCharged].join(' | '), VAN + ' | 55 |  | 1 | 0', 'a road manager a week short of a year: they go as they did, and nothing more');
  // a year, and kept before
  const k = desk('un-van-kept', 200), gk = van(k, 100, { countered: 150 });
  const nk = close(k, vanCall(k));
  t.eq(nk.text.slice(VAN.length) + ' | ' + k.trust, ' ' + EXEC(k) + ' noticed that nobody answered, and that you had kept Manager Oh once before. Trust -2. The members will remember who said nothing: it is on each of their files. | 53', 'one the desk had matched an offer for before: two points');
  // under a year, kept before
  const b = desk('un-van-bound', 200), gb = van(b, 190, { countered: 195 });
  close(b, vanCall(b));
  t.eq(b.trust + ' | ' + (filed(b, gb).split(' ').length === gb.members.length), '54 | true', 'one a few weeks in whom the desk had kept: a point, and the members’ files take it');
  // a year with the group, read the week the call came: three weeks later is too late to matter, and too late to stop mattering
  const e1 = desk('un-van-edge1', 203); van(e1, 203 - Y - 2);   // a week short of a year when the call came, in week 200
  const saidE1 = body(e1, vanCall(e1, { week: 200 })).includes('Left unanswered');
  close(e1, vanCall(e1, { week: 200 }));
  const e2 = desk('un-van-edge2', 203); van(e2, 203 - Y - 2);   // a year to the week when it came, in week 201
  const saidE2 = body(e2, vanCall(e2, { week: 201 })).includes('Left unanswered');
  close(e2, vanCall(e2, { week: 201 }));
  t.eq([saidE1, e1.trust, saidE2, e2.trust].join('|'), 'false|55|true|54', 'a road manager is read as they stood the week the call came: a week short of a year then is not weighed, though the year has turned by the close');
  // the till
  const p = desk('un-van-till', 200), gp = van(p, 100);
  const np = close(p, vanCall(p, SHORT));
  t.eq(np.text.slice(VAN.length) + ' | ' + p.trust + ' | ' + filed(p, gp).trim(), ' The till could not have matched it, and nobody holds the silence against you. | 55 | ', 'with the till short of the raise, nothing is held against the desk in the van either');
  // a label the desk founded
  const f = desk('un-van-founder', 200), gf = van(f, 100); f.founded = { week: 150 };
  const nf = close(f, vanCall(f));
  t.eq(nf.text.slice(VAN.length) + ' | ' + f.trust + ' | ' + (filed(f, gf).split(' ').length === gf.members.length), ' ' + EXEC(f) + ' noticed that nobody answered. Trust -1. The members will remember who said nothing: it is on each of their files. | 54 | true', 'at a label the desk founded the chair upstairs notices and the members remember, as anywhere');
  // the van has already found a new driver
  const gone = desk('un-van-gone', 200); delete van(gone, 100).manager;
  t.eq(js([say(() => KP.callLeft(gone, vanCall(gone))), say(() => def().expire(gone, vanCall(gone)))]), js([null, null]), 'a call for a manager who has already gone weighs nothing');
}

// ---- C2. the till, as the desk saw it ------------------------------------------------------------------
{
  const ph = KP.weeklyPipeline([]);
  t.eq([ph[ph.length - 1].name, ph.filter(p => p.name === 'callTill').length, ph.findIndex(p => p.name === 'callTill') > ph.findIndex(p => p.name === 'hires')].join('|'), 'callTill|1|true',
    'the week ends on the rail that reads the till: after the week’s takings and bills, and after the rail that opens a call');
  // exactly the raise, and a won short
  const a = credited('un-till-a'); a.budget = RAISE; const ca = stand(a, call('vocal', SHORT)); rail(a);
  const b = credited('un-till-b'); b.budget = RAISE - 1; const cb = stand(b, call('vocal', SHORT)); rail(b);
  t.eq([ca.tillHeld === true, cb.tillHeld === true, left(a, ca).excused, left(b, cb).excused].join(), 'true,false,,till', 'a week that ends with exactly the raise in the till marks the call, and one a won short does not');
  // the mark stays when the till falls, and a later week can still give it
  a.budget = 0; rail(a); b.budget = 300; rail(b);
  t.eq([ca.tillHeld === true, cb.tillHeld === true].join(), 'true,true', 'the mark stays when the till runs down, and a call not yet marked is marked by a later week that ends with the raise');
  // clear of what the house owes
  const c = behind(credited('un-till-c'), 3); c.budget = 100; c.red.arrears = 76; const cc = stand(c, call('vocal', SHORT)); rail(c);
  const d = behind(credited('un-till-d'), 3); d.budget = 100; d.red.arrears = 75; const cd = stand(d, call('vocal', SHORT)); rail(d);
  t.eq([cc.tillHeld === true, cd.tillHeld === true].join(), 'false,true', 'the till is read clear of the arrears: a hundred with seventy-six owed does not hold the raise, and with seventy-five owed it does');
  // a file with no red counter owes nothing, and none is written on it
  const n = credited('un-till-nored'); delete n.red; const cn = stand(n, call('vocal', SHORT)); rail(n);
  t.eq([cn.tillHeld === true, 'red' in n].join(), 'true,false', 'a file with no red counter owes nothing, and reading the till writes none on it');
  // the dearer raise is the one the till must hold
  const w = credited('un-till-dear'); sit(w, 'dance', 100, { name: 'Coach Nam', sawUnanswered: { week: 195, name: 'Coach Shin' } });
  w.budget = DEARER - 1; const cw = stand(w, call('dance', SHORT)); rail(w); const at37 = cw.tillHeld === true;
  w.budget = DEARER; rail(w);
  t.eq([at37, cw.tillHeld === true].join(), 'false,true', 'for a chair who watched, the till must hold the dearer raise: 37 does not mark the call, and 38 does');
  // a road manager's call, and nothing that is not a call
  const v = desk('un-till-van', 200); van(v, 100); const cv = stand(v, vanCall(v, SHORT)); const other = stand(v, { id: 'sc-other', kind: 'theInterview' }); rail(v);
  t.eq([cv.tillHeld === true, 'tillHeld' in other].join(), 'true,false', 'a road manager’s call is marked the same way, and no other scene is');
}

// ---- D. the rule, by the suite's own table --------------------------------------------------------------
{
  const got = [], want = [];
  [true, false].forEach(matters => [true, false].forEach(bound => [null, 'till'].forEach(excused => [false, true].forEach(founded => {
    const s = desk('un-rule', 200);
    sit(s, 'vocal', matters ? 100 : 199, Object.assign({ name: 'Coach Shin' }, bound ? { keptWeek: 150 } : {}));
    records(s, [rec(110, 'crowned')]);
    if (founded) s.founded = { week: 50 };
    const sc = call('vocal', excused === 'till' ? SHORT : {});
    const l = left(s, sc);
    close(s, sc);
    got.push([l.matters, l.bound, l.excused, -l.trust, 55 - s.trust].join('/'));
    want.push([matters, bound, excused, owed(matters, bound, excused), owed(matters, bound, excused)].join('/'));   // founded or salaried, the same
  }))));
  t.eq(got.join(' '), want.join(' '), 'for a chair that matters or not, kept before or not, one that stood a morning with its raise in the till or none, at a salaried house and at a label the desk founded: what the silence weighs, and what it costs, are the suite’s own, and the same at both');
  const gv = [], wv = [];
  [Y + 5, Y, Y - 1, 20].forEach(weeks => [true, false].forEach(bound => { const s = desk('un-rule-van', 300); van(s, 300 - weeks, bound ? { countered: 290 } : {}); close(s, vanCall(s)); gv.push(55 - s.trust); wv.push(owed(weeks >= Y, bound, null, false)); }));
  t.eq(gv.join(''), wv.join(''), 'and for a road manager by the weeks with the group, either side of a year, kept before or not');
}

// ---- E. the card says where it would be noticed ----------------------------------------------------------
{
  const s = credited('un-card');
  t.ok(body(s, call('vocal')).endsWith(' A raise keeps the chair (25); pride keeps nothing. Left unanswered, it will be noticed upstairs, and down the hall.'), 'a call for a chair who matters says where silence would be noticed (' + body(s, call('vocal')).slice(-80) + ')');
  const fresh = desk('un-card-new', 200); sit(fresh, 'vocal', 195, { name: 'Coach Shin' }); records(fresh, []);
  t.ok(body(fresh, call('vocal')).endsWith(' A raise keeps the chair (25); pride keeps nothing.'), 'one for a chair with nothing here yet says nothing of it');
  const v = desk('un-card-van', 200); van(v, 100);
  t.ok(body(v, vanCall(v)).endsWith('Money keeps Manager (25); nothing else will. Left unanswered, it will be noticed upstairs, and in the van.'), 'one for a road manager a year in says the van (' + body(v, vanCall(v)).slice(-70) + ')');
  const f = credited('un-card-founder'); f.founded = { week: 150 };
  t.ok(body(f, call('vocal')).endsWith(' pride keeps nothing. Left unanswered, it will be noticed upstairs, and down the hall.'), 'at a label the desk founded the card says the same: upstairs, and down the hall');
  const poor = credited('un-card-till'); poor.budget = 10;
  t.eq(body(poor, call('vocal', SHORT)).includes('Left unanswered') + ' | ' + options(poor, call('vocal', SHORT)), 'false | walk:Wish them well', 'with the till short of the raise the card offers the goodbye alone, and says nothing of silence');
  t.eq(body(poor, call('vocal')).includes('Left unanswered, it will be noticed upstairs, and down the hall.') + ' | ' + options(poor, call('vocal')), 'true | walk:Wish them well',
    'a call that stood a morning with its raise in the till still says so when the till has since run short');
  const D = dom.load();
  const App = D.KP.App, el = D.el;
  const live = credited('un-card-desk');
  say(() => KP.openScene(live, { kind: 'seatPoach', seatId: 'vocal', rivalName: 'Rival House', expiresWeek: live.week + 2 }));
  rail(live);   // the week the call came ends, and the till holds its raise
  App.state = live; App.mode = 'game'; App.tab = 'desk'; App.view = null; App.deskSub = 'today';
  const html = String(say(() => { App.render(); return el('screen').innerHTML; }));
  t.ok(html.includes('Left unanswered, it will be noticed upstairs, and down the hall.') && html.includes('Match it · 25') && html.includes('Wish them well'), 'the Desk’s card says so above the two answers');
}

// ---- F. an answer costs nothing upstairs ------------------------------------------------------------------
{
  const w = credited('un-answer-walk', { keptWeek: 150 });
  answer(w, call('vocal'), 'walk');
  t.eq([w.trust, watched(w), led(w).unanswered, !!w.seats.vocal].join('|'), '55||0|false', 'wishing them well is an answer: they go, and nothing is noticed upstairs or down the hall');
  const r = credited('un-answer-raise');
  answer(r, call('vocal'), 'raise');
  t.eq([r.trust, r.budget, r.seats.vocal.keptWeek, watched(r), led(r).unanswered].join('|'), '55|475|200||0', 'matching it is an answer: 25, and the chair remembers the week');
  const v = desk('un-answer-van', 200), gv = van(v, 100);
  answer(v, vanCall(v), 'walk');
  t.eq([v.trust, filed(v, gv).trim(), led(v).unanswered].join('|'), '55||0', 'and the same for a road manager wished well');
}

// ---- G. a chair who watched is dearer to keep ---------------------------------------------------------------
{
  const s = credited('un-dear');
  sit(s, 'dance', 100, { name: 'Coach Nam' });
  close(s, call('vocal'));
  s.trust = 55; s.week = 210;
  t.eq([KP.raiseCostFor(s, call('dance')), KP.raiseCostFor(s, vanCall(s)), options(s, call('dance'))].join(' | '), DEARER + ' | ' + RAISE + ' | raise:Match it · 38 | walk:Wish them well', 'ten weeks on, the chair who watched costs 38 to keep; a road manager costs what they did');
  t.ok(body(s, call('dance')).includes(' A raise keeps the chair (38); pride keeps nothing. Coach Nam watched Coach Shin’s call go unanswered, and is dearer to keep for it.'), 'and the card says why (' + body(s, call('dance')).slice(-150) + ')');
  // the edge of the year
  s.week = 200 + YEAR_OF_IT;
  const at = KP.raiseCostFor(s, call('dance'));
  s.week = 200 + YEAR_OF_IT + 1;
  t.eq(at + ' | ' + KP.raiseCostFor(s, call('dance')) + ' | ' + body(s, call('dance')).includes('dearer to keep'), DEARER + ' | ' + RAISE + ' | false', 'for 48 weeks, and in the 49th the raise is the raise again');
  // a till that holds the raise and not the dearer one
  s.week = 210; s.budget = DEARER - 1;
  t.eq(options(s, call('dance', SHORT)) + ' | ' + left(s, call('dance', SHORT)).excused, 'walk:Wish them well | till', 'with 37 in the till it cannot be matched: the goodbye alone, and silence would be excused');
  const tried = answer(s, call('dance'), 'raise');
  t.eq([s.budget, !!s.seats.dance, s.trust].join('|') + ' | ' + (tried.toast || '').slice(0, 17), DEARER - 1 + '|false|55 | The chair is open', 'a raise the till cannot pay keeps nobody');
  // paid
  const p = credited('un-dear-paid');
  sit(p, 'dance', 100, { name: 'Coach Nam' });
  close(p, call('vocal'));
  p.week = 210; p.trust = 55;
  const flowed = [];
  const lf = KP.ledgerFlow; KP.ledgerFlow = function (st, k, v) { flowed.push(k + ':' + v); return lf ? lf.apply(this, arguments) : undefined; };
  answer(p, call('dance'), 'raise');
  KP.ledgerFlow = lf;
  t.eq([p.budget, p.seats.dance.keptWeek, js(p.seats.dance.sawUnanswered), flowed.join()].join(' | '), [500 - DEARER, 210, js({ week: 200, name: 'Coach Shin' }), 'signings:-' + DEARER].join(' | '),
    'paid, it is 38 out of the till and through its books; the chair stays, with the week the desk kept it beside the week it watched');
  // a chair pays the dearer raise once at most. A call stands three weeks and the house is then left alone for the
  // quiet (30 weeks from the day the call came), so a third call cannot come inside the year the chair remembers
  const HR = KP.C.HIRES, STANDS = 3;
  t.ok(2 * (HR.poachCooldown + 1) - STANDS > HR.CALL.memoryWeeks, 'a chair who watched can be called once inside the year it remembers, and not twice: the quiet after a call is longer than what is left of that year (' +
    (2 * (HR.poachCooldown + 1) - STANDS) + ' weeks against ' + HR.CALL.memoryWeeks + ')');
}

// ---- H. what the chairs down the hall say of it ------------------------------------------------------------
{
  const word = (s, seatId) => obj(say(() => KP.seatYearWord(s, s.seats[seatId], {}, false)));
  const s = desk('un-word', 6 * Y + 1);
  records(s, [rec(250, 'warm')]);
  const st = sit(s, 'dance', 1, { name: 'Coach Nam', candor: 50, warmth: 50, sawUnanswered: { week: 260, name: 'Coach Shin' } });
  const by = (a, b) => { st.candor = a; const x = word(s, 'dance').second; st.candor = b; const y = word(s, 'dance').second; st.candor = a; return x + ' | ' + y; };
  t.eq(by(50, 49), 'An offer for Coach Shin sat on your desk last year until it answered itself. I watched that from down the hall. | Coach Shin’s departure last year has been noted down the hall.',
    'a chair who watched says so in its word on the year: candid at fifty, careful under it');
  const held = w => { st.sawUnanswered = { week: w, name: 'Coach Shin' }; return /Coach Shin/.test(word(s, 'dance').second) ? 'said' : 'no'; };
  t.eq([240, 241, 288, 289].map(held).join(), 'no,said,said,no', 'in the year it happened, and no other');
  st.sawUnanswered = { week: 260, name: 'Coach Shin' };
  st.keptWeek = 270;
  t.ok(/rang for me|matched an offer/.test(word(s, 'dance').second), 'a chair the desk kept that same year speaks of that first');
  delete st.keptWeek; st.postedWeek = 270;
  t.ok(/posting|advertised/.test(word(s, 'dance').second), 'and one whose chair was advertised speaks of that');
  delete st.postedWeek; st.meshNoted = 270;
  t.ok(/Coach Shin/.test(word(s, 'dance').second), 'and it comes before the corridor’s read of their method');
  // two chairs who watched do not say the same sentence
  delete st.meshNoted;
  const st2 = sit(s, 'perf', 1, { name: 'Coach Do', candor: 50, warmth: 50, sawUnanswered: { week: 260, name: 'Coach Shin' } });
  const letter = obj(say(() => KP.staffYearLetter(s)));
  const said = String(letter.text || js(letter));
  t.ok(said.includes('An offer for Coach Shin sat on your desk last year until it answered itself.') && said.includes('Coach Shin went last year on a call nobody answered.') && st2.sawUnanswered.week === 260,
    'two candid chairs who watched say it in the two wordings, in the one letter');
  // six chairs who watched, four of them candid: each wording is said once in the letter, and the rest speak of their own year
  ['vocal', 'marketing'].forEach((id, i) => sit(s, id, 1, { name: 'Candid ' + i, candor: 60, warmth: 50, sawUnanswered: { week: 260, name: 'Coach Shin' } }));
  ['anr', 'scout'].forEach((id, i) => sit(s, id, 1, { name: 'Careful ' + i, candor: 40, warmth: 50, sawUnanswered: { week: 260, name: 'Coach Shin' } }));
  const six = String(obj(say(() => KP.staffYearLetter(s))).text || '');
  const WORDS = ['An offer for Coach Shin sat on your desk last year until it answered itself. I watched that from down the hall.', 'Coach Shin went last year on a call nobody answered. I have wondered since what mine would get.',
    'Coach Shin’s departure last year has been noted down the hall.', 'The building noticed how Coach Shin’s offer ended.'];
  t.eq(WORDS.map(w => six.split(w).length - 1).join(), '1,1,1,1', 'with six chairs who watched, each of the four wordings is said once in the year’s letter, and no chair repeats another');
}

// ---- I. an older file ---------------------------------------------------------------------------------
{
  const s = credited('un-old');
  say(() => KP.openScene(s, { kind: 'seatPoach', seatId: 'vocal', rivalName: 'Rival House', expiresWeek: s.week + 2 }));
  led(s);   // the staff ledger is on the file, as a career's is from its first week
  const o = JSON.parse(KP.serialize(s));
  o.version = '0.11.51';
  const L = o.staffLedger2 || {};
  delete L.unanswered; delete L.unansweredCharged;
  // a file is read through a guard: a reading that stops says so here, by name
  const read = json => { const r = say(() => KP.deserialize(json)); return r && typeof r === 'object' && Array.isArray(r.scenes) ? r : { threw: String(r), scenes: [], seats: {}, version: 'not read' }; };
  const callOf = f => f.scenes.find(x => x.kind === 'seatPoach') || { none: true };
  const back = read(JSON.stringify(o));
  t.eq([back.version, back.threw || KP.validateState(back).length, back.scenes.filter(x => x.kind === 'seatPoach').length, hall(back).filter(x => x.sawUnanswered).length].join('|'), KP.C.VERSION + '|0|1|0', 'a file saved with a call open on the Desk reads clean, and nobody has watched anything');
  const sc = callOf(back);
  const o2 = JSON.parse(JSON.stringify(o)); o2.budget = RAISE - 1;
  const lean = read(JSON.stringify(o2)), sc2 = callOf(lean);
  const again0 = callOf(lean.threw ? lean : read(String(say(() => KP.serialize(lean)))));
  t.eq([s.scenes[0].tillHeld === true, sc.tillHeld === true, sc2.tillHeld === true, again0.tillHeld === true, !!(sc.none || sc2.none || again0.none)].join(), 'false,true,false,false,false',
    'the call on an older file is marked from the till the file was saved with: 500 holds the raise, 24 does not, and a file of this version is not marked on reading');
  if (!back.threw && !lean.threw && !sc.none && !sc2.none) {
    const n2 = close(lean, sc2);
    t.eq(lean.trust + ' | ' + String(n2.text).endsWith(' The till could not have matched it, and nobody holds the silence against you.'), '55 | true', 'the older file with the short till is not held to its silence');
    const n = close(back, sc);
    t.eq(back.trust + ' | ' + /noticed that nobody answered\. Trust -1\./.test(n.text) + ' | ' + led(back).unanswered, '54 | true | 1', 'left unanswered under this version, that call is weighed as any is');
    const again = read(String(say(() => KP.serialize(back))));
    t.eq([again.threw || KP.validateState(again).length, hall(again).length > 0 && hall(again).filter(x => x.sawUnanswered && x.sawUnanswered.name === 'Coach Shin').length === hall(again).length].join('|'), '0|true', 'and what the chairs watched comes back from a save');
  } else t.ok(false, 'the older files were not read, so their calls could not be closed: ' + (back.threw || lean.threw || 'no call on the file'));
}

// ---- J. real weeks ------------------------------------------------------------------------------------
{
  // a call opened by fixture and left on the Desk for its two weeks, in real weeks: the stage door closes it
  const run = (seed, setup, morning) => {
    const s = KP.newGame(seed, null, {});
    for (let i = 0; i < 6; i++) { (s.scenes || []).slice().forEach(sc => { const d = KP.sceneDef(sc.kind); if (d) say(() => KP.resolveScene(s, sc.id, d.options(s, sc)[0].id)); }); s.budget = 800; say(() => KP.advanceWeek(s)); }
    const sc = setup(s);
    say(() => KP.openScene(s, Object.assign({ kind: 'seatPoach', rivalName: 'Rival House', expiresWeek: s.week + 2 }, sc)));
    const was = s.trust, bad = [], letters = [];
    for (let i = 0; i < 4; i++) {
      (s.scenes || []).slice().forEach(x => { if (x.kind === 'seatPoach') return; const d = KP.sceneDef(x.kind); if (d) say(() => KP.resolveScene(s, x.id, d.options(s, x)[0].id)); });
      s.budget = 800;
      if (morning) morning(s);
      const r = say(() => KP.advanceWeek(s));
      if (typeof r === 'string') bad.push('week ' + s.week + ' ' + r);
      (KP.lastTickNotes || []).forEach(n => { if (/answered itself|closed unanswered/.test(n.text || '')) letters.push(n); });
      if (KP.validateState(s).length) bad.push('week ' + s.week + ' ' + KP.validateState(s)[0]);
    }
    return { s, was, bad, letters };
  };
  const c = run('un-weeks-chair', s => { sit(s, 'vocal', 1, { name: 'Coach Shin' }); records(s, [rec(3, 'warm')]); return { seatId: 'vocal' }; });
  const lc = c.letters[0] || { text: 'no letter' };
  t.ok(c.bad.length === 0 && c.letters.length === 1 && !c.s.seats.vocal && /noticed that nobody answered\. Trust -1\. The chairs down the hall watched it happen\.$/.test(lc.text) && lc.priority === 'critical' && c.s.inbox.some(m => m.text === lc.text) &&
    hall(c.s).length >= 1 && hall(c.s).every(x => x.sawUnanswered && x.sawUnanswered.name === 'Coach Shin') && led(c.s).unanswered === 1,
    'a chair’s call left on the Desk through real weeks closes itself: the letter lands, says who noticed, and the hall has it on file (' + (c.bad[0] || lc.text.slice(-90)) + ')');
  // the creditors' letters out and the arrears standing, in real weeks: every won that arrives pays the arrears first,
  // so the till is at nought when the window closes, and the till's excuse is the one the letter gives
  const d = run('un-weeks-red', s => { sit(s, 'vocal', 1, { name: 'Coach Shin' }); records(s, [rec(3, 'warm')]); behind(s, 8); s.red.arrears = 9000; return { seatId: 'vocal' }; });
  const ld = d.letters[0] || { text: 'no letter' };
  t.eq([d.bad.length, d.letters.length, ld.text.endsWith(' The till could not have matched it, and nobody holds the silence against you.'), led(d.s).unanswered, led(d.s).unansweredCharged, hall(d.s).filter(x => x.sawUnanswered).length, d.s.red.weeks >= 8].join('|'),
    '0|1|true|1|0|0|true', 'with the creditors’ letters out and the arrears standing, what arrives pays the arrears: the till is empty when the window closes, and nothing is held against the desk (' + (d.bad[0] || ld.text.slice(-90)) + ')');
  // a desk with nothing in the till each morning, and takings that arrive the week the call closes, before the window
  // does: the close does not read them. The takings are the suite's own, put in beside the stage door's rail
  const door = KP.weeklyPipeline([]).find(p => p.name === 'stageDoor'), doorFn = door.fn;
  let marked = 'never looked', paid = 0;
  door.fn = function (state) {
    const sc = (state.scenes || []).find(x => x.kind === 'seatPoach');
    if (sc && state.week > sc.expiresWeek) { marked = !!sc.tillHeld; state.budget += 500; paid++; }
    return doorFn.apply(this, arguments);
  };
  const lateRun = (seed, setup) => { const r = run(seed, setup, s => { s.budget = 0; }); return r; };
  const m = lateRun('un-weeks-late', s => { sit(s, 'vocal', 1, { name: 'Coach Shin' }); records(s, [rec(3, 'warm')]); return { seatId: 'vocal' }; });
  door.fn = doorFn;
  const lm = m.letters[0] || { text: 'no letter' };
  t.eq([m.bad.length, m.letters.length, marked, paid, lm.text.endsWith(' The till could not have matched it, and nobody holds the silence against you.'), led(m.s).unansweredCharged].join('|'), '0|1|false|1|true|0',
    'takings that arrive the week a call closes are not the till the desk said nothing with: no morning held the raise, and nothing is held against the desk (' + (m.bad[0] || lm.text.slice(-90)) + ')');
  const v = run('un-weeks-van', s => { const g = van(s, s.week - Y); return { groupId: g.id }; });
  const lv = v.letters[0] || { text: 'no letter' };
  t.eq([v.bad.length, v.letters.length, v.s.inbox.some(m => m.text === lv.text), lv.priority, lv.ind].join('|'), '0|1|true|critical|vanLapsed', 'a road manager’s call left on the Desk through real weeks closes itself, and its letter is one the week cannot cut');
  t.ok(v.bad.length === 0 && v.letters.length === 1 && /noticed that nobody answered\. Trust -1\. The members will remember who said nothing: it is on each of their files\.$/.test(lv.text) && v.s.inbox.some(m => m.text === lv.text) &&
    act(v.s).members.every(id => (v.s.people[id].directed || []).some(d => d.kind === 'managerUnanswered')),
    'and a road manager’s: the letter lands, and each member’s file has the line (' + (v.bad[0] || lv.text.slice(-90)) + ')');
}

// ---- K. the tools -------------------------------------------------------------------------------------
{
  const h = fs.readFileSync(path.join(__dirname, '..', 'tools', 'harness.js'), 'utf8');
  t.ok(/a call left unanswered \(v0\.11\.52\)/.test(h) && /and by this tool’s own reading of who was called it costs/.test(h) && /and by this tool’s own note of what they had watched it costs/.test(h) && /'botCall'/.test(h),
    'the census leaves some calls on the desk, reads who was called by its own count, and holds what the close cost and what a raise cost to its own notes');
  const dc = fs.readFileSync(path.join(__dirname, '..', 'tools', 'desk_count.js'), 'utf8');
  t.ok(/\n  'seatLapsed',\n/.test(dc) && /\n  'vanLapsed',\n/.test(dc), 'the tools hold both letters to the Desk: a chair’s and a road manager’s');
  t.ok(/on the members’ files, and by this tool’s own reading each is owed/.test(h) && /chairs down the hall, and by this tool’s own reading by/.test(h) && /does not say what this tool reads/.test(h),
    'and holds the members’ files, the chairs’ notes and the letter’s words to the same reading');
  t.ok(/' that weighed, and this tool noted '/.test(h) && /sl\.unanswered === cb\.left && sl\.unansweredCharged === cb\.weighed/.test(h), 'and holds the staff ledger’s two counts to its own, career by career');
  t.ok(/state\.budget - owes >= costOf\(state, sc\)\) b\.held\[sc\.id\] = true/.test(h) && /if \(!!sc\.tillHeld !== held\) violations\.push\(/.test(h) && /this tool’s own note of each morning says the other/.test(h),
    'and keeps its own note of each morning a call stood, and holds the call’s mark to it');
  t.ok(/const matters = m \? sc\.week - m\.since >= Y : credited\(state, st, sc\.week\), bound = b\.kept\[k\] != null;/.test(h), 'and reads who was called as they stood the week the call came');
}

t.finish();
