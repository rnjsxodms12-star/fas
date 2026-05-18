from fastapi import FastAPI, UploadFile

app = FastAPI()


# 1. 파일명 기반 더미 분석
def fake_analyze(filename)
    filename = filename.lower()

    if steel in filename or sus in filename
        return {
            material SUS304,
            process milling,
            size 100x50
        }

    elif aluminum in filename or al in filename
        return {
            material AL6061,
            process turning,
            size 80x40
        }

    elif bracket in filename
        return {
            material SS400,
            process milling,
            size 120x60
        }

    else
        return {
            material unknown,
            process milling,
            size unknown
        }


# 2. 더미 업체 DB
companies = [
    {name A공장, process milling},
    {name B공장, process turning},
    {name C공장, process milling}
]


# 3. 매칭
def match(data)
    result = []

    for c in companies
        if c[process] == data[process]
            result.append(c[name])

    return result


# 4. API
@app.post(analyze)
async def analyze(file UploadFile)
    data = fake_analyze(file.filename)
    result = match(data)

    return {
        filename file.filename,
        analysis data,
        recommended result
    }