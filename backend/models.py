from sqlalchemy import Column, Integer, String, Text, Date, DECIMAL, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from database import Base

class Movie(Base):
    """영화 테이블 (크롤링 데이터)"""
    __tablename__ = "cine21_movies"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    영화이름 = Column(String(500), nullable=False)
    이미지URL = Column(Text)
    영화ID = Column(String(50), nullable=False, unique=True, index=True)
    전문가별점 = Column(DECIMAL(3, 1))
    관객별점 = Column(DECIMAL(3, 1))
    상영시간_분 = Column('상영시간(분)', Integer)
    개봉일 = Column(Date)
    장르 = Column(String(200))
    국가 = Column(String(200))
    감독 = Column(String(500))
    출연 = Column(Text)
    시놉시스 = Column(Text)
    전문가이름 = Column(Text)
    전문가별점상세 = Column(Text)
    전문가내용 = Column(Text)
    관련기사1 = Column(Text)
    관련기사2 = Column(Text)
    관객별점상세 = Column(Text)
    관객리뷰 = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

class Review(Base):
    """사용자 리뷰 테이블"""
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    movie_id = Column(String(50), nullable=False, index=True)
    user_id = Column(String(100), nullable=False)
    author = Column(String(100), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-10
    text = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

class SearchHistory(Base):
    """검색 기록 테이블"""
    __tablename__ = "search_history"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(100), nullable=False, index=True)
    query = Column(String(200), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

class User(Base):
    """사용자 테이블"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    username = Column(String(50), nullable=False)
    phone = Column(String(20), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

class Bookmark(Base):
    """찜 테이블"""
    __tablename__ = "bookmarks"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(100), nullable=False, index=True)
    movie_id = Column(String(50), nullable=False, index=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())