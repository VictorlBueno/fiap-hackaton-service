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

# ECR Repository
resource "aws_ecr_repository" "app" {
  name                 = "${var.project_name}-${var.environment}"
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
  
  tags = local.tags
}

# S3 Bucket para uploads
resource "aws_s3_bucket" "app" {
  bucket = "fiap-hackaton-files-1"
  
  tags = local.tags
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "app" {
  bucket = aws_s3_bucket.app.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "app" {
  bucket = aws_s3_bucket.app.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Lifecycle Policy
resource "aws_s3_bucket_lifecycle_configuration" "app" {
  bucket = aws_s3_bucket.app.id
  
  rule {
    id     = "cleanup-old-files"
    status = "Enabled"
    
    filter {
      prefix = ""
    }
    
    expiration {
      days = 30
    }
    
    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }
}

# S3 Objects para criar pastas
resource "aws_s3_object" "uploads_folder" {
  bucket = aws_s3_bucket.app.id
  key    = "uploads/"
  source = "/dev/null"
  
  tags = local.tags
}

resource "aws_s3_object" "outputs_folder" {
  bucket = aws_s3_bucket.app.id
  key    = "outputs/"
  source = "/dev/null"
  
  tags = local.tags
}

# ECR Lifecycle Policy
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name
  
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 5 images"
        selection = {
          tagStatus     = "untagged"
          countType     = "imageCountMoreThan"
          countNumber   = 5
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}



# ECR Authorization Token
data "aws_ecr_authorization_token" "app" {
  registry_id = var.aws_account_id
}

# IAM Role para o Service Account
resource "aws_iam_role" "service_account" {
  name = "${var.project_name}-${var.environment}-service-account-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = data.terraform_remote_state.eks.outputs.cluster_oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "${replace(data.terraform_remote_state.eks.outputs.cluster_oidc_issuer_url, "https://", "")}:sub" = "system:serviceaccount:${var.app_namespace}:${var.app_name}-service-account"
          }
        }
      }
    ]
  })
  
  tags = local.tags
}

# IAM Policy para S3
resource "aws_iam_role_policy" "s3_access" {
  name = "${var.project_name}-${var.environment}-s3-access-policy"
  role = aws_iam_role.service_account.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.app.arn,
          "${aws_s3_bucket.app.arn}/*"
        ]
      }
    ]
  })
}

# IAM Policy para ECR
resource "aws_iam_role_policy" "ecr_access" {
  name = "${var.project_name}-${var.environment}-ecr-access-policy"
  role = aws_iam_role.service_account.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      }
    ]
  })
}

# Service Account
resource "kubernetes_service_account" "app" {
  metadata {
    name      = "${var.app_name}-service-account"
    namespace = kubernetes_namespace.app.metadata[0].name
    annotations = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.service_account.arn
    }
  }
}

# Namespace
resource "kubernetes_namespace" "app" {
  metadata {
    name = var.app_namespace
    labels = local.tags
  }
}

# ConfigMap para inicialização do banco
resource "kubernetes_config_map" "db_init" {
  metadata {
    name      = "db-init-sql"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  data = {
    "init.sql" = file("${path.module}/../scripts/init.sql")
  }
}

# Job de inicialização do banco
resource "kubernetes_job" "db_init" {
  metadata {
    name      = "db-init-job"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    template {
      metadata {
        name = "db-init-pod"
      }
      spec {
        container {
          name  = "db-init"
          image = "postgres:13"
          
          env {
            name  = "PGPASSWORD"
            value = data.terraform_remote_state.database.outputs.db_password
          }
          
          command = ["psql"]
          args = [
            "-h", replace(data.terraform_remote_state.database.outputs.db_endpoint, ":5432", ""),
            "-U", data.terraform_remote_state.database.outputs.db_username,
            "-d", data.terraform_remote_state.database.outputs.db_name,
            "-f", "/init.sql"
          ]
          
          volume_mount {
            name       = "init-sql"
            mount_path = "/init.sql"
            sub_path   = "init.sql"
          }
        }
        
        restart_policy = "OnFailure"
        
        volume {
          name = "init-sql"
          config_map {
            name = kubernetes_config_map.db_init.metadata[0].name
          }
        }
      }
    }
  }
  
  depends_on = [kubernetes_namespace.app]
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
    S3_BUCKET_NAME        = aws_s3_bucket.app.bucket
    S3_REGION             = var.aws_region
    AUTH_SERVICE_URL      = "https://mlpr641j1i.execute-api.us-east-1.amazonaws.com/v1/api"
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
  
  depends_on = [kubernetes_job.db_init, kubernetes_service_account.app]

  spec {
    replicas = 2

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
          image = "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}-${var.environment}:latest"

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

          env {
            name = "S3_BUCKET_NAME"
            value_from {
              config_map_key_ref {
                name = kubernetes_config_map.app.metadata[0].name
                key  = "S3_BUCKET_NAME"
              }
            }
          }

          env {
            name = "S3_REGION"
            value_from {
              config_map_key_ref {
                name = kubernetes_config_map.app.metadata[0].name
                key  = "S3_REGION"
              }
            }
          }

          env {
            name = "AUTH_SERVICE_URL"
            value_from {
              config_map_key_ref {
                name = kubernetes_config_map.app.metadata[0].name
                key  = "AUTH_SERVICE_URL"
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

          env {
            name = "RABBITMQ_VHOST"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "RABBITMQ_VHOST"
              }
            }
          }

          env {
            name = "GMAIL_USER"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "GMAIL_USER"
              }
            }
          }

          env {
            name = "GMAIL_APP_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "GMAIL_APP_PASSWORD"
              }
            }
          }

          resources {
            requests = {
              cpu    = "250m"
              memory = "256Mi"
            }
            limits = {
              cpu    = "500m"
              memory = "512Mi"
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
        
        service_account_name = kubernetes_service_account.app.metadata[0].name
      }
    }
  }
}

# Service
resource "kubernetes_service" "app" {
  metadata {
    name      = "${var.app_name}-service"
    namespace = kubernetes_namespace.app.metadata[0].name
    labels = local.tags
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

# Horizontal Pod Autoscaler
resource "kubernetes_horizontal_pod_autoscaler_v2" "app" {
  metadata {
    name      = "${var.app_name}-hpa"
    namespace = kubernetes_namespace.app.metadata[0].name
    labels = local.tags
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.app.metadata[0].name
    }

    min_replicas = 1
    max_replicas = 5

    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 70
        }
      }
    }

    metric {
      type = "Resource"
      resource {
        name = "memory"
        target {
          type                = "Utilization"
          average_utilization = 80
        }
      }
    }
  }
}

# Outputs
output "app_namespace" {
  description = "Namespace da aplicação"
  value       = kubernetes_namespace.app.metadata[0].name
}

output "app_service_name" {
  description = "Nome do service da aplicação"
  value       = kubernetes_service.app.metadata[0].name
}

output "app_load_balancer_hostname" {
  description = "Hostname do Load Balancer"
  value       = kubernetes_service.app.status[0].load_balancer[0].ingress[0].hostname
} 