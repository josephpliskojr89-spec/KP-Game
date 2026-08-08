/* Suite 012 — idol self-development (v0.2.4).
   Between promotions, debuted idols auto-train the attribute with the
   most runway: growth happens, ceilings hold, tired idols rest instead,
   promotion weeks are untouched, and the focus is visible to the UI. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_012_idolgrowth');

function throughDebut(seed) {
  const state = KP.newGame(seed);
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'GROWA', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  // ride out the promotion window so idols are idle
  for (let w = 0; w < 5; w++) KP.advanceWeek(state);
  return state;
}

// idle idols grow, and they grow in the max-runway domain
{
  const state = throughDebut('ig-grow');
  const g = state.groups[0];
  const members = g.members.map(id => state.people[id]);
  const before = members.map(m => {
    const f = KP.idolFocus(state, m);
    return { id: m.id, domain: f && f.domain, cur: f && m.talents[f.domain].cur,
      others: KP.C.TALENTS.filter(d => !f || d !== f.domain).map(d => m.talents[d].cur) };
  });
  for (let w = 0; w < 16; w++) KP.advanceWeek(state);
  let grew = 0;
  before.forEach(b => {
    if (!b.domain) return;
    const m = state.people[b.id];
    if (m.talents[b.domain].cur > b.cur + 1) grew++;
    // ceilings hold
    KP.C.TALENTS.forEach(d => {
      const ceil = m.flags['ceil_' + d];
      if (ceil != null) t.ok(m.talents[d].cur <= ceil + 0.001, b.id + ' ' + d + ' respects its ceiling');
    });
  });
  t.ok(grew >= 3, 'most idle idols improved their focus domain (' + grew + '/' + before.length + ')');
}

// the focus is genuinely the max-runway domain
{
  const state = throughDebut('ig-focus');
  const m = state.people[state.groups[0].members[0]];
  KP.advanceWeek(state);  // resolve ceilings via one idle week
  const f = KP.idolFocus(state, m);
  t.ok(!!f, 'an auto-focus exists while runway remains');
  const rooms = KP.C.TALENTS.map(d => (m.flags['ceil_' + d] != null
    ? m.flags['ceil_' + d] : (m.talents[d].ceilLo + m.talents[d].ceilHi) / 2) - m.talents[d].cur);
  t.ok(Math.max.apply(null, rooms) - (f.room) < 0.001, 'focus is the domain with the most runway');
}

// tired idols rest instead of drilling
{
  const state = throughDebut('ig-tired');
  const m = state.people[state.groups[0].members[0]];
  m.fatigue = 90;
  const talentsBefore = KP.C.TALENTS.map(d => m.talents[d].cur);
  KP.advanceWeek(state);
  const talentsAfter = KP.C.TALENTS.map(d => m.talents[d].cur);
  t.eq(JSON.stringify(talentsBefore), JSON.stringify(talentsAfter), 'a tired idol rests; no gains');
  t.ok(m.fatigue < 90, 'and recovers');
}

// promotion weeks are promotion, not lessons
{
  const state = throughDebut('ig-promo');
  const g = state.groups[0];
  g.promoUntil = state.week + 4;   // reopen a promo window
  const m = state.people[g.members[0]];
  const before = KP.C.TALENTS.map(d => m.talents[d].cur);
  for (let w = 0; w < 3; w++) KP.advanceWeek(state);
  const after = KP.C.TALENTS.map(d => m.talents[d].cur);
  t.eq(JSON.stringify(before), JSON.stringify(after), 'no raw-talent gains during promotion weeks');
}

// trainees are untouched by the idol path
{
  const state = throughDebut('ig-trainee');
  const free = KP.freeTrainees(state);
  t.ok(free.length > 0, 'a free trainee exists');
  const p = state.people[free[0]];
  KP.setTraining(state, p.id, [], 'rest');
  const before = KP.C.TALENTS.map(d => p.talents[d].cur);
  for (let w = 0; w < 4; w++) KP.advanceWeek(state);
  const after = KP.C.TALENTS.map(d => p.talents[d].cur);
  // resting trainee with no focus: only breakthroughs could move her, none forced
  t.ok(Math.max.apply(null, after.map((v, i) => v - before[i])) < 3.5, 'resting trainees do not self-train like idols');
}

// determinism
{
  const a = throughDebut('ig-fork');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 14; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'restored save continues identically under self-development');
}

t.finish();
