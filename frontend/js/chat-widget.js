// frontend/js/chat-widget.js
// ⭐ 기존 코드 + 더보기 버튼만 추가

class ChatWidget {
    constructor() {
        this.isOpen = false;
        this.isLoading = false;
        this.opacity = 1;
        this.allMovies = [];  // ⭐ 전체 영화 목록
        this.displayedCount = 0;  // ⭐ 현재 표시된 개수
        this.init();
    }

    init() {
        this.createWidget();
        this.attachEventListeners();
        this.loadOpacity();
    }

    createWidget() {
        const widgetHTML = `
            <div class="chat-widget">
                <button class="chat-toggle-btn" id="chat-toggle">
                    💬
                </button>

                <div class="chat-panel" id="chat-panel">
                    <div class="chat-header">
                        <h3>🎬 영화 추천 AI</h3>
                        <div class="chat-header-actions">
                            <button class="opacity-btn" id="opacity-btn" title="투명도 조절">
                                🎨
                            </button>
                            <button class="chat-close-btn" id="chat-close">✕</button>
                        </div>
                    </div>

                    <div id="opacity-slider-container" class="opacity-slider-container" style="display: none;">
                        <label>투명도: <span id="opacity-value">100%</span></label>
                        <input type="range" id="opacity-slider" min="30" max="100" value="100">
                    </div>

                    <div class="chat-messages" id="chat-messages">
                        <div class="chat-welcome">
                            <p>안녕하세요! 🎬</p>
                            <p>영화를 추천해드립니다.</p>
                            <p>예: "액션 영화 중에 전쟁 배경"</p>
                        </div>
                    </div>

                    <div class="chat-input-container">
                        <input 
                            type="text" 
                            id="chat-input" 
                            placeholder="영화를 물어보세요..."
                            autocomplete="off"
                        >
                        <button id="chat-send-btn">전송</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', widgetHTML);
    }

    attachEventListeners() {
        const toggleBtn = document.getElementById('chat-toggle');
        const closeBtn = document.getElementById('chat-close');
        const sendBtn = document.getElementById('chat-send-btn');
        const input = document.getElementById('chat-input');
        const opacityBtn = document.getElementById('opacity-btn');
        const opacitySlider = document.getElementById('opacity-slider');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.togglePanel());
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closePanel());
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !this.isLoading) {
                    this.sendMessage();
                }
            });
        }

        if (opacityBtn) {
            opacityBtn.addEventListener('click', () => this.toggleOpacitySlider());
        }

        if (opacitySlider) {
            opacitySlider.addEventListener('input', (e) => {
                this.updateOpacity(e.target.value);
            });
        }
    }

    togglePanel() {
        const panel = document.getElementById('chat-panel');
        this.isOpen = !this.isOpen;
        
        if (this.isOpen) {
            panel.classList.add('open');
        } else {
            panel.classList.remove('open');
            document.getElementById('opacity-slider-container').style.display = 'none';
        }
    }

    closePanel() {
        const panel = document.getElementById('chat-panel');
        panel.classList.remove('open');
        this.isOpen = false;
        document.getElementById('opacity-slider-container').style.display = 'none';
    }

    toggleOpacitySlider() {
        const container = document.getElementById('opacity-slider-container');
        if (container.style.display === 'none') {
            container.style.display = 'flex';
        } else {
            container.style.display = 'none';
        }
    }

    updateOpacity(value) {
        this.opacity = value / 100;
        const panel = document.getElementById('chat-panel');
        panel.style.opacity = this.opacity;
        
        document.getElementById('opacity-value').textContent = value + '%';
        localStorage.setItem('chatOpacity', value);
    }

    loadOpacity() {
        const savedOpacity = localStorage.getItem('chatOpacity');
        if (savedOpacity) {
            const slider = document.getElementById('opacity-slider');
            slider.value = savedOpacity;
            this.updateOpacity(savedOpacity);
        }
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();

        if (!message || this.isLoading) return;

        this.addMessage(message, 'user');
        input.value = '';

        this.isLoading = true;
        document.getElementById('chat-send-btn').disabled = true;
        this.addTypingIndicator();

        try {
            const response = await fetch('http://localhost:8000/ai/chat', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({
                    question: message,
                    top_k: 5,
                    max_results: 20  // ⭐ 최대 20개 요청
                })
            });

            if (!response.ok) throw new Error('API 요청 실패');

            const data = await response.json();
            
            this.removeTypingIndicator();

            // ⭐ 전체 영화 목록 저장
            this.allMovies = data.movies || [];
            this.displayedCount = 0;

            // AI 답변 + 영화 카드 표시 (처음 3개만)
            this.addMessage(data.answer, 'bot', this.allMovies.slice(0, 3));

        } catch (error) {
            console.error('Error:', error);
            this.removeTypingIndicator();
            this.addMessage('죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.', 'bot');
        } finally {
            this.isLoading = false;
            document.getElementById('chat-send-btn').disabled = false;
        }
    }

    addMessage(text, sender, movies = null) {
        const messagesDiv = document.getElementById('chat-messages');
        
        const welcome = messagesDiv.querySelector('.chat-welcome');
        if (welcome) welcome.remove();

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;

        const avatar = sender === 'user' ? '👤' : '🤖';
        
        messageDiv.innerHTML = `
            <div class="chat-message-avatar">${avatar}</div>
            <div class="chat-message-content">
                <div class="chat-message-bubble">
                    ${text.replace(/\n/g, '<br>')}
                </div>
            </div>
        `;

        messagesDiv.appendChild(messageDiv);

        // ⭐ 영화 카드 추가 (처음 3개)
        if (movies && movies.length > 0) {
            this.displayedCount = movies.length;
            
            const moviesDiv = document.createElement('div');
            moviesDiv.className = 'chat-message bot';
            moviesDiv.id = 'movie-cards-container';  // ⭐ ID 추가
            
            let moviesHTML = '<div class="chat-message-avatar">🎬</div><div class="chat-message-content" id="movies-content">';
            
            movies.forEach(movie => {
                const year = movie.release_date && movie.release_date !== '미정' 
                    ? movie.release_date.split('-')[0] 
                    : '미정';
                const poster = movie.poster_path || 'assets/logo.png';
                const rating = movie.vote_average || 'N/A';
                
                moviesHTML += `
                    <div class="chat-movie-card">
                        <img src="${poster}" alt="${movie.title}" onerror="this.src='assets/logo.png'">
                        <div class="chat-movie-info">
                            <h4>${movie.title}</h4>
                            <p>⭐ ${rating}/10</p>
                            <p>${year}</p>
                        </div>
                    </div>
                `;
            });
            
            moviesHTML += '</div>';
            moviesDiv.innerHTML = moviesHTML;
            messagesDiv.appendChild(moviesDiv);

            // ⭐ 더보기 버튼 추가 (표시된 개수 < 전체 개수)
            if (this.displayedCount < this.allMovies.length) {
                this.addLoadMoreButton();
            }

            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }

    // ⭐ 더보기 버튼 추가
    addLoadMoreButton() {
        const messagesDiv = document.getElementById('chat-messages');
        const remaining = this.allMovies.length - this.displayedCount;
        
        const loadMoreDiv = document.createElement('div');
        loadMoreDiv.className = 'chat-message bot';
        loadMoreDiv.id = 'load-more-container';
        
        loadMoreDiv.innerHTML = `
            <div class="chat-message-avatar">📋</div>
            <div class="chat-message-content">
                <button class="chat-load-more-btn" onclick="chatWidget.loadMoreMovies()">
                    더보기 (+${remaining}개) 🔽
                </button>
            </div>
        `;
        
        messagesDiv.appendChild(loadMoreDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // ⭐ 더 많은 영화 로드
    loadMoreMovies() {
        const nextCount = Math.min(this.displayedCount + 3, this.allMovies.length);
        const newMovies = this.allMovies.slice(this.displayedCount, nextCount);
        
        if (newMovies.length === 0) return;
        
        // 영화 카드 추가
        const moviesContent = document.getElementById('movies-content');
        
        newMovies.forEach(movie => {
            const year = movie.release_date && movie.release_date !== '미정' 
                ? movie.release_date.split('-')[0] 
                : '미정';
            const poster = movie.poster_path || 'assets/logo.png';
            const rating = movie.vote_average || 'N/A';
            
            const cardHTML = `
                <div class="chat-movie-card fade-in">
                    <img src="${poster}" alt="${movie.title}" onerror="this.src='assets/logo.png'">
                    <div class="chat-movie-info">
                        <h4>${movie.title}</h4>
                        <p>⭐ ${rating}/10</p>
                        <p>${year}</p>
                    </div>
                </div>
            `;
            
            moviesContent.insertAdjacentHTML('beforeend', cardHTML);
        });
        
        // 표시 개수 업데이트
        this.displayedCount = nextCount;
        
        // 더보기 버튼 업데이트 또는 제거
        const loadMoreContainer = document.getElementById('load-more-container');
        
        if (this.displayedCount >= this.allMovies.length) {
            // 모두 표시했으면 버튼 제거
            if (loadMoreContainer) {
                loadMoreContainer.remove();
            }
        } else {
            // 남은 개수 업데이트
            const remaining = this.allMovies.length - this.displayedCount;
            const btn = loadMoreContainer.querySelector('.chat-load-more-btn');
            if (btn) {
                btn.textContent = `더보기 (+${remaining}개) 🔽`;
            }
        }
        
        // 스크롤
        const messagesDiv = document.getElementById('chat-messages');
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    addTypingIndicator() {
        const messagesDiv = document.getElementById('chat-messages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message bot';
        typingDiv.id = 'typing-indicator';
        
        typingDiv.innerHTML = `
            <div class="chat-message-avatar">🤖</div>
            <div class="chat-message-content">
                <div class="chat-typing">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        messagesDiv.appendChild(typingDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    removeTypingIndicator() {
        const typing = document.getElementById('typing-indicator');
        if (typing) {
            typing.remove();
        }
    }
}

// ⭐ 전역 변수로 선언 (더보기 버튼에서 접근 가능)
let chatWidget;

document.addEventListener('DOMContentLoaded', () => {
    chatWidget = new ChatWidget();
});