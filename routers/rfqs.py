"""
RFQ 관련 엔드포인트:
- POST /rfq                       (기존)
- GET  /rfqs                      (기존)
- GET  /api/rfq/{rfq_id}          (B-1: 단건 조회)
- PUT  /api/rfq/{rfq_id}/status   (B-7: 상태 전이)
- POST /api/rfq/{rfq_id}/supplement (D-1: 클라이언트 보완 요청 루프)
"""

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

from routers.deps import engine, SCHEMA, get_current_user, _create_notification

router = APIRouter()


# ---------------------------------------------------------------------------
# POST /rfq — RFQ 생성 (기존 + drawing_id 추가)
# ---------------------------------------------------------------------------


@router.post("/rfq")
def create_rfq(data: dict, current_user: dict = Depends(get_current_user)):
    if engine is None:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not set")

    buyer_code = data.get("buyer_code")
    material = data.get("material")
    process = data.get("process")
    quantity = data.get("quantity")
    due_date = data.get("due_date")
    note = data.get("note")
    drawing_id = data.get("drawing_id")  # B-7: 선택 필드

    if not buyer_code or not material or not process or not quantity:
        raise HTTPException(
            status_code=400,
            detail="buyer_code, material, process, quantity are required",
        )

    with engine.begin() as conn:
        rfq_result = conn.execute(
            text(f"""
                INSERT INTO {SCHEMA}.rfqs
                    (buyer_id, drawing_id, requested_delivery_date, general_notes_jsonb)
                VALUES (:buyer_id, :drawing_id, :due_date, CAST(:notes AS JSONB))
                RETURNING rfq_id, created_at
            """),
            {
                "buyer_id": buyer_code,
                "drawing_id": drawing_id,
                "due_date": due_date,
                "notes": json.dumps({"note": note}, ensure_ascii=False),
            },
        )
        rfq_row = rfq_result.fetchone()
        rfq_id = rfq_row[0]
        created_at = rfq_row[1]

        part_result = conn.execute(
            text(f"""
                INSERT INTO {SCHEMA}.rfq_parts (rfq_id, part_name, material_raw_text, quantity)
                VALUES (:rfq_id, :part_name, :material, :quantity)
                RETURNING rfq_part_id
            """),
            {
                "rfq_id": rfq_id,
                "part_name": material,
                "material": material,
                "quantity": quantity,
            },
        )
        part_row = part_result.fetchone()
        rfq_part_id = part_row[0]

        for proc in process.split(","):
            proc = proc.strip()
            if proc:
                conn.execute(
                    text(f"""
                        INSERT INTO {SCHEMA}.rfq_part_processes (rfq_part_id, process_code)
                        VALUES (:rfq_part_id, :process_code)
                        ON CONFLICT DO NOTHING
                    """),
                    {"rfq_part_id": rfq_part_id, "process_code": proc},
                )

    return {
        "message": "rfq created",
        "rfq": {
            "id": str(rfq_id),
            "buyer_code": str(buyer_code),
            "material": material,
            "process": process,
            "quantity": quantity,
            "due_date": due_date,
            "note": note,
            "drawing_id": str(drawing_id) if drawing_id else None,
            "created_at": str(created_at),
        },
    }


# ---------------------------------------------------------------------------
# GET /rfqs — RFQ 목록 (기존)
# ---------------------------------------------------------------------------


@router.get("/rfqs")
def get_rfqs(current_user: dict = Depends(get_current_user)):
    if engine is None:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not set")

    with engine.connect() as conn:
        result = conn.execute(text(f"""
            SELECT
                r.rfq_id                    AS id,
                r.buyer_id                  AS buyer_code,
                rp.material_raw_text        AS material,
                string_agg(DISTINCT rpp.process_code, ', ') AS process,
                rp.quantity,
                r.requested_delivery_date   AS due_date,
                r.general_notes_jsonb->>'note' AS note,
                r.created_at
            FROM {SCHEMA}.rfqs r
            LEFT JOIN {SCHEMA}.rfq_parts rp ON r.rfq_id = rp.rfq_id
            LEFT JOIN {SCHEMA}.rfq_part_processes rpp ON rp.rfq_part_id = rpp.rfq_part_id
            WHERE r.buyer_id = CAST(:buyer_id AS uuid)
            GROUP BY r.rfq_id, r.buyer_id, rp.material_raw_text, rp.quantity,
                     r.requested_delivery_date, r.general_notes_jsonb, r.created_at
            ORDER BY r.created_at DESC
        """), {"buyer_id": current_user["id"]})
        rows = result.fetchall()

    data = []
    for row in rows:
        data.append({
            "id": str(row[0]),
            "buyer_code": str(row[1]) if row[1] else None,
            "material": row[2],
            "process": row[3],
            "quantity": row[4],
            "due_date": str(row[5]) if row[5] else None,
            "note": row[6],
            "created_at": str(row[7]),
        })

    return {"count": len(data), "rfqs": data}


# ---------------------------------------------------------------------------
# B-1: GET /api/rfq/{rfq_id} — RFQ 단건 조회
# ---------------------------------------------------------------------------


@router.get("/api/rfq/{rfq_id}")
def get_rfq_detail(rfq_id: str, current_user: dict = Depends(get_current_user)):
    """rfqs + rfq_parts + rfq_part_processes JOIN, 부품별 공정 목록 포함 중첩 반환"""
    if engine is None:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not set")

    with engine.connect() as conn:
        # RFQ 본체 조회
        rfq_row = conn.execute(
            text(f"""
                SELECT rfq_id, buyer_id, status, requested_delivery_date,
                       general_notes_jsonb, drawing_id, created_at
                FROM {SCHEMA}.rfqs
                WHERE rfq_id = :rfq_id
            """),
            {"rfq_id": rfq_id},
        ).fetchone()

        if rfq_row is None:
            raise HTTPException(status_code=404, detail="RFQ를 찾을 수 없습니다")

        # 소유권 검증: buyer는 본인 것만, supplier는 매칭된 것만
        rfq_buyer_id = str(rfq_row[1]) if rfq_row[1] else None
        if current_user["role"] == "buyer" and current_user["id"] != rfq_buyer_id:
            raise HTTPException(status_code=403, detail="본인의 RFQ만 조회할 수 있습니다")
        if current_user["role"] == "supplier":
            mc_check = conn.execute(
                text(f"""
                    SELECT 1 FROM {SCHEMA}.match_candidates mc
                    JOIN {SCHEMA}.match_runs mr ON mc.match_run_id = mr.match_run_id
                    WHERE mr.rfq_id = :rfq_id AND mc.company_id = CAST(:cid AS uuid)
                    LIMIT 1
                """),
                {"rfq_id": rfq_id, "cid": current_user["id"]},
            ).fetchone()
            if mc_check is None:
                raise HTTPException(status_code=403, detail="매칭된 RFQ만 조회할 수 있습니다")

        # 부품 + 공정 조회 (한 번의 쿼리로 가져와서 파이썬에서 그루핑)
        parts_rows = conn.execute(
            text(f"""
                SELECT
                    rp.rfq_part_id,
                    rp.part_name,
                    rp.material_raw_text,
                    rp.quantity,
                    rp.material_id,
                    rp.material_category_code,
                    rp.envelope_length_mm,
                    rp.envelope_width_mm,
                    rp.envelope_height_mm,
                    rp.envelope_diameter_mm,
                    rp.tightest_it_grade,
                    rp.tightest_tolerance_mm,
                    rp.finest_ra_um,
                    rpp.process_code
                FROM {SCHEMA}.rfq_parts rp
                LEFT JOIN {SCHEMA}.rfq_part_processes rpp
                    ON rp.rfq_part_id = rpp.rfq_part_id
                WHERE rp.rfq_id = :rfq_id
                ORDER BY rp.created_at, rpp.sequence_order
            """),
            {"rfq_id": rfq_id},
        ).fetchall()

    # 부품별 그루핑
    parts_map = {}
    for row in parts_rows:
        pid = str(row[0])
        if pid not in parts_map:
            parts_map[pid] = {
                "rfq_part_id": pid,
                "part_name": row[1],
                "material_raw_text": row[2],
                "quantity": row[3],
                "material_id": str(row[4]) if row[4] else None,
                "material_category_code": row[5],
                "envelope_length_mm": float(row[6]) if row[6] is not None else None,
                "envelope_width_mm": float(row[7]) if row[7] is not None else None,
                "envelope_height_mm": float(row[8]) if row[8] is not None else None,
                "envelope_diameter_mm": float(row[9]) if row[9] is not None else None,
                "tightest_it_grade": row[10],
                "tightest_tolerance_mm": float(row[11]) if row[11] is not None else None,
                "finest_ra_um": float(row[12]) if row[12] is not None else None,
                "processes": [],
            }
        if row[13]:  # process_code
            parts_map[pid]["processes"].append(row[13])

    # general_notes 처리
    general_notes = rfq_row[4]
    if isinstance(general_notes, str):
        try:
            general_notes = json.loads(general_notes)
        except (json.JSONDecodeError, TypeError):
            pass

    return {
        "rfq_id": str(rfq_row[0]),
        "buyer_id": str(rfq_row[1]) if rfq_row[1] else None,
        "status": rfq_row[2],
        "requested_delivery_date": str(rfq_row[3]) if rfq_row[3] else None,
        "general_notes": general_notes,
        "drawing_id": str(rfq_row[5]) if rfq_row[5] else None,
        "created_at": str(rfq_row[6]),
        "parts": list(parts_map.values()),
    }


# ---------------------------------------------------------------------------
# B-7: PUT /api/rfq/{rfq_id}/status — RFQ 상태 전이
# ---------------------------------------------------------------------------

# 허용된 전이: (현재 상태) -> (대상 상태) 집합
_RFQ_ALLOWED_TRANSITIONS = {
    "open": {"cancelled", "closed"},
    "quoted": {"cancelled", "closed"},
}


@router.put("/api/rfq/{rfq_id}/status")
def update_rfq_status(rfq_id: str, data: dict,
                      user: dict = Depends(get_current_user)):
    """RFQ 상태 전이. cancelled 시 연쇄 처리 포함."""
    if engine is None:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not set")

    new_status = data.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="status 필드가 필요합니다")

    with engine.begin() as conn:
        # 현재 상태 조회 + 소유권 검증
        rfq_row = conn.execute(
            text(f"""
                SELECT status, buyer_id FROM {SCHEMA}.rfqs
                WHERE rfq_id = :rfq_id
            """),
            {"rfq_id": rfq_id},
        ).fetchone()

        if rfq_row is None:
            raise HTTPException(status_code=404, detail="RFQ를 찾을 수 없습니다")

        current_status = rfq_row[0]
        buyer_id = str(rfq_row[1]) if rfq_row[1] else None

        # 소유권 검증
        if user["role"] == "buyer" and user["id"] != buyer_id:
            raise HTTPException(status_code=403, detail="본인의 RFQ만 상태를 변경할 수 있습니다")

        # 전이 허용 검증
        allowed = _RFQ_ALLOWED_TRANSITIONS.get(current_status, set())
        if new_status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"'{current_status}' 상태에서 '{new_status}'(으)로 전이할 수 없습니다. "
                       f"허용: {sorted(allowed) if allowed else '없음'}",
            )

        # 상태 변경
        conn.execute(
            text(f"""
                UPDATE {SCHEMA}.rfqs
                SET status = :new_status, updated_at = now()
                WHERE rfq_id = :rfq_id
            """),
            {"rfq_id": rfq_id, "new_status": new_status},
        )

        # cancelled 시 연쇄 처리
        if new_status == "cancelled":
            # match_candidates → supplier_response = 'expired'
            conn.execute(
                text(f"""
                    UPDATE {SCHEMA}.match_candidates
                    SET supplier_response = 'expired'
                    WHERE match_run_id IN (
                        SELECT match_run_id FROM {SCHEMA}.match_runs
                        WHERE rfq_id = :rfq_id
                    )
                """),
                {"rfq_id": rfq_id},
            )

            # quote_responses → status = 'withdrawn'
            conn.execute(
                text(f"""
                    UPDATE {SCHEMA}.quote_responses
                    SET status = 'withdrawn', updated_at = now()
                    WHERE rfq_id = :rfq_id
                      AND status NOT IN ('withdrawn', 'expired')
                """),
                {"rfq_id": rfq_id},
            )

            # 관련 supplier 에게 rfq_cancelled 알림 발송
            supplier_rows = conn.execute(
                text(f"""
                    SELECT DISTINCT mc.company_id
                    FROM {SCHEMA}.match_candidates mc
                    JOIN {SCHEMA}.match_runs mr ON mc.match_run_id = mr.match_run_id
                    WHERE mr.rfq_id = :rfq_id
                """),
                {"rfq_id": rfq_id},
            ).fetchall()

            for s_row in supplier_rows:
                _create_notification(
                    conn,
                    recipient_type="supplier",
                    recipient_id=str(s_row[0]),
                    event_type="rfq_cancelled",
                    title="RFQ가 취소되었습니다",
                    message=f"RFQ {rfq_id}가 발주자에 의해 취소되었습니다.",
                    ref_id=rfq_id,
                    ref_type="rfq",
                )

    return {
        "success": True,
        "rfq_id": rfq_id,
        "previous_status": current_status,
        "new_status": new_status,
    }


# ---------------------------------------------------------------------------
# D-1: POST /api/rfq/{rfq_id}/supplement — 클라이언트 보완 요청 루프
# ---------------------------------------------------------------------------


@router.post("/api/rfq/{rfq_id}/supplement")
def supplement_rfq_part(rfq_id: str, data: dict,
                        user: dict = Depends(get_current_user)):
    """
    누락 필드 보완 입력. 채워진 필드만 UPDATE.
    - material → rfq_parts.material_raw_text
    - processes → rfq_part_processes DELETE + 새로 INSERT
    - quantity → rfq_parts.quantity
    보완 완료 후 part_status를 'supplemented'로 변경.
    """
    if engine is None:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not set")

    rfq_part_id = data.get("rfq_part_id")
    if not rfq_part_id:
        raise HTTPException(status_code=400, detail="rfq_part_id는 필수입니다")

    material = data.get("material")
    processes = data.get("processes")
    quantity = data.get("quantity")

    if material is None and processes is None and quantity is None:
        raise HTTPException(
            status_code=400,
            detail="보완할 필드가 하나 이상 필요합니다 (material, processes, quantity)",
        )

    with engine.begin() as conn:
        # 1. rfq_parts에서 rfq_part_id 확인 + rfq_id 소속 확인
        part_row = conn.execute(
            text(f"""
                SELECT rp.rfq_part_id, r.buyer_id
                FROM {SCHEMA}.rfq_parts rp
                JOIN {SCHEMA}.rfqs r ON rp.rfq_id = r.rfq_id
                WHERE rp.rfq_part_id = :rpid AND rp.rfq_id = :rfq_id
            """),
            {"rpid": rfq_part_id, "rfq_id": rfq_id},
        ).fetchone()

        if part_row is None:
            raise HTTPException(
                status_code=404,
                detail="해당 RFQ에 속한 부품을 찾을 수 없습니다",
            )

        # 소유권 검증 (buyer만 보완 가능)
        buyer_id = str(part_row[1]) if part_row[1] else None
        if user["role"] == "buyer" and user["id"] != buyer_id:
            raise HTTPException(status_code=403, detail="본인의 RFQ만 보완할 수 있습니다")

        # 2. 채워진 필드만 UPDATE
        updated_fields = []

        if material is not None:
            conn.execute(
                text(f"""
                    UPDATE {SCHEMA}.rfq_parts
                    SET material_raw_text = :material
                    WHERE rfq_part_id = :rpid
                """),
                {"material": material, "rpid": rfq_part_id},
            )
            updated_fields.append("material")

        if processes is not None:
            # 기존 공정 DELETE + 새로 INSERT
            conn.execute(
                text(f"""
                    DELETE FROM {SCHEMA}.rfq_part_processes
                    WHERE rfq_part_id = :rpid
                """),
                {"rpid": rfq_part_id},
            )
            for idx, proc_code in enumerate(processes):
                conn.execute(
                    text(f"""
                        INSERT INTO {SCHEMA}.rfq_part_processes
                            (rfq_part_id, process_code, sequence_order)
                        VALUES (:rpid, :pc, :seq)
                        ON CONFLICT DO NOTHING
                    """),
                    {"rpid": rfq_part_id, "pc": proc_code, "seq": idx},
                )
            updated_fields.append("processes")

        if quantity is not None:
            conn.execute(
                text(f"""
                    UPDATE {SCHEMA}.rfq_parts
                    SET quantity = :qty
                    WHERE rfq_part_id = :rpid
                """),
                {"qty": quantity, "rpid": rfq_part_id},
            )
            updated_fields.append("quantity")

        # 3. part_status를 'supplemented'로 UPDATE (컬럼 미존재 시 안전 처리)
        try:
            conn.execute(
                text(f"""
                    UPDATE {SCHEMA}.rfq_parts
                    SET part_status = 'supplemented'
                    WHERE rfq_part_id = :rpid
                """),
                {"rpid": rfq_part_id},
            )
        except Exception:
            # part_status 컬럼이 DDL에 아직 없을 수 있음 — 무시
            pass

    return {
        "success": True,
        "rfq_part_id": rfq_part_id,
        "updated_fields": updated_fields,
        "message": "보완 완료. 매칭 실행 버튼을 눌러주세요.",
    }
