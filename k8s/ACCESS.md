# 🌐 Доступ к приложению Tataredu

## Проблема с minikube tunnel

Если `minikube tunnel` не работает (не открывается в браузере), используйте один из альтернативных способов:

## Способ 1: Прямой доступ через NodePort (рекомендуется)

Ingress контроллер работает как NodePort. Получите IP minikube и используйте порт:

```bash
# Получить IP minikube
MINIKUBE_IP=$(minikube ip)
echo "IP minikube: $MINIKUBE_IP"

# Получить порт ingress
INGRESS_PORT=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.spec.ports[0].nodePort}')
echo "Ingress порт: $INGRESS_PORT"
```

Затем откройте в браузере:
- Frontend: `http://$MINIKUBE_IP:$INGRESS_PORT` (с заголовком Host: tataredu.local)
- Или используйте curl: `curl -H "Host: tataredu.local" http://$MINIKUBE_IP:$INGRESS_PORT`

## Способ 2: Port-forward напрямую к сервисам (самый простой)

Запустите в отдельном терминале:

```bash
cd k8s
./port-forward.sh
```

Или вручную:

```bash
# Frontend
kubectl port-forward -n tataredu service/frontend 3000:3000

# Backend (в другом терминале)
kubectl port-forward -n tataredu service/backend 8000:8000

# Flower (в третьем терминале)
kubectl port-forward -n tataredu service/flower 5555:5555
```

Затем откройте:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api`
- Swagger: `http://localhost:8000/api/swagger/`
- Flower: `http://localhost:5555`

## Способ 3: Использование minikube service (если настроен LoadBalancer)

```bash
minikube service frontend -n tataredu
minikube service backend -n tataredu
```

## Способ 4: Исправление minikube tunnel

Если хотите использовать `minikube tunnel`:

1. Убедитесь, что tunnel запущен:
   ```bash
   ps aux | grep "minikube tunnel"
   ```

2. Если не запущен, запустите в отдельном терминале:
   ```bash
   minikube tunnel
   ```

3. Проверьте, что ingress получил внешний IP:
   ```bash
   kubectl get ingress -n tataredu
   ```

4. Убедитесь, что в `/etc/hosts` есть запись:
   ```bash
   cat /etc/hosts | grep tataredu
   ```

5. Попробуйте открыть `http://tataredu.local` (не https!)

## Проверка работы сервисов

```bash
# Проверить, что поды работают
kubectl get pods -n tataredu

# Проверить логи frontend
kubectl logs -f deployment/frontend -n tataredu

# Проверить логи backend
kubectl logs -f deployment/backend -n tataredu

# Проверить ingress
kubectl describe ingress tataredu-ingress -n tataredu
```

## Быстрая проверка доступности

```bash
# Проверить доступность через port-forward
kubectl port-forward -n tataredu service/frontend 3000:3000 &
sleep 2
curl http://localhost:3000
kill %1
```

