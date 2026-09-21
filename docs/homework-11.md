# ДЗ 11 — мониторинг и логирование

## Что реализовано

В namespace `monitoring` разворачивается единый стек наблюдаемости:

- **Prometheus** собирает метрики Kubernetes и ingress-nginx;
- **Loki** хранит логи контейнеров;
- **Promtail** читает логи на каждой ноде и отправляет их в Loki;
- **Grafana** показывает метрики и логи, а также управляет уведомлениями;
- **Alertmanager** обрабатывает оповещения Prometheus.

Компоненты устанавливаются через `helmfile.yaml`. Версии Helm-чартов закреплены,
поэтому повторный деплой воспроизводим. Настройки каждого компонента находятся в
`helm/monitoring/`, а локальные учётные данные — в игнорируемом файле
`helm/monitoring/.env`.

## Как движутся данные

```text
ingress-nginx ──метрики──> Prometheus ──datasource──> Grafana
pods/nodes ──логи──> Promtail ──> Loki ──datasource──> Grafana
Prometheus/Grafana ──правила──> Alertmanager/SMTP ──> email
```

Prometheus получает метрики ingress-nginx через дополнительный scrape job.
Promtail работает как DaemonSet: на каждой ноде есть его pod, который читает
контейнерные логи и добавляет метки `namespace`, `pod`, `container`. В Grafana
заранее создаются источники данных Prometheus и Loki.

## Установка

1. Заполнить локальный файл по примеру `helm/monitoring/.env.example`.
2. Для почтовых уведомлений установить `GRAFANA_SMTP_ENABLED=true` и заполнить
   SMTP-параметры. Этот файл нельзя коммитить.
3. Выполнить:

```bash
bash helm/scripts/monitoring-deploy.sh
```

Скрипт создаёт namespace и Kubernetes Secrets для Grafana, после чего запускает
`helmfile sync`. Пароли не записываются в обычные Helm values.

## Проверка на защите

```bash
helmfile list
helm list -n monitoring
kubectl get pods,pvc,ingress -n monitoring
kubectl top pods -n monitoring --containers
```

Открыть:

- Grafana: `http://grafana.tataredu.test`;
- Prometheus: `http://prometheus.tataredu.test`.

Для локального Minikube домены должны указывать на адрес tunnel, а
`minikube tunnel` должен работать. В Prometheus выполнить запрос:

```promql
up{job="ingress-nginx"}
```

Значение `1` означает, что target доступен. В Grafana открыть **Explore**, выбрать
Loki и выполнить:

```logql
{namespace="tataredu"}
```

После обращения к приложению должны появиться свежие логи backend/frontend.
В **Alerting → Contact points** проверяется email contact point, а в
**Alerting → Alert rules** — созданное правило. Фактическую доставку письма нужно
показать через кнопку тестирования contact point либо срабатывание правила.

## Ресурсы и совместная демонстрация ДЗ 7, 8, 9 и 11

Стек рассчитан на локальный Minikube и использует небольшие requests. Перед
нагрузочным тестом следует проверить запас памяти:

```bash
kubectl top node
kubectl get pods -A
kubectl get hpa,vpa -n tataredu
```

Все компоненты могут быть установлены одновременно, но нагрузочный тест и сборку
образов werf лучше запускать последовательно: оба действия дают кратковременный
пик CPU и памяти. Временные GitHub runner pods появляются только во время job.

## Важное ограничение

Promtail оставлен в проекте, потому что он указан в задании. Для нового
production-проекта следует выбрать поддерживаемый агент доставки логов, но для
учебной демонстрации текущая связка Promtail → Loki выполняет требования ДЗ.
