// API 기본 URL
const API_BASE_URL = 'http://localhost:8000/api';

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
});

// 로그인 처리
async function handleLogin(event) {
    event.preventDefault();
    
    const user_id = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!user_id || !password) {
        alert('아이디와 비밀번호를 모두 입력해주세요.');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('user_id', user_id);
        formData.append('password', password);
        
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || '로그인 실패');
        }
        
        // 토큰 저장
        localStorage.setItem('cinema_token', data.access_token);
        localStorage.setItem('cinema_user', JSON.stringify({
            id: data.user.id,
            user_id: data.user.user_id,
            username: data.user.username,
            nickname: data.user.username,
            email: data.user.email,
            created_at: data.user.created_at
        }));

        // 가입일 저장 (최초 로그인 시에만)
        if (!localStorage.getItem('user_joined_date')) {
            localStorage.setItem('user_joined_date', new Date().toLocaleDateString('ko-KR'));
        }
        
        alert(`환영합니다, ${data.user.username}님!`);
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('로그인 오류:', error);
        alert(error.message || '로그인에 실패했습니다.');
    }
}

// 회원가입 처리
async function handleSignup(event) {
    event.preventDefault();
    
    const user_id = document.getElementById('signupUserId').value.trim();
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // 유효성 검사
    if (!user_id || !username || !email || !phone || !password || !confirmPassword) {
        alert('모든 필드를 입력해주세요.');
        return;
    }
    
    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('올바른 이메일 주소를 입력해주세요.');
        return;
    }
    
    // 비밀번호 길이 검사
    if (password.length < 6) {
        alert('비밀번호는 최소 6자 이상이어야 합니다.');
        return;
    }
    
    // 비밀번호 확인
    if (password !== confirmPassword) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('user_id', user_id);
        formData.append('email', email);
        formData.append('username', username);
        formData.append('phone', phone);
        formData.append('password', password);
        
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || '회원가입 실패');
        }
        
        // 가입일 저장
        localStorage.setItem('user_joined_date', new Date().toLocaleDateString('ko-KR'));

        alert('회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.');
        window.location.href = 'login.html';
        
    } catch (error) {
        console.error('회원가입 오류:', error);
        alert(error.message || '회원가입에 실패했습니다.');
    }
}

// 기존 코드 유지하고 아래 추가

// 아이디 찾기 처리
document.addEventListener('DOMContentLoaded', function() {
    const findIdForm = document.getElementById('findIdForm');
    const verifyForm = document.getElementById('verifyForm');
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    
    if (findIdForm) {
        findIdForm.addEventListener('submit', handleFindId);
    }
    
    if (verifyForm) {
        verifyForm.addEventListener('submit', handleVerify);
    }
    
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', handleResetPassword);
    }
});

// 아이디 찾기
async function handleFindId(event) {
    event.preventDefault();
    
    const email = document.getElementById('findEmail').value.trim();
    const phone = document.getElementById('findPhone').value.trim();
    
    try {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('phone', phone);
        
        const response = await fetch(`${API_BASE_URL}/auth/find-id`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || '아이디 찾기 실패');
        }
        
        // 결과 표시
        const resultDiv = document.getElementById('findIdResult');
        const foundIdText = document.getElementById('foundIdText');
        
        // 메시지에서 아이디 추출 (예: "회원님의 아이디는 'testuser' 입니다.")
        const match = data.msg.match(/'([^']+)'/);
        if (match) {
            foundIdText.textContent = match[1];
            resultDiv.style.display = 'block';
        }
        
    } catch (error) {
        alert(error.message || '일치하는 회원 정보가 없습니다.');
    }
}

// 비밀번호 재설정 - 본인 확인
let verifiedUserId = null;
let verifiedEmail = null;

async function handleVerify(event) {
    event.preventDefault();
    
    const user_id = document.getElementById('verifyUserId').value.trim();
    const email = document.getElementById('verifyEmail').value.trim();
    
    try {
        const formData = new FormData();
        formData.append('user_id', user_id);
        formData.append('email', email);
        
        const response = await fetch(`${API_BASE_URL}/auth/request-password-reset`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || '본인 확인 실패');
        }
        
        // 인증 성공 - 새 비밀번호 입력 폼으로 전환
        verifiedUserId = user_id;
        verifiedEmail = email;
        
        document.getElementById('verifyForm').style.display = 'none';
        document.getElementById('resetPasswordForm').style.display = 'block';
        
    } catch (error) {
        alert(error.message || '일치하는 회원 정보가 없습니다.');
    }
}

// 비밀번호 재설정 - 새 비밀번호 저장
async function handleResetPassword(event) {
    event.preventDefault();
    
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    
    if (newPassword.length < 6) {
        alert('비밀번호는 최소 6자 이상이어야 합니다.');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('user_id', verifiedUserId);
        formData.append('email', verifiedEmail);
        formData.append('new_password', newPassword);
        
        const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || '비밀번호 재설정 실패');
        }
        
        alert('비밀번호가 성공적으로 변경되었습니다!');
        window.location.href = 'login.html';
        
    } catch (error) {
        alert(error.message || '비밀번호 재설정에 실패했습니다.');
    }
}