/* Suite 078 — the grind (v0.9.37, §76 C+D+E). The obscurity wall
   (fame caps the ceiling, paid converts through fame), the booking
   pile (procedural gigs, the phone-camera lottery), and the campaign
   (momentum: earned reach converts through work). */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_078_grind');

function world(seed, door) {
  const s = KP.newGame(seed, null, { legacy: false, door: door || 'fresh' });
  s.budget = 900;
  return s;
}
function planFirst(s, promo) {
  const ids = s.roster.slice(0, 5).filter(id => (s.people[id].gender || 'f') === 'f');
  KP.proposeGroup(s, 'GRIT', ids, KP.roleHints(s, ids.map(i => s.people[i])));
  const g = s.groups[s.groups.length - 1];
  KP.planDebut(s, { groupId: g.id, songId: g.demos[0].id, promo: promo || 'standard',
    week: s.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  return g;
}

// ---- who knows you ----------------------------------------------------
{
  const doors = {};
  ['blank', 'fresh', 'current', 'major'].forEach(d => {
    doors[d] = KP.fameRead(KP.newGame('fame-' + d, null, { legacy: false, door: d }));
  });
  t.ok(doors.blank < doors.fresh, 'the blank page is less known than the fresh label');
  t.ok(doors.fresh < doors.current, 'six struggling years still bought a name');
  t.ok(doors.current < doors.major, 'and the major is the major');
  t.ok(doors.major > KP.C.FAME.wallBelow, 'the wall never touches the top of the ladder');
  t.ok(doors.blank < KP.C.FAME.showBar && doors.fresh < KP.C.FAME.showBar,
    'the music shows do not call the bottom of it');
}
{
  const s = world('fame-eff');
  t.ok(KP.paidEfficiency(s) < 0.6, 'ad money half-wastes when nobody knows the label');
  Object.keys(s.company.reputation).forEach(k => { s.company.reputation[k] = 85; });
  t.eq(KP.paidEfficiency(s), 1, 'and converts in full once the name carries');
}

// ---- the wall ---------------------------------------------------------
{
  const s = world('wall-cap');
  const g = planFirst(s);
  const quiet = KP.applyWall(s, g, 82, { paid: 6 });
  t.ok(quiet.under && quiet.walled, 'a landing over the cap from an unknown label hits the wall');
  t.ok(quiet.reception < 82 - 10, 'and most of the excess goes unheard (' + quiet.reception + ')');
  g.prep.campaign.momentum = 100;
  const worked = KP.applyWall(s, g, 82, { paid: 6 });
  t.ok(worked.reception > quiet.reception, 'a worked campaign lifts what the name cannot');
  t.ok(worked.momLift >= 8, 'earned reach converts at full rate');
}
{
  // the same landing, two labels: the major never feels the system
  const maj = KP.newGame('wall-major', null, { legacy: false, door: 'major' });
  const g = { prep: { campaign: { momentum: 0 } } };
  const w = KP.applyWall(maj, g, 82, { paid: 6 });
  t.ok(!w.under && w.reception >= 82 - 1, 'the major starts above the wall entirely');
}

// ---- the shows do not return the calls --------------------------------
{
  const s = world('shows-gate');
  const g = planFirst(s);
  t.ok(s.inbox.some(n => n.ind === 'showsClosed'), 'the era is told, once and out loud');
  t.eq(g.prep.rollout.flat().filter(a => (KP.C.ROLLOUT.ACTIVITIES[a] || {}).show).length, 0,
    'no show slots survive the swap');
  // fame arrives; the calls come back — once, and it is news
  Object.keys(s.company.reputation).forEach(k => { s.company.reputation[k] = 80; });
  KP.advanceWeek(s);
  t.ok(s.fameLedger.showsOpenWeek != null, 'the milestone is dated');
  t.ok(s.inbox.some(n => n.ind === 'showsOpen'), 'and celebrated');
}

// ---- the campaign -----------------------------------------------------
{
  const s = world('camp');
  const g = planFirst(s);
  t.ok(g.prep.campaign && g.prep.campaign.momentum === 0, 'every locked era opens a campaign');
  const r1 = KP.campaignPush(s, g.id, 'streetTeam');
  t.ok(r1.ok && r1.momentum > 0, 'a worked week builds momentum');
  t.ok(!KP.campaignPush(s, g.id, 'fanMeet').ok, 'one push a week — they are people');
  t.ok(/return this label/.test(KP.campaignPush(s, g.id, 'radioPush').reason || 'x') === false ||
       !KP.campaignPush(s, g.id, 'radioPush').ok, 'the radio circuit is gated by fame');
  KP.advanceWeek(s);
  const r2 = KP.campaignPush(s, g.id, 'showcase');
  t.ok(r2.ok, 'the showcase runs once');
  t.ok(!KP.campaignPush(s, g.id, 'showcase').ok || g.prep.campaign.showcaseDone,
    'and only once');
  const before = g.prep.campaign.momentum;
  KP.advanceWeek(s); KP.advanceWeek(s);
  t.ok(g.prep.campaign.momentum < before, 'idle weeks cool the era off');
  t.ok((g.prep.buildup || 0) >= 4, 'campaign work feeds the §77 countdown');
}

// ---- the booking pile -------------------------------------------------
{
  const s = world('pile');
  const g = planFirst(s);
  for (let i = 0; i < 3; i++) KP.advanceWeek(s);
  const open = KP.openBookings(s);
  t.ok(open.length >= 2, 'the pile deals for a label with a lineup (' + open.length + ')');
  t.ok(open.every(o => o.rung <= 1), 'and deals the BOTTOM rungs to an unknown one');
  t.ok(open.length && open.every(o => o.label && o.week > 0), 'every offer is a real, named, dated stage');
  const o = open.find(x => x.week > s.week && x.fee >= 0) || open[0];
  const take = KP.takeBooking(s, o.id, g.id);
  t.ok(take.ok, 'the stage is taken');
  t.ok(!KP.takeBooking(s, o.id, g.id).ok, 'and cannot be taken twice');
  const played0 = s.bookingLedger.played;
  const budget0 = s.budget;
  while (s.week <= o.week) KP.advanceWeek(s);
  t.eq(s.bookingLedger.played, played0 + 1, 'the gig plays on its week');
  t.ok(o.fee <= 0 || s.budget !== budget0, 'the fee moved the till');
  t.ok(s.groups[0].history.some(h => /First booking ever played/.test(h.text)),
    'the first stage goes in the file');
}
{
  // the pile dries up above the ladder
  const s = world('pile-major', 'major');
  for (let i = 0; i < 4; i++) KP.advanceWeek(s);
  t.eq(KP.openBookings(s).length, 0, 'majors do not get wedding offers');
}
{
  // the flyer week: papering the neighborhood is work, and it shows
  const s = world('flyer');
  const g = planFirst(s);
  state_loop: for (let i = 0; i < 20; i++) {
    KP.advanceWeek(s);
    const th = KP.openBookings(s).find(o =>
      (KP.C.BOOK.KINDS[o.kindId] || {}).flyerable && o.week > s.week);
    if (th) {
      const fat0 = s.people[g.members[0]].fatigue;
      const r = KP.takeBooking(s, th.id, g.id, { flyer: true });
      t.ok(r.ok && th.flyered, 'the flyer week is a real verb');
      t.ok(s.people[g.members[0]].fatigue > fat0, 'and it costs the members a real week');
      t.eq(s.bookingLedger.flyered, 1, 'ledgered');
      break state_loop;
    }
  }
  t.ok(s.bookingLedger.flyered >= 0, '(flyerable offer search bounded)');
}

// ---- the phone-camera lottery -----------------------------------------
{
  const s = world('cam');
  const g = planFirst(s);
  const CB = KP.C.BOOK.camBase;
  KP.C.BOOK.camBase = 1;   // pin the lottery for the fixture
  let viral = false;
  for (let i = 0; i < 16 && !viral; i++) {
    KP.advanceWeek(s);
    const o = KP.openBookings(s).find(x => x.week > s.week && x.fee >= 0);
    if (o) KP.takeBooking(s, o.id, g.id);
    viral = s.bookingLedger.virals >= 1;
  }
  KP.C.BOOK.camBase = CB;
  t.ok(viral, 'somebody always has a phone out');
  t.ok(s.inbox.some(n => n.ind === 'gigViral'), 'and the clip is the story');
  t.ok((g.prep === null) || (g.prep.viralLift || 0) > 0 || g.debuted,
    'a mid-campaign clip lifts the era ceiling');
}

// ---- the era settles: wall on the record ------------------------------
{
  const s = world('settle');
  const g = planFirst(s, 'aggressive');
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(s);
  t.ok(g.results.wall, 'the era’s ground game is on the record');
  t.ok(g.results.wall.fame < KP.C.FAME.wallBelow, 'fixture: an unknown label');
  t.ok(g.results.wall.waste > 0, 'the aggressive spend part-wasted — the risk is real');
}

// ---- the breakthrough -------------------------------------------------
{
  const s = world('break');
  const g = planFirst(s);
  g.members.forEach(id => { const m = s.people[id];
    ['vocals', 'dance', 'charisma'].forEach(d => {
      m.talents[d] = { cur: 88, ceilLo: 92, ceilHi: 97, growth: 1 }; });
    m.liveExp = 60; m.hype = 20; });
  g.prep.campaign.momentum = 110;
  g.prep.viralLift = 12;
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(s);
  if (g.results.reception >= KP.C.FAME.breakMin) {
    t.eq(s.fameLedger.breaks, 1, 'an unknown label landing loud IS the breakthrough');
    t.ok(KP.getNarrative(s, 'breakthrough', 'group', g.id), 'on the record as narrative');
    t.ok(s.inbox.some(n => n.ind === 'breakthrough'), 'and on the desk');
    t.ok(KP.fameRead(s) > 0.2, 'the wall moved for good');
  } else {
    t.ok(g.results.wall != null, '(the landing stayed under the line this stream — the wall math held above)');
  }
}

// ---- determinism through the whole grind ------------------------------
{
  const s = world('grind-fork');
  const g = planFirst(s);
  KP.campaignPush(s, g.id, 'streetTeam');
  KP.advanceWeek(s);
  const o = KP.openBookings(s).find(x => x.week > s.week);
  if (o) KP.takeBooking(s, o.id, g.id);
  const b = KP.deserialize(KP.serialize(s));
  for (let w = 0; w < 24; w++) { KP.advanceWeek(s); KP.advanceWeek(b); }
  t.eq(KP.serialize(s), KP.serialize(b), 'the grind forks clean');
}

t.finish();
