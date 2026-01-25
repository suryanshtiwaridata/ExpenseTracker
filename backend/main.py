from fastapi import FastAPI, Request
from app.routers import auth, expenses, budgets, reports
import time
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Expense Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    print(f"REQUEST: {request.method} {request.url.path} - STATUS: {response.status_code} - TIME: {process_time:.2f}ms")
    return response

app.include_router(auth.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")
app.include_router(budgets.router, prefix="/api")
app.include_router(reports.router, prefix="/api")

@app.on_event("startup")
async def startup_db_client():
    try:
        from app.database import client
        # ping the database to check if it's connected
        await client.admin.command('ping')
        print("Connected to MongoDB!")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")

@app.get("/")
async def root():
    return {
        "message": "Expense Tracker API is running",
        "database": "connected"
    }
