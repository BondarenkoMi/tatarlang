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
