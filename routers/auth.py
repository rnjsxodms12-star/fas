"""
Phase A-1: 로그인 + 사용자 정보 조회
- POST /api/login
- GET  /api/me
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

from routers.deps import (
    engine, SCHEMA,
    _verify_password, _create_token, get_current_user,
)

router = APIRouter()


@router.post("/api/login")
def login(data: dict):
    """
    login_id + password → buyers/companies 순차 조회 → JWT 발급.
    role은 login_id가 어느 테이블에 있는지로 자동 판별.
    """
    if engine is None:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not set")

    login_id = data.get("login_id")
    password = data.get("password")

    if not login_id or not password:
        raise HTTPException(status_code=400, detail="login_id와 password가 필요합니다")

    with engine.connect() as conn:
        # 1) buyers 테이블에서 login_id 조회
        buyer_row = conn.execute(
            text(f"""
                SELECT buyer_id, login_id, password_hash
                FROM {SCHEMA}.buyers
                WHERE login_id = :login_id
            """),
            {"login_id": login_id},
        ).fetchone()

        if buyer_row:
            if not _verify_password(password, buyer_row[2]):
                raise HTTPException(status_code=401, detail="비밀번호가 일치하지 않습니다")
            token = _create_token(
                sub=str(buyer_row[0]),
                login_id=buyer_row[1],
                role="buyer",
            )
            return {
                "access_token": token,
                "token_type": "bearer",
                "user": {
                    "id": str(buyer_row[0]),
                    "login_id": buyer_row[1],
                    "role": "buyer",
                },
            }

        # 2) companies 테이블에서 login_id 조회
        company_row = conn.execute(
            text(f"""
                SELECT company_id, login_id, password_hash
                FROM {SCHEMA}.companies
                WHERE login_id = :login_id
            """),
            {"login_id": login_id},
        ).fetchone()

        if company_row:
            if not _verify_password(password, company_row[2]):
                raise HTTPException(status_code=401, detail="비밀번호가 일치하지 않습니다")
            token = _create_token(
                sub=str(company_row[0]),
                login_id=company_row[1],
                role="supplier",
            )
            return {
                "access_token": token,
                "token_type": "bearer",
                "user": {
                    "id": str(company_row[0]),
                    "login_id": company_row[1],
                    "role": "supplier",
                },
            }

    # 3) 둘 다 없음
    raise HTTPException(status_code=401, detail="존재하지 않는 계정입니다")


@router.get("/api/me")
def me(current_user: dict = Depends(get_current_user)):
    """JWT에서 사용자 정보 반환"""
    return {
        "id": current_user["id"],
        "login_id": current_user["login_id"],
        "role": current_user["role"],
    }
