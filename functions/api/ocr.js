/* /api/ocr  — 서류 사진 분석: OCR + 번역 + 항목별 작성법 + 다음에 할 일
   프런트가 그대로 쓰는 4개 언어 구조로 반환. */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "content-type": "application/json" } });

export const onRequestOptions = () => new Response(null, { headers: CORS });

// 다음 단계로 연결할 기관·상황 (프런트 INSTITUTIONS 의 id 와 일치해야 화면 이동됨)
const CATALOG = {
  "immig/arc": "출입국·외국인청 — 외국인등록증 발급",
  "immig/ext": "출입국·외국인청 — 체류기간 연장",
  "gov/movein": "행정복지센터 — 전입신고",
  "gov/cert": "행정복지센터 — 각종 증명서 발급",
  "hospital/visit": "병원 — 진료 접수 & 문진표",
  "hospital/er": "병원 — 응급실 이용",
};
const CATALOG_KEYS = Object.keys(CATALOG);

async function claudeText(env, body) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("Anthropic " + r.status + ": " + (await r.text()).slice(0, 300));
  const data = await r.json();
  return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
}

function parseJSON(raw) {
  let s = (raw || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a !== -1 && b !== -1) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.ANTHROPIC_API_KEY)
      return json({ error: "Missing ANTHROPIC_API_KEY. Set it in Cloudflare Pages → Settings → Variables and Secrets." }, 500);

    const { image, mediaType = "image/jpeg", lang = "ko" } = await request.json();
    if (!image) return json({ error: "Missing image (base64)" }, 400);

    const catalogList = CATALOG_KEYS.map(k => `- "${k}" : ${CATALOG[k]}`).join("\n");

    const system =
`You analyze a photo of a Korean administrative or medical document for a foreign resident.
The user's language code is "${lang}".
Return the answer as a SINGLE JSON object and NOTHING else. Every user-facing string must be
provided in all four languages: ko, en, zh (Simplified Chinese), vi (Vietnamese).

JSON shape:
{
  "docName": {"ko":"","en":"","zh":"","vi":""},
  "fields": [
    { "ko":"성명(영문)",
      "label": {"ko":"","en":"","zh":"","vi":""},
      "guide": {"ko":"","en":"","zh":"","vi":""} }
  ],
  "next": {
    "instId": "",
    "sitId": "",
    "text": {"ko":"","en":"","zh":"","vi":""}
  }
}

"fields": up to 6 key fields the user must fill; "guide" is a short practical tip.
For "next", choose the single best match from these options (use the id BEFORE and AFTER the slash):
${catalogList}
If unsure, use "immig"/"arc". Keep guidance concise and accurate for real Korean procedures.`;

    const raw = await claudeText(env, {
      model: env.MODEL_SMART || "claude-sonnet-5",
      max_tokens: 1800,
      system,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
          { type: "text", text: "Analyze this document and return the JSON described above." },
        ],
      }],
    });

    const data = parseJSON(raw);
    const pair = `${data?.next?.instId}/${data?.next?.sitId}`;
    if (!CATALOG_KEYS.includes(pair)) {
      data.next = data.next || {};
      data.next.instId = "immig";
      data.next.sitId = "arc";
    }
    return json(data);
  } catch (err) {
    return json({ error: "OCR failed", detail: String(err.message || err) }, 502);
  }
}
