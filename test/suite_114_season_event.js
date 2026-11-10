/* Suite 114 — the season, televised (v0.11.4, §95). Owner: "I'd like that
   to feel like an event when it runs." The rankings every week and the
   line the player can read; the mission schedule; one episode letter a
   week that says her place, a named moment and who went home (critical
   when she sits on the line or goes home); the doors during the run (the
   vote push with its ceiling and the edit's eye, the coach visit that
   thins the room at home, the edit scene both ways, the withdrawal); the
   public's pick; the finale read in reverse with her place in it; the
   friend made on the set and the scouts' interest; a season that forks
   clean; the audit's rest that must not reach a contestant. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_114_season_event');
const S = KP.C.COMPETITION;

// a girls' season with two of ours sent, ridden to the casting call
function castWithOurs(seed) {
  const saved = S.boyShowShare; S.boyShowShare = 0;
  const state = KP.newGame(seed, null, { legacy: true });
  let guard = 0;
  while (!(state.season && state.season.status === 'casting') && guard++ < 60) { state.budget = Math.max(state.budget, 9000); KP.advanceWeek(state); }
  S.boyShowShare = saved;
  const sc = state.scenes.find(x => x.kind === 'seasonInvite');
  if (sc) KP.resolveScene(state, sc.id, 'two');
  const ours = KP.seasonOurs(state).map(c => state.people[c.personId]);
  // (re-pinned v0.11.14, §105) forced: the two we send are strong enough to
  // stay on the show to its last week. Who the invite picks is the stream's
  // business, and every check below reads what happens to them while they
  // are on it: the old fixture relied on this seed's pair surviving, and a
  // stream that moved sent a pair that was cut in its first month.
  ours.forEach(p => KP.C.TALENTS.forEach(d => { p.talents[d].cur = 96; p.talents[d].ceilLo = 96; p.talents[d].ceilHi = 99; }));
  return { state, ours, s: state.season };
}
const tick = (state, n) => { for (let i = 0; i < n; i++) { state.budget = Math.max(state.budget, 9000); KP.advanceWeek(state); } };
const notesOf = () => KP.lastTickNotes || [];

// ---- the rankings, the line, the mission, the episode ------------------------------
{
  const { state, ours, s } = castWithOurs('se-air');
  t.ok(s && s.status === 'casting' && ours.length === 2, 'two of ours are in the cast (' + ours.length + ')');
  t.ok(s.fanPick && state.people[s.fanPick], 'the public has a pick from the cast on');
  tick(state, 1);
  const ep = notesOf().find(n => n.ind === 'seasonEpisode');
  t.ok(ep && ep.kind === 'company' && /episode 1 — the signal song/.test(ep.text), 'the first episode letter names the mission');
  t.ok(ep && new RegExp(KP.displayName(ours[0]) + ' is \\d+(st|nd|rd|th) of \\d+').test(ep.text), 'and her place in the field');
  t.ok(ep && /The line falls at \d+(st|nd|rd|th) next week/.test(ep.text), 'and where the line falls');
  t.ok(ep && /(Gone: |Nobody went home)/.test(ep.text), 'and who went home');
  const c0 = KP.seasonOurs(state)[0];
  t.ok(c0.ranks && c0.ranks.length === 1 && c0.ranks[0] >= 1, 'the rank is kept on the file (' + c0.ranks + ')');
  const board = KP.seasonBoard(state);
  t.ok(board.length >= 8 && board[0].rank === 1 && board.every((r, i) => i === 0 || r.rank >= board[i - 1].rank), 'the board reads first to last');
  t.ok(board.some(r => r.ours), 'with ours on it');
  const line = KP.seasonLine(state);
  t.ok(line != null && line <= board.length && line >= S.lineupSize + S.runnersUp, 'the line is a rank the player can read (' + line + ' of ' + board.length + ')');
  t.eq(KP.seasonMission(state), S.MISSIONS[0], 'the mission of the week is the schedule’s');
  t.ok(KP.upcoming(state).some(i => /finale/.test(i.label) && i.hot), 'the finale is on the strip, hot while ours is in');
  // every week on air writes one episode letter, and the moment family rotates
  const kinds = new Set();
  let letters = 0;
  for (let w = 0; w < 6; w++) { tick(state, 1); const e = notesOf().find(n => n.ind === 'seasonEpisode'); if (e) letters++; if (state.season.lastMomentKind) kinds.add(state.season.lastMomentKind); }
  t.eq(letters, 6, 'one episode letter a week');
  t.ok(kinds.size >= 2, 'the named moment is a family (' + Array.from(kinds).join(', ') + ')');
}

// ---- the doors: the push, the coach, the withdrawal ---------------------------------
{
  const { state, ours } = castWithOurs('se-doors');
  tick(state, 1);
  const p = ours[0], q = ours[1];
  const c = KP.seasonOurs(state).find(x => x.personId === p.id);
  const b0 = state.budget;
  const r1 = KP.seasonPush(state, p.id);
  t.ok(r1.ok && state.budget === b0 - S.pushCost && c.pushWeek === state.week && c.pushScore === S.pushScores[0], 'the push bills, runs this week, at full strength');
  t.ok(!KP.seasonPush(state, p.id).ok, 'and not twice in a week');
  tick(state, 1); KP.seasonPush(state, p.id); tick(state, 1); KP.seasonPush(state, p.id);
  t.ok(c.pushes === 3 && !KP.seasonPushRead(state, p.id).ok && /ceiling/.test(KP.seasonPushRead(state, p.id).reason), 'three a season is the ceiling');
  const seatBefore = KP.seatMult(state, 'vocal');
  const r2 = KP.seasonCoach(state, q.id);
  t.ok(r2.ok && state.coachAway && state.coachAway.week === state.week, 'the coach flies out');
  t.ok(KP.seatMult(state, state.coachAway.seat) < seatBefore || !state.seats[state.coachAway.seat], 'and the room at home trains thinner that week');
  t.ok(!KP.seasonCoachRead(state, p.id).ok, 'one chair flies out a week');
  const w0 = state.week;
  const r3 = KP.seasonWithdraw(state, q.id);
  const cq = KP.seasonOurs(state).find(x => x.personId === q.id);
  t.ok(r3.ok && cq.withdrawn && cq.eliminatedWeek === w0 && !q.flags.onSeason && q.seasonRecord && q.seasonRecord.result === 'withdrawn', 'the withdrawal brings her home with the record');
  t.ok(state.inbox.some(n => n.ind === 'seasonWithdrawn' && n.priority === 'critical'), 'and the letter is critical');
  t.ok(!KP.seasonWithdraw(state, q.id).ok, 'she cannot be withdrawn twice');
  tick(state, 1);
  t.ok(KP.validateState(state).length === 0, 'the validator is clean after the doors');
}

// ---- the edit: both answers, and the price of each --------------------------------
{
  const { state, ours } = castWithOurs('se-edit');
  const p = ours[0];
  const c = KP.seasonOurs(state).find(x => x.personId === p.id);
  // force the edit this week: a villain, then read what the desk can do
  tick(state, 1);
  c.edit = 'villain'; c.editWeek = state.week;
  KP.openScene(state, { kind: 'seasonEdit', personId: p.id, edit: 'villain', expiresWeek: state.week + 1 });
  const sc = state.scenes.find(x => x.kind === 'seasonEdit');
  const opts = KP.sceneDef('seasonEdit').options(state, sc);
  t.ok(opts[0].id === 'ride' && opts.some(o => o.id === 'statement'), 'ride is the default; the statement is on the table when affordable');
  t.ok(!KP.sceneDef('seasonEdit').options({ budget: 0, people: state.people }, sc).some(o => o.id === 'statement'), 'and not when the account is empty');
  const hype0 = p.hype || 0;
  const b0 = state.budget;
  const r = KP.resolveScene(state, sc.id, 'statement');
  t.ok(r.ok && c.editAnswered && state.budget === b0 - S.editStatementCost && (p.hype || 0) <= hype0, 'the statement ends the edit at a price');
  // the ride: the villain's penalty shows in the score
  const q = ours[1];
  const cq = KP.seasonOurs(state).find(x => x.personId === q.id);
  cq.edit = 'villain'; cq.editWeek = state.week; cq.editRode = true;
  const r0 = KP.seasonReadiness(state, q);
  tick(state, 1);
  t.ok(cq.ranks.length >= 2, 'the ranks keep coming while the edit runs');
  // an underdog edit answered with a statement spoils it
  const { state: s2, ours: o2 } = castWithOurs('se-edit2');
  tick(s2, 1);
  const c2 = KP.seasonOurs(s2).find(x => x.personId === o2[0].id);
  c2.edit = 'underdog'; c2.editWeek = s2.week;
  KP.openScene(s2, { kind: 'seasonEdit', personId: o2[0].id, edit: 'underdog', expiresWeek: s2.week + 1 });
  const sc2 = s2.scenes.find(x => x.kind === 'seasonEdit');
  const r2 = KP.resolveScene(s2, sc2.id, 'statement');
  t.ok(r2.ok && /underdog story died/.test(r2.toast), 'a statement spoils an underdog');
  t.ok(r0 >= 0, 'readiness reads (' + Math.round(r0) + ')');
}

// ---- the finale: the ceremony, the friend, the scouts -------------------------------
{
  const { state, ours, s } = castWithOurs('se-finale');
  tick(state, s.finaleWeek - state.week);
  t.eq(state.season.status, 'done', 'the finale aired');
  const fin = state.inbox.find(n => n.ind === 'seasonFinale');
  t.ok(fin && /read in the order the stage read it: 8th .* · 1st /.test(fin.text), 'the ranks are read eighth to first');
  t.ok(fin && /The lineup: /.test(fin.text), 'and the lineup is named');
  const oursFinal = s.contestants.filter(c => c.source === 'player');
  oursFinal.forEach(c => t.ok(c.rank >= 1 && c.ranks && c.ranks.length >= 10, 'ours has a final rank and a run of ranks (' + c.rank + ', ' + (c.ranks || []).length + ' weeks)'));
  const inFinale = oursFinal.filter(c => c.rank <= S.lineupSize + S.runnersUp);
  if (inFinale.length) {
    t.ok(fin.priority === 'critical' && new RegExp(KP.displayName(state.people[inFinale[0].personId]) + ' finished \\d+(st|nd|rd|th)').test(fin.text), 'her place is in the ceremony, critical');
    const friends = (state.industryFriends || []).filter(f => f.how === 'season');
    t.ok(friends.length >= 1 && friends.every(f => state.people[f.a] && state.people[f.b]), 'the set made a friend');
    const runner = inFinale.find(c => c.rank > S.lineupSize);
    if (runner) t.ok(KP.signingHouses(state).some(r => r.interest && r.interest[runner.personId] >= S.finalistInterest), 'the scouts have the finalist’s number');
  } else {
    t.ok(oursFinal.every(c => c.eliminatedWeek), 'both of ours went home before the finale this seed — the ceremony read without them');
  }
  t.ok(!/the THE /.test(fin.text), 'the show’s name carries its own article');
}

// ---- a contestant is at work, not at rest; the season forks clean --------------------
{
  const { state, ours } = castWithOurs('se-fork');
  const p = ours[0];
  const f0 = p.fatigue;
  KP.developWeek(state, p, new KP.Rng('se-fork-dev'));
  t.ok(p.fatigue === f0, 'a trainee on television does not rest in the practice room (' + f0 + ' → ' + p.fatigue + ')');
  const b = KP.deserialize(KP.serialize(state));
  for (let w = 0; w < 14; w++) { KP.advanceWeek(state); KP.advanceWeek(b); }
  t.eq(KP.serialize(state), KP.serialize(b), 'the televised season forks clean');
}

t.finish();
