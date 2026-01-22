from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from app.models import UserCreate, UserInDB, Token, TokenData
from app.database import get_database
from app.auth.utils import verify_password, get_password_hash, create_access_token
from datetime import datetime
import uuid

router = APIRouter(prefix="/auth", tags=["auth"])
db = get_database()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

@router.post("/register", response_model=UserInDB)
async def register(user: UserCreate):
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user.dict()
    user_dict["password_hash"] = get_password_hash(user_dict.pop("password"))
    user_dict["id"] = str(uuid.uuid4())
    user_dict["created_at"] = datetime.utcnow()
    
    await db.users.insert_one(user_dict)
    return user_dict

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/reset-password")
async def reset_password(payload: dict, token: str = Depends(oauth2_scheme)):
    from jose import jwt, JWTError
    from app.auth.utils import SECRET_KEY, ALGORITHM
    
    try:
        payload_data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload_data.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        current_password = payload.get("current_password")
        new_password = payload.get("new_password")
        
        if not current_password or not new_password:
            raise HTTPException(status_code=400, detail="Missing passwords")
            
        if not verify_password(current_password, user["password_hash"]):
            raise HTTPException(status_code=400, detail="Incorrect current password")
            
        new_password_hash = get_password_hash(new_password)
        await db.users.update_one({"email": email}, {"$set": {"password_hash": new_password_hash}})
        
        return {"message": "Password reset successful"}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/me", response_model=UserInDB)
async def get_me(token: str = Depends(oauth2_scheme)):
    from jose import jwt, JWTError
    from app.auth.utils import SECRET_KEY, ALGORITHM
    
    try:
        payload_data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload_data.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
