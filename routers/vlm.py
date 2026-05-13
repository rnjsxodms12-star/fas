import os
import time
import requests

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from sqlalchemy import text

from routers.deps import engine


router = APIRouter(prefix="/vlm", tags=["vlm"])


REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")
REPLICATE_MODEL_VERSION = os.getenv("REPLICATE_MODEL_VERSION")

REPLICATE_PREDICTIONS_URL = "https://api.replicate.com/v1/predictions"


def _replicate_headers():
    if not REPLICATE_API_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="REPLICATE_API_TOKEN is not set",
        )

    return {
        "Authorization": f"Bearer {REPLICATE_API_TOKEN}",
        "Content-Type": "application/json",
    }


def _save_vlm_raw_json(raw_json: dict):
    """
    기존 /vlm-result 저장과 같은 목적:
    Replicate prediction 전체 JSON을 raw_json으로 DB에 저장.
    테이블명은 기존 구현에 맞춰 vlm_rag_results를 우선 사용.
    """

    output = raw_json.get("output") or {}
    title_block = output.get("title_block_1") or {}

    drawing_no = (
        output.get("drawing_id")
        or title_block.get("Drawing_No")
        or title_block.get("Project_ID")
        or "unknown"
    )

    with engine.begin() as conn:
        row = conn.execute(
            text("""
                INSERT INTO vlm_rag_results (drawing_no, raw_json)
                VALUES (:drawing_no, CAST(:raw_json AS JSONB))
                RETURNING id, drawing_no, created_at
            """),
            {
                "drawing_no": drawing_no,
                "raw_json": __import__("json").dumps(raw_json, ensure_ascii=False),
            },
        ).mappings().first()

    return dict(row)


@router.post("/analyze-upload")
async def analyze_upload(
    image: UploadFile = File(...),
    rfq_id: str = Form("RFQ-DEMO"),
    quantity: int = Form(100),
):
    """
    도면 PNG/JPG 업로드
    → Replicate VLM 호출
    → 완료까지 polling
    → raw_json DB 저장
    → VLM output 반환
    """

    if not REPLICATE_MODEL_VERSION:
        raise HTTPException(
            status_code=500,
            detail="REPLICATE_MODEL_VERSION is not set",
        )

    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Only image files are allowed",
        )

    image_bytes = await image.read()

    # Replicate API는 일반적으로 input image에 URL/base64/data URI가 필요함.
    # 여기서는 data URI 방식으로 전송.
    import base64

    encoded = base64.b64encode(image_bytes).decode("utf-8")
    image_data_uri = f"data:{image.content_type};base64,{encoded}"

    create_payload = {
        "version": REPLICATE_MODEL_VERSION,
        "input": {
            "image": image_data_uri,
            "rfq_id": rfq_id,
            "quantity": quantity,
        },
    }

    create_res = requests.post(
        REPLICATE_PREDICTIONS_URL,
        headers=_replicate_headers(),
        json=create_payload,
        timeout=60,
    )

    if create_res.status_code >= 400:
        raise HTTPException(
            status_code=create_res.status_code,
            detail={
                "message": "Replicate prediction create failed",
                "response": create_res.text,
            },
        )

    prediction = create_res.json()
    get_url = prediction.get("urls", {}).get("get")

    if not get_url:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Replicate prediction get URL not found",
                "prediction": prediction,
            },
        )

    timeout_sec = int(os.getenv("VLM_REPLICATE_TIMEOUT_SEC", "300"))
    poll_interval = float(os.getenv("VLM_REPLICATE_POLL_INTERVAL", "2"))

    started = time.time()

    while True:
        poll_res = requests.get(
            get_url,
            headers=_replicate_headers(),
            timeout=60,
        )

        if poll_res.status_code >= 400:
            raise HTTPException(
                status_code=poll_res.status_code,
                detail={
                    "message": "Replicate prediction polling failed",
                    "response": poll_res.text,
                },
            )

        prediction = poll_res.json()
        status = prediction.get("status")

        if status in ["succeeded", "failed", "canceled"]:
            break

        if time.time() - started > timeout_sec:
            raise HTTPException(
                status_code=504,
                detail={
                    "message": "Replicate prediction timeout",
                    "prediction": prediction,
                },
            )

        time.sleep(poll_interval)

    if prediction.get("status") != "succeeded":
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Replicate prediction did not succeed",
                "prediction": prediction,
            },
        )

    saved = _save_vlm_raw_json(prediction)

    return {
        "success": True,
        "message": "vlm analysis completed and raw_json saved",
        "saved": saved,
        "prediction_id": prediction.get("id"),
        "status": prediction.get("status"),
        "output": prediction.get("output"),
        "raw_json": prediction,
    }