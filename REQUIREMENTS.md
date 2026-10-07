# RINGOUT requirements

User request: “/grillme cureate a 4 player game with the goal to knock players off the map.” Clarification: local multiplayer on one computer, with bots filling empty slots.

1: Always create four active fighter slots with selectable local human controls or bots.

2: Retain the original bounded top-down arena with momentum, player collisions, directional dash attacks, increasing knockback damage, and elimination outside the platform. Add a selectable side-view Platformer version with gravity, double jumps, one-way raised platforms, horizontal dash attacks, air knockback, and elimination beyond the stage.

3: Award a round to the final survivor. Support first to one, three, or five round wins; reset damage and positions between rounds. A simultaneous final knockout awards no points.

4: Shrink the map after 18 seconds by default to ensure rounds resolve. House Rules support 10, 18 or 30 seconds, or Never to disable shrinking permanently. In Platformer, narrow all platforms. Support either round wins or an immediate match win for the final survivor in both modes. Show scores, damage, current round, elapsed time, and remaining jumps where applicable.

5: Support four independent keyboard control sets, standard gamepads, and Player 1 touch controls. Pause on focus loss or assigned-controller disconnection. Provide instructions, optional sound, replay, and lobby reset.

6: Keep gameplay free of runtime package dependencies or external game assets. Optional web fonts have system fallbacks. Node.js 24 or newer runs the portable package and shared-map API. The current version requires no game PIN; hosted audience controls remain separate.

Architecture: game/engine.js contains rendering-independent simulation, input interpretation, bots, collision physics, and match state. game/game.js connects browser input, UI, rendering, sound, and optional WebMCP actions. game/index.html and game/style.css define the interface. src/worker.mjs serves game assets and src/maps-api.mjs implements shared map storage. server.cjs adapts the same handler for Node 24, preserving validated loopback Host/Origin pairs and bounding HTTP bodies before buffering. scripts/build.mjs generates dist/server/index.js with embedded assets. db/schema.ts and Drizzle migrations own persistent tables. .openai/hosting.json identifies the existing private Site with the logical DB binding.

Platformer extension (user request, 2026-09-14: "add a platformer verson"): game/platformer.js extends ArenaEngine, reusing its lobby configuration, fighter definitions, hit processing, and round/match transitions while implementing side-view movement, jumping, landings, recovery-aware bots, and platform erosion. game/game.js switches engines only in the lobby and keeps settings across switches. test-platformer.cjs validates the new physics independently. Preserve the original engine and debug output.

7: User request, 2026-09-15: continue, push to the current empty GitHub repo owned by Geauga, build a package, and protect access with a generated random eight-digit PIN. Resolve the existing empty repository before pushing; keep it private. Exclude secrets and generated archives from Git. Provide a package with first-run PIN setup, revocable eight-hour sessions, persistent guessing limits, and a Lock game action. Validate security and both existing game modes.

8: User request, 2026-09-18: make custom maps. Provide a lobby map picker, ready-made platformer layouts, and a visual workshop with drag/keyboard movement, numeric platform dimensions, four safe starts, bounds/spacing/reachability validation, saving, editing, copying, deleting, and draft play. Save up to 50 maps per installation in D1/local SQLite behind the existing PIN gate, with conflict-safe edits. Preserve selection across rounds and mode switches. Arena remains available. The concurrent user-requested platform feature work adds moving ledges and per-ledge Down-to-drop-through controls.

Scope: shared-device multiplayer only. Online matchmaking, individual player accounts, persistent leaderboards, and payments are outside this request. Requirements 7-9 describe historical requests; requirement 10 supersedes their PIN requirements.

9: User request, 2026-10-03: add jump pads. Mark a centered launch strip on any selected Platformer platform, automatically launch all fighters upward on contact, refill two air jumps, support moving/drop-through ledges, save the setting with legacy maps defaulting to off, and provide Spring Yard as a ready-made example. Preserve existing multiplayer, skins and access protection.

10: Current source behavior from 181d583 (2026-10-04): PIN setup, sign-in and session protection were deliberately removed. Preserve this behavior while reviewing/fixing/pushing. Launch without the deleted setup script; keep map origin checks, conflict protection and upload limits. Preserve all four skin selections across game modes, refresh score names/colors immediately and lock skin choices during matches. Validate local HTTP behavior and fresh portable packages. Record this review separately from concurrent replay work.

11: User request, 2026-10-04: add replays. Record the latest completed or stopped match in browser memory at 30 snapshots per second with a ten-minute cap. Support both modes, custom/moving/pad maps and skins. Provide play/pause, timeline seek, round selection, restart, 0.25/0.5/1/2 speed and exit. Preserve live scores/settings, exclude match pauses from recording and pause playback on focus loss. Replays are silent and expire on reload; a new recording keeps the previous replay until it ends. game/replay.js owns recording and interpolation independently of simulation, and game.js presents its read-only snapshots.

12: Current access override, 2026-10-04: local repository commit 181d583 removed the PIN gate; the user explicitly requested removing the hosted PIN protection too. This supersedes older PIN requirements above. Preserve owner-only Site sharing and existing map input/origin/revision validation. Do not add a replacement Site or change its audience.

13: User request, 2026-10-07: patch and push the reviewed House Rules and knockout-attribution bugs. Validate and store both rule choices, preserve them across modes, and show their actual timing in the HUD/help. Credit dash and damaging bump knockouts to the latest attacker within six elapsed gameplay seconds; clear attacker history each round. Preserve incoming preset maps and per-match knockout counters. Record counters and rules in isolated replay snapshots so watching a replay cannot crash or alter live scores. Verify both modes, replay/controller behavior and existing API/package checks before a normal GitHub push.
