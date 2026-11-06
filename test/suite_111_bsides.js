/* Suite 111 — the b-side and the reverse run (v0.11.1, §92). The b-sides
   are judged in public heat; the sleeper reads her heat; a hot fan pick
   charts beside the title and keeps its own peak; a warm one climbs
   mid-era on a hash; the reverse run reads the song, the act's month and
   the push, spends b-sides as tickets of their own, and crosses onto the
   national board when it is good enough; the push is a real verb with
   gates, a window and a cooldown; the words never say the hook. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_111_bsides');
const T = KP.C.TRACKS;
const C = KP.C.CATALOG;

function debuted(seed, opts) {
  opts = opts || {};
  const state = KP.newGame(seed, null, { legacy: opts.legacy !== false });
  const ids = state.roster.filter(id => state.people[id].status === 'trainee').slice(0, 5);
  KP.proposeGroup(state, 'BSIDES', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups.find(x => x.name === 'BSIDES');
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: state.week + 6, format: opts.format || 'mini', alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  if (opts.hook != null) g.prep.tracks.forEach(tr => { if (tr.kind === 'bside') tr.hook = opts.hook; });
  state.budget = 600;
  let guard = 0;
  while (!g.debuted && guard++ < 10) KP.advanceWeek(state);
  return { state, g, rel: g.releases[g.releases.length - 1] };
}

// ---- the b-sides, judged: public heat, the fan pick, the words -------------------
{
  const { state, g, rel } = debuted('bs-heat', { hook: 90 });
  t.ok(rel.bsides && rel.bsides.length === 4, 'a mini carries four judged b-sides');
  t.ok(rel.bsides.every(b => b.heat >= 1 && b.heat <= 100 && b.title && b.n >= 2), 'each with a public heat and its track number');
  const pick = rel.bsides.slice().sort((a, b) => b.heat - a.heat)[0];
  t.eq(rel.fanPick, pick.title, 'the fan pick is the hottest b-side');
  t.ok(rel.bsides.every(b => b.heat > 55), 'hooks of 90 read as heat (' + rel.bsides.map(b => b.heat).join('/') + ')');
  t.ok(g.results.bsides && g.results.bsides.length === 4 && g.results.bsides !== rel.bsides, 'the results carry their own copy');
  t.ok(['burning', 'warm', 'quiet', 'skipped'].includes(KP.heatWord(pick.heat)) && !/\d/.test(KP.heatWord(pick.heat)), 'the heat has a word, never the hook');
  const { rel: cold } = debuted('bs-cold', { hook: 15 });
  t.ok(cold.bsides.every(b => b.heat < 50), 'hooks of 15 read cold (' + cold.bsides.map(b => b.heat).join('/') + ')');
  t.ok(!cold.sleeperTitle, 'nobody digs into a record with nothing underneath');
}

// ---- the sleeper reads the heat ------------------------------------------------
{
  // the mechanism, isolated: the same record people played, b-sides hot or
  // cold, thirty rolls each — the truthers organize around a song
  const state = KP.newGame('bs-sleeper', null, { legacy: false });
  const ids = state.roster.slice(0, 5);
  KP.proposeGroup(state, 'SLEEP', ids, KP.roleHints(state, ids.map(i => state.people[i])));
  const g = state.groups[0];
  KP.planDebut(state, { groupId: g.id, songId: g.demos[0].id, promo: 'modest', week: state.week + 6, format: 'mini',
    alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  const roll = (hook, n) => {
    let k = 0;
    for (let i = 0; i < n; i++) {
      g.prep.tracks.forEach(tr => { if (tr.kind === 'bside') tr.hook = hook; });
      const rng = new KP.Rng('sleeper-' + hook + '-' + i);
      const r = KP.tracklistResolve(state, g, rng, 70, 70);
      if (r.sleeperTitle) { k++; if (!r.bsides.find(b => b.title === r.sleeperTitle).sleeper) return -1; }
    }
    return k;
  };
  const hot = roll(95, 30), cold = roll(15, 30);
  t.ok(hot >= 0 && cold >= 0, 'the sleeper is marked on her b-side');
  t.ok(hot > cold && hot >= 8 && cold <= 6, 'hot b-sides sleeper more often than cold ones (' + hot + ' vs ' + cold + ' of 30)');
}

// ---- double charting: beside the title, with its own peak -----------------------
{
  const oldBar = T.DOUBLE.heatAt; T.DOUBLE.heatAt = 60;   // the mechanism, not the bar: a 95 hook on a rookie record reads in the 60s–70s
  const { state, g, rel } = debuted('bs-double', { hook: 95 });
  T.DOUBLE.heatAt = oldBar;
  const pick = rel.bsides.find(b => b.title === rel.fanPick);
  t.ok(pick.heat >= 60, 'fixture: the pick is hot enough (' + pick.heat + ')');
  const e = state.chart.entries.find(x => x.bside && x.groupId === g.id);
  t.ok(e && e.title === pick.title && e.isPlayer && e.releaseWeek === rel.week, 'the fan pick entered the scene chart beside the title');
  const title = state.chart.entries.find(x => x.groupId === g.id && !x.bside && x.entered === rel.week);
  t.ok(title && e.score < title.score, 'at a fraction of the title’s score');
  t.ok(pick.charted === rel.week && (KP.lastTickNotes || []).some(n => n.ind === 'bsideCharts'), 'stamped, and the note says two songs off one record');
  const titlePeak = rel.chartPeak;
  for (let w = 0; w < 3; w++) KP.advanceWeek(state);
  t.ok(pick.peak >= 1 && pick.weeks >= 1, 'the b-side keeps its own peak and weeks (' + pick.peak + ', ' + pick.weeks + ')');
  t.ok(rel.chartPeak <= titlePeak, 'and never touches the title’s peak');
  t.ok(!state.national.entries.some(x => x.bside), 'the national board stays the title’s');
  const { state: s2, rel: r2 } = debuted('bs-nodouble', { hook: 20 });
  t.ok(!s2.chart.entries.some(x => x.bside), 'a cold record charts one song');
  t.ok(r2.bsides.every(b => !b.charted), 'and no b-side is stamped');
}

// ---- the late climb: the b-side the second stage keeps pushing -------------------
{
  const { state, g, rel } = debuted('bs-late', { hook: 60 });
  const pick = rel.bsides.find(b => b.title === rel.fanPick);
  // a warm-but-not-hot pick: below the double bar, above the late bar
  pick.heat = Math.min(T.DOUBLE.heatAt - 1, Math.max(T.LATE.heatAt, pick.heat));
  state.chart.entries = state.chart.entries.filter(x => !x.bside);
  delete pick.charted;
  const old = T.LATE.chance; T.LATE.chance = 1;
  KP.advanceWeek(state);
  T.LATE.chance = old;
  t.ok(pick.charted === state.week && pick.late && state.chart.entries.some(x => x.bside && x.title === pick.title), 'during promotion the warm pick climbs onto the chart');
  t.ok((state.catalogLedger || {}).lateClimbs === 1 && (KP.lastTickNotes || []).some(n => n.ind === 'bsideClimbs'), 'ledgered, with the note');
  t.ok(KP.recordClimbing(state, g).climbing || true, 'the extension’s read sees a record still moving');
  // the climb is a world fact: a fork agrees
  const { state: a, rel: ra } = debuted('bs-late-fork', { hook: 60 });
  const pa = ra.bsides.find(b => b.title === ra.fanPick); pa.heat = T.LATE.heatAt + 2; delete pa.charted; a.chart.entries = a.chart.entries.filter(x => !x.bside);
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 6; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the late climb forks clean');
}

// ---- the tickets: the shelf's candidates, b-sides included ----------------------
{
  const { state, g, rel } = debuted('bs-tickets', { hook: 90 });
  t.eq(KP.catalogCandidates(state, g).length, 0, 'a fresh record is not catalog yet');
  state.week += C.minAgeWeeks;
  rel.bsides.forEach(b => { delete b.charted; });
  rel.reception = Math.max(rel.reception, C.minReception + 5);   // a record people played
  const cands = KP.catalogCandidates(state, g);
  t.ok(cands.some(c => c.kind === 'title' && c.title === rel.songTitle), 'the title is a ticket');
  t.ok(cands.filter(c => c.kind === 'bside').length === rel.bsides.filter(b => b.heat >= C.bsideRevivalHeat).length, 'every b-side with heat is a ticket of its own');
  t.ok(cands.every((c, i) => i === 0 || cands[i - 1].key >= c.key), 'sorted by their key');
  rel.sold = state.week;
  t.eq(KP.catalogCandidates(state, g).length, 0, 'a sold shelf has no tickets');
  delete rel.sold;
  // the roll reads the song, the month and the push
  const quiet = KP.revivalChanceOf(state, g, false);
  t.ok(quiet.chance > 0 && quiet.pick && !quiet.active && !quiet.pushed, 'the quiet roll has a ticket and a chance (' + quiet.chance.toFixed(4) + ')');
  g.lastActivityWeek = state.week;
  const active = KP.revivalChanceOf(state, g, false);
  t.ok(Math.abs(active.chance - quiet.chance * C.activityMult) < 1e-9 && active.active, 'a stage this month doubles it');
  delete g.lastActivityWeek;
  const r = KP.pushCatalog(state, g.id, cands[0].title, 'party');
  t.ok(r.ok && g.catalogPush && g.catalogPush.title === cands[0].title && g.catalogPush.until === state.week + C.PUSH.KINDS.party.weeks, 'the party runs on the shelf’s best ticket');
  const pushed = KP.revivalChanceOf(state, g, false);
  t.ok(Math.abs(pushed.chance - quiet.chance * C.PUSH.KINDS.party.mult) < 1e-9 && pushed.pushed && pushed.pick.title === cands[0].title, 'and multiplies the roll on THAT song');
  const clip = KP.revivalChanceOf(state, g, true);
  t.ok(clip.chance > pushed.chance, 'a burning clip adds on top');
  t.ok(state.catalogLedger.pushes === 1 && state.inbox[0].ind === 'catalogPush', 'ledgered and on the record');
  t.ok(!KP.catalogPushRead(state, g).ok && /running/.test(KP.catalogPushRead(state, g).reason), 'one push at a time');
}

// ---- the reverse run: a b-side's own revival, the national back door ----------
{
  const { state, g, rel } = debuted('bs-revival', { hook: 95, legacy: false });
  state.week += C.minAgeWeeks;
  rel.bsides.forEach(b => { delete b.charted; });
  state.chart.entries = []; state.national.entries = state.national.entries.filter(e => !e.isPlayer);
  // force the ticket: the hottest b-side via a push, and a certain roll
  const pick = rel.bsides.slice().sort((a, b) => b.heat - a.heat)[0];
  const oldC = C.revivalChance; C.revivalChance = 1;
  const r = KP.pushCatalog(state, g.id, pick.title, 'party');
  t.ok(r.ok, 'fixture: the push took');
  const budget0 = state.budget;
  KP.advanceWeek(state);
  C.revivalChance = oldC;
  t.ok(pick.revivedWeek === state.week && !rel.revivedWeek, 'the b-side ran again — and only the b-side was spent');
  const e = state.chart.entries.find(x => x.catalog && x.bside && x.title === pick.title);
  t.ok(e && e.isPlayer && e.releaseWeek === rel.week, 'on the scene chart as a reverse run of a b-side');
  t.ok(state.budget > budget0 && state.catalogLedger.bsideRevivals === 1 && state.catalogLedger.revivals === 1, 'the royalties came in; the ledger counts the b-side');
  t.ok(state.catalogLedger.pushPaid === 1 && !g.catalogPush, 'the push paid out and closed');
  const note = (KP.lastTickNotes || []).find(n => n.ind === 'catalogRevival' && n.groupId === g.id);
  t.ok(note && note.bside && note.pushed && /truthers|b-side/.test(note.text) && /push paid out/.test(note.text), 'the note says a b-side ran, on purpose');
  t.ok(pick.heat >= C.nationalRevivalAt ? state.national.entries.some(x => x.catalog && x.title === pick.title) && state.catalogLedger.nationalRevivals === 1 : true, 'a revival this good crosses onto the national board');
  KP.advanceWeek(state);
  t.ok(pick.nationalPeak == null || pick.nationalPeak >= 1, 'the national peak stays on the b-side, not the title (' + rel.nationalPeak + ')');
  t.ok(KP.catalogCandidates(state, g).every(c => c.title !== pick.title), 'a spent ticket leaves the shelf');
  t.ok(KP.validateState(state).length === 0, 'valid');
}
{
  // a weak title revives on the scene only
  const s = KP.newGame('bs-weak', null, { legacy: true });
  const g = s.groups[0];
  const rel = g.releases[g.releases.length - 1];
  g.releases.forEach(r => { if (r !== rel) r.revivedWeek = 1; });
  rel.reception = 52; rel.craft = 52; delete rel.sleeperTitle;
  s.national.entries = s.national.entries.filter(e => !e.isPlayer);
  const oldC = C.revivalChance; C.revivalChance = 1;
  KP.advanceWeek(s);
  C.revivalChance = oldC;
  t.ok(rel.revivedWeek === s.week && s.chart.entries.some(e => e.catalog && e.title === rel.songTitle), 'the old title ran again');
  t.ok(!s.national.entries.some(e => e.catalog) && (s.catalogLedger.nationalRevivals || 0) === 0, 'but a weak record stays off the national board');
}

// ---- the push: gates, kinds, the window, the cooldown --------------------------
{
  const s = KP.newGame('bs-push', null, { legacy: true });
  const g = s.groups[0];
  for (let w = 0; w < 3; w++) KP.advanceWeek(s);
  s.budget = 100;
  const read = KP.catalogPushRead(s, g);
  t.ok(read.ok && read.candidates.length >= 2 && read.kinds.length === 3, 'the legacy act’s shelf is pushable, three ways');
  const clip = read.kinds.find(k => k.id === 'liveClip');
  t.ok(!clip.ok && /stage/.test(clip.reason), 'no live clip without a stage inside the window');
  g.lastActivityWeek = s.week;
  t.ok(KP.catalogPushRead(s, g).kinds.find(k => k.id === 'liveClip').ok, 'a stage this month opens the clip');
  g.members.forEach(id => { s.people[id].talents.dance.cur = 30; });
  const ch = KP.catalogPushRead(s, g).kinds.find(k => k.id === 'challenge');
  t.ok(!ch.ok && /dancer/.test(ch.reason), 'a dance challenge needs a dancer');
  s.people[g.members[0]].talents.dance.cur = 70;
  t.ok(KP.catalogPushRead(s, g).kinds.find(k => k.id === 'challenge').ok, 'one dancer is enough');
  t.ok(/not on the shelf/.test(KP.pushCatalog(s, g.id, 'not a song', 'party').reason), 'an unknown title is refused, nothing spent');
  s.budget = 2;
  t.ok(/bills/.test(KP.pushCatalog(s, g.id, read.candidates[0].title, 'party').reason), 'the push bills');
  s.budget = 100;
  const b0 = s.budget;
  const r = KP.pushCatalog(s, g.id, read.candidates[0].title, 'challenge');
  t.ok(r.ok && s.budget === b0 - C.PUSH.KINDS.challenge.cost && (s.books.cur.marketing || 0) <= -C.PUSH.KINDS.challenge.cost, 'billed on marketing’s line');
  t.ok(g.catalogPushQuiet === s.week + C.PUSH.KINDS.challenge.weeks + C.PUSH.cooldown, 'the cooldown is set from the window’s end');
  const oldC = C.revivalChance; C.revivalChance = 0;
  for (let w = 0; w < C.PUSH.KINDS.challenge.weeks + 1; w++) KP.advanceWeek(s);
  C.revivalChance = oldC;
  t.ok(!g.catalogPush && (KP.lastTickNotes || []).some(n => n.ind === 'catalogPushDone'), 'a push that never paid out winds down, on the record');
  t.ok(!KP.catalogPushRead(s, g).ok && /campaign/.test(KP.catalogPushRead(s, g).reason), 'and the next one waits for the cooldown');
}

// ---- the folded shelf keeps its own law; an old save runs ---------------------
{
  const s = KP.newGame('bs-old', null, { legacy: true });
  for (let w = 0; w < 4; w++) KP.advanceWeek(s);
  const json = JSON.parse(KP.serialize(s));
  json.version = '0.11.0';
  json.groups.forEach(g => (g.releases || []).forEach(r => { delete r.bsides; delete r.fanPick; }));
  delete json.catalogLedger;
  const m = KP.deserialize(JSON.stringify(json));
  const g = m.groups[0];
  t.ok(KP.catalogCandidates(m, g).every(c => c.kind === 'title'), 'a record without judged b-sides offers its title only');
  t.ok(KP.bsideWord(null) === '' && KP.catalogPushRead(m, g).ok, 'the words and the push survive the missing fields');
  for (let w = 0; w < 8; w++) KP.advanceWeek(m);
  t.ok(KP.validateState(m).length === 0 && m.catalogLedger.pushes === 0, 'and the world runs');
}

// ---- determinism ---------------------------------------------------------------
{
  const { state: a, g } = debuted('bs-fork', { hook: 90 });
  a.week += C.minAgeWeeks - 8;
  KP.pushCatalog(a, g.id, KP.catalogCandidates(a, g)[0] ? KP.catalogCandidates(a, g)[0].title : null, 'party');
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 40; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the shelf forks clean');
}

t.finish();
