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
    givenNamesF: [
      'Ji-woo', 'Seo-yeon', 'Ha-eun', 'Min-seo', 'Yu-na', 'Chae-won', 'Da-eun',
      'So-min', 'Ye-jin', 'Su-bin', 'Na-yeon', 'Hye-jin', 'A-ra', 'Bo-ra',
      'Eun-bi', 'Ga-young', 'Hyo-jung', 'In-na', 'Joo-hee', 'Mi-rae', 'Sae-rom',
      'Se-ah', 'Yeon-woo', 'Da-hyun', 'Ji-min', 'Soo-ah', 'Hae-rin', 'Won-young',
      'Ji-yeon', 'Eun-chae', 'Ye-seo', 'Ro-woon', 'Si-eun', 'Yu-jin', 'Hyun-seo',
      'Do-yeon', 'Seul-gi', 'Mi-na', 'Ha-ni', 'Ye-rin', 'Kyung-mi', 'Ah-in',
    ],
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
    songTitleA: ['Neon', 'Midnight', 'Glass', 'Velvet', 'Paper', 'Electric', 'Hidden',
      'Silver', 'Wild', 'Cherry', 'Lunar', 'Static', 'Golden', 'Secret', 'Zero'],
    songTitleB: ['Heart', 'Run', 'Bloom', 'Signal', 'Mirror', 'Parade', 'Riot',
      'Orbit', 'Whisper', 'Fever', 'Diary', 'Arcade', 'Halo', 'Wave', 'Hour'],
    groupNameParts: {
      pre: ['LU', 'AE', 'VI', 'SO', 'MI', 'HA', 'NU', 'RE', 'KY', 'SE'],
      post: ['MINE', 'VELLE', 'RISE', 'CLAT', 'ONA', 'BLOOM', 'LUNE', 'PIA', 'NITE', 'VEA'],
      whole: ['Parallel', 'Daybreak', 'Off-Script', 'Clockwise', 'Featherweight',
        'Landline', 'Blue Hour', 'Marionette', 'First Snow', 'Vermilion'],
    },
    producers: ['Team Glasshouse', 'JUNO & The Kids', 'producer 8B', 'Studio Mireu', 'KX Collective'],
    headlines: [
      'Streaming platforms report record Q growth in girl-group listenership.',
      'Music show ratings tick upward as comeback season heats up.',
      'Industry insiders predict a crowded debut calendar this year.',
      'Veteran groups renew contracts, leaving fans relieved and rivals watching.',
      'A rookie group nobody predicted is quietly climbing the charts.',
    ],
  };
})(typeof window !== 'undefined' ? window : globalThis);
