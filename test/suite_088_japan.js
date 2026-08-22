/* Suite 088 — the Japan cycle (v0.10.8, §80 finding 4). The second
   discography on its own calendar: the partner call past the warmth
   line, the JP lane claiming real in-country weeks, the Nichion
   board against the titans, the partner's cut off the top, and the
   hall-arena-DOME ladder as the crown. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_088_japan');

function warmWorld(seed) {
  const s = KP.newGame(seed, null, { legacy: true });
  s.budget = 900;
  KP.regionsOf(s.groups[0]).jp = 50;
  return s;
}
function signed(seed) {
  const s = warmWorld(seed);
  let sc = null, guard = 0;
  while (!sc && guard++ < 40) { KP.advanceWeek(s); sc = (s.scenes || []).find(x => x.kind === 'partnerDeal'); }
  KP.resolveScene(s, sc.id, 'sign');
  const g = s.groups[0];
  g.prep = null; g.promoUntil = 0; g.tour = null;
  return { s, g };
}

// ---- the partner call ---------------------------------------------------
{
  const s = warmWorld('jp-call');
  let sc = null, guard = 0;
  while (!sc && guard++ < 40) { KP.advanceWeek(s); sc = (s.scenes || []).find(x => x.kind === 'partnerDeal'); }
  t.ok(sc && sc.partner, 'past the warmth line, the partner flies in (' + (sc && sc.partner) + ')');
  KP.resolveScene(s, sc.id, 'sign');
  t.ok(s.jpPartner && s.jpPartner.name === sc.partner, 'the second discography exists');
  t.eq(s.jpLedger.signed, 1, 'ledgered');
}
{
  // a label nobody in Japan has heard of gets no meeting
  const s = KP.newGame('jp-cold', null, { legacy: false, door: 'fresh' });
  for (let i = 0; i < 20; i++) KP.advanceWeek(s);
  t.ok(!(s.scenes || []).some(x => x.kind === 'partnerDeal') && !s.jpPartner,
    'the market across the water does not call cold rooms');
}

// ---- the lane: real weeks, really claimed -------------------------------
{
  const s = warmWorld('jp-gate');
  const g = s.groups[0];
  g.prep = null; g.promoUntil = 0;
  t.ok(!KP.planJapanRelease(s, g.id, 'version').ok, 'nobody runs Japan alone — the partnership first');
}
{
  const { s, g } = signed('jp-lane');
  const r = KP.planJapanRelease(s, g.id, 'version');
  t.ok(r.ok, 'the lane opens');
  t.ok(g.jpAway && g.jpAway.until > s.week, 'and claims real in-country weeks');
  t.ok(!KP.tourEligible(s, g).ok, 'no tour from Tokyo');
  t.ok(!KP.planDebut(s, { groupId: g.id, songId: 'x', promo: 'modest', week: s.week + 6,
    alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } }).ok, 'no Korean release either — one country at a time');
  t.ok(!KP.planJapanRelease(s, g.id, 'original').ok, 'and no double-booking the lane');
}

// ---- the release: the board, the cut, the growth ------------------------
{
  const { s, g } = signed('jp-drop');
  const warmth0 = KP.regionsOf(g).jp;
  const b0 = s.budget - KP.C.JAPAN.LANES.version.cost;
  KP.planJapanRelease(s, g.id, 'version');
  let guard = 0;
  while (g.jpAway && guard++ < 8) KP.advanceWeek(s);
  t.eq(s.jpLedger.releases, 1, 'the record posts');
  const note = s.inbox.find(n => n.ind === 'jpRelease');
  t.ok(note && /Nichion weekly/.test(note.text), 'to the Nichion weekly, against the titans');
  t.ok(/’s cut/.test(note.text), 'with the partner’s cut named out loud');
  t.ok(KP.regionsOf(g).jp > warmth0, 'the room over there warms');
  t.ok((g.jpFans || 0) > 0, 'and the ladder fanbase starts counting');
  t.ok(!KP.planJapanRelease(s, g.id, 'version').ok, 'the partner paces the market — cooldown holds');
}

// ---- the ladder: the dome is a crown ------------------------------------
{
  const { s, g } = signed('jp-dome');
  g.jpFans = KP.C.JAPAN.LADDER[2].at + 200;
  g.jpRung = 1;   // arena already played; the next rung is the one
  KP.planJapanRelease(s, g.id, 'original');
  let guard = 0;
  while (g.jpAway && guard++ < 10) KP.advanceWeek(s);
  t.eq(s.jpLedger.domes, 1, 'THE DOME');
  t.ok(KP.getNarrative(s, 'domeNight', 'group', g.id), 'and the industry’s one unarguable list gains a name');
  t.ok(s.inbox.some(n => n.ind === 'jpDome'), 'fifty thousand lightsticks, on the record');
}
{
  // the first rung: the hall, bought with the first real fanbase
  const { s, g } = signed('jp-hall');
  g.jpFans = KP.C.JAPAN.LADDER[0].at - 50;
  KP.planJapanRelease(s, g.id, 'original');
  let guard = 0;
  while (g.jpAway && guard++ < 10) KP.advanceWeek(s);
  t.ok((g.jpRung != null && g.jpRung >= 0) || s.inbox.some(n => n.ind === 'jpRung'),
    'the original’s fans buy the first rung');
}

// ---- determinism --------------------------------------------------------
{
  const a = KP.newGame('jp-fork', null, { legacy: true });
  KP.regionsOf(a.groups[0]).jp = 50;
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the Japan cycle forks clean');
}

t.finish();
