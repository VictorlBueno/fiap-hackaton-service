# Configurações do banco de dados
db_host = "fiap-hack-postgres.cpyshgty15ju.us-east-1.rds.amazonaws.com"
db_port = "5432"
db_name = "fiaphack"
db_username = "postgres"
db_password = "X5rBFVNaKYbWBcSK"

# Configurações AWS
aws_region = "us-east-1"
aws_access_key_id = "AKIAV7AUAEOEUUYDYKHB"
aws_secret_access_key = "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"

# Configurações Cognito (se necessário)
aws_cognito_user_pool_id = "us-east-1_PQCMQ5HXn"
aws_cognito_client_id = "73e7g1ntfgo2airobfluae0em4"

# Configurações da aplicação
app_name = "video-processor"
app_namespace = "video-processor"
app_replicas = 2
app_image = "410211328905.dkr.ecr.us-east-1.amazonaws.com/fiap-hack-production:latest"

# Configurações de recursos
cpu_request = "250m"
cpu_limit = "500m"
memory_request = "256Mi"
memory_limit = "512Mi"

# Configurações de auto-scaling
hpa_min_replicas = 2
hpa_max_replicas = 10
hpa_cpu_target = 70
hpa_memory_target = 80

# Configurações de Ingress
ingress_host = "video-processor.local"
ingress_class = "nginx" 