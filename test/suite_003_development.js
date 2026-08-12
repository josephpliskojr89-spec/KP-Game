/* Suite 003 — development invariants.
   Training grows focused skills, nothing crosses its resolved ceiling or
   the 100 wall, fatigue accumulates under heavy load and recovers on rest,
   rest weeks produce no skill gains, live experience accrues at showcases. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_003_development');

// growth under focused training (many people, one year)
let grew = 0, total = 0;
for (let s = 0; s < 8; s++) {
  const state = KP.newGame('dev' + s, null, { legacy: false });
  const roster = state.roster.map(id => state.people[id]);
  roster.forEach(p => { p.training = { focus: ['dance'], intensity: 'standard' }; });
  const before = roster.map(p => p.talents.dance.cur);
  for (let w = 0; w < 48; w++) KP.advanceWeek(state);
  roster.forEach((p, i) => {
    total++;
    if (p.talents.dance.cur > before[i] + 3) grew++;
    KP.C.TALENTS.forEach(d => {
      const tal = p.talents[d];
      t.ok(tal.cur <= 100, p.id + ' ' + d + ' below the wall');
      const ceil = p.flags['ceil_' + d];
      if (ceil != null) t.ok(tal.cur <= ceil + 0.001, p.id + ' ' + d + ' respects its resolved ceiling');
      t.ok(!Number.isNaN(tal.cur), p.id + ' ' + d + ' is a number');
    });
    t.ok(p.fatigue >= 0 && p.fatigue <= 100, p.id + ' fatigue in range');
    t.ok(p.morale >= 0 && p.morale <= 100, p.id + ' morale in range');
  });
}
t.ok(grew / total > 0.6, 'most focused trainees grow meaningfully over a year (' + grew + '/' + total + ')');

// gains are individual — a year of identical training produces a spread
{
  const state = KP.newGame('dev-spread', null, { legacy: false });
  const roster = state.roster.map(id => state.people[id]);
  roster.forEach(p => { p.training = { focus: ['vocals'], intensity: 'standard' }; });
  const before = roster.map(p => p.talents.vocals.cur);
  for (let w = 0; w < 48; w++) KP.advanceWeek(state);
  const gains = roster.map((p, i) => p.talents.vocals.cur - before[i]);
  const spread = Math.max(...gains) - Math.min(...gains);
  t.ok(spread > 3, 'identical plans, different people, different outcomes (spread ' + spread.toFixed(1) + ')');
}

// rest produces no gains and recovers fatigue
{
  const state = KP.newGame('dev-rest', null, { legacy: false });
  const p = state.people[state.roster[0]];
  p.fatigue = 80;
  p.training = { focus: ['vocals'], intensity: 'rest' };
  const before = p.talents.vocals.cur;
  const fBefore = p.fatigue;
  KP.advanceWeek(state);
  t.ok(p.talents.vocals.cur <= before + 3, 'rest week: no meaningful training gain');
  t.ok(p.fatigue < fBefore, 'rest week: fatigue recovers');
}

// heavy load accumulates fatigue and eventually forces consequences
{
  let burnouts = 0;
  for (let s = 0; s < 10; s++) {
    const state = KP.newGame('dev-burn' + s, null, { legacy: false });
    const roster = state.roster.map(id => state.people[id]);
    roster.forEach(p => { p.training = { focus: ['dance', 'vocals'], intensity: 'heavy' }; });
    for (let w = 0; w < 30; w++) {
      // keep re-imposing heavy (the burnout guard flips them to light)
      roster.forEach(p => { if (!p.flags.burnout) p.training.intensity = 'heavy'; });
      KP.advanceWeek(state);
    }
    if (roster.some(p => (p.flags.burnout || 0) > 0 || p.morale < 40)) burnouts++;
  }
  t.ok(burnouts >= 5, 'relentless heavy training has consequences (' + burnouts + '/10 orgs)');
}

// showcases add live experience
{
  const state = KP.newGame('dev-live', null, { legacy: false });
  const p = state.people[state.roster[0]];
  const before = p.liveExp;
  for (let w = 0; w < KP.C.TRAIN.showcaseEveryWeeks + 1; w++) KP.advanceWeek(state);
  t.ok(p.liveExp > before, 'live experience accrues at showcases');
}

// derived qualities respond to experience, not just raw talent
{
  const state = KP.newGame('dev-derived', null, { legacy: false });
  const p = state.people[state.roster[1]];
  const d0 = KP.derived(p).stagePresence;
  p.liveExp += 25;
  p.personality.confidence = Math.min(100, p.personality.confidence + 20);
  const d1 = KP.derived(p).stagePresence;
  t.ok(d1 > d0, 'stage presence grows from confidence + live reps without raw-skill change');
}

t.finish();
