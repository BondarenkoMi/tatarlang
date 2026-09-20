{{- define "rabbitmq.fullname" -}}
{{- printf "%s-rabbitmq" .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "rabbitmq.labels" -}}
app.kubernetes.io/name: rabbitmq
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}
