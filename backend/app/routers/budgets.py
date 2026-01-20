from fastapi import APIRouter, HTTPException, Depends
from app.models import BudgetCreate, Budget
from app.database import get_database
from app.routers.expenses import get_current_user
from datetime import datetime
from typing import List
import uuid

router = APIRouter(prefix="/budgets", tags=["budgets"])
db = get_database()

@router.post("/", response_model=Budget)
async def create_budget(budget: BudgetCreate, current_user: dict = Depends(get_current_user)):
    budget_dict = budget.dict()
    budget_dict["id"] = str(uuid.uuid4())
    budget_dict["user_id"] = current_user["id"]
    budget_dict["current_spent"] = 0.0
    
    # Calculate current spent for this category/month
    # For simplicity, we'll just initialize it as 0.0 and update it later or calculate on the fly
    await db.budgets.insert_one(budget_dict)
    return budget_dict

@router.get("/", response_model=List[Budget])
async def get_budgets(current_user: dict = Depends(get_current_user)):
    cursor = db.budgets.find({"user_id": current_user["id"]})
    budgets = await cursor.to_list(length=100)
    return budgets
