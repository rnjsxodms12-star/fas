"""
레거시 유틸 엔드포인트: GET /, POST /predict, GET /db-test
"""

from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from routers.deps import engine, DATABASE_URL

router = APIRouter()


@router.get("/")
def root():
    return {"message": "ok", "database_url_exists": DATABASE_URL is not None}


@router.post("/predict")
def predict(data: dict):
    value = data.get("value", 0)
    result = "anomaly" if value > 10 else "normal"
    return {"result": result}


@router.get("/db-test")
def db_test():
    if engine is None:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not set")
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        row = result.fetchone()
    return {"db_connected": True, "result": row[0]}
