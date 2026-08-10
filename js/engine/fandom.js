/* Fandom identity (v0.7.0) — §22: "Fandom name, colors/lightstick,
   size vs intensity, fanclub membership, spending power."
   Size is g.popularity — the number that already exists. INTENSITY is
   the new number: devotion, grown by fan-facing care (fan signs,
   livestreams, fan-service tours, sold-out rooms, shared trophies),
   cooling without it. An intense fandom mobilizes for music shows,
   buys records, and defends its group when storms come. Naming the
   fandom is a player decision — the fan cafés propose, you choose. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  const WORD_A = ['LUM', 'AURA', 'VELV', 'STELL', 'NOVA', 'ECHO', 'HALO', 'PRISM', 'SOL', 'MIRA'];
  const WORD_B = ['INE', 'ETTE', 'ORA', 'IES', 'EON', 'IA', 'ELLE', 'ANE'];
  const WHOLE = ['Firstlight', 'Blueprint', 'Homeroom', 'Sirens', 'Keepers', 'Orbit', 'Bloom', 'Anthem'];

  // three proposals, deterministic per group per world
  KP.fandomNameOptions = function (state, g) {
    const h = n => KP.hash01([state.seed, g.id, 'fandom', n].join('|'));
    const opts = [];
    opts.push(WORD_A[Math.floor(h(1) * WORD_A.length)] + WORD_B[Math.floor(h(2) * WORD_B.length)]);
    const gname = g.name.replace(/[^A-Za-z]/g, '').toUpperCase();
    opts.push((gname.slice(0, 4) || 'STAR') + ['Z', 'S', 'IES'][Math.floor(h(3) * 3)]);
    opts.push(WHOLE[Math.floor(h(4) * WHOLE.length)]);
    return opts.filter((o, i, a) => a.indexOf(o) === i);
  };
  KP.fandomColor = function (state, g) {
    const C = KP.C.FANDOM.COLORS;
    return C[Math.floor(KP.hash01([state.seed, g.id, 'color'].join('|')) * C.length)];
  };
  KP.fandomEligible = function (state, g) {
    return g.debuted && !g.fandom && (g.popularity || 0) >= KP.C.FANDOM.nameAt;
  };

  KP.nameFandom = function (state, groupId, choiceIdx) {
    const g = KP.groupById(state, groupId);
    if (!g) return { ok: false, reason: 'No such group.' };
    if (g.fandom) return { ok: false, reason: 'The fandom already has a name. Renaming one is how riots start.' };
    if (!KP.fandomEligible(state, g)) return { ok: false, reason: 'The fan cafés are not big enough to hold a vote yet.' };
    const opts = KP.fandomNameOptions(state, g);
    // choiceIdx 0..n-1 picks; anything else = "let the fans decide"
    const idx = (choiceIdx >= 0 && choiceIdx < opts.length)
      ? choiceIdx
      : Math.floor(KP.hash01([state.seed, g.id, 'fanvote'].join('|')) * opts.length);
    const name = opts[idx];
    const color = KP.fandomColor(state, g);
    g.fandom = { name, color, since: state.week, intensity: 20 };
    const note = KP.note(state, {
      kind: 'public', ind: 'fandomNamed', groupId: g.id, priority: 'high',
      text: 'It is official: ' + g.name + '’s fandom has a name — ' + name + ' — and a color: ' +
        color + '. The fan cafés ratified it ' + (choiceIdx >= 0 && choiceIdx < opts.length
          ? 'after the company backed the option.' : 'by open vote, which they will bring up forever.') +
        ' Lightstick mockups appeared within the hour. Membership means something now.',
    });
    return { ok: true, name, color, note };
  };

  // one door for every act of care — call sites feed devotion
  KP.fandomGain = function (g, amount) {
    if (g && g.fandom) g.fandom.intensity = KP.clamp(g.fandom.intensity + amount, 0, 100);
  };
  KP.fandomIntensity = function (g) {
    return (g && g.fandom) ? g.fandom.intensity : 0;
  };
  KP.intensityWord = function (v) {
    return v >= 75 ? 'devoted beyond reason' : v >= 50 ? 'organized and loud'
      : v >= 25 ? 'warm and present' : 'casual';
  };

  // weekly cooling — devotion is maintained, not owned
  KP.fandomWeek = function (state) {
    KP.groups(state).forEach(g => {
      if (g.fandom) g.fandom.intensity = Math.max(0, g.fandom.intensity - KP.C.FANDOM.intensityDecay);
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
