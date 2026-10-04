import os

with open(r".github\workflows\codeql.yml", 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('name: "CodeQL"', 'name: "CodeQL Analysis"\n# Description: This workflow performs CodeQL static analysis to detect security vulnerabilities and errors in JavaScript code.')

with open(r".github\workflows\codeql.yml", 'w', encoding='utf-8') as f:
    f.write(content)

with open(r".github\workflows\pages.yml", 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('name: Validate protected game', 'name: Validate protected game\n# Description: This workflow builds and tests the Ringout application, ensuring the PIN-protected server package works correctly without exposing the raw assets.')

with open(r".github\workflows\pages.yml", 'w', encoding='utf-8') as f:
    f.write(content)
