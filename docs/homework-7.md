# ДЗ 7 — масштабирование

## 7.1. Метрики и начальные ресурсы

`metrics-server` предоставляет Kubernetes Metrics API. Команда `kubectl top`
читает именно этот API. HPA также использует его, чтобы сравнивать фактический CPU
pod с `resources.requests.cpu`.

Для локального Minikube компонент включается так:

```bash
minikube addons enable metrics-server
kubectl get apiservice v1beta1.metrics.k8s.io
kubectl top node
kubectl top pods -n tataredu --containers
```

Исходный замер 20 сентября 2026 года после прогрева pod и без нагрузки:

| Компонент | CPU | RAM | CPU request | RAM request | CPU limit | RAM limit |
|---|---:|---:|---:|---:|---:|---:|
| Backend | 8m | 86 MiB | 100m | 256 MiB | 500m | 512 MiB |
| Frontend (Nginx) | 1m | 8 MiB | 25m | 32 MiB | 200m | 128 MiB |
| Celery worker | 10m | 120 MiB | 100m | 256 MiB | 500m | 512 MiB |
| Celery beat | <1m | 67 MiB | 50m | 128 MiB | 200m | 256 MiB |
| Flower | 13m | 69 MiB | 50m | 128 MiB | 200m | 256 MiB |
| RabbitMQ | 24m | 118 MiB | 100m | 128 MiB | 300m | 512 MiB |

Узел Minikube в момент замера потреблял 721m CPU и 1978 MiB RAM: 9% CPU и 50%
памяти. Значения в таблице — одиночный момент без пользовательской нагрузки, поэтому
они подходят только как исходная точка. Окончательные requests/limits для Backend
нужно выбрать после Locust-теста и повторного замера в критической точке.

Начальные значения оставлены с запасом на запуск и краткие пики. Для Backend request
CPU 100m даёт HPA измеримую базу, а limit 500m не позволяет одной реплике занять всё
CPU узла. Memory limit в два раза выше request и заметно выше наблюдавшихся 86 MiB.
Слишком маленький request искусственно завышал бы процент CPU для HPA, а слишком
жёсткий memory limit приводил бы к `OOMKilled`, потому что память не throttling'уется.

Следующий этап — Locust-тест чтения API. Во время него фиксируются параметры запуска,
доля ошибок, среднее/95-й перцентиль времени ответа и `kubectl top`; только после
этого меняются лимиты и добавляется HPA.

## 7.2. Сценарий Locust

Сценарий находится в `load-tests/locustfile.py`, а воспроизводимые начальные настройки
— в `load-tests/locust.conf`: 10 одновременных пользователей, прирост 2 пользователя
в секунду, длительность 2 минуты. Пользователь ждёт 0,5–1,5 секунды между запросами.

Тест читает публичный `GET /api/v1/events/` и дополнительно проверяет HTTP 200 и JSON.
Маршрут выбран потому, что ему не нужен тестовый пароль или JWT, а его запрос проходит
через тот же Ingress и Backend. Перед поиском предела кеш Redis нужно прогреть одним
запросом: иначе первый внешний фактор смешивается с устойчивой нагрузкой.

Локальный запуск через Ingress:

```bash
cd load-tests
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/locust --host https://tataredu.test --config locust.conf
```

Для self-signed сертификата в учебном Minikube при запуске нужно либо доверить
локальный CA в системе, либо тестировать временный HTTP/port-forward endpoint. Сам
Locust-тест не должен глобально отключать проверку TLS в коде приложения.

## 7.3. HPA и VPA

HPA для Backend использует `autoscaling/v2`: от 1 до 3 реплик, цель 60% CPU,
немедленное увеличение и окно стабилизации уменьшения 300 секунд. Deployment использует
`RollingUpdate`; при включённом HPA поле `spec.replicas` не рендерится, чтобы Helm не
перезаписывал выбранное HPA число реплик при каждом upgrade.

VPA установлен официальным chart Kubernetes Autoscaler 0.12.0 (VPA 1.7.1) в экономном
варианте: только recommender. Объект VPA использует `updateMode: Off`, поэтому он не
перезапускает pod и не меняет requests. Для него контролируется только память в
диапазоне 64–512 MiB. CPU остаётся зоной HPA, что исключает конфликт двух алгоритмов.

Проверка:

```bash
kubectl get hpa -n tataredu
kubectl describe hpa tataredu-backend -n tataredu
kubectl describe vpa tataredu-backend -n tataredu
```

VPA выдаёт рекомендацию после накопления метрик. Сразу после установки секция
`Recommendation` может отсутствовать; это не ошибка конфигурации.

Практическая проверка HPA: при нагрузке 100 пользователей Backend потреблял 179m CPU,
то есть около 71% от request 250m. При цели 60% HPA увеличил Deployment с одной до
двух реплик; новая реплика перешла в Ready. После остановки Locust HPA удерживает две
реплики в течение настроенного окна 300 секунд, чтобы не дёргать Deployment при
кратковременных провалах нагрузки, а затем автоматически вернулся к одной. Окно
считается по истории рекомендаций: последняя высокая рекомендация может появиться
позже самого scale-up из-за задержки Metrics API.

## 7.4. Locust Operator и отдельный chart

Locust Operator наблюдает за custom resource `LocustTest` и создаёт по нему master и
worker Jobs. Master хранит состояние теста и Web UI, worker генерирует запросы. Это
позволяет описывать распределённый тест декларативно и запускать его внутри Kubernetes.

Оператор установлен официальным chart версии 2.3.1. Для локального ноутбука оставлена
одна реплика controller, отключены HA leader election и PDB, а ресурсы ограничены в
`helm/locust-operator-values.yaml`:

```bash
helm repo add locust-k8s-operator \
  https://abdelrhmanhamouda.github.io/locust-k8s-operator
helm repo update locust-k8s-operator
helm upgrade --install locust-operator \
  locust-k8s-operator/locust-k8s-operator \
  --version 2.3.1 \
  --namespace locust-system \
  --create-namespace \
  -f helm/locust-operator-values.yaml
```

Отдельный chart находится в `helm/locust-load-test`. Он создаёт:

- ConfigMap с `locustfile.py`;
- `LocustTest` `load-test-v2` с 100 пользователями, spawn rate 20/с, длительностью 2m
  и одним worker;
- Service `load-test-v2-webui` на порту 8089;
- Ingress `locust.tataredu.test` к этому Service.

Установка и проверка:

```bash
helm upgrade --install load-test-v2 helm/locust-load-test \
  --namespace tataredu
kubectl get locusttest load-test-v2 -n tataredu
kubectl get jobs,pods,svc,ingress -n tataredu
```

`autostart` выключен, чтобы master и Web UI оставались доступны для демонстрации.
Тест запускается кнопкой **Start swarming** в интерфейсе, где уже заданы host, users,
spawn rate и run time. Проверено: worker подключается (`1/1`), Service получает endpoint,
а Web UI через Service и Ingress отвечает HTTP 200.

Актуальный оператор не публикует порт 8089 в создаваемом им Service master. Поэтому
chart явно создаёт требуемый заданием `load-test-v2-webui:8089` и выбирает master pod
по служебной метке оператора `performance-test-pod-name=load-test-v2-master`.

Для браузера нужно направить имя на Ingress Minikube, опубликовать ingress-controller
как LoadBalancer и держать tunnel запущенным. На macOS tunnel запросит пароль локально,
потому что порты 80/443 привилегированные:

```bash
echo "127.0.0.1 locust.tataredu.test" | sudo tee -a /etc/hosts
kubectl patch service ingress-nginx-controller -n ingress-nginx \
  --type merge -p '{"spec":{"type":"LoadBalancer"}}'
minikube tunnel
```
