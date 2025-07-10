data "terraform_remote_state" "vpc" {
  backend = "s3"
  config = {
    bucket = "fiap-hack-terraform-state"
    key    = "vpc/terraform.tfstate"
    region = "us-east-1"
  }
}

data "terraform_remote_state" "eks" {
  backend = "s3"
  config = {
    bucket = "fiap-hack-terraform-state"
    key    = "eks/terraform.tfstate"
    region = "us-east-1"
  }
}

data "terraform_remote_state" "database" {
  backend = "s3"
  config = {
    bucket = "fiap-hack-terraform-state"
    key    = "database/terraform.tfstate"
    region = "us-east-1"
  }
}

data "terraform_remote_state" "rabbitmq" {
  backend = "s3"
  config = {
    bucket = "fiap-hack-terraform-state"
    key    = "rabbitmq/terraform.tfstate"
    region = "us-east-1"
  }
}

data "terraform_remote_state" "redis" {
  backend = "s3"
  config = {
    bucket = "fiap-hack-terraform-state"
    key    = "redis/terraform.tfstate"
    region = "us-east-1"
  }
}

locals {
  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Component   = "service"
  }
}

# Namespace
resource "kubernetes_namespace" "app" {
  metadata {
    name = var.app_namespace
    labels = local.tags
  }
}

# ConfigMap
resource "kubernetes_config_map" "app" {
  metadata {
    name      = "${var.app_name}-config"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  data = {
    NODE_ENV              = "production"
    PORT                  = "8080"
    MAX_FILE_SIZE         = "100MB"
    SUPPORTED_FORMATS     = "mp4,avi,mov,wmv,flv,webm"
    PROCESSING_TIMEOUT    = "300000"
    UPLOAD_PATH           = "/tmp/uploads"
    OUTPUT_PATH           = "/tmp/outputs"
    LOG_LEVEL             = "info"
    LOG_FORMAT            = "json"
    HEALTH_CHECK_INTERVAL = "30"
    HEALTH_CHECK_TIMEOUT  = "5"
  }
}

# Secret
resource "kubernetes_secret" "app" {
  metadata {
    name      = "${var.app_name}-secret"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  type = "Opaque"

  data = {
    DB_HOST                = data.terraform_remote_state.database.outputs.db_endpoint
    DB_PORT                = "5432"
    DB_NAME                = data.terraform_remote_state.database.outputs.db_name
    DB_USERNAME            = data.terraform_remote_state.database.outputs.db_username
    DB_PASSWORD            = var.db_password
    RABBITMQ_HOST          = data.terraform_remote_state.rabbitmq.outputs.rabbitmq_service_name
    RABBITMQ_PORT          = tostring(data.terraform_remote_state.rabbitmq.outputs.rabbitmq_amqp_port)
    RABBITMQ_USERNAME      = data.terraform_remote_state.rabbitmq.outputs.rabbitmq_username
    RABBITMQ_PASSWORD      = data.terraform_remote_state.rabbitmq.outputs.rabbitmq_password
    RABBITMQ_URL           = "amqp://${data.terraform_remote_state.rabbitmq.outputs.rabbitmq_username}:${data.terraform_remote_state.rabbitmq.outputs.rabbitmq_password}@${data.terraform_remote_state.rabbitmq.outputs.rabbitmq_service_name}:${data.terraform_remote_state.rabbitmq.outputs.rabbitmq_amqp_port}/"
    AWS_REGION             = var.aws_region
    AWS_ACCESS_KEY_ID      = var.aws_access_key_id
    AWS_SECRET_ACCESS_KEY  = var.aws_secret_access_key
    AWS_COGNITO_USER_POOL_ID = var.aws_cognito_user_pool_id
    AWS_COGNITO_CLIENT_ID    = var.aws_cognito_client_id
    REDIS_HOST             = data.terraform_remote_state.redis.outputs.redis_host
    REDIS_PORT             = tostring(data.terraform_remote_state.redis.outputs.redis_port)
    REDIS_PASSWORD         = data.terraform_remote_state.redis.outputs.redis_password
    REDIS_URL              = data.terraform_remote_state.redis.outputs.redis_connection_string
  }
}

# Deployment
resource "kubernetes_deployment" "app" {
  metadata {
    name      = var.app_name
    namespace = kubernetes_namespace.app.metadata[0].name
    labels = {
      app         = var.app_name
      environment = var.environment
    }
  }

  spec {
    replicas = var.app_replicas

    strategy {
      type = "RollingUpdate"
      rolling_update {
        max_surge       = 1
        max_unavailable = 0
      }
    }

    selector {
      match_labels = {
        app = var.app_name
      }
    }

    template {
      metadata {
        labels = {
          app         = var.app_name
          environment = var.environment
        }
      }

      spec {
        container {
          name  = var.app_name
          image = var.app_image

          port {
            container_port = 8080
            name          = "http"
          }

          env {
            name = "NODE_ENV"
            value_from {
              config_map_key_ref {
                name = kubernetes_config_map.app.metadata[0].name
                key  = "NODE_ENV"
              }
            }
          }

          env {
            name = "PORT"
            value_from {
              config_map_key_ref {
                name = kubernetes_config_map.app.metadata[0].name
                key  = "PORT"
              }
            }
          }

          env {
            name = "MAX_FILE_SIZE"
            value_from {
              config_map_key_ref {
                name = kubernetes_config_map.app.metadata[0].name
                key  = "MAX_FILE_SIZE"
              }
            }
          }

          env {
            name = "SUPPORTED_FORMATS"
            value_from {
              config_map_key_ref {
                name = kubernetes_config_map.app.metadata[0].name
                key  = "SUPPORTED_FORMATS"
              }
            }
          }

          env {
            name = "PROCESSING_TIMEOUT"
            value_from {
              config_map_key_ref {
                name = kubernetes_config_map.app.metadata[0].name
                key  = "PROCESSING_TIMEOUT"
              }
            }
          }

          env {
            name = "UPLOAD_PATH"
            value_from {
              config_map_key_ref {
                name = kubernetes_config_map.app.metadata[0].name
                key  = "UPLOAD_PATH"
              }
            }
          }

          env {
            name = "OUTPUT_PATH"
            value_from {
              config_map_key_ref {
                name = kubernetes_config_map.app.metadata[0].name
                key  = "OUTPUT_PATH"
              }
            }
          }

          env {
            name = "LOG_LEVEL"
            value_from {
              config_map_key_ref {
                name = kubernetes_config_map.app.metadata[0].name
                key  = "LOG_LEVEL"
              }
            }
          }

          env {
            name = "LOG_FORMAT"
            value_from {
              config_map_key_ref {
                name = kubernetes_config_map.app.metadata[0].name
                key  = "LOG_FORMAT"
              }
            }
          }

          env {
            name = "HEALTH_CHECK_INTERVAL"
            value_from {
              config_map_key_ref {
                name = kubernetes_config_map.app.metadata[0].name
                key  = "HEALTH_CHECK_INTERVAL"
              }
            }
          }

          env {
            name = "HEALTH_CHECK_TIMEOUT"
            value_from {
              config_map_key_ref {
                name = kubernetes_config_map.app.metadata[0].name
                key  = "HEALTH_CHECK_TIMEOUT"
              }
            }
          }

          # Secrets
          env {
            name = "DB_HOST"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "DB_HOST"
              }
            }
          }

          env {
            name = "DB_PORT"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "DB_PORT"
              }
            }
          }

          env {
            name = "DB_NAME"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "DB_NAME"
              }
            }
          }

          env {
            name = "DB_USERNAME"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "DB_USERNAME"
              }
            }
          }

          env {
            name = "DB_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "DB_PASSWORD"
              }
            }
          }

          env {
            name = "RABBITMQ_HOST"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "RABBITMQ_HOST"
              }
            }
          }

          env {
            name = "RABBITMQ_PORT"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "RABBITMQ_PORT"
              }
            }
          }

          env {
            name = "RABBITMQ_USERNAME"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "RABBITMQ_USERNAME"
              }
            }
          }

          env {
            name = "RABBITMQ_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "RABBITMQ_PASSWORD"
              }
            }
          }

          env {
            name = "RABBITMQ_URL"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "RABBITMQ_URL"
              }
            }
          }

          env {
            name = "AWS_REGION"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "AWS_REGION"
              }
            }
          }

          env {
            name = "AWS_ACCESS_KEY_ID"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "AWS_ACCESS_KEY_ID"
              }
            }
          }

          env {
            name = "AWS_SECRET_ACCESS_KEY"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "AWS_SECRET_ACCESS_KEY"
              }
            }
          }

          env {
            name = "AWS_COGNITO_USER_POOL_ID"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "AWS_COGNITO_USER_POOL_ID"
              }
            }
          }

          env {
            name = "AWS_COGNITO_CLIENT_ID"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "AWS_COGNITO_CLIENT_ID"
              }
            }
          }

          env {
            name = "REDIS_HOST"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "REDIS_HOST"
              }
            }
          }

          env {
            name = "REDIS_PORT"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "REDIS_PORT"
              }
            }
          }

          env {
            name = "REDIS_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "REDIS_PASSWORD"
              }
            }
          }

          env {
            name = "REDIS_URL"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "REDIS_URL"
              }
            }
          }

          resources {
            requests = {
              cpu    = var.cpu_request
              memory = var.memory_request
            }
            limits = {
              cpu    = var.cpu_limit
              memory = var.memory_limit
            }
          }

          liveness_probe {
            http_get {
              path = "/health"
              port = 8080
            }
            initial_delay_seconds = 30
            period_seconds        = 30
            timeout_seconds       = 5
            failure_threshold     = 3
          }

          readiness_probe {
            http_get {
              path = "/health"
              port = 8080
            }
            initial_delay_seconds = 10
            period_seconds        = 10
            timeout_seconds       = 3
            failure_threshold     = 3
          }

          volume_mount {
            name       = "uploads-volume"
            mount_path = "/tmp/uploads"
          }

          volume_mount {
            name       = "outputs-volume"
            mount_path = "/tmp/outputs"
          }
        }

        volume {
          name = "uploads-volume"
          empty_dir {}
        }

        volume {
          name = "outputs-volume"
          empty_dir {}
        }

        image_pull_secrets {
          name = "ecr-secret"
        }
      }
    }
  }
}

# Service
resource "kubernetes_service" "app" {
  metadata {
    name      = "${var.app_name}-service"
    namespace = kubernetes_namespace.app.metadata[0].name
    labels = {
      app         = var.app_name
      environment = var.environment
    }
  }

  spec {
    type = "LoadBalancer"

    port {
      port        = 80
      target_port = 8080
      protocol    = "TCP"
      name        = "http"
    }

    selector = {
      app = var.app_name
    }
  }
}

# Ingress
resource "kubernetes_ingress_v1" "app" {
  metadata {
    name      = "${var.app_name}-ingress"
    namespace = kubernetes_namespace.app.metadata[0].name
    labels = {
      app         = var.app_name
      environment = var.environment
    }
    annotations = {
      "kubernetes.io/ingress.class"                    = var.ingress_class
      "nginx.ingress.kubernetes.io/rewrite-target"     = "/"
      "nginx.ingress.kubernetes.io/ssl-redirect"       = "false"
      "nginx.ingress.kubernetes.io/proxy-body-size"    = "100m"
      "nginx.ingress.kubernetes.io/proxy-read-timeout" = "300"
      "nginx.ingress.kubernetes.io/proxy-send-timeout" = "300"
    }
  }

  spec {
    rule {
      host = var.ingress_host
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = kubernetes_service.app.metadata[0].name
              port {
                number = 80
              }
            }
          }
        }
      }
    }
  }
}

# Horizontal Pod Autoscaler
resource "kubernetes_horizontal_pod_autoscaler_v2" "app" {
  metadata {
    name      = "${var.app_name}-hpa"
    namespace = kubernetes_namespace.app.metadata[0].name
    labels = {
      app         = var.app_name
      environment = var.environment
    }
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.app.metadata[0].name
    }

    min_replicas = var.hpa_min_replicas
    max_replicas = var.hpa_max_replicas

    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type               = "Utilization"
          average_utilization = var.hpa_cpu_target
        }
      }
    }

    metric {
      type = "Resource"
      resource {
        name = "memory"
        target {
          type               = "Utilization"
          average_utilization = var.hpa_memory_target
        }
      }
    }

    behavior {
      scale_up {
        stabilization_window_seconds = 60
        select_policy = "Max"
        policy {
          type = "Percent"
          value = 100
          period_seconds = 15
        }
      }
      scale_down {
        stabilization_window_seconds = 300
        select_policy = "Min"
        policy {
          type = "Percent"
          value = 10
          period_seconds = 60
        }
      }
    }
  }
} 