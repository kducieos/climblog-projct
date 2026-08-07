import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, X, Star, Clock, Target, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/* -------------------- Utils -------------------- */
function getRandomDots(count: number) {
  const colors = ["#f87171", "#34d399", "#60a5fa", "#fbbf24", "#a78bfa", "#fb7185", "#38bdf8"];
  return Array.from({ length: count }).map(() => ({
    top: `${Math.random() * 85 + 5}%`,
    left: `${Math.random() * 85 + 5}%`,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}

type ColorToken = "primary" | "secondary" | "accent" | "warning";
type Difficulty = "V0-V2" | "V1-V3" | "V2-V4" | "V3-V5" | "V4-V6";

export interface Challenge {
  id: number;
  title: string;
  description: string;
  difficulty: Difficulty;
  timeLimit: string;
  points: number;
  emoji: string;
  color: ColorToken;
  gradient: string;
}

/** 本地降级数据（AI 失败时使用） */
const localFallback: Challenge[] = [
  { id: 1, title: "Pink Power Hour", description: "Complete 5 routes using only pink holds! Have fun 💪", difficulty: "V2-V4", timeLimit: "60 minutes", points: 150, emoji: "🌸", color: "primary", gradient: "from-primary to-primary/60" },
  { id: 2, title: "Overhang Sprint", description: "Finish 3 overhang routes in one session. Defy gravity!", difficulty: "V3-V5", timeLimit: "2 hours", points: 200, emoji: "🧗‍♀️", color: "secondary", gradient: "from-secondary to-secondary/60" },
  { id: 3, title: "Tall Tower", description: "Complete the tallest route in the gym. Reach the top! ✨", difficulty: "V1-V3", timeLimit: "No limit", points: 100, emoji: "🌟", color: "accent", gradient: "from-accent to-accent/60" },
  { id: 4, title: "Speed Run", description: "Complete any route in under 30 seconds. Go fast!", difficulty: "V1-V2", timeLimit: "30 seconds", points: 175, emoji: "⚡", color: "warning", gradient: "from-warning to-warning/60" },
];

/* 简化 JSON 解析器 */
function safeParseArrayJSON(text: string): any[] {
  try {
    const s = text.trim();
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) return parsed;
    if (parsed?.items && Array.isArray(parsed.items)) return parsed.items;
  } catch {}
  const match = text.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  throw new Error("No JSON array found in model response");
}

function normalizeItems(arr: any[]): Challenge[] {
  if (!Array.isArray(arr) || arr.length === 0) throw new Error("Empty JSON array");
  const colors: ColorToken[] = ["primary", "secondary", "accent", "warning"];
  return arr.slice(0, 4).map((c: any, i: number) => ({
    id: i + 1,
    title: c.title || `Challenge ${i + 1}`,
    description: c.description || "Have fun climbing!",
    difficulty: c.difficulty || "V2-V4",
    timeLimit: c.timeLimit || "60 minutes",
    points: Math.max(100, Math.min(250, Number(c.points) || 150)),
    emoji: c.emoji || "🧗",
    color: colors[i % colors.length],
    gradient: `from-${colors[i % colors.length]} to-${colors[i % colors.length]}/60`,
  }));
}

/* ---------------- Gemini fetch ---------------- */
async function fetchChallengesFromGemini(): Promise<Challenge[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
  if (!apiKey) throw new Error("Missing VITE_GEMINI_API_KEY");

  const model = "models/gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1/${model}:generateContent`;
  const headers = { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey };
  const safetySettings = [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
  ];

  const promptA = `
Return ONLY a JSON array of exactly 4 bouldering challenges.
Each object has: title, description, difficulty {"V0-V2","V1-V3","V2-V4","V3-V5","V4-V6"}, timeLimit, points (100–250), emoji, color {"primary","secondary","accent","warning"}.
`.trim();

  const promptB = `[] -> fill with 4 valid challenge objects ("title","description","difficulty","timeLimit","points","emoji","color"). Output only JSON array.`;

  const callOnce = async (p: string, maxTokens = 1024) => {
    const res = await fetch(`${url}?key=${apiKey}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: p }]}],
        generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens },
        safetySettings,
      }),
    });
    const raw = await res.text();
    console.log("[Gemini raw]", raw.slice(0, 200));
    const data = JSON.parse(raw);
    const finishReason = data?.candidates?.[0]?.finishReason;
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p: any) => p.text || "").join("\n").trim();
    return { text, finishReason };
  };

  try {
    let { text, finishReason } = await callOnce(promptA, 768);
    console.log("[Gemini] finishReason A:", finishReason);
    if (!text || finishReason === "MAX_TOKENS") {
      ({ text, finishReason } = await callOnce(promptB, 2048));
      console.log("[Gemini] finishReason B:", finishReason);
    }
    if (!text) return localFallback;
    const arr = safeParseArrayJSON(text);
    return normalizeItems(arr);
  } catch (e) {
    console.warn("[Gemini] request failed:", e);
    return localFallback;
  }
}

/* -------------------- Component -------------------- */
export default function ChallengesPage() {
  const [items, setItems] = useState<Challenge[]>(localFallback);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [rot, setRot] = useState(0);
  const dragging = useRef(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const climbingDots = useMemo(() => getRandomDots(8), []);

  useEffect(() => {
    refreshChallenges();
  }, []);

  async function refreshChallenges() {
    try {
      setLoading(true);
      setErr(null);
      const data = await fetchChallengesFromGemini();
      setItems(data);
      setCurrentCardIndex(0);
    } catch (e: any) {
      console.warn("Gemini failed:", e?.message);
      setErr("AI unavailable — showing local challenges.");
      setItems(localFallback);
      setCurrentCardIndex(0);
    } finally {
      setLoading(false);
    }
  }

  const current = items[currentCardIndex];
  if (!current) return null;

  const finishCard = (dir: "left" | "right" | "up") => {
    setDx(0);
    setDy(0);
    setRot(0);
    setTimeout(() => {
      setCurrentCardIndex((i) => (i + 1) % items.length);
    }, 300);
  };

  const onDragStart = (x: number, y: number) => {
    dragging.current = true;
    startX.current = x;
    startY.current = y;
  };
  const onDragMove = (x: number, y: number) => {
    if (!dragging.current || startX.current == null || startY.current == null) return;
    setDx(x - startX.current);
    setDy(y - startY.current);
    setRot((x - startX.current) / 15);
  };
  const onDragEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy)) finishCard(dx > 0 ? "right" : "left");
    else if (dy < -120 && Math.abs(dy) > Math.abs(dx)) finishCard("up");
    else { setDx(0); setDy(0); setRot(0); }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden pb-40">
      {climbingDots.map((dot, i) => (
        <div key={i} style={{
          position: "absolute",
          top: dot.top, left: dot.left,
          width: "40px", height: "40px",
          background: dot.color, borderRadius: "50%",
          opacity: 0.4, zIndex: 1
        }} />
      ))}

      <div className="text-center space-y-2 px-4 pt-8 pb-3 relative z-10">
        <h1 className="text-2xl font-bold text-foreground">Challenges ⚡</h1>
        <p className="text-muted-foreground">Swipe to find your next adventure!</p>
      </div>

      {/* Card stack */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 select-none">
        <div className="relative w-full max-w-sm">
          <div
            className={`relative will-change-transform`}
            onTouchStart={(e) => onDragStart(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => onDragMove(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={onDragEnd}
            onMouseDown={(e) => onDragStart(e.clientX, e.clientY)}
            onMouseMove={(e) => onDragMove(e.clientX, e.clientY)}
            onMouseUp={onDragEnd}
            onMouseLeave={onDragEnd}
            style={{
              transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`,
              transition: dragging.current ? "none" : "transform 0.25s ease",
            }}
          >
            <div className={`h-96 bg-gradient-to-br ${current.gradient} rounded-xl p-6 text-white space-y-4 flex flex-col`}>
              <div className="text-center space-y-2">
                <div className="text-4xl">{current.emoji}</div>
                <h2 className="text-xl font-bold">{current.title}</h2>
              </div>
              <p className="flex-1 text-sm opacity-90 leading-relaxed">{current.description}</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><Target className="w-4 h-4" />Difficulty: {current.difficulty}</div>
                <div className="flex items-center gap-2"><Clock className="w-4 h-4" />Time: {current.timeLimit}</div>
                <div className="flex items-center gap-2"><Star className="w-4 h-4" />{current.points} points</div>
              </div>
            </div>
          </div>
        </div>

        {/* 说明文字区域 */}
        <div className="mt-6 text-center text-xs text-muted-foreground space-y-1">
          <p>👆 Swipe up to start now</p>
          <p>❤️ Swipe right to save • ❌ Swipe left to skip</p>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-center items-center gap-8 mt-6">
          <Button onClick={() => finishCard("left")} variant="outline" size="lg" className="w-14 h-14 rounded-full border-destructive/30 hover:bg-destructive/10">
            <X className="w-6 h-6 text-destructive" />
          </Button>
          <Button onClick={() => finishCard("up")} size="lg" className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-primary/80 hover:scale-110 transition-transform">
            <Star className="w-6 h-6 text-white" />
          </Button>
          <Button onClick={() => finishCard("right")} variant="outline" size="lg" className="w-14 h-14 rounded-full border-primary/30 hover:bg-primary/10">
            <Heart className="w-6 h-6 text-primary" />
          </Button>
        </div>
      </div>

      {/* ✅ 底部 Refresh */}
      <div className="mt-10 w-full px-4 pb-10 relative z-10 flex flex-col items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={refreshChallenges}
          disabled={loading}
          className="rounded-full"
        >
          <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Refreshing..." : "Refresh challenges"}
        </Button>
        {err && <span className="text-xs text-muted-foreground">{err}</span>}
      </div>
    </div>
  );
}
