#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ] || [[ ! "$1" =~ ^v[0-9]+\.[0-9]+\.[0-9]+([+-][0-9A-Za-z.-]+)?$ ]]; then
  echo "Usage: $0 vMAJOR.MINOR.PATCH" >&2
  exit 2
fi

VERSION="$1"
REGISTRY="${CONTAINER_REGISTRY:-ghcr.io}"
IMAGE_NAMESPACE="${CONTAINER_IMAGE_NAMESPACE:-bondarenkomi}"

docker build \
  --label "org.opencontainers.image.revision=${GITHUB_SHA:-unknown}" \
  --label "org.opencontainers.image.version=$VERSION" \
  -t "$REGISTRY/$IMAGE_NAMESPACE/tatarlang-backend:$VERSION" \
  -t "$REGISTRY/$IMAGE_NAMESPACE/tatarlang-backend:latest" \
  backend

docker build \
  --label "org.opencontainers.image.revision=${GITHUB_SHA:-unknown}" \
  --label "org.opencontainers.image.version=$VERSION" \
  -t "$REGISTRY/$IMAGE_NAMESPACE/tatarlang-frontend:$VERSION" \
  -t "$REGISTRY/$IMAGE_NAMESPACE/tatarlang-frontend:latest" \
  frontend

docker push "$REGISTRY/$IMAGE_NAMESPACE/tatarlang-backend:$VERSION"
docker push "$REGISTRY/$IMAGE_NAMESPACE/tatarlang-backend:latest"
docker push "$REGISTRY/$IMAGE_NAMESPACE/tatarlang-frontend:$VERSION"
docker push "$REGISTRY/$IMAGE_NAMESPACE/tatarlang-frontend:latest"
