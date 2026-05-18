from fastapi import FastAPI, UploadFile
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI()

# 0. DB 연결 설정
DATABASE_URL = os.getenv("DATABASE_URL")

engine = None
if DATABASE_URL:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)


# 1. 서버 상태 확인
@app.get("/")
def root():
    return {
        "message": "ok",
        "database_url_exists": DATABASE_URL is not None
    }


# 2. DB 연결 확인
@app.get("/db-test")
def db_test():
    if engine is None:
        return {
            "db_connected": False,
            "error": "DATABASE_URL 환경변수가 없습니다."
        }

    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).scalar()

        return {
            "db_connected": result == 1,
            "result": result
        }

    except Exception as e:
        return {
            "db_connected": False,
            "error": str(e)
        }


# 3. 더미 분석
def fake_analyze(filename):
    if "steel" in filename:
        return {"material": "SUS304", "process": "milling"}
    else:
        return {"material": "aluminum", "process": "turning"}


# 4. 더미 업체 DB
companies = [
    {"name": "A공장", "process": "milling"},
    {"name": "B공장", "process": "turning"},
    {"name": "C공장", "process": "milling"}
]


# 5. 매칭
def match(data):
    result = []
    for c in companies:
        if c["process"] == data["process"]:
            result.append(c["name"])
    return result


# 6. 분석 API
@app.post("/analyze")
async def analyze(file: UploadFile):
    data = fake_analyze(file.filename)
    result = match(data)

    return {
        "analysis": data,
        "recommended": result
    }

# pip install sqlalchemy psycopg2-binary
# bash: export DATABASE_URL=postgresql://아이디:비밀번호:호스트:포트/DB이름
# powershell: $env:DATABASE_URL="postgresql://아이디:비밀번호@호스트:포트/DB이름"
# uvicorn main:app --reload
# DATABASE_URL=postgresql://postgres:비밀번호@shortline.proxy.rlwy.net:51309/railway
# pip install fastapi uvicorn sqlalchemy psycopg2-binary python-dotenv python-multipart

