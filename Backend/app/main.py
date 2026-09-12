from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def root():
    return {"message": "Disaster Management System API"}


@app.get("/health")
def health():
    return {"status": "healthy"}