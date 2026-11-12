/* The staff (v0.10.6, §79) — the second fog. Six seats quietly
   multiply the systems they run: coaches move training, the
   performance director moves the stage, the scout moves who finds
   this building, A&R moves what the producers pitch, marketing moves
   what a push buys. The TRUTH — an aptitude and a style, hash-stable
   per person — never surfaces: no stat sheet, no reveal moment, no
   number in any blurb, ever. The player reads three crooked surfaces:
   personality (true, and not skill), the résumé (true facts,
   selection-biased — it says where somebody was, never what they did
   there), and reputation (the PRICE, imperfectly correlated with
   truth by construction: some names ride one misattributed credit;
   some unknowns are the genius nobody caught). Mesh — the style
   against YOUR setup — is discoverable only by working together, and
   the notes hint at friction in prose long before any number would.
   Firing a genius because the kids were weak is the tragedy; keeping
   a dud because the name reassures the board is the trap. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  function ledger(state) {
    state.staffLedger2 = state.staffLedger2 ||
      { candidates: 0, hires: 0, passes: 0, repRises: 0, poachCalls: 0,
        raises: 0, walked: 0, notes: 0, meshNotes: 0 };
    // a call left unanswered (v0.11.52, §145) — healed lazily
    if (state.staffLedger2.unanswered == null) { state.staffLedger2.unanswered = 0; state.staffLedger2.unansweredCharged = 0; }
    // the help wanted (v0.10.11) — fields added post-ship, healed lazily
    if (state.staffLedger2.searches == null) {
      state.staffLedger2.searches = 0;
      state.staffLedger2.fired = 0;
    }
    // the market remembers (v0.11.5, §96 wiring) — healed lazily
    if (!state.staffLedger2.passed) state.staffLedger2.passed = [];
    // and the desk remembers who came through the door (v0.11.43, §135)
    if (!state.staffLedger2.met) state.staffLedger2.met = [];
    return state.staffLedger2;
  }
  KP.hiresLedger = ledger;
  // a name the desk passed on stays in the market's memory for a season,
  // capped; the weekly reads it back when one of them takes a chair
  function rememberPass(state, cand) {
    const HR = KP.C.HIRES;
    const led = ledger(state);
    if (!cand || !cand.name) return;
    led.passed.push({ name: cand.name, seatId: cand.seatId, week: state.week });
    if (led.passed.length > HR.passMemoryCap) led.passed = led.passed.slice(-HR.passMemoryCap);
  }

  // the records a studio chair has made for THIS house: the ones that landed after they sat down in it (v0.11.40,
  // §132). An old file may hold a chair that came across at a founding with records made for the house it left,
  // and a record that landed the very week a chair was taken landed before it was
  // read with a last week, it is what landed up to and in that week: a year's (§139)
  KP.seatMade = function (st, from, to) { return (st.works || []).filter(w => !(w.week <= (from != null ? from : st.since)) && !(w.week > to)); };

  // ---- the credit (v0.11.41, §133): what this house did after a chair was taken. The résumé's own law (§79): it
  // says where they were, never what they did there. Read off the file, and nothing is kept. A chair that works an
  // era is credited with the eras that landed after they sat, by how each closed; a studio chair with the records
  // made here; the scout with who on the roster signed on their watch
  // read from a week other than the one the chair was taken, it is the credit since that week; read with a last
  // week as well, it is the credit of the weeks after the one and up to the other: a year's (§134, §139)
  KP.seatCredit = function (state, st, from, to) {
    const since = from != null ? from : st.since;
    if (KP.C.HIRES.SEATS.some(x => x.id === st.seatId && x.studio)) return { kind: 'records', n: KP.seatMade(st, since, to).length };
    if (st.seatId === 'scout') {
      const roster = state.roster.map(id => state.people[id]).filter(Boolean);
      const found = roster.filter(p => p.signedWeek > since && !(p.signedWeek > to));
      return { kind: 'floor', n: found.length, of: roster.length, debuted: found.filter(p => p.status === 'idol').length };
    }
    const c = { kind: 'eras', n: 0, crowned: 0, warm: 0, quiet: 0, cold: 0, running: 0 };
    KP.groups(state).forEach(g => (g.releases || []).forEach((rel, i, all) => {
      if (!(rel.week > since) || rel.week > to) return;
      c.n++;
      if (rel.closed) c[rel.closed.verdict]++;
      else if (i === all.length - 1 && !g.retiredWeek && state.week <= (g.promoUntil || 0)) c.running++;
      else c[KP.eraVerdict(rel)]++;   // an era from before closes were kept, or one that never came to its close
    }));
    return c;
  };
  const one = n => (n === 1 ? 'one' : String(n));
  const HOW = [['crowned', 'with a trophy'], ['warm', 'warm'], ['quiet', 'quietly'], ['cold', 'cold']];
  // in full, for the chair's own card and for the roll. A studio chair's count is the card's chip. The words were
  // made plainer in v0.11.47 (§140; the owner's ruling, §136: 27): they still say where a chair was, and never
  // what it was worth there
  // of a house this desk has left, the same words are said of then and there: `shut` is how that house closed to
  // the desk ("the desk left", "HCG folded"), and an era running that day is said to have been running that day
  KP.seatCreditSaid = function (c, shut) {
    if (!c.n || c.kind === 'records') return '';
    if (c.kind === 'floor') {
      return 'Ran scouting when ' + one(c.n) + ' of the ' + c.of + ' on the roster signed' +
        (c.debuted ? ', ' + one(c.debuted) + ' of whom ' + (shut ? 'had' : c.debuted === 1 ? 'has' : 'have') + ' debuted' : '') + '.';
    }
    const said = 'Worked on ' + (c.n === 1 ? 'one era' : c.n + ' eras') + (shut ? ' there' : ' here') + erasStand(c) + '.';
    return shut ? said.replace(/still running\.$/, 'still running when ' + shut + '.') : said;
  };
  // how a count of eras stands, to follow the count: ", which closed warm", ", all still running", ": 3 closed with a trophy, 2 warm"
  function erasStand(c) {
    const closed = HOW.filter(h => c[h[0]]);
    if (c.n === 1) return ', ' + (closed.length ? 'which closed ' + closed[0][1] : 'still running');
    if (!closed.length) return ', all still running';
    if (closed.length === 1 && c[closed[0][0]] === c.n) return ', all closed ' + closed[0][1];
    return ': ' + closed.map((h, i) => one(c[h[0]]) + (i ? ' ' : ' closed ') + h[1]).join(', ') + (c.running ? '; ' + one(c.running) + ' still running' : '');
  }
  // in a clause, for a call from outside and for a goodbye: the count, the house by its name, and the best of it.
  // A credit that crosses the street is read there, so it names the house
  KP.seatCreditShort = function (c, house) {
    if (!c.n) return '';
    const at = house || 'this house';
    if (c.kind === 'records') return one(c.n) + (c.n === 1 ? ' record' : ' records') + ' made at ' + at;
    if (c.kind === 'floor') return one(c.n) + ' of the ' + c.of + ' on ' + at + '’s roster, signed while they ran scouting';
    const best = c.crowned ? ['crowned', 'closed with a trophy'] : c.warm ? ['warm', 'closed warm'] : null;
    return one(c.n) + (c.n === 1 ? ' era' : ' eras') + ' at ' + at +
      (!best ? '' : c.n === 1 ? ', ' + best[1] : ', ' + one(c[best[0]]) + ' of them ' + best[1]);
  };
  // what a chair takes out of the door: one sentence, or nothing when there is nothing to take
  KP.seatLeavesWith = function (state, st) {
    const said = KP.seatCreditShort(KP.seatCredit(state, st), state.company.short);
    return said ? ' ' + st.name + ' leaves with this on the résumé: ' + said + '.' : '';
  };
  // a résumé line as files wrote it before v0.11.47, in the plainer words: the facts are the ones it held
  const RESUME_WAS = { 'here since the beginning — the résumé is this company': 'here since the beginning; this company is the whole résumé',
    'here since the founding — the résumé is this label': 'here since the founding; this label is the whole résumé',
    'here before you — the résumé is this company': 'here before you came; this company is the whole résumé' };
  KP.resumePlain = function (line) {
    const s = String(line);
    if (RESUME_WAS[s]) return RESUME_WAS[s];
    const a = /^(\d+) years in, most recently at (.+)$/.exec(s);
    if (a) return a[1] + ' years in the industry, most recently at ' + a[2];
    const b = /^was in the room for (.+)$/.exec(s);
    return b ? 'worked through ' + b[1] : s;
  };
  // what the trades know a name for, as a person says it (§140): the chair's own work, not its title
  const KNOWN = { vocal: 'vocal coaching', dance: 'dance coaching', perf: 'staging', scout: 'scouting', anr: 'A&R', marketing: 'marketing' };
  KP.knownForSaid = function (tag) { return KNOWN[tag] || ((KP.C.HIRES.SEATS.find(x => x.id === tag) || {}).label || String(tag)); };

  // ---- the roll (v0.11.47, §140; the owner's ruling, §136: 21). Everyone who has sat a chair of a house this
  // desk has run, and gone: kept for good, with the chair, the weeks, how they went, and the credit as the file
  // read it the day they went (§133). An era still running that day is read again until it has closed. When the
  // desk leaves a house, or the house folds, the roll of that house closes as it stands: the records it was read
  // from stay behind, so every line of it is shut (`shut` is how the house closed) and is never read again,
  // whatever the next house is called. Nothing here is drawn, and nothing reads the roll back into the simulation
  const ROLL_HOWS = ['released', 'replaced', 'walked', 'lapsed', 'stayed', 'folded'];
  KP.rollHows = () => ROLL_HOWS.slice();
  KP.staffRoll = function (state) { return state.staffRoll || (state.staffRoll = []); };
  // who was signed on the scout's watch is written on each of them, once: the name stays on the file of everyone
  // they brought in, whoever sits in the chair after. The law is the credit's own: signed after the chair was taken
  KP.signedStamp = function (state) {
    const sc = (state.seats || {}).scout;
    if (!sc) return;
    (state.roster || []).forEach(id => { const p = state.people[id];
      if (p && p.signedUnder === undefined && p.signedWeek > sc.since) p.signedUnder = sc.name; });
  };
  KP.seatGoes = function (state, st, how, more) {
    if (st.seatId === 'scout') KP.signedStamp(state);
    const e = Object.assign({ id: st.id, name: st.name, seatId: st.seatId, house: state.company.short, since: st.since, until: state.week, how,
      credit: KP.seatCredit(state, st) }, more || {});
    if (st.word) e.word = { week: st.word.week, text: st.word.text };
    KP.staffRoll(state).push(e);
    return e;
  };
  // the eras that were running the day a chair went, read again while this house's records are on the file. A
  // record that lands after they went is not theirs: the read stops at the week they went
  KP.rollSettle = function (state) {
    (state.staffRoll || []).forEach(e => {
      if (!e.shut && e.credit.kind === 'eras' && e.credit.running) e.credit = KP.seatCredit(state, { seatId: e.seatId, since: e.since }, e.since, e.until);
    });
  };
  // the house closes to this desk: every chair still sat goes on the roll as it stands, read while the records are
  // here, and every line of this house is shut
  KP.rollHouseCloses = function (state, how) {
    KP.rollSettle(state);
    const S = state.seats || {};
    const went = KP.C.HIRES.SEATS.filter(x => S[x.id]).map(x => KP.seatGoes(state, S[x.id], how));
    KP.staffRoll(state).forEach(e => { if (!e.shut) e.shut = how; });
    return went;
  };
  // one line of the roll, as the Building tab says it
  KP.rollSaid = function (state, e) {
    const seat = KP.C.HIRES.SEATS.find(x => x.id === e.seatId) || { label: e.seatId };
    const how = e.how === 'released' ? 'let go' : e.how === 'replaced' ? 'replaced' + (e.by ? ' by ' + e.by : '')
      : e.how === 'walked' ? 'went to ' + (e.to || 'another house') : e.how === 'lapsed' ? 'went to ' + (e.to || 'another house') + ' on an offer left unanswered'
      : e.how === 'stayed' ? 'stayed with ' + e.house + ' when the desk left' : 'there when ' + e.house + ' folded' + (e.to ? ', and went to ' + e.to : '');
    const shut = !e.shut ? '' : e.shut === 'folded' ? e.house + ' folded' : 'the desk left';
    const credit = e.credit.kind === 'records' ? (e.credit.n ? 'Made ' + one(e.credit.n) + (e.credit.n === 1 ? ' record' : ' records') + (shut ? ' there.' : ' here.') : '')
      : KP.seatCreditSaid(e.credit, shut);
    return { name: e.name, label: seat.label, from: e.since, to: e.until, how, credit, word: e.word || null };
  };
  // who was in the room when a record landed: the five rooms' chairs sat before this week, by name. The record
  // keeps the names as its booklet keeps its writers': a chair that goes is still on every record it worked on
  KP.roomNames = function (state) {
    const S = state.seats || {}, room = {};
    KP.C.HIRES.SEATS.forEach(x => { if (!x.studio && x.id !== 'scout' && S[x.id] && S[x.id].since < state.week) room[x.id] = S[x.id].name; });
    return room;
  };
  KP.roomSaid = function (room) {
    const SHORT = { vocal: 'vocal', dance: 'dance', perf: 'staging', anr: 'A&R', marketing: 'marketing' };
    return KP.C.HIRES.SEATS.filter(x => room && room[x.id]).map(x => room[x.id] + ' (' + SHORT[x.id] + ')').join(', ');
  };

  // ---- the staff's year (v0.11.46, §139; the owner's ruling, §136: 22, 26 and 33). The yearly word (v0.11.42,
  // §134) was said in the week each chair was taken, a letter the week could not cut each time: 3.8 of them in a
  // career's year, eight in the worst, and three times in ten a chair said the very sentence it said the year
  // before. It is one letter now, in the first week of the new year, with each chair's word on a line of its own.
  // A word is two parts. The first is what the room did, the year's credit (§133) in the chair's voice (§79): a
  // candid one says what it cannot know, a careful one sands it. The second is what is most telling of the chair's
  // own year: the desk kept them after a call, the desk advertised their chair, the corridor's read of their
  // method, being new, a long tenure, and how they work, by their style and their warmth. Every line says only
  // what the file holds, and a chair that came during the year speaks of its own weeks and not of the year. The
  // wordings of a cell take turns by the year, so no chair says one twice running. No sentence is in two wordings,
  // and no two chairs of one letter say the same thing of themselves. No draw is made anywhere here
  // `¤` is the span a chair speaks of: 'last year', or 'in my weeks here' from one that came during it
  const ROOM = {
    vocal: { candid: ['Every voice on a record ¤ came through my room. How much of what you heard was the room, I could not tell you.',
      'The voices on the records ¤ were worked in my room first. I heard them get better. What the room gave and what they brought, I cannot split.',
      'I had every voice that went on a record ¤ in my room before it went on. I know what we worked on. I do not know what you heard.'],
      careful: ['The vocal room did its part.', 'The vocal room kept to its plan.', 'The records speak for the vocal room.'] },
    dance: { candid: ['The counts under every record ¤ were drilled in my room. Whether the drilling is what you saw, I would not swear to.',
      'The records ¤ went on stage on counts from my room. Clean on the night is the room, or it is the night. I cannot tell you which.',
      'I drilled the counts under every record ¤. A count can be right in my room and wrong under the lights, and I only see the room.'],
      careful: ['The dance room did its part.', 'The dance room ran its weeks as planned.', 'The counts were drilled, record by record.'] },
    perf: { candid: ['I ran the rehearsals behind every record ¤. A stage can go wrong after a good rehearsal, and right after a bad one.',
      'Every record ¤ was rehearsed under me before it saw a stage. I know which rehearsals were good. I do not know which of them mattered.',
      'Every record ¤ went to its stages through my rehearsals. I can vouch for the rehearsals. The stages are somebody else’s to judge.'],
      careful: ['The rehearsals ran to schedule.', 'Every record ¤ was rehearsed on time.', 'The rehearsal room met its dates.'] },
    anr: { candid: ['Every demo that became a record ¤ crossed my desk first. I can tell you what I liked. I cannot tell you what I was right about.',
      'The records ¤ began as demos on my desk. I backed some and doubted some, and I still cannot say which habit was the better one.',
      'I read the demos behind every record ¤ before anyone sang a line. Reading a demo and knowing a record are different skills, and I only have proof of the first.'],
      careful: ['The demo sheet was in order.', 'The demos were read and the sheet was kept.', 'Every record ¤ had its demos read first.'] },
    marketing: { candid: ['Every push behind a record ¤ was planned on my desk. What a push bought and what a record earned alone, nobody can pull apart.',
      'The campaigns behind the records ¤ were mine. A record that lands flatters its campaign, and one that does not blames it. Neither tells me what the campaign did.',
      'I planned the campaign for every record ¤. I can show you the plans. I cannot show you the same records without them.'],
      careful: ['The campaigns ran as planned.', 'Each release ¤ had its campaign, on schedule.', 'The campaign desk covered every release ¤.'] },
  };
  // no record went out: each room says it of itself. A line says only what the read holds, that no record went
  // out: a stretch without a record can still have had a stage, a tour or a record in the making
  const QUIET = {
    vocal: { candid: ['No record went out ¤ with a voice from my room on it, so there is nothing of mine to point at.',
      'No record carried a voice from my room ¤. I would rather tell you that than talk around it.'],
      careful: ['Nothing went out ¤. The vocal room is ready.', 'No record ¤. The vocal room stands ready.'] },
    dance: { candid: ['There was no record ¤, so nobody has seen what my room’s counts look like under one.',
      'My room’s counts went under no record ¤. Ask me again when one is out.'],
      careful: ['Nothing to report from the dance room ¤.', 'The dance room had no record to work to ¤.'] },
    perf: { candid: ['No record went out ¤ for my room to stage. I cannot tell you what the room would have done.',
      'There was no record ¤ for my room to put on a stage. What it would have made of one, neither of us knows.'],
      careful: ['No record to stage ¤. The rehearsal room is ready.', 'No record came to the rehearsal room ¤.'] },
    anr: { candid: ['No demo became a record ¤. I have a drawer of them and no proof.',
      'Not one demo became a record ¤. I still think some of them should, and I cannot prove that from a drawer.'],
      careful: ['A quiet stretch for the demo sheet ¤.', 'No demo went to record ¤. The sheet is current.'] },
    marketing: { candid: ['A campaign needs a record, and there was none ¤. My desk has plans and nothing to show for them.',
      'There was no record ¤ to put a campaign behind. I have nothing of mine to show you.'],
      careful: ['No release ¤, so no campaign.', 'The campaign desk had no record ¤.'] },
  };
  // one of the eras closed with a trophy, or every one of them closed cold. A candid chair says so of its own
  // part, and no more than the read holds. A careful one sands it as it sands every year
  const CROWNED = {
    vocal: ['A record with my room’s voices on it closed with a trophy ¤. I would like to say the room did that. I can say the room was there.',
      'There is a trophy in the building, and the voices on that record were worked in my room. How much of the trophy is the room’s, I could not tell you.',
      'The room’s voices are on a record that took a trophy ¤. I heard those takes before the trophy did, and I could not have told you which would matter.'],
    dance: ['A record closed with a trophy ¤ on counts drilled in my room. A trophy has many parents, and I will not pretend to be the only one.',
      'There is a trophy in the building, and my room drilled the counts that went with it. Whether the drilling won anything, I would not swear to.',
      'A record ¤ took a trophy on counts from my room. I counted them in. I did not count on that.'],
    perf: ['I rehearsed a record that closed with a trophy ¤. The rehearsal did not win it, and it did not lose it either.',
      'A record I rehearsed closed with a trophy ¤. I know what I did in the rehearsal room. I do not know what the trophy was for.',
      'A record that went through my rehearsals took a trophy ¤. I ran the same rehearsal for the ones that did not.'],
    anr: ['A demo that crossed my desk became a record with a trophy ¤. I would like to say I knew. I can say I did not stop it.',
      'There is a trophy in the building for a record that began on my demo sheet. I liked it then. Liking it was the easy part.',
      'A record from my demo sheet took a trophy ¤. I have been wrong about demos I liked more.'],
    marketing: ['The campaign behind a trophy ¤ was planned on my desk. A trophy makes every campaign look clever afterwards.',
      'A record my desk pushed closed with a trophy ¤. What the push bought and what the record earned, the trophy does not say.',
      'A record my desk campaigned for took a trophy ¤. I would not want to be asked to do it twice on purpose.'],
  };
  const all = n => (n === 1 ? 'The one record' : 'Every record');
  const COLD = {
    vocal: n => [all(n) + ' ¤ closed cold, with my room’s voices on it. I have gone over the room’s part and cannot find the answer there. That is not the same as it not being there.',
      'It was a cold stretch for the records, and the voices on them were worked in my room. Some of the cold is ours. I do not know how much.'],
    dance: n => [all(n) + ' ¤ closed cold, on counts drilled in my room. I have watched the stages back, and I still cannot tell you what the room should have done differently.',
      'A cold stretch for the records my room drilled. I would rather tell you that plainly than wait to be asked.'],
    perf: n => [all(n) + ' I rehearsed ¤ closed cold. A rehearsal cannot save a record, and I do not know that mine tried hard enough.',
      'It was a cold stretch for the records I rehearsed. I have my own notes on why. They are guesses.'],
    anr: n => [all(n) + ' that began on my desk ¤ closed cold. That is my sheet, and I am the one who should say so.',
      'It was a cold stretch for the records I backed as demos. I would rather be asked why than not be asked.'],
    marketing: n => [all(n) + ' my desk pushed ¤ closed cold. A campaign cannot make a record land, and I cannot prove mine did not help it miss.',
      'A cold stretch for the releases my desk pushed. Some of that is the campaign. How much, I cannot measure.'],
  };
  // a count as a person says it, to open a sentence
  const SAID = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
  const Said = n => SAID[n] || String(n);
  const yearsSaid = n => (n === 1 ? 'a year' : Said(n).toLowerCase() + ' years');
  // the scout, by who of the roster signed; a studio chair, by the records it made here, and each craft in its
  // own words: the two chairs of one craft never have the same turn
  const FLOOR = n => ({ candid: [Said(n) + ' of the roster signed ¤. Whether ' + (n === 1 ? 'that was the right one' : 'they were the right ones') + ' is a question for the year of the debut.',
    Said(n) + ' of the roster joined ¤, while the board was mine. A signing is a guess that takes years to mark.'],
    careful: [Said(n) + ' signed ¤. The pipeline is where it should be.', Said(n) + (n === 1 ? ' signing' : ' signings') + ' ¤. The board is in order.'] });
  const FLOOR_NONE = { candid: ['Nobody on the roster signed ¤, so I have nothing to point at.',
    'Nobody now on the roster joined ¤. A quiet board is not an empty one, and I cannot show you the difference.'],
    careful: ['No signing to report ¤. The desk stays open.', 'The roster added nobody ¤. The board is current.'] };
  const SHELF = {
    producer: n => ({ candid: [Said(n) + ' of this house’s records ¤ ' + (n === 1 ? 'was my production. It is on the shelf with my name on it' : 'were my productions. They are on the shelf with my name on them') + ', for better or worse.',
      'I produced ' + Said(n).toLowerCase() + ' of this house’s records ¤. You have heard ' + (n === 1 ? 'it. I am too close to it to tell you what it is.' : 'them. I am too close to them to tell you what they are.')],
      careful: [Said(n) + (n === 1 ? ' production' : ' productions') + ' for the house ¤. More when the calendar asks.', Said(n) + (n === 1 ? ' production' : ' productions') + ' delivered ¤.'] }),
    writer: n => ({ candid: ['I wrote ' + Said(n).toLowerCase() + ' of this house’s records ¤. A song stops being yours the day it is sung, and I could not tell you what ' + (n === 1 ? 'it is' : 'they are') + ' now.',
      Said(n) + ' of this house’s records ¤ ' + (n === 1 ? 'has' : 'have') + ' my name under the title. Whether the writing is why anyone stayed to the end, I cannot say.'],
      careful: [Said(n) + ' of the records ¤ ' + (n === 1 ? 'carries' : 'carry') + ' my writing.', Said(n) + (n === 1 ? ' writing credit' : ' writing credits') + ' for the house ¤.'] }),
  };
  const SHELF_NONE = {
    producer: { candid: ['No record of mine went out ¤. I would rather say it than have you look for one.',
      'Nothing I produced reached the shelf ¤. That is the whole of my report.'],
      careful: ['No production under my name ¤. The lane is ready.', 'My studio put nothing on the shelf ¤. Ready when asked.'] },
    writer: { candid: ['Nothing I wrote was recorded ¤. The pages exist. That is all I can say for them.',
      'No song of mine went out ¤. I have opinions about that, and no evidence.'],
      careful: ['No writing credit ¤. The desk is clear.', 'Nothing of mine was recorded ¤. Available when wanted.'] },
  };
  // nothing again, a second whole year running or more: the chair counts the years, so no two of them read alike
  const Years = n => { const y = yearsSaid(n); return y.charAt(0).toUpperCase() + y.slice(1); };
  const FLOOR_DRY = n => ({ candid: ['That is ' + yearsSaid(n) + ' running with nobody on the roster signed on my watch, and I know how that reads.',
    Years(n) + ' now without a signing that stayed, and a scout is paid for the ones who stay.'],
    careful: [Years(n) + ' without a signing to report.', 'No signing to report, ' + yearsSaid(n) + ' running.'] });
  const SHELF_DRY = {
    producer: n => ({ candid: ['That is ' + yearsSaid(n) + ' running with nothing of mine on the shelf, and I would rather you heard the count from me.',
      Years(n) + ' now without a production of mine going out, and I have kept count in case nobody else has.'],
      careful: [Years(n) + ' without a production under my name.', 'No production under my name, ' + yearsSaid(n) + ' running.'] }),
    writer: n => ({ candid: ['That is ' + yearsSaid(n) + ' running with nothing I wrote recorded, and the pages have piled up with the count.',
      Years(n) + ' now without a song of mine going out, and I notice it more each year.'],
      careful: [Years(n) + ' without a writing credit.', 'No writing credit, ' + yearsSaid(n) + ' running.'] }),
  };
  // the second part. What has passed between the desk and the chair, by how the chair answers:
  const KEPT = { candid: ['Somebody rang for me last year and you answered it. I have not forgotten which of us picked up the bill.',
    'You matched an offer for me last year. I have thought about what I would have done if you had not.'],
    careful: ['The matter of the outside offer is closed, with thanks.', 'I was glad to stay.'] };
  const POSTED = { candid: ['I saw the posting for my chair last year. I am still in it, and I have drawn my own conclusions.',
    'You advertised my chair while I sat in it. I noticed. So did the corridor.'],
    careful: ['I understand the chair was advertised last year. I have carried on.', 'The posting has been noted.'] };
  const CORRIDOR = { candid: ['I know what the corridor says about my method and this house. The corridor may be right.',
    'My way of working and this building have not met in the middle yet. I can hear that as well as anyone.'],
    careful: ['There has been talk about fit. I would rather let the work answer it.', 'I am aware of the talk about method.'] };
  // a call for another chair that the desk left unanswered (v0.11.52, §145): what the ones still sat say of it
  const WATCHED = name => ({ candid: ['An offer for ' + name + ' sat on your desk last year until it answered itself. I watched that from down the hall.',
    name + ' went last year on a call nobody answered. I have wondered since what mine would get.'],
    careful: [name + '’s departure last year has been noted down the hall.', 'The building noticed how ' + name + '’s offer ended.'] });
  // and the chair's own time here, by how the chair is in a room:
  const FIRST = { warm: ['I am new here, and the building let me in faster than I expected.', 'A first year is mostly learning names. I know them now.'],
    reserved: ['I am still new here. I am still finding where things are kept.', 'A first year. I have kept to my room and learned the hours.'] };
  const LONG = n => ({ warm: [Years(n) + ' in this chair. It stopped feeling like a posting some time ago.',
    'After ' + yearsSaid(n) + ' I know this building’s moods better than my own.'],
    reserved: [Years(n) + ' in this chair. The work is the same and so am I.', 'After ' + yearsSaid(n) + ' the chair fits. That is all I will say about it.'] });
  const STYLE_SAYS = {
    drillmaster: { warm: ['I start at eight and I expect company. I would do it again tomorrow, gladly.',
      'I am hard on people before noon because I like them. They have worked that out.',
      'They think I do not hear them laugh when I leave the room. I hear it. I am glad of it.'],
      reserved: ['I start on time and I finish what is on the list. That has not changed.', 'The standard was the standard. I do not grade on mood.',
        'I was not hired to be liked, and I have kept to the terms.'] },
    nurturer: { warm: ['I know how everyone on this floor takes their coffee, and I can tell when one of them has not slept.',
      'People come to my door before they come to yours. I take that as the job.',
      'Half of what I do is listening. The other half is pretending I was not.'],
      reserved: ['I keep an eye on who is tired. I do not make a show of it.', 'I notice more than I say. That is how I look after people.',
        'When someone is struggling I say less and stay later. It works.'] },
    bigMachine: { warm: ['Give me a floor of departments and I am happy. I have been happy here, whatever the floor plan.',
      'I think in quarters and org charts, and I have tried not to bore the room with either.',
      'I like a house where everybody knows whose job it is. I am getting this one there, cheerfully.'],
      reserved: ['I work best with a structure around me. I have built what structure the house allows.', 'I report by the quarter. This one is on time.',
        'A process is only dull until it saves you. I keep mine.'] },
    scrappy: { warm: ['I have done this job with less, and I liked doing it with these people.',
      'Two hands and no budget is how I learned. A budget is a luxury, and so is this lot.',
      'Give me a borrowed room and people who turn up. I have both, and I am not complaining.'],
      reserved: ['I have done this job with less. I have not asked for more.', 'I make do. I always have.',
        'What the house could not buy, I worked around. That is the job as I know it.'] },
    classicist: { warm: ['Fundamentals first, every week. People groan, and then they thank me, usually in that order.',
      'I teach the basics, with affection, to people who think they are past them.',
      'Nobody is too good for the basics. I say it kindly, and I say it often.'],
      reserved: ['The fundamentals do not change with the charts. Neither did my weeks.', 'I kept to the basics. They keep.',
        'What worked before the charts existed still works. I do not chase the rest.'] },
    trendChaser: { warm: ['I brought this week’s numbers to every meeting, and somebody always laughed. I enjoy that.',
      'I chase what is moving. Here it has been fun to chase.',
      'Ask me what is big next month and I will tell you, happily, and I will be wrong in a new way each time.'],
      reserved: ['I read the numbers every week. Last year’s do not interest me.', 'I follow what is moving. I do not explain it.',
        'By the time a thing has a name it is over. I try to be gone before that.'] },
  };
  // the first week of a year: the year behind it is the one the staff speak of. It is the year the books closed
  // the week before (§124): the weeks after `open`, up to `close`, and at a house the desk came to in the year,
  // the weeks since it came
  KP.staffYearDue = function (state) { return state.week > 1 && state.week % KP.C.WEEKS_PER_YEAR === 1; };
  const yearBehind = state => { const close = state.week - 1; return { open: close - KP.C.WEEKS_PER_YEAR, close }; };
  // a cell read from its k-th wording on, and round again
  const turned = (list, k) => list.map((x, i) => list[(i + k) % list.length]);
  const sentencesOf = text => String(text || '').split(/(?<=[.?!]) /).filter(Boolean);
  // one chair's word on the year behind it: { text, first, second, dry }. `taken` is what other chairs of this
  // letter have said of themselves, sentence by sentence. Whose turn it is: the year's, and the chair's own start
  // in it, which is its hash. The two chairs of one craft start a wording apart, whoever sits in them. In a year
  // the house put out nothing (`quiet`), the letter's first line has said so, and a room does not say it again
  KP.seatYearWord = function (state, st, taken, quiet) {
    const Y = KP.C.WEEKS_PER_YEAR, yb = yearBehind(state);
    const whole = (st.since || 0) <= Math.max(yb.open, 1);   // sat the year through: a chair sat in a career's first week sat its first year
    const inYear = w => w > yb.open && w <= yb.close;
    const c = KP.seatCredit(state, st, Math.max(yb.open, st.since || 0), yb.close);
    const seat = KP.C.HIRES.SEATS.find(x => x.id === st.seatId) || {};
    const k = Math.floor(yb.close / Y) + (seat.studio ? (seat.second ? 1 : 0) : Math.floor(h(state, st.id, 'yw') * 6));
    const voice = st.candor >= 50 ? 'candid' : 'careful', manner = st.warmth >= 50 ? 'warm' : 'reserved';
    // a candid chair speaks of the trophy, or of every record gone cold; a careful one says what it says of any year
    const room = c.kind !== 'eras' ? null : !c.n ? QUIET[st.seatId][voice]
      : voice === 'candid' && c.crowned ? CROWNED[st.seatId] : voice === 'candid' && c.cold === c.n ? COLD[st.seatId](c.n) : ROOM[st.seatId][voice];
    const craft = seat.second || st.seatId;
    // whole years running with nothing to show, this one counted: the scout's and the studio's, whose years are their own
    const ran = (st.word || {}).week === state.week - Y ? st.word.dry || 0 : 0;
    const dry = c.n || room || !whole ? 0 : ran + 1;
    const cell = room || (c.kind === 'floor' ? (c.n ? FLOOR(c.n) : dry > 1 ? FLOOR_DRY(dry) : FLOOR_NONE)[voice]
      : (c.n ? SHELF[craft](c.n) : dry > 1 ? SHELF_DRY[craft](dry) : SHELF_NONE[craft])[voice]);
    const first = turned(cell, k)[0].replace('¤', whole ? 'last year' : 'in my weeks here');
    const sat = state.week - (st.since || 0);
    // what is most telling of the chair's own year, the first that the file holds
    const own = inYear(st.keptWeek) ? KEPT[voice] : inYear(st.postedWeek) ? POSTED[voice]
      : st.sawUnanswered && inYear(st.sawUnanswered.week) ? WATCHED(st.sawUnanswered.name)[voice] : inYear(st.meshNoted) ? CORRIDOR[voice]
      : sat <= Y && (st.since || 0) > KP.deskSince(state) ? FIRST[manner]   // not the chairs a building opened with: only one who came to a house already running
      : null;
    // then a long tenure and how they work, which take the years in turn
    const style = turned((STYLE_SAYS[st.style] || STYLE_SAYS.scrappy)[manner], k);
    const long = sat >= 4 * Y ? turned(LONG(Math.floor(sat / Y))[manner], Math.floor(k / 2)) : [];
    const used = Object.assign({}, taken);
    sentencesOf((st.word || {}).second).forEach(x => { used[x] = true; });
    // the first of them with no sentence another chair of the letter has said or this chair said last year; and
    // if every one is taken, the first part alone
    const second = (own ? turned(own, k) : []).concat(k % 2 ? style.concat(long) : long.concat(style))
      .filter(x => !sentencesOf(x).some(y => used[y]))[0] || '';
    if (quiet && room && second) return { text: second, first: '', second, dry };
    return { text: first + (second ? ' ' + second : ''), first, second, dry };
  };
  // how long a chair has been sat, as a line of the letter says it
  const tenureSaid = weeks => (weeks < 2 ? 'just arrived'
    : weeks < KP.C.WEEKS_PER_YEAR ? (SAID[weeks] ? SAID[weeks].toLowerCase() : weeks) + ' weeks in' : yearsSaid(Math.floor(weeks / KP.C.WEEKS_PER_YEAR)) + ' in');
  // the letter, and what each chair said in it: a line a chair, in the building's order, each under its name and
  // its title, so two of one name are told apart (§138). Nothing is written on the file here: the rail keeps the words
  KP.staffYearLetter = function (state) {
    const HR = KP.C.HIRES, Y = KP.C.WEEKS_PER_YEAR, S = state.seats || {};
    const sat = HR.SEATS.filter(x => S[x.id]).map(x => S[x.id]);
    if (!sat.length) return null;
    const label = st => HR.SEATS.find(x => x.id === st.seatId).label;
    const yb = yearBehind(state);
    const house = KP.seatCredit(state, { seatId: 'vocal', since: 0 }, Math.max(yb.open, KP.deskSince(state) - 1), yb.close);   // the year as its books counted it
    const year = Math.floor(yb.close / Y);
    const taken = {}, words = {};
    const lines = sat.map(st => {
      const weeks = state.week - (st.since || 0);
      if (weeks < HR.wordAfter) return st.name + ', ' + label(st) + ', ' + tenureSaid(weeks) + ': too new to the chair for a word on the year.';
      const w = KP.seatYearWord(state, st, taken, !house.n);
      sentencesOf(w.second).forEach(x => { taken[x] = true; });
      words[st.seatId] = w;
      return st.name + ', ' + label(st) + ', ' + tenureSaid(weeks) + ': “' + w.text + '”';
    });
    if (!Object.keys(words).length) return null;   // a building too new for anyone in it to speak of the year
    const text = 'Year ' + year + ', as the staff tell it. The house put out ' +
      (house.n ? (house.n === 1 ? 'one era' : house.n + ' eras') + erasStand(house) : 'nothing, so no room has a record to speak of') + '.\n' + lines.join('\n');
    return { kind: 'company', ind: 'seatYear', priority: 'critical', year, seats: Object.keys(words), words, text };
  };
  KP.registerWeekly('seatYears', 792, function (state, rng, inbox) {
    if (!KP.staffYearDue(state)) return;
    const letter = KP.staffYearLetter(state);
    if (!letter) return;
    // the card keeps the word (§136: 33): each chair's last, with the week it was said
    Object.keys(letter.words).forEach(seatId => { const w = letter.words[seatId];
      state.seats[seatId].word = { week: state.week, text: w.text, second: w.second, dry: w.dry }; });
    delete letter.words;
    inbox.push(letter);
  });

  // ---- the second chair (v0.10.39, §91 B2): a second studio chair opens
  // only when the first has records to show — a building earns depth
  KP.chairOpenable = function (state, seatId) {
    const HR = KP.C.HIRES;
    const seat = HR.SEATS.find(x => x.id === seatId);
    if (!seat) return false;
    if (!seat.second) return true;
    const first = (state.seats || {})[seat.second];
    return !!(first && KP.seatMade(first).length >= HR.secondChairAfter);
  };
  KP.chairOpenReason = function (state, seatId) {
    const HR = KP.C.HIRES;
    const seat = HR.SEATS.find(x => x.id === seatId);
    if (!seat || !seat.second) return null;
    const firstDef = HR.SEATS.find(x => x.id === seat.second);
    const first = (state.seats || {})[seat.second];
    return !first
      ? 'A second chair opens when the first ' + firstDef.label + ' has records to show. The first chair is empty.'
      : 'A second chair opens when ' + first.name + ' has ' + HR.secondChairAfter + ' records for this house — ' +
        (KP.seatMade(first).length || 'none') + ' so far.';
  };

  // ---- the help wanted (v0.10.11): act on the market ---------------------
  KP.openSearch = function (state, seatId) {
    const HR = KP.C.HIRES;
    const seat = HR.SEATS.find(x => x.id === seatId);
    if (!seat) return { ok: false, reason: 'No such chair in this building.' };
    if (!KP.chairOpenable(state, seatId)) return { ok: false, reason: KP.chairOpenReason(state, seatId) };
    if (state.staffSearch) return { ok: false, reason: 'One search at a time — the industry reads a company posting two as a company on fire.' };
    if ((state.scenes || []).some(sc => sc.kind === 'theInterview')) {
      return { ok: false, reason: 'A candidate is already in the building. Finish that meeting first.' };
    }
    state.seatSearchCooldowns = state.seatSearchCooldowns || {};
    if (state.week - (state.seatSearchCooldowns[seatId] || -999) < HR.searchCooldown) {
      return { ok: false, reason: 'The posting for that chair is still warm. The market noticed the first one.' };
    }
    if (state.budget < HR.searchCost) return { ok: false, reason: 'Recruiters bill up front — ' + HR.searchCost + '.' };
    state.budget -= HR.searchCost;
    if (KP.ledgerFlow) KP.ledgerFlow(state, 'signings', -HR.searchCost);
    state.staffSearch = { seatId, week: state.week };
    state.seatSearchCooldowns[seatId] = state.week;
    // a posting for a chair somebody sits in is read by the one who sits in it (v0.11.46, §139): their yearly word says so
    if ((state.seats || {})[seatId]) state.seats[seatId].postedWeek = state.week;
    ledger(state).searches++;
    KP.note(state, { kind: 'company', ind: 'searchPosted', priority: 'flavor',
      text: 'The posting goes up for the ' + seat.label + ' chair — through the recruiters, the industry boards, and the version of the industry that is three group chats. Somebody will take the meeting within the week. Who shows up is the market’s answer to what this company currently looks like from outside.' });
    return { ok: true };
  };

  KP.releaseSeat = function (state, seatId) {
    const HR = KP.C.HIRES;
    const S = seats(state);
    const st = S[seatId];
    const seat = HR.SEATS.find(x => x.id === seatId);
    if (!seat) return { ok: false, reason: 'No such chair in this building.' };
    if (!st) return { ok: false, reason: 'The chair is already open.' };
    const severance = Math.max(HR.severanceMin,
      Math.round((HR.hireCost[st.tier] || HR.hireCost.working) * HR.severanceMult));
    if (state.budget < severance) return { ok: false, reason: 'The severance is ' + severance + ' and the account cannot cover a clean goodbye. An unclean one is not on the menu.' };
    state.budget -= severance;
    if (KP.ledgerFlow) KP.ledgerFlow(state, 'signings', -severance);
    const leaves = KP.seatLeavesWith(state, st);   // what the résumé takes with it (v0.11.41, §133)
    KP.seatGoes(state, st, 'released');             // and what stays on the roll (v0.11.47, §140)
    delete S[seatId];
    if (state.scenes) state.scenes = state.scenes.filter(sc =>
      !(sc.kind === 'seatPoach' && sc.seatId === seatId));
    const led = ledger(state);
    led.fired++;
    // letting a name the trades know go raises boardroom eyebrows
    if (HR.REP_TIERS.indexOf(st.tier) >= HR.fireTrustTierMin) {
      state.trust = KP.clamp(state.trust - 1, 0, 100);
    }
    KP.note(state, { kind: 'company', ind: 'seatReleased', priority: 'high',
      text: st.name + ' and the company part ways — the ' + seat.label + ' chair is open, the severance is paid, and the building spends a week discussing it in doorways. Here is the part nobody will ever resolve: if the results turn around now, it proves you right; if they don’t, it proves nothing, because everything else changed too. Firing into the fog is still firing.' + leaves });
    return { ok: true, severance };
  };

  // ---- the people ------------------------------------------------------
  // four hundred names (v0.11.45, §138; the owner's ruling, §136: 5): twenty family names and twenty given. The
  // first ten of each are the hundred of before, in their places: a name an older file holds is a name of the pool
  const FAM = ['Baek', 'Cha', 'Im', 'Joo', 'Gil', 'Weon', 'Pyo', 'Sa', 'Byun', 'Ma',
    'Seok', 'Ok', 'Bang', 'Eom', 'Mo', 'Kwak', 'Yeom', 'Gong', 'Ra', 'Bong'];
  const GIV = ['Ki-tae', 'Seon-mi', 'Do-hwan', 'Yeo-reum', 'Sang-cheol', 'In-na',
    'Moo-young', 'Ha-eun', 'Chul-soo', 'Bo-ra',
    'Jae-hoon', 'Ji-sun', 'Sung-ho', 'Eun-sook', 'Kwang-soo', 'Hye-won',
    'Dong-wook', 'Yoon-hee', 'Jin-ho', 'Soo-ah'];
  const STYLES = ['drillmaster', 'nurturer', 'bigMachine', 'scrappy', 'classicist', 'trendChaser'];
  // the building directory (v0.10.15): ONE truth for how a staff file
  // reads — the interview and the card speak the same sentences
  KP.staffFileRead = function (st) {
    return {
      warmth: st.warmth >= 50 ? 'warm, easy in the room' : 'reserved, hard to warm',
      candor: st.candor >= 50 ? 'answers straight even when it costs' : 'answers carefully, edges sanded',
      style: STYLE_WORD[st.style] || '',
    };
  };

  const STYLE_WORD = {
    drillmaster: 'counts in eights and forgives nothing before noon',
    nurturer: 'learns every trainee’s coffee order before their range',
    bigMachine: 'talks in quarters and org charts — built for a floor of departments',
    scrappy: 'has done every job in this industry with two hands and no budget',
    classicist: 'believes the fundamentals are the trend that never left',
    trendChaser: 'quotes this week’s numbers like scripture and last year’s never happened',
  };
  const HOUSES = ['a top-three house', 'a mid-tier label', 'a one-room agency',
    'an overseas branch office', 'a broadcaster’s production arm', 'a management boutique'];
  const ERAS = ['a famous era', 'a rebuilding stretch', 'two debuts back to back',
    'one long tour cycle', 'a quiet catalog period', 'an era everyone remembers'];

  function h(state, sid, key) { return KP.hash01([state.seed, 'hires', sid, key].join('|')); }

  // the truth, minted once (v0.11.8, §99): the hidden aptitude used to be
  // derived from the hash every time it was read; when the hash gained its
  // avalanche the derivation would have re-rolled every chair in every save,
  // so a truth is stamped at the interview (and at the founding, and by the
  // 0.11.8 migration with the legacy hash) and read from the file after
  function truthFor(state, st, hashFn) {
    const HR = KP.C.HIRES;
    const hh = key => (hashFn || KP.hash01)([state.seed, 'hires', st.id, key].join('|'));
    const core = HR.SEATS.filter(x => !x.studio);
    return { base: hh('apt'), gem: st.tier === 'unknown' && hh('gem') < HR.gemChance,
      bestSeat: core[Math.floor(hh('best') * core.length)].id };
  }
  KP.staffTruthMint = function (state, st, legacy) { return truthFor(state, st, legacy ? KP.hash01Legacy : KP.hash01); };

  // ---- one name, one chair (v0.11.43, §135): a candidate's name is drawn from the pool (a hundred then, four
  // hundred since v0.11.45), and passes over every name the desk has met: the chairs sat, the names it passed on
  // that the market still remembers, and everyone who has taken a meeting. A candidate whose own draw is free is
  // who they always were. One whose draw is taken is given a free name by the same hash, and no draw is made. When
  // the whole pool has come through the door the memory starts over and a name comes round again: never one the
  // building answers to today
  const POOL = [];
  FAM.forEach(f => GIV.forEach(g => POOL.push(f + ' ' + g)));
  // the names the building answers to today
  KP.seatNamesHere = function (state) {
    const here = {};
    const S = state.seats || {};
    Object.keys(S).forEach(k => { if (S[k] && S[k].name) here[S[k].name] = true; });
    ((state.staffLedger2 || {}).passed || []).forEach(e => { if (e && e.name) here[e.name] = true; });
    return here;
  };
  KP.candidateName = function (state, sid) {
    const own = FAM[Math.floor(h(state, sid, 'f') * FAM.length)] + ' ' + GIV[Math.floor(h(state, sid, 'g') * GIV.length)];
    const here = KP.seatNamesHere(state);
    const met = (state.staffLedger2 || {}).met || [];
    const fresh = n => !here[n] && !met.includes(n);
    if (fresh(own)) return own;
    const pick = list => list[Math.floor(h(state, sid, 'free') * list.length)];
    const free = POOL.filter(fresh);
    if (free.length) return pick(free);
    // the whole pool has come through the door: the memory starts over, and a name comes round again
    if (!here[own]) return own;
    const round = POOL.filter(n => !here[n]);
    return round.length ? pick(round) : own;
  };

  function mintCandidate(state, seatId, tier, salt) {
    const sid = 'sf' + state.week + '_' + salt;
    const HR = KP.C.HIRES;
    const name = KP.candidateName(state, sid);
    const led = ledger(state);
    if (led.met.includes(name)) led.met = [];   // it came round again: the memory starts over with this one
    led.met.push(name);
    const core = HR.SEATS.filter(x => !x.studio);
    const knownFor = h(state, sid, 'kfm') < HR.knownForMatch
      ? null   // null = the tag matches the true best seat (resolved in truth)
      : core[Math.floor(h(state, sid, 'kf') * core.length)].id;
    const years = 2 + Math.floor(h(state, sid, 'yr') * 12);
    const resume = [
      years + ' years in the industry, most recently at ' + HOUSES[Math.floor(h(state, sid, 'h1') * HOUSES.length)],
      'worked through ' + ERAS[Math.floor(h(state, sid, 'e1') * ERAS.length)],
    ];
    const cand = { id: sid, name, seatId, tier, knownForTag: knownFor, resume,
      style: STYLES[Math.floor(h(state, sid, 'st') * STYLES.length)],
      warmth: Math.round(h(state, sid, 'pw') * 100),
      candor: Math.round(h(state, sid, 'pc') * 100) };
    // the studio (v0.10.35): a producer's lanes and a writer's themes are
    // public knowledge — the craft behind them is the fog
    const seatDef = HR.SEATS.find(x => x.id === seatId);
    if (seatDef && seatDef.studio) {
      cand.knownForTag = null;
      if ((seatDef.second || seatId) === 'producer') {   // the second chair (v0.10.39) is the same family
        const lanes = KP.C.CONCEPTS.filter(c => c.id !== 'fusion');
        cand.lane = lanes[Math.floor(h(state, sid, 'lane') * lanes.length)].id;
        cand.lane2 = null;
        if (h(state, sid, 'lane2') < KP.C.STUDIO.secondLaneChance) {
          const N = KP.C.TREND.NEIGHBOURS[cand.lane] || [];
          if (N.length) cand.lane2 = N[Math.floor(h(state, sid, 'lane2pick') * N.length)];
        }
      } else {
        const all = KP.C.THEMES.map(t => t.id);
        const n = 2 + Math.floor(h(state, sid, 'thn') * 2);
        cand.themes = [];
        for (let i = 0; i < n; i++) {
          const left = all.filter(t => !cand.themes.includes(t));
          cand.themes.push(left[Math.floor(h(state, sid, 'th' + i) * left.length)]);
        }
      }
      cand.works = [];
    }
    cand.truth = truthFor(state, cand);   // minted once (v0.11.8, §99)
    return cand;
  }

  // ---- the truth: computed, never stored, never printed ----------------
  KP.staffTruth = function (state, st) {
    const HR = KP.C.HIRES;
    // the stamped truth (v0.11.8, §99) — the derivation is the fallback for
    // a chair no migration has touched, never a write
    const t = st.truth || truthFor(state, st);
    const base = t.base;
    const gem = !!t.gem;
    // the best seat is drawn over the six core chairs (the studio chairs
    // joined in v0.10.35 — old truths must not move under them)
    const bestSeat = t.bestSeat;
    let apt = gem ? 0.72 + base * 0.28
      : KP.clamp(HR.tierFloor[st.tier] + base * HR.tierSpan, 0, 1);
    const def = HR.SEATS.find(x => x.id === st.seatId);
    if (!(def && def.studio) && st.seatId !== bestSeat) apt *= HR.offSeatDamp;   // a studio chair's truth is its own craft
    return { apt, bestSeat };
  };
  function meshOf(state, st) {
    const HR = KP.C.HIRES;
    const groups = KP.groups(state).filter(g => g.debuted);
    const big = groups.length >= 3;
    const roster = state.roster.map(id => state.people[id]).filter(Boolean);
    const disciplined = roster.length &&
      roster.reduce((s, p) => s + p.personality.professionalism, 0) / roster.length >= 55;
    const identity = KP.groups(state).some(g => (g.conceptRun || 0) >= 2);
    const fits =
      st.style === 'bigMachine' ? big :
      st.style === 'scrappy' ? !big :
      st.style === 'drillmaster' ? disciplined :
      st.style === 'nurturer' ? !disciplined :
      st.style === 'classicist' ? identity : !identity;
    return fits ? HR.meshSpan : -HR.meshSpan;
  }
  // the ONLY read the rest of the engine takes — a bare multiplier,
  // consumed silently at each seat's system
  KP.seatMult = function (state, seatId) {
    if (!seatId) return 1;
    const st = (state.seats || {})[seatId];
    if (!st) return 1;
    const HR = KP.C.HIRES;
    const t = KP.staffTruth(state, st);
    const mult = KP.clamp(HR.multLo + t.apt * (HR.multHi - HR.multLo) + meshOf(state, st), 0.85, 1.18);
    // the season, televised (v0.11.4): the chair that flew out to the set this week is not in the room
    if (state.coachAway && state.coachAway.week === state.week && state.coachAway.seat === seatId) return mult * KP.C.COMPETITION.coachAwayMult;
    return mult;
  };

  // ---- the founding hires: the incumbent trio become somebody ----------
  function seats(state) {
    if (!state.seats) {
      state.seats = {};
      // a later building's chairs are new people — the hidden truths are
      // hashed off the seat id, so the id carries the chapter (audit v0.11.3)
      const gen = state.managerGen || 0;
      const mk = (seatId, name) => {
        const sid = 'sf' + gen + '_' + seatId;
        state.seats[seatId] = { id: sid, name, seatId, tier: 'working',
          knownForTag: null, since: 1, style: STYLES[Math.floor(h(state, sid, 'st') * STYLES.length)],
          warmth: Math.round(h(state, sid, 'pw') * 100),
          candor: Math.round(h(state, sid, 'pc') * 100),
          resume: ['here since the beginning; this company is the whole résumé'] };
        state.seats[seatId].truth = truthFor(state, state.seats[seatId]);   // minted once (v0.11.8, §99)
      };
      mk('vocal', KP.staffName ? KP.staffName(state.seed + '|coach') : 'Coach Baek');   // the legacy coach IS the vocal seat (v0.10.43)
      mk('dance', 'Coach ' + FAM[Math.floor(h(state, 'seed-dance', 'f') * FAM.length)]);
      mk('perf', 'Director Cha');
      mk('scout', 'Scout Im');
      // A&R and marketing start EMPTY — the first hires the fog invites
    }
    return state.seats;
  }
  KP.staffSeats = seats;
  // a later building's chairs (the second chance since v0.11.0; the founding too since v0.11.40, §132): the
  // four a house opens with are new people, under names of their own, sat from the week its doors open
  const TITLE = { perf: 'Director ', scout: 'Scout ' };
  KP.seatBuilding = function (state, key, line) {
    delete state.seats;
    delete state.staffSearch;           // the posting was the last building's
    delete state.seatSearchCooldowns;   // and so was the market's memory of it
    const S = seats(state);
    const taken = {};
    Object.keys(S).forEach(seatId => {
      const st = S[seatId];
      let name = null;
      // salted until it is this building's alone: two chairs of one house do not answer to one name
      for (let salt = 0; salt < 8 && (!name || taken[name]); salt++) {
        name = (TITLE[seatId] || 'Coach ') + KP.staffName(key + '|' + seatId + (salt ? '|' + salt : '')).split(' ')[0];
      }
      taken[name] = true;
      st.name = name;
      st.since = state.week;
      st.resume = [line];
    });
    return S;
  };
  // one staff (v0.10.43, §89 D8): every name the building speaks comes
  // from a chair — the scout's stories, the referral's voucher, the
  // evaluators' bylines. An empty chair speaks as the desk.
  // doubles told apart (v0.11.45, §138; the owner's ruling, §136: 34). A file from before v0.11.43 can hold two
  // chairs under one name. Nobody is renamed. Where the building speaks a name that two of its chairs answer to, it
  // says whose: the chair, in brackets after the name. A name only one chair answers to is said as it always was
  KP.seatNameShared = function (state, seatId) {
    const S = seats(state), st = S[seatId];
    return !!st && Object.keys(S).some(k => k !== seatId && S[k] && S[k].name === st.name);
  };
  KP.seatNameTold = function (state, seatId) {
    const st = seats(state)[seatId];
    if (!st) return null;
    const seat = KP.C.HIRES.SEATS.find(x => x.id === seatId);
    return KP.seatNameShared(state, seatId) && seat ? st.name + ' (' + seat.label + ')' : st.name;
  };
  KP.seatHolderName = function (state, seatId, fallback) {
    return KP.seatNameTold(state, seatId) || (fallback || 'the ' + ((KP.C.HIRES.SEATS.find(x => x.id === seatId) || {}).label || seatId) + ' desk');
  };
  KP.scoutName = function (state) { return KP.seatHolderName(state, 'scout', 'the scouting desk'); };
  const EVAL_SEAT = { ev_vocal: 'vocal', ev_perf: 'perf', ev_scout: 'scout' };
  KP.seatEvaluator = function (state, ev) {
    const seatId = ev && EVAL_SEAT[ev.id];
    if (!seatId) return ev;
    return Object.assign({}, ev, { name: seatId === 'scout' ? KP.scoutName(state) : KP.seatHolderName(state, seatId) });
  };

  // ---- the interview: personality only, zero skill signal --------------
  KP.registerScene('theInterview', {
    title: (state, sc) => sc.cand.name + ' · the interview',
    body: (state, sc) => {
      const HR = KP.C.HIRES;
      const c = sc.cand;
      const seat = HR.SEATS.find(x => x.id === c.seatId);
      // the studio (v0.10.35): the lanes and the themes are on the file — the craft is not
      const studioLine = c.lane
        ? ' Known lanes: ' + KP.producerLanes(c).map(l => (KP.conceptById(l) || { label: l }).label.toLowerCase()).join(' and ') + '.'
        : c.themes ? ' Themes they write: ' + c.themes.map(t => (KP.themeById(t) || { label: t }).label.toLowerCase()).join(', ') + '.' : '';
      return 'The ' + seat.label + ' chair needs filling and ' + c.name + ' took the meeting. ' +
        'The read across the table: ' + (c.warmth >= 50 ? 'warm, easy in the room' : 'reserved, hard to warm') +
        ', ' + (c.candor >= 50 ? 'answers straight even when it costs' : 'answers carefully, edges sanded') +
        ' — and by every account, ' + STYLE_WORD[c.style] + '. ' +
        'The résumé: ' + c.resume.join('; ') + '.' + studioLine + ' ' +
        'The industry file: ' + c.tier + (c.knownForTag ? ', known for ' + KP.knownForSaid(c.knownForTag) : '') +
        '. The fee is ' + HR.hireCost[c.tier] + '. The résumé says where they were. It does not say what they did there.';
    },
    options: (state, sc) => {
      // the clean exits (v0.10.16): replacing a sitter pays their
      // severance ON TOP — hiring over somebody was quietly cheaper
      // than firing them, and a company is not allowed that arithmetic
      const HR = KP.C.HIRES;
      const prev = seats(state)[sc.cand.seatId];
      const sev = prev ? Math.max(HR.severanceMin,
        Math.round((HR.hireCost[prev.tier] || HR.hireCost.working) * HR.severanceMult)) : 0;
      return [
        { id: 'hire', label: 'Hire · ' + (HR.hireCost[sc.cand.tier] + sev) +
          (sev ? ' (incl. ' + prev.name.split(' ')[0] + '’s severance)' : '') },
        { id: 'pass', label: 'Pass' },
      ];
    },
    resolve: (state, sc, optionId) => {
      const HR = KP.C.HIRES;
      const led = ledger(state);
      if (optionId !== 'hire') {
        led.passes++;
        rememberPass(state, sc.cand);   // the market remembers (v0.11.5, §96 wiring)
        return { toast: 'Passed. The chair stays as it was; the meeting stays a meeting. The market keeps the name.' };
      }
      const prev = seats(state)[sc.cand.seatId];
      const sev = prev ? Math.max(HR.severanceMin,
        Math.round((HR.hireCost[prev.tier] || HR.hireCost.working) * HR.severanceMult)) : 0;
      const cost = HR.hireCost[sc.cand.tier] + sev;
      if (state.budget < cost) { led.passes++; rememberPass(state, sc.cand); return { toast: 'The fee' + (sev ? ' — and the severance a replacement owes —' : '') + ' outran the account. The candidate’s agent stopped returning calls.' }; }
      state.budget -= cost;
      if (KP.ledgerFlow) KP.ledgerFlow(state, 'signings', -cost);
      const leaves = prev ? KP.seatLeavesWith(state, prev) : '';   // what the one who leaves takes (v0.11.41, §133)
      if (prev) {
        KP.seatGoes(state, prev, 'replaced', { by: sc.cand.name });
        led.fired++;
        // letting a name go by replacement raises the same eyebrows
        if (HR.REP_TIERS.indexOf(prev.tier) >= HR.fireTrustTierMin) {
          state.trust = KP.clamp(state.trust - 1, 0, 100);
        }
      }
      seats(state)[sc.cand.seatId] = Object.assign({}, sc.cand, { since: state.week });
      led.hires++;
      KP.note(state, { kind: 'company', ind: 'seatFilled', priority: 'high',
        text: sc.cand.name + ' signs on as ' + HR.SEATS.find(x => x.id === sc.cand.seatId).label +
          (prev ? ', taking the chair from ' + prev.name + ' — severance paid, and the building notices chairs' : '') +
          '.' + leaves + ' What the hire actually is, only the months will say: the results arrive tangled with everything else, which is the whole job of judging them.' });
      return { toast: 'Hired. Now comes the only interview that counts: the next year.' };
    },
    expire: (state, sc) => { ledger(state).passes++; rememberPass(state, sc.cand); return null; },
  });

  // ---- the poach: your results made them famous -------------------------
  // the road manager's goodbye (the old staffPoach's release path)
  function managerWalks(state, g, sc) {
    const MG = KP.C.HIRES.MANAGER;
    const m = g.manager;
    delete g.manager;
    g.managerGen = (g.managerGen || 0) + 1;
    g.members.forEach(id => {
      const p = state.people[id];
      if (p) p.morale = KP.clamp(p.morale - MG.poachMorale, 0, 100);
    });
    ledger(state).walked++;
    return m;
  }
  // the house on the other end of the call (v0.11.25, §116): the scene
  // names its head, says why this house, and the answer goes on its books
  const callStamp = (state, rival) => {
    if (!rival) return {};
    const why = KP.callOpened ? KP.callOpened(state, rival) : null;
    return why ? { rivalShort: rival.short, why } : { rivalShort: rival.short };
  };
  const callHouse = (state, sc) => (KP.callHouseOf ? KP.callHouseOf(state, sc) : null);
  const callFrom = (state, sc) => { const r = callHouse(state, sc); return r && KP.signedBy ? KP.signedBy(state, r) : sc.rivalName; };
  const callWhy = (state, sc) => { const r = callHouse(state, sc); const t = r && KP.parkWhyText ? KP.parkWhyText(state, r, sc.why) : ''; return t ? ' ' + t : ''; };
  const onBooks = (state, sc, kind) => { const r = callHouse(state, sc); if (r && KP.recordHouse) KP.recordHouse(state, r.short, kind); };
  // ---- a call left unanswered (v0.11.52, §145; the owner's ruling, §136: 13) ------------------------------------
  // What it weighs is never one number for every call, and the close weighs what the card said. Who was called:
  // they matter to this house when a chair has a credit here, or a road manager has been with the group a year or
  // more, each as they stood the week the call came. What stood between them and the desk: the desk is bound to
  // one it had kept before with a raise.
  // And where the house stood: with a till that could not have matched the offer, nobody upstairs or down the hall
  // holds the silence against the desk. The till is the one the desk saw. A call closes inside a week, after that
  // week's takings and bills have moved, so the till at the close is not what the desk had in hand when it said
  // nothing. It is read each time a week's work is done, which is the morning the desk next sees the call, and
  // clear of what the house owes (§86). A call that held its raise on one such morning is marked, and the mark
  // stays. A label the desk founded is weighed as any house is: it has a chair and a board upstairs (§73)
  KP.callTillHolds = function (state, sc) {
    return state.budget - ((state.red && state.red.arrears) || 0) >= KP.raiseCostFor(state, sc);
  };
  KP.callLeft = function (state, sc) {
    const C = KP.C.HIRES.CALL;
    // who they were to this house the week the call came: the card says what silence would weigh, and the close
    // weighs the same person three weeks on
    const at = sc.week != null ? sc.week : state.week;
    let name = null, matters = false, bound = false;
    if (sc.groupId) {
      const g = KP.groupById(state, sc.groupId), m = g && g.manager;
      if (!m) return null;
      name = m.name; matters = at - m.since >= KP.C.WEEKS_PER_YEAR; bound = !!m.countered;
    } else {
      const st = (state.seats || {})[sc.seatId];
      if (!st) return null;
      name = st.name; matters = KP.seatCredit(state, st, undefined, at).n > 0; bound = !!st.keptWeek;
    }
    const excused = sc.tillHeld ? null : 'till';
    const weighs = !excused && (matters || bound);
    return { who: sc.groupId ? 'manager' : 'chair', name, matters, bound, excused, weighs,
      trust: !weighs ? 0 : (matters ? C.mattersTrust : 0) + (bound ? C.boundTrust : 0) };
  };
  // what keeping the one called costs: the raise, and half as much again for a chair who watched another's call go
  // unanswered within the year. A chair pays it once at most: the quiet after a call (poachCooldown) is longer than
  // what is left of that year
  KP.raiseCostFor = function (state, sc) {
    const HR = KP.C.HIRES;
    const st = sc && !sc.groupId ? (state.seats || {})[sc.seatId] : null;
    const saw = !!(st && st.sawUnanswered) && state.week - st.sawUnanswered.week <= HR.CALL.memoryWeeks;
    return saw ? Math.round(HR.raiseCost * HR.CALL.keepMore) : HR.raiseCost;
  };
  // the silence, as the letter that says they have gone says it
  const leftSaid = (state, left, others) => {
    if (!left) return '';
    if (left.excused === 'till') return ' The till could not have matched it, and nobody holds the silence against you.';
    if (!left.weighs) return '';
    const upstairs = ' ' + state.executive.name + ' noticed that nobody answered' + (left.bound ? ', and that you had kept ' + left.name + ' once before' : '') + '. Trust ' + left.trust + '.';
    return upstairs + (left.who === 'manager' ? ' The members will remember who said nothing: it is on each of their files.'
      : others ? ' The chairs down the hall watched it happen.' : '');
  };
  // and on the card, before the answer: where leaving it unanswered would be noticed
  const silenceSaid = (state, sc) => {
    const left = KP.callLeft(state, sc);
    if (!left || !left.weighs) return '';
    return ' Left unanswered, it will be noticed upstairs, and' + (left.who === 'manager' ? ' in the van.' : ' down the hall.');
  };
  // what the silence does: upstairs, and among the people who worked beside the one who went
  function callLeftLands(state, sc, left) {
    const led = ledger(state);
    led.unanswered++;
    if (!left || !left.weighs) return 0;
    led.unansweredCharged++;
    state.trust = KP.clamp(state.trust + left.trust, 0, 100);
    if (left.who === 'manager') {
      const g = KP.groupById(state, sc.groupId);
      (g ? g.members : []).forEach(id => KP.recordDirected(state, id, 'managerUnanswered'));
      return g ? g.members.length : 0;
    }
    const S = state.seats || {};
    const others = Object.keys(S).filter(k => S[k] && k !== sc.seatId);
    others.forEach(k => { S[k].sawUnanswered = { week: state.week, name: left.name }; });
    return others.length;
  }
  KP.registerScene('seatPoach', {
    title: (state, sc) => {
      if (sc.groupId) {   // the road manager (v0.10.43): one scene for every chair
        const g = KP.groupById(state, sc.groupId);
        const m = g && g.manager;
        return (m ? m.name : 'The road manager') + ' · the counter-offer';
      }
      const st = (state.seats || {})[sc.seatId];
      return (st ? KP.seatNameTold(state, sc.seatId) : 'The chair') + ' · the offer from outside';
    },
    body: (state, sc) => {
      if (sc.groupId) {
        const g = KP.groupById(state, sc.groupId);
        const m = g && g.manager;
        if (!g || !m) return '';
        return callFrom(state, sc) + ' wants ' + m.name + ' — the person who knows ' + g.name +
          '’s van seating, coffee orders, and bad days better than the members’ own families do. Money keeps ' +
          (m.name.split(' ')[0]) + ' (' + KP.raiseCostFor(state, sc) + '); nothing else will.' + callWhy(state, sc) + silenceSaid(state, sc);
      }
      const st = (state.seats || {})[sc.seatId];
      const seat = KP.C.HIRES.SEATS.find(x => x.id === sc.seatId);
      // what the industry read (v0.11.41, §133): the credit at this house; with none, the name they came in with;
      // and for a chair with neither, the red weeks, which are the only reason such a chair is called
      const read = st ? KP.seatCreditShort(KP.seatCredit(state, st), state.company.short) : '';
      const named = st && KP.C.HIRES.REP_TIERS.indexOf(st.tier) >= KP.C.HIRES.poachTierMin;
      return (st ? KP.seatNameTold(state, sc.seatId) : 'Your ' + seat.label) + ' got the call — ' + callFrom(state, sc) +
        ', better title, real money. ' +
        (!st || read ? 'This is what happens when the results carry a name: the industry reads your credits and hires your people.' + (read ? ' The credit it read: ' + read + '.' : '')
          : named ? st.name + ' has no credit at this house yet: the call is for the name they came in with.'
          : 'The call is not for a credit or a name: a house this far behind has its chairs called.') +
        ' A raise keeps the chair (' + KP.raiseCostFor(state, sc) +
        '); pride keeps nothing.' + (st && KP.raiseCostFor(state, sc) > KP.C.HIRES.raiseCost ? ' ' + st.name + ' watched ' + st.sawUnanswered.name + '’s call go unanswered, and is dearer to keep for it.' : '') +
        callWhy(state, sc) + silenceSaid(state, sc);
    },
    // the raise is offered only when the account can pay it (audit
    // v0.11.3: an unaffordable "Match it" fell through to the walk)
    options: (state, sc) => (state.budget >= KP.raiseCostFor(state, sc)
      ? [{ id: 'raise', label: 'Match it · ' + KP.raiseCostFor(state, sc) }] : [])
      .concat([{ id: 'walk', label: 'Wish them well' }]),
    resolve: (state, sc, optionId) => {
      const led = ledger(state);
      if (sc.groupId) {
        const g = KP.groupById(state, sc.groupId);
        const m = g && g.manager;
        if (!g || !m) return { toast: 'The van had already found a new driver.' };
        const cost = KP.raiseCostFor(state, sc);
        if (optionId === 'raise' && state.budget >= cost) {
          state.budget -= cost;
          if (KP.ledgerFlow) KP.ledgerFlow(state, 'signings', -cost);
          m.countered = state.week;
          led.raises++;
          onBooks(state, sc, 'weKeptOurStaff');
          return { toast: m.name + ' stays — better pay, same vans, and one very relieved group chat. The members threw a small dorm party with a hand-drawn banner. The banner misspells “congratulations.” It is already framed.' };
        }
        managerWalks(state, g, sc);
        onBooks(state, sc, 'theyHiredOurStaff');
        return { toast: m.name + ' left on good terms, which somehow made the last van ride quieter. A new manager starts next week. The seating chart starts from zero.',
          note: { kind: 'company', groupId: g.id,
            text: g.name + ' said goodbye to ' + m.name + ' this week. The maknae cried at the send-off dinner, then everyone did, including — briefly, professionally — ' + m.name + '.' } };
      }
      const st = (state.seats || {})[sc.seatId];
      if (!st) return { toast: 'The chair had already emptied.' };
      const cost = KP.raiseCostFor(state, sc);
      if (optionId === 'raise' && state.budget >= cost) {
        state.budget -= cost;
        if (KP.ledgerFlow) KP.ledgerFlow(state, 'signings', -cost);
        led.raises++;
        st.keptWeek = state.week;   // the chair remembers the week the desk kept it (v0.11.46, §139): its yearly word says so
        onBooks(state, sc, 'weKeptOurStaff');
        return { toast: KP.seatNameTold(state, sc.seatId) + ' stays. The raise is real; so is the fact they took the meeting.' };
      }
      led.walked++;
      const leaves = KP.seatLeavesWith(state, st);   // what the résumé takes across the street (v0.11.41, §133)
      const told = KP.seatNameTold(state, sc.seatId);   // said while the chair is still theirs
      KP.seatGoes(state, st, 'walked', { to: sc.rivalName });
      delete state.seats[sc.seatId];
      onBooks(state, sc, 'theyHiredOurStaff');
      KP.note(state, { kind: 'company', ind: 'seatWalked', priority: 'high',
        text: told + ' goes to ' + sc.rivalName + ' with a leaving speech that thanks everyone and a start date that says everything.' + leaves + ' The chair is open, and whether that is a loss or a mercy is exactly the thing nobody will ever know for certain.' });
      return { toast: 'The chair is open. The industry hires from the schools it respects — that is the compliment and the bill.' };
    },
    expire: (state, sc) => {
      // an unanswered offer answers itself
      if (sc.groupId) {
        const g = KP.groupById(state, sc.groupId);
        if (!g || !g.manager) return null;
        const left = KP.callLeft(state, sc);   // read while the van is still theirs (v0.11.52, §145)
        const m = managerWalks(state, g, sc);
        onBooks(state, sc, 'theyHiredOurStaff');
        callLeftLands(state, sc, left);
        // the letter says what the silence did, and nothing else does: it is one the week cannot cut (v0.11.52, §145)
        return { kind: 'company', ind: 'vanLapsed', priority: 'critical', groupId: g.id,
          text: 'The counter-offer window closed unanswered, and ' + m.name + ' signed elsewhere. The members found out from the group chat. The silence in the van this week has a new-staff-orientation quality to it.' + leftSaid(state, left, 0) };
      }
      const st = (state.seats || {})[sc.seatId];
      if (!st) return null;
      // it used to go without a word (v0.11.41, §133): a chair that walks on an unanswered call says so, once, and
      // the letter is one the week's budget cannot cut
      const seat = KP.C.HIRES.SEATS.find(x => x.id === sc.seatId);
      const leaves = KP.seatLeavesWith(state, st);
      const left = KP.callLeft(state, sc);   // read while the chair is still theirs (v0.11.52, §145)
      KP.seatGoes(state, st, 'lapsed', { to: sc.rivalName });
      ledger(state).walked++; delete state.seats[sc.seatId]; onBooks(state, sc, 'theyHiredOurStaff');
      const others = callLeftLands(state, sc, left);
      return { kind: 'company', ind: 'seatLapsed', priority: 'critical',
        text: 'The offer sat on the desk until it answered itself: ' + st.name + ' signed with ' + sc.rivalName + ', and the ' + seat.label + ' chair is open.' + leaves + leftSaid(state, left, others) };
    },
  });

  // the till a call stood beside (v0.11.52, §145): when the week's work is done, each call still on the Desk is
  // marked if the till holds its raise. It is the week's last rail, so it reads the till the desk wakes to
  KP.registerWeekly('callTill', 995, function (state) {
    (state.scenes || []).forEach(sc => { if (sc.kind === 'seatPoach' && !sc.tillHeld && KP.callTillHolds(state, sc)) sc.tillHeld = true; });
  });

  // ---- the week ----------------------------------------------------------
  KP.registerWeekly('hires', 791, function (state, rng, inbox) {
    const HR = KP.C.HIRES;
    const led = ledger(state);
    const S = seats(state);
    // the roll (§140): the scout's name on whoever signed on their watch, and the gone chairs' running eras read again
    KP.signedStamp(state);
    KP.rollSettle(state);
    // the market remembers (v0.11.5, §96 wiring): about a season after a
    // pass, the name takes a chair across the street — one letter, the
    // house hash-picked (no draw), the entry dropped
    const passedDue = (led.passed || []).find(e => state.week >= e.week + HR.passReturnWeeks);
    if (passedDue) {
      led.passed = led.passed.filter(e => e !== passedDue);
      const houses = KP.signingHouses(state);
      const house = houses.length
        ? houses[Math.floor(KP.hash01([state.seed, 'passedChair', passedDue.name, passedDue.week].join('|')) * houses.length)]
        : null;
      const seatDef = HR.SEATS.find(x => x.id === passedDue.seatId) || { label: passedDue.seatId };
      inbox.push({ kind: 'company', ind: 'passedTookChair', priority: 'normal',
        text: passedDue.name + ' took the ' + seatDef.label + ' chair at ' + (house ? house.name : 'a house across the street') +
          ' this week — the candidate this desk passed on ' + KP.weekLabel(passedDue.week).text +
          '. The trades printed the hire in one line. The building read it twice, and nobody will ever know which chair it should have been.' });
    }
    // a candidate takes the meeting — rep gated by the fame read. A
    // posted search (v0.10.11) guarantees the meeting; otherwise the
    // market knocks on its own clock
    const searching = state.staffSearch && !(state.scenes || []).some(sc => sc.kind === 'theInterview');
    if (searching || (!(state.scenes || []).some(sc => sc.kind === 'theInterview') &&
        rng.chance(HR.candidateChance))) {
      const fame = KP.fameRead ? KP.fameRead(state) : 0.5;
      let seat = null;
      if (searching) {
        seat = HR.SEATS.find(x => x.id === state.staffSearch.seatId) || null;
        delete state.staffSearch;
      } else {
        // a second studio chair is not open until the first proves out (v0.10.39)
        const open = HR.SEATS.filter(x => !S[x.id] && KP.chairOpenable(state, x.id));
        const pool = open.length && rng.chance(0.7) ? open
          : HR.SEATS.filter(x => (!S[x.id] && KP.chairOpenable(state, x.id)) || (S[x.id] && state.week - (S[x.id].since || 0) > 30));
        if (pool.length) seat = pool[rng.int(0, pool.length - 1)];
      }
      if (seat) {
        const tiers = ['unknown', 'working'];
        if (fame >= HR.fameForKnown) tiers.push('known');
        if (fame >= HR.fameForName) tiers.push('a name');
        const cand = mintCandidate(state, seat.id, tiers[rng.int(0, tiers.length - 1)], rng.int(0, 9999));
        led.candidates++;
        KP.openScene(state, { kind: 'theInterview', cand, expiresWeek: state.week + 2 });
        inbox.push({ kind: 'company', opens: 'theInterview', ind: 'interviewSet', priority: 'high',
          text: cand.name + ' is in the building about the ' + seat.label + ' chair — ' +
            (searching ? 'answering the posting, ' : '') + cand.tier +
            ' by the industry’s file, priced accordingly. The interview will tell you who they are. It will tell you nothing about how good they are. That part costs a year.' });
      }
    }
    // staff notes: their voice, personality-true, skill-ambiguous
    Object.keys(S).forEach(seatId => {
      const st = S[seatId];
      if (!st) return;
      if (rng.chance(HR.noteChance)) {
        led.notes++;
        const seat = HR.SEATS.find(x => x.id === seatId);
        inbox.push({ kind: 'company', ind: 'staffNote', priority: 'flavor',
          text: st.name + ' (' + seat.label + '), in this week’s notes: “' +
            (st.candor >= 50
              ? rng.pick(['The room is behind where I want it. That may be the room, or it may be me — the work will say.',
                  'Two of the kids turned a corner this week. I would love to claim it. The honest note is: unclear.',
                  'What we are doing is either about to work or about to be obvious. I have been wrong in both directions.'])
              : rng.pick(['Progress on schedule. Details in the file.',
                  'The week went as weeks go. Nothing to escalate.',
                  'Some promising signs. I would rather show you than say it.'])) + '”' });
      }
      // mesh friction reaches the notes long before any number would
      const mesh = meshOf(state, st);
      if (mesh < 0 && state.week - (st.since || 0) >= HR.meshNoteAfter &&
          !st.meshNoted && rng.chance(0.15)) {
        st.meshNoted = state.week;   // the week it was said (v0.11.46, §139; a file from before holds 1): the yearly word speaks of it that year
        led.meshNotes++;
        inbox.push({ kind: 'company', ind: 'meshFriction', priority: 'high',
          text: 'Corridor read on ' + KP.seatNameTold(state, seatId) + ': the method and the building keep missing each other — ' +
            STYLE_WORD[st.style] + ', and this is not that kind of house right now. Nobody doubts the work. Several people doubt the fit. Whether the difference matters is the ' + (state.week - st.since) + '-week question with no clean answer.' });
      }
    });
    // your results build their names — and the industry reads credits
    KP.groups(state).forEach(g => {
      if (!g.results || g.results.week !== state.week - 1) return;
      if ((g.results.reception || 0) < HR.repRiseAt) return;
      Object.keys(S).forEach(seatId => {
        const st = S[seatId];
        if (!st || st.tier === 'a name' || !rng.chance(HR.repRiseChance)) return;
        const tiers = HR.REP_TIERS;
        st.tier = tiers[Math.min(tiers.length - 1, tiers.indexOf(st.tier) + 1)];
        led.repRises++;
        // no note (§89 C): the tier shows on the building card; the poach
        // call that follows is the event
      });
    });
    // the poach call: one scene for every chair in the building — the
    // seats the industry read the credits of, and the road managers the
    // members cannot imagine the van without (v0.10.43, §89 D8)
    if (!(state.scenes || []).some(sc => sc.kind === 'seatPoach') &&
        state.week > (state.seatPoachQuiet || 0)) {
      const MG = HR.MANAGER;
      // the red weeks (v0.11.0, §86): from the creditors' letters on, the
      // chairs take the calls — any seat, three times as often
      const redHot = !!(KP.redRead && KP.redRead(state).weeks >= KP.C.RED.creditorsAt);
      const redMult = redHot ? KP.C.RED.poachMult : 1;
      const seatTarget = Object.keys(S).find(seatId => S[seatId] &&
        (redHot || KP.C.HIRES.REP_TIERS.indexOf(S[seatId].tier) >= HR.poachTierMin));
      const mgrTarget = KP.groups(state).find(g => g.debuted && !g.retiredWeek && g.manager &&
        (g.popularity || 0) >= MG.poachPopMin && state.week - g.manager.since >= MG.poachTenureMin);
      // who calls (v0.11.25, §116): a weighted draw on the one number that
      // was always drawn here (rng.int took one; this takes the same one)
      const rivalOf = () => {
        const hs = KP.signingHouses(state);
        const u = rng.next();
        return KP.callingHouse ? KP.callingHouse(state, hs, u) : hs[Math.floor(u * hs.length)];
      };
      if (seatTarget && rng.chance(HR.poachChance * redMult)) {
        state.seatPoachQuiet = state.week + HR.poachCooldown;
        led.poachCalls++;
        const rival = rivalOf();
        KP.openScene(state, Object.assign({ kind: 'seatPoach', seatId: seatTarget,
          rivalName: rival ? rival.name : 'a rival house', expiresWeek: state.week + 2 }, callStamp(state, rival)));
        // the call is said, as the road manager's always was (v0.11.44, §137): a decision does not open unannounced
        inbox.push({ kind: 'company', opens: 'seatPoach', ind: 'seatCalled', priority: 'high',
          text: S[seatTarget].name + ' got a call from ' + (KP.signedBy ? KP.signedBy(state, rival) : (rival ? rival.name : 'a rival house')) +
            ' about a ' + HR.SEATS.find(x => x.id === seatTarget).label + ' chair across the street. The call is on the Desk, and in two weeks it answers itself.' });
      } else if (mgrTarget && rng.chance(MG.poachChance * redMult)) {
        state.seatPoachQuiet = state.week + HR.poachCooldown;
        led.poachCalls++;
        const rival = rivalOf();
        const rivalName = rival ? rival.name : 'a rival house';
        KP.openScene(state, Object.assign({ kind: 'seatPoach', groupId: mgrTarget.id, rivalName, expiresWeek: state.week + 2 }, callStamp(state, rival)));
        inbox.push({ kind: 'company', opens: 'seatPoach', priority: 'high', groupId: mgrTarget.id,
          text: mgrTarget.manager.name + ' got an offer from ' + (KP.signedBy ? KP.signedBy(state, rival) : rivalName) +
            ' — better title, better hours, someone else’s vans. The counter-offer window is on the Desk, and the members have already noticed the long phone calls.' });
      }
    }
  });

  // ---- the timeline reacts ----------------------------------------------
  KP.onFeedEvent('seatFilled', (state, n, rng) => rng.chance(0.4) ? rng.pick([
    { persona: 'fan', text: 'new staff announcement. the fandom has already found their old work, formed two opposing theories, and scheduled the argument for release week' },
    { persona: 'casual', text: 'staff hires are the industry’s deepest bets and shallowest press releases. check back in a year for the actual news' },
  ]) : null);
  KP.onFeedEvent('seatWalked', (state, n, rng) => rng.pick([
    { persona: 'press', text: 'Another staff departure up the food chain — the industry’s oldest compliment. Companies that develop people become the schools everyone hires from, tuition unpaid.' },
    { persona: 'fan', text: 'the staff leaving post has 40 quote-posts arguing whether this is fine. it is either completely fine or the beginning of the end. no in between. it was probably fine' },
  ]));
})(typeof window !== 'undefined' ? window : globalThis);
