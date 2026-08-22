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
  // the conversation about US — rival stories live under their own cards.
  // 0.9.9.1: after the founding, idols who crossed the wall take their
  // stories with them — a rival-status idol's narrative is not ours.
  KP.playerNarratives = function (state) {
    return KP.liveNarratives(state)
      .filter(n => n.subjectType !== 'rivalCompany' && n.subjectType !== 'rivalAct')
      .filter(n => !(n.subjectType === 'idol' &&
        (state.people[n.subjectId] || {}).status === 'rival'));
  };

  // The words are rendered live so stage names and renames stay current.
  KP.narrativeText = function (state, n) {
    const M = KP.C.MEMORY;
    const group = () => (KP.groupById(state, n.subjectId) || { name: 'a group' }).name;
    const idol = () => { const p = state.people[n.subjectId]; return p ? KP.displayName(p) : 'her'; };
    const rivalCo = () => {
      const r = (state.rivals || []).find(x => x.short === n.subjectId);
      return r ? r.short : String(n.subjectId);
    };
    const rivalAct = () => {
      const hit = KP.rivalActById(state, n.subjectId);
      return hit ? hit.act.name : 'that group';
    };
    switch (n.key) {
      case 'poachers': return rivalCo() + ' signs off other companies’ boards — including ours. Repeatedly.';
      case 'risingPower': return rivalCo() + ' is a rising power. The trades say it like a warning.';
      case 'fadingHouse': return rivalCo() + ' is fading — the roster thins and the hits stopped coming.';
      case 'trendCopier': return rivalCo() + ' chases every trend, sometimes straight into a wall.';
      case 'performanceFactory': return rivalCo() + ' groups out-dance everyone. It is their whole identity.';
      case 'patientHouse': return rivalCo() + ' signs young and waits years. It usually works.';
      case 'rivalMonsterRookies': return rivalAct() + ' are the monster rookies everyone else gets measured against.';
      case 'overDelivered': return group() + ' beat the expectations their own announcement set. The industry remembers upsets.';
      case 'underDelivered': return group() + ' debuted under the bar the company itself raised. The write-ups keep the receipts.';
      case 'breakthrough': return group() + ' charted from a label nobody had heard of. The industry keeps a shelf for stories like that.';
      case 'sellsLikeTitan': return group() + ' sells albums like a fandom twice its chart size. The wallets are the story.';
      case 'weatheredStory': return idol() + ' weathered a story and kept working. The file shows the scar; the career shows the shape.';
      case 'stoodByHer': return 'When the story came for ' + idol() + ', the company stood in front of it. The whole roster watched which way the label leaned.';
      case 'firstSettlement': return group() + ' reached first settlement — the career became a job that pays. The members remember the date better than any chart peak.';
      case 'digitalDarling': return group() + ' streams everywhere and sells modestly — the general public’s pick, the light-fandom profile.';
      case 'hitStreak': return rivalAct() + ' has not missed in three releases. The streak is the story.';
      case 'flopEra': return rivalAct() + ' is in its flop era, and the internet is not kind about it.';
      case 'vocalHouse': return state.company.short + ' never misses on vocals.';
      case 'performanceHouse': return state.company.short + ' groups can all dance. It is a house rule.';
      case 'starMaker': return state.company.short + ' finds the ones the public falls for.';
      case 'hitFactory': return state.company.short + ' girl groups simply work.';
      case 'monsterRookies': return group() + ' are monster rookies.';
      case 'underperformed': return group() + '’s last comeback underperformed, and people noticed.';
      case 'dormant': return group() + ' has gone quiet — ' + Math.max(1, state.week - (n.meta && n.meta.since || state.week)) + ' weeks and counting.';
      case 'fancamStar': return idol() + ' is the fancam one.' + (n.meta && n.meta.source ? ' It started with ' + n.meta.source + '.' : ' Everyone knows a clip.');
      case 'oneToWatch': return 'The internet keeps finding ' + idol() + ' before the debut does' + (n.meta && n.meta.source ? ' — ' + n.meta.source + ' did the rounds' : '') + '.';
      case 'itGirl': return KP.fillPro(idol() + ' is becoming an it-{girl}.', state.people[n.subjectId]);
      case 'varietyMonster': return idol() + ' is a variety monster. Producers keep a chair warm.';
      case 'nationalMC': return idol() + ' held the MC mic for a full run. The public trusts that face.';
      case 'ostVoice': return idol() + ' is the OST voice now. Dramas call before the charts do.';
      case 'dateSniper': {
        const r = (state.rivals || []).find(x => x.short === n.subjectId);
        const count = (r && r.ambushCount) || n.evidence + 1;
        return rivalCo() + ' drops releases on other people’s dates. Ours, specifically — ' + count + ' times now.';
      }
      case 'rivalry': {
        const foe = KP.groups(state).find(g => g.feuds && g.feuds[n.subjectId]);
        const feud = foe && foe.feuds[n.subjectId];
        return rivalAct() + (foe ? ' vs ' + foe.name + ' is a real rivalry — ' +
          (feud.wins + '–' + feud.losses) + ' to ' + (feud.wins >= feud.losses ? 'us' : 'them') +
          ' on shared weeks, and both fandoms keep receipts.' : ' has a rivalry the whole scene watches.');
      }
      case 'showDarling': {
        const show = KP.showLabel((n.meta && n.meta.show) || 'countdown');
        return show + ' might as well engrave ' + group() + '’s name on the trophy.';
      }
      case 'regionStronghold': {
        const g = KP.groupById(state, n.subjectId);
        const regions = g && g.regions ? g.regions : {};
        const loudest = Object.keys(regions).sort((x, y) => regions[y] - regions[x])[0];
        return group() + ' moves numbers in ' + KP.regionLabel(loudest || (n.meta && n.meta.region) || 'jp') +
          ' like a domestic act.';
      }
      case 'conceptIdentity': {
        const c = KP.conceptById((n.meta && n.meta.concept) || 'bright');
        return group() + ' and the ' + (c ? c.label.toLowerCase() : 'signature') + ' concept are inseparable now. The sound IS the group.';
      }
      case 'brandDarling': return idol() + ' is who the brands call first. The visual role sends invoices now.';
      case 'genreShift': return group() + ' invented ' + ((n.meta && n.meta.mash) || 'a sound') + ' and the industry is still catching up.';
      case 'signatureSound': return group() + ' and ' + ((n.meta && n.meta.producer) || 'one producer') + ' have a sound the public can name blind.';
      case 'catalogRevival': return '\u201c' + ((n.meta && n.meta.title) || 'an old song') + '\u201d came back years later and charted. ' + group() + '\u2019s catalog does not expire.';
      case 'biggerThan': return idol() + ' \u2014 bigger than ' + ((n.meta && n.meta.group) || 'the group') + '? The trades asked first. Now everyone does.';
      case 'archRivals': return group() + ' vs ' + ((n.meta && n.meta.foe) || 'them') + ' \u2014 the rivalry the coverage cannot stop naming.';
      case 'festivalIcons': return group() + ' are festival icons. Spring books them before it books the weather.';
      case 'varietyGroup': return group() + ' is the variety group \u2014 the panels call the dorm directly now.';
      case 'ostFactory': return group() + ' is an OST factory. The dramas call before the scripts are finished.';
      case 'lastChanceDebut': return idol() + ' debuted after ' + ((n.meta && n.meta.years) || 'many') + ' years as a trainee. The practice room finally opened.';
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
      kind: 'public', ind: 'narrative', narKey: key, priority: 'high',
      narSubjectType: subjectType, narSubjectId: subjectId,
      text: formationLine(state, n),
    };
  };

  function formationLine(state, n) {
    const idol = () => { const p = state.people[n.subjectId]; return p ? KP.displayName(p) : 'her'; };
    const group = () => (KP.groupById(state, n.subjectId) || { name: 'the group' }).name;
    const rivalCo = () => {
      const r = (state.rivals || []).find(x => x.short === n.subjectId);
      return r ? r.short : String(n.subjectId);
    };
    const rivalAct = () => {
      const hit = KP.rivalActById(state, n.subjectId);
      return hit ? hit.act.name : 'that group';
    };
    switch (n.key) {
      case 'poachers': return 'It has a name now: the scouts call ' + rivalCo() + ' “the poachers.” Three of our board leads signed there. Lock the good ones down faster.';
      case 'risingPower': return 'The trades have promoted ' + rivalCo() + ' to “rising power.” They are not wrong, which is the annoying part.';
      case 'fadingHouse': return 'The word on ' + rivalCo() + ' is out: fading. Empty practice rooms, quiet releases. Watch their people — fading houses leak talent.';
      case 'overDelivered': return 'The write-ups agree on the rarest verdict: ' + group() + ' EXCEEDED the expectations the announcement set. Expectations met get forgotten by Friday. Expectations beaten get remembered by everyone, including the next announcement.';
      case 'underDelivered': return 'The verdict nobody in the building says out loud: ' + group() + ' debuted under the bar the company set for itself. The industry files this next to the announcement, where both will be read together forever.';
      case 'breakthrough': return 'The story of the season: ' + group() + ' put up a real number from a label the coverage had to look up first. Doors that screened this company’s calls now ring back. Nobody forgets which venues took the booking BEFORE the clip.';
      case 'weatheredStory': return 'The file on ' + idol() + ' now includes a weathered story — the industry euphemism for a week that would have ended a thinner career. Survival is a credential here; everyone who books {her} knows {she} has it.';
      case 'stoodByHer': return 'The industry keeps a short list of companies that stood in front of a story instead of behind it, and ' + state.company.short + ' is on it now — for ' + idol() + ', at real cost, on the record. Trainees ask about that list by name.';
      case 'firstSettlement': return 'The milestone the industry undercovers and the members never forget: ' + group() + ' reached FIRST SETTLEMENT. Every won of the practice years and the productions has been paid back, and from here the share is theirs. Careers divide into before this meeting and after it.';
      case 'sellsLikeTitan': return 'The trades ran the comparison chart: ' + group() + ' moves physical albums at a weight class above its streaming numbers. Translation the whole industry understands — the fandom is organized, funded, and buying the LINE, not the song. Concert promoters call companies like this first.';
      case 'digitalDarling': return 'The profile is now official: ' + group() + ' is the general public’s act — everywhere on streaming, modest on the shelves. It is the harder profile to monetize and the easier one to keep: nobody organizes a bulk-buy, and nobody organizes a boycott either.';
      case 'rivalMonsterRookies': return rivalAct() + ' just got the “monster rookies” treatment in every write-up. That is the bar our next debut gets measured against.';
      case 'hitStreak': return rivalAct() + ' has made it three hits in a row. The coverage stopped calling it luck, which means the pressure is now ours.';
      case 'flopEra': return 'The internet has declared ' + rivalAct() + ' officially in a “flop era.” Cruel, fast, and — for their company — very expensive.';
      case 'vocalHouse': return 'The trades have started saying it out loud: ' + state.company.short + ' never misses on vocals. That is a reputation now — and an expectation.';
      case 'performanceHouse': return 'A line is forming in the coverage: ' + state.company.short + ' groups can dance, full stop. Reputations like this are free promotion until the day one lineup can’t.';
      case 'starMaker': return 'Industry copy now calls ' + state.company.short + ' a star-maker. Every trainee showcase gets read through that lens from here.';
      case 'hitFactory': return 'The phrase “' + state.company.short + ' girl groups simply work” appeared in three separate write-ups this month. The bar moves up when they say things like that.';
      case 'monsterRookies': return 'The verdict is in: ' + group() + ' are being called monster rookies. The public will hold them to it.';
      case 'underperformed': return 'The narrative has settled: ' + group() + '’s comeback underperformed. Fair or not, the next release answers for it.';
      case 'dormant': return 'The fan cafes have started counting: ' + group() + ' has not released in months. Quiet is a story too.';
      case 'fancamStar': return KP.fillPro(idol() + ' has gone viral enough times that it is not luck anymore — the internet has decided {she} is the fancam one.' + (n.meta && n.meta.source ? ' The archivists agree on the origin: ' + n.meta.source + '.' : '') + ' Every stage {she} takes is a camera looking for the next clip.', state.people[n.subjectId]);
      case 'oneToWatch': return KP.fillPro(idol() + ' has gone viral enough times — covers, clips, resurfaced photos — that it stopped being luck. {She} has not debuted. The internet has decided that is the company’s scheduling error, and the phrase “one to watch” is attaching to {her} name. A debut is a deadline now.', state.people[n.subjectId]);
      case 'itGirl': return KP.fillPro('Fashion accounts, recap channels, general-public posts: ' + idol() + ' keeps being the one people remember. The phrase “it-{girl}” is starting to attach.', state.people[n.subjectId]);
      case 'trendCopier': return rivalCo() + ' has a reputation now: first to every trend, occasionally face-first. The fans mean it affectionately. Mostly.';
      case 'performanceFactory': return 'The book on ' + rivalCo() + ' is written: their groups can dance before they can talk. Plan concepts accordingly.';
      case 'patientHouse': return rivalCo() + '’s reputation crystallized: sign young, wait years, rarely miss. The patient ones are the dangerous ones.';
      case 'dateSniper': return 'Twice now ' + rivalCo() + ' has parked a release on one of our announced dates. Nobody in this building believes in coincidence anymore. The staff have started calling them what they are.';
      case 'rivalry': return 'The internet has made it official: ' + rivalAct() + ' versus us is a RIVALRY now — capital letters, compilation videos, the works. Every shared release week from here is a scoreboard.';
      case 'showDarling': return 'Trophy after trophy from the same stage and the coverage found its line: ' + KP.showLabel((n.meta && n.meta.show) || 'countdown') + ' belongs to ' + group() + ' now. Champions get measured harder — enjoy it anyway.';
      case 'regionStronghold': return 'The trades noticed what the shipping manifests already knew: ' + group() + ' has a real overseas market now — ' + KP.regionLabel((n.meta && n.meta.region) || 'jp') + ' first among them. The word “tour” has started appearing in meetings uninvited.';
      case 'conceptIdentity': {
        const c = KP.conceptById((n.meta && n.meta.concept) || 'bright');
        return 'It is canon now: ' + group() + ' means ' + (c ? c.label.toLowerCase() : 'that sound') + '. Two eras deep and the public hears the group in the first four bars. An identity is free promotion — until the day you want to change it.';
      }
      case 'brandDarling': return 'Second campaign signed, and the industry noticed: ' + idol() + ' is who the brands call first now. Somewhere, every visual who was told the role “doesn’t monetize” is smiling.';
      case 'varietyMonster': return KP.fillPro('Second full panel run wrapped, and the industry has its label: ' + idol() + ' is a VARIETY MONSTER. Casting directors keep a chair warm, the clip compilations run twenty minutes, and half the general public knows {her} laugh before they know the group’s title track. That is not a side effect. That is a career.', state.people[n.subjectId]);
      case 'nationalMC': return KP.fillPro('A full run holding a live broadcast together, and the tone of the coverage changed: ' + idol() + ' is “trusted with the mic” now. The public lets very few faces open their evening. {Hers} is one of them, and every producer in the industry wrote that down.', state.people[n.subjectId]);
      case 'ostVoice': return KP.fillPro('Second drama, second OST, and the pattern has a name: ' + idol() + ' is the OST voice. Music directors ask for {her} before they finish casting the leads. The group gets {her} stages; the rest of the country gets {pos} voice over their favorite scene. Both are fame. Only one needed the group’s name to happen.', state.people[n.subjectId]);
      case 'genreShift': return 'The history books opened a new entry: ' + group() + ' made ' + ((n.meta && n.meta.mash) || 'a sound nobody had a name for') + ' real, on record, first. Every A&R meeting in the industry now contains the phrase “something like that.” Being copied is the sincerest form of panic.';
      case 'signatureSound': return 'Three records deep with ' + ((n.meta && n.meta.producer) || 'the same producer') + ', and the reviews stopped naming the producer because everyone already knows: ' + group() + ' has a SOUND now — recognizable from the first four bars, imitated within the quarter. A signature is an asset. It is also a cage with excellent acoustics.';
      case 'catalogRevival': return 'The trades needed a week to believe it: \u201c' + ((n.meta && n.meta.title) || 'an old track') + '\u201d re-entered the chart YEARS after its era, on nothing but word of mouth and one resurfaced clip. ' + group() + '\u2019s catalog is officially alive — every record they ever shipped is a lottery ticket that never expires, and the industry just watched one pay out.';
      case 'archRivals': return 'Nobody signed up for it and nobody can leave it: ' + group() + ' and ' + ((n.meta && n.meta.foe) || 'the other name') + ' are the scene\u2019s rivalry now \u2014 every chart week read as a scoreline, every stage as an answer, every year-end table as a verdict. The fandoms built trenches. The coverage built a franchise. The two groups, by several accounts, get along fine \u2014 which has never once mattered to a rivalry.';
      case 'biggerThan': return 'The trades finally printed the question every comment section has been asking: is ' + idol() + ' bigger than ' + ((n.meta && n.meta.group) || 'the group') + '? The numbers say maybe. The narratives say probably. The company says nothing, loudly. However this resolves \u2014 the solo, the hold, the door \u2014 it is now the story the whole scene is watching.';
      case 'festivalIcons': return 'It is official the way these things become official: ' + group() + ' are FESTIVAL ICONS. Third year running the fields, and now the organizers call them before they book the stage. The golden-hour fancams are a genre; the b-side singalongs are a tradition; spring has a lineup and they are on it by default.';
      case 'varietyGroup': return 'The industry has filed ' + group() + ' under a second heading: the VARIETY GROUP. Enough panel runs and MC stints across the lineup that casting directors call the company switchboard asking \u201cwho is free,\u201d not \u201cwho is funny\u201d \u2014 they already know everyone is. The music is the job; the shows are the empire.';
      case 'ostFactory': return group() + ' has become the industry\u2019s OST FACTORY \u2014 enough drama soundtracks across the lineup that music directors send scripts to the company before casting is finished. Somewhere right now a montage is being edited to a voice from this dorm, and everyone involved considers that the natural order.';
      case 'lastChanceDebut': return 'The profile writers all reached for the same file this week, because the file earned it: ' + idol() + ' trained for ' + ((n.meta && n.meta.years) || 'many') + ' years \u2014 watched other lineups post, bow, and walk out the door \u2014 and then debuted anyway. The industry runs on eighteen-year-olds and impatience, which is exactly why the one who outlasted the clock is the story everybody wanted to write.';
      default: return 'A narrative formed: ' + n.key;
    }
  }

  // ---- per-person tallies with thresholds -------------------------------
  // A first viral moment is luck; the second is a reputation. Same door
  // for both call sites (release sparks, pre-debut hype events).
  // v0.9.15 (owner: "fancams and viral reactions [should] come as a
  // result of actual stages... right now they just kind of happen with
  // no rhyme or reason"): every viral moment carries its PROVENANCE —
  // {kind, label} — stamped on the file, kept in the narrative, and
  // named in the coverage forever.
  KP.recordViral = function (state, person, source) {
    person.viralCount = (person.viralCount || 0) + 1;
    if (source && source.label) {
      person.lastViral = { week: state.week, kind: source.kind || 'clip', label: source.label };
      person.history.push({ week: state.week,
        text: 'Went viral: ' + source.label + '. The clip did the traveling.' });
    }
    // viral moments cross borders (v0.6.6) — hardest where she is loved
    if (KP.regionsOnViral) KP.regionsOnViral(state, person);
    // and the timeline's regulars notice (v0.7.3) — one adopts her
    if (KP.regularsNotice) KP.regularsNotice(state, person);
    if (person.viralCount >= KP.C.MEMORY.viralFormAt) {
      // 0.9.8.2 (owner: "fancams of what, exactly?") — a trainee has no
      // stages, so her virality is a different story: covers and clips,
      // the internet arriving before the debut does
      return KP.recordEvidence(state,
        person.status === 'idol' ? 'fancamStar' : 'oneToWatch', 'idol', person.id,
        source && source.label ? { source: source.label } : undefined);
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
      // rival identities: philosophy is destiny, and the world knows it
      // (v0.6.1 — seeded silently at world start, reinforced monthly,
      //  and a company that EMERGES later earns its line in public)
      (state.rivals || []).forEach(r => {
        const key = { trendChaser: 'trendCopier', performance: 'performanceFactory',
          patient: 'patientHouse' }[r.philosophy];
        if (key) {
          const note = KP.recordEvidence(state, key, 'rivalCompany', r.short);
          if (note) notes.push(note);
        }
      });
    }

    // dormancy: a debuted group gone quiet becomes a countdown — the
    // narrative forms the week the threshold crosses, then nags on cadence
    KP.groups(state).forEach(g => {
      if (!g.debuted || g.prep || g.retiredWeek) return;   // nobody counts down for a closed chapter (0.9.13)
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
