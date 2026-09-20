#!/usr/bin/env bash
set -euo pipefail
umask 077

: "${GITHUB_PAT:?Export GITHUB_PAT before running this script}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNNER_NAMESPACE="arc-runners"
CHART_VERSION="0.14.2"

kubectl create namespace "$RUNNER_NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

printf '%s' "$GITHUB_PAT" |
  kubectl create secret generic arc-github-token \
    --namespace "$RUNNER_NAMESPACE" \
    --from-file=github_token=/dev/stdin \
    --dry-run=client -o yaml |
  kubectl apply -f -

unset GITHUB_PAT

helm upgrade --install tataredu-runner \
  --namespace "$RUNNER_NAMESPACE" \
  --version "$CHART_VERSION" \
  --values "$ROOT_DIR/helm/arc-runner-values.yaml" \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set

kubectl get autoscalingrunnerset,pods -n "$RUNNER_NAMESPACE"
