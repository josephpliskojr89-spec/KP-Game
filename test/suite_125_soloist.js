/* Suite 125 — the soloist, read as one (v0.11.15; a repair of v0.11.12, §103).

   v0.11.12 let a departed artist debut solo at another house: the street's
   first acts of one. The readers around a rival act still assumed a group.
   The long check found the first of them (the soak's own lineup rule,
   v0.11.14, §105). This suite holds the rest.

   Pinned here:
   · a soloist's run ends the two ways any act's does, in her words: one
     letter with her name on it, her file, the house's move, and nothing
     that says "disbanded", "team activities" or "the members"
   · the ending draws nothing a group's does not, and costs the house the
     same
   · her file is stamped, the ledger counts her, and the alumni line reads
     off the file (it lowercased her name)
   · an old file on which a run already ended is rewritten in her words
   · a soloist at the service wall does not rotate and is not a row of
     haircuts; an old file's soloist mid-"rotation" becomes a pause
   · the sentences that name another house's artist: a soloist is not
     "Name of Name", and one who was ours once is not a stranger
   · a story about a soloist is about her; her first trophy is hers; a hit
     of hers is not "a win for girl groups"
   A group's words are unchanged throughout: each check has its twin.
   Two laws from §99 hold: the week's wire is read before the trim, and a
   fixture forces every gate and relies on no roll. */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_125_soloist');

const I = KP.C.INDUSTRY, M = KP.C.MIL, SV = KP.C.RISEFALL.SERVICE;
const firstOf = list => (list && list[0]) || { text: '', priority: null, ind: 'none', how: null, personId: null, alumOf: null, solo: null, persona: null };
const noisy = x => /undefined|NaN|\{she\}|\{her\}|\{pos\}|\{herself\}|\{hers\}|\{She\}|\{Pos\}|\{CO\}|\[object/.test(x);
const when = w => KP.weekLabel(w).text;
const TAIL = '. The stage years are the chapter.';
// a group's sentences: none of these may be said of an act of one
const GROUPISH = /team activities|disband|the members|every member|TOGETHER|haircuts|group photo|rotation|short-handed|whole again|kings|boy group|girl group|boys are home|ARE BACK| member is moving|their first/;
const src = f => fs.readFileSync(path.join(__dirname, '..', 'js', 'engine', f), 'utf8');

function tick(s) { s.budget = Math.max(s.budget, 900); KP.advanceWeek(s); return (KP.lastTickNotes || []).slice(); }
// a constant forced for the length of one call: a roll that cannot lose is not a roll
function forced(obj, key, val, fn) { const old = obj[key]; obj[key] = val; try { return fn(); } finally { obj[key] = old; } }

// ---- the fixture: one of ours leaves, is signed across the street and debuts solo, by the game's own verbs ----
const base = (() => {
  const s = KP.newGame('soloist-125', null, { legacy: true });
  const g = s.groups.find(x => x.debuted);
  tick(s);
  const p = s.people[g.members[0]];
  KP.departIdol(s, p.id, 'cold', null);
  s.week += 10;
  KP.acrossSign(s, p, KP.signingHouses(s)[0], []);
  s.week = (p.flags.across || {}).debutAt != null ? p.flags.across.debutAt : s.week + 8;
  KP.acrossDebut(s, p, []);
  return { s, gid: g.id, pid: p.id };
})();
function fork(src0) {
  const s = KP.deserialize(KP.serialize((src0 || base).s));
  const p = s.people[base.pid] || { flags: {}, history: [], chapters: [], name: {} };
  const r = (s.rivals || []).find(x => x.short === p.company) || (s.rivals || []).find(x => (x.acts || []).some(a => (a.members || []).includes(base.pid))) || { acts: [], short: '?', recentMoves: [], prestige: 0 };
  const act = (r.acts || []).find(a => (a.members || []).includes(base.pid)) || { members: [], releases: [], name: '', id: 'none' };
  return { s, p, r, act, g: s.groups.find(x => x.id === base.gid) || { members: [] } };
}
const CO = base.s.company.short;
// any group on the street, for the twin of every sentence
const groupOf = s => {
  for (const r of (s.rivals || [])) { const a = (r.acts || []).find(q => !q.solo && !q.retired && (q.members || []).length >= I.actSize[0] && s.people[q.members[0]]); if (a) return { act: a, r, m: s.people[a.members[0]] }; }
  return { act: { name: 'none', members: [], id: 'none' }, r: { short: '?' }, m: { name: {}, gender: 'f', flags: {} } };
};

{
  const f = fork();
  t.eq([f.p.status, f.act.solo, f.act.alumOf, f.act.members.length, f.act.name].join('|'), ['rival', true, CO, 1, KP.displayName(f.p)].join('|'), 'fixture: an artist who was ours is a soloist across the street, under her own name');
  t.ok(KP.actLineupOk(f.act) && groupOf(f.s).act.id !== 'none', 'fixture: her act of one is a real lineup, and there is a group on the street to compare her with');
}

// ---- the two endings, through the week's own rail -------------------------
// The twin is the same act with the solo flag off: the same week, read as a
// group. Whatever differs between the two is the words.
const endBy = (how, solo) => {
  const f = fork();
  if (!solo) delete f.act.solo;
  f.act.lastReleaseWeek = f.s.week;                       // forced: no record lands this week
  if (how === 'cold') { f.act.popularity = 0; f.act.debutWeek = f.s.week - I.disbandMinAgeWeeks - 5; }
  else { f.act.popularity = 60; f.act.debutWeek = f.s.week - I.ROOM.sevenYearWeeks - 5; }
  const before = { ended: KP.acrossLedger(f.s).ended };
  const wire = how === 'cold' ? forced(I, 'disbandChance', 1, () => tick(f.s)) : forced(I.ROOM, 'wallChance', 1, () => tick(f.s));
  return { f, wire, before };
};
{
  const a = endBy('cold', true), b = endBy('cold', false);
  const { f, wire } = a, p = f.p, r = f.r, act = f.act;
  const mine = wire.filter(n => n.ind === 'soloEnded' && n.personId === p.id);
  const n = firstOf(mine);
  t.eq(act.retired + '|' + act.retiredWeek, 'true|' + f.s.week, 'fixture: the records stopped landing and the house let the act go (the roll forced)');
  t.eq(mine.length + '|' + wire.filter(x => x.ind === 'disband' && x.actName === act.name).length, '1|0', 'a soloist’s run ending is one letter of its own, and nobody disbanded');
  t.eq([n.kind, n.how, n.priority, n.alumOf, n.company, n.actName].join('|'), ['industry', 'cold', 'high', CO, r.short, act.name].join('|'), 'the letter carries her, the house, how it ended, and that she was ours, at the weight of her signing and her debut');
  t.ok(!!n.text && !GROUPISH.test(n.text) && !noisy(n.text), 'nothing in it is a group’s sentence');
  t.ok(n.text.includes(act.name) && n.text.includes(r.short) && /\b1 record\b/.test(n.text) && !/the last of them/.test(n.text), 'it names her, the house, and the one record she made there');
  t.ok(n.text.endsWith(' She was ' + CO + '’s before she was theirs; the file here has one more page in it now.'), 'and it ends on the sentence that makes it about an artist who was ours');
  t.eq(p.status + '|' + p.company, 'gone|null', 'she goes home');
  t.eq((p.history[p.history.length - 1] || {}).text, 'The solo run at ' + r.short + ' ended' + TAIL, 'her file says her solo run ended (it said she “disbanded”)');
  t.eq(KP.chapterLine(f.s, p.chapters[p.chapters.length - 1] || {}), 'The solo run at ' + r.short + ' ended', 'and so does her last chapter');
  t.eq([p.flags.across.endedWeek, p.flags.across.endedCo, p.flags.across.endedHow].join('|'), [f.s.week, r.short, 'cold'].join('|'), 'her file is stamped with when, where and how');
  t.eq(KP.acrossLedger(f.s).ended, a.before.ended + 1, 'the ledger counts the run that ended');
  t.eq(KP.whereNow(f.s, p), 'home since ' + when(f.s.week) + ', after a solo run at ' + r.short, 'where she is now is read off her file');
  t.ok((r.recentMoves || []).includes(act.name + '’s solo run ended') && !(r.recentMoves || []).includes(act.name + ' disbanded'), 'the house’s moves say a solo run ended');
  // a house that merged since she signed: the line names the house she ended at
  const was = p.flags.across.endedCo; p.flags.across.endedCo = 'MERGED';
  t.eq(KP.whereNow(f.s, p), 'home since ' + when(f.s.week) + ', after a solo run at MERGED', 'the alumni line names the house her run ended at, whatever it was called when she signed');
  p.flags.across.endedCo = was;
  t.ok(KP.isAlum(f.s, p) && KP.alumniOf(f.s).some(x => x.id === p.id), 'she is an alumna still');
  t.eq(KP.validateState(f.s).length, 0, 'the file is valid');
  // the week's budget does not cut it: a normal one was cut the first week it was read in a browser
  t.ok((f.s.inbox || []).some(x => x.ind === 'soloEnded' && x.personId === p.id && x.week === f.s.week), 'the letter is in the inbox after the week’s trim (' + wire.filter(x => !x.spotlight && !x.feedOnly).length + ' notes competed for five places)');
  // the twin
  const nb = firstOf(b.wire.filter(x => x.ind === 'disband' && x.actName === b.f.act.name));
  t.ok(/conclusion of team activities/.test(nb.text) && b.wire.every(x => x.ind !== 'soloEnded'), 'the twin, read as a group, is still told as a group disbanding: the flag is all that changed');
  t.eq(JSON.stringify(f.s.rngState), JSON.stringify(b.f.s.rngState), 'her words draw nothing: both weeks leave the stream in the same place');
  t.eq(r.prestige, b.f.r.prestige, 'and the ending costs the house exactly what a group’s costs');
  t.eq(b.f.p.flags.across.endedWeek, undefined, 'the twin’s file is not stamped: the stamp belongs to the soloist’s ending');
}
{
  const a = endBy('wall', true), b = endBy('wall', false);
  const { f, wire } = a, p = f.p, r = f.r, act = f.act;
  const mine = wire.filter(n => n.ind === 'soloEnded' && n.personId === p.id);
  const n = firstOf(mine);
  t.eq(act.retired + '|' + mine.length + '|' + wire.filter(x => x.ind === 'disband' && x.actName === act.name).length, 'true|1|0', 'seven years on the paper runs out: one letter of her own (the roll forced)');
  t.eq(n.how + '|' + n.priority + '|' + n.alumOf, 'wall|high|' + CO, 'the letter says it was the paper');
  t.ok(n.text.startsWith(act.name + '’s contract with ' + r.short + ' ran its full term and was not renewed: seven years as a soloist, 1 record, and a last post that thanked everybody by name.'), 'a full term, told as a soloist’s');
  t.ok(!GROUPISH.test(n.text) && !noisy(n.text) && n.text.endsWith('the file here has one more page in it now.'), 'with no group’s sentence in it (it said “the members could not land on the same next chapter”)');
  t.eq((p.history[p.history.length - 1] || {}).text, 'The solo contract at ' + r.short + ' ran its term' + TAIL, 'her file says the contract ran its term');
  t.eq(p.flags.across.endedHow + '|' + KP.whereNow(f.s, p), 'wall|home since ' + when(f.s.week) + ', after a solo run at ' + r.short, 'stamped, and read the same way on the alumni list');
  t.ok((r.recentMoves || []).includes(act.name + '’s solo contract ran out (7 years)'), 'the house’s moves say a solo contract ran out');
  const nb = firstOf(b.wire.filter(x => x.ind === 'disband' && x.actName === b.f.act.name));
  t.ok(/seven-year run ends where the contracts do/.test(nb.text) && /the members/.test(nb.text), 'the twin, read as a group, is still told as a group’s seven years');
  t.eq(JSON.stringify(f.s.rngState) + '|' + r.prestige, JSON.stringify(b.f.s.rngState) + '|' + b.f.r.prestige, 'no draw, and the same cost to the house');
  t.eq(KP.validateState(f.s).length, 0, 'the file is valid');
}

// ---- the ending as a verb: both ways it is told, the count of records, a stranger, nobody ----
{
  const seen = new Set(); let bad = 0, quiet = 0;
  for (let w = 1; w <= 40; w++) {
    const f = fork(); f.s.week = w;
    f.act.releases = (f.act.releases || []).concat([{ title: 'b' }, { title: 'c' }]);
    const n = KP.soloEndNote(f.s, f.r, f.act, 'cold');
    seen.add(n.text.replace(/ She was .*$/, ''));
    if (GROUPISH.test(n.text) || noisy(n.text) || !/\b3 records\b/.test(n.text)) bad++;
    if (/the last of them quiet/.test(n.text)) quiet++;
  }
  t.eq(seen.size + '|' + bad, '2|0', 'the records stopping is told two ways across forty weeks, each with her three records and no group’s sentence');
  t.ok(quiet > 0 && quiet < 40, 'one of the two mentions the quiet last record, when there is more than one');
  // one record: there is no "last of them". Both tellings are read, over the same forty weeks.
  const one = new Set(); let lastOfOne = 0;
  for (let w = 1; w <= 40; w++) {
    const f = fork(); f.s.week = w;
    const n = KP.soloEndNote(f.s, f.r, f.act, 'cold');
    one.add(n.text.replace(/ She was .*$/, ''));
    if (/the last of them/.test(n.text) || !/\b1 record\b/.test(n.text)) lastOfOne++;
  }
  t.eq(one.size + '|' + lastOfOne, '2|0', 'with one record neither telling speaks of “the last of them”');
  const a = fork(), b = fork();
  const before = JSON.stringify(a.s.rngState);
  const n1 = KP.soloEndNote(a.s, a.r, a.act, 'cold');
  t.eq(JSON.stringify(a.s.rngState), before, 'the verb draws nothing');
  const n2 = KP.soloEndNote(a.s, a.r, a.act, 'cold');
  t.eq(KP.acrossLedger(a.s).ended + '|' + / She was /.test(n1.text) + '|' + / She was /.test(n2.text), '1|true|false', 'a run ends once: told twice, it is counted once and the page is turned once');
  delete b.act.alumOf;
  const ns = KP.soloEndNote(b.s, b.r, b.act, 'cold');
  t.eq([ns.alumOf, ns.priority, / She was /.test(ns.text), b.p.flags.across.endedWeek, KP.acrossLedger(b.s).ended].join('|'), [null, undefined, false, undefined, 0].join('|'), 'a soloist who was never ours gets the industry’s sentence, at the industry’s priority, and no page in this building');
  const c = fork(); c.act.members = ['nobody'];
  const ng = KP.soloEndNote(c.s, c.r, c.act, 'wall');
  t.ok(ng.personId === null && !noisy(ng.text) && !GROUPISH.test(ng.text), 'an act whose person is gone from the world still ends in a sentence');
}

// ---- the timeline hears it ---------------------------------------------------
{
  const f = fork();
  const react = KP.feedReactionFor('soloEnded') || (() => null);
  const ours = react(f.s, { personId: f.p.id, alumOf: CO }) || firstOf();
  const theirs = react(f.s, { personId: f.p.id, alumOf: null }) || firstOf();
  t.ok(ours.text.includes(KP.publicGiven(f.p)) && ['fan', 'casual', 'stan'].includes(ours.persona) && !GROUPISH.test(ours.text) && !noisy(ours.text), 'the timeline has a post for a solo run ending, and it names her');
  t.ok(!!theirs.text && theirs.text !== ours.text && !GROUPISH.test(theirs.text) && !noisy(theirs.text), 'a soloist who was never ours gets a different post');
  t.eq(react(f.s, { personId: 'nobody', alumOf: CO }), null, 'nobody on file, no post');
  const before = JSON.stringify(f.s.rngState);
  react(f.s, { personId: f.p.id, alumOf: CO });
  t.eq(JSON.stringify(f.s.rngState), before, 'the post is picked by a hash, not a draw');
}

// ---- the alumni line, on a file this build never stamped ---------------------
// What v0.11.14 left behind when a solo run ended: the group's words as her
// last chapter and on her history, and no date. The version is set by hand:
// the build's own number moves at the ship.
{
  const made = endBy('cold', true);
  const NAME = made.f.act.name, R = made.f.r.short, ENDED = made.f.s.week;
  const oldFile = (srcState, wallWords, mut) => {
    const o = JSON.parse(KP.serialize(srcState));
    o.version = '0.11.14';
    const q = o.people[base.pid];
    const oldWhy = wallWords ? NAME + '’s seven-year run ended' : NAME + ' disbanded';
    if (q.flags.across) { delete q.flags.across.endedWeek; delete q.flags.across.endedCo; delete q.flags.across.endedHow; }
    if (q.status === 'gone') {
      q.chapters[q.chapters.length - 1].why = oldWhy;
      q.history[q.history.length - 1].text = oldWhy + TAIL;
    }
    if (o.acrossLedger) delete o.acrossLedger.ended;
    if (mut) mut(o);
    return JSON.stringify(o);
  };
  // before any migration: the read alone, on the raw file
  const raw = JSON.parse(oldFile(made.f.s, false));
  const rp = raw.people[base.pid];
  t.eq(KP.chapterLine(raw, rp.chapters[rp.chapters.length - 1]), NAME + ' disbanded', 'fixture: the old file’s last chapter is the group’s word under her name');
  t.eq(KP.whereNow(raw, rp), 'home, after a solo run at ' + R, 'the alumni line reads off her file, never off that chapter (it lowercased her name)');
  t.ok(!KP.whereNow(raw, rp).includes(NAME.charAt(0).toLowerCase() + NAME.slice(1)), 'and her name is nowhere in lower case');
  // the load
  const s = KP.deserialize(oldFile(made.f.s, false));
  const p = s.people[base.pid];
  t.eq(s.version, KP.C.VERSION, 'an old file is stamped to this build on load');
  t.eq(KP.chapterLine(s, p.chapters[p.chapters.length - 1]) + '|' + p.history[p.history.length - 1].text, 'The solo run at ' + R + ' ended|The solo run at ' + R + ' ended' + TAIL, 'her last chapter and its line on her history are rewritten in her words');
  t.eq([p.flags.across.endedWeek, p.flags.across.endedCo, p.flags.across.endedHow].join('|'), [ENDED, R, 'cold'].join('|'), 'the file is stamped from the chapter: the week it ended, the house, how');
  t.eq(s.acrossLedger.ended, 1, 'the ledger arrives counting her');
  t.eq(KP.whereNow(s, p), 'home since ' + when(ENDED) + ', after a solo run at ' + R, 'and the alumni line has its date');
  const again = KP.deserialize(KP.serialize(s));
  t.eq(again.acrossLedger.ended + '|' + again.people[base.pid].history.filter(h => /solo run at/.test(h.text)).length, '1|1', 'a second load changes nothing: she is counted once');
  const w = KP.deserialize(oldFile(made.f.s, true)), wp = w.people[base.pid];
  t.eq(KP.chapterLine(w, wp.chapters[wp.chapters.length - 1]) + '|' + wp.flags.across.endedHow, 'The solo contract at ' + R + ' ran its term|wall', 'a run that ended at the seven-year wall is rewritten as the paper running out');
  // somebody whose last chapter is in other words keeps them, and is still stamped
  const k = KP.deserialize(oldFile(made.f.s, false, o => { const q = o.people[base.pid]; q.chapters[q.chapters.length - 1].why = 'Went home'; q.history[q.history.length - 1].text = 'Went home.'; }));
  const kp = k.people[base.pid];
  t.eq(KP.chapterLine(k, kp.chapters[kp.chapters.length - 1]) + '|' + kp.history[kp.history.length - 1].text + '|' + kp.flags.across.endedHow, 'Went home|Went home.|cold', 'a chapter in other words is left as written; the file is stamped all the same');
  // a soloist still running is not touched
  const live = KP.deserialize(oldFile(base.s, false)), lp = live.people[base.pid];
  t.eq(lp.status + '|' + lp.flags.across.endedWeek + '|' + live.acrossLedger.ended, 'rival|undefined|0', 'a soloist whose run is still on is not stamped, and nobody is counted');
  // the stagger an act of one was given
  const rot = KP.deserialize(oldFile(base.s, false, o => {
    const q = o.people[base.pid];
    const house = o.rivals.find(x => (x.acts || []).some(a => (a.members || []).includes(base.pid)));
    const act = house.acts.find(a => (a.members || []).includes(base.pid));
    q.gender = 'm'; act.gender = 'm';
    q.flags.military = { since: o.week, until: o.week + 30 };
    act.serviceRotation = { until: o.week + 66 };
    act.announcedWeek = o.week + 3;
    const g = house.acts.find(a => !a.solo && !a.retired) || o.rivals.map(x => (x.acts || []).find(a => !a.solo && !a.retired)).find(Boolean);
    g.serviceRotation = { until: o.week + 50 }; o.__grp = g.id;
  }));
  const ra = fork({ s: rot }).act;
  const rg = (KP.rivalActById(rot, rot.__grp) || { act: {} }).act;
  t.eq([!!ra.serviceRotation, (ra.servicePause || {}).until, ra.announcedWeek].join('|'), [false, rot.week + 30, undefined].join('|'), 'an old file’s soloist on a “rotation” is on a pause instead, ending the week his own service does, with no comeback announced from the barracks');
  t.eq((rg.serviceRotation || {}).until + '|' + !!rg.servicePause, (rot.week + 50) + '|false', 'a group’s rotation is left alone');
}

// ---- the service wall ----------------------------------------------------------
{
  const mk = solo => {
    const f = fork();
    if (!solo) delete f.act.solo;
    f.act.gender = 'm'; f.p.gender = 'm'; f.p.age = M.deadlineAge; delete f.p.serviceDone; delete f.p.flags.military;
    f.act.popularity = SV.staggerPop + 20;                // forced: warm enough for the stagger
    f.act.lastReleaseWeek = f.s.week;
    return { f, wire: tick(f.s) };
  };
  const a = mk(true), b = mk(false);
  const n = firstOf(a.wire.filter(x => x.ind === 'rivalEnlist' && x.actName === a.f.act.name));
  t.eq([!!a.f.act.serviceRotation, (a.f.act.servicePause || {}).until, (a.f.p.flags.military || {}).until].join('|'), [false, a.f.s.week + M.serviceWeeks, a.f.s.week + M.serviceWeeks].join('|'), 'a soloist at the wall does not rotate, however warm: the run pauses and he serves');
  t.ok(n.solo === true && n.text.startsWith(a.f.act.name + ' enlists this week — ' + a.f.r.short + '’s statement is two lines and a date') && /one person in it/.test(n.text), 'the letter is one man’s enlistment');
  t.ok(!GROUPISH.test(n.text) && !noisy(n.text), 'with no group’s sentence in it (it said “a row of short haircuts, a group photo at the gate”)');
  const nb = firstOf(b.wire.filter(x => x.ind === 'rivalEnlist' && x.actName === b.f.act.name));
  t.ok(!!b.f.act.serviceRotation && !b.f.act.servicePause && /first of the rotation/.test(nb.text), 'the twin, read as a group, takes the stagger: the flag is all that changed');
  // home again
  (a.f.act.servicePause = a.f.act.servicePause || {}).until = a.f.s.week + 1; a.f.act.lastReleaseWeek = a.f.s.week;   // forced: his service ends next week
  const back = firstOf(tick(a.f.s).filter(x => x.ind === 'rivalReturn' && x.actName === a.f.act.name));
  t.eq([back.solo, a.f.p.serviceDone, !!a.f.p.flags.military, !!a.f.act.servicePause, a.f.act.returnPrimed].join('|'), [true, a.f.s.week, false, false, true].join('|'), 'the week his service ends he is discharged, the pause is over, and the return is primed');
  t.ok(/service chapter closed on schedule/.test(back.text) && !GROUPISH.test(back.text) && !noisy(back.text), 'the return is told with no group’s sentence in it');
  // a rotation an old file still carries ends in his words, not "whole again"
  const old = solo => {
    const f = fork();
    if (!solo) delete f.act.solo;
    f.act.gender = 'm'; f.p.gender = 'm'; f.p.age = M.deadlineAge; f.p.flags.military = { since: f.s.week - 70, until: f.s.week + 1 };
    f.act.serviceRotation = { until: f.s.week + 1 }; f.act.lastReleaseWeek = f.s.week;
    return { f, n: firstOf(tick(f.s).filter(x => x.ind === 'rivalReturn' && x.actName === f.act.name)) };
  };
  const os = old(true), og = old(false);
  t.ok(os.n.solo === true && os.n.text.startsWith(os.f.act.name + ' is home — discharged on schedule') && !GROUPISH.test(os.n.text), 'a soloist whose “rotation” ends is home, not “whole again”');
  t.ok(/is whole again/.test(og.n.text) && /every member discharged/.test(og.n.text), 'a group’s rotation still ends whole again');
  // the timeline: one pick either way
  const first = { pick: arr => arr[0] }, second = { pick: arr => arr[1] };
  const posts = (ind, note) => [first, second].map(rng => ((KP.feedReactionFor(ind) || (() => null))(a.f.s, note, rng) || firstOf()).text);
  const soloPosts = posts('rivalEnlist', { solo: true, actName: 'Min-jae', company: 'NOVA' }).concat(posts('rivalReturn', { solo: true, actName: 'Min-jae', company: 'NOVA' }));
  const grpPosts = posts('rivalEnlist', { actName: 'ORBIT', company: 'NOVA' }).concat(posts('rivalReturn', { actName: 'ORBIT', company: 'NOVA' }));
  t.eq(soloPosts.filter(x => !!x && !GROUPISH.test(x) && !noisy(x)).length, 4, 'the four posts about a soloist’s service say nothing of kings, boy groups or the boys');
  t.ok(/kings/.test(grpPosts[0]) && /boy group/.test(grpPosts[1]) && /ARE BACK/.test(grpPosts[2]) && /boys are home/.test(grpPosts[3]), 'a group’s four posts are as they were');
}

// ---- the sentences that name another house's artist ---------------------------
{
  const f = fork(), L = KP.societyLines || {};
  const ours = f.s.people[f.g.members[0]] || f.p, friend = f.p, act = f.act, N = KP.displayName(friend);
  const G = groupOf(f.s), GN = KP.displayName(G.m);
  const stranger = Object.assign({}, act, { alumOf: 'ELSEWHERE' });
  t.eq(KP.ofAct(friend, act) + '|' + KP.ofAct(G.m, G.act) + '|' + KP.ofAct(friend, null), N + '|' + GN + ' of ' + G.act.name + '|' + N, 'a soloist is named alone; a group’s member is named with her act');
  t.eq(L.friendFile(f.s, friend, act), 'Made a real friend in a music-show waiting room: ' + N + ', who used to work out of this building.', 'a friendship with a soloist who was ours: her name once, and what she was to this building');
  t.eq(L.friendFile(f.s, friend, stranger) + '|' + L.friendFile(f.s, G.m, G.act), 'Made a real friend in a music-show waiting room: ' + N + '.|Made a real friend in a music-show waiting room: ' + GN + ' of ' + G.act.name + '.', 'a soloist who was never ours is a name; a group’s member reads as she did');
  const fl = L.friendLetter(f.s, ours, friend, act), fls = L.friendLetter(f.s, ours, friend, stranger), flg = L.friendLetter(f.s, ours, G.m, G.act);
  t.ok(fl.includes(' and ' + N + ', who was ' + CO + '’s once, left the building laughing') && !fl.includes('(' + N + ')'), 'the letter does not put her own name in brackets after her name');
  t.ok(fls.includes(' and ' + N + ' left the building laughing') && flg.includes(' and ' + GN + ' (' + G.act.name + ') left the building laughing'), 'a stranger soloist has no brackets either; a group’s member keeps hers');
  const tr = L.truck(f.s, ours, friend, act), trg = L.truck(f.s, ours, G.m, G.act), tr0 = L.truck(f.s, ours, friend, null);
  t.ok(tr.includes(', sent by ' + N + '. The staff') && tr0.includes(', sent by ' + N + '. The staff') && trg.includes(', sent by ' + GN + ' of ' + G.act.name + '. The staff'), 'the coffee truck is from her, not from “her of her”');
  t.eq(L.stanFile(f.s, friend, ours, act) + '|' + L.stanFile(f.s, G.m, ours, G.act), N + ' named her a favorite rookie, in public.|' + GN + ' of ' + G.act.name + ' named her a favorite rookie, in public.', 'the senior who names a rookie is named once');
  t.ok(L.stanLetter(f.s, friend, ours, act).startsWith(N + ' — a name this industry answers to') && L.stanLetter(f.s, G.m, ours, G.act).startsWith(GN + ' of ' + G.act.name + ' — a name this industry answers to'), 'in the letter too');
  t.eq([fl, fls, flg, tr, trg, tr0, L.stanLetter(f.s, friend, ours, act)].filter(noisy).length, 0, 'and none of them leaks a token');
  // the rail writes these and nothing else
  const soc = src('society.js');
  t.eq(['friendFile', 'friendLetter', 'truck', 'stanFile', 'stanLetter'].filter(k => soc.split('KP.societyLines.' + k + '(').length === 2).length, 5, 'the week’s rail writes each of the five through the one read');
  t.ok(!/' of ' \+ act\.name/.test(soc.split('// ---- the weekly phase')[1] || 'x of act.name') && !/\(' \+ act\.name \+ '\)/.test(soc.split('// ---- the weekly phase')[1] || "(' + act.name + ')"), 'and no longer builds “Name of ACT” on its own');
}

// ---- the story, the first trophy, the hit ---------------------------------------
{
  const f = fork(), N = f.act.name, G = groupOf(f.s);
  t.eq(KP.rivalStoryLine(f.act, 'an old post resurfacing', f.r.short), 'The industry’s week: a story about ' + N + ' is moving — an old post resurfacing. ' + f.r.short + '’s response desk is doing what response desks do, and every other label is quietly re-reading its own files.', 'a story about a soloist is about her (it said “a ' + N + ' member”)');
  t.ok(KP.rivalStoryLine(G.act, 'x', 'CO').includes('a story about a ' + G.act.name + ' member is moving'), 'a story about a group is about one of its members');
  let hers = 0, his = 0, theirs = 0; const lines = new Set();
  for (let w = 1; w <= 40; w++) {
    f.s.week = w;
    const a = KP.rivalFirstWinLine(f.s, f.act, f.r.short, 'the Friday show');
    lines.add(a.replace(N, ''));
    if (/ — her first as a soloist\. /.test(a) && !/their first/.test(a)) hers++;
    if (/ — his first as a soloist\. /.test(KP.rivalFirstWinLine(f.s, Object.assign({}, f.act, { gender: 'm' }), f.r.short, 'the Friday show'))) his++;
    if (/ — their first\. /.test(KP.rivalFirstWinLine(f.s, G.act, 'CO', 'the Friday show'))) theirs++;
  }
  t.eq([hers, his, theirs, lines.size].join('|'), '40|40|40|4', 'a soloist’s first trophy is hers, or his, in all four tellings; a group’s is theirs');
  const hs = KP.rivalHitPosts({ solo: true, actName: N, company: f.r.short, actGender: 'f' }), hg = KP.rivalHitPosts({ actName: 'ORBIT', company: 'CO', actGender: 'f' }), hb = KP.rivalHitPosts({ actName: 'TIDE', company: 'CO', actGender: 'm' });
  t.eq(hs.length + '|' + hg.length + '|' + hb.length, '2|2|2', 'the timeline has two lines for a hit either way: the pick is the one draw it always was');
  t.ok(hs[0].includes('a win for soloists is a win for soloists') && hg[0].includes('a win for girl groups is a win for girl groups') && hb[0].includes('a win for boy groups is a win for boy groups'), 'a soloist’s hit is a win for soloists');
  // the note the rail writes says whose hit it is: every rival record this week is "hot" (the bar forced to the floor)
  const h = fork();
  h.act.lastReleaseWeek = h.s.week + 1 - h.act.cycleWeeks;        // forced: her record lands this week
  const wire = forced(I, 'comebackNoteMin', 0, () => tick(h.s));
  const mine = firstOf(wire.filter(x => x.ind === 'rivalHit' && x.actName === h.act.name));
  const other = wire.filter(x => x.ind === 'rivalHit' && x.actName !== h.act.name);
  t.ok(mine.solo === true && other.every(x => x.solo === false), 'the hit’s letter carries whether the act is a soloist (' + other.length + ' group hits the same week say it is not)');
  t.ok(src('shows.js').split('text: KP.rivalFirstWinLine(state, act, winner.rival.short, label)').length === 2 && src('scandal.js').split('text: KP.rivalStoryLine(act, shape, r.short)').length === 2 && src('industry.js').split('posts.push(rng.pick(KP.rivalHitPosts(n)))').length === 2, 'the three rails write their sentence through the read');
}

// ---- the screens: the act's page, the alumni list, her file --------------------
{
  const dom = require('./dom_stub');
  const D = dom.load();
  const text = html => dom.stripTags(String(html || '')).replace(/\s+/g, ' ');
  const live = fork(), ended = endBy('cold', true).f;
  const sl = D.KP.deserialize(KP.serialize(live.s)), se = D.KP.deserialize(KP.serialize(ended.s));
  const pageLive = text(D.UI.renderRivalAct(sl, live.act.id)), pageEnded = text(D.UI.renderRivalAct(se, ended.act.id));
  const G = groupOf(live.s), pageGroup = text(D.UI.renderRivalAct(sl, G.act.id));
  t.ok(/The artist/.test(pageLive) && !/Members/.test(pageLive) && /was ours/.test(pageLive), 'a soloist’s page heads her strip “The artist”, not “Members”');
  t.ok(/solo run ended/.test(pageEnded) && !/disbanded/.test(pageEnded), 'once her run is over the page says so (it said “disbanded”)');
  const N0 = KP.displayName(ended.p);
  t.ok(pageLive.includes('She records for ' + live.r.short + ' now, on the same chart we release against.'), 'while she is there the file room says she records for them now');
  t.ok(pageEnded.includes(N0 + ' was ours until ') && pageEnded.includes('She recorded for ' + ended.r.short + ' until ' + when(ended.s.week) + '. Her file is still open on the Talent tab') && !/records for .* now/.test(pageEnded), 'once it is over the note is in the past tense, with the date (it went on saying “records for them now”)');
  t.ok(/Members/.test(pageGroup) && !/The artist/.test(pageGroup), 'a group’s page still lists its members');
  G.act.retired = true;
  t.ok(/disbanded/.test(text(D.UI.renderRivalAct(D.KP.deserialize(KP.serialize(live.s)), G.act.id))), 'and a group that is gone is still disbanded');
  G.act.retired = false;
  t.ok(/no longer on the desk/.test(text(D.UI.renderRivalAct(sl, 'ra-none'))) && !/That group/.test(text(D.UI.renderRivalAct(sl, 'ra-none'))), 'an act that is off the files is “that act”');
  // the alumni list on the Talent tab, and her file
  D.App.state = se;
  const roster = text(D.UI.renderAlumni ? D.UI.renderAlumni(se) : (D.UI.renderTalent ? D.UI.renderTalent(se) : ''));
  const want = 'Home since ' + when(ended.s.week) + ', after a solo run at ' + ended.r.short;
  t.ok(roster.includes(want), 'the alumni list reads “' + want + '”');
  const NAME = KP.displayName(ended.p);
  t.ok(!roster.includes(NAME.charAt(0).toLowerCase() + NAME.slice(1)), 'and her name is not lowercased anywhere on it');
}

t.finish();
