// frontend/js/chat-widget.js


class ChatWidget {
    constructor() {
        this.isOpen = false;
        this.isLoading = false;
        this.opacity = 1.0; // 기본 투명도
        this.init();
    }

    init() {
        this.attachEventListeners();
        this.loadOpacity(); // 저장된 투명도 불러오기
    }

    attachEventListeners() {
        // 토글 버튼
        const toggleBtn = document.getElementById('chat-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.togglePanel());
        }

        // 닫기 버튼
        const closeBtn = document.getElementById('chat-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closePanel());
        }

        // 🆕 투명도 토글 버튼 (없으면 무시)
        const opacityToggleBtn = document.getElementById('opacity-toggle-btn');
        if (opacityToggleBtn) {
            opacityToggleBtn.addEventListener('click', () => this.toggleOpacitySlider());
        }

        // 🆕 투명도 슬라이더 (없으면 무시)
        const opacitySlider = document.getElementById('opacity-slider');
        if (opacitySlider) {
            opacitySlider.addEventListener('input', (e) => this.updateOpacity(e.target.value));
        }

        // 전송 버튼
        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // 입력 필드 엔터
        const input = document.getElementById('chat-input');
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !this.isLoading) {
                    this.sendMessage();
                }
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
            // 패널 닫을 때 슬라이더도 숨김
            document.getElementById('opacity-slider-container').style.display = 'none';
        }
    }

    closePanel() {
        console.log('closePanel 호출됨'); // 👈 디버그
        const panel = document.getElementById('chat-panel');
        panel.classList.remove('open');
        this.isOpen = false;
        document.getElementById('opacity-slider-container').style.display = 'none';
        console.log('채팅창 닫힘, isOpen:', this.isOpen); // 👈 디버그
    }

    // 🆕 투명도 슬라이더 토글
    toggleOpacitySlider() {
        const container = document.getElementById('opacity-slider-container');
        if (container.style.display === 'none') {
            container.style.display = 'flex';
        } else {
            container.style.display = 'none';
        }
    }

    // 🆕 투명도 업데이트
    updateOpacity(value) {
        this.opacity = value / 100;
        const panel = document.getElementById('chat-panel');
        panel.style.opacity = this.opacity;
        
        // 값 표시
        document.getElementById('opacity-value').textContent = value + '%';
        
        // 로컬 스토리지에 저장
        localStorage.setItem('chatOpacity', value);
    }

    // 🆕 저장된 투명도 불러오기
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

        // 사용자 메시지 표시
        this.addMessage(message, 'user');
        input.value = '';

        // 로딩 표시
        this.isLoading = true;
        document.getElementById('chat-send-btn').disabled = true;
        this.addTypingIndicator();

        try {
            // ⭐ 전체 URL로 변경
            const response = await fetch('http://localhost:8000/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: message,
                    top_k: 5
                })
            });

            if (!response.ok) throw new Error('API 요청 실패');

            const data = await response.json();
            
            // 로딩 제거
            this.removeTypingIndicator();

            // AI 답변 표시
            this.addMessage(data.answer, 'bot', data.movies);

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
        
        // 환영 메시지 제거
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

        // 영화 카드 추가
        if (movies && movies.length > 0) {
            const moviesDiv = document.createElement('div');
            moviesDiv.className = 'chat-message bot';
            
            let moviesHTML = '<div class="chat-message-avatar">🎬</div><div class="chat-message-content">';
            
            movies.slice(0, 3).forEach(movie => {
                const year = movie.release_date && movie.release_date !== '미정' 
                    ? movie.release_date.substring(0, 4) 
                    : '미정';
                
                moviesHTML += `
                    <div class="chat-movie-card" onclick="window.open('https://www.themoviedb.org/search?query=${encodeURIComponent(movie.title)}', '_blank')">
                        <h5>🎬 ${movie.title} (${year})</h5>
                        <p>⭐ ${movie.vote_average}/10</p>
                    </div>
                `;
            });
            
            moviesHTML += '</div>';
            moviesDiv.innerHTML = moviesHTML;
            messagesDiv.appendChild(moviesDiv);
        }

        // 스크롤 하단으로
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
                <div class="chat-message-bubble">
                    <div class="chat-typing">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;
        messagesDiv.appendChild(typingDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    removeTypingIndicator() {
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();
    }
}

// 제안 버튼 클릭 핸들러
function sendSuggestion(text) {
    const input = document.getElementById('chat-input');
    input.value = text;
    if (window.chatWidget) {
        window.chatWidget.sendMessage();
    }
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.chatWidget = new ChatWidget();
});