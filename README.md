# 동행 — Cloudflare Pages 배포

프런트(정적) + 백엔드(Pages Functions)를 **한 프로젝트로** 배포합니다.
API 키는 Cloudflare에만 저장되고 브라우저로 내려가지 않습니다.

## 폴더 구조 (이대로 두세요)
```
donghaeng-cloudflare/
├─ index.html                ← 사이트 첫 화면 (이름 반드시 index.html)
└─ functions/
   └─ api/
      ├─ translate.js        → /api/translate
      ├─ interpret.js        → /api/interpret
      └─ ocr.js              → /api/ocr
```
- `functions/` 폴더는 **프로젝트 루트**에 있어야 합니다(빌드 출력 폴더 안 아님).
- 파일 경로가 그대로 API 주소가 됩니다. 예: `functions/api/ocr.js` → `/api/ocr`.
- 별도 빌드/설치 과정 없음(순수 fetch만 사용). `node_modules` 불필요.

---

## 방법 A. 대시보드로 배포 (가장 쉬움)
1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Upload assets**
2. `donghaeng-cloudflare` 폴더 통째로 업로드 (또는 GitHub 저장소 연결)
   - 프레임워크 프리셋: **None**
   - 빌드 명령: **(비움)**  ·  빌드 출력 디렉터리: **/** (루트)
3. 배포 후 **Settings → Variables and Secrets** 에서 아래를 추가하고 다시 배포:

   | 이름 | 값 | 종류 |
   |---|---|---|
   | `ANTHROPIC_API_KEY` | `sk-ant-...` | **Secret(암호화)** 권장 |
   | `MODEL_FAST` | `claude-haiku-4-5-20251001` | (선택) |
   | `MODEL_SMART` | `claude-sonnet-5` | (선택) |

4. 끝. `https://<프로젝트>.pages.dev` 로 접속하면 실제 AI가 동작합니다.

> 키를 넣지 않으면 UI·절차 안내는 잘 뜨지만 번역/서류분석은 "Missing ANTHROPIC_API_KEY" 오류가 납니다.

## 방법 B. Wrangler(CLI)로 배포
```bash
npm install -g wrangler
wrangler login
cd donghaeng-cloudflare
wrangler pages deploy . --project-name donghaeng
# 배포 후 키 등록 (Secret)
wrangler pages secret put ANTHROPIC_API_KEY --project-name donghaeng
```
로컬 미리보기: `wrangler pages dev .`  (같은 폴더에 `.dev.vars` 파일을 만들고 `ANTHROPIC_API_KEY=sk-ant-...` 넣으면 로컬에서도 AI 테스트 가능)

---

## 동작 방식
- 프런트 `index.html` 은 `BACKEND_BASE: ""`, `USE_MOCK: false` 로 설정돼 있어
  같은 도메인의 `/api/*` 를 호출합니다 → **CORS 문제 없음**.
- 서류 촬영의 "샘플로 시연" 버튼은 키가 없어도 항상 목업으로 동작(발표용).
- 통역의 음성인식은 브라우저 Web Speech API(무료), 번역만 서버가 처리.

## 자주 겪는 문제
- **API가 404** → `functions/` 가 루트에 있는지, 출력 디렉터리를 하위폴더로 지정하지 않았는지 확인.
- **AI만 오류** → 키 미등록 또는 변수 등록 후 재배포 안 함. Secret 추가 후 반드시 재배포.
- **모델 오류** → `MODEL_SMART`/`MODEL_FAST` 값이 현재 사용 가능한 모델인지 확인.

## 참고
- 앞서 드린 `donghaeng-backend`(Express) 폴더는 Render/Railway 같은 Node 호스팅용입니다.
  **Cloudflare로 배포할 때는 이 폴더를 쓰지 않습니다.**(Pages Functions가 그 역할을 대신함)
- Pages Functions 문서: https://developers.cloudflare.com/pages/functions/
