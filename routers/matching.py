"""
매칭 엔드포인트:
- GET  /match/{rfq_id}                                          (기존 MV 기반 v1)
- POST /api/match-v2                                            (기존 RAG pipeline + B-3 이력 저장)
- GET  /api/company/matches                                     (B-3b: 업체 수신 매칭 조회)
- PUT  /api/match-candidates/{match_run_id}/{company_id}/respond (B-4: 수락/거절)
"""

import json
import sys
from datetime import date, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

from routers.deps import engine, SCHEMA, get_current_user, _create_notification

router = APIRouter()

# ---------------------------------------------------------------------------
# RAG pipeline import (기존 main.py 로직 유지)
# ---------------------------------------------------------------------------

PIPELINE_DIR = Path(__file__).resolve().parent.parent / "pipeline"
if PIPELINE_DIR.exists() and str(PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(PIPELINE_DIR))

try:
    from pipeline_runner import run_pipeline_from_dict
except Exception as _e:
    run_pipeline_from_dict = None


# ---------------------------------------------------------------------------
# Matching v1 (MV 기반)
# ---------------------------------------------------------------------------


@router.get("/match/{rfq_id}")
def match_suppliers(rfq_id: str, current_user: dict = Depends(get_current_user)):
    if engine is None:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not set")

    with engine.connect() as conn:
        rfq_result = conn.execute(
            text(f"""
                SELECT
                    r.rfq_id, r.buyer_id,
                    rp.material_raw_text,
                    string_agg(DISTINCT rpp.process_code, ', '),
                    rp.quantity,
                    r.requested_delivery_date,
                    r.general_notes_jsonb->>'note'
                FROM {SCHEMA}.rfqs r
                LEFT JOIN {SCHEMA}.rfq_parts rp ON r.rfq_id = rp.rfq_id
                LEFT JOIN {SCHEMA}.rfq_part_processes rpp ON rp.rfq_part_id = rpp.rfq_part_id
                WHERE r.rfq_id = :rfq_id
                GROUP BY r.rfq_id, r.buyer_id, rp.material_raw_text, rp.quantity,
                         r.requested_delivery_date, r.general_notes_jsonb
            """),
            {"rfq_id": rfq_id},
        )
        rfq = rfq_result.fetchone()

        if rfq is None:
            raise HTTPException(status_code=404, detail="RFQ not found")

        material = rfq[2] or ""
        process_csv = rfq[3] or ""
        process_codes = [p.strip() for p in process_csv.split(",") if p.strip()]

        match_result = conn.execute(
            text(f"""
                SELECT
                    cs.company_id,
                    cs.company_name,
                    COALESCE(s.region, s.city, '') AS region,
                    COALESCE(c.company_size, '')    AS company_size,
                    cs.process_codes,
                    cs.best_it_grade,
                    cs.best_ra_um,
                    cs.avg_rating_overall,
                    cs.overall_status,
                    cs.material_codes,
                    cs.material_category_codes
                FROM {SCHEMA}.company_capability_summary cs
                JOIN {SCHEMA}.companies c ON cs.company_id = c.company_id
                LEFT JOIN {SCHEMA}.company_sites s
                    ON c.company_id = s.company_id AND s.is_primary = true
                WHERE cs.overall_status IN ('available', 'limited', 'unknown')
                  AND (
                      cs.material_codes @> ARRAY[upper(:material)]::text[]
                      OR cs.material_category_codes @> ARRAY[lower(:material)]::text[]
                  )
            """),
            {"material": material},
        )
        rows = match_result.fetchall()

    suppliers = []
    for row in rows:
        company_process_codes = row[4] or []
        matched = [p for p in process_codes if p in company_process_codes]
        if not matched and process_codes:
            continue

        best_it = row[5] or 10
        best_ra = row[6] or 3.2
        avg_rating = row[7] or 3.0

        match_score = 100
        match_score += (10 - best_it) * 4
        if best_ra <= 0.8:
            match_score += 15
        elif best_ra <= 1.6:
            match_score += 10
        match_score += int((avg_rating - 3.0) * 10)

        suppliers.append({
            "company_code": str(row[0]),
            "company_name": row[1],
            "region": row[2],
            "company_size": row[3],
            "match_score": match_score,
            "matched_processes": ", ".join(matched) if matched else process_csv,
            "service_mode": "in_house",
            "best_it_grade": best_it,
            "best_tolerance_mm": None,
            "best_ra_um": best_ra,
            "avg_lead_days": None,
            "matched_materials": ", ".join(row[9] or []),
            "score_reason": {
                "it_grade": "IT 등급 숫자가 낮을수록 정밀도 우수",
                "surface_roughness": "Ra 값이 낮을수록 표면 품질 우수",
                "rating": "업체 평점 반영",
            },
        })

    suppliers.sort(key=lambda x: x["match_score"], reverse=True)

    return {
        "rfq": {
            "id": str(rfq[0]),
            "buyer_code": str(rfq[1]) if rfq[1] else None,
            "material": rfq[2],
            "process": rfq[3],
            "quantity": rfq[4],
            "due_date": str(rfq[5]) if rfq[5] else None,
            "note": rfq[6],
        },
        "match_count": len(suppliers),
        "recommended_suppliers": suppliers,
    }


# ---------------------------------------------------------------------------
# Matching v2 (RAG pipeline + B-3 이력 저장)
# ---------------------------------------------------------------------------


@router.post("/api/match-v2")
def match_v2(data: dict, current_user: dict = Depends(get_current_user)):
    """RAG 파이프라인 실행 후 match_runs/match_candidates에 이력 저장 + 알림 발송"""
    if run_pipeline_from_dict is None:
        raise HTTPException(status_code=500, detail="RAG pipeline is not loaded")
    if not data:
        raise HTTPException(status_code=400, detail="요청 본문이 비어 있습니다")
    if "parts" not in data:
        raise HTTPException(status_code=400, detail="parts 필드가 필요합니다")

    try:
        result = run_pipeline_from_dict(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # --- B-3: 매칭 이력 저장 ---
    # result에서 rfq_id, buyer_id, 후보 목록을 추출하여 DB에 기록
    # pipeline 결과 구조에서 rfq_id와 후보 정보 추출 시도
    if engine is not None:
        try:
            _save_match_history(data, result)
        except Exception:
            # 이력 저장 실패가 매칭 결과 반환을 차단하지 않음
            pass

    return result


def _compute_availability_score(conn, company_id: str, rfq_id: str):
    """
    업체의 납기 가용성 점수를 산출한다.
    반환: (availability_score, availability_info dict)
    """
    default_info = {
        "available_from": None,
        "available_days": None,
        "estimated_lead_days": None,
        "delivery_feasible": None,
    }

    # 1. requested_delivery_date 조회
    try:
        rfq_row = conn.execute(
            text(f"""
                SELECT requested_delivery_date
                FROM {SCHEMA}.rfqs WHERE rfq_id = :rid
            """),
            {"rid": rfq_id},
        ).fetchone()
    except Exception:
        return 0.5, default_info

    if not rfq_row or not rfq_row[0]:
        return 0.5, default_info

    requested_delivery = rfq_row[0]  # date 객체

    # 2. 해당 부품의 required_processes에서 typical_lead_days 합산
    try:
        lead_rows = conn.execute(
            text(f"""
                SELECT COALESCE(cpc.typical_lead_days, 3) AS lead_days
                FROM {SCHEMA}.rfq_parts rp
                JOIN {SCHEMA}.rfq_part_processes rpp
                    ON rp.rfq_part_id = rpp.rfq_part_id
                LEFT JOIN {SCHEMA}.company_process_capabilities cpc
                    ON cpc.company_id = :cid
                    AND cpc.process_code = rpp.process_code
                    AND cpc.is_active = true
                WHERE rp.rfq_id = :rid
            """),
            {"cid": company_id, "rid": rfq_id},
        ).fetchall()
    except Exception:
        return 0.5, default_info

    if not lead_rows:
        return 0.5, default_info

    total_lead_days = sum(r[0] for r in lead_rows)
    if total_lead_days <= 0:
        total_lead_days = 3

    # 3. 시간 범위 산출
    today = date.today()
    latest_start = requested_delivery - timedelta(days=total_lead_days)

    info = {
        "available_from": today.isoformat(),
        "available_days": None,
        "estimated_lead_days": total_lead_days,
        "delivery_feasible": None,
    }

    if latest_start < today:
        # 납기 불충족
        info["delivery_feasible"] = False
        info["available_days"] = 0
        return 0.3, info

    # 4. equipment_daily_schedule에서 가용 시간 합산
    try:
        avail_row = conn.execute(
            text(f"""
                SELECT COALESCE(SUM(available_hours), 0),
                       COUNT(*) FILTER (WHERE status IN ('available', 'partially_booked'))
                FROM {SCHEMA}.equipment_daily_schedule
                WHERE company_id = :cid
                  AND schedule_date BETWEEN :d_from AND :d_to
                  AND status IN ('available', 'partially_booked')
            """),
            {"cid": company_id, "d_from": today, "d_to": latest_start},
        ).fetchone()
        total_available_hours = float(avail_row[0])
        available_days = int(avail_row[1])
    except Exception:
        # equipment_daily_schedule 테이블 미존재 등
        info["delivery_feasible"] = True
        info["available_days"] = (latest_start - today).days
        return 0.5, info

    info["available_days"] = available_days

    # 필요 시간 추정: lead_days * 8h
    required_hours = total_lead_days * 8.0

    if total_available_hours <= 0 and available_days == 0:
        # 스케줄 데이터 없음
        info["delivery_feasible"] = True
        info["available_days"] = (latest_start - today).days
        return 0.5, info

    info["delivery_feasible"] = True

    if total_available_hours >= required_hours:
        # 충분한 가용 시간
        return 1.0, info
    elif total_available_hours >= required_hours * 0.5:
        # 빠듯한 가용 시간
        return 0.7, info
    else:
        # 부족
        return 0.3, info


def _save_match_history(input_data: dict, pipeline_result):
    """매칭 결과를 match_runs / match_candidates에 저장하고 알림 발송.
    availability_score, technical_score, quality_score를 산출하여
    total_score에 가중 합산 반영."""
    # pipeline_result 가 dict 가 아닌 경우 건너뜀
    if not isinstance(pipeline_result, dict):
        return

    # rfq_id 추출 (pipeline 결과 또는 입력 데이터에서)
    rfq_id = (pipeline_result.get("rfq_id")
              or pipeline_result.get("rfq", {}).get("id")
              or input_data.get("rfq_id"))

    buyer_id = (pipeline_result.get("buyer_id")
                or pipeline_result.get("rfq", {}).get("buyer_code")
                or input_data.get("buyer_code"))

    # 후보 목록 추출
    candidates = (pipeline_result.get("recommended_suppliers")
                  or pipeline_result.get("candidates")
                  or [])

    # 입력 요약
    input_summary = {
        "parts_count": len(input_data.get("parts", [])),
        "parts": [
            {
                "material": p.get("material"),
                "processes": p.get("processes"),
                "quantity": p.get("quantity"),
            }
            for p in input_data.get("parts", [])[:5]  # 최대 5개만 요약
        ],
    }

    with engine.begin() as conn:
        # match_runs INSERT
        mr_row = conn.execute(
            text(f"""
                INSERT INTO {SCHEMA}.match_runs
                    (rfq_id, algorithm_version, mode, input_summary_jsonb)
                VALUES (:rfq_id, 'phase1_hard_filter', 'hard_filter',
                        CAST(:input_summary AS JSONB))
                RETURNING match_run_id
            """),
            {
                "rfq_id": rfq_id,
                "input_summary": json.dumps(input_summary, ensure_ascii=False),
            },
        ).fetchone()
        match_run_id = mr_row[0]

        # 각 후보별 스코어 산출 + match_candidates INSERT
        scored_candidates = []

        for cand in candidates:
            company_id = cand.get("company_code") or cand.get("company_id")
            if not company_id:
                continue

            # --- technical_score ---
            best_it = cand.get("best_it_grade")
            if best_it is not None and best_it < 99:
                technical_score = round((18 - best_it) / 18, 3)
            else:
                technical_score = 0.5

            # --- quality_score ---
            avg_rating = cand.get("avg_rating") or cand.get("avg_rating_overall")
            if avg_rating is not None and avg_rating > 0:
                quality_score = round(float(avg_rating) / 5.0, 3)
            else:
                quality_score = 0.5

            # --- availability_score ---
            if rfq_id:
                availability_score, availability_info = _compute_availability_score(
                    conn, str(company_id), str(rfq_id),
                )
            else:
                availability_score = 0.5
                availability_info = {
                    "available_from": None,
                    "available_days": None,
                    "estimated_lead_days": None,
                    "delivery_feasible": None,
                }

            # --- total_score (가중 합산) ---
            total_score = round(
                technical_score * 0.4
                + availability_score * 0.3
                + quality_score * 0.3,
                3,
            )

            scored_candidates.append({
                "company_id": company_id,
                "technical_score": technical_score,
                "availability_score": availability_score,
                "quality_score": quality_score,
                "total_score": total_score,
                "availability_info": availability_info,
                "explanation": cand.get("score_reason") or cand.get("explanation") or {},
            })

        # total_score 내림차순 정렬 → rank_no
        scored_candidates.sort(key=lambda x: x["total_score"], reverse=True)

        for rank, sc in enumerate(scored_candidates, 1):
            conn.execute(
                text(f"""
                    INSERT INTO {SCHEMA}.match_candidates
                        (match_run_id, company_id, hard_filter_pass,
                         technical_score, availability_score, quality_score,
                         total_score, rank_no, explanation_jsonb,
                         supplier_response)
                    VALUES (:mrid, :cid, true,
                            :tech, :avail, :qual,
                            :score, :rank,
                            CAST(:explanation AS JSONB), 'pending')
                    ON CONFLICT (match_run_id, company_id) DO NOTHING
                """),
                {
                    "mrid": match_run_id,
                    "cid": sc["company_id"],
                    "tech": sc["technical_score"],
                    "avail": sc["availability_score"],
                    "qual": sc["quality_score"],
                    "score": sc["total_score"],
                    "rank": rank,
                    "explanation": json.dumps(sc["explanation"], ensure_ascii=False),
                },
            )

            # 알림: 매칭된 supplier에게 match_request
            _create_notification(
                conn,
                recipient_type="supplier",
                recipient_id=str(sc["company_id"]),
                event_type="match_request",
                title="새로운 제조 요청이 도착했습니다",
                message=f"RFQ {rfq_id}에 대한 매칭 요청입니다. 확인 후 수락/거절해 주세요.",
                ref_id=str(match_run_id),
                ref_type="match_run",
            )

        # 알림: buyer에게 match_completed
        if buyer_id:
            _create_notification(
                conn,
                recipient_type="buyer",
                recipient_id=str(buyer_id),
                event_type="match_completed",
                title="매칭이 완료되었습니다",
                message=f"RFQ {rfq_id}에 대해 {len(scored_candidates)}개 업체가 매칭되었습니다.",
                ref_id=str(match_run_id),
                ref_type="match_run",
            )

        # --- 매칭 결과 응답에 스코어 + availability_info 보강 ---
        # pipeline_result의 후보 목록에 필드 추가
        original_candidates = (pipeline_result.get("recommended_suppliers")
                               or pipeline_result.get("candidates")
                               or [])

        # scored_candidates를 company_id 기준 lookup으로 변환
        score_lookup = {
            str(sc["company_id"]): sc for sc in scored_candidates
        }

        for cand in original_candidates:
            cid = str(cand.get("company_code") or cand.get("company_id") or "")
            sc = score_lookup.get(cid)
            if sc:
                cand["technical_score"] = sc["technical_score"]
                cand["availability_score"] = sc["availability_score"]
                cand["quality_score"] = sc["quality_score"]
                cand["total_score"] = sc["total_score"]
                cand["availability_info"] = sc["availability_info"]
            else:
                cand["availability_score"] = None
                cand["availability_info"] = None


# ---------------------------------------------------------------------------
# B-3b: GET /api/company/matches — 업체 수신 매칭 조회
# ---------------------------------------------------------------------------


@router.get("/api/company/matches")
def get_company_matches(user: dict = Depends(get_current_user)):
    """JWT의 company_id로 본인에게 온 매칭 요청 목록 조회"""
    if engine is None:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not set")

    company_id = user["id"]

    with engine.connect() as conn:
        rows = conn.execute(
            text(f"""
                SELECT
                    mc.match_run_id,
                    mr.rfq_id,
                    rp.part_name,
                    rp.material_raw_text,
                    string_agg(DISTINCT rpp.process_code, ', ') AS processes,
                    mc.total_score,
                    mc.rank_no,
                    mc.supplier_response,
                    mc.responded_at,
                    mc.created_at
                FROM {SCHEMA}.match_candidates mc
                JOIN {SCHEMA}.match_runs mr ON mc.match_run_id = mr.match_run_id
                LEFT JOIN {SCHEMA}.rfqs r ON mr.rfq_id = r.rfq_id
                LEFT JOIN {SCHEMA}.rfq_parts rp ON mr.rfq_part_id = rp.rfq_part_id
                    OR (mr.rfq_part_id IS NULL AND rp.rfq_id = mr.rfq_id)
                LEFT JOIN {SCHEMA}.rfq_part_processes rpp ON rp.rfq_part_id = rpp.rfq_part_id
                WHERE mc.company_id = :cid
                GROUP BY mc.match_run_id, mr.rfq_id, rp.part_name,
                         rp.material_raw_text, mc.total_score, mc.rank_no,
                         mc.supplier_response, mc.responded_at, mc.created_at
                ORDER BY mc.created_at DESC
            """),
            {"cid": company_id},
        ).fetchall()

    matches = []
    for row in rows:
        matches.append({
            "match_run_id": str(row[0]),
            "rfq_id": str(row[1]) if row[1] else None,
            "part_name": row[2],
            "material": row[3],
            "processes": row[4],
            "total_score": float(row[5]) if row[5] is not None else None,
            "rank_no": row[6],
            "supplier_response": row[7],
            "responded_at": str(row[8]) if row[8] else None,
            "created_at": str(row[9]),
        })

    return {"count": len(matches), "matches": matches}


# ---------------------------------------------------------------------------
# B-4: PUT /api/match-candidates/{match_run_id}/{company_id}/respond
# ---------------------------------------------------------------------------


@router.put("/api/match-candidates/{match_run_id}/{company_id}/respond")
def respond_to_match(match_run_id: str, company_id: str, data: dict,
                     user: dict = Depends(get_current_user)):
    """업체 수락/거절. JWT의 company_id와 path의 company_id 일치 검증."""
    if engine is None:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not set")

    # 소유권 검증
    if user["id"] != company_id:
        raise HTTPException(status_code=403, detail="본인의 매칭 요청만 응답할 수 있습니다")

    response = data.get("response")
    if response not in ("accepted", "declined"):
        raise HTTPException(
            status_code=400,
            detail="response는 'accepted' 또는 'declined'이어야 합니다",
        )

    with engine.begin() as conn:
        # 매칭 후보 존재 확인
        mc_row = conn.execute(
            text(f"""
                SELECT mc.supplier_response, mr.rfq_id
                FROM {SCHEMA}.match_candidates mc
                JOIN {SCHEMA}.match_runs mr ON mc.match_run_id = mr.match_run_id
                WHERE mc.match_run_id = :mrid AND mc.company_id = :cid
            """),
            {"mrid": match_run_id, "cid": company_id},
        ).fetchone()

        if mc_row is None:
            raise HTTPException(status_code=404, detail="매칭 후보를 찾을 수 없습니다")

        current_response = mc_row[0]
        rfq_id = mc_row[1]

        # 이미 응답한 경우
        if current_response and current_response not in ("pending", None):
            raise HTTPException(
                status_code=400,
                detail=f"이미 '{current_response}'(으)로 응답하셨습니다",
            )

        # supplier_response + responded_at UPDATE
        conn.execute(
            text(f"""
                UPDATE {SCHEMA}.match_candidates
                SET supplier_response = :resp, responded_at = now()
                WHERE match_run_id = :mrid AND company_id = :cid
            """),
            {"resp": response, "mrid": match_run_id, "cid": company_id},
        )

        # buyer에게 알림 발송
        if rfq_id:
            buyer_row = conn.execute(
                text(f"SELECT buyer_id FROM {SCHEMA}.rfqs WHERE rfq_id = :rid"),
                {"rid": rfq_id},
            ).fetchone()

            if buyer_row and buyer_row[0]:
                event = "supplier_accepted" if response == "accepted" else "supplier_declined"
                title = ("업체가 매칭을 수락했습니다" if response == "accepted"
                         else "업체가 매칭을 거절했습니다")
                # 업체명 조회
                comp_row = conn.execute(
                    text(f"SELECT company_name FROM {SCHEMA}.companies WHERE company_id = :cid"),
                    {"cid": company_id},
                ).fetchone()
                comp_name = comp_row[0] if comp_row else company_id

                _create_notification(
                    conn,
                    recipient_type="buyer",
                    recipient_id=str(buyer_row[0]),
                    event_type=event,
                    title=title,
                    message=f"{comp_name}이(가) RFQ {rfq_id}에 대한 매칭을 {'수락' if response == 'accepted' else '거절'}했습니다.",
                    ref_id=str(rfq_id),
                    ref_type="rfq",
                )

    return {
        "success": True,
        "match_run_id": match_run_id,
        "company_id": company_id,
        "response": response,
    }
