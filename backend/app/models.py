from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ExpenseSource(str, Enum):
    MANUAL = "manual"
    SMS = "sms"
    RECEIPT = "receipt"
    PDF = "pdf"

class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    currency: str = "INR"

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    currency: Optional[str] = None

class UserInDB(UserBase):
    id: str
    created_at: datetime

class ExpenseBase(BaseModel):
    amount: float
    date: datetime
    category: str
    description: Optional[str] = None
    platform: Optional[str] = None
    payment_mode: Optional[str] = "upi" # Default to upi as it's most common in statements
    tax_amount: Optional[float] = 0.0
    tax_type: Optional[str] = None # GST, VAT, etc.
    receipt_image_base64: Optional[str] = None
    vendor: Optional[str] = None
    items: Optional[List[str]] = None
    line_items: Optional[List[dict]] = None
    gst_details: Optional[dict] = None
    original_ocr_data: Optional[dict] = None
    is_tax_deductible: bool = False
    source: ExpenseSource = ExpenseSource.MANUAL
    currency: str = "INR"

class ExpenseCreate(ExpenseBase):
    pass

class Expense(ExpenseBase):
    id: str
    user_id: str
    created_at: datetime

class BudgetBase(BaseModel):
    category: str
    monthly_limit: float
    month: int
    year: int

class BudgetCreate(BudgetBase):
    pass

class Budget(BudgetBase):
    id: str
    user_id: str
    current_spent: float = 0.0

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
