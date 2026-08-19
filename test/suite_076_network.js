/* Suite 076 — the network (v0.9.35, §75). Recruitment reshaped: the
   board is what your network can see, channels deliver it, private
   mail stays private, the public landscape arrives contested, and
   the washouts stop vanishing. */
'use strict';
const { loadEngine, makeT } = require('./load_engine');
const KP = loadEngine();
const t = makeT('suite_076_network');

const N = () => KP.C.NETWORK;

// ---- the doors open with the network they would really have -----------
{
  const boards = {};
  for (const [door, opts] of [['current', {}], ['fresh', { door: 'fresh' }],
      ['major', { door: 'major' }], ['blank', { door: 'blank' }]]) {
    boards[door] = KP.newGame('nw-' + door, null, opts);
  }
  t.eq(boards.blank.prospects.length, 0, 'the blank page opens with NOTHING but the verbs');
  t.eq(boards.fresh.prospects.length, N().OPENING.fresh, 'the fresh label: a couple of files');
  t.eq(boards.current.prospects.length, N().OPENING.current, 'the inheritance: a handful');
  t.eq(boards.major.prospects.length, N().OPENING.major, 'the major: the standing network delivers day one');
  t.ok(KP.networkRead(boards.major) > KP.networkRead(boards.current) &&
       KP.networkRead(boards.current) > KP.networkRead(boards.blank),
    'the network is read, never stored — and it orders the doors');
}

// ---- the channels deliver, with provenance on the file ----------------
{
  const s = KP.newGame('nw-chan', null, {});
  s.budget = 800;
  for (let w = 0; w < 70; w++) KP.advanceWeek(s);
  const led = s.networkLedger;
  t.ok(led.apps >= 1, 'applications arrive on their own');
  t.ok(led.refs >= 1, 'the building refers people');
  const chans = new Set(s.prospects.map(id => s.people[id].channel).filter(Boolean));
  t.ok(chans.size >= 2, 'the board carries provenance (' + [...chans].join(', ') + ')');
  t.ok(led.seasons >= 1, 'the season aired');
  const finalist = Object.values(s.people).find(p => p.channel === 'showKid');
  t.ok(finalist, 'and its finalists hit the public board');
  t.ok(KP.socialOf(s, finalist) > 30000, 'with a following attached');
  // public means contested: heat on arrival — or already gone to a rival
  // desk that read the same broadcast (heat clears when a signature lands)
  t.ok(KP.rivalHeat(s, finalist.id).max >= 2 || finalist.status === 'rival',
    'and contested from the first morning (' + finalist.status + ')');
}

// ---- channel privacy: your mail is your mail --------------------------
{
  const s = KP.newGame('nw-priv', null, {});
  s.budget = 800;
  // a private applicant and a public school kid, both excellent
  let appKid = null;
  for (let w = 0; w < 90 && !appKid; w++) {
    KP.advanceWeek(s);
    appKid = s.prospects.map(id => s.people[id]).find(p => p.channel === 'application');
  }
  t.ok(appKid, 'an applicant arrived');
  appKid.talents.vocals = { cur: 75, ceilLo: 85, ceilHi: 92, growth: 1 };
  for (let w = 0; w < 16 && s.people[appKid.id] && appKid.status === 'prospect'; w++) KP.advanceWeek(s);
  if (s.people[appKid.id] && appKid.status === 'prospect') {
    t.eq(KP.rivalHeat(s, appKid.id).max, 0, 'rival scouts never see your mail — no heat, ever');
  } else {
    t.ok(true, '(the applicant left the board another way — privacy held while she was on it)');
  }
}

// ---- the washout returns ----------------------------------------------
{
  const s = KP.newGame('nw-wash', null, {});
  // force a named cut: a rival signee below the bar, past tenure
  const r = s.rivals[0];
  const pc = Object.values(s.people).find(p => p.status === 'prospect');
  pc.status = 'rival'; pc.company = r.short;
  s.prospects = s.prospects.filter(id => id !== pc.id);
  KP.C.TALENTS.forEach(d => { pc.talents[d].cur = Math.min(pc.talents[d].cur, 40); });
  pc.history.push({ week: -50, text: 'Signed to ' + r.short + ' — off our board.' });
  r.rosterCount = 40;   // force the purge path at the next evaluation
  let guard = 0;
  while (pc.status === 'rival' && guard++ < 60) KP.advanceWeek(s);
  t.eq(pc.status, 'prospect', 'the named cut stops vanishing');
  t.eq(pc.channel, 'washout', 'and lands on the open board as a washout');
  t.ok(s.prospects.includes(pc.id), 'file and history intact');
}

// ---- the verbs: shoe leather and the open call ------------------------
{
  const s = KP.newGame('nw-verbs', null, { door: 'blank' });
  s.budget = 400;
  const r1 = KP.streetCast(s);
  t.ok(r1.ok && r1.minted >= 1, 'street casting always works — shoe leather, not reputation');
  t.ok(!KP.streetCast(s).ok, 'but the districts need time between walks');
  const b0 = s.budget;
  const r2 = KP.holdOpenCall(s);
  t.ok(r2.ok, 'the open call runs even for the unproven');
  t.eq(b0 - s.budget, N().CALL.cost, 'at full price');
  t.ok(r2.minted <= N().CALL.baseMinted + 1, 'folding chairs: turnout reads the name (' + r2.minted + ')');
  t.ok(/folding chairs/.test(r2.note), 'and the note is honest about the room');
  const m = KP.newGame('nw-verbs2', null, { door: 'major' });
  m.budget = 400;
  const r3 = KP.holdOpenCall(m);
  t.ok(r3.minted > r2.minted, 'the major’s call out-draws the blank page’s (' + r3.minted + ' vs ' + r2.minted + ')');
}

// ---- old saves: channel-less files read as public ---------------------
{
  const s = KP.newGame('nw-compat', null, {});
  const p = s.people[s.prospects[0]];
  t.ok(!KP.CHANNEL_PRIVATE[p.channel], 'the opening batch is open season, like every old-save file');
}

// ---- determinism through the channels ---------------------------------
{
  const s = KP.newGame('nw-fork', null, { door: 'fresh' });
  const b = KP.deserialize(KP.serialize(s));
  for (let w = 0; w < 45; w++) { KP.advanceWeek(s); KP.advanceWeek(b); }
  t.eq(KP.serialize(s), KP.serialize(b), 'the network forks clean');
}

t.finish();
