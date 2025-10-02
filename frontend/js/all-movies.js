// frontend/js/all-movies.js

const API_BASE = 'http://localhost:8000';

let currentPage = 1;
let itemsPerPage = 20;
let currentSort = 'latest';
let totalMovies = 0;

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
    await ComponentRenderer.renderUserAuth();
    await loadMoviesCount();
    await loadMovies();
    
    // 정렬 버튼
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentSort = e.currentTarget.dataset.sort;
            currentPage = 1;
            loadMovies();
        });
    });
    
    // 페이지당 개수 변경
    document.getElementById('items-per-page').addEventListener('change', (e) => {
        itemsPerPage = parseInt(e.target.value);
        currentPage = 1;
        loadMovies();
    });
});

// 전체 영화 개수 로드
async function loadMoviesCount() {
    try {
        const response = await fetch(`${API_BASE}/api/movies/count`);
        const data = await response.json();
        totalMovies = data.total;
        document.getElementById('total-count').textContent = `총 ${totalMovies}개의 영화`;
    } catch (error) {
        console.error('영화 개수 로드 실패:', error);
    }
}

// 영화 목록 로드
async function loadMovies() {
    const grid = document.getElementById('movies-grid');
    const loading = document.getElementById('loading');
    
    loading.style.display = 'flex';
    grid.innerHTML = '';
    
    try {
        const skip = (currentPage - 1) * itemsPerPage;
        const response = await fetch(
            `${API_BASE}/api/movies?skip=${skip}&limit=${itemsPerPage}&sort_by=${currentSort}`
        );
        
        if (!response.ok) throw new Error('영화 목록 로드 실패');
        
        const movies = await response.json();
        
        if (movies.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: var(--text-muted);">영화가 없습니다.</p>';
            loading.style.display = 'none';
            return;
        }
        
        movies.forEach(movie => {
            const card = createMovieCard(movie);
            grid.appendChild(card);
        });
        
        renderPagination();
        
    } catch (error) {
        console.error('영화 로드 오류:', error);
        UIUtils.showToast('영화 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
        loading.style.display = 'none';
    }
}

// 영화 카드 생성
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card card';
    card.onclick = () => window.location.href = `detail.html?id=${movie.id}`;
    
    card.innerHTML = `
        <img src="${movie.poster || 'assets/logo.png'}" 
             alt="${movie.title}" 
             class="movie-poster"
             onerror="this.src='assets/logo.png'">
        <div class="movie-info">
            <h3>${movie.title}</h3>
            <div class="movie-meta">
                <span class="movie-genre">${movie.genre || '장르 미정'}</span>
                <span class="movie-year">${movie.releaseYear || '미정'}</span>
            </div>
            <div class="star-rating">
                ${ComponentRenderer.renderStars(movie.rating || 0)}
                <span class="rating-text">${movie.rating?.toFixed(1) || '0.0'} (${movie.reviewCount || 0})</span>
            </div>
        </div>
    `;
    
    return card;
}

// 페이지네이션 렌더링
function renderPagination() {
    const totalPages = Math.ceil(totalMovies / itemsPerPage);
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    // 이전 버튼
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            loadMovies();
            window.scrollTo(0, 0);
        }
    };
    pagination.appendChild(prevBtn);
    
    // 페이지 번호
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'active' : '';
        pageBtn.onclick = () => {
            currentPage = i;
            loadMovies();
            window.scrollTo(0, 0);
        };
        pagination.appendChild(pageBtn);
    }
    
    // 다음 버튼
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadMovies();
            window.scrollTo(0, 0);
        }
    };
    pagination.appendChild(nextBtn);
}