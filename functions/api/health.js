/* /api/health — 배포·키 상태 확인용
   브라우저에서 https://<프로젝트>.pages.dev/api/health 로 열어보세요. */
export function onRequestGet({ env }) {
  return new Response(JSON.stringify({
    ok: true,
    functions: "deployed",
    keyConfigured: !!env.ANTHROPIC_API_KEY,
    models: {
      fast: env.MODEL_FAST || "claude-haiku-4-5-20251001",
      smart: env.MODEL_SMART || "claude-sonnet-5",
    },
  }), { headers: { "content-type": "application/json" } });
}
