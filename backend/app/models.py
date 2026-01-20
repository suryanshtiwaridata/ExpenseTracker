from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ExpenseSource(str, Enum):
    MANUAL = "manual"
    SMS = "sms"
    RECEIPT = "receipt"

class UserBase(BaseModel):
    email: EmailStr
    name: str
    currency: str = "INR"

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: str
    created_at: datetime

class ExpenseBase(BaseModel):
    amount: float
    date: datetime
    category: str
    description: Optional[str] = None
    platform: Optional[str] = None
    receipt_image_base64: Optional[str] = None
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
