/* Suite 112 — the flavor families (v0.11.2, §93). Owner: "so we don't see
   so many repeats." One mechanism, a family of sentences: KP.lineFor picks
   by hash (deterministic, rng-free, and it skips the line last read when
   told); the spotlight remembers what she was last seen doing — the same
   key never reads the same way twice running, and a moment she was not
   last seen in is preferred when one is true; the heavy inds carry
   families in play; the load-bearing phrases survive the rewrite (SELCA
   DAY, bubble, announced … comeback for, won … — their first, broke
   containment, birthday week, debut class, after-eval talk); the
   families fork clean. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_112_flavor');

// the census normalizer, in miniature: names, quotes, handles and numbers
// become tokens so a sentence that only swaps a name is the same sentence
function normalizer(state) {
  const names = [];
  Object.values(state.people).forEach(p => {
    if (p.name) { names.push(p.name.display, p.name.given); if (p.name.family) names.push(p.name.family); }
  });
  (state.groups || []).forEach(g => { names.push(g.name); if (g.fandom && g.fandom.name) names.push(g.fandom.name); });
  (state.rivals || []).forEach(r => { names.push(r.name, r.short); (r.acts || []).forEach(a => names.push(a.name)); });
  names.push(state.company.name, state.company.short, state.executive.name);
  const uniq = Array.from(new Set(names.filter(n => n && n.length >= 3))).sort((a, b) => b.length - a.length);
  const re = new RegExp(uniq.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  return text => String(text || '').replace(/[“"][^”"]{1,80}[”"]/g, '“…”').replace(re, '{N}')
    .replace(/@[a-z0-9_]+/gi, '@h').replace(/\d[\d,.]*/g, '#');
}
const distinct = (norm, texts) => new Set(texts.map(norm)).size;

// ---- the family picker ------------------------------------------------------------
{
  const state = KP.newGame('flavor-lines');
  t.eq(KP.lineFor(state, 'x', ['only']), 'only', 'a family of one reads as itself');
  t.eq(KP.lineFor(state, 'x', []), '', 'an empty family reads as nothing');
  const lines = ['a', 'b', 'c'];
  const base = state.week;
  const seen = new Set();
  for (let w = 0; w < 60; w++) { state.week = base + w; seen.add(KP.lineFor(state, 'fam', lines)); }
  t.eq(seen.size, 3, 'sixty weeks reach every line of a family of three');
  state.week = base + 7;
  t.eq(KP.lineFor(state, 'fam', lines), KP.lineFor(state, 'fam', lines), 'the pick is a hash — the same week reads the same line twice');
  let differs = false;
  for (let w = 0; w < 60; w++) { state.week = base + w; if (KP.lineFor(state, 'fam', lines) !== KP.lineFor(state, 'other', lines)) differs = true; }
  t.ok(differs, 'the salt separates families');
  let skipped = true;
  for (let w = 0; w < 40; w++) {
    state.week = base + w;
    const i = lines.indexOf(KP.lineFor(state, 'fam', lines));
    if (KP.lineFor(state, 'fam', lines, i) === lines[i]) skipped = false;
  }
  t.ok(skipped, 'told what was last read, the family never reads it again');
}

// ---- the spotlight's memory -------------------------------------------------------
{
  const state = KP.newGame('flavor-spot', null, { legacy: true });
  const p = Object.values(state.people).find(x => x.status === 'idol');
  t.ok(p, 'a legacy org has idols');
  const n = 3;
  const h = Math.floor(KP.hash01([state.seed, p.id, state.week, 'afterHours', 'variant'].join('|')) * n);
  p.flags.spotMem = { afterHours: h };
  t.eq(KP.spotIdx(state, p, 'afterHours', n), (h + 1) % n, 'the spotlight skips the line she was last seen in');
  p.flags.spotMem = { friendScene: h };
  t.eq(KP.spotIdx(state, p, 'afterHours', n), h, 'another key’s memory does not move this one');
  p.flags.spotMem = { afterHours: h, friendScene: (h + 2) % n };
  t.eq(KP.spotIdx(state, p, 'afterHours', n), (h + 1) % n, 'the memory is one slot per key — other keys between do not erase it');
  t.eq(KP.spotIdx(state, p, 'afterHours', 1), 0, 'a family of one is index zero');
  delete p.flags.spotMem;
}

// ---- the rota reads several keys for her over the weeks -----------------------------
{
  const state = KP.newGame('flavor-pick', null, { legacy: true });
  const p = Object.values(state.people).find(x => x.status === 'idol' && !x.flags.ambitionMet);
  t.ok(p, 'an idol with an ambition still open');
  p.fatigue = 70; p.personality.workEthic = 80;   // afterHours is true; so are the ambition and the voice
  const keys = new Set();
  const base = state.week;
  for (let w = 0; w < 40; w++) { state.week = base + w; keys.add(KP.spotPick(state, p)); }
  state.week = base;
  t.ok(!keys.has(null) && keys.size >= 2, 'the weekly hash walks the true moments (' + Array.from(keys).join(', ') + ')');
}

// ---- the bubble family keeps its word -----------------------------------------------
{
  const state = KP.newGame('flavor-bubble', null, { legacy: true });
  const idols = Object.values(state.people).filter(x => x.status === 'idol');
  const saved = KP.C.LIFE.bubbleChance;
  KP.C.LIFE.bubbleChance = 1.01;
  idols.forEach(p => { p.morale = 85; p.fatigue = 20; p.flags.scar = 0; });
  const norm = normalizer(state);
  const base = state.week;
  const texts = [];
  for (let w = 0; w < 30; w++) { state.week = base + w; KP.bubblePosts(state).forEach(x => texts.push(x.text)); }
  KP.C.LIFE.bubbleChance = saved;
  state.week = base;
  t.ok(texts.length >= 30, 'the screenshots travel (' + texts.length + ')');
  t.ok(texts.every(x => /bubble/.test(x)), 'every line keeps the word the harness tallies');
  t.ok(distinct(norm, texts) >= 2, 'a glowing week reads more than one way (' + distinct(norm, texts) + ' templates)');
  t.ok(texts.every(x => !/\{(she|her|pos|hers|She|Pos)\}/.test(x)), 'the pronouns are filled');
}

// ---- the families in play: 130 weeks of a legacy org -------------------------------
{
  const state = KP.newGame('flavor-play', null, { legacy: true });
  const norm = normalizer(state);
  const byInd = {};
  const rel = [];
  const spot = [];
  const feed = [];
  const seenFeed = new Set();
  for (let w = 0; w < 130; w++) {
    state.budget = Math.max(state.budget, 9000);   // untended fixtures dissolve (v0.11.0)
    KP.advanceWeek(state);
    (KP.lastTickNotes || []).forEach(n => {
      if (!n || !n.text) return;
      if (n.ind) (byInd[n.ind] = byInd[n.ind] || []).push(n.text);
      if (n.kind === 'relationship') rel.push(n.text);
    });
    KP.spotlightThisWeek(state).forEach(m => spot.push({ personId: m.personId, key: m.key, text: m.text, week: m.week,
      status: (state.people[m.personId] || {}).status }));   // her status THAT week — the legacy act ages out
    (state.feed || []).forEach(x => { if (x && x.text && !seenFeed.has(x)) { seenFeed.add(x); feed.push(x.text); } });
  }
  t.ok(!state.dissolved, 'the fixture stays alive');
  // the phrase laws
  const law = (ind, re, label) => {
    const xs = byInd[ind] || [];
    if (xs.length) t.ok(xs.every(x => re.test(x)), label + ' (' + xs.length + ' notes)');
  };
  law('comebackAnnounce', /announced .*comeback for/, 'every announcement names the date');
  law('rivalShowWin', /won .* — their first/, 'a rival’s first trophy says so');
  law('castViral', /broke containment/, 'the upload that broke containment says so');
  law('idolBirthday', /birthday week/, 'a birthday week says so');
  law('debutClass', /debut class/, 'the debut class line-up says so');
  law('evalTalk', /after-eval talk/, 'the after-eval talk says so');
  const selca = feed.filter(x => /SELCA DAY/.test(x));
  t.ok(selca.length >= 3, 'selca days reach the timeline (' + selca.length + ')');
  t.ok(selca.every(x => /^SELCA DAY/.test(x)), 'and every one opens with the day');
  // the families: an ind that fires often reads more than one way
  const FAMILIES = ['comebackAnnounce', 'showcase', 'breakthrough', 'plateau', 'evalSheet', 'evalTalk', 'application',
    'rivalHit', 'rivalScouts', 'masterMinted', 'gayoInvite', 'neverPaid', 'chodong', 'soldOutStory', 'promoOffer',
    'debutClass', 'anniversary', 'idolBirthday', 'diagnosisIn', 'castViral', 'gravityTrades', 'flagshipHunt',
    'rivalShowWin', 'socialMilestone', 'personMoment'];
  let checked = 0;
  FAMILIES.forEach(ind => {
    const xs = byInd[ind] || [];
    if (xs.length < 5) return;
    checked++;
    t.ok(distinct(norm, xs) >= 2, ind + ' reads more than one way (' + distinct(norm, xs) + ' templates over ' + xs.length + ' notes)');
  });
  t.ok(checked >= 5, 'enough families fired to judge (' + checked + ')');
  t.ok(rel.length >= 8 && distinct(norm, rel) >= 4, 'the relationship notes read in families (' + distinct(norm, rel) + ' templates over ' + rel.length + ' notes)');
  // the spotlight: never the same line twice running for the same key and person
  const lastBy = {};
  let repeats = 0;
  spot.slice().sort((a, b) => a.week - b.week).forEach(m => {
    const k = m.personId + '|' + m.key;
    if (lastBy[k] === m.text) repeats++;
    lastBy[k] = m.text;
  });
  t.eq(repeats, 0, 'the same key never reads the same way twice running for her (' + spot.length + ' lines)');
  t.ok(distinct(norm, spot.map(m => m.text)) >= 25, 'the spotlight speaks in many templates (' + distinct(norm, spot.map(m => m.text)) + ')');
  // the idols (who have several true moments) are read in more than one key
  const idolKeys = new Set(spot.filter(m => m.status === 'idol').map(m => m.key));
  t.ok(idolKeys.size >= 2, 'the idols are read in more than one key (' + Array.from(idolKeys).join(', ') + ')');
}

// ---- determinism ---------------------------------------------------------------
{
  const a = KP.newGame('flavor-fork', null, { legacy: true });
  for (let w = 0; w < 12; w++) { a.budget = Math.max(a.budget, 9000); KP.advanceWeek(a); }
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 30; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the families fork clean');
}

t.finish();
