import os
import sys
import time
import webbrowser
import subprocess
from pathlib import Path
import requests

def check_requirements():
    """필요한 패키지가 설치되어 있는지 확인"""
    try:
        import fastapi
        import uvicorn
        import sqlalchemy
        import pymysql
        print("✓ 모든 필수 패키지가 설치되어 있습니다.")
        return True
    except ImportError as e:
        print(f"✗ 필수 패키지가 설치되지 않았습니다: {e.name}")
        print("\n다음 명령어로 설치하세요:")
        print("  pip install -r backend/requirements.txt")
        return False

def check_mysql_connection():
    """MySQL 연결 확인"""
    try:
        from dotenv import load_dotenv
        import pymysql
        
        load_dotenv()
        
        config = {
            'host': os.getenv('MYSQL_HOST', 'localhost'),
            'user': os.getenv('MYSQL_USER', 'root'),
            'password': os.getenv('MYSQL_PASSWORD', ''),
            'port': int(os.getenv('MYSQL_PORT', '3306'))
        }
        
        conn = pymysql.connect(**config)
        conn.close()
        print("✓ MySQL 연결 성공")
        return True
    except Exception as e:
        print(f"✗ MySQL 연결 실패: {e}")
        print("\n.env 파일에서 MySQL 설정을 확인하세요:")
        print("  MYSQL_HOST=localhost")
        print("  MYSQL_USER=root")
        print("  MYSQL_PASSWORD=your_password")
        print("  MYSQL_DATABASE=cine21_db")
        print("  MYSQL_PORT=3306")
        return False

def start_backend():
    """FastAPI 백엔드 시작"""
    print("\n" + "="*60)
    print("FastAPI 백엔드 시작 중...")
    print("="*60)
    
    backend_dir = Path(__file__).parent / "backend"
    
    # backend 디렉토리로 이동
    os.chdir(backend_dir)
    
    # uvicorn으로 FastAPI 실행
    cmd = [
        sys.executable, "-m", "uvicorn",
        "main:app",
        "--host", "0.0.0.0",
        "--port", "8000",
        "--reload"
    ]
    
    return subprocess.Popen(cmd)

def wait_for_server(url="http://localhost:8000", timeout=30):
    """서버가 완전히 준비될 때까지 대기"""
    print("\n서버 준비 상태 확인 중...")
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            response = requests.get(url, timeout=1)
            if response.status_code == 200:
                print("✓ 서버 준비 완료!")
                return True
        except requests.exceptions.RequestException:
            pass
        
        # 진행 상황 표시
        elapsed = int(time.time() - start_time)
        print(f"  대기 중... ({elapsed}초)", end='\r')
        time.sleep(0.5)
    
    print(f"\n✗ 서버 준비 시간 초과 ({timeout}초)")
    return False

def open_browser(url="http://localhost:8000/static/index.html"):
    """브라우저 열기"""
    print("\n브라우저를 여는 중...")
    
    try:
        webbrowser.open(url)
        print(f"✓ 브라우저 오픈: {url}")
    except Exception as e:
        print(f"✗ 브라우저 열기 실패: {e}")
        print(f"   수동으로 접속하세요: {url}")
    
    print(f"\n🎬 Cinema Review 시작!")
    print(f"   메인 페이지: {url}")
    print(f"   AI 챗봇: http://localhost:8000/static/chat.html")
    print(f"   API 문서: http://localhost:8000/docs")

def main():
    """메인 실행 함수"""
    print("""
    ╔══════════════════════════════════════════════════════════╗
    ║                                                          ║
    ║            Cinema Review 통합 실행 스크립트              ║
    ║                                                          ║
    ╚══════════════════════════════════════════════════════════╝
    """)
    
    # 1. 패키지 확인
    print("\n[1/4] 패키지 확인 중...")
    if not check_requirements():
        sys.exit(1)
    
    # 2. MySQL 연결 확인
    print("\n[2/4] MySQL 연결 확인 중...")
    if not check_mysql_connection():
        print("\n⚠️  MySQL이 실행되지 않았거나 설정이 잘못되었습니다.")
        response = input("계속 진행하시겠습니까? (y/n): ")
        if response.lower() != 'y':
            sys.exit(1)
    
    # 3. 백엔드 시작
    print("\n[3/4] 백엔드 시작 중...")
    backend_process = start_backend()
    
    try:
        # 4. 서버 준비 대기 ⭐ 이게 핵심!
        print("\n[4/5] 서버 준비 대기 중...")
        if not wait_for_server():
            print("\n⚠️  서버가 제대로 시작되지 않았을 수 있습니다.")
            print("   터미널 로그를 확인하세요.")
        
        # 5. 브라우저 열기
        print("\n[5/5] 브라우저 열기...")
        time.sleep(1)  # 추가 안전 대기
        open_browser()
        
        print("\n" + "="*60)
        print("✓ Cinema Review가 성공적으로 시작되었습니다!")
        print("="*60)
        print("\n종료하려면 Ctrl+C를 누르세요.\n")
        
        # 백엔드 프로세스가 종료될 때까지 대기
        backend_process.wait()
        
    except KeyboardInterrupt:
        print("\n\n프로그램을 종료합니다...")
        backend_process.terminate()
        backend_process.wait()
        print("✓ 종료 완료")

if __name__ == "__main__":
    main()