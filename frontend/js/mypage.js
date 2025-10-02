// 마이페이지 초기화
document.addEventListener('DOMContentLoaded', async function() {
    await initMyPage();
});

async function initMyPage() {
    // 로그인 확인
    const currentUser = dataManager.currentUser;
    
    if (!currentUser) {
        UIUtils.showToast('로그인이 필요합니다.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }
    
    // 사용자 인증 UI 렌더링
    await ComponentRenderer.renderUserAuth();
    
    // 프로필 정보 로드
    loadProfileInfo(currentUser);
    
    // 내 리뷰 로드
    await loadMyReviews(currentUser.id);

    // ⭐ 찜 목록 로드 추가
    await loadMyBookmarks(currentUser.id);
    
    // 이벤트 리스너 설정
    setupEventListeners();
}

function loadProfileInfo(user) {
    // 아바타 (닉네임 첫 글자)
    const avatar = document.getElementById('user-avatar');
    avatar.textContent = user.nickname ? user.nickname.charAt(0) : user.username.charAt(0);
    
    // 사용자 정보
    document.getElementById('user-username').textContent = user.user_id || user.username;
    document.getElementById('user-nickname').textContent = user.nickname || user.username;
    document.getElementById('user-email').textContent = user.email || '이메일 정보 없음';
    
    
    // 가입일 - user 객체에서 직접 가져오기
    const joinedDate = user.created_at || '정보 없음';
    document.getElementById('user-joined').textContent = joinedDate;
    
    // 프로필 수정 폼에 현재 값 설정
    document.getElementById('edit-nickname').value = user.nickname || user.username;
    document.getElementById('edit-email').value = user.email || '';
    document.getElementById('edit-phone').value = user.phone || '';
}

async function loadMyReviews(userId) {
    try {
        // 모든 영화에서 현재 사용자의 리뷰만 필터링
        const movies = await dataManager.searchMovies('');
        let allMyReviews = [];
        
        // 각 영화의 리뷰를 확인
        for (const movie of movies) {
            try {
                const reviews = await dataManager.getMovieReviews(movie.id);
                const myReviews = reviews.filter(r => r.userId === userId);
                
                // 영화 정보와 함께 저장
                myReviews.forEach(review => {
                    allMyReviews.push({
                        ...review,
                        movieTitle: movie.title,
                        moviePoster: movie.poster,
                        movieId: movie.id
                    });
                });
            } catch (error) {
                console.error(`영화 ${movie.id} 리뷰 로드 실패:`, error);
            }
        }
        
        // 날짜순 정렬 (최신순)
        allMyReviews.sort((a, b) => b.createdAt - a.createdAt);
        
        // UI 렌더링
        renderMyReviews(allMyReviews);
        
        // 통계 업데이트
        updateStatistics(allMyReviews);
        
    } catch (error) {
        console.error('내 리뷰 로드 실패:', error);
        UIUtils.showToast('리뷰를 불러오는데 실패했습니다.', 'error');
        
        // 빈 상태 표시
        renderEmptyReviews();
        updateStatistics([]);
    }
}

function renderMyReviews(reviews) {
    const container = document.getElementById('myReviewsList');
    
    if (reviews.length === 0) {
        renderEmptyReviews();
        return;
    }
    
    container.innerHTML = reviews.map(review => `
        <div class="user-review-item" data-review-id="${review.id}" data-movie-id="${review.movieId}">
            <div class="review-item-header">
                <div style="display: flex; gap: 1rem; flex: 1;">
                    <img src="${review.moviePoster}" 
                         alt="${review.movieTitle}" 
                         style="width: 80px; height: 120px; object-fit: cover; border-radius: 0.5rem; cursor: pointer;"
                         onclick="window.location.href='index.html?movie=${review.movieId}'">
                    <div style="flex: 1;">
                        <h4 style="margin-bottom: 0.5rem; color: var(--text-light); cursor: pointer;" 
                            onclick="window.location.href='index.html?movie=${review.movieId}'">
                            ${review.movieTitle}
                        </h4>
                        ${UIUtils.renderStarRating(review.rating, 10)}
                        <p style="color: var(--text-muted); line-height: 1.6; margin: 0.5rem 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                            ${review.text}
                        </p>
                        <div class="review-date" style="color: var(--text-muted); font-size: 0.875rem;">
                            ${review.createdAt.toLocaleDateString('ko-KR')}
                        </div>
                    </div>
                </div>
                <div class="review-actions">
                    <button class="btn btn-secondary btn-small" onclick="editReviewFromMyPage('${review.id}', '${review.movieId}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-small" onclick="confirmDeleteReview('${review.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderEmptyReviews() {
    const container = document.getElementById('myReviewsList');
    container.innerHTML = `
        <div class="card text-center" style="padding: 3rem 1rem;">
            <i class="fas fa-comment-slash" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
            <p style="color: var(--text-muted); margin-bottom: 1.5rem;">아직 작성한 리뷰가 없습니다.</p>
            <button class="btn btn-primary" onclick="window.location.href='index.html'">
                영화 둘러보기
            </button>
        </div>
    `;
}

function updateStatistics(reviews) {
    // 리뷰 개수
    const reviewCount = reviews.length;
    document.getElementById('review-count').textContent = `총 ${reviewCount}개`;
    document.getElementById('total-reviews').textContent = `${reviewCount}개`;
    
    // 평균 평점 계산
    let avgRating = 0;
    if (reviewCount > 0) {
        avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount;
    }
    
    document.getElementById('avg-rating').textContent = avgRating.toFixed(1);
    
    // 평균 평점 별 표시
    const avgStarsContainer = document.getElementById('avg-rating-stars');
    const fullStars = Math.floor(avgRating / 2); // 10점 만점을 5개 별로 변환
    const halfStar = (avgRating % 2) >= 1;
    
    let starsHtml = '';
    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            starsHtml += '<span class="star filled" style="font-size: 1.5rem;">★</span>';
        } else if (i === fullStars && halfStar) {
            starsHtml += '<span class="star filled" style="font-size: 1.5rem;">★</span>';
        } else {
            starsHtml += '<span class="star" style="font-size: 1.5rem;">★</span>';
        }
    }
    avgStarsContainer.innerHTML = starsHtml;
    
    // 최근 활동
    if (reviewCount > 0) {
        const latestReview = reviews[0]; // 이미 정렬됨
        const daysDiff = Math.floor((new Date() - latestReview.createdAt) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 0) {
            document.getElementById('recent-activity').textContent = '오늘';
        } else if (daysDiff === 1) {
            document.getElementById('recent-activity').textContent = '어제';
        } else {
            document.getElementById('recent-activity').textContent = `${daysDiff}일 전`;
        }
    } else {
        document.getElementById('recent-activity').textContent = '-';
    }
    
    // 활동 요약
    const summaryText = reviewCount > 0 
        ? `총 <span style="color: var(--accent-color); font-weight: 600;">${reviewCount}개</span>의 리뷰를 작성하셨고, 평균 <span style="color: var(--accent-color); font-weight: 600;">${avgRating.toFixed(1)}점</span>을 주셨습니다.`
        : '아직 작성한 리뷰가 없습니다. 영화를 감상하고 첫 리뷰를 남겨보세요!';
    
    document.getElementById('activity-summary').innerHTML = summaryText;
}

function setupEventListeners() {
    // 프로필 수정 버튼
    document.getElementById('editProfileBtn').addEventListener('click', () => {
        showModal('profile-modal');
    });
    
    // 프로필 수정 폼 제출
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nickname = document.getElementById('edit-nickname').value.trim();
        const email = document.getElementById('edit-email').value.trim();
        const phone = document.getElementById('edit-phone').value.trim();
        
        if (!nickname || !email) {
            UIUtils.showToast('닉네임과 이메일은 필수입니다.', 'error');
            return;
        }
        
        // 사용자 정보 업데이트
        const currentUser = dataManager.currentUser;
        currentUser.nickname = nickname;
        currentUser.email = email;
        currentUser.phone = phone;
        
        // localStorage에 저장
        dataManager.saveUser(currentUser);
        
        // UI 업데이트
        loadProfileInfo(currentUser);
        
        UIUtils.showToast('프로필이 성공적으로 업데이트되었습니다.', 'success');
        closeModal();
    });
    
    // 로그아웃 버튼 (user-auth에 동적으로 생성됨)
    setTimeout(() => {
        const logoutBtns = document.querySelectorAll('[onclick*="logout"]');
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', handleLogout);
        });
    }, 500);
}

function handleLogout(e) {
    e.preventDefault();
    
    if (confirm('로그아웃 하시겠습니까?')) {
        localStorage.removeItem('cinema_token');
        localStorage.removeItem('cinema_user');
        dataManager.logout();
        
        UIUtils.showToast('로그아웃되었습니다.', 'info');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}

// 모달 관리
function showModal(modalId) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById(modalId);
    
    overlay.style.display = 'flex';
    modal.style.display = 'block';
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.style.display = 'none';
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    
    deleteTarget = null;
}

// 리뷰 삭제 확인
let deleteTarget = null;

function confirmDeleteReview(reviewId) {
    deleteTarget = { type: 'review', id: reviewId };
    document.getElementById('confirm-message').textContent = '이 리뷰를 삭제하시겠습니까?';
    showModal('confirm-modal');
}

document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    if (deleteTarget && deleteTarget.type === 'review') {
        try {
            await dataManager.deleteReview(deleteTarget.id);
            
            // UI에서 제거
            const reviewElement = document.querySelector(`[data-review-id="${deleteTarget.id}"]`);
            if (reviewElement) {
                reviewElement.remove();
            }
            
            // 리뷰 목록 다시 로드
            const currentUser = dataManager.currentUser;
            await loadMyReviews(currentUser.id);
            
            UIUtils.showToast('리뷰가 삭제되었습니다.', 'success');
        } catch (error) {
            console.error('리뷰 삭제 실패:', error);
            UIUtils.showToast('리뷰 삭제에 실패했습니다.', 'error');
        }
    }
    
    closeModal();
});

// 마이페이지에서 리뷰 수정

async function editReviewFromMyPage(reviewId, movieId) {
    // sessionStorage에 저장
    sessionStorage.setItem('auto_edit_review', reviewId);
    // 영화 ID를 URL에 포함해서 이동
    window.location.href = `index.html?movie=${movieId}`;
}

// 모달 오버레이 클릭시 닫기
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') {
        closeModal();
    }
});

// ESC 키로 모달 닫기
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// URL 파라미터 처리 (영화 상세 페이지에서 수정 모드로 돌아올 때)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('from') === 'detail') {
    UIUtils.showToast('영화 상세 페이지로 이동하여 리뷰를 수정하세요.', 'info');
}


async function loadMyBookmarks(userId) {
    try {
        const bookmarks = await dataManager.getMyBookmarks();
        renderMyBookmarks(bookmarks);
        
        // 통계 업데이트에 찜 개수 추가
        updateBookmarkStats(bookmarks.length);
    } catch (error) {
        console.error('찜 목록 로드 실패:', error);
    }
}

// renderMyBookmarks 함수 수정
function renderMyBookmarks(bookmarks) {
    const container = document.getElementById('myBookmarksList');
    
    if (bookmarks.length === 0) {
        container.innerHTML = `
            <div class="card text-center" style="padding: 3rem 1rem;">
                <i class="fas fa-heart" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem;">찜한 영화가 없습니다.</p>
                <button class="btn btn-primary" onclick="window.location.href='index.html'">
                    영화 둘러보기
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="ranking-grid">
            ${bookmarks.map(movie => renderBookmarkMovieCard(movie)).join('')}
        </div>
    `;
}

// 마이페이지용 영화 카드 렌더링 함수 추가
function renderBookmarkMovieCard(movie) {
    return `
        <div class="card movie-card" onclick="goToMovieDetail('${movie.id}')" style="cursor: pointer; position: relative;">
            <button class="bookmark-btn" onclick="event.stopPropagation(); toggleBookmarkInMypage('${movie.id}')" 
                    style="position: absolute; top: 1rem; right: 1rem; background: rgba(212, 175, 55, 0.8); border: none; 
                        color: #5A0F2C; padding: 0.5rem; border-radius: 50%; cursor: pointer; width: 40px; height: 40px;
                        display: flex; align-items: center; justify-content: center; font-size: 1.2rem; z-index: 10;">
                <i class="fas fa-heart"></i>
            </button>
            <img src="${movie.poster}" alt="${movie.title}" class="movie-poster" loading="lazy">
            <div class="movie-info">
                <h3>${movie.title}</h3>
                <div class="movie-meta">
                    <span class="movie-genre">${movie.genre}</span>
                    <span class="movie-year">${movie.releaseYear}</span>
                </div>
                ${renderStarRatingSimple(movie.rating)}
            </div>
        </div>
    `;
}

// 간단한 별점 렌더링 함수
function renderStarRatingSimple(rating, maxRating = 10) {
    const displayStars = 5;
    const starsToFill = Math.floor((rating / maxRating) * displayStars);
    
    let html = '<div class="star-rating">';
    for (let i = 0; i < displayStars; i++) {
        const filled = i < starsToFill;
        html += `<i class="fas fa-star star ${filled ? 'filled' : ''}"></i>`;
    }
    html += `<span class="rating-text">${rating.toFixed(1)} / ${maxRating}</span>`;
    html += '</div>';
    
    return html;
}

// 영화 상세 페이지로 이동하는 함수
function goToMovieDetail(movieId) {
    window.location.href = `index.html?movie=${movieId}`;
}

// 전역 함수로 등록
window.goToMovieDetail = goToMovieDetail;
window.renderBookmarkMovieCard = renderBookmarkMovieCard;
window.renderStarRatingSimple = renderStarRatingSimple;

// updateBookmarkStats 함수 수정
function updateBookmarkStats(count) {
    const bookmarkCountEl = document.getElementById('bookmark-count');
    if (bookmarkCountEl) {
        bookmarkCountEl.textContent = `총 ${count}개`;
    }
}

// 찜 토글 함수
async function toggleBookmarkInMypage(movieId) {
    const result = await dataManager.toggleBookmark(movieId);
    
    if (result !== null) {
        // 찜 목록 다시 로드
        const currentUser = dataManager.currentUser;
        await loadMyBookmarks(currentUser.id);
    }
}




// 전역 함수로 등록
window.showModal = showModal;
window.closeModal = closeModal;
window.confirmDeleteReview = confirmDeleteReview;
window.editReviewFromMyPage = editReviewFromMyPage;
window.toggleBookmarkInMypage = toggleBookmarkInMypage;