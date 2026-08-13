/* Suite 031 — the music-show ecosystem (v0.6.5).
   Three named stages with personalities; a weekly winner computed among
   everyone promoting; trophies, first-win tears, encores that belong to
   wins, ending fairies, rival wins with cameras on our faces, and a
   darling narrative for dynasties. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_031_musicshows');

const ALLSHOWS = [['countdown', 'popWave'], ['countdown', 'primeStage'],
  ['countdown', 'popWave'], ['countdown', 'primeStage']];

function ready(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'STAGELINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  return { state, g };
}
function boost(state, g, level) {
  g.members.forEach(id => {
    const p = state.people[id];
    p.talents.vocals.cur = level; p.talents.dance.cur = level;
    p.talents.charisma.cur = level - 5; p.liveExp = 40;
  });
}
function clearStages(state) {
  // rivals off the stages and out of the release window for a while
  (state.rivals || []).forEach(r => {
    r.nextDebutWeek = state.week + 60;
    (r.acts || []).forEach(a => { a.lastReleaseWeek = state.week - 5; a.cycleWeeks = 26; });
  });
}
function lockAndRide(state, g, rollout) {
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 }, rollout });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
}

// ---- the rails know the new names ----
{
  const { state, g } = ready('ms-rails');
  const r = KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 },
    rollout: [['musicShow'], [], [], []] });
  t.ok(!r.ok && /Nobody on staff/.test(r.reason), 'the generic “music show” booking is gone — book a stage by name');
}

// ---- a strong group on empty stages takes trophies ----
{
  const { state, g } = ready('ms-win');
  boost(state, g, 85);
  clearStages(state);
  lockAndRide(state, g, ALLSHOWS);
  clearStages(state);   // keep the stages clear through promo
  for (let w = 0; w < KP.C.ROLLOUT.weeks; w++) KP.advanceWeek(state);
  const total = Object.values(g.trophies || {}).reduce((s, n) => s + n, 0);
  t.ok(total >= 2, 'a strong group on clear stages collects trophies (' + total + ')');
  t.ok(state.firstShowWinWeek > 0, 'the first win is dated');
  t.ok(state.inbox.some(m => /FIRST music-show win/.test(m.text)), 'and the first one is an event');
  t.ok(state.inbox.filter(m => /FIRST music-show win/.test(m.text)).length === 1, 'exactly once');
}

// ---- the prestige floor: The Countdown does not hand out trophies ----
{
  const { state, g } = ready('ms-floor');
  boost(state, g, 25);
  g.members.forEach(id => { state.people[id].liveExp = 0; });
  clearStages(state);
  lockAndRide(state, g, [['countdown'], ['countdown'], ['countdown'], ['countdown']]);
  clearStages(state);
  g.popularity = 8;   // a debut that did not land
  for (let w = 0; w < KP.C.ROLLOUT.weeks; w++) { clearStages(state); KP.advanceWeek(state); }
  t.ok(!(g.trophies && g.trophies.countdown), 'a weak act cannot win the Sunday institution by showing up');
}

// ---- rival wins happen while we sleep, and the big ones make the desk ----
{
  const state = KP.newGame('ms-rivalwin', null, { legacy: false });
  const act = state.rivals[0].acts[0];
  act.popularity = 75; act.quality = 80;
  act.lastReleaseWeek = state.week;   // fresh release: on every stage
  KP.advanceWeek(state);
  t.ok((act.showWins || 0) >= 1, 'a hot rival act wins stages (' + (act.showWins || 0) + ')');
  t.ok(state.inbox.some(m => /won .* — their first/.test(m.text)),
    'the desk hears about their first — and only their first');
  KP.advanceWeek(state);
  t.eq(state.inbox.filter(m => /their first/.test(m.text)).length, 1,
    'a hot act re-winning weekly is wallpaper, not mail');
}

// ---- beaten on our own stage: second on points, cameras on our faces ----
{
  const { state, g } = ready('ms-beaten');
  boost(state, g, 45);
  clearStages(state);
  lockAndRide(state, g, ALLSHOWS);
  const act = state.rivals[0].acts[0];
  act.popularity = 90; act.quality = 92;
  act.lastReleaseWeek = state.week;   // they walk onto the same stages
  let beaten = false;
  for (let w = 0; w < KP.C.ROLLOUT.weeks; w++) {
    KP.advanceWeek(state);
    if (state.inbox.some(m => /Second on points/.test(m.text))) { beaten = true; break; }
  }
  t.ok(beaten, 'losing the announcement moment is a story too');
}

// ---- the darling: three trophies from one stage becomes canon ----
{
  const { state, g } = ready('ms-darling');
  boost(state, g, 85);
  clearStages(state);
  lockAndRide(state, g, [['countdown'], ['countdown'], ['countdown'], ['countdown']]);
  clearStages(state);
  g.trophies = { countdown: KP.C.SHOWWIN.darlingAt - 1 };   // one short of dynasty
  // ride until the dynasty win lands — WHICH week it lands is stream
  // luck (a hot rival can steal any given Countdown), the threshold
  // mechanism is what's under test. Bounded, boosted, never forever.
  let nar = null;
  for (let cycle = 0; cycle < 3 && !nar; cycle++) {
    boost(state, g, 92);
    for (let w = 0; w < KP.C.ROLLOUT.weeks * 2; w++) {
      clearStages(state); KP.advanceWeek(state);
      nar = KP.getNarrative(state, 'showDarling', 'group', g.id);
      if (nar) break;
    }
    if (!nar && !g.prep && state.week > (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) {
      lockAndRide(state, g, [['countdown'], ['countdown'], ['countdown'], ['countdown']]);
      clearStages(state);
    }
  }
  t.ok(nar, 'the dynasty trophy from one stage makes it a story');
  t.ok(nar && KP.narrativeText(state, nar).includes('The Countdown'), 'and the story names the stage');
}

// ---- the encore belongs to WINS now, and it still makes stars ----
{
  let encoreSeen = false;
  for (let s = 0; s < 25 && !encoreSeen; s++) {
    const { state, g } = ready('ms-encore-' + s);
    boost(state, g, 85);
    clearStages(state);
    lockAndRide(state, g, ALLSHOWS);
    clearStages(state);
    for (let w = 0; w < KP.C.ROLLOUT.weeks; w++) {
      clearStages(state);
      KP.advanceWeek(state);
    }
    if (state.inbox.some(m => /winning encore without a backing track/.test(m.text))) encoreSeen = true;
  }
  t.ok(encoreSeen, 'the Gaya moment lives on the winning encore');
}

// ---- the ending fairy trends on her own schedule ----
{
  let fairySeen = false;
  for (let s = 0; s < 20 && !fairySeen; s++) {
    const { state, g } = ready('ms-fairy-' + s);
    boost(state, g, 70);
    lockAndRide(state, g, ALLSHOWS);
    for (let w = 0; w < KP.C.ROLLOUT.weeks; w++) KP.advanceWeek(state);
    if (state.inbox.some(m => /ending-fairy clip/.test(m.text))) fairySeen = true;
  }
  t.ok(fairySeen, 'fifteen seconds and one look at the camera is a career event');
}

// ---- migration: generic bookings become the named stages ----
{
  const { state, g } = ready('ms-mig');
  lockAndRide(state, g, undefined);
  g.rollout = [['musicShow', 'radio'], ['musicShow'], ['musicShow', 'fanSign'], ['musicShow']];
  delete g.trophies;
  state.version = '0.6.4';
  const m = KP.deserialize(KP.serialize(state));
  const mg = m.groups[0];
  t.eq(JSON.stringify(mg.rollout),
    JSON.stringify([['popWave', 'radio'], ['countdown'], ['primeStage', 'fanSign'], ['popWave']]),
    'old bookings rotate through the three stages');
  t.ok(mg.trophies && typeof mg.trophies === 'object', 'the trophy shelf exists, empty and honest');
  t.ok(m.inbox.some(x => /The show desk is open/.test(x.text)), 'the desk explains the stages');
}

// ---- determinism: the stages fork clean ----
{
  const mk = () => {
    const { state, g } = ready('ms-fork');
    boost(state, g, 75);
    lockAndRide(state, g, ALLSHOWS);
    return state;
  };
  const a = mk();
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 20; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the show circuit forks clean');
}

t.finish();
