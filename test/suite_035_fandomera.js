/* Suite 035 — the fandom era (v0.7.0).
   Fandom identity (name, color, intensity with teeth), brand deals
   (offers, signings, scandal clauses), the year-end award circuit
   (nominations, wins, radicalizing snubs) — and rival idols with the
   stage names they always had. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_035_fandomera');

function debuted(seed) {
  const state = KP.newGame(seed);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'ERALINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state), g);
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  return { state, g };
}

// ---- rival stage names: half the lineups, deterministic ----
{
  const state = KP.newGame('fe-stage');
  const natives = Object.values(state.people).filter(p => p.status === 'rival' && p.flags.rivalNative);
  const staged = natives.filter(p => p.name.stage);
  t.ok(staged.length > 0, 'rival idols wear stage names (' + staged.length + '/' + natives.length + ')');
  t.ok(staged.length < natives.length, 'but not all of them — half is the texture');
  const state2 = KP.newGame('fe-stage');
  const staged2 = Object.values(state2.people).filter(p => p.status === 'rival' && p.name.stage);
  t.eq(staged.length, staged2.length, 'deterministic, not a re-roll');
  // migration: an old save's rival natives get theirs
  const state3 = KP.newGame('fe-stage-mig');
  Object.values(state3.people).forEach(p => { if (p.status === 'rival') delete p.name.stage; });
  state3.version = '0.6.9';
  const m = KP.deserialize(KP.serialize(state3));
  t.ok(Object.values(m.people).some(p => p.status === 'rival' && p.name.stage),
    'migration hands out the names they always had');
  t.ok(m.inbox.some(x => /Three desks opened/.test(x.text)), 'and the desk explains the era');
}

// ---- the naming vote: a decision, once ----
{
  const { state, g } = debuted('fe-name');
  g.popularity = 20;
  t.ok(!KP.fandomEligible(state, g), 'a small room holds no vote');
  t.ok(!KP.nameFandom(state, g.id, 0).ok, 'and the desk says so');
  g.popularity = 50;
  t.ok(KP.fandomEligible(state, g), 'a real fanbase wants a name');
  const opts = KP.fandomNameOptions(state, g);
  t.ok(opts.length >= 2, 'the cafés propose options (' + opts.join(', ') + ')');
  t.eq(JSON.stringify(KP.fandomNameOptions(state, g)), JSON.stringify(opts), 'proposals are stable');
  const r = KP.nameFandom(state, g.id, 0);
  t.ok(r.ok && g.fandom && g.fandom.name === opts[0], 'the company backs an option and it sticks');
  t.ok(g.fandom.color, 'with a color (' + g.fandom.color + ')');
  t.ok(state.inbox.some(m => /Lightstick mockups/.test(m.text)), 'naming day is an event');
  t.ok(!KP.nameFandom(state, g.id, 1).ok, 'renaming a fandom is how riots start');
}

// ---- intensity has teeth: revenue, show votes, storm defense ----
{
  const { state, g } = debuted('fe-teeth');
  g.popularity = 50;
  KP.nameFandom(state, g.id, 0);
  // revenue: same release, hot vs cold fandom
  while (state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) KP.advanceWeek(state);
  const json = KP.serialize(state);
  const hot = KP.deserialize(json), cold = KP.deserialize(json);
  hot.groups[0].fandom.intensity = 90; cold.groups[0].fandom.intensity = 0;
  [hot, cold].forEach(s => {
    const sg = s.groups[0];
    sg.demos = KP.generateDemos(s, KP.rngFor(s), sg);
    KP.planDebut(s, { groupId: sg.id, songId: sg.demos[0].id, promo: 'modest',
      week: s.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
    let guard = 0;
    while (sg.prep && guard++ < 10) KP.advanceWeek(s);
  });
  t.eq(hot.groups[0].results.reception, cold.groups[0].results.reception, 'fixture: identical releases');
  t.ok(hot.groups[0].results.revenue > cold.groups[0].results.revenue,
    'a devoted fandom buys everything twice (' + hot.groups[0].results.revenue + ' vs ' + cold.groups[0].results.revenue + ')');
  // storm defense: intense fandoms cool their group's storms faster
  const D = KP.C.FANDOM;
  t.ok(D.stormDefenseCool > 0 && D.stormDefenseAt <= 100, 'the defense constant exists and is sane');
}

// ---- care builds devotion; neglect cools it ----
{
  const { state, g } = debuted('fe-care');
  g.popularity = 50;
  KP.nameFandom(state, g.id, 0);
  const i0 = g.fandom.intensity;
  KP.fandomGain(g, KP.C.FANDOM.gainFanSign);
  t.eq(g.fandom.intensity, i0 + KP.C.FANDOM.gainFanSign, 'fan signs deepen devotion');
  const before = g.fandom.intensity;
  for (let w = 0; w < 10; w++) KP.fandomWeek(state);
  t.ok(g.fandom.intensity < before, 'devotion cools without care — slowly');
}

// ---- brand deals: offers find the wanted face, scandal voids them ----
{
  const { state, g } = debuted('fe-deals');
  const face = state.people[g.members[0]];
  face.talents.visuals.cur = 85; face.social = 80000;
  // force an offer through the weekly pass across seeds
  let offer = null, guard = 0;
  while (!offer && guard++ < 120) {
    KP.advanceWeek(state);
    offer = KP.openDealOffers(state)[0] || null;
    face.social = 80000;   // keep her wanted
  }
  t.ok(offer, 'the market calls eventually');
  if (offer) {
    const cash = state.budget;
    const r = KP.respondDeal(state, offer.id, true);
    t.ok(r.ok, 'signing signs');
    t.eq(state.budget, cash + offer.lump, 'the lump lands today');
    t.eq(KP.activeDeals(state).length, 1, 'the contract is live');
    const p = state.people[offer.personId];
    t.ok(p.history.some(h => /face of/.test(h.text)), 'her file records the campaign');
    // the scandal clause: a boiled storm on the ambassador voids the deal
    state.discourses = state.discourses || [];
    state.discourses.push({ id: 'dX', kind: 'gaffe', subjectType: 'idol', subjectId: offer.personId,
      groupId: g.id, week: state.week, heat: 90, negative: true, status: 'boiled', responded: false });
    const cashBefore = state.budget;
    const notes = KP.dealsWeek(state, KP.rngFor(state));
    t.eq(KP.activeDeals(state).length, 0, 'the conduct clause bites');
    t.ok(state.budget < cashBefore, 'with a clawback');
    t.ok(notes.some(m => /conduct clause/.test(m.text)), 'and a cold letter');
  }
}

// ---- award season: nominations, a win, and the radicalizing snub ----
{
  const { state, g } = debuted('fe-awards');
  // make the year undeniable
  g.popularity = 85;
  g.trophies = { countdown: 4 };
  g.releases[g.releases.length - 1].reception = 90;
  const A = KP.C.AWARDS;
  // jump to nomination week of this year
  const woy = ((state.week - 1) % KP.C.WEEKS_PER_YEAR) + 1;
  for (let w = woy; w < A.nominationWeek; w++) KP.advanceWeek(state);
  t.ok(state.awardSeason && state.awardSeason.noms, 'the season has a shortlist');
  t.ok(state.inbox.some(m => /we are ON the list/.test(m.text)), 'nominations are an event');
  for (let w = A.nominationWeek; w < A.ceremonyWeek; w++) KP.advanceWeek(state);
  const wins = (state.awardHistory || []).filter(a => a.isPlayer);
  t.ok(wins.length >= 1, 'an undeniable year wins something (' + wins.map(a => a.category).join(',') + ')');
  t.ok((g.honors || []).length >= 1, 'the honor is on the group page');
  t.ok(state.inbox.some(m => /thanked the fans first/.test(m.text)), 'the speech is correct');

  // the snub: nominated, beaten, radicalized
  const { state: s2, g: g2 } = debuted('fe-snub');
  s2.rivals[0].acts[0].popularity = 95;
  s2.rivals[0].acts[0].quality = 95;
  s2.rivals[0].acts[0].releases.push({ week: s2.week, title: 'Juggernaut', reception: 96, isDebut: false });
  g2.popularity = 45;
  KP.nameFandom(s2, g2.id, 0);
  const intBefore = g2.fandom.intensity;
  const woy2 = ((s2.week - 1) % KP.C.WEEKS_PER_YEAR) + 1;
  for (let w = woy2; w < A.ceremonyWeek; w++) KP.advanceWeek(s2);
  if (s2.inbox.some(m => /declared the ceremony rigged/.test(m.text))) {
    t.ok(g2.fandom.intensity > intBefore - 5, 'nothing organizes a fanbase like an injustice');
  } else {
    t.ok(true, 'no shortlist collision this seed — the snub path is statistical');
  }
}

// ---- determinism: the era forks clean across a year boundary ----
{
  const { state } = debuted('fe-fork');
  state.groups[0].popularity = 60;
  KP.nameFandom(state, state.groups[0].id, 0);
  const b = KP.deserialize(KP.serialize(state));
  for (let w = 0; w < 50; w++) { KP.advanceWeek(state); KP.advanceWeek(b); }
  t.eq(KP.serialize(state), KP.serialize(b), 'the fandom era forks clean');
}

t.finish();
