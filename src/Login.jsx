import { useState } from "react";

export default function Login({ onLogin }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!pw.trim()) return;
    setLoading(true);
    setError("");
    try {
      // 비밀번호 확인을 위해 가벼운 API 호출 테스트
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: pw,
          model: "claude-haiku-4-5-20251001",
          max_tokens: 10,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setError("❌ 비밀번호가 틀렸어요!");
      } else if (data.error) {
        setError("⚠️ 오류가 발생했어요. 다시 시도해주세요.");
      } else {
        onLogin(pw);
      }
    } catch {
      setError("⚠️ 연결 오류. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #fff5f0 0%, #fff0e8 50%, #ffe8d6 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Noto Sans KR', sans-serif",
      padding: "20px",
    }}>
      <div style={{
        width: "100%", maxWidth: 380,
        background: "white", borderRadius: 28,
        padding: "40px 32px",
        boxShadow: "0 16px 60px rgba(212,56,13,0.15)",
        border: "1px solid #ffe0cc",
        textAlign: "center",
      }}>
        {/* 로고 */}
        <div style={{ fontSize: 52, marginBottom: 12 }}>🇹🇼</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#d4380d", marginBottom: 4 }}>
          대만어 연습 앱
        </div>
        <div style={{ fontSize: 14, color: "#aaa", marginBottom: 32 }}>
          繁體中文 學習
        </div>

        {/* 입력 */}
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          placeholder="비밀번호를 입력해주세요"
          style={{
            width: "100%", boxSizing: "border-box",
            border: error ? "1.5px solid #fca5a5" : "1.5px solid #ffe0cc",
            borderRadius: 14, padding: "13px 16px",
            fontSize: 16, outline: "none",
            fontFamily: "'Noto Sans KR', sans-serif",
            background: "#fffaf8", marginBottom: 10,
            transition: "border-color 0.2s",
          }}
        />

        {error && (
          <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 10 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || !pw.trim()}
          style={{
            width: "100%",
            background: loading || !pw.trim()
              ? "#ffd6c0"
              : "linear-gradient(135deg, #d4380d, #ff6b35)",
            border: "none", borderRadius: 14,
            padding: "14px", color: "white",
            fontSize: 16, fontWeight: 700,
            cursor: loading || !pw.trim() ? "not-allowed" : "pointer",
            boxShadow: loading || !pw.trim() ? "none" : "0 6px 20px rgba(212,56,13,0.3)",
            transition: "all 0.2s",
            fontFamily: "'Noto Sans KR', sans-serif",
          }}
        >
          {loading ? "확인 중..." : "입장하기 →"}
        </button>

        <div style={{ fontSize: 12, color: "#ccc", marginTop: 20 }}>
          가족/친구 전용 앱이에요 🔒
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700;800&display=swap');
      `}</style>
    </div>
  );
}
