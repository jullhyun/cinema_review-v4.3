# Nginx 베이스 이미지
FROM nginx:alpine

# 기본 Nginx 설정 제거
RUN rm /etc/nginx/conf.d/default.conf

# 커스텀 Nginx 설정 복사
COPY frontend/nginx.conf /etc/nginx/conf.d/

# 프론트엔드 파일 복사
COPY frontend/ /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
COPY js/ /usr/share/nginx/html/js/
COPY css/ /usr/share/nginx/html/css/

# 포트 노출
EXPOSE 80

# Nginx 실행
CMD ["nginx", "-g", "daemon off;"]