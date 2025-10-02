// API 기본 URL
const API_BASE_URL = 'http://localhost:8000';

// API 호출 유틸리티
class API {
    static async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                }
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || '요청 실패');
            }
            
            return await response.json();
        } catch (error) {
            console.error('API 요청 오류:', error);
            throw error;
        }
    }
    
    // ==================== 영화 API ====================
    
    static async getMovies(search = null) {
        const params = new URLSearchParams();
        if (search) params.append('query', search);
        
        const queryString = params.toString();
        const endpoint = queryString ? `/api/movies?${queryString}` : '/api/movies';  // /api 추가
        
        return await this.request(endpoint);
    }

    // 🆕 이 두 개를 getMovies 함수 바로 아래에 추가
    static async getFilterOptions() {
        const response = await fetch(`${API_BASE_URL}/api/movies/filter-options`);
        
        if (!response.ok) {
            throw new Error('필터 옵션 로드 실패');
        }
        
        return await response.json();
    }

    
    static async getMoviesWithFilter(filters) {
        const params = new URLSearchParams();
        
        if (filters.genre) params.append('genre', filters.genre);
        if (filters.country) params.append('country', filters.country);
        if (filters.year) params.append('year', filters.year);
        if (filters.minRating) params.append('min_rating', filters.minRating);
        if (filters.maxRating) params.append('max_rating', filters.maxRating);
        if (filters.query) params.append('query', filters.query);
        if (filters.limit) params.append('limit', filters.limit);
        
        const response = await fetch(`${API_BASE_URL}/api/movies/filter?${params.toString()}`);
        
        if (!response.ok) {
            throw new Error('필터링 실패');
        }
        
        return await response.json();
    }
    
    // ==================== 리뷰 API ====================
    
    static async getReviews(movieId) {
        return await this.request(`/api/reviews/${movieId}`);  // /api 추가
    }
    
    static async createReview(reviewData) {
        return await this.request('/api/reviews', {  // /api 추가
            method: 'POST',
            body: JSON.stringify(reviewData)
        });
    }
    
    static async updateReview(reviewId, reviewData) {
        return await this.request(`/api/reviews/${reviewId}`, {  // /api 추가
            method: 'PUT',
            body: JSON.stringify(reviewData)
        });
    }
    
    static async deleteReview(reviewId) {
        return await this.request(`/api/reviews/${reviewId}`, {  // /api 추가
            method: 'DELETE'
        });
    }
    
    // ==================== 검색 기록 API ====================
    
    static async getSearchHistory(userId) {
        return await this.request(`/api/users/${userId}/search-history`);
    }

    static async addSearchHistory(userId, query) {
        return await this.request(`/api/users/${userId}/search-history?query=${encodeURIComponent(query)}`, {
            method: 'POST'
        });
    }
    
    // ==================== 북마크 API ====================
    
    static async getBookmarks(userId) {
        return await this.request(`/api/bookmarks/${userId}`);
    }
    
    static async addBookmark(userId, movieId) {
        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('movie_id', movieId);
        
        const response = await fetch(`${API_BASE_URL}/bookmarks`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '요청 실패');
        }
        
        return await response.json();
    }
    
    static async removeBookmark(userId, movieId) {
        return await this.request(`/api/bookmarks/${userId}/${movieId}`, {
            method: 'DELETE'
        });
    }

    static async checkBookmark(userId, movieId) {
        return await this.request(`/api/bookmarks/${userId}/check/${movieId}`);
    }

    

    // ==================== 크롤링 API ====================

    static async searchMoviesForCrawl(query) {
        try {
            const formData = new FormData();
            formData.append('query', query);
            
            const response = await fetch(`${API_BASE_URL}/api/crawl/search`, {  // /api 추가
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || '검색 실패');
            }
            
            return data;
            
        } catch (error) {
            console.error('영화 검색 API 오류:', error);
            throw error;
        }
    }

    static async crawlMovieById(movieId, movieTitle) {
        try {
            const formData = new FormData();
            formData.append('movie_id', movieId);
            formData.append('movie_title', movieTitle);
            
            const response = await fetch(`${API_BASE_URL}/api/crawl/movie-by-id`, {  // /api 추가
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || '크롤링 실패');
            }
            
            return data;
            
        } catch (error) {
            console.error('영화 크롤링 API 오류:', error);
            throw error;
        }
    }

    static async crawlMovie(title) {
        try {
            const formData = new FormData();
            formData.append('title', title);
            
            const response = await fetch(`${API_BASE_URL}/api/crawl/movie`, {  // /api 추가
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || '크롤링 실패');
            }
            
            return data;
            
        } catch (error) {
            console.error('크롤링 API 오류:', error);
            throw error;
        }
    }

    static async getWeeklyRanking() {
        // 이렇게 수정
        const response = await fetch(`${API_BASE_URL}/api/movies?sort_by=rating&limit=10`);
        if (!response.ok) throw new Error('주간 랭킹 로드 실패');
        
        const movies = await response.json();
        
        // 이 3줄 추가
        return movies.map((movie, index) => ({
            ...movie,
            rank: index + 1
        }));
    }

    static async getMovieDetail(id) {
        return await this.request(`/api/movies/${id}`);  // /api 추가
    }

    

    


}

// 데이터 관리자
class DataManager {
    constructor() {
        this.currentUser = this.loadUser();
        this.searchHistory = [];
        this.loadSearchHistory();
    }
    
    // ==================== 사용자 관리 ====================
    
    loadUser() {
        const userData = localStorage.getItem('cinema_user');
        return userData ? JSON.parse(userData) : null;
    }
    
    saveUser(user) {
        if (user) {
            localStorage.setItem('cinema_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('cinema_user');
        }
        this.currentUser = user;
    }
    
    login(userData) {
        this.saveUser(userData);
        this.loadSearchHistory();
    }
    
    logout() {
        this.saveUser(null);
        this.searchHistory = [];
    }
    
    
    
    // ==================== 검색 기록 ====================

    async loadSearchHistory() {
        if (!this.currentUser) {
            this.searchHistory = [];
            return;
        }
        
        // 로컬스토리지에서 검색 기록 불러오기
        try {
            const historyKey = `search_history_${this.currentUser.id}`;
            const savedHistory = localStorage.getItem(historyKey);
            this.searchHistory = savedHistory ? JSON.parse(savedHistory) : [];
        } catch (error) {
            console.error('검색 기록 로드 실패:', error);
            this.searchHistory = [];
        }
    }

    async addSearchHistory(query) {
        if (!this.currentUser || !query.trim()) return;
        
        try {
            const historyKey = `search_history_${this.currentUser.id}`;
            
            // 중복 제거
            this.searchHistory = this.searchHistory.filter(q => q !== query);
            
            // 맨 앞에 추가
            this.searchHistory.unshift(query);
            
            // 최대 10개만 유지
            if (this.searchHistory.length > 10) {
                this.searchHistory = this.searchHistory.slice(0, 10);
            }
            
            // 로컬스토리지에 저장
            localStorage.setItem(historyKey, JSON.stringify(this.searchHistory));
            
        } catch (error) {
            console.error('검색 기록 추가 실패:', error);
        }
    }
    
    // ==================== 영화 데이터 ====================
    
    async searchMovies(query) {
        try {
            return await API.getMovies(query.trim() || null);
        } catch (error) {
            console.error('영화 검색 실패:', error);
            UIUtils.showToast('영화 검색에 실패했습니다.', 'error');
            return [];
        }
    }
    
    async getMovieById(id) {
        try {
            return await API.getMovieDetail(id);
        } catch (error) {
            console.error('영화 상세 조회 실패:', error);
            return null;
        }
    }
    
    async getWeeklyRanking() {
        try {
            return await API.getWeeklyRanking();
        } catch (error) {
            console.error('주간 랭킹 조회 실패:', error);
            return [];
        }
    }
    
    // ==================== 리뷰 관리 ====================
    
    async getMovieReviews(movieId) {
        try {
            const reviews = await API.getReviews(movieId);
            return reviews.map(r => ({
                ...r,
                createdAt: new Date(r.createdAt)
            }));
        } catch (error) {
            console.error('리뷰 조회 실패:', error);
            return [];
        }
    }
    
    async addReview(reviewData) {
        try {
            const review = await API.createReview(reviewData);
            return {
                ...review,
                createdAt: new Date(review.createdAt)
            };
        } catch (error) {
            console.error('리뷰 작성 실패:', error);
            throw error;
        }
    }
    
    async updateReview(reviewId, reviewData) {
        try {
            const review = await API.updateReview(reviewId, reviewData);
            return {
                ...review,
                createdAt: new Date(review.createdAt)
            };
        } catch (error) {
            console.error('리뷰 수정 실패:', error);
            throw error;
        }
    }
    
    async deleteReview(reviewId) {
        try {
            await API.deleteReview(reviewId);
        } catch (error) {
            console.error('리뷰 삭제 실패:', error);
            throw error;
        }
    }
    

    
    async getMyBookmarks() {
        if (!this.currentUser) return [];
        
        try {
            return await API.getBookmarks(this.currentUser.id);
        } catch (error) {
            console.error('찜 목록 조회 실패:', error);
            return [];
        }
    }
    
    // ==================== 평점 계산 ====================
    
    getMovieSiteRating(movie) {
        if (movie.userRating) {
            return movie.userRating;
        }
        return movie.rating;
    }
    
    getThemeByRating(rating) {
        if (rating >= 4.5) return 'premium';
        if (rating >= 3.5) return 'good';
        if (rating >= 2.5) return 'average';
        return 'poor';
    }
    
    getExpertReviews(movie) {
        return movie.expertReviews || [];
    }

        // ==================== 찜 관리 ====================

    async toggleBookmark(movieId) {
        if (!this.currentUser) {
            UIUtils.showToast('로그인이 필요합니다.', 'error');
            return null;
        }
        
        try {
            const isBookmarked = await this.checkBookmark(movieId);
            
            if (isBookmarked) {
                await API.removeBookmark(this.currentUser.id, movieId);
                UIUtils.showToast('찜 목록에서 제거되었습니다.', 'success');
                return false;
            } else {
                await API.addBookmark(this.currentUser.id, movieId);
                UIUtils.showToast('찜 목록에 추가되었습니다.', 'success');
                return true;
            }
        } catch (error) {
            console.error('찜 처리 실패:', error);
            UIUtils.showToast(error.message || '찜 처리 중 오류가 발생했습니다.', 'error');
            return null;
        }
    }

    async checkBookmark(movieId) {
        if (!this.currentUser) return false;
        
        try {
            const result = await API.checkBookmark(this.currentUser.id, movieId);
            return result.bookmarked;
        } catch (error) {
            console.error('찜 확인 실패:', error);
            return false;
        }
    }



    
}

// 전역 데이터 매니저 인스턴스
const dataManager = new DataManager();