# RINGOUT requirements

User request: “/grillme cureate a 4 player game with the goal to knock players off the map.” Clarification: local multiplayer on one computer, with bots filling empty slots.

1: Always create four active fighter slots with selectable local human controls or bots.

2: Retain the original bounded top-down arena with momentum, player collisions, directional dash attacks, increasing knockback damage, and elimination outside the platform. Add a selectable side-view Platformer version with gravity, double jumps, one-way raised platforms, horizontal dash attacks, air knockback, and elimination beyond the stage.

3: Award a round to the final survivor. Support first to one, three, or five round wins; reset damage and positions between rounds. A simultaneous final knockout awards no points.

4: Shrink the map after 18 seconds to ensure rounds resolve. In Platformer, narrow all four platforms. Show scores, damage, current round, elapsed time, and remaining jumps where applicable.

5: Support four independent keyboard control sets, standard gamepads, and Player 1 touch controls. Pause on focus loss or assigned-controller disconnection. Provide instructions, optional sound, replay, and lobby reset.

6: Run without package installation or external game assets. Optional web fonts have system fallbacks. Keep the source playable locally, including by directly opening dist/index.html.

Architecture: dist/engine.js contains rendering-independent simulation, input interpretation, bots, collision physics, and match state. dist/game.js connects browser input, UI, rendering, sound, and optional WebMCP actions. dist/index.html and dist/style.css define the interface. server.cjs provides local static preview. test-engine.cjs validates consequential game behavior using Node.js built-ins. .openai/hosting.json identifies the private static Site.

Platformer extension (user request, 2026-09-14: "add a platformer verson"): dist/platformer.js extends ArenaEngine, reusing its lobby configuration, fighter definitions, hit processing, and round/match transitions while implementing side-view movement, jumping, landings, recovery-aware bots, and platform erosion. dist/game.js switches engines only in the lobby and keeps settings across switches. test-platformer.cjs validates the new physics independently. Preserve the original engine and debug output.

Scope: shared-device multiplayer only. Online matchmaking, accounts, persistent leaderboards, external game services, and payments are outside this request.
