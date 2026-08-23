# The Aethon Codex — Path to Book 5

## 1. What "zones" currently exist (audit)

Before planning Book 5, here's exactly what the live game has today, since "zone" isn't a single system in this codebase — it shows up in three different places:

| Type | Name | Unlocks at | Notes |
|---|---|---|---|
| Trader zone | Whispering Woods (Lewis) | Level 1 | Starter gear + potions |
| Trader zone | Merchant Quarter (Ribald) | Level 10 | BG2-tier legendary gear |
| Story books | Book I–IV | Chapters 1–70 | No named "zones" — just sequential chapters per book |
| Grind zone | The Unmapped Road | `completedChapters.includes(70)` OR Level 20+ | Endless post-Book-4 XP/gold farm; regular mobs Lv20–25 + rotating returning bosses |

**So: 2 trader zones + 1 endless grind zone stand between "finished Book 4" and Book 5 today.** There's no dedicated "Book 4.5" exploration zone — the Unmapped Road *is* the entire gap, by design (it's explicitly framed in-game as "the next chapter is still being written").

Level pacing: your own save is Lv23 at chapter 47/70. XP thresholds are hand-tuned through Lv19, then scale procedurally forever after — so there's no level cap holding players back from over-leveling on the Road before Book 5 drops.

**Recommendation:** keep it at one grind zone. A second interstitial zone would just dilute the Unmapped Road's purpose (it already exists specifically to hold players over). Better to spend that effort on Book 5 itself.

---

## 2. What already exists for this arc (good news)

Digging through the code, you'd already planted seeds for this:
- `ART_ASSETS.party` already has `wren: 'assets/party/wren.webp'` and `aldric: 'assets/party/aldric.webp'` reserved (files aren't uploaded yet, but the slots exist).
- A code comment already says: *"Sister Wren and Ser Aldric are later temporary quest allies."*
- Neither is in `GAME_DATA.partyMembers` yet — so no recruitment logic, stats, or quests exist for them yet. This is a from-scratch build, just not a from-zero one.

---

## 3. New systems this arc needs

Three things don't exist in Aethon Codex yet and all three are needed for what you described:

### A. Afflictions (status effects) + a Temple to cure them
Nothing in the current battle system tracks persistent status effects — HP/MP are the only resources. "Cure afflictions/disease" implies:
- An `afflictions` array per party member (e.g. `{id:'closed_eye_curse', name:'The Closed Eye', severity:1, appliedAt:70}`)
- A source: certain Cult of the Closed Eye enemies inflict an affliction on hit/on defeat instead of (or alongside) normal damage
- A Temple location/panel (new tab or a sub-panel under Explore) with a "Cure" action per afflicted member — costed in gold and/or a new material ("Purifying Incense"?), thematically fitting the temple setting
- Afflictions should matter but not be punishing — per your existing "no penalty mechanics" principle, I'd suggest they reduce a stat modestly (e.g. -10% MAG) rather than block play entirely, so a player who can't get to the Temple immediately isn't stuck.

### B. Temporary/Quest-locked companions
Right now `CORE_PARTY_IDS` (7 members) and `FAMILIAR_IDS` (Soel) are the only two categories, and both are *always* active — there's no "bench" concept (`canBenchPartyMember()` literally returns `false`). Aldric and Wren need a third category:
- `QUEST_ALLY_IDS` — joins the roster after recruitment, usable in battle, but only counts toward *their own* quest chain, not the core 7's fixed formation
- Needs its own equip rules (`CODEX_EQUIPMENT_RULES`), base stats, and battle AI branch (`companionAIAction`) same as the core 7

### C. The Stronghold
Mentioned as where Aldric "joins later" — this is a new home-base system, roughly equivalent in spirit to Legends of Daybreak's Guild Hall but doesn't need to be that large. A lightweight version:
- A roster page showing recruited quest allies (Aldric, Wren, future ones)
- Maybe a simple "assign to duty" flavor mechanic later, but I'd hold off building this out fully until you've got 2–3 recruits to actually populate it — building it for one character risks over-engineering before you know the real shape.

---

## 4. Proposed Book 5 opening arc

Suggested chapter beats (numbering continues from 71, since Book 4 ends at 70):

| Ch. | Beat | Type |
|---|---|---|
| 71 | Rumors of the Cult of the Closed Eye reach the party | story |
| 72 | Investigate — first Cult mobs appear, introduce the **affliction** mechanic on a minor fight | combat / system intro |
| 73 | Trail leads to the Temple; find it in disrepair — Temple becomes accessible from Explore | story / unlock |
| 74 | Push into the Temple, cult resistance | combat |
| 75 | **Boss: Cult of the Closed Eye vanguard** | combat / boss |
| 76 | Find Ser Aldric imprisoned — rescue quest, dialogue-heavy | story |
| 77 | **Boss: The cult leader** (holding Aldric) | combat / boss |
| 78 | Aldric recruited; first taste of his kit in a easy fight | recruit / combat |
| 79 | Temple fully restored — cure mechanic now fully live, Aldric's personal questline begins | system / story |
| 80–8x | Aldric's questline (his own arc, optional/side but rewarding) | quest chain |
| … | Later arc: confrontation with Sister Wren | boss |
| … | Wren recruited post-defeat, opens her own future questline | recruit / story |

This keeps the Temple/Aldric arc tight (roughly 9 chapters to full recruitment) before branching into his personal quests, then treats Wren as a distinct second arc later in the book rather than back-to-back — two big recruitment set-pieces back-to-back tend to undercut each other.

---

## 5. Open questions before I start building

I can start scaffolding the affliction system and Aldric's party-member data now, but I'd want your call on:
1. **Aldric's role/kit** — what's his class (tank? support? striker?) and roughly how strong relative to the core 7 at the point he joins?
2. **Affliction severity** — flat stat penalty, or something that scales/stacks?
3. **Cure cost** — gold only, or a new "Purifying Incense" material sold at a Temple-specific vendor (mirrors the Trader pattern you already have)?
4. Do you have chapter art/narrative drafted for 71+ yet, or should I placeholder-structure the data now and you slot in real art/text later (the way Book 4 chapters were built)?
