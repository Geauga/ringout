import os

with open(r"game\engine.js", 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    "{ name: 'CORAL', color: '#ff847a' }": "{ name: 'CORAL', color: '#ff847a', description: 'A bright, oceanic coral hue.' }",
    "{ name: 'BLUE', color: '#85b5ff' }": "{ name: 'BLUE', color: '#85b5ff', description: 'A calm and steady sky blue.' }",
    "{ name: 'GOLD', color: '#f0c875' }": "{ name: 'GOLD', color: '#f0c875', description: 'A rich and shining golden yellow.' }",
    "{ name: 'VIOLET', color: '#b6a0f5' }": "{ name: 'VIOLET', color: '#b6a0f5', description: 'A deep, mystical violet.' }",
    "{ name: 'CYAN', color: '#80dce9' }": "{ name: 'CYAN', color: '#80dce9', description: 'A vibrant and energetic cyan.' }",
    "{ name: 'LIME', color: '#dcf87b' }": "{ name: 'LIME', color: '#dcf87b', description: 'A fresh and zesty lime green.' }",
    "{ name: 'PINK', color: '#ff9deb' }": "{ name: 'PINK', color: '#ff9deb', description: 'A striking and playful pink.' }",
    "{ name: 'MINT', color: '#a5ad9a' }": "{ name: 'MINT', color: '#a5ad9a', description: 'A cool, refreshing mint green.' }",
    "{ name: 'WHITE', color: '#ffffff' }": "{ name: 'WHITE', color: '#ffffff', description: 'A pure and blinding white.' }",
    "{ name: 'PEACH', color: '#ffbba6' }": "{ name: 'PEACH', color: '#ffbba6', description: 'A soft and warm peach tone.' }"
}

for old, new in replacements.items():
    content = content.replace(old, new)

with open(r"game\engine.js", 'w', encoding='utf-8') as f:
    f.write(content)
