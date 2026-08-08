# K-Pop Agency Manager — Design & Implementation Brief

*The owner's founding document (extracted from KPop_Agency_Manager_Design_Brief4.docx).*

Game Design & Implementation Brief
Mobile-first management simulation • Working document for Claude Code / Fable
THE FANTASY: Find raw talent, develop people, assemble groups, survive executive demands, and build the next generation-defining act—without ever reducing the cast to an Overall rating.
Design target: a deep simulation wearing the clothes of K-pop—not a generic dashboard with pink gradients.


## 1. Executive Summary
K-Pop Agency Manager is a mobile-first career management simulation about working inside a fictional Korean entertainment company. The player is not an omnipotent owner and is not role-playing as an idol. The player is a talent-side professional—initially an A&R / trainee-development manager—who receives goals from executives above them and must deliver results with imperfect information.
The core loop is scouting → signing → training → evaluating → assembling → debuting → promoting → adapting. The heart of the game is uncertainty. A technically brilliant trainee may never connect with the public. A raw prospect may become magnetic after two years of performance experience. A group that looks perfect on paper may never develop chemistry. The player is asked to make judgment calls, not solve a spreadsheet.
Design mantra: SIMULATE THE PROFESSION. RESPECT THE PERSON. LET THE STORIES EMERGE.
Non-negotiables
Mobile first. Portrait orientation is the default design target; tablet support is welcome. PC can come later if the game proves itself.
No visible Overall rating.
Core talent is communicated primarily through concise evaluator blurbs, not baseball-style numeric scouting grades.
Five foundational talents: Vocals, Rap, Dance, Visuals, Charisma.
Derived qualities emerge through training, performing, experience, personality and relationships; the player does not directly buy 'Stage Presence +1.'
The player has a boss. Executives create pressure, constraints and objectives.
Companies develop recognizable signatures organically through their history.
The world continues around the player: rival companies scout, sign, train, debut and compete.
No dating-sim mechanics and no voyeuristic body simulation. Relationships may exist as private life states only when they affect work, morale or chemistry.
The UI must have identity. It should feel like a K-pop entertainment workplace and music product, not 'AI-coded management game #34.'
Market note
There are already K-pop/idol management games in the market, including K-pop Idol Stories: Road to Debut, KPOP Story: Idol Manager, and newer mobile/indie projects. That means the opportunity is not 'nobody has ever touched this subject.' The opportunity is a deeper, systems-first, career/A&R simulation with procedural talent, imperfect scouting, executive pressure, rival agencies, and long-term emergent history. Do not copy existing titles; use this distinction as the product identity.

## 2. Product Pillars
Pillar
Meaning
People, not ratings
Players infer talent and personality from reports, behavior and results.
Career, not omnipotence
The player answers to executives, earns trust, gets promoted, can be reassigned or fired.
Groups are assembled
The best five individuals are not automatically the best group.
Development is uncertain
Potential is a range shaped by hidden archetypes, environment, work ethic, coaching and opportunity.
Public reaction is emergent
Fans may choose a star the company did not intend to push.
Every company has a fingerprint
AI agencies develop reputations, strengths, habits and strategic preferences.
Mobile without being shallow
Short interaction loops and clean navigation; deep simulation underneath.
Stylish, not sterile
Editorial K-pop visual language, motion, album-era identity, photography placeholders, strong typography.

## 3. Player Role & Career Structure
The player should begin with meaningful authority but not total authority. A good starting title is Talent Development Manager or A&R Manager. They can recommend signings, allocate training, evaluate trainees and propose group lineups. Larger decisions require executive approval until the player earns more influence.
Career ladder
Junior A&R / Scout — evaluates prospects and makes recommendations.
A&R Manager — manages a trainee pool and development plans.
Senior A&R / Talent Director — controls signing budgets and group proposals.
Creative / Executive Producer — greater authority over concepts, releases and promotions.
Division Head / Label President — late-game authority, but still accountable to ownership/board objectives.
Promotion should not merely unlock bigger numbers. It changes the kind of problems the player solves. Early game is individual talent judgment; midgame is roster construction and group launches; late game is portfolio strategy, succession, staff, budgets and company identity.
Executive objectives
“We need a girl group ready by Q3 next year.”
“Japan is our priority market for the next two years.”
“The board wants a boy group after three successful girl groups.”
“This trainee has already cost us too much. Either use her or cut her.”
“Our last two releases underperformed. I want a safer concept.”
“We are known for vocals. Do not dilute the brand.”
Executives should have personalities: visionary, patient developer, trend chaser, profit hunter, traditionalist, micromanager, international expansionist, star-chaser. The player earns or loses trust based on outcomes and whether they repeatedly ignore directives.

## 4. Talent Model
Every trainee has five foundational talent domains. Internally, the simulation may use numbers for calculations, but the player-facing presentation should favor descriptive blurbs and broad confidence language. Do not show a single Overall score.
Foundation
Definition
Typical downstream effects
Vocals
Pitch, tone, control, stability, range and studio/live singing aptitude.
Recording quality, live stability, line suitability, difficult vocal parts.
Rap
Rhythm, flow, diction, delivery and stylistic confidence.
Rap parts, concept flexibility, live delivery.
Dance
Technique, timing, precision, body control and choreography learning.
Synchronization, choreography difficulty, live performance quality.
Visuals
Broad public/industry visual appeal and camera suitability.
Initial attention, image campaigns, endorsements, center viability. No body measurements.
Charisma
Ability to attract and hold attention; the 'it' factor.
Stage magnetism, fan conversion, viral potential, center viability, public recognition.
Evaluator blurbs
“This kid is a natural vocalist. Just don’t ask her to dance.”
Reports should be concise, colorful and occasionally brutally honest. They should sound like professionals talking to another professional, not tooltips generated from thresholds.
Vocals: “Big voice, good instincts. Technique is still raw.”
Dance: “Learns choreography frighteningly fast.”
Dance: “Works hard. The feet remain unconvinced.”
Rap: “Capable when needed. I would not build the concept around it.”
Visuals: “Marketing asked who she was before the evaluation ended.”
Charisma: “I cannot explain it. Everyone in the room kept watching her.”
Overall recommendation: “Debut her before someone else does.”

## 5. Hidden Development Engine
Reuse the philosophy of the existing BBGMC talent engine, not its baseball vocabulary. Each foundational talent has current ability, hidden developmental capacity, uncertainty, growth rate, age effects, training response and modifiers. Potential should behave like a cone/range rather than a fixed destiny.
Key hidden variables
Natural aptitude by talent domain.
Development ceiling range / potential cone.
Growth rate.
Work ethic.
Coachability.
Confidence.
Professionalism.
Adaptability.
Emotional resilience / stress tolerance.
Creativity / musical curiosity.
Competitiveness.
Leadership tendency.
Social compatibility tendencies.
Hidden archetype(s): natural vocalist, performance ace, center candidate, late bloomer, workhorse, producer-minded, variety natural, etc.
The exact formulas should remain implementation details. Fable may ad-lib reasonable first-pass weights, but all weights must live in centralized configuration/constants rather than being scattered through UI code.
Development rules
Training improves foundational skills, but gains are non-linear and individual.
Young trainees usually have wider uncertainty cones.
Repeated real performance can unlock qualities training rooms cannot.
Growth can stall, accelerate, reopen or redirect.
A trainee can improve technically without becoming more charismatic.
A trainee can become a much better performer without large raw-skill gains because confidence and experience changed.
Coaching quality and fit matter.
Overtraining creates diminishing returns and fatigue/burnout risk.

## 6. Emergent / Derived Qualities
These are not purchased as direct upgrades. They emerge from foundational talent plus personality, training context and experience. Some can be described in staff reports once sufficiently observed.
Derived quality
Emerges from
Stage Presence
Charisma + Dance + Confidence + live experience + concept fit.
Leadership
Personality + professionalism + experience + relationship standing.
Variety / Media Skill
Charisma + humor + confidence + interview/TV experience.
Communication Confidence
Language skill + confidence + repeated overseas/media exposure.
Songwriting / Production
Creativity + musical aptitude + practice + mentorship.
Center Suitability
Charisma + visuals + stage presence + concept fit + public response.
Live Reliability
Vocals/rap/dance foundations + professionalism + stamina + experience.
Important: the company can assign a center, but the public may effectively choose another member. A designated center who repeatedly loses audience attention to a bandmate creates a real management decision rather than a scripted failure.

## 7. Personality, Relationships & Group Chemistry
Groups should be built from people who have to coexist for years. Chemistry is not a single visible number. It is an emergent result of personalities, history, trust, competition, leadership and workload.
Relationship states
Close friends / trusted partners.
Friendly.
Professional / neutral.
Competitive but productive.
Tense.
Open conflict (rare).
Mentor / mentee.
Supportive teammate / confidence anchor.
Relationship changes should be communicated through observations: “These two bring out the best in each other,” or “They remain professional, but there is very little warmth between them.” Avoid gamified romance systems.
Private relationships
Dating may exist only as a life-state/event when relevant. The player may learn that a character is in a relationship, but does not select partners, inspect private details, or participate in romance. Possible effects are modest: mood, schedule pressure, public-relations risk if disclosed, or group chemistry if the person is distracted. The game treats it as part of adult life, not content.

## 8. Scouting & Recruiting
Scouting is one of the primary strategic games. Rival agencies compete for prospects. Every prospect card should show known competing interest when available, creating urgency and signaling market perception.
Prospect sources
Dance academies and competitions.
Vocal academies / singing contests.
Street casting.
Social media discovery.
School / university performances.
Open auditions.
International scouting trips.
Referrals from coaches, producers and staff.
Imperfect information
Different evaluators see different things. A vocal coach may love a prospect whom the performance director dislikes. A senior scout may stake their reputation on a trainee whose measurable skills are ordinary. More observation improves confidence, but never produces perfect certainty.
Rare scout note: “I don’t have objective evidence for this. Don’t let another company sign her.”

## 9. Group Formation
The player proposes groups rather than simply sorting by talent. A viable lineup needs complementary strengths, compatible personalities, a coherent concept and enough differentiation that members can develop identities.
Roles
Leader — formal responsibility; ideally aligns with emergent leadership.
Center — management decision about who anchors the group’s image/performance.
Main Vocal / Lead Vocal.
Main Dancer / Lead Dancer.
Main Rapper / Lead Rapper.
Visual — optional public-facing label; underlying Visuals talent exists regardless.
Youngest member (maknae) — demographic fact, not a skill.
Roles can be formal or informal depending on company philosophy and era. The player should be allowed to keep role labels minimal. Center is especially important because it affects camera allocation, choreography emphasis, teasers and promotional opportunities.
Center system
Assign a fixed center, rotating center, or concept-by-concept center.
Center receives more exposure and pressure.
A strong fit amplifies a comeback; a poor fit can suppress another member who naturally draws more attention.
Fan/public response may force the company to reconsider.
Changing center can affect confidence, relationships and public narrative.

## 10. Concepts, Music & Comebacks
The game does not need a DAW or rhythm minigame. The management decision is choosing material, concept and allocation. Songs are generated/procedural assets with qualities such as hook strength, vocal demand, rap demand, choreography potential, trend fit, concept identity and market fit.
Concept families
Bright / youthful.
Elegant / luxury.
Futuristic / experimental.
Dark / dramatic.
Performance-heavy.
Hip-hop / swagger.
Retro.
Dreamy / ethereal.
Mature pop.
Playful / quirky.
Concept fit should be individual and group-level. A member can be technically unchanged but suddenly explode in popularity because a concept perfectly fits her presence. This is a key source of emergent stars.
Release decisions
Choose title track from available demos.
Choose concept direction.
Choose center and line emphasis.
Allocate rehearsal time between vocals, dance, rap and media preparation.
Choose promotion intensity and target markets.
Approve styling direction at a high level—not body customization.
Set comeback timing against rivals and company calendar.

## 11. Public, Fans & Media
Do not build a fake social network full of thousands of simulated thirst comments. Summarize public reaction through a Community/PR report. The player needs consequences and narrative signals, not internet sludge.
A fancam or performance clip goes viral.
A member unexpectedly dominates teaser engagement.
A song catches on internationally.
Fans question the center choice.
A member’s styling or hairstyle trends positively.
A live vocal moment boosts reputation.
A variety appearance creates a breakout personality.
A comeback underperforms despite strong reviews.
Ultra-rare event tone: “One performance has become the defining clip of the comeback. Marketing would like to know what we’re doing next while everyone is still paying attention.”

## 12. Company Identity & Rival Agencies
Every company begins with tendencies but develops a stronger signature through actual history. Reputations should be earned and can become self-reinforcing because certain trainees, producers and staff become more interested in companies known for their strengths.
Possible reputation
Effect
Girl Group Factory
Female trainees show greater interest; executives expect continued success; boy-group projects become a proving ground.
Vocal Powerhouse
Attracts singers and vocal coaches; public expects strong live performance.
Performance Monsters
Dance talent and choreographers gravitate toward the company.
Star Makers
Strong record of producing breakout individual celebrities.
Artist-Producer Label
Creative trainees and producers prefer the company.
Patient Developers
Longer leash for prospects; higher costs; stronger loyalty.
Trend Chasers
Fast adaptation, volatile identity.
Global Specialists
Stronger overseas networks and language infrastructure.
AI companies should have budgets, executive personalities, recruiting priorities, staff quality, roster needs and reputations. They should compete for the same prospects and release windows. They must not merely spawn finished groups from nowhere.

## 13. Workload, Health & Ethical Boundaries
The real industry can be harsh. The game should acknowledge pressure without turning exploitation into spectacle. Workload, fatigue, stress and burnout are legitimate management systems because they create meaningful tradeoffs.
Training load and promotion load accumulate fatigue.
Rest improves recovery but costs time and may frustrate executives.
Injuries and health breaks can occur.
Mental-health leave is treated as health, not scandal.
Repeatedly pushing exhausted performers may create short-term output and long-term damage.
The player can build a reputation for artist care or for burning through talent.
Explicit exclusions
No body measurements.
No weight-management minigame.
No cosmetic-surgery system.
No sexualization mechanics.
No player-controlled dating.
No invasive private-life surveillance.
No simulated harassment feed for entertainment.

## 14. Time, Calendar & Core Loop
Use a weekly strategic cadence with event-driven interruptions. Daily micromanagement would become tedious on mobile. A week is long enough for meaningful training and scheduling choices while still allowing comebacks, auditions and deadlines to feel immediate.
Monday / planning: review inbox, executive directives, health, scout updates and calendar.
Set weekly training / activities for trainees and active groups.
Resolve scouting decisions, contracts and staff recommendations.
Advance week.
Simulation resolves development, fatigue, relationships, rival activity and public events.
Receive concise reports and make exceptions/interventions.
At month/quarter boundaries: deeper reviews, budgets, executive meetings and strategy.
The game should support a satisfying 2–5 minute mobile session (check reports, make one or two decisions, advance) while also supporting longer 30-minute sessions for scouting, group construction and comeback planning.

## 15. Economy
Money matters, but this should not become Accounting Simulator. The player manages an allocated division budget and must justify major expenditures. Higher roles unlock more financial control.
Trainee contracts / signing costs.
Training and coaching costs.
Housing/support costs represented abstractly.
Music production.
Choreography.
Styling / visual production.
Marketing and promotion.
Tour / event costs.
International expansion.
Revenue can come from releases, streaming, physical sales, performances, touring, endorsements, licensing and merchandise. At lower career levels, the player sees summarized economics and budget pressure rather than full corporate books.

## 16. Mobile UI / Art Direction
ABSOLUTE RULE: Do not build a generic admin dashboard with a sidebar, four KPI cards, pastel gradients and identical rounded rectangles.
The UI should feel like a fictional K-pop label’s internal creative operating system crossed with a polished music app and editorial comeback package. It can be data-rich, but it needs rhythm, personality and visual hierarchy.
Visual language
Portrait-first, thumb-friendly navigation.
Bold editorial typography with oversized artist/group names.
Dark charcoal / near-black base with bright accent colors that can shift by company or comeback era.
Iridescent / holographic accents used sparingly for premium K-pop energy—not everywhere.
Photography/art placeholders framed like concept photos, trainee cards, album jackets and press kits.
Album/comeback pages may temporarily inherit the era’s visual identity.
Use asymmetry and editorial composition where safe; do not make every screen a grid of cards.
Micro-animations: light sweep on a new debut card, chart movement, subtle stage-light shimmer, animated equalizer accents. Keep motion quick and battery-conscious.
Charts should feel like music-industry charts, not enterprise analytics.
Icons can reference backstage passes, microphones, rehearsal rooms, albums, cameras, spotlights and ID badges.
Navigation
Tab
Purpose
Home / Desk
Inbox, current objectives, urgent decisions, next milestones.
Talent
Trainees, active idols, scouting board, evaluations.
Groups
Lineups, roles, chemistry observations, releases, schedules.
Studio
Songs/demos, concepts, comeback planning, producers.
Industry
Charts, rival companies, awards, news, market trends.
Use a bottom navigation bar with 4–5 primary destinations. Contextual actions belong inside screens or in a single floating/anchored action area. Avoid hamburger-menu dependency for core play.
Home screen vibe
The home screen is the player’s desk / internal label portal. It should feel alive: a prominent current executive objective, a horizontal upcoming-calendar strip, a compact inbox stack, one featured talent/group story, and industry headlines. Do not present six anonymous KPI tiles.
Trainee profile vibe
A trainee profile should feel like a confidential talent dossier blended with an artist profile. Large portrait/art area, name and age, evaluator confidence, recent development notes, role projections, relationship observations, training history and current schedule. Foundational talent is communicated with blurbs and perhaps restrained qualitative bands (Raw / Developing / Strong / Exceptional) if needed for usability.
Color & theming guidance
Default palette can use near-black, off-white, electric violet, hot magenta and cool cyan accents, but Fable should feel free to propose a coherent alternative. The key is contrast and editorial energy. Avoid stereotypical 'everything is bubblegum pink' treatment.

## 17. Technical Architecture Guidance for Fable
The first build should be a playable vertical slice, not a complete industry simulation. Keep simulation state cleanly separated from presentation so the same engine can later support PC.
Single source of truth for game state.
Deterministic simulation when seeded, to make debugging possible.
Centralized tuning/config files for development weights, event odds, economy values and AI behavior.
UI components consume derived view models; they should not own simulation logic.
Save schema must be versioned from day one.
Autosave at week advance plus manual save slots.
Keep generated names, traits, blurbs, companies, concepts and events in data tables rather than hardcoding them in components.
Build content generators so the game can create long histories without bespoke writing for every case.
All random events should carry prerequisites, weights, cooldowns and consequence functions.
Use responsive layouts so portrait mobile is primary but tablet/landscape can expand gracefully.
Suggested domain objects
Person / Trainee / Idol
TalentProfile
PersonalityProfile
DevelopmentProfile
Relationship
StaffMember / Evaluator
Company
Executive
Group
GroupRoleAssignment
Concept
SongDemo / Release
ScheduleBlock
ScoutingLead
Contract
Market / Region
PublicNarrative / Trend
Event
Objective
CareerProfile / PlayerStanding

## 18. Rival AI
AI companies need understandable motives. Each should periodically evaluate roster needs, budgets and strategy, then act through the same broad systems as the player.
Assess needs: trainee depth, upcoming group plans, aging groups, market goals.
Scout prospects matching needs and company signature.
Bid/sign based on perceived value, budget and urgency.
Develop trainees according to company philosophy.
Form groups when executive thresholds are met.
Choose concepts based on roster fit, market trends and company identity.
Schedule releases and promotions.
React to success/failure by adjusting strategy rather than cheating.
AI does not need perfect optimization. Distinctive mistakes are desirable. A trend-chasing company should sometimes chase the wrong trend. A vocal-first company may overlook a future charisma monster.

## 19. Event System
Events should emerge from state. Avoid random popups that could happen to anyone at any time. An event should feel like a consequence of who the person is, what the company is doing and what just happened.
Event family
Examples
Development
Breakthrough in dance; vocal plateau; confidence surge after strong stage.
Relationships
Friendship forms; productive rivalry; mentor dynamic; tension after role change.
Health
Fatigue warning; minor injury; recommended rest; health hiatus.
Executive
Deadline moved up; budget cut; forced priority; board demands new market.
Scouting
Rival interest spikes; prospect asks for decision; late discovery.
Public
Viral fancam; unexpected member breakout; poor live reception; brand inquiry.
Creative
Producer offers perfect demo; concept mismatch; choreography too demanding.
Career
Promotion offer; reassignment; executive confidence vote; firing / rival job offer.

## 20. Vertical Slice / MVP
Do not begin by building awards, world tours, survival shows and ten markets. Prove the core fantasy first.
Create fictional company, executive and player role.
Generate 20–30 prospects/trainees with hidden five-domain talent, personality and potential cones.
Build scout/evaluator blurbs.
Allow scouting, signing and rival interest.
Weekly training and fatigue.
Basic relationship/chemistry emergence.
Executive objective: assemble a 4–6 member girl group by a deadline.
Group formation with leader, center, vocal/dance/rap roles.
Choose one of several generated song demos and concepts.
Run debut preparation and resolve debut performance/reception.
Show public reaction, member breakout, executive review and company reputation movement.
Save/load.
If this slice is fun, the game works. If it is not fun, adding world tours will not save it.
MVP success test
Did the player become attached to at least one procedurally generated trainee?
Did the player have at least one difficult cut/sign decision?
Did evaluator blurbs create uncertainty without feeling random?
Did the group feel like a combination of personalities rather than five stats?
Did the debut produce a story the player wants to tell?
Did the UI make the player want to keep tapping around even before every system was deep?

## 21. Expansion Roadmap
Phase
Additions
Phase 2
Multiple groups, richer rival AI, comeback cycles, charts, endorsements, staff hiring.
Phase 3
International markets, tours, awards, producer/songwriter ecosystem, company reputation depth.
Phase 4
Career mobility, job offers, firing/re-hiring, deeper executive politics, company divisions.
Phase 5
Long-term industry history, generations, legacy groups, disbandment/renewals, PC adaptation.

## 22. Writing & Tone
The game should be smart, observant and occasionally funny. It should not parody K-pop or sneer at fans. Humor comes from blunt staff, executive absurdity, workplace tension and the gap between carefully planned strategy and unpredictable public response.
Staff can be professionally savage.
Executives can be unreasonable without becoming cartoon villains.
Fans/public are summarized with wit, not mocked as idiots.
Trainees/idols should feel like adults/young professionals with agency, not collectibles.
Avoid generic inspirational copy such as 'Reach for the stars!' on every screen.
Avoid AI-ish filler: 'Your journey begins now,' 'Unlock your potential,' 'Shape destiny' unless used sparingly and intentionally.

## 23. Direct Build Instructions for Claude Code / Fable
Build this as a mobile-first management simulation with a distinctive K-pop editorial identity.Start with the vertical slice in Section 20. Prioritize a coherent playable loop over feature count. Use fictional people, groups, companies and songs. The simulation should be procedural enough that two saves do not tell the same story.Do NOT create a generic SaaS/admin dashboard. Avoid a left sidebar, rows of KPI cards, default Tailwind-looking rounded rectangles, excessive glassmorphism, or a monochrome spreadsheet skin. This is a music-industry game. Make it feel designed.Use portrait mobile as the primary viewport. Use a bottom navigation system. The Home screen should feel like an internal entertainment-company portal / creative desk, with executive objectives, inbox items, calendar pressure and featured talent. Trainee pages should feel like confidential talent dossiers crossed with artist profiles. Group/comeback pages can be more expressive and inherit the current concept's visual identity.The core talent domains are Vocals, Rap, Dance, Visuals and Charisma. Internally they can be numeric. Do not show an Overall rating. Player-facing evaluation should primarily use concise natural-language blurbs generated from thresholds, evaluator skill, evaluator personality, observation confidence and hidden truth.Derived qualities such as Stage Presence, Leadership, Variety Skill, Center Suitability and Communication Confidence should emerge from foundational skills, personality, relationships, training and real performance experience. Do not make them direct upgrade buttons.Implement potential as uncertainty/range rather than a fixed visible ceiling. Create hidden development profiles and centralized tuning parameters so the formulas can be iterated later.The player is an employee with a boss. The executive gives objectives and constraints. Build executive trust and career standing into the state model from the start.Rival companies should compete for prospects. A prospect card should be able to display known rival interest. Rival agencies should have different philosophies and eventually develop reputations.Relationships and group chemistry matter, but do not create a dating sim. Private romantic relationships, if represented at all, are background life states and never interactive romance content.Respect the artists. No body measurements, weight systems, cosmetic surgery mechanics, sexualization systems, or simulated harassment feeds.Use short, sharp writing. Staff reports should sound like humans with opinions. Example: “Natural vocalist. Just don’t ask her to dance.” The UI should frequently communicate through these human observations rather than naked numbers.When uncertain about a secondary design detail, ad-lib in service of these principles rather than stopping. Keep the architecture modular and tuning-driven so we can revise the simulation without rewriting the UI.

## 24. First Screens to Build
New Career / Company introduction.
Home / Desk.
Talent roster.
Scouting board.
Prospect / trainee dossier.
Weekly training planner.
Executive objective screen / meeting modal.
Group builder.
Debut/comeback planner.
Debut results / public reaction.
Industry / rival overview.

## 25. Sample Opening Scenario
The player joins a mid-sized fictional agency whose last group is profitable but aging out of its peak. The company has a reputation for strong vocalists but has not launched a successful new girl group in six years. A new executive wants growth and gives the player 18 months to assemble a 4–6 member girl group.
CEO: “I don’t need five perfect trainees. I need one group people remember.”
The player inherits six trainees, receives scouting reports on several external prospects, and has limited budget for three additional signings. Two rival agencies are already interested in the most charismatic prospect. One inherited trainee is an exceptional vocalist with poor dance aptitude. Another is technically average but repeatedly receives strange scout notes about how everyone watches her. This scenario immediately teaches the game's central question: what matters when building a group?

## 26. Things Fable Should NOT Do
Do not invent an Overall rating.
Do not expose every hidden personality value.
Do not make every trait a colored badge.
Do not make every screen a table.
Do not make every screen a card grid.
Do not use a generic startup-dashboard visual style.
Do not turn training into repetitive tapping/minigames.
Do not make idols collectible rarity tiers (SSR, UR, etc.).
Do not make success purely a function of spending more money.
Do not script every breakout star.
Do not make AI rivals omniscient.
Do not overbuild social media comments.
Do not add exploitative private-life systems.
Do not make the first milestone 'complete game.' Build the debut vertical slice first.

## 27. North Star
A player should finish a save and talk about PEOPLE: “I almost cut her at 17, then she became our center,” not “I got her Charisma to 97.”
The game succeeds when procedural trainees become memorable characters through systems. The player should remember the scout who begged them to sign someone, the vocalist who learned to perform, the accidental center the public chose, the group that should not have worked but did, and the rival company that stole the prospect they still regret losing.
The interface should make that world feel glamorous, competitive and alive while remaining fast enough to operate one-handed on a phone. Depth belongs in the simulation. Character belongs in the presentation. The player’s job is judgment.
