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
      { name: 'CEO Yoon Da-jung', personality: 'visionary',
        intro: '“I don’t need five perfect trainees. I need one group people remember.”' },
      { name: 'CEO Kang Min-ho', personality: 'profitHunter',
        intro: '“Six years without a hit girl group. The board counts in quarters, not eras.”' },
      { name: 'CEO Seo Hae-won', personality: 'traditionalist',
        intro: '“We are known for vocals. Build me a group that can actually sing — then make them famous.”' },
    ],
  };
})(typeof window !== 'undefined' ? window : globalThis);
