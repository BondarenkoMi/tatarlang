{{- define "redisinsight.fullname" -}}
{{- printf "%s-redisinsight" .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "redisinsight.labels" -}}
app.kubernetes.io/name: redisinsight
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
