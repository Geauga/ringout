# RINGOUT requirements

User request: “/grillme cureate a 4 player game with the goal to knock players off the map.” Clarification: local multiplayer on one computer, with bots filling empty slots.

1: Always create four active fighter slots with selectable local human controls or bots.

2: Retain the original bounded top-down arena with momentum, player collisions, directional dash attacks, increasing knockback damage, and elimination outside the platform. Add a selectable side-view Platformer version with gravity, double jumps, one-way raised platforms, horizontal dash attacks, air knockback, and elimination beyond the stage.

3: Award a round to the final survivor. Support first to one, three, or five round wins; reset damage and positions between rounds. A simultaneous final knockout awards no points.

4: Shrink the map after 18 seconds to ensure rounds resolve. In Platformer, narrow all platforms. Show scores, damage, current round, elapsed time, and remaining jumps where applicable.

5: Support four independent keyboard control sets, standard gamepads, and Player 1 touch controls. Pause on focus loss or assigned-controller disconnection. Provide instructions, optional sound, replay, and lobby reset.

6: Keep gameplay free of runtime package dependencies or external game assets. Optional web fonts have system fallbacks. Require the PIN-protected server for local and hosted play; Node.js 24 or newer runs the portable package. Do not expose a public static route around the access gate.

Architecture: game/engine.js contains rendering-independent simulation, input interpretation, bots, collision physics, and match state. game/game.js connects browser input, UI, rendering, sound, and optional WebMCP actions. game/index.html and game/style.css define the interface. src/worker.mjs gates all game assets; src/auth.mjs verifies salted PIN hashes; src/security-store.mjs manages D1/SQLite security queries. server.cjs adapts the same handler for Node 24. scripts/build.mjs generates dist/server/index.js, embedding game assets behind authentication. db/schema.ts and Drizzle migrations own persistent tables. .openai/hosting.json identifies the existing private Site with the logical DB binding.

Platformer extension (user request, 2026-09-14: "add a platformer verson"): game/platformer.js extends ArenaEngine, reusing its lobby configuration, fighter definitions, hit processing, and round/match transitions while implementing side-view movement, jumping, landings, recovery-aware bots, and platform erosion. game/game.js switches engines only in the lobby and keeps settings across switches. test-platformer.cjs validates the new physics independently. Preserve the original engine and debug output.

7: User request, 2026-09-15: continue, push to the current empty GitHub repo owned by Geauga, build a package, and protect access with a generated random eight-digit PIN. Resolve the existing empty repository before pushing; keep it private. Exclude secrets and generated archives from Git. Provide a package with first-run PIN setup, revocable eight-hour sessions, persistent guessing limits, and a Lock game action. Validate security and both existing game modes.

8: User request, 2026-09-18: make custom maps. Provide a lobby map picker, ready-made platformer layouts, and a visual workshop with drag/keyboard movement, numeric platform dimensions, four safe starts, bounds/spacing/reachability validation, saving, editing, copying, deleting, and draft play. Save up to 50 maps per installation in D1/local SQLite behind the existing PIN gate, with conflict-safe edits. Preserve selection across rounds and mode switches. Arena remains available. The concurrent user-requested platform feature work adds moving ledges and per-ledge Down-to-drop-through controls.

Scope: shared-device multiplayer only. Online matchmaking, individual player accounts, persistent leaderboards, and payments are outside this request. PIN access is shared across invited players; it is not per-player identity.

9: User request, 2026-10-03: add jump pads. Mark a centered launch strip on any selected Platformer platform, automatically launch all fighters upward on contact, refill two air jumps, support moving/drop-through ledges, save the setting with legacy maps defaulting to off, and provide Spring Yard as a ready-made example. Preserve existing multiplayer, skins and access protection.

10: User request, 2026-10-04: add replays. Record the latest completed or stopped match in browser memory at 30 snapshots per second with a ten-minute cap. Support both modes, custom/moving/pad maps and skins. Provide play/pause, timeline seek, round selection, restart, 0.25/0.5/1/2 speed and exit. Preserve live scores/settings, exclude match pauses from recording and pause playback on focus loss. Replays are silent and expire on reload; a new recording keeps the previous replay until it ends. game/replay.js owns recording and interpolation independently of simulation, and game.js presents its read-only snapshots.

11: Current access override, 2026-10-04: local repository commit 181d583 removed the PIN gate; the user explicitly requested removing the hosted PIN protection too. This supersedes older PIN requirements above. Preserve owner-only Site sharing and existing map input/origin/revision validation. Do not add a replacement Site or change its audience.
