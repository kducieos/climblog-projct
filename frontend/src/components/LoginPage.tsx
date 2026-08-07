import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { googleSignIn, onAuth, auth } from "@/lib/firebase";

/** 随机生成彩色攀岩点（同风格） */
function getRandomDots(count: number) {
  const colors = ["#f87171", "#34d399", "#60a5fa", "#fbbf24", "#a78bfa", "#fb7185", "#38bdf8"];
  return Array.from({ length: count }).map((_, i) => ({
    top: `${Math.random() * 85 + 5}%`,    // 5% ~ 90%
    left: `${Math.random() * 85 + 5}%`,   // 5% ~ 90%
    color: colors[i % colors.length],
  }));
}

interface Props {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dots, setDots] = useState(() => getRandomDots(10)); // 🎨 10 个彩色攀岩点

  // 登录状态监听
  useEffect(() => {
    const unsub = onAuth((user) => {
      if (user) onLoginSuccess();
    });
    return () => unsub();
  }, [onLoginSuccess]);

  const handleGoogle = async () => {
    setErr(null);
    setLoading(true);
    try {
      await googleSignIn();
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 overflow-hidden">
      {/* 🎨 背景彩色攀岩点 */}
      {dots.map((dot, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: dot.top,
            left: dot.left,
            width: "40px",
            height: "40px",
            background: dot.color,
            borderRadius: "50%",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            opacity: 0.9,
            zIndex: 1,
          }}
        />
      ))}

      {/* 登录卡片 */}
      <div className="relative z-10 card-kawaii w-full max-w-sm text-center space-y-6 bg-card/90 backdrop-blur-md p-8 rounded-2xl shadow-card">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">ClimbLog 🧗‍♀️</h1>
          <p className="text-sm text-muted-foreground">Sign in to start your climbing journey</p>
        </div>

        <Button
          className="w-full rounded-full py-6 font-semibold shadow-float hover:scale-105 transition-all"
          onClick={handleGoogle}
          disabled={loading}
        >
          {loading ? "Signing in..." : "Continue with Google"}
        </Button>

        {err && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-md p-2">
            {err}
          </div>
        )}

        {/* 可选：调试 / 已登录信息 */}
        {auth.currentUser && (
          <p className="text-xs text-muted-foreground">
            Signed in as {auth.currentUser.email}
          </p>
        )}
      </div>
    </div>
  );
}
