# Tower of Doom (Blooket replica): source and handoff notes

The playable game is **`../tower-of-doom.html`**. It's a single self-contained file, so open it in any browser.
This folder holds the source it is built from, plus the test scripts.

## Status

Finished and tested. Every screen works on desktop and phone widths. A run is **3 levels**, each 10 floors plus a boss:
1. The Haunted Crypt (blue), boss The Bone King.
2. The Molten Depths (lava), boss The Lava Titan.
3. The Dark Castle (purple), boss The Evil King.

There are 23 characters, all from the user's art sheet: 10 player cards (Knight, Archer, Wizard, Cleric, Rogue, Barbarian, Ice Mage, Druid, Ninja, Engineer), 10 monsters (Slime, Skeleton, Goblin, Ghost, Spider, Orc, Troll, Dark Mage, Vampire, Dragonling) and the 3 bosses.

Choices the user made:
- **No quiz questions.** The real game used questions; here a timing bar ("Initiative") takes their place.
- **Length:** first 10 floors plus a boss, then at the user's request three levels (like Blooket). Deck, trinkets, coins and HP carry over; only rest stops, potions and some events heal (what Blooket did).
- **Art:** at the user's request, all artwork comes from the user's two sprite sheets (`art/sheet.png`: characters, bosses, first icons; `art/sheet2.png`: logo, level backdrops, floor tiles, card frames, card back and backgrounds, more icons and items, button and dialog frames). They replaced earlier CSS-drawn characters (round blobs, then blocky pixel-voxel). The roster was cut to the sheet's characters, so cards repeat more often.
  Used from sheet 2: the logo (title), the three level backdrops (tower top and battle screen) and floor tiles (tower walls), the five rarity frames and the card back, the card scenes behind each card, the purple and gold button frames, the dialog frame (shopkeeper), and icons (potions, key, ring, armor, helmet, gems, hammer, book, gear, fire, skull, chest, ?, tower). Not used: the tileset platforms and props, the elemental effect pictures, the UI bars and hearts row, banners and torches, and the arrow, trophy and check icons.
- **Output:** a single HTML file, plus a private claude.ai play link for phones.

History worth knowing:
- **"I can't get to the second floor."** The old build had no proceed button, only one faintly glowing circle on the map. A fixed "Next room" bar with a button for every reachable room was added to fix that, and later **removed at the user's request** (the map again shows only the glowing rooms; `centerOnRoom()` scrolls them into view). Fixes from the same review that remain: the toast can no longer cover rooms, a double-click can no longer enter a room by accident (clicks within 500 ms of a new screen are ignored when `e.detail > 1`), and the map scrolls only the game's own page.
- **"The Play button doesn't work."** The user had opened the file in a phone file viewer. Those previews don't run JavaScript, which is true of iOS Quick Look and Android's HTML Viewer. The page now shows an "Open this in a web browser" notice and hides the dead buttons whenever scripts don't run (`html.no-js`). A small ES5 boot script also shows a red banner if the game ever fails to start.
- **Compatibility fixes from the same investigation:**
  - No CSS `inset` (it trapped the game behind an off-screen window before iOS 14.5) and no `Object.fromEntries`. The JS stays at ES2017, so the floor is about iOS 10.3, Chrome 55 and Firefox 52.
  - Every `clip-path` is also written as `-webkit-clip-path`.
  - Taps outside a window close it, and windows close when the screen changes.
  - The toast no longer blocks taps.
  - Buttons keep their hit area while their press animation moves them.
  - Fonts load without blocking the page.
  - The title row and the landscape title fit on phones.

## Build

To change the artwork, replace `art/sheet.png` or `art/sheet2.png` (keeping the layout) or edit the crop boxes in `art/make-sprites.py`, then run `python3 art/make-sprites.py` (needs Pillow) and `node build.js`. Frames, buttons and the dialog are 9-slice `border-image`s whose slice sizes are in `style-base.css` (the pictures contain text such as "Play", so only the outer ~9px of a button picture may be used).

```bash
node build.js                                   # inlines src/* into ../tower-of-doom.html
node build.js --artifact /path/to/page.html     # same game without doctype/html/head/body, for a claude.ai Artifact
```

Edit files in `src/`, never the built HTML. `build.js` replaces `/*__CSS__*/` and `/*__JS__*/` in `src/shell.html`.

| File | What it holds |
|---|---|
| `src/core-data.js` | Seeded RNG, stats, rarities, all **cards**, **trinkets**, **enemies** (each has a `level`), the `LEVELS` table (name, boss, theme), map node types |
| `src/core-logic.js` | Rules with no DOM: map generation, battle resolution, rewards, shop, rest, mystery **events**, difficulty table |
| `src/ui-sprite.js` | `spriteHTML(id)`, `iconHTML(name)`, `trinketIconHTML(t)`: draw artwork by id |
| `src/sprites.css`, `src/sprites.js` | **Generated** by `art/make-sprites.py` from both sheets: one `.spr-<id>` class per picture (embedded as images), the border-image skins for buttons, card frames and dialog, and each picture's size |
| `src/ui-main.js` | Helpers, sound, HUD, title, draft, map rendering, modals, How to Play text |
| `src/ui-battle.js` | Battle flow, timing bar, rewards, shop/rest/event screens, end screen, input, init |
| `src/style-base.css` | All styles |

## Test ("debug") suite

Run these from this folder. The browser tests use Playwright with Chromium.

```bash
node tests/sim.js 2000 0.65 normal   # checks 3,000 maps plus rule assertions, then a balance sim (runs, timing hit rate, difficulty)
node tests/e2e.js                    # plays full games in headless Chromium by clicking the real UI (6 desktop + 3 phone)
node tests/states.js                 # screenshots of timing bar / stat choice / damage / deck modal -> tests/shots/
node tests/edge.js                   # quit mid-battle, sound toggle, keyboard
node tests/art-shots.js              # screenshots of the artwork in title/draft/map/battle/boss/level/shop screens -> tests/shots/art-*.png
node tests/bar-check.js              # every glowing room is clickable (not hidden under anything) at 10 screen sizes
node tests/levelup-regress.js        # quitting on a boss reward must not leak the level-up flag
node tests/artifact-frame.js         # plays inside an artifact-like frame (tests/artifact-harness) with fixed and very tall embeds
node tests/verify-fixes.js           # 20 regression checks: no-JS notice, old-browser features, overlap, toast, focus, fonts, landscape
# Lint: extract the second <script> from the built HTML to lint/game.js, then:
#   npx eslint -c lint/eslint.config.mjs lint/game.js
```

Last results: all assertions passed, 0 console errors, all 20 regression checks passed, every e2e run finished, lint showed 0 errors.

## Rules as implemented

- **Draft:** pick 1 of 3 cards, 5 times. Stats are Strength / Charisma / Wisdom, max 20.
- **Battle round:** draw 3 random cards from the deck and play one, then the timing bar:
  - **Hit** the green zone: the enemy card is revealed and *you* choose the stat. The center zone is a **PERFECT** and gives +2.
    On Normal the zone is about 30% of the bar on floor 1, 25% on floor 5, 20% on floor 10 and 18% for the boss (`INITIATIVE_ZONE_SCALE` = 1.15, made 15% wider at the user's request).
  - **Miss:** the enemy chooses its card's highest stat (ties go to its favorite stat).
  - The lower stat takes damage equal to the difference. Ties deal no damage.
- **Enemies** draw cards from rarity pools, get +1 to their favorite stat, and gain a floor bonus of `floor((floor-1)/4)`.
  Each level after the first adds +1 to every stat and +9 HP for regular enemies and strengthens the initiative bar. Bosses have base HP Bone King 46, Lava Titan 80, Evil King 115 (scaled by `BOSS_HP_SCALE` per level, and +1 stat per level) and enrage at 50% HP (+1 to all stats). `ENEMY_HP_SCALE` / `BOSS_HP_SCALE` in core-logic are the main difficulty knobs.
  Card rarity in rewards and shops improves with total depth across levels.
- **Level change:** beating a non-final boss gives a "Level N Complete!" reward screen, then a level intro (`#levelGo`), then a fresh map. Beating the Evil King wins the run.
- **Map:** rooms are enemy, strong enemy (gives a trinket), shop, rest, mystery, and boss. Floor 1 is all enemies; floor 10 is all rest stops.
- **Shop:** 4 cards, 2 trinkets, a potion, and card removal (50 coins, free with the Coupon, minimum deck of 3).
- **Rest:** heal 30% of max HP, or give one card +2 to every stat.
- **Difficulty** (`DIFFICULTY` in core-logic): Easy 60 HP with a wider, slower bar; Normal 50 HP; Hard 45 HP, narrower and faster bar, enemy stats +1.

## Balance (from `tests/sim.js`, simple bot)

| Difficulty | Bot timing hit rate | Win rate |
|---|---|---|
| Easy | 75% | ~72% |
| Normal | 65% | ~44% |
| Normal | 80% | ~74% |
| Hard | 85% | ~63% |

Win rates are for clearing all three levels.

The main knobs are enemy `hp`/`pool` in core-data, plus `makeEnemy` bonus, `rarityWeights`, `initiativeParams` and `DIFFICULTY` in core-logic.

## Research notes

Blooket retired Tower of Doom on August 9, 2025. Facts taken from fan wikis:
- Damage = your stat minus theirs.
- Stats max out at 20.
- The game opened with a 5-card draft (pick 1 of 3).
- Map icons: robot = enemy, warning = strong enemy, market = shop, skull = boss, ? = mystery.
- Rest gave either +2 to all of a card's stats or a heal.
- Card removal cost 50 coins (free with Coupon). The Pink Hippo showed 2 card choices instead of 3.
- Enemy names: Evil Chicken/Pig/Rabbit/Panther/Orangutan, Witch, Slime Monster, Gingerbread Man, Dragon, Unicorn, Santa Claus, King.

All exact numbers in this build (card stats, HP, prices) are original and tuned for balance.

## Ideas if continuing

- Engine coverage: only Chromium was available for testing; WebKit/Firefox were checked by code reading and simulation.
- A quiz-question mode as an optional alternative to the timing bar (the original mechanic).
- More events and trinkets. Card abilities beyond plain stats.
- Save and resume a run in progress (only the best score is stored now, in localStorage under `tod-best`).
