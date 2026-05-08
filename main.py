import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import (
    auth, signup, companies, rfqs, matching, orders,
    drawings, quotes, reviews, notifications, admin, catalog, legacy
)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

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
