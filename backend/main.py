from fastapi import FastAPI, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import or_
import models, schemas, database
from datetime import datetime
from passlib.context import CryptContext
from jose import jwt
from typing import Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor

# 크롤러 임포트
try:
    from crawler import search_and_crawl_movie, search_movies_on_cine21, crawl_movie_by_id_direct
    CRAWLER_AVAILABLE = True
except ImportError:
    CRAWLER_AVAILABLE = False
    print("크롤러 모듈을 사용할 수 없습니다. 크롤링 기능이 비활성화됩니다.")

# 스레드 풀 생성
executor = ThreadPoolExecutor(max_workers=1)

# 비밀번호 해시 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "TeIbYiWdbav5ggeLdZvG8Xq5Vi9v29dl"
ALGORITHM = "HS256"

# 유틸 함수
def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

app = FastAPI(title="Cinema Review API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB 테이블 생성
models.Base.metadata.create_all(bind=database.engine)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==================== 영화 API ====================

@app.get("/")
def read_root():
    return {"message": "Cinema Review API", "status": "running"}

@app.get("/api/movies", response_model=List[schemas.MovieSummary])
def get_movies(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    sort_by: str = "latest",
    db: Session = Depends(get_db)
):
    """영화 목록 조회"""
    query = db.query(models.Movie)
    
    # 검색
    if search:
        query = query.filter(models.Movie.영화이름.contains(search))
    
    # 정렬
    if sort_by == "latest":
        query = query.order_by(models.Movie.개봉일.desc())
    elif sort_by == "rating":
        # 평점은 계산된 값이므로 Python에서 정렬
        pass
    elif sort_by == "title":
        query = query.order_by(models.Movie.영화이름)
    
    # 영화 가져오기
    if sort_by == "rating":
        movies = query.all()
    else:
        movies = query.offset(skip).limit(limit).all()
    
    # 결과 생성
    result = []
    for movie in movies:
        # 평점 계산
        rating = 0.0
        count = 0
        critic_rating = 0.0
        audience_rating = 0.0
        
        if movie.전문가별점:
            critic_rating = float(movie.전문가별점)
            rating += critic_rating
            count += 1
        
        if movie.관객별점:
            audience_rating = float(movie.관객별점)
            rating += audience_rating
            count += 1
        
        if count > 0:
            rating = rating / count
        
        # 리뷰 수 계산
        review_count = db.query(models.Review).filter(
            models.Review.movie_id == movie.영화ID
        ).count()
        
        # ⭐ MovieSummary에 필요한 모든 필드 포함
        result.append(schemas.MovieSummary(
            id=movie.영화ID,
            title=movie.영화이름,
            poster=movie.이미지URL or "https://via.placeholder.com/300x400?text=No+Image",
            releaseYear=movie.개봉일.year if movie.개봉일 else 2024,
            genre=movie.장르 or "미분류",
            rating=round(rating, 1),
            criticRating=round(critic_rating, 1),      # ⭐ 추가!
            audienceRating=round(audience_rating, 1),  # ⭐ 추가!
            reviewCount=review_count
        ))
    
    # 평점순 정렬
    if sort_by == "rating":
        result.sort(key=lambda x: x.rating, reverse=True)
        result = result[skip:skip+limit]  # 페이지네이션
    
    return result

# 전체 영화 개수 조회
@app.get("/api/movies/count")
def get_movies_count(
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """전체 영화 개수"""
    query = db.query(models.Movie)
    
    if search:
        query = query.filter(models.Movie.영화이름.contains(search))
    
    total = query.count()
    return {"total": total}

@app.get("/api/movies/weekly-ranking", response_model=List[schemas.MovieSummary])
def get_weekly_ranking(db: Session = Depends(get_db)):
    """주간 랭킹 (전문가별점 + 관객별점 평균 기준 상위 10개)"""
    movies = db.query(models.Movie).all()
    
    # 평점 계산 및 정렬
    ranked_movies = []
    for movie in movies:
        avg_rating = 0.0
        count = 0
        critic_rating = 0.0
        audience_rating = 0.0
        
        if movie.전문가별점:
            critic_rating = float(movie.전문가별점)
            avg_rating += critic_rating
            count += 1
        
        if movie.관객별점:
            audience_rating = float(movie.관객별점)
            avg_rating += audience_rating
            count += 1
        
        if count > 0:
            avg_rating /= count
        
        user_reviews = db.query(models.Review).filter(
            models.Review.movie_id == movie.영화ID
        ).all()
        
        user_rating = None
        if user_reviews:
            user_rating = sum(r.rating for r in user_reviews) / len(user_reviews)
        
        ranked_movies.append({
            'movie': movie,
            'avg_rating': avg_rating,
            'critic_rating': critic_rating,        # ⭐ 추가
            'audience_rating': audience_rating,    # ⭐ 추가
            'user_rating': user_rating
        })
    
    # 평점순 정렬 후 상위 10개
    ranked_movies.sort(key=lambda x: x['avg_rating'], reverse=True)
    
    result = []
    for idx, item in enumerate(ranked_movies[:10], 1):
        movie = item['movie']
        result.append(schemas.MovieSummary(
            id=movie.영화ID,
            title=movie.영화이름,
            poster=movie.이미지URL or "https://via.placeholder.com/300x400?text=No+Image",
            genre=movie.장르 or "미분류",
            releaseYear=movie.개봉일.year if movie.개봉일 else 2024,
            rating=round(item['avg_rating'], 1),
            criticRating=round(item['critic_rating'], 1),      # ⭐ 추가!
            audienceRating=round(item['audience_rating'], 1),  # ⭐ 추가!
            userRating=round(item['user_rating'], 1) if item['user_rating'] else None,
            rank=idx
        ))
    
    return result

@app.get("/api/movies/{movie_id}", response_model=schemas.MovieDetail)
def get_movie_detail(movie_id: str, db: Session = Depends(get_db)):
    """영화 상세 정보 조회"""
    movie = db.query(models.Movie).filter(models.Movie.영화ID == movie_id).first()
    
    if not movie:
        raise HTTPException(status_code=404, detail="영화를 찾을 수 없습니다")
    
    # 사용자 리뷰에서 평균 평점 계산
    user_reviews = db.query(models.Review).filter(
        models.Review.movie_id == movie_id
    ).all()
    
    user_rating = None
    if user_reviews:
        user_rating = sum(r.rating for r in user_reviews) / len(user_reviews)
    
    # 전문가 리뷰 파싱
    expert_reviews = []
    if movie.전문가이름 and movie.전문가별점상세 and movie.전문가내용:
        names = movie.전문가이름.split('|')
        ratings = movie.전문가별점상세.split('|')
        contents = movie.전문가내용.split('|')
        
        for i, (name, rating, content) in enumerate(zip(names, ratings, contents)):
            name = name.strip()
            rating = rating.strip()
            content = content.strip()
            
            # 별점 숫자 추출
            rating_num = 0.0
            import re
            rating_match = re.search(r'(\d+\.?\d*)', rating)
            if rating_match:
                rating_num = float(rating_match.group(1))
            
            # 감성 분석 (간단한 휴리스틱)
            sentiment = 'neutral'
            if rating_num >= 4.0:
                sentiment = 'positive'
            elif rating_num < 3.0:
                sentiment = 'negative'
            
            expert_reviews.append(schemas.ExpertReview(
                id=f"expert_{i+1}",
                author=name,
                rating=rating_num,
                text=content,
                sentiment=sentiment
            ))
    
    # 크롤링된 관객 리뷰 파싱 추가
    audience_reviews = []
    if movie.관객리뷰:
        import re
        # 관객리뷰 형식: "작성자|별점|내용|작성자|별점|내용|..." 또는 다른 구분자
        # 실제 데이터 형식에 맞게 파싱 필요
        try:
            # 파이프(|)로 구분된 경우
            parts = movie.관객리뷰.split('|')
            # 3개씩 묶어서 처리 (작성자, 별점, 내용)
            for i in range(0, len(parts), 3):
                if i + 2 < len(parts):
                    author = parts[i].strip()
                    rating_text = parts[i + 1].strip()
                    content = parts[i + 2].strip()
                    
                    # 별점 숫자 추출
                    rating_num = 0.0
                    rating_match = re.search(r'(\d+\.?\d*)', rating_text)
                    if rating_match:
                        rating_num = float(rating_match.group(1))
                    
                    # 감성 분석
                    sentiment = 'neutral'
                    if rating_num >= 4.0:
                        sentiment = 'positive'
                    elif rating_num < 3.0:
                        sentiment = 'negative'
                    
                    audience_reviews.append(schemas.ExpertReview(
                        id=f"audience_{i//3+1}",
                        author=author,
                        rating=rating_num,
                        text=content,
                        sentiment=sentiment
                    ))
        except Exception as e:
            print(f"관객 리뷰 파싱 오류: {e}")
    
    return schemas.MovieDetail(
        id=movie.영화ID,
        title=movie.영화이름,
        poster=movie.이미지URL or "https://via.placeholder.com/300x400?text=No+Image",
        genre=movie.장르 or "미분류",
        releaseYear=movie.개봉일.year if movie.개봉일 else 2024,
        rating=float(movie.전문가별점) if movie.전문가별점 else (float(movie.관객별점) if movie.관객별점 else 0.0),
        criticRating=float(movie.전문가별점) if movie.전문가별점 else 0.0,
        audienceRating=float(movie.관객별점) if movie.관객별점 else 0.0,
        userRating=round(user_rating, 1) if user_rating else None,
        director=movie.감독 or "정보 없음",
        cast=movie.출연 or "정보 없음",
        synopsis=movie.시놉시스 or "줄거리 정보가 없습니다.",
        duration=f"{movie.상영시간_분}분" if movie.상영시간_분 else "정보 없음",
        expertReviews=expert_reviews,
        audienceReviews=audience_reviews
    )

# ==================== 리뷰 API ====================

@app.get("/api/reviews/{movie_id}", response_model=List[schemas.ReviewResponse])
def get_reviews(movie_id: str, db: Session = Depends(get_db)):
    """영화별 리뷰 목록 조회"""
    reviews = db.query(models.Review).filter(
        models.Review.movie_id == movie_id
    ).order_by(models.Review.created_at.desc()).all()
    
    return [schemas.ReviewResponse(
        id=str(review.id),
        movieId=review.movie_id,
        userId=review.user_id,
        author=review.author,
        rating=review.rating,
        text=review.text,
        createdAt=review.created_at
    ) for review in reviews]



@app.post("/api/reviews", response_model=schemas.ReviewResponse)
def create_review(review: schemas.ReviewCreate, db: Session = Depends(get_db)):
    """리뷰 작성"""
    # 영화 존재 확인
    movie = db.query(models.Movie).filter(
        models.Movie.영화ID == review.movieId
    ).first()
    
    if not movie:
        raise HTTPException(status_code=404, detail="영화를 찾을 수 없습니다")
    
    # 중복 리뷰 확인
    existing = db.query(models.Review).filter(
        models.Review.movie_id == review.movieId,
        models.Review.user_id == review.userId
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="이미 리뷰를 작성하셨습니다")
    
    db_review = models.Review(
        movie_id=review.movieId,
        user_id=review.userId,
        author=review.author,
        rating=review.rating,
        text=review.text
    )
    
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    
    return schemas.ReviewResponse(
        id=str(db_review.id),
        movieId=db_review.movie_id,
        userId=db_review.user_id,
        author=db_review.author,
        rating=db_review.rating,
        text=db_review.text,
        createdAt=db_review.created_at
    )

@app.put("/api/reviews/{review_id}", response_model=schemas.ReviewResponse)
def update_review(
    review_id: int,
    review: schemas.ReviewUpdate,
    db: Session = Depends(get_db)
):
    """리뷰 수정"""
    db_review = db.query(models.Review).filter(models.Review.id == review_id).first()
    
    if not db_review:
        raise HTTPException(status_code=404, detail="리뷰를 찾을 수 없습니다")
    
    db_review.rating = review.rating
    db_review.text = review.text
    
    db.commit()
    db.refresh(db_review)
    
    return schemas.ReviewResponse(
        id=str(db_review.id),
        movieId=db_review.movie_id,
        userId=db_review.user_id,
        author=db_review.author,
        rating=db_review.rating,
        text=db_review.text,
        createdAt=db_review.created_at
    )

@app.delete("/api/reviews/{review_id}")
def delete_review(review_id: int, db: Session = Depends(get_db)):
    """리뷰 삭제"""
    db_review = db.query(models.Review).filter(models.Review.id == review_id).first()
    
    if not db_review:
        raise HTTPException(status_code=404, detail="리뷰를 찾을 수 없습니다")
    
    db.delete(db_review)
    db.commit()
    
    return {"message": "리뷰가 삭제되었습니다"}

# ==================== 사용자 API ====================

@app.get("/api/users/{user_id}/search-history")
def get_search_history(user_id: str, db: Session = Depends(get_db)):
    """사용자 검색 기록 조회"""
    history = db.query(models.SearchHistory).filter(
        models.SearchHistory.user_id == user_id
    ).order_by(models.SearchHistory.created_at.desc()).limit(3).all()
    
    return [h.query for h in history]

@app.post("/api/users/{user_id}/search-history")
def add_search_history(user_id: str, query: str, db: Session = Depends(get_db)):
    """검색 기록 추가"""
    # 중복 제거
    existing = db.query(models.SearchHistory).filter(
        models.SearchHistory.user_id == user_id,
        models.SearchHistory.query == query
    ).first()
    
    if existing:
        db.delete(existing)
    
    history = models.SearchHistory(user_id=user_id, query=query)
    db.add(history)
    db.commit()
    
    return {"message": "검색 기록이 저장되었습니다"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


# ==================== 인증 API ====================

@app.post("/api/auth/register")
def register(
    user_id: str = Form(...),
    email: str = Form(...),
    username: str = Form(...),
    phone: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """회원가입"""
    # 중복 체크
    existing_user = db.query(models.User).filter(
        or_(
            models.User.user_id == user_id,
            models.User.email == email,
            models.User.phone == phone
        )
    ).first()

    if existing_user:
        if existing_user.user_id == user_id:
            raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")
        elif existing_user.email == email:
            raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다.")
        elif existing_user.phone == phone:
            raise HTTPException(status_code=400, detail="이미 등록된 핸드폰 번호입니다.")

    # 비밀번호 해시 후 저장
    hashed_pw = hash_password(password)
    new_user = models.User(
        user_id=user_id,
        email=email,
        username=username,
        phone=phone,
        password=hashed_pw
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"msg": "회원가입 성공", "user_id": new_user.user_id}

@app.post("/api/auth/login")
def login(
    user_id: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """로그인"""
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user or not verify_password(password, user.password):
        raise HTTPException(status_code=400, detail="아이디 또는 비밀번호가 올바르지 않습니다")
    
    token = create_access_token({"sub": user.user_id, "username": user.username})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "created_at": user.created_at.strftime('%Y. %m. %d.') if user.created_at else None
        }
    }

@app.post("/api/auth/find-id")
def find_id(
    email: str = Form(...),
    phone: str = Form(...),
    db: Session = Depends(get_db)
):
    """아이디 찾기"""
    user = db.query(models.User).filter(
        models.User.email == email,
        models.User.phone == phone
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="일치하는 회원 정보가 없습니다.")
    
    return {"msg": f"회원님의 아이디는 '{user.user_id}' 입니다."}

@app.post("/api/auth/request-password-reset")
def request_password_reset(
    user_id: str = Form(...),
    email: str = Form(...),
    db: Session = Depends(get_db)
):
    """비밀번호 재설정 요청"""
    user = db.query(models.User).filter(
        models.User.user_id == user_id,
        models.User.email == email
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="일치하는 회원 정보가 없습니다.")
    
    return {"msg": "인증 성공. 새 비밀번호를 입력하세요."}

@app.post("/api/auth/reset-password")
def reset_password(
    user_id: str = Form(...),
    email: str = Form(...),
    new_password: str = Form(...),
    db: Session = Depends(get_db)
):
    """비밀번호 재설정"""
    user = db.query(models.User).filter(
        models.User.user_id == user_id,
        models.User.email == email
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="일치하는 회원 정보가 없습니다.")
    
    user.password = hash_password(new_password)
    db.commit()



# ==================== 찜 API ====================

@app.get("/api/bookmarks/{user_id}", response_model=List[schemas.MovieSummary])
def get_user_bookmarks(user_id: str, db: Session = Depends(get_db)):
    """사용자의 찜 목록 조회"""
    bookmarks = db.query(models.Bookmark).filter(
        models.Bookmark.user_id == user_id
    ).order_by(models.Bookmark.created_at.desc()).all()
    
    if not bookmarks:
        return []
    
    movie_ids = [b.movie_id for b in bookmarks]
    movies = db.query(models.Movie).filter(
        models.Movie.영화ID.in_(movie_ids)
    ).all()
    
    movie_dict = {movie.영화ID: movie for movie in movies}
    
    result = []
    for bookmark in bookmarks:
        movie = movie_dict.get(bookmark.movie_id)
        if movie:
            user_reviews = db.query(models.Review).filter(
                models.Review.movie_id == movie.영화ID
            ).all()
            
            user_rating = None
            if user_reviews:
                user_rating = sum(r.rating for r in user_reviews) / len(user_reviews)
            
            result.append(schemas.MovieSummary(
                id=movie.영화ID,
                title=movie.영화이름,
                poster=movie.이미지URL or "https://via.placeholder.com/300x400?text=No+Image",
                genre=movie.장르 or "미분류",
                releaseYear=movie.개봉일.year if movie.개봉일 else 2024,
                rating=float(movie.전문가별점) if movie.전문가별점 else (float(movie.관객별점) if movie.관객별점 else 0.0),
                criticRating=float(movie.전문가별점) if movie.전문가별점 else 0.0,
                audienceRating=float(movie.관객별점) if movie.관객별점 else 0.0,
                userRating=round(user_rating, 1) if user_rating else None
            ))
    
    return result

@app.post("/api/bookmarks")
def add_bookmark(
    user_id: str = Form(...),
    movie_id: str = Form(...),
    db: Session = Depends(get_db)
):
    """찜 추가"""
    movie = db.query(models.Movie).filter(
        models.Movie.영화ID == movie_id
    ).first()
    
    if not movie:
        raise HTTPException(status_code=404, detail="영화를 찾을 수 없습니다")
    
    existing = db.query(models.Bookmark).filter(
        models.Bookmark.user_id == user_id,
        models.Bookmark.movie_id == movie_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="이미 찜한 영화입니다")
    
    new_bookmark = models.Bookmark(
        user_id=user_id,
        movie_id=movie_id
    )
    
    db.add(new_bookmark)
    db.commit()
    db.refresh(new_bookmark)
    
    return {"message": "찜 목록에 추가되었습니다"}

@app.delete("/api/bookmarks/{user_id}/{movie_id}")
def remove_bookmark(user_id: str, movie_id: str, db: Session = Depends(get_db)):
    """찜 삭제"""
    bookmark = db.query(models.Bookmark).filter(
        models.Bookmark.user_id == user_id,
        models.Bookmark.movie_id == movie_id
    ).first()
    
    if not bookmark:
        raise HTTPException(status_code=404, detail="찜을 찾을 수 없습니다")
    
    db.delete(bookmark)
    db.commit()
    
    return {"message": "찜 목록에서 삭제되었습니다"}

@app.get("/api/bookmarks/{user_id}/check/{movie_id}")
def check_bookmark(user_id: str, movie_id: str, db: Session = Depends(get_db)):
    """찜 여부 확인"""
    bookmark = db.query(models.Bookmark).filter(
        models.Bookmark.user_id == user_id,
        models.Bookmark.movie_id == movie_id
    ).first()
    
    return {"bookmarked": bookmark is not None}


# ==================== 크롤링 API ====================

@app.post("/api/crawl/movie")
async def crawl_movie_by_title(
    title: str = Form(...),
    db: Session = Depends(get_db)
):
    """영화 제목으로 크롤링하여 DB에 저장"""
    if not CRAWLER_AVAILABLE:
        raise HTTPException(
            status_code=503, 
            detail="크롤링 기능을 사용할 수 없습니다. crawler_requirements.txt의 패키지를 설치해주세요."
        )
    
    try:
        # 비동기로 크롤링 실행 (블로킹 방지)
        loop = asyncio.get_event_loop()
        movie_data = await loop.run_in_executor(executor, search_and_crawl_movie, title)
        
        if not movie_data:
            raise HTTPException(status_code=404, detail=f"'{title}' 영화를 찾을 수 없습니다.")
        
        # 이미 존재하는지 확인
        existing = db.query(models.Movie).filter(
            models.Movie.영화ID == movie_data['영화ID']
        ).first()
        
        if existing:
            return {
                "message": "이미 존재하는 영화입니다.",
                "movie_id": existing.영화ID,
                "already_exists": True
            }
        
        # DB에 저장
        new_movie = models.Movie(
            영화이름=movie_data['영화이름'],
            이미지URL=movie_data['이미지URL'],
            영화ID=movie_data['영화ID'],
            전문가별점=movie_data['전문가별점'],
            관객별점=movie_data['관객별점'],
            상영시간_분=movie_data['상영시간(분)'],
            개봉일=movie_data['개봉일'],
            장르=movie_data['장르'],
            국가=movie_data['국가'],
            감독=movie_data['감독'],
            출연=movie_data['출연'],
            시놉시스=movie_data['시놉시스'],
            전문가이름=movie_data['전문가이름'],
            전문가별점상세=movie_data['전문가별점상세'],
            전문가내용=movie_data['전문가내용'],
            관련기사1=movie_data['관련기사1'],
            관련기사2=movie_data['관련기사2'],
            관객별점상세=movie_data['관객별점상세'],
            관객리뷰=movie_data['관객리뷰']
        )
        
        db.add(new_movie)
        db.commit()
        db.refresh(new_movie)
        
        return {
            "message": "영화가 성공적으로 추가되었습니다.",
            "movie_id": new_movie.영화ID,
            "movie_title": new_movie.영화이름,
            "already_exists": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"크롤링 오류: {e}")
        raise HTTPException(status_code=500, detail=f"크롤링 중 오류가 발생했습니다: {str(e)}")
    

# ==================== 영화 검색 API (크롤링용) ====================

@app.post("/api/crawl/search")
async def search_movies_for_crawl(
    query: str = Form(...),
    db: Session = Depends(get_db)
):
    """Cine21에서 영화 검색 결과 목록 반환 (크롤링 전 선택용)"""
    if not CRAWLER_AVAILABLE:
        raise HTTPException(
            status_code=503, 
            detail="크롤링 기능을 사용할 수 없습니다."
        )
    
    try:
        # 비동기로 검색 실행
        loop = asyncio.get_event_loop()
        search_results = await loop.run_in_executor(executor, search_movies_on_cine21, query)
        
        if not search_results:
            raise HTTPException(status_code=404, detail=f"'{query}' 검색 결과가 없습니다.")
        
        return {
            "query": query,
            "count": len(search_results),
            "results": search_results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"검색 오류: {e}")
        raise HTTPException(status_code=500, detail=f"검색 중 오류가 발생했습니다: {str(e)}")


@app.post("/api/crawl/movie-by-id")
async def crawl_movie_by_id(
    movie_id: str = Form(...),
    movie_title: str = Form(...),
    db: Session = Depends(get_db)
):
    """특정 영화 ID로 크롤링"""
    if not CRAWLER_AVAILABLE:
        raise HTTPException(
            status_code=503, 
            detail="크롤링 기능을 사용할 수 없습니다."
        )
    
    try:
        # 이미 존재하는지 확인
        existing = db.query(models.Movie).filter(
            models.Movie.영화ID == movie_id
        ).first()
        
        if existing:
            return {
                "message": "이미 존재하는 영화입니다.",
                "movie_id": existing.영화ID,
                "movie_title": existing.영화이름,
                "already_exists": True
            }
        
        # 비동기로 크롤링 실행
        loop = asyncio.get_event_loop()
        movie_data = await loop.run_in_executor(executor, crawl_movie_by_id_direct, movie_id)
        
        if not movie_data:
            raise HTTPException(status_code=404, detail=f"영화 정보를 가져올 수 없습니다.")
        
        # DB에 저장
        new_movie = models.Movie(
            영화이름=movie_data['영화이름'],
            이미지URL=movie_data['이미지URL'],
            영화ID=movie_data['영화ID'],
            전문가별점=movie_data['전문가별점'],
            관객별점=movie_data['관객별점'],
            상영시간_분=movie_data['상영시간(분)'],
            개봉일=movie_data['개봉일'],
            장르=movie_data['장르'],
            국가=movie_data['국가'],
            감독=movie_data['감독'],
            출연=movie_data['출연'],
            시놉시스=movie_data['시놉시스'],
            전문가이름=movie_data['전문가이름'],
            전문가별점상세=movie_data['전문가별점상세'],
            전문가내용=movie_data['전문가내용'],
            관련기사1=movie_data['관련기사1'],
            관련기사2=movie_data['관련기사2'],
            관객별점상세=movie_data['관객별점상세'],
            관객리뷰=movie_data['관객리뷰']
        )
        
        db.add(new_movie)
        db.commit()
        db.refresh(new_movie)
        
        return {
            "message": "영화가 성공적으로 추가되었습니다.",
            "movie_id": new_movie.영화ID,
            "movie_title": new_movie.영화이름,
            "already_exists": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"크롤링 오류: {e}")
        raise HTTPException(status_code=500, detail=f"크롤링 중 오류가 발생했습니다: {str(e)}")
    



# AI 챗봇 라우터 마운트
try:
    from rag_chat import chat_app
    app.mount("/ai", chat_app)
    print("✅ AI 챗봇 라우터 마운트 완료: /ai")
except ImportError as e:
    print(f"⚠️  AI 챗봇 모듈 없음: {e}")
    print("   필요 패키지: sentence-transformers, faiss-cpu, openai")
except Exception as e:
    print(f"⚠️  AI 챗봇 로딩 오류: {e}")

# 정적 파일 서빙 (프론트엔드)
try:
    from fastapi.staticfiles import StaticFiles
    from pathlib import Path
    
    frontend_path = Path(__file__).parent.parent / "frontend"
    
    if frontend_path.exists():
        app.mount("/static", StaticFiles(directory=str(frontend_path)), name="static")
        print(f"✅ 프론트엔드 정적 파일 서빙: {frontend_path}")
    else:
        print(f"⚠️  프론트엔드 디렉토리 없음: {frontend_path}")
except Exception as e:
    print(f"⚠️  정적 파일 서빙 설정 오류: {e}")