/* State-driven events: each has a predicate (why now), a weight, and a
   cooldown. Events emerge from who people are and what just happened —
   never free-floating popups. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  const EVENTS = [
    {
      id: 'execDeadlineNudge', cooldown: 8, weight: 1,
      when: (s) => !KP.groups(s).length && s.objective.status === 'open' &&
        (s.objective.deadlineWeek - s.week) <= 32 && (s.objective.deadlineWeek - s.week) > 12,
      fire: (s, rng) => ({ kind: 'executive', text: s.executive.name + ' stopped by. “' +
        Math.floor((s.objective.deadlineWeek - s.week) / KP.C.WEEKS_PER_MONTH) +
        ' months to the deadline and I have not seen a lineup. Should I be worried?”' }),
    },
    {
      id: 'execDeadlineUrgent', cooldown: 4, weight: 3,
      when: (s) => !KP.groups(s).length && s.objective.status === 'open' && (s.objective.deadlineWeek - s.week) <= 12,
      fire: (s) => ({ kind: 'executive', urgent: true, text: s.executive.name +
        ': “The board meets after the deadline. Either I present a debut, or I present an explanation. Choose which one you want to be.”' }),
    },
    {
      id: 'execCostlyTrainee', cooldown: 20, weight: 1,
      when: (s) => s.week > 20 && KP.freeTrainees(s).length > 5,
      fire: (s, rng) => {
        const pool = KP.freeTrainees(s).map(id => s.people[id]).filter(p => p.signedWeek == null);
        if (!pool.length) return null;
        const p = rng.pick(pool);
        return { kind: 'executive', text: KP.fillPro(s.executive.name + ' flagged ' + KP.displayName(p) +
          '’s file. “{She} has been a trainee longer than some employees. Use {her} or make room.”', p) };
      },
    },
    {
      id: 'prospectPressure', cooldown: 6, weight: 2,
      when: (s) => s.prospects.some(id => {
        const heat = KP.rivalHeat(s, id).max;
        return heat >= 2;
      }) && s.signingsUsed < s.signingsAllowed,
      fire: (s, rng) => {
        const hot = s.prospects.filter(id => KP.rivalHeat(s, id).max >= 2).map(id => s.people[id]);
        if (!hot.length) return null;
        const p = rng.pick(hot);
        return { kind: 'scouting', text: KP.fillPro(KP.displayName(p) + '’s coach called. Other agencies are asking about {pos} availability. If we want {her}, the window is now.', p) };
      },
    },
    {
      id: 'moraleWobble', cooldown: 10, weight: 1,
      when: (s) => s.roster.map(id => s.people[id]).some(p => p.morale < 35),
      fire: (s, rng) => {
        const low = s.roster.map(id => s.people[id]).filter(p => p.morale < 35);
        if (!low.length) return null;
        const p = rng.pick(low);
        return { kind: 'health', text: KP.fillPro(KP.displayName(p) + ' has been quiet lately. {Pos} roommates say {she} practices, eats, and says almost nothing. Worth a conversation.', p) };
      },
    },
    {
      id: 'privateLife', cooldown: 30, weight: 0.4,
      when: (s) => s.week > 16 && s.roster.length > 3,
      fire: (s, rng) => {
        const pool = s.roster.map(id => s.people[id]).filter(p => p.age >= 19 && !p.flags.privateNote);
        if (!pool.length) return null;
        const p = rng.pick(pool);
        p.flags.privateNote = true;
        p.morale = KP.clamp(p.morale + 4, 0, 100);
        return { kind: 'life', text: KP.fillPro('Managers believe ' + KP.displayName(p) + ' is seeing someone outside the company. It has not affected {pos} schedule. Unless it becomes a work matter, it is not our business.', p) };
      },
    },
    {
      id: 'preDebutViral', cooldown: 999, weight: 1,
      when: (s, rng) => !!KP.devGroup(s) && rng.chance(KP.C.EVENTS.viralChance * 4),
      fire: (s, rng) => {
        const members = KP.devGroup(s).members.map(id => s.people[id]);
        const star = members.slice().sort((a, b) => KP.derived(b).centerPull - KP.derived(a).centerPull)[0];
        star.mediaExp += 8;
        return { kind: 'public', text: 'A practice-room clip of ' + KP.displayName(star) + ' is circulating well beyond our usual audience. Pre-debut attention is a gift — and a deadline.' };
      },
    },
  ];

  KP.eventsWeek = function (state, rng) {
    state.eventCooldowns = state.eventCooldowns || {};
    const notes = [];
    const eligible = EVENTS.filter(e => {
      const last = state.eventCooldowns[e.id];
      if (last != null && state.week - last < e.cooldown) return false;
      try { return e.when(state, rng); } catch (err) { return false; }
    });
    if (!eligible.length) return notes;
    // fire at most one table event per week — the inbox stays readable
    const totalW = eligible.reduce((s, e) => s + e.weight, 0);
    let roll = rng.next() * Math.max(totalW, 2.5); // sometimes nothing fires
    for (const e of eligible) {
      roll -= e.weight;
      if (roll <= 0) {
        const note = e.fire(state, rng);
        if (note) {
          state.eventCooldowns[e.id] = state.week;
          notes.push(note);
        }
        break;
      }
    }
    return notes;
  };
})(typeof window !== 'undefined' ? window : globalThis);
