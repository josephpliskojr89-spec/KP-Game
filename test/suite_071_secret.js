/* Suite 071 — the secret (v0.9.30, map slot 11, §72). Dating &
   Dispatch under the FULL content law: never player-controlled,
   never at bodies, adults only, snark at the cameras — the player's
   whole game is the company's side. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_071_secret');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  state.budget = 800;
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'MIDNIGHT', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  const p = state.people[g.members[0]];
  p.age = Math.max(p.age, 21);
  p.flags.privateNote = true;
  return { state, g, p };
}
function seedSecret(state, p) {
  p.flags.secret = { since: state.week - KP.C.SECRET.briefWeeks - 1, sphere: 'outside' };
}

// ---- the brief: the player learns exactly one sentence ----------------
{
  const { state, p } = debuted('sx-brief');
  seedSecret(state, p);
  KP.advanceWeek(state);
  t.ok(p.flags.secret.briefed, 'the manager closes the door');
  t.ok(state.secretLedger.briefs >= 1, 'ledgered');
  const brief = state.inbox.find(n => /manager closed your door/.test(n.text));
  t.ok(brief, 'and says it in one sentence');
  t.ok(!/name|met|dating since/.test(brief.text.toLowerCase().replace('normal life', '')),
    'no partner identity — the rest is HERS');
}

// ---- the reveal and the warm confirm ----------------------------------
{
  const { state, g, p } = debuted('sx-confirm');
  seedSecret(state, p);
  KP.advanceWeek(state);
  // force the photos rather than riding probability
  p.flags.secret.revealed = true;
  p.flags.secret.revealedWeek = state.week;
  state.secretLedger.reveals++;
  KP.openScene(state, { kind: 'theReveal', personId: p.id, expiresWeek: state.week + 2 });
  const sc = (state.scenes || []).find(x => x.kind === 'theReveal');
  t.ok(sc, 'the response is due before the morning shows open');
  g.fandom = g.fandom || { name: 'HALO', color: 'x', since: 1, intensity: 60 };
  const fan0 = g.fandom.intensity;
  const morale0 = p.morale;
  KP.resolveScene(state, sc.id, 'confirm');
  t.ok(g.fandom.intensity < fan0, 'the room takes it hard');
  t.ok(p.morale > morale0, 'she gets to read the true sentence first');
  t.ok((p.directed || []).some(d => d.kind === 'stoodByHer'), 'and never forgets it');
  t.eq(state.secretLedger.confirms, 1, 'ledgered');
  t.ok(p.flags.secret.recovery > 0, 'the honest answer heals');
  const before = g.fandom.intensity;
  KP.advanceWeek(state);
  t.ok(g.fandom.intensity >= before, 'weekly, on schedule');
}

// ---- the denial is a loan ---------------------------------------------
{
  const { state, g, p } = debuted('sx-deny');
  seedSecret(state, p);
  KP.advanceWeek(state);
  p.flags.secret.revealed = true;
  p.flags.secret.revealedWeek = state.week;
  KP.openScene(state, { kind: 'theReveal', personId: p.id, expiresWeek: state.week + 2 });
  g.fandom = g.fandom || { name: 'HALO2', color: 'x', since: 1, intensity: 60 };
  KP.resolveScene(state, (state.scenes || []).find(x => x.kind === 'theReveal').id, 'deny');
  t.ok(p.flags.secret.denied, 'the denial is on the record');
  t.ok((p.directed || []).some(d => d.kind === 'madeHerHide'),
    'and it lands in the grudge ledger the walkout reads');
  t.ok(p.history.some(h => /not on any ledger the office keeps/.test(h.text)), 'written with care');
}

// ---- protection buys real quiet ---------------------------------------
{
  const { state, p } = debuted('sx-protect');
  seedSecret(state, p);
  KP.advanceWeek(state);
  KP.setProtectedLife(state, p.id, true);
  const b0 = state.budget;
  KP.advanceWeek(state);
  t.ok(state.budget < b0, 'cover schedules and decoy vans bill weekly');
  t.ok(state.secretLedger.protectedWeeks >= 1, 'ledgered');
}

// ---- content law holds in every string --------------------------------
{
  const src = require('fs').readFileSync(__dirname + '/../js/engine/secret.js', 'utf8');
  t.ok(!/dispatch/i.test(src.replace(/Dispatch, under/i, '')), 'no real outlet names in the fiction');
  t.ok(!/kiss|hotel|her body|his body/i.test(src), 'never at bodies');
  t.ok(/age >= 19/.test(src), 'adults only, enforced in code');
}

// ---- determinism ------------------------------------------------------
{
  const { state, p } = debuted('sx-fork');
  seedSecret(state, p);
  const b = KP.deserialize(KP.serialize(state));
  for (let w = 0; w < 60; w++) { KP.advanceWeek(state); KP.advanceWeek(b); }
  t.eq(KP.serialize(state), KP.serialize(b), 'secrets, cameras, and answers fork clean');
}

t.finish();
