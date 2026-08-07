import os
import base64
import requests
from collections import Counter
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

load_dotenv()

API_KEY = os.getenv("ROBOFLOW_API_KEY")
MODEL   = os.getenv("ROBOFLOW_MODEL", "hold-detector-rnvkl")
VERSION = os.getenv("ROBOFLOW_VERSION", "2")

if not API_KEY:
    raise RuntimeError("Missing ROBOFLOW_API_KEY in .env")

app = FastAPI(title="ClimbLog Hold Detector (Proxy)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产建议改为你的前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROBOFLOW_URL = f"https://serverless.roboflow.com/{MODEL}/{VERSION}"
TIMEOUT = 60


def rf_call(b64_body: str, fmt: str, confidence: float, overlap: float) -> requests.Response:
    """
    调 Roboflow Serverless（fmt: "json" 或 "image"）。
    Roboflow serverless 的 confidence/overlap 接受 0.0–1.0。
    """
    params = {
        "api_key": API_KEY,
        "format": fmt,
        "confidence": confidence,
        "overlap": overlap,
        # 让可视化更清晰：
        "labels": "true",
        "stroke": 3,
        "font_size": 0.6,
        # 若模型支持分割，可打开：
        # "mask": "true",
        # 也可测试固定色： "color": "red",
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    return requests.post(ROBOFLOW_URL, params=params, data=b64_body, headers=headers, timeout=TIMEOUT)


@app.post("/detect")
async def detect(
    file: UploadFile = File(...),
    confidence: float = Query(0.35, ge=0.0, le=0.99),
    overlap: float = Query(0.30, ge=0.0, le=1.0),
    mode: str = Query("both", regex="^(json|image|both)$"),
):
    """
    - mode=both（默认）：返回 {"predictions":[...], "summary":{...}, "annotated":"data:image/png;base64,..."}
    - mode=json：返回 Roboflow 原始 JSON
    - mode=image：返回 {"annotated":"data:image/png;base64,..."}
    """
    try:
        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Empty file")
        b64_body = base64.b64encode(raw).decode("utf-8")

        if mode == "json":
            rj = rf_call(b64_body, "json", confidence, overlap)
            if rj.status_code != 200:
                raise HTTPException(status_code=rj.status_code, detail=rj.text)
            return JSONResponse(rj.json())

        if mode == "image":
            ri = rf_call(b64_body, "image", confidence, overlap)
            if ri.status_code != 200:
                raise HTTPException(status_code=ri.status_code, detail=ri.text)
            b64 = base64.b64encode(ri.content).decode("utf-8")
            return JSONResponse({"annotated": f"data:image/png;base64,{b64}"})

        # mode == both
        rj = rf_call(b64_body, "json", confidence, overlap)
        if rj.status_code != 200:
            raise HTTPException(status_code=rj.status_code, detail=rj.text)
        data_json = rj.json()

        ri = rf_call(b64_body, "image", confidence, overlap)
        if ri.status_code != 200:
            raise HTTPException(status_code=ri.status_code, detail=ri.text)
        b64_img = base64.b64encode(ri.content).decode("utf-8")

        preds = data_json.get("predictions", [])
        classes = [p.get("class", "unknown") for p in preds]
        by_class = sorted(Counter(classes).items(), key=lambda x: x[1], reverse=True)

        return JSONResponse({
            "predictions": preds,
            "summary": {"total": len(preds), "by_class": by_class},
            "annotated": f"data:image/png;base64,{b64_img}",
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
