import os

with open("test-maps.mjs", "r", encoding="utf-8") as f:
    content = f.read()

# Remove the import and usage of auth.mjs
content = content.replace("import { randomToken, digest } from './src/auth.mjs';\n", "")
content = content.replace("import { securityStore } from './src/security-store.mjs';\n", "")

lines = content.split('\n')
new_lines = []
skip = False
for line in lines:
    if "const tag = await digest(process.env.RINGOUT_PIN_HASH" in line:
        continue
    if "await securityStore(DB).addSession(await digest(token), tag" in line:
        continue
    if "headers: { cookie: `ringout-local=${token}` }" in line:
        line = line.replace("headers: { cookie: `ringout-local=${token}` }", "headers: {}")
    if "headers: { cookie: `__Host-ringout=${token}` }" in line:
        line = line.replace("headers: { cookie: `__Host-ringout=${token}` }", "headers: {}")
    new_lines.append(line)

with open("test-maps.mjs", "w", encoding="utf-8") as f:
    f.write('\n'.join(new_lines))
