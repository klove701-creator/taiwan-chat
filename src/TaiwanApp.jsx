import { useState, useRef, useEffect } from "react";

async function callAPI(body) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ────────────────────────────────────────────────
// 데이터
// ────────────────────────────────────────────────
function makeSystemPrompt(scenario) {
  return `你是一位熱情的台灣${scenario} 상황의 직원 또는 현지인，名字叫小美。你正在幫助韓國學習者練習台灣中文（繁體字）對話。현재 상황: ${scenario}

【응답 형식 - 반드시 아래 구조를 정확히 지켜줘】

사용자가 한국어로 입력했을 때:
MY_ZH: [한국어를 대만 번체로 번역]
MY_PY: [병음]
MY_KONGL: [한글 발음]
MY_KR: [한국어 뜻]
MY_WORDS: [단어별 분해. 형식: 글자(콩글리쉬)=뜻|글자(콩글리쉬)=뜻]
REP_ZH: [小美 대만어 번체 답변]
REP_PY: [병음]
REP_KONGL: [한글 발음]
REP_KR: [한국어 번역]
REP_WORDS: [단어별 분해. 형식: 글자(콩글리쉬)=뜻|글자(콩글리쉬)=뜻]

사용자가 중국어로 입력했을 때:
REP_ZH: / REP_PY: / REP_KONGL: / REP_KR: / REP_WORDS: 만

사용자가 콩글리쉬로 입력했을 때:
DETECT: [어떤 말인지 한국어로]
그 다음 REP_ 블록

오류 있을 때만: CORRECT: [교정]

【콩글리쉬 인식 규칙 - 매우 중요】
콩글리쉬는 대만 중국어 발음을 한글로 표기한 것. 사용자가 콩글리쉬로 입력하면 아래 대응표를 최우선으로 참조해서 인식해.

【콩글리쉬→한자 필수 대응표】
이 대응표는 입력 인식 AND 콩글리쉬 출력 모두에 사용. 출력할 때도 반드시 아래 표기를 따를 것.

這個(zhège) → 쩌거 (절대 "젤거" 금지)
那個(nàgè) → 나거
我(wǒ) → 워
要(yào) → 야오
給(gěi) → 게이 (절대 "거이" 금지)
給我(gěi wǒ) → 게이 워
我要(wǒ yào) → 워 야오
我要這個(wǒ yào zhège) → 워 야오 쩌거
指(zhǐ) → 즈
哪一個(nǎ yī ge) → 나 이 거
多少(duōshao) → 뚜어샤오
錢(qián) → 치엔
買單(mǎidān) → 마이단
你好(nǐ hǎo) → 니 하오
謝謝(xièxie) → 시에시에
不客氣(bú kèqi) → 부 커치
對不起(duìbuqǐ) → 뚜이부치
沒關係(méi guānxi) → 메이 관시
菜單(càidān) → 차이단
點菜(diǎn cài) → 디엔 차이
好吃(hǎo chī) → 하오 츠
哪裡(nǎlǐ) → 나리
在哪裡(zài nǎlǐ) → 짜이 나리
請問(qǐngwèn) → 칭원
歡迎光臨(huānyíng guānglín) → 환잉 광린
好(hǎo) → 하오
你(nǐ) → 니
想(xiǎng) → 시앙
看(kàn) → 칸
啦(la) → 라

핵심 발음 규칙: zh→ㅈ(쩌/주/지), ch→ㅊ(처/추), sh→ㅅ(서/수), g→ㄱ(게/가/고), x→시, q→치, j→지

규칙: 대만식 번체, 쉽고 짧은 문장, WORDS는 의미단위로 분해, 처음은 ${scenario} 상황에 맞는 자연스러운 첫인사`;
}

const PRESET_SCENARIOS = [
  { emoji:"🍜", label:"식당" },
  { emoji:"🏪", label:"편의점" },
  { emoji:"🐟", label:"수산시장" },
  { emoji:"☕", label:"카페" },
  { emoji:"🚕", label:"택시" },
  { emoji:"🏥", label:"병원" },
  { emoji:"🛍️", label:"쇼핑몰" },
  { emoji:"🏨", label:"호텔" },
];

const HINT_PHRASES = [
  { zh:"一個人", py:"Yī gè rén", kongl:"이 거 런", kr:"혼자예요",
    words:[{zh:"一",kongl:"이",kr:"하나"},{zh:"個",kongl:"거",kr:"개(단위)"},{zh:"人",kongl:"런",kr:"사람"}]},
  { zh:"菜單在哪裡？", py:"Càidān zài nǎlǐ?", kongl:"차이단 짜이 나리?", kr:"메뉴판 어디 있어요?",
    words:[{zh:"菜單",kongl:"차이단",kr:"메뉴판"},{zh:"在",kongl:"짜이",kr:"~에 있다"},{zh:"哪裡",kongl:"나리",kr:"어디"}]},
  { zh:"我要點菜", py:"Wǒ yào diǎn cài", kongl:"워 야오 디엔 차이", kr:"주문할게요",
    words:[{zh:"我",kongl:"워",kr:"나"},{zh:"要",kongl:"야오",kr:"~할게요"},{zh:"點菜",kongl:"디엔차이",kr:"주문하다"}]},
  { zh:"這個多少錢？", py:"Zhège duōshao qián?", kongl:"저거 뚜어샤오 치엔?", kr:"이거 얼마예요?",
    words:[{zh:"這個",kongl:"저거",kr:"이것"},{zh:"多少",kongl:"뚜어샤오",kr:"얼마/몇"},{zh:"錢",kongl:"치엔",kr:"돈"}]},
  { zh:"買單", py:"Mǎidān", kongl:"마이단", kr:"계산할게요",
    words:[{zh:"買",kongl:"마이",kr:"사다"},{zh:"單",kongl:"단",kr:"계산서"}]},
  { zh:"好吃！", py:"Hǎo chī!", kongl:"하오 츠!", kr:"맛있어요!",
    words:[{zh:"好",kongl:"하오",kr:"좋다"},{zh:"吃",kongl:"츠",kr:"먹다"}]},
];

// 암기카드 덱 데이터
const CARD_DECKS = [
  {
    id: "restaurant", label: "🍜 식당", color: "#d4380d",
    cards: [
      { zh:"歡迎光臨", py:"Huānyíng guānglín", kongl:"환잉 광린", kr:"어서오세요",
        words:[{zh:"歡迎",kongl:"환잉",kr:"환영하다"},{zh:"光臨",kongl:"광린",kr:"왕림하다"}] },
      { zh:"幾位？", py:"Jǐ wèi?", kongl:"지 웨이?", kr:"몇 분이세요?",
        words:[{zh:"幾",kongl:"지",kr:"몇"},{zh:"位",kongl:"웨이",kr:"분(높임)"}] },
      { zh:"這是菜單", py:"Zhè shì càidān", kongl:"저 스 차이단", kr:"여기 메뉴판이에요",
        words:[{zh:"這",kongl:"저",kr:"이것"},{zh:"是",kongl:"스",kr:"~이다"},{zh:"菜單",kongl:"차이단",kr:"메뉴판"}] },
      { zh:"我要點菜", py:"Wǒ yào diǎn cài", kongl:"워 야오 디엔 차이", kr:"주문할게요",
        words:[{zh:"我",kongl:"워",kr:"나"},{zh:"要",kongl:"야오",kr:"~할게요"},{zh:"點菜",kongl:"디엔차이",kr:"주문하다"}] },
      { zh:"這個是什麼？", py:"Zhège shì shénme?", kongl:"저거 스 션머?", kr:"이건 뭐예요?",
        words:[{zh:"這個",kongl:"저거",kr:"이것"},{zh:"是",kongl:"스",kr:"~이다"},{zh:"什麼",kongl:"션머",kr:"무엇"}] },
      { zh:"好吃！", py:"Hǎo chī!", kongl:"하오 츠!", kr:"맛있어요!",
        words:[{zh:"好",kongl:"하오",kr:"좋다"},{zh:"吃",kongl:"츠",kr:"먹다"}] },
      { zh:"買單", py:"Mǎidān", kongl:"마이단", kr:"계산할게요",
        words:[{zh:"買",kongl:"마이",kr:"사다"},{zh:"單",kongl:"단",kr:"계산서"}] },
      { zh:"多少錢？", py:"Duōshao qián?", kongl:"뚜어샤오 치엔?", kr:"얼마예요?",
        words:[{zh:"多少",kongl:"뚜어샤오",kr:"얼마/몇"},{zh:"錢",kongl:"치엔",kr:"돈"}] },
    ]
  },
  {
    id: "basic", label: "👋 기본인사", color: "#0284c7",
    cards: [
      { zh:"你好", py:"Nǐ hǎo", kongl:"니 하오", kr:"안녕하세요",
        words:[{zh:"你",kongl:"니",kr:"당신/너"},{zh:"好",kongl:"하오",kr:"좋다"}] },
      { zh:"謝謝", py:"Xièxie", kongl:"시에시에", kr:"감사합니다",
        words:[{zh:"謝謝",kongl:"시에시에",kr:"감사합니다"}] },
      { zh:"對不起", py:"Duìbuqǐ", kongl:"뚜이부치", kr:"죄송합니다",
        words:[{zh:"對",kongl:"뚜이",kr:"맞다"},{zh:"不",kongl:"부",kr:"~않다"},{zh:"起",kongl:"치",kr:"일어나다(관용)"}] },
      { zh:"沒關係", py:"Méi guānxi", kongl:"메이 관시", kr:"괜찮아요",
        words:[{zh:"沒",kongl:"메이",kr:"없다"},{zh:"關係",kongl:"관시",kr:"관계/상관"}] },
      { zh:"不客氣", py:"Bú kèqi", kongl:"부 커치", kr:"천만에요",
        words:[{zh:"不",kongl:"부",kr:"~않다"},{zh:"客氣",kongl:"커치",kr:"사양하다"}] },
      { zh:"再見", py:"Zàijiàn", kongl:"짜이지엔", kr:"잘 가요/안녕히",
        words:[{zh:"再",kongl:"짜이",kr:"다시"},{zh:"見",kongl:"지엔",kr:"만나다"}] },
    ]
  },
  {
    id: "numbers", label: "🔢 숫자", color: "#7c3aed",
    cards: [
      { zh:"一", py:"Yī", kongl:"이", kr:"1", words:[{zh:"一",kongl:"이",kr:"하나/1"}] },
      { zh:"二", py:"Èr", kongl:"얼", kr:"2", words:[{zh:"二",kongl:"얼",kr:"둘/2"}] },
      { zh:"三", py:"Sān", kongl:"산", kr:"3", words:[{zh:"三",kongl:"산",kr:"셋/3"}] },
      { zh:"四", py:"Sì", kongl:"쓰", kr:"4", words:[{zh:"四",kongl:"쓰",kr:"넷/4"}] },
      { zh:"五", py:"Wǔ", kongl:"우", kr:"5", words:[{zh:"五",kongl:"우",kr:"다섯/5"}] },
      { zh:"十", py:"Shí", kongl:"스", kr:"10", words:[{zh:"十",kongl:"스",kr:"열/10"}] },
      { zh:"百", py:"Bǎi", kongl:"바이", kr:"100", words:[{zh:"百",kongl:"바이",kr:"백/100"}] },
      { zh:"多少錢？", py:"Duōshao qián?", kongl:"뚜어샤오 치엔?", kr:"얼마예요?",
        words:[{zh:"多少",kongl:"뚜어샤오",kr:"얼마"},{zh:"錢",kongl:"치엔",kr:"돈"}] },
    ]
  },
];

// ────────────────────────────────────────────────
// 유틸
// ────────────────────────────────────────────────
function parseRaw(raw) {
  const p = { myZh:"",myPy:"",myKongl:"",myKr:"",myWords:[],repZh:"",repPy:"",repKongl:"",repKr:"",repWords:[],detect:"",correct:"",extra:[] };
  raw.split("\n").forEach(line => {
    if (line.startsWith("MY_ZH:")) p.myZh=line.slice(6).trim();
    else if (line.startsWith("MY_PY:")) p.myPy=line.slice(6).trim();
    else if (line.startsWith("MY_KONGL:")) p.myKongl=line.slice(9).trim();
    else if (line.startsWith("MY_KR:")) p.myKr=line.slice(6).trim();
    else if (line.startsWith("MY_WORDS:")) p.myWords=parseWords(line.slice(9).trim());
    else if (line.startsWith("REP_ZH:")) p.repZh=line.slice(7).trim();
    else if (line.startsWith("REP_PY:")) p.repPy=line.slice(7).trim();
    else if (line.startsWith("REP_KONGL:")) p.repKongl=line.slice(10).trim();
    else if (line.startsWith("REP_KR:")) p.repKr=line.slice(7).trim();
    else if (line.startsWith("REP_WORDS:")) p.repWords=parseWords(line.slice(10).trim());
    else if (line.startsWith("DETECT:")) p.detect=line.slice(7).trim();
    else if (line.startsWith("CORRECT:")) p.correct=line.slice(8).trim();
    else if (line.trim()) p.extra.push(line.trim());
  });
  return p;
}
function parseWords(str) {
  if (!str) return [];
  return str.split("|").map(t => {
    const m = t.match(/^(.+?)\((.+?)\)=(.+)$/);
    return m ? {zh:m[1],kongl:m[2],kr:m[3]} : {zh:t,kongl:"",kr:""};
  }).filter(w=>w.zh);
}

// ────────────────────────────────────────────────
// 공용 팝업 컴포넌트
// ────────────────────────────────────────────────
function WordChip({ kongl, zh, py, kr, words, accentColor="#d4380d" }) {
  const [open, setOpen] = useState(false);
  if (!kongl) return null;
  return (
    <span style={{ position:"relative", display:"inline-block" }}>
      <span onClick={()=>setOpen(v=>!v)} style={{
        display:"inline-flex", alignItems:"center", gap:4,
        background: open?"#fef3c7":"#fffbeb",
        border:`1.5px solid ${open?"#f59e0b":"#fcd34d"}`,
        borderRadius:8, padding:"3px 10px",
        fontSize:14, color:"#92400e", fontWeight:700,
        cursor:"pointer", userSelect:"none", transition:"all 0.15s",
      }}>
        🗣️ {kongl}
        <span style={{fontSize:10,opacity:0.5}}>{open?"▴":"▾"}</span>
      </span>
      {open && <>
        <span onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:90}}/>
        <div style={{
          position:"absolute", bottom:"calc(100% + 10px)", left:0,
          background:"white", borderRadius:16,
          boxShadow:"0 12px 40px rgba(0,0,0,0.18)",
          border:"1.5px solid #fde68a",
          padding:"16px 16px 14px", minWidth:260, maxWidth:320, zIndex:100,
        }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:12,color:"#f59e0b",fontWeight:800,letterSpacing:0.5}}>🔍 단어별 분해</span>
            <span onClick={()=>setOpen(false)} style={{cursor:"pointer",fontSize:18,color:"#ccc"}}>×</span>
          </div>
          <div style={{background:"#fffbeb",borderRadius:10,padding:"8px 12px",marginBottom:12,borderLeft:"3px solid #fbbf24"}}>
            <div style={{fontSize:18,fontWeight:800,color:accentColor,fontFamily:"'Noto Serif TC',serif"}}>{zh}</div>
            <div style={{fontSize:11,color:"#bbb",fontStyle:"italic"}}>{py}</div>
            <div style={{fontSize:13,color:"#555",fontFamily:"'Noto Sans KR',sans-serif"}}>→ {kr}</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {(words||[]).map((w,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,background:"#f9fafb",borderRadius:10,padding:"8px 12px",border:"1px solid #f0f0f0"}}>
                <div style={{fontSize:22,fontWeight:800,color:accentColor,fontFamily:"'Noto Serif TC',serif",minWidth:38,textAlign:"center"}}>{w.zh}</div>
                <div>
                  <div style={{fontSize:12,color:"#f59e0b",fontWeight:700}}>{w.kongl}</div>
                  <div style={{fontSize:13,color:"#444",fontFamily:"'Noto Sans KR',sans-serif"}}>{w.kr}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{position:"absolute",bottom:-9,left:20,width:16,height:16,background:"white",border:"1.5px solid #fde68a",borderTop:"none",borderLeft:"none",transform:"rotate(45deg)"}}/>
        </div>
      </>}
    </span>
  );
}

// ────────────────────────────────────────────────
// 암기 카드 모드
// ────────────────────────────────────────────────
function FlashCard({ card, accentColor }) {
  const [flipped, setFlipped] = useState(false);
  const [result, setResult] = useState(null); // 'know' | 'unsure'

  const handleResult = (r) => {
    setResult(r);
    setTimeout(() => { setResult(null); setFlipped(false); }, 400);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,width:"100%"}}>
      {/* 카드 */}
      <div
        onClick={() => setFlipped(v=>!v)}
        style={{
          width:"100%", minHeight:220,
          background: result==="know" ? "linear-gradient(135deg,#dcfce7,#bbf7d0)"
                    : result==="unsure" ? "linear-gradient(135deg,#fff7ed,#fed7aa)"
                    : "white",
          borderRadius:24,
          boxShadow: flipped
            ? `0 8px 32px ${accentColor}33`
            : "0 4px 20px rgba(0,0,0,0.08)",
          border: flipped ? `2px solid ${accentColor}55` : "2px solid #f0f0f0",
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
          padding:"28px 24px", cursor:"pointer",
          transition:"all 0.25s",
          userSelect:"none",
          position:"relative",
        }}
      >
        {/* 앞면: 한국어 */}
        {!flipped && (
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:13,color:"#aaa",marginBottom:12,letterSpacing:1}}>🇰🇷 뜻을 보고 대만어로 말해보세요</div>
            <div style={{fontSize:32,fontWeight:800,color:"#222",fontFamily:"'Noto Sans KR',sans-serif"}}>{card.kr}</div>
            <div style={{fontSize:13,color:"#ccc",marginTop:16}}>탭해서 확인 👆</div>
          </div>
        )}
        {/* 뒷면: 번체 + 분해 */}
        {flipped && (
          <div style={{textAlign:"center",width:"100%"}}>
            <div style={{fontSize:13,color:accentColor,marginBottom:8,letterSpacing:1,fontWeight:700}}>🇹🇼 정답</div>
            <div style={{fontSize:38,fontWeight:800,color:accentColor,fontFamily:"'Noto Serif TC',serif",marginBottom:4}}>{card.zh}</div>
            <div style={{fontSize:14,color:"#aaa",fontStyle:"italic",marginBottom:12}}>{card.py}</div>
            {/* 단어 분해 칩 */}
            <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:8,marginBottom:12}}>
              {(card.words||[]).map((w,i)=>(
                <div key={i} style={{
                  background:"#f9fafb", borderRadius:12,
                  padding:"6px 12px", border:"1px solid #eee",
                  textAlign:"center",
                }}>
                  <div style={{fontSize:20,fontWeight:800,color:accentColor,fontFamily:"'Noto Serif TC',serif"}}>{w.zh}</div>
                  <div style={{fontSize:11,color:"#f59e0b",fontWeight:700}}>{w.kongl}</div>
                  <div style={{fontSize:12,color:"#555",fontFamily:"'Noto Sans KR',sans-serif"}}>{w.kr}</div>
                </div>
              ))}
            </div>
            {/* 콩글리쉬 */}
            <div style={{
              display:"inline-block",
              background:"#fffbeb", border:"1.5px solid #fcd34d",
              borderRadius:10, padding:"5px 14px",
              fontSize:15, fontWeight:700, color:"#92400e",
            }}>🗣️ {card.kongl}</div>
          </div>
        )}
      </div>

      {/* 버튼 */}
      {flipped && (
        <div style={{display:"flex",gap:12,width:"100%"}}>
          <button onClick={()=>handleResult("unsure")} style={{
            flex:1, padding:"14px", borderRadius:16, border:"2px solid #fed7aa",
            background:"white", cursor:"pointer", fontSize:15, fontWeight:700,
            color:"#ea580c", transition:"all 0.15s",
          }}>😅 다시 볼게요</button>
          <button onClick={()=>handleResult("know")} style={{
            flex:1, padding:"14px", borderRadius:16, border:"none",
            background:`linear-gradient(135deg,${accentColor},${accentColor}cc)`,
            cursor:"pointer", fontSize:15, fontWeight:700,
            color:"white", boxShadow:`0 4px 12px ${accentColor}44`,
            transition:"all 0.15s",
          }}>✅ 알았어요!</button>
        </div>
      )}
      {!flipped && (
        <div style={{fontSize:13,color:"#ccc",fontFamily:"'Noto Sans KR',sans-serif"}}>
          카드를 탭하면 정답이 나와요
        </div>
      )}
    </div>
  );
}

function FlashCardMode() {
  const [deckId, setDeckId] = useState("restaurant");
  const [idx, setIdx] = useState(0);
  const [known, setKnown] = useState([]);
  const [unsure, setUnsure] = useState([]);
  const [done, setDone] = useState(false);

  const deck = CARD_DECKS.find(d=>d.id===deckId);
  const cards = deck.cards;
  const card = cards[idx];

  const handleResult = (r) => {
    if (r==="know") setKnown(p=>[...p,idx]);
    else setUnsure(p=>[...p,idx]);
    if (idx+1 >= cards.length) setDone(true);
    else setIdx(i=>i+1);
  };

  const reset = (newDeckId) => {
    const id = newDeckId || deckId;
    setDeckId(id);
    setIdx(0); setKnown([]); setUnsure([]); setDone(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* 덱 선택 */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {CARD_DECKS.map(d=>(
          <button key={d.id} onClick={()=>reset(d.id)} style={{
            padding:"7px 14px", borderRadius:20, border:"none",
            background: deckId===d.id ? d.color : "#f0f0f0",
            color: deckId===d.id ? "white" : "#666",
            fontWeight:700, fontSize:13, cursor:"pointer",
            fontFamily:"'Noto Sans KR',sans-serif",
            boxShadow: deckId===d.id ? `0 4px 12px ${d.color}44` : "none",
            transition:"all 0.2s",
          }}>{d.label}</button>
        ))}
      </div>

      {/* 진행 바 */}
      <div style={{background:"#f0f0f0",borderRadius:99,height:8,overflow:"hidden"}}>
        <div style={{
          height:"100%", borderRadius:99,
          background:`linear-gradient(90deg,${deck.color},${deck.color}99)`,
          width:`${done ? 100 : (idx/cards.length)*100}%`,
          transition:"width 0.4s",
        }}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#aaa",fontFamily:"'Noto Sans KR',sans-serif"}}>
        <span>{done ? cards.length : idx} / {cards.length} 완료</span>
        <span>✅ {known.length} · 😅 {unsure.length}</span>
      </div>

      {/* 완료 화면 */}
      {done ? (
        <div style={{
          background:"white", borderRadius:24, padding:"32px 24px",
          textAlign:"center", boxShadow:"0 4px 20px rgba(0,0,0,0.08)",
        }}>
          <div style={{fontSize:48,marginBottom:12}}>🎉</div>
          <div style={{fontSize:22,fontWeight:800,marginBottom:6,fontFamily:"'Noto Sans KR',sans-serif"}}>
            덱 완료!
          </div>
          <div style={{fontSize:15,color:"#888",marginBottom:24,fontFamily:"'Noto Sans KR',sans-serif"}}>
            ✅ 알았어요 <b style={{color:deck.color}}>{known.length}개</b> &nbsp;·&nbsp;
            😅 복습 필요 <b style={{color:"#ea580c"}}>{unsure.length}개</b>
          </div>
          {unsure.length > 0 && (
            <button onClick={()=>{
              const reviewCards = unsure.map(i=>cards[i]);
              // 틀린 카드만 다시
              setIdx(0); setKnown([]); setUnsure([]); setDone(false);
              // deck을 unsure카드로 교체하는 대신 그냥 처음부터
            }} style={{
              background:"linear-gradient(135deg,#ea580c,#f97316)",
              border:"none", borderRadius:16, padding:"12px 24px",
              color:"white", fontWeight:700, fontSize:15, cursor:"pointer",
              marginBottom:10, display:"block", width:"100%",
              fontFamily:"'Noto Sans KR',sans-serif",
            }}>😅 틀린 것만 다시 ({unsure.length}개)</button>
          )}
          <button onClick={()=>reset()} style={{
            background:"#f5f5f5", border:"none", borderRadius:16, padding:"12px 24px",
            color:"#555", fontWeight:700, fontSize:15, cursor:"pointer",
            display:"block", width:"100%",
            fontFamily:"'Noto Sans KR',sans-serif",
          }}>🔄 처음부터</button>
        </div>
      ) : (
        /* 카드 */
        <FlashCardInner card={card} accentColor={deck.color} onResult={handleResult} />
      )}
    </div>
  );
}

// 카드 단일 컴포넌트 (결과 버튼 포함)
function FlashCardInner({ card, accentColor, onResult }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => { setFlipped(false); }, [card]);

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,width:"100%"}}>
      <div onClick={()=>setFlipped(v=>!v)} style={{
        width:"100%", minHeight:220,
        background:"white",
        borderRadius:24,
        boxShadow: flipped ? `0 8px 32px ${accentColor}33` : "0 4px 20px rgba(0,0,0,0.08)",
        border: flipped ? `2px solid ${accentColor}55` : "2px solid #f0f0f0",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:"28px 24px", cursor:"pointer",
        transition:"all 0.25s", userSelect:"none",
      }}>
        {!flipped ? (
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:13,color:"#bbb",marginBottom:14,letterSpacing:0.5,fontFamily:"'Noto Sans KR',sans-serif"}}>
              🇰🇷 뜻을 보고 대만어로 말해보세요
            </div>
            <div style={{fontSize:34,fontWeight:800,color:"#222",fontFamily:"'Noto Sans KR',sans-serif",lineHeight:1.3}}>
              {card.kr}
            </div>
            <div style={{fontSize:13,color:"#ddd",marginTop:18,fontFamily:"'Noto Sans KR',sans-serif"}}>
              탭해서 확인 👆
            </div>
          </div>
        ) : (
          <div style={{textAlign:"center",width:"100%"}}>
            <div style={{fontSize:12,color:accentColor,marginBottom:10,letterSpacing:1,fontWeight:800,fontFamily:"'Noto Sans KR',sans-serif"}}>
              🇹🇼 정답
            </div>
            <div style={{fontSize:40,fontWeight:800,color:accentColor,fontFamily:"'Noto Serif TC',serif",marginBottom:4}}>
              {card.zh}
            </div>
            <div style={{fontSize:14,color:"#bbb",fontStyle:"italic",marginBottom:14}}>{card.py}</div>
            {/* 단어 분해 */}
            <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:8,marginBottom:14}}>
              {(card.words||[]).map((w,i)=>(
                <div key={i} style={{
                  background:"#f9fafb", borderRadius:12, padding:"6px 12px",
                  border:"1px solid #eee", textAlign:"center", minWidth:48,
                }}>
                  <div style={{fontSize:22,fontWeight:800,color:accentColor,fontFamily:"'Noto Serif TC',serif"}}>{w.zh}</div>
                  <div style={{fontSize:11,color:"#f59e0b",fontWeight:700}}>{w.kongl}</div>
                  <div style={{fontSize:12,color:"#666",fontFamily:"'Noto Sans KR',sans-serif"}}>{w.kr}</div>
                </div>
              ))}
            </div>
            <div style={{
              display:"inline-block", background:"#fffbeb",
              border:"1.5px solid #fcd34d", borderRadius:10,
              padding:"5px 14px", fontSize:15, fontWeight:700, color:"#92400e",
            }}>🗣️ {card.kongl}</div>
          </div>
        )}
      </div>

      {flipped ? (
        <div style={{display:"flex",gap:10,width:"100%"}}>
          <button onClick={()=>onResult("unsure")} style={{
            flex:1, padding:"13px", borderRadius:16,
            border:"2px solid #fed7aa", background:"white",
            cursor:"pointer", fontSize:15, fontWeight:700, color:"#ea580c",
            fontFamily:"'Noto Sans KR',sans-serif",
          }}>😅 다시 볼게요</button>
          <button onClick={()=>onResult("know")} style={{
            flex:1, padding:"13px", borderRadius:16, border:"none",
            background:`linear-gradient(135deg,${accentColor},${accentColor}bb)`,
            cursor:"pointer", fontSize:15, fontWeight:700, color:"white",
            boxShadow:`0 4px 12px ${accentColor}44`,
            fontFamily:"'Noto Sans KR',sans-serif",
          }}>✅ 알았어요!</button>
        </div>
      ) : (
        <div style={{fontSize:13,color:"#ccc",fontFamily:"'Noto Sans KR',sans-serif"}}>카드를 탭하면 정답이 나와요</div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
// 대화 모드
// ────────────────────────────────────────────────
function ChatMode({ msgs, setMsgs, scenario, setScenario }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [scenarioInput, setScenarioInput] = useState("");
  const [starting, setStarting] = useState(false);
  const bottomRef = useRef(null);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs,loading]);

  const startScenario = async (sc) => {
    const s = (sc || scenarioInput).trim();
    if (!s || starting) return;
    setStarting(true);
    try {
      const data = await callAPI({
        model:"claude-haiku-4-5-20251001", max_tokens:600,
        system: makeSystemPrompt(s),
        messages:[{role:"user", content:"지금 상황 시작해줘. 첫 인사만 짧게 해줘."}],
      });
      const reply = data.content?.[0]?.text || "";
      setScenario(s);
      setMsgs([{role:"assistant", raw:reply, id:Date.now()}]);
      setScenarioInput("");
    } finally { setStarting(false); }
  };

  const send = async (text) => {
    const t = text||input.trim();
    if (!t||loading) return;
    const userMsg = {role:"user",raw:t,id:Date.now()};
    const next = [...msgs,userMsg];
    setMsgs(next); setInput(""); setLoading(true); setShowHints(false);
    try {
      const data = await callAPI({
        model:"claude-haiku-4-5-20251001", max_tokens:1200,
        system: makeSystemPrompt(scenario),
        messages:next.map(m=>({role:m.role,content:m.raw})),
      });
      const reply = data.content?.[0]?.text||"REP_ZH: 對不起\nREP_PY: Duìbuqǐ\nREP_KONGL: 뚜이부치\nREP_KR: 다시 말씀해 주세요.\nREP_WORDS: 對不起(뚜이부치)=죄송합니다";
      setMsgs(p=>[...p,{role:"assistant",raw:reply,id:Date.now()+1}]);
    } catch {
      setMsgs(p=>[...p,{role:"assistant",raw:"REP_ZH: 對不起，請再說一遍。\nREP_PY: Duìbuqǐ, qǐng zài shuō yībiàn.\nREP_KONGL: 뚜이부치, 칭 짜이 숴 이 비엔.\nREP_KR: 죄송해요, 다시 말씀해 주세요.\nREP_WORDS: 對不起(뚜이부치)=죄송합니다|請(칭)=~해주세요|再(짜이)=다시|說(숴)=말하다|一遍(이비엔)=한번",id:Date.now()+1}]);
    } finally { setLoading(false); }
  };

  const renderMsg = (msg) => {
    if (msg.role==="user") return (
      <div key={msg.id} style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
        <div style={{background:"linear-gradient(135deg,#ff6b35,#f7931e)",color:"white",borderRadius:"18px 18px 4px 18px",padding:"11px 16px",maxWidth:"70%",fontSize:15,fontFamily:"'Noto Sans KR',sans-serif",boxShadow:"0 2px 12px rgba(255,107,53,0.3)"}}>{msg.raw}</div>
      </div>
    );
    const p = parseRaw(msg.raw);
    return (
      <div key={msg.id} style={{display:"flex",gap:10,marginBottom:20,alignItems:"flex-start"}}>
        <div style={{width:38,height:38,borderRadius:"50%",flexShrink:0,background:"linear-gradient(135deg,#d4380d,#ff6b35)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 2px 8px rgba(212,56,13,0.25)"}}>👩</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,maxWidth:"78%"}}>
          {p.detect && <div style={{fontSize:13,color:"#0369a1",background:"#f0f9ff",borderRadius:10,padding:"7px 12px",fontFamily:"'Noto Sans KR',sans-serif"}}>🔍 {p.detect}</div>}
          {p.myZh && (
            <div style={{background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",border:"1.5px solid #86efac",borderRadius:"4px 14px 14px 14px",padding:"12px 14px"}}>
              <div style={{fontSize:11,color:"#15803d",fontWeight:800,marginBottom:6,letterSpacing:0.5}}>💬 내가 하고 싶은 말</div>
              <div style={{fontSize:21,fontWeight:800,color:"#15803d",marginBottom:1,fontFamily:"'Noto Serif TC',serif"}}>{p.myZh}</div>
              <div style={{fontSize:12,color:"#aaa",fontStyle:"italic",marginBottom:8}}>{p.myPy}</div>
              <WordChip kongl={p.myKongl} zh={p.myZh} py={p.myPy} kr={p.myKr} words={p.myWords} accentColor="#15803d"/>
              <div style={{fontSize:13,color:"#555",marginTop:6,fontFamily:"'Noto Sans KR',sans-serif"}}>🇰🇷 {p.myKr}</div>
            </div>
          )}
          {p.repZh && (
            <div style={{background:"white",border:"1px solid #ffe8d6",borderRadius:"4px 14px 14px 14px",padding:"12px 14px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
              {p.myZh && <div style={{fontSize:11,color:"#d4380d",fontWeight:800,marginBottom:6,letterSpacing:0.5}}>🧧 小美의 대답</div>}
              <div style={{fontSize:21,fontWeight:700,color:"#d4380d",marginBottom:1,fontFamily:"'Noto Serif TC',serif"}}>{p.repZh}</div>
              <div style={{fontSize:12,color:"#aaa",fontStyle:"italic",marginBottom:8}}>{p.repPy}</div>
              <WordChip kongl={p.repKongl} zh={p.repZh} py={p.repPy} kr={p.repKr} words={p.repWords} accentColor="#d4380d"/>
              <div style={{fontSize:13,color:"#555",marginTop:6,fontFamily:"'Noto Sans KR',sans-serif"}}>🇰🇷 {p.repKr}</div>
            </div>
          )}
          {p.extra.length>0 && !p.repZh && !p.myZh && (
            <div style={{background:"white",borderRadius:"4px 14px 14px 14px",padding:"12px 14px",border:"1px solid #ffe8d6",fontSize:14,color:"#444",lineHeight:1.7,fontFamily:"'Noto Sans KR',sans-serif"}}>{p.extra.join("\n")}</div>
          )}
          {p.correct && <div style={{fontSize:13,color:"#7c3aed",background:"#f5f3ff",borderRadius:10,padding:"8px 12px",fontFamily:"'Noto Sans KR',sans-serif"}}>✏️ 교정: {p.correct}</div>}
        </div>
      </div>
    );
  };

  // 상황 선택 화면
  if (!scenario) return (
    <div style={{width:"100%",maxWidth:560,background:"white",borderRadius:20,padding:"24px",boxShadow:"0 4px 24px rgba(0,0,0,0.07)",border:"1px solid #ffe0cc"}}>
      <div style={{fontSize:14,fontWeight:800,color:"#d4380d",marginBottom:14,fontFamily:"'Noto Sans KR',sans-serif"}}>🎭 어떤 상황을 연습할까요?</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:18}}>
        {PRESET_SCENARIOS.map(s=>(
          <button key={s.label} onClick={()=>startScenario(s.label)} disabled={starting} style={{
            background:"#fff5f0", border:"1.5px solid #ffd0b0", borderRadius:20,
            padding:"8px 16px", fontSize:13, color:"#d4380d", cursor:starting?"not-allowed":"pointer",
            fontFamily:"'Noto Sans KR',sans-serif", fontWeight:700,
            opacity: starting?0.6:1,
          }}>{s.emoji} {s.label}</button>
        ))}
      </div>
      <div style={{fontSize:12,color:"#bbb",marginBottom:8,fontFamily:"'Noto Sans KR',sans-serif"}}>또는 직접 입력</div>
      <div style={{display:"flex",gap:8}}>
        <input
          value={scenarioInput}
          onChange={e=>setScenarioInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&startScenario()}
          placeholder="예) 야시장, 약국, 지하철..."
          disabled={starting}
          style={{flex:1,border:"1.5px solid #ffe0cc",borderRadius:12,padding:"11px 14px",fontSize:14,outline:"none",fontFamily:"'Noto Sans KR',sans-serif",background:"#fffaf8"}}
        />
        <button onClick={()=>startScenario()} disabled={starting||!scenarioInput.trim()} style={{
          background:starting||!scenarioInput.trim()?"#ffd6c0":"linear-gradient(135deg,#d4380d,#ff6b35)",
          border:"none",borderRadius:12,padding:"0 18px",color:"white",
          fontSize:14,fontWeight:700,cursor:starting||!scenarioInput.trim()?"not-allowed":"pointer",
          fontFamily:"'Noto Sans KR',sans-serif",
        }}>{starting?"⏳":"시작"}</button>
      </div>
    </div>
  );

  return (
    <>
      {/* 현재 상황 표시 */}
      <div style={{width:"100%",maxWidth:560,display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,padding:"0 4px"}}>
        <div style={{fontSize:13,color:"#d4380d",fontWeight:700,fontFamily:"'Noto Sans KR',sans-serif"}}>
          🎭 현재 상황: <span style={{color:"#ff6b35"}}>{scenario}</span>
        </div>
        <button onClick={()=>{ setScenario(""); setMsgs([]); }} style={{
          background:"transparent",border:"1px solid #ffd0b0",borderRadius:20,
          padding:"4px 12px",fontSize:12,color:"#d4380d",cursor:"pointer",
          fontFamily:"'Noto Sans KR',sans-serif",fontWeight:600,
        }}>상황 바꾸기</button>
      </div>
      <div style={{width:"100%",maxWidth:560,background:"rgba(255,255,255,0.75)",backdropFilter:"blur(10px)",borderRadius:20,padding:"18px 14px",marginBottom:10,minHeight:380,maxHeight:490,overflowY:"auto",boxShadow:"0 4px 24px rgba(0,0,0,0.06)",border:"1px solid rgba(255,200,150,0.3)"}}>
        {msgs.map(renderMsg)}
        {loading && (
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,#d4380d,#ff6b35)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>👩</div>
            <div style={{background:"white",borderRadius:"4px 14px 14px 14px",padding:"12px 16px",border:"1px solid #ffe8d6"}}>
              <div style={{display:"flex",gap:5}}>
                {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:"#ff6b35",opacity:0.6,animation:"bounce 1s infinite",animationDelay:`${i*0.2}s`}}/>)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {showHints && (
        <div style={{width:"100%",maxWidth:560,background:"white",borderRadius:16,padding:"14px",marginBottom:10,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",border:"1px solid #ffe0cc"}}>
          <div style={{fontSize:12,color:"#bbb",marginBottom:10,fontWeight:700,letterSpacing:0.5}}>💡 한자 누르면 전송 · 🗣️ 누르면 단어 분해</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {HINT_PHRASES.map((h,i)=>(
              <div key={i} style={{background:"#fff9f5",border:"1px solid #ffc499",borderRadius:12,padding:"10px 12px",minWidth:120}}>
                <div onClick={()=>send(h.zh)} style={{fontSize:18,fontWeight:800,color:"#d4380d",marginBottom:1,cursor:"pointer",fontFamily:"'Noto Serif TC',serif"}}>{h.zh}</div>
                <div style={{fontSize:11,color:"#ccc",fontStyle:"italic",marginBottom:5}}>{h.py}</div>
                <WordChip kongl={h.kongl} zh={h.zh} py={h.py} kr={h.kr} words={h.words}/>
                <div style={{fontSize:12,color:"#999",marginTop:5,fontFamily:"'Noto Sans KR',sans-serif"}}>🇰🇷 {h.kr}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{width:"100%",maxWidth:560,background:"white",borderRadius:16,padding:"12px",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",border:"1px solid #ffe0cc",display:"flex",flexDirection:"column",gap:8}}>
        <div style={{display:"flex",gap:8}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="한국어, 번체, 콩글리쉬 다 OK!" disabled={loading}
            style={{flex:1,border:"1.5px solid #ffe0cc",borderRadius:12,padding:"11px 14px",fontSize:15,outline:"none",fontFamily:"'Noto Sans KR',sans-serif",background:"#fffaf8"}}/>
          <button onClick={()=>send()} disabled={loading||!input.trim()} style={{background:loading||!input.trim()?"#ffd6c0":"linear-gradient(135deg,#d4380d,#ff6b35)",border:"none",borderRadius:12,width:46,height:46,cursor:loading||!input.trim()?"not-allowed":"pointer",fontSize:18,boxShadow:loading||!input.trim()?"none":"0 4px 12px rgba(212,56,13,0.3)"}}>➤</button>
          <button onClick={()=>startScenario(scenario)} title="대화 초기화" style={{background:"#f5f5f5",border:"none",borderRadius:12,width:46,height:46,cursor:"pointer",fontSize:18}}>🔄</button>
        </div>
        <button onClick={()=>setShowHints(v=>!v)} style={{background:showHints?"#fff5f0":"transparent",border:"1.5px dashed #ffc499",borderRadius:10,padding:"7px",cursor:"pointer",fontSize:13,color:"#d4380d",fontFamily:"'Noto Sans KR',sans-serif",fontWeight:700}}>
          {showHints?"💡 힌트 숨기기":"💡 힌트 보기"}
        </button>
      </div>
    </>
  );
}

// ────────────────────────────────────────────────
// 번역 & 해석 탭
// ────────────────────────────────────────────────
const TRANSLATE_PROMPT = `너는 대만 번체 중국어 전문 번역가야. 사용자가 입력한 텍스트를 분석해서 아래 형식으로 정확히 출력해줘.

입력이 한국어/영어이면 → 대만 번체로 번역
입력이 중국어(번체or간체)/콩글리쉬이면 → 한국어로 번역

출력 형식 (반드시 이 순서대로):
TR_ZH: [대만 번체 중국어]
TR_PY: [병음]
TR_KONGL: [한글 발음. 예: 니 하오]
TR_KR: [한국어 뜻]
TR_WORDS: [단어별 분해. 형식: 글자(콩글리쉬)=뜻|글자(콩글리쉬)=뜻]
TR_NOTE: [추가 설명. 문화적 맥락, 비슷한 표현, 주의사항 등 한 줄로. 없으면 생략]

규칙:
- 대만식 번체자 사용 (簡體 금지)
- WORDS는 의미 단위로 최대한 잘게 분해
- TR_NOTE는 진짜 유용한 정보가 있을 때만`;

function TranslateMode({ results, setResults }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const parseTranslate = (raw) => {
    const p = { zh:"", py:"", kongl:"", kr:"", words:[], note:"" };
    raw.split("\n").forEach(line => {
      if (line.startsWith("TR_ZH:")) p.zh = line.slice(6).trim();
      else if (line.startsWith("TR_PY:")) p.py = line.slice(6).trim();
      else if (line.startsWith("TR_KONGL:")) p.kongl = line.slice(9).trim();
      else if (line.startsWith("TR_KR:")) p.kr = line.slice(6).trim();
      else if (line.startsWith("TR_WORDS:")) p.words = parseWords(line.slice(9).trim());
      else if (line.startsWith("TR_NOTE:")) p.note = line.slice(8).trim();
    });
    return p;
  };

  const translate = async () => {
    const t = input.trim();
    if (!t || loading) return;
    setLoading(true);
    try {
      const data = await callAPI({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system: TRANSLATE_PROMPT,
        messages: [{ role: "user", content: t }],
      });
      const raw = data.content?.[0]?.text || "";
      const tr = parseTranslate(raw);
      setResults(prev => [{ input: t, tr }, ...prev]);
      setInput("");
    } catch {
      setResults(prev => [{ input: t, tr: { zh:"오류", py:"", kongl:"", kr:"다시 시도해주세요", words:[], note:"" } }, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const QUICK_EXAMPLES = [
    "이거 맛있어요!", "화장실 어디예요?", "좀 더 주세요",
    "我不吃辣", "謝謝你的幫忙", "多少錢？",
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

      {/* 입력창 */}
      <div style={{ background:"white", borderRadius:20, padding:"16px", boxShadow:"0 4px 20px rgba(0,0,0,0.07)", border:"1px solid #ffe0cc" }}>
        <div style={{ fontSize:12, color:"#aaa", marginBottom:10, fontWeight:700, letterSpacing:0.5 }}>
          🔍 한국어, 번체, 콩글리쉬 뭐든 입력해봐요
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); translate(); } }}
            placeholder={"예) 이거 포장해주세요\n예) 不好意思\n예) 니 하오마"}
            disabled={loading}
            rows={3}
            style={{
              flex:1, border:"1.5px solid #ffe0cc", borderRadius:12,
              padding:"11px 14px", fontSize:15, outline:"none", resize:"none",
              fontFamily:"'Noto Sans KR',sans-serif", background:"#fffaf8",
              lineHeight:1.6,
            }}
          />
          <button onClick={translate} disabled={loading || !input.trim()} style={{
            background: loading||!input.trim() ? "#ffd6c0" : "linear-gradient(135deg,#d4380d,#ff6b35)",
            border:"none", borderRadius:12, width:46,
            cursor: loading||!input.trim() ? "not-allowed" : "pointer",
            fontSize:20, color:"white", alignSelf:"stretch",
            boxShadow: loading||!input.trim() ? "none" : "0 4px 12px rgba(212,56,13,0.3)",
          }}>{loading ? "⏳" : "🔍"}</button>
        </div>

        {/* 빠른 예시 */}
        <div style={{ marginTop:10, display:"flex", flexWrap:"wrap", gap:6 }}>
          {QUICK_EXAMPLES.map((ex,i) => (
            <button key={i} onClick={() => { setInput(ex); }} style={{
              background:"#fff5f0", border:"1px solid #ffd0b0",
              borderRadius:20, padding:"4px 12px",
              fontSize:12, color:"#d4380d", cursor:"pointer",
              fontFamily:"'Noto Sans KR',sans-serif", fontWeight:600,
            }}>{ex}</button>
          ))}
        </div>
      </div>

      {/* 결과 목록 */}
      {results.length === 0 && !loading && (
        <div style={{ textAlign:"center", padding:"40px 0", color:"#ddd", fontFamily:"'Noto Sans KR',sans-serif" }}>
          <div style={{ fontSize:40, marginBottom:10 }}>🔍</div>
          <div style={{ fontSize:14 }}>번역하고 싶은 문장을 입력해봐요</div>
          <div style={{ fontSize:12, marginTop:4 }}>한국어 → 대만어 / 대만어 → 한국어 모두 OK!</div>
        </div>
      )}

      {loading && (
        <div style={{ background:"white", borderRadius:20, padding:"20px", textAlign:"center", boxShadow:"0 4px 20px rgba(0,0,0,0.06)", border:"1px solid #ffe0cc" }}>
          <div style={{ display:"flex", justifyContent:"center", gap:6, marginBottom:8 }}>
            {[0,1,2].map(i=>(
              <div key={i} style={{ width:9,height:9,borderRadius:"50%",background:"#ff6b35",opacity:0.6,animation:"bounce 1s infinite",animationDelay:`${i*0.2}s` }}/>
            ))}
          </div>
          <div style={{ fontSize:13, color:"#bbb", fontFamily:"'Noto Sans KR',sans-serif" }}>번역 중...</div>
        </div>
      )}

      {results.map((r, ri) => {
        const { tr } = r;
        return (
          <div key={ri} style={{ background:"white", borderRadius:20, padding:"18px", boxShadow:"0 4px 20px rgba(0,0,0,0.07)", border:"1px solid #ffe8d6", position:"relative" }}>

            {/* 원문 */}
            <div style={{ fontSize:12, color:"#bbb", marginBottom:4, fontFamily:"'Noto Sans KR',sans-serif" }}>원문</div>
            <div style={{ fontSize:15, color:"#888", fontFamily:"'Noto Sans KR',sans-serif", marginBottom:14, paddingBottom:14, borderBottom:"1px dashed #f0f0f0" }}>
              "{r.input}"
            </div>

            {/* 번체 + 병음 */}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:34, fontWeight:800, color:"#d4380d", fontFamily:"'Noto Serif TC',serif", lineHeight:1.2 }}>{tr.zh}</div>
              <div style={{ fontSize:13, color:"#bbb", fontStyle:"italic", marginTop:2 }}>{tr.py}</div>
            </div>

            {/* 콩글리쉬 + 한국어 */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12, alignItems:"center" }}>
              <div style={{ background:"#fffbeb", border:"1.5px solid #fcd34d", borderRadius:10, padding:"5px 13px", fontSize:15, fontWeight:700, color:"#92400e" }}>
                🗣️ {tr.kongl}
              </div>
              <div style={{ background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:10, padding:"5px 13px", fontSize:14, color:"#0369a1", fontFamily:"'Noto Sans KR',sans-serif", fontWeight:600 }}>
                🇰🇷 {tr.kr}
              </div>
            </div>

            {/* 단어별 분해 */}
            {tr.words.length > 0 && (
              <div style={{ marginBottom: tr.note ? 12 : 0 }}>
                <div style={{ fontSize:11, color:"#bbb", marginBottom:8, fontWeight:700, letterSpacing:0.5 }}>🔍 단어별 분해</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {tr.words.map((w,i) => (
                    <div key={i} style={{
                      background:"#f9fafb", borderRadius:12, padding:"7px 12px",
                      border:"1px solid #eee", textAlign:"center", minWidth:50,
                    }}>
                      <div style={{ fontSize:20, fontWeight:800, color:"#d4380d", fontFamily:"'Noto Serif TC',serif" }}>{w.zh}</div>
                      <div style={{ fontSize:11, color:"#f59e0b", fontWeight:700 }}>{w.kongl}</div>
                      <div style={{ fontSize:12, color:"#555", fontFamily:"'Noto Sans KR',sans-serif" }}>{w.kr}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 참고 메모 */}
            {tr.note && (
              <div style={{ marginTop:12, background:"#f0fdf4", borderRadius:10, padding:"9px 13px", borderLeft:"3px solid #86efac", fontSize:13, color:"#15803d", fontFamily:"'Noto Sans KR',sans-serif", lineHeight:1.6 }}>
                💡 {tr.note}
              </div>
            )}

            {/* 삭제 버튼 */}
            <button onClick={() => setResults(p => p.filter((_,i)=>i!==ri))} style={{
              position:"absolute", top:14, right:14,
              background:"transparent", border:"none",
              fontSize:16, color:"#ddd", cursor:"pointer", padding:4,
            }}>×</button>
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────
// 메인 앱
// ────────────────────────────────────────────────
export default function TaiwanApp() {
  const [tab, setTab] = useState("chat");
  const [msgs, setMsgs] = useState([]);
  const [scenario, setScenario] = useState("");
  const [translateResults, setTranslateResults] = useState([]);

  const tabs = [
    { id:"chat",      label:"💬 대화" },
    { id:"cards",     label:"🃏 암기" },
    { id:"translate", label:"🔍 번역" },
  ];

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#fff5f0 0%,#fff0e8 50%,#ffe8d6 100%)",fontFamily:"'Noto Sans KR',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 16px"}}>

      {/* 헤더 */}
      <div style={{width:"100%",maxWidth:560,background:"linear-gradient(135deg,#d4380d 0%,#ff6b35 100%)",borderRadius:20,padding:"18px 24px",marginBottom:14,boxShadow:"0 8px 32px rgba(212,56,13,0.25)",color:"white"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:12,opacity:0.8,marginBottom:3,letterSpacing:1}}>🇹🇼 대만어 학습</div>
            <div style={{fontSize:20,fontWeight:800}}>Taiwan 중국어 연습</div>
            <div style={{fontSize:11,opacity:0.7,marginTop:3}}>繁體中文 · 식당 상황</div>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div style={{width:"100%",maxWidth:560,display:"flex",gap:6,marginBottom:14,background:"white",borderRadius:16,padding:6,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:1, padding:"10px 6px", borderRadius:12, border:"none",
            background: tab===t.id ? "linear-gradient(135deg,#d4380d,#ff6b35)" : "transparent",
            color: tab===t.id ? "white" : "#aaa",
            fontWeight:700, fontSize:13, cursor:"pointer",
            fontFamily:"'Noto Sans KR',sans-serif",
            boxShadow: tab===t.id ? "0 4px 12px rgba(212,56,13,0.25)" : "none",
            transition:"all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div style={{width:"100%",maxWidth:560}}>
        <div style={{display: tab==="chat" ? "block" : "none"}}><ChatMode msgs={msgs} setMsgs={setMsgs} scenario={scenario} setScenario={setScenario}/></div>
        <div style={{display: tab==="cards" ? "block" : "none"}}><FlashCardMode/></div>
        <div style={{display: tab==="translate" ? "block" : "none"}}><TranslateMode results={translateResults} setResults={setTranslateResults}/></div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700;800&family=Noto+Serif+TC:wght@700&display=swap');
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:#ffc499;border-radius:3px}
      `}</style>
    </div>
  );
}
