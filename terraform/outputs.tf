output "repository_url" {
  description = "URL do repositório ECR"
  value       = aws_ecr_repository.this.repository_url
} 