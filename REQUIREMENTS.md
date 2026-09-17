# RINGOUT requirements

User request: “/grillme cureate a 4 player game with the goal to knock players off the map.” Clarification: local multiplayer on one computer, with bots filling empty slots.

1: Always create four active fighter slots with selectable local human controls or bots.

2: Retain the original bounded top-down arena with momentum, player collisions, directional dash attacks, increasing knockback damage, and elimination outside the platform. Add a selectable side-view Platformer version with gravity, double jumps, one-way raised platforms, horizontal dash attacks, air knockback, and elimination beyond the stage.

3: Award a round to the final survivor. Support first to one, three, or five round wins; reset damage and positions between rounds. A simultaneous final knockout awards no points.

4: Shrink the map after 18 seconds to ensure rounds resolve. In Platformer, narrow all four platforms. Show scores, damage, current round, elapsed time, and remaining jumps where applicable.

5: Support four independent keyboard control sets, standard gamepads, and Player 1 touch controls. Pause on focus loss or assigned-controller disconnection. Provide instructions, optional sound, replay, and lobby reset.

6: Keep gameplay free of runtime package dependencies or external game assets. Optional web fonts have system fallbacks. Require the PIN-protected server for local and hosted play; Node.js 24 or newer runs the portable package. Do not expose a public static route around the access gate.

Architecture: game/engine.js contains rendering-independent simulation, input interpretation, bots, collision physics, and match state. game/game.js connects browser input, UI, rendering, sound, and optional WebMCP actions. game/index.html and game/style.css define the interface. src/worker.mjs gates all game assets; src/auth.mjs verifies salted PIN hashes; src/security-store.mjs manages D1/SQLite security queries. server.cjs adapts the same handler for Node 24. scripts/build.mjs generates dist/server/index.js, embedding game assets behind authentication. db/schema.ts and Drizzle migrations own persistent tables. .openai/hosting.json identifies the existing private Site with the logical DB binding.

Platformer extension (user request, 2026-09-14: "add a platformer verson"): dist/platformer.js extends ArenaEngine, reusing its lobby configuration, fighter definitions, hit processing, and round/match transitions while implementing side-view movement, jumping, landings, recovery-aware bots, and platform erosion. dist/game.js switches engines only in the lobby and keeps settings across switches. test-platformer.cjs validates the new physics independently. Preserve the original engine and debug output.

7: User request, 2026-09-15: continue, push to the current empty GitHub repo owned by Geauga, build a package, and protect access with a generated random eight-digit PIN. Resolve the existing empty repository before pushing; keep it private. Exclude secrets and generated archives from Git. Provide a package with first-run PIN setup, revocable eight-hour sessions, persistent guessing limits, and a Lock game action. Validate security and both existing game modes.

Scope: shared-device multiplayer only. Online matchmaking, individual player accounts, persistent leaderboards, and payments are outside this request. PIN access is shared across invited players; it is not per-player identity.
