import json
from datetime import datetime
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import Boolean, Column, DateTime, Integer, String, create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./todak.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class UserModel(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    password = Column(String, nullable=False)
    nickname = Column(String, nullable=False)
    start_date = Column(DateTime, default=datetime.utcnow)
    has_seen_guide = Column(Boolean, default=False)


class MoodModel(Base):
    __tablename__ = "moods"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    date = Column(String, index=True, nullable=False)
    emotion_ids = Column(String, nullable=False)
    content = Column(String, default="")
    ai_message = Column(String, default="")
    recommendations = Column(String, default="")
    timestamp = Column(Integer, default=lambda: int(datetime.utcnow().timestamp() * 1000))


Base.metadata.create_all(bind=engine)

app = FastAPI(title="Todak API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class UserBase(BaseModel):
    id: str
    nickname: str
    startDate: datetime
    hasSeenGuide: bool = False


class UserCreate(BaseModel):
    id: str
    password: str
    nickname: str


class UserLogin(BaseModel):
    id: str
    password: str


class MoodIn(BaseModel):
    date: str
    emotionIds: List[str]
    content: str
    aiMessage: Optional[str] = None
    recommendations: Optional[List[dict]] = None
    timestamp: Optional[int] = None


class MoodOut(MoodIn):
    id: int

    class Config:
        orm_mode = True


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/signup", response_model=UserBase)
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(UserModel).filter(UserModel.id == payload.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    user = UserModel(
        id=payload.id,
        password=payload.password,
        nickname=payload.nickname,
        start_date=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_to_schema(user)


@app.post("/login", response_model=UserBase)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.id == payload.id).first()
    if not user or user.password != payload.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return _user_to_schema(user)


@app.get("/users/{user_id}", response_model=UserBase)
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_to_schema(user)


@app.patch("/users/{user_id}/guide", response_model=UserBase)
def mark_guide_seen(user_id: str, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.has_seen_guide = True
    db.commit()
    db.refresh(user)
    return _user_to_schema(user)


@app.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.query(MoodModel).filter(MoodModel.user_id == user_id).delete()
    db.delete(user)
    db.commit()
    return {"status": "deleted"}


@app.get("/users/{user_id}/moods", response_model=List[MoodOut])
def list_moods(user_id: str, db: Session = Depends(get_db)):
    moods = (
        db.query(MoodModel)
        .filter(MoodModel.user_id == user_id)
        .order_by(MoodModel.date)
        .all()
    )
    return [_mood_to_schema(m) for m in moods]


@app.post("/users/{user_id}/moods", response_model=MoodOut)
def save_mood(user_id: str, payload: MoodIn, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = (
        db.query(MoodModel)
        .filter(MoodModel.user_id == user_id, MoodModel.date == payload.date)
        .first()
    )
    serialized_recs = json.dumps(payload.recommendations or [])
    emotion_json = json.dumps(payload.emotionIds)
    timestamp = payload.timestamp or int(datetime.utcnow().timestamp() * 1000)

    if existing:
        existing.emotion_ids = emotion_json
        existing.content = payload.content
        existing.ai_message = payload.aiMessage or ""
        existing.recommendations = serialized_recs
        existing.timestamp = timestamp
        db.commit()
        db.refresh(existing)
        return _mood_to_schema(existing)

    mood = MoodModel(
        user_id=user_id,
        date=payload.date,
        emotion_ids=emotion_json,
        content=payload.content,
        ai_message=payload.aiMessage or "",
        recommendations=serialized_recs,
        timestamp=timestamp,
    )
    db.add(mood)
    db.commit()
    db.refresh(mood)
    return _mood_to_schema(mood)


@app.delete("/users/{user_id}/moods/{mood_id}")
def delete_mood(user_id: str, mood_id: int, db: Session = Depends(get_db)):
    mood = (
        db.query(MoodModel)
        .filter(MoodModel.user_id == user_id, MoodModel.id == mood_id)
        .first()
    )
    if not mood:
        raise HTTPException(status_code=404, detail="Mood not found")
    db.delete(mood)
    db.commit()
    return {"status": "deleted"}


def _user_to_schema(model: UserModel) -> UserBase:
    return UserBase(
        id=model.id,
        nickname=model.nickname,
        startDate=model.start_date,
        hasSeenGuide=model.has_seen_guide,
    )


def _mood_to_schema(model: MoodModel) -> MoodOut:
    return MoodOut(
        id=model.id,
        date=model.date,
        emotionIds=json.loads(model.emotion_ids or "[]"),
        content=model.content,
        aiMessage=model.ai_message or None,
        recommendations=json.loads(model.recommendations or "[]"),
        timestamp=model.timestamp,
    )
