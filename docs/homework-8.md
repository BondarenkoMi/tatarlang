# ДЗ 8 — CI/CD

## 8.1. Semantic release и публикация образов

Репозиторий использует semantic-release и Conventional Commits. После push в `main`
workflow анализирует сообщения коммитов после последнего тега:

- `fix:` увеличивает patch-версию;
- `feat:` увеличивает minor-версию;
- `BREAKING CHANGE:` увеличивает major-версию;
- сообщения без подходящего типа не создают релиз.

При наличии новой версии semantic-release создаёт тег формата `v1.2.3` и передаёт
его скрипту `scripts/publish-images.sh`. Скрипт собирает Backend и Frontend и публикует
в GHCR четыре ссылки: два неизменяемых version-тега и два удобных тега `latest`.
После успешной публикации образов создаётся GitHub Release с автоматически собранными
release notes.

Workflow использует автоматически выдаваемый GitHub Actions `GITHUB_TOKEN` с правами
`contents: write` и `packages: write`. Постоянный registry-пароль в репозитории не
нужен.

Локальная безопасная проверка вычисления версии, без создания тега и публикации:

```bash
npm ci
npx semantic-release --dry-run --no-ci
```

Реальная публикация будет проверена после commit и push изменений в GitHub. Для
следующего этапа отдельный self-hosted runner будет развёрнут в Kubernetes через Helm.

## 8.2. Собственный runner в Kubernetes

Используется официальный GitHub Actions Runner Controller (ARC) версии 0.14.2. Он
состоит из двух Helm-релизов:

- `arc` в namespace `arc-systems` управляет жизненным циклом runner;
- `tataredu-runner` в `arc-runners` регистрирует scale set для этого репозитория.

Scale set называется `tataredu-runner`, поэтому это же значение указано в `runs-on`
workflow `self-hosted-runner.yml`. Настройки `minRunners: 0` и `maxRunners: 1`
экономят память локального Minikube: pod создаётся для задания и удаляется после него.

Контроллер устанавливается без GitHub credentials:

```bash
helm upgrade --install arc \
  --namespace arc-systems --create-namespace \
  --version 0.14.2 \
  --values helm/arc-controller-values.yaml \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set-controller
```

Для регистрации scale set нужен GitHub PAT. Токен не записывается в values или Git:
скрипт читает его из переменной, через stdin создаёт Kubernetes Secret и удаляет
переменную из собственного окружения перед запуском Helm.

```bash
read -s GITHUB_PAT
export GITHUB_PAT
bash helm/scripts/arc-runner-setup.sh
unset GITHUB_PAT
```

После регистрации workflow **Self-hosted runner check** запускается вручную в GitHub
Actions. В логе должны быть имя эфемерного runner и архитектура, а в кластере во время
выполнения — временный runner pod.
