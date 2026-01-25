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
    # Check if budget for this category/month/year already exists
    existing = await db.budgets.find_one({
        "user_id": current_user["id"],
        "category": budget.category,
        "month": budget.month,
        "year": budget.year
    })
    
    budget_dict = budget.dict()
    if existing:
        await db.budgets.update_one({"id": existing["id"]}, {"$set": {"monthly_limit": budget.monthly_limit}})
        existing["monthly_limit"] = budget.monthly_limit
        return existing
    
    budget_dict["id"] = str(uuid.uuid4())
    budget_dict["user_id"] = current_user["id"]
    budget_dict["current_spent"] = 0.0
    
    await db.budgets.insert_one(budget_dict)
    return budget_dict

@router.get("/", response_model=List[Budget])
async def get_budgets(current_user: dict = Depends(get_current_user)):
    cursor = db.budgets.find({"user_id": current_user["id"]})
    budgets = await cursor.to_list(length=100)
    
    # Enrich budgets with current spending
    for b in budgets:
        # Calculate spending for this category and month
        start_date = datetime(b["year"], b["month"], 1)
        if b["month"] == 12:
            end_date = datetime(b["year"] + 1, 1, 1)
        else:
            end_date = datetime(b["year"], b["month"] + 1, 1)
            
        cursor = db.expenses.find({
            "user_id": current_user["id"],
            "category": b["category"],
            "date": {"$gte": start_date, "$lt": end_date}
        })
        expenses = await cursor.to_list(length=None)
        b["current_spent"] = sum(e["amount"] for e in expenses)
        
    return budgets

@router.delete("/{budget_id}")
async def delete_budget(budget_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.budgets.delete_one({"id": budget_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"status": "deleted"}
