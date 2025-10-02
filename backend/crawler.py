import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from bs4 import BeautifulSoup
from urllib.parse import urljoin, quote
import time
import re
from typing import Dict, List, Optional
from datetime import datetime



def setup_driver():
    """크롬 드라이버 설정"""
    try:
        print("\n🚗 ChromeDriver 초기화 중...")
        
        options = uc.ChromeOptions()
        options.add_argument('--headless=new')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--window-size=1920,1080')
        options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36')
        
        # Chrome 140 버전에 맞는 드라이버
        driver = uc.Chrome(
            options=options, 
            version_main=140,
            use_subprocess=True
        )
        
        driver.set_page_load_timeout(30)
        
        print("✅ ChromeDriver 초기화 완료 (Chrome v140)")
        return driver
        
    except Exception as e:
        print(f"❌ 드라이버 초기화 오류: {e}")
        return None

def clean_text(s):
    """텍스트 정리"""
    if not s:
        return None
    cleaned = re.sub(r'\s+', ' ', s.replace('\xa0', ' ').replace('\u200b', '')).strip()
    return cleaned if cleaned else None

def parse_release_date(date_text):
    """개봉일 텍스트를 YYYY-MM-DD 형식으로 변환"""
    if not date_text:
        return None
    
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
        
        return None
    except Exception:
        return None

def search_and_crawl_movie(movie_title: str) -> Optional[Dict]:
    """영화 제목으로 검색하고 첫 번째 결과 크롤링"""
    driver = None
    
    try:
        print(f"\n{'='*60}")
        print(f"크롤링 시작: '{movie_title}'")
        print(f"{'='*60}")
        
        driver = setup_driver()
        if not driver:
            print("❌ 드라이버 설정 실패")
            return None
        
        # 검색어 정제
        search_query = movie_title.strip()
        
        if len(search_query) < 2:
            print(f"❌ 검색어가 너무 짧습니다: '{search_query}'")
            return None
        
        # Cine21 검색 (URL 인코딩)
        encoded_query = quote(search_query)
        search_url = f"https://cine21.com/search/movie?query={encoded_query}"
        
        print(f"🔍 검색 URL: {search_url}")
        driver.get(search_url)
        
        # 페이지 로딩 대기
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
        except TimeoutException:
            print("⏱️ 페이지 로딩 타임아웃")
        
        time.sleep(3)
        
        # 검색 결과 파싱
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        # 디버깅: 페이지 제목 확인
        page_title = soup.select_one('title')
        if page_title:
            print(f"📄 페이지 제목: {page_title.get_text()}")
        
        # 여러 선택자로 영화 링크 찾기
        movie_links = []
        
        # 시도 1: 기본 선택자
        movie_links = soup.select('a[href*="/movie/info/"]')
        print(f"  시도 1 (기본): {len(movie_links)}개 발견")
        
        # 시도 2: 검색 결과 컨테이너
        if not movie_links:
            movie_links = soup.select('.search_result a[href*="/movie/"]')
            print(f"  시도 2 (검색 결과): {len(movie_links)}개 발견")
        
        # 시도 3: 영화 목록
        if not movie_links:
            movie_links = soup.select('.movie_list a[href*="/movie/"]')
            print(f"  시도 3 (영화 목록): {len(movie_links)}개 발견")
        
        # 시도 4: 모든 영화 관련 링크
        if not movie_links:
            all_links = soup.find_all('a', href=True)
            movie_links = [link for link in all_links if '/movie/' in link.get('href', '')]
            print(f"  시도 4 (전체 링크): {len(movie_links)}개 발견")
        
        if not movie_links:
            print(f"❌ '{search_query}' 검색 결과 없음")
            
            # 디버깅 정보 출력
            print("\n디버깅 정보:")
            print(f"  - 페이지 길이: {len(driver.page_source)} 문자")
            
            # 검색 결과 메시지 확인
            no_result = soup.select_one('.no_result, .empty, .search_empty')
            if no_result:
                print(f"  - 검색 결과 없음 메시지: {no_result.get_text()}")
            
            return None
        
        print(f"✅ 검색 결과 {len(movie_links)}개 발견")
        
        # 첫 번째 영화 선택
        first_link = movie_links[0].get('href')
        movie_url = urljoin("https://cine21.com", first_link)
        
        # 영화 제목 확인 (가능하면)
        first_movie_title = None
        title_elem = movie_links[0].select_one('.title, h3, h4, p.title')
        if title_elem:
            first_movie_title = clean_text(title_elem.get_text())
        
        if first_movie_title:
            print(f"🎬 선택된 영화: {first_movie_title}")
        
        print(f"🔗 영화 URL: {movie_url}")
        
        # 영화ID 추출
        movie_id_match = re.search(r'movie_id=(\d+)', movie_url)
        if not movie_id_match:
            print("❌ 영화 ID를 찾을 수 없습니다")
            return None
        
        movie_id = movie_id_match.group(1)
        print(f"🆔 영화 ID: {movie_id}")
        
        # 상세 페이지 이동
        print(f"\n상세 페이지 크롤링 중...")
        driver.get(movie_url)
        
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
        except TimeoutException:
            print("⏱️ 상세 페이지 로딩 타임아웃")
        
        time.sleep(3)
        
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        # 영화 정보 초기화
        movie_data = {
            '영화이름': None,
            '이미지URL': None,
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
        
        # 1. 제목 - 검색 결과에서 가져온 제목 우선 사용
        if first_movie_title:
            movie_data['영화이름'] = first_movie_title
            print(f"  ✓ 제목: {movie_data['영화이름']}")
        else:
            # 대체: 페이지에서 찾기
            title_elem = soup.select_one('section.sect_movie_detail h1, div.movie_detail h1, main h1.movie_title')
            if title_elem:
                movie_data['영화이름'] = clean_text(title_elem.get_text())
                print(f"  ✓ 제목 (페이지): {movie_data['영화이름']}")
            else:
                page_title = soup.select_one('title')
                if page_title:
                    title_text = page_title.get_text()
                    if '<' in title_text:
                        movie_data['영화이름'] = clean_text(title_text.split('<')[0])
                        print(f"  ✓ 제목 (title태그): {movie_data['영화이름']}")
        
        # 2. 포스터 이미지
        poster_elem = soup.select_one('img.poster, .movie_poster img, .poster_wrap img')
        if poster_elem:
            img_url = poster_elem.get('src') or poster_elem.get('data-src')
            if img_url and 'noimg' not in img_url:
                movie_data['이미지URL'] = urljoin("https://cine21.com", img_url)
                print(f"  ✓ 포스터: {movie_data['이미지URL'][:50]}...")
        
        # 3. 별점
        star_box = soup.select_one('div.movie_detail_star_box_wrap, .star_box')
        if star_box:
            # 전문가 별점
            expert_div = star_box.select_one('div.star_cine21, .star_expert')
            if expert_div:
                expert_num = expert_div.select_one('p.num, .rating_num')
                if expert_num:
                    expert_text = expert_num.get_text(strip=True)
                    expert_match = re.search(r'(\d+(?:\.\d+)?)', expert_text)
                    if expert_match:
                        movie_data['전문가별점'] = float(expert_match.group(1))
                        print(f"  ✓ 전문가별점: {movie_data['전문가별점']}")
            
            # 관객 별점
            netizen_div = star_box.select_one('div.star_netizen, .star_audience')
            if netizen_div:
                netizen_num = netizen_div.select_one('p.num, .rating_num')
                if netizen_num:
                    netizen_text = netizen_num.get_text(strip=True)
                    netizen_match = re.search(r'(\d+(?:\.\d+)?)', netizen_text)
                    if netizen_match:
                        movie_data['관객별점'] = float(netizen_match.group(1))
                        print(f"  ✓ 관객별점: {movie_data['관객별점']}")
        
        # 4. 기본 정보
        info_list = soup.select_one('ul.info_list, .movie_info')
        if info_list:
            list_items = info_list.select('li')
            for li in list_items:
                title_elem = li.select_one('p.title, .info_title')
                if not title_elem:
                    continue
                
                title_text = title_elem.get_text(strip=True)
                li_text = li.get_text()
                content = li_text.replace(title_text, '', 1).strip()
                content = clean_text(content)
                
                if title_text == '개봉':
                    movie_data['개봉일'] = parse_release_date(content)
                    if movie_data['개봉일']:
                        print(f"  ✓ 개봉일: {movie_data['개봉일']}")
                elif title_text == '시간':
                    runtime_match = re.search(r'(\d{1,3})\s*분', content)
                    if runtime_match:
                        movie_data['상영시간(분)'] = int(runtime_match.group(1))
                        print(f"  ✓ 상영시간: {movie_data['상영시간(분)']}분")
                elif title_text == '장르':
                    movie_data['장르'] = content
                    print(f"  ✓ 장르: {movie_data['장르']}")
                elif title_text == '국가':
                    movie_data['국가'] = content
                    print(f"  ✓ 국가: {movie_data['국가']}")
                elif title_text == '감독':
                    movie_data['감독'] = content
                    print(f"  ✓ 감독: {movie_data['감독']}")
                elif title_text == '출연':
                    movie_data['출연'] = content
                    print(f"  ✓ 출연: {movie_data['출연'][:50]}...")
        
        # 5. 시놉시스 (XPath 사용)
        try:
            synopsis_xpath = '/html/body/div[4]/main/div/div/div/div/section[1]/div/div'
            synopsis_elem = driver.find_element(By.XPATH, synopsis_xpath)
            synopsis_text = synopsis_elem.text.strip()
            if synopsis_text:
                movie_data['시놉시스'] = synopsis_text
                print(f"  ✓ 시놉시스: {synopsis_text[:50]}...")
        except NoSuchElementException:
            # XPath 실패시 CSS 선택자로 시도
            synopsis_elem = soup.select_one('.synopsis, .movie_synopsis, .story')
            if synopsis_elem:
                movie_data['시놉시스'] = clean_text(synopsis_elem.get_text())
                print(f"  ✓ 시놉시스 (CSS): {movie_data['시놉시스'][:50]}...")
        except Exception as e:
            print(f"  ⚠️ 시놉시스 추출 실패: {e}")
        
        # 6. 전문가 리뷰 (최대 5개)
        try:
            expert_names = []
            expert_ratings = []
            expert_contents = []
            
            expert_base_xpath = '/html/body/div[4]/main/div/div/div/div/section[4]/ul/li'
            expert_elements = driver.find_elements(By.XPATH, expert_base_xpath)
            
            for i, li_elem in enumerate(expert_elements[:5], 1):
                try:
                    name_xpath = f'{expert_base_xpath}[{i}]/div[1]/p'
                    name = driver.find_element(By.XPATH, name_xpath).text.strip()
                    
                    rating_xpath = f'{expert_base_xpath}[{i}]/div[1]/div/p'
                    rating = driver.find_element(By.XPATH, rating_xpath).text.strip()
                    
                    content_xpath = f'{expert_base_xpath}[{i}]/div[2]'
                    content = driver.find_element(By.XPATH, content_xpath).text.strip()
                    
                    if name:
                        expert_names.append(name)
                        expert_ratings.append(rating)
                        expert_contents.append(content[:500])  # 최대 500자
                except:
                    continue
            
            if expert_names:
                movie_data['전문가이름'] = ' | '.join(expert_names)
                movie_data['전문가별점상세'] = ' | '.join(expert_ratings)
                movie_data['전문가내용'] = ' | '.join(expert_contents)
                print(f"  ✓ 전문가 리뷰: {len(expert_names)}개")
        except Exception as e:
            print(f"  ⚠️ 전문가 리뷰 추출 실패: {e}")
        
        # 7. 관련 기사 (최대 2개)
        try:
            article_xpath_1 = '/html/body/div[4]/main/div/div/div/div/section[5]/ul/li[1]/a'
            article_xpath_2 = '/html/body/div[4]/main/div/div/div/div/section[5]/ul/li[2]/a'
            
            try:
                article1_elem = driver.find_element(By.XPATH, article_xpath_1)
                article1_text = article1_elem.text.strip()
                article1_href = article1_elem.get_attribute('href')
                if article1_text and article1_href:
                    movie_data['관련기사1'] = f"{article1_text} | {article1_href}"
                    print(f"  ✓ 관련기사1: {article1_text[:30]}...")
            except:
                pass
            
            try:
                article2_elem = driver.find_element(By.XPATH, article_xpath_2)
                article2_text = article2_elem.text.strip()
                article2_href = article2_elem.get_attribute('href')
                if article2_text and article2_href:
                    movie_data['관련기사2'] = f"{article2_text} | {article2_href}"
                    print(f"  ✓ 관련기사2: {article2_text[:30]}...")
            except:
                pass
        except Exception as e:
            print(f"  ⚠️ 관련기사 추출 실패: {e}")
        
        print(f"\n{'='*60}")
        print(f"✅ 크롤링 완료: {movie_data['영화이름']} (ID: {movie_id})")
        print(f"{'='*60}\n")
        
        return movie_data
        
    except Exception as e:
        print(f"\n❌ 크롤링 오류: {e}")
        import traceback
        traceback.print_exc()
        return None
        
    finally:
        if driver:
            try:
                driver.quit()
                print("🔧 드라이버 종료")
            except:
                pass


def search_movies_on_cine21(query: str) -> list:
    """Cine21에서 영화 검색하여 결과 목록 반환"""
    driver = None
    
    try:
        print(f"\n{'='*60}")
        print(f"영화 검색: '{query}'")
        print(f"{'='*60}")
        
        driver = setup_driver()
        if not driver:
            print("❌ 드라이버 설정 실패")
            return []
        
        # 검색어 정제
        search_query = query.strip()
        
        if len(search_query) < 2:
            print(f"❌ 검색어가 너무 짧습니다: '{search_query}'")
            return []
        
        # Cine21 검색
        encoded_query = quote(search_query)
        search_url = f"https://cine21.com/search/movie/?query={encoded_query}"
        
        print(f"🔍 검색 URL: {search_url}")
        driver.get(search_url)
        
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
        except TimeoutException:
            print("⏱️ 페이지 로딩 타임아웃")
        
        time.sleep(3)
        
        # 검색 결과 파싱 - sql_0929_final.py의 collect_movie_list 로직 참고
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        print(f"📄 페이지 타이틀: {soup.title.string if soup.title else 'None'}")
        
        # 검색 결과 컨테이너 찾기
        # 검색 페이지는 list_with_leftthumb 사용
        container = soup.select_one('.list_with_leftthumb')
        
        if not container:
            # 대체: 일반 목록 페이지
            container = soup.select_one('#point_list_holder')
        
        if not container:
            print(f"❌ '{search_query}' 검색 결과 컨테이너를 찾을 수 없음")
            return []
        
        # 영화 카드 찾기
        # 검색 페이지는 list_with_leftthumb_item 사용
        cards = container.select('div.list_with_leftthumb_item')
        
        if not cards:
            # 대체: 일반 목록 페이지 셀렉터
            cards = container.select('div.list_with_upthumb_item')
        
        if not cards:
            print(f"❌ '{search_query}' 검색 결과 없음")
            return []
        
        print(f"✅ 검색 결과 {len(cards)}개 발견")
        
        # 영화 정보 수집
        results = []
        seen_ids = set()

        for idx, card in enumerate(cards[:20], 1):  # 최대 20개
            try:
                # 제목 추출 - sql_0929_final.py와 동일한 방식
                title_elem = card.select_one('p.title')
                title = title_elem.get_text(strip=True) if title_elem else None
                title = clean_text(title)
                
                if not title:
                    print(f"  ⚠️ 항목 {idx}: 제목 없음 - 스킵")
                    continue
                
                # 이미지 URL 추출
                img_elem = card.select_one('div.img_wrap img')
                poster_url = None
                if img_elem:
                    poster_url = img_elem.get('src') or img_elem.get('data-src')
                    if poster_url and not poster_url.startswith('http'):
                        poster_url = urljoin("https://cine21.com", poster_url)
                    # noimg 패턴 체크
                    if poster_url and 'noimg' in poster_url:
                        poster_url = None
                
                # 상세 URL 추출
                link_elem = card.select_one('a[href*="/movie/info/"]')
                detail_url = None
                movie_id = None
                
                if link_elem:
                    href = link_elem.get('href')
                    if href:
                        detail_url = urljoin("https://cine21.com", href) if not href.startswith('http') else href
                        # movie_id 추출
                        movie_id_match = re.search(r'movie_id=(\d+)', detail_url)
                        if movie_id_match:
                            movie_id = movie_id_match.group(1)
                
                # 영화ID 필수 체크
                if not movie_id:
                    print(f"  ⚠️ 항목 {idx}: 영화ID 없음 (제목={title}) - 스킵")
                    continue
                
                # 중복 제거
                if movie_id in seen_ids:
                    continue
                seen_ids.add(movie_id)
                
                # 결과 추가
                movie_info = {
                    'movie_id': movie_id,
                    'title': title,
                    'poster_url': poster_url,
                    'detail_url': detail_url
                }
                
                results.append(movie_info)
                
                print(f"  ✓ {idx}. [{movie_id}] {title}")
                
            except Exception as e:
                print(f"  ❌ 항목 {idx} 처리 중 오류: {e}")
                continue
        
        print(f"\n{'='*60}")
        print(f"✅ 총 {len(results)}개의 영화 정보 수집 완료")
        print(f"{'='*60}\n")
        
        return results
        
    except Exception as e:
        print(f"\n❌ 검색 오류: {e}")
        import traceback
        traceback.print_exc()
        return []
        
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass

def crawl_movie_by_id_direct(movie_id: str) -> Optional[Dict]:
    """영화 ID로 직접 크롤링 (검색 과정 생략)"""
    driver = None
    
    try:
        print(f"\n{'='*60}")
        print(f"영화 크롤링: ID {movie_id}")
        print(f"{'='*60}")
        
        driver = setup_driver()
        if not driver:
            print("❌ 드라이버 설정 실패")
            return None
        
        # 영화 상세 페이지로 직접 이동
        movie_url = f"https://cine21.com/movie/info?movie_id={movie_id}"
        
        print(f"🔗 영화 URL: {movie_url}")
        driver.get(movie_url)
        
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
        except TimeoutException:
            print("⏱️ 페이지 로딩 타임아웃")
        
        time.sleep(3)
        
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        # 영화 정보 초기화
        movie_data = {
            '영화이름': None,
            '이미지URL': None,
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
        
        # 1. 제목 - 페이지 title 태그에서 추출
        page_title = soup.select_one('title')
        if page_title:
            title_text = page_title.get_text()
            if '<' in title_text:
                movie_data['영화이름'] = clean_text(title_text.split('<')[0])
            else:
                movie_data['영화이름'] = clean_text(title_text)
            
            if movie_data['영화이름']:
                print(f"  ✓ 제목: {movie_data['영화이름']}")
        
        # 제목을 못 찾은 경우 HTML에서 시도
        if not movie_data['영화이름']:
            title_elem = soup.select_one('section.sect_movie_detail h1, div.movie_detail h1, main h1.movie_title')
            if title_elem:
                movie_data['영화이름'] = clean_text(title_elem.get_text())
                print(f"  ✓ 제목 (HTML): {movie_data['영화이름']}")
        
        
        
        # 2. 포스터 이미지 추출
        try:
            # 방법 1: 포스터 영역에서 찾기
            poster_elem = soup.select_one('div.poster img, .movie_poster img, .poster_wrap img')
            if poster_elem:
                poster_url = poster_elem.get('src') or poster_elem.get('data-src')
                if poster_url:
                    if not poster_url.startswith('http'):
                        poster_url = urljoin("https://cine21.com", poster_url)
                    # noimg 체크
                    if 'noimg' not in poster_url.lower():
                        movie_data['이미지URL'] = poster_url
                        print(f"  ✓ 포스터: {poster_url[:60]}...")
            
            # 방법 2: 메타 og:image
            if not movie_data['이미지URL']:
                meta_img = soup.select_one('meta[property="og:image"]')
                if meta_img:
                    poster_url = meta_img.get('content')
                    if poster_url and 'noimg' not in poster_url.lower():
                        movie_data['이미지URL'] = poster_url
                        print(f"  ✓ 포스터 (og:image): {poster_url[:60]}...")
                        
        except Exception as e:
            print(f"  ⚠️ 포스터 추출 오류: {e}")
        
        # 3. 별점
        star_box = soup.select_one('div.movie_detail_star_box_wrap, .star_box')
        if star_box:
            # 전문가 별점
            expert_div = star_box.select_one('div.star_cine21, .star_expert')
            if expert_div:
                expert_num = expert_div.select_one('p.num, .rating_num')
                if expert_num:
                    expert_text = expert_num.get_text(strip=True)
                    expert_match = re.search(r'(\d+(?:\.\d+)?)', expert_text)
                    if expert_match:
                        movie_data['전문가별점'] = float(expert_match.group(1))
                        print(f"  ✓ 전문가별점: {movie_data['전문가별점']}")
            
            # 관객 별점
            netizen_div = star_box.select_one('div.star_netizen, .star_audience')
            if netizen_div:
                netizen_num = netizen_div.select_one('p.num, .rating_num')
                if netizen_num:
                    netizen_text = netizen_num.get_text(strip=True)
                    netizen_match = re.search(r'(\d+(?:\.\d+)?)', netizen_text)
                    if netizen_match:
                        movie_data['관객별점'] = float(netizen_match.group(1))
                        print(f"  ✓ 관객별점: {movie_data['관객별점']}")
        
        # 4. 기본 정보 (이하 동일 - 위 코드와 같음)
        info_list = soup.select_one('ul.info_list, .movie_info')
        if info_list:
            list_items = info_list.select('li')
            for li in list_items:
                title_elem = li.select_one('p.title, .info_title')
                if not title_elem:
                    continue
                
                title_text = title_elem.get_text(strip=True)
                li_text = li.get_text()
                content = li_text.replace(title_text, '', 1).strip()
                content = clean_text(content)
                
                if title_text == '개봉':
                    movie_data['개봉일'] = parse_release_date(content)
                    if movie_data['개봉일']:
                        print(f"  ✓ 개봉일: {movie_data['개봉일']}")
                elif title_text == '시간':
                    runtime_match = re.search(r'(\d{1,3})\s*분', content)
                    if runtime_match:
                        movie_data['상영시간(분)'] = int(runtime_match.group(1))
                        print(f"  ✓ 상영시간: {movie_data['상영시간(분)']}분")
                elif title_text == '장르':
                    movie_data['장르'] = content
                    print(f"  ✓ 장르: {movie_data['장르']}")
                elif title_text == '국가':
                    movie_data['국가'] = content
                    print(f"  ✓ 국가: {movie_data['국가']}")
                elif title_text == '감독':
                    movie_data['감독'] = content
                    print(f"  ✓ 감독: {movie_data['감독']}")
                elif title_text == '출연':
                    movie_data['출연'] = content
                    print(f"  ✓ 출연: {movie_data['출연'][:50]}...")
        
        # 5. 시놉시스
        try:
            synopsis_xpath = '/html/body/div[4]/main/div/div/div/div/section[1]/div/div'
            synopsis_elem = driver.find_element(By.XPATH, synopsis_xpath)
            synopsis_text = synopsis_elem.text.strip()
            if synopsis_text:
                movie_data['시놉시스'] = synopsis_text
                print(f"  ✓ 시놉시스: {synopsis_text[:50]}...")
        except:
            synopsis_elem = soup.select_one('.synopsis, .movie_synopsis, .story')
            if synopsis_elem:
                movie_data['시놉시스'] = clean_text(synopsis_elem.get_text())
        
        # 6. 전문가 리뷰
        try:
            expert_names = []
            expert_ratings = []
            expert_contents = []
            
            expert_base_xpath = '/html/body/div[4]/main/div/div/div/div/section[4]/ul/li'
            expert_elements = driver.find_elements(By.XPATH, expert_base_xpath)
            
            for i, li_elem in enumerate(expert_elements[:5], 1):
                try:
                    name_xpath = f'{expert_base_xpath}[{i}]/div[1]/p'
                    name = driver.find_element(By.XPATH, name_xpath).text.strip()
                    
                    rating_xpath = f'{expert_base_xpath}[{i}]/div[1]/div/p'
                    rating = driver.find_element(By.XPATH, rating_xpath).text.strip()
                    
                    content_xpath = f'{expert_base_xpath}[{i}]/div[2]'
                    content = driver.find_element(By.XPATH, content_xpath).text.strip()
                    
                    if name:
                        expert_names.append(name)
                        expert_ratings.append(rating)
                        expert_contents.append(content[:500])
                except:
                    continue
            
            if expert_names:
                movie_data['전문가이름'] = ' | '.join(expert_names)
                movie_data['전문가별점상세'] = ' | '.join(expert_ratings)
                movie_data['전문가내용'] = ' | '.join(expert_contents)
                print(f"  ✓ 전문가 리뷰: {len(expert_names)}개")
        except:
            pass
        
        print(f"\n{'='*60}")
        print(f"✅ 크롤링 완료: {movie_data['영화이름']} (ID: {movie_id})")
        print(f"{'='*60}\n")
        
        return movie_data
        
    except Exception as e:
        print(f"\n❌ 크롤링 오류: {e}")
        import traceback
        traceback.print_exc()
        return None
        
    finally:
        if driver:
            try:
                driver.quit()
                print("🔧 드라이버 종료")
            except:
                pass