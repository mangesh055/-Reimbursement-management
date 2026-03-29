import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine
import app.models  # ensure all models are imported so Base.metadata has them

from app.routers import (auth, users, companies, expenses, approvals,
                          approval_rules, budgets, analytics, ai, audit, notifications)

# Auto-create tables
Base.metadata.create_all(bind=engine)

# Create upload dir
os.makedirs("uploads", exist_ok=True)

app = FastAPI(
    title="ReimburseAI",
    description="AI-powered expense reimbursement platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

for router_module in [auth, users, companies, expenses, approvals,
                       approval_rules, budgets, analytics, ai, audit, notifications]:
    app.include_router(router_module.router)


@app.get("/")
def root():
    return {"message": "ReimburseAI API is running", "docs": "/docs"}
