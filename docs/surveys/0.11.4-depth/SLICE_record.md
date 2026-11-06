# DEPTH SURVEY — the record and the stage (the comeback loop)

Slice: js/engine/{studio,songs,market,tracks,sheet,pipeline,product,debut,promo,stage,shows,verdict,credits,catalog}.js, the point desk in rituals.js; UI: js/ui/views_studio.js, the release/discography parts of js/ui/views_groups.js, plus the Desk rail and chart that carry the slice's reads.

The bar: the v0.11.4 season (season.js, Bible §95) — rankings read weekly with the line drawn, one episode letter a week naming her place, a mission and a named moment, doors during the run, an arc, a finale read as a ceremony. A loop the player LIVES, not plan → wait → result.

## 0. The week, as the slice runs it (sim.js phase order)

| order | phase | what it does for this slice |
|---|---|---|
| 100 | develop | `KP.prepWeek` rehearses a locked group (debut.js:446-491); the T-2 countdown letter |
| 120 | pipeline | stations resolve: recording opens THE SHEET, choreo names a choreographer, the MV shoot, the jacket; the slip scene; the stopwatch audit of last week's release (pipeline.js:141-236) |
| 148 | studio | the writing room delivers the commissioned demo (studio.js:286-308) |
| 150 | demos | the pitch: four demos appear in an open calendar, silently (sim.js:51-66) |
| 155 | market | circulating windows close — a demo is sold out from under the desk (market.js:45-78) |
| 200 | rollout | promo weeks run the locked plan: fatigue, pop, followers, the challenge viral, the fan-sign clip (debut.js:527-615) |
| 280 | popularityDecay | the room cools after promo + grace |
| 505 | trend | January: the trades name the sound of the year (verdict.js:94-109) |
| 540 | releaseWar | rival announcements, the ambush (calendar.js:54-126) |
| 565 | catalog | the resurfaced clip, the reverse run, the late climb (catalog.js:126-247) |
| 580 | shows | the three shows air: winners, encores, fairies, the point breakdown, the stage notes, the comeback stage (shows.js:91-303) |
| 585 | promotion | the offer scene; booking desks forgive (promo.js:146-209) |
| 590 | teasers | T-3/2/1 buildup beats (feed posts only) (debut.js:1389-1405) |
| 600 | releases | `KP.resolveDebut` — the whole landing in one tick, letters pushed in arrival order (sim.js:155-170) |
| 880 | credits | the ghost harvested at lock, works ledgers, the booklet, the ghost resurfacing (credits.js:84-172) |
| 900 | chartAndFeed | chart positions stamped, national milestones, the feed |

The inbox law (kernel.js:65-72): only `critical` bypasses the weekly budget; `high` competes by priority then arrival. Note that the landing letter itself (`urgent: true` → high, sim.js:160) is NOT critical, and it arrives after the shows, promotion, catalog and public-eye letters of the same week.

---

## DEPTH CARDS

Grades: 0 absent · 1 a number or one line · 2 present but thin · 3 deep. Bot default = what tools/harness.js does.

### 1. The pitch and the song market
**Modules** songs.js (generateDemos, setGroupConcept, renameDemo, demoOpinion), market.js (the camp, the circulating windows), credits.js (the producer pool, heat, snubs, the ghost), verdict.js (demoVerdictLines, the sound of the year). UI: views_studio.js:270-334 (the "producers are writing" wait card and the demo cards), views_groups.js:265-281 (the creative direction), views_groups.js:510-520 (the credits chips), views_industry.js:77-78 (the year's sound).

**Lifespan** The calendar reopens after rest → the Studio says "The producers are writing. Fresh pitches land next week" (views_studio.js:270-276) → next tick four demos appear with no letter (sim.js:51-66) → the player reads four cards and the staff's words, optionally holds a camp (+2 hotter demos, a letter), picks one, renames it, fights or keeps its lean → the lock. In between, a hot demo's window closes and it may be sold (`demoSold`, high); at the lock the passed advocates remember (snubs, the pen's feelings, the exec's tally); the best passed demo is harvested as a ghost that may come back as a rival's hit months later (`ghostDemo`, high).

**Reads** Each demo card: producer and lean, "to the brief", chips for the producer's push, the exec's taste, a house regular, the circulating window with weeks left, the asking price, "written by", "commissioned", the theme, the lyric's name, the year's sound (views_studio.js:302-325); the staff's words — hook, demands vs the room, the fit law, the theme vs the room, the catch, the trend (songs.js:223-250, verdict.js:239-250). Hook, catch, producer craft and writer craft are never printed — the fog is intact. The producer pool is read as heat words on the group page's credits chips (views_groups.js:515-519). The year's sound sits on the Industry tab (views_industry.js:77-78) and arrives as a January letter.

**Decisions** `studio-song`, `studio-concept` (fight the lean), the title input (renameDemo at lock), `song-camp` (holdSongCamp), `group-concept` (the brief: setGroupConcept, which re-tools the drawer), `studio-lock`. All proactive; nothing arrives to be answered (the sold demo is a sting, not a door; the ghost is a sting). Bot: picks the demo with the highest HIDDEN hook (harness.js:1607 sorts `g.demos` by `d.hook`), camps when the best hook < 60 (1029-1036), commits to the direction that worked (1566-1568). The bot plays this meeting with the fog off — the census says nothing about whether the words on the cards are enough to pick by.

**Arc** Producer snubs (two passed pushes → B-grade pitches to this room, one letter: debut.js:191-199), bonds (two records → "house regular", +hook), the `signatureSound` narrative (credits.js:114-118), the exec's taste tally (a remark at the third pass, debut.js:224-231), the pen's demo passed (morale −4, `songPassed` directed, a history line: debut.js:203-210) or picked (morale +8, a history line, the `memberTitle` letter if it lands). The ghost: harvested at lock, resurfacing as somebody else's hit (credits.js:156-171). The direction's identity streak → `conceptIdentity` narrative; a pivot is news (debut.js:922-948).

**Event** None. The meeting is a card list that refreshes silently; the only moment in the loop is the lock (the `eraAnnounced` letter + the staff-warning modal: app.js:1226-1233). The ghost resurfacing is a real letter but rare and months late; the sold demo is a one-line sting.

**Flavor** Lone strings throughout: demoOpinion's conditions (songs.js:226-248), the camp letter (market.js:38-40), demoSold (market.js:67-69), the ghost (credits.js:167-168), the snub remark (debut.js:199), the exec's remark (debut.js:228-229), eraAnnounced is one string per branch (debut.js:256-261). No `KP.lineFor` family in this system; the feed has small families (songCamp, demoSold).

**Teeth** Real but hidden: the pick sets craft/appeal through the hook and catch; fighting the lean costs concept fit; the window sold → the demo is gone (30%/week past the window); a passed push cools the producer; the pen's passed song costs morale. The market can be ignored at no cost (never buy, never camp); the brief can be left open at no cost but the identity bonus.

**Grades** Reads 2 (rich chips and staff words, all fogged; but a static list) · Decisions 2 (five proactive picks, no door ever arrives) · Arc 2 (snubs, bonds, the ghost, the pen, the signature) · Event 1 (the meeting has no moment; the lock is the only beat) · Flavor 1 (lone strings) · Teeth 2 (hidden costs, the market ignorable) — **total 10**.

**Gap** Across thirteen years the meeting never happens in a room: the player never hears a producer pitch, never answers one, and the only thing that changes between cycles is the chips.

### 2. The commission (the writing room)
**Modules** studio.js (themes, the fit law, writers/the pen/house chairs, access, fees, commissionRead/Record, the weekly delivery). UI: views_studio.js:643-699 (the commission card), the "writing room is working" card (648-655).

**Lifespan** Pick a lane, a theme, a producer (lanes, heat, fit word, access refusal, fee), a writer (themes, "a theme they own", fee) → the Commission button (a `commissioned` letter, normal) → 2–3 silent weeks → `commissionDone` (high) → the demo appears on the sheet beside the pitch with a "commissioned" chip → the pitch loop above.

**Reads** The card is a good fog: producers by lanes + heat + fit word + "won't take the call"; writers by themes; the theme's age band and the room-miss warning in magenta; the read line ("home turf · a theme they own. The record lands in 2–3 weeks, beside the pitch") (views_studio.js:666-697). Writer heat is NEVER shown anywhere (writersOf shows themes only; `w.works` is written by credits.js:121-127 and read by nothing); the house chairs' records live on the building card (outside the slice).

**Decisions** `comm-lane/theme/producer/writer`, `commission`. Proactive only; nothing happens during the writing weeks; the result is not a decision (the demo is just on the desk). Bot: briefs on a weak sheet or every third cycle when flush, house chair first if at least next door, then fit, then heat (harness.js:1041-1075).

**Arc** The producer's works ledger reads heat (credits.js:74-81) and bonds; the house chair's two records open the second chair (hires). The writer's ledger exists but is invisible — no bond, no heat word, no "the writer who wrote your hit". `studioLedger` {commissions, landed, refused, offLane, roomMiss, houseRecords, penRecords}.

**Event** Plan → wait → result. One letter when it lands, with three fit-branch sentences (studio.js:302-306). No first listen, no rewrite, no demo day.

**Flavor** Lone strings: the commissioned letter (studio.js:248-251), commissionDone (302-306), the access refusal (203-204), the themeWord (233). Feed: two lines.

**Teeth** Fees are real (in demand 40 vs a 30-cost single); the fit law caps an off-lane producer's craft and the sheet says so; a room-miss theme costs craft and every critic names it (verdict.js:196); refusals count. Ignorable: yes (the pitch suffices; the bot skips most cycles).

**Grades** Reads 2 · Decisions 2 (four picks, proactive, nothing to answer) · Arc 1 (producer heat only; writers are strings with a hidden ledger) · Event 1 (one letter) · Flavor 1 · Teeth 2 — **total 9**.

**Gap** The owner's own sketch ("we'd hire producers, we'd have writers, we'd make decisions on who's most proficient") lands as a form with a 2–3 week timer: the people never talk back.

### 3. The production runway (the lock, the stations, the campaign, the teasers, the clash)
**Modules** debut.js (planDebut, prepWeek, the teasers), pipeline.js (stations, theSlip, the choreographer, the MV clip), calendar.js (the ambush, respondClash), publiceye.js (the bar minted at lock), bookings.js campaignPush (the run-up desk card; adjacent). UI: views_studio.js:80-111 (the locked hero: title, lane, promo, weeks to go, the alloc, "The date does not move"), 87-100 (the clash card), views_groups.js:376-394 (the production board), views_desk.js:183-215 (the campaign card), sim.js:624-627 (the calendar strip).

**Lifespan** The lock is a twelve-field form (song, title, concept, alloc, format, MV tier, promo level, four rollout weeks, pressing ×4, date, mash, the solo project) billed once → `eraAnnounced` (high) + the comeback bar letter at loud or above (publiceye.js:104-113) + the staff modal (fatigue, moonlighting, the clash, the snub) → weeks of stations: recording (opens the sheet), choreo (a letter only when PUNISHING: pipeline.js:185-187), the MV shoot (a fatigue spike; a 7% on-set clip letter), the jacket (silent) → the slip scene when the lead vocal is benched/tired inside the final stretch → an ambush letter (urgent) and the clash card: hold or slip → one campaign push a week on the Desk → teaser beats at T-3/2/1 (feed posts, no letter) → the T-2 countdown letter → the landing.

**Reads** The board on the group page lists the four stations with done/this week/N out and the choreographer's name once done, plus CRUNCH (views_groups.js:379-394). The Studio hero shows the record's shape and the weeks (views_studio.js:101-110). The campaign card reads momentum in a word, the pushes worked, the fit stars (views_desk.js:190-214). The upcoming strip carries the date with a clash flag. Buildup/anticipation has no read at all — not a number (good) and not a word either; the only trace is the feed's teaser posts (debut.js:1408-1426).

**Decisions** At lock: everything, proactive. During: `theSlip` (crunch / postpone; bot and expiry default = crunch: harness.js:1484-1485, pipeline.js:128-137), `clash-hold` / `clash-slip` (bot: slip when the foe is bigger and it can pay: harness.js:1228-1233), `campaign-push` kinds (bot: streetTeam every week the room is under 55 fatigue: 909-918), `take-booking` with a flyer week, `track-open` credits (solo/unit, until release week), `rename-track`, the `returnRun` scene (gravity.js) when an alum's calendar is open. Two real reactive doors, both rng-gated (recSickFatigue, ambushChance).

**Arc** Thin for the making itself: `rel.choreo` and `rel.mv` are archived; the choreographer's track record is "written and never read" (pipeline.js:222-226, the module says so); no member history line for a shoot or a crunch; postpone cools buildup and prints the notice; the campaign's momentum pays at the wall (`groundPaid`/`wallFelt`). `pipeLedger` {stationsRun, recSlips, slipScenes, postponed, crunched, clips, ...}.

**Event** The lock is a moment (letter + modal + the bar). The run-up is mostly silent: of four stations only the sheet opens a scene; the choreo speaks only when punishing; the jacket never; the teasers never reach the inbox; the countdown letter at T-2 is the one beat. The slip and the ambush are genuine doors but rare.

**Flavor** Two families: the countdown (five lines, debut.js:483-489), the bench (four, 516-521). Lone strings: eraAnnounced per branch, postponed, crunched, stationChoreo, onSetClip, ambush, dateHold, dateSlip, the slip scene body.

**Teeth** The bill is one truth (planDebut charges what the Studio shows); a short runway stacks stations into one week; crunch +9 fatigue per member; postpone −8 buildup and a public notice; slip costs money and morale, hold makes a battle; punishing choreography on a weak room is a stage bill (debut.js:645-650) and a sharper encore storm; the alloc shapes rehearsal gains (0.55 × share — real but never mentioned anywhere afterwards). After the lock the loop can be ignored entirely: advance and it resolves; silence on the slip = crunch.

**Grades** Reads 2 · Decisions 2 (a big form, two rare doors, one weekly button) · Arc 1 (the making leaves almost no memory) · Event 1 (lock, then plan → wait → result with rare interrupts) · Flavor 2 · Teeth 2 — **total 10**.

**Gap** The weeks between the announcement and the stage are the weeks a real comeback is lived (the concept film, the tracklist poster, the MV teaser, the shoot stories) and here they are four silent station ticks and a feed post.

### 4. The sheet (the line distribution)
**Modules** sheet.js (parts, the ear, the proposal, presets, the custom sheet, settle, the scene), pipeline.js:169 (the recording station opens it), debut.js:656-661 (the recording craft row), stage.js:69-73 (the load), the stopwatch audit (pipeline.js:216-235). UI: the Desk rail (views_desk.js:112-121), views_studio.js:113-156 (the sheet card), views_studio.js:591 (sheetLine on the report).

**Lifespan** The recording station (~30% of the runway) → `theSheet` on the Desk with a two-week fuse: the song's shape and the proposal in words → trust / spread / center / "I'll write it" → the custom sheet in the Studio: cycle the voice on each part within the cap, Lock → settle once (booth hours by share, morale, the quiet voice's grievance, hype to the voice of the record) → at release: the recording row of craft, "The booth: X owned the chorus; Y reached for the rap" on the report, the stopwatch thread per fault (20%) → the shares are the LOAD on every stage of the era and the medical desk's strain read.

**Reads** Scene body (sheet.js:375-384): shape + proposal in names. Studio card: each part with its public share % and demand word, the voice on it and a fit WORD (owns / carries / reaches / strains — through the staff's eyes: sheet.js:301-311), member chips colored under the floor / heavy (views_studio.js:129-145), the mode word, "waiting on the Desk". Report: sheetLine (sheet.js:286-298). The discography does not show who carried what; the dossier does not say "she carried the chorus on X".

**Decisions** `theSheet` four options (reactive; bot: center if the ace has hype ≥ 12, spread if room morale < 50, else trust — harness.js:1460-1471; expiry = trust), `sheet-cycle` ‹ › per part and `sheet-lock` (player-only; the bot never writes a sheet). Nothing after the lock.

**Arc** `linesCut` on the directed ledger with a history line for a quiet voice under professionalism 45 (sheet.js:332-337); hype to the top voice; the archived sheet rides the release and the stage; `lineShare` discourse at release; `pipeLedger.sheets/customSheets/quietVoices`.

**Event** A real scene with a body that names the room (the best-written door in the slice's run-up). Then the lock is a toast; the booth is silent until release week's one sentence. No recording-day moment (the take, the high note, the eleven takes).

**Flavor** The scene body is one template; TOASTS one per mode (sheet.js:349-354); sheetLine three shapes; the grievance line one string. No families.

**Teeth** Measured in the Bible: trust .95 / every voice .89 / front-load .87 — the ace on a chorus she cannot carry costs the record; quiet voices −3 morale and the stopwatch; a heavy share lights the thread and lifts her hype; the load law makes the carrier sing the hardest night. Real, mostly invisible (the recording row is never shown; only best/worst get a name).

**Grades** Reads 2 · Decisions 2 · Arc 2 · Event 2 (the scene is a moment; nothing after it) · Flavor 1 · Teeth 2 — **total 11**.

**Gap** The sheet is decided once and then felt nowhere the player can see until one sentence on the report; over many eras no voice ever "earns" the chorus or loses it on the record of what she sang before.

### 5. The pressing and the chodong (the product)
**Modules** product.js (fanbaseRead, preorderRead, the sheet, settleProduct, recordProfile), the lock (debut.js:133-141). UI: views_studio.js:446-472 (the pressing card), views_studio.js:602-606 (the chodong chip, streams/albums), the chodong letter family.

**Lifespan** At lock: versions 1–4, pre-order gifts, the run preset against a pre-order read, fan-sign rounds 0–3, a bill → nothing for the whole runway → release tick: the chodong letter (the number, vs the last era's number), SOLD OUT (family) or silence, the dump story at ≥2 rounds (30%) → `g.lastChodong` anchors the next era's fanbase read; the physical/digital skew mints an identity narrative (sellsLikeTitan / digitalDarling).

**Reads** The card prints the pre-order read and the run as counts (by design: "the only number that stops being an estimate", product.js:17-21) and warns of the dump risk (views_studio.js:463-470). The report chip: chodong N · SOLD OUT; revenue with streams/albums (views_studio.js:602-606). The letter: the number and "Up from / Down from / Holding against" the last era (product.js:131-144). `overpress` is computed (product.js:116) and never rendered — the warehouse memo was trimmed (§89 A) and the product profile does not show it; the discography does not list the chodong at all (views_groups.js:498-506).

**Decisions** Four toggles once, proactive, at lock. Nothing after: a sold-out week reorders automatically at 25%; there is no restock door, no pre-order week, no second pressing. Bot: never touches the sheet — planDebut gets no `pressing` (harness.js:1628-1634), so normalizePressing uses the staff suggestion.

**Arc** `lastChodong` and the "the fandom GREW / the wallets cooled" comparison; the identity narrative; sign rounds → fatigue and the dump discourse. No history line, no per-era product memory in the discography.

**Event** The chodong letter IS a moment — a number out loud with a family and the sold-out story — but it is one line inside the landing's burst, and the only beat of the loop.

**Flavor** chodong three lines, soldOut three (product.js:140-156, `KP.lineFor`); the dump story one string; strong feed families.

**Teeth** Underpress → lost demand and the "sweetest lost money"; overpress → unit cost paid and SILENCE; heavy rounds → the dump discourse aimed at the company; lavish gifts → margin and demand. Can be ignored: take the suggestion (the bot does, forever).

**Grades** Reads 2 (numbers, by design; the overpress invisible) · Decisions 1 (four toggles at lock, nothing after, the bot never decides) · Arc 1 · Event 2 (the chodong letter family) · Flavor 2 · Teeth 2 — **total 10**.

**Gap** The pressing is a bet placed at the lock and read at the landing with no pre-order day, no restock call and no memo when the bet is wrong.

### 6. The release week and the two verdicts (the landing)
**Modules** debut.js:623-1351 (resolveDebut), verdict.js (the registry, the critics' circle, darling/panned/slump/grower), publiceye.js (the bar settles, the house comparison), calendar.js:169-238 (the battle), fame.js (the wall, the breakthrough), tracks.js:113-202 (solos, units, the b-sides' heat, the sleeper), industry.js:127-197 (chart positions and the national milestones), money.js:38-55 (the settlement scene). UI: views_studio.js:566-641 (the report), views_groups.js:467-521 (the discography), views_industry.js:233-276 (the charts), views_studio.js:285 (the one-line last-release summary in the Studio).

**Lifespan** The scheduled week → one tick resolves everything → the inbox gets, in arrival order: `landed` (high; family of three, sim.js:161-165), chodong, sold out, the critics' verdict (high when split/acclaimed/panned), the darling (CRITICAL) or the panned hit, the slump/grower, the battle, over/under-delivered, the solo and unit track letters, the sleeper, the b-side charting beside the title, wallFelt/groundPaid/breakthrough, memberTitle, the pivot, the fusion verdict (critical), the season line, regions, the settlement due, the MV snark — a dozen letters competing for one week's budget → the report page (reached from the group page: views_groups.js:521) → the comeback stage next week → the chart stamps weekly with national milestone letters → the rest.

**Reads** The report: the band label as the hero, the critics' line with an outlet's quote, the booth's sentence, chips (critics word, the comeback stage band, room word, scene #, national #, the battle, chodong, revenue), the public notes, the b-sides in words, the breakout with "Not your center. The public picked her anyway.", the exec's line (views_studio.js:576-640). The discography row: peak, national peak, critics word (split), weeks charting, credits, the fan pick's word, reverse runs (views_groups.js:498-506). The chart with NEW/▲/▼ and a "yours" chip (views_industry.js:250-267). `craft`, `appeal`, `reach` and the ledger rows are stored and never printed (good); performance and chemistry become words (views_studio.js:701-702). One wrong signpost: the landing letter says "Full report in the Studio" (sim.js:162-164) but the Studio has only the one-line summary (views_studio.js:285); the report button lives on the group page.

**Decisions** None in the week — it resolves in the tick. The doors around it belong to other loops (the offer next week, the settlement scene if recouped, the discourse responses, the point nudge). Bot: n/a.

**Arc** The deepest in the slice: a history line on every member (debut.js:847), the breakout's line and confidence drift (859-861), `debutSnap` and the debut chapter on a debut, narratives (monsterRookies, underperformed, conceptIdentity/pivot, overDelivered/underDelivered, breakthrough, the identity by skew), producer and writer works (credits.js:103-127), the feud ledger, trust, reputation keys, fandom pride, popularity, debt and the red eras, the full release archive (craft/appeal/critics/sheet/choreo/bsides/liveDemand).

**Event** A reveal (the hero band) and a burst of letters, but one tick: no release-day beat, no first-day vs first-week, no chart-entry ceremony distinct from the reception, no critics' week after. The landing letter is `high`, not critical: in a loud week the trim can drop the landing itself while the darling survives.

**Flavor** Families: landed (3), chodong (3), soldOut (3), the critics' quotes (3 per band, hash: verdict.js:171-187). Lone strings: publicNotes per band (debut.js:1363-1382), the exec line per band (1353-1361), darling/panned/slump/grower, battle win/loss, over/under, wallFelt, the pivot, the MV snark.

**Teeth** Everything chosen pays here: trust by band (−3 more on a poorly-met objective), popularity compounding or cooling, revenue vs the era's spend (redEras), reputation, the battle's pop and morale, the bar's morale hit, the fandom's pride. 3.

**Grades** Reads 3 · Decisions 1 (nothing to decide in the week) · Arc 3 · Event 2 (a reveal page and a burst, not a ceremony; the landing letter trimmable) · Flavor 2 · Teeth 3 — **total 14**.

**Gap** The biggest night of the year is a single tick with no release day and no ordering: twelve letters arrive at once and the one that says it landed is the first to be trimmed.

### 7. The music-show weeks and the point desk (the promotion)
**Modules** shows.js (contenders, trophies, encores, the point breakdown, stage notes, the comeback stage, the fairy), stage.js (the one read, settle, the words), rituals.js:29-48 (pointNudge), promo.js (offers, the extension, the broadcaster ledger, marketing fit), debut.js:527-615 (rolloutWeek). UI: views_studio.js:224-262 (the promo view), views_groups.js:398-406 (the promotion card with the nudge buttons), 297-305 (the trophy case), 338-339 (the stage craft line), 307-322 (the rivalry file), views_talent.js:514 (her stage record), the Desk rail (the offer scene), the chart.

**Lifespan** The week after the landing: the comeback stage (named, rated, hype-bearing, a letter; shows.js:244-275) → four weeks of the plan locked at the lock: each week the shows air → a trophy (the first is urgent and a company milestone with a confidence drift), the encore moment on a carried winning stage, the rival's first trophy, the pool's titan, the point breakdown in words (one a week on the closest loss; near-miss = injustice fuel), the stage line (once a week per act, high when carried/fumbled), the ending fairy, the challenge viral, the fan-sign clip → an invitation on the Desk (≤2 per era) → the last week's extension door when the record is climbing → `promoUntil` passes with NO letter → three weeks of contractual rest.

**Reads** The promo view lists the plan's weeks with "now", says whether the record is climbing and why, whether an invitation waits, the booking desks' memory, the extension button (views_studio.js:233-247). The group page's promotion card and the "mobilized" chip (views_groups.js:398-406); the trophy case; the stage craft sentence; the dossier's stage record in words; the chart's weekly moves. Scores and point components never print (words: strong/weak; carried/clean/shaky/fumbled). No standings table: who won each show and by what margin is only ever a letter.

**Decisions** `point-nudge` streams/votes, one a week (proactive; bot: votes if intensity ≥ 40 else streams, every week it can pay: harness.js:1021-1026), `promoOffer` take/decline (reactive scene; bot: decline when it would cancel a stage, else take: 1454-1458; expiry = decline), `era-extend` (last week, if climbing; bot: when not tired: 1556-1560). The plan itself cannot be touched after the lock (the owner's law). The discourse responses (lineShare, encore, fancam, didntStand) belong to discourse.js.

**Arc** Trophies counted forever and the `showDarling` narrative; the first trophy's confidence drift and trust; `m.stages` carried/fumbled read on the dossier; `g.stageCraft` read on the group page, the awards' artist ballot and `reputation.performance`; the broadcaster ledger (shown in words when it bites); feuds; encore and fairy virals into memory; fandom intensity ±1 per carried/fumbled; the near-miss into intensity. 3.

**Event** The first trophy, the comeback stage and the encore are moments; the weekly stage line and the point breakdown are the §95-style "episode" reads. But the era has no END: the last stage, the thank-you live, the era's tally never arrive — `promoUntil` simply passes and the Studio says "Let them sleep." No trophy ceremony beyond a letter; no goodbye stage.

**Flavor** Families: rivalFirstWin (4), offerShow (3), offerVariety (3), stageLine (eight shapes by moments). Lone strings: the first win, later wins, the pool win, the encore, the fairy, the breakdown (two branches), the extension letter, the comeback-stage frame, fanSignWarm, challengeViral.

**Teeth** Fatigue per booking and the bench; carried/fumbled move intensity, morale, reputation and wake storms; a cancelled stage is remembered by its desk; the extension costs 6 fatigue; the nudge is 6 for +7 on a score the player never sees; wrong-fit bookings ×.75. Legible: the breakdown names the line that fell short, the stage line names who. 3.

**Grades** Reads 2 (words everywhere, no standings board) · Decisions 2 (nudge, offer, extension; the plan frozen) · Arc 3 · Event 2 (moments at the start, none at the end) · Flavor 2 · Teeth 3 — **total 14**.

**Gap** An era opens with a named stage and closes without a sentence; across a career the player never gets the night the era is counted.

### 8. The repackage (the era extends)
**Modules** debut.js:331-395 (planRepackage), the repack branch of resolveDebut (827-831, 1072, 1263-1269), the leftovers drawer (1344-1346). UI: views_studio.js:203-223 (the repackage card in the rest window), the eraExtended letter.

**Lifespan** Promo ends → during rest + six weeks a card lists the era's drawer (≤3 passed demos: title, producer, lean) with the bill and the window's close date → one button → `minPrep` 2 weeks (the stations stack; a second sheet scene for three tracks; T-2/T-1 teaser beats) → the full landing again (a shorter promo of 3 weeks).

**Reads** The card (views_studio.js:214-223): producer and lean per leftover, no chips, no staff words, no theme. The report is a normal report with no "extends X" marker; the discography does not render `repackageOf` (views_groups.js:498-506), so a repackage reads as a normal record forever.

**Decisions** `studio-repackage` on one leftover. The MV tier is taken silently from the Studio draft (app.js:1159-1161) — the player cannot see it; rollout = DEFAULT, promo = standard, pressing = suggested, alloc = flat: none of them offered. Bot: repackages when the last reception ≥ 62, the drawer is stocked and it can pay (harness.js:1540-1552).

**Arc** `rel.repackageOf`, the heat carry (only when the era was ≥ 60), the leftover's second life; no member history line, no narrative, no memory the UI shows.

**Event** The lock is a toast only — planRepackage's own note is computed and discarded (debut.js:393-394 returns `r.note`; app.js:1163 toasts its own line); no announcement letter, no bar; the landing's `eraExtended` letter (high, two branches). Plan → wait → result.

**Flavor** One string per branch (debut.js:1264-1268); the discarded note; the feed's repackage lines.

**Teeth** Cheaper (×.55) and smaller (demand ×.55, revenue ×.75); rides heat only from a warm era, "wheezes" from a cool one; another cycle's fatigue on a room three weeks rested; the drawer is spent. Ignorable: yes.

**Grades** Reads 1 · Decisions 1 · Arc 1 · Event 1 · Flavor 1 · Teeth 2 — **total 7**.

**Gap** The repackage — the most K-pop move on the calendar, the fandom's second photocard budget — is one button with no announcement, no choice inside it, and no trace in the discography.

### 9. The catalog's second life (the shelf)
**Modules** catalog.js (the resurfaced clip, the reverse run, the late climb, the push), tracks.js (the b-sides' heat, the fan pick, the sleeper — at landing). UI: views_groups.js:54-85 (the second life card), the discography's fan-pick words (486-491), views_industry.js:262-263 (b-side / reverse-run chips), views_studio.js:613-623 (the b-sides on the report).

**Lifespan** A record a year old with reception ≥ 50 / a sleeper / craft at the longevity bar, and every b-side with heat, become tickets → a weekly roll (base × the ticket's quality × the act's month × the push) → the revival letter (CRITICAL: the windfall, the chart entry, the national back door, a disbanded group's song) → spent once. The push: pick a ticket and a kind (party / challenge / clip) → 6–8 weeks → paid (the revival) or wound down (a `flavor` letter, first to be trimmed). The resurfaced clip (1.5%/week) opens a six-week window. During promotion the fan pick can climb late (a weekly hash).

**Reads** The card: the tickets as chips with b-side words ("warm", "the sleeper", "charted #"), "the act is on stages this month … every ticket doubles", the push buttons with their reasons, the running push with its end week (views_groups.js:65-83). The discography names the fan pick and reverse runs. Heat → words; the revival chance is never shown. Good fog.

**Decisions** `catalog-pick`, `catalog-push` (three kinds). Proactive; one live push per group with a long cooldown. Bot: quarterly, the first candidate, the clip after a stage else the party (harness.js:980-988).

**Arc** `catalogRevival` narrative, the ticket spent, +pop +fandom and the windfall; the disbanded group's song charting is a genuine story (catalog.js:255-258). No member history line for a revival; `catalogLedger`.

**Event** The revival letter is a composed moment (b-side / push / clip / national / disbanded) at critical priority — but a lottery (0.62 per org-year by the Bible's own salary check); the push itself is plan → wait → (usually) a trimmed wind-down.

**Flavor** revivalLine composed over three shapes; the push lines one per kind; the wind-down one; bsideCharts/Climbs one each; rich feed families.

**Teeth** A push costs 6–12 for a multiplier on a near-zero base — measured paid-out 4/40 orgs after tuning (§92 G); the player's verb is nearly a donation and its failure is a flavor letter. Ignorable: completely.

**Grades** Reads 2 · Decisions 1 · Arc 2 · Event 2 · Flavor 2 · Teeth 1 — **total 10**.

**Gap** The shelf is a lottery the player can buy tickets for; a thirteen-year catalog never becomes a thing she programs (the anniversary, the reissue, the live album, the song the tour revived).

### 10. The debut itself (the first release)
**Modules** debut.js isDebut branches (the lineup announcement via publiceye.js:49-101, the chapter, the snapshot, the drift, the founded fanbase, the rooms, the mandate consumed, trust by band, the objective met/poorly), fame.js (showsClosed/showsOpen), sim.js (the hype directive, the objective ladder), the same landing machinery as card 6. UI: the same report plus views_desk.js:23-39 (the directive), views_studio.js:627-635 (the breakout and the overshadowed center), views_talent.js:426-436 (Since debut).

**Lifespan** Lineup proposed upstairs → "Debut planning" (the same form) → the lock: `eraAnnounced` (debut branch) + the expectation letter (level ≥ 1) + `aceMadeIt` / `aceSnubbed` with a discourse + `showsClosed` (once, if the label is unknown) → the same runway → the landing: "debuted with", debutTrustDelta, the objective met/metPoorly, the debut chapter and snapshot on every member, the confidence drift, hype spent into a founded fanbase, the rooms, the breakout named, monsterRookies at ≥ 75, the bar settled against the announcement, the exec's line → the first promo weeks (the shows may not return the calls) → the first trophy in company history → the ladder issues the next directive.

**Reads** The report (as card 6) with the breakout card and the urgent overshadowed-center note (views_studio.js:627-635); the Desk's directive with months left (views_desk.js:24-39); the dossier's "Since debut" card (views_talent.js:426-436); the snub and ace letters at the announcement.

**Decisions** The lock form, identical to a comeback's. No debut-only door: no showcase/media day, no debut-stage choice, no "who fronts the first teaser". The builder's roles and center are upstream (not this slice). Bot: as planDebut.

**Arc** The deepest: the chapter, the snapshot the dossier measures growth against, the drift "the debut", the breakout's drift, the founded fanbase and the first chodong "birth certificate", the mandate consumed, the objective and trust, the gen stamp, the snub's wound on the passed trainee, the first trophy's drift. 3.

**Event** The announcement is a real cluster (date + bar + ace in + ace snubbed + the shows' closed door). The landing is the same single-tick burst with debut-only lines. There is no DEBUT STAGE: the era's first stage is labeled "THE COMEBACK STAGE" even on a debut (shows.js:273 — `comebackId` is any era's first stage; the text does not read `isDebut`), and no showcase day exists on the calendar.

**Flavor** The landed family's debut branch; eraAnnounced one string; expectSet one per level; aceMadeIt one; aceSnubbed two; execDebutLine one per band; publicNotes per band; over/under one each; showsClosed one.

**Teeth** Trust by band with the deadline behind it, the objective's verdict, the hype directive missed, the wall on an unknown name, the founded fanbase sized by reception × reach — a miss founds a small fandom for years. 3.

**Grades** Reads 3 · Decisions 2 · Arc 3 · Event 2 · Flavor 2 · Teeth 3 — **total 15**.

**Gap** A debut night is the one night with a name of its own in this industry and here it shares every letter, every chip and even its first stage's name with a comeback.

---

## 1. Ranking, thinnest → deepest (total grade)

| # | system | R | D | A | E | F | T | total |
|---|---|---|---|---|---|---|---|---|
| 1 | The repackage | 1 | 1 | 1 | 1 | 1 | 2 | **7** |
| 2 | The commission (the writing room) | 2 | 2 | 1 | 1 | 1 | 2 | **9** |
| 3 | The pitch and the song market | 2 | 2 | 2 | 1 | 1 | 2 | **10** |
| 4 | The production runway | 2 | 2 | 1 | 1 | 2 | 2 | **10** |
| 5 | The pressing and the chodong | 2 | 1 | 1 | 2 | 2 | 2 | **10** |
| 6 | The catalog's second life | 2 | 1 | 2 | 2 | 2 | 1 | **10** |
| 7 | The sheet | 2 | 2 | 2 | 2 | 1 | 2 | **11** |
| 8 | The music-show weeks and the point desk | 2 | 2 | 3 | 2 | 2 | 3 | **14** |
| 9 | The release week and the two verdicts | 3 | 1 | 3 | 2 | 2 | 3 | **14** |
| 10 | The debut itself | 3 | 2 | 3 | 2 | 2 | 3 | **15** |

Ties at 10 ordered by Event then Decisions: the pitch and the runway have no moment of their own (E1); the pressing and the catalog have one letter each (E2) but one-shot or weak verbs (D1). Note the shape of the table: the §91 work is deep in Arc and Teeth everywhere, and thin in Event almost everywhere — the loop pays and remembers, it just rarely happens to the player as a night.

## 2. The top three transactions that should be events

1. **The commission.** Four picks → 2–3 silent weeks → one letter → a chip on a card (studio.js:236-308). Nothing to read or decide while the room writes; the writer never speaks; the demo day is a tick.
2. **The repackage.** One button → two silent weeks → the same landing (debut.js:331-395, views_studio.js:203-223). No announcement letter (the engine's own note is thrown away, app.js:1163), no choice inside it, no mark in the discography.
3. **The pressing.** Four toggles at the lock → the whole runway silent → one number (product.js:91-171). No pre-order day, no restock door when it sells out, nothing at all when it overpresses.

Honourable mentions, same shape: the catalog push (6–8 weeks of nothing, then a `flavor` wind-down the trim eats: catalog.js:169-173); the era's end (the promotion simply stops — no last stage, no tally: debut.js:1072 sets `promoUntil`, nothing reads its passing); the MV shoot and the jacket (stations that resolve with no letter unless the 7% clip fires: pipeline.js:192-209).

## 3. Hidden truths printed as numbers · verbs without consequence

**Numbers that should be words (reveal law: names not reads):**
- debut.js:1258 — the solo project's letter prints `top.score` and `low.score` as digits ("the runaway (NN) … row (NN)"). The score is 0.55 × her hidden presence/talent + 0.45 × reception + noise — a read, framed as "first-day streams". The Bible calls the project's numbers public, but what is printed is the composite, not a stream count.
- views_talent.js:426-436 — "Since debut: Vocals +N · Dance +N": deltas of true `talents[d].cur` against `debutSnap`. Deliberate (§88 C, "the work, in numbers"), but it prints the movement of the one number the perceived layer (§5) exists to hide; a band word ("grew a step", "a full rung") would keep the law.
- Not leaks, but worth naming once: the sheet's share percentages (public by law), the pre-order read and the run (an estimate by design), chodong/revenue (money is public), chart peaks. All fine.
- The bot's fog is off: harness.js:1607 picks the title by hidden `hook`. Not a UI leak, but the soak census never measures whether the words on the cards are enough to choose by — which is the player's actual game.

**Player verbs with no (legible) consequence:**
- `point-nudge` (rituals.js:29-48): +7 on a hidden score, no letter by ruling (§89), and the point breakdown never says the drive came home — the player can never attribute it. A consequence exists; it is never readable.
- `catalog-push` (catalog.js:103-124): a multiplier on a ~0 base; paid out in 4/40 orgs; the failure letter is `flavor` (first trimmed). The verb is close to a donation.
- `promoOffer` → decline (promo.js:243-246): the toast says "the booking desk … wrote it down", but only CANCELLATIONS write the broadcaster ledger; a decline changes nothing. The line promises a memory the engine does not keep.
- `rename-track` / the title rename (songs.js:159-201): cosmetic by design — fine, but the "renamed" marker is the whole consequence.
- The rehearsal allocation sliders (views_studio.js:350-357): four sliders whose effect (prepWeek's 0.55 × share growth) is never mentioned by any letter, report line or staff word afterwards; a form the player cannot learn from.
- The repackage's MV tier: chosen silently from `App.studioDraft.mv` (app.js:1159-1161); the player never sees which video the reissue got.
- The choreographer's track record: `ch.works` is "written and never read" by the module's own admission (pipeline.js:222-226); the named pool never becomes a person the player can choose or remember.

## 4. Sketches for the three thinnest systems (house style; shapes, no numbers)

### 4a. The repackage → the era's second act
- **The era closes out loud.** A weekly at the promotion's end (the week `promoUntil` passes; promo.js already owns the rail at 585) emits `eraClosed`, priority high, a `KP.lineFor` family keyed `eraClosed|g.id`: the last stage in words (the week's `stageLine`), the tally in words (the trophy count, the chart's best week, the chodong's standing word, the critics' consensus word), the room's state (tired / warm), and — when the drawer is stocked and the format allows — one sentence that the window is open and when it shuts. This is the ceremony the whole comeback lacks and the natural doorway to the reissue. Ledger: `promoLedger.erasClosed`.
- **The reissue is a scene, not a button.** `KP.registerScene('theReissue')` opens with `eraClosed` (fuse = the window). Body in words: the three leftovers with their staff lines (`KP.demoOpinion`, reused), the fandom's ask (a hash-picked leftover "the cafés keep asking for — the one from the teaser"), the bill. Options: options[0] the A&R chair's pick (the bot's default — safe, cheapest), the fans' pick, "let the era rest". Two sub-doors live in the Studio as now (the MV tier, the sign rounds) but are SHOWN on the card instead of inherited silently.
- **The lock is announced.** The discarded `r.note` becomes a `KP.note` (`eraAnnounced`, a repackage branch in its family: the photocard budget, "the demo the meeting passed on, back from the table"); `KP.comebackExpectation` mints the bar as it does for any lock; the teaser beats already fire.
- **The landing reads the first act.** `eraExtended` becomes a family that reads the first era's numbers against the second in words (chodong standing, peak vs peak, the critics then vs now); the report hero says "The era, extended"; the discography row renders `repackageOf` ("extends 'X'") and the result adds a history line to each member ("the X era, extended").
- **Teeth stay as built** (the heat carry, the wheeze); the new cost is that a repackage announced and wheezing is a public story the `underDelivered` machinery already knows how to tell.

### 4b. The commission → the writing room talks back
- **The first listen.** On the commission's first week (studio.js's weekly at 148 owns the clock), a `writingRoom` letter (normal; a `lineFor` family keyed to the producer) names a moment of the writing by hash among what the brief offers: the chorus arrived first; the writer brought a lyric that is not the brief (a theme next door); the producer wants to move the lane a step over; the pen cried in the booth (when the writer is a member); the room-miss heard aloud ("the words keep aging the room"). Pronouns through `KP.fillPro`; snark at the room, never at her.
- **The rewrite door.** Two of those moments carry a scene, `theRewrite` (fuse one week): keep the brief (options[0], the bot's default) / let them move (the theme or the lane changes to the one named — the fit multiplier and the room-miss are re-read on the new brief; a small top-up fee) / pull the record (half the fee back; the producer's snub counter moves, so the next pitch from him is B-grade). The demo still lands on its due week; the brief on it is whatever was decided.
- **Demo day is a door.** `commissionDone` becomes a scene instead of a letter: the A&R chair and the marketing chair each say one fogged line (the two seats already exist — `demoVerdictLines` is the marketing line, `demoOpinion` the A&R one). Options: take it to the sheet as the brief's record (it gets the producer's push chip, so the pitch meeting's politics read it), shelve it to the era drawer (`eraLeftovers` — the natural repackage title, feeding 4a), or send it back for one more week (one re-theme, once).
- **Writers become people.** The writer pool gets heat words from its works ledger (the ledger already exists: credits.js:121-127) and a bond chip on the commission card like producers; a `houseVoice` narrative (recordEvidence) forms on the third record with one writer, the lyric's twin of `signatureSound`. The critics' letter already names the theme; add the writer's name to the quote when the lyric row carried the record.
- **Ledgers**: studioLedger.rewrites, shelved, secondListens; bands measure-first.

### 4c. The pitch → a meeting in a room
- **The meeting is a scene.** The week the demos land (sim.js's demos phase at 150 already knows the week), `thePitch` opens on the Desk with a body in words: the producers present in hash order; the advocate speaks (the `pushed` demo); the exec's taste is in the room (`execFavored`); the pen arrives late with hers; the sound of the year is on the wall (`KP.trendWord`). The Studio keeps the PICK; the scene holds the meeting's doors: options[0] "take the sheet as it is" (the bot's default), "hear the second one" (the pushed producer brought two — a second demo from the same craft through the same fit law appears on the sheet, priced), "send the wildcard back" (the off-lane producer's demo leaves; his snub counter moves — the cost is his future pitches), "ask for a rewrite for the room" (one demo with a room-miss gets its theme re-read a week later; the writer pool's `fitsRoom` logic already exists).
- **The meeting has a letter.** A `pitchMeeting` family (`lineFor`, salt `pitch|g.id`): the hook hummed in the hallway, the producer who left early, the exec's nod, the camp's whiteboard; the demoOpinion strings become families by salt so the same staff line is not read thirteen years running.
- **The ghost gets a middle and a shelf.** The sold-demo letter already names the buyer; the group page's credits strip renders `state.ghostDemos` for this room in words ("passed on 'Title' — now X's hit", once it resurfaces; "circulating elsewhere" before) so the one that got away is durable memory, not a one-week sting.
- **The brief meets the year.** When January's `trendNamed` letter moves the sound against a group's brief, one extra group-keyed letter ("your brief is against the year's sound now; the next meeting will say so") — the read exists (`KP.trendWord`), only the sentence is missing.
- **Teeth stay hidden and real**: the second demo is paid, the sent-back producer cools, the rewrite costs a week; the bot keeps its default so the census is unchanged.

---

## Appendix — evidence index for the grades (file:line)

- Pitch: songs.js:11-122, 134-154, 223-250 · market.js:22-78 · credits.js:74-81, 84-172 · verdict.js:94-109, 239-250 · views_studio.js:270-334 · views_groups.js:265-281, 510-520 · harness.js:1029-1036, 1566-1568, 1602-1607.
- Commission: studio.js:192-253, 257-308 · views_studio.js:643-699 · harness.js:1041-1075.
- Runway: debut.js:32-318, 446-491, 1389-1426 · pipeline.js:57-236 · calendar.js:54-163 · bookings.js:244-320 · publiceye.js:104-113 · views_studio.js:80-111 · views_groups.js:376-394 · views_desk.js:183-215 · harness.js:909-918, 1228-1233, 1484-1485.
- Sheet: sheet.js:132-206, 233-311, 314-432 · pipeline.js:169, 216-235 · views_studio.js:113-156, 591 · views_desk.js:112-121 · harness.js:1460-1471.
- Pressing: product.js:21-184 · debut.js:133-141 · views_studio.js:446-472, 602-606 · harness.js:1628-1634.
- Landing: debut.js:623-1382 · verdict.js:156-234 · publiceye.js:117-172 · calendar.js:169-238 · fame.js:95-172 · tracks.js:113-214 · industry.js:127-197 · money.js:38-55 · sim.js:155-170 · kernel.js:65-72 · views_studio.js:285, 566-641 · views_groups.js:467-521 · views_industry.js:233-276.
- Shows: shows.js:91-307 · stage.js:53-261 · rituals.js:29-48 · promo.js:63-265 · debut.js:527-615 · views_studio.js:224-262 · views_groups.js:297-322, 338-339, 398-406 · views_talent.js:514 · harness.js:1021-1026, 1454-1458, 1556-1560.
- Repackage: debut.js:331-395, 827-831, 1072, 1263-1269, 1344-1346 · views_studio.js:203-223 · app.js:1159-1165 · views_groups.js:498-506 · harness.js:1540-1552.
- Catalog: catalog.js:36-124, 126-282 · tracks.js:170-214 · views_groups.js:54-85, 486-491 · views_industry.js:262-263 · views_studio.js:613-623 · harness.js:980-988.
- Debut: debut.js:683, 844-856, 915, 963-979, 1044-1046, 1059-1065, 1353-1382 · publiceye.js:28-101 · fame.js:175-181 · shows.js:244-275 · sim.js:171-217, 382-452 · views_desk.js:23-39 · views_studio.js:627-635 · views_talent.js:426-436.
