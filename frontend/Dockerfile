FROM node:16

WORKDIR /app

# Копируем package.json и package-lock.json отдельно для кэша npm
COPY package*.json ./

# Устанавливаем зависимости через npm ci (быстрее и стабильнее)
RUN npm ci

# Копируем весь проект
COPY . .

# Проброс порта для dev-сервера
EXPOSE 3000

# Указываем HOST=0.0.0.0 и отключаем проверку хоста
ENV HOST=0.0.0.0
ENV DANGEROUSLY_DISABLE_HOST_CHECK=true

CMD ["npm", "start"]