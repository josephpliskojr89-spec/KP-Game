/* Content tables: names, companies, evaluators, song fragments, group names.
   All generated flavor lives here, never hardcoded in components. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  KP.DATA = {
    familyNames: [
      'Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim',
      'Han', 'Oh', 'Seo', 'Shin', 'Kwon', 'Hwang', 'Ahn', 'Song', 'Yoo', 'Hong',
      'Moon', 'Yang', 'Bae', 'Baek', 'Heo', 'Nam', 'Noh', 'Ha', 'Jeon', 'Min',
    ],
    // given names, song titles, group names, producers and headlines are
    // GENERATED as of v0.3.0 — see js/engine/gen.js
    stageNames: [
      'Aria', 'Bit', 'Dawn', 'Elle', 'Haze', 'Ivy', 'June', 'Kai', 'Lume',
      'Mars', 'Nova', 'Onyx', 'Prism', 'Rae', 'Sol', 'Vera', 'Wren', 'Yuri', 'Zia',
    ],
    // the boys' register (v0.8.4) — shares the unisex middle with the list above
    stageNamesM: [
      'Ace', 'Bex', 'Cade', 'Dae', 'Eon', 'Flint', 'Gray', 'Haan', 'Jett', 'Kai',
      'Knox', 'Leo', 'Mars', 'Nine', 'Onyx', 'Rook', 'Sol', 'Vann', 'Wolf', 'Zeph',
    ],
    // Evaluator staff: id, name, role, voice, favored domain, accuracy (read width mult)
    evaluators: [
      { id: 'ev_vocal', name: 'Coach Baek', role: 'Head Vocal Coach', bias: 'vocals', accuracy: 0.85,
        voice: 'precise' },
      { id: 'ev_perf', name: 'Director Cha', role: 'Performance Director', bias: 'dance', accuracy: 0.9,
        voice: 'blunt' },
      { id: 'ev_scout', name: 'Scout Im', role: 'Senior Scout', bias: 'charisma', accuracy: 1.1,
        voice: 'instinct' },
    ],
    rivalCompanies: [
      { name: 'Novaline Entertainment', short: 'Novaline', philosophy: 'trendChaser',
        blurb: 'Fast, loud, and first to every trend — sometimes the wrong one.' },
      { name: 'Aurum Media', short: 'Aurum', philosophy: 'performance',
        blurb: 'Choreography cultists. Their trainees can dance before they can talk.' },
      { name: 'Whitecliff Company', short: 'Whitecliff', philosophy: 'patient',
        blurb: 'Signs young, waits years, rarely misses.' },
    ],
    playerCompany: {
      name: 'Hanseong Culture Group', short: 'HCG',
      reputationLine: 'Known for vocalists. No successful girl group launch in six years.',
    },
    executives: [
      { name: 'CEO Yoon Da-jung', gender: 'f', personality: 'visionary',
        intro: '“I don’t need five perfect trainees. I need one group people remember.”' },
      { name: 'CEO Kang Min-ho', gender: 'm', personality: 'profitHunter',
        intro: '“Six years without a hit girl group. The board counts in quarters, not eras.”' },
      { name: 'CEO Seo Hae-won', gender: 'f', personality: 'traditionalist',
        intro: '“We are known for vocals. Build me a group that can actually sing — then make them famous.”' },
      // the chairs widened for the succession era (v0.9.32) — executives
      // have eras now, and the next one should not be a rerun
      { name: 'CEO Baek Ji-soo', gender: 'f', personality: 'patient',
        intro: '“I have watched three companies chase quarters off a cliff. We will build slowly, and we will still be here.”' },
      { name: 'CEO Moon Sang-chul', gender: 'm', personality: 'trendChaser',
        intro: '“The market tells you what it wants every single week. My last building refused to listen. This one will.”' },
      { name: 'CEO Im Na-ri', gender: 'f', personality: 'micromanager',
        intro: '“I read every report. Every one. If that sounds like a threat, we are going to get along fine.”' },
    ],
  };
})(typeof window !== 'undefined' ? window : globalThis);
