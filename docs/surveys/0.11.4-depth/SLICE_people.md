# DEPTH SURVEY — SLICE: the people (trainees and idols as the player lives with them)

Scope: development, practice, rituals (eval only), person, persona, life, relationships, pair,
friction, door, knock, gravity, scars, medical, hiatus, military, contracts, secret, scandal,
broadcast, outside, social, mirror, group, memory; UI views_talent.js + the member parts of
views_groups.js. Phase order read from js/engine/sim.js CORE_PHASES (develop 100 … chartAndFeed 900)
plus the registered weeklies: medical 290 · pairs 405 · outside 520 · soloEra 605 · practice 610 ·
evals 612 · reentry 619 · gravity 640 · contracts 784 · stageDoor 786 · military 786 · memberDesk 788 ·
hiatus 789 · friction 790 · secret 794 · wecast 796 · scandal 797 · lifeMoments 855 · scars 855 ·
personhood 856 · theDoor 857 · society 857 · timeShare 859.

The bar (v0.11.4, Bible §95): a loop the player LIVES — a read every week with the line drawn, a letter
a week that names her place, doors during the run, an arc for the person, a ceremony at the end.

One structural fact colours every card below: every "she comes to you" scene in this slice goes
through ONE queue (knock.js:54-76). Twelve kinds compete — friction ×5, door ×2, gravity ×2, scars,
persona, walkOut — for one pick a week, after a one-week gap and a 60% roll (constants KNOCK:
gapWeeks 1, chance .6, personGapWeeks 6; mirror-adjusted 5–8). Whatever the roster size, the
player answers at most one person-question every ~2–3 weeks, and a given person knocks at most
every six weeks. The depth of the person-decision layer is therefore bounded by the door, not by
the number of scenes registered. A sibling probe's scene census in this scratchpad
(scenes_registered.txt 53 vs scenes_seen.txt 44) shows the soak never reached: frictionQuietNo,
quietEra, traineeQuit, walkOut, enlistPapers, servicePlan, returnRun.

Grades 0–3 per axis (0 absent · 1 a number or one line · 2 present but thin · 3 deep). Totals /18.

---

## DEPTH CARDS

### 1. The training week & the monthly sheet
**Modules:** development.js (developWeek, showcaseWeek), sim.js (develop phase 33-50, idolWeek
494-525, idolAutoTrain 527-554, setTraining 557-566), rituals.js (evals 56-136).
**Lifespan:** sign → set two focus chips + an intensity → 4 silent weeks → evaluation day (a letter
and a board) → repeat for 1–4 years → a lineup or the practice years' exits. For an idol the loop
becomes invisible: she drills her weakest domain on her own (sim.js:527-554), with a 1.5%/week note.

**Reads:** focus chips + intensity segment per trainee on the Training page (views_talent.js:252-259),
a one-line plan on the profile (574-579); talents as bands with "?" fog (539-544); mood as one word
(components.js:45-52); the evaluation board — rank list, "the ace", "the clock", posted/next date
(views_talent.js:225-240); "eval 3/7" chip on the roster row (148-149). The sheet letter itself is
priority FLAVOR (rituals.js:124) — under the inbox law (kernel.js:65-72, budget 5, only critical
bypasses) evaluation day is the first thing trimmed in a loud week. No trajectory is rendered:
p.evalHistory keeps a capped history (rituals.js:79-82) but only the last rank reaches the UI. Growth
is invisible except as a band changing or a rank moving — and, after debut, as RAW NUMBERS
("Vocals +7", views_talent.js:426-435).
**Decisions:** toggle-focus / set-intensity (app.js:1030-1046) — proactive dials; zero scenes, zero
doors. The eval has no verb: the after-eval talk is automatic (rituals.js:104-118). Bot: two best
perceived domains, rest >70 fatigue, light >55 (harness.js:1088-1094).
**Arc:** talents grow (hidden), confidence rises on a breakthrough (development.js:119); the sheet
writes history for climbs ≥2 (rituals.js:101), the ace streak (88), the talk (111); morale rides
trajectory (94-99). The player sees the change only as rank movement and band drift.
**Event:** none. A breakthrough is a letter (family, development.js:122-127); the monthly showcase
names a star 50% of the time (164-178) and says nothing otherwise; evaluation day is a flavor letter
the player never attends. Plan → wait → result, every month, for years.
**Flavor:** families — breakthrough 4, plateau 3, showcase 5 with voice variants, evalSheet 3,
evalTalk 3 (lineFor). The burnout wall is a lone string ("This was preventable", development.js:145).
**Teeth:** burnout past the hard cap and the heavy-week injury (142-149); fatigue drag on gains.
Ignorable at a cost: no focus = no gain (98-105), silently. The coach seat multiplies invisibly by
design (99-103).
**Grades:** Reads 2 (bands, a board, a chip — no trajectory, no letter that survives) · Decisions 1
(two dials, nothing to answer) · Arc 2 (history lines exist; growth itself is unseen) · Event 1 (a
flavor letter) · Flavor 2 · Teeth 2 = **10**.
**Gap:** across 13 years the player sets the same two chips a hundred times and never once sits at
the long table — the sheet is the trainee's only ceremony and it is the first letter the week trims.

### 2. The practice-room years — the resignation, the clock, the trainee table, the release
**Modules:** practice.js, contracts.js (trainee clock 61-96, traineeRenewal 139-193), sim.js
(releaseTrainee 569-612), floor.js (leftUs 249-271, reentry 320-368), military.js (the wall on a
trainee, 177-187).
**Lifespan:** the three-year paper is stamped at signing (scouting.js:296) → silent years → a lineup
walks out without her (doorway letter, practice.js:123-139) → the question / the letter → the
promise's 40-week clock → kept (the last-chance debut) or broken (she packs) → or the table at term's
end → or the kind cut → she resurfaces on the open board, file intact (floor.js:352-366).

**Reads:** "the clock" chip on the board (views_talent.js:238), tenure in the scene bodies
(practice.js:174, 226-227), the doorway/quit/aging letters (urgent). The THREE-YEAR TRAINEE CONTRACT
IS NOT RENDERED ANYWHERE (grep js/ui traineeContract: no hits) — the clock exists only as the letter
"running out — term N ends <date>" (contracts.js:82-83) and the table. The promise is on The record
(views_desk.js:556-566) with its due date. After release: a "back on the open board … the file
remembers you" letter (floor.js:363-365) and the chapter strip (floor.js:86-88).
**Decisions:** traineeQuit — promise / a real week off / grace (practice.js:176-181; bot: promise if
avg≥50 and a lineup is coming, else plead if budget, else accept, harness.js:1429-1431);
agingOutTalk — promise / honest / the kind cut (229-233; bot: promise / honest / release by read);
traineeRenewal — renew / let it run out (contracts.js:156-159; bot: renew if under the aging age and
morale ≥25, harness.js:1414-1419); the release verb with the friends named in the confirm
(app.js:1005-1028). All reactive but the release.
**Arc:** rich history lines at every fork (practice.js:36-38, 115, 130, 188, 201, 240, 250, 255);
flags resigned/agingOut; directed toldStraight / leftWaiting / promiseKept / friendReleased; the
claim debutByPromise (272-304) with a roomwide −3 when it breaks; the lastChanceDebut narrative +
critical letter + feed (118-121, 307-315); chapters 'released'/'reentry' (floor.js:86-89).
**Event:** yes at the forks — the folded letter, the five-minute silence, the last-chance bow ("a beat
longer than choreographed") are moments. Between the forks there is nothing: no letter marks year
one, year two, the term's halfway, the birthday that moves her toward the wall (the trainee birthday
was trimmed, life.js:239).
**Flavor:** scene bodies are single templates (practice.js:174, 227; contracts.js:150-154) — one
string each, voice-blind; the door's OPENERS pattern (door.js:16-33) is not used here. Letters single
(practice.js:135-136, 160-162). The quit letter's toasts single.
**Teeth:** real and visible — silence = she leaves (expire, 209-215; 260-268 −6 and resigned); a
promise broken = she packs the night a lineup goes without her (290-301); the release wounds her
close friends (sim.js:599-608) and the executive if the internet had decided (588-597); a released
trainee can refuse the second signature by grudge (floor.js:306-314). The bot never sees traineeQuit
or walkOut (sibling census) — the teeth are human-only.
**Grades:** Reads 2 (the clock is invisible until it rings) · Decisions 3 · Arc 3 · Event 2 (moments
at the forks, silence between) · Flavor 1 · Teeth 3 = **14**.
**Gap:** the years themselves have no episodes — a trainee's second anniversary, the term's last
six months and the age wall approaching are all status with no letter, so the resignation arrives
as a surprise rather than as the end of something the player watched.

### 3. The debut-team selection — the project, the posting, the night
**Modules:** group.js (openProject 39-65, cancelProject 67-76, proposeGroup 81-180, execReviewLineup
184-208, roleHints 295-308), sim.js (project phase 99-121), development.js (85-95 the push),
practice.js (speculation 80-104), debut.js (843-861 the night's consequences), sim.js (155-170 the
landed letter).
**Lifespan:** open a project (lock 1–3, seek ≤2 domains) → the room knows (one letter) → hopefuls
train harder, silently (×driveMult, +fatigue) → propose the lineup in the builder → the executive's
lines → the Studio (other slice) → debut night: status flip, chapter, +1 confidence, the before
picture, the breakout named.

**Reads:** the builder — portraits with headline bands, room preview (chemistry notes +
friction cards), role selects with staff picks, three name pitches (views_groups.js:530-619); the
project card (102-126); the speculation letter — single template, FLAVOR priority (practice.js:
99-102); the standout note — single template at PROJECT.standoutNoteChance (sim.js:109-118); the
executive's review in a modal (app.js:1116-1130); the passed-over ace is a history line + directed
grudge, no letter (group.js:171-178); the dropped locked member likewise (157-170).
**Decisions:** open-project, builder-seeking, cancel-project, builder-propose / -solo (app.js:
1049-1131) — proactive, consequential. Bot: locks its top two seeking vocals+dance, proposes with
hints (harness.js:1178, 1214).
**Arc:** 'Locked into', 'Selected for the debut lineup', 'left out of the final lineup', the ace's
silence; at the night: chapter 'debut', drift confidence +1, debutSnap, the breakout +8
(debut.js:844-861). Visible on History and The person.
**Event:** the NIGHT is an event (critical landed letter family, sim.js:161-165; the Studio report).
The SELECTION is not: the list goes up as a modal of two-to-four executive sentences; nobody in the
room is told; the ones left off learn it as a morale number. The weeks of the push are silent.
**Flavor:** thin — one speculation template, one standout template, executive lines single per
condition (group.js:200-206), the "landed" family of 3.
**Teeth:** dropped-locked −morale (constants PROJECT.droppedMoraleHit), cancel −morale on every
hopeful, passedOver −6 + grudge on the ace, the mandate window (another slice) closes on a project
left open. Ignorable: an open project pushes the hopefuls' fatigue indefinitely, unread.
**Grades:** Reads 2 · Decisions 2 · Arc 2 · Event 1 (a modal) · Flavor 1 · Teeth 2 = **10**.
**Gap:** the single most-repeated ceremony of a 13-year career — the list on the wall — has no letter
for the room, no named moment for the one who missed by one, and no door for the ace left off.

### 4. The office door & the asks
**Modules:** door.js (idolAsk 64-124, ambitionPromise claim 127-145, idolDoor challenge 149-203,
OPENERS 16-33), knock.js, persona.js (CHOICES 361-394, momentChoice 404-435), mirror.js,
scenes.js (the ledger 69-116).
**Lifespan:** 30 weeks past debut with the ambition unmet → she knocks (idolAsk) → promise / honest /
"we'll see" → a 48-week claim → kept (the sticky note) or broken (−6, warmth drifts). The challenge
(concept misfit, confidence ≥62) every 40 weeks. The moment call (competitiveSting, leaderCarry)
whenever the spotlight lands on one.

**Reads:** the scene on the Desk rail (views_desk.js:112-121); promises on the clock with due dates,
settled with her reply (556-579); the conversation record (580-591); the ledger between you in words
(views_talent.js:438-445, words from constants LEDGER.KINDS 2835-2896); standing in the road staff's
words (495-497); the mirror on the building (views_desk.js:375-379).
**Decisions:** idolAsk promise/honest/deflect (bot: promise for solo/trophy else honest, harness.js:
1305-1311); idolDoor retool/hold (bot options[0] retool); momentChoice two-way (bot options[0]).
Reactive; one knock a week across the whole roster.
**Arc:** directed acts on every branch; history lines (door.js:103, 108, 113, 167, 172); the claim's
settlement writes the file; promiseBroken chips warmth through driftTrait (scenes.js:79-81); the
mirror turns the pattern into a sentence about the player and gates the softspoken one's quiet no
(friction.js:93-101) and the knock gap (mirror.js:57-62).
**Event:** the knock is a moment — opener by voice ×7 coloured by standing (door.js:25-33); the
kept promise is a 'high' letter in her words (door.js:131-134). No ceremony, none needed.
**Flavor:** openers family; bodies single per topic; toasts single; the settlement notes single.
**Teeth:** deflect −3 + grudge; silence −2 + leftWaiting; a broken promise −6 + grudge 2 + warmth
drift, read at renewal ×1.5 (contracts.js:35). The door cannot be ignored for free.
**Grades:** Reads 3 · Decisions 2 (three scene kinds, one a year each per person) · Arc 3 · Event 2 ·
Flavor 2 · Teeth 3 = **15**.
**Gap:** across a career the same three asks recur with the same bodies — the ask never grows a
second act (she does not come back with a counter, a date of her own, or a lawyer's font until the
walkout), so the door is deep per knock and shallow per decade.

### 5. The spotlight moments & the inner life
**Modules:** persona.js (MOMENTS 118-334, spotPick 341-349, personhood weekly 454-524, staffRead
583-596, voiceOf/moodOf), life.js (facts, ambition, bubble, birthdays 228-265, anniversaries 267-291,
selca, bias breakup), memory.js (narratives on the file), social.js (followers, milestones).
**Lifespan:** every week one or two lives are read up close (pressure first, rota second) → a card on
the Desk → the file's "Up close, lately" → rarely a two-way call.

**Reads:** the strongest reads in the slice — Up close on the Desk (views_desk.js:248-260), The person
tab: voice + mood + ambition in words, two facts, chapters, who she is becoming, since debut, the
ledger, her people (views_talent.js:391-453); the staff read (556-557); narratives "the public knows
her" (469-473); the quietWeek warning with the manager's byline (persona.js:514-523, high); birthday
(flavor family) and anniversary (high family) letters; followers + milestones.
**Decisions:** two of seven moments carry a call (competitiveSting, leaderCarry — persona.js:361-394),
and only when the pending slot is free and the door picks them (485-489). Bot: options[0].
**Arc:** none from the moments themselves (competitiveSting −1 morale, 136; CHOICES small morale /
fatigue / a file line, 380-391). The arc list the tab shows is written by other systems.
**Event:** none — by design ("presence, not power", persona.js:1-7). The bubble/selca/birthday are
feed and flavor.
**Flavor:** the deepest families in the game — voiceMoment 5 lines × 7 voices × trainee/idol,
ambitionGlimpse 5 × 4, friendScene 6, afterHours 3, with per-key anti-repeat memory (spotIdx 95-117).
**Teeth:** none; the quietWeek flag is a warning only, with a 10-week cooldown (511-513).
**Grades:** Reads 3 · Decisions 1 · Arc 1 · Event 0 · Flavor 3 · Teeth 0 = **8**.
**Gap:** the moments are the best-written sentences in the game and they never accumulate — the
fourth "2am practice room" sighting of the same person reads exactly like the first and leads
nowhere, so the player learns to skim the one card that should be teaching them who to answer for.

### 6. Friction, the sit-down & the pairs
**Modules:** friction.js (5 scenes 154-436, the steadying 115-127, battleNerve 442-446),
relationships.js (relationsWeek 33-84, relObservation 89-151, mediatePair 179-240, chemistryNotes
278-318), pair.js (mentorship 42-86, writing pair 89-137, seating 140-164, rivalry 167-199, weekly
202-264), life.js (the dorm 103-150), badblood.js (names the rivalry; other slice).
**Lifespan:** pair scores drift weekly from compatibility, shared focus, rooms → a crossing worth a
letter (tense/conflict/close) → a friction card with its handle → the sit-down / the seating chart →
the mentorship's ten weeks → the rivalry framed, holding or souring. The five friction questions
arrive through the door on real state (prep + fatigue + ethic; promo + a mouthy voice; crunch; the
funny one between eras; the softspoken one below the morale bar).

**Reads:** friction cards with the sit-down and seating buttons (components.js:101-123; on the
dossier 560-570, the group page 340, the builder 603); the room report in words (relationships.js:
278-318); the dorm rooms (views_groups.js:324-333); the pairs card with the desk's own proposal
(355-371); rivalry notes (342-353); one relationship letter a week, worst first (relationships.js:
78-83), families keyed to the traits that drove the change (89-151); mentorEnded letter (pair.js:
225-227); rivalrySoured (258-259). The steadying is silent by ruling (friction.js:123-126).
**Decisions:** proactive — mediate (cost, cooldown, odds from who they are), seatApart, assignMentor,
pairWriters/unpair, rivalryStance, dorm-shuffle; reactive — the five friction scenes with the
inversion as content (grinder/drained; pride on the gift; kill/ride). Bot: mediates the worst pair,
takes every pair the desk proposes, frames at 65 morale, options[0] on every friction
(harness.js:1095-1121, 1484-1485).
**Arc:** directed acts on every branch; the mentorship ends with a confidence drift + a history line
+ a letter that says whether the turn came (pair.js:217-228); the rivalry's sour/hold toggles a
chemistry drag; relationship states persist; mediation writes 'mediated' on both. Trait drift
otherwise absent — a feud resolved does not change either person.
**Event:** friction scenes are moments (each body reads the person); the sit-down resolves in a modal
with three rng lines (app.js:997-1000; relationships.js:220-235). The mentorship's end is a letter.
No ceremony — correctly.
**Flavor:** relObservation families keyed by competitiveness/dominance/warmth (good); friction bodies
and toasts single per variant; mentorship/seating notes single; the sit-down 3+2 rng lines.
**Teeth:** the best in the slice — the extra hour can put her on the floor at 2am (friction.js:
188-193), the clip can ignite a gaffe discourse and cost trust (266-271), pressing the quiet no can
send her home mid-schedule (422-425), the substitution taxes pride (313-319); expiries cost
(leftWaiting, the drained ask, the clip aging off with fandom). Mediation backfires on two dominant
people (225-229).
**Grades:** Reads 3 · Decisions 3 · Arc 2 · Event 2 · Flavor 2 · Teeth 3 = **15**.
**Gap:** the friction stream is the owner's "week-to-week choice" and it is throttled to one door
shared with eleven other kinds, so a six-member room with three live frictions still yields one
question a fortnight — and the quiet no, the stream's best scene, never reached the soak bot at all.

### 7. The clamor & the solo era
**Modules:** gravity.js up rail (transcendRead 23-30, starRung 52-71, launchSoloCareer 80-106,
weekly 117-249, soloKnock 328-417, resolveSoloRelease 424-493, soloEraCheck/planSoloEra 496-554,
soloDirection 558-605, soloEra weekly 610-637, releaseSoloAlbum 642-659, returnRun 662-697,
soloPromise claim 739-775, knock 778-802), outside.js (sponsorSolo 169-184, 390-448), meeting.js
(the exec asks; reads state.gravityExecAsk set at gravity.js:193).
**Lifespan:** her share of the room's followers crosses the line and holds → the trades feature
(critical) → the fandom splits (a discourse) → the Monday meeting asks → the resentment clock ticks
while held → she knocks with the clipping → a promise with a date, or the group first → the solo
credit / the standalone single / the album settles it → a year later the question comes back one rung
bigger → rung 3: the career, in-house. Proactively: plan her era (single/mini) → the direction
meeting → the drop.

**Reads:** "the clamor: Name" chip on the group hero (views_groups.js:176-177); the trades letter
(critical, family of 3, gravity.js:170-174); the reclamor letter (critical, 140-144); the held
letter (209-210); the settlement (critical, 231-235); soloEraSet (high) and the drop (critical/high)
with raw "Reception N, fee +N" (488-491); the Career tab's solo discography in receptionWord
(views_talent.js:346-352); the dual-career banner (342-345); the solo buttons lit when the album ask
is live (616-644). KP.gravityWord ('one of the room' → 'bigger than the group?', gravity.js:32-37)
IS NOT RENDERED ANYWHERE (grep js/ui) — the player cannot see the read rising before the feature
lands.
**Decisions:** soloKnock promise/group (rung 3: open/group; bot promise else open, harness.js:
1321-1328); soloDirection company/hers/cowrite (bot company); planSoloEra single/mini (proactive;
bot a single when a star is first-among-equals, 965); launchSoloCareer (proactive; the app.js:838
modal copy says "{She} leaves the lineup warmly" — the engine keeps her seat, gravity.js:94);
sponsorSolo allow/decline. releaseSoloAlbum has no UI (bot-only, harness.js:1080). returnRun is
UNREACHABLE for anyone: it opens only for a solo act with originGroupId (debut.js:278-283), which
only graduateToSolo writes (contracts.js:519), and graduateToSolo has no UI and no bot call.
**Arc:** the richest in the slice — history at every rung (gravity.js:228-230, 380-382, 390-392, 478-
482, 549-550, 588), directed heldBack/heldToPaper/openedTheDoor/heardHer, drift dominance when held
at the career rung (394) and confidence when the door opens (93), the rung ladder itself, soloShines,
soloDisc, dualCareer; the claim pays once (739-775).
**Event:** yes — the feature, the knock with rung-specific bodies, the settlement, the album, the
return-run that cannot happen. The clamor is the one person-loop in the slice that already meets the
§95 bar on Event.
**Flavor:** gravityTrades family of 3; everything else single (knock bodies per rung, settle letters,
drop notes, direction toasts).
**Teeth:** holding ticks morale and grudge every resentEvery weeks and lands on the renewal table;
the album splits fandom intensity; the era costs and fatigues her; the knock expiring −6 and "next
time she may answer the trades instead of you" (409-416).
**Grades:** Reads 3 · Decisions 3 · Arc 3 · Event 3 · Flavor 2 · Teeth 3 = **17**.
**Gap:** the read that starts the whole loop is computed every week and never shown, and the one
door that would make the loop bittersweet across a career — the alum's return run — is wired to a
verb no one can press.

### 8. The body & the nerve — the diagnosis, the scar, the slump
**Modules:** medical.js (theDiagnosis 40-118, weekly 121-168), scars.js (scarRecovery 14-57, weekly
70-85, knock 86-95), development.js (burnout 142-149), sim.js (the bench 497-502), gravity.js down
rail (slump 275-324, quietEra 805-851), shows.js:29 (the shield on the live stage).
**Lifespan:** a heavy week rolls a case → the clinic report → three doors (rest / the chair / push) →
the bench with an end date, the most-photographed chair, or a taped week that may open a chronic
file → the file flares on every hot week for the rest of her career. A boiled storm → eight weeks of
shadow (mood "carrying it", a subdued bubble) → the return scene. A bad era + low morale + low
confidence → the nerve goes → the quiet era / the schedule / the friend's dinner → the stage gives it
back, or time does.

**Reads:** chips — chronic sites, 'seated', 'the nerve', mood words benched/carrying it (views_talent.js:
140-143; components.js:45-52); the diagnosis letter (high, family of 3, medical.js:162-166); chronic
opened (high) and the first two flares (flavor, 138-141); seatedNotice/medicalRest (high) + feed; the
scar return scene and the "time did most of it" letter (scars.js:78-83); the slump entry (urgent,
single) and exit (high, two variants by cause, gravity.js:318-321). The slump's middle weeks and the
shield's effect are unread — only the chip stays.
**Decisions:** theDiagnosis rest/seated/push (bot by calendar: promo → chair, prep/tour → push, else
rest, harness.js:1473-1482); scarRecovery loud/quiet (bot loud); quietEra shield/push/talk (bot
shield at fatigue >50). All reactive; no proactive health verb exists (no check-up, no lighter
schedule outside the friction's drained ask).
**Arc:** p.medical.chronic as a character that flares on hot weeks (medical.js:131-143), medPushes →
playedHurt narrative, history on every door, directed pushedThrough/protectedHealth/welcomedBack/
protected; the slump writes four history lines. The slump moves confidence outside the arc door
(gravity.js:300-306 clamps p.personality.confidence directly; not in p.arc) — recovery, not drift,
but it is the one trait movement in the slice the "who she is becoming" tab cannot show.
**Event:** the diagnosis is a moment ("the roster will hear which door"); the chair is a letter the
fandom answers; the footing-by-stage is a genuine moment (lastShowWinWeek, 308-321). The shadow and
the slump have no middle: nothing reads how week four of eight feels.
**Flavor:** diagnosis family of 3; scene bodies single; flare single; slump letters single.
**Teeth:** push → chronic chance + a watch multiplier + grudge; the chronic file prices every heavy
week forever. But SILENCE IS THE SAFE DOOR: an unanswered diagnosis defaults to full rest with no
ledger entry (medical.js:107-117), an unanswered scar return pays quiet recovery plus a guilt line
(scars.js:48-56), and the slump's default is the schedule (845-850). The medical desk is the one
place in the slice where not answering costs the player nothing.
**Grades:** Reads 3 · Decisions 2 · Arc 3 · Event 2 · Flavor 2 · Teeth 2 = **14**.
**Gap:** the chronic file is the best character the engine mints and after its first two flares it
goes silent (flavor priority, then no letter at all), so a veteran's knee stops being a story in the
exact years it should become one.

### 9. The absences — the hiatus, the personal break, the service
**Modules:** hiatus.js, contracts.js (declareMemberBreak/endMemberBreak 615-640, memberDesk weekly
643-651), military.js.
**Lifespan:** declare (a group hiatus; a member's break; the service plan) → weeks or years of rest
with a chip and a date → one cooling letter (hiatus) / nothing (break) / nothing (service) → the
return (a comeback lock; an end-break button; the gate).

**Reads:** hiatus card "N weeks and counting" with the grace/past-grace line and "Announce the
return" (views_groups.js:419-427); the service chapter card with the last discharge date (407-413);
"N in service" / "service: staggered" chips (182-189); the dossier head "in service — back <date>"
(views_talent.js:317) and "The desk has no verbs here; nobody does" (603-607); the end-break button
with the week count (645-648). Letters: hiatusDeclared (high), hiatusCooling (critical, once),
returnAnnounced (high), memberBreak/memberReturn (high), the folder (urgent), the papers (urgent),
enlisted (high; together: critical), discharged (high), "whole again" (high), the trainee at the
wall (urgent). The hiatus read at the return release (hiatus.js:86-101).
**Decisions:** declare-hiatus (confirm modal, app.js:586-595), member-break / end-break (toasts),
servicePlan stagger/together (bot by popularity ≥45), enlistPapers now/wall (bot by whether an era
runs). Proactive at the start, nothing during, the return is a Studio verb.
**Arc:** history on declare/return/enlist/discharge; chapters enlisted/discharged; professionalism
drift at discharge (military.js:75); serviceDone durable; the contract clock pauses (113); mates'
morale at the gate (44-45); the trainee who hits the wall is released with a bow to the room (183-
187). No drift for a hiatus or a break.
**Event:** the gate photo and the coffee truck are letters; "whole again" arms the return stage
(debut.js reads g.returnStage); the hiatus return announcement is a letter. The years BETWEEN are a
chip: no letter from the base, no fan project episode, no mid-hiatus anything but one cooling note.
The personal break has no moment at either end (two toasts).
**Flavor:** single templates throughout (hiatus.js:32, 64-65, 79-80; contracts.js:627, 638;
military.js:58, 83, 99, 132, 148-149, 165-166). The service — a two-year chapter the Bible calls
"the event the whole anticipation system builds toward" (military.js:1-8) — has no lineFor family.
**Teeth:** cooling past grace (pop, fandom intensity); nothing for the break; the service's defaults
are free — an unanswered plan files 'stagger' (228-235, "the worse way to arrive at the same
place", no cost) and unanswered papers mean the wall (266-271, no cost).
**Grades:** Reads 2 · Decisions 2 · Arc 2 · Event 2 (gate/discharge) · Flavor 1 · Teeth 1 = **10**.
**Gap:** the three absences are the purest plan → wait → result loops in the slice — a two-year
service chapter passes with one chip and a date on it, which is the old survival-show shape exactly.

### 10. The contract clock & the renewal table (+ the walkout)
**Modules:** contracts.js (clock 47-59, renewalRead 31-44, the table 115-128/195-318, walkOut 655-
725, terminate 587-612), scenes.js (ledgerRead 89-101, standingOf 109-116).
**Lifespan:** stamped at debut → five silent years → the folder (high) → the table reads the whole
ledger in one of four bands → sign / sweeten / terms / standard / hold / plead / farewell → the clock
resets or the seventh year gets a date → (a walkout any time grudge ≥ the bar and morale <35).

**Reads:** the dossier head "Exclusive contract · year N of 7 · term T · final term" (views_talent.js:
312-318); standing in the road staff's words (495-497); the ledger in words (438-445); the folder
letter (high); the table body per band + the fame aside (contracts.js:132-137, 203-206); renewed
letters (high) + feed; the walkout scene. There is NO forecast: renewalRead's band is computed but
never surfaced before the table opens — the player's only early warning is standingOf, which decays
while the grudge the table weighs does not (scenes.js:89-101).
**Decisions:** the table's band-gated options (bot: sign / terms-or-standard / terms-or-hold /
farewell, harness.js:785-797); walkOut negotiate/hold/release (bot negotiate if the budget covers it);
terminate (proactive, priced). Reactive and rare — once per person per five years.
**Arc:** term++ with professionalism drift and a narrated line (245-246); directed on every branch
(realTerms/sweetened/standardTerms/heldLine/wonBack/endingHonored/tableLeftWaiting/heardOut/heldToPaper);
contract.leaving → "final term"; holding her to the paper at the walkout costs confidence (706).
**Event:** the table is a moment — four bodies, the devoted one "a ceremony" in its own words. The
farewell lap is announced ("every stage she takes is quietly a farewell stage — the staff have
started filming everything", 306-307) and then NOTHING reads p.contract.leaving until the week she
departs (98-102) — the final year is a magenta chip.
**Flavor:** BODIES per band (4 single strings), toasts single, letters single.
**Teeth:** standard paper −1; hold is a coin to lose her; the unopened folder −3 and the table "comes
back colder" (grudge ×1.5 at the read); half a year past the seventh at 'gone' she walks cold on her
own (105-113); the walkout left waiting −2 and "the font will not be addressed to you first".
**Grades:** Reads 2 (a chip and a folder; no forecast) · Decisions 3 · Arc 3 · Event 2 · Flavor 1 ·
Teeth 3 = **14**.
**Gap:** the table is deep and the two years on either side of it are empty — no year-four whisper
from her representation, no farewell-year episodes — so the renewal is a great scene inside a loop
that is otherwise a status flip.

### 11. How a group ends — departures, the disband, the farewell lap, the archive
**Modules:** contracts.js (departIdol 445-492, lineupSurgery 372-443, removeFromLineup 562-584,
terminateContract 592-612, graduateToSolo 496-531), group.js (disbandGroup 316-370), scandal.js
(the release path 234-266), views_groups.js (archiveCard 42-51, the retired page 145-157).
**Lifespan:** a renewal 'farewell' or 'hold' → the seventh year → departIdol (warm: the handwritten
letter; cold: three sentences) → "continues as N" → when the last contract expires the group retires
in one high letter → an archive card. Or the player ends it: conclude team activities (one critical
letter), terminate (critical), remove from the lineup (critical).

**Reads:** contractEnd letter (high; warm/cold single each, contracts.js:481-485) + feed; "continues
as N" (single, 486-489); "chapter closes with the last contract" (single, high, 438-439);
playerDisband (critical, single, group.js:367-368) + feed; the archive card "Concluded · N members ·
N releases" — for a group that ended by expiry finalLineup is never set, so the card reads
"0 members" (views_groups.js:44-48) and the retired page lists nobody (147-157; finalLineup is only
written by disbandGroup, group.js:347). A departed idol's file "stays open forever" (views_talent.js:
319-321) and is REACHABLE FROM NOTHING — no alumni list exists (grep js/ui 'departed': only the
dossier head). The members of a disbanded act "remain with the company, their own calendars" and
no surface reads what those calendars hold.
**Decisions:** disband (confirm, app.js:663-686), terminate (confirm, 626-642), remove-lineup
(confirm, 609-625), the renewal's farewell. Proactive and final. The bot never disbands, terminates
or removes anyone (harness grep: no calls); its exits are the red-weeks release, the walkout's
release and the two farewells.
**Arc:** status 'departed' + chapter + history (473-479); disbandedUs grudge on everyone (group.js:
329); friendDeparted (contracts.js:423-427); watchedTermination on the dorm (605-608); the executive
prices a disband of a selling act (group.js:363-366). Nothing happens to a departed person
afterwards: knock.js:36 and commerce.js:289 exclude her; no rival signs her; no "she debuted
elsewhere" letter ever arrives (the floor's reentry handles 'released' only, floor.js:325).
**Event:** none. The farewell lap has no stages; the last contract's expiry on an act is one 'high'
letter the week trims against anything critical; the disband is one critical letter; there is no
final concert, no retrospective letter naming the eras, no "the record" of the group, no goodbye
scene with the members, no retirement for a person at all (no 'retired' person status exists:
grep `.status = '…'` across the engine — released / departed / gone / rival / prospect / trainee /
idol only).
**Flavor:** single strings everywhere.
**Teeth:** pop and morale hits warm/cold; trust if she still sells; the buyout price; the grudges.
**Grades:** Reads 1 (one letter; an archive card that says "0 members"; the file unreachable) ·
Decisions 2 · Arc 2 · Event 1 · Flavor 1 · Teeth 2 = **9**.
**Gap:** a group's end — the second lifespan the player lives most often — is a status flip with a
good sentence on it: no farewell year, no last stage, no ceremony, and the people it happened to
vanish from every list the game has.

### 12. The person in public — the story and the midnight photos
**Modules:** scandal.js (breakStory 58-92, theStory 110-189, theChoice 191-298, weekly 301-356),
secret.js (weekly 24-83, theReveal 86-152, setProtectedLife 155-161).
**Lifespan:** scandal — a personality-priced roll breaks a story with a SHAPE and a weight → the
response desk (statement/silence/deny) → weight 3 forces a hiatus, weight 4 opens "two chairs, one
question" → protect (money, trust, fandom) or release → the survivable story fades on a clock; a
denial can re-break heavier. Secret — a private life deepens (19+) → the manager's brief → the
camera clock (fame, promo) with a paid protect posture → the midnight photos → confirm / statement /
deny / silence → the room heals at the pace the answer set; a denial can resurface.

**Reads:** scandalBreak (high, weight in words, scandal.js:66-73) + feed; scene bodies with the
weight's stakes (115-123, 196-201); rebreak (high), forced break (high), release (high); the rival
stories (flavor). The live story's state (fading, the denial window, the rebreak) is NOT on the file
(grep js/ui '.scandal': none). Secret: the brief (urgent, single), the protect button with its
weekly cost (views_talent.js:621-626), "has a life outside the building" (678), the reveal (critical,
single) + scene + feed, resurfaced (critical). Nothing reads while protection runs — no "the vans
cost N this month", no whisper of how close the cameras are.
**Decisions:** theStory (bot statement), theChoice (bot protect), theReveal (bot confirm if the
fandom is devoted else statement — never deny), protect-life toggle (proactive). Reactive otherwise.
**Arc:** the storm hardens her through the arc door with a narrated line (scandal.js:79-83);
weatheredStory / stoodByHer narratives; history on every answer (secret.js:118, 124, 133, 138);
directed stoodByHer / madeHerHide; the forced break; fandom recovery clocks.
**Event:** the break and the two-chair choice are moments; the midnight photos are a moment. The
cycle's middle (the weeks of the story, the denial's loan) has no reads.
**Flavor:** SHAPES inserted into single templates; scene bodies single; the tabloid name hashed per
person (secret.js:18-21) is a nice touch, used once.
**Teeth:** strong — the deny trap re-breaks with trust and a heavier weight (305-319); protect costs
budget/trust/fandom and goes red rather than cold (220-232); an unanswered choice releases her,
worst (267-297); the resurfaced denial (secret.js:56-65).
**Grades:** Reads 2 · Decisions 2 · Arc 3 · Event 2 · Flavor 1 · Teeth 3 = **13**.
**Gap:** the shape of a story is a template word and its weeks are silent, so every scandal across
13 years is the same two scenes with a different noun in the first line.

### 13. The second calendar — the member channel & the second job
**Modules:** broadcast.js (asks 85-206, weekly 209-270), outside.js (brandWeek 117-201, showWeek
204-295, offers 300-384, respond/quit 451-511).
**Lifespan:** an ask (live / channel / the live nobody approved) → allow / train / decline → weekly
uploads with a viral lottery and a gaffe lottery scaled to how known she is. An offer on the Desk
(brand / panel / MC / OST) → sign or pass → weeks of tapings with a clash ladder (the van did not
make it ×N → written out) or the brand's invoice (missed appearances → clawback) → the wrap, the OST
drop, the narratives (varietyMonster / nationalMC / ostVoice / brandDarling), the sponsor's solo ask.

**Reads:** the Desk rail offers with terms and expiry (views_desk.js:145-161); the Career tab's jobs
with weeks left, misses, strain and a step-down button (views_talent.js:367-378); the channel on
Content with uploads/followers/media-trained/reprimanded (views_desk.js:346-364); letters: kept
appearance (flavor), missed (high), clawback (urgent), stretch/missed taping (normal), recast (high),
ostDrop (high), gigWrapped (high), the solo request (urgent) + sponsorSolo (high), castViral (high,
family of 4), castGaffe (high/flavor by reach), dealCooled, channelOpened (high), unsancLive (high).
Nothing reads a taping that went well, and the live itself is a 35% feed post.
**Decisions:** outside-accept/decline, outside-quit (proactive), sponsorSolo allow/decline, liveAsk /
channelAsk allow/train/decline, unsanctionedLive slide/train/reprimand. No proactive media verb (no
"book her a live", no "close the channel"). Bot: signs every brand, books gigs by fatigue, quits a
gig when the group calendar clashes, allows the solo stage under 65 fatigue, options[0] on every ask
(allow/allow/slide).
**Arc:** counters that mint narratives (panelArcs/mcRuns/ostDrops/dealCount); ambitionTouch 'variety'
on a wrap; history lines; mediaTrained / castChilled / castEmboldened; directed keptOffline /
reprimanded / heldBack; morale and group popularity at the wrap.
**Event:** the OST drop and the wrap are payoff letters; the sponsor's solo stage is a letter the room
reads; the viral is a letter. No moment during the run beyond the clash notes; the channel's growth is
a number.
**Flavor:** castViral family of 4; liveHappened conditional by trait (3); everything else single
(brand pitch 329-332, show pitch 371-378, wrap 279-282, recast 245-247, solo stage 427-428).
**Teeth:** clawback for two missed appearances, recast at the strain bar, clash fatigue, the gaffe
priced by fame with sponsors cooling, declining the solo stage cools the brand and lands heldBack;
asks expiring cost −2 and keptOffline. Offers expire quietly at no cost; the solo request withdrawn
at no cost.
**Grades:** Reads 2 · Decisions 2 · Arc 2 · Event 2 · Flavor 2 · Teeth 3 = **13**.
**Gap:** the second job is the most complete plan → run → payoff loop in the slice and it is entirely
company-side: the player never sees her on the panel, the channel never earns a door of its own
after it opens, and the same three pitches recur unchanged for a decade.

---

## RANKED: thinnest → deepest (total /18)

| # | System | R | D | A | E | F | T | Total |
|---|--------|---|---|---|---|---|---|-------|
| 1 | The spotlight moments & the inner life | 3 | 1 | 1 | 0 | 3 | 0 | **8** |
| 2 | How a group ends (departures, disband, farewell lap, archive) | 1 | 2 | 2 | 1 | 1 | 2 | **9** |
| 3 | The training week & the monthly sheet | 2 | 1 | 2 | 1 | 2 | 2 | **10** |
| 4 | The debut-team selection | 2 | 2 | 2 | 1 | 1 | 2 | **10** |
| 5 | The absences (hiatus, break, service) | 2 | 2 | 2 | 2 | 1 | 1 | **10** |
| 6 | The person in public (scandal & secret) | 2 | 2 | 3 | 2 | 1 | 3 | **13** |
| 7 | The second calendar (channel & second job) | 2 | 2 | 2 | 2 | 2 | 3 | **13** |
| 8 | The practice-room years | 2 | 3 | 3 | 2 | 1 | 3 | **14** |
| 9 | The body & the nerve (medical, scars, slump) | 3 | 2 | 3 | 2 | 2 | 2 | **14** |
| 10 | The contract clock & the renewal table | 2 | 3 | 3 | 2 | 1 | 3 | **14** |
| 11 | The office door & the asks | 3 | 2 | 3 | 2 | 2 | 3 | **15** |
| 12 | Friction, the sit-down & the pairs | 3 | 3 | 2 | 2 | 2 | 3 | **15** |
| 13 | The clamor & the solo era | 3 | 3 | 3 | 3 | 2 | 3 | **17** |

Tie-break at 10 (training / debut team / absences): the training week has the fewest decisions (two
dials) and its only ceremony is a flavor-priority letter, so it is the thinnest of the three; the
absences have real letters at the gate; the debut team has the night.

Read against the §95 bar: only the clamor (and, per knock, the office door and friction) reach a 3
on Event. The two lifespans the brief flagged — the TRAINEE YEARS (cards 1, 2, 3) and HOW A GROUP
ENDS (cards 10, 11) — have doors at their forks (the resignation, the question, the table, the
farewell) but no reads between the forks and no ceremony at either end: the list on the wall is a
modal, the sheet is trimmable flavor, the last contract is one high letter, and the archive card
can read "0 members".

## THE TOP 3 TRANSACTIONS THAT SHOULD BE EVENTS

1. **The training month → evaluation day.** Set two chips and an intensity → four silent weeks →
   a flavor-priority sheet letter and a rank chip. Nothing to read or decide in between; the player
   never attends the one monthly ceremony of the trainee years (development.js:49-152;
   rituals.js:56-136; priority 'flavor' at 112 and 124).
2. **The farewell year → the last contract → the end of the act.** The table's 'farewell' sets a
   magenta chip (views_talent.js:316) → nothing reads `p.contract.leaving` for two years
   (contracts.js:98-102 is the only reader) → one 'high' letter when she leaves (481-485) → when
   the lineup empties, one more 'high' letter (438-439) and an archive card with no names
   (views_groups.js:42-51). The staff "have started filming everything" (307) and the player sees
   none of it.
3. **The service chapter (and its cousin, the hiatus).** Plan + papers → up to two years of a chip
   and a date ("The desk has no verbs here; nobody does", views_talent.js:603-607) → the gate letter.
   The Bible calls the discharge "the event the whole anticipation system builds toward"
   (military.js:1-8); the wait that builds it is unread, and both unanswered doors cost nothing
   (military.js:228-235, 266-271). The hiatus is the same shape with one cooling letter
   (hiatus.js:59-66).

Honourable mention: the debut-team selection (open project → silent push → a modal) — the only
loop above whose RESULT is already an event (the night), which is why it ranks fourth.

## HIDDEN TRUTHS SHOWN AS RAW NUMBERS · VERBS WITH NO CONSEQUENCE

**Raw numbers on a hidden scale**
- views_talent.js:426-435 "Since debut" prints raw talent deltas ("Vocals +7 · Dance +3") against
  p.debutSnap (debut.js:852-855). Talent.cur is a hidden scale shown everywhere else as bands with
  fog (views_talent.js:539-544; blurbs.js:326-359); the delta leaks both the scale and the pace of
  growth.
- Borderline (an outcome, not a truth, but inconsistent with "words and bands"): letters and
  history lines print raw reception — the solo single/mini drop (gravity.js:488-491 "Reception N,
  fee +N"), the unit era (group.js:438-439), the OST drop's history line (outside.js:262) — while the
  Career tab and the unit toast use KP.receptionWord (views_talent.js:350; app.js:868).
- Unrendered words that should replace a hidden number: KP.gravityWord (gravity.js:32-37) exists
  and no view calls it — the transcendence read reaches the player only as a chip once the clamor
  has begun.

**Player verbs with no (or invisible) consequence**
- `pair-unpair` → KP.unpairWriters (pair.js:125-130): free, no ledger, no history, no note —
  pairing cost 3 and wrote both files; dissolving is silent.
- `pair-rival` stance 'defuse' (pair.js:194-198): takes the framing down with no ledger entry and
  no history (sharpen records framedRival on both); a toast only.
- `open-stagename` → KP.setStageName (person.js:253-276): a history line and the solo act's rename;
  nothing in the world reacts to a stage name (no letter, no feed, no fandom read) — cosmetic by
  design, but a verb the player presses once per person with no echo.
- `protect-life` (secret.js:155-161): real weekly cost and risk factor, but no read while it runs —
  the player cannot tell it is working, so the verb feels like nothing until the photos do or do
  not land.
- Engine verbs with no door: KP.releaseSoloAlbum (gravity.js:642-659) is bot-only (harness.js:1080);
  KP.graduateToSolo (contracts.js:496-531) has no UI and no bot call, which makes the `returnRun`
  scene (gravity.js:662-697; opened only from debut.js:278-283 on an act with originGroupId)
  unreachable for everyone — a registered scene nobody can see.
- Copy mismatch worth a line: the launch-solo modal says "{She} leaves the lineup warmly"
  (app.js:838) while the engine keeps her seat (gravity.js:94, "her seat in the lineup untouched").

## SKETCHES — the three thinnest, in the house style (shapes only)

### A. The spotlight moments (8) — "moments that compound"
- Keep the card and the families; add a per-person, per-key sighting count beside the existing
  `p.flags.spotMem` slot (persona.js:110-117) — the memory already knows which line she was last
  seen in; let it also know how many times the same key has read for her.
- The third sighting of a key becomes a candidate at the one door (KP.registerKnock, like the
  CHOICES already do at 397-402): afterHours ×3 → the extra-hour question with the grinder variant
  pre-selected; quietWeek ×2 without an answer → the quiet no arrives regardless of the mirror gate;
  ambitionGlimpse ×3 → the idolAsk's askAfterWeeks shortens (door.js:47-48) and the opener says
  "{she} has been rehearsing this for a month — you watched {her} do it".
- The third sighting also writes ONE history line and one staffRead-style sentence on The person
  ("the practice-room log has stopped calling it unusual"), so the file accumulates what the card
  showed — lineFor families keyed by voice, as the moment lines already are.
- A choice taken from a compounded moment deposits a directed act with a word the mirror reads
  (an existing kind — trusted / heardHer / heldBack); no new ledger.
- Teeth: a key sighted three times and never answered writes 'leftWaiting' once (the door's own
  law, door.js:116-123) — the only cost, so the card keeps being presence, not power.
- No ceremony: the loop does not earn one; it earns a memory.

### B. How a group ends (9) — "the farewell lap, the last bow, the alumni"
- The farewell lap as an object: when the table sets `contract.leaving`, open a lap on the person
  ({since, lastEraDone, lastStageDone}) and let three readers exist — the release (a farewell-era
  mod and a note, shaped like hiatusReadsRelease, hiatus.js:86-101), the music show / fancon (the
  last stage: a critical letter the week it happens, lineFor family by voice), and the member desk
  (one door: tell the fans now, or keep it in-house until the last era — a scene with the fandom's
  temperature as the cost either way).
- Year-of letters on the clock the trainee years also need: one at the half-year ("the staff have
  started filming everything" becomes something the player reads — the clip that will be the
  farewell edit, hash-picked), one the week the last era locks.
- The departure as a ceremony: the warm exit's handwritten letter is already written for her
  (contracts.js:484) — make it a claim with a date (the last stage within N weeks) and a critical
  letter at the bow, in reverse order like the season finale: the eras she stood in, the center
  weeks, the trophies, the friend she leaves (relationships close), the chair she keeps (the
  chronic file). The cold exit gets the three sentences and the forensic feed it already has.
- The disband as a ceremony: one scene on "Conclude team activities" with doors — the last concert
  (the fancon machinery, ticketed; a stage judged), the quiet statement, or the farewell record (the
  studio's own lock with a farewell flag) — and the final statement read as a ceremony: the lineup
  by name with what each does next (KP.chapter 'afterGroup' per member: the in-house solo, the
  second job, the service, the quiet).
- The archive: write `g.finalLineup` in lineupSurgery when the last contract empties the act
  (contracts.js:429-440), and give the retired page and the concluded group's card the lineup for
  every ending, not only the disband; add an alumni strip (former members, departed and released)
  so "the file stays open forever" is reachable — the chapters strip already carries the words
  (floor.js:68-106).
- Teeth stay as they are (pop, trust, grudges); the new costs are only the ones the doors name.

### C. The training week & the monthly sheet (10) — "evaluation day as an episode"
- Priority ladder on the sheet letter, the way the season episode has one (season.js per §95):
  critical the month a trainee of ours takes #1 for the first time, falls into the bottom third, or
  hits the talk; high while any trainee is within one of the line; flavor only for a sheet with no
  movement. The letter names the mission of the month, her place and movement, the line, and one
  named moment hash-picked among what the month offers (the climber, the faller, the one the panel
  argued about, the ace holding) — never the same kind two months running (`s.lastMomentKind`'s
  shape).
- The board shows trajectory: p.evalHistory is already kept (rituals.js:79-82); render ▲/▼ with the
  delta and the last three ranks as words ("climbing", "parked", "sliding"), and draw the line
  (bottom third) on the board itself.
- A monthly theme the coaches announce the week after the sheet — "the vocal month", "the stage
  month" — read by developWeek as a small multiplier on the themed focus and by the next sheet's
  score, so the two chips have a reason to change every month and the month has a question in it.
- One door a month at evaluation day, through the one queue so the cadence law holds: the after-eval
  talk becomes a scene for the bottom-of-sheet trainee (push / move her focus / the honest word —
  the options the aging talk and the quiet no already know how to cost), and the showcase's featured
  slot becomes a proactive pick (who takes the stage this month: a confidence and liveExp gift to one,
  a passedOver-shaped grudge to the ace left off, read by the practice room's speculation).
- The arc: three months rising writes a history line and a staffRead sentence; three months parked
  writes "plateau" in words on The person; a first #1 drifts confidence +1 through the one door
  (driftTrait, persona.js:34-49) — the trainee's first anchored event before the night.
- The ceremony the loop earns: the year-end sheet — twelve months read in reverse, the ace of the
  year named, the climber of the year, who left the room and how — a critical letter once a year,
  which the awards week already knows how to date (sim.js awards phase).

Also thin at 10, in two lines each:
- *The debut-team selection*: the posting as a critical letter for the room (who made it, who was
  first on the board and not on the list, who was locked and dropped), with one door for the ace left
  off (a promise claim the practice room already runs, practice.js:272-304); the project's push weeks
  get one hash-picked moment a fortnight from the hopefuls' files.
- *The absences*: the service and the hiatus get an episode cadence from the fandom's side (the
  countdown project, a letter from the base in his voice at the half, the "whole again" week as a
  ceremony with the return stage named), and the two unanswered service doors deposit `leftWaiting`
  like every other door in the house.
