/* /api/translate  — 텍스트 번역 (Cloudflare Pages Function)
   키는 Cloudflare 환경변수(ANTHROPIC_API_KEY)에만 저장됩니다. */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "content-type": "application/json" } });

export const onRequestOptions = () => new Response(null, { headers: CORS });

const LANG_NAME = { ko: "한국어(Korean)", en: "English", zh: "중국어 간체(Simplified Chinese)", vi: "베트남어(Vietnamese)" };
const langName = c => LANG_NAME[c] || c;

async function claude(env, { model, max_tokens, system, messages }) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, max_tokens, system, messages }),
  });
  if (!r.ok) throw new Error("Anthropic " + r.status + ": " + (await r.text()).slice(0, 300));
  const data = await r.json();
  return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
}

export async function translateText(env, text, source, target) {
  if (!text || !text.trim()) return "";
  if (source === target) return text;
  const system =
    `You are a translator inside an app that helps foreign residents in Korea at ` +
    `hospitals and government offices. Translate the user's message from ${langName(source)} ` +
    `to ${langName(target)}. Keep it natural, polite, and appropriate for an ` +
    `administrative or medical setting. Output ONLY the translation — no quotes, no notes.`;
  return claude(env, {
    model: env.MODEL_FAST || "claude-haiku-4-5-20251001",
    max_tokens: 700,
    system,
    messages: [{ role: "user", content: text }],
  });
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.ANTHROPIC_API_KEY)
      return json({ error: "Missing ANTHROPIC_API_KEY. Set it in Cloudflare Pages → Settings → Variables and Secrets." }, 500);
    const { text, source = "auto", target = "en" } = await request.json();
    const translation = await translateText(env, text, source, target);
    return json({ translation });
  } catch (err) {
    return json({ error: "Translation failed", detail: String(err.message || err) }, 502);
  }
}
