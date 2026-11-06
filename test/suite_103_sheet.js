/* Suite 103 — the sheet (v0.10.36, §91 Phase 3). The line distribution
   over the song's parts: parts per lane with demands, the producer's
   proposal by the voices his ear hears, the preset doors and the custom
   sheet's bounded steppers, the lock that is paid for once (the booth's
   hours, morale, the linesCut grievance, the voice of the record's
   hype), craft's recording term reading the voices on the parts, the
   vocal strain riding the share, the stopwatch thread at release, the
   solo's skipped question, the retired line card's migration. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_103_sheet');

function world(seed, n, weeks) {
  const s = KP.newGame(seed, null, { legacy: false });
  s.budget = 900;
  const ids = s.roster.slice(0, n || 5);
  KP.proposeGroup(s, 'SHEETLINE', ids, KP.roleHints(s, ids.map(i => s.people[i])));
  const g = s.groups[0];
  g.demos = KP.generateDemos(s, KP.rngFor(s), g);
  KP.planDebut(s, { groupId: g.id, songId: g.demos[0].id, promo: 'modest',
    week: s.week + (weeks || 8), alloc: { vocals: 25, dance: 25, rap: 25, media: 25 } });
  return { s, g, ids };
}
function toSheet(s, g) {
  let sc = null, guard = 0;
  while (!sc && guard++ < 10) {
    KP.advanceWeek(s);
    sc = (s.scenes || []).find(x => x.kind === 'theSheet');
  }
  return sc;
}
function finish(s, g, opt) {
  let guard = 0;
  while (g.prep && guard++ < 14) {
    KP.advanceWeek(s);
    const sc = (s.scenes || []).find(x => x.kind === 'theSheet');
    if (sc) KP.resolveScene(s, sc.id, opt || 'trust');
  }
}

// ---- the parts: the song's shape from its lane --------------------------
{
  const demo = { id: 'd', rapDemand: 60, vocalDemand: 60, choreoPotential: 60 };
  const hip = KP.songParts(demo, 'hiphop'), dreamy = KP.songParts(demo, 'dreamy');
  const sum = ps => ps.reduce((x, p) => x + p.share, 0);
  t.ok(Math.abs(sum(hip) - 1) < 1e-6 && Math.abs(sum(dreamy) - 1) < 1e-6, 'the shares of a record sum to one');
  const of = (ps, id) => (ps.find(p => p.id === id) || { share: 0, bar: 0 });
  t.ok(of(hip, 'rap').share > of(dreamy, 'rap').share, 'a hip-hop record carries more rap than a dreamy one (' + of(hip, 'rap').share + ' > ' + of(dreamy, 'rap').share + ')');
  t.ok(of(dreamy, 'bridge').share > of(hip, 'bridge').share, 'and the dreamy one lives on its bridge');
  t.ok(hip.every(p => p.bar >= KP.C.SHEET.barFloor && p.demand && p.label), 'every part has a demand, a bar and a name');
  const sliver = KP.songParts({ id: 's', rapDemand: 21, vocalDemand: 60, choreoPotential: 60 }, 'dreamy');
  t.ok(sliver.find(p => p.id === 'rap').share >= KP.C.SHEET.minShare && Math.abs(sum(sliver) - 1) < 1e-6, 'no part is a footnote: a sliver of rap is lifted to the minimum and the record gives way');
  const ballad = KP.songParts({ id: 'b', rapDemand: 8, vocalDemand: 70, choreoPotential: 40 }, 'elegant');
  t.ok(!ballad.some(p => p.id === 'rap'), 'a record with no rap in it has no rap part');
  t.ok(of(ballad, 'bridge').bar > of(ballad, 'verse1').bar, 'the bridge asks more of a voice than the verse (the high note)');
  t.eq(KP.partDemandWord(of(ballad, 'bridge')), 'the high note', 'and says so');
}

// ---- the proposal: the producer's ear --------------------------------------
{
  const { s, g, ids } = world('sh-proposal', 5);
  const ms = ids.map(id => s.people[id]);
  ms.forEach((m, i) => { m.talents.vocals.cur = 40 + i * 2; m.talents.rap.cur = 40; });
  ms[4].talents.vocals.cur = 85;   // the lead
  ms[1].talents.rap.cur = 80;      // the rapper
  const pr = KP.producerOf(s, g.demos[0].producerId);
  if (pr) pr.craft = 100;          // a clean ear
  const sh = KP.buildSheet(s, g);
  const part = id => sh.parts.find(p => p.id === id);
  t.eq(part('chorus').who, ms[4].id, 'a clean ear puts the lead voice on the chorus');
  if (part('rap')) t.eq(part('rap').who, ms[1].id, 'and the rapper on the rap');
  t.ok(sh.parts.every(p => p.who), 'every part has a voice');
  const shares = KP.sheetShares(sh);
  t.ok(Math.abs(Object.values(shares).reduce((a, b) => a + b, 0) - 1) < 0.01, 'the shares account for the whole record');
  t.ok(shares[ms[4].id] < 0.7, 'the proposal is top-heavy, not absurd (' + shares[ms[4].id] + ')');
  t.ok(!sh.mode && !sh.locked, 'and it waits, unlocked, for the desk');
}

// ---- the three preset doors ------------------------------------------------
{
  const { s, g, ids } = world('sh-presets', 5);
  const sc = toSheet(s, g);
  t.ok(sc, 'recording week opens the sheet');
  t.ok(g.prep.sheet && g.prep.sheet.parts.length >= 6 && !g.prep.sheet.mode, 'the proposal is on the desk');
  const fork = () => KP.deserialize(KP.serialize(s));
  const a = fork(), b = fork(), c = fork();
  const run = (w, opt) => {
    const x = w.scenes.find(y => y.kind === 'theSheet');
    KP.resolveScene(w, x.id, opt);
    return w.groups[0].prep.sheet;
  };
  const A = run(a, 'trust'), B = run(b, 'spread'), C = run(c, 'center');
  t.ok(A.locked && A.mode === 'trust' && A.parts.every(p => p.who === A.proposal[p.id]), 'trust: the proposal, locked');
  const sharesB = KP.sheetShares(B);
  t.ok(ids.every(id => (sharesB[id] || 0) >= KP.C.SHEET.floorShare), 'every voice: everyone is on the record');
  t.eq(B.quiet.length, 0, 'nobody quiet');
  const ace = c.groups[0].roles.center;
  const sharesC = KP.sheetShares(C);
  t.ok(sharesC[ace] >= KP.C.SHEET.heavyShare, 'front-load: the ace carries the record (' + sharesC[ace] + ')');
  t.ok(C.parts.find(p => p.id === 'chorus').who === ace && C.parts.find(p => p.id === 'killing').who === ace, 'the chorus and the killing part are hers');
  t.ok(C.top && C.top.id === ace, 'the top of the sheet is on the record');
  t.ok(a.pipeLedger.sheets === 1 && b.pipeLedger.sheets === 1 && c.pipeLedger.sheets === 1, 'ledgered once per sheet');
  t.ok(!a.scenes.some(x => x.kind === 'theSheet'), 'the question is closed');
}

// ---- the custom sheet: bounded steppers, the lock --------------------------
{
  const { s, g, ids } = world('sh-custom', 5);
  const sc = toSheet(s, g);
  KP.resolveScene(s, sc.id, 'custom');
  const sh = g.prep.sheet;
  t.ok(sh.mode === 'custom' && !sh.locked, 'the custom sheet stays open on the Studio desk');
  const chorus = sh.parts.find(p => p.id === 'chorus');
  const was = chorus.who;
  t.ok(KP.cycleSheetPart(s, g.id, 'chorus', 1).ok && chorus.who !== was, 'the stepper cycles the voice on a part');
  const cap = KP.sheetCap(s, g);
  let given = 0;
  sh.parts.forEach(p => { if (KP.setSheetCarrier(s, g.id, p.id, ids[0]).ok) given++; });
  t.eq(given, cap, 'one voice holds at most ' + cap + ' parts — the sheet is bounded');
  const r = KP.lockSheet(s, g.id);
  t.ok(r.ok && sh.locked && sh.settled && /locked/.test(r.toast), 'the lock settles the sheet');
  t.ok(!KP.cycleSheetPart(s, g.id, 'chorus', 1).ok && !KP.lockSheet(s, g.id).ok, 'and nothing moves after the lock');
  t.eq(s.pipeLedger.customSheets, 1, 'ledgered as the desk’s own');
  const w2 = world('sh-custom-2', 5);
  const sc2 = toSheet(w2.s, w2.g);
  KP.resolveScene(w2.s, sc2.id, 'trust');
  t.ok(!KP.cycleSheetPart(w2.s, w2.g.id, 'chorus', 1).ok, 'a preset is the producer’s sheet, not yours to edit');
}

// ---- craft reads the voices on the parts ----------------------------------
{
  const V = KP.C.VERDICT;
  const LUCK = V.craftLuckSd;
  V.craftLuckSd = 0;
  const { s, g, ids } = world('sh-craft', 5, 6);
  const ms = ids.map(id => s.people[id]);
  ms.forEach(m => { m.talents.vocals.cur = 42; });
  ms[0].talents.vocals.cur = 82;
  g.demos[0].vocalDemand = 80;   // a record that asks for a voice
  const sc = toSheet(s, g);
  KP.resolveScene(s, sc.id, 'custom');
  const right = KP.deserialize(KP.serialize(s)), wrong = KP.deserialize(KP.serialize(s));
  const set = (w, who) => {
    const gg = w.groups[0];
    ['chorus', 'bridge', 'pre'].forEach(id => { if (gg.prep.sheet.parts.some(p => p.id === id)) KP.setSheetCarrier(w, gg.id, id, who); });
    KP.lockSheet(w, gg.id);
  };
  set(right, ids[0]); set(wrong, ids[1]);
  t.ok(right.groups[0].prep.sheet.parts.find(p => p.id === 'chorus').who === ids[0] &&
       wrong.groups[0].prep.sheet.parts.find(p => p.id === 'chorus').who === ids[1], 'fixture: two sheets, two voices on the chorus');
  while (right.groups[0].prep) KP.advanceWeek(right);
  while (wrong.groups[0].prep) KP.advanceWeek(wrong);
  V.craftLuckSd = LUCK;
  const rr = right.groups[0], rw = wrong.groups[0];
  t.ok(rr.results.recording > rw.results.recording, 'the booth hears the right voice on the chorus (' + rr.results.recording + ' > ' + rw.results.recording + ')');
  t.ok(rr.releases[0].craft > rw.releases[0].craft, 'and the record is the better for it (' + rr.releases[0].craft + ' > ' + rw.releases[0].craft + ')');
  t.ok(/^The booth:/.test(rr.results.sheetLine || ''), 'the booth says so in words (' + rr.results.sheetLine + ')');
  t.ok(!/\d/.test(rr.results.sheetLine || ''), 'without a number');
  const row = rr.results.ledger.craft.find(x => /recording/.test(x.src));
  t.ok(row && Math.abs(row.mod - rr.results.recording * V.craftRecording) < 0.2, 'one truth: the craft row is the booth’s number through the registry');
}

// ---- the lock is paid for once --------------------------------------------
{
  const { s, g, ids } = world('sh-settle', 7);
  const sc = toSheet(s, g);
  const ms = ids.map(id => s.people[id]);
  ms.forEach(m => { m.personality.professionalism = 30; });
  const morale0 = ms.map(m => m.morale), hype0 = ms.map(m => m.hype || 0), fat0 = ms.map(m => m.fatigue);
  KP.resolveScene(s, sc.id, 'center');
  const sh = g.prep.sheet;
  const ace = g.roles.center, ai = ids.indexOf(ace);
  t.ok((s.people[ace].hype || 0) > hype0[ai], 'the voice of the record gains hype');
  t.ok(sh.quiet.length >= 1, 'seven voices, seven parts, three on the ace: somebody is under the floor (' + sh.quiet.length + ')');
  const q = s.people[sh.quiet[0]], qi = ids.indexOf(q.id);
  t.ok(q.morale < morale0[qi], 'she counted her seconds');
  t.ok((q.directed || []).some(d => d.kind === 'linesCut'), 'and keeps the count (linesCut)');
  t.ok(s.people[ace].fatigue > fat0[ai] && (s.people[ace].fatigue - fat0[ai]) > (q.fatigue - fat0[qi]), 'the booth’s hours ride the share');
  t.ok(s.pipeLedger.quietVoices >= 1, 'ledgered');
  const w = world('sh-settle-2', 5);
  const sc2 = toSheet(w.s, w.g);
  const m0 = w.ids.map(id => w.s.people[id].morale);
  KP.resolveScene(w.s, sc2.id, 'spread');
  t.ok(w.ids.every((id, i) => w.s.people[id].morale >= m0[i]) && w.g.prep.sheet.quiet.length === 0, 'every voice on the record: the room is warmer, nobody quiet');
}

// ---- the stopwatch thread at release --------------------------------------
{
  const LW = KP.C.PIPE.lineWarChance;
  KP.C.PIPE.lineWarChance = 1;
  const a = world('sh-audit-a', 5);
  finish(a.s, a.g, 'spread');
  a.s.discourses = [];
  KP.advanceWeek(a.s);
  t.ok(!(a.s.discourses || []).some(d => d.kind === 'lineShare'), 'a sheet with every voice on it gives the stopwatch nothing');
  const b = world('sh-audit-b', 7);
  finish(b.s, b.g, 'center');
  b.s.discourses = [];
  KP.advanceWeek(b.s);
  const d = (b.s.discourses || []).find(x => x.kind === 'lineShare');
  t.ok(d, 'a front-loaded sheet organizes the stopwatch thread');
  const head = d ? KP.discourseHeadline(b.s, d) : '';
  const rel = b.g.releases[0];
  t.ok(rel.sheet && rel.sheet.quiet.length >= 1 && rel.sheet.quiet.every(id => head.includes(KP.displayName(b.s.people[id]))),
    'and the thread has the quiet voices’ names (' + head.slice(0, 90) + '…)');
  t.eq(b.s.pipeLedger.lineWars, 1, 'ledgered');
  KP.C.PIPE.lineWarChance = LW;
}

// ---- the vocal strain rides the share ----------------------------------------
{
  const s = KP.newGame('sh-strain', null, { legacy: true });
  const g = s.groups[0];
  const members = g.members.map(id => s.people[id]);
  const carrier = members[2];
  members.forEach(m => { m.talents.vocals.cur = 45; m.fatigue = 10; m.medical = { chronic: [] }; });
  carrier.fatigue = 70;
  g.promoUntil = s.week + 4;
  g.releases = g.releases || [];
  const shares = {}; shares[carrier.id] = 0.5;
  g.releases.push({ week: s.week, title: 'The Load', conceptId: g.concept || 'bright', reception: 50,
    sheet: { mode: 'custom', parts: [], shares, quiet: [], top: { id: carrier.id, share: 0.5 } } });
  t.ok(KP.sheetShareOf(s, g, carrier.id) >= KP.C.MEDICAL.strainShare, 'no lead by the number, but she carries the record');
  const M = KP.C.MEDICAL;
  const NB = M.nodulesBase, B = M.base;
  M.nodulesBase = 1; M.base = 0;
  KP.advanceWeek(s);
  M.nodulesBase = NB; M.base = B;
  const sc = (s.scenes || []).find(x => x.kind === 'theDiagnosis');
  t.ok(sc && sc.personId === carrier.id && sc.kindOf === 'vocal', 'the singing load reaches the clinic — the voice, not the number');
}

// ---- a booth of one skips the question -----------------------------------
{
  const { s, g, ids } = world('sh-solo', 5);
  g.members = [ids[0]];
  g.roles = { leader: ids[0], center: ids[0] };
  let guard = 0;
  while (!(g.prep.stations || []).find(st => st.id === 'recording' && st.done) && guard++ < 10) KP.advanceWeek(s);
  t.ok(!(s.scenes || []).some(x => x.kind === 'theSheet'), 'a solo sings every part — no sheet to argue');
  t.ok(g.prep.sheet && g.prep.sheet.locked && g.prep.sheet.mode === 'trust' && g.prep.sheet.parts.every(p => p.who === ids[0]), 'and the sheet is hers, locked');
}

// ---- silence sends the producer's sheet -----------------------------------
{
  const { s, g } = world('sh-expire', 5);
  const sc = toSheet(s, g);
  const until = sc.expiresWeek;
  while (s.week <= until) KP.advanceWeek(s);
  t.ok(!(s.scenes || []).some(x => x.kind === 'theSheet') && g.prep && g.prep.sheet.locked && g.prep.sheet.mode === 'trust',
    'silence sends the producer’s sheet to the booth');
}
{
  const { s, g } = world('sh-release-lock', 5);
  const sc = toSheet(s, g);
  KP.resolveScene(s, sc.id, 'custom');
  while (g.prep) KP.advanceWeek(s);
  t.ok(g.releases[0].sheet.mode === 'custom' && s.pipeLedger.sheets === 1, 'release week locks whatever is on the desk');
}

// ---- the archive and the words -----------------------------------------------
{
  const { s, g } = world('sh-archive', 6);
  finish(s, g, 'trust');
  const rel = g.releases[0];
  t.ok(rel.sheet && rel.sheet.shares && rel.sheet.parts.length >= 6 && rel.sheet.mode === 'trust', 'the release archives the sheet, to the second');
  t.ok(!('lineCard' in rel), 'the line card is gone from new records');
  t.ok(g.results.recording > 0 && g.results.sheetLine, 'the booth’s number and its words are on the results');
}
{
  const { s, g } = world('sh-words', 6);
  toSheet(s, g);
  const sh = g.prep.sheet;
  const words = KP.sheetWords(s, g, sh);
  t.ok(!/\d/.test(words) && /carries|takes|has/.test(words), 'the sheet in words has names and no numbers (' + words.slice(0, 80) + '…)');
  const def = KP.sceneDef('theSheet');
  const sc = s.scenes.find(x => x.kind === 'theSheet');
  t.ok(/stopwatch/.test(def.body(s, sc)) && def.options(s, sc)[0].id === 'trust' && def.options(s, sc).length === 4, 'the scene names the stopwatch; trust is the default door of four');
  t.ok(['owns it', 'carries it', 'reaches for it', 'strains'].includes(KP.partFitWord(s, s.people[sh.parts[0].who], sh.parts[0])), 'the panel reads a voice in words');
  t.ok(/verse|chorus|killing/.test(KP.sheetShapeWords(sh)), 'and the song has a shape in words');
}

// ---- the line card retires: open cards migrate -------------------------------
{
  const { s, g } = world('sh-migrate', 5);
  toSheet(s, g);
  const raw = JSON.parse(KP.serialize(s));
  raw.version = '0.10.35';
  raw.scenes.forEach(x => { if (x.kind === 'theSheet') x.kind = 'lineCard'; });
  delete raw.groups[0].prep.sheet;
  const old = KP.deserialize(JSON.stringify(raw));
  t.ok(old.scenes.some(x => x.kind === 'theSheet') && old.groups[0].prep.sheet && !old.groups[0].prep.sheet.locked,
    'an open line card migrates to the sheet over the producer’s proposal');
  const raw2 = JSON.parse(KP.serialize(s));
  raw2.version = '0.10.35';
  raw2.scenes = raw2.scenes.filter(x => x.kind !== 'theSheet');
  delete raw2.groups[0].prep.sheet;
  raw2.groups[0].prep.lineCard = 'center';
  const old2 = KP.deserialize(JSON.stringify(raw2));
  const sh2 = old2.groups[0].prep.sheet;
  t.ok(sh2 && sh2.mode === 'center' && sh2.locked && sh2.settled && !old2.groups[0].prep.lineCard && !(old2.pipeLedger || {}).sheets,
    'an answered card becomes its preset, locked, already paid');
  // a fresh save is untouched
  const fresh = KP.newGame('sh-fresh', null, { legacy: true });
  const json = KP.serialize(fresh);
  t.eq(KP.serialize(KP.deserialize(json)), json, 'the migration is a no-op on a fresh save');
}

// ---- determinism ---------------------------------------------------------
{
  const a = KP.newGame('sh-fork', null, { legacy: true });
  const b = KP.deserialize(KP.serialize(a));
  for (let w = 0; w < 40; w++) { KP.advanceWeek(a); KP.advanceWeek(b); }
  t.eq(KP.serialize(a), KP.serialize(b), 'the sheet forks clean');
}

t.finish();
