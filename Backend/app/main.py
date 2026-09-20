from fastapi import FastAPI
from sqlalchemy import text
from app.database import engine

app = FastAPI()


@app.get("/")
def root():
    return {"message": "Disaster Management System API"}

@app.get("/health")
def health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {
            "api": "ok",
            "database": "ok"
        }
    except Exception:
        return {
            "api": "ok",
            "database": "error"
        }