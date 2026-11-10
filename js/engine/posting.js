/* The posting (v0.11.17, §108; §96 recommendation 5, the trainee years,
   part four). The survey: "The list on the wall, the most repeated
   ceremony of a career, is a modal of the exec's sentences with no letter
   for the room and no door for the ace left off."

   What a lineup did to the room was already in the engine (group.js): the
   ones on it have a line on their files, the one locked into the project
   and left out is docked, and the month's first left off is docked and has
   it on her ledger. None of it was told, and none of it could be seen
   before the list went up.

   · KP.postingRead — who the room will look for and not find. Pure: the
     builder shows it before the list is posted, the letter says it after.
   · the letter — one critical letter for the room, by the desk's own hand
     (a player action: KP.note, never the week's trim).
   · the year's first (v0.11.16) left off is a slight too, and was not one.
   · the door — the one the list slighted most comes to the desk, through
     the one queue, once. Three answers and a silence.

   Nothing is drawn. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.postingLedger = state.postingLedger ||
      { posted: 0, offMonth: 0, offYear: 0, dropped: 0, knocks: 0, why: 0, next: 0, nothing: 0, unanswered: 0 };
    return state.postingLedger;
  }
  KP.postingLedger = ledger;

  const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const num = n => (n >= 0 && n < NUM.length ? NUM[n] : String(n));
  const listAnd = xs => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]);
  const nm = p => KP.displayName(p);

  // ---- the read: who the room will look for and not find -------------------
  // The floor is every free trainee. The month's first is the board's; the
  // year's first is the last sheet on the wall, if she is still on the floor.
  // Works before the list is posted and after (a member is never "off").
  KP.postingRead = function (state, memberIds) {
    const on = (memberIds || []).map(id => state.people[id]).filter(Boolean);
    const onSet = new Set(on.map(p => p.id));
    const off = (state.roster || []).map(id => state.people[id])
      .filter(p => p && p.status === 'trainee' && !onSet.has(p.id) && !KP.groupOf(state, p.id));
    const monthTop = off.find(p => p.id === state.lastEvalTopId) || null;
    const wall = (state.evalYears || []).slice(-1)[0] || null;
    const yearTop = wall ? off.find(p => p.id === wall.topId) || null : null;
    const dropped = state.project ? (state.project.locked || []).map(id => state.people[id]).filter(p => p && !onSet.has(p.id)) : [];
    const named = new Set([monthTop, yearTop].concat(dropped).filter(Boolean).map(p => p.id));
    // who waited longest for a list with her name on it
    const waited = on.slice().sort((a, b) => (a.signedWeek == null ? 1e9 : a.signedWeek) - (b.signedWeek == null ? 1e9 : b.signedWeek))[0] || null;
    const waitedWeeks = waited && waited.signedWeek != null ? state.week - waited.signedWeek : 0;
    return { on, off, monthTop, yearTop, year: yearTop ? wall.year : null, dropped,
      slighted: monthTop || yearTop || null,
      others: off.filter(p => !named.has(p.id)).length,
      waited: waitedWeeks >= KP.C.POSTING.waitedWeeks ? waited : null, waitedYears: Math.floor(waitedWeeks / KP.C.WEEKS_PER_YEAR) };
  };
  // the same read, in the lines the builder shows before the list goes up
  KP.postingLines = function (state, memberIds) {
    const r = KP.postingRead(state, memberIds), out = [];
    if (r.monthTop && r.monthTop === r.yearTop) out.push(nm(r.monthTop) + ' is first on this month’s sheet and was first on the Y' + r.year + ' sheet, and is not on this list.');
    else {
      if (r.monthTop) out.push(nm(r.monthTop) + ' is first on this month’s sheet and is not on this list.');
      if (r.yearTop) out.push(nm(r.yearTop) + ' was first on the Y' + r.year + ' sheet and is not on this list.');
    }
    const dr = r.dropped.filter(p => p !== r.monthTop && p !== r.yearTop);
    if (dr.length) out.push(listAnd(dr.map(nm)) + (dr.length === 1 ? ' is' : ' are') + ' locked into the project and not on this list.');
    if (r.slighted) out.push('The room will read all of that in the same second. ' + nm(r.slighted) + ' will come to the desk about it.');
    return out;
  };

  // ---- the letter ---------------------------------------------------------------
  const CLOSERS = [
    'A list is the one thing in this building that everyone reads in the same second.',
    'Nobody said anything for about a minute, which in a practice room is a long time.',
    'By seven the door was just a door again, and the room had rearranged itself around what was on it.',
  ];
  KP.postingText = function (state, group, read) {
    const role = p => (group.roles.leader === p.id && group.roles.center === p.id) ? ' (leader and center)'
      : group.roles.leader === p.id ? ' (leader)' : group.roles.center === p.id ? ' (center)' : '';
    const solo = read.on.length === 1;
    const head = solo
      ? 'The notice went up on the practice room door at six: ' + nm(read.on[0]) + ' debuts alone. '
      : 'The list went up on the practice room door at six. ' + group.name + ': ' + listAnd(read.on.map(p => nm(p) + role(p))) + '. ';
    const w = read.waited;
    const waited = w ? KP.fillPro(nm(w) + ' has been in this building ' + num(read.waitedYears) + (read.waitedYears === 1 ? ' year' : ' years') +
      ', and this is the first list with {pos} name on it. ', w) : '';
    const both = read.monthTop && read.monthTop === read.yearTop;
    const off = (both ? nm(read.monthTop) + ' is first on this month’s sheet and was first on the Y' + read.year + ' sheet, and is not on it. '
      : (read.monthTop ? nm(read.monthTop) + ', first on this month’s sheet, is not on it. ' : '') +
        (read.yearTop ? nm(read.yearTop) + ', first on the Y' + read.year + ' sheet, is not on it' + (read.monthTop ? ' either' : '') + '. ' : ''));
    const dr = read.dropped.filter(p => p !== read.monthTop && p !== read.yearTop);
    const dropped = dr.length ? listAnd(dr.map(nm)) + (dr.length === 1 ? ' was' : ' were') + ' locked into the project and ' +
      (dr.length === 1 ? 'is' : 'are') + ' not on the final list. ' : '';
    const named = !!(off || dropped);
    const rest = !read.off.length ? 'Everybody on the floor is on it. '
      : read.others ? (named ? (read.others === 1 ? 'One other trainee' : num(read.others).replace(/^./, c => c.toUpperCase()) + ' other trainees')
          : (read.others === 1 ? 'The one trainee who is not on it' : 'The ' + num(read.others) + ' who are not on it')) + ' read it twice and went back to practice. '
      : '';
    return head + waited + off + dropped + rest + KP.lineFor(state, 'posting|' + group.id, CLOSERS);
  };

  // ---- what the list does, beyond what group.js already did --------------------
  // Called by KP.proposeGroup after its own docks (the dropped, the month's
  // first). The year's first left off was no slight at all; it is one now.
  KP.postingAfter = function (state, group, read) {
    const P = KP.C.POSTING, led = ledger(state);
    led.posted++;
    if (read.monthTop) led.offMonth++;
    led.dropped += read.dropped.length;
    const y = read.yearTop;
    if (y) {
      led.offYear++;
      if (y === read.monthTop) {
        // the month's dock already landed; the year makes it a little worse
        y.morale = KP.clamp(y.morale - P.bothExtraMorale, 0, 100);
        y.history.push({ week: state.week, text: 'The Y' + read.year + ' sheet had ' + KP.pro(y).her + ' first as well. The list is the third piece of paper, and the only one with a debut on it.' });
      } else {
        y.morale = KP.clamp(y.morale - P.yearOffMorale, 0, 100);
        KP.recordDirected(state, y.id, 'passedOver');
        y.history.push({ week: state.week, text: 'First on the Y' + read.year + ' sheet when the ' + group.name + ' lineup was posted, and not on it.' });
      }
    }
    // the one the list slighted most will come to the desk about it
    const s = read.slighted;
    if (s) s.flags.offList = { week: state.week, groupId: group.id, group: group.name, month: s === read.monthTop, year: s === read.yearTop ? read.year : null };
    return KP.note(state, { kind: 'company', ind: 'lineupPosted', priority: 'critical', groupId: group.id,
      personId: s ? s.id : null, text: KP.postingText(state, group, read) });
  };

  // ---- the door: once, through the one queue ------------------------------------
  // A priority candidate (an event, not a roll) for doorWeeks after the list.
  // She is not asking to be put on it.
  KP.registerKnock('posting', ['offTheList'], function (state) {
    const P = KP.C.POSTING, out = [];
    (state.roster || []).forEach(id => {
      const p = state.people[id];
      const f = p && p.flags ? p.flags.offList : null;
      if (!f || p.status !== 'trainee' || KP.groupOf(state, p.id) || KP.onBreak(p)) return;
      if (state.week - f.week > P.doorWeeks) return;
      out.push({ kind: 'offTheList', personId: p.id, priority: 1, weight: 5, expiresIn: P.doorExpire,
        onPick: st => { ledger(st).knocks++; } });
    });
    return out;
  });
  const hasPromise = (state, p) => (state.claims || []).some(c => !c.resolved && c.type === 'debutByPromise' && c.personId === p.id);
  const was = f => f.month && f.year ? 'first on the sheet this month and first on the Y' + f.year + ' sheet'
    : f.month ? 'first on the sheet this month' : 'first on the Y' + f.year + ' sheet';
  KP.registerScene('offTheList', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? nm(p) : 'A trainee') + ' · the list';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      const f = p && p.flags ? p.flags.offList : null;
      if (!p || !f) return 'The list has been on the door long enough that nobody reads it now.';
      return KP.fillPro(nm(p) + ' is in the doorway and does not sit down. {She} was ' + was(f) + ', and the ' + f.group +
        ' list went up without {her}. “I read it twice to be sure. I am not asking to be on it. I am asking what the sheet is for.” ' +
        'Tell {her} why, and {she} leaves with a reason. Promise {her} the next lineup, and it is on the record until it is kept or broken. ' +
        'Or the list is the list.', p);
    },
    options: (state, sc) => {
      const p = state.people[sc.personId];
      return [
        { id: 'why', label: p ? KP.fillPro('Tell {her} why', p) : 'Tell her why' },
        // (worded past 24 characters on purpose: three short answers are laid three
        // to a row, and in a real browser this one wrapped to three lines)
        p && !hasPromise(state, p) ? { id: 'next', label: KP.fillPro('Promise {her} the next lineup', p) } : null,
        { id: 'nothing', label: 'The list is the list' },
      ].filter(Boolean);
    },
    resolve: (state, sc, optionId) => {
      const P = KP.C.POSTING, led = ledger(state);
      const p = state.people[sc.personId];
      const f = p && p.flags ? p.flags.offList : null;
      if (!p || !f || p.status !== 'trainee') return { toast: 'The list has been on the door long enough that nobody reads it now.' };
      delete p.flags.offList;
      if (optionId === 'next' && !hasPromise(state, p)) {
        led.next++;
        p.morale = KP.clamp(p.morale + P.promiseMorale, 0, 100);
        p.history.push({ week: state.week, text: 'Asked what the sheet is for, the week the ' + f.group + ' list went up without ' + KP.pro(p).her + '. Was promised the next lineup, on the record.' });
        // "the next one" is the one after this: the list just posted debuts without her by design
        KP.openClaim(state, { type: 'debutByPromise', subject: { kind: 'idol', id: p.id }, personId: p.id,
          byWeek: state.week + P.promiseWeeks, exceptGroupId: f.groupId,
          label: 'The next debut lineup after ' + f.group + ' includes ' + nm(p) });
        return { toast: KP.fillPro('{She} nodded once. “The next one.” {She} said it like a date.', p) };
      }
      if (optionId === 'nothing') {
        led.nothing++;
        p.morale = KP.clamp(p.morale - P.nothingMorale, 0, 100);
        p.history.push({ week: state.week, text: 'Asked what the sheet is for, the week the ' + f.group + ' list went up without ' + KP.pro(p).her + ', and was told the list is the list.' });
        return { toast: KP.fillPro('{She} said “understood,” which is not the same as understanding, and went back downstairs.', p) };
      }
      led.why++;
      p.morale = KP.clamp(p.morale + P.whyMorale, 0, 100);
      KP.recordDirected(state, p.id, 'toldStraight');
      p.history.push({ week: state.week, text: 'Asked what the sheet is for, the week the ' + f.group + ' list went up without ' + KP.pro(p).her + ', and was told why: what the group needed, and that it was not a verdict on ' + KP.pro(p).her + '.' });
      return { toast: KP.fillPro('{She} listened to all of it. “That is a reason,” {she} said. “I did not think there was one.”', p) };
    },
    // she knocked, and nobody answered: that is on her ledger, as for anyone
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      const f = p && p.flags ? p.flags.offList : null;
      if (!p || !f) return null;
      delete p.flags.offList;
      ledger(state).unanswered++;
      KP.recordDirected(state, p.id, 'leftWaiting');
      p.history.push({ week: state.week, text: 'Came to the desk about the ' + f.group + ' list and was left standing in the doorway.' });
      return null;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
