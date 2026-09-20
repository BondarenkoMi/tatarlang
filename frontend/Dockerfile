FROM node:22-alpine AS development

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

FROM development AS build
ARG REACT_APP_API_URL=/api/v1
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

FROM nginx:1.27-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
