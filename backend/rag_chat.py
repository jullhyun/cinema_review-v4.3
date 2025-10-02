# backend/rag_chat.py

import os
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict
import requests
from dotenv import load_dotenv

load_dotenv()

chat_app = FastAPI()

# 환경 변수
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
TMDB_BASE_URL = "https://api.themoviedb.org/3"

# OpenAI 클라이언트 초기화 (선택사항)
client = None
if OPENAI_API_KEY:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        print("✅ OpenAI 클라이언트 초기화 성공 (보조 기능)")
    except Exception as e:
        print(f"⚠️ OpenAI 없이 작동 (TMDB만 사용): {e}")
        client = None
else:
    print("ℹ️ OpenAI 없이 작동 (TMDB만 사용)")


# 🎬 하드코딩된 키워드 매핑 데이터베이스
KEYWORD_DATABASE = {
    # ===== 장르 =====
    "액션": ["action"],
    "공포": ["horror"],
    "코미디": ["comedy"],
    "로맨스": ["romance"],
    "멜로": ["romance"],
    "스릴러": ["thriller"],
    "SF": ["science fiction", "sci-fi"],
    "공상과학": ["science fiction"],
    "판타지": ["fantasy"],
    "애니메이션": ["animation"],
    "애니": ["animation"],
    "드라마": ["drama"],
    "범죄": ["crime"],
    "미스터리": ["mystery"],
    "다큐": ["documentary"],
    "음악": ["music"],
    "뮤지컬": ["musical"],
    "전쟁": ["war"],
    "서부극": ["western"],
    
    # ===== 테마/소재 =====
    "스파이": ["spy", "agent", "007"],
    "히어로": ["superhero", "marvel", "dc"],
    "슈퍼히어로": ["superhero"],
    "마블": ["marvel"],
    "좀비": ["zombie"],
    "귀신": ["ghost"],
    "물귀신": ["ring", "ghost water"],
    "악마": ["demon", "devil"],
    "마법": ["magic", "wizard"],
    "마술": ["magic"],
    "우주": ["space", "galaxy"],
    "외계인": ["alien"],
    "로봇": ["robot"],
    "AI": ["artificial intelligence"],
    "인공지능": ["artificial intelligence"],
    "자동차": ["car", "fast"],
    "차": ["car"],
    "경주": ["racing", "race"],
    "레이스": ["racing"],
    "재난": ["disaster"],
    "생존": ["survival"],
    "탐정": ["detective"],
    "형사": ["detective", "police"],
    "경찰": ["police"],
    "해커": ["hacker"],
    "시간여행": ["time travel"],
    "타임": ["time"],
    "좀비": ["zombie"],
    "뱀파이어": ["vampire"],
    "늑대인간": ["werewolf"],
    "괴물": ["monster"],
    "공룡": ["dinosaur"],
    "상어": ["shark"],
    "동물": ["animal"],
    "가족": ["family"],
    "학교": ["school"],
    "청춘": ["youth", "teen"],
    "복수": ["revenge"],
    "사랑": ["love", "romance"],
    "전염병": ["pandemic", "virus"],
    "바이러스": ["virus"],
    "감옥": ["prison"],
    "탈옥": ["escape", "prison"],
    "해적": ["pirate"],
    "중세": ["medieval"],
    "사무라이": ["samurai"],
    "닌자": ["ninja"],
    "무술": ["martial arts"],
    "권투": ["boxing"],
    "격투": ["fighting"],
    "마피아": ["mafia"],
    "갱": ["gang"],
    "강도": ["heist", "robbery"],
    "은행강도": ["heist bank"],
    
    # ===== 분위기/느낌 =====
    "감동": ["emotional", "touching"],
    "감동적": ["emotional"],
    "무서운": ["scary", "horror"],
    "웃긴": ["funny", "comedy"],
    "재미있는": ["funny"],
    "슬픈": ["sad"],
    "우울": ["dark", "depression"],
    "어두운": ["dark"],
    "밝은": ["bright", "happy"],
    "신나는": ["exciting", "action"],
    "긴장감": ["thriller", "suspense"],
    "스릴": ["thriller"],
    "잔인한": ["brutal", "violent"],
    "폭력": ["violent"],
    "야한": ["erotic"],
    "섹시": ["sexy"],
    "로맨틱": ["romantic"],
    "따뜻한": ["heartwarming"],
    "현실적": ["realistic"],
    "고전": ["classic"],
    "명작": ["masterpiece", "classic"],
    
    # ===== 유명 시리즈/프랜차이즈 =====
    "어벤져스": ["avengers"],
    "아이언맨": ["iron man"],
    "스파이더맨": ["spider man"],
    "배트맨": ["batman"],
    "슈퍼맨": ["superman"],
    "해리포터": ["harry potter"],
    "반지의제왕": ["lord of the rings"],
    "스타워즈": ["star wars"],
    "스타트렉": ["star trek"],
    "터미네이터": ["terminator"],
    "에이리언": ["alien"],
    "프레데터": ["predator"],
    "쥬라기": ["jurassic"],
    "공룡": ["jurassic"],
    "분노의질주": ["fast furious"],
    "분노": ["fast"],
    "미션임파서블": ["mission impossible"],
    "제임스본드": ["james bond"],
    "본": ["bond", "bourne"],
    "킹스맨": ["kingsman"],
    "매트릭스": ["matrix"],
    "인셉션": ["inception"],
    "인터스텔라": ["interstellar"],
    "다크나이트": ["dark knight"],
    "조커": ["joker"],
    "기생충": ["parasite"],
    
    # ===== 감독 =====
    "놀란": ["nolan"],
    "타란티노": ["tarantino"],
    "스필버그": ["spielberg"],
    "봉준호": ["bong joon"],
    "박찬욱": ["park chan"],
    
    # ===== 배우 =====
    "톰크루즈": ["tom cruise"],
    "키아누리브스": ["keanu reeves"],
    "디카프리오": ["dicaprio"],
    "브래드피트": ["brad pitt"],
    "송강호": ["song kang"],
    "이병헌": ["lee byung"],
}

# 인기/최신 키워드
POPULAR_KEYWORDS = ["최신", "요즘", "인기", "핫한", "지금", "추천", "2024", "2025", "올해"]


def extract_keywords(question: str) -> List[str]:
    """질문에서 키워드 추출 및 영어 검색어로 변환"""
    question_lower = question.lower()
    search_terms = []
    matched_keywords = []
    
    # 키워드 매칭
    for korean, english_list in KEYWORD_DATABASE.items():
        if korean in question:
            search_terms.extend(english_list)
            matched_keywords.append(korean)
    
    print(f"🔍 매칭된 키워드: {matched_keywords}")
    return search_terms


def search_movies_tmdb(query: str, language: str = "ko-KR") -> List[Dict]:
    """TMDB API로 영화 검색"""
    if not TMDB_API_KEY:
        print("❌ TMDB API 키가 없습니다!")
        return []
    
    url = f"{TMDB_BASE_URL}/search/movie"
    params = {
        "api_key": TMDB_API_KEY,
        "query": query,
        "language": language,
        "page": 1,
        "include_adult": False
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # 인기순으로 정렬 (평점 * 투표수)
        movies = data.get("results", [])
        movies_sorted = sorted(
            movies,
            key=lambda x: x.get('vote_average', 0) * x.get('vote_count', 0),
            reverse=True
        )
        
        results = []
        for movie in movies_sorted[:10]:
            results.append({
                "title": movie.get("title"),
                "release_date": movie.get("release_date", "미정"),
                "overview": movie.get("overview", "줄거리 정보 없음"),
                "vote_average": movie.get("vote_average", 0),
                "vote_count": movie.get("vote_count", 0),
                "poster_path": f"https://image.tmdb.org/t/p/w500{movie.get('poster_path')}" if movie.get('poster_path') else None,
                "genre_ids": movie.get("genre_ids", [])
            })
        
        print(f"✅ TMDB 검색 완료: {len(results)}개 영화 발견")
        return results
        
    except Exception as e:
        print(f"❌ TMDB 검색 오류: {e}")
        return []


def get_popular_movies(language: str = "ko-KR") -> List[Dict]:
    """인기 영화 가져오기"""
    if not TMDB_API_KEY:
        return []
    
    url = f"{TMDB_BASE_URL}/movie/popular"
    params = {
        "api_key": TMDB_API_KEY,
        "language": language,
        "page": 1
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        results = []
        for movie in data.get("results", [])[:10]:
            results.append({
                "title": movie.get("title"),
                "release_date": movie.get("release_date", "미정"),
                "overview": movie.get("overview", "줄거리 정보 없음"),
                "vote_average": movie.get("vote_average", 0),
                "vote_count": movie.get("vote_count", 0),
                "poster_path": f"https://image.tmdb.org/t/p/w500{movie.get('poster_path')}" if movie.get('poster_path') else None,
                "genre_ids": movie.get("genre_ids", [])
            })
        
        return results
    except Exception as e:
        print(f"❌ 인기 영화 오류: {e}")
        return []


def find_movies_by_description(question: str) -> tuple:
    """질문 분석 후 영화 검색 (개선된 우선순위)"""
    
    # 1. 인기/최신 영화 요청 감지
    if any(keyword in question for keyword in POPULAR_KEYWORDS):
        print("🔥 인기 영화 모드 활성화")
        popular = get_popular_movies()
        if popular:
            return popular[:8], []
    
    # 2. 키워드 추출
    search_terms = extract_keywords(question)
    
    all_movies = []
    
    # 🎯 전략 1: 특정 영화 직접 검색 (최우선!)
    specific_movies = {
        # 공포
        "물귀신": ["The Ring 2002", "Ringu", "Dark Water", "Shutter 2004"],
        "링": ["The Ring 2002"],
        "귀신": ["The Conjuring", "Insidious", "The Sixth Sense", "Poltergeist"],
        "좀비": ["Train to Busan", "World War Z", "28 Days Later", "Zombieland"],
        "악마": ["The Exorcist", "The Omen", "Hereditary"],
        "공포": ["The Conjuring", "Hereditary", "It", "The Shining"],
        
        # 액션
        "스파이": ["Mission Impossible Fallout", "Casino Royale", "Kingsman", "Atomic Blonde"],
        "자동차": ["Fast Five", "Baby Driver", "Drive 2011", "Mad Max Fury Road"],
        "경주": ["Rush 2013", "Ford v Ferrari", "Gran Turismo"],
        "레이스": ["Rush 2013", "Days of Thunder"],
        "히어로": ["Avengers Endgame", "Iron Man", "The Dark Knight", "Spider-Man"],
        "슈퍼히어로": ["Avengers", "Iron Man", "Batman"],
        
        # SF/판타지
        "우주": ["Interstellar", "Gravity", "The Martian", "2001 A Space Odyssey"],
        "외계인": ["Arrival", "E.T.", "District 9", "Close Encounters"],
        "로봇": ["Terminator 2", "I Robot", "Ex Machina", "Wall-E"],
        "AI": ["Ex Machina", "Her", "A.I. Artificial Intelligence"],
        "시간여행": ["Back to the Future", "Looper", "Edge of Tomorrow"],
        "타임": ["About Time", "Tenet", "Interstellar"],
        
        # 시리즈/프랜차이즈
        "마블": ["Avengers Endgame", "Iron Man", "Spider-Man No Way Home", "Black Panther"],
        "어벤져스": ["Avengers Endgame", "Avengers Infinity War", "Avengers Age of Ultron"],
        "아이언맨": ["Iron Man", "Iron Man 2", "Iron Man 3"],
        "스파이더맨": ["Spider-Man No Way Home", "Spider-Man Homecoming"],
        "배트맨": ["The Dark Knight", "Batman Begins", "The Dark Knight Rises"],
        "해리포터": ["Harry Potter Sorcerer Stone", "Harry Potter Chamber Secrets"],
        "반지의제왕": ["Lord of the Rings Fellowship", "Lord of the Rings Two Towers"],
        "스타워즈": ["Star Wars Empire Strikes Back", "Star Wars A New Hope"],
        "분노의질주": ["Fast Five", "Furious 7", "Fast Furious 6"],
        "미션임파서블": ["Mission Impossible Fallout", "Mission Impossible Rogue Nation"],
        "본": ["The Bourne Identity", "The Bourne Ultimatum"],
        "매트릭스": ["The Matrix", "The Matrix Reloaded"],
        "터미네이터": ["Terminator 2 Judgment Day", "The Terminator"],
        "에이리언": ["Alien", "Aliens"],
        "쥬라기": ["Jurassic Park", "Jurassic World"],
        
        # 한국 영화
        "기생충": ["Parasite 2019"],
        "부산": ["Train to Busan"],
        "올드보이": ["Oldboy 2003"],
        "살인의추억": ["Memories of Murder"],
        
        # 감독
        "놀란": ["Tenet", "Interstellar", "Inception", "The Dark Knight"],
        "타란티노": ["Pulp Fiction", "Django Unchained", "Kill Bill"],
        "봉준호": ["Parasite 2019", "Snowpiercer", "The Host"],
    }
    
    matched_specific = False
    for keyword, movie_titles in specific_movies.items():
        if keyword in question:
            print(f"🎯 전략 1 - '{keyword}' 키워드 직접 검색")
            matched_specific = True
            for title in movie_titles:
                movies = search_movies_tmdb(title)
                if movies:
                    all_movies.extend(movies[:2])  # 각 제목당 2개씩
            
            # 특정 키워드 매칭되면 충분한 결과가 있으면 바로 리턴
            if len(all_movies) >= 5:
                break
    
    # 중복 제거
    if all_movies:
        seen = set()
        unique = []
        for movie in all_movies:
            if movie['title'] not in seen:
                seen.add(movie['title'])
                unique.append(movie)
        all_movies = unique
    
    # 특정 영화 검색으로 충분한 결과가 나왔으면 리턴
    if matched_specific and len(all_movies) >= 3:
        print(f"✅ 특정 영화 검색 성공: {len(all_movies)}개 영화")
        return all_movies[:10], search_terms
    
    # 🎯 전략 2: 조합된 검색어로 시도
    if search_terms:
        # ring 같은 애매한 단어는 제외
        filtered_terms = [t for t in search_terms if t not in ['ring']]
        if filtered_terms:
            unique_terms = list(dict.fromkeys(filtered_terms))[:3]
            search_query = " ".join(unique_terms)
            print(f"🎯 전략 2 - 조합 검색: '{search_query}'")
            movies = search_movies_tmdb(search_query)
            if movies:
                all_movies.extend(movies)
    
    # 🎯 전략 3: 개별 키워드로 각각 검색
    if len(all_movies) < 5 and search_terms:
        print("🎯 전략 3 - 개별 검색 시작")
        # 특정 단어들은 개별 검색에서 제외
        exclude_words = ['ring', 'ghost', 'water']
        for term in search_terms[:3]:
            if term in exclude_words:
                continue
            print(f"   검색: '{term}'")
            movies = search_movies_tmdb(term)
            if movies:
                all_movies.extend(movies[:2])
    
    # 중복 제거
    if all_movies:
        seen_titles = set()
        unique_movies = []
        for movie in all_movies:
            if movie['title'] not in seen_titles:
                seen_titles.add(movie['title'])
                unique_movies.append(movie)
        all_movies = unique_movies
    
    # 🎯 전략 4: 질문 전체로 검색
    if len(all_movies) < 3:
        print("🎯 전략 4 - 질문 전체로 검색")
        movies = search_movies_tmdb(question)
        if movies:
            all_movies.extend(movies)
    
    # 🎯 전략 5: GPT 사용 (있다면)
    if len(all_movies) < 3 and client:
        print("🤖 전략 5 - GPT로 재시도")
        try:
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "영화 제목을 영어로 정확하게 5개 추천. 개봉연도 포함. 한 줄에 하나씩."},
                    {"role": "user", "content": question}
                ],
                temperature=0.3,
                max_tokens=150
            )
            
            movie_titles_text = response.choices[0].message.content.strip()
            movie_titles = [title.strip() for title in movie_titles_text.split('\n') if title.strip()]
            
            for title in movie_titles[:5]:
                movies = search_movies_tmdb(title)
                if movies:
                    all_movies.append(movies[0])
                    
        except Exception as e:
            print(f"❌ GPT 실패: {e}")
    
    # 최종 결과 정리
    if all_movies:
        # 평점순 정렬
        all_movies.sort(key=lambda x: x['vote_average'] * x['vote_count'], reverse=True)
        # 중복 제거
        seen = set()
        unique = []
        for movie in all_movies:
            if movie['title'] not in seen:
                seen.add(movie['title'])
                unique.append(movie)
        
        print(f"✅ 최종 검색 성공: {len(unique)}개 영화")
        return unique[:10], search_terms
    
    print("❌ 모든 검색 전략 실패")
    return [], []


def generate_answer_with_movies(question: str, movies: List[Dict]) -> str:
    """영화 기반 답변 생성"""
    
    if not movies:
        return """죄송합니다. 관련 영화를 찾지 못했습니다. 😢

다음과 같이 질문해보세요:
- "액션 영화 중에 스파이물"
- "무서운 귀신 나오는 영화"
- "웃긴 로맨스 영화"
- "최신 인기 영화"
- "마블 히어로 영화"
"""
    
    # GPT 없이 답변 생성
    answer = f"'{question}'에 대한 추천 영화입니다! 🎬\n\n"
    
    for i, movie in enumerate(movies[:5], 1):
        year = movie['release_date'][:4] if movie['release_date'] != '미정' else '미정'
        rating = movie['vote_average']
        
        answer += f"**{i}. {movie['title']}** ({year})\n"
        answer += f"⭐ 평점: {rating}/10 ({movie['vote_count']}명)\n"
        
        # 줄거리 간략히
        if movie['overview'] and movie['overview'] != "줄거리 정보 없음":
            overview_short = movie['overview'][:80] + "..." if len(movie['overview']) > 80 else movie['overview']
            answer += f"📝 {overview_short}\n"
        
        answer += "\n"
    
    return answer.strip()


class Query(BaseModel):
    question: str
    top_k: int = 5
    model: str = "gpt-3.5-turbo"


@chat_app.post("/chat")
def chat(query: Query):
    print(f"\n{'='*60}")
    print(f"📩 질문 수신: {query.question}")
    print(f"{'='*60}")
    
    movies, keywords = find_movies_by_description(query.question)
    
    print(f"📊 최종 결과: {len(movies)}개 영화")
    if movies:
        print(f"🎬 영화 목록: {[m['title'] for m in movies[:3]]}")
    
    answer = generate_answer_with_movies(query.question, movies)
    
    return {
        "answer": answer,
        "movies": movies[:query.top_k],
        "search_method": "키워드 매칭 + TMDB",
        "matched_keywords": keywords
    }


@chat_app.get("/")
def root():
    return {
        "status": "running",
        "search_engine": "TMDB API",
        "keyword_database": f"{len(KEYWORD_DATABASE)} keywords",
        "openai": client is not None,
        "tmdb": TMDB_API_KEY is not None
    }


@chat_app.get("/test")
def test_search():
    results = search_movies_tmdb("spy action")
    return {
        "query": "spy action",
        "count": len(results),
        "results": results[:3]
    }