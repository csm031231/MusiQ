FROM node:18

WORKDIR /app

# package.json과 package-lock.json 복사
COPY package.json package-lock.json ./
RUN npm install

# 전체 파일 복사
COPY . .

# Vite 서버를 외부에서 접근할 수 있도록 host를 0.0.0.0으로 설정
ENV VITE_HOST=0.0.0.0

# Vite 서버 실행 (기본적으로 5173 포트에서 실행됨)
CMD ["npx", "vite"]