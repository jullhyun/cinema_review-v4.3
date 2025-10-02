from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ==================== 영화 스키마 ====================

class MovieSummary(BaseModel):
    """영화 요약 정보 (목록용)"""
    id: str
    title: str
    poster: str
    genre: str
    releaseYear: int
    rating: float
    criticRating: float
    audienceRating: float
    userRating: Optional[float] = None
    rank: Optional[int] = None
    
    class Config:
        from_attributes = True

class ExpertReview(BaseModel):
    """전문가 리뷰"""
    id: str
    author: str
    rating: float
    text: str
    sentiment: str  # positive, neutral, negative
    
    class Config:
        from_attributes = True

class MovieDetail(BaseModel):
    """영화 상세 정보"""
    id: str
    title: str
    poster: str
    genre: str
    releaseYear: int
    rating: float
    criticRating: float
    audienceRating: float
    userRating: Optional[float] = None
    director: str
    cast: str
    synopsis: str
    duration: str
    expertReviews: List[ExpertReview] = []
    audienceReviews: List[ExpertReview] = []
    
    class Config:
        from_attributes = True

# ==================== 리뷰 스키마 ====================

class ReviewCreate(BaseModel):
    """리뷰 생성 요청"""
    movieId: str
    userId: str
    author: str
    rating: int = Field(..., ge=1, le=10)  # 1-10점으로 변경
    text: str = Field(..., min_length=1, max_length=200)

class ReviewUpdate(BaseModel):
    """리뷰 수정 요청"""
    rating: int = Field(..., ge=1, le=10)  # 1-10점으로 변경
    text: str = Field(..., min_length=1, max_length=200)

class ReviewResponse(BaseModel):
    """리뷰 응답"""
    id: str
    movieId: str
    userId: str
    author: str
    rating: int
    text: str
    createdAt: datetime
    
    class Config:
        from_attributes = True


class BookmarkCreate(BaseModel):
    """찜 추가 요청"""
    movieId: str
    userId: str

class BookmarkResponse(BaseModel):
    """찜 응답"""
    id: str
    movieId: str
    userId: str
    createdAt: datetime
    
    class Config:
        from_attributes = True


class MovieResponse(BaseModel):
    id: int
    movieId: str
    title: str
    imageUrl: Optional[str] = None
    criticRating: Optional[float] = None
    audienceRating: Optional[float] = None
    runtime: Optional[int] = None
    releaseYear: Optional[str] = None
    genre: Optional[str] = None
    country: Optional[str] = None
    director: Optional[str] = None
    cast: Optional[str] = None
    synopsis: Optional[str] = None
    
    class Config:
        from_attributes = True