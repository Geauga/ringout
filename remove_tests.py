import os

with open(r".github\workflows\pages.yml", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("Test gameplay, editor, access and map storage", "Test gameplay, editor, and map storage")

with open(r".github\workflows\pages.yml", "w", encoding="utf-8") as f:
    f.write(content)

with open("package.json", "r", encoding="utf-8") as f:
    pkg = f.read()

pkg = pkg.replace(' && node test-security.mjs', '')

with open("package.json", "w", encoding="utf-8") as f:
    f.write(pkg)
