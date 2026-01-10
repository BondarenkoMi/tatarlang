{{/*
Expand the name of the chart.
*/}}
{{- define "tataredu.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "tataredu.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "tataredu.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
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
Selector labels
*/}}
{{- define "tataredu.selectorLabels" -}}
app.kubernetes.io/name: {{ include "tataredu.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "tataredu.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "tataredu.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
ConfigMap name
*/}}
{{- define "tataredu.configMapName" -}}
{{- printf "%s-config" (include "tataredu.fullname" .) }}
{{- end }}

{{/*
Secret name
*/}}
{{- define "tataredu.secretName" -}}
{{- printf "%s-secret" (include "tataredu.fullname" .) }}
{{- end }}

{{/*
PostgreSQL connection string
*/}}
{{- define "tataredu.postgresHost" -}}
{{- if .Values.postgres.enabled }}
{{- printf "%s-postgres" (include "tataredu.fullname" .) }}
{{- else }}
{{- .Values.postgres.externalHost }}
{{- end }}
{{- end }}

{{/*
RabbitMQ connection string
*/}}
{{- define "tataredu.rabbitmqHost" -}}
{{- if .Values.rabbitmq.enabled }}
{{- printf "%s-rabbitmq" (include "tataredu.fullname" .) }}
{{- else }}
{{- .Values.rabbitmq.externalHost }}
{{- end }}
{{- end }}

