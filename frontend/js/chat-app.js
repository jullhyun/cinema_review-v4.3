// frontend/js/chat-app.js
// Vanilla JavaScript로 구현한 AI 챗봇

const API_BASE = 'http://localhost:8000/ai';

class MovieChatApp {
    constructor() {
        this.messages = [];
        this.isLoading = false;
        this.selectedMovie = null;
        this.init();
    }

    init() {
        
        this.renderUI();
        this.attachEventListeners();
    }

    renderUI() {
        const root = document.getElementById('chat-root');
        if (!root) return;

        root.innerHTML = `
            <div class="chat-container">
                <!-- 헤더 -->
                <header class="chat-header">
                    <button class="back-btn" onclick="window.location.href='index.html'">
                        ← 뒤로
                    </button>
                    <h1>🎬 AI 영화 추천</h1>
                </header>

                <!-- 메시지 영역 -->
                <div class="messages" id="messages">
                    <div class="welcome">
                        <h2>어떤 영화를 찾으시나요?</h2>
                        <p>장르, 감독, 배우, 분위기 등을 알려주세요!</p>
                    </div>
                </div>

                <!-- 입력 영역 -->
                <div class="input-area">
                    <input 
                        type="text" 
                        id="user-input" 
                        placeholder="예: 감동적인 영화 추천해줘"
                    />
                    <button id="send-btn">전송</button>
                </div>
            </div>

            <!-- 영화 상세 모달 -->
            <div class="modal" id="movie-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="modal-title">영화 제목</h2>
                        <button class="close-btn" id="close-modal">×</button>
                    </div>
                    <div class="modal-body" id="modal-body">
                        <!-- 동적 생성 -->
                    </div>
                </div>
            </div>
        `;

        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('chat-styles')) return;

        const style = document.createElement('style');
        style.id = 'chat-styles';
        style.textContent = `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body { 
                font-family: 'Noto Sans KR', 'Segoe UI', sans-serif; 
                overflow: hidden;
            }
            
            .chat-container {
                display: flex;
                flex-direction: column;
                height: 100vh;
                background: linear-gradient(135deg, #1e1b4b 0%, #581c87 100%);
            }
            
            .chat-header {
                background: rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(10px);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                padding: 1rem 2rem;
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            
            .chat-header h1 {
                color: white;
                font-size: 1.5rem;
                margin: 0;
            }
            
            .back-btn {
                background: rgba(255, 255, 255, 0.1);
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 8px;
                cursor: pointer;
                transition: background 0.3s;
            }
            
            .back-btn:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            .messages {
                flex: 1;
                overflow-y: auto;
                padding: 2rem;
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }
            
            .messages::-webkit-scrollbar {
                width: 8px;
            }
            
            .messages::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.1);
            }
            
            .messages::-webkit-scrollbar-thumb {
                background: rgba(168, 85, 247, 0.5);
                border-radius: 4px;
            }
            
            .welcome {
                text-align: center;
                color: white;
                padding: 4rem 2rem;
            }
            
            .welcome h2 {
                font-size: 2rem;
                margin-bottom: 1rem;
            }
            
            .welcome p {
                color: rgba(255, 255, 255, 0.7);
                font-size: 1.1rem;
            }
            
            .message {
                display: flex;
                gap: 1rem;
                max-width: 85%;
                animation: slideIn 0.3s ease-out;
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .message.user {
                margin-left: auto;
                flex-direction: row-reverse;
            }
            
            .message-content {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                padding: 1rem 1.5rem;
                border-radius: 1rem;
                color: white;
                white-space: pre-wrap;
                line-height: 1.6;
            }
            
            .message.user .message-content {
                background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
            }
            
            .movie-cards {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 1rem;
                margin-top: 1rem;
            }
            
            .movie-card {
                background: rgba(0, 0, 0, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 1rem;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .movie-card:hover {
                border-color: #a855f7;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
            }
            
            .movie-card h3 {
                color: white;
                font-size: 1rem;
                margin-bottom: 0.5rem;
                font-weight: 600;
            }
            
            .movie-card .genre {
                color: #cbd5e1;
                font-size: 0.875rem;
                margin-bottom: 0.5rem;
            }
            
            .movie-card .rating {
                color: #fbbf24;
                font-size: 0.875rem;
            }
            
            .input-area {
                background: rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(10px);
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                padding: 1.5rem 2rem;
                display: flex;
                gap: 1rem;
            }
            
            .input-area input {
                flex: 1;
                background: rgba(255, 255, 255, 0.1);
                border: none;
                padding: 1rem 1.5rem;
                border-radius: 2rem;
                color: white;
                font-size: 1rem;
                outline: none;
            }
            
            .input-area input::placeholder {
                color: rgba(255, 255, 255, 0.5);
            }
            
            .input-area button {
                background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
                color: white;
                border: none;
                padding: 1rem 2rem;
                border-radius: 2rem;
                cursor: pointer;
                font-weight: bold;
                transition: opacity 0.3s;
            }
            
            .input-area button:hover:not(:disabled) {
                opacity: 0.9;
            }
            
            .input-area button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .loading {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 3px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top-color: white;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            .modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(5px);
                align-items: center;
                justify-content: center;
                z-index: 1000;
                padding: 2rem;
            }
            
            .modal.active {
                display: flex;
            }
            
            .modal-content {
                background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                border: 1px solid rgba(168, 85, 247, 0.3);
                border-radius: 1rem;
                padding: 2rem;
                max-width: 600px;
                width: 100%;
                max-height: 80vh;
                overflow-y: auto;
                color: white;
                animation: modalSlideIn 0.3s ease-out;
            }
            
            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: start;
                margin-bottom: 1.5rem;
            }
            
            .modal-header h2 {
                flex: 1;
                font-size: 1.8rem;
                margin: 0;
            }
            
            .close-btn {
                background: none;
                border: none;
                color: white;
                font-size: 2rem;
                cursor: pointer;
                padding: 0;
                line-height: 1;
                transition: color 0.3s;
            }
            
            .close-btn:hover {
                color: #a855f7;
            }
            
            .modal-body {
                display: grid;
                gap: 1rem;
            }
            
            .info-row {
                display: flex;
                gap: 1rem;
            }
            
            .info-label {
                color: #a855f7;
                font-weight: bold;
                min-width: 80px;
            }
            
            .info-value {
                flex: 1;
                color: #cbd5e1;
                line-height: 1.6;
            }
            
            @media (max-width: 768px) {
                .chat-header h1 {
                    font-size: 1.2rem;
                }
                
                .welcome h2 {
                    font-size: 1.5rem;
                }
                
                .message {
                    max-width: 95%;
                }
                
                .movie-cards {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }

    attachEventListeners() {
        const input = document.getElementById('user-input');
        const sendBtn = document.getElementById('send-btn');
        const closeModal = document.getElementById('close-modal');

        sendBtn.addEventListener('click', () => this.sendMessage());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        closeModal.addEventListener('click', () => this.closeModal());

        // 모달 외부 클릭시 닫기
        document.getElementById('movie-modal').addEventListener('click', (e) => {
            if (e.target.id === 'movie-modal') {
                this.closeModal();
            }
        });
    }

    async sendMessage() {
        const input = document.getElementById('user-input');
        const message = input.value.trim();

        if (!message || this.isLoading) return;

        this.addMessage(message, 'user');
        input.value = '';

        this.isLoading = true;
        document.getElementById('send-btn').disabled = true;
        this.addLoadingMessage();

        try {
            const response = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: message,
                    top_k: 3,
                    model: 'gpt-3.5-turbo'
                })
            });

            if (!response.ok) {
                throw new Error('API 요청 실패');
            }

            const data = await response.json();
            this.removeLoadingMessage();
            this.addMessage(data.answer, 'ai', data.movies, data.gpt_suggestions);

        } catch (error) {
            this.removeLoadingMessage();
            this.addMessage('죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.', 'ai');
            console.error('Error:', error);
        } finally {
            this.isLoading = false;
            document.getElementById('send-btn').disabled = false;
        }
    }

    addMessage(content, type, movies = null, gptSuggestions = null) {
        const messagesDiv = document.getElementById('messages');
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;

        messageDiv.appendChild(contentDiv);

        // GPT 추론 제목 표시
        if (gptSuggestions && gptSuggestions.length > 0) {
            const suggestionsDiv = document.createElement('div');
            suggestionsDiv.style.cssText = `
                background: rgba(255,255,255,0.05);
                padding: 0.5rem 1rem;
                border-radius: 8px;
                margin-top: 0.5rem;
                font-size: 0.875rem;
                color: rgba(255,255,255,0.7);
            `;
            suggestionsDiv.innerHTML = `
                <div style="margin-bottom: 0.25rem;">💡 검색된 영화:</div>
                ${gptSuggestions.map(s => `<span style="color: #a855f7;">• ${s}</span>`).join(' ')}
            `;
            contentDiv.appendChild(suggestionsDiv);
        }

        // 영화 카드들
        if (movies && movies.length > 0) {
            const cardsDiv = this.createMovieCards(movies);
            contentDiv.appendChild(cardsDiv);
        }

        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    
    createMovieCards(movies) {
        const cardsDiv = document.createElement('div');
        cardsDiv.className = 'movie-cards';

        movies.forEach(movie => {
            const card = document.createElement('div');
            card.className = 'movie-card';
            card.onclick = () => this.showMovieDetail(movie);

            // TMDB 구조에 맞게 수정
            const poster = movie.poster_path || 'assets/logo.png';
            const rating = movie.vote_average || 'N/A';
            const year = movie.release_date ? movie.release_date.substring(0, 4) : '미정';

            card.innerHTML = `
                <img src="${poster}" 
                    style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 0.5rem;"
                    onerror="this.src='assets/logo.png'">
                <h3>${movie.title}</h3>
                <div class="genre">${year}</div>
                <div class="rating">
                    ⭐ ${rating}/10 (${movie.vote_count || 0}명)
                </div>
            `;

            cardsDiv.appendChild(card);
        });

        return cardsDiv;
    }

    
    showMovieDetail(movie) {
        document.getElementById('modal-title').textContent = movie.title;

        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            ${movie.poster_path ? `
            <img src="${movie.poster_path}" 
                style="width: 100%; max-height: 400px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem;">
            ` : ''}
            <div class="info-row">
                <span class="info-label">개봉</span>
                <span class="info-value">${movie.release_date || '미정'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">평점</span>
                <span class="info-value">${movie.vote_average || 'N/A'}/10 (${movie.vote_count || 0}명 평가)</span>
            </div>
            <div class="info-row">
                <span class="info-label">줄거리</span>
                <span class="info-value">${movie.overview || '정보 없음'}</span>
            </div>
        `;

        document.getElementById('movie-modal').classList.add('active');
    }





    closeModal() {
        document.getElementById('movie-modal').classList.remove('active');
    }

    addLoadingMessage() {
        const messagesDiv = document.getElementById('messages');
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message ai';
        loadingDiv.id = 'loading-message';
        loadingDiv.innerHTML = '<div class="message-content"><div class="loading"></div></div>';
        messagesDiv.appendChild(loadingDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    removeLoadingMessage() {
        const loading = document.getElementById('loading-message');
        if (loading) loading.remove();
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new MovieChatApp();
});