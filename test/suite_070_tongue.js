/* Suite 070 — the deep map + the tongue + the world's auditions
   (v0.9.29, map slot 10, §55.5 + §55.15). */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_070_tongue');

function debuted(seed) {
  const state = KP.newGame(seed, null, { legacy: false });
  state.budget = 800;
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'PASSPORT', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  let guard = 0;
  while (!g.debuted && guard++ < 12) KP.advanceWeek(state);
  return { state, g };
}

// ---- the audition tour: the class, the file, the fog ------------------
{
  const state = KP.newGame('tg-aud', null, { legacy: false });
  state.budget = 300;
  const before = state.prospects.length;
  const budget0 = state.budget;
  const r = KP.fundAudition(state, 'jp');
  t.ok(r.ok, 'the circuit runs');
  t.eq(state.budget, budget0 - KP.C.TONGUE.AUDITION.cost, 'venues, judges, flights, tape');
  const minted = state.prospects.slice(before).map(id => state.people[id]);
  t.ok(minted.length >= 2, 'callbacks made the tape');
  t.ok(minted.every(p => p.origin === 'jp' && p.nativeLang === 'Japanese'),
    'home region and native language on the file');
  t.ok(minted.every(p => p.ko >= KP.C.TONGUE.koStart[0] && p.ko <= KP.C.TONGUE.koStart[1]),
    'they arrive mid-sentence');
  t.ok(minted.every(p => p.observations === 0), 'the read is half guesswork');
  t.ok(minted.every(p => KP.C.TONGUE.NAMES.jp.given.includes(p.name.given)),
    'names from home, used with care');
  t.ok(!KP.fundAudition(state, 'jp').ok, 'auditions are annual affairs');
  t.ok((state.tongueLedger || {}).auditions === 1 && state.tongueLedger.intlMinted >= 2, 'ledgered');
  // signing stamps the ledger
  state.budget = 300;
  KP.signProspect(state, minted[0].id);
  t.eq(state.tongueLedger.intlSigned, 1, 'the international signs');
  // home is her first stronghold — the hash-truth, finally earned
  t.eq(KP.strongholdsOf(state, minted[0])[0], 'jp', 'her corner of the map is HOME');
}

// ---- the tongue trains ------------------------------------------------
{
  const state = KP.newGame('tg-ko', null, { legacy: false });
  state.budget = 300;
  KP.fundAudition(state, 'sea');
  const p = state.people[state.prospects[state.prospects.length - 1]];
  KP.signProspect(state, p.id);
  p.ko = KP.C.TONGUE.koConversational - 1;
  for (let w = 0; w < 6; w++) KP.advanceWeek(state);   // 0.25/wk in the practice room
  t.ok(p.ko >= KP.C.TONGUE.koConversational, 'the practice room after hours works');
  t.ok(state.inbox.some(n => /Korean crossed the line/.test(n.text)),
    'and the building notices the joke landing');
}

// ---- the voice abroad and the airport ---------------------------------
{
  const { state, g } = debuted('tg-voice');
  // an international member joins the lineup fiction directly
  const her = state.people[g.members[0]];
  her.origin = 'jp'; her.nativeLang = 'Japanese'; her.ko = 80;
  t.ok(KP.speaks(her, 'Japanese'), 'native tongue');
  t.eq(KP.voiceAbroad(state, g, 'jp'), her, 'she is the voice of that market');
  t.eq(KP.voiceAbroad(state, g, 'latam'), null, 'and nobody speaks for this one');
  // a japan leg: fluent voice, and the airport fills for her
  g.popularity = 60;
  KP.regionsOf(g).jp = 60;
  let guard = 0;
  while ((state.week <= (g.promoUntil || 0) + KP.C.COMEBACK.restWeeks) && guard++ < 20) KP.advanceWeek(state);
  const r = KP.planTour(state, { groupId: g.id, scale: 'clubs', legs: ['jp'],
    pacing: 'humane', setlist: 'hits' });
  t.ok(r.ok !== false, 'fixture: the tour books (' + (r.reason || 'ok') + ')');
  guard = 0;
  while (g.tour && guard++ < 30) KP.advanceWeek(state);
  const tl = state.tongueLedger || {};
  t.ok((tl.voiceLegs || 0) >= 1, 'the fluent leg is ledgered');
  t.ok((tl.airports || 0) >= 1, 'the tour came HOME');
  t.ok(her.history.some(h => /arrivals hall was full/.test(h.text)), 'and she will never forget it');
  t.ok(state.inbox.some(n => n.ind === 'airportHome'), 'the wire carried the clip');
}

// ---- determinism ------------------------------------------------------
{
  const state = KP.newGame('tg-fork', null, { legacy: false });
  state.budget = 400;
  KP.fundAudition(state, 'latam');
  const b = KP.deserialize(KP.serialize(state));
  for (let w = 0; w < 50; w++) { KP.advanceWeek(state); KP.advanceWeek(b); }
  t.eq(KP.serialize(state), KP.serialize(b), 'auditions, tongues, and airports fork clean');
}

t.finish();
