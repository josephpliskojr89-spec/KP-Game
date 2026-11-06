# Depth survey — SLICE: the company (the desk, the money, the staff, the executive, the chapters)

Scope: `js/engine/{sim,money,finance,commerce,hires,staff,meeting,mandate,tenure,estate,founding,career,contentdesk,bookings,year,calendar,newgame,fame}.js`, `js/ui/views_desk.js`, the company parts of `js/ui/app.js`. Read-only; nothing in the repository was modified.

Bar: v0.11.4's season (§95) — rankings read weekly with the line drawn, one letter a week naming her place, doors during the run, an arc, a finale read as a ceremony. That is a 3 on Reads / Decisions / Event.

Grading key: 0 absent · 1 a number or one line · 2 present but thin · 3 deep (the season's level).

How the week runs (the rail order every system below hangs on — `sim.js:32-341` core phases, `kernel.js:100-110` inserts): develop 100 → demos 150 → rollout 200 → tour 250 → showcase 300 → hype 340 → relations 400 → rival scouting 450 → events 500 → outside 520 → release war 540 → industry 560 → **shelf 566** (estate) → shows 580 → **bookings 593** → releases 600 → deadline 700 → objective ladder 720 → hype directive 740 → **mandates 735** → **theYear 750** → **commerce 756 / adRevenue 756** → **finance 757** → **books 758** → month boundary 760 (invoice, payroll, arrears report, pressure letters) → **red 762** → stage door 786 (scene expiry, claim checks) → **building 788** (manager, taste, board season, pet project) → meeting 790 → **hires 791** → memory 800 → social 820 → … → **timeShare 859** (senescence, drift, succession, founder's board) → chart & feed 900. Then the trim: criticals always, everything else competes for `EVENTS.maxInboxPerWeek` 5 (`kernel.js:65-72`). A dissolved label stops the week until a door is chosen (`sim.js:346`).

Soak evidence used throughout: the sibling texture probe in this scratchpad (`noind_8.txt:309-358`, 11 orgs / 43 org-years) and `scenes_seen.txt` vs `scenes_registered.txt` (40-seed soak). In my slice **`distributorCall` and `lastStatement` never fire in standard soak play**; `execQuestion` opens 1.22×/org-year, `boardSeason` 0.85, `theInterview` 4.30, `seatPoach` 0.53, `petProject` 0.32, `redInk` 0.23, `termSheet` 0.14, `newChair` 0.07. Executive-kind letters: 11.5/org-year against 79.9 company and 112.7 public.

---

## Card 1 · The week and the Desk / Today

**Modules.** `sim.js` (advanceWeek, the pipeline, the trim, `KP.upcoming`), `kernel.js` (note bus, scene registry, convoLog), `scenes.js` (expiry, claims), `views_desk.js` (Today, The record), `app.js:162-187` (advance → modal), `app.js:312-321` (one scene dispatcher).

**Lifespan.** Start: the opening letters (`newgame.js:351-392`, three per door). Middle: tap Advance → the week's kept letters in a modal (`app.js:179-183`), release weeks push straight to the results view (`app.js:171-174`); the Desk is where every held decision waits. End: there is none — the week is the game's heartbeat and never changes shape across 13 years (the modal at year 13 is the modal at week 2).

**Reads.** Today: directive banner with months left, signing/fiscal chip, trust *word* (`views_desk.js:24-39`); the red card (`43-54`); greenlights (`92-104`); the rail of every scene + booking + outside offer under one kicker "Waiting on your answer" (`113-165`); open-chairs line (`172-181`); the campaign card (`185-215`); the founding door (`221-243`); the spotlight (`248-260`); inbox, 14 rows (`261-268`). The record: calendar strip of 5 (`469-483`, from `sim.js:616-646`), red totals, books, runway, promises on the clock / settled with her reply / conversations (`556-591`). The pre-trim week is kept on the engine, not the save (`sim.js:363`) — the player never sees what the law cut.

**Decisions.** Advance; `scene-opt` for every scene kind through one rail; take-booking, outside accept/decline, campaign-push, fund-pitch, sell-shelf, found-label. Proactive verbs live on sub-tabs (building, content) or other tabs (Groups: pitch, fancon). Bot: advances, answers scenes by policy, default `options[0]` for anything unlisted (`harness.js:1484-1485`).

**Arc.** The Desk itself carries no durable company story: convoLog is capped at 40 (`kernel.js:184`), settled claims at 10 (`SCENES.maxResolvedClaims`, `scenes.js:55-59`). After a year of play the record is a rolling window; after five it has forgotten the first debut's promise.

**Event.** The advance modal is the moment of the week; "A quiet week" is a toast (`app.js:185`). No weekly ceremony of the company's own (no Monday morning read of the building, no month-end page) — the month boundary is a stat tick with letters (`sim.js:218-297`).

**Flavor.** The frame is plain: mailRow = kind tag + text + week (`components.js:62-68`); the empty-inbox line is one string (`views_desk.js:263`). The letters inside carry the voice; the frame does not.

**Teeth.** Silence has teeth everywhere (every scene expires with a consequence — `scenes.js:16-39`); the trim means a loud week loses normal letters (`kernel.js:65-72`), which is the design.

**Grades.** Reads 3 (every clock and every answer owed is on one page) · Decisions 3 (the Desk is the decision surface of the whole game) · Arc 1 (bounded logs; no company history on it) · Event 2 (the modal is a rhythm, not a ceremony) · Flavor 2 · Teeth 2. **Total 13.**

**Gap.** The Desk shows the week perfectly and the career not at all — a human in year nine has no page that says what this company has been.

---

## Card 2 · The Monday meeting, the directive ladder and the exec's trust

**Modules.** `meeting.js` (execQuestion scene, three claim types), `career.js` (the objective ladder), `sim.js:171-217` (deadline, hype directive), `sim.js:454-474` (pressure letters), `staff.js:30-36,54-67` (taste), `tenure.js:58-66` (drift), `data.js:45-60` (six executives), `views_desk.js:24-39,556-591`.

**Lifespan.** Start: the exec's intro quote and the 18-month directive (`newgame.js:376`). Middle: every comeback resolves → the next directive with a grant (`career.js:16-67`, critical); every 10 weeks a Monday question *if* one qualifies (`MEETING.everyWeeks`, `meeting.js:19-23`); monthly pressure letters when the quarter runs red (`sim.js:256-278`); taste notes on good releases (`staff.js:54-67`). End: succession (card 8) — or never; trust at "gone" (`views_desk.js:596`) has no consequence (being fired is a later slot: Bible §86 E3, `BIBLE.md:5954-5958`).

**Reads.** Trust is a word chip (`views_desk.js:38`, bands at `595-597`). Promises on the clock and settled claims with her reply text (`556-579`); conversations (`580-591`). The exec has no card: tenure (`executive.since`) is never rendered (grep `js/ui`: none), taste is hidden until a note names it (`staff.js:64-65`), and the `personality` field on all six execs (`data.js:46-59`) is **read by no engine module** (grep `executive.personality` across `js/engine`: assignment only) — six names, one voice.

**Decisions.** `execQuestion` scene: `readyTrainee` (needs ≥2 free trainees and no open ready-claim — `meeting.js:60-61`), `secondGroup` (once per career, `84-96`), `soloQuestion` (when the gravity escalates, `38-51`); `comebackPromise` was pruned (§89 C, `meeting.js:97-100`). Measured 1.22 questions per org-year (`noind_8.txt:327`) — the 10-week cadence rarely has a question that qualifies. Answers go on the record as claims (`meeting.js:112-125`); bot answers option 0 (`harness.js:1299-1301`). Proactive: the pitch upstairs (card 7). No verb to *ask the exec* anything.

**Arc.** Trust is one number: drift above 75 (`tenure.js:58-66`), a −30 on a missed deadline (`sim.js:176`), ±2 per claim (`MEETING.payoffTrust/missTrust`), ×2 under a fund's board seat (`meeting.js:190`). The exec remembers through 10 settled claims and the line "I keep my notes, and I reread them" (`meeting.js:196`) — a sentence, not a mechanism. `objectiveHistory` accumulates every directive (`career.js:24-31`) and is rendered nowhere. Taste is one hash concept per tenure, fixed.

**Event.** The directive letter with its grant is a moment each comeback (`career.js:59-66`, critical). The meeting itself is a card titled "X is waiting" with a one-line body (`meeting.js:105-106`) — no room, no second beat. There is no annual review between the player and the exec (board season is the board's, card 8).

**Flavor.** Pressure letters are three `lineFor` families (`sim.js:458-473`); objective lines by reception band with one `rng.pick` pair (`career.js:69-86`); claim verdicts single (`meeting.js:184-231`); taste notes two singles (`staff.js:61-65`). Every exec letter is `state.executive.name + ': “…”'` — the micromanager and the visionary say the same sentences.

**Teeth.** Missed claims and deadlines bite; trust gates the founding (70) and the pitch (45). But the floor is toothless: at trust 5 the game continues unchanged — no probation, no budget cut, no second reader, no firing.

**Grades.** Reads 2 (promises and replies are real; the person has no page) · Decisions 2 (real claims, one live question type) · Arc 1 (a number plus ten receipts) · Event 1 (a card, not a scene; no yearly moment) · Flavor 1 (families on the pressure rail only; one voice for six people) · Teeth 2. **Total 9.**

**Gap.** Across 13 years the player never learns who the exec is — no taste the player can discover and play to, no memory that changes her questions, no yearly sit-down, and no cost to losing her.

---

## Card 3 · The quarterly books, the settlement (jeongsan) and the distributor

**Modules.** `money.js`, `sim.js:218-297` (month boundary), `views_desk.js:451-466` (books card), `debut.js:1031-1032` (redEras), `debut.js:143-149` (tightBelt consumed).

**Lifespan.** Start: the first statement closes at week 12 (`money.js:249-269`). Middle: four statements a year; per group the recoup ledger pays down silently (`money.js:38-58`) until the quarter it crosses zero → **first settlement** scene (`70-126`); three loss-making eras → **red ink** scene (`282-319`); a chodong past the next tier's bar → the **courting call** (`236-247`, `171-200`). End: after settlement, shares are paid each era with +1 morale (`60-67`) and the books card reads "settled · paid out N to date".

**Reads.** The books card shows the LAST closed quarter by stream, the operations residual, NET, and each group's recoup status (`views_desk.js:451-466`) — the running quarter (`b.cur`) is never shown, so the player reads the quarter only after it is over. The budget is in the topbar (`app.js:97`). The distributor's tier is rendered nowhere (grep `js/ui` "distributor": only the sell-shelf toast and the epilogue line) — the player cannot see who distributes them except inside the courting call's body.

**Decisions.** Three reactive scenes: firstSettlement (pay warm with backpay / to the letter), redInk (back them / tighten the belt), distributorCall (sign / sign with advance / stay). Bot defaults: fair, backThem, accept (`harness.js:1484-1485`). No proactive money verb exists (no budget line to set, no "cut the practice-room invoice", no quarterly plan); the player's only levers on the books are other systems' spends.

**Arc.** Durable and legible: `g.recoup.settledWeek/paid`; lean settlement and the unsettled grind write `leanSettlement` / `neverPaid` to each member's directed ledger (`money.js:109,120,225`; `LEDGER.KINDS` `constants.js:2872-2873`) and the renewal table weighs them; each member's file gets a history line at settlement (`money.js:103,110,121`); `redTalkDone`, `tightBelt` (spent at the next lock, `debut.js:143-149`); the distributor tier and advance persist. `books.closed` counts statements nobody can read back.

**Event.** First settlement IS a moment — a room, a choice the members remember "longer than any stage", a line in every file. Once per group. The quarterly close is one letter (`money.js:261-266`) whose exec reaction is a tail clause ("initials the page" / "circles the net in red pen") — plan → twelve weeks → result, nothing to decide at the close, no meeting. The courting call is structurally dead for the inheritance door: fame ≥ `DIST.fameTier[1]` at init seeds tier 2, so `next` is undefined forever (`money.js:131-134`, `239`; `scenes_seen.txt` has no `distributorCall`).

**Flavor.** `neverPaid` is a 3-line `lineFor` family (`money.js:228-232`); everything else single: settlementDue, both scene bodies, quarterlyBooks (one template, two tails), distCourted, advanceClear. Feed reactions are families.

**Teeth.** Lean → grudge at renewal; never settling → a grudge renewed yearly (`SETTLE.grindAt/grindEvery`); backing a red act −2 trust; the belt −3 morale and a 15% cheaper era. Letting the red-ink scene expire is **free** (`money.js:314-318`: sets `redTalkDone`, no belt, no morale) — the silence is cheaper than either answer. "Stay" on the distributor is free and the call re-opens the next week with a high letter, every week, because nothing records the refusal (`money.js:240-247`).

**Grades.** Reads 2 (last quarter and recoup status; no running quarter, no distributor on any card) · Decisions 2 (three good reactive scenes, zero proactive verbs) · Arc 2 · Event 2 (the settlement earns it; the close is a letter) · Flavor 2 · Teeth 2. **Total 12.**

**Gap.** The quarter is a thing that happens to the player: no page while it runs, no meeting when it closes, and after the first settlement the yearly money between the label and its artists is silent arithmetic.

---

## Card 4 · The financing round (the runway)

**Modules.** `finance.js`, `views_desk.js:518-541` (runway card), `app.js:367-371`, `estate.js:522-535` (the investor door reuses it).

**Lifespan.** Start: the yearly window letter (`finance.js:243-250`); the pitch verb when the account is thin. Middle: deck out (cost 2, cooldown 12) → one week → a pass letter or a **term sheet** scene with a 3-week fuse (`253-273`); one hand on the label at a time (`69-77`). The structure chosen runs 44–104 weeks: the toll on each quarterly close (`295-313`), the board seat halving the meeting cadence (`meeting.js:22-23`), the covenant as a real claim checked weekly (`129-159`). End: horizons pass with a letter (`316-325`); a kept covenant converts to a light share and reprices the next round; a miss becomes a clawback debt drained quarterly (`277-292`) and `burned` follows the career (`estate.js:288-290`).

**Reads.** The runway card: window chip, the fund's read of the label in five word-clauses (`financeRead` `finance.js:58-65`), active board/revShare lines with dates, the pitch button carrying its lock reason (`views_desk.js:525-540`). The covenant sits in "Promises on the clock" with the fund's name (`556-563`). The financing stream prints on the statement. The clawback balance is not on the card (`financingBusy` omits `debt`, `finance.js:69-77`) — it surfaces only as the pitch's refusal toast (`88-90`).

**Decisions.** Proactive `fund-pitch`; reactive `termSheet` with four options (walk / covenant / revshare / board) whose costs differ in kind — the best-shaped choice in the slice. Nothing to decide during the covenant clock. Bot: pitches under 100 past week 30, always takes the revenue share (`harness.js:1160-1165`); in the red it pitches on credit (`harness.js:858`, `finance.js:94-100`).

**Arc.** `financing.reputation` (capped +3), `burned`, ledgered seats/shares/covenants; the investor door at dissolution reads both (`estate.js:360-362`). The fund is a hash-picked letterhead per week (`finance.js:121`), so no single fund ever remembers *you* — "Hana Bridge watched you keep a covenant" never becomes Hana Bridge calling back; the pool of six is interchangeable.

**Event.** The sheet letter is critical and the table is a moment; the kept/missed covenant letters are the loudest money letters in the game (missed is critical). The board seat's "partner attends the Monday meetings" (`finance.js:195`) is never a voice in those meetings — only a cadence and a multiplier.

**Flavor.** All single templates (pitch, pass, sheet, body, three "taken" letters, kept, missed, horizons, window open/closed); the read's words vary with observables. Feed reactions: one family of three.

**Teeth.** The clawback, the toll, `burned` ×0.7 forever, 24-week cooling gaps, cooldown; the hostile audit closed the carousel (§85 as hardened). The loop can be ignored at zero cost — which the Bible calls a legitimate hard-mode choice.

**Grades.** Reads 2 · Decisions 2 (one proactive verb, one excellent table) · Arc 2 (reputation and burn carry; funds are faceless) · Event 2 (a sheet and a verdict; nothing between) · Flavor 1 · Teeth 3. **Total 12.**

**Gap.** Over 13 years the money never grows a face — no fund partner who sits in a meeting, asks a question, or calls back because of what *you* did last time.

---

## Card 5 · Fandom commerce (the club, the greetings, the fancon, merch, the annuity)

**Modules.** `commerce.js`, `views_groups.js:441-444` (fancon / free meeting), `views_groups.js:243` (lightstick, fandom.js — adjacent), `app.js:576-585`, `constants.js:1650-1680` (MERCH, CATALOG_PAY).

**Lifespan.** Start: the club asks once the fandom organizes (`clubAt` 35, `commerce.js:212-217`) → enrollment scene with the price as "a sentence about what this label thinks the fandom is" (`112-155`). Middle: dues renew yearly in silence (`219-228`, "a books line, not a letter"); Season's Greetings opens every Q4 at woy 44 with a 2-week fuse (`230-235`, `158-201`); fancon (ticketed) or fan meeting (free) between eras with one cooldown (`49-109`); tour merch ships itself (`238-251`); the catalog pays weekly forever (`253-271`); writers' royalties follow the person (`274-297`). End: stacking three wallet asks in 40 weeks rolls the "we are not ATMs" storm (`32-42`, 35%).

**Reads.** The buttons on the group page say the cost; nothing shows the fanclub's tier, its anniversary, the members enrolled, the merch-push window, or anyone's royalties (grep `js/ui` for `fanclub|merchPushes|royalties`: none). The commerce stream prints on the quarterly statement after the fact. The enrollment letter's tail is the only time the tier is named (`147-151`).

**Decisions.** fanclubOpen (market / warm / steep), seasonsGreetings (standard / lavish / skip), hold-fancon (ticketed vs free — different purposes, one clock), the lightstick. Bot: standard, standard, fancon when flush, free meeting whenever over 150 (`harness.js:1493-1494`). All money lands in the same action; nothing is decided after.

**Arc.** `g.fanclub{tier,since}` durable; the pricing sentence changes intensity once; `ownMoney` flags leverage at the renewal table (`284-286`) and the departed writer's checks keep arriving (`289-295`) — the two best lines of arc in the card. The ATM storm is a discourse with its own response desk (not this slice).

**Event.** Enrollment and the greetings window are real tables with a fuse; the fancon is a verb with a letter. No ceremony — the first-year renewal, the hundredth-thousandth member, the greetings unboxing: all ledger entries or flavor-priority letters (`greetingsShipped` is `priority:'flavor'`, `195`).

**Flavor.** Singles: clubAsk, both scene bodies, clubOpened (+3 tails), greetingsShipped, fanconHeld, fanMeeting, atmStory. Feed reactions are families of 2–3.

**Teeth.** Steep pricing −3 intensity "and a pricing thread"; skipping the year −2; stacking → the storm. Otherwise free money — the loop can be ignored at the cost of income only.

**Grades.** Reads 1 (nothing about the club is on any card) · Decisions 2 · Arc 2 (royalties-follow-the-person is deep; the club has no life) · Event 2 · Flavor 1 · Teeth 2. **Total 10.**

**Gap.** The fandom is sold things but never becomes a membership the player can read — no roll, no anniversary, no card-number culture, and the yearly renewal, the one recurring money "that pays salaries", passes without a word.

---

## Card 6 · The staff seats and the interview

**Modules.** `hires.js`, `staff.js:44-49` (the road manager), `views_desk.js:368-447` (The building), `app.js:433-460`, `constants.js:1773-1814` (HIRES).

**Lifespan.** Start: the founding trio plus a dance coach seed four chairs at "working" (`hires.js:228-249`); A&R and marketing start empty. Middle: a candidate takes the meeting on the market's clock (5%/week) or within a week of a posting (`425-459`) → **theInterview** scene (`267-330`); staff notes in their voice (`461-475`, flavor priority — 14.4 emitted/org-year, two-thirds trimmed per §89 A); a mesh-friction read once per bad fit (`478-486`); tiers rise silently on hits (`489-501`, "no note §89 C"); the poach call for a known chair or a hot group's manager (`505-533`). End: a chair empties by poach, by firing (`81-105`), or at dissolution (`estate.js:242-252`, where the chairs are named a last time and then deleted). Nobody retires, resigns, asks for a raise, or is credited.

**Reads.** The building tab is honest and complete about what the fog allows: name, tier, known-for, studio lanes/themes, records for this house, weeks in the chair, the read across the table (warmth/candor/style words, `114-133`), the résumé, the seat blurb (`views_desk.js:390-444`); the mirror above it (`376-378`). The road manager's name appears only in letters — never on a card (grep `js/ui` `\.manager`: none). Nothing says what a chair has *done here*: no "the rookie class of Y3 trained under Coach Weon", no era credit except studio chairs' `works`.

**Decisions.** seat-search (12, proactive), theInterview (hire / pass — hire price includes the sitter's severance, `286-299`), seat-release (severance, a modal that says you'll never know), seatPoach (match 25 / wish them well). Bot: posts for any open chair when calm, hires when flush, matches raises, **never fires** (no `releaseSeat` in either bot).

**Arc.** `st.since`, tier, `meshNoted`, studio `works`. No arc for a person: a coach who has sat for eight years is the same card as one who sat for eight weeks plus a chip; no bond with the trainees she trained; no departure of her own; no memory after she goes (the poach's "the school everyone hires from" is a feed line, not a ledger). The directed ledger exists for idols only.

**Event.** The interview is a scene with a composed body (a moment, 4.3/org-year) and the poach is a counter-offer with a fuse. Then "the only interview that counts: the next year" (`327`) — and the year contains no review, no anniversary, no result that is *hers*. Hire → wait → (a multiplier you cannot see). The fog law forbids numbers, not conversations.

**Flavor.** The interview body is a family by composition (hash-picked house × era × style word × candor, `130-150`); staff notes are 3+3 generic lines regardless of seat (`469-475`); poach/filled/walked/released/mesh single.

**Teeth.** Real and hidden by design (`seatMult` 0.85–1.18, `215-225`); firing a known name −1 trust; a bad fit −0.06. Empty chairs run at exactly baseline (`218`) with nothing nagging — a label can ignore the building for 13 years at the cost of upside only.

**Grades.** Reads 2 (a good directory, no history) · Decisions 2 · Arc 1 (tier and tenure; people without lives) · Event 1 (the hire has a door and no year) · Flavor 2 · Teeth 1. **Total 9.**

**Gap.** The staff are hired as people and then kept as multipliers — no year-end word from a chair about her own room, no credit that follows her, no leaving on her own terms, no one who ever says "I trained her".

---

## Card 7 · The mandate (the executive producer's greenlight)

**Modules.** `mandate.js`, `views_desk.js:92-104` (greenlight cards), `components.js:96-100` + `views_groups.js:19,32` (the pitch button), `app.js:643-662`, `constants.js:1258-1266, 2400-2409` (MANDATE, PORTFOLIO).

**Lifespan.** Start: the founding directive is the first mandate (`mandate.js:25-30`). Middle: the pitch upstairs (modal: girl / boy / solo) answered deterministically for reasons — trust, doctrine, the room on paper, the books (`138-188`) — or the board greenlights unasked when the floor is loud (`229-240`) or the generation turns (`192-213`). The window (40 weeks) sits on Today; a lineup in development buys grace (`219`). End: the debut consumes it **silently** (`88-102`: history entry, no letter), or it lapses (−3 trust, urgent letter, `216-227`).

**Reads.** Greenlight cards with source and weeks left (`views_desk.js:92-104`); the pitch button's cooldown; the denial reason in a toast. `mandateLedger` and `objectiveHistory` are never shown.

**Decisions.** The pitch is proactive and legible — the best-reasoned "no" in the slice (doctrine says why, `118-136`). Bot pitches from week 66 when the room can field a lineup (`harness.js:1186-1190`); the unasked greenlight is bot-dormant (§18, `BIBLE.md:9155-9161`).

**Arc.** `mandates[]` with met/lapsed; `objectiveHistory` entries nobody reads; the exec's "You asked for this one — that is the part I will remember either way" (`186`) is never remembered by any later line.

**Event.** The grant letter (high), the generational directive (urgent, a genuine "the wave turned" moment), the lapse. The pitch itself is a modal → toast: "asked two questions about money and one about the room, and signed" is narrated, not played. The met mandate has no letter — the debut that honored a greenlight gets the same debut letter as any other.

**Flavor.** All singles (grant, lapse, room pressure, gen directive, the three denials).

**Teeth.** The greenlight is required to form a group (`proposeGroup` gates on it) so it cannot be skipped; a lapse costs standing; a doctrine "no" closes the calendar for a year.

**Grades.** Reads 2 · Decisions 2 · Arc 1 · Event 1 · Flavor 1 · Teeth 2. **Total 9.**

**Gap.** The boardroom is a door you knock on and a window you watch — the pitch is never a room with the exec in it, and keeping the greenlight is the one promise in the game nobody acknowledges.

---

## Card 8 · The board and succession (board season, the pet project, the founder's board, the new chair)

**Modules.** `staff.js:70-91,96-190`, `tenure.js:58-66,71-104,107-138,142-165`, `views_industry.js:95-98` (the founder's board on the company card), `constants.js:2929-2934, 1599-1608` (BUILDING, TIME.EXEC/BOARD).

**Lifespan.** Start: the first board season at week 46 of year 1 (`staff.js:70-80`). Middle: yearly — one slide, three answers; the pet project once per exec (`83-90`, a solo inside the year); trust drift monthly above 75 with one letter per era (`tenure.js:58-66`). Founded houses seat three named directors who speak exactly twice per founding — the runway memo and the confidence letter (`107-138`, flags `burnNoted/proudNoted`). End: succession at 5–7 years (non-founded only, `71-104`): farewell (tone reads trust), the new chair's intro, trust snapped toward 55 × 0.35 carry, a first-meeting scene (`142-165`).

**Reads.** The board-season body: release count and, if founded, three names with roles (`staff.js:98-109`). The founder's board on the company card (`views_industry.js:95-98`). `growthPromise` on the promises list. Non-founded boards have no names, no seats, no read at all; the exec's tenure is not displayed; `boardSeasonsFaced` is a census counter.

**Decisions.** boardSeason: own the slow build (+1) / promise growth (a one-year claim) / point at the artists (**no effect**, `staff.js:128`). petProject: take it on (claim) / push back (−2). newChair: receipts (+3) / clean page (+1). All reactive; cadence 0.85, 0.32, 0.07 per org-year. Bot: build, accept, receipts-if-anyone-debuted (`harness.js:1378-1382`).

**Arc.** `execGen` changes taste; the pet project is "banked permanently" as +4 trust and one letter; the growth claim reads back a year later; the three founder-board names never age, vote, change opinion, or speak a third time. The board has no memory of the player beyond trust.

**Event.** Succession is an event (two critical letters, a scene, a new voice-that-is-the-same-voice) — once or twice in 13 years. The pet project's payoff ("stopped being an executive for exactly one chorus", `staff.js:181`) is the warmest exec line in the slice, once per career. Board season is a yearly card with no ceremony: no read-back of the year, no directors with questions, no vote.

**Flavor.** Farewell two variants by trust (`tenure.js:97-98`); everything else single. Six intros are the whole per-person voice (`data.js:46-59`).

**Teeth.** Growth missed −3; pet missed −3; board skipped −1; first meeting skipped −2; drift −1/4wk. Nothing structural: the board cannot cut the budget, veto a lineup, or remove the player.

**Grades.** Reads 1 · Decisions 2 · Arc 1 · Event 2 (succession and the pet payoff earn it; board season does not) · Flavor 1 · Teeth 2. **Total 9.**

**Gap.** The people upstairs are a trust number and, when founded, three names that speak twice — in 13 years no director ever has a question, a favorite, a grudge or a vote.

---

## Card 9 · The red weeks and the last statement

**Modules.** `estate.js:25-134,137-325,610-661`, `sim.js:244-250,356-358,640-644`, `finance.js:94-100` (the deck on credit), `views_desk.js:43-54,489-511`, `views_industry.js:508-586` (the epilogue), `constants.js:2627-2656` (RED).

**Lifespan.** Start: the first month the account cannot cover payroll + practice rooms + commute → arrears, the memo (`estate.js:58-60`). Middle: the ladder — staff meeting at 4 (every file takes `unpaid`, morale −1/week), creditors' letters at 8 (`unpaid` again, poach ×3, the chairs take calls — `hires.js:508-513`), the FINAL NOTICE at 10 with the date, critical, on the calendar strip (`sim.js:640-644`). Every won pays the arrears first (`estate.js:80-83`); a clean week cools the count by one. The honest moves: release, disband, pitch on credit, sell the shelf (`610-636`). End: at 12 the **last statement** scene (one option; the silence reads it at the week's end, `sim.js:356-358`) → `dissolveLabel` scatters everyone through the exits that exist, retires the acts onto the estate's shelf, names where each chair went, writes the obituary in three voices (`168-325`) → the epilogue page as an accounting → the doors (card 10). The dead label's shelf keeps charting against you (`639-661`).

**Reads.** Today: rung word, N of 12, arrears, the dated notice, a chip for the current bite (`views_desk.js:43-54`). The record: career totals (red weeks, longest run, paid down), the moves left, the sell-the-shelf button with its price (`489-511`). The epilogue: what you built, where they went, the chairs by name and destination, the four doors with reasons in words (`views_industry.js:540-583`).

**Decisions.** Four proactive honest moves named on the card, then one reading. Bot: releases the weakest monthly from the staff meeting, sells the shelf at the creditors' letters, pitches (`harness.js:846-859`). Standard play never dies (0/40; `BIBLE.md:6069-6073`), the neglected label does (longhaul E5).

**Arc.** `red.total/peak/paid/episodes` survive chapters and foundings (`estate.js:293`, `founding.js:210-211`); `unpaid` grudges on every file; the scar `{count}`; `estate.folded` as world memory; `burned` and the kept covenants survive the company (`288-290`).

**Event.** The one true ceremony in the slice: a ladder the player reads rung by rung, a date on the calendar, a page that reads itself if unread, an obituary, an epilogue as an accounting ("NOT a fail screen"), and doors gated on what the career earned. This is the §95 shape applied to money.

**Flavor.** Every rung is one template (`estate.js:54-72`); redCleared single; obituary singles; shelfRun single; the epilogue quote is fixed. A player who dies twice reads the identical page.

**Teeth.** The company dies, the roster and budget go to zero on the far side, the shelf goes to the distributor, the chairs scatter. The strongest teeth in the game.

**Grades.** Reads 3 · Decisions 3 · Arc 3 · Event 3 · Flavor 1 · Teeth 3. **Total 16.**

**Gap.** Only repetition: the second death reads word-for-word like the first (every rung and the obituary are single templates), and the ladder never names a creditor as a person.

---

## Card 10 · The founding and the chapters after (the doors)

**Modules.** `founding.js`, `estate.js:330-605` (doors, nextChapter), `newgame.js:104-117,351-392` (the four opening doors), `views_desk.js:221-243` (the door card), `views_industry.js:456-586` (new career, epilogue), `app.js:323-339,1166-1183`, `constants.js:2639-2651, 2661-2673`.

**Lifespan.** Start: the door card appears once the career could plausibly open it (trust 70, two years, a trophy or a #1, a debuted act — `founding.js:36-46`), locked with honest reasons. Middle: a typed name, two taps (`app.js:1169-1174`) → the company you built becomes a named rival with `founderGrudge` and your acts as its acts (`79-111`); every person keeps a file with a `stayed` chapter and a warm or cold history line (`116-136`); a war chest that is the career liquidated (`17-32`); a new exec, 55 trust, 18 months; the founder's board seats itself the next week (`tenure.js:107-123`). After dissolution: four doors read from the career — salaried (a charted act or hardware), investor (a kept covenant, never burned), protégé (a specific person with a specific undecayed bond, `estate.js:330-349`), blank (always) — and `nextChapter` rebuilds the company in the same world with the door's own machinery (`441-605`). End: the next chapter is the same game; `state.career` records `{week, from, door, to}` and is rendered nowhere.

**Reads.** The door card with the war-chest arithmetic and the first lock reason (`views_desk.js:227-242`); the epilogue's doors with chips, quotes, copy and the locked reason in words (`views_industry.js:512-582`); afterward only the company blurb (one static sentence) and the founder's three names on the company card. The scar, the chapters, the obituary of the old house — none readable later.

**Decisions.** Proactive founding (irreversible, name typed); reactive door choice at the epilogue (name typed except salaried). The bot never founds (no `foundLabel` in `harness.js`; the longhaul's founder scenario does, `audit_longhaul.js:446`); the bot takes the first open door (`harness.js:838-841`).

**Arc.** Deep at the moment: the legacy house hunts you (risefall's machinery), the people remember whether they liked you, the protégé door is the relationship engine paying off; the salaried door inherits a situation (an aging act with two records, `383-439`). Invisible afterward — no "founded Y4, from HCG" anywhere, no anniversary of the founding, the founder's board never convenes.

**Event.** Three letters and two feed voices at the founding (`258-263`); one critical letter per door; the protégé's "She made the call. X said yes." in the epilogue. Once each. Nothing marks the legacy house's first comeback against you as *that* comeback; nothing marks the investor's first Monday.

**Flavor.** Singles throughout (letters, blurbs, door copy); the chapter-door letter has four variants by door.

**Teeth.** Everything stays behind; 18 months on a stranger's trust; the investor's hand from day one; the blank page's reputation 25 and a seed round "that remembers the last one". Irreversible.

**Grades.** Reads 2 · Decisions 2 · Arc 2 (deep when it happens, unreadable after) · Event 2 · Flavor 1 · Teeth 3. **Total 12.**

**Gap.** The founding and the second chances are the two biggest moments a career can have and the game forgets them the following week — there is no page that remembers which chapter this is.

---

## Card 11 · The content desk (the company account)

**Modules.** `contentdesk.js`, `views_desk.js:293-366`, `app.js:380-388`, `constants.js:2098-2116` (CONTENT).

**Lifespan.** Start: the first open topic (a cover, a signing-day photo). Middle: one upload a week from a menu of ≤14 topics, each gated on something true in the building (`contentdesk.js:37-171`), cost 0–2 → views by whoever is in the frame (`199-205`) → a 5% hit (`206-223`) → the ad meter banks capped views and converts quarterly at a flat rate (`257-288`). End: none — the archive is a list capped at 60 (`238-240`) and the ad check is silent after the first.

**Reads.** A dashboard: uploads, lifetime views, hits, the ad meter with its rate, open topics with blurbs, locked topics with reasons on request, the last 8 of the archive, the member channels (`views_desk.js:299-364`). Honest and complete. The archive's weight in the financing read (`finance.js:51-52`, 15%) is not stated on the tab.

**Decisions.** One verb (`content-post`), one choice (which open topic). Bot posts every other week when calm (`harness.js:1152-1155`). Nothing to decide after the upload.

**Arc.** `contentLedger`, `contentCatalog`, `adViews`; a hit spikes hype and followers. No channel identity (no subscriber count that grows, no series, no "the account's voice"), no editor as a person, no topic that becomes the label's thing.

**Event.** `contentHit` (high) and `adFirstCheck` (once). Everything else is a toast with a number (`app.js:384-386`) — a dial with a lottery attached.

**Flavor.** Each topic's title-card sentence is one good line composed with names (`contentdesk.js:46,54,63,74,…`); the lock reasons are good prose; the hit letter is single.

**Teeth.** Cost 1–2, one a week; ignoring the desk forfeits lunch money and 15% of the financing read. Negligible.

**Grades.** Reads 2 · Decisions 1 · Arc 1 · Event 1 · Flavor 2 · Teeth 1. **Total 8.**

**Gap.** The account is a menu, not a channel — after a hundred uploads it has no audience the player can read, no series, no editor, and no week where what it posts matters.

---

## Card 12 · The booking pile and the campaign (the ground game)

**Modules.** `bookings.js`, `fame.js` (the wall the campaign pierces), `views_desk.js:124-144,185-215`, `sim.js:633-636`, `app.js:354-365`, `constants.js:2366-2395` (BOOK).

**Lifespan.** Start: the pile deals when fame is under the bands (`71-107`; dries up above .62 — the inheritance door never sees it, `harness.js` note at BANDS). Middle: offers land 1–3 weeks out with a 2-week fuse (kind × town × season grammar, `37-53`); send a group (+ a flyer week for the theater/club) → the stage plays with the light stage read (`147-227`): fee, fans, fatigue, liveExp, the 2.2% phone-camera lottery that ignores fame by design; a locked release is a campaign of weekly pushes with diminishing momentum and decay (`246-300`). End: the shows return the call once (`325-336`, a letter the once-closed label earns), the pile dries up, the campaign resolves into the release's reception (`fame.js:95-131`).

**Reads.** Each offer as a card: venue, date, fee/cost, answer-by, the flyer hint (`views_desk.js:130-143`); taken stages on the calendar strip; the campaign card with the momentum *word*, pushes worked, fit stars (`190-214`); the gig letter at 45%, flavor priority (`188-190`) — trimmed in loud weeks; first-booking and viral lines in the group's history. `bookingLedger.byRung` never shown.

**Decisions.** take-booking (which group, flyer or not), campaign-push (five kinds, one a week, fit-rated by the marketing seat). Proactive and reactive; the bot takes the first offer when rested and street-teams every week (`harness.js:915-928`). Choosing is the game, as the owner asked (§76 D).

**Arc.** Fandom, pop, liveExp per gig; momentum spent at release; `showsOpen` once. No venue memory — the hotel ballroom that asked for a photo for the wall never asks back; towns are a 12-name pool with no promoter and no relationship; `byRung` counts a story nobody reads.

**Event.** The viral clip letter and the breakthrough are the events; the gig itself is "a line in the feed at best" by design (`185-190`). `showsOpen` is a once-per-career line that lands.

**Flavor.** The venue grammar is a family by construction; gigLine is 3×3 by quality (`228-242`); viral and shows-open single.

**Teeth.** Fatigue per stage and per flyer week; theater rental up front; momentum decays when idle; under the wall it is the only full-rate marketing.

**Grades.** Reads 2 · Decisions 2 · Arc 1 · Event 2 · Flavor 2 · Teeth 2. **Total 11.**

**Gap.** Forty small stages leave no map — no town that knows them, no promoter who calls first, no "the circuit" that the label is a name on.

---

## Card 13 · The year's calendar (the year's shape, the release war, the holidays)

**Modules.** `year.js`, `calendar.js`, `sim.js:616-646` (`KP.upcoming`), `views_desk.js:469-483` (the strip), `constants.js:2577-2588` (SEASON), `BUILDING.boardWeek` 46, `MERCH.greetingsWoy` 44, awards 44/47 (awards.js, adjacent).

**Lifespan.** Start: January's dead-zone note (`year.js:39-43`, flavor). Middle: graduation gowns in week 6; the summer race note (`69-73`); rival comebacks announced ahead (`calendar.js:59-76`), the ambush onto a locked date with hold/slip (`89-124`, `129-163`), head-to-head weeks judged (`169-238`); the gayo invitation at 46 by popularity, period, and the stage at 48 with a stage read and a friendship collab (`76-118`). End: the year ends in a pile — weeks 44–48 hold Season's Greetings, award nominations, board season, the gayo invite, the awards, the gayo stage and the Q4 close, against an inbox law of five.

**Reads.** The strip: next showcase, the season finale, debuts/comebacks with clash marks, rival comebacks, booked stages, the exec deadline, the final notice — five at a time (`sim.js:645`). The topbar week label. No year-at-a-glance: the tentpoles above are not on any page until they fire.

**Decisions.** clash-hold / clash-slip (from the Studio, `app.js:768-775`); the greetings table; the gayo is invitation-only; January and summer are weather with a reception modifier (`year.js:18-30`).

**Arc.** Feuds per rival act (`calendar.js:194-216`) → rivalry narrative; `gayoYear`. The year itself leaves no record — no year-in-review, no annual letter.

**Event.** The gayo stage is a judged stage with a collab (a December moment); the ambush is an urgent letter with a decision; battle win/loss letters with a nerve line.

**Flavor.** `comebackAnnounce` is a 5-line `lineFor` family (`calendar.js:69-75`) — and the loudest single ind in the slice (30.2 emitted/org-year, `noind_8.txt:363`); gayo invite 3-family; the rest single.

**Teeth.** −3 in January, +4 for bright in summer; the slip costs money and morale; a lost battle costs pop; the Q4 pile-up trims the year's own climax.

**Grades.** Reads 2 · Decisions 1 · Arc 1 · Event 2 · Flavor 2 · Teeth 2. **Total 10.**

**Gap.** The year has a shape the engine knows and the player cannot see — no calendar page, no annual letter, and its busiest five weeks fight each other for the inbox.

---

## Card 14 · The company's own identity and history

**Modules.** `fame.js:30-78` (fameRead, fameWord), `views_industry.js:83-99` (the company card), `mirror.js` + `views_desk.js:376-378`, `debut.js:981-985` (reputation drift), `career.js:24-31` (objectiveHistory), `life.js:267-291` (the *group* anniversary — the precedent), `estate.js:302-306` (the blurb overwritten at death), `newgame.js` (the name, the blurb, the city).

**Lifespan.** Start: a name, a reputation line, a home city with a trade (`newgame.js:383-391`). Middle: reputation drifts with results (`debut.js:981-985`); fame is derived fresh from durable facts every call (`fame.js:30-67`); the breakthrough moves the wall for good (`156-172`); the mirror forms a read of the boss (`mirror.js:42-47`); the power ranking ranks the house yearly (risefall, `views_industry.js:101-114`). End: the blurb is rewritten at founding and at death; nothing else remembers.

**Reads.** The company card: name, rep headline, the static blurb, rep chips in words, the fame word, the shows-closed note, the founder's board (`views_industry.js:83-99`). The mirror. Not rendered anywhere: founding week, years under this manager (the player's title is 'A&R Manager' forever, `newgame.js:27`), `objectiveHistory`, `boardSeasonsFaced`, `books.closed`, `state.career`, `estate.folded`, `state.scar`, `executive.since`, the first trophy, the first #1 (the engine stamps `firstShowWinWeek`, `estate.js:299`). Groups get an anniversary week with a 3-line family and a retold story (`life.js:267-291`); the company and the player's own tenure get none.

**Decisions.** None — the name once, the city once.

**Arc.** Real in numbers, unreadable as a story.

**Event.** The breakthrough letter ("Who is X?", `fame.js:167-171`) and `showsOpen` — two moments a small label gets once. No tenth-anniversary, no "ten years under you", no year-end letter from the company to itself.

**Flavor.** fameWord six bands (`fame.js:71-78`), rep words, the mirror's category sentences.

**Teeth.** Fame gates the pile, the wall, the shows, the candidates, the holdouts — the most load-bearing truth in the slice, read only through other systems.

**Grades.** Reads 1 · Decisions 0 · Arc 1 · Event 1 · Flavor 2 · Teeth 2. **Total 7.**

**Gap.** Thirteen years of a company produce no page a human can read back — not the founding date, not the chapters, not the first trophy, not the years this manager has sat in the chair.

---

# 1. Ranking — thinnest → deepest (total of six grades, /18)

| # | System | R | D | A | E | F | T | Total |
|---|---|---|---|---|---|---|---|---|
| 1 | The company's identity & history (card 14) | 1 | 0 | 1 | 1 | 2 | 2 | **7** |
| 2 | The content desk (11) | 2 | 1 | 1 | 1 | 2 | 1 | **8** |
| 3 | The Monday meeting & the exec's trust (2) | 2 | 2 | 1 | 1 | 1 | 2 | **9** |
| 4 | The staff seats & the interview (6) | 2 | 2 | 1 | 1 | 2 | 1 | **9** |
| 5 | The board & succession (8) | 1 | 2 | 1 | 2 | 1 | 2 | **9** |
| 6 | The mandate (7) | 2 | 2 | 1 | 1 | 1 | 2 | **9** |
| 7 | Fandom commerce (5) | 1 | 2 | 2 | 2 | 1 | 2 | **10** |
| 8 | The year's calendar (13) | 2 | 1 | 1 | 2 | 2 | 2 | **10** |
| 9 | The booking pile & the campaign (12) | 2 | 2 | 1 | 2 | 2 | 2 | **11** |
| 10 | The quarterly books, the settlement & the distributor (3) | 2 | 2 | 2 | 2 | 2 | 2 | **12** |
| 11 | The financing round (4) | 2 | 2 | 2 | 2 | 1 | 3 | **12** |
| 12 | The founding & the chapters after (10) | 2 | 2 | 2 | 2 | 1 | 3 | **12** |
| 13 | The week & the Desk / Today (1) | 3 | 3 | 1 | 2 | 2 | 2 | **13** |
| 14 | The red weeks & the last statement (9) | 3 | 3 | 3 | 3 | 1 | 3 | **16** |

Ties at 9 ordered by the brief's special-attention items (a) the exec/board as people and (b) the staff as people. Honest note on what is already deep: §86 (card 9) is the slice's one system at the v0.11.4 bar on reads, decisions and event; §80/§85 (cards 3–4) are substantial on arc and teeth and thin on the moment. The weakest column across the whole slice is **Flavor** — eleven of fourteen systems are single templates where the season got families — and the second weakest is **Arc as something readable**.

# 2. The top three transactions that should be events

1. **The quarterly close** (`money.js:249-269`; card 3). Plan → twelve weeks → one letter and a card. The running quarter is invisible (`b.cur` never rendered), nothing is decided at the close, the exec's reaction is a tail clause, and the fund's toll lands the same week without a word. Four times a year for 13 years — 52 identical letters.
2. **The hire's year** (`hires.js:267-330, 461-501`; card 6). Post → interview → "the only interview that counts: the next year" → nothing: no review, no word from the chair about her own room, no credit on the era she coached, no tier-rise letter (pruned §89 C), no departure of her own. Four interviews a year, each a door into silence.
3. **The greenlight honored, and the board's year** (`mandate.js:88-102`, `staff.js:96-135`; cards 7–8). The pitch is a modal → toast; the debut that keeps the greenlight is consumed with no letter at all; board season is a one-line slide with an answer the directors never follow up except as a one-year growth claim. The company's biggest asks upstairs resolve as plan → window → silent result.

(Runners-up: the fanclub's yearly renewal, `commerce.js:219-228`, "a books line, not a letter"; the financing round between the deck and the sheet, where the fund has no face.)

# 3. Hidden truths shown as raw numbers · verbs with no consequence

**Hidden truths as numbers — none found in this slice.** The law holds: trust is a word (`views_desk.js:38,595-597`), fame a word (`fame.js:71-78`), the staff multiplier and truth never print (`hires.js:183-225`), the finance read is five clauses (`finance.js:58-65`), momentum a word (`bookings.js:255-260`), exec taste is revealed as a *name* by the taste note (`staff.js:64-65`). Two numbers that are rules rather than truths and could be words: the ad meter's rate "pays 1 per 10,000" (`views_desk.js:304-307`) and the recoup "N on the ledger" (`464`) — both are the company's own books, so legal under the law.

**Player verbs with no consequence (beyond the convoLog line):**
- `boardSeason` → "Point at the artists" (`staff.js:128`): toast only — no trust, no claim, no record, while the other two answers cost or bind.
- `execQuestion` secondGroup → "When the room is ready" (`meeting.js:142`): toast only, and the question never returns (`secondGroupAsked`).
- `distributorCall` → "Stay where we are known" (`money.js:191-193`): toast only, and because nothing records the refusal the courting call **re-opens the next week with a high-priority letter** (`money.js:239-247`) for as long as the chodong bar holds — a weekly nag, not a decision. (Also structurally unreachable on the inheritance door: `money.js:131-134` seeds tier 2 at fame ≥ .60; `scenes_seen.txt` has no `distributorCall`.)
- `redInk` left to expire (`money.js:314-318`): silence is free where both answers cost something — the cheapest answer to the hard conversation is not having it.
- `seat-release` (`hires.js:81-105`): the room feels nothing — no morale on the trainees the coach trained, no later word from the person, no alumni record; the chair is `delete`d. The firing has a price tag and no story.
- `theInterview` → "Pass" (`hires.js:303-306`): the candidate never resurfaces, never holds it against the label, never signs with a rival you then watch — the market has no memory of being turned down.
- `newChair` (`tenure.js:149-158`): both options reward (+3 / +1); only silence costs — a choice with no wrong answer.
- `content-post` (`contentdesk.js:182-246`): a view count, +1 morale for the face, lunch money quarterly — a dial whose consequence rounds to zero.

# 4. Sketches for the three thinnest systems (house style; shapes only, no numbers)

**A. The company's identity and history — "The file" (card 14).** Give the company what every person already has: a history and a chapter list. Mechanism: one durable `state.company.history[]` written by the rails that already fire (the first debut, the first trophy — `firstShowWinWeek` exists —, the first #1, the breakthrough, each settlement, each founding/door, each succession, each red episode, each board season's answer), bounded like a person's file, read on a new Desk sub-tab "The company" beside The record: founding week and city, years under this manager (the title that finally changes — "A&R Manager" → "the one who built X" by the mirror's own category machinery), the chapters (`state.career`, `estate.folded`) with the obituary line, the exec's tenure and taste once discovered. The ceremony it earns: the **company anniversary** on the founding week (reuse `life.js:267-291` — a `lineFor` family, the timeline retelling a live narrative, +morale), critical on the fifth and tenth with the exec's own line, and a **year-end letter** at week 48 from the company to itself (reuse the statement machinery of `estate.js:137-165` as the yearly accounting: releases, people carried, the one sentence the board said). Doors: none needed; the page is the depth. Teeth: the anniversary's letter names what the fandom retold — a warm house and a cold one read different pages.

**B. The content desk — "The channel" (card 11).** Turn the dial into a loop with a public: the account gets subscribers derived from the archive the way `fameRead` derives fame (no stored meter), shown as a band word ("a channel nobody follows" → "a channel with a Thursday"); a **series** verb — pin a topic as the weekly show (dorm vlog Thursdays, the practice-room cover) — that compounds views while the gate stays true and *breaks* (a letter) the week it cannot be filmed; the editor becomes a chair the hires rail already knows how to mint (`mintCandidate`), with a voice in the staff-note family and a mesh with the roster (a drillmaster's editor cuts practice film; a nurturer's cuts the fridge). Doors: a fan's edit outruns the official cut (the resurfaced-clip machinery) — claim it or let it ride; the platform's year-end **channel awards** at week 47 reusing the gayo invite's shape (by subscribers, period) with a `lineFor` family. Letters: one a quarter on the ad settlement that *names the upload that earned it*, high only when it crossed a band. Teeth: a series dropped for a month loses the Thursday; a hit on the series is bigger than a hit on a one-off.

**C. The Monday meeting and the exec — "The person upstairs" (cards 2 & 8).** Make the exec a person the way the staff are: her `personality` (already on `data.js`) becomes a discoverable taste the way `execTaste` is — but revealed in *words* through the questions she asks (the profitHunter asks about the quarter, the traditionalist about the vocal room, the micromanager about a specific trainee by name from the eval board, the trendChaser about the sound of the year) — so the meeting rotates through a family per personality instead of one question type; each question is an `execQuestion` scene as now, answers are claims as now. Add the **annual review** at board week as a real scene: her read of the year in her voice (reusing the statement machinery and `lineFor` families keyed on trust band and taste match), one question with a receipt, and a trust band that *gates something visible* — at "thin", the board seat halves the cadence the way a fund's does; at "gone", probation: the next directive is critical with a date and the chapter doors (`estate.js:441-605`, salaried) are the exit, so the slice finally has the firing §86 E3 deferred. Memory: the exec's own small ledger of what the player did to *her* (promises kept/broken already exist as claims; add `directed`-style entries for the pitch she granted and the greenlight honored, which today is silent) read as a sentence on her card. Succession then has something to transfer — the record — and the new chair's "the benefit of the doubt" becomes a read, not a number.
