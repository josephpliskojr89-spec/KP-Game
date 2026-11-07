/* Suite 116 — the offers tab (v0.11.6, §97). Owner: "it's taking up the
   whole feed on the desk. I want an offers tab where all of the stages,
   endorsement opportunities, etc goes and shows a number each week for the
   number of offers to check." The read is pure and counts every ask the
   market makes; the tab carries the count; Today keeps the decisions and
   points at the tab in one line; the cards keep their buttons; a render
   writes nothing. */
'use strict';
const { makeT } = require('./load_engine');
const dom = require('./dom_stub');
const t = makeT('suite_116_offers');
const D = dom.load();
const KP = D.KP, App = D.App, el = D.el;

App.resetDrafts();
App.state = KP.newGame('offers-tab', 'Offers', { door: 'current' });
App.mode = 'game';
const s = App.state;
for (let w = 0; w < 6; w++) { s.budget = Math.max(s.budget, 3000); KP.advanceWeek(s); }
const g = KP.groups(s).find(x => x.debuted && !x.retiredWeek && x.members.length >= 2);
t.ok(!!g, 'the current door opens with a debuted act');
const a = s.people[g.members[0]], b = s.people[g.members[1]];
// the market's asks: two stages (one fresh, one older), a brand call, a casting call, a festival bill, a broadcaster's invitation
const B = KP.C.BOOK, O = KP.C.OUTSIDE;
s.bookings = (s.bookings || []).filter(o => o.taken);
s.bookings.push({ id: 'ob-fresh', kindId: 'clubNight', label: 'a Gimhae club-circuit night', week: s.week + 2, fee: 4, expiresWeek: s.week + B.expireWeeks });
s.bookings.push({ id: 'ob-old', kindId: 'busking', label: 'a busking permit — Pohang riverside', week: s.week + 3, fee: 0, expiresWeek: s.week + 1 });
s.outsideOffers = (s.outsideOffers || []).concat([
  { id: 'oo-brand', kind: 'brand', label: 'Léore (cosmetics)', personId: a.id, lump: 10, weekly: 2, weeks: 12, expiresWeek: s.week + O.expiresWeeks },
  { id: 'oo-panel', kind: 'panel', label: 'Off-Duty', personId: b.id, weeks: 10, weekly: 3, expiresWeek: s.week + 1 },
]);
const fest = KP.C.FESTS.LIST[0];
KP.openScene(s, { kind: 'festivalInvite', groupId: g.id, festivalId: fest.id, headline: false, expiresWeek: s.week + 2 });
// a decision that must stay on Today: the renewal table
a.contract = a.contract || { start: 1, years: KP.C.CONTRACT.years, term: 1 };
KP.openScene(s, { kind: 'renewal', personId: a.id, expiresWeek: s.week + 3 });

// ---- the read -------------------------------------------------------------------
const read = KP.offersRead(s);
t.eq(read.count, 5, 'five asks on the table (two stages, two calls, one bill)');
t.eq(read.fresh, 3, 'three arrived this week (the fresh stage, the brand call, the bill)');
t.ok(read.stages.length === 2 && read.stages[0].id === 'ob-old' && read.stages[1].id === 'ob-fresh' && read.stages[1].fresh && !read.stages[0].fresh, 'stages sort by answer-by, soonest first, the fresh one marked');
t.ok(read.outside.length === 2 && read.outside[0].id === 'oo-panel' && read.outside[1].fresh, 'the calls likewise');
t.ok(read.scenes.length === 1 && read.scenes[0].kind === 'festivalInvite', 'the festival bill is an offer; the renewal table is not');
t.ok(!s.bookings.some(o => o.fresh) && !s.outsideOffers.some(o => o.fresh), 'the read marks copies, never the state');

// ---- the Desk: Today keeps the decisions and points at the tab ------------------------
const snap = JSON.stringify(s);
App.view = null; App.tab = 'desk'; App.deskSub = 'today'; App.render();
const today = el('screen').innerHTML;
t.ok(/data-sub="offers">Offers<span class="badge">5<\/span>/.test(today), 'the sub-tab carries the count');
t.ok(/5 offers on the table — 3 new this week — the Offers tab\./.test(today), 'Today says how many wait, in one line');
t.ok(!/data-action="take-booking"/.test(today) && !/data-action="outside-accept"/.test(today), 'no stage or call card on Today');
t.ok(/the renewal table/.test(today) && /data-action="scene-opt"/.test(today), 'the renewal table still waits on Today');
t.ok(!/the festival/i.test(today.split('Waiting on your answer')[1] || '') || !/festivalInvite/.test(today), 'the festival bill is not on Today’s rail');
App.deskSub = 'offers'; App.render();
const offers = el('screen').innerHTML;
t.ok(/5 offers waiting · 3 new this week · soonest answer first/.test(offers), 'the tab leads with the count');
t.ok(/Stages · 2/.test(offers) && /Bills and broadcasters · 1/.test(offers) && /Endorsements and second jobs · 2/.test(offers), 'three kickers with their counts');
t.ok((offers.match(/data-action="take-booking"/g) || []).length >= 2 && (offers.match(/data-action="outside-accept"/g) || []).length === 2 && /data-action="scene-opt"/.test(offers), 'every card keeps its buttons');
t.ok(/class="chip hot">new<\/span>/.test(offers), 'fresh asks wear the new chip');
t.ok(!/the renewal table/.test(offers), 'and the renewal table is not among them');
t.eq(JSON.stringify(s), snap, 'rendering both tabs wrote nothing to state');
const BAD = /undefined|NaN|\{[Ss]he\}|\{[Hh]er\}|\{[Pp]os\}|\[object/;
t.ok(!BAD.test(today) && !BAD.test(offers), 'no page leaks a token');

// ---- the buttons work from the tab, and the count follows ------------------------
D.click({ action: 'outside-decline', id: 'oo-panel' });
D.click({ action: 'take-booking', offer: 'ob-fresh', group: g.id });
const after = KP.offersRead(s);
t.eq(after.count, 3, 'a pass and a booking taken from the tab drop the count');
App.render();
t.ok(/data-sub="offers">Offers<span class="badge">3<\/span>/.test(el('screen').innerHTML), 'and the badge follows');
// the empty tab
s.bookings = s.bookings.filter(o => o.taken);
s.outsideOffers = [];
s.scenes = s.scenes.filter(sc => sc.kind !== 'festivalInvite');
App.render();
const empty = el('screen').innerHTML;
t.ok(/Nothing on the table this week/.test(empty) && !/<span class="badge">/.test(empty), 'an empty tab says so, and the badge is gone');

t.finish();
