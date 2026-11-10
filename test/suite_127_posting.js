/* Suite 127 — the posting (v0.11.17, §108; §96 recommendation 5, the trainee
   years, part four). Owner: "Break remaining work into smaller pieces".

   The survey's finding: "The list on the wall, the most repeated ceremony
   of a career, is a modal of the exec's sentences with no letter for the
   room and no door for the ace left off."

   Pinned here:
   · who the room will look for and not find is a read: the month's first,
     the year's first, the one locked into the project and dropped, how
     many others; it writes nothing, and reads the same before the list
     goes up and after
   · the list is one critical letter, in the inbox the moment it is posted
   · the year's first left off is a slight now; first on both is one slight,
     a little heavier, not two
   · what group.js already did to the month's first and the dropped is as
     it was
   · the one the list slighted most comes to the desk once, through the one
     queue: told why, promised the next lineup, or told the list is the
     list; and silence
   · a promise of the next lineup is about the lineup AFTER this one
   · the words, and the screens: the builder before, the modal after, the
     door on the Desk
   Two laws from §99 hold: the week's wire is read before the trim, and a
   fixture forces every gate and relies on no roll. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_127_posting');

const P = KP.C.POSTING, YEAR = KP.C.WEEKS_PER_YEAR;
const firstOf = list => (list && list[0]) || { text: '', priority: null, ind: 'none', personId: null, groupId: null, week: null };
const noisy = x => /undefined|NaN|\{she\}|\{her\}|\{pos\}|\{herself\}|\{hers\}|\{She\}|\{Pos\}|\[object/.test(x);
const count = (p, kind) => (p.directed || []).filter(d => d.kind === kind).length;
const lastLine = p => (p.history[p.history.length - 1] || {}).text || '';
const CLOSERS = [
  'A list is the one thing in this building that everyone reads in the same second.',
  'Nobody said anything for about a minute, which in a practice room is a long time.',
  'By seven the door was just a door again, and the room had rearranged itself around what was on it.',
];

// ---- the fixture: a pinned room of six free trainees, a greenlight open ----
const base = (() => {
  const s = KP.newGame('posting-127', null, { legacy: false, door: 'fresh' });
  s.budget = 900; KP.advanceWeek(s);
  s.roster = s.roster.filter(id => s.people[id].status === 'trainee').slice(0, 6);
  s.roster.forEach((id, i) => {
    const p = s.people[id];
    p.gender = 'f';                                       // forced: one group, one gender
    KP.C.TALENTS.forEach(d => { p.talents[d].cur = [97, 80, 63, 46, 29, 12][i]; p.flags['ceil_' + d] = p.talents[d].cur; });
    p.flags.firstEvalTopWeek = 1; p.evalBottomStreak = -100; p.evalHistory = [];
    p.signedWeek = s.week - 20; p.age = 18; p.morale = 60;
    p.training.focus = []; p.training.intensity = 'standard';
  });
  s.lastEvalTopId = s.roster[0]; s.evalYears = []; s.evalSlot = null;
  s.scenes = [];
  return { s, ids: s.roster.slice() };
})();
function fork(src) {
  const s = KP.deserialize(KP.serialize((src || base).s));
  return { s, ids: base.ids.slice(), tr: base.ids.map(id => s.people[id]) };
}
const N = base.ids.map(id => KP.displayName(base.s.people[id]));
// the list: by default the second to the fifth, led by the second, centered on the third
const LIST = [1, 2, 3, 4];
const propose = (f, idx, name, roles) => {
  const ids = (idx || LIST).map(i => f.ids[i]);
  return KP.proposeGroup(f.s, name || 'LANTERN', ids, roles || { leader: ids[0], center: ids[Math.min(1, ids.length - 1)] });
};
const wallOf = (f, i, year) => { f.s.evalYears = [{ year: year || 1, week: 1, held: 12, topId: f.ids[i], climbId: null, rows: [] }]; };
function tick(f, keepScenes) {
  f.tr.forEach(p => { if (!p) return; p.flags.burnout = 0; p.fatigue = 0; p.evalBottomStreak = Math.min(p.evalBottomStreak || 0, -50); });
  if (!keepScenes) f.s.scenes = (f.s.scenes || []).filter(sc => sc.kind === 'offTheList');
  f.s.budget = Math.max(f.s.budget, 900);
  KP.advanceWeek(f.s);
  return (KP.lastTickNotes || []).slice();
}

{
  const f = fork();
  t.eq(f.tr.length + '|' + new Set(N).size + '|' + new Set(f.tr.map(p => p.gender)).size, '6|6|1', 'fixture: six free trainees with six names, one gender');
  t.ok(f.tr.every(p => p.status === 'trainee' && !KP.groupOf(f.s, p.id) && !KP.onBreak(p)), 'fixture: all on the floor, none in a group');
  const r = propose(f);
  t.eq(r.ok + '|' + (r.reason || ''), 'true|', 'fixture: a lineup of four can be proposed (a greenlight is open)');
}

// ---- the read: who the room will look for and not find -------------------------
{
  const f = fork();
  const ids = LIST.map(i => f.ids[i]);
  const before = KP.serialize(f.s);
  const r = KP.postingRead(f.s, ids);
  t.eq(KP.serialize(f.s), before, 'the read writes nothing');
  t.eq([r.on.length, r.off.length, (r.monthTop || {}).id, r.yearTop, r.year, r.dropped.length, (r.slighted || {}).id, r.others, r.waited].join('|'),
    [4, 2, f.ids[0], null, null, 0, f.ids[0], 1, null].join('|'), 'four on the list, two off it: the month’s first, who is the one slighted, and one other');
  // the year's first
  wallOf(f, 5);
  let y = KP.postingRead(f.s, ids);
  t.eq([(y.monthTop || {}).id, (y.yearTop || {}).id, y.year, (y.slighted || {}).id, y.others].join('|'), [f.ids[0], f.ids[5], 1, f.ids[0], 0].join('|'), 'with a year’s sheet on the wall, its first is looked for too; the month’s first is still the one slighted most');
  wallOf(f, 0, 2);
  y = KP.postingRead(f.s, ids);
  t.eq((y.monthTop === y.yearTop) + '|' + y.year + '|' + y.others, 'true|2|1', 'first on both is one person, read once');
  wallOf(f, 2);
  y = KP.postingRead(f.s, ids);
  t.eq(y.yearTop + '|' + y.year, 'null|null', 'a year’s first who is on the list is not looked for');
  // it is the LAST sheet on the wall that counts
  f.s.evalYears = [{ year: 1, week: 1, topId: f.ids[5], rows: [] }, { year: 2, week: 49, topId: f.ids[2], rows: [] }];
  t.eq(KP.postingRead(f.s, ids).yearTop, null, 'an older year’s first is not: the room reads the last sheet on the wall');
  // the month's first on the list: the year's first is the one slighted
  wallOf(f, 5);
  const z = KP.postingRead(f.s, [0, 1, 2, 3].map(i => f.ids[i]));
  t.eq([z.monthTop, (z.yearTop || {}).id, (z.slighted || {}).id, z.others].join('|'), [null, f.ids[5], f.ids[5], 1].join('|'), 'when the month’s first is on the list, the year’s first left off is the one slighted');
  // nobody the room is watching is off it
  f.s.evalYears = [];
  const q = KP.postingRead(f.s, [0, 1, 2, 3].map(i => f.ids[i]));
  t.eq([q.monthTop, q.yearTop, q.slighted, q.others].join('|'), [null, null, null, 2].join('|'), 'a list with the month’s first on it and no year on the wall slights nobody');
  // gone from the floor
  wallOf(f, 5); f.tr[5].status = 'idol';
  t.eq(KP.postingRead(f.s, ids).yearTop, null, 'a year’s first who has debuted since is not on the floor to be left off');
  f.tr[5].status = 'trainee'; f.s.roster = f.s.roster.filter(id => id !== f.ids[5]);
  t.eq(KP.postingRead(f.s, ids).yearTop + '|' + KP.postingRead(f.s, ids).off.length, 'null|1', 'nor is one who has left the building');
}
// the project, and who waited
{
  const f = fork();
  const o = KP.openProject(f.s, [f.ids[1], f.ids[5]], []);
  t.eq(o.ok, true, 'fixture: a project locks two in');
  const r = KP.postingRead(f.s, LIST.map(i => f.ids[i]));
  t.eq(r.dropped.map(p => p.id).join(',') + '|' + r.others, f.ids[5] + '|0', 'one locked into the project and not on the list is read as dropped, and not counted among the others');
  const g = fork();
  g.tr[3].signedWeek = g.s.week - P.waitedWeeks;           // two years on the floor, to the week
  g.tr[4].signedWeek = g.s.week - P.waitedWeeks + 1;
  let w = KP.postingRead(g.s, LIST.map(i => g.ids[i]));
  t.eq((w.waited || {}).id + '|' + w.waitedYears, g.ids[3] + '|2', 'the one on the list who has been in the building longest, if that is two years, is the one who waited');
  g.tr[3].signedWeek = g.s.week - P.waitedWeeks + 1;
  w = KP.postingRead(g.s, LIST.map(i => g.ids[i]));
  t.eq(w.waited, null, 'a week short of two years is not a wait worth a sentence');
  g.tr[0].signedWeek = g.s.week - 300;
  t.eq(KP.postingRead(g.s, LIST.map(i => g.ids[i])).waited, null, 'and the wait is counted among those on the list, not those off it');
}

// ---- the builder's lines: the same read, before the list goes up ----------------
{
  const f = fork(); const ids = LIST.map(i => f.ids[i]);
  t.eq(KP.postingLines(f.s, ids).join(' | '), N[0] + ' is first on this month’s sheet and is not on this list. | The room will read all of that in the same second. ' + N[0] + ' will come to the desk about it.', 'the month’s first left off, and that she will come to the desk');
  wallOf(f, 5);
  t.eq(KP.postingLines(f.s, ids).slice(0, 2).join(' | '), N[0] + ' is first on this month’s sheet and is not on this list. | ' + N[5] + ' was first on the Y1 sheet and is not on this list.', 'the year’s first has a line of her own');
  wallOf(f, 0);
  t.eq(KP.postingLines(f.s, ids)[0], N[0] + ' is first on this month’s sheet and was first on the Y1 sheet, and is not on this list.', 'first on both is one line');
  f.s.evalYears = [];
  t.eq(KP.postingLines(f.s, [0, 1, 2, 3].map(i => f.ids[i])).length, 0, 'a list that slights nobody has no lines');
  const g = fork(); KP.openProject(g.s, [g.ids[1], g.ids[5]], []);
  t.ok(KP.postingLines(g.s, LIST.map(i => g.ids[i])).includes(N[5] + ' is locked into the project and not on this list.'), 'one locked in and left off is named');
  const before = KP.serialize(g.s); KP.postingLines(g.s, LIST.map(i => g.ids[i]));
  t.eq(KP.serialize(g.s), before, 'and the lines write nothing either');
}

// ---- the list, posted ------------------------------------------------------------
{
  const f = fork();
  const m0 = f.tr.map(p => p.morale), po = count(f.tr[0], 'passedOver');
  const inboxBefore = f.s.inbox.length;
  const r = propose(f);
  const n = f.s.inbox[0] || { text: '' };
  t.eq([n.ind, n.priority, n.kind, n.groupId, n.personId, n.week, f.s.inbox.length - inboxBefore].join('|'), ['lineupPosted', 'critical', 'company', r.group.id, f.ids[0], f.s.week, 1].join('|'), 'the list is one critical letter, in the inbox the moment it is posted, with the act and the one it slighted on it');
  t.ok(n.text.startsWith('The list went up on the practice room door at six. LANTERN: ' + N[1] + ' (leader), ' + N[2] + ' (center), ' + N[3] + ' and ' + N[4] + '. '), 'it reads the list, with the leader and the center marked');
  t.ok(n.text.includes(' ' + N[0] + ', first on this month’s sheet, is not on it. One other trainee read it twice and went back to practice. '), 'then who is not on it, and how many others');
  t.ok(CLOSERS.some(c => n.text.endsWith(' ' + c)) && !noisy(n.text) && n.text.length < 700, 'and closes on one of three sentences, with no token leaking (' + n.text.length + ' characters)');
  // what group.js always did is as it was
  t.eq(f.tr[0].morale - m0[0] + '|' + (count(f.tr[0], 'passedOver') - po), '-6|1', 'the month’s first left off is docked 6 and has it on her ledger, as before');
  t.ok(/^Ranked first on the evaluation board when the LANTERN lineup was posted/.test(lastLine(f.tr[0])), 'with the line on her file, as before');
  t.ok(LIST.every(i => f.tr[i].history.some(h => h.text === 'Selected for the debut lineup of LANTERN.')), 'and the four on it have theirs');
  t.eq(f.tr[5].morale - m0[5], 0, 'the other trainee off it is not docked');
  // the flag, the ledger, the return
  t.eq(JSON.stringify(f.tr[0].flags.offList), JSON.stringify({ week: f.s.week, groupId: r.group.id, group: 'LANTERN', month: true, year: null }), 'the one slighted is marked: she will come to the desk');
  t.eq(f.tr[5].flags.offList, undefined, 'nobody else is');
  t.eq(JSON.stringify(f.s.postingLedger), JSON.stringify({ posted: 1, offMonth: 1, offYear: 0, dropped: 0, knocks: 0, why: 0, next: 0, nothing: 0, unanswered: 0 }), 'the ledger counts the list and who it left off');
  t.ok(!!r.posting && ((r.posting || {}).slighted || {}).id === f.ids[0] && Array.isArray(r.review) && r.review.length >= 1, 'the proposal returns the read beside the executive’s review');
  t.eq(KP.validateState(f.s).length, 0, 'the file is valid');
  // the same read after the list is up
  const after = KP.postingRead(f.s, r.group.members);
  t.eq([(after.monthTop || {}).id, after.others, after.on.length].join('|'), [f.ids[0], 1, 4].join('|'), 'read again after it is posted, the list says the same thing');
}
// the letter writes nothing a proposal did not already draw
{
  const f = fork();
  const g = { id: 'gx', name: 'PROBE', roles: { leader: f.ids[1], center: f.ids[2] }, members: LIST.map(i => f.ids[i]) };
  const read = KP.postingRead(f.s, g.members);
  const rs = JSON.stringify(f.s.rngState);
  KP.postingAfter(f.s, g, read);
  t.eq(JSON.stringify(f.s.rngState), rs, 'the posting draws nothing');
}
// the year's first left off
{
  // different people: the month's first is the one slighted; the year's first is docked too
  const f = fork(); wallOf(f, 5);
  const m0 = f.tr.map(p => p.morale), po = f.tr.map(p => count(p, 'passedOver'));
  const r = propose(f), n = f.s.inbox[0] || { text: '' };
  t.eq([f.tr[0].morale - m0[0], count(f.tr[0], 'passedOver') - po[0], f.tr[5].morale - m0[5], count(f.tr[5], 'passedOver') - po[5]].join('|'), [-6, 1, -P.yearOffMorale, 1].join('|'), 'the year’s first left off is docked ' + P.yearOffMorale + ' and has it on her ledger (it was no slight at all)');
  t.eq(lastLine(f.tr[5]), 'First on the Y1 sheet when the LANTERN lineup was posted, and not on it.', 'with a line on her file');
  t.ok(n.text.includes(' ' + N[0] + ', first on this month’s sheet, is not on it. ' + N[5] + ', first on the Y1 sheet, is not on it either. ') && !/other trainee|read it twice/.test(n.text), 'the letter names both, and nobody else is left to read it twice');
  t.eq(JSON.stringify((f.tr[0].flags.offList || {}).month) + '|' + f.tr[5].flags.offList + '|' + n.personId, 'true|undefined|' + f.ids[0], 'one door: it is the month’s first who will come to the desk');
  t.eq(f.s.postingLedger.offMonth + '|' + f.s.postingLedger.offYear, '1|1', 'both are counted');
  void r;
  // the same person: one slight, a little heavier, not two
  const g = fork(); wallOf(g, 0, 2);
  const g0 = g.tr[0].morale, gp = count(g.tr[0], 'passedOver');
  propose(g); const gn = g.s.inbox[0] || { text: '' };
  t.eq((g.tr[0].morale - g0) + '|' + (count(g.tr[0], 'passedOver') - gp), (-6 - P.bothExtraMorale) + '|1', 'first on both is docked the month’s 6 and ' + P.bothExtraMorale + ' more, and it is on her ledger once');
  t.eq(lastLine(g.tr[0]), 'The Y2 sheet had her first as well. The list is the third piece of paper, and the only one with a debut on it.', 'her file says the year was hers as well');
  t.ok(gn.text.includes(' ' + N[0] + ' is first on this month’s sheet and was first on the Y2 sheet, and is not on it. '), 'and the letter says it in one sentence');
  t.eq(JSON.stringify((g.tr[0].flags.offList || {}).month) + '|' + (g.tr[0].flags.offList || {}).year, 'true|2', 'the mark carries both');
  // only the year's first off: she is the one who comes to the desk
  const h = fork(); wallOf(h, 5);
  const hr = propose(h, [0, 1, 2, 3]), hn = h.s.inbox[0] || { text: '' };
  t.eq(JSON.stringify(h.tr[5].flags.offList), JSON.stringify({ week: h.s.week, groupId: hr.group.id, group: 'LANTERN', month: false, year: 1 }), 'when only the year’s first is left off, the door is hers');
  t.ok(hn.text.includes(' ' + N[5] + ', first on the Y1 sheet, is not on it. ') && !/either/.test(hn.text) && hn.personId === h.ids[5], 'and the letter does not say “either”');
}
// the dropped, the others, everybody, the wait, a solo, one who leads and centers
{
  const f = fork(); KP.openProject(f.s, [f.ids[1], f.ids[5]], []);
  const m5 = f.tr[5].morale;
  propose(f); let n = f.s.inbox[0] || { text: '' };
  t.eq(f.tr[5].morale - m5, -KP.C.PROJECT.droppedMoraleHit, 'one locked into the project and left out is docked as before');
  t.ok(n.text.includes(' ' + N[5] + ' was locked into the project and is not on the final list. ') && f.s.postingLedger.dropped === 1, 'and now the letter says so, and the ledger counts her');
  const g = fork(); g.s.lastEvalTopId = g.ids[1];
  propose(g, [1, 2, 3, 4]); n = g.s.inbox[0] || { text: '' };
  t.ok(n.ind === 'lineupPosted' && n.text.includes(' The two who are not on it read it twice and went back to practice. ') && n.personId === null && !g.tr.some(p => p.flags.offList), 'a list that slights nobody says how many read it twice, and nobody is marked');
  const e = fork(); e.s.roster = e.s.roster.slice(0, 4); e.tr = e.tr.slice(0, 4);
  propose(e, [0, 1, 2, 3]); n = e.s.inbox[0] || { text: '' };
  t.ok(n.text.includes(' Everybody on the floor is on it. '), 'a list with the whole floor on it says so');
  const one = fork(); one.s.lastEvalTopId = one.ids[1]; one.s.roster = one.s.roster.slice(0, 5); one.tr = one.tr.slice(0, 5);
  propose(one, [1, 2, 3, 4]); n = one.s.inbox[0] || { text: '' };
  t.ok(n.text.includes(' The one trainee who is not on it read it twice and went back to practice. '), 'one left off, with nothing to her name, is “the one trainee”');
  const w = fork(); w.tr[3].signedWeek = w.s.week - 3 * YEAR - 5;
  propose(w); n = w.s.inbox[0] || { text: '' };
  t.ok(n.text.includes('. ' + N[3] + ' has been in this building three years, and this is the first list with her name on it. '), 'the one who waited longest has her sentence, in years');
  const s1 = fork();
  KP.openMandate(s1.s, { kind: 'solo', gender: 'f', source: 'the suite' });   // forced: a solo needs its own greenlight
  const sr = KP.proposeGroup(s1.s, 'SOLO ACT', [s1.ids[1]], {}); n = s1.s.inbox[0] || { text: '' };
  t.ok(sr.ok && n.text.startsWith('The notice went up on the practice room door at six: ' + N[1] + ' debuts alone. ') && n.text.includes(N[0] + ', first on this month’s sheet, is not on it. Four other trainees read it twice'), 'a solo is a notice, and the room reads it the same way');
  const lc = fork();
  propose(lc, null, null, { leader: lc.ids[1], center: lc.ids[1] }); n = lc.s.inbox[0] || { text: '' };
  t.ok(n.text.includes('LANTERN: ' + N[1] + ' (leader and center), ' + N[2] + ', '), 'one who leads and centers is marked once');
  // the closer is the act's own
  const seen = new Set();
  for (let i = 0; i < 12; i++) { const x = fork(); x.s.nextGroupId = 10 + i; propose(x, null, 'ACT' + i); seen.add(CLOSERS.findIndex(c => (x.s.inbox[0] || { text: '' }).text.endsWith(c))); }
  t.ok(seen.size === 3 && !seen.has(-1), 'across twelve acts all three closers are used, and nothing else');
}

// ---- the door ----------------------------------------------------------------------
const posted = (mut) => { const f = fork(); if (mut) mut(f); const r = propose(f); return { f, g: r.group, ace: f.tr[0] }; };
const candidates = f => KP.knockCandidates(f.s).filter(c => c.kind === 'offTheList');
{
  const { f, g, ace } = posted();
  const c = candidates(f);
  t.eq(c.length + '|' + (c[0] || {}).personId + '|' + (c[0] || {}).priority + '|' + (c[0] || {}).expiresIn, '1|' + ace.id + '|1|' + P.doorExpire, 'the one slighted is a candidate for the one queue: an event, not a roll');
  // within the window, and not after
  f.s.week += P.doorWeeks;
  t.eq(candidates(f).length, 1, 'she may come any week of the ' + P.doorWeeks + ' after the list');
  f.s.week += 1;
  t.eq(candidates(f).length, 0, 'and not after: she has swallowed it');
  f.s.week -= P.doorWeeks + 1;
  ace.flags.burnout = 2;
  t.eq(candidates(f).length, 0, 'not from the bench');
  ace.flags.burnout = 0; ace.status = 'idol';
  t.eq(candidates(f).length, 0, 'not once she is no longer a trainee');
  ace.status = 'trainee'; g.members.push(ace.id);
  t.eq(candidates(f).length, 0, 'and not if she has been put in an act since');
  g.members.pop();
  t.eq(candidates(f).length, 1, 'fixture: with all of that undone she is a candidate again');
}
{
  // through the week's own rail: she is in the doorway the next week
  const { f, ace } = posted();
  tick(f);
  const sc = (f.s.scenes || []).find(x => x.kind === 'offTheList') || { id: 'none' };
  const def = KP.sceneDef('offTheList');
  t.eq(sc.personId + '|' + sc.expiresWeek + '|' + f.s.postingLedger.knocks, ace.id + '|' + (f.s.week + P.doorExpire) + '|1', 'the week after the list she is at the desk, for ' + P.doorExpire + ' weeks, and it is counted');
  t.eq(def.title(f.s, sc), N[0] + ' · the list', 'the card is hers');
  const body = def.body(f.s, sc);
  t.ok(body.startsWith(N[0] + ' is in the doorway and does not sit down. She was first on the sheet this month, and the LANTERN list went up without her.') && body.includes('I am not asking to be on it. I am asking what the sheet is for.') && !noisy(body), 'she says what she was, and what she is asking');
  t.eq(def.options(f.s, sc).map(o => o.id + ':' + o.label).join(' | '), 'why:Tell her why | next:Promise her the next lineup | nothing:The list is the list', 'three answers');
  t.eq(candidates(f).length, 0, 'while she is in the doorway she is not a candidate again');
  // told why
  const m = ace.morale, ts = count(ace, 'toldStraight');
  const out = KP.resolveScene(f.s, sc.id, 'why');
  t.eq([out.ok, ace.morale - m, count(ace, 'toldStraight') - ts, ace.flags.offList, f.s.postingLedger.why, (f.s.claims || []).filter(c => c.type === 'debutByPromise').length].join('|'), [true, P.whyMorale, 1, undefined, 1, 0].join('|'), 'told why: ' + P.whyMorale + ' morale back, told straight on her ledger, the mark gone, no promise made');
  t.ok(/^Asked what the sheet is for, the week the LANTERN list went up without her, and was told why/.test(lastLine(ace)) && !!out.toast && !noisy(out.toast), 'with a line on her file');
  t.ok(!(f.s.scenes || []).some(x => x.kind === 'offTheList') && candidates(f).length === 0, 'the door closes, and she does not come twice');
  let again = 0; for (let i = 0; i < 8; i++) { tick(f); again += (f.s.scenes || []).filter(x => x.kind === 'offTheList').length; }
  t.eq(again + '|' + f.s.postingLedger.knocks, '0|1', 'eight weeks on she has not come back');
  t.eq(KP.validateState(f.s).length, 0, 'the file is valid');
}
{
  // the list is the list
  const { f, ace } = posted(); tick(f);
  const sc = (f.s.scenes || []).find(x => x.kind === 'offTheList') || { id: 'none' };
  const m = ace.morale, d = (ace.directed || []).length;
  const out = KP.resolveScene(f.s, sc.id, 'nothing');
  t.eq([out.ok, ace.morale - m, (ace.directed || []).length - d, ace.flags.offList, f.s.postingLedger.nothing].join('|'), [true, -P.nothingMorale, 0, undefined, 1].join('|'), 'the list is the list: ' + P.nothingMorale + ' more morale gone, nothing new on her ledger (being passed over already stands)');
  t.ok(/and was told the list is the list\.$/.test(lastLine(ace)), 'and her file says what she was told');
}
{
  // promised the next lineup
  const { f, g, ace } = posted(); tick(f);
  const sc = (f.s.scenes || []).find(x => x.kind === 'offTheList') || { id: 'none' };
  const m = ace.morale;
  const out = KP.resolveScene(f.s, sc.id, 'next');
  const c = (f.s.claims || []).find(x => x.type === 'debutByPromise' && x.personId === ace.id) || {};
  t.eq([out.ok, ace.morale - m, f.s.postingLedger.next, ace.flags.offList].join('|'), [true, P.promiseMorale, 1, undefined].join('|'), 'promised the next lineup: ' + P.promiseMorale + ' morale, counted, the mark gone');
  t.eq([c.type, c.byWeek, c.exceptGroupId, c.resolved, c.label].join('|'), ['debutByPromise', f.s.week + P.promiseWeeks, g.id, null, 'The next debut lineup after LANTERN includes ' + N[0]].join('|'), 'the promise is on the record: the lineup after this one, within two years');
  t.ok(/Was promised the next lineup, on the record\.$/.test(lastLine(ace)), 'and on her file');
  // the list that left her off debuts without her: that is not the promise breaking
  const check = KP.claimCheckFor('debutByPromise');
  g.debuted = true; g.debutWeek = f.s.week + 6; f.s.week += 8;
  t.eq(check(f.s, c), null, 'the act that left her off debuts without her, and the promise stands: it was about the next one');
  t.eq(ace.status + '|' + f.s.roster.includes(ace.id), 'trainee|true', 'she is still in the building');
  // (the twin: the same promise without the exception is broken by that debut, as a resignation's promise is)
  const twin = JSON.parse(JSON.stringify(c)); delete twin.exceptGroupId;
  const tf = fork({ s: f.s }); const tc = Object.assign((tf.s.claims || []).find(x => x.id === c.id) || {}, twin); delete tc.exceptGroupId;
  t.eq((KP.claimCheckFor('debutByPromise')(tf.s, tc) || {}).resolved, 'missed', 'the same promise without the exception is broken by that debut: the exception is what a list’s promise needs');
  // another act debuts without her: now it is broken
  f.s.nextGroupId = 50;
  const other = { id: 'g50', name: 'OTHER', members: [f.ids[5]], roles: {}, debuted: true, debutWeek: f.s.week + 1, releases: [], formedWeek: f.s.week };
  f.s.groups.push(other); f.s.week += 2;
  const broke = check(f.s, c) || {};
  t.eq(broke.resolved + '|' + ace.status + '|' + f.s.roster.includes(ace.id), 'missed|released|false', 'the next act after that debuts without her, the promise is broken, and she packs the same night');
}
{
  // the promise kept
  const { f, ace } = posted(); tick(f);
  const sc = (f.s.scenes || []).find(x => x.kind === 'offTheList') || { id: 'none' };
  KP.resolveScene(f.s, sc.id, 'next');
  const c = (f.s.claims || []).find(x => x.type === 'debutByPromise' && x.personId === ace.id) || {};
  const pk = count(ace, 'promiseKept');
  ace.status = 'idol';
  t.eq((KP.claimCheckFor('debutByPromise')(f.s, c) || {}).resolved + '|' + (count(ace, 'promiseKept') - pk), 'met|1', 'she debuts, and the promise is kept, on her ledger');
}
{
  // one who already holds the promise is not offered it twice
  const { f, ace } = posted(ff => {
    KP.openClaim(ff.s, { type: 'debutByPromise', subject: { kind: 'idol', id: ff.ids[0] }, personId: ff.ids[0], byWeek: ff.s.week + 40, label: 'an older promise' });
  });
  tick(f);
  const sc = (f.s.scenes || []).find(x => x.kind === 'offTheList') || { id: 'none' };
  t.eq(KP.sceneDef('offTheList').options(f.s, sc).map(o => o.id).join(','), 'why,nothing', 'a trainee who already holds a promise of the next lineup is not offered another');
  const m = ace.morale;
  const out = KP.resolveScene(f.s, sc.id, 'next');
  t.eq(out.ok + '|' + (ace.morale - m) + '|' + (f.s.claims || []).filter(x => x.type === 'debutByPromise' && !x.resolved).length, 'false|0|1', 'and asking for it anyway is refused: nothing moves, and there is still one promise');
}
{
  // silence
  const { f, ace } = posted(); tick(f);
  const lw = count(ace, 'leftWaiting'), m = ace.morale;
  let expired = false;
  for (let i = 0; i < P.doorExpire + 2 && !expired; i++) { tick(f, true); expired = !(f.s.scenes || []).some(x => x.kind === 'offTheList'); }
  t.eq([expired, count(ace, 'leftWaiting') - lw, f.s.postingLedger.unanswered, ace.flags.offList, ace.morale <= m].join('|'), [true, 1, 1, undefined, true].join('|'), 'left standing in the doorway: it is on her ledger, as for anyone who knocked, and it is counted');
  t.eq(lastLine(ace), 'Came to the desk about the LANTERN list and was left standing in the doorway.', 'and on her file');
  let again = 0; for (let i = 0; i < 6; i++) { tick(f); again += (f.s.scenes || []).filter(x => x.kind === 'offTheList').length; }
  t.eq(again, 0, 'she does not come back');
}
{
  // a door answered after she has left the room
  const { f, ace } = posted(); tick(f);
  const sc = (f.s.scenes || []).find(x => x.kind === 'offTheList') || { id: 'none' };
  ace.status = 'idol';
  const m = ace.morale, out = KP.resolveScene(f.s, sc.id, 'why');
  t.eq(out.ok + '|' + (ace.morale - m) + '|' + f.s.postingLedger.why, 'true|0|0', 'a door answered after she is no longer a trainee does nothing');
  // the year's first at the desk says what she was
  const y = posted(ff => { wallOf(ff, 5); ff.s.lastEvalTopId = ff.ids[1]; }); tick(y.f);
  const ys = (y.f.s.scenes || []).find(x => x.kind === 'offTheList') || { id: 'none' };
  t.ok(ys.personId === y.f.ids[5] && KP.sceneDef('offTheList').body(y.f.s, ys).includes('She was first on the Y1 sheet, and the LANTERN list went up without her.'), 'the year’s first, at the desk, says the year was hers');
  const b = posted(ff => wallOf(ff, 0, 3)); tick(b.f);
  const bs = (b.f.s.scenes || []).find(x => x.kind === 'offTheList') || { id: 'none' };
  t.ok(KP.sceneDef('offTheList').body(b.f.s, bs).includes('She was first on the sheet this month and first on the Y3 sheet, and the LANTERN list'), 'and one who was first on both says both');
}

// ---- an old file -------------------------------------------------------------------
// v0.11.16 had no posting ledger. The version is set by hand: the build's own
// number moves at the ship.
{
  const o = JSON.parse(KP.serialize(base.s));
  o.version = '0.11.16'; delete o.postingLedger;
  const f = { s: KP.deserialize(JSON.stringify(o)), ids: base.ids.slice() }; f.tr = f.ids.map(id => f.s.people[id]);
  t.eq(f.s.version + '|' + JSON.stringify(f.s.postingLedger), KP.C.VERSION + '|' + JSON.stringify({ posted: 0, offMonth: 0, offYear: 0, dropped: 0, knocks: 0, why: 0, next: 0, nothing: 0, unanswered: 0 }), 'an old file is stamped to this build and its ledger arrives, all zeros');
  const r = propose(f);
  t.ok(r.ok && (f.s.inbox[0] || {}).ind === 'lineupPosted' && f.s.postingLedger.posted === 1, 'and its next list is a letter, like any other');
}

// ---- the screens --------------------------------------------------------------------
{
  const dom = require('./dom_stub');
  const Dm = dom.load();
  const K = Dm.KP, App = Dm.App, UI = Dm.UI, el = Dm.el;
  const text = h => dom.stripTags(String(h || '')).replace(/\s+/g, ' ');
  const clean = h => !/undefined|NaN|\{she\}|\{her\}|\{pos\}|\{Pos\}/.test(h);
  const load = f => K.deserialize(KP.serialize(f.s));
  // the builder, before the list goes up
  const f = fork();
  const draft = ids => ({ members: ids, roles: {}, name: 'LANTERN', nameOptions: ['LANTERN'], customName: '', seeking: [] });
  let h = UI.renderBuilder(load(f), draft(LIST.map(i => f.ids[i]))), T = text(h);
  t.ok(clean(h) && T.includes('What the room will read') && T.includes(N[0] + ' is first on this month’s sheet and is not on this list.') && T.includes(N[0] + ' will come to the desk about it.'), 'the builder says who the room will look for and not find, before the list goes up');
  T = text(UI.renderBuilder(load(f), draft([0, 1, 2, 3].map(i => f.ids[i]))));
  t.ok(!T.includes('What the room will read'), 'and says nothing when the list slights nobody');
  T = text(UI.renderBuilder(load(f), draft([f.ids[1]])));
  t.ok(T.includes(N[0] + ' is first on this month’s sheet and is not on this list.') && !T.includes('What the room will read'), 'a solo carries the same line under its own button');
  // the door on the Desk
  const d = posted(); tick(d.f);
  const ds = load(d.f);
  App.state = ds; App.mode = 'game'; App.tab = 'desk'; App.deskSub = 'today'; App.view = null; App.render();
  h = el('screen').innerHTML; T = text(h);
  t.ok(clean(h) && T.includes(N[0] + ' · the list') && T.includes('I am asking what the sheet is for.'), 'the door is on the Desk, as her card');
  t.ok(['Tell her why', 'Promise her the next lineup', 'The list is the list'].every(x => T.includes(x)), 'with its three answers');
  // the letter on the Desk
  t.ok(T.includes('The list went up on the practice room door at six.') || (() => { App.deskSub = 'inbox'; App.render(); return text(el('screen').innerHTML).includes('The list went up on the practice room door at six.'); })(), 'and the list’s letter is in the inbox');
}

t.finish();
