// 전역 상태 관리
let currentView = 'home';
let currentMovie = null;
let currentSearchQuery = '';
let currentSearchResults = [];
let currentEditingReview = null;
let currentReviewPage = 1;
let currentStarRating = 0;
let currentTab = 'weekly';
let allMoviesCurrentPage = 1;
let allMoviesSort = 'latest';
const API_BASE = 'http://localhost:8000';

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    await ComponentRenderer.renderUserAuth();
    
    // URL 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('movie');
    
    if (movieId) {
        await showMovieDetail(movieId);
    } else {
        // ⭐ 금주 영화 로드
        try {
            const weeklyRanking = document.getElementById('weekly-ranking');
            const movies = await dataManager.getWeeklyRanking();
            weeklyRanking.innerHTML = movies.map(movie => UIUtils.renderMovieCard(movie, true)).join('');
        } catch (error) {
            console.error('금주 영화 로드 실패:', error);
        }
    }
}

function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }

    // ⭐ 탭 이벤트 리스너
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;
            switchTab(tab);
        });
    });

    // ⭐ 정렬 버튼 이벤트 리스너
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            allMoviesSort = e.currentTarget.dataset.sort;
            allMoviesCurrentPage = 1;
            loadAllMovies();
        });
    });

    document.addEventListener('click', function(e) {
        const historyDropdown = document.getElementById('search-history-dropdown');
        const historyBtn = document.querySelector('.search-history-btn');
        
        if (historyDropdown && !historyDropdown.contains(e.target) && !historyBtn?.contains(e.target)) {
            historyDropdown.style.display = 'none';
        }
    });
}

// ==================== 네비게이션 ====================

async function showHome() {
    currentView = 'home';
    currentMovie = null;
    currentSearchQuery = '';
    currentSearchResults = [];
    window.currentEditingReview = null;
    
    // main-content를 탭 구조로 다시 그리기
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <!-- 탭 버튼 -->
        <div class="content-tabs">
            <button class="tab-btn active" data-tab="weekly">
                <i class="fas fa-trophy"></i> 금주의 영화
            </button>
            <button class="tab-btn" data-tab="all">
                <i class="fas fa-film"></i> 전체 영화
            </button>
        </div>

        <!-- 금주의 영화 섹션 -->
        <div id="weekly-section" class="tab-content active">
            <div class="ranking-grid" id="weekly-ranking">
                <!-- 동적 생성 -->
            </div>
        </div>

        <!-- 전체 영화 섹션 -->
        <div id="all-section" class="tab-content" style="display: none;">
            <!-- 정렬 옵션 -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <p id="all-movies-count" class="text-muted">총 0개 영화</p>
                </div>
                
                <div class="sort-options">
                    <button class="sort-btn active" data-sort="latest">
                        <i class="fas fa-clock"></i> 최신순
                    </button>
                    <button class="sort-btn" data-sort="rating">
                        <i class="fas fa-star"></i> 평점순
                    </button>
                    <button class="sort-btn" data-sort="title">
                        <i class="fas fa-font"></i> 가나다순
                    </button>
                </div>
            </div>

            <!-- 영화 그리드 -->
            <div class="ranking-grid" id="all-movies-grid">
                <!-- 동적 생성 -->
            </div>

            <!-- 로딩 -->
            <div id="all-loading" style="display: none; text-align: center; padding: 3rem;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--accent-color);"></i>
                <p class="text-muted" style="margin-top: 1rem;">영화 목록을 불러오는 중...</p>
            </div>

            <!-- 페이지네이션 -->
            <div id="all-pagination" style="margin-top: 3rem; display: flex; justify-content: center; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <!-- 동적 생성 -->
            </div>
        </div>
    `;
    
    // 탭 이벤트 리스너 다시 등록
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;
            switchTab(tab);
        });
    });
    
    // 정렬 버튼 이벤트 리스너 다시 등록
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            allMoviesSort = e.currentTarget.dataset.sort;
            allMoviesCurrentPage = 1;
            loadAllMovies();
        });
    });
    
    // 금주 영화 로드
    const weeklyRanking = document.getElementById('weekly-ranking');
    try {
        const movies = await dataManager.getWeeklyRanking();
        weeklyRanking.innerHTML = movies.map(movie => UIUtils.renderMovieCard(movie, true)).join('');
    } catch (error) {
        weeklyRanking.innerHTML = '<p class="text-center text-muted">영화를 불러오는데 실패했습니다.</p>';
        UIUtils.showToast('데이터 로딩에 실패했습니다.', 'error');
    }
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    
    UIUtils.applyTheme('default');
}

async function showSearchResults(query) {
    currentView = 'search-results';
    currentSearchQuery = query;
    window.currentEditingReview = null;
    
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '<div class="text-center"><p>검색 중...</p></div>';
    
    try {
        const movies = await dataManager.searchMovies(query);
        currentSearchResults = movies;
        
        await ComponentRenderer.renderSearchResults(movies, query);
        
        if (movies.length > 0) {
            const avgRating = movies.reduce((sum, movie) => sum + movie.rating, 0) / movies.length;
            const theme = dataManager.getThemeByRating(avgRating);
            UIUtils.applyTheme(theme);
        }
    } catch (error) {
        mainContent.innerHTML = '<div class="text-center"><p>검색에 실패했습니다.</p></div>';
    }
}

async function showMovieDetail(movieId) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '<div class="text-center"><p>로딩 중...</p></div>';
    
    try {
        const movie = await dataManager.getMovieById(movieId);
        
        if (!movie) {
            UIUtils.showToast('영화를 찾을 수 없습니다.', 'error');
            return;
        }
        
        currentView = 'movie-detail';
        currentMovie = movie;
        window.currentEditingReview = null;
        window.currentReviewPage = 1;
        
        await ComponentRenderer.renderMovieDetail(movie);
        
        const theme = dataManager.getThemeByRating(movie.rating);
        UIUtils.applyTheme(theme);

        // 마이페이지에서 온 경우 자동으로 해당 리뷰 편집
        const autoEditReviewId = sessionStorage.getItem('auto_edit_review');
        if (autoEditReviewId) {
            sessionStorage.removeItem('auto_edit_review');
            setTimeout(() => {
                editReview(autoEditReviewId);
            }, 500);
        }
    
        
    } catch (error) {
        mainContent.innerHTML = '<div class="text-center"><p>영화 정보를 불러오는데 실패했습니다.</p></div>';
        UIUtils.showToast('영화 정보 로딩 실패', 'error');
    }
}

function goBack() {
    if (currentSearchResults.length > 0) {
        showSearchResults(currentSearchQuery);
    } else {
        // 홈으로 돌아가기
        showHome();  // ⬅️ 이렇게 변경!
    }
}

// ==================== 검색 ====================

async function performSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    const query = searchInput.value.trim();
    if (!query) return;
    
    await dataManager.addSearchHistory(query);
    await ComponentRenderer.renderUserAuth();
    
    await showSearchResults(query);
}

async function searchFromHistory(query) {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = query;
    }
    await showSearchResults(query);
    
    const dropdown = document.getElementById('search-history-dropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

function toggleSearchHistory() {
    const dropdown = document.getElementById('search-history-dropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
}

// ==================== 사용자 인증 ====================

function logout() {
    localStorage.removeItem('cinema_token');
    localStorage.removeItem('cinema_user');
    dataManager.logout();
    ComponentRenderer.renderUserAuth();
    UIUtils.showToast('로그아웃되었습니다.', 'info');
    
    if (currentView === 'movie-detail' && currentMovie) {
        showMovieDetail(currentMovie.id);
    }
}

// ==================== 리뷰 ====================

function handleStarClick(rating) {
    currentStarRating = rating * 2;
    
    const ratingValueInput = document.getElementById('rating-value');
    const ratingDisplay = document.getElementById('rating-display');
    const stars = document.querySelectorAll('#star-rating-input .star');
    
    if (!ratingValueInput || !ratingDisplay) {
        return;
    }
    
    ratingValueInput.value = currentStarRating;
    ratingDisplay.textContent = `(${currentStarRating}/10)`;
    
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('filled');
        } else {
            star.classList.remove('filled');
        }
    });
}

function updateCharCount() {
    const textarea = document.getElementById('review-text');
    const currentCount = document.getElementById('current-count');
    const remainingCount = document.getElementById('remaining-count');
    const charCountDiv = document.getElementById('char-count');
    
    if (!textarea || !currentCount || !remainingCount || !charCountDiv) return;
    
    const length = textarea.value.length;
    const remaining = 200 - length;
    
    currentCount.textContent = length;
    remainingCount.textContent = `${remaining}자 남음`;
    
    charCountDiv.className = 'char-count';
    if (remaining < 20) {
        charCountDiv.classList.add('danger');
    } else if (remaining < 50) {
        charCountDiv.classList.add('warning');
    }
}

async function submitReview(event, movieId) {
    event.preventDefault();
    
    const rating = parseInt(document.getElementById('rating-value').value);
    const text = document.getElementById('review-text').value.trim();
    const currentUser = dataManager.currentUser;
    
    if (!currentUser) {
        UIUtils.showToast('로그인이 필요합니다.', 'error');
        return;
    }
    
    if (rating === 0 || rating < 2) {
        UIUtils.showToast('별점을 선택해주세요.', 'error');
        return;
    }
    
    if (!text) {
        UIUtils.showToast('리뷰 내용을 입력해주세요.', 'error');
        return;
    }
    
    if (text.length > 200) {
        UIUtils.showToast('리뷰는 200자 이내로 작성해주세요.', 'error');
        return;
    }
    
    const reviewData = {
        movieId: movieId,
        userId: currentUser.id,
        author: currentUser.nickname,
        rating: rating,
        text: text
    };
    
    try {
        if (window.currentEditingReview) {
            await dataManager.updateReview(window.currentEditingReview.id, {
                rating: rating,
                text: text
            });
            UIUtils.showToast('리뷰가 수정되었습니다.', 'success');
            window.currentEditingReview = null;
        } else {
            await dataManager.addReview(reviewData);
            UIUtils.showToast('리뷰가 등록되었습니다.', 'success');
        }
        
        await showMovieDetail(movieId);
    } catch (error) {
        UIUtils.showToast(error.message || '리뷰 처리에 실패했습니다.', 'error');
    }
}

async function editReview(reviewId) {
    if (!currentMovie) {
        UIUtils.showToast('영화 정보를 찾을 수 없습니다.', 'error');
        return;
    }
    
    try {
        const reviews = await dataManager.getMovieReviews(currentMovie.id);
        const review = reviews.find(r => String(r.id) === String(reviewId));
        
        if (!review) {
            UIUtils.showToast('리뷰를 찾을 수 없습니다.', 'error');
            return;
        }
        
        window.currentEditingReview = {
            id: review.id,
            rating: review.rating,
            text: review.text
        };
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await ComponentRenderer.renderMovieDetail(currentMovie);
        
        setTimeout(() => {
            const ratingInput = document.getElementById('rating-value');
            const textArea = document.getElementById('review-text');
            
            if (ratingInput && textArea) {
                ratingInput.value = review.rating;
                textArea.value = review.text;
                
                const starCount = Math.ceil(review.rating / 2);
                handleStarClick(starCount);
                
                updateCharCount();
                
                const reviewForm = document.querySelector('.review-form');
                if (reviewForm) {
                    const formRect = reviewForm.getBoundingClientRect();
                    const isVisible = formRect.top >= 0 && formRect.bottom <= window.innerHeight;
                    
                    if (!isVisible) {
                        reviewForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            }
        }, 300);
        
    } catch (error) {
        console.error('리뷰 수정 오류:', error);
        UIUtils.showToast('리뷰 수정 중 오류가 발생했습니다.', 'error');
    }
}

function cancelEdit() {
    window.currentEditingReview = null;
    showMovieDetail(currentMovie.id);
}

async function deleteReview(reviewId) {
    if (!confirm('리뷰를 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await dataManager.deleteReview(reviewId);
        UIUtils.showToast('리뷰가 삭제되었습니다.', 'success');
        
        if (window.currentEditingReview && window.currentEditingReview.id === reviewId) {
            window.currentEditingReview = null;
        }
        
        await showMovieDetail(currentMovie.id);
    } catch (error) {
        UIUtils.showToast('리뷰 삭제에 실패했습니다.', 'error');
    }
}

function changeReviewPage(page) {
    window.currentReviewPage = page;
    if (currentMovie) {
        showMovieDetail(currentMovie.id);
    }
}

// ==================== 키보드 이벤트 ====================

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const overlay = document.getElementById('modal-overlay');
        if (overlay && overlay.style.display === 'flex') {
            UIUtils.hideModal();
        }
    }
});

// ==================== 이미지 오류 처리 ====================

document.addEventListener('error', function(e) {
    if (e.target.tagName === 'IMG') {
        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDMwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjMzc0MTUxIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjAwIiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseTYic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiI+7J2066qw7KeAIOyXhuydjDwvdGV4dD4KPC9zdmc+';
        e.target.alt = '이미지 없음';
    }
}, true);


//찜 토글
async function toggleBookmark(movieId) {
    const result = await dataManager.toggleBookmark(movieId);
    
    if (result !== null) {
        // 버튼 찾기 - event 대신 movieId로 찾기
        const btn = document.getElementById('bookmark-btn');
        if (btn) {
            const icon = btn.querySelector('i');
            if (result) {
                // 찜 됨
                icon.className = 'fas fa-heart';
                btn.className = 'btn btn-primary';
                btn.innerHTML = '<i class="fas fa-heart"></i> 찜 취소';
            } else {
                // 찜 해제됨
                icon.className = 'far fa-heart';
                btn.className = 'btn btn-secondary';
                btn.innerHTML = '<i class="far fa-heart"></i> 찜하기';
            }
        }
        
        // 페이지 새로고침 (간단한 해결책)
        await showMovieDetail(movieId);
    }
}

// ==================== 크롤링 기능 ====================

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
        // 1단계: 영화 검색
        const searchResult = await API.searchMoviesForCrawl(trimmedQuery);
        
        // 로딩 토스트 제거
        if (loadingToast && loadingToast.parentNode) {
            loadingToast.parentNode.removeChild(loadingToast);
        }
        
        if (!searchResult.results || searchResult.results.length === 0) {
            UIUtils.showToast(`'${trimmedQuery}' 검색 결과가 없습니다.`, 'error');
            return;
        }
        
        // 2단계: 검색 결과 선택 모달 표시
        showMovieSelectionModal(searchResult.results, trimmedQuery);
        
    } catch (error) {
        if (loadingToast && loadingToast.parentNode) {
            loadingToast.parentNode.removeChild(loadingToast);
        }
        
        console.error('영화 검색 실패:', error);
        
        let errorMessage = '영화 검색에 실패했습니다.';
        
        if (error.message.includes('404')) {
            errorMessage = `'${trimmedQuery}' 검색 결과가 없습니다.`;
        } else if (error.message.includes('503')) {
            errorMessage = '크롤링 기능을 사용할 수 없습니다.';
        }
        
        UIUtils.showToast(errorMessage, 'error');
    }
}


function showMovieSelectionModal(movies, query) {
    // 기존 모달이 있으면 먼저 제거
    closeMovieSelectionModal();
    
    // 모달 오버레이 생성
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay movie-crawl-overlay'; // 고유 클래스 추가
    overlay.id = 'movie-crawl-overlay'; // ID 추가
    overlay.style.display = 'flex';
    overlay.style.zIndex = '10001';
    
    // 모달 생성
    const modal = document.createElement('div');
    modal.className = 'modal movie-selection-modal';
    modal.id = 'movie-selection-modal'; // ID 추가
    modal.style.maxWidth = '700px';
    modal.style.maxHeight = '80vh';
    modal.style.overflowY = 'auto';
    
    // 모달 내용
    modal.innerHTML = `
        <div class="modal-header">
            <h3>영화 선택</h3>
            <button class="modal-close" onclick="closeMovieSelectionModal()">&times;</button>
        </div>
        <div class="modal-body">
            <p class="text-muted mb-3" style="text-align: center;">
                '<strong>${query}</strong>' 검색 결과 중 크롤링할 영화를 선택하세요
            </p>
            <div class="movie-selection-list">
                ${movies.map((movie, index) => `
                    <div class="movie-selection-item" onclick="selectMovieForCrawl('${movie.movie_id}', '${movie.title.replace(/'/g, "\\'")}')">
                        <div class="movie-selection-poster">
                            <img src="${movie.poster_url || 'https://via.placeholder.com/80x120?text=No+Image'}" 
                                 alt="${movie.title}"
                                 onerror="this.src='https://via.placeholder.com/80x120?text=No+Image'">
                        </div>
                        <div class="movie-selection-info">
                            <h4>${movie.title}</h4>
                            <p class="text-muted">ID: ${movie.movie_id}</p>
                        </div>
                        <div class="movie-selection-action">
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // 오버레이 클릭 시 닫기 이벤트 추가
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeMovieSelectionModal();
        }
    });
    
    // ESC 키로 닫기 이벤트 추가
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeMovieSelectionModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    // 모달 애니메이션
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.style.transform = 'scale(1)';
    }, 10);
}


function closeMovieSelectionModal() {
    // ID로 찾아서 제거 (더 안전함)
    const overlay = document.getElementById('movie-crawl-overlay');
    if (overlay) {
        const modal = overlay.querySelector('.movie-selection-modal');
        if (modal) {
            modal.style.opacity = '0';
            modal.style.transform = 'scale(0.9)';
        }
        
        setTimeout(() => {
            if (overlay.parentNode) {  // 부모가 있는지 확인
                overlay.remove();
            }
        }, 300);
    }
    
    // 혹시 모를 중복 제거
    document.querySelectorAll('.movie-crawl-overlay').forEach(el => {
        if (el.parentNode) {
            el.remove();
        }
    });
}

async function selectMovieForCrawl(movieId, movieTitle) {
    closeMovieSelectionModal();
    
    const confirmMessage = `'${movieTitle}' 영화를 크롤링하시겠습니까?\n\n⏱️ 크롤링에는 10~30초 정도 소요됩니다.`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    const loadingToast = UIUtils.showToast('🔍 영화 정보를 크롤링하는 중... 잠시만 기다려주세요.', 'info', 60000);
    
    try {
        const result = await API.crawlMovieById(movieId, movieTitle);
        
        if (loadingToast && loadingToast.parentNode) {
            loadingToast.parentNode.removeChild(loadingToast);
        }
        
        if (result.already_exists) {
            UIUtils.showToast(`✅ '${result.movie_title}'은(는) 이미 데이터베이스에 있습니다!`, 'info');
            
            setTimeout(() => {
                showMovieDetail(result.movie_id);
            }, 1000);
        } else {
            UIUtils.showToast(`🎉 '${result.movie_title}'이(가) 성공적으로 추가되었습니다!`, 'success');
            
            setTimeout(() => {
                showMovieDetail(result.movie_id);
            }, 1000);
        }
        
    } catch (error) {
        if (loadingToast && loadingToast.parentNode) {
            loadingToast.parentNode.removeChild(loadingToast);
        }
        
        console.error('크롤링 실패:', error);
        UIUtils.showToast(`❌ 크롤링 실패: ${error.message}`, 'error');
    }
}




function switchTab(tab) {
    // 탭 버튼 활성화
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-tab="${tab}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    // 섹션 표시/숨김
    const weeklySection = document.getElementById('weekly-section');
    const allSection = document.getElementById('all-section');
    
    if (weeklySection && allSection) {
        weeklySection.style.display = tab === 'weekly' ? 'block' : 'none';
        allSection.style.display = tab === 'all' ? 'block' : 'none';
        
        // 전체 영화 탭 처음 클릭 시 로드
        if (tab === 'all') {
            const grid = document.getElementById('all-movies-grid');
            if (grid && grid.children.length === 0) {
                loadAllMovies();
            }
        }
    }
}

async function loadAllMovies() {
    const grid = document.getElementById('all-movies-grid');
    if (!grid) return;
    
    grid.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">로딩 중...</p>';
    
    try {
        const skip = (allMoviesCurrentPage - 1) * 20;
        const response = await fetch(
            `${API_BASE}/api/movies?skip=${skip}&limit=20&sort_by=${allMoviesSort}`
        );
        
        if (!response.ok) throw new Error('영화 로드 실패');
        
        const movies = await response.json();
        grid.innerHTML = '';
        
        if (movies.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: var(--text-muted);">영화가 없습니다.</p>';
            return;
        }
        
        movies.forEach(movie => {
            const card = ComponentRenderer.renderMovieCard(movie);
            grid.appendChild(card);
        });
        
        renderAllMoviesPagination();
        
    } catch (error) {
        console.error('영화 로드 오류:', error);
        grid.innerHTML = '<p style="text-align: center; color: #ef4444;">영화를 불러오는데 실패했습니다.</p>';
    }
}

async function renderAllMoviesPagination() {
    try {
        const countResponse = await fetch(`${API_BASE}/api/movies/count`);
        const countData = await countResponse.json();
        const totalPages = Math.ceil(countData.total / 20);
        
        const pagination = document.getElementById('all-pagination');
        if (!pagination) return;
        
        pagination.innerHTML = '';
        
        // 이전 버튼
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.disabled = allMoviesCurrentPage === 1;
        prevBtn.onclick = () => {
            if (allMoviesCurrentPage > 1) {
                allMoviesCurrentPage--;
                loadAllMovies();
                window.scrollTo(0, 0);
            }
        };
        pagination.appendChild(prevBtn);
        
        // 페이지 번호
        const start = Math.max(1, allMoviesCurrentPage - 2);
        const end = Math.min(totalPages, start + 4);
        
        for (let i = start; i <= end; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.className = i === allMoviesCurrentPage ? 'active' : '';
            pageBtn.onclick = () => {
                allMoviesCurrentPage = i;
                loadAllMovies();
                window.scrollTo(0, 0);
            };
            pagination.appendChild(pageBtn);
        }
        
        // 다음 버튼
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.disabled = allMoviesCurrentPage === totalPages;
        nextBtn.onclick = () => {
            if (allMoviesCurrentPage < totalPages) {
                allMoviesCurrentPage++;
                loadAllMovies();
                window.scrollTo(0, 0);
            }
        };
        pagination.appendChild(nextBtn);
        
    } catch (error) {
        console.error('페이지네이션 오류:', error);
    }
}


// ==================== 탭 전환 시스템 ====================

function switchTab(tab) {
    currentTab = tab;
    
    // 탭 버튼 활성화
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-tab="${tab}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    // 섹션 표시/숨김
    const weeklySection = document.getElementById('weekly-section');
    const allSection = document.getElementById('all-section');
    
    if (weeklySection && allSection) {
        weeklySection.style.display = tab === 'weekly' ? 'block' : 'none';
        allSection.style.display = tab === 'all' ? 'block' : 'none';
        
        // 전체 영화 탭 처음 클릭 시 로드
        if (tab === 'all') {
            const grid = document.getElementById('all-movies-grid');
            if (grid && grid.children.length === 0) {
                loadAllMovies();
            }
        }
    }
}

async function loadAllMovies() {
    const grid = document.getElementById('all-movies-grid');
    const loading = document.getElementById('all-loading');
    
    if (!grid) return;
    
    // 로딩 표시
    if (loading) loading.style.display = 'flex';
    grid.innerHTML = '';
    
    try {
        const skip = (allMoviesCurrentPage - 1) * 20;
        const response = await fetch(
            `${API_BASE}/api/movies?skip=${skip}&limit=20&sort_by=${allMoviesSort}`
        );
        
        if (!response.ok) throw new Error('영화 로드 실패');
        
        const movies = await response.json();
        
        if (loading) loading.style.display = 'none';
        
        if (movies.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">영화가 없습니다.</p>';
            return;
        }
        
        movies.forEach(movie => {
            const card = createAllMovieCard(movie);
            grid.appendChild(card);
        });
        
        await renderAllMoviesPagination();
        updateAllMoviesCount();
        
    } catch (error) {
        console.error('영화 로드 오류:', error);
        if (loading) loading.style.display = 'none';
        grid.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 2rem;">영화를 불러오는데 실패했습니다.</p>';
        UIUtils.showToast('영화 목록을 불러오는데 실패했습니다.', 'error');
    }
}

function createAllMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'card movie-card';
    card.onclick = () => showMovieDetail(movie.id);
    
    const poster = movie.poster || 'assets/logo.png';
    const rating = movie.rating || movie.criticRating || movie.audienceRating || 0;
    
    card.innerHTML = `
        <img src="${poster}" alt="${movie.title}" class="movie-poster" onerror="this.src='assets/logo.png'">
        <div class="movie-info">
            <h3>${movie.title}</h3>
            <div class="movie-meta">
                <span class="movie-genre">${movie.genre || '미분류'}</span>
                <span class="movie-year">${movie.releaseYear || '미정'}</span>
            </div>
            <div class="star-rating">
                ${renderStarsForAll(rating)}
                <span class="rating-text">${rating.toFixed(1)}</span>
            </div>
        </div>
    `;
    
    return card;
}

function renderStarsForAll(rating, maxRating = 10) {
    const fullStars = Math.floor(rating / 2);
    const hasHalfStar = (rating % 2) >= 1;
    let html = '';
    
    for (let i = 0; i < fullStars; i++) {
        html += '<i class="fas fa-star star filled"></i>';
    }
    if (hasHalfStar) {
        html += '<i class="fas fa-star-half-alt star filled"></i>';
    }
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
        html += '<i class="far fa-star star"></i>';
    }
    
    return html;
}

async function renderAllMoviesPagination() {
    try {
        const countResponse = await fetch(`${API_BASE}/api/movies/count`);
        const countData = await countResponse.json();
        const totalPages = Math.ceil(countData.total / 20);
        
        const pagination = document.getElementById('all-pagination');
        if (!pagination) return;
        
        pagination.innerHTML = '';
        
        // 이전 버튼
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-secondary btn-small';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.disabled = allMoviesCurrentPage === 1;
        prevBtn.onclick = () => {
            if (allMoviesCurrentPage > 1) {
                allMoviesCurrentPage--;
                loadAllMovies();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };
        pagination.appendChild(prevBtn);
        
        // 페이지 번호 (간단 버전)
        const start = Math.max(1, allMoviesCurrentPage - 2);
        const end = Math.min(totalPages, start + 4);
        
        for (let i = start; i <= end; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = i === allMoviesCurrentPage ? 'btn btn-primary btn-small' : 'btn btn-secondary btn-small';
            pageBtn.textContent = i;
            pageBtn.onclick = () => {
                allMoviesCurrentPage = i;
                loadAllMovies();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
            pagination.appendChild(pageBtn);
        }
        
        // 다음 버튼
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-secondary btn-small';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.disabled = allMoviesCurrentPage === totalPages;
        nextBtn.onclick = () => {
            if (allMoviesCurrentPage < totalPages) {
                allMoviesCurrentPage++;
                loadAllMovies();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };
        pagination.appendChild(nextBtn);
        
    } catch (error) {
        console.error('페이지네이션 오류:', error);
    }
}

function updateAllMoviesCount() {
    const countElement = document.getElementById('all-movies-count');
    if (!countElement) return;
    
    fetch(`${API_BASE}/api/movies/count`)
        .then(res => res.json())
        .then(data => {
            const total = data.total;
            const start = (allMoviesCurrentPage - 1) * 20 + 1;
            const end = Math.min(allMoviesCurrentPage * 20, total);
            countElement.textContent = `총 ${total}개 영화 (${start}-${end}번째 표시)`;
        })
        .catch(err => console.error('개수 업데이트 오류:', err));
}






// ==================== 필터 기능 ====================

function toggleFilterPanel() {
    const panel = document.getElementById('filter-panel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        loadFilterOptions();
    } else {
        panel.style.display = 'none';
    }
}

async function loadFilterOptions() {
    try {
        const options = await API.getFilterOptions();
        
        // 장르
        const genreSelect = document.getElementById('filter-genre');
        genreSelect.innerHTML = '<option value="">전체</option>';
        options.genres.forEach(genre => {
            genreSelect.innerHTML += `<option value="${genre}">${genre}</option>`;
        });
        
        // 국가
        const countrySelect = document.getElementById('filter-country');
        countrySelect.innerHTML = '<option value="">전체</option>';
        options.countries.forEach(country => {
            countrySelect.innerHTML += `<option value="${country}">${country}</option>`;
        });
        
        // 연도
        const yearSelect = document.getElementById('filter-year');
        yearSelect.innerHTML = '<option value="">전체</option>';
        options.years.forEach(year => {
            yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
        });
        
    } catch (error) {
        console.error('필터 옵션 로드 실패:', error);
    }
}

async function applyFilters() {
    const filters = {
        query: document.getElementById('search-input').value,
        genre: document.getElementById('filter-genre').value,
        country: document.getElementById('filter-country').value,
        year: document.getElementById('filter-year').value,
        minRating: document.getElementById('filter-min-rating').value,
        maxRating: document.getElementById('filter-max-rating').value,
        limit: 100
    };
    
    try {
        // 필터 API 대신 기본 검색 사용
        const params = new URLSearchParams();
        if (filters.query) params.append('query', filters.query);
        if (filters.genre) params.append('genre', filters.genre);
        if (filters.country) params.append('country', filters.country);
        if (filters.year) params.append('year', filters.year);
        if (filters.minRating) params.append('min_rating', filters.minRating);
        if (filters.maxRating) params.append('max_rating', filters.maxRating);
        
        const queryString = params.toString();
        const url = `${API_BASE}/api/movies${queryString ? '?' + queryString : ''}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('필터링 실패');
        
        const movies = await response.json();
        
        // 필터 패널 닫기
        document.getElementById('filter-panel').style.display = 'none';
        
        const mainContent = document.getElementById('main-content');
        
        if (movies.length === 0) {
            mainContent.innerHTML = `
                <div class="search-results">
                    <div class="results-header">
                        <h2>필터 결과</h2>
                        <button class="btn btn-secondary" onclick="showHome()">홈으로</button>
                    </div>
                    <p class="text-center text-muted" style="padding: 3rem;">조건에 맞는 영화가 없습니다.</p>
                </div>
            `;
        } else {
            mainContent.innerHTML = `
                <div class="search-results">
                    <div class="results-header">
                        <h2>필터 결과 (${movies.length}개)</h2>
                        <button class="btn btn-secondary" onclick="showHome()">홈으로</button>
                    </div>
                    <div class="ranking-grid">
                        ${movies.map(movie => UIUtils.renderMovieCard(movie, false)).join('')}
                    </div>
                </div>
            `;
        }
        
        UIUtils.showToast(`${movies.length}개의 영화를 찾았습니다`, 'success');
        
    } catch (error) {
        console.error('필터 적용 실패:', error);
        UIUtils.showToast('필터 적용 실패', 'error');
    }
}

function resetFilters() {
    document.getElementById('filter-genre').value = '';
    document.getElementById('filter-country').value = '';
    document.getElementById('filter-year').value = '';
    document.getElementById('filter-min-rating').value = '';
    document.getElementById('filter-max-rating').value = '';
    
    UIUtils.showToast('필터가 초기화되었습니다', 'info');
}





// 전역 함수 등록
window.showHome = showHome;
window.showMovieDetail = showMovieDetail;
window.logout = logout;
window.searchFromHistory = searchFromHistory;
window.toggleSearchHistory = toggleSearchHistory;
window.submitReview = submitReview;
window.editReview = editReview;
window.cancelEdit = cancelEdit;
window.deleteReview = deleteReview;
window.handleStarClick = handleStarClick;
window.updateCharCount = updateCharCount;
window.changeReviewPage = changeReviewPage;
window.goBack = goBack;
window.toggleBookmark = toggleBookmark;
window.crawlMovieFromSearch = crawlMovieFromSearch;
window.closeMovieSelectionModal = closeMovieSelectionModal;
window.selectMovieForCrawl = selectMovieForCrawl;
window.switchTab = switchTab;
window.loadAllMovies = loadAllMovies;
window.toggleFilterPanel = toggleFilterPanel;
window.loadFilterOptions = loadFilterOptions;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
