# backend/rag_chat.py
# ⭐ 모든 조합 검색 가능한 포괄적 알고리즘

import os
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Set
import requests
from dotenv import load_dotenv

load_dotenv()

chat_app = FastAPI()

# 환경 변수
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
TMDB_BASE_URL = "https://api.themoviedb.org/3"

# OpenAI 클라이언트
client = None
if OPENAI_API_KEY:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        print("✅ OpenAI 클라이언트 초기화 성공")
    except Exception as e:
        print(f"⚠️ OpenAI 없이 작동: {e}")


# 🎬 포괄적 키워드 데이터베이스
KEYWORD_DATABASE = {
    # ===== 장르 =====
    "액션": ["action"],
    "공포": ["horror", "scary"],
    "코미디": ["comedy", "funny"],
    "로맨스": ["romance", "romantic"],
    "멜로": ["romance", "melodrama"],
    "스릴러": ["thriller", "suspense"],
    "SF": ["science fiction", "sci-fi"],
    "공상과학": ["science fiction"],
    "판타지": ["fantasy"],
    "애니메이션": ["animation", "animated"],
    "애니": ["animation"],
    "드라마": ["drama"],
    "범죄": ["crime", "criminal"],
    "미스터리": ["mystery"],
    "전쟁": ["war", "battle", "military"],
    "서부극": ["western"],
    "뮤지컬": ["musical"],
    "다큐멘터리": ["documentary"],
    "다큐": ["documentary"],
    
    # ===== 배경/설정 =====
    "전쟁": ["war", "battle", "military"],
    "우주": ["space", "galaxy", "cosmic"],
    "바다": ["ocean", "sea", "underwater"],
    "학교": ["school", "high school", "college", "university"],
    "병원": ["hospital", "medical"],
    "감옥": ["prison", "jail"],
    "사막": ["desert"],
    "정글": ["jungle"],
    "도시": ["city", "urban"],
    "시골": ["rural", "countryside"],
    "미래": ["future", "futuristic"],
    "과거": ["past", "historical", "period"],
    "중세": ["medieval"],
    "현대": ["modern", "contemporary"],
    "뉴욕": ["new york"],
    "도쿄": ["tokyo"],
    "파리": ["paris"],
    "런던": ["london"],
    "서울": ["seoul"],
    
    # ===== 소재/테마 =====
    "인형": ["doll", "annabelle", "puppet", "chucky"],
    "애나벨": ["annabelle"],
    "처키": ["chucky"],
    "좀비": ["zombie", "undead"],
    "귀신": ["ghost", "spirit", "haunting"],
    "물귀신": ["ring", "ghost water"],
    "악마": ["demon", "devil", "exorcist", "possession"],
    "뱀파이어": ["vampire"],
    "늑대인간": ["werewolf"],
    "괴물": ["monster", "creature"],
    "외계인": ["alien", "extraterrestrial"],
    "로봇": ["robot", "android"],
    "AI": ["artificial intelligence", "AI"],
    "공룡": ["dinosaur", "jurassic"],
    "상어": ["shark"],
    "마법": ["magic", "wizard", "witch"],
    "초능력": ["superpower", "psychic"],
    "히어로": ["superhero", "hero"],
    "슈퍼히어로": ["superhero"],
    
    # ===== 직업/캐릭터 =====
    "스파이": ["spy", "agent", "espionage"],
    "탐정": ["detective", "investigator"],
    "경찰": ["police", "cop"],
    "형사": ["detective", "police"],
    "의사": ["doctor", "surgeon"],
    "간호사": ["nurse"],
    "군인": ["soldier", "military"],
    "해적": ["pirate"],
    "카우보이": ["cowboy", "western"],
    "암살자": ["assassin", "hitman"],
    "킬러": ["killer", "assassin"],
    "연쇄살인마": ["serial killer"],
    "해커": ["hacker"],
    "과학자": ["scientist"],
    "교사": ["teacher"],
    "학생": ["student"],
    "변호사": ["lawyer"],
    "기자": ["journalist", "reporter"],
    
    # ===== 사건/플롯 =====
    "복수": ["revenge"],
    "살인": ["murder", "killing"],
    "납치": ["kidnapping", "abduction"],
    "강도": ["heist", "robbery"],
    "은행강도": ["bank heist"],
    "탈옥": ["escape", "prison break"],
    "테러": ["terrorism", "terrorist"],
    "재난": ["disaster", "catastrophe"],
    "전염병": ["pandemic", "virus", "outbreak"],
    "좀비바이러스": ["zombie virus"],
    "핵전쟁": ["nuclear war"],
    "시간여행": ["time travel"],
    "평행세계": ["parallel universe"],
    "꿈": ["dream"],
    "기억상실": ["amnesia", "memory loss"],
    "정체성": ["identity"],
    "사랑": ["love"],
    "이별": ["breakup", "separation"],
    "가족": ["family"],
    "우정": ["friendship"],
    "배신": ["betrayal"],
    "음모": ["conspiracy"],
    "미스터리": ["mystery"],
    
    # ===== 분위기/톤 =====
    "무서운": ["scary", "horror", "frightening"],
    "슬픈": ["sad", "tearjerker", "emotional"],
    "감동적인": ["touching", "emotional", "heartwarming"],
    "웃긴": ["funny", "hilarious", "comedy"],
    "재미있는": ["entertaining", "fun"],
    "긴장감": ["suspense", "tension", "thriller"],
    "스릴": ["thriller", "suspense"],
    "어두운": ["dark", "noir"],
    "밝은": ["bright", "cheerful"],
    "신나는": ["exciting", "action"],
    "로맨틱한": ["romantic"],
    "따뜻한": ["heartwarming", "warm"],
    "잔인한": ["brutal", "violent", "gore"],
    "섹시한": ["sexy", "erotic"],
    "우울한": ["depressing", "melancholic"],
    
    # ===== 특정 요소 =====
    "자동차": ["car", "racing", "fast"],
    "경주": ["racing", "race"],
    "비행기": ["airplane", "aviation"],
    "헬리콥터": ["helicopter"],
    "폭발": ["explosion", "bomb"],
    "총격": ["shooting", "gunfight"],
    "칼싸움": ["sword fight"],
    "무술": ["martial arts", "kung fu"],
    "권투": ["boxing"],
    "격투기": ["fighting", "combat"],
    "춤": ["dance", "dancing"],
    "노래": ["singing", "music"],
    "음악": ["music"],
    "미술": ["art", "painting"],
    "요리": ["cooking", "food"],
    "스포츠": ["sports"],
    "축구": ["soccer", "football"],
    "야구": ["baseball"],
    "농구": ["basketball"],
    
    # ===== 시리즈/프랜차이즈 =====
    "마블": ["marvel"],
    "어벤져스": ["avengers"],
    "아이언맨": ["iron man"],
    "스파이더맨": ["spider man", "spiderman"],
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
    "분노의질주": ["fast furious"],
    "미션임파서블": ["mission impossible"],
    "제임스본드": ["james bond", "007"],
    "본": ["bourne"],
    "킹스맨": ["kingsman"],
    "매트릭스": ["matrix"],
    "인셉션": ["inception"],
    "인터스텔라": ["interstellar"],
    "다크나이트": ["dark knight"],
    "조커": ["joker"],
    "기생충": ["parasite"],
    "부산행": ["train to busan"],
    "올드보이": ["oldboy"],
    
    # ===== 감독 =====
    "놀란": ["nolan"],
    "타란티노": ["tarantino"],
    "스필버그": ["spielberg"],
    "봉준호": ["bong joon ho"],
    "박찬욱": ["park chan wook"],
    
    # ===== 기타 =====
    "최신": ["latest", "recent", "new"],
    "인기": ["popular", "trending"],
    "명작": ["masterpiece", "classic"],
    "고전": ["classic", "old"],
}

POPULAR_KEYWORDS = ["최신", "요즘", "인기", "핫한", "지금", "추천", "2024", "2025", "올해"]


def extract_keywords(question: str) -> Dict[str, List[str]]:
    """질문에서 모든 키워드 추출 및 분류"""
    question_lower = question.lower()
    
    matched_keywords = {
        "korean": [],  # 한글 키워드
        "english": []  # 영어 검색어
    }
    
    for korean, english_list in KEYWORD_DATABASE.items():
        if korean in question:
            matched_keywords["korean"].append(korean)
            matched_keywords["english"].extend(english_list)
    
    # 중복 제거
    matched_keywords["english"] = list(set(matched_keywords["english"]))
    
    print(f"🔍 매칭된 한글 키워드: {matched_keywords['korean']}")
    print(f"🔍 영어 검색어: {matched_keywords['english'][:5]}...")  # 처음 5개만 출력
    
    return matched_keywords


def search_movies_tmdb(query: str, language: str = "ko-KR", page: int = 1) -> List[Dict]:
    """TMDB API로 영화 검색"""
    if not TMDB_API_KEY:
        print("❌ TMDB API 키가 없습니다!")
        return []
    
    url = f"{TMDB_BASE_URL}/search/movie"
    params = {
        "api_key": TMDB_API_KEY,
        "query": query,
        "language": language,
        "page": page,
        "include_adult": False
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        movies = data.get("results", [])
        
        # 평점 * 투표수로 정렬
        movies_sorted = sorted(
            movies,
            key=lambda x: x.get('vote_average', 0) * x.get('vote_count', 0),
            reverse=True
        )
        
        results = []
        for movie in movies_sorted:
            results.append({
                "title": movie.get("title"),
                "release_date": movie.get("release_date", "미정"),
                "overview": movie.get("overview", "줄거리 정보 없음"),
                "vote_average": movie.get("vote_average", 0),
                "vote_count": movie.get("vote_count", 0),
                "poster_path": f"https://image.tmdb.org/t/p/w500{movie.get('poster_path')}" if movie.get('poster_path') else None,
                "genre_ids": movie.get("genre_ids", [])
            })
        
        print(f"✅ TMDB 검색 완료 ('{query}', 페이지 {page}): {len(results)}개")
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
        for movie in data.get("results", [])[:20]:
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


def find_movies_by_description(question: str, max_results: int = 20) -> tuple:
    """
    ⭐ 포괄적 검색 알고리즘
    - 다중 키워드 조합 지원
    - 예: "액션 영화 중에 전쟁 배경", "공포 영화 인형 나오는거" 등
    """
    
    print(f"\n{'='*60}")
    print(f"📩 검색 질문: {question}")
    print(f"{'='*60}")
    
    # 1. 인기 영화 요청 감지
    if any(keyword in question for keyword in POPULAR_KEYWORDS):
        print("🔥 인기 영화 모드")
        popular = get_popular_movies()
        if popular:
            return popular[:max_results], []
    
    # 2. 키워드 추출
    keywords = extract_keywords(question)
    korean_keywords = keywords["korean"]
    english_terms = keywords["english"]
    
    if not english_terms:
        print("❌ 키워드를 찾을 수 없습니다.")
        return [], []
    
    all_movies = []
    seen_titles = set()
    
    # ⭐ 전략 1: 모든 키워드 조합 검색 (가장 정확)
    if len(english_terms) >= 2:
        # 2-3개 키워드 조합으로 검색
        print(f"\n🎯 전략 1: 다중 키워드 조합 검색")
        
        # 최대 3개 키워드 조합
        for i in range(min(3, len(english_terms))):
            for j in range(i+1, min(4, len(english_terms))):
                combo = f"{english_terms[i]} {english_terms[j]}"
                print(f"   검색: '{combo}'")
                
                movies = search_movies_tmdb(combo)
                for movie in movies[:5]:
                    if movie['title'] not in seen_titles:
                        seen_titles.add(movie['title'])
                        all_movies.append(movie)
                
                # 충분한 결과가 나오면 조기 종료
                if len(all_movies) >= 10:
                    break
            
            if len(all_movies) >= 10:
                break
    
    # ⭐ 전략 2: 개별 키워드 검색
    if len(all_movies) < 5:
        print(f"\n🎯 전략 2: 개별 키워드 검색")
        
        for term in english_terms[:5]:  # 최대 5개
            print(f"   검색: '{term}'")
            movies = search_movies_tmdb(term)
            
            for movie in movies[:3]:
                if movie['title'] not in seen_titles:
                    seen_titles.add(movie['title'])
                    all_movies.append(movie)
    
    # ⭐ 전략 3: 전체 질문으로 검색
    if len(all_movies) < 3:
        print(f"\n🎯 전략 3: 전체 질문 검색")
        movies = search_movies_tmdb(question)
        
        for movie in movies[:5]:
            if movie['title'] not in seen_titles:
                seen_titles.add(movie['title'])
                all_movies.append(movie)
    
    # ⭐ 전략 4: 영어로 된 검색어 조합
    if len(all_movies) < 5 and len(english_terms) >= 2:
        print(f"\n🎯 전략 4: 긴 조합 검색")
        long_query = " ".join(english_terms[:4])
        print(f"   검색: '{long_query}'")
        
        movies = search_movies_tmdb(long_query)
        for movie in movies[:5]:
            if movie['title'] not in seen_titles:
                seen_titles.add(movie['title'])
                all_movies.append(movie)
    
    # 최종 정렬 (평점 * 투표수)
    if all_movies:
        all_movies.sort(
            key=lambda x: x['vote_average'] * x['vote_count'],
            reverse=True
        )
    
    print(f"\n✅ 최종 결과: {len(all_movies)}개 영화")
    if all_movies:
        print(f"🎬 상위 영화: {[m['title'] for m in all_movies[:5]]}")
    
    return all_movies[:max_results], korean_keywords


def generate_answer_with_movies(question: str, movies: List[Dict], keywords: List[str]) -> str:
    """답변 생성"""
    
    if not movies:
        return f"""죄송합니다. '{question}'에 대한 영화를 찾지 못했습니다. 😢

다른 키워드로 검색해보세요:
- "액션 영화 중에 전쟁 배경"
- "공포 영화 인형 나오는거"
- "로맨스 영화인데 슬픈거"
- "SF 영화 우주 배경"
"""
    
    # 키워드 강조
    keyword_text = f" ({', '.join(keywords[:3])})" if keywords else ""
    
    answer = f"'{question}'{keyword_text}에 대한 추천 영화입니다! 🎬\n\n"
    
    for i, movie in enumerate(movies[:5], 1):
        year = movie['release_date'][:4] if movie['release_date'] != '미정' else '미정'
        rating = movie['vote_average']
        
        answer += f"**{i}. {movie['title']}** ({year})\n"
        answer += f"⭐ 평점: {rating}/10\n"
        
        if movie['overview'] and movie['overview'] != "줄거리 정보 없음":
            overview = movie['overview'][:100] + "..." if len(movie['overview']) > 100 else movie['overview']
            answer += f"📝 {overview}\n"
        
        answer += "\n"
    
    if len(movies) > 5:
        answer += f"\n💡 {len(movies) - 5}개의 영화가 더 있습니다!"
    
    return answer.strip()


class Query(BaseModel):
    question: str
    top_k: int = 5
    max_results: int = 20


@chat_app.post("/chat")
def chat(query: Query):
    """챗봇 엔드포인트"""
    movies, keywords = find_movies_by_description(query.question, query.max_results)
    answer = generate_answer_with_movies(query.question, movies, keywords)
    
    return {
        "answer": answer,
        "movies": movies,  # ⭐ 전체 목록 반환 (더보기용)
        "total_count": len(movies),
        "search_method": "다중 키워드 조합 검색",
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
    # 테스트 예시
    test_queries = [
        "액션 영화 중에 전쟁 배경",
        "공포 영화 인형 나오는거",
        "로맨스 영화인데 슬픈거"
    ]
    
    results = {}
    for q in test_queries:
        movies, keywords = find_movies_by_description(q, 5)
        results[q] = {
            "count": len(movies),
            "keywords": keywords,
            "movies": [m['title'] for m in movies[:3]]
        }
    
    return results