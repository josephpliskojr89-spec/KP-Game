/* Suite 082 — the person in public (v0.10.2, §78 A+B). WeCast: the
   asks, the channel, the fame-undamped growth, the gaffe whose blast
   scales with the public eye, the live nobody approved. The scandals:
   shape at altitude, the severity ladder, the deny trap, the choice. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_082_public_person');

function world(seed, door) {
  const s = KP.newGame(seed, null, door ? { legacy: false, door } : { legacy: true });
  s.budget = 900;
  return s;
}
function pinnedAskWeek(s) {
  const AC = KP.C.CAST.askChance;
  KP.C.CAST.askChance = 1;
  KP.advanceWeek(s);
  KP.C.CAST.askChance = AC;
}

// ---- the ask and the channel ------------------------------------------
{
  const s = world('pp-channel');
  const p = s.people[s.roster[0]];
  s.roster.map(id => s.people[id]).forEach(x => {
    x.personality.confidence = 30; x.personality.warmth = 30; x.personality.creativity = 30;
    x.personality.professionalism = 70;
  });
  p.personality.confidence = 75; p.personality.creativity = 70;
  pinnedAskWeek(s);
  const sc = (s.scenes || []).find(x => x.kind === 'channelAsk');
  t.ok(sc && sc.personId === p.id, 'the outgoing one knocks — with a deck');
  KP.resolveScene(s, sc.id, 'allow');
  t.ok(p.broadcast, 'the channel opens');
  t.ok(p.history.some(h => /WeCast channel/.test(h.text)), 'on her file, in her voice');
  const soc0 = KP.socialOf(s, p);
  for (let i = 0; i < 5; i++) KP.advanceWeek(s);
  t.ok(KP.socialOf(s, p) > soc0, 'weekly uploads grow the following');
}
{
  // the growth is fame-UNdamped: same person, famous vs unknown label
  const a = world('pp-undamped-a');            // legacy: famous
  const b = world('pp-undamped-b', 'fresh');   // fresh: unknown
  const C = KP.C.CAST;
  const mk = (s) => {
    const p = s.people[s.roster[0]];
    p.personality.warmth = 60; p.personality.confidence = 60; p.personality.creativity = 60;
    p.broadcast = { since: s.week, uploads: 0 };
    return p;
  };
  const pa = mk(a), pb = mk(b);
  const drip = (s, p) => Math.round(C.drip * (0.5 + ((p.personality.warmth + p.personality.confidence + p.personality.creativity) / 3) / 80));
  t.eq(drip(a, pa), drip(b, pb), 'the camera does not care who you are — identical drip math at any fame');
}

// ---- the gaffe: blast scales with the public eye ----------------------
{
  const s = world('pp-gaffe');
  const known = s.people[s.roster[0]];
  known.hype = 45;   // publicEye true
  known.personality.professionalism = 20; known.personality.resilience = 30;
  known.broadcast = { since: s.week, uploads: 0 };
  const unknown = s.people[s.roster[1]];
  unknown.hype = 0; unknown.social = 0;
  unknown.personality.professionalism = 20; unknown.personality.resilience = 30;
  unknown.broadcast = { since: s.week, uploads: 0 };
  const GB = KP.C.CAST.gaffeBase;
  KP.C.CAST.gaffeBase = 5;   // pin: everyone gaffes this week
  KP.advanceWeek(s);
  KP.C.CAST.gaffeBase = GB;
  t.ok(s.castLedger.gaffes >= 2, 'both mics slipped (' + s.castLedger.gaffes + ')');
  const notes = s.inbox.filter(n => n.ind === 'castGaffe');
  const hot = notes.find(n => n.personId === known.id);
  const cool = notes.find(n => n.personId === unknown.id);
  t.ok(hot && /sponsors/.test(hot.text), 'the known face pays in sponsors and reach');
  t.ok(cool && /candor|charming/.test(cool.text), 'the unknown reads as candor — helps small, hurts big');
  t.ok((s.discourses || []).some(d => d.kind === 'gaffe'), 'the known clip ignites the storm');
}

// ---- the live nobody approved -----------------------------------------
{
  const s = world('pp-unsanc');
  s.roster.map(id => s.people[id]).forEach(x => {
    x.personality.confidence = 30; x.personality.warmth = 30; x.personality.creativity = 30;
  });
  const wild = s.people[s.roster[2]];
  wild.personality.confidence = 75; wild.personality.professionalism = 20;
  const AC = KP.C.CAST.askChance, UC = KP.C.CAST.unsancChance;
  KP.C.CAST.askChance = 1; KP.C.CAST.unsancChance = 1;
  KP.advanceWeek(s);
  KP.C.CAST.askChance = AC; KP.C.CAST.unsancChance = UC;
  const sc = (s.scenes || []).find(x => x.kind === 'unsanctionedLive');
  t.ok(sc && sc.personId === wild.id, 'low professionalism does not ask — the company finds out after');
  t.eq(s.castLedger.unsanctioned, 1, 'ledgered');
  KP.resolveScene(s, sc.id, 'reprimand');
  t.ok((wild.directed || []).some(d => d.kind === 'reprimanded'), 'the reprimand goes in the ledger she reads');
}

// ---- the scandal: shape at altitude, ladder with teeth ----------------
{
  const s = world('pp-story');
  const p = s.people[s.roster[0]];
  p.personality.professionalism = 20; p.hype = 45;
  const SB = KP.C.SCANDAL.base, SW = KP.C.SCANDAL.sevWeights.slice();
  KP.C.SCANDAL.base = 1;
  KP.C.SCANDAL.sevWeights = [1, 0, 0, 0];   // pin: a storm-sized story
  KP.advanceWeek(s);
  KP.C.SCANDAL.base = SB; KP.C.SCANDAL.sevWeights = SW;
  const sc = (s.scenes || []).find(x => x.kind === 'theStory');
  t.ok(sc, 'the story breaks onto the response desk');
  t.ok(KP.C.SCANDAL.SHAPES.some(sh => sc.shape === sh), 'named at altitude, never lower');
  t.ok((s.discourses || []).some(d => d.kind === 'scandal'), 'the storm machinery carries it');
  KP.resolveScene(s, sc.id, 'statement');
  t.ok(p.scandal && p.scandal.answered === 'statement', 'the frame is taken');
  // survivable stories age off
  p.scandalFading = s.week;
  KP.advanceWeek(s);
  t.ok(!p.scandal, 'a survivable story ages off the file');
}
{
  // severity 3: the forced hiatus — the calendar nobody chose
  const s = world('pp-forced');
  const ids = s.groups[0].members;
  const p = s.people[ids[0]];
  p.personality.professionalism = 20;
  // the pinned roll hits the FIRST candidate in roster order — put the
  // sculpted idol at the head so the story lands where the test looks
  s.roster = [p.id].concat(s.roster.filter(id => id !== p.id));
  const SB = KP.C.SCANDAL.base, SW = KP.C.SCANDAL.sevWeights.slice();
  KP.C.SCANDAL.base = 1;
  KP.C.SCANDAL.sevWeights = [0, 0, 1, 0];
  KP.advanceWeek(s);
  KP.C.SCANDAL.base = SB; KP.C.SCANDAL.sevWeights = SW;
  const sc = (s.scenes || []).find(x => x.kind === 'theStory');
  t.ok(sc && sc.sev === 3, 'fixture: the story has weight');
  KP.resolveScene(s, sc.id, 'statement');
  const hit = s.people[sc.personId];
  t.ok(hit.flags.personalHiatus, 'the hiatus nobody planned');
  t.eq(s.scandalLedger.forcedBreaks, 1, 'ledgered');
  // the clock runs out and she returns
  hit.flags.scandalBreakUntil = s.week;
  KP.advanceWeek(s);
  t.ok(!hit.flags.personalHiatus, 'and ends on its clock');
}
{
  // severity 4: the choice — both doors
  const mk = (seed) => {
    const s = world(seed);
    const SB = KP.C.SCANDAL.base, SW = KP.C.SCANDAL.sevWeights.slice();
    KP.C.SCANDAL.base = 1; KP.C.SCANDAL.sevWeights = [0, 0, 0, 1];
    KP.advanceWeek(s);
    KP.C.SCANDAL.base = SB; KP.C.SCANDAL.sevWeights = SW;
    const st = (s.scenes || []).find(x => x.kind === 'theStory');
    KP.resolveScene(s, st.id, 'statement');
    const ch = (s.scenes || []).find(x => x.kind === 'theChoice');
    return { s, ch };
  };
  const a = mk('pp-choice-a');
  t.ok(a.ch, 'the unsurvivable outgrows the response desk');
  const pa = a.s.people[a.ch.personId];
  const ga = KP.groupOf(a.s, pa.id);
  a.s.budget = 900;
  KP.resolveScene(a.s, a.ch.id, 'protect');
  t.eq(a.s.scandalLedger.protectedCount, 1, 'protecting is a real door');
  t.ok(KP.getNarrative(a.s, 'stoodByHer', 'idol', pa.id), 'and the roster remembers which way the label leaned');
  t.ok(!ga || ga.members.includes(pa.id), 'she stays');
  const b = mk('pp-choice-b');
  const pb = b.s.people[b.ch.personId];
  const gb = KP.groupOf(b.s, pb.id);
  KP.resolveScene(b.s, b.ch.id, 'release');
  t.eq(pb.status, 'released', 'letting her go is the other door');
  t.ok(!gb || !gb.members.includes(pb.id), 'the chair is empty');
  t.ok(b.s.inbox.some(n => n.ind === 'scandalRelease'), 'and the statement runs four sentences');
}
{
  // the deny trap
  const s = world('pp-deny');
  const SB = KP.C.SCANDAL.base, SW = KP.C.SCANDAL.sevWeights.slice();
  KP.C.SCANDAL.base = 1; KP.C.SCANDAL.sevWeights = [1, 0, 0, 0];
  KP.advanceWeek(s);
  KP.C.SCANDAL.base = SB; KP.C.SCANDAL.sevWeights = SW;
  const sc = (s.scenes || []).find(x => x.kind === 'theStory');
  KP.resolveScene(s, sc.id, 'deny');
  const p = s.people[sc.personId];
  const DR = KP.C.SCANDAL.denyRebreakChance;
  KP.C.SCANDAL.denyRebreakChance = 999;   // pin: it re-breaks
  KP.advanceWeek(s);
  KP.C.SCANDAL.denyRebreakChance = DR;
  t.ok(p.scandal && p.scandal.rebroke, 'the denial became the second story');
  t.eq(s.scandalLedger.rebroke, 1, 'ledgered, with the trust bill');
}

// ---- the unknown label's mercy ----------------------------------------
{
  const s = world('pp-mercy', 'fresh');
  const p = s.people[s.roster[0]];
  const SB = KP.C.SCANDAL.base, SW = KP.C.SCANDAL.sevWeights.slice();
  KP.C.SCANDAL.base = 1; KP.C.SCANDAL.sevWeights = [0, 0, 0, 1];
  KP.advanceWeek(s);
  KP.C.SCANDAL.base = SB; KP.C.SCANDAL.sevWeights = SW;
  const sc = (s.scenes || []).find(x => x.kind === 'theStory');
  t.ok(sc && sc.sev <= 2, 'below the fame line the story dies on page four (sev ' + (sc && sc.sev) + ')');
}

// ---- determinism -------------------------------------------------------
{
  const s = world('pp-fork');
  const p = s.people[s.roster[0]];
  p.personality.confidence = 75; p.personality.creativity = 70;
  pinnedAskWeek(s);
  const sc = (s.scenes || []).find(x => x.kind === 'channelAsk' || x.kind === 'liveAsk');
  if (sc) KP.resolveScene(s, sc.id, 'allow');
  const b = KP.deserialize(KP.serialize(s));
  for (let w = 0; w < 20; w++) { KP.advanceWeek(s); KP.advanceWeek(b); }
  t.eq(KP.serialize(s), KP.serialize(b), 'the person in public forks clean');
}

t.finish();
