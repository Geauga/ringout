# RINGOUT requirements

User request: “/grillme cureate a 4 player game with the goal to knock players off the map.” Clarification: local multiplayer on one computer, with bots filling empty slots.

1: Always create four active fighter slots with selectable local human controls or bots.

2: Use a bounded top-down arena, momentum, player collisions, directional dash attacks, increasing knockback damage, and elimination outside the platform.

3: Award a round to the final survivor. Support first to one, three, or five round wins; reset damage and positions between rounds. A simultaneous final knockout awards no points.

4: Shrink the map after 18 seconds to ensure rounds resolve. Show scores, damage, current round, and elapsed time.

5: Support four independent keyboard control sets, standard gamepads, and Player 1 touch controls. Pause on focus loss or assigned-controller disconnection. Provide instructions, optional sound, replay, and lobby reset.

6: Run without package installation or external game assets. Optional web fonts have system fallbacks. Keep the source playable locally, including by directly opening dist/index.html.

Architecture: dist/engine.js contains rendering-independent simulation, input interpretation, bots, collision physics, and match state. dist/game.js connects browser input, UI, rendering, sound, and optional WebMCP actions. dist/index.html and dist/style.css define the interface. server.cjs provides local static preview. test-engine.cjs validates consequential game behavior using Node.js built-ins. .openai/hosting.json identifies the private static Site.

Scope: shared-device multiplayer only. Online matchmaking, accounts, persistent leaderboards, external game services, and payments are outside this request.
