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

  // ---- Blurb tables (v0.3.0): assembled, not picked --------------------
  // Each (domain, band) cell holds canonical whole lines (the gems) plus
  // opener × detail fragments. A blurb is either a whole line or an
  // assembled pair — ~20+ variants per cell, still deterministic per
  // person (Law 2: reads are knowledge, not slot pulls).
  const LINES = {
    vocals: {
      raw: {
        whole: ['Pitch wanders the moment she stops concentrating.',
          'The instrument is there. The control is not.',
          'Fine in unison. Exposed the second she is alone on a line.'],
        open: ['Flat by the second chorus.', 'The breath support gives out early.',
          'She sings at notes rather than through them.', 'Tone is thin and she knows it.'],
        detail: ['Fixable, with years.', 'The coaches are patient. The key changes are not.',
          'Right now we write around her.', 'Hide her in the harmonies for now.'],
      },
      developing: {
        whole: ['Big voice, good instincts. Technique is still raw.',
          'Carries a melody honestly. Nothing wasted, nothing special yet.'],
        open: ['Solid in the practice room.', 'The mid-range is genuinely pleasant.',
          'Stays on pitch when she trusts herself.', 'There is a real voice under the caution.'],
        detail: ['Untested under lights.', 'The high notes are still a negotiation.',
          'Another year of coaching shows up here.', 'She improves every month, quietly.'],
      },
      strong: {
        whole: ['Clean tone, reliable pitch. You can build lines around her.',
          'Handles key changes like they are not there.'],
        open: ['Studio-ready today.', 'The engineers stopped correcting her weeks ago.',
          'Her live pitch barely moves.', 'Warm tone, real control.'],
        detail: ['Live, she is close.', 'Give her the bridge and stop worrying.',
          'The vocal line can lean on her.', 'She makes the demo sound expensive.'],
      },
      exceptional: {
        whole: ['A natural vocalist. Just don’t ask her to dance.',
          'Stop the search — this is the main vocal.',
          'The room went quiet when she sang. Rooms don’t do that.'],
        open: ['The voice is simply there, whole.', 'She sight-read the demo and improved it.',
          'Whatever we paid, it was not enough.'],
        detail: ['Build the line around her and thank me later.',
          'I have coached for years. This is not coaching.', 'Protect that throat like company property.'],
      },
    },
    rap: {
      raw: {
        whole: ['Reads lyrics like a school announcement.', 'Rhythm arrives slightly after she does.'],
        open: ['The flow keeps tripping over the beat.', 'Diction is mush past mid-tempo.',
          'She rushes every fourth bar.'],
        detail: ['Keep her verses short.', 'It is not her language yet.',
          'Nothing a concept needs to depend on.', 'We give those lines to someone else.'],
      },
      developing: {
        whole: ['Capable when needed. I would not build the concept around it.',
          'Serviceable flow. No signature yet.'],
        open: ['Keeps time, lands the words.', 'The delivery is clean if careful.',
          'She can carry eight bars respectably.'],
        detail: ['No signature yet.', 'Attitude arrives when confidence does.',
          'Enough for a bridge, not a verse.', 'The demo will not suffer.'],
      },
      strong: {
        whole: ['Sharp diction, real bounce. Give her the second verse.',
          'Delivery has attitude the demo deserves.'],
        open: ['The pocket is real.', 'Her tone cuts through the mix.',
          'She swings the rhythm instead of surviving it.'],
        detail: ['Give her the second verse.', 'Producers ask for her by name now.',
          'The writers can get ambitious.', 'That confidence reads on camera too.'],
      },
      exceptional: {
        whole: ['Writes her own bars and they are better than ours.',
          'The flow is the concept. Build around it.'],
        open: ['She rewrote the guide verse without asking.', 'The delivery is a fingerprint already.'],
        detail: ['It was better. That is the problem and the gift.',
          'Book the writers around her schedule.', 'Concepts should bend toward this, not away.'],
      },
    },
    dance: {
      raw: {
        whole: ['Works hard. The feet remain unconvinced.', 'Counts out loud. We can all hear it.'],
        open: ['Half a beat behind the mirror.', 'The arms and the legs disagree.',
          'Choreography survives her rather than lives in her.'],
        detail: ['Back line, for now.', 'Effort is not the problem. Wiring is.',
          'Simple formations only.', 'The practice logs say she is trying. The video says keep trying.'],
      },
      developing: {
        whole: ['Keeps up with the back line. The front is another matter.',
          'Clean on slow tempo, scrambles on double-time.'],
        open: ['Learns a routine in a reasonable week.', 'The shapes are right; the sharpness is not.',
          'Follows well, leads nowhere yet.'],
        detail: ['Double-time still wins.', 'Six months of drilling shows.',
          'You can place her mid-formation with confidence.', 'The gap is closing, slowly.'],
      },
      strong: {
        whole: ['Learns choreography frighteningly fast.',
          'Precise, controlled, watchable. The mirror likes her.'],
        open: ['Hits accents the track only implies.', 'Her lines are clean at full speed.',
          'One demonstration and she has it.'],
        detail: ['The mirror likes her.', 'Front line, no argument.',
          'Choreographers relax when she is in the room.', 'She makes the count look optional.'],
      },
      exceptional: {
        whole: ['She makes the choreographer look better than he is.',
          'Full-out every run. Full-out at 2 a.m.'],
        open: ['The routine looks designed on her body.', 'She dances the silence between beats.'],
        detail: ['Center the formation on her and film it.',
          'The trainees copy her copies.', 'We stopped teaching and started editing.'],
      },
    },
    visuals: {
      raw: {
        whole: ['The camera keeps looking for someone else.', 'Blends into a group photo of four.'],
        open: ['The test shots came back ordinary.', 'Lighting does not rescue much.'],
        detail: ['Styling will work hard here.', 'Not every role needs a face. Hers needs a stage.',
          'The camera is honest. So am I.'],
      },
      developing: {
        whole: ['Photographs fine. Nothing the stylists can’t work with.',
          'A specific face. The right concept could make that an asset.'],
        open: ['Good bones, quiet presence.', 'Reads better in motion than in stills.',
          'An interesting face rather than a pretty one.'],
        detail: ['The right concept unlocks it.', 'Stylists have opinions, all workable.',
          'One era with the right hair changes this conversation.'],
      },
      strong: {
        whole: ['The test shots came back and everyone kept scrolling back to hers.',
          'Camera finds her without being told.'],
        open: ['The frame organizes itself around her.', 'Every stylist wants her fitting first.'],
        detail: ['Teaser committee already asked.', 'Print, screen, stage — it all works.',
          'She wastes no lighting.'],
      },
      exceptional: {
        whole: ['Marketing asked who she was before the evaluation ended.',
          'One teaser frame of her will carry the announcement.'],
        open: ['The stills look retouched. They are not.', 'Brands will call before the debut does.'],
        detail: ['Plan the concept photos around her and save money.',
          'That face is a budget line now.', 'The announcement writes itself.'],
      },
    },
    charisma: {
      raw: {
        whole: ['Disappears in a room of three.',
          'Polite, prepared, and instantly forgettable. That is fixable. Maybe.'],
        open: ['Eyes drop when the attention arrives.', 'She performs at the floor.'],
        detail: ['Stage time may wake it. May.', 'Presence is the one thing we cannot drill.',
          'Watch her after her first real crowd.'],
      },
      developing: {
        whole: ['There is something there when she forgets she is being watched.',
          'Flickers of presence. Inconsistent, but real.'],
        open: ['Moments — real ones — then gone.', 'The room notices her, then loses her.'],
        detail: ['Inconsistent, but real.', 'Confidence would finish this sentence.',
          'A good stage could flip the switch.', 'Keep putting her in front of people.'],
      },
      strong: {
        whole: ['People stop talking when she starts.',
          'Holds the room a beat longer than she should be able to.'],
        open: ['The attention lands on her and stays.', 'She fills a pause like it was written for her.'],
        detail: ['That is not trainable. That is hers.', 'Cameras are going to love this.',
          'Give her a fancam and stand back.'],
      },
      exceptional: {
        whole: ['I cannot explain it. Everyone in the room kept watching her.',
          'Whatever "it" is — she has it, and she knows it.'],
        open: ['The evaluation stopped being about the material.', 'Staff found reasons to stay in the room.'],
        detail: ['I have no metric for this. I am reporting it anyway.',
          'Whoever debuts her first wins.', 'The public will do our marketing.'],
      },
    },
  };

  const RECOMMEND = {
    exceptional: ['Debut her before someone else does.', 'Sign her today. Argue later.',
      'If the budget says no, change the budget.', 'This is why the job exists. Move.'],
    strong: ['Worth the money. I would move.', 'Recommend signing — the upside is real.',
      'She raises the floor of any lineup we put her in.', 'Sign, and thank the calendar we saw her first.'],
    developing: ['A project, but projects are the job.', 'Watch again before committing.',
      'Two years and good coaching. Whether we have both is your call.',
      'Interesting, unfinished. Priced accordingly.'],
    raw: ['Pass unless something changes.', 'I have seen this story before. It ends in a cut.',
      'The board has better uses for this signing.', 'Someone will sign her. It does not have to be us.'],
  };

  // the market missed one (v0.3.2): an older prospect this polished being
  // available is a mistake somebody else made — say so, urgently
  const OVERLOOKED_NOTES = [
    'This polished, this age, still unsigned? Somebody upstream made a mistake. Move before they correct it.',
    'Everyone assumed someone else had already signed her. Nobody had. These windows close on their own.',
    'I checked twice why she is still available. The answer is luck. Ours — if we hurry.',
  ];

  const INSTINCT_NOTES = [
    'I don’t have objective evidence for this. Don’t let another company sign her.',
    'On paper she is ordinary. In the room she is not. Trust me once.',
    'Every kid in that academy watched her instead of the mirror. That means something.',
    'My reports say average. My gut has been doing this longer than my reports.',
    'I have signed two stars in my career. The hair on my arms remembers both. It just did it again.',
  ];

  function bandKey(v) { return KP.band(v).key; }

  function pickLine(arr, key) {
    return arr[Math.floor(KP.hash01(key) * arr.length) % arr.length];
  }

  // A blurb from a (domain, band) cell: a canonical whole line or an
  // assembled opener+detail pair, chosen by one deterministic hash.
  function composeLine(cell, key) {
    const total = cell.whole.length + cell.open.length * cell.detail.length;
    const idx = Math.floor(KP.hash01(key) * total) % total;
    if (idx < cell.whole.length) return cell.whole[idx];
    const k = idx - cell.whole.length;
    return cell.open[k % cell.open.length] + ' ' +
      cell.detail[Math.floor(k / cell.open.length) % cell.detail.length];
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
      const line = composeLine(LINES[domain][band],
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

    // rare instinct note: senior scout smells hidden charisma the numbers
    // miss — or flags the overlooked older find the market forgot
    let instinct = null;
    if (person.flags && person.flags.overlooked && person.status === 'prospect') {
      instinct = pickLine(OVERLOOKED_NOTES, [state.seed, person.id, 'overlooked'].join('|'));
    } else {
      const hiddenGap = person.talents.charisma.ceilHi - KP.perceived(state, person, 'charisma', scout);
      if (hiddenGap > 22 && KP.hash01([state.seed, person.id, 'instinct'].join('|')) < KP.C.SCOUT.instinctNoteChance * 3) {
        instinct = pickLine(INSTINCT_NOTES, [state.seed, person.id, 'instinctLine'].join('|'));
      }
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
