import os

with open("test-maps.mjs", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("const verifier=await createVerifier('94826137'),worker=createWorker({}),origin='https://maps.example';", "const worker=createWorker({}),origin='https://maps.example';")
content = content.replace(",env:{DB,RINGOUT_PIN_HASH:verifier}", ",env:{DB}")

with open("test-maps.mjs", "w", encoding="utf-8") as f:
    f.write(content)
