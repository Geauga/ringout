import os

with open(r"scripts\package.ps1", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "'server.cjs','start.cmd','README.md','SECURITY.md','.env.example','src/auth.mjs','scripts/setup-pin.mjs','scripts/local-db.mjs','dist/server/index.js','dist/server/package.json'",
    "'server.cjs','start.cmd','README.md','.env.example','scripts/local-db.mjs','dist/server/index.js','dist/server/package.json'"
)

with open(r"scripts\package.ps1", "w", encoding="utf-8") as f:
    f.write(content)
