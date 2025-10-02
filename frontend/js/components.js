// UI 유틸리티 함수들
class UIUtils {
        static showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // 아이콘 추가
        const icons = {
            'success': '✅',
            'error': '❌',
            'info': 'ℹ️',
            'warning': '⚠️'
        };
        
        const icon = icons[type] || 'ℹ️';
        toast.innerHTML = `<span style="margin-right: 8px;">${icon}</span>${message}`;
        
        container.appendChild(toast);
        
        // 애니메이션
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 10);
        
        // duration 후 제거
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100px)';
                
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }
        }, duration);
        
        return toast; // 토스트 엘리먼트 반환 (나중에 제거 가능)
    }
    static showModal(modalId) {
        const overlay = document.getElementById('modal-overlay');
        const modal = document.getElementById(modalId);
        
        overlay.style.display = 'flex';
        modal.style.display = 'block';
        
        document.querySelectorAll('.modal').forEach(m => {
            if (m.id !== modalId) {
                m.style.display = 'none';
            }
        });
    }

    static hideModal() {
        const overlay = document.getElementById('modal-overlay');
        overlay.style.display = 'none';
        
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    static renderStarRating(rating, maxRating = 10, isInteractive = false) {
        let html = '<div class="star-rating">';
        
        const displayStars = 5;
        // 10점 만점을 5개 별로 변환
        const starsToFill = Math.floor((rating / maxRating) * displayStars);
        
        for (let i = 0; i < displayStars; i++) {
            const filled = i < starsToFill;
            const classes = `star ${filled ? 'filled' : ''} ${isInteractive ? 'interactive' : ''}`;
            const onclick = isInteractive ? `onclick="handleStarClick(${i + 1})"` : '';
            
            html += `<i class="fas fa-star ${classes}" ${onclick}></i>`;
        }
        
        if (!isInteractive) {
            html += `<span class="rating-text">${rating.toFixed(1)} / ${maxRating}</span>`;
        }
        
        html += '</div>';
        return html;
    }

    static renderMovieCard(movie, showRank = false, showBookmark = false) {
        const rankHtml = showRank && movie.rank ? `<div class="movie-rank">${movie.rank}</div>` : '';
        
        const bookmarkHtml = showBookmark ? `
            <button class="bookmark-btn" onclick="event.stopPropagation(); toggleBookmarkInMypage('${movie.id}')" 
                    style="position: absolute; top: 1rem; right: 1rem; background: rgba(212, 175, 55, 0.8); border: none; 
                        color: #5A0F2C; padding: 0.5rem; border-radius: 50%; cursor: pointer; width: 40px; height: 40px;
                        display: flex; align-items: center; justify-content: center; font-size: 1.2rem; z-index: 10;">
                <i class="fas fa-heart"></i>
            </button>
        ` : '';
        
        return `
            <div class="card movie-card" onclick="showMovieDetail('${movie.id}')">
                ${rankHtml}
                ${bookmarkHtml}
                <img src="${movie.poster}" alt="${movie.title}" class="movie-poster" loading="lazy">
                <div class="movie-info">
                    <h3>${movie.title}</h3>
                    <div class="movie-meta">
                        <span class="movie-genre">${movie.genre}</span>
                        <span class="movie-year">${movie.releaseYear}</span>
                    </div>
                    ${UIUtils.renderStarRating(movie.rating)}
                </div>
            </div>
        `;
    }

    static renderExpertReviewCard(review) {
        return `
            <div class="review-card ${review.sentiment}">
                <div class="review-author">${review.author}</div>
                ${UIUtils.renderStarRating(review.rating)}
                <div class="review-text">${review.text}</div>
            </div>
        `;
    }

    static renderAudienceReviewCard(review) {
        // 10점 만점 시스템: 별 1개 = 2점, 별 5개 = 10점
        const maxStars = 5;
        const displayRating = review.rating / 2; // 10점을 5별로 변환
        
        return `
            <div class="review-card ${review.sentiment}">
                <div class="review-author">${review.author}</div>
                <div class="star-rating">
                    ${Array(maxStars).fill(0).map((_, i) => {
                        const filled = i < Math.floor(displayRating);
                        return `<i class="fas fa-star ${filled ? 'filled' : ''}"></i>`;
                    }).join('')}
                    <span class="rating-text">${review.rating.toFixed(1)} / 10</span>
                </div>
                <div class="review-text">${review.text}</div>
            </div>
        `;
    }

    static renderUserReviewItem(review, currentUser) {
        const isOwnReview = currentUser && currentUser.id === review.userId;
        const reviewActions = isOwnReview ? `
            <div class="review-controls">
                <button class="btn btn-ghost btn-small" onclick="window.editReview('${review.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-ghost btn-small" onclick="window.deleteReview('${review.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        ` : '';

        return `
            <div class="user-review-item">
                <div class="review-item-header">
                    <div class="review-author-info">
                        <span class="review-author">${review.author}</span>
                        ${UIUtils.renderStarRating(review.rating, 10)}
                    </div>
                    <div class="review-actions">
                        <span class="review-date">${review.createdAt.toLocaleDateString('ko-KR')}</span>
                        ${reviewActions}
                    </div>
                </div>
                <p class="review-text">${review.text}</p>
            </div>
        `;
    }

    static renderPagination(currentPage, totalPages, onPageChange) {
        if (totalPages <= 1) return '';

        let html = '<div class="pagination">';
        
        html += `
            <button ${currentPage === 1 ? 'disabled' : ''} onclick="${onPageChange}(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        for (let i = 1; i <= totalPages; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            html += `<button class="${activeClass}" onclick="${onPageChange}(${i})">${i}</button>`;
        }
        
        html += `
            <button ${currentPage === totalPages ? 'disabled' : ''} onclick="${onPageChange}(${currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        html += '</div>';
        return html;
    }

    static applyTheme(theme) {
        const body = document.body;
        body.classList.remove('minor-premium', 'minor-good', 'minor-average', 'minor-poor', 'minor-default');
        body.classList.add(`minor-${theme}`);
    }
}

// 컴포넌트 렌더러
class ComponentRenderer {
        
        static async renderUserAuth() {
            const container = document.getElementById('user-auth');
            const user = dataManager.currentUser;
            
            if (user) {
                await dataManager.loadSearchHistory();
                
                const historyHtml = `
                    <div class="search-history">
                        <button class="search-history-btn" onclick="toggleSearchHistory()">
                            <i class="fas fa-history"></i> 검색 이력
                        </button>
                        <div id="search-history-dropdown" class="search-history-dropdown">
                            ${dataManager.searchHistory.length > 0 
                                ? dataManager.searchHistory.map(query => `
                                    <div class="search-history-item" onclick="searchFromHistory('${query}')">${query}</div>
                                `).join('')
                                : '<div class="search-history-item" style="color: #999; cursor: default;">검색 이력이 없습니다</div>'
                            }
                        </div>
                    </div>
                `;

                // 관리자 버튼 추가
                const adminBtn = (user.user_id === 'admin' || user.user_id === 'eodud956') 
                    ? `<a href="admin.html" class="btn btn-warning btn-small" style="text-decoration: none;">
                        <i class="fas fa-cog"></i> 관리자
                    </a>` 
                    : '';

                container.innerHTML = `
                    <div class="user-auth">
                        <div class="user-info">
                            <span>안녕하세요, ${user.nickname}님!</span>
                            ${adminBtn}
                            <a href="mypage.html" class="btn btn-primary btn-small" style="text-decoration: none;">
                                <i class="fas fa-user"></i> 마이페이지
                            </a>
                            <button class="btn btn-secondary btn-small" onclick="logout()">로그아웃</button>
                        </div>
                        ${historyHtml}
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="user-auth">
                        <button class="btn btn-primary btn-small" onclick="window.location.href='login.html'">로그인</button>
                        <button class="btn btn-secondary btn-small" onclick="window.location.href='register.html'">회원가입</button>
                    </div>
                `;
            }
        }

    static async renderWeeklyRanking() {
        const mainContent = document.getElementById('main-content');
        
        try {
            const movies = await dataManager.getWeeklyRanking();
            
            mainContent.innerHTML = `
                <div class="weekly-ranking">
                    <h2>금주의 영화 순위</h2>
                    <div class="ranking-grid">
                        ${movies.map(movie => UIUtils.renderMovieCard(movie, true)).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            mainContent.innerHTML = '<div class="text-center"><p>데이터를 불러올 수 없습니다.</p></div>';
        }
    }



    static async renderSearchResults(movies, query) {
        const mainContent = document.getElementById('main-content');
        
        if (movies.length === 0) {
            // 검색 결과 없을 때 - 크롤링 버튼 표시
            mainContent.innerHTML = `
                <div class="search-results">
                    <div class="results-header">
                        <h2>"${query}" 검색 결과</h2>
                        <button class="btn btn-secondary" onclick="showHome()">
                            <i class="fas fa-arrow-left"></i> 홈으로
                        </button>
                    </div>
                    <div class="card text-center" style="padding: 3rem 1rem;">
                        <i class="fas fa-search" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                        <h3 style="margin-bottom: 1rem;">검색 결과가 없습니다</h3>
                        <p style="color: var(--text-muted); margin-bottom: 2rem;">
                            "${query}" 영화를 찾을 수 없습니다.<br>
                            Cine21에서 실시간으로 검색해올까요?
                        </p>
                        <button class="btn btn-primary btn-large" 
                                onclick="crawlMovieFromSearch('${query}')"
                                style="padding: 15px 30px; font-size: 18px;">
                            <i class="fas fa-download"></i> Cine21에서 "${query}" 크롤링하기
                        </button>
                    </div>
                </div>
            `;
        } else {
            // 검색 결과 있을 때 - 영화 목록 + 하단에 추가 크롤링 옵션
            mainContent.innerHTML = `
                <div class="search-results">
                    <div class="results-header">
                        <h2>"${query}" 검색 결과 (${movies.length}개)</h2>
                        <button class="btn btn-secondary" onclick="showHome()">
                            <i class="fas fa-arrow-left"></i> 홈으로
                        </button>
                    </div>
                    <div class="ranking-grid">
                        ${movies.map(movie => UIUtils.renderMovieCard(movie, false)).join('')}
                    </div>
                    
                    <!-- 🆕 추가 크롤링 옵션 -->
                    <div class="additional-crawl-section">
                        <div class="crawl-option-card">
                            <div class="crawl-option-icon">🎬</div>
                            <div class="crawl-option-content">
                                <h4>찾으시는 영화가 없나요?</h4>
                                <p>Cine21에서 직접 검색해보세요</p>
                            </div>
                            <button class="btn btn-primary" onclick="crawlMovieFromSearch('${query}')">
                                <i class="fas fa-search"></i> 추가 크롤링
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }

        static async renderMovieDetail(movie) {
        const mainContent = document.getElementById('main-content');
        const userReviews = await dataManager.getMovieReviews(movie.id);
        const currentUser = dataManager.currentUser;

        // 찜 여부 확인
        const isBookmarked = currentUser ? await dataManager.checkBookmark(movie.id) : false;

        // 수정 모드 확인
        const isEditMode = window.currentEditingReview ? true : false;
        
        // 현재 사용자가 이미 리뷰를 작성했는지 확인 (수정 모드가 아닐 때만)
        const userHasReview = !isEditMode && currentUser && 
        userReviews.some(review => review.userId === currentUser.id);
            
        
        const totalRating = dataManager.getMovieSiteRating(movie);
        const expertReviews = movie.expertReviews || [];
        const audienceReviews = movie.audienceReviews || [];

        // 찜 버튼 HTML
        const bookmarkButton = currentUser ? `
            <button 
                class="btn ${isBookmarked ? 'btn-primary' : 'btn-secondary'}" 
                onclick="toggleBookmark('${movie.id}')"
                id="bookmark-btn"
                style="display: flex; align-items: center; gap: 0.5rem;"
            >
                <i class="fas fa-heart ${isBookmarked ? '' : 'far'}"></i>
                ${isBookmarked ? '찜 취소' : '찜하기'}
            </button>
        ` : '';

        mainContent.innerHTML = `
            <div class="movie-detail">
                <div style="display: flex; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap;">
                    <button class="btn btn-secondary" onclick="goBack()">
                        <i class="fas fa-arrow-left"></i> 뒤로가기
                    </button>
                    ${bookmarkButton}
                </div>
                
                <!-- 영화 정보 카드 -->
                <div class="card">
                    <div class="movie-header">
                        <img src="${movie.poster}" alt="${movie.title}" class="movie-poster-large">
                        <div class="movie-details">
                            <h1 class="movie-title">${movie.title}</h1>
                            <div class="movie-badges">
                                <span class="badge">${movie.genre}</span>
                                <span class="text-muted">${movie.releaseYear}</span>
                                <span class="text-muted">${movie.duration}</span>
                            </div>
                            <div class="mb-3">
                                <span class="text-muted">감독: </span>
                                <span>${movie.director}</span>
                            </div>
                            <div class="synopsis">
                                <h3>줄거리</h3>
                                <p>${movie.synopsis}</p>
                            </div>
                        </div>
                    </div>
                </div>

                ${expertReviews.length > 0 ? `
                <div class="expert-reviews">
                    <h3>전문가 리뷰</h3>
                    <div class="reviews-grid">
                        ${expertReviews.map(review => UIUtils.renderExpertReviewCard(review)).join('')}
                    </div>
                </div>
                ` : ''}

                ${audienceReviews.length > 0 ? `
                <div class="expert-reviews" id="audience-reviews-section">
                    <h3>크롤링된 관객 리뷰 (${audienceReviews.length}개)</h3>
                    <div class="reviews-grid" id="audience-reviews-grid">
                        ${audienceReviews.slice(0, 10).map(review => UIUtils.renderAudienceReviewCard(review)).join('')}
                    </div>
                    ${audienceReviews.length > 10 ? `
                        <div class="text-center mt-3">
                            <button class="btn btn-secondary" onclick="loadMoreAudienceReviews()">
                                <i class="fas fa-chevron-down"></i> 더보기 (${audienceReviews.length - 10}개 남음)
                            </button>
                        </div>
                    ` : ''}
                </div>
                ` : ''}

                <div class="ratings-summary">
                    <h3 class="text-center mb-3">평점</h3>
                    <div class="ratings-grid">
                        <div class="rating-item">
                            <div class="rating-label">관객 평점</div>
                            ${UIUtils.renderStarRating(movie.audienceRating)}
                        </div>
                        <div class="rating-item">
                            <div class="rating-label">전문가 평점</div>
                            ${UIUtils.renderStarRating(movie.criticRating)}
                        </div>
                    </div>
                    <div class="total-rating">
                        <div class="rating-label">${movie.userRating ? '사이트 평점' : '종합 평점'}</div>
                        ${UIUtils.renderStarRating(totalRating)}
                        ${movie.userRating && userReviews.length > 0 ? `<div class="rating-count">(${userReviews.length}개 리뷰)</div>` : ''}
                    </div>
                </div>

                <div class="user-reviews">
                    <h3>사용자 리뷰</h3>
                    ${ComponentRenderer.renderReviewForm(movie.id, currentUser, userHasReview)}
                    ${ComponentRenderer.renderUserReviewList(userReviews, currentUser)}
                </div>
            </div>
        `;
        
        // 수정 모드일 때 별점 초기화
        if (window.currentEditingReview) {
            setTimeout(() => {
                const starCount = Math.ceil(window.currentEditingReview.rating / 2);
                window.handleStarClick(starCount);
            }, 100);
        }
    }

    static renderReviewForm(movieId, currentUser, userHasReview) {
        if (!currentUser) {
            return `
                <div class="review-form text-center">
                    <p class="text-muted">로그인 후 리뷰 작성이 가능합니다.</p>
                </div>
            `;
        }

        const isEditing = window.currentEditingReview;
        
        if (userHasReview && !isEditing) {
            return `
                <div class="review-form text-center">
                    <p class="text-muted">이미 리뷰를 작성하셨습니다. 아래에서 수정하거나 삭제할 수 있습니다.</p>
                </div>
            `;
        }

        const reviewData = isEditing || { rating: 0, text: '' };
        const displayStars = isEditing ? Math.ceil(reviewData.rating / 2) : 0;

        return `
            <div class="review-form">
                <h4>${isEditing ? '리뷰 수정' : '리뷰 작성'}</h4>
                <form id="review-form" onsubmit="submitReview(event, '${movieId}')">
                    <div class="form-group">
                        <label>별점 * (별 1개 = 2점, 최대 10점)</label>
                        <div class="rating-input">
                            <div id="star-rating-input">
                                ${[1,2,3,4,5].map(i => `<i class="fas fa-star star interactive ${i <= displayStars ? 'filled' : ''}" onclick="handleStarClick(${i})"></i>`).join('')}
                            </div>
                            <span id="rating-display">(${reviewData.rating}/10)</span>
                        </div>
                        <input type="hidden" id="rating-value" value="${reviewData.rating}" required>
                    </div>
                    
                    <div class="form-group">
                        <label>리뷰 내용 *</label>
                        <textarea 
                            id="review-text" 
                            placeholder="영화에 대한 솔직한 리뷰를 작성해주세요..." 
                            maxlength="200" 
                            required
                            oninput="updateCharCount()"
                        >${reviewData.text}</textarea>
                        <div id="char-count" class="char-count">
                            <span><span id="current-count">${reviewData.text.length}</span>/200자</span>
                            <span id="remaining-count">${200 - reviewData.text.length}자 남음</span>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            ${isEditing ? '수정 완료' : '리뷰 등록'}
                        </button>
                        ${isEditing ? '<button type="button" class="btn btn-secondary" onclick="cancelEdit()">취소</button>' : ''}
                    </div>
                </form>
            </div>
        `;
    }

    static renderUserReviewList(reviews, currentUser) {
        if (reviews.length === 0) {
            return `
                <div class="user-review-list">
                    <div class="card text-center">
                        <p class="text-muted">아직 작성된 리뷰가 없습니다.</p>
                    </div>
                </div>
            `;
        }

        const reviewsPerPage = 10;
        const currentPage = window.currentReviewPage || 1;
        const totalPages = Math.ceil(reviews.length / reviewsPerPage);
        const startIndex = (currentPage - 1) * reviewsPerPage;
        const endIndex = startIndex + reviewsPerPage;
        const currentReviews = reviews.slice(startIndex, endIndex);

        return `
            <div class="user-review-list">
                <div class="review-header">
                    <h4>사용자 리뷰 (${reviews.length}개)</h4>
                    ${totalPages > 1 ? `<span class="text-muted">${currentPage} / ${totalPages} 페이지</span>` : ''}
                </div>
                
                <div class="reviews-container">
                    ${currentReviews.map(review => UIUtils.renderUserReviewItem(review, currentUser)).join('')}
                </div>
                
                ${UIUtils.renderPagination(currentPage, totalPages, 'changeReviewPage')}
            </div>
        `;
    }
}