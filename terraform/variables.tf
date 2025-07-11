variable "aws_region" {
  description = "Região AWS onde os recursos serão criados"
  type        = string
  default     = "us-east-1"
}

variable "aws_account_id" {
  description = "ID da conta AWS"
  type        = string
  default     = "410211328905"
}

variable "project_name" {
  description = "Nome do projeto"
  type        = string
  default     = "fiap-hack"
}

variable "environment" {
  description = "Ambiente (dev, staging, production)"
  type        = string
  default     = "production"
}

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

variable "app_image" {
  description = "Imagem Docker da aplicação"
  type        = string
  default     = "fiap-hack/video-processor:latest"
}

variable "app_replicas" {
  description = "Número de réplicas da aplicação"
  type        = number
  default     = 2
}

variable "aws_cognito_user_pool_id" {
  description = "AWS Cognito User Pool ID"
  type        = string
}

variable "aws_cognito_client_id" {
  description = "AWS Cognito Client ID"
  type        = string
} 