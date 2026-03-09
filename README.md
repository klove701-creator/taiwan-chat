# 🇹🇼 Taiwan 중국어 연습 앱

대만 번체 중국어 학습 웹앱이에요.  
AI 대화 연습 / 암기 카드 / 즉석 번역 기능이 있어요.

---

## 🚀 배포 방법 (Netlify)

### 1단계 — 패키지 설치
```bash
npm install
```

### 2단계 — 로컬 테스트 (선택)
```bash
# netlify-cli 설치 (처음 한 번만)
npm install -g netlify-cli

# 로컬 실행 (.env 파일 필요)
netlify dev
```

### 3단계 — Netlify 배포

1. [netlify.com](https://netlify.com) 에서 회원가입
2. **"Add new site" → "Import an existing project"** 클릭
3. GitHub에 이 폴더 올리거나, **"Deploy manually"** 로 `dist` 폴더 드래그

또는 CLI로:
```bash
npm run build
netlify deploy --prod --dir=dist
```

### 4단계 — 환경변수 설정 ⚠️ 중요!

Netlify 대시보드 → **Site settings → Environment variables** 에서 추가:

| 키 | 값 |
|----|----|
| `ANTHROPIC_API_KEY` | Anthropic 콘솔에서 발급한 API 키 |
| `APP_PASSWORD` | 가족/친구와 공유할 비밀번호 (예: taiwan2024) |

---

## 📁 폴더 구조

```
taiwan-chat/
├── src/
│   ├── main.jsx          # React 진입점
│   ├── App.jsx           # 로그인 게이트
│   ├── Login.jsx         # 비밀번호 입력 화면
│   └── TaiwanApp.jsx     # 메인 앱 (대화/암기/번역)
├── netlify/
│   └── functions/
│       └── chat.js       # API 키 숨기는 서버 함수
├── index.html
├── vite.config.js
├── netlify.toml
└── package.json
```

---

## 🔑 API 키 발급

1. [console.anthropic.com](https://console.anthropic.com) 접속
2. **API Keys** → **Create Key**
3. 발급된 키를 Netlify 환경변수에 입력

---

## 💡 기능 소개

- **💬 대화 연습** — 대만 식당 AI와 실제 대화 (한국어/번체/콩글리쉬 입력 가능)
- **🃏 암기 카드** — 식당/기본인사/숫자 플래시카드
- **🔍 번역** — 궁금한 문장 즉석 번역 + 단어별 분해
