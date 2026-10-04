import os
import re

with open(r"game\game.js", 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the setupUI HTML map logic
old_html = "</div><select id=\"player-${i}\""
new_html = "</div><div class=\"skin-desc\" id=\"skin-desc-${i}\" style=\"font-size: 11px; color: #888; margin-top: 2px; height: 1.2em;\">${skin.description}</div><select id=\"player-${i}\""
content = content.replace(old_html, new_html)

# Replace the event listener for skin change
old_listener = "parseInt(e.target.value, 10));$(`row-${i}`).style.setProperty('--player', PLAYER_SKINS[engine.skins[i]].color);});}"
new_listener = "parseInt(e.target.value, 10));$(`row-${i}`).style.setProperty('--player', PLAYER_SKINS[engine.skins[i]].color);$(`skin-desc-${i}`).textContent = PLAYER_SKINS[engine.skins[i]].description;});}"
content = content.replace(old_listener, new_listener)

with open(r"game\game.js", 'w', encoding='utf-8') as f:
    f.write(content)
