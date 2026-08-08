/* Song demos and concepts. Songs are procedural assets with qualities the
   player weighs against the roster — never a DAW, always a judgment call. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  KP.generateDemos = function (state, rng) {
    const S = KP.C.SONG;
    const demos = [];
    const usedTitles = {};
    // titles already in any discography stay retired — no accidental reissues
    KP.groups(state).forEach(g => (g.releases || []).forEach(r => { usedTitles[r.songTitle] = true; }));
    for (let i = 0; i < S.demoCount; i++) {
      const title = KP.genSongTitle(rng, usedTitles);
      const concept = rng.pick(KP.C.CONCEPTS);
      demos.push({
        id: 'song' + (i + 1),
        title,
        producer: KP.genProducer(rng),
        conceptId: concept.id,
        hook: q(rng), vocalDemand: q(rng), rapDemand: KP.clamp(q(rng) - 15, 5, 95),
        choreoPotential: q(rng), trendFit: q(rng),
      });
    }
    function q(r) { return KP.clamp(Math.round(r.normal(S.qualityMean, S.qualitySd)), 10, 95); }
    return demos;
  };

  KP.conceptById = function (id) {
    return KP.C.CONCEPTS.find(c => c.id === id);
  };

  // Individual concept fit (hidden): how a member's talents + personality
  // resonate with a concept. The source of accidental stars.
  KP.conceptFit = function (person, concept) {
    let num = 0, den = 0;
    Object.keys(concept.weights).forEach(d => {
      num += person.talents[d].cur * concept.weights[d];
      den += concept.weights[d];
    });
    let fit = num / den;
    Object.keys(concept.personality || {}).forEach(trait => {
      fit += (person.personality[trait] - 50) * 0.12 * concept.personality[trait];
    });
    return KP.clamp(fit, 0, 100);
  };

  // Staff opinion of a demo for a specific lineup — perceived, in words.
  KP.demoOpinion = function (state, demo, members) {
    const concept = KP.conceptById(demo.conceptId);
    const lines = [];
    if (demo.hook >= 72) lines.push('The hook does not leave your head. That is the point of a hook.');
    else if (demo.hook <= 40) lines.push('The chorus is doing a lot of standing around.');
    if (members && members.length) {
      const avgVocal = members.reduce((s, m) => s + m.talents.vocals.cur, 0) / members.length;
      const avgDance = members.reduce((s, m) => s + m.talents.dance.cur, 0) / members.length;
      const maxRap = Math.max.apply(null, members.map(m => m.talents.rap.cur));
      if (demo.vocalDemand > avgVocal + 12) lines.push('Vocally, this asks more than the room currently has.');
      if (demo.choreoPotential > 70 && avgDance < 50) lines.push('The choreography this deserves would eat this lineup alive.');
      if (demo.rapDemand > 55 && maxRap < 45) lines.push('There is a rap verse here and no one to give it to.');
      const fits = members.map(m => KP.conceptFit(m, concept));
      const spread = Math.max.apply(null, fits) - Math.min.apply(null, fits);
      if (spread > 30) lines.push('This concept fits some of these members far better than others.');
    }
    if (demo.trendFit >= 70) lines.push('Right sound, right year. The market is already leaning this way.');
    else if (demo.trendFit <= 35) lines.push('Nobody is asking for this sound right now. That is either a problem or a statement.');
    if (!lines.length) lines.push('A professional record. Whether it becomes more depends on who stands in front of it.');
    return lines;
  };
})(typeof window !== 'undefined' ? window : globalThis);
