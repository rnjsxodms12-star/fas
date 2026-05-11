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
# Frontend UI
# =========================
BASE_DIR = Path(__file__).resolve().parent
UI_DIR = BASE_DIR / "machhub_ui"

if UI_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(UI_DIR)), name="static")


@app.get("/", include_in_schema=False)
def serve_landing():
    landing_path = UI_DIR / "landing.html"
    if landing_path.exists():
        return FileResponse(landing_path)
    return {
        "message": "IMMA API server is running",
        "ui": "machhub_ui/landing.html not found"
    }


@app.get("/client", include_in_schema=False)
def serve_client():
    return FileResponse(UI_DIR / "client-dashboard.html")


@app.get("/supplier", include_in_schema=False)
def serve_supplier():
    return FileResponse(UI_DIR / "supplier-dashboard.html")


@app.get("/admin-ui", include_in_schema=False)
def serve_admin_ui():
    return FileResponse(UI_DIR / "admin-dashboard.html")


@app.get("/matching-ui", include_in_schema=False)
def serve_matching_ui():
    return FileResponse(UI_DIR / "matching.html")


@app.get("/quote-request", include_in_schema=False)
def serve_quote_request():
    return FileResponse(UI_DIR / "quote-request.html")


@app.get("/order-management", include_in_schema=False)
def serve_order_management():
    return FileResponse(UI_DIR / "order-management.html")


@app.get("/client-fulfillment", include_in_schema=False)
def serve_client_fulfillment():
    return FileResponse(UI_DIR / "client-fulfillment.html")


@app.get("/supplier-workbench", include_in_schema=False)
def serve_supplier_workbench():
    return FileResponse(UI_DIR / "supplier-workbench.html")


@app.get("/supplier-settings", include_in_schema=False)
def serve_supplier_settings():
    return FileResponse(UI_DIR / "supplier-settings.html")


@app.get("/admin-control-center", include_in_schema=False)
def serve_admin_control_center():
    return FileResponse(UI_DIR / "admin-control-center.html")


@app.get("/admin-operations", include_in_schema=False)
def serve_admin_operations():
    return FileResponse(UI_DIR / "admin-operations.html")


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
