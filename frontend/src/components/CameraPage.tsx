import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, RotateCcw, Image as ImageIcon, Upload, BarChart3, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

// 后端地址（从 .env 读取；没配就用 localhost）
const DETECT_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// 随机彩点（背景装饰）
function getRandomDots(count: number) {
  const colors = ["#f87171", "#34d399", "#60a5fa", "#fbbf24", "#a78bfa", "#fb7185", "#38bdf8"];
  return Array.from({ length: count }).map((_, i) => ({
    top: `${Math.random() * 85 + 5}%`,
    left: `${Math.random() * 85 + 5}%`,
    color: colors[i % colors.length],
  }));
}

// 设备能力检测
function isMobileLike() {
  const ua = navigator.userAgent || "";
  const touch = (navigator as any).maxTouchPoints >= 1;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || touch;
}
async function hasVideoInput() {
  try {
    const devices = await navigator.mediaDevices?.enumerateDevices?.();
    return (devices || []).some((d) => d.kind === "videoinput");
  } catch {
    return false;
  }
}

type RFPrediction = {
  x: number; y: number; width: number; height: number;
  class: string; confidence: number;
};

export default function CameraPage() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPreviewOn, setIsPreviewOn] = useState(false);
  const [snapUrl, setSnapUrl] = useState<string | null>(null);           // 原图/过渡图
  const [annotatedUrl, setAnnotatedUrl] = useState<string | null>(null); // 后端“已标注图片”
  const [mobileCapable, setMobileCapable] = useState<boolean>(false);

  // 检测相关
  const [blobForDetect, setBlobForDetect] = useState<Blob | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [preds, setPreds] = useState<RFPrediction[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);

  // 置信度阈值（0.10—0.90）
  const [conf, setConf] = useState<number>(0.35);

  // refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const climbingDots = useMemo(() => getRandomDots(8), []);

  useEffect(() => {
    (async () => {
      const hasCam = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && (await hasVideoInput());
      setMobileCapable(isMobileLike() && hasCam);
    })();
    return () => stopCamera();
  }, []);

  // 通过阈值过滤后的结果（仅在未返回 annotated 时用于前端画框）
  const filtered = useMemo(
    () => preds.filter(p => p.confidence >= conf),
    [preds, conf]
  );

  useEffect(() => {
    // 只有在“没有 annotatedUrl”且有原图时才在前端叠加绘制
    if (!annotatedUrl) drawOverlay();
  }, [snapUrl, filtered, annotatedUrl]);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsPreviewOn(true);
      return true;
    } catch {
      return false;
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsPreviewOn(false);
  };

  const takeSnapshot = () => {
    if (!videoRef.current || !offscreenRef.current) return;
    const video = videoRef.current;
    const canvas = offscreenRef.current;
    const w = video.videoWidth || 720;
    const h = video.videoHeight || 1280;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setAnnotatedUrl(null); // 清空旧的标注图
    setSnapUrl(dataUrl);   // 先显示拍到的原图
    canvas.toBlob((b) => {
      if (b) {
        setBlobForDetect(b);
        autoDetect(b); // 拍照后自动检测
      }
    }, "image/jpeg", 0.92);
  };

  const handleCaptureClick = async () => {
    if (mobileCapable) {
      if (!isPreviewOn) {
        const ok = await startCamera();
        if (!ok) {
          fileInputRef.current?.click();
        }
      } else {
        setIsCapturing(true);
        takeSnapshot();
        setTimeout(() => {
          setIsCapturing(false);
          stopCamera();
        }, 300);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setAnnotatedUrl(null);
    setSnapUrl(url);      // 先显示原图
    setBlobForDetect(f);
    setPreds([]);
    setErrorMsg(null);
    autoDetect(f);        // 上传后自动检测
  };

  const handleReset = () => {
    setSnapUrl(null);
    setAnnotatedUrl(null);
    setPreds([]);
    setErrorMsg(null);
    setBlobForDetect(null);
    stopCamera();
  };

  // ===== 调用后端：拿“已标注图片”+ 原始预测 =====
  const autoDetect = async (blob: Blob) => {
    try {
      setDetecting(true);
      const fd = new FormData();
      fd.append("file", blob, "image.jpg");

      // 重点：要后端返回带框 PNG → mode=both
      const url = `${DETECT_BASE}/detect?confidence=${conf.toFixed(2)}&overlap=0.3&mode=both`;

      const res = await fetch(url, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || data?.error || "检测失败");

      // 保存预测
      const predictions: RFPrediction[] = data?.predictions ?? [];
      setPreds(predictions);

      // ✅ 优先显示后端“已标注图片”，弹窗里也会显示这张
      if (data?.annotated) {
        setAnnotatedUrl(data.annotated);
        setSnapUrl(data.annotated); // 主预览也使用已标注图
      } else {
        setAnnotatedUrl(null);      // 后端没返回图 → 继续使用前端叠加绘制
      }

      setErrorMsg(null);
      setOpenModal(true); // 打开弹窗（这里弹窗会显示图片）
    } catch (err: any) {
      setErrorMsg(err?.message || "检测失败");
      console.error(err);
    } finally {
      setDetecting(false);
      if (!annotatedUrl) drawOverlay();
    }
  };

  // 给不同 class 一个稳定的颜色（仅用于前端兜底绘制）
  const classColors = useMemo(() => {
    const palette = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6", "#eab308"];
    const map = new Map<string, string>();
    let i = 0;
    preds.forEach(p => {
      if (!map.has(p.class)) {
        map.set(p.class, palette[i % palette.length]);
        i++;
      }
    });
    return map;
  }, [preds]);

  // 仅当没有 annotatedUrl 时，才在前端叠加画框（弹窗兜底用）
  const drawOverlay = () => {
    if (annotatedUrl) return; // 已有标注图就不再叠加
    if (!overlayRef.current || !imgRef.current) return;

    const cvs = overlayRef.current;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    const imgEl = imgRef.current;
    const rect = imgEl.getBoundingClientRect();
    cvs.width = rect.width;
    cvs.height = rect.height;

    const naturalW = imgEl.naturalWidth || rect.width;
    const naturalH = imgEl.naturalHeight || rect.height;
    const scaleX = rect.width / naturalW;
    const scaleY = rect.height / naturalH;

    ctx.clearRect(0, 0, cvs.width, cvs.height);
    if (!filtered.length) return;

    ctx.lineWidth = 2;
    ctx.font = "14px ui-sans-serif, system-ui, -apple-system, Segoe UI";

    filtered.forEach((p) => {
      const color = classColors.get(p.class) || "#22c55e";
      // Roboflow: x,y 为中心点
      const x = (p.x - p.width / 2) * scaleX;
      const y = (p.y - p.height / 2) * scaleY;
      const w = p.width * scaleX;
      const h = p.height * scaleY;

      // 框
      ctx.strokeStyle = color;
      ctx.strokeRect(x, y, w, h);

      // 标签（class + 置信度）
      const label = `${p.class} ${(p.confidence * 100).toFixed(0)}%`;
      const padding = 4;
      const textW = ctx.measureText(label).width;
      const boxH = 18;

      // 背景
      ctx.fillStyle = hexToRgba(color, 0.18);
      ctx.fillRect(x, Math.max(0, y - boxH), textW + padding * 2, boxH);

      // 文本
      ctx.fillStyle = "#0a0a0a";
      ctx.fillText(label, x + padding, Math.max(12, y - 4));
    });
  };

  const total = filtered.length;
  const byClass = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(p => map.set(p.class, (map.get(p.class) ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  return (
    <div className="relative flex flex-col min-h-screen bg-background overflow-hidden">
      {climbingDots.map((dot, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: dot.top, left: dot.left, width: "40px", height: "40px",
            background: dot.color, borderRadius: "50%", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", zIndex: 10,
          }}
        />
      ))}
      <div className="relative z-20 flex flex-col min-h-screen">
        <div className="text-center space-y-2 px-4 pt-8 pb-3">
          <h1 className="text-2xl font-bold text-foreground">Hold Detector 📸</h1>
          <p className="text-muted-foreground">
            {mobileCapable ? "Open camera to capture a route" : "Upload a photo or use camera if available"}
          </p>
        </div>

        {/* 预览区：优先显示已标注图片；否则显示原图 + 本地叠加 */}
        <div className="flex-1 px-4">
          <div className="relative w-full h-full max-h-96 bg-gradient-to-br from-muted/20 to-muted/40 rounded-xl overflow-hidden shadow-card">
            <div className="absolute inset-0 flex items-center justify-center">
              {annotatedUrl ? (
                <img
                  src={annotatedUrl}
                  alt="annotated"
                  className="max-h-full max-w-full object-contain"
                />
              ) : snapUrl ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    ref={imgRef}
                    src={snapUrl}
                    alt="snapshot"
                    className="max-h-full max-w-full object-contain"
                    onLoad={() => drawOverlay()}
                  />
                  <canvas ref={overlayRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
                </div>
              ) : isPreviewOn ? (
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              ) : isCapturing || detecting ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-primary font-medium">
                    {detecting ? "Detecting holds..." : "Analyzing holds..."} ✨
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <Camera className="w-16 h-16 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">
                    {mobileCapable ? "Tap to open camera" : "Upload an image of your wall"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 控件区：拍照/上传/重置 + 弹窗 */}
        <div className="px-4 py-8 space-y-6">
          <div className="flex justify-center">
            <Button
              onClick={handleCaptureClick}
              disabled={isCapturing || detecting}
              className="w-20 h-20 rounded-full bg-primary hover:bg-primary/90 shadow-float hover:shadow-card hover:scale-105 transition-all duration-300"
              title={mobileCapable ? (isPreviewOn ? "Take photo" : "Open camera") : "Upload image"}
            >
              {isCapturing || detecting ? (
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-8 h-8 text-white" />
              )}
            </Button>
          </div>

          <div className="flex justify-center gap-6">
            {/* 使用 asChild + label，保证能点开文件选择 */}
            <Button variant="outline" size="lg" className="rounded-full w-14 h-14" asChild>
              <label htmlFor="uploader" title="Choose from gallery" className="cursor-pointer grid place-items-center">
                <ImageIcon className="w-5 h-5" />
              </label>
            </Button>

            <Button variant="outline" size="lg" className="rounded-full w-14 h-14" onClick={handleReset} title="Reset">
              <RotateCcw className="w-5 h-5" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="rounded-full w-14 h-14"
              title="View Result"
              onClick={() => setOpenModal(true)}
              disabled={!filtered.length && !errorMsg && !annotatedUrl}
            >
              <BarChart3 className="w-5 h-5" />
            </Button>
          </div>

          {/* 置信度滑条（前端过滤 + 影响下一次请求） */}
          <div className="rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="font-medium">Confidence Threshold</span>
              </div>
              <span className="text-sm text-muted-foreground">{(conf * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={0.9}
              step={0.05}
              value={conf}
              onChange={(e) => setConf(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* 错误提示 */}
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {/* 拍摄小贴士 */}
          <div className="bg-accent/10 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-foreground">💡 Photography Tips</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Keep the wall centered in frame</li>
              <li>• Ensure good lighting on holds</li>
              <li>• Stand 2–3 meters away for best results</li>
              <li>• Hold steady while capturing</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 文件选择 input：不要 display:none，用 sr-only 或由 Button asChild 包裹 */}
      <input
        id="uploader"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        {...(mobileCapable ? { capture: "environment" as any } : {})}
        onChange={handleFileSelected}
        className="sr-only"
      />

      {/* === 弹窗：优先显示“已标注图片”；缺失则用 canvas 兜底 === */}
      {openModal && (
        <Modal onClose={() => setOpenModal(false)} title="Detection Result">
          <div className="rounded-xl overflow-hidden border mb-4">
            {annotatedUrl ? (
              <img
                src={annotatedUrl}
                alt="annotated result"
                className="w-full h-auto object-contain max-h-[60vh]"
              />
            ) : snapUrl ? (
              <div className="relative w-full bg-black/5 grid place-items-center max-h-[60vh]">
                <img
                  src={snapUrl}
                  alt="original"
                  className="max-h-[60vh] max-w-full object-contain"
                  ref={imgRef}
                  onLoad={() => drawOverlay()}
                />
                <canvas ref={overlayRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-gray-500">No image to display.</div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <StatCard label="Detections (after threshold)" value={total} />
            <div className="md:col-span-2 rounded-xl border p-3">
              <p className="text-sm text-gray-500 mb-2">By Class</p>
              {byClass.length === 0 ? (
                <p className="text-sm text-gray-600">No detections at current threshold.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {byClass.map(([cls, count]) => (
                    <span
                      key={cls}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
                      style={{ borderColor: classColors.get(cls) || "#e5e7eb" }}
                    >
                      <span className="font-medium" style={{ color: classColors.get(cls) || "#111827" }}>
                        {cls}
                      </span>
                      <span className="text-gray-500">×{count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpenModal(false)}>Close</Button>
          </div>
        </Modal>
      )}

      <canvas ref={offscreenRef} className="hidden" />
    </div>
  );
}

/* ----------------- 小组件 ----------------- */

function Modal({
  children, onClose, title,
}: { children: React.ReactNode; onClose: () => void; title?: string }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-[1001] w-[92vw] max-w-3xl rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title || "Dialog"}</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

/* ----------------- 工具函数 ----------------- */
function hexToRgba(hex: string, alpha = 1) {
  const h = hex.replace("#", "");
  const bigint = h.length === 3
    ? parseInt(h.split("").map((c) => c + c).join(""), 16)
    : parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
