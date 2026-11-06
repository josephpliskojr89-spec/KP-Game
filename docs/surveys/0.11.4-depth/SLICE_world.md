# Depth survey — SLICE: the world (rivals, fans, the press, places, the road and the stages)

Reference bar: the televised season (v0.11.4, Bible §95, `js/engine/season.js`). A 3 on Reads = a board the player reads every week with the line drawn (`KP.seasonBoard`, views_industry.js:119-153, views_desk.js:60-74); a 3 on Decisions = doors DURING the run (push/coach/withdraw/the edit, season.js:548-665); a 3 on Event = one letter a week naming her place plus a ceremony read in order (season.js:406-424, 504-515).

Phase order that matters for this slice (sim.js + `KP.registerWeekly`): rollout 200 → **tour 250** → events 500 → releaseWar 540 → **sagas 561** → **riseFall 562** → industry 560 (rival releases, chart tick, national pool) → shows 580 → **badBlood 592** → **publicEye 596** → releases 600 → **table 616** / season 617 / **network 618** / **reentry 619** / **schools 620** → **festivals 745** → monthBoundary 760 (industryLifecycle) → **japan 762** → **awards 780** → memory 800 → social 820 → regions 840 → fandom 850 → **society 857** → discourse 860 → **constituency 860** → chartAndFeed 900.

Grades: Reads / Decisions / Arc / Event / Flavor / Teeth, 0–3 each, total /18. Bot default = what tools/harness.js does.

---

## Card 1 — The rivals as characters & the power ranking
**Modules:** industry.js (acts, debuts, comebacks, disbands, the floor's evaluation, lifecycle: collapse/merge/split/emerge), risefall.js (eras, the January ranking, generations, the rival service). **UI:** views_industry.js Scene (rival cards :183-227, the ranking card :102-114, the rival act page :279-351).
**Lifespan:** the scene is seeded mid-conversation (industry.js:1004-1100); every week rival acts release on their own cycle (industry.js:777-830), debut when the floor can field one (:694-773), disband at the 7-year wall (:818-828); monthly a company may fold/merge/split/emerge (:886-1001); every January the trades publish the ranking (risefall.js:131-163); generations turn on landmarks/torch/old-guard-gone (:181-260). It never ends — which is the point and the problem: a rival is weather for 13 years.
**Reads:** the rival card: name, philosophy word, prestige word (`prestigeWord` :419-421), era word in era colour (:205-209), "casting a new group" chip, blurb, up to 2 narratives, active acts (popularity word, member count, release count), the floor's top-3 names with "(once on our board)"/"(left this building)", "tracking N of your leads", the last two `recentMoves` chips (:184-227). The rival act page: concept, fanbase word, since, announced comeback, show wins, the feud scoreboard, narratives, members with follower counts and "was on your board", discography with reception words (:279-351). The ranking card: rank, short, delta arrows and a raw score column (:104-110). A rival has no head, no voice, no page of its own (only its acts have pages), no history beyond two chips.
**Decisions:** none in this system. No verb touches a rival company directly — no call, no meeting, no deal, no counter-poach, no response to a debut in your lane. The rival-facing doors live elsewhere (the clash in calendar.js, the offer and the JV — Card 2). Bot: n/a.
**Arc:** durable and partly legible: eras derive from a prestige trail (risefall.js:32-41), `r.poachCount`→poachers, `r.ambushCount`→dateSniper, `r.copyConcept`→trendCopier narratives (industry.js:758-770, scouting.js:514-519, calendar.js:112-115), narratives decay (memory.js:275-276). The world remembers what THEY did; nothing records what YOU did to them — `founderGrudge` is only an exemption flag from collapse/merge (industry.js:895, 921; founding.js:85), never read as behaviour. A rival that lost a head-to-head, a castoff, or a JV to you behaves identically afterwards.
**Event:** 1. The January ranking is one high letter with three overtake sentences (risefall.js:143-162); genTurned is critical, torchPass high (:239-259); collapse/merge/split/emerge are single normal letters (industry.js:901-998). No pre-announcement, no reveal, nothing to wait for; the overtake has no ceremony and the rival's "imperial era" has no coronation.
**Flavor:** 2. Families: rivalHit ×5 (industry.js:790-796), flagship ×3 (:847-851), evalCut ×3 (:674-678), rivalSigned ×5 (scouting.js:505-512), rivalScouts ×4 (:460-465), comebackAnnounce ×5 (calendar.js:69-75). Lone strings: rivalDebut (:751-757), disband ×2 (:815-827), collapse (:901), merge (:944), split (:970), emerge (:997), natRetire (:986), conceptCopy (:766), signingClass (risefall.js:102), rivalEnlist/Return ×4 (:280-319), the power-ranking line.
**Teeth:** 2. Rivals crowd your week (`crowdPenalty`), the flagship chases your ceiling (:835-855), imperial releases come backed (:492-496), the ambush (calendar.js:86-124), the fog poach. Nothing can be ignored at a cost because nothing is offered.
**Grades:** Reads 2 · Decisions 0 · Arc 2 · Event 1 · Flavor 2 · Teeth 2 = **9**
**Gap:** across 13 years every rival stays a letterhead with a philosophy word — no head with a name, no memory of what you did to it, no voice and no door to knock on; the owner's "Novaline, you absolute motherfuckers" has a scoreboard but no person to hate.

---

## Card 2 — The rival relationship: the offer, the JV and the sagas, the society's favours, the clash
**Modules:** risefall.js (`theOffer` :326-349), sagas.js (the deck :29-46, `globalJV` :343-381, the four injected entrances :187-265), society.js (friends, coffee truck, senior stan, debut class), calendar.js (ambush → `respondClash` :129-163, the battle :169-224 — adjacent but it is the one rival-vs-you door that recurs). **UI:** the Desk rail (views_desk.js:112-121), the pact/second-capital cards (views_industry.js:160-173), the Conversations record (views_desk.js:580-588), "Across the industry" on the dossier (views_talent.js:446-452).
**Lifespan:** a saga fires once (twice in 35% of worlds) in years 2–8 by hash (SAGA.firstWindow); the JV is a 3-week door then a 4-year pact with an annual class and a 25% road cut; the heir's runway ends in stabilise/burst after 120 weeks; the capital sunsets; the offer comes ~once per two years to a trusted non-founder; friendships form in promo weeks and persist; the clash is a one-week door per locked date.
**Reads:** the scene bodies on the Desk; the pact and capital cards (years left, the split); the saga letters; the friend on her dossier; the feud scoreboard. No standing read of "where we stand with X" and no card for the offer's suitor beyond its era colour.
**Decisions:** theOffer (decline / leverage), globalJV (sign / decline), the clash (hold / slip), seasonInvite elsewhere. All reactive; nothing proactive toward a rival. Bot: leverage if budget<200 else decline (harness.js:1375); JV sign if trust≥50 (:1387); fight if within 10 pop else slip (:1232-1233).
**Arc:** 2. The JV is durable and legible (state.jv card, annual class letters, wind-down letter; decline = +8 prestige and a co-built act across the street 20 weeks later, sagas.js:368-381, 281-295). The heir's ending is two outcome letters (:321-339). The friendship is on her file and fires the coffee truck/senior stan/next-table beat at award night (awards.js:171-176). The offer leaves nothing on state but a ledger count — "I will remember that we agreed under these circumstances" is toast text (risefall.js:342).
**Event:** 2. Saga entrances are critical letters with feed families (sagas.js:211-264, 384-423); the JV is a real door; the heir's runway end is a verdict letter. But each saga is a birth certificate by design (§71): one letter in, one out, and a static card in between — nothing to read or decide during the four years.
**Flavor:** 1. Every saga letter and the offer's body/toasts are lone strings (sagas.js:212, 225, 243, 254, 264, 294, 304, 310, 318, 328, 337; risefall.js:177, 330, 342-348). Society: debutClass ×3 (society.js:175-182); industryFriend, coffeeTruck, seniorStan lone (:85, :109, :152).
**Teeth:** 2. JV decline arms the top rival; leverage is a free +120 budget / +3 trust that strictly dominates decline's +2 with no recorded cost; the expired offer costs nothing; the society pays morale +2/+3 only; the clash's slip costs 8 and morale.
**Grades:** Reads 2 · Decisions 2 · Arc 2 · Event 2 · Flavor 1 · Teeth 2 = **11**
**Gap:** the only conversations with a rival are three once-a-career doors; across many careers the player never bargains, never calls a rival first, and the imperial house's offer is a free lunch.

---

## Card 3 — The bad blood (rivalries, three tiers)
**Modules:** badblood.js (tier 1 in-group :49-88, tier 2 in-company :91-103, tier 3 in-scene :106-185), calendar.js feuds, memory.js archRivals (:125, :223), pair.js framing (adjacent). **UI:** "vs ACT" chips on the group hero (views_groups.js:179-180), the feud scoreboard on the group page (:307-321) and the rival act page (views_industry.js:298-310), the in-group rivalry note with frame/defuse (views_groups.js:342-353).
**Lifespan:** a scene rivalry forms by weekly roll from a source (class/concept/position/award/calendar, :118-160), heats on shared release weeks (:162-185), is named at heat 30, fades when the act retires and leaves the papers a year later (:108-116). In-group: 8 cold weeks harden a pair; 6 thaw weeks bury it.
**Reads:** the chip and the scoreboard (wins–losses with a sentence), the naming letter, the archRivals narrative line. No heat word, no "why" beyond the one naming letter, no read of what the rival fandom is saying about you specifically.
**Decisions:** 1. None on a scene rivalry (you cannot pick a foe, answer the coverage, or book the showdown week on purpose — the studio chip "vs SIREN" is release-war machinery). In-group: frame/defuse and mediate (pair.js/relationships.js, adjacent). In-company: avoid the overlap. Bot: n/a for tier 3.
**Arc:** 2. Heat, clashes, named flag, fade/forget; feuds counted forever; archRivals narrative. Legible as a chip and a scoreline.
**Event:** 1. rivalryNamed is one high letter (:157-159); fanWar is a storm the PR desk answers; "every year-end table will be read through it" is promised in the letter and never kept — awards.js never references the rival.
**Flavor:** 1. One naming template plus a SOURCE_WORD map (:35-41); civil war lone (:101-102); in-group hardening/burial lone (:66-67, :77); feed rivalryNamed ×2.
**Teeth:** 2. chemDrag 45 and distance-watch storms in-group; +2 reception in named head-to-heads and fan wars in-scene; −4 reception in-company. Ignorable only in the sense that nothing is asked.
**Grades:** Reads 2 · Decisions 1 · Arc 2 · Event 1 · Flavor 1 · Teeth 2 = **9**
**Gap:** a rivalry is a chip and a scoreline; the player never chooses the fight, never gets the showdown week as a moment, and the rival act's fandom never speaks to yours by name.

---

## Card 4 — The fandom as a character
**Modules:** fandom.js (name, colour, intensity), constituency.js (grievances, the truck scene, café notice, lightstick), badblood.js masters (:187-247), life.js regulars/biased accounts (:96-100, :166-176, :296-307; LIFE.REGULARS constants.js:2765-2781), discourse feed posts. **UI:** the fandom card and its two buttons (views_groups.js:229-244), the naming vote (:245-254), the barricade filter (views_industry.js:29-71), the truck on the Desk rail.
**Lifespan:** at pop 35 the cafés vote a name (one scene-like card); intensity grows on care and cools 0.2/wk; grievances (centre moved, no credits, overwork) age in 3 weeks; at intensity 55 a truck parks (scene, 2-week fuse, 10-week spacing); a biased regular adopts a face on a viral and may graduate to master after 30 weeks; a betrayal within 2 weeks may turn the master (critical closing notice). Snubs radicalise (+intensity).
**Reads:** name, colour, popularity word + intensity word, "keeping receipts" chip, "lightstick era" chip (views_groups.js:232-238); the barricade: the adopted handles ("X's account since …") and stan posts (views_industry.js:39-66); the truck body reads the grudge in words (constituency.js:86-93). The fandom has NAMED people (14 regular handles, biased accounts, masters) — it is more than a number. Missing: no history ("the three trucks and how we answered"), no mood beyond one word, no "what the fandom wants next".
**Decisions:** 2. nameFandom (choice is cosmetic — fandom.js:42-47: the index only picks a string; "let them decide" vs backing an option changes one clause), cafeNotice (thin), launchLightstick (one-shot), the fanTruck scene (concede / half / hold — real), fan meeting/fancon (commerce.js, adjacent), point nudges (rituals, adjacent). Bot: nameFandom(0) (harness.js:1251), lightstick the moment it clears and the free meeting when flush (:1491-1495), truck → options[0] = concede when affordable (:1484-1485).
**Arc:** 2. Intensity, the durable grudge counter with teeth (truck odds +0.15/pt, the body, the chip), masters minted/turned on the file of the week, biased regulars adopt and "step back" after a boil (life.js:296-307). Legible through the chip and the barricade.
**Event:** 2. The truck is a real door with three outcome letters (constituency.js:103-129); masterTurned is critical (badblood.js:244-245); lightstick and naming letters. No fandom ceremony (the anniversary lives in life.js as a letter; the fan meeting is a commerce click; the naming vote is instant).
**Flavor:** 2. Truck texts per grievance ×3 lone (:13-26); outcomes lone; master minted ×3 family (badblood.js:204-212); storm posts 2–5 per kind (industry.js:1142-1205); feed reactions 2–3 each.
**Teeth:** 2. Intensity moves shows, records and storm defence (§31); the grudge compounds; a turned master costs −6 and a storm; silence on the truck is the worst answer. The lightstick is a free +25 and +6 (constituency.js:160-178) with no trade-off.
**Grades:** Reads 2 · Decisions 2 · Arc 2 · Event 2 · Flavor 2 · Teeth 2 = **12**
**Gap:** the fandom has names and receipts but no face the player can talk to and no history page — the truck is its only event, and it repeats with the same three sentences for 13 years.

---

## Card 5 — The PR desk / the discourse
**Modules:** discourse.js (22 storm kinds, ignition, burn, boil, `respondDiscourse`), industry.js `discoursePost`. **UI:** the trending cards with the menu (views_industry.js:371-389), the outcome modal (app.js:300-310).
**Lifespan:** a storm ignites from a real event, posts itself weekly, feeds or fades, boils past 85; one response per storm; resolved storms are forgotten past twelve (discourse.js:109-113).
**Reads:** 3. Kind label, heat word, a headline per kind (discourse.js:42-91 — the lineShare one reads the sheet's names), the constrained menu, "the company has spoken", the hint that silence is legal; the ignition letter carries the heat word; the feed shows the storm in persona.
**Decisions:** 2. statement / apology / legal / meme / livestream per kind, or ignore; outcome rolled with personality, standing and heat (:221-235). Reactive only — the desk never starts a story. Bot: meme on positive waves, statement at heat ≥50 (harness.js:1238-1246).
**Arc:** 1. A boil scars her (flags.scar) and costs pop/morale (:183-198); a boil breaks a biased regular's heart (life.js:296-307). The desk's record of answers accumulates nowhere — "the folder is getting thick" is prose; no reputation for a desk that always lawyers up or always memes.
**Event:** 2. Ignition letter → the modal verdict ("It lands / misses / backfires") → the instant feed post judging it (:296-305). A clean transaction with a legible result, but one click and one roll.
**Flavor:** 2. 22 headlines; per-action success/miss/backfire lines (lone per action, :263-293) and feed judgments; storm posts 2–5 per kind.
**Teeth:** 3. Boil −4 pop −6 morale and the scar; legal backfires +30; livestream fatigue +8; apology costs pop; a correct ignore is rewarded.
**Grades:** Reads 3 · Decisions 2 · Arc 1 · Event 2 · Flavor 2 · Teeth 3 = **13**
**Gap:** after a hundred storms the desk has no memory and no style — the same five buttons with the same five sentences, and the public never learns that this company always apologises.

---

## Card 6 — The press and the public eye
**Modules:** publiceye.js (the public trainee, the snub, expectations, comparisons, the ace watch), fame.js (`fameWord`, the wall, the breakthrough), memory.js trade features (sim.js:282-292), gen.js headlines. **UI:** "Public profile: …" and the shows-closed warning on the company card (views_industry.js:89-94), "The conversation" narratives (:177-181), "The public knows her" on the dossier (views_talent.js:469-472).
**Lifespan:** an announcement mints an expectation word; the debut settles it (over/under/met); a known trainee left off a lineup is a snub (morale, ledger, storm); the feed asks about the unassigned ace weekly; fame is derived each call from durable facts.
**Reads:** 2. The fame word; narrative lines; the expectation and verdict as letters (never on the prep card); houseCompare letters; the ace watch as feed posts. No press page, no "this month's trades" view, no named outlet or critic with a memory.
**Decisions:** 0 — by design ("all reaction, no new verbs", §77). The levers are indirect (who makes the lineup, whether to announce loud).
**Arc:** 2. overDelivered/underDelivered/breakthrough narratives; `snubCount` and the passedOver ledger per person (publiceye.js:83-98); fame moves the wall for good after a breakthrough (fame.js:156-172).
**Event:** 2. The settlement letter, the snub letter + storm, the breakthrough letter, the exec's milestone letters — all single letters that arrive with the debut; no interview, no presser, no feature the player sits for.
**Flavor:** 2. expectSet ×3 by level, overDelivered ×2, underDelivered lone, houseCompare ×3, ace watch ×5 feed lines, 8 feed families of 3–4.
**Teeth:** 2. Snub −6 morale and a storm aimed at the company; underDelivered −4 member morale; the wall caps reception and reach. Nothing to ignore.
**Grades:** Reads 2 · Decisions 0 · Arc 2 · Event 2 · Flavor 2 · Teeth 2 = **10**
**Gap:** the press is a voice without a body — no outlet, no critic, no feature the player can give or refuse, so "the industry out loud" is only ever overheard.

---

## Card 7 — The national chart as a read
**Modules:** industry.js (the pool :234-337, the rotation :274-288, milestones :181-232, retirement :976-989), verdict.js `trendOf` (the sound of the year, adjacent). **UI:** the Charts room (views_industry.js:233-276), national peak on each discography row (views_groups.js:502-504), the sound-of-the-year card (views_industry.js:77-82).
**Lifespan:** the pool releases on its own cadence forever; your releases enter with their score; milestone letters on the way up; a faded pool artist retires and a riser takes the parking spot.
**Reads:** 2. A ranked list of invented act names with movement arrows and weeks; the milestone letters. Pool artists have no page, no members, no story — `company` is their type label ("girl group").
**Decisions:** 0. A scoreboard.
**Arc:** 1. `g.nationalNumberOne` / `nationalTopTen` flags (first-time trust and reputation), natRetire swaps a name; no narrative is ever recorded about a national act, no rivalry with a titan is possible (badblood only scans `state.rivals`).
**Event:** 2. The #1 and first-top-ten letters are in the exec's voice (industry.js:209-225) — a real moment; top 20/3 are public lines.
**Flavor:** 1. One string per tier (a second-visit variant at 10), natRetire lone, feed one line per tier, three ambient national posts.
**Teeth:** 2. Milestones pay trust/reputation; the national giants sit in the daesang field (awards.js:129-146); the titans' mega weeks do NOT crowd you (`crowdPenalty` counts rival releases only, industry.js:340-343).
**Grades:** Reads 2 · Decisions 0 · Arc 1 · Event 2 · Flavor 1 · Teeth 2 = **8**
**Gap:** the big board is a list of names that never become anyone — a titan's mega-week, retirement or parking spot is never a week the player can see coming or plan around.

---

## Card 8 — The tour (the road)
**Modules:** tour.js (eligibility :42-67, `planTour` :69-112, the weekly grind :115-357, the wrap :360-377), stage.js (the night read :53-131, `nightDemandMult` :264-268, STAGE.badNightDemand 0.9 / goodNightDemand 1.05 constants.js:1986), tongue.js (the voice abroad, the airport), sagas (capital premium, JV cut). **UI:** the touring desk (views_studio.js:521-561), "The road has them" hero (:159-178), post-tour rest hero (:183-194), the map words on the group page (views_groups.js:284-295).
**Lifespan as lived:** plan (scale / up to four legs / pacing / setlist, the route preview and a price) → book → the road: the home circuit plays two cities a week, each overseas leg two weeks; a letter a week lands on the Desk; nothing to decide → the wrap letter → three weeks of contractual rest.
**Reads per stop:** the planner shows demand words per market and the KR route (:539-557). On the road the hero reads scale, leg i/n, the current city and date i/n, encores, pacing, setlist and "N sold out" (:169-177). Each week's letter lists the cities played with one of three fixed lines each ("SOLD OUT in minutes" / "sold well — full floor" / "ran soft — curtained off"), the revenue, and the stage line for the week's night (tour.js:209-212, 344-351). The next city is never named before it plays; the tour is on no Today card and no calendar strip entry (sim.js:616-646 lists the season, preps, rival dates, bookings, deadlines — not legs); the weekly leg letter is normal priority and can be trimmed by the inbox law in a loud week (kernel.js:65-72) while the airport letter is critical.
**Decisions:** 1. Four choices at booking; zero during the road (no action touches `g.tour`; app.js tour-* cases are planner only :696-718). Bot: scale by pop, legs by warmth, humane, hits (harness.js:1510-1538).
**A night that goes wrong or right:** yes — `stageRead` per week; a fumbled night sells next week 10% softer, a carried one 5% hotter (stage.js:264-268); the carrier can draw a fancam storm, the fumbler an encore storm (:228-240). But it is one sentence inside the leg letter; the desk cannot answer it, rest the room, or change the setlist.
**Arc:** 2. Regions warm per leg (:314-320), popularity ±, fandom +, liveExp, `toursDone`, `tourHype` consumed by the next release (debut.js:703), one airport homecoming per region (:270-281, critical, on her file), the stronghold member's viral (:323-331), per-member stage counts. Legible after the fact only through map words; no tour record anywhere ("3 tours, 7 sold out") — `toursDone` is never rendered.
**Event:** 1. Plan → wait → letters → a one-line wrap ("N stops, N sold out, N soft" + one of three lines, :368-374). The encore second night is automatic (:172-177). No ceremony, no last-night letter, no named moment family.
**Flavor:** 1. Three fixed city lines, three overseas templates, three wrap lines, the weak-leader note lone (:222-223, :336-337), airport lone, tourMoment lone; only the stage line is a family; feed tourLeg ×4 / tourEnd ×3.
**Teeth:** 3. Soft ×0.55 revenue and −3 morale; punishing ×1.3 fatigue into overwork incidents; the promoter refuses a cold market; the interpreter fee; the JV's 25%; a booked festival eaten by the road (festivals.js:95-101); 3 weeks' rest and a 20-week cooldown.
**Grades:** Reads 2 · Decisions 1 · Arc 2 · Event 1 · Flavor 1 · Teeth 3 = **10**
**Gap:** the season's nearest cousin still has the season's old shape — a plan, silent weeks of near-identical letters, a count at the end; the night that goes wrong exists in the engine and never reaches a door or a page.

---

## Card 9 — Festival season & the far-market conventions
**Modules:** festivals.js (invites :52-84, the stage :87-150, the scene :153-208), circuit.js (the English version), stage.js. **UI:** the invite on the Desk rail; no festival card anywhere; the played letter.
**Lifespan:** four weeks out the organiser invites (75% unless icons/carried last year); accept bills travel; the slot plays on its week (fee, stage read, fatigue, liveExp, warmth abroad) or is MISSED if the calendar ate it.
**Reads:** 2. The scene body reads the schedule surgery out loud and the voice abroad (:158-175). After accepting, the booking is invisible: not on the calendar strip, not on the group page (`festivalBookings` only gates verbs); `g.festivalsPlayed` and `festBook` are never rendered; the bill (who else plays, who headlines) does not exist.
**Decisions:** 2. Take the slot / send regrets (reactive); the English version (proactive one-click, circuit.js:18-51). No set choice, no slot choice; the headline is offered, never earned by a decision. Bot: accept if avg fatigue <62 and budget >40 (harness.js:1348-1355); expiry = regrets.
**Arc:** 1. festivalIcons narrative after enough plays (memory), a carried set books next year's call (stage.js:270-272), conventions warm a far region. No per-festival memory ("we headlined Neon Harbor in Y3" is nowhere).
**Event:** 1. One high letter per play: blurb + fee + stage line (:145-149); abroad: voice/no-voice + stage line (:122-126). No night, no bill, no crowd moment, no headline ceremony beyond "HEADLINED … top of the poster" in a sentence.
**Flavor:** 1. Ten festival blurbs (constants.js:1292-1314) × two templates; invite ×2; missed, regrets, expiry lone.
**Teeth:** 2. Missed slot −2 fandom and a letter; travel up front; fatigue. Declining or ignoring costs nothing — "the organizers keep notes about who answers" (:206) writes no state, and icons are invited regardless (:71).
**Grades:** Reads 2 · Decisions 2 · Arc 1 · Event 1 · Flavor 1 · Teeth 2 = **9**
**Gap:** five named annuals and five conventions arrive as the same two-sentence invite and the same one-sentence night, with no bill, no booked-slot read, and no cost to saying no — a season in name only.

---

## Card 10 — The Japan cycle
**Modules:** japan.js (the partner scene :34-59, the lane :62-90, the week :93-172). **UI:** the "In Japan" next-step card (views_groups.js:414-418), the two lane buttons (:445-449), the map chip.
**Lifespan:** the partner calls when a group's JP warmth ≥35 (scene, 3-week fuse; "not yet" delays 24 weeks) → sign → lanes: JP-version (3 weeks) / JP-original (6 weeks), cost up front, the Korean calendar closed → the record posts to the Nichion weekly against four named titans → revenue after the 25% cut → rungs: hall / arena / THE DOME as `jpFans` accumulate.
**Reads:** 2. The away card with weeks left; the release letter (rank, revenue, the voice); rung letters; the dome critical. No Japan page: the ladder, `jpFans`, the partner, the titans' board and the warmth are never shown as a read — the player learns the rung only when it is bought.
**Decisions:** 2. partnerDeal sign / not yet (reactive); lane choice (proactive, two buttons). Bot: sign (options[0]); lane per harness.js:1008.
**Arc:** 2. `jpFans`, `jpRung` once each, domeNight narrative, warmth gain, the partner cut forever — durable, legible only in letters.
**Event:** 2. The Nichion letter against named titans, the rung letters, THE DOME (critical, narrative). The in-country weeks are silent (fatigue only, :113-118): plan → wait → one letter.
**Flavor:** 1. Lone strings throughout (:54-55, :87-88, :143-149, :165, :168); feed ×2 / ×3.
**Teeth:** 2. Cost up front, whole weeks claimed, fatigue, the cut, the interpreter's `tongueFactor`; "not yet" costs nothing.
**Grades:** Reads 2 · Decisions 2 · Arc 2 · Event 2 · Flavor 1 · Teeth 2 = **11**
**Gap:** a second discography the player never sees as a page — no ladder read, no titans board, no in-country week — so Tokyo is a six-week fade-to-black between a button and a letter.

---

## Card 11 — Award night & the year-end (and the gayo stages)
**Modules:** awards.js (fields :18-148, nominations :183-204, the seating scene :209-223 and :384-442, the ceremony :225-379), society.js debutClass (:159-185), year.js gayo invite/stage/collab (:75-115 — adjacent, the December stage with a stage read). **UI:** honors chips (views_groups.js:257-262); the seating scene on the Desk rail; no ceremony page; no strip entry.
**Lifespan:** week 44 nominations (one letter listing your categories, or the omission letter) → week 46 the seating chart and ONE question (who speaks) → week 47 a burst: bonsang wins (high), one combined snub letter, the daesang (critical, speaker and next-table lines) or the daesang snub/tenure debate; the speech is spoken or stays folded. December: the gayo invitation (high, ×2 family) and the gayo stage letter with the stage line.
**Reads:** 2. Which categories you are on (never the full ballot — who else is nominated is unseen), the seating body with the friend, the honors chips, `awardHistory` feeding the ranking. No ceremony read in order, no "the room" during the three waiting weeks, nothing on the calendar strip.
**Decisions:** 1. The microphone (leader / breakout / writer) — reactive, once a year, only when nominated; no campaign, no appearance choice, no gayo choice. Bot: breakout if offered (harness.js:1356-1361).
**Arc:** 2. honors, `daesangWonYear`, awardHistory (read by badblood's award source and the power ranking), snubs radicalise, gaveTheSpeech / the folded speech on her file.
**Event:** 2. The night is a burst of letters and the first daesang is written as a ceremony (:325-328); but it is read as mail — no reveal order, no envelope week, the snub and the win can land in the same unread pile; the bonsang letter is one template.
**Flavor:** 2. speakerLine ×3 roles + tableLine, first/again daesang, snub single/multi, the tenure debate, the folded speech; bonsang win one template; feed awardWin ×2, awardSnub ×1; gayo ×2.
**Teeth:** 2. Wins pay trust/pop/fandom; snubs pay fandom; the passed-over leader −2; protocol answers an unanswered chart for free.
**Grades:** Reads 2 · Decisions 1 · Arc 2 · Event 2 · Flavor 2 · Teeth 2 = **11**
**Gap:** the year-end is the one night the whole year points at and it arrives as five letters in one week — no ballot to read, no envelope to wait for, no table to sit at, and the gayo stage is a line the player cannot shape.

---

## Card 12 — The scouting trip, the school visit & the open market
**Modules:** schools.js (the map, the persistent class, the director's calls, trips, partnerships), scouting.js (looks, the table, holdouts, the clause scene, rival scouting), network.js (applications, referrals, viral, street, open call), floor.js (castoffs, the market, re-entry, the grudge bar), tongue.js (global auditions), blurbs.js (the evaluators' words), events.js (four table events, exec nudges). **UI:** the board (views_talent.js:23-53, rows :164-193), the schools (:58-116), the dossier (:285-666), the clause and director letters.
**Lifespan:** the board fills through channels on the network read; looks collapse fog; the sign may counter (bonus / training clause / debut-by) or be refused (holdout, castoff done, grudge); rivals escalate and sign under you; schools' classes persist and are revealed one trip at a time; castoffs land with a window; released people come back around and remember.
**Reads:** 3. Rows carry origin + last chapter, the read's age in words, the best blurb, heat chips by rival with words, channel, holdout state; the dossier wears "?" until a look; schools show lane, rep word, alumni ledger, class headcount, the director's temper after a visit, map-priced buttons; the network word.
**Decisions:** 3. observe, sign and its counter, street cast, open call, six audition circuits, trip, partnership, the clause table (release / plead), release. Proactive and reactive. Bot exercises all (harness.js:881-900, 935, 1143-1148; clauseCall → options[0] = release).
**Arc:** 3. School reps move with alumni; schools open/close/get hot; students are poached in the fog; every file carries chapters for life; holdouts count visits and call back; castoffs may be "done"; a released trainee refuses or re-signs at a price that remembers (floor.js:298-314, scouting.js:208-219).
**Event:** 2. The director's calls, the callback (critical), castoff letters (high), the open-call "was an EVENT" letter, the clause table. The trip itself is click → letter; the back row is a sentence, not a scene.
**Flavor:** 3. 25 street stories, 14 call stories, application ×4, rivalSigned ×5, rivalScouts ×4, castoff major/minor, blurbs assembled from ~20 variants per cell.
**Teeth:** 3. Looks and trips cost; counters, clauses that walk; refusals; rivals and the fog take people; retainers refused to a nothing label; the window closes.
**Grades:** Reads 3 · Decisions 3 · Arc 3 · Event 2 · Flavor 3 · Teeth 3 = **17**
**Gap:** the one thing missing for the hundredth trip is the visit as a scene — the back row, the director across the desk, the student you choose to approach — the only beat in this deep system that still resolves as a button.

---

## 1. Ranked thinnest → deepest (total /18)
| # | System | R | D | A | E | F | T | Total |
|---|---|---|---|---|---|---|---|---|
| 1 | The national chart as a read | 2 | 0 | 1 | 2 | 1 | 2 | **8** |
| 2 | The rivals as characters & the power ranking | 2 | 0 | 2 | 1 | 2 | 2 | **9** |
| 3 | The bad blood | 2 | 1 | 2 | 1 | 1 | 2 | **9** |
| 4 | Festival season & the conventions | 2 | 2 | 1 | 1 | 1 | 2 | **9** |
| 5 | The tour | 2 | 1 | 2 | 1 | 1 | 3 | **10** |
| 6 | The press and the public eye | 2 | 0 | 2 | 2 | 2 | 2 | **10** |
| 7 | The rival relationship (offer / JV / society / clash) | 2 | 2 | 2 | 2 | 1 | 2 | **11** |
| 8 | The Japan cycle | 2 | 2 | 2 | 2 | 1 | 2 | **11** |
| 9 | Award night & the year-end | 2 | 1 | 2 | 2 | 2 | 2 | **11** |
| 10 | The fandom as a character | 2 | 2 | 2 | 2 | 2 | 2 | **12** |
| 11 | The PR desk / discourse | 3 | 2 | 1 | 2 | 2 | 3 | **13** |
| 12 | The scouting trip, the school visit & the open market | 3 | 3 | 3 | 2 | 3 | 3 | **17** |

Honest note: §67 (rise and fall), §82/§83/§84 (the atlas, the school map, the academy's game) are substantial as MECHANISM — the 17 for scouting reflects that; the rivals' 9 is a grade on what the player sees and decides, not on risefall.js's physics.

## 2. The top 3 transactions that should be events
1. **The tour** — plan four knobs → 2–8 silent weeks of near-identical normal-priority letters → a count. The engine already rates every night (stage.js) and sells the next week on it; none of it reaches a door, a Today card, or the strip. (tour.js:115-377; views_studio.js:159-178)
2. **The Japan cycle** — one button → 3/6 weeks of fatigue in the dark → one Nichion letter; the ladder and the partner are never a read. (japan.js:62-172)
3. **Festival season** — invite → wait → one sentence with the fee; the booked slot vanishes from every page until it plays; declining is free. (festivals.js:52-150) Runners-up: the January power ranking (one letter, no pre-announcement) and the year-end (five letters in one unread pile; the three waiting weeks are silent).

## 3. Hidden truths shown as raw numbers · verbs with no consequence
**Raw numbers:**
- The power-ranking score column (views_industry.js:104-110) prints `e.score` beside each company — diegetic ("the trades' number") but it is rival prestige ×0.8 + flagship pop ×0.45 (risefall.js:49-59), i.e. the hidden prestige number the card otherwise shows as a word. Borderline; the deltas and ranks would carry the read alone.
- Adjacent, in the same file as the board: the dossier's Person tab prints "Since debut: Vocals +3 · Dance +2" — raw talent deltas (views_talent.js:426-435), the one place the hidden talent numbers surface as digits.
- "tracking N of your leads" on the rival card (views_industry.js:224) counts hidden interest entries — minor, since heat chips already name them per prospect.
**Verbs with no (or no asymmetric) consequence:**
- `nameFandom` choice index: backing an option vs "let them decide" changes only one clause of the letter (fandom.js:42-54).
- `cafeNotice`: no intensity, no grudge change; it only flags the freshest grievance and posts a letter — free, every six weeks, even with nothing to say (constituency.js:141-156).
- theOffer `leverage`: +120 budget and +3 trust vs decline's +2 — strictly dominant; "I will remember that we agreed under these circumstances" writes nothing but a ledger count (risefall.js:338-346).
- Festival `decline` / expiry: ledger only; "the organizers keep notes" stores nothing and icons are re-invited regardless (festivals.js:71, 196-207).
- `launchLightstick`: a one-shot +25 net and +6 intensity with no downside — a button, not a decision (constituency.js:160-178).
- partnerDeal "Not yet": delays the call 24 weeks at no cost (japan.js:48-50).

## 4. Sketches for the three thinnest (house style; shapes, not numbers)

**The national chart → "the big board has people on it."** Give each pool artist a hash-stamped line (an era word and a one-line reputation, the way rival philosophies are seeded as narratives — memory.js:293-300) and a page like the rival act page, read-only. Put a titan's announced mega-week on the calendar strip through the same `announcedWeek` door rivals use (calendar.js:58-77), so `crowdPenalty` can count the nation and the studio's date picker can show "vs AOI-class week". Make the milestone ladder a lineFor family in the exec's voice, each tier a letter the player waits for (top 20 → 10 → 3 → 1), and make the retirement a torch letter that names who took the parking spot — their riser or your act — with a `natTorch` narrative the ranking reads. One door a year: the national year-end "the board's rookie" shortlist, read as a letter with the field named, so the daesang's giants have faces before they take the prize.

**The rivals as characters → "a head, a ledger, a call."** Stamp every signing house a HEAD by hash (an invented name, a temper word in the schools' pattern — schools.js:40-46: the poacher / the gentleman / the long memory / the gambler), shown on the card and quoted once a year in the ranking letter (a lineFor family per temper — the voice). Give rivals a directed ledger the way people have one (`KP.recordDirected` shape, floor.js/relationships): kinds like `tookOurWeek`, `lostHeadToHead`, `signedTheirCastoff`, `declinedTheirJV`, `leveragedTheirOffer`, `poachedFromUs`; the card reads it in words ("Aurum remembers the castoff you signed and the week you took"), and it weights what the physics already roll — ambush candidate choice (calendar.js:102-105), intake interest, the JV partner pick, the offer's suitor. One recurring door: `rivalCall`, a scene the head opens by temper (a borrowed stage week, a trainee swap off two boards, a joint gayo stage with the society friend, a truce after a named rivalry) with options that write both ledgers; the bot's default is the polite no. The overtake becomes a two-letter event: the trades' "the seat is in play" in December, the ranking in January.

**Festival season → "a bill, a set, a night."** Announce the bill four weeks out as a card on the Industry tab (the five annuals, this year's lineups cast from the same rival acts by popularity, the headliner named) so the invitation is read against who else is on it; carry the booked slot on the calendar strip and the group page. Make the set a door inside the invite scene (the hits / the deep cut the fandom asked for / the collab with the society friend on the same bill — options[0] the hits), and let the night reuse `stageRead` plus a hash-picked moment family like the season's `momentOf` (the golden-hour fancam, the rain set, the b-side singalong, the ment that went long, the wrong banner) so the played letter names a moment, not a fee. Headlining a tier-3 bill becomes a critical ceremony letter read in bill order; the icons arc gets a read on the card ("two years from a call by name"); declining writes a `regrets` count the organiser's next invite reads in words.

**Bonus — the tour (the #1 transaction):** a Today card during the road like the season's "On the air" (the next city, the room's size vs demand in words, the last night's band); a door at a sold-out stop (`encoreOffer`: take the second night / rest the room / move on — today the encore is automatic) and after a fumbled night (`roadPresser`: statement / ride, the edit's shape); a weekly moment family (the crowd sang her lines, the ment that went long, the sign in two languages, the setlist swap); the wrap as a ceremony letter reading the route city by city with the night that went wrong and the one that went right; and a tour record on the group page so `toursDone` finally means something.
