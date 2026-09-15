# RINGOUT

A local four-player arena game. Dash into other fighters to knock them off the platform. The last fighter standing wins the round; the first to the selected number of wins takes the match.

Choose **Arena** for the original top-down game, or **Platformer** for the side-view version. Switch modes in the lobby; your player assignments and round-win target are preserved.

Open `dist/index.html` directly in a modern browser, or run `node server.cjs` and visit `http://127.0.0.1:4173`. No package installation is required. Google Fonts is optional; system fonts work without internet.

1: Player 1 uses W/A/S/D and Space to dash.

2: Player 2 uses arrow keys and Enter to dash.

3: Player 3 uses I/J/K/L and U to dash.

4: Player 4 uses T/F/G/H and R to dash.

Choose Keyboard, Bot, or a connected controller for each slot before starting. By default, Player 1 uses the keyboard and the other slots are bots. A standard controller uses the left stick or D-pad and its primary A / cross button. Press a controller button to let the browser discover it. Each controller can occupy one slot. Keyboards may limit simultaneous keys; separate controllers avoid this hardware limit. Touch controls support Player 1 when assigned to Keyboard.

Dash follows movement direction; when standing still, it follows the last movement direction. Dash recharges in 1.25 seconds. Hits increase damage and subsequent knockback. The platform shrinks after 18 seconds. Simultaneous final eliminations are a draw and award no points.

Escape pauses or resumes. Losing focus or disconnecting an assigned gamepad pauses automatically. Back to lobby lets you change the lineup. Run it back starts a fresh match with the same settings. Sound is off initially and can be enabled in the header.

Validation: `node test-engine.cjs` checks independent controls, dash knockouts, pause, shrinking, draws, scoring, controller validation, and 20 reproducible first-to-three bot matches.

Platformer controls: Player 1 uses A/D to move, W to jump, and Space to dash. Player 2 uses left/right arrows, Up to jump, and Enter to dash. Player 3 uses J/L, I to jump, and U to dash. Player 4 uses F/H, T to jump, and R to dash. On a standard controller, use the left stick or D-pad to move, A / cross to jump, and X / square to dash. Touch provides separate JUMP and DASH buttons for Player 1.

In Platformer, release and press jump again in midair for a second jump. Landing restores both jumps; the two dots below a fighter show jumps remaining. Platforms are one-way: pass upward through them and land on their top surfaces. Dash launches rivals sideways and upward. Recover before falling below the stage or flying beyond its outer sides. All four platforms narrow after 18 seconds. Bots jump, pursue opponents across levels, and try to recover toward the main platform.

Platformer validation: `node test-platformer.cjs` verifies double jumps, no third jump, landing reset, one-way platforms, four independent player inputs, pause, dash knockouts, erosion, scoring/draws, and 20 reproducible first-to-three matches. Original arena checks still run independently.

Execution location: local Windows Git repository. Gameplay executes entirely in the browser; there is no online multiplayer server. Sites hosting serves the same static assets privately. No GitHub remote was configured at project creation.
