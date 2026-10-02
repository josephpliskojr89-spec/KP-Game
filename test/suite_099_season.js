/* Suite 099 — the season (v0.10.32, §90 Phase B).
   The competition show is cast from the world — rival floors, academy
   classes, the open board, and your room through one invitation (up
   to two) — eliminates weekly on hash, and its finale forms a project
   group under the broadcaster's house: fixed-term or permanent by a
   roll. Everyone comes from somewhere and goes back there. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_099_season');

const C = () => KP.C.COMPETITION;
const WPY = KP.C.WEEKS_PER_YEAR;
function toWoy(state, woy) {
  let guard = 0;
  while (((state.week) % WPY) + 1 !== woy && guard++ < WPY + 2) KP.advanceWeek(state);   // the next tick lands on woy
  return state;
}
// a house with a bench of trainees of the season's gender, at the casting week
function ready(seed, gender) {
  const state = KP.newGame(seed, null, { legacy: true });
  state.budget = 2000;
  // pin the season's gender for the fixture (the hash picks per year)
  const old = C().boyShowShare;
  C().boyShowShare = gender === 'm' ? 1 : 0;
  // make sure three trainees of that gender sit free on the roster, of age
  const free = KP.freeTrainees(state).map(id => state.people[id]);
  free.forEach(p => { p.gender = gender; p.age = 18; });
  toWoy(state, C().castWoy);
  KP.advanceWeek(state);   // the casting-week tick itself
  C().boyShowShare = old;
  return state;
}

// ---- the casting call reaches into the world ----------------------------
{
  const state = ready('ss-cast', 'f');
  const s = state.season;
  t.ok(s && s.status === 'casting' && s.startWeek === state.week, 'the casting call went out on the calendar week');
  t.ok(C().NAMES.includes(s.show), 'with a show on the file (' + s.show + ')');
  const src = {};
  s.contestants.forEach(c => { src[c.source] = (src[c.source] || 0) + 1; });
  t.ok((src.rival || 0) >= 2, 'rival floors sent trainees (' + src.rival + ')');
  t.ok((src.school || 0) >= 1, 'academies sent students (' + src.school + ')');
  t.ok((src.board || 0) >= 1, 'unsigned names walked in off the board (' + src.board + ')');
  t.ok(s.contestants.length >= 8, 'a real field (' + s.contestants.length + ')');
  t.ok(s.contestants.every(c => state.people[c.personId]), 'every contestant is a person who already existed');
  t.ok(s.contestants.every(c => state.people[c.personId].flags.onSeason), 'and knows she is on television');
  t.ok(s.contestants.every(c => (state.people[c.personId].gender || 'f') === s.gender), 'one gender per season');
  t.ok(state.inbox.concat(KP.lastTickNotes || []).some(n => n.ind === 'seasonCast'), 'the desk hears the call');
  t.ok((state.seasonLedger || {}).cast === 1, 'ledgered');
  // the invitation is on the Desk
  const sc = (state.scenes || []).find(x => x.kind === 'seasonInvite');
  t.ok(sc, 'the producers invited this building');
  const opts = KP.sceneDef('seasonInvite').options(state, sc);
  t.ok(opts.some(o => o.id === 'two') && opts.some(o => o.id === 'one') && opts.some(o => o.id === 'none'), 'up to two, one, or none');
  t.ok(/Some seasons that run is a year; some seasons it is forever/.test(KP.sceneDef('seasonInvite').body(state, sc)), 'the body says the roll is unknown');
}

// ---- sending two: they are on the show, held out of lineups --------------
{
  const state = ready('ss-send', 'f');
  const s = state.season;
  const sc = (state.scenes || []).find(x => x.kind === 'seasonInvite');
  const eligible = KP.seasonEligible(state);
  const r = KP.resolveScene(state, sc.id, 'two');
  t.ok(r.ok && /pack for the studio/.test(r.toast), 'they pack for the studio');
  t.eq(s.ours.length, 2, 'two of yours are in');
  t.ok(s.ours.every(id => state.people[id].flags.onSeason), 'and away filming');
  t.ok(s.ours.includes(eligible[0].id), 'the coaches’ first pick went');
  t.eq((state.seasonLedger || {}).sent, 2, 'ledgered');
  const pr = KP.proposeGroup(state, 'TVLINE', s.ours.concat(KP.freeTrainees(state).filter(id => !s.ours.includes(id)).slice(0, 2)),
    KP.roleHints(state, s.ours.map(id => state.people[id])));
  t.ok(!pr.ok && /on television/.test(pr.reason), 'a lineup cannot take someone the cameras hold');
  t.ok(KP.onBreak(state.people[s.ours[0]]), 'the practice room counts her as away');
}

// ---- the air: eliminations every week, down to the finale field ---------
{
  const state = ready('ss-air', 'f');
  const s = state.season;
  const sc = (state.scenes || []).find(x => x.kind === 'seasonInvite');
  KP.resolveScene(state, sc.id, 'two');
  const n0 = s.contestants.length;
  let feedWeeks = 0;
  while (state.week < s.finaleWeek - 1) {
    KP.advanceWeek(state);
    if ((KP.lastTickNotes || []).some(n => n.ind === 'seasonWeek' && n.feedOnly)) feedWeeks++;
  }
  const alive = s.contestants.filter(c => !c.eliminatedWeek);
  t.eq(s.status, 'airing', 'the season is airing');
  t.ok(alive.length <= C().lineupSize + C().runnersUp + 1 && alive.length >= C().lineupSize, 'the field is cut to the finale’s size (' + alive.length + ' of ' + n0 + ')');
  t.ok(s.eliminations.length >= 5, 'eliminations ran week after week (' + s.eliminations.length + ')');
  t.ok(feedWeeks >= 5, 'and the timeline watched (' + feedWeeks + ' feed weeks)');
  const gone = s.contestants.filter(c => c.eliminatedWeek).map(c => state.people[c.personId]);
  t.ok(gone.every(p => !p.flags.onSeason && p.seasonRecord && p.seasonRecord.result === 'eliminated'), 'the eliminated are home with a record');
  t.ok(gone.every(p => (p.hype || 0) >= C().elimHype[0]), 'and a public that learned the name');
  t.ok(gone.every(p => p.history.some(h => /Eliminated from/.test(h.text))), 'their files say so');
  const student = gone.find(p => p.channel === 'season');
  if (student) t.ok(['prospect', 'released', 'rival'].includes(student.status), 'an eliminated student is on the open board now — or already signed off it (' + student.status + ')');
  const rivalKid = s.contestants.find(c => c.source === 'rival' && c.eliminatedWeek);
  if (rivalKid) t.eq(state.people[rivalKid.personId].company, rivalKid.company, 'an eliminated rival trainee is back on her floor');
  t.ok(KP.feedReactionFor('seasonWeek') && KP.feedReactionFor('seasonFinale') && KP.feedReactionFor('seasonCast'), 'the registry has the season’s voices');
}

// ---- the finale: a fixed-term project group, and the return -------------------
{
  const old = C().permanentChance; C().permanentChance = 0;
  const state = ready('ss-fixed', 'f');
  const s = state.season;
  const sc = (state.scenes || []).find(x => x.kind === 'seasonInvite');
  KP.resolveScene(state, sc.id, 'two');
  // make ours unbeatable so the lineup question is settled on talent
  s.ours.forEach(id => { const p = state.people[id]; KP.C.TALENTS.forEach(d => { p.talents[d].cur = 95; p.talents[d].ceilLo = 97; p.talents[d].ceilHi = 99; }); p.hype = 60; });
  const peopleBefore = Object.keys(state.people).length;
  while (state.week < s.finaleWeek) KP.advanceWeek(state);
  C().permanentChance = old;
  t.eq(s.status, 'done', 'the finale aired');
  t.eq(s.permanent, false, 'the roll: a fixed-term run');
  const house = state.rivals.find(r => r.projectHouse);
  t.ok(house && house.show === s.show, 'the broadcaster’s house exists');
  const act = house.acts.find(a => a.id === s.actId);
  t.ok(act && act.members.length === C().lineupSize, 'the lineup is a real act of ' + C().lineupSize);
  t.ok(act.releases.length === 1 && state.chart.entries.some(e => e.act === act.name), 'with a debut single on the chart');
  t.ok(act.projectTerm && act.projectTerm.until === s.finaleWeek + C().termWeeks, 'on a ' + C().termWeeks + '-week term');
  t.ok(act.members.every(id => Object.keys(state.people).length >= peopleBefore && state.people[id]), 'nobody was minted for it');
  const oursIn = s.ours.filter(id => act.members.includes(id));
  t.ok(oursIn.length >= 1, 'ours made the lineup (' + oursIn.length + ')');
  const star = state.people[oursIn[0]];
  t.eq(star.status, 'trainee', 'she is still yours on paper');
  t.ok(state.roster.includes(star.id), 'and on the roster');
  t.ok(star.flags.onProject && star.flags.onProject.until === act.projectTerm.until, 'the seat is held for the term');
  t.ok(!star.flags.onSeason, 'the cameras let go');
  const pr = KP.proposeGroup(state, 'HELD', [star.id].concat(KP.freeTrainees(state).filter(id => id !== star.id).slice(0, 3)), KP.roleHints(state, [star]));
  t.ok(!pr.ok && /project group/.test(pr.reason), 'your lineups wait');
  t.ok(state.inbox.concat(KP.lastTickNotes || []).some(n => n.ind === 'seasonLineup' && n.personId === star.id), 'the desk hears it, critical');
  const rivalIn = act.members.map(id => state.people[id]).find(p => p.flags.seasonHome && p.flags.seasonHome.company);
  t.ok(rivalIn && rivalIn.company === house.short, 'a rival’s trainee moved to the house for the term');
  const home = rivalIn && rivalIn.flags.seasonHome.company;
  t.ok((state.seasonLedger || {}).fixed === 1 && (state.seasonLedger || {}).oursLineup >= 1, 'ledgered');
  // the term's end
  while (state.week < act.projectTerm.until) KP.advanceWeek(state);
  KP.advanceWeek(state);
  t.ok(act.retired, 'the run ended');
  t.ok(!star.flags.onProject && star.status === 'trainee' && state.roster.includes(star.id), 'she is back');
  t.ok(star.history.some(h => /run ended/.test(h.text)), 'the file says so');
  t.ok(KP.socialOf(state, star) >= C().lineupFollowers[0], 'with a public (' + KP.fmtCount(KP.socialOf(state, star)) + ')');
  t.ok(state.inbox.concat(KP.lastTickNotes || []).some(n => n.ind === 'seasonReturn'), 'the desk hears the return');
  if (rivalIn) t.eq(rivalIn.company, home, 'the rival’s trainee went home to her floor');
  t.eq((state.seasonLedger || {}).returned, oursIn.length, 'ledgered');
  const pr2 = KP.proposeGroup(state, 'BACK', [star.id].concat(KP.freeTrainees(state).filter(id => id !== star.id).slice(0, 3)), KP.roleHints(state, [star]));
  t.ok(pr2.ok || !/project group|television/.test(pr2.reason || ''), 'and your lineups can have her again');
}

// ---- the finale: the permanent roll keeps her ------------------------------
{
  const old = C().permanentChance; C().permanentChance = 1;
  const state = ready('ss-perm', 'f');
  const s = state.season;
  const sc = (state.scenes || []).find(x => x.kind === 'seasonInvite');
  KP.resolveScene(state, sc.id, 'one');
  const star = state.people[s.ours[0]];
  KP.C.TALENTS.forEach(d => { star.talents[d].cur = 95; star.talents[d].ceilLo = 97; star.talents[d].ceilHi = 99; }); star.hype = 60;
  while (state.week < s.finaleWeek) KP.advanceWeek(state);
  C().permanentChance = old;
  t.eq(s.permanent, true, 'the roll: permanent');
  const house = state.rivals.find(r => r.projectHouse);
  const act = house.acts.find(a => a.id === s.actId);
  t.ok(act && !act.projectTerm, 'no term on the act');
  t.ok(act.members.includes(star.id), 'she made the lineup');
  t.eq(star.status, 'rival', 'and the show kept her');
  t.eq(star.company, house.short, 'the broadcaster’s label holds the contract');
  t.ok(!state.roster.includes(star.id), 'she is off the roster');
  t.ok(star.flags.wasOurs && star.history.some(h => /kept it/.test(h.text)), 'the file remembers where she trained');
  t.ok(state.inbox.concat(KP.lastTickNotes || []).some(n => n.ind === 'seasonKept' && n.personId === star.id), 'the desk hears it — critical');
  t.eq((state.seasonLedger || {}).kept, 1, 'ledgered');
  // a permanent house keeps its act and stays in the scene
  for (let w = 0; w < 30; w++) KP.advanceWeek(state);
  t.ok(state.rivals.includes(house) && !act.retired, 'the project act lives like any act');
  t.ok(act.releases.length >= 1, 'and releases');
}

// ---- no invitation without a room; the window closes on silence -------------
{
  const state = ready('ss-none', 'm');   // a boys' season; the legacy roster is girls
  const s = state.season;
  t.ok(s && s.status === 'casting', 'fixture: the call went out');
  t.ok(!(state.scenes || []).some(x => x.kind === 'seasonInvite') || KP.seasonEligible(state).length, 'no invitation when nobody here is eligible');
  const s2 = ready('ss-silent', 'f');
  const sc = (s2.scenes || []).find(x => x.kind === 'seasonInvite');
  t.ok(sc, 'fixture: invited');
  for (let w = 0; w < 4; w++) KP.advanceWeek(s2);
  t.ok(!(s2.scenes || []).some(x => x.kind === 'seasonInvite'), 'the window closed');
  t.eq(s2.season.ours.length, 0, 'and nobody went');
  t.ok(s2.season.status === 'airing', 'the show airs without this building');
}

// ---- the old mint is gone; the calendar law holds ------------------------
{
  t.ok(KP.C.NETWORK.SHOW === undefined, 'NETWORK.SHOW left with the mint');
  const state = KP.newGame('ss-law', null, { legacy: true });
  let casts = 0, finales = 0, showKids = 0;
  for (let w = 0; w < WPY * 2 + 4; w++) {
    KP.advanceWeek(state);
    if ((KP.lastTickNotes || []).some(n => n.ind === 'seasonCast')) casts++;
    if ((KP.lastTickNotes || []).some(n => n.ind === 'seasonFinale')) finales++;
    if (Object.values(state.people).some(p => p.channel === 'showKid')) showKids++;
  }
  t.eq(casts, 2, 'one casting call a year');
  t.eq(finales, 2, 'one finale a year');
  t.eq(showKids, 0, 'nobody is minted as a finalist');
  t.ok(Object.values(state.people).filter(p => p.seasonRecord).length >= 10, 'the records are on real people');
}

// ---- determinism: a season forks clean ---------------------------------------
{
  const a = KP.newGame('ss-fork', null, { legacy: true });
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < WPY + 2; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'a year with a season in it forks clean');
}

t.finish();
