/* Memory (v0.6.0) — the keystone of the company-simulator line.
   Owner: "the simulated public needs to remember things… the world
   develops opinions about your company, your groups, and individual
   idols — and remembers why it has them."

   A narrative is a structured, living opinion: it FORMS when a pattern
   crosses a threshold, STRENGTHENS on every new piece of evidence,
   DECAYS when nothing feeds it, and — the point — CHANGES HOW LATER
   EVENTS ARE READ: comparison notes, expectation modifiers, feed posts
   that treat the fourth viral fancam as a reputation, not a surprise.
   All of it deterministic: no rng in formation, decay, or influence. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // ---- storage ----------------------------------------------------------
  function mem(state) { return state.memory = state.memory || []; }
  function narId(state) {
    state.nextNarrativeId = state.nextNarrativeId || 1;
    return 'n' + (state.nextNarrativeId++);
  }
  KP.getNarrative = function (state, key, subjectType, subjectId) {
    return mem(state).find(n => n.key === key && n.subjectType === subjectType &&
      String(n.subjectId) === String(subjectId)) || null;
  };
  KP.narrativesFor = function (state, subjectType, subjectId) {
    return mem(state)
      .filter(n => n.subjectType === subjectType && String(n.subjectId) === String(subjectId) &&
        n.strength >= KP.C.MEMORY.minShowStrength)
      .sort((a, b) => b.strength - a.strength);
  };
  KP.liveNarratives = function (state) {
    return mem(state).filter(n => n.strength >= KP.C.MEMORY.minShowStrength)
      .sort((a, b) => b.strength - a.strength);
  };

  // The words are rendered live so stage names and renames stay current.
  KP.narrativeText = function (state, n) {
    const M = KP.C.MEMORY;
    const group = () => (KP.groupById(state, n.subjectId) || { name: 'a group' }).name;
    const idol = () => { const p = state.people[n.subjectId]; return p ? KP.displayName(p) : 'her'; };
    switch (n.key) {
      case 'vocalHouse': return state.company.short + ' never misses on vocals.';
      case 'performanceHouse': return state.company.short + ' groups can all dance. It is a house rule.';
      case 'starMaker': return state.company.short + ' finds the ones the public falls for.';
      case 'hitFactory': return state.company.short + ' girl groups simply work.';
      case 'monsterRookies': return group() + ' are monster rookies.';
      case 'underperformed': return group() + '’s last comeback underperformed, and people noticed.';
      case 'dormant': return group() + ' has gone quiet — ' + Math.max(1, state.week - (n.meta && n.meta.since || state.week)) + ' weeks and counting.';
      case 'fancamStar': return idol() + ' is the fancam one. Everyone knows a clip.';
      case 'itGirl': return idol() + ' is becoming an it-girl.';
      default: return n.key;
    }
  };

  // ---- evidence: the one door every pattern walks through ---------------
  // Returns an inbox note when a narrative FORMS (reinforcements are
  // silent — the feed carries those), null otherwise.
  KP.recordEvidence = function (state, key, subjectType, subjectId, meta) {
    const M = KP.C.MEMORY;
    let n = KP.getNarrative(state, key, subjectType, subjectId);
    if (n) {
      n.strength = Math.min(100, n.strength + M.reinforceGain);
      n.evidence++;
      n.lastWeek = state.week;
      if (meta) n.meta = Object.assign(n.meta || {}, meta);
      return null;
    }
    n = {
      id: narId(state), key, subjectType, subjectId,
      strength: M.formStrength, evidence: 1,
      firstWeek: state.week, lastWeek: state.week,
      meta: meta || {},
    };
    mem(state).push(n);
    // cap: the world can only hold so many opinions at once
    if (mem(state).length > M.cap) {
      mem(state).sort((a, b) => b.strength - a.strength);
      state.memory = mem(state).slice(0, M.cap);
    }
    return {
      kind: 'public', ind: 'narrative', narKey: key,
      narSubjectType: subjectType, narSubjectId: subjectId,
      text: formationLine(state, n),
    };
  };

  function formationLine(state, n) {
    const idol = () => { const p = state.people[n.subjectId]; return p ? KP.displayName(p) : 'her'; };
    const group = () => (KP.groupById(state, n.subjectId) || { name: 'the group' }).name;
    switch (n.key) {
      case 'vocalHouse': return 'The trades have started saying it out loud: ' + state.company.short + ' never misses on vocals. That is a reputation now — and an expectation.';
      case 'performanceHouse': return 'A line is forming in the coverage: ' + state.company.short + ' groups can dance, full stop. Reputations like this are free promotion until the day one lineup can’t.';
      case 'starMaker': return 'Industry copy now calls ' + state.company.short + ' a star-maker. Every trainee showcase gets read through that lens from here.';
      case 'hitFactory': return 'The phrase “' + state.company.short + ' girl groups simply work” appeared in three separate write-ups this month. The bar moves up when they say things like that.';
      case 'monsterRookies': return 'The verdict is in: ' + group() + ' are being called monster rookies. The public will hold them to it.';
      case 'underperformed': return 'The narrative has settled: ' + group() + '’s comeback underperformed. Fair or not, the next release answers for it.';
      case 'dormant': return 'The fan cafes have started counting: ' + group() + ' has not released in months. Quiet is a story too.';
      case 'fancamStar': return idol() + ' has gone viral enough times that it is not luck anymore — the internet has decided she is the fancam one. Every stage she takes is a camera looking for the next clip.';
      case 'itGirl': return 'Fashion accounts, recap channels, general-public posts: ' + idol() + ' keeps being the one people remember. The phrase “it-girl” is starting to attach.';
      default: return 'A narrative formed: ' + n.key;
    }
  }

  // ---- per-person tallies with thresholds -------------------------------
  // A first viral moment is luck; the second is a reputation. Same door
  // for both call sites (release sparks, pre-debut hype events).
  KP.recordViral = function (state, person) {
    person.viralCount = (person.viralCount || 0) + 1;
    if (person.viralCount >= KP.C.MEMORY.viralFormAt) {
      return KP.recordEvidence(state, 'fancamStar', 'idol', person.id);
    }
    return null;
  };
  KP.recordBreakout = function (state, person) {
    person.breakoutCount = (person.breakoutCount || 0) + 1;
    if (person.breakoutCount >= KP.C.MEMORY.breakoutFormAt) {
      return KP.recordEvidence(state, 'itGirl', 'idol', person.id);
    }
    return null;
  };

  // ---- the weekly pass: decay + slow-pattern detectors (rng-free) -------
  KP.memoryWeek = function (state) {
    const M = KP.C.MEMORY;
    const notes = [];
    // decay: opinions fade unless something feeds them
    mem(state).forEach(n => { n.strength -= M.decayPerWeek; });
    state.memory = mem(state).filter(n => n.strength > M.pruneBelow);

    // company identity: sustained reputation reads as pedigree (monthly,
    // anchored so the FIRST advance of a career already checks — history
    // walks in with you)
    if ((state.week - 2) % 4 === 0) {
      const rep = state.company.reputation || {};
      [['vocal', 'vocalHouse'], ['performance', 'performanceHouse'],
        ['starMaker', 'starMaker'], ['girlGroup', 'hitFactory']].forEach(([repKey, key]) => {
        if ((rep[repKey] || 0) >= M.repPedigreeAt) {
          const note = KP.recordEvidence(state, key, 'company', 'player');
          if (note) notes.push(note);
        }
      });
    }

    // dormancy: a debuted group gone quiet becomes a countdown — the
    // narrative forms the week the threshold crosses, then nags on cadence
    KP.groups(state).forEach(g => {
      if (!g.debuted || g.prep) return;
      const silent = state.week - (g.lastReleaseWeek || 0);
      if (silent < M.dormantWeeks) return;
      const existing = KP.getNarrative(state, 'dormant', 'group', g.id);
      if (!existing || (silent - M.dormantWeeks) % M.dormantNagWeeks === 0) {
        const note = KP.recordEvidence(state, 'dormant', 'group', g.id, { since: g.lastReleaseWeek });
        if (note) notes.push(note);
      }
    });
    return notes;
  };

  // ---- influence: memory changes how a release is read ------------------
  // Deterministic, computed at resolution. Returns { mod, notes[] } and
  // resolves narratives that this release answers (dormancy).
  KP.memoryReadsRelease = function (state, g, isDebut, avgVocals) {
    const M = KP.C.MEMORY;
    const out = { mod: 0, notes: [] };

    // the long-awaited return: dormancy resolved, warmth earned
    const dorm = KP.getNarrative(state, 'dormant', 'group', g.id);
    if (!isDebut && dorm && dorm.strength >= M.minShowStrength) {
      out.mod += M.returnBonus;
      out.notes.push('The long-awaited return did what long-awaited returns do — the fans who spent months asking “where is ' + g.name + '” showed up with receipts.');
      state.memory = mem(state).filter(n => n !== dorm);
    }

    // pedigree expectation: debuting under the company's name
    const vh = KP.getNarrative(state, 'vocalHouse', 'company', 'player');
    if (isDebut && vh && vh.strength >= M.minShowStrength) {
      if (avgVocals >= 62) {
        out.mod += M.pedigreeMeet;
        out.notes.push('“' + state.company.short + ' debut? Okay, who’s the vocalist” — the pedigree question answered itself by the first chorus.');
      } else if (avgVocals < 50) {
        out.mod += M.pedigreeMiss;
        out.notes.push('The pedigree cut the other way: a ' + state.company.short + ' debut without a standout vocal reads as a broken promise, and the write-ups said so.');
      }
      // the comparison the owner asked for: a new voice is measured
      // against the house's established ones, by name
      const prior = KP.groups(state).filter(x => x.debuted && x.id !== g.id && x.roles && x.roles.mainVocal)
        .sort((a, b) => (b.debutWeek || 0) - (a.debutWeek || 0))[0];
      if (prior && avgVocals >= 55) {
        const priorVocal = state.people[prior.roles.mainVocal];
        if (priorVocal) {
          out.notes.push('Within the hour, the comparison threads were up: the new main vocal against ' +
            KP.displayName(priorVocal) + '. That is not pressure — at this company, it is the job description.');
        }
      }
    }
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
