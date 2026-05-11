import os
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from routers import (
    auth, signup, companies, rfqs, matching, orders,
    drawings, quotes, reviews, notifications, admin, catalog, legacy
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# API Routers
# =========================
app.include_router(legacy.router)
app.include_router(signup.router)
app.include_router(auth.router)
app.include_router(matching.router)
app.include_router(companies.router)
app.include_router(rfqs.router)
app.include_router(orders.router)
app.include_router(drawings.router)
app.include_router(quotes.router)
app.include_router(reviews.router)
app.include_router(notifications.router)
app.include_router(admin.router)
app.include_router(catalog.router)


# =========================
# Frontend Static Files
# =========================
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"

if FRONTEND_DIR.exists():
    app.mount(
        "/static",
        StaticFiles(directory=str(FRONTEND_DIR)),
        name="static"
    )


@app.get("/", include_in_schema=False)
def serve_index():
    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return {"message": "IMMA API server is running", "frontend": "index.html not found"}


@app.get("/buyer", include_in_schema=False)
def serve_buyer():
    return FileResponse(FRONTEND_DIR / "buyer.html")


@app.get("/supplier", include_in_schema=False)
def serve_supplier():
    return FileResponse(FRONTEND_DIR / "supplier.html")


@app.get("/admin-ui", include_in_schema=False)
def serve_admin_ui():
    return FileResponse(FRONTEND_DIR / "admin.html")
