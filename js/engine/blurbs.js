/* The perceived layer. Evaluators read hidden truth through fog:
   read = truth + deterministic offset(evaluator, person, domain, looks).
   More observation narrows the fog; it never reaches zero.
   Blurbs are generated from the PERCEIVED value + evaluator voice,
   and are deterministic — reopening a dossier never re-rolls an opinion. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // Width of an evaluator's uncertainty on one domain of one person.
  KP.readWidth = function (person, evaluator) {
    const S = KP.C.SCOUT;
    const obs = Math.min(person.observations || 0, S.maxObservations);
    const w = (S.baseReadWidth - obs * S.widthPerObservation) * (evaluator ? evaluator.accuracy : 1);
    return Math.max(S.minReadWidth, w);
  };

  // Deterministic perceived value for one domain through one evaluator's eyes.
  KP.perceived = function (state, person, domain, evaluator) {
    const truth = person.talents[domain].cur;
    const width = KP.readWidth(person, evaluator);
    const key = [state.seed, evaluator ? evaluator.id : 'board', person.id, domain,
      Math.min(person.observations || 0, KP.C.SCOUT.maxObservations)].join('|');
    let off = (KP.hash01(key) - 0.5) * 2 * width;
    // evaluators over-rate their own specialty a touch — bias is character
    if (evaluator && evaluator.bias === domain) off += width * 0.25;
    return KP.clamp(Math.round(truth + off), 1, 100);
  };

  // ---- Blurb tables: [raw, developing, strong, exceptional] ------------
  const LINES = {
    vocals: {
      raw: ['Pitch wanders the moment she stops concentrating.',
        'The instrument is there. The control is not.',
        'Fine in unison. Exposed the second she is alone on a line.'],
      developing: ['Big voice, good instincts. Technique is still raw.',
        'Solid in the practice room. Untested under lights.',
        'Carries a melody honestly. Nothing wasted, nothing special yet.'],
      strong: ['Clean tone, reliable pitch. You can build lines around her.',
        'Handles key changes like they are not there.',
        'Studio-ready today. Live, she is close.'],
      exceptional: ['A natural vocalist. Just don’t ask her to dance.',
        'Stop the search — this is the main vocal.',
        'The room went quiet when she sang. Rooms don’t do that.'],
    },
    rap: {
      raw: ['Reads lyrics like a school announcement.',
        'Rhythm arrives slightly after she does.'],
      developing: ['Capable when needed. I would not build the concept around it.',
        'Serviceable flow. No signature yet.'],
      strong: ['Sharp diction, real bounce. Give her the second verse.',
        'Delivery has attitude the demo deserves.'],
      exceptional: ['Writes her own bars and they are better than ours.',
        'The flow is the concept. Build around it.'],
    },
    dance: {
      raw: ['Works hard. The feet remain unconvinced.',
        'Counts out loud. We can all hear it.'],
      developing: ['Keeps up with the back line. The front is another matter.',
        'Clean on slow tempo, scrambles on double-time.'],
      strong: ['Learns choreography frighteningly fast.',
        'Precise, controlled, watchable. The mirror likes her.'],
      exceptional: ['She makes the choreographer look better than he is.',
        'Full-out every run. Full-out at 2 a.m.'],
    },
    visuals: {
      raw: ['The camera keeps looking for someone else.',
        'Blends into a group photo of four.'],
      developing: ['Photographs fine. Nothing the stylists can’t work with.',
        'A specific face. The right concept could make that an asset.'],
      strong: ['The test shots came back and everyone kept scrolling back to hers.',
        'Camera finds her without being told.'],
      exceptional: ['Marketing asked who she was before the evaluation ended.',
        'One teaser frame of her will carry the announcement.'],
    },
    charisma: {
      raw: ['Disappears in a room of three.',
        'Polite, prepared, and instantly forgettable. That is fixable. Maybe.'],
      developing: ['There is something there when she forgets she is being watched.',
        'Flickers of presence. Inconsistent, but real.'],
      strong: ['People stop talking when she starts.',
        'Holds the room a beat longer than she should be able to.'],
      exceptional: ['I cannot explain it. Everyone in the room kept watching her.',
        'Whatever "it" is — she has it, and she knows it.'],
    },
  };

  const RECOMMEND = {
    exceptional: ['Debut her before someone else does.', 'Sign her today. Argue later.'],
    strong: ['Worth the money. I would move.', 'Recommend signing — the upside is real.'],
    developing: ['A project, but projects are the job.', 'Watch again before committing.'],
    raw: ['Pass unless something changes.', 'I have seen this story before. It ends in a cut.'],
  };

  const INSTINCT_NOTES = [
    'I don’t have objective evidence for this. Don’t let another company sign her.',
    'On paper she is ordinary. In the room she is not. Trust me once.',
    'Every kid in that academy watched her instead of the mirror. That means something.',
  ];

  function bandKey(v) { return KP.band(v).key; }

  function pickLine(arr, key) {
    return arr[Math.floor(KP.hash01(key) * arr.length) % arr.length];
  }

  // Full evaluation: one blurb per domain (from the best-suited evaluator),
  // an overall recommendation, and possibly an instinct note.
  KP.evaluate = function (state, person) {
    const evs = KP.DATA.evaluators;
    const domains = KP.C.TALENTS.map(domain => {
      // vocal coach speaks on vocals/rap, performance director on dance/visuals,
      // senior scout on charisma — each professional in their lane
      const ev = domain === 'vocals' || domain === 'rap' ? evs[0]
        : domain === 'dance' || domain === 'visuals' ? evs[1] : evs[2];
      const val = KP.perceived(state, person, domain, ev);
      const band = bandKey(val);
      const line = pickLine(LINES[domain][band],
        [state.seed, person.id, domain, band, 'line'].join('|'));
      return { domain, evaluator: ev, band, line,
        confident: KP.readWidth(person, ev) <= 9 };
    });

    // recommendation keys off the two best perceived domains (never an average of five)
    const scout = evs[2];
    const perceivedAll = KP.C.TALENTS.map(d => KP.perceived(state, person, d, scout))
      .sort((a, b) => b - a);
    const topTwo = (perceivedAll[0] + perceivedAll[1]) / 2;
    const rec = pickLine(RECOMMEND[bandKey(topTwo)],
      [state.seed, person.id, 'rec'].join('|'));

    // rare instinct note: senior scout smells hidden charisma the numbers miss
    let instinct = null;
    const hiddenGap = person.talents.charisma.ceilHi - KP.perceived(state, person, 'charisma', scout);
    if (hiddenGap > 22 && KP.hash01([state.seed, person.id, 'instinct'].join('|')) < KP.C.SCOUT.instinctNoteChance * 3) {
      instinct = pickLine(INSTINCT_NOTES, [state.seed, person.id, 'instinctLine'].join('|'));
    }

    return { domains, recommendation: rec, instinct };
  };

  // Short one-line read for list rows: the loudest perceived domain.
  KP.headline = function (state, person) {
    const scout = KP.DATA.evaluators[2];
    let best = null;
    KP.C.TALENTS.forEach(d => {
      const v = KP.perceived(state, person, d, scout);
      if (!best || v > best.v) best = { d, v };
    });
    const band = KP.band(best.v);
    return { domain: best.d, band: band.label,
      text: KP.C.TALENT_LABELS[best.d] + ' · ' + band.label };
  };
})(typeof window !== 'undefined' ? window : globalThis);
