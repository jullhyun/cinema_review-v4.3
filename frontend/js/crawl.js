// ==================== crawl.js - 크롤링 기능 ====================
// frontend/js/crawl.js

/**
 * 검색 결과 없을 때 크롤링
 */
// crawl.js 수정
async function crawlMovieFromSearch(query) {
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery) {
        UIUtils.showToast('검색어를 입력해주세요.', 'error');
        return;
    }
    
    if (trimmedQuery.length < 2) {
        UIUtils.showToast('검색어는 최소 2글자 이상이어야 합니다.', 'error');
        return;
    }
    
    // 로딩 표시
    const loadingToast = UIUtils.showToast('🔍 영화를 검색하는 중...', 'info', 30000);
    
    try {
        // 1단계: 영화 검색 (기존 app.js 방식 사용)
        const searchResult = await API.searchMoviesForCrawl(trimmedQuery);
        
        // 로딩 토스트 제거
        if (loadingToast && loadingToast.parentNode) {
            loadingToast.parentNode.removeChild(loadingToast);
        }
        
        if (!searchResult.results || searchResult.results.length === 0) {
            UIUtils.showToast(`'${trimmedQuery}' 검색 결과가 없습니다.`, 'error');
            return;
        }
        
        // 2단계: 검색 결과 선택 모달 표시 (기존 방식)
        showMovieSelectionModal(searchResult.results, trimmedQuery);
        
    } catch (error) {
        if (loadingToast && loadingToast.parentNode) {
            loadingToast.parentNode.removeChild(loadingToast);
        }
        
        console.error('영화 검색 실패:', error);
        UIUtils.showToast('영화 검색에 실패했습니다.', 'error');
    }
}


/**
 * 크롤링 성공 후 자동 검색
 */
function showCrawlSuccessAndRedirect(movieTitle, searchQuery) {
    const mainContent = document.getElementById('main-content');
    
    mainContent.innerHTML = `
        <div class="crawl-success-container">
            <div class="success-animation">
                <div class="success-checkmark">✓</div>
            </div>
            <h2>크롤링 완료!</h2>
            <p class="success-movie-title">"${movieTitle}" 정보를 가져왔습니다</p>
            <p class="redirect-message">잠시 후 검색 결과를 표시합니다...</p>
        </div>
    `;
    
    // 3초 후 자동으로 검색 실행
    setTimeout(async () => {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = searchQuery;
        }
        
        // 검색 실행
        try {
            const movies = await API.getMovies(searchQuery);
            await ComponentRenderer.renderSearchResults(movies, searchQuery);
        } catch (error) {
            console.error('검색 실패:', error);
            UIUtils.showToast('영화를 찾을 수 없습니다', 'error');
            showHome();
        }
    }, 3000);
}


/**
 * 커스텀 입력으로 크롤링
 */
async function crawlMovieFromInput() {
    const input = document.getElementById('custom-crawl-input');
    const title = input.value.trim();
    
    if (!title) {
        UIUtils.showToast('영화 제목을 입력해주세요', 'warning');
        input.focus();
        return;
    }
    
    await crawlMovieFromSearch(title);
}


/**
 * 크롤링 진행 UI
 */
function showCrawlingUI(title) {
    const mainContent = document.getElementById('main-content');
    
    mainContent.innerHTML = `
        <div class="crawling-container">
            <div class="crawling-box">
                <div class="crawling-spinner"></div>
                <h2>"${title}" 크롤링 중...</h2>
                
                <div class="crawling-steps">
                    <div class="crawl-step active" data-step="1">
                        <div class="step-icon">🔍</div>
                        <div class="step-text">Cine21 검색 중</div>
                    </div>
                    <div class="crawl-step" data-step="2">
                        <div class="step-icon">📥</div>
                        <div class="step-text">영화 정보 수집 중</div>
                    </div>
                    <div class="crawl-step" data-step="3">
                        <div class="step-icon">💾</div>
                        <div class="step-text">데이터베이스 저장 중</div>
                    </div>
                </div>
                
                <p class="crawling-hint">
                    최대 30초 소요됩니다. 잠시만 기다려주세요...
                </p>
            </div>
        </div>
    `;
    
    // 단계별 애니메이션
    animateCrawlSteps();
}


/**
 * 크롤링 단계 애니메이션
 */
function animateCrawlSteps() {
    let currentStep = 1;
    
    const interval = setInterval(() => {
        currentStep++;
        if (currentStep <= 3) {
            const step = document.querySelector(`[data-step="${currentStep}"]`);
            if (step) step.classList.add('active');
        } else {
            clearInterval(interval);
        }
    }, 3000);
}


/**
 * 크롤링 실패 UI
 */
function showCrawlError(title, errorMessage) {
    const mainContent = document.getElementById('main-content');
    
    mainContent.innerHTML = `
        <div class="crawl-error-container">
            <div class="crawl-error-box">
                <div class="error-icon">😢</div>
                <h2>크롤링 실패</h2>
                <p class="error-title">"${title}" 영화를 찾을 수 없습니다</p>
                
                <div class="error-details">
                    <p>${errorMessage || '크롤링 중 오류가 발생했습니다.'}</p>
                </div>
                
                <div class="error-tips">
                    <h4>💡 확인사항</h4>
                    <ul>
                        <li>영화 제목이 정확한가요?</li>
                        <li>띄어쓰기를 확인해주세요</li>
                        <li>Cine21에 등록된 영화인가요?</li>
                        <li>개봉 예정 영화는 크롤링이 안될 수 있습니다</li>
                    </ul>
                </div>
                
                <div class="error-actions">
                    <button class="btn btn-primary" onclick="retrySearchWithQuery('${title}')">
                        <i class="fas fa-search"></i> 다시 검색
                    </button>
                    <button class="btn btn-secondary" onclick="showHome()">
                        <i class="fas fa-home"></i> 홈으로
                    </button>
                </div>
            </div>
        </div>
    `;
}


/**
 * 검색어로 다시 검색
 */
async function retrySearchWithQuery(query) {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = query;
    }
    await performSearch();
}


// ==================== CSS 스타일 ====================

const crawlStyles = `
<style>
/* 크롤링 성공 화면 */
.crawl-success-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 500px;
    padding: 40px 20px;
    text-align: center;
}

.success-animation {
    margin-bottom: 30px;
}

.success-checkmark {
    width: 100px;
    height: 100px;
    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 60px;
    color: white;
    animation: scaleIn 0.5s ease-out;
    box-shadow: 0 10px 40px rgba(67, 233, 123, 0.4);
}

.crawl-success-container h2 {
    color: #43e97b;
    margin-bottom: 15px;
    font-size: 32px;
}

.success-movie-title {
    font-size: 20px;
    color: #333;
    margin-bottom: 20px;
    font-weight: 600;
}

.redirect-message {
    color: #999;
    font-size: 16px;
}

/* 크롤링 옵션 박스 (검색 결과 하단) */
.crawl-option-box {
    margin-top: 40px;
    padding: 30px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
}

.crawl-option-content {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
    justify-content: center;
}

.crawl-option-icon {
    font-size: 50px;
}

.crawl-option-text {
    flex: 1;
    min-width: 200px;
    color: white;
}

.crawl-option-text h4 {
    margin: 0 0 5px 0;
    font-size: 20px;
}

.crawl-option-text p {
    margin: 0;
    opacity: 0.9;
}

.crawl-input {
    flex: 2;
    min-width: 250px;
    padding: 12px 20px;
    border: none;
    border-radius: 25px;
    font-size: 16px;
    outline: none;
}

.crawl-option-btn {
    padding: 12px 30px;
    font-size: 16px;
    background: white;
    color: #667eea;
    border: none;
    border-radius: 25px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}

.crawl-option-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.3);
}

/* 검색 결과 없을 때 크롤링 버튼 */
.crawl-btn {
    padding: 15px 40px !important;
    font-size: 18px !important;
    margin-top: 10px;
}

/* 크롤링 진행 중 */
.crawling-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 500px;
    padding: 40px 20px;
}

.crawling-box {
    text-align: center;
    max-width: 600px;
}

.crawling-spinner {
    width: 80px;
    height: 80px;
    border: 8px solid #f3f3f3;
    border-top: 8px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 30px;
}

.crawling-box h2 {
    color: #333;
    margin-bottom: 40px;
}

.crawling-steps {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-bottom: 30px;
}

.crawl-step {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 12px;
    opacity: 0.3;
    transition: all 0.5s ease;
}

.crawl-step.active {
    opacity: 1;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    transform: translateX(10px);
}

.step-icon {
    font-size: 30px;
}

.step-text {
    font-size: 18px;
    font-weight: 500;
}

.crawling-hint {
    color: #999;
    font-size: 14px;
}

/* 크롤링 실패 */
.crawl-error-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 500px;
    padding: 40px 20px;
}

.crawl-error-box {
    text-align: center;
    max-width: 600px;
}

.error-icon {
    font-size: 100px;
    margin-bottom: 20px;
}

.crawl-error-box h2 {
    color: #dc3545;
    margin-bottom: 15px;
}

.error-title {
    font-size: 18px;
    color: #666;
    margin-bottom: 20px;
}

.error-details {
    background: #fff3cd;
    padding: 15px;
    border-radius: 10px;
    margin-bottom: 30px;
    border-left: 4px solid #ffc107;
}

.error-tips {
    background: #f8f9fa;
    padding: 25px;
    border-radius: 12px;
    margin-bottom: 30px;
    text-align: left;
}

.error-tips h4 {
    margin-bottom: 15px;
    color: #333;
}

.error-tips ul {
    list-style: none;
    padding: 0;
}

.error-tips li {
    padding: 10px 0;
    padding-left: 30px;
    position: relative;
    color: #666;
}

.error-tips li::before {
    content: '✓';
    position: absolute;
    left: 0;
    color: #667eea;
    font-weight: bold;
    font-size: 18px;
}

.error-actions {
    display: flex;
    gap: 15px;
    justify-content: center;
}

/* 반응형 */
@media (max-width: 768px) {
    .crawl-option-content {
        flex-direction: column;
    }
    
    .crawl-option-text {
        text-align: center;
    }
    
    .crawl-input {
        width: 100%;
    }
    
    .crawl-option-btn {
        width: 100%;
    }
    
    .error-actions {
        flex-direction: column;
        width: 100%;
    }
    
    .error-actions button {
        width: 100%;
    }
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>
`;

// 페이지 로드 시 스타일 추가
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        document.head.insertAdjacentHTML('beforeend', crawlStyles);
    });
} else {
    document.head.insertAdjacentHTML('beforeend', crawlStyles);
}