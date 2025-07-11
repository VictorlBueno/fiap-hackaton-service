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
    # Database
    DB_HOST                = replace(data.terraform_remote_state.database.outputs.db_endpoint, ":5432", "")
    DB_PORT                = "5432"
    DB_NAME                = data.terraform_remote_state.database.outputs.db_name
    DB_USERNAME            = data.terraform_remote_state.database.outputs.db_username
    DB_PASSWORD            = data.terraform_remote_state.database.outputs.db_password
    
    # RabbitMQ
    RABBITMQ_HOST          = data.terraform_remote_state.rabbitmq.outputs.rabbitmq_service_name
    RABBITMQ_PORT          = tostring(data.terraform_remote_state.rabbitmq.outputs.rabbitmq_amqp_port)
    RABBITMQ_USERNAME      = data.terraform_remote_state.rabbitmq.outputs.rabbitmq_username
    RABBITMQ_PASSWORD      = data.terraform_remote_state.rabbitmq.outputs.rabbitmq_password
    RABBITMQ_URL           = "amqp://${data.terraform_remote_state.rabbitmq.outputs.rabbitmq_username}:${data.terraform_remote_state.rabbitmq.outputs.rabbitmq_password}@${data.terraform_remote_state.rabbitmq.outputs.rabbitmq_service_name}:${data.terraform_remote_state.rabbitmq.outputs.rabbitmq_amqp_port}/"
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
    GMAIL_USER             = "your-email@gmail.com"
    GMAIL_APP_PASSWORD     = "your-gmail-app-password"
  }
} 