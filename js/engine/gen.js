/* Content generators (v0.3.0) — the first phase of the procedural
   mandate: "every run should feel different." Names, song titles, group
   names, producers and headlines are built from grammars, not picked from
   short lists. Family names stay a real, small pool — that IS Korea. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  const GIVEN_A = ['Ji', 'Seo', 'Ha', 'Min', 'Yu', 'Chae', 'Da', 'So', 'Ye', 'Su',
    'Na', 'Hye', 'Bo', 'Eun', 'Ga', 'Hyo', 'In', 'Joo', 'Mi', 'Sae',
    'Se', 'Yeon', 'Do', 'Seul', 'Kyung', 'Ah', 'Ro', 'Si', 'Hyun', 'Won',
    'Ji', 'Ye', 'Soo', 'Hae', 'Ri', 'Ju', 'Byul', 'Chan', 'Deul', 'Go'];
  const GIVEN_B = ['woo', 'yeon', 'eun', 'seo', 'na', 'won', 'bin', 'min', 'jin',
    'young', 'hee', 'jung', 'ah', 'rin', 'sol', 'ram', 'kyung', 'hwa',
    'ji', 'mi', 'rae', 'in', 'a', 'young', 'byul', 'ha', 'yul', 'gyeong',
    'seul', 'som', 'wol', 'dam', 'ryeong', 'chae', 'hyang'];

  // A generated given name: "Ji-woo" shape, never twice in one world when
  // a used-set is provided (collisions retry, then yield to reality —
  // real buildings have two Ji-woos sometimes, after 20 tries).
  KP.genGivenName = function (rng, used) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const a = rng.pick(GIVEN_A), b = rng.pick(GIVEN_B);
      if (a.toLowerCase() === b.toLowerCase()) continue;   // no "Byul-byul"
      const name = a + '-' + b;
      if (!used || !used.has(name.toLowerCase())) {
        if (used) used.add(name.toLowerCase());
        return name;
      }
    }
    return rng.pick(GIVEN_A) + '-' + rng.pick(GIVEN_B);
  };

  const TITLE_ADJ = ['Neon', 'Midnight', 'Glass', 'Velvet', 'Paper', 'Electric',
    'Hidden', 'Silver', 'Wild', 'Cherry', 'Lunar', 'Static', 'Golden', 'Secret',
    'Zero', 'Crimson', 'Hollow', 'Sugar', 'Feral', 'Quiet', 'Plastic', 'Honest',
    'Borrowed', 'Peach', 'Cobalt', 'Last', 'First', 'Broken', 'Solar', 'Blue'];
  const TITLE_NOUN = ['Heart', 'Run', 'Bloom', 'Signal', 'Mirror', 'Parade',
    'Riot', 'Orbit', 'Whisper', 'Fever', 'Diary', 'Arcade', 'Halo', 'Wave',
    'Hour', 'Alibi', 'Costume', 'Anthem', 'Winter', 'Motel', 'Lipstick',
    'Thunder', 'Garden', 'Tempo', 'Karma', 'Voltage', 'Season', 'Satellite',
    'Confetti', 'Museum'];
  const TITLE_VERB = ['Chase', 'Break', 'Steal', 'Burn', 'Call', 'Keep',
    'Blame', 'Dare', 'Spin', 'Crash'];

  KP.genSongTitle = function (rng, used) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const roll = rng.next();
      let title;
      if (roll < 0.4) title = rng.pick(TITLE_ADJ) + ' ' + rng.pick(TITLE_NOUN);
      else if (roll < 0.55) title = rng.pick(TITLE_NOUN);
      else if (roll < 0.7) title = rng.pick(TITLE_VERB) + ' the ' + rng.pick(TITLE_NOUN);
      else if (roll < 0.82) title = rng.pick(TITLE_NOUN) + ' ' + rng.pick(TITLE_NOUN);
      else if (roll < 0.92) title = rng.pick(TITLE_ADJ) + ' ' + rng.pick(TITLE_ADJ) + ' ' + rng.pick(TITLE_NOUN);
      else title = rng.pick(TITLE_NOUN) + '!';
      if (!used || !used[title]) {
        if (used) used[title] = true;
        return title;
      }
    }
    return rng.pick(TITLE_ADJ) + ' ' + rng.pick(TITLE_NOUN) + ' ' + rng.int(2, 9);
  };

  const GN_PRE = ['LU', 'AE', 'VI', 'SO', 'MI', 'HA', 'NU', 'RE', 'KY', 'SE',
    'OD', 'YV', 'PA', 'EL', 'NO'];
  const GN_POST = ['MINE', 'VELLE', 'RISE', 'CLAT', 'ONA', 'BLOOM', 'LUNE',
    'PIA', 'NITE', 'VEA', 'RIET', 'DEA', 'QUE', 'SIA', 'MER'];
  const GN_WHOLE = ['Parallel', 'Daybreak', 'Off-Script', 'Clockwise',
    'Featherweight', 'Landline', 'Blue Hour', 'Marionette', 'First Snow',
    'Vermilion', 'Aftermath', 'Paper Moon', 'Static Bloom', 'Nightswim',
    'Glasstown', 'Honeytrap', 'Curfew', 'Polaris', 'Backstage', 'Wildcard'];
  const GN_WORD = ['NOVA', 'PRISM', 'VELVET', 'ECLIPSE', 'AURORA', 'MIRAGE',
    'SOLSTICE', 'HALO', 'RIVET', 'ONYX'];

  KP.genGroupName = function (rng, used) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const roll = rng.next();
      let name;
      if (roll < 0.4) name = rng.pick(GN_PRE) + rng.pick(GN_POST);
      else if (roll < 0.7) name = rng.pick(GN_WHOLE);
      else if (roll < 0.85) name = rng.pick(GN_WORD) + rng.int(2, 9);
      else name = rng.pick(GN_WORD) + ' ' + rng.pick(GN_WHOLE).split(' ')[0];
      const key = name.toLowerCase();
      if (!used || !used.has(key)) {
        if (used) used.add(key);
        return name;
      }
    }
    return rng.pick(GN_PRE) + rng.pick(GN_POST) + rng.int(2, 9);
  };

  const PROD_WORD = ['Glasshouse', 'Mireu', 'Daybreak', 'Vermilion', 'Kestrel',
    'Juniper', 'Onyx', 'Hollow', 'Satellite', 'Meridian', 'Peach', 'Voltage'];
  KP.genProducer = function (rng) {
    const roll = rng.next();
    if (roll < 0.3) return 'Studio ' + rng.pick(PROD_WORD);
    if (roll < 0.5) return rng.pick(PROD_WORD) + ' Collective';
    if (roll < 0.7) return 'producer ' + rng.int(2, 9) + String.fromCharCode(65 + rng.int(0, 25));
    if (roll < 0.85) return rng.pick(PROD_WORD).toUpperCase() + ' & The ' + rng.pick(PROD_WORD) + 's';
    return 'TEAM ' + rng.pick(PROD_WORD).toUpperCase();
  };

  // Company names (v0.4.0): the scene births new labels; each needs a
  // plausible letterhead. Short name = first word, used in wire copy.
  const CO_WORD = ['Halcyon', 'Bluenote', 'Kite', 'Northline', 'Vantage',
    'Clover', 'Monarch', 'Palisade', 'Arclight', 'Tidewater', 'Lantern',
    'Summit', 'Foxglove', 'Ironring', 'Seolim', 'Dawnhak', 'Mirae', 'Hanbit'];
  const CO_SUFFIX = ['Entertainment', 'Media', 'Creative', 'Company', 'Collective', 'Sound'];
  KP.genCompanyName = function (rng, used) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const roll = rng.next();
      let name;
      if (roll < 0.55) name = rng.pick(CO_WORD) + ' ' + rng.pick(CO_SUFFIX);
      else if (roll < 0.75) name = rng.pick(CO_WORD) + ' ' + rng.pick(['House', 'Lab', 'Room']);
      else if (roll < 0.9) name = rng.pick(CO_WORD) + ' & ' + rng.pick(CO_WORD);
      else name = 'The ' + rng.pick(CO_WORD) + ' Company';
      const short = name.replace(/^The /, '').split(/[ &]/)[0];
      const key = short.toLowerCase();
      if (!used || !used.has(key)) {
        if (used) used.add(key);
        return { name, short };
      }
    }
    const w = rng.pick(CO_WORD) + rng.int(2, 9);
    return { name: w + ' ' + rng.pick(CO_SUFFIX), short: w };
  };

  // Fan handles (v0.4.0): the feed speaks through invented accounts only —
  // never real people, never real orgs.
  const FH_A = ['moon', 'star', 'peach', 'holo', 'dew', 'cloud', 'sable',
    'mint', 'wired', 'velvet', 'sonic', 'daisy', 'prism', 'echo', 'lilac',
    'comet', 'sugar', 'nite', 'orbit', 'fizz', 'gguk', 'bora', 'haze'];
  const FH_B = ['archive', 'notes', 'bops', 'talk', 'files', 'cam', 'diary',
    'edits', 'radar', 'stan', 'watcher', 'core', 'loops', 'gaze', 'club',
    'chart', 'static', 'log', 'receipts', 'era'];
  KP.genFanHandle = function (rng, used) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const roll = rng.next();
      let h;
      if (roll < 0.4) h = rng.pick(FH_A) + rng.pick(FH_B);
      else if (roll < 0.65) h = rng.pick(FH_A) + '_' + rng.pick(FH_B);
      else if (roll < 0.85) h = rng.pick(FH_A) + rng.pick(FH_B) + rng.int(2, 99);
      else h = rng.pick(FH_B) + '.' + rng.pick(FH_A);
      if (!used || !used.has(h)) {
        if (used) used.add(h);
        return h;
      }
    }
    return rng.pick(FH_A) + rng.pick(FH_B) + rng.int(100, 999);
  };

  // National-pool artist names (v0.5.0): the wider world's stars. Groups
  // share the group-name grammar (and its uniqueness set); soloists and
  // bands get their own shapes.
  KP.genArtistName = function (rng, type, used) {
    if (type === 'boyGroup' || type === 'girlGroup') return KP.genGroupName(rng, used);
    for (let attempt = 0; attempt < 20; attempt++) {
      const roll = rng.next();
      let name;
      if (type === 'band') {
        if (roll < 0.5) name = 'The ' + rng.pick(GN_WHOLE).split(' ')[0] + 's';
        else if (roll < 0.8) name = rng.pick(GN_WHOLE) + ' Club';
        else name = rng.pick(GN_PRE) + rng.pick(GN_POST) + ' Band';
      } else { // soloist
        if (roll < 0.45) name = (rng.pick(GIVEN_A) + rng.pick(GIVEN_B))
          .replace(/^(.)(.*)$/, (m, a, b) => a.toUpperCase() + b.toLowerCase());
        else if (roll < 0.7) name = rng.pick(GN_WORD).charAt(0) + rng.pick(GN_WORD).slice(1).toLowerCase();
        else if (roll < 0.88) name = rng.pick(GIVEN_A).toUpperCase() + '.' + rng.pick(GIVEN_B).charAt(0).toUpperCase();
        else name = rng.pick(GN_PRE) + rng.pick(GN_POST).toLowerCase();
      }
      const key = name.toLowerCase();
      if (!used || !used.has(key)) {
        if (used) used.add(key);
        return name;
      }
    }
    return rng.pick(GN_PRE) + rng.pick(GN_POST) + ' ' + rng.int(2, 9);
  };

  const HEADLINE_TOPIC = ['girl-group listenership', 'music show ratings',
    'album pre-orders', 'fan-event attendance', 'debut-week streaming',
    'lightstick sales', 'international chart entries'];
  const HEADLINE_SHAPE = [
    (rng) => 'Streaming platforms report record growth in ' + rng.pick(HEADLINE_TOPIC) + ' this quarter.',
    (rng) => 'Industry insiders predict a crowded comeback calendar as ' + rng.pick(HEADLINE_TOPIC) + ' climbs.',
    (rng) => 'A rookie group nobody predicted is quietly outperforming its label’s projections.',
    (rng) => 'Veteran groups renew contracts, leaving fans relieved and rivals recalculating.',
    (rng) => 'Analysts flag ' + rng.pick(HEADLINE_TOPIC) + ' as the metric to watch this comeback season.',
    (rng) => 'A mid-tier agency’s survival-show pitch has every major label suddenly announcing "projects."',
  ];
  KP.genHeadline = function (rng) {
    return rng.pick(HEADLINE_SHAPE)(rng);
  };
})(typeof window !== 'undefined' ? window : globalThis);
