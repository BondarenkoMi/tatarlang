
{{/* Имя чарта */}}
{{- define "tataredu.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Полное имя релиза, согласованное с локальными подчартами.
*/}}
{{- define "tataredu.fullname" -}}
{{- default .Release.Name .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* Метка версии чарта */}}
{{- define "tataredu.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Стандартные labels для всех ресурсов.
Используй: {{ include "tataredu.labels" . | nindent 4 }}
*/}}
{{- define "tataredu.labels" -}}
helm.sh/chart: {{ include "tataredu.chart" . }}
{{ include "tataredu.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels — используются в Deployment.selector и Pod.labels.
*/}}
{{- define "tataredu.selectorLabels" -}}
app.kubernetes.io/name: {{ include "tataredu.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/* Имя основного Secret */}}
{{- define "tataredu.secretName" -}}
{{- printf "%s-secret" (include "tataredu.fullname" .) }}
{{- end }}

{{/* Имя основного ConfigMap */}}
{{- define "tataredu.configmapName" -}}
{{- printf "%s-config" (include "tataredu.fullname" .) }}
{{- end }}

{{/*
DNS-имя сервиса PostgreSQL (из subchart).
Bitnami / наш subchart называет сервис: <release>-postgresql
*/}}
{{- define "tataredu.postgresHost" -}}
{{- printf "%s-postgresql" .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
DNS-имя сервиса RabbitMQ (bitnami subchart называет сервис: <release>-rabbitmq).
*/}}
{{- define "tataredu.rabbitmqHost" -}}
{{- printf "%s-rabbitmq" .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
CELERY_BROKER_URL строится из credentials и имени хоста RabbitMQ.
*/}}
{{- define "tataredu.celeryBrokerUrl" -}}
{{- printf "amqp://%s:%s@%s:5672//" (.Values.rabbitmq.auth.username | urlquery) (.Values.rabbitmq.auth.password | urlquery) (include "tataredu.rabbitmqHost" .) }}
{{- end }}

{{/*
Init-контейнер: ожидание готовности PostgreSQL.
Использование: {{ include "tataredu.initWaitPostgres" . | nindent 8 }}
*/}}
{{- define "tataredu.initWaitPostgres" -}}
- name: wait-for-postgres
  image: "{{ .Values.image.busybox.repository }}:{{ .Values.image.busybox.tag }}"
  command:
    - sh
    - -c
    - |
      until nc -z {{ include "tataredu.postgresHost" . }} 5432; do
        echo "Waiting for PostgreSQL at {{ include "tataredu.postgresHost" . }}:5432..."
        sleep 2
      done
      echo "PostgreSQL is ready."
{{- end }}

{{/*
Init-контейнер: ожидание готовности RabbitMQ.
Использование: {{ include "tataredu.initWaitRabbitMQ" . | nindent 8 }}
*/}}
{{- define "tataredu.initWaitRabbitMQ" -}}
- name: wait-for-rabbitmq
  image: "{{ .Values.image.busybox.repository }}:{{ .Values.image.busybox.tag }}"
  command:
    - sh
    - -c
    - |
      until nc -z {{ include "tataredu.rabbitmqHost" . }} 5672; do
        echo "Waiting for RabbitMQ at {{ include "tataredu.rabbitmqHost" . }}:5672..."
        sleep 2
      done
      echo "RabbitMQ is ready."
{{- end }}

{{/*
Init-контейнер: ожидание готовности Backend API.
*/}}
{{- define "tataredu.initWaitBackend" -}}
- name: wait-for-backend
  image: "{{ .Values.image.busybox.repository }}:{{ .Values.image.busybox.tag }}"
  command:
    - sh
    - -c
    - |
      until nc -z {{ include "tataredu.fullname" . }}-backend 8000; do
        echo "Waiting for backend..."
        sleep 2
      done
      echo "Backend is ready."
{{- end }}

{{/*
envFrom блок для backend/celery контейнеров — одна точка настройки env.
Использование: {{ include "tataredu.backendEnvFrom" . | nindent 10 }}
*/}}
{{- define "tataredu.backendEnvFrom" -}}
- configMapRef:
    name: {{ include "tataredu.configmapName" . }}
- secretRef:
    name: {{ include "tataredu.secretName" . }}
{{- end }}

{{/*
DNS-имя сервиса Redis (наш subchart: <release>-redis).
*/}}
{{- define "tataredu.redisHost" -}}
{{- printf "%s-redis" .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Init-контейнер: ожидание готовности Redis.
Использование: {{ include "tataredu.initWaitRedis" . | nindent 8 }}
*/}}
{{- define "tataredu.initWaitRedis" -}}
- name: wait-for-redis
  image: "{{ .Values.image.busybox.repository }}:{{ .Values.image.busybox.tag }}"
  command:
    - sh
    - -c
    - |
      until nc -z {{ include "tataredu.redisHost" . }} 6379; do
        echo "Waiting for Redis at {{ include "tataredu.redisHost" . }}:6379..."
        sleep 2
      done
      echo "Redis is ready."
{{- end }}
