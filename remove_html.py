import os

with open(r"game\index.html", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('  <script defer src="access.js"></script>\n', '')
content = content.replace('<form method="post" action="/lock"><button class="text-button" type="submit">Lock game</button></form>', '')

with open(r"game\index.html", "w", encoding="utf-8") as f:
    f.write(content)
