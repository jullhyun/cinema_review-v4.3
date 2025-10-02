// 관리자 페이지 스크립트
let currentSection = 'dashboard';
let currentPage = 1;
const itemsPerPage = 20;

// 초기화
document.addEventListener('DOMContentLoaded', async function() {
    checkAdminAuth();
    setupNavigation();
    await loadDashboard();
});

// 관리자 권한 확인
function checkAdminAuth() {
    const user = dataManager.currentUser;
    
    if (!user) {
        alert('로그인이 필요합니다.');
        location.href = 'login.html';
        return;
    }
    
    if (user.user_id !== 'admin' && user.user_id !== 'eodud956') {
        alert('관리자 권한이 필요합니다.');
        location.href = 'index.html';
        return;
    }
    
    document.getElementById('admin-username').textContent = `${user.nickname}님`;
}

// 네비게이션 설정
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const section = this.dataset.section;
            switchSection(section);
        });
    });
}

// 섹션 전환
async function switchSection(section) {
    currentSection = section;
    currentPage = 1;
    
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
    
    const titles = {
        'dashboard': '대시보드',
        'movies': '영화 관리',
        'reviews': '리뷰 관리',
        'users': '사용자 관리',
        'crawl': '크롤링 관리'
    };
    document.getElementById('section-title').textContent = titles[section];
    
    switch(section) {
        case 'dashboard':
            await loadDashboard();
            break;
        case 'movies':
            await loadMovies();
            break;
        case 'reviews':
            await loadReviews();
            break;
        case 'users':
            await loadUsers();
            break;
        case 'crawl':
            await loadCrawlPage();
            break;
    }
}

// ==================== 대시보드 ====================

async function loadDashboard() {
    const content = document.getElementById('admin-content');
    
    content.innerHTML = `
        <div class="stats-grid" id="stats-grid">
            <div class="stat-card">
                <h3>총 영화 수</h3>
                <div class="stat-value" id="total-movies">0</div>
                <div class="stat-label">등록된 영화</div>
            </div>
            <div class="stat-card green">
                <h3>총 리뷰 수</h3>
                <div class="stat-value" id="total-reviews">0</div>
                <div class="stat-label">작성된 리뷰</div>
            </div>
            <div class="stat-card orange">
                <h3>총 사용자 수</h3>
                <div class="stat-value" id="total-users">0</div>
                <div class="stat-label">가입된 사용자</div>
            </div>
            <div class="stat-card blue">
                <h3>평균 평점</h3>
                <div class="stat-value" id="avg-rating">0.0</div>
                <div class="stat-label">전체 영화 평균</div>
            </div>
        </div>
        
        <h3 style="margin-top: 2rem; margin-bottom: 1rem;">시스템 정보</h3>
        <div style="background: #f7fafc; padding: 2rem; border-radius: 10px;">
            <p>관리자 페이지가 정상적으로 작동 중입니다.</p>
        </div>
    `;
    
    try {
        const stats = await AdminAPI.getStats();
        document.getElementById('total-movies').textContent = stats.total_movies || 0;
        document.getElementById('total-reviews').textContent = stats.total_reviews || 0;
        document.getElementById('total-users').textContent = stats.total_users || 0;
        document.getElementById('avg-rating').textContent = (stats.avg_rating || 0).toFixed(1);
    } catch (error) {
        console.error('통계 로드 실패:', error);
    }
}

// ==================== 영화 관리 ====================

async function loadMovies() {
    const content = document.getElementById('admin-content');
    
    content.innerHTML = `
        <div class="admin-controls">
            <div class="admin-search">
                <input type="text" id="movie-search" placeholder="영화 제목 검색...">
                <button class="btn btn-primary" onclick="searchMovies()">
                    <i class="fas fa-search"></i> 검색
                </button>
            </div>
            <button class="btn btn-primary" onclick="switchSection('crawl')">
                <i class="fas fa-plus"></i> 영화 추가
            </button>
        </div>
        
        <div id="movies-table-container">
            <p style="text-align: center; padding: 2rem;">로딩 중...</p>
        </div>
        
        <div id="movies-pagination"></div>
    `;
    
    await loadMoviesTable();
}

async function loadMoviesTable(search = '') {
    try {
        const skip = (currentPage - 1) * itemsPerPage;
        const response = await fetch(
            `${API_BASE_URL}/api/movies?skip=${skip}&limit=${itemsPerPage}${search ? '&query=' + search : ''}`
        );
        
        if (!response.ok) throw new Error('영화 로드 실패');
        
        const movies = await response.json();
        const container = document.getElementById('movies-table-container');
        
        if (movies.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">영화가 없습니다</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>포스터</th>
                        <th>제목</th>
                        <th>장르</th>
                        <th>개봉년도</th>
                        <th>평점</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody>
                    ${movies.map(movie => `
                        <tr>
                            <td><img src="${movie.poster || 'assets/logo.png'}" alt="${movie.title}"></td>
                            <td><strong>${movie.title}</strong></td>
                            <td>${movie.genre || '-'}</td>
                            <td>${movie.releaseYear || '-'}</td>
                            <td>${(movie.rating || 0).toFixed(1)}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-primary btn-icon" onclick="editMovie('${movie.id}')" title="수정">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-danger btn-icon" onclick="deleteMovie('${movie.id}', '${movie.title.replace(/'/g, "\\'")}')" title="삭제">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        renderMoviesPagination();
        
    } catch (error) {
        console.error('영화 로드 실패:', error);
        UIUtils.showToast('영화 목록을 불러오는데 실패했습니다', 'error');
    }
}

async function searchMovies() {
    const search = document.getElementById('movie-search').value.trim();
    currentPage = 1;
    await loadMoviesTable(search);
}

function renderMoviesPagination() {
    const container = document.getElementById('movies-pagination');
    
    container.innerHTML = `
        <div class="admin-pagination">
            <button onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
            <button class="active">${currentPage}</button>
            <button onclick="changePage(1)">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
}

function changePage(delta) {
    currentPage += delta;
    if (currentPage < 1) currentPage = 1;
    loadMoviesTable();
}

async function editMovie(movieId) {
    try {
        const movie = await API.getMovieDetail(movieId);
        
        document.getElementById('edit-movie-id').value = movie.id;
        document.getElementById('edit-movie-title').value = movie.title || '';
        document.getElementById('edit-movie-genre').value = movie.genre || '';
        document.getElementById('edit-movie-director').value = movie.director || '';
        document.getElementById('edit-movie-year').value = movie.releaseYear || '';
        document.getElementById('edit-movie-duration').value = movie.duration ? parseInt(movie.duration) : '';
        document.getElementById('edit-movie-synopsis').value = movie.synopsis || '';
        
        document.getElementById('edit-movie-modal').style.display = 'flex';
        
        document.getElementById('edit-movie-form').onsubmit = async (e) => {
            e.preventDefault();
            await saveMovie();
        };
        
    } catch (error) {
        console.error('영화 정보 로드 실패:', error);
        UIUtils.showToast('영화 정보를 불러오는데 실패했습니다', 'error');
    }
}

function closeEditMovieModal() {
    document.getElementById('edit-movie-modal').style.display = 'none';
}

async function saveMovie() {
    const movieData = {
        id: document.getElementById('edit-movie-id').value,
        title: document.getElementById('edit-movie-title').value,
        genre: document.getElementById('edit-movie-genre').value,
        director: document.getElementById('edit-movie-director').value,
        releaseYear: document.getElementById('edit-movie-year').value,
        duration: document.getElementById('edit-movie-duration').value + '분',
        synopsis: document.getElementById('edit-movie-synopsis').value
    };
    
    try {
        await AdminAPI.updateMovie(movieData.id, movieData);
        UIUtils.showToast('영화 정보가 수정되었습니다', 'success');
        closeEditMovieModal();
        await loadMoviesTable();
    } catch (error) {
        console.error('영화 수정 실패:', error);
        UIUtils.showToast('영화 수정에 실패했습니다', 'error');
    }
}

async function deleteMovie(movieId, movieTitle) {
    if (!confirm(`"${movieTitle}" 영화를 삭제하시겠습니까?`)) {
        return;
    }
    
    try {
        await AdminAPI.deleteMovie(movieId);
        UIUtils.showToast('영화가 삭제되었습니다', 'success');
        await loadMoviesTable();
    } catch (error) {
        console.error('영화 삭제 실패:', error);
        UIUtils.showToast('영화 삭제에 실패했습니다', 'error');
    }
}

// ==================== 리뷰 관리 ====================

async function loadReviews() {
    const content = document.getElementById('admin-content');
    
    content.innerHTML = `
        <div class="admin-controls">
            <div class="admin-search">
                <input type="text" id="review-search" placeholder="영화 제목 또는 사용자 검색...">
                <button class="btn btn-primary" onclick="searchReviews()">
                    <i class="fas fa-search"></i> 검색
                </button>
            </div>
        </div>
        
        <div id="reviews-table-container">
            <p style="text-align: center; padding: 2rem;">로딩 중...</p>
        </div>
    `;
    
    await loadReviewsTable();
}

async function loadReviewsTable(search = '') {
    try {
        const reviews = await AdminAPI.getAllReviews(search);
        const container = document.getElementById('reviews-table-container');
        
        if (reviews.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">리뷰가 없습니다</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>작성자</th>
                        <th>평점</th>
                        <th>내용</th>
                        <th>작성일</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody>
                    ${reviews.map(review => `
                        <tr>
                            <td>${review.author}</td>
                            <td>${review.rating}/10</td>
                            <td style="max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${review.text}</td>
                            <td>${new Date(review.created_at).toLocaleDateString('ko-KR')}</td>
                            <td>
                                <button class="btn btn-danger btn-icon" onclick="deleteReview('${review.id}')" title="삭제">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        console.error('리뷰 로드 실패:', error);
        UIUtils.showToast('리뷰 목록을 불러오는데 실패했습니다', 'error');
    }
}

async function searchReviews() {
    const search = document.getElementById('review-search').value.trim();
    await loadReviewsTable(search);
}

async function deleteReview(reviewId) {
    if (!confirm('이 리뷰를 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await API.deleteReview(reviewId);
        UIUtils.showToast('리뷰가 삭제되었습니다', 'success');
        await loadReviewsTable();
    } catch (error) {
        console.error('리뷰 삭제 실패:', error);
        UIUtils.showToast('리뷰 삭제에 실패했습니다', 'error');
    }
}

// ==================== 사용자 관리 ====================

async function loadUsers() {
    const content = document.getElementById('admin-content');
    
    content.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <p style="color: #999;">사용자 관리 기능은 백엔드 API 구현 후 사용 가능합니다.</p>
        </div>
    `;
}

// ==================== 크롤링 관리 ====================

async function loadCrawlPage() {
    const content = document.getElementById('admin-content');
    
    content.innerHTML = `
        <div class="crawl-form">
            <h3 style="text-align: center; margin-bottom: 2rem;">Cine21에서 영화 크롤링</h3>
            
            <div class="form-group">
                <label>영화 제목</label>
                <input type="text" id="crawl-query" placeholder="영화 제목을 입력하세요">
            </div>
            
            <div class="form-actions">
                <button class="btn btn-primary btn-large" onclick="startCrawl()">
                    <i class="fas fa-download"></i> 크롤링 시작
                </button>
            </div>
            
            <div id="crawl-result" style="margin-top: 2rem;"></div>
        </div>
    `;
}

async function startCrawl() {
    const query = document.getElementById('crawl-query').value.trim();
    
    if (!query) {
        UIUtils.showToast('영화 제목을 입력해주세요', 'error');
        return;
    }
    
    if (query.length < 2) {
        UIUtils.showToast('검색어는 최소 2글자 이상이어야 합니다', 'error');
        return;
    }
    
    const resultDiv = document.getElementById('crawl-result');
    resultDiv.innerHTML = '<p style="text-align: center; color: #667eea;">검색하는 중...</p>';
    
    try {
        const searchResult = await API.searchMoviesForCrawl(query);
        
        if (!searchResult.results || searchResult.results.length === 0) {
            resultDiv.innerHTML = `<p style="text-align: center; color: #999;">검색 결과가 없습니다</p>`;
            return;
        }
        
        resultDiv.innerHTML = `
            <h4 style="margin-bottom: 1rem;">검색 결과 (${searchResult.results.length}개)</h4>
            <div style="max-height: 400px; overflow-y: auto;">
                ${searchResult.results.map(movie => `
                    <div style="padding: 1rem; border: 1px solid #e2e8f0; border-radius: 5px; margin-bottom: 1rem; cursor: pointer; transition: all 0.3s;" 
                         onclick="crawlMovie('${movie.movie_id}', '${movie.title.replace(/'/g, "\\'")}')"
                         onmouseover="this.style.background='#f7fafc'" 
                         onmouseout="this.style.background='white'">
                        <strong>${movie.title}</strong>
                        <p style="color: #718096; margin: 0.5rem 0 0 0;">ID: ${movie.movie_id}</p>
                    </div>
                `).join('')}
            </div>
        `;
        
    } catch (error) {
        console.error('검색 실패:', error);
        resultDiv.innerHTML = `<p style="text-align: center; color: #ef4444;">검색에 실패했습니다</p>`;
        UIUtils.showToast('검색에 실패했습니다', 'error');
    }
}

async function crawlMovie(movieId, movieTitle) {
    if (!confirm(`"${movieTitle}" 영화를 크롤링하시겠습니까?`)) {
        return;
    }
    
    const resultDiv = document.getElementById('crawl-result');
    resultDiv.innerHTML = '<p style="text-align: center; color: #667eea;">크롤링하는 중...</p>';
    
    try {
        const result = await API.crawlMovieById(movieId, movieTitle);
        
        UIUtils.showToast(`영화가 추가되었습니다!`, 'success');
        
        resultDiv.innerHTML = `
            <div style="text-align: center; padding: 2rem; background: #f0fff4; border-radius: 10px;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
                <h3 style="color: #22543d; margin-bottom: 1rem;">크롤링 완료!</h3>
                <p style="color: #2f855a;">"${result.movie_title}"</p>
                <button class="btn btn-primary" onclick="switchSection('movies')" style="margin-top: 1rem;">
                    영화 목록 보기
                </button>
            </div>
        `;
        
    } catch (error) {
        console.error('크롤링 실패:', error);
        resultDiv.innerHTML = `
            <div style="text-align: center; padding: 2rem; background: #fff5f5; border-radius: 10px;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                <h3 style="color: #742a2a; margin-bottom: 1rem;">크롤링 실패</h3>
                <p style="color: #c53030;">${error.message}</p>
            </div>
        `;
        UIUtils.showToast('크롤링에 실패했습니다', 'error');
    }
}

// ==================== Admin API ====================

class AdminAPI {
    static async getStats() {
        try {
            const moviesRes = await fetch(`${API_BASE_URL}/api/movies/count`);
            const moviesData = await moviesRes.json();
            
            return {
                total_movies: moviesData.total || 0,
                total_reviews: 0,
                total_users: 0,
                avg_rating: 7.5
            };
        } catch (error) {
            return {
                total_movies: 0,
                total_reviews: 0,
                total_users: 0,
                avg_rating: 0
            };
        }
    }
    
    static async updateMovie(movieId, movieData) {
        const response = await fetch(`${API_BASE_URL}/api/movies/${movieId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(movieData)
        });
        
        if (!response.ok) throw new Error('영화 수정 실패');
        return await response.json();
    }
    
    static async deleteMovie(movieId) {
        const response = await fetch(`${API_BASE_URL}/api/movies/${movieId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('영화 삭제 실패');
        return await response.json();
    }
    
    static async getAllReviews(search = '') {
        const response = await fetch(`${API_BASE_URL}/api/reviews/all`);
        
        if (!response.ok) throw new Error('리뷰 로드 실패');
        return await response.json();
    }
}

// 전역 함수 등록
window.switchSection = switchSection;
window.searchMovies = searchMovies;
window.changePage = changePage;
window.editMovie = editMovie;
window.closeEditMovieModal = closeEditMovieModal;
window.saveMovie = saveMovie;
window.deleteMovie = deleteMovie;
window.searchReviews = searchReviews;
window.deleteReview = deleteReview;
window.startCrawl = startCrawl;
window.crawlMovie = crawlMovie;