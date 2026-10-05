# RINGOUT

A local four-player arena game. Dash into other fighters to knock them off the platform. The last fighter standing wins the round; the first to the selected number of wins takes the match.

Choose **Arena** for the original top-down game, or **Platformer** for the side-view version. Switch modes in the lobby; your player assignments, selected skins, and round-win target are preserved. Select skins before starting; skin choices stay locked until you return to the lobby.

Choose a stage under **The map**, or open **Map editor** to build your own Platformer stage. Drag platforms, nudge the selected platform with arrow keys, or change its X/Y position and width. **+ New map** starts with a main floor; **Add ledge** creates another platform. Colored P1–P4 markers show the automatic starting positions. Maps support up to 12 platforms, with live checks for bounds, spacing, and reachable ledges.

**Save map** adds the stage to the shared library for this game installation. Reopen a saved map to edit it, use **Save new copy** for a variation, or **Use this map** to try an unsaved draft. The map stays selected between rounds and when switching back from Arena. Return to the lobby to change it. Up to 50 custom maps are stored in local SQLite or hosted D1; local and hosted libraries are separate. Save before reloading to keep your edits. If another tab changes the same saved map, saving is rejected rather than overwriting the other changes; save a new copy to preserve your draft.

Ledges can move horizontally or vertically, and can optionally allow players to press Down to drop through. The main floor stays fixed. Platformer Down controls are S, Down Arrow, K, and G for Players 1–4; gamepads use the stick/D-pad down and touch uses the thumbstick down. The editor displays motion paths and drop-through markings. Ready-made stages include High Ground, Sky Steps, Split Summit, Moving Grounds, and Spring Yard.

Gold **jump pads** launch any fighter upward automatically when they step or land on the marked center strip and refill both air jumps. In **Map editor**, select any platform and check **Add a jump pad**, then save or play the draft. Pads can ride moving ledges; Down still drops through a ledge when enabled. **Spring Yard** is ready to play with pads already placed.

PIN protection has been removed from the current source version. The downloadable `RINGOUT-secure.zip` includes **Node.js 24 for Windows x64**; the archive keeps its original filename for compatibility. Extract it and double-click `start.cmd` on Windows. Source checkouts and macOS/Linux require an installed **Node.js 24 or newer**; run `node server.cjs` after building. Visit `http://127.0.0.1:4173` or `http://localhost:4173`. No setup command or PIN is required. The release needs no package installation. Google Fonts is optional; system fonts work without internet.

From a source checkout, run `node scripts/build.mjs` before starting. Development schema changes use `pnpm install` and `pnpm db:generate`; normal builds and gameplay use only Node built-ins. Run `pnpm test` to check gameplay, controls, the map editor, map storage, and the local HTTP server. Server checks use a fresh database in an ignored `.tmp/server-check-*` directory. On Windows, `pwsh -File scripts/package.ps1` packages the completed build into `release/RINGOUT-secure.zip`; test a fresh extraction with `node scripts/test-package.mjs <extracted-directory>`.

GitHub Actions builds the server and runs the tests on pushes and pull requests. GitHub Pages cannot run the saved-map API, so the workflow performs validation only. The local server accepts loopback Host headers and requires a matching browser Origin for map changes. Uploads are limited to 8192 bytes before buffering. Never commit local `.env`, `.private/`, or `.data/` files. The package excludes existing configuration and saved maps.

1: Player 1 uses W/A/S/D and Space to dash.

2: Player 2 uses arrow keys and Enter to dash.

3: Player 3 uses I/J/K/L and U to dash.

4: Player 4 uses T/F/G/H and R to dash.

Choose Keyboard, Bot, or a connected controller for each slot before starting. By default, Player 1 uses the keyboard and the other slots are bots. A standard controller uses the left stick or D-pad and its primary A / cross button. Press a controller button to let the browser discover it. Each controller can occupy one slot. Keyboards may limit simultaneous keys; separate controllers avoid this hardware limit. Touch controls support Player 1 when assigned to Keyboard.

Dash follows movement direction; when standing still, it follows the last movement direction. Dash recharges in 1.25 seconds. Hits increase damage and subsequent knockback. The platform shrinks after 18 seconds. Simultaneous final eliminations are a draw and award no points.

Escape pauses or resumes. Losing focus or disconnecting an assigned gamepad pauses automatically. Back to lobby lets you change the lineup. Run it back starts a fresh match with the same settings. Sound is off initially and can be enabled in the header.

**Watch replay** becomes available after a match ends or you return to the lobby. It records both modes, custom stages, moving ledges, jump pads and selected skins. Pause/play, scrub the timeline, jump to a round, restart, or choose **0.25×, 0.5×, 1× or 2×** speed. **Exit replay** restores the lobby or completed match without changing scores or settings. Escape toggles playback; losing focus pauses it. Replays are silent and kept in this tab until reload; the latest recording replaces the previous one when finished. Matches longer than ten minutes retain their final ten minutes. Recording excludes pauses and playback cannot control fighters.

Validation: `node test-engine.cjs` checks independent controls, dash knockouts, pause, shrinking, draws, scoring, controller validation, and 20 reproducible first-to-three bot matches.

Platformer controls: Player 1 uses A/D to move, W to jump, and Space to dash. Player 2 uses left/right arrows, Up to jump, and Enter to dash. Player 3 uses J/L, I to jump, and U to dash. Player 4 uses F/H, T to jump, and R to dash. On a standard controller, use the left stick or D-pad to move, A / cross to jump, and X / square to dash. Touch provides separate JUMP and DASH buttons for Player 1.

In Platformer, release and press jump again in midair for a second jump. Landing restores both jumps; the two dots below a fighter show jumps remaining. Platforms are one-way: pass upward through them and land on their top surfaces. Dash launches rivals sideways and upward. Recover before falling below the stage or flying beyond its outer sides. All platforms narrow after 18 seconds. Bots jump, pursue opponents across levels, and try to recover toward the main platform.

Platformer validation: `node test-platformer.cjs` verifies double jumps, no third jump, landing reset, one-way platforms, four independent player inputs, pause, dash knockouts, erosion, scoring/draws, and 20 reproducible first-to-three matches. Original arena checks still run independently.

Execution location: local Windows Git repository. Gameplay and replay recording execute in the browser and remain shared-device multiplayer. The Node/Workers server serves the game and stores custom maps. Author-written game files live in `game/`; `dist/server/index.js` is the generated server bundle. Sites hosting retains owner-only access. The GitHub repository is [Geauga/ringout](https://github.com/Geauga/ringout) (public). See `SECURITY.md` for deployment and access details.

## Community Standards

Please refer to the [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) to review our community standards.
