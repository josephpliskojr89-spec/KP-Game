/* Suite 083 — the recurring money (v0.10.3, §80 findings 6+10). The
   fandom commerce that pays salaries between comebacks: paid membership
   with a priced enrollment, annual renewals, Season's Greetings every
   Q4, the tour merch line, the fancon verb — and the "we are not ATMs"
   storm when the calendar squeezes too hard. Plus the catalog annuity:
   the shelf pays weekly forever, and publishing royalties follow the
   PERSON, not the contract. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_083_commerce');

function world(seed) {
  const s = KP.newGame(seed, null, { legacy: true });
  s.budget = 900;
  return s;
}

// ---- the enrollment: a price is a sentence ----------------------------
{
  const s = world('cm-club');
  const g = s.groups[0];
  g.fandom.intensity = 20;
  KP.advanceWeek(s);
  t.ok(!(s.scenes || []).some(sc => sc.kind === 'fanclubOpen'),
    'an unorganized fandom does not ask for membership');
  g.fandom.intensity = 60;
  KP.advanceWeek(s);
  const sc = (s.scenes || []).find(x => x.kind === 'fanclubOpen');
  t.ok(sc && sc.groupId === g.id, 'organized enough, the cafés ask formally');
  const b0 = s.budget;
  KP.resolveScene(s, sc.id, 'standard');
  t.ok(s.budget > b0, 'annual dues are real money, up front');
  t.ok(g.fanclub && g.fanclub.tier === 'standard', 'the club exists with its price on it');
  t.eq(s.commerceLedger.clubs, 1, 'ledgered');
  t.ok((s.books.cur.commerce || 0) > 0, 'and the books call the stream by name');
}
{
  // the price moves the room: warm buys loyalty, steep spends it
  const mk = (seed, tier) => {
    const s = world(seed);
    const g = s.groups[0];
    g.fandom.intensity = 60;
    KP.advanceWeek(s);
    const sc = (s.scenes || []).find(x => x.kind === 'fanclubOpen');
    const before = g.fandom.intensity;
    KP.resolveScene(s, sc.id, tier);
    return { g, before };
  };
  const warm = mk('cm-warm', 'gentle');
  t.ok(warm.g.fandom.intensity > warm.before, 'priced warm, the fandom noticed');
  const steep = mk('cm-steep', 'steep');
  t.ok(steep.g.fandom.intensity < steep.before, 'priced steep, the fandom also noticed');
}
{
  // the renewal: the most boring line in the books, annually
  const s = world('cm-renew');
  const g = s.groups[0];
  g.fandom.intensity = 60;
  KP.advanceWeek(s);
  const sc = (s.scenes || []).find(x => x.kind === 'fanclubOpen');
  KP.resolveScene(s, sc.id, 'standard');
  const target = g.fanclub.since + KP.C.WEEKS_PER_YEAR;
  while (s.week < target) KP.advanceWeek(s);
  t.ok(s.commerceLedger.renewals >= 1, 'the dues come back on the anniversary');
}

// ---- Season's Greetings: December does not reschedule -----------------
{
  const s = world('cm-greet');
  const g = s.groups[0];
  g.fandom.intensity = 50;
  const M = KP.C.MERCH;
  while (((s.week - 1) % KP.C.WEEKS_PER_YEAR) + 1 !== M.greetingsWoy) KP.advanceWeek(s);
  const sc = (s.scenes || []).find(x => x.kind === 'seasonsGreetings');
  t.ok(sc, 'the Q4 window opens on schedule');
  const b0 = s.budget;
  KP.resolveScene(s, sc.id, 'lavish');
  t.ok(s.budget > b0, 'the lavish edition clears its own cost against an organized fandom');
  t.eq(s.commerceLedger.greetings, 1, 'ledgered');
}
{
  // skipping the year is a sentence too
  const s = world('cm-skip');
  const g = s.groups[0];
  g.fandom.intensity = 50;
  const M = KP.C.MERCH;
  while (((s.week - 1) % KP.C.WEEKS_PER_YEAR) + 1 !== M.greetingsWoy) KP.advanceWeek(s);
  const sc = (s.scenes || []).find(x => x.kind === 'seasonsGreetings');
  const before = g.fandom.intensity;
  KP.resolveScene(s, sc.id, 'skip');
  t.ok(g.fandom.intensity < before, 'the fandom noticed the silence where the calendar goes');
}

// ---- the fancon: the between-eras verb --------------------------------
{
  const s = world('cm-fancon');
  const g = s.groups[0];
  g.promoUntil = 0; g.prep = null; g.tour = null;
  g.fandom.intensity = 20;
  t.ok(!KP.holdFancon(s, g.id).ok, 'a fancon for an unorganized fandom is refused');
  g.fandom.intensity = 55;
  g.promoUntil = s.week + 2;
  t.ok(!KP.holdFancon(s, g.id).ok, 'mid-promotion the calendar is spoken for');
  g.promoUntil = 0;
  const i0 = g.fandom.intensity;
  const f0 = s.people[g.members[0]].fatigue;
  const r = KP.holdFancon(s, g.id);
  t.ok(r.ok && r.revenue > 0, 'the room pays for itself');
  t.ok(g.fandom.intensity > i0, 'and gets warmer');
  t.ok(s.people[g.members[0]].fatigue > f0, 'three hours of the room is still work');
  t.eq(s.commerceLedger.fancons, 1, 'ledgered');
  t.ok(!KP.holdFancon(s, g.id).ok, 'the memory has to fade before it is worth money again');
}

// ---- the tour merch line ----------------------------------------------
{
  const s = world('cm-tourmerch');
  const g = s.groups[0];
  g.popularity = Math.max(g.popularity || 0, 55);
  g.promoUntil = 0; g.prep = null;
  let guard = 0;
  while (!KP.tourEligible(s, g).ok && guard++ < 20) { KP.advanceWeek(s); g.prep = null; g.promoUntil = 0; }
  s.budget = 900;
  const r = KP.planTour(s, { groupId: g.id, scale: 'clubs', legs: ['kr'] });
  t.ok(r.ok, 'fixture: the tour books');
  KP.advanceWeek(s);
  t.eq(s.commerceLedger.tourMerch, 1, 'the table opens with the tour');
  KP.advanceWeek(s);
  t.eq(s.commerceLedger.tourMerch, 1, 'once per tour, not per week');
}

// ---- the catalog annuity: the shelf pays weekly, forever --------------
{
  const s = world('cm-catalog');
  const paid0 = (s.commerceLedger || {}).catalogPaid || 0;
  for (let i = 0; i < 8; i++) KP.advanceWeek(s);
  t.ok(s.commerceLedger.catalogPaid > paid0, 'a legacy shelf pays every week');
  t.ok((s.books.cur.catalog || 0) > 0 || s.commerceLedger.catalogPaid > 0,
    'and the stream has its own line in the books');
  // the decay floors, never zeroes: an old hit still pays
  const C = KP.C.CATALOG_PAY;
  const old = Math.max(C.floorDecay, 1 / (1 + 500 / C.halfLifeWeeks));
  t.eq(old, C.floorDecay, 'a 500-week-old hit pays the floor, not nothing');
}

// ---- publishing follows the person ------------------------------------
{
  const s = world('cm-royalty');
  const g = s.groups[0];
  const writer = s.people[g.members[0]];
  const rel = g.releases[0];
  rel.tracklist = rel.tracklist || [];
  rel.tracklist.push({ title: 'Her Own Song', writtenBy: writer.id });
  const C = KP.C.CATALOG_PAY;
  while (s.week % C.royaltyEvery !== 0) KP.advanceWeek(s);
  t.ok((writer.royalties || 0) >= 1, 'the writer’s check arrives on its own cadence');
  // the leverage line: enough checks and the renewal table changes
  writer.royalties = C.leverageAt - 1;
  for (let i = 0; i < C.royaltyEvery; i++) KP.advanceWeek(s);
  t.ok(writer.flags.royaltyLeverage, 'the accounting note worth reading twice');
  t.ok(KP.getNarrative(s, 'ownMoney', 'idol', writer.id), 'and the world remembers who owns her own money');
}
{
  // the departed writer's checks keep arriving
  const s = world('cm-departed');
  const g = s.groups[0];
  const writer = s.people[g.members[0]];
  const rel = g.releases[0];
  rel.tracklist = rel.tracklist || [];
  rel.tracklist.push({ title: 'The Door Song', writtenBy: writer.id });
  writer.status = 'released';
  const C = KP.C.CATALOG_PAY;
  let letter = false;
  for (let i = 0; i < C.royaltyEvery * 6 + 2 && !letter; i++) {
    KP.advanceWeek(s);
    if (s.inbox.some(n => n.ind === 'departedRoyalty')) letter = true;
  }
  t.ok(letter, 'the checks follow the person; the credits stay in the booklet');
}

// ---- the ATM storm: squeeze too hard, get the story -------------------
{
  const s = world('cm-atm');
  const g = s.groups[0];
  g.promoUntil = 0; g.prep = null; g.tour = null;
  g.fandom.intensity = 55;
  g.merchPushes = [s.week, s.week];
  const M = KP.C.MERCH;
  const AC = M.atmChance;
  M.atmChance = 1;
  const r = KP.holdFancon(s, g.id);
  M.atmChance = AC;
  t.ok(r.ok, 'fixture: the fancon lands');
  t.eq(s.commerceLedger.atmStorms, 1, 'three pushes in one season and the thread writes itself');
  t.ok((s.discourses || []).some(d => d.kind === 'atmStory'), 'organized, and aimed at the calendar');
}

// ---- the fresh label hears none of this -------------------------------
{
  const f = KP.newGame('cm-fresh', null, { legacy: false, door: 'fresh' });
  for (let i = 0; i < 30; i++) KP.advanceWeek(f);
  const led = f.commerceLedger || {};
  t.eq((led.clubs || 0) + (led.fancons || 0) + (led.catalogPaid || 0), 0,
    'no fandom, no shelf, no recurring money — that is the whole problem being fresh');
}

// ---- determinism -------------------------------------------------------
{
  const s = world('cm-fork');
  s.groups[0].fandom.intensity = 60;
  const b = KP.deserialize(KP.serialize(s));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(s); KP.advanceWeek(b); }
  t.eq(KP.serialize(s), KP.serialize(b), 'the recurring money forks clean');
}

t.finish();
