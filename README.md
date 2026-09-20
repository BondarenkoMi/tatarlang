# TatarEdu

Учебная платформа изучения татарского языка: организации, курсы, запись на обучение,
экзамены и афиша мероприятий. Django/DRF + React, PostgreSQL, Celery/RabbitMQ, Redis.

## Docker Compose

Запускать из корня репозитория. Нужны Docker и Docker Compose v2.

1. Скопировать `.env.example` в `.env`, если файла ещё нет.
2. Сгенерировать ключ командой ниже и вписать его в `DJANGO_SECRET_KEY` в `.env`.
   Пароли PostgreSQL/RabbitMQ для существующих томов должны остаться прежними.
3. Запустить `docker compose up --build`.

```sh
python3 -c 'import secrets; print(secrets.token_urlsafe(64))'
docker compose up --build
```

Frontend: http://localhost:3000, API: http://localhost:8000/api/v1/,
Swagger: http://localhost:8000/swagger/. Миграции выполняются отдельным сервисом
перед запуском backend и Celery. RabbitMQ хранит данные в томе; Redis используется
как восстановимый кеш. Загруженные фотографии при таком запуске лежат в `backend/media/`.

`REACT_APP_API_URL` — адрес API, доступный **браузеру**, например
`http://localhost:8000/api/v1`. В Kubernetes используется `/api/v1` на текущем домене.
После изменения адреса нужно перезапустить dev-сервер frontend.

## Локальная разработка

Python 3.10+, Node.js 22. Backend читает окружение, затем `backend/.env`, затем
корневой `.env`; уже заданные переменные не перезаписываются. При запуске backend
на хосте, а PostgreSQL из Compose укажите `POSTGRES_HOST=127.0.0.1` и
`POSTGRES_PORT=5433`. Аналогично настройте адрес RabbitMQ и Redis. Если Redis не
запущен, можно задать `REDIS_ENABLED=False`.

```sh
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

В другом терминале:

```sh
cd frontend
npm ci
npm start
```

Без `REACT_APP_API_URL` frontend использует `/api/v1`; локальный dev-сервер
проксирует запросы на `127.0.0.1:8000`.

## Проверки без внешних сервисов

```sh
backend/venv/bin/python backend/manage.py test api events --settings=tatarlang.test_settings
cd frontend
CI=true npm test -- --watchAll=false --runInBand
npm run build
```

Добавлена миграция `organizations/0005`: она приводит строковое поле уровня курса
к числовому типу существующей модели. Для локального запуска примените `python
manage.py migrate`; Compose и Helm выполняют миграции своими заданиями.

Backend-тесты используют SQLite в памяти, не обращаются к рабочей базе, Redis
или RabbitMQ. Существующие дубли результатов/организаций автоматически не удаляются.
API хранит лучший успешный результат экзамена, повторную запись на курс возвращает
без создания дубля. Запуск парсера через API разрешён только `is_staff`.

## Minikube: обычные манифесты

Подготовить `k8s/secret.local.yaml` по примеру `k8s/secret.yaml`, а
`k8s/tls-secret.local.yaml` — по примеру `k8s/tls-secret.yaml` с сертификатом для
`tataredu.test`. Оба локальных файла игнорируются Git. В `CELERY_BROKER_URL`
используется внутренний хост `rabbitmq`; ключ `DJANGO_SECRET_KEY` обязателен.

```sh
bash k8s/apply.sh
```

Нужны включённый ingress addon, стандартный provisioner хранилища Minikube и
доступный из браузера `tataredu.test` (hosts/DNS и при необходимости minikube tunnel).
Backend использует одну реплику и PVC для `/app/media`; RabbitMQ — отдельный PVC.
Это конфигурация для учебного одноузлового кластера.

## Helm и Vault

Исходники локальных подчартов в `helm/tataredu/charts/` должны попадать в Git;
игнорируются только сгенерированные `.tgz`. Vault скачивается из официального chart repo.

```sh
helm plugin install https://github.com/jkroepke/helm-secrets/releases/download/v4.7.7/secrets-4.7.7.tgz
helm dependency build helm/vault
helm upgrade --install vault helm/vault -n tataredu --create-namespace --reset-values
bash helm/scripts/vault-init.sh
```

Для Helm 4 нужен CLI-пакет helm-secrets 4.7.0 или новее. Старая legacy-установка
видна в `helm plugin list`, но команда `helm secrets` в Helm 4 не работает.

`vault-init.sh` сохраняет ключи в игнорируемый `helm/vault/init-keys.json` с правами
только владельца. Для уже инициализированного Vault задайте `VAULT_KEYS_FILE`
с его исходными ключами. Скрипт не переинициализирует Vault и не перезаписывает
существующий файл ключей. После перезапуска Vault его нужно снова распечатать.

Один раз задайте root token из `init-keys.json` только для setup-скрипта:

```sh
VAULT_TOKEN='replace-with-root-token' bash helm/scripts/vault-setup.sh
bash helm/scripts/deploy.sh --dry-run
bash helm/scripts/deploy.sh
```

Setup создаёт отдельные policies и AppRole, а credentials записывает в игнорируемый
`helm/.env` с правами `600`; root token туда не попадает. SecretID действует 24 часа,
после чего setup нужно повторить. `--dry-run` читает Vault и проверяет рендеринг, но не создаёт
и не изменяет ресурсы кластера. Значения секретов не печатаются. Настройка Vault
не меняет существующие пароли БД/брокера. Внешний TLS-секрет `tataredu-tls` нужно
создать в namespace приложения до доступа по HTTPS.

Для проверки Vault chart без Vault API:

```sh
helm lint helm/vault
```

Django читает `DEBUG`, `ALLOWED_HOSTS`, `DJANGO_SECRET_KEY` и
`CSRF_TRUSTED_ORIGINS` из окружения. В Kubernetes backend запускается через Gunicorn,
а production bundle frontend раздаёт Nginx. Compose target оставляет React dev-server
для локальной разработки.

## Уже развёрнутое приложение

Изменения файлов сами по себе не обновляют запущенные контейнеры. При смене
`DJANGO_SECRET_KEY` старые JWT перестают действовать — потребуется повторный вход.
Ранее сохранённые в контейнере фотографии и данные RabbitMQ нужно перенести в
новые тома **до** пересоздания pod. Не удаляйте существующие PVC/PV ради обновления
чарта: смена storageClass существующего тома требует отдельного переноса данных.
Секреты, когда-либо закоммиченные в Git, остаются в истории; удаление из текущих
файлов не заменяет их ротацию, если репозиторий был доступен посторонним.
