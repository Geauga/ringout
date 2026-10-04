import os

with open(r".github\workflows\pages.yml", 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "- name: Build protected server",
    "- name: Enable Corepack and install dependencies\n        run: corepack enable pnpm && pnpm install\n      - name: Build protected server"
).replace(
    "run: npm test",
    "run: pnpm test"
)

with open(r".github\workflows\pages.yml", 'w', encoding='utf-8') as f:
    f.write(content)
