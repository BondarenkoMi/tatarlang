# ДЗ 9 — werf, Vault и Docker Hub

## Что реализовано

Основной Helm chart перенесён в стандартный для werf каталог `.helm`. Его локальные
зависимости PostgreSQL, RabbitMQ, Celery worker, Flower, Redis и RedisInsight находятся
в `.helm/charts`. Обычные несекретные настройки сохранены в
`.helm/values-common.yaml`.

Шаблон объекта `Namespace` удалён из chart: namespace релиза создаёт сам Helm/werf,
а werf намеренно запрещает релизу управлять собственным namespace как обычным
ресурсом.

Для RabbitMQ и RedisInsight добавлены `startupProbe`: после запуска Minikube на
ограниченном ноутбуке этим сервисам может понадобиться больше минуты. Пока startup
probe не прошла, Kubernetes не применяет liveness probe и не перезапускает ещё
загружающийся сервис по кругу.

`werf.yaml` описывает два образа:

- `backend` собирается из `backend/Dockerfile` с context `backend/`;
- `frontend` собирается из `frontend/Dockerfile` с context `frontend/`.

Во время `werf converge` werf присваивает образам теги, зависящие от содержимого, и
добавляет их в `global.werf.images`. Шаблоны backend, frontend, Celery, Flower,
миграции и CronJob используют эти ссылки. При обычном Helm deploy остаётся fallback
на `image.*.repository` и `image.*.tag`.

## Как работает скрипт

`helm/scripts/werf-deploy.sh` повторяет цепочку из презентации:

1. Загружает локальный `helm/.env`.
2. Проверяет Vault; при необходимости открывает port-forward к Service `vault`.
3. Выполняет `vals eval -f helm/secrets.yaml` и атомарно записывает результат во
   временный `.helm/values.yaml` с правами, ограниченными текущим пользователем.
4. Входит в Docker Hub через `docker login --password-stdin`, поэтому токен не
   появляется в аргументах процесса.
5. `werf converge` собирает и публикует образы, рендерит chart и обновляет релиз
   `tataredu` в namespace `tataredu`.
6. `trap` всегда удаляет `.helm/values.yaml`, в том числе после ошибки или Ctrl+C.

werf по умолчанию читает только Git-состояние проекта. В
`werf-giterminism.yaml` сделано узкое исключение только для генерируемого
`.helm/values.yaml`; остальные незакоммиченные файлы не разрешены.

Постоянные значения вынесены в `values-common.yaml`, чтобы удаление временного файла
не уничтожило конфигурацию приложения. `.helm/values.yaml` дополнительно добавлен в
`.gitignore`.

## Подготовка и запуск

Установить werf, скопировать недостающие переменные из `helm/.env.example` в локальный
`helm/.env`, затем указать Docker Hub username, access token и repository. Токен в
чат и Git отправлять не нужно.

Без сборки и публикации можно проверить Vault и рендеринг:

```bash
bash helm/scripts/werf-deploy.sh --render-only
```

Полный запуск:

```bash
bash helm/scripts/werf-deploy.sh
```

После converge нужно показать созданные образы в Docker Hub, состояние pod и
доступность `https://tataredu.test`.
