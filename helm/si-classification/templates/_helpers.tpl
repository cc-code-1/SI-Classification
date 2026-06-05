{{/* Nom de base de l'application */}}
{{- define "si-classification.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* Nom complet des ressources (release + chart) */}}
{{- define "si-classification.fullname" -}}
{{- printf "%s-%s" .Release.Name (include "si-classification.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* Labels communs à toutes les ressources */}}
{{- define "si-classification.labels" -}}
app.kubernetes.io/name: {{ include "si-classification.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{/* Labels de sélection (Deployment <-> Service) */}}
{{- define "si-classification.selectorLabels" -}}
app.kubernetes.io/name: {{ include "si-classification.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
