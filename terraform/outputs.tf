# =============================================================================
# OUTPUTS ECR
# =============================================================================

output "ecr_repository_url" {
  description = "URL do repositório ECR"
  value       = aws_ecr_repository.app.repository_url
}

output "ecr_repository_name" {
  description = "Nome do repositório ECR"
  value       = aws_ecr_repository.app.name
}

output "s3_bucket_name" {
  description = "Nome do bucket S3"
  value       = aws_s3_bucket.app.bucket
}

output "s3_bucket_arn" {
  description = "ARN do bucket S3"
  value       = aws_s3_bucket.app.arn
}

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

output "hpa_name" {
  description = "Nome do Horizontal Pod Autoscaler"
  value       = kubernetes_horizontal_pod_autoscaler_v2.app.metadata[0].name
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