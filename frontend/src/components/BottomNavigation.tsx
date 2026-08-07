import { useEffect, useState } from "react";
import { Mountain, BookOpen, Zap, Camera, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const navigationItems = [
  { id: "home", icon: Mountain, label: "Home", gradient: "from-primary to-secondary" },
  { id: "logbook", icon: BookOpen, label: "Logbook", gradient: "from-secondary to-accent" },
  { id: "challenges", icon: Zap, label: "Challenges", gradient: "from-accent to-warning" },
  { id: "camera", icon: Camera, label: "Camera", gradient: "from-warning to-primary" },
  { id: "profile", icon: User, label: "Profile", gradient: "from-primary to-accent" },
];

export default function BottomNavigation({ currentPage, onPageChange }: NavigationProps) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768); // md 断点
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile === null) return null;

  const Buttons = () => (
    <>
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const active = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 hover:scale-105",
              active ? "bg-primary/10 shadow-kawaii" : "hover:bg-primary/5"
            )}
          >
            <div
              className={cn(
                "p-1.5 rounded-full transition-all duration-300",
                active ? `bg-gradient-to-r ${item.gradient} shadow-float` : "bg-muted/50"
              )}
            >
              <Icon className={cn("w-4 h-4", active ? "text-white" : "text-muted-foreground")} />
            </div>
            <span className={cn("text-sm font-medium", active ? "text-primary" : "text-muted-foreground")}>
              {item.label}
            </span>
          </button>
        );
      })}
    </>
  );

  // 📱 手机：固定底部
  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border rounded-t-xl shadow-card">
        <div className="flex items-center justify-around px-4 py-2 max-w-md mx-auto">
          {/* 移动端按钮更紧凑：纵向排列 */}
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 hover:scale-105",
                  active ? "bg-primary/10 shadow-kawaii" : "hover:bg-primary/5"
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-full transition-all duration-300",
                    active ? `bg-gradient-to-r ${item.gradient} shadow-float` : "bg-muted/50"
                  )}
                >
                  <Icon className={cn("w-5 h-5", active ? "text-white" : "text-muted-foreground")} />
                </div>
                <span className={cn("text-xs font-medium", active ? "text-primary" : "text-muted-foreground")}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 💻 桌面：固定顶部（不依赖 DOM 顺序）
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-card">
      <div className="flex items-center justify-center gap-6 px-6 py-3 max-w-5xl mx-auto">
        <Buttons />
      </div>
    </div>
  );
}
