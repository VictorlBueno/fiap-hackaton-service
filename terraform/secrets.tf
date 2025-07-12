# Data source para buscar credenciais do RabbitMQ
data "aws_secretsmanager_secret_version" "rabbitmq_credentials" {
  secret_id = data.terraform_remote_state.rabbitmq.outputs.rabbitmq_secret_arn
}

locals {
  rabbitmq_credentials = jsondecode(data.aws_secretsmanager_secret_version.rabbitmq_credentials.secret_string)
}

# Secret para credenciais ECR
resource "kubernetes_secret" "ecr_secret" {
  metadata {
    name      = "ecr-secret"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  type = "kubernetes.io/dockerconfigjson"

  data = {
    ".dockerconfigjson" = jsonencode({
      auths = {
        "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com" = {
          username = "AWS"
          password = data.aws_ecr_authorization_token.app.password
          auth     = base64encode("AWS:${data.aws_ecr_authorization_token.app.password}")
        }
      }
    })
  }
}

# Secret principal da aplicação
resource "kubernetes_secret" "app" {
  metadata {
    name      = "${var.app_name}-secret"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  type = "Opaque"

  data = {
    AUTH_SERVICE_URL       = "https://mlpr641j1i.execute-api.us-east-1.amazonaws.com/v1/api"

    # Database
    DB_HOST                = replace(data.terraform_remote_state.database.outputs.db_endpoint, ":5432", "")
    DB_PORT                = "5432"
    DB_NAME                = data.terraform_remote_state.database.outputs.db_name
    DB_USERNAME            = data.terraform_remote_state.database.outputs.db_username
    DB_PASSWORD            = data.terraform_remote_state.database.outputs.db_password
    
    # RabbitMQ
    RABBITMQ_HOST          = data.terraform_remote_state.rabbitmq.outputs.rabbitmq_private_ip
    RABBITMQ_PORT          = "5672"
    RABBITMQ_USERNAME      = local.rabbitmq_credentials.username
    RABBITMQ_PASSWORD      = local.rabbitmq_credentials.password
    RABBITMQ_URL           = data.terraform_remote_state.rabbitmq.outputs.rabbitmq_amqp_url
    RABBITMQ_VHOST         = "/"
    
    # AWS
    AWS_REGION             = var.aws_region
    AWS_COGNITO_USER_POOL_ID = var.aws_cognito_user_pool_id
    AWS_COGNITO_CLIENT_ID    = var.aws_cognito_client_id
    
    # Redis
    REDIS_HOST             = data.terraform_remote_state.redis.outputs.redis_host
    REDIS_PORT             = tostring(data.terraform_remote_state.redis.outputs.redis_port)
    REDIS_PASSWORD         = data.terraform_remote_state.redis.outputs.redis_password
    REDIS_URL              = data.terraform_remote_state.redis.outputs.redis_connection_string
    
    # Gmail (para notificações)
    GMAIL_USER             = "vihbuenoz@gmail.com"
    GMAIL_APP_PASSWORD     = "jeqs gjqu urkd udmi"
  }
} 