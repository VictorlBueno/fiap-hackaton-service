variable "aws_region" {
  description = "Região AWS onde os recursos serão criados"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Ambiente de deploy"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Nome do projeto"
  type        = string
  default     = "fiap-hack"
}

variable "force_delete" {
  description = "Permite deletar repositório mesmo com imagens"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags para o repositório."
  type        = map(string)
  default     = {}
}

# =============================================================================
# VARIÁVEIS KUBERNETES
# =============================================================================

# Configurações do banco de dados
variable "db_host" {
  description = "Host do banco de dados RDS"
  type        = string
}

variable "db_port" {
  description = "Porta do banco de dados"
  type        = string
  default     = "5432"
}

variable "db_name" {
  description = "Nome do banco de dados"
  type        = string
}

variable "db_username" {
  description = "Usuário do banco de dados"
  type        = string
}

variable "db_password" {
  description = "Senha do banco de dados"
  type        = string
  sensitive   = true
}



# Configurações AWS
variable "aws_access_key_id" {
  description = "AWS Access Key ID"
  type        = string
  sensitive   = true
}

variable "aws_secret_access_key" {
  description = "AWS Secret Access Key"
  type        = string
  sensitive   = true
}

variable "aws_cognito_user_pool_id" {
  description = "AWS Cognito User Pool ID"
  type        = string
  sensitive   = true
}

variable "aws_cognito_client_id" {
  description = "AWS Cognito Client ID"
  type        = string
  sensitive   = true
}

# Configurações da aplicação
variable "app_name" {
  description = "Nome da aplicação"
  type        = string
  default     = "video-processor"
}

variable "app_namespace" {
  description = "Namespace da aplicação"
  type        = string
  default     = "video-processor"
}

variable "app_replicas" {
  description = "Número de réplicas da aplicação"
  type        = number
  default     = 2
}

variable "app_image" {
  description = "Imagem Docker da aplicação"
  type        = string
}

# Configurações de recursos
variable "cpu_request" {
  description = "CPU request para os pods"
  type        = string
  default     = "250m"
}

variable "cpu_limit" {
  description = "CPU limit para os pods"
  type        = string
  default     = "500m"
}

variable "memory_request" {
  description = "Memory request para os pods"
  type        = string
  default     = "256Mi"
}

variable "memory_limit" {
  description = "Memory limit para os pods"
  type        = string
  default     = "512Mi"
}

# Configurações de auto-scaling
variable "hpa_min_replicas" {
  description = "Mínimo de réplicas para HPA"
  type        = number
  default     = 2
}

variable "hpa_max_replicas" {
  description = "Máximo de réplicas para HPA"
  type        = number
  default     = 10
}

variable "hpa_cpu_target" {
  description = "Target de CPU para HPA (%)"
  type        = number
  default     = 70
}

variable "hpa_memory_target" {
  description = "Target de memória para HPA (%)"
  type        = number
  default     = 80
}

# Configurações de Ingress
variable "ingress_host" {
  description = "Host do Ingress"
  type        = string
  default     = "video-processor.local"
}

variable "ingress_class" {
  description = "Classe do Ingress"
  type        = string
  default     = "nginx"
} 