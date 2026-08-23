/* Suite 091 — the clean exits (v0.10.16). Three latent bugs of one
   species (stale roles, a stale maknae, a missing center) were found
   one-per-release by stream-shift luck. This suite makes the family
   extinct: every door out of a lineup × every live pointer that can
   name the leaver, driven and checked. The backstop is
   KP.lineupPointerSweep; the contract is KP.validateState. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_091_exits');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  state.budget = 800;
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'EXITLINE', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return { state, g };
}

// point EVERY live pointer at the leaver, and hang a credited track on
// a synthetic prep so the tracklist path is exercised too
function pointEverything(state, g, pid) {
  g.roles = { leader: pid, center: pid, mainVocal: pid, mainDancer: pid, mainRapper: pid };
  g.maknae = pid;
  g.gravity = { personId: pid, since: state.week - 4, stage: 1, rung: 1 };
  g.gravityWatch = { personId: pid, since: state.week - 2 };
  state.gravityExecAsk = { groupId: g.id, personId: pid };
  g.rooms = null; KP.assignRooms(state, g);
  g.prep = g.prep || { scheduledWeek: state.week + 4, progress: 0,
    tracks: [{ n: 2, slot: true, credit: null }] };
  g.prep.tracks = [{ n: 2, slot: true, credit: { type: 'solo', memberId: pid } },
    { n: 3, slot: true, credit: { type: 'unit', memberIds: [pid, g.members.find(id => id !== pid)] } }];
}

function pointerFaults(state) {
  return KP.validateState(state).filter(v =>
    /non-member|maknae|gravity|credits|partition/.test(v));
}

function checkExit(label, state, g, pid) {
  const faults = pointerFaults(state);
  t.eq(faults.length, 0, label + ': no live pointer names the leaver (' + faults.join('; ') + ')');
  t.ok(!g.members.includes(pid), label + ': the lineup let her go');
  t.ok(!state.gravityExecAsk || state.gravityExecAsk.personId !== pid,
    label + ': the exec ask died with the exit');
}

// ---- door 1+2: the contract departure, warm and cold -------------------
['warm', 'cold'].forEach(mode => {
  const { state, g } = debuted('ex-depart-' + mode);
  const pid = g.members[1];
  pointEverything(state, g, pid);
  KP.departIdol(state, pid, mode, null);
  checkExit('departure (' + mode + ')', state, g, pid);
});

// ---- door 3: the member desk removal -----------------------------------
{
  const { state, g } = debuted('ex-remove');
  // the removal verb refuses during prep/promo — ride to a legal week
  while (state.week <= (g.promoUntil || 0)) KP.advanceWeek(state);
  const pid = g.members[1];
  pointEverything(state, g, pid);
  delete g.prep;   // the verb refuses a locked sleeve — test its own lane
  g.roles.leader = g.members[0];   // keep a leader who stays, like a real removal
  const r = KP.removeFromLineup(state, g.id, pid);
  t.ok(r.ok, 'fixture: the removal went through (' + (r.reason || '') + ')');
  checkExit('removal', state, g, pid);
}

// ---- door 4: the graduation to solo ------------------------------------
{
  const { state, g } = debuted('ex-grad');
  while (state.week <= (g.promoUntil || 0)) KP.advanceWeek(state);
  const pid = g.members[1];
  pointEverything(state, g, pid);
  delete g.prep;   // graduation happens between eras
  const r = KP.graduateToSolo(state, pid);
  t.ok(r.ok, 'fixture: the graduation went through (' + (r.reason || '') + ')');
  checkExit('graduation', state, g, pid);
  t.ok(state.groups.some(x => x.type === 'solo' && x.members[0] === pid),
    'and the solo door opened behind her');
}

// ---- door 5: the scandal release (the choice) --------------------------
{
  const { state, g } = debuted('ex-scandal');
  const pid = g.members[1];
  const p = state.people[pid];
  pointEverything(state, g, pid);
  delete g.prep;
  p.scandal = { shape: 'a story with legs', sev: 4, week: state.week, answered: 'statement' };
  KP.openScene(state, { kind: 'theChoice', personId: pid, expiresWeek: state.week + 2 });
  const sc = state.scenes.find(x => x.kind === 'theChoice');
  KP.resolveScene(state, sc.id, 'release');
  t.eq(state.people[pid].status, 'released', 'fixture: the company chose the empty chair');
  checkExit('scandal release', state, g, pid);
}

// ---- the last one out: every pointer clears with the lights ------------
{
  const { state, g } = debuted('ex-lights');
  while (state.week <= (g.promoUntil || 0)) KP.advanceWeek(state);
  delete g.prep;
  g.members.slice().forEach(id => {
    const p = state.people[id];
    pointEverything(state, g, id);
    delete g.prep;   // surgery path, not the sleeve guard
    KP.lineupSurgery(state, g, p, true, () => {});
  });
  t.eq(g.members.length, 0, 'fixture: the lineup emptied');
  t.eq(pointerFaults(state).length, 0, 'an empty group holds no live pointers');
  t.eq(Object.keys(g.roles || {}).length, 0, 'roles cleared');
  t.ok(!g.maknae, 'maknae cleared');
}

// ---- the migration heals pre-0.10.16 saves -----------------------------
{
  const { state, g } = debuted('ex-migrate');
  const pid = g.members[1];
  pointEverything(state, g, pid);
  // corrupt the save the way the old bugs did: remove her, sweep nothing
  g.members = g.members.filter(id => id !== pid);
  t.ok(pointerFaults(state).length > 0, 'fixture: the stale save is really stale');
  state.version = '0.10.15';
  const healed = KP.deserialize(KP.serialize(state));
  t.eq(pointerFaults(healed).length, 0, 'the migration heals every stale pointer');
}

// ---- the replacement pays the severance (v0.10.16) ---------------------
{
  const state = KP.newGame('ex-replace', null, { legacy: true });
  state.budget = 900;
  state.scenes = (state.scenes || []).filter(sc => sc.kind !== 'theInterview');
  const HR = KP.C.HIRES;
  KP.staffSeats(state);   // lazily seed the incumbents
  const prev = state.seats.vocal;
  prev.tier = 'known';   // firing a known costs trust — replacing must too
  const cand = { id: 'exCAND', name: 'Ma Seon-mi', seatId: 'vocal', tier: 'working',
    style: 'drillmaster', warmth: 60, candor: 60, resume: ['two debuts back to back'] };
  KP.openScene(state, { kind: 'theInterview', cand, expiresWeek: state.week + 2 });
  const sc = state.scenes.find(x => x.kind === 'theInterview');
  const opts = KP.sceneDef('theInterview').options(state, sc);
  const sev = Math.max(HR.severanceMin, Math.round(HR.hireCost.known * HR.severanceMult));
  t.ok(new RegExp('Hire · ' + (HR.hireCost.working + sev)).test(opts[0].label),
    'the label prices the severance in (' + opts[0].label + ')');
  const b0 = state.budget, t0 = state.trust, fired0 = KP.hiresLedger(state).fired;
  KP.resolveScene(state, sc.id, 'hire');
  t.eq(b0 - state.budget, HR.hireCost.working + sev,
    'replacing a sitter costs the hire PLUS their severance');
  t.eq(state.trust, t0 - 1, 'and letting a known name go by replacement costs the same trust');
  t.eq(KP.hiresLedger(state).fired, fired0 + 1, 'the goodbye is ledgered as a goodbye');
  t.eq(state.seats.vocal.name, 'Ma Seon-mi', 'the chair changed hands');
}

// ---- determinism -------------------------------------------------------
{
  const a = KP.newGame('ex-fork', null, { legacy: true });
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the clean exits fork clean');
}

t.finish();
