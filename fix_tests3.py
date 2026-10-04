import os

with open("test-maps.mjs", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "const login=await worker.fetch(new Request(" in line:
        continue
    new_lines.append(line)

with open("test-maps.mjs", "w", encoding="utf-8") as f:
    f.writelines(new_lines)
