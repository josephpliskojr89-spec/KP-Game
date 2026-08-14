/* Suite 061 — the mandate (v0.9.19). §61 items 1/2/5: the player is an
   executive producer — new acts start when the directive comes down
   (or when your pitch survives the boardroom); trainees sign the
   industry-standard three-year paper and the table at the end of it is
   real; announced eras build toward the date instead of going quiet. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_061_mandate');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  state.budget = 600;
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'MERIDIAN', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return { state, g };
}

// ---- the gate: debuts come down from above ----------------------------
{
  const state = KP.newGame('md-gate', null, { legacy: false });
  t.eq(KP.openMandates(state).length, 1, 'a fresh company holds exactly one mandate');
  t.eq(KP.openMandates(state)[0].source, 'the founding directive', 'the 18-month girl group IS the first greenlight');
  const ids = state.roster.slice(0, 5);
  const ok = KP.proposeGroup(state, 'COVERED', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  t.ok(ok.ok, 'the founding directive covers the first lineup');
}
{
  const { state } = debuted('md-second');
  // the founding directive resolved at debut — the room is dark now
  const spare = state.prospects.slice(0, 5).map(id => state.people[id]);
  spare.forEach(p => { p.status = 'trainee'; p.gender = 'f';
    p.traineeContract = { start: state.week, years: 3, term: 1 };
    state.roster.push(p.id); });
  state.prospects = state.prospects.filter(id => !spare.some(p => p.id === id));
  const blocked = KP.proposeGroup(state, 'DARKROOM', spare.map(p => p.id),
    KP.roleHints(state, spare));
  t.ok(!blocked.ok && /greenlight/i.test(blocked.reason), 'no greenlight, no second act');
  t.ok(!KP.openProject(state, [spare[0].id], ['vocals']).ok, 'the project needs the same paper');
  // the pitch: denied for reasons, granted for reasons
  state.trust = 30;
  const denied = KP.pitchMandate(state, { kind: 'group' });
  t.ok(!denied.ok && denied.denied, 'a low-trust pitch dies in the room');
  const walled = KP.pitchMandate(state, { kind: 'group' });
  t.ok(!walled.ok && !walled.denied && /calendar/i.test(walled.reason), 'and the boardroom calendar closes behind it');
  state.mandateCooldownUntil = 0;
  state.trust = 60;
  const granted = KP.pitchMandate(state, { kind: 'group', gender: 'f' });
  t.ok(granted.ok, 'trust plus a full room gets the greenlight');
  t.eq(state.mandateLedger.granted, 1, 'ledgered');
  const formed = KP.proposeGroup(state, 'GREENLIT', spare.map(p => p.id), KP.roleHints(state, spare));
  t.ok(formed.ok, 'the greenlight opens the builder');
  // ride the second act to its debut — the mandate settles met
  const g2 = state.groups.find(g => g.name === 'GREENLIT');
  state.budget = Math.max(state.budget, 400);
  g2.demos = g2.demos || KP.generateDemos(state, KP.rngFor(state));
  KP.planDebut(state, { groupId: g2.id, songId: g2.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g2.debuted && guard++ < 12) KP.advanceWeek(state);
  t.ok(g2.debuted, 'fixture: the second act debuted');
  t.ok((state.mandates || []).some(m => m.status === 'met' && m.groupId === g2.id),
    'the debut consumed the mandate that opened its door');
  t.ok((state.objectiveHistory || []).some(h => h.type === 'mandate' && h.status === 'met'),
    'and the record keeps it');
}

// a greenlight left dark lapses, and the board remembers
{
  const { state } = debuted('md-lapse');
  state.trust = 60;
  const m = KP.openMandate(state, { kind: 'group', source: 'the board' });
  m.window = state.week;   // already past — the next tick rules on it
  // A/B fork: the same week without the mandate isolates the lapse cost
  // (a show win the same week once masked it — trust moves for many reasons)
  const b = KP.deserialize(KP.serialize(state));
  b.mandates = [];
  KP.advanceWeek(state); KP.advanceWeek(b);
  t.eq(m.status, 'lapsed', 'the window closed unused');
  t.eq(state.trust, b.trust + KP.C.MANDATE.lapseTrust,
    'greenlights are trust, and trust is a consumable (exactly ' + KP.C.MANDATE.lapseTrust + ')');
  t.ok(state.inbox.some(n => /floor stayed dark/.test(n.text)), 'the exec says so out loud');
}

// the board reads the room without being asked
{
  const { state } = debuted('md-pressure');
  const spare = state.prospects.slice(0, 6).map(id => state.people[id]);
  spare.forEach(p => { p.status = 'trainee';
    p.traineeContract = { start: state.week, years: 3, term: 1 };
    state.roster.push(p.id); });
  state.prospects = state.prospects.filter(id => !spare.some(p => p.id === id));
  const M = KP.C.MANDATE;
  const oldChance = M.roomPressureChance;
  M.roomPressureChance = 1;
  KP.advanceWeek(state);
  M.roomPressureChance = oldChance;
  t.ok(KP.openMandates(state).some(m => /board/.test(m.source)),
    'a loud floor gets its greenlight without a pitch');
}

// the virtual mandates: every existing directive is already a door
{
  const { state, g } = debuted('md-virtual');
  const kid = state.people[state.roster.find(id => state.people[id].status === 'trainee') ||
    state.roster[0]];
  state.hypeDirective = { status: 'open', personId: kid.id, deadlineWeek: state.week + 20 };
  t.ok(KP.mandateFitting(state, { kind: 'solo', gender: kid.gender, memberIds: [kid.id] }),
    'the hard directive covers her, solo');
  t.ok(!KP.mandateFitting(state, { kind: 'group', gender: 'f', memberIds: [] }),
    'but it does not cover an unrelated group');
  state.hypeDirective = null;
  KP.openClaim(state, { type: 'petProject', subject: { kind: 'exec' }, byWeek: state.week + 52 });
  t.ok(KP.mandateFitting(state, { kind: 'solo', gender: 'f', memberIds: [] }),
    'the pet project is a solo greenlight');
  KP.openClaim(state, { type: 'secondGroup', subject: { kind: 'exec' },
    baseline: KP.groups(state).length, byWeek: state.week + 52 });
  t.ok(KP.mandateFitting(state, { kind: 'group', gender: 'm', memberIds: [] }),
    'the second-lineup promise carries its own greenlight');
}

// ---- the paper clock: three years, then a real table ------------------
{
  const state = KP.newGame('md-paper', null, { legacy: false });
  state.roster.forEach(id => {
    const p = state.people[id];
    t.ok(p.traineeContract && p.traineeContract.years === 3, id + ' carries the three-year term');
  });
  // sign a fresh prospect: the paper stamps at the desk
  state.budget = 500;
  const r = KP.signProspect(state, state.prospects[0]);
  t.ok(r.ok, 'fixture: signed');
  const signee = Object.values(state.people).find(p => p.status === 'trainee' && p.signedWeek === state.week);
  t.ok(signee.traineeContract.start === state.week, 'the clock starts at the signature');
}
{
  // the table: renew, and the belief is notarized
  const state = KP.newGame('md-table', null, { legacy: false });
  const p = state.people[state.roster[0]];
  p.traineeContract.start = state.week - 3 * KP.C.WEEKS_PER_YEAR + 4;
  KP.advanceWeek(state);
  const sc = (state.scenes || []).find(x => x.kind === 'traineeRenewal' && x.personId === p.id);
  t.ok(sc, 'the expiring term reaches the desk with notice');
  t.ok(state.inbox.some(n => /three-year trainee contract is running out/.test(n.text)), 'and the letter says so');
  KP.resolveScene(state, sc.id, 'renew');
  t.eq(p.traineeContract.term, 2, 'term two, on the record');
  t.ok(p.history.some(h => /Signed trainee term 2/.test(h.text)), 'her file carries the new paper');
}
{
  // she declines the offer herself when the math stops working
  const state = KP.newGame('md-decline', null, { legacy: false });
  const p = state.people[state.roster[0]];
  p.traineeContract.start = state.week - 3 * KP.C.WEEKS_PER_YEAR + 4;
  p.signedWeek = state.week - Math.round(4.5 * KP.C.WEEKS_PER_YEAR);
  p.morale = 30;
  KP.advanceWeek(state);
  const sc = (state.scenes || []).find(x => x.kind === 'traineeRenewal' && x.personId === p.id);
  t.ok(sc, 'fixture: the table');
  KP.resolveScene(state, sc.id, 'renew');
  t.eq(p.status, 'released', 'the offer was made; the answer was hers');
  t.ok(p.history.some(h => /turned it down/.test(h.text)), 'and the file respects the choice');
}
{
  // the unanswered table answers itself
  const state = KP.newGame('md-expire', null, { legacy: false });
  const p = state.people[state.roster[1]];
  p.traineeContract.start = state.week - 3 * KP.C.WEEKS_PER_YEAR + 4;
  for (let w = 0; w < KP.C.TRAINEE_CONTRACT.noticeWeeks + 3 && p.status === 'trainee'; w++) {
    // leave the traineeRenewal scene sitting; resolve everything else
    (state.scenes || []).slice().forEach(sc => {
      if (sc.kind === 'traineeRenewal') return;
      const def = KP.sceneDef(sc.kind);
      if (def) KP.resolveScene(state, sc.id, def.options(state, sc)[0].id);
    });
    KP.advanceWeek(state);
  }
  t.eq(p.status, 'released', 'contracts do not wait for meetings');
  t.ok(p.history.some(h => /without a meeting/.test(h.text)), 'the file says how it ended');
}
{
  // a term lapping mid-lineup bridges to the debut without a table
  const state = KP.newGame('md-bridge', null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'BRIDGEWORK', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const p = state.people[ids[0]];
  p.traineeContract.start = state.week - 3 * KP.C.WEEKS_PER_YEAR + 4;
  KP.advanceWeek(state);
  t.eq(p.status, 'trainee', 'nobody walks during debut prep');
  t.eq(p.traineeContract.term, 2, 'legal bridged the paper');
  t.ok(!(state.scenes || []).some(x => x.kind === 'traineeRenewal'), 'no table needed');
  // and the debut converts the paper entirely
  const g = state.groups[0];
  state.budget = 600;
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  t.ok(!p.traineeContract && p.contract && p.contract.years === KP.C.CONTRACT.years,
    'the debut trades the trainee paper for the seven-year contract');
}
{
  // migration: an old save's trainees get the standard paper, backdated
  const old = KP.newGame('md-migrate', null, { legacy: false });
  old.roster.forEach(id => { delete old.people[id].traineeContract; });
  old.people[old.roster[0]].signedWeek = 1;
  old.week = 200;
  old.version = '0.9.18.2';
  const migrated = KP.deserialize(KP.serialize(old));
  const vet = migrated.people[migrated.roster[0]];
  t.ok(vet.traineeContract, 'the veteran got paper');
  t.ok(vet.traineeContract.term >= 2, 'terms already served roll the clock, not the door');
  t.ok(migrated.inbox.some(n => /three-year term/.test(n.text)), 'legal announces the standardization');
}

// ---- the build-up: the announcement is an event, the wait is content --
{
  const { state, g } = debuted('md-teaser');
  g.fandom = g.fandom || { name: 'HELIO', intensity: 60 };
  g.popularity = Math.max(g.popularity || 0, 50);
  // wait out promo + rest, then lock a comeback with runway
  let guard = 0;
  while (state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks && guard++ < 30) KP.advanceWeek(state);
  g.demos = KP.generateDemos(state, KP.rngFor(state));
  state.budget = Math.max(state.budget, 400);
  const lock = KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 5, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  t.ok(lock.ok, 'fixture: the comeback locks');
  t.ok(state.inbox.some(n => n.ind === 'eraAnnounced'), 'the announcement is a public event');
  t.ok(KP.feedReactionFor('eraAnnounced'), 'and the registry knows how to cheer');
  const hype0 = state.people[g.members[0]].hype || 0;
  while (g.prep && !g.results) KP.advanceWeek(state);
  t.ok(g.results, 'fixture: released');
  const rel = g.releases[g.releases.length - 1];
  t.ok(rel.anticipation >= 1, 'the countdown banked a real opening edge (' + rel.anticipation + ')');
  t.ok(rel.anticipation <= KP.C.TEASER.anticipationCap, 'capped — an amplifier, never the record');
  t.ok((state.people[g.members[0]].hype || 0) !== hype0 || rel.anticipation >= 1,
    'the beats warmed somebody up');
  t.ok(state.feed.some(p => /teaser|TRACKLIST|concept film|countdown/i.test(p.text)),
    'the timeline counted down out loud');
}

// ---- determinism ------------------------------------------------------
{
  const a = KP.newGame('md-fork', null, { legacy: false });
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'mandates, paper clocks, and countdowns fork clean');
}

t.finish();
