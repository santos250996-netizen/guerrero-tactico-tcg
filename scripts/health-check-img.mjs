import ZAI from "z-ai-web-dev-sdk";
try {
  const zai = await ZAI.create();
  const r = await zai.images.generations.create({
    prompt: "a single flat cartoon green leaf, bold brown outline, full bleed",
    size: "864x1152",
  });
  console.log(r.images?.[0]?.base64 ? `OK — base64 length ${r.images[0].base64.length}` : "OK pero sin base64");
} catch (e) {
  console.error("FALLO:", e.message);
}
