from fastapi import APIRouter, HTTPException, Depends, status
from app.models import ExpenseCreate, Expense, ExpenseSource
from app.database import get_database
from app.routers.auth import oauth2_scheme
from jose import jwt, JWTError
from app.auth.utils import SECRET_KEY, ALGORITHM
from datetime import datetime
from typing import List
import uuid

router = APIRouter(prefix="/expenses", tags=["expenses"])
db = get_database()

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"email": email})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/", response_model=Expense)
async def create_expense(expense: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    expense_dict = expense.dict()
    expense_dict["id"] = str(uuid.uuid4())
    expense_dict["user_id"] = current_user["id"]
    expense_dict["created_at"] = datetime.utcnow()
    
    # ML Learning: Capture Feedback
    if expense.original_ocr_data and expense.vendor:
        original = expense.original_ocr_data
        discrepancies = {}
        
        # Check for core field discrepancies
        if original.get("amount") != expense.amount:
            discrepancies["amount"] = {"original": original.get("amount"), "corrected": expense.amount}
        
        if original.get("gst_details"):
            orig_gst = original["gst_details"]
            new_gst = expense.gst_details or {}
            for key in ["cgst", "sgst", "igst", "total_gst"]:
                if orig_gst.get(key) != new_gst.get(key):
                    if "gst_details" not in discrepancies: discrepancies["gst_details"] = {}
                    discrepancies["gst_details"][key] = {"original": orig_gst.get(key), "corrected": new_gst.get(key)}

        if discrepancies:
            learning_entry = {
                "id": str(uuid.uuid4()),
                "vendor": expense.vendor.upper(),
                "raw_text": original.get("raw_text"),
                "discrepancies": discrepancies,
                "created_at": datetime.utcnow()
            }
            await db.ocr_learning.insert_one(learning_entry)

    await db.expenses.insert_one(expense_dict)
    return expense_dict

@router.get("/", response_model=List[Expense])
async def get_expenses(current_user: dict = Depends(get_current_user)):
    cursor = db.expenses.find({"user_id": current_user["id"]}).sort("date", -1)
    expenses = await cursor.to_list(length=1000)
    return expenses

@router.delete("/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.expenses.delete_one({"id": expense_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"status": "deleted"}

@router.put("/{expense_id}", response_model=Expense)
async def update_expense(expense_id: str, expense: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    # Check if expense exists and belongs to user
    existing = await db.expenses.find_one({"id": expense_id, "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    expense_dict = expense.dict()
    expense_dict["id"] = expense_id
    expense_dict["user_id"] = current_user["id"]
    expense_dict["updated_at"] = datetime.utcnow()
    # Preserve created_at
    expense_dict["created_at"] = existing.get("created_at") or datetime.utcnow()
    
    await db.expenses.replace_one({"id": expense_id}, expense_dict)
    return expense_dict

@router.get("/summary")
async def get_summary(current_user: dict = Depends(get_current_user)):
    # Simple summary of total spent
    cursor = db.expenses.find({"user_id": current_user["id"]})
    expenses = await cursor.to_list(length=None)
    total = sum(e["amount"] for e in expenses)
    return {"total_spent": total}

@router.post("/parse-receipt")
async def parse_receipt(payload: dict, current_user: dict = Depends(get_current_user)):
    from app.ocr_utils import extract_receipt_data
    image_base64 = payload.get("image")
    if not image_base64:
        raise HTTPException(status_code=400, detail="No image provided")
    
    data = await extract_receipt_data(image_base64, db=db)
    return data

@router.post("/parse-sms")
async def parse_sms(payload: dict, current_user: dict = Depends(get_current_user)):
    from app.sms_utils import parse_transaction_sms
    text = payload.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="No SMS text provided")
    
    data = parse_transaction_sms(text)
    return data

@router.post("/parse-pdf")
async def parse_pdf(payload: dict, current_user: dict = Depends(get_current_user)):
    from app.pdf_utils import parse_bank_statement_pdf
    pdf_base64 = payload.get("pdf")
    if not pdf_base64:
        raise HTTPException(status_code=400, detail="No PDF data provided")
    
    expenses = parse_bank_statement_pdf(pdf_base64)
    return expenses
