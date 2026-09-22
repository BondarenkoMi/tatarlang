# TatarEdu — команды локального кластера

## Запуск и деплой

```bash
minikube start
bash helm/scripts/vault-init.sh

# Только если AppRole ещё не настроен или его SecretID истёк:
VAULT_TOKEN='replace-with-root-token-from-init-keys' bash helm/scripts/vault-setup.sh

bash helm/scripts/deploy.sh --dry-run
bash helm/scripts/deploy.sh
```

`deploy.sh` сам поднимает временный port-forward к Vault, вызывает
`helm secrets --backend vals`, выполняет миграции и ждёт rollout прикладных pod.

Для браузера сначала убедитесь, что ingress-controller опубликован как LoadBalancer,
затем запустите tunnel в отдельном терминале. На macOS команда запросит локальный
пароль администратора для портов 80/443; терминал нужно оставить открытым:

```bash
kubectl patch service ingress-nginx-controller -n ingress-nginx \
  --type merge -p '{"spec":{"type":"LoadBalancer"}}'
minikube tunnel
```

Вариант без `sudo`, но с портом в URL:

```bash
kubectl port-forward -n ingress-nginx service/ingress-nginx-controller 8080:80
# http://locust.tataredu.test:8080
```

## Состояние и логи

```bash
kubectl get pods -n tataredu
kubectl top pods -n tataredu --containers
helm list -n tataredu
kubectl logs -n tataredu deployment/tataredu-backend --tail=100
kubectl logs -n tataredu deployment/tataredu-celery-worker --tail=100
```

## Vault

```bash
kubectl exec -n tataredu vault-0 -- vault status
bash helm/scripts/vault-init.sh       # повторный unseal после рестарта
```

Не выводите содержимое `init-keys.json`, `.env` или Vault secrets в терминал во время
демонстрации. Проверка без раскрытия значений:

```bash
bash helm/scripts/deploy.sh --dry-run
```

## Проверка сервисов

```bash
kubectl exec -n tataredu deployment/tataredu-frontend -- wget -qO- http://127.0.0.1/healthz
kubectl exec -n tataredu deployment/tataredu-backend -- \
  python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/swagger/').status)"
```

## Демонстрационные данные

После пересоздания PostgreSQL создать или обновить 5 курсов и 5 тестов:

```bash
kubectl exec -n tataredu deployment/tataredu-backend -- python manage.py seed_demo
```

Дополнительно получить актуальные мероприятия через парсер Яндекс Афиши:

```bash
kubectl exec -n tataredu deployment/tataredu-backend -- \
  python manage.py seed_demo --with-events
```

Команда идемпотентна: курсы и тесты с теми же названиями обновляются, а не
дублируются. Парсер зависит от доступности и текущей разметки внешнего сайта.

## ДЗ 7 — масштабирование и Locust

```bash
kubectl top node
kubectl top pods -n tataredu --containers
kubectl get hpa,vpa -n tataredu
kubectl describe hpa tataredu-backend -n tataredu
kubectl describe vpa tataredu-backend -n tataredu

kubectl get locusttest load-test-v2 -n tataredu
kubectl get jobs,pods,svc,ingress -n tataredu | grep load-test-v2
```

Web UI нагрузочного теста: `http://locust.tataredu.test`. Для него нужны запись
`127.0.0.1 locust.tataredu.test` в `/etc/hosts` и запущенный `minikube tunnel`.
В поле **Host** должен быть внутренний адрес backend-сервиса:

```text
http://tataredu-backend:8000
```

`tataredu.test` из Locust pod использовать нельзя: запись `/etc/hosts` компьютера
в pod не передаётся, и тест может обратиться к `127.0.0.1` самого worker.

## Остановка

```bash
minikube stop
```

## ДЗ 8 — CI/CD и GitHub runner

```bash
# Контроллер ARC:
kubectl get pods -n arc-systems

# Listener и временные runner pods:
kubectl get autoscalingrunnerset,pods -n arc-runners

# Установка scale set после локального ввода PAT:
read -s GITHUB_PAT
export GITHUB_PAT
bash helm/scripts/arc-runner-setup.sh
unset GITHUB_PAT
```

## ДЗ 9 — werf

Docker Hub username, access token и `WERF_REPO` предварительно добавляются только в
локальный `helm/.env` по примеру `helm/.env.example`.

```bash
# Проверить Vault и render без сборки и публикации образов:
bash helm/scripts/werf-deploy.sh --render-only

# Собрать образы, отправить их в Docker Hub и обновить приложение:
bash helm/scripts/werf-deploy.sh

# Облегчённый режим для одновременного показа ДЗ 7, 8, 9 и 11:
# отключает Flower, Celery worker/beat и RedisInsight, но сохраняет само приложение,
# Redis, RabbitMQ, Vault, Locust, ARC и весь стек мониторинга.
DEMO_MODE=true bash helm/scripts/werf-deploy.sh
```

## ДЗ 11 — Prometheus, Loki и Grafana

Локальные данные Grafana и SMTP хранятся в `helm/monitoring/.env`, созданном по
примеру `helm/monitoring/.env.example`.

```bash
# Установить или обновить весь стек мониторинга:
bash helm/scripts/monitoring-deploy.sh

# Проверить релизы и Kubernetes-ресурсы:
helmfile list
helm list -n monitoring
kubectl get pods,pvc,ingress -n monitoring
kubectl top pods -n monitoring --containers
kubectl top node
```

Для предварительного просмотра изменений Helmfile нужны переменные из локального
файла. Команда не печатает их значения:

```bash
set -a
source helm/monitoring/.env
set +a
helmfile diff
unset GRAFANA_ADMIN_USER GRAFANA_ADMIN_PASSWORD GRAFANA_SMTP_ENABLED \
  GRAFANA_SMTP_HOST GRAFANA_SMTP_USER GRAFANA_SMTP_PASSWORD \
  GRAFANA_SMTP_FROM_ADDRESS GRAFANA_ALERT_EMAIL
```

В `/etc/hosts` должны присутствовать:

```text
127.0.0.1 grafana.tataredu.test prometheus.tataredu.test
```

При запущенном `minikube tunnel` открыть:

- `http://grafana.tataredu.test`;
- `http://prometheus.tataredu.test`.

Запрос Prometheus для проверки ingress-nginx:

```promql
up{job="ingress-nginx"}
```

Запрос Loki в Grafana → Explore для логов приложения:

```logql
{namespace="tataredu"}
```

Email-настройки проверяются в Grafana: **Alerting → Contact points → Test**.
Полное описание и сценарий показа: `docs/homework-11.md`.
