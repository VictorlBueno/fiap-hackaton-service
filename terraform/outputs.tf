# =============================================================================
# OUTPUTS ECR
# =============================================================================

# output "repository_url" {
#   description = "URL do repositório ECR"
#   value       = aws_ecr_repository.this.repository_url
# }

# =============================================================================
# OUTPUTS KUBERNETES
# =============================================================================

output "namespace_name" {
  description = "Nome do namespace criado"
  value       = kubernetes_namespace.app.metadata[0].name
}

output "deployment_name" {
  description = "Nome do deployment"
  value       = kubernetes_deployment.app.metadata[0].name
}

output "service_name" {
  description = "Nome do service"
  value       = kubernetes_service.app.metadata[0].name
}

output "ingress_host" {
  description = "Host do Ingress"
  value       = var.ingress_host
}

output "app_image" {
  description = "Imagem Docker utilizada"
  value       = var.app_image
}

output "app_replicas" {
  description = "Número de réplicas configuradas"
  value       = var.app_replicas
}

output "hpa_name" {
  description = "Nome do Horizontal Pod Autoscaler"
  value       = kubernetes_horizontal_pod_autoscaler_v2.app.metadata[0].name
}

output "hpa_min_replicas" {
  description = "Mínimo de réplicas do HPA"
  value       = var.hpa_min_replicas
}

output "hpa_max_replicas" {
  description = "Máximo de réplicas do HPA"
  value       = var.hpa_max_replicas
}

output "redis_host" {
  description = "Host do Redis consumido pelo serviço"
  value       = data.terraform_remote_state.redis.outputs.redis_host
}

output "redis_port" {
  description = "Porta do Redis consumido pelo serviço"
  value       = data.terraform_remote_state.redis.outputs.redis_port
}

output "redis_url" {
  description = "URL de conexão do Redis consumido pelo serviço"
  value       = data.terraform_remote_state.redis.outputs.redis_connection_string
  sensitive   = true
} 