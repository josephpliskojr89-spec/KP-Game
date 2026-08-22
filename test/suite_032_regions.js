/* Suite 032 — regional popularity (v0.6.6).
   The map opens: six overseas regions per group, moved by concept
   resonance at release, member viral moments (personal strongholds),
   borderless promo, and slow idle cooling. KR stays g.popularity —
   one truth per number. Entirely rng-free: zero seed drift. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_032_regions');

function debuted(seed, conceptId) {
  const state = KP.newGame(seed, null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'MAPLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    conceptId: conceptId || g.demos[0].conceptId,
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  return { state, g };
}

// ---- releases export, and the concept decides where ----
{
  const { g } = debuted('rg-export', 'bright');
  const r = KP.regionsOf(g);
  t.ok(KP.C.REGIONS.every(x => r[x.id] > 0), 'one release puts the group on every map');
  t.ok(r.jp > r.na, 'a bright concept lands in Japan before North America (' +
    r.jp.toFixed(1) + ' vs ' + r.na.toFixed(1) + ')');
  const { g: g2 } = debuted('rg-export', 'hiphop');
  const r2 = KP.regionsOf(g2);
  t.ok(r2.na > r2.jp, 'the same world, a swagger concept — and the map flips (' +
    r2.na.toFixed(1) + ' vs ' + r2.jp.toFixed(1) + ')');
}

// ---- KR stays the one truth ----
{
  const { g } = debuted('rg-onetruth');
  t.ok(!('kr' in KP.regionsOf(g)), 'KR is g.popularity, not a second ledger');
}

// ---- member strongholds: stable, personal, and they catch her virals ----
{
  const { state, g } = debuted('rg-homes');
  const p = state.people[g.members[0]];
  const homes = KP.strongholdsOf(state, p);
  t.eq(homes.length, 2, 'every idol has two corners of the map');
  t.ok(homes[0] !== homes[1], 'two DIFFERENT corners');
  t.eq(JSON.stringify(KP.strongholdsOf(state, p)), JSON.stringify(homes), 'stable, not a re-roll');
  const before = homes.map(id => KP.regionsOf(g)[id]);
  const elsewhere = KP.C.REGIONS.map(x => x.id).find(id => !homes.includes(id));
  const beforeElse = KP.regionsOf(g)[elsewhere];
  KP.recordViral(state, p);
  const R = KP.C.REGIONAL;
  const expected = R.strongholdViral * Math.max(0, 1 - before[0] / 90);   // markets saturate
  t.ok(Math.abs(KP.regionsOf(g)[homes[0]] - before[0] - expected) < 0.01,
    'her viral moment lands hard where she is loved (saturating)');
  t.ok(KP.regionsOf(g)[elsewhere] - beforeElse <= R.otherViral + 0.01,
    'and only ripples elsewhere');
  // saturation: the same clip barely moves a market that already loves her
  g.regions[homes[0]] = 85;
  const hot = g.regions[homes[0]];
  KP.recordViral(state, p);
  t.ok(g.regions[homes[0]] - hot < 1, 'a devoted region barely moves — no runaway compounding');
}

// ---- idle cooling is slow, promo spread is real ----
{
  const { state, g } = debuted('rg-cool');
  // ride past promo + grace, then idle
  while (state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) KP.advanceWeek(state);
  const snap = Object.assign({}, KP.regionsOf(g));
  for (let w = 0; w < 10; w++) KP.advanceWeek(state);
  const r = KP.regionsOf(g);
  KP.C.REGIONS.forEach(x => {
    t.ok(r[x.id] <= snap[x.id], x.label + ' cools while idle');
    t.ok(snap[x.id] - r[x.id] < 2.1, 'but slowly — overseas fandoms are patient');
  });
}

// ---- warm maps pay: the overseas revenue multiplier ----
{
  const { state, g } = debuted('rg-pay');
  while (state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) KP.advanceWeek(state);
  const json = KP.serialize(state);
  const warm = KP.deserialize(json), cold = KP.deserialize(json);
  KP.C.REGIONS.forEach(x => { warm.groups[0].regions[x.id] = 70; cold.groups[0].regions[x.id] = 0; });
  // the Japan cycle (v0.10.8): a warm jp map draws the partner-call rng
  // in one fork only — pre-sign BOTH so the streams stay identical
  warm.jpPartner = { name: 'Fixture Label', since: 0 };
  cold.jpPartner = { name: 'Fixture Label', since: 0 };
  [warm, cold].forEach(s => {
    const sg = s.groups[0];
    sg.demos = KP.generateDemos(s, KP.rngFor(s));
    KP.planDebut(s, { groupId: sg.id, songId: sg.demos[0].id, promo: 'modest',
      week: s.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
    let guard = 0;
    while (sg.prep && guard++ < 10) KP.advanceWeek(s);
  });
  const wr = warm.groups[0].results, cr = cold.groups[0].results;
  t.ok(wr.reception === cr.reception, 'fixture: identical releases (' + wr.reception + ')');
  t.ok(wr.revenue > cr.revenue, 'a warm map buys records (' + wr.revenue + ' vs ' + cr.revenue + ')');
}

// ---- getting loud is a letter; staying loud is a story ----
{
  const { state, g } = debuted('rg-loud');
  while (state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) KP.advanceWeek(state);
  KP.C.REGIONS.forEach(x => { g.regions[x.id] = 38; });   // one release from loud
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (g.prep && guard++ < 10) KP.advanceWeek(state);
  t.ok(state.inbox.some(m => /getting LOUD in/.test(m.text)), 'the crossing is a letter');
  // a market one hit short of "second home" — the next export makes it a story
  g.regions.jp = KP.C.REGIONAL.strongholdNarrativeAt - 3;
  KP.regionsOnRelease(state, g, 70, 'bright');
  const nar = KP.getNarrative(state, 'regionStronghold', 'group', g.id);
  t.ok(nar, 'a region past ' + KP.C.REGIONAL.strongholdNarrativeAt + ' is a story');
  const text = KP.narrativeText(state, nar);
  t.ok(/Japan|Greater China|Southeast Asia|North America|Latin America|Europe/.test(text),
    'and the story names the region (' + text + ')');
}

// ---- migration: debuted groups did not start existing overseas today ----
{
  const { state, g } = debuted('rg-mig');
  delete g.regions;
  state.version = '0.6.5';
  const m = KP.deserialize(KP.serialize(state));
  const mg = m.groups[0];
  t.ok(mg.regions && KP.C.REGIONS.every(x => mg.regions[x.id] >= 0), 'the map exists after migration');
  t.ok(KP.overseasAvg(mg) > 0, 'seeded from what they already built, not zero');
  t.ok(m.inbox.some(x => /overseas desk delivered its first real report/.test(x.text)),
    'the desk explains the map');
}

// ---- region words for the UI ----
{
  t.eq(KP.regionWord(5), 'quiet', 'quiet under 15');
  t.eq(KP.regionWord(20), 'stirring', 'stirring from 15');
  t.eq(KP.regionWord(45), 'loud', 'loud from 40');
  t.eq(KP.regionWord(70), 'devoted', 'devoted from 65');
}

// ---- determinism: the map forks clean ----
{
  const { state } = debuted('rg-fork');
  const b = KP.deserialize(KP.serialize(state));
  for (let w = 0; w < 20; w++) { KP.advanceWeek(state); KP.advanceWeek(b); }
  t.eq(KP.serialize(state), KP.serialize(b), 'the mapped world forks clean');
}

t.finish();
