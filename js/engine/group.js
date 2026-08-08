/* Group formation. The player proposes; the executive reviews.
   The best five individuals are not automatically the best group. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  KP.suggestGroupNames = function (state, rng) {
    const P = KP.DATA.groupNameParts;
    const names = [];
    while (names.length < 3) {
      const n = rng.chance(0.5)
        ? rng.pick(P.pre) + rng.pick(P.post)
        : rng.pick(P.whole);
      if (!names.includes(n)) names.push(n);
    }
    return names;
  };

  // Validate + form the group. roles: {leader, center, mainVocal, mainDancer, mainRapper}
  KP.proposeGroup = function (state, name, memberIds, roles) {
    const G = KP.C.GROUP;
    if (state.group) return { ok: false, reason: 'A group is already in development.' };
    if (memberIds.length < state.objective.minMembers || memberIds.length > state.objective.maxMembers) {
      return { ok: false, reason: 'The directive calls for ' + state.objective.minMembers + '–' + state.objective.maxMembers + ' members.' };
    }
    const members = memberIds.map(id => state.people[id]);
    if (members.some(m => !m || m.status !== 'trainee')) return { ok: false, reason: 'Every member must be a signed trainee.' };
    for (const role of ['leader', 'center']) {
      if (!roles[role] || !memberIds.includes(roles[role])) {
        return { ok: false, reason: 'Assign a ' + role + ' from the lineup.' };
      }
    }
    ['mainVocal', 'mainDancer', 'mainRapper'].forEach(r => {
      if (roles[r] && !memberIds.includes(roles[r])) delete roles[r];
    });

    state.group = {
      name,
      members: memberIds.slice(),
      roles: Object.assign({}, roles),
      formedWeek: state.week,
      centerHistory: [{ week: state.week, id: roles.center }],
      debuted: false,
      prep: null,          // set by the studio when a debut is scheduled
      results: null,
    };
    members.forEach(m => {
      m.history.push({ week: state.week, text: 'Selected for the debut lineup of ' + name + '.' });
    });
    // maknae is a fact, not a role
    const youngest = members.slice().sort((a, b) => a.age - b.age)[0];
    state.group.maknae = youngest.id;
    return { ok: true, review: KP.execReviewLineup(state, members, roles) };
  };

  // The executive reacts to the proposal in words. Approval is granted —
  // the player has the authority — but the reaction is remembered.
  KP.execReviewLineup = function (state, members, roles) {
    const lines = [];
    const chem = KP.groupChemistry(state, members);
    const center = state.people[roles.center];
    const centerPull = KP.derived(center).centerPull;
    const leader = state.people[roles.leader];
    const avgAge = members.reduce((s, m) => s + m.age, 0) / members.length;

    if (centerPull >= 62) lines.push('“The center choice, I understand. Even I keep watching her.”');
    else if (centerPull <= 42) lines.push('“Your center. Explain to me later why the public will agree with you.”');
    if (leader.personality.leadership >= 62) lines.push('“The leader can carry a room. Good.”');
    else lines.push('“You have named a leader the room has not.”');
    if (chem <= 40) lines.push('“Staff tell me these members barely speak. Fix that before the cameras find it.”');
    if (avgAge >= 21) lines.push('“An older lineup. They had better be ready faster, then.”');
    if (!lines.length) lines.push('“Proceed. Make me look right.”');
    return lines;
  };

  // Perceived role suggestions for the builder UI — through the scout's eyes.
  KP.roleHints = function (state, members) {
    const scout = KP.DATA.evaluators[2];
    function bestBy(fn) {
      return members.slice().sort((a, b) => fn(b) - fn(a))[0];
    }
    return {
      mainVocal: bestBy(m => KP.perceived(state, m, 'vocals', KP.DATA.evaluators[0])).id,
      mainDancer: bestBy(m => KP.perceived(state, m, 'dance', KP.DATA.evaluators[1])).id,
      mainRapper: bestBy(m => KP.perceived(state, m, 'rap', KP.DATA.evaluators[0])).id,
      center: bestBy(m => KP.perceived(state, m, 'charisma', scout) + KP.perceived(state, m, 'visuals', scout) * 0.6).id,
      leader: bestBy(m => KP.derived(m).leadership).id,
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
