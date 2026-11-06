/* The people (v0.7.4) — personalities you feel every single week.
   Owner: "give the idols real personalities. I want to feel their
   existence every single week." The stats existed; this makes them
   BREATHE: a stable VOICE derived from who she is, a weekly MOOD
   read off her real numbers, and a rotating spotlight that turns
   state into small specific scenes — same event, different person,
   different words. Effects stay tiny; this is presence, not power. */
(function (root) {
  'use strict';
  const KP = root.KP = root.KP || {};

  // ---- the spotlight surface (v0.10.29, §89 B) ---------------------------
  // The week's person-moments, newest first, a short ring. The Desk
  // shows this week's; her file shows her latest. One truth: the rail
  // writes here, the inbox only carries the feed echo.
  KP.spotlightRecord = function (state, p, key, text, choice) {
    state.spotlight = state.spotlight || [];
    state.spotlight.unshift({ week: state.week, personId: p.id, key, text, choice: !!choice });
    if (state.spotlight.length > KP.C.PERSONA.spotlightKeep) state.spotlight.length = KP.C.PERSONA.spotlightKeep;
  };
  KP.spotlightThisWeek = function (state) {
    return (state.spotlight || []).filter(m => m.week === state.week);
  };
  KP.spotlightOf = function (state, personId) {
    return (state.spotlight || []).find(m => m.personId === personId) || null;
  };

  // ---- the arc (v0.10.27, §88 C): people change, slowly, on the record --
  // One door for every trait movement in the game. Drift happens ONLY at
  // anchored events (drift without an event is a bug), every movement
  // appends to p.arc with its why, and the total per trait is capped so
  // she stays recognizably herself. The file's "who she is becoming"
  // line reads this list.
  KP.driftTrait = function (state, p, trait, delta, why, line) {
    const D = KP.C.ARC;
    if (!p || !p.personality || p.personality[trait] == null || !delta) return null;
    p.arc = p.arc || [];
    const moved = p.arc.filter(a => a.trait === trait).reduce((s, a) => s + a.delta, 0);
    // the cap: clamp this movement to the room the trait has left
    const room = delta > 0 ? Math.max(0, D.capPerTrait - moved)
      : Math.max(0, D.capPerTrait + moved);
    const d = delta > 0 ? Math.min(delta, room) : Math.max(delta, -room);
    if (!d) return null;
    p.personality[trait] = KP.clamp(p.personality[trait] + d, 0, 100);
    const entry = { week: state.week, trait, delta: d, why };
    p.arc.push(entry);
    if (line) p.history.push({ week: state.week, text: line });
    return entry;
  };

  // ---- the voice: how she talks, forever --------------------------------
  KP.VOICES = {
    blunt:      { label: 'says exactly what {she} thinks, at any volume' },
    sunshine:   { label: 'talks like the room is already {pos} friend' },
    deadpan:    { label: 'delivers everything at one perfect flat pitch' },
    gremlin:    { label: 'is three jokes deep before anyone catches the first' },
    softspoken: { label: 'speaks quietly and means every word of it' },
    earnest:    { label: 'answers every question like it matters, because to {her} it does' },
    wry:        { label: 'has a raised eyebrow where other people keep opinions' },
  };
  KP.voiceOf = function (state, p) {
    const t = p.personality;
    if (t.dominance >= 68 && t.confidence >= 60) return 'blunt';
    if (t.warmth >= 68 && t.confidence >= 55) return 'sunshine';
    if (t.professionalism >= 65 && t.warmth < 50) return 'deadpan';
    if (t.creativity >= 65 && t.professionalism < 55) return 'gremlin';
    if (t.dominance < 42 && t.warmth >= 55) return 'softspoken';
    if (t.workEthic >= 65 && t.coachability >= 55) return 'earnest';
    const keys = Object.keys(KP.VOICES);
    return keys[Math.floor(KP.hash01([state.seed, p.id, 'voice'].join('|')) * keys.length)];
  };

  // ---- the mood: her week, in one honest word (derived, never stored) ---
  KP.moodOf = function (p) {
    if (p.flags.military) return 'serving';
    if (p.flags.personalHiatus) return 'on a break';
    if (p.flags.burnout > 0) return 'benched';
    if (p.fatigue >= 75) return 'running on fumes';
    if (p.flags.scar > 0) return 'carrying it';
    if (p.morale >= 72 && p.fatigue < 50) return 'glowing';
    if (p.morale < 38) return 'quietly off';
    if (p.fatigue >= 55) return 'worn';
    return 'steady';
  };

  // ---- the spotlight: one or two lives per week, up close ---------------
  // Moments are condition-gated readers of REAL state. The spotlight
  // hash-rotates through the roster so everyone's week eventually
  // reaches the desk.
  // the family (v0.11.2, §93): one mechanism, several sentences. Every
  // moment carries LINES; the pick is a hash of the seed, the person and
  // the week that skips how that key last read for her (p.flags.spotMem,
  // one slot per key), so the same key never reads the same way twice
  // running — however many other moments came between.
  function spotIdx(state, p, key, n) {
    if (n <= 1) return 0;
    const h = Math.floor(KP.hash01([state.seed, p.id, state.week, key, 'variant'].join('|')) * n);
    const mem = (p.flags && p.flags.spotMem) || {};
    if (mem[key] === h) return (h + 1) % n;
    return h;
  }
  KP.spotIdx = spotIdx;
  // read her moment and remember it: the memory is one slot per KEY
  // (p.flags.spotMem), written after the read so both reads this week
  // agree, and kept across other keys so a moment she was last seen in
  // three turns ago still does not read the same way. Reading never
  // draws the rng: the families leave the simulation bit-identical
  // (measured v0.11.2 — the 12-seed soak with and without them matched
  // case for case).
  function spotRead(state, p, m) {
    const ls = m.lines ? m.lines(state, p) : null;
    const idx = ls ? spotIdx(state, p, m.key, ls.length) : 0;
    const text = ls ? ls[idx] : m.text(state, p);
    p.flags.spotMem = p.flags.spotMem || {};
    p.flags.spotMem[m.key] = idx;
    return text;
  }
  const MOMENTS = [
    { key: 'quietWeek', priority: 'high', when: (s, p) => p.morale < 38 && p.personality.resilience < 50,
      lines: (s, p) => [
        KP.displayName(p) + ' has been quieter than usual this week — earlier to the van, earlier to {pos} room. The staff mention it carefully, the way you carry something breakable. Worth a look before it becomes a number.',
        KP.displayName(p) + ' has been answering in one word this week, and the word is “fine.” The staff have learned what that word means in this building. Worth a look before it becomes a number.',
        'The van is quiet on ' + KP.displayName(p) + '’s side this week — headphones in, the window, the long way of looking at nothing. The road manager flagged it without being asked. Worth a look before it becomes a number.',
      ].map(x => KP.fillPro(x, p)) },
    { key: 'afterHours', when: (s, p) => p.fatigue > 55 && p.personality.workEthic >= 65,
      lines: (s, p) => [
        'Security logged ' + KP.displayName(p) + ' out of the practice building at 1am again. Nobody scheduled that. ' + (KP.voiceOf(s, p) === 'earnest' ? '“The chorus wasn’t right yet,” {she} said, like that settles it. For {her} it does.' : '{She} shrugged it off in one sentence and slept in the van.'),
        'The practice-room lights were on at 2am and ' + KP.displayName(p) + ' was under them, running the same eight counts until the mirror agreed. Security has stopped logging it as unusual.',
        KP.displayName(p) + ' booked the studio’s dead hours — the slot nobody wants — three nights running. The engineer on nights says {she} apologizes every time and never leaves early.',
      ].map(x => KP.fillPro(x, p)) },
    { key: 'competitiveSting', when: (s, p) => {
        const g = KP.groupOf(s, p.id);
        return g && g.results && g.results.battle && !g.results.battle.won &&
          s.week - (g.lastReleaseWeek || 0) <= 4 && p.personality.competitiveness >= 65;
      },
      effect: (s, p) => { p.morale = KP.clamp(p.morale - 1, 0, 100); },
      lines: (s, p) => { const g = KP.groupOf(s, p.id); const act = g.results.battle.actName;
        return [
          KP.displayName(p) + ' has rewatched the ' + act + ' stages from the shared week three times, taking notes nobody asked {her} to take. Losing sits badly with {her}. That is not entirely a flaw.',
          KP.displayName(p) + ' has the ' + act + ' stage from the shared week saved offline, and the staff caught {her} counting their formation changes on {pos} fingers at breakfast. Losing sits badly with {her}. That is not entirely a flaw.',
        ].map(x => KP.fillPro(x, p)); } },
    { key: 'leaderCarry', when: (s, p) => {
        const g = KP.groupOf(s, p.id);
        return g && g.roles && g.roles.leader === p.id && p.personality.leadership >= 60 &&
          g.members.some(id => (s.people[id] || {}).fatigue >= 70);
      },
      lines: (s, p) => { const g = KP.groupOf(s, p.id);
        const tired = s.people[g.members.find(id => s.people[id].fatigue >= 70)];
        const tn = tired ? KP.publicGiven(tired) : 'the tired one';
        return [
          KP.displayName(p) + ' rearranged the van seating so ' + tn + ' gets the window and the extra twenty minutes of sleep, then took the early interviews {herself}. Nobody upstairs will ever see this work. It is the job anyway.',
          KP.displayName(p) + ' moved {pos} own vocal warm-up to the hallway so ' + tn + ' could sleep an extra half hour in the dressing room, then covered the first two interviews alone. Nobody upstairs will ever see this work. It is the job anyway.',
        ].map(x => KP.fillPro(x, p)); } },
    { key: 'ambitionGlimpse', when: (s, p) => p.status === 'idol' && !p.flags.ambitionMet,
      public: true,
      lines: (s, p) => {
        const amb = KP.ambitionOf(s, p);
        const N = KP.displayName(p);
        const region = () => KP.regionLabel(KP.strongholdsOf(s, p)[0]);
        const lines = {
          solo: [
            N + ' stayed at the company alone on {pos} day off, working on something on the practice-room piano. {She} closed the lid when staff came in. Everyone knows anyway.',
            N + ' has a folder on {pos} phone titled “nothing,” and it is eleven voice memos of {her} humming over a loop at 3am. The producer who saw it by accident said nothing. He has been humming one of them for a week.',
            N + ' asked the A&R desk, carefully, how many songs a mini has, as if {she} did not know. {She} knows. {She} has been counting {pos} own demos against the number.',
            N + ' sent a demo to the house producer’s inbox at 4am with the subject line “ignore this.” He did not ignore it. He has played it for two people, which at this company means six.',
            N + ' bought a secondhand audio interface with {pos} own money, and the dorm has started hearing the same four bars through the wall every night. The four bars are getting better.',
          ],
          trophy: [
            N + ' watches other groups’ win announcements the way scholars read primary sources. {She} thinks nobody has noticed the folder of encore speeches. Everyone has noticed the folder.',
            N + ' re-ran the group’s last stage in {pos} head during the encore broadcast — you could see {pos} lips move on the camera cut. The win announcements are the only television {she} watches live.',
            N + ' keeps the group’s near-miss scores on a note by the dorm door, dated, updated after every show week. Nobody asked. Nobody has taken it down.',
            N + ' knows the vote weighting of every music show by heart and corrected a staffer on one of them, gently, in a meeting about something else entirely.',
            N + ' keeps the outfit from the group’s first win in a garment bag by {pos} bed. {She} says it is for the memory. {She} checks the hanger every week.',
          ],
          stage: [
            N + ' asked the tour manager, casually, what the biggest venue in ' + region() + ' is called. Then {she} looked it up {herself}. Then {she} saved the photo.',
            N + ' walked the empty hall before the sound check — the long way around the floor — and stood at the back rail timing the walk to the stage. The staff pretended not to notice. {She} pretended not to notice them.',
            N + ' asked the tour manager whether the big halls sell the upper tiers first or last. {She} wrote the answer down. {She} underlined it.',
            N + ' timed the group’s set list against the capacity of a hall the group has not played, out loud, in the van, and then pretended {she} had been talking about something else.',
            N + ' stayed in the rafters after sound check for twenty minutes, looking at the floor from above. The lighting crew said nothing. They have seen this before, in people who got there.',
          ],
          variety: [
            N + ' rehearses variety-show reaction timing in the dorm mirror. {Pos} roommate confirmed it. {Pos} roommate was sworn to secrecy. {Pos} roommate lasted one day.',
            N + ' has started answering the staff’s ordinary questions with a beat of silence and a punchline. Half of them land. The half that land are very good, and the road manager has started saving them.',
            N + ' watches the panel shows with the sound off, reading the hosts’ timing from their shoulders. {Pos} roommate has stopped asking what {she} is doing.',
            N + ' did a full bit at the catering table — setup, turn, tag — for an audience of two stylists and the road manager. The stylists laughed. The road manager wrote something down.',
            N + ' has started timing {pos} answers in radio pre-interviews to the half second, and the hosts have started asking {her} back. {Pos} roommate has not been told about the stopwatch.',
          ],
        };
        return (lines[amb] || lines.trophy).map(x => KP.fillPro(x, p));
      } },
    { key: 'friendScene', when: (s, p) => {
        const g = KP.groupOf(s, p.id);
        if (!g) return false;
        return g.members.some(id => {
          if (id === p.id) return false;
          const rel = (s.relationships || {})[KP.pairKey(p, s.people[id])];
          return rel && rel.state === 'close';
        });
      },
      public: true,
      lines: (s, p) => {
        const g = KP.groupOf(s, p.id);
        const friendId = g.members.find(id => {
          if (id === p.id) return false;
          const rel = (s.relationships || {})[KP.pairKey(p, s.people[id])];
          return rel && rel.state === 'close';
        });
        const f = s.people[friendId];
        const fact = KP.factsOf(s, p)[0];
        const N = KP.displayName(p), F = KP.publicGiven(f);
        return [
          N + ' — who ' + fact + ' — dragged ' + F + ' into it at 2am, and the staff group chat has photos. Some friendships are the actual product. This is one.',
          N + ' and ' + F + ' were found asleep on the practice-room floor at 6am, head to head, one pair of earbuds between them. The cleaning crew took a photo before waking them. It is the group chat’s banner now.',
          F + ' says ' + N + ' is the only person who knows {pos} real coffee order, which is a secret, and which ' + N + ' told the whole van. Some friendships are the actual product. This is one.',
          N + ' — who ' + fact + ' — taught ' + F + ' the whole thing on a rest day, badly at first and then not badly at all. Neither of them will admit who laughed harder.',
          N + ' and ' + F + ' have a handshake that takes eleven seconds and has a spoken part. It was performed in the lobby, in full, in front of a delivery driver who was not ready for it.',
          F + ' keeps a running list of things ' + N + ' has said at 2am, titled “evidence,” and read three entries aloud in the van. ' + N + ' denies all three. The van believes the list.',
        ].map(x => KP.fillPro(x, p));
      } },
    { key: 'voiceMoment', when: () => true, public: true,
      lines: (s, p) => {
        const v = KP.voiceOf(s, p);
        const N = KP.displayName(p);
        if (p.status !== 'idol') {
          const tr = {
            blunt: [
              N + ' told the vocal coach, mid-evaluation, exactly which key change was not working. {She} was right, which is the only reason the room survived it.',
              N + ' told the choreographer the second eight-count was built for someone with longer arms, in front of everyone, and offered to prove it. {She} proved it. The count was rewritten.',
              N + ' answered the monthly evaluation’s “what would you change?” with a list. A numbered list. The panel is still working through item four.',
              N + ' was asked by a new coach to “just feel it” and asked, politely, which bar. The coach gave {her} a bar. The bar was correct. The coach has started giving bars.',
              N + ' graded the monthly showcase out loud in the van — every trainee, including {herself}, including the one asleep next to {her}. The grades were fair. That was the problem.',
            ],
            sunshine: [
              N + ' knows the building’s cleaning crew by name and leaves the practice room spotless with a thank-you note taped to the mirror. The facilities staff have unofficially adopted {her}.',
              N + ' learned the new intern’s name before the intern’s manager did, and has been introducing {her} to everyone as an old friend. The intern now has old friends.',
              N + ' brought enough snacks for the whole floor on evaluation day and labeled them by who hates what. The label on the coach’s said “you’re doing great.” He kept it.',
              N + ' started a birthday calendar for the whole floor, including the security desk, and has not missed one. The security desk has started holding the elevator.',
              N + ' walked the new trainee to every room on the first day, introduced {her} to the vending machine by name, and made the whole thing feel normal. It was not normal. It is now.',
            ],
            deadpan: [
              N + ' answered the monthly evaluation question “what is your dream?” with “Tuesday off,” at {pos} usual flat pitch. The panel wrote down “grounded.”',
              N + ' was asked what {she} does to relax and said “this,” gesturing at the practice room, without changing expression. The panel wrote down “focused.” {She} was not joking. {She} might have been.',
              N + ' received the coach’s note about “more energy” and ran the next pass at exactly the same energy, flawlessly. The coach amended the note.',
              N + ' was told to “smile more” on camera and smiled exactly once, at the end, at nothing. The clip has a fan edit. The fan edit has a title. The title is “once.”',
              N + ' asked the coach whether “more feeling” was measured in anything, and waited for the answer at {pos} usual pitch. The coach now says “bigger.” It is measured in bigger.',
            ],
            gremlin: [
              N + ' set the practice-room speaker to play trot at full volume when the lights come on. Three days of investigation found nothing. {She} sat on the investigating committee.',
              N + ' replaced the practice-room clock with one that runs eleven minutes fast. Everyone has been early for a week. {She} is accepting no credit and all of it.',
              N + ' convinced the fourth-floor vending machine to dispense two of everything, somehow, and swore the floor to secrecy. Facilities are baffled. The floor is well fed.',
              N + ' taught the practice-room assistant a cheerful phrase in a language {she} does not speak. The phrase is not cheerful. The assistant uses it on everyone. Nobody has told him.',
              N + ' arrived at the monthly evaluation with a different hair color than the photo on the sheet and claimed to be {pos} own cousin for the first ten seconds. The panel did not laugh. The panel laughed later.',
            ],
            softspoken: [
              N + ' stayed behind to walk a homesick younger trainee through the choreography at half volume until it stuck. Neither of them has mentioned it to anyone.',
              N + ' left a note on a struggling trainee’s locker — four words, no signature — that the trainee has not taken down. Everybody knows whose handwriting it is. Nobody has said so.',
              N + ' fixed the harmony in the back row by moving one half-step and saying nothing. The coach noticed the fix before {she} noticed who made it.',
              N + ' noticed the youngest trainee eating alone and simply started eating at that table, every day, without comment. The table is full now. Nobody organized it.',
              N + ' learned the whole second verse overnight because a roommate could not, and sang it beside {her} on evaluation day a half-step under the melody. The panel heard one voice. That was the point.',
            ],
            earnest: [
              N + ' keeps a notebook of every correction any coach has ever given {her}, indexed by month. The coaches have started checking their own notes against it.',
              N + ' asked the vocal coach for the recording of {pos} own worst run-through this month and listened to it four times in the hallway. The coach has started keeping the recordings.',
              N + ' wrote out the formation changes by hand, color-coded, and taped them inside {pos} locker door. Everyone has photographed the sheet. The original stays.',
              N + ' timed {pos} own eight-counts against the metronome app for an hour after the coaches left and wrote the numbers on the whiteboard. The numbers improved. The whiteboard stays.',
              N + ' asked a senior trainee for the correction they got two years ago, wrote it down, and has been applying it to {pos} own run since Tuesday. The senior had forgotten it. {She} has not.',
            ],
            wry: [
              N + ' listened to the new evaluation rubric in complete silence and asked one question that sent it back for a second draft.',
              N + ' watched the new choreography once, said “interesting choice” about one move, and the move was gone by the afternoon. {She} has not been asked to elaborate. {She} would not.',
              N + ' listened to the coaches argue about {pos} lane for ten minutes and then asked which one of them was going to be in the video. The argument ended.',
              N + ' read the new practice schedule, nodded, and asked whether the sleep was scheduled or optional. It was scheduled, as of that afternoon.',
              N + ' listened to a fifteen-minute pep talk and summarized it in four words that are now written on the practice-room mirror. The coach pretends not to like it.',
            ],
          };
          return tr[v].map(x => KP.fillPro(x, p));
        }
        const m = {
          blunt: [
            N + ' was asked a polite filler question in a radio pre-interview and answered it honestly, at length, with numbers. The host is still recovering. The clip is doing well.',
            N + ' was asked on a panel which member is the group’s worst cook and answered with a ranking, including {herself}, including reasons. The clip has a title now.',
            N + ' told a fan at the fan sign that track four was better than the single, on camera, and then told the company the same thing in a meeting. Both rooms survived.',
            N + ' was asked in an interview which comeback {she} would redo and named one, with the reason, on the record. The company called it “candor” in the statement. The statement was short.',
            N + ' told the stylist the stage outfit was built for a photo, not a dance, and did the chorus once in it to prove it. The outfit was rebuilt. The stylist agreed, eventually.',
          ],
          sunshine: [
            N + ' learned every staffer’s coffee order this month, including the new intern nobody introduces. The building runs two degrees warmer when {she} is in it.',
            N + ' hugged the broadcast’s floor manager on the way off set, by name, and the floor manager — nine years in television — needed a moment. The crew now requests the group.',
            N + ' wrote the lighting crew a thank-you card after the last stage. Lighting crews do not get cards. This one is laminated.',
            N + ' remembered a fan’s name from a fan sign two years ago and said it first. The fan did not finish the sentence. The clip did numbers for a week.',
            N + ' brought the opening act onto the group’s encore stage because “they drove four hours.” Nobody had cleared it. Everybody cleared it afterward.',
          ],
          deadpan: [
            N + ' delivered a flawless joke in a fan call at {pos} signature flat pitch, waited out the three-second delay, and moved on before the laugh landed. The compilation channels feast.',
            N + ' was asked for a “cute” pose at the photo wall, delivered a perfectly neutral one, held it, and said “done.” The photographer kept it. It is the one everyone saved.',
            N + ' read the comeback’s own press release aloud in the van in a voice so flat the group had to pull over. The road manager has it saved as audio.',
            N + ' was asked on a panel to do an aegyo and did it with such precision and so little expression that the host had to sit down. The host asked for it again. {She} did not do it again.',
            N + ' answered “what is your charm point?” with “punctuality,” and the group laughed for a full minute. {She} waited it out. {She} was being accurate.',
          ],
          gremlin: [
            N + ' has been hiding a rubber duck in a different member’s bag every day this week. No one has caught {her}. {She} has photos of all of it. The reveal is being saved for something.',
            N + ' has been answering the fans’ messages one minute before the official posting time, every day, so the fans think {she} is psychic. {She} is not psychic. {She} has the schedule.',
            N + ' switched the name cards at the fan sign and signed as {pos} roommate for forty minutes. Nobody noticed. {Pos} roommate’s handwriting has never looked that good.',
            N + ' replaced every bookmark in the road manager’s planner with photos of {pos} own face. The road manager has not mentioned it. The road manager has kept them.',
            N + ' has been saying the wrong year in every interview, by one, consistently, for a month, and the fandom has built a theory. There is no theory. {She} is waiting to see how far it goes.',
          ],
          softspoken: [
            N + ' said maybe eleven words at the team dinner, and two of them fixed an argument nobody knew how to end. The room went quiet in the good way.',
            N + ' noticed the youngest member’s hands shaking before the encore stage and simply held one of them through the countdown, out of frame. The youngest member did not shake.',
            N + ' thanked the session musicians by name in a live, quietly, before the host could move on. The bassist posted about it. The bassist does not post.',
            N + ' stayed on the line after a fan call ended, because the fan had not finished, and let the staff reschedule the next one around it. Nobody was told. The fan told everyone.',
            N + ' answered a hard question at the press conference with a sentence so quiet the room leaned in, and then with another one that nobody printed because it was too kind to be a headline.',
          ],
          earnest: [
            N + ' wrote thank-you notes to the session musicians from the last record. By hand. They have started asking to be booked on {pos} songs specifically.',
            N + ' stayed after the music-show recording to watch the crew break down the set, asking how long it takes. Ninety minutes. {She} now knows the crew by name.',
            N + ' apologized to the choreographer for a missed count nobody else saw, in writing, with a timestamp. The choreographer framed it, which {she} finds mortifying.',
            N + ' learned the names of the whole broadcast crew by the second rehearsal and used them. The crew has a name for {her} now. The crew does not give names.',
            N + ' asked the choreographer for the full version of a cut move and learned it for a stage where it will not appear, in case. The choreographer is thinking about putting it back.',
          ],
          wry: [
            N + ' watched the marketing meeting propose a concept in complete silence, raised one eyebrow at the exactly correct moment, and the deck was revised by Friday.',
            N + ' was told the new concept was “a bold new direction” and asked, politely, which direction. The concept was clarified. The clarification was better.',
            N + ' answered a reporter’s question about the group’s “rivalry” by asking which one the reporter meant. The reporter had not expected a choice. The quote ran anyway.',
            N + ' was handed a scripted “spontaneous” answer for the press conference, read it once, and gave a better one that used none of it. The script writer took notes.',
            N + ' listened to the host explain the game’s rules for four minutes and then asked whether the rules applied to the host. They did, as of that moment. {She} won.',
          ],
        };
        return m[v].map(x => KP.fillPro(x, p));
      } },
  ];
  // the one accessor: a moment's text is its family's pick for her this week
  // the pick: the rota starts at a weekly hash and takes the first moment
  // that is true for her. (A v0.11.2 draft preferred a moment she was not
  // last seen in; it changed which effects and doors fired and moved the
  // worlds — the soak's chronic-file chain went 14→5/40 — so the rota
  // stays as it was and the family's memory alone carries the variety.)
  function spotPick(state, p) {
    const ROT = MOMENTS.slice(1);   // quietWeek belongs to the staff scan
    const offset = Math.floor(KP.hash01([state.seed, p.id, state.week, 'moment'].join('|')) * ROT.length);
    for (let i = 0; i < ROT.length; i++) {
      const m = ROT[(offset + i) % ROT.length];
      if (m.when(state, p)) return m;
    }
    return null;
  }
  KP.spotPick = function (state, p) { const m = spotPick(state, p); return m ? m.key : null; };
  MOMENTS.forEach(m => {
    if (m.lines && !m.text) m.text = (s, p) => { const ls = m.lines(s, p); return ls[spotIdx(s, p, m.key, ls.length)]; };
  });

  // ---- the choices (v0.8.2): some moments put the call on YOUR desk ----
  // The critic's finding: a spotlight that provably never matters gets
  // skimmed, and a skimmed person is an attribute set with better
  // prose. The three moments that already carried effects now carry a
  // decision instead — resolve it and the effect is yours; let it
  // expire and the week resolves the old way without you.
  const CHOICES = {
    competitiveSting: {
      options: [{ id: 'fuel', label: 'Let it fuel {her}' }, { id: 'coach', label: 'Send the vocal coach over' }],
      resolve: (state, p, optionId) => {
        const D = KP.C.DOOR;
        if (optionId === 'coach') {
          if (state.budget >= D.coachOverCost) state.budget -= D.coachOverCost;
          p.morale = KP.clamp(p.morale + D.coachOverMorale, 0, 100);
          KP.recordDirected(state, p.id, 'stingCoached');
          return { toast: 'The vocal coach "happened to be passing" the practice room at 11pm. They broke the rival stage down bar by bar until it stopped being a wound and became homework.' };
        }
        p.morale = KP.clamp(p.morale - 1, 0, 100);
        KP.recordDirected(state, p.id, 'stingRespected');
        return { toast: KP.fillPro('You let {her} burn on it. Some engines run on exactly this fuel, and {she} is one of them — the notes {she} is taking nobody asked for are getting sharper.', p) };
      },
      expire: (state, p) => { p.morale = KP.clamp(p.morale - 1, 0, 100); },
    },
    leaderCarry: {
      options: [{ id: 'restday', label: 'Give the leader a rest day too' }, { id: 'file', label: 'Put it in {pos} file' }],
      resolve: (state, p, optionId) => {
        const D = KP.C.DOOR;
        if (optionId === 'restday') {
          if (state.budget >= D.restDayCost) state.budget -= D.restDayCost;
          p.fatigue = KP.clamp(p.fatigue + D.restDayFatigue, 0, 100);
          KP.recordDirected(state, p.id, 'carrySeen');
          return { toast: KP.fillPro('Somebody rearranged the van seating so ' + KP.pro(p).she.toUpperCase() + ' gets the window this time. {She} pretended not to notice who ordered it. {She} noticed.', p) };
        }
        KP.recordDirected(state, p.id, 'carrySeen');
        p.history.push({ week: state.week, text: 'Carried the group through a tired week. The company put it on the record.' });
        return { toast: KP.fillPro('It went in {pos} file, in writing, where renewal negotiations live. Invisible work stops being invisible the day someone writes it down.', p) };
      },
      expire: () => {},
    },
  };

  // the pending call is a candidate on the one door (v0.10.30)
  KP.registerKnock('persona', ['momentChoice'], function (state) {
    const pm = state.pendingMoment;
    if (!pm || state.week - pm.week > 2 || !CHOICES[pm.momentKey]) { state.pendingMoment = null; return []; }
    return [{ kind: 'momentChoice', momentKey: pm.momentKey, personId: pm.personId, weight: 3, expiresIn: 2,
      onPick: (st) => { st.pendingMoment = null; } }];
  });

  KP.registerScene('momentChoice', {
    title: (state, sc) => {
      const p = state.people[sc.personId];
      return (p ? KP.displayName(p) : 'She') + ' · this week';
    },
    body: (state, sc) => {
      const p = state.people[sc.personId];
      const m = MOMENTS.find(x => x.key === sc.momentKey);
      return p && m ? m.text(state, p) + ' The call is yours.' : '';
    },
    options: (state, sc) => {
      const p = state.people[sc.personId] || null;
      const ch = CHOICES[sc.momentKey];
      return ch ? ch.options.map(o => ({ id: o.id, label: KP.fillPro(o.label, p) })) : [{ id: 'ok', label: 'Noted' }];
    },
    resolve: (state, sc, optionId) => {
      const p = state.people[sc.personId];
      const ch = CHOICES[sc.momentKey];
      return p && ch ? ch.resolve(state, p, optionId) : {};
    },
    expire: (state, sc) => {
      const p = state.people[sc.personId];
      if (!p) return null;
      if (CHOICES[sc.momentKey]) CHOICES[sc.momentKey].expire(state, p);
      // the silence is on the conversation record (scenes.js keeps it);
      // no letter about a letter (v0.10.29, §89 C)
      return null;
    },
  });

  // ---- the pressure read (v0.8.2): the spotlight follows the fire -------
  // Round-robin coverage was metronomic fairness; lives that are
  // actually on fire kept waiting their turn. Score the roster by
  // drama pressure and follow the top of it; the rota stays as the
  // boredom fallback so quiet stretches still give everyone a week.
  function pressureOf(state, p) {
    let s = 0;
    if (p.morale < 42) s += (42 - p.morale) / 6;
    if (p.fatigue >= 58) s += (p.fatigue - 58) / 11;
    const g = KP.groupOf(state, p.id);
    if (g && g.results && g.results.battle && !g.results.battle.won &&
        state.week - (g.lastReleaseWeek || 0) <= 4) s += 2;
    if (p.status === 'idol' && !p.flags.ambitionMet && g && g.debuted &&
        state.week - g.debutWeek >= 40) s += 1;
    return s;
  }

  KP.registerWeekly('personhood', 856, function (state, rng, inbox, roster, groups) {
    if (!roster.length) return;
    const count = roster.length > 6 ? 2 : 1;
    // pressure first: whoever's life is on fire, recent features excluded
    const fresh = roster.filter(p => p && p.status !== 'released' &&
      state.week - (p.flags.spotWeek || -99) >= 4);
    const byPressure = fresh
      .map(p => ({ p, s: pressureOf(state, p) }))
      .filter(x => x.s >= 1.5)
      .sort((a, b) => b.s - a.s ||
        KP.hash01([state.seed, a.p.id, state.week].join('|')) - KP.hash01([state.seed, b.p.id, state.week].join('|')));
    const picks = byPressure.slice(0, count).map(x => x.p);
    // the rota fills the quiet weeks — everyone still gets her turn
    for (let k = 0; picks.length < count && k < roster.length; k++) {
      const p = roster[(state.week * count + k) % roster.length];
      if (p && p.status !== 'released' && !picks.includes(p) &&
          state.week - (p.flags.spotWeek || -99) >= 4) picks.push(p);
    }
    picks.forEach(p => {
      p.flags.spotWeek = state.week;
      const pick = spotPick(state, p);
      if (pick) {
        // the family's memory (v0.11.2, §93): the index is read before it is
        // written, so both reads of the text this week agree; next time she
        // is up, the same key skips this line
        const texts = spotRead(state, p, pick);
        // a moment with a CHOICE is a candidate for the one door
        // (v0.10.30, §89 D1): it waits in the pending slot for the
        // queue's pick; the moment itself lands on the spotlight now
        if (CHOICES[pick.key] && !state.pendingMoment) {
          state.pendingMoment = { personId: p.id, momentKey: pick.key, week: state.week };
          KP.spotlightRecord(state, p, pick.key, texts, true);
          return;
        }
        if (pick.effect) pick.effect(state, p);
        // the spotlight (v0.10.29, §89 B): the moment leaves the inbox
        // for its own surface — the Desk's "up close" card and her file.
        // It was 70 high-priority notes a year that nothing could trim;
        // now it is one card that is always there. The note still rides
        // through the week for the feed pass (spotlight: true drops it
        // at the trim), so the timeline keeps reacting to her week.
        KP.spotlightRecord(state, p, pick.key, texts, false);
        inbox.push({ kind: 'development', moment: pick.key, spotlight: true,
          ind: (pick.public && p.status === 'idol') ? 'personMoment' : undefined,
          priority: 'flavor', personId: p.id, text: texts });
      }
    });

    // going quiet is not a rotation event — the staff flag whoever is
    // doing worst, whoever the spotlight is on this week. One person
    // per week, with a cooldown so concern reads as concern, not
    // nagging. Priority 'high': "worth a look before it becomes a
    // number" is a warning, and warnings survive the trim.
    const quiet = MOMENTS[0];
    const flagged = roster
      .filter(p => p.status !== 'released' && quiet.when(state, p) &&
        state.week - (p.flags.quietFlagged || -99) >= 10)
      .sort((a, b) => a.morale - b.morale)[0];
    if (flagged) {
      flagged.flags.quietFlagged = state.week;
      inbox.push({ kind: 'development', moment: 'quietWeek', priority: 'high',
        personId: flagged.id, text: spotRead(state, flagged, quiet) +
          (function () {   // the byline (v0.8.4): "the staff" have names now
            const g2 = KP.groupOf(state, flagged.id);
            const mgr = g2 && KP.managerOf && KP.managerOf(state, g2);
            return mgr ? ' — flagged by ' + mgr.name + ', who notices these things first.' : '';
          })() });
    }
  });

  // public moments echo on the timeline through the kernel registry
  KP.onFeedEvent('personMoment', (state, n, rng) => {
    const p = state.people[n.personId];
    if (!p) return null;
    const N = KP.displayName(p);
    return rng.pick([
      { persona: 'fan', text: KP.fillPro('the ' + N + ' story from this week’s staff-adjacent accounts… {she} is exactly who we thought {she} was and BETTER. protect this one', p) },
      { persona: 'casual', text: 'every week I learn one (1) new fact about ' + N + ' and every week it improves my quality of life measurably' },
      { persona: 'stan', text: 'the ' + N + ' anecdote of the week has been added to the lore document. page 41. the document has an index now' },
      { persona: 'fan', text: KP.fillPro(N + ' being exactly like this off camera too is the whole point. {she} is not a concept. {she} is a person we were lucky enough to notice', p) },
      { persona: 'casual', text: 'I do not even follow this group and the ' + N + ' story made my whole commute. the industry is 90% nonsense and 10% this' },
      { persona: 'stan', text: KP.fillPro('staff accounts dropping a ' + N + ' crumb on a weekday. we are being FED. {she} would be embarrassed. we are not sorry', p) },
      { persona: 'press', text: 'The small stories are the ones that travel: a staff anecdote about ' + N + ' outran the week’s actual announcements by a wide margin.' },
      { persona: 'anti', text: 'a “leaked” wholesome ' + N + ' anecdote the same week as a schedule. sure. anyway it was a good anecdote' },
    ]);
  });

  // ---- the staff read (v0.9.3) ------------------------------------------
  // Personality in words, derived from the SAME live numbers that
  // chemistry, coaching, discourse, and the renewal table already read —
  // one truth, finally spoken. Only genuine edges get a line (≥65 high,
  // ≤35 low); the three sharpest edges are the read. Words, never meters.
  const READ_AXES = [
    ['leadership',
      'when plans change mid-run, the room looks at {her} first',
      'happy to follow a good plan — {she} has never once reached for the wheel'],
    ['workEthic',
      'first in, last out — the practice-room log keeps {pos} receipts',
      'does exactly what is asked, to the minute, and not a minute more'],
    ['coachability',
      'corrections stick the first time; the coaches have started saying things once',
      'takes every note politely and then does it {pos} way anyway'],
    ['warmth',
      'new trainees find {her} first — nobody tells them to',
      'keeps a distance the room can feel; what {she} offers is respect, not warmth'],
    ['dominance',
      '{she} fills a room without asking it to move',
      'gives ground easily — sometimes before anyone asked {her} to'],
    ['confidence',
      'walks into evaluations like they were {pos} idea',
      'needs a win proven to {her} twice before {she} believes it'],
    ['professionalism',
      'grudges do not survive a schedule — {she} lets things go by Monday',
      'feelings ride shotgun on working days, and they reach for the wheel'],
    ['competitiveness',
      'reads every chart like a scoreboard and keeps the losses',
      'runs {pos} own race; rankings bounce off {her}'],
    ['resilience',
      'bad weeks do not follow {her} into the next one',
      'carries a hard week longer than {she} admits'],
    ['adaptability',
      'hand {her} a changed plan mid-run and {she} is already inside it',
      'wants the plan three days before the plan'],
    ['creativity',
      'keeps pitching ideas nobody scheduled — an alarming number are good',
      null],
  ];
  KP.staffRead = function (state, p) {
    const t = p.personality;
    const hits = [];
    READ_AXES.forEach(ax => {
      const v = t[ax[0]];
      if (v >= 65 && ax[1]) hits.push({ w: v - 50, line: ax[1] });
      else if (v <= 35 && ax[2]) hits.push({ w: 50 - v, line: ax[2] });
    });
    hits.sort((a, b) => b.w - a.w);
    if (!hits.length) {
      return [KP.fillPro('still forming — {she} has not shown the room {pos} edges yet', p)];
    }
    return hits.slice(0, 3).map(h => KP.fillPro(h.line, p));
  };
})(typeof window !== 'undefined' ? window : globalThis);
