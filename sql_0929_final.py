import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse, parse_qs
from selenium.webdriver.support.ui import Select  
import pandas as pd
import time, random, re
import argparse
from typing import Optional
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv


# 환경 변수 로드
load_dotenv()

def switch_to_audience_tab_main(driver):
    """메인 목록 페이지에서 관객 리뷰 탭(nz_dt)으로 전환 (셀렉트 박스 + change 이벤트)"""
    try:
        print("메인 페이지에서 관객 리뷰 탭으로 전환 중...")
        
        # 셀렉트 박스 대기
        try:
            select_element = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.ID, "point_list_order"))
            )
        except TimeoutException:
            print("  셀렉트 박스를 찾을 수 없음 - 전환 실패")
            return False
        
        # 전환 전 상태 저장
        try:
            current_container = driver.find_element(By.ID, "point_list_holder")
            old_html = current_container.get_attribute('innerHTML')
        except:
            old_html = ""
        
        old_first_id = get_first_movie_id_from_dom(driver)
        
        # 셀렉트 박스로 nz_dt 선택
        try:
            select = Select(select_element)
            select.select_by_value("nz_dt")
            
            # change 이벤트 디스패치
            driver.execute_script(
                "arguments[0].dispatchEvent(new Event('change', { bubbles: true }));",
                select_element
            )
            print("  셀렉트 박스로 nz_dt 선택 완료")
        except Exception as select_error:
            print(f"  셀렉트 박스 조작 실패: {select_error}")
            return False
        
        # DOM 변경 대기 (최대 10초)
        start_time = time.time()
        tab_switched = False
        
        while time.time() - start_time < 10:
            try:
                current_container = driver.find_element(By.ID, "point_list_holder")
                new_html = current_container.get_attribute('innerHTML')
                
                # HTML 변경 확인
                if new_html != old_html:
                    print("  관객 리뷰 탭 전환 완료 (DOM 변경 감지)")
                    tab_switched = True
                    break
                
                # 첫 카드 ID 변경 확인
                new_first_id = get_first_movie_id_from_dom(driver)
                if new_first_id != old_first_id:
                    print("  관객 리뷰 탭 전환 완료 (첫 카드 ID 변경)")
                    tab_switched = True
                    break
                    
            except:
                pass
            
            time.sleep(0.2)
        
        if not tab_switched:
            print("  관객 리뷰 탭 전환 대기 시간 초과")
            return False
        
        # 안정화 대기
        time.sleep(random.uniform(0.5, 1.0))
        return True
        
    except Exception as e:
        print(f"  관객 리뷰 탭 전환 중 오류: {e}")
        return False

def clean_text(s):
    """텍스트 정리: 공백 트림, 연속 공백 제거, 특수 공백 제거"""
    if not s:
        return None
    
    # 앞뒤 공백 제거, 연속 공백을 하나로, 특수 공백 문자 제거
    cleaned = re.sub(r'\s+', ' ', s.replace('\xa0', ' ').replace('\u200b', '')).strip()
    
    return cleaned if cleaned else None


BASE_URL = "https://cine21.com"
LIST_URL = "https://cine21.com/movie/point"

# MySQL 설정 (환경변수 또는 기본값)
MYSQL_CONFIG = {
    'host': os.getenv('MYSQL_HOST', 'localhost'),
    'database': os.getenv('MYSQL_DATABASE', 'cine21_db'),
    'user': os.getenv('MYSQL_USER', 'root'),
    'password': os.getenv('MYSQL_PASSWORD', ''),
    'port': int(os.getenv('MYSQL_PORT', '3306')),
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_unicode_ci'
}

TABLE_NAME = 'cine21_movies'

def setup_driver():
    """Chrome 드라이버 설정"""
    options = uc.ChromeOptions()
    # options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-dev-tools")  # 추가
    options.add_argument("--disable-extensions")  # 추가
    
    try:
        driver = uc.Chrome(options=options, version_main=None, use_subprocess=False)
        driver.set_page_load_timeout(20)
        driver.implicitly_wait(3)
        return driver
    except Exception as e:
        print(f"드라이버 초기화 오류: {e}")
        raise

def setup_database():
    """데이터베이스 연결 및 테이블 생성"""
    connection = None
    try:
        # 먼저 데이터베이스 없이 연결해서 데이터베이스 생성
        temp_config = MYSQL_CONFIG.copy()
        temp_config.pop('database')
        
        print(f"MySQL 서버에 연결 중... (Host: {MYSQL_CONFIG['host']}, Port: {MYSQL_CONFIG['port']})")
        connection = mysql.connector.connect(**temp_config)
        cursor = connection.cursor()
        
        # 데이터베이스 생성 (존재하지 않는 경우)
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {MYSQL_CONFIG['database']} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        print(f"데이터베이스 '{MYSQL_CONFIG['database']}' 준비 완료")
        
        cursor.close()
        connection.close()
        
        # 데이터베이스를 포함해서 다시 연결
        print(f"데이터베이스 '{MYSQL_CONFIG['database']}'에 연결 중...")
        connection = mysql.connector.connect(**MYSQL_CONFIG)
        cursor = connection.cursor()
        
        # 테이블 생성 (존재하지 않는 경우) - 새로운 컬럼들 추가
        create_table_query = f"""
        CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            영화이름 VARCHAR(500) NOT NULL,
            이미지URL TEXT,
            영화ID VARCHAR(50) NOT NULL UNIQUE,
            전문가별점 DECIMAL(3,1),
            관객별점 DECIMAL(3,1),
            `상영시간(분)` INT,
            개봉일 DATE,
            장르 VARCHAR(200),
            국가 VARCHAR(200),
            감독 VARCHAR(500),
            출연 TEXT,
            시놉시스 TEXT,
            전문가이름 TEXT,
            전문가별점상세 TEXT,
            전문가내용 TEXT,
            관련기사1 TEXT,
            관련기사2 TEXT,
            관객별점상세 TEXT,
            관객리뷰 TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_movie_id (영화ID),
            INDEX idx_movie_name (영화이름),
            INDEX idx_release_date (개봉일)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """

        
        cursor.execute(create_table_query)
        connection.commit()
        print(f"테이블 '{TABLE_NAME}' 준비 완료")
        
        return connection
        
    except Error as e:
        print(f"데이터베이스 설정 오류: {e}")
        if connection and connection.is_connected():
            connection.close()
        return None

def insert_movies_to_db(connection, movies_data):
    """영화 데이터를 MySQL에 삽입 (중복 영화ID는 스킵)"""
    if not connection or not movies_data:
        return 0, 0
    
    cursor = connection.cursor()
    inserted_count = 0
    duplicate_count = 0
    
    # INSERT IGNORE를 사용하여 중복된 영화ID는 자동으로 스킵
    insert_query = f"""
    INSERT IGNORE INTO {TABLE_NAME} 
    (영화이름, 이미지URL, 영화ID, 전문가별점, 관객별점, `상영시간(분)`, 개봉일, 장르, 국가, 감독, 출연,
     시놉시스, 전문가이름, 전문가별점상세, 전문가내용, 관련기사1, 관련기사2, 관객별점상세, 관객리뷰)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    try:
        for movie in movies_data:
            # None 값 처리
            values = (
                clean_text(movie['영화이름']),
                movie['이미지URL'],
                clean_text(movie['영화ID']),
                movie['전문가별점'] if movie['전문가별점'] is not None else None,
                movie['관객별점'] if movie['관객별점'] is not None else None,
                movie['상영시간(분)'] if movie['상영시간(분)'] is not None else None,
                movie['개봉일'] if movie['개봉일'] is not None else None,
                clean_text(movie['장르']),
                clean_text(movie['국가']),
                clean_text(movie['감독']),
                clean_text(movie['출연']),
                clean_text(movie['시놉시스']),
                clean_text(movie['전문가이름']),
                clean_text(movie['전문가별점상세']),
                clean_text(movie['전문가내용']),
                clean_text(movie['관련기사1']),
                clean_text(movie['관련기사2']),
                clean_text(movie['관객별점상세']),
                clean_text(movie['관객리뷰'])
            )
            
            cursor.execute(insert_query, values)
            
            # INSERT IGNORE는 중복 시 affected_rows가 0이 됨
            if cursor.rowcount > 0:
                inserted_count += 1
                print(f"  DB 삽입: {movie['영화이름']} (ID: {movie['영화ID']})")
            else:
                duplicate_count += 1
                print(f"  중복 스킵: {movie['영화이름']} (ID: {movie['영화ID']})")
        
        connection.commit()
        return inserted_count, duplicate_count
        
    except Error as e:
        print(f"데이터 삽입 오류: {e}")
        connection.rollback()
        return 0, 0
    finally:
        cursor.close()

def get_db_stats(connection):
    """데이터베이스 통계 조회"""
    if not connection:
        return None
    
    try:
        cursor = connection.cursor()
        
        # 전체 레코드 수
        cursor.execute(f"SELECT COUNT(*) FROM {TABLE_NAME}")
        total_count = cursor.fetchone()[0]

        # 각 필드별 데이터 통계
        cursor.execute(f"""
        SELECT 
            COUNT(CASE WHEN 전문가별점 IS NOT NULL THEN 1 END) as expert_count,
            COUNT(CASE WHEN 관객별점 IS NOT NULL THEN 1 END) as audience_count,
            COUNT(CASE WHEN `상영시간(분)` IS NOT NULL THEN 1 END) as runtime_count,
            COUNT(CASE WHEN 개봉일 IS NOT NULL THEN 1 END) as release_count,
            COUNT(CASE WHEN 장르 IS NOT NULL AND 장르 != '' THEN 1 END) as genre_count,
            COUNT(CASE WHEN 국가 IS NOT NULL AND 국가 != '' THEN 1 END) as country_count,
            COUNT(CASE WHEN 감독 IS NOT NULL AND 감독 != '' THEN 1 END) as director_count,
            COUNT(CASE WHEN 출연 IS NOT NULL AND 출연 != '' THEN 1 END) as cast_count,
            COUNT(CASE WHEN 시놉시스 IS NOT NULL AND 시놉시스 != '' THEN 1 END) as synopsis_count,
            COUNT(CASE WHEN 전문가이름 IS NOT NULL AND 전문가이름 != '' THEN 1 END) as expert_name_count,
            COUNT(CASE WHEN 관련기사1 IS NOT NULL AND 관련기사1 != '' THEN 1 END) as article_count,
            COUNT(CASE WHEN 관객별점상세 IS NOT NULL AND 관객별점상세 != '' THEN 1 END) as audience_detail_count
        FROM {TABLE_NAME}
        """)
        
        stats = cursor.fetchone()
        cursor.close()
        
        return {
            'total': total_count,
            'expert_ratings': stats[0],
            'audience_ratings': stats[1],
            'runtimes': stats[2],
            'release_dates': stats[3],
            'genres': stats[4],
            'countries': stats[5],
            'directors': stats[6],
            'casts': stats[7],
            'synopsis': stats[8],
            'expert_details': stats[9],
            'articles': stats[10],
            'audience_details': stats[11]
        }
        
    except Error as e:
        print(f"통계 조회 오류: {e}")
        return None
    

def safe_get(driver, url):
    """안전한 페이지 로딩"""
    try:
        driver.get(url)
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        time.sleep(random.uniform(0.5, 1.0))
        return True
    except TimeoutException:
        driver.execute_script("window.stop();")
        time.sleep(0.5)
        return False

def extract_movie_id_from_url(url):
    """URL에서 movie_id 추출"""
    if not url:
        return None
    
    try:
        # 쿼리 파라미터에서 movie_id 추출
        parsed = urlparse(url)
        query_params = parse_qs(parsed.query)
        
        if 'movie_id' in query_params:
            return query_params['movie_id'][0]
        
        # URL 경로에서 숫자 ID 추출 (예: /movie/info/12345)
        path_match = re.search(r'/movie/info/(\d+)', url)
        if path_match:
            return path_match.group(1)
        
        return None
    except Exception:
        return None

def get_first_movie_id_from_dom(driver) -> Optional[int]:
    """현재 DOM에서 첫 번째 영화의 ID를 추출"""
    try:
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        container = soup.select_one('#point_list_holder')
        if not container:
            return None
        
        first_card = container.select_one('div.list_with_upthumb_item')
        if not first_card:
            return None
        
        link_elem = first_card.select_one('a[href*="/movie/info/"]')
        if link_elem:
            href = link_elem.get('href')
            if href:
                detail_url = urljoin(BASE_URL, href) if not href.startswith('http') else href
                movie_id = extract_movie_id_from_url(detail_url)
                return int(movie_id) if movie_id else None
        
        return None
    except Exception:
        return None

def wait_point_list_updated(driver, old_html, old_first_id, timeout=10):
    """컨테이너 HTML 변경 또는 첫 카드 ID 변경을 기다림"""
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            # 현재 HTML 확인
            current_container = driver.find_element(By.ID, "point_list_holder")
            current_html = current_container.get_attribute('innerHTML')
            
            # HTML이 변경되었는지 확인
            if current_html != old_html:
                print("  HTML 변경 감지됨")
                return True
            
            # 첫 번째 카드 ID가 변경되었는지 확인
            current_first_id = get_first_movie_id_from_dom(driver)
            if current_first_id != old_first_id:
                print(f"  첫 카드 ID 변경: {old_first_id} → {current_first_id}")
                return True
            
        except Exception:
            pass
        
        time.sleep(0.2)
    
    print("  대기 시간 초과 - 현재 DOM으로 진행")
    return False

def goto_page(driver, page: int) -> bool:
    """AJAX 방식으로 페이지 이동"""
    try:
        # 현재 상태 저장
        old_container = driver.find_element(By.ID, "point_list_holder")
        old_html = old_container.get_attribute('innerHTML')
        old_first_id = get_first_movie_id_from_dom(driver)
        
        print(f"  페이지 {page}로 이동 시도...")
        
        # 1순위: JavaScript 함수 호출
        try:
            driver.execute_script("fetch_point_list(arguments[0]);", page)
            print(f"  fetch_point_list({page}) 호출 성공")
        except Exception as js_error:
            print(f"  JS 호출 실패: {js_error}")
            
            # 2순위: 페이지네이션 버튼 클릭
            try:
                pagination_buttons = driver.find_elements(By.CSS_SELECTOR, ".pagination_wrap .page a")
                target_button = None
                
                for button in pagination_buttons:
                    button_text = button.text.strip()
                    if button_text == str(page):
                        target_button = button
                        break
                
                if target_button:
                    driver.execute_script("arguments[0].click();", target_button)
                    print(f"  버튼 클릭으로 페이지 {page} 이동")
                else:
                    print(f"  페이지 {page} 버튼을 찾을 수 없음")
                    return False
                    
            except Exception as click_error:
                print(f"  버튼 클릭 실패: {click_error}")
                return False
        
        # 변경 대기
        success = wait_point_list_updated(driver, old_html, old_first_id, timeout=10)
        
        if success:
            print(f"  페이지 {page} 이동 완료")
            return True
        else:
            print(f"  페이지 {page} 이동 실패 - 현재 DOM으로 계속")
            return False
            
    except Exception as e:
        print(f"  페이지 {page} 이동 중 오류: {e}")
        return False

def collect_movie_list(driver, page):
    """현재 DOM에서 영화 기본 정보 수집"""
    print(f"페이지 {page} 카드 수집 시작")
    
    # 카드 로딩 대기
    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, "#point_list_holder div.list_with_upthumb_item"))
        )
    except TimeoutException:
        print(f"  페이지 {page} 카드 로딩 대기 타임아웃")
    
    # BeautifulSoup으로 파싱
    soup = BeautifulSoup(driver.page_source, 'html.parser')
    container = soup.select_one('#point_list_holder')
    
    if not container:
        print(f"  페이지 {page}: #point_list_holder 컨테이너를 찾을 수 없음")
        return []
    
    cards = container.select('div.list_with_upthumb_item')
    print(f"  페이지 {page}에서 발견된 카드 수: {len(cards)}")
    
    movies = []
    
    for idx, card in enumerate(cards, 1):
        try:
            # 제목 추출
            title_elem = card.select_one('p.title')
            title = title_elem.get_text(strip=True) if title_elem else None
            title = clean_text(title)
            
            if not title:
                print(f"    카드 {idx}: 제목 없음 - 스킵")
                continue
            # 이미지 URL 추출
            img_elem = card.select_one('div.img_wrap img')
            img_url = None
            if img_elem:
                img_url = img_elem.get('src') or img_elem.get('data-src')
                if img_url and not img_url.startswith('http'):
                    img_url = urljoin(BASE_URL, img_url)
                # noimg 패턴 체크 - placeholder 이미지는 None 처리
                if img_url and 'noimg' in img_url:
                    img_url = None
            
            # 상세 URL 추출
            link_elem = card.select_one('a[href*="/movie/info/"]')
            detail_url = None
            movie_id = None
            if link_elem:
                href = link_elem.get('href')
                if href:
                    detail_url = urljoin(BASE_URL, href) if not href.startswith('http') else href
                    movie_id = extract_movie_id_from_url(detail_url)
            
            # 영화ID 필수 체크
            if not movie_id:
                print(f"    카드 {idx}: 영화ID 없음 (제목={title}) - 스킵")
                continue
            
            movie_info = {
                '영화이름': title,
                '이미지URL': img_url,
                '상세URL': detail_url,
                '영화ID': movie_id,
                '전문가별점': None,
                '관객별점': None,
                '상영시간(분)': None,
                '개봉일': None,
                '장르': None,
                '국가': None,
                '감독': None,
                '출연': None,
                '시놉시스': None,
                '전문가이름': None,
                '전문가별점상세': None,
                '전문가내용': None,
                '관련기사1': None,
                '관련기사2': None,
                '관객별점상세': None,
                '관객리뷰': None
            }
            
            movies.append(movie_info)
            print(f"    카드 {idx}: {title} (ID: {movie_id}) - 수집 완료")
            
        except Exception as e:
            print(f"    카드 {idx} 처리 중 오류: {e}")
            continue
    
    print(f"  페이지 {page}에서 총 {len(movies)}개 영화 수집 완료")
    return movies

def parse_release_date(date_text):
    """개봉일 텍스트를 YYYY-MM-DD 형식으로 변환"""
    if not date_text:
        return None
    
    # 공백 제거 및 소문자 변환
    date_text = date_text.strip()
    
    try:
        # YYYY.MM.DD 형식
        match = re.search(r'(\d{4})\.(\d{1,2})\.(\d{1,2})', date_text)
        if match:
            year, month, day = match.groups()
            return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
        
        # YYYY-MM-DD 형식
        match = re.search(r'(\d{4})-(\d{1,2})-(\d{1,2})', date_text)
        if match:
            year, month, day = match.groups()
            return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
        
        # YYYY/MM/DD 형식
        match = re.search(r'(\d{4})/(\d{1,2})/(\d{1,2})', date_text)
        if match:
            year, month, day = match.groups()
            return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
        
        # YYYY년 MM월 DD일 형식
        match = re.search(r'(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일', date_text)
        if match:
            year, month, day = match.groups()
            return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
        
        return None
    except Exception:
        return None

def extract_detail_info(driver, movie):
    """상세 페이지에서 별점과 기본 정보 추출 (XPath 사용)"""
    detail_url = movie['상세URL']
    movie_id = movie['영화ID']
    
    print(f"상세 페이지 처리: {movie['영화이름']} (ID: {movie_id})")
    
    if not safe_get(driver, detail_url):
        print(f"  상세 페이지 로딩 실패: {detail_url}")
        return movie


    # 기존 BeautifulSoup 방식으로 별점 및 기본 정보 추출 (그대로 유지)
    soup = BeautifulSoup(driver.page_source, 'html.parser')
    
    # 1. 별점 추출 (기존 코드)
    try:
        star_box_wrap = soup.select_one('div.movie_detail_star_box_wrap')
        if star_box_wrap:
            star_box = star_box_wrap.select_one('div.star_box.flex_between_pc_flex_mo')
            if star_box:
                # 전문가 별점
                expert_div = star_box.select_one('div.star_cine21.flex_between_pc_block_mo')
                if expert_div:
                    expert_num = expert_div.select_one('p.num')
                    if expert_num:
                        expert_text = expert_num.get_text(strip=True)
                        expert_match = re.search(r'(\d+(?:\.\d+)?)', expert_text)
                        if expert_match:
                            movie['전문가별점'] = float(expert_match.group(1))
                            print(f"  전문가별점: {movie['전문가별점']}")
                
                # 관객 별점
                netizen_div = star_box.select_one('div.star_netizen.flex_between_pc_block_mo')
                if netizen_div:
                    netizen_num = netizen_div.select_one('p.num')
                    if netizen_num:
                        netizen_text = netizen_num.get_text(strip=True)
                        netizen_match = re.search(r'(\d+(?:\.\d+)?)', netizen_text)
                        if netizen_match:
                            movie['관객별점'] = float(netizen_match.group(1))
                            print(f"  관객별점: {movie['관객별점']}")
    except Exception as e:
        print(f"  별점 추출 중 오류: {e}")
    
    # 2. 기본 정보 추출 (기존 코드)
    try:
        info_list = soup.select_one('ul.info_list')
        if info_list:
            list_items = info_list.select('li')
            for li in list_items:
                title_elem = li.select_one('p.title')
                if not title_elem:
                    continue
                
                title_text = title_elem.get_text(strip=True)
                li_text = li.get_text()
                content = li_text.replace(title_text, '', 1).strip()
                content = clean_text(content)
                
                if title_text == '개봉':
                    parsed_date = parse_release_date(content)
                    if parsed_date:
                        movie['개봉일'] = parsed_date
                        print(f"  개봉일: {movie['개봉일']}")
                elif title_text == '시간':
                    runtime_match = re.search(r'(\d{1,3})\s*분', content)
                    if runtime_match:
                        movie['상영시간(분)'] = int(runtime_match.group(1))
                        print(f"  상영시간: {movie['상영시간(분)']}분")
                elif title_text == '장르':
                    if content:
                        movie['장르'] = content
                        print(f"  장르: {movie['장르']}")
                elif title_text == '국가':
                    if content:
                        movie['국가'] = content
                        print(f"  국가: {movie['국가']}")
                elif title_text == '감독':
                    if content:
                        movie['감독'] = content
                        print(f"  감독: {movie['감독']}")
                elif title_text == '출연':
                    if content:
                        movie['출연'] = content
                        print(f"  출연: {movie['출연']}")
    except Exception as e:
        print(f"  기본 정보 추출 중 오류: {e}")

    # === 새로운 정보들은 XPath로 추출 ===
    
    # 3. 시놉시스 추출 (XPath 사용)
    try:
        synopsis_xpath = '/html/body/div[4]/main/div/div/div/div/section[1]/div/div'
        synopsis_elem = driver.find_element(By.XPATH, synopsis_xpath)
        synopsis_text = synopsis_elem.text.strip()
        if synopsis_text:
            movie['시놉시스'] = synopsis_text
            print(f"  시놉시스: {synopsis_text[:50]}...")
    except NoSuchElementException:
        print(f"  시놉시스: XPath로 요소를 찾을 수 없음")
    except Exception as e:
        print(f"  시놉시스 추출 중 오류: {e}")
    
    # 4. 전문가 별점 상세 정보 추출 (XPath 사용)
    try:
        expert_names = []
        expert_ratings = []
        expert_contents = []
        
        # 전문가 리뷰 li 요소들 찾기
        expert_base_xpath = '/html/body/div[4]/main/div/div/div/div/section[4]/ul/li'
        expert_elements = driver.find_elements(By.XPATH, expert_base_xpath)
        
        for i, li_elem in enumerate(expert_elements, 1):
            try:
                # 이름: div[1]/p
                name_xpath = f'{expert_base_xpath}[{i}]/div[1]/p'
                name_elem = driver.find_element(By.XPATH, name_xpath)
                name = name_elem.text.strip()
                
                # 별점: div[1]/div/p  
                rating_xpath = f'{expert_base_xpath}[{i}]/div[1]/div/p'
                rating_elem = driver.find_element(By.XPATH, rating_xpath)
                rating = rating_elem.text.strip()
                
                # 내용: div[2]
                content_xpath = f'{expert_base_xpath}[{i}]/div[2]'
                content_elem = driver.find_element(By.XPATH, content_xpath)
                content = content_elem.text.strip()
                
                if name:
                    expert_names.append(name)
                    expert_ratings.append(rating)
                    expert_contents.append(content)
                    
            except NoSuchElementException:
                # 해당 인덱스의 요소가 없으면 패스
                continue
            except Exception:
                continue
        
        if expert_names:
            movie['전문가이름'] = ' | '.join(expert_names)
            movie['전문가별점상세'] = ' | '.join(expert_ratings)
            movie['전문가내용'] = ' | '.join(expert_contents)
            print(f"  전문가 리뷰: {len(expert_names)}명")
            
    except Exception as e:
        print(f"  전문가 리뷰 추출 중 오류: {e}")
    
    # 5. 관련 기사 링크 추출 (XPath 사용)
    try:
        # 첫 번째 기사
        try:
            article1_xpath = '/html/body/div[4]/main/div/div/div/div/section[5]/ul/li[1]/a'
            article1_elem = driver.find_element(By.XPATH, article1_xpath)
            article1_text = article1_elem.text.strip()
            article1_href = article1_elem.get_attribute('href')
            if article1_text and article1_href:
                movie['관련기사1'] = f"{article1_text} | {article1_href}"
                print(f"  관련기사1: {article1_text}")
        except NoSuchElementException:
            pass
        
        # 두 번째 기사
        try:
            article2_xpath = '/html/body/div[4]/main/div/div/div/div/section[5]/ul/li[2]/a'
            article2_elem = driver.find_element(By.XPATH, article2_xpath)
            article2_text = article2_elem.text.strip()
            article2_href = article2_elem.get_attribute('href')
            if article2_text and article2_href:
                movie['관련기사2'] = f"{article2_text} | {article2_href}"
                print(f"  관련기사2: {article2_text}")
        except NoSuchElementException:
            pass
            
    except Exception as e:
        print(f"  관련기사 추출 중 오류: {e}")
    
# 6. 관객 리뷰 추출 (페이지 번호 클릭)
    try:
        audience_ratings = []
        audience_contents = []
        
        print(f"  관객 리뷰 수집 시작...")
        
        max_pages = 20
        
        for page_num in range(1, max_pages + 1):
            print(f"  페이지 {page_num}...")
            
            # 2페이지부터 페이지 번호 클릭
            if page_num > 1:
                try:
                    # 페이지 번호 버튼 찾기
                    clicked = False
                    
                    # 방법 1: 숫자 텍스트로 찾기
                    try:
                        page_buttons = driver.find_elements(By.XPATH, f"//*[text()='{page_num}']")
                        for btn in page_buttons:
                            if btn.is_displayed():
                                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", btn)
                                time.sleep(0.3)
                                driver.execute_script("arguments[0].click();", btn)
                                print(f"    페이지 {page_num} 클릭")
                                clicked = True
                                break
                    except:
                        pass
                    
                    # 방법 2: 다음 버튼
                    if not clicked:
                        try:
                            next_buttons = driver.find_elements(By.XPATH, "//*[contains(text(), '다음') or contains(text(), 'next')]")
                            for btn in next_buttons:
                                if btn.is_displayed():
                                    driver.execute_script("arguments[0].click();", btn)
                                    print(f"    다음 버튼 클릭")
                                    clicked = True
                                    break
                        except:
                            pass
                    
                    if not clicked:
                        print(f"    페이지 버튼 없음 - 종료")
                        break
                    
                    # Alert 처리
                    time.sleep(0.5)
                    try:
                        alert = driver.switch_to.alert
                        alert_text = alert.text
                        print(f"    Alert: {alert_text}")
                        alert.accept()
                        if "마지막" in alert_text:
                            print(f"    마지막 페이지")
                            break
                    except:
                        pass
                    
                    # 페이지 로딩 대기
                    time.sleep(2.0)
                    
                except Exception as e:
                    print(f"    페이지 이동 실패: {e}")
                    break
            
            # 현재 페이지 파싱
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            
            # 섹션 찾기
            section = None
            for s in soup.find_all('section'):
                title = s.find(['h2', 'h3', 'h4'])
                if title and ('관객' in title.get_text() or '네티즌' in title.get_text()):
                    section = s
                    break
            
            if not section:
                sections = soup.find_all('section')
                section = sections[-1] if sections else None
            
            if not section:
                print(f"    섹션 없음")
                break
            
            # 리뷰 수집
            items = section.find_all('li')
            new_count = 0
            
            for li in items:
                text = li.get_text('\n', strip=True)
                if len(text) < 10:
                    continue
                
                # 별점
                rating = ""
                if '★' in text:
                    for line in text.split('\n'):
                        if '★' in line:
                            rating = line.strip()
                            break
                
                # 내용
                content = ""
                for div in li.find_all('div'):
                    t = div.get_text(strip=True)
                    if len(t) > len(content) and len(t) > 15:
                        content = t
                
                if not content:
                    content = text
                
                # 저장
                if len(content) >= 15:
                    if content[:100] not in [c[:100] for c in audience_contents]:
                        audience_ratings.append(rating or "별점없음")
                        audience_contents.append(content[:500])
                        new_count += 1
            
            print(f"    수집: {new_count}개 (총 {len(audience_contents)}개)")
            
            # 신규 없으면 종료
            if page_num > 1 and new_count == 0:
                print(f"    신규 없음 - 종료")
                break
        
        # 저장
        if audience_ratings:
            movie['관객별점상세'] = ' | '.join(audience_ratings)
            movie['관객리뷰'] = ' | '.join(audience_contents)
            print(f"  ✓ 관객 리뷰: {len(audience_ratings)}개")
        else:
            print(f"  ✗ 관객 리뷰: 없음")
            
    except Exception as e:
        print(f"  관객 리뷰 오류: {e}") 
          
    return movie


def main():
    """메인 실행 함수"""
    parser = argparse.ArgumentParser(description='Cine21 영화 정보 크롤링 (MySQL 저장)')
    parser.add_argument('--pages', type=int, default=5, help='수집할 페이지 수 (기본값: 5)')
    parser.add_argument('--sleep-min', type=float, default=0.5, help='상세 요청 간 최소 대기시간 (기본값: 1.5)')
    parser.add_argument('--sleep-max', type=float, default=1.0, help='상세 요청 간 최대 대기시간 (기본값: 3.0)')
    parser.add_argument('--page-sleep-min', type=float, default=0.2, help='페이지 간 최소 대기시간 (기본값: 0.6)')
    parser.add_argument('--page-sleep-max', type=float, default=0.4, help='페이지 간 최대 대기시간 (기본값: 1.2)')
    
    args = parser.parse_args()
    
    driver = None
    db_connection = None

    try:
        print("=== Cine21 영화 정보 크롤링 시작 (MySQL 저장) ===")
        print(f"수집 페이지 수: {args.pages}페이지")
        print("단계 1: MySQL 데이터베이스 연결 및 테이블 준비")
        print("단계 2: 리스트 페이지 AJAX 이동하며 기본 정보 수집")
        print("단계 3: 각 상세 페이지에서 별점, 개봉일, 장르, 국가, 감독, 출연 정보 수집")
        print("단계 4: MySQL 데이터베이스에 저장")
        print()
        
        # 데이터베이스 설정
        db_connection = setup_database()
        if not db_connection:
            print("데이터베이스 연결 실패. 프로그램을 종료합니다.")
            return
        
        # 드라이버 설정
        driver = setup_driver()
        
        # 초기 페이지 로딩 (한 번만)
        print(f"초기 페이지 로딩: {LIST_URL}")
        if not safe_get(driver, LIST_URL):
            print("초기 페이지 로딩 실패")
            return

        # 메인 페이지에서 관객 리뷰 탭으로 전환 (한 번만)
        switched = switch_to_audience_tab_main(driver)
        if not switched:
            print("  관객 정렬 전환 실패 - 기본 탭으로 진행")

        # 1단계: AJAX 페이지 이동하며 기본 정보 수집
        all_movies = []
        seen_ids = set()
        
        for page in range(1, args.pages + 1):
            print(f"\n=== 페이지 {page}/{args.pages} 처리 ===")
            
            # 페이지 이동 (첫 페이지는 이미 로딩됨)
            if page > 1:
                if not goto_page(driver, page):
                    print(f"페이지 {page} 이동 실패 - 다음 페이지로 계속")
                    continue
                
                # 페이지 이동 후 추가 대기
                time.sleep(random.uniform(0.5, 1.0))
            
            # 현재 DOM에서 카드 수집
            page_movies = collect_movie_list(driver, page)
            
            # 중복 제거
            unique_movies = []
            duplicate_count = 0
            
            for movie in page_movies:
                movie_id = movie['영화ID']
                if movie_id not in seen_ids:
                    seen_ids.add(movie_id)
                    unique_movies.append(movie)
                else:
                    duplicate_count += 1
            
            all_movies.extend(unique_movies)
            
            print(f"페이지 {page} 요약:")
            print(f"  수집된 영화: {len(page_movies)}개")
            print(f"  중복 제거: {duplicate_count}개")
            print(f"  추가된 영화: {len(unique_movies)}개")
            print(f"  전체 누적: {len(all_movies)}개")
            
            # 페이지 간 대기 (마지막 페이지가 아닌 경우)
            if page < args.pages:
                wait_time = random.uniform(args.page_sleep_min, args.page_sleep_max)
                print(f"  다음 페이지까지 {wait_time:.1f}초 대기...")
                time.sleep(wait_time)
        
        if not all_movies:
            print("수집된 영화가 없습니다.")
            return
        
        print(f"\n=== 상세 페이지 정보 수집 시작 ({len(all_movies)}개 영화) ===")
        
        # 2단계: 각 상세 페이지에서 추가 정보 수집
        success_count = 0
        for idx, movie in enumerate(all_movies, 1):
            print(f"\n[{idx}/{len(all_movies)}]", end=" ")
            original_movie = movie.copy()
            movie = extract_detail_info(driver, movie)
            
            # 성공 여부 확인 (별점, 개봉일, 장르, 국가, 감독, 출연, 상영시간 중 하나라도 수집되면 성공)
            if (movie['전문가별점'] != original_movie['전문가별점'] or
                movie['관객별점'] != original_movie['관객별점'] or
                movie['상영시간(분)'] != original_movie['상영시간(분)'] or
                movie['개봉일'] != original_movie['개봉일'] or
                movie['장르'] != original_movie['장르'] or
                movie['국가'] != original_movie['국가'] or
                movie['감독'] != original_movie['감독'] or
                movie['출연'] != original_movie['출연']):
                success_count += 1
            
            # 요청 간 대기 (마지막 영화가 아닌 경우)
            if idx < len(all_movies):
                wait_time = random.uniform(args.sleep_min, args.sleep_max)
                print(f"  {wait_time:.1f}초 대기...")
                time.sleep(wait_time)
        
        # 3단계: MySQL 데이터베이스에 저장
        print(f"\n=== MySQL 데이터베이스 저장 시작 ===")
        inserted_count, db_duplicate_count = insert_movies_to_db(db_connection, all_movies)
        
        # 최종 통계 조회
        final_stats = get_db_stats(db_connection)
        
        # 결과 출력
        print(f"\n=== 수집 완료 ===")
        print(f"처리한 페이지: {args.pages}페이지")
        print(f"크롤링한 영화: {len(all_movies)}개")
        print(f"상세 파싱 성공: {success_count}개")
        print(f"DB 저장 결과:")
        print(f"  - 새로 추가: {inserted_count}개")
        print(f"  - 중복 스킵: {db_duplicate_count}개")
        
        if final_stats:
            print(f"\nDB 전체 통계:")
            print(f"  - 전체 영화: {final_stats['total']}개")
            print(f"  - 전문가별점: {final_stats['expert_ratings']}개")
            print(f"  - 관객별점: {final_stats['audience_ratings']}개")
            print(f"  - 상영시간: {final_stats['runtimes']}개")
            print(f"  - 개봉일: {final_stats['release_dates']}개")
            print(f"  - 장르: {final_stats['genres']}개")
            print(f"  - 국가: {final_stats['countries']}개")
            print(f"  - 감독: {final_stats['directors']}개")
            print(f"  - 출연: {final_stats['casts']}개")
            print(f"  - 시놉시스: {final_stats['synopsis']}개")
            print(f"  - 전문가 상세: {final_stats['expert_details']}개")
            print(f"  - 관련기사: {final_stats['articles']}개")
            print(f"  - 관객 상세: {final_stats['audience_details']}개")
            
        print(f"\nMySQL 데이터베이스 '{MYSQL_CONFIG['database']}.{TABLE_NAME}' 테이블에 저장 완료")
        
        # CSV 저장도 원한다면 아래 주석 해제
        # df = pd.DataFrame(all_movies)
        # # 컬럼 순서 정리
        # columns_order = ["영화이름", "이미지URL", "영화ID", "전문가별점", "관객별점", "상영시간(분)", "개봉일", "장르", "국가", "감독", "출연"]
        # df = df[columns_order]
        # filename = f"cine21_movies_detail_p{args.pages}.csv"
        # df.to_csv(filename, index=False, encoding="utf-8-sig")
        # print(f"CSV 파일 '{filename}' 저장 완료")
        
    except Exception as e:
        print(f"실행 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # 드라이버 종료
        if driver:
            try:
                driver.quit()
                print("\n드라이버 종료 완료")
            except Exception as e:
                print(f"\n드라이버 종료 중 경고 (무시 가능): {e}")
                try:
                    driver.close()
                except:
                    pass
            finally:
                # 강제로 프로세스 정리
                try:
                    del driver
                except:
                    pass
        
        # MySQL 연결 종료
        if db_connection:
            try:
                if db_connection.is_connected():
                    db_connection.close()
                    print("MySQL 연결 종료 완료")
            except Exception as e:
                print(f"MySQL 연결 종료 중 경고: {e}")
if __name__ == "__main__":
    main()