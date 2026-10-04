import os

with open("test-maps.mjs", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("const env=()=>({DB,RINGOUT_PIN_HASH:verifier});", "const env=()=>({DB});")

with open("test-maps.mjs", "w", encoding="utf-8") as f:
    f.write(content)
