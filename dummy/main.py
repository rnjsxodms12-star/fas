from fastapi import FastAPI, UploadFile

app = FastAPI()

# 1. 더미 분석
def fake_analyze(filename):
    if "steel" in filename:
        return {"material": "SUS304", "process": "milling"}
    else:
        return {"material": "aluminum", "process": "turning"}

# 2. 더미 업체 DB
companies = [
    {"name": "A공장", "process": "milling"},
    {"name": "B공장", "process": "turning"},
    {"name": "C공장", "process": "milling"}
]

# 3. 매칭
def match(data):
    result = []
    for c in companies:
        if c["process"] == data["process"]:
            result.append(c["name"])
    return result

# 4. API
@app.post("/analyze")
async def analyze(file: UploadFile):
    data = fake_analyze(file.filename)
    result = match(data)

    return {
        "analysis": data,
        "recommended": result
    }