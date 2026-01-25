from fastapi import FastAPI
from app.routers import auth, expenses, budgets, reports
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Expense Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
