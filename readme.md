# Cinema Review - 영화 리뷰 사이트

FastAPI 백엔드 + Vanilla JS 프론트엔드로 구성된 영화 리뷰 웹 애플리케이션

## 📁 프로젝트 구조

```
cinema-review/
├── backend/
│   ├── main.py              # FastAPI 메인 애플리케이션
│   ├── database.py          # 데이터베이스 연결 설정
│   ├── models.py            # SQLAlchemy 모델
│   ├── schemas.py           # Pydantic 스키마
│   └── requirements.txt     # Python 패키지
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── api.js           # 백엔드 API 호출
│       ├── components.js    # UI 컴포넌트
│       └── app.js           # 메인 애플리케이션
├── assets/
│   └── logo.png
├── .env                     # 환경 변수
└── run.py                   # 통합 실행 스크립트
```

## 🚀 설치 및 실행

### 1. 사전 요구사항

- Python 3.8 이상
- MySQL 5.7 이상
- 웹 브라우저 (Chrome, Firefox 등)

### 2. MySQL 데이터베이스 준비

MySQL에 접속하여 데이터베이스를 생성합니다:

```sql
CREATE DATABASE cine21_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. 환경 변수 설정

`.env` 파일을 생성하고 MySQL 연결 정보를 입력합니다:

```env
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=cine21_db
MYSQL_PORT=3306
```

### 4. Python 패키지 설치

```bash
pip install -r backend/requirements.txt
```

설치되는 패키지:
- fastapi
- uvicorn
- sqlalchemy
- pymysql
- python-dotenv
- pydantic

### 5. 데이터 준비 (선택사항)

이미 `sql_0929_final.py`로 크롤링한 데이터가 있다면 해당 데이터가 사용됩니다.

없다면 백엔드가 자동으로 빈 테이블을 생성합니다.

### 6. 애플리케이션 실행

**방법 1: 통합 실행 스크립트 (권장)**

```bash
python run.py
```

이 명령어는 다음을 자동으로 수행합니다:
1. 패키지 설치 확인
2. MySQL 연결 확인
3. FastAPI 백엔드 시작
4. 브라우저 자동 오픈

**방법 2: 수동 실행**

```bash
# 백엔드 시작
cd backend
python main.py

# 또는 uvicorn 직접 실행
uvicorn main:app --reload
```

그 다음 브라우저에서 `frontend/index.html` 파일을 엽니다.

## 📡 API 엔드포인트

### 영화 API

- `GET /api/movies` - 영화 목록 조회
- `GET /api/movies/{movie_id}` - 영화 상세 조회
- `GET /api/movies/weekly-ranking` - 주간 랭킹

### 리뷰 API

- `GET /api/reviews/{movie_id}` - 영화별 리뷰 조회
- `POST /api/reviews` - 리뷰 작성
- `PUT /api/reviews/{review_id}` - 리뷰 수정
- `DELETE /api/reviews/{review_id}` - 리뷰 삭제

### 사용자 API

- `GET /api/users/{user_id}/search-history` - 검색 기록 조회
- `POST /api/users/{user_id}/search-history` - 검색 기록 추가

API 문서: http://localhost:8000/docs

## 🎨 주요 기능

### 프론트엔드

- ✅ 주간 영화 랭킹
- ✅ 영화 검색 (제목 기반)
- ✅ 영화 상세 정보 보기
- ✅ 전문가 리뷰 표시
- ✅ 사용자 리뷰 작성/수정/삭제
- ✅ 평점별 테마 변경
- ✅ 검색 기록 저장
- ✅ 로그인/로그아웃 (데모)

### 백엔드

- ✅ FastAPI REST API
- ✅ SQLAlchemy ORM
- ✅ MySQL 데이터베이스
- ✅ CORS 설정
- ✅ Pydantic 데이터 검증
- ✅ 자동 API 문서 생성

## 🗄️ 데이터베이스 스키마

### cine21_movies (영화 테이블)

크롤링 데이터를 저장하는 테이블입니다.

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | INT | 자동 증가 ID |
| 영화이름 | VARCHAR(500) | 영화 제목 |
| 이미지URL | TEXT | 포스터 이미지 URL |
| 영화ID | VARCHAR(50) | 고유 영화 ID (UNIQUE) |
| 전문가별점 | DECIMAL(3,1) | 전문가 평점 |
| 관객별점 | DECIMAL(3,1) | 관객 평점 |
| 상영시간(분) | INT | 상영 시간 |
| 개봉일 | DATE | 개봉 날짜 |
| 장르 | VARCHAR(200) | 영화 장르 |
| 국가 | VARCHAR(200) | 제작 국가 |
| 감독 | VARCHAR(500) | 감독 이름 |
| 출연 | TEXT | 출연진 |
| 시놉시스 | TEXT | 줄거리 |
| 전문가이름 | TEXT | 전문가 이름 목록 |
| 전문가별점상세 | TEXT | 전문가별 점수 |
| 전문가내용 | TEXT | 전문가 리뷰 내용 |

### reviews (리뷰 테이블)

사용자가 작성한 리뷰를 저장합니다.

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | INT | 자동 증가 ID |
| movie_id | VARCHAR(50) | 영화 ID (FK) |
| user_id | VARCHAR(100) | 사용자 ID |
| author | VARCHAR(100) | 작성자 닉네임 |
| rating | INT | 별점 (1-5) |
| text | TEXT | 리뷰 내용 |
| created_at | TIMESTAMP | 작성 시간 |

### search_history (검색 기록 테이블)

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | INT | 자동 증가 ID |
| user_id | VARCHAR(100) | 사용자 ID |
| query | VARCHAR(200) | 검색 쿼리 |
| created_at | TIMESTAMP | 검색 시간 |

## 🔧 트러블슈팅

### MySQL 연결 오류

```
pymysql.err.OperationalError: (2003, "Can't connect to MySQL server")
```

**해결 방법:**
1. MySQL 서비스가 실행 중인지 확인
2. `.env` 파일의 연결 정보 확인
3. 방화벽 설정 확인

### CORS 오류

```
Access to fetch at 'http://localhost:8000' from origin 'null' has been blocked
```

**해결 방법:**
- 백엔드에 CORS 미들웨어가 이미 설정되어 있습니다
- 프론트엔드를 `file://` 프로토콜로 열면 발생할 수 있습니다
- Live Server나 Python HTTP 서버 사용 권장

### 포트 충돌

```
ERROR: [Errno 48] Address already in use
```

**해결 방법:**
```bash
# 8000번 포트 사용 중인 프로세스 찾기
lsof -i :8000

# 프로세스 종료
kill -9 <PID>
```

## 📝 개발 노트

### 데이터 흐름

1. 크롤링 (`sql_0929_final.py`) → MySQL DB
2. FastAPI 백엔드 → DB에서 데이터 조회
3. 프론트엔드 → API 호출로 데이터 표시
4. 사용자 액션 → API 호출로 DB 업데이트

### 한글 컬럼명 → 영문 필드 매핑

백엔드에서 자동으로 변환됩니다:

- `영화이름` → `title`
- `전문가별점` → `criticRating`
- `관객별점` → `audienceRating`
- `개봉일` → `releaseYear`

## 🎯 향후 개선 사항

- [ ] 실제 사용자 인증 시스템 (JWT)
- [ ] 페이지네이션 개선
- [ ] 이미지 최적화
- [ ] 반응형 디자인 개선
- [ ] 영화 필터링 (장르, 평점 등)
- [ ] 좋아요/북마크 기능
- [ ] 댓글 기능

## 📄 라이선스

이 프로젝트는 교육 목적으로 제작되었습니다.

## 👥 문의

문제가 발생하면 이슈를 등록해주세요.